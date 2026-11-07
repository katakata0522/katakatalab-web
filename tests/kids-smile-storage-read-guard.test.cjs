'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');

// Exercise the functions extracted from the production script, not a second implementation.
const source = fs.readFileSync(path.join(__dirname, '../lab-tools/kids-smile-land/app.js'), 'utf8');
function extract(name) {
    const start = source.indexOf('    function ' + name + '(');
    assert.ok(start >= 0, name + ' exists');
    const end = source.indexOf('\n    }', start);
    assert.ok(end >= 0, name + ' body ends');
    return source.slice(start, end + 6);
}
const functions = ['readStoredOption', 'readStoredNumber', 'readStoredText', 'saveSettings', 'saveStickers']
    .map(extract).join('\n');

const originalSettings = [
    ['smile_selected_bg', 'space'],
    ['smile_level', 'hard'],
    ['smile_timer_limit', '30'],
    ['smile_voice_volume', '0.4'],
    ['smile_synth_volume', '0.7'],
    ['smile_sleep_reason', 'meal'],
    ['smile_kids_name', 'こどものなまえ'],
];
function exercise(readFailure) {
    const data = new Map(originalSettings);
    const before = [...data.entries()];
    const writes = [];
    const toasts = [];
    const errors = [];
    const context = {
        localStorage: {
            getItem(key) {
                if (key === readFailure) throw new Error('Simulated read denial');
                return data.has(key) ? data.get(key) : null;
            },
            setItem(key, value) {
                writes.push(key);
                data.set(key, String(value));
            },
        },
        console: { error: (...args) => errors.push(args[0]) },
        showToast: message => toasts.push(message),
        updateStickerUI() {},
    };
    vm.runInNewContext(`
        let storageReadBlocked = false;
        ${functions}
        let smileLevel = readStoredOption('smile_level', ['easy','normal','hard'], 'easy');
        let smileTimerLimit = readStoredNumber('smile_timer_limit', 0, 0, 45, [0,5,15,30,45]);
        let smileVoiceVolume = readStoredNumber('smile_voice_volume', 1, 0, 1);
        let smileSynthVolume = readStoredNumber('smile_synth_volume', 1, 0, 1);
        let smileSleepReason = readStoredOption('smile_sleep_reason', ['eye','meal','sleep'], 'eye');
        let smileKidsName = readStoredText('smile_kids_name', 'がんばったおともだち', 30);
        let selectedBg = readStoredOption('smile_selected_bg', ['grass','space','sea'], 'grass');
        let myStickers = ['star'], placedStickers = [], smileStats = {plays: {}}, smileMissions = {};
        saveSettings();
        saveStickers();
        // Recovery of the underlying browser storage must not silently unblock this session.
        saveSettings();
        globalThis.readBlocked = storageReadBlocked;
    `, context);
    return { data, before, writes, errors, toasts, blocked: context.readBlocked };
}

for (const key of originalSettings.map(([name]) => name)) {
    test('a read exception on ' + key + ' never overwrites any stored value', () => {
        const result = exercise(key);
        assert.equal(result.blocked, true);
        assert.deepEqual(result.writes, [], 'no settings, progress, or stickers written');
        assert.deepEqual([...result.data.entries()], result.before, 'existing bytes remain');
        assert.equal(result.toasts.length, 3, 'all save attempts explain the failure');
        assert.equal(result.errors.length, 4, 'read error and three blocked saves');
    });
}

test('readable settings retain the existing save path', () => {
    const result = exercise(null);
    assert.equal(result.blocked, false);
    assert.equal(result.writes.length, 19, 'two settings saves and one stickers save');
    assert.equal(result.toasts.length, 0);
    assert.equal(result.errors.length, 0);
    assert.equal(result.data.get('smile_level'), 'hard');
    assert.equal(result.data.get('smile_selected_bg'), 'space');
    assert.equal(result.data.get('smile_kids_name'), 'こどものなまえ');
});
