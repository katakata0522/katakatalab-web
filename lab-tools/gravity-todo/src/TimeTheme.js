/**
 * GravityTodo — TimeTheme
 * 現実の時刻に合わせて背景グラデーションをシームレスに変化させる。
 */
export class TimeTheme {
  constructor() {
    // 各時間帯の背景定義
    this.themes = {
      dawn: {    // 5:00-7:59 夜明け
        bg: 'linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 20%, #6b3fa0 50%, #e87d56 80%, #f4a460 100%)',
        accent1: 'rgba(232,125,86,.12)',
        accent2: 'rgba(107,63,160,.1)',
      },
      morning: { // 8:00-11:59 朝
        bg: 'linear-gradient(180deg, #1e3a5f 0%, #2d5f8a 30%, #5ea2d2 60%, #87ceeb 100%)',
        accent1: 'rgba(94,162,210,.1)',
        accent2: 'rgba(135,206,235,.08)',
      },
      afternoon: { // 12:00-16:59 昼
        bg: 'linear-gradient(180deg, #0a1628 0%, #142b50 30%, #1e4d7a 60%, #2a6fa8 100%)',
        accent1: 'rgba(42,111,168,.1)',
        accent2: 'rgba(30,77,122,.08)',
      },
      evening: { // 17:00-19:59 夕方
        bg: 'linear-gradient(180deg, #1a0a2e 0%, #3d1f5c 25%, #c44e3e 55%, #f09040 80%, #ffc857 100%)',
        accent1: 'rgba(196,78,62,.12)',
        accent2: 'rgba(240,144,64,.1)',
      },
      night: {   // 20:00-4:59 夜（デフォルトの既存デザイン）
        bg: 'linear-gradient(180deg, #0c0c10 0%, #0a0a0c 42%, #08080a 100%)',
        accent1: 'rgba(255,122,69,.1)',
        accent2: 'rgba(255,51,102,.1)',
      },
    };

    this._intervalId = null;
  }

  getThemeForHour(hour) {
    if (hour >= 5  && hour < 8)  return 'dawn';
    if (hour >= 8  && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 20) return 'evening';
    return 'night';
  }

  apply() {
    const hour = new Date().getHours();
    const themeKey = this.getThemeForHour(hour);
    const theme = this.themes[themeKey];

    document.body.style.background = `
      radial-gradient(circle at top,    ${theme.accent1},  transparent 28%),
      radial-gradient(circle at 20% 20%, ${theme.accent2}, transparent 32%),
      ${theme.bg}
    `;

    // CSS変数にもテーマキーを保存（他コンポーネントが参照可能）
    document.documentElement.setAttribute('data-time-theme', themeKey);
  }

  // 1分ごとに自動更新
  startAutoUpdate() {
    this.apply();
    this._intervalId = setInterval(() => this.apply(), 60_000);
  }

  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }
}
