const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const pikalabRoot = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(pikalabRoot, relativePath), 'utf8');
}

test('最初の名前・アバター画面とゲスト入口を維持する', () => {
    const html = read('index.html');

    assert.match(html, /id="login-modal"/);
    assert.match(html, /id="user-name-input"/);
    assert.match(html, /id="avatar-selector"/);
    assert.match(html, /id="enter-lab-btn"/);
    assert.match(html, /id="guest-enter-btn"/);
    assert.match(html, />研究をはじめる</);
    assert.match(html, />今はゲストとして入る</);
    assert.ok((html.match(/class="avatar-option\b/g) || []).length > 0, '選べるアバターが必要です');
});

test('名前入力は画面と保存処理の両方で40文字に制限する', async () => {
    const html = read('index.html');
    const helperPath = path.join(pikalabRoot, 'js', 'profile-name.mjs');

    assert.match(html, /id="user-name-input"[^>]*maxlength="40"/);
    assert.equal(fs.existsSync(helperPath), true, '名前正規化モジュールが必要です');

    const { normalizeProfileName, PROFILE_NAME_MAX_LENGTH } = await import(pathToFileURL(helperPath).href);
    assert.equal(PROFILE_NAME_MAX_LENGTH, 40);
    assert.equal(normalizeProfileName('  ピカ博士  '), 'ピカ博士');
    assert.equal(normalizeProfileName('あ'.repeat(45)), 'あ'.repeat(40));
    assert.equal(normalizeProfileName('   '), 'ゲスト');
    assert.equal(normalizeProfileName('   ', ''), '');
    assert.equal(normalizeProfileName(null), 'ゲスト');
});

test('入室時は名前とログイン回数をバッジ状態に依存せず保存する', () => {
    const main = read('js/main.js');

    assert.match(main, /normalizeProfileName\(nameInput\?\.value,\s*''\)/);
    assert.match(main, /userProfile\.loginCount\+\+;[\s\S]*?addBadge\('first-login',[\s\S]*?saveProfile\(\);/);
});
