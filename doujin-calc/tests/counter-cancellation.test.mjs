import test from 'node:test';
import assert from 'node:assert/strict';
import { StateStore } from '../js/state.js';
import { UIRenderer } from '../js/renderer.js';

function setup(savedCounter) {
  const storage = new Map();
  if (savedCounter !== undefined) storage.set('doujin_calc_multi_counter_v1.4', savedCounter);
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value)
  };
  globalThis.window = { location: { search: '', pathname: '/doujin-calc/' }, history: { replaceState() {} } };
  globalThis.document = { querySelector: () => null };
  const store = new StateStore();
  const renderer = Object.create(UIRenderer.prototype);
  renderer.dom = Object.fromEntries([
    'labelLiveCounterTotalSold', 'labelLiveCounterRemaining', 'labelLiveCounterSales',
    'counterValNewBook', 'counterValSet', 'counterValBackNumber', 'counterValGoods',
    'btnUndoNewBook', 'btnUndoSet', 'btnUndoBackNumber', 'btnUndoGoods', 'labelChangeTotal', 'textareaMenuMemo', 'btnCopyBankMemo'
  ].map(name => [name, {}]));
  const render = () => renderer.updateCalculations(store.state, store.multiCounter, store);
  store.subscribe(render);
  render();
  return { store, dom: renderer.dom, storage };
}

test('商品別の取消は他の商品を保ち、新刊在庫と売上を同時に戻して次回復元する', () => {
  const { store, dom } = setup();
  const planBefore = { ...store.state };
  for (const [key, count] of Object.entries({ newBook: 2, set: 1, backNumber: 3, goods: 4 })) {
    for (let i = 0; i < count; i++) assert.equal(store.adjustCounter(key, 1), true);
  }
  assert.equal(dom.labelLiveCounterTotalSold.textContent, '3 部');
  assert.equal(dom.labelLiveCounterRemaining.textContent, '新刊残り 95 部');
  assert.equal(dom.labelLiveCounterSales.textContent, '¥7,800');

  for (const [key, expectedSales, expectedBooks, expectedRemaining] of [
    ['set', '¥6,300', '2 部', '新刊残り 96 部'],
    ['newBook', '¥5,500', '1 部', '新刊残り 97 部'],
    ['backNumber', '¥5,000', '1 部', '新刊残り 97 部'],
    ['goods', '¥4,200', '1 部', '新刊残り 97 部']
  ]) {
    const before = { ...store.multiCounter };
    assert.equal(store.adjustCounter(key, -1), true);
    assert.deepEqual(store.multiCounter, { ...before, [key]: before[key] - 1 });
    assert.equal(dom.labelLiveCounterSales.textContent, expectedSales);
    assert.equal(dom.labelLiveCounterTotalSold.textContent, expectedBooks);
    assert.equal(dom.labelLiveCounterRemaining.textContent, expectedRemaining);
  }
  assert.equal(dom.btnUndoSet.disabled, true);
  assert.equal(dom.btnUndoNewBook.disabled, false);
  assert.deepEqual(store.state, planBefore);
  const restored = new StateStore();
  assert.deepEqual(restored.multiCounter, { newBook: 1, set: 0, backNumber: 2, goods: 3 });
  assert.deepEqual(restored.state, planBefore);
});

test('0件の取消、未知の商品、範囲外の操作では負数や余計な保存を作らない', () => {
  const { store, dom, storage } = setup();
  for (const key of ['newBook', 'set', 'backNumber', 'goods']) assert.equal(store.adjustCounter(key, -1), false);
  assert.equal(store.adjustCounter('unknown', 1), false);
  assert.equal(store.adjustCounter('newBook', -2), false);
  assert.equal(storage.size, 0);
  assert.equal(dom.btnUndoNewBook.disabled, true);
  assert.equal(dom.labelLiveCounterSales.textContent, '¥0');
  assert.equal(store.adjustCounter('newBook', 1), true);
  assert.equal(store.adjustCounter('newBook', -1), true);
  assert.equal(store.adjustCounter('newBook', -1), false);
  assert.equal(dom.btnUndoNewBook.disabled, true);
  assert.equal(dom.labelLiveCounterRemaining.textContent, '新刊残り 98 部');
});

test('保存値の欠損・型違いを読み直しても取消操作や合計表示が壊れない', () => {
  const { store, dom } = setup(JSON.stringify({ newBook: '2', set: -1, backNumber: 1.5, goods: null, unknown: 9 }));
  assert.deepEqual(store.multiCounter, { newBook: 2, set: 0, backNumber: 0, goods: 0 });
  assert.equal(store.adjustCounter('newBook', -1), true);
  assert.equal(dom.labelLiveCounterSales.textContent, '¥800');
  const malformed = setup('{broken');
  assert.deepEqual(malformed.store.multiCounter, { newBook: 0, set: 0, backNumber: 0, goods: 0 });
});

test('販売時の単価を保存し、直前の販売をその価格で取り消す', () => {
  const { store, dom } = setup();
  store.setState({ customPrice: 500, copies: 2, nonSale: 0 });
  assert(store.adjustCounter('newBook', 1));
  store.setState({ customPrice: 1000 });
  assert.equal(dom.labelLiveCounterSales.textContent, '¥500');
  assert(store.adjustCounter('newBook', 1));
  assert.equal(dom.labelLiveCounterSales.textContent, '¥1,500');
  const restored = new StateStore();
  assert.equal(restored.newBookRevenue, 1500);
  assert(!restored.adjustCounter('newBook', 1));
  assert(!restored.adjustCounter('set', 1));
  assert(restored.adjustCounter('goods', 1));
  assert(restored.adjustCounter('newBook', -1));
  assert.equal(restored.newBookRevenue, 500);
  assert(restored.adjustCounter('set', 1));
});

test('共有URLの価格で旧レジを上書きせず、保存済みの端末の価格で一度だけ移行する', () => {
  const { storage } = setup();
  storage.set('doujin_calc_multi_counter_v1.4', JSON.stringify({newBook: 2}));
  storage.set('doujin_calc_state_v1.4', JSON.stringify({customPrice: 650}));
  window.location.search = '?p=1500&n=20';
  const migrated = new StateStore();
  assert.equal(migrated.state.customPrice, 1500);
  assert.equal(migrated.newBookRevenue, 1300);
  assert(migrated.adjustCounter('newBook', 1));
  assert.equal(migrated.newBookRevenue, 2800);
  assert.equal(new StateStore().newBookRevenue, 2800);
});

test('別タブの同時販売と取消は最後の1部を共有し、販売時の価格を保つ', async () => {
  const { store } = setup();
  let scheduled = Promise.resolve();
  window.navigator = { locks: { request(_name, action) {
    const next = scheduled.then(action);
    scheduled = next;
    return next;
  } } };
  const other = new StateStore();
  store.setState({ customPrice: 500, copies: 2, nonSale: 0 });
  other.setState({ customPrice: 1000, copies: 2, nonSale: 0 });
  assert.deepEqual(await Promise.all([store.adjustCounter('newBook', 1), other.adjustCounter('newBook', 1)]), [true, true]);
  assert.equal(new StateStore().newBookRevenue, 1500);
  assert.deepEqual(await Promise.all([store.adjustCounter('newBook', -1), other.adjustCounter('newBook', -1)]), [true, true]);
  store.setState({ copies: 1 });
  other.setState({ copies: 1 });
  assert.deepEqual(await Promise.all([store.adjustCounter('newBook', 1), other.adjustCounter('set', 1)]), [true, false]);
  assert(await other.resetCounter());
  assert.equal(new StateStore().newBookRevenue, 0);
});

test('価格の入力途中と書込失敗は売上にせず、復旧時に一度だけ加算する', () => {
  const { store, dom } = setup();
  for (const draft of ['', '20x', '1.5', '-1', '2,00']) {
    store.setCustomPriceInput(draft);
    assert.equal(store.adjustCounter('newBook', 1), false);
    assert.match(dom.labelChangeTotal.textContent, /1円単位/);
    assert.match(dom.textareaMenuMemo.value, /1円単位の整数/);
    assert.equal(dom.btnCopyBankMemo.disabled, true);
    assert.equal(store.newBookRevenue, 0);
  }
  store.setCustomPriceInput('１，０００');
  const original = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('quota'); };
  assert.equal(store.adjustCounter('newBook', 1), false);
  assert.equal(store.newBookRevenue, 0);
  assert.match(store.counterError, /保存できません/);
  localStorage.setItem = original;
  assert.equal(store.adjustCounter('newBook', 1), true);
  assert.equal(new StateStore().newBookRevenue, 1000);
});
