import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, Search, Sparkles, X } from 'lucide-react';
import type { StageRendererProps } from './StageTextAndReveal';
import { EASING_OPTIONS } from '../../utils/motionHelpers';
import { animateScrollTopTo } from '../../utils/scrollAnim';

const MiniBrandMark: React.FC<{ title?: string }> = ({ title = 'Atlas' }) => (
  <span className="inline-flex items-center gap-1.5 font-extrabold tracking-tight text-zinc-900">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="8" height="16" rx="2" fill="#2563EB" />
      <rect x="13" y="8" width="8" height="12" rx="2" fill="#94A3B8" fillOpacity="0.45" />
    </svg>
    <span className="text-xs">{title}</span>
  </span>
);

export const StageHeaderFooter: React.FC<StageRendererProps> = ({
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

  // Classic / Centered header mobile menu preview
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Floating Smart-Hide header states
  const pillScrollRef = useRef<HTMLDivElement | null>(null);
  const pillPrevScrollRef = useRef(0);
  const pillCancelScrollRef = useRef<(() => void) | null>(null);
  const [pillHidden, setPillHidden] = useState(false);
  const [pillDirection, setPillDirection] = useState<'top' | 'down' | 'up'>('top');

  // Mega menu state
  const [megaOpen, setMegaOpen] = useState(false);

  // Curtain reveal footer states
  const curtainScrollRef = useRef<HTMLDivElement | null>(null);
  const curtainCancelScrollRef = useRef<(() => void) | null>(null);
  const [curtainProgress, setCurtainProgress] = useState(0);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [viewportMode, patternId]);

  useEffect(() => {
    return () => {
      pillCancelScrollRef.current?.();
      curtainCancelScrollRef.current?.();
    };
  }, []);

  // Playback choreography (0.5s lead-in aware)
  useEffect(() => {
    if (isWaitingStart) {
      pillCancelScrollRef.current?.();
      curtainCancelScrollRef.current?.();
      setPillHidden(false);
      setPillDirection('top');
      pillPrevScrollRef.current = 0;
      if (pillScrollRef.current) pillScrollRef.current.scrollTop = 0;
      setMegaOpen(false);
      if (curtainScrollRef.current) curtainScrollRef.current.scrollTop = 0;
      setCurtainProgress(0);
      return;
    }

    if (playKey === 0) return;
    const timers: number[] = [];
    const durMs = Math.round(effectiveDuration * 1000);

    if (patternId === 'hf-floating-pill') {
      const el = pillScrollRef.current;
      if (el) {
        const downTarget = Math.max(120, Math.round((el.scrollHeight - el.clientHeight) * 0.78));
        pillCancelScrollRef.current = animateScrollTopTo(
          el,
          downTarget,
          Math.max(550, Math.round(durMs * 1.4)),
          () => {
            timers.push(
              window.setTimeout(() => {
                const upTarget = Math.max(0, Math.round(downTarget * 0.35));
                pillCancelScrollRef.current = animateScrollTopTo(
                  el,
                  upTarget,
                  Math.max(450, Math.round(durMs * 1.0))
                );
              }, Math.round(350 * slowFactor))
            );
          }
        );
      }
    }

    if (patternId === 'hf-mega-menu') {
      setMegaOpen(true);
    }

    if (patternId === 'hf-curtain-reveal-footer') {
      const el = curtainScrollRef.current;
      if (el) {
        const bottomTarget = Math.max(0, el.scrollHeight - el.clientHeight);
        curtainCancelScrollRef.current = animateScrollTopTo(el, bottomTarget, durMs);
      }
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      pillCancelScrollRef.current?.();
      curtainCancelScrollRef.current?.();
    };
  }, [patternId, playKey, isWaitingStart, effectiveDuration, slowFactor]);

  switch (patternId) {
    // -------------------------------------------------------------------------
    // 1. 王道3分割1行ヘッダー（静的・PC/スマホ切替）
    // -------------------------------------------------------------------------
    case 'hf-classic-header':
      return (
        <div
          className={`w-full transition-[max-width] duration-300 ease-out ${
            isMobile ? 'max-w-[235px]' : 'max-w-md'
          }`}
        >
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
            <div
              className={`flex h-12 items-center justify-between border-b border-zinc-100 px-3.5 ${
                showXRay ? 'bg-blue-50/40' : 'bg-white'
              }`}
            >
              <div
                className={
                  showXRay ? 'rounded border border-dashed border-blue-500 px-1.5 py-0.5' : ''
                }
              >
                <MiniBrandMark title="Katakata" />
              </div>

              {!isMobile ? (
                <>
                  <nav
                    aria-label="ヘッダー見本"
                    className={`flex items-center gap-3 text-[11px] font-medium text-zinc-600 ${
                      showXRay ? 'rounded border border-dashed border-emerald-500 px-2 py-0.5' : ''
                    }`}
                  >
                    <span className="text-zinc-900 font-semibold">特徴</span>
                    <span>機能</span>
                    <span>料金</span>
                    <span>事例</span>
                  </nav>
                  <button
                    type="button"
                    className={`rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white ${
                      showXRay ? 'ring-2 ring-orange-400 ring-offset-1' : ''
                    }`}
                  >
                    はじめる
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setMobileNavOpen((v) => !v)}
                  aria-expanded={mobileNavOpen}
                  aria-label="スマホメニューを開く"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  {mobileNavOpen ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>

            {isMobile && mobileNavOpen ? (
              <div className="border-b border-zinc-100 bg-zinc-50/80 px-3.5 py-2.5 space-y-1.5 text-[11px]">
                <div className="font-semibold text-zinc-900">特徴</div>
                <div className="text-zinc-600">機能 / 料金 / 事例</div>
                <div className="pt-1">
                  <span className="inline-block w-full rounded-lg bg-blue-600 py-1.5 text-center font-bold text-white">
                    はじめる
                  </span>
                </div>
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-[11px] text-zinc-400">
                {showXRay ? (
                  <div className="flex flex-wrap items-center justify-center gap-2 text-[10px]">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 font-semibold text-blue-700">
                      左: 顔（ロゴ）
                    </span>
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700">
                      中: 道案内（4項目）
                    </span>
                    <span className="rounded bg-orange-100 px-1.5 py-0.5 font-semibold text-orange-700">
                      右: ゴール（CTA）
                    </span>
                  </div>
                ) : (
                  'コンテンツ領域（ヘッダー高さ 56〜64px が読みやすさの目安）'
                )}
              </div>
            )}
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    // 2. ロゴ中央・左右振り分けヘッダー（静的・PC/スマホ切替）
    // -------------------------------------------------------------------------
    case 'hf-centered-brand':
      return (
        <div
          className={`w-full transition-[max-width] duration-300 ease-out ${
            isMobile ? 'max-w-[235px]' : 'max-w-md'
          }`}
        >
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
            <div className="grid h-12 grid-cols-[1fr_auto_1fr] items-center border-b border-zinc-100 px-3.5">
              {/* 左枠 */}
              <div
                className={`flex items-center gap-2.5 text-[11px] font-medium text-zinc-600 ${
                  showXRay ? 'border border-dashed border-blue-400 px-1 py-0.5 rounded' : ''
                }`}
              >
                {isMobile ? (
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen((v) => !v)}
                    aria-label="メニュー"
                    className="p-1 text-zinc-600 hover:text-zinc-900 cursor-pointer"
                  >
                    {mobileNavOpen ? (
                      <X className="h-3.5 w-3.5" />
                    ) : (
                      <Menu className="h-3.5 w-3.5" />
                    )}
                  </button>
                ) : (
                  <>
                    <span>特集</span>
                    <span>読みもの</span>
                  </>
                )}
              </div>

              {/* 中央ロゴ枠 (auto) */}
              <div
                className={`px-2 font-serif text-sm font-bold tracking-[0.18em] text-zinc-900 ${
                  showXRay ? 'border border-dashed border-orange-500 rounded bg-orange-50/50' : ''
                }`}
              >
                ATELIER
              </div>

              {/* 右枠 */}
              <div
                className={`flex items-center justify-end gap-2 text-[11px] font-medium text-zinc-600 ${
                  showXRay ? 'border border-dashed border-blue-400 px-1 py-0.5 rounded' : ''
                }`}
              >
                {!isMobile && <span>案内</span>}
                <Search className="h-3.5 w-3.5 text-zinc-500" />
              </div>
            </div>

            {isMobile && mobileNavOpen ? (
              <div className="border-b border-zinc-100 bg-zinc-50 px-3.5 py-2.5 text-[11px] text-zinc-700 space-y-1">
                <div>特集</div>
                <div>読みもの</div>
                <div>案内・お問い合わせ</div>
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-[11px] text-zinc-400">
                {showXRay
                  ? 'grid-template-columns: 1fr auto 1fr で左右の文字幅が違ってもロゴは厳密に真ん中へ'
                  : '左右の文字量が変わってもブランド名が中央からズレない雑誌風配置'}
              </div>
            )}
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    // 3. 浮き島ピル型スマートヘッダー（スクロールで隠れて上戻しで再表示）
    // -------------------------------------------------------------------------
    case 'hf-floating-pill':
      return (
        <div className="relative h-44 w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
          {/* 浮き島カプセルヘッダー */}
          <div
            className={`absolute inset-x-4 top-2.5 z-20 flex items-center justify-between rounded-full border bg-white/95 px-3.5 py-1.5 shadow-sm backdrop-blur-xs ${
              showXRay ? 'border-2 border-dashed border-blue-500' : 'border-zinc-200/90'
            }`}
            style={{
              transform: pillHidden ? 'translateY(-150%)' : 'translateY(0)',
              transition: `transform ${effectiveDuration}s ${easeCss}`
            }}
          >
            <MiniBrandMark title="PillNav" />
            <div className="flex items-center gap-2.5 text-[10px] font-semibold text-zinc-600">
              <span>概要</span>
              <span>機能</span>
              <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-white">開始</span>
            </div>
          </div>

          {showXRay && (
            <div className="pointer-events-none absolute top-11 right-4 z-20 rounded bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-blue-700 border border-blue-200">
              {pillDirection === 'down'
                ? '↓ 下へ閲覧中: translateY(-150%) で退避'
                : pillDirection === 'up'
                  ? '↑ 上へ戻る動作: translateY(0) で復帰'
                  : '上端付近: 常に表示'}
            </div>
          )}

          {/* スクロールコンテンツ */}
          <div
            ref={pillScrollRef}
            onScroll={(e) => {
              const y = e.currentTarget.scrollTop;
              const prev = pillPrevScrollRef.current;
              if (y <= 22) {
                setPillHidden(false);
                setPillDirection('top');
              } else if (y > prev + 3) {
                setPillHidden(true);
                setPillDirection('down');
              } else if (y < prev - 3) {
                setPillHidden(false);
                setPillDirection('up');
              }
              pillPrevScrollRef.current = y;
            }}
            className="h-full overflow-y-auto px-4 pt-14 pb-4 space-y-2.5"
          >
            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="text-xs font-bold text-zinc-800">記事を下に読み進めるセクション</div>
              <p className="mt-1 text-[11px] text-zinc-500">
                下へスクロールするとピルヘッダーが上に消えて画面を広く使えます。
              </p>
            </div>
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="rounded-lg border border-zinc-200/80 bg-white p-2.5">
                <div className="h-2.5 w-24 rounded bg-zinc-200" />
                <div className="mt-1.5 h-2 w-full rounded bg-zinc-100" />
                <div className="mt-1 h-2 w-3/4 rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    // 4. 広く見渡せるメガメニュー展開ヘッダー
    // -------------------------------------------------------------------------
    case 'hf-mega-menu':
      return (
        <div className="relative h-44 w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
          <div className="relative z-20 flex h-11 items-center justify-between border-b border-zinc-200 bg-white px-3.5">
            <MiniBrandMark title="Mega" />
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setMegaOpen((v) => !v)}
                aria-expanded={megaOpen}
                className={`inline-flex items-center gap-0.5 rounded-md px-2 py-1 transition-colors cursor-pointer ${
                  megaOpen ? 'bg-blue-50 text-blue-700' : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <span>機能一覧</span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-200 ${
                    megaOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <span className="text-zinc-500">導入事例</span>
              <span className="text-zinc-500">料金</span>
            </div>
          </div>

          {/* 展開メガパネル */}
          <div
            aria-hidden={!megaOpen}
            className={`absolute inset-x-3 top-12 z-20 rounded-xl border bg-white p-2.5 shadow-lg ${
              showXRay ? 'border-2 border-dashed border-orange-500' : 'border-zinc-200'
            }`}
            style={{
              opacity: megaOpen ? 1 : 0,
              pointerEvents: megaOpen ? 'auto' : 'none',
              transform: megaOpen ? 'translateY(0)' : 'translateY(-8px)',
              transition: `opacity ${effectiveDuration}s ease, transform ${effectiveDuration}s ${easeCss}`
            }}
          >
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: '制作ツール', desc: 'ノーコード連携' },
                { name: 'AI支援', desc: '指示文を一発生成' },
                { name: '安全設計', desc: 'XSS/CSP自動防御' }
              ].map((item) => (
                <div
                  key={item.name}
                  className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-2 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-900">
                    <Sparkles className="h-3 w-3 text-blue-600" />
                    {item.name}
                  </div>
                  <div className="mt-0.5 text-[10px] text-zinc-500">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 text-[11px] text-zinc-400">
            項目が多いサイトでは、小さな縦リストより横3列の図解パネルの方が一目で探せます。
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    // 5. 安心の3列サイトマップ・フッター（静的・PC/スマホ切替）
    // -------------------------------------------------------------------------
    case 'hf-sitemap-footer':
      return (
        <div
          className={`w-full transition-[max-width] duration-300 ease-out ${
            isMobile ? 'max-w-[235px]' : 'max-w-md'
          }`}
        >
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900 p-4 text-zinc-300 shadow-xs">
            <div
              className={`grid gap-3 ${
                isMobile ? 'grid-cols-2' : 'grid-cols-[1.3fr_1fr_1fr_1fr]'
              }`}
            >
              <div
                className={`${isMobile ? 'col-span-2' : ''} ${
                  showXRay ? 'rounded border border-dashed border-blue-400 p-1.5' : ''
                }`}
              >
                <div className="text-xs font-bold text-white">KatakataLab</div>
                <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">
                  作りながら学べる Web の表現と道具の図鑑。
                </p>
              </div>

              {[
                { head: '図鑑', items: ['文字の動き', '検索UI', '上下枠'] },
                { head: '学ぶ', items: ['仕組み解説', 'AIプロンプト', '設計原則'] },
                { head: '案内', items: ['更新履歴', '利用規約', '連絡先'] }
              ].map((col) => (
                <div
                  key={col.head}
                  className={showXRay ? 'rounded border border-dashed border-zinc-500 p-1.5' : ''}
                >
                  <div className="text-[10px] font-bold text-white">{col.head}</div>
                  <ul className="mt-1 space-y-0.5 text-[10px] text-zinc-400">
                    {col.items.map((link) => (
                      <li key={link}>{link}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-2.5 text-[10px] text-zinc-500">
              <span>© 2026 KatakataLab</span>
              <span>JP / Accessibility Ready</span>
            </div>
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    // 6. 超軽量1行ミニマルフッター（静的・PC/スマホ切替）
    // -------------------------------------------------------------------------
    case 'hf-minimal-footer':
      return (
        <div
          className={`w-full transition-[max-width] duration-300 ease-out ${
            isMobile ? 'max-w-[235px]' : 'max-w-md'
          }`}
        >
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
            <div className="px-4 py-6 text-center text-[11px] text-zinc-400">
              ツール・アプリ画面（下部のフッターは主張しすぎず 1 本の線で区切る）
            </div>
            <footer
              className={`border-t border-zinc-200 bg-zinc-50/70 px-4 py-3 text-[11px] text-zinc-500 flex ${
                isMobile
                  ? 'flex-col items-center gap-1.5 text-center'
                  : 'flex-row items-center justify-between'
              } ${showXRay ? 'ring-2 ring-inset ring-blue-400' : ''}`}
            >
              <span className="font-medium text-zinc-700">© 2026 KatakataLab</span>
              <div className="flex items-center gap-3">
                <span>使い方</span>
                <span>規約</span>
                <span>連絡</span>
              </div>
            </footer>
          </div>
        </div>
      );

    // -------------------------------------------------------------------------
    // 7. 最下部で幕が上がって現れるリビール・フッター
    // -------------------------------------------------------------------------
    case 'hf-curtain-reveal-footer': {
      const footerHeightPx = 88;
      return (
        <div className="relative h-44 w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900">
          {/* 背面で待機する固定フッター (z:1) */}
          <div
            className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-center px-4 text-white"
            style={{ height: `${footerHeightPx}px` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold tracking-tight">
                  次のアイデアを、形にしよう。
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-400">
                  前面カードの後ろで待機していたフッター（z-index: 1）
                </div>
              </div>
              <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white">
                TOP へ
              </span>
            </div>
          </div>

          {showXRay && (
            <div className="pointer-events-none absolute top-2 left-2 z-30 flex gap-1.5 font-mono text-[10px]">
              <span className="rounded bg-blue-600/90 px-1.5 py-0.5 text-white">
                進捗 {Math.round(curtainProgress * 100)}%
              </span>
              <span className="rounded bg-amber-500/90 px-1.5 py-0.5 text-zinc-950 font-semibold">
                前面シート z:2 / フッター z:1
              </span>
            </div>
          )}

          {/* 前面スクロール容器 (前面シートが最後で上へ退き、足元の幕が開く) */}
          <div
            ref={curtainScrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const max = Math.max(1, el.scrollHeight - el.clientHeight);
              setCurtainProgress(Math.min(1, el.scrollTop / max));
            }}
            className="relative z-20 h-full overflow-y-auto"
          >
            <div
              className={`bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.28)] space-y-2 ${
                showXRay ? 'border-b-4 border-dashed border-orange-500' : ''
              }`}
              style={{ marginBottom: `${footerHeightPx}px` }}
            >
              <div className="text-xs font-bold text-zinc-800">本文シート（z-index: 2）</div>
              <p className="text-[11px] text-zinc-500">
                下へスクロールしきると、この白い本文が幕のように上へ上がり、裏にある黒いフッターが現れます。
              </p>
              <div className="h-12 rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-[10px] text-zinc-400">
                コンテンツ中盤...
              </div>
              <div className="h-10 rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-[10px] text-zinc-400">
                記事のラスト（ここを通り過ぎると幕が上がります）
              </div>
            </div>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
};
