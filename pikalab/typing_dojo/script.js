/**
 * タイピング道場 - script.js
 * 寿司打スタイルのタイピング練習ゲーム
 * 
 * リファクタリング済み:
 * - typing-core.js へ入力判定ロジックを分離
 * - flashInput() で入力フィードバック処理を共通化
 * - StorageManager でLocalStorage処理を統一
 * 
 * UX機能:
 * - カウントダウン (3, 2, 1, GO!)
 * - 一時停止機能 (スペースキー)
 * - 途中終了 (Escキー, やめるボタン)
 * - 難易度表示
 */

import '../data/idioms.js';
import {
    RANK_THRESHOLDS,
    applyLongVowelToPatterns,
    buildPatternCache,
    calcWpm,
    chooseWordFromPool,
    filterWordsByCharTraining,
    findMatchingPattern,
    generateAllPatterns,
    getLastVowel,
    getRankLabel,
    getSentenceBuckets,
    hiraganaToRomaji,
    isCorrectInput,
    normalizeKanaToHiragana,
    normalizeStatsHistory,
    normalizePreferences,
    resolveRestoredRomajiPattern,
    resolveSentenceBucketByScore,
    sanitizeTypingInput,
    sanitizeWordList,
    splitSentenceToChunks
} from './typing-core.js';

// ============================================
// CONFIG - 設定値の分離（AGENTS.mdルール適用）
// ============================================
const CONFIG = {
    INITIAL_TIME: { easy: 90, normal: 90, hard: 90 },
    PLAY_MODES: {
        dojo: { label: '道場モード', initialTime: 90, bonusMultiplier: 1 },
        focus60: { label: '1分集中モード', initialTime: 60, bonusMultiplier: 1.1 }
    },

    // ボーナス秒数（難易度別）
    TIME_BONUS: {
        easy: { normal: 2, perfect: 3 },   // かんたん: +2/+3秒
        normal: { normal: 3, perfect: 5 },   // ふつう: +3/+5秒
        hard: { normal: 3, perfect: 5 }    // むずかしい: +3/+5秒
    },
    BONUS_WORD_EXTRA_SECONDS: 3,
    BONUS_WORD_CHANCE: 0.14,
    RECENT_WORD_LIMIT: 8,

    STORAGE_KEY: 'typing_dojo_highscore',
    SESSION_KEY: 'typing_dojo_session',
    PREFERENCES_KEY: 'typing_dojo_preferences',
    STATS_KEY: 'typing_dojo_stats',
    GOAL_KEY: 'typing_dojo_daily_goal',
    TUTORIAL_KEY: 'typing_dojo_tutorial_seen',
    FLASH_DURATION_MS: 200,
    FOCUS_DELAY_MS: 100,
    TICK_INTERVAL_MS: 1000,
    COUNTDOWN_SECONDS: 3,
    COUNTDOWN_INTERVAL_MS: 1000,
    SESSION_MAX_AGE_MS: 1000 * 60 * 60 * 8,
    TUTORIAL_TOTAL_SECONDS: 30,
    TUTORIAL_STEP_SECONDS: 10,
    HISTORY_LIMIT: 10,
    SW_VERSION: 'typing-dojo-v1',

    LEVEL_LABELS: {
        easy: '🌸 かんたん',
        normal: '🌟 ふつう',
        hard: '🔥 むずかしい'
    },
    LEVEL_GUIDES: {
        easy: 'かんたん: 単語中心で基礎を固める',
        normal: 'ふつう: 四字熟語中心でテンポよく練習',
        hard: 'むずかしい: ことわざ・文章で実戦力アップ'
    },
    GOAL_CHOICES: [5, 10, 20],
    RANK_THRESHOLDS,
    UNIT_MODES: {
        auto: 'おまかせ',
        word: '単語',
        proverb: 'ことわざ',
        'sentence-short': '短文',
        'sentence-long': '長文',
        katakana: 'カタカナ語',
        'subject-science': '理科語彙',
        'subject-social': '社会語彙',
        'ultra-beginner': '超入門'
    }
};

const EXTRA_WORDS = {
    subjectScience: [
        'じっけん', 'かがく', 'でんりゅう', 'じしゃく', 'てんき', 'さいぼう', 'しょくぶつ',
        'どうぶつ', 'たいようけい', 'じしん', 'かざん', 'すいようえき', 'ぶんし', 'げんし'
    ],
    subjectSocial: [
        'にほんこく', 'けんぽう', 'さんぎょう', 'ぼうえき', 'ちずきごう', 'こっかい', 'けんちょう',
        'しちょうそん', 'れきし', 'ぶんかざい', 'でんとう', 'へいわ', 'じんけん', 'ちいきしゃかい'
    ],
    ultraBeginner: [
        'あさ', 'ひる', 'よる', 'いぬ', 'ねこ', 'やま', 'かわ', 'そら', 'ほし', 'くも',
        'あめ', 'ゆき', 'はる', 'なつ', 'あき', 'ふゆ', 'て', 'あし', 'みみ', 'め'
    ],
    bonus: [
        'きせき', 'まんてん', 'だいぎゃくてん', 'しょうり', 'れんぞくせいかい',
        'しんけんしょうぶ', 'れべるあっぷ', 'しゅぎょう'
    ]
};

const TUTORIAL_STEPS = [
    {
        title: '基本ルール',
        body: 'ひらがなをローマ字で入力します。正しく入力すると次の問題へ進みます。'
    },
    {
        title: '特殊入力',
        body: '「ん」「っ」「ー」は入力が複数あります。自分が打ちやすい形でOKです。'
    },
    {
        title: 'ボーナスと目標',
        body: 'ノーミスならタイムボーナス。コンボをつないで、今日の目標達成を目指しましょう。'
    }
];

const GUIDE_SAMPLE_MAP = {
    auto: { easy: 'さくら', normal: 'いちごいちえ', hard: 'いぬもあるけばぼうにあたる' },
    word: { easy: 'りんご', normal: 'かがみもち', hard: 'しんけんしょうぶ' },
    proverb: { easy: 'いちごいちえ', normal: 'ししふんじん', hard: 'はなよりだんご' },
    'sentence-short': { easy: 'きょうはいいてんき', normal: 'きょうはいいてんき', hard: 'きょうはいいてんき' },
    'sentence-long': { easy: 'いぬもあるけばぼうにあたる', normal: 'いぬもあるけばぼうにあたる', hard: 'いぬもあるけばぼうにあたる' },
    katakana: { easy: 'すーぱー', normal: 'こんぴゅーたー', hard: 'ぷろぐらみんぐ' },
    'subject-science': { easy: 'じっけん', normal: 'じっけん', hard: 'じっけん' },
    'subject-social': { easy: 'にほんこく', normal: 'にほんこく', hard: 'にほんこく' },
    'ultra-beginner': { easy: 'あさ', normal: 'あさ', hard: 'あさ' }
};

const CHAR_TRAINING_SAMPLE_MAP = {
    youon: 'きゃく',
    sokuon: 'がっこう',
    hatsuon: 'しんぶん',
    choon: 'すーぱー'
};

/**
 * IDIOMS_DBからひらがなリストを取得
 * @param {string} level - 難易度
 * @param {string} unitMode - 学習単位
 * @param {string} charTraining - 文字特訓モード
 * @returns {string[]} ひらがなの配列
 */
function getWordList(level, unitMode = 'auto', charTraining = 'all') {
    if (typeof IDIOMS_DB === 'undefined') {
        console.warn('IDIOMS_DB not loaded, using fallback');
        return getFallbackWords();
    }

    const getHiraganaList = (list) => {
        if (!Array.isArray(list)) return [];
        return list
            .map(item => (item && typeof item.hiragana === 'string' ? item.hiragana : ''))
            .filter(Boolean);
    };

    const defaultByLevel = () => {
        switch (level) {
            case 'easy':
                return getHiraganaList(IDIOMS_DB.words);
            case 'normal':
                return getHiraganaList(IDIOMS_DB.yojijukugo);
            case 'hard':
                return [...getHiraganaList(IDIOMS_DB.kotowaza), ...getHiraganaList(IDIOMS_DB.sentences)];
            default:
                return getHiraganaList(IDIOMS_DB.words);
        }
    };

    let rawWords = [];
    switch (unitMode) {
        case 'word':
            rawWords = getHiraganaList(IDIOMS_DB.words);
            break;
        case 'proverb':
            rawWords = [...getHiraganaList(IDIOMS_DB.kotowaza), ...getHiraganaList(IDIOMS_DB.yojijukugo)];
            break;
        case 'sentence-short':
            rawWords = splitSentenceToChunks(getHiraganaList(IDIOMS_DB.sentences), 6, 16);
            break;
        case 'sentence-long':
            rawWords = getHiraganaList(IDIOMS_DB.sentences);
            break;
        case 'katakana':
            rawWords = getHiraganaList(IDIOMS_DB.words).filter((word) => /[\u30A0-\u30FF]/.test(word));
            break;
        case 'subject-science':
            rawWords = EXTRA_WORDS.subjectScience.slice();
            break;
        case 'subject-social':
            rawWords = EXTRA_WORDS.subjectSocial.slice();
            break;
        case 'ultra-beginner':
            rawWords = EXTRA_WORDS.ultraBeginner.slice();
            break;
        case 'auto':
        default:
            rawWords = defaultByLevel();
            break;
    }

    const charFiltered = filterWordsByCharTraining(rawWords, charTraining);
    const candidateWords = charFiltered.length > 0 ? charFiltered : rawWords;
    const sanitizedWords = sanitizeWordList(candidateWords);
    if (sanitizedWords.length === 0) {
        console.warn(`Word list empty for level=${level}, unit=${unitMode}, fallback`);
        return getFallbackWords();
    }
    return sanitizedWords;
}

// ============================================
// ストレージマネージャー
// ============================================
const StorageManager = {
    _readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
        } catch {
            return fallback;
        }
    },

    _writeJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    },

    _getData() {
        return this._readJSON(CONFIG.STORAGE_KEY, {});
    },

    getHighScore(level) {
        if (!Object.prototype.hasOwnProperty.call(CONFIG.INITIAL_TIME, level)) return 0;
        const score = Number(this._getData()[level]);
        return Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
    },

    saveHighScore(level, score) {
        try {
            if (!Object.prototype.hasOwnProperty.call(CONFIG.INITIAL_TIME, level)) return false;
            const safeScore = Number(score);
            if (!Number.isFinite(safeScore) || safeScore < 0) return false;

            const data = this._getData();
            const normalizedScore = Math.floor(safeScore);
            const currentHighScore = Number.isFinite(Number(data[level]))
                ? Math.max(0, Math.floor(Number(data[level])))
                : 0;
            const isNewRecord = normalizedScore > currentHighScore;
            if (isNewRecord) {
                data[level] = normalizedScore;
                // 実際の書き込みに成功した場合だけ新記録として扱う
                return this._writeJSON(CONFIG.STORAGE_KEY, data);
            }
            return false;
        } catch {
            return false;
        }
    },

    getPreferences() {
        const prefs = this._readJSON(CONFIG.PREFERENCES_KEY, {});
        const portalData = this._readJSON('wonder_school_profile_v2', null);
        return normalizePreferences(prefs, portalData);
    },

    savePreferences(preferences) {
        return this._writeJSON(CONFIG.PREFERENCES_KEY, preferences);
    },

    getStats() {
        const fallback = { history: [], streakDays: 0, lastPlayedDate: '', totalClears: 0 };
        const data = this._readJSON(CONFIG.STATS_KEY, fallback);
        data.history = normalizeStatsHistory(data.history, CONFIG.HISTORY_LIMIT);
        data.streakDays = Number.isFinite(data.streakDays) ? Math.max(0, Math.floor(data.streakDays)) : 0;
        data.totalClears = Number.isFinite(data.totalClears) ? Math.max(0, Math.floor(data.totalClears)) : 0;
        data.lastPlayedDate = typeof data.lastPlayedDate === 'string' ? data.lastPlayedDate : '';
        return data;
    },

    saveStats(stats) {
        return this._writeJSON(CONFIG.STATS_KEY, stats);
    },

    getDailyGoal() {
        const fallback = { date: '', target: CONFIG.GOAL_CHOICES[0], progress: 0 };
        const data = this._readJSON(CONFIG.GOAL_KEY, fallback);
        data.date = typeof data.date === 'string' ? data.date : '';
        data.target = CONFIG.GOAL_CHOICES.includes(data.target) ? data.target : CONFIG.GOAL_CHOICES[0];
        data.progress = Number.isFinite(data.progress) ? Math.max(0, Math.floor(data.progress)) : 0;
        return data;
    },

    saveDailyGoal(goalData) {
        return this._writeJSON(CONFIG.GOAL_KEY, goalData);
    },

    getSession() {
        return this._readJSON(CONFIG.SESSION_KEY, null);
    },

    saveSession(sessionData) {
        return this._writeJSON(CONFIG.SESSION_KEY, sessionData);
    },

    clearSession() {
        try {
            localStorage.removeItem(CONFIG.SESSION_KEY);
            return true;
        } catch {
            return false;
        }
    },

    hasSeenTutorial() {
        try {
            return localStorage.getItem(CONFIG.TUTORIAL_KEY) === '1';
        } catch {
            return false;
        }
    },

    setTutorialSeen() {
        try {
            localStorage.setItem(CONFIG.TUTORIAL_KEY, '1');
            return true;
        } catch {
            return false;
        }
    }
};

// ============================================
// ゲーム状態
// ============================================
let gameState = {
    level: 'easy',
    mode: 'dojo',
    unitMode: 'auto',
    charTraining: 'all',
    timeLeft: 30,
    score: 0,
    miss: 0,
    combo: 0,
    maxCombo: 0,
    typedChars: 0,
    elapsedSeconds: 0,
    currentWord: '',
    currentWordNormalized: '',
    currentRomaji: '',
    activeRomajiPattern: '',
    currentPatterns: [],
    currentPatternSet: new Set(),
    currentPrefixSet: new Set(['']),
    hasMissedCurrent: false,
    isBonusWord: false,
    recentWords: [],
    timerInterval: null,
    countdownInterval: null,
    words: [],
    sentenceBuckets: null,
    dailyGoalTarget: CONFIG.GOAL_CHOICES[0],
    dailyGoalProgressAtStart: 0,
    totalWords: 0,
    isCountingDown: false,
    isPaused: false,
    isRunning: false
};

let appState = {
    selectedMode: 'dojo',
    selectedUnit: 'auto',
    selectedCharTraining: 'all',
    selectedGoal: CONFIG.GOAL_CHOICES[0],
    selectedLevel: 'easy',
    settings: StorageManager.getPreferences(),
    stats: StorageManager.getStats(),
    tutorialStepIndex: 0,
    tutorialRemainingSeconds: CONFIG.TUTORIAL_TOTAL_SECONDS,
    tutorialInterval: null,
    pendingSession: null,
    dailyGoal: null
};

// ============================================
// DOM要素
// ============================================
let elements = {};
let gameSessionToken = 0;
let inputIsComposing = false;
let compositionStartValue = '';
let gameClockLast = null;
let gameClockRemainder = 0;
let settingsResumeGame = false;
let spaceShortcutHeld = false;
const uiTimeouts = new Map();

// 画面を離れた後の古いフォーカス・点滅処理を残さない。
function scheduleUI(name, callback, delay) {
    clearTimeout(uiTimeouts.get(name));
    const token = gameSessionToken;
    const timer = setTimeout(() => {
        if (uiTimeouts.get(name) !== timer) return;
        uiTimeouts.delete(name);
        if (token === gameSessionToken) callback();
    }, delay);
    uiTimeouts.set(name, timer);
}

function clearUITimeouts() {
    for (const timer of uiTimeouts.values()) clearTimeout(timer);
    uiTimeouts.clear();
}

function isPracticeBlocked() {
    return inputIsComposing || gameState.isCountingDown ||
        elements.settingsOverlay?.classList.contains('active') ||
        elements.tutorialOverlay?.classList.contains('active') ||
        Boolean(document.getElementById('parents-modal')?.open);
}

function startGameClock() {
    clearInterval(gameState.timerInterval);
    gameClockLast = performance.now();
    const token = gameSessionToken;
    const timer = setInterval(() => {
        if (token === gameSessionToken && gameState.timerInterval === timer) tick();
    }, CONFIG.TICK_INTERVAL_MS);
    gameState.timerInterval = timer;
}

function settleGameClock() {
    if (gameClockLast === null || !gameState.isRunning || gameState.isPaused) return;
    const now = performance.now();
    const delta = Math.max(0, now - gameClockLast);
    gameClockLast = now;
    gameClockRemainder += delta;
    const seconds = Math.floor(gameClockRemainder / 1000);
    gameClockRemainder -= seconds * 1000;
    gameState.elapsedSeconds += Math.min(gameState.timeLeft, seconds);
    gameState.timeLeft = Math.max(0, gameState.timeLeft - seconds);
}

function initializeElements() {
    const ids = [
        'start-screen', 'game-screen', 'result-screen',
        'timer', 'score', 'miss', 'hiragana', 'romaji-hint',
        'input', 'bonus-popup', 'result-score', 'result-miss',
        'result-accuracy', 'result-highscore', 'retry-btn', 'home-btn', 'word-count',
        'combo', 'goal-status', 'bonus-word-badge', 'rank-badge',
        'result-wpm', 'result-max-combo', 'result-rank', 'result-goal-status', 'growth-chart',
        'player-rank', 'streak-badge', 'goal-progress', 'difficulty-help', 'difficulty-sample',
        'resume-card', 'resume-desc', 'resume-session-btn', 'discard-session-btn',
        'open-settings-btn', 'open-settings-btn-game',
        'settings-overlay', 'close-settings-btn', 'focus-mode-toggle', 'sound-toggle', 'sound-volume', 'auto-resume-toggle',
        'romaji-hint-toggle', 'keyboard-type-select', 'settings-keyboard-group',
        'tutorial-overlay', 'tutorial-step-title', 'tutorial-step-body', 'tutorial-progress-bar', 'tutorial-next-btn', 'tutorial-skip-btn', 'open-tutorial-btn',
        'countdown-overlay', 'countdown-number', 'countdown-level',
        'pause-overlay', 'pause-btn', 'resume-btn', 'quit-btn',
        'quit-from-pause-btn', 'level-badge', 'review-btn', 'review-section', 'review-count'
    ];

    ids.forEach(id => {
        const key = id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        elements[key] = document.getElementById(id);
    });
}

// ============================================
// ユーティリティ関数
// ============================================

function getTodayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getYesterdayKey(todayKey) {
    if (typeof todayKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(todayKey)) return '';
    // 日付だけのISO文字列はUTCになるため、ローカル正午で暦日を計算する。
    const dt = new Date(`${todayKey}T12:00:00`);
    if (Number.isNaN(dt.getTime()) || getTodayKey(dt) !== todayKey) return '';
    dt.setDate(dt.getDate() - 1);
    return getTodayKey(dt);
}

function recordWrongWord(word) {
    if (!gameState.wrongWords) {
        gameState.wrongWords = [];
    }
    if (word && !gameState.wrongWords.includes(word)) {
        gameState.wrongWords.push(word);
    }
}

function applyPortalSettings() {
    try {
        const portalRaw = localStorage.getItem('wonder_school_profile_v2');
        if (portalRaw) {
            const portalData = JSON.parse(portalRaw);
            if (portalData.textSize === 'large') {
                document.body.classList.add('text-large');
            }
            if (portalData.reduceMotion === true) {
                document.body.classList.add('reduce-motion');
            }
        }
    } catch (e) {
        console.error("Failed to apply portal settings:", e);
    }
}

function getBonusWord() {
    const list = EXTRA_WORDS.bonus;
    if (!Array.isArray(list) || list.length === 0) return 'きせき';
    return list[Math.floor(Math.random() * list.length)];
}

function applyFocusModeClass(enabled) {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('focus-mode', Boolean(enabled));
}

function updateDifficultyGuide(level) {
    if (!elements.difficultyHelp || !elements.difficultySample) return;
    elements.difficultyHelp.textContent = CONFIG.LEVEL_GUIDES[level] || CONFIG.LEVEL_GUIDES.easy;
    let sample = GUIDE_SAMPLE_MAP[appState.selectedUnit]?.[level] || GUIDE_SAMPLE_MAP.auto[level] || 'さくら';
    if (appState.selectedCharTraining !== 'all') {
        sample = CHAR_TRAINING_SAMPLE_MAP[appState.selectedCharTraining] || sample;
    }
    elements.difficultySample.textContent = `例: ${sample}`;
}

function focusGameInput(retryCount = 6) {
    if (!elements.input) return;
    if (!gameState.isRunning || gameState.isPaused || isPracticeBlocked()) return;

    elements.input.disabled = false;
    try {
        elements.input.focus({ preventScroll: true });
    } catch {
        elements.input.focus();
    }
    const valueLen = elements.input.value.length;
    try {
        if (typeof elements.input.setSelectionRange === 'function') {
            elements.input.setSelectionRange(valueLen, valueLen);
        }
    } catch {
        // フォーカス遷移直後に例外が出る環境向けに無視
    }

    // 入力欄が画面外にある場合、開始時に見える位置まで寄せる
    if (typeof window !== 'undefined') {
        const rect = elements.input.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
            elements.input.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
    }

    if (document.activeElement !== elements.input && retryCount > 0) {
        const previousFocus = document.activeElement;
        scheduleUI('input-focus', () => {
            if (document.activeElement === previousFocus) focusGameInput(retryCount - 1);
        }, 70);
    }
}

function updateRankUI() {
    const rank = getRankLabel(appState.stats.streakDays);
    if (elements.playerRank) elements.playerRank.textContent = `段位: ${rank}`;
    if (elements.rankBadge) elements.rankBadge.textContent = rank;
    if (elements.resultRank) elements.resultRank.textContent = rank;
    if (elements.streakBadge) elements.streakBadge.textContent = `連続: ${appState.stats.streakDays}日`;
}

function getCurrentDailyGoal() {
    const today = getTodayKey();
    const saved = appState.dailyGoal || StorageManager.getDailyGoal();
    if (saved.date !== today) {
        appState.dailyGoal = { date: today, target: appState.selectedGoal, progress: 0 };
        return appState.dailyGoal;
    }
    appState.dailyGoal = saved;
    return saved;
}

function setDailyGoal(target) {
    const safeTarget = CONFIG.GOAL_CHOICES.includes(target) ? target : CONFIG.GOAL_CHOICES[0];
    const data = getCurrentDailyGoal();
    data.target = safeTarget;
    StorageManager.saveDailyGoal(data);
    appState.selectedGoal = safeTarget;
    updateGoalUI(data.progress, safeTarget);
}

function updateGoalUI(progress, target) {
    const safeProgress = Math.max(0, Math.floor(progress || 0));
    const safeTarget = CONFIG.GOAL_CHOICES.includes(target) ? target : CONFIG.GOAL_CHOICES[0];
    if (elements.goalProgress) {
        elements.goalProgress.textContent = `今日 ${safeProgress}/${safeTarget} 問`;
    }
    if (elements.goalStatus) {
        elements.goalStatus.textContent = `${Math.min(safeProgress, safeTarget)}/${safeTarget}`;
    }
}

function incrementDailyGoalProgress(amount = 1) {
    const data = getCurrentDailyGoal();
    data.progress += Math.max(0, Math.floor(amount));
    StorageManager.saveDailyGoal(data);
    updateGoalUI(data.progress, data.target);
    return data;
}

function getDailyGoalResultText() {
    const data = getCurrentDailyGoal();
    const reached = data.progress >= data.target;
    return reached ? `達成！ ${data.progress}/${data.target}` : `${data.progress}/${data.target}`;
}

function updateStatsWithSession(sessionResult) {
    const today = getTodayKey();
    const yesterday = getYesterdayKey(today);
    const stats = appState.stats;

    if (stats.lastPlayedDate !== today) {
        if (stats.lastPlayedDate === yesterday) {
            stats.streakDays += 1;
        } else {
            stats.streakDays = 1;
        }
        stats.lastPlayedDate = today;
    }

    stats.totalClears += sessionResult.score;
    stats.history.push(sessionResult);
    stats.history = stats.history.slice(-CONFIG.HISTORY_LIMIT);
    StorageManager.saveStats(stats);
    appState.stats = stats;
}

function renderGrowthChart() {
    if (!elements.growthChart) return;
    const history = Array.isArray(appState.stats.history) ? appState.stats.history : [];
    const data = history.slice(-CONFIG.HISTORY_LIMIT);
    if (data.length === 0) {
        elements.growthChart.innerHTML = '';
        return;
    }

    const width = 360;
    const height = 140;
    const pad = 14;
    const plotW = width - pad * 2;
    const plotH = height - pad * 2;
    const maxWpm = Math.max(1, ...data.map((d) => Number(d.wpm) || 0));
    const maxAccuracy = 100;
    const maxMissRate = 100;

    const toPath = (values, maxValue) => values.map((v, idx) => {
        const x = pad + (plotW * idx / Math.max(1, values.length - 1));
        const y = pad + (plotH - (plotH * (Math.max(0, v) / Math.max(1, maxValue))));
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');

    const wpmPath = toPath(data.map((d) => Number(d.wpm) || 0), maxWpm);
    const accuracyPath = toPath(data.map((d) => Number(d.accuracy) || 0), maxAccuracy);
    const missPath = toPath(data.map((d) => Number(d.missRate) || 0), maxMissRate);

    elements.growthChart.innerHTML =
        `<path d="${wpmPath}" class="chart-line chart-line-wpm"></path>` +
        `<path d="${accuracyPath}" class="chart-line chart-line-accuracy"></path>` +
        `<path d="${missPath}" class="chart-line chart-line-miss"></path>`;
}

function getFallbackWords() {
    return ['さくら', 'りんご', 'みかん'];
}

function clearCountdown() {
    if (gameState.countdownInterval) {
        clearInterval(gameState.countdownInterval);
        gameState.countdownInterval = null;
    }
    gameState.isCountingDown = false;
    setOverlayVisibility(elements.countdownOverlay, false);
}

function resetInteractiveUIState() {
    if (elements.hiragana) elements.hiragana.style.visibility = 'visible';
    if (elements.romajiHint) elements.romajiHint.style.visibility = 'visible';
    inputIsComposing = false;
    if (elements.input) {
        elements.input.disabled = false;
        elements.input.classList.remove('correct', 'wrong');
    }
    markBonusWord(false);
    setOverlayVisibility(elements.pauseOverlay, false);
}

function setOverlayVisibility(overlayElement, isVisible) {
    if (!overlayElement) return;
    overlayElement.classList.toggle('active', isVisible);
    overlayElement.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    const modalActive = [elements.settingsOverlay, elements.tutorialOverlay, elements.pauseOverlay, elements.countdownOverlay]
        .some((overlay) => overlay?.classList.contains('active'));
    document.querySelectorAll('.screen').forEach((screen) => { screen.inert = modalActive; });
}

function trapFocus(e, container) {
    if (e.key !== 'Tab') return;
    const focusables = [...container.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((el) => !el.closest('[hidden]') && el.getClientRects().length > 0);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) {
            last.focus();
            e.preventDefault();
        }
    } else {
        if (document.activeElement === last || !container.contains(document.activeElement)) {
            first.focus();
            e.preventDefault();
        }
    }
}

function updateChipSelection(selector, predicate) {
    document.querySelectorAll(selector).forEach((button) => {
        const isActive = predicate(button);
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

function applySettingsToUI() {
    const settings = appState.settings;
    if (elements.focusModeToggle) elements.focusModeToggle.checked = Boolean(settings.focusMode);
    if (elements.soundToggle) elements.soundToggle.checked = Boolean(settings.soundEnabled);
    if (elements.soundVolume) elements.soundVolume.value = String(settings.soundVolume ?? 60);
    if (elements.autoResumeToggle) elements.autoResumeToggle.checked = Boolean(settings.autoResume);
    if (elements.romajiHintToggle) elements.romajiHintToggle.checked = settings.showRomajiHint !== false;
    if (elements.keyboardTypeSelect) elements.keyboardTypeSelect.value = settings.keyboardType || 'kana';
    applyFocusModeClass(Boolean(settings.focusMode));
}

function saveSettingsFromUI() {
    appState.settings = normalizePreferences({
        focusMode: Boolean(elements.focusModeToggle?.checked),
        soundEnabled: Boolean(elements.soundToggle?.checked),
        soundVolume: Number(elements.soundVolume?.value ?? 60),
        autoResume: Boolean(elements.autoResumeToggle?.checked),
        showRomajiHint: elements.romajiHintToggle ? Boolean(elements.romajiHintToggle.checked) : true,
        keyboardType: elements.keyboardTypeSelect ? elements.keyboardTypeSelect.value : 'kana'
    });
    StorageManager.savePreferences(appState.settings);
    applyFocusModeClass(appState.settings.focusMode);
    if (gameState.isRunning) updateRomajiDisplay(sanitizeTypingInput(elements.input?.value || ''));
    if (elements.resumeCard) {
        elements.resumeCard.hidden = !appState.settings.autoResume || !canRestoreSession(appState.pendingSession) || gameState.isRunning;
    }
    
    if (typeof updateKeyboardDisplay === 'function') {
        updateKeyboardDisplay();
    }
}

let settingsTriggerElement = null;

function openSettings() {
    if (gameState.isCountingDown || elements.settingsOverlay?.classList.contains('active')) return;
    settingsTriggerElement = document.activeElement;
    settingsResumeGame = gameState.isRunning && !gameState.isPaused;
    if (settingsResumeGame) {
        pauseGame(false);
        if (!gameState.isRunning) { settingsResumeGame = false; return; }
    }
    setOverlayVisibility(elements.settingsOverlay, true);
    scheduleUI('settings-focus', () => {
        if (elements.settingsOverlay?.classList.contains('active')) {
            elements.settingsOverlay.querySelector('input, select, button')?.focus();
        }
    }, 50);
}

function closeSettings() {
    setOverlayVisibility(elements.settingsOverlay, false);
    const resume = settingsResumeGame;
    settingsResumeGame = false;
    if (resume && document.visibilityState !== 'hidden') resumeGame();
    else if (resume) setOverlayVisibility(elements.pauseOverlay, true);
    if (!resume && settingsTriggerElement?.isConnected) settingsTriggerElement.focus();
    settingsTriggerElement = null;
}

function resetTutorialTimer() {
    if (appState.tutorialInterval) {
        clearInterval(appState.tutorialInterval);
        appState.tutorialInterval = null;
    }
}

let tutorialTriggerElement = null;

function closeTutorial() {
    resetTutorialTimer();
    setOverlayVisibility(elements.tutorialOverlay, false);
    StorageManager.setTutorialSeen();
    if (tutorialTriggerElement?.isConnected) tutorialTriggerElement.focus();
    else if (elements.startScreen?.classList.contains('active')) elements.openTutorialBtn?.focus();
    tutorialTriggerElement = null;
}

function renderTutorialStep() {
    const step = TUTORIAL_STEPS[appState.tutorialStepIndex] || TUTORIAL_STEPS[0];
    if (elements.tutorialStepTitle) elements.tutorialStepTitle.textContent = step.title;
    if (elements.tutorialStepBody) elements.tutorialStepBody.textContent = step.body;
    const percent = Math.max(0, Math.min(100, ((CONFIG.TUTORIAL_TOTAL_SECONDS - appState.tutorialRemainingSeconds) / CONFIG.TUTORIAL_TOTAL_SECONDS) * 100));
    if (elements.tutorialProgressBar) elements.tutorialProgressBar.style.width = `${percent}%`;
}

function nextTutorialStep() {
    if (appState.tutorialStepIndex >= TUTORIAL_STEPS.length - 1) {
        closeTutorial();
        return;
    }
    appState.tutorialStepIndex += 1;
    renderTutorialStep();
}

function openTutorial(autoStart = false) {
    if (!autoStart) {
        tutorialTriggerElement = document.activeElement;
    }
    setOverlayVisibility(elements.tutorialOverlay, true);
    appState.tutorialStepIndex = 0;
    appState.tutorialRemainingSeconds = CONFIG.TUTORIAL_TOTAL_SECONDS;
    renderTutorialStep();
    resetTutorialTimer();
    
    scheduleUI('tutorial-focus', () => {
        if (elements.tutorialOverlay?.classList.contains('active')) elements.tutorialNextBtn?.focus();
    }, 50);

    appState.tutorialInterval = setInterval(() => {
        if (document.visibilityState === 'hidden') return;
        appState.tutorialRemainingSeconds -= 1;
        if (appState.tutorialRemainingSeconds <= 0) {
            closeTutorial();
            return;
        }
        const stepIndex = Math.min(
            TUTORIAL_STEPS.length - 1,
            Math.floor((CONFIG.TUTORIAL_TOTAL_SECONDS - appState.tutorialRemainingSeconds) / CONFIG.TUTORIAL_STEP_SECONDS)
        );
        if (stepIndex > appState.tutorialStepIndex) {
            appState.tutorialStepIndex = stepIndex;
        }
        renderTutorialStep();
    }, 1000);
    if (!autoStart) StorageManager.setTutorialSeen();
}

function updateStartSelections() {
    updateChipSelection('.difficulty-select .btn[data-level]', (btn) => btn.dataset.level === appState.selectedLevel);
    updateChipSelection('.mode-btn', (btn) => btn.dataset.mode === appState.selectedMode);
    updateChipSelection('.unit-btn', (btn) => btn.dataset.unit === appState.selectedUnit);
    updateChipSelection('.char-btn', (btn) => btn.dataset.charTraining === appState.selectedCharTraining);
    updateChipSelection('.goal-btn', (btn) => Number(btn.dataset.goal) === appState.selectedGoal);
}

function getActiveWordPoolForGame() {
    return getWordList(gameState.level, gameState.unitMode, gameState.charTraining);
}

function markBonusWord(isBonus) {
    gameState.isBonusWord = Boolean(isBonus);
    if (elements.bonusWordBadge) {
        elements.bonusWordBadge.hidden = !isBonus;
    }
}

function saveSessionSnapshot(options = {}) {
    const includePaused = Boolean(options.includePaused);
    if (!gameState.isRunning || gameState.isCountingDown) return;
    if (!includePaused && gameState.isPaused) return;
    const data = {
        savedAt: Date.now(),
        level: gameState.level,
        mode: gameState.mode,
        unitMode: gameState.unitMode,
        charTraining: gameState.charTraining,
        timeLeft: gameState.timeLeft,
        score: gameState.score,
        miss: gameState.miss,
        combo: gameState.combo,
        maxCombo: gameState.maxCombo,
        typedChars: gameState.typedChars,
        elapsedSeconds: gameState.elapsedSeconds,
        currentWord: gameState.currentWord,
        currentWordNormalized: gameState.currentWordNormalized,
        activeRomajiPattern: gameState.activeRomajiPattern,
        hasMissedCurrent: gameState.hasMissedCurrent,
        isBonusWord: gameState.isBonusWord,
        wrongWords: gameState.wrongWords || [],
        isReviewMode: Boolean(appState.isReviewMode),
        reviewWords: appState.reviewWords || [],
        clockRemainder: gameClockRemainder,
        inputValue: elements.input?.value || '',
        // 通常の語彙・長文バケットは設定から再生成できる。復習の残りだけ保存する。
        words: appState.isReviewMode ? gameState.words.slice() : undefined,
        recentWords: Array.isArray(gameState.recentWords) ? gameState.recentWords.slice() : [],
        totalWords: gameState.totalWords,
        dailyGoalTarget: gameState.dailyGoalTarget,
        dailyGoalProgressAtStart: gameState.dailyGoalProgressAtStart
    };
    StorageManager.saveSession(data);
    appState.pendingSession = data;
}

function clearSessionSnapshot() {
    StorageManager.clearSession();
    appState.pendingSession = null;
    if (elements.resumeCard) elements.resumeCard.hidden = true;
}

function canRestoreSession(session) {
    if (!session || typeof session !== 'object' || Array.isArray(session)) return false;
    const age = Date.now() - Number(session.savedAt || 0);
    if (!Number.isFinite(age) || age < 0 || age > CONFIG.SESSION_MAX_AGE_MS) return false;
    if (typeof session.currentWord !== 'string' || session.currentWord.length > 256 || sanitizeWordList([session.currentWord]).length !== 1) return false;
    if (normalizeKanaToHiragana(session.currentWord) !== session.currentWordNormalized) return false;
    const counters = ['timeLeft', 'score', 'miss', 'combo', 'maxCombo', 'typedChars', 'elapsedSeconds', 'totalWords', 'dailyGoalProgressAtStart'];
    if (counters.some((key) => !Number.isSafeInteger(session[key]) || session[key] < 0)) return false;
    return session.timeLeft > 0 && session.timeLeft <= 86400;
}

function showResumeCard(session) {
    if (!elements.resumeCard || !elements.resumeDesc) return;
    elements.resumeDesc.textContent = `残り${session.timeLeft}秒 / 正解${session.score} / ミス${session.miss}`;
    elements.resumeCard.hidden = false;
}

function restoreSession(session) {
    if (!canRestoreSession(session)) {
        clearSessionSnapshot();
        return false;
    }

    gameSessionToken += 1;
    stopGameTimers();
    resetInteractiveUIState();
    showScreen('game-screen');

    const safeLevel = Object.prototype.hasOwnProperty.call(CONFIG.INITIAL_TIME, session.level) ? session.level : 'easy';
    const safeMode = Object.prototype.hasOwnProperty.call(CONFIG.PLAY_MODES, session.mode) ? session.mode : 'dojo';
    const safeUnit = Object.prototype.hasOwnProperty.call(CONFIG.UNIT_MODES, session.unitMode) ? session.unitMode : 'auto';
    const safeCharTraining = ['all', 'youon', 'sokuon', 'hatsuon', 'choon'].includes(session.charTraining)
        ? session.charTraining
        : 'all';

    gameState = {
        level: safeLevel,
        mode: safeMode,
        unitMode: safeUnit,
        charTraining: safeCharTraining,
        timeLeft: Math.max(1, Number(session.timeLeft) || 1),
        score: Math.max(0, Number(session.score) || 0),
        miss: Math.max(0, Number(session.miss) || 0),
        combo: Math.max(0, Number(session.combo) || 0),
        maxCombo: Math.max(0, Number(session.maxCombo) || 0),
        typedChars: Math.max(0, Number(session.typedChars) || 0),
        elapsedSeconds: Math.max(0, Number(session.elapsedSeconds) || 0),
        currentWord: String(session.currentWord || ''),
        currentWordNormalized: String(session.currentWordNormalized || ''),
        currentRomaji: hiraganaToRomaji(String(session.currentWordNormalized || '')),
        activeRomajiPattern: String(session.activeRomajiPattern || ''),
        currentPatterns: [],
        currentPatternSet: new Set(),
        currentPrefixSet: new Set(['']),
        hasMissedCurrent: Boolean(session.hasMissedCurrent),
        isBonusWord: Boolean(session.isBonusWord),
        wrongWords: sanitizeWordList(session.wrongWords),
        recentWords: Array.isArray(session.recentWords) ? session.recentWords.slice(0, CONFIG.RECENT_WORD_LIMIT) : [],
        timerInterval: null,
        countdownInterval: null,
        words: session.isReviewMode ? sanitizeWordList(session.words) : getWordList(safeLevel, safeUnit, safeCharTraining),
        sentenceBuckets: safeUnit === 'sentence-long' ? getSentenceBuckets(getWordList(safeLevel, safeUnit, safeCharTraining)) : null,
        dailyGoalTarget: CONFIG.GOAL_CHOICES.includes(session.dailyGoalTarget) ? session.dailyGoalTarget : appState.selectedGoal,
        dailyGoalProgressAtStart: Math.max(0, Number(session.dailyGoalProgressAtStart) || 0),
        totalWords: Math.max(0, Number(session.totalWords) || 0),
        isCountingDown: false,
        isPaused: false,
        isRunning: true
    };

    appState.isReviewMode = session.isReviewMode === true;
    appState.reviewWords = sanitizeWordList(session.reviewWords);
    if (!appState.reviewWords.length) appState.isReviewMode = false;
    gameClockRemainder = Number.isFinite(session.clockRemainder) ? Math.max(0, Math.min(999, session.clockRemainder)) : 0;
    appState.selectedLevel = safeLevel;
    appState.selectedMode = safeMode;
    appState.selectedUnit = safeUnit;
    appState.selectedCharTraining = safeCharTraining;
    updateStartSelections();

    const cache = buildPatternCache(gameState.currentWordNormalized, { includePatterns: false });
    gameState.currentMatcher = cache.matcher;
    gameState.currentPatterns = cache.patterns;
    gameState.currentPatternSet = cache.patternSet;
    gameState.currentPrefixSet = cache.prefixSet;
    gameState.activeRomajiPattern = resolveRestoredRomajiPattern(
        gameState.activeRomajiPattern,
        cache.matcher,
        cache.defaultPattern
    );

    if (elements.levelBadge) elements.levelBadge.textContent = CONFIG.LEVEL_LABELS[gameState.level];
    const goalData = getCurrentDailyGoal();
    gameState.dailyGoalTarget = CONFIG.GOAL_CHOICES.includes(session.dailyGoalTarget) ? session.dailyGoalTarget : goalData.target;
    updateGoalUI(goalData.progress, gameState.dailyGoalTarget);
    if (elements.goalStatus) {
        elements.goalStatus.textContent = `${Math.min(goalData.progress, gameState.dailyGoalTarget)}/${gameState.dailyGoalTarget}`;
    }

    if (elements.input) {
        const restoredInput = sanitizeTypingInput(session.inputValue);
        elements.input.value = gameState.currentMatcher.hasPrefix(restoredInput) && !gameState.currentMatcher.isComplete(restoredInput) ? restoredInput : '';
        elements.input.disabled = false;
    }

    updateUI();
    if (elements.hiragana) elements.hiragana.textContent = gameState.currentWord;
    markBonusWord(gameState.isBonusWord);
    updateRomajiDisplay(sanitizeTypingInput(elements.input?.value || ''));
    startGameClock();
    focusGameInput();
    if (elements.resumeCard) elements.resumeCard.hidden = true;
    return true;
}

function flashInput(type) {
    if (!elements.input) return;
    elements.input.classList.add(type);
    scheduleUI(`flash-${type}`, () => {
        elements.input?.classList.remove(type);
    }, CONFIG.FLASH_DURATION_MS);
}

const SoundManager = {
    audioContext: null,
    get enabled() {
        return Boolean(appState.settings.soundEnabled);
    },
    get volume() {
        const percent = Number(appState.settings.soundVolume);
        return Math.max(0, Math.min(1, (Number.isFinite(percent) ? percent : 60) / 100));
    },
    ensureContext() {
        if (!this.enabled || typeof window === 'undefined') return null;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        if (!this.audioContext) {
            try { this.audioContext = new Ctx(); } catch { return null; }
        }
        if (this.audioContext.state === 'suspended') {
            try { this.audioContext.resume().catch(() => {}); } catch { return null; }
        }
        return this.audioContext;
    },
    play(type) {
        const ctx = this.ensureContext();
        if (!ctx) return;

        const table = {
            correct: { freq: 660, duration: 0.06 },
            wrong: { freq: 220, duration: 0.09 },
            bonus: { freq: 880, duration: 0.12 },
            finish: { freq: 523, duration: 0.15 }
        };
        const tone = table[type] || table.correct;

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = tone.freq;
            osc.type = 'triangle';
            gain.gain.value = this.volume * 0.25;
            osc.connect(gain);
            gain.connect(ctx.destination);
            const now = ctx.currentTime;
            gain.gain.setValueAtTime(this.volume * 0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + tone.duration);
            osc.start(now);
            osc.onended = () => { osc.disconnect(); gain.disconnect(); };
            osc.stop(now + tone.duration);
        } catch {
            // 音声デバイスの例外で入力・結果処理を中断しない。
        }
    }
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// ============================================
// カウントダウン機能
// ============================================

function showCountdown(level, onComplete) {
    const overlay = elements.countdownOverlay;
    const numberEl = elements.countdownNumber;
    const levelEl = elements.countdownLevel;

    clearCountdown();
    gameState.isCountingDown = true;

    if (!overlay || !numberEl || !levelEl) {
        gameState.isCountingDown = false;
        onComplete();
        return;
    }

    levelEl.textContent = CONFIG.LEVEL_LABELS[level] || level;
    setOverlayVisibility(overlay, true);
    overlay.focus();

    let count = CONFIG.COUNTDOWN_SECONDS;
    numberEl.textContent = count;

    const interval = setInterval(() => {
        if (gameState.countdownInterval !== interval || document.visibilityState === 'hidden') return;
        count--;
        if (count > 0) {
            numberEl.textContent = count;
        } else if (count === 0) {
            numberEl.textContent = 'GO!';
        } else {
            clearInterval(interval);
            if (gameState.countdownInterval === interval) {
                gameState.countdownInterval = null;
            }
            gameState.isCountingDown = false;
            setOverlayVisibility(overlay, false);
            onComplete();
        }
    }, CONFIG.COUNTDOWN_INTERVAL_MS);
    gameState.countdownInterval = interval;
}

// ============================================
// 一時停止機能
// ============================================

function pauseGame(showOverlay = true) {
    if (!gameState.isRunning || gameState.isPaused || gameState.isCountingDown) return;

    settleGameClock();
    if (gameState.timeLeft <= 0) { endGame(); return; }
    gameState.isPaused = true;
    if (inputIsComposing && elements.input) elements.input.value = compositionStartValue;
    inputIsComposing = false;
    gameClockLast = null;
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;

    // 単語を隠す
    if (elements.hiragana) elements.hiragana.style.visibility = 'hidden';
    if (elements.romajiHint) elements.romajiHint.style.visibility = 'hidden';
    if (elements.input) elements.input.disabled = true;

    setOverlayVisibility(elements.pauseOverlay, showOverlay);
    saveSessionSnapshot({ includePaused: true });
    scheduleUI('pause-focus', () => {
        if (gameState.isPaused && !elements.settingsOverlay?.classList.contains('active')) elements.resumeBtn?.focus();
    }, 50);
}

function resumeGame() {
    if (!gameState.isPaused || !gameState.isRunning || document.visibilityState === 'hidden' || elements.settingsOverlay?.classList.contains('active')) return;

    gameState.isPaused = false;
    setOverlayVisibility(elements.pauseOverlay, false);

    // 単語を表示
    if (elements.hiragana) elements.hiragana.style.visibility = 'visible';
    if (elements.romajiHint) elements.romajiHint.style.visibility = 'visible';
    if (elements.input) {
        elements.input.disabled = false;
        focusGameInput();
    }

    // タイマー再開
    startGameClock();
    saveSessionSnapshot();
}

function togglePause() {
    if (!gameState.isRunning || gameState.isCountingDown) return;
    if (gameState.isPaused) {
        resumeGame();
    } else {
        pauseGame();
    }
}

// ============================================
// ゲームロジック
// ============================================

function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));

    let targetScreen = document.getElementById(screenId);
    if (!targetScreen) {
        console.warn(`Screen not found: ${screenId}`);
        targetScreen = elements.startScreen || document.getElementById('start-screen');
    }
    targetScreen?.classList.add('active');

    if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
}

function stopGameTimers() {
    clearUITimeouts();
    gameClockLast = null;
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = null;
    clearCountdown();
}

function clearRunningState() {
    gameState.isRunning = false;
    gameState.isPaused = false;
    inputIsComposing = false;
    settingsResumeGame = false;
}

function resolveInitialTime(level, mode) {
    const modeConfig = CONFIG.PLAY_MODES[mode];
    if (modeConfig && Number.isFinite(modeConfig.initialTime)) {
        return Math.max(10, Math.floor(modeConfig.initialTime));
    }
    const levelTime = CONFIG.INITIAL_TIME[level];
    return Number.isFinite(levelTime) ? Math.max(10, Math.floor(levelTime)) : 60;
}

function resolveTimeBonus(level, mode, hasMissedCurrent, isBonusWord) {
    const bonusConfig = CONFIG.TIME_BONUS[level] || { normal: 0, perfect: 0 };
    const baseBonus = hasMissedCurrent ? bonusConfig.normal : bonusConfig.perfect;
    const modeConfig = CONFIG.PLAY_MODES[mode] || CONFIG.PLAY_MODES.dojo;
    const multiplied = Math.round(baseBonus * (modeConfig.bonusMultiplier || 1));
    const bonusWordExtra = isBonusWord ? CONFIG.BONUS_WORD_EXTRA_SECONDS : 0;
    return Math.max(0, multiplied + bonusWordExtra);
}

function resolveCurrentWordPool() {
    if (gameState.unitMode === 'sentence-long' && gameState.sentenceBuckets) {
        const bucket = resolveSentenceBucketByScore(gameState.score, gameState.sentenceBuckets);
        if (Array.isArray(bucket) && bucket.length > 0) {
            return bucket;
        }
    }
    return gameState.words;
}

function replenishWordPool() {
    if (appState.isReviewMode && appState.reviewWords && appState.reviewWords.length > 0) {
        const shuffled = sanitizeWordList(appState.reviewWords);
        shuffleArray(shuffled);
        return shuffled;
    }
    if (gameState.unitMode === 'sentence-long' && gameState.sentenceBuckets) {
        const full = sanitizeWordList(gameState.sentenceBuckets.full);
        if (full.length > 0) return full;
    }
    const words = getWordList(gameState.level, gameState.unitMode, gameState.charTraining);
    return sanitizeWordList(words);
}

function rememberRecentWord(word) {
    if (!word) return;
    gameState.recentWords.push(word);
    if (gameState.recentWords.length > CONFIG.RECENT_WORD_LIMIT) {
        gameState.recentWords.shift();
    }
}

function setCurrentWord(word, isBonusWord = false) {
    const safeWord = typeof word === 'string' && word.length > 0 ? word : getFallbackWords()[0];
    gameState.currentWord = safeWord;
    gameState.currentWordNormalized = normalizeKanaToHiragana(safeWord);
    const patternCache = buildPatternCache(gameState.currentWordNormalized, { includePatterns: false });
    gameState.currentRomaji = patternCache.defaultPattern;
    gameState.currentMatcher = patternCache.matcher;
    gameState.currentPatterns = patternCache.patterns;
    gameState.currentPatternSet = patternCache.patternSet;
    gameState.currentPrefixSet = patternCache.prefixSet;
    gameState.activeRomajiPattern = patternCache.defaultPattern;
    gameState.hasMissedCurrent = false;
    markBonusWord(isBonusWord);

    if (elements.hiragana) elements.hiragana.textContent = gameState.currentWord;
    if (elements.input) {
        elements.input.value = '';
        elements.input.classList.remove('correct', 'wrong');
    }
    updateRomajiDisplay('');
}

function startGame(level, isReviewMode = false) {
    const safeLevel = Object.prototype.hasOwnProperty.call(CONFIG.INITIAL_TIME, level) ? level : 'easy';
    if (safeLevel !== level) {
        console.warn(`Invalid level: ${level}, fallback to easy`);
    }

    // 進行中のゲーム/カウントダウンをキャンセル
    gameSessionToken += 1;
    const sessionTokenAtStart = gameSessionToken;
    stopGameTimers();
    clearRunningState();
    gameClockRemainder = 0;
    resetInteractiveUIState();
    if (elements.input) elements.input.disabled = true;

    // カウントダウンを表示してからゲーム開始
    showScreen('game-screen');

    showCountdown(safeLevel, () => {
        // 開始前に中断されていたら何もしない
        if (sessionTokenAtStart !== gameSessionToken) return;

        const safeMode = Object.prototype.hasOwnProperty.call(CONFIG.PLAY_MODES, appState.selectedMode)
            ? appState.selectedMode
            : 'dojo';
        const safeUnit = Object.prototype.hasOwnProperty.call(CONFIG.UNIT_MODES, appState.selectedUnit)
            ? appState.selectedUnit
            : 'auto';
        const safeCharTraining = ['all', 'youon', 'sokuon', 'hatsuon', 'choon'].includes(appState.selectedCharTraining)
            ? appState.selectedCharTraining
            : 'all';

        setDailyGoal(appState.selectedGoal);
        const dailyGoal = getCurrentDailyGoal();

        appState.isReviewMode = Boolean(isReviewMode);

        let initialWords;
        let sentenceBuckets = null;
        if (appState.isReviewMode && appState.reviewWords && appState.reviewWords.length > 0) {
            initialWords = sanitizeWordList(appState.reviewWords);
            shuffleArray(initialWords);
        } else {
            appState.isReviewMode = false;
            initialWords = getWordList(safeLevel, safeUnit, safeCharTraining);
            if (safeUnit === 'sentence-long') {
                sentenceBuckets = getSentenceBuckets(initialWords);
                initialWords = sanitizeWordList(sentenceBuckets.short);
            }
        }
        if (initialWords.length === 0) {
            initialWords = getFallbackWords();
        }

        gameState = {
            level: safeLevel,
            mode: safeMode,
            unitMode: safeUnit,
            charTraining: safeCharTraining,
            timeLeft: resolveInitialTime(safeLevel, safeMode),
            score: 0,
            miss: 0,
            combo: 0,
            maxCombo: 0,
            typedChars: 0,
            elapsedSeconds: 0,
            currentWord: '',
            currentWordNormalized: '',
            currentRomaji: '',
            activeRomajiPattern: '',
            currentPatterns: [],
            currentPatternSet: new Set(),
            currentPrefixSet: new Set(['']),
            hasMissedCurrent: false,
            isBonusWord: false,
            recentWords: [],
            timerInterval: null,
            countdownInterval: null,
            words: sanitizeWordList(initialWords),
            sentenceBuckets,
            dailyGoalTarget: dailyGoal.target,
            dailyGoalProgressAtStart: dailyGoal.progress,
            totalWords: 0,
            isCountingDown: false,
            isPaused: false,
            isRunning: true,
            wrongWords: []
        };

        // 難易度バッジを更新
        if (elements.levelBadge) {
            elements.levelBadge.textContent = CONFIG.LEVEL_LABELS[safeLevel];
        }

        appState.selectedLevel = safeLevel;
        appState.selectedMode = safeMode;
        appState.selectedUnit = safeUnit;
        appState.selectedCharTraining = safeCharTraining;
        updateStartSelections();

        clearSessionSnapshot();
        updateUI();
        nextWord();
        saveSessionSnapshot();

        if (elements.input) {
            elements.input.value = '';
            focusGameInput();
        }

        startGameClock();
    });
}

function quitGame() {
    gameSessionToken += 1;
    stopGameTimers();
    clearRunningState();
    resetInteractiveUIState();
    markBonusWord(false);
    // 「やめる」は完了ではないため、結果・新記録・統計を一切作らない
    clearSessionSnapshot();
    showScreen('start-screen');
}

function nextWord() {
    if (!gameState.isRunning) return;

    let wordPool = resolveCurrentWordPool();
    if (wordPool.length === 0) {
        gameState.words = replenishWordPool();
        wordPool = resolveCurrentWordPool();
    }

    let isBonusWord = false;
    let next = '';
    if (!appState.isReviewMode && Math.random() < CONFIG.BONUS_WORD_CHANCE) {
        next = getBonusWord();
        isBonusWord = true;
    }

    if (!next) {
        next = chooseWordFromPool(wordPool, gameState.recentWords);
    }
    if (!next) next = getFallbackWords()[0];

    if (appState.isReviewMode) {
        const idx = gameState.words.indexOf(next);
        if (idx !== -1) {
            gameState.words.splice(idx, 1);
        }
    }

    if (!isBonusWord) rememberRecentWord(next);
    gameState.totalWords += 1;
    setCurrentWord(next, isBonusWord);
    updateWordCount();
}

function tick() {
    if (!gameState.isRunning || gameState.isPaused || gameState.isCountingDown) return;
    settleGameClock();
    updateUI();
    if (gameState.timeLeft <= 0) endGame();
    else saveSessionSnapshot();
}

function updateUI() {
    if (elements.timer) elements.timer.textContent = gameState.timeLeft;
    if (elements.score) elements.score.textContent = gameState.score;
    if (elements.miss) elements.miss.textContent = gameState.miss;
    if (elements.combo) elements.combo.textContent = gameState.combo;
    const goalData = getCurrentDailyGoal();
    const target = gameState.dailyGoalTarget || goalData.target;
    updateGoalUI(goalData.progress, target);
    if (elements.goalStatus) {
        elements.goalStatus.textContent = `${Math.min(goalData.progress, target)}/${target}`;
    }
    updateWordCount();
}

function updateWordCount() {
    if (elements.wordCount) {
        elements.wordCount.textContent = `${gameState.score}問クリア`;
    }
}

/**
 * ローマ字ヒントの進捗ハイライト表示
 * @param {string} typedInput - 現在の入力文字列
 */
function updateRomajiDisplay(typedInput) {
    if (!elements.romajiHint) return;

    const showHint = appState.settings.showRomajiHint !== false;
    const romaji = gameState.currentRomaji;
    const activePattern = gameState.activeRomajiPattern || romaji;
    const inputLen = typedInput.length;

    const matchingPattern = inputLen ? findMatchingPattern(typedInput, gameState.currentMatcher || gameState.currentPatterns) : null;
    if (matchingPattern) gameState.activeRomajiPattern = matchingPattern;
    const pattern = matchingPattern || activePattern;
    const typed = matchingPattern ? pattern.slice(0, inputLen) : '';
    const pending = matchingPattern ? pattern.slice(inputLen) : pattern;
    const nodes = [];
    if (typed) {
        const span = document.createElement('span');
        span.className = 'romaji-typed';
        span.textContent = typed;
        nodes.push(span);
    }
    const span = document.createElement('span');
    span.className = 'romaji-pending';
    span.textContent = showHint ? pending : '_ '.repeat(pending.length).trim();
    nodes.push(span);
    elements.romajiHint.replaceChildren(...nodes);
}

function showBonus(message) {
    if (!elements.bonusPopup) return;
    elements.bonusPopup.textContent = message;
    elements.bonusPopup.classList.remove('show');
    void elements.bonusPopup.offsetWidth;
    elements.bonusPopup.classList.add('show');
}

function handleInput(event) {
    if (!elements.input || !gameState.isRunning || gameState.isPaused || isPracticeBlocked() || event?.isComposing) return;
    settleGameClock();
    if (gameState.timeLeft <= 0) { endGame(); return; }

    const input = sanitizeTypingInput(elements.input.value);
    if (elements.input.value !== input) {
        elements.input.value = input;
    }

    const matchingPattern = findMatchingPattern(input, gameState.currentMatcher || gameState.currentPatterns);
    if (input.length > 0 && !matchingPattern) {
        gameState.miss++;
        gameState.combo = 0;
        gameState.hasMissedCurrent = true;
        recordWrongWord(gameState.currentWord);
        updateUI();
        flashInput('wrong');
        SoundManager.play('wrong');

        let trimmed = input;
        while (trimmed.length > 0 && !(gameState.currentMatcher ? gameState.currentMatcher.hasPrefix(trimmed) : gameState.currentPrefixSet.has(trimmed))) {
            trimmed = trimmed.slice(0, -1);
        }
        elements.input.value = trimmed;
        updateRomajiDisplay(trimmed);
        saveSessionSnapshot();
        return;
    }

    // ローマ字ハイライトを更新
    updateRomajiDisplay(input);

    if (isCorrectInput(input, gameState.currentWordNormalized, gameState.currentMatcher || gameState.currentPatternSet)) {
        gameState.score++;
        gameState.combo++;
        gameState.maxCombo = Math.max(gameState.maxCombo, gameState.combo);
        gameState.typedChars += input.length;

        incrementDailyGoalProgress(1);
        const bonus = resolveTimeBonus(gameState.level, gameState.mode, gameState.hasMissedCurrent, gameState.isBonusWord);
        gameState.timeLeft += bonus;
        if (gameState.isBonusWord) {
            showBonus(`+${bonus}秒 BONUS!`);
            SoundManager.play('bonus');
        } else {
            showBonus(gameState.hasMissedCurrent ? `+${bonus}秒` : `+${bonus}秒 パーフェクト！`);
            SoundManager.play('correct');
        }

        nextWord();
        flashInput('correct');
        updateUI();
        saveSessionSnapshot();
    } else {
        saveSessionSnapshot();
    }
}

function handleKeydown(e) {
    // 停止でフォーカスがボタンへ移っても、同じ長押しのkeyupで押下しない。
    if (e.code === 'Space' && spaceShortcutHeld) { e.preventDefault(); return; }
    // IMEの確定・変換キーとブラウザのショートカットはゲーム操作にしない。
    if (e.isComposing || inputIsComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey) return;
    const isSettingsOpen = elements.settingsOverlay?.classList.contains('active');
    const isTutorialOpen = elements.tutorialOverlay?.classList.contains('active');
    if (e.key === 'Escape' && !e.repeat) {
        if (isSettingsOpen) { e.preventDefault(); saveSettingsFromUI(); closeSettings(); return; }
        if (isTutorialOpen) { e.preventDefault(); closeTutorial(); return; }
        if (!document.getElementById('parents-modal')?.open && (gameState.isRunning || gameState.isCountingDown)) {
            e.preventDefault(); quitGame(); return;
        }
    }
    if (isPracticeBlocked()) return;
    const target = e.target;
    const isControl = target && target !== elements.input &&
        (target.matches?.('button, input, select, textarea, a[href]') || target.isContentEditable);
    if (e.code === 'Space' && gameState.isRunning && !isControl) {
        e.preventDefault();
        if (!e.repeat) {
            spaceShortcutHeld = true;
            togglePause();
        }
        return;
    }
    if (!gameState.isRunning || gameState.isPaused || isControl) return;
    // 入力欄ではブラウザに選択範囲・削除・変換を任せ、inputで一度だけ判定する。
    if (document.activeElement === elements.input) return;
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key) && elements.input) {
        e.preventDefault();
        sendKeyToInput(e.key);
        focusGameInput(1);
    }
}

function endGame() {
    if (!gameState.isRunning) return;
    gameSessionToken += 1;
    const resultState = {
        level: gameState.level,
        mode: gameState.mode,
        unitMode: gameState.unitMode,
        charTraining: gameState.charTraining,
        score: gameState.score,
        miss: gameState.miss,
        maxCombo: gameState.maxCombo,
        typedChars: gameState.typedChars,
        elapsedSeconds: gameState.elapsedSeconds,
        timeLeft: gameState.timeLeft,
        dailyGoalTarget: gameState.dailyGoalTarget
    };

    stopGameTimers();
    clearRunningState();
    resetInteractiveUIState();
    markBonusWord(false);
    clearSessionSnapshot();

    // 復習セクションの更新
    const reviewSection = document.getElementById('review-section');
    const reviewCount = document.getElementById('review-count');
    if (gameState.wrongWords && gameState.wrongWords.length > 0) {
        appState.reviewWords = gameState.wrongWords.slice();
        if (reviewCount) {
            reviewCount.textContent = appState.reviewWords.length;
        }
        if (reviewSection) {
            reviewSection.hidden = false;
        }
    } else {
        appState.reviewWords = [];
        if (reviewSection) {
            reviewSection.hidden = true;
        }
    }

    const total = resultState.score + resultState.miss;
    const accuracy = total > 0 ? Math.round((resultState.score / total) * 100) : 0;
    const missRate = total > 0 ? Math.round((resultState.miss / total) * 100) : 0;
    const fallbackElapsed = resolveInitialTime(resultState.level, resultState.mode) - resultState.timeLeft;
    const elapsedSeconds = Math.max(1, resultState.elapsedSeconds || fallbackElapsed || 1);
    const wpm = calcWpm(resultState.typedChars, elapsedSeconds);
    const isNewRecord = StorageManager.saveHighScore(resultState.level, resultState.score);
    const highScore = StorageManager.getHighScore(resultState.level);

    if (total > 0) {
        const sessionResult = {
            date: getTodayKey(),
            level: resultState.level,
            mode: resultState.mode,
            unitMode: resultState.unitMode,
            charTraining: resultState.charTraining,
            score: resultState.score,
            miss: resultState.miss,
            accuracy,
            missRate,
            wpm,
            maxCombo: resultState.maxCombo
        };
        updateStatsWithSession(sessionResult);
    }
    updateRankUI();
    renderGrowthChart();

    if (elements.resultScore) elements.resultScore.textContent = resultState.score;
    if (elements.resultMiss) elements.resultMiss.textContent = resultState.miss;
    if (elements.resultAccuracy) elements.resultAccuracy.textContent = accuracy + '%';
    if (elements.resultHighscore) {
        elements.resultHighscore.textContent = isNewRecord
            ? '🏆 新記録！'
            : `ベスト: ${highScore}`;
        elements.resultHighscore.classList.toggle('new-record', isNewRecord);
    }
    if (elements.resultWpm) elements.resultWpm.textContent = String(wpm);
    if (elements.resultMaxCombo) elements.resultMaxCombo.textContent = String(resultState.maxCombo);
    if (elements.resultGoalStatus) elements.resultGoalStatus.textContent = getDailyGoalResultText();

    SoundManager.play('finish');
    showScreen('result-screen');
    scheduleUI('result-focus', () => {
        if (elements.resultScreen?.classList.contains('active')) elements.retryBtn?.focus();
    }, 100);
}

// ============================================
// イベントリスナー
// ============================================
function setupEventListeners() {
    // 難易度選択ボタン
    document.querySelectorAll('.difficulty-select .btn').forEach(btn => {
        const level = btn.dataset.level;
        if (!Object.prototype.hasOwnProperty.call(CONFIG.INITIAL_TIME, level)) return;

        btn.addEventListener('mouseenter', () => updateDifficultyGuide(level));
        btn.addEventListener('focus', () => updateDifficultyGuide(level));
        btn.addEventListener('click', () => {
            appState.selectedLevel = level;
            if (level === 'hard') {
                appState.settings.showRomajiHint = false;
                StorageManager.savePreferences(appState.settings);
                applySettingsToUI();
            }
            updateDifficultyGuide(level);
            updateStartSelections();
            startGame(level, false);
        });
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            if (!Object.prototype.hasOwnProperty.call(CONFIG.PLAY_MODES, mode)) return;
            appState.selectedMode = mode;
            updateStartSelections();
        });
    });

    document.querySelectorAll('.unit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const unit = btn.dataset.unit;
            if (!Object.prototype.hasOwnProperty.call(CONFIG.UNIT_MODES, unit)) return;
            appState.selectedUnit = unit;
            updateStartSelections();
            updateDifficultyGuide(appState.selectedLevel);
        });
    });

    document.querySelectorAll('.char-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.charTraining;
            if (!['all', 'youon', 'sokuon', 'hatsuon', 'choon'].includes(mode)) return;
            appState.selectedCharTraining = mode;
            updateStartSelections();
            updateDifficultyGuide(appState.selectedLevel);
        });
    });

    document.querySelectorAll('.goal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = Number(btn.dataset.goal);
            if (!CONFIG.GOAL_CHOICES.includes(target)) return;
            setDailyGoal(target);
            updateStartSelections();
        });
    });

    // 入力監視
    elements.input?.addEventListener('input', handleInput);
    elements.input?.addEventListener('compositionstart', () => {
        compositionStartValue = elements.input.value;
        inputIsComposing = true;
    });
    elements.input?.addEventListener('compositionend', () => { inputIsComposing = false; handleInput(); });

    // キーボードイベント（グローバル）
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('keyup', (event) => {
        if (event.code === 'Space' && spaceShortcutHeld) {
            event.preventDefault();
            spaceShortcutHeld = false;
        }
    });
    window.addEventListener('blur', () => { spaceShortcutHeld = false; });

    // 一時停止ボタン
    elements.pauseBtn?.addEventListener('click', () => pauseGame());

    // 再開ボタン
    elements.resumeBtn?.addEventListener('click', resumeGame);

    // 一時停止オーバーレイのクリックで再開
    elements.pauseOverlay?.addEventListener('click', (e) => {
        if (e.target === elements.pauseOverlay) {
            resumeGame();
        }
    });
    elements.pauseOverlay?.addEventListener('keydown', (e) => {
        trapFocus(e, elements.pauseOverlay);
    });

    // やめるボタン（ゲーム中）
    elements.quitBtn?.addEventListener('click', quitGame);

    // やめるボタン（一時停止中）
    elements.quitFromPauseBtn?.addEventListener('click', quitGame);

    // リトライボタン
    elements.retryBtn?.addEventListener('click', () => {
        startGame(gameState.level, false);
    });

    // 復習ボタン
    elements.reviewBtn?.addEventListener('click', () => {
        startGame(gameState.level, true);
    });

    // ホームボタン
    elements.homeBtn?.addEventListener('click', () => {
        gameSessionToken += 1;
        stopGameTimers();
        clearRunningState();
        resetInteractiveUIState();
        markBonusWord(false);
        appState.isReviewMode = false;
        updateGoalUI(getCurrentDailyGoal().progress, appState.selectedGoal);
        showScreen('start-screen');
        if (canRestoreSession(appState.pendingSession) && appState.settings.autoResume) {
            showResumeCard(appState.pendingSession);
        }
    });

    // 設定
    elements.openSettingsBtn?.addEventListener('click', openSettings);
    elements.openSettingsBtnGame?.addEventListener('click', openSettings);
    elements.closeSettingsBtn?.addEventListener('click', () => {
        saveSettingsFromUI();
        closeSettings();
        if (!appState.settings.autoResume && elements.resumeCard) {
            elements.resumeCard.hidden = true;
        } else if (canRestoreSession(appState.pendingSession)) {
            showResumeCard(appState.pendingSession);
        }
    });
    elements.settingsOverlay?.addEventListener('click', (e) => {
        if (e.target !== elements.settingsOverlay) return;
        saveSettingsFromUI();
        closeSettings();
    });
    elements.settingsOverlay?.addEventListener('keydown', (e) => {
        trapFocus(e, elements.settingsOverlay);
    });

    [elements.focusModeToggle, elements.soundToggle, elements.autoResumeToggle, elements.romajiHintToggle, elements.keyboardTypeSelect].forEach((el) => {
        el?.addEventListener('change', saveSettingsFromUI);
    });
    elements.soundVolume?.addEventListener('input', saveSettingsFromUI);

    // チュートリアル
    elements.openTutorialBtn?.addEventListener('click', () => openTutorial(false));
    elements.tutorialNextBtn?.addEventListener('click', nextTutorialStep);
    elements.tutorialSkipBtn?.addEventListener('click', closeTutorial);
    elements.tutorialOverlay?.addEventListener('click', (e) => {
        if (e.target === elements.tutorialOverlay) closeTutorial();
    });
    elements.tutorialOverlay?.addEventListener('keydown', (e) => {
        trapFocus(e, elements.tutorialOverlay);
    });

    // セッション復元
    elements.resumeSessionBtn?.addEventListener('click', () => {
        if (!appState.settings.autoResume) return;
        if (!canRestoreSession(appState.pendingSession)) {
            clearSessionSnapshot();
            return;
        }
        const restored = restoreSession(appState.pendingSession);
        if (restored && elements.resumeCard) {
            elements.resumeCard.hidden = true;
        }
    });
    elements.discardSessionBtn?.addEventListener('click', clearSessionSnapshot);

    // タブが隠れる時は自動一時停止とスナップショット保存（ホスピタリティ）
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            spaceShortcutHeld = false;
            if (gameState.isRunning) {
                if (!gameState.isPaused && !gameState.isCountingDown) {
                    pauseGame();
                }
                saveSessionSnapshot({ includePaused: true });
            }
            if (SoundManager.audioContext && SoundManager.audioContext.state === 'running') {
                SoundManager.audioContext.suspend().catch(() => {});
            }
        } else if (document.visibilityState === 'visible') {
            if (SoundManager.audioContext && SoundManager.audioContext.state === 'suspended' && SoundManager.enabled) {
                SoundManager.audioContext.resume().catch(() => {});
            }
        }
    });

    // pagehide はキャンセル可能な beforeunload と違い、実際の離脱だけを扱う。
    window.addEventListener('pagehide', () => {
        if (gameState.isCountingDown) quitGame();
        else if (gameState.isRunning) {
            if (!gameState.isPaused) pauseGame();
            saveSessionSnapshot({ includePaused: true });
        }
    });
    window.addEventListener('storage', (event) => {
        if (event.key === CONFIG.GOAL_KEY || event.key === null) appState.dailyGoal = null;
        if (event.key === CONFIG.STATS_KEY || event.key === null) appState.stats = StorageManager.getStats();
    });
}

function registerServiceWorker() {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
            .catch((err) => console.warn('Service Worker registration failed:', err));
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', register, { once: true });
    else register();
}

let isTouchDeviceState = false;
appState.keyboardTab = 'seion';

function setupTouchKeyboard() {
    isTouchDeviceState = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDeviceState) return;

    if (elements.settingsKeyboardGroup) {
        elements.settingsKeyboardGroup.removeAttribute('hidden');
    }

    if (elements.input) {
        const initialType = appState.settings?.keyboardType || 'kana';
        elements.input.setAttribute('inputmode', initialType === 'kana' ? 'text' : 'none');
        elements.input.addEventListener('focus', (e) => {
            const currentType = appState.settings?.keyboardType || 'kana';
            elements.input.setAttribute('inputmode', currentType === 'kana' ? 'text' : 'none');
        });
    }

    const style = document.createElement('style');
    style.textContent = `
        .touch-keyboard-container {
            display: none;
            flex-direction: column;
            gap: 8px;
            width: 100%;
            max-width: 500px;
            margin: 12px auto 0 auto;
            padding: 10px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
            box-sizing: border-box;
            user-select: none;
            -webkit-user-select: none;
        }
        body.theme-night .touch-keyboard-container {
            background: rgba(30, 41, 59, 0.95);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        #game-screen.active .touch-keyboard-container {
            display: flex;
        }
        .keyboard-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            margin-bottom: 8px;
            gap: 8px;
        }
        body.theme-night .keyboard-toolbar {
            border-bottom-color: #334155;
        }
        .keyboard-type-switch, .keyboard-kana-tabs {
            display: flex;
            gap: 4px;
        }
        .k-switch-btn, .k-tab-btn {
            padding: 6px 10px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            color: #475569;
            cursor: pointer;
            touch-action: manipulation;
        }
        body.theme-night .k-switch-btn, body.theme-night .k-tab-btn {
            border-color: #475569;
            background: #1e293b;
            color: #cbd5e1;
        }
        .k-switch-btn.active, .k-tab-btn.active {
            background: #3b82f6;
            color: #ffffff;
            border-color: #3b82f6;
        }
        body.theme-night .k-switch-btn.active, body.theme-night .k-tab-btn.active {
            background: #60a5fa;
            color: #0f172a;
            border-color: #60a5fa;
        }
        .keyboard-keys {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .touch-keyboard-row {
            display: flex;
            justify-content: center;
            gap: 4px;
            width: 100%;
        }
        .touch-key {
            flex: 1;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            color: #334155;
            font-size: 16px;
            font-weight: 800;
            border-radius: 8px;
            border: none;
            box-shadow: 0 2px 0 #cbd5e1;
            cursor: pointer;
            touch-action: manipulation;
        }
        body.theme-night .touch-key {
            background: #334155;
            color: #f1f5f9;
            box-shadow: 0 2px 0 #1e293b;
        }
        .touch-key:active {
            transform: translateY(2px);
            box-shadow: none;
            background: #e2e8f0;
        }
        body.theme-night .touch-key:active {
            background: #475569;
        }
        .touch-key.key-wide {
            background: #cbd5e1;
            color: #334155;
            box-shadow: 0 2px 0 #94a3b8;
        }
        body.theme-night .touch-key.key-wide {
            background: #475569;
            color: #f1f5f9;
            box-shadow: 0 2px 0 #1e293b;
        }
    `;
    document.head.appendChild(style);

    const keyboardContainer = document.createElement('div');
    keyboardContainer.className = 'touch-keyboard-container';
    keyboardContainer.id = 'touch-keyboard';

    keyboardContainer.innerHTML = `
        <div class="keyboard-keys" id="keyboard-keys"></div>
    `;

    const inputArea = document.querySelector('.input-area');
    if (inputArea && inputArea.parentNode) {
        inputArea.parentNode.insertBefore(keyboardContainer, inputArea.nextSibling);
    }

    updateKeyboardDisplay();
}

function updateKeyboardDisplay() {
    const container = document.getElementById('touch-keyboard');
    if (!container) return;

    const keysContainer = container.querySelector('#keyboard-keys');
    if (!keysContainer) return;

    keysContainer.innerHTML = '';

    const kType = appState.settings.keyboardType || 'kana';
    const isKana = kType === 'kana';

    // inputmodeとコンテナの動的切り替え
    if (elements.input) {
        if (isKana && isTouchDeviceState) {
            elements.input.setAttribute('inputmode', 'text');
            container.style.display = 'none'; // かなモード時は自作キーボードを非表示
        } else {
            if (isTouchDeviceState) {
                elements.input.setAttribute('inputmode', 'none');
                container.style.display = 'flex'; // 英字モード時は自作QWERTYキーボードを表示
            }
        }
    }

    if (!isKana) {
        keysContainer.style.display = 'flex';
        keysContainer.style.flexDirection = 'column';
        keysContainer.style.gap = '6px';

        const romajiRows = [
            ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
            ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
            ['z', 'x', 'c', 'v', 'b', 'n', 'm', '←']
        ];

        romajiRows.forEach((rowKeys) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'touch-keyboard-row';
            rowDiv.style.display = 'flex';
            rowDiv.style.justifyContent = 'center';
            rowDiv.style.gap = '4px';
            rowDiv.style.width = '100%';

            rowKeys.forEach((key) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'touch-key';
                btn.textContent = key.toUpperCase();
                if (key === '←') {
                    btn.classList.add('key-wide');
                    btn.textContent = '←';
                    btn.setAttribute('aria-label', 'バックスペース');
                }

                btn.addEventListener('pointerdown', (e) => {
                    // 入力欄の選択位置を維持する。入力自体はclickに一本化する。
                    e.preventDefault();
                });
                btn.addEventListener('click', () => handleTouchKeyPress(key));
                rowDiv.appendChild(btn);
            });
            keysContainer.appendChild(rowDiv);
        });
    }
}

function handleTouchKeyPress(key) {
    if (!gameState.isRunning || gameState.isPaused || isPracticeBlocked()) return;
    if (!elements.input) return;

    if (key === '←') {
        const val = elements.input.value;
        const end = elements.input.selectionEnd ?? val.length;
        const start = elements.input.selectionStart ?? end;
        if (end > 0 || start !== end) {
            const from = start === end ? Math.max(0, start - 1) : start;
            elements.input.value = val.slice(0, from) + val.slice(end);
            elements.input.setSelectionRange(from, from);
            const event = new Event('input', { bubbles: true });
            elements.input.dispatchEvent(event);
        }
    } else {
        // かなも入力位置に挿入してから共通経路で正規化する。
        sendKeyToInput(key);
    }
}

function sendKeyToInput(charStr) {
    if (!elements.input || !gameState.isRunning || gameState.isPaused || isPracticeBlocked()) return;
    const start = elements.input.selectionStart ?? elements.input.value.length;
    const end = elements.input.selectionEnd ?? start;
    const val = elements.input.value;
    const newVal = val.slice(0, start) + charStr.toLowerCase() + val.slice(end);
    elements.input.value = newVal;

    const newPos = start + charStr.length;
    elements.input.setSelectionRange(newPos, newPos);

    const event = new Event('input', { bubbles: true });
    elements.input.dispatchEvent(event);
}

// ============================================
// 初期化
// ============================================
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        applyPortalSettings();
        initializeElements();
        setupEventListeners();
        setupTouchKeyboard();
        appState.settings = StorageManager.getPreferences();
        appState.stats = StorageManager.getStats();
        appState.pendingSession = StorageManager.getSession();

        applySettingsToUI();
        setOverlayVisibility(elements.countdownOverlay, false);
        setOverlayVisibility(elements.pauseOverlay, false);
        setOverlayVisibility(elements.settingsOverlay, false);
        setOverlayVisibility(elements.tutorialOverlay, false);

        const goalData = getCurrentDailyGoal();
        appState.selectedGoal = goalData.target;
        StorageManager.saveDailyGoal(goalData);
        updateGoalUI(goalData.progress, goalData.target);
        updateStartSelections();
        updateDifficultyGuide(appState.selectedLevel);
        updateRankUI();
        renderGrowthChart();

        if (canRestoreSession(appState.pendingSession) && appState.settings.autoResume) {
            showResumeCard(appState.pendingSession);
        } else if (elements.resumeCard) {
            elements.resumeCard.hidden = true;
        }

        showScreen('start-screen');

        // デフォルトの「🌟 ふつう」難易度選択ボタンに自動フォーカス
        scheduleUI('initial-focus', () => {
            const normalBtn = document.querySelector('.btn-normal');
            if (!isPracticeBlocked() && elements.startScreen?.classList.contains('active')) normalBtn?.focus();
        }, 100);

        if (!StorageManager.hasSeenTutorial()) {
            openTutorial(true);
        }

        registerServiceWorker();
    });
}

export {
    normalizeKanaToHiragana,
    hiraganaToRomaji,
    generateAllPatterns,
    sanitizeTypingInput,
    findMatchingPattern,
    getLastVowel,
    applyLongVowelToPatterns,
    splitSentenceToChunks,
    filterWordsByCharTraining,
    getSentenceBuckets,
    resolveSentenceBucketByScore,
    chooseWordFromPool,
    calcWpm,
    getRankLabel,
    normalizeStatsHistory,
    normalizePreferences,
    resolveRestoredRomajiPattern,
    getYesterdayKey,
    StorageManager
};

