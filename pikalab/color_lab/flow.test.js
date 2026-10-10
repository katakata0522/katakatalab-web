const test = require('node:test');
const assert = require('node:assert/strict');

const {
    calculateColorScore,
    createGameProgress,
    applyRoundScore,
    advanceLevel
} = require('./logic.js');

test('flow: 2レベル進行で合計スコアと完了状態が正しく更新される', () => {
    let progress = createGameProgress(2);

    const round1 = calculateColorScore([255, 0, 0], [255, 0, 0]);
    progress = applyRoundScore(progress, round1);
    progress = advanceLevel(progress);

    const round2 = calculateColorScore([0, 0, 0], [255, 255, 255]);
    progress = applyRoundScore(progress, round2);
    progress = advanceLevel(progress);

    assert.equal(progress.completed, true);
    assert.equal(progress.currentLevelIndex, 2);
    assert.equal(progress.totalScore, round1 + round2);
});
