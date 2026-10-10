'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const {
    LAB_WORKERS, readInstallAssets, restoreLabPwaAssets, restoreManifestLink, verifyLabPwaAssets,
} = require('./restore-lab-pwa-assets.cjs');

function projectRoot() { return path.resolve(__dirname, '..'); }

function write(root, relative, content) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
    return target;
}

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pikalab-install-assets-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const source = path.join(root, 'source');
    const build = path.join(source, 'dist');
    const project = path.resolve(__dirname, '..');
    write(build, 'sw.js', 'const originalRootAllowlist = ["assets/manifest-original.json"];');
    write(build, 'assets/manifest-original.json', '{}');
    write(build, 'assets/compiled.css', '.existing-appearance { color: hotpink; }');
    write(build, 'other_lab/index.html', '<title>他ラボを変更しない</title>');
    write(source, 'space_lab/sw.js', '旧ワーカーは配信しない');
    write(source, 'space_lab/style.css', '旧install依存も配信しない');

    for (const { directory, workers } of LAB_WORKERS) {
        const manifest = fs.readFileSync(path.join(project, directory, 'manifest.json'));
        write(source, `${directory}/manifest.json`, manifest);
        write(build, `${directory}/index.html`, `<head><link rel="stylesheet" href="../assets/compiled.css"><link rel="manifest" crossorigin="use-credentials" href="../assets/manifest-original.json"></head><body>既存の画面</body>`);
        for (const worker of workers) {
            const workerSource = fs.readFileSync(path.join(project, worker === 'sw-hardened.js' ? 'public' : '', directory, worker), 'utf8');
            write(source, `${worker === 'sw-hardened.js' ? 'public/' : ''}${directory}/${worker}`, workerSource);
            write(build, `${directory}/${worker}`, workerSource);
            for (const reference of readInstallAssets(workerSource, worker)) {
                if (reference === './' || reference === './index.html' || reference === './manifest.json') continue;
                const relative = path.join(directory, reference);
                const sourceRelative = reference === './runtime-hardening.js' ? path.join('public', relative) : relative;
                write(source, sourceRelative, `${relative}: source asset`);
            }
        }
        const icons = JSON.parse(manifest).icons;
        for (const icon of icons) write(source, path.join(directory, icon.src), `${directory}: icon bytes`);
        // 既に生成済みのJSはコピー元と違っていても上書きしない。
        write(build, `${directory}/script.js`, `${directory}: existing compiled script`);
    }
    return { source, build };
}

test('相対manifestを元のラボ位置へ戻し、install資産だけを補完する', (t) => {
    const { source, build } = fixture(t);
    const rootWorker = fs.readFileSync(path.join(build, 'sw.js'));
    fs.unlinkSync(path.join(build, 'focus_studio/sw.js'));
    const result = restoreLabPwaAssets(source, build);
    assert.deepEqual(result.changedHtml, ['focus_studio/index.html', 'space_lab/index.html']);
    assert.ok(result.copied.includes('focus_studio/style.css'));
    assert.ok(result.copied.includes('focus_studio/tailwind.generated.css'));
    assert.ok(result.copied.includes('focus_studio/favicon.png'));
    assert.ok(result.copied.includes('focus_studio/runtime-hardening.js'));
    assert.ok(result.copied.includes('focus_studio/sw.js'));
    assert.ok(result.copied.includes('space_lab/assets/sun.png'));
    assert.equal(fs.existsSync(path.join(build, 'space_lab/sw.js')), false);
    assert.equal(fs.existsSync(path.join(build, 'space_lab/style.css')), false);
    for (const { directory } of LAB_WORKERS) {
        const manifest = fs.readFileSync(path.join(build, directory, 'manifest.json'));
        assert.deepEqual(manifest, fs.readFileSync(path.join(source, directory, 'manifest.json')));
        const html = fs.readFileSync(path.join(build, directory, 'index.html'), 'utf8');
        assert.match(html, /href="\.\/manifest\.json"/);
        assert.match(html, /href="\.\.\/assets\/compiled\.css"/);
        assert.match(html, /crossorigin="use-credentials"/);
        assert.match(html, /既存の画面/);
        assert.equal(fs.readFileSync(path.join(build, directory, 'script.js'), 'utf8'), `${directory}: existing compiled script`);
        // /pikalab/とドメイン直下の両方で、開始URL・アイコン・既定scopeが元のラボを指す。
        for (const mount of ['/', '/pikalab/']) {
            const manifestUrl = new URL(`${mount}${directory}/manifest.json`, 'https://example.test');
            const parsed = JSON.parse(manifest);
            assert.equal(new URL(parsed.start_url, manifestUrl).pathname, `${mount}${directory}/index.html`);
            assert.equal(new URL('./', new URL(parsed.start_url, manifestUrl)).pathname, `${mount}${directory}/`);
            for (const icon of parsed.icons) assert.ok(new URL(icon.src, manifestUrl).pathname.startsWith(`${mount}${directory}/`));
        }
    }
    assert.deepEqual(fs.readFileSync(path.join(build, 'sw.js')), rootWorker);
    assert.equal(fs.readFileSync(path.join(build, 'assets/manifest-original.json'), 'utf8'), '{}');
    assert.equal(fs.readFileSync(path.join(build, 'other_lab/index.html'), 'utf8'), '<title>他ラボを変更しない</title>');
    assert.deepEqual(restoreLabPwaAssets(source, build), { copied: [], changedHtml: [], assets: result.assets });
});

test('Focus旧版・強化版のinstallが配信成果物だけで完了する', async (t) => {
    const { source, build } = fixture(t);
    restoreLabPwaAssets(source, build);
    for (const { directory, workers } of LAB_WORKERS) {
        for (const worker of workers) {
            const handlers = {};
            let installation;
            let fetched = [];

            const scope = new URL(directory + '/', 'https://pikalab.invalid/');
            const context = {
                URL, Set, Request, AbortController,
                self: { registration: { scope: scope.href }, addEventListener: (name, callback) => { handlers[name] = callback; }, skipWaiting: async () => {} },
                caches: { open: async () => ({
                    addAll: async (requests) => {
                        fetched = [...requests];
                        for (const request of requests) {
                            const url = new URL(request.url);
                            let target = path.join(build, decodeURIComponent(url.pathname));
                            if (url.pathname.endsWith('/')) target = path.join(target, 'index.html');
                            assert.ok(fs.statSync(target).isFile(), request.url);
                            assert.equal(request.cache, 'reload');
                        }
                    }
                }) }
            };
            vm.createContext(context);
            context.importScripts = () => vm.runInContext(fs.readFileSync(path.join(projectRoot(), 'public/pwa-runtime.js'), 'utf8'), context);
            vm.runInContext(fs.readFileSync(path.join(build, directory, worker), 'utf8'), context);
            handlers.install({ waitUntil: (promise) => { installation = promise; } });
            await installation;
            assert.ok(fetched.length > 0);
        }
    }
});

test('不足する依存・移動したmanifest・異なる開始URLを検証で拒否する', (t) => {
    const { source, build } = fixture(t);
    assert.throws(() => verifyLabPwaAssets(build), /manifestはラボ直下/);
    restoreLabPwaAssets(source, build);
    fs.unlinkSync(path.join(build, 'focus_studio/tailwind.generated.css'));
    assert.throws(() => verifyLabPwaAssets(build), /PWA資産がありません/);
    restoreLabPwaAssets(source, build);
    const manifestPath = path.join(build, 'space_lab/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.start_url = '../index.html';
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    assert.throws(() => verifyLabPwaAssets(build), /開始URLがラボ入口と一致/);
    restoreLabPwaAssets(source, build);
    assert.doesNotThrow(() => verifyLabPwaAssets(build));
});

test('コピー元不足やinstall資産の配信ルート外参照は失敗させる', (t) => {
    const { source, build } = fixture(t);
    const missing = path.join(source, 'focus_studio/style.css');
    fs.unlinkSync(missing);
    assert.throws(() => restoreLabPwaAssets(source, build), /focus_studio[\\/]style\.css: PWA資産のコピー元がありません/);
    fs.writeFileSync(missing, 'restored style');
    const sw = path.join(build, 'focus_studio/sw.js');
    fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace("'./style.css'", "'../../outside.css'"));
    assert.throws(() => restoreLabPwaAssets(source, build), /配信ルート外/);
    assert.throws(() => restoreLabPwaAssets(source, source), /ソースと分離/);
});

test('Spaceの解除済みService Workerが古い成果物に残っていたら拒否する', (t) => {
    const { source, build } = fixture(t);
    restoreLabPwaAssets(source, build);
    write(build, 'space_lab/sw.js', '古い成果物');
    assert.throws(() => verifyLabPwaAssets(build), /解除済みService Worker/);
});

test('manifest linkの属性順・引用符を扱い、欠損や重複は拒否する', () => {
    assert.equal(restoreManifestLink("<LINK href='../assets/m.json' REL='manifest'>", 'focus_studio'), "<LINK href='./manifest.json' REL='manifest'>");
    assert.throws(() => restoreManifestLink('<link rel="stylesheet" href="a.css">', 'focus_studio'), /1件必要/);
    assert.throws(() => restoreManifestLink('<link rel="manifest" href="a"><link rel="manifest" href="b">', 'focus_studio'), /1件必要/);
    assert.throws(() => readInstallAssets('const ASSETS = [computeUrl()];', 'sw.js'), /sw\.js:/);
});


test('Scienceの開始URLを元の位置へ戻し、共有アイコンも配信する', t => {
    const { source, build } = fixture(t);
    write(source, 'science_maker/index.html', '<link rel="manifest" href="manifest.json">');
    write(source, 'science_maker/manifest.json', JSON.stringify({ start_url: './', scope: './', icons: [{src:'../icon.svg'}] }));
    write(source, 'icon.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
    write(build, 'science_maker/index.html', '<link rel="manifest" href="../assets/manifest-original.json">');
    const result = restoreLabPwaAssets(source, build);
    assert.ok(result.copied.includes('science_maker/manifest.json'));
    assert.ok(result.assets.includes('icon.svg'));
    const manifest = JSON.parse(fs.readFileSync(path.join(build, 'science_maker/manifest.json')));
    const url = new URL('science_maker/manifest.json', 'https://example.test/pikalab/');
    assert.equal(new URL(manifest.start_url, url).pathname, '/pikalab/science_maker/');
    assert.equal(new URL(manifest.icons[0].src, url).pathname, '/pikalab/icon.svg');
    fs.unlinkSync(path.join(build, 'icon.svg'));
    assert.throws(() => verifyLabPwaAssets(build), /PWA資産がありません/);
});
