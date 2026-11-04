'use strict';

const { appendFileSync } = require('node:fs');
const { readChanges } = require('./pikalab-ci-scope.cjs');

const PIKA_SHARED = new Set(['.node-version', '.htaccess', 'sitemap.xml',
    'education-sw-privacy.js', 'scripts/education-no-tracking.cjs']);
const PIKA_PREFIXES = ['pikalab/', 'qa/', 'scripts/public-qa/', '.github/'];

function selectWorkflows(files) {
    if (!Array.isArray(files) || !files.length || files.some(file => typeof file !== 'string'
        || file.includes('\\') || file.includes(':') || file.split('/').some(part => !part || part === '.' || part === '..'))) {
        return { root: true, pikalab: true };
    }
    return {
        root: files.some(file => !file.startsWith('pikalab/') && !file.endsWith('.md')),
        pikalab: files.some(file => PIKA_SHARED.has(file) || PIKA_PREFIXES.some(prefix => file.startsWith(prefix))),
    };
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

function run(mode) {
    if (mode === 'select') {
        let scope;
        try { scope = selectWorkflows(readChanges(process.env.BASE_SHA)); }
        catch { scope = { root: true, pikalab: true }; }
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

module.exports = { selectWorkflows, verifyGate, verifyPikaResults };
if (require.main === module) {
    try { run(process.argv[2]); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
}
