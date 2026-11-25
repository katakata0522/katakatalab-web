import React, { useEffect, useRef, useState } from 'react';
import type { StageRendererProps } from './StageTextAndReveal';
import { EASING_OPTIONS } from '../../utils/motionHelpers';

export const StageNavAndTabs: React.FC<StageRendererProps> = ({
  patternId,
  playKey,
  isWaitingStart,
  effectiveDuration,
  controls,
  showXRay
}) => {
  const easeCss = EASING_OPTIONS[controls.easing].css;

  // Nav open/close state
  const [navOpen, setNavOpen] = useState(false);

  // Tab states
  const [underlineIdx, setUnderlineIdx] = useState(0);
  const [pillIdx, setPillIdx] = useState(0);
  const [slideIdx, setSlideIdx] = useState(0);
  const [accOpenIdx, setAccOpenIdx] = useState<number | null>(0);

  // Underline indicator measurements (recalculated on tab change and resize)
  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [lineMetrics, setLineMetrics] = useState({ left: 0, width: 52 });

  useEffect(() => {
    if (patternId !== 'tabs-sliding-underline') return;
    const measure = () => {
      const activeBtn = tabRefs.current[underlineIdx];
      if (activeBtn) {
        setLineMetrics({
          left: activeBtn.offsetLeft,
          width: activeBtn.offsetWidth
        });
      }
    };
    measure();

    const observer =
      typeof ResizeObserver !== 'undefined' && tabBarRef.current
        ? new ResizeObserver(measure)
        : null;
    if (observer && tabBarRef.current) {
      observer.observe(tabBarRef.current);
    }
    window.addEventListener('resize', measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [patternId, underlineIdx]);

  // Auto-choreography when "▶ 再生" is pressed (starts after MotionCard's 0.5s silent lead-in)
  useEffect(() => {
    if (isWaitingStart) {
      setNavOpen(false);
      setUnderlineIdx(0);
      setPillIdx(0);
      setSlideIdx(0);
      setAccOpenIdx(null);
      return;
    }
    if (playKey === 0) return;
    const timers: number[] = [];

    const durMs = Math.round(effectiveDuration * 1000);

    if (
      patternId === 'nav-slide-drawer' ||
      patternId === 'nav-fullscreen-curtain' ||
      patternId === 'nav-top-accordion' ||
      patternId === 'nav-bottom-sheet'
    ) {
      setNavOpen(true);
      timers.push(window.setTimeout(() => setNavOpen(false), durMs + 1400));
    } else if (patternId === 'tabs-sliding-underline') {
      const step = durMs + 550;
      setUnderlineIdx(1);
      timers.push(window.setTimeout(() => setUnderlineIdx(2), step));
      timers.push(window.setTimeout(() => setUnderlineIdx(0), step * 2));
    } else if (patternId === 'tabs-floating-pill') {
      const step = durMs + 550;
      setPillIdx(1);
      timers.push(window.setTimeout(() => setPillIdx(2), step));
      timers.push(window.setTimeout(() => setPillIdx(0), step * 2));
    } else if (patternId === 'tabs-content-slide') {
      const step = durMs + 650;
      setSlideIdx(1);
      timers.push(window.setTimeout(() => setSlideIdx(2), step));
      timers.push(window.setTimeout(() => setSlideIdx(0), step * 2));
    } else if (patternId === 'tabs-smooth-accordion') {
      setAccOpenIdx(0);
      timers.push(window.setTimeout(() => setAccOpenIdx(1), durMs + 850));
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [patternId, playKey, isWaitingStart, effectiveDuration]);

  // Hamburger icon helper (morphs cleanly into X)
  const renderHamburgerButton = (onClick: () => void, open: boolean, lightOnDark = false) => (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label="メニューを開く"
      className={`relative z-30 flex h-8 w-8 flex-col items-center justify-center gap-1 rounded-md border transition-colors cursor-pointer ${
        lightOnDark && open
          ? 'border-zinc-600 bg-zinc-800 text-white'
          : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
      }`}
    >
      <span
        className="block h-0.5 w-4 rounded-full bg-current"
        style={{
          transition: `transform ${effectiveDuration}s ${easeCss}`,
          transform: open ? 'translateY(6px) rotate(45deg)' : 'none'
        }}
      />
      <span
        className="block h-0.5 w-4 rounded-full bg-current"
        style={{
          transition: `opacity ${effectiveDuration * 0.6}s ease`,
          opacity: open ? 0 : 1
        }}
      />
      <span
        className="block h-0.5 w-4 rounded-full bg-current"
        style={{
          transition: `transform ${effectiveDuration}s ${easeCss}`,
          transform: open ? 'translateY(-6px) rotate(-45deg)' : 'none'
        }}
      />
    </button>
  );

  switch (patternId) {
    case 'nav-slide-drawer':
      return (
        <div className="relative h-44 w-full max-w-sm overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
          {/* ミニサイトヘッダー */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-3.5 py-2">
            <span className="text-xs font-bold text-zinc-800">MySite</span>
            {renderHamburgerButton(() => setNavOpen((v) => !v), navOpen)}
          </div>

          {/* ミニページ本文 */}
          <div className="p-3.5 space-y-2">
            <div className="h-3 w-28 rounded bg-zinc-200" />
            <div className="h-2.5 w-44 rounded bg-zinc-100" />
            <div className="h-14 w-full rounded-lg border border-zinc-100 bg-zinc-50" />
          </div>

          {/* 半透明の暗幕 */}
          <div
            onClick={() => setNavOpen(false)}
            className="absolute inset-0 z-10 bg-zinc-900/25"
            style={{
              opacity: navOpen ? 1 : 0,
              pointerEvents: navOpen ? 'auto' : 'none',
              transition: `opacity ${effectiveDuration}s ease`
            }}
          />

          {/* 右端からスライドするドロワー */}
          <nav
            aria-hidden={!navOpen}
            className={`absolute top-0 right-0 bottom-0 z-20 flex flex-col gap-2 bg-white p-4 pt-12 shadow-lg ${
              showXRay ? 'border-l-2 border-dashed border-orange-500' : 'border-l border-zinc-200'
            }`}
            style={{
              width: `${controls.distance}%`,
              transform: navOpen ? 'translate3d(0, 0, 0)' : 'translate3d(100%, 0, 0)',
              transition: `transform ${effectiveDuration}s ${easeCss}`
            }}
          >
            <span className="text-[11px] font-semibold text-zinc-400">MENU</span>
            <span className="rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">
              ホーム
            </span>
            <span className="px-2.5 py-1 text-xs text-zinc-700">制作実績</span>
            <span className="px-2.5 py-1 text-xs text-zinc-700">お問い合わせ</span>
            {showXRay && (
              <span className="mt-auto text-[10px] font-mono text-orange-700">
                幅 {controls.distance}% / {navOpen ? 'translateX(0)' : '待機: +100%'}
              </span>
            )}
          </nav>
        </div>
      );

    case 'nav-fullscreen-curtain':
      return (
        <div className="relative h-44 w-full max-w-sm overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 px-3.5 py-2">
            <span className="text-xs font-bold text-zinc-800">Studio</span>
            {renderHamburgerButton(() => setNavOpen((v) => !v), navOpen, true)}
          </div>

          <div className="p-4 space-y-2">
            <div className="text-xs font-semibold text-zinc-700">記事コンテンツ領域</div>
            <div className="h-2.5 w-48 rounded bg-zinc-100" />
            <div className="h-2.5 w-36 rounded bg-zinc-100" />
          </div>

          {/* サークルクリップ展開メニュー */}
          <div
            aria-hidden={!navOpen}
            className="absolute inset-0 z-20 flex flex-col justify-center bg-zinc-900 px-6 text-white"
            style={{
              clipPath: navOpen
                ? 'circle(150% at calc(100% - 26px) 22px)'
                : 'circle(0% at calc(100% - 26px) 22px)',
              pointerEvents: navOpen ? 'auto' : 'none',
              transition: `clip-path ${effectiveDuration}s ${easeCss}`
            }}
          >
            <div className="space-y-1.5">
              <div className="text-sm font-bold text-blue-400">01. Concept</div>
              <div className="text-sm font-bold">02. Works</div>
              <div className="text-sm font-bold">03. Contact</div>
            </div>
            {showXRay && (
              <div className="mt-3 text-[10px] font-mono text-amber-300">
                clip-path: circle(0% → 150% at 右上ボタン座標)
              </div>
            )}
          </div>
        </div>
      );

    case 'nav-top-accordion':
      return (
        <div className="w-full max-w-sm overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 px-3.5 py-2">
            <span className="text-xs font-bold text-zinc-800">Help Docs</span>
            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
            >
              {navOpen ? 'MENU ✕' : 'MENU ☰'}
            </button>
          </div>

          {/* 0fr → 1fr 展開領域 */}
          <div
            className={showXRay ? 'border-b-2 border-dashed border-orange-400 bg-orange-50/40' : 'bg-zinc-50'}
            style={{
              display: 'grid',
              gridTemplateRows: navOpen ? '1fr' : '0fr',
              transition: `grid-template-rows ${effectiveDuration}s ${easeCss}`
            }}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-col gap-1 px-3.5 py-2.5 text-xs font-medium text-zinc-700">
                <span className="rounded px-2 py-1 bg-white border border-zinc-200">ホーム</span>
                <span className="rounded px-2 py-1 hover:bg-white">使い方ガイド</span>
                <span className="rounded px-2 py-1 hover:bg-white">料金プラン</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 space-y-1.5">
            <div className="text-xs font-semibold text-zinc-700">下の記事本文（押し下げられる）</div>
            <div className="h-2.5 w-44 rounded bg-zinc-100" />
            {showXRay && (
              <div className="text-[10px] font-mono text-orange-700">
                grid-template-rows: {navOpen ? '1fr（開）' : '0fr（閉）'}
              </div>
            )}
          </div>
        </div>
      );

    case 'nav-bottom-sheet':
      return (
        <div className="relative h-48 w-56 overflow-hidden rounded-2xl border-2 border-zinc-300 bg-zinc-50 shadow-xs">
          <div className="p-3 text-center text-[11px] font-semibold text-zinc-500">
            スマホ画面イメージ
          </div>
          <div className="px-3 space-y-2">
            <div className="h-10 rounded-lg bg-white border border-zinc-200" />
            <div className="h-10 rounded-lg bg-white border border-zinc-200" />
          </div>

          {/* 親指ゾーンのトリガー */}
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow cursor-pointer"
          >
            メニューを開く
          </button>

          {/* 暗幕 */}
          <div
            onClick={() => setNavOpen(false)}
            className="absolute inset-0 z-10 bg-zinc-900/25"
            style={{
              opacity: navOpen ? 1 : 0,
              pointerEvents: navOpen ? 'auto' : 'none',
              transition: `opacity ${effectiveDuration}s ease`
            }}
          />

          {/* ボトムシート */}
          <div
            className={`absolute inset-x-0 bottom-0 z-20 rounded-t-2xl bg-white px-4 pb-3 pt-2 shadow-xl ${
              showXRay ? 'border-t-2 border-dashed border-orange-500' : 'border-t border-zinc-200'
            }`}
            style={{
              transform: navOpen ? 'translate3d(0, 0, 0)' : 'translate3d(0, 100%, 0)',
              transition: `transform ${effectiveDuration}s ${easeCss}`
            }}
          >
            <div className="mx-auto mb-2.5 h-1 w-8 rounded-full bg-zinc-300" />
            <div className="space-y-1.5 text-xs font-medium text-zinc-800">
              <div className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-blue-700">メニュー項目 A</div>
              <div className="rounded-lg px-2.5 py-1 hover:bg-zinc-50">メニュー項目 B</div>
            </div>
            {showXRay && (
              <div className="mt-1.5 text-center text-[9px] font-mono text-orange-700">
                bottom:0 / translateY(100%→0)
              </div>
            )}
          </div>
        </div>
      );

    case 'tabs-sliding-underline': {
      const labels = ['概要', '仕組み', '応用事例'];
      return (
        <div className="flex flex-col items-center justify-center">
          <div ref={tabBarRef} className="relative inline-flex border-b border-zinc-200" role="tablist">
            {labels.map((lbl, idx) => (
              <button
                key={lbl}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                type="button"
                role="tab"
                aria-selected={underlineIdx === idx}
                onClick={() => setUnderlineIdx(idx)}
                className={`px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                  underlineIdx === idx ? 'text-blue-600' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {lbl}
              </button>
            ))}
            <span
              className={`absolute -bottom-px left-0 ${
                showXRay ? 'h-1 bg-orange-500' : 'h-0.5 bg-blue-600'
              }`}
              style={{
                width: `${lineMetrics.width}px`,
                transform: `translate3d(${lineMetrics.left}px, 0, 0)`,
                transition: `transform ${effectiveDuration}s ${easeCss}, width ${effectiveDuration}s ${easeCss}`
              }}
            />
          </div>
          {showXRay && (
            <div className="mt-4 text-[11px] font-mono text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-0.5">
              1本の線のみ: left={lineMetrics.left}px / width={lineMetrics.width}px
            </div>
          )}
        </div>
      );
    }

    case 'tabs-floating-pill': {
      const labels = ['日次', '週次', '月次'];
      return (
        <div className="flex flex-col items-center justify-center">
          <div
            className="relative grid w-64 grid-cols-3 rounded-full bg-zinc-100 p-1 border border-zinc-200/70"
            role="tablist"
          >
            {/* 裏で滑る白い座布団 */}
            <span
              aria-hidden="true"
              className={`absolute top-1 bottom-1 left-1 rounded-full bg-white shadow-sm ${
                showXRay ? 'border-2 border-dashed border-orange-500' : ''
              }`}
              style={{
                width: 'calc((100% - 8px) / 3)',
                transform: `translate3d(${pillIdx * 100}%, 0, 0)`,
                transition: `transform ${effectiveDuration}s ${easeCss}`
              }}
            />
            {labels.map((lbl, idx) => (
              <button
                key={lbl}
                type="button"
                onClick={() => setPillIdx(idx)}
                className={`relative z-10 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  pillIdx === idx ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
          {showXRay && (
            <div className="mt-3 text-[11px] font-mono text-orange-700">
              背面座布団（z:1）を translateX({pillIdx * 100}%) へ移動
            </div>
          )}
        </div>
      );
    }

    case 'tabs-content-slide': {
      const pages = [
        { title: 'Step 1：選ぶ', desc: 'カテゴリから使いたい動きを探します。' },
        { title: 'Step 2：調整', desc: '速さや距離をスライダーで微調整します。' },
        { title: 'Step 3：指示', desc: 'AI用プロンプトをそのままコピーします。' }
      ];
      return (
        <div className="w-full max-w-xs">
          <div className="mb-2 flex justify-center gap-1.5">
            {pages.map((p, idx) => (
              <button
                key={p.title}
                type="button"
                onClick={() => setSlideIdx(idx)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  slideIdx === idx
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                Step {idx + 1}
              </button>
            ))}
          </div>

          <div
            className={`rounded-xl bg-white ${
              showXRay
                ? 'border-2 border-dashed border-orange-500 overflow-hidden'
                : 'border border-zinc-200 overflow-hidden'
            }`}
          >
            <div
              className="flex"
              style={{
                transform: `translate3d(-${slideIdx * 100}%, 0, 0)`,
                transition: `transform ${effectiveDuration}s ${easeCss}`
              }}
            >
              {pages.map((page) => (
                <div key={page.title} className="w-full shrink-0 p-4 text-center">
                  <div className="text-sm font-bold text-zinc-900">{page.title}</div>
                  <p className="mt-1 text-xs text-zinc-500">{page.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {showXRay && (
            <div className="mt-2 text-center text-[10px] font-mono text-orange-700">
              窓枠 overflow: hidden ／ 中身ベルトを translateX(-{slideIdx * 100}%)
            </div>
          )}
        </div>
      );
    }

    case 'tabs-smooth-accordion': {
      const faqs = [
        {
          q: 'コードが書けなくても使えますか？',
          a: 'はい！動きを見て「AIへの指示文をコピー」を押すだけで再現できます。'
        },
        {
          q: '速度を変えたら指示文も変わりますか？',
          a: 'リアルタイムで数値が反映されたプロンプトとコードが出力されます。'
        }
      ];
      return (
        <div className="w-full max-w-xs space-y-2">
          {faqs.map((item, idx) => {
            const isOpen = accOpenIdx === idx;
            return (
              <div
                key={item.q}
                className={`rounded-xl border bg-white ${
                  showXRay && isOpen ? 'border-dashed border-orange-500' : 'border-zinc-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setAccOpenIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-xs font-bold text-zinc-800 cursor-pointer"
                >
                  <span>{item.q}</span>
                  <span
                    className="inline-block text-base leading-none text-blue-600"
                    style={{
                      transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                      transition: `transform ${effectiveDuration}s ${easeCss}`
                    }}
                  >
                    +
                  </span>
                </button>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateRows: isOpen ? '1fr' : '0fr',
                    opacity: isOpen ? 1 : 0,
                    transition: `grid-template-rows ${effectiveDuration}s ${easeCss}, opacity ${effectiveDuration}s ease`
                  }}
                >
                  <div className="min-h-0 overflow-hidden">
                    <p className="px-3.5 pb-2.5 text-[11px] leading-relaxed text-zinc-500">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    default:
      return null;
  }
};
