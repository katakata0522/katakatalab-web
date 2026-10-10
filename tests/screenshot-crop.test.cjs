const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const logic = require('../screenshot-crop/core.js');
const imageOps = require('../screenshot-crop/image.js');
const preview = require('../screenshot-crop/preview.js');
const zip = require('../screenshot-crop/zip.js');
const deviceProfiles = require('../screenshot-crop/device-profiles.js');
const cropPresets = require('../screenshot-crop/crop-presets.js');

test('デフォルトの処理辺は上だけ', () => {
  assert.deepEqual(logic.defaultEdges(), {
    top: true,
    bottom: false,
    left: false,
    right: false,
  });
});

test('選んだ辺だけに自動クロップ値を適用する', () => {
  const crop = { top: 90, bottom: 100, left: 20, right: 30 };
  assert.deepEqual(
    logic.applyEdgeSelection(crop, { top: true, bottom: false, left: false, right: false }),
    { top: 90, bottom: 0, left: 0, right: 0 },
  );
  assert.deepEqual(
    logic.applyEdgeSelection(crop, { top: true, bottom: true, left: true, right: true }),
    crop,
  );
});

test('選択辺に推定値がない場合は小さいフォールバックを使う', () => {
  const result = logic.buildSelectedCrop(
    { top: 0, bottom: 0, left: 0, right: 0 },
    { top: false, bottom: false, left: true, right: true },
    1080,
    2400,
  );
  assert.ok(result.left > 0 && result.left <= 48);
  assert.ok(result.right > 0 && result.right <= 48);
  assert.equal(result.top, 0);
  assert.equal(result.bottom, 0);
});

test('対応するラスタ画像形式だけを許可する', () => {
  assert.equal(logic.isAllowedMimeType('image/png'), true);
  assert.equal(logic.isAllowedMimeType('image/jpeg'), true);
  assert.equal(logic.isAllowedMimeType('image/webp'), true);
  assert.equal(logic.isAllowedMimeType('image/svg+xml'), false);
  assert.equal(logic.isAllowedMimeType('image/gif'), false);
});

test('極端に大きい画像寸法を拒否する', () => {
  assert.equal(logic.validateImageDimensions(3840, 2160), '');
  assert.equal(logic.validateImageDimensions(12001, 1000), 'too-large-dimension');
  assert.equal(logic.validateImageDimensions(8000, 6000), 'too-many-pixels');
  assert.equal(logic.validateImageDimensions(0, 1000), 'invalid-size');
});

test('スマホ縦長・PC横長・一般画像を保守的に分類する', () => {
  assert.equal(logic.detectDeviceType(1080, 2400), 'phone-portrait');
  assert.equal(logic.detectDeviceType(1920, 1080), 'desktop-landscape');
  assert.equal(logic.detectDeviceType(800, 800), 'generic');
});

test('スマホ縦長の推定は上下候補を持つ', () => {
  const crop = logic.getNominalCrop(1080, 2400, 'phone-portrait', true);
  assert.ok(crop.top > 70 && crop.top < 130);
  assert.ok(crop.bottom > 80 && crop.bottom < 140);
  assert.equal(crop.left, 0);
  assert.equal(crop.right, 0);
});

test('PC自動判定は境界がなければ勝手に下を切らない', () => {
  const result = logic.estimateCrop(1920, 1080, 'auto', true, {});
  assert.equal(result.detected, 'desktop-landscape');
  assert.equal(result.crop.bottom, 0);
});

test('PCを明示指定するとタスクバー相当の候補を出す', () => {
  const result = logic.estimateCrop(1920, 1080, 'desktop', true, {});
  assert.ok(result.crop.bottom >= 50);
});

test('境界候補がある場合はスマホ自動判定へ反映する', () => {
  const result = logic.estimateCrop(1080, 2400, 'auto', true, {
    top: 82,
    bottom: 74,
  });
  assert.ok(result.crop.top > 82);
  assert.ok(result.crop.bottom > 74);
});

test('通常画面は辺選択と保存に絞り、高度機能は詳細設定へ畳む', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');

  assert.match(html, /id="edgeTop"[^>]*checked/);
  assert.match(html, /id="edgeBottom"/);
  assert.match(html, /id="edgeLeft"/);
  assert.match(html, /id="edgeRight"/);
  assert.match(html, /id="saveButton"/);
  assert.match(html, /id="compareButton"/);
  assert.match(html, /class="advanced-panel"/);
  assert.match(html, /id="autoAgainButton"/);
  assert.match(html, /id="safeMargin"/);
  assert.match(html, /id="cropTop"/);

  assert.doesNotMatch(html, /data-edge-preset=/);
  assert.doesNotMatch(html, /data-effect=/);
  assert.doesNotMatch(html, /rememberSettings/);
  assert.doesNotMatch(html, /おすすめ/);
  assert.doesNotMatch(html, /ぼかす/);
  assert.doesNotMatch(html, /黒で隠す/);
});

test('通常UIは説明の重複を減らし、判定詳細を詳細設定へ退避する', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'style.css'), 'utf8');
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');

  assert.doesNotMatch(html, /スクショのプライバシー対策/);
  assert.doesNotMatch(html, /まずここから/);
  assert.doesNotMatch(html, />STEP 2</);
  assert.doesNotMatch(html, />STEP 3</);
  assert.doesNotMatch(html, /WHY THIS TOOL/);
  assert.match(html, /こんな時に便利/);
  assert.match(html, /元画像と比較/);
  assert.match(html, /class="detected-inline"/);
  assert.match(html, /id="batchProgress"[^>]*hidden/);
  assert.match(html, /画像ごとに合う辺を自動で選びます/);

  const edgeBlock = html.match(/<fieldset class="edge-fieldset[\s\S]*?<\/fieldset>/)?.[0] || '';
  assert.doesNotMatch(edgeBlock, /<small>/);

  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(min-width: 821px\) and \(min-height: 651px\)/);
  assert.match(css, /\.control-column \{\s*position: sticky;/);
  assert.match(css, /body\.has-editor \.export-card > #saveButton/);
  assert.match(script, /classList\.toggle\('has-batch', count > 1\)/);
  assert.match(script, /els\.batchProgress\.hidden = count <= 1/);
});

test('高速アクションUIは通常画面を増やしすぎず、対応時だけ使える', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');
  const imageSource = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'image.js'), 'utf8');

  assert.match(html, /id="readyHint"/);
  assert.match(html, /id="copyButton"[^>]*hidden/);
  assert.match(html, /id="quickActionDock"[^>]*hidden/);
  assert.match(html, /id="quickSaveButton"/);
  assert.match(html, /id="quickCopyButton"[^>]*hidden/);
  assert.match(html, /id="quickShareButton"[^>]*hidden/);
  assert.match(html, /id="saveAllIndividualButton"[^>]*hidden/);
  assert.match(html, /id="batchAutoNote"[^>]*hidden/);

  assert.match(script, /navigator\.clipboard\?\.write/);
  assert.match(script, /new window\.ClipboardItem\(\{ 'image\/png': blobPromise \}\)/);
  assert.match(script, /document\.body\.classList\.toggle\('has-editor'/);
  assert.match(script, /自動調整済み。このまま保存できます/);
  assert.match(script, /枚を個別保存/);
  assert.match(script, /枚を1つにまとめる（ZIP）/);
  assert.match(imageSource, /options\.mime \|\| outputMime\(file\)/);
});

test('複数枚選択と一括ZIP保存のUIを持つ', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');
  const coreSource = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'core.js'), 'utf8');
  const zipSource = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'zip.js'), 'utf8');
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');

  assert.match(html, /id="fileInput"[^>]*multiple/);
  assert.match(html, /id="batchStrip"/);
  assert.match(html, /id="batchList"/);
  assert.match(html, /id="saveAllIndividualButton"/);
  assert.match(html, /id="saveAllButton"/);
  assert.match(html, /id="removeCurrentButton"/);
  assert.match(html, /1〜8枚/);

  assert.match(coreSource, /maxBatchCount:\s*8/);
  assert.match(coreSource, /maxBatchBytes:\s*50 \* 1024 \* 1024/);
  assert.match(script, /saveAllIndividually/);
  assert.match(script, /downloads\.forEach\(\(\{ blob, name \}\) => triggerDownload\(blob, name\)\)/);
  assert.match(script, /createStoredZip/);
  assert.match(zipSource, /application\/zip/);
  assert.match(zipSource, /crc32/);
  assert.doesNotMatch(html, /jszip/i);
  assert.doesNotMatch(script, /JSZip/);
});

test('CRC32は既知値を返す', () => {
  const bytes = new TextEncoder().encode('123456789');
  assert.equal(zip.crc32(bytes), 0xcbf43926);
});

test('デコードキャッシュは同じ画像の同時デコードを1回にまとめる', async () => {
  let decodeCount = 0;
  const cache = imageOps.createDecodeCache({
    maxEntries: 2,
    maxPixels: 1_000_000,
    decode: async () => {
      decodeCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { naturalWidth: 100, naturalHeight: 100, src: 'decoded' };
    },
  });

  const [a, b] = await Promise.all([
    cache.get(1, 'blob:a'),
    cache.get(1, 'blob:a'),
  ]);
  assert.equal(a, b);
  assert.equal(decodeCount, 1);
  assert.equal(cache.stats().entries, 1);
  assert.equal(cache.stats().pending, 0);
});

test('削除された保留中デコードはキャッシュへ復活しない', async () => {
  let resolveDecode;
  const cache = imageOps.createDecodeCache({
    maxEntries: 2,
    maxPixels: 1_000_000,
    decode: () => new Promise((resolve) => { resolveDecode = resolve; }),
  });

  const pending = cache.get(7, 'blob:pending');
  cache.remove(7);
  resolveDecode({ naturalWidth: 100, naturalHeight: 100, src: 'decoded' });
  await assert.rejects(pending, /decode-cancelled/);
  assert.equal(cache.stats().entries, 0);
});

test('デコードキャッシュは件数上限を守り、利用中Imageを破壊しない', async () => {
  const images = new Map();
  const cache = imageOps.createDecodeCache({
    maxEntries: 2,
    maxPixels: 1_000_000,
    decode: async (url) => {
      const image = { naturalWidth: 100, naturalHeight: 100, src: url };
      images.set(url, image);
      return image;
    },
  });

  await cache.get(1, 'blob:1');
  await cache.get(2, 'blob:2');
  await cache.get(3, 'blob:3');
  assert.equal(cache.stats().entries, 2);
  assert.equal(images.get('blob:1').src, 'blob:1');
  cache.clear();
  assert.equal(cache.stats().entries, 0);
});

test('プレビュー計算は表示サイズと選択辺を純粋ロジックとして扱う', () => {
  const layout = preview.computeLayout(1080, 2400, 500, 850, logic.CONFIG);
  assert.ok(layout.scale > 0 && layout.scale < 1);
  assert.ok(layout.drawW <= 500);

  const edge = preview.closestEdge({
    position: { x: layout.drawW / 2, y: 20 },
    canvasWidth: layout.drawW,
    canvasHeight: layout.drawH,
    imageWidth: 1080,
    imageHeight: 2400,
    crop: { top: 80, bottom: 0, left: 0, right: 0 },
    enabledEdges: { top: true, bottom: false, left: false, right: false },
  });
  assert.equal(edge, 'top');
});

test('ZIP生成器は複数エントリを正しいローカルZIPへまとめる', async () => {
  const blob = await zip.createStoredZip([
    { name: '01-a.txt', blob: new Blob(['alpha']) },
    { name: '02-b.txt', blob: new Blob(['beta']) },
  ]);
  const bytes = Buffer.from(await blob.arrayBuffer());
  assert.equal(bytes.readUInt32LE(0), 0x04034b50);
  assert.ok(bytes.includes(Buffer.from('01-a.txt')));
  assert.ok(bytes.includes(Buffer.from('02-b.txt')));
  assert.equal(bytes.readUInt32LE(bytes.length - 22), 0x06054b50);
});

test('PWA manifestはスクショ端カット専用scopeとstandalone起動を持つ', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'manifest.webmanifest'), 'utf8')
  );

  assert.equal(manifest.id, '/screenshot-crop/');
  assert.equal(manifest.start_url, '/screenshot-crop/');
  assert.equal(manifest.scope, '/screenshot-crop/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.name, 'スクショ端カット');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);
  assert.ok(manifest.icons.some((icon) => /192x192/.test(icon.sizes)));
  assert.ok(manifest.icons.some((icon) => /512x512/.test(icon.sizes)));
  assert.ok(manifest.icons.some((icon) => /maskable/.test(icon.purpose || '')));
});

test('PWA Service Workerはツール本体をプリキャッシュし、scope外を横取りしない', () => {
  const sw = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'sw.js'), 'utf8');

  assert.match(sw, /screenshot-crop-static-20261003-v7-startup/);
  assert.match(sw, /APP_SCOPE_PATH = '\/screenshot-crop\/'/);
  assert.match(sw, /'\.\/index\.html'/);
  assert.match(sw, /'\.\/style\.css'/);
  assert.match(sw, /'\.\/core\.js'/);
  assert.match(sw, /'\.\/device-profiles\.js'/);
  assert.match(sw, /'\.\/crop-presets\.js'/);
  assert.match(sw, /'\.\/image\.js'/);
  assert.match(sw, /'\.\/preview\.js'/);
  assert.match(sw, /'\.\/zip\.js'/);
  assert.match(sw, /'\.\/script\.js'/);
  assert.match(sw, /'\.\/pwa\.js'/);
  assert.match(sw, /'\.\/manifest\.webmanifest'/);
  assert.match(sw, /'\.\/pwa-icon\.svg'/);
  assert.match(sw, /url\.pathname\.startsWith\(APP_SCOPE_PATH\)/);
  assert.match(sw, /request\.mode === 'navigate'/);
  assert.match(sw, /SKIP_WAITING/);
});

test('PWA登録はインストール・iOS案内・更新フローを持つ', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');
  const pwa = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'pwa.js'), 'utf8');

  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /apple-mobile-web-app-title/);
  assert.match(html, /id="pwaInstallButton"[^>]*hidden/);
  assert.match(html, /\.\/pwa\.js\?v=/);

  assert.match(pwa, /beforeinstallprompt/);
  assert.match(pwa, /appinstalled/);
  assert.match(pwa, /navigator\.serviceWorker\.register\('\.\/sw\.js', \{ scope: '\.\/', updateViaCache: 'none' \}\)/);
  assert.match(pwa, /ホーム画面に追加/);
  assert.match(pwa, /registration\.waiting/);
  assert.match(pwa, /SKIP_WAITING/);
  assert.match(pwa, /controllerchange/);
  assert.doesNotMatch(pwa, /localStorage|sessionStorage|indexedDB/);
});

test('公開HTMLはプライバシー・SEO・アクセシビリティ契約を持つ', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');

  assert.match(html, /画像はこの端末から外へ送りません/);
  assert.match(html, /ブラウザ内だけで処理します/);
  assert.match(html, /画像本体をサーバーや外部AIへ送りません/);
  assert.match(html, /位置情報や撮影日時は引き継ぎません/);
  assert.match(html, /meta name="referrer" content="no-referrer"/);
  assert.match(html, /og:locale/);
  assert.match(html, /og:image:alt/);
  assert.match(html, /twitter:image:alt/);
  assert.match(html, /accept="\.png,\.jpg,\.jpeg,\.webp,image\/png,image\/jpeg,image\/webp" multiple/);
  assert.match(html, /role="button" tabindex="0"/);
  assert.match(html, /"@type": "WebApplication"/);
  assert.match(html, /"price": "0"/);
  assert.match(html, /"@type": "BreadcrumbList"/);
});

test('画像本体は通信・永続保存せず、切り取り位置だけ端末内に保存する', () => {
  const processingFiles = ['core.js', 'image.js', 'preview.js', 'zip.js', 'script.js'].map((name) =>
    fs.readFileSync(path.join(ROOT, 'screenshot-crop', name), 'utf8')
  );
  const source = processingFiles.join('\n');
  const profileSource = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'device-profiles.js'), 'utf8');
  const presetSource = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'crop-presets.js'), 'utf8');

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /XMLHttpRequest/);
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /sessionStorage/);
  assert.doesNotMatch(source, /indexedDB/);
  assert.doesNotMatch(source, /sendBeacon/);
  assert.doesNotMatch(source, /WebSocket/);
  assert.match(source, /canvas\.toBlob/);
  assert.match(source, /pagehide/);

  assert.match(profileSource, /localStorage/);
  assert.doesNotMatch(profileSource, /FileReader|createObjectURL|thumbnail|EXIF|fileName|filename|imageData/);
  assert.match(presetSource, /localStorage/);
  assert.doesNotMatch(presetSource, /FileReader|createObjectURL|thumbnail|EXIF|fileName|filename|imageData/);
});

test('ロジック・ZIP・UIを分離して読み込む', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');
  const zipSource = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'zip.js'), 'utf8');

  assert.match(html, /\.\/core\.js/);
  assert.match(html, /\.\/device-profiles\.js/);
  assert.match(html, /\.\/crop-presets\.js/);
  assert.match(html, /\.\/image\.js/);
  assert.match(html, /\.\/preview\.js/);
  assert.match(html, /\.\/zip\.js/);
  assert.match(html, /\.\/script\.js/);
  assert.ok(html.indexOf('./core.js') < html.indexOf('./device-profiles.js'));
  assert.ok(html.indexOf('./device-profiles.js') < html.indexOf('./crop-presets.js'));
  assert.ok(html.indexOf('./crop-presets.js') < html.indexOf('./image.js'));
  assert.ok(html.indexOf('./image.js') < html.indexOf('./preview.js'));
  assert.ok(html.indexOf('./preview.js') < html.indexOf('./zip.js'));
  assert.ok(html.indexOf('./zip.js') < html.indexOf('./script.js'));
  assert.match(script, /window\.ScreenshotCropCore/);
  assert.match(script, /window\.ScreenshotCropDeviceProfiles/);
  assert.match(script, /window\.ScreenshotCropPresets/);
  assert.match(script, /window\.ScreenshotCropImage/);
  assert.match(script, /window\.ScreenshotCropPreview/);
  assert.match(script, /window\.ScreenshotCropZip/);
  assert.doesNotMatch(script, /function crc32\(/);
  assert.doesNotMatch(script, /function estimateCrop\(/);
  assert.doesNotMatch(script, /function analyzeImageEdges\(/);
  assert.doesNotMatch(script, /function exportCroppedBlob\(/);
  assert.doesNotMatch(script, /function drawActiveBoundaries\(/);
  assert.doesNotMatch(script, /function closestEdge\(/);
  assert.match(zipSource, /localParts\.push\(localHeader, nameBytes, entry\.blob\)/);
});

test('クリップボード向け書き出しはPNGを指定できる', () => {
  const source = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'image.js'), 'utf8');
  assert.match(source, /options = \{\}/);
  assert.match(source, /options\.mime \|\| outputMime\(file\)/);
});

test('画像処理モジュールは縮小サムネイルとCanvas書き出しを担当する', () => {
  const source = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'image.js'), 'utf8');
  assert.match(source, /createThumbnailBlob/);
  assert.match(source, /thumbnailSize/);
  assert.match(source, /exportCroppedBlob/);
  assert.match(source, /analyzeImageEdges/);
});

test('UIコントローラはLRUを操作用デコードに限定する', () => {
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');
  assert.match(script, /decodeCache\.get\(item\.id, item\.objectUrl\)/);
  assert.match(script, /decodedImage \|\| await decodeObjectUrl\(item\.objectUrl\)/);
  assert.match(script, /decodeCache\.remove\(item\.id\)/);
  assert.match(script, /decodeCache\.clear\(\)/);
});

test('バッチ一覧はイベント委譲し、項目ごとのclick listenerを作らない', () => {
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');
  assert.match(script, /batchList\.addEventListener\('click', onBatchListClick\)/);
  const createBlock = script.match(/function createBatchButton[\s\S]*?\n  \}/)?.[0] || '';
  assert.doesNotMatch(createBlock, /addEventListener/);
});

test('次画像はアイドル時間に先読みして自動判定する', () => {
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');
  assert.match(script, /scheduleNextItemPreparation/);
  assert.match(script, /requestIdleCallback/);
  assert.match(script, /decodeItem\(nextItem\)/);
  assert.match(script, /computeAutoForItem\(nextItem, image\)/);
  assert.match(script, /nextPreparationToken/);
  assert.match(script, /state\.items\[state\.currentIndex \+ 1\] !== nextItem/);
});

test('高頻度のプレビュー更新はrequestAnimationFrameで集約する', () => {
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');
  assert.match(script, /scheduleInteractiveRender/);
  assert.match(script, /requestAnimationFrame/);
  assert.match(script, /flushInteractiveRender/);
});

test('複数枚サムネイルは元画像URLを直接imgへ差し込まない', () => {
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');
  assert.match(script, /thumbnailUrl/);
  assert.match(script, /thumbnailFailed/);
  assert.match(script, /createThumbnailBlob/);
  assert.match(script, /requestIdleCallback/);
  assert.match(script, /getPreviewBase/);
  assert.match(script, /previewCache/);
  assert.doesNotMatch(script, /image\.src = item\.objectUrl;\s*image\.alt = ''/);
});

test('ツールはローカルCSS・JSだけで成立し、外部画像処理ライブラリを読み込まない', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');
  assert.match(html, /\.\/style\.css/);
  assert.match(html, /\.\/core\.js/);
  assert.match(html, /\.\/device-profiles\.js/);
  assert.match(html, /\.\/crop-presets\.js/);
  assert.match(html, /\.\/image\.js/);
  assert.match(html, /\.\/preview\.js/);
  assert.match(html, /\.\/zip\.js/);
  assert.match(html, /\.\/script\.js/);
  assert.match(html, /\.\/pwa\.js/);
  assert.doesNotMatch(html, /<script[^>]+https?:\/\//i);
});

test('短い画面ではクイック操作を固定表示できる', () => {
  const css = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'style.css'), 'utf8');
  assert.match(css, /@media \(max-height: 650px\) and \(min-width: 700px\)/);
  assert.match(css, /body\.has-editor \.quick-action-dock:not\(\[hidden\]\)/);
  assert.match(css, /body\.has-editor \.tools-link/);
});




test('初見の2340×1080はPCへ決め打ちせず、保存済み端末設定を優先できる', () => {
  assert.equal(logic.detectDeviceType(2340, 1080), 'generic');
  assert.equal(logic.detectDeviceType(1920, 1080), 'desktop-landscape');

  const landscape = logic.estimateCrop(2340, 1080, 'phone-landscape', true, {});
  assert.ok(landscape.crop.top > 0);
  assert.equal(landscape.crop.bottom, 0);
  assert.equal(landscape.crop.left, 0);
  assert.equal(landscape.crop.right, 0);
});

test('1080×2340で覚えた278pxは1080×5000でも高さ比例せず278pxのまま', () => {
  const first = deviceProfiles.upsertProfile([], {
    width: 1080,
    height: 2340,
    detected: 'phone-portrait',
    edge: 'top',
    cropPx: 278,
  });
  assert.equal(first.changed, true);
  assert.equal(first.created, true);

  const match = deviceProfiles.resolveProfile(first.profiles, 1080, 5000);
  assert.equal(match.matchType, 'profile');
  assert.equal(match.detected, 'phone-portrait');
  assert.equal(match.profile.cropPx, 278);
  assert.equal(match.profile.baseWidth, 1080);
  assert.equal(match.profile.baseHeight, 2340);
});

test('ロングスクショで300pxへ変更すると同じ縦プロフィールだけを更新する', () => {
  const first = deviceProfiles.upsertProfile([], {
    width: 1080,
    height: 2340,
    detected: 'phone-portrait',
    edge: 'top',
    cropPx: 278,
  });
  const updated = deviceProfiles.upsertProfile(first.profiles, {
    width: 1080,
    height: 5000,
    detected: 'phone-portrait',
    edge: 'top',
    cropPx: 300,
  });

  assert.equal(updated.changed, true);
  assert.equal(updated.created, false);
  assert.equal(updated.profiles.length, 1);
  assert.equal(updated.profile.cropPx, 300);
  assert.equal(updated.profile.baseWidth, 1080);
  assert.equal(updated.profile.baseHeight, 2340);

  const same = deviceProfiles.upsertProfile(updated.profiles, {
    width: 1080,
    height: 5000,
    detected: 'phone-portrait',
    edge: 'top',
    cropPx: 300,
  });
  assert.equal(same.changed, false);
});

test('縦プロフィールがある2340×1080は同じスマホ横向き候補になり、別設定を持てる', () => {
  const portrait = deviceProfiles.upsertProfile([], {
    width: 1080,
    height: 2340,
    detected: 'phone-portrait',
    edge: 'top',
    cropPx: 278,
  });
  const rotated = deviceProfiles.resolveProfile(portrait.profiles, 2340, 1080);

  assert.equal(rotated.matchType, 'rotated-device');
  assert.equal(rotated.detected, 'phone-landscape');
  assert.equal(rotated.suggestedEdge, 'top');
  assert.equal(rotated.profile, null);

  const landscape = deviceProfiles.upsertProfile(portrait.profiles, {
    width: 2340,
    height: 1080,
    detected: 'phone-landscape',
    edge: 'top',
    cropPx: 64,
  });
  assert.equal(landscape.profiles.length, 2);
  assert.equal(landscape.profile.deviceKey, portrait.profile.deviceKey);

  const resolved = deviceProfiles.resolveProfile(landscape.profiles, 2340, 1080);
  assert.equal(resolved.matchType, 'profile');
  assert.equal(resolved.profile.cropPx, 64);
  assert.equal(resolved.profile.edge, 'top');
});

test('PCは下側のpxを別プロフィールとして記憶できる', () => {
  const pc = deviceProfiles.upsertProfile([], {
    width: 1920,
    height: 1080,
    detected: 'desktop-landscape',
    edge: 'bottom',
    cropPx: 48,
  });
  const resolved = deviceProfiles.resolveProfile(pc.profiles, 1920, 1080);
  assert.equal(resolved.detected, 'desktop-landscape');
  assert.equal(resolved.profile.edge, 'bottom');
  assert.equal(resolved.profile.cropPx, 48);
});

test('端末設定の永続化には画像・ファイル名・EXIFを含めない', () => {
  const memory = new Map();
  const storage = {
    getItem(key) { return memory.get(key) || null; },
    setItem(key, value) { memory.set(key, value); },
  };
  const result = deviceProfiles.upsertProfile([], {
    width: 1080,
    height: 2340,
    detected: 'phone-portrait',
    edge: 'top',
    cropPx: 278,
  });

  assert.equal(deviceProfiles.saveProfiles(result.profiles, storage), true);
  const raw = memory.get(deviceProfiles.STORAGE_KEY);
  assert.match(raw, /"cropPx":278/);
  assert.doesNotMatch(raw, /"(?:file|fileName|filename|exif|thumbnail)"|data:image|blob:/i);

  const loaded = deviceProfiles.loadProfiles(storage);
  assert.equal(loaded.length, 1);
  assert.deepEqual(Object.keys(loaded[0]).sort(), [
    'baseHeight',
    'baseWidth',
    'cropPx',
    'deviceClass',
    'deviceKey',
    'edge',
    'orientation',
    'version',
  ]);
});

test('保存・コピー・共有・ZIPの成功後にだけ端末設定を確定し、通知は非モーダル', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'style.css'), 'utf8');

  assert.match(html, /id="profileToast"[^>]*role="status"/);
  assert.doesNotMatch(html, /覚えますか/);
  assert.match(script, /rememberSuccessfulItems\(\[item\]\)/);
  assert.match(script, /rememberSuccessfulItems\(state\.items\)/);
  assert.match(script, /9000/);
  assert.match(script, /この切り取り位置を覚えました/);
  assert.match(css, /\.profile-toast/);
  assert.match(css, /pointer-events:\s*none/);
});

test('複数画像は各itemが個別の切る辺と端末照合結果を保持する', () => {
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');
  assert.match(script, /enabledEdges:\s*null/);
  assert.match(script, /profileMatch:\s*null/);
  assert.match(script, /resolveProfile\(state\.profiles, width, height\)/);
  assert.match(script, /item\.enabledEdges = edgesForAutoType/);
  assert.match(script, /prepareItemForExport\(item\)/);
});


test('辺のON/OFFは現在画像だけに適用し、他画像の自動判定を上書きしない', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');
  const handler = script.match(/els\.edgeInputs\.forEach\(\(input\) => \{[\s\S]*?els\.modeButtons\.forEach/)?.[0] || '';

  assert.match(html, /いま表示している画像だけに反映します/);
  assert.match(handler, /const item = currentItem\(\)/);
  assert.match(handler, /item\.enabledEdges = cloneEdges\(state\.enabledEdges\)/);
  assert.match(handler, /state\.manualTouched = true/);
  assert.match(handler, /item\.manualTouched = true/);
  assert.match(handler, /item\.inheritedBatchAdjustment = false/);
  assert.match(handler, /state\.lastManualBatchAdjustment = null/);
  assert.doesNotMatch(handler, /state\.items\.forEach/);
});

test('黄色ガイドは中央ハンドルなしの均一な細線にする', () => {
  const previewSource = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'preview.js'), 'utf8');
  assert.match(previewSource, /strokeStyle = '#f6c344'/);
  assert.match(previewSource, /lineWidth = 1\.5/);
  assert.doesNotMatch(previewSource, /drawHandle|roundRect/);
});

test('同一バッチでは直近の手動調整値を同系統の次画像へ引き継ぐ', () => {
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');

  assert.match(script, /lastManualBatchAdjustment:\s*null/);
  assert.match(script, /function recordManualBatchAdjustment\(edge\)/);
  assert.match(script, /function canApplyManualBatchAdjustment\(item, adjustment\)/);
  assert.match(script, /function applyManualBatchAdjustment\(item\)/);
  assert.match(script, /item\.detected !== adjustment\.detected/);
  assert.match(script, /item\.manualTouched \|\| item\.saved/);
  assert.match(script, /recordManualBatchAdjustment\(state\.draggingEdge\)/);
  assert.match(script, /recordManualBatchAdjustment\(edge\)/);
  assert.match(script, /前の画像で調整した位置に合わせました/);
});

test('複数画像はZIPと通常画像の個別保存を選べる', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');

  assert.match(html, /id="saveAllIndividualButton"/);
  assert.match(html, /未確認の画像も自動候補のまま処理できます/);
  assert.match(script, /async function saveAllIndividually\(\)/);
  assert.match(script, /複数ダウンロードの確認/);
  assert.match(script, /rememberSuccessfulItems\(state\.items\)/);
});


test('プリセットは3枠だけを持ち、上下左右のON/OFFとpxだけを保存する', () => {
  const initial = cropPresets.emptyPresets();
  assert.equal(initial.length, 3);
  assert.deepEqual(initial, [null, null, null]);

  const saved = cropPresets.setPreset(
    initial,
    1,
    { top: true, bottom: true, left: false, right: false },
    { top: 278, bottom: 40, left: 12, right: 14 },
  );
  assert.equal(saved.changed, true);
  assert.deepEqual(saved.preset, {
    version: 1,
    slot: 1,
    enabledEdges: { top: true, bottom: true, left: false, right: false },
    crop: { top: 278, bottom: 40, left: 0, right: 0 },
  });
  assert.equal(saved.presets[1], null);
  assert.equal(saved.presets[2], null);
});

test('プリセットのpx値はロングスクショでも割合変換せずそのまま保持する', () => {
  const saved = cropPresets.setPreset(
    cropPresets.emptyPresets(),
    1,
    { top: true, bottom: false, left: false, right: false },
    { top: 278, bottom: 0, left: 0, right: 0 },
  );

  const preset = cropPresets.getPreset(saved.presets, 1);
  assert.equal(preset.crop.top, 278);
  assert.equal(logic.normalizeCrop(preset.crop, 1080, 5000).top, 278);
});

test('プリセットは明示保存・明示上書き・明示削除だけで変わる', () => {
  const first = cropPresets.setPreset(
    cropPresets.emptyPresets(),
    2,
    { top: true, bottom: false, left: false, right: false },
    { top: 278, bottom: 0, left: 0, right: 0 },
  );
  assert.equal(cropPresets.getPreset(first.presets, 2).crop.top, 278);

  const overwritten = cropPresets.setPreset(
    first.presets,
    2,
    { top: true, bottom: false, left: false, right: false },
    { top: 282, bottom: 0, left: 0, right: 0 },
  );
  assert.equal(cropPresets.getPreset(overwritten.presets, 2).crop.top, 282);

  const deleted = cropPresets.deletePreset(overwritten.presets, 2);
  assert.equal(deleted.deleted, true);
  assert.equal(cropPresets.getPreset(deleted.presets, 2), null);
});

test('プリセット永続化に画像・ファイル名・解像度を含めない', () => {
  const memory = new Map();
  const storage = {
    getItem(key) { return memory.get(key) || null; },
    setItem(key, value) { memory.set(key, value); },
  };
  const result = cropPresets.setPreset(
    cropPresets.emptyPresets(),
    3,
    { top: true, bottom: true, left: false, right: false },
    { top: 278, bottom: 42, left: 0, right: 0 },
  );

  assert.equal(cropPresets.savePresets(result.presets, storage), true);
  const raw = memory.get(cropPresets.STORAGE_KEY);
  assert.match(raw, /"slot":3/);
  assert.match(raw, /"top":278/);
  assert.doesNotMatch(raw, /file|filename|thumbnail|exif|width|height|data:image|blob:/i);

  const loaded = cropPresets.loadPresets(storage);
  assert.equal(loaded.length, 3);
  assert.equal(loaded[2].crop.bottom, 42);
});

test('プリセットUIは画像より後の操作欄に置き、保存・上書き・削除を明示操作にする', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');

  assert.equal((html.match(/data-preset-slot="/g) || []).length, 3);
  assert.match(html, /id="presetSlot1"/);
  assert.match(html, /id="presetSlot2"/);
  assert.match(html, /id="presetSlot3"/);
  assert.match(html, /id="presetSaveButton"/);
  assert.match(html, /id="presetDeleteButton"[^>]*hidden/);
  assert.ok(html.indexOf('id="presetBar"') > html.indexOf('id="edge-control-title"'));
  assert.ok(html.indexOf('id="presetBar"') < html.indexOf('class="export-card"'));

  assert.match(script, /applyPresetToCurrentImage/);
  assert.match(script, /現在の切り方で上書き/);
  assert.match(script, /現在の切り方を保存/);
  assert.match(script, /deleteSelectedPreset/);
  assert.doesNotMatch(script, /recordManualBatchAdjustment\([^)]*preset/i);
});


test('スマホ版は画像を主役にしつつ主要操作を44px以上で押しやすくする', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'style.css'), 'utf8');

  assert.match(html, /id="removeCurrentButton"[^>]*aria-label="現在の画像を一覧から外す"[^>]*>画像を外す<\/button>/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(css, /#replaceButton[\s\S]*min-height: 44px/);
  assert.match(css, /#removeCurrentButton[\s\S]*min-height: 44px/);
  assert.match(css, /preview-toolbar-simple \.compare-button[\s\S]*min-height: 44px/);
  assert.match(css, /grid-template-columns: repeat\(3, 44px\)/);
  assert.match(css, /\.preset-slot \{[\s\S]*min-height: 44px/);
  assert.match(css, /\.batch-arrow \{[\s\S]*width: 44px;[\s\S]*height: 44px/);
  assert.match(css, /\.quick-action-dock \.quick-action \{[\s\S]*min-height: 44px/);
});


test('複数枚は未確認・自動・調整済・保存済の状態を見分けて次の未確認へ移動できる', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'style.css'), 'utf8');

  assert.match(html, /id="batchReview"[^>]*hidden/);
  assert.match(html, /id="batchReviewText"/);
  assert.match(html, /id="reviewNextButton"[^>]*hidden>未確認を見る<\/button>/);
  assert.match(script, /visited:\s*false/);
  assert.match(script, /item\.visited = true/);
  assert.match(script, /function batchStatus\(item\)/);
  assert.match(script, /未確認/);
  assert.match(script, /調整済/);
  assert.match(script, /保存済/);
  assert.match(script, /function activateNextUnreviewed\(\)/);
  assert.match(script, /state\.items\.findIndex\(\(item\) => !item\.visited\)/);
  assert.match(css, /batch-item\[data-status="unreviewed"\]/);
  assert.match(css, /batch-item\[data-status="auto"\]/);
  assert.match(css, /batch-item\[data-status="adjusted"\]/);
  assert.match(css, /batch-item\[data-status="saved"\]/);
});

test('編集開始後は説明コンテンツを退避し、プライバシー説明を一行に絞る', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'style.css'), 'utf8');

  assert.match(html, /class="privacy-inline-note">🔒 画像本体をサーバーや外部AIへ送りません<\/p>/);
  assert.doesNotMatch(html, /class="privacy-note"/);
  assert.match(html, /id="exportPrivacy">位置情報や撮影日時は引き継ぎません。<\/p>/);
  assert.match(css, /body\.has-editor \.tool-start/);
  assert.match(css, /body\.has-editor \.explain-section/);
  assert.match(css, /body\.has-editor \.faq-section/);
});

test('複数枚の一括保存はZIPの意味が分かる文言にする', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'script.js'), 'utf8');

  assert.match(html, /1つにまとめる（ZIP）/);
  assert.match(script, /枚を1つにまとめる（ZIP）/);
  assert.match(html, /「1つにまとめる（ZIP）」ならすべてを1つのファイルにまとめられます/);
});


test('利用規約はブラウザツールの出力確認・権利・ローカル保存データを明記する', () => {
  const terms = fs.readFileSync(path.join(ROOT, 'terms.html'), 'utf8');

  assert.match(terms, /保存、共有、公開その他の利用を行う前に、自ら出力内容を確認/);
  assert.match(terms, /コピー、共有、複数ファイルのダウンロード、PWA、オフライン利用/);
  assert.match(terms, /利用、加工、保存、公開等に必要な権利または許可/);
  assert.match(terms, /ブラウザ内処理およびローカル保存データ/);
  assert.match(terms, /ブラウザのサイトデータやストレージの削除/);
  assert.match(terms, /バックアップ、復元、端末間同期または別ブラウザへの移行を保証しません/);
  assert.match(terms, /サービスの変更、提供終了、仕様変更/);
  assert.match(terms, /最終更新：2026年10月2日/);
});

test('FAQは個別保存・ZIP保存とプリセット消失条件を現在仕様どおり説明する', () => {
  const html = fs.readFileSync(path.join(ROOT, 'screenshot-crop', 'index.html'), 'utf8');

  assert.match(html, /「個別保存」なら加工後の画像を通常の画像ファイルとして順に保存/);
  assert.match(html, /「1つにまとめる（ZIP）」ならすべてを1つのファイルにまとめられます/);
  assert.match(html, /複数ファイルのダウンロード許可を求められる場合があります/);
  assert.match(html, /プリセットや前回の切り取り位置はどこに保存されますか？/);
  assert.match(html, /アカウントやクラウドへ同期しません/);
  assert.match(html, /ブラウザのサイトデータやストレージを削除した場合/);
  assert.match(html, /ブラウザや端末を変更・初期化した場合/);
  assert.match(html, /バックアップ・復元・端末間同期には対応していません/);
});
