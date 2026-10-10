const test = require('node:test');
const assert = require('node:assert/strict');
const { createRuntime } = require('./runtime-fixture.cjs');

const savedColors = [
    { r: 255, g: 0, b: 0, name: 'あか' },
    { r: 0, g: 0, b: 255, name: 'あお' }, null, null
];
function withPalette(storage = {}) {
    return createRuntime({ storage: { color_lab_saved_colors: JSON.stringify(savedColors), ...storage } });
}
function selectBlendPair(runtime) {
    runtime.click(runtime.paletteButton(0));
    runtime.click(runtime.paletteButton(1));
}
function setSliders(runtime, rgb) {
    ['r', 'g', 'b'].forEach((channel, index) => runtime.input(`slider-${channel}`, rgb[index]));
}
function currentRgb(runtime) { return ['r', 'g', 'b'].map(channel => Number(runtime.byId(`slider-${channel}`).value)); }
function start(runtime, mode) { runtime.click('tab-game'); runtime.click(`start-${mode}-game`); }
function answerExactly(runtime) {
    const rgb = runtime.byId('game-target-rgb').textContent.match(/\d+/g);
    ['r', 'g', 'b'].forEach((channel, index) => runtime.input(`game-${channel}`, rgb[index]));
    runtime.click('check-btn');
}
function finishNormal(runtime) {
    start(runtime, 'normal');
    for (let round = 0; round < 10; round++) { answerExactly(runtime); runtime.click('next-level-btn'); }
}

test('パレットの保存・選択・削除はスロットとキーボードフォーカスを維持する', () => {
    const h = createRuntime();
    const slot = h.slots()[0];
    const use = h.paletteButton(0);
    h.click(use);
    assert.equal(h.slots()[0], slot, '保存時にスロットを作り直さない');
    assert.equal(h.paletteButton(0), use);
    assert.equal(h.document.activeElement, use);
    h.click(use);
    assert.equal(h.document.activeElement, use);
    assert.equal(use.getAttribute('aria-pressed'), 'true');
    const remove = slot.querySelector('.palette-delete-btn');
    assert.equal(remove.closest('button').parentNode.closest('button'), null, 'ボタンを入れ子にしない');
    h.click(remove);
    assert.equal(h.slots()[0], slot);
    assert.equal(h.document.activeElement, use, '削除後は同じスロットの保存ボタンへ戻す');
    assert.equal(h.state.lab.savedColors[0], null);
});

test('ブレンドの実クリックは親へ伝播しても取消されず、連打で予約と回数が重複しない', () => {
    const h = withPalette();
    selectBlendPair(h);
    h.click('blend-colors-btn');
    assert.equal(h.pendingTimers(1200), 1, 'クリックのバブリングで新しい予約を消さない');
    for (let repeat = 0; repeat < 9; repeat++) h.dispatch('blend-colors-btn', 'click');
    assert.equal(h.pendingTimers(1200), 1);
    assert.equal(h.storage.get('color_lab_blend_count'), '1');
    h.advance(1200);
    assert.deepEqual(currentRgb(h), [128, 0, 128]);
    assert.equal(h.state.lab.selectedSlots.length, 0);
    assert.equal(h.pendingTimers(1200), 0);
});

for (const interruption of ['slider', 'recipe', 'delete', 'tab', 'drag']) {
    test(`ブレンド待機中の${interruption}操作は古い色の予約を取り消す`, () => {
        const h = withPalette();
        selectBlendPair(h);
        h.click('blend-colors-btn');
        if (interruption === 'slider') setSliders(h, [0, 255, 0]);
        if (interruption === 'recipe') h.click(h.byId('recipe-list-container').children[0]);
        if (interruption === 'delete') h.click(h.slots()[0].querySelector('.palette-delete-btn'));
        if (interruption === 'tab') h.click('tab-game');
        if (interruption === 'drag') h.dispatch(h.slots()[0], 'dragstart', { dataTransfer: {} });
        const rgb = currentRgb(h);
        assert.equal(h.pendingTimers(1200), 0);
        assert.ok(!h.byId('blob-character').classList.contains('character-mixer-spin'));
        h.advance(2000);
        assert.deepEqual(currentRgb(h), rgb);
    });
}

test('ブレンド完了後はポップ演出を解除し、元のキャラクターアニメーションへ戻す', () => {
    const h = withPalette();
    selectBlendPair(h);
    h.click('blend-colors-btn');
    h.advance(2000);
    const character = h.byId('blob-character');
    assert.ok(!character.classList.contains('character-pop-burst'));
    assert.ok(!character.classList.contains('character-mixer-spin'));
    assert.ok(character.classList.contains('animate-blob'));
});

test('ふつうコース完了は完了状態になり、キラ粒子を停止・除去する', () => {
    const h = createRuntime();
    start(h, 'normal');
    h.advance(300);
    assert.ok(h.byId('game-target-shine-wrapper').querySelectorAll('.shiny-particle').length > 0);
    for (let round = 0; round < 10; round++) { answerExactly(h); h.click('next-level-btn'); }
    assert.equal(h.state.game.state, 'complete');
    assert.equal(h.state.game.progress.completed, true);
    assert.equal(h.pendingTimers(300), 0);
    assert.equal(h.byId('game-target-shine-wrapper').querySelectorAll('.shiny-particle').length, 0);
    h.setHidden(true); h.setHidden(false);
    assert.equal(h.pendingTimers(300), 0, '完了画面では表示復帰しても粒子を再開しない');
});

test('タイムアップ時はカウントダウンとキラ粒子を停止する', () => {
    const h = createRuntime();
    start(h, 'timeattack');
    h.advance(30000);
    assert.equal(h.state.game.state, 'complete');
    assert.equal(h.state.game.timeLeft, 0);
    assert.equal(h.pendingTimers(1000), 0);
    assert.equal(h.pendingTimers(300), 0);
    assert.equal(h.byId('game-target-shine-wrapper').querySelectorAll('.shiny-particle').length, 0);
});

test('矢印キーでラボへ移った場合もクリック同様にゲームとタイマーを終了する', () => {
    const h = createRuntime();
    start(h, 'timeattack');
    h.dispatch('tab-game', 'keydown', { key: 'ArrowLeft' });
    assert.equal(h.state.game.state, 'menu');
    assert.equal(h.pendingTimers(1000), 0);
    assert.equal(h.pendingTimers(300), 0);
    assert.equal(h.document.activeElement, h.byId('tab-lab'));
});

for (const damaged of ['null', '{}', '42', '"garbage"', '{bad JSON']) {
    test(`スタンプ保存値${damaged}でもカレンダーを開け、誤解放せず、次のスタンプを保存できる`, () => {
        const h = createRuntime({ storage: { color_lab_daily_stamps: damaged } });
        h.click('tab-game');
        assert.doesNotThrow(() => h.click('open-calendar-btn'));
        assert.equal(h.byId('calendar-modal').getAttribute('aria-hidden'), 'false');
        assert.notEqual(h.storage.get('color_lab_unlocked_star-glasses'), 'true');
        h.click('close-calendar-btn');
        start(h, 'timeattack');
        h.advance(30000);
        const stamps = JSON.parse(h.storage.get('color_lab_daily_stamps'));
        assert.ok(Array.isArray(stamps));
        assert.equal(stamps.length, 1);
        assert.match(stamps[0], /^\d{4}-\d{2}-\d{2}$/);
    });
}

test('重複・日付以外のスタンプをアクセサリー解放数へ数えない', () => {
    const h = createRuntime({ storage: { color_lab_daily_stamps: '["2026-10-01","2026-10-01",null,{},"invalid"]' } });
    h.click('open-dressup-btn');
    assert.notEqual(h.storage.get('color_lab_unlocked_star-glasses'), 'true');
    assert.ok(h.byId('dressup-modal').querySelector('[data-item="star-glasses"]').classList.contains('locked'));
});

test('壊れた保存回数・ハイスコアを正常な記録で回復する', () => {
    const h = createRuntime({ storage: {
        color_lab_save_count: 'not-a-count', color_lab_best_normal: 'bad', color_lab_best_timeattack: 'NaN'
    } });
    h.click(h.paletteButton(0));
    assert.equal(h.storage.get('color_lab_save_count'), '1');
    finishNormal(h);
    assert.equal(h.storage.get('color_lab_best_normal'), '1000');
    h.click('exit-game-from-complete');
    h.click('start-timeattack-game');
    answerExactly(h);
    h.advance(40000);
    assert.equal(h.storage.get('color_lab_best_timeattack'), '1');
});

test('レシピ固有名はコード形式の切替だけでは変わらず、スライダー変更時に再判定する', () => {
    const h = createRuntime();
    h.click('recipe-tab-fantasy');
    h.click(h.byId('recipe-list-container').children[0]);
    const name = h.byId('color-name-display').textContent;
    for (let format = 0; format < 3; format++) { h.click('hex-code'); assert.equal(h.byId('color-name-display').textContent, name); }
    setSliders(h, [255, 0, 0]);
    assert.equal(h.byId('color-name-display').textContent, 'あか');
});

test('白から黒へ直接変えても強制サングラスを外し、保存済みの装備を復元する', () => {
    const h = createRuntime({ storage: { color_lab_equipped_item: 'hat' } });
    h.click(h.byId('recipe-list-container').children[0]);
    assert.ok(!h.byId('svg-sunglasses').classList.contains('hidden'));
    h.click('complementary-color-btn');
    assert.deepEqual(currentRgb(h), [0, 0, 0]);
    assert.ok(h.byId('svg-sunglasses').classList.contains('hidden'));
    assert.ok(!h.byId('svg-hat').classList.contains('hidden'));
});

test('100回のパレット選択でDOMノードやドラッグリスナーを追加しない', () => {
    const h = withPalette();
    const before = { ...h.counters };
    for (let repeat = 0; repeat < 100; repeat++) h.click(h.paletteButton(0));
    assert.equal(h.counters.elementsCreated - before.elementsCreated, 0);
    assert.equal(h.counters.listenersAdded - before.listenersAdded, 0);
});

test('100回のスライダー入力で固定要素のID探索を繰り返さない', () => {
    const h = createRuntime();
    const slider = h.byId('slider-r');
    const before = h.counters.idLookups;
    for (let value = 0; value < 100; value++) {
        slider.value = String(value);
        h.dispatch(slider, 'input');
    }
    // 時刻を進めないため、しずく生成1回に必要な2要素の探索だけを許容する。
    assert.ok(h.counters.idLookups - before <= 2);
});

test('続けてブレンドしても前回のポップ終了タイマーが新しい回転を止めない', () => {
    const h = withPalette();
    selectBlendPair(h);
    h.click('blend-colors-btn');
    h.advance(1200);
    selectBlendPair(h);
    h.click('blend-colors-btn');
    h.advance(600);
    assert.equal(h.pendingTimers(1200), 1);
    assert.ok(h.byId('blob-character').classList.contains('character-mixer-spin'));
    h.advance(1300);
    assert.ok(!h.byId('blob-character').classList.contains('character-mixer-spin'));
    assert.ok(h.byId('blob-character').classList.contains('animate-blob'));
});

test('タイムアタックを長く続けても現在のお題だけを保持し、回答数と得点は維持する', () => {
    const h = createRuntime();
    start(h, 'timeattack');
    for (let round = 0; round < 30; round++) { answerExactly(h); h.click('next-level-btn'); }
    assert.equal(h.state.game.questionsSolved, 30);
    assert.equal(h.state.game.score, 3000);
    assert.equal(h.state.game.currentLevelIndex, 30);
    assert.ok(h.state.game.levels.length <= 1);
    assert.equal(h.pendingTimers(1000), 1);
    assert.equal(h.pendingTimers(300), 1);
});

test('キャラクター自身のjelly終了だけで一時反応クラスを解除する', () => {
    const h = createRuntime();
    const character = h.byId('blob-character');
    const eye = character.querySelector('.face-part');
    for (let repeat = 0; repeat < 3; repeat++) {
        h.click(h.byId('recipe-list-container').children[0]);
        assert.ok(character.classList.contains('animate-jelly'));
        h.dispatch(eye, 'animationend', { animationName: 'jelly' });
        assert.ok(character.classList.contains('animate-jelly'), '子要素から伝播するイベントを無視する');
        h.dispatch(character, 'animationend', { animationName: 'pop-burst' });
        assert.ok(character.classList.contains('animate-jelly'), '異なる演出の終了を無視する');
        h.dispatch(character, 'animationend', { animationName: 'jelly' });
        assert.ok(!character.classList.contains('animate-jelly'));
        assert.ok(character.classList.contains('animate-blob'));
    }
});

test('動きを減らす設定では終了イベントの発火しないjellyクラスを残さない', () => {
    const h = createRuntime({ reducedMotion: true });
    h.click(h.byId('recipe-list-container').children[0]);
    assert.ok(!h.byId('blob-character').classList.contains('animate-jelly'));
});

test('存在しない年月日はスタンプ数に含めず、正しい閏日は利用できる', () => {
    const h = createRuntime({ storage: { color_lab_daily_stamps: '["2026-02-31","2026-13-01","2025-02-29","2024-02-29"]' } });
    h.click('open-dressup-btn');
    assert.notEqual(h.storage.get('color_lab_unlocked_star-glasses'), 'true');
    assert.ok(h.byId('dressup-modal').querySelector('[data-item="star-glasses"]').classList.contains('locked'));
    h.click('close-dressup-btn');
    h.storage.set('color_lab_daily_stamps', '["2024-02-29","2026-10-01"]');
    h.click('open-dressup-btn');
    assert.equal(h.storage.get('color_lab_unlocked_star-glasses'), 'true');
    assert.ok(!h.byId('dressup-modal').querySelector('[data-item="star-glasses"]').classList.contains('locked'));
});

test('保存拒否時もページ内パレットは利用でき、保存成功の代わりに警告を表示する', () => {
    const h = createRuntime({ storageReadBlocked: true, storageWriteBlocked: true });
    assert.doesNotThrow(() => h.click(h.paletteButton(0)));
    assert.ok(h.state.lab.savedColors[0]);
    assert.equal(h.storage.has('color_lab_saved_colors'), false);
    assert.equal(h.byId('toast-container').querySelectorAll('.toast-warning').length, 1);
    assert.equal(h.byId('toast-container').querySelectorAll('.toast-success').length, 0);
    setSliders(h, [255, 0, 0]);
    h.click(h.paletteButton(0));
    assert.deepEqual(currentRgb(h), [128, 128, 128]);
    h.click('tab-game');
    assert.doesNotThrow(() => h.click('open-calendar-btn'));
    assert.equal(h.byId('calendar-modal').getAttribute('aria-hidden'), 'false');
});


test('削除ボタンの非表示でブラウザが即座にフォーカスを外しても保存ボタンへ戻す', () => {
    const h = withPalette();
    const remove = h.slots()[0].querySelector('.palette-delete-btn');
    let hidden = false;
    Object.defineProperty(remove, 'hidden', {
        get() { return hidden; },
        set(value) {
            hidden = value;
            if (value && h.document.activeElement === remove) h.document.activeElement = h.document.body;
        }
    });
    h.click(remove);
    assert.equal(h.document.activeElement, h.paletteButton(0));
});


test('無制限タイムアタックに10問上限を表示せず、通常コースでは復元する', () => {
    const h = createRuntime();
    start(h, 'timeattack');
    assert.equal(h.byId('game-level-total').hidden, true);
    h.click('exit-game-btn');
    h.click('start-normal-game');
    assert.equal(h.byId('game-level-total').hidden, false);
    h.click('exit-game-btn');
    h.click('start-challenge-game');
    assert.equal(h.byId('game-level-total').hidden, false);
});
