import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowUp, Check, ChevronDown, Loader2 } from 'lucide-react';
import type { StageRendererProps } from './StageTextAndReveal';
import { EASING_OPTIONS } from '../../utils/motionHelpers';
import { animateScrollTopTo } from '../../utils/scrollAnim';
import { sanitizePlainText } from '../../utils/security';

export const StageConversionUi: React.FC<StageRendererProps> = ({
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
  const floatId = useId();

  // 2. Billing cycle toggle (monthly vs yearly)
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  // 3. Submit button feedback state machine
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success'>('idle');
  const submitTimersRef = useRef<number[]>([]);

  // 4. Floating label input
  const [emailText, setEmailText] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);

  // 5. Read more collapsible content
  const [expandedText, setExpandedText] = useState(false);

  // 6. Floating Back-to-Top button
  const bttScrollRef = useRef<HTMLDivElement | null>(null);
  const bttCancelRef = useRef<(() => void) | null>(null);
  const [bttScrollY, setBttScrollY] = useState(0);

  useEffect(() => {
    return () => {
      submitTimersRef.current.forEach((t) => window.clearTimeout(t));
      bttCancelRef.current?.();
    };
  }, []);

  const runSubmitDemo = (durationMs: number, waitScale: number) => {
    submitTimersRef.current.forEach((t) => window.clearTimeout(t));
    submitTimersRef.current = [];
    setSubmitState('loading');
    const doneDelay = Math.max(450, Math.round(durationMs));
    const resetDelay = doneDelay + Math.round(1150 * waitScale);
    submitTimersRef.current.push(window.setTimeout(() => setSubmitState('success'), doneDelay));
    submitTimersRef.current.push(window.setTimeout(() => setSubmitState('idle'), resetDelay));
  };

  // Playback choreography (0.5s lead-in aware)
  useEffect(() => {
    if (isWaitingStart) {
      submitTimersRef.current.forEach((t) => window.clearTimeout(t));
      submitTimersRef.current = [];
      bttCancelRef.current?.();

      setBilling('monthly');
      setSubmitState('idle');
      setEmailText('');
      setEmailFocused(false);
      setExpandedText(false);
      if (bttScrollRef.current) bttScrollRef.current.scrollTop = 0;
      setBttScrollY(0);
      return;
    }

    if (playKey === 0) return;
    const timers: number[] = [];
    const durMs = Math.round(effectiveDuration * 1000);

    if (patternId === 'conv-billing-toggle') {
      timers.push(window.setTimeout(() => setBilling('yearly'), 80));
    }

    if (patternId === 'conv-submit-feedback') {
      runSubmitDemo(durMs, slowFactor);
    }

    if (patternId === 'conv-floating-label') {
      setEmailFocused(true);
      const sample = 'hello@example.com';
      const step = Math.max(30, Math.round(durMs / sample.length));
      for (let i = 1; i <= sample.length; i++) {
        timers.push(window.setTimeout(() => setEmailText(sample.slice(0, i)), i * step));
      }
    }

    if (patternId === 'conv-read-more') {
      setExpandedText(true);
    }

    if (patternId === 'conv-back-to-top') {
      const el = bttScrollRef.current;
      if (el) {
        const downMax = Math.max(120, Math.round(el.scrollHeight - el.clientHeight));
        bttCancelRef.current = animateScrollTopTo(el, downMax, Math.max(600, durMs));
      }
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      bttCancelRef.current?.();
    };
  }, [patternId, playKey, isWaitingStart, effectiveDuration, slowFactor]);

  switch (patternId) {
    // -------------------------------------------------------------------------
    // 1. 王道3列料金プラン表（静的・おすすめ強調＋PC/スマホ切替）
    // -------------------------------------------------------------------------
    case 'conv-pricing-static': {
      const plans = [
        { name: 'ライト', price: '¥0', desc: 'まずは試したい個人向け', featured: false },
        { name: 'スタンダード', price: '¥980', desc: '機能も容量もちょうどいい一番人気', featured: true },
        { name: 'プロ', price: '¥2,480', desc: 'チーム利用・共同編集に最適', featured: false }
      ];
      return (
        <div
          className={`w-full transition-[max-width] duration-300 ease-out ${
            isMobile ? 'max-w-[235px]' : 'max-w-md'
          }`}
        >
          <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-3 items-end'}`}>
            {plans.map((p) => (
              <div
                key={p.name}
                className={`rounded-xl border p-3 transition-all ${
                  p.featured
                    ? 'border-blue-600 bg-white shadow-md ring-2 ring-blue-500/15'
                    : 'border-zinc-200 bg-white/90'
                } ${showXRay && p.featured ? 'border-dashed' : ''}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-zinc-900">{p.name}</span>
                  {p.featured && (
                    <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      人気
                    </span>
                  )}
                </div>
                <div className="mt-1.5 text-lg font-extrabold tracking-tight text-zinc-900 tabular-nums">
                  {p.price}
                  <span className="text-[10px] font-medium text-zinc-400"> /月</span>
                </div>
                <p className="mt-1 text-[10px] leading-snug text-zinc-500">{p.desc}</p>
                <button
                  type="button"
                  className={`mt-2.5 w-full rounded-lg py-1 text-[10px] font-bold ${
                    p.featured
                      ? 'bg-blue-600 text-white'
                      : 'border border-zinc-200 bg-zinc-50 text-zinc-700'
                  }`}
                >
                  選ぶ
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // 2. 月額 ⇄ 年額（割引）の切り替えスイッチ
    // -------------------------------------------------------------------------
    case 'conv-billing-toggle': {
      const isYearly = billing === 'yearly';
      return (
        <div className="w-full max-w-sm space-y-3 text-center">
          {/* スイッチ本体 */}
          <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 p-1">
            {(['monthly', 'yearly'] as const).map((mode) => {
              const active = billing === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setBilling(mode)}
                  className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    active ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                  style={{ transitionDuration: `${Math.min(0.45, effectiveDuration)}s` }}
                >
                  {mode === 'monthly' ? '月額払い' : '年額払い（20%お得）'}
                </button>
              );
            })}
          </div>

          {/* 連動価格カード */}
          <div
            className={`rounded-xl border bg-white p-4 shadow-xs transition-all ${
              isYearly ? 'border-emerald-300 bg-emerald-50/30' : 'border-zinc-200'
            } ${showXRay ? 'border-2 border-dashed border-blue-500' : ''}`}
            style={{ transitionDuration: `${effectiveDuration}s`, transitionTimingFunction: easeCss }}
          >
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-3xl font-extrabold tracking-tight text-zinc-900 tabular-nums">
                {isYearly ? '¥780' : '¥980'}
              </span>
              <span className="text-xs text-zinc-500">/ 月あたり</span>
            </div>
            <div className="mt-1 text-[11px] font-medium text-emerald-700">
              {isYearly
                ? '年額 ¥9,360（2,400円 お得になりました）'
                : '月ごとのいつでも解約できるプラン'}
            </div>
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // 3. 送信中 → 緑の ✓ 完了へ姿を変えるボタン
    // -------------------------------------------------------------------------
    case 'conv-submit-feedback': {
      const isLoading = submitState === 'loading';
      const isSuccess = submitState === 'success';

      return (
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => runSubmitDemo(Math.round(effectiveDuration * 1000), slowFactor)}
            className={`inline-flex min-w-[205px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all cursor-pointer ${
              isSuccess
                ? 'bg-emerald-600'
                : isLoading
                  ? 'bg-zinc-700 cursor-wait'
                  : 'bg-zinc-900 hover:bg-zinc-800'
            } ${showXRay ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
            style={{ transitionTimingFunction: easeCss }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>送信しています...</span>
              </>
            ) : isSuccess ? (
              <>
                <Check className="h-4 w-4 stroke-[2.6]" />
                <span>保存・送信が完了しました</span>
              </>
            ) : (
              <span>申し込む（送信ボタン）</span>
            )}
          </button>

          {showXRay && (
            <div className="font-mono text-[10px] text-zinc-600">
              状態: <strong className="text-blue-700">{submitState}</strong>（loading 中は disabled で二重送信防止）
            </div>
          )}
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // 4. タップするとラベルが枠の上へ逃げる入力フォーム (フローティングラベル)
    // -------------------------------------------------------------------------
    case 'conv-floating-label': {
      const floated = emailFocused || emailText.length > 0;
      return (
        <div className="w-full max-w-xs">
          <div
            className={`relative rounded-xl border bg-white px-3 pt-5 pb-2 transition-colors ${
              emailFocused ? 'border-blue-500 ring-2 ring-blue-500/15' : 'border-zinc-300'
            } ${showXRay ? 'border-dashed' : ''}`}
          >
            <label
              htmlFor={floatId}
              className={`pointer-events-none absolute left-3 origin-left transition-all ${
                floated
                  ? 'top-1.5 text-[10px] font-bold text-blue-600'
                  : 'top-3.5 text-xs text-zinc-400'
              }`}
              style={{ transitionDuration: `${effectiveDuration}s`, transitionTimingFunction: easeCss }}
            >
              メールアドレス（必須）
            </label>
            <input
              id={floatId}
              type="email"
              maxLength={60}
              value={emailText}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              onChange={(e) => setEmailText(sanitizePlainText(e.target.value, 60))}
              className="w-full bg-transparent text-xs font-medium text-zinc-900 outline-none"
            />
          </div>
          {showXRay && (
            <div className="mt-1.5 text-center font-mono text-[10px] text-zinc-500">
              {floated ? '入力中 / 値あり → 上端 (top: 6px, 10px) へ縮小退避' : '未入力 → プレースホルダー位置に待機'}
            </div>
          )}
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // 5. 下端ぼかし付き・クリックで高さが伸びる「続きを読む」折りたたみ
    // -------------------------------------------------------------------------
    case 'conv-read-more':
      return (
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-3.5 shadow-2xs">
          <div
            className="relative overflow-hidden transition-[max-height]"
            style={{
              maxHeight: expandedText ? '170px' : '64px',
              transitionDuration: `${effectiveDuration}s`,
              transitionTimingFunction: easeCss
            }}
          >
            <div className="space-y-1.5 text-[11px] leading-relaxed text-zinc-600">
              <p className="font-bold text-zinc-900">長文レビューやスペック表のスマート折りたたみ</p>
              <p>
                長すぎる文章を全部出すと縦長になりすぎるため、最初の2〜3行だけ見せて下端を白いグラデーションで自然にぼかします。
              </p>
              <p>
                気になる人だけが「続きを読む」ボタンを押せば、ページ遷移なしでスッと隠れていた残りの解説が現れます。
              </p>
            </div>

            {/* 白ぼかしグラデーションカーテン */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 transition-opacity ${
                showXRay ? 'border-t-2 border-dashed border-orange-400 bg-orange-100/60' : 'bg-gradient-to-t from-white via-white/85 to-transparent'
              }`}
              style={{
                opacity: expandedText ? 0 : 1,
                transitionDuration: `${effectiveDuration}s`
              }}
            />
          </div>

          <button
            type="button"
            aria-expanded={expandedText}
            onClick={() => setExpandedText((v) => !v)}
            className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 text-[11px] font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
          >
            <span>{expandedText ? '折りたたむ' : '続きを読む'}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                expandedText ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      );

    // -------------------------------------------------------------------------
    // 6. 少しスクロールすると右下にそっと現れる「↑ TOPへ戻る」ボタン
    // -------------------------------------------------------------------------
    case 'conv-back-to-top': {
      const showBtn = bttScrollY > 55;
      return (
        <div className="relative h-44 w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
          {showXRay && (
            <div className="pointer-events-none absolute top-2 left-2 z-20 rounded bg-white/95 px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-700 border border-zinc-200">
              scrollTop: {Math.round(bttScrollY)}px（55px超で表示）
            </div>
          )}

          <div
            ref={bttScrollRef}
            onScroll={(e) => setBttScrollY(e.currentTarget.scrollTop)}
            className="h-full overflow-y-auto p-3.5 space-y-2.5"
          >
            <div className="rounded-lg border border-zinc-200 bg-white p-3 text-xs font-bold text-zinc-800">
              ページの最上部（この辺りでは右下のボタンは隠れています）
            </div>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="rounded-lg border border-zinc-200/80 bg-white p-2.5">
                <div className="text-[11px] font-medium text-zinc-600">セクション {n}</div>
                <div className="mt-1 h-2 w-4/5 rounded bg-zinc-100" />
              </div>
            ))}
          </div>

          {/* 右下フローティング戻るボタン */}
          <button
            type="button"
            aria-label="一番上へ戻る"
            onClick={() => {
              const el = bttScrollRef.current;
              if (el) {
                bttCancelRef.current?.();
                bttCancelRef.current = animateScrollTopTo(el, 0, Math.round(effectiveDuration * 700));
              }
            }}
            className={`absolute right-3 bottom-3 z-20 inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg hover:bg-blue-600 cursor-pointer ${
              showXRay ? 'ring-2 ring-orange-400' : ''
            }`}
            style={{
              opacity: showBtn ? 1 : 0,
              pointerEvents: showBtn ? 'auto' : 'none',
              transform: showBtn ? 'translateY(0)' : 'translateY(16px)',
              transition: `opacity ${Math.min(0.45, effectiveDuration)}s ease, transform ${Math.min(
                0.45,
                effectiveDuration
              )}s ${easeCss}, background-color 0.2s`
            }}
          >
            <ArrowUp className="h-3.5 w-3.5" />
            <span>TOPへ</span>
          </button>
        </div>
      );
    }

    default:
      return null;
  }
};
