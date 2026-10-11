const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createHarness({ animated = false, entries = {} } = {}) {
    const data = new Map(Object.entries(entries));
    const timers = [];
    const wizard = animated ? { style: {} } : null;
    const context = {
        console: { warn() {}, error() {} },
        module: { exports: {} },
        document: {
            readyState: 'loading',
            addEventListener() {},
            getElementById(id) { return id === 'wizard-form' ? wizard : null; }
        },
        localStorage: {
            getItem(key) { return data.get(key) ?? null; },
            setItem(key, value) { data.set(key, value); },
            removeItem(key) { data.delete(key); }
        },
        setTimeout(callback) { timers.push(callback); }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'script-core.js'), 'utf8'), context);
    const app = context.module.exports.createBookReportApp();
    let visibleTitle = '';
    app.collectData = () => { app.formData.title = visibleTitle; };
    app.populateForm = () => { visibleTitle = app.formData.title; };
    for (const method of ['updateSlotTabsUI', 'updateSlotTitles', 'syncPrintElements', 'restoreStep', 'applyGenreUI', 'showToast']) {
        app[method] = () => {};
    }
    return { app, data, context, timers, get visibleTitle() { return visibleTitle; }, set visibleTitle(value) { visibleTitle = value; } };
}

for (const animated of [false, true]) {
    test(`しおり切り替えで直前の入力を保存し、選んだ保存先を復元する（アニメーション${animated}）`, () => {
        const h = createHarness({ animated, entries: {
            bookReportQuestActiveSlot: '1',
            bookReportQuestData_slot_2: JSON.stringify({ formData: { title: '二冊目' }, currentStep: 3 })
        } });
        h.visibleTitle = '一冊目の直前の入力';
        h.app.currentStep = 2;
        h.app.switchSlot(2);
        h.timers.forEach(callback => callback());
        assert.equal(h.app.activeSlot, 2);
        assert.equal(h.app.currentStep, 3);
        assert.equal(h.visibleTitle, '二冊目');
        assert.equal(h.data.get('bookReportQuestActiveSlot'), '2');
        assert.equal(JSON.parse(h.data.get('bookReportQuestData_slot_1')).formData.title, '一冊目の直前の入力');
    });
}

test('保存ステップが不正な別しおりは最初のステップへ戻る', () => {
    const h = createHarness({ entries: { bookReportQuestData_slot_2: JSON.stringify({ formData: { title: '別の本' }, currentStep: 100 }) } });
    h.app.currentStep = 4;
    h.app.loadSavedData(2);
    assert.equal(h.app.currentStep, 1);
    assert.equal(h.visibleTitle, '別の本');
});

test('壊れたしおりを開いても前の本の内容を表示し続けない', () => {
    const h = createHarness({ entries: { bookReportQuestData_slot_2: '{broken' } });
    h.visibleTitle = '前の本';
    h.app.loadSavedData(2);
    assert.equal(h.app.activeSlot, 2);
    assert.equal(h.visibleTitle, '');
    assert.equal(h.app.currentStep, 1);
});

test('範囲外のしおり指定では保存・切り替えを行わない', () => {
    const h = createHarness();
    h.app.switchSlot(4);
    assert.equal(h.app.activeSlot, 1);
    assert.equal(h.data.size, 0);
});

test('しおり往復と空のしおりでは、選択した理由・気持ちだけを復元して保存する', () => {
    const h = createHarness({ entries: {
        bookReportQuestData_slot_1: JSON.stringify({ formData: { motivation: 'cover', sceneFeeling: '感動した' } }),
        bookReportQuestData_slot_2: JSON.stringify({ formData: { motivation: 'recommend', sceneFeeling: '悲しかった' } })
    } });
    function choice(value) {
        const classes = new Set();
        return {
            value, checked: false, dataset: { val: value }, attributes: {},
            classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
            setAttribute(name, value) { this.attributes[name] = value; }
        };
    }
    const cards = [choice('cover'), choice('recommend')];
    const radios = cards.map(card => ({ ...choice(card.value), closest: () => card }));
    const chips = [choice('感動した'), choice('悲しかった')];
    const fields = new Map();
    h.context.document.getElementById = id => {
        if (id === 'wizard-form') return null;
        if (!fields.has(id)) fields.set(id, { value: '', style: {}, classList: { add() {}, remove() {} } });
        return fields.get(id);
    };
    h.context.document.querySelectorAll = selector => {
        if (selector === 'input[name="motivation"]') return radios;
        if (selector === '.option-card') return cards;
        if (selector === '.feeling-chip') return chips;
        return [];
    };
    h.context.document.querySelector = selector => {
        if (selector === 'input[name="motivation"]:checked') return radios.find(radio => radio.checked) || null;
        if (selector === '.feeling-chip.selected') return chips.find(chip => chip.classList.contains('selected')) || null;
        const motivation = /^input\[name="motivation"\]\[value="([^"]+)"\]$/.exec(selector);
        if (motivation) return radios.find(radio => radio.value === motivation[1]) || null;
        const feeling = /^\.feeling-chip\[data-val="([^"]+)"\]$/.exec(selector);
        if (feeling) return chips.find(chip => chip.dataset.val === feeling[1]) || null;
        return null;
    };
    // 保存・表示本体をスタブにせず、DOMの選択状態を往復させる。
    const methods = h.context.module.exports.createBookReportApp();
    h.app.populateForm = methods.populateForm;
    h.app.collectData = methods.collectData;
    h.app.updateDraftCounters = () => {};

    function assertSelection(motivation, feeling) {
        assert.deepEqual(radios.filter(radio => radio.checked).map(radio => radio.value), motivation ? [motivation] : []);
        assert.deepEqual(cards.filter(card => card.classList.contains('selected')).map(card => card.value), motivation ? [motivation] : []);
        assert.deepEqual(chips.filter(chip => chip.classList.contains('selected')).map(chip => chip.dataset.val), feeling ? [feeling] : []);
        for (const chip of chips) assert.equal(chip.attributes['aria-pressed'], String(chip.dataset.val === feeling));
        h.app.saveData();
        const saved = JSON.parse(h.data.get(`bookReportQuestData_slot_${h.app.activeSlot}`)).formData;
        assert.equal(saved.motivation, motivation);
        assert.equal(saved.sceneFeeling, feeling);
    }

    h.app.loadSavedData(1);
    assertSelection('cover', '感動した');
    h.app.switchSlot(2);
    assertSelection('recommend', '悲しかった');
    h.app.switchSlot(3);
    assertSelection('', '');
    h.app.switchSlot(1);
    assertSelection('cover', '感動した');
});

test('互換ローダーはdocumentのイベント登録を改変せず、本体の後に補助機能を読み込む', () => {
    const appended = [];
    const document = {
        currentScript: { src: 'https://example.test/pikalab/book_report/script.js' },
        addEventListener() {},
        createElement() { return { handlers: {}, addEventListener(type, callback) { this.handlers[type] = callback; } }; },
        head: { appendChild(node) { appended.push(node); } }
    };
    const original = document.addEventListener;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8'), { document, URL, console });
    assert.equal(document.addEventListener, original);
    assert.equal(appended.length, 1);
    assert.equal(appended[0].src, 'https://example.test/pikalab/book_report/script-core.js');
    appended[0].handlers.load();
    assert.equal(appended[1].src, 'https://example.test/pikalab/book_report/summer-support.js');
});
