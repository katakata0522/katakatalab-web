const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 基準版にも同じ動作テストを適用できる。偏った乱数のテストはVM側で時間制限する。
const scriptPath = process.env.MANABI_RUNTIME_SCRIPT || path.join(__dirname, '..', 'script.js');
const source = fs.readFileSync(scriptPath, 'utf8');
const PROFILE_KEY = 'wonder_school_profile_v2';

class EventTarget {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, fn, options = {}) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        const entries = this.listeners.get(type);
        if (!entries.some(entry => entry.fn === fn)) entries.push({ fn, once: !!options.once });
    }
    removeEventListener(type, fn) {
        this.listeners.set(type, (this.listeners.get(type) || []).filter(entry => entry.fn !== fn));
    }
    listenerCount(type) { return (this.listeners.get(type) || []).length; }
    dispatchEvent(event) {
        if (!event.target) event.target = this;
        event.currentTarget = this;
        if (!event.preventDefault) event.preventDefault = function () { this.defaultPrevented = true; };
        if (!event.stopPropagation) event.stopPropagation = function () { this.propagationStopped = true; };
        for (const entry of [...(this.listeners.get(event.type) || [])]) {
            if (!(this.listeners.get(event.type) || []).includes(entry)) continue;
            if (entry.once) this.removeEventListener(event.type, entry.fn);
            entry.fn.call(this, event);
        }
        if (typeof this[`on${event.type}`] === 'function') this[`on${event.type}`](event);
        if (event.bubbles && !event.propagationStopped && this.parentNode) this.parentNode.dispatchEvent(event);
        return !event.defaultPrevented;
    }
    fire(type, values = {}) {
        const event = { type, bubbles: false, defaultPrevented: false, ...values };
        this.dispatchEvent(event);
        return event;
    }
}

class Element extends EventTarget {
    [Symbol.for('nodejs.util.inspect.custom')]() { return `<${this.tagName}${this.id ? `#${this.id}` : ''}>`; }
    constructor(document, tagName = 'div') {
        super();
        this.ownerDocument = document;
        this.tagName = tagName.toUpperCase();
        this.children = [];
        this.parentNode = null;
        this.attributes = new Map();
        this.style = {};
        this.className = '';
        this._text = '';
        this._html = '';
        this.tabIndex = -1;
        this.disabled = false;
        this.clientWidth = 240;
        this.clientHeight = 240;
        this.rect = { left: 0, top: 0, width: 240, height: 240 };
        this.capturedPointers = new Set();
        this.classList = {
            contains: value => this.className.split(/\s+/).includes(value),
            add: (...values) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...values])].join(' '); },
            remove: (...values) => { this.className = this.className.split(/\s+/).filter(value => !values.includes(value)).join(' '); }
        };
    }
    get id() { return this.getAttribute('id') || ''; }
    set id(value) { this.setAttribute('id', value); }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    set textContent(value) { this.clearChildren(); this._text = String(value); this._html = ''; }
    get innerHTML() { return this._html; }
    set innerHTML(value) { this.clearChildren(); this._text = ''; this._html = String(value); }
    get lastElementChild() { return this.children.at(-1) || null; }
    get open() { return this.attributes.has('open'); }
    get isConnected() { return this === this.ownerDocument.body || !!this.parentNode?.isConnected; }
    clearChildren() { this.children.forEach(child => { child.parentNode = null; }); this.children = []; }
    setAttribute(name, value) {
        this.attributes.set(name, String(value));
        if (name === 'class') this.className = String(value);
        if (name === 'tabindex') this.tabIndex = Number(value);
    }
    getAttribute(name) { return name === 'class' ? this.className : this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(child) { child.remove(); child.parentNode = this; this.children.push(child); return child; }
    remove() {
        if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1);
        this.parentNode = null;
    }
    replaceChild(replacement, previous) {
        const index = this.children.indexOf(previous);
        if (index < 0) throw new Error('置換対象がありません');
        replacement.remove();
        this.children[index] = replacement;
        replacement.parentNode = this;
        previous.parentNode = null;
        return previous;
    }
    cloneNode(deep = false) {
        const clone = new Element(this.ownerDocument, this.tagName);
        this.attributes.forEach((value, key) => clone.setAttribute(key, value));
        clone.className = this.className;
        clone._text = this._text;
        if (deep) this.children.forEach(child => clone.appendChild(child.cloneNode(true)));
        return clone;
    }
    matches(selector) {
        if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
        if (selector.startsWith('#')) return this.id === selector.slice(1);
        const attribute = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
        if (attribute) return attribute[2] === undefined ? this.attributes.has(attribute[1]) : this.getAttribute(attribute[1]) === attribute[2];
        return this.tagName.toLowerCase() === selector.toLowerCase();
    }
    querySelectorAll(selector) {
        return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { return this.matches(selector) ? this : this.parentNode?.closest(selector) || null; }
    focus() { this.ownerDocument.activeElement = this; }
    click() { if (!this.disabled) this.fire('click', { bubbles: true }); }
    getBoundingClientRect() { return { ...this.rect }; }
    setPointerCapture(id) { this.capturedPointers.add(id); }
    releasePointerCapture(id) {
        if (this.capturedPointers.delete(id)) this.fire('lostpointercapture', { pointerId: id });
    }
    showModal() { this.setAttribute('open', ''); }
    close() { this.removeAttribute('open'); this.fire('close'); }
}

function createDocument() {
    const document = new EventTarget();
    document.hidden = false;
    document.createElement = tag => new Element(document, tag);
    document.body = document.createElement('body');
    document.activeElement = document.body;
    document.getElementById = id => document.body.querySelector(`#${id}`);
    document.querySelector = selector => document.body.querySelector(selector);
    document.querySelectorAll = selector => document.body.querySelectorAll(selector);
    const add = (id, tag = 'div', parent = document.body) => {
        const element = document.createElement(tag);
        if (id) element.id = id;
        parent.appendChild(element);
        return element;
    };
    for (const id of ['money', 'clock', 'moji']) {
        add(`nav-${id}`, 'button').className = 'nav-item';
        add(`tab-${id}`).className = 'tab-content';
    }
    for (const id of ['mode-pay', 'mode-change', 'btn-money-undo', 'btn-money-reset', 'btn-money-check', 'mode-clock-read', 'mode-clock-set', 'lvl-easy', 'lvl-normal', 'lvl-hard', 'btn-moji-hint', 'btn-moji-next']) add(id, 'button');
    for (const id of ['display-pay', 'display-change', 'money-label', 'item-icon', 'item-name', 'target-price', 'change-level-disp', 'change-item-icon', 'change-item-price', 'change-paid', 'current-money', 'coin-tray', 'clock-question', 'clock-adjust-btns', 'clock-opts', 'target-char', 'timer', 'moji-container', 'maron-msg', 'maron-header', 'star-1', 'star-2', 'star-3']) add(id);
    for (const value of [1, 5, 10, 50, 100]) {
        const button = add(null, 'button');
        button.className = 'coin-btn';
        button.setAttribute('data-value', value);
    }
    for (const action of ['dec-h', 'inc-h', 'dec-m', 'inc-m']) {
        const button = add(null, 'button');
        button.className = 'btn-clock-adj';
        button.setAttribute('data-action', action);
    }
    const face = add('clock-face');
    for (const id of ['hand-hour', 'hand-minute', 'clock-touch']) add(id, 'div', face);
    add(null, 'button', add('clock-check-btn'));
    add(null, 'span', add('sound-btn', 'button'));
    add(null, 'svg', add('hanamaru-overlay'));
    add('parents-open', 'button').setAttribute('data-action', 'parents-modal-open');
    const dialog = add('parents-modal', 'dialog');
    for (const id of ['parents-close', 'parents-close-bottom']) add(id, 'button', dialog).setAttribute('data-action', 'parents-modal-close');
    return document;
}

function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function createTone(options = {}) {
    const state = { constructed: 0, instances: [], sounds: [], starts: 0, suspends: 0, resumes: 0 };
    class Synth {
        constructor() {
            const number = ++state.constructed;
            if (options.failConstruct === number) throw new Error('synth construction failed');
            this.number = number;
            this.disposed = false;
            state.instances.push(this);
        }
        toDestination() {
            if (options.failDestination === this.number) throw new Error('destination failed');
            return this;
        }
        dispose() { this.disposed = true; }
        triggerAttackRelease(...args) {
            if (options.failTrigger) throw new Error('audio interrupted');
            state.sounds.push({ synth: this, args });
        }
    }
    const rawContext = {
        suspend() { state.suspends++; if (options.failSuspend) return Promise.reject(new Error('suspend failed')); return Promise.resolve(); },
        resume() { state.resumes++; if (options.failResume) throw new Error('resume failed'); return Promise.resolve(); }
    };
    return {
        state, options,
        Tone: {
            Synth, PolySynth: Synth, Destination: { mute: false, volume: { value: 0 } },
            start: () => { state.starts++; return options.start ? options.start() : Promise.resolve(); },
            now: () => { if (options.failNow) throw new Error('audio clock unavailable'); return 10; },
            context: options.rawContext === false ? rawContext : { rawContext }
        }
    };
}

function harness(options = {}) {
    const document = createDocument();
    const window = new EventTarget();
    const tone = createTone(options.tone);
    const storage = { raw: options.profile ?? null, reads: 0, writes: [], blockedRead: false, blockedWrite: false };
    const localStorage = {
        getItem(key) { storage.reads++; if (storage.blockedRead) throw new Error('storage blocked'); return key === PROFILE_KEY ? storage.raw : null; },
        setItem(key, value) { if (storage.blockedWrite) throw new Error('storage blocked'); storage.writes.push({ key, value }); storage.raw = value; }
    };
    let loadCalls = 0;
    window.PikaLabToneLoader = { load: () => { loadCalls++; return options.load ? options.load() : Promise.resolve(); } };
    let now = 0, sequence = 0, seed = 41;
    const jobs = new Map();
    const schedule = (fn, delay = 0, repeat = false) => {
        const id = ++sequence;
        jobs.set(id, { fn, at: now + Number(delay), delay: Number(delay), repeat });
        return id;
    };
    const random = options.random || (() => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; });
    const math = Object.create(Math);
    math.random = random;
    const warnings = [], observers = [];
    const context = vm.createContext({
        window, document, localStorage, Tone: tone.Tone, Math: math,
        console: { warn: (...args) => warnings.push(args), log() {}, error() {} },
        Date: { now: () => now },
        setTimeout: (fn, delay) => schedule(fn, delay), clearTimeout: id => jobs.delete(id),
        setInterval: (fn, delay) => schedule(fn, delay, true), clearInterval: id => jobs.delete(id),
        ResizeObserver: options.resizeObserver === false ? undefined : class {
            constructor(callback) { this.callback = callback; observers.push(this); }
            observe(element) { this.element = element; }
        }
    });
    vm.runInContext(`${source}\nglobalThis.app = new ManabiLandApp();`, context, { timeout: 1000, filename: scriptPath });
    const app = context.app;
    function advance(ms) {
        const end = now + ms;
        let turns = 0;
        while (true) {
            const due = [...jobs].filter(([, job]) => job.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
            if (!due) break;
            assert.ok(++turns < 10000, 'タイマーが有限時間で停止する');
            const [id, job] = due;
            now = job.at;
            if (job.repeat) job.at += job.delay;
            else jobs.delete(id);
            job.fn();
        }
        now = end;
    }
    return { app, document, window, tone, storage, jobs, advance, context, warnings, observers, get loadCalls() { return loadCalls; } };
}

function silence(h) {
    const events = [];
    h.app.audio = { playSfx: type => events.push(type), cancelPending() {}, updateSoundButton() {}, toggleMute() {}, suspend() {}, resume() {}, loadSettings() {} };
    return events;
}

function pointer(pointerId = 1, values = {}) { return { pointerId, button: 0, clientX: 240, clientY: 120, preventDefault() {}, ...values }; }
function readyClock(h) {
    silence(h);
    h.app.init();
    h.app.switchTab('tab-clock');
    h.app.clockGame.setMode('set');
    return h.app.clockGame;
}
function assertNoDrag(h) {
    assert.equal(h.app.clockGame.activePointerId, null);
    assert.equal(h.app.clockGame.clockTouchRect, null);
    for (const event of ['pointermove', 'pointerup', 'pointercancel']) assert.equal(h.window.listenerCount(event), 0, event);
    assert.equal(h.document.getElementById('clock-touch').capturedPointers.size, 0);
}

for (const [description, profile, muted, volume] of [
    ['真偽値と音量', { isMuted: true, volumeDb: -8 }, true, -8],
    ['文字列の値', { isMuted: 'true', volumeDb: '-8' }, false, -20],
    ['nullの値', { isMuted: null, volumeDb: null }, false, -20],
    ['大きすぎる音量', { volumeDb: 500 }, false, 0],
    ['小さすぎる音量', { volumeDb: -500 }, false, -40],
    ['配列', [{ isMuted: true }], false, -20],
    ['プリミティブ', true, false, -20],
    ['空値', null, false, -20]
]) {
    test(`音声設定: ${description}を安全に検証する`, () => {
        const h = harness({ profile: JSON.stringify(profile) });
        assert.equal(h.app.audio.isMuted, muted);
        assert.equal(h.app.audio.volumeDb, volume);
    });
}

test('壊れたJSONと読み書き禁止でも音声切り替えと表示を維持する', () => {
    const h = harness({ profile: '{broken' });
    assert.equal(h.app.audio.volumeDb, -20);
    h.storage.blockedRead = h.storage.blockedWrite = true;
    assert.doesNotThrow(() => h.app.audio.loadSettings());
    assert.doesNotThrow(() => h.app.audio.toggleMute());
    assert.equal(h.app.audio.isMuted, true);
    assert.equal(h.document.getElementById('sound-btn').getAttribute('aria-pressed'), 'true');
    assert.equal(h.document.getElementById('sound-btn').querySelector('span').textContent, 'volume_off');
});

test('ミュート保存は別タブの最新プロフィールへその項目だけをマージする', () => {
    const h = harness({ profile: JSON.stringify({ isMuted: false, volumeDb: -30, theme: 'old' }) });
    h.storage.raw = JSON.stringify({ isMuted: false, volumeDb: -5, theme: 'new', progress: { stars: 7 }, future: ['x'] });
    h.app.audio.toggleMute();
    assert.deepEqual(JSON.parse(h.storage.raw), { isMuted: true, volumeDb: -5, theme: 'new', progress: { stars: 7 }, future: ['x'] });
    assert.equal(h.storage.writes[0].key, PROFILE_KEY);
});

test('初回連打は読み込みとTone.startを共有し各効果音の開始時刻を分ける', async () => {
    const loading = deferred(), starting = deferred();
    const h = harness({ load: () => loading.promise, tone: { start: () => starting.promise } });
    const requests = ['click', 'coin', 'tick'].map(type => h.app.audio.playSfx(type));
    await new Promise(setImmediate);
    assert.equal(h.loadCalls, 1);
    assert.equal(h.tone.state.starts, 0);
    loading.resolve();
    await new Promise(setImmediate);
    assert.equal(h.tone.state.starts, 1);
    assert.equal(h.tone.state.constructed, 0);
    starting.resolve();
    await Promise.all(requests);
    assert.equal(h.tone.state.constructed, 4);
    assert.equal(h.tone.state.sounds.length, 3);
    const times = h.tone.state.sounds.map(sound => sound.args[2]);
    assert.ok(times.every((value, index) => !index || value > times[index - 1]));
    assert.equal(h.app.audio.isAudioInit, true);
});

for (const failure of ['load', 'start', 'constructor', 'destination']) {
    test(`初期化の${failure}失敗は部分作成を破棄し次の操作で再試行する`, async () => {
        let firstLoad = true, firstStart = true;
        const h = harness({
            load: () => { if (failure === 'load' && firstLoad) { firstLoad = false; return Promise.reject(new Error('load failed')); } return Promise.resolve(); },
            tone: {
                start: () => { if (failure === 'start' && firstStart) { firstStart = false; return Promise.reject(new Error('start failed')); } return Promise.resolve(); },
                failConstruct: failure === 'constructor' ? 3 : undefined,
                failDestination: failure === 'destination' ? 3 : undefined
            }
        });
        assert.equal(await h.app.audio.init(), false);
        assert.equal(h.app.audio.isAudioInit, false);
        assert.equal(h.app.audio.audioInitFailed, true);
        assert.ok(h.tone.state.instances.every(instance => instance.disposed));
        for (const name of ['sfxSynth', 'sfxPoly', 'sfxTick', 'sfxNgSynth']) assert.equal(h.app.audio[name], null);
        h.tone.options.failConstruct = h.tone.options.failDestination = undefined;
        await h.app.audio.playSfx('coin');
        assert.equal(h.loadCalls, 2);
        assert.equal(h.app.audio.isAudioInit, true);
        assert.equal(h.app.audio.audioInitFailed, false);
        assert.equal(h.tone.state.sounds.length, 1);
        assert.equal(h.tone.state.instances.filter(instance => !instance.disposed).length, 4);
    });
}

test('同期的なローダー例外でも次の操作で初期化を再試行できる', async () => {
    let first = true;
    const h = harness({ load: () => { if (first) { first = false; throw new Error('loader not ready'); } return Promise.resolve(); } });
    assert.equal(await h.app.audio.init(), false);
    assert.equal(await h.app.audio.init(), true);
    assert.equal(h.loadCalls, 2);
});

test('ローダーが初回に未定義でも後から利用可能になれば再試行する', async () => {
    const h = harness();
    const loader = h.window.PikaLabToneLoader;
    delete h.window.PikaLabToneLoader;
    assert.equal(await h.app.audio.init(), false);
    h.window.PikaLabToneLoader = loader;
    assert.equal(await h.app.audio.init(), true);
});

for (const reason of ['muted', 'hidden']) {
    test(`${reason}中は音声を読み込まず、読み込み待機中の効果音も鳴らさない`, async () => {
        const blocked = harness();
        if (reason === 'muted') blocked.app.audio.isMuted = true;
        else blocked.document.hidden = true;
        await blocked.app.audio.playSfx('click');
        assert.equal(blocked.loadCalls, 0);
        const loading = deferred();
        const h = harness({ load: () => loading.promise });
        const setBlocked = value => { if (reason === 'muted') h.app.audio.isMuted = value; else h.document.hidden = value; };
        const request = h.app.audio.playSfx('coin');
        setBlocked(true);
        loading.resolve();
        await request;
        assert.equal(h.tone.state.sounds.length, 0);
        if (reason === 'hidden') assert.equal(h.tone.state.suspends, 1);
    });
}

for (const transition of ['cancel', 'mute-unmute', 'suspend-resume', 'tab', 'modal', 'storage']) {
    test(`${transition}後に古い音声読み込みが完了しても効果音を再生しない`, async () => {
        const loading = deferred();
        const h = harness({ load: () => loading.promise });
        h.app.init();
        const request = h.app.audio.playSfx('coin');
        if (transition === 'cancel') h.app.audio.cancelPending();
        if (transition === 'mute-unmute') { h.app.audio.toggleMute(); h.app.audio.toggleMute(); }
        if (transition === 'suspend-resume') { h.app.audio.suspend(); h.app.audio.resume(); }
        if (transition === 'tab') h.app.switchTab('tab-moji', false);
        if (transition === 'modal') h.document.getElementById('parents-open').click();
        if (transition === 'storage') h.window.fire('storage', { key: PROFILE_KEY });
        loading.resolve();
        await request;
        await Promise.resolve();
        assert.equal(h.tone.state.sounds.filter(sound => sound.args[0] === 'B5').length, 0);
    });
}

test('他タブの音声設定変更とストレージ消去を表示・出力へ反映する', async () => {
    const h = harness();
    h.app.init();
    await h.app.audio.init();
    h.storage.raw = JSON.stringify({ isMuted: true, volumeDb: -12 });
    h.window.fire('storage', { key: 'unrelated-key' });
    assert.equal(h.app.audio.isMuted, false);
    h.window.fire('storage', { key: PROFILE_KEY });
    assert.equal(h.app.audio.isMuted, true);
    assert.equal(h.tone.Tone.Destination.mute, true);
    assert.equal(h.tone.Tone.Destination.volume.value, -12);
    assert.equal(h.document.getElementById('sound-btn').getAttribute('aria-pressed'), 'true');
    h.storage.raw = null;
    h.window.fire('storage', { key: null });
    assert.equal(h.app.audio.isMuted, false);
    assert.equal(h.tone.Tone.Destination.volume.value, -20);
    assert.equal(h.storage.writes.length, 0);
});

for (const failure of ['failTrigger', 'failNow']) {
    test(`効果音の${failure}例外は呼び出し元へ伝播しない`, async () => {
        const h = harness({ tone: { [failure]: true } });
        await assert.doesNotReject(h.app.audio.playSfx(failure === 'failNow' ? 'perfect' : 'ok'));
        assert.equal(h.app.audio.isAudioInit, true);
        assert.equal(h.warnings.length, 1);
    });
}

test('音声の中断・再開APIが失敗しても画面イベントは成功する', async () => {
    for (const rawContext of [true, false]) {
        const h = harness({ tone: { rawContext, failSuspend: true, failResume: true } });
        h.app.init();
        await h.app.audio.init();
        h.document.hidden = true;
        assert.doesNotThrow(() => h.document.fire('visibilitychange'));
        h.document.hidden = false;
        assert.doesNotThrow(() => h.document.fire('visibilitychange'));
        await Promise.resolve();
        assert.equal(h.tone.state.suspends, 1);
        assert.equal(h.tone.state.resumes, 1);
    }
});

test('大きな負数・非数値も時計の範囲へ正規化する', () => {
    const h = harness();
    for (const input of [-1001, -60, -25, -13, -12, -1, 0, 1, 12, 25, 1001]) {
        h.context.input = input;
        const result = vm.runInContext('({ hour: normalizeClockHour(input), minute: normalizeClockMinute(input) })', h.context);
        assert.equal(result.hour, ((input - 1) % 12 + 12) % 12 + 1);
        assert.equal(result.minute, (input % 60 + 60) % 60);
    }
    assert.equal(vm.runInContext('normalizeClockHour("bad")', h.context), 12);
    assert.equal(vm.runInContext('normalizeClockMinute(undefined)', h.context), 0);
    assert.equal(vm.runInContext('JSON.stringify(shiftClockByFiveMinutes(12, 0, "backward"))', h.context), '{"hour":11,"minute":55}');
    assert.equal(vm.runInContext('JSON.stringify(shiftClockByFiveMinutes(11, 55, "forward"))', h.context), '{"hour":12,"minute":0}');
});

test('偏りが極端な乱数でも読時計の選択肢が有限時間で4択になり正解を一つ含む', () => {
    for (const random of [() => 0, () => 0.999999999]) {
        const h = harness({ random });
        silence(h);
        vm.runInContext('app.clockGame.initRead()', h.context, { timeout: 250 });
        const game = h.app.clockGame;
        const buttons = h.document.getElementById('clock-opts').children;
        const correct = `${game.targetHour}じ ${game.targetMinute === 0 ? '' : game.targetMinute + 'ふん'}`;
        assert.equal(buttons.length, 4);
        assert.equal(new Set(buttons.map(button => button.textContent)).size, 4);
        assert.equal(buttons.filter(button => button.textContent === correct).length, 1);
        assert.ok(buttons.every(button => button.tagName === 'BUTTON'));
    }
});

test('読時計の選択肢は毎回置き換わり誤答・正解・ロックの挙動を守る', () => {
    const h = harness();
    const sounds = silence(h);
    const game = h.app.clockGame;
    game.initRead();
    const previous = [...h.document.getElementById('clock-opts').children];
    game.initRead();
    assert.ok(previous.every(button => !button.isConnected));
    const correct = `${game.targetHour}じ ${game.targetMinute === 0 ? '' : game.targetMinute + 'ふん'}`;
    const buttons = h.document.getElementById('clock-opts').children;
    let correctCount = 0;
    h.app.showHanamaru = () => { correctCount++; };
    buttons.find(button => button.textContent !== correct).click();
    assert.equal(sounds.at(-1), 'ng');
    assert.equal(correctCount, 0);
    buttons.find(button => button.textContent === correct).click();
    assert.equal(correctCount, 1);
    h.app.isLocked = true;
    buttons.forEach(button => button.click());
    assert.equal(correctCount, 1);
});

test('コイントレーは追加・戻す・消去で順序と合計を保ち不正な金額を無視する', () => {
    const h = harness();
    silence(h);
    const game = h.app.moneyGame, tray = h.document.getElementById('coin-tray');
    game.addMoney(100);
    game.addMoney(5);
    game.addMoney(10);
    assert.deepEqual(tray.children.map(coin => coin.textContent), ['100', '5', '10']);
    assert.equal(h.document.getElementById('current-money').textContent, '115');
    game.undoMoney();
    assert.equal(tray.children.length, 2);
    assert.deepEqual(tray.children.map(coin => coin.textContent), ['100', '5']);
    assert.equal(h.document.getElementById('current-money').textContent, '105');
    for (const invalid of [NaN, 0, -1, 2, Infinity, '100']) game.addMoney(invalid);
    assert.equal(tray.children.length, 2);
    assert.equal(h.document.getElementById('current-money').textContent, '105');
    game.resetMoney();
    assert.equal(tray.children.length, 0);
    assert.equal(h.document.getElementById('current-money').textContent, '0');
});

test('時計ドラッグは主ポインターのみ受け付け別の指の移動・終了を無視する', () => {
    const h = harness(), game = readyClock(h), touch = h.document.getElementById('clock-touch');
    touch.fire('pointerdown', pointer(7));
    assert.equal(game.activePointerId, 7);
    assert.equal(game.currentMinute, 15);
    assert.equal(h.window.listenerCount('pointermove'), 1);
    touch.fire('pointerdown', pointer(8, { clientX: 120, clientY: 240 }));
    h.window.fire('pointermove', pointer(8, { clientX: 120, clientY: 240 }));
    h.window.fire('pointerup', pointer(8));
    assert.equal(game.currentMinute, 15);
    assert.equal(game.activePointerId, 7);
    h.window.fire('pointermove', pointer(7, { clientX: 120, clientY: 240 }));
    assert.equal(game.currentMinute, 30);
    h.window.fire('pointercancel', pointer(7));
    assertNoDrag(h);
    const minute = game.currentMinute;
    h.window.fire('pointermove', pointer(7));
    assert.equal(game.currentMinute, minute);
});

for (const blocked of ['read', 'inactive-tab', 'locked', 'modal', 'hidden', 'secondary-button']) {
    test(`時計ドラッグは${blocked}状態では開始しない`, () => {
        const h = harness(), game = readyClock(h);
        if (blocked === 'read') game.setMode('read');
        if (blocked === 'inactive-tab') h.app.switchTab('tab-money', false);
        if (blocked === 'locked') h.app.isLocked = true;
        if (blocked === 'modal') h.app.isModalOpen = true;
        if (blocked === 'hidden') h.document.hidden = true;
        const before = [game.currentHour, game.currentMinute];
        h.document.getElementById('clock-touch').fire('pointerdown', pointer(1, { button: blocked === 'secondary-button' ? 2 : 0 }));
        assert.deepEqual([game.currentHour, game.currentMinute], before);
        assertNoDrag(h);
    });
}

for (const reason of ['mode', 'tab', 'hidden', 'pagehide', 'modal', 'feedback', 'capture-lost', 'resize', 'lock-during-move']) {
    test(`時計ドラッグの${reason}終了で捕捉・座標・グローバルリスナーを解除する`, () => {
        const h = harness(), game = readyClock(h), touch = h.document.getElementById('clock-touch');
        touch.fire('pointerdown', pointer(9));
        assert.equal(game.activePointerId, 9);
        if (reason === 'mode') game.setMode('read');
        if (reason === 'tab') h.app.switchTab('tab-money', false);
        if (reason === 'hidden') { h.document.hidden = true; h.document.fire('visibilitychange'); }
        if (reason === 'pagehide') h.window.fire('pagehide');
        if (reason === 'modal') h.document.getElementById('parents-open').click();
        if (reason === 'feedback') h.app.showHanamaru(() => {});
        if (reason === 'capture-lost') touch.releasePointerCapture(9);
        if (reason === 'resize') h.observers[0].callback();
        if (reason === 'lock-during-move') { h.app.isLocked = true; h.window.fire('pointermove', pointer(9)); }
        assertNoDrag(h);
    });
}

test('時計数字の半径は実寸とリサイズに追従し数字を重複作成しない', () => {
    for (const resizeObserver of [true, false]) {
        const h = harness({ resizeObserver });
        readyClock(h);
        const face = h.document.getElementById('clock-face'), numbers = face.querySelectorAll('.clock-num');
        assert.equal(numbers.length, 12);
        assert.equal(face.querySelectorAll('.clock-tick').length, 60);
        assert.ok(numbers[0].style.transform.includes('translateY(-94px)'));
        face.clientWidth = face.clientHeight = 320;
        if (resizeObserver) h.observers[0].callback();
        else h.window.fire('resize');
        assert.ok(numbers[0].style.transform.includes('translateY(-134px)'));
        assert.equal(face.querySelectorAll('.clock-num')[0], numbers[0]);
        assert.equal(face.querySelectorAll('.clock-num').length, 12);
        const previous = numbers[0].style.transform;
        face.clientWidth = face.clientHeight = 0;
        h.app.clockGame.layoutClockNumbers();
        assert.equal(numbers[0].style.transform, previous);
    }
});

test('ResizeObserverなしで非表示中にサイズが変わっても時計タブ復帰で配置を更新する', () => {
    const h = harness({ resizeObserver: false });
    readyClock(h);
    const face = h.document.getElementById('clock-face');
    const number = face.querySelector('.clock-num');
    h.app.switchTab('tab-money', false);
    face.clientWidth = face.clientHeight = 0;
    h.window.fire('resize');
    face.clientWidth = face.clientHeight = 300;
    h.app.switchTab('tab-clock', false);
    assert.equal(face.querySelector('.clock-num'), number);
    assert.ok(number.style.transform.includes('translateY(-124px)'));
});

test('誤答の連打は点滅タイマーを延長し次問で古いタイマーを解除する', () => {
    const h = harness();
    silence(h);
    h.app.init();
    h.app.switchTab('tab-moji', false);
    const game = h.app.mojiGame;
    const wrong = h.document.getElementById(`moji-cell-${(game.correctIndex + 1) % 9}`);
    wrong.click();
    assert.equal(wrong.style.background, '#FECACA');
    h.advance(100);
    wrong.click();
    assert.equal([...h.jobs.values()].filter(job => !job.repeat).length, 1);
    h.advance(100);
    assert.equal(wrong.style.background, '#FECACA');
    h.advance(100);
    assert.equal(wrong.style.background, '');
    wrong.click();
    h.document.getElementById('btn-moji-next').click();
    assert.equal(wrong.isConnected, false);
    assert.equal([...h.jobs.values()].filter(job => !job.repeat).length, 0);
    h.advance(500);
    assert.equal(wrong.style.background, '#FECACA');
});

test('ヒント連打は終了リスナーを積まず次問まで表示し文字マスはボタンとして操作できる', () => {
    const h = harness();
    silence(h);
    h.app.init();
    h.app.switchTab('tab-moji', false);
    const game = h.app.mojiGame, correct = h.document.getElementById(`moji-cell-${game.correctIndex}`);
    assert.equal(correct.tagName, 'BUTTON');
    for (let index = 0; index < 25; index++) h.document.getElementById('btn-moji-hint').click();
    assert.equal(correct.classList.contains('moji-hint'), true);
    assert.equal(correct.listenerCount('animationend'), 0);
    correct.fire('animationend');
    assert.equal(correct.classList.contains('moji-hint'), true);
    correct.click();
    assert.equal(h.app.isLocked, true);
    assert.ok(h.document.querySelectorAll('.moji-cell').every(cell => cell.disabled));
    h.advance(1500);
    assert.equal(h.app.isLocked, false);
    assert.equal(correct.isConnected, false);
    assert.ok(h.document.querySelectorAll('.moji-cell').every(cell => !cell.disabled && !cell.classList.contains('moji-hint')));
});

test('矢印・Home・Endでタブ選択とフォーカスが移動しロック中は維持する', () => {
    const h = harness();
    silence(h);
    h.app.init();
    function press(from, key, expected) {
        const origin = h.document.getElementById(`nav-${from}`);
        origin.focus();
        const event = origin.fire('keydown', { key });
        assert.equal(event.defaultPrevented, true);
        assert.equal(h.app.tabId, `tab-${expected}`);
        assert.equal(h.document.activeElement, h.document.getElementById(`nav-${expected}`));
        for (const id of ['money', 'clock', 'moji']) {
            const nav = h.document.getElementById(`nav-${id}`);
            assert.equal(nav.tabIndex, id === expected ? 0 : -1);
            assert.equal(nav.getAttribute('aria-selected'), String(id === expected));
        }
    }
    press('money', 'ArrowLeft', 'moji');
    press('moji', 'ArrowRight', 'money');
    press('money', 'End', 'moji');
    press('moji', 'Home', 'money');
    press('money', 'ArrowRight', 'clock');
    h.app.isLocked = true;
    h.document.getElementById('nav-clock').fire('keydown', { key: 'End' });
    assert.equal(h.app.tabId, 'tab-clock');
    assert.equal(h.document.activeElement, h.document.getElementById('nav-clock'));
    assert.equal(h.document.getElementById('nav-clock').fire('keydown', { key: 'a' }).defaultPrevented, false);
});

for (const closeMethod of ['button', 'cancel', 'backdrop', 'native-close']) {
    test(`保護者ダイアログは時間計測を停止し${closeMethod}で焦点と計測を復帰する`, () => {
        const h = harness();
        silence(h);
        h.app.init();
        h.app.switchTab('tab-moji', false);
        h.advance(400);
        const open = h.document.getElementById('parents-open'), dialog = h.document.getElementById('parents-modal');
        open.click();
        assert.equal(h.app.isModalOpen, true);
        assert.equal(dialog.open, true);
        assert.equal(open.getAttribute('aria-expanded'), 'true');
        assert.equal(h.document.activeElement, h.document.getElementById('parents-close'));
        assert.equal(h.app.mojiGame.mIv, null);
        h.advance(5000);
        assert.equal(h.document.getElementById('timer').textContent, '0.4');
        if (closeMethod === 'button') h.document.getElementById('parents-close-bottom').click();
        if (closeMethod === 'cancel') assert.equal(dialog.fire('cancel').defaultPrevented, true);
        if (closeMethod === 'backdrop') dialog.click();
        if (closeMethod === 'native-close') dialog.close();
        assert.equal(dialog.open, false);
        assert.equal(h.app.isModalOpen, false);
        assert.equal(open.getAttribute('aria-expanded'), 'false');
        assert.equal(h.document.activeElement, open);
        h.advance(200);
        assert.equal(h.document.getElementById('timer').textContent, '0.6');
        assert.equal([...h.jobs.values()].filter(job => job.repeat).length, 1);
    });
}

test('非表示・別タブ・正解演出中にダイアログを閉じても文字タイマーを再開しない', () => {
    for (const blocked of ['hidden', 'other-tab', 'locked']) {
        const h = harness();
        silence(h);
        h.app.init();
        h.app.switchTab('tab-moji', false);
        h.advance(300);
        h.document.getElementById('parents-open').click();
        if (blocked === 'hidden') h.document.hidden = true;
        if (blocked === 'other-tab') h.app.switchTab('tab-money', false);
        if (blocked === 'locked') h.app.isLocked = true;
        h.document.getElementById('parents-close').click();
        h.advance(500);
        assert.equal(h.app.mojiGame.mIv, null);
        assert.equal(h.document.getElementById('timer').textContent, '0.3');
    }
});

test('ページ復帰と可視性イベントの重複でも文字タイマーは一つで離脱時間を除く', () => {
    const h = harness();
    silence(h);
    h.app.init();
    h.app.switchTab('tab-moji', false);
    h.advance(300);
    h.window.fire('pagehide');
    h.advance(5000);
    h.window.fire('pageshow');
    h.window.fire('pageshow');
    h.document.fire('visibilitychange');
    assert.equal([...h.jobs.values()].filter(job => job.repeat).length, 1);
    h.advance(200);
    assert.equal(h.document.getElementById('timer').textContent, '0.5');
});
