import { describe, expect, it } from 'vitest';
import { deepSeaData } from './data';
import './content-evolution';
import './depth-consistency';
import { ECOLOGY, applyReviewedEcology } from './ecology';

const living = deepSeaData.flatMap(item => item.type === 'battle' ? item.participants || [] : item.type === 'creature' ? [item] : []);
describe('資料に基づく生態と展示の契約', () => {
  it('現行の全生物に種・群・資料・生活場所を持つ', () => {
    expect(living.length).toBeGreaterThan(20);
    expect(living.map(item => item.id).sort()).toEqual(Object.keys(ECOLOGY).sort());
    for (const item of living) {
      const record = ECOLOGY[item.id];
      expect(record.taxon).toBeTruthy();
      expect(record.habitat).toBeTruthy();
      expect(record.evidence).toBeTruthy();
      expect(record.sources.length).toBeGreaterThan(0);
      for (const [,url] of record.sources) expect(url).toMatch(/^https:\/\//);
      expect(item.depth_m).toBeGreaterThanOrEqual(record.bounds[0]);
      expect(item.depth_m).toBeLessThanOrEqual(record.bounds[1]);
      if (item.nightDepth_m !== undefined) {
        expect(item.nightDepth_m).toBeGreaterThanOrEqual(record.bounds[0]);
        expect(item.nightDepth_m).toBeLessThanOrEqual(record.bounds[1]);
      }
    }
  });
  it('確認した移動例だけを昼夜で変え、未確認の蛍光を付けない', () => {
    expect(living.filter(item => item.nightDepth_m !== undefined).map(item => item.id).sort()).toEqual(['cookiecutter_shark','viperfish']);
    expect(living.filter(item => item.fluorescent)).toEqual([]);
    expect(living.find(item => item.id === 'barreleye')?.depth_m).toBe(700);
  });
  it('海底に付着・歩行する生物を浮遊アニメーションにしない', () => {
    for (const item of living) {
      if (['海底','熱水域の海底'].includes(ECOLOGY[item.id].habitat)) expect(item.anim_class).toBe('');
    }
  });
  it('遭遇場面は両方の資料が支える同じ深度を使う', () => {
    const battle = deepSeaData.find(item => item.type === 'battle')!;
    expect(battle.depth_m).toBe(ECOLOGY.whale.depth);
    for (const participant of battle.participants!) expect(participant.depth_m).toBe(battle.depth_m);
  });
  it('原画・発見条件・10,000mのゴールを増減せず再適用できる', () => {
    const before = JSON.stringify(deepSeaData);
    applyReviewedEcology(deepSeaData);
    expect(JSON.stringify(deepSeaData)).toBe(before);
    expect(deepSeaData.find(item => item.id === 'vent')?.depth_m).toBe(10000);
    expect(deepSeaData.some(item => item.id === 'golden_oarfish')).toBe(false);
  });
});
