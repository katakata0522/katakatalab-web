import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlbumManager } from './components/AlbumManager';
import { RadarManager } from './components/RadarManager';
import { SonarController } from './components/SonarController';
import { eventBus } from './core/EventBus';
import { CONFIG } from './core/config';
import { deepSeaData } from './data';
import { createDomFixture, FakeElement } from './test-support/dom-fixture';

vi.mock('./audio', () => ({ playSound: vi.fn() }));
vi.mock('./core/StorageManager', () => ({ StorageManager: class { load() { return []; } loadQuiz() { return []; } save() { return true; } clear() { return true; } saveQuiz() { return true; } } }));
vi.mock('./utils/confetti', () => ({ ConfettiManager: class { fire = vi.fn(); stop = vi.fn(); } }));

let dom: ReturnType<typeof createDomFixture>;
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let now: number;
function flushFrame(time = 16) { now = time; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time)); }
beforeEach(() => {
    vi.useFakeTimers();
    (eventBus as any).listeners = {};
    dom = createDomFixture(); frames = new Map(); nextFrame = 0; now = 0;
    vi.stubGlobal('document', dom.doc); vi.stubGlobal('window', dom.win);
    vi.stubGlobal('navigator', { webdriver: false });
    vi.stubGlobal('confirm', () => true);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { const id = ++nextFrame; frames.set(id, callback); return id; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.spyOn(performance, 'now').mockImplementation(() => now);
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('モーダルの中断・繰り返し操作', () => {
    it('実際のナビと探索を inert にし、モバイルの両軸 !important ロックを元通りにする', () => {
        const album = new AlbumManager() as any;
        dom.scroll.style.setProperty('overflow-y', 'auto', 'important');
        dom.scroll.style.setProperty('overflow-x', 'scroll');
        const sea = dom.ids.get('sea-modal')!;
        album.openModal(sea);
        expect(dom.nav.hasAttribute('inert')).toBe(true);
        expect(dom.scroll.hasAttribute('inert')).toBe(true);
        expect(dom.scroll.style.getPropertyValue('overflow-y')).toBe('hidden');
        expect(dom.scroll.style.getPropertyPriority('overflow-y')).toBe('important');
        expect(dom.scroll.style.getPropertyValue('overflow-x')).toBe('hidden');
        album.closeModal(sea);
        expect(dom.nav.hasAttribute('inert')).toBe(false);
        expect(dom.scroll.style.getPropertyValue('overflow-y')).toBe('auto');
        expect(dom.scroll.style.getPropertyPriority('overflow-y')).toBe('important');
        expect(dom.scroll.style.getPropertyValue('overflow-x')).toBe('scroll');
    });
    it('50ms前に閉じたモーダルへ遅延フォーカスを戻さない', () => {
        const album = new AlbumManager() as any;
        const opener = dom.make('opener', 'BUTTON'); opener.focus();
        album.openModal(dom.ids.get('sea-modal'));
        album.closeModal(dom.ids.get('sea-modal'));
        vi.advanceTimersByTime(50);
        expect(dom.doc.activeElement).toBe(opener);
    });
    it('別モーダルが残る間は背景を解除せず、既存 inert を最後も保持する', () => {
        const album = new AlbumManager() as any;
        dom.nav.setAttribute('inert', '');
        album.openModal(dom.ids.get('sea-modal'));
        album.openModal(dom.ids.get('album-modal'));
        album.closeModal(dom.ids.get('sea-modal'));
        expect(dom.field.getAttribute('aria-hidden')).toBe('true');
        expect(dom.scroll.hasAttribute('inert')).toBe(true);
        album.closeModal(dom.ids.get('album-modal'));
        expect(dom.nav.hasAttribute('inert')).toBe(true);
        expect(dom.scroll.hasAttribute('inert')).toBe(false);
    });
    it('認定証も同じオープン通知と Escape クローズを通る', () => {
        const album = new AlbumManager() as any;
        const opened = vi.fn(); const closed = vi.fn();
        eventBus.on('modal_opened', opened); eventBus.on('modal_closed', closed);
        album.showCompletionReward();
        expect(opened).toHaveBeenCalledWith('completion-modal');
        expect(dom.scroll.hasAttribute('inert')).toBe(true);
        dom.fire('keydown', { key: 'Escape' });
        expect(dom.ids.get('completion-modal')!.classList.contains('hidden')).toBe(true);
        expect(closed).toHaveBeenCalledWith('completion-modal');
        expect(album.confetti.stop).toHaveBeenCalledOnce();
    });
    it('認定証の待機中に別モーダルを開いたら閉じるまで待つ', () => {
        const album = new AlbumManager() as any;
        album.isJustCompleted = true;
        album.openModal(dom.ids.get('sea-modal'));
        album.closeModal(dom.ids.get('sea-modal'));
        album.openModal(dom.ids.get('album-modal'));
        vi.advanceTimersByTime(500);
        expect(dom.ids.get('completion-modal')!.classList.contains('hidden')).toBe(true);
        album.closeModal(dom.ids.get('album-modal'));
        vi.advanceTimersByTime(500);
        expect(dom.ids.get('completion-modal')!.classList.contains('hidden')).toBe(false);
    });
    it('リセット時は保留中の認定証を取り消す', () => {
        const album = new AlbumManager() as any;
        album.isJustCompleted = true;
        album.openModal(dom.ids.get('sea-modal'));
        album.closeModal(dom.ids.get('sea-modal'));
        dom.ids.get('btn-reset-album')!.fire('click');
        vi.advanceTimersByTime(500);
        expect(dom.ids.get('completion-modal')!.classList.contains('hidden')).toBe(true);
    });
    it('3問正解で実在しないレア生物の出現を案内しない', () => {
        const album = new AlbumManager() as any;
        album.solvedQuizIds = new Set(['first', 'second']);
        album.currentItem = { id: 'third', quiz: { answerIndex: 0, successFact: '正解' } };
        album.showNotification = vi.fn();
        album.handleQuizAnswer(0);
        expect(album.showNotification).toHaveBeenCalledOnce();
        expect(album.showNotification.mock.calls[0][0]).not.toMatch(/黄金|あらわれ/);
    });
});

describe('レーダー予約数と状態', () => {
    function setupRadar(width = 390) {
        dom.win.innerWidth = width;
        const items = deepSeaData.flatMap(item => item.type === 'battle' ? item.participants || [] : [item]);
        const elements = items.map(item => { const el = dom.make('', 'DIV', dom.field); el.setAttribute('data-fact-id', item.id); el.offsetParent = dom.field; el.rect.top = 500; el.rect.left = 500; return el; });
        const radar = new RadarManager() as any;
        radar.updateRadar = vi.fn(); radar.init();
        elements.forEach(el => { el.layoutReads = 0; });
        const queries = vi.spyOn(dom.doc, 'querySelector'); queries.mockClear();
        return { radar, elements, queries };
    }
    it('昼夜10回連打でもフレーム予約と全件走査は1本', () => {
        const { elements, queries } = setupRadar();
        for (let i = 0; i < 10; i++) eventBus.emit(CONFIG.EVENTS.TIME_CHANGED);
        const pendingBefore = frames.size;
        flushFrame();
        const scans = queries.mock.calls.filter(([selector]) => String(selector).startsWith('[data-fact-id=')).length;
        const reads = elements.reduce((total, el) => total + el.layoutReads, 0);
        console.log('RADAR_COUNTER', JSON.stringify({ pendingBefore, pendingAfter: frames.size, itemCount: elements.length, selectorQueries: scans, layoutReads: reads }));
        expect(pendingBefore).toBe(1);
        expect(frames.size).toBe(1);
        expect(scans).toBe(elements.length);
        expect(reads).toBe(elements.length * 4);
    });
    it('非表示のデスクトップレーダーには移動ループを作らない', () => {
        const { elements, queries } = setupRadar(1280);
        for (let i = 0; i < 10; i++) eventBus.emit(CONFIG.EVENTS.TIME_CHANGED);
        flushFrame();
        console.log('RADAR_DESKTOP_COUNTER', JSON.stringify({ pending: frames.size, selectorQueries: queries.mock.calls.length, layoutReads: elements.reduce((sum, el) => sum + el.layoutReads, 0) }));
        expect(frames.size).toBe(0);
        expect(queries).not.toHaveBeenCalled();
    });
    it.each([1280, 390])('%ipxで始めた昼夜移動を途中のモバイル復帰後も最終位置まで追従する', (initialWidth) => {
        const { radar, elements } = setupRadar(initialWidth);
        const creature = elements.find(element => element.getAttribute('data-fact-id') === 'clione')!;
        creature.rect.top = 750;
        eventBus.emit(CONFIG.EVENTS.TIME_CHANGED);

        if (initialWidth < 640) {
            flushFrame(100);
            now = 200;
            dom.win.innerWidth = 1280;
            dom.win.fire('resize');
        }
        expect(frames.size).toBe(0);

        now = 500;
        creature.rect.top = 700;
        dom.win.innerWidth = 390;
        dom.win.fire('resize');
        expect(frames.size).toBe(1);

        // リサイズの遅延補正後も、生物の2秒移動はまだ終わっていない。
        now = 700;
        creature.rect.top = 680;
        vi.advanceTimersByTime(200);
        flushFrame(700);
        expect(radar.elementCache.get('clione').absTop).toBe(680);
        expect(frames.size).toBe(1);

        creature.rect.top = 550;
        flushFrame(2200);
        expect(radar.elementCache.get('clione').absTop).toBe(550);
        expect(frames.size).toBe(0);
    });
    it('リセットで移動ループ予約を取り消す', () => {
        setupRadar(); eventBus.emit(CONFIG.EVENTS.TIME_CHANGED);
        eventBus.emit(CONFIG.EVENTS.DATA_RESET);
        expect(frames.size).toBe(0);
        now = 500;
        dom.win.fire('resize');
        expect(frames.size).toBe(0);
    });
    it('最終切り替えから2.1秒後に1本のループを終える', () => {
        setupRadar(); eventBus.emit(CONFIG.EVENTS.TIME_CHANGED); flushFrame(100);
        now = 2000; eventBus.emit(CONFIG.EVENTS.TIME_CHANGED);
        flushFrame(2101); expect(frames.size).toBe(1);
        flushFrame(4101); expect(frames.size).toBe(0);
    });
    it('左右を一気にスクロールしても既存インジケーターを正しい側へ移す', () => {
        const radar = new RadarManager() as any;
        radar.showIndicator('fish', 200, 'left');
        radar.showIndicator('fish', 200, 'right');
        const indicator = radar.activeIndicators.get('fish') as FakeElement;
        expect(indicator.parentElement).toBe(dom.ids.get('radar-right-overlay'));
        expect(indicator.classList.contains('radar-right-indicator')).toBe(true);
        expect(indicator.querySelector('.radar-arrow')!.textContent).toBe('▶');
    });
});

describe('ソナーの実在フィールドと繰り返し', () => {
    function setupSonar() {
        const near = dom.make('', 'DIV', dom.field); near.setAttribute('data-fact-id', 'near'); near.rect.top = 180;
        const far = dom.make('', 'DIV', dom.field); far.setAttribute('data-fact-id', 'far'); far.rect.top = 3000;
        dom.scroll.scrollTop = 1000; dom.scroll.scrollLeft = 205;
        const audio = { playSonar: vi.fn() };
        const sonar = new SonarController(audio as any) as any;
        return { sonar, audio, near, far };
    }
    it('ヘッダーと横スクロールを含めたクリック位置に波を描き、近い生物を検出する', () => {
        const { sonar, near, far } = setupSonar(); sonar.emitSonar(100, 200);
        const waves = dom.field.querySelectorAll('.animate-sonar-wave');
        console.log('SONAR_COUNTER', JSON.stringify({ waves: waves.length, detected: [near, far].filter(el => el.classList.contains('sonar-detected')).length }));
        expect(waves).toHaveLength(1);
        expect(waves[0].style.left).toBe('305px');
        expect(waves[0].style.top).toBe('1136px');
        expect(near.classList.contains('sonar-detected')).toBe(true);
        expect(far.classList.contains('sonar-detected')).toBe(false);
        vi.advanceTimersByTime(3000); expect(dom.field.querySelectorAll('.animate-sonar-wave')).toHaveLength(0);
    });
    it('クールダウン後の再探知を古いタイマーが打ち消さない', () => {
        const { sonar, near, audio } = setupSonar(); sonar.emitSonar(100, 200);
        sonar.emitSonar(100, 200); expect(audio.playSonar).toHaveBeenCalledOnce();
        vi.advanceTimersByTime(2000); sonar.emitSonar(100, 200);
        vi.advanceTimersByTime(1000); expect(near.classList.contains('sonar-detected')).toBe(true);
        vi.advanceTimersByTime(2000); expect(near.classList.contains('sonar-detected')).toBe(false);
    });
    it('ロックされた生物とロックされた親の参加者を探知で露出しない', () => {
        const { sonar, near } = setupSonar();
        near.classList.add('creature-locked');
        const lockedGroup = dom.make('', 'DIV', dom.field); lockedGroup.classList.add('creature-locked');
        const participant = dom.make('', 'DIV', lockedGroup); participant.setAttribute('data-fact-id', 'locked-participant'); participant.rect.top = 180;
        sonar.emitSonar(100, 200);
        expect(near.classList.contains('sonar-detected')).toBe(false);
        expect(participant.classList.contains('sonar-detected')).toBe(false);
    });
    it('図鑑登録クリックは探知音と波を同時に起こさない', () => {
        const { near, audio } = setupSonar();
        dom.scroll.fire('click', { target: near, clientX: 100, clientY: 200 });
        expect(audio.playSonar).not.toHaveBeenCalled();
    });
});
