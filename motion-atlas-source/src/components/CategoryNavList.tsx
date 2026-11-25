import React from 'react';
import { ArrowLeft, Layers, Star } from 'lucide-react';
import type { CategoryId, CategoryMeta } from '../types/motion';

export type NavFilterMode = CategoryId | 'all' | 'favorites';

interface CategoryNavListProps {
  categories: readonly CategoryMeta[];
  activeCategory: NavFilterMode;
  isSearching: boolean;
  countByCategory: Record<string, number>;
  totalCount: number;
  favoriteCount: number;
  variant: 'sidebar' | 'drawer';
  onSelect: (category: NavFilterMode) => void;
}

export const CategoryNavList: React.FC<CategoryNavListProps> = ({
  categories,
  activeCategory,
  isSearching,
  countByCategory,
  totalCount,
  favoriteCount,
  variant,
  onSelect
}) => {
  const isSidebar = variant === 'sidebar';

  return (
    <nav aria-label="アニメーションカテゴリ" className={isSidebar ? 'space-y-0.5' : 'space-y-1'}>
      {isSidebar && (
        <div className="px-2.5 pb-1 text-[11px] font-bold tracking-wider text-zinc-400">
          カテゴリで選ぶ
        </div>
      )}

      {/* お気に入り（上部に固定配置してアクセスしやすくする） */}
      <div className={isSidebar ? 'pb-1.5' : 'pb-1'}>
        <button
          type="button"
          aria-current={!isSearching && activeCategory === 'favorites' ? 'page' : undefined}
          onClick={() => onSelect('favorites')}
          className={`flex w-full items-center justify-between rounded-xl px-3 text-left font-semibold transition-colors cursor-pointer ${
            isSidebar ? 'py-1.5 text-[13px]' : 'py-2.5 text-xs'
          } ${
            !isSearching && activeCategory === 'favorites'
              ? isSidebar
                ? 'bg-amber-50 text-amber-800 shadow-2xs border border-amber-200'
                : 'bg-amber-50 text-amber-800'
              : isSidebar
                ? 'text-zinc-700 hover:bg-amber-50/50 hover:text-amber-900 border border-transparent'
                : 'text-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Star
              className={`h-3.5 w-3.5 ${
                favoriteCount > 0 ? 'fill-amber-400 text-amber-500' : 'text-amber-500/80'
              }`}
            />
            お気に入り
          </span>
          <span
            className={`font-mono text-[10px] ${
              isSidebar
                ? 'text-zinc-500'
                : 'rounded-full bg-white px-2 py-0.5 text-zinc-500 border border-zinc-200'
            }`}
          >
            {favoriteCount}
          </span>
        </button>
      </div>

      {categories.map((cat) => {
        const active = !isSearching && activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect(cat.id)}
            className={`flex w-full items-center justify-between rounded-xl px-3 text-left font-semibold transition-colors cursor-pointer ${
              isSidebar ? 'py-1.5 text-[12.5px]' : 'py-2 text-xs'
            } ${
              active
                ? isSidebar
                  ? 'bg-white text-blue-700 shadow-2xs border border-zinc-200/90'
                  : 'bg-blue-50 text-blue-700'
                : isSidebar
                  ? 'text-zinc-600 hover:bg-white/70 hover:text-zinc-900 border border-transparent'
                  : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <span className="truncate">
              <span
                className={`mr-1.5 font-mono text-[11px] ${
                  active ? 'text-blue-500' : isSidebar ? 'text-zinc-400' : 'opacity-60'
                }`}
              >
                {cat.code}
              </span>
              {cat.label}
            </span>
            <span
              className={`ml-2 rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                isSidebar
                  ? active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-zinc-400'
                  : 'bg-white px-2 text-zinc-500 border border-zinc-200'
              }`}
            >
              {countByCategory[cat.id] ?? 0}
            </span>
          </button>
        );
      })}

      <div className={isSidebar ? 'pt-1.5' : 'pt-1'}>
        <button
          type="button"
          aria-current={!isSearching && activeCategory === 'all' ? 'page' : undefined}
          onClick={() => onSelect('all')}
          className={`flex w-full items-center justify-between rounded-xl px-3 text-left font-semibold transition-colors cursor-pointer ${
            isSidebar ? 'py-1.5 text-[12.5px]' : 'py-2.5 text-xs'
          } ${
            !isSearching && activeCategory === 'all'
              ? isSidebar
                ? 'bg-white text-blue-700 shadow-2xs border border-zinc-200/90'
                : 'bg-blue-50 text-blue-700'
              : isSidebar
                ? 'text-zinc-500 hover:bg-white/70 hover:text-zinc-900 border border-transparent'
                : 'text-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            {isSidebar ? 'すべて表示' : 'すべて一覧で見る'}
          </span>
          <span
            className={`font-mono text-[10px] ${
              isSidebar
                ? 'text-zinc-400'
                : 'rounded-full bg-white px-2 py-0.5 text-zinc-500 border border-zinc-200'
            }`}
          >
            {totalCount}
          </span>
        </button>
      </div>

      {/* 親ポータル（KatakataLab）への戻り導線 */}
      <div className="mt-1.5 border-t border-zinc-200/80 pt-2">
        <a
          href="../"
          className={`flex w-full items-center justify-between rounded-xl px-3 text-left font-semibold no-underline transition-colors ${
            isSidebar
              ? 'py-1.5 text-[12.5px] text-zinc-600 hover:bg-white/70 hover:text-zinc-900 border border-transparent'
              : 'py-2.5 text-xs text-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5 text-zinc-400" />
            KatakataLabへ
          </span>
        </a>
      </div>
    </nav>
  );
};
