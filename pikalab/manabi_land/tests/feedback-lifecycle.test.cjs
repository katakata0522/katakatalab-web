const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

function harness() {
    let now = 0;
    let nextId = 1;
    const jobs = new Map();
    const nodes = new Map();
    function node() {
        const classes = new Set();
        return {
            style: {}, children: [], textContent: '',
            classList: { add: (...values) => values.forEach(v => classes.add(v)), remove: (...values) => values.forEach(v => classes.delete(v)), contains: value => classes.has(value) },
            setAttribute() {}, appendChild(child) { this.children.push(child); },
            replaceChild() {}, querySelector: () => node(), cloneNode: () => node(),
            remove() {}, addEventListener() {},
            clientWidth: 240, clientHeight: 240
        };
    }
    const document = {
        hidden: false, body: node(),
        getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); },
        createElement: node, querySelectorAll: () => [], addEventListener() {}
    };
    const schedule = (fn, delay, repeat = false) => {
        const id = nextId++;
        jobs.set(id, { fn, at: now + delay, delay, repeat });
        return id;
    };
    const context = vm.createContext({
        document, localStorage: { getItem: () => null }, console,
        Date: { now: () => now },
        setTimeout: (fn, ms) => schedule(fn, ms), clearTimeout: id => jobs.delete(id),
        setInterval: (fn, ms) => schedule(fn, ms, true), clearInterval: id => jobs.delete(id)
    });
    vm.runInContext(`${source}\nglobalThis.app = new ManabiLandApp();`, context);
    const app = context.app;
    app.audio = { playSfx() {} };
    function advance(ms) {
        const end = now + ms;
        while (true) {
            const due = [...jobs].filter(([, job]) => job.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
            if (!due) break;
            const [id, job] = due;
            now = job.at;
            if (job.repeat) job.at += job.delay;
            else jobs.delete(id);
            job.fn();
        }
        now = end;
    }
    return { app, document, advance };
}

for (const mode of ['money', 'clock-read', 'clock-set', 'moji']) {
    test(`${mode}: 3つ目の正解後もファンファーレ終了まで操作をロックする`, () => {
        const { app, document, advance } = harness();
        app.stars = 2;
        app.tabId = mode === 'moji' ? 'tab-moji' : mode === 'money' ? 'tab-money' : 'tab-clock';
        let answer;
        if (mode === 'money') {
            app.moneyGame.targetPrice = 100;
            app.moneyGame.coinHistory = [100];
            answer = () => app.moneyGame.checkMoney();
        } else if (mode === 'clock-read') {
            app.clockGame.initRead();
            const { targetHour: h, targetMinute: m } = app.clockGame;
            const correct = `${h}じ ${m === 0 ? '' : m + 'ふん'}`;
            answer = () => document.getElementById('clock-opts').children.find(button => button.textContent === correct).onclick();
        } else if (mode === 'clock-set') {
            app.clockGame.targetHour = app.clockGame.currentHour = 2;
            app.clockGame.targetMinute = app.clockGame.currentMinute = 0;
            answer = () => app.clockGame.checkClockSet();
        } else {
            app.mojiGame.initGame();
            answer = () => app.mojiGame.handleCellClick(document.getElementById(`moji-cell-${app.mojiGame.correctIndex}`), app.mojiGame.correctIndex);
        }
        const game = mode === 'money' ? app.moneyGame : mode === 'moji' ? app.mojiGame : app.clockGame;
        const method = mode === 'clock-read' ? 'initRead' : mode === 'clock-set' ? 'initSet' : 'initGame';
        const reset = game[method].bind(game);
        let resetCount = 0;
        game[method] = () => { resetCount++; reset(); };
        answer();
        advance(1500);
        assert.equal(resetCount, 1);
        assert.equal(app.isLocked, true);
        const tab = app.tabId;
        app.switchTab(tab === 'tab-money' ? 'tab-clock' : 'tab-money');
        assert.equal(app.tabId, tab);
        if (mode === 'moji') {
            assert.equal(app.mojiGame.mIv, null);
            document.hidden = true;
            app.mojiGame.handleVisibilityChange();
            document.hidden = false;
            app.mojiGame.handleVisibilityChange();
            assert.equal(app.mojiGame.mIv, null);
        }
        advance(3299);
        assert.equal(app.isLocked, true);
        advance(1);
        assert.equal(app.isLocked, false);
        assert.equal(resetCount, 1);
        if (mode === 'moji') assert.notEqual(app.mojiGame.mIv, null);
    });
}

test('通常の正解は1.5秒で次問へ進み、非表示中は文字探しの時間を数えない', () => {
    const { app, document, advance } = harness();
    app.mojiGame.initGame();
    advance(500);
    const cell = document.getElementById(`moji-cell-${app.mojiGame.correctIndex}`);
    app.mojiGame.handleCellClick(cell, app.mojiGame.correctIndex);
    assert.equal(app.mojiGame.mIv, null);
    document.hidden = true;
    advance(1500);
    assert.equal(app.isLocked, false);
    assert.equal(app.mojiGame.mIv, null);
    advance(5000);
    assert.equal(document.getElementById('timer').textContent, '0.0');
    document.hidden = false;
    app.mojiGame.handleVisibilityChange();
    advance(200);
    assert.equal(document.getElementById('timer').textContent, '0.2');
    app.switchTab('tab-money');
    assert.equal(app.mojiGame.mIv, null);
    advance(2000);
    assert.equal(document.getElementById('timer').textContent, '0.2');
    app.switchTab('tab-moji');
    advance(100);
    assert.equal(document.getElementById('timer').textContent, '0.3');
});
