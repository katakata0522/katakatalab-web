import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ callbacks: new Map<string, (data?: unknown) => void>() }));
vi.mock('../core/EventBus', () => ({ eventBus: { on: (name: string, fn: (data?: unknown) => void) => state.callbacks.set(name, fn), emit: vi.fn() } }));
vi.mock('../core/StorageManager', () => ({ StorageManager: class { loadQuiz() { return []; } } }));
vi.mock('../data', () => ({ markersData: [], deepSeaData: [
    { id: 'fish', type: 'creature', depth_m: 600, nightDepth_m: 300, image: 'fish.png', title: '魚' },
    { id: 'vent', type: 'vent', depth_m: 10000, image: 'vent.png', title: '海底' }
] }));
vi.mock('../utils/dom', () => ({ createDiv: () => element(), createElement: () => element(), escapeHTML: (value: string) => value }));

function element() {
    const attributes = new Map<string, string>();
    const img = { closest: () => ({ getAttribute: () => attributes.get('data-fact-id') }), classList: { add() {}, remove() {} } };
    return { innerHTML: '', style: { top: '', height: '', left: '', right: '' },
        setAttribute: (key: string, value: string) => attributes.set(key, value),
        querySelectorAll: () => [img], appendChild() {}, classList: { add() {}, remove() {} }
    };
}

let children: ReturnType<typeof element>[];
let targets: Set<unknown>;
let disconnect: ReturnType<typeof vi.fn>;
beforeEach(() => {
    children = []; targets = new Set(); state.callbacks.clear();
    const container = { ...element(), appendChild: (el: ReturnType<typeof element>) => children.push(el) };
    vi.stubGlobal('document', { getElementById: (id: string) => id === 'creatures-container' ? container : element() });
    vi.stubGlobal('window', { innerHeight: 844 });
    disconnect = vi.fn(() => targets.clear());
    vi.stubGlobal('IntersectionObserver', class {
        observe(target: unknown) { targets.add(target); }
        disconnect = disconnect;
    });
});
afterEach(() => vi.unstubAllGlobals());

it('全体再描画を繰り返しても取り外した画像を監視し続けない', async () => {
    const { FieldRenderer } = await import('./FieldRenderer');
    const renderer = new FieldRenderer('creatures-container');
    for (let index = 0; index < 20; index++) renderer.render();
    expect(targets.size).toBe(2);
    expect(disconnect).toHaveBeenCalledTimes(20);
});

it('昼夜の位置変更は描画ルートへ適用し、海底の内側に二重の深度を足さない', async () => {
    const { FieldRenderer } = await import('./FieldRenderer');
    const renderer = new FieldRenderer('creatures-container');
    renderer.render();
    renderer.setTimeMode(true);
    expect(children[0].style.top).toBe('750px');
    expect(children[1].style.top).toBe('10450px');
    renderer.setTimeMode(false);
    expect(children[0].style.top).toBe('1050px');
    expect(children[1].style.top).toBe('10450px');
});
