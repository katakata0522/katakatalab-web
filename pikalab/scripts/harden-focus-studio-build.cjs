const fs = require('node:fs');
const path = require('node:path');

function dedupeFocusModalBlocks(html) {
    const seen = new Set();
    const blockPattern = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;

    return html.replace(blockPattern, (block) => {
        const isFocusModalBlock = block.includes('parents-modal-open')
            || block.includes('parents-modal-close')
            || block.includes('parentsModalFadeIn');
        if (!isFocusModalBlock) return block;

        const normalized = block.replace(/\r\n/g, '\n').trim();
        if (seen.has(normalized)) return '';
        seen.add(normalized);
        return block;
    });
}

function injectRuntimeHardening(html) {
    if (html.includes('runtime-hardening.js')) return html;
    const scriptTag = '    <script src="./runtime-hardening.js"></script>\n';
    if (!html.includes('</body>')) {
        throw new Error('Focus Studioのbuild HTMLに</body>がありません');
    }
    return html.replace('</body>', `${scriptTag}</body>`);
}

function hardenFocusStudioBuild(buildRoot) {
    const root = path.resolve(buildRoot);
    const indexPath = path.join(root, 'focus_studio', 'index.html');
    if (!fs.existsSync(indexPath)) {
        throw new Error(`Focus Studioのbuild HTMLがありません: ${indexPath}`);
    }

    const original = fs.readFileSync(indexPath, 'utf8');
    const hardened = injectRuntimeHardening(dedupeFocusModalBlocks(original));
    fs.writeFileSync(indexPath, hardened, 'utf8');

    return {
        indexPath,
        changed: hardened !== original
    };
}

module.exports = {
    dedupeFocusModalBlocks,
    injectRuntimeHardening,
    hardenFocusStudioBuild
};

if (require.main === module) {
    try {
        const buildRoot = process.argv[2] || 'dist';
        const result = hardenFocusStudioBuild(buildRoot);
        console.log(`Focus Studio build hardening: ${result.changed ? 'updated' : 'already clean'}`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
