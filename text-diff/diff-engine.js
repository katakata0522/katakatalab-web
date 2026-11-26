/**
 * KatakataLab ローカル差分エンジン (/text-diff/diff-engine.js)
 * - 外部CDN (cdnjs/jsdiff) 依存を撤廃したゼロ依存 Myers O(ND) 差分エンジン
 * - window.Diff (diffLines / diffArrays / diffChars) 互換インターフェース
 */
(function (root) {
  'use strict';

  var MAX_EDIT_DISTANCE = 4000;

  function splitLinesWithEnding(text) {
    if (!text) return [];
    var str = String(text);
    var matches = str.match(/[^\r\n]*(?:\r\n|\n|\r)?/g);
    if (!matches) return [];
    var result = [];
    for (var i = 0; i < matches.length; i += 1) {
      if (matches[i].length > 0) {
        result.push(matches[i]);
      }
    }
    return result;
  }

  function pushPart(parts, items, added, removed) {
    if (!items || items.length === 0) return;
    var last = parts.length > 0 ? parts[parts.length - 1] : null;
    if (last && Boolean(last.added) === Boolean(added) && Boolean(last.removed) === Boolean(removed)) {
      for (var i = 0; i < items.length; i += 1) {
        last.value.push(items[i]);
      }
      last.count = last.value.length;
      return;
    }
    var part = {
      count: items.length,
      value: items.slice()
    };
    if (added) part.added = true;
    if (removed) part.removed = true;
    parts.push(part);
  }

  function myersDiffSlice(oldSlice, newSlice) {
    var n = oldSlice.length;
    var m = newSlice.length;
    if (n === 0 && m === 0) return [];
    if (n === 0) return [{ count: m, value: newSlice.slice(), added: true }];
    if (m === 0) return [{ count: n, value: oldSlice.slice(), removed: true }];

    var max = n + m;
    var limit = Math.min(max, MAX_EDIT_DISTANCE);
    var offset = limit;
    var v = new Int32Array(2 * limit + 1);
    v.fill(-1);
    v[offset + 1] = 0;

    var trace = [];
    var foundD = -1;

    for (var d = 0; d <= limit; d += 1) {
      var snapshot = new Int32Array(2 * d + 1);
      for (var k = -d; k <= d; k += 2) {
        var idx = offset + k;
        var x;
        if (k === -d || (k !== d && v[idx - 1] < v[idx + 1])) {
          x = v[idx + 1];
        } else {
          x = v[idx - 1] + 1;
        }
        var y = x - k;
        while (x < n && y < m && oldSlice[x] === newSlice[y]) {
          x += 1;
          y += 1;
        }
        v[idx] = x;
        snapshot[k + d] = x;
        if (x >= n && y >= m) {
          trace.push(snapshot);
          foundD = d;
          break;
        }
      }
      if (foundD !== -1) break;
      trace.push(snapshot);
    }

    // 超長文かつ全面書き換え時のフェイルセーフ（UIフリーズ防止）
    if (foundD === -1) {
      return [
        { count: n, value: oldSlice.slice(), removed: true },
        { count: m, value: newSlice.slice(), added: true }
      ];
    }

    var ops = [];
    var curX = n;
    var curY = m;

    for (var step = foundD; step > 0; step -= 1) {
      var prev = trace[step - 1];
      var curK = curX - curY;
      var prevK;
      if (curK === -step || (curK !== step && prev[curK - 1 + (step - 1)] < prev[curK + 1 + (step - 1)])) {
        prevK = curK + 1;
      } else {
        prevK = curK - 1;
      }
      var prevX = prev[prevK + (step - 1)];
      var prevY = prevX - prevK;

      while (curX > prevX && curY > prevY) {
        ops.push({ type: 'equal', value: oldSlice[curX - 1] });
        curX -= 1;
        curY -= 1;
      }

      if (curX === prevX) {
        ops.push({ type: 'add', value: newSlice[curY - 1] });
        curY -= 1;
      } else {
        ops.push({ type: 'remove', value: oldSlice[curX - 1] });
        curX -= 1;
      }
    }

    while (curX > 0 && curY > 0) {
      ops.push({ type: 'equal', value: oldSlice[curX - 1] });
      curX -= 1;
      curY -= 1;
    }

    ops.reverse();

    var parts = [];
    var bucket = [];
    var bucketType = null;

    function flush() {
      if (bucket.length === 0) return;
      pushPart(parts, bucket, bucketType === 'add', bucketType === 'remove');
      bucket = [];
    }

    for (var j = 0; j < ops.length; j += 1) {
      if (ops[j].type !== bucketType) {
        flush();
        bucketType = ops[j].type;
      }
      bucket.push(ops[j].value);
    }
    flush();

    return parts;
  }

  function diffArrays(oldArr, newArr) {
    var a = Array.isArray(oldArr) ? oldArr : [];
    var b = Array.isArray(newArr) ? newArr : [];
    var n = a.length;
    var m = b.length;

    if (n === 0 && m === 0) return [];

    // 共通先頭・末尾を切り出して計算量を最小化
    var prefixLen = 0;
    while (prefixLen < n && prefixLen < m && a[prefixLen] === b[prefixLen]) {
      prefixLen += 1;
    }

    var suffixLen = 0;
    while (
      suffixLen < (n - prefixLen) &&
      suffixLen < (m - prefixLen) &&
      a[n - 1 - suffixLen] === b[m - 1 - suffixLen]
    ) {
      suffixLen += 1;
    }

    var parts = [];
    if (prefixLen > 0) {
      pushPart(parts, a.slice(0, prefixLen), false, false);
    }

    var midOld = a.slice(prefixLen, n - suffixLen);
    var midNew = b.slice(prefixLen, m - suffixLen);
    var midParts = myersDiffSlice(midOld, midNew);
    for (var i = 0; i < midParts.length; i += 1) {
      pushPart(parts, midParts[i].value, midParts[i].added, midParts[i].removed);
    }

    if (suffixLen > 0) {
      pushPart(parts, a.slice(n - suffixLen), false, false);
    }

    return parts;
  }

  function diffLines(oldStr, newStr) {
    var oldLines = splitLinesWithEnding(oldStr);
    var newLines = splitLinesWithEnding(newStr);
    var arrayParts = diffArrays(oldLines, newLines);
    return arrayParts.map(function (part) {
      var joined = {
        count: part.count,
        value: part.value.join('')
      };
      if (part.added) joined.added = true;
      if (part.removed) joined.removed = true;
      return joined;
    });
  }

  function diffChars(oldStr, newStr) {
    var oldChars = Array.from(String(oldStr || ''));
    var newChars = Array.from(String(newStr || ''));
    var arrayParts = diffArrays(oldChars, newChars);
    return arrayParts.map(function (part) {
      var joined = {
        count: part.count,
        value: part.value.join('')
      };
      if (part.added) joined.added = true;
      if (part.removed) joined.removed = true;
      return joined;
    });
  }

  var Diff = {
    diffArrays: diffArrays,
    diffLines: diffLines,
    diffChars: diffChars,
    splitLinesWithEnding: splitLinesWithEnding
  };

  if (root) {
    root.Diff = Diff;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Diff;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
