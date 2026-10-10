const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 実際のソースを使い、時計・DOM・音声だけを決定的なテスト用にする。
function createRuntime({ storage = new Map(), locks = null } = {}) {
    const timers = new Map();
    const listeners = new Map();
    const elements = new Map();
    const queries = new Map();
    const resources = [];
    const faults = {};
    const errors = [];
    const writes = [];
    let timerId = 0;
    let loaderCalls = 0;
    let starts = 0;
    class Element {
        constructor(id = '', tagName = 'DIV') {
            this.id = id; this.tagName = tagName; this.style = {}; this.value = '';
            this.attributes = new Map(); this.children = []; this.isConnected = true;
            this.text = ''; this.textWrites = 0;
            const classes = new Set();
            this.classList = {
                add: (...names) => names.forEach(name => classes.add(name)),
                remove: (...names) => names.forEach(name => classes.delete(name)),
                contains: name => classes.has(name),
                replace: (before, after) => { if (classes.delete(before)) classes.add(after); },
                toggle: (name, active = !classes.has(name)) => { active ? classes.add(name) : classes.delete(name); return active; }
            };
        }
        get innerText() { return this.text; }
        set innerText(value) { this.text = String(value); this.textWrites += 1; }
        setAttribute(name, value) { this.attributes.set(name, String(value)); }
        removeAttribute(name) { this.attributes.delete(name); }
        getAttribute(name) { return this.attributes.get(name) ?? null; }
        addEventListener() {}
        querySelector() { return this.icon ||= new Element(); }
        querySelectorAll() { return this.children; }
        closest(selector) {
            if (selector.includes('[hidden]')) return this.hidden || this.inert ? this : null;
            if (selector === '[inert]') return this.inert ? this : null;
            if (this.interactive || ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(this.tagName)) return this;
            return null;
        }
        getClientRects() { return this.hidden ? [] : [{}]; }
        contains(element) { return element === this || this.children.includes(element); }
        focus() { document.activeElement = this; }
    }
    const get = (id) => {
        if (!elements.has(id)) elements.set(id, new Element(id));
        return elements.get(id);
    };
    const addListener = (name, callback) => {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(callback);
    };
    const document = {
        body: new Element('body', 'BODY'), documentElement: new Element('html', 'HTML'),
        activeElement: null, visibilityState: 'visible', title: '',
        addEventListener: addListener, querySelector: selector => queries.get(selector) || null,
        querySelectorAll: () => [], getElementById: get
    };
    document.activeElement = document.body;
    function audioClass(type) {
        return class {
            constructor() { this.type = type; this.volume = { value: 0, rampTo() {} }; this.frequency = {}; resources.push(this); }
            toDestination() { if (faults.destination === type) throw Error('destination failure'); return this; }
            connect() { return this; }
            start() { this.started = true; this.startedVolume = this.volume.value; return this; }
            stop() { this.stops = (this.stops || 0) + 1; if (faults.stop === type) throw Error('stop failure'); }
            dispose() { this.disposed = true; if (faults.dispose === type) throw Error('dispose failure'); }
        };
    }
    const tone = {
        context: { state: 'running', resume: async () => {}, rawContext: { suspend: async () => {} } },
        start: async () => { starts += 1; },
        Noise: audioClass('Noise'), AutoFilter: audioClass('AutoFilter'), Filter: audioClass('Filter'), LFO: audioClass('LFO')
    };
    const localStorage = {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => { writes.push([key, String(value)]); storage.set(key, String(value)); }
    };
    const window = { addEventListener: addListener, Tone: tone, PikaLabToneLoader: { load: async () => { loaderCalls += 1; } }, matchMedia: () => ({ matches: false }) };
    const context = vm.createContext({
        window, document, navigator: { locks }, localStorage, Element, HTMLElement: Element,
        console: { error: (...args) => errors.push(args) },
        setTimeout(callback, delay) { timers.set(++timerId, { callback, delay }); return timerId; },
        clearTimeout: id => timers.delete(id), setInterval: () => ++timerId, clearInterval() {}
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8') + '\nglobalThis.runtimeApp = app;', context);
    const app = context.runtimeApp;
    app.initDOMReferences();
    app.dom.timerLabel.innerText = 'しゅうちゅう！';
    app.dom.progressCircle.r = { baseVal: { value: 50 } };
    app.setupProgressRing();
    app.dom.soundDrawer.classList.add('translate-x-full');
    for (const { id } of app.soundsData) get(`vol-${id}`).value = '-20';
    return { app, context, document, window, storage, localStorage, locks, timers, listeners, queries, resources, faults, errors, writes, get,
        loaderCalls: () => loaderCalls, audioStarts: () => starts,
        dispatch(type, event = {}) { for (const callback of listeners.get(type) || []) callback(event); }
    };
}
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
async function settle() { for (let i = 0; i < 8; i += 1) await Promise.resolve(); }

for (const value of ['', ' ', '12oops', '12.5', '1e2', Infinity, NaN, null, {}, true]) {
    test(`整数設定は不正な値 ${String(value)} を既定値へ戻す`, () => {
        assert.equal(createRuntime().app.sanitizeInteger(value, 1, 180, 25), 25);
    });
}
test('整数設定は正しい整数を受け取り境界値へ制限する', () => {
    const { app } = createRuntime();
    assert.equal(app.sanitizeInteger(' 15 ', 1, 180, 25), 15);
    assert.equal(app.sanitizeInteger('999', 1, 180, 25), 180);
    assert.equal(app.sanitizeInteger('-2', 1, 180, 25), 1);
});

test('音声準備は同時呼び出しを共有し失敗後に再試行できる', async () => {
    const runtime = createRuntime();
    const first = runtime.app.ensureAudio();
    assert.equal(first, runtime.app.ensureAudio());
    assert.equal(await first, true);
    assert.equal(runtime.loaderCalls(), 1);
    assert.equal(runtime.audioStarts(), 1);
    runtime.app.audioReady = false;
    runtime.window.PikaLabToneLoader.load = async () => { throw Error('offline'); };
    assert.equal(await runtime.app.ensureAudio(), false);
    runtime.window.PikaLabToneLoader.load = async () => {};
    assert.equal(await runtime.app.ensureAudio(), true);
});

test('音声待ち中の再クリックと全停止は遅れて音を開始しない', async () => {
    for (const stop of [(app) => app.toggleSound('brown'), (app) => app.stopAllSounds()]) {
        const { app, resources } = createRuntime();
        const audio = deferred(); app.ensureAudio = () => audio.promise;
        const starting = app.toggleSound('brown');
        stop(app); audio.resolve(true); await starting;
        assert.equal(resources.length, 0);
        assert.equal(app.sounds.brown, undefined);
    }
});

test('全停止は同時に繰り返しても再開せず音声準備を待たない', async () => {
    const { app, resources, get } = createRuntime();
    await app.toggleSound('brown');
    app.ensureAudio = () => { throw Error('停止で呼び出してはいけない'); };
    app.stopAllSounds(); app.stopAllSounds();
    assert.equal(app.sounds.brown, undefined);
    assert.equal(resources[0].disposed, true);
    assert.equal(get('btn-brown').getAttribute('aria-pressed'), 'false');
    assert.equal(get('vol-brown').disabled, true);
});

test('音の開始取消し後の新しい開始が古いPromiseに取り消されない', async () => {
    const { app, resources } = createRuntime();
    const first = deferred(), second = deferred();
    app.ensureAudio = () => first.promise;
    const starting = app.toggleSound('brown');
    app.stopAllSounds(); app.ensureAudio = () => second.promise;
    const restarting = app.toggleSound('brown');
    first.resolve(true); await starting;
    assert.equal(resources.length, 0);
    second.resolve(true); await restarting;
    assert.ok(app.sounds.brown);
    assert.equal(resources.length, 1);
    assert.equal(resources[0].startedVolume, -20);
});

test('複合音声の初期化失敗と停止失敗でも全ノードを解放する', async () => {
    const first = createRuntime(); first.faults.destination = 'AutoFilter';
    await first.app.toggleSound('rain');
    assert.equal(first.resources.length, 2);
    assert.ok(first.resources.every(resource => resource.disposed));
    assert.equal(first.app.sounds.rain, undefined);
    const second = createRuntime(); await second.app.toggleSound('cafe');
    second.faults.stop = 'Noise'; second.app.stopAllSounds();
    assert.equal(second.resources.length, 3);
    assert.ok(second.resources.every(resource => resource.disposed));
});

test('ページ離脱は準備中の音声と開始要求だけを取り消す', async () => {
    const runtime = createRuntime(); const loading = deferred();
    runtime.window.PikaLabToneLoader.load = () => loading.promise;
    const starting = runtime.app.toggleSound('brown');
    runtime.app.suspendAudioForPage(); loading.resolve(); await starting;
    assert.equal(runtime.audioStarts(), 0);
    assert.equal(runtime.resources.length, 0);
    assert.equal(await runtime.app.ensureAudio(), false);
    runtime.app.resumeAudioForPage();
    await runtime.app.toggleSound('brown');
    assert.ok(runtime.app.sounds.brown);
    runtime.app.suspendAudioForPage();
    assert.ok(runtime.app.sounds.brown, '復帰時に再開する既存ノードを保持する');
});

test('ページ離脱後に古いresumeが完了しても音声を再び停止する', async () => {
    const runtime = createRuntime(); const resuming = deferred();
    runtime.window.Tone.context.state = 'suspended';
    runtime.window.Tone.start = async () => {
        await resuming.promise;
        runtime.window.Tone.context.state = 'running';
    };
    let suspends = 0;
    runtime.window.Tone.context.rawContext.suspend = async () => {
        suspends += 1;
        runtime.window.Tone.context.state = 'suspended';
    };
    const preparing = runtime.app.ensureAudio(); await settle();
    runtime.app.suspendAudioForPage(); resuming.resolve();
    assert.equal(await preparing, false);
    assert.equal(runtime.window.Tone.context.state, 'suspended');
    assert.equal(suspends, 2);
});

test('復帰は保留中のsuspend完了後に既存の音声を再開する', async () => {
    const runtime = createRuntime(); const suspending = deferred();
    await runtime.app.toggleSound('brown');
    runtime.window.Tone.context.rawContext.suspend = async () => {
        await suspending.promise;
        runtime.window.Tone.context.state = 'suspended';
    };
    runtime.window.Tone.start = async () => { runtime.window.Tone.context.state = 'running'; };
    runtime.app.suspendAudioForPage();
    const resuming = runtime.app.resumeAudioForPage();
    suspending.resolve(); await resuming;
    assert.equal(runtime.window.Tone.context.state, 'running');
    assert.ok(runtime.app.sounds.brown);
    assert.equal(runtime.app.audioSuspensionPromise, null);
});

test('復帰待ちの途中に再離脱したら古い復帰は音声を再開しない', async () => {
    const runtime = createRuntime(); const suspending = deferred();
    await runtime.app.toggleSound('brown');
    runtime.window.Tone.context.rawContext.suspend = async () => {
        await suspending.promise;
        runtime.window.Tone.context.state = 'suspended';
    };
    let starts = 0;
    runtime.window.Tone.start = async () => { starts += 1; runtime.window.Tone.context.state = 'running'; };
    runtime.app.suspendAudioForPage();
    const resuming = runtime.app.resumeAudioForPage();
    runtime.app.suspendAudioForPage();
    suspending.resolve(); await resuming; await settle();
    assert.equal(runtime.window.Tone.context.state, 'suspended');
    assert.equal(starts, 0);
});

test('タスク未編集タブの離脱は別タブの新しい保存を上書きしない', () => {
    const storage = new Map([['focusStudioTask', 'old']]);
    const runtime = createRuntime({ storage }); runtime.app.bindEvents();
    storage.set('focusStudioTask', 'new from other tab');
    runtime.app.saveTaskImmediately();
    assert.equal(storage.get('focusStudioTask'), 'new from other tab');
    assert.equal(runtime.writes.length, 0);
    runtime.dispatch('storage', { key: 'focusStudioTask', newValue: 'new from other tab', storageArea: runtime.localStorage });
    assert.equal(runtime.app.dom.taskInput.value, 'new from other tab');
});

test('タスク編集中は他タブの更新を重ねず直近入力を一度だけ保存する', () => {
    const runtime = createRuntime(); runtime.app.bindEvents();
    runtime.app.dom.taskInput.value = 'my draft'; runtime.app.saveTask();
    runtime.dispatch('storage', { key: 'focusStudioTask', newValue: 'other draft', storageArea: runtime.localStorage });
    assert.equal(runtime.app.dom.taskInput.value, 'my draft');
    runtime.app.saveTaskImmediately(); runtime.app.saveTaskImmediately();
    assert.equal(runtime.storage.get('focusStudioTask'), 'my draft');
    assert.equal(runtime.writes.length, 1);
    assert.equal(runtime.timers.size, 0);
});

test('保存拒否時は入力を失わずdirtyを保持して再試行する', () => {
    const runtime = createRuntime(); const save = runtime.localStorage.setItem;
    runtime.app.dom.taskInput.value = 'keep me'; runtime.app.saveTask();
    runtime.localStorage.setItem = () => { throw Error('quota'); };
    runtime.app.saveTaskImmediately(); assert.equal(runtime.app.taskDirty, true);
    runtime.localStorage.setItem = save; runtime.app.saveTaskImmediately();
    assert.equal(runtime.storage.get('focusStudioTask'), 'keep me');
    assert.equal(runtime.app.taskDirty, false);
});

test('Web Locks内で完了回数を再読込し別タブと加算を共有する', async () => {
    const storage = new Map(); let queue = Promise.resolve();
    const locks = { request: (_, callback) => { const operation = queue.then(callback); queue = operation.catch(() => {}); return operation; } };
    const first = createRuntime({ storage, locks }), second = createRuntime({ storage, locks });
    await Promise.all([first.app.incrementCompletedCount(), second.app.incrementCompletedCount()]);
    assert.equal(storage.get('focusStudioCompletedCount'), '2');
    assert.equal(second.app.completedCount, 2);
    assert.equal(await first.app.incrementCompletedCount(() => false), false);
    assert.equal(storage.get('focusStudioCompletedCount'), '2');
});

test('完了回数は保存済み最大値を維持し上限で止まる', async () => {
    const runtime = createRuntime({ storage: new Map([['focusStudioCompletedCount', '9999']]) });
    await runtime.app.incrementCompletedCount(); await runtime.app.incrementCompletedCount();
    assert.equal(runtime.app.completedCount, 10000);
    assert.equal(runtime.storage.get('focusStudioCompletedCount'), '10000');
    runtime.app.bindEvents();
    runtime.dispatch('storage', { key: 'focusStudioCompletedCount', newValue: '2' });
    assert.equal(runtime.app.completedCount, 10000);
});

test('Spaceは繰返し・修飾・IME・対話要素・モーダルを横取りしない', () => {
    const runtime = createRuntime(); runtime.app.bindEvents(); let toggles = 0;
    runtime.app.toggleTimer = () => { toggles += 1; };
    const space = (extra = {}) => runtime.dispatch('keydown', { code: 'Space', key: ' ', target: runtime.document.body, preventDefault() {}, ...extra });
    for (const flag of ['repeat', 'isComposing', 'altKey', 'ctrlKey', 'metaKey', 'shiftKey', 'defaultPrevented']) space({ [flag]: true });
    space({ keyCode: 229 });
    runtime.document.body.isContentEditable = true; space(); runtime.document.body.isContentEditable = false;
    runtime.document.body.interactive = true; space(); runtime.document.body.interactive = false;
    runtime.queries.set('dialog[open], [role="dialog"][aria-modal="true"]:not([aria-hidden="true"])', {}); space(); runtime.queries.clear();
    assert.equal(toggles, 0); space(); assert.equal(toggles, 1);
});

test('IME変換中のEscapeはDrawerを閉じない', () => {
    const runtime = createRuntime(); runtime.app.bindEvents(); runtime.app.toggleSoundDrawer();
    runtime.dispatch('keydown', { key: 'Escape', isComposing: true });
    assert.equal(runtime.app.isSoundDrawerOpen(), true);
    runtime.dispatch('keydown', { key: 'Escape' });
    assert.equal(runtime.app.isSoundDrawerOpen(), false);
});

test('Drawerの即時開閉で古い表示タイマーが残らない', () => {
    const runtime = createRuntime(); runtime.app.toggleSoundDrawer();
    const staleShowId = runtime.app.drawerShowTimeoutId;
    runtime.app.toggleSoundDrawer();
    assert.equal(runtime.timers.has(staleShowId), false);
    assert.equal(runtime.app.dom.drawerOverlay.classList.contains('opacity-0'), true);
    runtime.app.toggleSoundDrawer();
    assert.equal(runtime.app.drawerHideTimeoutId, null);
});

test('DrawerのTab循環は非表示要素を除外し外側からも戻す', () => {
    const runtime = createRuntime();
    const first = runtime.get('first'), hidden = runtime.get('hidden'), last = runtime.get('last');
    hidden.hidden = true;
    runtime.app.dom.soundDrawer.children = [first, last, hidden];
    let prevented = 0; const event = { preventDefault() { prevented += 1; } };
    runtime.app.handleDrawerFocusTrap(event);
    assert.equal(runtime.document.activeElement, first);
    last.focus(); runtime.app.handleDrawerFocusTrap(event);
    assert.equal(runtime.document.activeElement, first);
    runtime.app.handleDrawerFocusTrap({ ...event, shiftKey: true });
    assert.equal(runtime.document.activeElement, last);
    assert.equal(prevented, 3);
});

test('毎tickで変わらないライブ通知の本文を書き換えない', () => {
    const { app } = createRuntime(); app.updateDisplay();
    const countWrites = app.dom.countDisplay.textWrites, breakWrites = app.dom.nextBreakDisplay.textWrites;
    app.timeLeft -= 1; app.updateDisplay();
    assert.equal(app.dom.countDisplay.textWrites, countWrites);
    assert.equal(app.dom.nextBreakDisplay.textWrites, breakWrites);
    app.completedCount += 1; app.currentBreakTime = 10; app.updateDisplay();
    assert.equal(app.dom.countDisplay.textWrites, countWrites + 1);
    assert.equal(app.dom.nextBreakDisplay.textWrites, breakWrites + 1);
});

test('公開runtimeがvisibilityの所有者なら元の補正を実行しない', () => {
    const runtime = createRuntime(); runtime.app.bindEvents();
    runtime.app.__focusRuntimeHardeningInstalled = true; runtime.app.isRunning = true;
    runtime.document.visibilityState = 'hidden'; runtime.dispatch('visibilitychange');
    assert.equal(runtime.app.hiddenTimestamp, null);
});
