const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = {};
vm.runInNewContext(`${fs.readFileSync(path.join(root, 'topics.js'), 'utf8')}\nthis.topics = topics;`, context);

// 本番と同じ純粋な判定関数を読み込み、DOMやタイマーには触れない。
const support = fs.readFileSync(path.join(root, 'summer-support.js'), 'utf8');
const start = support.indexOf('    function topicText(');
const end = support.indexOf('    function updateStaticCopy(', start);
assert.ok(start >= 0 && end > start, '追加条件の判定関数が存在する');
vm.runInNewContext(`${support.slice(start, end)}\nthis.matches = topicMatchesPreference;`, context);
const { topics, matches } = context;
const correctedIds = ['1d_craft_1', '1d_craft_2', '1d_craft_4', '3d_exp_1', '3d_craft_1', '1w_craft_1'];

for (const id of correctedIds) {
    test(`付き添い必須の${id}は大人不要の候補から除外する`, () => {
        const topic = topics.find((item) => item.id === id);
        assert.equal(topic.adultRequired, true);
        assert.ok(topic.safety.some((note) => /必ず保護者/.test(note)));
        assert.equal(matches(topic, 'noAdultRequired'), false);
        assert.equal(matches(topic, 'none'), true, '条件なしでは引き続き選べる');
    });
}

test('構造化された付き添い要件を優先し、従来の安全注意にも対応する', () => {
    assert.equal(matches({ adultRequired: true }, 'noAdultRequired'), false);
    assert.equal(matches({ safety: ['保護者の方と一緒に行ってください。'] }, 'noAdultRequired'), false);
    assert.equal(matches({ adultRequired: false, safety: ['保護者の方と一緒に行ってください。'] }, 'noAdultRequired'), false);
    assert.equal(matches({ title: '観察', safety: [] }, 'noAdultRequired'), true);
});

test('付き添い必須ではない既存の観察・調査テーマは候補に残る', () => {
    for (const id of ['1d_obs_1', '1d_inv_3', '3d_obs_2', '1w_obs_2']) {
        assert.equal(matches(topics.find((item) => item.id === id), 'noAdultRequired'), true, id);
    }
});

test('付き添い条件は時間・カテゴリの絞り込みや他の追加条件を変更しない', () => {
    const indoorOneDayCrafts = topics.filter((topic) => topic.time === '1day' && topic.category === 'craft');
    assert.deepEqual(
        Array.from(indoorOneDayCrafts.filter((topic) => matches(topic, 'noAdultRequired')), (topic) => topic.id),
        ['1d_craft_3']
    );
    assert.equal(indoorOneDayCrafts.every((topic) => matches(topic, 'noHeat')), true);
    assert.equal(indoorOneDayCrafts.every((topic) => matches(topic, 'noOutdoor')), true);
    assert.equal(matches(topics.find((topic) => topic.id === '1d_obs_2'), 'noHeat'), false);
    assert.equal(matches(topics.find((topic) => topic.id === '3d_inv_1'), 'noOutdoor'), false);
});
