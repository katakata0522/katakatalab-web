const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadGame(name) {
    const timers = new Map();
    let timerId = 0;
    let clears = 0;
    let now = 0;
    const elements = new Map();
    function node() {
        const classes = new Set();
        const value = {
            style: { setProperty() {} }, children: [], dataset: {}, innerText: '', className: '',
            setAttribute() {}, addEventListener() {}, remove() {},
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 20, height: 20 }),
            classList: {
                add: (...names) => names.forEach(name => classes.add(name)),
                remove: (...names) => names.forEach(name => classes.delete(name)),
                contains: name => classes.has(name),
                replace: (before, after) => { if (classes.delete(before)) classes.add(after); }
            },
            appendChild(child) { this.children.push(child); child.parentNode = this; }
        };
        Object.defineProperty(value, 'innerHTML', { set() { this.children = []; } });
        return value;
    }
    const document = {
        body: node(),
        createElement: node,
        getElementById(id) { if (!elements.has(id)) elements.set(id, node()); return elements.get(id); },
        addEventListener() {}
    };
    const context = vm.createContext({
        document,
        console: { log() {}, error() {}, warn() {} },
        setTimeout(callback, delay = 0) { timers.set(++timerId, { callback, time: now + delay }); return timerId; },
        clearTimeout: id => timers.delete(id),
        Math: Object.assign(Object.create(Math), { random: () => 0 })
    });
    context.window = context;
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../common.js'), 'utf8'), context);
    vm.runInContext('EduUtils.shootConfetti = () => {}; EduUtils.completeGameClear = () => reportClear();', Object.assign(context, { reportClear: () => clears++ }));
    const html = fs.readFileSync(path.join(__dirname, '..', name + '.html'), 'utf8');
    const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
    vm.runInContext(source, context);
    function flush() {
        let attempts = 0;
        while (timers.size) {
            assert.ok(attempts++ < 100, 'タイマーが無限に再生成されない');
            const [id, timer] = [...timers.entries()].sort((a, b) => a[1].time - b[1].time)[0];
            timers.delete(id);
            now = timer.time;
            timer.callback();
        }
    }
    return { context, document, node, flush, clears: () => clears, run: script => vm.runInContext(script, context) };
}

test('ひらがなは再プレイ時に5問カウントをリセットする', () => {
    const game = loadGame('hiragana');
    game.run("currentMode = 'quiz'; quizCount = 5; startQuiz(true);");
    assert.equal(game.run('quizCount'), 0);
    game.run('checkAnswer(quizTarget)');
    game.flush();
    assert.equal(game.run('quizCount'), 1);
    assert.equal(game.clears(), 0, '再プレイの1問目だけでクリアにしない');
});

test('ひらがなは正解の表示中におすモードへ戻っても古いクイズを再開しない', () => {
    const game = loadGame('hiragana');
    game.run("setMode('quiz'); checkAnswer(quizTarget); setMode('learn');");
    game.flush();
    assert.equal(game.run('currentMode'), 'learn');
    assert.equal(game.document.getElementById('quiz-prompt').classList.contains('hidden'), true);
    assert.equal(game.document.getElementById('feedback-overlay').classList.contains('hidden'), true);
    assert.equal(game.run('isAnimating'), false);
});

test('ずかんは正解の表示中にメニューへ戻っても前の問題を実行しない', () => {
    const game = loadGame('zukan');
    game.run("showSection(categories[0]); setMode('quiz'); checkAnswer(quizTarget); backToMenu();");
    assert.doesNotThrow(() => game.flush());
    assert.equal(game.run('currentCategory'), null);
    assert.equal(game.run('isAnimating'), false);
    assert.equal(game.document.getElementById('feedback-overlay').classList.contains('hidden'), true);
    assert.equal(game.clears(), 0);
});

test('おかいものは飛行中の品物を予約し、連打でも指定数を超えない', () => {
    const game = loadGame('shopping');
    game.run('initGame()');
    assert.equal(game.run('targetAmount'), 2);
    const items = game.document.getElementById('shelf-container').children;
    items.forEach(item => item.onclick({}));
    assert.equal(game.run('pendingAmount'), 2);
    assert.equal(game.run('currentAmount'), 0, '表示数は到着まで増やさない');
    game.flush();
    assert.equal(game.run('currentAmount'), 2);
    assert.equal(game.run('pendingAmount'), 0);
    assert.equal(game.clears(), 1);
    game.run('initGame()');
    assert.equal(game.run('currentAmount'), 0);
    assert.equal(game.run('pendingAmount'), 0);
});
