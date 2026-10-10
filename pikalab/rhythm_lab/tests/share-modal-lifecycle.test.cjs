const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createRuntime() {
    const pending = new Map();
    let nextId = 0;
    class Element {
        constructor(classes = []) {
            const values = new Set(classes);
            this.classList = {
                add: (...names) => names.forEach(name => values.add(name)),
                remove: (...names) => names.forEach(name => values.delete(name)),
                contains: name => values.has(name)
            };
            this.attributes = {};
            this.focusCount = 0;
        }
        setAttribute(name, value) { this.attributes[name] = value; }
        focus() { this.focusCount += 1; }
    }
    const trigger = new Element();
    const context = vm.createContext({
        HTMLElement: Element,
        document: { readyState: 'loading', addEventListener() {}, activeElement: trigger, contains: () => true },
        window: { location: { protocol: 'https:', host: 'example.test', pathname: '/rhythm_lab/' } },
        setTimeout(callback) { pending.set(++nextId, callback); return nextId; },
        clearTimeout(id) { pending.delete(id); },
        requestAnimationFrame(callback) { callback(); },
        btoa: text => Buffer.from(text).toString('base64'),
        console
    });
    const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8')
        .replace('__test: {', '__test: { domCache, openShareModal, closeShareModal,');
    vm.runInContext(`${source}\nglobalThis.api = RhythmLab.__test;`, context);
    const cache = context.api.domCache;
    cache.shareModal = new Element(['hidden', 'opacity-0']);
    cache.shareContent = new Element(['scale-95']);
    cache.shareBtn = trigger;
    cache.shareCloseBtn = new Element();
    return { ...context.api, document: context.document, trigger, pending, flush() { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback()); } };
}

test('共有モーダルを閉じてすぐ開き直しても古いタイマーで隠れない', () => {
    const runtime = createRuntime();
    runtime.openShareModal();
    runtime.closeShareModal();
    runtime.openShareModal();
    runtime.flush();
    assert.equal(runtime.domCache.shareModal.classList.contains('hidden'), false);
    assert.equal(runtime.domCache.shareModal.attributes['aria-hidden'], 'false');
    assert.equal(runtime.trigger.focusCount, 0);
});

test('共有モーダルの連続終了は1回だけ非表示化とフォーカス復帰を行う', () => {
    const runtime = createRuntime();
    runtime.openShareModal();
    runtime.closeShareModal();
    runtime.closeShareModal();
    assert.equal(runtime.pending.size, 1);
    runtime.flush();
    assert.equal(runtime.domCache.shareModal.classList.contains('hidden'), true);
    assert.equal(runtime.trigger.focusCount, 1);
});

test('閉じる途中で再表示しても最後は元の起動ボタンへ戻る', () => {
    const runtime = createRuntime();
    runtime.domCache.shareModal.contains = node => node === runtime.domCache.shareCloseBtn;
    runtime.openShareModal();
    runtime.document.activeElement = runtime.domCache.shareCloseBtn;
    runtime.closeShareModal();
    runtime.openShareModal();
    runtime.closeShareModal();
    runtime.flush();
    assert.equal(runtime.trigger.focusCount, 1);
    assert.equal(runtime.domCache.shareModal.classList.contains('hidden'), true);
});
