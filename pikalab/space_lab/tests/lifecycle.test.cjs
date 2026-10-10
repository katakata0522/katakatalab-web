const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function runtime() {
    const pending = new Map(), elements = new Map();
    let next = 0;
    const document = { hidden: false, activeElement: null, addEventListener() {}, getElementById: id => elements.get(id), createElement: () => node() };
    function node() {
        const classes = new Set(), attributes = new Map(), listeners = {};
        const element = {
            children: [], style: { setProperty() {} }, isConnected: true, disabled: false, inert: false, dataset: {},
            classList: { add: (...items) => items.forEach(x => classes.add(x)), remove: (...items) => items.forEach(x => classes.delete(x)), contains: x => classes.has(x) },
            setAttribute: (key, value) => attributes.set(key, value), removeAttribute: key => attributes.delete(key),
            querySelector: () => null, querySelectorAll: () => [], closest: () => null,
            getClientRects: () => [{ width: 40, height: 40 }], contains: child => element === child || element.children.includes(child),
            focus() { document.activeElement = this; }, appendChild(child) { this.children.push(child); },
            addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
            click() { for (const handler of listeners.click || []) handler({}); this.onclick?.(); },
            remove() { this.isConnected = false; }, listeners,
        };
        Object.defineProperty(element, 'innerHTML', { set(value) { element.children = []; element.html = value; }, get() { return element.html || ''; } });
        return element;
    }
    const UI = { DOM: Object.fromEntries(['modal', 'warpOverlay', 'stamp', 'closeBtn', 'closeModalBottomBtn', 'closeUfoBtn', 'closeCelBtn', 'warpNextBtn', 'celOverlay', 'celBox', 'secretModal', 'btnCloseSecret', 'headerBadgeDot', 'bgmToggleBtn'].map(id => [id, node()])) };
    UI.DOM.quiz = Object.fromEntries(['section', 'res', 'q', 'options', 'icon', 'text', 'exp', 'btn', 'retryBtn'].map(id => [id, node()]));
    const State = { currentPlanet: 'sun', visited: new Set(), solvedQuizzes: { sun: [] }, save() {} };
    const context = vm.createContext({ console, document, window: { removeEventListener() {} }, navigator: {}, UI, State,
        getComputedStyle: () => ({ visibility: 'visible' }),
        setTimeout(callback) { pending.set(++next, callback); return next; }, clearTimeout: id => pending.delete(id),
        requestAnimationFrame(callback) { pending.set(++next, callback); return next; }, cancelAnimationFrame: id => pending.delete(id),
        Audio: { play() {}, ensure: async () => {} }, CanvasMap: { pause() {}, play() {} },
        StorageHelper: { getItem: () => null, setItem() {} }, resolvePlanetImageUrl: x => x,
        performance: { now: () => 0 },
    });
    for (const filename of ['config.js', 'data.js', 'lifecycle.mjs']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', filename), 'utf8').replace(/^export /gm, ''), context);
    }
    const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8').replace(/^import .*;\r?\n/gm, '');
    vm.runInContext(`${script}\nglobalThis.testRuntime = {App, TaskScope, ModalStack, PLANETS, Starfield};`, context);
    const { App, TaskScope, ModalStack, PLANETS, Starfield } = context.testRuntime;
    App.modals = { top: UI.DOM.modal, block() {}, open(element) { this.top = element; }, close(element) { if (this.top === element) this.top = null; } };
    return { App, TaskScope, ModalStack, PLANETS, Starfield, UI, State, document, node, pending,
        flush() { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback()); } };
}

test('取り消したタイマーとフレームは配送済みでも旧画面を変更しない', () => {
    const r = runtime(), scope = new r.TaskScope();
    let calls = 0;
    scope.later(() => calls++, 100); scope.frame(() => calls++);
    const delivered = [...r.pending.values()];
    scope.cancel();
    assert.equal(r.pending.size, 0);
    delivered.forEach(callback => callback());
    assert.equal(calls, 0);
    scope.later(() => calls++, 100); r.flush();
    assert.equal(calls, 1);
    assert.equal(scope.timers.size, 0);
});

test('次の問題を待つ間に閉じても別の星へ古い問題を戻さない', () => {
    const r = runtime(), { App, UI, State, PLANETS } = r;
    const planet = PLANETS[0], quiz = planet.quizzes[0];
    App.currentQuizIndex = 0;
    App._updateQuizProgressBadge = () => {};
    UI.DOM.quiz.options.children = quiz.options.map(() => r.node());
    App.handleQuiz(quiz, quiz.correctIndex);
    assert.equal(State.solvedQuizzes.sun.length, 1);
    UI.DOM.quiz.btn.click();
    const delivered = [...r.pending.values()];
    App.closeModal();
    State.currentPlanet = 'earth';
    let stale = 0;
    App._setupQuiz = () => stale++;
    delivered.forEach(callback => callback()); r.flush();
    assert.equal(stale, 0);
    assert.equal(App.quizTasks.timers.size, 0);
});

test('同じ正解と次へを連打しても保存と次の問題の予約は一度だけ', () => {
    const r = runtime(), { App, UI, State, PLANETS } = r;
    const quiz = PLANETS[0].quizzes[0];
    App.currentQuizIndex = 0; App._updateQuizProgressBadge = () => {};
    let saves = 0, setups = 0;
    State.save = () => saves++;
    UI.DOM.quiz.options.children = quiz.options.map(() => r.node());
    App.handleQuiz(quiz, quiz.correctIndex); App.handleQuiz(quiz, quiz.correctIndex);
    UI.DOM.quiz.btn.click(); UI.DOM.quiz.btn.click();
    App._setupQuiz = () => setups++;
    r.flush();
    assert.equal(saves, 1); assert.equal(setups, 1);
});

test('復習の次の問題でも結果パネルを隠さず、必ず別問題へ進む', () => {
    const r = runtime(), { App, UI, State, PLANETS } = r;
    State.solvedQuizzes.sun = [0, 1, 2]; State.visited.add('sun');
    App.bindModalEvents();
    App._setupQuiz(PLANETS[0]);
    for (let i = 0; i < 12; i++) {
        const before = UI.DOM.quiz.q.textContent;
        UI.DOM.quiz.btn.click();
        assert.notEqual(UI.DOM.quiz.q.textContent, before);
        assert.equal(UI.DOM.quiz.res.classList.contains('opacity-0'), false);
        assert.equal(UI.DOM.quiz.res.classList.contains('pointer-events-none'), false);
    }
});

test('ひみつファイルを閉じて直ちに開いても古い終了処理で消えない', () => {
    const r = runtime(), { App, UI } = r;
    App.ready = true; App.renderBadgeStatus = () => {}; App.renderSecretTabs = () => {};
    App.modals.top = UI.DOM.secretModal;
    App.closeSecret();
    const delivered = [...r.pending.values()];
    App.openSecretModal();
    delivered.forEach(callback => callback()); r.flush();
    assert.equal(UI.DOM.secretModal.classList.contains('hidden'), false);
    assert.equal(UI.DOM.secretModal.classList.contains('opacity-0'), false);
});

test('達成画面だけ閉じても下の天体モーダルとフォーカスを保つ', () => {
    const r = runtime(), background = r.node(), detail = r.node(), celebration = r.node(), opener = r.node(), answer = r.node();
    detail.children.push(answer); r.document.activeElement = opener;
    const stack = new r.ModalStack([detail, celebration], [background]);
    stack.open(detail); r.document.activeElement = answer; stack.open(celebration);
    assert.equal(detail.inert, true); assert.equal(celebration.inert, false); assert.equal(background.inert, true);
    stack.close(celebration);
    assert.equal(detail.inert, false); assert.equal(background.inert, true); assert.equal(r.document.activeElement, answer);
    stack.close(detail);
    assert.equal(background.inert, false); assert.equal(r.document.activeElement, opener);
});

test('フォーカス循環から非表示・無効・inertのボタンを除く', () => {
    const r = runtime(), modal = r.node(), first = r.node(), disabled = r.node(), hidden = r.node(), inert = r.node(), last = r.node();
    disabled.disabled = true; hidden.getClientRects = () => []; inert.closest = () => ({});
    modal.children = [first, disabled, hidden, inert, last]; modal.querySelectorAll = () => modal.children;
    const stack = new r.ModalStack([modal], []); stack.open(modal); r.document.activeElement = last;
    let prevented = false;
    stack.trap({ key: 'Tab', shiftKey: false, preventDefault: () => { prevented = true; } });
    assert.equal(r.document.activeElement, first); assert.equal(prevented, true);
});

test('達成画面の戻り先が無効な正解ボタンなら天体モーダル内の操作へ戻す', () => {
    const r = runtime(), detail = r.node(), celebration = r.node(), correct = r.node(), close = r.node();
    correct.disabled = true; detail.children = [close, correct]; detail.querySelectorAll = () => detail.children;
    const stack = new r.ModalStack([detail, celebration], []);
    stack.open(detail); r.document.activeElement = correct; stack.open(celebration); stack.close(celebration);
    assert.equal(r.document.activeElement, close);
});

test('ローダー終了で全画面のビットマップと星配列を解放する', () => {
    const r = runtime(), stars = new r.Starfield({});
    const canvas = { width: 1440, height: 900 };
    stars.canvas = canvas; stars.ctx = { clearRect() {} }; stars.stars = [{x: 1}];
    stars.destroy();
    assert.equal(canvas.width * canvas.height, 0);
    assert.equal(stars.stars.length, 0); assert.equal(stars.ctx, null); assert.equal(stars.running, false);
});

test('ネイティブ保護者ダイアログも最初と最後の操作間でフォーカスを循環する', () => {
    const r = runtime(), parents = r.node(), first = r.node(), last = r.node();
    parents.children = [first, last]; parents.querySelectorAll = () => parents.children;
    const stack = new r.ModalStack([], []); r.document.activeElement = last;
    stack.trap({ key: 'Tab', shiftKey: false, preventDefault() {} }, parents);
    assert.equal(r.document.activeElement, first);
    stack.trap({ key: 'Tab', shiftKey: true, preventDefault() {} }, parents);
    assert.equal(r.document.activeElement, last);
});
