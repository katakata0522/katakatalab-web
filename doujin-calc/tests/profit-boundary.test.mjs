import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DoujinCalculator as calculator } from '../js/calculator.js';
import { UIRenderer } from '../js/renderer.js';

const costs = (totalCost, saleCopies, cashlessFactor = 1) => ({
  totalCost, N_sale: saleCopies, N: saleCopies, N_non_sale: 0, baseNonSale: 0,
  anthoMembers: 0, manufacturingCost: totalCost, fixedTotal: 0,
  unitCost: saleCopies ? totalCost / saleCopies : 0, cashlessFactor
});

test('費用と売上が一致する部数は損益分岐で、黒字はその次', () => {
  const base = costs(44500, 100);
  const plan = calculator.calculatePlan(500, base);
  assert.equal(plan.breakevenCopies, 89);
  assert.equal(plan.profitCopies, 90);
  assert.equal(calculator.calculateSoldMetrics(500, base, 89).currentProfit, 0);
  assert.equal(calculator.calculateSoldMetrics(500, base, 90).currentProfit, 500);
  assert.equal(UIRenderer.prototype.formatProfitThreshold(plan), '90部');
});

test('完売で収支がゼロでも、黒字には届かない', () => {
  const base = costs(44500, 89);
  const plan = calculator.calculatePlan(500, base);
  assert.equal(plan.breakevenReachable, true);
  assert.equal(plan.profitReachable, false);
  assert.equal(UIRenderer.prototype.formatProfitThreshold(plan), '90部必要');
  const memo = calculator.generateMenuMemo({}, base, plan, {
    modeName: '標準', bills1000Count: 0, coins500Count: 0, coins100Count: 0,
    coins50Count: 0, coins10Count: 0, totalAmount: 0
  });
  assert.match(memo, /黒字化ライン: 90部必要（販売枠89部では届きません）/);
  assert.match(calculator.generateAnthologyReport({}, base, plan), /主催者収支目安: 収支±0円/);
});

test('割り切れない場合は、最初に費用を超える部数を示す', () => {
  const plan = calculator.calculatePlan(800, costs(44500, 98));
  assert.equal(plan.breakevenCopies, 56);
  assert.equal(plan.profitCopies, 56);
  assert.equal(plan.profitReachable, true);
});

test('キャッシュレスの端数は売上表示と同じ円単位の丸めで判定する', () => {
  const base = costs(60, 100, 0.9675);
  const plan = calculator.calculatePlan(1, base);
  assert.equal(calculator.calculateSoldMetrics(1, base, 62).currentProfit, 0);
  assert.equal(calculator.calculateSoldMetrics(1, base, 63).currentProfit, 1);
  assert.equal(plan.breakevenCopies, 62);
  assert.equal(plan.profitCopies, 63);
});

test('価格ゼロ、費用ゼロ、販売可能数ゼロを区別する', () => {
  const noPrice = calculator.calculatePlan(0, costs(1000, 10));
  assert.equal(UIRenderer.prototype.formatProfitThreshold(noPrice), '黒字化しない');
  const freeCosts = calculator.calculatePlan(500, costs(0, 10));
  assert.equal(freeCosts.breakevenCopies, 0);
  assert.equal(freeCosts.profitCopies, 1);
  assert.equal(freeCosts.profitReachable, true);
  assert.equal(calculator.calculatePlan(500, costs(0, 0)).profitReachable, false);
});

test('1円単位の価格は5円玉・1円玉も釣銭と両替メモに含める', () => {
  assert.match(calculator.formatPaymentChange(899), /100円玉×1、1円玉×1/);
  assert.match(calculator.formatPaymentChange(895), /100円玉×1、5円玉×1/);
  const yen1 = calculator.calculateChange(899, 100, 'standard');
  assert.equal(yen1.coins100Count, 40);
  assert.equal(yen1.coins1Count, 40);
  assert.equal(yen1.totalAmount, yen1.bills1000Amount + yen1.coins100Amount + 40);
  assert.match(calculator.generateBankMemo(yen1), /1円玉: 40枚（¥40）/);
  const yen5 = calculator.calculateChange(895, 100, 'standard');
  assert.equal(yen5.coins5Count, 40);
  assert.match(calculator.formatChangeList(yen5), /5円玉40枚/);
});

test('1円未満の価格には釣銭額や両替メモを提示しない', () => {
  const change = calculator.calculateChange(899.5, 100, 'standard');
  assert.equal(change.validPrice, false);
  assert.match(calculator.formatPaymentChange(899.5), /1円単位の整数/);
  assert.match(calculator.generateBankMemo(change), /計算できません/);
  assert.doesNotMatch(calculator.generateBankMemo(change), /両替合計/);
});

test('更新した計算モジュールをオフライン用キャッシュにも同じURLで登録する', () => {
  const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
  const html = read('../index.html');
  const app = read('../js/app.js');
  const renderer = read('../js/renderer.js');
  const worker = read('../sw.js');
  const appUrl = html.match(/src="(\.\/js\/app\.js\?v=[^"]+)"/)[1];
  const rendererUrl = app.match(/from '(\.\/renderer\.js\?v=[^']+)'/)[1];
  const calculatorUrl = app.match(/from '(\.\/calculator\.js\?v=[^']+)'/)[1];
  assert.ok(renderer.includes(`from '${calculatorUrl}'`));
  for (const url of [appUrl, `./js/${rendererUrl.slice(2)}`, `./js/${calculatorUrl.slice(2)}`]) {
    assert.ok(worker.includes(`'${url}'`), `オフライン用キャッシュに ${url} が必要です`);
  }
});
