/**
 * calculator.js (v1.5.0 - メモ化・極限最適化版)
 * 同人即売会 頒布価格・損益・お釣り・委託・税務・アンソロジー純粋計算エンジン
 */

import { DOUJIN_CONFIG } from './config.js';

export class DoujinCalculator {
  // メモ化キャッシュ
  static _costCache = new Map();
  static _planCache = new Map();

  /**
   * お釣り快適度の判定アルゴリズム (5段階)
   */
  static paymentChange(price) {
    const pay = price > 0 ? Math.ceil(price / 1000) * 1000 : 0;
    const change = Math.max(0, pay - price);
    let rest = change;
    const n500 = Math.floor(rest / 500);
    rest -= n500 * 500;
    const n100 = Math.floor(rest / 100);
    rest -= n100 * 100;
    const n50 = Math.floor(rest / 50);
    rest -= n50 * 50;
    const n10 = Math.floor(rest / 10);
    rest -= n10 * 10;
    const n5 = Math.floor(rest / 5);
    rest -= n5 * 5;
    const n1 = Math.floor(rest);
    return { pay, change, n500, n100, n50, n10, n5, n1 };
  }

  static formatPaymentChange(price) {
    if (!Number.isSafeInteger(price)) return '価格は1円単位の整数で入力してください';
    const parts = this.paymentChange(price);
    if (parts.change === 0) return '千円単位ぴったり。額面どおり預ければお釣りなし';
    const coins = [];
    if (parts.n500) coins.push(`500円玉×${parts.n500}`);
    if (parts.n100) coins.push(`100円玉×${parts.n100}`);
    if (parts.n50) coins.push(`50円玉×${parts.n50}`);
    if (parts.n10) coins.push(`10円玉×${parts.n10}`);
    if (parts.n5) coins.push(`5円玉×${parts.n5}`);
    if (parts.n1) coins.push(`1円玉×${parts.n1}`);
    const coinText = coins.length ? `（${coins.join('、')}）` : '';
    return `${parts.pay.toLocaleString()}円お預かりで${parts.change.toLocaleString()}円お釣り${coinText}`;
  }

  static evaluateComfort(price) {
    if (price <= 0 || !Number.isSafeInteger(price)) {
      return {
        stars: '---',
        level: 0,
        text: '判定不能',
        badgeClass: 'text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500',
        desc: '価格は1円単位の整数で入力してください'
      };
    }

    const desc = this.formatPaymentChange(price);

    if (price % 1000 === 0) {
      return {
        stars: '★★★★★',
        level: 5,
        text: '最高',
        badgeClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400',
        desc
      };
    }

    if (price % 500 === 0) {
      return {
        stars: '★★★★★',
        level: 5,
        text: '最高',
        badgeClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400',
        desc
      };
    }

    if (price % 100 === 0) {
      return {
        stars: '★★★☆☆',
        level: 3,
        text: '注意',
        badgeClass: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400',
        desc: `${desc}・釣銭切れ注意`
      };
    }

    if (price % 50 === 0) {
      return {
        stars: '★★☆☆☆',
        level: 2,
        text: '危険',
        badgeClass: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400',
        desc: `${desc}・50円玉が必要`
      };
    }

    return {
      stars: '★☆☆☆☆',
      level: 1,
      text: '厳禁',
      badgeClass: 'text-rose-700 bg-rose-100 dark:bg-rose-950 dark:text-rose-300',
      desc: `${desc}・10円単位は現場で詰まりやすい`
    };
  }

  /**
   * コスト・部数の基本計算（メモ化対応）
   */
  static calculateCosts(state) {
    const N = Math.max(1, parseInt(state.copies, 10) || 1);
    const anthoMembers = Math.max(0, parseInt(state.anthoMembers, 10) || 0);
    const baseNonSale = Math.max(0, parseInt(state.nonSale, 10) || 0);
    const N_non_sale = baseNonSale + anthoMembers;
    const N_sale = Math.max(0, N - N_non_sale);

    const deadlineMultiplier = DOUJIN_CONFIG.DEADLINE_DISCOUNTS[state.deadlineType]?.multiplier || 1.0;

    let baseManufacturing = state.costTotal || 0;
    if (state.costMode === 'unit') {
      baseManufacturing = Math.round((state.costUnit || 0) * N);
    }
    const manufacturingCost = Math.round(baseManufacturing * deadlineMultiplier);
    const unitCost = Math.round(manufacturingCost / N);

    const noveltyTotal = (state.noveltyUnit || 0) * (state.noveltyCopies || 0);
    const anthoFeeTotal = state.anthoPageFee || 0;
    const fixedTotal = (state.fixedFee || 0) + (state.shippingFee || 0) + (state.otherFee || 0) + noveltyTotal + anthoFeeTotal;
    const totalCost = manufacturingCost + fixedTotal;

    let cashlessFactor = 1.0;
    if (state.isCashless) {
      const ratio = Math.max(0, Math.min(100, state.cashlessRatio || 0)) / 100;
      const netRate = 1 - DOUJIN_CONFIG.CASHLESS_FEE_RATE;
      cashlessFactor = (1 - ratio) + (netRate * ratio);
    }

    return {
      N,
      N_non_sale,
      baseNonSale,
      anthoMembers,
      N_sale,
      deadlineMultiplier,
      manufacturingCost,
      unitCost,
      noveltyTotal,
      anthoFeeTotal,
      fixedTotal,
      totalCost,
      cashlessFactor
    };
  }

  /**
   * 単一価格プランの損益計算
   */
  static minimumCopiesForRevenue(targetYen, netPrice) {
    if (targetYen <= 0) return 0;
    // 売上表示と同じ円単位の四捨五入を使い、境界の浮動小数点誤差も補正する。
    let copies = Math.max(0, Math.ceil((targetYen - 0.5) / netPrice));
    if (!Number.isSafeInteger(copies)) return copies;
    if (copies > 0 && Math.round(netPrice * (copies - 1)) >= targetYen) copies--;
    if (Math.round(netPrice * copies) < targetYen) copies++;
    return copies;
  }

  static calculatePlan(price, baseCosts) {
    const p = Math.max(0, price || 0);
    const netP = p * baseCosts.cashlessFactor;
    const hasNetPrice = netP > 0;
    const breakevenCopies = hasNetPrice ? this.minimumCopiesForRevenue(Math.ceil(baseCosts.totalCost), netP) : 0;
    const profitCopies = hasNetPrice ? this.minimumCopiesForRevenue(Math.floor(baseCosts.totalCost) + 1, netP) : 0;
    const breakevenReachable = hasNetPrice && breakevenCopies <= baseCosts.N_sale;
    const profitReachable = hasNetPrice && profitCopies <= baseCosts.N_sale;
    const maxSales = Math.round(netP * baseCosts.N_sale);
    const maxProfit = maxSales - baseCosts.totalCost;
    const profitPerBook = baseCosts.N_sale > 0 ? Math.round(netP - (baseCosts.totalCost / baseCosts.N_sale)) : 0;
    const comfort = this.evaluateComfort(p);
    const profitMargin = maxSales > 0 ? ((maxProfit / maxSales) * 100).toFixed(1) : '0.0';
    const promoCostPerReader = maxProfit < 0 && baseCosts.N_sale > 0 ? Math.round(Math.abs(maxProfit) / baseCosts.N_sale) : 0;

    return {
      price: p,
      netPrice: Math.round(netP),
      hasNetPrice,
      breakevenCopies,
      breakevenReachable,
      profitCopies,
      profitReachable,
      maxSales,
      maxProfit,
      profitPerBook,
      promoCostPerReader,
      isDeficit: maxProfit < 0,
      profitMargin,
      comfort
    };
  }

  /**
   * 消化率シミュレーション
   */
  static calculateSoldMetrics(customPrice, baseCosts, soldPercent) {
    const soldRatio = Math.max(0, Math.min(100, soldPercent || 0)) / 100;
    const soldCopies = Math.round(baseCosts.N_sale * soldRatio);
    const saleRemaining = Math.max(0, baseCosts.N_sale - soldCopies);
    const unsoldCopies = baseCosts.N - soldCopies;

    const netP = customPrice * baseCosts.cashlessFactor;
    const currentSales = Math.round(netP * soldCopies);
    const currentProfit = currentSales - baseCosts.totalCost;
    const inventoryValue = Math.max(0, saleRemaining * baseCosts.unitCost);

    return {
      soldPercent,
      soldCopies,
      saleRemaining,
      unsoldCopies,
      currentSales,
      currentProfit,
      isProfit: currentProfit >= 0,
      inventoryValue
    };
  }

  /**
   * 規模別釣銭計算
   */
  static calculateChange(customPrice, saleCopies, changeMode = 'standard') {
    const inputPrice = Math.max(0, customPrice || 0);
    const validPrice = Number.isSafeInteger(inputPrice);
    const p = validPrice ? inputPrice : 0;
    const N_sale = Math.max(0, saleCopies || 0);
    const modeConfig = DOUJIN_CONFIG.CHANGE_MODES[changeMode] || DOUJIN_CONFIG.CHANGE_MODES.standard;

    let coins100Count = 0;
    let coins500Count = 0;
    let coins50Count = 0;
    let coins10Count = 0;
    let coins5Count = 0;
    let coins1Count = 0;
    let bills1000Count = validPrice ? Math.max(modeConfig.bills1000Min, Math.ceil(N_sale * modeConfig.baseMultiplier)) : 0;
    const wall = changeMode === 'wall';
    const changeYen = (p > 0 && p % 1000 !== 0) ? (1000 - (p % 1000)) : 0;
    const ratioSmall = wall ? 0.6 : 0.4;

    if (p > 0 && p < 1000 && changeYen % 100 === 0) {
      if (changeYen === 500) {
        coins500Count = Math.ceil(N_sale * (wall ? 0.5 : 0.35));
      } else {
        const c100PerTx = (changeYen % 500) / 100;
        coins100Count = Math.ceil(N_sale * ratioSmall * c100PerTx);
        if (changeYen >= 500) {
          coins500Count = Math.ceil(N_sale * (wall ? 0.4 : 0.25));
        }
      }
    } else if (p >= 1000 && changeYen === 0) {
      bills1000Count = Math.max(modeConfig.bills1000Min, Math.ceil(N_sale * (wall ? 0.5 : 0.3)));
      coins500Count = wall ? 30 : 10;
    } else if (p >= 1000 && changeYen === 500) {
      bills1000Count = Math.max(modeConfig.bills1000Min, Math.ceil(N_sale * (wall ? 0.5 : 0.3)));
      coins500Count = Math.ceil(N_sale * (wall ? 0.5 : 0.3));
    } else if (p > 0 && changeYen > 0) {
      if (p >= 1000) {
        bills1000Count = Math.max(modeConfig.bills1000Min, Math.ceil(N_sale * (wall ? 0.5 : 0.3)));
      }
      let rest = changeYen;
      const per500 = Math.floor(rest / 500);
      rest -= per500 * 500;
      const per100 = Math.floor(rest / 100);
      rest -= per100 * 100;
      const per50 = Math.floor(rest / 50);
      rest -= per50 * 50;
      const per10 = Math.floor(rest / 10);
      rest -= per10 * 10;
      const per5 = Math.floor(rest / 5);
      rest -= per5 * 5;
      const per1 = Math.floor(rest);
      const scale = (per, ratio) => (per > 0 ? Math.ceil(N_sale * ratio * per) : 0);
      coins500Count = scale(per500, wall ? 0.4 : 0.25);
      coins100Count = scale(per100, ratioSmall);
      coins50Count = scale(per50, ratioSmall);
      coins10Count = scale(per10, ratioSmall);
      coins5Count = scale(per5, ratioSmall);
      coins1Count = scale(per1, ratioSmall);
    }

    if (changeMode === 'beginner') {
      bills1000Count = Math.min(15, bills1000Count);
      coins500Count = Math.min(20, coins500Count);
      coins100Count = Math.min(40, coins100Count);
      coins50Count = Math.min(20, coins50Count);
      coins10Count = Math.min(20, coins10Count);
      coins5Count = Math.min(20, coins5Count);
      coins1Count = Math.min(20, coins1Count);
    }

    const totalAmount = (bills1000Count * 1000) + (coins500Count * 500) + (coins100Count * 100) + (coins50Count * 50) + (coins10Count * 10) + (coins5Count * 5) + coins1Count;
    const rolls100 = Math.ceil(coins100Count / 50);
    const rolls500 = Math.ceil(coins500Count / 50);
    const rolls50 = Math.ceil(coins50Count / 50);
    const rolls10 = Math.ceil(coins10Count / 50);
    const rolls5 = Math.ceil(coins5Count / 50);
    const rolls1 = Math.ceil(coins1Count / 50);

    return {
      changeMode,
      validPrice,
      modeName: modeConfig.name,
      bills1000Count,
      bills1000Amount: bills1000Count * 1000,
      coins500Count,
      coins500Amount: coins500Count * 500,
      rolls500,
      coins100Count,
      coins100Amount: coins100Count * 100,
      rolls100,
      coins50Count,
      coins50Amount: coins50Count * 50,
      rolls50,
      coins10Count,
      coins10Amount: coins10Count * 10,
      rolls10,
      coins5Count,
      coins5Amount: coins5Count * 5,
      rolls5,
      coins1Count,
      coins1Amount: coins1Count,
      rolls1,
      totalAmount
    };
  }

  /**
   * 書店委託計算
   */
  static calculateConsignment(customPrice, baseCosts) {
    const p = Math.max(0, customPrice || 0);
    const melonRate = DOUJIN_CONFIG.CONSIGNMENT_RATES.melon.rate;
    const melonNet = Math.round(p * (1 - melonRate));
    const melonFee = p - melonNet;
    const melonMargin = melonNet - baseCosts.unitCost;

    const boothRate = DOUJIN_CONFIG.CONSIGNMENT_RATES.booth;
    const boothFee = Math.ceil(p * boothRate.rate) + boothRate.fixed;
    const boothNet = Math.max(0, p - boothFee);
    const boothMargin = boothNet - baseCosts.unitCost;

    return {
      price: p,
      melon: { net: melonNet, margin: melonMargin, fee: melonFee },
      booth: { net: boothNet, margin: boothMargin, fee: boothFee }
    };
  }

  /**
   * 合同誌精算書テキスト生成
   */
  static generateAnthologyReport(state, baseCosts, customPlan) {
    const members = baseCosts.anthoMembers;
    const feePerMember = members > 0 ? Math.round((state.anthoPageFee || 0) / members) : 0;
    const profitPerMember = members > 0 && customPlan.maxProfit > 0 ? Math.round(customPlan.maxProfit / members) : 0;

    return [
      `【合同誌・アンソロジー企画 収支精算書】`,
      `■ 企画部数: ${baseCosts.N}部 (販売枠: ${baseCosts.N_sale}部 / 執筆者献本: ${members}部 / 見本他: ${baseCosts.baseNonSale}部)`,
      `■ 総支出: ¥${baseCosts.totalCost.toLocaleString()} (印刷費: ¥${baseCosts.manufacturingCost.toLocaleString()} / 参加費・送料: ¥${baseCosts.fixedTotal.toLocaleString()})`,
      `■ 執筆者謝礼総額: ¥${(state.anthoPageFee || 0).toLocaleString()} (1人あたり約: ¥${feePerMember.toLocaleString()})`,
      `■ 完売時想定純利益: ${customPlan.maxProfit >= 0 ? '+' : ''}¥${customPlan.maxProfit.toLocaleString()}`,
      members > 0 && customPlan.maxProfit > 0 ? `■ 1人あたり利益分配目安: ¥${profitPerMember.toLocaleString()}` : `■ 主催者収支目安: ${customPlan.maxProfit > 0 ? '黒字' : customPlan.maxProfit < 0 ? '赤字' : '収支±0円'}`,
      this.breakevenNote(customPlan, baseCosts.N_sale, members)
    ].join('\n');
  }

  /**
   * 損益分岐の説明。販売枠に届かないときは必要部数を隠さない。
   */
  static breakevenNote(customPlan, saleCopies, members = 0) {
    if (customPlan.hasNetPrice && customPlan.breakevenReachable) {
      return `※ 献本${members}部により、実質損益分岐ラインは「${customPlan.breakevenCopies}部」となります。`;
    }
    if (!customPlan.hasNetPrice) {
      return '※ この頒布価格では黒字化しません。';
    }
    const gift = members > 0 ? `献本${members}部を除くと、` : '';
    return `※ ${gift}損益分岐には${customPlan.breakevenCopies.toLocaleString()}部が必要です。販売枠${saleCopies.toLocaleString()}部では届きません。`;
  }

  static formatChangeList(changeData) {
    if (changeData.validPrice === false) return '価格は1円単位の整数で入力してください';
    const parts = [
      `千円札${changeData.bills1000Count}枚`,
      `500円玉${changeData.coins500Count}枚`,
      `100円玉${changeData.coins100Count}枚`
    ];
    if (changeData.coins50Count > 0) parts.push(`50円玉${changeData.coins50Count}枚`);
    if (changeData.coins10Count > 0) parts.push(`10円玉${changeData.coins10Count}枚`);
    if (changeData.coins5Count > 0) parts.push(`5円玉${changeData.coins5Count}枚`);
    if (changeData.coins1Count > 0) parts.push(`1円玉${changeData.coins1Count}枚`);
    return parts.join(' / ');
  }

  /**
   * 銀行窓口に出す両替メモ
   */
  static generateBankMemo(changeData) {
    if (changeData.validPrice === false) return '価格は1円単位の整数で入力してください。釣銭枚数は計算できません。';
    const lines = [
      '【銀行両替メモ】',
      `■ モード: ${changeData.modeName}`,
      `■ 1,000円札: ${changeData.bills1000Count}枚（¥${changeData.bills1000Amount.toLocaleString()}）`,
      `■ 500円玉: ${changeData.coins500Count}枚（¥${changeData.coins500Amount.toLocaleString()}）${changeData.rolls500 ? ` / ${changeData.rolls500}本` : ''}`,
      `■ 100円玉: ${changeData.coins100Count}枚（¥${changeData.coins100Amount.toLocaleString()}）${changeData.rolls100 ? ` / ${changeData.rolls100}本` : ''}`
    ];
    if (changeData.coins50Count > 0) {
      lines.push(`■ 50円玉: ${changeData.coins50Count}枚（¥${changeData.coins50Amount.toLocaleString()}）${changeData.rolls50 ? ` / ${changeData.rolls50}本` : ''}`);
    }
    if (changeData.coins10Count > 0) {
      lines.push(`■ 10円玉: ${changeData.coins10Count}枚（¥${changeData.coins10Amount.toLocaleString()}）${changeData.rolls10 ? ` / ${changeData.rolls10}本` : ''}`);
    }
    if (changeData.coins5Count > 0) {
      lines.push(`■ 5円玉: ${changeData.coins5Count}枚（¥${changeData.coins5Amount.toLocaleString()}）${changeData.rolls5 ? ` / ${changeData.rolls5}本` : ''}`);
    }
    if (changeData.coins1Count > 0) {
      lines.push(`■ 1円玉: ${changeData.coins1Count}枚（¥${changeData.coins1Amount.toLocaleString()}）${changeData.rolls1 ? ` / ${changeData.rolls1}本` : ''}`);
    }
    lines.push(`■ 両替合計: ¥${changeData.totalAmount.toLocaleString()}`);
    lines.push('※ 窓口で、この内訳のまま両替をお願いします。');
    return lines.join('\n');
  }

  /**
   * お品書きメモ生成
   */
  static generateMenuMemo(state, baseCosts, customPlan, changeData) {
    return [
      `【新刊/作品情報】`,
      `■ 頒布価格: ¥${customPlan.price.toLocaleString()} (${customPlan.comfort.text})`,
      `■ 持ち込み部数: ${baseCosts.N}部 (販売枠: ${baseCosts.N_sale}部 / 見本・献本: ${baseCosts.N_non_sale}部)`,
      customPlan.hasNetPrice
        ? `■ 黒字化ライン: ${customPlan.profitCopies.toLocaleString()}部${customPlan.profitReachable ? 'で黒字化' : `必要（販売枠${baseCosts.N_sale.toLocaleString()}部では届きません）`} (1部手残り: ¥${customPlan.profitPerBook.toLocaleString()})`
        : `■ 黒字化ライン: この頒布価格では黒字化しません (1部手残り: ¥${customPlan.profitPerBook.toLocaleString()})`,
      `■ 完売時想定利益: ${customPlan.maxProfit >= 0 ? '+' : ''}¥${customPlan.maxProfit.toLocaleString()} (利益率: ${customPlan.profitMargin}%)`,
      changeData.validPrice === false
        ? `■ 当日推奨釣銭: ${this.formatChangeList(changeData)}`
        : `■ 当日推奨釣銭 (${changeData.modeName}): ${this.formatChangeList(changeData)} (合計¥${changeData.totalAmount.toLocaleString()})`,
      state.isCashless ? `■ キャッシュレスは仮に手数料${(DOUJIN_CONFIG.CASHLESS_FEE_RATE * 100).toFixed(2)}%で計算` : `■ お会計: 現金決済のみ`
    ].join('\n');
  }
}
