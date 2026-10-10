import { applyReviewedEcology } from './ecology';
import { deepSeaData, type DeepSeaItem } from './data';

export const DEPTH_REVIEWED_AT = '2026-10-03';

export const DEPTH_SOURCE_REFERENCES = Object.freeze({
  clownfish: Object.freeze({
    label: 'Australian Museum / FishBase — Amphiprion ocellaris',
    urls: Object.freeze([
      'https://australian.museum/learn/animals/fishes/western-clown-anemonefish-amphiprion-ocellaris-cuvier-1830/',
      'https://www.fishbase.se/Fieldguide/FieldGuideSummary.php?c_code=036&genusname=Amphiprion&speciesname=ocellaris'
    ])
  })
});

export type DeclaredDepthRange = Readonly<{
  min: number;
  max: number;
}>;

export type DepthCorrection = Readonly<{
  id: string;
  before: number;
  after: number;
  min: number;
  max: number;
}>;

const RANGE_PATTERN = /(\d[\d,]*)\s*m\s*-\s*(\d[\d,]*)\s*m/i;

function parseDepthNumber(value: string): number | null {
  const parsed = Number(value.replaceAll(',', ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseDeclaredDepthRange(value: string): DeclaredDepthRange | null {
  if (typeof value !== 'string') return null;
  const match = RANGE_PATTERN.exec(value);
  if (!match) return null;

  const first = parseDepthNumber(match[1]);
  const second = parseDepthNumber(match[2]);
  if (first === null || second === null) return null;

  return first <= second
    ? Object.freeze({ min: first, max: second })
    : Object.freeze({ min: second, max: first });
}

/**
 * 旧データの数値レンジを扱う純粋な補助関数。生態の検証には使わない。
 * 本番の展示は ecology.ts の資料・昼夜の展示点を正本にする。
 * 夜間・単一値・注釈付きの分布を、この文字列解析で推測しない。
 */
export function normalizeDeclaredDepthPlacements(items: DeepSeaItem[] = deepSeaData): DepthCorrection[] {
  const corrections: DepthCorrection[] = [];
  for (const item of items) {
    const range = parseDeclaredDepthRange(item.depthRange);
    if (!range || typeof item.depth_m !== 'number' || !Number.isFinite(item.depth_m)) continue;

    const clamped = Math.min(range.max, Math.max(range.min, item.depth_m));
    if (clamped === item.depth_m) continue;

    corrections.push(Object.freeze({
      id: item.id,
      before: item.depth_m,
      after: clamped,
      min: range.min,
      max: range.max
    }));
    item.depth_m = clamped;
  }

  return corrections;
}

// 個々の資料と展示点を正本にする。文字列レンジの端へ一律に詰めない。
applyReviewedEcology(deepSeaData);
export const APPLIED_DEPTH_CORRECTIONS = Object.freeze([] as DepthCorrection[]);

