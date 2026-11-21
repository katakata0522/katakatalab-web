'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const inputPath = path.join(__dirname, '../js/app.js');
const original = fs.readFileSync(inputPath, 'utf8');
// A real checkout can be used without running its unrelated bootstrap code.
function isolate(source) {
    if (source.includes('class SpeedReaderPreviewHarness')) return source;
    const between = (start, end) => {
        const i = source.indexOf(start), j = source.indexOf(end, i + start.length);
        if (i < 0 || j <= i) throw new Error(`Source structure changed: ${start}`);
        return source.slice(i, j).trimEnd();
    };
    const parser = between('const RUBY_BASE_SCRIPTS = [', 'function createChunkDisplayData');
    const split = between('    splitDisplayCharacters(text) {', '    renderWord(word) {');
    const render = between('    renderLibrary() {', '\n    // ==========================================================================' );
    return `${parser}\nclass SpeedReaderPreviewHarness {\n${split}\n${render}\n}`;
}
const isolated = isolate(original);
const candidate = isolated;
class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this._text = ''; }
    set textContent(value) { this._text = String(value); this.children = []; }
    get textContent() { return this._text + this.children.map(x => x.textContent).join(''); }
    appendChild(child) { this.children.push(child); return child; }
    querySelector(tag) { for (const child of this.children) { if (child.tag === tag) return child; const hit = child.querySelector(tag); if (hit) return hit; } return null; }
    set innerHTML(_) { throw new Error('innerHTML must never be used'); }
}
function render(text, { intl = Intl, second = false } = {}) {
    const root = new Element('section');
    const data = Object.freeze({ title: 'メロス', text, cat: 'low-elem' });
    const libs = Object.freeze(second ? { sample: data, other: Object.freeze({ ...data, title: '二つ目' }) } : { sample: data });
    const context = vm.createContext({
        Intl: intl,
        document: { createElement: tag => new Element(tag), getElementById: id => id === 'lib-cat-low-elem' ? root : null },
        CATEGORY_IDS: ['low-elem', 'missing'],
        CATEGORY_PALETTE: { 'low-elem': { hoverBorder: '', badgeBg: '', badgeText: '' } },
        CATEGORY_SPEEDS: { 'low-elem': 120 }, UI_TEXT: { RECOMMENDED_WPM_PREFIX: 'おすすめ ' }, libraries: libs
    });
    vm.runInContext(candidate + '\nglobalThis.subject = new SpeedReaderPreviewHarness(); subject.renderLibrary();', context);
    return { root, text: root.querySelector('p').textContent, card: root.querySelector('button'), data, context };
}
for (const [name, text, expected] of [
    ['ruby', 'メロスは激怒{げきど}した。', 'メロスは激怒した。'],
    ['multiple annotations', '山{やま}と海{うみ}を見る。', '山と海を見る。'],
    ['prefix', 'お母{かあ}さんとお正月{おしょうがつ}。', 'お母さんとお正月。'],
    ['plain', 'そのままの本文です。', 'そのままの本文です。'],
    ['standalone braces', '{literal} と {説明}', '{literal} と {説明}'],
    ['unfinished annotation retained', '未完{とじない', '未完{とじない'],
    ['empty', '', ''],
    ['missing', undefined, ''],
    ['null', null, ''],
    ['non-string', 42, ''],
    ['40 characters', 'あ'.repeat(40), 'あ'.repeat(40)],
    ['41 characters', 'あ'.repeat(41), 'あ'.repeat(40) + '...'],
    ['strip before truncate', '漢字{かんじ}'.repeat(21), '漢字'.repeat(20) + '...'],
    ['emoji boundary', 'あ'.repeat(39) + '😀' + '次', 'あ'.repeat(39) + '😀...'],
    ['ZWJ boundary', 'あ'.repeat(39) + '👨‍👩‍👧‍👦' + '次', 'あ'.repeat(39) + '👨‍👩‍👧‍👦...'],
    ['combining mark', 'あ'.repeat(39) + 'か\u3099' + '次', 'あ'.repeat(39) + 'か\u3099...'],
    ['inert HTML text', '<img src=x onerror=alert(1)>', '<img src=x onerror=alert(1)>'],
]) test(name, () => assert.equal(render(text).text, expected));
test('fallback without Segmenter never splits a surrogate pair', () => assert.equal(render('あ'.repeat(39) + '😀次', { intl: {} }).text, 'あ'.repeat(39) + '😀...'));
test('original reading data and card navigation stay intact', () => {
    const result = render('漢字{かんじ}');
    assert.equal(result.data.text, '漢字{かんじ}');
    assert.equal(result.card.dataset.action, 'load-library');
    assert.equal(result.card.dataset.param, 'sample');
    assert.equal(result.card.querySelector('h3').textContent, 'メロス');
});
test('rerender replaces cards, rather than duplicating them', () => {
    const result = render('漢字{かんじ}', { second: true });
    assert.equal(result.root.children[0].children.length, 2);
    vm.runInContext('subject.renderLibrary()', result.context);
    assert.equal(result.root.children.length, 1);
    assert.equal(result.root.children[0].children.length, 2);
});
