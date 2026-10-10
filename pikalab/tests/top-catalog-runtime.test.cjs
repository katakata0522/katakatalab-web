const test = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/homepage-runtime.cjs');
const catalog = require('../js/app-data.json');

function expected(category, term = '') {
    return catalog.apps.filter(app => !app.isAmazonCard).filter(app => {
        const matches = category === 'parents' ? app.categories.includes('parents')
            : app.id === 'focus-timer' || (!app.categories.includes('parents') && (category === 'middle' || app.categories.includes(category)));
        return matches && (!term || ['play_arrow', app.icon, app.subjectTag, app.gradeTag, app.title, app.description, app.buttonText].join(' ').toLowerCase().includes(term));
    }).map(app => app.id);
}

test('全カテゴリと日本語・英語・空検索で元の公開候補と順序を保つ', () => {
    const s = setup(); s.renderAppCards();
    for (const category of ['low','middle','high','parents']) {
        s.setCategory(category);
        for (const term of ['', 'ラボ', 'zzzz-no-match', 'play_arrow', '色']) {
            s.setSearchTerm(term);
            assert.deepEqual(s.visible(), expected(category, term), `${category}:${term}`);
            assert.equal(s.elements.get('search-empty').classList.contains('hidden'), s.visible().length !== 0);
        }
    }
});

test('同じ検索結果ではカード再走査・テキスト再読込・クラス再設定をしない', () => {
    const s = setup(); s.renderAppCards(); s.setCategory('middle'); s.setSearchTerm('zzzz-no-match'); s.resetCounts();
    for (let i = 0; i < 20; i++) s.setSearchTerm('zzzz-no-match');
    assert.equal(s.counts.queries, 0); assert.equal(s.counts.textReads, 0);
    // クリアボタン1回と空表示2回だけ。カード15枚への書込みは0回。
    assert.equal(s.counts.classWrites, 20 * 3);
});

test('カードを再描画してもコンテナの起動リスナーは一つで索引を置き換える', () => {
    const s = setup(); s.renderAppCards(); const original = [...s.elements.get('apps-grid').children];
    s.renderAppCards(); s.setCategory('middle');
    assert.equal(s.counts.listeners, 1);
    assert.ok(s.elements.get('apps-grid').children.every(card => !original.includes(card)));
    assert.deepEqual(s.visible(), expected('middle'));
});

test('初回の日替わりLab起動は記録を全部保存し、書き込みを一回にまとめる', () => {
    const s = setup(); const mission = s.getTodayMissionApp(); const app = mission.app;
    s.launchApp(app.url, app.appName, app.id);
    assert.equal(s.counts.writes, 1);
    const saved = JSON.parse(s.data[s.STORAGE_KEY]);
    assert.ok(saved.badges.includes(app.id)); assert.equal(saved.playCounts[app.id], 1);
    assert.equal(saved.recentApps[0].id, app.id); assert.equal(saved.lastMissionClearedDate, mission.dateStr);
    s.launchApp(app.url, app.appName, app.id);
    assert.equal(s.counts.writes, 2); assert.equal(s.userProfile.playCounts[app.id], 2);
    assert.equal(s.userProfile.recentApps.length, 1);
});

test('再起動した表示を前回のフェード終了タイマーで隠さない', () => {
    const s = setup(); const app = s.getTodayMissionApp().app;
    s.launchApp(app.url, app.appName, app.id);
    s.advance(s.TIMING.LAUNCH_DELAY + s.TIMING.OVERLAY_HIDE + 100);
    s.launchApp(app.url, app.appName, app.id); s.advance(250);
    const overlay = s.elements.get('launcher-overlay');
    assert.equal(overlay.classList.contains('hidden'), false);
    assert.equal(overlay.classList.contains('launcher-fade-out'), false);
    s.advance(s.TIMING.LAUNCH_DELAY + s.TIMING.OVERLAY_HIDE + 300);
    assert.equal(overlay.classList.contains('hidden'), true);
});

test('許可外の遷移は履歴・起動回数・スタンプを変更しない', () => {
    const s = setup(); s.launchApp('javascript:alert(1)', '拒否', 'unknown');
    assert.equal(s.counts.writes, 0); assert.equal(s.userProfile.badges.length, 0);
    assert.equal(s.userProfile.recentApps.length, 0);
});

test('有効な最近のLabが一件もない時は空表示を保つ', () => {
    const s = setup(); const list = s.element('recent-list');
    s.userProfile.recentApps = [{ id:'bad',name:'bad',url:'https://bad.invalid/' }];
    s.updateRecentUI(); assert.match(list.innerHTML, /まだありません/);
});

test('子アイコンからの委譲クリックで起動し、現在のhrefを検証する', () => {
    const s = setup(); s.renderAppCards();
    const grid = s.elements.get('apps-grid'); const card = grid.children[0];
    const app = catalog.apps.find(item => item.id === card.dataset.appId);
    const link = s.element(); link.dataset = {launchApp:app.id,appName:app.appName}; link.href = app.url;
    card.appendChild(link);
    let prevented = 0;
    const event = {target: {closest: () => link},preventDefault() { prevented++; }};
    grid.listeners.get('click')(event);
    assert.equal(s.userProfile.playCounts[app.id], 1); assert.equal(prevented, 0);
    link.href = 'javascript:alert(1)'; grid.listeners.get('click')(event);
    assert.equal(prevented, 1); assert.equal(s.userProfile.playCounts[app.id], 1);
});
