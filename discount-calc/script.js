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
    // 全角数字を半角にし、数字以外を除去して整数化
    sanitize: (val) => {
      if (!val) return 0;
      const str = val.toString()
        .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/[^0-9]/g, '');
      return str === '' ? 0 : parseInt(str, 10);
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
      let basePrice = price;
      
      // メイン割引 (パーセント計算)
      let discounted = basePrice * (1 - percent / 100);

      // さらに割引 (レジ落ち)
      if (settings.isExtraEnabled && settings.extraDisc > 0) {
        discounted = discounted * (1 - settings.extraDisc / 100);
      }

      // 消費税計算
      let finalPrice;
      let originalPriceWithTax;

      if (settings.taxType === 'included') {
        finalPrice = Math.floor(discounted);
        originalPriceWithTax = price;
      } else {
        finalPrice = Math.floor(discounted * settings.taxRate);
        originalPriceWithTax = Math.floor(price * settings.taxRate);
      }

      // 負の値にならないようガード
      finalPrice = Math.max(0, finalPrice);
      const savedAmount = originalPriceWithTax - finalPrice;

      return { finalPrice, savedAmount };
    }
  };

  /* =========================================
     5. CONTROLLER (操作・イベント)
     ========================================= */
  function init() {
    bindEvents();
    renderBaseRows();
    syncTaxRateAvailability();
    render();
  }

  function bindEvents() {
    // --- Input Handling ---
    
    // 金額入力: リアルタイム更新
    els.price.addEventListener('input', (e) => {
      const rawVal = e.target.value;
      const sanitizedVal = NumUtils.sanitize(rawVal);
      const strVal = sanitizedVal.toString();
      
      if (sanitizedVal > CONFIG.LIMITS.PRICE_MAX) {
        const limited = parseInt(strVal.slice(0, 9), 10);
        state.price = limited;
        e.target.value = limited;
      } else {
        state.price = sanitizedVal;
        
        if (rawVal !== '' && rawVal !== strVal && parseInt(rawVal) !== sanitizedVal) {
           e.target.value = sanitizedVal;
        }
      }
      
      if (rawVal === '') state.price = 0;

      render();
    });

    // 自由入力率
    els.customRate.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (isNaN(val) || val < 0) {
        state.customRate = null;
      } else {
        state.customRate = NumUtils.clamp(val, 0, CONFIG.LIMITS.RATE_MAX);
      }
      renderCustomRow();
    });

    // さらに割引率
    els.extraDisc.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.extraDisc = NumUtils.clamp(isNaN(val) ? 0 : val, 0, 99);
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
        UI.triggerHaptic();
        const addVal = parseInt(btn.dataset.add, 10);
        const newVal = state.price + addVal;

        if (newVal <= CONFIG.LIMITS.PRICE_MAX) {
          state.price = newVal;
          els.price.value = newVal;
          UI.triggerFlash(els.price);
          render();
        }
      });
    });

    // --- Clear Button ---
    els.clearBtn.addEventListener('click', () => {
      UI.triggerHaptic();
      state.price = 0;
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
        UI.showToast('全てリセットしました');
      });
    }

    // --- Quick Rate Preset Buttons ---
    const quickRateChips = document.querySelectorAll('.btn-rate-chip[data-rate]');
    quickRateChips.forEach(btn => {
      btn.addEventListener('click', () => {
        UI.triggerHaptic();
        const rate = parseInt(btn.dataset.rate, 10);
        state.customRate = rate;
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

    // --- カートドロワーのクリアボタン ---
    els.cartClearBtn.addEventListener('click', () => {
      UI.triggerHaptic();
      state.cart = [];
      updateCartDrawer();
      UI.showToast("買い物かごを空にしました");
    });

    // --- カスタム行のカート追加ボタン ---
    els.btnCartCustom.addEventListener('click', (e) => {
      e.stopPropagation(); // コピータップの発火を防ぐ
      if (state.customRate !== null && state.price > 0) {
        addToCart(state.price, state.customRate);
      }
    });

    // --- Copy & Cart Event Delegation ---
    els.resultList.addEventListener('click', (e) => {
      // 1. カート追加ボタンのクリック判定
      const cartBtn = e.target.closest('.btn-add-cart');
      if (cartBtn) {
        e.stopPropagation(); // コピータップの発火を防ぐ
        const item = cartBtn.closest('.discount-item');
        if (item && !item.classList.contains('custom-row')) {
          const percent = parseFloat(cartBtn.dataset.percent);
          if (!isNaN(percent) && state.price > 0) {
            addToCart(state.price, percent);
          }
        }
        return;
      }

      // 2. input要素やボタンの直クリックはコピー処理を無視
      if (e.target.tagName === 'INPUT' || e.target.closest('button')) return;
      
      // 3. 通常の行タップコピー処理
      const item = e.target.closest('.discount-item');
      if (item) {
        const priceEl = item.querySelector('.col-price');
        const text = priceEl.textContent.replace(/[¥,]/g, '').trim();
        if (text && !isNaN(parseInt(text))) {
          UI.copyToClipboard(text);
        }
      }
    });

    els.resultList.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const item = e.target.closest('.discount-item');
      if (!item || e.target.tagName === 'INPUT') return;
      e.preventDefault();
      item.click();
    });
  }

  /* =========================================
     7. CART MANAGEMENT (カート管理ロジック)
     ========================================= */
  function addToCart(price, percent) {
    UI.triggerHaptic();

    // 割引計算を実行
    const res = Calculator.exec(price, percent, state);
    let origPrice = price;
    if (state.taxType === 'excluded') {
      origPrice = Math.floor(price * state.taxRate);
    }

    // カートに追加
    const cartItem = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      price: price,
      percent: percent,
      extraDisc: state.isExtraEnabled ? state.extraDisc : 0,
      origPrice: origPrice,
      finalPrice: res.finalPrice,
      savedAmount: res.savedAmount
    };

    state.cart.push(cartItem);
    updateCartDrawer();

    // アニメーション演出＆トースト
    UI.showToast(`¥${NumUtils.format(res.finalPrice)} をかごに追加しました！`);
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
    const liveCartNote = document.getElementById('cartTaxNote');
    if (liveCartNote) liveCartNote.textContent = payNote();
  }

  function removeFromCart(id) {
    state.cart = state.cart.filter((item) => item.id !== id);
    updateCartDrawer();
  }

  function updateCartDrawer() {
    const count = state.cart.length;

    if (count === 0) {
      els.cartDrawer.classList.add('hidden');
      if (els.cartItems) els.cartItems.replaceChildren();
      return;
    }

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
    els.cartFinalTotal.innerHTML = `¥${NumUtils.format(finalTotal)} <small id="cartTaxNote">${payNote()}</small>`;
    els.cartSaveTotal.textContent = `🉐 -¥${NumUtils.format(saveTotal)}`;

    if (els.cartItems) {
      els.cartItems.replaceChildren();
      state.cart.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'cart-item';
        const label = document.createElement('span');
        label.className = 'cart-item-label';
        label.textContent = `¥${NumUtils.format(item.price)} / ${formatRateLabel(item.percent, item.extraDisc)} → ¥${NumUtils.format(item.finalPrice)}`;
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn-cart-remove';
        del.setAttribute('aria-label', 'この行をかごから削除');
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
      let copied = false;
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          copied = document.execCommand('copy');
          ta.remove();
        } catch (_) {
          copied = false;
        }
      } else {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch (_) {
          try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            copied = document.execCommand('copy');
            ta.remove();
          } catch (_) {
            copied = false;
          }
        }
      }

      if (copied) {
        UI.triggerHaptic();
        UI.showToast(`¥${NumUtils.format(parseInt(text))} をコピーしました！`);
      } else {
        UI.showToast('コピーできませんでした。金額を手動で選択してコピーしてください。');
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
      li.tabIndex = 0;
      li.dataset.percent = percent;

      li.innerHTML = `
        <div class="col-rate" data-field="rate">${percent}<span class="unit">%OFF</span></div>
        <div class="col-price" data-field="price"><span>¥</span>0</div>
        <div class="col-save-wrapper">
          <div class="col-save" data-field="save">🉐 -0</div>
          <button type="button" class="btn-add-cart" data-percent="${percent}" aria-label="${percent}%オフの支払額を買い物かごに追加">🛒</button>
        </div>
      `;
      fragment.appendChild(li);
    });
    els.resultList.appendChild(fragment);
  }

  function render() {
    // 0円以下ならEmpty表示
    if (state.price <= 0) {
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
    if (state.customRate === null || state.price <= 0) {
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
