(() => {
  'use strict';

  const SAMPLE_WIDTH = 1080;
  const SAMPLE_HEIGHT = 2160;
  const SAMPLE_FILE_NAME = 'sample-phone-screenshot.png';

  function drawRoundedRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function renderSampleCanvas(canvas) {
    const w = SAMPLE_WIDTH;
    const h = SAMPLE_HEIGHT;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('sample-canvas-context');

    const sans = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif';

    // 1. Main app background
    ctx.fillStyle = '#f3f6fb';
    ctx.fillRect(0, 0, w, h);

    // 2. Top OS status bar (high-contrast dark bar with crisp boundary at y = 96 for reliable auto edge detection)
    const statusH = 96;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, statusH);

    // Clock
    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 34px ${sans}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('9:41', 54, statusH / 2 + 2);

    // Notification indicator dot + bell text (subtle reminder of why people crop top bars)
    drawRoundedRectPath(ctx, 168, 30, 178, 38, 19);
    ctx.fillStyle = 'rgba(248, 113, 113, 0.22)';
    ctx.fill();
    ctx.fillStyle = '#fca5a5';
    ctx.font = `700 22px ${sans}`;
    ctx.fillText('未読通知 3件', 190, statusH / 2 + 2);

    // Signal bars + 5G + Battery icon on right
    ctx.fillStyle = '#e2e8f0';
    for (let i = 0; i < 4; i += 1) {
      const barH = 12 + i * 6;
      ctx.fillRect(838 + i * 11, statusH / 2 + 12 - barH, 7, barH);
    }
    ctx.font = `700 24px ${sans}`;
    ctx.fillText('5G', 892, statusH / 2 + 2);
    // Battery outline
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    drawRoundedRectPath(ctx, 948, 32, 64, 32, 8);
    ctx.stroke();
    ctx.fillStyle = '#4ade80';
    drawRoundedRectPath(ctx, 954, 38, 46, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(1015, 42, 6, 12);

    // 3. App top bar (y = 96..228)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, statusH, w, 132);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, statusH + 130, w, 2);

    ctx.fillStyle = '#1e293b';
    ctx.font = `800 38px ${sans}`;
    ctx.fillText('プロジェクト連絡メモ', 52, statusH + 68);
    ctx.fillStyle = '#64748b';
    ctx.font = `600 24px ${sans}`;
    ctx.textAlign = 'right';
    ctx.fillText('サンプル画面', w - 52, statusH + 68);
    ctx.textAlign = 'left';

    // 4. Main content cards
    // Card 1: Announcement card (the main content user wants to share)
    drawRoundedRectPath(ctx, 44, 276, w - 88, 460, 32);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#dbe4f0';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Accent header inside card 1
    drawRoundedRectPath(ctx, 84, 318, 224, 48, 24);
    ctx.fillStyle = '#dbeafe';
    ctx.fill();
    ctx.fillStyle = '#1d4ed8';
    ctx.font = `800 24px ${sans}`;
    ctx.fillText('公開スケジュール', 112, 343);

    ctx.fillStyle = '#0f172a';
    ctx.font = `800 42px ${sans}`;
    ctx.fillText('新バージョンのチェック完了！', 84, 426);

    ctx.fillStyle = '#475569';
    ctx.font = `500 30px ${sans}`;
    ctx.fillText('画面の上下にある時計やナビゲーションバーを', 84, 496);
    ctx.fillText('サッと切って、そのままSNSやチャットへ', 84, 544);
    ctx.fillText('きれいに共有できます。', 84, 592);

    // Mini metric chips inside card 1
    const metrics = [
      { label: '対応形式', value: 'PNG / JPG / WebP' },
      { label: '処理場所', value: 'ブラウザ内完結' },
    ];
    metrics.forEach((item, idx) => {
      const mx = 84 + idx * 448;
      drawRoundedRectPath(ctx, mx, 636, 424, 68, 18);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.font = `700 22px ${sans}`;
      ctx.fillText(item.label, mx + 22, 670);
      ctx.fillStyle = '#0f172a';
      ctx.font = `800 24px ${sans}`;
      ctx.textAlign = 'right';
      ctx.fillText(item.value, mx + 402, 670);
      ctx.textAlign = 'left';
    });

    // Card 2: Fictional private info card (ideal for testing Blackout / Blur redaction!)
    drawRoundedRectPath(ctx, 44, 780, w - 88, 520, 32);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#dbe4f0';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = `800 34px ${sans}`;
    ctx.fillText('発送・連絡先メモ（黒塗り・ぼかし練習用）', 84, 844);

    ctx.fillStyle = '#64748b';
    ctx.font = `600 24px ${sans}`;
    ctx.fillText('※ すべて架空のサンプル情報です', 84, 892);

    const rows = [
      ['お名前', 'サンプル 太郎'],
      ['メール', 'sample-user@example.invalid'],
      ['お届け先', '〒100-0000 東京都サンプル区1-2-3'],
      ['受付番号', 'TEST-2026-0001'],
    ];
    rows.forEach(([label, value], idx) => {
      const ry = 954 + idx * 80;
      drawRoundedRectPath(ctx, 84, ry, w - 168, 62, 16);
      ctx.fillStyle = idx % 2 === 0 ? '#fef3c7' : '#f8fafc';
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.font = `700 24px ${sans}`;
      ctx.fillText(label, 112, ry + 32);
      ctx.fillStyle = '#0f172a';
      ctx.font = `700 28px ${sans}`;
      ctx.fillText(value, 270, ry + 32);
    });

    // Card 3: Preview guide card
    drawRoundedRectPath(ctx, 44, 1344, w - 88, 430, 32);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.font = `800 24px ${sans}`;
    ctx.fillText('TIPS', 88, 1404);
    ctx.fillStyle = '#f8fafc';
    ctx.font = `800 36px ${sans}`;
    ctx.fillText('こんな使い方も試せます', 88, 1464);

    const tips = [
      '1. 上下の黄色いバーをドラッグして切り位置を微調整',
      '2. 「見せたくない部分を隠す」で上の架空メールをぼかす',
      '3. 「角丸・背景フレーム」でSNS映えする画像に仕上げる',
    ];
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `600 28px ${sans}`;
    tips.forEach((line, idx) => {
      ctx.fillText(line, 88, 1546 + idx * 68);
    });

    // 5. Bottom OS navigation / home indicator bar (distinct dark band at bottom 136px)
    const navH = 136;
    const navY = h - navH;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, navY, w, navH);

    // Subtle browser / OS toolbar icons
    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 30px ${sans}`;
    ctx.textAlign = 'center';
    ctx.fillText('◀', 216, navY + 52);
    ctx.fillText('●', 540, navY + 52);
    ctx.fillText('■', 864, navY + 52);
    ctx.textAlign = 'left';

    // Home indicator pill
    drawRoundedRectPath(ctx, w / 2 - 170, h - 34, 340, 12, 6);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();

    return canvas;
  }

  function createSampleScreenshotFile() {
    const canvas = document.createElement('canvas');
    renderSampleCanvas(canvas);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('sample-blob-failed'));
          return;
        }
        const file = new File([blob], SAMPLE_FILE_NAME, { type: 'image/png' });
        resolve(file);
      }, 'image/png');
    });
  }

  const api = Object.freeze({
    SAMPLE_WIDTH,
    SAMPLE_HEIGHT,
    SAMPLE_FILE_NAME,
    renderSampleCanvas,
    createSampleScreenshotFile,
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ScreenshotCropSample = api;
})();
