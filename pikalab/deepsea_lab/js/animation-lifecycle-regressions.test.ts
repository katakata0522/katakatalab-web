import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDomFixture } from './test-support/dom-fixture';

const playback = vi.hoisted(() => ({ paused: false, pauses: 0, plays: 0, suspended: false }));
vi.mock('./depth-consistency', () => ({}));
vi.mock('./content-evolution', () => ({}));
vi.mock('../../js/audio.js', () => ({ playSound: vi.fn() }));
vi.mock('./components/AlbumManager', () => ({ AlbumManager: class { init() {} } }));
vi.mock('./components/FieldRenderer', () => ({ FieldRenderer: class { render() {} updateContainerHeight() {} setTimeMode() {} } }));
vi.mock('./components/LightController', () => ({ LightController: class { updateDepth() {} } }));
vi.mock('./components/AudioController', () => ({ AudioController: class {
    suspend() { playback.suspended = true; } resume() { playback.suspended = false; }
} }));
vi.mock('./components/SonarController', () => ({ SonarController: class {} }));
vi.mock('./components/RadarManager', () => ({ RadarManager: class { init() {} } }));
vi.mock('./particles', () => ({ MarineSnow: class {
    updateDepth() {} pause() { playback.paused = true; playback.pauses++; } play() { playback.paused = false; playback.plays++; }
} }));

let dom: ReturnType<typeof createDomFixture>;
let mutationCallbacks: Array<() => void>;
beforeEach(() => {
    vi.resetModules(); dom = createDomFixture(); mutationCallbacks = [];
    Object.assign(playback, { paused: false, pauses: 0, plays: 0, suspended: false });
    vi.stubGlobal('document', dom.doc); vi.stubGlobal('window', dom.win);
    vi.stubGlobal('MutationObserver', class { constructor(callback: () => void) { mutationCallbacks.push(callback); } observe() {} disconnect() {} });
});
afterEach(() => vi.unstubAllGlobals());

async function start() { const { eventBus } = await import('./core/EventBus'); await import('./app'); return eventBus; }

describe('実際のアプリ初期化経由の描画休止状態', () => {
    it('装飾用modal-layerが残っていても詳細を閉じると再開する', async () => {
        const bus = await start();
        dom.ids.get('sea-modal')!.classList.remove('hidden'); bus.emit('modal_opened', 'sea-modal');
        expect(playback.paused).toBe(true);
        dom.ids.get('sea-modal')!.classList.add('hidden'); bus.emit('modal_closed', 'sea-modal');
        console.log('MODAL_PARTICLE_COUNTER', JSON.stringify({ permanentModalLayerElements: dom.doc.querySelectorAll('.modal-layer:not(.hidden)').length, ...playback }));
        expect(playback.paused).toBe(false);
    });
    it('タブを戻すと描画と音声を再開する', async () => {
        await start(); dom.doc.hidden = true; dom.fire('visibilitychange');
        expect(playback.paused).toBe(true); expect(playback.suspended).toBe(true);
        dom.doc.hidden = false; dom.fire('visibilitychange');
        expect(playback.paused).toBe(false); expect(playback.suspended).toBe(false);
    });
    it('非表示タブでモーダルを閉じても再開しない', async () => {
        const bus = await start(); dom.doc.hidden = true; dom.fire('visibilitychange');
        bus.emit('modal_closed', 'sea-modal'); expect(playback.paused).toBe(true);
    });
    it('別モーダルが残る間は描画を再開しない', async () => {
        const bus = await start(); dom.ids.get('album-modal')!.classList.remove('hidden');
        bus.emit('modal_opened', 'album-modal'); bus.emit('modal_closed', 'sea-modal');
        expect(playback.paused).toBe(true);
    });
    it('非表示で初期化されたタブも最初から停止する', async () => {
        dom.doc.hidden = true; await start(); expect(playback.paused).toBe(true); expect(playback.suspended).toBe(true);
    });
    it('保護者ダイアログのopen属性に描画を同期する', async () => {
        const parents = dom.make('parents-modal', 'DIALOG'); await start();
        parents.setAttribute('open', ''); mutationCallbacks.forEach(callback => callback()); expect(playback.paused).toBe(true);
        parents.removeAttribute('open'); mutationCallbacks.forEach(callback => callback()); expect(playback.paused).toBe(false);
    });
});
