import React, { useEffect, useRef, useState } from 'react';
import { MoveHorizontal, RotateCw } from 'lucide-react';
import type { StageRendererProps } from './StageTextAndReveal';
import { EASING_OPTIONS } from '../../utils/motionHelpers';
import { animateScrollTopTo } from '../../utils/scrollAnim';

const SCROLLSPY_SECTIONS = [
  { id: 'intro', title: '01. 余白のリズム', body: '要素同士の間隔を揃えるだけで視認性が一気に高まります。' },
  { id: 'motion', title: '02. 初動の間白', body: '操作直後の 0.5 秒など呼吸を置くと丁寧に感じられます。' },
  { id: 'contrast', title: '03. 情報の強弱', body: '全部を目立たせず主役1つを絞ると迷子が減ります。' },
  { id: 'finish', title: '04. 着地と安心', body: '操作後の状態変化をはっきり返して完了を伝えます。' }
];

export const StageCreativeCraft: React.FC<StageRendererProps> = ({
  patternId,
  playKey,
  isWaitingStart,
  slowFactor,
  effectiveDuration,
  controls,
  showXRay
}) => {
  const easeCss = EASING_OPTIONS[controls.easing].css;

  // 1. 3D Flip Card state
  const [isFlipped, setIsFlipped] = useState(false);

  // 2. Before / After split slider state (%)
  const initialSplit = patternId === 'craft-before-after' ? controls.distance : 50;
  const [splitPercent, setSplitPercent] = useState(initialSplit);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const splitDraggingRef = useRef(false);
  const splitRafRef = useRef<number | null>(null);

  // 3. 3D Tilt & Shine state
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });
  const tiltRafRef = useRef<number | null>(null);

  // 4. Number Counter state
  const [countRatio, setCountRatio] = useState(1);
  const countRafRef = useRef<number | null>(null);

  // 5. Scrollspy TOC state
  const spyContainerRef = useRef<HTMLDivElement | null>(null);
  const spySectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const spyCancelScrollRef = useRef<(() => void) | null>(null);
  const [activeChapter, setActiveChapter] = useState(0);

  useEffect(() => {
    if (patternId === 'craft-before-after') {
      setSplitPercent(controls.distance);
    }
  }, [patternId, controls.distance]);

  useEffect(() => {
    return () => {
      if (splitRafRef.current !== null) window.cancelAnimationFrame(splitRafRef.current);
      if (tiltRafRef.current !== null) window.cancelAnimationFrame(tiltRafRef.current);
      if (countRafRef.current !== null) window.cancelAnimationFrame(countRafRef.current);
      spyCancelScrollRef.current?.();
    };
  }, []);

  // Playback choreography (0.5s lead-in aware)
  useEffect(() => {
    if (isWaitingStart) {
      if (splitRafRef.current !== null) window.cancelAnimationFrame(splitRafRef.current);
      if (tiltRafRef.current !== null) window.cancelAnimationFrame(tiltRafRef.current);
      if (countRafRef.current !== null) window.cancelAnimationFrame(countRafRef.current);
      spyCancelScrollRef.current?.();

      setIsFlipped(false);
      setSplitPercent(patternId === 'craft-before-after' ? controls.distance : 50);
      setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 });
      setCountRatio(0);
      setActiveChapter(0);
      if (spyContainerRef.current) spyContainerRef.current.scrollTop = 0;
      return;
    }

    if (playKey === 0) return;
    const timers: number[] = [];
    const durMs = Math.round(effectiveDuration * 1000);

    if (patternId === 'craft-flip-card') {
      setIsFlipped(true);
    }

    if (patternId === 'craft-before-after') {
      const start = performance.now();
      const targetRest = controls.distance;
      const animateSweep = (now: number) => {
        const t = Math.min(1, (now - start) / Math.max(300, durMs));
        let next = targetRest;
        if (t < 0.35) {
          const p = t / 0.35;
          next = targetRest + (18 - targetRest) * p;
        } else if (t < 0.72) {
          const p = (t - 0.35) / 0.37;
          next = 18 + (84 - 18) * p;
        } else {
          const p = (t - 0.72) / 0.28;
          next = 84 + (targetRest - 84) * p;
        }
        setSplitPercent(Math.round(next));
        if (t < 1) {
          splitRafRef.current = window.requestAnimationFrame(animateSweep);
        }
      };
      splitRafRef.current = window.requestAnimationFrame(animateSweep);
    }

    if (patternId === 'craft-tilt-shine') {
      const maxDeg = controls.distance;
      const start = performance.now();
      const runMs = Math.max(900, Math.round(1150 * slowFactor));
      const loopTilt = (now: number) => {
        const t = Math.min(1, (now - start) / runMs);
        const angle = t * Math.PI * 2;
        const envelope = Math.sin(t * Math.PI);
        const rx = Math.sin(angle) * maxDeg * envelope;
        const ry = Math.cos(angle) * maxDeg * envelope;
        const gx = 50 + Math.cos(angle) * 35 * envelope;
        const gy = 50 + Math.sin(angle) * 35 * envelope;
        setTilt({ rx, ry, gx, gy });
        if (t < 1) {
          tiltRafRef.current = window.requestAnimationFrame(loopTilt);
        } else {
          setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 });
        }
      };
      tiltRafRef.current = window.requestAnimationFrame(loopTilt);
    }

    if (patternId === 'craft-number-counter') {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / Math.max(200, durMs));
        // Deceleration curve according to easing selection
        const eased =
          controls.easing === 'spring'
            ? 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 1.4) * 0.25
            : controls.easing === 'snappy'
              ? 1 - Math.pow(1 - t, 4)
              : 1 - Math.pow(1 - t, 3);
        setCountRatio(Math.max(0, t >= 1 ? 1 : eased));
        if (t < 1) {
          countRafRef.current = window.requestAnimationFrame(tick);
        }
      };
      countRafRef.current = window.requestAnimationFrame(tick);
    }

    if (patternId === 'craft-scrollspy-toc') {
      const container = spyContainerRef.current;
      if (container) {
        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
        spyCancelScrollRef.current = animateScrollTopTo(container, maxScroll, durMs);
      }
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      if (splitRafRef.current !== null) window.cancelAnimationFrame(splitRafRef.current);
      if (tiltRafRef.current !== null) window.cancelAnimationFrame(tiltRafRef.current);
      if (countRafRef.current !== null) window.cancelAnimationFrame(countRafRef.current);
      spyCancelScrollRef.current?.();
    };
  }, [patternId, playKey, isWaitingStart, effectiveDuration, slowFactor, controls.distance, controls.easing]);

  const updateSplitFromClientX = (clientX: number) => {
    const el = splitContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPercent(Math.round(Math.min(95, Math.max(5, pct))));
  };

  switch (patternId) {
    // -------------------------------------------------------------------------
    // 1. くるっと裏返る3D解説フリップカード
    // -------------------------------------------------------------------------
    case 'craft-flip-card':
      return (
        <div style={{ perspective: '900px' }} className="w-full max-w-[270px]">
          <button
            type="button"
            onClick={() => setIsFlipped((v) => !v)}
            aria-pressed={isFlipped}
            className="relative h-36 w-full text-left cursor-pointer"
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transition: `transform ${effectiveDuration}s ${easeCss}`
            }}
          >
            {/* 表面 */}
            <div
              className={`absolute inset-0 flex flex-col justify-between rounded-xl border bg-white p-4 shadow-sm ${
                showXRay ? 'border-2 border-dashed border-blue-500' : 'border-zinc-200'
              }`}
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-blue-600">FRONT / 表面</span>
                <RotateCw className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-900">カードをクリックで裏返す</div>
                <div className="mt-0.5 text-[11px] text-zinc-500">
                  クイズや料金表の裏解説に便利
                </div>
              </div>
            </div>

            {/* 裏面 */}
            <div
              className={`absolute inset-0 flex flex-col justify-between rounded-xl border bg-zinc-900 p-4 text-white shadow-sm ${
                showXRay ? 'border-2 border-dashed border-orange-400' : 'border-zinc-800'
              }`}
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-orange-300">BACK / 裏面</span>
                <RotateCw className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">種明かし：backface-visibility</div>
                <div className="mt-1 text-[11px] leading-relaxed text-zinc-300">
                  表と裏を背中合わせ（180度反転）で重ね、裏側を非表示にして回転しています。
                </div>
              </div>
            </div>
          </button>
        </div>
      );

    // -------------------------------------------------------------------------
    // 2. ビフォー・アフター比較スライダー
    // -------------------------------------------------------------------------
    case 'craft-before-after':
      return (
        <div
          ref={splitContainerRef}
          onPointerDown={(e) => {
            splitDraggingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateSplitFromClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (!splitDraggingRef.current) return;
            updateSplitFromClientX(e.clientX);
          }}
          onPointerUp={() => {
            splitDraggingRef.current = false;
          }}
          onPointerCancel={() => {
            splitDraggingRef.current = false;
          }}
          className="relative h-40 w-full max-w-sm select-none overflow-hidden rounded-xl border border-zinc-200 bg-white touch-none cursor-ew-resize"
        >
          {/* After（全体下敷き：余白が整ったUI） */}
          <div className="absolute inset-0 flex flex-col justify-between bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                AFTER（整理後）
              </span>
              <span className="text-[10px] text-zinc-400">視線が迷わない設計</span>
            </div>
            <div className="space-y-1.5">
              <div className="text-sm font-extrabold text-zinc-900">整理された見出しと余白</div>
              <div className="text-[11px] text-zinc-500">
                文字サイズ・色・行間に強弱をつけて一目で要点が伝わります。
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-blue-600 px-3 py-1 text-[10px] font-bold text-white">
                主役ボタン
              </span>
              <span className="text-[10px] text-zinc-500">詳細を見る</span>
            </div>
          </div>

          {/* Before（前面を clip-path で切り抜き：ごちゃついたUI） */}
          <div
            className="absolute inset-0 flex flex-col justify-between bg-zinc-200 p-2.5 text-zinc-700"
            style={{ clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }}
          >
            <div className="flex items-center justify-between">
              <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                BEFORE（改善前）
              </span>
            </div>
            <div className="space-y-0.5 text-[10px] leading-tight">
              <div className="font-normal underline">
                文字が全部同じサイズで境界も狭く情報が一気になだれ込む状態の見本テキストです
              </div>
              <div className="bg-yellow-200 px-1 text-zinc-900">
                注意書きも全部ハイライトされてどこを押すべきか迷う配置例
              </div>
            </div>
            <div className="flex gap-1 text-[9px]">
              <span className="border border-zinc-500 bg-zinc-300 px-1">ボタンA</span>
              <span className="border border-zinc-500 bg-zinc-300 px-1">ボタンB</span>
              <span className="border border-zinc-500 bg-zinc-300 px-1">ボタンC</span>
            </div>
          </div>

          {/* 分割ハンドル線 */}
          <div
            className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-blue-600"
            style={{ left: `${splitPercent}%` }}
          >
            <div className="absolute top-1/2 left-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 shadow-md">
              <MoveHorizontal className="h-3.5 w-3.5" />
            </div>
          </div>

          {showXRay && (
            <div className="pointer-events-none absolute top-2 right-2 z-30 rounded bg-orange-50/95 px-2 py-0.5 font-mono text-[10px] font-semibold text-orange-800 border border-orange-200">
              clip-path: inset(0 {100 - splitPercent}% 0 0)
            </div>
          )}
        </div>
      );

    // -------------------------------------------------------------------------
    // 3. カーソル連動 3D チルト＆ツヤ光沢カード
    // -------------------------------------------------------------------------
    case 'craft-tilt-shine':
      return (
        <div
          style={{ perspective: '800px' }}
          className="w-full max-w-[275px]"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;
            const nx = (e.clientX - rect.left) / rect.width;
            const ny = (e.clientY - rect.top) / rect.height;
            const maxDeg = controls.distance;
            setTilt({
              rx: Number(((0.5 - ny) * maxDeg * 2).toFixed(2)),
              ry: Number(((nx - 0.5) * maxDeg * 2).toFixed(2)),
              gx: Math.round(nx * 100),
              gy: Math.round(ny * 100)
            });
          }}
          onMouseLeave={() => setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 })}
        >
          <div
            className={`relative overflow-hidden rounded-xl border bg-zinc-900 p-4 text-white shadow-md ${
              showXRay ? 'border-2 border-dashed border-blue-400' : 'border-zinc-800'
            }`}
            style={{
              transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
              transition: `transform ${Math.min(0.25, effectiveDuration)}s ease-out`
            }}
          >
            {/* ツヤ反射レイヤー */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.22), transparent 62%)`
              }}
            />

            <div className="relative z-10 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
              <span>INTERACTIVE CARD</span>
              <span>
                {tilt.rx.toFixed(1)}° / {tilt.ry.toFixed(1)}°
              </span>
            </div>
            <div className="relative z-10 mt-3 text-sm font-bold">立体チルト＋光の反射</div>
            <p className="relative z-10 mt-1 text-[11px] text-zinc-300">
              マウスを当てた場所に向かってカードがわずかに傾き、光沢スポットが追従します。
            </p>
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    // 4. 0から目標値へ減速着地する数字カウントアップ
    // -------------------------------------------------------------------------
    case 'craft-number-counter': {
      const items = [
        { label: '収録パターン', target: 100, unit: '種', decimals: 0 },
        { label: 'セキュリティスコア', target: 100, unit: '%', decimals: 0 },
        { label: '心地よい間白', target: 0.5, unit: '秒', decimals: 1 }
      ];
      return (
        <div className="grid w-full max-w-md grid-cols-3 gap-2.5">
          {items.map((stat) => {
            const val = (stat.target * countRatio).toFixed(stat.decimals);
            return (
              <div
                key={stat.label}
                className={`rounded-xl border bg-white p-3 text-center shadow-2xs ${
                  showXRay ? 'border-2 border-dashed border-blue-500' : 'border-zinc-200'
                }`}
              >
                <div className="text-[10px] font-medium text-zinc-500">{stat.label}</div>
                <div
                  className={`mt-1 text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 tabular-nums ${
                    showXRay ? 'bg-blue-50/70 rounded px-1' : ''
                  }`}
                >
                  {val}
                  <span className="ml-0.5 text-xs font-semibold text-zinc-500">{stat.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // 5. 読んでいる章に目印が追従するライブ目次（Scrollspy）
    // -------------------------------------------------------------------------
    case 'craft-scrollspy-toc':
      return (
        <div className="grid h-44 w-full max-w-md grid-cols-[1.45fr_1fr] overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {/* 左：本文スクロールエリア */}
          <div
            ref={spyContainerRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const anchor = el.scrollTop + 36;
              let best = 0;
              spySectionRefs.current.forEach((sec, idx) => {
                if (sec && sec.offsetTop <= anchor) {
                  best = idx;
                }
              });
              setActiveChapter(best);
            }}
            className="h-full overflow-y-auto border-r border-zinc-100 p-3 space-y-3"
          >
            {SCROLLSPY_SECTIONS.map((sec, idx) => (
              <div
                key={sec.id}
                ref={(node) => {
                  spySectionRefs.current[idx] = node;
                }}
                className={`rounded-lg border p-2.5 transition-colors ${
                  activeChapter === idx
                    ? 'border-blue-200 bg-blue-50/40'
                    : 'border-zinc-100 bg-zinc-50/60'
                }`}
              >
                <div className="text-xs font-bold text-zinc-900">{sec.title}</div>
                <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">{sec.body}</p>
              </div>
            ))}
          </div>

          {/* 右：追従目次 (Scrollspy TOC) */}
          <div
            className={`relative flex flex-col justify-center bg-zinc-50/60 p-2.5 ${
              showXRay ? 'border-2 border-dashed border-orange-400' : ''
            }`}
          >
            <div className="mb-1.5 text-[10px] font-bold text-zinc-400">現在位置の目次</div>
            <div className="relative space-y-1 border-l-2 border-zinc-200 pl-2">
              {SCROLLSPY_SECTIONS.map((sec, idx) => {
                const active = activeChapter === idx;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      const targetSec = spySectionRefs.current[idx];
                      const box = spyContainerRef.current;
                      if (targetSec && box) {
                        spyCancelScrollRef.current?.();
                        spyCancelScrollRef.current = animateScrollTopTo(
                          box,
                          Math.max(0, targetSec.offsetTop - 10),
                          400
                        );
                      }
                    }}
                    className={`relative block w-full rounded px-1.5 py-0.5 text-left text-[10px] transition-colors cursor-pointer ${
                      active
                        ? 'bg-white font-bold text-blue-700 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute top-0.5 bottom-0.5 -left-[10px] w-0.5 rounded-full bg-blue-600"
                      />
                    )}
                    {sec.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};
