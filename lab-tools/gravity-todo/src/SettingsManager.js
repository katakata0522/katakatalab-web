// ブロックカラー設定を管理するクラス
export class SettingsManager {
  static STORAGE_KEY = 'gravity_todo_settings';
  static _cache = null;

  // デフォルトをもっと明るく視認性の高い色に
  static PRESETS = [
    { id: 'neon',   name: 'ネオン',     block: '#1a1a2e', border: '#ff3366' },
    { id: 'cyber',  name: 'サイバー',   block: '#0a1628', border: '#00d4ff' },
    { id: 'forest', name: 'フォレスト', block: '#0d2b1e', border: '#4caf50' },
    { id: 'cosmic', name: 'コズミック', block: '#1a0d3e', border: '#9c6fff' },
    { id: 'fire',   name: 'ファイア',   block: '#2b1205', border: '#ff7a45' },
  ];

  static load() {
    if (this._cache) return this._cache;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      this._cache = {
        blockColor:  saved.blockColor  || this.PRESETS[0].block,
        blockBorder: saved.blockBorder || this.PRESETS[0].border,
        preset:      saved.preset      || 'neon',
      };
    } catch {
      this._cache = { blockColor: this.PRESETS[0].block, blockBorder: this.PRESETS[0].border, preset: 'neon' };
    }
    return this._cache;
  }

  static save(settings) {
    this._cache = { ...settings };
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch { /* ignore */ }
  }

  static getBlockColor()  { return this.load().blockColor; }
  static getBlockBorder() { return this.load().blockBorder; }
}

