const fs = require('node:fs');
const path = require('node:path');

const {
    collectHtml,
    collectResourceReferences,
    collectTransitiveScriptReferences,
    isPathInside,
    resolveLocalReference
} = require('./verify-build-output.cjs');

function collectServiceWorkerReferences(source) {
    const references = [];
    const pattern = /\bserviceWorker\s*\.\s*register\s*\(\s*(['"`])([^'"`]+)\1/g;

    for (const match of source.matchAll(pattern)) {
        if (!match[2].includes('${')) references.push(match[2]);
    }

    return references;
}

function copyMissingRuntimeAssets(sourceRoot, buildRoot) {
    const source = path.resolve(sourceRoot);
    const build = path.resolve(buildRoot);
    const copied = [];
    const scriptReferences = new Map();
    const serviceWorkerReferences = new Map();

    for (const buildHtml of collectHtml(build)) {
        const relativeHtml = path.relative(build, buildHtml);
        const sourceHtml = path.join(source, relativeHtml);
        const html = fs.readFileSync(buildHtml, 'utf8');
        const references = collectResourceReferences(html);

        const copyReference = (reference) => {
            const buildTarget = resolveLocalReference(build, buildHtml, reference);
            if (!buildTarget || fs.existsSync(buildTarget)) return;
            if (!isPathInside(build, buildTarget)) {
                throw new Error(`${relativeHtml}: ビルドルート外へはコピーできません (${reference})`);
            }

            const sourceTarget = resolveLocalReference(source, sourceHtml, reference);
            if (!sourceTarget || !isPathInside(source, sourceTarget) || !fs.existsSync(sourceTarget)) {
                throw new Error(`${relativeHtml}: コピー元がありません (${reference})`);
            }
            if (!fs.statSync(sourceTarget).isFile()) {
                throw new Error(`${relativeHtml}: コピー元がファイルではありません (${reference})`);
            }

            fs.mkdirSync(path.dirname(buildTarget), { recursive: true });
            fs.copyFileSync(sourceTarget, buildTarget);
            copied.push(path.relative(build, buildTarget).replaceAll('\\', '/'));
        };

        // HTMLが直接参照する従来資産を先に揃える。
        for (const reference of references) {
            copyReference(reference);
        }

        // source側のJS依存をたどる。build側にまだ存在しない動的scriptも、
        // audio.js -> roles.js -> ux.js -> exposure.js のように再帰的に拾える。
        const runtimeScripts = collectTransitiveScriptReferences(source, sourceHtml, references, scriptReferences);
        for (const reference of runtimeScripts) {
            copyReference(reference);
        }

        const allScriptReferences = [...new Set([...references, ...runtimeScripts])];
        const serviceWorkers = collectServiceWorkerReferences(html);
        for (const reference of allScriptReferences) {
            const buildTarget = resolveLocalReference(build, buildHtml, reference);
            if (!buildTarget || path.extname(buildTarget).toLowerCase() !== '.js' || !fs.existsSync(buildTarget)) {
                continue;
            }
            let registrations = serviceWorkerReferences.get(buildTarget);
            if (registrations === undefined) {
                registrations = collectServiceWorkerReferences(fs.readFileSync(buildTarget, 'utf8'));
                serviceWorkerReferences.set(buildTarget, registrations);
            }
            serviceWorkers.push(...registrations);
        }

        for (const reference of [...new Set(serviceWorkers)]) {
            copyReference(reference);
        }
    }

    return [...new Set(copied)].sort();
}

module.exports = { copyMissingRuntimeAssets };

if (require.main === module) {
    try {
        const projectRoot = path.resolve(__dirname, '..');
        const buildRoot = path.resolve(projectRoot, process.argv[2] || 'dist');
        const copied = copyMissingRuntimeAssets(projectRoot, buildRoot);
        console.log(`従来script資産コピー: ${copied.length}件`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
