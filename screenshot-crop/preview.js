(() => {
  'use strict';

  function computeLayout(imageW, imageH, shellWidth, viewportHeight, config) {
    const maxW = Math.max(220, shellWidth - 28);
    const maxH = Math.max(
      280,
      Math.min(viewportHeight * config.previewViewportRatio, config.previewMaxHeight),
    );
    const scale = Math.min(maxW / imageW, maxH / imageH, 1);
    return {
      scale,
      drawW: Math.max(1, Math.round(imageW * scale)),
      drawH: Math.max(1, Math.round(imageH * scale)),
    };
  }

  function scaleCrop(crop, scale) {
    return {
      top: crop.top * scale,
      bottom: crop.bottom * scale,
      left: crop.left * scale,
      right: crop.right * scale,
    };
  }

  function getEdgeRects(width, height, crop) {
    return [
      { edge: 'top', x: 0, y: 0, width, height: Math.max(0, crop.top) },
      { edge: 'bottom', x: 0, y: Math.max(0, height - crop.bottom), width, height: Math.max(0, crop.bottom) },
      { edge: 'left', x: 0, y: 0, width: Math.max(0, crop.left), height },
      { edge: 'right', x: Math.max(0, width - crop.right), y: 0, width: Math.max(0, crop.right), height },
    ];
  }

  function drawActiveBoundaries(ctx, width, height, crop, enabledEdges) {
    ctx.save();
    ctx.strokeStyle = '#f6c344';
    ctx.fillStyle = '#f6c344';
    ctx.lineWidth = 1.5;

    if (enabledEdges.top && crop.top > 0) {
      ctx.beginPath();
      ctx.moveTo(0, crop.top);
      ctx.lineTo(width, crop.top);
      ctx.stroke();
    }
    if (enabledEdges.bottom && crop.bottom > 0) {
      const y = height - crop.bottom;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    if (enabledEdges.left && crop.left > 0) {
      ctx.beginPath();
      ctx.moveTo(crop.left, 0);
      ctx.lineTo(crop.left, height);
      ctx.stroke();
    }
    if (enabledEdges.right && crop.right > 0) {
      const x = width - crop.right;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCropOverlay(ctx, width, height, crop, enabledEdges) {
    ctx.save();
    ctx.fillStyle = 'rgba(9, 15, 28, 0.63)';
    getEdgeRects(width, height, crop).forEach(({ edge, x, y, width: rectW, height: rectH }) => {
      if (enabledEdges[edge] && rectW > 0 && rectH > 0) {
        ctx.fillRect(x, y, rectW, rectH);
      }
    });
    ctx.restore();

    drawActiveBoundaries(ctx, width, height, crop, enabledEdges);
  }

  function closestEdge({
    position,
    canvasWidth,
    canvasHeight,
    imageWidth,
    imageHeight,
    crop,
    enabledEdges,
    compareOriginal = false,
  }) {
    if (compareOriginal) return '';

    const scaleX = canvasWidth / imageWidth;
    const scaleY = canvasHeight / imageHeight;
    const positions = {
      top: crop.top * scaleY,
      bottom: canvasHeight - crop.bottom * scaleY,
      left: crop.left * scaleX,
      right: canvasWidth - crop.right * scaleX,
    };

    const candidates = [
      ['top', Math.abs(position.y - positions.top)],
      ['bottom', Math.abs(position.y - positions.bottom)],
      ['left', Math.abs(position.x - positions.left)],
      ['right', Math.abs(position.x - positions.right)],
    ]
      .filter(([edge]) => enabledEdges[edge])
      .sort((a, b) => a[1] - b[1]);

    if (!candidates.length) return '';
    const threshold = Math.max(18, Math.min(30, canvasWidth * 0.05));
    return candidates[0][1] <= threshold ? candidates[0][0] : '';
  }

  const api = Object.freeze({
    computeLayout,
    scaleCrop,
    getEdgeRects,
    drawCropOverlay,
    closestEdge,
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ScreenshotCropPreview = api;
})();
