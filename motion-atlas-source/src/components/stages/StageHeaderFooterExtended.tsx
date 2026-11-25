import React, { useEffect, useRef, useState } from 'react';
import { Check, Globe, Menu, Sparkles, X } from 'lucide-react';
import type { StageRendererProps } from './StageTextAndReveal';
import { EASING_OPTIONS } from '../../utils/motionHelpers';
import { animateScrollTopTo } from '../../utils/scrollAnim';
import { sanitizePlainText } from '../../utils/security';

const NAV_LABELS = ['特徴', '機能', '料金', '事例'];

export const StageHeaderFooterExtended: React.FC<StageRendererProps> = ({
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

  // Link variants active / hover demo index
  const [activeNavIdx, setActiveNavIdx] = useState(0);
  const [growIdx, setGrowIdx] = useState<number | null>(null);

  // Transparent-to-solid hero scroll
  const heroScrollRef = useRef<HTMLDivElement | null>(null);
  const heroCancelRef = useRef<(() => void) | null>(null);
  const [heroSolid, setHeroSolid] = useState(false);

  // Announcement two-tier banner toggle in mobile
  const [bannerShown, setBannerShown] = useState(true);

  // Newsletter footer interactive form
  const [newsMail, setNewsMail] = useState('');
  const [newsSubscribed, setNewsSubscribed] = useState(false);

  useEffect(() => {
    return () => {
      heroCancelRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (isWaitingStart) {
      heroCancelRef.current?.();
      setActiveNavIdx(0);
      setGrowIdx(null);
      setHeroSolid(false);
      if (heroScrollRef.current) heroScrollRef.current.scrollTop = 0;
      return;
    }

    if (playKey === 0) return;
    const timers: number[] = [];
    const durMs = Math.round(effectiveDuration * 1000);
    const stepMs = Math.max(380, Math.round(durMs * 0.95));

    if (patternId === 'hdr-link-hover-grow') {
      timers.push(window.setTimeout(() => setGrowIdx(0), 60));
      timers.push(window.setTimeout(() => setGrowIdx(1), 60 + stepMs));
      timers.push(window.setTimeout(() => setGrowIdx(2), 60 + stepMs * 2));
      timers.push(window.setTimeout(() => setGrowIdx(null), 60 + stepMs * 3 + Math.round(200 * slowFactor)));
    }

    if (patternId === 'hdr-link-underline' || patternId === 'hdr-link-pill-active') {
      timers.push(window.setTimeout(() => setActiveNavIdx(1), 60));
      timers.push(window.setTimeout(() => setActiveNavIdx(2), 60 + stepMs));
      timers.push(window.setTimeout(() => setActiveNavIdx(0), 60 + stepMs * 2 + Math.round(200 * slowFactor)));
    }

    if (patternId === 'hdr-transparent-to-solid') {
      const el = heroScrollRef.current;
      if (el) {
        const downTo = Math.max(95, Math.round((el.scrollHeight - el.clientHeight) * 0.85));
        heroCancelRef.current = animateScrollTopTo(el, downTo, Math.max(500, durMs), () => {
          timers.push(
            window.setTimeout(() => {
              heroCancelRef.current = animateScrollTopTo(el, 0, Math.max(450, Math.round(durMs * 0.9)));
            }, Math.round(500 * slowFactor))
          );
        });
      }
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      heroCancelRef.current?.();
    };
  }, [patternId, playKey, isWaitingStart, effectiveDuration, slowFactor]);

  switch (patternId) {
    // -------------------------------------------------------------------------
    // #054 ヘッダーリンク違い①：ホバーでほんのり大きく濃くなる
    // -------------------------------------------------------------------------
    case 'hdr-link-hover-grow':
      return (
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
          <div className="flex h-12 items-center justify-between border-b border-zinc-100 px-4">
            <span className="text-xs font-extrabold tracking-tight text-zinc-900">Atlas</span>
            <nav aria-label="拡大ホバーリンク見本" className="flex items-center gap-4">
              {NAV_LABELS.map((label, i) => {
                const hovered = growIdx === i;
                return (
                  <button
                    key={label}
                    type="button"
                    onMouseEnter={() => setGrowIdx(i)}
                    onMouseLeave={() => setGrowIdx(null)}
                    onClick={() => setGrowIdx(i)}
                    className={`text-xs transition-all cursor-pointer ${
                      hovered
                        ? 'scale-110 -translate-y-px font-bold text-zinc-950'
                        : 'text-zinc-500 font-medium'
                    } ${showXRay && hovered ? 'ring-1 ring-blue-400 rounded px-1' : ''}`}
                    style={{ transitionDuration: `${effectiveDuration}s`, transitionTimingFunction: easeCss }}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>
            <span className="rounded-lg bg-zinc-900 px-2.5 py-1 text-[10px] font-bold text-white">
              開始
            </span>
          </div>
          <div className="px-4 py-5 text-center text-[11px] text-zinc-400">
            文字に線や箱を足さず、「太さ・濃さ・ごく小さな拡大」だけで反応を見せるすっきり型
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    // #055 ヘッダーリンク違い②：選択中・ホバーで下線が引かれる
    // -------------------------------------------------------------------------
    case 'hdr-link-underline':
      return (
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
          <div className="flex h-12 items-center justify-between border-b border-zinc-100 px-4">
            <span className="text-xs font-extrabold tracking-tight text-zinc-900">Atlas</span>
            <nav aria-label="下線スライドリンク見本" className="flex items-center gap-4 h-full">
              {NAV_LABELS.map((label, i) => {
                const active = activeNavIdx === i;
                return (
                  <button
                    key={label}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setActiveNavIdx(i)}
                    className={`relative flex h-full items-center text-xs transition-colors cursor-pointer ${
                      active ? 'font-bold text-zinc-950' : 'font-medium text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 bottom-0 h-0.5 origin-left rounded-full ${
                        showXRay ? 'bg-orange-500' : 'bg-blue-600'
                      }`}
                      style={{
                        transform: active ? 'scaleX(1)' : 'scaleX(0)',
                        transition: `transform ${effectiveDuration}s ${easeCss}`
                      }}
                    />
                  </button>
                );
              })}
            </nav>
            <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white">
              開始
            </span>
          </div>
          <div className="px-4 py-5 text-center text-[11px] text-zinc-400">
            クリック／滞在ページの真下にだけ下線（scaleX: 0 → 1）が左からスッと引かれます
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    // #056 ヘッダーリンク違い③：薄グレー枠に白・黒ピルで囲まれる現在地型
    // -------------------------------------------------------------------------
    case 'hdr-link-pill-active':
      return (
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
          <div className="flex h-13 items-center justify-between border-b border-zinc-100 px-3.5">
            <span className="text-xs font-extrabold tracking-tight text-zinc-900">Atlas</span>
            <nav
              aria-label="ピル囲みリンク見本"
              className={`flex items-center gap-1 rounded-full bg-zinc-100/90 p-1 ${
                showXRay ? 'border border-dashed border-blue-400' : ''
              }`}
            >
              {NAV_LABELS.map((label, i) => {
                const active = activeNavIdx === i;
                return (
                  <button
                    key={label}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setActiveNavIdx(i)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-zinc-900 text-white shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/70'
                    }`}
                    style={{ transitionDuration: `${effectiveDuration}s`, transitionTimingFunction: easeCss }}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>
            <span className="text-[11px] font-semibold text-blue-600">ログイン</span>
          </div>
          <div className="px-4 py-5 text-center text-[11px] text-zinc-400">
            普段の待機色は薄いグレーにしておき、今いる場所だけ丸く黒ピルで囲む高視認型
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    // #057 2段構えヘッダー（お知らせ細帯 ＋ メインメニュー）
    // -------------------------------------------------------------------------
    case 'hdr-announcement-two-tier':
      return (
        <div
          className={`w-full transition-[max-width] duration-300 ease-out ${
            isMobile ? 'max-w-[235px]' : 'max-w-md'
          }`}
        >
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
            {bannerShown && (
              <div
                className={`flex items-center justify-between bg-zinc-900 px-3 py-1.5 text-[10px] text-white ${
                  showXRay ? 'ring-2 ring-inset ring-orange-400' : ''
                }`}
              >
                <span className="inline-flex items-center gap-1 truncate">
                  <Sparkles className="h-3 w-3 shrink-0 text-amber-300" />
                  <span>新機能：通し番号検索に対応しました</span>
                </span>
                <button
                  type="button"
                  aria-label="お知らせを閉じる"
                  onClick={() => setBannerShown(false)}
                  className="ml-2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <div className="flex h-11 items-center justify-between border-b border-zinc-100 px-3.5">
              <span className="text-xs font-extrabold text-zinc-900">Atlas</span>
              {!isMobile ? (
                <div className="flex items-center gap-3 text-[11px] text-zinc-600">
                  <span>機能</span>
                  <span>料金</span>
                  <span className="rounded bg-blue-600 px-2 py-0.5 font-bold text-white">開始</span>
                </div>
              ) : (
                <Menu className="h-4 w-4 text-zinc-600" />
              )}
            </div>

            <div className="px-4 py-4 text-center text-[11px] text-zinc-400">
              {bannerShown ? (
                '本体を汚さず最上段の細帯だけで告知する2段構造'
              ) : (
                <button
                  type="button"
                  onClick={() => setBannerShown(true)}
                  className="text-blue-600 underline cursor-pointer"
                >
                  お知らせ帯を再表示する
                </button>
              )}
            </div>
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    // #058 透明ヘッダー → スクロールで白背景バーへ変化
    // -------------------------------------------------------------------------
    case 'hdr-transparent-to-solid':
      return (
        <div className="relative h-44 w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {/* 上固定ヘッダー */}
          <div
            className={`absolute inset-x-0 top-0 z-20 flex h-11 items-center justify-between px-4 transition-all ${
              heroSolid
                ? 'border-b border-zinc-200 bg-white/95 text-zinc-900 shadow-2xs backdrop-blur-xs'
                : 'border-b border-transparent bg-transparent text-white'
            } ${showXRay ? 'outline-1 outline-dashed outline-blue-400' : ''}`}
            style={{ transitionDuration: `${effectiveDuration}s`, transitionTimingFunction: easeCss }}
          >
            <span className="text-xs font-extrabold tracking-tight">Horizon</span>
            <div className="flex items-center gap-3 text-[11px] font-medium">
              <span>作品</span>
              <span>案内</span>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  heroSolid ? 'bg-blue-600 text-white' : 'bg-white text-zinc-900'
                }`}
              >
                体験
              </span>
            </div>
          </div>

          {/* スクロール容器 */}
          <div
            ref={heroScrollRef}
            onScroll={(e) => setHeroSolid(e.currentTarget.scrollTop > 28)}
            className="h-full overflow-y-auto"
          >
            {/* ヒーロー上帯（グラデーション＋写真風背景） */}
            <div className="flex h-32 flex-col justify-end bg-gradient-to-br from-zinc-900 via-slate-800 to-blue-900 p-4 text-white">
              <div className="text-xs font-bold">トップ写真の上では透明＋白文字</div>
              <div className="text-[10px] text-zinc-300">
                下へ読むと白背景＋黒文字の読みやすいバーへ変わります
              </div>
            </div>
            <div className="space-y-2 bg-white p-4">
              <div className="h-3 w-36 rounded bg-zinc-200" />
              <div className="h-2.5 w-full rounded bg-zinc-100" />
              <div className="h-2.5 w-5/6 rounded bg-zinc-100" />
              <div className="h-14 rounded-lg bg-zinc-50 border border-zinc-100" />
            </div>
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    // #059 左固定サイドレール型ナビ（2ペイン構造）
    // -------------------------------------------------------------------------
    case 'hdr-rail-sidebar':
      return (
        <div
          className={`w-full transition-[max-width] duration-300 ease-out ${
            isMobile ? 'max-w-[235px]' : 'max-w-md'
          }`}
        >
          <div
            className={`overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs ${
              isMobile ? 'flex flex-col' : 'grid grid-cols-[120px_1fr] h-40'
            }`}
          >
            <aside
              className={`border-zinc-100 bg-zinc-50/90 p-2.5 ${
                isMobile ? 'flex items-center justify-between border-b' : 'border-r space-y-1'
              } ${showXRay ? 'border-2 border-dashed border-blue-400' : ''}`}
            >
              <div className="text-[11px] font-extrabold text-zinc-900 px-1.5">SideRail</div>
              {isMobile ? (
                <Menu className="h-4 w-4 text-zinc-600" />
              ) : (
                <div className="space-y-0.5 pt-1 text-[10px]">
                  <div className="rounded bg-white px-2 py-1 font-bold text-blue-700 shadow-2xs">
                    01 概要
                  </div>
                  <div className="px-2 py-1 text-zinc-500">02 仕組み</div>
                  <div className="px-2 py-1 text-zinc-500">03 設定</div>
                </div>
              )}
            </aside>
            <div className="p-3.5 space-y-1.5">
              <div className="text-xs font-bold text-zinc-800">右側がまるごと主役キャンバス</div>
              <p className="text-[10px] leading-relaxed text-zinc-500">
                カテゴリが多い図鑑やアプリでは、上ヘッダーより左固定ナビの方が迷わず切り替えられます。
              </p>
            </div>
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    // #060 CTAバナー一体型フッター
    // -------------------------------------------------------------------------
    case 'ftr-cta-docked':
      return (
        <div
          className={`w-full transition-[max-width] duration-300 ease-out ${
            isMobile ? 'max-w-[235px]' : 'max-w-md'
          }`}
        >
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900 p-3.5 text-white shadow-xs">
            <div
              className={`rounded-xl bg-blue-600 p-3 flex ${
                isMobile ? 'flex-col gap-2 text-center' : 'items-center justify-between'
              } ${showXRay ? 'ring-2 ring-orange-300' : ''}`}
            >
              <div>
                <div className="text-xs font-extrabold">今すぐ無料で試してみませんか？</div>
                <div className="text-[10px] text-blue-100">登録は1分・いつでも解約できます</div>
              </div>
              <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold text-blue-700">
                無料で始める
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-2.5 text-[10px] text-zinc-400">
              <span>© 2026 KatakataLab</span>
              <div className="flex gap-2.5">
                <span>利用規約</span>
                <span>お問い合わせ</span>
              </div>
            </div>
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    // #061 巨大ロゴタイポグラフィ・ブランドフッター
    // -------------------------------------------------------------------------
    case 'ftr-giant-wordmark':
      return (
        <div
          className={`w-full transition-[max-width] duration-300 ease-out ${
            isMobile ? 'max-w-[235px]' : 'max-w-md'
          }`}
        >
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white pt-4 px-4 pb-1 shadow-xs">
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>© 2026 KATAKATALAB</span>
              <div className="flex gap-3">
                <span>Works</span>
                <span>About</span>
                <span>Contact</span>
              </div>
            </div>
            <div
              className={`mt-3 select-none text-center font-black tracking-tighter leading-none text-zinc-900/90 ${
                isMobile ? 'text-2xl' : 'text-[44px]'
              } ${showXRay ? 'border border-dashed border-orange-400 text-blue-600' : ''}`}
            >
              KATAKATA
            </div>
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    // #062 メール登録フォーム付きフッター
    // -------------------------------------------------------------------------
    case 'ftr-newsletter-form':
      return (
        <div
          className={`w-full transition-[max-width] duration-300 ease-out ${
            isMobile ? 'max-w-[235px]' : 'max-w-md'
          }`}
        >
          <div
            className={`rounded-xl border bg-zinc-50 p-3.5 shadow-xs ${
              showXRay ? 'border-dashed border-orange-400' : 'border-zinc-200'
            }`}
          >
            <div
              className={`flex gap-3 ${
                isMobile ? 'flex-col' : 'items-center justify-between'
              }`}
            >
              <div className="min-w-0">
                <div className="text-xs font-bold text-zinc-900">更新メールを受け取る</div>
                <div className="text-[10px] text-zinc-500">新パターンの追加情報をお届け</div>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setNewsSubscribed(true);
                }}
                className="flex shrink-0 items-center gap-1.5"
              >
                <input
                  type="email"
                  maxLength={60}
                  value={newsMail}
                  onChange={(e) => {
                    setNewsMail(sanitizePlainText(e.target.value, 60));
                    setNewsSubscribed(false);
                  }}
                  placeholder="you@example.com"
                  aria-label="お知らせ登録メールアドレス"
                  className="w-32 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-zinc-800 cursor-pointer"
                >
                  {newsSubscribed ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span>済み</span>
                    </>
                  ) : (
                    <span>登録</span>
                  )}
                </button>
              </form>
            </div>
            <div className="mt-3 border-t border-zinc-200/80 pt-2 text-[10px] text-zinc-400">
              © 2026 KatakataLab · プライバシー方針
            </div>
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    // #063 稼働状況ドット・言語切替付きユーティリティフッター
    // -------------------------------------------------------------------------
    case 'ftr-compact-utility':
      return (
        <div
          className={`w-full transition-[max-width] duration-300 ease-out ${
            isMobile ? 'max-w-[235px]' : 'max-w-md'
          }`}
        >
          <div
            className={`rounded-xl border bg-white p-3.5 shadow-xs ${
              showXRay ? 'border-dashed border-blue-400' : 'border-zinc-200'
            }`}
          >
            <div
              className={`flex gap-2.5 text-[10px] text-zinc-600 ${
                isMobile ? 'flex-col items-start' : 'items-center justify-between'
              }`}
            >
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>すべてのシステム正常稼働</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-zinc-500">
                  <Globe className="h-3 w-3" /> 日本語 (JP)
                </span>
                <span className="text-zinc-400">X / GitHub</span>
              </div>
            </div>
            {showXRay && (
              <div className="mt-2 font-mono text-[9px] text-blue-700">
                稼働ドット(animate-pulse) + 言語・SNSの1段横並び配置
              </div>
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
};
