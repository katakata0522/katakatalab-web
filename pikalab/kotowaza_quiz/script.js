/**
 * ことわざクイズ - script.js
 * 
 * 2つのゲームモード:
 * - meaning: 意味当て（4択）
 * - fillin: 穴埋め（入力）
 * 
 * 難易度システム: 1=初級, 2=中級, 3=上級
 * 問題は難易度順に出題される
 */

// ============================================
// CONFIG
// ============================================
const CONFIG = {
    STORAGE_KEY: 'kotowaza_quiz_highscore',
    FEEDBACK_DELAY_MS: 1500,
    COMBO_POPUP_MS: 1200,
    CONFETTI_DURATION_MS: 3000,

    // 難易度ラベル
    DIFFICULTY_LABELS: {
        1: { text: '★初級', class: 'level-1' },
        2: { text: '★★中級', class: 'level-2' },
        3: { text: '★★★上級', class: 'level-3' }
    },

    GRADES: [
        { min: 100, emoji: '🏆', text: '完璧！天才！' },
        { min: 90, emoji: '🥇', text: '素晴らしい！' },
        { min: 80, emoji: '🥈', text: 'とても良い！' },
        { min: 70, emoji: '🥉', text: '良いね！' },
        { min: 50, emoji: '📚', text: 'もう少し！' },
        { min: 0, emoji: '💪', text: 'がんばろう！' }
    ]
};

// ============================================
// ストレージマネージャー
// ============================================
const StorageManager = {
    _getData() {
        try {
            const data = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '{}');
            return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
        } catch {
            return {};
        }
    },

    getHighScore(mode, count, category = 'all', difficulty = 'all') {
        // 新しいキー形式を試す
        const newKey = `${mode}_${count}_${category}_${difficulty}`;
        const data = this._getData();
        const isValidScore = (score) => Number.isFinite(score) && score >= 0;
        if (isValidScore(data[newKey])) return data[newKey];

        // 互換性: カテゴリ/難易度がallの場合は旧キーも確認
        if (category === 'all' && difficulty === 'all') {
            const oldKey = `${mode}_${count}`;
            return isValidScore(data[oldKey]) ? data[oldKey] : 0;
        }

        return 0;
    },

    saveHighScore(mode, count, score, category = 'all', difficulty = 'all') {
        if (!Number.isFinite(score) || score < 0) return false;
        try {
            const key = `${mode}_${count}_${category}_${difficulty}`;
            const data = this._getData();
            const currentHigh = this.getHighScore(mode, count, category, difficulty);

            const isNewRecord = score > currentHigh;
            if (isNewRecord) {
                data[key] = score;
                // 後方互換性: all/allの場合は旧キーも更新しておく
                if (category === 'all' && difficulty === 'all') {
                    data[`${mode}_${count}`] = score;
                }
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
            }
            return isNewRecord;
        } catch {
            return false;
        }
    }
};

// ============================================
// サウンドマネージャー
// ============================================
const SoundManager = {
    audioContext: null,
    isMuted: false,
    volumeRatio: 0.1, // デフォルト (db = -20)

    loadVolume() {
        this.isMuted = false;
        this.volumeRatio = 0.1;
        try {
            const data = JSON.parse(localStorage.getItem('wonder_school_profile_v2') || '{}');
            if (!data || typeof data !== 'object' || Array.isArray(data)) return;
            this.isMuted = data.isMuted === true;
            if (Number.isFinite(data.volumeDb)) {
                const db = Math.max(-40, Math.min(0, data.volumeDb));
                this.volumeRatio = db <= -40 ? 0 : Math.pow(10, db / 40);
                if (db <= -40) this.isMuted = true;
            }
        } catch { /* 保存領域が使えなくてもクイズは続けられる。 */ }
    },

    init() {
        if (typeof window === 'undefined') return;
        this.loadVolume();
        if (this.isMuted) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            if (!this.audioContext || this.audioContext.state === 'closed') this.audioContext = new AudioContextClass();
            this.resume();
        } catch { /* 音声が利用不可でも採点を止めない。 */ }
    },

    suspend() {
        try {
            if (this.audioContext?.state === 'running') Promise.resolve(this.audioContext.suspend()).catch(() => {});
        } catch { /* 音声が利用不可でも画面操作を続ける。 */ }
    },

    resume() {
        try {
            if (this.audioContext?.state === 'suspended' && !this.isMuted && !isPaused()) Promise.resolve(this.audioContext.resume()).catch(() => {});
        } catch { /* 音声が利用不可でも画面操作を続ける。 */ }
    },

    play(type) {
        this.init();
        if (!this.audioContext || this.isMuted || isPaused()) return;
        const tone = (frequency, wave, gainValue, delay, duration) => {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            oscillator.connect(gain);
            gain.connect(this.audioContext.destination);
            oscillator.frequency.value = frequency;
            oscillator.type = wave;
            gain.gain.value = gainValue * this.volumeRatio;
            oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
            const start = this.audioContext.currentTime + delay;
            oscillator.start(start);
            oscillator.stop(start + duration);
        };
        try {
            if (type === 'correct') tone(880, 'sine', 0.1, 0, 0.15);
            else if (type === 'wrong') tone(220, 'sawtooth', 0.08, 0, 0.2);
            else if (type === 'perfect') [523, 659, 784].forEach((frequency, index) => tone(frequency, 'sine', 0.08, index * 0.12, 0.2));
        } catch { /* 音声が利用不可でも採点を止めない。 */ }
    }
};

// ============================================
// ゲーム状態
// ============================================
let gameState = {
    mode: 'meaning',        // 'meaning' or 'fillin'
    questionCount: 20,      // 問題数
    questions: [],          // 出題リスト
    currentIndex: 0,        // 現在の問題番号
    correctCount: 0,        // 正解数
    wrongCount: 0,          // 不正解数
    streak: 0,              // 連続正解数
    totalScore: 0,          // 総合スコア
    phase: 'idle',          // idle / question / feedback / result
    generation: 0,          // 古い画面の非同期処理を無効にする
    questionElapsedMs: 0,
    questionActiveSince: null,
    feedbackRemainingMs: 0,
    feedbackActiveSince: null,
    focusTimer: null,
    effectTimer: null,
    effectCleanupTimer: null,
    composing: false,
    pageHidden: false,
    currentQuestion: null,  // 現在の問題データ
    answered: false,        // 回答済みフラグ
    hintUsed: false,        // ヒント使用フラグ
    wrongQuestions: [],     // 間違えた問題リスト
    nextQuestionTimer: null, // 次問題遷移タイマー
    isReviewMode: false,    // 復習モードフラグ
    originalMode: null,     // 復習前のモードを保持
    config: {               // 設定
        category: 'all',    // all, kotowaza, yojijukugo
        difficulty: 'all'   // all, 1, 2, 3
    }
};

// ============================================
// DOM要素
// ============================================
let elements = {};

function initializeElements() {
    const ids = [
        'start-screen', 'game-screen', 'result-screen',
        'progress-fill', 'progress-text',
        'question-label', 'question-text', 'difficulty-badge',
        'choices-area', 'fillin-area', 'fillin-input',
        'hint-btn', 'submit-btn', 'quit-btn', 'feedback',
        'correct-count', 'wrong-count', 'accuracy-rate',
        'score-points', 'result-total-score',
        'result-correct', 'result-accuracy', 'result-highscore', 'result-grade',
        'result-title-badge', 'review-section', 'review-btn', 'wrong-answer-list',
        'retry-btn', 'home-btn'
    ];

    ids.forEach(id => {
        const key = id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        elements[key] = document.getElementById(id);
    });

    // 選択肢ボタン
    elements.choiceBtns = document.querySelectorAll('.choice-btn');
    // 設定ボタン
    elements.categoryBtns = document.querySelectorAll('#category-select .btn-config');
    elements.difficultyBtns = document.querySelectorAll('#difficulty-select .btn-config');
    elements.countBtns = document.querySelectorAll('.btn-count');
}

function applyPortalSettings() {
    try {
        const portalRaw = localStorage.getItem('wonder_school_profile_v2');
        if (portalRaw) {
            const portalData = JSON.parse(portalRaw);
            if (!portalData || typeof portalData !== 'object' || Array.isArray(portalData)) return;
            if (portalData.textSize === 'large') {
                document.body.classList.add('text-large');
            }
            if (portalData.reduceMotion === true) {
                document.body.classList.add('reduce-motion');
            }
        }
    } catch { /* 保存設定が壊れていても標準表示で開始する。 */ }
}

// ============================================
// ユーティリティ
// ============================================
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function normalizeKanaToHiragana(text) {
    if (typeof text !== 'string') return '';
    return Array.from(text.normalize('NFKC')).map((char) => {
        const code = char.charCodeAt(0);
        if (code >= 0x30A1 && code <= 0x30F6) {
            return String.fromCharCode(code - 0x60);
        }
        return char;
    }).join('');
}

function sanitizeFillinInput(text) {
    return normalizeKanaToHiragana(String(text || '')).replace(/\s+/g, '').trim();
}

// 正答ボーナスと遷移待ちは壁時計変更や非表示タブの時間に影響されない。
function monotonicNow() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function isPaused() {
    return gameState.pageHidden || (typeof document !== 'undefined' && document.hidden);
}

function canAnswer(mode) {
    return gameState.phase === 'question' && gameState.mode === mode && !isPaused()
        && !gameState.answered && !!gameState.currentQuestion
        && !!elements.gameScreen?.classList.contains('active');
}

function clearPendingNextQuestion() {
    if (gameState.nextQuestionTimer !== null) clearTimeout(gameState.nextQuestionTimer);
    gameState.nextQuestionTimer = null;
    gameState.feedbackActiveSince = null;
}

function resumeNextQuestion() {
    if (gameState.phase !== 'feedback' || isPaused() || gameState.nextQuestionTimer !== null) return;
    const generation = gameState.generation;
    gameState.feedbackActiveSince = monotonicNow();
    const timer = setTimeout(() => {
        if (generation !== gameState.generation || gameState.nextQuestionTimer !== timer) return;
        gameState.nextQuestionTimer = null;
        gameState.feedbackRemainingMs = 0;
        gameState.feedbackActiveSince = null;
        if (gameState.phase !== 'feedback' || isPaused()) return;
        nextQuestion();
    }, gameState.feedbackRemainingMs);
    gameState.nextQuestionTimer = timer;
}

function scheduleNextQuestion() {
    clearPendingNextQuestion();
    gameState.phase = 'feedback';
    gameState.questionActiveSince = null;
    gameState.feedbackRemainingMs = CONFIG.FEEDBACK_DELAY_MS;
    resumeNextQuestion();
}

function updatePauseState() {
    const now = monotonicNow();
    if (isPaused()) {
        if (gameState.questionActiveSince !== null) {
            gameState.questionElapsedMs += Math.max(0, now - gameState.questionActiveSince);
            gameState.questionActiveSince = null;
        }
        if (gameState.feedbackActiveSince !== null) {
            gameState.feedbackRemainingMs = Math.max(0, gameState.feedbackRemainingMs - (now - gameState.feedbackActiveSince));
            clearPendingNextQuestion();
        }
        SoundManager.suspend();
    } else {
        if (gameState.phase === 'question' && gameState.questionActiveSince === null) gameState.questionActiveSince = now;
        resumeNextQuestion();
        SoundManager.resume();
    }
}

function clearEffects() {
    for (const name of ['effectTimer', 'effectCleanupTimer']) {
        if (gameState[name] !== null) clearTimeout(gameState[name]);
        gameState[name] = null;
    }
    if (typeof document !== 'undefined') document.querySelectorAll('.combo-popup, .confetti').forEach(node => node.remove());
}

function scheduleEffectCleanup(delay) {
    const generation = gameState.generation;
    const timer = setTimeout(() => {
        if (generation === gameState.generation && gameState.effectCleanupTimer === timer) clearEffects();
    }, delay);
    gameState.effectCleanupTimer = timer;
}

function resetPendingWork() {
    gameState.generation++;
    clearPendingNextQuestion();
    clearEffects();
    if (gameState.focusTimer !== null) clearTimeout(gameState.focusTimer);
    gameState.focusTimer = null;
    gameState.composing = false;
}

function focusCurrentScreen(screenId) {
    if (gameState.focusTimer !== null) clearTimeout(gameState.focusTimer);
    const generation = gameState.generation;
    const timer = setTimeout(() => {
        if (generation !== gameState.generation || gameState.focusTimer !== timer) return;
        gameState.focusTimer = null;
        if (isPaused() || !document.getElementById(screenId)?.classList.contains('active')) return;
        if (document.getElementById('parents-modal')?.open) return;
        if (screenId === 'game-screen' && gameState.phase === 'question') {
            if (gameState.mode === 'fillin') elements.fillinInput?.focus();
            else elements.choiceBtns[0]?.focus();
        } else if (screenId === 'result-screen') elements.retryBtn?.focus();
        else if (screenId === 'start-screen') document.querySelector('.btn-mode')?.focus();
    }, 50);
    gameState.focusTimer = timer;
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    const target = document.getElementById(screenId) || elements.startScreen;
    target?.classList.add('active');
    focusCurrentScreen(target?.id || 'start-screen');
}

function returnHome() {
    resetPendingWork();
    gameState.phase = 'idle';
    gameState.currentQuestion = null;
    gameState.questionActiveSince = null;
    gameState.isReviewMode = false;
    showScreen('start-screen');
}

// ============================================
// 問題生成
// ============================================
let quizCatalog = null;
function getQuizCatalog() {
    if (quizCatalog) return quizCatalog;
    if (typeof IDIOMS_DB === 'undefined') return [];
    quizCatalog = ['kotowaza', 'yojijukugo'].flatMap(type =>
        (Array.isArray(IDIOMS_DB[type]) ? IDIOMS_DB[type] : [])
            .filter(item => item && typeof item.meaning === 'string' && item.meaning.trim()
                && typeof item.hiragana === 'string' && item.hiragana)
            .map(item => ({ ...item, type })));
    return quizCatalog;
}

function generateQuestions(count) {
    const byDifficulty = { 1: [], 2: [], 3: [] };
    for (const item of getQuizCatalog()) {
        const difficulty = item.difficulty || 2;
        if (gameState.config.category !== 'all' && item.type !== gameState.config.category) continue;
        if (gameState.config.difficulty !== 'all' && difficulty !== Number(gameState.config.difficulty)) continue;
        byDifficulty[difficulty]?.push(item);
    }
    const ordered = [1, 2, 3].flatMap(difficulty => shuffleArray(byDifficulty[difficulty]));
    const targetCount = count === 'all' ? ordered.length : Math.min(Math.max(0, Number(count) || 0), ordered.length);
    return ordered.slice(0, targetCount);
}

// 文言が異なっても答えとして成立する意味を、誤答の選択肢に混ぜない。
// 出典と判断範囲は MAINTENANCE.md に記録する。
const MEANING_OVERLAP_GROUPS = [
    [
        "猿も木から落ちる",
        "弘法も筆の誤り",
        "河童の川流れ"
    ],
    [
        "一石二鳥",
        "一挙両得"
    ],
    [
        "二兎を追う者は一兎をも得ず",
        "虻蜂取らず"
    ],
    [
        "大同小異",
        "五十歩百歩"
    ],
    [
        "晴耕雨読",
        "悠悠自適"
    ],
    [
        "無我夢中",
        "一心不乱"
    ],
    [
        "馬耳東風",
        "馬の耳に念仏"
    ],
    [
        "五里霧中",
        "暗中模索"
    ],
    [
        "転ばぬ先の杖",
        "備えあれば憂いなし",
        "用意周到"
    ],
    [
        "空前絶後",
        "前代未聞"
    ],
    [
        "四苦八苦",
        "七転八倒"
    ],
    [
        "危機一髪",
        "絶体絶命",
        "一触即発"
    ],
    [
        "継続は力なり",
        "石の上にも三年",
        "七転び八起き"
    ],
    [
        "試行錯誤",
        "失敗は成功の母",
        "七転び八起き"
    ],
    [
        "十人十色",
        "同床異夢"
    ],
    [
        "以心伝心",
        "目は口ほどに物を言う"
    ],
    [
        "馬の耳に念仏",
        "焼け石に水"
    ],
    [
        "因果応報",
        "身から出た錆",
        "情けは人の為ならず"
    ],
    [
        "羊頭狗肉",
        "有名無実"
    ],
    [
        "臨機応変",
        "魚心あれば水心"
    ],
    [
        "心機一転",
        "一念発起"
    ],
    [
        "犬も歩けば棒に当たる",
        "棚から牡丹餅"
    ]
];
const choicePoolCache = new WeakMap();
const GENERAL_DUMMY_MEANINGS = [
    '困難な状況でも、努力を続ければ必ず報われるということ。',
    '物事の始まりが順調であれば、終わりも良くなるということ。',
    '他人の行動を見て、自分の行いを反省し改めること。',
    'どんなに優れた人でも、時には失敗することがあるということ。',
    '一見無駄に見えることでも、後になって役立つことがあるということ。',
    '自分の力以上のことをしようとして、かえって失敗すること。',
    '日頃の準備が十分にできていれば、何が起きても心配ないということ。',
    'わずかな努力で、非常に大きな成果を得ることのたとえ。'
];
const GENERAL_OVERLAPS = [
    ['継続は力なり', '石の上にも三年', '七転び八起き'],
    [], ['人のふり見て我がふり直せ'],
    ['猿も木から落ちる', '弘法も筆の誤り', '河童の川流れ'],
    [], [], ['転ばぬ先の杖', '備えあれば憂いなし', '用意周到'], []
];

function getChoicePool(correctItem, allItems) {
    let cache = choicePoolCache.get(allItems);
    if (!cache) { cache = new Map(); choicePoolCache.set(allItems, cache); }
    const key = `${correctItem.kanji || correctItem.hiragana}\0${correctItem.meaning}`;
    if (cache.has(key)) return cache.get(key);
    const excluded = new Set([correctItem.kanji]);
    for (const group of MEANING_OVERLAP_GROUPS) {
        if (group.includes(correctItem.kanji)) group.forEach(name => excluded.add(name));
    }
    const seen = new Set([correctItem.meaning]);
    // 同じ意味文が別の項目にもある場合を含め、意味文単位で除外する。
    const source = allItems.length >= 4 ? allItems : [...allItems, ...getQuizCatalog()];
    const excludedMeanings = new Set(source.filter(item => item && excluded.has(item.kanji)).map(item => item.meaning));
    const pool = [];
    for (const item of source) {
        if (!item || typeof item.meaning !== 'string' || !item.meaning.trim()
            || excludedMeanings.has(item.meaning) || seen.has(item.meaning)) continue;
        seen.add(item.meaning);
        pool.push(item.meaning);
    }
    // 通常の全179問DBでは不要。データ不足時も同じ答えを複製しない。
    if (pool.length < 3) GENERAL_DUMMY_MEANINGS.forEach((meaning, index) => {
        if (!seen.has(meaning) && !GENERAL_OVERLAPS[index].includes(correctItem.kanji)) {
            seen.add(meaning);
            pool.push(meaning);
        }
    });
    cache.set(key, pool);
    return pool;
}

function sampleChoices(pool, count) {
    // 全候補を毎問シャッフルせず、仮想配列の交換3回だけで非復元抽出する。
    const moved = new Map();
    const chosen = [];
    for (let end = pool.length - 1; end >= 0 && chosen.length < count; end--) {
        const index = Math.floor(Math.random() * (end + 1));
        chosen.push(pool[moved.get(index) ?? index]);
        moved.set(index, moved.get(end) ?? end);
    }
    return chosen;
}

function generateChoices(correctItem, allItems) {
    if (!correctItem || typeof correctItem.meaning !== 'string') return [];
    const pool = getChoicePool(correctItem, Array.isArray(allItems) ? allItems : getQuizCatalog());
    return shuffleArray([correctItem.meaning, ...sampleChoices(pool, 3)]);
}

// 穴の漢字と読みを対で保持する。文字数から読みの境界を推測しない。
const KOTOWAZA_BLANKS = {
    "いぬもあるけばぼうにあたる": { blank: "ぼうにあたる", blankKanji: "棒に当たる" },
    "さるもきからおちる": { blank: "きからおちる", blankKanji: "木から落ちる" },
    "はなよりだんご": { blank: "だんご", blankKanji: "団子" },
    "わらうかどにはふくきたる": { blank: "ふくきたる", blankKanji: "福来る" },
    "はやおきはさんもんのとく": { blank: "さんもんのとく", blankKanji: "三文の徳" },
    "おににかなぼう": { blank: "かなぼう", blankKanji: "金棒" },
    "かえるのこはかえる": { blank: "かえる", blankKanji: "蛙", displayText: "【　　】の子は蛙" },
    "ななころびやおき": { blank: "やおき", blankKanji: "八起き" },
    "いしのうえにもさんねん": { blank: "さんねん", blankKanji: "三年" },
    "いそがばまわれ": { blank: "まわれ", blankKanji: "回れ" },
    "けいぞくはちからなり": { blank: "ちからなり", blankKanji: "力なり" },
    "ときはかねなり": { blank: "かねなり", blankKanji: "金なり" },
    "ぜんはいそげ": { blank: "いそげ", blankKanji: "急げ" },
    "せんりのみちもいっぽから": { blank: "いっぽから", blankKanji: "一歩から" },
    "ならうよりなれろ": { blank: "なれろ", blankKanji: "慣れろ" },
    "しっぱいはせいこうのはは": { blank: "はは", blankKanji: "母" },
    "すきこそもののじょうずなれ": { blank: "じょうずなれ", blankKanji: "上手なれ" },
    "くちはわざわいのもと": { blank: "わざわいのもと", blankKanji: "災いの元" },
    "みつごのたましいひゃくまで": { blank: "ひゃくまで", blankKanji: "百まで" },
    "こういんやのごとし": { blank: "やのごとし", blankKanji: "矢の如し" },
    "ちりもつもればやまとなる": { blank: "やまとなる", blankKanji: "山となる" },
    "るいはともをよぶ": { blank: "ともをよぶ", blankKanji: "友を呼ぶ" },
    "にどあることはさんどある": { blank: "さんどある", blankKanji: "三度ある" },
    "ひとのふりみてわがふりなおせ": { blank: "わがふりなおせ", blankKanji: "我がふり直せ" },
    "ほとけのかおもさんど": { blank: "さんど", blankKanji: "三度" },
    "にとをおうものはいっとをもえず": { blank: "いっとをもえず", blankKanji: "一兎をも得ず" },
    "ひゃくぶんはいっけんにしかず": { blank: "いっけんにしかず", blankKanji: "一見に如かず" },
    "ふくすいぼんにかえらず": { blank: "かえらず", blankKanji: "返らず" },
    "めはくちほどにものをいう": { blank: "ものをいう", blankKanji: "物を言う" },
    "あんずるよりうむがやすし": { blank: "うむがやすし", blankKanji: "産むが易し" },
    "あめふってじかたまる": { blank: "じかたまる", blankKanji: "地固まる" },
    "おびにみじかしたすきにながし": { blank: "たすきにながし", blankKanji: "襷に長し" },
    "かってかぶとのおをしめよ": { blank: "おをしめよ", blankKanji: "緒を締めよ" },
    "くあればらくあり": { blank: "らくあり", blankKanji: "楽あり" },
    "ころばぬさきのつえ": { blank: "つえ", blankKanji: "杖" },
    "さんにんよればもんじゅのちえ": { blank: "もんじゅのちえ", blankKanji: "文殊の知恵" },
    "しらぬがほとけ": { blank: "ほとけ", blankKanji: "仏" },
    "たなからぼたもち": { blank: "ぼたもち", blankKanji: "牡丹餅" },
    "てつはあついうちにうて": { blank: "うちにうて", blankKanji: "うちに打て" },
    "となりのしばふはあおい": { blank: "あおい", blankKanji: "青い" },
    "なきっつらにはち": { blank: "はち", blankKanji: "蜂" },
    "のうあるたかはつめをかくす": { blank: "つめをかくす", blankKanji: "爪を隠す" },
    "そなえあればうれいなし": { blank: "うれいなし", blankKanji: "憂いなし" },
    "とうだいもとくらし": { blank: "もとくらし", blankKanji: "下暗し" },
    "みからでたさび": { blank: "さび", blankKanji: "錆" },
    "やけいしにみず": { blank: "みず", blankKanji: "水" },
    "わたるせけんにおにはなし": { blank: "おにはなし", blankKanji: "鬼はなし" },
    "いのなかのかわずたいかいをしらず": { blank: "たいかいをしらず", blankKanji: "大海を知らず" },
    "でるくいはうたれる": { blank: "うたれる", blankKanji: "打たれる" },
    "しょしんわするべからず": { blank: "わするべからず", blankKanji: "忘るべからず" },
    "さわらぬかみにたたりなし": { blank: "たたりなし", blankKanji: "祟りなし" },
    "ろんよりしょうこ": { blank: "しょうこ", blankKanji: "証拠" },
    "すめばみやこ": { blank: "みやこ", blankKanji: "都" },
    "たつとりあとをにごさず": { blank: "あとをにごさず", blankKanji: "跡を濁さず" },
    "てんはにぶつをあたえず": { blank: "にぶつをあたえず", blankKanji: "二物を与えず" },
    "うおごころあればみずごころ": { blank: "みずごころ", blankKanji: "水心" },
    "かめのこうよりとしのこう": { blank: "こう", blankKanji: "功" },
    "きくはいっときのはじきかぬはいっしょうのはじ": { blank: "はじ", blankKanji: "恥" },
    "ごうにいってはごうにしたがえ": { blank: "したがえ", blankKanji: "従え" },
    "なさけはひとのためならず": { blank: "ならず", blankKanji: "ならず" },
    "せにはらはかえられぬ": { blank: "られぬ", blankKanji: "られぬ" },
    "こけつにいらずんばこじをえず": { blank: "えず", blankKanji: "得ず" },
    "うまのみみにねんぶつ": { blank: "ねんぶつ", blankKanji: "念仏" },
    "みのるほどこうべをたれるいなほかな": { blank: "いなほかな", blankKanji: "稲穂かな" },
    "しょうじきものはばかをみる": { blank: "みる", blankKanji: "見る" },
    "こうぼうもふでのあやまり": { blank: "あやまり", blankKanji: "誤り" },
    "かっぱのかわながれ": { blank: "ながれ", blankKanji: "流れ" },
    "あぶはちとらず": { blank: "とらず", blankKanji: "取らず" },
    "やすものがいのぜにうしない": { blank: "うしない", blankKanji: "失い" },
    "うわさをすればかげ": { blank: "かげ", blankKanji: "影" },
    "いしゃのふようじょう": { blank: "ふようじょう", blankKanji: "不養生" },
    "いっすんさきはやみ": { blank: "やみ", blankKanji: "闇" },
    "うそもほうべん": { blank: "ほうべん", blankKanji: "方便" },
    "えんのしたのちからもち": { blank: "ちからもち", blankKanji: "力持ち" },
    "おやのこころこしらず": { blank: "しらず", blankKanji: "知らず" },
    "かほうはねてまて": { blank: "ねてまて", blankKanji: "寝て待て" },
    "ごじっぽひゃっぽ": { blank: "ひゃっぽ", blankKanji: "百歩" },
    "のこりものにはふくがある": { blank: "ある", blankKanji: "ある" },
    "すてるかみあればひろうかみあり": { blank: "ひろうかみあり", blankKanji: "拾う神あり" },
    "へたのよこずき": { blank: "よこずき", blankKanji: "横好き" },
    "めからうろこ": { blank: "うろこ", blankKanji: "鱗" },
};

const YOJIJUKUGO_BLANKS = {
    "一石二鳥": { blank: "にちょう", blankKanji: "二鳥" },
    "十人十色": { blank: "といろ", blankKanji: "十色" },
    "一期一会": { blank: "いちえ", blankKanji: "一会" },
    "以心伝心": { blank: "でんしん", blankKanji: "伝心" },
    "喜怒哀楽": { blank: "あいらく", blankKanji: "哀楽" },
    "試行錯誤": { blank: "さくご", blankKanji: "錯誤" },
    "四苦八苦": { blank: "はっく", blankKanji: "八苦" },
    "自画自賛": { blank: "じさん", blankKanji: "自賛" },
    "弱肉強食": { blank: "きょうしょく", blankKanji: "強食" },
    "心機一転": { blank: "いってん", blankKanji: "一転" },
    "日進月歩": { blank: "げっぽ", blankKanji: "月歩" },
    "半信半疑": { blank: "はんぎ", blankKanji: "半疑" },
    "百発百中": { blank: "ひゃくちゅう", blankKanji: "百中" },
    "無我夢中": { blank: "むちゅう", blankKanji: "夢中" },
    "油断大敵": { blank: "たいてき", blankKanji: "大敵" },
    "臨機応変": { blank: "おうへん", blankKanji: "応変" },
    "完全無欠": { blank: "むけつ", blankKanji: "無欠" },
    "興味津津": { blank: "しんしん", blankKanji: "津津" },
    "三日坊主": { blank: "ぼうず", blankKanji: "坊主" },
    "絶体絶命": { blank: "ぜつめい", blankKanji: "絶命" },
    "危機一髪": { blank: "いっぱつ", blankKanji: "一髪" },
    "一長一短": { blank: "いったん", blankKanji: "一短" },
    "意気投合": { blank: "とうごう", blankKanji: "投合" },
    "一進一退": { blank: "いったい", blankKanji: "一退" },
    "二人三脚": { blank: "さんきゃく", blankKanji: "三脚" },
    "一心不乱": { blank: "ふらん", blankKanji: "不乱" },
    "一念発起": { blank: "ほっき", blankKanji: "発起" },
    "異口同音": { blank: "どうおん", blankKanji: "同音" },
    "因果応報": { blank: "おうほう", blankKanji: "応報" },
    "温故知新": { blank: "ちしん", blankKanji: "知新" },
    "起死回生": { blank: "かいせい", blankKanji: "回生" },
    "空前絶後": { blank: "ぜつご", blankKanji: "絶後" },
    "言語道断": { blank: "どうだん", blankKanji: "道断" },
    "順風満帆": { blank: "まんぱん", blankKanji: "満帆" },
    "針小棒大": { blank: "ぼうだい", blankKanji: "棒大" },
    "前代未聞": { blank: "みもん", blankKanji: "未聞" },
    "大器晩成": { blank: "ばんせい", blankKanji: "晩成" },
    "大同小異": { blank: "しょうい", blankKanji: "小異" },
    "単刀直入": { blank: "ちょくにゅう", blankKanji: "直入" },
    "天真爛漫": { blank: "らんまん", blankKanji: "爛漫" },
    "電光石火": { blank: "せっか", blankKanji: "石火" },
    "独立独歩": { blank: "どっぽ", blankKanji: "独歩" },
    "馬耳東風": { blank: "とうふう", blankKanji: "東風" },
    "八方美人": { blank: "びじん", blankKanji: "美人" },
    "不言実行": { blank: "じっこう", blankKanji: "実行" },
    "本末転倒": { blank: "てんとう", blankKanji: "転倒" },
    "用意周到": { blank: "しゅうとう", blankKanji: "周到" },
    "老若男女": { blank: "なんにょ", blankKanji: "男女" },
    "疑心暗鬼": { blank: "あんき", blankKanji: "暗鬼" },
    "急転直下": { blank: "ちょっか", blankKanji: "直下" },
    "五里霧中": { blank: "むちゅう", blankKanji: "霧中" },
    "自暴自棄": { blank: "じき", blankKanji: "自棄" },
    "質実剛健": { blank: "ごうけん", blankKanji: "剛健" },
    "支離滅裂": { blank: "めつれつ", blankKanji: "滅裂" },
    "創意工夫": { blank: "くふう", blankKanji: "工夫" },
    "適材適所": { blank: "てきしょ", blankKanji: "適所" },
    "徹頭徹尾": { blank: "てつび", blankKanji: "徹尾" },
    "天下無敵": { blank: "むてき", blankKanji: "無敵" },
    "一触即発": { blank: "そくはつ", blankKanji: "即発" },
    "意気揚揚": { blank: "ようよう", blankKanji: "揚揚" },
    "威風堂堂": { blank: "どうどう", blankKanji: "堂堂" },
    "有名無実": { blank: "むじつ", blankKanji: "無実" },
    "暗中模索": { blank: "もさく", blankKanji: "模索" },
    "一刀両断": { blank: "りょうだん", blankKanji: "両断" },
    "才色兼備": { blank: "けんび", blankKanji: "兼備" },
    "晴耕雨読": { blank: "うどく", blankKanji: "雨読" },
    "千載一遇": { blank: "いちぐう", blankKanji: "一遇" },
    "朝三暮四": { blank: "ぼし", blankKanji: "暮四" },
    "二束三文": { blank: "さんもん", blankKanji: "三文" },
    "明鏡止水": { blank: "しすい", blankKanji: "止水" },
    "面目躍如": { blank: "やくじょ", blankKanji: "躍如" },
    "竜頭蛇尾": { blank: "だび", blankKanji: "蛇尾" },
    "和気藹藹": { blank: "あいあい", blankKanji: "藹藹" },
    "我田引水": { blank: "いんすい", blankKanji: "引水" },
    "画竜点睛": { blank: "てんせい", blankKanji: "点睛" },
    "奇想天外": { blank: "てんがい", blankKanji: "天外" },
    "玉石混交": { blank: "こんこう", blankKanji: "混交" },
    "荒唐無稽": { blank: "むけい", blankKanji: "無稽" },
    "縦横無尽": { blank: "むじん", blankKanji: "無尽" },
    "七転八倒": { blank: "ばっとう", blankKanji: "八倒" },
    "森羅万象": { blank: "ばんしょう", blankKanji: "万象" },
    "正正堂堂": { blank: "どうどう", blankKanji: "堂堂" },
    "抱腹絶倒": { blank: "ぜっとう", blankKanji: "絶倒" },
    "傍若無人": { blank: "ぶじん", blankKanji: "無人" },
    "満身創痍": { blank: "そうい", blankKanji: "創痍" },
    "無味乾燥": { blank: "かんそう", blankKanji: "乾燥" },
    "孟母三遷": { blank: "さんせん", blankKanji: "三遷" },
    "唯我独尊": { blank: "どくそん", blankKanji: "独尊" },
    "悠悠自適": { blank: "じてき", blankKanji: "自適" },
    "羊頭狗肉": { blank: "くにく", blankKanji: "狗肉" },
    "落花流水": { blank: "りゅうすい", blankKanji: "流水" },
    "理路整然": { blank: "せいぜん", blankKanji: "整然" },
    "冷静沈着": { blank: "ちんちゃく", blankKanji: "沈着" },
    "六根清浄": { blank: "しょうじょう", blankKanji: "清浄" },
    "一挙両得": { blank: "りょうとく", blankKanji: "両得" },
    "一朝一夕": { blank: "いっせき", blankKanji: "一夕" },
    "天涯孤独": { blank: "こどく", blankKanji: "孤独" },
    "同床異夢": { blank: "いむ", blankKanji: "異夢" },
};

function extractBlankInfo(item) {
    const hiragana = typeof item?.hiragana === 'string' ? item.hiragana : '';
    const kanji = typeof item?.kanji === 'string' ? item.kanji : '';
    const info = KOTOWAZA_BLANKS[hiragana] || YOJIJUKUGO_BLANKS[kanji];
    if (info && hiragana.endsWith(info.blank)) {
        // 既存の有効な穴位置は保持し、通常は定義された末尾だけを穴にする。
        const prefix = kanji.endsWith(info.blankKanji)
            ? kanji.slice(0, -info.blankKanji.length)
            : hiragana.slice(0, -info.blank.length);
        return { displayText: info.displayText || prefix + '【　　】', answer: info.blank, fullText: hiragana };
    }
    // 将来追加する未定義語でも、漢字と読みが食い違う問題を出さない。
    const blankStart = Math.max(0, Math.floor(hiragana.length / 2));
    return { displayText: hiragana.slice(0, blankStart) + '【　　】',
        answer: hiragana.slice(blankStart), fullText: hiragana };
}

function startGame(mode) {
    if (!['meaning', 'fillin', 'review'].includes(mode)) return;
    if (mode === 'review' && (gameState.phase !== 'result' || !gameState.wrongQuestions.length)) return;
    resetPendingWork();
    gameState.phase = 'idle';
    gameState.currentQuestion = null;

    if (mode === 'review') {
        // 復習モード
        gameState.isReviewMode = true;
        // 元のモードを保持（デフォルトはmeaning）
        if (!gameState.originalMode) {
            gameState.originalMode = gameState.mode;
        }
        // 復習用の問題リストを設定
        gameState.questions = shuffleArray([...gameState.wrongQuestions]);
        gameState.wrongQuestions = []; // 復習中に間違えたらまた追加
        gameState.questionCount = gameState.questions.length;
        // 復習時は元のモードを使用
        gameState.mode = gameState.originalMode;
    } else {
        // 通常モード
        gameState.isReviewMode = false;
        gameState.mode = mode;
        gameState.originalMode = mode; // 復習用にモードを保存
        gameState.wrongQuestions = []; // リセット

        // 設定読み込み（画面から）
        // ※実際にはイベントリスナーでgameState.configは更新されているはず
        // 問題数取得
        let count = 10;
        const activeBtn = document.querySelector('.btn-count.active');
        if (activeBtn) {
            const val = activeBtn.dataset.count;
            const parsed = parseInt(val, 10);
            count = val === 'all' ? 9999 : (Number.isFinite(parsed) && parsed > 0 ? parsed : 10);
        }
        gameState.questionCount = count;
        gameState.questions = generateQuestions(count);
    }

    gameState.currentIndex = 0;
    gameState.correctCount = 0;
    gameState.wrongCount = 0;
    gameState.streak = 0;
    gameState.totalScore = 0;

    if (gameState.questions.length === 0) {
        alert('条件に合う問題がありませんでした。設定を変更してください。');
        return;
    }

    showScreen('game-screen');

    // モードに応じてUI切り替え
    if (gameState.mode === 'meaning') {
        if (elements.choicesArea) elements.choicesArea.style.display = 'grid';
        if (elements.fillinArea) elements.fillinArea.style.display = 'none';
    } else {
        if (elements.choicesArea) elements.choicesArea.style.display = 'none';
        if (elements.fillinArea) elements.fillinArea.style.display = 'block';
    }

    updateScoreDisplay();
    showQuestion();
}

function showQuestion() {
    if (gameState.currentIndex >= gameState.questions.length) {
        endGame();
        return;
    }

    const item = gameState.questions[gameState.currentIndex];
    gameState.currentQuestion = item;
    gameState.answered = false;
    gameState.hintUsed = false;
    gameState.phase = 'question';
    gameState.composing = false;
    gameState.questionElapsedMs = 0;
    gameState.questionActiveSince = isPaused() ? null : monotonicNow();

    // 進捗更新
    const progress = ((gameState.currentIndex) / gameState.questions.length) * 100;
    if (elements.progressFill) elements.progressFill.style.width = `${progress}%`;
    if (elements.progressText) elements.progressText.textContent = `${gameState.currentIndex + 1} / ${gameState.questions.length}`;

    // 難易度バッジ更新
    const difficulty = item.difficulty || 2;
    const diffLabel = CONFIG.DIFFICULTY_LABELS[difficulty] || CONFIG.DIFFICULTY_LABELS[2];
    if (elements.difficultyBadge) {
        elements.difficultyBadge.textContent = diffLabel.text;
        elements.difficultyBadge.className = `difficulty-badge ${diffLabel.class}`;
    }

    // フィードバックをクリア
    if (elements.feedback) {
        elements.feedback.classList.remove('show', 'correct', 'wrong');
        elements.feedback.textContent = '';
    }

    if (gameState.mode === 'meaning') {
        showMeaningQuestion(item);
    } else {
        showFillinQuestion(item);
    }
    focusCurrentScreen('game-screen');
}

function showMeaningQuestion(item) {
    // 問題文表示
    if (elements.questionLabel) elements.questionLabel.textContent = 'このことわざの意味は？';
    if (elements.questionText) elements.questionText.textContent = item.kanji || item.hiragana;

    // 選択肢生成
    const allItems = getQuizCatalog();

    const choices = generateChoices(item, allItems);

    // ボタンに表示
    elements.choiceBtns.forEach((btn, index) => {
        btn.textContent = choices[index];
        btn.className = 'choice-btn';
        btn.disabled = false;
        btn.dataset.correct = choices[index] === item.meaning ? 'true' : 'false';
    });
}

function showFillinQuestion(item) {
    const blankInfo = extractBlankInfo(item);
    gameState.currentQuestion = { ...item, blankInfo };
    if (elements.submitBtn) elements.submitBtn.disabled = false;
    if (elements.hintBtn) elements.hintBtn.disabled = false;

    if (elements.questionLabel) elements.questionLabel.textContent = '空欄をひらがなで埋めてね';
    const displaySpan = document.createElement('span');
    displaySpan.className = 'display-text';
    displaySpan.textContent = blankInfo.displayText;
    if (elements.questionText) {
        elements.questionText.textContent = '';
        elements.questionText.appendChild(displaySpan);
    }

    // 入力欄クリア
    if (elements.fillinInput) {
        elements.fillinInput.value = '';
        elements.fillinInput.placeholder = 'ひらがなで入力';  // プレースホルダーをリセット
        elements.fillinInput.disabled = false;

        // 常にシステムキーボードを有効化
        elements.fillinInput.setAttribute('inputmode', 'text');

        elements.fillinInput.focus();
    }
}

// ============================================
// 回答処理
// ============================================
function awardCorrectAnswer() {
    gameState.correctCount++;
    gameState.streak++;
    const elapsedMs = gameState.questionElapsedMs + (gameState.questionActiveSince === null ? 0
        : Math.max(0, monotonicNow() - gameState.questionActiveSince));
    gameState.questionActiveSince = null;
    const speedBonus = Math.max(0, Math.round((10 - elapsedMs / 1000) * 10));
    const comboBonus = Math.min(100, Math.max(0, gameState.streak - 1) * 20);
    const pointsGained = 100 + speedBonus + comboBonus;
    gameState.totalScore += pointsGained;
    return { pointsGained, speedBonus };
}

function handleChoiceClick(btn) {
    if (!canAnswer('meaning') || !Array.from(elements.choiceBtns).includes(btn) || btn.disabled) return;
    gameState.answered = true;

    const isCorrect = btn.dataset.correct === 'true';

    // 全ボタンを無効化
    elements.choiceBtns.forEach(b => {
        b.disabled = true;
        if (b.dataset.correct === 'true') {
            b.classList.add('correct');
        }
    });

    if (isCorrect) {
        btn.classList.add('correct');
        SoundManager.play('correct');

        const { pointsGained, speedBonus } = awardCorrectAnswer();

        // フィードバック表示
        let message = `正解！ +${pointsGained}点！🎉`;
        if (speedBonus > 50) message += ` (スピードボーナス!🚀)`;
        if (gameState.streak >= 3) {
            showComboPopup(gameState.streak);
        }
        showFeedback(true, message);
    } else {
        btn.classList.add('wrong');
        gameState.wrongCount++;
        gameState.streak = 0; // ストリークリセット

        // 間違えた問題を記録
        const questionText = gameState.currentQuestion.kanji || gameState.currentQuestion.hiragana;
        if (!gameState.wrongQuestions.some(q => (q.kanji || q.hiragana) === questionText)) {
            gameState.wrongQuestions.push(gameState.currentQuestion);
        }

        SoundManager.play('wrong');
        showFeedback(false, `不正解… 正解は「${gameState.currentQuestion.meaning}」`);
    }

    updateScoreDisplay();
    scheduleNextQuestion();
}

function handleFillinSubmit() {
    if (!canAnswer('fillin') || gameState.composing || !gameState.currentQuestion.blankInfo) return;

    const input = sanitizeFillinInput(elements.fillinInput ? elements.fillinInput.value : '');
    if (elements.fillinInput && elements.fillinInput.value !== input) {
        elements.fillinInput.value = input;
    }
    if (!input) return;

    gameState.answered = true;
    elements.fillinInput.disabled = true;
    if (elements.submitBtn) elements.submitBtn.disabled = true;
    if (elements.hintBtn) elements.hintBtn.disabled = true;

    const answer = sanitizeFillinInput(gameState.currentQuestion.blankInfo.answer);
    const isCorrect = input === answer;

    if (isCorrect) {
        SoundManager.play('correct');

        const { pointsGained, speedBonus } = awardCorrectAnswer();

        let message = `正解！ +${pointsGained}点！🎉`;
        if (speedBonus > 50) message += ` (スピードボーナス!🚀)`;
        if (gameState.streak >= 3) {
            showComboPopup(gameState.streak);
        }
        showFeedback(true, message);
    } else {
        gameState.wrongCount++;
        gameState.streak = 0;
        // 間違えた問題を記録（重複回避）
        const questionText = gameState.currentQuestion.kanji || gameState.currentQuestion.hiragana;
        if (!gameState.wrongQuestions.some(q => (q.kanji || q.hiragana) === questionText)) {
            gameState.wrongQuestions.push(gameState.currentQuestion);
        }
        SoundManager.play('wrong');
        showFeedback(false, `不正解… 正解は「${answer}」`);
    }

    // 完全なことわざを表示
    if (elements.questionText) {
        elements.questionText.textContent = gameState.currentQuestion.hiragana;
    }

    updateScoreDisplay();
    scheduleNextQuestion();
}

function handleHint() {
    if (!canAnswer('fillin') || gameState.composing || gameState.hintUsed || !gameState.currentQuestion.blankInfo) return;
    gameState.hintUsed = true;
    if (elements.hintBtn) elements.hintBtn.disabled = true;

    const answer = gameState.currentQuestion.blankInfo.answer;
    const firstChar = answer.substring(0, 1);
    
    if (elements.fillinInput) {
        elements.fillinInput.value = firstChar;
        elements.fillinInput.placeholder = `ヒント: ${firstChar}…`;
        elements.fillinInput.focus();
        elements.fillinInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function showFeedback(isCorrect, message) {
    if (!elements.feedback) return;
    elements.feedback.textContent = message;
    elements.feedback.className = `feedback show ${isCorrect ? 'correct' : 'wrong'}`;
}

function nextQuestion() {
    if (gameState.phase !== 'feedback') return;
    gameState.currentIndex++;
    showQuestion();
}

// コンボポップアップ表示
function showComboPopup(streak) {
    clearEffects();
    const popup = document.createElement('div');
    popup.className = 'combo-popup';
    popup.textContent = `🔥 ${streak} COMBO!`;
    document.body.appendChild(popup);

    scheduleEffectCleanup(CONFIG.COMBO_POPUP_MS);
}

// 紙吹雪エフェクト
function createConfetti() {
    const colors = ['#FFD700', '#FF6B6B', '#4CAF50', '#2196F3', '#9C27B0'];
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        document.body.appendChild(confetti);

    }
    scheduleEffectCleanup(CONFIG.CONFETTI_DURATION_MS);
}

function updateScoreDisplay() {
    if (elements.correctCount) elements.correctCount.textContent = gameState.correctCount;
    if (elements.wrongCount) elements.wrongCount.textContent = gameState.wrongCount;
    if (elements.scorePoints) elements.scorePoints.textContent = gameState.totalScore;

    // リアルタイム正答率表示
    if (elements.accuracyRate) {
        const total = gameState.correctCount + gameState.wrongCount;
        const accuracy = total > 0 ? Math.round((gameState.correctCount / total) * 100) : 0;
        elements.accuracyRate.textContent = `${accuracy}%`;
    }
}

// ============================================
// ゲーム終了
// ============================================
// ランク判定
function getRank(accuracy) {
    if (accuracy === 100) return { id: 's', title: '👑 ことわざマスター' };
    if (accuracy >= 90) return { id: 'a', title: '🥇 ことわざ博士' };
    if (accuracy >= 80) return { id: 'b', title: '🥈 ことわざ名人' };
    if (accuracy >= 60) return { id: 'c', title: '🥉 ことわざチャレンジャー' };
    return { id: 'c', title: '🥚 ことわざの卵' };
}

function endGame() {
    if (gameState.phase === 'result') return;
    resetPendingWork();
    gameState.phase = 'result';
    gameState.currentQuestion = null;
    gameState.questionActiveSince = null;

    const total = gameState.questions.length;
    const correct = gameState.correctCount;
    // 0問除算を防止
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    // 称号表示
    const rank = getRank(accuracy);
    if (elements.resultTitleBadge) {
        elements.resultTitleBadge.className = `result-title-badge rank-${rank.id}`;
        // 復習モード時はタイトルを変える？いや、そのままでいいか
        elements.resultTitleBadge.textContent = gameState.isReviewMode ? '📖 復習完了！' : rank.title;
    }

    // 復習セクション表示制御
    if (elements.reviewSection) {
        if (gameState.wrongQuestions.length > 0) {
            elements.reviewSection.style.display = 'block';

            // リスト生成
            elements.wrongAnswerList.textContent = '';
            const fragment = document.createDocumentFragment();
            gameState.wrongQuestions.forEach(q => {
                const li = document.createElement('li');
                li.className = 'wrong-answer-item';

                const qSpan = document.createElement('span');
                qSpan.className = 'wrong-q';
                qSpan.textContent = q.kanji || q.hiragana || '？？？';

                const aSpan = document.createElement('span');
                aSpan.className = 'wrong-a';
                aSpan.textContent = q.meaning || q.hiragana;

                li.appendChild(qSpan);
                li.appendChild(aSpan);
                fragment.appendChild(li);
            });
            elements.wrongAnswerList.appendChild(fragment);

        } else {
            elements.reviewSection.style.display = 'none';
        }
    }

    // リザルトスコア表示
    if (elements.resultTotalScore) elements.resultTotalScore.textContent = gameState.totalScore;

    // ハイスコア保存（復習モード以外）
    if (!gameState.isReviewMode) {
        const isNewRecord = StorageManager.saveHighScore(
            gameState.mode,
            gameState.questionCount,
            gameState.totalScore,
            gameState.config.category,
            gameState.config.difficulty
        );
        const highScore = StorageManager.getHighScore(
            gameState.mode,
            gameState.questionCount,
            gameState.config.category,
            gameState.config.difficulty
        );

        if (elements.resultHighscore) {
            elements.resultHighscore.textContent = `${highScore}`;
            if (isNewRecord) {
                const recordBadge = document.createElement('span');
                recordBadge.className = 'new-record';
                recordBadge.textContent = 'NEW!';
                elements.resultHighscore.appendChild(document.createTextNode(' '));
                elements.resultHighscore.appendChild(recordBadge);
            }
        }
    } else {
        // 復習モード時はハイスコア更新なし
        if (elements.resultHighscore) elements.resultHighscore.textContent = '-';
    }

    // 全問正解演出
    if (accuracy === 100 && total > 0) {
        const generation = gameState.generation;
        const timer = setTimeout(() => {
            if (generation !== gameState.generation || gameState.effectTimer !== timer) return;
            gameState.effectTimer = null;
            if (gameState.phase !== 'result' || isPaused()) return;
            SoundManager.play('perfect');
            createConfetti();
        }, 500);
        gameState.effectTimer = timer;
    }

    // 結果表示
    if (elements.resultCorrect) elements.resultCorrect.textContent = `${correct} / ${total}`;
    if (elements.resultAccuracy) elements.resultAccuracy.textContent = `${accuracy}%`;

    // 評価
    const grade = CONFIG.GRADES.find(g => accuracy >= g.min);
    if (elements.resultGrade) elements.resultGrade.textContent = `${grade.emoji} ${grade.text}`;

    // 進捗を100%に
    if (elements.progressFill) elements.progressFill.style.width = '100%';

    showScreen('result-screen');
}

// ============================================
// イベントリスナー
// ============================================
function setupEventListeners() {
    // モード選択
    document.querySelectorAll('.btn-mode').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            if (mode) startGame(mode);
        });
    });

    // 問題数選択
    document.querySelectorAll('.btn-count').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-count').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            const count = btn.dataset.count;
            const parsed = parseInt(count, 10);
            gameState.questionCount = count === 'all' ? 'all' : (Number.isFinite(parsed) && parsed > 0 ? parsed : 10);
        });
    });

    // 4択ボタン
    elements.choiceBtns.forEach(btn => {
        btn.addEventListener('click', () => handleChoiceClick(btn));
    });

    // 穴埋め入力
    elements.fillinInput?.addEventListener('keydown', (e) => {
        if (e.isComposing || e.keyCode === 229 || gameState.composing || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            handleFillinSubmit();
        }
    });

    const normalizeInput = () => {
        const sanitized = sanitizeFillinInput(elements.fillinInput.value);
        if (elements.fillinInput.value !== sanitized) {
            elements.fillinInput.value = sanitized;
        }
    };
    elements.fillinInput?.addEventListener('compositionstart', () => { gameState.composing = true; });
    elements.fillinInput?.addEventListener('compositionend', () => { gameState.composing = false; normalizeInput(); });
    elements.fillinInput?.addEventListener('input', event => {
        if (!gameState.composing && !event.isComposing) normalizeInput();
    });

    elements.submitBtn?.addEventListener('click', handleFillinSubmit);
    elements.hintBtn?.addEventListener('click', handleHint);

    // リトライ
    elements.retryBtn?.addEventListener('click', () => {
        startGame(gameState.mode);
    });

    // ホーム
    elements.homeBtn?.addEventListener('click', returnHome);

    // 復習ボタン
    elements.reviewBtn?.addEventListener('click', () => {
        startGame('review');
    });

    // 中断（タイトルに戻る）
    elements.quitBtn?.addEventListener('click', returnHome);

    // 設定ボタン（カテゴリ）
    elements.categoryBtns?.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.categoryBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            gameState.config.category = btn.dataset.value;
        });
    });

    // 設定ボタン（難易度）
    elements.difficultyBtns?.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.difficultyBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            gameState.config.difficulty = btn.dataset.value;
        });
    });

    // キーボードショートカット（1234キーで選択）
    document.addEventListener('keydown', (e) => {
        // ボタンの長押しによるブラウザ標準の連続clickも抑える。
        if (e.repeat && (e.key === 'Enter' || e.key === ' ') && e.target?.tagName === 'BUTTON') {
            e.preventDefault();
            return;
        }
        // ゲーム画面でのみ有効
        if (!elements.gameScreen?.classList.contains('active')) return;
        // 意味当てモードでのみ
        if (gameState.mode !== 'meaning') return;
        // 回答済みなら無視
        if (gameState.answered) return;
        // 入力系フォーカス中は無視
        const target = e.target;
        if (target instanceof HTMLElement) {
            const tag = target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat || e.isComposing || e.keyCode === 229) return;

        const keyNum = /^[1-4]$/.test(e.key) ? Number(e.key) : 0;
        if (keyNum >= 1 && keyNum <= 4) {
            const btn = elements.choiceBtns[keyNum - 1];
            if (btn && !btn.disabled) {
                e.preventDefault();
                handleChoiceClick(btn);
            }
        }
    });
}

function setupParentsDialog() {
    const dialog = document.getElementById('parents-modal');
    const opener = document.querySelector('[data-action="parents-modal-open"]');
    const closers = document.querySelectorAll('[data-action="parents-modal-close"]');
    if (!dialog || !opener) return;
    const syncClosed = () => {
        if (dialog.open || dialog.hasAttribute('open')) return;
        opener.setAttribute('aria-expanded', 'false');
        if (elements.startScreen?.classList.contains('active')) opener.focus();
    };
    const close = () => {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
        syncClosed();
    };
    opener.addEventListener('click', () => {
        if (dialog.open || dialog.hasAttribute('open')) return;
        if (gameState.focusTimer !== null) clearTimeout(gameState.focusTimer);
        gameState.focusTimer = null;
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        opener.setAttribute('aria-expanded', 'true');
        closers[0]?.focus();
    });
    closers.forEach(closer => closer.addEventListener('click', close));
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    dialog.addEventListener('close', syncClosed);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
}

// ============================================
// 初期化
// ============================================
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        applyPortalSettings();
        initializeElements();
        setupEventListeners();
        showScreen('start-screen');

        setupParentsDialog();
        document.addEventListener('visibilitychange', updatePauseState);
        window.addEventListener('pagehide', () => { gameState.pageHidden = true; updatePauseState(); });
        window.addEventListener('pageshow', () => { gameState.pageHidden = false; updatePauseState(); });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        extractBlankInfo,
        sanitizeFillinInput,
        KOTOWAZA_BLANKS,
        YOJIJUKUGO_BLANKS
    };
}
