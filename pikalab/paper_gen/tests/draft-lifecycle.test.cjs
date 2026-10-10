const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

function harness(search = '') {
    let now = 0;
    let nextId = 1;
    const jobs = new Map();
    const storage = new Map([
        ['bookReportQuestActiveSlot', '1'],
        ['bookReportQuestData_slot_1', JSON.stringify({ step: 4, formData: { title: '自分の本', draftText: '自分の下書き' }, draftText: '自分の下書き' })],
        ['bookReportQuestData_slot_2', JSON.stringify({ formData: { draftText: '別の作品' }, draftText: '別の作品' })]
    ]);
    function element() {
        const events = new Map();
        return {
            value: '', innerHTML: '', style: {}, dataset: {},
            classList: { add() {}, remove() {} }, setAttribute() {},
            addEventListener(type, fn) { events.set(type, [...(events.get(type) || []), fn]); },
            dispatchEvent(event) { for (const fn of events.get(event.type) || []) fn(event); }
        };
    }
    const window = element();
    const document = element();
    window.location = { search };
    const alerts = [];
    let printed;
    const context = vm.createContext({
        document, window, console, URLSearchParams, TextEncoder, TextDecoder, btoa, atob,
        Event: class { constructor(type) { this.type = type; } },
        localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
        alert: message => alerts.push(message),
        setTimeout(fn, ms) { const id = nextId++; jobs.set(id, { at: now + ms, fn }); return id; },
        clearTimeout: id => jobs.delete(id)
    });
    vm.runInContext(`${source}\nglobalThis.paper = app;`, context);
    const app = context.paper;
    const button = element();
    button.dataset.paperType = 'genko400';
    app.dom = {
        paperBtns: [button], draftTextarea: element(), printTarget: element(),
        draftCharCount: element(), draftSheetEstimate: element()
    };
    app.adjustScale = () => {};
    window.print = () => { window.dispatchEvent({ type: 'beforeprint' }); printed = app.dom.printTarget.innerHTML; };
    app.bindEvents();
    app.initializePaper();
    function advance(ms) {
        const end = now + ms;
        while (true) {
            const due = [...jobs].filter(([, job]) => job.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
            if (!due) break;
            const [id, job] = due;
            now = job.at;
            jobs.delete(id);
            job.fn();
        }
        now = end;
    }
    function input(text) {
        app.dom.draftTextarea.value = text;
        app.dom.draftTextarea.dispatchEvent({ type: 'input' });
    }
    return { app, window, document, storage, advance, input, alerts, printed: () => printed };
}

test('共有下書きの閲覧・印刷だけでは、保存済みの感想文を上書きしない', () => {
    const h = harness('?type=genko400&draft=' + encodeURIComponent('共有された文'));
    const before = h.storage.get('bookReportQuestData_slot_1');
    h.advance(500);
    assert.equal(h.app.dom.draftTextarea.value, '共有された文');
    assert.match(h.app.dom.printTarget.innerHTML, />共<\/text>/);
    h.app.printPaper();
    h.window.dispatchEvent({ type: 'pagehide' });
    assert.equal(h.storage.get('bookReportQuestData_slot_1'), before);
    assert.deepEqual(h.alerts, []);

    h.input('自分で編集した文');
    h.advance(150);
    const saved = JSON.parse(h.storage.get('bookReportQuestData_slot_1'));
    assert.equal(saved.formData.draftText, '自分で編集した文');
    assert.equal(saved.draftText, '自分で編集した文');
    assert.equal(saved.formData.title, '自分の本');
    assert.equal(saved.step, 4);
});

for (const event of ['button', 'beforeprint', 'pagehide']) {
    test(`${event}: 待機中の最新入力を一度だけ反映して保存する`, () => {
        const h = harness();
        h.input('最新');
        assert.doesNotMatch(h.app.dom.printTarget.innerHTML, />最<\/text>/);
        if (event === 'button') h.app.printPaper();
        else h.window.dispatchEvent({ type: event });
        assert.match(event === 'button' ? h.printed() : h.app.dom.printTarget.innerHTML, />最<\/text>/);
        assert.equal(JSON.parse(h.storage.get('bookReportQuestData_slot_1')).formData.draftText, '最新');
        const saved = h.storage.get('bookReportQuestData_slot_1');
        h.app.dom.draftTextarea.value = '未入力イベントの値';
        h.advance(300);
        assert.equal(h.storage.get('bookReportQuestData_slot_1'), saved);
    });
}

test('保存待機中にBookの選択スロットが変わっても入力時の作品を更新する', () => {
    const h = harness();
    const other = h.storage.get('bookReportQuestData_slot_2');
    h.input('1番への追記');
    h.storage.set('bookReportQuestActiveSlot', '2');
    h.advance(150);
    assert.equal(JSON.parse(h.storage.get('bookReportQuestData_slot_1')).formData.draftText, '1番への追記');
    assert.equal(h.storage.get('bookReportQuestData_slot_2'), other);
    h.input('2番への追記');
    h.advance(150);
    assert.equal(JSON.parse(h.storage.get('bookReportQuestData_slot_2')).formData.draftText, '2番への追記');
});

test('同じ作品の外部更新を受け取ったら、古い待機保存で新しい下書きを戻さない', () => {
    const h = harness();
    h.app.listenStorageChanges();
    h.input('A');
    const storageKey = 'bookReportQuestData_slot_1';
    const external = JSON.stringify({ formData: { draftText: 'B' }, draftText: 'B' });
    h.storage.set(storageKey, external);
    h.window.dispatchEvent({ type: 'storage', key: storageKey, newValue: external });
    assert.equal(h.app.dom.draftTextarea.value, 'B');
    h.advance(150);
    h.app.printPaper();
    h.window.dispatchEvent({ type: 'pagehide' });
    assert.equal(h.app.dom.draftTextarea.value, 'B');
    assert.equal(h.storage.get(storageKey), external);
    assert.match(h.app.dom.printTarget.innerHTML, />B<\/text>/);
    h.input('C');
    h.advance(150);
    assert.equal(JSON.parse(h.storage.get(storageKey)).formData.draftText, 'C');
});

test('別作品の外部更新を表示しても、元の作品の待機保存は取り消さない', () => {
    const h = harness();
    h.app.listenStorageChanges();
    h.input('1番のA');
    h.storage.set('bookReportQuestActiveSlot', '2');
    const storageKey = 'bookReportQuestData_slot_2';
    const external = JSON.stringify({ formData: { draftText: '2番のB' }, draftText: '2番のB' });
    h.storage.set(storageKey, external);
    h.window.dispatchEvent({ type: 'storage', key: storageKey, newValue: external });
    assert.equal(h.app.dom.draftTextarea.value, '2番のB');
    h.advance(150);
    assert.equal(JSON.parse(h.storage.get('bookReportQuestData_slot_1')).formData.draftText, '1番のA');
    assert.equal(h.storage.get(storageKey), external);
    assert.equal(h.app.dom.draftTextarea.value, '2番のB');
});

test('待機中に別作品へ入力した場合も、それぞれの最後の入力を保存する', () => {
    const h = harness();
    h.input('1番の入力');
    h.storage.set('bookReportQuestActiveSlot', '2');
    h.input('2番の入力');
    h.advance(150);
    assert.equal(JSON.parse(h.storage.get('bookReportQuestData_slot_1')).formData.draftText, '1番の入力');
    assert.equal(JSON.parse(h.storage.get('bookReportQuestData_slot_2')).formData.draftText, '2番の入力');
});



test('非表示になる直前の入力を保存し、後続タイマーから二重保存しない', () => {
    const h = harness();
    h.input('タブを閉じる前の入力');
    h.document.visibilityState = 'hidden';
    h.document.dispatchEvent({ type: 'visibilitychange' });
    assert.equal(JSON.parse(h.storage.get('bookReportQuestData_slot_1')).formData.draftText, 'タブを閉じる前の入力');
    const saved = h.storage.get('bookReportQuestData_slot_1');
    h.advance(300);
    assert.equal(h.storage.get('bookReportQuestData_slot_1'), saved);
});

test('外部の不正な下書き型で入力中の本文を消したり待機保存を取り消さない', () => {
    for (const invalid of [42, [], { formData: { draftText: {} } }, { draftText: true }]) {
        const h = harness();
        h.app.listenStorageChanges();
        h.input('保護する本文');
        h.window.dispatchEvent({ type: 'storage', key: 'bookReportQuestData_slot_1', newValue: JSON.stringify(invalid) });
        assert.equal(h.app.dom.draftTextarea.value, '保護する本文');
        h.advance(150);
        assert.equal(JSON.parse(h.storage.get('bookReportQuestData_slot_1')).formData.draftText, '保護する本文');
    }
});

test('空の新形式下書きは古い互換本文へ差し戻さない', () => {
    const h = harness();
    h.app.listenStorageChanges();
    const empty = JSON.stringify({ formData: { draftText: '' }, draftText: '古い本文' });
    h.storage.set('bookReportQuestData_slot_1', empty);
    h.input('消える前の本文');
    h.window.dispatchEvent({ type: 'storage', key: 'bookReportQuestData_slot_1', newValue: empty });
    assert.equal(h.app.dom.draftTextarea.value, '');
    h.advance(150);
    assert.equal(h.storage.get('bookReportQuestData_slot_1'), empty);
    h.app.loadFromBookReport();
    assert.equal(h.app.dom.draftTextarea.value, '');
    assert.match(h.alerts.at(-1), /からっぽ/);
});
