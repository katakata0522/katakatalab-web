(() => {
  'use strict';

  const CONFIG = Object.freeze({
    maxBytes: 25 * 1024 * 1024,
    maxPixels: 40_000_000,
    maxDimension: 12_000,
    decodeTimeoutMs: 8_000,
    maxBatchCount: 8,
    maxBatchBytes: 50 * 1024 * 1024,
    allowedMimeTypes: Object.freeze(['image/png', 'image/jpeg', 'image/webp']),
    analysisWidth: 420,
    minRemainPx: 80,
    previewMaxHeight: 720,
    previewViewportRatio: 0.62,
    thumbnailSize: 72,
    decodedCacheMaxEntries: 2,
    decodedCacheMaxPixels: 18_000_000,
  });

  const EDGE_KEYS = Object.freeze(['top', 'bottom', 'left', 'right']);

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function defaultEdges() {
    return { top: true, bottom: false, left: false, right: false };
  }

  function cloneEdges(edges) {
    return {
      top: Boolean(edges?.top),
      bottom: Boolean(edges?.bottom),
      left: Boolean(edges?.left),
      right: Boolean(edges?.right),
    };
  }

  function cloneCrop(crop) {
    return {
      top: Math.max(0, Math.round(crop?.top || 0)),
      bottom: Math.max(0, Math.round(crop?.bottom || 0)),
      left: Math.max(0, Math.round(crop?.left || 0)),
      right: Math.max(0, Math.round(crop?.right || 0)),
    };
  }

  function applyEdgeSelection(crop, enabledEdges) {
    const edges = cloneEdges(enabledEdges);
    return {
      top: edges.top ? Math.max(0, Math.round(crop?.top || 0)) : 0,
      bottom: edges.bottom ? Math.max(0, Math.round(crop?.bottom || 0)) : 0,
      left: edges.left ? Math.max(0, Math.round(crop?.left || 0)) : 0,
      right: edges.right ? Math.max(0, Math.round(crop?.right || 0)) : 0,
    };
  }

  function fallbackEdgeCrop(width, height, edge) {
    if (edge === 'left' || edge === 'right') {
      return clamp(Math.round(width * 0.012), 4, 48);
    }
    return clamp(Math.round(height * 0.03), 8, 160);
  }

  function normalizeCrop(crop, width, height) {
    const minRemainW = Math.min(CONFIG.minRemainPx, Math.max(24, Math.round(width * 0.25)));
    const minRemainH = Math.min(CONFIG.minRemainPx, Math.max(24, Math.round(height * 0.25)));
    const next = {
      top: clamp(Math.round(crop.top || 0), 0, Math.max(0, height - minRemainH)),
      right: clamp(Math.round(crop.right || 0), 0, Math.max(0, width - minRemainW)),
      bottom: clamp(Math.round(crop.bottom || 0), 0, Math.max(0, height - minRemainH)),
      left: clamp(Math.round(crop.left || 0), 0, Math.max(0, width - minRemainW)),
    };

    if (next.left + next.right > width - minRemainW) {
      const overflow = next.left + next.right - (width - minRemainW);
      next.right = Math.max(0, next.right - overflow);
    }
    if (next.top + next.bottom > height - minRemainH) {
      const overflow = next.top + next.bottom - (height - minRemainH);
      next.bottom = Math.max(0, next.bottom - overflow);
    }
    return next;
  }

  function buildSelectedCrop(crop, enabledEdges, width, height) {
    const selected = applyEdgeSelection(crop, enabledEdges);
    EDGE_KEYS.forEach((edge) => {
      if (enabledEdges[edge] && selected[edge] === 0) {
        selected[edge] = fallbackEdgeCrop(width, height, edge);
      }
    });
    return normalizeCrop(selected, width, height);
  }

  function isAllowedMimeType(type) {
    return CONFIG.allowedMimeTypes.includes(String(type || '').toLowerCase());
  }

  function validateImageDimensions(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 'invalid-size';
    if (width > CONFIG.maxDimension || height > CONFIG.maxDimension) return 'too-large-dimension';
    if (width * height > CONFIG.maxPixels) return 'too-many-pixels';
    return '';
  }

  function validateFile(file) {
    if (!file || !isAllowedMimeType(file.type)) return 'unsupported-type';
    if (file.size > CONFIG.maxBytes) return 'too-large-file';
    return '';
  }

  function detectDeviceType(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 'generic';
    const portraitRatio = height / width;
    const landscapeRatio = width / height;

    if (portraitRatio >= 1.55 && width >= 320) return 'phone-portrait';

    // 横長はスマホ横向きとPCを寸法だけで断定しない。
    // 典型的なPC比率だけをPC候補にし、超横長は保存済み端末設定へ委ねる。
    if (landscapeRatio >= 1.3 && landscapeRatio <= 1.95 && width >= 1200) {
      return 'desktop-landscape';
    }
    if (landscapeRatio >= 1.55 && width < 1200 && height < 900) {
      return 'phone-landscape';
    }
    return 'generic';
  }

  function getSafeMargin(width, height, enabled) {
    if (!enabled) return 0;
    return clamp(Math.round(Math.min(width, height) * 0.008), 3, 18);
  }

  function getNominalCrop(width, height, deviceType, safeMargin = true) {
    const margin = getSafeMargin(width, height, safeMargin);
    const zero = { top: 0, right: 0, bottom: 0, left: 0 };

    if (deviceType === 'phone-portrait') {
      return {
        top: Math.round(height * 0.034) + margin,
        right: 0,
        bottom: Math.round(height * 0.038) + margin,
        left: 0,
      };
    }

    if (deviceType === 'phone-landscape') {
      return {
        top: Math.round(height * 0.034) + margin,
        right: 0,
        bottom: 0,
        left: 0,
      };
    }

    if (deviceType === 'desktop-landscape') {
      return {
        top: 0,
        right: 0,
        bottom: Math.round(height * 0.052) + margin,
        left: 0,
      };
    }

    return zero;
  }

  function estimateCrop(width, height, requestedMode, safeMargin, boundaries = {}) {
    const detected = detectDeviceType(width, height);
    const explicitType = ['phone-portrait', 'phone-landscape', 'desktop-landscape'].includes(requestedMode)
      ? requestedMode
      : '';
    const mode = explicitType
      || (requestedMode === 'auto'
        ? detected
        : requestedMode === 'phone'
          ? (height >= width ? 'phone-portrait' : 'phone-landscape')
          : requestedMode === 'desktop'
            ? 'desktop-landscape'
            : detected);

    const margin = getSafeMargin(width, height, safeMargin);
    let crop = getNominalCrop(width, height, mode, safeMargin);

    if (mode === 'phone-portrait') {
      if (Number.isFinite(boundaries.top)) crop.top = Math.round(boundaries.top) + margin;
      if (Number.isFinite(boundaries.bottom)) crop.bottom = Math.round(boundaries.bottom) + margin;
    } else if (mode === 'phone-landscape') {
      if (Number.isFinite(boundaries.top)) crop.top = Math.round(boundaries.top) + margin;
    } else if (mode === 'desktop-landscape') {
      if (Number.isFinite(boundaries.bottom)) {
        crop.bottom = Math.round(boundaries.bottom) + margin;
      } else if (requestedMode === 'auto') {
        crop.bottom = 0;
      }
    }

    return {
      detected,
      appliedType: mode,
      crop: normalizeCrop(crop, width, height),
    };
  }

  function rowDifference(imageData, y) {
    const { width, data } = imageData;
    if (y < 0 || y >= imageData.height - 1) return 0;
    const sampleStep = Math.max(1, Math.floor(width / 120));
    let sum = 0;
    let count = 0;

    for (let x = 0; x < width; x += sampleStep) {
      const a = (y * width + x) * 4;
      const b = ((y + 1) * width + x) * 4;
      sum += (Math.abs(data[a] - data[b])
        + Math.abs(data[a + 1] - data[b + 1])
        + Math.abs(data[a + 2] - data[b + 2])) / 3;
      count += 1;
    }
    return count ? sum / count : 0;
  }

  function columnDifference(imageData, x) {
    const { width, height, data } = imageData;
    if (x < 0 || x >= width - 1) return 0;
    const sampleStep = Math.max(1, Math.floor(height / 120));
    let sum = 0;
    let count = 0;

    for (let y = 0; y < height; y += sampleStep) {
      const a = (y * width + x) * 4;
      const b = (y * width + x + 1) * 4;
      sum += (Math.abs(data[a] - data[b])
        + Math.abs(data[a + 1] - data[b + 1])
        + Math.abs(data[a + 2] - data[b + 2])) / 3;
      count += 1;
    }
    return count ? sum / count : 0;
  }

  function pickCrediblePeak(scores) {
    if (!scores.length) return null;
    const mean = scores.reduce((total, item) => total + item.score, 0) / scores.length;
    const variance = scores.reduce((total, item) => total + ((item.score - mean) ** 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const peak = scores.reduce((best, item) => item.score > best.score ? item : best, scores[0]);

    if (peak.score < 8 || peak.score < mean + Math.max(3, stdDev * 1.15)) return null;
    return peak.index;
  }

  function findHorizontalBoundary(imageData, startRatio, endRatio) {
    const start = clamp(Math.floor(imageData.height * startRatio), 0, imageData.height - 2);
    const end = clamp(Math.ceil(imageData.height * endRatio), start + 1, imageData.height - 1);
    const scores = [];
    for (let y = start; y < end; y += 1) {
      scores.push({ index: y, score: rowDifference(imageData, y) });
    }
    return pickCrediblePeak(scores);
  }

  function findVerticalBoundary(imageData, startRatio, endRatio) {
    const start = clamp(Math.floor(imageData.width * startRatio), 0, imageData.width - 2);
    const end = clamp(Math.ceil(imageData.width * endRatio), start + 1, imageData.width - 1);
    const scores = [];
    for (let x = start; x < end; x += 1) {
      scores.push({ index: x, score: columnDifference(imageData, x) });
    }
    return pickCrediblePeak(scores);
  }

  function outputMime(file) {
    if (file?.type === 'image/jpeg') return 'image/jpeg';
    if (file?.type === 'image/webp') return 'image/webp';
    return 'image/png';
  }

  function outputName(file, mime, prefix = '') {
    const original = file?.name || 'screenshot';
    const base = original
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_\-ぁ-んァ-ヶ一-龠]+/g, '-')
      .slice(0, 70) || 'screenshot';
    const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
    return `${prefix}${base}-safe.${ext}`;
  }

  const api = Object.freeze({
    CONFIG,
    EDGE_KEYS,
    clamp,
    defaultEdges,
    cloneEdges,
    cloneCrop,
    applyEdgeSelection,
    fallbackEdgeCrop,
    buildSelectedCrop,
    normalizeCrop,
    isAllowedMimeType,
    validateImageDimensions,
    validateFile,
    detectDeviceType,
    getSafeMargin,
    getNominalCrop,
    estimateCrop,
    findHorizontalBoundary,
    findVerticalBoundary,
    outputMime,
    outputName,
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ScreenshotCropCore = api;
})();
