import { afterEach, expect, it, vi } from 'vitest';
import { DiveViewport } from './DiveViewport';
import { eventBus } from '../core/EventBus';
import { CONFIG } from '../core/config';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('表示深度と同じ値を初期描画・潜行で配信し、横移動では再配信しない', () => {
    const listeners: Record<string, () => void> = {};
    const container = {
        scrollTop: 450, scrollLeft: 0, clientWidth: 1200,
        getBoundingClientRect: () => ({ top: 64 }),
        addEventListener: (name: string, callback: () => void) => { listeners[name] = callback; }
    };
    const label = { textContent: '', dataset: {} };
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('document', {
        getElementById: (id: string) => id === 'scroll-container' ? container : id === 'depth-val' ? label : null,
        querySelectorAll: () => [],
        documentElement: { classList: { contains: () => false } },
        body: { classList: { contains: () => false } }
    });
    vi.stubGlobal('window', { innerWidth: 1200, addEventListener: vi.fn() });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
    // このテストでは購読登録を保持せず、深度配信そのものを検証する。
    vi.spyOn(eventBus, 'on').mockImplementation(() => {});
    const emit = vi.spyOn(eventBus, 'emit');
    const light = { updateDepth: vi.fn() };
    const particles = { updateDepth: vi.fn() };
    new DiveViewport({ updateContainerHeight: vi.fn() }, light, particles).init();
    expect(emit).toHaveBeenCalledWith(CONFIG.EVENTS.DEPTH_CHANGED, { depth: 0 });
    container.scrollTop = 5450;
    listeners.scroll(); frames.splice(0).forEach(callback => callback(16));
    expect(label.textContent).toBe((5000).toLocaleString());
    expect(emit).toHaveBeenLastCalledWith(CONFIG.EVENTS.DEPTH_CHANGED, { depth: 5000 });
    expect(light.updateDepth).toHaveBeenLastCalledWith(5000);
    expect(particles.updateDepth).toHaveBeenLastCalledWith(5000);
    container.scrollLeft = 80;
    listeners.scroll(); frames.splice(0).forEach(callback => callback(32));
    expect(emit).toHaveBeenCalledTimes(2);
});

