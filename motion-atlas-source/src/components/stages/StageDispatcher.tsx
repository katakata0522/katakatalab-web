import React, { Suspense } from 'react';
import type { StageRendererProps } from './StageTextAndReveal';

const StageTextAndReveal = React.lazy(() =>
  import('./StageTextAndReveal').then((m) => ({ default: m.StageTextAndReveal }))
);
const StageNavAndTabs = React.lazy(() =>
  import('./StageNavAndTabs').then((m) => ({ default: m.StageNavAndTabs }))
);
const StageSearchMicroLayout = React.lazy(() =>
  import('./StageSearchMicroLayout').then((m) => ({ default: m.StageSearchMicroLayout }))
);
const StageHeaderFooter = React.lazy(() =>
  import('./StageHeaderFooter').then((m) => ({ default: m.StageHeaderFooter }))
);
const StageHeaderFooterExtended = React.lazy(() =>
  import('./StageHeaderFooterExtended').then((m) => ({ default: m.StageHeaderFooterExtended }))
);
const StageTextNavExtended = React.lazy(() =>
  import('./StageTextNavExtended').then((m) => ({ default: m.StageTextNavExtended }))
);
const StageMonetizeGuidesExtended = React.lazy(() =>
  import('./StageMonetizeGuidesExtended').then((m) => ({ default: m.StageMonetizeGuidesExtended }))
);
const StageCreativeCraft = React.lazy(() =>
  import('./StageCreativeCraft').then((m) => ({ default: m.StageCreativeCraft }))
);
const StageCarousel = React.lazy(() =>
  import('./StageCarousel').then((m) => ({ default: m.StageCarousel }))
);
const StageConversionUi = React.lazy(() =>
  import('./StageConversionUi').then((m) => ({ default: m.StageConversionUi }))
);

const EXTENDED_TEXT_NAV_IDS: ReadonlySet<string> = new Set([
  'text-tracking-compress',
  'text-scroll-fill',
  'text-word-slot',
  'text-circular-badge',
  'text-outline-fill',
  'reveal-frame-zoom',
  'reveal-caption-overlay',
  'reveal-blur-focus',
  'reveal-staggered-offset',
  'nav-icon-morph-variants',
  'nav-stagger-drawer',
  'nav-app-tab-bar',
  'tabs-filter-chips',
  'tabs-vertical-settings',
  'search-autocomplete',
  'search-popular-chips',
  'micro-button-3d',
  'micro-button-shimmer',
  'micro-button-arrow',
  'micro-button-copy',
  'micro-button-hold',
  'micro-heart-pop'
]);

function renderStageNode(props: StageRendererProps): React.ReactNode {
  const { patternId } = props;

  if (EXTENDED_TEXT_NAV_IDS.has(patternId)) {
    return <StageTextNavExtended {...props} />;
  }

  if (patternId.startsWith('hdr-') || patternId.startsWith('ftr-')) {
    return <StageHeaderFooterExtended {...props} />;
  }

  if (
    patternId.startsWith('price-') ||
    patternId.startsWith('form-') ||
    patternId.startsWith('guide-')
  ) {
    return <StageMonetizeGuidesExtended {...props} />;
  }

  if (patternId.startsWith('text-') || patternId.startsWith('reveal-')) {
    return <StageTextAndReveal {...props} />;
  }

  if (patternId.startsWith('nav-') || patternId.startsWith('tabs-')) {
    return <StageNavAndTabs {...props} />;
  }

  if (patternId.startsWith('hf-')) {
    return <StageHeaderFooter {...props} />;
  }

  if (patternId.startsWith('craft-')) {
    return <StageCreativeCraft {...props} />;
  }

  if (patternId.startsWith('carousel-')) {
    return <StageCarousel {...props} />;
  }

  if (patternId.startsWith('conv-')) {
    return <StageConversionUi {...props} />;
  }

  return <StageSearchMicroLayout {...props} />;
}

export const StageDispatcher: React.FC<StageRendererProps> = (props) => (
  <Suspense
    fallback={
      <div className="flex min-h-[120px] items-center justify-center text-xs text-zinc-400">
        プレビューを読み込み中...
      </div>
    }
  >
    {renderStageNode(props)}
  </Suspense>
);
