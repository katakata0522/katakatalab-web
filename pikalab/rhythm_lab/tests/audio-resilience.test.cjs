const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'script.js'), 'utf8');

function functionSlice(name, nextName) {
    const start = source.indexOf(`function ${name}`);
    assert.notEqual(start, -1, `${name} が存在する`);
    const end = nextName ? source.indexOf(`function ${nextName}`, start + 1) : source.length;
    assert.notEqual(end, -1, `${nextName} が存在する`);
    return source.slice(start, end);
}

test('リズム編集は音声初期化の完了を待たずに反映する', () => {
    const toggle = functionSlice('toggleNote', 'renderCell');
    assert.doesNotMatch(toggle, /async\s+function\s+toggleNote/);
    assert.doesNotMatch(toggle, /await\s+initAudio/);
    assert.match(toggle, /grid\[type\]\[idx\]\s*=\s*grid\[type\]\[idx\]\s*\?\s*0\s*:\s*1/);
    assert.match(toggle, /void\s+playOneShot\(type,/);
    assert.ok(toggle.indexOf('grid[type][idx] =') < toggle.indexOf('playOneShot(type,'), '編集を先に反映してから任意効果音を鳴らす');
});

test('プリセット読み込みと保存成功も音声初期化で操作をブロックしない', () => {
    const preset = functionSlice('loadPreset', 'loadUserPreset');
    const userPreset = functionSlice('loadUserPreset', 'applyGrid');
    const save = functionSlice('saveUserPreset', 'deleteUserPreset');

    for (const body of [preset, userPreset, save]) {
        assert.doesNotMatch(body, /await\s+initAudio/);
    }
    assert.match(preset, /void\s+playOneShot\('hihat'\)/);
    assert.match(userPreset, /void\s+playOneShot\('hihat'\)/);
    assert.match(save, /void\s+playOneShot\('clap'\)/);
});

test('音声初期化は一度の失敗で永久停止せず再試行できる', () => {
    assert.doesNotMatch(source, /audioInitFailed/);
    assert.match(source, /let\s+audioInitPromise\s*=\s*null/);
    assert.match(source, /if\s*\(audioInitPromise\)\s*return\s+audioInitPromise/);
    assert.match(source, /finally\s*\{\s*audioInitPromise\s*=\s*null/);
    assert.match(source, /disposeAudioGraph\(\)/);
});

test('音声出力はLimiterを最終段に置く', () => {
    assert.match(source, /new\s+Tone\.Limiter\(-1\)\.toDestination\(\)/);
    assert.match(source, /new\s+Tone\.Gain\(volume\s*\/\s*100\)\.connect\(limiter\)/);
});

test('Rhythm Labは自分で登録したTransportイベントだけを解除する', () => {
    assert.match(source, /transportEventId\s*=\s*Tone\.Transport\.scheduleRepeat\(playStep,\s*'16n'\)/);
    assert.match(source, /Tone\.Transport\.clear\(transportEventId\)/);
    assert.doesNotMatch(source, /Tone\.Transport\.cancel\(/);
});

