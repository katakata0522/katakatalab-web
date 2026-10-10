import './depth-consistency';
import './content-evolution';
import { FieldRenderer } from './components/FieldRenderer';
import { AlbumManager } from './components/AlbumManager';
import { LightController } from './components/LightController';
import { AudioController } from './components/AudioController';
import { SonarController } from './components/SonarController';
import { RadarManager } from './components/RadarManager';
import { MarineSnow } from './particles';
import { playSound } from './audio';
import { eventBus } from './core/EventBus';
import { CONFIG } from './core/config';
import { bindAnimationLifecycle } from './core/animationLifecycle';
import { DiveViewport } from './components/DiveViewport';

class DeepSeaGame {
    private albumManager: AlbumManager;
    private fieldRenderer: FieldRenderer;
    private lightController: LightController;
    private audioCtrl: AudioController;
    private sonarCtrl: SonarController;
    private radarMgr: RadarManager;
    private particles: MarineSnow;
    private isNight: boolean = false;
    private isBlacklight: boolean = false;

    constructor() {
        this.albumManager = new AlbumManager();
        this.fieldRenderer = new FieldRenderer('creatures-container');
        this.lightController = new LightController();
        this.audioCtrl = new AudioController();
        this.sonarCtrl = new SonarController(this.audioCtrl);
        this.radarMgr = new RadarManager();
        this.particles = new MarineSnow('particle-canvas');
    }

    private initGimmickButtons(): void {
        const btnTime = document.getElementById('btn-time');
        const btnLightType = document.getElementById('btn-light-type');

        const timeIcon = document.getElementById('time-icon');
        const timeLabel = document.getElementById('time-label');

        const lightTypeIcon = document.getElementById('light-type-icon');
        const lightTypeLabel = document.getElementById('light-type-label');

        if (btnTime) {
            btnTime.addEventListener('click', () => {
                playSound('click');
                this.isNight = !this.isNight;
                
                const content = document.getElementById('deep-sea-content');
                if (this.isNight) {
                    if (content) content.classList.add('night-mode');
                    if (timeIcon) {
                        timeIcon.textContent = 'dark_mode';
                        timeIcon.className = 'material-symbols-rounded text-indigo-400 text-sm';
                    }
                    if (timeLabel) timeLabel.textContent = '🌙 よる';
                } else {
                    if (content) content.classList.remove('night-mode');
                    if (timeIcon) {
                        timeIcon.textContent = 'light_mode';
                        timeIcon.className = 'material-symbols-rounded text-yellow-400 text-sm';
                    }
                    if (timeLabel) timeLabel.textContent = '☀️ ひる';
                }

                this.fieldRenderer.setTimeMode(this.isNight);
                eventBus.emit(CONFIG.EVENTS.TIME_CHANGED, this.isNight);
            });
        }

        if (btnLightType) {
            btnLightType.addEventListener('click', () => {
                playSound('click');
                this.isBlacklight = !this.isBlacklight;

                if (this.isBlacklight) {
                    if (lightTypeIcon) {
                        lightTypeIcon.textContent = 'lens_blur';
                        lightTypeIcon.className = 'material-symbols-rounded text-purple-400 text-sm animate-pulse';
                    }
                    if (lightTypeLabel) lightTypeLabel.textContent = 'いろライト（演出）';
                } else {
                    if (lightTypeIcon) {
                        lightTypeIcon.textContent = 'flashlight_on';
                        lightTypeIcon.className = 'material-symbols-rounded text-blue-400 text-sm';
                    }
                    if (lightTypeLabel) lightTypeLabel.textContent = 'ふつうライト';
                }

                this.lightController.setBlacklightMode(this.isBlacklight);
            });
        }

        // --- 📊 HUDメーターの最小化トグルのバインド 📊 ---
        const btnHudToggle = document.getElementById('btn-hud-toggle');
        const hudContainer = document.getElementById('hud-container');
        const hudToggleIcon = document.getElementById('hud-toggle-icon');

        if (btnHudToggle && hudContainer) {
            if (window.innerWidth < 640) {
                hudContainer.classList.add('hud-minimized');
                if (hudToggleIcon) hudToggleIcon.textContent = 'expand_more';
            }

            btnHudToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                playSound('click');
                hudContainer.classList.toggle('hud-minimized');
                
                if (hudToggleIcon) {
                    if (hudContainer.classList.contains('hud-minimized')) {
                        hudToggleIcon.textContent = 'expand_more';
                    } else {
                        hudToggleIcon.textContent = 'expand_less';
                    }
                }
            });
        }
    }

    init(): void {
        this.radarMgr.init();
        this.fieldRenderer.render();
        this.albumManager.init();
        new DiveViewport(this.fieldRenderer, this.lightController, this.particles).init();
        this.initGimmickButtons();

        // モーダルとタブの表示状態を一箇所から同期する。
        bindAnimationLifecycle(this.particles, this.audioCtrl);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const game = new DeepSeaGame();
        game.init();
    });
} else {
    const game = new DeepSeaGame();
    game.init();
}

