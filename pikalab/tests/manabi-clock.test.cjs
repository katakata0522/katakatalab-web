const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const { shiftClockByFiveMinutes } = require(path.join(projectRoot, 'manabi_land', 'script.js'));

test('Manabi Land: 5分操作で時を正しく繰り上げ・繰り下げる', () => {
    assert.deepEqual(shiftClockByFiveMinutes(11, 55, 'forward'), { hour: 12, minute: 0 });
    assert.deepEqual(shiftClockByFiveMinutes(12, 55, 'forward'), { hour: 1, minute: 0 });
    assert.deepEqual(shiftClockByFiveMinutes(12, 0, 'backward'), { hour: 11, minute: 55 });
    assert.deepEqual(shiftClockByFiveMinutes(1, 0, 'backward'), { hour: 12, minute: 55 });
});

test('Manabi Land: 不正な時刻入力も12時間表記へ正規化する', () => {
    assert.deepEqual(shiftClockByFiveMinutes('invalid', 'invalid', 'forward'), { hour: 12, minute: 5 });
    assert.deepEqual(shiftClockByFiveMinutes(25, 125, 'backward'), { hour: 1, minute: 0 });
});
