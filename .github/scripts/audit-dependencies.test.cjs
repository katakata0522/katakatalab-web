'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { reviewAudit, readCve, WITHDRAWN, REVIEWED } = require('./audit-dependencies.cjs');
const record = { cveMetadata: { cveId: 'CVE-2026-93753', state: 'REJECTED' } };
const lock = { packages: Object.fromEntries(Object.entries(REVIEWED).map(([name, version]) => [`node_modules/${name}`, { version }])) };
function report() {
    return { auditReportVersion: 2, metadata: { vulnerabilities: { total: 4 } }, vulnerabilities: {
        deepmerge: { severity: 'low', via: [{ name: 'deepmerge', url: WITHDRAWN, severity: 'low' }] },
        '@rollup/plugin-node-resolve': { severity: 'low', via: ['deepmerge'] },
        'workbox-build': { severity: 'low', via: ['@rollup/plugin-node-resolve'] },
        'vite-plugin-pwa': { severity: 'low', via: ['workbox-build'] },
    } };
}
test('警告なしは追加のCVE通信を必要としない', () => {
    assert.deepEqual(reviewAudit({ auditReportVersion: 2, metadata: { vulnerabilities: { total: 0 } }, vulnerabilities: {} }, {}), []);
});
test('確認した版と公式の撤回状態が揃う通知だけを区別する', () => {
    assert.equal(reviewAudit(report(), lock, record).length, 4);
    for (const state of ['PUBLISHED', 'RESERVED', undefined]) {
        assert.throws(() => reviewAudit(report(), lock, { cveMetadata: { cveId: 'CVE-2026-93753', state } }));
    }
    assert.throws(() => reviewAudit(report(), lock));
    assert.throws(() => reviewAudit(report(), lock, { cveMetadata: { cveId: 'OTHER', state: 'REJECTED' } }));
});
test('同じパッケージの新しい勧告・重大度変更・未知の依存版を拒否する', () => {
    const newAdvisory = report();
    newAdvisory.vulnerabilities.deepmerge.via.push({ name: 'deepmerge', url: 'https://github.com/advisories/NEW', severity: 'low' });
    assert.throws(() => reviewAudit(newAdvisory, lock, record));
    const raised = report();
    raised.vulnerabilities.deepmerge.severity = 'moderate';
    assert.throws(() => reviewAudit(raised, lock, record));
    for (const name of Object.keys(REVIEWED)) {
        const changed = structuredClone(lock);
        changed.packages[`node_modules/${name}`].version = '99.0.0';
        assert.throws(() => reviewAudit(report(), changed, record));
    }
});
test('低重大度でも未知の警告、伝播先の欠損、循環を拒否する', () => {
    const unknown = report();
    unknown.vulnerabilities.unknown = { severity: 'low', via: ['deepmerge'] };
    unknown.metadata.vulnerabilities.total++;
    assert.throws(() => reviewAudit(unknown, lock, record));
    for (const via of [[], ['missing'], ['deepmerge']]) {
        const invalid = report();
        invalid.vulnerabilities.deepmerge.via = via;
        assert.throws(() => reviewAudit(invalid, lock, record));
    }
});
test('通信や解析の失敗・件数不一致を警告なしへ代替しない', () => {
    for (const value of [null, {}, { error: { code: 'network' } }, { auditReportVersion: 2, vulnerabilities: [] },
        { auditReportVersion: 2, vulnerabilities: {}, metadata: { vulnerabilities: { total: 1 } } }]) {
        assert.throws(() => reviewAudit(value, lock, record));
    }
});

test('CVE取得の一時障害だけを上限付きで再試行し、継続障害は停止する', async () => {
    let calls = 0;
    const actual = await readCve(async (url, options) => {
        assert.match(url, /^https:\/\/raw\.githubusercontent\.com\/CVEProject\/cvelistV5\//);
        assert.equal(options.redirect, 'error');
        if (++calls === 1) throw new Error('temporary failure');
        return { ok: true, json: async () => record };
    }, async () => {});
    assert.equal(calls, 2);
    assert.deepEqual(actual, record);
    calls = 0;
    await assert.rejects(readCve(async () => { calls++; return { ok: false }; }, async () => {}));
    assert.equal(calls, 3);
    await assert.rejects(readCve(async () => ({ ok: true, json: async () => { throw new Error('truncated'); } }), async () => {}));
});
