const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const codeStudioHtmlPath = path.join(projectRoot, '.code-studio', 'index.html');
const codeStudioJsPath = path.join(projectRoot, '.code-studio', 'assets', 'code-studio.js');

test('CodeStudio files exist and index.html loads external JS', () => {
    assert.ok(fs.existsSync(codeStudioHtmlPath), 'index.html should exist');
    assert.ok(fs.existsSync(codeStudioJsPath), 'code-studio.js should exist');
    
    const html = fs.readFileSync(codeStudioHtmlPath, 'utf8');
    assert.ok(html.length > 0, 'index.html should not be empty');
    assert.ok(html.includes('<script src="./assets/code-studio.js"></script>'), 'index.html should load external code-studio.js');
    
    const js = fs.readFileSync(codeStudioJsPath, 'utf8');
    assert.ok(js.length > 0, 'code-studio.js should not be empty');
});

test('CodeStudio encapsulation and configuration in code-studio.js', () => {
    const js = fs.readFileSync(codeStudioJsPath, 'utf8');
    
    // Check CONFIG definition
    assert.ok(js.includes('const CONFIG ='), 'Should define CONFIG constants');
    
    // Check CodeStudio namespace definition
    assert.ok(js.includes('window.CodeStudio ='), 'Should define window.CodeStudio namespace');
});

test('Message Dispatcher consolidation and cleanup in code-studio.js', () => {
    const js = fs.readFileSync(codeStudioJsPath, 'utf8');
    
    // Check if the consolidated message dispatcher exists
    assert.ok(js.includes("case 'UPDATE_VARIABLE':"), 'Consolidated switch should handle UPDATE_VARIABLE');
    assert.ok(js.includes("case 'SET_INSPECTOR_MODE':"), 'Consolidated switch should handle SET_INSPECTOR_MODE');
    assert.ok(js.includes("case 'INSPECTOR_ELEMENT_CLICKED':"), 'Consolidated switch should handle INSPECTOR_ELEMENT_CLICKED');
    assert.ok(js.includes("case 'DIRECT_TEXT_EDIT':"), 'Consolidated switch should handle DIRECT_TEXT_EDIT');
    assert.ok(js.includes("case 'CONSOLE_LOG':"), 'Consolidated switch should handle CONSOLE_LOG');

    // Check if there are no garbled unicode replacement chars in code-studio.js
    assert.ok(!js.includes('\uFFFD'), 'code-studio.js should not contain garbled unicode replacement characters');
});

test('Obsolete global variables and duplicate listeners are disabled in code-studio.js', () => {
    const js = fs.readFileSync(codeStudioJsPath, 'utf8');
    
    // Let's verify clearLastError uses the encapsulated CodeStudio.lastErrorMessage
    assert.ok(js.includes('CodeStudio.lastErrorMessage = "";'), 'clearLastError should clear encapsulated variable');
    assert.ok(js.includes('if (!CodeStudio.lastErrorMessage) return;'), 'aiAskBtn listener should refer to encapsulated variable');
});

test('Preview iframe runs user code without same-origin sandbox privileges', () => {
    const html = fs.readFileSync(codeStudioHtmlPath, 'utf8');
    const iframeMatch = html.match(/<iframe[^>]+id="preview-frame"[^>]*>/);
    assert.ok(iframeMatch, 'preview iframe should exist');

    const sandboxMatch = iframeMatch[0].match(/sandbox="([^"]+)"/);
    assert.ok(sandboxMatch, 'preview iframe should define a sandbox');

    const permissions = sandboxMatch[1].split(/\s+/);
    assert.ok(permissions.includes('allow-scripts'), 'preview runtime needs scripts');
    assert.ok(!permissions.includes('allow-same-origin'), 'preview user code should not get same-origin privileges');
    assert.ok(!permissions.includes('allow-top-navigation'), 'preview should not navigate the top window');
    assert.ok(!permissions.includes('allow-top-navigation-by-user-activation'), 'preview should not navigate the top window by activation');
});

test('Preview rendering uses srcdoc instead of parent document access', () => {
    const html = fs.readFileSync(codeStudioHtmlPath, 'utf8');
    const bundleName = html.match(/<script[^>]+type="module"[^>]+src="\.\/assets\/([^"]+\.js)"/i)?.[1];
    assert.ok(bundleName, 'index.html should reference the current Code Studio module bundle');
    const bundlePath = path.join(projectRoot, '.code-studio', 'assets', bundleName);
    const bundle = fs.readFileSync(bundlePath, 'utf8');

    assert.ok(bundle.includes('.srcdoc='), 'preview should be updated via iframe.srcdoc');
    assert.ok(!bundle.includes('.write(v)'), 'preview should not write through iframe.contentDocument');
});

test('CodeStudio parent dispatcher binds control messages to the preview frame source', () => {
    const js = fs.readFileSync(codeStudioJsPath, 'utf8');

    assert.ok(
        js.includes('const previewFrame = DOM.previewFrame || document.getElementById('),
        'dispatcher should resolve the preview frame before handling control messages'
    );
    assert.ok(
        js.includes('e.source !== previewFrame.contentWindow'),
        'dispatcher should reject messages that do not come from the preview frame'
    );
    assert.ok(
        js.includes("e.origin !== 'null'"),
        'dispatcher should allow the opaque sandbox origin only after the preview frame source check'
    );
});

test('CodeStudioは任意APIが非公開でも誤解を招く警告を繰り返さない', () => {
    const js = fs.readFileSync(codeStudioJsPath, 'utf8');

    assert.ok(js.includes('CodeStudio.hasWarnedIndexedDbFailure'), 'IndexedDBの実障害は1回だけ警告する必要があります');
    assert.ok(!js.includes('kr (IndexedDB) is not available'), '任意APIがない通常経路を障害扱いしないでください');
    assert.ok(!js.includes('HoverProvider 登録失敗: monaco オブジェクトが見つかりません'));
    assert.ok(!js.includes('エディタ初期化の監視がタイムアウトしました'));
});

test('CodeStudio preview messages require scoped parameters and command token', () => {
    const js = fs.readFileSync(codeStudioJsPath, 'utf8');

    assert.ok(
        js.includes('CodeStudio.previewMessageToken = CodeStudio.Security.createMessageToken();'),
        'each preview run should create a fresh parent-message token'
    );
    assert.ok(
        js.includes('const allowedParamNames = new Set('),
        'preview variable updates should be limited to detected parameter names'
    );
    assert.ok(
        /allowedParamNames\.has\(name\)[\s\S]*window\[name\] = val/.test(js),
        'preview global assignment should happen only after the parameter allowlist check'
    );
    assert.ok(
        js.includes('isTrustedPreviewMessage: function(data)'),
        'privileged preview-to-parent commands should validate a token'
    );
    assert.ok(
        js.includes("'location', 'document', 'window', 'parent', 'top', 'opener'"),
        'dangerous browser globals should be blocked as adjustable parameter names'
    );
    assert.ok(
        /case 'UPDATE_VARIABLE':[\s\S]*isTrustedPreviewMessage\(e\.data\)[\s\S]*isAllowedParamName\(name\)/.test(js),
        'preview-to-parent UPDATE_VARIABLE messages should require a token and parameter allowlist'
    );
    assert.ok(
        /case 'SET_INSPECTOR_MODE':[\s\S]*isTrustedPreviewMessage\(e\.data\)[\s\S]*typeof e\.data\.active !== 'boolean'/.test(js),
        'preview-to-parent inspector mode changes should require a token and boolean payload'
    );
    assert.ok(
        /case 'DIRECT_TEXT_EDIT':[\s\S]*isTrustedPreviewMessage\(e\.data\)[\s\S]*handleDirectTextEdit/.test(js),
        'DIRECT_TEXT_EDIT should require a trusted preview token before editing'
    );
    assert.ok(
        /case 'INSPECTOR_ELEMENT_CLICKED':[\s\S]*isTrustedPreviewMessage\(e\.data\)[\s\S]*handleInspectorElementClick/.test(js),
        'inspector click messages should require a trusted preview token'
    );
    assert.ok(
        js.includes('if (!e.isTrusted) return;'),
        'preview-side editor gestures should ignore synthetic events'
    );
    assert.ok(
        /type: 'UPDATE_VARIABLE'[\s\S]*}, '\*'\);/.test(js),
        'parent-to-preview parameter updates should use wildcard targetOrigin for opaque sandbox frames'
    );
    assert.ok(
        /type: 'SET_INSPECTOR_MODE'[\s\S]*}, '\*'\);/.test(js),
        'parent-to-preview inspector messages should use wildcard targetOrigin for opaque sandbox frames'
    );
});
