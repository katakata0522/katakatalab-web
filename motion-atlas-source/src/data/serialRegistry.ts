/**
 * 各パターンに割り当てる不変の通し番号レジストリ（#001 〜 #100）。
 * 後からカテゴリの整理や並べ替えを行っても既存コンテンツの番号がズレないようにする。
 */
const CANONICAL_SERIAL_IDS: readonly string[] = Object.freeze([
  // #001 - #009: 文字の動き & 箱・カードの出現（初期収録）
  'text-mask-slide-up',
  'text-sweep-left-to-right',
  'text-stagger-chars',
  'text-typewriter',
  'text-marker-highlight',
  'reveal-fade-lift',
  'reveal-curtain-block',
  'reveal-stagger-grid',
  'reveal-3d-flip',

  // #010 - #021: ハンバーガー・タブ・検索UI（初期収録）
  'nav-slide-drawer',
  'nav-fullscreen-curtain',
  'nav-top-accordion',
  'nav-bottom-sheet',
  'tabs-sliding-underline',
  'tabs-floating-pill',
  'tabs-content-slide',
  'tabs-smooth-accordion',
  'search-icon-expand',
  'search-inline-bar',
  'search-backdrop-typography',
  'search-command-modal',

  // #022 - #030: ボタン反応 & 立て付け（初期収録）
  'micro-tactile-press',
  'micro-click-ripple',
  'micro-underline-sweep',
  'micro-magnetic-button',
  'layout-sticky-split',
  'layout-shrinking-header',
  'layout-bento-grid',
  'layout-marquee-loop',
  'layout-skeleton-toast',

  // #031 - #037: ヘッダー・フッター基本（第1弾拡張）
  'hf-classic-header',
  'hf-centered-brand',
  'hf-floating-pill',
  'hf-mega-menu',
  'hf-sitemap-footer',
  'hf-minimal-footer',
  'hf-curtain-reveal-footer',

  // #038 - #042: 独創仕掛け（第1弾拡張）
  'craft-flip-card',
  'craft-before-after',
  'craft-tilt-shine',
  'craft-number-counter',
  'craft-scrollspy-toc',

  // #043 - #047: カルーセル・ギャラリー（第2弾拡張）
  'carousel-scroll-snap',
  'carousel-peek-slider',
  'carousel-thumb-sync',
  'carousel-lightbox',
  'carousel-stack-deck',

  // #048 - #053: 料金・フォーム・案内基本（第2弾拡張）
  'conv-pricing-static',
  'conv-billing-toggle',
  'conv-submit-feedback',
  'conv-floating-label',
  'conv-read-more',
  'conv-back-to-top',

  // #054 - #059: ヘッダー細分化（リンク表現4種・2段・透過・サイドレール）
  'hdr-link-hover-grow',
  'hdr-link-underline',
  'hdr-link-pill-active',
  'hdr-announcement-two-tier',
  'hdr-transparent-to-solid',
  'hdr-rail-sidebar',

  // #060 - #063: フッター細分化（CTA一体・巨大文字・ニュースレター・ユーティリティ）
  'ftr-cta-docked',
  'ftr-giant-wordmark',
  'ftr-newsletter-form',
  'ftr-compact-utility',

  // #064 - #068: 文字の動き 派生（間隔詰め・スクロール着色・回転単語・円形文字・枠線塗り）
  'text-tracking-compress',
  'text-scroll-fill',
  'text-word-slot',
  'text-circular-badge',
  'text-outline-fill',

  // #069 - #072: 箱・カード 派生（額縁ズーム・解説オーバーレイ・ぼかし解除・段違い配置）
  'reveal-frame-zoom',
  'reveal-caption-overlay',
  'reveal-blur-focus',
  'reveal-staggered-offset',

  // #073 - #079: ナビ・タブ・検索 派生（三本線4態・時間差ドロワー・ボトムタブバー・絞り込みチップ・縦タブ・補完候補・人気タグ）
  'nav-icon-morph-variants',
  'nav-stagger-drawer',
  'nav-app-tab-bar',
  'tabs-filter-chips',
  'tabs-vertical-settings',
  'search-autocomplete',
  'search-popular-chips',

  // #080 - #085: ボタン・反応 派生（3D立体・シマー・矢印誘導・コピー状態変化・長押し確定・お気に入り弾け）
  'micro-button-3d',
  'micro-button-shimmer',
  'micro-button-arrow',
  'micro-button-copy',
  'micro-button-hold',
  'micro-heart-pop',

  // #086 - #088: 料金・比較 派生（○×比較固定表・利用量スライダー計算・安心マイクロコピー）
  'price-matrix-table',
  'price-usage-estimator',
  'price-trust-assurance',

  // #089 - #092: フォーム・フィードバック 派生（シェイク検証・パスワード強度・マルチステップ・ドロップゾーン）
  'form-validation-shake',
  'form-password-strength',
  'form-step-progress',
  'form-file-dropzone',

  // #093 - #100: 案内・戻る・状態ページ（矢印のみ・進捗リング↑・静的末尾戻る・閉じられる上帯・ツールチップ・空状態・ページ送り・2段階誤操作確認）
  'guide-btt-minimal-arrow',
  'guide-btt-progress-ring',
  'guide-btt-static-footer',
  'guide-dismissible-banner',
  'guide-tooltip-popover',
  'guide-empty-state',
  'guide-pagination-vs-more',
  'guide-inline-confirm'
]);

const serialMapObj: Record<string, number> = Object.create(null);
CANONICAL_SERIAL_IDS.forEach((id, idx) => {
  serialMapObj[id] = idx + 1;
});

export const PATTERN_SERIAL_MAP: Readonly<Record<string, number>> = Object.freeze(serialMapObj);

export function getPatternSerial(patternId: string): number {
  return Object.prototype.hasOwnProperty.call(PATTERN_SERIAL_MAP, patternId)
    ? (PATTERN_SERIAL_MAP[patternId] ?? 0)
    : 0;
}

export function formatSerialCode(serial: number): string {
  if (!Number.isFinite(serial) || serial <= 0) return '#---';
  return `#${String(Math.floor(serial)).padStart(3, '0')}`;
}

/**
 * 検索クエリ（`#014`, `014`, `14` 等）が通し番号に一致するかをスコア付きで判定する。
 * @returns 2 = 厳密一致, 1 = 前方一致, 0 = 不一致
 */
export function matchSerialScore(serial: number, rawQuery: string): 0 | 1 | 2 {
  if (!Number.isFinite(serial) || serial <= 0) return 0;
  const trimmed = rawQuery.trim();
  const m = trimmed.match(/^#?(\d{1,3})$/);
  if (!m) return 0;

  const digits = m[1] ?? '';
  const hasHash = trimmed.startsWith('#');
  const numVal = Number(digits);
  const padded = String(serial).padStart(3, '0');

  if (digits.length === 3) {
    return padded === digits ? 2 : 0;
  }
  if (serial === numVal) {
    return 2;
  }
  if (hasHash || digits.startsWith('0')) {
    return padded.startsWith(digits) ? 1 : 0;
  }
  return 0;
}
