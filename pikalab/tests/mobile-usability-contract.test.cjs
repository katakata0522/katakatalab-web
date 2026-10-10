const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('Book Report: 保護者ボタンのz-index utilityを実CSSでも提供する', () => {
    const html = read('book_report/index.html');
    const css = read('book_report/style.css');

    assert.match(html, /<div\b[^>]*class="[^"\n]*\bz-20\b[^"\n]*"[^>]*>\s*<button\b[^>]*data-action="parents-modal-open"/);
    assert.match(css, /\.z-20\s*\{[^}]*z-index:\s*20;/s);
});
