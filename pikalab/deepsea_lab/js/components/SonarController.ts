import { AudioController } from './AudioController';
import { CONFIG } from '../core/config';

export class SonarController {
    private container: HTMLElement;
    private audioCtrl: AudioController;
    private isCooldown = false;
    private detectionTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();

    constructor(audioCtrl: AudioController) {
        this.container = document.getElementById('scroll-container') || document.body;
        this.audioCtrl = audioCtrl;
        this.bindEvents();
    }

    private bindEvents(): void {
        this.container.addEventListener('click', (e: MouseEvent) => {
            // UI上のクリック（モーダル等）は無視する
            const target = e.target as HTMLElement;
            if (target.closest('button, a, input, select, textarea, [data-fact-id], [data-ignore-sonar]')) {
                return;
            }
            this.emitSonar(e.clientX, e.clientY);
        });
    }

    private emitSonar(x: number, y: number): void {
        const field = document.getElementById('deep-sea-content');
        if (this.isCooldown || !field) return;
        this.isCooldown = true;
        setTimeout(() => this.isCooldown = false, CONFIG.SONAR.COOLDOWN_MS); 

        // 音を鳴らす
        this.audioCtrl.playSonar();

        // 波紋の描画
        const wave = document.createElement('div');
        wave.className = 'absolute rounded-full border-2 border-green-400 opacity-80 animate-sonar-wave pointer-events-none z-40';
        
        // フィールドの原点はヘッダーより下。横探索のスクロール量も含める。
        const bounds = this.container.getBoundingClientRect();
        const absX = x - bounds.left + this.container.scrollLeft;
        const absY = y - bounds.top + this.container.scrollTop;
        wave.style.left = `${absX}px`;
        wave.style.top = `${absY}px`;
        // 初期サイズと変位（CSSアニメーションで拡縮させるため初期化用）
        wave.style.width = '0px';
        wave.style.height = '0px';
        wave.style.transform = 'translate(-50%, -50%)';

        field.appendChild(wave);

        // 波紋が広がる範囲内の生物を検知する
        this.detectCreatures(y);

        setTimeout(() => {
            wave.remove();
        }, CONFIG.SONAR.WAVE_DURATION_MS); 
    }

    private detectCreatures(sonarCenterY: number): void {
        // 図鑑やUIを含めず、フィールドに存在する生物・ランドマークを検出する。
        const items = document.getElementById('deep-sea-content')?.querySelectorAll<HTMLElement>('[data-fact-id]');
        if (!items) return;
        const detectionRadius = window.innerHeight * CONFIG.SONAR.DETECTION_RADIUS_VH; 

        items.forEach(item => {
            // 祖先にロックがある参加者も、探知エフェクトで露出させない。
            if (item.closest('.creature-locked')) return;
            const rect = item.getBoundingClientRect();
            const distance = Math.abs(rect.top + rect.height / 2 - sonarCenterY);
            
            if (distance < detectionRadius) {
                // 発見エフェクトを適用
                item.classList.add('sonar-detected');
                const previousTimer = this.detectionTimers.get(item);
                if (previousTimer !== undefined) clearTimeout(previousTimer);
                this.detectionTimers.set(item, setTimeout(() => {
                    item.classList.remove('sonar-detected');
                    this.detectionTimers.delete(item);
                }, CONFIG.SONAR.WAVE_DURATION_MS));
            }
        });
    }
}
