'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { resolveBaseline } = require('./resolve-ci-baseline.cjs');

const before = 'a'.repeat(40);
const candidate = 'b'.repeat(40);
const movedMain = 'c'.repeat(40);

test('PRとpushはイベントの変更前コミットを使用し、動くmainを解決しない', () => {
    const noLookup = () => { throw new Error('mutable main must not be consulted'); };
    const event = { before, after: candidate, pull_request: { base: { sha: before } }, repository: { default_branch: 'main' } };
    assert.equal(resolveBaseline('pull_request', event, noLookup), before);
    assert.equal(resolveBaseline('push', event, noLookup), before);
});

test('手動検証は既定ブランチを一度だけ解決し、その後の移動から比較を分離する', () => {
    let calls = 0;
    const event = { repository: { default_branch: 'stable' } };
    const pin = resolveBaseline('workflow_dispatch', event, branch => {
        assert.equal(branch, 'stable');
        return ++calls === 1 ? before : movedMain;
    });
    const consumers = Array.from({ length: 6 }, () => pin);
    assert.deepEqual(consumers, Array(6).fill(before));
    assert.equal(calls, 1);
});

test('比較元がない、ゼロSHA、未対応イベント、接続失敗では自分自身へ代替しない', () => {
    for (const sha of [undefined, null, '', 'main', candidate.slice(0, 8), '0'.repeat(40)]) {
        assert.throws(() => resolveBaseline('push', { before: sha, after: candidate }));
        assert.throws(() => resolveBaseline('pull_request', { pull_request: { base: { sha } } }));
        assert.throws(() => resolveBaseline('workflow_dispatch', {}, () => sha));
    }
    assert.throws(() => resolveBaseline('unknown', {}));
    assert.throws(() => resolveBaseline('workflow_dispatch', {}, () => { throw new Error('offline'); }));
});
