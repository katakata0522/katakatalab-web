/**
 * state.js (v1.4.0)
 * 同人即売会シミュレーター 状態管理 & 永続化ストア
 */

import { DOUJIN_CONFIG } from './config.js?v=20261121-tools';
import { DoujinCalculator } from './calculator.js?v=20261121-tools';

const COUNTER_KEYS = ['newBook', 'set', 'backNumber', 'goods'];

export function normalizeMultiCounter(raw) {
  return Object.fromEntries(COUNTER_KEYS.map(key => {
    const value = Number(raw?.[key]);
    return [key, Number.isSafeInteger(value) && value >= 0 ? value : 0];
  }));
}

export function defaultDoujinState() {
  return {
    copies: 100,
    nonSale: 2,
    costTotal: 35000,
    costMode: 'total',
    costUnit: 350,
    deadlineType: 'normal',
    changeMode: 'standard',
    fixedFee: 7000,
    shippingFee: 2500,
    otherFee: 0,
    noveltyUnit: 0,
    noveltyCopies: 0,
    anthoMembers: 0,
    anthoPageFee: 0,
    isCashless: false,
    cashlessRatio: 30,
    customPrice: 800,
    soldPercent: 70
  };
}

/**
 * 部数を変えても、今入力している側の印刷費を正として反対側を合わせる。
 * 総額モードのまま部数だけ変えて単価モードに切り替えると、古い単価で印刷費が吹き飛ぶのを防ぐ。
 */
export function withSyncedCost(state, patch) {
  const next = { ...state, ...patch };
  const copies = Math.max(1, parseInt(next.copies, 10) || 1);
  next.copies = copies;
  next.costMode = next.costMode === 'unit' ? 'unit' : 'total';
  const switchingToUnit = state.costMode !== 'unit' && next.costMode === 'unit';
  const switchingToTotal = state.costMode === 'unit' && next.costMode !== 'unit';
  if (switchingToUnit && patch.costUnit == null) {
    next.costUnit = Math.round((Number(next.costTotal) || 0) / copies);
  }
  if (switchingToTotal && patch.costTotal == null) {
    next.costTotal = Math.round((Number(next.costUnit) || 0) * copies);
  }
  if (next.costMode === 'unit') {
    next.costTotal = Math.round((Number(next.costUnit) || 0) * copies);
  } else {
    next.costUnit = Math.round((Number(next.costTotal) || 0) / copies);
  }
  return next;
}

export class StateStore {
  constructor() {
    this.storageKey = 'doujin_calc_state_v1.4';
    this.checklistKey = 'doujin_calc_checklist_v1.4';
    this.counterKey = 'doujin_calc_multi_counter_v1.4';

    this.listeners = new Set();
    this.state = this.loadInitialState();
    this.checklist = this.loadChecklist();
    this.invalidPrice = null;
    this.counterError = '';
    this.refreshCounter();
    if (this.needsCounterMigration) {
      void this.withCounterLock(() => {
        this.refreshCounter(true);
        if (this.needsCounterMigration) this.saveCounter();
        return true;
      });
    }
    window.addEventListener?.('storage', event => {
      if (event.key === this.counterKey || event.key === null) {
        this.refreshCounter();
        this.render();
      }
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.saveState();
    this.render();
  }

  render() {
    this.listeners.forEach(fn => fn(this.state, this.multiCounter, this.checklist));
  }

  sanitizeNumber(val, defaultVal = 0, min = 0, max = Infinity) {
    if (val === null || val === undefined) return defaultVal;
    if (typeof val === 'number') return isNaN(val) ? defaultVal : Math.min(max, Math.max(min, val));
    const normalized = val.toString()
      .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      .replace(/,/g, '')
      .trim();
    const num = parseFloat(normalized);
    return isNaN(num) ? defaultVal : Math.min(max, Math.max(min, num));
  }

  loadInitialState() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('p') || urlParams.has('n')) {
      return {
        copies: this.sanitizeNumber(urlParams.get('n'), 100, 1),
        nonSale: this.sanitizeNumber(urlParams.get('ns'), 2, 0),
        costTotal: this.sanitizeNumber(urlParams.get('c'), 35000, 0),
        costMode: urlParams.get('cm') === 'unit' ? 'unit' : 'total',
        costUnit: this.sanitizeNumber(urlParams.get('cu'), 350, 0),
        deadlineType: urlParams.get('dl') || 'normal',
        changeMode: urlParams.get('chm') || 'standard',
        fixedFee: this.sanitizeNumber(urlParams.get('f'), 7000, 0),
        shippingFee: this.sanitizeNumber(urlParams.get('s'), 2500, 0),
        otherFee: this.sanitizeNumber(urlParams.get('o'), 0, 0),
        noveltyUnit: this.sanitizeNumber(urlParams.get('nu'), 0, 0),
        noveltyCopies: this.sanitizeNumber(urlParams.get('nc'), 0, 0),
        anthoMembers: this.sanitizeNumber(urlParams.get('am'), 0, 0),
        anthoPageFee: this.sanitizeNumber(urlParams.get('ap'), 0, 0),
        isCashless: urlParams.get('cl') === '1',
        cashlessRatio: this.sanitizeNumber(urlParams.get('clr'), 30, 0, 100),
        customPrice: this.sanitizeNumber(urlParams.get('p'), 800, 0),
        soldPercent: this.sanitizeNumber(urlParams.get('sp'), 70, 0, 100)
      };
    }

    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) return this.normalizeState(JSON.parse(saved));
    } catch (e) {}

    return defaultDoujinState();
  }

  normalizeState(raw) {
    const defaults = defaultDoujinState();
    const src = raw && typeof raw === 'object' ? raw : {};
    const deadlineType = DOUJIN_CONFIG.DEADLINE_DISCOUNTS[src.deadlineType] ? src.deadlineType : defaults.deadlineType;
    const changeMode = DOUJIN_CONFIG.CHANGE_MODES[src.changeMode] ? src.changeMode : defaults.changeMode;
    return {
      copies: this.sanitizeNumber(src.copies, defaults.copies, 1),
      nonSale: this.sanitizeNumber(src.nonSale, defaults.nonSale, 0),
      costTotal: this.sanitizeNumber(src.costTotal, defaults.costTotal, 0),
      costMode: src.costMode === 'unit' ? 'unit' : 'total',
      costUnit: this.sanitizeNumber(src.costUnit, defaults.costUnit, 0),
      deadlineType,
      changeMode,
      fixedFee: this.sanitizeNumber(src.fixedFee, defaults.fixedFee, 0),
      shippingFee: this.sanitizeNumber(src.shippingFee, defaults.shippingFee, 0),
      otherFee: this.sanitizeNumber(src.otherFee, defaults.otherFee, 0),
      noveltyUnit: this.sanitizeNumber(src.noveltyUnit, defaults.noveltyUnit, 0),
      noveltyCopies: this.sanitizeNumber(src.noveltyCopies, defaults.noveltyCopies, 0),
      anthoMembers: this.sanitizeNumber(src.anthoMembers, defaults.anthoMembers, 0),
      anthoPageFee: this.sanitizeNumber(src.anthoPageFee, defaults.anthoPageFee, 0),
      isCashless: src.isCashless === true || src.isCashless === '1',
      cashlessRatio: this.sanitizeNumber(src.cashlessRatio, defaults.cashlessRatio, 0, 100),
      customPrice: this.sanitizeNumber(src.customPrice, defaults.customPrice, 0),
      soldPercent: this.sanitizeNumber(src.soldPercent, defaults.soldPercent, 0, 100)
    };
  }

  loadChecklist() {
    try {
      const saved = localStorage.getItem(this.checklistKey);
      return saved ? JSON.parse(saved) : DOUJIN_CONFIG.DEFAULT_CHECKLIST.map(item => ({ ...item }));
    } catch (e) {
      return DOUJIN_CONFIG.DEFAULT_CHECKLIST.map(item => ({ ...item }));
    }
  }

  refreshCounter(strict = false) {
    let saved;
    try {
      saved = localStorage.getItem(this.counterKey);
    } catch (error) {
      if (strict) throw error;
      if (this.multiCounter) return;
    }
    let raw = null;
    try { raw = saved ? JSON.parse(saved) : null; } catch {}
    this.multiCounter = normalizeMultiCounter(raw);
    this.newBookSales = [];
    this.needsCounterMigration = false;
    if (!this.multiCounter.newBook) return;
    const sales = raw.newBookSales;
    if (Array.isArray(sales) && sales.every(sale => Number.isFinite(sale?.price) && sale.price >= 0 && Number.isSafeInteger(sale.count) && sale.count > 0)
        && sales.reduce((sum, sale) => sum + sale.count, 0) === this.multiCounter.newBook) {
      this.newBookSales = sales;
      return;
    }
    // Older counters recorded quantities only. A shared planner URL may carry
    // another price; value the legacy quantity at the last price on this device.
    let price = defaultDoujinState().customPrice;
    try {
      const savedPlan = JSON.parse(localStorage.getItem(this.storageKey));
      if (savedPlan?.customPrice != null) price = this.sanitizeNumber(savedPlan.customPrice, price, 0);
    } catch {}
    this.newBookSales = [{ price, count: this.multiCounter.newBook, estimated: true }];
    this.needsCounterMigration = true;
  }

  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
      localStorage.setItem(this.checklistKey, JSON.stringify(this.checklist));
    } catch (e) {}

    const params = new URLSearchParams({
      p: this.state.customPrice,
      n: this.state.copies,
      ns: this.state.nonSale,
      c: this.state.costTotal,
      cm: this.state.costMode,
      dl: this.state.deadlineType,
      chm: this.state.changeMode,
      f: this.state.fixedFee,
      s: this.state.shippingFee,
      o: this.state.otherFee,
      nu: this.state.noveltyUnit,
      nc: this.state.noveltyCopies,
      am: this.state.anthoMembers,
      ap: this.state.anthoPageFee,
      cl: this.state.isCashless ? '1' : '0',
      clr: this.state.cashlessRatio,
      sp: this.state.soldPercent
    });
    if (this.state.costMode === 'unit') params.set('cu', this.state.costUnit);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }

  setCustomPriceInput(raw) {
    const digits = raw.normalize('NFKC').trim();
    if (/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(digits)) {
      const amount = Number(digits.replaceAll(',', ''));
      if (Number.isSafeInteger(amount)) {
        this.setState({ customPrice: amount });
        return;
      }
    }
    this.invalidPrice = raw;
    this.render();
  }

  setState(partial) {
    if ('customPrice' in partial) this.invalidPrice = null;
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  saveCounter() {
    localStorage.setItem(this.counterKey, JSON.stringify({ ...this.multiCounter, newBookSales: this.newBookSales }));
    this.needsCounterMigration = false;
  }

  withCounterLock(operation) {
    const run = () => {
      const previousCounts = this.multiCounter;
      const previousSales = this.newBookSales;
      try {
        this.counterError = '';
        return operation();
      } catch {
        // A rejected storage write did not register the sale. Keep the confirmed
        // ledger and allow the user to retry without silently losing extra sales.
        this.multiCounter = previousCounts;
        this.newBookSales = previousSales;
        this.counterError = 'レジを保存できませんでした。記録を確認して、もう一度操作してください。';
        this.render();
        return false;
      }
    };
    const locks = window.navigator?.locks;
    if (!locks) return run();
    return locks.request(this.counterKey, run).catch(() => {
      this.counterError = 'レジを開けませんでした。もう一度操作してください。';
      this.render();
      return false;
    });
  }

  get newBookRevenue() {
    return this.newBookSales.reduce((sum, sale) => sum + sale.price * sale.count, 0);
  }

  get registerPrice() {
    const price = this.state.customPrice;
    return this.invalidPrice === null && Number.isSafeInteger(price) && price >= 0 ? price : null;
  }

  adjustCounter(key, delta) {
    if (!COUNTER_KEYS.includes(key) || ![1, -1].includes(delta)) return false;
    const price = this.registerPrice;
    return this.withCounterLock(() => {
      this.refreshCounter(true);
      if (delta > 0 && (key === 'newBook' || key === 'set')
          && this.multiCounter.newBook + this.multiCounter.set >= DoujinCalculator.calculateCosts(this.state).N_sale) return false;
      const next = Math.max(0, this.multiCounter[key] + delta);
      if (!Number.isSafeInteger(next) || next === this.multiCounter[key]) return false;
      if (key === 'newBook' && delta > 0 && price === null) return false;
      if (key === 'newBook') {
        const last = this.newBookSales.at(-1);
        if (delta < 0) {
          if (--last.count === 0) this.newBookSales.pop();
        } else if (last?.price === price && !last.estimated) {
          last.count++;
        } else {
          this.newBookSales.push({ price, count: 1 });
        }
      }
      this.multiCounter[key] = next;
      this.saveCounter();
      this.render();
      return true;
    });
  }

  resetCounter(resetPlan = false) {
    return this.withCounterLock(() => {
      this.refreshCounter(true);
      this.newBookSales = [];
      this.multiCounter = normalizeMultiCounter(null);
      this.saveCounter();
      if (resetPlan) {
        this.invalidPrice = null;
        this.state = defaultDoujinState();
        this.saveState();
      }
      this.render();
      return true;
    });
  }

  toggleChecklistItem(idx) {
    if (this.checklist[idx]) {
      this.checklist[idx].checked = !this.checklist[idx].checked;
      this.notify();
    }
  }

  resetAll() {
    return this.resetCounter(true);
  }
}
