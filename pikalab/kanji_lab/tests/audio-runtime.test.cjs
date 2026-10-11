const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createHarness(profile = null, state = 'running') {
    let stored = profile === null ? null : JSON.stringify(profile);
    let reads = 0;
    let parses = 0;
    const gains = [];
    const oscillators = [];
    const warnings = [];
    const audioContext = {
        state, currentTime: 12, destination: {},
        resume() { this.state = 'running'; return Promise.resolve(); },
        createGain() {
            const node = { disconnected: 0, gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() { this.disconnected++; } };
            gains.push(node); return node;
        },
        createOscillator() {
            const node = { frequency: {}, disconnected: 0, connect() {}, start() {}, stop() {}, disconnect() { this.disconnected++; } };
            oscillators.push(node); return node;
        }
    };
    const context = {
        window: { AudioContext: function () { return audioContext; } },
        document: {
            querySelector() { return null; },
            createElement() { return { dataset: {}, setAttribute() {}, addEventListener() {} }; },
            head: { appendChild() {} }
        },
        localStorage: { getItem() { reads++; return stored; } },
        JSON: { parse(text) { parses++; return JSON.parse(text); } },
        console: { warn(...args) { warnings.push(args); } }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/audio.js'), 'utf8'), context);
    return {
        audio: context.window.KanjiLabAudio, gains, oscillators, warnings, audioContext,
        setProfile(value) { stored = value === null ? null : JSON.stringify(value); },
        setRawProfile(value) { stored = value; },
        get reads() { return reads; }, get parses() { return parses; }
    };
}

test('共有ミュートの解除を次の再生で読み直し、ラボの選択へ残さない', () => {
    const h = createHarness({ isMuted: true, volumeDb: 0 });
    h.audio.playSound('select');
    assert.equal(h.oscillators.length, 0);
    assert.equal(h.audio.getMuted(), false);
    h.setProfile({ isMuted: false, volumeDb: 0 });
    h.audio.playSound('select');
    assert.equal(h.oscillators.length, 1);
    assert.equal(h.audio.getMuted(), false);
});

test('ラボのミュート選択は共有設定の変更に上書きされない', () => {
    const h = createHarness({ isMuted: false, volumeDb: 0 });
    h.audio.setMuted(true); h.audio.playSound('select');
    assert.equal(h.oscillators.length, 0);
    h.setProfile({ isMuted: true, volumeDb: 0 });
    h.audio.playSound('select');
    assert.equal(h.audio.getMuted(), true);
    assert.equal(h.audio.toggleMute(), false);
    h.audio.playSound('select');
    assert.equal(h.audio.getMuted(), false);
    assert.equal(h.oscillators.length, 0);
    h.setProfile(null); h.audio.playSound('select');
    assert.equal(h.oscillators.length, 1);
});

test('共有音量の範囲と型を検証し、不正なゲインを渡さない', () => {
    for (const volumeDb of [-40, -500]) {
        const h = createHarness({ volumeDb }); h.audio.playSound('select');
        assert.equal(h.oscillators.length, 0);
    }
    for (const volumeDb of [0, 50]) {
        const h = createHarness({ volumeDb }); h.audio.playSound('select');
        assert.equal(h.gains[0].gain.value, 0.35);
    }
    for (const volumeDb of [null, 'loud', '0', {}, undefined]) {
        const h = createHarness({ volumeDb }); h.audio.playSound('select');
        assert.equal(h.gains[0].gain.value, 0.35 * Math.pow(10, -20 / 40));
    }
});

test('同じ共有設定は再パースせず、削除・破損からの復旧を検知する', () => {
    const h = createHarness({ isMuted: false, volumeDb: 0 });
    h.audio.playSound('select'); h.audio.playSound('select');
    assert.equal(h.reads, 2);
    assert.equal(h.parses, 1);
    h.setRawProfile('{broken');
    assert.doesNotThrow(() => h.audio.playSound('select'));
    h.setProfile({ isMuted: true, volumeDb: 0 });
    const count = h.oscillators.length;
    h.audio.playSound('select'); assert.equal(h.oscillators.length, count);
    h.setProfile(null); h.audio.playSound('select'); assert.equal(h.oscillators.length, count + 1);
});

test('音符の終了で接続を切り、和音の最後にマスター接続も切る', () => {
    const h = createHarness(); h.audio.playSound('success');
    assert.equal(h.oscillators.length, 4);
    h.oscillators.slice(0, 3).forEach(node => node.onended());
    assert.equal(h.gains[0].disconnected, 0);
    h.oscillators[3].onended();
    assert.ok(h.oscillators.every(node => node.disconnected === 1 && node.onended === null));
    assert.ok(h.gains.every(node => node.disconnected === 1));
});

test('共有設定が一時的に読めなくても、直前のミュートを解除しない', () => {
    const h = createHarness({ isMuted: true, volumeDb: 0 });
    h.audio.playSound('select');
    h.setRawProfile('{broken'); h.audio.playSound('select');
    assert.equal(h.oscillators.length, 0);
    h.setProfile({ isMuted: false, volumeDb: 0 }); h.audio.playSound('select');
    assert.equal(h.oscillators.length, 1);
});

test('AudioContext の再開失敗を未処理 Promise 拒否にしない', async () => {
    const h = createHarness(null, 'suspended');
    h.audioContext.resume = () => Promise.reject(new Error('blocked'));
    h.audio.playSound('select');
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(h.warnings.some(args => args[0] === 'Audio resume error:'));
});
