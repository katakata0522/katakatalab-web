import { CONFIG } from '../core/config';
import { eventBus } from '../core/EventBus';
import { depthFromScrollTop } from '../utils/depth';
import type { FieldRenderer } from './FieldRenderer';
import type { LightController } from './LightController';
import type { MarineSnow } from '../particles';

/** 水深表示・照明・目盛りを同じスクロール状態から一度だけ描画する。 */
export class DiveViewport {
    private container = document.getElementById('scroll-container');
    private depth = document.getElementById('depth-val');
    private miniDepth = document.getElementById('depth-val-mini');
    private pressure = document.getElementById('pressure-bar');
    private surface = document.getElementById('btn-surface');
    private fog = document.getElementById('fog-overlay');
    private markerOrigin = 0;
    private markerOverlay = document.getElementById('depth-markers-overlay');
    private markers: Array<{ element: HTMLElement; offset: number }> = [];
    private frame: number | null = null;
    private lastDepth: number | null = null;

    constructor(
        private field: Pick<FieldRenderer, 'updateContainerHeight'>,
        private light: Pick<LightController, 'updateDepth'>,
        private particles: Pick<MarineSnow, 'updateDepth'>
    ) {}

    init(): void {
        if (!this.container) return;
        this.refreshMarkers();
        this.surface?.addEventListener('click', () => {
            this.container?.scrollTo({ top: 0, behavior: 'smooth' });
        });
        this.container.addEventListener('scroll', () => this.requestRender(), { passive: true });
        eventBus.on(CONFIG.EVENTS.FIELD_RENDERED, () => {
            this.refreshMarkers();
            this.requestRender();
        });
        eventBus.on(CONFIG.EVENTS.DATA_RESET, () => {
            this.centerHorizontalScroll();
            this.requestRender();
        });
        let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.field.updateContainerHeight();
                this.updateMarkerOrigin();
                this.centerHorizontalScroll();
                this.lastDepth = null;
                this.requestRender();
            }, 150);
        });
        this.render();
        this.centerHorizontalScroll();
    }

    private updateMarkerOrigin(): void {
        // 固定オーバーレイと、ナビの下にある海の座標原点をそろえる。
        this.markerOrigin = (this.container?.getBoundingClientRect().top || 0) - (this.markerOverlay?.getBoundingClientRect().top || 0);
    }

    private refreshMarkers(): void {
        this.updateMarkerOrigin();
        this.markers = Array.from(document.querySelectorAll<HTMLElement>('#depth-markers-overlay .depth-marker'))
            .map(element => ({ element, offset: Number(element.dataset.depth) || 0 }));
    }

    private requestRender(): void {
        if (this.frame !== null) return;
        this.frame = requestAnimationFrame(() => {
            this.frame = null;
            this.render();
        });
    }

    private render(): void {
        if (!this.container) return;
        const scrollTop = this.container.scrollTop;
        const depth = depthFromScrollTop(scrollTop);
        this.surface?.classList.toggle('translate-y-24', scrollTop <= 500);
        this.surface?.classList.toggle('opacity-0', scrollTop <= 500);
        for (const { element, offset } of this.markers) {
            element.style.transform = `translateY(${this.markerOrigin + offset - scrollTop}px)`;
        }
        // 横方向だけの探索では水深のDOM更新やWorker通知を繰り返さない。
        if (depth === this.lastDepth) return;
        this.lastDepth = depth;
        const label = depth.toLocaleString();
        if (this.depth) {
            this.depth.textContent = label;
            this.depth.dataset.wide = String(label.length > 4);
        }
        if (this.miniDepth) this.miniDepth.textContent = label;
        if (this.pressure) this.pressure.style.width = `${Math.min(100, depth / CONFIG.SCROLL.MAX_DEPTH * 100)}%`;
        const inCurrent = depth >= 3000 && depth <= 3500;
        this.fog?.classList.toggle('opacity-0', !inCurrent);
        this.fog?.classList.toggle('opacity-40', inCurrent);
        this.light.updateDepth(depth);
        this.particles.updateDepth(depth);
        eventBus.emit(CONFIG.EVENTS.DEPTH_CHANGED, { depth });
    }

    private centerHorizontalScroll(): void {
        if (!this.container) return;
        const forceMobile = document.documentElement.classList.contains('force-mobile') || document.body.classList.contains('force-mobile');
        if (window.innerWidth < 800 || forceMobile) {
            const maxScrollLeft = 800 - this.container.clientWidth;
            if (maxScrollLeft > 0) this.container.scrollLeft = maxScrollLeft / 2;
        }
    }
}

