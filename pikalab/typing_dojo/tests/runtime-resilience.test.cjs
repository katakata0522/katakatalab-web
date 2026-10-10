const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 修正前後へ同じ操作列を適用する。ブラウザ、外部依存、ソケット、実時間待機は不要。
const projectRoot = process.env.TYPING_DOJO_TEST_ROOT
    ? path.resolve(process.env.TYPING_DOJO_TEST_ROOT)
    : path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(projectRoot, 'script.js'), 'utf8');
const coreSource = fs.readFileSync(path.join(projectRoot, 'typing-core.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const SESSION_KEY = 'typing_dojo_session';
const STATS_KEY = 'typing_dojo_stats';
const GOAL_KEY = 'typing_dojo_daily_goal';
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

class Events {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, callback, options = {}) {
        const listeners = this.listeners.get(type) || [];
        listeners.push({ callback, once: !!options.once });
        this.listeners.set(type, listeners);
    }
    removeEventListener(type, callback) {
        this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item.callback !== callback));
    }
    dispatchEvent(event) {
        event.target ||= this;
        event.currentTarget = this;
        event.preventDefault ||= function () { this.defaultPrevented = true; };
        event.stopPropagation ||= function () { this.cancelBubble = true; };
        for (const listener of [...(this.listeners.get(event.type) || [])]) {
            if (listener.once) this.removeEventListener(event.type, listener.callback);
            listener.callback.call(this, event);
        }
        if (event.bubbles && !event.cancelBubble) this.parentElement?.dispatchEvent(event);
        return !event.defaultPrevented;
    }
}

function createDocument() {
    const document = new Events();
    class Element extends Events {
        constructor(tag = 'div') {
            super();
            this.tagName = tag.toUpperCase();
            this.nodeType = 1;
            this.children = [];
            this.attributes = new Map();
            this.dataset = {};
            this.style = {};
            this.className = '';
            this._text = '';
            this._html = null;
            this._value = '';
            this.selectionStart = 0;
            this.selectionEnd = 0;
            this.disabled = false;
            this.focusCount = 0;
            this.classList = {
                add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(' '); },
                remove: (...names) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); },
                contains: name => this.className.split(/\s+/).includes(name),
                toggle: (name, force) => {
                    const on = force === undefined ? !this.classList.contains(name) : force;
                    this.classList[on ? 'add' : 'remove'](name);
                    return on;
                }
            };
        }
        get value() { return this._value; }
        set value(value) { this._value = String(value ?? ''); this.selectionStart = this.selectionEnd = this._value.length; }
        get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
        set textContent(value) { this._text = String(value ?? ''); this.children = []; this._html = null; }
        get innerHTML() { return this._html ?? escapeHTML(this._text) + this.children.map(child => child.outerHTML ?? escapeHTML(child.textContent)).join(''); }
        set innerHTML(value) { this._html = String(value); this._text = ''; this.children = []; }
        get outerHTML() { return `<${this.tagName.toLowerCase()}${this.className ? ` class="${escapeHTML(this.className)}"` : ''}>${this.innerHTML}</${this.tagName.toLowerCase()}>`; }
        get isConnected() { return document.body.contains(this) || document.head.contains(this); }
        get hidden() { return this.hasAttribute('hidden'); }
        set hidden(value) { value ? this.setAttribute('hidden', '') : this.removeAttribute('hidden'); }
        setAttribute(name, value) {
            this.attributes.set(name, String(value));
            if (name === 'id') this.id = String(value);
            if (name === 'class') this.className = String(value);
            if (name === 'checked') this.checked = true;
            if (name === 'value') this.value = value;
            if (name === 'type') this.type = value;
            if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
        }
        getAttribute(name) { return name === 'class' ? this.className : name === 'id' ? this.id || null : this.attributes.get(name) ?? null; }
        hasAttribute(name) { return this.attributes.has(name); }
        removeAttribute(name) { this.attributes.delete(name); }
        appendChild(child) {
            child.remove?.();
            child.parentElement = this;
            this.children.push(child);
            this._html = null;
            return child;
        }
        append(...children) { children.forEach(child => this.appendChild(child)); }
        replaceChildren(...children) { this.textContent = ''; this.append(...children); }
        remove() {
            if (this.parentElement?.children) this.parentElement.children = this.parentElement.children.filter(child => child !== this);
            this.parentElement = null;
        }
        contains(node) { return this === node || this.children.some(child => child.contains?.(node)); }
        matches(selector) {
            return selector.split(',').some(part => {
                const candidate = part.trim();
                const ancestry = candidate.split(/\s+/);
                if (ancestry.length > 1) {
                    if (!this.matches(ancestry.pop())) return false;
                    let ancestor = this.parentElement;
                    while (ancestor?.matches) {
                        if (ancestor.matches(ancestry.join(' '))) return true;
                        ancestor = ancestor.parentElement;
                    }
                    return false;
                }
                const exclusions = [...candidate.matchAll(/:not\(([^)]+)\)/g)].map(match => match[1]);
                if (exclusions.some(exclusion => this.matches(exclusion))) return false;
                const clean = candidate.replace(/:not\([^)]+\)/g, '');
                const tag = clean.match(/^[a-z]+/i)?.[0];
                if (tag && this.tagName !== tag.toUpperCase()) return false;
                for (const match of clean.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(match[1])) return false;
                const id = clean.match(/#([\w-]+)/)?.[1];
                if (id && this.id !== id) return false;
                for (const match of clean.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) {
                    const actual = match[1] === 'disabled' && this.disabled ? '' : this.getAttribute(match[1]);
                    if (actual === null || (match[2] !== undefined && actual !== match[2])) return false;
                }
                return true;
            });
        }
        querySelectorAll(selector) { return this.children.flatMap(child => child.nodeType === 1 ? [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)] : []); }
        querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
        closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest?.(selector) || null; }
        getBoundingClientRect() { return { top: 100, bottom: 150, left: 20, right: 200 }; }
        scrollIntoView() {}
        focus() { if (!this.disabled) { this.focusCount++; document.activeElement = this; } }
        setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
        click() { if (!this.disabled) this.dispatchEvent({ type: 'click', bubbles: true }); }
    }
    document.body = new Element('body');
    document.head = new Element('head');
    document.body.parentElement = document;
    document.head.parentElement = document;
    document.activeElement = document.body;
    document.hidden = false;
    document.visibilityState = 'visible';
    document.readyState = 'loading';
    document.createElement = tag => new Element(tag);
    document.createTextNode = text => ({ nodeType: 3, textContent: String(text), parentElement: null });
    document.querySelectorAll = selector => [...document.head.querySelectorAll(selector), ...document.body.querySelectorAll(selector)];
    document.querySelector = selector => document.querySelectorAll(selector)[0] || null;
    document.getElementById = id => document.querySelector(`#${id}`);
    // 実HTMLからID・属性を読み、イベントに必要な階層をそのまま再現する。
    const body = htmlSource.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)[1]
        .replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    const stack = [document.body];
    for (const token of body.matchAll(/<\/?([a-z][\w-]*)\b([^>]*)>/gi)) {
        const tag = token[1].toLowerCase();
        if (token[0].startsWith('</')) {
            const index = stack.findLastIndex(element => element.tagName === tag.toUpperCase());
            if (index > 0) stack.length = index;
            continue;
        }
        const element = document.createElement(tag);
        for (const attr of token[2].matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
            element.setAttribute(attr[1], attr[2] ?? attr[3] ?? attr[4] ?? '');
        }
        stack.at(-1).appendChild(element);
        if (!['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'].includes(tag)) stack.push(element);
    }
    return { document, Element };
}

function createRuntime(options = {}) {
    const { document, Element } = createDocument();
    const pending = new Map();
    const history = new Map();
    let timerId = 0;
    let now = Date.parse('2026-10-03T12:00:00Z');
    const origin = now;
    class FakeDate extends Date {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
    }
    const schedule = (callback, delay, repeating) => {
        const id = ++timerId;
        const timer = { callback, at: now + Math.max(0, Number(delay) || 0), delay: Math.max(1, Number(delay) || 1), repeating };
        pending.set(id, timer);
        history.set(id, timer);
        return id;
    };
    const run = id => {
        const timer = pending.get(id);
        if (!timer) return;
        if (timer.repeating) timer.at = now + timer.delay;
        else pending.delete(id);
        timer.callback();
    };
    const clock = {
        pending, history,
        advance(ms) {
            const until = now + ms;
            let count = 0;
            while (true) {
                const next = [...pending].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
                if (!next) break;
                assert.ok(++count < 20000, 'タイマーが停止せずループした');
                now = Math.max(now, next[1].at);
                run(next[0]);
            }
            now = until;
        },
        elapse(ms) { now += ms; },
        flushDueOnce() {
            const due = [...pending].filter(([, timer]) => timer.at <= now).map(([id]) => id);
            due.forEach(run);
        },
        get now() { return now; }
    };
    const storage = new Map([['typing_dojo_tutorial_seen', '1'], ...Object.entries(options.storage || {})]);
    const storageControl = { failGet: false, failSet: false, failRemove: false, ...options.storageControl };
    const window = new Events();
    window.innerHeight = 800;
    window.scrollTo = () => {};
    class FakeEvent {
        constructor(type, init = {}) { this.type = type; Object.assign(this, init); }
        preventDefault() { this.defaultPrevented = true; }
        stopPropagation() { this.cancelBubble = true; }
    }
    const deterministicMath = Object.create(Math);
    deterministicMath.random = () => 0.8;
    const context = vm.createContext({
        document, window, HTMLElement: Element, Node: { TEXT_NODE: 3 }, Event: FakeEvent,
        ...(options.idioms ? { IDIOMS_DB: options.idioms } : {}),
        navigator: { maxTouchPoints: 0 }, Date: FakeDate, performance: { now: () => now - origin }, Math: deterministicMath,
        console: { warn() {}, error() {}, log() {} },
        localStorage: {
            getItem(key) { if (storageControl.failGet) throw new Error('read blocked'); return storage.get(key) ?? null; },
            setItem(key, value) { if (storageControl.failSet) throw new Error('quota exceeded'); storage.set(key, String(value)); },
            removeItem(key) { if (storageControl.failRemove) throw new Error('remove blocked'); storage.delete(key); }
        },
        setTimeout: (callback, delay = 0) => schedule(callback, delay, false),
        clearTimeout: id => pending.delete(id),
        setInterval: (callback, delay = 0) => schedule(callback, delay, true),
        clearInterval: id => pending.delete(id)
    });
    const stripExports = source => source.replace(/^export\s*\{[\s\S]*?\};?\s*$/gm, '');
    vm.runInContext(stripExports(coreSource), context, { filename: 'typing-core.js' });
    const executable = stripExports(appSource)
        .replace(/^import\s*'[^']+';\s*$/gm, '')
        .replace(/^import\s*\{[\s\S]*?\}\s*from\s*'[^']+';\s*$/gm, '');
    vm.runInContext(executable + `\nglobalThis.api = {
        get game() { return gameState; }, get app() { return appState; }, get elements() { return elements; },
        startGame, quitGame, endGame, setCurrentWord, tick, pauseGame, resumeGame,
        openSettings, closeSettings, openTutorial, closeTutorial, focusGameInput,
        saveSessionSnapshot, restoreSession, canRestoreSession, handleInput, handleKeydown,
        sendKeyToInput, handleTouchKeyPress, updateRomajiDisplay, incrementDailyGoalProgress,
        getCurrentDailyGoal, updateStatsWithSession, StorageManager
    };`, context, { filename: 'script.js' });
    document.dispatchEvent({ type: 'DOMContentLoaded' });
    document.readyState = 'complete';
    clock.advance(200);
    const runtime = { api: context.api, document, window, clock, storage, storageControl, context };
    runtime.start = (word = 'さくら', review = false) => {
        runtime.api.startGame('easy', review);
        clock.advance(4000);
        assert.equal(runtime.api.game.isRunning, true);
        runtime.api.setCurrentWord(word);
        runtime.api.elements.input.focus();
    };
    runtime.input = (value, extra = {}) => {
        runtime.api.elements.input.value = value;
        runtime.api.elements.input.dispatchEvent({ type: 'input', bubbles: true, inputType: 'insertText', ...extra });
    };
    runtime.keydown = (key, extra = {}) => {
        const event = { type: 'keydown', bubbles: true, key, code: key === ' ' ? 'Space' : `Key${key.toUpperCase()}`, ...extra };
        document.activeElement.dispatchEvent(event);
        return event;
    };
    runtime.typeKey = (key, extra = {}) => {
        const event = runtime.keydown(key, extra);
        const input = runtime.api.elements.input;
        if (!event.defaultPrevented && document.activeElement === input && !input.disabled && key.length === 1) {
            const position = input.selectionStart + key.length;
            const next = input.value.slice(0, input.selectionStart) + key + input.value.slice(input.selectionEnd);
            input.value = next;
            input.setSelectionRange(position, position);
            input.dispatchEvent({ type: 'input', bubbles: true, inputType: 'insertText', data: key });
        }
        return event;
    };
    runtime.snapshot = () => {
        runtime.api.saveSessionSnapshot({ includePaused: true });
        return JSON.parse(JSON.stringify(runtime.api.app.pendingSession));
    };
    runtime.hide = () => {
        document.hidden = true;
        document.visibilityState = 'hidden';
        document.dispatchEvent({ type: 'visibilitychange' });
    };
    return runtime;
}

function validSession() {
    const runtime = createRuntime();
    runtime.start();
    runtime.input('s');
    return { ...runtime.snapshot(), savedAt: Date.parse('2026-10-03T12:00:00Z') };
}

// 入力判定はinputに集約し、keydownは操作キーと入力欄への安全な橋渡しだけを扱う。
test('入力欄のkeydownだけではミスを加算せずinputで一度だけ判定する', () => {
    const runtime = createRuntime();
    runtime.start('さくら');
    const event = runtime.keydown('z');
    assert.equal(runtime.api.game.miss, 0);
    assert.equal(Boolean(event.defaultPrevented), false);
    runtime.input('z');
    assert.equal(runtime.api.game.miss, 1);
    assert.equal(runtime.api.elements.input.value, '');
    assert.deepEqual(Array.from(runtime.api.game.wrongWords), ['さくら']);
});

test('選択範囲の置換と途中挿入は実際の入力値で判定する', () => {
    const runtime = createRuntime();
    runtime.start('しんぶん');
    runtime.input('si');
    runtime.api.elements.input.setSelectionRange(1, 2);
    runtime.typeKey('h');
    assert.equal(runtime.api.elements.input.value, 'sh');
    assert.equal(runtime.api.game.miss, 0);
    runtime.typeKey('i');
    assert.equal(runtime.api.elements.input.value, 'shi');
    assert.equal(runtime.api.game.miss, 0);
});

test('正解一語の物理入力・貼り付け・タッチ入力はいずれも一度だけ得点する', () => {
    for (const mode of ['keyboard', 'paste', 'touch']) {
        const runtime = createRuntime();
        runtime.start('さ');
        if (mode === 'keyboard') ['s', 'a'].forEach(key => runtime.typeKey(key));
        if (mode === 'paste') runtime.input('SA!', { inputType: 'insertFromPaste' });
        if (mode === 'touch') ['s', 'a'].forEach(key => runtime.api.handleTouchKeyPress(key));
        assert.equal(runtime.api.game.score, 1, mode);
        assert.equal(runtime.api.game.typedChars, 2, mode);
        assert.equal(runtime.api.game.miss, 0, mode);
    }
});

test('IME変換中は表示値と成績を変更せず確定後の入力を一度だけ採点する', () => {
    const runtime = createRuntime();
    runtime.start('さ');
    const input = runtime.api.elements.input;
    input.dispatchEvent({ type: 'compositionstart', bubbles: true });
    runtime.input('sa', { isComposing: true, inputType: 'insertCompositionText' });
    assert.equal(runtime.api.game.score, 0);
    assert.equal(input.value, 'sa');
    input.dispatchEvent({ type: 'compositionend', bubbles: true, data: 'sa' });
    input.dispatchEvent({ type: 'input', bubbles: true, isComposing: false, inputType: 'insertCompositionText' });
    assert.equal(runtime.api.game.score, 1);
    assert.equal(runtime.api.game.miss, 0);
});

test('IME操作のEscape・Spaceと229キーコードはゲーム操作を起こさない', () => {
    for (const extra of [{ isComposing: true }, { keyCode: 229 }]) {
        for (const key of ['Escape', ' ']) {
            const runtime = createRuntime();
            runtime.start();
            runtime.keydown(key, extra);
            assert.equal(runtime.api.game.isRunning, true);
            assert.equal(runtime.api.game.isPaused, false);
        }
    }
});

test('リピートキーでミスや一時停止の反転を繰り返さない', () => {
    const runtime = createRuntime();
    runtime.start();
    runtime.keydown('z', { repeat: true });
    assert.equal(runtime.api.game.miss, 0);
    runtime.keydown(' ');
    assert.equal(runtime.api.game.isPaused, true);
    runtime.keydown(' ', { repeat: true });
    assert.equal(runtime.api.game.isPaused, true);
});

test('タッチのバックスペースは選択範囲を削除しカーソル位置を保つ', () => {
    const runtime = createRuntime();
    runtime.start('しんぶん');
    runtime.input('shi');
    runtime.api.elements.input.setSelectionRange(1, 3);
    runtime.api.handleTouchKeyPress('←');
    assert.equal(runtime.api.elements.input.value, 's');
    assert.equal(runtime.api.elements.input.selectionStart, 1);
    assert.equal(runtime.api.game.miss, 0);
});

test('設定を開くと計時を停止し設定キー入力やSpaceがゲームへ漏れない', () => {
    const runtime = createRuntime();
    runtime.start();
    const { api, clock } = runtime;
    api.elements.openSettingsBtnGame.focus();
    api.elements.openSettingsBtnGame.click();
    clock.advance(100);
    const settingsControl = api.elements.soundVolume;
    settingsControl.focus();
    const timeLeft = api.game.timeLeft;
    const elapsed = api.game.elapsedSeconds;
    runtime.typeKey('z');
    runtime.keydown(' ');
    clock.advance(2500);
    assert.equal(api.game.timeLeft, timeLeft);
    assert.equal(api.game.elapsedSeconds, elapsed);
    assert.equal(api.game.miss, 0);
    assert.equal(runtime.document.activeElement, settingsControl);
    assert.equal(api.elements.settingsOverlay.classList.contains('active'), true);
});

test('設定のEscapeは設定だけを閉じ一時停止済みゲームを勝手に再開しない', () => {
    const runtime = createRuntime();
    runtime.start();
    runtime.api.pauseGame();
    runtime.clock.advance(100);
    runtime.api.openSettings();
    runtime.clock.advance(100);
    runtime.keydown('Escape');
    assert.equal(runtime.api.elements.settingsOverlay.classList.contains('active'), false);
    assert.equal(runtime.api.game.isRunning, true);
    assert.equal(runtime.api.game.isPaused, true);
});

test('別の入力欄・ボタン・contenteditableへ移したフォーカスを奪わない', () => {
    for (const tag of ['input', 'button', 'div']) {
        const runtime = createRuntime();
        runtime.start();
        const other = runtime.document.createElement(tag);
        if (tag === 'div') { other.isContentEditable = true; other.setAttribute('contenteditable', 'true'); }
        runtime.document.body.appendChild(other);
        other.focus();
        runtime.keydown('z');
        assert.equal(runtime.document.activeElement, other, tag);
        assert.equal(runtime.api.game.miss, 0, tag);
        assert.equal(runtime.api.elements.input.value, '', tag);
    }
});

test('背景へ隠れたカウントダウンはゲームを自動開始しない', () => {
    const runtime = createRuntime();
    runtime.api.startGame('easy');
    runtime.clock.advance(500);
    const number = runtime.api.elements.countdownNumber.textContent;
    runtime.hide();
    runtime.clock.advance(5000);
    assert.equal(runtime.api.game.isRunning && !runtime.api.game.isPaused, false);
    assert.equal(runtime.api.elements.countdownNumber.textContent, number);
    assert.equal(runtime.api.game.elapsedSeconds, 0);
});

test('カウントダウンのEscapeで中断でき、入力は採点されない', () => {
    const runtime = createRuntime();
    runtime.start('さ');
    runtime.api.startGame('easy');
    runtime.input('sa');
    assert.equal(runtime.api.game.score, 0);
    runtime.keydown('Escape');
    runtime.clock.advance(5000);
    assert.equal(runtime.api.game.isRunning, false);
    assert.equal(runtime.api.elements.startScreen.classList.contains('active'), true);
});

test('キャンセル済みカウントダウンの配送済みコールバックが新セッションを変更しない', () => {
    const runtime = createRuntime();
    runtime.api.startGame('easy');
    const old = runtime.clock.history.get(runtime.api.game.countdownInterval).callback;
    runtime.api.startGame('normal');
    const countdown = runtime.api.game.countdownInterval;
    for (let i = 0; i < 4; i++) old();
    assert.equal(runtime.api.game.isCountingDown, true);
    assert.equal(runtime.api.game.countdownInterval, countdown);
    assert.equal(runtime.api.elements.countdownOverlay.classList.contains('active'), true);
});

test('遅れて配送されたタイマーは実際に経過した秒数を精算する', () => {
    const runtime = createRuntime();
    runtime.start();
    const initial = runtime.api.game.timeLeft;
    runtime.clock.elapse(5500);
    runtime.clock.flushDueOnce();
    assert.ok(runtime.api.game.timeLeft <= initial - 5);
    assert.ok(runtime.api.game.elapsedSeconds >= 5);
});

test('一時停止前の端数時間を保持し停止中の時間を計上しない', () => {
    const runtime = createRuntime();
    runtime.start();
    const initial = runtime.api.game.timeLeft;
    runtime.clock.advance(600);
    runtime.api.pauseGame();
    runtime.clock.advance(8000);
    runtime.api.resumeGame();
    runtime.clock.advance(600);
    runtime.api.pauseGame();
    assert.ok(runtime.api.game.timeLeft <= initial - 1);
    assert.ok(runtime.api.game.timeLeft > initial - 2);
    assert.ok(runtime.api.game.elapsedSeconds >= 1 && runtime.api.game.elapsedSeconds < 2);
});

test('古いtickと一時停止フォーカスのコールバックが再開後に干渉しない', () => {
    const runtime = createRuntime();
    runtime.start();
    const oldTick = runtime.clock.history.get(runtime.api.game.timerInterval).callback;
    runtime.api.pauseGame();
    const pauseFocus = [...runtime.clock.pending.values()].filter(timer => !timer.repeating).map(timer => timer.callback);
    runtime.api.resumeGame();
    const before = runtime.api.game.timeLeft;
    oldTick();
    pauseFocus.forEach(callback => callback());
    assert.equal(runtime.api.game.timeLeft, before);
    assert.equal(runtime.document.activeElement, runtime.api.elements.input);
});

test('設定を即座に閉じた後のフォーカス予約は閉じた設定へ移動しない', () => {
    const runtime = createRuntime();
    const trigger = runtime.api.elements.openSettingsBtn;
    trigger.focus();
    runtime.api.openSettings();
    runtime.api.closeSettings();
    runtime.clock.advance(100);
    assert.equal(runtime.document.activeElement, trigger);
});

test('終了処理は一度だけ記録し結果画面の古い予約でゲーム入力を奪わない', () => {
    const runtime = createRuntime();
    runtime.start('さ');
    runtime.input('sa');
    runtime.api.endGame();
    const once = runtime.api.app.stats.history.length;
    runtime.api.endGame();
    assert.equal(runtime.api.app.stats.history.length, once);
    const oldFocus = [...runtime.clock.pending.values()].filter(timer => !timer.repeating).map(timer => timer.callback);
    runtime.start();
    oldFocus.forEach(callback => callback());
    assert.equal(runtime.document.activeElement, runtime.api.elements.input);
});

test('正解直後の保存は次の問題を含み同じ問題の二重得点を防ぐ', () => {
    const runtime = createRuntime();
    runtime.start('さ');
    runtime.input('sa');
    const saved = JSON.parse(runtime.storage.get(SESSION_KEY));
    assert.equal(saved.score, 1);
    assert.equal(saved.currentWord, runtime.api.game.currentWord);
    assert.equal(saved.inputValue, runtime.api.elements.input.value);
    const restored = createRuntime();
    restored.clock.elapse(5000);
    assert.equal(restored.api.restoreSession(saved), true);
    restored.api.elements.input.dispatchEvent({ type: 'input', bubbles: true });
    assert.equal(restored.api.game.score, 1);
});

test('ボーナス語・復習モード・間違えた語を保存と復元で保持する', () => {
    const runtime = createRuntime();
    runtime.start('きせき');
    runtime.api.app.isReviewMode = true;
    runtime.api.app.reviewWords = ['きせき', 'さくら'];
    runtime.api.game.wrongWords = ['さくら'];
    runtime.api.setCurrentWord('きせき', true);
    const snapshot = runtime.snapshot();
    const restored = createRuntime();
    restored.clock.elapse(5000);
    assert.equal(restored.api.restoreSession(snapshot), true);
    assert.equal(restored.api.game.isBonusWord, true);
    assert.equal(restored.api.elements.bonusWordBadge.hidden, false);
    assert.equal(restored.api.app.isReviewMode, true);
    assert.deepEqual(Array.from(restored.api.app.reviewWords), ['きせき', 'さくら']);
    assert.deepEqual(Array.from(restored.api.game.wrongWords), ['さくら']);
});

test('通常セッションの復元は前回の復習フラグを引き継がない', () => {
    const snapshot = validSession();
    const runtime = createRuntime();
    runtime.api.app.isReviewMode = true;
    runtime.api.app.reviewWords = ['ねこ'];
    assert.equal(runtime.api.restoreSession(snapshot), true);
    assert.equal(runtime.api.app.isReviewMode, false);
});

test('空・ローマ字化できない・期限切れの保存データを復元しない', () => {
    const snapshot = validSession();
    for (const patch of [
        { currentWord: '', currentWordNormalized: '' },
        { currentWord: '!!!', currentWordNormalized: '!!!' },
        { savedAt: Date.parse('2020-01-01T00:00:00Z') },
        { savedAt: Date.parse('2030-01-01T00:00:00Z') },
        { timeLeft: 0 }
    ]) {
        const runtime = createRuntime();
        const corrupt = { ...snapshot, ...patch };
        assert.equal(runtime.api.canRestoreSession(corrupt), false, JSON.stringify(patch));
        assert.equal(runtime.api.restoreSession(corrupt), false, JSON.stringify(patch));
        assert.equal(runtime.api.game.isRunning, false);
    }
});

test('保存データの数値は有限非負に制限し不正な入力接頭辞を破棄する', () => {
    const snapshot = validSession();
    const runtime = createRuntime();
    const corrupt = {
        ...snapshot, timeLeft: 'Infinity', score: 'Infinity', miss: -50, combo: 'NaN', maxCombo: 1e300,
        typedChars: {}, elapsedSeconds: 'Infinity', dailyGoalProgressAtStart: -5, totalWords: 'Infinity', inputValue: 'szzzz'
    };
    if (runtime.api.restoreSession(corrupt)) {
        for (const key of ['timeLeft', 'score', 'miss', 'combo', 'maxCombo', 'typedChars', 'elapsedSeconds', 'totalWords', 'dailyGoalProgressAtStart']) {
            assert.ok(Number.isFinite(runtime.api.game[key]) && runtime.api.game[key] >= 0, key);
        }
        assert.equal(runtime.api.game.currentPrefixSet.has(runtime.api.elements.input.value), true);
    } else assert.equal(runtime.api.game.isRunning, false);
});

test('表示語と異なる保存済み正規化語を信頼せず不正パターンをヒントへ挿入しない', () => {
    const runtime = createRuntime();
    const corrupt = { ...validSession(), currentWord: 'さくら', currentWordNormalized: 'あ', activeRomajiPattern: '</span><img src=x onerror=alert(1)>', inputValue: 's' };
    if (runtime.api.restoreSession(corrupt)) {
        assert.equal(runtime.api.game.currentWordNormalized, 'さくら');
        assert.equal(runtime.api.game.currentPatternSet.has(runtime.api.game.activeRomajiPattern), true);
        assert.doesNotMatch(runtime.api.elements.romajiHint.innerHTML, /<img\b|onerror\s*=/i);
    }
});

test('ヒントは壊れた内部パターンもHTMLとして解釈しない', () => {
    const runtime = createRuntime();
    runtime.start();
    runtime.api.game.activeRomajiPattern = '<img src=x onerror=alert(1)>';
    runtime.api.updateRomajiDisplay('');
    assert.doesNotMatch(runtime.api.elements.romajiHint.innerHTML, /<img\b/i);
});

test('localStorage読取拒否でも起動し保存失敗中の日次進捗と統計をメモリに保持する', () => {
    const runtime = createRuntime({ storageControl: { failGet: true, failSet: true, failRemove: true } });
    runtime.api.closeTutorial();
    assert.equal(runtime.api.incrementDailyGoalProgress(1).progress, 1);
    assert.equal(runtime.api.incrementDailyGoalProgress(1).progress, 2);
    assert.equal(runtime.api.getCurrentDailyGoal().progress, 2);
    const result = { date: '2026-10-03', score: 2, miss: 0, accuracy: 100, missRate: 0, wpm: 20, maxCombo: 2 };
    runtime.api.updateStatsWithSession(result);
    runtime.api.updateStatsWithSession(result);
    assert.equal(runtime.api.app.stats.totalClears, 4);
    assert.equal(runtime.api.app.stats.history.length, 2);
    assert.equal(runtime.api.app.stats.streakDays, 1);
});

test('書き込み容量不足でも既存の進捗とセッション内の加算を失わない', () => {
    const runtime = createRuntime({
        storage: { [GOAL_KEY]: JSON.stringify({ date: '2026-10-03', target: 10, progress: 3 }) },
        storageControl: { failSet: true }
    });
    assert.equal(runtime.api.incrementDailyGoalProgress(1).progress, 4);
    assert.equal(runtime.api.incrementDailyGoalProgress(1).progress, 5);
    assert.equal(runtime.api.getCurrentDailyGoal().target, 10);
});

test('途中終了は成績を記録せず再開候補と動作タイマーを消す', () => {
    const runtime = createRuntime();
    runtime.start('さ');
    runtime.input('sa');
    runtime.api.quitGame();
    runtime.clock.advance(5000);
    assert.equal(runtime.api.game.isRunning, false);
    assert.equal(runtime.api.app.stats.history.length, 0);
    assert.equal(runtime.storage.has(STATS_KEY), false);
    assert.equal(runtime.storage.has(SESSION_KEY), false);
    assert.equal(runtime.api.app.pendingSession, null);
    assert.equal(runtime.api.elements.resumeCard.hidden, true);
});

test('IME変換中でも非表示・pagehide・設定を契機に確実に一時停止する', () => {
    for (const action of ['hide', 'pagehide', 'settings']) {
        const runtime = createRuntime();
        runtime.start();
        runtime.api.elements.input.dispatchEvent({ type: 'compositionstart', bubbles: true });
        runtime.input('s', { isComposing: true });
        if (action === 'hide') runtime.hide();
        if (action === 'pagehide') runtime.window.dispatchEvent({ type: 'pagehide', persisted: true });
        if (action === 'settings') runtime.api.openSettings();
        assert.equal(runtime.api.game.isPaused, true, action);
        const remaining = runtime.api.game.timeLeft;
        runtime.clock.advance(5000);
        assert.equal(runtime.api.game.timeLeft, remaining, action);
    }
});

test('保存済み目標進捗のInfinityは有限非負へ修正するか保存データごと拒否する', () => {
    const runtime = createRuntime();
    const corrupt = { ...validSession(), dailyGoalProgressAtStart: 'Infinity' };
    if (runtime.api.restoreSession(corrupt)) {
        assert.ok(Number.isFinite(runtime.api.game.dailyGoalProgressAtStart));
        assert.ok(runtime.api.game.dailyGoalProgressAtStart >= 0);
    } else assert.equal(runtime.api.game.isRunning, false);
});

test('置き換え済みフラッシュの古いコールバックが新しいフィードバックを消さない', () => {
    const runtime = createRuntime();
    runtime.start();
    runtime.input('z');
    const first = [...runtime.clock.pending.values()].find(timer => !timer.repeating && timer.delay === 200)?.callback;
    assert.equal(typeof first, 'function');
    runtime.clock.advance(100);
    runtime.input('z');
    first();
    assert.equal(runtime.api.elements.input.classList.contains('wrong'), true);
    runtime.clock.advance(200);
    assert.equal(runtime.api.elements.input.classList.contains('wrong'), false);
});

test('時間切れ後に配送された入力はボーナスや正解を加算せず結果を一度だけ作る', () => {
    const runtime = createRuntime();
    runtime.start('さ');
    runtime.api.game.timeLeft = 1;
    runtime.clock.elapse(1600);
    runtime.input('sa');
    assert.equal(runtime.api.game.isRunning, false);
    assert.equal(runtime.api.game.score, 0);
    assert.equal(runtime.api.elements.resultScreen.classList.contains('active'), true);
    assert.equal(runtime.api.getCurrentDailyGoal().progress, 0);
});

test('カウントダウン中のpagehideは中断しBFCacheから戻っても自動開始しない', () => {
    const runtime = createRuntime();
    runtime.api.startGame('easy');
    runtime.window.dispatchEvent({ type: 'pagehide', persisted: true });
    runtime.clock.advance(6000);
    runtime.window.dispatchEvent({ type: 'pageshow', persisted: true });
    assert.equal(runtime.api.game.isRunning, false);
    assert.equal(runtime.api.game.isCountingDown, false);
    assert.equal(runtime.api.elements.startScreen.classList.contains('active'), true);
});

test('破損JSONの各保存キーを読み込んでも起動し練習を開始できる', () => {
    const runtime = createRuntime({ storage: Object.fromEntries([
        SESSION_KEY, STATS_KEY, GOAL_KEY, 'typing_dojo_preferences', 'typing_dojo_highscore', 'wonder_school_profile_v2'
    ].map(key => [key, '{invalid'])) });
    runtime.start('さ');
    runtime.input('sa');
    assert.equal(runtime.api.game.score, 1);
    assert.equal(runtime.api.game.miss, 0);
});

test('保存済み問題プール・復習語は文字列だけから復元し語を補充できる', () => {
    const runtime = createRuntime();
    const snapshot = {
        ...validSession(), words: [null, {}, 42, '!!!', 'さくら'],
        wrongWords: [null, '<script>', 'さくら'], isReviewMode: true,
        reviewWords: [{}, 'ねこ', ''], sentenceBuckets: { full: '<img>' }
    };
    assert.equal(runtime.api.restoreSession(snapshot), true);
    assert.deepEqual(Array.from(runtime.api.game.words), ['さくら']);
    assert.deepEqual(Array.from(runtime.api.app.reviewWords), ['ねこ']);
    assert.deepEqual(Array.from(runtime.api.game.wrongWords), ['さくら']);
    runtime.input('sakura');
    assert.equal(runtime.api.game.score, 1);
    assert.ok(runtime.api.game.currentWord.length > 0);
});

test('設定から戻る時は進行中だったゲームだけを再開し入力へ戻す', () => {
    const runtime = createRuntime();
    runtime.start();
    runtime.api.openSettings();
    runtime.clock.advance(100);
    assert.equal(runtime.api.game.isPaused, true);
    runtime.api.closeSettings();
    assert.equal(runtime.api.game.isPaused, false);
    assert.equal(runtime.document.activeElement, runtime.api.elements.input);
    const before = runtime.api.game.timeLeft;
    runtime.clock.advance(1000);
    assert.equal(runtime.api.game.timeLeft, before - 1);
});

test('4096表示候補の外にある正しい長文パターンも入力・復元できる', () => {
    const runtime = createRuntime();
    const word = 'し'.repeat(14);
    runtime.start(word);
    runtime.input('ci'.repeat(13));
    assert.equal(runtime.api.game.miss, 0);
    const snapshot = runtime.snapshot();
    const restored = createRuntime();
    restored.clock.elapse(5000);
    assert.equal(restored.api.restoreSession(snapshot), true);
    assert.equal(restored.api.elements.input.value, 'ci'.repeat(13));
    restored.input('ci'.repeat(14));
    assert.equal(restored.api.game.score, 1);
    assert.equal(restored.api.game.miss, 0);
});

test('IMEのかな確定は変換中の文字を破壊せず一度だけ採点する', () => {
    const runtime = createRuntime();
    runtime.start('さ');
    const input = runtime.api.elements.input;
    input.dispatchEvent({ type: 'compositionstart', bubbles: true });
    runtime.input('さ', { isComposing: true });
    assert.equal(input.value, 'さ');
    assert.equal(runtime.api.game.miss, 0);
    input.dispatchEvent({ type: 'compositionend', bubbles: true, data: 'さ' });
    input.dispatchEvent({ type: 'input', bubbles: true, isComposing: false });
    assert.equal(runtime.api.game.score, 1);
    assert.equal(runtime.api.game.miss, 0);
    runtime.api.setCurrentWord('さ');
    runtime.input('✨!');
    assert.equal(runtime.api.game.score, 1);
});

test('フォーカス再試行までにユーザーが別の操作先を選んだら入力欄へ戻さない', () => {
    const runtime = createRuntime();
    runtime.start();
    const input = runtime.api.elements.input;
    const originalFocus = input.focus.bind(input);
    input.focus = () => {};
    runtime.document.activeElement = runtime.document.body;
    runtime.api.focusGameInput(2);
    input.focus = originalFocus;
    const button = runtime.api.elements.pauseBtn;
    button.focus();
    runtime.clock.advance(100);
    assert.equal(runtime.document.activeElement === button, true);
});

test('日付が変わるとメモリ上の日次進捗を新しい日に切り替える', () => {
    const runtime = createRuntime({ storageControl: { failSet: true } });
    runtime.api.incrementDailyGoalProgress(3);
    assert.equal(runtime.api.getCurrentDailyGoal().progress, 3);
    runtime.clock.elapse(24 * 60 * 60 * 1000);
    const next = runtime.api.getCurrentDailyGoal();
    assert.equal(next.date, '2026-10-04');
    assert.equal(next.progress, 0);
    assert.equal(runtime.api.incrementDailyGoalProgress(1).progress, 1);
});

test('再生成できる通常問題プールと文章バケットは毎回の保存へ複製しない', (t) => {
    const kana = ['あ', 'い', 'う', 'え', 'お'];
    const sentences = Array.from({ length: 200 }, (_, index) => {
        let code = index;
        let prefix = '';
        for (let i = 0; i < 4; i++) { prefix += kana[code % kana.length]; code = Math.floor(code / kana.length); }
        return { hiragana: `${prefix}きょうはいいてんきなのでこうえんであそびます` };
    });
    const runtime = createRuntime({ idioms: { words: [{ hiragana: 'さくら' }], sentences } });
    runtime.api.app.selectedUnit = 'sentence-long';
    runtime.start();
    const snapshot = runtime.snapshot();
    const bytes = Buffer.byteLength(JSON.stringify(snapshot), 'utf8');
    t.diagnostic(`200文章の保存サイズ: ${bytes} bytes`);
    assert.equal(Object.hasOwn(snapshot, 'words'), false);
    assert.equal(Object.hasOwn(snapshot, 'sentenceBuckets'), false);
    const restored = createRuntime({ idioms: { words: [{ hiragana: 'さくら' }], sentences } });
    restored.clock.elapse(5000);
    assert.equal(restored.api.restoreSession(snapshot), true);
    assert.ok(restored.api.game.words.length > 0);
    assert.ok(restored.api.game.sentenceBuckets.full.length > 0);
});
