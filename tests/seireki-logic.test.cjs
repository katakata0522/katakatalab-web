const test = require('node:test');
const assert = require('node:assert/strict');
const logic = require('../seireki/seireki-logic.js');

test('履歴書の小学校入学はハローワーク式の生年+7（早生まれは生年-1してから同じ）', () => {
  const regular = logic.resumeTimeline(2000, { earlyBirth: false });
  const early = logic.resumeTimeline(2000, { earlyBirth: true });

  assert.equal(regular.find((item) => item.label === '小学校入学').year, 2007);
  assert.equal(regular.find((item) => item.label === '小学校入学').month, 4);
  assert.equal(regular.find((item) => item.label === '小学校卒業').year, 2013);
  assert.equal(regular.find((item) => item.label === '大学卒業（4年制）').year, 2023);

  assert.equal(early.find((item) => item.label === '小学校入学').year, 2006);
  assert.equal(early.find((item) => item.label === '小学校卒業').year, 2012);
});

test('1月1日から4月1日までを早生まれと判定する', () => {
  assert.equal(logic.isEarlyBirth(1, 1), true);
  assert.equal(logic.isEarlyBirth(4, 1), true);
  assert.equal(logic.isEarlyBirth(4, 2), false);
  assert.equal(logic.isEarlyBirth(12, 31), false);
  assert.equal(logic.isEarlyBirth(null, 1), null);
});

test('和暦入力を西暦に変換できる', () => {
  assert.equal(logic.warekiToWestern('令和', 1), 2019);
  assert.equal(logic.warekiToWestern('令和', 2), 2020);
  assert.equal(logic.warekiToWestern('平成', 12), 2000);
  assert.equal(logic.warekiToWestern('明治', 1), 1868);
});

test('改元年の和暦表示は新旧を併記する', () => {
  assert.equal(logic.warekiDisplay(2019), '平成31年 / 令和元年');
  assert.equal(logic.warekiDisplay(1989), '昭和64年 / 平成元年');
  assert.equal(logic.warekiDisplay(2020), '令和2年');
});

test('今年生まれは満年齢を-1歳にしない', () => {
  const result = logic.describeAge(2026, 2026);
  assert.equal(result.turningAge, 0);
  assert.equal(result.manAge, 0);
});

test('月日があるとき満年齢は誕生日前後で分かれる', () => {
  const before = logic.describeAge(2000, 2026, {
    month: 12,
    day: 31,
    todayMonth: 8,
    todayDay: 18,
  });
  const after = logic.describeAge(2000, 2026, {
    month: 1,
    day: 1,
    todayMonth: 8,
    todayDay: 18,
  });
  assert.equal(before.manAge, 25);
  assert.equal(after.manAge, 26);
});

test('月または日だけ、および存在しない日付では満年齢を出さない', () => {
  const monthOnly = logic.describeAge(2000, 2026, {
    month: 5,
    day: null,
    todayMonth: 8,
    todayDay: 18,
  });
  const invalid = logic.describeAge(2001, 2026, {
    month: 2,
    day: 31,
    todayMonth: 8,
    todayDay: 18,
  });
  assert.equal(monthOnly.turningAge, 26);
  assert.equal(monthOnly.manAge, null);
  assert.equal(invalid.manAge, null);
  assert.equal(logic.isEarlyBirth(2, 31), null);
  assert.equal(logic.isValidCalendarDate(2000, 2, 29), true);
  assert.equal(logic.isValidCalendarDate(2001, 2, 29), false);
});
