'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { readLabWorker } = require('./finalize-lab-service-workers.cjs');

const LAB_WORKERS = Object.freeze([
    { directory: 'focus_studio', workers: ['sw.js', 'sw-hardened.js'] },
    // Spaceは旧SWを解除する実装なので、manifestとアイコンだけを補完する。
    { directory: 'space_lab', workers: [] },
]);

function supplementalLabs(root) {
    return fs.existsSync(path.join(root, 'science_maker/index.html')) ? [{ directory: 'science_maker', workers: [] }] : [];
}

function isPathInside(root, target) {
    const relative = path.relative(root, target);
    return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function getAttribute(tag, attribute) {
    const match = tag.match(new RegExp(`\\s${attribute}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
    return match ? match[2] : '';
}

function manifestTags(html) {
    return [...html.matchAll(/<link\b[^>]*>/gi)]
        .filter(([tag]) => getAttribute(tag, 'rel').toLowerCase().split(/\s+/).includes('manifest'));
}

function restoreManifestLink(html, directory) {
    const matches = manifestTags(html);
    if (matches.length !== 1 || !getAttribute(matches[0][0], 'href')) {
        throw new Error(`${directory}: manifestへのlinkが1件必要です`);
    }
    const [tag] = matches[0];
    const restored = tag.replace(/(\shref\s*=\s*)(["'])(.*?)\2/i, '$1$2./manifest.json$2');
    return html.slice(0, matches[0].index) + restored + html.slice(matches[0].index + tag.length);
}

function resolveAsset(root, baseFile, reference) {
    // 対象ラボの既存ローカル資産だけを扱い、外部取得や配信ルート外のコピーはしない。
    if (typeof reference !== 'string' || !reference || /^(?:[a-z][a-z\d+.-]*:|\/|\\)/i.test(reference)) {
        throw new Error(`ローカルPWA資産ではありません: ${reference}`);
    }
    const url = new URL(reference, `https://pikalab.invalid/${path.relative(root, baseFile).replaceAll('\\', '/')}`);
    const target = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
    // URLによる正規化の前にも検査して、../によるルート外参照を拒否する。
    const unresolved = path.resolve(path.dirname(baseFile), decodeURIComponent(reference.split(/[?#]/, 1)[0]));
    if (!isPathInside(root, unresolved) || !isPathInside(root, target)) {
        throw new Error(`PWA資産が配信ルート外です: ${reference}`);
    }
    return reference.split(/[?#]/, 1)[0].endsWith('/') ? path.join(target, 'index.html') : target;
}

function readInstallAssets(workerSource, workerPath) {
    try {
        return [...new Set(readLabWorker(workerSource).assets)];
    } catch (error) {
        throw new Error(`${workerPath}: ${error.message}`, { cause: error });
    }
}

function assertFile(file, label) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        throw new Error(`${label}: PWA資産がありません (${file})`);
    }
}

function manifestAssets(root, directory) {
    const manifestPath = path.join(root, directory, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const start = resolveAsset(root, manifestPath, manifest.start_url);
    if (start !== path.join(root, directory, 'index.html')) {
        throw new Error(`${directory}: manifestの開始URLがラボ入口と一致しません`);
    }
    if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
        throw new Error(`${directory}: manifestのアイコンがありません`);
    }
    const icons = manifest.icons.map((icon) => resolveAsset(root, manifestPath, icon.src));
    if (icons.some((icon) => !isPathInside(path.join(root, directory), icon)
        && !(directory === 'science_maker' && icon === path.join(root, 'icon.svg')))) {
        throw new Error(`${directory}: manifestのアイコンがラボの外を参照しています`);
    }
    return [start, ...icons];
}

function verifyLabPwaAssets(buildRoot) {
    const build = path.resolve(buildRoot);
    if (fs.existsSync(path.join(build, 'space_lab', 'sw.js'))) {
        throw new Error('Spaceの解除済みService Workerが配信成果物に残っています');
    }
    const assets = new Set();
    for (const { directory, workers } of [...LAB_WORKERS, ...supplementalLabs(build)]) {
        const index = path.join(build, directory, 'index.html');
        assertFile(index, directory);
        const tags = manifestTags(fs.readFileSync(index, 'utf8'));
        if (tags.length !== 1 || resolveAsset(build, index, getAttribute(tags[0][0], 'href')) !== path.join(build, directory, 'manifest.json')) {
            throw new Error(`${directory}: manifestはラボ直下から読み込む必要があります`);
        }
        const required = [path.join(build, directory, 'manifest.json'), ...manifestAssets(build, directory)];
        for (const worker of workers) {
            const workerPath = path.join(build, directory, worker);
            assertFile(workerPath, directory);
            required.push(...readInstallAssets(fs.readFileSync(workerPath, 'utf8'), `${directory}/${worker}`)
                .map((reference) => resolveAsset(build, workerPath, reference)));
        }
        for (const file of required) {
            assertFile(file, directory);
            assets.add(path.relative(build, file).replaceAll('\\', '/'));
        }
    }
    const typingWorker = path.join(build, 'typing_dojo/sw.js');
    if (fs.existsSync(typingWorker)) {
        for (const reference of readInstallAssets(fs.readFileSync(typingWorker, 'utf8'), 'typing_dojo/sw.js')) {
            const file = resolveAsset(build, typingWorker, reference);
            assertFile(file, 'typing_dojo');
            assets.add(path.relative(build, file).replaceAll('\\', '/'));
        }
    }
    return { assets: [...assets].sort() };
}

function restoreLabPwaAssets(projectRoot, buildRoot) {
    const project = path.resolve(projectRoot);
    const build = path.resolve(buildRoot);
    if (project === build || isPathInside(build, project)) {
        throw new Error('PWA資産の配信先をソースと分離してください');
    }
    const copied = new Set();
    const changedHtml = [];

    const copyAsset = (relative, { overwrite = false } = {}) => {
        const destination = path.join(build, relative);
        if (!overwrite && fs.existsSync(destination)) {
            assertFile(destination, relative);
            return;
        }
        const candidates = [path.join(project, relative), path.join(project, 'public', relative)];
        const source = candidates.find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
        if (!source) throw new Error(`${relative}: PWA資産のコピー元がありません`);
        const content = fs.readFileSync(source);
        if (fs.existsSync(destination) && fs.readFileSync(destination).equals(content)) return;
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, content);
        copied.add(relative.replaceAll('\\', '/'));
    };

    for (const { directory, workers } of [...LAB_WORKERS, ...supplementalLabs(project)]) {
        const index = path.join(build, directory, 'index.html');
        assertFile(index, directory);
        const original = fs.readFileSync(index, 'utf8');
        const restored = restoreManifestLink(original, directory);
        // manifestを元の場所へ戻し、相対start_urlとiconsの意味を維持する。
        // Viteのハッシュ付きmanifestはルートSWの既存先読み対象なので削除しない。
        copyAsset(`${directory}/manifest.json`, { overwrite: true });
        for (const asset of manifestAssets(build, directory)) {
            copyAsset(path.relative(build, asset));
        }
        for (const worker of workers) {
            const workerPath = path.join(build, directory, worker);
            copyAsset(`${directory}/${worker}`);
            for (const reference of readInstallAssets(fs.readFileSync(workerPath, 'utf8'), `${directory}/${worker}`)) {
                copyAsset(path.relative(build, resolveAsset(build, workerPath, reference)));
            }
        }
        if (restored !== original) {
            fs.writeFileSync(index, restored, 'utf8');
            changedHtml.push(`${directory}/index.html`);
        }
    }
    const typingWorker = path.join(build, 'typing_dojo/sw.js');
    if (fs.existsSync(typingWorker)) {
        for (const reference of readInstallAssets(fs.readFileSync(typingWorker, 'utf8'), 'typing_dojo/sw.js')) {
            copyAsset(path.relative(build, resolveAsset(build, typingWorker, reference)));
        }
    }
    return { copied: [...copied].sort(), changedHtml, ...verifyLabPwaAssets(build) };
}

module.exports = { LAB_WORKERS, readInstallAssets, restoreLabPwaAssets, restoreManifestLink, verifyLabPwaAssets };

if (require.main === module) {
    try {
        const projectRoot = path.resolve(__dirname, '..');
        const verifyOnly = process.argv.includes('--verify');
        const buildRoot = path.resolve(projectRoot, process.argv.slice(2).find((arg) => arg !== '--verify') || 'dist');
        const result = verifyOnly ? verifyLabPwaAssets(buildRoot) : restoreLabPwaAssets(projectRoot, buildRoot);
        console.log(`ラボPWA配信資産: ${result.assets.length}件を検証${verifyOnly ? '' : `、${result.copied.length}件を復元`}`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
