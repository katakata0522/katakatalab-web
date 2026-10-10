const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const quietConsole = { warn() {}, error() {} };
function loadModule(file, names, globals = {}) {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
        .replace(/^import .*;\r?\n/gm, '')
        .replace(/export const /g, 'const ');
    const context = vm.createContext({ console: quietConsole, ...globals });
    vm.runInContext(`${source}\nObject.assign(globalThis, { ${names.join(', ')} });`, context);
    return context;
}
function element() {
    const events = new Map();
    const classes = new Set();
    let writes = 0;
    const style = new Proxy({}, { set(target, key, value) { writes += 1; target[key] = value; return true; } });
    return {
        style, events, children: [], dataset: {},
        writes: () => writes,
        classList: {
            add(...values) { values.forEach(v => classes.add(v)); },
            remove(...values) { values.forEach(v => classes.delete(v)); },
            contains(value) { return classes.has(value); },
            toggle(value, force) { if (force) classes.add(value); else classes.delete(value); }
        },
        addEventListener(name, callback) { if (!events.has(name)) events.set(name, []); events.get(name).push(callback); },
        dispatch(name, event = {}) { (events.get(name) || []).forEach(callback => callback({ target: this, ...event })); },
        appendChild(child) { this.children.push(child); },
        getBoundingClientRect() { return { left: 0, top: 0 }; }
    };
}
function storageRuntime() {
    const values = new Map();
    let rejectWrites = false;
    const runtime = loadModule('state.js', ['StorageHelper', 'State'], {
        CONFIG: { STORAGE_KEY_BGM_MUTED: 'muted' }, normalizeSpaceLabState: () => ({ visited: [], solvedQuizzes: {}, readSecrets: [] }),
        localStorage: {
            getItem(key) { return values.get(key) ?? null; },
            setItem(key, value) { if (rejectWrites) throw new Error('QuotaExceededError'); values.set(key, value); },
            removeItem(key) { values.delete(key); }
        }
    });
    return { ...runtime, values, failWrites(value) { rejectWrites = value; } };
}
test('保存途中の容量不足でも最新値を読み、保存復旧後は永続化した値を読む', () => {
    const r = storageRuntime();
    assert.equal(r.StorageHelper.setItem('badge', 'old'), true);
    r.failWrites(true);
    assert.equal(r.StorageHelper.setItem('badge', 'new'), false);
    assert.equal(r.StorageHelper.getItem('badge'), 'new');
    r.failWrites(false);
    assert.equal(r.StorageHelper.setItem('badge', 'newest'), true);
    assert.equal(r.StorageHelper.getItem('badge'), 'newest');
    assert.equal(Object.keys(r.StorageHelper._fallbackMemory).length, 0);
    assert.equal(r.StorageHelper.getItem('toString', 'default'), 'default');
});

function audioRuntime({ state = 'running', resumeFailure = false, constructorFailure = false } = {}) {
    const nodes = [];
    const calls = { resume: 0, suspend: 0, close: 0 };
    const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
    function node(kind) {
        const value = { kind, frequency: param(), gain: param(), pan: param(), detune: param(), Q: param(),
            connections: [], starts: 0, stops: 0, disconnects: 0,
            connect(destination) { this.connections.push(destination); },
            start() { this.starts += 1; }, stop() { this.stops += 1; }, disconnect() { this.disconnects += 1; } };
        nodes.push(value);
        return value;
    }
    const ctx = { state, currentTime: 1, destination: {},
        createGain: () => node('gain'), createOscillator: () => node('oscillator'),
        createStereoPanner: () => node('panner'), createBiquadFilter: () => node('filter'),
        async resume() { calls.resume += 1; if (resumeFailure) throw new Error('blocked'); this.state = 'running'; },
        async suspend() { calls.suspend += 1; this.state = 'suspended'; },
        async close() { calls.close += 1; this.state = 'closed'; }
    };
    const document = { visibilityState: 'visible' };
    const State = { isMuted: false, audioInit: false, bgmStarted: false, saveMute() {} };
    const runtime = loadModule('audio-manager.js', ['AudioManager'], {
        State, document, localStorage: { getItem() { return null; } },
        window: { AudioContext: function () { if (constructorFailure) throw new Error('unavailable'); return ctx; } }
    });
    return { audio: runtime.AudioManager, ctx, State, document, nodes, calls,
        allowResume() { resumeFailure = false; }, allowConstructor() { constructorFailure = false; } };
}
test('BGMの4音源をゲインへ接続し、ensureを重ねても音源を重複作成しない', async () => {
    const r = audioRuntime();
    await Promise.all([r.audio.ensure(), r.audio.ensure()]);
    assert.equal(r.audio.bgmNodes.length, 4);
    assert.equal(r.nodes.filter(n => n.kind === 'oscillator').length, 8);
    for (const voice of r.audio.bgmNodes) {
        assert.ok(voice.osc.connections.includes(voice.vGain));
        assert.ok(voice.lfo.connections.includes(voice.lfoGain));
        assert.ok(voice.lfoGain.connections.includes(voice.vGain.gain));
        assert.ok(voice.panner.connections.includes(r.audio.masterGain));
    }
});
test('AudioContext作成や再開が失敗しても例外を漏らさず後の操作で再試行できる', async () => {
    const unavailable = audioRuntime({ constructorFailure: true });
    assert.equal(await unavailable.audio.ensure(), false);
    assert.equal(unavailable.State.audioInit, false);
    unavailable.allowConstructor();
    assert.equal(await unavailable.audio.ensure(), true);
    const blocked = audioRuntime({ state: 'suspended', resumeFailure: true });
    assert.equal(await blocked.audio.ensure(), false);
    blocked.allowResume();
    assert.equal(await blocked.audio.ensure(), true);
    assert.equal(blocked.audio.bgmNodes.length, 4);
});
test('非表示中の遅延効果音はAudioContextを再開せず、表示復帰で一度だけBGMを再開する', async () => {
    const r = audioRuntime();
    await r.audio.ensure();
    r.document.visibilityState = 'hidden';
    await r.audio.setPageVisible(false);
    const count = r.nodes.length;
    await r.audio.play('tone', 400);
    assert.equal(r.calls.resume, 0);
    assert.equal(r.nodes.length, count);
    assert.equal(r.ctx.state, 'suspended');
    assert.equal(r.audio.masterGain.gain.value, 0);
    r.document.visibilityState = 'visible';
    await r.audio.setPageVisible(true);
    assert.equal(r.calls.resume, 1);
    assert.equal(r.audio.bgmNodes.length, 4);
});
test('再開待ち中にタブが隠れても最後の表示状態に収束する', async () => {
    const r = audioRuntime({ state: 'suspended' });
    let release;
    r.ctx.resume = () => new Promise(resolve => { release = () => { r.ctx.state = 'running'; resolve(); }; });
    const initializing = r.audio.ensure();
    r.document.visibilityState = 'hidden';
    const hiding = r.audio.setPageVisible(false);
    release();
    await Promise.all([initializing, hiding]);
    assert.equal(r.ctx.state, 'suspended');
    assert.equal(r.audio.masterGain.gain.value, 0);
    assert.equal(r.State.bgmStarted, false);
});
test('ミュートを素早く切り替えても最終設定とアイコンと音声状態が一致する', async () => {
    const r = audioRuntime();
    await r.audio.ensure();
    const on = element(), off = element();
    const first = r.audio.toggleMute(on, off);
    const second = r.audio.toggleMute(on, off);
    await Promise.all([first, second]);
    assert.equal(r.State.isMuted, false);
    assert.equal(r.ctx.state, 'running');
    assert.equal(on.classList.contains('hidden'), false);
    assert.equal(off.classList.contains('hidden'), true);
});
test('効果音の終了とdisposeで音声ノードを切り離す', async () => {
    const r = audioRuntime();
    await r.audio.ensure();
    await r.audio.play('fx', 'levelUp');
    assert.equal(r.audio._activeEffects.size, 1);
    const sources = r.nodes.filter(n => n.kind === 'oscillator').slice(-2);
    sources[0].onended();
    assert.equal(r.audio._activeEffects.size, 1);
    sources[1].onended();
    assert.equal(r.audio._activeEffects.size, 0);
    await r.audio.play('fx', 'click');
    await r.audio.dispose();
    assert.equal(r.audio._activeEffects.size, 0);
    assert.equal(r.audio.bgmNodes.length, 0);
    assert.equal(r.State.audioInit, false);
    assert.equal(r.State.bgmStarted, false);
    assert.ok(r.nodes.every(n => n.disconnects > 0));
    assert.equal(r.calls.close, 1);
});

function canvasRuntime(extra = {}) {
    const canvas = element(), win = element();
    const timers = new Map();
    let nextTimer = 0;
    let clicked = 0;
    const ctx = new Proxy({ measureText() { return { width: 40 }; },
        createLinearGradient() { return { addColorStop() {} }; } },
        { get(target, key) { return key in target ? target[key] : () => {}; } });
    canvas.getContext = () => ctx;
    const UI = { DOM: { canvas, a11yContainer: element(), miniIndicator: element(),
        bgLayer: element(), starsLayer: element(), boundaryWarningLeft: element(), boundaryWarningRight: element() } };
    const State = { scrollX: 200, scrollVelocity: 0, totalWidth: 3000, viewportW: 800, viewportH: 600,
        planetData: [{ id: 'earth', cx: 400, cy: 300, r: 58, phase: 0 }], images: {}, visited: new Set(), isDragging: false };
    win._AppBridge = { handlePlanetClick() { clicked += 1; } };
    win.innerWidth = 800; win.innerHeight = 600;
    const document = { visibilityState: 'visible', createElement: () => element() };
    const context = loadModule('canvas-renderer.js', ['CanvasMap'], {
        State, UI, window: win, document, PLANETS: [], PLANET_RADII: {}, PLANET_GAP: {},
        CONFIG: { CANVAS: { FLOAT_SPEED: 0.7, FLOAT_AMPLITUDE: 12 } },
        performance: { now: () => 0 }, requestAnimationFrame() { return 1; }, cancelAnimationFrame() {},
        setTimeout(callback) { timers.set(++nextTimer, callback); return nextTimer; },
        clearTimeout(id) { timers.delete(id); },
        ...extra
    });
    context.CanvasMap.ctx = ctx;
    return { renderer: context.CanvasMap, State, UI, canvas, win, document, ctx, timers, clicked: () => clicked };
}
test('60Hzと120Hzで慣性移動の距離・減衰が一致する', () => {
    const a = canvasRuntime(), b = canvasRuntime();
    a.State.scrollVelocity = b.State.scrollVelocity = 20;
    for (let i = 0; i < 30; i++) a.renderer._advanceScroll(1);
    for (let i = 0; i < 60; i++) b.renderer._advanceScroll(0.5);
    assert.ok(Math.abs(a.State.scrollX - b.State.scrollX) < 1e-9);
    assert.ok(Math.abs(a.State.scrollVelocity - b.State.scrollVelocity) < 1e-9);
});
test('viewport DOMはスクロール時だけ更新し、負の弾性スクロールでも正しいtransformを使う', () => {
    const r = canvasRuntime();
    r.renderer._syncViewportDom();
    const writes = r.UI.DOM.a11yContainer.writes();
    for (let i = 0; i < 120; i++) r.renderer._syncViewportDom();
    assert.equal(r.UI.DOM.a11yContainer.writes(), writes);
    r.State.scrollX = -12;
    r.renderer._syncViewportDom();
    assert.equal(r.UI.DOM.a11yContainer.style.transform, 'translateX(12px)');
    r.State.scrollX = 0;
    r.State.totalWidth = 700;
    r.renderer._syncViewportDom();
    assert.equal(r.UI.DOM.bgLayer.style.transform, 'translateX(0px)');
});
test('ドラッグ中断・離してからのmousemove・右クリックを安全に扱う', () => {
    const r = canvasRuntime();
    r.renderer.bindEvents();
    r.canvas.dispatch('mousedown', { button: 2, clientX: 20, clientY: 30 });
    assert.equal(r.State.isDragging, false);
    r.canvas.dispatch('mousedown', { button: 0, clientX: 20, clientY: 30, timeStamp: 0 });
    r.win.dispatch('mousemove', { buttons: 1, clientX: 40, clientY: 30, timeStamp: 16 });
    assert.equal(r.State.isDragging, true);
    r.win.dispatch('blur');
    assert.equal(r.State.isDragging, false);
    assert.equal(r.State.scrollVelocity, 0);
    const x = r.State.scrollX;
    r.win.dispatch('mousemove', { buttons: 0, clientX: 100, clientY: 30 });
    assert.equal(r.State.scrollX, x);
    r.canvas.dispatch('touchstart', { touches: [{ identifier: 7, clientX: 20, clientY: 30 }], timeStamp: 0 });
    r.canvas.dispatch('touchcancel');
    assert.equal(r.State.isDragging, false);
    r.canvas.dispatch('touchend', { changedTouches: [{ identifier: 7, clientX: 20, clientY: 30 }] });
    assert.equal(r.clicked(), 0);
});
test('往復ドラッグや縦方向のスワイプを惑星タップと誤判定しない', () => {
    const r = canvasRuntime();
    r.renderer._planetAtPos = () => r.State.planetData[0];
    r.renderer.bindEvents();
    r.canvas.dispatch('mousedown', { button: 0, clientX: 200, clientY: 300, timeStamp: 0 });
    r.win.dispatch('mousemove', { buttons: 1, clientX: 250, clientY: 300, timeStamp: 16 });
    r.win.dispatch('mousemove', { buttons: 1, clientX: 200, clientY: 300, timeStamp: 32 });
    r.win.dispatch('mouseup', { button: 0, clientX: 200, clientY: 300 });
    assert.equal(r.clicked(), 0);
    r.canvas.dispatch('touchstart', { touches: [{ identifier: 1, clientX: 200, clientY: 250 }] });
    r.canvas.dispatch('touchend', { changedTouches: [{ identifier: 1, clientX: 200, clientY: 300 }] });
    assert.equal(r.clicked(), 0);
});
test('ホイールの行単位をピクセルへ換算してa11y位置も同期する', () => {
    const r = canvasRuntime();
    r.renderer.bindEvents();
    r.canvas.dispatch('wheel', { preventDefault() {}, deltaX: 0, deltaY: 3, deltaMode: 1 });
    assert.equal(r.State.scrollX, 248);
    assert.equal(r.UI.DOM.a11yContainer.style.transform, 'translateX(-248px)');
});
test('ラベル幅を再利用し、フォント読み込み後には測り直す', async () => {
    let loaded;
    const r = canvasRuntime({ document: { visibilityState: 'visible', fonts: {
        ready: Promise.resolve(), addEventListener(name, callback) { if (name === 'loadingdone') loaded = callback; }
    } } });
    r.renderer.resize = () => {};
    r.renderer.bindEvents = () => {};
    let measures = 0;
    r.ctx.measureText = () => { measures += 1; return { width: 40 }; };
    r.renderer.init();
    await Promise.resolve();
    r.renderer._drawLabel(r.ctx, '地球', 0, 0, false);
    r.renderer._drawLabel(r.ctx, '地球', 1, 0, true);
    assert.equal(measures, 1);
    loaded();
    r.renderer._drawLabel(r.ctx, '地球', 1, 0, true);
    assert.equal(measures, 2);
});
test('停止時にドラッグを解放し、非表示中は描画を再開しない', () => {
    const r = canvasRuntime();
    r.State.isDragging = true; r.State.scrollVelocity = 12;
    r.renderer.pause();
    assert.equal(r.State.isDragging, false);
    assert.equal(r.State.scrollVelocity, 0);
    r.document.visibilityState = 'hidden';
    r.renderer.play();
    assert.equal(r.renderer.loopActive, false);
});
function imageRuntime() {
    const images = [];
    const imageCanvas = { width: 2, height: 2, toDataURL: () => 'data:image/png;base64,fake',
        getContext: () => ({ drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(16).fill(255) }), putImageData() {} }) };
    const r = canvasRuntime({ PLANETS: [{ id: 'earth', image: 'earth.png' }], resolvePlanetImageUrl: x => x,
        document: { visibilityState: 'visible', createElement: () => imageCanvas },
        Image: class { constructor() { this.naturalWidth = 2; this.naturalHeight = 2; this.complete = false; images.push(this); }
            removeAttribute(name) { if (name === 'src') this.src = undefined; } }
    });
    return { ...r, images };
}
test('加工画像のデコードが終わらなくても画像読み込みは期限内に原画像で完了する', async () => {
    const r = imageRuntime();
    const loading = r.renderer.loadImages();
    r.images[0].onload();
    assert.equal(r.images.length, 2);
    assert.equal(r.timers.size, 1);
    [...r.timers.values()].forEach(callback => callback());
    await loading;
    assert.equal(r.State.images.earth, r.images[0]);
    assert.equal(r.images[0].onload, null);
    assert.equal(r.images[1].onload, null);
});
test('画像本体のタイムアウトは空URLを設定せずに処理を完了する', async () => {
    const r = imageRuntime();
    const loading = r.renderer.loadImages();
    [...r.timers.values()].forEach(callback => callback());
    await loading;
    assert.equal(r.images[0].src, undefined);
    assert.equal(r.State.images.earth, undefined);
});

test('リサイズ時にa11y惑星ボタンを再利用してフォーカスと最新の座標を保つ', () => {
    const r = canvasRuntime({ PLANETS: [{ id: 'earth', name: '地球' }], GLOW_COLORS: {},
        CONFIG: { CANVAS: { BASE_SCALE_MOBILE: 0.65, START_PAD_MOBILE: 60, START_PAD_PC: 120 } } });
    r.renderer._buildPlanetLayout();
    const button = r.UI.DOM.a11yContainer.children[0];
    button.onfocus();
    const oldEntry = button._planetEntry;
    r.State.viewportW = 400;
    r.renderer._buildPlanetLayout();
    assert.equal(r.UI.DOM.a11yContainer.children.length, 1);
    assert.equal(r.UI.DOM.a11yContainer.children[0], button);
    assert.equal(r.renderer._keyboardPlanet, button._planetEntry);
    assert.notEqual(button._planetEntry, oldEntry);
    assert.equal(button._planetEntry.r, 32.5);
    button.onclick();
    assert.equal(r.clicked(), 1);
});

test('透過マスク最適化で元のアルファ値を変えず平方根の回数を減らす', () => {
    const ratios = [0.945, 0.98, 0.915, 0.93];
    let oldRoots = 0, newRoots = 0;
    for (const size of [128, 256, 512]) {
        const center = size / 2;
        for (const ratio of ratios) {
            const radius = center * ratio;
            const radiusSquared = radius ** 2;
            const fadeSquared = (radius - 2) ** 2;
            for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
                const distance = Math.hypot(x - center, y - center);
                oldRoots += 1;
                const original = distance > radius ? 0 : distance > radius - 2 ? 255 * (radius - distance) / 2 : 255;
                const squared = (x - center) ** 2 + (y - center) ** 2;
                let optimized = 255;
                if (squared > radiusSquared) optimized = 0;
                else if (squared > fadeSquared) { optimized = 255 * (radius - Math.sqrt(squared)) / 2; newRoots += 1; }
                const actual = new Uint8ClampedArray([original, optimized]);
                assert.equal(actual[0], actual[1]);
            }
        }
    }
    assert.ok(newRoots / oldRoots < 0.02, `${newRoots} / ${oldRoots}`);
});

test('保存容量が初めから満杯でも既存の進捗は読み込める', () => {
    const r = storageRuntime();
    r.values.set('visited', '["earth"]');
    r.failWrites(true);
    assert.equal(r.StorageHelper.checkAvailability(), false);
    assert.equal(r.StorageHelper.getItem('visited'), '["earth"]');
    assert.equal(r.StorageHelper.setItem('visited', '["earth","mars"]'), false);
    r.failWrites(false);
    assert.equal(r.StorageHelper.setItem('visited', '["earth","mars","venus"]'), true);
    assert.equal(r.values.get('visited'), '["earth","mars","venus"]');
});

test('初期化と同じ操作でミュートしても音声コンテキストを確実に停止する', async () => {
    const r = audioRuntime();
    const initializing = r.audio.ensure();
    const muting = r.audio.toggleMute(element(), element());
    await Promise.all([initializing, muting]);
    assert.equal(r.State.isMuted, true);
    assert.equal(r.ctx.state, 'suspended');
    assert.equal(r.audio.masterGain.gain.value, 0);
    assert.equal(r.State.bgmStarted, false);
});

test('ミュート切替は既存ポータル設定の他フィールドを保ち、再読み込み後も維持する', async () => {
    const storage = storageRuntime();
    const key = 'wonder_school_profile_v2';
    storage.values.set(key, JSON.stringify({ isMuted: true, volumeDb: -12, theme: 'night', child: { name: 'test' } }));
    storage.State.init();
    assert.equal(storage.State.isMuted, true);
    const audio = audioRuntime();
    audio.State.isMuted = storage.State.isMuted;
    audio.State.saveMute = () => { storage.State.isMuted = audio.State.isMuted; storage.State.saveMute(); };
    await audio.audio.toggleMute(element(), element());
    assert.deepEqual(JSON.parse(storage.values.get(key)), { isMuted: false, volumeDb: -12, theme: 'night', child: { name: 'test' } });
    storage.State.isMuted = true;
    storage.State.init();
    assert.equal(storage.State.isMuted, false);
    assert.equal(storage.values.get('muted'), 'false');
});
test('ミュート保存で未作成・破損プロフィールを上書きせず、保存不可でもメモリー内の値を保持する', () => {
    const key = 'wonder_school_profile_v2';
    for (const raw of [undefined, '{broken', 'null', '[]', 'true']) {
        const r = storageRuntime();
        if (raw !== undefined) r.values.set(key, raw);
        r.State.isMuted = true;
        r.State.saveMute();
        assert.equal(r.values.get(key), raw);
        assert.equal(r.StorageHelper.getItem('muted'), 'true');
    }
    const r = storageRuntime();
    r.values.set(key, '{"isMuted":true,"volumeDb":-6}');
    r.failWrites(true);
    r.State.isMuted = false;
    r.State.saveMute();
    r.State.isMuted = true;
    r.State.init();
    assert.equal(r.State.isMuted, false);
});

test('停止中のリサイズは背景を一度だけ再描画し、ループ・慣性・ホバー・入力を進めない', () => {
    let requested = 0;
    const r = canvasRuntime({ requestAnimationFrame() { requested += 1; return requested; } });
    r.renderer._buildPlanetLayout = () => {};
    r.renderer._lastFrameTime = 42;
    r.renderer._shootingStars = [{ x: 10, y: 20, vx: 2, vy: 3, alpha: 1 }];
    r.renderer._hoverPoint = { x: 100, y: 200 };
    r.State.isDragging = true;
    r.State.scrollVelocity = 12;
    r.State.hoveredPlanet = r.State.planetData[0];
    r.canvas.style.cursor = 'grabbing';
    let draws = 0;
    r.ctx.clearRect = () => { draws += 1; };
    r.renderer.resize();
    assert.equal(draws, 1);
    assert.equal(requested, 0);
    assert.equal(r.renderer.loopActive, false);
    assert.equal(r.renderer._lastFrameTime, 42);
    assert.equal(r.State.scrollX, 200);
    assert.equal(r.State.scrollVelocity, 12);
    assert.equal(r.State.isDragging, true);
    assert.equal(r.State.hoveredPlanet, r.State.planetData[0]);
    assert.equal(r.canvas.style.cursor, 'grabbing');
    assert.equal(r.renderer._shootingStars[0].x, 10);
    assert.equal(r.renderer._shootingStars[0].alpha, 1);
});
