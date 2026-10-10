import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiveViewport } from './DiveViewport';
import { eventBus } from '../core/EventBus';
import { CONFIG } from '../core/config';

const events = vi.hoisted(() => new Map<string, (data?: unknown) => void>());
vi.mock('../core/EventBus', () => ({ eventBus: {
    on: (name: string, fn: (data?: unknown) => void) => events.set(name, fn),
    emit: (name: string, data?: unknown) => events.get(name)?.(data)
} }));

function node() {
    const listeners: Record<string, () => void> = {};
    const classes = new Set<string>();
    return {
        listeners, top: 0, getBoundingClientRect() { return { top: this.top }; }, scrollTop: 0, scrollLeft: 0, clientWidth: 390,
        textContent: '', style: { width: '', transform: '' }, dataset: { depth: '1450', wide: '' },
        classList: { contains: (name: string) => classes.has(name), toggle: (name: string, active: boolean) => active ? classes.add(name) : classes.delete(name) },
        addEventListener: (name: string, fn: () => void) => { listeners[name] = fn; },
        scrollTo: vi.fn()
    };
}

describe('潜行ビューの描画責務', () => {
    let nodes: Record<string, ReturnType<typeof node>>;
    let markers: ReturnType<typeof node>[];
    let frames: FrameRequestCallback[];
    let selectors: ReturnType<typeof vi.fn>;
    let field: { updateContainerHeight: ReturnType<typeof vi.fn<() => void>> };
    let light: { updateDepth: ReturnType<typeof vi.fn<(depth: number) => void>> };
    let particles: { updateDepth: ReturnType<typeof vi.fn<(depth: number) => void>> };

    beforeEach(() => {
        events.clear();
        nodes = Object.fromEntries(['scroll-container', 'depth-val', 'depth-val-mini', 'pressure-bar', 'btn-surface', 'fog-overlay', 'depth-markers-overlay'].map(id => [id, node()]));
        markers = [node()]; frames = [];
        selectors = vi.fn(() => markers);
        vi.stubGlobal('document', { getElementById: (id: string) => nodes[id] ?? null, querySelectorAll: selectors, documentElement: node(), body: node() });
        vi.stubGlobal('window', { innerWidth: 390, addEventListener: vi.fn() });
        vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => frames.push(fn));
        field = { updateContainerHeight: vi.fn() };
        light = { updateDepth: vi.fn() };
        particles = { updateDepth: vi.fn() };
    });
    afterEach(() => vi.unstubAllGlobals());
    function start() { new DiveViewport(field, light, particles).init(); }
    function flush() { frames.splice(0).forEach(fn => fn(16)); }

    it('連続100スクロールを1描画にまとめ、最新水深・照明・目盛りをそろえる', () => {
        start();
        for (let i = 0; i < 100; i++) {
            nodes['scroll-container'].scrollTop = 3450 + i;
            nodes['scroll-container'].listeners.scroll();
        }
        expect(frames).toHaveLength(1);
        flush();
        expect(nodes['depth-val'].textContent).toBe((3099).toLocaleString());
        expect(nodes['depth-val-mini'].textContent).toBe(nodes['depth-val'].textContent);
        expect(parseFloat(nodes['pressure-bar'].style.width)).toBeCloseTo(30.99);
        expect(light.updateDepth.mock.calls).toEqual([[0], [3099]]);
        expect(particles.updateDepth.mock.calls).toEqual([[0], [3099]]);
        expect(markers[0].style.transform).toBe('translateY(-2099px)');
        expect(selectors).toHaveBeenCalledTimes(1);
        expect(nodes['fog-overlay'].classList.contains('opacity-40')).toBe(true);
    });

    it('横移動で水深更新を増やさず、浮上・最大深度の表示を維持する', () => {
        start();
        expect(nodes['scroll-container'].scrollLeft).toBe(205);
        nodes['scroll-container'].listeners.scroll(); flush();
        expect(particles.updateDepth).toHaveBeenCalledTimes(1);
        nodes['scroll-container'].scrollTop = 10450;
        nodes['scroll-container'].listeners.scroll(); flush();
        expect(nodes['pressure-bar'].style.width).toBe('100%');
        expect(nodes['btn-surface'].classList.contains('opacity-0')).toBe(false);
        nodes['btn-surface'].listeners.click();
        expect(nodes['scroll-container'].scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });


    it('ナビ下の海と固定目盛りの原点差を補正する', () => {
        nodes['scroll-container'].top = 64;
        nodes['depth-markers-overlay'].top = 12;
        start();
        expect(markers[0].style.transform).toBe('translateY(1502px)');
        nodes['scroll-container'].scrollTop = 500;
        nodes['scroll-container'].listeners.scroll(); flush();
        expect(markers[0].style.transform).toBe('translateY(1002px)');
    });

    it.each([640, 641, 799])('幅%dでも800pxの探索世界を中央から始める', width => {
        vi.stubGlobal('window', { innerWidth: width, addEventListener: vi.fn() });
        nodes['scroll-container'].clientWidth = width;
        start();
        expect(nodes['scroll-container'].scrollLeft).toBe((800 - width) / 2);
    });

    it('リセット後は交換済みの目盛りを更新する', () => {
        start();
        const old = markers[0];
        markers = [node()];
        nodes['scroll-container'].scrollTop = 500;
        eventBus.emit(CONFIG.EVENTS.FIELD_RENDERED);
        flush();
        expect(markers[0].style.transform).toBe('translateY(950px)');
        expect(old.style.transform).toBe('translateY(1450px)');
    });
});

