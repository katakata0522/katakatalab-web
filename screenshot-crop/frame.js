(() => {
  'use strict';

  const FRAME_BACKGROUNDS = Object.freeze({
    slate: {
      id: 'slate',
      label: 'スレート',
      stops: ['#e2e8f0', '#cbd5e1'],
      angle: 135,
      border: 'rgba(15, 23, 42, 0.12)',
    },
    mist: {
      id: 'mist',
      label: 'ミスト',
      stops: ['#dbeafe', '#e0f2fe', '#f0f9ff'],
      angle: 135,
      border: 'rgba(30, 64, 175, 0.12)',
    },
    sunset: {
      id: 'sunset',
      label: 'サンセット',
      stops: ['#ffedd5', '#fed7aa', '#fecdd3'],
      angle: 135,
      border: 'rgba(154, 52, 18, 0.12)',
    },
    mint: {
      id: 'mint',
      label: 'ミント',
      stops: ['#d1fae5', '#ccfbf1', '#e0f2fe'],
      angle: 135,
      border: 'rgba(15, 118, 110, 0.12)',
    },
    midnight: {
      id: 'midnight',
      label: 'ミッドナイト',
      stops: ['#0f172a', '#1e293b', '#334155'],
      angle: 140,
      border: 'rgba(255, 255, 255, 0.16)',
    },
  });

  const PADDING_RATIOS = Object.freeze({
    sm: 0.045,
    md: 0.08,
    lg: 0.12,
  });

  const DEFAULT_FRAME_OPTIONS = Object.freeze({
    style: 'none', // 'none' | 'rounded' | 'backdrop'
    radius: 20,    // 0 | 16 | 24 | 36
    background: 'mist',
    padding: 'md', // 'sm' | 'md' | 'lg'
  });

  function normalizeFrameOptions(input) {
    const raw = input && typeof input === 'object' ? input : {};
    const style = raw.style === 'rounded' || raw.style === 'backdrop' ? raw.style : 'none';
    const radiusNum = Number(raw.radius);
    const radius = Number.isFinite(radiusNum)
      ? Math.max(0, Math.min(64, Math.round(radiusNum)))
      : DEFAULT_FRAME_OPTIONS.radius;
    const background = Object.prototype.hasOwnProperty.call(FRAME_BACKGROUNDS, raw.background)
      ? raw.background
      : DEFAULT_FRAME_OPTIONS.background;
    const padding = Object.prototype.hasOwnProperty.call(PADDING_RATIOS, raw.padding)
      ? raw.padding
      : DEFAULT_FRAME_OPTIONS.padding;
    return { style, radius, background, padding };
  }

  function isFrameActive(input) {
    const opts = normalizeFrameOptions(input);
    if (opts.style === 'backdrop') return true;
    if (opts.style === 'rounded') return opts.radius > 0;
    return false;
  }

  function computeFramedDimensions(contentW, contentH, input) {
    const w = Math.max(1, Math.round(Number(contentW) || 1));
    const h = Math.max(1, Math.round(Number(contentH) || 1));
    const opts = normalizeFrameOptions(input);

    if (opts.style !== 'backdrop') {
      const effectiveRadius = opts.style === 'rounded'
        ? Math.min(opts.radius, Math.floor(Math.min(w, h) / 4))
        : 0;
      return {
        width: w,
        height: h,
        padX: 0,
        padY: 0,
        radius: effectiveRadius,
        shadowBlur: 0,
        shadowOffsetY: 0,
      };
    }

    const baseSide = Math.min(w, h);
    const ratio = PADDING_RATIOS[opts.padding] || PADDING_RATIOS.md;
    const pad = Math.max(24, Math.min(220, Math.round(baseSide * ratio)));
    const effectiveRadius = Math.min(opts.radius, Math.floor(baseSide / 4));
    const shadowBlur = Math.max(18, Math.min(72, Math.round(pad * 0.72)));
    const shadowOffsetY = Math.max(8, Math.min(32, Math.round(pad * 0.28)));

    return {
      width: w + pad * 2,
      height: h + pad * 2,
      padX: pad,
      padY: pad,
      radius: effectiveRadius,
      shadowBlur,
      shadowOffsetY,
    };
  }

  function traceRoundedPath(ctx, x, y, w, h, radius) {
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    ctx.beginPath();
    if (r <= 0) {
      ctx.rect(x, y, w, h);
      return;
    }
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function renderFramedCanvas(sourceCanvas, input, targetCanvas = null) {
    const opts = normalizeFrameOptions(input);
    const sw = Math.max(1, Math.round(sourceCanvas.width || 1));
    const sh = Math.max(1, Math.round(sourceCanvas.height || 1));
    const dims = computeFramedDimensions(sw, sh, opts);

    const out = targetCanvas || (sourceCanvas.ownerDocument || document).createElement('canvas');
    out.width = dims.width;
    out.height = dims.height;
    const ctx = out.getContext('2d', { alpha: true });
    if (!ctx) return sourceCanvas;

    ctx.clearRect(0, 0, dims.width, dims.height);

    if (opts.style === 'backdrop') {
      const bg = FRAME_BACKGROUNDS[opts.background] || FRAME_BACKGROUNDS.mist;
      const grad = ctx.createLinearGradient(0, 0, dims.width, dims.height);
      const last = Math.max(1, bg.stops.length - 1);
      bg.stops.forEach((color, idx) => grad.addColorStop(idx / last, color));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, dims.width, dims.height);

      // Soft elevated drop shadow behind the cropped screenshot
      ctx.save();
      ctx.shadowColor = opts.background === 'midnight'
        ? 'rgba(0, 0, 0, 0.55)'
        : 'rgba(15, 23, 42, 0.22)';
      ctx.shadowBlur = dims.shadowBlur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = dims.shadowOffsetY;
      ctx.fillStyle = '#ffffff';
      traceRoundedPath(ctx, dims.padX, dims.padY, sw, sh, dims.radius);
      ctx.fill();
      ctx.restore();

      // Clipped screenshot inside rounded frame
      ctx.save();
      traceRoundedPath(ctx, dims.padX, dims.padY, sw, sh, dims.radius);
      ctx.clip();
      ctx.drawImage(sourceCanvas, dims.padX, dims.padY, sw, sh);
      ctx.restore();

      // Crisp 1px hairline border for clean separation on light/dark backdrops
      ctx.save();
      traceRoundedPath(ctx, dims.padX + 0.5, dims.padY + 0.5, sw - 1, sh - 1, Math.max(0, dims.radius - 0.5));
      ctx.strokeStyle = bg.border;
      ctx.lineWidth = Math.max(1, Math.round(Math.min(sw, sh) / 600));
      ctx.stroke();
      ctx.restore();

      return out;
    }

    if (opts.style === 'rounded' && dims.radius > 0) {
      ctx.save();
      traceRoundedPath(ctx, 0, 0, sw, sh, dims.radius);
      ctx.clip();
      ctx.drawImage(sourceCanvas, 0, 0, sw, sh);
      ctx.restore();
      return out;
    }

    ctx.drawImage(sourceCanvas, 0, 0, sw, sh);
    return out;
  }

  const api = Object.freeze({
    FRAME_BACKGROUNDS,
    PADDING_RATIOS,
    DEFAULT_FRAME_OPTIONS,
    normalizeFrameOptions,
    isFrameActive,
    computeFramedDimensions,
    traceRoundedPath,
    renderFramedCanvas,
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ScreenshotCropFrame = api;
})();
