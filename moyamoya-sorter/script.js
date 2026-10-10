/**
 * モヤモヤ仕分け機 - script.js
 * KatakataLab
 *
 * @fileoverview
 * 頭の中のモヤモヤ・不安を「今変えられること」と「手放していいこと」に仕分け、
 * 2分間でできるスモールステップと高精度タイマーを提供する行動整理ツール。
 */

(() => {
  'use strict';

  /* ==========================================================================
     型定義 (JSDoc Type Annotations)
     ========================================================================== */

  /**
   * @typedef {Object} ActionItem
   * @property {string} icon - 表示絵文字アイコン
   * @property {string} action - 2分間で実行できる具体的アクション
   * @property {string} reason - 提案した行動の取り組み方
   */

  /**
   * @typedef {Object} MoyamoyaAnalysis
   * @property {string[]} controllable - 自分でコントロール可能な行動・思考
   * @property {string[]} uncontrollable - 他人・過去・未来など手放すべき事象
   * @property {string} note - パーソナライズされた共感メッセージHTML
   */

  /**
   * @typedef {Object} HistoryEntry
   * @property {number} id - 一意のタイムスタンプID
   * @property {string} text - サニタイズされたモヤモヤ抜粋
   * @property {string} action - 決定された2分アクション名
   * @property {string} date - フォーマット済み日時文字列
   */

  /**
   * @typedef {Object} TimerState
   * @property {ReturnType<typeof setInterval>|null} intervalId - インターバルタイマーID
   * @property {number} remainingSeconds - 残り秒数
   * @property {number|null} startTimestamp - 開始/再開時点のエポックミリ秒
   * @property {number} elapsedBeforePause - 一時停止前に経過したミリ秒
   * @property {boolean} isRunning - タイマーが稼働中かどうか
   */

  /* ==========================================================================
     定数定義 (Magic Numbers Elimination)
     ========================================================================== */

  const STORAGE_KEY = 'moyamoya_history_v2';
  const OLD_STORAGE_KEY = 'moyamoya_history';
  const TOTAL_SECONDS = 120;
  const CIRCLE_RADIUS = 54;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

  const CHAR_COUNT_WARN_THRESHOLD = 800;
  const CHAR_COUNT_MAX_THRESHOLD = 950;
  const MAX_INPUT_LENGTH = 1000;

  const TIMER_TICK_INTERVAL_MS = 200;
  const CONFETTI_COUNT = 60;
  const CONFETTI_MAX_FRAMES = 130;
  const MAX_HISTORY_ENTRIES = 5;
  const HISTORY_SNIPPET_MAX_LEN = 35;
  const ACTION_SWITCH_FADE_MS = 150;
  const FEEDBACK_DURATION_MS = 2000;
  const A11Y_ANNOUNCE_DELAY_MS = 50;

  // オーディオ周波数・エンベロープ定数
  const CHIME_START_FREQ = 523.25; // C5
  const CHIME_END_FREQ = 659.25;   // E5
  const CHIME_RAMP_DURATION = 0.3;
  const CHIME_TOTAL_DURATION = 1.2;

  /* ==========================================================================
     マスターデータ (Action Database)
     ========================================================================== */

  /** @type {ReadonlyArray<ActionItem>} */
  const ACTION_DATABASE = Object.freeze([
    {
      icon: '💧',
      action: 'コップ1杯の常温の水をゆっくり飲む',
      reason: 'いったん手を止め、水を飲む時間をつくります。'
    },
    {
      icon: '📝',
      action: '裏紙やノートに「今一番嫌なこと」を3行だけ殴り書きする',
      reason: '書き出した内容を見ながら、次にできることを選びます。'
    },
    {
      icon: '🗑️',
      action: '目に入った机の上・部屋のゴミを「1つだけ」ゴミ箱に捨てる',
      reason: '片づける対象を1つに絞れば、短い時間でも区切りをつけられます。'
    },
    {
      icon: '🌬️',
      action: '苦しくならない範囲で、ゆっくり呼吸しながら少し休む',
      reason: '無理のない呼吸で、少し休む時間をつくります。'
    },
    {
      icon: '📩',
      action: '一番気が重い連絡の「宛先と件名」だけ打って一旦下書き保存する',
      reason: '本文を完成させる前に、宛先と件名だけ決める方法です。'
    },
    {
      icon: '🚶',
      action: '立ち上がって部屋の中を1周歩き、肩をグッと上げてストンと落とす（5回）',
      reason: '同じ姿勢を続けているときの、短い休憩の候補です。'
    },
    {
      icon: '📵',
      action: 'スマホの画面を伏せて、手の届かない別の部屋か引き出しに置く',
      reason: 'スマホに手が伸びるきっかけを減らすための工夫です。'
    },
    {
      icon: '🪟',
      action: '窓を少し開けて、外の新鮮な空気を深く3回吸い込む',
      reason: '安全に開けられる窓があれば、作業場所の空気を入れ替えます。'
    },
    {
      icon: '🧊',
      action: '洗面所で手を洗い、作業をいったん区切る',
      reason: '手洗いを、作業をいったん区切るきっかけにします。'
    },
    {
      icon: '👀',
      action: '画面から目を離し、遠くの窓の外や景色を20秒間ぼーっと眺める',
      reason: '画面を見続けているときの、短い休憩の候補です。'
    },
    {
      icon: '🧹',
      action: 'キーボードとマウスの周辺だけ、サッとティッシュやクロスで拭く',
      reason: '片づける範囲を手元だけに限定する方法です。'
    },
    {
      icon: '🔕',
      action: 'SlackやLINE、SNSの通知を『30分間おやすみモード』にする',
      reason: '今すぐ対応が必要な連絡を確認してから、通知を短時間休止します。'
    },
    {
      icon: '🪑',
      action: '椅子の背もたれから背中を離し、両足の裏を床につけて深呼吸する',
      reason: '足元や姿勢を確かめ、少し休む時間をつくります。'
    },
    {
      icon: '📑',
      action: '開いているブラウザのタブを、今関係ないものだけ3つ閉じる',
      reason: '今使わないタブを閉じて、取り組む作業を選びやすくします。'
    },
    {
      icon: '🍵',
      action: '温かい白湯かお茶を一口淹れて、湯気と香りを3秒嗅ぐ',
      reason: '飲み物を用意して、作業の合間に小さな区切りをつくります。'
    }
  ]);

  /* ==========================================================================
     純粋関数群 (Pure Analysis, Utility & Storage Migration)
     ========================================================================== */

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
      .slice(0, MAX_INPUT_LENGTH);
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
   * 円形プログレスバーのstroke-dashoffsetを計算する純粋関数。
   * @param {number} remaining - 残り秒数
   * @param {number} total - 合計秒数
   * @param {number} circumference - 円周
   * @returns {number}
   */
  function calcTimerOffset(remaining, total, circumference) {
    if (total <= 0) return 0;
    const ratio = Math.max(0, Math.min(1, remaining / total));
    return circumference - ratio * circumference;
  }

  /**
   * モヤモヤテキストを解析し、変えられること・変えられないこと・共感メッセージを生成する純粋関数。
   * @param {string} text
   * @returns {MoyamoyaAnalysis}
   */
  function analyzeMoyamoya(text) {
    const raw = typeof text === 'string' ? text.trim() : '';
    const defaultText = raw || '漠然とした不安';

    const isWork = /仕事|締切|締め切り|タスク|納期|上司|連絡|メール|残業|宿題|レポート|案件/.test(defaultText);
    const isRelation = /人|言われ|視線|嫌わ|嫌味|悪口|同僚|友達|家族|空気|怒ら/.test(defaultText);
    const isMoney = /金|将来|老後|給与|税金|出費|不安|生活|年金|ローン/.test(defaultText);
    const isTired = /だるい|疲れた|気力|やる気|眠い|休めない|しんどい|動けない/.test(defaultText);
    const isPhone = /スマホ|時間|動画|無駄|Twitter|X|SNS|YouTube|ゲーム|自己嫌悪/.test(defaultText);

    const snippet = raw ? `「${raw.slice(0, 18)}${raw.length > 18 ? '…' : ''}」` : '今感じているモヤモヤ';
    const note = `💭 <strong>${escapeHtml(snippet)}</strong> について、頭の中の荷物を降ろして言葉から仕分けの例を選びました。`;

    let controllable = [];
    let uncontrollable = [];

    if (isWork) {
      controllable = [
        '今日やるタスクを「最大3つ」だけメモに書き出すこと',
        '「20分だけ一旦向き合う」と時間を短く区切ること',
        '相談や遅れそうな連絡を、早い段階で短い1通送ること'
      ];
      uncontrollable = [
        '相手がどんなリアクションや表情をしてくるか',
        '急な追加案件や他人のミスによる変更',
        '今日中に全部完璧に終わらせなければという理想'
      ];
    } else if (isRelation) {
      controllable = [
        '相手と物理的・心理的な距離を置くこと',
        '自分の心地よいこと（好きな音楽や温かいお茶）に意識を向けること',
        '「相手の機嫌は相手の課題」とアドラー心理学的に線引きすること'
      ];
      uncontrollable = [
        '相手が過去に言った言葉（過去の事事実を変えられない）',
        '相手があなたのことを頭の中でどう解釈・評価するか',
        '相手の機嫌や性格を変えようとすること'
      ];
    } else if (isMoney) {
      controllable = [
        '今月の固定費（サブスクなど）を1つ見直すこと',
        '手元にあるお金で今週使える予算をざっくり決めること',
        '今日できる仕事や勉強、休養に集中すること'
      ];
      uncontrollable = [
        '景気や物価の上昇、国の税制や世界情勢',
        '10年後・20年後の確定していない未来の出来事',
        '「もし明日何かあったら…」という頭の中の想像の恐怖'
      ];
    } else if (isTired) {
      controllable = [
        '「今日は省エネモードで生きる」と自分に許可を出すこと',
        '回復のために、今すぐ横になって目を閉じること',
        '温かいシャワーやお茶で体を温めること'
      ];
      uncontrollable = [
        '「今日やるはずだったのに出来なかった」という過去',
        '世の中の元気な人たちと自分を比較すること',
        '気力が出ないホルモンバランスや天気の気圧の変化'
      ];
    } else if (isPhone) {
      controllable = [
        'スマホの充電器を寝室や作業部屋の外に移動すること',
        '今すぐ画面を伏せて、深呼吸すること',
        '「ここまでしっかり休んだからOK」と自分を許してあげること'
      ];
      uncontrollable = [
        '既に過ぎ去ってしまった時間（戻ってこない過去）',
        'タイムラインに流れてくる他人のキラキラした生活',
        'SNSアプリが人間の脳を依存させるように設計されていること'
      ];
    } else {
      controllable = [
        '今、自分の意思で体を動かすこと（飲む・立つ・書く）',
        '目の前にあるたった1つの物事に意識を絞ること',
        '「今は不安でも大丈夫」と自分の感情を受け入れること'
      ];
      uncontrollable = [
        '過去に起きたこと・言ってしまったこと',
        '自分以外の他人の心や考え方',
        'まだ起きてもいない未来への想像や確率'
      ];
    }

    return { controllable, uncontrollable, note };
  }

  /**
   * 生のJSON文字列または配列から安全な履歴データを抽出・検証・サニタイズする純粋関数。
   * @param {unknown} rawData
   * @returns {{ entries: HistoryEntry[], isCorrupted: boolean }}
   */
  function parseAndValidateHistory(rawData) {
    if (!rawData) return { entries: [], isCorrupted: false };
    let parsed;
    if (typeof rawData === 'string') {
      try {
        parsed = JSON.parse(rawData);
      } catch (e) {
        return { entries: [], isCorrupted: true };
      }
    } else {
      parsed = rawData;
    }

    if (!Array.isArray(parsed)) {
      return { entries: [], isCorrupted: true };
    }

    let isCorrupted = false;
    /** @type {HistoryEntry[]} */
    const entries = [];

    for (const item of parsed) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'number' &&
        !isNaN(item.id) &&
        typeof item.text === 'string' &&
        typeof item.action === 'string'
      ) {
        const dateStr = typeof item.date === 'string' ? item.date.slice(0, 50) : '';
        entries.push({
          id: item.id,
          text: sanitizeInput(item.text).slice(0, 100),
          action: sanitizeInput(item.action).slice(0, 100),
          date: dateStr || new Date().toLocaleDateString('ja-JP')
        });
      } else {
        isCorrupted = true;
      }
    }

    return { entries: entries.slice(0, MAX_HISTORY_ENTRIES), isCorrupted };
  }

  /* ==========================================================================
     状態管理 (Application State)
     ========================================================================== */

  const State = {
    currentActionIndex: 0,
    /** @type {string[]} */
    currentControllable: [],
    /** @type {string[]} */
    currentUncontrollable: [],
    isSoundEnabled: false,
    isTimerViewExpanded: true,
    /** @type {TimerState} */
    timer: {
      intervalId: null,
      remainingSeconds: TOTAL_SECONDS,
      startTimestamp: null,
      elapsedBeforePause: 0,
      isRunning: false
    }
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

  /**
   * ユーザー操作ジェスチャー時にオーディオコンテキストをアンロックする。
   */
  function primeAudio() {
    if (!isAudioSupported) return;
    try {
      const ctx = getAudioContext();
      if (ctx && typeof ctx.resume === 'function' && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch (e) {}
  }

  /**
   * タイマー完了チャイム音を合成再生する。
   */
  function playChime() {
    if (!isAudioSupported || !State.isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(CHIME_START_FREQ, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(CHIME_END_FREQ, ctx.currentTime + CHIME_RAMP_DURATION);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + CHIME_TOTAL_DURATION);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + CHIME_TOTAL_DURATION);
    } catch (e) {
      console.warn('Audio chime failed:', e);
    }
  }

  /* ==========================================================================
     LocalStorage マイグレーション & 自己修復管理
     ========================================================================== */

  /**
   * LocalStorageから履歴を安全に取得する。
   * 旧キーからの自動マイグレーションと破損修復を行う。
   * @returns {HistoryEntry[]}
   */
  function getSafeHistory() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      // 旧バージョン（v1）キーからの自動マイグレーション
      if (!raw) {
        const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
        if (oldRaw) {
          const { entries: oldEntries } = parseAndValidateHistory(oldRaw);
          if (oldEntries.length > 0) {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(oldEntries));
              localStorage.removeItem(OLD_STORAGE_KEY);
            } catch (e) {}
            return oldEntries;
          }
        }
        return [];
      }

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (parseErr) {
        console.warn('Corrupt JSON in moyamoya history, auto-repairing:', parseErr);
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        return [];
      }

      if (!Array.isArray(parsed)) {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        return [];
      }

      const { entries: validEntries, isCorrupted } = parseAndValidateHistory(parsed);
      if (isCorrupted || parsed.length > MAX_HISTORY_ENTRIES) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(validEntries));
        } catch (e) {}
      }

      return validEntries;
    } catch (e) {
      return [];
    }
  }

  /* ==========================================================================
     DOMバインディング & イベント初期化
     ========================================================================== */

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      const DOM = {
        moyamoyaText: document.getElementById('moyamoyaText'),
        charCount: document.getElementById('charCount'),
        presetChips: document.getElementById('presetChips'),
        sortBtn: document.getElementById('sortBtn'),
        resultSection: document.getElementById('resultSection'),
        personalizedNote: document.getElementById('personalizedNote'),
        controllableList: document.getElementById('controllableList'),
        uncontrollableList: document.getElementById('uncontrollableList'),
        actionIcon: document.getElementById('actionIcon'),
        actionText: document.getElementById('actionText'),
        actionReason: document.getElementById('actionReason'),
        shuffleActionBtn: document.getElementById('shuffleActionBtn'),
        quickEditBtn: document.getElementById('quickEditBtn'),
        selectedActionCard: document.querySelector('.selected-action-card'),

        // タイマー
        timerCard: document.getElementById('timerCard'),
        timerDigits: document.getElementById('timerDigits'),
        timerProgress: document.getElementById('timerProgress'),
        startTimerBtn: document.getElementById('startTimerBtn'),
        resetTimerBtn: document.getElementById('resetTimerBtn'),
        timerMessage: document.getElementById('timerMessage'),
        soundToggleBtn: document.getElementById('soundToggleBtn'),
        soundIcon: document.getElementById('soundIcon'),
        soundLabel: document.getElementById('soundLabel'),

        // デュアルアクション選択肢 & 今すぐ行動バナー
        actNowBtn: document.getElementById('actNowBtn'),
        toggleTimerViewBtn: document.getElementById('toggleTimerViewBtn'),
        actNowCompleteBanner: document.getElementById('actNowCompleteBanner'),
        closeActNowBannerBtn: document.getElementById('closeActNowBannerBtn'),
        actNowDoneBtn: document.getElementById('actNowDoneBtn'),

        // アクション・履歴・支援技術
        copyResultBtn: document.getElementById('copyResultBtn'),
        shareXBtn: document.getElementById('shareXBtn'),
        retryBtn: document.getElementById('retryBtn'),
        historyList: document.getElementById('historyList'),
        clearHistoryBtn: document.getElementById('clearHistoryBtn'),
        confettiCanvas: document.getElementById('confettiCanvas'),
        a11yAnnouncer: document.getElementById('a11yAnnouncer')
      };

      /**
       * 支援技術向けライブ通知を発行する（非同期遅延による確実なスクリーンリーダー検知）
       * @param {string} msg - 通知メッセージ
       */
      let announceTimerId = null;
      function announceA11y(msg) {
        if (DOM.a11yAnnouncer) {
          DOM.a11yAnnouncer.textContent = '';
          if (announceTimerId) clearTimeout(announceTimerId);
          announceTimerId = setTimeout(() => {
            DOM.a11yAnnouncer.textContent = msg;
          }, A11Y_ANNOUNCE_DELAY_MS);
        }
      }

      // 1. 文字数カウンター & キーボードショートカット
      DOM.moyamoyaText.addEventListener('input', () => {
        const len = DOM.moyamoyaText.value.length;
        DOM.charCount.textContent = `${len}文字`;
        if (len >= CHAR_COUNT_MAX_THRESHOLD) {
          DOM.charCount.classList.add('char-count-max');
          DOM.charCount.classList.remove('char-count-warn');
        } else if (len >= CHAR_COUNT_WARN_THRESHOLD) {
          DOM.charCount.classList.add('char-count-warn');
          DOM.charCount.classList.remove('char-count-max');
        } else {
          DOM.charCount.classList.remove('char-count-warn', 'char-count-max');
        }
      });

      DOM.moyamoyaText.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          DOM.sortBtn.click();
        }
      });

      // 2. プリセット委譲（Event Delegation）
      DOM.presetChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip-btn');
        if (!chip) return;

        DOM.presetChips.querySelectorAll('.chip-btn').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-pressed', 'true');

        const currentVal = DOM.moyamoyaText.value.trim();
        const chipText = chip.dataset.text;
        if (!currentVal) {
          DOM.moyamoyaText.value = chipText;
        } else if (!currentVal.includes(chipText)) {
          DOM.moyamoyaText.value = `${currentVal}\nまた、${chipText}`;
        }
        const newLen = DOM.moyamoyaText.value.length;
        DOM.charCount.textContent = `${newLen}文字`;
        DOM.moyamoyaText.focus();
      });

      // 3. サウンドトグル（支援技術対応・重複クエリ排除）
      DOM.soundToggleBtn.addEventListener('click', () => {
        primeAudio();
        State.isSoundEnabled = !State.isSoundEnabled;
        DOM.soundToggleBtn.setAttribute('aria-pressed', State.isSoundEnabled.toString());
        DOM.soundToggleBtn.classList.toggle('muted', !State.isSoundEnabled);
        if (DOM.soundIcon) {
          DOM.soundIcon.textContent = State.isSoundEnabled ? '🔔' : '🔕';
        }
        if (DOM.soundLabel) {
          DOM.soundLabel.textContent = State.isSoundEnabled ? '音あり' : '消音中';
        }
        if (State.isSoundEnabled) {
          playChime();
        }
        announceA11y(State.isSoundEnabled ? 'タイマー音を有効にしました' : 'タイマー音を消音にしました');
      });

      // 3.5 デュアルアクション選択肢（今すぐ行動する vs タイマー）
      if (DOM.actNowBtn) {
        DOM.actNowBtn.addEventListener('click', () => {
          primeAudio();
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try { navigator.vibrate([80, 50, 80]); } catch (e) {}
          }
          if (State.isSoundEnabled) {
            playChime();
          }
          const currentAction = ACTION_DATABASE[State.currentActionIndex]?.action || '最小の一歩';
          saveHistory(DOM.moyamoyaText.value.trim() || '漠然としたモヤモヤ', `[即行動] ${currentAction}`);
          if (DOM.actNowCompleteBanner) {
            DOM.actNowCompleteBanner.classList.remove('hidden');
            DOM.actNowCompleteBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          announceA11y('今すぐ行動モードを選択しました。素晴らしい決断です！');
        });
      }

      if (DOM.closeActNowBannerBtn) {
        DOM.closeActNowBannerBtn.addEventListener('click', () => {
          if (DOM.actNowCompleteBanner) DOM.actNowCompleteBanner.classList.add('hidden');
        });
      }

      if (DOM.actNowDoneBtn) {
        DOM.actNowDoneBtn.addEventListener('click', () => {
          if (DOM.actNowCompleteBanner) DOM.actNowCompleteBanner.classList.add('hidden');
          announceA11y('最初の一歩に集中しましょう！応援しています。');
        });
      }

      if (DOM.toggleTimerViewBtn) {
        DOM.toggleTimerViewBtn.addEventListener('click', () => {
          State.isTimerViewExpanded = !State.isTimerViewExpanded;
          DOM.toggleTimerViewBtn.setAttribute('aria-expanded', State.isTimerViewExpanded.toString());
          if (DOM.timerCard) {
            DOM.timerCard.classList.toggle('hidden', !State.isTimerViewExpanded);
            if (State.isTimerViewExpanded) {
              DOM.timerCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
          announceA11y(State.isTimerViewExpanded ? 'タイマーを表示しました' : 'タイマーを非表示にしました');
        });
      }

      // 4. アクション描画
      function renderAction() {
        DOM.selectedActionCard.classList.add('fade-switch');
        setTimeout(() => {
          const item = ACTION_DATABASE[State.currentActionIndex];
          DOM.actionIcon.textContent = item.icon;
          DOM.actionText.textContent = item.action;
          DOM.actionReason.textContent = item.reason;
          DOM.selectedActionCard.classList.remove('fade-switch');
        }, ACTION_SWITCH_FADE_MS);
      }

      // 5. 「仕分ける」ボタン
      DOM.sortBtn.addEventListener('click', () => {
        primeAudio();
        const rawText = sanitizeInput(DOM.moyamoyaText.value).trim();
        const { controllable, uncontrollable, note } = analyzeMoyamoya(rawText);

        State.currentControllable = controllable;
        State.currentUncontrollable = uncontrollable;

        DOM.personalizedNote.innerHTML = note;
        DOM.controllableList.innerHTML = controllable.map(item => `<li><span style="color: var(--c-green); font-weight: bold;" aria-hidden="true">✔</span> <span>${escapeHtml(item)}</span></li>`).join('');
        DOM.uncontrollableList.innerHTML = uncontrollable.map(item => `<li><span style="color: var(--c-text-muted); font-weight: bold;" aria-hidden="true">✕</span> <span>${escapeHtml(item)}</span></li>`).join('');

        State.currentActionIndex = Math.floor(Math.random() * ACTION_DATABASE.length);
        renderAction();

        DOM.resultSection.classList.remove('hidden');
        DOM.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        saveHistory(rawText || '漠然としたモヤモヤ', ACTION_DATABASE[State.currentActionIndex].action);
        announceA11y('仕分けが完了しました。変えられることと2分アクションを確認してください。');
      });

      DOM.shuffleActionBtn.addEventListener('click', () => {
        State.currentActionIndex = (State.currentActionIndex + 1) % ACTION_DATABASE.length;
        renderAction();
        announceA11y(`別のアクションを提案しました：${ACTION_DATABASE[State.currentActionIndex].action}`);
      });

      DOM.quickEditBtn.addEventListener('click', () => {
        DOM.moyamoyaText.focus();
        DOM.moyamoyaText.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });

      // 6. ドリフト補正付き高精度2分タイマー
      function updateTimerUI(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        DOM.timerDigits.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        const offset = calcTimerOffset(seconds, TOTAL_SECONDS, CIRCLE_CIRCUMFERENCE);
        DOM.timerProgress.style.strokeDashoffset = offset;
      }

      function tickTimer() {
        const now = Date.now();
        const elapsedTotalMs = State.timer.elapsedBeforePause + (now - State.timer.startTimestamp);
        const elapsedSec = Math.floor(elapsedTotalMs / 1000);
        const rem = Math.max(0, TOTAL_SECONDS - elapsedSec);

        State.timer.remainingSeconds = rem;
        updateTimerUI(rem);

        if (rem <= 0) {
          clearInterval(State.timer.intervalId);
          State.timer.intervalId = null;
          State.timer.isRunning = false;
          State.timer.remainingSeconds = 0;
          State.timer.elapsedBeforePause = 0;
          playChime();
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try { navigator.vibrate([80, 50, 80]); } catch (e) {}
          }
          triggerConfetti(DOM.confettiCanvas);
          DOM.startTimerBtn.textContent = '🎉 2分完了！（もう一度スタート）';
          DOM.startTimerBtn.style.background = 'var(--c-green)';
          DOM.timerMessage.innerHTML = '🌟 <strong>2分間やり切りました！</strong> 小さな一歩を踏み出せた自分をうんと褒めてあげてください！';
          announceA11y('2分間が完了しました！お疲れ様でした。');
        }
      }

      DOM.startTimerBtn.addEventListener('click', () => {
        primeAudio();

        if (State.timer.isRunning) {
          // 一時停止
          clearInterval(State.timer.intervalId);
          State.timer.intervalId = null;
          State.timer.isRunning = false;
          State.timer.elapsedBeforePause += Date.now() - State.timer.startTimestamp;
          DOM.startTimerBtn.textContent = '▶ 再開する';
          DOM.startTimerBtn.style.background = 'var(--c-primary)';
          DOM.timerProgress.classList.add('paused');
          DOM.timerMessage.textContent = '⏸ 一時停止中：無理せず、自分のペースで大丈夫ですよ。';
          announceA11y('タイマーを一時停止しました');
          return;
        }

        // もし既に完了していた場合、リセットして新規スタート
        if (State.timer.remainingSeconds <= 0) {
          stopConfetti();
          State.timer.elapsedBeforePause = 0;
          State.timer.remainingSeconds = TOTAL_SECONDS;
          updateTimerUI(TOTAL_SECONDS);
        }

        // 開始 / 再開
        State.timer.isRunning = true;
        State.timer.startTimestamp = Date.now();
        DOM.timerProgress.classList.remove('paused');
        DOM.startTimerBtn.textContent = '⏸ 一時停止';
        DOM.startTimerBtn.style.background = '#d97706';
        DOM.resetTimerBtn.classList.remove('hidden');
        DOM.timerMessage.textContent = '✨ 2分間集中中… 他のことは忘れて、この一歩だけ向き合いましょう。';
        announceA11y('2分間タイマーを開始しました');

        if (State.timer.intervalId) clearInterval(State.timer.intervalId);
        State.timer.intervalId = setInterval(tickTimer, TIMER_TICK_INTERVAL_MS);
      });

      DOM.resetTimerBtn.addEventListener('click', () => {
        if (State.timer.intervalId) {
          clearInterval(State.timer.intervalId);
          State.timer.intervalId = null;
        }
        stopConfetti();
        State.timer.isRunning = false;
        State.timer.startTimestamp = null;
        State.timer.elapsedBeforePause = 0;
        State.timer.remainingSeconds = TOTAL_SECONDS;

        updateTimerUI(TOTAL_SECONDS);
        DOM.timerProgress.classList.remove('paused');
        DOM.startTimerBtn.textContent = '▶ 2分間スタート';
        DOM.startTimerBtn.style.background = 'var(--c-green)';
        DOM.resetTimerBtn.classList.add('hidden');
        DOM.timerMessage.textContent = '「あれこれ考えず、この2分だけ目の前のこと（または呼吸）に集中しましょう」';
        announceA11y('タイマーをリセットしました');
      });

      // タブ復帰時のタイマー即時同期（バックグラウンドスロットリング対策）
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && State.timer.isRunning) {
          tickTimer();
        }
      });

      // 7. 軽量・FPS安定化紙吹雪パーティクル
      let confettiAnimId = null;

      function stopConfetti() {
        if (confettiAnimId) {
          cancelAnimationFrame(confettiAnimId);
          confettiAnimId = null;
        }
        if (DOM.confettiCanvas) {
          const ctx = DOM.confettiCanvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, DOM.confettiCanvas.width, DOM.confettiCanvas.height);
          }
        }
      }

      function triggerConfetti(canvas) {
        if (!canvas) return;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.scale(dpr, dpr);

        const width = window.innerWidth;
        const height = window.innerHeight;

        const particles = Array.from({ length: CONFETTI_COUNT }, () => ({
          x: Math.random() * width,
          y: Math.random() * -height,
          r: Math.random() * 6 + 4,
          d: Math.random() * 50,
          color: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'][Math.floor(Math.random() * 5)],
          tilt: Math.random() * 10 - 10,
          tiltAngle: 0,
          tiltAngleInc: Math.random() * 0.07 + 0.05
        }));

        let frameCount = 0;
        if (confettiAnimId) cancelAnimationFrame(confettiAnimId);

        function draw() {
          ctx.clearRect(0, 0, width, height);
          particles.forEach(p => {
            p.tiltAngle += p.tiltAngleInc;
            p.y += (Math.cos(p.d) + 3 + p.r / 2) / 1.5;
            p.x += Math.sin(p.d);
            p.tilt = Math.sin(p.tiltAngle) * 15;

            ctx.beginPath();
            ctx.lineWidth = p.r;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
            ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
            ctx.stroke();
          });

          frameCount++;
          if (frameCount < CONFETTI_MAX_FRAMES) {
            confettiAnimId = requestAnimationFrame(draw);
          } else {
            ctx.clearRect(0, 0, width, height);
            confettiAnimId = null;
          }
        }
        draw();
      }

      // 8. コピー & シェア
      function copyTextSecure(text, btn) {
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(() => showCopiedFeedback(btn)).catch(() => fallbackCopy(text, btn));
        } else {
          fallbackCopy(text, btn);
        }
      }

      function fallbackCopy(text, btn) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          showCopiedFeedback(btn);
        } catch (err) {}
        document.body.removeChild(ta);
      }

      function showCopiedFeedback(btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span aria-hidden="true">✅</span> コピーしました！';
        announceA11y('結果をクリップボードにコピーしました');
        setTimeout(() => { btn.innerHTML = originalText; }, FEEDBACK_DURATION_MS);
      }

      DOM.copyResultBtn.addEventListener('click', () => {
        const textToCopy = `【モヤモヤ仕分け結果】
今変えられること：
・${State.currentControllable.join('\n・')}

今すぐできる2分の一歩：
${DOM.actionText.textContent}

（KatakataLab モヤモヤ仕分け機）
https://katakatalab.com/moyamoya-sorter/`;

        copyTextSecure(textToCopy, DOM.copyResultBtn);
      });

      DOM.shareXBtn.addEventListener('click', () => {
        const tweetText = encodeURIComponent(`頭のモヤモヤを整理して、今できる「2分の一歩」を決めました！
👉「${DOM.actionText.textContent}」

全部を今日解決しなくていい。小さな一歩で100点満点🌱
#モヤモヤ仕分け機 #KatakataLab`);
        const shareUrl = encodeURIComponent('https://katakatalab.com/moyamoya-sorter/');
        const popup = window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${shareUrl}`, '_blank', 'noopener,noreferrer');
        if (popup) popup.opener = null;
      });

      DOM.retryBtn.addEventListener('click', () => {
        stopConfetti();
        DOM.moyamoyaText.value = '';
        DOM.charCount.textContent = '0文字';
        DOM.charCount.classList.remove('char-count-warn', 'char-count-max');
        DOM.presetChips.querySelectorAll('.chip-btn').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-pressed', 'false');
        });
        DOM.resultSection.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        DOM.moyamoyaText.focus();
      });

      // 9. 履歴管理（QuotaExceededError自己回復 & DocumentFragment描画）
      function saveHistory(text, actionName) {
        try {
          const history = getSafeHistory();
          const cleanText = sanitizeInput(text);
          const shortText = cleanText.slice(0, HISTORY_SNIPPET_MAX_LEN) + (cleanText.length > HISTORY_SNIPPET_MAX_LEN ? '…' : '');
          const cleanAction = sanitizeInput(actionName);
          if (history.length > 0 && history[0].text === shortText && history[0].action === cleanAction) {
            return;
          }
          const newEntry = {
            id: Date.now(),
            text: shortText,
            action: cleanAction,
            date: new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          };
          history.unshift(newEntry);
          const clamped = history.slice(0, MAX_HISTORY_ENTRIES);

          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped));
          } catch (quotaErr) {
            console.warn('LocalStorage quota exceeded in saveHistory, attempting eviction:', quotaErr);
            try {
              if (clamped.length > 1) {
                clamped.pop();
                localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped));
              }
            } catch (retryErr) {}
          }
          renderHistory();
        } catch (e) {
          console.warn('LocalStorage save failed:', e);
          renderHistory();
        }
      }

      function deleteHistoryItem(id) {
        try {
          let history = getSafeHistory();
          history = history.filter(item => item.id !== id);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
          renderHistory();
          announceA11y('履歴項目を削除しました');
        } catch (e) {}
      }

      DOM.clearHistoryBtn.addEventListener('click', () => {
        if (confirm('保存されているモヤモヤ履歴をすべて削除しますか？')) {
          try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
          renderHistory();
          announceA11y('すべてのモヤモヤ履歴を削除しました');
        }
      });

      DOM.historyList.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.history-del-btn');
        if (!delBtn) return;
        deleteHistoryItem(Number(delBtn.dataset.id));
      });

      function renderHistory() {
        try {
          const history = getSafeHistory();
          if (history.length === 0) {
            DOM.historyList.innerHTML = '<div style="font-size: 0.85rem; color: var(--c-text-light);">まだ記録はありません。仕分けを実行するとここに表示されます。</div>';
            DOM.clearHistoryBtn.classList.add('hidden');
            return;
          }
          DOM.clearHistoryBtn.classList.remove('hidden');
          DOM.historyList.innerHTML = '';

          const frag = document.createDocumentFragment();
          history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.setAttribute('role', 'listitem');

            const info = document.createElement('div');
            info.className = 'history-info';

            const textSpan = document.createElement('span');
            textSpan.className = 'history-text';
            textSpan.textContent = `🌱 ${item.text}`;

            const actionSpan = document.createElement('span');
            actionSpan.className = 'history-action-taken';
            actionSpan.textContent = `一歩：${item.action}（${item.date}）`;

            info.appendChild(textSpan);
            info.appendChild(actionSpan);

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'history-del-btn';
            delBtn.title = 'この記録を削除';
            delBtn.dataset.id = String(item.id);
            delBtn.setAttribute('aria-label', `${item.text} の記録を削除`);
            delBtn.textContent = '✕';

            div.appendChild(info);
            div.appendChild(delBtn);
            frag.appendChild(div);
          });
          DOM.historyList.appendChild(frag);
        } catch (e) {}
      }

      renderHistory();
    });
  }

  /* ==========================================================================
     テスト・外部互換用エクスポート
     ========================================================================== */

  const MoyamoyaLogic = {
    STORAGE_KEY,
    OLD_STORAGE_KEY,
    TOTAL_SECONDS,
    CIRCLE_RADIUS,
    CIRCLE_CIRCUMFERENCE,
    CHAR_COUNT_WARN_THRESHOLD,
    CHAR_COUNT_MAX_THRESHOLD,
    MAX_INPUT_LENGTH,
    TIMER_TICK_INTERVAL_MS,
    CONFETTI_COUNT,
    CONFETTI_MAX_FRAMES,
    MAX_HISTORY_ENTRIES,
    HISTORY_SNIPPET_MAX_LEN,
    ACTION_SWITCH_FADE_MS,
    FEEDBACK_DURATION_MS,
    ACTION_DATABASE,
    calcTimerOffset,
    analyzeMoyamoya,
    sanitizeInput,
    escapeHtml,
    parseAndValidateHistory,
    getSafeHistory
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MoyamoyaLogic;
  }
  if (typeof window !== 'undefined') {
    window.MoyamoyaLogic = MoyamoyaLogic;
  }
})();
