'use strict';
const { spawnSync } = require('node:child_process');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const WITHDRAWN = 'https://github.com/advisories/GHSA-gcqx-w48m-w2h4';
const CVE = 'CVE-2026-93753';
const RECORD_URL = 'https://raw.githubusercontent.com/CVEProject/cvelistV5/main/cves/2026/93xxx/CVE-2026-93753.json';
// この版のnode-resolveはモジュール初期化時に固定defaultsだけをmergeする。
// 依存版が変わった場合は、この判定を自動的に引き継がず再確認する。
const REVIEWED = Object.freeze({
    deepmerge: '4.3.1', '@rollup/plugin-node-resolve': '16.0.3',
    'workbox-build': '7.4.1', 'vite-plugin-pwa': '1.3.0',
});

function classifyAudit(report, lock) {
    if (report?.error || report?.auditReportVersion !== 2 || !report.vulnerabilities
        || typeof report.vulnerabilities !== 'object' || Array.isArray(report.vulnerabilities)) {
        throw new Error('依存監査の結果を確定できません');
    }
    const findings = report.vulnerabilities;
    const names = Object.keys(findings);
    if (report.metadata?.vulnerabilities?.total !== names.length) throw new Error('依存監査の件数が一致しません');
    if (!names.length) return [];
    function withdrawnOnly(name, ancestors = new Set()) {
        if (ancestors.has(name) || !Object.hasOwn(REVIEWED, name) || !Object.hasOwn(findings, name)) return false;
        const finding = findings[name];
        if (finding.severity !== 'low' || !Array.isArray(finding.via) || !finding.via.length
            || !Array.isArray(finding.nodes) || !finding.nodes.length) return false;
        // npmは同名依存を集約するため、入れ子を含む全実体の版を検査する。
        if (!finding.nodes.every(node => typeof node === 'string'
            && !node.includes('\\') && !node.includes(':')
            && !node.split('/').some(part => !part || part === '.' || part === '..')
            && (node === `node_modules/${name}` || node.endsWith(`/node_modules/${name}`))
            && lock?.packages?.[node]?.version === REVIEWED[name])) return false;
        const next = new Set([...ancestors, name]);
        return finding.via.every(item => typeof item === 'string'
            ? withdrawnOnly(item, next)
            : item?.name === 'deepmerge' && item.url === WITHDRAWN && item.severity === 'low');
    }
    const active = names.filter(name => !withdrawnOnly(name));
    if (active.length) throw new Error(`新規・未確認の依存警告: ${active.join(', ')}`);
    return names.sort();
}

function reviewAudit(report, lock, record) {
    const withdrawn = classifyAudit(report, lock);
    if (withdrawn.length && (record?.cveMetadata?.cveId !== CVE || record.cveMetadata.state !== 'REJECTED')) {
        throw new Error('CVE公式記録で撤回済みと確認できません');
    }
    return withdrawn;
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
    let record;
    for (const relative of ['.', 'pikalab']) {
        const directory = path.resolve(root, relative);
        const report = readAudit(directory);
        const lock = JSON.parse(readFileSync(path.join(directory, 'package-lock.json'), 'utf8'));
        const candidates = classifyAudit(report, lock);
        if (candidates.length && !record) {
            record = await readCve();
        }
        const withdrawn = reviewAudit(report, lock, record);
        console.log(`${relative}: npm警告=${report.metadata.vulnerabilities.total}, 有効な未解決警告=0`);
        if (withdrawn.length) {
            console.log(`撤回済み${CVE}の伝播のみ: ${withdrawn.join(', ')}。公式状態=REJECTED、確認済み依存版と一致。`);
            console.log(RECORD_URL);
        }
    }
}

module.exports = { reviewAudit, readCve, WITHDRAWN, REVIEWED };
if (require.main === module) run().catch(error => { console.error(error.message); process.exitCode = 1; });
