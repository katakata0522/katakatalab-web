const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadModule(filename, context) {
    const source = fs.readFileSync(path.join(__dirname, '../js', filename), 'utf8')
        .replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '')
        .replace(/\bexport /g, '');
    vm.createContext(context);
    vm.runInContext(source, context);
    return context;
}

function classList() {
    const classes = new Set();
    return {
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        contains: name => classes.has(name),
        toggle: name => classes.has(name) ? classes.delete(name) : classes.add(name)
    };
}

function setupEntry(startAudio) {
    const timers = [];
    const saves = [];
    const sounds = [];
    const warnings = [];
    const modal = { classList: classList(), style: {} };
    const main = { classList: classList(), inert: true };
    const elements = { 'login-modal': modal, 'main-interface': main, 'user-name-input': { value: '  はかせ  ' } };
    const context = loadModule('main.js', {
        startAudio, playSound: sound => sounds.push(sound),
        console: { warn: (...args) => warnings.push(args) },
        document: { getElementById: id => elements[id], addEventListener() {} },
        normalizeProfileName: value => value.trim(),
        userProfile: { loginCount: 0 }, addBadge() {}, batchProfileUpdates: callback => callback(),
        saveProfile() { saves.push({ ...context.userProfile }); }, updateProfileUI() {},
        setTimeout: callback => timers.push(callback), TIMING: { TRANSITION: 300 },
        setCategory() {}
    });
    return { context, timers, saves, sounds, warnings, modal, main };
}

test('音声が保留のままでもプロフィール保存と入室が進み、連打を一度にまとめる', async () => {
    let resolveAudio;
    let audioCalls = 0;
    const audio = new Promise(resolve => { resolveAudio = resolve; });
    const s = setupEntry(() => { audioCalls++; return audio; });
    s.context.enterLab();
    s.context.enterLab();
    assert.equal(audioCalls, 1);
    assert.equal(s.saves.length, 1);
    assert.equal(s.saves[0].name, 'はかせ');
    assert.equal(s.context.userProfile.loginCount, 1);
    assert.equal(s.timers.length, 1);
    s.timers[0]();
    assert.equal(s.modal.style.display, 'none');
    assert.equal(s.main.inert, false);
    assert.equal(s.main.classList.contains('opacity-100'), true);
    resolveAudio();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(s.sounds, ['success']);
    s.context.enterLab();
    assert.equal(s.context.userProfile.loginCount, 1);
});

test('音声開始の拒否と同期例外でも入室できる', async () => {
    for (const startAudio of [() => Promise.reject(new Error('blocked')), () => { throw new Error('unsupported'); }]) {
        const s = setupEntry(startAudio);
        s.context.enterLab();
        s.timers[0]();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(s.main.inert, false);
        assert.equal(s.saves.length, 1);
        assert.equal(s.warnings.length, 1);
    }
});

function setupSettings() {
    const saved = [];
    const context = loadModule('ui.js', {
        userProfile: { textSize: 'normal', reduceMotion: false },
        saveProfile() { saved.push({ ...context.userProfile }); },
        playSound() {},
        document: { body: { classList: classList() }, getElementById: () => null }
    });
    return { context, saved };
}

test('文字サイズと動きを減らす設定は操作直後に保存する', () => {
    const s = setupSettings();
    s.context.setTextSize('large');
    assert.equal(s.saved.length, 1);
    assert.equal(s.saved[0].textSize, 'large');
    s.context.toggleMotion();
    assert.equal(s.saved.length, 2);
    assert.equal(s.saved[1].reduceMotion, true);
    s.context.setTextSize('normal');
    s.context.toggleMotion();
    assert.deepEqual(s.saved[3], { textSize: 'normal', reduceMotion: false });
});

test('保存しない設定適用ではストレージとプロフィールを書き換えない', () => {
    const s = setupSettings();
    s.context.setTextSize('large', false);
    s.context.toggleMotion(false);
    assert.equal(s.saved.length, 0);
    assert.equal(s.context.userProfile.textSize, 'normal');
    assert.equal(s.context.userProfile.reduceMotion, false);
    assert.equal(s.context.document.body.classList.contains('text-large'), true);
    assert.equal(s.context.document.body.classList.contains('reduce-motion'), true);
});

function setupAudio(profile) {
    let contextsCreated = 0;
    const icon = { textContent: 'volume_up', classList: classList() };
    const slider = { value: -20 };
    const gain = { gain: { value: 0 }, connect() {} };
    const context = loadModule('audio.js', {
        userProfile: { ...profile }, saveProfile() {},
        document: { querySelectorAll: () => [icon], getElementById: () => slider },
        window: { AudioContext: class {
            constructor() { contextsCreated++; this.state = 'running'; }
            createGain() { return gain; }
        } }
    });
    return { context, icon, slider, gain, contextsCreated: () => contextsCreated };
}

test('保存済みミュートと音量を音声コンテキストなしで復元し、最初の切替で解除する', () => {
    const s = setupAudio({ isMuted: true, volumeDb: -8 });
    s.context.restoreAudioSettings();
    assert.equal(s.contextsCreated(), 0);
    assert.equal(s.icon.textContent, 'volume_off');
    assert.equal(s.slider.value, -40);
    assert.equal(s.context.getIsMuted(), true);
    s.context.toggleMute();
    assert.equal(s.context.userProfile.isMuted, false);
    assert.equal(s.slider.value, -8);
    assert.equal(s.contextsCreated(), 0);
    s.context.initAudio();
    assert.equal(s.contextsCreated(), 1);
    assert.equal(s.gain.gain.value, Math.pow(10, -8 / 40));
});

test('保存済み音量は初期画面から表示され、読み込み後に設定を復元する', () => {
    const s = setupAudio({ isMuted: false, volumeDb: -12 });
    s.context.restoreAudioSettings();
    assert.equal(s.slider.value, -12);
    assert.equal(s.icon.textContent, 'volume_up');
    assert.equal(s.contextsCreated(), 0);
    const main = fs.readFileSync(path.join(__dirname, '../js/main.js'), 'utf8');
    assert.match(main, /const hasProfile = loadProfile\(\);\s*restoreAudioSettings\(\);/);
});

test('音声の再開が拒否されても未処理のPromise拒否を残さない', async () => {
    const s = setupAudio({ isMuted: false, volumeDb: -20 });
    const listeners = new Map();
    const warnings = [];
    s.context.console = { warn: (...args) => warnings.push(args) };
    s.context.document.documentElement = {
        addEventListener: (name, callback) => listeners.set(name, callback),
        removeEventListener: name => listeners.delete(name)
    };
    const audio = s.context.initAudio();
    audio.state = 'suspended';
    audio.resume = () => Promise.reject(new Error('blocked'));
    s.context.initAudioEventListeners();
    listeners.get('mousedown')();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(warnings.length, 1);
    assert.equal(listeners.size, 3);
});

test('メニュー操作は起動後の履歴を更新してから開閉する', () => {
    let click;
    const calls = [];
    const button = { addEventListener: (name, handler) => { if (name === 'click') click = handler; } };
    const context = loadModule('main.js', {
        TAB_BUTTON_IDS: [],
        document: { getElementById: id => id === 'menu-toggle-btn' ? button : null, querySelectorAll: () => [], addEventListener() {} },
        updateRecentUI: () => calls.push('recent'), toggleMenu: () => calls.push('toggle')
    });
    context.bindUiEvents();
    click();
    assert.deepEqual(calls, ['recent', 'toggle']);
});

test('モーダル表示中はフッターを含む背景全体をinertにし、閉じると解除する', () => {
    const wrapper = { inert: false, setAttribute() { this.inert = true; }, removeAttribute() { this.inert = false; } };
    const header = { ...wrapper };
    const modal = { classList: classList(), querySelectorAll: () => [], addEventListener() {}, removeEventListener() {} };
    const elements = { 'main-interface': wrapper, 'settings-modal': modal };
    const context = loadModule('ui.js', {
        playSound() {},
        document: { getElementById: id => elements[id], querySelector: selector => selector === 'header' ? header : null },
        clearTimeout() {}
    });
    context.openModal('settings-modal');
    assert.equal(wrapper.inert, true);
    assert.equal(header.inert, true);
    context.closeModal('settings-modal');
    assert.equal(wrapper.inert, false);
    assert.equal(header.inert, false);
});
