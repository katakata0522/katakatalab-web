const test = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/homepage-runtime.cjs');

test('旧保存データは書込み拒否でも読み込めて、移行元を消さない', () => {
    let s; const removed = [];
    const storage = { getItem: key => key === s.STORAGE_KEY_LEGACY ? JSON.stringify({name:'旧プロフィール',badges:['color-lab']}) : null,
        setItem() { throw new Error('QuotaExceededError'); }, removeItem: key => removed.push(key) };
    s = setup({ storage });
    assert.equal(s.loadProfile(), true); assert.equal(s.userProfile.name, '旧プロフィール');
    assert.deepEqual(removed, []);
});

test('旧キー削除失敗でも移行済みの新データとプロフィールを失わない', () => {
    let s; const data = {};
    s = setup({ storage: { getItem: key => data[key] ?? null, setItem: (key,value) => data[key] = value,
        removeItem() { throw new Error('SecurityError'); } } });
    data[s.STORAGE_KEY_LEGACY] = JSON.stringify({name:'移行元',loginCount:3});
    assert.equal(s.loadProfile(), true); assert.equal(s.userProfile.loginCount, 3);
    assert.equal(JSON.parse(data[s.STORAGE_KEY]).name, '移行元');
    assert.ok(data[s.STORAGE_KEY_LEGACY]);
});

test('現行プロフィールを優先し、不要な旧キー読込をしない', () => {
    let s; const reads = [];
    s = setup({ storage: { getItem(key) { reads.push(key); if (key === s.STORAGE_KEY_LEGACY) throw Error('denied'); return '{"name":"現行"}'; }, setItem() {} } });
    assert.equal(s.loadProfile(), true); assert.equal(s.userProfile.name, '現行');
    assert.deepEqual(reads, [s.STORAGE_KEY]);
});

test('保存領域の読込拒否では削除せず、不正JSONのみ除去する', () => {
    const removed = [];
    const denied = setup({ storage: { getItem() { throw Error('denied'); }, removeItem: key => removed.push(key) } });
    assert.equal(denied.loadProfile(), false); assert.deepEqual(removed, []);
    const corrupt = setup(); corrupt.data[corrupt.STORAGE_KEY] = '{';
    assert.equal(corrupt.loadProfile(), false); assert.equal(corrupt.data[corrupt.STORAGE_KEY], undefined);
});

test('初期値の配列・辞書は復元間で共有せず、非有限数を採用しない', () => {
    const s = setup(); s.userProfile.badges.push('color-lab'); s.userProfile.playCounts['color-lab'] = 10;
    const next = s.normalizeProfileData(null);
    assert.equal(next.badges.length, 0); assert.equal(Object.keys(next.playCounts).length, 0);
    const bad = s.normalizeProfileData(JSON.parse('{"volumeDb":1e309,"playCounts":{"color-lab":1e309}}'));
    assert.equal(bad.volumeDb, -20); assert.equal(bad.playCounts['color-lab'], 0);
});

test('同期・入れ子の保存をまとめ、次の通常保存は延期しない', () => {
    const s = setup();
    s.batchProfileUpdates(() => {
        s.userProfile.loginCount++;
        s.addBadge('first-login');
        s.batchProfileUpdates(() => s.saveProfile());
        s.saveProfile(); assert.equal(s.counts.writes, 0);
    });
    assert.equal(s.counts.writes, 1); assert.equal(JSON.parse(s.data[s.STORAGE_KEY]).loginCount, 1);
    s.saveProfile(); assert.equal(s.counts.writes, 2);
});

test('書込み拒否後もその場の起動記録が動き、次回保存を再試行する', () => {
    let attempts = 0;
    const s = setup({ storage: { getItem: () => null, setItem() { attempts++; throw Error('quota'); } } });
    const app = s.getTodayMissionApp().app;
    assert.doesNotThrow(() => s.launchApp(app.url,app.appName,app.id));
    assert.equal(attempts, 1); assert.equal(s.userProfile.playCounts[app.id], 1);
    s.launchApp(app.url,app.appName,app.id); assert.equal(attempts, 2);
});
