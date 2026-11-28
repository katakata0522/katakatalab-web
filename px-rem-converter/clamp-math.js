/**
 * Pure clamp() & CSS typography scale math helpers for PX/REM Converter.
 * UMD-compatible for browser (window.PxRemClampMath) and Node unit testing.
 */
(function (root) {
  'use strict';

  function roundTo(value, decimals) {
    var factor = Math.pow(10, decimals);
    var rounded = Math.round(value * factor) / factor;
    return Object.is(rounded, -0) ? 0 : rounded;
  }

  function buildClampExpression(options) {
    var minPx = Number(options && options.minPx);
    var maxPx = Number(options && options.maxPx);
    var minVw = Number(options && options.minVw);
    var maxVw = Number(options && options.maxVw);
    var rootPx = Number(options && options.root);

    if (
      !Number.isFinite(minPx) || !Number.isFinite(maxPx) ||
      !Number.isFinite(minVw) || !Number.isFinite(maxVw) ||
      !Number.isFinite(rootPx) || rootPx <= 0 ||
      minPx <= 0 || maxPx <= 0 || minVw <= 0 || maxVw <= minVw
    ) {
      return null;
    }

    var lowPx = Math.min(minPx, maxPx);
    var highPx = Math.max(minPx, maxPx);
    var minRem = roundTo(lowPx / rootPx, 4);
    var maxRem = roundTo(highPx / rootPx, 4);

    if (lowPx === highPx) {
      return {
        css: 'clamp(' + minRem + 'rem, ' + minRem + 'rem, ' + maxRem + 'rem)',
        minRem: minRem,
        maxRem: maxRem,
        slopeVw: 0,
        interceptRem: minRem
      };
    }

    var slope = (maxPx - minPx) / (maxVw - minVw);
    var slopeVw = roundTo(slope * 100, 4);
    var interceptPx = minPx - slope * minVw;
    var interceptRem = roundTo(interceptPx / rootPx, 4);

    var sign = slopeVw >= 0 ? ' + ' : ' - ';
    var absSlopeVw = Math.abs(slopeVw);
    var preferred = interceptRem === 0
      ? slopeVw + 'vw'
      : interceptRem + 'rem' + sign + absSlopeVw + 'vw';

    return {
      css: 'clamp(' + minRem + 'rem, ' + preferred + ', ' + maxRem + 'rem)',
      minRem: minRem,
      maxRem: maxRem,
      slopeVw: slopeVw,
      interceptRem: interceptRem
    };
  }

  var DEFAULT_SCALE = [
    { token: '--text-xs', px: 12 },
    { token: '--text-sm', px: 14 },
    { token: '--text-base', px: 16 },
    { token: '--text-lg', px: 18 },
    { token: '--text-xl', px: 20 },
    { token: '--text-2xl', px: 24 },
    { token: '--text-3xl', px: 32 }
  ];

  function buildCssScaleVariables(rootPx) {
    var base = Number(rootPx);
    if (!Number.isFinite(base) || base <= 0) return null;
    var lines = [':root {', '  /* Root Base: ' + base + 'px */'];
    for (var i = 0; i < DEFAULT_SCALE.length; i += 1) {
      var item = DEFAULT_SCALE[i];
      var rem = roundTo(item.px / base, 4);
      lines.push('  ' + item.token + ': ' + rem + 'rem; /* ' + item.px + 'px */');
    }
    lines.push('}');
    return lines.join('\n');
  }

  var api = {
    DEFAULT_SCALE: DEFAULT_SCALE,
    buildClampExpression: buildClampExpression,
    buildCssScaleVariables: buildCssScaleVariables
  };

  if (root) {
    root.PxRemClampMath = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
