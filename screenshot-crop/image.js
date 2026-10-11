(() => {
  'use strict';

  const Core = typeof window !== 'undefined'
    ? window.ScreenshotCropCore
    : (typeof module !== 'undefined' && module.exports ? require('./core.js') : null);
  const Redaction = typeof window !== 'undefined'
    ? window.ScreenshotCropRedaction
    : (typeof module !== 'undefined' && module.exports ? require('./redaction.js') : null);

  function requireCore() {
    if (!Core) throw new Error('Screenshot crop core is required');
    return Core;
  }

  function waitForImageDecode(image, timeoutMs) {
    const decodePromise = image.decode
      ? image.decode()
      : new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });

    return Promise.race([
      decodePromise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('decode-timeout')), timeoutMs);
      }),
    ]);
  }

  async function decodeObjectUrl(objectUrl) {
    const { CONFIG, validateImageDimensions } = requireCore();
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await waitForImageDecode(image, CONFIG.decodeTimeoutMs);

    const dimensionError = validateImageDimensions(image.naturalWidth, image.naturalHeight);
    if (dimensionError) throw new Error(dimensionError);
    return image;
  }

  function releaseDecodedImage(_image) {
    // Drop the cache reference only. Mutating HTMLImageElement.src here can
    // invalidate the same object while the editor/export path still uses it.
    // The object becomes GC-eligible once external references are gone.
  }

  function createDecodeCache(options = {}) {
    const { CONFIG } = requireCore();
    const maxEntries = Math.max(1, options.maxEntries || CONFIG.decodedCacheMaxEntries);
    const maxPixels = Math.max(1, options.maxPixels || CONFIG.decodedCacheMaxPixels);
    const decode = options.decode || decodeObjectUrl;
    const entries = new Map();
    const pending = new Map();
    const tokens = new Map();
    let tick = 0;

    function touch(entry) {
      entry.lastUsed = ++tick;
      return entry.image;
    }

    function pixelTotal() {
      let total = 0;
      entries.forEach((entry) => { total += entry.pixels; });
      return total;
    }

    function trim(preserveKey) {
      while (entries.size > maxEntries || pixelTotal() > maxPixels) {
        const candidates = [...entries.entries()]
          .filter(([key]) => key !== preserveKey)
          .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

        if (!candidates.length) break;
        const [key, entry] = candidates[0];
        releaseDecodedImage(entry.image);
        entries.delete(key);
      }
    }

    async function get(key, objectUrl) {
      const cached = entries.get(key);
      if (cached) return touch(cached);
      if (pending.has(key)) return pending.get(key);

      const token = {};
      tokens.set(key, token);
      const task = (async () => {
        const image = await decode(objectUrl);
        if (tokens.get(key) !== token) {
          releaseDecodedImage(image);
          throw new Error('decode-cancelled');
        }

        entries.set(key, {
          image,
          pixels: image.naturalWidth * image.naturalHeight,
          lastUsed: ++tick,
        });
        trim(key);
        return image;
      })().finally(() => {
        if (tokens.get(key) === token) {
          pending.delete(key);
          tokens.delete(key);
        }
      });

      pending.set(key, task);
      return task;
    }

    function remove(key) {
      tokens.delete(key);
      pending.delete(key);
      const entry = entries.get(key);
      if (!entry) return;
      releaseDecodedImage(entry.image);
      entries.delete(key);
    }

    function clear() {
      tokens.clear();
      pending.clear();
      entries.forEach((entry) => releaseDecodedImage(entry.image));
      entries.clear();
    }

    function stats() {
      return {
        entries: entries.size,
        pending: pending.size,
        pixels: pixelTotal(),
      };
    }

    return Object.freeze({ get, remove, clear, stats });
  }

  function analyzeImageEdges(image, forcedType = '') {
    const {
      CONFIG,
      detectDeviceType,
      findHorizontalBoundary,
      findVerticalBoundary,
    } = requireCore();

    try {
      const sourceW = image.naturalWidth;
      const sourceH = image.naturalHeight;
      const analysisW = Math.min(CONFIG.analysisWidth, sourceW);
      const scale = analysisW / sourceW;
      const analysisH = Math.max(1, Math.round(sourceH * scale));

      const canvas = document.createElement('canvas');
      canvas.width = analysisW;
      canvas.height = analysisH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return {};

      ctx.drawImage(image, 0, 0, analysisW, analysisH);
      const data = ctx.getImageData(0, 0, analysisW, analysisH);
      const type = forcedType || detectDeviceType(sourceW, sourceH);
      const result = {};

      if (type === 'phone-portrait') {
        const topY = findHorizontalBoundary(data, 0.018, 0.075);
        const bottomY = findHorizontalBoundary(data, 0.91, 0.995);
        if (topY !== null) result.top = Math.round((topY / analysisH) * sourceH);
        if (bottomY !== null) result.bottom = Math.round(((analysisH - bottomY) / analysisH) * sourceH);
      } else if (type === 'phone-landscape') {
        const topY = findHorizontalBoundary(data, 0.018, 0.12);
        if (topY !== null) result.top = Math.round((topY / analysisH) * sourceH);
      } else if (type === 'desktop-landscape') {
        const bottomY = findHorizontalBoundary(data, 0.90, 0.995);
        if (bottomY !== null) result.bottom = Math.round(((analysisH - bottomY) / analysisH) * sourceH);
      }

      return result;
    } catch (error) {
      console.warn('Edge analysis skipped:', error);
      return {};
    }
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('canvas-blob'));
      }, type, quality);
    });
  }

  async function createThumbnailBlob(image) {
    const { CONFIG } = requireCore();
    const size = CONFIG.thumbnailSize;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('thumbnail-context');

    const sourceW = image.naturalWidth;
    const sourceH = image.naturalHeight;
    const scale = Math.max(size / sourceW, size / sourceH);
    const sampleW = size / scale;
    const sampleH = size / scale;
    const sx = Math.max(0, (sourceW - sampleW) / 2);
    const sy = Math.max(0, (sourceH - sampleH) / 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(image, sx, sy, sampleW, sampleH, 0, 0, size, size);

    try {
      return await canvasToBlob(canvas, 'image/webp', 0.72);
    } catch {
      return canvasToBlob(canvas, 'image/png');
    }
  }

  async function exportCroppedBlob(image, file, crop, options = {}) {
    const { outputMime, outputName } = requireCore();
    const sx = crop.left;
    const sy = crop.top;
    const sw = image.naturalWidth - crop.left - crop.right;
    const sh = image.naturalHeight - crop.top - crop.bottom;
    if (sw <= 0 || sh <= 0) throw new Error('invalid-crop');

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('canvas-context');
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
    if (options.redactions?.length && Redaction?.applyRedactions) {
      Redaction.applyRedactions(canvas, options.redactions, {
        crop,
        sourceWidth: image.naturalWidth,
        sourceHeight: image.naturalHeight,
      });
    }

    // Re-encoding through Canvas creates a new image instead of passing the
    // original file through, so EXIF/GPS/camera metadata is not inherited.
    const mime = options.mime || outputMime(file);
    const quality = mime === 'image/jpeg' || mime === 'image/webp' ? 0.94 : undefined;
    const blob = await canvasToBlob(canvas, mime, quality);
    return { blob, mime, name: outputName(file, mime) };
  }

  const api = Object.freeze({
    waitForImageDecode,
    decodeObjectUrl,
    createDecodeCache,
    analyzeImageEdges,
    createThumbnailBlob,
    exportCroppedBlob,
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ScreenshotCropImage = api;
})();
