import type { EasingPresetId, MotionPattern, PatternControls } from '../types/motion';

export const MAX_SEARCH_QUERY_LENGTH = 80;
export const MAX_TARGET_NOTE_LENGTH = 160;

const ALLOWED_EASINGS: readonly EasingPresetId[] = Object.freeze(['smooth', 'snappy', 'spring']);

/**
 * 制御文字・双方向テキスト制御文字（BiDi / Trojan Source 対策）を取り除き、
 * 安全な長さのプレーンテキストへ正規化する。
 */
export function sanitizePlainText(input: unknown, maxLength: number): string {
  if (typeof input !== 'string' || maxLength <= 0) {
    return '';
  }

  // ASCII 制御文字 (C0/DEL/C1) および Unicode BiDi 制御文字を除去
  const cleaned = input.replace(
    /[\u0000-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g,
    ''
  );

  return cleaned.slice(0, maxLength);
}

/**
 * 数値パラメータの非有限値（NaN / Infinity）を防ぎ、許容範囲・刻み幅へ丸める。
 */
export function clampAndRound(
  value: number,
  min: number,
  max: number,
  step: number,
  fallback = min
): number {
  const safeInput = Number.isFinite(value) ? value : fallback;
  const clamped = Math.min(max, Math.max(min, safeInput));
  const decimals = (step.toString().split('.')[1] ?? '').length;
  return Number(clamped.toFixed(decimals));
}

/**
 * `__proto__` や `constructor` 等によるプロトタイプ汚染・不正キー混入を許可リストで遮断する。
 */
export function sanitizeEasing(
  raw: unknown,
  fallback: EasingPresetId = 'smooth'
): EasingPresetId {
  if (typeof raw === 'string' && (ALLOWED_EASINGS as readonly string[]).includes(raw)) {
    return raw as EasingPresetId;
  }
  return (ALLOWED_EASINGS as readonly string[]).includes(fallback) ? fallback : 'smooth';
}

/**
 * パターン定義に基づく全コントロール値の境界検証・正規化を行う。
 */
export function sanitizeControls(
  pattern: MotionPattern,
  raw: Partial<PatternControls>
): PatternControls {
  const duration = clampAndRound(
    raw.duration ?? pattern.defaultDuration,
    pattern.durationRange.min,
    pattern.durationRange.max,
    pattern.durationRange.step,
    pattern.defaultDuration
  );

  const distance = pattern.secondarySlider
    ? clampAndRound(
        raw.distance ?? pattern.secondarySlider.defaultValue,
        pattern.secondarySlider.min,
        pattern.secondarySlider.max,
        pattern.secondarySlider.step,
        pattern.secondarySlider.defaultValue
      )
    : 0;

  const easing = sanitizeEasing(raw.easing, pattern.defaultEasing);

  return { duration, distance, easing };
}
