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
    'btnUndoNewBook', 'btnUndoSet', 'btnUndoBackNumber', 'btnUndoGoods'
  ].map(name => [name, {}]));
  const render = () => renderer.updateCalculations(store.state, store.multiCounter);
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
