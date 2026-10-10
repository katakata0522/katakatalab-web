const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

test('テーマ未保存時はOS設定を初期テーマとして使う', () => {
    assert.match(source, /window\.matchMedia\('\(prefers-color-scheme: dark\)'\)/);
    assert.match(
        source,
        /applyTheme\(savedTheme \? savedTheme === 'dark' : Boolean\(prefersDarkScheme\?\.matches\)\);/
    );
});

test('手動テーマ設定はlocalStorageへ保存しOS変更より優先する', () => {
    assert.match(
        source,
        /localStorage\.setItem\('theme', isDark \? 'dark' : 'light'\);/
    );
    assert.match(
        source,
        /const syncWithSystemTheme = \(event\) => \{\s*if \(readSavedTheme\(\)\) return;\s*applyTheme\(event\.matches\);\s*\};/s
    );
});

test('テーマ適用時は現行のSVGアイコンとtheme-colorも同期する', () => {
    assert.match(
        source,
        /function applyTheme\(isDark\) \{\s*body\.classList\.toggle\('dark-mode', isDark\);\s*updateThemeToggleIcon\(isDark\);\s*updateThemeColorMeta\(\);\s*\}/s
    );
});

test('OSテーマ変更監視は新旧MediaQueryList APIへ対応する', () => {
    assert.match(source, /prefersDarkScheme\?\.addEventListener/);
    assert.match(source, /prefersDarkScheme\.addEventListener\('change', syncWithSystemTheme\);/);
    assert.match(source, /prefersDarkScheme\?\.addListener/);
    assert.match(source, /prefersDarkScheme\.addListener\(syncWithSystemTheme\);/);
});
