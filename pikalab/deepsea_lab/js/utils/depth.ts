import { CONFIG } from '../core/config';

// 海面までの導入領域を除き、各HUDと照明が同じ水深を使う。
export function depthFromScrollTop(scrollTop: number): number {
    return Math.max(0, Math.min(CONFIG.SCROLL.MAX_DEPTH, Math.floor(scrollTop - CONFIG.SCROLL.SURFACE_OFFSET)));
}
