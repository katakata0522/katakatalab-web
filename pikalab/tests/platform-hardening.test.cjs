const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const vm = require('node:vm');

const pikalabRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(pikalabRoot, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(pikalabRoot, relativePath), 'utf8');
}

async function runActivateHandler(relativePath, cacheNames) {
    const listeners = new Map();
    const deleted = [];
    const context = {
        self: {
            registration: { scope: 'https://katakatalab.com/pikalab/' + path.posix.dirname(relativePath) + '/' },
            addEventListener(type, listener) {
                listeners.set(type, listener);
            },
            clients: {
                claim: async () => undefined
            }
        },
        caches: {
            keys: async () => cacheNames,
            delete: async (name) => {
                deleted.push(name);
                return true;
            }
        },
        URL,
        location: { origin: 'https://katakatalab.com' },
        console
    };

    vm.createContext(context);
    context.importScripts = () => vm.runInContext(read('public/pwa-runtime.js'), context);
    vm.runInContext(read(relativePath), context, { filename: relativePath });
    const activate = listeners.get('activate');
    assert.equal(typeof activate, 'function');

    let activation;
    activate({ waitUntil(promise) { activation = promise; } });
    await activation;
    return deleted;
}

async function runFetchHandler(relativePath) {
    const listeners = new Map();
    const cachedResponse = { source: 'cache' };
    const networkResponse = {
        source: 'network',
        status: 200,
        type: 'basic',
        clone() { return { source: 'network-copy' }; }
    };
    let fetchCount = 0;
    const cachedWrites = [];
    const context = {
        self: {
            registration: { scope: 'https://katakatalab.com/pikalab/' + path.posix.dirname(relativePath) + '/' },
            location: { origin: 'https://katakatalab.com' },
            addEventListener(type, listener) { listeners.set(type, listener); },
            skipWaiting: async () => undefined,
            clients: { claim: async () => undefined }
        },
        caches: {
            match: async () => cachedResponse,
            open: async () => ({
                match: async () => cachedResponse,
                addAll: async () => undefined,
                put: async (_request, response) => cachedWrites.push(response)
            }),
            keys: async () => [],
            delete: async () => true
        },
        fetch: async () => {
            fetchCount += 1;
            return networkResponse;
        },
        URL,
        console
    };

    vm.createContext(context);
    context.importScripts = () => vm.runInContext(read('public/pwa-runtime.js'), context);
    vm.runInContext(read(relativePath), context, { filename: relativePath });
    const fetchHandler = listeners.get('fetch');
    let responsePromise;
    fetchHandler({
        request: { method: 'GET', url: 'https://katakatalab.com/pikalab/typing_dojo/script.js' },
        waitUntil() {},
        respondWith(promise) { responsePromise = promise; }
    });
    const response = await responsePromise;
    await new Promise((resolve) => setImmediate(resolve));
    return { response, fetchCount, cachedWrites };
}

function sha256(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

test('Focus Studioの更新は自分の旧キャッシュだけを削除する', async () => {
    const deleted = await runActivateHandler('focus_studio/sw.js', [
        'focus-studio-v4',
        'focus-studio-v5',
        'typing-dojo-v1',
        'workbox-precache-v2'
    ]);
    assert.deepEqual(deleted, ['focus-studio-v4']);
});

test('タイピング道場の更新は自分の旧キャッシュだけを削除する', async () => {
    const deleted = await runActivateHandler('typing_dojo/sw.js', [
        'typing-dojo-v0',
        'typing-dojo-v1',
        'typing-dojo-v2',
        'focus-studio-v5',
        'images-cache'
    ]);
    assert.deepEqual(deleted, ['typing-dojo-v0', 'typing-dojo-v1', 'typing-dojo-v2']);
});

test('タイピング道場は同じ配信版の保存済み実行資産を即座に返す', async () => {
    const result = await runFetchHandler('typing_dojo/sw.js');
    assert.equal(result.fetchCount, 0);
    assert.equal(result.response.source, 'cache');
    assert.equal(result.cachedWrites.length, 0);
});

test('Space Labは過去の専用Service Workerだけを明示的に解除する', () => {
    const script = read('space_lab/script.js');
    assert.match(script, /cleanupLegacySpaceLabServiceWorker/);
    assert.match(script, /registration\.scope === legacyScope/);
    assert.match(script, /registration\.unregister\(\)/);
    assert.match(script, /caches\.delete\('spacelab-cache-v4'\)/);
});

test('PWAプリキャッシュへ大型画像と音声を含めない', () => {
    const config = read('vite.config.js');
    const globLine = config.split(/\r?\n/).find((line) => line.includes('globPatterns')) || '';
    assert.doesNotMatch(globLine, /png|jpe?g|webp|mp3|wav/);
    assert.match(globLine, /js/);
    assert.match(globLine, /css/);
    assert.match(globLine, /html/);
});

test('package.jsonとCIが全テストを統一コマンドで実行する', () => {
    const packageJson = JSON.parse(read('package.json'));
    assert.equal(typeof packageJson.scripts.test, 'string');
    assert.match(packageJson.scripts.test, /test:node/);
    assert.match(packageJson.scripts.test, /test:vitest/);
    assert.equal(packageJson.scripts['test:node'], 'node scripts/run-node-tests.cjs');
    assert.equal(packageJson.scripts.typecheck, 'tsc --noEmit');

    const workflow = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'pikalab-quality.yml'), 'utf8');
    assert.match(workflow, /npm test/);
    assert.match(workflow, /npm run typecheck/);
    assert.match(workflow, /npm ls/);
    assert.match(workflow, /npm run verify:build/);
});

test('通常ビルドは確認済みの見た目を勝手に再生成しない', () => {
    const packageJson = JSON.parse(read('package.json'));
    assert.equal(packageJson.scripts['build:all'], 'npm run build');
    assert.match(packageJson.scripts.build, /copy-build-runtime-assets\.cjs/);
    assert.match(packageJson.scripts['build:css'], /tailwindcss/);
});

test('PWA登録スクリプトはルートページだけに配置する', () => {
    const config = read('vite.config.js');
    const rootHtml = read('index.html');

    assert.match(config, /injectRegister:\s*false/);
    assert.match(rootHtml, /id="pikalab-register-sw"/);
    assert.match(rootHtml, /navigator\.serviceWorker\.register\('\.\/sw\.js',\s*\{\s*scope:\s*'\.\/',\s*updateViaCache:\s*'none'\s*\}\)/);
});

test('PWAナビゲーションは各ラボのHTMLをトップページへ置換しない', () => {
    const config = read('vite.config.js');

    assert.match(config, /navigateFallback:\s*null/);
    assert.doesNotMatch(config, /navigateFallbackDenylist/);
});

test('PWAマニフェストはルートページだけから有効なファイルを参照する', () => {
    const config = read('vite.config.js');
    const rootHtml = read('index.html');
    const manifestPath = path.join(pikalabRoot, 'public', 'manifest.webmanifest');

    assert.match(config, /manifest:\s*false/);
    assert.match(rootHtml, /rel="manifest"\s+href="\.\/manifest\.webmanifest"/);
    assert.equal(fs.existsSync(manifestPath), true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.name, 'PikaLab (ピカラボ)');
});

test('共有style.cssの検証はファイル容量ではなく必要ユーティリティを見る', () => {
    const validator = fs.readFileSync(path.join(repoRoot, '.github', 'scripts', 'validate_pikalab.py'), 'utf8');
    assert.match(validator, /def check_style_css_content/);
    assert.match(validator, /required_patterns/);
    assert.doesNotMatch(validator, /size\s*<\s*50000|50KB|50,000/);
});

test('構造検証はViteのpublic配下を公開ルートとして解決する', () => {
    const validator = fs.readFileSync(path.join(repoRoot, '.github', 'scripts', 'validate_pikalab.py'), 'utf8');
    assert.match(validator, /def local_reference_exists/);
    assert.match(validator, /PIKALAB_DIR \/ "public"/);
    assert.match(validator, /if not local_reference_exists\(html_file, clean_href\)/);
});

test('表示を変えずに既知のアクセシビリティ契約を満たす', () => {
    const rootHtml = read('index.html');
    const rootScript = read('js/main.js');
    const rhythmHtml = read('rhythm_lab/index.html');
    const rhythmScript = read('rhythm_lab/script.js');
    const focusHtml = read('focus_studio/index.html');
    const focusScript = read('focus_studio/script.js');

    assert.doesNotMatch(rootHtml, /role="tab"/);
    assert.match(rootHtml, /id="btn-low"[^>]+aria-pressed=/);
    assert.match(rootHtml, /id="login-modal"[^>]+tabindex="-1"/);
    assert.match(rootScript, /main\.inert\s*=\s*true/);
    assert.match(rootScript, /trapLoginModalFocus/);

    assert.doesNotMatch(rhythmHtml, /role="(?:grid|row|rowgroup)"/);
    assert.match(rhythmScript, /document\.createElement\('button'\)/);
    assert.match(rhythmScript, /button\.type\s*=\s*'button'/);

    assert.match(focusHtml, /id="sound-drawer"[^>]+inert/);
    assert.match(focusScript, /drawer\.inert\s*=\s*!isOpen/);
});

test('Focus Studioのfaviconは存在する共通画像を参照する', () => {
    const html = read('focus_studio/index.html');
    assert.match(html, /rel="icon"[^>]+href="favicon\.png"/);
    assert.match(html, /rel="apple-touch-icon"[^>]+href="favicon\.png"/);
    assert.equal(fs.existsSync(path.join(pikalabRoot, 'focus_studio', 'favicon.png')), true);
});

test('デプロイはCode Studioの到達可能な資産だけを公開する', () => {
    const packageJson = JSON.parse(read('package.json'));
    assert.match(packageJson.scripts.build, /copy-code-studio-reachable\.cjs/);
});

test('表示ライブラリは同一サイト内から読み込み、Tone.jsは操作時まで遅延する', () => {
    const packageJson = JSON.parse(read('package.json'));
    const kanjiHtml = read('kanji_lab/index.html');
    const manabiHtml = read('manabi_land/index.html');
    const rhythmHtml = read('rhythm_lab/index.html');
    const focusHtml = read('focus_studio/index.html');

    assert.equal(kanjiHtml.includes('https://cdn.tailwindcss.com'), false);
    assert.match(kanjiHtml, /\.\/tailwind\.css/);
    assert.equal(fs.existsSync(path.join(pikalabRoot, 'kanji_lab', 'tailwind.css')), true);
    assert.match(packageJson.scripts['build:css:kanji'], /tailwind\.kanji\.config\.cjs/);
    assert.doesNotMatch(kanjiHtml, /tailwind-play/);
    assert.equal(fs.existsSync(path.join(pikalabRoot, 'assets', 'tailwind-play-3.4.17.js')), false);

    [manabiHtml, rhythmHtml, focusHtml].forEach((html) => {
        assert.match(html, /\.\.\/js\/tone-loader\.js/);
        assert.doesNotMatch(html, /<script[^>]+src=["'][^"']*tone-14\.8\.49\.js/);
    });

    const sharedTone = path.join(pikalabRoot, 'assets', 'tone-14.8.49.js');
    const currentTone = path.join(pikalabRoot, 'focus_studio', 'assets', 'tone-14.8.49.js');
    assert.equal(fs.existsSync(sharedTone), true);
    assert.equal(sha256(sharedTone), sha256(currentTone));
});

test('Quest BoardのCSP運用と保守手順は同じ方式を案内する', () => {
    const html = read('quest_board/index.html');
    const maintenance = read('quest_board/MAINTENANCE.md');
    const legacySync = fs.readFileSync(
        path.join(repoRoot, '.github', 'scripts', 'sync_quest_board_csp.py'),
        'utf8'
    );
    const csp = html.match(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/i)?.[0] || '';

    if (/'unsafe-inline'/.test(csp)) {
        assert.doesNotMatch(maintenance, /sync_quest_board_csp\.py --(?:check|write)/);
        assert.match(maintenance, /CSPハッシュの更新は不要/);
        assert.match(legacySync, /KATAKATALAB_RUN_LEGACY_QUEST_CSP_SYNC/);
    }
});

test('PikaLabのページ単位CSPは文字列コード実行を許可しない', () => {
    const protectedPages = [
        'index.html',
        'book_report/index.html',
        'color_lab/index.html',
        'focus_studio/index.html',
        'fraction_lab/index.html',
        'manabi_land/index.html',
        'paper_gen/index.html',
        'quest_board/index.html',
        'rhythm_lab/index.html',
        'science_maker/index.html'
    ];

    protectedPages.forEach((relativePath) => {
        const html = read(relativePath);
        const csp = html.match(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/i)?.[0] || '';
        assert.notEqual(csp, '', `${relativePath} にCSPが必要です`);
        assert.doesNotMatch(csp, /'unsafe-eval'/, `${relativePath} でunsafe-evalを許可しない`);
    });
});

test('音声ページのCSPは必要な画像・通信・Workerだけを妨げない', () => {
    const rhythmHtml = read('rhythm_lab/index.html');
    const focusHtml = read('focus_studio/index.html');
    const manabiHtml = read('manabi_land/index.html');

    assert.match(rhythmHtml, /img-src 'self' data: https:/);
    assert.match(focusHtml, /connect-src 'self' https:/);
    assert.match(manabiHtml, /worker-src 'self' blob:/);
    assert.match(manabiHtml, /connect-src 'self' https:/);
});

test('まなびランドは初期表示では効果音を鳴らさない', () => {
    const script = read('manabi_land/script.js');
    assert.match(script, /this\.switchTab\('tab-money',\s*false\)/);
    assert.match(script, /switchTab\(id,\s*shouldPlaySound\s*=\s*true\)/);
});

test('Science Makerは巨大OGP画像をfaviconとして読み込まない', () => {
    const html = read('science_maker/index.html');
    const manifest = read('science_maker/manifest.json');
    assert.equal(html.includes('../pikalab_ogp.png'), false);
    assert.equal(manifest.includes('../pikalab_ogp.png'), false);
});

test('Deepsea Labの同一画像を二重管理しない', () => {
    const duplicateDir = path.join(pikalabRoot, 'deepsea_lab', 'public', 'images');
    assert.equal(fs.existsSync(duplicateDir), false);
});

test('Deepsea Labの公開画像はすべて実装から参照され、同一内容を重複配置しない', () => {
    const sourceRoot = path.join(pikalabRoot, 'deepsea_lab');
    const imageRoot = path.join(pikalabRoot, 'public', 'deepsea_lab', 'images');
    const sourceExtensions = new Set(['.html', '.css', '.js', '.ts', '.json']);
    const sourceFiles = [];
    const collectSourceFiles = (directory) => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) collectSourceFiles(fullPath);
            else if (sourceExtensions.has(path.extname(entry.name))) sourceFiles.push(fullPath);
        }
    };
    collectSourceFiles(sourceRoot);

    const source = sourceFiles.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');
    const referencedImages = new Set(
        [...source.matchAll(/images\/([^"'`\s)]+\.(?:png|jpe?g|webp))/gi)].map((match) => match[1])
    );
    const imageNames = fs.readdirSync(imageRoot).filter((name) => /\.(?:png|jpe?g|webp)$/i.test(name));
    const missing = [...referencedImages].filter((name) => !imageNames.includes(name));
    const unreferenced = imageNames.filter((name) => !referencedImages.has(name));
    assert.deepEqual(missing, [], `参照切れ画像: ${missing.join(', ')}`);
    assert.deepEqual(unreferenced, [], `未参照画像: ${unreferenced.join(', ')}`);

    const filesByHash = new Map();
    for (const name of imageNames) {
        const hash = sha256(path.join(imageRoot, name));
        const matches = filesByHash.get(hash) || [];
        matches.push(name);
        filesByHash.set(hash, matches);
    }
    const duplicates = [...filesByHash.values()].filter((names) => names.length > 1);
    assert.deepEqual(duplicates, [], `同一内容の画像: ${JSON.stringify(duplicates)}`);
});

test('Space Labの画像は実装から参照され、同一内容を重複配置しない', () => {
    const sourceRoot = path.join(pikalabRoot, 'space_lab');
    const imageRoot = path.join(sourceRoot, 'assets');
    const sourceExtensions = new Set(['.html', '.css', '.js', '.json']);
    const sourceFiles = fs.readdirSync(sourceRoot, { withFileTypes: true })
        .filter((entry) => entry.isFile() && sourceExtensions.has(path.extname(entry.name)))
        .map((entry) => path.join(sourceRoot, entry.name));
    const source = sourceFiles.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');
    const imageNames = fs.readdirSync(imageRoot).filter((name) => /\.(?:png|jpe?g|webp)$/i.test(name));
    const unreferenced = imageNames.filter((name) => !source.includes(`assets/${name}`));

    assert.deepEqual(unreferenced, [], `未参照画像: ${unreferenced.join(', ')}`);

    const filesByHash = new Map();
    for (const name of imageNames) {
        const hash = sha256(path.join(imageRoot, name));
        const matches = filesByHash.get(hash) || [];
        matches.push(name);
        filesByHash.set(hash, matches);
    }
    const duplicates = [...filesByHash.values()].filter((names) => names.length > 1);
    assert.deepEqual(duplicates, [], `同一内容の画像: ${JSON.stringify(duplicates)}`);
});

test('Space Labの惑星画像URLはViteが追跡できる静的資産表から解決する', async () => {
    const resolverModuleUrl = pathToFileURL(path.join(pikalabRoot, 'space_lab', 'planet-image-url.mjs'));
    resolverModuleUrl.searchParams.set('test', Date.now().toString());
    const { resolvePlanetImageUrl } = await import(resolverModuleUrl.href);

    assert.equal(
        resolvePlanetImageUrl('assets/earth.png'),
        pathToFileURL(path.join(pikalabRoot, 'space_lab', 'assets', 'earth.png')).href
    );
});

test('Space Labの未登録画像パスはundefinedの通信を起こす前に拒否する', async () => {
    const resolverModuleUrl = pathToFileURL(path.join(pikalabRoot, 'space_lab', 'planet-image-url.mjs'));
    resolverModuleUrl.searchParams.set('test', Date.now().toString());
    const { resolvePlanetImageUrl } = await import(resolverModuleUrl.href);

    assert.throws(
        () => resolvePlanetImageUrl('assets/undefined'),
        /未登録の惑星画像/
    );
});

test('タイピング道場の分割モジュールは実行入口から到達可能なものだけを置く', () => {
    const moduleRoot = path.join(pikalabRoot, 'typing_dojo', 'js');
    const moduleFiles = fs.existsSync(moduleRoot)
        ? fs.readdirSync(moduleRoot).filter((name) => name.endsWith('.js'))
        : [];
    const entrySource = [read('typing_dojo/index.html'), read('typing_dojo/script.js')].join('\n');
    const unreachable = moduleFiles.filter((name) => {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return !new RegExp(`(?:\\./)?js/${escaped}`).test(entrySource);
    });

    assert.deepEqual(unreachable, [], `未参照モジュール: ${unreachable.join(', ')}`);
});
