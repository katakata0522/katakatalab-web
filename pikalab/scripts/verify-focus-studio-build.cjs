const fs = require('node:fs');
const path = require('node:path');

function countMatches(source, pattern) {
    return [...source.matchAll(pattern)].length;
}

function verifyFocusStudioBuild(buildRoot) {
    const root = path.resolve(buildRoot);
    const focusRoot = path.join(root, 'focus_studio');
    const indexPath = path.join(focusRoot, 'index.html');
    const runtimePath = path.join(focusRoot, 'runtime-hardening.js');
    const swPath = path.join(focusRoot, 'sw-hardened.js');
    const errors = [];

    if (!fs.existsSync(indexPath)) {
        errors.push('Focus Studioのindex.htmlがbuild出力にありません');
    }
    if (!fs.existsSync(runtimePath)) {
        errors.push('Focus Studioのruntime-hardening.jsがbuild出力にありません');
    }
    if (!fs.existsSync(swPath)) {
        errors.push('Focus Studioのsw-hardened.jsがbuild出力にありません');
    }

    if (fs.existsSync(indexPath)) {
        const html = fs.readFileSync(indexPath, 'utf8');
        if (!html.includes('src="./runtime-hardening.js"')) {
            errors.push('Focus Studioのbuild HTMLがruntime-hardening.jsを読み込んでいません');
        }

        const modalOpenHandlerCount = countMatches(
            html,
            /document\.querySelectorAll\('\[data-action="parents-modal-open"\]'\)/g
        );
        if (modalOpenHandlerCount !== 1) {
            errors.push(`保護者モーダル初期化が重複しています（現在${modalOpenHandlerCount}件）`);
        }
    }

    if (fs.existsSync(runtimePath)) {
        const runtime = fs.readFileSync(runtimePath, 'utf8');
        const requiredMarkers = [
            '__timerDeadlineMs',
            '__timerCompletionPromise',
            '__timerMode',
            'Date.now()',
            'visibilitychange',
            'pagehide',
            'pageshow',
            'sw-hardened.js'
        ];
        for (const marker of requiredMarkers) {
            if (!runtime.includes(marker)) {
                errors.push(`runtime-hardening.jsに必須処理がありません: ${marker}`);
            }
        }
    }

    if (fs.existsSync(swPath)) {
        const sw = fs.readFileSync(swPath, 'utf8');
        if (!sw.includes("const CACHE_PREFIX = 'focus-studio-';")) {
            errors.push('Focus Studio Service Workerに専用cache prefixがありません');
        }
        const runtimePath = path.join(root, 'pwa-runtime.js');
        const runtime = fs.existsSync(runtimePath) ? fs.readFileSync(runtimePath, 'utf8') : '';
        if (!sw.includes('PwaRuntime.configure') || !runtime.includes('fetchBounded')) {
            errors.push('Focus Studio Service Workerにnetwork timeoutがありません');
        }
        const installSection = sw.split("self.addEventListener('activate'", 1)[0];
        if (/skipWaiting\s*\(/.test(installSection) || !/autoUpdate\s*:\s*false/.test(sw)) {
            errors.push('Focus Studio Service Workerがinstall時に強制skipWaitingしています');
        }
    }

    if (errors.length > 0) {
        throw new Error(errors.join('\n'));
    }

    return { ok: true };
}

module.exports = { verifyFocusStudioBuild };

if (require.main === module) {
    try {
        verifyFocusStudioBuild(process.argv[2] || 'dist');
        console.log('Focus Studio build verification: OK');
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
