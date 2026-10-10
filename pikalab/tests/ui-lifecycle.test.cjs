const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
  const timers = new Map(); let sequence = 0;
  const elements = new Map();
  const documentListeners = new Map();
  function element(id, hidden = false) {
    const classes = new Set(hidden ? ['hidden'] : []);
    const handlers = new Map();
    const el = { id, style: {}, focusCount: 0, handlers,
      classList: { add: (...xs) => xs.forEach(x => classes.add(x)), remove: (...xs) => xs.forEach(x => classes.delete(x)), contains: x => classes.has(x) },
      addEventListener: (name, fn) => { if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(fn); },
      removeEventListener: (name, fn) => handlers.get(name)?.delete(fn),
      setAttribute() {}, removeAttribute() {}, contains: target => target === el,
      querySelectorAll: () => [], focus() { this.focusCount++; document.activeElement = this; }
    };
    elements.set(id, el); return el;
  }
  const trigger = element('trigger');
  const document = { activeElement: trigger, getElementById: id => elements.get(id), querySelector: () => null, addEventListener: (name, fn) => documentListeners.set(name, fn) };
  const context = { document, TIMING: { MODAL_FADE: 200, MENU_OPEN_DELAY: 10, MENU_CLOSE: 200 }, playSound() {}, userProfile: {},
    setTimeout(fn) { const id = ++sequence; timers.set(id, fn); return id; }, clearTimeout(id) { timers.delete(id); }
  };
  const source = fs.readFileSync(path.join(__dirname, '../js/ui.js'), 'utf8')
    .replace(/^import .*?;\n/gm, '').replace(/export /g, '');
  vm.createContext(context); vm.runInContext(source + '\nthis.api = {openModal,closeModal,setupFocusTrap,toggleMenu,maybeCloseMenu,initUIEventListeners};', context);
  const flush = () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); };
  return { element, trigger, document, documentListeners, timers, flush, ...context.api };
}

test('モーダルを即座に閉じても遅延フォーカスが隠れた内容へ移らない', () => {
  const s = setup(); const modal = s.element('modal', true); const button = s.element('modal-button'); modal.querySelectorAll = () => [button];
  s.openModal('modal'); s.closeModal('modal'); s.flush();
  assert.equal(button.focusCount, 0); assert.equal(s.document.activeElement, s.trigger);
});

test('同じモーダルの再設定はキー監視と遅延フォーカスを一重に保つ', () => {
  const s = setup(); const modal = s.element('modal', true); modal.querySelectorAll = () => [s.element('modal-button')];
  s.setupFocusTrap('modal'); s.setupFocusTrap('modal');
  assert.equal(modal.handlers.get('keydown').size, 1); assert.equal(s.timers.size, 1);
});

test('メニューの閉じる途中で再び開いても古いタイマーで隠れない', () => {
  const s = setup(); const menu = s.element('dropdown-menu', true); const search = s.element('app-search');
  s.toggleMenu(); s.flush(); s.toggleMenu(); s.toggleMenu(); s.flush();
  assert.equal(menu.classList.contains('hidden'), false); assert.equal(menu.classList.contains('opacity-100'), true); assert.equal(s.document.activeElement, search);
});

test('メニューを開いた直後に閉じると検索欄への遅延フォーカスを取り消す', () => {
  const s = setup(); const menu = s.element('dropdown-menu', true); const search = s.element('app-search');
  s.toggleMenu(); s.toggleMenu(); s.flush();
  assert.equal(menu.classList.contains('hidden'), true); assert.equal(search.focusCount, 0); assert.equal(s.document.activeElement, s.trigger);
});


test('閉じる専用の呼び出しを重ねてもメニューを再び開かない', () => {
  const s = setup(); const menu = s.element('dropdown-menu', true); s.element('app-search');
  s.toggleMenu(); s.flush(); s.maybeCloseMenu(false); s.maybeCloseMenu(false); s.flush();
  assert.equal(menu.classList.contains('hidden'), true);
});

test('閉じる途中の連続した外側クリックでメニューを開き直さない', () => {
  const s = setup(); const menu = s.element('dropdown-menu', true); s.element('menu-toggle-btn'); s.element('app-search');
  s.initUIEventListeners(); s.toggleMenu(); s.flush();
  const outside = {target:s.trigger}; s.documentListeners.get('click')(outside); s.documentListeners.get('click')(outside); s.flush();
  assert.equal(menu.classList.contains('hidden'), true);
});
