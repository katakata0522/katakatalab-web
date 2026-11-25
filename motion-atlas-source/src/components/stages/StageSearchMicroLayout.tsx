import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { StageRendererProps } from './StageTextAndReveal';
import { EASING_OPTIONS } from '../../utils/motionHelpers';
import { animateScrollTopTo } from '../../utils/scrollAnim';
import { sanitizePlainText } from '../../utils/security';

export const StageSearchMicroLayout: React.FC<StageRendererProps> = ({
  patternId,
  playKey,
  isWaitingStart,
  slowFactor,
  effectiveDuration,
  controls,
  showXRay
}) => {
  const easeCss = EASING_OPTIONS[controls.easing].css;

  // Search states
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [inlineFocused, setInlineFocused] = useState(false);
  const expandInputRef = useRef<HTMLInputElement | null>(null);

  // Micro-interaction states
  const [demoPressed, setDemoPressed] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [hoverSweep, setHoverSweep] = useState(false);
  const [magOffset, setMagOffset] = useState({ x: 0, y: 0 });
  const rippleBtnRef = useRef<HTMLButtonElement | null>(null);
  const rippleSeqRef = useRef(0);
  const cleanupTimersRef = useRef<number[]>([]);

  // Layout states
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollCancelRef = useRef<(() => void) | null>(null);
  const [scrollRatio, setScrollRatio] = useState(0);
  const [isCompactHeader, setIsCompactHeader] = useState(false);
  const [marqueeRunning, setMarqueeRunning] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState<'loading' | 'done'>('done');

  useEffect(() => {
    if (patternId !== 'search-command-modal' || !modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [patternId, modalOpen]);

  useEffect(() => {
    return () => {
      cleanupTimersRef.current.forEach((t) => window.clearTimeout(t));
      scrollCancelRef.current?.();
    };
  }, []);

  const scheduleCleanupTimer = (fn: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      cleanupTimersRef.current = cleanupTimersRef.current.filter((t) => t !== id);
      fn();
    }, delayMs);
    cleanupTimersRef.current.push(id);
  };

  // Auto-play choreography per pattern (starts after MotionCard's 0.5s silent lead-in)
  useEffect(() => {
    if (isWaitingStart) {
      scrollCancelRef.current?.();
      scrollCancelRef.current = null;
      setSearchOpen(false);
      setSearchText('');
      setInlineFocused(false);
      setModalOpen(false);
      setDemoPressed(false);
      setRipples([]);
      setHoverSweep(false);
      setMagOffset({ x: 0, y: 0 });
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
        setScrollRatio(0);
        setIsCompactHeader(false);
      }
      if (patternId === 'layout-marquee-loop') {
        setMarqueeRunning(false);
      }
      if (patternId === 'layout-skeleton-toast') {
        setLoadingPhase('loading');
      }
      return;
    }

    if (playKey === 0) return;
    const timers: number[] = [];
    const durMs = Math.round(effectiveDuration * 1000);

    if (patternId === 'search-icon-expand') {
      setSearchOpen(true);
      timers.push(window.setTimeout(() => setSearchText('スライド'), 120 + Math.round(durMs * 0.6)));
      timers.push(
        window.setTimeout(() => {
          setSearchText('');
          setSearchOpen(false);
        }, 1500 + durMs)
      );
    } else if (patternId === 'search-inline-bar') {
      setInlineFocused(true);
      timers.push(window.setTimeout(() => setSearchText('スクロール連動'), 260));
      timers.push(window.setTimeout(() => setInlineFocused(false), 1600 + durMs));
    } else if (patternId === 'search-command-modal') {
      setModalOpen(true);
      timers.push(window.setTimeout(() => setModalOpen(false), durMs + 1450));
    } else if (patternId === 'micro-tactile-press') {
      setDemoPressed(true);
      timers.push(window.setTimeout(() => setDemoPressed(false), Math.max(260, durMs + 160)));
    } else if (patternId === 'micro-click-ripple') {
      const btn = rippleBtnRef.current;
      const w = btn ? btn.offsetWidth : 180;
      const h = btn ? btn.offsetHeight : 44;
      const id = ++rippleSeqRef.current;
      setRipples((prev) => [...prev, { id, x: w * 0.35, y: h * 0.5 }]);
      timers.push(
        window.setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, durMs + 100)
      );
    } else if (patternId === 'micro-underline-sweep') {
      setHoverSweep(true);
      timers.push(window.setTimeout(() => setHoverSweep(false), 750 + durMs));
    } else if (patternId === 'micro-magnetic-button') {
      const d = controls.distance;
      const stepMs = Math.max(360, durMs + 160);
      setMagOffset({ x: d * 0.85, y: -d * 0.45 });
      timers.push(window.setTimeout(() => setMagOffset({ x: -d * 0.6, y: d * 0.5 }), stepMs));
      timers.push(window.setTimeout(() => setMagOffset({ x: 0, y: 0 }), stepMs * 2));
    } else if (patternId === 'layout-sticky-split' || patternId === 'layout-shrinking-header') {
      const el = scrollContainerRef.current;
      if (el) {
        el.scrollTop = 0;
        const halfMs = Math.max(450, Math.round(durMs * 0.65));
        const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
        scrollCancelRef.current?.();
        scrollCancelRef.current = animateScrollTopTo(el, maxScroll, halfMs, () => {
          timers.push(
            window.setTimeout(() => {
              scrollCancelRef.current = animateScrollTopTo(el, 0, halfMs);
            }, 400)
          );
        });
      }
    } else if (patternId === 'layout-marquee-loop') {
      setMarqueeRunning(true);
    } else if (patternId === 'layout-skeleton-toast') {
      setLoadingPhase('loading');
      timers.push(window.setTimeout(() => setLoadingPhase('done'), Math.max(900, durMs + 400)));
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      scrollCancelRef.current?.();
      scrollCancelRef.current = null;
    };
  }, [patternId, playKey, isWaitingStart, effectiveDuration, controls.distance]);

  // Handle manual scroll inside layout mini-pages
  const handleMiniScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const max = Math.max(1, el.scrollHeight - el.clientHeight);
    setScrollRatio(Math.min(1, Math.max(0, el.scrollTop / max)));
    setIsCompactHeader(el.scrollTop > 18);
  };

  switch (patternId) {
    // =========================================================================
    // 05. 検索UIの置き方 (search)
    // =========================================================================
    case 'search-icon-expand':
      return (
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-zinc-800 shrink-0">KatakataLab</span>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              {!searchOpen && (
                <span className="hidden sm:inline text-[11px] text-zinc-400 shrink-0">記事・作品</span>
              )}
              <div
                className={`flex h-9 max-w-full items-center overflow-hidden rounded-full border bg-zinc-50 ${
                  showXRay
                    ? 'border-2 border-dashed border-orange-500'
                    : searchOpen
                      ? 'border-blue-500 bg-white ring-2 ring-blue-500/15'
                      : 'border-zinc-200 hover:border-zinc-300'
                }`}
                style={{
                  width: searchOpen ? `min(${controls.distance}px, 100%)` : '36px',
                  transition: `width ${effectiveDuration}s ${easeCss}, border-color 0.2s ease`
                }}
              >
                <button
                  type="button"
                  aria-label="検索を開く"
                  onClick={() => {
                    const next = !searchOpen;
                    setSearchOpen(next);
                    if (next) {
                      scheduleCleanupTimer(() => expandInputRef.current?.focus(), 60);
                    }
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-zinc-600 cursor-pointer"
                >
                  <Search className="h-4 w-4" />
                </button>
                <input
                  ref={expandInputRef}
                  type="search"
                  maxLength={60}
                  value={searchText}
                  onChange={(e) => setSearchText(sanitizePlainText(e.target.value, 60))}
                  placeholder="キーワード..."
                  className="w-full bg-transparent pr-2 text-xs text-zinc-800 outline-none"
                  style={{
                    opacity: searchOpen ? 1 : 0,
                    transition: `opacity ${effectiveDuration * 0.7}s ease`
                  }}
                />
                {searchOpen && searchText && (
                  <button
                    type="button"
                    aria-label="クリア"
                    onClick={() => setSearchText('')}
                    className="pr-2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {showXRay && (
            <div className="mt-2.5 text-[10px] font-mono text-orange-700">
              普段は幅 36px → 開くと {controls.distance}px に横伸び + 自動focus
            </div>
          )}
        </div>
      );

    case 'search-inline-bar':
      return (
        <div className="w-full max-w-sm space-y-2">
          <div
            className={`flex items-center gap-2 rounded-xl border bg-white p-1.5 pl-3 transition-all ${
              inlineFocused
                ? 'border-blue-600 ring-3 ring-blue-600/15'
                : 'border-zinc-300 focus-within:border-blue-600 focus-within:ring-3 focus-within:ring-blue-600/15'
            }`}
            style={{ transitionDuration: `${effectiveDuration}s` }}
          >
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <input
              type="search"
              maxLength={60}
              value={searchText}
              onChange={(e) => setSearchText(sanitizePlainText(e.target.value, 60))}
              placeholder="例：文字、ハンバーガー、スクロール"
              className="w-full bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 outline-none"
            />
            {searchText && (
              <button
                type="button"
                aria-label="消去"
                onClick={() => setSearchText('')}
                className="rounded p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              探す
            </button>
          </div>
          {showXRay && (
            <div className="text-[10px] font-mono text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
              親に :focus-within 指定 ／ 左アイコン・中央伸縮(flex:1)・右ボタンの定番配置
            </div>
          )}
        </div>
      );

    case 'search-backdrop-typography': {
      const bgAlpha = (controls.distance / 100).toFixed(2);
      return (
        <div className="relative flex w-full max-w-sm flex-col items-center justify-center py-6 px-3">
          {/* 背面（z:1）の大きな透かし文字 */}
          <div
            key={playKey}
            aria-hidden="true"
            className={`pointer-events-none select-none font-black tracking-[0.18em] text-4xl sm:text-5xl ${
              showXRay ? 'border border-dashed border-orange-500 px-2 rounded' : ''
            }`}
            style={{
              position: 'absolute',
              zIndex: 1,
              color: showXRay ? 'rgba(234, 88, 12, 0.25)' : `rgba(24, 24, 27, ${bgAlpha})`,
              ...(isWaitingStart
                ? { opacity: 0, transform: 'translate3d(0, 16px, 0) scale(0.97)' }
                : playKey > 0
                  ? ({
                      '--anim-dist': '16px',
                      animation: `atlasFadeLift ${effectiveDuration}s ${easeCss} both`
                    } as React.CSSProperties)
                  : {})
            }}
          >
            SEARCH
          </div>

          {showXRay && (
            <span className="absolute top-1 left-2 z-30 rounded bg-orange-600 px-1.5 py-0.5 text-[9px] font-mono text-white">
              背面 z-index: 1（クリック透過）
            </span>
          )}

          {/* 前面（z:2）の半透明ぼかし検索バー */}
          <div
            className={`relative z-20 flex w-full items-center gap-2 rounded-xl border bg-white/88 px-3 py-2 shadow-md backdrop-blur-sm ${
              showXRay ? 'border-2 border-dashed border-blue-600' : 'border-zinc-200'
            }`}
          >
            <Search className="h-4 w-4 text-zinc-500 shrink-0" />
            <input
              type="search"
              maxLength={60}
              value={searchText}
              onChange={(e) => setSearchText(sanitizePlainText(e.target.value, 60))}
              placeholder="キーワードで検索..."
              className="w-full bg-transparent text-xs text-zinc-900 outline-none"
            />
            <span className="rounded bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-white shrink-0">
              Go
            </span>
          </div>

          {showXRay && (
            <span className="mt-4 rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-mono text-white">
              前面 z-index: 2（白88% + backdrop-blur で文字の可読性を維持）
            </span>
          )}
        </div>
      );
    }

    case 'search-command-modal':
      return (
        <div className="relative flex h-44 w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="mb-2 text-[11px] text-zinc-400">ヘッダーに小さく置くボタン</div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-2xs hover:border-zinc-400 cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span>クイック検索</span>
            <kbd className="rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500">
              ⌘K
            </kbd>
          </button>

          {/* 擬似モーダルオーバーレイ */}
          <div
            aria-hidden={!modalOpen}
            onClick={() => setModalOpen(false)}
            className="absolute inset-0 z-20 flex items-start justify-center bg-zinc-900/25 p-3 pt-4 backdrop-blur-[1px]"
            style={{
              opacity: modalOpen ? 1 : 0,
              pointerEvents: modalOpen ? 'auto' : 'none',
              transition: `opacity ${effectiveDuration}s ease`
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-[270px] rounded-xl border bg-white p-2.5 shadow-xl ${
                showXRay ? 'border-2 border-dashed border-orange-500' : 'border-zinc-200'
              }`}
              style={{
                transform: modalOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-8px)',
                transition: `transform ${effectiveDuration}s ${easeCss}`
              }}
            >
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
                <Search className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs text-zinc-400">ページ・機能を検索...</span>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="ml-auto rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 cursor-pointer"
                >
                  ESC
                </button>
              </div>
              <div className="mt-1.5 space-y-1 text-[11px]">
                <div className="rounded bg-blue-50 px-2 py-1 font-medium text-blue-700">
                  → 文字アニメーション一覧
                </div>
                <div className="rounded px-2 py-1 text-zinc-600">→ 検索UIのレイアウト</div>
              </div>
            </div>
          </div>
        </div>
      );

    // =========================================================================
    // 06. ボタン・ホバー反応 (micro)
    // =========================================================================
    case 'micro-tactile-press':
      return (
        <div className="flex flex-col items-center justify-center">
          <button
            type="button"
            onMouseDown={() => setDemoPressed(true)}
            onMouseUp={() => setDemoPressed(false)}
            onMouseLeave={() => setDemoPressed(false)}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white cursor-pointer select-none"
            style={{
              transform: demoPressed ? `translateY(${controls.distance}px)` : 'translateY(0)',
              boxShadow: demoPressed
                ? '0 0 0 #1d4ed8'
                : `0 ${controls.distance}px 0 #1d4ed8`,
              transition: `transform ${effectiveDuration}s ease, box-shadow ${effectiveDuration}s ease`
            }}
          >
            押してみる（クリック！）
          </button>
          {showXRay && (
            <div className="mt-4 text-[11px] font-mono text-orange-700">
              {demoPressed
                ? `押下中: 下へ +${controls.distance}px & 影 0px`
                : `通常時: 下影 ${controls.distance}px（ぼかし無し）`}
            </div>
          )}
        </div>
      );

    case 'micro-click-ripple':
      return (
        <div className="flex flex-col items-center justify-center">
          <button
            ref={rippleBtnRef}
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              const id = ++rippleSeqRef.current;
              setRipples((prev) => [...prev, { id, x, y }]);
              scheduleCleanupTimer(() => {
                setRipples((prev) => prev.filter((r) => r.id !== id));
              }, Math.round(effectiveDuration * 1000) + 60);
            }}
            className={`relative overflow-hidden rounded-xl border bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-xs hover:bg-zinc-50 cursor-pointer select-none ${
              showXRay ? 'border-2 border-dashed border-orange-500' : 'border-zinc-300'
            }`}
          >
            <span className="relative z-10">好きな場所をクリック</span>
            {ripples.map((r) => (
              <span
                key={r.id}
                aria-hidden="true"
                className="pointer-events-none absolute h-20 w-20 rounded-full bg-blue-600/25"
                style={{
                  left: `${r.x}px`,
                  top: `${r.y}px`,
                  animation: `atlasRippleOut ${effectiveDuration}s ease-out forwards`
                }}
              />
            ))}
          </button>
          {showXRay && (
            <div className="mt-3 text-[11px] font-mono text-zinc-600">
              クリック座標(x, y)から円形 span を scale(0 → 2.8) 拡大
            </div>
          )}
        </div>
      );

    case 'micro-underline-sweep':
      return (
        <div className="flex flex-col items-center justify-center">
          <a
            href="#sweep-demo"
            onClick={(e) => e.preventDefault()}
            onMouseEnter={() => setHoverSweep(true)}
            onMouseLeave={() => setHoverSweep(false)}
            className="relative inline-block pb-1 text-lg font-bold text-zinc-900"
          >
            <span>カーソルを乗せて離してみてください →</span>
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-0.5 w-full bg-blue-600"
              style={{
                transform: hoverSweep ? 'scaleX(1)' : 'scaleX(0)',
                transformOrigin: hoverSweep ? 'left center' : 'right center',
                transition: `transform ${effectiveDuration}s ${easeCss}`
              }}
            />
          </a>
          {showXRay && (
            <div className="mt-3 text-[11px] font-mono text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-0.5">
              現在の支点: {hoverSweep ? '左端 (left) から伸びる' : '右端 (right) へ抜ける'}
            </div>
          )}
        </div>
      );

    case 'micro-magnetic-button':
      return (
        <div className="flex flex-col items-center justify-center">
          <div
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
              const relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
              setMagOffset({
                x: Math.round(relX * controls.distance),
                y: Math.round(relY * controls.distance)
              });
            }}
            onMouseLeave={() => setMagOffset({ x: 0, y: 0 })}
            className={`flex h-28 w-64 items-center justify-center rounded-xl ${
              showXRay ? 'border border-dashed border-blue-400 bg-blue-50/30' : ''
            }`}
          >
            <button
              type="button"
              className="rounded-full bg-zinc-900 px-6 py-2.5 text-xs font-bold tracking-wider text-white shadow cursor-pointer"
              style={{
                transform: `translate3d(${magOffset.x}px, ${magOffset.y}px, 0)`,
                transition: `transform ${effectiveDuration}s cubic-bezier(0.22, 1, 0.36, 1)`
              }}
            >
              MAGNET BUTTON
            </button>
          </div>
          {showXRay && (
            <div className="mt-1 text-[11px] font-mono text-blue-700">
              追従量: x={magOffset.x}px, y={magOffset.y}px（最大 ±{controls.distance}px）
            </div>
          )}
        </div>
      );

    // =========================================================================
    // 07. 立て付け・スクロール・待機 (layout)
    // =========================================================================
    case 'layout-sticky-split':
      return (
        <div className="w-full max-w-sm">
          <div
            ref={scrollContainerRef}
            onScroll={handleMiniScroll}
            className="atlas-scroll h-44 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3"
          >
            <div className="grid grid-cols-[1fr_1.25fr] items-start gap-3">
              <div
                className={`sticky top-0 rounded-lg bg-white p-2.5 shadow-2xs ${
                  showXRay ? 'border-2 border-dashed border-orange-500' : 'border border-zinc-200'
                }`}
              >
                <div className="text-xs font-bold text-zinc-900">左カラム固定</div>
                <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                  右をスクロールしてもここが見え続けます。
                </p>
                {showXRay && (
                  <span className="mt-1 inline-block rounded bg-orange-100 px-1 text-[9px] font-mono text-orange-800">
                    position: sticky
                  </span>
                )}
              </div>
              <div className="space-y-2 pb-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className="rounded-lg border border-zinc-200 bg-white p-2.5 text-[11px] font-medium text-zinc-700"
                  >
                    特徴アイテム 0{n}
                    <div className="mt-1 h-2 w-24 rounded bg-zinc-100" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    case 'layout-shrinking-header':
      return (
        <div className="w-full max-w-sm">
          <div
            ref={scrollContainerRef}
            onScroll={handleMiniScroll}
            className="atlas-scroll relative h-44 overflow-y-auto rounded-xl border border-zinc-200 bg-white"
          >
            <div
              className={`sticky top-0 z-10 border-b backdrop-blur-sm transition-all ${
                isCompactHeader
                  ? 'border-zinc-200 bg-white/95 px-3 py-1.5 shadow-xs'
                  : 'border-zinc-100 bg-white px-3 py-3.5'
              }`}
              style={{ transitionDuration: `${effectiveDuration}s` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-zinc-900">Katakata Site</span>
                <span className="text-[10px] font-medium text-zinc-500">
                  {isCompactHeader ? 'スリム状態' : '通常高さ'}
                </span>
              </div>
              {/* 読了進捗バー */}
              <div
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-0.5 w-full bg-blue-600"
                style={{
                  transformOrigin: 'left center',
                  transform: `scaleX(${scrollRatio})`
                }}
              />
            </div>

            <div className="space-y-2 p-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="rounded-lg border border-zinc-100 bg-zinc-50 p-2.5 text-[11px] text-zinc-600">
                  本文ブロック {n}（下にスクロールするとヘッダーが縮みます）
                </div>
              ))}
            </div>
          </div>
          {showXRay && (
            <div className="mt-1.5 text-[10px] font-mono text-blue-700">
              スクロール量に応じ padding 縮小 ＋ scaleX({scrollRatio.toFixed(2)}) ゲージ
            </div>
          )}
        </div>
      );

    case 'layout-bento-grid':
      return (
        <div className="w-full max-w-sm">
          <div className="grid grid-cols-3" style={{ gap: `${controls.distance}px` }}>
            <div
              key={`b0-${playKey}`}
              className={`col-span-2 rounded-xl border bg-blue-50/70 p-3 ${
                showXRay ? 'border-2 border-dashed border-orange-500' : 'border-blue-200'
              }`}
              style={
                isWaitingStart
                  ? { opacity: 0, transform: 'translate3d(0, 16px, 0) scale(0.95)' }
                  : playKey > 0
                    ? ({
                        '--anim-dist': '16px',
                        animation: `atlasStaggerCard ${effectiveDuration}s ${easeCss} both`
                      } as React.CSSProperties)
                    : undefined
              }
            >
              <div className="text-xs font-bold text-blue-900">主役カード（横2マス結合）</div>
              <div className="mt-1 text-[10px] text-blue-700">
                {showXRay ? 'grid-column: span 2' : '一番伝えたい機能'}
              </div>
            </div>

            <div
              key={`b1-${playKey}`}
              className="rounded-xl border border-zinc-200 bg-white p-3"
              style={
                isWaitingStart
                  ? { opacity: 0, transform: 'translate3d(0, 16px, 0) scale(0.95)' }
                  : playKey > 0
                    ? ({
                        '--anim-dist': '16px',
                        animation: `atlasStaggerCard ${effectiveDuration}s ${easeCss} both`,
                        animationDelay: `${Math.round(120 * slowFactor)}ms`
                      } as React.CSSProperties)
                    : undefined
              }
            >
              <div className="text-xs font-bold text-zinc-800">数値</div>
              <div className="mt-1 text-base font-extrabold text-zinc-900">98%</div>
            </div>

            {['軽快', '直感的', '安全'].map((label, idx) => (
              <div
                key={`b-${label}-${playKey}`}
                className="rounded-xl border border-zinc-200 bg-white p-2.5 text-center"
                style={
                  isWaitingStart
                    ? { opacity: 0, transform: 'translate3d(0, 16px, 0) scale(0.95)' }
                    : playKey > 0
                      ? ({
                          '--anim-dist': '16px',
                          animation: `atlasStaggerCard ${effectiveDuration}s ${easeCss} both`,
                          animationDelay: `${Math.round((idx + 2) * 120 * slowFactor)}ms`
                        } as React.CSSProperties)
                      : undefined
                }
              >
                <div className="text-xs font-semibold text-zinc-800">{label}</div>
              </div>
            ))}
          </div>
          {showXRay && (
            <div className="mt-2 text-center text-[10px] font-mono text-orange-700">
              3列グリッド + 余白 {controls.distance}px + span 2 の強弱
            </div>
          )}
        </div>
      );

    case 'layout-marquee-loop': {
      const tags = ['Text Reveal', 'Drawer Nav', 'Sliding Tabs', 'Search UI', 'Bento Grid'];
      return (
        <div className="w-full max-w-sm space-y-2">
          <div
            role="button"
            tabIndex={0}
            aria-label={marqueeRunning ? 'マーキーを一時停止' : 'マーキーを再開'}
            onClick={() => setMarqueeRunning((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setMarqueeRunning((v) => !v);
              }
            }}
            onMouseEnter={() => setMarqueeRunning(false)}
            onMouseLeave={() => setMarqueeRunning(true)}
            className={`relative overflow-hidden rounded-xl border bg-white py-3 cursor-pointer ${
              showXRay ? 'border-2 border-dashed border-orange-500' : 'border-zinc-200'
            }`}
            style={{
              maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
            }}
          >
            <div
              key={playKey}
              className="flex w-max gap-2.5"
              style={{
                animation: isWaitingStart
                  ? 'none'
                  : `atlasMarqueeScroll ${effectiveDuration}s linear infinite`,
                animationPlayState: marqueeRunning ? 'running' : 'paused'
              }}
            >
              {[0, 1].map((dupIdx) => (
                <div key={dupIdx} className="flex gap-2.5 pr-2.5">
                  {tags.map((tag) => (
                    <span
                      key={`${dupIdx}-${tag}`}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        dupIdx === 1 && showXRay
                          ? 'border-dashed border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-800'
                      }`}
                    >
                      {dupIdx === 1 && showXRay ? `[複製] ${tag}` : tag}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          {showXRay && (
            <div className="text-center text-[10px] font-mono text-blue-700">
              通常セット + [複製]セットを横並びし、ちょうど -50% 分進んだら 0% へ瞬間戻し
            </div>
          )}
        </div>
      );
    }

    case 'layout-skeleton-toast':
      return (
        <div
          className={`relative flex h-44 w-full max-w-sm flex-col justify-between overflow-hidden rounded-xl border bg-white p-3.5 shadow-xs ${
            showXRay ? 'border-2 border-dashed border-orange-400' : 'border-zinc-200'
          }`}
        >
          {loadingPhase === 'loading' ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                <span>データを読み込み中...</span>
                {showXRay && (
                  <span className="font-mono text-[9px] text-orange-700">
                    光帯 translateX(-100%→100%)
                  </span>
                )}
              </div>
              <div className="relative h-4 w-3/5 overflow-hidden rounded bg-zinc-200">
                <span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/75 to-transparent"
                  style={{ animation: `atlasSkeletonShimmer ${effectiveDuration}s infinite` }}
                />
              </div>
              <div className="relative h-14 w-full overflow-hidden rounded-lg bg-zinc-200">
                <span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/75 to-transparent"
                  style={{ animation: `atlasSkeletonShimmer ${effectiveDuration}s infinite` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900">データ表示完了</span>
                {showXRay && (
                  <span className="font-mono text-[9px] text-blue-700">state: loading → done</span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                「再生」を押すと読み込みスケルトン → 右下トースト通知の流れが見られます。
              </p>
              <div className="h-12 rounded-lg border border-zinc-100 bg-zinc-50 p-2 text-[11px] text-zinc-600">
                読み込み後のコンテンツ領域
              </div>
            </div>
          )}

          {/* 右下トースト通知 */}
          <div
            className={`self-end rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-white shadow-md transition-all ${
              showXRay ? 'ring-2 ring-orange-400' : ''
            } ${
              loadingPhase === 'done'
                ? 'translate-y-0 opacity-100'
                : 'translate-y-4 opacity-0 pointer-events-none'
            }`}
            style={{ transitionDuration: `${Math.min(1.1, Math.max(0.25, effectiveDuration * 0.32)).toFixed(2)}s` }}
          >
            ✓ 読み込みが完了しました
          </div>
        </div>
      );

    default:
      return null;
  }
};
