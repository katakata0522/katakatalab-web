'use strict';

const { execFileSync } = require('node:child_process');
const { readFileSync, appendFileSync } = require('node:fs');

function requireCommit(sha) {
    if (typeof sha !== 'string' || !/^[a-f0-9]{40}$/i.test(sha) || /^0{40}$/.test(sha)) {
        throw new Error('比較元の不変コミットを確定できません');
    }
    return sha.toLowerCase();
}

function readDefaultBranch(branch) {
    if (typeof branch !== 'string' || !branch || /[\s\x00-\x1f]/.test(branch)) {
        throw new Error('既定ブランチを確定できません');
    }
    const ref = `refs/heads/${branch}`;
    const result = execFileSync('git', ['ls-remote', '--exit-code', 'origin', ref], {
        encoding: 'utf8', timeout: 30_000, maxBuffer: 4096, stdio: ['ignore', 'pipe', 'pipe'],
    }).trim().split(/\r?\n/);
    if (result.length !== 1) throw new Error('既定ブランチのコミットを一意に確定できません');
    const [sha, returnedRef] = result[0].split('\t');
    if (returnedRef !== ref) throw new Error('既定ブランチの参照が一致しません');
    return requireCommit(sha);
}

function resolveBaseline(eventName, event, resolveDefault = readDefaultBranch) {
    if (eventName === 'pull_request') return requireCommit(event.pull_request?.base?.sha);
    if (eventName === 'push') return requireCommit(event.before);
    if (eventName === 'workflow_dispatch') return requireCommit(resolveDefault(event.repository?.default_branch));
    throw new Error('比較元を定義していないイベントです');
}

function run() {
    try {
        const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
        const sha = resolveBaseline(process.env.GITHUB_EVENT_NAME, event);
        if (!process.env.GITHUB_OUTPUT) throw new Error('CI出力先がありません');
        appendFileSync(process.env.GITHUB_OUTPUT, `sha=${sha}\n`);
        console.log(`全比較ジョブで使用する不変baseline: ${sha}`);
    } catch {
        console.error('比較元の不変コミットを確定できないため検証を停止します。イベントと既定ブランチへの接続を確認してください。');
        process.exitCode = 1;
    }
}

module.exports = { requireCommit, resolveBaseline, readDefaultBranch };
if (require.main === module) run();
