(() => {
  'use strict';

  const VALID_MODES = new Set(['black', 'blur']);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function safeNumber(value) {
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function normalizeRedaction(start, end, imageWidth, imageHeight, mode = 'black') {
    const width = Math.max(1, safeNumber(imageWidth));
    const height = Math.max(1, safeNumber(imageHeight));
    const x1 = clamp(Math.min(safeNumber(start?.x), safeNumber(end?.x)), 0, width);
    const y1 = clamp(Math.min(safeNumber(start?.y), safeNumber(end?.y)), 0, height);
    const x2 = clamp(Math.max(safeNumber(start?.x), safeNumber(end?.x)), 0, width);
    const y2 = clamp(Math.max(safeNumber(start?.y), safeNumber(end?.y)), 0, height);
    if (x2 - x1 < 4 || y2 - y1 < 4) return null;

    return {
      x: Math.round(x1),
      y: Math.round(y1),
      width: Math.max(1, Math.round(x2 - x1)),
      height: Math.max(1, Math.round(y2 - y1)),
      mode: VALID_MODES.has(mode) ? mode : 'black',
    };
  }

  function cloneRedactions(redactions) {
    if (!Array.isArray(redactions)) return [];
    return redactions.map((item) => ({
      x: Math.max(0, Math.round(safeNumber(item?.x))),
      y: Math.max(0, Math.round(safeNumber(item?.y))),
      width: Math.max(1, Math.round(safeNumber(item?.width))),
      height: Math.max(1, Math.round(safeNumber(item?.height))),
      mode: item?.mode === 'blur' ? 'blur' : 'black',
    }));
  }

  function projectRedaction(redaction, crop, sourceWidth, sourceHeight, targetWidth, targetHeight) {
    if (!redaction) return null;

    const sourceW = Math.max(1, safeNumber(sourceWidth));
    const sourceH = Math.max(1, safeNumber(sourceHeight));
    const safeCrop = {
      top: Math.max(0, safeNumber(crop?.top)),
      right: Math.max(0, safeNumber(crop?.right)),
      bottom: Math.max(0, safeNumber(crop?.bottom)),
      left: Math.max(0, safeNumber(crop?.left)),
    };

    const visibleLeft = safeCrop.left;
    const visibleTop = safeCrop.top;
    const visibleRight = Math.max(visibleLeft, sourceW - safeCrop.right);
    const visibleBottom = Math.max(visibleTop, sourceH - safeCrop.bottom);
    const x1 = Math.max(visibleLeft, safeNumber(redaction.x));
    const y1 = Math.max(visibleTop, safeNumber(redaction.y));
    const x2 = Math.min(visibleRight, safeNumber(redaction.x) + safeNumber(redaction.width));
    const y2 = Math.min(visibleBottom, safeNumber(redaction.y) + safeNumber(redaction.height));
    if (x2 <= x1 || y2 <= y1) return null;

    const scaleX = Math.max(1, safeNumber(targetWidth)) / Math.max(1, visibleRight - visibleLeft);
    const scaleY = Math.max(1, safeNumber(targetHeight)) / Math.max(1, visibleBottom - visibleTop);

    return {
      x: (x1 - visibleLeft) * scaleX,
      y: (y1 - visibleTop) * scaleY,
      width: (x2 - x1) * scaleX,
      height: (y2 - y1) * scaleY,
      mode: redaction.mode === 'blur' ? 'blur' : 'black',
    };
  }

  function createScratchCanvas(width, height, ownerDocument) {
    const doc = ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc?.createElement) return null;

    const canvas = doc.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width));
    canvas.height = Math.max(1, Math.ceil(height));
    return canvas;
  }

  function pixelateFallback(canvas, ctx, rect, block) {
    const tinyW = Math.max(1, Math.ceil(rect.width / block));
    const tinyH = Math.max(1, Math.ceil(rect.height / block));
    const scratch = createScratchCanvas(tinyW, tinyH, canvas.ownerDocument);
    const scratchCtx = scratch?.getContext?.('2d');

    if (!scratchCtx) {
      ctx.fillStyle = '#111827';
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      return;
    }

    scratchCtx.drawImage(canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, tinyW, tinyH);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(scratch, 0, 0, tinyW, tinyH, rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }

  function blurRegion(canvas, ctx, rect, radius, block) {
    if (!('filter' in ctx)) {
      pixelateFallback(canvas, ctx, rect, block);
      return;
    }

    const pad = radius * 2;
    const sx = Math.max(0, Math.floor(rect.x - pad));
    const sy = Math.max(0, Math.floor(rect.y - pad));
    const ex = Math.min(canvas.width, Math.ceil(rect.x + rect.width + pad));
    const ey = Math.min(canvas.height, Math.ceil(rect.y + rect.height + pad));
    const sw = Math.max(1, ex - sx);
    const sh = Math.max(1, ey - sy);
    const scratch = createScratchCanvas(sw, sh, canvas.ownerDocument);
    const scratchCtx = scratch?.getContext?.('2d');

    if (!scratchCtx) {
      pixelateFallback(canvas, ctx, rect, block);
      return;
    }

    scratchCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(scratch, 0, 0, sw, sh, sx, sy, sw, sh);
    ctx.filter = 'none';
    ctx.restore();
  }

  function applyRedactions(canvas, redactions, options = {}) {
    if (!canvas || !Array.isArray(redactions) || !redactions.length) return canvas;
    if (!Number.isFinite(canvas.width) || canvas.width <= 0
      || !Number.isFinite(canvas.height) || canvas.height <= 0) return canvas;

    const ctx = canvas.getContext?.('2d');
    if (!ctx) return canvas;

    const sourceWidth = Math.max(1, safeNumber(options.sourceWidth) || canvas.width);
    const sourceHeight = Math.max(1, safeNumber(options.sourceHeight) || canvas.height);
    const crop = options.crop || { top: 0, right: 0, bottom: 0, left: 0 };

    redactions.forEach((item) => {
      const rect = projectRedaction(
        item,
        crop,
        sourceWidth,
        sourceHeight,
        canvas.width,
        canvas.height,
      );
      if (!rect) return;

      if (rect.mode === 'blur') {
        // 強度は切り抜き前の元画像座標で決め、表示倍率だけを掛ける。
        // プレビューの最小半径やクロップによる細片化で強度を変えない。
        const sourceSize = Math.max(1, Math.min(safeNumber(item.width), safeNumber(item.height)));
        const scale = Math.min(
          canvas.width / Math.max(1, sourceWidth - safeNumber(crop.left) - safeNumber(crop.right)),
          canvas.height / Math.max(1, sourceHeight - safeNumber(crop.top) - safeNumber(crop.bottom)),
        );
        const radius = clamp(Math.round(sourceSize / 5), 12, 28) * scale;
        const block = clamp(Math.round(sourceSize / 10), 10, 24) * scale;
        blurRegion(canvas, ctx, rect, radius, block);
      } else {
        ctx.fillStyle = '#111827';
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      }
    });

    return canvas;
  }

  function drawDraft(ctx, draft, sourceWidth, sourceHeight, targetWidth, targetHeight) {
    if (!ctx || !draft?.start || !draft?.end) return;

    const normalized = normalizeRedaction(
      draft.start,
      draft.end,
      sourceWidth,
      sourceHeight,
      draft.mode,
    );
    if (!normalized) return;

    const rect = projectRedaction(
      normalized,
      { top: 0, right: 0, bottom: 0, left: 0 },
      sourceWidth,
      sourceHeight,
      targetWidth,
      targetHeight,
    );
    if (!rect) return;

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = draft.mode === 'blur'
      ? 'rgba(255,255,255,0.16)'
      : 'rgba(17,24,39,0.62)';
    ctx.setLineDash([7, 5]);
    ctx.lineWidth = 2;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }

  const api = Object.freeze({
    normalizeRedaction,
    cloneRedactions,
    projectRedaction,
    applyRedactions,
    drawDraft,
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ScreenshotCropRedaction = api;
})();
