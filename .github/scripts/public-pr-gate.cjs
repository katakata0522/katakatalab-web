'use strict';

const { appendFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { isDeepStrictEqual } = require('node:util');
const { readChanges } = require('./pikalab-ci-scope.cjs');

const PIKA_SHARED = new Set(['.node-version', '.htaccess', 'sitemap.xml',
    'education-sw-privacy.js', 'scripts/education-no-tracking.cjs']);
const PIKA_PREFIXES = ['pikalab/', 'qa/', 'scripts/public-qa/', '.github/'];
const ROOT_ONLY_GITHUB_FILES = new Set([
    '.github/scripts/local-tools-e2e.mjs',
    '.github/scripts/pwa-update-e2e.mjs',
    '.github/workflows/root-quality.yml',
]);
const PIKALAB_ONLY_GITHUB_FILES = new Set([
    '.github/workflows/pikalab-quality.yml',
    '.github/scripts/pikalab-ci-scope.cjs',
    '.github/scripts/article-copy-scope.py',
    '.github/scripts/pikalab-ci-scope.test.cjs',
    '.github/scripts/pikalab-e2e-inputs.cjs',
    '.github/scripts/validate_pikalab.py',
    '.github/scripts/copy-code-studio-reachable.cjs',
    '.github/scripts/install-pikalab-pdf-tools.sh',
    '.github/scripts/sync_quest_board_csp.py',
    '.github/scripts/verify_color_lab_deploy.py',
    '.github/scripts/verify_pikalab_production.py',
    '.github/scripts/resolve-ci-baseline.cjs',
    '.github/scripts/resolve-ci-baseline.test.cjs',
]);

function onlyHigedanfanSitemapChanged(before, after) {
    if (typeof before !== 'string' || typeof after !== 'string') return false;
    const strip = xml => xml.replace(/^\s*<url><loc>https:\/\/katakatalab\.com\/higedanfan\/(?:songs\/[a-z0-9-]+\/)?<\/loc><\/url>[ \t]*\r?\n/gm, '');
    return strip(before) === strip(after);
}

function onlyHigedanfanDependenciesChanged(before, after) {
    try {
        const oldManifest = JSON.parse(before);
        const newManifest = JSON.parse(after);
        if (!Array.isArray(oldManifest.files) || !Array.isArray(newManifest.files)) return false;
        const withoutSite = manifest => ({ ...manifest,
            files: manifest.files.filter(entry => typeof entry?.path !== 'string' || !entry.path.startsWith('higedanfan/')) });
        return isDeepStrictEqual(withoutSite(oldManifest), withoutSite(newManifest));
    } catch {
        return false;
    }
}

function selectWorkflows(files, shared = {}) {
    if (!Array.isArray(files) || !files.length || files.some(file => typeof file !== 'string'
        || file.includes('\\') || file.includes(':') || file.split('/').some(part => !part || part === '.' || part === '..'))) {
        return { root: true, pikalab: true };
    }
    return {
        root: files.some(file => !file.startsWith('pikalab/') && !file.endsWith('.md')
            && !PIKALAB_ONLY_GITHUB_FILES.has(file)),
        pikalab: files.some(file => {
            if (ROOT_ONLY_GITHUB_FILES.has(file)) return false;
            if (file === 'sitemap.xml' && onlyHigedanfanSitemapChanged(shared.sitemapBefore, shared.sitemapAfter)) return false;
            if (file === 'qa/published-dependencies.json'
                && onlyHigedanfanDependenciesChanged(shared.manifestBefore, shared.manifestAfter)) return false;
            return PIKA_SHARED.has(file) || PIKA_PREFIXES.some(prefix => file.startsWith(prefix));
        }),
    };
}

function readRevisionFile(revision, path) {
    return execFileSync('git', ['show', `${revision}:${path}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
}

function rootBrowserScope(files) {
    if (files.length && files.every(file => file === 'index.html')) return 'home';
    for (const tool of ['qrcode', 'emphasis-lines', 'motion-atlas-source']) {
        if (files.length && files.every(file => file.startsWith(tool + '/'))) return tool;
    }
    return 'all';
}

function selectFromRevision(baseSha) {
    const files = readChanges(baseSha);
    const shared = {};
    if (files.includes('sitemap.xml')) {
        shared.sitemapBefore = readRevisionFile(baseSha, 'sitemap.xml');
        shared.sitemapAfter = readRevisionFile('HEAD', 'sitemap.xml');
    }
    if (files.includes('qa/published-dependencies.json')) {
        shared.manifestBefore = readRevisionFile(baseSha, 'qa/published-dependencies.json');
        shared.manifestAfter = readRevisionFile('HEAD', 'qa/published-dependencies.json');
    }
    return { ...selectWorkflows(files, shared), root_mode: rootBrowserScope(files) };
}

function requireResult(needs, job, expected) {
    if (needs?.[job]?.result !== expected) throw new Error(`${job}: ${expected}が必要です`);
}

function selected(value, name) {
    if (value !== 'true' && value !== 'false') throw new Error(`${name}: 検査対象を確定できません`);
    return value === 'true';
}

function verifyPikaResults(needs) {
    requireResult(needs, 'scope', 'success');
    requireResult(needs, 'validate', 'success');
    for (const lab of ['space', 'focus', 'paper', 'quest', 'book']) {
        requireResult(needs, `${lab}-browser`, selected(needs.scope.outputs?.[lab], lab) ? 'success' : 'skipped');
    }
}

function verifyGate(needs, { draft = false } = {}) {
    for (const job of ['identity', 'boundary', 'dependencies']) requireResult(needs, job, 'success');
    if (draft) {
        for (const job of ['scope', 'root', 'pikalab']) requireResult(needs, job, 'skipped');
        return 'Draft通知のみ。通常のpublic-pr-gateは未実行です。';
    }
    requireResult(needs, 'scope', 'success');
    for (const job of ['root', 'pikalab']) {
        requireResult(needs, job, selected(needs.scope.outputs?.[job], job) ? 'success' : 'skipped');
    }
    return '必要な品質検査・名義・公開境界が成功しました。対象外だけを未実行としています。';
}

function parentRootSucceeded(runs, sha, repo) {
    const run = runs.workflow_runs?.[0];
    return Boolean(run && run.head_sha === sha && run.head_branch === 'main' && run.event === 'push'
        && run.head_repository?.full_name === repo && run.path === '.github/workflows/root-quality.yml'
        && run.status === 'completed' && run.conclusion === 'success');
}

async function run(mode) {
    if (mode === 'select' || mode === 'root-push') {
        let scope;
        try { scope = selectFromRevision(process.env.BASE_SHA); }
        catch { scope = { root: true, pikalab: true, root_mode: 'all' }; }
        if (mode === 'root-push' && !scope.root) {
            // 直前のmainが赤・未完了・不明なら、Root変更の取りこぼしを全件検証で回収する。
            const repo = process.env.GITHUB_REPOSITORY;
            const sha = process.env.BASE_SHA;
            try {
                const url = new URL('https://api.github.com/repos/' + repo + '/actions/workflows/root-quality.yml/runs');
                url.search = new URLSearchParams({ branch: 'main', event: 'push', head_sha: sha, per_page: '1' });
                const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
                scope.root = !response.ok || !parentRootSucceeded(await response.json(), sha, repo);
            } catch { scope.root = true; }
        }
        if (!process.env.GITHUB_OUTPUT) throw new Error('CI出力先がありません');
        appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(scope).map(([key, value]) => `${key}=${value}\n`).join(''));
        console.log(JSON.stringify(scope));
    } else {
        const needs = JSON.parse(process.env.NEEDS_JSON);
        if (mode === 'pikalab') {
            verifyPikaResults(needs);
            console.log('PikaLabの共通検証と、選択された全ラボの成功を確認しました。');
        } else if (mode === 'verify') console.log(verifyGate(needs, { draft: process.env.IS_DRAFT === 'true' }));
        else throw new Error('不明な検証モードです');
    }
}

module.exports = { selectWorkflows, rootBrowserScope, parentRootSucceeded, onlyHigedanfanSitemapChanged,
    onlyHigedanfanDependenciesChanged, verifyGate, verifyPikaResults };
if (require.main === module) {
    run(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
