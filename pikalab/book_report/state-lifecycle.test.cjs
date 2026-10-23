const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Utils, normalizeFormData, mergeFormData } = require('./script-core.js');

// ブラウザが担うイベント・入力・保存だけをモデル化し、アプリの保存処理は実物を使う。
function createHarness({ entries = {}, data = new Map(Object.entries(entries)) } = {}) {
    const timers = new Map();
    let clock = 0, nextTimer = 0;
    class TestEvent {
        constructor(type, options = {}) { this.type = type; Object.assign(this, options); }
        preventDefault() { this.defaultPrevented = true; }
        stopImmediatePropagation() { this.stopped = true; }
    }
    class Target {
        constructor() { this.listeners = new Map(); }
        addEventListener(type, callback, options = {}) {
            const listeners = this.listeners.get(type) || [];
            listeners.push({ callback, once: options?.once }); this.listeners.set(type, listeners);
        }
        dispatchEvent(event) {
            event.target ||= this; event.currentTarget = this;
            for (const listener of [...this.listeners.get(event.type) || []]) {
                listener.callback(event);
                if (listener.once) this.listeners.set(event.type, this.listeners.get(event.type).filter(item => item !== listener));
                if (event.stopped) break;
            }
            return !event.defaultPrevented;
        }
    }
    const elements = new Map();
    const document = new Target();
    class Element extends Target {
        constructor(id = '', tag = 'div') {
            super(); this.id = id; this.tagName = tag.toUpperCase(); this.value = ''; this.style = {}; this.dataset = {};
            this.attributes = {}; this.children = []; this.isConnected = true; this.disabled = false; this.open = false;
            const classes = new Set();
            this.classList = { add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)), contains: name => classes.has(name) };
            Object.defineProperty(this, 'className', { get: () => [...classes].join(' '), set: value => { classes.clear(); String(value).split(/\s+/).filter(Boolean).forEach(name => classes.add(name)); } });
            let text = '';
            Object.defineProperty(this, 'textContent', { get: () => text, set: value => { text = String(value); } });
            Object.defineProperty(this, 'innerText', { get: () => text, set: value => { text = String(value); } });
            Object.defineProperty(this, 'innerHTML', { get: () => text, set: value => { text = String(value).replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, ''); this.children = []; } });
        }
        setAttribute(name, value) { this.attributes[name] = String(value); }
        removeAttribute(name) { delete this.attributes[name]; }
        appendChild(child) { this.children.push(child); child.parent = this; return child; }
        removeChild(child) { this.children = this.children.filter(item => item !== child); child.isConnected = false; }
        remove() { this.parent?.removeChild(this); this.isConnected = false; }
        focus() { document.activeElement = this; }
        select() { this.selectionStart = 0; this.selectionEnd = this.value.length; }
        setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
        querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
        querySelectorAll(selector) { return selector.includes('button') ? this.children.filter(child => child.tagName === 'BUTTON' && !child.disabled) : []; }
        closest() { return this.card || null; }
        contains(child) { return this === child || this.children.includes(child); }
        getClientRects() { return this.isConnected ? [{}] : []; }
        click() { if (!this.disabled) this.dispatchEvent(new TestEvent('click')); }
        showModal() { this.open = true; }
        close() { this.open = false; this.dispatchEvent(new TestEvent('close')); }
    }
    const add = (id, tag) => { const element = new Element(id, tag); elements.set(id, element); return element; };
    const fields = ['book-title', 'book-author', 'synopsis-part-a', 'synopsis-part-b', 'synopsis-part-c', 'motivation-detail', 'scene-desc', 'scene-myself', 'conclusion-change', 'draft-textarea'];
    fields.forEach(id => { add(id, id.includes('scene') || id === 'draft-textarea' ? 'textarea' : 'input'); add(`${id}-char-count`); add(`${id}-counter-container`); });
    for (const id of ['wizard-form', 'progress-container', 'progress-bar', 'progress-announcement', 'result-section', 'print-draft-view', 'draft-details', 'draft-char-count', 'draft-sheet-count', 'opening-a', 'opening-b', 'opening-c', 'body-synopsis-ref', 'body-scene-ref', 'body-myself-ref', 'conclusion-text', 'total-char-count', 'page-sheet-count', 'synopsis-title', 'synopsis-part-a-label', 'synopsis-part-b-label', 'synopsis-part-c-label', 'synopsis-part-a-assists', 'synopsis-part-b-assists', 'synopsis-part-c-assists', 'slot-title-1', 'slot-title-2', 'slot-title-3', 'step-1', 'step-2', 'step-3', 'step-4', 'gacha-modal', 'gacha-modal-content', 'gacha-slot-spinner', 'gacha-result-display', 'gacha-question', 'gacha-text']) add(id);
    const gachaButtons = ['gacha-apply-btn', 'gacha-reroll-btn', 'gacha-close-btn'].map(id => add(id, 'button'));
    gachaButtons.forEach(button => elements.get('gacha-modal').appendChild(button));
    elements.get('result-section').classList.add('hidden'); elements.get('gacha-modal').classList.add('hidden');
    const radioGroups = { genre: ['story', 'biography', 'science'], motivation: ['cover', 'recommend', 'movie', 'interest', 'other'] };
    for (const [name, values] of Object.entries(radioGroups)) radioGroups[name] = values.map(value => {
        const radio = new Element('', 'input'); radio.value = value; radio.card = new Element(); let checked = false;
        Object.defineProperty(radio, 'checked', { get: () => checked, set: next => { checked = next; if (next) for (const other of radioGroups[name]) if (other !== radio) other.checked = false; } }); return radio;
    });
    radioGroups.genre[0].checked = true;
    const main = new Element('main');
    document.body = new Element('body'); document.documentElement = new Element('html'); document.readyState = 'loading';
    document.getElementById = id => elements.get(id) || null;
    document.createElement = tag => new Element('', tag);
    document.querySelectorAll = selector => {
        const group = /^input\[name="([^"]+)"\]$/.exec(selector);
        if (group) return radioGroups[group[1]] || [];
        if (selector === '.option-card') return radioGroups.motivation.map(radio => radio.card);
        return [];
    };
    document.querySelector = selector => {
        if (selector === 'main') return main;
        const selected = /^input\[name="([^"]+)"\]:checked$/.exec(selector);
        if (selected) return radioGroups[selected[1]]?.find(radio => radio.checked) || null;
        const choice = /^input\[name="([^"]+)"\]\[value="([^"]+)"\]$/.exec(selector);
        if (choice) return radioGroups[choice[1]]?.find(radio => radio.value === choice[2]) || null;
        return null;
    };
    const window = new Target(); window.location = { href: 'https://example.test/pikalab/book_report/?keep=1#note' }; window.scrollTo = () => {};
    const confirmations = [], notices = [], writes = [], removals = [], historyCalls = [], copies = [];
    const controls = { writeFailure: false, readFailure: false, confirm: true, copy: true };
    window.confirm = message => { confirmations.push(message); return controls.confirm; };
    let reloads = 0; const location = { reload() { reloads++; } };
    const storage = { getItem(key) { if (controls.readFailure) throw Error('blocked read'); return data.get(key) ?? null; }, setItem(key, value) { if (controls.writeFailure === true || controls.writeFailure === key) throw Error('blocked write'); writes.push([key, value]); data.set(key, value); }, removeItem(key) { removals.push(key); data.delete(key); } };
    const setTimeout = (callback, delay = 0) => { const id = ++nextTimer; timers.set(id, { callback, time: clock + delay }); return id; };
    const clearTimeout = id => timers.delete(id);
    const advance = ms => { const end = clock + ms; for (;;) { const due = [...timers.entries()].filter(([, timer]) => timer.time <= end).sort((a, b) => a[1].time - b[1].time)[0]; if (!due) break; clock = due[1].time; timers.delete(due[0]); due[1].callback(); } clock = end; };
    document.execCommand = command => { copies.push({ command, value: document.activeElement?.value }); return controls.copy; };
    const context = { document, window, localStorage: storage, location, confirm: window.confirm, navigator: {}, module: { exports: {} }, console: { warn() {}, error() {} }, Event: TestEvent, CustomEvent: TestEvent, URL, URLSearchParams, TextEncoder, TextDecoder, btoa, atob, setTimeout, clearTimeout, requestAnimationFrame: callback => setTimeout(callback, 16), history: { state: { keep: true }, replaceState(...args) { historyCalls.push(args); window.location.href = args[2]; } } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'script-core.js'), 'utf8'), context);
    const app = context.module.exports.createBookReportApp(); app.showToast = (...args) => notices.push(args);
    return { app, context, elements, document, window, data, controls, notices, writes, removals, historyCalls, confirmations, copies, timers, advance, main, Event: TestEvent, get reloads() { return reloads; } };
}

const state = (title, extra = {}) => JSON.stringify({ formData: { title, ...extra }, currentStep: 1 });
const plain = value => JSON.parse(JSON.stringify(value));

test('保存データの型と列挙値を検証し、既知の項目だけを復元する', () => {
    for (const value of [null, [], 'x', 3, false]) assert.equal(normalizeFormData(value), null);
    const data = normalizeFormData({ title: 123, author: {}, genre: '__proto__', motivation: 'invalid', selectedOpening: 'unknown', unknown: 'ignored', draftText: ' \n文章\n ' });
    assert.equal(data.title, ''); assert.equal(data.author, ''); assert.equal(data.genre, 'story'); assert.equal(data.motivation, ''); assert.equal(data.selectedOpening, 'opening-a'); assert.equal(data.draftText, ' \n文章\n '); assert.equal(Object.hasOwn(data, 'unknown'), false);
    const valid = normalizeFormData({ genre: 'science', motivation: 'other', selectedOpening: 'opening-c' });
    assert.equal(valid.genre, 'science'); assert.equal(valid.motivation, 'other'); assert.equal(valid.selectedOpening, 'opening-c');
});

test('文字制限はサロゲートペアを分割せず、入力・復元時の改行と空白を保つ', () => {
    assert.equal(Utils.truncateText('𠮷😀末尾', 2), '𠮷😀');
    assert.equal(Utils.truncateText(' \n文章\n ', 20), ' \n文章\n ');
    assert.equal(normalizeFormData({ title: '𠮷'.repeat(81) }).title, '𠮷'.repeat(80));
    const h = createHarness(); h.app.applyInputConstraints(); const input = h.elements.get('scene-desc');
    input.value = ' 段落\n'; input.dispatchEvent(new h.Event('input'));
    assert.equal(input.value, ' 段落\n'); assert.equal(h.app.formData.sceneDesc, input.value);
    input.value = '𠮷'.repeat(301); input.dispatchEvent(new h.Event('input'));
    assert.equal(input.value, '𠮷'.repeat(300)); assert.equal(h.elements.get('scene-desc-char-count').textContent, '300');
    assert.equal(h.elements.get('scene-desc-counter-container').className, 'char-counter danger');
});

test('共有シリアライズは日本語・補助文字・改行を往復し、不正な入力は拒否する', () => {
    const h = createHarness(); const value = { title: '𠮷の物語😀', draftText: '一行目\n 二行目', currentStep: 4 };
    const encoded = h.app.serializePlanData(value); assert.match(encoded, /^[A-Za-z0-9_-]+$/); assert.deepEqual(plain(h.app.deserializePlanData(encoded)), value);
    for (const encoded of ['', '%bad', 'a', 'x'.repeat(100001), '_w', btoa('not json')]) assert.equal(h.app.deserializePlanData(encoded), null);
    const cyclic = {}; cyclic.self = cyclic; assert.equal(h.app.serializePlanData(cyclic), '');
});

test('共有データは先にフォームへ反映し、現在のしおりに保存して無関係なURL情報を保つ', () => {
    const h = createHarness({ entries: { bookReportQuestActiveSlot: '2', bookReportQuestData_slot_2: state('元の本') } }); h.app.loadSavedData();
    const data = { title: '共有した𠮷の本', author: '作者', draftText: ' 一段落\n', genre: 'science', selectedOpening: 'opening-c', currentStep: 3 };
    h.window.location.href = `https://example.test/pikalab/book_report/?keep=1&data=${h.app.serializePlanData(data)}#note`;
    assert.equal(h.app.loadFromUrlParams(), true); assert.equal(h.app.activeSlot, 2); assert.equal(h.elements.get('book-title').value, data.title);
    const saved = JSON.parse(h.data.get('bookReportQuestData_slot_2')); assert.equal(saved.formData.title, data.title); assert.equal(saved.formData.draftText, data.draftText); assert.equal(saved.currentStep, 3);
    assert.equal(h.data.has('bookReportQuestData_slot_1'), false); assert.equal(h.confirmations.length, 1);
    assert.equal(h.historyCalls.at(-1)[2], 'https://example.test/pikalab/book_report/?keep=1#note');
});

test('共有データの置換を取り消した場合、現在のしおり・入力・保存値・URLを変えない', () => {
    const original = state('大事な本', { draftText: '元の作文' }); const h = createHarness({ entries: { bookReportQuestActiveSlot: '3', bookReportQuestData_slot_3: original } }); h.app.loadSavedData(); h.controls.confirm = false;
    h.window.location.href = `https://example.test/?data=${h.app.serializePlanData({ title: '別の本' })}`;
    assert.equal(h.app.loadFromUrlParams(), false); assert.equal(h.app.activeSlot, 3); assert.equal(h.app.formData.title, '大事な本'); assert.equal(h.elements.get('draft-textarea').value, '元の作文'); assert.equal(h.data.get('bookReportQuestData_slot_3'), original); assert.equal(h.writes.length, 0); assert.equal(h.historyCalls.length, 0);
});

test('共有データの保存失敗時は復元用URLを残し、保存に成功した後だけ取り除く', () => {
    const original = state('元の本', { draftText: '元の保存済み原稿' });
    const h = createHarness({ entries: { bookReportQuestData_slot_1: original } }); h.app.loadSavedData(); h.controls.writeFailure = true;
    const shared = { title: '共有された𠮷の本', draftText: ' 共有された原稿\n二段落\n ' };
    const url = `https://example.test/pikalab/book_report/?keep=1&data=${h.app.serializePlanData(shared)}#note`; h.window.location.href = url;
    // 保存できなくても表示・持ち出しは可能にし、保存成功したようには案内しない。
    assert.equal(h.app.loadFromUrlParams(), true); assert.equal(h.elements.get('draft-textarea').value, shared.draftText);
    assert.equal(h.data.get('bookReportQuestData_slot_1'), original); assert.equal(h.window.location.href, url); assert.equal(h.historyCalls.length, 0);
    assert.equal(h.app.dirty, true); assert.ok(h.notices.length > 0); assert.ok(h.notices.every(([, type]) => type === 'error'));
    h.app.setupAutosave(); h.window.dispatchEvent(new h.Event('pagehide')); assert.equal(h.window.location.href, url); assert.equal(h.historyCalls.length, 0);
    h.controls.writeFailure = false; h.window.dispatchEvent(new h.Event('pagehide'));
    const saved = JSON.parse(h.data.get('bookReportQuestData_slot_1')).formData;
    assert.equal(saved.title, shared.title); assert.equal(saved.draftText, shared.draftText); assert.equal(h.app.dirty, false);
    assert.equal(h.window.location.href, 'https://example.test/pikalab/book_report/?keep=1#note'); assert.equal(h.historyCalls.length, 1);
    h.app.saveData(); assert.equal(h.historyCalls.length, 1);
});

test('不正な共有オブジェクトでは既存の保存内容を書き換えない', () => {
    for (const value of [null, [], { unexpected: 'value' }]) {
        const h = createHarness({ entries: { bookReportQuestData_slot_1: state('元の本') } }); h.app.loadSavedData();
        h.window.location.href = `https://example.test/?data=${h.app.serializePlanData(value)}`;
        assert.equal(h.app.loadFromUrlParams(), false); assert.equal(h.app.formData.title, '元の本'); assert.equal(h.writes.length, 0);
    }
});

test('共有データの範囲外ステップや真偽値に似た文字列を採用しない', () => {
    for (const currentStep of [-1, 0, 5, '3', null]) {
        const h = createHarness(); h.window.location.href = `https://example.test/?data=${h.app.serializePlanData({ title: '共有した本', currentStep, showResults: 'true' })}`;
        assert.equal(h.app.loadFromUrlParams(), true); assert.equal(h.app.currentStep, 1); assert.equal(h.elements.get('result-section').classList.contains('hidden'), true);
    }
});

test('三方向マージでは独立した編集を統合し、同じ項目の競合では現在の入力を保つ', () => {
    const base = normalizeFormData({ title: '元', author: '作者', draftText: '初稿' });
    const local = { ...base, title: '手元の題名' }, remote = { ...base, title: '別タブの題名', author: '別タブの作者' };
    const merged = mergeFormData(base, local, remote); assert.equal(merged.title, local.title); assert.equal(merged.author, remote.author); assert.equal(merged.draftText, base.draftText);
    assert.deepEqual(mergeFormData(null, local, remote), local); assert.deepEqual(mergeFormData(base, local, null), local);
});

test('保存直前に別タブの変更が届いても、未保存の題名と別タブの作者を両方残す', () => {
    const h = createHarness({ entries: { bookReportQuestData_slot_1: state('元', { author: '作者' }) } }); h.app.loadSavedData();
    h.elements.get('book-title').value = '手元の題名'; h.data.set('bookReportQuestData_slot_1', state('元', { author: '別タブの作者' }));
    assert.equal(h.app.saveData(), true); const saved = JSON.parse(h.data.get('bookReportQuestData_slot_1')).formData;
    assert.equal(saved.title, '手元の題名'); assert.equal(saved.author, '別タブの作者'); assert.equal(h.elements.get('book-author').value, '別タブの作者');
    const count = h.writes.length; assert.equal(h.app.saveData(), true); assert.equal(h.writes.length, count);
});

test('別タブの保存通知は現在の未保存入力と統合し、別タブのしおり選択では移動しない', () => {
    const h = createHarness({ entries: { bookReportQuestData_slot_1: state('元', { author: '作者' }) } }); h.app.loadSavedData(); h.app.listenStorageChanges();
    h.elements.get('book-title').value = '未保存の題名'; h.data.set('bookReportQuestData_slot_1', state('元', { author: '別タブの作者' }));
    h.window.dispatchEvent(new h.Event('storage', { key: 'bookReportQuestData_slot_1' }));
    assert.equal(h.elements.get('book-title').value, '未保存の題名'); assert.equal(h.elements.get('book-author').value, '別タブの作者'); assert.equal(h.writes.length, 0);
    h.data.set('bookReportQuestActiveSlot', '3'); h.window.dispatchEvent(new h.Event('storage', { key: 'bookReportQuestActiveSlot' })); assert.equal(h.app.activeSlot, 1); assert.equal(h.document.documentElement.dataset.bookReportActiveSlot, '1');
    h.app.composing.add('book-title'); h.data.set('bookReportQuestData_slot_1', state('外部', { author: '新たな作者' })); h.window.dispatchEvent(new h.Event('storage', { key: 'bookReportQuestData_slot_1' })); assert.equal(h.elements.get('book-author').value, '別タブの作者');
});

test('破損した保存データの閲覧では削除・上書きをせず、安全な空欄を表示する', () => {
    for (const corrupt of ['{broken', 'null', '[]', '{}', '{"formData":[]}']) {
        const h = createHarness({ entries: { bookReportQuestData_slot_2: corrupt } }); h.app.formData.title = '前の本'; h.app.loadSavedData(2);
        assert.equal(h.app.formData.title, ''); assert.equal(h.app.currentStep, 1); assert.equal(h.data.get('bookReportQuestData_slot_2'), corrupt); assert.equal(h.removals.length, 0); assert.equal(h.writes.length, 0);
    }
});

test('保存失敗時は入力を保持し、しおり移動を止めて警告を重複表示しない', () => {
    const h = createHarness(); h.app.loadSavedData(); h.elements.get('book-title').value = '消してはいけない入力'; h.controls.writeFailure = true;
    assert.equal(h.app.saveData(), false); h.app.switchSlot(2);
    assert.equal(h.app.activeSlot, 1); assert.equal(h.elements.get('book-title').value, '消してはいけない入力'); assert.equal(h.app.dirty, true); assert.equal(h.notices.length, 1); assert.equal(h.data.size, 0);
    h.controls.writeFailure = false; assert.equal(h.app.saveData(), true); assert.equal(h.app.dirty, false); assert.equal(h.app.saveWarningShown, false);
});

test('アクティブしおりの保存だけが失敗した場合も、現在の画面を移動しない', () => {
    const h = createHarness(); h.elements.get('book-title').value = '一冊目'; h.controls.writeFailure = 'bookReportQuestActiveSlot'; h.app.switchSlot(2);
    assert.equal(h.app.activeSlot, 1); assert.equal(h.elements.get('book-title').value, '一冊目'); assert.equal(JSON.parse(h.data.get('bookReportQuestData_slot_1')).formData.title, '一冊目');
});

test('自動保存は入力をまとめ、非表示化とページ離脱で直前の内容を確定する', () => {
    const h = createHarness(); h.app.applyInputConstraints(); h.app.setupAutosave(); const input = h.elements.get('book-title');
    input.value = '途中'; input.dispatchEvent(new h.Event('input')); h.advance(300); input.value = '最後'; input.dispatchEvent(new h.Event('input')); h.advance(499); assert.equal(h.writes.length, 0);
    h.window.dispatchEvent(new h.Event('pagehide')); assert.equal(JSON.parse(h.data.get('bookReportQuestData_slot_1')).formData.title, '最後'); const count = h.writes.length; h.advance(1000); assert.equal(h.writes.length, count);
    input.value = '非表示直前'; input.dispatchEvent(new h.Event('input')); h.document.hidden = true; h.document.dispatchEvent(new h.Event('visibilitychange')); assert.equal(JSON.parse(h.data.get('bookReportQuestData_slot_1')).formData.title, '非表示直前');
});

test('保留処理のflushとcancelは重複実行や取り消し後の遅延実行を起こさない', () => {
    const h = createHarness(); let calls = 0; const pending = h.context.module.exports.debounce(() => calls++, 500);
    pending(); h.advance(300); pending(); h.advance(499); assert.equal(calls, 0); pending.flush(); assert.equal(calls, 1); pending.flush(); h.advance(1000); assert.equal(calls, 1);
    pending(); pending.cancel(); h.advance(1000); pending.flush(); assert.equal(calls, 1); pending(); h.advance(500); assert.equal(calls, 2);
});

test('IME変換中は入力・保存・しおりを変更せず、確定後だけ文字制限と自動保存を適用する', () => {
    const h = createHarness(); h.app.applyInputConstraints(); h.app.setupAutosave(); const input = h.elements.get('book-title');
    input.value = '確定前の文'; input.dispatchEvent(new h.Event('input')); input.dispatchEvent(new h.Event('compositionstart'));
    assert.equal(JSON.parse(h.data.get('bookReportQuestData_slot_1')).formData.title, '確定前の文'); const count = h.writes.length;
    input.value = '𠮷'.repeat(81); input.dispatchEvent(new h.Event('input', { isComposing: true })); h.window.dispatchEvent(new h.Event('pagehide')); h.app.switchSlot(2); h.advance(1000);
    assert.equal(input.value, '𠮷'.repeat(81)); assert.equal(h.app.activeSlot, 1); assert.equal(h.writes.length, count);
    input.dispatchEvent(new h.Event('compositionend')); assert.equal(input.value, '𠮷'.repeat(80)); h.advance(500); assert.equal(JSON.parse(h.data.get('bookReportQuestData_slot_1')).formData.title, input.value);
});

test('リセットで保留中の自動保存を中止し、消したデータを後から復活させない', () => {
    const h = createHarness({ entries: { bookReportQuestData_slot_1: state('元の本') } }); h.app.loadSavedData(); h.app.applyInputConstraints(); h.app.setupAutosave();
    const input = h.elements.get('book-title'); input.value = '保留中'; input.dispatchEvent(new h.Event('input')); h.app.resetForm(); h.advance(1000); h.window.dispatchEvent(new h.Event('pagehide'));
    assert.equal(h.data.has('bookReportQuestData_slot_1'), false); assert.equal(h.reloads, 1);
});

test('リセットの削除失敗時は最新入力の自動保存を続け、復旧後のリセットも完了できる', () => {
    const original = state('元の本', { draftText: '元の保存済み原稿' });
    const h = createHarness({ entries: { bookReportQuestData_slot_1: original } }); h.app.loadSavedData(); h.app.applyInputConstraints(); h.app.setupAutosave();
    const input = h.elements.get('draft-textarea'); input.value = '保存直前の最新原稿\n'; input.dispatchEvent(new h.Event('input'));
    const removeItem = h.context.localStorage.removeItem; h.context.localStorage.removeItem = () => { throw Error('remove denied'); };
    h.app.resetForm(); assert.equal(h.reloads, 0); assert.equal(input.value, '保存直前の最新原稿\n'); assert.equal(h.app.dirty, true); assert.equal(h.data.get('bookReportQuestData_slot_1'), original);
    h.advance(500); assert.equal(JSON.parse(h.data.get('bookReportQuestData_slot_1')).formData.draftText, input.value); assert.equal(h.app.dirty, false);
    h.context.localStorage.removeItem = removeItem; h.app.resetForm(); h.advance(1000); h.window.dispatchEvent(new h.Event('pagehide'));
    assert.equal(h.reloads, 1); assert.equal(h.data.has('bookReportQuestData_slot_1'), false);
});

test('リセット時から保存先が使えない場合も、復旧後のページ離脱で最新入力を保存する', () => {
    const original = state('元の本', { draftText: '元の保存済み原稿' });
    const h = createHarness({ entries: { bookReportQuestData_slot_1: original } }); h.app.loadSavedData(); h.app.applyInputConstraints(); h.app.setupAutosave();
    const input = h.elements.get('draft-textarea'); input.value = '復旧まで保持する原稿'; input.dispatchEvent(new h.Event('input')); h.controls.writeFailure = true;
    h.app.resetForm(); h.advance(500); assert.equal(h.app.dirty, true); assert.equal(h.reloads, 0); assert.equal(h.removals.length, 0); assert.equal(h.data.get('bookReportQuestData_slot_1'), original);
    h.controls.writeFailure = false; h.window.dispatchEvent(new h.Event('pagehide')); assert.equal(JSON.parse(h.data.get('bookReportQuestData_slot_1')).formData.draftText, input.value); assert.equal(h.app.dirty, false);
});

test('ガチャを途中で閉じた場合は遅れた結果を描画せず、直後に開いた新しい質問を保つ', () => {
    const h = createHarness(); const ready = []; h.document.addEventListener('book-report:gacha-ready', event => ready.push(event.detail.target));
    const trigger = h.elements.get('book-title'); trigger.focus(); h.app.openGachaModal('book-synopsis'); assert.equal(h.main.inert, true); h.advance(500); h.app.closeGachaModal(); assert.equal(h.main.inert, false); assert.equal(h.document.activeElement, trigger);
    h.app.openGachaModal('scene-desc'); h.advance(700); assert.deepEqual(ready, []); assert.equal(h.elements.get('gacha-modal').classList.contains('hidden'), false); h.advance(500); assert.deepEqual(ready, ['scene-desc']);
    h.app.closeGachaModal('scene-desc'); assert.equal(h.document.activeElement, h.elements.get('scene-desc')); h.advance(300); assert.equal(h.elements.get('gacha-modal').classList.contains('hidden'), true); assert.equal(h.app.latestGachaChosen, null);
});

test('ガチャ終了後に古いコールバックが届いても結果を復活させない', () => {
    const h = createHarness(); let ready = 0; h.document.addEventListener('book-report:gacha-ready', () => ready++); h.app.openGachaModal('book-synopsis');
    const oldCallback = h.timers.get(h.app.gachaTimer).callback; h.app.closeGachaModal(); oldCallback(); assert.equal(ready, 0); assert.equal(h.app.latestGachaChosen, null);
});

test('印刷前は閉じた練習欄を開き、印刷終了後に元の開閉状態へ戻す', () => {
    const h = createHarness(); const details = h.elements.get('draft-details'); h.elements.get('draft-textarea').value = '印刷する本文';
    h.app.preparePrint(); h.app.preparePrint(); assert.equal(details.open, true); assert.equal(h.elements.get('print-draft-view').textContent, '印刷する本文'); h.app.restoreAfterPrint(); assert.equal(details.open, false);
    details.open = true; h.app.preparePrint(); h.app.restoreAfterPrint(); assert.equal(details.open, true);
});

test('コピーAPI拒否時の代替コピーは実際の成否を返し、仮入力欄とフォーカスを片付ける', async () => {
    const h = createHarness(); const before = h.elements.get('book-title'); before.focus(); h.context.navigator.clipboard = { async writeText() { throw Error('denied'); } };
    assert.equal(await h.app.copyClipboard('コピーする本文'), true); assert.equal(h.copies.at(-1).value, 'コピーする本文'); assert.equal(h.document.body.children.length, 0); assert.equal(h.document.activeElement, before);
    h.controls.copy = false; assert.equal(await h.app.copyClipboard('失敗する本文'), false); await h.app.copyText('opening-a'); assert.equal(h.notices.at(-1)[1], 'error');
    const copied = h.copies.length; assert.equal(await h.app.copyClipboard('古い共有リンク', null, () => false), false); assert.equal(h.copies.length, copied);
});

test('文字数は最終的に表示する構成メモの全段落を数え、あらすじも含める', () => {
    const h = createHarness(); h.document.addEventListener('book-report:results-rendered', () => {
        for (const id of ['opening-a', 'body-synopsis-ref', 'body-scene-ref', 'body-myself-ref', 'conclusion-text']) h.elements.get(id).textContent = '𠮷文';
    }); h.app.populateResults(); assert.equal(h.elements.get('total-char-count').textContent, '10'); assert.equal(h.elements.get('page-sheet-count').textContent, '0.0');
});
