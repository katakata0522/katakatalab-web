/**
 * GravityTodo — GyroManager
 * スマホの傾きに応じて Matter.js の重力方向を変える。
 * Device Orientation API を使用。設定でON/OFF可能。
 */
export class GyroManager {
  static STORAGE_KEY = 'gravity_todo_gyro';

  constructor(engine) {
    this.engine = engine;         // Matter.js Engine
    this.enabled = false;
    this.supported = false;
    this.permissionGranted = false;
    this._handler = this._onOrientation.bind(this);

    // ジャイロの効き具合（1 = そのまま、0.5 = 半分）
    this.sensitivity = 0.6;

    // デフォルト重力（ジャイロOFF時に戻す値）
    this.defaultGravityX = 0;
    this.defaultGravityY = 1;

    // キャリブレーション（基準点）用
    this.baseBeta = 45;
    this.baseGamma = 0;

    this._detectSupport();
  }

  _detectSupport() {
    this.supported = 'DeviceOrientationEvent' in window;
  }

  // iOS 13+ では明示的なパーミッション要求が必要
  async requestPermission() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const state = await DeviceOrientationEvent.requestPermission();
        this.permissionGranted = (state === 'granted');
        return this.permissionGranted;
      } catch {
        this.permissionGranted = false;
        return false;
      }
    }
    // Android / 非iOS: パーミッション不要
    this.permissionGranted = true;
    return true;
  }

  async enable() {
    if (!this.supported) return false;

    if (!this.permissionGranted) {
      const ok = await this.requestPermission();
      if (!ok) return false;
    }

    window.addEventListener('deviceorientation', this._handler, true);
    this.enabled = true;
    this._save(true);
    return true;
  }

  // 現在の傾きを基準（ゼロポイント）としてセットする
  calibrate(beta, gamma) {
    if (beta !== null && beta !== undefined) this.baseBeta = beta;
    if (gamma !== null && gamma !== undefined) this.baseGamma = gamma;
  }

  disable() {
    window.removeEventListener('deviceorientation', this._handler, true);
    // 重力をデフォルトに戻す
    this.engine.gravity.x = this.defaultGravityX;
    this.engine.gravity.y = this.defaultGravityY;
    this.enabled = false;
    this._save(false);
  }

  async toggle() {
    if (this.enabled) {
      this.disable();
      return false;
    } else {
      return await this.enable();
    }
  }

  _onOrientation(event) {
    if (!this.enabled) return;

    // beta: 前後の傾き (-180 ~ 180), gamma: 左右の傾き (-90 ~ 90)
    const beta  = event.beta  ?? 0;  // 前後
    const gamma = event.gamma ?? 0;  // 左右

    // キャリブレーション値からの差分を計算
    let diffBeta = beta - this.baseBeta;
    let diffGamma = gamma - this.baseGamma;

    // 角度のラップアラウンド補正 (必要であれば)
    if (diffBeta > 180) diffBeta -= 360;
    if (diffBeta < -180) diffBeta += 360;

    // gamma → X軸の重力（左右に傾けるとブロックが滑る）
    // diffGammaを正規化
    const gx = Math.max(-1, Math.min(1, diffGamma / 90)) * this.sensitivity;

    // beta → Y軸の重力（前後に傾けると落下速度が変わる）
    // diffBetaを正規化。基準角度（0度差）の時にY重力が1になるように。
    const normalizedBeta = diffBeta / 90;
    const gy = 1 + Math.max(-0.8, Math.min(0.8, normalizedBeta)) * this.sensitivity;

    this.engine.gravity.x = gx;
    this.engine.gravity.y = gy;
    
    // 最新の生データを保持（キャリブレボタン押下用）
    this.currentBeta = beta;
    this.currentGamma = gamma;
  }

  _save(enabled) {
    try { localStorage.setItem(GyroManager.STORAGE_KEY, enabled ? '1' : '0'); } catch { /* ignore */ }
  }

  loadPreference() {
    try { return localStorage.getItem(GyroManager.STORAGE_KEY) === '1'; } catch { return false; }
  }

  destroy() {
    this.disable();
  }
}
