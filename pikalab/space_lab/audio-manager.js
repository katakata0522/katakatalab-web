// ============================================================
// ほしぞら・アドベンチャー - audio-manager.js
// 音声再生・BGM制御モジュール (Standalone)
// ============================================================
import { State } from './state.js';

export const AudioManager = {
    ctx: null,
    masterGain: null,
    bgmNodes: [], // BGM用のオシレーターやゲインノードの参照を保持
    _activeEffects: new Set(),
    _syncPromise: null,
    _syncRevision: 0,
    _pageVisible: true,
    _masterVolume: 0.5,

    _canPlay() {
        return !State.isMuted && this._pageVisible
            && (typeof document === 'undefined' || document.visibilityState !== 'hidden');
    },

    // 非同期の suspend/resume 中にミュートや表示状態が変わっても、最後の状態へ収束させる。
    _syncPlayback() {
        this._syncRevision += 1;
        if (!this.ctx || this.ctx.state === 'closed') return Promise.resolve(false);
        if (this.masterGain) this.masterGain.gain.value = this._canPlay() ? this._masterVolume : 0;
        if (this._syncPromise) return this._syncPromise;
        const ctx = this.ctx;
        this._syncPromise = (async () => {
            try {
                while (this.ctx === ctx && ctx.state !== 'closed') {
                    const revision = this._syncRevision;
                    const shouldPlay = this._canPlay();
                    if (this.masterGain) this.masterGain.gain.value = shouldPlay ? this._masterVolume : 0;
                    if (shouldPlay && ctx.state !== 'running') await ctx.resume();
                    else if (!shouldPlay && ctx.state === 'running') await ctx.suspend();
                    // 既に目的の状態でも一度譲り、同じ操作内の初期化→ミュートを取りこぼさない。
                    await Promise.resolve();
                    if (revision === this._syncRevision && shouldPlay === this._canPlay()) {
                        return shouldPlay && ctx.state === 'running';
                    }
                }
            } catch (error) {
                console.warn('[AudioManager] 音声状態の切り替えに失敗しました:', error);
            }
            return false;
        })().finally(() => { this._syncPromise = null; });
        return this._syncPromise;
    },

    async setPageVisible(visible) {
        this._pageVisible = Boolean(visible);
        const ready = await this._syncPlayback();
        if (ready && this._canPlay()) this.startBGM();
        return ready;
    },

    _releaseNodes(nodes) {
        nodes.forEach(node => {
            try { if (typeof node.stop === 'function') node.stop(); } catch (_) {}
            try { node.disconnect(); } catch (_) {}
        });
    },

    _trackEffect(sources, nodes) {
        let remaining = sources.length;
        const cleanup = () => {
            if (!this._activeEffects.delete(cleanup)) return;
            this._releaseNodes(nodes);
        };
        this._activeEffects.add(cleanup);
        sources.forEach(source => {
            source.onended = () => { if (--remaining === 0) cleanup(); };
        });
    },

    async dispose() {
        const ctx = this.ctx;
        this.ctx = null;
        this.bgmNodes.forEach(nodes => this._releaseNodes(Object.values(nodes)));
        this.bgmNodes = [];
        [...this._activeEffects].forEach(cleanup => cleanup());
        if (this.masterGain) this.masterGain.disconnect();
        this.masterGain = null;
        State.audioInit = false;
        State.bgmStarted = false;
        try { if (ctx && ctx.state !== 'closed') await ctx.close(); }
        catch (error) { console.warn('[AudioManager] 音声の終了に失敗しました:', error); }
    },
    
    _initCtx() {
        if (!this.ctx) {
            try {
                let volumeRatio = 1.0;
                try {
                    const stored = localStorage.getItem('wonder_school_profile_v2');
                    if (stored) {
                        const data = JSON.parse(stored);
                        if (typeof data?.volumeDb === 'number' && Number.isFinite(data.volumeDb)) {
                            const db = Math.max(-40, Math.min(0, data.volumeDb));
                            if (db <= -40) {
                                volumeRatio = 0;
                            } else {
                                volumeRatio = Math.pow(10, db / 40);
                            }
                        }
                    }
                } catch(e) {
                    console.warn('[AudioManager] Failed to sync volume in space_lab:', e);
                }

                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.ctx.createGain();
                this.masterGain.connect(this.ctx.destination);
                this._masterVolume = 0.5 * volumeRatio;
                this.masterGain.gain.value = this._canPlay() ? this._masterVolume : 0; // マスターボリューム
            } catch(e) {
                const ctx = this.ctx;
                this.ctx = null;
                this.masterGain = null;
                if (ctx && typeof ctx.close === 'function') void ctx.close().catch(() => {});
                console.warn('[AudioManager] AudioContext の作成に失敗しました:', e);
            }
        }
        return this.ctx;
    },

    startBGM() {
        if (State.bgmStarted || !this.ctx || !this._canPlay()) return;
        try {
            // 立体SFアンビエント（Cm9コードベースの4和音ドローン）
            // ルート: C3 (130.81Hz), 5度: G3 (196.00Hz), m3度: Eb4 (311.13Hz), 7/9度: D5 (587.33Hz)
            const voices = [
                { freq: 130.81, pan: 0.0,   lfoFreq: 0.03, maxGain: 0.04 }, // C3 (ベース)
                { freq: 196.00, pan: -0.2,  lfoFreq: 0.04, maxGain: 0.03 }, // G3
                { freq: 311.13, pan: -0.65, lfoFreq: 0.05, maxGain: 0.025 }, // Eb4 (左)
                { freq: 587.33, pan: 0.65,  lfoFreq: 0.07, maxGain: 0.02 }  // D5 (右)
            ];

            this.bgmNodes = [];

            voices.forEach(v => {
                const osc = this.ctx.createOscillator();
                const vGain = this.ctx.createGain();
                
                osc.type = 'triangle'; // 柔らかい丸みのある三角波
                osc.frequency.value = v.freq;
                
                // LFO（超低周波発振器）で音量をゆったりと揺らす
                const lfo = this.ctx.createOscillator();
                const lfoGain = this.ctx.createGain();
                const nodes = { osc, lfo, vGain, lfoGain };
                this.bgmNodes.push(nodes);

                lfo.type = 'sine';
                lfo.frequency.value = v.lfoFreq;
                
                // LFOの揺れ幅を調整（ゲインの中央値をmaxGainにし、そこから揺らす）
                lfoGain.gain.value = v.maxGain * 0.4; // 揺れ幅 (40%)
                vGain.gain.value = v.maxGain * 0.6;   // 基本音量 (60%)
                
                lfo.connect(lfoGain);
                lfoGain.connect(vGain.gain); // 音量パラメータに変調をかける
                
                // ステレオパンナーの作成と接続
                osc.connect(vGain);
                let panner = null;
                let targetNode = vGain;
                if (this.ctx.createStereoPanner) {
                    panner = this.ctx.createStereoPanner();
                    nodes.panner = panner;
                    panner.pan.value = v.pan;
                    vGain.connect(panner);
                    targetNode = panner;
                }
                
                targetNode.connect(this.masterGain);
                
                osc.start();
                lfo.start();
                
            });

            State.bgmStarted = true;
        } catch(e) {
            this.bgmNodes.forEach(nodes => this._releaseNodes(Object.values(nodes)));
            this.bgmNodes = [];
            State.bgmStarted = false;
            console.warn('Failed to start BGM:', e);
        }
    },
    
    async ensure() {
        if (!this.ctx && !this._initCtx()) return false;
        State.audioInit = true;
        const ready = await this._syncPlayback();
        if (ready && this._canPlay()) this.startBGM();
        return ready;
    },

    async play(type, freqOrName, vol = 0.1, wave = 'sine', time = 0.1) {
        if (!this._canPlay() || !this.ctx) return;
        try {
            if (this.ctx.state !== 'running') await this._syncPlayback();
            if (!this._canPlay() || !this.ctx || this.ctx.state !== 'running') return;
            const now = this.ctx.currentTime;

            // SFX プリセットの合成ロジック
            if (type === 'fx') {
                if (freqOrName === 'click') {
                    // タクタイルSFクリック音（1200Hz -> 600Hz スイープ）
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(1200, now);
                    osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
                    
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                    
                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    
                    osc.start(now);
                    osc.stop(now + 0.06);
                    this._trackEffect([osc], [osc, gain]);
                    return;
                }
                
                if (freqOrName === 'correct') {
                    // 美しい未来派アルペジオチャイム（C5 -> G5 上昇アルペジオ）
                    const notes = [523.25, 783.99]; // C5, G5
                    notes.forEach((freq, i) => {
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();
                        
                        osc.type = 'triangle';
                        osc.frequency.value = freq;
                        
                        const delay = i * 0.06; // 60ms ずらして鳴らす
                        
                        gain.gain.setValueAtTime(0.0, now + delay);
                        gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.01);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25);
                        
                        osc.connect(gain);
                        gain.connect(this.masterGain);
                        
                        osc.start(now + delay);
                        osc.stop(now + delay + 0.26);
                        this._trackEffect([osc], [osc, gain]);
                    });
                    return;
                }
                
                if (freqOrName === 'levelUp') {
                    // 宇宙船加速風SF上昇エフェクト（デチューン複音＋フィルター開閉連動）
                    const duration = 0.8;
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(200, now);
                    filter.frequency.exponentialRampToValueAtTime(3200, now + duration);
                    filter.Q.value = 4.0; // 少しピークを持たせる
                    
                    filter.connect(this.masterGain);
                    
                    // わずかにディチューンした2つのオシレーターでコーラス感を作る
                    const oscs = [];
                    const gains = [];
                    const detunes = [-12, 12]; // セント単位
                    
                    detunes.forEach(detune => {
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();
                        
                        osc.type = 'sawtooth'; // 倍音が豊かなのこぎり波
                        osc.frequency.setValueAtTime(300, now);
                        osc.frequency.exponentialRampToValueAtTime(1500, now + duration);
                        osc.detune.value = detune;
                        
                        gain.gain.setValueAtTime(0.0, now);
                        gain.gain.linearRampToValueAtTime(0.08, now + 0.05); // アタック
                        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
                        
                        osc.connect(gain);
                        gain.connect(filter);
                        
                        osc.start(now);
                        osc.stop(now + duration + 0.05);
                        
                        oscs.push(osc);
                        gains.push(gain);
                    });
                    
                    // 音声時計に合わせて破棄する。タブ非表示中のタイマー遅延にも依存しない。
                    this._trackEffect(oscs, [...oscs, ...gains, filter]);
                    return;
                }
            }
            
            // 汎用のシンプル再生（フォールバック用）
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.type = wave;
            osc.frequency.value = typeof freqOrName === 'number' ? freqOrName : 440;
            gain.gain.value = vol;
            
            osc.start(now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time);
            osc.stop(now + time + 0.01);
            
            this._trackEffect([osc], [osc, gain]);
        } catch(e) { console.warn('[AudioManager] サウンド再生エラー:', e); }
    },
    
    async toggleMute(bgmIconOn, bgmIconOff) {
        State.isMuted = !State.isMuted;
        State.saveMute();
        // 音声が使えない端末でも設定とアイコンは更新する。
        if (bgmIconOn) bgmIconOn.classList.toggle('hidden', State.isMuted);
        if (bgmIconOff) bgmIconOff.classList.toggle('hidden', !State.isMuted);
        const ready = await this._syncPlayback();
        if (ready && this._canPlay()) this.startBGM();
    }
};
