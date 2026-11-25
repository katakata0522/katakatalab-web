'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const Theme = require('../screenshot-crop/theme.js');
const Frame = require('../screenshot-crop/frame.js');
const Sample = require('../screenshot-crop/sample.js');
const ImageOps = require('../screenshot-crop/image.js');

function createMockContext2D() {
  const ops = [];
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textBaseline: 'alphabetic',
    textAlign: 'left',
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    ops,
    save() { ops.push(['save']); },
    restore() { ops.push(['restore']); },
    beginPath() { ops.push(['beginPath']); },
    closePath() { ops.push(['closePath']); },
    moveTo(x, y) { ops.push(['moveTo', x, y]); },
    lineTo(x, y) { ops.push(['lineTo', x, y]); },
    quadraticCurveTo(cpx, cpy, x, y) { ops.push(['quadraticCurveTo', cpx, cpy, x, y]); },
    rect(x, y, w, h) { ops.push(['rect', x, y, w, h]); },
    clip() { ops.push(['clip']); },
    fill() { ops.push(['fill', this.fillStyle]); },
    stroke() { ops.push(['stroke', this.strokeStyle, this.lineWidth]); },
    clearRect(x, y, w, h) { ops.push(['clearRect', x, y, w, h]); },
    fillRect(x, y, w, h) { ops.push(['fillRect', x, y, w, h, this.fillStyle]); },
    fillText(text, x, y) { ops.push(['fillText', text, x, y]); },
    drawImage(...args) { ops.push(['drawImage', ...args]); },
    createLinearGradient(x0, y0, x1, y1) {
      const stops = [];
      return {
        stops,
        addColorStop(offset, color) { stops.push([offset, color]); },
      };
    },
  };
  return ctx;
}

function createMockCanvas() {
  const ctx = createMockContext2D();
  const canvas = {
    width: 0,
    height: 0,
    _ctx: ctx,
    getContext(kind) {
      return kind === '2d' ? ctx : null;
    },
    toBlob(callback, type, quality) {
      callback({ type, quality, width: canvas.width, height: canvas.height });
    },
  };
  return canvas;
}

test('theme: 保存値とOS設定の優先順位とストレージ異常耐性を満たす', () => {
  assert.equal(Theme.resolveInitialTheme('dark', false), true);
  assert.equal(Theme.resolveInitialTheme('light', true), false);
  assert.equal(Theme.resolveInitialTheme('', true), true);
  assert.equal(Theme.resolveInitialTheme('', false), false);

  const backing = new Map();
  const mockStorage = {
    getItem: (k) => (backing.has(k) ? backing.get(k) : null),
    setItem: (k, v) => backing.set(k, String(v)),
  };

  assert.equal(Theme.readSavedTheme(mockStorage), '');
  Theme.writeSavedTheme(true, mockStorage);
  assert.equal(Theme.readSavedTheme(mockStorage), 'dark');
  Theme.writeSavedTheme(false, mockStorage);
  assert.equal(Theme.readSavedTheme(mockStorage), 'light');

  backing.set(Theme.STORAGE_KEY, 'unexpected');
  assert.equal(Theme.readSavedTheme(mockStorage), '');

  const brokenStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  assert.equal(Theme.readSavedTheme(brokenStorage), '');
  assert.doesNotThrow(() => Theme.writeSavedTheme(true, brokenStorage));
});

test('frame: オプション正規化と有効判定と出力サイズ計算が安定している', () => {
  assert.deepEqual(Frame.normalizeFrameOptions(null), {
    style: 'none',
    radius: 20,
    background: 'mist',
    padding: 'md',
  });

  assert.equal(Frame.isFrameActive({ style: 'none', radius: 24 }), false);
  assert.equal(Frame.isFrameActive({ style: 'rounded', radius: 0 }), false);
  assert.equal(Frame.isFrameActive({ style: 'rounded', radius: 24 }), true);
  assert.equal(Frame.isFrameActive({ style: 'backdrop', radius: 0 }), true);

  const plain = Frame.computeFramedDimensions(1080, 1920, { style: 'none', radius: 24 });
  assert.equal(plain.width, 1080);
  assert.equal(plain.height, 1920);
  assert.equal(plain.radius, 0);

  const rounded = Frame.computeFramedDimensions(1080, 1920, { style: 'rounded', radius: 36 });
  assert.equal(rounded.width, 1080);
  assert.equal(rounded.height, 1920);
  assert.equal(rounded.radius, 36);

  const tinyRounded = Frame.computeFramedDimensions(40, 40, { style: 'rounded', radius: 64 });
  assert.equal(tinyRounded.radius, 10);

  const sm = Frame.computeFramedDimensions(1000, 1800, { style: 'backdrop', padding: 'sm', radius: 24 });
  const md = Frame.computeFramedDimensions(1000, 1800, { style: 'backdrop', padding: 'md', radius: 24 });
  const lg = Frame.computeFramedDimensions(1000, 1800, { style: 'backdrop', padding: 'lg', radius: 24 });
  assert.ok(sm.padX < md.padX && md.padX < lg.padX);
  assert.equal(md.width, 1000 + md.padX * 2);
  assert.equal(md.height, 1800 + md.padY * 2);
  assert.ok(md.shadowBlur >= 18);
});

test('frame: renderFramedCanvasが背景グラデーション・影・角丸クリップを描画する', () => {
  const source = createMockCanvas();
  source.width = 600;
  source.height = 1000;
  const target = createMockCanvas();

  const out = Frame.renderFramedCanvas(source, {
    style: 'backdrop',
    radius: 24,
    background: 'midnight',
    padding: 'md',
  }, target);

  assert.equal(out, target);
  assert.ok(out.width > 600);
  assert.ok(out.height > 1000);
  const opNames = out._ctx.ops.map((entry) => entry[0]);
  assert.ok(opNames.includes('clip'));
  assert.ok(opNames.includes('drawImage'));
  assert.ok(opNames.includes('stroke'));
});

test('sample: 1080x2160のサンプル画像を上下バー・架空情報付きで描画できる', () => {
  assert.equal(Sample.SAMPLE_WIDTH, 1080);
  assert.equal(Sample.SAMPLE_HEIGHT, 2160);
  assert.equal(Sample.SAMPLE_FILE_NAME, 'sample-phone-screenshot.png');

  const canvas = createMockCanvas();
  Sample.renderSampleCanvas(canvas);
  assert.equal(canvas.width, 1080);
  assert.equal(canvas.height, 2160);

  const texts = canvas._ctx.ops
    .filter((entry) => entry[0] === 'fillText')
    .map((entry) => entry[1]);
  assert.ok(texts.includes('9:41'));
  assert.ok(texts.includes('sample-user@example.invalid'));
  assert.ok(texts.some((t) => t.includes('サンプル 太郎')));

  const topDarkBar = canvas._ctx.ops.find(
    (entry) => entry[0] === 'fillRect' && entry[1] === 0 && entry[2] === 0 && entry[3] === 1080 && entry[4] === 96,
  );
  assert.ok(topDarkBar, '上端ステータスバーがy=0..96で描画される');
});

test('image: 角丸のみ指定時にJPEG入力を透過維持のためPNGへ切り替える', async () => {
  const prevDocument = global.document;
  global.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      return createMockCanvas();
    },
  };

  try {
    const fakeImage = { naturalWidth: 1000, naturalHeight: 2000 };
    const jpegFile = { name: 'photo.jpg', type: 'image/jpeg' };
    const crop = { top: 100, bottom: 100, left: 0, right: 0 };

    const roundedRes = await ImageOps.exportCroppedBlob(fakeImage, jpegFile, crop, {
      frame: { style: 'rounded', radius: 24, background: 'mist', padding: 'md' },
    });
    assert.equal(roundedRes.mime, 'image/png');
    assert.match(roundedRes.name, /\.png$/);

    const backdropRes = await ImageOps.exportCroppedBlob(fakeImage, jpegFile, crop, {
      frame: { style: 'backdrop', radius: 24, background: 'mist', padding: 'md' },
    });
    assert.equal(backdropRes.mime, 'image/jpeg');
    assert.match(backdropRes.name, /\.jpg$/);
    assert.ok(backdropRes.blob.width > 1000);
    assert.ok(backdropRes.blob.height > 1800);
  } finally {
    global.document = prevDocument;
  }
});
