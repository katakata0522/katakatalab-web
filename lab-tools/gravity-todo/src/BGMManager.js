/**
 * GravityTodo — BGMManager
 * Web Audio API でアンビエントBGMをリアルタイム合成する。
 * 外部ファイル不要、完全オフライン対応。
 */
export class BGMManager {
  static STORAGE_KEY = 'gravity_todo_bgm';

  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.nodes = [];
    this._initAudioCtx = this._initAudioCtx.bind(this);
  }

  // AudioContextを遅延初期化（ユーザー操作後でないと再生不可）
  _initAudioCtx() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  // ドローン音（持続する低音）を生成
  _createDrone(freq, gainVal, type = 'sine') {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    this.nodes.push({ osc, gain });
    return { osc, gain };
  }

  // ゆっくり揺れるLFO（音に動きをつける）
  _createLFO(target, minVal, maxVal, speedHz) {
    const ctx = this.ctx;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(speedHz, ctx.currentTime);
    lfoGain.gain.setValueAtTime((maxVal - minVal) / 2, ctx.currentTime);
    target.setValueAtTime((minVal + maxVal) / 2, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(target);
    lfo.start();
    this.nodes.push({ osc: lfo, gain: lfoGain });
  }

  start() {
    if (this.isPlaying) return;
    this._initAudioCtx();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // ベースドローン（低い持続音）
    const bass = this._createDrone(55, 0.06, 'sine');
    this._createLFO(bass.osc.frequency, 53, 57, 0.05);

    // ハーモニクス（倍音）
    this._createDrone(110, 0.025, 'sine');
    this._createDrone(165, 0.012, 'sine');
    this._createDrone(220, 0.006, 'triangle');

    // 微妙なパッド音（高域の空気感）
    const pad = this._createDrone(440, 0.004, 'sine');
    this._createLFO(pad.gain.gain, 0.002, 0.008, 0.08);

    // マスターをフェードイン
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.masterGain.gain.exponentialRampToValueAtTime(0.18, this.ctx.currentTime + 2.0);

    this.isPlaying = true;
    this._save(true);
  }

  stop() {
    if (!this.isPlaying || !this.ctx) return;

    // フェードアウト後に全ノードを停止・破棄
    const stopTime = this.ctx.currentTime + 1.5;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
    this.masterGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    setTimeout(() => {
      this.nodes.forEach(({ osc }) => {
        try { osc.stop(); } catch { /* 既に停止済み */ }
      });
      this.nodes = [];
    }, 1600);

    this.isPlaying = false;
    this._save(false);
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
    return this.isPlaying;
  }

  // 設定の保存・読み込み
  _save(enabled) {
    try { localStorage.setItem(BGMManager.STORAGE_KEY, enabled ? '1' : '0'); } catch { /* ignore */ }
  }

  loadPreference() {
    try { return localStorage.getItem(BGMManager.STORAGE_KEY) === '1'; } catch { return false; }
  }
}
