export const PROFILE_NAME_MAX_LENGTH = 40;

/**
 * 表示名を保存可能な長さへ正規化する。
 * @param {unknown} value - 入力された名前
 * @param {string} fallback - 空入力時に使う名前
 * @returns {string} 正規化済みの名前
 */
export function normalizeProfileName(value, fallback = 'ゲスト') {
    const normalized = typeof value === 'string'
        ? value.trim().slice(0, PROFILE_NAME_MAX_LENGTH)
        : '';
    return normalized || fallback;
}
