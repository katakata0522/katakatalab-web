/**
 * Speed Reader - Main Application
 * 瞬読トレーニングアプリケーション
 */

const COUNTDOWN_TICK_MS = 300;
const PUNCTUATION_DELAY_MULTIPLIER = 1.5;
const COMMA_DELAY_MULTIPLIER = 1.2;

const DELAY_PUNCTUATION_PATTERN = /[。！？!?]/;
const DELAY_COMMA_PATTERN = /[、]/;

const FALLBACK_WPM_CONFIG = Object.freeze({
    MIN: 50,
    MAX: 1000,
    DEFAULT: 250
});

const WORD_EDGE_PATTERN = /[A-Za-z0-9\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
const LATIN_OR_DIGIT_PATTERN = /[A-Za-z0-9]/;
const PUNCTUATION_EDGE_PATTERN = /[。、！？!?.,;:]/;
const JAPANESE_CHAR_PATTERN = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
const HIRAGANA_ONLY_PATTERN = /^[\u3041-\u3096ー]+$/;
const OPEN_BRACKET_PATTERN = /^[「『（［【〈《｢(]+$/;
const CLOSE_BRACKET_PATTERN = /^[」』）］】〉》｣)]+$/;
const END_PUNCTUATION_PATTERN = /^[。、！？!?.,;:]+$/;

const JAPANESE_ATTACH_SUFFIXES = new Set([
    'は', 'が', 'を', 'に', 'へ', 'で', 'と', 'も', 'の', 'や', 'ね', 'よ', 'ぞ', 'さ', 'な', 'か',
    'だ', 'です', 'ます', 'た', 'て', 'で', 'ない', 'たい', 'ぬ', 'ん', 'られ', 'れる', 'られる',
    'せる', 'させる', 'そう', 'よう', 'だろう', 'でしょう',
    'から', 'まで', 'より', 'だけ', 'しか', 'ほど', 'くらい', 'ぐらい', 'など', 'でも', 'って',
    'とか', 'たり', 'だり', 'ので', 'のに'
]);

// ==========================================================================
// アチーブメントバッジ定義
// ==========================================================================

const BADGES = {
    'first_read': {
        id: 'first_read',
        name: 'はじめての読書',
        desc: '初めてトレーニングを1回完了した！',
        icon: '🔰',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        check: (history, actualWpm) => history.readCount >= 1
    },
    'reader_path': {
        id: 'reader_path',
        name: '読書家への道',
        desc: '累計5回トレーニングを完了した！',
        icon: '📖',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        check: (history, actualWpm) => history.readCount >= 5
    },
    'reading_king': {
        id: 'reading_king',
        name: '大読書王',
        desc: '累計15回トレーニングを完了した！',
        icon: '📚',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        check: (history, actualWpm) => history.readCount >= 15
    },
    'fast_runner': {
        id: 'fast_runner',
        name: '俊足ランナー',
        desc: '実効WPM 300以上でクリアした！',
        icon: '🏃',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        check: (history, actualWpm) => actualWpm >= 300
    },
    'light_master': {
        id: 'light_master',
        name: '光速マスター',
        desc: '実効WPM 500以上でクリアした！',
        icon: '⚡',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        check: (history, actualWpm) => actualWpm >= 500
    },
    'all_categories': {
        id: 'all_categories',
        name: '全カテゴリー制覇',
        desc: '4つのカテゴリーすべての本を1回以上クリアした！',
        icon: '👑',
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        check: (history, actualWpm) => {
            const cats = ['low-elem', 'high-elem', 'junior', 'high'];
            return cats.every(cat => history.categoryCounts && (history.categoryCounts[cat] || 0) > 0);
        }
    },
    'step_up': {
        id: 'step_up',
        name: 'ステップアップ',
        desc: '自由入力（カスタム）テキストを1回クリアした！',
        icon: '🌱',
        color: 'bg-teal-50 text-teal-700 border-teal-200',
        check: (history, actualWpm) => history.customCount >= 1
    }
};

function resolveWpmConfig(config) {
    const source = config && typeof config === 'object' ? config : FALLBACK_WPM_CONFIG;

    const minCandidate = Number.isFinite(Number(source.MIN))
        ? Number(source.MIN)
        : FALLBACK_WPM_CONFIG.MIN;
    const maxCandidate = Number.isFinite(Number(source.MAX))
        ? Number(source.MAX)
        : FALLBACK_WPM_CONFIG.MAX;
    const min = Math.max(1, Math.floor(minCandidate));
    const max = Math.max(min, Math.floor(maxCandidate));

    const defaultCandidate = Number.isFinite(Number(source.DEFAULT))
        ? Number(source.DEFAULT)
        : FALLBACK_WPM_CONFIG.DEFAULT;
    const fallback = Math.min(max, Math.max(min, Math.floor(defaultCandidate)));

    return { min, max, fallback };
}

function clampWpmValue(value, config) {
    const { min, max, fallback } = resolveWpmConfig(config);
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function shouldInsertSpaceBetweenSegments(previousSegment, nextSegment) {
    if (typeof previousSegment !== 'string' || typeof nextSegment !== 'string') return false;

    const prev = previousSegment.trim();
    const next = nextSegment.trim();
    if (!prev || !next) return false;

    // ルビ一時プレースホルダーが含まれている場合はスペースを挿入しない
    if (prev.includes('__SR_RUBY_TEMP_') || next.includes('__SR_RUBY_TEMP_')) return false;

    const prevLastChar = prev.slice(-1);
    const nextFirstChar = next.charAt(0);
    if (PUNCTUATION_EDGE_PATTERN.test(prevLastChar) || PUNCTUATION_EDGE_PATTERN.test(nextFirstChar)) return false;

    if (!LATIN_OR_DIGIT_PATTERN.test(prev) && !LATIN_OR_DIGIT_PATTERN.test(next)) return false;
    return WORD_EDGE_PATTERN.test(prevLastChar) && WORD_EDGE_PATTERN.test(nextFirstChar);
}

function joinChunkSegments(segments) {
    if (!Array.isArray(segments) || segments.length === 0) return '';

    let joined = '';
    segments.forEach((segment) => {
        if (typeof segment !== 'string') return;
        const trimmed = segment.trim();
        if (!trimmed) return;

        if (!joined) {
            joined = trimmed;
            return;
        }

        if (shouldInsertSpaceBetweenSegments(joined, trimmed)) {
            joined += ' ';
        }
        joined += trimmed;
    });

    return joined;
}

function createChunksFromSegments(segments, size) {
    return createChunkDataFromSegments(segments, size).chunks;
}

function createChunkDataFromSegments(segments, size) {
    const chunkSize = Number.isInteger(size) && size > 0 ? size : 1;
    if (!Array.isArray(segments) || segments.length === 0) {
        return { chunks: [], chunkWordCounts: [], totalWordCount: 0 };
    }

    // 空文字や文字列以外は共有・保存由来の不正値として語数から除外する
    const validSegments = segments
        .filter(segment => typeof segment === 'string' && segment.trim().length > 0)
        .map(segment => segment.trim());

    const chunks = [];
    const chunkWordCounts = [];
    for (let i = 0; i < validSegments.length; i += chunkSize) {
        const chunkSegments = validSegments.slice(i, i + chunkSize);
        const chunk = joinChunkSegments(chunkSegments);
        if (chunk.length > 0) {
            chunks.push(chunk);
            chunkWordCounts.push(chunkSegments.length);
        }
    }
    return {
        chunks,
        chunkWordCounts,
        totalWordCount: chunkWordCounts.reduce((total, count) => total + count, 0)
    };
}

function calculateEffectiveWpm(wordCount, elapsedSeconds) {
    const safeWordCount = Number(wordCount);
    const safeElapsedSeconds = Number(elapsedSeconds);
    if (!Number.isFinite(safeWordCount) || safeWordCount <= 0) return 0;
    if (!Number.isFinite(safeElapsedSeconds) || safeElapsedSeconds <= 0) return 0;
    return Math.round((safeWordCount / safeElapsedSeconds) * 60);
}

function shouldAttachJapaneseTokenToPrevious(token, previousToken) {
    if (!token || !previousToken) return false;
    if (END_PUNCTUATION_PATTERN.test(token)) return true;
    if (CLOSE_BRACKET_PATTERN.test(token)) return true;
    // 文末のあとに来た助詞・1文字のひらがなは、次の文の先頭として扱う。
    if (/[。！？!?][」』）］】〉》｣)]*$/.test(previousToken)) return false;
    if (JAPANESE_ATTACH_SUFFIXES.has(token)) return true;
    if (HIRAGANA_ONLY_PATTERN.test(token) && token.length === 1) return true;
    return false;
}

function normalizeJapaneseSegments(segments) {
    if (!Array.isArray(segments) || segments.length === 0) return [];

    const normalized = [];
    let pendingPrefix = '';

    segments.forEach((segment) => {
        if (typeof segment !== 'string') return;
        const token = segment.trim();
        if (!token) return;

        if (OPEN_BRACKET_PATTERN.test(token)) {
            pendingPrefix += token;
            return;
        }

        const mergedToken = pendingPrefix ? `${pendingPrefix}${token}` : token;
        pendingPrefix = '';

        const previous = normalized.length > 0 ? normalized[normalized.length - 1] : '';
        if (shouldAttachJapaneseTokenToPrevious(mergedToken, previous)) {
            normalized[normalized.length - 1] = `${previous}${mergedToken}`;
            return;
        }

        normalized.push(mergedToken);
    });

    if (pendingPrefix) {
        if (normalized.length > 0) {
            normalized[normalized.length - 1] = `${normalized[normalized.length - 1]}${pendingPrefix}`;
        } else {
            normalized.push(pendingPrefix);
        }
    }

    return normalized;
}

const RUBY_BASE_SCRIPTS = [
    /^[\p{Script=Han}々〆ヵヶ]$/u,
    /^[\p{Script=Katakana}ーﾞﾟ]$/u,
    /^[\p{Script=Hiragana}ー]$/u,
    /^[\p{Script=Latin}\p{Number}_'’\-]$/u,
    /^[\p{Letter}\p{Number}]$/u
];
const RUBY_MARK_PATTERN = /^\p{Mark}$/u;
const RUBY_EMOJI_TAIL_PATTERN = /^[\p{Mark}\p{Emoji_Modifier}\u{E0020}-\u{E007F}]$/u;
const RUBY_EMOJI_PATTERN = /^\p{Extended_Pictographic}$/u;
const RUBY_FLAG_PATTERN = /^\p{Regional_Indicator}$/u;

function findRubyBase(preceding, reading) {
    const characters = Array.from(preceding);
    let last = characters.length - 1;
    while (last >= 0 && RUBY_EMOJI_TAIL_PATTERN.test(characters[last])) last -= 1;
    if (last < 0) return null;

    let start = last;
    if (RUBY_FLAG_PATTERN.test(characters[last])) {
        if (last > 0 && RUBY_FLAG_PATTERN.test(characters[last - 1])) start -= 1;
    } else if (RUBY_EMOJI_PATTERN.test(characters[last])) {
        // ZWJ絵文字は末尾からたどり、長い不一致候補の正規表現再試行を避ける。
        while (start > 0 && characters[start - 1] === '\u200D') {
            let previous = start - 2;
            while (previous >= 0 && RUBY_EMOJI_TAIL_PATTERN.test(characters[previous])) previous -= 1;
            if (previous < 0 || !RUBY_EMOJI_PATTERN.test(characters[previous])) break;
            start = previous;
        }
    } else {
        const script = RUBY_BASE_SCRIPTS.find(pattern => pattern.test(characters[last]));
        if (!script) return null;
        while (start > 0 && (script.test(characters[start - 1]) || RUBY_MARK_PATTERN.test(characters[start - 1]))) start -= 1;
        if (script === RUBY_BASE_SCRIPTS[0]) {
            let prefixStart = start;
            while (prefixStart > 0 && RUBY_BASE_SCRIPTS[2].test(characters[prefixStart - 1])) prefixStart -= 1;
            const hiraganaPrefix = characters.slice(prefixStart, start).join('');
            // 読みに含まれる接頭辞だけを戻す（お正月／お話・お母を区別）。
            if (hiraganaPrefix && reading.startsWith(hiraganaPrefix)) start = prefixStart;
        }
    }
    return { prefix: characters.slice(0, start).join(''), base: characters.slice(start).join('') };
}

// 予約文字列を本文へ埋め込まず、分割と描画で同じルビ構造を共有する。
function splitRubyParts(text) {
    const parts = [];
    const readingPattern = /\{([^\s{}]+)\}/g;
    let cursor = 0;
    for (const match of text.matchAll(readingPattern)) {
        const preceding = text.slice(cursor, match.index);
        const rubyBase = findRubyBase(preceding, match[1]);
        if (!rubyBase) {
            parts.push({ text: preceding + match[0], ruby: null });
        } else {
            const { prefix, base } = rubyBase;
            if (prefix) parts.push({ text: prefix, ruby: null });
            parts.push({ text: base + match[0], base, ruby: match[1] });
        }
        cursor = match.index + match[0].length;
    }
    if (cursor < text.length) parts.push({ text: text.slice(cursor), ruby: null });
    return parts;
}

function createChunkDisplayData(segments, segmentParts, size) {
    const chunks = [];
    for (let offset = 0; offset < segments.length; offset += size) {
        let text = '';
        const parts = [];
        for (let index = offset; index < Math.min(offset + size, segments.length); index += 1) {
            const segment = segments[index].trim();
            if (text && shouldInsertSpaceBetweenSegments(text, segment)) {
                text += ' ';
                parts.push({ text: ' ', ruby: null });
            }
            text += segment;
            segmentParts[index].forEach(part => parts.push(part));
        }
        chunks.push({ text, parts });
    }
    return chunks;
}

const EMPTY_CATEGORY_COUNTS = Object.freeze({
    'low-elem': 0,
    'high-elem': 0,
    junior: 0,
    high: 0
});

function toNonNegativeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function normalizeHistoryData(data) {
    const source = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    const categorySource = source.categoryCounts
        && typeof source.categoryCounts === 'object'
        && !Array.isArray(source.categoryCounts)
        ? source.categoryCounts
        : {};
    const categoryCounts = Object.fromEntries(
        Object.keys(EMPTY_CATEGORY_COUNTS).map((key) => [key, toNonNegativeNumber(categorySource[key])])
    );
    const dailyHistory = source.dailyHistory
        && typeof source.dailyHistory === 'object'
        && !Array.isArray(source.dailyHistory)
        ? Object.fromEntries(Object.entries(source.dailyHistory)
            .map(([date, count]) => [date, toNonNegativeNumber(count)]))
        : {};
    const unlockedBadges = Array.isArray(source.unlockedBadges)
        ? source.unlockedBadges.filter(
            (badgeId) => typeof badgeId === 'string' && Object.hasOwn(BADGES, badgeId)
        )
        : [];

    return {
        readCount: toNonNegativeNumber(source.readCount),
        maxWpm: toNonNegativeNumber(source.maxWpm),
        totalWords: toNonNegativeNumber(source.totalWords),
        totalDuration: toNonNegativeNumber(source.totalDuration),
        categoryCounts,
        customCount: toNonNegativeNumber(source.customCount),
        dailyHistory,
        unlockedBadges
    };
}

// ==========================================================================
// SpeedReaderApp Class
// ==========================================================================

class SpeedReaderApp {
    constructor() {
        // State
        const initialWpm = clampWpmValue(
            typeof WPM_CONFIG !== 'undefined' ? WPM_CONFIG.DEFAULT : FALLBACK_WPM_CONFIG.DEFAULT,
            typeof WPM_CONFIG !== 'undefined' ? WPM_CONFIG : FALLBACK_WPM_CONFIG
        );
        this.state = {
            rawText: UI_TEXT.READY,
            title: UI_TEXT.READY,
            words: [UI_TEXT.READY],
            index: 0,
            isPlaying: false,
            isCountingDown: false,
            fontSize: 'normal',
            timer: null,
            completionTimer: null,
            wpm: initialWpm,
            chunkSize: 1,
            totalWordCount: 1,
            lastModalTrigger: null,
            currentCategory: 'junior',
            startTime: null,
            totalElapsedTime: 0,
            completed: false,
            completionRecorded: false,
            hasPreparedText: false
        };

        this.fileReadId = 0;
        this.fileReader = null;
        this.segmentCache = null;
        this.historyData = this.loadHistoryData();

        // DOM Elements Cache
        this.els = {
            readerDisplay: document.getElementById('reader-display'),
            wpmBadge: document.getElementById('wpm-badge'),
            chunkBadge: document.getElementById('chunk-badge'),
            sourceBadge: document.getElementById('source-badge'),
            progressBar: document.getElementById('progress-bar'),
            mainPlayBtn: document.getElementById('main-play-btn'),
            wpmSlider: document.getElementById('wpm-slider'),
            wpmDisplay: document.getElementById('wpm-display'),
            customText: document.getElementById('custom-text'),
            dropZone: document.getElementById('drop-zone'),
            customFileInput: document.getElementById('custom-file-input'),
            fileSelectBtn: document.getElementById('file-select-btn'),
            parentsModal: document.getElementById('parents-modal'),
            parentsModalOpenBtn: document.getElementById('parents-modal-open-btn'),
            evaluationModal: document.getElementById('evaluation-modal'),
            evalRankLabel: document.getElementById('eval-rank-label'),
            evalBadgeContainer: document.getElementById('eval-badge-container'),
            evalTitle: document.getElementById('eval-title'),
            evalWpm: document.getElementById('eval-wpm'),
            evalTargetWpm: document.getElementById('eval-target-wpm'),
            evalTime: document.getElementById('eval-time'),
            evalRatio: document.getElementById('eval-ratio'),
            evalMessage: document.getElementById('eval-message'),
            reportReadCount: document.getElementById('report-read-count'),
            reportMaxWpm: document.getElementById('report-max-wpm'),
            reportTotalWords: document.getElementById('report-total-words'),
            reportTotalDuration: document.getElementById('report-total-duration'),
            reportChartContainer: document.getElementById('report-chart-container'),
            reportBadgeGrid: document.getElementById('report-badge-grid')
        };

        this.init();
    }

    // ==========================================================================
    // Initialization
    // ==========================================================================

    init() {
        if (!this.validateRequiredElements()) return;
        this.setupInitialWpmControls();
        this.updateWpmUI(this.state.wpm);
        this.renderLibrary();
        this.switchMainTab('library');
        this.switchLibCategory('junior');
        this.bindEvents();
        this.setupModalBackdropClose();
        this.setupTabKeyboardNavigation();
        this.setupCleanup();
        this.setupSwipeGestures();
        this.setupVisibilityChangeHandler();
        this.setupRadioKeyboardNavigation();
        window.addEventListener('resize', () => this.fitReaderDisplay());
        document.fonts?.ready?.then(() => this.fitReaderDisplay());

        // 最初のタブボタンに自動フォーカスを当てる
        setTimeout(() => {
            const firstTab = document.querySelector('.main-tab-btn');
            if (firstTab && document.activeElement === document.body && !document.querySelector('dialog[open]')) firstTab.focus();
        }, 100);
    }

    setupVisibilityChangeHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseReader();
            }
        });
    }

    setupRadioKeyboardNavigation() {
        const groups = [
            { selector: '.chunk-btn', action: 'set-chunk' },
            { selector: '.fontsize-btn', action: 'set-fontsize' }
        ];

        groups.forEach(({ selector, action }) => {
            const buttons = Array.from(document.querySelectorAll(selector));
            buttons.forEach((btn, idx) => {
                const isChecked = btn.getAttribute('aria-checked') === 'true';
                btn.tabIndex = isChecked ? 0 : -1;

                btn.addEventListener('keydown', (e) => {
                    let nextIdx = idx;
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        nextIdx = (idx + 1) % buttons.length;
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        nextIdx = (idx - 1 + buttons.length) % buttons.length;
                    } else {
                        return;
                    }
                    e.preventDefault();
                    const nextBtn = buttons[nextIdx];
                    nextBtn.focus();
                    nextBtn.click();
                });
            });
        });
    }

    validateRequiredElements() {
        const required = [
            ['readerDisplay', this.els.readerDisplay],
            ['wpmBadge', this.els.wpmBadge],
            ['chunkBadge', this.els.chunkBadge],
            ['sourceBadge', this.els.sourceBadge],
            ['progressBar', this.els.progressBar],
            ['mainPlayBtn', this.els.mainPlayBtn],
            ['wpmSlider', this.els.wpmSlider],
            ['wpmDisplay', this.els.wpmDisplay],
            ['customText', this.els.customText],
            ['dropZone', this.els.dropZone],
            ['customFileInput', this.els.customFileInput],
            ['fileSelectBtn', this.els.fileSelectBtn],
            ['parentsModal', this.els.parentsModal]
        ];

        const missing = required.filter(([, element]) => !element).map(([name]) => name);
        if (missing.length > 0) {
            console.error(`初期化に失敗しました。必須DOM要素が不足しています: ${missing.join(', ')}`);
            return false;
        }
        return true;
    }

    setupInitialWpmControls() {
        if (!this.els.wpmSlider) return;
        const config = typeof WPM_CONFIG !== 'undefined' ? WPM_CONFIG : FALLBACK_WPM_CONFIG;
        const { min, max } = resolveWpmConfig(config);
        this.els.wpmSlider.min = String(min);
        this.els.wpmSlider.max = String(max);
        const step = Number.isFinite(Number(config.STEP)) ? Math.max(1, Math.floor(Number(config.STEP))) : 10;
        this.els.wpmSlider.step = String(step);
        this.els.wpmSlider.value = String(this.state.wpm);
    }

    updateWpmUI(wpm) {
        if (!Number.isFinite(wpm)) return;
        if (this.els.wpmSlider) this.els.wpmSlider.value = String(wpm);
        if (this.els.wpmDisplay) this.els.wpmDisplay.textContent = String(wpm);
        if (this.els.wpmBadge) this.els.wpmBadge.textContent = `${UI_TEXT.WPM_PREFIX}${wpm}`;
    }

    bindEvents() {
        // Event Delegation for data-action buttons
        document.addEventListener('click', (e) => {
            const actionEl = e.target.closest('[data-action]');
            if (!actionEl) return;

            const action = actionEl.dataset.action;
            const actionParam = actionEl.dataset.param;

            switch (action) {
                case 'toggle':
                    this.toggleReader();
                    break;
                case 'reset':
                    this.resetReader();
                    break;
                case 'step-back':
                    this.stepBack();
                    break;
                case 'step-forward':
                    this.stepForward();
                    break;
                case 'open-modal':
                    this.openParentsModal(actionEl);
                    break;
                case 'close-modal':
                    this.closeParentsModal();
                    break;
                case 'close-eval':
                    this.closeEvaluationModal();
                    break;
                case 'switch-tab':
                    this.switchMainTab(actionParam);
                    break;
                case 'switch-category':
                    this.switchLibCategory(actionParam);
                    break;
                case 'set-chunk':
                    this.setChunkSize(parseInt(actionParam, 10), actionEl);
                    break;
                case 'set-fontsize':
                    this.setFontSize(actionParam, actionEl);
                    break;
                case 'prepare-custom':
                    this.prepareReader('custom');
                    break;
                case 'clear-custom':
                    this.cancelFileRead();
                    if (this.els.customText) {
                        this.els.customText.value = '';
                    }
                    break;
                case 'load-library':
                    if (!actionParam || !libraries[actionParam]) {
                        console.warn(`Library key not found: ${actionParam}`);
                        break;
                    }
                    this.loadLibrary(actionParam, CATEGORY_SPEEDS[libraries[actionParam].cat]);
                    break;
            }
        });

        // WPM Slider
        if (this.els.wpmSlider) {
            this.els.wpmSlider.addEventListener('input', () => this.updateSettings());
        }

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.isComposing || e.keyCode === 229 || e.repeat) return;
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;

            const tagName = target.tagName;
            const isFormControl =
                tagName === 'TEXTAREA' ||
                tagName === 'INPUT' ||
                tagName === 'SELECT' ||
                target.isContentEditable;
            const activeDialog = document.querySelector('dialog[open]');
            const isInteractive = target.closest('button, a[href], [role="button"], [data-action]') !== null;
            if (isFormControl || activeDialog || isInteractive) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.toggleReader();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.stepBack();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.stepForward();
                    break;
                case 'KeyR':
                    this.resetReader();
                    break;
            }
        });

        // File Drop Zone (Drag & Drop)
        if (this.els.dropZone) {
            const dz = this.els.dropZone;
            
            ['dragenter', 'dragover'].forEach(eventName => {
                dz.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dz.classList.add('drag-over');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dz.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dz.classList.remove('drag-over');
                }, false);
            });

            dz.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt?.files;
                if (files && files.length > 0) {
                    this.handleTextFile(files[0]);
                }
            }, false);

            dz.addEventListener('click', (e) => {
                if (e.target === this.els.customFileInput) return;
                this.els.customFileInput.click();
            });
        }

        // アプリ外への誤ドロップによるブラウザ画面遷移防止
        window.addEventListener('dragover', (e) => {
            e.preventDefault();
        }, false);
        window.addEventListener('drop', (e) => {
            e.preventDefault();
        }, false);

        // 読み込み中に入力した文章を、古いファイルの完了通知で上書きしない。
        this.els.customText?.addEventListener('input', () => this.cancelFileRead());

        // File Input Change
        if (this.els.customFileInput) {
            this.els.customFileInput.addEventListener('change', (e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                    this.handleTextFile(files[0]);
                    e.target.value = '';
                }
            });
        }
    }

    setupTabKeyboardNavigation() {
        const tablists = Array.from(document.querySelectorAll('[role="tablist"]'));
        tablists.forEach((tablist) => {
            tablist.addEventListener('keydown', (event) => {
                const currentTab = event.target instanceof HTMLElement
                    ? event.target.closest('[role="tab"]')
                    : null;
                if (!(currentTab instanceof HTMLElement) || !tablist.contains(currentTab)) return;

                const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
                if (tabs.length === 0) return;

                const currentIndex = tabs.indexOf(currentTab);
                if (currentIndex < 0) return;

                let nextIndex = currentIndex;
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                    nextIndex = (currentIndex + 1) % tabs.length;
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                } else if (event.key === 'Home') {
                    nextIndex = 0;
                } else if (event.key === 'End') {
                    nextIndex = tabs.length - 1;
                } else {
                    return;
                }

                event.preventDefault();
                const nextTab = tabs[nextIndex];
                if (!(nextTab instanceof HTMLElement)) return;
                nextTab.focus();

                const action = nextTab.dataset.action;
                const param = nextTab.dataset.param;
                if (action === 'switch-tab') {
                    this.switchMainTab(param);
                } else if (action === 'switch-category') {
                    this.switchLibCategory(param);
                }
            });
        });
    }

    trapFocus(e, container) {
        if (e.key !== 'Tab') return;
        const focusables = Array.from(
            container.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
        );
        if (focusables.length === 0) {
            e.preventDefault();
            return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) {
                last.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === last) {
                first.focus();
                e.preventDefault();
            }
        }
    }

    setupModalBackdropClose() {
        if (this.els.parentsModal) {
            this.els.parentsModal.addEventListener('close', () => {
                if (!this.els.parentsModal.open) this.restoreParentsModalTriggerFocus();
            });
            this.els.parentsModal.addEventListener('cancel', event => {
                event.preventDefault();
                this.closeParentsModal();
            });
            this.els.parentsModal.addEventListener('click', (event) => {
                if (event.target === this.els.parentsModal) {
                    this.closeParentsModal();
                }
            });
            this.els.parentsModal.addEventListener('keydown', (e) => {
                this.trapFocus(e, this.els.parentsModal);
            });
        }
        if (this.els.evaluationModal) {
            this.els.evaluationModal.addEventListener('close', () => {
                if (this.pendingLegacyCloses > 0) {
                    this.pendingLegacyCloses -= 1;
                    return;
                }
                if (!this.els.evaluationModal.open) {
                    this.resetReader();
                    this.els.mainPlayBtn?.focus();
                }
            });
            this.els.evaluationModal.addEventListener('click', (event) => {
                if (event.target === this.els.evaluationModal) {
                    this.closeEvaluationModal();
                }
            });
            this.els.evaluationModal.addEventListener('keydown', (e) => {
                this.trapFocus(e, this.els.evaluationModal);
            });
        }
    }

    openParentsModal(triggerElement = null) {
        const modal = this.els.parentsModal;
        if (!modal) return;
        if (modal.hasAttribute('open')) return;
        this.pauseReader();
        if (triggerElement instanceof HTMLElement) {
            this.state.lastModalTrigger = triggerElement;
            triggerElement.setAttribute('aria-expanded', 'true');
        }
        if (typeof modal.showModal === 'function') {
            modal.showModal();
        } else {
            modal.setAttribute('open', '');
        }
        setTimeout(() => {
            const closeBtn = modal.querySelector('[data-action="close-modal"]');
            if (modal.open || modal.hasAttribute('open')) closeBtn?.focus();
        }, 50);
    }

    restoreParentsModalTriggerFocus() {
        if (this.state.lastModalTrigger instanceof HTMLElement) {
            this.state.lastModalTrigger.setAttribute('aria-expanded', 'false');
            this.state.lastModalTrigger.focus();
            this.state.lastModalTrigger = null;
            return;
        }
        if (this.els.parentsModalOpenBtn instanceof HTMLElement) {
            this.els.parentsModalOpenBtn.setAttribute('aria-expanded', 'false');
        }
    }

    closeParentsModal() {
        const modal = this.els.parentsModal;
        if (!modal) return;
        if (typeof modal.close === 'function' && modal.open) modal.close();
        else modal.removeAttribute('open');
        // native closeイベントは後から届くため、操作時点で状態とフォーカスを戻す。
        this.restoreParentsModalTriggerFocus();
    }

    setupCleanup() {
        // ページ離脱時にタイマーをクリーンアップ
        const stop = () => {
            this.pauseReader();
            this.cancelFileRead();
        };
        window.addEventListener('pagehide', stop);
        window.addEventListener('beforeunload', stop);
    }

    setupSwipeGestures() {
        const readerArea = this.els.readerDisplay ? this.els.readerDisplay.parentElement : null;
        if (!readerArea) return;
        let start = null;
        const minSwipeDistance = 50;
        readerArea.addEventListener('touchstart', event => {
            if (event.touches.length !== 1) { start = null; return; }
            const touch = event.changedTouches[0];
            start = { id: touch.identifier, x: touch.screenX, y: touch.screenY };
        }, { passive: true });
        readerArea.addEventListener('touchcancel', () => { start = null; }, { passive: true });
        readerArea.addEventListener('touchend', event => {
            const previous = start;
            start = null;
            if (!previous || event.touches.length) return;
            const touch = Array.from(event.changedTouches).find(item => item.identifier === previous.id);
            if (!touch) return;
            const deltaX = touch.screenX - previous.x;
            const deltaY = touch.screenY - previous.y;
            // 縦スクロール・ピンチ・キャンセルを読書位置の変更として扱わない。
            if (Math.abs(deltaX) <= minSwipeDistance || Math.abs(deltaX) <= Math.abs(deltaY)) return;
            if (deltaX > 0) this.stepBack();
            else this.stepForward();
        }, { passive: true });
    }

    // ==========================================================================
    // Text Processing
    // ==========================================================================

    processText(text, size = 1) {
        if (!text) {
            this.state.totalWordCount = 0;
            this.state.chunkDisplayData = [];
            return [UI_TEXT.NO_CONTENT];
        }
        const chunkSize = Number.isInteger(size) && size > 0 ? size : 1;
        if (this.segmentCache?.text === text) {
            const cached = createChunkDataFromSegments(this.segmentCache.segments, chunkSize);
            this.state.chunkDisplayData = createChunkDisplayData(this.segmentCache.segments, this.segmentCache.segmentParts, chunkSize);
            this.state.totalWordCount = cached.totalWordCount;
            return cached.chunks.length ? cached.chunks : [UI_TEXT.NO_CONTENT];
        }

        // 不完全なルビ構造のサニタイズ (閉じのない{ や 開きのない} を除去)
        const sanitizedText = text
            .replace(/\{(?![^{}]+\})/g, '')
            .replace(/(?<!\{[^{}]+)\}/g, '');

        const isJapanese = JAPANESE_CHAR_PATTERN.test(sanitizedText);
        let segmenter = null;
        if (isJapanese && typeof Intl !== 'undefined' && Intl.Segmenter) {
            try {
                segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
            } catch (error) {
                console.warn('Intl.Segmenter failed, falling back to split:', error);
            }
        }

        let segments = [];
        splitRubyParts(sanitizedText).forEach(part => {
            if (part.ruby) {
                segments.push(part.text);
                return;
            }
            if (!isJapanese) {
                part.text.trim().split(/\s+/).filter(Boolean).forEach(segment => segments.push(segment));
                return;
            }
            if (segmenter) {
                const previousLength = segments.length;
                try {
                    for (const entry of segmenter.segment(part.text)) {
                        if (entry.segment.trim().length > 0) segments.push(entry.segment);
                    }
                    return;
                } catch (error) {
                    // 列挙途中で失敗しても、既に追加した本文を重複させない。
                    segments.length = previousLength;
                    console.warn('Intl.Segmenter failed, falling back to split:', error);
                    segmenter = null;
                }
            }
            this.fallbackJapaneseSegments(part.text).forEach(segment => segments.push(segment));
        });

        if (isJapanese) {
            segments = normalizeJapaneseSegments(segments);
        }

        if (segments.length === 0) {
            this.state.totalWordCount = 0;
            this.state.chunkDisplayData = [];
            return [UI_TEXT.NO_CONTENT];
        }

        // 結合後に同じ文字列になっても、元の語ごとのルビ基底を失わない。
        const segmentParts = segments.map(splitRubyParts);
        this.segmentCache = { text, segments, segmentParts };
        this.state.chunkDisplayData = createChunkDisplayData(segments, segmentParts, chunkSize);
        const chunkData = createChunkDataFromSegments(segments, chunkSize);
        this.state.totalWordCount = chunkData.totalWordCount;
        if (chunkData.chunks.length === 0) return [UI_TEXT.NO_CONTENT];

        return chunkData.chunks;
    }

    /**
     * Intl.Segmenter 非対応時の日本語フォールバック分割
     * 句読点は独立トークンとし、長い連続文字列は2文字単位に分割する
     */
    fallbackJapaneseSegments(text) {
        const segments = [];
        // ルビ部分はprocessTextで先に切り出され、ここには通常の本文だけが来る。
        const tokens = text.replace(/\r/g, '').split(/(\s+|[。、！？!?])/)
            .filter(token => token && token.trim().length > 0);
        tokens.forEach(token => {
            if (/^[。、！？!?]$/.test(token) || /^[A-Za-z0-9]+$/.test(token)) {
                segments.push(token);
                return;
            }
            const chars = Array.from(token);
            for (let index = 0; index < chars.length; index += 2) {
                segments.push(chars.slice(index, index + 2).join(''));
            }
        });
        return segments;
    }

    // ==========================================================================
    // Rendering
    // ==========================================================================

    splitDisplayCharacters(text) {
        if (typeof Intl !== 'undefined' && Intl.Segmenter) {
            try {
                this.graphemeSegmenter ||= new Intl.Segmenter('ja', { granularity: 'grapheme' });
                return Array.from(this.graphemeSegmenter.segment(text), entry => entry.segment);
            } catch (_) { /* 古いブラウザでもサロゲートペアは分割しない。 */ }
        }
        return Array.from(text);
    }

    renderWord(word) {
        if (!word || !this.els.readerDisplay) return;

        const display = this.els.readerDisplay;
        display.textContent = '';

        if (!word.includes('{')) {
            const characters = this.splitDisplayCharacters(word);
            const len = characters.length;
            const mid = Math.floor(len / 2);

            if (len <= 1) {
                const span = document.createElement('span');
                span.className = 'orp-char';
                span.textContent = word;
                display.appendChild(span);
            } else {
                display.appendChild(document.createTextNode(characters.slice(0, mid).join('')));
                const orpSpan = document.createElement('span');
                orpSpan.className = 'orp-char';
                orpSpan.textContent = characters[mid];
                display.appendChild(orpSpan);
                display.appendChild(document.createTextNode(characters.slice(mid + 1).join('')));
            }
            this.fitReaderDisplay();
            return;
        }

        const chars = [];
        const prepared = this.state.words?.[this.state.index] === word
            ? this.state.chunkDisplayData?.[this.state.index] : null;
        const parts = prepared?.text === word ? prepared.parts : splitRubyParts(word);
        parts.forEach(part => {
            const characters = this.splitDisplayCharacters(part.ruby ? part.base : part.text);
            characters.forEach((character, index) => {
                chars.push({
                    char: character,
                    ruby: part.ruby,
                    isStart: Boolean(part.ruby) && index === 0,
                    isEnd: Boolean(part.ruby) && index === characters.length - 1,
                    baseLength: characters.length
                });
            });
        });

        const plainLength = chars.length;
        if (plainLength === 0) return;
        let orpIndex = Math.floor(plainLength / 2);

        // 記号や空白を避けるインテリジェントORP選択
        const isNoiseChar = (c) => /^[\s。、！？!?.,;:「」『』（）［］【】〈〉《》｢()]+$/.test(c);
        if (isNoiseChar(chars[orpIndex].char)) {
            let found = false;
            for (let offset = 1; offset < plainLength; offset++) {
                if (orpIndex - offset >= 0 && !isNoiseChar(chars[orpIndex - offset].char)) {
                    orpIndex = orpIndex - offset;
                    found = true;
                    break;
                }
                if (orpIndex + offset < plainLength && !isNoiseChar(chars[orpIndex + offset].char)) {
                    orpIndex = orpIndex + offset;
                    found = true;
                    break;
                }
            }
        }

        if (chars[orpIndex]) {
            chars[orpIndex].isOrp = true;
        }

        let currentRubyEl = null;
        let currentRubyText = null;

        for (let idx = 0; idx < chars.length; idx++) {
            const item = chars[idx];

            if (item.ruby) {
                if (item.isStart || !currentRubyEl || currentRubyText !== item.ruby) {
                    currentRubyEl = document.createElement('ruby');
                    currentRubyText = item.ruby;
                }

                const charSpan = document.createElement('span');
                charSpan.textContent = item.char;
                if (item.isOrp) {
                    charSpan.className = 'orp-char';
                }
                currentRubyEl.appendChild(charSpan);

                if (item.isEnd) {
                    const rt = document.createElement('rt');
                    rt.textContent = item.ruby;
                    currentRubyEl.appendChild(rt);
                    display.appendChild(currentRubyEl);
                    currentRubyEl = null;
                    currentRubyText = null;
                }
            } else {
                if (item.isOrp) {
                    const span = document.createElement('span');
                    span.className = 'orp-char';
                    span.textContent = item.char;
                    display.appendChild(span);
                } else {
                    display.appendChild(document.createTextNode(item.char));
                }
            }
        }
        this.fitReaderDisplay();
    }

    fitReaderDisplay() {
        const display = this.els.readerDisplay;
        const area = display?.parentElement;
        if (!display?.getBoundingClientRect || !area?.getBoundingClientRect || typeof getComputedStyle !== 'function') return;
        display.style.fontSize = '';
        display.style.transform = '';
        if (this.state.isCountingDown || this.state.hasPreparedText === false) return;
        const bounds = area.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const badges = [this.els.wpmBadge, this.els.chunkBadge, this.els.sourceBadge];
        const top = Math.max(bounds.top + 8, ...badges.filter(Boolean).map(badge => badge.getBoundingClientRect().bottom + 8));
        const bottom = bounds.bottom - 20;
        const availableHeight = Math.max(1, bottom - top);
        const availableWidth = Math.max(1, bounds.width - 16);
        const preferred = Number.parseFloat(getComputedStyle(display).fontSize);
        const initial = display.getBoundingClientRect();
        // 通常の表示は触らず、大きい文字・複数語で本文が切れる場合だけ最大可読サイズへ収める。
        if (initial.height <= availableHeight && display.scrollWidth <= availableWidth) return;
        if (!Number.isFinite(preferred) || preferred <= 0) return;
        let low = Math.min(12, preferred);
        let high = preferred;
        for (let count = 0; count < 7; count++) {
            const size = (low + high) / 2;
            display.style.fontSize = `${size}px`;
            const rect = display.getBoundingClientRect();
            if (rect.height <= availableHeight && display.scrollWidth <= availableWidth) low = size;
            else high = size;
        }
        display.style.fontSize = `${low}px`;
        const fitted = display.getBoundingClientRect();
        const offset = (top + bottom) / 2 - (fitted.top + fitted.bottom) / 2;
        display.style.transform = `translateY(${offset}px)`;
    }

    updateProgress() {
        if (!this.els.progressBar) return;
        if (!Array.isArray(this.state.words) || this.state.words.length === 0) {
            this.els.progressBar.style.width = '0%';
            const progressContainer = this.els.progressBar.parentElement;
            if (progressContainer) {
                progressContainer.setAttribute('aria-valuenow', '0');
            }
            return;
        }

        const percent = ((this.state.index + 1) / this.state.words.length) * 100;
        this.els.progressBar.style.width = `${percent}%`;

        // Update ARIA for screen readers
        const progressContainer = this.els.progressBar.parentElement;
        if (progressContainer) {
            progressContainer.setAttribute('aria-valuenow', Math.round(percent));
        }
    }

    updatePlayButtonUI(playing) {
        const btn = this.els.mainPlayBtn;
        if (!btn) return;
        const icon = btn.querySelector('.material-symbols-rounded');
        if (!icon) return;
        const textNode = btn.lastChild;

        if (playing) {
            icon.textContent = 'pause';
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = ' ' + UI_TEXT.PAUSE;
            }
            btn.classList.add('bg-slate-700', 'border-slate-600');
            btn.classList.remove('bg-teal-600', 'hover:bg-teal-500', 'border-teal-500/50');
        } else {
            icon.textContent = 'play_arrow';
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = ' ' + UI_TEXT.START;
            }
            btn.classList.remove('bg-slate-700', 'border-slate-600');
            btn.classList.add('bg-teal-600', 'hover:bg-teal-500', 'border-teal-500/50');
        }
    }

    // ==========================================================================
    // Reader Controls
    // ==========================================================================

    startReader() {
        if (this.state.words.length === 0 || this.state.hasPreparedText === false) return;
        if (this.state.completed) this.resetReader();
        if (this.state.index >= this.state.words.length) {
            this.state.index = 0;
            this.state.totalElapsedTime = 0;
        }

        this.pauseReader();

        // 最初の単語かつカウントダウン中でない場合のみ、カウントダウンを走らせる
        if (this.state.index === 0 && !this.state.isCountingDown) {
            this.runCountdown(() => {
                this.executeStartReader();
            });
            return;
        }

        this.executeStartReader();
    }

    runCountdown(callback) {
        this.state.isCountingDown = true;
        this.state.isPlaying = true;
        this.updatePlayButtonUI(true);

        const countValues = ['3', '2', '1', 'GO!'];
        let currentCountIdx = 0;

        if (this.els.readerDisplay) {
            this.els.readerDisplay.textContent = countValues[0];
            this.fitReaderDisplay();
            this.els.readerDisplay.classList.add('countdown-animate');
        }

        const countTick = () => {
            if (!this.state.isCountingDown || !this.state.isPlaying) {
                if (this.els.readerDisplay) {
                    this.els.readerDisplay.classList.remove('countdown-animate');
                }
                return;
            }

            currentCountIdx++;
            if (currentCountIdx >= countValues.length) {
                if (this.els.readerDisplay) {
                    this.els.readerDisplay.classList.remove('countdown-animate');
                }
                this.state.isCountingDown = false;
                callback();
                return;
            }

            if (this.els.readerDisplay) {
                this.els.readerDisplay.textContent = countValues[currentCountIdx];
                this.els.readerDisplay.classList.remove('countdown-animate');
                void this.els.readerDisplay.offsetWidth; // レイアウト再計算を強制してCSSアニメーションをリスタート
                this.els.readerDisplay.classList.add('countdown-animate');
            }

            this.state.timer = setTimeout(countTick, COUNTDOWN_TICK_MS);
        };

        this.state.timer = setTimeout(countTick, COUNTDOWN_TICK_MS);
    }

    executeStartReader() {
        this.state.isPlaying = true;
        this.updatePlayButtonUI(true);

        this.state.startTime = Date.now();

        const safeWpm = clampWpmValue(
            this.state.wpm,
            typeof WPM_CONFIG !== 'undefined' ? WPM_CONFIG : FALLBACK_WPM_CONFIG
        );
        this.state.wpm = safeWpm;
        this.updateWpmUI(safeWpm);
        
        const interval = 60000 / safeWpm;
        const wordDelay = word => interval * (DELAY_PUNCTUATION_PATTERN.test(word)
            ? PUNCTUATION_DELAY_MULTIPLIER : DELAY_COMMA_PATTERN.test(word) ? COMMA_DELAY_MULTIPLIER : 1);
        const firstInterval = wordDelay(this.state.words[this.state.index]);
        this.renderWord(this.state.words[this.state.index]);
        this.updateProgress();

        // 自己補正タイマー (Self-Correcting Timer) ループの初期設定
        let expected = Date.now() + firstInterval;
        
        const tick = () => {
            if (!this.state.isPlaying) return;

            this.state.index++;

            if (this.state.index >= this.state.words.length) {
                this.pauseReader();
                this.state.index = this.state.words.length - 1;
                this.state.completed = true;
                this.updateProgress();
                
                // 余韻を置いてモーダルを表示
                this.state.completionTimer = setTimeout(() => {
                    this.state.completionTimer = null;
                    this.showCompletionFeedback();
                }, COUNTDOWN_TICK_MS);
                return;
            }

            this.renderWord(this.state.words[this.state.index]);
            this.updateProgress();

            const currentInterval = wordDelay(this.state.words[this.state.index]);
            const drift = Math.max(0, Date.now() - expected);
            // 長時間の処理遅延後に、残った単語を0msで連続表示しない。
            const nextDelay = drift >= currentInterval ? currentInterval : currentInterval - drift;
            expected = Date.now() + nextDelay;
            this.state.timer = setTimeout(tick, nextDelay);
        };

        this.state.timer = setTimeout(tick, firstInterval);
    }

    pauseReader() {
        const wasCountingDown = this.state.isCountingDown;
        // 次の教材やリセット後へ、前の読書の完了処理を持ち越さない。
        if (this.state.completionTimer != null) {
            clearTimeout(this.state.completionTimer);
            this.state.completionTimer = null;
        }
        if (this.state.timer != null) {
            clearTimeout(this.state.timer);
            this.state.timer = null;
        }
        this.state.isPlaying = false;
        this.state.isCountingDown = false;
        this.updatePlayButtonUI(false);

        if (this.els.readerDisplay) {
            this.els.readerDisplay.classList.remove('countdown-animate');
        }

        if (this.state.startTime != null) {
            this.state.totalElapsedTime += Math.max(0, Date.now() - this.state.startTime);
            this.state.startTime = null;
        }
        if (wasCountingDown) this.renderWord(this.state.words[this.state.index]);
    }

    toggleReader() {
        this.state.isPlaying ? this.pauseReader() : this.startReader();
    }

    resetReader() {
        if (!Array.isArray(this.state.words) || this.state.words.length === 0) return;
        this.pauseReader();
        this.state.index = 0;
        this.state.totalElapsedTime = 0;
        this.state.startTime = null;
        this.state.completed = false;
        this.state.completionRecorded = false;
        this.updateProgress();
        this.renderWord(this.state.words[0]);
    }

    stepBack(amount = STEP_AMOUNT) {
        if (!Array.isArray(this.state.words) || this.state.words.length === 0) return;
        const safeAmount = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : STEP_AMOUNT;
        this.pauseReader();
        this.state.index = Math.max(0, this.state.index - safeAmount);
        this.updateProgress();
        this.renderWord(this.state.words[this.state.index]);
    }

    stepForward(amount = STEP_AMOUNT) {
        if (!Array.isArray(this.state.words) || this.state.words.length === 0) return;
        const safeAmount = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : STEP_AMOUNT;
        this.pauseReader();
        this.state.index = Math.min(this.state.words.length - 1, this.state.index + safeAmount);
        this.updateProgress();
        this.renderWord(this.state.words[this.state.index]);
    }

    getAttemptStats() {
        const activeTime = this.state.startTime != null ? Math.max(0, Date.now() - this.state.startTime) : 0;
        const elapsedSeconds = Math.max(0, (this.state.totalElapsedTime + activeTime) / 1000);
        const wordCount = Math.max(0, Number(this.state.totalWordCount) || 0);
        return { elapsedSeconds, wordCount, actualWpm: calculateEffectiveWpm(wordCount, elapsedSeconds) };
    }

    showCompletionFeedback({ showLegacy = true } = {}) {
        if (this.state.completionRecorded) return false;
        this.state.completionRecorded = true;
        // 別タブで完了した履歴を読み込み、今回の1回だけ加える。保存不可時は画面内の履歴を保つ。
        try {
            const latest = this.historySaveFailed ? null : localStorage.getItem('pikalab_speed_reader_history');
            if (latest) this.historyData = normalizeHistoryData(JSON.parse(latest));
        } catch (_) { /* 保存禁止・破損時もトレーニングは継続する。 */ }
        const { elapsedSeconds, wordCount, actualWpm } = this.getAttemptStats();

        let targetWpm = 250;
        if (this.state.currentCategory && CATEGORY_SPEEDS[this.state.currentCategory]) {
            targetWpm = CATEGORY_SPEEDS[this.state.currentCategory];
        }

        const ratio = actualWpm / targetWpm;

        // 履歴データの更新
        const today = new Date().toLocaleDateString('sv-SE');
        this.historyData.readCount++;
        if (actualWpm > this.historyData.maxWpm) {
            this.historyData.maxWpm = actualWpm;
        }
        this.historyData.totalWords += wordCount;
        this.historyData.totalDuration += Math.round(elapsedSeconds);

        if (this.state.currentCategory) {
            if (!this.historyData.categoryCounts) {
                this.historyData.categoryCounts = {
                    'low-elem': 0,
                    'high-elem': 0,
                    'junior': 0,
                    'high': 0
                };
            }
            this.historyData.categoryCounts[this.state.currentCategory] = (this.historyData.categoryCounts[this.state.currentCategory] || 0) + 1;
        } else {
            if (!this.historyData.customCount) this.historyData.customCount = 0;
            this.historyData.customCount++;
        }

        if (!this.historyData.dailyHistory) this.historyData.dailyHistory = {};
        this.historyData.dailyHistory[today] = (this.historyData.dailyHistory[today] || 0) + 1;

        // 新しいバッジの獲得判定
        const newlyUnlocked = this.checkAndUnlockBadges(actualWpm);
        this.saveHistoryData();
        if (!showLegacy) return true;

        let rank = 'C';
        let title = '🌱 ナイスチャレンジ！';
        let msg = '最後まで読みきれたね！まずは正確に文字を捉えることから。次はすこしだけ表示スピードを上げて挑戦してみよう！';
        let badgeClass = 'bg-slate-100 text-slate-700';

        if (ratio >= 2.0) {
            rank = 'S';
            title = '👑 瞬読マスター！';
            msg = '驚異的なスピード！脳の情報処理能力が限界を突破しているよ！この調子でどんどん視野を広げていこう！';
            badgeClass = 'bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200/50 animate-pulse';
        } else if (ratio >= 1.5) {
            rank = 'A';
            title = '✨ 速読エキスパート！';
            msg = 'すばらしい！目標の1.5倍以上の速度！周辺視野がバッチリ使えていて、脳がすごく活性化しているね！';
            badgeClass = 'bg-amber-50 text-amber-700 border border-amber-200/50';
        } else if (ratio >= 1.0) {
            rank = 'B';
            title = '👍 目標クリア！';
            msg = 'お見事！学年目標のスピードをしっかりとクリアできたよ！このペースでたくさんの本を読んでみよう！';
            badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200/50';
        }

        if (this.els.evalRankLabel) this.els.evalRankLabel.textContent = title;
        if (this.els.evalBadgeContainer) {
            this.els.evalBadgeContainer.className = `inline-block px-4 py-2 rounded-2xl font-bold text-sm mb-4 ${badgeClass}`;
        }
        if (this.els.evalTitle) {
            const rankTitles = {
                'S': '次元がちがう！',
                'A': 'すばらしい！',
                'B': 'ナイスクリア！',
                'C': 'がんばったね！'
            };
            this.els.evalTitle.textContent = rankTitles[rank];
        }
        if (this.els.evalWpm) this.els.evalWpm.textContent = `${actualWpm} WPM`;
        if (this.els.evalTargetWpm) this.els.evalTargetWpm.textContent = `${targetWpm} WPM`;
        if (this.els.evalTime) this.els.evalTime.textContent = `${elapsedSeconds.toFixed(1)}秒`;
        if (this.els.evalRatio) this.els.evalRatio.textContent = `${ratio.toFixed(1)}倍`;
        if (this.els.evalMessage) this.els.evalMessage.textContent = msg;

        // 既存のバッジ獲得通知をクリア
        if (this.els.evaluationModal) {
            const existingBadgeUnlock = this.els.evaluationModal.querySelector('.badge-unlock-container');
            if (existingBadgeUnlock) {
                existingBadgeUnlock.remove();
            }

            // 新しくバッジを獲得した場合、モーダル内に通知を挿入
            if (newlyUnlocked.length > 0) {
                const unlockContainer = document.createElement('div');
                unlockContainer.className = 'badge-unlock-container mt-4 p-4 bg-teal-50 border border-teal-200 rounded-2xl animate-bounce flex flex-col items-center justify-center';
                
                const badgeTitle = document.createElement('div');
                badgeTitle.className = 'font-bold text-teal-800 text-sm mb-2 flex items-center gap-1';
                
                const titleIcon = document.createElement('span');
                titleIcon.className = 'material-symbols-rounded text-base';
                titleIcon.textContent = 'workspace_premium';
                badgeTitle.appendChild(titleIcon);
                
                badgeTitle.appendChild(document.createTextNode(' あたらしいバッジをゲット！'));
                unlockContainer.appendChild(badgeTitle);

                const badgeGrid = document.createElement('div');
                badgeGrid.className = 'flex flex-wrap gap-2 justify-center';

                newlyUnlocked.forEach(badgeId => {
                    const badge = BADGES[badgeId];
                    if (!badge) return;
                    
                    const item = document.createElement('div');
                    item.className = `flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-sm shadow-sm ${badge.color}`;
                    
                    const iconSpan = document.createElement('span');
                    iconSpan.textContent = badge.icon;
                    item.appendChild(iconSpan);
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = badge.name;
                    item.appendChild(nameSpan);
                    
                    badgeGrid.appendChild(item);
                });
                unlockContainer.appendChild(badgeGrid);

                if (this.els.evalMessage) {
                    this.els.evalMessage.after(unlockContainer);
                }
                this.triggerConfetti(this.els.evaluationModal);
            }

            if (typeof this.els.evaluationModal.showModal === 'function') {
                this.els.evaluationModal.showModal();
            } else {
                this.els.evaluationModal.setAttribute('open', '');
            }
            setTimeout(() => {
                const retryBtn = this.els.evaluationModal?.querySelector('[data-action="close-eval"]');
                if (this.els.evaluationModal?.open) retryBtn?.focus();
            }, 50);
        }
    }

    closeEvaluationModal() {
        const modal = this.els.evaluationModal;
        if (!modal) return;
        if (typeof modal.close === 'function' && modal.open) {
            this.pendingLegacyCloses = (this.pendingLegacyCloses || 0) + 1;
            modal.close();
        } else {
            modal.removeAttribute('open');
        }
        this.resetReader();
        if (this.els.mainPlayBtn) {
            this.els.mainPlayBtn.focus();
        }
    }

    cancelFileRead() {
        this.fileReadId = (this.fileReadId || 0) + 1;
        const reader = this.fileReader;
        this.fileReader = null;
        if (reader?.readyState === 1) reader.abort();
    }

    handleTextFile(file) {
        if (!file) return;
        this.cancelFileRead();
        const requestId = this.fileReadId;
        const MAX_FILE_SIZE = 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            alert('ファイルサイズが大きすぎます。1MB以下のテキストファイルを選択してください。');
            return;
        }
        if (!/\.txt$/i.test(file.name)) {
            alert('読み込めるのはテキストファイル（.txt）のみです。');
            return;
        }
        const reader = new FileReader();
        this.fileReader = reader;
        reader.onload = (event) => {
            if (requestId !== this.fileReadId) return;
            this.fileReader = null;
            const text = event.target.result;
            if (typeof text !== 'string') return;
            if (this.els.customText) this.els.customText.value = text;
            this.prepareReader('custom');
        };
        reader.onerror = () => {
            if (requestId !== this.fileReadId) return;
            this.fileReader = null;
            alert('ファイルの読み込みに失敗しました。');
        };
        try {
            reader.readAsText(file, 'UTF-8');
        } catch (_) {
            reader.onerror();
        }
    }

    // ==========================================================================
    // Settings & Preparation
    // ==========================================================================

    prepareReader(source, key = null) {
        if (source === 'rechunk' && this.state.hasPreparedText === false) return;
        if (source !== 'rechunk') this.cancelFileRead();
        this.pauseReader();
        let text = "";
        let title = "";
        let category = this.state.currentCategory;

        if (source === 'custom') {
            text = this.els.customText ? this.els.customText.value : '';
            title = UI_TEXT.CUSTOM_INPUT;
            category = null;
        } else if (source === 'library') {
            const lib = libraries[key];
            if (!lib) {
                console.warn(`Library key not found: ${key}`);
                return;
            }
            text = lib.text;
            title = lib.title;
            category = lib.cat;
        } else if (source === 'rechunk') {
            text = this.state.rawText;
            title = this.state.title;
        }

        if (!text || text.trim().length === 0) {
            alert(UI_TEXT.NO_TEXT_ERROR);
            return;
        }

        // 以前の進捗率を保存 (rechunk時のみ有効)
        const prevProgress = this.state.words.length > 0
            ? this.state.index / this.state.words.length
            : 0;

        this.state.currentCategory = category;
        this.state.hasPreparedText = true;
        this.state.rawText = text;
        this.state.title = title;
        this.state.words = this.processText(text, this.state.chunkSize);

        // 進捗の復元 or リセット
        if (source === 'rechunk') {
            const nextIndex = Math.floor(prevProgress * this.state.words.length);
            this.state.index = Math.min(Math.max(nextIndex, 0), Math.max(this.state.words.length - 1, 0));
            this.renderWord(this.state.words[this.state.index]);
            this.updateProgress();
        } else {
            this.state.index = 0;
            this.state.totalElapsedTime = 0;
            this.state.startTime = null;
            this.state.completed = false;
            this.state.completionRecorded = false;
            this.updateProgress();
            this.renderWord(this.state.words[0]);
            if (this.els.sourceBadge) {
                this.els.sourceBadge.textContent = title;
                this.els.sourceBadge.classList.remove('opacity-0');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    loadLibrary(key, recommendedSpeed) {
        if (!key || !libraries[key]) {
            console.warn(`Library key not found: ${key}`);
            return;
        }
        this.prepareReader('library', key);

        if (Number.isFinite(recommendedSpeed) && recommendedSpeed > 0) {
            this.state.wpm = clampWpmValue(
                recommendedSpeed,
                typeof WPM_CONFIG !== 'undefined' ? WPM_CONFIG : FALLBACK_WPM_CONFIG
            );
            this.updateWpmUI(this.state.wpm);
        }
    }

    updateSettings() {
        if (!this.els.wpmSlider) return;
        const val = clampWpmValue(
            this.els.wpmSlider.value,
            typeof WPM_CONFIG !== 'undefined' ? WPM_CONFIG : FALLBACK_WPM_CONFIG
        );
        this.state.wpm = val;
        this.updateWpmUI(val);

        if (this.state.isPlaying) {
            this.startReader();
        }
    }

    setChunkSize(size, clickedButton) {
        if (!Number.isInteger(size) || size < 1 || size > 3) return;
        if (!(clickedButton instanceof HTMLElement)) return;
        if (this.state.chunkSize === size) return;
        this.state.chunkSize = size;

        if (this.els.chunkBadge) this.els.chunkBadge.textContent = `${size}単語`;

        document.querySelectorAll('.chunk-btn').forEach(b => {
            b.classList.remove('bg-teal-600', 'text-white', 'border-teal-600');
            b.classList.add('bg-white', 'text-slate-600', 'border-slate-200');
            b.setAttribute('aria-checked', 'false');
            b.tabIndex = -1;
        });

        clickedButton.classList.remove('bg-white', 'text-slate-600', 'border-slate-200');
        clickedButton.classList.add('bg-teal-600', 'text-white', 'border-teal-600');
        clickedButton.setAttribute('aria-checked', 'true');
        clickedButton.tabIndex = 0;

        this.prepareReader('rechunk');
    }

    setFontSize(size, clickedButton) {
        const validSizes = ['normal', 'large', 'xlarge'];
        if (!validSizes.includes(size)) return;
        if (!(clickedButton instanceof HTMLElement)) return;
        if (this.state.fontSize === size) return;
        this.state.fontSize = size;

        document.body.classList.remove('text-size-lg', 'text-size-xl');
        if (size === 'large') {
            document.body.classList.add('text-size-lg');
        } else if (size === 'xlarge') {
            document.body.classList.add('text-size-xl');
        }

        document.querySelectorAll('.fontsize-btn').forEach(b => {
            b.classList.remove('bg-teal-600', 'text-white', 'border-teal-600');
            b.classList.add('bg-white', 'text-slate-600', 'border-slate-200');
            b.setAttribute('aria-checked', 'false');
            b.tabIndex = -1;
        });

        clickedButton.classList.remove('bg-white', 'text-slate-600', 'border-slate-200');
        clickedButton.classList.add('bg-teal-600', 'text-white', 'border-teal-600');
        clickedButton.setAttribute('aria-checked', 'true');
        clickedButton.tabIndex = 0;
        this.fitReaderDisplay();
    }

    // ==========================================================================
    // Library Rendering
    // ==========================================================================

    renderLibrary() {
        const containers = {};
        CATEGORY_IDS.forEach(id => {
            containers[id] = document.getElementById(`lib-cat-${id}`);
        });

        // Clear containers using DOM manipulation
        Object.values(containers).forEach(el => {
            if (!el) return;
            el.textContent = '';
            const grid = document.createElement('div');
            grid.className = 'grid md:grid-cols-2 gap-4';
            el.appendChild(grid);
        });

        for (const [key, data] of Object.entries(libraries)) {
            const parentContainer = containers[data.cat];
            const palette = CATEGORY_PALETTE[data.cat];
            const speed = CATEGORY_SPEEDS[data.cat];
            if (!parentContainer || !palette || !speed) continue;

            const container = parentContainer.querySelector('div');
            if (!container) continue;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `lib-card bg-white p-4 rounded-xl border-2 border-transparent ${palette.hoverBorder} transition-all text-left`;
            btn.dataset.action = 'load-library';
            btn.dataset.param = key;

            // Create elements safely without innerHTML
            const badge = document.createElement('span');
            badge.className = `${palette.badgeBg} ${palette.badgeText} text-[10px] font-bold px-2 py-1 rounded-full mb-2 inline-block`;
            badge.textContent = UI_TEXT.RECOMMENDED_WPM_PREFIX + speed;

            const title = document.createElement('h3');
            title.className = 'font-bold text-xl text-slate-800 mb-1 font-mono';
            title.textContent = data.title;

            const preview = document.createElement('p');
            preview.className = 'text-sm text-slate-400 font-mono line-clamp-2';
            const previewText = data.text.length > 40 ? `${data.text.substring(0, 40)}...` : data.text;
            preview.textContent = previewText;

            btn.appendChild(badge);
            btn.appendChild(title);
            btn.appendChild(preview);
            container.appendChild(btn);
        }
    }

    // ==========================================================================
    // Tab Switching
    // ==========================================================================

    switchMainTab(tabId) {
        this.pauseReader();
        const validTabs = ['input', 'library', 'settings'];
        if (!validTabs.includes(tabId)) {
            console.warn(`Invalid tab id: ${tabId}`);
            return;
        }

        ['input', 'library', 'settings'].forEach(id => {
            const content = document.getElementById(`content-${id}`);
            const btn = document.getElementById(`tab-${id}`);
            if (!content || !btn) return;

            if (id === tabId) {
                content.classList.remove('hidden');
                content.classList.add('block');
                content.hidden = false;
                content.setAttribute('aria-hidden', 'false');
                btn.classList.add('tab-active');
                btn.classList.remove('bg-white', 'text-slate-600');
                btn.setAttribute('aria-selected', 'true');
                btn.tabIndex = 0;
                if (tabId === 'settings') {
                    this.renderReport();
                }
            } else {
                content.classList.add('hidden');
                content.classList.remove('block');
                content.hidden = true;
                content.setAttribute('aria-hidden', 'true');
                btn.classList.remove('tab-active');
                btn.classList.add('bg-white', 'text-slate-600');
                btn.setAttribute('aria-selected', 'false');
                btn.tabIndex = -1;
            }
        });
    }

    switchLibCategory(catId) {
        if (!CATEGORY_IDS.includes(catId)) {
            console.warn(`Invalid category id: ${catId}`);
            return;
        }

        const baseClasses = ['border-slate-200', 'text-slate-500', 'bg-white'];
        const activeCommon = ['cat-tab-active', 'ring-2', 'ring-offset-1'];

        CATEGORY_IDS.forEach(id => {
            const content = document.getElementById(`lib-cat-${id}`);
            const btn = document.getElementById(`cat-btn-${id}`);
            const isActive = id === catId;
            const palette = CATEGORY_PALETTE[id];
            if (!content || !btn || !palette) return;

            content.classList.toggle('hidden', !isActive);
            content.classList.toggle('block', isActive);
            content.hidden = !isActive;
            content.setAttribute('aria-hidden', isActive ? 'false' : 'true');

            // Update aria-selected for accessibility
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            btn.tabIndex = isActive ? 0 : -1;

            // Remove all possible active classes
            btn.classList.remove(
                'cat-tab-active', 'ring-2', 'ring-offset-1',
                ...Object.values(CATEGORY_PALETTE).flatMap(p => [p.border, p.bg, p.text, p.ring])
            );
            btn.classList.add(...baseClasses);

            if (isActive) {
                btn.classList.remove(...baseClasses);
                btn.classList.add(...activeCommon, palette.border, palette.bg, palette.text, palette.ring);
            }
        });
    }

    // ==========================================================================
    // History & Report Management
    // ==========================================================================

    loadHistoryData() {
        try {
            const stored = localStorage.getItem('pikalab_speed_reader_history');
            if (stored) {
                return normalizeHistoryData(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load history data:', e);
        }
        return normalizeHistoryData(null);
    }

    saveHistoryData() {
        try {
            localStorage.setItem('pikalab_speed_reader_history', JSON.stringify(this.historyData));
            this.historySaveFailed = false;
        } catch (e) {
            this.historySaveFailed = true;
            console.error('Failed to save history data:', e);
        }
    }

    checkAndUnlockBadges(actualWpm) {
        if (!this.historyData.unlockedBadges) {
            this.historyData.unlockedBadges = [];
        }

        const newlyUnlocked = [];
        Object.keys(BADGES).forEach(badgeId => {
            if (!this.historyData.unlockedBadges.includes(badgeId)) {
                if (BADGES[badgeId].check(this.historyData, actualWpm)) {
                    this.historyData.unlockedBadges.push(badgeId);
                    newlyUnlocked.push(badgeId);
                }
            }
        });

        return newlyUnlocked;
    }

    renderReport() {
        if (this.els.reportReadCount) {
            this.els.reportReadCount.textContent = `${this.historyData.readCount}冊`;
        }
        if (this.els.reportMaxWpm) {
            this.els.reportMaxWpm.textContent = String(this.historyData.maxWpm);
        }
        if (this.els.reportTotalWords) {
            this.els.reportTotalWords.textContent = String(this.historyData.totalWords);
        }
        if (this.els.reportTotalDuration) {
            const sec = this.historyData.totalDuration || 0;
            if (sec < 60) {
                this.els.reportTotalDuration.textContent = `${sec}秒`;
            } else {
                const m = Math.floor(sec / 60);
                const s = sec % 60;
                this.els.reportTotalDuration.textContent = s > 0 ? `${m}分${s}秒` : `${m}分`;
            }
        }

        // 過去7日間のトレーニング履歴（ヒストグラム）の描画
        if (this.els.reportChartContainer) {
            const dates = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toLocaleDateString('sv-SE');
                dates.push({
                    str: dateStr,
                    label: `${d.getMonth() + 1}/${d.getDate()}`
                });
            }

            const counts = dates.map(d => this.historyData.dailyHistory[d.str] || 0);
            const totalCount = counts.reduce((sum, c) => sum + c, 0);

            if (totalCount === 0) {
                this.els.reportChartContainer.textContent = '';
                const noData = document.createElement('div');
                noData.className = 'w-full text-center text-xs text-slate-300 font-bold py-8';
                noData.textContent = 'まだデータがありません';
                this.els.reportChartContainer.appendChild(noData);
            } else {
                const maxCount = Math.max(...counts, 1);

                // コンテナを初期化してflex構造を作る (初回または「データなし」表示が残っている場合)
                let flexContainer = this.els.reportChartContainer.querySelector('.chart-flex-container');
                if (!flexContainer) {
                    this.els.reportChartContainer.textContent = '';
                    flexContainer = document.createElement('div');
                    flexContainer.className = 'chart-flex-container w-full h-full flex justify-between items-end gap-2';
                    
                    dates.forEach(() => {
                        const col = document.createElement('div');
                        col.className = 'flex-1 flex flex-col items-center justify-end h-full';

                        const barWrapper = document.createElement('div');
                        barWrapper.className = 'w-full flex-1 flex flex-col justify-end items-center relative group';

                        const tooltip = document.createElement('div');
                        tooltip.className = 'chart-tooltip absolute -top-6 bg-slate-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-sm z-10';
                        barWrapper.appendChild(tooltip);

                        const bar = document.createElement('div');
                        bar.className = 'chart-bar w-full sm:w-2/3 bg-teal-500 rounded-t-md transition-all duration-500 origin-bottom hover:bg-teal-400';
                        barWrapper.appendChild(bar);

                        const label = document.createElement('div');
                        label.className = 'chart-label text-[9px] text-slate-400 font-bold mt-2 font-mono';

                        col.appendChild(barWrapper);
                        col.appendChild(label);
                        flexContainer.appendChild(col);
                    });
                    this.els.reportChartContainer.appendChild(flexContainer);
                }

                // 既存のバー要素の値を更新 (DOMの再生成なし)
                const cols = flexContainer.children;
                dates.forEach((d, idx) => {
                    const col = cols[idx];
                    if (!col) return;

                    const count = counts[idx];
                    const heightPercent = (count / maxCount) * 80;

                    const tooltip = col.querySelector('.chart-tooltip');
                    if (tooltip) tooltip.textContent = `${count}回`;

                    const bar = col.querySelector('.chart-bar');
                    if (bar) {
                        bar.style.height = `${Math.max(count > 0 ? 5 : 0, heightPercent)}%`;
                    }

                    const label = col.querySelector('.chart-label');
                    if (label) {
                        label.textContent = d.label;
                    }
                });
            }
        }

        // バッジコレクションの描画 (初回のみDOMを生成し、以降は状態のみを差分更新)
        if (this.els.reportBadgeGrid) {
            if (this.els.reportBadgeGrid.children.length === 0) {
                Object.values(BADGES).forEach(badge => {
                    const card = document.createElement('div');
                    card.className = 'flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all shadow-sm';
                    card.dataset.badgeId = badge.id;
                    
                    const icon = document.createElement('div');
                    icon.className = 'badge-icon text-3xl mb-1.5 select-none filter drop-shadow-sm';
                    card.appendChild(icon);

                    const name = document.createElement('div');
                    name.className = 'font-bold text-xs leading-tight mb-1';
                    name.textContent = badge.name;
                    card.appendChild(name);

                    const desc = document.createElement('div');
                    desc.className = 'badge-desc text-[9px] font-medium leading-normal max-w-full text-slate-500 mt-0.5';
                    desc.textContent = badge.desc;
                    card.appendChild(desc);

                    this.els.reportBadgeGrid.appendChild(card);
                });
            }

            // アンロック状態の適用
            Array.from(this.els.reportBadgeGrid.children).forEach(card => {
                const badgeId = card.dataset.badgeId;
                const badge = BADGES[badgeId];
                if (!badge) return;

                const isUnlocked = this.historyData.unlockedBadges.includes(badgeId);
                const iconEl = card.querySelector('.badge-icon');
                const descEl = card.querySelector('.badge-desc');

                if (isUnlocked) {
                    card.className = `flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all shadow-sm ${badge.color} transform hover:scale-105`;
                    if (iconEl) iconEl.textContent = badge.icon;
                    if (descEl) {
                        descEl.className = 'badge-desc text-[9px] font-bold leading-normal max-w-full text-slate-600 mt-0.5';
                    }
                } else {
                    card.className = 'flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all shadow-sm bg-slate-50 text-slate-400 border-slate-200/60 opacity-70';
                    if (iconEl) iconEl.textContent = '🔒';
                    if (descEl) {
                        descEl.className = 'badge-desc text-[9px] font-medium leading-normal max-w-full text-slate-400 mt-0.5';
                    }
                }
            });
        }
    }

    triggerConfetti(parentEl) {
        if (!parentEl) return;
        const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

        for (let i = 0; i < 30; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 6 + 6; // 6px ~ 12px
            const left = Math.random() * 100;
            const delay = Math.random() * 0.5;
            const duration = Math.random() * 1 + 1.2;

            confetti.style.backgroundColor = color;
            confetti.style.width = `${size}px`;
            confetti.style.height = `${size}px`;
            confetti.style.left = `${left}%`;
            confetti.style.top = `-10px`;
            confetti.style.animation = `confetti-fall ${duration}s ease-out ${delay}s forwards`;

            parentEl.appendChild(confetti);

            setTimeout(() => {
                confetti.remove();
            }, (duration + delay) * 1000);
        }
    }
}

// ==========================================================================
// Initialize App
// ==========================================================================

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        new SpeedReaderApp();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        clampWpmValue,
        shouldInsertSpaceBetweenSegments,
        joinChunkSegments,
        createChunksFromSegments,
        createChunkDataFromSegments,
        calculateEffectiveWpm,
        normalizeJapaneseSegments,
        normalizeHistoryData
    };
}

