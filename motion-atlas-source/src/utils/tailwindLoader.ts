import { MotionPattern, PatternControls } from '../types/motion';

let registryPromise: Promise<typeof import('../data/tailwindRegistry')> | null = null;

/**
 * 選択したパターン向けの Tailwind CSS スニペットを遅延読み込みして生成します。
 */
export async function buildTailwindForPattern(
  pattern: MotionPattern,
  params: PatternControls
): Promise<string> {
  if (!registryPromise) {
    registryPromise = import('../data/tailwindRegistry');
  }
  const mod = await registryPromise;
  return mod.renderTailwindCode(pattern, params);
}
