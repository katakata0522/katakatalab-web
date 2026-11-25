import { MotionPattern, PatternControls } from '../types/motion';
import { TailwindBuilder } from './tailwindHelpers';
import { TAILWIND_PART_1 } from './tailwindPart1';
import { TAILWIND_PART_2 } from './tailwindPart2';
import { TAILWIND_PART_3 } from './tailwindPart3';

/**
 * 全100パターン分の Tailwind CSS v4 ユーティリティ実装レジストリ。
 * Webビルドでは動的 import() によりオンデマンド読み込みされ初期バンドルを圧迫しません。
 */
export const TAILWIND_REGISTRY: Record<string, TailwindBuilder> = {
  ...TAILWIND_PART_1,
  ...TAILWIND_PART_2,
  ...TAILWIND_PART_3
};

export function renderTailwindCode(pattern: MotionPattern, params: PatternControls): string {
  const builder = TAILWIND_REGISTRY[pattern.id];
  if (builder) {
    return builder(params);
  }
  return `<!-- ${pattern.title} (Tailwind CSS Fallback) -->\n${pattern.buildCode(params)}`;
}
