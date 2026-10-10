const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const scriptPath = path.resolve(__dirname, '..', 'script.js');

test('Rhythmセルはnative buttonを使い、手書きのEnter/Space処理を持たない', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');
    const start = script.indexOf('function createCell(type, idx)');
    const end = script.indexOf('\n    function toggleNote(type, idx)', start);
    assert.ok(start >= 0 && end > start, 'createCell block should exist');

    const createCell = script.slice(start, end);
    assert.match(createCell, /document\.createElement\('button'\)/);
    assert.match(createCell, /button\.type = 'button'/);
    assert.match(createCell, /button\.setAttribute\('aria-pressed', 'false'\)/);
    assert.equal(createCell.includes("setAttribute('role', 'button')"), false);
    assert.equal(createCell.includes("setAttribute('tabindex', '0')"), false);
    assert.equal(createCell.includes("addEventListener('keydown'"), false);
});

test('グローバルショートカットはbutton要素を除外する', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');
    assert.match(script, /tagName === 'button'/);
    assert.match(script, /if \(shouldIgnoreGlobalShortcutTarget\(e\.target\)\) return;/);
});
