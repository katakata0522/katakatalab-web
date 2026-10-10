const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const RhythmLab = require(path.join(projectRoot, 'script.js'));

test('script.js: テスト用APIが公開されている', () => {
    assert.ok(RhythmLab);
    assert.ok(RhythmLab.__test);
    assert.equal(typeof RhythmLab.__test.clamp, 'function');
    assert.equal(typeof RhythmLab.__test.getBeatAccentLevel, 'function');
    assert.equal(typeof RhythmLab.__test.normalizeTempo, 'function');
    assert.equal(typeof RhythmLab.__test.getPresetNameFromCode, 'function');
    assert.equal(typeof RhythmLab.__test.shouldIgnoreGlobalShortcutTarget, 'function');
    assert.equal(typeof RhythmLab.__test.getPresetSnapshot, 'function');
    assert.equal(typeof RhythmLab.__test.normalizeSharedGridData, 'function');
    assert.equal(typeof RhythmLab.__test.confirmSharedGridImport, 'function');
    assert.equal(typeof RhythmLab.__test.shouldClearAllBeats, 'function');
    assert.equal(typeof RhythmLab.__test.writeTextToStorage, 'function');
    assert.equal(typeof RhythmLab.__test.writeJsonToStorage, 'function');
});

test('normalizeSharedGridData: 共有データは全楽器16ステップの正しい形式だけ受け付ける', () => {
    const { normalizeSharedGridData } = RhythmLab.__test;
    const valid = {
        hihat: new Array(16).fill(0),
        clap: new Array(16).fill(0),
        snare: new Array(16).fill(0),
        tom: new Array(16).fill(0),
        kick: new Array(16).fill(0)
    };
    valid.kick[0] = 1;

    const normalized = normalizeSharedGridData(valid);
    assert.deepEqual(normalized, valid);
    assert.equal(normalizeSharedGridData({ kick: [1] }), null);
    assert.equal(normalizeSharedGridData({ ...valid, kick: new Array(16).fill('<script>') }), null);
    assert.equal(normalizeSharedGridData(null), null);
});

test('confirmSharedGridImport: 明示確認で拒否された共有データは適用しない', () => {
    const { confirmSharedGridImport } = RhythmLab.__test;
    const messages = [];
    const accepted = confirmSharedGridImport((message) => {
        messages.push(message);
        return false;
    });

    assert.equal(accepted, false);
    assert.equal(messages.length, 1);
    assert.match(messages[0], /上書き/);
});

test('shouldClearAllBeats: 全消去は確認で拒否できる', () => {
    const { shouldClearAllBeats } = RhythmLab.__test;
    assert.equal(shouldClearAllBeats(() => false), false);
    assert.equal(shouldClearAllBeats(() => true), true);
});

test('writeJsonToStorage: 保存例外を画面通知へ渡して失敗を返す', () => {
    const { writeJsonToStorage } = RhythmLab.__test;
    const messages = [];
    const storage = {
        setItem() {
            throw new Error('quota exceeded');
        }
    };

    const originalConsoleError = console.error;
    console.error = () => {};
    let result;
    try {
        result = writeJsonToStorage(storage, 'test-key', { value: 1 }, (message) => {
            messages.push(message);
        });
    } finally {
        console.error = originalConsoleError;
    }

    assert.equal(result, false);
    assert.deepEqual(messages, ['保存できませんでした。ブラウザの保存容量や設定を確認してください。']);
});

test('writeTextToStorage: 設定値の保存失敗も画面通知へ渡す', () => {
    const { writeTextToStorage } = RhythmLab.__test;
    const messages = [];
    const originalConsoleError = console.error;
    console.error = () => {};
    let saved;
    try {
        saved = writeTextToStorage({
            setItem() {
                throw new Error('storage disabled');
            }
        }, 'rhythmlab_volume', '80', (message) => messages.push(message));
    } finally {
        console.error = originalConsoleError;
    }

    assert.equal(saved, false);
    assert.deepEqual(messages, ['保存できませんでした。ブラウザの保存容量や設定を確認してください。']);
});

test('clamp: 数値を最小値〜最大値に収める', () => {
    const { clamp } = RhythmLab.__test;
    assert.equal(clamp(120, 0, 100), 100);
    assert.equal(clamp(-10, 0, 100), 0);
    assert.equal(clamp(48, 0, 100), 48);
    assert.equal(clamp(Number.NaN, 0, 100), 0);
});

test('normalizeTempo: テンポ値を60-240の範囲に正規化する', () => {
    const { normalizeTempo } = RhythmLab.__test;
    assert.equal(normalizeTempo('abc'), 120);
    assert.equal(normalizeTempo(40), 60);
    assert.equal(normalizeTempo(300), 240);
    assert.equal(normalizeTempo(128), 128);
});

test('getBeatAccentLevel: 1拍目と3拍目を強く、2拍目と4拍目を補助強調する', () => {
    const { getBeatAccentLevel } = RhythmLab.__test;
    assert.equal(getBeatAccentLevel(0), 'primary');
    assert.equal(getBeatAccentLevel(4), 'secondary');
    assert.equal(getBeatAccentLevel(8), 'primary');
    assert.equal(getBeatAccentLevel(12), 'secondary');
    assert.equal(getBeatAccentLevel(1), 'none');
    assert.equal(getBeatAccentLevel(15), 'none');
});

test('getPresetNameFromCode: キーコードをプリセット名へ安全に変換する', () => {
    const { getPresetNameFromCode } = RhythmLab.__test;
    assert.equal(getPresetNameFromCode('Digit1'), 'rock');
    assert.equal(getPresetNameFromCode('Numpad2'), 'house');
    assert.equal(getPresetNameFromCode('Digit3'), 'hiphop');
    assert.equal(getPresetNameFromCode('Numpad4'), 'latin');
    assert.equal(getPresetNameFromCode('Digit5'), 'funk');
    assert.equal(getPresetNameFromCode('Numpad6'), 'tomgroove');
    assert.equal(getPresetNameFromCode('KeyR'), null);
});

test('latinプリセット: クラーベ風アクセントとバックビートを両立している', () => {
    const { getPresetSnapshot } = RhythmLab.__test;
    const latin = getPresetSnapshot('latin');
    assert.ok(latin);
    assert.deepEqual(latin.kick, [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0]);
    assert.deepEqual(latin.snare, [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]);
    assert.deepEqual(latin.clap, [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0]);
    assert.deepEqual(latin.tom, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
});

test('funkプリセット: シンコペーションしたスネアと短いタムフィルを持つ', () => {
    const { getPresetSnapshot } = RhythmLab.__test;
    const funk = getPresetSnapshot('funk');
    assert.ok(funk);
    assert.deepEqual(funk.hihat, new Array(16).fill(1));
    assert.deepEqual(funk.snare, [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0]);
    assert.deepEqual(funk.tom, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
});

test('tomgrooveプリセット: タム主体でバックビートも残している', () => {
    const { getPresetSnapshot } = RhythmLab.__test;
    const tomgroove = getPresetSnapshot('tomgroove');
    assert.ok(tomgroove);
    assert.deepEqual(tomgroove.hihat, [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
    assert.deepEqual(tomgroove.snare, [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]);
    assert.deepEqual(tomgroove.tom, [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0]);
});

test('shouldIgnoreGlobalShortcutTarget: 入力系要素やリズムセルを除外する', () => {
    const { shouldIgnoreGlobalShortcutTarget } = RhythmLab.__test;
    assert.equal(shouldIgnoreGlobalShortcutTarget(null), true);
    assert.equal(shouldIgnoreGlobalShortcutTarget({ tagName: 'INPUT' }), true);
    assert.equal(shouldIgnoreGlobalShortcutTarget({ tagName: 'A' }), true);
    assert.equal(shouldIgnoreGlobalShortcutTarget({ tagName: 'DIV', isContentEditable: true }), true);
    assert.equal(shouldIgnoreGlobalShortcutTarget({
        tagName: 'DIV',
        getAttribute: (name) => (name === 'role' ? 'button' : null),
        closest: (selector) => selector === '[data-type][data-index][role="button"]' ? {} : null
    }), true);
    assert.equal(shouldIgnoreGlobalShortcutTarget({
        tagName: 'DIV',
        getAttribute: () => null,
        closest: () => null
    }), false);
});

test('index.html: 静的Tailwind CSSを読み込み、CDN依存が残っていない', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    assert.match(html, /href="\.\.\/tailwind\.generated\.css\?v=[^"]+"/);
    assert.equal(html.includes('https://cdn.tailwindcss.com'), false);
    assert.equal(html.includes('tailwind-config.js'), false);
});

test('index.html: ヘルプボタンとモーダルにアクセシビリティ属性がある', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    assert.match(html, /id="help-btn"[\s\S]*?aria-haspopup="dialog"/);
    assert.match(html, /id="help-btn"[\s\S]*?aria-controls="help-modal"/);
    assert.match(html, /id="help-btn"[\s\S]*?aria-expanded="false"/);
    assert.match(html, /<dialog\b[^>]*id="help-modal"[^>]*aria-modal="true"/);
});

test('index.html: 360pxでも保存行が縮み、保護者dialogを本体初期化へ接続する', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const script = fs.readFileSync(path.join(projectRoot, 'script.js'), 'utf8');
    assert.match(html, /id="preset-name"[\s\S]*?class="[^"]*min-w-0[^"]*flex-1/);
    assert.doesNotMatch(html, /<dialog id="parents-modal"[^>]*style="display:none;"/);
    assert.match(html, /data-action="parents-modal-open"[\s\S]*?aria-controls="parents-modal"/);
    assert.doesNotMatch(html, /document\.addEventListener\('DOMContentLoaded',[\s\S]*?parents-modal-open/);
    assert.match(script, /function setupParentsModal\(\)/);
    assert.match(script, /setupEventListeners\(\);\s*setupParentsModal\(\);/);
});

test('index.html: すべてのbuttonにtype="button"が設定されている', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const buttonTags = html.match(/<button\b[^>]*>/g) || [];
    assert.ok(buttonTags.length > 0);
    buttonTags.forEach((tag) => {
        assert.match(tag, /type="button"/);
    });
});

test('index.html: プリセットボタンとショートカット説明が6種類に対応している', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    assert.match(html, /id="preset-rock"/);
    assert.match(html, /id="preset-house"/);
    assert.match(html, /id="preset-hiphop"/);
    assert.match(html, /id="preset-latin"/);
    assert.match(html, /id="preset-funk"/);
    assert.match(html, /id="preset-tomgroove"/);
    assert.match(html, />1<\/kbd>～<kbd[\s\S]*?>6<\/kbd>/);
});

test('index.html: 選択中プリセット表示とボタン状態属性がある', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    assert.match(html, /id="preset-current-status"/);
    assert.match(html, /id="preset-rock"[\s\S]*?aria-pressed="false"/);
    assert.match(html, /id="preset-tomgroove"[\s\S]*?aria-pressed="false"/);
});

test('style.css: アクティブな各楽器セルに色のフォールバックがある', () => {
    const css = fs.readFileSync(path.join(projectRoot, 'style.css'), 'utf8');
    assert.match(css, /button\[data-type\]\[data-index\]\[data-type="hihat"\]\[aria-pressed="true"\]/);
    assert.match(css, /button\[data-type\]\[data-index\]\[data-type="clap"\]\[aria-pressed="true"\]/);
    assert.match(css, /button\[data-type\]\[data-index\]\[data-type="snare"\]\[aria-pressed="true"\]/);
    assert.match(css, /button\[data-type\]\[data-index\]\[data-type="tom"\]\[aria-pressed="true"\]/);
    assert.match(css, /button\[data-type\]\[data-index\]\[data-type="kick"\]\[aria-pressed="true"\]/);
});

test('style.css: 選択中プリセットと拍アクセントのスタイルがある', () => {
    const css = fs.readFileSync(path.join(projectRoot, 'style.css'), 'utf8');
    assert.match(css, /\.preset-button\[data-selected="true"\]/);
    assert.match(css, /\[data-beat-accent="primary"\]/);
    assert.match(css, /\[data-beat-accent="secondary"\]/);
});

test('親階層のTailwind生成CSSが存在し、主要レイアウトutilityを含む', () => {
    const generatedCss = path.resolve(projectRoot, '..', 'tailwind.generated.css');
    assert.equal(fs.existsSync(generatedCss), true);
    const css = fs.readFileSync(generatedCss, 'utf8');
    for (const contract of [
        /\.flex\{display:flex\}/,
        /\.grid\{display:grid\}/,
        /\.hidden\{display:none\}/,
        /\.min-h-screen\{/,
    ]) {
        assert.match(css, contract);
    }
});

test('script.js: モーダル処理を優先してショートカット除外判定を行う', () => {
    const script = fs.readFileSync(path.join(projectRoot, 'script.js'), 'utf8');
    const modalCheckIndex = script.indexOf('if (isModalOpen())');
    const ignoreCheckIndex = script.indexOf('if (shouldIgnoreGlobalShortcutTarget(e.target)) return;');
    assert.ok(modalCheckIndex !== -1);
    assert.ok(ignoreCheckIndex !== -1);
    assert.ok(modalCheckIndex < ignoreCheckIndex);
    assert.match(script, /if \(e\.repeat \|\| e\.isComposing/);
});

test('script.js: 楽器色をTailwindクラス文字列で重複管理していない', () => {
    const script = fs.readFileSync(path.join(projectRoot, 'script.js'), 'utf8');
    assert.equal(script.includes('const INSTRUMENT_COLORS'), false);
    assert.equal(script.includes('bg-cyan-500'), false);
    assert.equal(script.includes('bg-purple-500'), false);
    assert.equal(script.includes('bg-pink-500 border-pink-400 shadow-[0_0_10px_#ec4899]'), false);
});

test('.htaccess: 共通CSPでTone.jsのCDNを許可している', () => {
    const siteRoot = path.resolve(projectRoot, '..', '..');
    const htaccess = fs.readFileSync(path.join(siteRoot, '.htaccess'), 'utf8');
    assert.match(htaccess, /Content-Security-Policy ".*script-src[^"]*https:\/\/cdnjs\.cloudflare\.com/);
});

test(".htaccess: 共通CSPでTone.js用のblobワーカーを許可している", () => {
    const siteRoot = path.resolve(projectRoot, '..', '..');
    const htaccess = fs.readFileSync(path.join(siteRoot, '.htaccess'), 'utf8');
    assert.match(htaccess, /Content-Security-Policy ".*worker-src 'self' blob:/);
});
