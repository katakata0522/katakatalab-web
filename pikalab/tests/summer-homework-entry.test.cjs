const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pikalabRoot = path.resolve(__dirname, '..');
const summerEntry = require(path.join(pikalabRoot, 'js', 'summer-homework.js'));

function read(relativePath) {
    return fs.readFileSync(path.join(pikalabRoot, relativePath), 'utf8');
}

test('夏休み入口は端末日付の7月・8月だけを対象にする', () => {
    assert.equal(summerEntry.isSummerHomeworkSeason(new Date(2026, 5, 30)), false);
    assert.equal(summerEntry.isSummerHomeworkSeason(new Date(2026, 6, 1)), true);
    assert.equal(summerEntry.isSummerHomeworkSeason(new Date(2026, 7, 31)), true);
    assert.equal(summerEntry.isSummerHomeworkSeason(new Date(2026, 8, 1)), false);
    assert.equal(summerEntry.isSummerHomeworkSeason(new Date('invalid')), false);
});

test('夏休み入口は宿題の主導権を本人と学校に残す', () => {
    const source = read('js/summer-homework.js');
    assert.match(source, /答えを作るのではなく、自分で仕上げる/);
    assert.match(source, /提出形式は学校の指示を優先/);
    assert.doesNotMatch(source, /そのまま提出|提出用の完成|完成した宿題を作/);
});

test('夏休み入口は自由研究・感想文を主役に、既存補助Labへつなぐ', () => {
    const source = read('js/summer-homework.js');
    for (const href of ['science_maker/', 'book_report/', 'focus_studio/', 'paper_gen/']) {
        assert.match(source, new RegExp(`href=\\"${href.replace('/', '\\/')}\\"`));
    }
    assert.match(source, /予想・方法・結果・考察の研究メモ/);
    assert.match(source, /書くための構成メモ/);
});

test('季節導線は既存トップ本体とプロフィール画面を動かさず追加する', () => {
    const main = read('js/main.js');
    const constants = read('js/constants.js');
    const index = read('index.html');

    assert.match(main, /PikaLab - Main Entry Point/);
    assert.match(main, /main\.inert\s*=\s*true/);
    assert.match(main, /normalizeProfileName\(nameInput\?\.value,\s*''\)/);
    assert.match(constants, /import '\.\/summer-homework\.js';/);
    assert.match(index, /id="user-name-input"/);
    assert.match(index, /id="enter-lab-btn"/);
    assert.match(index, /id="guest-enter-btn"/);
    assert.doesNotMatch(index, /summer-homework-entry/);
});
