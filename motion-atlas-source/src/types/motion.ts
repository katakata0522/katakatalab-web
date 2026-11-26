export type CategoryId =
  | 'text'
  | 'reveal'
  | 'nav'
  | 'tabs'
  | 'search'
  | 'micro'
  | 'layout'
  | 'header'
  | 'footer'
  | 'craft'
  | 'carousel'
  | 'pricing'
  | 'forms'
  | 'guides';

export type EasingPresetId = 'smooth' | 'snappy' | 'spring';

export interface EasingOption {
  id: EasingPresetId;
  label: string;
  css: string;
  description: string;
}

export interface PatternControls {
  duration: number;
  distance: number;
  easing: EasingPresetId;
}

export interface SecondarySliderMeta {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface MechanismStep {
  title: string;
  detail: string;
  codeHint?: string;
}

export interface MotionPattern {
  id: string;
  category: CategoryId;
  title: string;
  subtitle: string;
  mechanismTag: string;
  xRayCaption: string;
  interactiveHint?: string;
  defaultDuration: number;
  durationRange: {
    min: number;
    max: number;
    step: number;
  };
  secondarySlider?: SecondarySliderMeta;
  defaultEasing: EasingPresetId;
  hasEasingControl?: boolean;
  hasPlayback?: boolean;
  hasViewportToggle?: boolean;
  steps: MechanismStep[];
  keywords: string[];
  buildPrompt: (params: PatternControls, targetNote: string) => string;
  buildCode: (params: PatternControls) => string;
}

export interface CategoryMeta {
  id: CategoryId;
  code: string;
  label: string;
  shortLabel: string;
  description: string;
}
