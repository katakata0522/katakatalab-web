const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const { discoverNodeTests } = require('../scripts/run-node-tests.cjs');

test('Node標準テストを再帰探索し、各ラボの補助テストも実行対象に含める', () => {
    const tests = discoverNodeTests(projectRoot);

    for (const expected of [
        '.code-studio/tests/scoped-hardening.test.cjs',
        'fraction_lab/tests/fraction_lab.test.cjs',
        'paper_gen/tests/paper_gen.test.cjs',
        'quest_board/tests/quest_board.test.cjs',
        'science_maker/tests/science_maker.test.cjs',
        'speed_reader/tests/speed_reader.test.cjs'
    ]) {
        assert.ok(tests.includes(expected), `テスト探索対象に含まれていません: ${expected}`);
    }

    assert.ok(!tests.some((file) => file.includes('node_modules/')));
    assert.ok(!tests.some((file) => file.endsWith('.test.ts')));
    assert.deepEqual(tests, [...tests].sort());
});


test('Node標準テスト探索はmjsも含み、TypeScriptテストは実行対象へ混ぜない', (t) => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'pikalab-test-discovery-'));
    t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));

    fs.writeFileSync(path.join(fixture, 'future.test.mjs'), 'export {};\n');
    fs.writeFileSync(path.join(fixture, 'compile-only.test.ts'), 'export {};\n');

    const tests = discoverNodeTests(fixture);
    assert.deepEqual(tests, ['future.test.mjs']);
});
