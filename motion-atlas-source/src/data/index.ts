import { TEXT_AND_REVEAL_PATTERNS } from './patternsTextAndReveal';
import { NAV_TABS_SEARCH_PATTERNS } from './patternsNavTabsSearch';
import { MICRO_AND_LAYOUT_PATTERNS } from './patternsMicroAndLayout';
import { HEADER_FOOTER_PATTERNS } from './patternsHeaderFooter';
import { CREATIVE_CRAFT_PATTERNS } from './patternsCreativeCraft';
import { CAROUSEL_PATTERNS } from './patternsCarousel';
import { CONVERSION_UI_PATTERNS } from './patternsConversionUi';
import { HEADER_FOOTER_EXTENDED_PATTERNS } from './patternsHeaderFooterExtended';
import { TEXT_NAV_EXTENDED_PATTERNS } from './patternsTextNavExtended';
import { MONETIZE_GUIDES_EXTENDED_PATTERNS } from './patternsMonetizeGuidesExtended';
import type { MotionPattern } from '../types/motion';

export const ALL_PATTERNS: readonly MotionPattern[] = Object.freeze([
  ...TEXT_AND_REVEAL_PATTERNS,
  ...NAV_TABS_SEARCH_PATTERNS,
  ...MICRO_AND_LAYOUT_PATTERNS,
  ...HEADER_FOOTER_PATTERNS,
  ...CREATIVE_CRAFT_PATTERNS,
  ...CAROUSEL_PATTERNS,
  ...CONVERSION_UI_PATTERNS,
  ...HEADER_FOOTER_EXTENDED_PATTERNS,
  ...TEXT_NAV_EXTENDED_PATTERNS,
  ...MONETIZE_GUIDES_EXTENDED_PATTERNS
]);
