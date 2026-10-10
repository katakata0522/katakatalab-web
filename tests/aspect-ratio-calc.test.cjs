const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const logic = require('../aspect-ratio-calc/script.js');

test('比率固定時の片辺計算は16:9を正しく保つ', () => {
  assert.equal(logic.dimensionFromWidth(1200, 16, 9), 675);
  assert.equal(logic.dimensionFromHeight(1080, 16, 9), 1920);
});

test('幅と高さの既知値から比率を独立して逆算できる', () => {
  assert.deepEqual(logic.ratioFromDimensions(1200, 1000), { w: 6, h: 5 });
  assert.deepEqual(logic.ratioFromDimensions(1080, 1350), { w: 4, h: 5 });
  assert.equal(logic.ratioFromDimensions(0, 1080), null);
});

test('実用プリセットに4:5と3:2が含まれる', () => {
  assert.ok(logic.PRACTICAL_PRESETS.some((preset) => preset.w === 4 && preset.h === 5));
  assert.ok(logic.PRACTICAL_PRESETS.some((preset) => preset.w === 3 && preset.h === 2));
});

test('黄金比と白銀比の表示方向が数値と一致する', () => {
  assert.equal(logic.findStandardRatio(1.618, 1)?.display, '1.618:1 (黄金比)');
  assert.equal(logic.findStandardRatio(1, 1.618)?.display, '1:1.618 (黄金比)');
  assert.equal(logic.findStandardRatio(1.414, 1)?.display, '1.414:1 (白銀比)');
  assert.equal(logic.findStandardRatio(1, 1.414)?.display, '1:1.414 (白銀比)');
});

test('近似判定は候補比率に対する相対誤差2.5%で判定する', () => {
  assert.equal(logic.ADVISOR_RELATIVE_TOLERANCE, 0.025);
  assert.equal(logic.findStandardRatio(16 * 1.02, 9)?.display, '16:9');
  assert.notEqual(logic.findStandardRatio(16 * 1.03, 9)?.display, '16:9');
});

test('比率固定ON/OFFの操作UIをスクリプトが提供する', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'aspect-ratio-calc', 'script.js'), 'utf8');
  assert.match(source, /ratioLockBtn/);
  assert.match(source, /比率固定 ON/);
  assert.match(source, /比率固定 OFF/);
  assert.match(source, /入力サイズから比率を逆算/);
});
