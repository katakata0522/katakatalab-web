/**
 * チリツモ逆算シミュレーター - script.js
 * KatakataLab
 *
 * @fileoverview
 * 日常のラテマネーや固定費などのチリツモ出費をリアルタイム集計し、
 * 数年間の累計額や年利5%積立投資時の未来価値をご褒美体験に換算するシミュレーター。
 */

(() => {
  'use strict';

  /* ==========================================================================
     型定義 (JSDoc Type Annotations)
     ========================================================================== */

  /**
   * @typedef {'daily'|'weekday'|'weekly'|'monthly'|'yearly'} ExpenseFrequency
   */

  /**
   * @typedef {'1m'|'6m'|'1y'|'3y'|'5y'|'10y'} SimulationPeriod
   */

  /**
   * @typedef {Object} ExpenseItem
   * @property {string} id - 一意の識別子
   * @property {string} name - 項目名
   * @property {string} [icon] - 表示絵文字アイコン
   * @property {number} amount - 出費金額（円）
   * @property {ExpenseFrequency} freq - 発生頻度
   * @property {boolean} active - 有効/無効フラグ
   * @property {boolean} [custom] - ユーザー追加項目かどうか
   */

  /**
   * @typedef {Object} RewardItem
   * @property {string} id - ご褒美識別子
   * @property {string} name - ご褒美体験名
   * @property {string} icon - 絵文字アイコン
   * @property {number} cost - 目安金額（円）
   * @property {string} desc - 体験の魅力説明文
   */

  /**
   * @typedef {Object} AdviceData
   * @property {string} title - アドバイス見出し
   * @property {string} html - アドバイス本文HTML
   */

  /**
   * @typedef {Object} ShareData
   * @property {string} title - 共有タイトル
   * @property {string} text - 共有本文
   * @property {string} url - 共有URL
   */

  /* ==========================================================================
     定数定義 (Magic Numbers Elimination)
     ========================================================================== */

  const STORAGE_KEY = 'chiritsumo_data_v2';
  const OLD_STORAGE_KEY = 'chiritsumo_data';
  const ANNUAL_RATE = 0.05; // 年利5%
  const DAYS_PER_MONTH = 30.4;
  const WORKDAYS_PER_MONTH = 21.7;
  const WEEKS_PER_MONTH = 4.33;
  const MONTHS_PER_YEAR = 12;

  const MIN_EXPENSE_AMOUNT = 10;
  const MAX_EXPENSE_AMOUNT = 10000000;
  const STEP_THRESHOLD = 1000;
  const LARGE_STEP = 500;
  const SMALL_STEP = 50;

  const MAX_CUSTOM_EXPENSES = 20;
  const ANIMATION_DURATION_MS = 400;
  const FEEDBACK_DURATION_MS = 2000;
  const A11Y_ANNOUNCE_DELAY_MS = 50;

  const ADVICE_THRESHOLD_LOW = 3000;
  const ADVICE_THRESHOLD_MID = 15000;

  /** @type {Readonly<Record<string, number>>} */
  const PERIOD_MONTH_MAP = Object.freeze({
    '1m': 1,
    '6m': 6,
    '1y': 12,
    '3y': 36,
    '5y': 60,
    '10y': 120
  });

  /** @type {Readonly<Record<string, string>>} */
  const PERIOD_LABEL_MAP = Object.freeze({
    '1m': '1ヶ月間',
    '6m': '半年間',
    '1y': '1年間',
    '3y': '3年間',
    '5y': '5年間',
    '10y': '10年間'
  });

  const VALID_FREQS = Object.freeze(new Set(['daily', 'weekday', 'weekly', 'monthly', 'yearly']));
  const SPARKLE_FREQUENCIES = Object.freeze([523.25, 659.25, 783.99, 1046.50]); // C5, E5, G5, C6

  // デフォルト出費マスター
  const DEFAULT_EXPENSES = Object.freeze([
    {
      id: 'coffee',
      name: 'カフェ・自販機コーヒー',
      icon: '☕',
      amount: 350,
      freq: 'weekday',
      active: true,
      custom: false
    },
    {
      id: 'convenience',
      name: 'コンビニのついで買い・お菓子',
      icon: '🏪',
      amount: 300,
      freq: 'daily',
      active: true,
      custom: false
    },
    {
      id: 'subsc',
      name: '使っていない動画・音楽サブスク',
      icon: '📺',
      amount: 1200,
      freq: 'monthly',
      active: false,
      custom: false
    },
    {
      id: 'smartphone',
      name: '大手キャリアのスマホ代（格安SIMとの差）',
      icon: '📱',
      amount: 4000,
      freq: 'monthly',
      active: false,
      custom: false
    },
    {
      id: 'delivery',
      name: 'なんとなく頼むフードデリバリー',
      icon: '🛵',
      amount: 1500,
      freq: 'weekly',
      active: false,
      custom: false
    },
    {
      id: 'drinking',
      name: '気乗りしない飲み会・外食',
      icon: '🍺',
      amount: 5000,
      freq: 'monthly',
      active: false,
      custom: false
    },
    {
      id: 'eatingout',
      name: '休日の外食・テイクアウト',
      icon: '🍕',
      amount: 3500,
      freq: 'weekly',
      active: false,
      custom: false
    },
    {
      id: 'dailygoods',
      name: '日用品・ドラッグストアのついで買い',
      icon: '🧴',
      amount: 2000,
      freq: 'monthly',
      active: false,
      custom: false
    }
  ]);

  // ご褒美マスター（10段階）
  const REWARDS = Object.freeze([
    {
      id: 'movie',
      name: '映画鑑賞＋カフェセット',
      icon: '🎬',
      cost: 2500,
      desc: '週末にふらっと映画館へ。ポップコーンとドリンク片手に贅沢な2時間。'
    },
    {
      id: 'depachika',
      name: 'デパ地下の極上ごちそう惣菜・スイーツ',
      icon: '🍱',
      cost: 5000,
      desc: '好きなデリやお肉、高級ケーキを好きなだけ選んでおうちで乾杯！'
    },
    {
      id: 'tea',
      name: 'ホテルの贅沢アフタヌーンティー',
      icon: '🫖',
      cost: 10000,
      desc: '優雅なラウンジで味わう極上スイーツと紅茶。日常を忘れるプチ贅沢。'
    },
    {
      id: 'spa',
      name: '極上アロマヘッドスパ＆マッサージ',
      icon: '💆',
      cost: 30000,
      desc: '日頃の疲れを根こそぎ癒やす90分。自分への最高のご褒美ケア。'
    },
    {
      id: 'onsen',
      name: '客室露天風呂付き温泉旅館 1泊2日（ペア）',
      icon: '♨️',
      cost: 60000,
      desc: '大切な人と過ごす極上の温泉時間。旬の会席料理と美肌の湯を満喫。'
    },
    {
      id: 'gadget',
      name: '最新iPad & Apple Pencil / 高級家電',
      icon: '💻',
      cost: 100000,
      desc: 'ずっと欲しかった最新タブレットや、暮らしを快適にする時短家電。'
    },
    {
      id: 'resort',
      name: '沖縄・北海道 贅沢リゾート満喫ツアー',
      icon: '✈️',
      cost: 200000,
      desc: '青い海や広大な自然を満喫。日常を完全に脱出する最高のバカンス。'
    },
    {
      id: 'hawaii',
      name: 'ハワイ・ヨーロッパ 憧れの海外旅行',
      icon: '🌺',
      cost: 500000,
      desc: '人生の思い出に残る海外の旅。異国の空気と新しい景色に心躍る体験。'
    },
    {
      id: 'cushion',
      name: '半年分の心のお守り生活防衛ミニ基金',
      icon: '🌱',
      cost: 800000,
      desc: '「いざとなったら半年休める」という、何物にも代えがたい精神的安心感と心のゆとり。'
    },
    {
      id: 'freedom',
      name: '1年間の完全安心生活防衛資金',
      icon: '🛡️',
      cost: 1500000,
      desc: '「いつでも仕事を休める」という究極の精神的自由と心のゆとり。'
    },
    {
      id: 'dream',
      name: '世界一周旅行・夢のキャンピングカー',
      icon: '🚐',
      cost: 3000000,
      desc: '人生観が変わる壮大な挑戦。自由な移動と未知の世界へ飛び出す資金。'
    }
  ]);

  /* ==========================================================================
     純粋関数群 (Pure Calculation, Transformation & Migration)
     ========================================================================== */

  /**
   * 1つの出費項目の月額換算額を計算する純粋関数。
   * @param {ExpenseItem} item
   * @returns {number}
   */
  function calculateMonthlyAmount(item) {
    if (!item.active) return 0;
    const amount = Number(item.amount) || 0;
    switch (item.freq) {
      case 'daily':   return Math.round(amount * DAYS_PER_MONTH);
      case 'weekday': return Math.round(amount * WORKDAYS_PER_MONTH);
      case 'weekly':  return Math.round(amount * WEEKS_PER_MONTH);
      case 'yearly':  return Math.round(amount / MONTHS_PER_YEAR);
      case 'monthly':
      default:        return amount;
    }
  }

  /**
   * 全項目の合計月額を計算する純粋関数。
   * @param {ReadonlyArray<ExpenseItem>} expenses
   * @returns {number}
   */
  function calculateTotalMonthly(expenses) {
    return expenses.reduce((sum, item) => sum + calculateMonthlyAmount(item), 0);
  }

  /**
   * 単純貯金時の累計額を計算する純粋関数。
   * @param {number} monthlyAmount
   * @param {number} months
   * @returns {number}
   */
  function calculateSavingsTotal(monthlyAmount, months) {
    return monthlyAmount * months;
  }

  /**
   * 年利運用時の複利積立資産額を計算する純粋関数。
   * @param {number} monthlyAmount
   * @param {number} months
   * @param {number} annualRate
   * @returns {number}
   */
  function calculateCompoundInvestment(monthlyAmount, months, annualRate) {
    if (months <= 1 || monthlyAmount <= 0 || annualRate <= 0) return monthlyAmount * months;
    const monthlyRate = annualRate / MONTHS_PER_YEAR;
    return Math.round(monthlyAmount * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  }

  /**
   * 金額に応じたアドバイスを取得する純粋関数。
   * @param {number} monthly
   * @returns {AdviceData}
   */
  function getAdviceData(monthly) {
    if (monthly === 0) {
      return {
        title: '見直しのヒント：まずは1つ選んでみましょう',
        html: '日々の何気ない出費を1つONにするだけで、未来にどんなご褒美が生まれるかシミュレーションできます。<br>「我慢」ではなく「楽しい体験への両替」として、気軽に見直してみてくださいね。'
      };
    }
    if (monthly <= ADVICE_THRESHOLD_LOW) {
      return {
        title: '見直しのヒント：日常のちょっとしたご褒美から',
        html: '月数千円の見直しでも、1年で数万円のまとまったお金になります。<br>「毎日のカフェを週1日だけ我慢」など、無理なく試せる範囲を選びます。浮いたお金で美味しいスイーツや映画を楽しみましょう！'
      };
    }
    if (monthly <= ADVICE_THRESHOLD_MID) {
      return {
        title: '見直しのヒント：温泉旅行や家電が現実的に！',
        html: '月1万円前後のチリツモを見直すと、<strong>1年で客室露天風呂付き温泉旅館や最新タブレット</strong>などの予算に近づけるかを計算できます。<br>「なんとなく払っていたもの」を「感動する体験」に振り替えるだけで、使いたい目的に予算を振り向けられます。'
      };
    }
    return {
      title: '見直しのヒント：海外旅行や自由な暮らしが見えてくる！',
      html: '月2〜3万円以上の固定費や贅沢を見直せば、<strong>数年分の累計額や旅行の予算</strong>を比較できます。<br>積立の計算例は一定利率の仮定で、実際の成果とは異なります。「自由を選べる心の余裕」をチリツモで作っていきましょう！'
    };
  }

  /**
   * ユーザー入力をサニタイズし、制御文字やプロンプトインジェクション用指示タグを除去する純粋関数。
   * @param {unknown} text
   * @returns {string}
   */
  function sanitizeInput(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u202A-\u202E\u2066-\u2069]/g, '')
      .replace(/(?:^|\n)\s*(?:system|developer|assistant|instruction)\s*[:：]/gi, '')
      .replace(/\[\/?(?:system|inst|prompt|instruction)\]/gi, '')
      .slice(0, 40);
  }

  /**
   * HTML特殊文字を安全にエスケープする純粋関数。
   * @param {unknown} str
   * @returns {string}
   */
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 出費データ配列をスキーマ検証・型マイグレーション（文字列数値の自動変換等）する純粋関数。
   * @param {unknown} rawData
   * @returns {{ items: ExpenseItem[], isCorrupted: boolean }}
   */
  function parseAndValidateExpenses(rawData) {
    if (!rawData) return { items: [], isCorrupted: false };
    let parsed;
    if (typeof rawData === 'string') {
      try {
        parsed = JSON.parse(rawData);
      } catch (e) {
        return { items: [], isCorrupted: true };
      }
    } else {
      parsed = rawData;
    }

    if (!Array.isArray(parsed)) {
      return { items: [], isCorrupted: true };
    }

    let isCorrupted = false;
    /** @type {ExpenseItem[]} */
    const validated = [];

    for (const item of parsed) {
      if (item && typeof item === 'object') {
        const id = typeof item.id === 'string' ? item.id : 'item_' + Date.now();
        const name = typeof item.name === 'string' ? sanitizeInput(item.name) : '出費項目';
        const rawAmount = typeof item.amount === 'number' ? item.amount : Number(item.amount);
        const amount = (!isNaN(rawAmount) && rawAmount >= MIN_EXPENSE_AMOUNT && rawAmount <= MAX_EXPENSE_AMOUNT) ? rawAmount : 300;
        const freq = VALID_FREQS.has(item.freq) ? item.freq : 'monthly';
        const active = typeof item.active === 'boolean' ? item.active : true;
        const custom = Boolean(item.custom);
        const icon = typeof item.icon === 'string' ? item.icon : (custom ? '✨' : '💸');

        if (typeof item.amount !== 'number' || !VALID_FREQS.has(item.freq) || typeof item.name !== 'string') {
          isCorrupted = true;
        }

        validated.push({ id, name, icon, amount, freq, active, custom });
      } else {
        isCorrupted = true;
      }
    }

    return { items: validated.slice(0, 30), isCorrupted };
  }

  /* ==========================================================================
     状態管理 (Application State)
     ========================================================================== */

  const State = {
    /** @type {ExpenseItem[]} */
    expenses: [],
    currentPeriod: '1y',
    isInvest: false,
    isRewardSound: false,
    previouslyUnlockedCount: 0,
    previousDisplayAmount: 0
  };

  /* ==========================================================================
     Web Audio API（ゼロオーバーヘッド・フェイルセーフ設計）
     ========================================================================== */

  const isAudioSupported = typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext);
  let sharedAudioCtx = null;

  /**
   * Web Audioコンテキストのシングルトンを取得する。非対応環境ではnullを返す。
   * @returns {AudioContext|null}
   */
  function getAudioContext() {
    if (!isAudioSupported) return null;
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          sharedAudioCtx = new AudioCtx();
        } catch (e) {
          return null;
        }
      }
    }
    if (sharedAudioCtx && typeof sharedAudioCtx.resume === 'function' && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  }

  function playSparkleSound() {
    if (!isAudioSupported || !State.isRewardSound) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      SPARKLE_FREQUENCIES.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = ctx.currentTime + idx * 0.08;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.45);
      });
    } catch (e) {
      console.warn('Sparkle audio failed:', e);
    }
  }

  function primeAudio() {
    if (!isAudioSupported) return;
    try {
      const ctx = getAudioContext();
      if (ctx && typeof ctx.resume === 'function' && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch (e) {}
  }

  /* ==========================================================================
     LocalStorage ヘルパー（自己修復・v1からのマイグレーション）
     ========================================================================== */

  function loadExpenses() {
    try {
      let saved = localStorage.getItem(STORAGE_KEY);
      // 旧キーからのマイグレーション
      if (!saved) {
        const oldSaved = localStorage.getItem(OLD_STORAGE_KEY);
        if (oldSaved) {
          const { items: oldItems } = parseAndValidateExpenses(oldSaved);
          if (oldItems.length > 0) {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(oldItems));
              localStorage.removeItem(OLD_STORAGE_KEY);
            } catch (e) {}
            return oldItems;
          }
        }
        return JSON.parse(JSON.stringify(DEFAULT_EXPENSES));
      }

      if (saved) {
        let parsed;
        try {
          parsed = JSON.parse(saved);
        } catch (jsonErr) {
          console.warn('Corrupt JSON in chiritsumo storage, auto-repairing:', jsonErr);
          try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
          return JSON.parse(JSON.stringify(DEFAULT_EXPENSES));
        }

        if (Array.isArray(parsed)) {
          const { items: validated, isCorrupted } = parseAndValidateExpenses(parsed);

          if (validated.length > 0) {
            const clamped = validated.slice(0, 30);
            if (isCorrupted || validated.length > 30) {
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped)); } catch (e) {}
            }
            return clamped;
          }
        }
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_EXPENSES));
  }

  function saveExpenses() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(State.expenses));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  /* ==========================================================================
     DOMバインディング & アプリケーション初期化
     ========================================================================== */

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      State.expenses = loadExpenses();

      const DOM = {
        expenseGrid: document.getElementById('expenseGrid'),
        summaryPeriodLabel: document.getElementById('summaryPeriodLabel'),
        summaryAmount: document.getElementById('summaryAmount'),
        monthlyStat: document.getElementById('monthlyStat'),
        dailyStat: document.getElementById('dailyStat'),
        periodTabs: document.querySelectorAll('.period-tab'),
        investToggle: document.getElementById('investToggle'),
        investResultBanner: document.getElementById('investResultBanner'),
        savingsBaseAmount: document.getElementById('savingsBaseAmount'),
        investAmount: document.getElementById('investAmount'),
        investProfit: document.getElementById('investProfit'),
        rewardGrid: document.getElementById('rewardGrid'),
        adviceTitle: document.getElementById('adviceTitle'),
        adviceText: document.getElementById('adviceText'),
        copyBtn: document.getElementById('copyChiritsumoBtn'),
        nativeShareBtn: document.getElementById('nativeShareBtn'),
        shareXBtn: document.getElementById('shareChiritsumoXBtn'),
        printSheetBtn: document.getElementById('printSheetBtn'),
        resetDefaultsBtn: document.getElementById('resetDefaultsBtn'),
        rewardSoundToggle: document.getElementById('rewardSoundToggle'),
        rewardSoundIcon: document.getElementById('rewardSoundIcon'),
        rewardSoundLabel: document.getElementById('rewardSoundLabel'),

        // 比較バー
        compareSavingsLabel: document.getElementById('compareSavingsLabel'),
        compareProfitLabel: document.getElementById('compareProfitLabel'),
        compareBarSavings: document.getElementById('compareBarSavings'),
        compareBarProfit: document.getElementById('compareBarProfit'),

        // Stickyバー
        stickySummaryBar: document.getElementById('stickySummaryBar'),
        stickyPeriodBadge: document.getElementById('stickyPeriodBadge'),
        stickyAmount: document.getElementById('stickyAmount'),
        stickyRewardIcon: document.getElementById('stickyRewardIcon'),
        stickyRewardText: document.getElementById('stickyRewardText'),
        stickyJumpBtn: document.getElementById('stickyJumpBtn'),

        // カスタム追加
        toggleCustomBtn: document.getElementById('toggleCustomBtn'),
        customForm: document.getElementById('customForm'),
        customName: document.getElementById('customName'),
        customAmount: document.getElementById('customAmount'),
        customFreq: document.getElementById('customFreq'),
        addCustomBtn: document.getElementById('addCustomBtn'),

        // 支援技術
        a11yAnnouncer: document.getElementById('a11yAnnouncer')
      };

      /**
       * 支援技術向けライブ通知を発行する（遅延処理で確実なスクリーンリーダー検知）
       * @param {string} msg
       */
      let announceTimeoutId = null;
      function announceA11y(msg) {
        if (DOM.a11yAnnouncer) {
          DOM.a11yAnnouncer.textContent = '';
          if (announceTimeoutId) clearTimeout(announceTimeoutId);
          announceTimeoutId = setTimeout(() => {
            DOM.a11yAnnouncer.textContent = msg;
          }, A11Y_ANNOUNCE_DELAY_MS);
        }
      }

      if (navigator.share) {
        DOM.nativeShareBtn.classList.remove('hidden');
      }

      // サウンドトグル（単一リスナー・クリーン実装）
      DOM.rewardSoundToggle.addEventListener('click', () => {
        primeAudio();
        State.isRewardSound = !State.isRewardSound;
        DOM.rewardSoundToggle.setAttribute('aria-pressed', State.isRewardSound.toString());
        DOM.rewardSoundToggle.classList.toggle('muted', !State.isRewardSound);
        if (DOM.rewardSoundIcon) {
          DOM.rewardSoundIcon.textContent = State.isRewardSound ? '🔔' : '🔕';
        }
        if (DOM.rewardSoundLabel) {
          DOM.rewardSoundLabel.textContent = State.isRewardSound ? '音あり' : '消音中';
        }
        if (State.isRewardSound) {
          playSparkleSound();
        }
        announceA11y(State.isRewardSound ? 'アンロック音を有効にしました' : 'アンロック音を消音にしました');
      });

      // 出費グリッドの初期描画
      function renderExpenseGrid() {
        DOM.expenseGrid.innerHTML = '';
        State.expenses.forEach((item, index) => {
          const monthly = calculateMonthlyAmount(item);
          const div = document.createElement('div');
          div.className = `expense-item ${item.active ? 'active' : ''}`;
          div.dataset.index = index;
          div.innerHTML = `
            <div class="expense-item-top">
              <div class="expense-item-header">
                <span class="expense-icon" aria-hidden="true">${escapeHtml(item.icon || '💸')}</span>
                <span class="expense-name">${escapeHtml(item.name)}</span>
              </div>
              <label class="switch">
                <input type="checkbox" ${item.active ? 'checked' : ''} class="item-switch" aria-label="${escapeHtml(item.name)}の有効化">
                <span class="slider round"></span>
              </label>
            </div>

            <div class="expense-controls-row">
              <div class="stepper-wrap">
                <button type="button" class="step-btn minus-btn" title="金額を減らす">−</button>
                <input type="number" class="expense-amount-input" value="${item.amount}" min="10" max="10000000" step="50" aria-label="金額">
                <button type="button" class="step-btn plus-btn" title="金額を増やす">＋</button>
              </div>
              <span style="font-size: 0.85rem; color: var(--c-text-muted);">円 /</span>
              <select class="expense-freq-select" aria-label="頻度">
                <option value="daily" ${item.freq === 'daily' ? 'selected' : ''}>毎日</option>
                <option value="weekday" ${item.freq === 'weekday' ? 'selected' : ''}>平日（週5）</option>
                <option value="weekly" ${item.freq === 'weekly' ? 'selected' : ''}>週1回</option>
                <option value="monthly" ${item.freq === 'monthly' ? 'selected' : ''}>月1回</option>
                <option value="yearly" ${item.freq === 'yearly' ? 'selected' : ''}>年1回</option>
              </select>

              ${item.custom ? `<button type="button" class="expense-del-btn" title="この項目を削除" aria-label="項目を削除">🗑️</button>` : ''}
            </div>

            <div class="expense-monthly-preview">
              ${item.active ? `月 約 ${monthly.toLocaleString()} 円` : 'OFF'}
            </div>
          `;
          DOM.expenseGrid.appendChild(div);
        });
      }

      // Event Delegation: グリッド内のすべてのクリック/変更を一元ハンドリング（高効率）
      DOM.expenseGrid.addEventListener('click', (e) => {
        primeAudio();
        const card = e.target.closest('.expense-item');
        if (!card) return;
        const idx = Number(card.dataset.index);

        if (e.target.classList.contains('minus-btn')) {
          const step = State.expenses[idx].amount > STEP_THRESHOLD ? LARGE_STEP : SMALL_STEP;
          State.expenses[idx].amount = Math.max(MIN_EXPENSE_AMOUNT, State.expenses[idx].amount - step);
          card.querySelector('.expense-amount-input').value = State.expenses[idx].amount;
          updateCardMonthlyPreview(card, State.expenses[idx]);
          saveExpenses();
          recalculate();
        } else if (e.target.classList.contains('plus-btn')) {
          const step = State.expenses[idx].amount >= STEP_THRESHOLD ? LARGE_STEP : SMALL_STEP;
          State.expenses[idx].amount = Math.min(MAX_EXPENSE_AMOUNT, State.expenses[idx].amount + step);
          card.querySelector('.expense-amount-input').value = State.expenses[idx].amount;
          updateCardMonthlyPreview(card, State.expenses[idx]);
          saveExpenses();
          recalculate();
        } else if (e.target.classList.contains('expense-del-btn')) {
          const deletedName = State.expenses[idx].name;
          State.expenses.splice(idx, 1);
          saveExpenses();
          renderExpenseGrid();
          recalculate();
          announceA11y(`${deletedName} を削除しました`);
        }
      });

      // リアルタイム入力反映
      DOM.expenseGrid.addEventListener('input', (e) => {
        if (e.target.classList.contains('expense-amount-input')) {
          const card = e.target.closest('.expense-item');
          if (!card) return;
          const idx = Number(card.dataset.index);
          let val = Number(e.target.value);
          if (!isNaN(val) && val >= MIN_EXPENSE_AMOUNT && val <= MAX_EXPENSE_AMOUNT) {
            State.expenses[idx].amount = val;
            updateCardMonthlyPreview(card, State.expenses[idx]);
            saveExpenses();
            recalculate();
          }
        }
      });

      DOM.expenseGrid.addEventListener('change', (e) => {
        const card = e.target.closest('.expense-item');
        if (!card) return;
        const idx = Number(card.dataset.index);

        if (e.target.classList.contains('item-switch')) {
          State.expenses[idx].active = e.target.checked;
          card.classList.toggle('active', e.target.checked);
          updateCardMonthlyPreview(card, State.expenses[idx]);
          saveExpenses();
          recalculate();
        } else if (e.target.classList.contains('expense-amount-input')) {
          let val = Number(e.target.value);
          if (isNaN(val) || val < MIN_EXPENSE_AMOUNT) val = MIN_EXPENSE_AMOUNT;
          if (val > MAX_EXPENSE_AMOUNT) val = MAX_EXPENSE_AMOUNT;
          State.expenses[idx].amount = val;
          e.target.value = val;
          updateCardMonthlyPreview(card, State.expenses[idx]);
          saveExpenses();
          recalculate();
        } else if (e.target.classList.contains('expense-freq-select')) {
          State.expenses[idx].freq = e.target.value;
          updateCardMonthlyPreview(card, State.expenses[idx]);
          saveExpenses();
          recalculate();
        }
      });

      function updateCardMonthlyPreview(card, item) {
        const monthly = calculateMonthlyAmount(item);
        const preview = card.querySelector('.expense-monthly-preview');
        preview.textContent = item.active ? `月 約 ${monthly.toLocaleString()} 円` : 'OFF';
      }

      // マイクロインタラクションFPS安定化アニメーション
      let currentAnimValue = 0;
      let animFrameId = null;

      function animateValue(obj, targetEnd, duration) {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          obj.textContent = targetEnd.toLocaleString();
          currentAnimValue = targetEnd;
          return;
        }
        const start = currentAnimValue;
        const end = targetEnd;
        if (start === end) {
          obj.textContent = end.toLocaleString();
          return;
        }
        const startTime = performance.now();
        if (animFrameId) cancelAnimationFrame(animFrameId);

        function update(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          const current = Math.round(start + (end - start) * ease);
          currentAnimValue = current;
          obj.textContent = current.toLocaleString();

          if (progress < 1) {
            animFrameId = requestAnimationFrame(update);
          } else {
            currentAnimValue = end;
            obj.textContent = end.toLocaleString();
            animFrameId = null;
          }
        }
        animFrameId = requestAnimationFrame(update);
      }

      // 計算実行
      function recalculate() {
        const monthlyTotal = calculateTotalMonthly(State.expenses);
        const dailyTotal = Math.round(monthlyTotal / DAYS_PER_MONTH);

        DOM.monthlyStat.textContent = `¥${monthlyTotal.toLocaleString()}`;
        DOM.dailyStat.textContent = `¥${dailyTotal.toLocaleString()}`;

        const months = PERIOD_MONTH_MAP[State.currentPeriod] || 12;
        const periodName = PERIOD_LABEL_MAP[State.currentPeriod] || '1年間';
        DOM.summaryPeriodLabel.textContent = State.isInvest ? `${periodName}の積立計算例（年率5%を仮定）` : `${periodName}で浮くお金`;
        DOM.stickyPeriodBadge.textContent = periodName;

        const savingsTotal = calculateSavingsTotal(monthlyTotal, months);
        const finalAmount = State.isInvest && months > 1
          ? calculateCompoundInvestment(monthlyTotal, months, ANNUAL_RATE)
          : savingsTotal;

        animateValue(DOM.summaryAmount, finalAmount, ANIMATION_DURATION_MS);
        DOM.stickyAmount.textContent = `¥${finalAmount.toLocaleString()}`;
        State.previousDisplayAmount = finalAmount;

        if (State.isInvest) {
          DOM.investResultBanner.classList.remove('hidden');
          DOM.savingsBaseAmount.textContent = `¥${savingsTotal.toLocaleString()}`;
          DOM.investAmount.textContent = `¥${finalAmount.toLocaleString()}`;
          const profit = Math.max(0, finalAmount - savingsTotal);
          DOM.investProfit.textContent = `¥${profit.toLocaleString()}`;

          if (DOM.compareSavingsLabel) {
            DOM.compareSavingsLabel.textContent = `¥${savingsTotal.toLocaleString()}`;
          }
          if (DOM.compareProfitLabel) {
            DOM.compareProfitLabel.textContent = `+¥${profit.toLocaleString()}`;
          }
          if (DOM.compareBarSavings && DOM.compareBarProfit) {
            if (finalAmount > 0) {
              const savingsPct = Math.max(5, Math.min(100, Math.round((savingsTotal / finalAmount) * 100)));
              const profitPct = 100 - savingsPct;
              DOM.compareBarSavings.style.width = `${savingsPct}%`;
              DOM.compareBarProfit.style.width = `${profitPct}%`;
            } else {
              DOM.compareBarSavings.style.width = '100%';
              DOM.compareBarProfit.style.width = '0%';
            }
          }
        } else {
          DOM.investResultBanner.classList.add('hidden');
        }

        renderRewards(finalAmount);
        updateAdvice(monthlyTotal);
      }

      // ご褒美カードのDOM参照キャッシュ（再描画抑制・高速インプレース更新）
      /** @type {Array<{ card: HTMLElement, badge: HTMLElement, bar: HTMLElement, label: HTMLElement, rew: RewardItem }>} */
      let rewardCardNodes = [];

      function initRewardGrid() {
        DOM.rewardGrid.innerHTML = '';
        const frag = document.createDocumentFragment();
        rewardCardNodes = REWARDS.map(rew => {
          const card = document.createElement('div');
          card.className = 'reward-card-item locked';

          const badge = document.createElement('span');
          badge.className = 'reward-badge-status status-locked';
          badge.textContent = `あと ${rew.cost.toLocaleString()}円`;

          const icon = document.createElement('div');
          icon.className = 'reward-icon';
          icon.setAttribute('aria-hidden', 'true');
          icon.textContent = rew.icon;

          const name = document.createElement('div');
          name.className = 'reward-name';
          name.textContent = rew.name;

          const cost = document.createElement('div');
          cost.className = 'reward-cost';
          cost.textContent = `目安：¥${rew.cost.toLocaleString()}`;

          const desc = document.createElement('div');
          desc.className = 'reward-desc';
          desc.textContent = rew.desc;

          const progressWrap = document.createElement('div');
          progressWrap.className = 'reward-progress-wrap';
          progressWrap.setAttribute('aria-hidden', 'true');

          const bar = document.createElement('div');
          bar.className = 'reward-progress-bar';
          bar.style.width = '0%';
          progressWrap.appendChild(bar);

          const label = document.createElement('div');
          label.className = 'reward-progress-label';
          label.textContent = '達成率：0%';
          progressWrap.appendChild(label);

          card.appendChild(badge);
          card.appendChild(icon);
          card.appendChild(name);
          card.appendChild(cost);
          card.appendChild(desc);
          card.appendChild(progressWrap);

          frag.appendChild(card);
          return { card, badge, bar, label, rew };
        });
        DOM.rewardGrid.appendChild(frag);
      }

      // ご褒美カード更新（インプレース等値チェック付きで不要な再描画を完全排除）
      function renderRewards(targetAmount) {
        if (rewardCardNodes.length === 0) {
          initRewardGrid();
        }
        let currentUnlocked = 0;
        let bestUnlockedReward = null;

        rewardCardNodes.forEach(({ card, badge, bar, label, rew }) => {
          const isUnlocked = targetAmount >= rew.cost;
          if (isUnlocked) {
            currentUnlocked++;
            bestUnlockedReward = rew;
          }
          const pct = Math.max(0, Math.min(100, Math.round((targetAmount / rew.cost) * 100)));

          const newCardClass = `reward-card-item ${isUnlocked ? 'unlocked' : 'locked'}`;
          const newBadgeClass = `reward-badge-status ${isUnlocked ? 'status-unlocked' : 'status-locked'}`;
          const newBadgeText = isUnlocked ? '✨ GET可能！' : `あと ${(rew.cost - targetAmount).toLocaleString()}円`;
          const newBarWidth = `${pct}%`;
          const newLabelText = `達成率：${pct}%`;

          if (card.className !== newCardClass) card.className = newCardClass;
          if (badge.className !== newBadgeClass) badge.className = newBadgeClass;
          if (badge.textContent !== newBadgeText) badge.textContent = newBadgeText;
          if (bar.style.width !== newBarWidth) bar.style.width = newBarWidth;
          if (label.textContent !== newLabelText) label.textContent = newLabelText;
        });

        if (currentUnlocked > State.previouslyUnlockedCount && State.previouslyUnlockedCount > 0) {
          playSparkleSound();
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try { navigator.vibrate([60, 40, 60]); } catch (e) {}
          }
        }
        State.previouslyUnlockedCount = currentUnlocked;

        if (bestUnlockedReward) {
          DOM.stickyRewardIcon.textContent = bestUnlockedReward.icon;
          DOM.stickyRewardText.textContent = `「${bestUnlockedReward.name}」GET可能！`;
        } else {
          DOM.stickyRewardIcon.textContent = '☕';
          DOM.stickyRewardText.textContent = '小さな出費を見直し中…';
        }
      }

      function updateAdvice(monthly) {
        const advice = getAdviceData(monthly);
        DOM.adviceTitle.textContent = advice.title;
        DOM.adviceText.innerHTML = advice.html;
      }

      // 期間タブ（クリック & キーボード矢印キー対応）
      DOM.periodTabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
          DOM.periodTabs.forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
          });
          tab.classList.add('active');
          tab.setAttribute('aria-selected', 'true');
          State.currentPeriod = tab.dataset.period;
          recalculate();
        });

        tab.addEventListener('keydown', (e) => {
          let targetIndex = -1;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            targetIndex = (index + 1) % DOM.periodTabs.length;
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            targetIndex = (index - 1 + DOM.periodTabs.length) % DOM.periodTabs.length;
          }
          if (targetIndex >= 0) {
            DOM.periodTabs[targetIndex].focus();
            DOM.periodTabs[targetIndex].click();
          }
        });
      });

      // 投資トグル
      DOM.investToggle.addEventListener('change', (e) => {
        State.isInvest = e.target.checked;
        recalculate();
      });

      // Stickyジャンプボタン
      DOM.stickyJumpBtn.addEventListener('click', () => {
        document.getElementById('rewardSection').scrollIntoView({ behavior: 'smooth' });
      });

      // カスタム追加
      DOM.toggleCustomBtn.addEventListener('click', () => {
        const isHidden = DOM.customForm.classList.toggle('hidden');
        DOM.toggleCustomBtn.setAttribute('aria-expanded', (!isHidden).toString());
        if (!isHidden) DOM.customName.focus();
      });

      const customFormEl = document.getElementById('customExpenseForm');
      function addCustomExpense() {
        const currentCustomCount = State.expenses.filter(i => i.custom).length;
        if (currentCustomCount >= MAX_CUSTOM_EXPENSES) {
          alert(`カスタム項目は最大${MAX_CUSTOM_EXPENSES}件まで追加できます。不要な項目を削除してください。`);
          return;
        }

        const name = sanitizeInput(DOM.customName.value).trim() || 'カスタム出費';
        let amount = Math.round(Number(DOM.customAmount.value)) || 300;
        if (amount < 10) amount = 10;
        if (amount > 10000000) amount = 10000000;
        const freq = VALID_FREQS.has(DOM.customFreq.value) ? DOM.customFreq.value : 'monthly';

        State.expenses.push({
          id: 'custom_' + Date.now(),
          name: name,
          icon: '✨',
          amount: amount,
          freq: freq,
          active: true,
          custom: true
        });

        DOM.customName.value = '';
        DOM.customAmount.value = '';
        DOM.customForm.classList.add('hidden');
        DOM.toggleCustomBtn.setAttribute('aria-expanded', 'false');
        saveExpenses();
        renderExpenseGrid();
        recalculate();
        announceA11y(`${name}（¥${amount.toLocaleString()}）を追加しました`);
      }

      customFormEl.addEventListener('submit', (event) => {
        event.preventDefault();
        addCustomExpense();
      });

      // リセットボタン
      DOM.resetDefaultsBtn.addEventListener('click', () => {
        if (confirm('出費の選択と金額を初期状態に戻しますか？')) {
          try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
          State.expenses = JSON.parse(JSON.stringify(DEFAULT_EXPENSES));
          renderExpenseGrid();
          recalculate();
          announceA11y('出費設定を初期状態にリセットしました');
        }
      });

      // シェアデータ生成
      function getShareData() {
        const periodLabel = DOM.summaryPeriodLabel.textContent;
        const amountStr = DOM.summaryAmount.textContent;
        const unlocked = REWARDS.filter(r => (State.previousDisplayAmount >= r.cost));
        const bestReward = unlocked.length > 0 ? unlocked[unlocked.length - 1].name : null;

        let text;
        if (State.previousDisplayAmount <= 0) {
          text = `日々の何気ない出費を見直すと、将来どんなご褒美体験に化ける？
チリツモ逆算シミュレーターで、カフェ代や固定費の未来価値を楽しく計算してみました！
#チリツモ逆算 #節約 #KatakataLab`;
        } else {
          text = `何気ないチリツモ出費を見直したら…
${periodLabel}で【¥${amountStr}】浮くことが判明！✨

ご褒美として「${bestReward || 'プチ贅沢'}」に行ける計算になりました♨️
我慢ばかりの節約より、ワクワクする目標がある方がずっと楽しい！
#チリツモ逆算 #節約 #KatakataLab`;
        }
        const url = 'https://katakatalab.com/chiritsumo-calc/';
        return { title: 'チリツモ逆算シミュレーター', text, url };
      }

      function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          showCopied();
        } catch (e) {}
        document.body.removeChild(ta);
      }

      function showCopied() {
        const orig = DOM.copyBtn.innerHTML;
        DOM.copyBtn.innerHTML = '<span aria-hidden="true">✅</span> コピーしました！';
        announceA11y('結果をクリップボードにコピーしました');
        setTimeout(() => { DOM.copyBtn.innerHTML = orig; }, FEEDBACK_DURATION_MS);
      }

      DOM.copyBtn.addEventListener('click', () => {
        const { text, url } = getShareData();
        const full = `${text}\n${url}`;
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(full).then(() => showCopied()).catch(() => fallbackCopy(full));
        } else {
          fallbackCopy(full);
        }
      });

      DOM.nativeShareBtn.addEventListener('click', () => {
        const { title, text, url } = getShareData();
        if (navigator.share) {
          navigator.share({ title, text, url }).catch((err) => {
            // AbortErrorはユーザーが自発的に閉じた正常動作
            if (err && err.name === 'AbortError') return;
            // その他エラー時はクリップボードコピーへフォールバック
            fallbackCopy(`${text}\n${url}`);
          });
        } else {
          fallbackCopy(`${text}\n${url}`);
        }
      });

      DOM.shareXBtn.addEventListener('click', () => {
        const { text, url } = getShareData();
        const popup = window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
        if (popup) popup.opener = null;
      });

      DOM.printSheetBtn.addEventListener('click', () => {
        window.print();
      });

      // 初回初期化
      renderExpenseGrid();
      recalculate();
    });
  }

  /* ==========================================================================
     テスト・外部互換用エクスポート
     ========================================================================== */

  const ChiritsumoLogic = {
    STORAGE_KEY,
    OLD_STORAGE_KEY,
    ANNUAL_RATE,
    DAYS_PER_MONTH,
    WORKDAYS_PER_MONTH,
    WEEKS_PER_MONTH,
    MONTHS_PER_YEAR,
    MIN_EXPENSE_AMOUNT,
    MAX_EXPENSE_AMOUNT,
    STEP_THRESHOLD,
    LARGE_STEP,
    SMALL_STEP,
    MAX_CUSTOM_EXPENSES,
    ANIMATION_DURATION_MS,
    FEEDBACK_DURATION_MS,
    PERIOD_MONTH_MAP,
    PERIOD_LABEL_MAP,
    VALID_FREQS,
    DEFAULT_EXPENSES,
    REWARDS,
    calculateMonthlyAmount,
    calculateTotalMonthly,
    calculateSavingsTotal,
    calculateCompoundInvestment,
    getAdviceData,
    sanitizeInput,
    escapeHtml,
    parseAndValidateExpenses,
    loadExpenses
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChiritsumoLogic;
  }
  if (typeof window !== 'undefined') {
    window.ChiritsumoLogic = ChiritsumoLogic;
  }
})();
