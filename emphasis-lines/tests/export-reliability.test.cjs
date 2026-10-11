'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function loadClass(relativePath, exportedName, imports) {
  const fullPath = path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(fullPath, 'utf8')
    .replace(/^import\s+.*?;\s*$/gm, '')
    .replace(/^export const store =.*$/gm, '')
    .replace(new RegExp('export class ' + exportedName + '\\b'), 'class ' + exportedName);
  const symbols = Object.keys(imports);
  return new Function(...symbols, source + '\nreturn ' + exportedName + ';')(...Object.values(imports));
}

const PRESETS = Object.fromEntries(
  ['basic', 'manga', 'radial', 'speed'].map((name) => [name, {
    count: 50, width: 2, minLen: 30, maxLen: 100,
    randomness: 10, taper: 0, color: '#000000',
  }]),
);

class Random {
  setSeed(seed) { this.seed = seed; }
  next() { return 0.3; }
  range(min, max) { return (min + max) / 2; }
}

function makeHarness(mode = 'composite', imageBlob = { size: 3 }) {
  const state = {
    mode, imgWidth: 1080, imgHeight: 1080, type: 'basic',
    params: PRESETS.basic, centerX: 0.5, centerY: 0.5,
  };
  const store = { getState() { return { ...state }; } };
  const events = [];
  const lineCanvas = {
    width: 1080, height: 1080,
    toBlob(callback) { callback(imageBlob); },
  };
  const bgCanvas = { width: 1080, height: 1080 };
  const renderer = {
    ctxBg: { clearRect(...args) { events.push(['clear', ...args]); } },
    drawPlaceholder(s) { events.push(['placeholder', s.imgWidth, s.imgHeight]); },
    render(s) { events.push(['render', s.imgWidth, s.imgHeight]); },
  };
  const BatchManager = loadClass('js/managers/BatchManager.js', 'BatchManager', { store, PRESETS, Random });
  return { manager: new BatchManager(renderer, lineCanvas, bgCanvas), lineCanvas, bgCanvas, events };
}

test('一括生成の成功後、元のキャンバスを再描画する', async () => {
  const h = makeHarness();
  const blobs = await h.manager.generate({ count: 2, width: 640, height: 360 });
  assert.equal(blobs.length, 2);
  assert.deepEqual([h.lineCanvas.width, h.lineCanvas.height], [1080, 1080]);
  assert.deepEqual([h.bgCanvas.width, h.bgCanvas.height], [1080, 1080]);
  assert.deepEqual(h.events.at(-2), ['placeholder', 1080, 1080]);
  assert.deepEqual(h.events.at(-1), ['render', 1080, 1080]);
  assert.equal(h.manager.isGenerating, false);
});

test('PNGの作成に失敗しても透明背景・元の線を回復する', async () => {
  const h = makeHarness('lines', null);
  await assert.rejects(
    h.manager.generate({ count: 2, width: 640, height: 360 }),
    /Canvas to Blob conversion failed/,
  );
  assert.deepEqual([h.lineCanvas.width, h.lineCanvas.height], [1080, 1080]);
  assert.deepEqual([h.bgCanvas.width, h.bgCanvas.height], [1080, 1080]);
  assert.deepEqual(h.events.at(-2), ['clear', 0, 0, 1080, 1080]);
  assert.deepEqual(h.events.at(-1), ['render', 1080, 1080]);
  assert.equal(h.manager.isGenerating, false);
});

test('不正な出力枚数・サイズはキャンバス変更前に拒否する', async () => {
  const h = makeHarness();
  for (const options of [
    { count: 0 }, { count: NaN }, { count: 1.5 },
    { count: 51 }, { count: 1, width: Infinity },
    { count: 1, width: -1 }, { count: 1, height: 5000 },
  ]) {
    await assert.rejects(h.manager.generate(options), RangeError);
  }
  assert.equal(h.events.length, 0);
  assert.deepEqual([h.lineCanvas.width, h.lineCanvas.height], [1080, 1080]);
});

test('生成中は二重開始させない', async () => {
  const h = makeHarness();
  let finish;
  h.lineCanvas.toBlob = (callback) => { finish = callback; };
  const first = h.manager.generate({ count: 1, width: 640, height: 360 });
  await assert.rejects(h.manager.generate({ count: 1 }), /すでに実行中/);
  finish({ size: 1 });
  await first;
  assert.equal(h.manager.isGenerating, false);
});

test('画像ファイル検査とキャンバスプリセットを境界値で確認する', async () => {
  const ImageService = loadClass('js/services/ImageService.js', 'ImageService', { MAX_IMAGE_SIZE: 2048 });
  for (const bad of [
    undefined, { type: 'image/svg+xml', size: 120 },
    { type: 'image/png', size: 0 },
    { type: 'image/jpeg', size: 20 * 1024 * 1024 + 1 },
  ]) await assert.rejects(ImageService.loadImage(bad), Error);
  assert.deepEqual(ImageService.parseCanvasPreset('1080x1920'), { width: 1080, height: 1920 });
  for (const invalid of ['1e3x1000', 'Infinityx200', '5000x500', '0x100', '640x-1', '200x200x200', null]) {
    assert.equal(ImageService.parseCanvasPreset(invalid), null, String(invalid));
  }
});

test('画像未選択時のプレビューは輸出PNGと一致する白背景', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'js/renderers/renderer.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.doesNotMatch(renderer, /No Image Loaded/);
  assert.match(renderer, /if \(state\.image\)/);
  assert.match(html, /PNG・JPEG（各20MBまで）/);
});

test('画像の入れ替えと履歴復元で画像オブジェクト・寸法を保持する', () => {
  const Store = loadClass('js/state.js', 'Store', { PRESETS, DEFAULT_CANVAS_WIDTH: 1080, DEFAULT_CANVAS_HEIGHT: 1080 });
  // DOM画像と同様、プレーンオブジェクト以外の参照を値として扱う。
  class ImageReference {}
  const first = new ImageReference();
  const second = new ImageReference();
  const s = new Store();
  s.setState({ image: first, imgWidth: 640, imgHeight: 360 }, true);
  s.setState({ image: second, imgWidth: 360, imgHeight: 640 }, true);
  assert.equal(s.getState().image, second);
  s.undo();
  assert.equal(s.getState().image, first);
  assert.deepEqual([s.getState().imgWidth, s.getState().imgHeight], [640, 360]);
  s.redo();
  assert.equal(s.getState().image, second);
  assert.deepEqual([s.getState().imgWidth, s.getState().imgHeight], [360, 640]);
  s.undo(); s.undo();
  assert.equal(s.getState().image, null);
  assert.deepEqual([s.getState().imgWidth, s.getState().imgHeight], [1080, 1080]);
});

test('元に戻した直後の新しい編集を取り消せて、古いやり直しは残らない', () => {
  const Store = loadClass('js/state.js', 'Store', { PRESETS, DEFAULT_CANVAS_WIDTH: 1080, DEFAULT_CANVAS_HEIGHT: 1080 });
  const s = new Store();
  s.setState({ mode: 'lines' }, true);
  s.setState({ mode: 'composite' }, true);
  s.undo();
  assert.equal(s.getState().mode, 'lines');
  s.setState({ imgWidth: 640, imgHeight: 360 }, true);
  assert.equal(s.canRedo(), false);
  s.undo();
  assert.equal(s.getState().mode, 'lines');
  assert.deepEqual([s.getState().imgWidth, s.getState().imgHeight], [1080, 1080]);
});

test('JSZipの整合性ハッシュは同じ3.10.1の配信バイト列と一致する', () => {
  const crypto = require('node:crypto');
  const source = fs.readFileSync(path.join(__dirname, '..', 'js/managers/BatchManager.js'), 'utf8');
  const integrity = source.match(/script\.integrity = '([^']+)'/)?.[1];
  const vendor = fs.readFileSync(path.join(__dirname, '../../qrcode/vendor/jszip.min.js'));
  assert.match(source, /jszip\/3\.10\.1\/jszip\.min\.js/);
  assert.equal(integrity, 'sha512-' + crypto.createHash('sha512').update(vendor).digest('base64'));
});

test('全モジュールの版とPWAのprecache対象を実際のimportから照合する', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const version = html.match(/src="js\/app\.js\?v=([^\"]+)"/)[1];
  const visit = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? visit(path.join(directory, e.name)) : e.name.endsWith('.js') ? [path.join(directory, e.name)] : []);
  for (const file of visit(path.join(root, 'js'))) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const [relative, token] = match[1].split('?v=');
      assert.equal(token, version, file + ': importの版が異なります');
      const target = path.relative(root, path.resolve(path.dirname(file), relative)).split(path.sep).join('/');
      assert.ok(sw.includes('./' + target + '?v=' + version), target + ': precache対象に必要です');
    }
  }
});
