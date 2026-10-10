const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeRgbTuple,
    calculateColorScore,
    getResultPresentation,
    createGameProgress,
    applyRoundScore,
    advanceLevel,
    getComplementaryColor,
    blendColors,
    rgbToHsl,
    getColorName,
    applyShinyScoreMultiplier,
    calculateTimeBonus,
    getAward
} = require('./logic.js');

test('normalizeRgbTuple clamps invalid values safely', () => {
    const normalized = normalizeRgbTuple([300, -2, 'abc'], 12);
    assert.deepEqual(normalized, [255, 0, 12]);
});

test('calculateColorScore returns monotonic lower score for distant colors', () => {
    const nearScore = calculateColorScore([255, 0, 0], [245, 0, 0]);
    const farScore = calculateColorScore([255, 0, 0], [0, 255, 255]);
    assert.ok(nearScore > farScore);
});

test('getResultPresentation returns expected class names', () => {
    assert.match(getResultPresentation(100).className, /text-yellow-500/);
    assert.match(getResultPresentation(85).className, /text-green-500/);
    assert.match(getResultPresentation(10).className, /text-slate-500/);
});

test('game progress helper handles invalid score input', () => {
    let progress = createGameProgress(3);
    progress = applyRoundScore(progress, 'abc');
    assert.equal(progress.totalScore, 0);
    progress = applyRoundScore(progress, 45);
    assert.equal(progress.totalScore, 45);
    progress = advanceLevel(progress);
    progress = advanceLevel(progress);
    progress = advanceLevel(progress);
    assert.equal(progress.completed, true);
});

test('getComplementaryColor returns correct opposite RGB values', () => {
    assert.deepEqual(getComplementaryColor(255, 0, 128), [0, 255, 127]);
    assert.deepEqual(getComplementaryColor(0, 255, 0), [255, 0, 255]);
});

test('blendColors calculates exact math average', () => {
    const colorA = { r: 255, g: 0, b: 100 };
    const colorB = { r: 0, g: 255, b: 200 };
    assert.deepEqual(blendColors(colorA, colorB), [128, 128, 150]);
});

test('rgbToHsl converts RGB to correct HSL format', () => {
    assert.equal(rgbToHsl(255, 255, 255), 'HSL(0, 0%, 100%)');
    assert.equal(rgbToHsl(0, 0, 0), 'HSL(0, 0%, 0%)');
    assert.match(rgbToHsl(255, 0, 0), /HSL\(0, 100%, 50%\)/);
});

test('getColorName matches major colors and falls back to custom', () => {
    assert.equal(getColorName(255, 0, 0), 'あか');
    assert.equal(getColorName(183, 128, 128), 'ココアいろ');
    assert.equal(getColorName(255, 221, 225), 'さくらいろ');
    assert.equal(getColorName(128, 128, 0), 'オリーブいろ');
    assert.equal(getColorName(100, 200, 50), 'カスタムカラー'); // 遠いのでフォールバック
});

test('applyShinyScoreMultiplier calculates score multiplication with clamp', () => {
    assert.equal(applyShinyScoreMultiplier(60, true), 90);
    assert.equal(applyShinyScoreMultiplier(80, true), 100); // 120にはならず100でクランプ
    assert.equal(applyShinyScoreMultiplier(60, false), 60);
});

test('calculateTimeBonus returns exact seconds for score bands', () => {
    assert.equal(calculateTimeBonus(98), 7);
    assert.equal(calculateTimeBonus(85), 4);
    assert.equal(calculateTimeBonus(65), 2);
    assert.equal(calculateTimeBonus(40), 0);
});

test('getAward returns medal and title by score', () => {
    assert.equal(getAward(960).medal, 'gold');
    assert.equal(getAward(960).title, 'いろのまじゅつし');
    assert.equal(getAward(850).medal, 'silver');
    assert.equal(getAward(750).medal, 'bronze');
    assert.equal(getAward(500).medal, 'none');
});

