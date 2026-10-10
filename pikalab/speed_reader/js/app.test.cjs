const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeHistoryData,
    createChunkDataFromSegments,
    calculateEffectiveWpm
} = require('./app.js');

test('normalizeHistoryData: 保存値の型が壊れていても安全な初期値へ戻す', () => {
    const result = normalizeHistoryData({
        readCount: '5',
        categoryCounts: 1,
        dailyHistory: null,
        unlockedBadges: {}
    });

    assert.equal(result.readCount, 5);
    assert.deepEqual(result.categoryCounts, {
        'low-elem': 0,
        'high-elem': 0,
        'junior': 0,
        high: 0
    });
    assert.deepEqual(result.dailyHistory, {});
    assert.deepEqual(result.unlockedBadges, []);
});

test('normalizeHistoryData: 正常な履歴と既知バッジは維持する', () => {
    const result = normalizeHistoryData({
        readCount: 3,
        maxWpm: 420,
        totalWords: 900,
        totalDuration: 120,
        categoryCounts: { 'low-elem': 2, 'high-elem': 1, junior: 0, high: 0 },
        customCount: 1,
        dailyHistory: { '2026-07-15': 2 },
        unlockedBadges: ['first_read']
    });

    assert.equal(result.maxWpm, 420);
    assert.equal(result.categoryCounts['low-elem'], 2);
    assert.deepEqual(result.unlockedBadges, ['first_read']);
});

test('createChunkDataFromSegments: 2語チャンクでも実際の語数を保持する', () => {
    const result = createChunkDataFromSegments(
        ['one', 'two', 'three', 'four', 'five'],
        2
    );

    assert.deepEqual(result.chunks, ['one two', 'three four', 'five']);
    assert.deepEqual(result.chunkWordCounts, [2, 2, 1]);
    assert.equal(result.totalWordCount, 5);
});

test('createChunkDataFromSegments: 不正な要素を語数へ含めない', () => {
    const result = createChunkDataFromSegments(
        ['one', '', null, 'two', '   ', 'three'],
        3
    );

    assert.deepEqual(result.chunks, ['one two three']);
    assert.deepEqual(result.chunkWordCounts, [3]);
    assert.equal(result.totalWordCount, 3);
});

test('calculateEffectiveWpm: チャンク数ではなく読んだ実語数で算出する', () => {
    assert.equal(calculateEffectiveWpm(6, 2), 180);
    assert.equal(calculateEffectiveWpm(5, 60), 5);
    assert.equal(calculateEffectiveWpm(-1, 60), 0);
    assert.equal(calculateEffectiveWpm(5, 0), 0);
});
