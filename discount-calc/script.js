document.addEventListener('DOMContentLoaded', () => {
  /* =========================================
     1. CONFIG & UTILS (設定とユーティリティ)
     ========================================= */
  const CONFIG = {
    DISCOUNTS: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90],
    LIMITS: {
      PRICE_MAX: 999999999, // 9桁
      RATE_MAX: 100,
      RATE_MIN: 0
    },
    SCROLL_THRESHOLD: 10
  };

  /**
   * 数値関連のユーティリティ
   */
  const NumUtils = {
    // 金額は非負の整数円。桁区切り以外の記号や小数は受け付けない。
    sanitize: (val) => {
      const str = String(val ?? '').trim()
        .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/,/g, '');
      if (!/^\d+$/.test(str)) return 0;
      return Number(str.replace(/^0+/, '').slice(0, 9) || '0');
    },

    // 3桁区切りフォーマット
    format: (num) => {
      return num.toLocaleString('ja-JP');
    },

    // 範囲制限 (Clamp)
    clamp: (num, min, max) => {
      return Math.min(Math.max(num, min), max);
    }
  };

  // Validate decimal text before Number conversion so unsupported precision is not silently rounded.
  function decimalRatio(value) {
    const [coefficient, exponent = '0'] = String(value).toLowerCase().split('e');
    const [whole, fraction = ''] = coefficient.split('.');
    const scale = fraction.length - Number(exponent);
    const digits = BigInt((whole || '0') + fraction);
    return scale >= 0 ? [digits, 10n ** BigInt(scale)] : [digits * 10n ** BigInt(-scale), 1n];
  }
  function validRateText(raw, max) {
    if (raw === '') return true;
    if (raw.length > 400 || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return false;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > max) return false;
    const [n, d] = decimalRatio(raw), [nn, nd] = decimalRatio(value);
    return n * nd === nn * d;
  }
  let copyRevision = 0;
  function invalidateCopy() { copyRevision++; const field = document.getElementById('manualCopyAmount'); if (field) { field.hidden = true; field.value = ''; } }

  /* =========================================
     2. DOM ELEMENTS (要素の取得)
     ========================================= */
  const els = {
    price: document.getElementById('price'),
    customRate: document.getElementById('customRate'),
    customPrice: document.getElementById('customPrice'),
    customSave: document.getElementById('customSave'),
    btnCartCustom: document.getElementById('btnCartCustom'), // カスタム行カートボタン
    extraDisc: document.getElementById('extraDisc'),
    resultList: document.getElementById('resultList'),
    emptyState: document.getElementById('emptyState'),
    clearBtn: document.getElementById('clearBtn'),
    toast: document.getElementById('toast'),
    
    taxRateRadios: document.querySelectorAll('input[name="taxRate"]'),
    taxTypeRadios: document.querySelectorAll('input[name="taxType"]'),
    extraToggle: document.getElementById('extraToggle'),
    stickyHeader: document.getElementById('stickyHeader'),
    quickBtns: document.querySelectorAll('.quick-add-buttons button'),

    // カート用のDOM要素
    cartDrawer: document.getElementById('cartDrawer'),
    cartCount: document.getElementById('cartCount'),
    cartOriginalTotal: document.getElementById('cartOriginalTotal'),
    cartFinalTotal: document.getElementById('cartFinalTotal'),
    cartSaveTotal: document.getElementById('cartSaveTotal'),
    cartClearBtn: document.getElementById('cartClearBtn'),
    cartItems: document.getElementById('cartItems'),
    taxHelp: document.getElementById('taxHelp'),
    payHeaderNote: document.getElementById('payHeaderNote'),
    cartTaxNote: document.getElementById('cartTaxNote')
  };

  /* =========================================
     3. STATE STORE (状態管理)
     ========================================= */
  const state = {
    price: 0,
    priceValid: true, priceEntered: false, rateValid: true, extraValid: true,
    customRate: null,
    extraDisc: 0,
    taxRate: 1.10,
    taxType: 'included', // 'included' | 'excluded'
    isExtraEnabled: false,
    
    // お買い物かご（カート）配列
    cart: [] // { id, price, percent, extraDisc, origPrice, finalPrice, savedAmount }
  };

  /* =========================================
     4. BUSINESS LOGIC (計算ロジック)
     ========================================= */
  const Calculator = {
    /**
     * 割引・消費税計算のコアロジック
     * 戻り値: { finalPrice, savedAmount }
     */
    exec: (price, percent, settings) => {
      // Decimal rates are converted to exact integer ratios before multiplication.
      // Floor only once after all discounts and tax, matching the displayed rules.
      const ratio = decimalRatio;
      const rate = (value, max = 100) => Number.isFinite(Number(value))
        ? Math.min(max, Math.max(0, Number(value))) : 0;
      const basePrice = BigInt(Number.isFinite(price) ? Math.min(CONFIG.LIMITS.PRICE_MAX, Math.max(0, Math.trunc(price))) : 0);
      const [mainN, mainD] = ratio(rate(percent));
      let numerator = basePrice * (100n * mainD - mainN);
      let denominator = 100n * mainD;
      if (settings.isExtraEnabled) {
        const [extraN, extraD] = ratio(rate(settings.extraDisc, 99));
        numerator *= 100n * extraD - extraN;
        denominator *= 100n * extraD;
      }
      const [taxN, taxD] = settings.taxType === 'included' ? [1n, 1n] : ratio(rate(settings.taxRate, 2));
      const finalPrice = Number(numerator * taxN / (denominator * taxD));
      const originalPriceWithTax = Number(basePrice * taxN / taxD);
      const savedAmount = originalPriceWithTax - finalPrice;

      return { finalPrice, savedAmount };
    }
  };

  /* =========================================
     5. CONTROLLER (操作・イベント)
     ========================================= */
  function init() {
    bindEvents();
    const dateField = document.getElementById('memoDate');
    if (dateField) dateField.value = localDate();
    loadMemo();
    renderBaseRows();
    syncTaxRateAvailability();
    render();
  }

  function bindEvents() {
    // --- Input Handling ---
    
    // 金額入力: リアルタイム更新
    els.price.addEventListener('input', (e) => {
      const normalized = e.target.value.trim().replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/,/g, '');
      state.priceEntered = normalized !== '';
      if (!state.priceEntered) state.price = 0;
      state.priceValid = /^\d{1,9}$/.test(normalized);
      if (state.priceValid) state.price = Number(normalized);
      setInputError(els.price, 'priceError', !state.priceValid && state.priceEntered, '金額は0〜999,999,999の整数円で入力してください。');

      render();
    });

    // 自由入力率
    els.customRate.addEventListener('input', (e) => {
      const raw = e.target.value.trim();
      const val = Number(raw);
      state.rateValid = validRateText(raw, 100);
      state.customRate = raw !== '' && state.rateValid ? val : null;
      setInputError(els.customRate, 'rateError', !state.rateValid, '割引率は0〜100の10進小数で入力してください。精度を保てない長い小数は使えません。');
      render();
    });

    els.extraDisc.addEventListener('input', (e) => {
      const raw = e.target.value.trim();
      const val = Number(raw);
      state.extraValid = validRateText(raw, 99);
      if (state.extraValid) state.extraDisc = val;
      render();
    });

    // --- Settings ---
    const updateSetting = () => {
      els.taxRateRadios.forEach(r => { if(r.checked) state.taxRate = parseFloat(r.value); });
      els.taxTypeRadios.forEach(r => { if(r.checked) state.taxType = r.value; });
      state.isExtraEnabled = els.extraToggle.checked;
      syncTaxRateAvailability();
      render();
    };

    [...els.taxRateRadios, ...els.taxTypeRadios].forEach(el => el.addEventListener('change', updateSetting));
    els.extraToggle.addEventListener('change', updateSetting);

    // --- Quick Buttons ---
    els.quickBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!state.priceValid && state.priceEntered) { UI.showToast('先に金額を訂正してください。'); return; }
        UI.triggerHaptic();
        const addVal = parseInt(btn.dataset.add, 10);
        const newVal = state.price + addVal;

        if (newVal <= CONFIG.LIMITS.PRICE_MAX) {
          state.price = newVal;
          state.priceValid = true; state.priceEntered = true;
          els.price.value = newVal;
          UI.triggerFlash(els.price);
          render();
        } else { UI.showToast('金額の上限は999,999,999円です。入力値は変更していません。'); }
      });
    });

    // --- Clear Button ---
    els.clearBtn.addEventListener('click', () => {
      UI.triggerHaptic();
      state.price = 0;
      state.priceEntered = false; state.priceValid = true;
      setInputError(els.price, 'priceError', false, '');
      els.price.value = '';
      els.price.focus();
      render();
    });

    // --- 全リセットボタン（価格・税率・追加割引をすべてデフォルトに戻す）---
    const resetAllBtn = document.getElementById('resetAllBtn');
    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', () => {
        UI.triggerHaptic();
        // 価格リセット
        state.price = 0;
        state.priceEntered = false; state.priceValid = true; state.rateValid = true; state.extraValid = true;
        setInputError(els.price, 'priceError', false, '');
        setInputError(els.customRate, 'rateError', false, '');
        els.price.value = '';
        // 税率リセット（10%税込に戻す）
        state.taxRate = 1.10;
        state.taxType = 'included';
        els.taxRateRadios.forEach(r => { r.checked = r.value === '1.10'; });
        els.taxTypeRadios.forEach(r => { r.checked = r.value === 'included'; });
        syncTaxRateAvailability();
        // 追加割引リセット
        state.extraDisc = 0;
        state.isExtraEnabled = false;
        els.extraDisc.value = '';
        els.extraToggle.checked = false;
        // カスタム割引率リセット
        state.customRate = null;
        els.customRate.value = '';
        render();
        UI.showToast('入力・計算設定をリセットしました（買物メモは保持）');
      });
    }

    // --- Quick Rate Preset Buttons ---
    const quickRateChips = document.querySelectorAll('.btn-rate-chip[data-rate]');
    quickRateChips.forEach(btn => {
      btn.addEventListener('click', () => {
        UI.triggerHaptic();
        const rate = parseInt(btn.dataset.rate, 10);
        state.customRate = rate;
        state.rateValid = true;
        setInputError(els.customRate, 'rateError', false, '');
        els.customRate.value = rate;
        renderCustomRow();
        UI.triggerFlash(els.customRate);
        UI.showToast(`${rate}%割引を適用しました`);
      });
    });

    // --- Keyboard UX ---
    [els.price, els.customRate, els.extraDisc].forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
      });
      input.addEventListener('focus', function() { this.select(); });
    });

    // --- Scroll Performance ---
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (window.scrollY > CONFIG.SCROLL_THRESHOLD) {
            els.stickyHeader.classList.add('is-scrolled');
          } else {
            els.stickyHeader.classList.remove('is-scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    els.cartClearBtn.addEventListener('click', () => {
      if (!state.cart.length || !confirm('この端末の買物メモをすべて削除しますか？')) return;
      state.cart = [];
      updateCartDrawer();
      persistMemo();
    });
    els.btnCartCustom.addEventListener('click', () => {
      if (canCalculate()) addToCart(state.price, state.customRate);
    });
    document.getElementById('copyPriceBtn')?.addEventListener('click', () => {
      if (canCalculate()) UI.copyToClipboard(String(Calculator.exec(state.price, state.customRate, state).finalPrice));
    });
    // Rows do not copy or save. Choosing a rate updates the primary result.
    els.resultList.addEventListener('click', event => {
      const button = event.target.closest('.btn-select-rate');
      if (!button) return;
      const percent = Number(button.dataset.percent);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) return;
      state.customRate = percent; state.rateValid = true;
      els.customRate.value = String(percent);
      setInputError(els.customRate, 'rateError', false, '');
      render();
    });
    document.getElementById('memoDate')?.addEventListener('input', () => { dateEdited = true; const date = document.getElementById('memoDate'); date.setAttribute('aria-invalid', String(!validDate(date.value))); });
    document.getElementById('memoRetry')?.addEventListener('click', persistMemo);
  }

  function setInputError(input, id, invalid, text) {
    input.setAttribute('aria-invalid', String(invalid));
    const message = document.getElementById(id);
    if (message) { message.hidden = !invalid; message.textContent = invalid ? text : ''; }
  }
  function canCalculate() {
    return state.priceEntered && state.priceValid && state.rateValid && state.customRate !== null && (!state.isExtraEnabled || state.extraValid);
  }
  const MEMO_KEY = 'discountCalcShoppingMemoV1';
  let memoReadBlocked = false;
  let lastStoredMemo = null;
  let dateEdited = false;
  function localDate(now = new Date()) {
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year,month,day] = value.split('-').map(Number);
    const date = new Date(year, month-1, day);
    return year >= 1000 && date.getFullYear() === year && date.getMonth() === month-1 && date.getDate() === day;
  }
  function memoMessage(text, retry = false) {
    const message = document.getElementById('memoStatus');
    if (message) message.textContent = text;
    const button = document.getElementById('memoRetry');
    if (button) button.hidden = !retry;
  }
  function loadMemo() {
    try {
      const raw = localStorage.getItem(MEMO_KEY);
      lastStoredMemo = raw;
      if (raw === null) return;
      const data = JSON.parse(raw);
      if (data?.version !== 1 || !Array.isArray(data.items) || data.items.length > 200) throw new Error('schema');
      const ids = new Set();
      for (const item of data.items) {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id || ids.has(item.id) || typeof item.shopName !== 'string' || item.shopName.length > 100 || !validDate(item.date) || !['included','excluded'].includes(item.taxType) || ![1,1.08,1.1].includes(item.taxRate) || typeof item.isExtraEnabled !== 'boolean') throw new Error('item');
        for (const key of ['price','percent','extraDisc','origPrice','finalPrice','savedAmount']) if (typeof item[key] !== 'number' || !Number.isFinite(item[key]) || item[key] < 0) throw new Error('number');
        if (!Number.isInteger(item.price) || item.price > CONFIG.LIMITS.PRICE_MAX || item.percent > 100 || item.extraDisc > 99) throw new Error('range');
        const result = Calculator.exec(item.price, item.percent, item);
        if (result.finalPrice !== item.finalPrice || result.savedAmount !== item.savedAmount || item.origPrice !== result.finalPrice + result.savedAmount) throw new Error('snapshot');
        ids.add(item.id);
      }
      state.cart = data.items;
    } catch (_) {
      memoReadBlocked = true;
      memoMessage('保存済みメモを読み込めませんでした。元のデータを保護するため保存を停止しています。');
    }
  }
  function persistMemo() {
    if (memoReadBlocked) { memoMessage('元の保存データを保護しています。この画面の変更はまだ保存できていません。'); return false; }
    try {
      if (localStorage.getItem(MEMO_KEY) !== lastStoredMemo) {
        memoReadBlocked = true;
        memoMessage('別の画面で買物メモが変更されました。上書きを止めています。この画面の未保存内容を控えてから再読み込みしてください。');
        return false;
      }
      const serialized = JSON.stringify({version:1,items:state.cart});
      localStorage.setItem(MEMO_KEY, serialized);
      lastStoredMemo = serialized;
      memoMessage('この端末に保存しました。'); return true;
    } catch (_) { memoMessage('この画面の変更はまだ保存できていません。以前の保存データは保持しています。', true); return false; }
  }

  /* =========================================
     7. CART MANAGEMENT (カート管理ロジック)
     ========================================= */
  function addToCart(price, percent) {
    if (!Number.isInteger(price) || price < 0 || price > CONFIG.LIMITS.PRICE_MAX || !Number.isFinite(percent) || percent < 0 || percent > 100 || !state.priceValid || !state.rateValid || (state.isExtraEnabled && !state.extraValid)) return;
    if (state.cart.length >= 200) { memoMessage('買物メモは200件までです。不要なメモを削除してから追加してください。'); return; }
    const dateInput = document.getElementById('memoDate');
    if (dateInput && !dateEdited) dateInput.value = localDate();
    const date = dateInput ? dateInput.value : localDate();
    if (dateInput) dateInput.setAttribute('aria-invalid', String(!validDate(date)));
    if (!validDate(date)) { memoMessage('実在する日付を入力してください。'); return; }
    const shopName = (document.getElementById('memoShop')?.value || '').trim();
    if (shopName.length > 100) { memoMessage('店名は100文字以内で入力してください。'); return; }
    UI.triggerHaptic();

    // 割引計算を実行
    const res = Calculator.exec(price, percent, state);
    let origPrice = price;
    if (state.taxType === 'excluded') {
      origPrice = res.finalPrice + res.savedAmount;
    }

    // カートに追加
    const cartItem = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      price: price,
      percent: percent,
      extraDisc: state.isExtraEnabled ? state.extraDisc : 0,
      origPrice: origPrice,
      finalPrice: res.finalPrice,
      savedAmount: res.savedAmount,
      shopName, date, taxType: state.taxType, taxRate: state.taxRate, isExtraEnabled: state.isExtraEnabled
    };

    state.cart.push(cartItem);
    updateCartDrawer();

    // アニメーション演出＆トースト
    persistMemo();
  }

  function payNote() {
    if (state.taxType === 'excluded' && state.taxRate === 1) return '(税無)';
    return '(税込)';
  }

  function formatRateLabel(percent, extraDisc) {
    if (extraDisc > 0) return `${percent}% → さらに${extraDisc}%`;
    return `${percent}%OFF`;
  }

  function syncTaxRateAvailability() {
    const excluded = state.taxType === 'excluded';
    els.taxRateRadios.forEach((radio) => {
      radio.disabled = !excluded;
    });
    const group = document.getElementById('taxRateGroup');
    if (group) group.classList.toggle('is-disabled', !excluded);
    if (els.taxHelp) {
      els.taxHelp.textContent = excluded
        ? '税抜額に、選んだ税率を掛けて支払額を出します。'
        : '元が税込のときは、入力額をそのまま基準にします。税率は「元は税抜」のときだけ使います。';
    }
    if (els.payHeaderNote) els.payHeaderNote.textContent = payNote();
  }

  function removeFromCart(id) {
    state.cart = state.cart.filter((item) => item.id !== id);
    updateCartDrawer();
    persistMemo();
  }

  function updateCartDrawer() {
    const count = state.cart.length;

    let originalTotal = 0;
    let finalTotal = 0;
    let saveTotal = 0;

    state.cart.forEach(item => {
      originalTotal += item.origPrice;
      finalTotal += item.finalPrice;
      saveTotal += item.savedAmount;
    });

    els.cartCount.textContent = count;
    els.cartOriginalTotal.textContent = `¥${NumUtils.format(originalTotal)}`;
    els.cartFinalTotal.textContent = `¥${NumUtils.format(finalTotal)}`;
    els.cartSaveTotal.textContent = `🉐 -¥${NumUtils.format(saveTotal)}`;

    if (count === 0) {
      els.cartDrawer.classList.add('hidden');
      if (els.cartItems) els.cartItems.replaceChildren();
      return;
    }

    if (els.cartItems) {
      els.cartItems.replaceChildren();
      state.cart.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'cart-item';
        const label = document.createElement('span');
        label.className = 'cart-item-label';
        label.textContent = `${item.date || ''}${item.shopName ? ' · '+item.shopName : ''} / ¥${NumUtils.format(item.price)} / ${formatRateLabel(item.percent, item.extraDisc)} / ${item.taxType === 'included' ? '元は税込・税加算なし' : `元は税抜・税率${Math.round((item.taxRate - 1) * 100)}%`} → ¥${NumUtils.format(item.finalPrice)}`;
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn-cart-remove';
        del.setAttribute('aria-label', `${item.date} ${item.shopName || ''} ¥${NumUtils.format(item.finalPrice)} の行をかごから削除`);
        del.textContent = '削除';
        del.addEventListener('click', () => removeFromCart(item.id));
        li.append(label, del);
        els.cartItems.appendChild(li);
      });
    }

    els.cartDrawer.classList.remove('hidden');
  }

  /* =========================================
     6. VIEW / UI (描画・差分アップデート)
     ========================================= */
  const UI = {
    triggerHaptic: () => {
      if (navigator.vibrate) navigator.vibrate(10);
    },

    triggerFlash: (el) => {
      el.classList.remove('is-flashing');
      void el.offsetWidth; // Reflow trigger
      el.classList.add('is-flashing');
    },

    copyToClipboard: async (text) => {
      const revision = ++copyRevision;
      let copied = false;
      const legacyCopy = () => {
        const ta = document.createElement('textarea');
        try {
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          return document.execCommand('copy') === true;
        } catch (_) { return false; }
        finally { ta.remove(); }
      };
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        copied = legacyCopy();
      } else {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch (_) {
          if (revision !== copyRevision) return;
          copied = legacyCopy();
        }
      }

      if (revision !== copyRevision) return;
      if (copied) {
        UI.triggerHaptic();
        UI.showToast(`¥${NumUtils.format(parseInt(text))} をコピーしました！`);
      } else {
        const field = document.getElementById('manualCopyAmount');
        if (field) { field.hidden = false; field.value = text; field.focus(); field.select(); }
        UI.showToast('コピーできませんでした。選択された金額を手動でコピーしてください。');
      }
    },

    showToast: (msg) => {
      els.toast.textContent = msg;
      els.toast.classList.add('is-visible');
      if (UI.toastTimer) clearTimeout(UI.toastTimer);
      UI.toastTimer = setTimeout(() => {
        els.toast.classList.remove('is-visible');
      }, 2000);
    }
  };

  // チラつきを100%防止するため、リスト項目の「骨組みDOM」を初回のみ作成
  function renderBaseRows() {
    const fragment = document.createDocumentFragment();
    CONFIG.DISCOUNTS.forEach(percent => {
      const li = document.createElement('li');
      li.className = 'discount-item';
      li.dataset.percent = percent;

      li.innerHTML = `
        <button type="button" class="col-rate btn-select-rate" data-percent="${percent}" data-field="rate" aria-label="${percent}%を選ぶ">${percent}<span class="unit">%OFF</span></button>
        <div class="col-price" data-field="price"><span>¥</span>0</div>
        <div class="col-save-wrapper">
          <div class="col-save" data-field="save">🉐 -0</div>

        </div>
      `;
      fragment.appendChild(li);
    });
    els.resultList.appendChild(fragment);
  }

  function render() {
    setInputError(els.extraDisc, 'extraError', state.isExtraEnabled && !state.extraValid, '追加割引は0〜99の10進小数で入力してください。精度を保てない長い小数は使えません。');
    renderCustomRow();
    if (!state.priceEntered || !state.priceValid || (state.isExtraEnabled && !state.extraValid)) {
      els.resultList.style.display = 'none';
      els.emptyState.style.display = 'block';
      updateCartDrawer();
      return;
    }

    els.resultList.style.display = 'block';
    els.emptyState.style.display = 'none';

    // カートドロワーの現在の状態を維持
    updateCartDrawer();

    // 1. 自由入力行の更新
    renderCustomRow();

    // 2. 固定リストの「中身のテキストのみ」を書き換える超高速差分レンダリング！
    const rows = els.resultList.querySelectorAll('.discount-item:not(.custom-row)');
    rows.forEach(row => {
      const percent = parseInt(row.dataset.percent, 10);
      const res = Calculator.exec(state.price, percent, state);

      const rateEl = row.querySelector('[data-field="rate"]');
      const priceEl = row.querySelector('[data-field="price"]');
      const saveEl = row.querySelector('[data-field="save"]');

      // タイムセール(レジ落ち)表示対応
      const extra = (state.isExtraEnabled && state.extraDisc > 0) ? state.extraDisc : 0;
      rateEl.textContent = '';
      rateEl.appendChild(document.createTextNode(formatRateLabel(percent, extra)));
      priceEl.innerHTML = `<span>¥</span>${NumUtils.format(res.finalPrice)}`;
      saveEl.textContent = `🉐 -${NumUtils.format(res.savedAmount)}`;
    });
  }

  function renderCustomRow() {
    invalidateCopy();
    document.querySelectorAll('.btn-rate-chip[data-rate], .btn-select-rate[data-percent]').forEach(btn => btn.setAttribute('aria-pressed', String(state.rateValid && Number(btn.dataset.rate ?? btn.dataset.percent) === state.customRate)));
    const copyButton = document.getElementById('copyPriceBtn');
    const selected = document.getElementById('selectedRate');
    if (selected) selected.textContent = state.customRate === null ? '割引率を選ぶ' : formatRateLabel(state.customRate, state.isExtraEnabled ? state.extraDisc : 0);
    if (copyButton) copyButton.disabled = !canCalculate();
    if (!canCalculate()) {
      els.customPrice.textContent = '-';
      els.customSave.textContent = '-';
      els.customPrice.disabled = true;
      els.btnCartCustom.disabled = true;
      return;
    }
    const res = Calculator.exec(state.price, state.customRate, state);
    els.customPrice.innerHTML = `<span>¥</span>${NumUtils.format(res.finalPrice)}`;
    els.customSave.textContent = `🉐 -${NumUtils.format(res.savedAmount)}`;
    els.customPrice.disabled = false;
    els.btnCartCustom.disabled = false;
  }

  // 入力データの保護 (beforeunload)
  window.addEventListener('beforeunload', (e) => {
    if (state.price > 0 || state.cart.length > 0) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // アプリケーション開始
  init();
});
