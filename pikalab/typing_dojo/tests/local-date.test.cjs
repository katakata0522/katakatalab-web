const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

test('連続記録の前日判定はUTC東西と夏時間に依存しない', () => {
    const appUrl = pathToFileURL(path.join(__dirname, '..', 'script.js')).href;
    for (const timezone of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles', 'Pacific/Honolulu']) {
        const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
            import assert from 'node:assert/strict';
            import { getYesterdayKey } from ${JSON.stringify(appUrl)};
            assert.equal(getYesterdayKey('2026-10-02'), '2026-10-01');
            assert.equal(getYesterdayKey('2026-03-09'), '2026-03-08');
            assert.equal(getYesterdayKey('2026-11-02'), '2026-11-01');
            assert.equal(getYesterdayKey('2024-03-01'), '2024-02-29');
            assert.equal(getYesterdayKey('2026-01-01'), '2025-12-31');
            assert.equal(getYesterdayKey('invalid'), '');
            assert.equal(getYesterdayKey('2026-02-30'), '');
        `], { encoding: 'utf8', env: { ...process.env, TZ: timezone } });
        assert.equal(result.status, 0, `${timezone}: ${result.stderr}`);
    }
});
