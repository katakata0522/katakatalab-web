const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { copyReachableCodeStudio } = require('../../.github/scripts/copy-code-studio-reachable.cjs');
const { fixTranslationMarkup, prepareCodeStudioRevision, finalizeCodeStudioBuild } = require('../scripts/finalize-code-studio-ui.cjs');

const projectRoot = path.resolve(__dirname, '..');

test('組み込み説明文を日本語・英語へ繰り返し切り替えても改行と強調を丸ごと更新し、他のアイコンを保つ', () => {
    const revision = prepareCodeStudioRevision(projectRoot);
    const bundle = revision.assets.get(revision.mainModule).toString('utf8');
    const method = bundle.match(/updateLanguageUI\(\)\{([\s\S]*?)\}\},J9=/)?.[1];
    assert.ok(method, '実際の配信バンドルの翻訳メソッドを検査する');
    const rich = ['modal_import_desc', 'modal_help_debug_desc'].map(key => ({
        dataset: { i18n: key }, children: [{ tagName: 'BR' }],
        childNodes: [{ nodeType: 3, textContent: '古い先頭文' }], innerHTML: '古い先頭文<br>古い末尾文'
    }));
    const labelText = { nodeType: 3, textContent: '古いラベル' };
    const iconLabel = {
        dataset: { i18n: 'other_label' }, children: [{ tagName: 'SVG' }], childNodes: [labelText],
        set innerHTML(_) { throw new Error('無関係なアイコンを消してはいけません'); }
    };
    const update = vm.runInNewContext(`(function(){${method}})`, {
        Node: { TEXT_NODE: 3 },
        document: { querySelectorAll: selector => selector === '[data-i18n]' ? [...rich, iconLabel] : [] }
    });
    for (const suffix of ['日本語', 'English', '日本語']) {
        const translations = {
            modal_import_desc: `${suffix}の説明<br>HTML/CSS/JS`,
            modal_help_debug_desc: `<b>${suffix}</b>の説明<br>Logs`,
            other_label: suffix
        };
        update.call({ t: key => translations[key] });
        for (const element of rich) assert.equal(element.innerHTML, translations[element.dataset.i18n]);
        assert.equal(labelText.textContent, suffix);
        assert.equal(iconLabel.children[0].tagName, 'SVG');
    }
});

test('未知または重複する翻訳処理を推測で書き換えない', () => {
    const original = 'if(n)if(e.children.length===0)e.innerHTML=n;else';
    assert.throws(() => fixTranslationMarkup('new implementation'), /一意/);
    assert.throws(() => fixTranslationMarkup(original + original), /一意/);
});

test('原本と既存URLを保って配信グラフを版付きURLへ出力し、後からの改変を検証で拒否する', () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'code-studio-ui-'));
    try {
        const build = path.join(temporary, 'dist');
        const root = path.join(build, 'code-studio');
        copyReachableCodeStudio(path.join(projectRoot, '.code-studio'), root);
        const revision = prepareCodeStudioRevision(projectRoot);
        const result = finalizeCodeStudioBuild(build);
        finalizeCodeStudioBuild(build);
        finalizeCodeStudioBuild(build, { checkOnly: true });
        assert.equal(result.assetCount, revision.assets.size);
        for (const [name, original] of revision.originals) {
            assert.ok(fs.readFileSync(path.join(projectRoot, '.code-studio', name)).equals(original), name);
            if (name !== 'index.html') assert.ok(fs.readFileSync(path.join(root, name)).equals(original), name);
        }
        const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
        assert.ok(html.includes(`./${result.directory}/${path.basename(result.mainModule)}`));
        const revisedModule = path.join(root, result.directory, path.basename(result.mainModule));
        fs.appendFileSync(revisedModule, '\n/* unexpected modification */');
        assert.throws(() => finalizeCodeStudioBuild(build, { checkOnly: true }), /配信資産が一致/);
    } finally {
        fs.rmSync(temporary, { recursive: true, force: true });
    }
});
