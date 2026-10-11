const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 実音ではなく、音声APIの成功・失敗と入力/表示の独立性を検証する。
const html = fs.readFileSync(process.env.PIANO_TEST_HTML || path.join(__dirname, '../piano.html'), 'utf8');
const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
const settle = () => new Promise(resolve => setImmediate(resolve));
function runtime(mode = 'normal') {
    const timers = []; const spoken = []; const bodyHandlers = {}; const calls = [];
    let created = 0; let audio; const resumes = [];
    function AudioMock() {
        created++;
        if (mode === 'constructor') throw Error('デバイス利用不可');
        audio = this;
        this.state = ['reject', 'deferred', 'resume-throw'].includes(mode) ? 'suspended' : 'running';
        this.currentTime = 4; this.destination = {};
        this.resume = () => {
            if (mode === 'resume-throw') throw Error('再開不可');
            if (mode === 'reject') return Promise.reject(Error('再開拒否'));
            return new Promise(resolve => { resumes.push(() => { this.state = 'running'; resolve(); }); });
        };
        this.createOscillator = () => {
            if (mode === 'node') throw Error('ノード作成不可');
            const osc = { frequency: { setValueAtTime: (...args) => calls.push(['frequency', ...args]) },
                connect() {}, start: () => calls.push(['start', osc.type]), stop: time => calls.push(['stop', time]) };
            return osc;
        };
        this.createGain = () => ({ connect() {}, gain: {
            setValueAtTime: (...args) => calls.push(['gain', ...args]),
            linearRampToValueAtTime: (...args) => calls.push(['attack', ...args]),
            exponentialRampToValueAtTime: (...args) => calls.push(['release', ...args])
        } });
    }
    const keys = ['C4', 'D4', 'C5'].map((note, index) => {
        const classes = new Set(); const handlers = {};
        return { classes, handlers, classList: { contains: n => classes.has(n), add: n => classes.add(n), remove: n => classes.delete(n) },
            getAttribute: n => n === 'data-note' ? note : ['ド', 'レ', 'ド'][index],
            addEventListener: (n, fn) => handlers[n] = fn,
            getBoundingClientRect: () => ({ left: index * 20, top: 0, width: 20 }) };
    });
    const message = { innerText: '' }; const effects = [];
    const soundHandlers = {}; const soundButton = { addEventListener: (n, fn) => soundHandlers[n] = fn };
    const stage = { getBoundingClientRect: () => ({ left: 0, top: 0 }), appendChild: note => effects.push(note) };
    const document = { body: { addEventListener: (n, fn) => bodyHandlers[n] = fn },
        querySelectorAll: () => keys, getElementById: id => id === 'message' ? message : id === 'sound-toggle' ? soundButton : stage,
        createElement: () => ({ style: {}, remove() {} }) };
    const context = vm.createContext({ document, console: { warn() {} },
        setTimeout: (fn, delay) => timers.push({ fn, delay }),
        EduSound: { isOn: true, volume: 0.2, speak: (...args) => spoken.push(args) } });
    context.window = { AudioContext: mode === 'missing' ? undefined : AudioMock };
    vm.runInContext(source, context); context.window.onload();
    return { context, keys, message, effects, spoken, calls, bodyHandlers,
        run: s => vm.runInContext(s, context), created: () => created,
        resume: () => resumes.splice(0).forEach(fn => fn()),
        toggle: () => { context.EduSound.isOn = !context.EduSound.isOn; soundHandlers.click(); },
        instrument: type => vm.runInContext(`changeInstrument('${type}', '🎵', {})`, context),
        close: () => audio.state = 'closed',
        click: (i = 0) => keys[i].handlers.click({ detail: 0 }),
        release: () => timers.splice(0).filter(t => t.delay === 120).forEach(t => t.fn()) };
}

for (const mode of ['missing', 'constructor', 'reject', 'resume-throw', 'node']) {
    test(`ピアノの${mode}時も表示と連続キーボード入力・解除を維持`, async () => {
        const r = runtime(mode);
        assert.doesNotThrow(() => r.click());
        await settle();
        assert.equal(r.message.innerText, 'ド！');
        assert.equal(r.effects.length, 1);
        r.release(); assert(!r.keys[0].classes.has('key-active'));
        r.click(1); await settle();
        assert.equal(r.message.innerText, 'レ！');
        r.release(); assert(!r.keys[1].classes.has('key-active'));
        assert.equal(r.calls.filter(c => c[0] === 'start').length, 0);
        await r.bodyHandlers.pointerdown();
    });
}
for (const mode of ['missing', 'constructor']) {
    test(`Web Audio ${mode}でも犬と猫の声・ピッチを維持`, async () => {
        const r = runtime(mode);
        r.run("currentInstrument = 'dog'"); r.click(); r.release();
        r.run("currentInstrument = 'cat'"); r.click(2); r.release();
        await settle();
        assert.deepEqual(r.spoken, [['ワン！', 1.5, 0.8], ['ニャン！', 1.5, 1.6]]);
        assert.equal(r.created(), 0);
    });
}
test('通常の音程・波形・音量・重複防止と再入力を維持', async () => {
    const r = runtime(); r.click(); r.click(); await settle();
    assert.deepEqual(r.calls, [['frequency', 261.63, 4], ['gain', 0, 4], ['attack', 0.1, 4.05], ['release', 0.001, 5.5], ['start', 'triangle'], ['stop', 5.5]]);
    r.release(); r.click(2); await settle();
    assert.equal(r.calls.filter(c => c[0] === 'start').length, 2);
    assert(r.calls.some(c => c[0] === 'frequency' && c[1] === 523.25));
    r.keys[2].handlers.pointerup(); assert(!r.keys[2].classes.has('key-active'));
});
test('再開成功時は保持中の鍵盤を再生', async () => {
    const r = runtime('deferred'); r.click(); r.resume(); await settle();
    assert.equal(r.calls.filter(c => c[0] === 'start').length, 1);
});
for (const action of ['mute', 'release', 'cancel', 'instrument']) {
    test(`再開待ち中の${action}後に遅れて発音しない`, async () => {
        const r = runtime('deferred'); r.click();
        if (action === 'mute') r.context.EduSound.isOn = false;
        if (action === 'release') r.release();
        if (action === 'cancel') r.keys[0].handlers.pointercancel();
        if (action === 'instrument') r.instrument('dog');
        r.resume(); await settle();
        assert.equal(r.calls.filter(c => c[0] === 'start').length, 0);
    });
}
test('消音中は音声を初期化せず表示と解除を維持', async () => {
    const r = runtime(); r.context.EduSound.isOn = false;
    r.click(); r.release(); r.run("currentInstrument = 'dog'"); r.click(); await settle();
    assert.equal(r.created(), 0); assert.deepEqual(r.spoken, []);
    assert.equal(r.message.innerText, 'ド！');
});
test('ポインターの解除・キャンセル・非左クリックとclick重複防止を維持', async () => {
    const r = runtime(); const h = r.keys[0].handlers;
    h.pointerdown({ pointerType: 'mouse', button: 2 }); assert.equal(r.effects.length, 0);
    h.pointerdown({ pointerType: 'touch', button: 0 }); h.click({ detail: 1 }); await settle();
    assert.equal(r.effects.length, 1); h.pointercancel(); assert(!r.keys[0].classes.has('key-active'));
    r.bodyHandlers.pointercancel(); r.keys[1].handlers.pointerenter({});
    assert.equal(r.effects.length, 1);
});
test('閉じられたコンテキストを次の入力で作り直す', async () => {
    const r = runtime(); r.click(); await settle(); r.release(); r.close(); r.click(); await settle();
    assert.equal(r.created(), 2); assert.equal(r.calls.filter(c => c[0] === 'start').length, 2);
});

for (const action of ['mute-unmute', 'instrument-roundtrip']) {
    test(`再開待ち中の${action}でも古い入力を復活させない`, async () => {
        const r = runtime('deferred'); r.click();
        if (action === 'mute-unmute') { r.toggle(); r.toggle(); }
        else { r.instrument('dog'); r.instrument('piano'); }
        r.resume(); await settle();
        assert.equal(r.calls.filter(c => c[0] === 'start').length, 0);
    });
}
test('複数鍵の再開待ちではキャンセルされた音だけを除く', async () => {
    const r = runtime('deferred'); r.click(); r.click(1);
    r.keys[0].handlers.pointercancel(); r.resume(); await settle();
    assert.deepEqual(r.calls.filter(c => c[0] === 'frequency'), [['frequency', 293.66, 4]]);
});
test('再開待ちの古い同じ鍵盤を解除し再入力しても一度だけ鳴る', async () => {
    const r = runtime('deferred'); r.click(); r.release(); r.click();
    r.resume(); await settle();
    assert.equal(r.calls.filter(c => c[0] === 'start').length, 1);
});
