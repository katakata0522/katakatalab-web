import React, { useEffect, useMemo, useState } from 'react';
import type { PatternControls } from '../../types/motion';
import { EASING_OPTIONS } from '../../utils/motionHelpers';

export interface StageRendererProps {
  patternId: string;
  playKey: number;
  isWaitingStart: boolean;
  slowFactor: number;
  effectiveDuration: number;
  controls: PatternControls;
  showXRay: boolean;
  viewportMode?: 'desktop' | 'mobile';
}

export const StageTextAndReveal: React.FC<StageRendererProps> = ({
  patternId,
  playKey,
  isWaitingStart,
  slowFactor,
  effectiveDuration,
  controls,
  showXRay
}) => {
  const easeCss = EASING_OPTIONS[controls.easing].css;
  const shouldAnimate = playKey > 0 && !isWaitingStart;

  // Typewriter state
  const fullTypeText = 'アイデアを、そのまま動きにする。';
  const typeChars = useMemo(() => Array.from(fullTypeText), []);
  const [typedCount, setTypedCount] = useState<number>(typeChars.length);

  useEffect(() => {
    if (patternId !== 'text-typewriter') return;
    if (isWaitingStart) {
      setTypedCount(0);
      return;
    }
    if (playKey === 0) {
      setTypedCount(typeChars.length);
      return;
    }

    setTypedCount(0);
    const stepMs = Math.max(25, Math.round((effectiveDuration * 1000) / typeChars.length));
    let current = 0;
    const timer = window.setInterval(() => {
      current += 1;
      setTypedCount(current);
      if (current >= typeChars.length) {
        window.clearInterval(timer);
      }
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [patternId, playKey, isWaitingStart, effectiveDuration, typeChars]);

  switch (patternId) {
    case 'text-mask-slide-up':
      return (
        <div className="relative flex flex-col items-center justify-center px-4">
          {/* 切り抜きマスクの境界（仕組みモードでオレンジ点線として可視化） */}
          <div
            className={`relative px-3 py-1 transition-colors ${
              showXRay
                ? 'border-2 border-dashed border-orange-500 bg-orange-50/40 rounded-lg'
                : 'overflow-hidden'
            }`}
          >
            {showXRay && (
              <span className="absolute -top-6 left-0 rounded bg-orange-600 px-1.5 py-0.5 text-[10px] font-semibold text-white whitespace-nowrap">
                切り抜き枠 (overflow: hidden)
              </span>
            )}

            {/* 仕組みモード: スタート位置のゴースト枠 */}
            {showXRay && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center rounded-lg border border-dashed border-blue-500 bg-blue-50/50 px-3 py-1 text-[20px] sm:text-3xl font-extrabold tracking-tight text-blue-500/60 whitespace-normal sm:whitespace-nowrap text-center"
                style={{
                  transform: `translateY(${Math.min(controls.distance, 52)}px)`
                }}
              >
                伝わるデザインは、動きから。
                <span className="absolute -bottom-5 right-1 rounded bg-blue-100/95 px-1.5 py-0.5 text-[10px] font-mono text-blue-700">
                  初期位置 (+{controls.distance}px)
                </span>
              </div>
            )}

            <div className={showXRay ? 'overflow-visible' : 'overflow-hidden'}>
              <p
                key={playKey}
                className="m-0 text-center text-[20px] sm:text-3xl font-extrabold tracking-tight text-zinc-900 select-none whitespace-normal sm:whitespace-nowrap"
                style={
                  isWaitingStart
                    ? { opacity: 0, transform: `translate3d(0, ${controls.distance}px, 0)` }
                    : shouldAnimate
                      ? ({
                          '--anim-dist': `${controls.distance}px`,
                          animation: `atlasSlideUp ${effectiveDuration}s ${easeCss} both`
                        } as React.CSSProperties)
                      : undefined
                }
              >
                伝わるデザインは、動きから。
              </p>
            </div>
          </div>
        </div>
      );

    case 'text-sweep-left-to-right':
      return (
        <div className="relative flex flex-col items-center justify-center px-3 sm:px-6">
          {showXRay && (
            <div className="mb-2.5 flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-mono text-blue-600">
              <span className="rounded border border-dashed border-orange-500 bg-orange-50 px-1.5 py-0.5 text-orange-700">
                左 -{controls.distance}px &amp; clip-path 100%隠
              </span>
              <span aria-hidden="true">━━▶</span>
              <span className="rounded border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-blue-700">
                定位置 (全開)
              </span>
            </div>
          )}

          <div
            className={`relative rounded-lg px-3 py-1 ${
              showXRay ? 'border border-dashed border-orange-500 bg-orange-50/30' : ''
            }`}
          >
            <p
              key={playKey}
              className="m-0 text-center text-xl sm:text-3xl font-extrabold tracking-tight text-zinc-900"
              style={
                isWaitingStart
                  ? {
                      opacity: 0.25,
                      clipPath: 'inset(0 100% 0 0)',
                      transform: `translate3d(-${controls.distance}px, 0, 0)`
                    }
                  : shouldAnimate
                    ? ({
                        '--anim-dist': `${controls.distance}px`,
                        animation: `atlasSweepRight ${effectiveDuration}s ${easeCss} both`
                      } as React.CSSProperties)
                    : undefined
              }
            >
              左から右へ、言葉が流れ込む。
            </p>
          </div>
        </div>
      );

    case 'text-stagger-chars': {
      const chars = Array.from('リズムで伝える言葉');
      return (
        <div className="relative flex flex-col items-center justify-center px-2 sm:px-4">
          <div
            className={`flex flex-wrap justify-center ${
              showXRay ? 'gap-x-3 gap-y-6' : 'gap-0.5'
            }`}
          >
            {chars.map((char, idx) => {
              const delayMs = Math.round(idx * controls.distance * slowFactor);
              return (
                <span
                  key={`${playKey}-${idx}`}
                  className={`relative inline-block px-0.5 text-2xl sm:text-4xl font-extrabold text-zinc-900 ${
                    showXRay ? 'rounded border border-dashed border-blue-400 bg-blue-50/40 px-1.5' : ''
                  }`}
                  style={
                    isWaitingStart
                      ? { opacity: 0, transform: 'translate3d(0, 24px, 0) scale(0.94)' }
                      : shouldAnimate
                        ? ({
                            '--anim-dist': '24px',
                            animation: `atlasCharRise ${effectiveDuration}s ${easeCss} both`,
                            animationDelay: `${delayMs}ms`
                          } as React.CSSProperties)
                        : undefined
                  }
                >
                  {char}
                  {showXRay && (
                    <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-blue-600 whitespace-nowrap">
                      +{delayMs}ms
                    </span>
                  )}
                </span>
              );
            })}
          </div>
          {showXRay && (
            <p className="mt-7 text-center text-[11px] text-zinc-500">
              各文字の箱（span）ごとに待機時間だけ {Math.round(controls.distance * slowFactor)}ms ずつ加算
            </p>
          )}
        </div>
      );
    }

    case 'text-typewriter': {
      const visibleText = typeChars.slice(0, typedCount).join('');
      return (
        <div className="relative flex flex-col items-center justify-center px-4">
          <div className="min-h-[42px] rounded-lg border border-zinc-200 bg-zinc-50/70 px-4 py-2.5">
            <span className="text-lg sm:text-2xl font-bold text-zinc-900">{visibleText}</span>
            <span
              aria-hidden="true"
              className="ml-0.5 inline-block align-text-bottom bg-blue-600"
              style={{
                width: `${controls.distance}px`,
                height: '1.2em',
                animation: 'atlasCaretBlink 0.8s step-end infinite'
              }}
            />
          </div>
          {showXRay && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-zinc-600">
              <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700 border border-blue-200">
                slice(0, {typedCount}) / 全{typeChars.length}文字
              </span>
              <span className="rounded bg-orange-50 px-2 py-0.5 text-orange-700 border border-orange-200">
                カーソル幅 {controls.distance}px
              </span>
            </div>
          )}
        </div>
      );
    }

    case 'text-marker-highlight':
      return (
        <div className="relative flex flex-col items-center justify-center px-4 text-center">
          <p className="m-0 text-xl sm:text-2xl font-extrabold text-zinc-900 leading-relaxed">
            大事な場所だけを、
            <span className="relative z-10 inline-block px-1.5">
              <span
                key={playKey}
                aria-hidden="true"
                className={`absolute left-0 bottom-0.5 -z-10 w-full rounded-sm ${
                  showXRay ? 'border border-dashed border-orange-500 bg-amber-300/75' : 'bg-amber-300/70'
                }`}
                style={{
                  height: `${controls.distance}%`,
                  transformOrigin: 'left center',
                  ...(isWaitingStart
                    ? { transform: 'scaleX(0)' }
                    : shouldAnimate
                      ? { animation: `atlasMarkerSweep ${effectiveDuration}s ${easeCss} both` }
                      : {})
                }}
              />
              直感的に強調
            </span>
            します。
          </p>
          {showXRay && (
            <div className="mt-3 text-[11px] font-mono text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-0.5">
              背面 ::before（高さ {controls.distance}%）を左支点で scaleX(0 → 1)
            </div>
          )}
        </div>
      );

    case 'reveal-fade-lift':
      return (
        <div className="relative flex flex-col items-center justify-center px-4">
          {showXRay && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 mx-auto flex w-72 sm:w-80 items-end justify-center rounded-xl border border-dashed border-blue-400 bg-blue-50/40 pb-2 text-center opacity-80"
              style={{
                transform: `translateY(${Math.min(controls.distance, 38)}px) scale(0.97)`
              }}
            >
              <span className="text-[10px] font-mono font-semibold text-blue-700">
                待機位置（下 +{controls.distance}px / 透明度 0）
              </span>
            </div>
          )}
          <div
            key={playKey}
            className="relative w-72 sm:w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            style={
              isWaitingStart
                ? { opacity: 0, transform: `translate3d(0, ${controls.distance}px, 0) scale(0.97)` }
                : shouldAnimate
                  ? ({
                      '--anim-dist': `${controls.distance}px`,
                      animation: `atlasFadeLift ${effectiveDuration}s ${easeCss} both`
                    } as React.CSSProperties)
                  : undefined
            }
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />
              <span className="text-xs font-semibold text-zinc-500">ARTICLE CARD</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-zinc-900">すっきり浮かぶカード</div>
            <p className="mt-1 text-xs text-zinc-500">
              少し下と97%サイズから自然に着地します。
            </p>
          </div>
        </div>
      );

    case 'reveal-curtain-block':
      return (
        <div className="relative flex flex-col items-center justify-center px-4">
          <div
            className={`relative inline-block overflow-hidden rounded-lg px-5 py-3 ${
              showXRay ? 'border-2 border-dashed border-orange-500' : 'border border-zinc-200 bg-zinc-50'
            }`}
          >
            <span
              key={`txt-${playKey}`}
              className="relative z-10 inline-block text-xl sm:text-2xl font-extrabold tracking-wide text-zinc-900"
              style={
                isWaitingStart
                  ? { opacity: 0 }
                  : shouldAnimate
                    ? { animation: `atlasCurtainRevealContent ${effectiveDuration}s linear both` }
                    : undefined
              }
            >
              BRAND CONCEPT 2026
            </span>
            {shouldAnimate && (
              <span
                key={`curtain-${playKey}`}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20 bg-blue-600"
                style={{ animation: `atlasCurtainBlock ${effectiveDuration}s ${easeCss} both` }}
              />
            )}
          </div>
          {showXRay && (
            <div className="mt-3 text-[11px] font-mono text-zinc-600 bg-zinc-100 rounded px-2 py-1">
              前半: 左支点で幕が伸びる → 中間: 文字ON → 後半: 右支点へ切替えて幕が抜ける
            </div>
          )}
        </div>
      );

    case 'reveal-stagger-grid': {
      const items = ['01 発見', '02 理解', '03 調整', '04 活用'];
      return (
        <div className="w-full max-w-xs px-2">
          <div className="grid grid-cols-2 gap-2.5">
            {items.map((label, idx) => {
              const delayMs = Math.round(idx * controls.distance * slowFactor);
              return (
                <div
                  key={`${playKey}-${idx}`}
                  className="relative rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-xs"
                  style={
                    isWaitingStart
                      ? { opacity: 0, transform: 'translate3d(0, 22px, 0) scale(0.95)' }
                      : shouldAnimate
                        ? ({
                            '--anim-dist': '22px',
                            animation: `atlasStaggerCard ${effectiveDuration}s ${easeCss} both`,
                            animationDelay: `${delayMs}ms`
                          } as React.CSSProperties)
                        : undefined
                  }
                >
                  <div className="text-xs font-bold text-zinc-800">{label}</div>
                  {showXRay && (
                    <span className="mt-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-mono text-blue-700">
                      delay: {delayMs}ms
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case 'reveal-3d-flip':
      return (
        <div className="relative flex flex-col items-center justify-center px-4">
          <div
            key={playKey}
            className={`w-72 sm:w-80 rounded-xl border bg-white px-5 py-4 text-center shadow-sm ${
              showXRay ? 'border-2 border-dashed border-blue-500' : 'border-zinc-200'
            }`}
            style={{
              transformOrigin: 'bottom center',
              ...(isWaitingStart
                ? { opacity: 0 }
                : shouldAnimate
                  ? ({
                      '--anim-deg': `-${controls.distance}deg`,
                      animation: `atlasFlip3D ${effectiveDuration}s ${easeCss} both`
                    } as React.CSSProperties)
                  : {})
            }}
          >
            <div className="text-xs font-mono text-blue-600">PERSPECTIVE 700px</div>
            <div className="mt-1 text-sm font-bold text-zinc-900">立体的に立ち上がるパネル</div>
            {showXRay && (
              <div className="mt-1.5 text-[10px] font-mono text-orange-700">
                rotateX(-{controls.distance}deg → 0deg) ／ 底辺支点
              </div>
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
};
