/**
 * renderer.js (v1.4.0)
 * 同人即売会シミュレーター UIレンダリング ＆ DOMコントローラー
 */

import { DOUJIN_CONFIG } from './config.js';
import { DoujinCalculator } from './calculator.js?v=20261027-1';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

export class UIRenderer {
  constructor() {
    this.dom = this.cacheDom();
    this.renderedIcons = false;
  }

  cacheDom() {
    return {
      themeToggle: document.getElementById('btn-theme-toggle'),
      themeIcon: document.getElementById('icon-theme'),
      btnPrint: document.getElementById('btn-print-page'),
      btnResetAll: document.getElementById('btn-reset-all'),
      presetContainer: document.getElementById('preset-buttons-container'),
      
      // 部数・非売枠
      inputCopies: document.getElementById('input-copies'),
      inputNonSale: document.getElementById('input-non-sale'),
      labelSaleCopies: document.getElementById('label-sale-copies'),
      btnCopiesMinus: document.getElementById('btn-copies-minus'),
      btnCopiesPlus: document.getElementById('btn-copies-plus'),

      // 製造費・締切
      tabCostTotal: document.getElementById('tab-cost-total'),
      tabCostUnit: document.getElementById('tab-cost-unit'),
      costTotalWrapper: document.getElementById('cost-total-wrapper'),
      costUnitWrapper: document.getElementById('cost-unit-wrapper'),
      inputCostTotal: document.getElementById('input-cost-total'),
      inputCostUnit: document.getElementById('input-cost-unit'),
      labelUnitCost: document.getElementById('label-unit-cost'),
      selectDeadline: document.getElementById('select-deadline'),

      // 固定費・オプション
      btnToggleOptions: document.getElementById('btn-toggle-options'),
      panelOptions: document.getElementById('panel-options'),
      iconOptionsArrow: document.getElementById('icon-options-arrow'),
      inputFixedFee: document.getElementById('input-fixed-fee'),
      inputShippingFee: document.getElementById('input-shipping-fee'),
      inputOtherFee: document.getElementById('input-other-fee'),
      inputNoveltyUnit: document.getElementById('input-novelty-unit'),
      inputNoveltyCopies: document.getElementById('input-novelty-copies'),
      inputAnthoMembers: document.getElementById('input-antho-members'),
      inputAnthoPageFee: document.getElementById('input-antho-page-fee'),

      // キャッシュレス
      toggleCashless: document.getElementById('toggle-cashless'),
      cashlessRatioContainer: document.getElementById('cashless-ratio-container'),
      rangeCashlessRatio: document.getElementById('range-cashless-ratio'),
      labelCashlessRatio: document.getElementById('label-cashless-ratio'),

      // 比較カード
      labelTotalCost: document.getElementById('label-total-cost'),
      priceCardsGrid: document.getElementById('price-cards-grid'),
      inputCustomPrice: document.getElementById('input-custom-price'),
      customComfortBadge: document.getElementById('custom-comfort-badge'),
      customComfortDesc: document.getElementById('custom-comfort-desc'),
      customBreakeven: document.getElementById('custom-breakeven'),
      customMaxProfit: document.getElementById('custom-max-profit'),
      customProfitPerBook: document.getElementById('custom-profit-per-book'),
      customNetPrice: document.getElementById('custom-net-price'),
      costWarningBadge: document.getElementById('cost-warning-badge'),
      beginnerPromoBadge: document.getElementById('beginner-promo-badge'),

      // 消化率スライダー
      rangeSoldPercent: document.getElementById('range-sold-percent'),
      labelSoldPercent: document.getElementById('label-sold-percent'),
      labelSoldCopies: document.getElementById('label-sold-copies'),
      labelSliderBreakeven: document.getElementById('label-slider-breakeven'),
      metricCurrentSales: document.getElementById('metric-current-sales'),
      metricCurrentProfit: document.getElementById('metric-current-profit'),
      metricInventoryValue: document.getElementById('metric-inventory-value'),

      // 釣銭準備
      selectChangeMode: document.getElementById('select-change-mode'),
      labelChangeTotal: document.getElementById('label-change-total'),
      change1000: document.getElementById('change-1000'),
      change500: document.getElementById('change-500'),
      change100: document.getElementById('change-100'),
      rowChange50: document.getElementById('row-change-50'),
      change50: document.getElementById('change-50'),
      rowChange10: document.getElementById('row-change-10'),
      change10: document.getElementById('change-10'),
      rowChange5: document.getElementById('row-change-5'),
      change5: document.getElementById('change-5'),
      rowChange1: document.getElementById('row-change-1'),
      change1: document.getElementById('change-1'),
      btnCopyBankMemo: document.getElementById('btn-copy-bank-memo'),

      // 現場マルチレジカウンター
      labelLiveCounterTotalSold: document.getElementById('label-live-counter-total-sold'),
      labelLiveCounterRemaining: document.getElementById('label-live-counter-remaining'),
      labelLiveCounterSales: document.getElementById('label-live-counter-sales'),
      counterValNewBook: document.getElementById('counter-val-newbook'),
      counterValSet: document.getElementById('counter-val-set'),
      counterValBackNumber: document.getElementById('counter-val-backnumber'),
      counterValGoods: document.getElementById('counter-val-goods'),
      btnSellNewBook: document.getElementById('btn-sell-newbook'),
      btnSellSet: document.getElementById('btn-sell-set'),
      btnSellBackNumber: document.getElementById('btn-sell-backnumber'),
      btnSellGoods: document.getElementById('btn-sell-goods'),
      btnCounterReset: document.getElementById('btn-counter-reset'),

      // お品書きメモ ＆ アンソロジー精算書
      textareaMenuMemo: document.getElementById('textarea-menu-memo'),
      btnCopyMenu: document.getElementById('btn-copy-menu'),
      btnCopyAnthoReport: document.getElementById('btn-copy-antho-report'),

      // 委託販売
      melonNetPrice: document.getElementById('melon-net-price'),
      melonMargin: document.getElementById('melon-margin'),
      boothNetPrice: document.getElementById('booth-net-price'),
      boothMargin: document.getElementById('booth-margin'),

      // チェックリスト
      checklistContainer: document.getElementById('checklist-container'),

      // おすすめ備品 ＆ FAQ
      suppliesContainer: document.getElementById('supplies-grid-container'),
      faqContainer: document.getElementById('faq-accordion-container'),

      // 法務モーダル
      legalModal: document.getElementById('modal-legal'),
      legalModalTitle: document.getElementById('modal-legal-title'),
      legalModalBody: document.getElementById('modal-legal-body'),
      btnCloseLegalModal: document.getElementById('btn-close-legal-modal'),
      linkTerms: document.getElementById('link-terms'),
      linkPrivacy: document.getElementById('link-privacy'),
      linkTaxGuide: document.getElementById('link-tax-guide'),
      linkCashlessGuide: document.getElementById('link-cashless-guide')
    };
  }

  renderStaticComponents() {
    this.renderPresets();
    this.renderAffiliateSupplies();
    this.renderFaqs();
  }

  renderPresets() {
    if (!this.dom.presetContainer) return;
    this.dom.presetContainer.innerHTML = Object.values(DOUJIN_CONFIG.PRESETS).map(p => `
      <button type="button" class="preset-btn p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 text-left transition-all custom-shadow focus:ring-2 focus:ring-indigo-400" data-preset="${p.id}" aria-label="${p.title}プリセット">
        <div class="text-[11px] font-black text-slate-800 dark:text-slate-200 flex items-center gap-1">
          <i data-lucide="${p.icon}" class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400"></i>
          <span>${p.title}</span>
        </div>
        <div class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">${p.subtext}</div>
        <div class="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">${p.marketPrice}</div>
      </button>
    `).join('');
  }

  renderAffiliateSupplies() {
    if (!this.dom.suppliesContainer) return;
    this.dom.suppliesContainer.innerHTML = DOUJIN_CONFIG.AFFILIATE_SUPPLIES.map(item => `
      <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-amber-50/40 dark:hover:bg-amber-950/30 hover:border-amber-300 transition-all flex flex-col justify-between group focus:ring-2 focus:ring-amber-400" aria-label="${item.title}">
        <div>
          <div class="w-full h-24 bg-white dark:bg-slate-900 rounded-xl mb-2.5 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-800">
            <i data-lucide="${item.icon}" class="w-8 h-8 ${item.iconColor}"></i>
          </div>
          <div class="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-800 dark:group-hover:text-amber-400">${item.title}</div>
          <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">${item.desc}</p>
        </div>
        <div class="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
          <span class="font-black text-slate-900 dark:text-white">${item.price}</span>
          <span class="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">Amazonで見る <i data-lucide="chevron-right" class="w-3 h-3"></i></span>
        </div>
      </a>
    `).join('');
  }

  renderFaqs() {
    if (!this.dom.faqContainer) return;
    this.dom.faqContainer.innerHTML = DOUJIN_CONFIG.FAQS.map((faq, idx) => `
      <details class="group bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden" ${idx === 0 ? 'open' : ''}>
        <summary class="flex items-center justify-between p-4 cursor-pointer font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 select-none">
          <span class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">Q</span>
            <span>${faq.q}</span>
          </span>
          <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform"></i>
        </summary>
        <div class="px-4 pb-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700/60 pt-3">
          ${faq.a}
        </div>
      </details>
    `).join('');
  }

  renderChecklist(checklist) {
    if (!this.dom.checklistContainer) return;
    this.dom.checklistContainer.innerHTML = checklist.map((item, idx) => `
      <label class="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:bg-indigo-50/40 transition-colors">
        <input type="checkbox" class="checklist-item w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600" data-index="${idx}" ${item.checked ? 'checked' : ''}>
        <span class="text-xs font-bold text-slate-700 dark:text-slate-300 ${item.checked ? 'line-through text-slate-400 dark:text-slate-500' : ''}">${escapeHtml(item.text)}</span>
      </label>
    `).join('');
  }

  syncFormValues(state) {
    if (this.dom.inputCopies && document.activeElement !== this.dom.inputCopies) {
      this.dom.inputCopies.value = state.copies;
    }
    if (this.dom.inputNonSale && document.activeElement !== this.dom.inputNonSale) {
      this.dom.inputNonSale.value = state.nonSale;
    }
    if (this.dom.inputCostTotal && document.activeElement !== this.dom.inputCostTotal) {
      this.dom.inputCostTotal.value = state.costTotal;
    }
    if (this.dom.inputCostUnit && document.activeElement !== this.dom.inputCostUnit) {
      this.dom.inputCostUnit.value = state.costUnit || Math.round(state.costTotal / Math.max(1, state.copies));
    }
    if (this.dom.selectDeadline) this.dom.selectDeadline.value = state.deadlineType || 'normal';
    if (this.dom.selectChangeMode) this.dom.selectChangeMode.value = state.changeMode || 'standard';
    
    if (this.dom.inputFixedFee && document.activeElement !== this.dom.inputFixedFee) this.dom.inputFixedFee.value = state.fixedFee;
    if (this.dom.inputShippingFee && document.activeElement !== this.dom.inputShippingFee) this.dom.inputShippingFee.value = state.shippingFee;
    if (this.dom.inputOtherFee && document.activeElement !== this.dom.inputOtherFee) this.dom.inputOtherFee.value = state.otherFee;
    if (this.dom.inputNoveltyUnit && document.activeElement !== this.dom.inputNoveltyUnit) this.dom.inputNoveltyUnit.value = state.noveltyUnit || 0;
    if (this.dom.inputNoveltyCopies && document.activeElement !== this.dom.inputNoveltyCopies) this.dom.inputNoveltyCopies.value = state.noveltyCopies || 0;
    if (this.dom.inputAnthoMembers && document.activeElement !== this.dom.inputAnthoMembers) this.dom.inputAnthoMembers.value = state.anthoMembers || 0;
    if (this.dom.inputAnthoPageFee && document.activeElement !== this.dom.inputAnthoPageFee) this.dom.inputAnthoPageFee.value = state.anthoPageFee || 0;

    if (this.dom.toggleCashless) this.dom.toggleCashless.checked = state.isCashless;
    if (this.dom.rangeCashlessRatio) this.dom.rangeCashlessRatio.value = state.cashlessRatio;
    if (this.dom.labelCashlessRatio) this.dom.labelCashlessRatio.textContent = `${state.cashlessRatio}%`;

    if (state.isCashless) {
      this.dom.cashlessRatioContainer?.classList.remove('hidden');
    } else {
      this.dom.cashlessRatioContainer?.classList.add('hidden');
    }

    if (state.costMode === 'unit') {
      this.dom.costUnitWrapper?.classList.remove('hidden');
      this.dom.costTotalWrapper?.classList.add('hidden');
      if (this.dom.tabCostUnit) this.dom.tabCostUnit.className = 'px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm transition-all';
      if (this.dom.tabCostTotal) this.dom.tabCostTotal.className = 'px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all';
    } else {
      this.dom.costTotalWrapper?.classList.remove('hidden');
      this.dom.costUnitWrapper?.classList.add('hidden');
      if (this.dom.tabCostTotal) this.dom.tabCostTotal.className = 'px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm transition-all';
      if (this.dom.tabCostUnit) this.dom.tabCostUnit.className = 'px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all';
    }

    if (this.dom.inputCustomPrice && document.activeElement !== this.dom.inputCustomPrice) {
      this.dom.inputCustomPrice.value = state.customPrice;
    }
    if (this.dom.rangeSoldPercent) this.dom.rangeSoldPercent.value = state.soldPercent;
  }

  updateCalculations(state, multiCounter) {
    const baseCosts = DoujinCalculator.calculateCosts(state);

    if (this.dom.labelSaleCopies) {
      this.dom.labelSaleCopies.textContent = baseCosts.N_non_sale > baseCosts.N
        ? `販売できる部数がありません（見本・献本${baseCosts.N_non_sale}部が${baseCosts.N}部を超えています）`
        : `実質販売可能: ${baseCosts.N_sale.toLocaleString()}部 (献本・見本 ${baseCosts.N_non_sale}部除外)`;
    }
    if (this.dom.labelUnitCost) this.dom.labelUnitCost.textContent = `¥${baseCosts.unitCost.toLocaleString()} / 部`;
    if (this.dom.labelTotalCost) this.dom.labelTotalCost.textContent = `¥${baseCosts.totalCost.toLocaleString()}`;

    // 原価割れ警告
    if (this.dom.costWarningBadge) {
      if (state.customPrice < baseCosts.unitCost) {
        this.dom.costWarningBadge.textContent = `⚠️ 印刷単価を下回っています（1部あたり ¥${(baseCosts.unitCost - state.customPrice).toLocaleString()}）。参加費は別です`;
        this.dom.costWarningBadge.classList.remove('hidden');
      } else {
        this.dom.costWarningBadge.classList.add('hidden');
      }
    }

    // 固定3プランカード更新
    DOUJIN_CONFIG.FIXED_PRICES.forEach(price => {
      const card = document.querySelector(`.price-card[data-price="${price}"]`);
      if (!card) return;
      const plan = DoujinCalculator.calculatePlan(price, baseCosts);

      const beEl = card.querySelector('.card-breakeven');
      if (beEl) {
        beEl.textContent = this.formatProfitThreshold(plan);
        beEl.className = `font-black card-breakeven ${plan.hasNetPrice && plan.profitReachable ? 'text-slate-800 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`;
      }
      
      const profitEl = card.querySelector('.card-max-profit');
      if (profitEl) {
        profitEl.textContent = `${plan.maxProfit >= 0 ? '+' : ''}¥${plan.maxProfit.toLocaleString()}`;
        profitEl.className = `font-black card-max-profit ${plan.maxProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`;
      }

      const netPriceEl = card.querySelector('.card-net-price');
      if (netPriceEl) {
        netPriceEl.textContent = state.isCashless ? `実質 ¥${plan.netPrice.toLocaleString()}` : `¥${price.toLocaleString()}`;
      }
    });

    // カスタム価格プラン更新
    const customPlan = DoujinCalculator.calculatePlan(state.customPrice, baseCosts);
    if (this.dom.customComfortBadge) {
      this.dom.customComfortBadge.textContent = `${customPlan.comfort.stars} ${customPlan.comfort.text}`;
      this.dom.customComfortBadge.className = `text-xs font-bold px-2 py-0.5 rounded-full ${customPlan.comfort.badgeClass}`;
    }
    if (this.dom.customComfortDesc) this.dom.customComfortDesc.textContent = customPlan.comfort.desc;
    if (this.dom.inputCustomPrice) this.dom.inputCustomPrice.setAttribute('aria-invalid', String(!Number.isSafeInteger(state.customPrice)));
    if (this.dom.customBreakeven) {
      this.dom.customBreakeven.textContent = this.formatProfitThreshold(customPlan);
      this.dom.customBreakeven.className = `font-black ${customPlan.hasNetPrice && customPlan.profitReachable ? 'text-slate-800 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`;
    }
    if (this.dom.customMaxProfit) {
      this.dom.customMaxProfit.textContent = `${customPlan.maxProfit >= 0 ? '+' : ''}¥${customPlan.maxProfit.toLocaleString()}`;
      this.dom.customMaxProfit.className = `font-black ${customPlan.maxProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`;
    }
    if (this.dom.customProfitPerBook) this.dom.customProfitPerBook.textContent = `1部手残り: ¥${customPlan.profitPerBook.toLocaleString()}`;
    if (this.dom.customNetPrice) {
      this.dom.customNetPrice.textContent = state.isCashless ? `実質 ¥${customPlan.netPrice.toLocaleString()}` : `¥${state.customPrice.toLocaleString()}`;
    }

    // 初心者向け宣伝投資バッジ
    if (this.dom.beginnerPromoBadge) {
      if (customPlan.isDeficit && customPlan.promoCostPerReader > 0) {
        this.dom.beginnerPromoBadge.textContent = `💡 完売時も読者1人あたり約 ¥${customPlan.promoCostPerReader.toLocaleString()} の宣伝投資（大成功ライン）`;
        this.dom.beginnerPromoBadge.classList.remove('hidden');
      } else {
        this.dom.beginnerPromoBadge.classList.add('hidden');
      }
    }

    // 消化率シミュレーション
    const soldMetrics = DoujinCalculator.calculateSoldMetrics(state.customPrice, baseCosts, state.soldPercent);
    if (this.dom.labelSoldPercent) this.dom.labelSoldPercent.textContent = `${state.soldPercent}% 消化`;
    if (this.dom.labelSoldCopies) this.dom.labelSoldCopies.textContent = `${soldMetrics.soldCopies.toLocaleString()}部販売 / 販売残り${soldMetrics.saleRemaining.toLocaleString()}部（見本${baseCosts.N_non_sale}部は別）`;
    if (this.dom.labelSliderBreakeven) {
      this.dom.labelSliderBreakeven.textContent = !customPlan.hasNetPrice
        ? 'この価格では黒字化しない'
        : customPlan.breakevenReachable
          ? `${customPlan.breakevenCopies}部 (損益分岐)`
          : `${customPlan.breakevenCopies}部必要（販売${baseCosts.N_sale}部では届かない）`;
    }

    if (this.dom.metricCurrentSales) this.dom.metricCurrentSales.textContent = `¥${soldMetrics.currentSales.toLocaleString()}`;
    if (this.dom.metricCurrentProfit) {
      this.dom.metricCurrentProfit.textContent = `${soldMetrics.currentProfit >= 0 ? '+' : ''}¥${soldMetrics.currentProfit.toLocaleString()}`;
      this.dom.metricCurrentProfit.className = `text-xl font-black ${soldMetrics.isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`;
    }
    if (this.dom.metricInventoryValue) this.dom.metricInventoryValue.textContent = `¥${soldMetrics.inventoryValue.toLocaleString()}`;

    // 釣銭準備計算
    const changeData = DoujinCalculator.calculateChange(state.customPrice, baseCosts.N_sale, state.changeMode);
    if (this.dom.labelChangeTotal) this.dom.labelChangeTotal.textContent = changeData.validPrice ? `準備総額: ¥${changeData.totalAmount.toLocaleString()}` : '価格は1円単位で入力';
    if (this.dom.change1000) this.dom.change1000.textContent = changeData.validPrice ? `${changeData.bills1000Count}枚 (¥${changeData.bills1000Amount.toLocaleString()})` : '—';
    if (this.dom.change500) this.dom.change500.textContent = changeData.validPrice ? `${changeData.coins500Count}枚 (¥${changeData.coins500Amount.toLocaleString()}) [${changeData.rolls500}本分]` : '—';
    if (this.dom.change100) this.dom.change100.textContent = changeData.validPrice ? `${changeData.coins100Count}枚 (¥${changeData.coins100Amount.toLocaleString()}) [${changeData.rolls100}本分]` : '—';
    if (this.dom.rowChange50) this.dom.rowChange50.classList.toggle('hidden', changeData.coins50Count <= 0);
    if (this.dom.change50) this.dom.change50.textContent = `${changeData.coins50Count}枚 (¥${changeData.coins50Amount.toLocaleString()}) [${changeData.rolls50}本分]`;
    if (this.dom.rowChange10) this.dom.rowChange10.classList.toggle('hidden', changeData.coins10Count <= 0);
    if (this.dom.change10) this.dom.change10.textContent = `${changeData.coins10Count}枚 (¥${changeData.coins10Amount.toLocaleString()}) [${changeData.rolls10}本分]`;
    if (this.dom.rowChange5) this.dom.rowChange5.classList.toggle('hidden', changeData.coins5Count <= 0);
    if (this.dom.change5) this.dom.change5.textContent = `${changeData.coins5Count}枚 (¥${changeData.coins5Amount.toLocaleString()}) [${changeData.rolls5}本分]`;
    if (this.dom.rowChange1) this.dom.rowChange1.classList.toggle('hidden', changeData.coins1Count <= 0);
    if (this.dom.change1) this.dom.change1.textContent = `${changeData.coins1Count}枚 (¥${changeData.coins1Amount.toLocaleString()}) [${changeData.rolls1}本分]`;

    // 委託販売手残り
    const consign = DoujinCalculator.calculateConsignment(state.customPrice, baseCosts);
    if (this.dom.melonNetPrice) this.dom.melonNetPrice.textContent = `¥${consign.melon.net.toLocaleString()}`;
    if (this.dom.melonMargin) this.dom.melonMargin.textContent = `印刷原価との差: ¥${consign.melon.margin.toLocaleString()}`;
    if (this.dom.boothNetPrice) this.dom.boothNetPrice.textContent = `¥${consign.booth.net.toLocaleString()}`;
    if (this.dom.boothMargin) this.dom.boothMargin.textContent = `印刷原価との差: ¥${consign.booth.margin.toLocaleString()}`;

    // 現場マルチレジカウンター更新
    const soldBooksCount = multiCounter.newBook + multiCounter.set;
    const remaining = Math.max(0, baseCosts.N_sale - soldBooksCount);
    const totalSales = (multiCounter.newBook * state.customPrice) +
                       (multiCounter.set * 1500) +
                       (multiCounter.backNumber * 500) +
                       (multiCounter.goods * 800);

    if (this.dom.labelLiveCounterTotalSold) this.dom.labelLiveCounterTotalSold.textContent = `${soldBooksCount} 部`;
    if (this.dom.labelLiveCounterRemaining) this.dom.labelLiveCounterRemaining.textContent = `新刊残り ${remaining} 部`;
    if (this.dom.labelLiveCounterSales) this.dom.labelLiveCounterSales.textContent = `¥${totalSales.toLocaleString()}`;

    if (this.dom.counterValNewBook) this.dom.counterValNewBook.textContent = `${multiCounter.newBook} 冊`;
    if (this.dom.counterValSet) this.dom.counterValSet.textContent = `${multiCounter.set} 組`;
    if (this.dom.counterValBackNumber) this.dom.counterValBackNumber.textContent = `${multiCounter.backNumber} 冊`;
    if (this.dom.counterValGoods) this.dom.counterValGoods.textContent = `${multiCounter.goods} 個`;

    // お品書きメモ生成
    if (this.dom.textareaMenuMemo) {
      this.dom.textareaMenuMemo.value = DoujinCalculator.generateMenuMemo(state, baseCosts, customPlan, changeData);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  formatProfitThreshold(plan) {
    if (!plan.hasNetPrice) return '黒字化しない';
    if (!plan.profitReachable) return `${plan.profitCopies.toLocaleString()}部必要`;
    return `${plan.profitCopies.toLocaleString()}部`;
  }
}
