const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 修正前後へ同じ操作列を適用する。ブラウザ、外部依存、ソケット、実時間待機は不要。
const projectRoot = process.env.KOTOWAZA_TEST_ROOT
    ? path.resolve(process.env.KOTOWAZA_TEST_ROOT)
    : path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(projectRoot, 'script.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const dataSource = fs.readFileSync(path.join(projectRoot, '../data/idioms.js'), 'utf8');
const STORAGE_KEY = 'kotowaza_quiz_highscore';
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
        set textContent(value) { this._text = String(value ?? ''); this.children.forEach(child => { child.parentElement = null; }); this.children = []; this._html = null; }
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
            if (child.nodeType === 11) { for (const item of [...child.children]) this.appendChild(item); return child; }
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
        showModal() { this.open = true; this.setAttribute('open', ''); this.querySelector('button, input, [tabindex]')?.focus(); }
        close() { this.open = false; this.removeAttribute('open'); this.dispatchEvent({ type: 'close' }); }
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
    document.createDocumentFragment = () => { const node = new Element('fragment'); node.nodeType = 11; return node; };
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
    let now = 0;
    let wallOffset = Date.parse('2026-10-03T12:00:00Z');
    class FakeDate extends Date {
        constructor(...args) { super(...(args.length ? args : [wallOffset + now])); }
        static now() { return wallOffset + now; }
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
        flushDueOnce() { [...pending].filter(([, timer]) => timer.at <= now).map(([id]) => id).forEach(run); },
        jumpWall(ms) { wallOffset += ms; },
        get now() { return now; }
    };
    const storage = new Map(Object.entries(options.storage || {}));
    const storageControl = { failGet: false, failSet: false, failRemove: false, ...options.storageControl };
    const writes = [];
    const window = new Events();
    window.innerHeight = 800;
    window.scrollTo = () => {};
    const audio = { started: 0, constructors: 0, resumed: 0, suspended: 0 };
    class AudioContext {
        constructor() { audio.constructors++; if (options.audioThrows) throw new Error('audio unavailable'); this.state = 'running'; this.currentTime = 0; }
        resume() { audio.resumed++; this.state = 'running'; return Promise.resolve(); }
        suspend() { audio.suspended++; this.state = 'suspended'; return Promise.resolve(); }
        createOscillator() { return { frequency: {}, connect() {}, start() { audio.started++; }, stop() {} }; }
        createGain() { return { gain: {}, connect() {} }; }
    }
    window.AudioContext = AudioContext;
    class FakeEvent {
        constructor(type, init = {}) { this.type = type; Object.assign(this, init); }
        preventDefault() { this.defaultPrevented = true; }
        stopPropagation() { this.cancelBubble = true; }
    }
    let seed = options.seed || 0x12345678;
    const deterministicMath = Object.create(Math);
    deterministicMath.random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 0x100000000; };
    const context = vm.createContext({
        document, window, HTMLElement: Element, Node: { TEXT_NODE: 3 }, Event: FakeEvent,
        navigator: { maxTouchPoints: 0 }, Date: FakeDate, performance: { now: () => now }, Math: deterministicMath,
        console: { warn() {}, error() {}, log() {} }, alert() {},
        localStorage: {
            getItem(key) { if (storageControl.failGet) throw new Error('read blocked'); return storage.get(key) ?? null; },
            setItem(key, value) { if (storageControl.failSet) throw new Error('quota exceeded'); storage.set(key, String(value)); writes.push([key, String(value)]); },
            removeItem(key) { if (storageControl.failRemove) throw new Error('remove blocked'); storage.delete(key); }
        },
        setTimeout: (callback, delay = 0) => schedule(callback, delay, false),
        clearTimeout: id => pending.delete(id),
        setInterval: (callback, delay = 0) => schedule(callback, delay, true),
        clearInterval: id => pending.delete(id),
        requestAnimationFrame: callback => schedule(() => callback(now), 16, false),
        cancelAnimationFrame: id => pending.delete(id)
    });
    if (options.idioms) context.IDIOMS_DB = options.idioms;
    else vm.runInContext(dataSource, context, { filename: 'idioms.js' });
    vm.runInContext(appSource + `\nglobalThis.api = {
        get game() { return gameState; }, get elements() { return elements; }, get db() { return IDIOMS_DB; },
        CONFIG, StorageManager, SoundManager, startGame, showQuestion, endGame, nextQuestion,
        handleChoiceClick, handleFillinSubmit, handleHint, showComboPopup, createConfetti,
        extractBlankInfo, sanitizeFillinInput, generateQuestions, generateChoices, KOTOWAZA_BLANKS,
        get YOJIJUKUGO_BLANKS() { return typeof YOJIJUKUGO_BLANKS === 'undefined' ? null : YOJIJUKUGO_BLANKS; }
    };`, context, { filename: 'script.js' });
    // 旧版のインライン・ダイアログ初期化も実ページ同様に実行し、公平に比較する。
    for (const script of htmlSource.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (/\bsrc\s*=|application\/ld\+json/i.test(script[1])) continue;
        vm.runInContext(script[2], context, { filename: 'index-inline.js' });
    }
    document.dispatchEvent({ type: 'DOMContentLoaded' });
    document.readyState = 'complete';
    clock.advance(100);
    const runtime = { api: context.api, document, window, clock, storage, storageControl, context, writes, audio };
    runtime.start = (mode = 'meaning', count = 3) => {
        const countBtn = document.querySelector('.btn-count.active');
        countBtn.dataset.count = String(count);
        runtime.api.startGame(mode);
        assert.equal(runtime.api.elements.gameScreen.classList.contains('active'), true);
    };
    runtime.ask = (kanji, mode = 'fillin') => {
        runtime.start(mode, 1);
        const item = ['kotowaza', 'yojijukugo'].flatMap(type => runtime.api.db[type].map(q => ({ ...q, type }))).find(q => q.kanji === kanji);
        assert.ok(item, kanji);
        runtime.api.game.questions = [item];
        runtime.api.game.currentIndex = 0;
        runtime.api.showQuestion();
    };
    runtime.input = (value, extra = {}) => {
        runtime.api.elements.fillinInput.value = value;
        runtime.api.elements.fillinInput.dispatchEvent({ type: 'input', bubbles: true, inputType: 'insertText', ...extra });
    };
    runtime.keydown = (key, extra = {}, target = document.activeElement) => {
        const event = { type: 'keydown', bubbles: true, key, ...extra };
        target.dispatchEvent(event);
        return event;
    };
    runtime.answer = (correct = true) => {
        if (runtime.api.game.mode === 'meaning') {
            const button = [...runtime.api.elements.choiceBtns].find(btn => btn.dataset.correct === String(correct));
            assert.ok(button);
            button.click();
        } else {
            runtime.input(correct ? runtime.api.game.currentQuestion.blankInfo.answer : 'ふせいかい');
            runtime.api.elements.submitBtn.click();
        }
    };
    runtime.visibility = hidden => {
        document.hidden = hidden;
        document.visibilityState = hidden ? 'hidden' : 'visible';
        document.dispatchEvent({ type: 'visibilitychange' });
    };
    runtime.hide = () => runtime.visibility(true);
    runtime.show = () => runtime.visibility(false);
    runtime.pagehide = () => window.dispatchEvent({ type: 'pagehide', persisted: true });
    runtime.pageshow = () => window.dispatchEvent({ type: 'pageshow', persisted: true });
    runtime.finish = () => {
        let remaining = runtime.api.game.questions.length + 1;
        while (runtime.api.elements.gameScreen.classList.contains('active') && remaining-- > 0) {
            runtime.answer();
            clock.advance(runtime.api.CONFIG.FEEDBACK_DELAY_MS);
        }
        assert.equal(runtime.api.elements.resultScreen.classList.contains('active'), true);
    };
    return runtime;
}

function stateSnapshot(runtime) {
    const { game, elements } = runtime.api;
    return { correct: game.correctCount, wrong: game.wrongCount, score: game.totalScore, index: game.currentIndex,
        hint: game.hintUsed, input: elements.fillinInput.value, question: elements.questionText.textContent,
        feedback: elements.feedback.textContent, screen: runtime.document.querySelector('.screen.active')?.id };
}

// 監査で確認した読みの末尾を独立した期待値として固定する。実装辞書からは生成しない。
const AUDITED_SUFFIXES = `
kotowaza|犬も歩けば棒に当たる|いぬもあるけばぼうにあたる|棒に当たる|ぼうにあたる
kotowaza|猿も木から落ちる|さるもきからおちる|木から落ちる|きからおちる
kotowaza|花より団子|はなよりだんご|団子|だんご
kotowaza|笑う門には福来る|わらうかどにはふくきたる|福来る|ふくきたる
kotowaza|早起きは三文の徳|はやおきはさんもんのとく|三文の徳|さんもんのとく
kotowaza|鬼に金棒|おににかなぼう|金棒|かなぼう
kotowaza|蛙の子は蛙|かえるのこはかえる|蛙|かえる
kotowaza|七転び八起き|ななころびやおき|八起き|やおき
kotowaza|石の上にも三年|いしのうえにもさんねん|三年|さんねん
kotowaza|急がば回れ|いそがばまわれ|回れ|まわれ
kotowaza|継続は力なり|けいぞくはちからなり|力なり|ちからなり
kotowaza|時は金なり|ときはかねなり|金なり|かねなり
kotowaza|善は急げ|ぜんはいそげ|急げ|いそげ
kotowaza|千里の道も一歩から|せんりのみちもいっぽから|一歩から|いっぽから
kotowaza|習うより慣れろ|ならうよりなれろ|慣れろ|なれろ
kotowaza|失敗は成功の母|しっぱいはせいこうのはは|母|はは
kotowaza|好きこそ物の上手なれ|すきこそもののじょうずなれ|上手なれ|じょうずなれ
kotowaza|口は災いの元|くちはわざわいのもと|災いの元|わざわいのもと
kotowaza|三つ子の魂百まで|みつごのたましいひゃくまで|百まで|ひゃくまで
kotowaza|光陰矢の如し|こういんやのごとし|矢の如し|やのごとし
kotowaza|塵も積もれば山となる|ちりもつもればやまとなる|山となる|やまとなる
kotowaza|類は友を呼ぶ|るいはともをよぶ|友を呼ぶ|ともをよぶ
kotowaza|二度あることは三度ある|にどあることはさんどある|三度ある|さんどある
kotowaza|人のふり見て我がふり直せ|ひとのふりみてわがふりなおせ|我がふり直せ|わがふりなおせ
kotowaza|仏の顔も三度|ほとけのかおもさんど|三度|さんど
kotowaza|二兎を追う者は一兎をも得ず|にとをおうものはいっとをもえず|一兎をも得ず|いっとをもえず
kotowaza|百聞は一見に如かず|ひゃくぶんはいっけんにしかず|一見に如かず|いっけんにしかず
kotowaza|覆水盆に返らず|ふくすいぼんにかえらず|返らず|かえらず
kotowaza|目は口ほどに物を言う|めはくちほどにものをいう|物を言う|ものをいう
kotowaza|案ずるより産むが易し|あんずるよりうむがやすし|産むが易し|うむがやすし
kotowaza|雨降って地固まる|あめふってじかたまる|地固まる|じかたまる
kotowaza|帯に短し襷に長し|おびにみじかしたすきにながし|襷に長し|たすきにながし
kotowaza|勝って兜の緒を締めよ|かってかぶとのおをしめよ|緒を締めよ|おをしめよ
kotowaza|苦あれば楽あり|くあればらくあり|楽あり|らくあり
kotowaza|転ばぬ先の杖|ころばぬさきのつえ|杖|つえ
kotowaza|三人寄れば文殊の知恵|さんにんよればもんじゅのちえ|文殊の知恵|もんじゅのちえ
kotowaza|知らぬが仏|しらぬがほとけ|仏|ほとけ
kotowaza|棚から牡丹餅|たなからぼたもち|牡丹餅|ぼたもち
kotowaza|鉄は熱いうちに打て|てつはあついうちにうて|うちに打て|うちにうて
kotowaza|隣の芝生は青い|となりのしばふはあおい|青い|あおい
kotowaza|泣きっ面に蜂|なきっつらにはち|蜂|はち
kotowaza|能ある鷹は爪を隠す|のうあるたかはつめをかくす|爪を隠す|つめをかくす
kotowaza|備えあれば憂いなし|そなえあればうれいなし|憂いなし|うれいなし
kotowaza|灯台下暗し|とうだいもとくらし|下暗し|もとくらし
kotowaza|身から出た錆|みからでたさび|錆|さび
kotowaza|焼け石に水|やけいしにみず|水|みず
kotowaza|渡る世間に鬼はなし|わたるせけんにおにはなし|鬼はなし|おにはなし
kotowaza|井の中の蛙大海を知らず|いのなかのかわずたいかいをしらず|大海を知らず|たいかいをしらず
kotowaza|出る杭は打たれる|でるくいはうたれる|打たれる|うたれる
kotowaza|初心忘るべからず|しょしんわするべからず|忘るべからず|わするべからず
kotowaza|触らぬ神に祟りなし|さわらぬかみにたたりなし|祟りなし|たたりなし
kotowaza|論より証拠|ろんよりしょうこ|証拠|しょうこ
kotowaza|住めば都|すめばみやこ|都|みやこ
kotowaza|立つ鳥跡を濁さず|たつとりあとをにごさず|跡を濁さず|あとをにごさず
kotowaza|天は二物を与えず|てんはにぶつをあたえず|二物を与えず|にぶつをあたえず
kotowaza|魚心あれば水心|うおごころあればみずごころ|水心|みずごころ
kotowaza|亀の甲より年の功|かめのこうよりとしのこう|功|こう
kotowaza|聞くは一時の恥聞かぬは一生の恥|きくはいっときのはじきかぬはいっしょうのはじ|恥|はじ
kotowaza|郷に入っては郷に従え|ごうにいってはごうにしたがえ|従え|したがえ
kotowaza|情けは人の為ならず|なさけはひとのためならず|ならず|ならず
kotowaza|背に腹は代えられぬ|せにはらはかえられぬ|られぬ|られぬ
kotowaza|虎穴に入らずんば虎子を得ず|こけつにいらずんばこじをえず|得ず|えず
kotowaza|馬の耳に念仏|うまのみみにねんぶつ|念仏|ねんぶつ
kotowaza|実るほど頭を垂れる稲穂かな|みのるほどこうべをたれるいなほかな|稲穂かな|いなほかな
kotowaza|正直者は馬鹿を見る|しょうじきものはばかをみる|見る|みる
kotowaza|弘法も筆の誤り|こうぼうもふでのあやまり|誤り|あやまり
kotowaza|河童の川流れ|かっぱのかわながれ|流れ|ながれ
kotowaza|虻蜂取らず|あぶはちとらず|取らず|とらず
kotowaza|安物買いの銭失い|やすものがいのぜにうしない|失い|うしない
kotowaza|噂をすれば影|うわさをすればかげ|影|かげ
kotowaza|医者の不養生|いしゃのふようじょう|不養生|ふようじょう
kotowaza|一寸先は闇|いっすんさきはやみ|闇|やみ
kotowaza|嘘も方便|うそもほうべん|方便|ほうべん
kotowaza|縁の下の力持ち|えんのしたのちからもち|力持ち|ちからもち
kotowaza|親の心子知らず|おやのこころこしらず|知らず|しらず
kotowaza|果報は寝て待て|かほうはねてまて|寝て待て|ねてまて
kotowaza|五十歩百歩|ごじっぽひゃっぽ|百歩|ひゃっぽ
kotowaza|残り物には福がある|のこりものにはふくがある|ある|ある
kotowaza|捨てる神あれば拾う神あり|すてるかみあればひろうかみあり|拾う神あり|ひろうかみあり
kotowaza|下手の横好き|へたのよこずき|横好き|よこずき
kotowaza|目から鱗|めからうろこ|鱗|うろこ
yojijukugo|一石二鳥|いっせきにちょう|二鳥|にちょう
yojijukugo|十人十色|じゅうにんといろ|十色|といろ
yojijukugo|一期一会|いちごいちえ|一会|いちえ
yojijukugo|以心伝心|いしんでんしん|伝心|でんしん
yojijukugo|喜怒哀楽|きどあいらく|哀楽|あいらく
yojijukugo|試行錯誤|しこうさくご|錯誤|さくご
yojijukugo|四苦八苦|しくはっく|八苦|はっく
yojijukugo|自画自賛|じがじさん|自賛|じさん
yojijukugo|弱肉強食|じゃくにくきょうしょく|強食|きょうしょく
yojijukugo|心機一転|しんきいってん|一転|いってん
yojijukugo|日進月歩|にっしんげっぽ|月歩|げっぽ
yojijukugo|半信半疑|はんしんはんぎ|半疑|はんぎ
yojijukugo|百発百中|ひゃっぱつひゃくちゅう|百中|ひゃくちゅう
yojijukugo|無我夢中|むがむちゅう|夢中|むちゅう
yojijukugo|油断大敵|ゆだんたいてき|大敵|たいてき
yojijukugo|臨機応変|りんきおうへん|応変|おうへん
yojijukugo|完全無欠|かんぜんむけつ|無欠|むけつ
yojijukugo|興味津津|きょうみしんしん|津津|しんしん
yojijukugo|三日坊主|みっかぼうず|坊主|ぼうず
yojijukugo|絶体絶命|ぜったいぜつめい|絶命|ぜつめい
yojijukugo|危機一髪|ききいっぱつ|一髪|いっぱつ
yojijukugo|一長一短|いっちょういったん|一短|いったん
yojijukugo|意気投合|いきとうごう|投合|とうごう
yojijukugo|一進一退|いっしんいったい|一退|いったい
yojijukugo|二人三脚|ににんさんきゃく|三脚|さんきゃく
yojijukugo|一心不乱|いっしんふらん|不乱|ふらん
yojijukugo|一念発起|いちねんほっき|発起|ほっき
yojijukugo|異口同音|いくどうおん|同音|どうおん
yojijukugo|因果応報|いんがおうほう|応報|おうほう
yojijukugo|温故知新|おんこちしん|知新|ちしん
yojijukugo|起死回生|きしかいせい|回生|かいせい
yojijukugo|空前絶後|くうぜんぜつご|絶後|ぜつご
yojijukugo|言語道断|ごんごどうだん|道断|どうだん
yojijukugo|順風満帆|じゅんぷうまんぱん|満帆|まんぱん
yojijukugo|針小棒大|しんしょうぼうだい|棒大|ぼうだい
yojijukugo|前代未聞|ぜんだいみもん|未聞|みもん
yojijukugo|大器晩成|たいきばんせい|晩成|ばんせい
yojijukugo|大同小異|だいどうしょうい|小異|しょうい
yojijukugo|単刀直入|たんとうちょくにゅう|直入|ちょくにゅう
yojijukugo|天真爛漫|てんしんらんまん|爛漫|らんまん
yojijukugo|電光石火|でんこうせっか|石火|せっか
yojijukugo|独立独歩|どくりつどっぽ|独歩|どっぽ
yojijukugo|馬耳東風|ばじとうふう|東風|とうふう
yojijukugo|八方美人|はっぽうびじん|美人|びじん
yojijukugo|不言実行|ふげんじっこう|実行|じっこう
yojijukugo|本末転倒|ほんまつてんとう|転倒|てんとう
yojijukugo|用意周到|よういしゅうとう|周到|しゅうとう
yojijukugo|老若男女|ろうにゃくなんにょ|男女|なんにょ
yojijukugo|疑心暗鬼|ぎしんあんき|暗鬼|あんき
yojijukugo|急転直下|きゅうてんちょっか|直下|ちょっか
yojijukugo|五里霧中|ごりむちゅう|霧中|むちゅう
yojijukugo|自暴自棄|じぼうじき|自棄|じき
yojijukugo|質実剛健|しつじつごうけん|剛健|ごうけん
yojijukugo|支離滅裂|しりめつれつ|滅裂|めつれつ
yojijukugo|創意工夫|そういくふう|工夫|くふう
yojijukugo|適材適所|てきざいてきしょ|適所|てきしょ
yojijukugo|徹頭徹尾|てっとうてつび|徹尾|てつび
yojijukugo|天下無敵|てんかむてき|無敵|むてき
yojijukugo|一触即発|いっしょくそくはつ|即発|そくはつ
yojijukugo|意気揚揚|いきようよう|揚揚|ようよう
yojijukugo|威風堂堂|いふうどうどう|堂堂|どうどう
yojijukugo|有名無実|ゆうめいむじつ|無実|むじつ
yojijukugo|暗中模索|あんちゅうもさく|模索|もさく
yojijukugo|一刀両断|いっとうりょうだん|両断|りょうだん
yojijukugo|才色兼備|さいしょくけんび|兼備|けんび
yojijukugo|晴耕雨読|せいこううどく|雨読|うどく
yojijukugo|千載一遇|せんざいいちぐう|一遇|いちぐう
yojijukugo|朝三暮四|ちょうさんぼし|暮四|ぼし
yojijukugo|二束三文|にそくさんもん|三文|さんもん
yojijukugo|明鏡止水|めいきょうしすい|止水|しすい
yojijukugo|面目躍如|めんもくやくじょ|躍如|やくじょ
yojijukugo|竜頭蛇尾|りゅうとうだび|蛇尾|だび
yojijukugo|和気藹藹|わきあいあい|藹藹|あいあい
yojijukugo|我田引水|がでんいんすい|引水|いんすい
yojijukugo|画竜点睛|がりょうてんせい|点睛|てんせい
yojijukugo|奇想天外|きそうてんがい|天外|てんがい
yojijukugo|玉石混交|ぎょくせきこんこう|混交|こんこう
yojijukugo|荒唐無稽|こうとうむけい|無稽|むけい
yojijukugo|縦横無尽|じゅうおうむじん|無尽|むじん
yojijukugo|七転八倒|しちてんばっとう|八倒|ばっとう
yojijukugo|森羅万象|しんらばんしょう|万象|ばんしょう
yojijukugo|正正堂堂|せいせいどうどう|堂堂|どうどう
yojijukugo|抱腹絶倒|ほうふくぜっとう|絶倒|ぜっとう
yojijukugo|傍若無人|ぼうじゃくぶじん|無人|ぶじん
yojijukugo|満身創痍|まんしんそうい|創痍|そうい
yojijukugo|無味乾燥|むみかんそう|乾燥|かんそう
yojijukugo|孟母三遷|もうぼさんせん|三遷|さんせん
yojijukugo|唯我独尊|ゆいがどくそん|独尊|どくそん
yojijukugo|悠悠自適|ゆうゆうじてき|自適|じてき
yojijukugo|羊頭狗肉|ようとうくにく|狗肉|くにく
yojijukugo|落花流水|らっかりゅうすい|流水|りゅうすい
yojijukugo|理路整然|りろせいぜん|整然|せいぜん
yojijukugo|冷静沈着|れいせいちんちゃく|沈着|ちんちゃく
yojijukugo|六根清浄|ろっこんしょうじょう|清浄|しょうじょう
yojijukugo|一挙両得|いっきょりょうとく|両得|りょうとく
yojijukugo|一朝一夕|いっちょういっせき|一夕|いっせき
yojijukugo|天涯孤独|てんがいこどく|孤独|こどく
yojijukugo|同床異夢|どうしょういむ|異夢|いむ
`.trim().split('\n').map(line => {
    const [type, kanji, hiragana, blankKanji, answer] = line.split('|');
    return { type, kanji, hiragana, blankKanji, answer };
});

test('監査済み179語すべてで表示する漢字の空欄と要求する読みが一致する', () => {
    const { api } = createRuntime();
    const catalog = ['kotowaza', 'yojijukugo'].flatMap(type => api.db[type].map(item => ({ ...item, type })));
    assert.equal(AUDITED_SUFFIXES.length, 179);
    assert.equal(catalog.length, AUDITED_SUFFIXES.length);
    for (const item of catalog) {
        const fixture = AUDITED_SUFFIXES.find(row => row.kanji === item.kanji && row.type === item.type);
        assert.ok(fixture, `監査が必要な追加語: ${item.kanji}`);
        assert.equal(item.hiragana, fixture.hiragana, item.kanji);
        assert.ok(item.kanji.endsWith(fixture.blankKanji), item.kanji);
        assert.ok(item.hiragana.endsWith(fixture.answer), item.kanji);
        const info = api.extractBlankInfo(item);
        const expectedDisplay = item.kanji === '蛙の子は蛙' ? '【　　】の子は蛙'
            : item.kanji.slice(0, -fixture.blankKanji.length) + '【　　】';
        assert.equal(info.answer, fixture.answer, item.kanji);
        assert.equal(info.fullText, fixture.hiragana, item.kanji);
        assert.equal((info.displayText.match(/【\s*】/g) || []).length, 1, item.kanji);
        assert.equal(info.displayText, expectedDisplay, item.kanji);
        assert.equal(info.displayText.includes(item.kanji), false, item.kanji);
        assert.equal(info.displayText.includes(item.hiragana), false, item.kanji);
        assert.match(info.answer, /^[ぁ-ゖー]+$/, item.kanji);
        assert.ok(!/^[ぁぃぅぇぉっゃゅょゎ]/.test(info.answer), `語の途中から切れている: ${item.kanji}`);
    }
});

test('全語の穴埋め画面は回答するまで読み全文を露出せず、監査済みの回答で正解になる', () => {
    const runtime = createRuntime();
    for (const fixture of AUDITED_SUFFIXES) {
        runtime.ask(fixture.kanji);
        const displayed = runtime.api.elements.questionText.textContent;
        assert.match(displayed, /【\s*】/, fixture.kanji);
        assert.equal(displayed.includes(fixture.hiragana), false, fixture.kanji);
        runtime.input(fixture.answer);
        runtime.api.handleFillinSubmit();
        assert.equal(runtime.api.game.correctCount, 1, fixture.kanji);
        assert.equal(runtime.api.game.wrongCount, 0, fixture.kanji);
    }
});

test('繰り返す文字のある語でも監査された一箇所だけを隠す', () => {
    const { api } = createRuntime();
    for (const [kanji, expected] of [['蛙の子は蛙', '【　　】の子は蛙'], ['聞くは一時の恥聞かぬは一生の恥', '聞くは一時の恥聞かぬは一生の【　　】']]) {
        const item = api.db.kotowaza.find(q => q.kanji === kanji);
        assert.equal(api.extractBlankInfo({ ...item, type: 'kotowaza' }).displayText, expected);
    }
});

test('未登録語のフォールバックは漢字と読みの長さ比で切らず、ひらがなで整合させる', () => {
    const { api } = createRuntime();
    for (const hiragana of ['あ', 'あいう', 'あいうえおかきくけこ']) {
        const info = api.extractBlankInfo({ type: 'kotowaza', kanji: '未登録表記', hiragana, meaning: 'テスト' });
        assert.ok(info.answer.length > 0);
        assert.match(info.displayText, /^[ぁ-ゖー]*【\s*】$/);
        assert.equal(info.displayText.replace(/【\s*】/, info.answer), hiragana);
    }
});

test('四択は全語で異なる4選択肢を持ち、厳密な正解が必ず一つだけある', () => {
    const { api } = createRuntime();
    const catalog = [...api.db.kotowaza, ...api.db.yojijukugo];
    for (const item of catalog) {
        const choices = Array.from(api.generateChoices(item, catalog));
        assert.equal(choices.length, 4, item.kanji);
        assert.equal(new Set(choices).size, 4, item.kanji);
        assert.equal(choices.filter(value => value === item.meaning).length, 1, item.kanji);
        assert.ok(choices.every(value => typeof value === 'string' && value.trim()), item.kanji);
    }
});

const EQUIVALENT_GROUPS = [
    ['猿も木から落ちる', '弘法も筆の誤り', '河童の川流れ'],
    ['一石二鳥', '一挙両得'],
    ['二兎を追う者は一兎をも得ず', '虻蜂取らず'],
    ['五十歩百歩', '大同小異'],
    ['馬の耳に念仏', '馬耳東風'],
    ['晴耕雨読', '悠悠自適']
];

test('同じ意味になる語の説明を誤答の選択肢にしない', () => {
    const { api } = createRuntime();
    const catalog = [...api.db.kotowaza, ...api.db.yojijukugo];
    for (const group of EQUIVALENT_GROUPS) {
        const items = group.map(kanji => catalog.find(item => item.kanji === kanji));
        assert.ok(items.every(Boolean));
        for (const correct of items) {
            const choices = Array.from(api.generateChoices(correct, items));
            assert.equal(choices.length, 4, correct.kanji);
            assert.equal(choices.filter(value => value === correct.meaning).length, 1, correct.kanji);
            for (const other of items.filter(item => item !== correct)) {
                assert.equal(choices.includes(other.meaning), false, `${correct.kanji} / ${other.kanji}`);
            }
        }
    }
});

test('候補不足・重複データでも「別解」で水増しせず安全な4択へ補充する', () => {
    const { api } = createRuntime();
    const item = api.db.kotowaza[0];
    for (const pool of [[], [item], [item, { ...item }], [null, {}, { meaning: '' }, item]]) {
        const choices = Array.from(api.generateChoices(item, pool));
        assert.equal(choices.length, 4);
        assert.equal(new Set(choices).size, 4);
        assert.equal(choices.filter(value => value === item.meaning).length, 1);
        assert.ok(choices.every(value => typeof value === 'string' && value.trim() && !value.includes('（別解）')));
    }
});

test('中断後と結果画面では遅れて届く回答・ヒント操作が状態を変えない', () => {
    for (const mode of ['meaning', 'fillin']) for (const destination of ['quit', 'result']) {
        const runtime = createRuntime();
        runtime.start(mode, 1);
        const oldChoice = [...runtime.api.elements.choiceBtns].find(btn => btn.dataset.correct === 'true');
        if (mode === 'fillin') runtime.input(runtime.api.game.currentQuestion.blankInfo.answer);
        if (destination === 'quit') runtime.api.elements.quitBtn.click();
        else runtime.finish();
        const before = stateSnapshot(runtime);
        runtime.api.handleChoiceClick(oldChoice);
        runtime.api.handleFillinSubmit();
        runtime.api.handleHint();
        runtime.keydown('1', {}, runtime.document.body);
        runtime.keydown('Enter', {}, runtime.api.elements.fillinInput);
        assert.deepEqual(stateSnapshot(runtime), before, `${mode}/${destination}`);
    }
});

test('同じ回答のクリック・直接配送・Enterを繰り返しても採点は一度だけ', () => {
    for (const mode of ['meaning', 'fillin']) {
        const runtime = createRuntime();
        runtime.start(mode);
        const choice = [...runtime.api.elements.choiceBtns].find(btn => btn.dataset.correct === 'true');
        runtime.answer();
        const before = stateSnapshot(runtime);
        for (let i = 0; i < 4; i++) {
            runtime.api.handleChoiceClick(choice);
            runtime.api.handleFillinSubmit();
            runtime.keydown('Enter', {}, runtime.api.elements.fillinInput);
        }
        assert.deepEqual(stateSnapshot(runtime), before, mode);
        assert.equal(runtime.api.game.correctCount, 1);
        assert.equal(runtime.api.game.wrongCount, 0);
    }
});

test('中断したセッションの回答遷移コールバックは新しい問題と予約を変更しない', () => {
    const runtime = createRuntime();
    runtime.start();
    runtime.answer();
    const old = runtime.clock.history.get(runtime.api.game.nextQuestionTimer).callback;
    runtime.api.elements.quitBtn.click();
    runtime.start('fillin');
    runtime.answer();
    const timer = runtime.api.game.nextQuestionTimer;
    const before = stateSnapshot(runtime);
    old();
    assert.deepEqual(stateSnapshot(runtime), before);
    assert.equal(runtime.api.game.nextQuestionTimer, timer);
    runtime.hide();
    runtime.clock.advance(10000);
    assert.equal(runtime.api.game.currentIndex, 0);
    runtime.show();
    runtime.clock.advance(runtime.api.CONFIG.FEEDBACK_DELAY_MS);
    assert.equal(runtime.api.game.currentIndex, 1);
});

test('前画面の遅延フォーカスが新セッションのフォーカスと予約を奪わない', () => {
    const runtime = createRuntime();
    runtime.start('meaning');
    const oldFocus = [...runtime.clock.pending.values()].filter(timer => timer.delay === 50).map(timer => timer.callback);
    assert.ok(oldFocus.length);
    runtime.api.elements.quitBtn.click();
    runtime.start('fillin');
    const timer = runtime.api.game.focusTimer;
    oldFocus.forEach(callback => callback());
    assert.equal(runtime.api.game.focusTimer, timer);
    runtime.clock.advance(100);
    assert.equal(runtime.document.activeElement, runtime.api.elements.fillinInput);
});

test('中断は進行中の遷移と演出を消し、成績は保存しない', () => {
    const runtime = createRuntime();
    runtime.start('meaning', 5);
    for (let i = 0; i < 3; i++) {
        runtime.answer();
        if (i < 2) runtime.clock.advance(runtime.api.CONFIG.FEEDBACK_DELAY_MS);
    }
    assert.equal(runtime.document.querySelectorAll('.combo-popup').length, 1);
    runtime.api.elements.quitBtn.click();
    runtime.clock.advance(10000);
    assert.equal(runtime.document.querySelectorAll('.combo-popup, .confetti').length, 0);
    assert.equal(runtime.api.elements.startScreen.classList.contains('active'), true);
    assert.equal(runtime.storage.has(STORAGE_KEY), false);
    assert.equal(runtime.clock.pending.size, 0);
});

test('1〜4キーの長押し・IME・修飾キーを採点せず、通常キーだけ回答する', () => {
    const runtime = createRuntime();
    runtime.start('meaning');
    const number = [...runtime.api.elements.choiceBtns].findIndex(btn => btn.dataset.correct === 'true') + 1;
    for (const extra of [{ repeat: true }, { isComposing: true }, { keyCode: 229 }, { ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }]) {
        runtime.keydown(String(number), extra, runtime.document.body);
        assert.equal(runtime.api.game.correctCount, 0, JSON.stringify(extra));
        assert.equal(runtime.api.game.wrongCount, 0, JSON.stringify(extra));
    }
    runtime.keydown(String(number), {}, runtime.document.body);
    assert.equal(runtime.api.game.correctCount, 1);
    runtime.clock.advance(runtime.api.CONFIG.FEEDBACK_DELAY_MS);
    runtime.keydown('1', { repeat: true }, runtime.document.body);
    assert.equal(runtime.api.game.correctCount + runtime.api.game.wrongCount, 1);
});

test('入力欄・編集可能要素にいる間は数字ショートカットが回答しない', () => {
    const runtime = createRuntime();
    runtime.start('meaning');
    const targets = [runtime.api.elements.fillinInput, runtime.document.createElement('textarea'), runtime.document.createElement('div')];
    targets[2].isContentEditable = true;
    for (const target of targets) {
        if (!target.isConnected) runtime.document.body.appendChild(target);
        runtime.keydown('1', {}, target);
    }
    assert.equal(runtime.api.game.correctCount + runtime.api.game.wrongCount, 0);
});

test('IME変換中は入力値と選択範囲を変更せず、確定してから正規化・採点する', () => {
    const runtime = createRuntime();
    runtime.ask('花より団子');
    const input = runtime.api.elements.fillinInput;
    input.dispatchEvent({ type: 'compositionstart', bubbles: true });
    runtime.input(' ﾀﾞﾝｺﾞ ', { isComposing: true });
    input.setSelectionRange(1, 4);
    runtime.api.handleHint();
    runtime.api.elements.submitBtn.click();
    runtime.keydown('Enter', { isComposing: true }, input);
    assert.equal(input.value, ' ﾀﾞﾝｺﾞ ');
    assert.equal(input.selectionStart, 1);
    assert.equal(input.selectionEnd, 4);
    assert.equal(runtime.api.game.correctCount + runtime.api.game.wrongCount, 0);
    assert.equal(runtime.api.game.hintUsed, false);
    input.dispatchEvent({ type: 'compositionend', bubbles: true, data: 'ﾀﾞﾝｺﾞ' });
    input.dispatchEvent({ type: 'input', bubbles: true, isComposing: false });
    assert.equal(input.value, 'だんご');
    assert.equal(runtime.api.game.correctCount, 0);
    runtime.keydown('Enter', { keyCode: 229 }, input);
    assert.equal(runtime.api.game.correctCount, 0);
    runtime.keydown('Enter', {}, input);
    assert.equal(runtime.api.game.correctCount, 1);
});

test('半角カナ・結合濁点・全角空白は確定時に同じひらがなの正解になる', () => {
    for (const value of ['ﾀﾞﾝｺﾞ', 'ダンゴ', 'た\u3099んこ\u3099', '　ダ ン ゴ\n']) {
        const runtime = createRuntime();
        runtime.ask('花より団子');
        runtime.input(value);
        assert.equal(runtime.api.elements.fillinInput.value, 'だんご');
        runtime.api.handleFillinSubmit();
        assert.equal(runtime.api.game.correctCount, 1, value);
    }
});

test('Enter長押しが次の問題に配送されても回答にならず空欄も採点しない', () => {
    const runtime = createRuntime();
    runtime.start('fillin');
    runtime.api.handleFillinSubmit();
    assert.equal(runtime.api.game.correctCount + runtime.api.game.wrongCount, 0);
    runtime.answer();
    runtime.clock.advance(runtime.api.CONFIG.FEEDBACK_DELAY_MS);
    runtime.input(runtime.api.game.currentQuestion.blankInfo.answer);
    runtime.keydown('Enter', { repeat: true }, runtime.api.elements.fillinInput);
    assert.equal(runtime.api.game.correctCount, 1);
    runtime.keydown('Enter', {}, runtime.api.elements.fillinInput);
    assert.equal(runtime.api.game.correctCount, 2);
});

test('ヒントは回答可能な問題に一度だけ適用し、次問では再度使用できる', () => {
    const runtime = createRuntime();
    runtime.start('fillin');
    runtime.api.handleHint();
    assert.equal(runtime.api.game.hintUsed, true);
    const input = runtime.api.elements.fillinInput;
    runtime.input(`${input.value}あ`);
    const afterTyping = input.value;
    runtime.api.handleHint();
    assert.equal(input.value, afterTyping);
    runtime.answer();
    runtime.clock.advance(runtime.api.CONFIG.FEEDBACK_DELAY_MS);
    assert.equal(runtime.api.game.hintUsed, false);
    assert.equal(runtime.api.elements.hintBtn.disabled, false);
});

function scoreAfterActiveTime({ wallJump = 0, paused = false } = {}) {
    const runtime = createRuntime();
    runtime.start('meaning', 1);
    runtime.clock.advance(400);
    if (paused) {
        runtime.hide(); runtime.hide(); runtime.pagehide();
        runtime.clock.advance(30000);
        runtime.show();
        runtime.clock.advance(5000);
        assert.equal(runtime.api.game.correctCount, 0);
        runtime.pageshow(); runtime.pageshow();
    }
    runtime.clock.advance(600);
    if (paused) {
        runtime.pagehide(); runtime.pagehide(); runtime.hide();
        runtime.clock.advance(30000);
        runtime.pageshow();
        runtime.clock.advance(5000);
        runtime.show(); runtime.show();
    }
    runtime.clock.jumpWall(wallJump);
    runtime.clock.advance(1000);
    runtime.answer();
    return runtime.api.game.totalScore;
}

test('速度得点は単調時計の活動時間だけを使い、壁時計の進み戻りでは変わらない', () => {
    const expected = scoreAfterActiveTime();
    assert.ok(expected >= 100 && expected <= 200);
    assert.equal(scoreAfterActiveTime({ wallJump: 86400000 }), expected);
    assert.equal(scoreAfterActiveTime({ wallJump: -86400000 }), expected);
});

test('問題中の複数回の非表示・pagehide重複を除外し、復帰時に二重計上しない', () => {
    assert.equal(scoreAfterActiveTime({ paused: true }), scoreAfterActiveTime());
});

test('非表示中は直接配送された回答もヒントも無効になる', () => {
    for (const mode of ['meaning', 'fillin']) {
        const runtime = createRuntime();
        runtime.start(mode);
        if (mode === 'fillin') runtime.input(runtime.api.game.currentQuestion.blankInfo.answer);
        runtime.hide();
        const before = stateSnapshot(runtime);
        runtime.answer();
        runtime.api.handleHint();
        assert.deepEqual(stateSnapshot(runtime), before, mode);
        runtime.show();
        runtime.answer();
        assert.equal(runtime.api.game.correctCount, 1);
    }
});

test('フィードバックの残り表示時間を複数回の非表示・BFCache往復でも保持する', () => {
    const runtime = createRuntime();
    runtime.start('meaning', 3);
    runtime.answer();
    const delay = runtime.api.CONFIG.FEEDBACK_DELAY_MS;
    runtime.clock.advance(400);
    runtime.hide(); runtime.hide(); runtime.pagehide();
    runtime.clock.advance(30000);
    runtime.show();
    runtime.clock.advance(5000);
    assert.equal(runtime.api.game.currentIndex, 0);
    runtime.pageshow(); runtime.pageshow();
    runtime.clock.advance(300);
    runtime.pagehide(); runtime.hide();
    runtime.clock.advance(30000);
    runtime.pageshow();
    runtime.clock.advance(5000);
    assert.equal(runtime.api.game.currentIndex, 0);
    runtime.show(); runtime.show();
    runtime.clock.advance(delay - 701);
    assert.equal(runtime.api.game.currentIndex, 0);
    runtime.clock.advance(1);
    assert.equal(runtime.api.game.currentIndex, 1);
    runtime.clock.advance(delay * 3);
    assert.equal(runtime.api.game.currentIndex, 1);
});

test('停止前に配送待ちになった遷移は再開後の残り時間を早送りしない', () => {
    const runtime = createRuntime();
    runtime.start();
    runtime.answer();
    const old = runtime.clock.history.get(runtime.api.game.nextQuestionTimer).callback;
    runtime.clock.advance(400);
    runtime.hide();
    runtime.clock.advance(30000);
    runtime.show();
    const timer = runtime.api.game.nextQuestionTimer;
    old();
    assert.equal(runtime.api.game.currentIndex, 0);
    assert.equal(runtime.api.game.nextQuestionTimer, timer);
    runtime.clock.advance(runtime.api.CONFIG.FEEDBACK_DELAY_MS - 401);
    assert.equal(runtime.api.game.currentIndex, 0);
    runtime.clock.advance(1);
    assert.equal(runtime.api.game.currentIndex, 1);
});

test('通常結果・復習・再挑戦は得点と問題数を分離し復習ではベストを更新しない', () => {
    for (const mode of ['meaning', 'fillin']) {
        const runtime = createRuntime();
        runtime.start(mode, 3);
        runtime.answer(false);
        runtime.clock.advance(runtime.api.CONFIG.FEEDBACK_DELAY_MS);
        runtime.finish();
        const normalData = runtime.storage.get(STORAGE_KEY);
        assert.ok(normalData, mode);
        assert.equal(runtime.api.game.correctCount, 2);
        assert.equal(runtime.api.game.wrongQuestions.length, 1);
        const normalScore = runtime.api.game.totalScore;
        assert.match(runtime.api.elements.resultHighscore.textContent, new RegExp(String(normalScore)));
        const normalWrites = runtime.writes.length;
        runtime.api.elements.reviewBtn.click();
        assert.equal(runtime.api.game.isReviewMode, true);
        assert.equal(runtime.api.game.mode, mode);
        assert.equal(runtime.api.game.totalScore, 0);
        assert.equal(runtime.api.game.questions.length, 1);
        runtime.finish();
        assert.equal(runtime.storage.get(STORAGE_KEY), normalData);
        assert.equal(runtime.writes.length, normalWrites);
        assert.equal(runtime.api.elements.resultHighscore.textContent, '-');
        runtime.api.elements.retryBtn.click();
        assert.equal(runtime.api.game.isReviewMode, false);
        assert.equal(runtime.api.game.questions.length, 3);
        assert.equal(runtime.api.game.totalScore, 0);
        assert.equal(runtime.api.game.correctCount + runtime.api.game.wrongCount, 0);
        assert.equal(runtime.api.game.wrongQuestions.length, 0);
        runtime.finish();
        assert.ok(runtime.api.game.totalScore > normalScore);
        assert.equal(runtime.api.StorageManager.getHighScore(mode, 3), runtime.api.game.totalScore);
    }
});

test('結果表示を二度呼び出しても保存と演出を二重生成しない', () => {
    const runtime = createRuntime();
    runtime.start('meaning', 1);
    runtime.finish();
    const writes = runtime.writes.length;
    const pending = runtime.clock.pending.size;
    const before = stateSnapshot(runtime);
    runtime.api.endGame(); runtime.api.endGame();
    assert.deepEqual(stateSnapshot(runtime), before);
    assert.equal(runtime.writes.length, writes);
    assert.equal(runtime.clock.pending.size, pending);
});

test('カテゴリ・難易度の各ベストを別々に保存し旧キーはall/allだけ継承する', () => {
    const runtime = createRuntime({ storage: { [STORAGE_KEY]: JSON.stringify({ meaning_10: 80 }) } });
    const store = runtime.api.StorageManager;
    assert.equal(store.getHighScore('meaning', 10), 80);
    assert.equal(store.getHighScore('meaning', 10, 'kotowaza', 'all'), 0);
    assert.equal(store.saveHighScore('meaning', 10, 150, 'kotowaza', '2'), true);
    assert.equal(store.saveHighScore('meaning', 10, 120, 'kotowaza', '2'), false);
    assert.equal(store.getHighScore('meaning', 10, 'kotowaza', '2'), 150);
    assert.equal(store.getHighScore('meaning', 10, 'yojijukugo', '2'), 0);
    assert.equal(store.getHighScore('meaning', 10), 80);
});

test('破損JSON・配列・null・文字列の保存データでも起動から結果まで到達する', () => {
    for (const value of ['{invalid', 'null', '[]', '"broken"']) {
        const runtime = createRuntime({ storage: { [STORAGE_KEY]: value, wonder_school_profile_v2: value } });
        runtime.start('meaning', 1);
        runtime.finish();
        assert.ok(Number.isFinite(runtime.api.game.totalScore));
        assert.equal(runtime.api.game.correctCount, 1);
    }
});

test('Storageの読み書きが拒否されても回答と復習は継続できる', () => {
    for (const storageControl of [{ failGet: true }, { failSet: true }, { failGet: true, failSet: true, failRemove: true }]) {
        const runtime = createRuntime({ storageControl });
        runtime.start('fillin', 2);
        runtime.answer(false);
        runtime.clock.advance(runtime.api.CONFIG.FEEDBACK_DELAY_MS);
        runtime.finish();
        runtime.api.elements.reviewBtn.click();
        runtime.finish();
        assert.equal(runtime.api.game.correctCount, 1);
    }
});

test('ベストの不正な数値・型を読まず有限非負の数値だけ保存する', () => {
    for (const value of [-1, 'Infinity', 'NaN', '123', null, {}, [], 1e309]) {
        const runtime = createRuntime({ storage: { [STORAGE_KEY]: JSON.stringify({ meaning_10_all_all: value, meaning_10: value }) } });
        assert.equal(runtime.api.StorageManager.getHighScore('meaning', 10), 0, JSON.stringify(value));
    }
    const runtime = createRuntime();
    for (const value of [Infinity, -Infinity, NaN, -1, '123', {}, null]) {
        assert.equal(runtime.api.StorageManager.saveHighScore('meaning', 10, value), false, String(value));
    }
    assert.equal(runtime.storage.has(STORAGE_KEY), false);
    assert.equal(runtime.api.StorageManager.saveHighScore('meaning', 10, 120), true);
    assert.equal(runtime.api.StorageManager.getHighScore('meaning', 10), 120);
});

test('AudioContext生成に失敗しても回答処理・採点・結果表示が止まらない', () => {
    for (const mode of ['meaning', 'fillin']) {
        const runtime = createRuntime({ audioThrows: true });
        runtime.start(mode, 1);
        runtime.finish();
        runtime.clock.advance(5000);
        assert.equal(runtime.api.game.correctCount, 1);
        assert.equal(runtime.api.elements.resultScreen.classList.contains('active'), true);
        assert.ok(runtime.audio.constructors > 0);
    }
});

test('旧結果の祝福コールバックは再挑戦した問題へ音と紙吹雪を漏らさない', () => {
    const runtime = createRuntime();
    runtime.start('meaning', 1);
    runtime.finish();
    const old = [...runtime.clock.pending.values()].find(timer => timer.delay === 500)?.callback;
    assert.equal(typeof old, 'function');
    runtime.api.elements.retryBtn.click();
    const started = runtime.audio.started;
    old();
    runtime.clock.advance(5000);
    assert.equal(runtime.audio.started, started);
    assert.equal(runtime.document.querySelectorAll('.confetti').length, 0);
    assert.equal(runtime.api.game.correctCount, 0);
});

test('紙吹雪は粒子ごとのタイマーを作らず有界数で終了しホーム移動時にも消える', () => {
    for (const leaveEarly of [false, true]) {
        const runtime = createRuntime();
        runtime.start('meaning', 1);
        runtime.finish();
        runtime.clock.advance(500);
        const count = runtime.document.querySelectorAll('.confetti').length;
        assert.ok(count > 0 && count <= 50);
        assert.ok(runtime.clock.pending.size <= 2, `粒子別のタイマーが残っている: ${runtime.clock.pending.size}`);
        if (leaveEarly) runtime.api.elements.homeBtn.click();
        runtime.clock.advance(runtime.api.CONFIG.CONFETTI_DURATION_MS + 100);
        assert.equal(runtime.document.querySelectorAll('.confetti, .combo-popup').length, 0);
        assert.equal(runtime.clock.pending.size, 0);
    }
});

test('古い演出終了コールバックで新しいコンボの演出を消さない', () => {
    const runtime = createRuntime();
    runtime.start('meaning', 5);
    runtime.api.showComboPopup(3);
    const old = [...runtime.clock.pending.values()].find(timer => timer.delay === runtime.api.CONFIG.COMBO_POPUP_MS)?.callback;
    assert.equal(typeof old, 'function');
    runtime.api.elements.quitBtn.click();
    runtime.start('meaning', 5);
    runtime.api.showComboPopup(4);
    old();
    assert.equal(runtime.document.querySelectorAll('.combo-popup').length, 1);
    assert.match(runtime.document.querySelector('.combo-popup').textContent, /4/);
    runtime.clock.advance(runtime.api.CONFIG.COMBO_POPUP_MS);
    assert.equal(runtime.document.querySelectorAll('.combo-popup').length, 0);
});

test('カテゴリ・難易度のフィルタを保ち同じ問題を重複出題しない', () => {
    const { api } = createRuntime();
    for (const category of ['all', 'kotowaza', 'yojijukugo']) for (const difficulty of ['all', '1', '2', '3']) {
        api.game.config = { category, difficulty };
        const questions = Array.from(api.generateQuestions('all'));
        assert.ok(questions.length > 0, `${category}/${difficulty}`);
        assert.equal(new Set(questions.map(q => q.hiragana)).size, questions.length);
        assert.ok(questions.every(q => category === 'all' || q.type === category));
        assert.ok(questions.every(q => difficulty === 'all' || q.difficulty === Number(difficulty)));
        for (let i = 1; i < questions.length; i++) assert.ok(questions[i - 1].difficulty <= questions[i].difficulty);
    }
});

test('保護者ダイアログを開いている間は開始画面の予約フォーカスを奪わない', () => {
    const runtime = createRuntime();
    runtime.start();
    runtime.api.elements.quitBtn.click();
    const opener = runtime.document.querySelector('[data-action="parents-modal-open"]');
    opener.click();
    const dialog = runtime.document.getElementById('parents-modal');
    const closer = runtime.document.querySelector('[data-action="parents-modal-close"]');
    runtime.clock.advance(100);
    assert.equal(dialog.open, true);
    assert.equal(runtime.document.activeElement, closer);
    closer.click();
    assert.equal(dialog.open, false);
    assert.equal(runtime.document.activeElement, opener);
    assert.equal(opener.getAttribute('aria-expanded'), 'false');
});

test('四択生成は候補数に比例して乱数を使わず元データも並び順も変更しない', () => {
    const runtime = createRuntime();
    const catalog = [...runtime.api.db.kotowaza, ...runtime.api.db.yojijukugo];
    const before = JSON.stringify(catalog);
    const originalRandom = runtime.context.Math.random;
    let draws = 0;
    runtime.context.Math.random = () => { draws++; return originalRandom(); };
    for (const item of catalog) {
        for (let round = 0; round < 2; round++) {
            draws = 0;
            const choices = Array.from(runtime.api.generateChoices(item, catalog));
            assert.equal(choices.length, 4, item.kanji);
            assert.equal(new Set(choices).size, 4, item.kanji);
            assert.ok(draws <= 6, `${item.kanji}: ${draws}回の乱数呼び出し`);
        }
    }
    assert.equal(JSON.stringify(catalog), before);
});

test('旧結果画面のフォーカス予約が再挑戦後に配送されても回答欄から離れない', () => {
    const runtime = createRuntime();
    runtime.start('fillin', 1);
    runtime.finish();
    const old = [...runtime.clock.pending.values()].filter(timer => timer.delay === 50).map(timer => timer.callback);
    assert.ok(old.length);
    runtime.api.elements.retryBtn.click();
    runtime.clock.advance(100);
    assert.equal(runtime.document.activeElement, runtime.api.elements.fillinInput);
    old.forEach(callback => callback());
    assert.equal(runtime.document.activeElement, runtime.api.elements.fillinInput);
});

test('変換中にページを隠しても入力は壊れず、活動時間は再開まで停止する', () => {
    const runtime = createRuntime();
    runtime.ask('花より団子');
    const input = runtime.api.elements.fillinInput;
    input.dispatchEvent({ type: 'compositionstart', bubbles: true });
    runtime.input('ダンゴ', { isComposing: true });
    runtime.clock.advance(1000);
    runtime.hide(); runtime.pagehide();
    runtime.clock.advance(60000);
    assert.equal(input.value, 'ダンゴ');
    assert.equal(runtime.api.game.correctCount + runtime.api.game.wrongCount, 0);
    runtime.pageshow(); runtime.show();
    input.dispatchEvent({ type: 'compositionend', bubbles: true });
    runtime.clock.advance(1000);
    runtime.keydown('Enter', {}, input);
    assert.equal(runtime.api.game.correctCount, 1);
    assert.equal(runtime.api.game.totalScore, scoreAfterActiveTime());
});


test('保護者ダイアログ上部と下部の閉じるボタンをどちらも使用できる', () => {
    const runtime = createRuntime();
    const opener = runtime.document.querySelector('[data-action="parents-modal-open"]');
    const dialog = runtime.document.getElementById('parents-modal');
    const closers = runtime.document.querySelectorAll('[data-action="parents-modal-close"]');
    assert.equal(closers.length, 2, '上部と下部の実HTMLを両方再現する');
    for (const closer of closers) {
        opener.click();
        assert.equal(dialog.open, true);
        closer.click();
        assert.equal(dialog.open, false);
        assert.equal(opener.getAttribute('aria-expanded'), 'false');
        assert.equal(runtime.document.activeElement, opener);
    }
});
