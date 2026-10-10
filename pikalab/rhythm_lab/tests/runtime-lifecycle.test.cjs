const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PROJECTS_KEY = 'rhythmlab_user_projects_v2';
const LEGACY_PROJECTS_KEY = 'rhythmlab_user_presets';
const AUTOSAVE_KEY = 'rhythmlab_autosave_project_v2';
const LEGACY_AUTOSAVE_KEY = 'rhythmlab_autosave_grid';
const INSTRUMENTS = ['hihat', 'clap', 'snare', 'tom', 'kick'];

function plain(value) { return JSON.parse(JSON.stringify(value)); }

function pattern(step = 0) {
    return Object.fromEntries(INSTRUMENTS.map(name => [name,
        Array.from({ length: 16 }, (_, index) => name === 'kick' && index === step ? 1 : 0)
    ]));
}

function project(id, name, step = 0) {
    return { schemaVersion: 2, id, name, tempo: 132, pattern: pattern(step), createdAt: 1, updatedAt: 1 };
}

function deferred() {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
}

function createStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        values,
        writes: [],
        failSet: false,
        failRemove: false,
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) {
            if (this.failSet) throw new Error('保存容量が不足しています');
            const text = String(value);
            this.writes.push([key, text]);
            values.set(key, text);
        },
        removeItem(key) {
            if (this.failRemove) throw new Error('旧データを削除できません');
            values.delete(key);
        }
    };
}

class EventTarget {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, callback) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(callback);
    }
    dispatch(type, details = {}) {
        const event = { target: this, preventDefault() {}, stopPropagation() {}, ...details };
        for (const callback of this.listeners.get(type) || []) callback(event);
    }
}

class Element extends EventTarget {
    constructor(tagName = 'div') {
        super();
        this.tagName = tagName.toUpperCase();
        this.children = [];
        this.attributes = {};
        this.dataset = {};
        this.style = {};
        this.value = '';
        this._text = '';
        this._html = '';
        this.classes = new Set();
        this.classList = {
            add: (...names) => names.forEach(name => this.classes.add(name)),
            remove: (...names) => names.forEach(name => this.classes.delete(name)),
            contains: name => this.classes.has(name),
            toggle: (name, force) => {
                const enabled = force === undefined ? !this.classes.has(name) : force;
                if (enabled) this.classes.add(name);
                else this.classes.delete(name);
                return enabled;
            }
        };
    }
    get className() { return [...this.classes].join(' '); }
    set className(value) { this.classes = new Set(String(value).split(/\s+/).filter(Boolean)); }
    get innerHTML() { return this._html; }
    set innerHTML(value) { this._html = String(value); this.children = []; }
    get textContent() { return this._text; }
    set textContent(value) {
        this._text = String(value);
        this._html = this._text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    appendChild(child) { this.children.push(child); return child; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    querySelector(selector) { return selector === '.error-message' ? this.errorMessage : null; }
    focus() {}
    select() { this.selected = true; }
    setSelectionRange(start, end) { this.selectionRange = [start, end]; }
}

function createTone() {
    const state = {
        nodes: [], triggers: [], events: new Map(), draws: [], clears: [],
        resumes: 0, starts: 0, stops: 0, drawCancels: 0,
        failConstructor: null, failTransportStart: false
    };
    let nextEventId = 0;
    function nodeClass(kind) {
        return class {
            constructor(options) {
                if (state.failConstructor === kind) throw new Error(`${kind}の生成に失敗しました`);
                this.kind = kind;
                this.options = options;
                this.volume = { value: 0 };
                this.gain = { rampTo() {} };
                this.disposed = 0;
                state.nodes.push(this);
            }
            connect() { return this; }
            toDestination() { return this; }
            dispose() { this.disposed += 1; }
            triggerAttackRelease(...args) { state.triggers.push({ node: this, args }); }
        };
    }
    const Tone = {
        context: { state: 'suspended' },
        async start() { state.resumes += 1; Tone.context.state = 'running'; },
        Transport: {
            bpm: { value: 120, rampTo() {} },
            scheduleRepeat(callback, interval) {
                const id = ++nextEventId;
                state.events.set(id, { callback, interval });
                return id;
            },
            clear(id) { state.clears.push(id); state.events.delete(id); },
            start() {
                state.starts += 1;
                if (state.failTransportStart) throw new Error('Transportを開始できません');
            },
            stop() { state.stops += 1; }
        },
        Draw: {
            schedule(callback, time) { state.draws.push({ callback, time }); },
            // キャンセル時点で配信済みだった描画も手動実行して、世代の検証を行う。
            cancel() { state.drawCancels += 1; }
        }
    };
    for (const kind of ['Limiter', 'Gain', 'MembraneSynth', 'NoiseSynth', 'MetalSynth']) {
        Tone[kind] = nodeClass(kind);
    }
    return { Tone, state };
}

function createRuntime(options = {}) {
    const storage = options.storage || createStorage();
    const audio = createTone();
    const alerts = [];
    const clipboardCalls = [];
    const copyCommands = [];
    const document = new EventTarget();
    Object.assign(document, {
        readyState: 'loading', visibilityState: 'visible',
        body: new Element('body'), documentElement: new Element('html'),
        createElement: tagName => new Element(tagName), contains: () => true,
        execCommand(command) {
            copyCommands.push(command);
            if (options.copyFallback === 'throw') throw new Error('コピー操作が拒否されました');
            return options.copyFallback === true;
        }
    });
    const window = new EventTarget();
    Object.assign(window, {
        location: { protocol: 'https:', host: 'example.test', pathname: '/rhythm_lab/', search: '' },
        PikaLabToneLoader: options.loader === undefined ? { load: async () => {} } : options.loader,
        confirm: () => true,
        matchMedia: () => ({ matches: false })
    });
    const timers = new Map();
    const errors = [];
    let nextTimerId = 0;
    const sandbox = {
        document, window, HTMLElement: Element, Tone: audio.Tone,
        confirm: window.confirm,
        alert: message => alerts.push(message),
        navigator: { clipboard: {
            async writeText(text) {
                clipboardCalls.push(text);
                if (options.rejectClipboard) throw new Error('クリップボードへの書き込みが拒否されました');
            }
        } },
        console: { error: (...args) => errors.push(args), warn: (...args) => errors.push(args), log() {} },
        URLSearchParams,
        btoa: text => Buffer.from(text).toString('base64'),
        atob: text => Buffer.from(text, 'base64').toString(),
        setTimeout(callback, delay) { timers.set(++nextTimerId, { callback, delay }); return nextTimerId; },
        clearTimeout(id) { timers.delete(id); },
        requestAnimationFrame(callback) { callback(); }
    };
    const access = { denied: Boolean(options.storageDenied) };
    Object.defineProperty(sandbox, 'localStorage', {
        get() {
            if (access.denied) throw new Error('localStorageへのアクセスが拒否されています');
            return storage;
        }
    });
    const context = vm.createContext(sandbox);
    const exposed = [
        'domCache', 'initGrid', 'initAudio', 'togglePlay', 'playOneShot',
        'playSoundAtTime', 'saveUserPreset', 'deleteUserPreset', 'loadPresetsFromStorage',
        'renderUserPresetList', 'saveAutosaveImmediately', 'saveAutosaveToStorage',
        'loadAutosaveFromStorage', 'updateVolume', 'toggleDarkMode', 'updateTempo',
        'applyGrid', 'toggleNote', 'setupEventListeners', 'copyShareLink'
    ];
    const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8')
        .replace('__test: {', `__test: { ${exposed.join(', ')},`);
    vm.runInContext(`${source}\nglobalThis.runtime = RhythmLab;`, context);
    const api = context.runtime;
    const cache = api.__test.domCache;
    for (const key of ['playBtn', 'playIcon', 'tempoDisplay', 'tempoSlider', 'volumeSlider',
        'volumeDisplay', 'stepIndicators', 'presetCurrentStatus', 'presetNameInput',
        'userPresetList', 'errorToast', 'darkIcon', 'lightIcon', 'shareLinkInput']) cache[key] = new Element();
    cache.errorToast.errorMessage = new Element();
    cache.errorToast.classList.add('hidden');
    api.__test.initGrid();
    api.__test.setupEventListeners();
    return {
        ...api.__test, getState: api.getState, getUserPresets: api.getUserPresets,
        storage, access, document, window, errors, alerts, clipboardCalls, copyCommands,
        audio: audio.state, Tone: audio.Tone,
        flushTimers(delay) {
            const selected = [...timers.entries()].filter(([, timer]) => timer.delay === delay);
            for (const [id, timer] of selected) { timers.delete(id); timer.callback(); }
        }
    };
}

for (const cancellation of ['再押下', '非表示', 'ページ離脱']) {
    test(`音声ロード中の初回再生は${cancellation}後に勝手に開始しない`, async () => {
        const gate = deferred();
        const runtime = createRuntime({ loader: { load: () => gate.promise } });
        const pending = runtime.togglePlay();
        let cancellationPending;
        if (cancellation === '再押下') cancellationPending = runtime.togglePlay();
        else if (cancellation === '非表示') {
            runtime.document.visibilityState = 'hidden';
            runtime.document.dispatch('visibilitychange');
            runtime.document.visibilityState = 'visible';
        } else runtime.window.dispatch('pagehide');
        gate.resolve();
        await Promise.all([pending, cancellationPending]);
        assert.equal(runtime.audio.starts, 0);
        assert.equal(runtime.audio.events.size, 0);
        assert.equal(runtime.getState().isPlaying, false);
        assert.equal(runtime.domCache.playIcon.textContent, 'play_arrow');
        await runtime.togglePlay();
        assert.equal(runtime.getState().isPlaying, true, '取消後の新しい再生要求は受け付ける');
        assert.equal(runtime.audio.events.size, 1);
    });
}

test('停止して再生し直した後に古い描画が届いても表示を変更しない', async () => {
    const runtime = createRuntime();
    await runtime.togglePlay();
    const oldEventId = [...runtime.audio.events.keys()][0];
    runtime.audio.events.get(oldEventId).callback(1.25);
    const oldDraw = runtime.audio.draws[0].callback;
    await runtime.togglePlay();
    assert.deepEqual(runtime.audio.clears, [oldEventId]);
    await runtime.togglePlay();
    const before = runtime.domCache.indicators.map(element => element.className);
    oldDraw();
    assert.deepEqual(runtime.domCache.indicators.map(element => element.className), before);
    const currentEvent = [...runtime.audio.events.values()][0];
    currentEvent.callback(2.5);
    runtime.audio.draws.at(-1).callback();
    assert.notEqual(runtime.domCache.indicators[0].className, before[0], '新しい再生の描画は反映する');
});

test('一時停止された音声コンテキストは既存の音声ノードを再利用して再開する', async () => {
    const runtime = createRuntime();
    assert.equal(await runtime.initAudio(), true);
    const originalNodes = [...runtime.audio.nodes];
    runtime.Tone.context.state = 'suspended';
    await runtime.playOneShot('hihat');
    assert.equal(runtime.Tone.context.state, 'running');
    assert.equal(runtime.audio.resumes, 2);
    assert.deepEqual(runtime.audio.nodes, originalNodes);
    assert.equal(runtime.audio.triggers.length, 1);
    assert.ok(originalNodes.every(node => node.disposed === 0));
});

for (const failure of ['未配置', '同期例外']) {
    test(`音声ローダーが${failure}でも次の操作で初期化を再試行できる`, async () => {
        const loader = failure === '未配置' ? null : { load() { throw new Error('ロード失敗'); } };
        const runtime = createRuntime({ loader });
        assert.equal(await runtime.initAudio(), false);
        assert.equal(runtime.getState().isAudioInit, false);
        runtime.window.PikaLabToneLoader = { load: async () => {} };
        assert.equal(await runtime.initAudio(), true);
        assert.equal(runtime.getState().isAudioInit, true);
        assert.equal(runtime.audio.nodes.filter(node => node.kind === 'Limiter').length, 1);
    });
}

test('MetalSynthには数値の音程と音価と時刻を渡し、NoiseSynthには音価と時刻だけを渡す', async () => {
    const runtime = createRuntime();
    await runtime.initAudio();
    runtime.playSoundAtTime('hihat', 12.5);
    runtime.playSoundAtTime('clap', 12.5);
    runtime.playSoundAtTime('snare', 12.5);
    runtime.playSoundAtTime('kick', 12.5);
    assert.deepEqual(runtime.audio.triggers.map(({ node, args }) => [node.kind, args]), [
        ['MetalSynth', [200, '32n', 12.5]],
        ['NoiseSynth', ['8n', 12.5]],
        ['NoiseSynth', ['8n', 12.5]],
        ['MembraneSynth', ['C1', '8n', 12.5]]
    ]);
    await runtime.playOneShot('hihat');
    assert.deepEqual(runtime.audio.triggers.at(-1).args, [200, '32n', undefined]);
});

test('音声ノードの途中生成に失敗した場合は生成済みノードを破棄して再試行する', async () => {
    const runtime = createRuntime();
    runtime.audio.failConstructor = 'NoiseSynth';
    assert.equal(await runtime.initAudio(), false);
    const partialNodes = [...runtime.audio.nodes];
    assert.ok(partialNodes.length >= 3, '出力と最初の楽器の生成後に失敗させる');
    assert.ok(partialNodes.every(node => node.disposed === 1));
    assert.equal(runtime.getState().isAudioInit, false);
    runtime.audio.failConstructor = null;
    assert.equal(await runtime.initAudio(), true);
    assert.ok(partialNodes.every(node => node.disposed === 1), '古いノードを重複破棄しない');
    assert.ok(runtime.audio.nodes.slice(partialNodes.length).every(node => node.disposed === 0));
});

test('Transportの開始例外でも登録済みイベントと再生UIを片付けて再試行できる', async () => {
    const runtime = createRuntime();
    runtime.audio.failTransportStart = true;
    await assert.doesNotReject(() => runtime.togglePlay());
    assert.equal(runtime.getState().isPlaying, false);
    assert.equal(runtime.getState().currentStep, 0);
    assert.equal(runtime.audio.events.size, 0);
    assert.equal(runtime.audio.clears.length, 1);
    assert.equal(runtime.domCache.playIcon.textContent, 'play_arrow');
    runtime.audio.failTransportStart = false;
    await runtime.togglePlay();
    assert.equal(runtime.getState().isPlaying, true);
    assert.equal(runtime.audio.events.size, 1);
});

for (const operation of ['作品保存', 'オートセーブ', '音量変更', 'テーマ変更']) {
    test(`localStorage自体の取得が拒否されても${operation}は例外を外へ出さない`, () => {
        const runtime = createRuntime({ storageDenied: true });
        runtime.domCache.presetNameInput.value = '消さない名前';
        runtime.applyGrid(pattern(3));
        if (operation === '作品保存') {
            assert.doesNotThrow(() => runtime.saveUserPreset());
            assert.equal(runtime.getUserPresets().length, 0);
            assert.equal(runtime.domCache.presetNameInput.value, '消さない名前');
        } else if (operation === 'オートセーブ') {
            assert.equal(runtime.saveAutosaveImmediately(true), false);
        } else if (operation === '音量変更') {
            assert.doesNotThrow(() => runtime.updateVolume('35'));
            assert.equal(runtime.domCache.volumeDisplay.textContent, '35');
        } else {
            assert.doesNotThrow(() => runtime.toggleDarkMode());
            assert.equal(runtime.document.documentElement.classList.contains('dark'), true);
        }
        assert.equal(runtime.domCache.errorToast.classList.contains('hidden'), false);
        assert.deepEqual(plain(runtime.getState().grid), pattern(3));
    });
}

test('保存容量不足では保存済み作品と編集中の名前とグリッドを維持し、再試行で保存する', async () => {
    const original = project('existing', '保存済み');
    const storage = createStorage({ [PROJECTS_KEY]: JSON.stringify([original]) });
    const runtime = createRuntime({ storage });
    runtime.loadPresetsFromStorage();
    runtime.renderUserPresetList();
    const originalUi = [...runtime.domCache.userPresetList.children];
    runtime.domCache.presetNameInput.value = '編集中';
    runtime.applyGrid(pattern(5));
    storage.failSet = true;
    assert.doesNotThrow(() => runtime.saveUserPreset());
    assert.deepEqual(plain(runtime.getUserPresets()).map(item => item.id), ['existing']);
    assert.deepEqual(runtime.domCache.userPresetList.children, originalUi);
    assert.equal(runtime.domCache.presetNameInput.value, '編集中');
    assert.deepEqual(plain(runtime.getState().grid), pattern(5));
    assert.deepEqual(JSON.parse(storage.getItem(PROJECTS_KEY)), [original]);
    assert.equal(runtime.saveAutosaveImmediately(true), false);
    assert.equal(storage.getItem(AUTOSAVE_KEY), null);
    storage.failSet = false;
    runtime.flushTimers(500);
    runtime.saveUserPreset();
    assert.equal(runtime.getUserPresets().length, 2);
    assert.equal(runtime.domCache.presetNameInput.value, '');
    assert.equal(runtime.saveAutosaveImmediately(true), true);
    assert.deepEqual(JSON.parse(storage.getItem(AUTOSAVE_KEY)).pattern, pattern(5));
    await Promise.resolve();
});

test('旧プリセットの削除だけ失敗しても移行済み作品を画面と保存先に残す', () => {
    const storage = createStorage({
        [LEGACY_PROJECTS_KEY]: JSON.stringify([{ name: '旧作品', data: pattern(4) }])
    });
    storage.failRemove = true;
    const runtime = createRuntime({ storage });
    assert.doesNotThrow(() => runtime.loadPresetsFromStorage());
    const loaded = plain(runtime.getUserPresets());
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].name, '旧作品');
    assert.deepEqual(loaded[0].data, pattern(4));
    assert.equal(loaded[0].tempo, 120);
    const migrated = JSON.parse(storage.getItem(PROJECTS_KEY));
    assert.equal(migrated[0].id, loaded[0].id);
    assert.deepEqual(migrated[0].pattern, pattern(4));
    assert.notEqual(storage.getItem(LEGACY_PROJECTS_KEY), null);
});

test('旧オートセーブの削除だけ失敗しても復元成功と移行済みデータを維持する', () => {
    const storage = createStorage({ [LEGACY_AUTOSAVE_KEY]: JSON.stringify(pattern(6)) });
    storage.failRemove = true;
    const runtime = createRuntime({ storage });
    assert.equal(runtime.loadAutosaveFromStorage(), true);
    assert.deepEqual(plain(runtime.getState().grid), pattern(6));
    assert.deepEqual(JSON.parse(storage.getItem(AUTOSAVE_KEY)).pattern, pattern(6));
    assert.notEqual(storage.getItem(LEGACY_AUTOSAVE_KEY), null);
});

test('別タブが順番に保存した作品を共存させ、古い一覧からの削除は対象IDだけを除く', async () => {
    const storage = createStorage({ [PROJECTS_KEY]: JSON.stringify([project('original', '最初の作品')]) });
    const first = createRuntime({ storage });
    const second = createRuntime({ storage });
    first.loadPresetsFromStorage();
    second.loadPresetsFromStorage();
    first.domCache.presetNameInput.value = 'タブA';
    first.applyGrid(pattern(2));
    first.saveUserPreset();
    const firstId = first.getUserPresets().find(item => item.name === 'タブA').id;
    second.domCache.presetNameInput.value = 'タブB';
    second.applyGrid(pattern(7));
    second.saveUserPreset();
    const combined = JSON.parse(storage.getItem(PROJECTS_KEY));
    assert.deepEqual(combined.map(item => item.name), ['最初の作品', 'タブA', 'タブB']);
    const secondId = combined.find(item => item.name === 'タブB').id;
    second.deleteUserPreset(0);
    assert.deepEqual(JSON.parse(storage.getItem(PROJECTS_KEY)).map(item => item.id), [firstId, secondId]);
    const oldIndex = first.getUserPresets().findIndex(item => item.id === firstId);
    first.deleteUserPreset(oldIndex);
    assert.deepEqual(JSON.parse(storage.getItem(PROJECTS_KEY)).map(item => item.id), [secondId]);
    assert.deepEqual(plain(first.getUserPresets()).map(item => item.id), [secondId]);
    await Promise.resolve();
});

for (const restored of [false, true]) {
    test(`未編集タブの非表示や離脱で別タブのオートセーブを上書きしない（${restored ? '復元あり' : '復元なし'}）`, () => {
        const original = { schemaVersion: 2, tempo: 98, pattern: pattern(2), updatedAt: 1 };
        const storage = createStorage(restored ? { [AUTOSAVE_KEY]: JSON.stringify(original) } : {});
        const idle = createRuntime({ storage });
        assert.equal(idle.loadAutosaveFromStorage(), restored);
        const editor = createRuntime({ storage });
        editor.applyGrid(pattern(9));
        editor.updateTempo(155);
        editor.saveAutosaveToStorage();
        assert.equal(editor.saveAutosaveImmediately(), true);
        const expected = storage.getItem(AUTOSAVE_KEY);
        const writes = storage.writes.length;
        idle.document.visibilityState = 'hidden';
        idle.document.dispatch('visibilitychange');
        idle.window.dispatch('pagehide');
        assert.equal(storage.getItem(AUTOSAVE_KEY), expected);
        assert.equal(storage.writes.length, writes);
        assert.deepEqual(JSON.parse(expected).pattern, pattern(9));
    });
}

test('編集済みタブは非表示時に最新グリッドを保存し、同じ離脱処理で重複保存しない', () => {
    const runtime = createRuntime();
    runtime.applyGrid(pattern(11));
    runtime.saveAutosaveToStorage();
    runtime.document.visibilityState = 'hidden';
    runtime.document.dispatch('visibilitychange');
    assert.deepEqual(JSON.parse(runtime.storage.getItem(AUTOSAVE_KEY)).pattern, pattern(11));
    runtime.window.dispatch('pagehide');
    assert.equal(runtime.storage.writes.filter(([key]) => key === AUTOSAVE_KEY).length, 1);
});


for (const fallback of [false, 'throw']) {
    test(`クリップボード拒否後の代替コピーが${fallback === false ? 'false' : '例外'}でも成功通知しない`, async () => {
        const runtime = createRuntime({ rejectClipboard: true, copyFallback: fallback });
        const link = 'https://example.test/rhythm_lab/?data=sample';
        runtime.domCache.shareLinkInput.value = link;
        await assert.doesNotReject(async () => {
            await runtime.copyShareLink();
            await new Promise(setImmediate);
        });
        assert.deepEqual(runtime.clipboardCalls, [link]);
        assert.deepEqual(runtime.copyCommands, ['copy']);
        assert.equal(runtime.alerts.length, 0);
        assert.equal(runtime.domCache.errorToast.classList.contains('hidden'), false);
        assert.equal(runtime.domCache.shareLinkInput.value, link);
        assert.equal(runtime.domCache.shareLinkInput.selected, true);
        assert.deepEqual(runtime.domCache.shareLinkInput.selectionRange, [0, link.length]);
    });
}

test('クリップボード拒否後に代替コピーが成功した場合だけ成功通知する', async () => {
    const runtime = createRuntime({ rejectClipboard: true, copyFallback: true });
    runtime.domCache.shareLinkInput.value = 'https://example.test/rhythm_lab/?data=sample';
    await runtime.copyShareLink();
    await new Promise(setImmediate);
    assert.deepEqual(runtime.copyCommands, ['copy']);
    assert.equal(runtime.alerts.length, 1);
    assert.equal(runtime.domCache.errorToast.classList.contains('hidden'), true);
});

test('クリップボードAPIが成功した場合は代替コピーせずに成功通知する', async () => {
    const runtime = createRuntime();
    const link = 'https://example.test/rhythm_lab/?data=sample';
    runtime.domCache.shareLinkInput.value = link;
    await runtime.copyShareLink();
    await new Promise(setImmediate);
    assert.deepEqual(runtime.clipboardCalls, [link]);
    assert.deepEqual(runtime.copyCommands, []);
    assert.equal(runtime.alerts.length, 1);
    assert.equal(runtime.domCache.errorToast.classList.contains('hidden'), true);
});

for (const failure of ['容量不足', '取得拒否']) {
    test(`強制オートセーブが${failure}で失敗しても離脱時に未保存データを再試行する`, () => {
        const runtime = createRuntime();
        runtime.applyGrid(pattern(13));
        runtime.updateTempo(143);
        if (failure === '容量不足') runtime.storage.failSet = true;
        else runtime.access.denied = true;
        assert.equal(runtime.saveAutosaveImmediately(true), false);
        assert.equal(runtime.storage.getItem(AUTOSAVE_KEY), null);
        runtime.storage.failSet = false;
        runtime.access.denied = false;
        runtime.window.dispatch('pagehide');
        const restored = JSON.parse(runtime.storage.getItem(AUTOSAVE_KEY));
        assert.notEqual(restored, null, '強制保存の失敗を未編集扱いにせず再試行する');
        assert.deepEqual(restored.pattern, pattern(13));
        assert.equal(restored.tempo, 143);
        runtime.window.dispatch('pagehide');
        assert.equal(runtime.storage.writes.filter(([key]) => key === AUTOSAVE_KEY).length, 1);
    });
}

for (const malformed of ['{壊れたJSON', '{"schemaVersion":2}']) {
    test(`保存済み作品が${malformed.startsWith('{壊') ? '壊れたJSON' : '配列以外'}なら新規保存で上書きしない`, () => {
        const storage = createStorage({ [PROJECTS_KEY]: JSON.stringify([project('original', '元の作品')]) });
        const runtime = createRuntime({ storage });
        runtime.loadPresetsFromStorage();
        runtime.renderUserPresetList();
        const originalUi = [...runtime.domCache.userPresetList.children];
        const originalPresets = plain(runtime.getUserPresets());
        storage.values.set(PROJECTS_KEY, malformed);
        runtime.domCache.presetNameInput.value = '保存待ちの作品';
        runtime.applyGrid(pattern(10));
        assert.doesNotThrow(() => runtime.saveUserPreset());
        assert.equal(storage.getItem(PROJECTS_KEY), malformed);
        assert.equal(storage.writes.length, 0);
        assert.deepEqual(plain(runtime.getUserPresets()), originalPresets);
        assert.deepEqual(runtime.domCache.userPresetList.children, originalUi);
        assert.equal(runtime.domCache.presetNameInput.value, '保存待ちの作品');
        assert.deepEqual(plain(runtime.getState().grid), pattern(10));
        assert.equal(runtime.domCache.errorToast.classList.contains('hidden'), false);
    });
}

test('復元済みタブで同じBPMの入力欄を離れても別タブの新しいオートセーブを上書きしない', () => {
    const storage = createStorage({ [AUTOSAVE_KEY]: JSON.stringify({
        schemaVersion: 2, tempo: 98, pattern: pattern(2), updatedAt: 1
    }) });
    const idle = createRuntime({ storage });
    assert.equal(idle.loadAutosaveFromStorage(), true);
    const editor = createRuntime({ storage });
    editor.applyGrid(pattern(12));
    editor.updateTempo(170);
    editor.saveAutosaveToStorage();
    editor.window.dispatch('pagehide');
    const expected = storage.getItem(AUTOSAVE_KEY);
    assert.deepEqual(JSON.parse(expected).pattern, pattern(12));
    assert.equal(JSON.parse(expected).tempo, 170);
    const writes = storage.writes.length;
    assert.equal(idle.domCache.tempoDisplay.value, '98');
    idle.domCache.tempoDisplay.dispatch('blur');
    idle.window.dispatch('pagehide');
    assert.equal(storage.getItem(AUTOSAVE_KEY), expected);
    assert.equal(storage.writes.length, writes);
});

for (const version of ['旧形式', 'v2']) {
    test(`IDなしの${version}作品は読み込み時の保存失敗後も保存先復旧時に対象だけ削除できる`, () => {
        const initial = version === '旧形式'
            ? [{ name: '削除対象', data: pattern(1) }, { name: '残す作品', data: pattern(8) }]
            : [project('unused-1', '削除対象', 1), project('unused-2', '残す作品', 8)]
                .map(({ id, ...item }) => item);
        const storageKey = version === '旧形式' ? LEGACY_PROJECTS_KEY : PROJECTS_KEY;
        const storage = createStorage({ [storageKey]: JSON.stringify(initial) });
        storage.failSet = true;
        const runtime = createRuntime({ storage });
        runtime.loadPresetsFromStorage();
        assert.deepEqual(plain(runtime.getUserPresets()).map(item => item.name), ['削除対象', '残す作品']);
        assert.equal(storage.writes.length, 0);
        assert.equal(storage.getItem(storageKey), JSON.stringify(initial));
        storage.failSet = false;
        runtime.deleteUserPreset(0);
        const saved = JSON.parse(storage.getItem(PROJECTS_KEY));
        assert.equal(saved.length, 1);
        assert.equal(saved[0].name, '残す作品');
        assert.deepEqual(saved[0].pattern, pattern(8));
        assert.deepEqual(plain(runtime.getUserPresets()).map(item => item.name), ['残す作品']);
    });
}

test('同一内容の旧作品が重複していても削除操作1回で1作品だけを削除する', () => {
    const legacy = { name: '同じ作品', data: pattern(4) };
    const storage = createStorage({ [LEGACY_PROJECTS_KEY]: JSON.stringify([legacy, legacy]) });
    storage.failSet = true;
    const runtime = createRuntime({ storage });
    runtime.loadPresetsFromStorage();
    assert.equal(runtime.getUserPresets().length, 2);
    storage.failSet = false;
    runtime.deleteUserPreset(1);
    const saved = JSON.parse(storage.getItem(PROJECTS_KEY));
    assert.equal(saved.length, 1);
    assert.equal(saved[0].name, '同じ作品');
    assert.deepEqual(saved[0].pattern, pattern(4));
    assert.equal(runtime.getUserPresets().length, 1);
});
