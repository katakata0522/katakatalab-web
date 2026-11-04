'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectWorkflows, verifyGate, verifyPikaResults } = require('./public-pr-gate.cjs');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const workflow = name => readFileSync(join(__dirname, `../workflows/${name}.yml`), 'utf8');

const prNeeds = (root, pikalab) => ({
    scope: { result: 'success', outputs: { root: String(root), pikalab: String(pikalab) } },
    root: { result: root ? 'success' : 'skipped' }, pikalab: { result: pikalab ? 'success' : 'skipped' },
    identity: { result: 'success' }, boundary: { result: 'success' }, dependencies: { result: 'success' },
});

test('文書だけでも統合チェックを完了し、RootとPikaLabの重い検査を要求しない', () => {
    const scope = selectWorkflows(['README.md', 'docs/github-agent-workflow.md']);
    assert.deepEqual(scope, { root: false, pikalab: false });
    assert.match(verifyGate(prNeeds(scope.root, scope.pikalab)), /成功/);
});

test('RootとPikaLabと共有環境の変更を別々に選択する', () => {
    assert.deepEqual(selectWorkflows(['qrcode/script.js']), { root: true, pikalab: false });
    assert.deepEqual(selectWorkflows(['pikalab/speed_reader/style.css']), { root: false, pikalab: true });
    for (const file of ['.node-version', 'qa/published-dependencies.json', 'scripts/public-qa/prepare.py',
        '.github/workflows/public-pr-gate.yml', '.github/scripts/verify-playwright-runtime.cjs', 'education-sw-privacy.js']) {
        assert.deepEqual(selectWorkflows([file]), { root: true, pikalab: true }, file);
    }
    assert.deepEqual(selectWorkflows(['qrcode/script.js', 'pikalab/speed_reader/style.css']), { root: true, pikalab: true });
});

test('変更を確定できない場合や不正パスは両方を検証する', () => {
    for (const files of [null, [], [''], ['../README.md'], ['/README.md'], ['pikalab\\x'], ['C:/x'], [null]]) {
        assert.deepEqual(selectWorkflows(files), { root: true, pikalab: true });
    }
});

test('必要な検査の失敗・中断・skip・結果欠損は必ず拒否する', () => {
    for (const root of [false, true]) for (const pikalab of [false, true]) {
        const good = prNeeds(root, pikalab);
        assert.doesNotThrow(() => verifyGate(good));
        for (const job of ['scope', 'identity', 'boundary', 'dependencies', ...(root ? ['root'] : []), ...(pikalab ? ['pikalab'] : [])]) {
            for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
                const bad = structuredClone(good);
                bad[job].result = result;
                assert.throws(() => verifyGate(bad), undefined, `${job}: ${result}`);
            }
        }
    }
});

test('対象フラグの欠損・未知値も成功へ代替しない', () => {
    for (const flag of ['root', 'pikalab']) for (const value of [undefined, '', 'yes', false]) {
        const needs = prNeeds(false, false);
        needs.scope.outputs[flag] = value;
        assert.throws(() => verifyGate(needs));
    }
});

test('Draftは軽い安全検査だけで、通常ゲートの成功と区別する', () => {
    const needs = prNeeds(false, false);
    needs.scope = { result: 'skipped' };
    assert.match(verifyGate(needs, { draft: true }), /通常.*未実行/);
    assert.throws(() => verifyGate(needs));
    needs.identity.result = 'failure';
    assert.throws(() => verifyGate(needs, { draft: true }));
});

test('PikaLabは対象外の正当なskipだけを許可し、選択したラボのskipを拒否する', () => {
    for (const target of ['space', 'focus', 'paper', 'quest', 'book']) {
        const needs = { scope: { result: 'success', outputs: {} }, validate: { result: 'success' } };
        for (const lab of ['space', 'focus', 'paper', 'quest', 'book']) {
            needs.scope.outputs[lab] = String(lab === target);
            needs[`${lab}-browser`] = { result: lab === target ? 'success' : 'skipped' };
        }
        assert.doesNotThrow(() => verifyPikaResults(needs));
        for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
            const bad = structuredClone(needs);
            bad[`${target}-browser`].result = result;
            assert.throws(() => verifyPikaResults(bad));
        }
        delete needs.scope.outputs[target];
        assert.throws(() => verifyPikaResults(needs));
    }
});

test('PRは一つの入口から同じコミットの検証を呼び、全結果を通常ゲートへ接続する', () => {
    const gate = workflow('public-pr-gate');
    assert.match(gate, /^  pull_request:/m);
    assert.doesNotMatch(gate, /paths-ignore:|^    paths:/m);
    for (const name of ['root-quality', 'pikalab-quality', 'commit-privacy', 'source-boundary', 'dependency-audit']) {
        assert.ok(gate.includes(`uses: ./.github/workflows/${name}.yml`), name);
        assert.match(workflow(name), /^  workflow_call:/m);
        assert.doesNotMatch(workflow(name), /^  pull_request:/m, '重いPR検証を重複起動しない');
    }
    const finalJob = gate.split('\n  gate:\n')[1];
    assert.match(finalJob, /if: \$\{\{ always\(\) \}\}/);
    assert.match(finalJob, /needs: \[scope, root, pikalab, identity, boundary, dependencies\]/);
    assert.match(finalJob, /run: node \.github\/scripts\/public-pr-gate\.cjs verify/);
});

test('mainの独立した検証とPikaLab全ラボの集約を維持する', () => {
    for (const name of ['root-quality', 'pikalab-quality', 'source-boundary', 'dependency-audit']) {
        assert.match(workflow(name), /push:\n\s+branches: \[main\]/);
    }
    const completion = workflow('pikalab-quality').split('\n  completion:\n')[1];
    assert.match(completion, /needs: \[scope, validate, space-browser, focus-browser, paper-browser, quest-browser, book-browser\]/);
    assert.match(completion, /if: \$\{\{ always\(\) \}\}/);
    assert.match(completion, /run: node \.github\/scripts\/public-pr-gate\.cjs pikalab/);
});
