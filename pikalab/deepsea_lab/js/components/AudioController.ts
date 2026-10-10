import { eventBus } from '../core/EventBus';
import { CONFIG } from '../core/config';
import { activateAudio, getIsMuted, restoreSoundSettings, toggleMute } from '../audio';

export class AudioController {
    private ctx: AudioContext | null = null;
    private outputGain: GainNode | null = null;
    private environmentGain: GainNode | null = null;
    private filterNode: BiquadFilterNode | null = null;
    private noise: AudioBufferSourceNode | null = null;
    private depth = 0;
    private disposed = false;
    private audioButton = document.getElementById('btn-audio');
    private boundInit: (event: Event) => void;
    private boundToggle: (event: Event) => void;
    private boundUpdatePressure: (data: { depth: number }) => void;

    constructor() {
        restoreSoundSettings();
        this.boundInit = event => {
            // AUDIO自身は先にミュートを切り替え、初回の消音操作で音が漏れるのを防ぐ。
            if (event.isTrusted && !this.audioButton?.contains(event.target as Node)) this.init();
        };
        this.boundToggle = event => {
            toggleMute();
            this.syncMute();
            if (event.isTrusted) this.init();
        };
        this.boundUpdatePressure = data => this.updatePressureFilter(data.depth);

        // 子要素がstopPropagationするクリックも起動できるようキャプチャ段階で受け取る。
        document.addEventListener('click', this.boundInit, true);
        document.addEventListener('touchstart', this.boundInit, { capture: true, passive: true });
        this.audioButton?.addEventListener('click', this.boundToggle);
        eventBus.on(CONFIG.EVENTS.DEPTH_CHANGED, this.boundUpdatePressure);
        this.syncMute();
    }

    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        document.removeEventListener('click', this.boundInit, true);
        document.removeEventListener('touchstart', this.boundInit, true);
        this.audioButton?.removeEventListener('click', this.boundToggle);
        eventBus.off(CONFIG.EVENTS.DEPTH_CHANGED, this.boundUpdatePressure);
        this.noise?.stop();
        this.noise?.disconnect();
        this.filterNode?.disconnect();
        this.environmentGain?.disconnect();
        this.outputGain?.disconnect();
        this.noise = null;
        this.filterNode = null;
        this.environmentGain = null;
        this.outputGain = null;
        // 共通効果音と同じContextなので、所有していないContextは閉じない。
        this.ctx = null;
    }

    private init(): void {
        if (this.disposed || document.hidden) return;
        try {
            const { context, ready } = activateAudio();
            this.ctx = context;
            void ready.catch(error => {
                if (this.disposed) return;
                this.syncMute();
                console.warn('AudioContext initialization failed:', error);
            });
            if (!this.outputGain) this.setupEnvironmentSound();
        } catch (error) {
            console.warn('AudioContext initialization failed:', error);
        }
    }

    private syncMute(): void {
        const muted = getIsMuted();
        if (this.outputGain) this.outputGain.gain.value = muted ? 0 : 1;
        this.audioButton?.setAttribute('aria-pressed', String(muted));
        this.audioButton?.setAttribute('aria-label', muted ? '音声をオンにする' : '音声をミュートする');
    }

    private setupEnvironmentSound(): void {
        if (!this.ctx) return;
        this.outputGain = this.ctx.createGain();
        this.syncMute();
        this.outputGain.connect(this.ctx.destination);

        // ノイズとソナーを同じ消音ゲインへ接続し、再生中のソナーも即座に消音する。
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
        }
        this.noise = this.ctx.createBufferSource();
        this.noise.buffer = noiseBuffer;
        this.noise.loop = true;
        this.filterNode = this.ctx.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = this.pressureFrequency();
        this.environmentGain = this.ctx.createGain();
        this.environmentGain.gain.value = 0.05;
        this.noise.connect(this.filterNode);
        this.filterNode.connect(this.environmentGain);
        this.environmentGain.connect(this.outputGain);
        this.noise.start(0);
    }

    private pressureFrequency(): number {
        const ratio = this.depth / CONFIG.SCROLL.MAX_DEPTH;
        return CONFIG.AUDIO.LPF_MAX_FREQ - ratio * (CONFIG.AUDIO.LPF_MAX_FREQ - CONFIG.AUDIO.LPF_MIN_FREQ);
    }

    private updatePressureFilter(depth: number): void {
        if (!Number.isFinite(depth)) return;
        // 音声起動前の潜行も記録し、初回操作時から実際の水深を反映する。
        this.depth = Math.max(0, Math.min(depth, CONFIG.SCROLL.MAX_DEPTH));
        if (this.filterNode && this.ctx) {
            this.filterNode.frequency.setTargetAtTime(this.pressureFrequency(), this.ctx.currentTime, 0.5);
        }
    }

    public playSonar(): void {
        if (!this.ctx || !this.outputGain || this.disposed || document.hidden || getIsMuted()) return;
        this.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(CONFIG.AUDIO.SONAR_FREQ, this.ctx.currentTime);
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + CONFIG.AUDIO.SONAR_DURATION);
        osc.connect(gain);
        gain.connect(this.outputGain);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + CONFIG.AUDIO.SONAR_DURATION);
        osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
        };
    }

    public suspend(): void {
        if (this.ctx) this.ctx.suspend().catch(console.warn);
    }

    public resume(): void {
        if (this.ctx && !document.hidden) this.ctx.resume().catch(console.warn);
    }
}
