const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 補助機能は実際の初期化と公開イベントだけを通す。タイマーは進めず同期性も検証する。
function createHarness({ entries = {}, slot = '1' } = {}) {
    class TestEvent {
        constructor(type, options = {}) { this.type = type; Object.assign(this, options); }
        preventDefault() { this.defaultPrevented = true; }
        stopImmediatePropagation() { this.stopped = true; }
    }
    class Target {
        constructor() { this.listeners = new Map(); }
        addEventListener(type, callback, options = {}) {
            const listeners = this.listeners.get(type) || [];
            listeners.push({ callback, capture: options === true || options.capture === true, once: options.once === true }); this.listeners.set(type, listeners);
        }
        dispatchEvent(event) {
            event.target ||= this; event.currentTarget = this;
            const listeners = [...this.listeners.get(event.type) || []].sort((a, b) => Number(b.capture) - Number(a.capture));
            for (const listener of listeners) {
                listener.callback(event);
                if (listener.once) this.listeners.set(event.type, this.listeners.get(event.type).filter(item => item !== listener));
                if (event.stopped) break;
            }
            return !event.defaultPrevented;
        }
    }
    const elements = new Map(); let gradeInputs = [];
    class Element extends Target {
        constructor(id = '') {
            super(); this.id = id; this.value = ''; this.dataset = {}; this.children = []; this.textContent = ''; this.disabled = false;
            const classes = new Set(); this.classList = { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) };
        }
        appendChild(child) { this.children.push(child); elements.set(child.id, child); return child; }
        insertAdjacentElement(_position, child) { this.appendChild(child); }
        closest() { return null; }
        querySelector() { return null; }
        querySelectorAll(selector) { return selector === 'input[name="book-grade-support"]' ? this.children.filter(child => child.name === 'book-grade-support') : []; }
        set innerHTML(markup) {
            this.markup = markup;
            // 学年セレクターが生成する入力要素の最小DOMモデル。製品ソースは書き換えない。
            if (this.id === 'book-grade-support') {
                gradeInputs = [...markup.matchAll(/<input\b[^>]*name="book-grade-support"[^>]*value="([^"]+)"[^>]*>/g)].map(match => {
                    const input = new Element(); input.name = 'book-grade-support'; input.value = match[1]; input.checked = false; this.appendChild(input); return input;
                });
                this.appendChild(new Element('book-grade-rule-note'));
            }
        }
        get innerHTML() { return this.markup || ''; }
    }
    const add = id => { const element = new Element(id); elements.set(id, element); return element; };
    for (const id of ['result-section', 'opening-a', 'opening-b', 'opening-c', 'body-synopsis-ref', 'body-scene-ref', 'body-myself-ref', 'conclusion-text', 'synopsis-part-a', 'synopsis-part-b', 'synopsis-part-c', 'motivation-detail', 'scene-desc', 'scene-myself', 'conclusion-change', 'book-title', 'book-author', 'gacha-result-display', 'gacha-question', 'gacha-text', 'gacha-apply-btn', 'line-share-btn', 'big-line-share-btn', 'email-share-btn']) add(id);
    const genreWrapper = new Element(); add('genre-chips').closest = () => genreWrapper;
    const meter = new Element(), feeling = new Element(); feeling.dataset.val = '感動した';
    const document = new Target(); document.readyState = 'loading'; document.documentElement = { dataset: { bookReportActiveSlot: slot } };
    document.getElementById = id => elements.get(id) || null;
    document.createElement = () => new Element();
    document.querySelector = selector => selector === '.meter-container' ? meter : selector === '.feeling-chip.selected' ? feeling : null;
    document.querySelectorAll = selector => selector === 'input[name="book-grade-support"]' ? gradeInputs : [];
    const data = new Map(Object.entries(entries)), controls = { readFailure: false, writeFailure: false };
    const timers = [], opened = [], storageWrites = [], events = []; const window = new Target(); window.location = { href: '' };
    window.setTimeout = (...args) => timers.push(args); window.open = (...args) => opened.push(args);
    const context = {
        document, window, CustomEvent: TestEvent, console,
        localStorage: {
            getItem(key) { if (controls.readFailure) throw Error('blocked read'); return data.get(key) ?? null; },
            setItem(key, value) { if (controls.writeFailure) throw Error('blocked write'); data.set(key, value); storageWrites.push([key, value]); }
        }
    };
    const source = fs.readFileSync(path.join(__dirname, 'summer-support.js'), 'utf8');
    const run = () => vm.runInNewContext(source, context);
    document.addEventListener('book-report:thinking-map-updated', event => events.push(event.type));
    run(); document.dispatchEvent(new TestEvent('DOMContentLoaded'));
    const choose = value => {
        const input = gradeInputs.find(input => input.value === value); assert.ok(input, `学年 ${value} が存在すること`); input.checked = true; input.dispatchEvent(new TestEvent('change'));
    };
    const selected = () => gradeInputs.filter(input => input.checked).map(input => input.value);
    const restoreSlot = next => { document.documentElement.dataset.bookReportActiveSlot = next; document.dispatchEvent(new TestEvent('book-report:slot-restored', { detail: { slot: Number(next) } })); };
    const storageEvent = key => window.dispatchEvent(new TestEvent('storage', { key }));
    return { context, document, window, elements, data, controls, timers, opened, storageWrites, events, choose, selected, restoreSlot, storageEvent, Event: TestEvent, run };
}

test('補助機能を初期化すると現在のメモを同期変換し、文字数更新を一度だけ通知する', () => {
    const h = createHarness(); assert.match(h.elements.get('opening-a').textContent, /本を選んだ理由/); assert.equal(h.events.length, 1); assert.equal(h.timers.length, 0);
    h.document.readyState = 'complete'; h.run(); assert.equal(h.events.length, 1); assert.equal(h.elements.get('book-grade-support').querySelectorAll('input[name="book-grade-support"]').length, 5);
});

test('結果の再描画イベントで入力内容を構成メモへ同期反映し、隠れた結果は変更しない', () => {
    const h = createHarness(); h.elements.get('scene-desc').value = '監査用の場面'; h.elements.get('synopsis-part-a').value = '主人公'; h.elements.get('synopsis-part-c').value = '結末';
    h.elements.get('opening-a').textContent = '古い完成文章'; h.document.dispatchEvent(new h.Event('book-report:results-rendered'));
    assert.match(h.elements.get('opening-a').textContent, /本を選んだ理由/); assert.match(h.elements.get('body-scene-ref').textContent, /監査用の場面/); assert.match(h.elements.get('body-scene-ref').textContent, /感動した/); assert.equal(h.elements.get('body-synopsis-ref').textContent, '本の内容メモ：主人公／結末'); assert.equal(h.timers.length, 0);
    h.elements.get('result-section').classList.add('hidden'); h.elements.get('opening-a').textContent = '非表示'; h.document.dispatchEvent(new h.Event('book-report:results-rendered')); assert.equal(h.elements.get('opening-a').textContent, '非表示');
});

test('あらすじと感想のバランスはUTF-16長ではなく文字数で判定する', () => {
    const h = createHarness(); h.elements.get('synopsis-part-a').value = '𠮷'.repeat(41); h.elements.get('scene-desc').value = '短い感想'; h.document.dispatchEvent(new h.Event('book-report:results-rendered'));
    assert.doesNotMatch(h.elements.get('reflection-balance-note').textContent, /あらすじが少し多め/);
    h.elements.get('synopsis-part-b').value = '𠮷'.repeat(40); h.document.dispatchEvent(new h.Event('book-report:results-rendered')); assert.match(h.elements.get('reflection-balance-note').textContent, /あらすじが少し多め/);
    h.elements.get('scene-desc').value = '𠮷'.repeat(81); h.document.dispatchEvent(new h.Event('book-report:results-rendered')); assert.match(h.elements.get('reflection-balance-note').textContent, /自分の考えの材料/);
});

test('ガチャ準備完了イベントで完成文を質問へ即座に置き換え、入力欄は上書きしない', () => {
    const h = createHarness(); h.elements.get('gacha-text').textContent = '旧ガチャの完成文'; h.elements.get('scene-desc').value = '自分で考えた内容';
    h.document.dispatchEvent(new h.Event('book-report:gacha-ready', { detail: { target: 'scene-desc' } }));
    assert.equal(h.elements.get('gacha-question').textContent, '自分に聞いてみよう！'); assert.notEqual(h.elements.get('gacha-text').textContent, '旧ガチャの完成文'); assert.equal(h.elements.get('gacha-apply-btn').disabled, false); assert.equal(h.elements.get('scene-desc').value, '自分で考えた内容'); assert.equal(h.timers.length, 0);
});

test('質問を考えるボタンは完成文の自動入力を止め、対応する入力欄への復帰を本体へ渡す', () => {
    const h = createHarness(); let applied = false, target;
    h.elements.get('gacha-apply-btn').addEventListener('click', () => { applied = true; }); h.document.addEventListener('book-report:gacha-dismiss', event => { target = event.detail.focusTarget; });
    for (const [gachaTarget, focusTarget] of [['book-synopsis', 'synopsis-part-a'], ['scene-desc', 'scene-desc'], ['motivation-detail', 'motivation-detail'], ['scene-myself', 'scene-myself'], ['conclusion-change', 'conclusion-change']]) {
        h.document.dispatchEvent(new h.Event('book-report:gacha-ready', { detail: { target: gachaTarget } })); const event = new h.Event('click'); h.elements.get('gacha-apply-btn').dispatchEvent(event); assert.equal(target, focusTarget); assert.equal(event.defaultPrevented, true);
    }
    assert.equal(applied, false); assert.equal(h.timers.length, 0);
});

test('表示中のしおりを学年保存先として優先し、別タブの選択したしおりへ書き込まない', () => {
    const h = createHarness({ entries: { bookReportQuestActiveSlot: '3' }, slot: '1' }); h.choose('low');
    assert.equal(h.data.get('bookReportSupportGrade_slot_1'), 'low'); assert.equal(h.data.has('bookReportSupportGrade_slot_3'), false);
    h.restoreSlot('2'); assert.deepEqual(h.selected(), []); h.choose('high'); h.restoreSlot('1'); assert.deepEqual(h.selected(), ['low']); h.restoreSlot('2'); assert.deepEqual(h.selected(), ['high']);
});

test('保存機能が無効でも学年をしおりごとに保持し、復元した古い保存値で選択を戻さない', () => {
    const h = createHarness({ entries: { bookReportSupportGrade_slot_1: 'low' } }); h.controls.writeFailure = true; h.choose('junior'); assert.deepEqual(h.selected(), ['junior']);
    h.controls.readFailure = true; h.restoreSlot('2'); h.choose('high'); h.restoreSlot('1'); assert.deepEqual(h.selected(), ['junior']); h.restoreSlot('2'); assert.deepEqual(h.selected(), ['high']);
});

test('別タブから届く学年の変更・削除・全消去で一時キャッシュと表示を更新する', () => {
    const h = createHarness(); h.choose('low'); h.data.set('bookReportSupportGrade_slot_1', 'senior'); h.storageEvent('bookReportSupportGrade_slot_1'); assert.deepEqual(h.selected(), ['senior']);
    h.data.delete('bookReportSupportGrade_slot_1'); h.storageEvent('bookReportSupportGrade_slot_1'); assert.deepEqual(h.selected(), []);
    h.choose('middle'); h.data.clear(); h.storageEvent(null); assert.deepEqual(h.selected(), []);
    h.data.set('bookReportSupportGrade_slot_2', 'high'); h.storageEvent('bookReportSupportGrade_slot_2'); assert.deepEqual(h.selected(), []); h.restoreSlot('2'); assert.deepEqual(h.selected(), ['high']);
});

test('不正な保存学年を無視し、選択した学年の参考字数だけを表示する', () => {
    const h = createHarness({ entries: { bookReportSupportGrade_slot_1: '__proto__' } }); assert.deepEqual(h.selected(), []);
    for (const [grade, limit] of [['low', 800], ['middle', 1200], ['high', 1200], ['junior', 2000], ['senior', 2000]]) {
        h.choose(grade); assert.ok(h.elements.get('book-result-grade-note').textContent.includes(limit.toLocaleString()));
    }
});

test('LINE共有は入力されたメモを共有し、旧完成文共有のハンドラーを実行しない', () => {
    const h = createHarness(); h.elements.get('book-title').value = '𠮷の本'; h.elements.get('scene-desc').value = '自分の場面メモ'; let oldShare = 0;
    h.elements.get('line-share-btn').addEventListener('click', () => oldShare++); h.elements.get('line-share-btn').dispatchEvent(new h.Event('click'));
    assert.equal(oldShare, 0); assert.equal(h.opened.length, 1); assert.equal(h.opened[0][2], 'noopener'); const text = decodeURIComponent(h.opened[0][0].split('?')[1]); assert.match(text, /𠮷の本/); assert.match(text, /自分の場面メモ/); assert.match(text, /完成した感想文ではありません/);
});
