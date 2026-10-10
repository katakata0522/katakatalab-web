import './content-evolution';
import { describe, expect, it } from 'vitest';
import { deepSeaData } from './data';
import {
  APPLIED_DEPTH_CORRECTIONS,
  DEPTH_REVIEWED_AT,
  DEPTH_SOURCE_REFERENCES,
  normalizeDeclaredDepthPlacements,
  parseDeclaredDepthRange
} from './depth-consistency';

describe('Deepsea Lab depth consistency', () => {
  it('宣言レンジを安全に解析する', () => {
    expect(parseDeclaredDepthRange('0m - 50m')).toEqual({ min: 0, max: 50 });
    expect(parseDeclaredDepthRange('2,400m - 2,800m')).toEqual({ min: 2400, max: 2800 });
    expect(parseDeclaredDepthRange('1000m')).toBeNull();
    expect(parseDeclaredDepthRange('10,000m (Challenger Deep)')).toBeNull();
  });

  it('カクレクマノミは監査済みの1–15mレンジを使う', () => {
    const clownfish = deepSeaData.find((item) => item.id === 'clownfish');
    expect(clownfish).toBeDefined();
    expect(clownfish?.depthRange).toContain('1m - 15m');
    expect(clownfish?.depth_m).toBeGreaterThanOrEqual(1);
    expect(clownfish?.depth_m).toBeLessThanOrEqual(15);
    expect(DEPTH_REVIEWED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(DEPTH_SOURCE_REFERENCES.clownfish.urls.length).toBeGreaterThanOrEqual(2);
  });

  it('通常表示のdepth_mは自身の宣言レンジ内に収まる', () => {
    for (const item of deepSeaData) {
      const range = parseDeclaredDepthRange(item.depthRange);
      if (!range || typeof item.depth_m !== 'number') continue;

      expect(item.depth_m, `${item.id}: ${item.depthRange}`).toBeGreaterThanOrEqual(range.min);
      expect(item.depth_m, `${item.id}: ${item.depthRange}`).toBeLessThanOrEqual(range.max);
    }
  });

  it('nightDepth_mは資料で支持された地域の展示例を使う', () => {
    const viperfish = deepSeaData.find((item) => item.id === 'viperfish');
    expect(viperfish?.nightDepth_m).toBe(650);
  });

  it('正規化は冪等で、2回目には追加修正を発生させない', () => {
    expect(APPLIED_DEPTH_CORRECTIONS).toEqual([]);
    expect(normalizeDeclaredDepthPlacements(deepSeaData)).toEqual([]);
  });
});

