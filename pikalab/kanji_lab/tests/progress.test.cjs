const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeProgress } = require('../js/progress.js');
const catalog = [{ k: '林' }, { k: '志' }];
const titles = ['合体ビギナー', '合体マニア'];
const normalize = value => normalizeProgress(value, catalog, titles);

test('保存データの型が壊れていても、正常な収集は保持して起動できる', () => {
    const result = normalize({ collection: ['林', '林', '不明', null], dailyClearHistory: {}, dailyBestTimes: { '2026-10-03': 'bad' }, quizScores: [], holoTickets: -1, wrongKanjiList: 'bad', theme: 'broken theme', configAssist: 'false' });
    assert.deepEqual(result.collection, ['林']);
    assert.deepEqual(result.dailyClearHistory, []);
    assert.deepEqual(result.dailyBestTimes, {});
    assert.deepEqual(result.wrongKanjiList, []);
    assert.equal(result.holoTickets, 0);
    assert.equal(result.theme, 'default');
    assert.equal(result.configAssist, true);
});

test('正しい保存値は意味を変えずに往復する', () => {
    const saved = { collection: ['志', '林'], quizScores: { combine_basic: 1450, decompose_all: 0 }, quizStars: { combine_basic: 3 }, theme: 'sakura', configAssist: false, configFurigana: true, dailyClearHistory: ['2026-10-03'], dailyBestTimes: { '2026-10-03': 12.37 }, shiningKanji: ['林'], holoTickets: 2, unlockedTitles: titles, unlockedThemes: ['default', 'sakura'], isMuted: true, selectedTitle: '合体マニア', wrongKanjiList: ['志'], lastRewardedStreakDate: '2026-10-03' };
    assert.deepEqual(normalize(saved), saved);
});

test('不正日付・数値・HTML・未知のキーを保存境界で除く', () => {
    const result = normalize({ dailyClearHistory: ['2026-02-29', '2024-02-29', 'bad'], dailyBestTimes: { '2024-02-29': 0, '2026-10-03': Infinity }, quizScores: { combine_basic: '<img>', decompose_all: 3.5, unknown: 10 }, quizStars: { combine_basic: 4 }, selectedTitle: '<img>', unlockedTitles: ['<img>'] });
    assert.deepEqual(result.dailyClearHistory, ['2024-02-29']);
    assert.deepEqual(result.dailyBestTimes, { '2024-02-29': 0 });
    assert.deepEqual(result.quizScores, {});
    assert.deepEqual(result.quizStars, {});
    assert.equal(result.selectedTitle, '合体ビギナー');
});

test('JSONの基本型・配列・nullは安全な初期値へ戻る', () => {
    for (const value of [null, false, 12, 'text', [], { holoTickets: Number.MAX_SAFE_INTEGER + 1 }]) {
        assert.deepEqual(normalize(value).collection, []);
        assert.equal(normalize(value).holoTickets, 0);
    }
});
