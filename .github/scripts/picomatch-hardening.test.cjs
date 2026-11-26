'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { harden, verifiedFor } = require('../../scripts/picomatch-hardening.cjs');
const { reviewDetailed, PATCHED } = require('./audit-dependencies.cjs');
const root = path.resolve(__dirname, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'config/picomatch-hardening.json'), 'utf8'));
const installed = fs.existsSync(path.join(root, 'node_modules')) && fs.existsSync(path.join(root, 'pikalab/node_modules'));

// 実コピーを必要とする回帰検査は依存監査workflowで必須実行する。
// Rootのインストール前のソース契約検査では、別の依存なし検査だけを実行する。
test('補修の証拠を偽造して既存監査を通せない', () => {
    const report = { auditReportVersion: 2, metadata: { vulnerabilities: { total: 1 } }, vulnerabilities: {
        picomatch: { severity: 'high', nodes: ['node_modules/picomatch'], via: [{ name: 'picomatch', url: PATCHED,
            severity: 'high', source: 1247710, range: '<=4.0.7' }] },
    } };
    const lock = { packages: { 'node_modules/picomatch': { version: '2.3.2' } } };
    assert.throws(() => reviewDetailed(report, lock));
    assert.throws(() => reviewDetailed(report, lock, null, { scopes: ['pikalab'], copies: 21 }, 'pikalab'));
});

if (process.env.PICOMATCH_REQUIRE_INSTALLED === 'true' && !installed) throw new Error('Root/PikaLab両方の実コピーをインストールしてください');
if (installed) {
    for (const [relative, contract] of Object.entries(manifest.files)) {
        test(`${relative}: 全parserの攻撃変種と通常のファイル判定をdeadline付きで検証`, () => {
            const result = spawnSync(process.execPath, [path.join(__dirname, 'picomatch-hardening-worker.cjs'),
                path.join(root, relative), String(contract.copies)], { encoding: 'utf8', timeout: 10000, maxBuffer: 2 * 1024 * 1024 });
            assert.ifError(result.error);
            assert.equal(result.status, 0, result.stderr);
            const output = JSON.parse(result.stdout);
            assert.equal(output.parsers, contract.copies);
            assert.ok(output.checks >= contract.copies * 300);
        });
    }

    test('全補修の固定証拠がある場合だけ該当する勧告を補修済みと判定する', () => {
        const proof = harden({ requireAll: true });
        assert.equal(proof.copies, 21);
        const lock = JSON.parse(fs.readFileSync(path.join(root, 'pikalab/package-lock.json')));
        const nodes = Object.keys(lock.packages).filter(name => name.endsWith('/picomatch'));
        const report = { auditReportVersion: 2, metadata: { vulnerabilities: { total: 1 } }, vulnerabilities: {
            picomatch: { severity: 'high', nodes, via: [{ name: 'picomatch', url: PATCHED,
                severity: 'high', source: 1247710, range: '<=4.0.7' }] },
        } };
        assert.deepEqual(reviewDetailed(report, lock, null, proof, 'pikalab').patched, ['picomatch']);
        const changed = structuredClone(lock);
        changed.packages[nodes[0]].version = '9.0.0';
        assert.throws(() => reviewDetailed(report, changed, null, proof, 'pikalab'));
        for (const mutation of [item => { item.url += '-unknown'; }, item => { item.severity = 'critical'; },
            item => { item.range = '<=4.0.8'; }, item => { item.source++; }]) {
            const other = structuredClone(report);
            mutation(other.vulnerabilities.picomatch.via[0]);
            assert.throws(() => reviewDetailed(other, lock, null, proof, 'pikalab'));
        }
        const low = structuredClone(report);
        low.vulnerabilities.unknown = { severity: 'low', nodes: ['node_modules/unknown'], via: ['picomatch'] };
        low.metadata.vulnerabilities.total++;
        assert.throws(() => reviewDetailed(low, lock, null, proof, 'pikalab'));
    });

    test('検証後のコード改変も拒否し、未確認のバイトを補修で上書きしない', () => {
        const proof = harden({ requireAll: true });
        const lock = JSON.parse(fs.readFileSync(path.join(root, 'pikalab/package-lock.json')));
        const target = path.join(root, Object.keys(manifest.files)[0]);
        const original = fs.readFileSync(target);
        try {
            fs.appendFileSync(target, '\n// unexpected dependency change\n');
            assert.equal(verifiedFor(proof, 'pikalab', lock), false);
            assert.throws(() => harden({ apply: true, requireAll: true }));
        } finally { fs.writeFileSync(target, original); }
        assert.equal(verifiedFor(proof, 'pikalab', lock), true);
    });

    test('lockにない内包コピーの追加は再走査で拒否する', () => {
        const proof = harden({ requireAll: true });
        const lock = JSON.parse(fs.readFileSync(path.join(root, 'pikalab/package-lock.json')));
        const unexpected = path.join(root, 'node_modules/.__unexpected_picomatch_copy.cjs');
        let created = false;
        try {
            fs.writeFileSync(unexpected, 'const extglobOpen = (type, value) => { token.prev = prev; };', { flag: 'wx' });
            created = true;
            assert.equal(verifiedFor(proof, 'pikalab', lock), false);
            assert.throws(() => harden({ apply: true, requireAll: true }));
        } finally { if (created) fs.unlinkSync(unexpected); }
    });
}
