import { CONFIG } from '../core/config';

export class LightController {
    private scrollContainer: HTMLElement | null;
    private light: HTMLElement | null;
    private statusDot: HTMLElement | null;
    private statusText: HTMLElement | null;
    private pressureAlertEl: HTMLElement | null;

    private lastClientX: number;
    private lastClientY: number;
    private currentStatus: string | null;
    private isBlacklightMode: boolean;

    constructor() {
        this.scrollContainer = document.getElementById('scroll-container');
        this.light = document.getElementById('searchlight');
        
        this.statusDot = document.getElementById('light-status-dot');
        this.statusText = document.getElementById('light-status-text');
        this.pressureAlertEl = document.getElementById('pressure-alert-overlay');
        
        this.lastClientX = window.innerWidth / 2;
        this.lastClientY = window.innerHeight / 2;
        
        this.currentStatus = this.statusText?.textContent?.trim() || null;
        this.isBlacklightMode = false;

        this.bindEvents();
    }

    private bindEvents(): void {
        const updatePos = (clientX: number, clientY: number) => {
            this.lastClientX = clientX;
            this.lastClientY = clientY;
            if (!this.scrollContainer || !this.light) return;
            const rect = this.scrollContainer.getBoundingClientRect();
            this.light.style.setProperty('--x', `${clientX - rect.left}px`);
            this.light.style.setProperty('--y', `${clientY - rect.top}px`);
        };

        document.addEventListener('mousemove', (e: MouseEvent) => updatePos(e.clientX, e.clientY));
        document.addEventListener('touchmove', (e: TouchEvent) => {
            if (e.touches.length > 0) updatePos(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        document.addEventListener('touchstart', (e: TouchEvent) => {
            if (e.touches.length > 0) updatePos(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });

    }

    // 水深・HUDの更新はDiveViewportの同じフレームで一度だけ行う。
    updateDepth(depth: number): void {
        if (!this.light || !this.scrollContainer) return;
        const maxDepth = CONFIG.LIGHT.MAX_DEPTH;
        const rect = this.scrollContainer.getBoundingClientRect();
        this.light.style.setProperty('--x', `${this.lastClientX - rect.left}px`);
        this.light.style.setProperty('--y', `${this.lastClientY - rect.top}px`);

        let darkness = 0;
        let lightIntensity = 0;
        let nextStatus = '';

        const { OFF_MAX_DEPTH, AUTO_MAX_DEPTH, ACTIVE_MAX_DEPTH, MAX_DARKNESS, MAX_INTENSITY } = CONFIG.LIGHT;

        if (depth < OFF_MAX_DEPTH) {
            darkness = 0;
            lightIntensity = 0;
            nextStatus = 'OFF';
        } else if (depth < AUTO_MAX_DEPTH) {
            const ratio = (depth - OFF_MAX_DEPTH) / (AUTO_MAX_DEPTH - OFF_MAX_DEPTH);
            darkness = ratio * MAX_DARKNESS;
            lightIntensity = (depth / ACTIVE_MAX_DEPTH) * MAX_INTENSITY;
            nextStatus = 'AUTO';
        } else if (depth < ACTIVE_MAX_DEPTH) {
            darkness = MAX_DARKNESS; 
            lightIntensity = (depth / ACTIVE_MAX_DEPTH) * MAX_INTENSITY;
            nextStatus = 'ACTIVE';
        } else {
            const overflowRatio = (depth - ACTIVE_MAX_DEPTH) / (maxDepth - ACTIVE_MAX_DEPTH);
            darkness = MAX_DARKNESS - (overflowRatio * MAX_DARKNESS);
            lightIntensity = MAX_INTENSITY - (overflowRatio * MAX_INTENSITY);
            nextStatus = 'WARN';
        }

        this.light.style.setProperty('--darkness', Math.max(0, Math.min(MAX_DARKNESS, darkness)).toString());
        this.light.style.setProperty('--light-intensity', Math.max(0, Math.min(MAX_INTENSITY, lightIntensity)).toString());

        if (this.currentStatus !== nextStatus) {
            this.updateStatusUI(nextStatus);
            this.currentStatus = nextStatus;
        }
    }

    private updateStatusUI(status: string): void {
        if (!this.statusDot || !this.statusText) return;

        // 高水圧の緊急危険アラート明滅の切り替え
        if (this.pressureAlertEl) {
            if (status === 'WARN') {
                this.pressureAlertEl.classList.add('pressure-danger-active');
            } else {
                this.pressureAlertEl.classList.remove('pressure-danger-active');
            }
        }

        switch (status) {
            case 'OFF':
                this.statusDot.className = "w-2 h-2 rounded-full bg-gray-600 transition-colors";
                this.statusText.textContent = "OFF";
                this.statusText.className = "text-xs font-mono text-gray-500";
                break;
            case 'AUTO':
                this.statusDot.className = "w-2 h-2 rounded-full bg-yellow-600 transition-colors animate-pulse";
                this.statusText.textContent = "AUTO";
                this.statusText.className = "text-xs font-mono text-yellow-600";
                break;
            case 'ACTIVE':
                this.statusDot.className = "w-2 h-2 rounded-full bg-green-500 transition-colors shadow-[0_0_5px_#0f0]";
                this.statusText.textContent = "ACTIVE";
                this.statusText.className = "text-xs font-mono text-green-500 font-bold";
                break;
            case 'WARN':
                this.statusDot.className = "w-2 h-2 rounded-full bg-red-500 transition-colors animate-ping";
                this.statusText.textContent = "WARN";
                this.statusText.className = "text-xs font-mono text-red-500 font-bold";
                break;
        }
    }

    setBlacklightMode(active: boolean): void {
        this.isBlacklightMode = active;
        if (this.light) {
            if (active) {
                this.light.classList.add('blacklight');
                document.body.classList.add('blacklight-active');
            } else {
                this.light.classList.remove('blacklight');
                document.body.classList.remove('blacklight-active');
            }
        }
    }
}
