/**
 * Validation Utilities - 入力値の検証とサニタイズ
 */

/**
 * 数値を指定範囲内に収める
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * 安全に整数をパースする
 * @param {*} value
 * @param {number} fallback
 * @returns {number}
 */
export function parseIntSafe(value, fallback = 0) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
}

/**
 * 安全に浮動小数点数をパースする
 * @param {*} value
 * @param {number} fallback
 * @returns {number}
 */
export function parseFloatSafe(value, fallback = 0) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
}

/**
 * minLen と maxLen の整合性チェック（minLen > maxLen の場合は入れ替え）
 * @param {number} minLen
 * @param {number} maxLen
 * @returns {{minLen: number, maxLen: number}}
 */
export function normalizeMinMax(minLen, maxLen) {
    if (minLen > maxLen) {
        return { minLen: maxLen, maxLen: minLen };
    }
    return { minLen, maxLen };
}

/**
 * HEXカラーを検証し、不正な値はフォールバックへ置き換える
 * @param {*} value
 * @param {string} fallback
 * @returns {string}
 */
export function sanitizeHexColor(value, fallback = '#000000') {
    if (typeof value !== 'string') return fallback;

    const trimmed = value.trim();
    if (trimmed === '') return '';

    const normalized = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    return /^#[0-9A-F]{6}$/i.test(normalized) ? normalized.toUpperCase() : fallback;
}

/**
 * 描画パラメータのバリデーションと正規化
 * @param {Object} params - 生のパラメータオブジェクト
 * @returns {Object} 検証済みパラメータ
 */
export function validateRenderParams(params) {
    const rawMinLen = clamp(parseFloatSafe(params.minLen, 30), 0, 100);
    const rawMaxLen = clamp(parseFloatSafe(params.maxLen, 100), 0, 200);
    const { minLen, maxLen } = normalizeMinMax(rawMinLen, rawMaxLen);

    return {
        count: clamp(parseIntSafe(params.count, 60), 1, 500),
        width: clamp(parseFloatSafe(params.width, 4.0), 0.1, 50),
        minLen,
        maxLen,
        randomness: clamp(parseFloatSafe(params.randomness, 20), 0, 100),
        taper: clamp(parseFloatSafe(params.taper, 0), 0, 100),
        direction: clamp(parseFloatSafe(params.direction, 0), -180, 180),
        aperture: clamp(parseFloatSafe(params.aperture, 360), 10, 360),
        color: sanitizeHexColor(params.color, '#000000'),
        endColor: sanitizeHexColor(params.endColor, ''),
        whiteBorder: Boolean(params.whiteBorder)
    };
}
