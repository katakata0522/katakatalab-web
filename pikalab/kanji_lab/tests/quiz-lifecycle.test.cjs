const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createHarness() {
    const handlers = {};
    const intervals = new Map();
    const sounds = [];
    let timerId = 0;
    const document = {
        hidden: false,
        addEventListener(type, callback) { handlers[type] = callback; },
        getElementById() { return null; },
        querySelectorAll() { return []; },
        body: { addEventListener() {}, classList: { add() {} } }
    };
    const entry = { k: '林', l: '木', r: '木', y: 'はやし', m: '木が集まったところ' };
    const context = {
        document, console,
        window: {
            KanjiLabData: { KANJI_ALL: [entry], KANJI_LR: [entry], KANJI_UD: [] },
            KanjiLabAudio: { setMuted() {}, getMuted() { return false; }, playSound(sound) { sounds.push(sound); } }
        },
        localStorage: { getItem() { return null; }, setItem() {} },
        setInterval(callback) { const id = ++timerId; intervals.set(id, callback); return id; },
        clearInterval(id) { intervals.delete(id); },
        setTimeout() { return 1; }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8'), context);
    handlers.DOMContentLoaded();
    const app = context.window.App;
    return {
        app, intervals, sounds,
        chooseAnswer() { app.ui.selectQuizPart('left', '木', {}); app.ui.selectQuizPart('right', '木', {}); },
        visibility(hidden) { document.hidden = hidden; handlers.visibilitychange(); }
    };
}

test('デイリーの解答中だけ、タブ復帰時にタイマーを再開する', () => {
    const h = createHarness();
    h.app.daily.startDailyChallenge();
    assert.equal(h.intervals.size, 1);
    h.visibility(true);
    assert.equal(h.intervals.size, 0);
    h.visibility(false);
    assert.equal(h.intervals.size, 1);
    h.chooseAnswer();
    h.app.quiz.checkQuiz();
    assert.equal(h.intervals.size, 0);
    h.visibility(true); h.visibility(false);
    assert.equal(h.intervals.size, 0);
});

test('同じ問題の解答を二重に採点しない', () => {
    const h = createHarness();
    h.app.daily.startDailyChallenge();
    h.chooseAnswer();
    h.app.quiz.checkQuiz();
    h.app.quiz.checkQuiz();
    assert.equal(h.sounds.filter(sound => sound === 'success').length, 1);
});

test('まだ選んでいない問題を採点・進行しない', () => {
    const h = createHarness();
    assert.doesNotThrow(() => h.app.quiz.checkQuiz());
    h.app.daily.startDailyChallenge();
    h.app.quiz.checkQuiz();
    assert.equal(h.intervals.size, 1);
    assert.equal(h.sounds.filter(sound => sound === 'fail').length, 0);
});
