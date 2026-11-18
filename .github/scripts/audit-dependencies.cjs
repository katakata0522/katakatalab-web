'use strict';
const { spawnSync } = require('node:child_process');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { harden, verifiedFor } = require('../../scripts/picomatch-hardening.cjs');

const WITHDRAWN = 'https://github.com/advisories/GHSA-gcqx-w48m-w2h4';
const CVE = 'CVE-2026-93753';
const RECORD_URL = 'https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/2026/93xxx/CVE-2026-93753.json';
const PATCHED = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
// この版のnode-resolveはモジュール初期化時に固定defaultsだけをmergeする。
// 依存版が変わった場合は、この判定を自動的に引き継がず再確認する。
const REVIEWED = Object.freeze({
    deepmerge: '4.3.1', '@rollup/plugin-node-resolve': '16.0.3',
    'workbox-build': '7.4.1', 'vite-plugin-pwa': '1.3.0',
});

function classifyAudit(report, lock, proof, scope) {
    if (report?.error || report?.auditReportVersion !== 2 || !report.vulnerabilities
        || typeof report.vulnerabilities !== 'object' || Array.isArray(report.vulnerabilities)) {
        throw new Error('依存監査の結果を確定できません');
    }
    const findings = report.vulnerabilities;
    const names = Object.keys(findings);
    if (report.metadata?.vulnerabilities?.total !== names.length) throw new Error('依存監査の件数が一致しません');
    const withdrawn = [], patched = [];
    const verified = verifiedFor(proof, scope, lock);
    if (proof !== undefined && !verified) throw new Error('補修の検証状態が変化したため監査を停止します');
    function classify(name, ancestors = new Set()) {
        if (ancestors.has(name) || !Object.hasOwn(findings, name)) return null;
        const finding = findings[name];
        if (!Array.isArray(finding.via) || !finding.via.length
            || !Array.isArray(finding.nodes) || !finding.nodes.length) return null;
        // npmは同名依存を集約するため、入れ子を含む全実体の版を検査する。
        if (!finding.nodes.every(node => typeof node === 'string'
            && !node.includes('\\') && !node.includes(':')
            && !node.split('/').some(part => !part || part === '.' || part === '..')
            && (node === `node_modules/${name}` || node.endsWith(`/node_modules/${name}`))
            && typeof lock?.packages?.[node]?.version === 'string')) return null;
        const next = new Set([...ancestors, name]);
        const tags = new Set();
        for (const item of finding.via) {
            if (typeof item === 'string') {
                const result = classify(item, next);
                if (!result) return null;
                for (const tag of result) tags.add(tag);
            } else if (item?.name === 'deepmerge' && item.url === WITHDRAWN && item.severity === 'low') {
                tags.add('withdrawn');
            } else if (verified && name === 'picomatch' && item?.name === 'picomatch'
                && item.url === PATCHED && item.source === 1247710 && item.range === '<=4.0.7' && item.severity === 'high') {
                tags.add('patched');
            } else return null;
        }
        if (tags.has('withdrawn') && (!Object.hasOwn(REVIEWED, name)
            || !finding.nodes.every(node => lock.packages[node].version === REVIEWED[name]))) return null;
        if (tags.has('patched') && !verified) return null;
        if (finding.severity !== (tags.has('patched') ? 'high' : 'low')) return null;
        return tags;
    }
    const active = [];
    for (const name of names) {
        const result = classify(name);
        if (!result) active.push(name);
        else {
            if (result.has('withdrawn')) withdrawn.push(name);
            if (result.has('patched')) patched.push(name);
        }
    }
    if (active.length) throw new Error(`新規・未確認の依存警告: ${active.join(', ')}`);
    return { withdrawn: withdrawn.sort(), patched: patched.sort() };
}

function reviewAudit(report, lock, record, proof, scope) {
    const { withdrawn } = reviewDetailed(report, lock, record, proof, scope);
    return withdrawn;
}

function reviewDetailed(report, lock, record, proof, scope) {
    const result = classifyAudit(report, lock, proof, scope);
    const { withdrawn } = result;
    if (withdrawn.length && (record?.cveMetadata?.cveId !== CVE || record.cveMetadata.state !== 'REJECTED')) {
        throw new Error('CVE公式記録で撤回済みと確認できません');
    }
    return result;
}

function readAudit(directory) {
    const npmCli = process.env.npm_execpath;
    if (!npmCli || !existsSync(npmCli)) throw new Error('npm run audit:dependencies から実行してください');
    const result = spawnSync(process.execPath, [npmCli, 'audit', '--package-lock-only', '--json', '--ignore-scripts'], {
        cwd: directory, encoding: 'utf8', timeout: 90_000, maxBuffer: 8 * 1024 * 1024,
    });
    if (result.error || ![0, 1].includes(result.status)) throw new Error('npm監査の実行に失敗しました');
    return JSON.parse(result.stdout);
}

async function readCve(fetcher = fetch, pause = delay) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await fetcher(RECORD_URL, { signal: AbortSignal.timeout(10_000), redirect: 'error' });
            if (!response.ok) throw new Error('CVE公式記録のHTTP取得に失敗しました');
            return await response.json();
        } catch (error) {
            if (attempt === 2) throw new Error('CVE公式記録を取得できないため監査を停止します', { cause: error });
            await pause(1000 * (attempt + 1));
        }
    }
}

async function run() {
    const root = path.resolve(__dirname, '../..');
    // 版番号だけで警告を除外しない。全ての外部・内包parserへ実補修を適用し、固定ハッシュを再照合する。
    const proof = harden({ root, apply: true, requireAll: true });
    console.log(`補修の実体検査: ${proof.copies} parser、Root/PikaLabのlock・適用後コードを照合済み。`);
    let record;
    for (const relative of ['.', 'pikalab']) {
        const directory = path.resolve(root, relative);
        const report = readAudit(directory);
        const lock = JSON.parse(readFileSync(path.join(directory, 'package-lock.json'), 'utf8'));
        const candidates = classifyAudit(report, lock, proof, relative);
        if (candidates.withdrawn.length && !record) {
            record = await readCve();
        }
        const { withdrawn, patched } = reviewDetailed(report, lock, record, proof, relative);
        console.log(`${relative}: npm警告=${report.metadata.vulnerabilities.total}, 有効な未解決警告=0`);
        if (withdrawn.length) {
            console.log(`撤回済み${CVE}の伝播のみ: ${withdrawn.join(', ')}。公式状態=REJECTED、確認済み依存版と一致。`);
            console.log(RECORD_URL);
        }
        if (patched.length) {
            console.log(`GHSA-fc5q-39xc-vjpfの固定コピーを限定補修済み: ${patched.join(', ')}。上流勧告は未撤回・正式修正版未公開です。`);
        }
    }
}

module.exports = { reviewAudit, reviewDetailed, readCve, WITHDRAWN, REVIEWED, PATCHED };
if (require.main === module) run().catch(error => { console.error(error.message); process.exitCode = 1; });
