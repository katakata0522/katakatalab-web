'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../cases.js');

test('3つの事件と各3ステップに不整合がない', () => {
  assert.deepEqual(data.validateCases(data.CASES), []);
  assert.equal(data.CASES.length, 3);
  assert.equal(new Set(data.CASES.map(c => c.id)).size, 3);
});

test('すべての選択肢は1つだけ正解し、誤答にも固有の理由がある', () => {
  for (const item of data.CASES) {
    for (const [index, step] of item.steps.entries()) {
      assert.equal(step.options.filter(option => data.judgeAnswer(item, index, option.id).correct).length, 1);
      for (const option of step.options) {
        const result = data.judgeAnswer(item, index, option.id);
        assert.equal(result.valid, true);
        assert.ok(result.feedback.length >= 15, `${item.id} ${step.id} ${option.id}`);
      }
    }
  }
});

test('目的に合わせて1条件だけ変え、他をそろえる', () => {
  for (const item of data.CASES) {
    const different = item.observations.filter(obs => obs.a !== obs.b);
    assert.equal(different.length, 2, item.id);
    assert.equal(different.filter(obs => obs.kind === 'changed').length, 1);
    assert.equal(different.filter(obs => obs.kind === 'mistake').length, 1);
    const repaired = item.observations.map(obs => ({ ...obs, b: obs.repairedB || obs.b }));
    assert.deepEqual(repaired.filter(obs => obs.a !== obs.b).map(obs => obs.kind), ['changed']);
  }
});

test('植物の水量をそろえて高さを測る', () => {
  const item = data.getCase('plant');
  assert.equal(item.steps[0].answer, 'water');
  assert.equal(item.steps[1].answer, '100');
  assert.equal(item.steps[2].answer, 'height');
  assert.equal(item.observations.find(obs => obs.id === 'water').repairedB, '100mL');
});

test('砂糖の水温以外は条件をそろえ時間を測る', () => {
  const item = data.getCase('sugar');
  assert.equal(item.steps[0].answer, 'stirring');
  assert.equal(item.steps[1].answer, '10');
  assert.equal(item.steps[2].answer, 'duration');
});

test('ふりこは糸の長さだけ変え、10往復にかかった時間を測る', () => {
  const item = data.getCase('pendulum');
  assert.equal(item.steps[0].answer, 'weight');
  assert.equal(item.steps[1].answer, '50');
  assert.equal(item.steps[2].answer, 'time');
});

test('誤ったIDとステップには不正判定を返す', () => {
  assert.equal(data.getCase('missing'), null);
  const item = data.getCase('plant');
  assert.equal(data.judgeAnswer(item, 0, '__prototype__').valid, false);
  assert.equal(data.judgeAnswer(item, 10, 'water').valid, false);
  assert.equal(data.judgeAnswer(item, 0, null).valid, false);
});

test('重複問題の検証に失敗する', () => {
  const clones = [data.CASES[0], data.CASES[0]];
  assert.ok(data.validateCases(clones).length > 0);
});
