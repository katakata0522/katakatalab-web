import { afterEach, expect, it, vi } from 'vitest';
import { depthFromScrollTop } from './depth';
import { LightController } from '../components/LightController';

afterEach(() => vi.unstubAllGlobals());

it.each([[0, 0], [449, 0], [450, 0], [950, 500], [10450, 10000], [11000, 10000]])(
    'スクロール位置%iは海面オフセットを除いた水深%imになる', (scroll, depth) => {
        expect(depthFromScrollTop(scroll)).toBe(depth);
    }
);

it('照明は渡された水深だけから明るさを算出し、HUDを上書きしない', () => {
    const properties: Record<string, string> = {};
    const light = { style: { setProperty: (key: string, value: string) => { properties[key] = value; } } };
    const hud = { textContent: '500' };
    const elements: Record<string, unknown> = {
        'scroll-container': { getBoundingClientRect: () => ({ left: 0, top: 64 }) },
        searchlight: light, 'depth-val': hud
    };
    vi.stubGlobal('document', { getElementById: (id: string) => elements[id] || null, addEventListener() {} });
    vi.stubGlobal('window', { innerWidth: 390, innerHeight: 844 });
    new LightController().updateDepth(depthFromScrollTop(950));
    expect(Number(properties['--darkness'])).toBeCloseTo(0.3675);
    expect(Number(properties['--light-intensity'])).toBeCloseTo(500 / 9000 * 0.85);
    expect(hud.textContent).toBe('500');
});
