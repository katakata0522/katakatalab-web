const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createHarness(options = {}) {
    const elements = {};
    const score = { textContent: '0' };
    elements['quiz-score'] = score;
    const numberParent = { set innerHTML(html) { elements['quiz-num'] = { textContent: html.match(/>(\d+)<\/span>/)[1], parentNode: numberParent }; } };
    elements['quiz-num'] = { textContent: '1', parentNode: numberParent };
    let saved = null;
    let now = 0;
    const handlers = {};
    const intervals = new Map();
    const sounds = [];
    let timerId = 0;
    const document = {
        hidden: false,
        addEventListener(type, callback) { handlers[type] = callback; },
        getElementById(id) { return elements[id] || null; },
        querySelectorAll() { return []; },
        body: { addEventListener() {}, classList: { add() {} } }
    };
    const entry = { k: '林', l: '木', r: '木', y: 'はやし', m: '木が集まったところ' };
    const context = {
        document, console, Date: class extends Date { static now() { return now; } },
        window: {
            KanjiLabData: { KANJI_ALL: [entry], KANJI_LR: [entry], KANJI_UD: [] },
            KanjiLabAudio: { setMuted() {}, getMuted() { return false; }, playSound(sound) { sounds.push(sound); } }
        },
        localStorage: { getItem() { return null; }, setItem(key, value) { saved = JSON.parse(value); } },
        setInterval(callback) { const id = ++timerId; intervals.set(id, callback); return id; },
        clearInterval(id) { intervals.delete(id); },
        setTimeout() { return 1; }
    };
    context.window.KanjiLabProgress = require('../js/progress.js');
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8'), context);
    handlers.DOMContentLoaded();
    const app = context.window.App;
    return {
        app, intervals, sounds, elements,
        getSaved: () => saved,
        advance(ms) { now += ms; },
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

test('ラボタブ中はデイリー時間を止め、クイズタブへ戻ると既存どおり終了する', () => {
    const h = createHarness();
    h.app.daily.startDailyChallenge();
    assert.equal(h.intervals.size, 1);
    h.app.ui.switchTab('lab');
    assert.equal(h.intervals.size, 0);
    h.visibility(true); h.visibility(false);
    assert.equal(h.intervals.size, 0);
    h.app.ui.switchTab('game');
    assert.equal(h.intervals.size, 0);
});

test('解答前の「次へ」と終了後の採点・選択を無視する', () => {
    const h = createHarness();
    h.app.daily.startDailyChallenge();
    h.app.quiz.nextQuiz();
    assert.equal(h.intervals.size, 1);
    h.app.quiz.exitGame();
    h.chooseAnswer();
    h.app.quiz.checkQuiz();
    assert.equal(h.intervals.size, 0);
    assert.equal(h.sounds.filter(sound => sound === 'success').length, 0);
});

test('存在しないコースを選んでも起動済み画面を壊さない', () => {
    const h = createHarness();
    assert.doesNotThrow(() => h.app.quiz.startCourse('missing'));
});


test('正解のスコアを即時表示し、次の問題数も更新する', () => {
    const h = createHarness();
    h.app.helpers.shuffle = entries => [...entries, ...entries];
    h.app.quiz.startGame('combine');
    h.app.quiz.startCourse('basic');
    assert.equal(h.elements['quiz-num'].textContent, '1');
    h.chooseAnswer(); h.app.quiz.checkQuiz();
    assert.equal(h.elements['quiz-score'].textContent, 100);
    h.app.quiz.nextQuiz();
    assert.equal(h.elements['quiz-num'].textContent, '2');
    h.chooseAnswer(); h.app.quiz.checkQuiz();
    assert.equal(h.elements['quiz-score'].textContent, 210);
});

test('終了前でも間違えた漢字をにがてノートへ保存する', () => {
    const h = createHarness();
    h.app.daily.startDailyChallenge();
    h.app.ui.selectQuizPart('left', '日', {});
    h.app.ui.selectQuizPart('right', '木', {});
    h.app.quiz.checkQuiz();
    assert.deepEqual(h.getSaved().wrongKanjiList, ['林']);
});
