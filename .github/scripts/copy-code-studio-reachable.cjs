const fs = require('node:fs');
const path = require('node:path');

const TEXT_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.map']);
const ASSET_REFERENCE_PATTERN = /[A-Za-z0-9_.-]+\.(?:js|css|woff2?|ttf|svg|png|jpe?g|webp|json|wasm|map)/g;

function listFiles(root, current = root) {
    return fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
        const absolute = path.join(current, entry.name);
        return entry.isDirectory() ? listFiles(root, absolute) : [absolute];
    });
}

function assertSafePaths(source, destination) {
    const sourcePath = path.resolve(source);
    const destinationPath = path.resolve(destination);
    const destinationRoot = path.parse(destinationPath).root;

    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
        throw new Error(`Code Studioのコピー元がありません: ${sourcePath}`);
    }
    if (!fs.existsSync(path.join(sourcePath, 'index.html'))) {
        throw new Error(`Code Studioのindex.htmlがありません: ${sourcePath}`);
    }
    if (destinationPath === destinationRoot || path.basename(destinationPath) !== 'code-studio') {
        throw new Error(`安全でないコピー先です: ${destinationPath}`);
    }
    if (destinationPath === sourcePath || sourcePath.startsWith(`${destinationPath}${path.sep}`)) {
        throw new Error('コピー元とコピー先が重なっています');
    }

    return { sourcePath, destinationPath };
}

function collectReachableCodeStudio(source) {
    const sourcePath = path.resolve(source);
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
        throw new Error(`Code Studioのコピー元がありません: ${sourcePath}`);
    }
    if (!fs.existsSync(path.join(sourcePath, 'index.html'))) {
        throw new Error(`Code Studioのindex.htmlがありません: ${sourcePath}`);
    }

    const files = listFiles(sourcePath);
    const filesByBasename = new Map();

    for (const file of files) {
        const basename = path.basename(file);
        const matches = filesByBasename.get(basename) || [];
        matches.push(file);
        filesByBasename.set(basename, matches);
    }

    const queue = [path.join(sourcePath, 'index.html')];
    const scheduled = new Set(queue);
    const reachable = new Set();
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const file = queue[cursor];
        if (reachable.has(file)) continue;
        reachable.add(file);

        if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
        const contents = fs.readFileSync(file, 'utf8');
        const references = contents.match(ASSET_REFERENCE_PATTERN) || [];
        for (const reference of references) {
            for (const candidate of filesByBasename.get(path.basename(reference)) || []) {
                if (!scheduled.has(candidate)) {
                    scheduled.add(candidate);
                    queue.push(candidate);
                }
            }
        }
    }

    return { sourcePath, sourceFiles: files, reachableFiles: [...reachable] };
}

function copyReachableCodeStudio(source, destination) {
    const { sourcePath, destinationPath } = assertSafePaths(source, destination);
    const { sourceFiles, reachableFiles } = collectReachableCodeStudio(sourcePath);

    fs.rmSync(destinationPath, { recursive: true, force: true });
    const createdDirectories = new Set();
    for (const file of reachableFiles) {
        const relative = path.relative(sourcePath, file);
        const target = path.join(destinationPath, relative);
        const directory = path.dirname(target);
        if (!createdDirectories.has(directory)) {
            fs.mkdirSync(directory, { recursive: true });
            createdDirectories.add(directory);
        }
        fs.copyFileSync(file, target);
    }

    return { copiedFiles: reachableFiles.length, sourceFiles: sourceFiles.length };
}

module.exports = { collectReachableCodeStudio, copyReachableCodeStudio };

if (require.main === module) {
    try {
        const [source, destination] = process.argv.slice(2);
        if (!source || !destination) {
            throw new Error('使い方: node copy-code-studio-reachable.cjs <source> <destination>');
        }
        const result = copyReachableCodeStudio(source, destination);
        console.log(`Code Studio: ${result.sourceFiles}件中${result.copiedFiles}件を公開対象へコピーしました`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
