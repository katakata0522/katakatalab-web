const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function hub() {
    let layouts = 0;
    const timers = new Map();
    let timerId = 0;
    const makeElement = (attrs = {}) => {
        const classes = new Set();
        const listeners = new Map();
        return {
            style: {}, value: '', textContent: '',
            classList: { add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)), contains: name => classes.has(name) },
            getAttribute: name => attrs[name] || null,
            addEventListener: (name, callback) => listeners.set(name, callback),
            emit: (name, event = {}) => listeners.get(name)?.({ preventDefault() {}, ...event })
        };
    };
    const cards = Array.from({ length: 25 }, (_, index) => {
        const card = makeElement({ 'data-category': index % 2 ? 'math' : 'reading' });
        card.querySelector = selector => ({ textContent: selector === '.title' ? `記事${index} ${index % 2 ? '算数' : '読書'}` : '' });
        Object.defineProperty(card, 'offsetWidth', { get() { layouts++; return 100; } });
        return card;
    });
    const list = makeElement();
    list.querySelectorAll = () => cards;
    list.getBoundingClientRect = () => ({ top: 10 });
    Object.defineProperty(list, 'offsetWidth', { get() { layouts++; return 500; } });
    const inputs = [makeElement(), makeElement()];
    const pills = ['all', 'math', 'reading'].map(value => makeElement({ 'data-filter': value }));
    const elements = Object.fromEntries(['load-more-btn', 'load-more-container', 'no-results-state', 'search-result-count', 'reset-filters-btn'].map(id => [id, makeElement()]));
    elements['article-list'] = list;
    const events = new Map();
    const location = { pathname: '/pikalab/articles/', search: '?keep=value', hash: '#article-list' };
    const context = {
        URLSearchParams,
        document: {
            readyState: 'complete',
            getElementById: id => elements[id] || null,
            querySelectorAll: selector => selector === '.worry-pill' ? pills : inputs
        },
        location,
        history: { replaceState(state, unused, target) { const parsed = new URL(target, 'https://example.com'); Object.assign(location, { pathname: parsed.pathname, search: parsed.search, hash: parsed.hash }); } },
        addEventListener: (name, callback) => events.set(name, callback),
        setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
        clearTimeout: id => timers.delete(id),
        scrollTo() {}
    };
    context.window = context;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'hub.js'), 'utf8'), context);
    return {
        cards, inputs, pills, elements, location,
        layouts: () => layouts,
        visible: () => cards.filter(card => !card.classList.contains('hidden-article') && !card.classList.contains('article-hidden-by-limit')),
        flush: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()); }
    };
}

test('記事ハブは同じページ件数・絞り込みを保ち、一更新につき一度だけレイアウトを読む', () => {
    const h = hub();
    assert.equal(h.visible().length, 6);
    assert.equal(h.layouts(), 1);
    assert.ok(h.visible().every(card => card.classList.contains('article-fade-in')));
    h.elements['load-more-btn'].emit('click');
    assert.equal(h.visible().length, 16);
    assert.equal(h.layouts(), 2);
    h.pills[1].emit('click');
    assert.equal(h.visible().length, 6);
    assert.equal(h.elements['search-result-count'].textContent, '12件');
    assert.equal(h.layouts(), 3);
    assert.ok(h.visible().every(card => card.getAttribute('data-category') === 'math'));
});

test('検索とリセットで入力を同期し、記事へのフラグメントと無関係なURLパラメータを維持する', () => {
    const h = hub();
    h.inputs[0].value = '存在しない言葉';
    h.inputs[0].emit('input');
    h.flush();
    assert.equal(h.visible().length, 0);
    assert.equal(h.elements['no-results-state'].style.display, 'block');
    assert.equal(h.inputs[1].value, h.inputs[0].value);
    assert.equal(h.location.hash, '#article-list');
    assert.equal(new URLSearchParams(h.location.search).get('keep'), 'value');
    h.elements['reset-filters-btn'].emit('click');
    assert.equal(h.visible().length, 6);
    assert.equal(h.inputs[0].value, '');
    assert.equal(h.inputs[1].value, '');
    assert.equal(new URLSearchParams(h.location.search).has('q'), false);
    assert.equal(h.location.hash, '#article-list');
});
