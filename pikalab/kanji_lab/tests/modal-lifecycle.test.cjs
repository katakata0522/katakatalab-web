const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 実時間を待たず、DOM の hidden/inert と予約の取消しを検証する。
function createHarness() {
    const handlers = new Map();
    const nodes = new Map();
    const timers = new Map();
    let nextTimer = 0;
    let now = 0;
    let document;
    class Element {
        constructor(id, tagName = 'DIV', classes = '') {
            this.id = id;
            this.tagName = tagName;
            this.className = classes;
            this.attributes = new Map();
            this.style = { zIndex: '' };
            this.dataset = {};
            this.children = [];
            this.parentElement = null;
            this.disabled = false;
            this.textContent = '';
            this.listeners = new Map();
            this.classList = {
                contains: name => this.className.split(/\s+/).includes(name),
                add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(' '); },
                remove: (...names) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); }
            };
            if (id) nodes.set(id, this);
        }
        appendChild(child) { this.children.push(child); child.parentElement = this; return child; }
        get isConnected() { return this === document.documentElement || !!this.parentElement?.isConnected; }
        get tabIndex() { return this.attributes.has('tabindex') ? Number(this.attributes.get('tabindex')) : this.tagName === 'BUTTON' ? 0 : -1; }
        setAttribute(name, value) { this.attributes.set(name, String(value)); }
        getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
        hasAttribute(name) { return this.attributes.has(name); }
        removeAttribute(name) { this.attributes.delete(name); }
        contains(other) { return this === other || this.children.some(child => child.contains(other)); }
        closest(selectors) {
            const matches = selectors.split(',').map(selector => selector.trim());
            for (let element = this; element; element = element.parentElement) {
                if (matches.some(selector => selector.startsWith('.') ? element.classList.contains(selector.slice(1)) : /^\[([^\]]+)\]$/.test(selector) && element.hasAttribute(selector.slice(1, -1)))) return element;
            }
            return null;
        }
        querySelectorAll(selector) {
            const descendants = this.children.flatMap(child => [child, ...child.querySelectorAll('*')]);
            if (selector === '*') return descendants;
            if (selector.includes('button')) return descendants.filter(child => child.tagName === 'BUTTON' || child.hasAttribute('tabindex'));
            return [];
        }
        addEventListener(type, callback) {
            if (!this.listeners.has(type)) this.listeners.set(type, []);
            this.listeners.get(type).push(callback);
        }
        focus() { if (!this.disabled && !this.closest('[hidden], .hidden, [inert]')) document.activeElement = this; }
    }
    document = {
        hidden: false,
        addEventListener(type, callback) {
            if (!handlers.has(type)) handlers.set(type, []);
            handlers.get(type).push(callback);
        },
        getElementById: id => nodes.get(id) || null,
        querySelector: selector => selector === 'main' ? nodes.get('main') : selector === 'header' ? nodes.get('header') : null,
        querySelectorAll: () => [],
    };
    document.documentElement = new Element('html', 'HTML');
    document.body = document.documentElement.appendChild(new Element('body', 'BODY'));
    const header = document.body.appendChild(new Element('header', 'HEADER'));
    const main = document.body.appendChild(new Element('main', 'MAIN'));
    const trigger = main.appendChild(new Element('open-collection-btn', 'BUTTON'));
    const preserved = document.body.appendChild(new Element('already-inert'));
    preserved.setAttribute('inert', 'true');
    const addModal = (id, panelId, closeId, lastId, parent = document.body, classes = 'hidden opacity-0') => {
        const modal = parent.appendChild(new Element(id, 'DIV', classes));
        const panel = modal.appendChild(new Element(panelId, 'DIV', 'scale-95 translate-x-full'));
        const close = panel.appendChild(new Element(closeId, 'BUTTON'));
        const last = panel.appendChild(new Element(lastId, 'BUTTON'));
        return { modal, panel, close, last };
    };
    const collection = addModal('collection-modal', 'collection-panel', 'close-collection-btn', 'collection-card');
    const detail = addModal('dict-detail-modal', 'dict-detail-content', 'close-dict-detail-btn', 'detail-extra');
    const wrong = addModal('wrong-modal', 'wrong-panel', 'close-wrong-btn', 'wrong-card');
    const help = addModal('help-modal', 'help-content', 'close-help-btn', 'help-ok-btn');
    const settings = addModal('settings-modal', 'settings-content', 'close-settings-btn', 'settings-ok-btn');
    const viewGame = main.appendChild(new Element('view-game'));
    const gamePlay = viewGame.appendChild(new Element('game-play', 'DIV', 'hidden'));
    const courses = viewGame.appendChild(new Element('game-courses', 'DIV', 'hidden'));
    const courseBack = courses.appendChild(new Element('courses-back-btn', 'BUTTON'));
    const submit = gamePlay.appendChild(new Element('quiz-submit-btn', 'BUTTON'));
    const result = addModal('game-result', 'result-panel', 'result-btn', 'result-extra', viewGame, 'hidden animate-pop-in');
    const clear = addModal('stage-clear', 'clear-panel', 'stage-clear-menu-btn', 'clear-extra', viewGame, 'hidden animate-pop-in');
    const entry = { k: '林', l: '木', r: '木', y: 'はやし', m: '木が集まったところ' };
    const context = {
        document, console,
        window: {
            KanjiLabData: { KANJI_ALL: [entry], KANJI_LR: [entry], KANJI_UD: [] },
            KanjiLabProgress: require('../js/progress.js'),
            KanjiLabAudio: { setMuted() {}, getMuted() { return false; }, playSound() {}, triggerInit() {} }
        },
        localStorage: { getItem() { return null; }, setItem() {} },
        setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, at: now + delay }); return id; },
        clearTimeout(id) { timers.delete(id); },
        setInterval() { return ++nextTimer; }, clearInterval() {},
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8'), context);
    handlers.get('DOMContentLoaded').forEach(callback => callback());
    trigger.focus();
    return {
        app: context.window.App, document, main, header, trigger, preserved, collection, detail, wrong, help, settings,
        gamePlay, courseBack, submit, result, clear,
        answer() {
            context.window.App.ui.selectQuizPart('left', '木', {});
            context.window.App.ui.selectQuizPart('right', '木', {});
            context.window.App.quiz.checkQuiz();
        },
        advance(milliseconds) {
            const end = now + milliseconds;
            while (true) {
                const due = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
                if (!due) break;
                now = due[1].at; timers.delete(due[0]); due[1].callback();
            }
            now = end;
        },
        key(key, shiftKey = false) {
            const event = { key, shiftKey, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
            handlers.get('keydown').forEach(callback => callback(event));
            return event;
        }
    };
}

test('図鑑から詳細を重ね、Escape 一回で詳細だけを閉じて戻る', () => {
    const h = createHarness();
    h.app.ui.toggleCollection(); h.advance(50);
    h.collection.last.focus(); h.app.ui.openDictDetail('林'); h.advance(50);
    assert.ok(h.main.hasAttribute('inert'));
    assert.ok(h.collection.modal.hasAttribute('inert'));
    assert.ok(Number(h.detail.modal.style.zIndex) > Number(h.collection.modal.style.zIndex));
    assert.equal(h.document.activeElement, h.detail.close);
    h.key('Escape'); h.key('Escape'); h.advance(299);
    assert.ok(h.main.hasAttribute('inert'));
    h.advance(1);
    assert.ok(h.detail.modal.classList.contains('hidden'));
    assert.ok(!h.collection.modal.classList.contains('hidden'));
    assert.ok(!h.collection.modal.hasAttribute('inert'));
    assert.ok(h.main.hasAttribute('inert'));
    assert.equal(h.document.activeElement, h.collection.last);
    h.key('Escape'); h.advance(300);
    assert.equal(h.document.activeElement, h.trigger);
    assert.ok(!h.main.hasAttribute('inert'));
    assert.equal(h.preserved.getAttribute('inert'), 'true');
    assert.equal(h.collection.modal.style.zIndex, '');
});

test('DOM 後方のにがてノートより、その詳細カードが前面になる', () => {
    const h = createHarness();
    h.app.ui.openWrongModal(); h.advance(50);
    h.wrong.last.focus(); h.app.ui.openDictDetail('林'); h.advance(50);
    assert.ok(Number(h.detail.modal.style.zIndex) > Number(h.wrong.modal.style.zIndex));
    h.app.ui.closeDictDetail(); h.advance(300);
    assert.ok(!h.wrong.modal.classList.contains('hidden'));
    assert.equal(h.document.activeElement, h.wrong.last);
});

test('閉じるアニメーション中に再表示しても、古い予約で消えない', () => {
    const h = createHarness();
    h.app.ui.openHelp(); h.advance(50);
    h.app.ui.closeHelp(); h.advance(100);
    h.app.ui.openHelp(); h.advance(400);
    assert.ok(!h.help.modal.classList.contains('hidden'));
    assert.equal(h.document.activeElement, h.help.close);
    assert.ok(h.main.hasAttribute('inert'));
    h.app.ui.closeHelp(); h.advance(300);
    assert.equal(h.document.activeElement, h.trigger);
});

test('開いた直後に閉じると、古い予約は隠れたボタンへフォーカスしない', () => {
    const h = createHarness();
    h.app.ui.openHelp(); h.app.ui.closeHelp(); h.advance(50);
    assert.notEqual(h.document.activeElement, h.help.close);
    h.advance(250);
    assert.equal(h.document.activeElement, h.trigger);
});

test('Tab と Shift+Tab は最前面内にとどまり、外れたフォーカスも戻す', () => {
    const h = createHarness();
    h.app.ui.openHelp(); h.advance(50);
    assert.ok(h.key('Tab', true).defaultPrevented);
    assert.equal(h.document.activeElement, h.help.last);
    h.key('Tab'); assert.equal(h.document.activeElement, h.help.close);
    h.help.last.disabled = true;
    h.key('Tab'); assert.equal(h.document.activeElement, h.help.close);
    h.document.activeElement = h.document.body;
    h.key('Tab'); assert.equal(h.document.activeElement, h.help.close);
});

test('閉じかけの背面が消えても、新しい最前面のフォーカスを奪わない', () => {
    const h = createHarness();
    h.app.ui.openHelp(); h.advance(50);
    h.app.ui.closeHelp(); h.app.ui.openSettings(); h.advance(350);
    assert.ok(h.help.modal.classList.contains('hidden'));
    assert.equal(h.document.activeElement, h.settings.close);
    assert.ok(h.main.hasAttribute('inert'));
    h.app.ui.closeSettings(); h.advance(300);
    assert.equal(h.document.activeElement, h.trigger);
});

test('解答結果とクリア画面を即時に切り替え、次へ・メニューにフォーカスする', () => {
    const h = createHarness();
    h.app.daily.startDailyChallenge(); h.submit.focus(); h.answer(); h.advance(0);
    assert.equal(h.document.activeElement, h.result.close);
    assert.equal(h.result.modal.getAttribute('role'), 'dialog');
    assert.equal(h.result.modal.getAttribute('aria-labelledby'), 'result-title');
    assert.ok(h.gamePlay.hasAttribute('inert'));
    assert.ok(h.header.hasAttribute('inert'));
    assert.ok(!h.main.hasAttribute('inert'));
    h.key('Escape'); h.advance(300);
    assert.ok(!h.result.modal.classList.contains('hidden'));
    h.app.quiz.nextQuiz(); h.advance(0);
    assert.ok(h.result.modal.classList.contains('hidden'));
    assert.equal(h.document.activeElement, h.clear.close);
    assert.equal(h.clear.modal.getAttribute('aria-labelledby'), 'clear-title');
    assert.ok(!h.clear.modal.classList.contains('opacity-0'));
    h.key('Escape'); h.advance(300);
    assert.ok(!h.clear.modal.classList.contains('hidden'));
    h.app.quiz.exitToCourses();
    assert.ok(h.clear.modal.classList.contains('hidden'));
    assert.equal(h.document.activeElement, h.courseBack);
    assert.ok(!h.header.hasAttribute('inert'));
});

test('クリア画面から詳細を開いて戻っても、結果画面のフォーカス管理を保つ', () => {
    const h = createHarness();
    h.app.daily.startDailyChallenge(); h.answer(); h.app.quiz.nextQuiz(); h.advance(0);
    h.clear.last.focus(); h.app.ui.openDictDetail('林'); h.advance(50);
    assert.ok(h.main.hasAttribute('inert'));
    h.key('Escape'); h.advance(300);
    assert.equal(h.document.activeElement, h.clear.last);
    assert.ok(!h.main.hasAttribute('inert'));
    assert.ok(h.gamePlay.hasAttribute('inert'));
    h.app.quiz.exitToCourses();
    assert.ok(!h.header.hasAttribute('inert'));
});
