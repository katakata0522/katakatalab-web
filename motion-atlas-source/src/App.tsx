import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Menu, Search, Star, X } from 'lucide-react';
import { ALL_PATTERNS } from './data';
import { formatSerialCode, getPatternSerial, matchSerialScore } from './data/serialRegistry';
import { useFavorites } from './hooks/useFavorites';
import { usePrefersReducedMotion } from './hooks/useReducedMotion';
import { CATEGORIES } from './utils/motionHelpers';
import { POPULAR_SEARCH_CHIPS, expandSearchTokens } from './utils/searchHelpers';
import {
  MAX_SEARCH_QUERY_LENGTH,
  MAX_TARGET_NOTE_LENGTH,
  sanitizePlainText
} from './utils/security';
import { MotionCard, type CodeFormat } from './components/MotionCard';
import { CategoryNavList, type NavFilterMode } from './components/CategoryNavList';
import type { MotionPattern } from './types/motion';

function filterAndRankPatterns(rawQuery: string): MotionPattern[] {
  const tokens = expandSearchTokens(rawQuery);
  if (tokens.length === 0) return [];

  const scored = ALL_PATTERNS.map((p) => {
    const serial = getPatternSerial(p.id);
    const serialScore = matchSerialScore(serial, rawQuery);
    const serialCode = formatSerialCode(serial).toLowerCase();
    const haystack = [serialCode, p.title, p.subtitle, p.mechanismTag, ...p.keywords]
      .join(' ')
      .toLowerCase();
    const tokenMatch = tokens.every((variants) => variants.some((v) => haystack.includes(v)));
    return {
      pattern: p,
      serialScore,
      matched: serialScore > 0 || tokenMatch
    };
  }).filter((item) => item.matched);

  scored.sort((a, b) => b.serialScore - a.serialScore);
  return scored.map((item) => item.pattern);
}

export const App: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<NavFilterMode>('text');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalTargetNote, setGlobalTargetNote] = useState('');
  const [codeFormat, setCodeFormat] = useState<CodeFormat>('html');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchActiveIdx, setSearchActiveIdx] = useState(-1);

  const prefersReducedMotion = usePrefersReducedMotion();
  const validPatternIds = useMemo(() => new Set(ALL_PATTERNS.map((p) => p.id)), []);
  const { favoriteSet, favoriteCount, toggleFavorite } = useFavorites(validPatternIds);

  const mobileMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const deferredQuery = useDeferredValue(trimmedQuery);
  const deferredTargetNote = useDeferredValue(globalTargetNote);

  useEffect(() => {
    if (!searchFocused) return;
    const closeIfOutside = (target: EventTarget | null) => {
      if (searchBoxRef.current && target instanceof Node && !searchBoxRef.current.contains(target)) {
        setSearchFocused(false);
        setSearchActiveIdx(-1);
      }
    };
    const onPointerDown = (e: MouseEvent) => closeIfOutside(e.target);
    const onFocusIn = (e: FocusEvent) => closeIfOutside(e.target);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [searchFocused]);

  const searchSuggestions = useMemo(
    () => (trimmedQuery ? filterAndRankPatterns(trimmedQuery).slice(0, 5) : []),
    [trimmedQuery]
  );

  const visiblePatterns = useMemo(() => {
    if (deferredQuery) {
      return filterAndRankPatterns(deferredQuery);
    }

    if (activeCategory === 'all') {
      return ALL_PATTERNS;
    }

    if (activeCategory === 'favorites') {
      return ALL_PATTERNS.filter((p) => favoriteSet.has(p.id));
    }

    return ALL_PATTERNS.filter((p) => p.category === activeCategory);
  }, [activeCategory, deferredQuery, favoriteSet]);

  const currentCategoryMeta = useMemo(
    () => CATEGORIES.find((c) => c.id === activeCategory),
    [activeCategory]
  );

  const nextCategory = useMemo(() => {
    if (activeCategory === 'all' || activeCategory === 'favorites' || deferredQuery) return null;
    const idx = CATEGORIES.findIndex((c) => c.id === activeCategory);
    if (idx === -1 || idx === CATEGORIES.length - 1) return CATEGORIES[0] ?? null;
    return CATEGORIES[idx + 1] ?? null;
  }, [activeCategory, deferredQuery]);

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of ALL_PATTERNS) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }
    return counts;
  }, []);

  const closeMobileDrawer = useCallback(() => {
    setMobileMenuOpen(false);
    window.requestAnimationFrame(() => {
      mobileMenuTriggerRef.current?.focus();
    });
  }, []);

  // モバイルドロワー展開時はEscapeで閉じ、背景スクロールをロックする
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMobileDrawer();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileMenuOpen, closeMobileDrawer]);

  const selectCategory = useCallback((cat: NavFilterMode) => {
    setActiveCategory(cat);
    setSearchQuery('');
    setMobileMenuOpen(false);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }, []);

  return (
    <div id="top" className="page-dot-grid min-h-screen text-zinc-900">
      {/* トップ固定ヘッダー（シンプル＆検索＋ハンバーガー） */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/90 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <button
              ref={mobileMenuTriggerRef}
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-expanded={mobileMenuOpen}
              aria-label="カテゴリメニューを開く"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 lg:hidden cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>

            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                selectCategory('text');
              }}
              className="flex items-center gap-2.5 text-zinc-900 no-underline"
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
              >
                <rect
                  x="4"
                  y="7"
                  width="14"
                  height="18"
                  rx="3"
                  stroke="#94A3B8"
                  strokeWidth="1.8"
                  strokeDasharray="3 2.5"
                />
                <rect
                  x="13"
                  y="5"
                  width="15"
                  height="20"
                  rx="3.5"
                  fill="#2563EB"
                  fillOpacity="0.12"
                  stroke="#2563EB"
                  strokeWidth="2"
                />
                <path d="M19 12L24 15L19 18V12Z" fill="#2563EB" />
              </svg>
              <div className="leading-tight">
                <span className="block text-sm sm:text-base font-extrabold tracking-tight text-zinc-900 whitespace-nowrap">
                  動きの仕組み図鑑
                </span>
                <span className="hidden sm:block text-[11px] text-zinc-500">
                  KatakataLab Motion Atlas
                </span>
              </div>
            </a>
          </div>

          {/* キーワード検索窓（候補ポップオーバー ＋ キーボード操作対応） */}
          <div ref={searchBoxRef} className="relative flex-1 max-w-[185px] sm:max-w-sm">
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/70 px-2.5 sm:px-3 py-1.5 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/15 transition-all">
              <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <input
                ref={searchInputRef}
                type="search"
                maxLength={MAX_SEARCH_QUERY_LENGTH}
                value={searchQuery}
                role="combobox"
                aria-expanded={searchFocused}
                aria-controls="header-search-popover"
                aria-autocomplete="list"
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  const query = sanitizePlainText(e.target.value, MAX_SEARCH_QUERY_LENGTH);
                  setSearchQuery(query);
                  setSearchFocused(Boolean(query.trim()));
                  setSearchActiveIdx(-1);
                }}
                onKeyDown={(e) => {
                  const itemCount = trimmedQuery
                    ? searchSuggestions.length
                    : POPULAR_SEARCH_CHIPS.length;
                  if (e.key === 'ArrowDown' && itemCount > 0) {
                    e.preventDefault();
                    setSearchFocused(true);
                    setSearchActiveIdx((prev) => (prev + 1) % itemCount);
                  } else if (e.key === 'ArrowUp' && itemCount > 0) {
                    e.preventDefault();
                    setSearchFocused(true);
                    setSearchActiveIdx((prev) => (prev <= 0 ? itemCount - 1 : prev - 1));
                  } else if (e.key === 'Enter' && searchFocused && searchActiveIdx >= 0) {
                    e.preventDefault();
                    if (trimmedQuery) {
                      const chosen = searchSuggestions[searchActiveIdx];
                      if (chosen) {
                        setSearchQuery(formatSerialCode(getPatternSerial(chosen.id)));
                        setSearchFocused(false);
                        setSearchActiveIdx(-1);
                      }
                    } else {
                      const chip = POPULAR_SEARCH_CHIPS[searchActiveIdx];
                      if (chip) {
                        setSearchQuery(chip.query);
                        setSearchFocused(false);
                        setSearchActiveIdx(-1);
                      }
                    }
                  } else if (e.key === 'Escape' && searchFocused) {
                    e.preventDefault();
                    setSearchFocused(false);
                    setSearchActiveIdx(-1);
                  }
                }}
                placeholder="動き・英語・#番号を検索"
                aria-label="アニメーション・通し番号・英語キーワードを検索"
                className="w-full min-w-0 bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="検索をクリア"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchActiveIdx(-1);
                    searchInputRef.current?.focus();
                    setSearchFocused(false);
                  }}
                  className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {searchFocused && (
              <div
                id="header-search-popover"
                role="listbox"
                aria-label={trimmedQuery ? '一致した候補' : 'よく検索されるキーワード'}
                className="absolute top-[calc(100%+3.5rem)] lg:top-full right-0 left-auto sm:left-0 mt-1.5 w-[min(90vw,340px)] sm:w-full rounded-xl border border-zinc-200 bg-white p-2.5 shadow-lg z-50"
              >
                {!trimmedQuery ? (
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold tracking-wide text-zinc-400">
                      よく検索される例（英語検索もOK：hover / modal 等）
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_SEARCH_CHIPS.map((chip, idx) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => {
                            setSearchQuery(chip.query);
                            setSearchFocused(false);
                            setSearchActiveIdx(-1);
                          }}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                            searchActiveIdx === idx
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-blue-300 hover:bg-blue-50/70'
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : searchSuggestions.length > 0 ? (
                  <ul className="space-y-0.5">
                    {searchSuggestions.map((item, idx) => {
                      const code = formatSerialCode(getPatternSerial(item.id));
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery(code);
                              setSearchFocused(false);
                              setSearchActiveIdx(-1);
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                              searchActiveIdx === idx
                                ? 'bg-blue-50 text-blue-800'
                                : 'text-zinc-700 hover:bg-zinc-100'
                            }`}
                          >
                            <span className="shrink-0 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-600">
                              {code}
                            </span>
                            <span className="truncate font-medium">{item.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="px-2 py-1.5 text-[11px] text-zinc-500">
                    「{searchQuery}」に合う候補が見つかりません
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* モバイル・タブレット用 クイックカテゴリ横スクロール（「すべて」最左＋右端グラデーション余韻） */}
        <div className="relative border-t border-zinc-100 bg-white/80 lg:hidden">
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-4 py-2 pr-10">
            <button
              type="button"
              aria-pressed={!trimmedQuery && activeCategory === 'all'}
              onClick={() => selectCategory('all')}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                !trimmedQuery && activeCategory === 'all'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              すべて ({ALL_PATTERNS.length})
            </button>
            <button
              type="button"
              aria-pressed={!trimmedQuery && activeCategory === 'favorites'}
              onClick={() => selectCategory('favorites')}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                !trimmedQuery && activeCategory === 'favorites'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Star className="h-3 w-3 fill-current" />
              <span>お気に入り ({favoriteCount})</span>
            </button>
            {CATEGORIES.map((cat) => {
              const active = !trimmedQuery && activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectCategory(cat.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {cat.code} {cat.shortLabel}
                </button>
              );
            })}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white via-white/85 to-transparent"
          />
        </div>
      </header>

      {/* モバイル用 ハンバーガードロワー */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="カテゴリメニュー">
          <div
            className="absolute inset-0 bg-zinc-900/30 backdrop-blur-[1px]"
            onClick={closeMobileDrawer}
          />
          <aside className="relative z-10 flex h-full w-72 flex-col bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3">
              <span className="text-sm font-bold text-zinc-900">カテゴリを選ぶ</span>
              <button
                type="button"
                onClick={closeMobileDrawer}
                aria-label="メニューを閉じる"
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              <CategoryNavList
                categories={CATEGORIES}
                activeCategory={activeCategory}
                isSearching={Boolean(trimmedQuery)}
                countByCategory={countByCategory}
                totalCount={ALL_PATTERNS.length}
                favoriteCount={favoriteCount}
                variant="drawer"
                onSelect={selectCategory}
              />

              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3">
                <label
                  htmlFor="globalTargetInputDrawer"
                  className="block text-[11px] font-semibold text-zinc-700"
                >
                  AI指示の適用先メモ（任意）
                </label>
                <input
                  id="globalTargetInputDrawer"
                  type="text"
                  maxLength={MAX_TARGET_NOTE_LENGTH}
                  value={globalTargetNote}
                  onChange={(e) =>
                    setGlobalTargetNote(sanitizePlainText(e.target.value, MAX_TARGET_NOTE_LENGTH))
                  }
                  placeholder="例：ポートフォリオの見出し"
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* メインワークスペース（左カテゴリナビ ＋ 右ステージ一覧） */}
      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:py-8">
        {/* デスクトップ左サイドバー */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar space-y-5 pb-4">
            <CategoryNavList
              categories={CATEGORIES}
              activeCategory={activeCategory}
              isSearching={Boolean(trimmedQuery)}
              countByCategory={countByCategory}
              totalCount={ALL_PATTERNS.length}
              favoriteCount={favoriteCount}
              variant="sidebar"
              onSelect={selectCategory}
            />

            {/* 共通のAI適用先メモ（任意） */}
            <div className="rounded-xl border border-zinc-200/80 bg-white/80 p-3">
              <label
                htmlFor="globalTargetInput"
                className="block text-[11px] font-bold text-zinc-700"
              >
                AI指示の適用先メモ（任意）
              </label>
              <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">
                書くと全カードの「AI指示文」に反映されます
              </p>
              <input
                id="globalTargetInput"
                type="text"
                maxLength={MAX_TARGET_NOTE_LENGTH}
                value={globalTargetNote}
                onChange={(e) =>
                  setGlobalTargetNote(sanitizePlainText(e.target.value, MAX_TARGET_NOTE_LENGTH))
                }
                placeholder="例：ポートフォリオの見出し"
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </aside>

        {/* メインカード一覧 */}
        <main className="min-w-0 flex-1 max-w-3xl">
          {/* モバイル・タブレット向けAI指示適用先メモ */}
          <div className="mb-4 rounded-xl border border-zinc-200/80 bg-white/85 px-3 py-2.5 lg:hidden">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <label
                htmlFor="globalTargetInputMobile"
                className="shrink-0 text-[11px] font-semibold text-zinc-700"
              >
                AI指示の適用先メモ（任意）
              </label>
              <input
                id="globalTargetInputMobile"
                type="text"
                maxLength={MAX_TARGET_NOTE_LENGTH}
                value={globalTargetNote}
                onChange={(e) =>
                  setGlobalTargetNote(sanitizePlainText(e.target.value, MAX_TARGET_NOTE_LENGTH))
                }
                placeholder="例：LPのヒーロー見出し、料金ボタン..."
                className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {prefersReducedMotion && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-600"
            >
              OSの「視差効果を減らす」設定が有効なため、自動再生を抑えています（「再生」ボタンで個別に動きを確認できます）。
            </div>
          )}

          <div className="mb-5 flex flex-wrap items-end justify-between gap-2 border-b border-zinc-200/80 pb-3.5">
            {trimmedQuery ? (
              <div>
                <div className="text-xs font-mono text-blue-600">SEARCH RESULT</div>
                <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-zinc-900">
                  「{searchQuery}」の検索結果（{visiblePatterns.length}件）
                </h1>
              </div>
            ) : currentCategoryMeta ? (
              <div>
                <div className="text-xs font-mono text-blue-600">
                  CATEGORY {currentCategoryMeta.code}
                </div>
                <h1 className="mt-0.5 text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900">
                  {currentCategoryMeta.label}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-zinc-500">
                  {currentCategoryMeta.description}
                </p>
              </div>
            ) : activeCategory === 'favorites' ? (
              <div>
                <div className="text-xs font-mono text-amber-600">FAVORITES</div>
                <h1 className="mt-0.5 text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900">
                  お気に入りに保存した表現（{visiblePatterns.length}件）
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-zinc-500">
                  右上の★ボタンで保存したお気に入りをまとめて見比べ・AIコピーできます
                </p>
              </div>
            ) : (
              <div>
                <div className="text-xs font-mono text-blue-600">ALL PATTERNS</div>
                <h1 className="mt-0.5 text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900">
                  すべての動き・UIパターン（{ALL_PATTERNS.length}種類）
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-zinc-500">
                  右上の「再生」・「スロー」・「仕組み」や通し番号（#001〜）で確かめられます
                </p>
              </div>
            )}
          </div>

          {visiblePatterns.length > 0 ? (
            <div className="space-y-5">
              {visiblePatterns.map((pattern) => (
                <MotionCard
                  key={pattern.id}
                  pattern={pattern}
                  serialCode={formatSerialCode(getPatternSerial(pattern.id))}
                  isFavorite={favoriteSet.has(pattern.id)}
                  onToggleFavorite={toggleFavorite}
                  globalTargetNote={deferredTargetNote}
                  prefersReducedMotion={prefersReducedMotion}
                  codeFormat={codeFormat}
                  onChangeCodeFormat={setCodeFormat}
                />
              ))}
            </div>
          ) : activeCategory === 'favorites' && !trimmedQuery ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
              <p className="text-sm font-semibold text-zinc-700">
                お気に入りに保存されたパターンはまだありません
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                気になったカードの右上にある「保存（★）」を押すと、ここにまとめて見返せます
              </p>
              <button
                type="button"
                onClick={() => selectCategory('all')}
                className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer"
              >
                すべてのパターンを見る
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
              <p className="text-sm font-semibold text-zinc-700">
                一致するアニメーション・番号が見つかりませんでした
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                「左から」「ヘッダー」「#014」「038」などの言葉や通し番号でお試しください
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer"
              >
                検索をリセット
              </button>
            </div>
          )}

          {nextCategory && (
            <div className="mt-8 flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-white px-5 py-4">
              <div>
                <div className="text-[11px] font-mono text-zinc-400">NEXT CATEGORY</div>
                <div className="text-sm font-bold text-zinc-900">
                  {nextCategory.code} {nextCategory.label}
                </div>
              </div>
              <button
                type="button"
                onClick={() => selectCategory(nextCategory.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 cursor-pointer"
              >
                <span>次を見る</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200/80 pt-5 text-xs text-zinc-500">
            <span>© 2026 KatakataLab / はじっこぐらし（掲載コードは個人・商用利用・改変・コピペ自由／MIT準拠）</span>
            <span>動きの仕組み図鑑（Motion Atlas）</span>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default App;
