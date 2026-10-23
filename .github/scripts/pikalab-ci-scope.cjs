const { execFileSync } = require('node:child_process');
const { appendFileSync } = require('node:fs');
const { isDeepStrictEqual } = require('node:util');
const { LAB_E2E_FILES, LAB_E2E_SCRIPTS } = require('./pikalab-e2e-inputs.cjs');

// PR全体の変更を使う。共有・未知のファイルは必ず全E2Eへ戻す。
const LABS = Object.freeze({
    deepsea: 'deepsea_lab', color: 'color_lab', eduplay: 'eduplay', rhythm: 'rhythm_lab',
    manabi: 'manabi_land', speed_reader: 'speed_reader', typing_dojo: 'typing_dojo',
    kotowaza: 'kotowaza_quiz', fraction: 'fraction_lab', focus: 'focus_studio',
    space: 'space_lab', paper: 'paper_gen', quest: 'quest_board', kanji: 'kanji_lab', book: 'book_report'
});
const LOCAL_DIRECTORIES = new Set([...Object.values(LABS),
    'book_report', 'kanji_lab', 'eduplay', 'science_maker']);
// Focus Studioだけが読む公開追加資産。共有public資産はこの一覧へ含めない。
const LAB_RUNTIME_FILES = Object.freeze({
    'pikalab/public/focus_studio/runtime-hardening.js': 'focus',
    'pikalab/public/focus_studio/sw-hardened.js': 'focus',
});

function classifyPackageScripts(before, after) {
    const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    if (!isObject(before) || !isObject(after) || !isObject(before.scripts) || !isObject(after.scripts)) return null;
    const { scripts: oldScripts, ...oldMetadata } = before;
    const { scripts: newScripts, ...newMetadata } = after;
    // 依存関係・overrides・npm lifecycleなど、専用E2E追加以外は全検証へ戻す。
    if (!isDeepStrictEqual(oldMetadata, newMetadata)) return null;
    const labs = new Set();
    for (const key of new Set([...Object.keys(oldScripts), ...Object.keys(newScripts)])) {
        if (oldScripts[key] === newScripts[key]) continue;
        const file = LAB_E2E_SCRIPTS[key];
        if (Object.hasOwn(oldScripts, key) || !Object.hasOwn(LAB_E2E_SCRIPTS, key)
            || newScripts[key] !== `node ${file.slice('pikalab/'.length)}`
            || Object.hasOwn(newScripts, `pre${key}`) || Object.hasOwn(newScripts, `post${key}`)
            || !Object.hasOwn(LABS, LAB_E2E_FILES[file])) return null;
        labs.add(LAB_E2E_FILES[file]);
    }
    return [...labs];
}

function fullScope(reason) {
    return { full: true, reason, ...Object.fromEntries(Object.keys(LABS).map(key => [key, true])) };
}

function classifyChanges(files, { eventName = 'pull_request', preserveVisual = false, packageBefore, packageAfter } = {}) {
    if (eventName !== 'pull_request' || preserveVisual) return fullScope('手動実行または全画面の比較指定');
    if (!Array.isArray(files) || files.length === 0) return fullScope('変更一覧を確定できない');
    const selected = new Set();
    for (const file of files) {
        if (typeof file !== 'string' || file.includes('\\') || file.split('/').some(part => !part || part === '..' || part === '.')) {
            return fullScope('不正または未知のパス');
        }
        if (file === 'pikalab/package.json') {
            const labs = classifyPackageScripts(packageBefore, packageAfter);
            if (labs === null) return fullScope('package.jsonの共有変更または比較不能');
            for (const key of labs) selected.add(LABS[key]);
            continue;
        }
        const parts = file.split('/');
        const lab = LAB_E2E_FILES[file] || LAB_RUNTIME_FILES[file];
        if ((Object.hasOwn(LAB_E2E_FILES, file) || Object.hasOwn(LAB_RUNTIME_FILES, file)) && Object.hasOwn(LABS, lab)) {
            selected.add(LABS[lab]);
            continue;
        }
        if (parts[0] !== 'pikalab' || parts.length < 3 || !LOCAL_DIRECTORIES.has(parts[1])) {
            return fullScope('共有または未知の変更');
        }
        selected.add(parts[1]);
    }
    return { full: false, reason: `ラボまたは専用E2Eの変更: ${[...selected].sort().join(', ')}`,
        ...Object.fromEntries(Object.entries(LABS).map(([key, directory]) => [key, selected.has(directory)])) };
}

function readPackageRevision(revision, cwd) {
    if (revision !== 'HEAD' && !/^[a-f0-9]{40}$/i.test(revision || '')) throw new Error('package比較用SHAがない');
    return JSON.parse(execFileSync('git', ['show', `${revision}:pikalab/package.json`],
        { cwd, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }));
}

function readScope(baseSha, options = {}, cwd) {
    const files = readChanges(baseSha, cwd);
    const packages = files.includes('pikalab/package.json')
        ? { packageBefore: readPackageRevision(baseSha, cwd), packageAfter: readPackageRevision('HEAD', cwd) } : {};
    return classifyChanges(files, { ...options, ...packages });
}

function readChanges(baseSha, cwd) {
    if (!/^[a-f0-9]{40}$/i.test(baseSha || '')) throw new Error('PR基点SHAがない');
    // renameの旧パス・新パスを両方含め、ラボ間移動も両方検証する。
    const output = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', baseSha, 'HEAD', '--'],
        { cwd, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    return output.split('\0').filter(Boolean);
}

function run() {
    let scope;
    try {
        const eventName = process.env.CI_EVENT_NAME;
        const preserveVisual = process.env.CI_PRESERVE_VISUAL === 'true';
        scope = eventName !== 'pull_request' || preserveVisual
            ? fullScope('手動実行または全画面の比較指定')
            : readScope(process.env.CI_BASE_SHA, { eventName, preserveVisual });
    } catch (error) {
        scope = fullScope(`変更取得失敗のため全検証: ${error.message.split('\n')[0]}`);
    }
    console.log(JSON.stringify(scope, null, 2));
    if (process.env.GITHUB_OUTPUT) {
        appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(scope).filter(([key]) => key !== 'reason')
            .map(([key, value]) => `${key}=${value}\n`).join(''));
    }
    if (process.env.GITHUB_STEP_SUMMARY) {
        const selected = Object.keys(LABS).filter(key => scope[key]).join(', ') || 'なし';
        appendFileSync(process.env.GITHUB_STEP_SUMMARY,
            `### PikaLab E2E対象\n\n${scope.reason.replace(/[\r\n]/g, ' ')}\n\n対象: ${selected}\n\n構造・依存関係・型・全体ビルド・生成差分・セキュリティ・PWA・全画面visual guard・全単体テストは毎回実行。\n`);
    }
}

module.exports = { LABS, LAB_RUNTIME_FILES, classifyChanges, classifyPackageScripts, readChanges, readScope };
if (require.main === module) run();
