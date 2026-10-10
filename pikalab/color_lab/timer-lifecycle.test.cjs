const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createHarness() {
    const intervals = new Map();
    let nextTimerId = 0;
    const documentHandlers = {};
    function element(id) {
        return {
            id, handlers: {}, textContent: '', value: '', style: {},
            classList: { add() {}, remove() {}, contains() { return false; } },
            addEventListener(type, callback) { this.handlers[type] = callback; },
            setAttribute() {}, focus() {}, appendChild() {}, remove() {}
        };
    }
    const ids = ['start-timeattack-game', 'start-normal-game', 'game-timer-display', 'game-timer-panel', 'game-r', 'game-g', 'game-b', 'game-target-rgb', 'check-btn', 'exit-game-btn'];
    const elements = Object.fromEntries(ids.map(id => [id, element(id)]));
    const document = {
        hidden: false,
        readyState: 'complete',
        activeElement: { id: '' },
        addEventListener(type, callback) { documentHandlers[type] = callback; },
        getElementById(id) { return elements[id] || null; },
        querySelectorAll() { return []; },
        createElement() { return element(''); },
        body: { appendChild() {} }
    };
    const context = {
        document,
        console: { warn() {}, error() {} },
        navigator: {},
        localStorage: { getItem() { return null; }, setItem() {} },
        setInterval(callback) { const id = ++nextTimerId; intervals.set(id, callback); return id; },
        clearInterval(id) { intervals.delete(id); },
        setTimeout() { return 1; },
        clearTimeout() {}
    };
    context.window = context;
    vm.createContext(context);
    for (const filename of ['logic.js', 'script.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, filename), 'utf8'), context);
    }
    return {
        elements, intervals,
        click(id) { elements[id].handlers.click(); },
        tick() { [...intervals.values()].forEach(callback => callback()); },
        setHidden(hidden) { document.hidden = hidden; documentHandlers.visibilitychange(); }
    };
}

test('タブ復帰時にタイムアタックの残り秒数を30秒へリセットしない', () => {
    const h = createHarness();
    h.click('start-timeattack-game');
    h.tick(); h.tick(); h.tick();
    assert.equal(h.elements['game-timer-display'].textContent, '27');
    h.setHidden(true);
    assert.equal(h.intervals.size, 0);
    h.setHidden(false);
    assert.equal(h.elements['game-timer-display'].textContent, '27');
    assert.equal(h.intervals.size, 1);
    h.tick();
    assert.equal(h.elements['game-timer-display'].textContent, '26');
});

test('タイムボーナスもタブ復帰後に保持する', () => {
    const h = createHarness();
    h.click('start-timeattack-game');
    const target = h.elements['game-target-rgb'].textContent.match(/\d+/g);
    for (const [index, channel] of ['r', 'g', 'b'].entries()) h.elements[`game-${channel}`].value = target[index];
    h.click('check-btn');
    const remaining = Number(h.elements['game-timer-display'].textContent);
    assert.ok(remaining > 30);
    h.setHidden(true); h.setHidden(false);
    assert.equal(Number(h.elements['game-timer-display'].textContent), remaining);
});

test('別コースを開始したときに以前のタイマーが残らない', () => {
    const h = createHarness();
    h.click('start-timeattack-game');
    h.click('start-normal-game');
    assert.equal(h.intervals.size, 0);
    h.click('start-timeattack-game');
    assert.equal(h.elements['game-timer-display'].textContent, '30');
    assert.equal(h.intervals.size, 1);
    h.click('exit-game-btn');
    assert.equal(h.intervals.size, 0);
});
