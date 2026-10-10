const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const pikalabRoot = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(pikalabRoot, relativePath), 'utf8');
}

test('countVisitedLabs: first-loginや重複をラボ訪問数へ含めない', async () => {
    const moduleUrl = pathToFileURL(path.join(pikalabRoot, 'js', 'visit-metrics.mjs'));
    moduleUrl.searchParams.set('test', Date.now().toString());
    const { countVisitedLabs } = await import(moduleUrl.href);

    assert.equal(countVisitedLabs(['first-login', 'a', 'a', 'b'], new Set(['a', 'b', 'c'])), 2);
    assert.equal(countVisitedLabs(['first-login'], new Set(['a'])), 0);
    assert.equal(countVisitedLabs(null, new Set(['a'])), 0);
});

test('プロフィールのランクは訪問したLabだけを数える', () => {
    const profile = read('js/profile.js');
    assert.match(profile, /countVisitedLabs\(userProfile\.badges,\s*_launchableAppIds\)/);
    assert.doesNotMatch(profile, /const\s+badgeCount\s*=\s*userProfile\.badges\.length/);
});

test('Labスタンプは習熟称号ではなくLab名を表示する', () => {
    const constants = read('js/constants.js');
    assert.match(constants, /name:\s*app\.appName/);
});

test('デイリー表示は起動を「クリア」ではなくチェックインとして扱う', () => {
    const apps = read('js/apps.js');
    assert.match(apps, /きょうの ラボ チェックイン/);
    assert.match(apps, /チェックイン完了！/);
    assert.doesNotMatch(apps, /クリア！おめでとう！/);
    assert.doesNotMatch(apps, /mission-clear-modal/);
    assert.doesNotMatch(apps, /openModal\(/);
});

test('記録モーダルは学習到達ではなくLab利用記録として表示する', () => {
    const profile = read('js/profile.js');
    assert.match(profile, /ラボ探索ランク/);
    assert.match(profile, /訪問・記念スタンプ/);
    assert.match(profile, /ラボ利用ダッシュボード/);
    assert.match(profile, /あつめたスタンプとラボ利用の記録だよ！/);
});
