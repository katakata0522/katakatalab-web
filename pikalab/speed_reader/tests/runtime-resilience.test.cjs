const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 同じ振る舞いテストを修正前後に実行できる。ブラウザ・外部依存・実時間待ちは不要。
const projectRoot = process.env.SPEED_READER_TEST_ROOT
    ? path.resolve(process.env.SPEED_READER_TEST_ROOT)
    : path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(projectRoot, 'js', 'app.js'), 'utf8');
const constantsSource = fs.readFileSync(path.join(projectRoot, 'js', 'constants.js'), 'utf8');
const comprehensionSource = fs.readFileSync(path.join(projectRoot, 'js', 'comprehension.js'), 'utf8');
const HISTORY_KEY = 'pikalab_speed_reader_history';

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
        if (event.bubbles && !event.cancelBubble && this.parentElement) {
            this.parentElement.dispatchEvent(event);
        }
        return !event.defaultPrevented;
    }
}

function createDocument() {
    const document = new Events();
    const queuedCloses = [];
    document.flushDialogCloses = () => {
        const events = queuedCloses.splice(0);
        events.forEach(dispatch => dispatch());
    };
    class Element extends Events {
        constructor(tag = 'div') {
            super();
            this.tagName = tag.toUpperCase();
            this.nodeType = 1;
            this.children = [];
            this.childNodes = this.children;
            this.attributes = new Map();
            this.dataset = {};
            this.style = {};
            this.value = '';
            this._text = '';
            this.className = '';
            this.showCount = 0;
            this.classList = {
                add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(' '); },
                remove: (...names) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); },
                contains: name => this.className.split(/\s+/).includes(name),
                toggle: (name, force) => {
                    const enabled = force === undefined ? !this.classList.contains(name) : force;
                    this.classList[enabled ? 'add' : 'remove'](name);
                    return enabled;
                }
            };
        }
        get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
        set textContent(value) {
            this._text = String(value ?? '');
            this.children.forEach(child => { child.parentElement = null; });
            this.children.length = 0;
        }
        set innerHTML(value) { this.textContent = value; }
        get innerHTML() { return this.textContent; }
        get lastChild() { return this.children.at(-1) || null; }
        get open() { return this.hasAttribute('open'); }
        get isConnected() { return document.body.contains(this) || document.head.contains(this); }
        setAttribute(name, value) {
            this.attributes.set(name, String(value));
            if (name === 'id') this.id = String(value);
            if (name === 'class') this.className = String(value);
            if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = String(value);
        }
        getAttribute(name) {
            if (name === 'id') return this.id || null;
            if (name === 'class') return this.className;
            return this.attributes.has(name) ? this.attributes.get(name) : null;
        }
        hasAttribute(name) { return this.attributes.has(name); }
        removeAttribute(name) { this.attributes.delete(name); }
        appendChild(child) {
            child.remove?.();
            child.parentElement = this;
            this.children.push(child);
            return child;
        }
        append(...children) { children.forEach(child => this.appendChild(child)); }
        remove() {
            if (!this.parentElement?.children) return;
            const siblings = this.parentElement.children;
            const index = siblings.indexOf(this);
            if (index >= 0) siblings.splice(index, 1);
            this.parentElement = null;
        }
        after(child) {
            if (!this.parentElement?.children) return;
            child.parentElement = this.parentElement;
            this.parentElement.children.splice(this.parentElement.children.indexOf(this) + 1, 0, child);
        }
        contains(node) { return this === node || this.children.some(child => child.contains?.(node)); }
        matches(selector) {
            return selector.split(',').some(part => {
                const candidate = part.trim();
                if (candidate.includes(' ')) return false;
                const clean = candidate.replace(/:not\(\[disabled\]\)/g, '');
                if (clean !== candidate && this.disabled) return false;
                const tag = clean.match(/^[a-z]+/i)?.[0];
                if (tag && this.tagName !== tag.toUpperCase()) return false;
                for (const match of clean.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(match[1])) return false;
                if (clean.startsWith('#') && this.id !== clean.slice(1)) return false;
                for (const match of clean.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) {
                    const actual = match[1].startsWith('data-')
                        ? this.dataset[match[1].slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase())]
                        : this.getAttribute(match[1]);
                    if (actual == null || (match[2] !== undefined && actual !== match[2])) return false;
                }
                return true;
            });
        }
        querySelectorAll(selector) {
            return this.children.flatMap(child => child.nodeType === 1
                ? [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)] : []);
        }
        querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
        closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest?.(selector) || null; }
        getBoundingClientRect() { return { left: 100, top: 100, right: 600, bottom: 500 }; }
        focus() { document.activeElement = this; }
        click() { if (!this.disabled) this.dispatchEvent({ type: 'click', bubbles: true }); }
        showModal() { this.showCount++; this.setAttribute('open', ''); }
        close() {
            if (!this.open) return;
            this.removeAttribute('open');
            // ネイティブdialog.close()は属性を直ちに外し、closeイベントは別タスクで配送する。
            queuedCloses.push(() => this.dispatchEvent({ type: 'close' }));
        }
        // Escapeの既定動作はcancelが阻止されなければcloseイベントを発火する。
        escape() { if (this.dispatchEvent({ type: 'cancel' })) this.close(); }
    }
    document.body = new Element('body');
    document.head = new Element('head');
    document.body.parentElement = document;
    document.head.parentElement = document;
    document.activeElement = document.body;
    document.hidden = false;
    document.readyState = 'loading';
    document.createElement = tag => new Element(tag);
    document.createTextNode = text => ({ nodeType: 3, textContent: String(text), parentElement: null });
    document.querySelectorAll = selector => [...document.head.querySelectorAll(selector), ...document.body.querySelectorAll(selector)];
    document.querySelector = selector => document.querySelectorAll(selector)[0] || null;
    document.getElementById = id => document.querySelector(`#${id}`);
    return { document, Element };
}

function createRuntime(options = {}) {
    const { document, Element } = createDocument();
    const fixtures = {
        'reader-display': 'div', 'wpm-badge': 'span', 'chunk-badge': 'span', 'source-badge': 'span',
        'progress-bar': 'div', 'main-play-btn': 'button', 'wpm-slider': 'input', 'wpm-display': 'span',
        'custom-text': 'textarea', 'drop-zone': 'div', 'custom-file-input': 'input', 'file-select-btn': 'button',
        'parents-modal': 'dialog', 'parents-modal-open-btn': 'button', 'evaluation-modal': 'dialog'
    };
    for (const [id, tag] of Object.entries(fixtures)) {
        const element = document.createElement(tag);
        element.id = id;
        if (id === 'reader-display') {
            const area = document.createElement('section');
            document.body.appendChild(area);
            area.appendChild(element);
        } else document.body.appendChild(element);
    }
    for (const [id, action] of [['parents-modal', 'close-modal'], ['evaluation-modal', 'close-eval']]) {
        const button = document.createElement('button');
        button.dataset.action = action;
        document.getElementById(id).appendChild(button);
    }
    const pending = new Map();
    let nextTimer = 0;
    let now = Date.parse('2026-10-03T12:00:00Z');
    class FakeDate extends Date {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
    }
    const clock = {
        advance(ms) {
            const until = now + ms;
            let ticks = 0;
            while (true) {
                const due = [...pending].filter(([, timer]) => timer.at <= until)
                    .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
                if (!due) break;
                assert.ok(++ticks < 1000, 'タイマーが停止せずループした');
                now = Math.max(now, due[1].at);
                pending.delete(due[0]);
                due[1].callback();
            }
            now = until;
        },
        // メインスレッドがブロックされてタイマー配送だけが遅れる場合を再現する。
        elapseWithoutCallbacks(ms) { now += ms; },
        pending
    };
    const readers = [];
    class FakeFileReader {
        static EMPTY = 0;
        static LOADING = 1;
        static DONE = 2;
        constructor() { this.readyState = 0; readers.push(this); }
        readAsText(file) {
            this.file = file;
            this.readyState = 1;
            // 配送待ちの古いイベントも再現し、abortだけへの依存を見逃さない。
            this.queuedLoad = this.onload;
            this.queuedError = this.onerror;
        }
        abort() { this.readyState = 2; this.aborted = true; this.onabort?.({ target: this }); }
        resolve(text) { this.readyState = 2; this.result = text; this.queuedLoad?.({ target: this }); }
        reject() { this.readyState = 2; this.queuedError?.({ target: this }); }
    }
    const storage = new Map();
    const storageControl = { failGet: false, failSet: false };
    const alerts = [];
    const window = new Events();
    window.scrollTo = () => {};
    const context = vm.createContext({
        document, window, HTMLElement: Element, Node: { TEXT_NODE: 3 }, FileReader: FakeFileReader,
        Date: FakeDate, Intl: Object.hasOwn(options, 'intl') ? options.intl : Intl,
        console: { warn() {}, error() {} }, alert: message => alerts.push(message),
        localStorage: {
            getItem(key) {
                if (storageControl.failGet) throw new Error('storage read blocked');
                return storage.get(key) ?? null;
            },
            setItem(key, value) {
                if (storageControl.failSet) throw new Error('storage quota exceeded');
                storage.set(key, String(value));
            }
        },
        setTimeout(callback, delay = 0) { pending.set(++nextTimer, { callback, at: now + Math.max(0, Number(delay) || 0) }); return nextTimer; },
        clearTimeout(id) { pending.delete(id); }
    });
    vm.runInContext(constantsSource, context, { filename: 'constants.js' });
    vm.runInContext(appSource + '\nglobalThis.Reader = SpeedReaderApp;', context, { filename: 'app.js' });
    const init = context.Reader.prototype.init;
    if (!options.fullInit) context.Reader.prototype.init = function () {};
    const app = new context.Reader();
    context.Reader.prototype.init = init;
    // 見た目の初期化だけを省き、イベント・描画・再生・保存処理は本体を使う。
    if (!options.fullInit) {
        app.bindEvents();
        app.setupModalBackdropClose();
        app.setupVisibilityChangeHandler();
        app.setupCleanup();
        app.setupSwipeGestures();
    }
    if (options.comprehension) vm.runInContext(comprehensionSource, context, { filename: 'comprehension.js' });
    return { app, document, window, clock, readers, storage, storageControl, alerts, context, flushDialogCloses: document.flushDialogCloses };
}

function prepare(runtime, text = 'one two three') {
    runtime.app.els.customText.value = text;
    runtime.app.prepareReader('custom');
}

function startAtPhase(runtime, phase) {
    prepare(runtime, phase === 'completion' ? 'one' : 'one two three');
    if (phase === 'countdown') runtime.app.startReader();
    else runtime.app.executeStartReader();
    if (phase === 'completion') runtime.clock.advance(240);
}

function action(runtime, name) {
    const button = runtime.document.createElement('button');
    button.dataset.action = name;
    runtime.document.body.appendChild(button);
    button.click();
}

function load(runtime, name = 'story.txt') {
    runtime.app.handleTextFile({ name, size: 12 });
    return runtime.readers.at(-1);
}

test('カウントダウン中の一時停止は数字を残さず元の単語に戻す', () => {
    const runtime = createRuntime();
    prepare(runtime);
    runtime.app.startReader();
    runtime.clock.advance(300);
    assert.equal(runtime.app.els.readerDisplay.textContent, '2');
    runtime.app.pauseReader();
    assert.equal(runtime.app.els.readerDisplay.textContent, 'one');
    assert.equal(runtime.app.els.readerDisplay.classList.contains('countdown-animate'), false);
    runtime.clock.advance(5000);
    assert.equal(runtime.app.state.index, 0);
    assert.equal(runtime.app.state.totalElapsedTime, 0);
    assert.equal(runtime.clock.pending.size, 0);
});

test('開始・一時停止を繰り返しても再生タイマーと完了通知は一つだけ', () => {
    const runtime = createRuntime();
    prepare(runtime);
    let completions = 0;
    runtime.app.showCompletionFeedback = () => { completions++; };
    runtime.app.startReader();
    runtime.clock.advance(300);
    runtime.app.startReader();
    assert.equal(runtime.clock.pending.size, 1);
    runtime.clock.advance(1200 + 240);
    assert.equal(runtime.app.state.index, 1);
    runtime.app.pauseReader();
    const elapsed = runtime.app.state.totalElapsedTime;
    runtime.clock.advance(4000);
    assert.equal(runtime.app.state.totalElapsedTime, elapsed);
    runtime.app.startReader();
    runtime.app.pauseReader();
    runtime.app.startReader();
    assert.equal(runtime.clock.pending.size, 1);
    runtime.clock.advance(1000);
    assert.equal(completions, 1);
    assert.equal(runtime.app.state.totalElapsedTime, 720);
    assert.equal(runtime.clock.pending.size, 0);
});

for (const interruption of ['parents', 'visibility', 'pagehide']) {
    for (const phase of ['countdown', 'playing', 'completion']) {
        test(`${interruption}は${phase}中の古い再生・完了通知を止める`, () => {
            const runtime = createRuntime();
            let completions = 0;
            runtime.app.showCompletionFeedback = () => { completions++; };
            startAtPhase(runtime, phase);
            const index = runtime.app.state.index;
            if (interruption === 'parents') runtime.app.openParentsModal(runtime.app.els.parentsModalOpenBtn);
            if (interruption === 'visibility') {
                runtime.document.hidden = true;
                runtime.document.dispatchEvent({ type: 'visibilitychange' });
            }
            if (interruption === 'pagehide') runtime.window.dispatchEvent({ type: 'pagehide' });
            assert.equal(runtime.app.state.isPlaying, false);
            assert.equal(runtime.app.state.isCountingDown, false);
            if (phase === 'countdown') assert.equal(runtime.app.els.readerDisplay.textContent, 'one');
            runtime.clock.advance(5000);
            assert.equal(runtime.app.state.index, index);
            assert.equal(completions, 0);
            assert.equal(runtime.clock.pending.size, 0);
        });
    }
}

test('空の自由入力は現在の教材・カテゴリ・進捗・経過時間を変更しない', () => {
    const runtime = createRuntime();
    const key = vm.runInContext('Object.keys(libraries)[0]', runtime.context);
    runtime.app.loadLibrary(key, 250);
    runtime.app.state.index = 1;
    runtime.app.state.totalElapsedTime = 4321;
    const previous = {
        rawText: runtime.app.state.rawText, title: runtime.app.state.title,
        currentCategory: runtime.app.state.currentCategory, index: runtime.app.state.index,
        words: [...runtime.app.state.words], totalElapsedTime: runtime.app.state.totalElapsedTime
    };
    runtime.app.els.customText.value = '   \n';
    runtime.app.prepareReader('custom');
    assert.deepEqual({
        rawText: runtime.app.state.rawText, title: runtime.app.state.title,
        currentCategory: runtime.app.state.currentCategory, index: runtime.app.state.index,
        words: [...runtime.app.state.words], totalElapsedTime: runtime.app.state.totalElapsedTime
    }, previous);
    assert.equal(runtime.alerts.length, 1);
});

for (const comprehension of [false, true]) {
    for (const dismissal of ['escape', 'backdrop', 'button']) {
        test(`${comprehension ? '内容チェック' : '従来結果'}の${dismissal}終了で経過時間とフォーカスを戻す`, () => {
            const runtime = createRuntime({ comprehension });
            prepare(runtime);
            runtime.app.state.index = 2;
            runtime.app.state.totalElapsedTime = 1250;
            runtime.app.showCompletionFeedback();
            runtime.clock.advance(50);
            const dialog = comprehension
                ? runtime.document.getElementById('speed-reader-comprehension-modal')
                : runtime.app.els.evaluationModal;
            assert.equal(dialog.open, true);
            if (dismissal === 'escape') dialog.escape();
            if (dismissal === 'backdrop') dialog.dispatchEvent({ type: 'click', clientX: 10, clientY: 10, bubbles: true });
            if (dismissal === 'button') dialog.querySelector('button').click();
            runtime.flushDialogCloses();
            assert.equal(dialog.open, false);
            assert.equal(runtime.app.state.totalElapsedTime, 0);
            assert.equal(runtime.app.state.startTime, null);
            assert.equal(runtime.app.state.index, 0);
            assert.equal(runtime.document.activeElement, runtime.app.els.mainPlayBtn);
            assert.equal(runtime.app.els.readerDisplay.textContent, 'one');
        });
    }
}

test('内容チェックは非表示の従来モーダル・紙吹雪・フォーカスタイマーを起動せず一回だけ記録する', () => {
    const runtime = createRuntime({ comprehension: true });
    prepare(runtime);
    runtime.app.state.totalElapsedTime = 1250;
    let confetti = 0;
    runtime.app.triggerConfetti = () => { confetti++; };
    runtime.app.showCompletionFeedback();
    assert.equal(runtime.app.els.evaluationModal.showCount, 0);
    assert.equal(confetti, 0);
    assert.equal(runtime.app.els.evaluationModal.open, false);
    assert.equal(runtime.document.getElementById('speed-reader-comprehension-modal').showCount, 1);
    assert.equal(JSON.parse(runtime.storage.get(HISTORY_KEY)).readCount, 1);
    runtime.clock.advance(100);
    assert.notEqual(runtime.document.activeElement, runtime.app.els.evaluationModal.querySelector('button'));
});

test('修飾キー・IME入力・キーリピートはグローバルショートカットを発火しない', () => {
    const runtime = createRuntime();
    const calls = [];
    for (const method of ['toggleReader', 'stepBack', 'stepForward', 'resetReader']) runtime.app[method] = () => calls.push(method);
    const guards = [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { isComposing: true }, { keyCode: 229 }, { repeat: true }];
    for (const guard of guards) {
        for (const code of ['Space', 'ArrowLeft', 'ArrowRight', 'KeyR']) {
            const event = { type: 'keydown', target: runtime.document.body, code, ...guard };
            runtime.document.dispatchEvent(event);
            assert.deepEqual(calls, [], `${code}: ${JSON.stringify(guard)}`);
            assert.equal(!!event.defaultPrevented, false);
        }
    }
    for (const code of ['Space', 'ArrowLeft', 'ArrowRight', 'KeyR']) runtime.document.dispatchEvent({ type: 'keydown', target: runtime.document.body, code });
    assert.deepEqual(calls, ['toggleReader', 'stepBack', 'stepForward', 'resetReader']);
});

test('入力欄・ボタン・開いたダイアログはグローバルショートカットの対象外', () => {
    const runtime = createRuntime();
    let toggles = 0;
    runtime.app.toggleReader = () => { toggles++; };
    for (const target of [runtime.app.els.customText, runtime.app.els.wpmSlider, runtime.app.els.mainPlayBtn]) {
        runtime.document.dispatchEvent({ type: 'keydown', target, code: 'Space' });
    }
    runtime.app.els.parentsModal.showModal();
    runtime.document.dispatchEvent({ type: 'keydown', target: runtime.document.body, code: 'Space' });
    assert.equal(toggles, 0);
});

test('先に選択したファイルの遅い完了は新しいファイルを上書きしない', () => {
    const runtime = createRuntime();
    const older = load(runtime, 'older.txt');
    const newer = load(runtime, 'newer.txt');
    newer.resolve('newer selected story');
    older.resolve('older stale story');
    assert.equal(runtime.app.els.customText.value, 'newer selected story');
    assert.equal(runtime.app.state.rawText, 'newer selected story');
    older.reject();
    assert.deepEqual(runtime.alerts, []);
});

for (const newerIntent of ['edit', 'clear', 'library']) {
    test(`ファイル読込中の${newerIntent}操作後に古い完了が内容を上書きしない`, () => {
        const runtime = createRuntime();
        prepare(runtime, 'original lesson');
        const older = load(runtime);
        if (newerIntent === 'edit') {
            runtime.app.els.customText.value = 'typed newer draft';
            runtime.app.els.customText.dispatchEvent({ type: 'input', bubbles: true });
        }
        if (newerIntent === 'clear') action(runtime, 'clear-custom');
        if (newerIntent === 'library') {
            const key = vm.runInContext('Object.keys(libraries)[0]', runtime.context);
            runtime.app.loadLibrary(key, 250);
        }
        const expectedText = runtime.app.els.customText.value;
        const expectedRaw = runtime.app.state.rawText;
        const expectedTitle = runtime.app.state.title;
        const expectedCategory = runtime.app.state.currentCategory;
        older.resolve('stale incoming file');
        assert.equal(runtime.app.els.customText.value, expectedText);
        assert.equal(runtime.app.state.rawText, expectedRaw);
        assert.equal(runtime.app.state.title, expectedTitle);
        assert.equal(runtime.app.state.currentCategory, expectedCategory);
        older.reject();
        assert.deepEqual(runtime.alerts, []);
    });
}

test('大文字のTXT拡張子を受け付け、同じファイルを再選択できる', () => {
    const runtime = createRuntime();
    const input = runtime.app.els.customFileInput;
    input.files = [{ name: 'STORY.TXT', size: 12 }];
    input.value = 'C:\\fakepath\\STORY.TXT';
    input.dispatchEvent({ type: 'change' });
    assert.equal(runtime.readers.length, 1);
    runtime.readers[0].resolve('first text');
    assert.equal(runtime.app.state.rawText, 'first text');
    assert.equal(input.value, '');
    input.value = 'C:\\fakepath\\STORY.TXT';
    input.dispatchEvent({ type: 'change' });
    assert.equal(runtime.readers.length, 2);
    runtime.readers[1].resolve('second text');
    assert.equal(runtime.app.state.rawText, 'second text');
    assert.deepEqual(runtime.alerts, []);
});

for (const [label, intl] of [
    ['Intl未定義', undefined],
    ['未対応', {}],
    ['生成失敗', { Segmenter: class { constructor() { throw new Error('unsupported locale'); } } }],
    ['分割失敗', { Segmenter: class { segment() { throw new Error('segment failed'); } } }]
]) {
    test(`Intl.Segmenter ${label}でも日本語とルビを破壊せず分割する`, () => {
        const runtime = createRuntime({ intl });
        const plain = runtime.app.processText('日本語の文章を続けて読む。', 1);
        assert.ok(plain.length > 1);
        assert.equal(plain.join(''), '日本語の文章を続けて読む。');
        const text = '赤い山{やま}を歩く。青い海{うみ}を見る。';
        const words = runtime.app.processText(text, 1);
        assert.ok(words.length > 1);
        assert.equal(words.join(''), text);
        assert.equal(words.some(word => word.includes('__SR_RUBY_TEMP_')), false);
        assert.ok(words.some(word => word.includes('山{やま}')));
        assert.ok(words.some(word => word.includes('海{うみ}')));
    });
}

function renderedLeaves(element) {
    if (element.tagName === 'RT') return [];
    if (!element.children?.length) return [element.textContent];
    return element.children.flatMap(renderedLeaves);
}

for (const word of ['😀😀', 'A👨‍👩‍👧‍👦B', 'A🧑🏽‍🚀B', 'A🇯🇵B', 'Ae\u0301B', '🧑🏽‍🚀{うちゅう}あ']) {
    test(`ORP描画は書記素をDOM境界で分断しない: ${word}`, () => {
        const runtime = createRuntime();
        runtime.app.renderWord(word);
        const plain = word.replace(/\{[^{}]+\}/g, '');
        const leaves = renderedLeaves(runtime.app.els.readerDisplay);
        assert.equal(leaves.join(''), plain);
        const boundaries = new Set([0]);
        for (const segment of new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(plain)) boundaries.add(segment.index + segment.segment.length);
        let offset = 0;
        for (const leaf of leaves) {
            offset += leaf.length;
            assert.ok(boundaries.has(offset), `書記素が途中で分かれた: ${JSON.stringify(leaves)}`);
        }
    });
}

test('読了時は別タブで更新された最新の履歴へ今回の記録を追加する', () => {
    const runtime = createRuntime();
    prepare(runtime);
    runtime.app.state.totalElapsedTime = 2000;
    const recent = {
        readCount: 7, maxWpm: 900, totalWords: 80, totalDuration: 30,
        categoryCounts: { 'low-elem': 1, 'high-elem': 2, junior: 3, high: 1 },
        customCount: 2, dailyHistory: { '2026-10-03': 4 }, unlockedBadges: ['first_read', 'reader_path']
    };
    runtime.storage.set(HISTORY_KEY, JSON.stringify(recent));
    runtime.app.showCompletionFeedback();
    const saved = JSON.parse(runtime.storage.get(HISTORY_KEY));
    assert.equal(saved.readCount, 8);
    assert.equal(saved.maxWpm, 900);
    assert.equal(saved.totalWords, 83);
    assert.equal(saved.totalDuration, 32);
    assert.equal(saved.customCount, 3);
    assert.equal(saved.dailyHistory['2026-10-03'], 5);
    assert.deepEqual(saved.categoryCounts, recent.categoryCounts);
    assert.ok(saved.unlockedBadges.includes('reader_path'));
});

test('内容チェックの中断・再表示・全問回答を繰り返しても結果と読書履歴を重複保存しない', () => {
    const runtime = createRuntime({ comprehension: true });
    const title = 'ももたろう';
    const questions = require(path.join(projectRoot, 'js', 'comprehension.js')).QUIZZES[title];
    const comprehensionKey = 'pikalab_speed_reader_comprehension_v1';
    let resets = 0;
    const resetReader = runtime.app.resetReader.bind(runtime.app);
    runtime.app.resetReader = () => { resets++; resetReader(); };

    prepare(runtime);
    runtime.app.state.title = title;
    runtime.app.state.totalElapsedTime = 1000;
    runtime.app.showCompletionFeedback();
    const dialog = runtime.document.getElementById('speed-reader-comprehension-modal');
    dialog.querySelectorAll('button')[questions[0].a].click();
    dialog.escape();
    runtime.flushDialogCloses();
    assert.equal(runtime.storage.has(comprehensionKey), false);
    assert.equal(resets, 1);

    runtime.app.state.totalElapsedTime = 2000;
    runtime.app.showCompletionFeedback();
    assert.equal(runtime.document.getElementById('speed-reader-comprehension-modal'), dialog);
    dialog.dispatchEvent({ type: 'click', clientX: 200, clientY: 200, bubbles: true });
    assert.equal(dialog.open, true, 'ダイアログ内の余白クリックでは閉じない');
    for (const question of questions.slice(0, 3)) {
        const answer = dialog.querySelectorAll('button')[question.a];
        answer.click();
        answer.click();
        dialog.querySelectorAll('button').at(-1).click();
    }
    const attempts = JSON.parse(runtime.storage.get(comprehensionKey));
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].score, 3);
    assert.equal(attempts[0].total, 3);
    assert.equal(attempts[0].wpm, 90);
    assert.equal(JSON.parse(runtime.storage.get(HISTORY_KEY)).readCount, 2);
    dialog.querySelector('button').click();
    runtime.flushDialogCloses();
    assert.equal(resets, 2);
    assert.equal(runtime.app.state.totalElapsedTime, 0);
    assert.equal(runtime.document.activeElement, runtime.app.els.mainPlayBtn);
});

test('完了通知前に読み直しても前回の経過時間を次回へ足さない', () => {
    const runtime = createRuntime();
    prepare(runtime, 'one two');
    runtime.app.executeStartReader();
    runtime.clock.advance(480);
    assert.equal(runtime.app.state.totalElapsedTime, 480);
    runtime.app.startReader();
    runtime.clock.advance(1200 + 480);
    assert.equal(runtime.app.state.totalElapsedTime, 480);
    runtime.clock.advance(300);
    const history = JSON.parse(runtime.storage.get(HISTORY_KEY));
    assert.equal(history.readCount, 1);
    assert.equal(history.totalWords, 2);
    assert.equal(history.maxWpm, 250);
});

test('1000WPMの1語60ms読了は履歴と内容チェックで同じWPMになる', () => {
    const runtime = createRuntime({ comprehension: true });
    prepare(runtime, 'one');
    runtime.app.state.title = 'ももたろう';
    runtime.app.state.wpm = 1000;
    runtime.app.executeStartReader();
    runtime.clock.advance(60 + 300);
    assert.equal(runtime.app.state.totalElapsedTime, 60);
    const history = JSON.parse(runtime.storage.get(HISTORY_KEY));
    assert.equal(history.maxWpm, 1000);
    const dialog = runtime.document.getElementById('speed-reader-comprehension-modal');
    assert.match(dialog.textContent, /1000 WPM/);
    const questions = require(path.join(projectRoot, 'js', 'comprehension.js')).QUIZZES['ももたろう'];
    for (const question of questions.slice(0, 3)) {
        dialog.querySelectorAll('button')[question.a].click();
        dialog.querySelectorAll('button').at(-1).click();
    }
    const attempts = JSON.parse(runtime.storage.get('pikalab_speed_reader_comprehension_v1'));
    assert.equal(attempts[0].wpm, history.maxWpm);
});

test('初期化直後のReady表示は教材として再生・保存しない', () => {
    const runtime = createRuntime({ fullInit: true, comprehension: true });
    runtime.app.toggleReader();
    runtime.clock.advance(5000);
    assert.equal(runtime.app.state.isPlaying, false);
    assert.equal(runtime.storage.has(HISTORY_KEY), false);
    assert.equal(runtime.document.getElementById('speed-reader-comprehension-modal'), null);
    assert.equal(runtime.clock.pending.size, 0);
});

function touchEvent(area, type, changedTouches, touches = []) {
    area.dispatchEvent({ type, changedTouches, touches });
}
function touch(x, y, identifier = 1) { return { screenX: x, screenY: y, identifier }; }

for (const direction of ['right', 'left']) {
    test(`単指の水平${direction}スワイプは対応方向へ一度だけ移動する`, () => {
        const runtime = createRuntime();
        const calls = [];
        runtime.app.stepBack = () => calls.push('back');
        runtime.app.stepForward = () => calls.push('forward');
        const area = runtime.app.els.readerDisplay.parentElement;
        const start = touch(200, 200);
        const end = touch(direction === 'right' ? 280 : 120, 210);
        touchEvent(area, 'touchstart', [start], [start]);
        touchEvent(area, 'touchend', [end]);
        touchEvent(area, 'touchend', [end]);
        assert.deepEqual(calls, [direction === 'right' ? 'back' : 'forward']);
    });
}

for (const gesture of ['vertical', 'diagonal', 'short', 'cancelled', 'multitouch', 'remaining-finger', 'different-finger']) {
    test(`${gesture}操作は読書位置を変更しない`, () => {
        const runtime = createRuntime();
        const calls = [];
        runtime.app.stepBack = () => calls.push('back');
        runtime.app.stepForward = () => calls.push('forward');
        const area = runtime.app.els.readerDisplay.parentElement;
        const start = touch(200, 200);
        touchEvent(area, 'touchstart', [start], gesture === 'multitouch' ? [start, touch(220, 200, 2)] : [start]);
        if (gesture === 'cancelled') touchEvent(area, 'touchcancel', [start]);
        const end = gesture === 'vertical' ? touch(280, 400)
            : gesture === 'diagonal' ? touch(280, 280)
                : gesture === 'short' ? touch(250, 200)
                    : touch(280, 200, gesture === 'different-finger' ? 2 : 1);
        touchEvent(area, 'touchend', [end], gesture === 'remaining-finger' ? [touch(220, 200, 2)] : []);
        assert.deepEqual(calls, []);
    });
}

test('保存失敗中も前のJSONへ巻き戻さず読了を累積し、復旧時に合計を保存する', () => {
    const runtime = createRuntime({ comprehension: true });
    runtime.storage.set(HISTORY_KEY, JSON.stringify({ readCount: 7, totalWords: 80 }));
    runtime.storageControl.failSet = true;
    for (let attempt = 1; attempt <= 3; attempt++) {
        if (attempt === 3) runtime.storageControl.failSet = false;
        prepare(runtime);
        runtime.app.state.totalElapsedTime = 2000;
        runtime.app.showCompletionFeedback();
        assert.equal(runtime.app.historyData.readCount, 7 + attempt);
        assert.equal(runtime.app.historyData.totalWords, 80 + 3 * attempt);
        const saved = JSON.parse(runtime.storage.get(HISTORY_KEY));
        assert.equal(saved.readCount, attempt < 3 ? 7 : 10);
        runtime.document.getElementById('speed-reader-comprehension-modal').escape();
        runtime.flushDialogCloses();
    }
    assert.equal(JSON.parse(runtime.storage.get(HISTORY_KEY)).totalWords, 89);
});

test('最初の教材を選ぶ前にチャンク設定を変更してもReady表示を読書記録にしない', () => {
    const runtime = createRuntime({ fullInit: true, comprehension: true });
    const button = runtime.document.createElement('button');
    button.className = 'chunk-btn';
    runtime.document.body.appendChild(button);
    runtime.app.setChunkSize(2, button);
    runtime.app.toggleReader();
    runtime.clock.advance(5000);
    assert.equal(runtime.storage.has(HISTORY_KEY), false);
    assert.equal(runtime.app.state.isPlaying, false);
});

for (const [word, delay] of [['one。', 360], ['one、', 288]]) {
    test(`最初の語${word}にも句読点による${delay}msの表示時間を適用する`, () => {
        const runtime = createRuntime();
        prepare(runtime, word);
        runtime.app.executeStartReader();
        runtime.clock.advance(delay - 1);
        assert.equal(runtime.app.state.isPlaying, true);
        runtime.clock.advance(1);
        assert.equal(runtime.app.state.isPlaying, false);
        assert.equal(runtime.app.state.totalElapsedTime, delay);
    });
}

test('タイマー配送が大幅に遅れても残りの語を0msでまとめて消費しない', () => {
    const runtime = createRuntime();
    prepare(runtime, 'one two three');
    runtime.app.executeStartReader();
    runtime.clock.elapseWithoutCallbacks(2000);
    runtime.clock.advance(0);
    assert.equal(runtime.app.state.index, 1);
    assert.equal(runtime.app.els.readerDisplay.textContent, 'two');
    runtime.clock.advance(239);
    assert.equal(runtime.app.state.index, 1);
    runtime.clock.advance(1);
    assert.equal(runtime.app.state.index, 2);
    assert.equal(runtime.app.els.readerDisplay.textContent, 'three');
    runtime.clock.advance(239);
    assert.equal(runtime.app.state.isPlaying, true);
    runtime.clock.advance(1);
    assert.equal(runtime.app.state.isPlaying, false);
});

test('1〜3語チャンクを往復変更しても本文と元の語数を維持する', () => {
    const runtime = createRuntime();
    prepare(runtime, 'one two three four five');
    for (const size of [2, 3, 1]) {
        const button = runtime.document.createElement('button');
        button.className = 'chunk-btn';
        runtime.document.body.appendChild(button);
        runtime.app.setChunkSize(size, button);
        assert.equal(runtime.app.state.words.length, Math.ceil(5 / size));
        assert.equal(runtime.app.state.words.join(' '), 'one two three four five');
        assert.equal(runtime.app.state.totalWordCount, 5);
        assert.ok(runtime.app.state.index >= 0 && runtime.app.state.index < runtime.app.state.words.length);
    }
});

test('従来結果を閉じた直後の再開を遅延closeイベントで停止しない', () => {
    const runtime = createRuntime();
    prepare(runtime, 'one two');
    runtime.app.state.totalElapsedTime = 480;
    runtime.app.showCompletionFeedback();
    runtime.app.closeEvaluationModal();
    runtime.app.startReader();
    assert.equal(runtime.app.state.isCountingDown, true);
    runtime.flushDialogCloses();
    assert.equal(runtime.app.state.isCountingDown, true);
    assert.equal(runtime.app.state.isPlaying, true);
    runtime.clock.advance(300);
    assert.equal(runtime.app.els.readerDisplay.textContent, '2');
});

test('再表示した内容チェックを前回の遅延closeイベントでリセットしない', () => {
    const runtime = createRuntime({ comprehension: true });
    prepare(runtime);
    runtime.app.state.totalElapsedTime = 1000;
    runtime.app.showCompletionFeedback();
    const dialog = runtime.document.getElementById('speed-reader-comprehension-modal');
    dialog.querySelector('button').click();
    runtime.app.state.index = 1;
    runtime.app.state.totalElapsedTime = 1600;
    runtime.app.showCompletionFeedback();
    const focused = runtime.document.activeElement;
    runtime.flushDialogCloses();
    assert.equal(dialog.open, true);
    assert.equal(runtime.app.state.totalElapsedTime, 1600);
    assert.equal(runtime.app.state.index, 1);
    assert.equal(runtime.document.activeElement, focused);
    dialog.escape();
    runtime.flushDialogCloses();
    assert.equal(dialog.open, false);
    assert.equal(runtime.app.state.totalElapsedTime, 0);
    assert.equal(runtime.app.state.index, 0);
    assert.equal(runtime.document.activeElement, runtime.app.els.mainPlayBtn);
    assert.equal(JSON.parse(runtime.storage.get(HISTORY_KEY)).readCount, 2);
});

test('従来結果のネイティブEscapeによる非同期closeでもリセットとフォーカス復元を行う', () => {
    const runtime = createRuntime();
    prepare(runtime);
    runtime.app.state.index = 2;
    runtime.app.state.totalElapsedTime = 1250;
    runtime.app.showCompletionFeedback();
    const dialog = runtime.app.els.evaluationModal;
    dialog.escape();
    assert.equal(dialog.open, false);
    assert.equal(runtime.app.state.totalElapsedTime, 1250, 'closeイベントの配送前は処理が未実行');
    runtime.flushDialogCloses();
    assert.equal(runtime.app.state.totalElapsedTime, 0);
    assert.equal(runtime.app.state.index, 0);
    assert.equal(runtime.document.activeElement, runtime.app.els.mainPlayBtn);
});

test('内容チェックのネイティブcloseも遅延イベントでリセットとフォーカス復元を行う', () => {
    const runtime = createRuntime({ comprehension: true });
    prepare(runtime);
    runtime.app.state.index = 2;
    runtime.app.state.totalElapsedTime = 1250;
    runtime.app.showCompletionFeedback();
    const dialog = runtime.document.getElementById('speed-reader-comprehension-modal');
    dialog.close();
    assert.equal(runtime.app.state.totalElapsedTime, 1250);
    runtime.flushDialogCloses();
    assert.equal(runtime.app.state.totalElapsedTime, 0);
    assert.equal(runtime.app.state.index, 0);
    assert.equal(runtime.document.activeElement, runtime.app.els.mainPlayBtn);
});

test('保護者モーダルのEscapeはclose配送前にaria-expandedとフォーカスを戻す', () => {
    const runtime = createRuntime();
    const trigger = runtime.app.els.parentsModalOpenBtn;
    const dialog = runtime.app.els.parentsModal;
    runtime.app.openParentsModal(trigger);
    runtime.clock.advance(50);
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    dialog.escape();
    assert.equal(dialog.open, false);
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(runtime.document.activeElement, trigger);
    runtime.flushDialogCloses();
    assert.equal(runtime.document.activeElement, trigger);
});

test('保護者モーダルの再表示後に古いcloseが新しい起動元とフォーカスを変更しない', () => {
    const runtime = createRuntime();
    const firstTrigger = runtime.app.els.parentsModalOpenBtn;
    const nextTrigger = runtime.document.createElement('button');
    runtime.document.body.appendChild(nextTrigger);
    const dialog = runtime.app.els.parentsModal;
    runtime.app.openParentsModal(firstTrigger);
    runtime.clock.advance(50);
    runtime.app.closeParentsModal();
    assert.equal(firstTrigger.getAttribute('aria-expanded'), 'false');
    assert.equal(runtime.document.activeElement, firstTrigger);
    runtime.app.openParentsModal(nextTrigger);
    runtime.clock.advance(50);
    const focused = runtime.document.activeElement;
    runtime.flushDialogCloses();
    assert.equal(dialog.open, true);
    assert.equal(nextTrigger.getAttribute('aria-expanded'), 'true');
    assert.equal(runtime.document.activeElement, focused);
    dialog.escape();
    assert.equal(nextTrigger.getAttribute('aria-expanded'), 'false');
    assert.equal(runtime.document.activeElement, nextTrigger);
    runtime.flushDialogCloses();
});

// 実ブラウザのレイアウト再現ではなく、拡縮に追随する測定値で収まり判定の契約を検証する。
function installReaderGeometry(runtime, options = {}) {
    const display = runtime.app.els.readerDisplay;
    const area = display.parentElement;
    const geometry = { width: 320, height: 240, badgeBottom: 32, heightFactor: 4, widthFactor: 6, ...options };
    const preferred = () => runtime.document.body.classList.contains('text-size-xl') ? 96
        : runtime.document.body.classList.contains('text-size-lg') ? 72 : 48;
    const size = () => Number.parseFloat(display.style.fontSize) || preferred();
    const factors = () => display.textContent === 'short' ? { height: 1, width: 3 }
        : { height: geometry.heightFactor, width: geometry.widthFactor };
    const offset = () => Number(display.style.transform?.match(/translateY\(([-\d.]+)px\)/)?.[1]) || 0;
    runtime.context.getComputedStyle = element => ({ fontSize: `${element === display ? size() : 16}px` });
    area.getBoundingClientRect = () => ({ left: 0, top: 0, right: geometry.width, bottom: geometry.height, width: geometry.width, height: geometry.height });
    for (const badge of [runtime.app.els.wpmBadge, runtime.app.els.chunkBadge, runtime.app.els.sourceBadge]) {
        badge.getBoundingClientRect = () => ({ left: 8, top: 8, right: 80, bottom: geometry.badgeBottom, width: 72, height: geometry.badgeBottom - 8 });
    }
    display.getBoundingClientRect = () => {
        const height = size() * factors().height;
        const width = size() * factors().width;
        const top = (geometry.height - height) / 2 + offset();
        const left = (geometry.width - width) / 2;
        return { left, right: left + width, top, bottom: top + height, width, height };
    };
    Object.defineProperty(display, 'scrollWidth', { get: () => size() * factors().width });
    return { geometry, preferred, size, display };
}

function fontButton(runtime) {
    const button = runtime.document.createElement('button');
    button.className = 'fontsize-btn';
    runtime.document.body.appendChild(button);
    return button;
}

function assertReaderFits(model) {
    const rect = model.display.getBoundingClientRect();
    const safeTop = Math.max(8, model.geometry.badgeBottom + 8);
    assert.ok(rect.top >= safeTop - 0.01, `本文上端 ${rect.top} が安全領域 ${safeTop} を超えた`);
    assert.ok(rect.bottom <= model.geometry.height - 20 + 0.01, '本文下端が安全領域を超えた');
    assert.ok(model.display.scrollWidth <= model.geometry.width - 16 + 0.01, '本文幅が安全領域を超えた');
}

test('表示枠を超える大きい本文だけを安全領域内の最大可読サイズへ縮める', () => {
    const runtime = createRuntime();
    const model = installReaderGeometry(runtime);
    prepare(runtime, 'long');
    runtime.app.setFontSize('xlarge', fontButton(runtime));
    assert.equal(runtime.app.state.fontSize, 'xlarge');
    assert.equal(model.preferred(), 96);
    assert.ok(model.size() > 44 && model.size() <= 45);
    assertReaderFits(model);
    runtime.app.renderWord('short');
    assert.equal(model.display.style.fontSize, '');
    assert.equal(model.display.style.transform, '');
    assert.equal(model.size(), 96);
    assert.equal(runtime.app.state.fontSize, 'xlarge');
    assertReaderFits(model);
});

test('収まる本文は既定サイズを維持し、フォント設定を変えた時だけ必要な縮小を再計算する', () => {
    const runtime = createRuntime();
    const model = installReaderGeometry(runtime, { heightFactor: 2, widthFactor: 5 });
    prepare(runtime, 'medium');
    assert.equal(model.display.style.fontSize, '');
    assert.equal(model.display.style.transform, '');
    assert.equal(model.size(), 48);
    const button = fontButton(runtime);
    runtime.app.setFontSize('xlarge', button);
    assert.ok(model.size() > 60 && model.size() <= 60.8);
    assertReaderFits(model);
    runtime.app.setFontSize('normal', button);
    assert.equal(model.display.style.fontSize, '');
    assert.equal(model.display.style.transform, '');
    assert.equal(model.size(), 48);
});

test('リサイズで枠が広がれば希望サイズに戻り、狭まれば安全領域へ再調整する', () => {
    const runtime = createRuntime({ fullInit: true });
    const model = installReaderGeometry(runtime);
    prepare(runtime, 'long');
    runtime.app.setFontSize('xlarge', fontButton(runtime));
    assert.ok(model.size() < 96);
    model.geometry.width = 1200;
    model.geometry.height = 800;
    runtime.window.dispatchEvent({ type: 'resize' });
    assert.equal(model.display.style.fontSize, '');
    assert.equal(model.display.style.transform, '');
    assert.equal(model.size(), 96);
    model.geometry.width = 320;
    model.geometry.height = 240;
    runtime.window.dispatchEvent({ type: 'resize' });
    assert.ok(model.size() < 96);
    assertReaderFits(model);
});

test('カウントダウンは直前の本文縮小を引き継がず、一時停止後は本文を再調整する', () => {
    const runtime = createRuntime({ fullInit: true });
    const model = installReaderGeometry(runtime);
    prepare(runtime, 'long');
    runtime.app.setFontSize('xlarge', fontButton(runtime));
    assert.notEqual(model.display.style.fontSize, '');
    assert.notEqual(model.display.style.transform, '');
    runtime.app.startReader();
    assert.equal(model.display.textContent, '3');
    assert.equal(model.display.style.fontSize, '');
    assert.equal(model.display.style.transform, '');
    runtime.window.dispatchEvent({ type: 'resize' });
    assert.equal(model.display.style.fontSize, '');
    assert.equal(model.display.style.transform, '');
    runtime.app.pauseReader();
    assert.equal(model.display.textContent, 'long');
    assertReaderFits(model);
});

test('教材未選択時と表示枠が計測できない時は自動縮小しない', () => {
    const runtime = createRuntime();
    const model = installReaderGeometry(runtime);
    runtime.app.renderWord('long');
    assert.equal(model.display.style.fontSize, '');
    assert.equal(model.display.style.transform, '');
    model.geometry.width = 0;
    model.geometry.height = 0;
    prepare(runtime, 'long');
    assert.equal(model.display.style.fontSize, '');
    assert.equal(model.display.style.transform, '');
});
