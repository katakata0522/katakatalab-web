/**
 * スクロールコンテナを 3 次イージングで指定位置まで滑らかに移動させる。
 * 返却されたキャンセル関数を呼ぶことで途中中断・破棄できる。
 */
export function animateScrollTopTo(
  el: HTMLElement,
  to: number,
  durationMs: number,
  onComplete?: () => void
): () => void {
  const from = el.scrollTop;
  const startTime = performance.now();
  let rafId = 0;
  let cancelled = false;

  const step = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - startTime) / Math.max(120, durationMs));
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    el.scrollTop = from + (to - from) * eased;

    if (t < 1) {
      rafId = window.requestAnimationFrame(step);
    } else {
      onComplete?.();
    }
  };

  rafId = window.requestAnimationFrame(step);
  return () => {
    cancelled = true;
    window.cancelAnimationFrame(rafId);
  };
}
