const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pikalabRoot = path.resolve(__dirname, '..');
const securityHelperPath = path.join(
    pikalabRoot,
    '.code-studio',
    'assets',
    'code-studio-security.js'
);

function createFakeDocument() {
    class FakeElement {
        constructor(tagName) {
            this.tagName = tagName.toUpperCase();
            this.children = [];
            this.className = '';
            this.textContent = '';
            this.dataset = {};
            this.style = { cssText: '' };
            this.type = '';
            this.checked = false;
        }

        set innerHTML(_value) {
            throw new Error('innerHTML must not be used');
        }

        appendChild(child) {
            this.children.push(child);
            return child;
        }
    }

    return {
        createElement(tagName) {
            return new FakeElement(tagName);
        }
    };
}

test('CodeStudio安全ヘルパーはAIレビューの値をHTMLとして解釈しない', () => {
    const security = require(securityHelperPath);
    const document = createFakeDocument();
    const container = document.createElement('section');
    const payload = '<img src=x onerror="globalThis.compromised=true">';

    const card = security.appendAIReviewCard(
        document,
        container,
        { type: 'warning', title: payload, desc: payload, patch: { original: '', replace: '' } },
        7,
        { warning: '⚠️ 警告', suggestion: '💡 提案' }
    );

    assert.equal(container.children.length, 1);
    assert.equal(card.children[0].children[0].textContent, `⚠️ 警告: ${payload}`);
    assert.equal(card.children[1].textContent, payload);
    assert.equal(card.children[0].children[1].dataset.idx, '7');
    assert.equal(card.children[0].children[1].checked, true);
});

test('CodeStudio安全ヘルパーは通常のプロジェクトを同じ内容で受け入れる', () => {
    const security = require(securityHelperPath);
    const tabs = [{
        name: 'タブ 1',
        type: 'web',
        html: '<main>ok</main>',
        css: 'main { color: red; }',
        js: 'console.log("ok");',
        json: '{"constructor":{"prototype":"ユーザー入力"}}',
        php: '',
        note: '',
        libs: { tailwind: false },
        customLibs: []
    }];

    const result = security.validateProjectTabs(tabs);
    assert.deepEqual(result, tabs);
    assert.notEqual(result, tabs);

    const parsed = security.parseProjectTabsJson(JSON.stringify(tabs));
    assert.deepEqual(parsed, tabs);
    assert.equal(parsed[0].json, tabs[0].json, 'ユーザー編集用JSONの文字列を欠落・改変しない');
});

test('CodeStudio安全ヘルパーは不正なプロジェクトJSONを境界で拒否する', () => {
    const security = require(securityHelperPath);

    assert.equal(security.parseProjectTabsJson('{invalid'), null);
    assert.equal(security.parseProjectTabsJson(JSON.stringify({ tabs: [] })), null);
    assert.equal(security.parseProjectTabsJson(JSON.stringify([{ name: 'x', type: 'unknown' }])), null);
});

test('CodeStudio安全ヘルパーは過剰なタブ数・文字数・ファイルサイズを拒否する', () => {
    const security = require(securityHelperPath);
    const validTab = {
        name: 'tab', type: 'web', html: '', css: '', js: '', json: '', php: '', note: '',
        libs: {}, customLibs: []
    };

    assert.equal(security.validateProjectTabs(Array.from({ length: 65 }, () => ({ ...validTab }))), null);
    assert.equal(
        security.validateProjectTabs([{ ...validTab, html: 'a'.repeat(security.LIMITS.maxFieldChars + 1) }]),
        null
    );
    assert.equal(security.isProjectFileWithinLimit({ size: security.LIMITS.maxImportBytes + 1 }), false);
    assert.equal(security.isProjectFileWithinLimit({ size: security.LIMITS.maxImportBytes }), true);
});

test('CodeStudio安全ヘルパーは共有URLの圧縮前後サイズを検査する', () => {
    const security = require(securityHelperPath);
    const safePayload = new Uint8Array(20);
    new DataView(safePayload.buffer).setUint32(16, 1024, true);
    const oversizedPayload = new Uint8Array(20);
    new DataView(oversizedPayload.buffer).setUint32(
        16,
        security.LIMITS.maxDecodedBytes + 1,
        true
    );

    assert.equal(security.isShareTokenWithinLimit('a'.repeat(security.LIMITS.maxShareTokenChars)), true);
    assert.equal(security.isShareTokenWithinLimit('a'.repeat(security.LIMITS.maxShareTokenChars + 1)), false);
    assert.equal(security.isGzipPayloadWithinLimit(safePayload), true);
    assert.equal(security.isGzipPayloadWithinLimit(oversizedPayload), false);
});

test('CodeStudio公開バンドルは安全ヘルパーを入力境界とレビュー描画に使う', () => {
    const html = fs.readFileSync(path.join(pikalabRoot, '.code-studio', 'index.html'), 'utf8');
    const helper = fs.readFileSync(securityHelperPath, 'utf8');
    const extension = fs.readFileSync(
        path.join(pikalabRoot, '.code-studio', 'assets', 'code-studio.js'),
        'utf8'
    );
    const bundleSrc = html.match(/<script[^>]+type="module"[^>]+src="(\.\/assets\/[^"]+\.js)"/i)?.[1];
    assert.ok(bundleSrc, '公開HTMLが現行Code Studio bundleを参照する必要があります');
    const bundle = fs.readFileSync(
        path.join(pikalabRoot, '.code-studio', bundleSrc.replace(/^\.\//, '')),
        'utf8'
    );

    const helperIndex = html.indexOf('./assets/code-studio-security.js');
    const bundleIndex = html.indexOf(bundleSrc);
    const extensionIndex = html.indexOf('./assets/code-studio.js');
    assert.ok(helperIndex >= 0 && helperIndex < bundleIndex, '安全ヘルパーを本体より先に読み込む');
    assert.ok(helperIndex < extensionIndex, '安全ヘルパーを手書き拡張より先に読み込む');
    assert.match(helper, /protectNativeJsonParseDuringBootstrap/);
    assert.match(helper, /parseProjectTabsJson/);
    assert.match(extension, /JSON\.parse\s*=\s*function/, '旧拡張の上書きは互換ガードで無効化する');
    assert.match(bundle, /CodeStudioSecurity\.appendAIReviewCard/);
    assert.match(bundle, /CodeStudioSecurity\.validateProjectTabs/);
    assert.match(bundle, /CodeStudioSecurity\.isGzipPayloadWithinLimit/);
    assert.match(bundle, /CodeStudioSecurity\.isProjectFileWithinLimit/);
    assert.doesNotMatch(bundle, /<span>\$\{r\}: \$\{e\.title\}<\/span>/);
});
