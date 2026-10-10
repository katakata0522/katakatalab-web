const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
    dedupeFocusModalBlocks,
    injectRuntimeHardening,
    hardenFocusStudioBuild
} = require('../scripts/harden-focus-studio-build.cjs');
const { verifyFocusStudioBuild } = require('../scripts/verify-focus-studio-build.cjs');

const modalScript = `<script>
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-action="parents-modal-open"]');
});
</script>`;
const modalStyle = `<style>
#parents-modal[open] { animation: parentsModalFadeIn 0.3s ease-out forwards; }
</style>`;

function makeBuildFixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'focus-studio-build-'));
    const focusRoot = path.join(root, 'focus_studio');
    fs.mkdirSync(focusRoot, { recursive: true });
    fs.writeFileSync(
        path.join(focusRoot, 'index.html'),
        `<html><body>${modalStyle}${modalScript}${modalStyle}${modalScript}</body></html>`
    );
    fs.writeFileSync(
        path.join(focusRoot, 'runtime-hardening.js'),
        '__timerDeadlineMs __timerCompletionPromise __timerMode Date.now() visibilitychange pagehide pageshow sw-hardened.js'
    );
    fs.writeFileSync(
        path.join(focusRoot, 'sw-hardened.js'),
        `const CACHE_PREFIX = 'focus-studio-';\nself.PwaRuntime.configure({ autoUpdate: false });\nself.addEventListener('install', () => {});\nself.addEventListener('activate', () => {});`
    );
    fs.writeFileSync(path.join(root, 'pwa-runtime.js'), 'function fetchBounded() {}');
    return root;
}

test('Focus Studioの重複モーダル初期化だけを1件へ整理する', () => {
    const html = `${modalStyle}${modalScript}${modalStyle}${modalScript}<script>console.log('keep')</script>`;
    const result = dedupeFocusModalBlocks(html);

    assert.equal((result.match(/parentsModalFadeIn/g) || []).length, 1);
    assert.equal((result.match(/parents-modal-open/g) || []).length, 1);
    assert.match(result, /console\.log\('keep'\)/);
});

test('runtime hardening scriptをbody末尾へ1回だけ挿入する', () => {
    const once = injectRuntimeHardening('<html><body></body></html>');
    const twice = injectRuntimeHardening(once);

    assert.equal((twice.match(/runtime-hardening\.js/g) || []).length, 1);
});

test('Focus Studio build hardening後の配布物を検証できる', () => {
    const root = makeBuildFixture();
    hardenFocusStudioBuild(root);

    const html = fs.readFileSync(path.join(root, 'focus_studio', 'index.html'), 'utf8');
    assert.equal((html.match(/parents-modal-open/g) || []).length, 1);
    assert.equal((html.match(/runtime-hardening\.js/g) || []).length, 1);
    assert.doesNotThrow(() => verifyFocusStudioBuild(root));
});

test('install時の強制skipWaitingは配布検証で拒否する', () => {
    const root = makeBuildFixture();
    hardenFocusStudioBuild(root);
    fs.writeFileSync(
        path.join(root, 'focus_studio', 'sw-hardened.js'),
        `const CACHE_PREFIX = 'focus-studio-';\nself.PwaRuntime.configure({ autoUpdate: false });\nself.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', () => {});`
    );

    assert.throws(() => verifyFocusStudioBuild(root), /強制skipWaiting/);
});
