const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadData(relativePath, exportName) {
    const context = { window: {} };
    const filename = path.resolve(__dirname, '..', relativePath);
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename, timeout: 1_000 });
    return context.window[exportName];
}

test('盲の出題用の読みは意味文ではなく辞書にある音読みを使う', () => {
    const { KANJI_ALL } = loadData('kanji_lab/js/data.js', 'KanjiLabData');
    const entry = KANJI_ALL.find((item) => item.k === '盲');
    assert.equal(entry.y, 'もう');
    assert.match(entry.on, /モウ/);
    assert.match(entry.m, /目が見えない/);
});

test('仏の顔も三度は無礼が重なることと怒りを区別する', () => {
    const { kotowaza } = loadData('data/idioms.js', 'IDIOMS_DB');
    const entry = kotowaza.find((item) => item.kanji === '仏の顔も三度');
    assert.equal(entry.hiragana, 'ほとけのかおもさんど');
    assert.match(entry.meaning, /温厚な人でも/);
    assert.match(entry.meaning, /何度も無礼.*されれば怒る/);
    assert.doesNotMatch(entry.meaning, /何度も怒る/);
});

function loadScienceTopics() {
    const filename = path.resolve(__dirname, '../science_maker/topics.js');
    const context = {};
    vm.runInNewContext(`${fs.readFileSync(filename, 'utf8')}\nthis.result = topics;`, context, { filename });
    return context.result;
}

test('10円玉実験は洗剤を調味料として案内しない', () => {
    const topic = loadScienceTopics().find((entry) => entry.id === '1d_exp_1');
    assert.doesNotMatch(topic.desc, /洗剤/);
    for (const material of ['ケチャップ', 'お酢', 'ソース']) {
        assert.ok(topic.desc.includes(material));
        assert.ok(topic.materials.includes(material));
    }
});

test('パンのカビ観察は手洗いの効果を証明できると断定しない', () => {
    const topic = loadScienceTopics().find((entry) => entry.id === '1w_obs_1');
    assert.doesNotMatch(topic.desc, /証明/);
    assert.match(topic.desc, /条件による違い/);
    assert.ok(topic.safety.some((note) => note.includes('袋を開けず')));
    assert.ok(topic.safety.some((note) => note.includes('密封したまま廃棄')));
});
