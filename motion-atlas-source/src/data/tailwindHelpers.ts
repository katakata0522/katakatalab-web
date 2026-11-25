import { EasingPresetId, PatternControls } from '../types/motion';
import { EASING_OPTIONS } from '../utils/motionHelpers';

export type TailwindBuilder = (params: PatternControls) => string;

/** Tailwind arbitrary duration token in ms, e.g. "duration-[650ms]". */
export function twDur(seconds: number): string {
  const ms = Math.max(50, Math.round(seconds * 1000));
  return `duration-[${ms}ms]`;
}

/** Tailwind arbitrary cubic-bezier timing class from preset id. */
export function twEase(preset: EasingPresetId): string {
  const css = EASING_OPTIONS[preset].css.replace(/\s+/g, '');
  return `ease-[${css}]`;
}

/** Combined transition utility string with rounded px helper. */
export function twTransition(params: PatternControls, prop = 'transition-all'): string {
  return `${prop} ${twDur(params.duration)} ${twEase(params.easing)}`;
}
