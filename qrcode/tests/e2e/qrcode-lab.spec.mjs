import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const analyzeImagePixels = async (page, dataUrl) => page.evaluate(async (src) => {
  const image = new Image();
  image.src = src;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const bounds = {
    minX: width,
    minY: height,
    maxX: -1,
    maxY: -1
  };
  let activePixels = 0;
  let redDominantPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = ((y * width) + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];
      const isWhite = r >= 245 && g >= 245 && b >= 245;
      if (a === 0 || isWhite) {
        continue;
      }

      activePixels += 1;
      if (r > 180 && g < 90 && b < 90) {
        redDominantPixels += 1;
      }
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);
    }
  }

  return {
    width,
    height,
    activePixels,
    redDominantRatio: activePixels > 0 ? redDominantPixels / activePixels : 0,
    leftMargin: bounds.minX,
    rightMargin: width - bounds.maxX - 1,
    topMargin: bounds.minY,
    bottomMargin: height - bounds.maxY - 1
  };
}, dataUrl);

const analyzeDownloadedPng = async (page, filePath) => {
  const png = await fs.readFile(filePath);
  return analyzeImagePixels(page, `data:image/png;base64,${png.toString('base64')}`);
};

const analyzeQrCanvas = async (page) => page.evaluate(() => {
  const canvas = document.querySelector('#qrCanvas');
  const ctx = canvas.getContext('2d');
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let activePixels = 0;
  let redDominantPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = ((y * width) + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];
      const isWhite = r >= 245 && g >= 245 && b >= 245;
      if (a === 0 || isWhite) {
        continue;
      }

      activePixels += 1;
      if (r > 180 && g < 90 && b < 90) {
        redDominantPixels += 1;
      }
    }
  }

  return {
    activePixels,
    redDominantRatio: activePixels > 0 ? redDominantPixels / activePixels : 0
  };
});

const downloadCurrentPng = async (page) => {
  await page.locator('#exportFormat').selectOption('png');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#downloadBtn').click();
  const download = await downloadPromise;
  return download.path();
};

test.describe('QR Maker Lab', () => {
  test('i18n キーが画面に露出しない', async ({ page }) => {
    await page.goto('/index.html');
    const leakedKey = page.locator('text=/\\b(?:sidebar|main|mobile|scanner|pro)\\.[a-zA-Z0-9_.-]+\\b/');
    await expect(leakedKey).toHaveCount(0);
  });

  test('テンプレート必須入力のバリデーションが動作する', async ({ page }) => {
    await page.goto('/index.html');

    await page.locator('#dataType').selectOption('wifi');
    await expect(page.locator('#templateErrorMsg')).toContainText('SSID');
    await expect(page.locator('#downloadBtn')).toBeDisabled();

    await page.fill('#wifiSsid', 'Guest-WiFi');
    await page.locator('#wifiAuth').selectOption('WPA');
    await expect(page.locator('#templateErrorMsg')).toContainText('パスワード');
    await expect(page.locator('#wifiPassword')).toHaveClass(/is-invalid/);

    await page.fill('#wifiPassword', 'guest-password');
    await expect(page.locator('#templateErrorMsg')).toBeHidden();
    await expect(page.locator('#downloadBtn')).toBeEnabled();
  });

  test('Free プランでは Pro 保存形式がロックされる', async ({ page }) => {
    await page.goto('/index.html');
    const svgDisabled = await page.locator('#exportFormat option[value="svg"]').isDisabled();
    const pdfDisabled = await page.locator('#exportFormat option[value="pdf"]').isDisabled();
    expect(svgDisabled).toBe(true);
    expect(pdfDisabled).toBe(true);
  });

  test('API未設定時は購入済みキー形式だけでProを有効化しない', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('#openSidebarBtn').click();
    await page.locator('details[data-details-id="plan"]').evaluate((element) => {
      element.open = true;
    });

    await page.fill('#licenseKeyInput', 'PRO-ABCD-1234');
    await page.click('#applyLicenseBtn');

    await expect(page.locator('#planPro')).not.toBeChecked();
    await expect(page.locator('#planPro')).toBeDisabled();
    await expect(page.locator('#planStatus')).toContainText('ライセンス検証サーバー未設定');
    await expect(page.locator('#exportFormat option[value="svg"]')).toBeDisabled();
    await expect(page.locator('#exportFormat option[value="pdf"]')).toBeDisabled();
  });

  test('PNG保存ではQR本体が左右中央に配置される', async ({ page }) => {
    await page.goto('/index.html');
    await page.fill('#qrText', 'https://docs.google.com');
    await expect(page.locator('#downloadBtn')).toBeEnabled();

    const filePath = await downloadCurrentPng(page);
    const metrics = await analyzeDownloadedPng(page, filePath);

    expect(metrics.activePixels).toBeGreaterThan(0);
    expect(Math.abs(metrics.leftMargin - metrics.rightMargin)).toBeLessThanOrEqual(1);
  });

  test('色変更後のPNG保存に前景色が反映される', async ({ page }) => {
    await page.goto('/index.html');
    await page.fill('#qrText', 'https://docs.google.com');
    await expect(page.locator('#downloadBtn')).toBeEnabled();

    const beforeMetrics = await analyzeQrCanvas(page);
    expect(beforeMetrics.activePixels).toBeGreaterThan(0);
    expect(beforeMetrics.redDominantRatio).toBeLessThan(0.05);

    await page.locator('#qrForeground').evaluate((element, value) => {
      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }, '#d11a2a');

    const previewMetrics = await analyzeQrCanvas(page);
    const filePath = await downloadCurrentPng(page);
    const metrics = await analyzeDownloadedPng(page, filePath);

    expect(previewMetrics.activePixels).toBeGreaterThan(0);
    expect(previewMetrics.redDominantRatio).toBeGreaterThan(0.95);
    expect(metrics.activePixels).toBeGreaterThan(0);
    expect(metrics.redDominantRatio).toBeGreaterThan(0.95);
  });

  test('コード色スウォッチでプレビューの色を変更できる', async ({ page }) => {
    await page.goto('/index.html');
    await page.fill('#qrText', 'https://docs.google.com');
    await expect(page.locator('#downloadBtn')).toBeEnabled();

    await page.locator('[data-color-target="foreground"][data-color-value="#d11a2a"]').click();
    const previewMetrics = await analyzeQrCanvas(page);

    expect(previewMetrics.activePixels).toBeGreaterThan(0);
    expect(previewMetrics.redDominantRatio).toBeGreaterThan(0.95);
  });

  test('コード色ピッカーは純黒固定を避けつつ黒スウォッチで黒に戻せる', async ({ page }) => {
    await page.goto('/index.html');

    await expect(page.locator('#qrForeground')).not.toHaveValue('#000000');

    await page.locator('[data-color-target="foreground"][data-color-value="#000000"]').click();
    await expect(page.locator('#qrForeground')).toHaveValue('#000000');
  });
});
