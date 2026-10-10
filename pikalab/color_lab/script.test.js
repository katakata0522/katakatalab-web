const test = require('node:test');
const assert = require('node:assert/strict');

const {
    rgbToHex,
    getTextColor,
    coerceRgbValue,
    calculateColorScore,
    getResultPresentation,
    formatRgbLabel,
    createGameProgress,
    applyRoundScore,
    advanceLevel
} = require('./script.js');

test('rgbToHex converts rgb to uppercase hex', () => {
    assert.equal(rgbToHex(255, 165, 0), '#FFA500');
});

test('getTextColor returns dark text for bright background', () => {
    assert.equal(getTextColor(250, 250, 250), '#1e293b');
});

test('coerceRgbValue clamps values into 0-255 range', () => {
    assert.equal(coerceRgbValue(-10, 128), 0);
    assert.equal(coerceRgbValue(300, 128), 255);
    assert.equal(coerceRgbValue('45', 128), 45);
});

test('coerceRgbValue falls back when value is invalid', () => {
    assert.equal(coerceRgbValue('abc', 128), 128);
    assert.equal(coerceRgbValue(undefined, 64), 64);
});

test('calculateColorScore returns 100 for exact match', () => {
    assert.equal(calculateColorScore([255, 0, 0], [255, 0, 0]), 100);
});

test('calculateColorScore returns 0 or above for far colors', () => {
    const score = calculateColorScore([0, 0, 0], [255, 255, 255]);
    assert.equal(score, 0);
});

test('calculateColorScore guards invalid payloads', () => {
    assert.equal(calculateColorScore([255, 0], [255, 0, 0]), 0);
    assert.equal(calculateColorScore(null, [255, 0, 0]), 0);
});

test('formatRgbLabel normalizes and formats RGB values', () => {
    assert.equal(formatRgbLabel([256, -1, '10']), 'R:255 G:0 B:10');
});

test('getResultPresentation returns expected title by score', () => {
    assert.equal(getResultPresentation(96).title, 'てんさい！');
    assert.equal(getResultPresentation(80).title, 'すごい！');
    assert.equal(getResultPresentation(79).title, 'おしい！');
});

test('game progress helpers advance and complete correctly', () => {
    let progress = createGameProgress(2);
    progress = applyRoundScore(progress, 30);
    assert.equal(progress.totalScore, 30);
    progress = advanceLevel(progress);
    assert.equal(progress.currentLevelIndex, 1);
    assert.equal(progress.completed, false);
    progress = advanceLevel(progress);
    assert.equal(progress.currentLevelIndex, 2);
    assert.equal(progress.completed, true);
});
