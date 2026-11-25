import type { CategoryId } from '../types/motion';

export const POPULAR_SEARCH_CHIPS: readonly { label: string; query: string }[] = Object.freeze([
  { label: '#001 下から出現', query: '#001' },
  { label: '#014 検索モーダル', query: '#014' },
  { label: '#038 カード裏返し', query: '#038' },
  { label: '#046 料金トグル', query: '#046' },
  { label: '#054 ヘッダー', query: 'ヘッダー' },
  { label: 'ボタン', query: 'ボタン' },
  { label: 'カルーセル', query: 'カルーセル' },
  { label: 'フォーム', query: 'フォーム' }
]);

const SYNONYM_PAIRS: readonly (readonly [string, string])[] = [
  ['hover', 'ホバー'],
  ['header', 'ヘッダー'],
  ['footer', 'フッター'],
  ['button', 'ボタン'],
  ['modal', 'モーダル'],
  ['drawer', 'ドロワー'],
  ['search', '検索'],
  ['accordion', 'アコーディオン'],
  ['carousel', 'カルーセル'],
  ['slider', 'スライダー'],
  ['pricing', '料金'],
  ['price', '料金'],
  ['tab', 'タブ'],
  ['scroll', 'スクロール'],
  ['skeleton', 'スケルトン'],
  ['tooltip', 'ツールチップ'],
  ['card', 'カード'],
  ['form', 'フォーム'],
  ['flip', '裏返し'],
  ['typewriter', 'タイプライター'],
  ['toast', 'トースト'],
  ['fade', 'フェード'],
  ['menu', 'メニュー'],
  ['sticky', '追従'],
  ['top', '戻る'],
  ['btt', '戻る'],
  ['confirm', '確認'],
  ['badge', 'バッジ'],
  ['blur', 'ぼかし'],
  ['loading', '待機'],
  ['filter', '絞り込み'],
  ['drop', 'ドロップ'],
  ['password', 'パスワード'],
  ['error', 'エラー'],
  ['empty', '空状態']
];

/**
 * 検索語の英日表記揺れ・空白を正規化し、複数単語でのAND検索語リストを返す。
 */
export function expandSearchTokens(rawQuery: string): string[][] {
  const normalized = rawQuery.trim().toLowerCase();
  if (!normalized) return [];

  const tokens = normalized.split(/\s+/).filter(Boolean);
  return tokens.map((token) => {
    const variants = new Set<string>([token]);
    for (const [en, ja] of SYNONYM_PAIRS) {
      if (token.includes(en)) {
        variants.add(ja);
      }
      if (token.includes(ja)) {
        variants.add(en);
      }
    }
    return [...variants];
  });
}

export type StageSurfaceKind = 'lab-grid' | 'browser-chrome' | 'ui-sheet' | 'gallery-matte';

export interface StageFrameMeta {
  kind: StageSurfaceKind;
  containerClass: string;
  chromeLabel?: string;
}

/**
 * カテゴリごとの役割に合わせてステージ舞台背景を上品に差別化する。
 */
export function getStageFrameMeta(category: CategoryId): StageFrameMeta {
  switch (category) {
    case 'header':
      return {
        kind: 'browser-chrome',
        containerClass: 'bg-zinc-50/75 border-zinc-200',
        chromeLabel: 'ブラウザ上端プレビュー'
      };
    case 'footer':
      return {
        kind: 'browser-chrome',
        containerClass: 'bg-zinc-50/75 border-zinc-200',
        chromeLabel: 'ページ末尾プレビュー'
      };
    case 'pricing':
    case 'forms':
    case 'guides':
      return {
        kind: 'ui-sheet',
        containerClass: 'bg-[#F9F8F4] border-zinc-200/90'
      };
    case 'carousel':
    case 'craft':
      return {
        kind: 'gallery-matte',
        containerClass: 'bg-zinc-50/90 border-zinc-200/90'
      };
    default:
      return {
        kind: 'lab-grid',
        containerClass: 'stage-dot-grid border-zinc-200'
      };
  }
}
