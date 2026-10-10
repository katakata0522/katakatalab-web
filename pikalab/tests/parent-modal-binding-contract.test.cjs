const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function count(source, needle) {
    return source.split(needle).length - 1;
}

for (const [name, relativePath] of [
    ['Fraction Lab', 'fraction_lab/index.html'],
    ['Speed Reader', 'speed_reader/index.html']
]) {
    test(`${name}: 保護者モーダルのCSSと開閉契約を一重化する`, () => {
        const html = read(relativePath);

        assert.equal(count(html, '#parents-modal::backdrop'), 1, 'parents modal backdrop CSS is defined once');
        assert.equal(count(html, '@keyframes parentsModalFadeIn'), 1, 'parents modal animation is defined once');
        assert.doesNotMatch(html, /data-action="parents-modal-(?:open|close)"/);
        assert.doesNotMatch(html, /querySelectorAll\('\[data-action="parents-modal-(?:open|close)"\]'/);
        assert.match(html, /id="parents-modal-open-btn"[^>]*data-action="open-modal"/);
        assert.match(html, /data-action="close-modal"[^>]*data-target="parents-modal"/);
    });
}

test('Fraction Lab: 既存setupModalsへ保護者モーダルを接続する', () => {
    const html = read('fraction_lab/index.html');
    const script = read('fraction_lab/script.js');

    assert.match(html, /id="parents-modal-open-btn"[^>]*data-action="open-modal"[^>]*data-target="parents-modal"/);
    assert.match(script, /function setupModals\(\)/);
    assert.match(script, /querySelectorAll\('\[data-action="open-modal"\]'/);
    assert.match(script, /querySelectorAll\('\[data-action="close-modal"\]'/);
});

test('Speed Reader: 既存アプリのモーダル管理へ接続する', () => {
    const html = read('speed_reader/index.html');
    const app = read('speed_reader/js/app.js');

    assert.match(app, /case 'open-modal':[\s\S]*openParentsModal/);
    assert.match(app, /case 'close-modal':[\s\S]*closeParentsModal/);
    assert.match(app, /setupModalBackdropClose\(\)/);
});

test('Speed Reader: 保護者モーダル起動ボタンは44px以上のタッチ高さを持つ', () => {
    const style = read('speed_reader/style.css');

    assert.match(style, /#parents-modal-open-btn\s*\{[^}]*min-height:\s*44px;/s);
});
