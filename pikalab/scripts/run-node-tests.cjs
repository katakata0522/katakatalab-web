const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SKIPPED_DIRECTORIES = new Set([
    'node_modules',
    'dist',
    'visual-guard-artifacts',
    '.kotoba'
]);

function discoverNodeTests(root) {
    const absoluteRoot = path.resolve(root);
    const tests = [];

    const visit = (directory) => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) continue;

            const absolutePath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                visit(absolutePath);
                continue;
            }

            if (!/\.test\.(?:js|cjs|mjs)$/.test(entry.name)) continue;
            tests.push(path.relative(absoluteRoot, absolutePath).replaceAll('\\', '/'));
        }
    };

    visit(absoluteRoot);
    return tests.sort();
}

function run() {
    const projectRoot = path.resolve(__dirname, '..');
    const tests = discoverNodeTests(projectRoot);
    if (tests.length === 0) {
        console.error('実行対象のNode標準テストが見つかりませんでした。');
        process.exitCode = 1;
        return;
    }

    const result = spawnSync(process.execPath, ['--test', ...tests], {
        cwd: projectRoot,
        stdio: 'inherit'
    });
    if (result.error) {
        console.error('Node標準テストの起動に失敗しました。', result.error);
        process.exitCode = 1;
        return;
    }
    process.exitCode = result.status ?? 1;
}

module.exports = { discoverNodeTests };

if (require.main === module) run();
