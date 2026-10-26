/**
 * app.js (v1.5.0 - 極限最適化 ＆ キーボードショートカット版)
 * 同人即売会 頒布価格＆お釣り・損益最適化シミュレーター Pro メインコントローラー
 */

import { DOUJIN_CONFIG } from './config.js';
import { StateStore, withSyncedCost } from './state.js';
import { UIRenderer } from './renderer.js';
import { DoujinCalculator } from './calculator.js';
import { LEGAL_TAX_DATA } from './legal-tax-data.js';
import { Toast } from './toast.js';

class DoujinApp {
  constructor() {
    this.store = new StateStore();
    this.renderer = new UIRenderer();
    this.init();
  }

  init() {
    this.initTheme();
    this.renderer.renderStaticComponents();
    this.renderer.renderChecklist(this.store.checklist);
    this.renderer.syncFormValues(this.store.state);
    
    // 状態変更の購読
    this.store.subscribe((state, multiCounter, checklist) => {
      this.renderer.syncFormValues(state);
      this.renderer.renderChecklist(checklist);
      this.renderer.updateCalculations(state, multiCounter);
    });

    this.bindEvents();
    this.bindKeyboardShortcuts();
    this.renderer.updateCalculations(this.store.state, this.store.multiCounter);
  }

  initTheme() {
    const isDark = localStorage.getItem('doujin_dark_theme') === 'true' ||
      (!('doujin_dark_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
      if (this.renderer.dom.themeIcon) this.renderer.dom.themeIcon.setAttribute('data-lucide', 'sun');
    } else {
      document.documentElement.classList.remove('dark');
      if (this.renderer.dom.themeIcon) this.renderer.dom.themeIcon.setAttribute('data-lucide', 'moon');
    }
  }

  toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('doujin_dark_theme', isDark);
    if (this.renderer.dom.themeIcon) {
      this.renderer.dom.themeIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
      if (window.lucide) window.lucide.createIcons();
    }
    Toast.show(isDark ? '🌙 ダークモードを適用しました' : '☀️ ライトモードを適用しました');
  }

  bindEvents() {
    const d = this.renderer.dom;

    d.themeToggle?.addEventListener('click', () => this.toggleTheme());
    d.btnPrint?.addEventListener('click', () => window.print());

    // プリセット選択
    d.presetContainer?.addEventListener('click', (e) => {
      const btn = e.target.closest('.preset-btn');
      if (!btn) return;
      const presetId = btn.dataset.preset;
      const p = DOUJIN_CONFIG.PRESETS[presetId];
      if (p) {
        this.store.setState(withSyncedCost(this.store.state, {
          copies: p.copies,
          nonSale: p.nonSale,
          costTotal: p.costTotal,
          costMode: 'total',
          fixedFee: p.fixedFee,
          shippingFee: p.shippingFee,
          otherFee: p.otherFee,
          customPrice: p.customPrice
        }));
        Toast.show(`📚 「${p.title}」のプリセットを適用しました`);
      }
    });

    // 部数入力
    d.inputCopies?.addEventListener('input', (e) => {
      this.store.setState(withSyncedCost(this.store.state, {
        copies: this.store.sanitizeNumber(e.target.value, 1, 1)
      }));
    });
    d.btnCopiesMinus?.addEventListener('click', () => {
      this.store.setState(withSyncedCost(this.store.state, {
        copies: Math.max(1, this.store.state.copies - 10)
      }));
    });
    d.btnCopiesPlus?.addEventListener('click', () => {
      this.store.setState(withSyncedCost(this.store.state, {
        copies: this.store.state.copies + 10
      }));
    });
    d.inputNonSale?.addEventListener('input', (e) => {
      this.store.setState({ nonSale: this.store.sanitizeNumber(e.target.value, 0, 0) });
    });

    // 製造費タブ
    d.tabCostTotal?.addEventListener('click', () => {
      this.store.setState(withSyncedCost(this.store.state, { costMode: 'total' }));
    });
    d.tabCostUnit?.addEventListener('click', () => {
      this.store.setState(withSyncedCost(this.store.state, { costMode: 'unit' }));
    });
    d.inputCostTotal?.addEventListener('input', (e) => {
      this.store.setState(withSyncedCost(this.store.state, {
        costMode: 'total',
        costTotal: this.store.sanitizeNumber(e.target.value, 0, 0)
      }));
    });
    d.inputCostUnit?.addEventListener('input', (e) => {
      this.store.setState(withSyncedCost(this.store.state, {
        costMode: 'unit',
        costUnit: this.store.sanitizeNumber(e.target.value, 0, 0)
      }));
    });

    // 締切選択
    d.selectDeadline?.addEventListener('change', (e) => {
      this.store.setState({ deadlineType: e.target.value });
      Toast.show(`⏰ 印刷締切プラン「${DOUJIN_CONFIG.DEADLINE_DISCOUNTS[this.store.state.deadlineType].label}」を適用`);
    });

    // 釣銭規模モード切替
    d.selectChangeMode?.addEventListener('change', (e) => {
      this.store.setState({ changeMode: e.target.value });
      Toast.show(`💰 釣銭モード「${DOUJIN_CONFIG.CHANGE_MODES[this.store.state.changeMode].name}」に切替`);
    });

    // オプション開閉
    d.btnToggleOptions?.addEventListener('click', () => {
      const isHidden = d.panelOptions.classList.contains('hidden');
      d.panelOptions.classList.toggle('hidden');
      if (d.iconOptionsArrow) {
        d.iconOptionsArrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
      }
    });

    d.inputFixedFee?.addEventListener('input', (e) => {
      this.store.setState({ fixedFee: this.store.sanitizeNumber(e.target.value, 0, 0) });
    });
    d.inputShippingFee?.addEventListener('input', (e) => {
      this.store.setState({ shippingFee: this.store.sanitizeNumber(e.target.value, 0, 0) });
    });
    d.inputOtherFee?.addEventListener('input', (e) => {
      this.store.setState({ otherFee: this.store.sanitizeNumber(e.target.value, 0, 0) });
    });
    d.inputNoveltyUnit?.addEventListener('input', (e) => {
      this.store.setState({ noveltyUnit: this.store.sanitizeNumber(e.target.value, 0, 0) });
    });
    d.inputNoveltyCopies?.addEventListener('input', (e) => {
      this.store.setState({ noveltyCopies: this.store.sanitizeNumber(e.target.value, 0, 0) });
    });
    d.inputAnthoMembers?.addEventListener('input', (e) => {
      this.store.setState({ anthoMembers: this.store.sanitizeNumber(e.target.value, 0, 0) });
    });
    d.inputAnthoPageFee?.addEventListener('input', (e) => {
      this.store.setState({ anthoPageFee: this.store.sanitizeNumber(e.target.value, 0, 0) });
    });

    // キャッシュレス
    d.toggleCashless?.addEventListener('change', (e) => {
      this.store.setState({ isCashless: e.target.checked });
      if (e.target.checked) {
        Toast.show('💳 キャッシュレスを仮に3.24%で計算します。Squareの対面は条件で2.5%か3.25%です');
      }
    });
    d.rangeCashlessRatio?.addEventListener('input', (e) => {
      this.store.setState({ cashlessRatio: parseInt(e.target.value, 10) });
    });

    // カスタム価格
    d.inputCustomPrice?.addEventListener('input', (e) => {
      this.store.setState({ customPrice: this.store.sanitizeNumber(e.target.value, 0, 0) });
    });

    // 価格カードクリック
    d.priceCardsGrid?.addEventListener('click', (e) => {
      const card = e.target.closest('.price-card');
      if (!card || card.id === 'card-custom') return;
      const p = parseFloat(card.dataset.price);
      if (p) {
        this.store.setState({ customPrice: p });
        Toast.show(`🎯 カスタム価格に「¥${p.toLocaleString()}」を設定しました`);
      }
    });

    // 消化率スライダー
    d.rangeSoldPercent?.addEventListener('input', (e) => {
      this.store.setState({ soldPercent: parseInt(e.target.value, 10) });
    });

    // 現場マルチレジカウンター
    d.btnSellNewBook?.addEventListener('click', () => {
      this.store.setCounter({ newBook: this.store.multiCounter.newBook + 1 });
      Toast.show(`📘 新刊 1冊売上！ (計 ${this.store.multiCounter.newBook}冊)`);
    });
    d.btnSellSet?.addEventListener('click', () => {
      this.store.setCounter({ set: this.store.multiCounter.set + 1 });
      Toast.show(`🎁 新刊セット 1組売上！ (計 ${this.store.multiCounter.set}組)`);
    });
    d.btnSellBackNumber?.addEventListener('click', () => {
      this.store.setCounter({ backNumber: this.store.multiCounter.backNumber + 1 });
      Toast.show(`📗 既刊 1冊売上！ (計 ${this.store.multiCounter.backNumber}冊)`);
    });
    d.btnSellGoods?.addEventListener('click', () => {
      this.store.setCounter({ goods: this.store.multiCounter.goods + 1 });
      Toast.show(`✨ グッズ 1個売上！ (計 ${this.store.multiCounter.goods}個)`);
    });
    d.btnCounterReset?.addEventListener('click', () => {
      this.store.resetCounter();
      Toast.show('↺ レジカウンターを全リセットしました');
    });

    // お品書きメモコピー
    d.btnCopyMenu?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(d.textareaMenuMemo.value);
        Toast.show('📋 お品書きメモをコピーしました！');
      } catch (err) {
        d.textareaMenuMemo.select();
        document.execCommand('copy');
        Toast.show('📋 お品書きメモをコピーしました！');
      }
    });

    // 銀行両替メモコピー
    d.btnCopyBankMemo?.addEventListener('click', async () => {
      const baseCosts = DoujinCalculator.calculateCosts(this.store.state);
      const changeData = DoujinCalculator.calculateChange(this.store.state.customPrice, baseCosts.N_sale, this.store.state.changeMode);
      const bankMemo = DoujinCalculator.generateBankMemo(changeData);
      try {
        await navigator.clipboard.writeText(bankMemo);
        Toast.show('🏦 銀行両替メモをコピーしました！');
      } catch (err) {
        Toast.show('コピーに失敗しました', 'error');
      }
    });

    // 合同誌精算書コピー
    d.btnCopyAnthoReport?.addEventListener('click', async () => {
      const baseCosts = DoujinCalculator.calculateCosts(this.store.state);
      const customPlan = DoujinCalculator.calculatePlan(this.store.state.customPrice, baseCosts);
      const anthoText = DoujinCalculator.generateAnthologyReport(this.store.state, baseCosts, customPlan);
      try {
        await navigator.clipboard.writeText(anthoText);
        Toast.show('👥 合同誌精算書をコピーしました！');
      } catch (err) {
        Toast.show('コピーに失敗しました', 'error');
      }
    });

    // チェックリスト
    d.checklistContainer?.addEventListener('change', (e) => {
      const chk = e.target.closest('.checklist-item');
      if (!chk) return;
      const idx = parseInt(chk.dataset.index, 10);
      this.store.toggleChecklistItem(idx);
    });

    // 法務モーダル開閉
    d.linkTerms?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openLegalModal('利用規約・免責事項', LEGAL_TAX_DATA.terms);
    });
    d.linkPrivacy?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openLegalModal('プライバシーポリシー', LEGAL_TAX_DATA.privacy);
    });
    d.linkTaxGuide?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openLegalModal('💡 同人サークルの確定申告・税務ガイド', LEGAL_TAX_DATA.taxGuide);
    });
    d.linkCashlessGuide?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openLegalModal('💳 即売会キャッシュレス決済導入ガイド', LEGAL_TAX_DATA.cashlessGuide);
    });
    d.btnCloseLegalModal?.addEventListener('click', () => {
      d.legalModal?.classList.add('hidden');
    });
    d.legalModal?.addEventListener('click', (e) => {
      if (e.target === d.legalModal) d.legalModal.classList.add('hidden');
    });

    // 全リセット
    d.btnResetAll?.addEventListener('click', () => {
      this.store.resetAll();
      Toast.show('↺ 初期設定にリセットしました');
    });
  }

  bindKeyboardShortcuts() {
    const d = this.renderer.dom;

    window.addEventListener('keydown', (e) => {
      // 入力フォームフォーカス中はショートカット無効
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

      if (e.key === 'Escape' && !d.legalModal.classList.contains('hidden')) {
        d.legalModal.classList.add('hidden');
        return;
      }

      if (isInputActive) return;
      if (e.repeat) return;

      // 即売会現場用テンキー/数字キーショートカット
      if (e.key === '1') {
        d.btnSellNewBook?.click();
      } else if (e.key === '2') {
        d.btnSellSet?.click();
      } else if (e.key === '3') {
        d.btnSellBackNumber?.click();
      } else if (e.key === '4') {
        d.btnSellGoods?.click();
      }
    });
  }

  openLegalModal(title, htmlContent) {
    const d = this.renderer.dom;
    if (!d.legalModal) return;
    d.legalModalTitle.textContent = title;
    d.legalModalBody.innerHTML = htmlContent;
    d.legalModal.classList.remove('hidden');
  }
}

// 起動
document.addEventListener('DOMContentLoaded', () => {
  new DoujinApp();
});
