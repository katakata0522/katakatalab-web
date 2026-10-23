const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtempSync, writeFileSync, mkdirSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');
const { LABS, LAB_RUNTIME_FILES, classifyChanges, readChanges, readScope } = require('./pikalab-ci-scope.cjs');
const { LAB_E2E_FILES, LAB_E2E_SCRIPTS } = require('./pikalab-e2e-inputs.cjs');
const readWorkflow = () => require('node:fs').readFileSync(join(__dirname, '../workflows/pikalab-quality.yml'), 'utf8').replace(/\r\n/g, '\n');
const workflowJobs = workflow => Object.fromEntries(
    [...workflow.matchAll(/^  ([\w-]+):\n([\s\S]*?)(?=^  [\w-]+:\n|$(?![\s\S]))/gm)]
        .filter(([, , body]) => body.includes('    steps:')).map(([, name, body]) => [name, body]));
const evaluate = (expression, context) => require('node:vm').runInNewContext(
    expression.replace('github.event.pull_request.labels.*.name', 'labels'), context, { timeout: 1000 });

test('宣言したE2Eコマンドは実際の実行先と一致し、対応ラボのCIで呼ばれる', () => {
    const { scripts } = require('../../pikalab/package.json');
    const workflow = readWorkflow();
    for (const [script, file] of Object.entries(LAB_E2E_SCRIPTS)) {
        assert.equal(scripts[script], `node ${file.slice('pikalab/'.length)}`, script);
        assert.ok(Object.hasOwn(LABS, LAB_E2E_FILES[file]), file);
        assert.ok(workflow.includes(`npm run ${script}\n`), script);
    }
});

test('専用E2Eの追加だけならpackage.jsonと対象ラボを合成して選択する', () => {
    const packageBefore = { scripts: { build: 'vite build', test: 'node test.cjs' }, devDependencies: { vite: '1' } };
    for (const [script, file] of Object.entries(LAB_E2E_SCRIPTS)) {
        const packageAfter = structuredClone(packageBefore);
        packageAfter.scripts[script] = `node ${file.slice('pikalab/'.length)}`;
        const scope = classifyChanges(['pikalab/package.json', file], { packageBefore, packageAfter });
        assert.equal(scope.full, false, script);
        for (const key of Object.keys(LABS)) assert.equal(scope[key], key === LAB_E2E_FILES[file], `${script}: ${key}`);
    }
    const packageAfter = structuredClone(packageBefore);
    packageAfter.scripts['test:paper-e2e'] = 'node scripts/paper-gen-e2e.mjs';
    packageAfter.scripts['test:space-e2e'] = 'node scripts/space-lab-e2e.mjs';
    const scope = classifyChanges(['pikalab/package.json', 'pikalab/focus_studio/script.js'], { packageBefore, packageAfter });
    assert.equal(scope.full, false);
    assert.equal(scope.paper, true);
    assert.equal(scope.space, true);
    assert.equal(scope.focus, true);
    assert.equal(scope.rhythm, false);
});

test('packageの依存・設定・lifecycle・未知コマンド・削除・比較不能は必ず全検証する', () => {
    const packageBefore = { scripts: { build: 'vite build', 'test:space-e2e': 'node scripts/space-lab-e2e.mjs' },
        devDependencies: { vite: '1' }, overrides: { ejs: '1' } };
    const mutations = [
        p => { p.devDependencies.vite = '2'; }, p => { p.overrides.ejs = '2'; },
        p => { p.engines = { node: '20' }; }, p => { p.scripts.build = 'vite build --base=/'; },
        p => { p.scripts.postinstall = 'node install.cjs'; }, p => { p.scripts['test:new-e2e'] = 'node scripts/new-e2e.mjs'; },
        p => { p.scripts['test:paper-e2e'] = 'node scripts/paper-gen-e2e.mjs && node shared.cjs'; },
        p => { p.scripts['test:space-e2e'] += ' --some-flag'; }, p => { delete p.scripts['test:space-e2e']; },
        p => { p.scripts = null; }
    ];
    for (const mutate of mutations) {
        const packageAfter = structuredClone(packageBefore);
        mutate(packageAfter);
        assert.equal(classifyChanges(['pikalab/package.json'], { packageBefore, packageAfter }).full, true);
    }
    for (const packageAfter of [undefined, null, [], {}]) {
        assert.equal(classifyChanges(['pikalab/package.json'], { packageBefore, packageAfter }).full, true);
    }
    const packageAfter = structuredClone(packageBefore);
    packageAfter.scripts['test:paper-e2e'] = 'node scripts/paper-gen-e2e.mjs';
    assert.equal(classifyChanges(['pikalab/package.json', 'pikalab/package-lock.json'], { packageBefore, packageAfter }).full, true);
    assert.equal(classifyChanges(['pikalab/package.json'], { packageBefore, packageAfter, preserveVisual: true }).full, true);
    for (const prefix of ['pre', 'post']) {
        const beforeWithHook = structuredClone(packageBefore);
        beforeWithHook.scripts[`${prefix}test:paper-e2e`] = 'node shared.cjs';
        const afterWithHook = structuredClone(beforeWithHook);
        afterWithHook.scripts['test:paper-e2e'] = 'node scripts/paper-gen-e2e.mjs';
        assert.equal(classifyChanges(['pikalab/package.json'], { packageBefore: beforeWithHook, packageAfter: afterWithHook }).full, true);
    }
});

test('packageのキー順序や書式だけなら共有検証を保ち、詳細E2Eは追加しない', () => {
    const packageBefore = { name: 'pikalab', scripts: { build: 'vite', test: 'node test.cjs' }, devDependencies: { a: '1', b: '2' } };
    const packageAfter = { devDependencies: { b: '2', a: '1' }, scripts: { test: 'node test.cjs', build: 'vite' }, name: 'pikalab' };
    const scope = classifyChanges(['pikalab/package.json'], { packageBefore, packageAfter });
    assert.equal(scope.full, false);
    for (const key of Object.keys(LABS)) assert.equal(scope[key], false);
});

test('Focus専用の公開追加資産はFocusの両E2Eを選び、未知のpublic資産は全検証する', () => {
    for (const file of Object.keys(LAB_RUNTIME_FILES)) {
        const scope = classifyChanges([file]);
        assert.equal(scope.full, false);
        for (const key of Object.keys(LABS)) assert.equal(scope[key], key === 'focus', key);
    }
    for (const file of ['pikalab/public/new-runtime.js', 'pikalab/public/focus_studio/new-runtime.js']) {
        assert.equal(classifyChanges([file]).full, true);
    }
});

test('ラボ内だけの変更はそのラボのE2Eを全て選択する', () => {
    for (const [key, directory] of Object.entries(LABS)) {
        const scope = classifyChanges([`pikalab/${directory}/index.html`, `pikalab/${directory}/tests/runtime.test.cjs`]);
        assert.equal(scope.full, false);
        for (const other of Object.keys(LABS)) assert.equal(scope[other], key === other);
    }
});

test('複数ラボの変更を合成し、全画面guard対象のラボも認識する', () => {
    const scope = classifyChanges(['pikalab/space_lab/data.js', 'pikalab/focus_studio/script.js', 'pikalab/book_report/index.html']);
    assert.equal(scope.space, true);
    assert.equal(scope.focus, true);
    assert.equal(scope.paper, false);
    assert.equal(scope.full, false);
});

test('専用E2Eだけの修正も対象ラボの全検証を選択する', () => {
    for (const [file, key] of Object.entries(LAB_E2E_FILES)) {
        assert.ok(Object.hasOwn(LABS, key), file);
        const scope = classifyChanges([file]);
        assert.equal(scope.full, false, file);
        for (const other of Object.keys(LABS)) assert.equal(scope[other], key === other, `${file}: ${other}`);
    }
    const mixed = classifyChanges(['pikalab/fraction_lab/style.css', 'pikalab/scripts/fraction-lab-e2e.mjs',
        'pikalab/scripts/focus-studio-deep-e2e.mjs']);
    assert.equal(mixed.fraction, true);
    assert.equal(mixed.focus, true);
    assert.equal(mixed.space, false);
    assert.equal(mixed.full, false);
});

test('共有・未知・削除・設定・共通検証器の変更は全E2Eへ戻す', () => {
    for (const file of ['pikalab/js/tone-loader.js', 'pikalab/style.css', 'pikalab/tailwind.config.js',
        'pikalab/vite.config.js', 'pikalab/package-lock.json', 'pikalab/scripts/new-lab-e2e.mjs',
        'pikalab/scripts/pwa-cache-e2e.mjs', 'pikalab/scripts/visual-regression-guard.mjs',
        'pikalab/scripts/visual-preservation-core.cjs', 'pikalab/scripts/verify-build-output.cjs',
        'pikalab/scripts/finalize-lab-service-workers.cjs', '.github/scripts/pikalab-e2e-inputs.cjs',
        'pikalab/tests/top-browser.test.cjs', 'pikalab/new_lab/index.html', '.htaccess', 'sitemap.xml',
        '.github/workflows/pikalab-quality.yml', '.github/scripts/pikalab-ci-scope.cjs',
        'pikalab/space_lab/../js/shared.js', 'pikalab\\space_lab\\script.js', 'pikalab/space_lab//script.js']) {
        const scope = classifyChanges(['pikalab/space_lab/script.js', file]);
        assert.equal(scope.full, true, file);
        for (const key of Object.keys(LABS)) assert.equal(scope[key], true, `${file}: ${key}`);
    }
});

test('共有ブラウザ準備だけの変更でもPR検査と全ラボの検証を起動する', () => {
    const file = '.github/scripts/verify-playwright-runtime.cjs';
    const trigger = readWorkflow().split('  pull_request:\n')[1].split('  workflow_dispatch:')[0];
    assert.ok(trigger.includes(`      - "${file}"`), '共有準備の単独変更もPR検査の起動対象に含める');
    const scope = classifyChanges([file]);
    assert.equal(scope.full, true);
    for (const key of Object.keys(LABS)) assert.equal(scope[key], true, key);
});

test('空の差分、手動実行、視覚維持ラベルは全検証する', () => {
    assert.equal(classifyChanges([]).full, true);
    assert.equal(classifyChanges(null).full, true);
    assert.equal(classifyChanges(['pikalab/paper_gen/script.js'], { eventName: 'workflow_dispatch' }).full, true);
    assert.equal(classifyChanges(['pikalab/paper_gen/script.js'], { preserveVisual: true }).full, true);
});

test('PR基点から全コミットを比較し、ラボ間renameの両パスを検証する', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'pikalab-ci-scope-'));
    const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    try {
        git('init');
        git('config', 'user.name', 'CI scope test');
        git('config', 'user.email', 'ci@example.invalid');
        mkdirSync(join(cwd, 'pikalab/space_lab'), { recursive: true });
        writeFileSync(join(cwd, 'pikalab/space_lab/data.js'), 'original\n');
        git('add', '.'); git('commit', '-m', '基点');
        const base = git('rev-parse', 'HEAD');
        mkdirSync(join(cwd, 'pikalab/paper_gen'), { recursive: true });
        git('mv', 'pikalab/space_lab/data.js', 'pikalab/paper_gen/data.js');
        git('commit', '-m', '移動');
        mkdirSync(join(cwd, 'pikalab/focus_studio'), { recursive: true });
        writeFileSync(join(cwd, 'pikalab/focus_studio/script.js'), 'second commit\n');
        git('add', '.'); git('commit', '-m', '別ラボ');
        const scope = classifyChanges(readChanges(base, cwd));
        assert.equal(scope.space, true);
        assert.equal(scope.paper, true);
        assert.equal(scope.focus, true);
        assert.throws(() => readChanges('missing', cwd));
        assert.throws(() => readChanges('0'.repeat(40), cwd));
    } finally { rmSync(cwd, { recursive: true, force: true }); }
});

test('基点を取得できないときはskipせず全E2Eを出力する', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'pikalab-ci-output-'));
    try {
        const output = join(cwd, 'output');
        execFileSync(process.execPath, [join(__dirname, 'pikalab-ci-scope.cjs')], {
            cwd, env: { ...process.env, CI_EVENT_NAME: 'pull_request', CI_BASE_SHA: '0'.repeat(40), GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: '' },
            stdio: 'pipe'
        });
        const content = require('node:fs').readFileSync(output, 'utf8');
        assert.match(content, /^full=true$/m);
        for (const key of Object.keys(LABS)) assert.match(content, new RegExp(`^${key}=true$`, 'm'));
    } finally { rmSync(cwd, { recursive: true, force: true }); }
});

test('package比較は作業ファイルでなくPR基点とHEADを使い、破損したJSONは全検証へ戻す', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'pikalab-ci-package-'));
    const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    try {
        git('init'); git('config', 'user.name', 'CI scope test'); git('config', 'user.email', 'ci@example.invalid');
        mkdirSync(join(cwd, 'pikalab'));
        const packageFile = join(cwd, 'pikalab/package.json');
        writeFileSync(packageFile, JSON.stringify({ scripts: { build: 'vite' } }));
        git('add', '.'); git('commit', '-m', '基点');
        const base = git('rev-parse', 'HEAD');
        writeFileSync(packageFile, JSON.stringify({ scripts: { build: 'vite', 'test:space-e2e': 'node scripts/space-lab-e2e.mjs' } }));
        git('add', '.'); git('commit', '-m', '専用検証追加');
        writeFileSync(packageFile, '未コミット変更は比較対象にしない');
        assert.equal(readScope(base, {}, cwd).full, false);
        assert.equal(readScope(base, {}, cwd).space, true);
        git('add', '.'); git('commit', '-m', '不正JSON');
        const output = join(cwd, 'output');
        execFileSync(process.execPath, [join(__dirname, 'pikalab-ci-scope.cjs')], {
            cwd, env: { ...process.env, CI_EVENT_NAME: 'pull_request', CI_BASE_SHA: base, GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: '' },
            stdio: 'pipe'
        });
        assert.match(require('node:fs').readFileSync(output, 'utf8'), /^full=true$/m);
    } finally { rmSync(cwd, { recursive: true, force: true }); }
});


test('共通検証の失敗は全ラボE2Eの起動を止め、必須validateに失敗を伝える', () => {
    const workflow = readWorkflow();
    const jobs = workflowJobs(workflow);
    const core = jobs.scope;
    for (const command of ['validate_pikalab.py', 'npm ls', 'npm run typecheck', 'npm run build:all',
        'git diff --exit-code -- pikalab', 'npm run verify:code-studio-security', 'npm run verify:build', 'npm test']) {
        assert.ok(core.includes(command), `共通検証を先行する: ${command}`);
    }
    assert.equal((workflow.match(/^          npm test$/gm) || []).length, 1, '全単体テストは一度だけ実行する');
    assert.match(jobs.validate, /needs: scope/);
    assert.match(jobs.validate, /!cancelled\(\)/, '上流失敗をskip成功にせず必須名へ伝える');
    const gate = jobs.validate.match(/run: (test "\$SCOPE_RESULT" = success)/)[1];
    for (const result of ['success', 'failure', 'cancelled', 'skipped']) {
        const { spawnSync } = require('node:child_process');
        const shell = process.platform === 'win32' ? join(process.env.ProgramFiles, 'Git/bin/bash.exe') : 'bash';
        const actual = spawnSync(shell, ['-c', gate], { env: { ...process.env, SCOPE_RESULT: result } });
        assert.ifError(actual.error);
        assert.equal(actual.status === 0, result === 'success');
    }
    for (const name of ['space-browser', 'focus-browser', 'paper-browser', 'quest-browser', 'book-browser']) {
        assert.match(jobs[name], /needs: scope/);
        assert.doesNotMatch(jobs[name].split('    steps:')[0], /always\(|!cancelled\(|failure\(/,
            '通常のsuccess依存で共通失敗時にrunnerを起動しない');
    }
});

test('権利確認中の画像をPublic成果物へアップロードしない', () => {
    assert.doesNotMatch(readWorkflow(), /actions\/upload-artifact@/);
});

test('通常PRは先行ブラウザ失敗後に停止し、全件診断は続行し、中断・未検証build・ブラウザ準備失敗は起動しない', () => {
    const workflow = readWorkflow();
    const validate = workflow.split('  validate:\n')[1].split('  space-browser:\n')[0];
    const steps = [...validate.matchAll(/      - name: (.*?)\n([\s\S]*?)(?=      - name:|$(?![\s\S]))/g)];
    const gated = steps.filter(([, , body]) => body.includes("needs.scope.result == 'success'"));
    assert.ok(gated.length > 0);
    const allOutputs = Object.fromEntries(Object.keys(LABS).map(key => [key, 'true']));
    const ready = { build: 'success', scope: 'success', browser: 'success' };
    // 各前提の失敗・未実行を独立に確認する。複数前提が同時に失敗する直積は重ねない。
    const prerequisites = [ready, ...Object.keys(ready).flatMap(key =>
        ['failure', 'skipped'].map(status => ({ ...ready, [key]: status })))];
    for (const [, name, body] of gated) {
        const expression = body.match(/if: "\$\{\{ (.*?) \}\}"/)[1];
        for (const diagnostic of [false, true]) {
            for (const priorStatus of ['success', 'failure', 'cancelled']) {
                for (const { build, scope, browser } of prerequisites) {
                    const context = { success: () => priorStatus === 'success', cancelled: () => priorStatus === 'cancelled',
                        steps: { verified_build: { outcome: build }, browser_setup: { outcome: browser } },
                        needs: { scope: { result: scope, outputs: allOutputs } },
                        env: { PIKALAB_COLLECT_ALL_FAILURES: String(diagnostic), PIKALAB_COMPARE_BASELINE: 'true' },
                        github: { event_name: 'pull_request' } };
                    assert.equal(evaluate(expression, context), priorStatus !== 'cancelled' && (priorStatus === 'success' || diagnostic)
                        && build === 'success' && scope === 'success' && browser === 'success', name);
                }
            }
        }
    }
    for (const [, name, body] of steps.filter(([, name]) => name.startsWith('Upload '))) {
        assert.match(body, /if: always\(\)/, `${name}: 失敗・中断の証跡を残す`);
    }
    assert.doesNotMatch(workflow, /continue-on-error:/, '診断続行でもジョブの失敗を成功に変えない');
});

test('ビルドと成果物検証を先に済ませ、必要なブラウザとPDF依存の準備後に検証する', () => {
    const jobs = workflowJobs(readWorkflow());
    for (const [name, body] of Object.entries(jobs)) {
        const steps = [...body.matchAll(/      - name: (.*?)\n([\s\S]*?)(?=      - name:|$(?![\s\S]))/g)];
        const indexOfCommand = command => steps.findIndex(([, , step]) => step.includes(command));
        const build = indexOfCommand('npm run build:all');
        const verify = indexOfCommand('npm run verify:build');
        const install = indexOfCommand('node ../.github/scripts/verify-playwright-runtime.cjs');
        assert.ok(build >= 0 && verify >= build && install > verify, name);
        const installation = steps[install][2];
        assert.match(body, /image: mcr\.microsoft\.com\/playwright:v1\.60\.0-noble@sha256:[a-f0-9]{64}/,
            `${name}: ブラウザ・font・OS依存を含む公式イメージを版とdigestで固定する`);
        assert.doesNotMatch(installation, /playwright install|cache-hit/, '異版の取得やキャッシュへ暗黙に切り替えない');
        const tools = indexOfCommand('command -v python3');
        assert.ok(tools >= 0 && tools < build, `${name}: Pythonは素材準備前に必要`);
        assert.equal(steps[tools][2].includes('poppler-utils'), ['quest-browser', 'book-browser'].includes(name));
        const browserChecks = steps.filter(([, , step]) => /npm run (?:verify:code-studio-security|guard:visual|test:[\w-]+-e2e)|RUN_PIKALAB_TOP_BROWSER=1/.test(step));
        assert.ok(browserChecks.length > 0, name);
        for (const check of browserChecks) assert.ok(steps.indexOf(check) > install, `${name}: ${check[1]}`);
    }
    const commonUnit = jobs.scope.match(/      - name: Run all PikaLab tests\n([\s\S]*?)(?=      - name:|$)/)[1];
    assert.doesNotMatch(commonUnit, /if:/, '共通準備・セキュリティ失敗後は既定のsuccess条件で単体テストを起動しない');
});

test('全件診断は明示的な手動指定または全画面比較のときだけ有効になる', () => {
    const expression = readWorkflow().match(/^  PIKALAB_COLLECT_ALL_FAILURES: \$\{\{ (.*?) \}\}$/m)[1];
    for (const event_name of ['pull_request', 'workflow_dispatch']) {
        for (const collect_all_failures of [false, true]) {
            for (const visual_preservation of [false, true]) {
                for (const label of [false, true]) {
                    const context = { github: { event_name }, inputs: { collect_all_failures, visual_preservation },
                        labels: label ? ['pikalab-visual-preservation'] : [], contains: (a, v) => a.includes(v) };
                    assert.equal(evaluate(expression, context), label || event_name === 'workflow_dispatch' && (collect_all_failures || visual_preservation));
                }
            }
        }
    }
});

test('全画面比較の指定はラボ選択と画像比較で共有し、全件診断だけでは比較を追加しない', () => {
    const workflow = readWorkflow();
    const expression = workflow.match(/^  PIKALAB_COMPARE_BASELINE: \$\{\{ (.*?) \}\}$/m)[1];
    assert.match(workflowJobs(workflow).scope, /CI_PRESERVE_VISUAL: \$\{\{ env\.PIKALAB_COMPARE_BASELINE \}\}/);
    assert.equal((workflow.match(/PIKALAB_COMPARE_BASELINE:/g) || []).length, 1);
    for (const event_name of ['pull_request', 'workflow_dispatch']) {
        for (const visual_preservation of [false, true]) {
            for (const label of [false, true]) {
                const context = { github: { event_name }, inputs: { collect_all_failures: true, visual_preservation },
                    labels: label ? ['pikalab-visual-preservation'] : [], contains: (a, v) => a.includes(v) };
                assert.equal(evaluate(expression, context), label || event_name === 'workflow_dispatch' && visual_preservation);
            }
        }
    }
});

test('Eduplayの専用変更だけでブラウザE2Eを選び、無関係なラボでは省く', () => {
    const own = classifyChanges(['pikalab/eduplay/puzzle.html', 'pikalab/eduplay/tests/browser.test.cjs']);
    assert.equal(own.full, false);
    assert.equal(own.eduplay, true);
    for (const lab of Object.keys(LABS).filter(lab => lab !== 'eduplay')) {
        assert.equal(own[lab], false, lab);
    }
    const other = classifyChanges(['pikalab/fraction_lab/script.js']);
    assert.equal(other.full, false);
    assert.equal(other.eduplay, false);
    const both = classifyChanges(['pikalab/eduplay/common.js', 'pikalab/space_lab/script.js']);
    assert.equal(both.eduplay, true);
    assert.equal(both.space, true);
});

test('共有・CI・未知の変更でEduplayを漏らさず従来どおり全E2Eへ戻す', () => {
    for (const file of ['pikalab/style.css','pikalab/package-lock.json',
        'pikalab/scripts/run-node-tests.cjs', 'pikalab/eduplay/../js/common.js',
        '.github/workflows/pikalab-quality.yml', '.github/scripts/pikalab-ci-scope.cjs',
        'pikalab/scripts/new-e2e.mjs']) {
        const scope = classifyChanges(['pikalab/eduplay/puzzle.html',file]);
        assert.equal(scope.full, true, file);
        assert.equal(scope.eduplay, true, file);
        for (const lab of Object.keys(LABS)) assert.equal(scope[lab], true, file + ':' + lab);
    }
});

test('Eduplay browserのCI絞込はnpm test内の並列性と全体検証を維持する', () => {
    const { readFileSync } = require('node:fs');
    const browser = readFileSync(join(__dirname,'../../pikalab/eduplay/tests/browser.test.cjs'),'utf8');
    const workflow = readFileSync(join(__dirname,'../workflows/pikalab-quality.yml'),'utf8');
    assert.match(browser, /process\.env\.PIKALAB_BROWSER_TESTS === '1'/);
    assert.match(browser, /process\.env\.PIKALAB_CI_EDUPLAY !== 'false'/);
    assert.match(workflow, /eduplay: \$\{\{ steps\.scope\.outputs\.eduplay \}\}/);
    assert.match(workflow, /PIKALAB_CI_EDUPLAY: \$\{\{ steps\.scope\.outputs\.eduplay \}\}/);
    assert.match(workflow, /npm test/);
    assert.match(workflow, /npm run test:pwa-e2e/);
    assert.match(workflow, /npm run guard:visual/);
    assert.doesNotMatch(workflow, /PIKALAB_BROWSER_TESTS=1 node --test eduplay\/tests\/browser\.test\.cjs/);
});

test('baselineの教育監査モジュールはビルド前に必ず取得する', () => {
    const workflow = readWorkflow();
    const baselines = ['pikalab', 'space', 'focus', 'paper', 'quest', 'book'];
    for (const name of baselines) {
        const marker = '          path: .' + name + '-baseline\n';
        assert.equal(workflow.split(marker).length, 2, name + ' baseline checkout must exist exactly once');
        const checkout = workflow.split(marker)[1].split(/\n      - name:/)[0];
        assert.doesNotMatch(checkout, /sparse-checkout:/, name + ': full checkout includes all public audit inputs');
        assert.ok(workflow.includes('prepare.py --root .' + name + '-baseline'), name + ': baseline media must be prepared before build');
    }
    assert.doesNotMatch(workflow, /sparse-checkout:/);
});

test('比較元を共有してもPR・手動・pushの必要なsource/buildと全ラボ比較を維持する', () => {
    const body = workflowJobs(readWorkflow()).validate;
    const step = name => body.split('      - name: ' + name + '\n')[1].split('      - name:')[0];
    const condition = name => step(name).match(/if: "\$\{\{ (.*?) \}\}"/)[1];
    const checkout = condition('Checkout shared layout baseline');
    const prepare = condition('Prepare verified baseline dependencies from this job');
    const install = condition('Install shared baseline dependencies');
    const build = condition('Build shared baseline for visual and learning checks');
    const labs = ['rhythm', 'manabi', 'speed_reader', 'typing_dojo', 'kotowaza', 'fraction'];
    for (const event_name of ['pull_request', 'push', 'workflow_dispatch']) {
        for (const visual of ['true', 'false']) {
            for (let mask = 0; mask < 64; mask++) {
                const outputs = Object.fromEntries(labs.map((name, i) => [name, (mask >> i) & 1 ? 'true' : 'false']));
                const context = { github: { event_name }, env: { PIKALAB_COMPARE_BASELINE: visual }, needs: { scope: { outputs } } };
                const learning = event_name === 'pull_request' && labs.slice(1).some(name => outputs[name] === 'true');
                const rhythm = event_name === 'pull_request' && outputs.rhythm === 'true';
                const requiresBuild = visual === 'true' || learning;
                const requiresSource = requiresBuild || rhythm;
                for (const expression of [checkout, prepare, install]) assert.equal(evaluate(expression, context), requiresSource);
                assert.equal(evaluate(build, context), requiresBuild);
            }
        }
    }
    assert.match(step('Checkout shared layout baseline'), /ref: \$\{\{ github\.event\.pull_request\.base\.sha \|\| github\.event\.repository\.default_branch \}\}/);
    assert.doesNotMatch(body, /path: \.(?:rhythm|manabi)-baseline/);
    const consumers = {
        'Run Rhythm Lab browser E2E': 'RHYTHM_BASELINE_ROOT=../.pikalab-baseline/pikalab',
        'Run Manabi Land browser E2E': 'MANABI_BASELINE_ROOT=../.pikalab-baseline/pikalab/dist',
        'Run Speed Reader browser E2E': 'SPEED_READER_BASELINE_ROOT=../.pikalab-baseline/pikalab/dist',
        'Run Typing Dojo browser E2E': 'TYPING_DOJO_BASELINE_ROOT=../.pikalab-baseline/pikalab/dist',
        'Run Kotowaza Quiz browser E2E': 'KOTOWAZA_QUIZ_BASELINE_ROOT=../.pikalab-baseline/pikalab/dist',
        'Run Fraction Lab browser E2E': 'FRACTION_LAB_BASELINE_ROOT=../.pikalab-baseline/pikalab/dist',
    };
    for (const [name, binding] of Object.entries(consumers)) {
        const consumer = step(name);
        assert.ok(consumer.includes(binding), name + ': separate baseline remains bound');
        assert.ok(consumer.includes('[ "${{ github.event_name }}" = pull_request ]'), name + ': manual/push comparison activation stays unchanged');
    }
});

test('Kanji専用検証は同じ宣言から選択・package実行へ反映される', () => {
    const file = 'pikalab/kanji_lab/tests/browser-interactions.test.cjs';
    const scope = classifyChanges([file]);
    assert.equal(scope.full, false);
    for (const lab of Object.keys(LABS)) assert.equal(scope[lab], lab === 'kanji', lab);
    assert.equal(LAB_E2E_FILES[file], 'kanji');
    assert.equal(LAB_E2E_SCRIPTS['test:kanji-e2e'], file);
    assert.equal(classifyChanges(['pikalab/space_lab/index.html']).kanji, false);
    assert.equal(classifyChanges(['pikalab/package-lock.json']).kanji, true);
});

test('Kanjiはscope内の共通検証成功と自身の選択を必要とし、別jobのstepを参照しない', () => {
    const workflow = readWorkflow();
    const jobs = workflowJobs(workflow);
    assert.match(jobs.scope, /kanji: \$\{\{ steps\.scope\.outputs\.kanji \}\}/);
    assert.match(jobs.scope, /name: Run all PikaLab tests\n\s+id: unit_tests/);
    const step = jobs.validate.split('      - name: Verify Kanji Lab browser interactions\n')[1].split('      - name:')[0];
    assert.doesNotMatch(jobs.validate, /steps\.unit_tests\./);
    assert.match(step, /RUN_PIKALAB_KANJI_BROWSER: "1"/);
    assert.match(step, /npm run test:kanji-e2e/);
    const expression = step.match(/if: "\$\{\{ (.*?) \}\}"/)[1];
    for (const selected of ['true', 'false', '']) {
        for (const result of ['success', 'failure', 'cancelled', 'skipped']) {
            const context = { success: () => true, cancelled: () => false,
                steps: { verified_build: { outcome: 'success' }, browser_setup: { outcome: 'success' } },
                needs: { scope: { result, outputs: { kanji: selected } } },
                env: { PIKALAB_COLLECT_ALL_FAILURES: 'false' } };
            assert.equal(evaluate(expression, context), selected === 'true' && result === 'success');
        }
    }
});

test('Kanjiの実ブラウザは専用指定時だけ起動し通常の全Nodeテストは重ねて起動しない', () => {
    const { readFileSync } = require('node:fs');
    const browser = readFileSync(join(__dirname, '../../pikalab/kanji_lab/tests/browser-interactions.test.cjs'), 'utf8');
    assert.match(browser, /const enabled = process\.env\.RUN_PIKALAB_KANJI_BROWSER === '1'/);
    assert.match(browser, /skip: !enabled/);
    const workflow = readWorkflow();
    assert.equal((workflow.match(/RUN_PIKALAB_KANJI_BROWSER:/g) || []).length, 1);
    assert.equal((workflow.match(/npm run test:kanji-e2e\n/g) || []).length, 1);
    assert.doesNotMatch(workflow, /actions\/upload-artifact@/);
});

test('Kanji統合後も教育プライバシー監査とscope一度だけの全体検証を維持する', () => {
    const jobs = workflowJobs(readWorkflow());
    assert.match(jobs.scope, /node scripts\/education-no-tracking\.cjs --pikalab-build/);
    assert.match(jobs.scope, /node \.github\/scripts\/education-privacy-e2e\.cjs --root-build --pikalab-build/);
    assert.ok(jobs.scope.indexOf('education-privacy-e2e.cjs') < jobs.scope.indexOf('name: Run all PikaLab tests'));
    assert.equal((readWorkflow().match(/^          npm test$/gm) || []).length, 1);
});

test('book専用検証は対象変更だけで選択し、共有変更は全検証へ戻す', () => {
    const scope = classifyChanges(['pikalab/scripts/book-report-e2e.mjs']);
    assert.equal(scope.full, false);
    assert.equal(scope.book, true);
    for (const other of Object.keys(LABS)) if (other !== 'book') assert.equal(scope[other], false);
    assert.equal(classifyChanges(['pikalab/space_lab/index.html']).book, false);
    assert.equal(classifyChanges(['pikalab/package.json']).book, true);
    const workflow = require('node:fs').readFileSync(require('node:path').join(__dirname, '../workflows/pikalab-quality.yml'), 'utf8');
    assert.ok(workflow.includes('book: ${{ steps.scope.outputs.book }}'));
    const job = workflow.split('  book-browser:')[1];
    assert.match(job, /needs: scope/);
    assert.ok(job.includes("needs.scope.outputs.book == 'true'"));
});

test('Bookの基点・Draft条件・証跡先は実際のPRとE2E実行先に対応する', () => {
    const job = workflowJobs(readWorkflow())['book-browser'];
    const expression = job.match(/if: "\$\{\{ (.*?) \}\}"/)[1];
    for (const event_name of ['pull_request', 'workflow_dispatch']) {
        for (const draft of [false, true]) {
            for (const selected of [false, true]) {
                const context = { github: { event_name, event: { pull_request: { draft } } },
                    needs: { scope: { outputs: { book: String(selected) } } } };
                assert.equal(evaluate(expression, context), selected && (event_name !== 'pull_request' || !draft));
            }
        }
    }
    assert.ok(job.includes('ref: ${{ github.event.pull_request.base.sha || github.event.repository.default_branch }}'));
    assert.ok(job.includes('BOOK_REPORT_BASELINE_ROOT=../.book-baseline/pikalab/dist npm run test:book-e2e'));
    assert.doesNotMatch(job, /actions\/upload-artifact@/);
    const e2e = require('node:fs').readFileSync(join(__dirname, '../../pikalab/scripts/book-report-e2e.mjs'), 'utf8');
    assert.ok(e2e.includes("path.join(root, 'visual-guard-artifacts', 'book-report')"));
    assert.ok(e2e.includes('process.env.BOOK_REPORT_BASELINE_ROOT'));
});

test('KanjiとBookの同時追加は両方を一度ずつ登録し対象ラボだけを合成する', () => {
    const packageBefore = { scripts: { test: 'node --test', build: 'vite build' } };
    const packageAfter = structuredClone(packageBefore);
    const files = ['pikalab/kanji_lab/tests/browser-interactions.test.cjs', 'pikalab/scripts/book-report-e2e.mjs'];
    packageAfter.scripts['test:kanji-e2e'] = `node ${files[0].slice('pikalab/'.length)}`;
    packageAfter.scripts['test:book-e2e'] = `node ${files[1].slice('pikalab/'.length)}`;
    for (const changed of [files, ['pikalab/package.json', ...files]]) {
        const scope = classifyChanges(changed, { packageBefore, packageAfter });
        assert.equal(scope.full, false);
        for (const lab of Object.keys(LABS)) assert.equal(scope[lab], ['kanji', 'book'].includes(lab), lab);
    }
    const registry = require('node:fs').readFileSync(join(__dirname, 'pikalab-e2e-inputs.cjs'), 'utf8');
    const workflow = readWorkflow();
    for (const lab of ['kanji', 'book']) {
        assert.equal((registry.match(new RegExp(`'test:${lab}-e2e':`, 'g')) || []).length, 1);
        assert.equal((workflow.match(new RegExp(`npm run test:${lab}-e2e\\n`, 'g')) || []).length, 1);
    }
});
