export class MarineSnow {
    private canvas: HTMLCanvasElement | null;
    private worker: Worker | null = null;
    private lastScrollY: number;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.lastScrollY = window.scrollY;
        
        if (!this.canvas) return;

        // OffscreenCanvas のサポート確認
        if ('transferControlToOffscreen' in this.canvas) {
            const offscreen = this.canvas.transferControlToOffscreen();
            
            // Vite で Web Worker を読み込む形式 (?worker)
            this.worker = new Worker(new URL('./particles.worker.ts', import.meta.url), { type: 'module' });
            
            this.worker.postMessage({
                type: 'INIT',
                payload: {
                    canvas: offscreen,
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            }, [offscreen]);
        } else {
            // OffscreenCanvas 非対応ブラウザの場合はフォールバックするべきだが、
            // 今回はエンタープライズ究極化なので非対応の場合はスキップ（またはメインスレッド実行）とする。
            console.warn('OffscreenCanvas is not supported in this browser.');
        }

        window.addEventListener('resize', () => this.resize());
        this.bindScroll();

        window.addEventListener('beforeunload', () => {
            if (this.worker) {
                this.worker.terminate();
                this.worker = null;
            }
        });
    }

    private resize(): void {
        if (this.worker) {
            this.worker.postMessage({
                type: 'RESIZE',
                payload: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            });
        }
    }

    public updateDepth(depth: number): void {
        if (this.worker) {
            this.worker.postMessage({
                type: 'UPDATE_DEPTH',
                payload: { depth }
            });
        }
    }

    public pause(): void {
        if (this.worker) {
            this.worker.postMessage({ type: 'PAUSE' });
        }
    }

    public play(): void {
        if (this.worker) {
            this.worker.postMessage({ type: 'PLAY' });
        }
    }

    private bindScroll(): void {
        const container = document.getElementById('scroll-container');
        if (!container) return;
        
        this.lastScrollY = container.scrollTop;
        
        container.addEventListener('scroll', () => {
            const currentScrollY = container.scrollTop;
            const deltaY = currentScrollY - this.lastScrollY;
            this.lastScrollY = currentScrollY;
            
            if (this.worker) {
                this.worker.postMessage({
                    type: 'SCROLL',
                    payload: { deltaY }
                });
            }
        }, { passive: true });
    }
}
