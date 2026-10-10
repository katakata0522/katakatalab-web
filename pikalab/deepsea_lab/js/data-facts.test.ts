import { describe, expect, it } from 'vitest';
import { deepSeaData } from './data';
import './content-evolution';
import './depth-consistency';

describe('Deepsea Lab 生物の体の説明（2026-10-02確認）', () => {
  it('クリオネは殻がない巻貝で、消化器官がないとは説明しない', () => {
    const clione = deepSeaData.find((item) => item.id === 'clione');
    expect(clione?.description).toMatch(/殻のない巻貝/);
    expect(clione?.description).not.toMatch(/おなかのない|内臓のない|消化器官のない/);
  });

  it('ナガヅエエソが海底に立つヒレと獲物を感じるヒレを区別する', () => {
    const tripod = deepSeaData.find((item) => item.id === 'tripod');
    expect(tripod?.description).toMatch(/腹ビレと尾ビレ/);
    expect(tripod?.description).not.toMatch(/胸ビレと尾ビレ/);
    expect(tripod?.fact).toMatch(/胸ビレ.*獲物を感知/);
  });

  it('しんかい6500を最大潜航深度より深い実深度軸に配置しない', () => {
    const shinkai = deepSeaData.find((item) => item.id === 'shinkai6500');
    expect(shinkai?.depth_m).toBeLessThanOrEqual(6500);
    expect(shinkai?.description).toMatch(/6,500mまで/);
  });

  it('キワ・ヒルスタの細菌を食べる仮説を別種の実証と混同しない', () => {
    const yeti = deepSeaData.find((item) => item.id === 'yeti_crab');
    expect(yeti?.title).toContain('キワ・ヒルスタ');
    expect(yeti?.fact).toMatch(/エサにしているのではないかと考えられています/);
    expect(yeti?.fact).not.toMatch(/エサにしています|農業.*しているのです/);
  });

  it('ダンボオクトパスを日本のメンダコ一種と同一視しない', () => {
    const dumbo = deepSeaData.find((item) => item.id === 'dumbo');
    expect(dumbo?.title).not.toContain('メンダコ');
    expect(dumbo?.title).toContain('ダンボオクトパス');
    expect(dumbo?.englishName).toBe('Dumbo Octopus');
  });
});

describe('追加の説明・クイズ整合性', () => {
  const item = (id: string) => deepSeaData.find(entry => entry.id === id)!;
  it('クマノミは幼魚と繁殖オスの性転換を混同しない', () => {
    expect(item('clownfish').fact).not.toMatch(/生まれたときはみんなオス/);
    const quiz = item('clownfish').quiz!;
    expect(quiz.options[quiz.answerIndex]).toMatch(/オスからメス/);
  });
  it('シーラカンスの正解を肉厚なヒレの構造として尋ねる', () => {
    const quiz = item('coelacanth').quiz!;
    expect(quiz.question).toMatch(/肉厚/);
    expect(quiz.question).not.toMatch(/普通の魚とちがって/);
    expect(quiz.options[quiz.answerIndex]).toBe('筋肉と骨');
  });
  it('スケーリーフットの鉄を含まない白い個体も説明する', () => {
    expect(item('scaly_foot_snail').fact).toMatch(/鉄を含まない白い個体/);
    expect(item('scaly_foot_snail').description).toMatch(/硫化鉄/);
  });
  it('深さだけで沈没船の保存を保証せず、口を全身より長いと誇張しない', () => {
    expect(item('shipwreck').description).toMatch(/微生物.*分解は進みます/);
    expect(item('shipwreck').description).not.toMatch(/格段に遅く/);
    expect(item('pelican_eel').description).not.toMatch(/体長よりもはるかに大きい/);
  });
  it('イルカの探知と会話、皮膚表面と全体を区別する', () => {
    expect(item('dolphin').description).toMatch(/クリック音.*反響/);
    expect(item('dolphin').description).toMatch(/ホイッスル/);
    expect(item('dolphin').macroFact).toMatch(/いちばん外側の層/);
  });
});

