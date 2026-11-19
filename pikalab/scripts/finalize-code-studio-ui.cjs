'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { collectReachableCodeStudio } = require('../../.github/scripts/copy-code-studio-reachable.cjs');

const SOURCE_PREFIX = 'pikalab/.code-studio/';
const TRANSLATION_BRANCH = 'if(n)if(e.children.length===0)e.innerHTML=n;else';
const RICH_TRANSLATION_BRANCH = 'if(n)if(e.children.length===0||t===`modal_import_desc`||t===`modal_help_debug_desc`)e.innerHTML=n;else';
const CLOSE_IDS = ['memo-close', 'tools-close', 'ai-panel-close', 'help-modal-close', 'ai-import-modal-close'];
const CLOSE_ICON = '<svg class="code-studio-ui-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg>';
const GEAR_ICON = '<svg class="code-studio-ui-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4M4.9 4.9l2.8 2.8m8.6 8.6 2.8 2.8m0-14.2-2.8 2.8m-8.6 8.6-2.8 2.8"/></svg>';
const TOOLBAR_STYLE = `<style id="code-studio-review-ui">
.code-studio-ui-icon{display:inline-block;vertical-align:middle;flex-shrink:0}
#editor-pane>.pane-header{height:auto;min-height:40px;flex-wrap:wrap;gap:6px;padding-block:6px;overflow:visible}
#editor-pane>.pane-header .pane-header-left{max-width:100%;min-width:0}
#editor-pane>.pane-header .pane-header-right{max-width:100%;min-width:0;flex:0 1 auto;flex-wrap:wrap;overflow:visible}
#editor-pane>.pane-header .pane-header-right>*{flex-shrink:0}
#editor-pane>.pane-header .type-selector-wrap{min-width:0;max-width:100%}
#editor-pane>.pane-header .type-select{max-width:100%}
</style>`;

function sha256(bytes) {
    return crypto.createHash('sha256').update(bytes).digest('hex');
}

function replaceOnce(source, before, after, label) {
    if (source.split(before).length !== 2) throw new Error(`Code Studioの既知の${label}が一意に見つかりません`);
    return source.replace(before, after);
}

function fixTranslationMarkup(source) {
    // 組み込みの説明文2件だけがHTML翻訳。アイコンを持つ他のラベルは従来の更新経路を保つ。
    return replaceOnce(source, TRANSLATION_BRANCH, RICH_TRANSLATION_BRANCH, '翻訳処理');
}

function fixHtmlControls(source) {
    let html = source;
    for (const id of CLOSE_IDS) {
        const pattern = new RegExp(`(<button\\b[^>]*\\bid="${id}"[^>]*>)✕(</button>)`, 'g');
        if ([...html.matchAll(pattern)].length !== 1) throw new Error(`Code Studioの閉じるボタンが一意に見つかりません: ${id}`);
        html = html.replace(pattern, (_, opening, closing) => `${opening.slice(0, -1)} aria-label="閉じる">${CLOSE_ICON}${closing}`);
    }
    html = replaceOnce(html, '>⚙ KatakataLab <span', `>${GEAR_ICON} KatakataLab <span`, 'ロゴ');
    return replaceOnce(html, '</head>', `${TOOLBAR_STYLE}\n</head>`, 'head');
}

function prepareCodeStudioRevision(projectRoot) {
    const project = path.resolve(projectRoot);
    const source = path.join(project, '.code-studio');
    const contracts = new Map(JSON.parse(fs.readFileSync(path.join(project, '../qa/published-dependencies.json'), 'utf8'))
        .files.filter(entry => entry.path.startsWith(SOURCE_PREFIX)).map(entry => [entry.path.slice(SOURCE_PREFIX.length), entry]));
    const originals = new Map();
    for (const file of collectReachableCodeStudio(source).reachableFiles) {
        const relative = path.relative(source, file).split(path.sep).join('/');
        const entry = contracts.get(relative);
        const bytes = fs.readFileSync(file);
        if (!entry || bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) {
            throw new Error(`Code Studioの原本照合に失敗しました: ${relative}`);
        }
        if (relative !== 'index.html' && !relative.startsWith('assets/')) {
            throw new Error(`Code Studioに未確認の参照先があります: ${relative}`);
        }
        originals.set(relative, bytes);
    }
    const originalIndex = originals.get('index.html');
    const originalHtml = originalIndex.toString('utf8');
    // 次回のPublic QAも同じ入力を得られるよう、既に公開済みのHTML原本だけを保管する。
    // 配信ページとして実行させないため、内容のhashを付けた.binを使う。
    const archivePath = `qa-source/index-${sha256(originalIndex)}.bin`;
    const modules = [...originalHtml.matchAll(/<script\b[^>]*type="module"[^>]*src="\.\/(assets\/[^"/]+\.js)"[^>]*>/g)];
    if (modules.length !== 1) throw new Error('Code Studioのメインモジュールを一意に解決できません');
    const mainModule = modules[0][1];
    const assets = new Map([...originals].filter(([name]) => name.startsWith('assets/')));
    assets.set(mainModule, Buffer.from(fixTranslationMarkup(assets.get(mainModule).toString('utf8'))));
    const html = fixHtmlControls(originalHtml);
    const digest = crypto.createHash('sha256').update(html);
    for (const [name, bytes] of [...assets].sort(([a], [b]) => a.localeCompare(b))) {
        digest.update(`\0${name}\0${bytes.length}\0`).update(bytes);
    }
    // 言語モジュールがメインモジュール名をimportするため、グラフ全体を同じ版のURLへ移す。
    const directory = `assets-ui-${digest.digest('hex').slice(0, 20)}`;
    return { originals, assets, mainModule, directory, archivePath, html: html.replaceAll('./assets/', `./${directory}/`) };
}

function finalizeCodeStudioBuild(buildRoot, { projectRoot = path.resolve(__dirname, '..'), checkOnly = false } = {}) {
    const build = path.resolve(buildRoot);
    if (path.basename(build) !== 'dist' || build === path.resolve(projectRoot)) {
        throw new Error('Code Studioの配信出力には独立したdistディレクトリが必要です');
    }
    const root = path.join(build, 'code-studio');
    const revision = prepareCodeStudioRevision(projectRoot);
    // 既存タブ用のassetsは原本のまま残す。sourceやPrivate原本へ書き戻さない。
    for (const [name, expected] of revision.originals) {
        if (name === 'index.html') continue;
        const target = path.join(root, name);
        if (!fs.existsSync(target) || !fs.readFileSync(target).equals(expected)) {
            throw new Error(`Code Studioのコピー済み原本が一致しません: ${name}`);
        }
    }
    const index = path.join(root, 'index.html');
    const currentHtml = fs.readFileSync(index, 'utf8');
    if (currentHtml !== revision.originals.get('index.html').toString('utf8') && currentHtml !== revision.html) {
        throw new Error('Code Studioの配信HTMLに未確認の変更があります');
    }
    const archive = path.join(root, revision.archivePath);
    const originalIndex = revision.originals.get('index.html');
    if (fs.existsSync(archive) && !fs.readFileSync(archive).equals(originalIndex)) {
        throw new Error('Code StudioのQA用HTML原本が一致しません');
    }
    if (checkOnly) {
        if (!fs.existsSync(archive)) throw new Error('Code StudioのQA用HTML原本がありません');
    } else {
        fs.mkdirSync(path.dirname(archive), { recursive: true });
        fs.writeFileSync(archive, originalIndex);
    }
    for (const [name, bytes] of revision.assets) {
        const target = path.join(root, name.replace(/^assets\//, `${revision.directory}/`));
        if (checkOnly) {
            if (!fs.existsSync(target) || !fs.readFileSync(target).equals(bytes)) throw new Error(`Code StudioのUI配信資産が一致しません: ${name}`);
        } else {
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, bytes);
        }
    }
    if (checkOnly) {
        if (currentHtml !== revision.html) throw new Error('Code StudioのUI修正が配信HTMLへ反映されていません');
    } else {
        fs.writeFileSync(index, revision.html);
    }
    return { directory: revision.directory, mainModule: revision.mainModule, assetCount: revision.assets.size, archivePath: revision.archivePath };
}

module.exports = { fixTranslationMarkup, fixHtmlControls, prepareCodeStudioRevision, finalizeCodeStudioBuild };

if (require.main === module) {
    try {
        const result = finalizeCodeStudioBuild(process.argv[2] || 'dist', { checkOnly: process.argv.includes('--check') });
        console.log(`Code Studio UI: ${result.assetCount} assets verified; ${result.directory}`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
