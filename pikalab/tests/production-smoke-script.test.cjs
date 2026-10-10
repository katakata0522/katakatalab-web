const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..', '..');
const scriptPath = path.join(repositoryRoot, '.github', 'scripts', 'verify_pikalab_production.py');
const pythonExecutable = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

function runPython(source) {
    return spawnSync(pythonExecutable, ['-c', source], {
        cwd: repositoryRoot,
        encoding: 'utf8'
    });
}

test('PikaLab本番スモークスクリプトは構文エラーなく読み込める', () => {
    const result = spawnSync(pythonExecutable, ['-m', 'py_compile', scriptPath], {
        cwd: repositoryRoot,
        encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('本番スモーク対象はカタログの公開Lab集合から生成される', () => {
    const catalog = JSON.parse(
        fs.readFileSync(path.join(repositoryRoot, 'pikalab', 'js', 'app-data.json'), 'utf8')
    );
    const launchableApps = catalog.apps.filter((app) => !app.isAmazonCard);
    const expectedRelativeUrls = [
        'pikalab/',
        ...launchableApps.map((app) => `pikalab/${app.url}`)
    ];
    const expectedNoindexCount = launchableApps.filter((app) => app.indexable !== true).length;

    const source = `
import runpy
namespace = runpy.run_path(${JSON.stringify(scriptPath)})
targets = namespace['load_targets']('https://katakatalab.com')
expected_relative_urls = ${JSON.stringify(expectedRelativeUrls)}
actual_relative_urls = [target.relative_url for target in targets]
assert actual_relative_urls == expected_relative_urls, (actual_relative_urls, expected_relative_urls)
assert sum(1 for target in targets if target.requires_noindex) == ${expectedNoindexCount}
assert len({target.expected_canonical for target in targets}) == len(expected_relative_urls)
`;
    const result = runPython(source);
    assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('本番HTML検証はindex可否・canonical・解析タグの逸脱を検出する', () => {
    const source = `
import runpy
namespace = runpy.run_path(${JSON.stringify(scriptPath)})
Target = namespace['Target']
verify_html = namespace['verify_html']

hidden = Target('hidden', 'pikalab/hidden/', 'https://katakatalab.com/pikalab/hidden/', True)
hidden_valid = '<html><head><title>Hidden Lab</title><meta name="robots" content="noindex, follow"><link rel="canonical" href="https://katakatalab.com/pikalab/hidden/"></head><body><h1>Hidden</h1></body></html>'
assert verify_html(hidden, hidden_valid) == []

indexed = Target('indexed', 'pikalab/indexed/', 'https://katakatalab.com/pikalab/indexed/', False)
indexed_valid = '<html><head><title>Indexed Lab</title><link rel="canonical" href="https://katakatalab.com/pikalab/indexed/"></head><body><h1>Indexed</h1></body></html>'
assert verify_html(indexed, indexed_valid) == []

hidden_invalid = hidden_valid.replace('noindex, follow', 'index, follow')
hidden_errors = verify_html(hidden, hidden_invalid)
assert any('noindex' in error for error in hidden_errors), hidden_errors

indexed_invalid = indexed_valid.replace('</head>', '<meta name="robots" content="noindex, follow"></head>').replace('</body>', '<script src="https://www.googletagmanager.com/gtag/js"></script></body>')
indexed_errors = verify_html(indexed, indexed_invalid)
assert any('noindex' in error for error in indexed_errors), indexed_errors
assert any('googletagmanager.com' in error for error in indexed_errors), indexed_errors
`;
    const result = runPython(source);
    assert.equal(result.status, 0, result.stderr || result.stdout);
});
