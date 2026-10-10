const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const pikalabRoot = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(pikalabRoot, relativePath), 'utf8');
}


function relativeLuminance(hexColor) {
    const channels = hexColor.slice(1).match(/.{2}/g).map((channel) => {
        const value = Number.parseInt(channel, 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrastRatio(firstColor, secondColor) {
    const first = relativeLuminance(firstColor);
    const second = relativeLuminance(secondColor);
    const lighter = Math.max(first, second);
    const darker = Math.min(first, second);
    return (lighter + 0.05) / (darker + 0.05);
}

function hexPropertyForMarker(source, marker, property, label) {
    const markerIndex = source.indexOf(marker);
    assert.notEqual(markerIndex, -1, `${label}: selector`);
    const open = source.indexOf('{', markerIndex);
    const close = source.indexOf('}', open);
    assert.ok(open > markerIndex && close > open, `${label}: rule block`);
    const block = source.slice(open + 1, close);
    const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const color = block.match(new RegExp(`(?:^|;)\\s*${escapedProperty}\\s*:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
    assert.ok(color, `${label}: ${property}`);
    return color;
}

function assertAaContrast(foreground, background, label) {
    assert.ok(
        contrastRatio(foreground, background) >= 4.5,
        `${label}: contrast ${contrastRatio(foreground, background).toFixed(2)}`,
    );
}

function assertSocialMetadata(relativePath) {
    const html = read(relativePath);
    const requiredPatterns = [
        /<meta\s+property="og:title"\s+content="[^"]+"/i,
        /<meta\s+property="og:description"\s+content="[^"]+"/i,
        /<meta\s+property="og:type"\s+content="website"/i,
        /<meta\s+property="og:url"\s+content="https:\/\/katakatalab\.com\/pikalab\//i,
        /<meta\s+property="og:image"\s+content="https:\/\/katakatalab\.com\/pikalab\//i,
        /<meta\s+name="twitter:card"\s+content="summary_large_image"/i,
        /<meta\s+name="twitter:title"\s+content="[^"]+"/i,
        /<meta\s+name="twitter:description"\s+content="[^"]+"/i,
        /<meta\s+name="twitter:image"\s+content="https:\/\/katakatalab\.com\/pikalab\//i
    ];

    requiredPatterns.forEach((pattern) => {
        assert.match(html, pattern, `${relativePath} にSNSメタデータが必要です`);
    });
}

test('担当ページはOGとTwitterカードを完全に持つ', () => {
    [
        '.code-studio/index.html',
        'deepsea_lab/index.html',
        'eduplay/index.html',
        'eduplay/hiragana.html',
        'eduplay/matching.html',
        'eduplay/piano.html',
        'eduplay/puzzle.html',
        'eduplay/shopping.html',
        'eduplay/zukan.html',
        'fraction_lab/index.html',
        'space_lab/index.html',
        'kanji_lab/index.html'
    ].forEach(assertSocialMetadata);
});

test('EduPlayは通常の静的リンクで全ゲームと広場へ移動できる', () => {
    const hub = read('eduplay/index.html');
    ['puzzle.html', 'shopping.html', 'hiragana.html', 'piano.html', 'matching.html', 'zukan.html'].forEach((href) => {
        assert.match(hub, new RegExp(`<a[^>]+href="${href}"`, 'i'));
    });

    ['hiragana', 'matching', 'piano', 'puzzle', 'shopping', 'zukan'].forEach((pageName) => {
        assert.match(read(`eduplay/${pageName}.html`), /<a[^>]+id="game-back-btn"[^>]+href="\.\/"/i);
    });
});

test('EduPlayの主要5ゲームは意味と状態を持つネイティブ操作要素を生成する', () => {
    const hiragana = read('eduplay/hiragana.html');
    const matching = read('eduplay/matching.html');
    const piano = read('eduplay/piano.html');
    const puzzle = read('eduplay/puzzle.html');
    const shopping = read('eduplay/shopping.html');

    assert.match(hiragana, /document\.createElement\('button'\)/);
    assert.match(hiragana, /aria-label/);

    assert.match(matching, /document\.createElement\('button'\)/);
    assert.match(matching, /aria-pressed/);
    assert.match(matching, /\.disabled\s*=\s*true/);

    assert.doesNotMatch(piano, /<div class="piano-key/);
    assert.match(piano, /<button[^>]+class="piano-key[^>]+aria-label=/);
    assert.match(piano, /e\.detail\s*===\s*0/);

    assert.match(puzzle, /document\.createElement\('button'\)/);
    assert.match(puzzle, /aria-label/);
    assert.match(puzzle, /matchByKeyboard/);

    assert.match(shopping, /document\.createElement\('button'\)/);
    assert.match(shopping, /\.disabled\s*=\s*true/);
});

test('EduPlayの音設定は全ページ共通キーで例外安全に保存・復元できる', () => {
    const {
        EDU_SOUND_STORAGE_KEY,
        getSafeLocalStorage,
        loadEduSoundSettings,
        saveEduSoundSettings
    } = require(path.join(pikalabRoot, 'eduplay', 'common.js'));

    const values = new Map();
    const storage = {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, value);
        }
    };

    assert.equal(EDU_SOUND_STORAGE_KEY, 'wonder_school_profile_v2');
    assert.equal(saveEduSoundSettings(storage, false, 0.1), true);
    assert.deepEqual(loadEduSoundSettings(storage), { isOn: false, volume: 0.1 });
    assert.equal(saveEduSoundSettings(storage, true, 0.25), true);
    assert.deepEqual(loadEduSoundSettings(storage), { isOn: true, volume: 0.25 });
    assert.equal(getSafeLocalStorage({ localStorage: storage }), storage);
    assert.equal(getSafeLocalStorage({
        get localStorage() {
            throw new DOMException('blocked', 'SecurityError');
        }
    }), null);

    const deniedStorage = {
        getItem() {
            throw new Error('denied');
        },
        setItem() {
            throw new Error('denied');
        }
    };
    // 例外安全性だけを検証し、意図的に発生させる警告はテスト出力へ流さない。
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
        assert.deepEqual(loadEduSoundSettings(deniedStorage), { isOn: true, volume: 0.1 });
        assert.equal(saveEduSoundSettings(deniedStorage, false, 0.1), false);
    } finally {
        console.warn = originalWarn;
    }
});

test('Space Labは保存データを既知の構造へ正規化する', async () => {
    const moduleUrl = pathToFileURL(path.join(pikalabRoot, 'space_lab', 'state-normalizer.mjs'));
    moduleUrl.searchParams.set('test', Date.now().toString());
    const { normalizeSpaceLabState } = await import(moduleUrl.href);

    assert.deepEqual(
        normalizeSpaceLabState({
            visited: ['earth', 'earth', 3, '__proto__'],
            solvedQuizzes: {
                earth: [0, 1, 1, 8, '2'],
                constructor: [0],
                mars: 'broken'
            },
            readSecrets: ['blackhole', 'blackhole', 7]
        }),
        {
            visited: ['earth'],
            solvedQuizzes: { earth: [0, 1] },
            readSecrets: ['blackhole']
        }
    );
});

test('Space Labはキーボード、ズーム、動き、PWAボタンの契約を満たす', () => {
    const html = read('space_lab/index.html');
    const script = read('space_lab/script.js');
    const renderer = read('space_lab/canvas-renderer.js');
    const css = read('space_lab/style.css');

    assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1\.0/i);
    assert.match(html, /id="ufo-btn"[^>]+role="button"[^>]+tabindex="-1"/i);
    assert.match(html, /id="pwa-close-btn"[^>]+aria-label="[^"]+"/i);
    assert.match(script, /matchMedia\?*\.?\('\(prefers-reduced-motion: reduce\)'\)/);
    assert.match(script, /addEventListener\('keydown'/);
    assert.match(renderer, /focusPlanetInViewport/);
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?#ufo-btn/i);
});

test('Fraction LabはARIA Tabs、入力名、ライブ通知を持つ', () => {
    const html = read('fraction_lab/index.html');
    const script = read('fraction_lab/script.js');

    ['whatis', 'visual', 'compare', 'calc', 'sub', 'secret'].forEach((id) => {
        assert.match(html, new RegExp(`id="tab-${id}"[^>]+role="tab"[^>]+aria-controls="view-${id}"`, 'i'));
        assert.match(html, new RegExp(`id="view-${id}"[^>]+role="tabpanel"[^>]+aria-labelledby="tab-${id}"`, 'i'));
    });
    ['calc-n1', 'calc-n2', 'sub-n1', 'sub-n2'].forEach((id) => {
        assert.match(html, new RegExp(`id="${id}"[^>]+aria-label="[^"]+"`, 'i'));
    });
    assert.match(html, /aria-live="polite"/);
    assert.match(script, /ArrowLeft|ArrowRight/);
    assert.match(script, /aria-selected/);
});

test('Deep Sea、Code Studio、Manabi Landの個別契約を満たす', () => {
    const deepsea = read('deepsea_lab/index.html');
    const deepseaCss = read('deepsea_lab/css/style.css');
    const codeStudio = read('.code-studio/index.html');
    const manabiHtml = read('manabi_land/index.html');
    const manabiScript = read('manabi_land/script.js');

    assert.doesNotMatch(deepsea, /user-scalable=no|maximum-scale=1\.0/i);
    assert.match(deepsea, /id="scroll-container"[^>]+tabindex="0"[^>]+aria-label="[^"]+"/i);
    assert.match(deepseaCss, /#scroll-container:focus-visible/);

    ['tab-type', 'sel-lang', 'sel-history'].forEach((id) => {
        assert.match(codeStudio, new RegExp(`id="${id}"[^>]+aria-label="[^"]+"`, 'i'));
    });
    assert.match(codeStudio, /\.snap-btn\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/is);
    assert.match(codeStudio, /class="snap-btn"[^>]+aria-label="[^"]+"/i);
    const codePrimaryBackground = hexPropertyForMarker(codeStudio, '.action-btn.primary', 'background', 'Code Studio primary action');
    assertAaContrast('#ffffff', codePrimaryBackground, 'Code Studio primary action');

    assert.match(manabiScript, /document\.createElement\('button'\)/);
    assert.match(manabiScript, /aria-label/);
    assert.match(manabiScript, /Tone\.context\.rawContext\s*\|\|\s*Tone\.context/);
    assert.match(manabiScript, /typeof toneContext\.suspend\s*===\s*['"]function['"]/);
    assert.match(manabiScript, /typeof toneContext\.resume\s*===\s*['"]function['"]/);
    assert.match(manabiHtml, /お金|時計|文字/u);
    assert.doesNotMatch(manabiHtml, /算数・国語・理科・社会/u);
});

test('共通CSSはAA向けの配色トークンとフォーカス表示を持つ', () => {
    const inputCss = read('tailwind.input.css');
    const eduCss = read('eduplay/common.css');
    const deepSeaCss = read('deepsea_lab/css/style.css');
    const fractionCss = read('fraction_lab/style.css');
    const manabiCss = read('manabi_land/style.css');

    assert.match(inputCss, /--contrast-text-muted:\s*#[0-9a-f]{6}/i);
    assert.match(inputCss, /--contrast-action-blue:\s*#[0-9a-f]{6}/i);
    assert.match(inputCss, /\.text-slate-400[\s\S]*?var\(--contrast-text-muted\)/i);
    assert.match(inputCss, /\.bg-blue-400[\s\S]*?var\(--contrast-action-blue\)/i);
    assert.match(inputCss, /\.bg-yellow-400\.text-white[\s\S]*?color:/i);
    assert.match(inputCss, /\.material-symbols-rounded[\s\S]*?max-width:\s*1em/i);
    assert.match(fractionCss, /\.material-symbols-rounded[\s\S]*?max-width:\s*1em/i);
    assert.match(eduCss, /\.game-card:focus-visible/);

    assertAaContrast(
        '#ffffff',
        hexPropertyForMarker(eduCss, '.bg-green-500.text-white', 'background-color', 'EduPlay green action'),
        'EduPlay green action',
    );
    assertAaContrast(
        hexPropertyForMarker(eduCss, 'button.text-gray-500', 'color', 'EduPlay muted button'),
        '#ffffff',
        'EduPlay muted button',
    );
    assertAaContrast(
        hexPropertyForMarker(eduCss, '.piano-key.text-green-400', 'color', 'EduPlay piano key'),
        '#ffffff',
        'EduPlay piano key',
    );
    assertAaContrast(
        '#ffffff',
        hexPropertyForMarker(deepSeaCss, '.bg-ocean-twilight', 'background-color', 'Deep Sea twilight marker'),
        'Deep Sea twilight marker',
    );

    assertAaContrast(
        hexPropertyForMarker(manabiCss, 'h1.text-orange-500', 'color', 'Manabi heading'),
        '#ffffff',
        'Manabi heading',
    );
    const activeNavText = hexPropertyForMarker(manabiCss, '.nav-item.active', 'color', 'Manabi active nav');
    const activeNavBackground = hexPropertyForMarker(manabiCss, '.nav-item.active', 'background', 'Manabi active nav');
    assertAaContrast(activeNavText, activeNavBackground, 'Manabi active nav');
    assertAaContrast(
        hexPropertyForMarker(manabiCss, '#money-label', 'color', 'Manabi money label'),
        '#1e293b',
        'Manabi money label',
    );
    assertAaContrast(
        hexPropertyForMarker(manabiCss, '#btn-money-undo', 'color', 'Manabi undo button'),
        '#ffedd5',
        'Manabi undo button',
    );
    assertAaContrast(
        hexPropertyForMarker(manabiCss, '#tab-moji .text-pink-400', 'color', 'Manabi moji prompt'),
        '#fdf2f8',
        'Manabi moji prompt',
    );
    assertAaContrast(
        hexPropertyForMarker(manabiCss, '#btn-moji-next', 'color', 'Manabi next button'),
        '#f1f5f9',
        'Manabi next button',
    );
});


test('配色ヘルパーはCSSプロパティ内のエスケープ文字をそのまま照合する', () => {
    const property = String.raw`--accent\.tone`;
    const css = `.probe { ${property}: #123456; color: #000000; }`;
    assert.equal(hexPropertyForMarker(css, '.probe', property, 'fixture'), '#123456');
    assert.equal(hexPropertyForMarker(css, '.probe', 'color', 'fixture'), '#000000');
    assert.throws(() => hexPropertyForMarker(css, '.missing', 'color', 'fixture'), /selector/);
});

test('配色ヘルパーは十分なコントラストを許可し、低コントラストを拒否する', () => {
    assert.equal(contrastRatio('#000000', '#ffffff'), 21);
    assert.doesNotThrow(() => assertAaContrast('#000000', '#ffffff', 'fixture'));
    assert.throws(() => assertAaContrast('#777777', '#888888', 'fixture'), /contrast/);
});

