import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUp,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  Inbox,
  ShieldCheck,
  Upload,
  X
} from 'lucide-react';
import type { StageRendererProps } from './StageTextAndReveal';
import { EASING_OPTIONS } from '../../utils/motionHelpers';
import { animateScrollTopTo } from '../../utils/scrollAnim';
import { sanitizePlainText } from '../../utils/security';

const MATRIX_PLANS = [
  { id: 'lite', name: 'ライト', price: '¥0', items: '3件 / メール / ー', featured: false },
  { id: 'std', name: 'スタンダード', price: '¥980', items: '無制限 / チーム / 優先', featured: true },
  { id: 'pro', name: 'プロ', price: '¥2,480', items: '無制限 / 監査ログ / 専任', featured: false }
] as const;

/**
 * パスワード強度を 0〜3 の4段階で判定する純粋関数
 */
function getPasswordStrength(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) score += 1;
  if (pw.length >= 10 && /[^a-zA-Z0-9]/.test(pw)) score += 1;
  return Math.min(3, Math.max(1, score)) as 0 | 1 | 2 | 3;
}

export const StageMonetizeGuidesExtended: React.FC<StageRendererProps> = ({
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

  // #086 price-matrix-table (mobile selector)
  const [matrixTab, setMatrixTab] = useState(1);

  // #087 price-usage-estimator
  const [seats, setSeats] = useState(5);

  // #088 price-trust-assurance FAQ toggle
  const [faqOpen, setFaqOpen] = useState(false);

  // #089 form-validation-shake
  const [emailInput, setEmailInput] = useState('example-invalid');
  const [emailError, setEmailError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  // #090 form-password-strength
  const [pwInput, setPwInput] = useState('abc');
  const [showPw, setShowPw] = useState(false);

  // #091 form-step-progress
  const [stepIdx, setStepIdx] = useState(0);

  // #092 form-file-dropzone
  const [dragOver, setDragOver] = useState(false);
  const [attachedName, setAttachedName] = useState<string | null>(null);

  // #093 / #094 / #095 BTT scroll refs
  const bttRef = useRef<HTMLDivElement | null>(null);
  const bttCancelRef = useRef<(() => void) | null>(null);
  const [bttScrollPct, setBttScrollPct] = useState(0);
  const [bttShown, setBttShown] = useState(false);

  // #096 guide-dismissible-banner
  const [bannerOpen, setBannerOpen] = useState(true);

  // #097 guide-tooltip-popover
  const [tipOpen, setTipOpen] = useState(false);

  // #098 guide-empty-state
  const [emptyRecovered, setEmptyRecovered] = useState(false);

  // #099 guide-pagination-vs-more
  const [pagerMode, setPagerMode] = useState<'pages' | 'more'>('pages');
  const [pageNum, setPageNum] = useState(1);
  const [moreCount, setMoreCount] = useState(2);

  // #100 guide-inline-confirm
  const [confirmPhase, setConfirmPhase] = useState<'idle' | 'ask' | 'done'>('idle');

  useEffect(() => {
    return () => {
      bttCancelRef.current?.();
    };
  }, []);

  useEffect(() => {
    bttCancelRef.current?.();

    if (isWaitingStart) {
      setSeats(2);
      setFaqOpen(false);
      setEmailInput('user@');
      setEmailError(false);
      setPwInput('');
      setStepIdx(0);
      setDragOver(false);
      setAttachedName(null);
      setBttShown(false);
      setBttScrollPct(0);
      if (bttRef.current) bttRef.current.scrollTop = 0;
      setBannerOpen(true);
      setTipOpen(false);
      setConfirmPhase('idle');
      return;
    }

    if (playKey === 0) return;

    const timers: number[] = [];
    const durMs = Math.max(250, Math.round(effectiveDuration * 1000));

    if (patternId === 'price-usage-estimator') {
      timers.push(window.setTimeout(() => setSeats(4), 60));
      timers.push(window.setTimeout(() => setSeats(10), 60 + Math.round(450 * slowFactor)));
      timers.push(window.setTimeout(() => setSeats(15), 60 + Math.round(900 * slowFactor)));
    } else if (patternId === 'form-validation-shake') {
      setEmailInput('katakata-invalid');
      timers.push(
        window.setTimeout(() => {
          setEmailError(true);
          setShakeKey((k) => k + 1);
        }, 80)
      );
    } else if (patternId === 'form-password-strength') {
      timers.push(window.setTimeout(() => setPwInput('abcd'), 60));
      timers.push(window.setTimeout(() => setPwInput('abcd1234'), 60 + Math.round(520 * slowFactor)));
      timers.push(window.setTimeout(() => setPwInput('Kt#9xLp!2026'), 60 + Math.round(1080 * slowFactor)));
    } else if (patternId === 'form-step-progress') {
      timers.push(window.setTimeout(() => setStepIdx(1), 160));
      timers.push(window.setTimeout(() => setStepIdx(2), 160 + Math.round(700 * slowFactor)));
    } else if (patternId === 'form-file-dropzone') {
      timers.push(window.setTimeout(() => setDragOver(true), 60));
      timers.push(
        window.setTimeout(() => {
          setDragOver(false);
          setAttachedName('ui-blueprint.pdf (240 KB)');
        }, 60 + Math.round(620 * slowFactor))
      );
    } else if (patternId === 'guide-btt-minimal-arrow' || patternId === 'guide-btt-progress-ring') {
      const el = bttRef.current;
      if (el) {
        timers.push(
          window.setTimeout(() => {
            bttCancelRef.current = animateScrollTopTo(el, 200, Math.max(450, durMs));
          }, 80)
        );
      }
    } else if (patternId === 'guide-dismissible-banner') {
      setBannerOpen(true);
      timers.push(window.setTimeout(() => setBannerOpen(false), 180 + Math.round(600 * slowFactor)));
      timers.push(window.setTimeout(() => setBannerOpen(true), 180 + Math.round(1500 * slowFactor)));
    } else if (patternId === 'guide-tooltip-popover') {
      timers.push(window.setTimeout(() => setTipOpen(true), 80));
      timers.push(window.setTimeout(() => setTipOpen(false), 80 + Math.round(1400 * slowFactor)));
    } else if (patternId === 'guide-inline-confirm') {
      timers.push(window.setTimeout(() => setConfirmPhase('ask'), 100));
      timers.push(window.setTimeout(() => setConfirmPhase('done'), 100 + Math.round(900 * slowFactor)));
      timers.push(window.setTimeout(() => setConfirmPhase('idle'), 100 + Math.round(1900 * slowFactor)));
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [patternId, playKey, isWaitingStart, effectiveDuration, slowFactor]);

  const handleMiniScroll = () => {
    const el = bttRef.current;
    if (!el) return;
    const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
    const pct = Math.min(100, Math.max(0, Math.round((el.scrollTop / maxScroll) * 100)));
    setBttScrollPct(pct);
    setBttShown(el.scrollTop > 52);
  };

  const scrollMiniTop = () => {
    const el = bttRef.current;
    if (!el) return;
    bttCancelRef.current?.();
    bttCancelRef.current = animateScrollTopTo(el, 0, Math.max(360, Math.round(effectiveDuration * 1000)));
  };

  // Password score (0..3)
  const pwScore = getPasswordStrength(pwInput);

  switch (patternId) {
    // =========================================================================
    // 12. 料金・比較UI (#086 - #088)
    // =========================================================================
    case 'price-matrix-table': {
      const mobilePlan = MATRIX_PLANS[matrixTab] ?? MATRIX_PLANS[1];
      return (
        <div className={`w-full px-3 flex flex-col items-center gap-2 ${isMobile ? 'max-w-[270px]' : 'max-w-lg'}`}>
          {isMobile ? (
            <div className="w-full rounded-xl border border-zinc-200 bg-white p-3 shadow-xs">
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1 mb-2.5">
                {MATRIX_PLANS.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setMatrixTab(idx)}
                    className={`rounded-md py-1 text-[10px] font-bold transition-colors ${
                      matrixTab === idx ? 'bg-white text-blue-700 shadow-xs' : 'text-zinc-500'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="text-center">
                <p className="m-0 text-base font-extrabold text-zinc-900 font-mono">
                  {mobilePlan.price}
                  <span className="text-[10px] font-normal text-zinc-500">/月</span>
                </p>
                <p className="m-0 mt-1 text-[11px] text-zinc-600">{mobilePlan.items}</p>
              </div>
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-xs">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="px-3 py-2 font-semibold text-zinc-500">機能項目</th>
                    {MATRIX_PLANS.map((p) => (
                      <th
                        key={p.id}
                        className={`px-2.5 py-2 text-center font-bold ${
                          p.featured
                            ? showXRay
                              ? 'bg-orange-50/70 text-orange-700 ring-1 ring-inset ring-orange-300'
                              : 'bg-blue-50/70 text-blue-700'
                            : 'text-zinc-800'
                        }`}
                      >
                        {p.name}
                        <span className="block text-[10px] font-mono font-normal">{p.price}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr>
                    <td className="px-3 py-1.5 text-zinc-600">保存件数</td>
                    <td className="px-2.5 py-1.5 text-center">3件</td>
                    <td className="px-2.5 py-1.5 text-center bg-blue-50/35 font-bold text-blue-700">無制限</td>
                    <td className="px-2.5 py-1.5 text-center">無制限</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 text-zinc-600">チーム共有</td>
                    <td className="px-2.5 py-1.5 text-center text-zinc-400">―</td>
                    <td className="px-2.5 py-1.5 text-center bg-blue-50/35 font-bold text-blue-700">対応</td>
                    <td className="px-2.5 py-1.5 text-center">対応</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 text-zinc-600">専任サポート</td>
                    <td className="px-2.5 py-1.5 text-center text-zinc-400">―</td>
                    <td className="px-2.5 py-1.5 text-center bg-blue-50/35 text-zinc-400">―</td>
                    <td className="px-2.5 py-1.5 text-center font-bold text-zinc-800">あり</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              {isMobile ? 'スマホ幅：3列比較を表タブへ自動切替' : 'PC幅：中央「スタンダード」列を背景色で主役化'}
            </span>
          )}
        </div>
      );
    }

    case 'price-usage-estimator': {
      const unitPrice = seats >= 10 ? 780 : 980;
      const total = seats * unitPrice;
      return (
        <div className="w-full max-w-sm flex flex-col items-center gap-2 px-2">
          <div
            className={`w-full rounded-xl border bg-white p-4 shadow-xs flex flex-col gap-3 ${
              showXRay ? 'border-orange-400 ring-1 ring-orange-200' : 'border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800">利用メンバー数</span>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-mono font-bold text-blue-700">
                {seats} 名
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              aria-label="メンバー人数スライダー"
              className="atlas-slider w-full"
            />
            <div className="flex items-baseline justify-between border-t border-zinc-100 pt-2.5">
              <div className="text-[11px] text-zinc-500">
                月額お見積り
                {seats >= 10 && (
                  <span className="ml-1.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    大口割引適用
                  </span>
                )}
              </div>
              <div className="text-xl font-black font-mono text-zinc-900 tabular-nums">
                ¥{total.toLocaleString('ja-JP')}
                <span className="text-[11px] font-normal text-zinc-500">/月</span>
              </div>
            </div>
          </div>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              {seats}名 × ¥{unitPrice}/名 = ¥{total.toLocaleString('ja-JP')}（10名以上で自動割引）
            </span>
          )}
        </div>
      );
    }

    case 'price-trust-assurance':
      return (
        <div className={`w-full px-3 flex flex-col items-center gap-2 ${isMobile ? 'max-w-[270px]' : 'max-w-sm'}`}>
          <div className="w-full rounded-xl border border-zinc-200 bg-white p-4 shadow-xs text-center">
            <button
              type="button"
              className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              14日間の無料トライアルを始める
            </button>
            <div
              className={`mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-zinc-600 rounded-md py-0.5 ${
                showXRay ? 'border border-dashed border-orange-400 bg-orange-50/40' : ''
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                いつでも1クリック解約
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                自動課金前にお知らせ
              </span>
            </div>
            <div className="mt-2.5 border-t border-zinc-100 pt-2 text-left">
              <button
                type="button"
                onClick={() => setFaqOpen((v) => !v)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-zinc-700"
              >
                <span>Q. 無料期間中に解約すると請求されますか？</span>
                <span className="font-mono text-zinc-400">{faqOpen ? '−' : '＋'}</span>
              </button>
              {faqOpen && (
                <p className="m-0 mt-1 text-[10px] leading-relaxed text-zinc-500">
                  いいえ。期間内にワンクリックで解約すれば請求は一切発生しません。
                </p>
              )}
            </div>
          </div>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              CTA直下に解約安心保証＋その場FAQ（faqOpen={String(faqOpen)}）
            </span>
          )}
        </div>
      );

    // =========================================================================
    // 13. フォーム・フィードバック (#089 - #092)
    // =========================================================================
    case 'form-validation-shake':
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim());
            if (!isValid) {
              setEmailError(true);
              setShakeKey((k) => k + 1);
            } else {
              setEmailError(false);
            }
          }}
          className="w-full max-w-sm px-3 flex flex-col gap-2"
        >
          <div className="flex gap-2">
            <input
              key={shakeKey}
              type="text"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(sanitizePlainText(e.target.value, 60));
                if (emailError) setEmailError(false);
              }}
              aria-label="メールアドレス形式チェック入力"
              aria-invalid={emailError}
              placeholder="name@example.com"
              className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-xs outline-none transition-colors ${
                emailError
                  ? 'border-rose-500 bg-rose-50/40 text-rose-900'
                  : 'border-zinc-300 bg-white text-zinc-900 focus:border-blue-500'
              } ${showXRay ? 'ring-1 ring-orange-400' : ''}`}
              style={
                emailError && shakeKey > 0
                  ? { animation: 'atlasShakeX 0.36s ease' }
                  : undefined
              }
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white"
            >
              確認する
            </button>
          </div>
          {emailError ? (
            <p className="m-0 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              「@」を含む正しいメールアドレス形式で入力してください
            </p>
          ) : (
            <p className="m-0 text-[11px] text-zinc-500">
              不正なまま「確認する」または「再生」を押すと左右に小さく揺れます
            </p>
          )}
          {showXRay && (
            <span className="w-fit rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              aria-invalid={String(emailError)} / shakeKey={shakeKey} で @keyframes atlasShakeX 発火
            </span>
          )}
        </form>
      );

    case 'form-password-strength': {
      const label =
        pwScore === 0
          ? '未入力'
          : pwScore === 1
            ? '弱い（文字数を増やしましょう）'
            : pwScore === 2
              ? 'まずまず（記号を混ぜると安心）'
              : '安全（十分な強度です）';
      const barColors = [
        pwScore >= 1 ? (pwScore === 1 ? 'bg-rose-500' : pwScore === 2 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-zinc-200',
        pwScore >= 2 ? (pwScore === 2 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-zinc-200',
        pwScore >= 3 ? 'bg-emerald-500' : 'bg-zinc-200'
      ];
      return (
        <div className="w-full max-w-sm px-3 flex flex-col gap-2">
          <div className="flex items-center rounded-xl border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-blue-500">
            <input
              type={showPw ? 'text' : 'password'}
              value={pwInput}
              onChange={(e) => setPwInput(sanitizePlainText(e.target.value, 40))}
              aria-label="パスワード強度テスト"
              placeholder="英数・記号を組み合わせて入力"
              className="min-w-0 flex-1 bg-transparent text-xs text-zinc-900 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'パスワードを隠す' : 'パスワードを表示'}
              className="shrink-0 p-1 text-zinc-400 hover:text-zinc-700"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div
            className={`grid grid-cols-3 gap-1.5 rounded-md ${
              showXRay ? 'p-1 border border-dashed border-orange-400 bg-orange-50/30' : ''
            }`}
          >
            {barColors.map((cls, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-colors duration-300 ${cls}`} />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-zinc-600">{label}</span>
          {showXRay && (
            <span className="w-fit rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              score={pwScore}/3（長さ6+・英数混在・長さ10+記号の3段階判定）
            </span>
          )}
        </div>
      );
    }

    case 'form-step-progress': {
      const steps = ['基本情報', 'プラン選択', '完了確認'];
      const fillWidth = stepIdx === 0 ? '0px' : `calc(${stepIdx * 50}% - ${stepIdx * 12}px)`;
      return (
        <div className="w-full max-w-sm px-3 flex flex-col gap-3">
          <div className="relative flex items-center justify-between">
            <div className="absolute left-3 right-3 top-3.5 h-0.5 bg-zinc-200" />
            <div
              className={`absolute left-3 top-3.5 h-0.5 ${showXRay ? 'bg-orange-500' : 'bg-blue-600'}`}
              style={{
                width: fillWidth,
                transition: isWaitingStart ? 'none' : `width ${effectiveDuration}s ${easeCss}`
              }}
            />
            {steps.map((label, idx) => {
              const done = idx < stepIdx;
              const current = idx === stepIdx;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStepIdx(idx)}
                  className="relative z-10 flex flex-col items-center gap-1"
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                      done
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : current
                          ? 'border-blue-600 bg-white text-blue-700 ring-4 ring-blue-100'
                          : 'border-zinc-300 bg-white text-zinc-400'
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                  </span>
                  <span className={`text-[10px] font-bold ${current ? 'text-blue-700' : 'text-zinc-500'}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5">
            <span className="text-xs font-bold text-zinc-800">
              ステップ {stepIdx + 1} / 3：{steps[stepIdx]}
            </span>
            <button
              type="button"
              onClick={() => setStepIdx((i) => (i + 1) % 3)}
              className="rounded-lg bg-zinc-900 px-2.5 py-1 text-[11px] font-bold text-white"
            >
              次へ
            </button>
          </div>
          {showXRay && (
            <span className="w-fit rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              stepIdx={stepIdx} / 進捗バー幅 {stepIdx * 50}%（{effectiveDuration}s {easeCss}）
            </span>
          )}
        </div>
      );
    }

    case 'form-file-dropzone':
      return (
        <div className="w-full max-w-sm px-3 flex flex-col items-center gap-2">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) {
                setAttachedName(`${sanitizePlainText(f.name, 40)} (${Math.max(1, Math.round(f.size / 1024))} KB)`);
              }
            }}
            className={`w-full rounded-xl border-2 border-dashed p-4 text-center transition-all ${
              dragOver
                ? 'border-blue-600 bg-blue-50/70 scale-[1.01]'
                : showXRay
                  ? 'border-orange-400 bg-orange-50/30'
                  : 'border-zinc-300 bg-zinc-50/60'
            }`}
          >
            {attachedName ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-white px-3 py-2 text-left">
                <span className="flex items-center gap-2 text-xs font-bold text-zinc-800 truncate">
                  <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                  {attachedName}
                </span>
                <button
                  type="button"
                  onClick={() => setAttachedName(null)}
                  aria-label="添付ファイルを削除"
                  className="shrink-0 text-zinc-400 hover:text-rose-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <Upload className={`h-5 w-5 ${dragOver ? 'text-blue-600' : 'text-zinc-400'}`} />
                <p className="m-0 text-xs font-bold text-zinc-700">ここにファイルをドロップ</p>
                <button
                  type="button"
                  onClick={() => setAttachedName('sample-design.pdf (180 KB)')}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  テストファイルを選ぶ
                </button>
              </div>
            )}
          </div>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              dragOver={String(dragOver)} / onDragOverで破線枠ハイライト＋sanitizePlainText(ファイル名)
            </span>
          )}
        </div>
      );

    // =========================================================================
    // 14. 案内・戻る・空状態 (#093 - #100)
    // =========================================================================
    case 'guide-btt-minimal-arrow':
      return (
        <div className="w-full max-w-sm flex flex-col items-center gap-2 px-2">
          <div className="relative h-40 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
            <div
              ref={bttRef}
              onScroll={handleMiniScroll}
              className="h-full overflow-y-auto atlas-scroll p-3.5 space-y-2.5"
            >
              <p className="m-0 text-xs font-bold text-zinc-800">↓ 下へ少しスクロールしてみてください</p>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="rounded-lg bg-zinc-50 px-3 py-2 text-[11px] text-zinc-500">
                  セクション {i + 1}：一定量スクロールした時だけ右下に丸い矢印を浮かび上がらせます。
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={scrollMiniTop}
              aria-label="先頭へ戻る"
              className={`absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white shadow-md transition-all ${
                bttShown ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-3 pointer-events-none'
              } ${showXRay ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              scrollTop &gt; 52px で右下固定表示（現在 {bttScrollPct}% / shown={String(bttShown)}）
            </span>
          )}
        </div>
      );

    case 'guide-btt-progress-ring': {
      const r = 16;
      const circumference = 2 * Math.PI * r;
      const dashOffset = circumference * (1 - bttScrollPct / 100);
      return (
        <div className="w-full max-w-sm flex flex-col items-center gap-2 px-2">
          <div className="relative h-40 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
            <div
              ref={bttRef}
              onScroll={handleMiniScroll}
              className="h-full overflow-y-auto atlas-scroll p-3.5 space-y-2.5"
            >
              <p className="m-0 text-xs font-bold text-zinc-800">
                読む進捗リング付き戻るボタン（現在 {bttScrollPct}%）
              </p>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="rounded-lg bg-zinc-50 px-3 py-2 text-[11px] text-zinc-500">
                  段落 {i + 1}：読む位置が進むほど右下の円周リングが青く満たされていきます。
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={scrollMiniTop}
              aria-label={`先頭へ戻る（読了率 ${bttScrollPct}%）`}
              className={`absolute right-3 bottom-3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition-all ${
                bttShown || bttScrollPct > 10 ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
              } ${showXRay ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}
            >
              <svg className="absolute inset-0 h-10 w-10 -rotate-90" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r={r} fill="none" stroke="#e4e4e7" strokeWidth="2.5" />
                <circle
                  cx="20"
                  cy="20"
                  r={r}
                  fill="none"
                  stroke={showXRay ? '#f97316' : '#2563eb'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <ArrowUp className="relative z-10 h-3.5 w-3.5 text-zinc-900" />
            </button>
          </div>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              SVG strokeDashoffset={Math.round(dashOffset)}px / 読了率 {bttScrollPct}%
            </span>
          )}
        </div>
      );
    }

    case 'guide-btt-static-footer':
      return (
        <div className={`w-full px-3 flex flex-col items-center gap-2 ${isMobile ? 'max-w-[270px]' : 'max-w-sm'}`}>
          <div className="w-full h-40 flex flex-col rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
            <div ref={bttRef} className="flex-1 overflow-y-auto atlas-scroll p-3 space-y-2">
              <p className="m-0 text-[11px] font-bold text-zinc-700">記事・機能紹介エリア</p>
              <div className="rounded bg-zinc-50 p-2 text-[10px] text-zinc-500">
                文字や写真の邪魔になる浮遊ボタンを置かず、読み終わったフッター位置に定着させます。
              </div>
              <div className="rounded bg-zinc-50 p-2 text-[10px] text-zinc-500">
                特にスマホ画面で誤タップを防ぎたい読み物サイト・コーポレートサイト向けです。
              </div>
            </div>
            <div
              className={`border-t border-zinc-200 bg-zinc-50 px-3 py-2 flex items-center justify-between ${
                showXRay ? 'ring-1 ring-inset ring-orange-400 bg-orange-50/40' : ''
              }`}
            >
              <span className="text-[10px] font-mono text-zinc-400">© KatakataLab</span>
              <button
                type="button"
                onClick={scrollMiniTop}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-[10px] font-bold text-zinc-700 hover:bg-zinc-100"
              >
                <ArrowUp className="h-3 w-3" />
                先頭へ戻る
              </button>
            </div>
          </div>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              position: fixed を使わずフッター末尾に静的配置（本文遮蔽ゼロ）
            </span>
          )}
        </div>
      );

    case 'guide-dismissible-banner':
      return (
        <div className="w-full max-w-md px-3 flex flex-col items-center gap-2.5">
          {bannerOpen ? (
            <div
              className={`w-full flex items-center justify-between gap-2 rounded-xl border bg-blue-600 px-3.5 py-2.5 text-white shadow-sm ${
                showXRay ? 'border-orange-400 ring-2 ring-orange-400/60' : 'border-blue-200'
              }`}
            >
              <span className="min-w-0 flex-1 text-xs font-semibold truncate">
                お知らせ：年額プランの 20% 割引キャンペーンを実施中
              </span>
              <button
                type="button"
                onClick={() => setBannerOpen(false)}
                aria-label="お知らせバナーを閉じる"
                className="shrink-0 rounded-md p-1 text-white/80 hover:bg-white/15 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3.5 py-2.5">
              <span className="text-[11px] text-zinc-500">バナーは閉じられました</span>
              <button
                type="button"
                onClick={() => setBannerOpen(true)}
                className="shrink-0 text-[11px] font-bold text-blue-600 hover:underline"
              >
                再表示する
              </button>
            </div>
          )}
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              bannerOpen={String(bannerOpen)}（最上段占有＋任意閉じ＋復帰導線）
            </span>
          )}
        </div>
      );

    case 'guide-tooltip-popover':
      return (
        <div className="relative flex flex-col items-center gap-2 pt-14 px-3">
          <div className="relative">
            <div
              role="tooltip"
              aria-hidden={!tipOpen}
              className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-52 rounded-xl bg-zinc-900 px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg ${
                tipOpen
                  ? 'opacity-100 translate-y-0 pointer-events-auto'
                  : showXRay
                    ? 'opacity-35 translate-y-1 pointer-events-none border border-dashed border-orange-400'
                    : 'opacity-0 translate-y-1 pointer-events-none'
              }`}
              style={{ transition: `opacity ${effectiveDuration}s ${easeCss}, transform ${effectiveDuration}s ${easeCss}` }}
            >
              年額プランに切り替えると毎月請求の手間なく 2ヶ月分お得になります。
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
            </div>
            <button
              type="button"
              onClick={() => setTipOpen((v) => !v)}
              onMouseEnter={() => setTipOpen(true)}
              onMouseLeave={() => setTipOpen(false)}
              className={`inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 ${
                showXRay ? 'border-orange-400 border-dashed' : 'border-zinc-300'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
              補足説明を見る
            </button>
          </div>
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              relative 基準で bottom-full -translate-x-1/2 配置（tipOpen={String(tipOpen)}）
            </span>
          )}
        </div>
      );

    case 'guide-empty-state':
      return (
        <div className={`w-full px-3 flex flex-col items-center gap-2 ${isMobile ? 'max-w-[270px]' : 'max-w-sm'}`}>
          {emptyRecovered ? (
            <div className="w-full rounded-xl border border-zinc-200 bg-white p-3.5 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-zinc-800">条件リセット済み：全件表示中</span>
              <button
                type="button"
                onClick={() => setEmptyRecovered(false)}
                className="shrink-0 text-[11px] font-semibold text-zinc-500 underline"
              >
                空状態に戻る
              </button>
            </div>
          ) : (
            <div
              className={`w-full rounded-xl border border-dashed bg-white px-4 py-4 text-center flex flex-col items-center gap-2 ${
                showXRay ? 'border-orange-400 bg-orange-50/25' : 'border-zinc-300'
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                <Inbox className="h-4 w-4" />
              </span>
              <p className="m-0 text-xs font-bold text-zinc-800">一致する項目がありません</p>
              <p className="m-0 text-[11px] text-zinc-500">
                検索条件を広げるか、下のボタンで初期状態に戻せます。
              </p>
              <button
                type="button"
                onClick={() => setEmptyRecovered(true)}
                className="mt-0.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-bold text-white"
              >
                条件をリセットして戻る
              </button>
            </div>
          )}
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              破線枠＋アイコン＋復帰CTA の 3点セット（emptyRecovered={String(emptyRecovered)}）
            </span>
          )}
        </div>
      );

    case 'guide-pagination-vs-more':
      return (
        <div className={`w-full px-3 flex flex-col items-center gap-2.5 ${isMobile ? 'max-w-[270px]' : 'max-w-sm'}`}>
          <div className="w-full flex items-center justify-center gap-1 rounded-lg bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => setPagerMode('pages')}
              className={`flex-1 rounded-md py-1 text-[11px] font-bold ${
                pagerMode === 'pages' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500'
              }`}
            >
              ページ番号 (1・2・3)
            </button>
            <button
              type="button"
              onClick={() => setPagerMode('more')}
              className={`flex-1 rounded-md py-1 text-[11px] font-bold ${
                pagerMode === 'more' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500'
              }`}
            >
              もっと見る追加
            </button>
          </div>
          {pagerMode === 'pages' ? (
            <div
              className={`w-full flex items-center justify-between rounded-xl border bg-white px-3 py-2 ${
                showXRay ? 'border-orange-400' : 'border-zinc-200'
              }`}
            >
              <span className="text-[11px] text-zinc-500">現在 {pageNum} ページ目</span>
              <div className="flex gap-1">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPageNum(n)}
                    className={`h-6 w-6 rounded text-[11px] font-mono font-bold ${
                      pageNum === n ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              className={`w-full flex items-center justify-between rounded-xl border bg-white px-3 py-2 ${
                showXRay ? 'border-orange-400' : 'border-zinc-200'
              }`}
            >
              <span className="text-[11px] text-zinc-600">{moreCount} / 6 件を表示中</span>
              <button
                type="button"
                onClick={() => setMoreCount((c) => (c >= 6 ? 2 : c + 2))}
                className="rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-[11px] font-bold text-zinc-800"
              >
                {moreCount >= 6 ? '最初に戻す' : '＋2件読み込む'}
              </button>
            </div>
          )}
          {showXRay && (
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-mono text-orange-700">
              pagerMode="{pagerMode}"（ページ {pageNum} / 追加表示 {moreCount}件）
            </span>
          )}
        </div>
      );

    case 'guide-inline-confirm':
      return (
        <div className="flex flex-col items-center gap-2 px-3">
          {confirmPhase === 'idle' && (
            <button
              type="button"
              onClick={() => setConfirmPhase('ask')}
              className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
            >
              この下書きを削除する
            </button>
          )}
          {confirmPhase === 'ask' && (
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2">
              <span className="text-[11px] font-bold text-rose-900">本当に削除しますか？</span>
              <button
                type="button"
                onClick={() => setConfirmPhase('done')}
                className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white"
              >
                はい、削除
              </button>
              <button
                type="button"
                onClick={() => setConfirmPhase('idle')}
                className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 border border-zinc-200"
              >
                戻る
              </button>
            </div>
          )}
          {confirmPhase === 'done' && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800">
              <Check className="h-4 w-4" />
              削除しました
              <button
                type="button"
                onClick={() => setConfirmPhase('idle')}
                className="ml-1 text-[11px] underline font-normal"
              >
                リセット
              </button>
            </div>
          )}
          {showXRay && (
            <span className="text-[10px] font-mono text-zinc-500">
              確認モーダルを開かずその場で 2 段階ボタン化（state: {confirmPhase}）
            </span>
          )}
        </div>
      );

    default:
      return null;
  }
};
