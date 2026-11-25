import { useCallback, useEffect, useMemo, useState } from 'react';

const FAVORITES_STORAGE_KEY = 'katakata_motion_favorites_v1';

function readSafeFavorites(validIds: ReadonlySet<string>): string[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const deduped: string[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (typeof item === 'string' && validIds.has(item) && !seen.has(item)) {
        seen.add(item);
        deduped.push(item);
      }
    }
    return deduped;
  } catch {
    return [];
  }
}

export function useFavorites(validIds: ReadonlySet<string>) {
  const [favoriteList, setFavoriteList] = useState<string[]>(() => readSafeFavorites(validIds));

  useEffect(() => {
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteList));
    } catch {
      // プライベートブラウザ等で書き込み制限がある場合はインメモリ状態のみ継続する
    }
  }, [favoriteList]);

  const favoriteSet = useMemo(() => new Set(favoriteList), [favoriteList]);

  const toggleFavorite = useCallback(
    (id: string) => {
      if (!validIds.has(id)) return;
      setFavoriteList((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    },
    [validIds]
  );

  const clearFavorites = useCallback(() => {
    setFavoriteList([]);
  }, []);

  return {
    favoriteSet,
    favoriteCount: favoriteList.length,
    toggleFavorite,
    clearFavorites
  };
}
