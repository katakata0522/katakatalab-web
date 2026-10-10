// 爆発音を合成するクラス
export class SoundManager {
  constructor(audioContextFactory = null) {
    this.audioContextFactory = audioContextFactory ?? (() => {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      return AudioContextClass ? new AudioContextClass() : null;
    });
    this.audioContext = null;
    this.muted = localStorage.getItem('gravity_todo_sfx_muted') === '1';
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    try {
      localStorage.setItem('gravity_todo_sfx_muted', this.muted ? '1' : '0');
    } catch (error) {
      console.warn('効果音の設定を保存できませんでした。', error);
    }
    return this.muted;
  }

  toggleMuted() {
    return this.setMuted(!this.muted);
  }

  // 音声コンテキストを遅延初期化する
  async getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = this.audioContextFactory();
    }

    if (!this.audioContext) {
      return null;
    }

    if (this.audioContext.state === 'suspended' && typeof this.audioContext.resume === 'function') {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  // 爆発音を短いノイズ風トーンで鳴らす
  async playExplosion(intensity = 1) {
    if (this.muted) return;
    try {
      const audioContext = await this.getAudioContext();
      if (!audioContext) {
        return;
      }

      const safeIntensity = Math.min(Math.max(intensity, 0.2), 1.5);
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(180, now);
      oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.18);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.18 * safeIntensity, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.21);
    } catch (error) {
      console.warn('Failed to play explosion sound:', error);
    }
  }

  // クラッカーの「パァン！」という音を合成
  async playCracker(intensity = 1) {
    if (this.muted) return;
    try {
      const audioContext = await this.getAudioContext();
      if (!audioContext) return;

      const safeIntensity = Math.min(Math.max(intensity, 0.2), 1.5);
      const now = audioContext.currentTime;
      const duration = 0.3;

      // 1. ノイズ生成（破裂の「バッ」という音）
      const bufferSize = audioContext.sampleRate * duration;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // ホワイトノイズ
      }

      const noiseSource = audioContext.createBufferSource();
      noiseSource.buffer = buffer;

      // ノイズ用フィルター
      const filter = audioContext.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 800;

      // ノイズ用エンベロープ
      const noiseGain = audioContext.createGain();
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.linearRampToValueAtTime(0.4 * safeIntensity, now + 0.01);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      noiseGain.gain.linearRampToValueAtTime(0, now + duration);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(audioContext.destination);

      // 2. 芯のあるアタック音（「パッ」という音）
      const osc = audioContext.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);

      const oscGain = audioContext.createGain();
      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(0.2 * safeIntensity, now + 0.01);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(oscGain);
      oscGain.connect(audioContext.destination);

      // 同時再生
      noiseSource.start(now);
      osc.start(now);
      osc.stop(now + duration);
    } catch (error) {
      console.warn('Failed to play cracker sound:', error);
    }
  }
}
