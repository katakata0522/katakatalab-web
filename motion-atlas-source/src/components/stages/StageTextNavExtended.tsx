import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  Check,
  Compass,
  Copy,
  Heart,
  Home,
  Search,
  Settings,
  Sparkles
} from 'lucide-react';
import type { StageRendererProps } from './StageTextAndReveal';
import { EASING_OPTIONS } from '../../utils/motionHelpers';
import { sanitizePlainText } from '../../utils/security';

const SLOT_WORDS = ['伝わる', '心地よい', '迷わない', '動き出す'] as const;

const FILTER_CHIP_ITEMS = [
  { id: 'all', label: 'すべて' },
  { id: 'text', label: '文字' },
  { id: 'nav', label: 'ナビ' },
  { id: 'forms', label: 'フォーム' }
] as const;

const FILTER_CARDS = [
  { title: 'スライド出現', cat: 'text', serial: '#001' },
  { title: 'ドロワー開閉', cat: 'nav', serial: '#011' },
  { title: 'バリデーション揺れ', cat: 'forms', serial: '#089' },
  { title: '一文字ずつの余韻', cat: 'text', serial: '#064' }
] as const;

const SETTINGS_TABS = [
  { id: 'account', label: 'アカウント', desc: '表示名・メールアドレス・言語設定を管理します' },
  { id: 'notify', label: '通知設定', desc: '週次レポートと重要アラートの配信頻度を変更します' },
  { id: 'security', label: 'セキュリティ', desc: '2段階認証とログイン履歴を安全に確認できます' }
] as const;

const AUTOCOMPLETE_DICT = [
  { serial: '#014', label: '検索スポットライト（モーダル）', tag: '検索' },
  { serial: '#038', label: 'トグルスイッチ切り替え', tag: 'ボタン' },
  { serial: '#064', label: '字間が詰まるシネマ登場', tag: '文字' },
  { serial: '#084', label: '長押しで確定する破壊操作防止', tag: 'ボタン' },
  { serial: '#095', label: 'ページトップへ戻る静的ボタン', tag: '案内' }
] as const;

const POPULAR_CHIPS = ['#001 下から出現', '#014 検索モーダル', '#046 料金トグル', '#084 長押し確定'] as const;

export const StageTextNavExtended: React.FC<StageRendererProps> = ({
  patternId,
  playKey,
  isWaitingStart,
  slowFactor,
  effectiveDuration,
  controls,
  showXRay,
  viewportMode = 'desktop'
}) => {
  const easeCss = EASING_OPTIONS[controls.easing].css;
  const isMobile = viewportMode === 'mobile';
  const badgeCircleId = useId();

  // #064 text-tracking-compress / #068 text-outline-fill / #071 reveal-blur-focus
  const [introActive, setIntroActive] = useState(playKey === 0);

  // #065 text-scroll-fill
  const [fillPct, setFillPct] = useState(64);
  const fillRafRef = useRef<number | null>(null);

  // #066 text-word-slot
  const [slotIdx, setSlotIdx] = useState(0);

  // #069 reveal-frame-zoom & #070 reveal-caption-overlay
  const [zoomActive, setZoomActive] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);

  // #073 nav-icon-morph-variants
  const [morphOpen, setMorphOpen] = useState(false);

  // #074 nav-stagger-drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // #075 nav-app-tab-bar
  const [appTabIdx, setAppTabIdx] = useState(0);

  // #076 tabs-filter-chips & #077 tabs-vertical-settings
  const [chipCat, setChipCat] = useState<'all' | 'text' | 'nav' | 'forms'>('all');
  const [settingsIdx, setSettingsIdx] = useState(0);

  // #078 search-autocomplete & #079 search-popular-chips
  const [acQuery, setAcQuery] = useState('');
  const [acFocused, setAcFocused] = useState(false);
  const [acSelectedIdx, setAcSelectedIdx] = useState(-1);
  const [chipQuery, setChipQuery] = useState('');

  // #080–#085 micro interactions
  const [btn3dPressed, setBtn3dPressed] = useState(false);
  const [btn3dCount, setBtn3dCount] = useState(0);
  const [shimmerSweep, setShimmerSweep] = useState(false);
  const [arrowActive, setArrowActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);
  const blurTimerRef = useRef<number | null>(null);
  const shimmerTimerRef = useRef<number | null>(null);

  // #084 hold button
  const [holdPct, setHoldPct] = useState(0);
  const [holdConfirmed, setHoldConfirmed] = useState(false);
  const holdRafRef = useRef<number | null>(null);

  // #085 heart pop
  const [liked, setLiked] = useState(false);
  const [heartAnimKey, setHeartAnimKey] = useState(0);

  const clearTrackedTimers = useCallback(() => {
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
    if (blurTimerRef.current !== null) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    if (shimmerTimerRef.current !== null) {
      window.clearTimeout(shimmerTimerRef.current);
      shimmerTimerRef.current = null;
    }
  }, []);

  /**
   * 共有の長押し進行アニメーション（自動再生・手動操作で共通利用）
   */
  const startHoldProgressLoop = useCallback((holdMs: number) => {
    if (holdRafRef.current !== null) {
      window.cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
    const safeMs = Math.max(300, holdMs);
    const start = performance.now();
    const tick = (now: number) => {
      const pct = Math.min(100, Math.round(((now - start) / safeMs) * 100));
      setHoldPct(pct);
      if (pct < 100) {
        holdRafRef.current = window.requestAnimationFrame(tick);
      } else {
        holdRafRef.current = null;
        setHoldConfirmed(true);
      }
    };
    holdRafRef.current = window.requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    return () => {
      if (fillRafRef.current !== null) window.cancelAnimationFrame(fillRafRef.current);
      if (holdRafRef.current !== null) window.cancelAnimationFrame(holdRafRef.current);
      clearTrackedTimers();
    };
  }, [clearTrackedTimers]);

  useEffect(() => {
    if (fillRafRef.current !== null) {
      window.cancelAnimationFrame(fillRafRef.current);
      fillRafRef.current = null;
    }
    if (holdRafRef.current !== null) {
      window.cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
    clearTrackedTimers();

    if (isWaitingStart) {
      setIntroActive(false);
      setFillPct(0);
      setSlotIdx(0);
      setZoomActive(false);
      setCaptionOpen(false);
      setMorphOpen(false);
      setDrawerOpen(false);
      setAppTabIdx(0);
      setChipCat('all');
      setSettingsIdx(0);
      setAcQuery('');
      setAcFocused(false);
      setAcSelectedIdx(-1);
      setChipQuery('');
      setBtn3dPressed(false);
      setShimmerSweep(false);
      setArrowActive(false);
      setCopied(false);
      setHoldPct(0);
      setHoldConfirmed(false);
      setLiked(false);
      return;
    }

    if (playKey === 0) return;

    const timers: number[] = [];
    const durMs = Math.max(250, Math.round(effectiveDuration * 1000));

    if (
      patternId === 'text-tracking-compress' ||
      patternId === 'text-outline-fill' ||
      patternId === 'reveal-blur-focus'
    ) {
      setIntroActive(false);
      timers.push(window.setTimeout(() => setIntroActive(true), 32));
    } else if (patternId === 'text-scroll-fill') {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durMs);
        setFillPct(Math.round(t * 100));
        if (t < 1) {
          fillRafRef.current = window.requestAnimationFrame(tick);
        }
      };
      fillRafRef.current = window.requestAnimationFrame(tick);
    } else if (patternId === 'text-word-slot') {
      timers.push(window.setTimeout(() => setSlotIdx(1), 80));
      timers.push(window.setTimeout(() => setSlotIdx(2), 80 + Math.round(700 * slowFactor)));
      timers.push(window.setTimeout(() => setSlotIdx(3), 80 + Math.round(1400 * slowFactor)));
    } else if (patternId === 'reveal-frame-zoom') {
      timers.push(window.setTimeout(() => setZoomActive(true), 40));
      timers.push(window.setTimeout(() => setZoomActive(false), 40 + durMs + Math.round(450 * slowFactor)));
    } else if (patternId === 'reveal-caption-overlay') {
      timers.push(window.setTimeout(() => setCaptionOpen(true), 50));
      timers.push(window.setTimeout(() => setCaptionOpen(false), 50 + durMs + Math.round(900 * slowFactor)));
    } else if (patternId === 'nav-icon-morph-variants') {
      timers.push(window.setTimeout(() => setMorphOpen(true), 40));
      timers.push(window.setTimeout(() => setMorphOpen(false), 40 + Math.round(900 * slowFactor)));
    } else if (patternId === 'nav-stagger-drawer') {
      timers.push(window.setTimeout(() => setDrawerOpen(true), 40));
    } else if (patternId === 'nav-app-tab-bar') {
      timers.push(window.setTimeout(() => setAppTabIdx(1), 100));
      timers.push(window.setTimeout(() => setAppTabIdx(2), 100 + Math.round(550 * slowFactor)));
    } else if (patternId === 'tabs-filter-chips') {
      timers.push(window.setTimeout(() => setChipCat('text'), 120));
      timers.push(window.setTimeout(() => setChipCat('nav'), 120 + Math.round(700 * slowFactor)));
    } else if (patternId === 'tabs-vertical-settings') {
      timers.push(window.setTimeout(() => setSettingsIdx(1), 120));
      timers.push(window.setTimeout(() => setSettingsIdx(2), 120 + Math.round(700 * slowFactor)));
    } else if (patternId === 'search-autocomplete') {
      setAcFocused(true);
      timers.push(window.setTimeout(() => setAcQuery('#'), 60));
      timers.push(window.setTimeout(() => setAcQuery('#0'), 60 + Math.round(220 * slowFactor)));
      timers.push(window.setTimeout(() => setAcQuery('#01'), 60 + Math.round(440 * slowFactor)));
    } else if (patternId === 'search-popular-chips') {
      timers.push(window.setTimeout(() => setChipQuery('#014 検索モーダル'), 140));
    } else if (patternId === 'micro-button-3d') {
      timers.push(
        window.setTimeout(() => {
          setBtn3dPressed(true);
          setBtn3dCount((c) => c + 1);
        }, 50)
      );
      timers.push(window.setTimeout(() => setBtn3dPressed(false), 50 + Math.round(260 * slowFactor)));
    } else if (patternId === 'micro-button-shimmer') {
      setShimmerSweep(false);
      timers.push(window.setTimeout(() => setShimmerSweep(true), 32));
    } else if (patternId === 'micro-button-arrow') {
      timers.push(window.setTimeout(() => setArrowActive(true), 40));
      timers.push(window.setTimeout(() => setArrowActive(false), 40 + durMs + Math.round(400 * slowFactor)));
    } else if (patternId === 'micro-button-copy') {
      timers.push(
        window.setTimeout(() => {
          setCopied(true);
        }, 40)
      );
      timers.push(window.setTimeout(() => setCopied(false), 40 + Math.round(1400 * slowFactor)));
    } else if (patternId === 'micro-button-hold') {
      startHoldProgressLoop(Math.max(700, durMs));
    } else if (patternId === 'micro-heart-pop') {
      timers.push(
        window.setTimeout(() => {
          setLiked(true);
          setHeartAnimKey((k) => k + 1);
        }, 60)
      );
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [patternId, playKey, isWaitingStart, effectiveDuration, slowFactor, clearTrackedTimers, startHoldProgressLoop]);

  const startManualHold = () => {
    if (holdConfirmed) {
      setHoldConfirmed(false);
      setHoldPct(0);
      return;
    }
    startHoldProgressLoop(Math.max(600, Math.round(effectiveDuration * 1000)));
  };

  const cancelManualHold = () => {
    if (holdRafRef.current !== null) {
      window.cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
    if (!holdConfirmed) {
      setHoldPct(0);
    }
  };

  const triggerManualCopy = () => {
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    setCopied(true);
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 1600);
  };

  const acMatches = AUTOCOMPLETE_DICT.filter((item) => {
    if (!acQuery.trim()) return true;
    const q = acQuery.trim().toLowerCase();
    return (
      item.serial.toLowerCase().includes(q) ||
      item.label.toLowerCase().includes(q) ||
      item.tag.toLowerCase().includes(q)
    );
  });

  switch (patternId) {
    // =========================================================================
    // 01. 文字の動き (#064 - #068)
    // =========================================================================
    case 'text-tracking-compress': {
      const wideSpacing = `${(Math.max(4, controls.distance) * 0.025).toFixed(3)}em`;
      const active = introActive && !isWaitingStart;
      return (
        <div className="flex flex-col items-center justify-center px-4 text-center">
          <p
            className="m-0 font-bold text-xl sm:text-3xl text-zinc-900 select-none"
            style={{
              letterSpacing: active ? '0.02em' : wideSpacing,
              opacity: active ? 1 : 0.28,
              transition: isWaitingStart
                ? 'none'
                : `letter-spacing ${effectiveDuration}s ${easeCss}, opacity ${Math.min(effectiveDuration * 0.7, 0.45)}s ease`
            }}
          >
            MOTION ATLAS
          </p>
          {showXRay && (
            <span className="mt-3 rounded border border-dashed border-orange-400 bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              letter-spacing: {wideSpacing} → 0.02em
            </span>
          )}
        </div>
      );
    }

    case 'text-scroll-fill':
      return (
        <div className="w-full max-w-md px-4 flex flex-col items-center gap-3">
          <p
            className="m-0 text-center text-lg sm:text-2xl font-extrabold leading-snug tracking-tight"
            style={{
              backgroundImage: `linear-gradient(90deg, #18181b ${fillPct}%, #d4d4d8 ${fillPct}%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent'
            }}
          >
            スクロールに合わせて文字に色が染み渡り、視線を自然に次の一文へ運びます。
          </p>

          <div className="flex items-center gap-3 w-full max-w-xs">
            <span className="text-[10px] font-mono text-zinc-500">読む進捗</span>
            <input
              type="range"
              min={0}
              max={100}
              value={fillPct}
              onChange={(e) => setFillPct(Number(e.target.value))}
              aria-label="文字塗りつぶし進行スライダー"
              className="atlas-slider flex-1"
            />
            <span className="w-9 text-right text-[11px] font-mono font-semibold text-zinc-700">
              {fillPct}%
            </span>
          </div>

          {showXRay && (
            <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-mono text-blue-700">
              background-clip: text + linear-gradient({fillPct}%)
            </span>
          )}
        </div>
      );

    case 'text-word-slot':
      return (
        <div className="flex flex-col items-center justify-center gap-3 px-4">
          <div className="flex flex-wrap items-center justify-center gap-2 text-lg sm:text-2xl font-bold text-zinc-900">
            <span>動きがあれば、UIは</span>
            <div
              className={`relative h-9 w-32 sm:w-36 rounded-lg border border-blue-200 bg-blue-50/70 px-2 ${
                showXRay ? 'overflow-visible ring-2 ring-orange-400/70' : 'overflow-hidden'
              }`}
            >
              <div
                style={{
                  transform: `translate3d(0, -${slotIdx * 36}px, 0)`,
                  transition: isWaitingStart ? 'none' : `transform ${effectiveDuration}s ${easeCss}`
                }}
              >
                {SLOT_WORDS.map((word, idx) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => setSlotIdx(idx)}
                    className={`flex h-9 w-full items-center justify-center font-extrabold text-blue-700 ${
                      idx !== slotIdx && showXRay ? 'opacity-35' : ''
                    }`}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {SLOT_WORDS.map((word, idx) => (
              <button
                key={word}
                type="button"
                onClick={() => setSlotIdx(idx)}
                className={`rounded-md px-2 py-0.5 text-[11px] font-medium border transition-colors ${
                  slotIdx === idx
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {word}
              </button>
            ))}
          </div>
          {showXRay && (
            <span className="rounded border border-dashed border-orange-400 bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              窓枠 overflow: hidden / translate3d(0, -{slotIdx * 36}px, 0)
            </span>
          )}
        </div>
      );

    case 'text-circular-badge': {
      const spinSec = Math.max(4, Math.round(effectiveDuration * 8 * slowFactor));
      return (
        <div className="group flex flex-col items-center justify-center gap-2">
          <div className="relative h-28 w-28 flex items-center justify-center">
            <svg
              viewBox="0 0 120 120"
              className="h-28 w-28"
              style={{
                animation: isWaitingStart
                  ? 'none'
                  : `atlasSpinSlow ${spinSec}s linear infinite`
              }}
            >
              <defs>
                <path
                  id={badgeCircleId}
                  d="M 60, 60 m -42, 0 a 42,42 0 1,1 84,0 a 42,42 0 1,1 -84,0"
                />
              </defs>
              {showXRay && (
                <circle
                  cx="60"
                  cy="60"
                  r="42"
                  fill="none"
                  stroke="#f97316"
                  strokeDasharray="4 3"
                  strokeWidth="1.2"
                />
              )}
              <text className="fill-zinc-700 text-[10px] font-bold tracking-[0.22em]">
                <textPath href={`#${badgeCircleId}`}>
                  SCROLL DOWN • MOTION ATLAS • QUALITY •
                </textPath>
              </text>
            </svg>
            <span className="pointer-events-none flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-xs">
              <ArrowRight className="h-4 w-4 text-zinc-800 rotate-90" />
            </span>
          </div>
          {showXRay && (
            <span className="text-[10px] font-mono text-orange-700">
              SVG &lt;textPath&gt; + rotate(0deg → 360deg) / {spinSec}s周回
            </span>
          )}
        </div>
      );
    }

    case 'text-outline-fill': {
      const filled = introActive && !isWaitingStart;
      return (
        <div className="flex flex-col items-center justify-center gap-2.5 px-4">
          <div
            onClick={() => setIntroActive((v) => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIntroActive((v) => !v);
              }
            }}
            className={`relative cursor-pointer select-none rounded-lg px-2 py-1 ${
              showXRay ? 'border border-dashed border-orange-400 bg-orange-50/40' : ''
            }`}
          >
            <span
              className="block text-3xl sm:text-5xl font-black tracking-tight text-transparent"
              style={{ WebkitTextStroke: '1.5px #18181b' }}
            >
              CREATIVE UI
            </span>
            <span
              aria-hidden="true"
              className="absolute inset-0 px-2 py-1 block text-3xl sm:text-5xl font-black tracking-tight text-zinc-900"
              style={{
                clipPath: filled ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)',
                transition: isWaitingStart ? 'none' : `clip-path ${effectiveDuration}s ${easeCss}`
              }}
            >
              CREATIVE UI
            </span>
          </div>
          <span className="text-[11px] text-zinc-500">
            クリックでも「輪郭 ↔ 塗りつぶし」を切り替えられます
          </span>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              背面 WebkitTextStroke(1.5px) + 前面 clip-path: {filled ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)'}
            </span>
          )}
        </div>
      );
    }

    // =========================================================================
    // 02. 枠・カードの登場 (#069 - #072)
    // =========================================================================
    case 'reveal-frame-zoom': {
      const scaleVal = (1 + Math.min(30, controls.distance) / 100).toFixed(2);
      return (
        <div className="flex flex-col items-center gap-2.5 px-4">
          <button
            type="button"
            onClick={() => setZoomActive((v) => !v)}
            className={`group relative w-64 h-36 rounded-xl border border-zinc-200 bg-white shadow-xs text-left ${
              showXRay ? 'overflow-visible ring-2 ring-orange-500' : 'overflow-hidden'
            }`}
          >
            <div
              className="h-full w-full bg-gradient-to-br from-blue-600 via-sky-500 to-teal-400 flex flex-col justify-between p-4 text-white"
              style={{
                transform: zoomActive ? `scale(${scaleVal})` : 'scale(1)',
                transition: `transform ${effectiveDuration}s ${easeCss}`
              }}
            >
              <span className="inline-flex w-fit rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                NEW PHOTO
              </span>
              <div>
                <p className="m-0 text-sm font-bold">外枠を揺らさない拡大</p>
                <p className="m-0 text-[11px] text-white/85">クリックで拡大・リセット</p>
              </div>
            </div>
          </button>
          {showXRay && (
            <span className="text-[10px] font-mono text-orange-700">
              外枠(overflow: hidden)固定 / 中身だけ scale({zoomActive ? scaleVal : '1.00'})
            </span>
          )}
        </div>
      );
    }

    case 'reveal-caption-overlay':
      return (
        <div className="flex flex-col items-center gap-2 px-4 w-full">
          <div
            onClick={() => setCaptionOpen((v) => !v)}
            onMouseEnter={() => setCaptionOpen(true)}
            onMouseLeave={() => setCaptionOpen(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setCaptionOpen((v) => !v);
              }
            }}
            className={`relative cursor-pointer rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-800 to-zinc-700 text-white shadow-sm overflow-hidden ${
              isMobile ? 'w-full max-w-[224px] h-40' : 'w-full max-w-[288px] h-40'
            } ${showXRay ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}
          >
            <div className="p-4 flex flex-col justify-between h-full">
              <span className="text-[10px] font-mono text-zinc-300">PORTFOLIO ITEM #070</span>
              <span className="text-sm font-bold">作品ビジュアルプレビュー</span>
            </div>

            <div
              className="absolute inset-x-0 bottom-0 bg-zinc-950/88 px-4 py-3 text-white"
              style={{
                transform: captionOpen ? 'translate3d(0, 0, 0)' : 'translate3d(0, 100%, 0)',
                transition: `transform ${effectiveDuration}s ${easeCss}`
              }}
            >
              <p className="m-0 text-xs font-bold">事例：UIデザイン設計図鑑</p>
              <p className="m-0.5 text-[11px] text-zinc-300">ホバー／タップで説明幕を引き出します</p>
            </div>
          </div>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              overflow: hidden + 説明幕 translate3d(0, {captionOpen ? '0%' : '100%'}, 0)
            </span>
          )}
        </div>
      );

    case 'reveal-blur-focus': {
      const blurPx = Math.min(18, Math.max(2, controls.distance));
      const focused = introActive && !isWaitingStart;
      return (
        <div className="flex flex-col items-center gap-2 px-4 w-full">
          <div
            className={`w-full max-w-[256px] rounded-xl border border-zinc-200 bg-white p-4 shadow-sm ${
              showXRay ? 'ring-1 ring-blue-300 ring-offset-2' : ''
            }`}
            style={{
              filter: focused ? 'blur(0px)' : `blur(${blurPx}px)`,
              opacity: focused ? 1 : 0.35,
              transform: focused ? 'scale(1)' : 'scale(1.03)',
              transition: isWaitingStart
                ? 'none'
                : `filter ${effectiveDuration}s ${easeCss}, opacity ${effectiveDuration}s ease, transform ${effectiveDuration}s ${easeCss}`
            }}
          >
            <div className="flex items-center gap-2 text-blue-600 mb-1.5">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-bold">FOCUS CLARITY</span>
            </div>
            <p className="m-0 text-sm font-bold text-zinc-900">霧が晴れるピント合わせ</p>
            <p className="mt-1 m-0 text-[11px] text-zinc-500">
              輪郭がぼやけた状態からクッキリ焦点が合います。
            </p>
          </div>
          {showXRay && (
            <span className="text-[10px] font-mono text-blue-700">
              filter: blur({focused ? 0 : blurPx}px) → blur(0px)
            </span>
          )}
        </div>
      );
    }

    case 'reveal-staggered-offset':
      return (
        <div className="w-full max-w-sm px-4 flex flex-col items-center gap-2">
          <div className={`w-full grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs">
              <span className="text-[10px] font-mono text-zinc-400">LEFT COLUMN</span>
              <p className="m-0 mt-1 text-xs font-bold text-zinc-900">左列：0px 基準</p>
              <p className="m-0 mt-0.5 text-[11px] text-zinc-500">リズムを作るため上端に揃えます</p>
            </div>
            <div
              className={`rounded-xl border bg-white p-3 shadow-xs transition-all ${
                isMobile ? 'border-zinc-200' : 'translate-y-4 border-blue-200'
              } ${showXRay ? 'ring-2 ring-orange-400' : ''}`}
            >
              <span className="text-[10px] font-mono text-blue-600">
                {isMobile ? 'MOBILE 1-COL' : 'RIGHT (+16px OFFSET)'}
              </span>
              <p className="m-0 mt-1 text-xs font-bold text-zinc-900">
                {isMobile ? 'スマホ時は段差をオフに' : '右列：半段下にずらす'}
              </p>
              <p className="m-0 mt-0.5 text-[11px] text-zinc-500">
                {isMobile ? '縦1列に自然に整列します' : '均等グリッドに余白リズムが生まれます'}
              </p>
            </div>
          </div>
          {showXRay && (
            <span className="mt-2 rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              {isMobile ? 'スマホ幅：translateY(0) で1列整列' : 'PC幅：右列 translateY(+16px) で段差配置'}
            </span>
          )}
        </div>
      );

    // =========================================================================
    // 03. ナビ・メニュー (#073 - #075)
    // =========================================================================
    case 'nav-icon-morph-variants':
      return (
        <div className="flex flex-col items-center gap-3 px-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* A: 三 -> × */}
            <button
              type="button"
              onClick={() => setMorphOpen((v) => !v)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border bg-white px-3 sm:px-4 py-3 hover:bg-zinc-50 ${
                showXRay ? 'border-orange-400 border-dashed' : 'border-zinc-200'
              }`}
            >
              <div className="relative h-5 w-5 flex items-center justify-center">
                <span
                  className="absolute h-0.5 w-4 rounded-full bg-zinc-900 transition-transform duration-300"
                  style={{
                    transform: morphOpen ? 'translateY(0) rotate(45deg)' : 'translateY(-4px)'
                  }}
                />
                <span
                  className="absolute h-0.5 w-4 rounded-full bg-zinc-900 transition-opacity duration-200"
                  style={{ opacity: morphOpen ? 0 : 1 }}
                />
                <span
                  className="absolute h-0.5 w-4 rounded-full bg-zinc-900 transition-transform duration-300"
                  style={{
                    transform: morphOpen ? 'translateY(0) rotate(-45deg)' : 'translateY(4px)'
                  }}
                />
              </div>
              <span className="text-[10px] font-bold text-zinc-600">三 → ×</span>
            </button>

            {/* B: 三 -> ← */}
            <button
              type="button"
              onClick={() => setMorphOpen((v) => !v)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border bg-white px-3 sm:px-4 py-3 hover:bg-zinc-50 ${
                showXRay ? 'border-orange-400 border-dashed' : 'border-zinc-200'
              }`}
            >
              <div className="relative h-5 w-5 flex items-center justify-center">
                <span
                  className="absolute h-0.5 rounded-full bg-zinc-900 transition-all duration-300"
                  style={{
                    width: morphOpen ? '9px' : '16px',
                    transform: morphOpen ? 'translate(-3px, -2.5px) rotate(-35deg)' : 'translateY(-4px)'
                  }}
                />
                <span className="absolute h-0.5 w-4 rounded-full bg-zinc-900" />
                <span
                  className="absolute h-0.5 rounded-full bg-zinc-900 transition-all duration-300"
                  style={{
                    width: morphOpen ? '9px' : '16px',
                    transform: morphOpen ? 'translate(-3px, 2.5px) rotate(35deg)' : 'translateY(4px)'
                  }}
                />
              </div>
              <span className="text-[10px] font-bold text-zinc-600">三 → ←</span>
            </button>

            {/* C: + -> × */}
            <button
              type="button"
              onClick={() => setMorphOpen((v) => !v)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border bg-white px-3 sm:px-4 py-3 hover:bg-zinc-50 ${
                showXRay ? 'border-orange-400 border-dashed' : 'border-zinc-200'
              }`}
            >
              <div
                className="relative h-5 w-5 flex items-center justify-center transition-transform duration-300"
                style={{ transform: morphOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
              >
                <span className="absolute h-0.5 w-4 rounded-full bg-zinc-900" />
                <span className="absolute h-4 w-0.5 rounded-full bg-zinc-900" />
              </div>
              <span className="text-[10px] font-bold text-zinc-600">＋ → ×</span>
            </button>
          </div>
          <span className="text-[11px] text-zinc-500 text-center">
            アイコンをタップすると 3 種類の変形を一斉に確認できます（現在：{morphOpen ? '開いた状態' : '待機'}）
          </span>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              3本の &lt;span&gt; を rotate / translateY / width で同時変形（morphOpen={String(morphOpen)}）
            </span>
          )}
        </div>
      );

    case 'nav-stagger-drawer': {
      const items = ['ホーム', '制作実績', 'チーム紹介', 'お問い合わせ'];
      return (
        <div className="flex flex-col items-center gap-2 w-full max-w-sm px-2">
          <div
            className={`relative h-40 w-full overflow-hidden rounded-xl border bg-zinc-100 shadow-xs ${
              showXRay ? 'border-orange-400 ring-1 ring-orange-300' : 'border-zinc-200'
            }`}
          >
            <div className="flex h-full items-center justify-between px-4">
              <div>
                <p className="m-0 text-xs font-bold text-zinc-800">メインページ</p>
                <p className="m-0 text-[11px] text-zinc-500">左上のボタンを押すと項目が順番に現れます</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen((v) => !v)}
                className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white"
              >
                {drawerOpen ? '閉じる' : 'メニューを開く'}
              </button>
            </div>

            {/* 背景幕 */}
            <div
              onClick={() => setDrawerOpen(false)}
              className={`absolute inset-0 bg-zinc-900/35 transition-opacity duration-200 ${
                drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            />

            {/* スライドドロワー + 項目スタガー */}
            <nav
              aria-label="時間差ドロワーメニュー"
              className="absolute inset-y-0 left-0 w-44 bg-white p-3 shadow-lg flex flex-col gap-1.5"
              style={{
                transform: drawerOpen ? 'translate3d(0,0,0)' : 'translate3d(-100%,0,0)',
                transition: `transform ${effectiveDuration}s ${easeCss}`
              }}
            >
              <span className="mb-1 text-[10px] font-bold text-zinc-400">MENU</span>
              {items.map((label, idx) => (
                <a
                  key={label}
                  href={`#drawer-${idx}`}
                  onClick={(e) => e.preventDefault()}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-100"
                  style={{
                    opacity: drawerOpen ? 1 : 0,
                    transform: drawerOpen ? 'translate3d(0,0,0)' : 'translate3d(-12px,0,0)',
                    transition: `opacity 0.22s ease, transform 0.28s ${easeCss}`,
                    transitionDelay: drawerOpen ? `${Math.round((80 + idx * 60) * slowFactor)}ms` : '0ms'
                  }}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              ドロワー到達後に transitionDelay: 80ms + idx×60ms で時間差出現
            </span>
          )}
        </div>
      );
    }

    case 'nav-app-tab-bar': {
      const tabs = [
        { icon: Home, label: 'ホーム' },
        { icon: Compass, label: 'さがす' },
        { icon: Bookmark, label: '保存' },
        { icon: Settings, label: '設定' }
      ];
      return (
        <div className="flex flex-col items-center gap-2 w-full px-2">
          <div
            className={`flex flex-col justify-between rounded-2xl border bg-zinc-50 overflow-hidden shadow-xs ${
              isMobile ? 'w-full max-w-[256px] h-40' : 'w-full max-w-[320px] h-40'
            } ${showXRay ? 'border-orange-400 ring-1 ring-orange-300' : 'border-zinc-200'}`}
          >
            <div className="p-3 text-center">
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                表示中の画面：{tabs[appTabIdx]?.label ?? 'ホーム'}
              </span>
            </div>
            <nav
              aria-label="アプリ下部タブバー"
              className="grid grid-cols-4 border-t border-zinc-200 bg-white px-2 py-1.5"
            >
              {tabs.map((item, idx) => {
                const Icon = item.icon;
                const active = idx === appTabIdx;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setAppTabIdx(idx)}
                    className="flex flex-col items-center gap-0.5 py-1"
                  >
                    <span
                      className={`flex h-7 w-11 items-center justify-center rounded-full transition-all duration-200 ${
                        active
                          ? showXRay
                            ? 'bg-orange-50 text-orange-700 scale-105 ring-1 ring-dashed ring-orange-400'
                            : 'bg-blue-50 text-blue-600 scale-105'
                          : 'text-zinc-500'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        active ? 'text-blue-600' : 'text-zinc-500'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              grid-cols-4 親指届き域固定 / activeIdx={appTabIdx} にピル背景付与
            </span>
          )}
        </div>
      );
    }

    // =========================================================================
    // 04. タブ・アコーディオン (#076 - #077)
    // =========================================================================
    case 'tabs-filter-chips': {
      const visibleCards =
        chipCat === 'all' ? FILTER_CARDS : FILTER_CARDS.filter((c) => c.cat === chipCat);
      return (
        <div className="w-full max-w-md px-3 flex flex-col items-center gap-2.5">
          <div
            className={`w-full flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 rounded-lg ${
              showXRay ? 'ring-1 ring-dashed ring-orange-400 p-1 bg-orange-50/30' : ''
            }`}
          >
            {FILTER_CHIP_ITEMS.map((chip) => {
              const active = chipCat === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setChipCat(chip.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
          <div className="w-full grid grid-cols-2 gap-1.5">
            {visibleCards.map((c) => (
              <div
                key={c.serial}
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 flex items-center justify-between"
              >
                <span className="text-[11px] font-bold text-zinc-800 truncate">{c.title}</span>
                <span className="text-[10px] font-mono text-zinc-400">{c.serial}</span>
              </div>
            ))}
          </div>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              chipCat="{chipCat}" → 一致カード {visibleCards.length}件を即時フィルタ
            </span>
          )}
        </div>
      );
    }

    case 'tabs-vertical-settings': {
      const activeSetting = SETTINGS_TABS[settingsIdx] ?? SETTINGS_TABS[0];
      return (
        <div className="w-full max-w-md flex flex-col items-center gap-2 px-2">
          <div
            className={`w-full rounded-xl border bg-white overflow-hidden shadow-xs ${
              isMobile ? 'flex flex-col' : 'grid grid-cols-[132px_1fr]'
            } ${showXRay ? 'border-orange-400 ring-1 ring-orange-300' : 'border-zinc-200'}`}
          >
            <div
              className={`bg-zinc-50 p-1.5 ${
                isMobile ? 'flex gap-1 border-b border-zinc-200' : 'flex flex-col gap-1 border-r border-zinc-200'
              }`}
            >
              {SETTINGS_TABS.map((tab, idx) => {
                const active = settingsIdx === idx;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSettingsIdx(idx)}
                    className={`relative rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-colors ${
                      active ? 'bg-white text-blue-700 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {active && !isMobile && (
                      <span
                        className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r ${
                          showXRay ? 'bg-orange-500' : 'bg-blue-600'
                        }`}
                      />
                    )}
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="p-3.5">
              <p className="m-0 text-xs font-bold text-zinc-900">{activeSetting.label}</p>
              <p className="m-0 mt-1 text-[11px] leading-relaxed text-zinc-600">
                {activeSetting.desc}
              </p>
            </div>
          </div>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              {isMobile ? 'スマホ：横タブへ自動変形' : 'PC：grid-cols-[132px_1fr] + 左端アクセントバー'}
            </span>
          )}
        </div>
      );
    }

    // =========================================================================
    // 05. 検索窓・入力欄 (#078 - #079)
    // =========================================================================
    case 'search-autocomplete':
      return (
        <div className="w-full max-w-sm px-3 relative flex flex-col items-center">
          <div
            className={`w-full flex items-center gap-2 rounded-xl border bg-white px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 ${
              showXRay ? 'border-orange-400 ring-1 ring-orange-200' : 'border-zinc-300'
            }`}
          >
            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={acQuery}
              onFocus={() => {
                if (blurTimerRef.current !== null) {
                  window.clearTimeout(blurTimerRef.current);
                  blurTimerRef.current = null;
                }
                setAcFocused(true);
              }}
              onBlur={() => {
                if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
                blurTimerRef.current = window.setTimeout(() => setAcFocused(false), 160);
              }}
              onChange={(e) => {
                setAcQuery(sanitizePlainText(e.target.value, 40));
                setAcSelectedIdx(-1);
                setAcFocused(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setAcSelectedIdx((i) => Math.min(acMatches.length - 1, i + 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setAcSelectedIdx((i) => Math.max(0, i - 1));
                } else if (e.key === 'Enter' && acSelectedIdx >= 0) {
                  const chosen = acMatches[acSelectedIdx];
                  if (chosen) {
                    setAcQuery(`${chosen.serial} ${chosen.label}`);
                    setAcFocused(false);
                  }
                }
              }}
              placeholder="例: #014 や スイッチ..."
              aria-label="予測候補付き検索テスト入力"
              className="w-full bg-transparent text-xs text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </div>

          {acFocused && (
            <ul className="w-full mt-1.5 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg max-h-32 overflow-y-auto">
              {acMatches.length === 0 ? (
                <li className="px-2.5 py-2 text-[11px] text-zinc-400">一致する候補がありません</li>
              ) : (
                acMatches.slice(0, 4).map((m, idx) => (
                  <li key={m.serial}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setAcQuery(`${m.serial} ${m.label}`);
                        setAcFocused(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs ${
                        idx === acSelectedIdx ? 'bg-blue-50 text-blue-700' : 'text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      <span className="truncate font-medium">
                        <span className="font-mono text-blue-600 mr-1.5">{m.serial}</span>
                        {m.label}
                      </span>
                      <span className="ml-2 shrink-0 text-[10px] text-zinc-400">{m.tag}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}

          {showXRay && (
            <span className="mt-2 rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              acFocused={String(acFocused)} / 一致候補 {acMatches.length}件（上下キー選択可）
            </span>
          )}
        </div>
      );

    case 'search-popular-chips':
      return (
        <div className="w-full max-w-sm px-3 flex flex-col items-center gap-2.5">
          <div className="w-full flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={chipQuery}
              onChange={(e) => setChipQuery(sanitizePlainText(e.target.value, 40))}
              placeholder="キーワードを入力、または下から選択"
              aria-label="おすすめ検索タグ付き入力欄"
              className="w-full bg-transparent text-xs text-zinc-900 outline-none"
            />
            {chipQuery && (
              <button
                type="button"
                onClick={() => setChipQuery('')}
                className="shrink-0 text-[11px] text-zinc-400 hover:text-zinc-700"
              >
                クリア
              </button>
            )}
          </div>
          <div
            className={`w-full flex flex-wrap items-center gap-1.5 rounded-lg ${
              showXRay ? 'border border-dashed border-orange-400 bg-orange-50/30 p-1.5' : ''
            }`}
          >
            <span className="text-[10px] font-bold text-zinc-500">よく検索：</span>
            {POPULAR_CHIPS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setChipQuery(sanitizePlainText(tag, 40))}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                  chipQuery === tag
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              クリックで chipQuery 即時代入（現在：{chipQuery || '未選択'}）
            </span>
          )}
        </div>
      );

    // =========================================================================
    // 06. ボタンの手応え (#080 - #085)
    // =========================================================================
    case 'micro-button-3d':
      return (
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            onPointerDown={() => {
              setBtn3dPressed(true);
              setBtn3dCount((c) => c + 1);
            }}
            onPointerUp={() => setBtn3dPressed(false)}
            onPointerLeave={() => setBtn3dPressed(false)}
            onPointerCancel={() => setBtn3dPressed(false)}
            className={`rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition-all duration-75 cursor-pointer select-none ${
              showXRay ? 'ring-2 ring-orange-400 ring-offset-2' : ''
            }`}
            style={{
              transform: btn3dPressed ? 'translateY(4px)' : 'translateY(0)',
              boxShadow: btn3dPressed ? '0 1px 0 #1e3a8a' : '0 5px 0 #1e3a8a'
            }}
          >
            押し込める立体ボタン
          </button>
          <span className="text-[11px] font-mono text-zinc-500">
            押した回数：{btn3dCount}回
          </span>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              translateY({btn3dPressed ? '4px' : '0px'}) + box-shadow: 0 {btn3dPressed ? '1px' : '5px'} 0
            </span>
          )}
        </div>
      );

    case 'micro-button-shimmer':
      return (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (shimmerTimerRef.current !== null) window.clearTimeout(shimmerTimerRef.current);
              setShimmerSweep(false);
              shimmerTimerRef.current = window.setTimeout(() => setShimmerSweep(true), 20);
            }}
            className={`group relative overflow-hidden rounded-xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white shadow-md ${
              showXRay ? 'ring-2 ring-orange-400 ring-offset-2' : ''
            }`}
          >
            <span className="relative z-10 inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-300" />
              今すぐ無料で試す
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              style={{
                transform: shimmerSweep ? 'translate3d(420%, 0, 0) skewX(-12deg)' : 'translate3d(-120%, 0, 0) skewX(-12deg)',
                transition: shimmerSweep ? `transform ${Math.max(0.45, effectiveDuration)}s ${easeCss}` : 'none'
              }}
            />
          </button>
          <span className="text-[11px] text-zinc-500">クリックまたは「再生」で光の帯が走ります</span>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              skewX(-12deg) の白グラデ層を translate3d(-120% → 420%)
            </span>
          )}
        </div>
      );

    case 'micro-button-arrow':
      return (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onMouseEnter={() => setArrowActive(true)}
            onMouseLeave={() => setArrowActive(false)}
            onClick={() => setArrowActive((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-900 bg-white px-5 py-2.5 text-sm font-bold text-zinc-900 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <span>詳細を見る</span>
            <ArrowRight
              className={`h-4 w-4 ${showXRay ? 'ring-1 ring-orange-400 rounded-full' : ''}`}
              style={{
                transform: arrowActive ? 'translate3d(6px, 0, 0)' : 'translate3d(0, 0, 0)',
                transition: `transform ${effectiveDuration}s ${easeCss}`
              }}
            />
          </button>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              文字固定 / &lt;ArrowRight&gt; のみ translate3d({arrowActive ? '6px' : '0px'}, 0, 0)
            </span>
          )}
        </div>
      );

    case 'micro-button-copy':
      return (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={triggerManualCopy}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
              copied
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
            } ${showXRay ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'コピー完了！' : 'コードをコピー'}
          </button>
          <span className="text-[11px] text-zinc-500">
            クリック後 1.6 秒で元の表示へ戻ります
          </span>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              copied={String(copied)} / copyTimerRef(1600ms) で自動リセット
            </span>
          )}
        </div>
      );

    case 'micro-button-hold':
      return (
        <div className="flex flex-col items-center gap-2.5 px-4">
          <button
            type="button"
            onPointerDown={startManualHold}
            onPointerUp={cancelManualHold}
            onPointerLeave={cancelManualHold}
            onPointerCancel={cancelManualHold}
            className={`relative overflow-hidden rounded-xl border px-5 py-2.5 text-xs font-bold transition-colors select-none ${
              holdConfirmed
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-rose-300 bg-white text-rose-700'
            } ${showXRay ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}
          >
            {!holdConfirmed && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 bg-rose-100"
                style={{ width: `${holdPct}%` }}
              />
            )}
            <span className="relative z-10">
              {holdConfirmed ? '✓ 長押し確定しました（クリックで戻す）' : '誤爆防止：長押しで削除確定'}
            </span>
          </button>
          <span className="text-[11px] font-mono text-zinc-500">
            進行：{holdPct}%（途中で離すと 0% に戻る）
          </span>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              背面塗りゲージ width: {holdPct}% / confirmed={String(holdConfirmed)}
            </span>
          )}
        </div>
      );

    case 'micro-heart-pop':
      return (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setLiked((prev) => {
                const next = !prev;
                if (next) setHeartAnimKey((k) => k + 1);
                return next;
              });
            }}
            aria-label="いいねハートの弾みテスト"
            className={`relative flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${
              liked ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-zinc-200 bg-white text-zinc-400'
            } ${showXRay ? 'ring-2 ring-dashed ring-orange-400 ring-offset-2' : ''}`}
          >
            <Heart
              key={heartAnimKey}
              className={`h-6 w-6 ${liked ? 'fill-rose-500 text-rose-500' : ''}`}
              style={
                liked && heartAnimKey > 0
                  ? { animation: `atlasHeartPop ${Math.max(0.32, effectiveDuration)}s ${easeCss}` }
                  : undefined
              }
            />
          </button>
          <span className="text-[11px] font-semibold text-zinc-600">
            {liked ? 'いいね済み ♥（クリックで解除）' : 'クリックでぽんと弾みます'}
          </span>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              key={heartAnimKey} で再マウント発火 / @keyframes atlasHeartPop
            </span>
          )}
        </div>
      );

    default:
      return null;
  }
};
