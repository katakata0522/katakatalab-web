const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function runtime() {
    const timers = new Map();
    const observers = [];
    const ready = [];
    let nextTimer = 0;
    const document = {
        activeElement: null,
        getElementById: id => elements[id] || null,
        addEventListener: (name, callback) => { if (name === 'DOMContentLoaded') ready.push(callback); },
        querySelectorAll: selector => selector.includes('parents-modal-open') ? [opener] : [closer]
    };
    function element(classes = []) {
        const names = new Set(classes);
        const attrs = new Map();
        const handlers = new Map();
        return {
            style: {},
            classList: { add: name => names.add(name), remove: name => names.delete(name), contains: name => names.has(name) },
            setAttribute: (name, value) => attrs.set(name, value),
            getAttribute: name => attrs.get(name),
            hasAttribute: name => attrs.has(name),
            removeAttribute: name => attrs.delete(name),
            addEventListener: (name, fn) => { if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(fn); },
            removeEventListener: (name, fn) => handlers.get(name)?.delete(fn),
            listenerCount: name => handlers.get(name)?.size || 0,
            emit(name, event = {}) { for (const fn of [...(handlers.get(name) || [])]) fn({ preventDefault() {}, target: this, ...event }); },
            focus() { document.activeElement = this; }
        };
    }
    const app = element();
    const overlay = element(['hidden']);
    const first = element();
    const last = element();
    const back = element();
    const opener = element();
    const closer = element();
    const dialog = element();
    overlay.querySelector = () => first;
    overlay.querySelectorAll = () => [first, last];
    const elements = { app, 'clear-overlay': overlay, 'game-back-btn': back, 'parents-modal': dialog };
    const scope = {
        document,
        console: { log() {}, warn() {}, error() {} },
        setTimeout: callback => { timers.set(++nextTimer, callback); return nextTimer; },
        clearTimeout: id => timers.delete(id),
        MutationObserver: class {
            constructor(callback) { this.callback = callback; this.active = false; observers.push(this); }
            observe() { this.active = true; }
            disconnect() { this.active = false; }
        }
    };
    scope.window = scope;
    const context = vm.createContext(scope);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../common.js'), 'utf8') + '\nthis.utils = EduUtils;', context);
    context.utils.shootConfetti = () => {};
    context.utils.awardEduplayBadge = () => {};
    const flushTimers = () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()); };
    const hide = () => { overlay.classList.add('hidden'); observers.filter(o => o.active).forEach(o => o.callback()); };
    return { context, document, app, overlay, first, last, back, opener, closer, dialog, ready, observers, flushTimers, hide };
}

test('クリア画面の繰り返し表示で監視やキー処理を重複させず、再プレイ時にinertを解除する', () => {
    const r = runtime();
    for (let round = 0; round < 3; round++) {
        r.context.utils.completeGameClear('');
        assert.equal(r.overlay.listenerCount('keydown'), 1);
        assert.equal(r.observers.filter(o => o.active).length, 1);
        assert.equal(r.app.hasAttribute('inert'), true);
        r.flushTimers();
        assert.equal(r.document.activeElement, r.first);
        r.last.focus();
        let prevented = false;
        r.overlay.emit('keydown', { key: 'Tab', preventDefault() { prevented = true; } });
        assert.equal(prevented, true);
        assert.equal(r.document.activeElement, r.first);
        r.hide();
        assert.equal(r.app.hasAttribute('inert'), false);
        assert.equal(r.overlay.listenerCount('keydown'), 0);
        assert.equal(r.observers.filter(o => o.active).length, 0);
        assert.equal(r.document.activeElement, r.back);
    }
});

test('即座に閉じたクリア画面へ遅れてフォーカスを移さない', () => {
    const r = runtime();
    r.context.utils.completeGameClear('');
    r.hide();
    r.flushTimers();
    assert.equal(r.document.activeElement, r.back);
});

test('元からあるinertをクリア画面の終了で解除しない', () => {
    const r = runtime();
    r.app.setAttribute('inert', '');
    r.context.utils.completeGameClear('');
    r.hide();
    assert.equal(r.app.hasAttribute('inert'), true);
});

test('保護者モーダルは共通処理だけで開閉し、Escape相当のcloseでも状態を戻す', () => {
    const r = runtime();
    let showCount = 0;
    r.dialog.showModal = () => { showCount++; r.dialog.setAttribute('open', ''); };
    r.dialog.close = () => { r.dialog.removeAttribute('open'); r.dialog.emit('close'); };
    r.ready.forEach(callback => callback());
    r.opener.emit('click');
    assert.equal(showCount, 1);
    assert.equal(r.opener.getAttribute('aria-expanded'), 'true');
    r.dialog.close();
    assert.equal(r.opener.getAttribute('aria-expanded'), 'false');
    assert.equal(r.document.activeElement, r.opener);
    r.opener.emit('click');
    r.closer.emit('click');
    assert.equal(showCount, 2);
    assert.equal(r.opener.getAttribute('aria-expanded'), 'false');
});

test('dialog未対応ブラウザでも保護者画面を表示して閉じられる', () => {
    const r = runtime();
    r.ready.forEach(callback => callback());
    r.opener.emit('click');
    assert.equal(r.dialog.style.display, 'block');
    r.dialog.emit('click');
    assert.equal(r.dialog.style.display, 'none');
    assert.equal(r.opener.getAttribute('aria-expanded'), 'false');
});

test('各ゲームのクリア画面はinert対象のmainの後に置き、モーダルの二重初期化をなくす', () => {
    for (const name of ['matching', 'hiragana', 'puzzle', 'shopping', 'zukan', 'piano', 'index']) {
        const html = fs.readFileSync(path.join(__dirname, '..', name + '.html'), 'utf8');
        const main = html.match(/<main\b[^>]*id="app"[\s\S]*?<\/main>/)?.[0];
        assert.ok(main, name);
        assert.doesNotMatch(main, /id="clear-overlay"/, name);
        assert.doesNotMatch(html, /const openBtns = document\.querySelectorAll/, name);
        assert.equal((html.match(/src="common\.js"/g) || []).length, 1, name);
    }
});
