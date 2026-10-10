/**
 * タイピング道場の純粋ロジック。
 * DOMや保存領域へ依存させず、入力判定だけを単独で検証できる状態に保つ。
 */

const MAX_PATTERN_COUNT = 4096;
const MAX_WORD_LENGTH = 256;
const RANK_THRESHOLDS = [
    { days: 0, label: '見習い' },
    { days: 3, label: '初段' },
    { days: 7, label: '二段' },
    { days: 14, label: '三段' },
    { days: 30, label: '師範代' },
    { days: 60, label: '師範' }
];

const ROMAJI_MAP = {
    'あ': ['a'], 'い': ['i', 'yi'], 'う': ['u', 'wu'], 'え': ['e'], 'お': ['o'],
    'か': ['ka', 'ca'], 'き': ['ki'], 'く': ['ku', 'cu', 'qu'], 'け': ['ke'], 'こ': ['ko', 'co'],
    'さ': ['sa'], 'し': ['si', 'shi', 'ci'], 'す': ['su'], 'せ': ['se', 'ce'], 'そ': ['so'],
    'た': ['ta'], 'ち': ['ti', 'chi'], 'つ': ['tu', 'tsu'], 'て': ['te'], 'と': ['to'],
    'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
    'は': ['ha'], 'ひ': ['hi'], 'ふ': ['hu', 'fu'], 'へ': ['he'], 'ほ': ['ho'],
    'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
    'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
    'ら': ['ra', 'la'], 'り': ['ri', 'li'], 'る': ['ru', 'lu'], 'れ': ['re', 'le'], 'ろ': ['ro', 'lo'],
    'わ': ['wa'], 'を': ['wo'], 'ん': ['n', 'nn', 'xn'],
    'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
    'ざ': ['za'], 'じ': ['zi', 'ji'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
    'だ': ['da'], 'ぢ': ['di'], 'づ': ['du', 'dzu'], 'で': ['de'], 'ど': ['do'],
    'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
    'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
    'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
    'しゃ': ['sya', 'sha'], 'しゅ': ['syu', 'shu'], 'しょ': ['syo', 'sho'],
    'ちゃ': ['tya', 'cha'], 'ちゅ': ['tyu', 'chu'], 'ちょ': ['tyo', 'cho'],
    'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
    'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
    'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
    'りゃ': ['rya', 'lya'], 'りゅ': ['ryu', 'lyu'], 'りょ': ['ryo', 'lyo'],
    'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
    'じゃ': ['zya', 'ja', 'jya'], 'じゅ': ['zyu', 'ju', 'jyu'], 'じょ': ['zyo', 'jo', 'jyo'],
    'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
    'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],
    'ぁ': ['xa', 'la'], 'ぃ': ['xi', 'li'], 'ぅ': ['xu', 'lu'], 'ぇ': ['xe', 'le'], 'ぉ': ['xo', 'lo'],
    'っ': ['xtu', 'ltu', 'ltsu', 'xtsu'],
    'ゃ': ['xya', 'lya'], 'ゅ': ['xyu', 'lyu'], 'ょ': ['xyo', 'lyo'],
};

const DEFAULT_PREFERENCES = Object.freeze({
    focusMode: false,
    soundEnabled: true,
    soundVolume: 60,
    autoResume: true,
    showRomajiHint: true,
    keyboardType: 'kana'
});

function finiteNumber(value, fallback = 0) {
    if (typeof value !== 'number' && (typeof value !== 'string' || value.trim() === '')) return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function nonNegativeInteger(value, fallback = 0) {
    return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(finiteNumber(value, fallback))));
}

function normalizePreferences(preferences, portalData = null) {
    const source = preferences && typeof preferences === 'object' && !Array.isArray(preferences)
        ? preferences : {};
    const normalized = { ...DEFAULT_PREFERENCES };
    for (const key of ['focusMode', 'soundEnabled', 'autoResume', 'showRomajiHint']) {
        if (typeof source[key] === 'boolean') normalized[key] = source[key];
    }
    normalized.soundVolume = Math.round(Math.min(100, Math.max(0,
        finiteNumber(source.soundVolume, DEFAULT_PREFERENCES.soundVolume))));
    if (['kana', 'romaji'].includes(source.keyboardType)) normalized.keyboardType = source.keyboardType;

    if (portalData && typeof portalData === 'object' && !Array.isArray(portalData)) {
        if (typeof portalData.isMuted === 'boolean') normalized.soundEnabled = !portalData.isMuted;
        const db = finiteNumber(portalData.volumeDb, NaN);
        if (Number.isFinite(db)) {
            normalized.soundVolume = Math.round(Math.min(100, Math.max(0, (db + 40) * 2.5)));
            if (db <= -40) normalized.soundEnabled = false;
        }
    }
    return normalized;
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

function splitSentenceToChunks(sentences, minLen = 6, maxLen = 20) {
    if (!Array.isArray(sentences)) return [];
    minLen = Math.max(1, nonNegativeInteger(minLen, 6));
    maxLen = Math.max(minLen, nonNegativeInteger(maxLen, 20));
    const chunks = [];
    sentences.forEach((sentence) => {
        const safe = typeof sentence === 'string' ? sentence.trim() : '';
        if (!safe) return;
        safe
            .split(/[。！？!?、]/)
            .map((part) => part.trim())
            .filter(Boolean)
            .forEach((part) => {
                if (part.length <= maxLen) {
                    if (part.length >= minLen) chunks.push(part);
                    return;
                }
                for (let i = 0; i < part.length; i += maxLen) {
                    const slice = part.slice(i, i + maxLen).trim();
                    if (slice.length >= minLen) chunks.push(slice);
                }
            });
    });
    return chunks;
}

function filterWordsByCharTraining(words, mode) {
    if (!Array.isArray(words)) return [];
    if (mode === 'all') return words.slice();

    const matcherMap = {
        youon: (word) => /[ゃゅょ]/.test(normalizeKanaToHiragana(word)),
        sokuon: (word) => /っ/.test(normalizeKanaToHiragana(word)),
        hatsuon: (word) => /ん/.test(normalizeKanaToHiragana(word)),
        choon: (word) => /ー/.test(String(word || ''))
    };
    const matcher = matcherMap[mode];
    if (typeof matcher !== 'function') return words.slice();
    return words.filter((word) => matcher(word));
}

function sanitizeWordList(words) {
    if (!Array.isArray(words)) return [];
    return words
        .filter((word) => typeof word === 'string')
        .map((word) => word.trim())
        .filter((word) => word.length > 0)
        .filter((word) => hiraganaToRomaji(normalizeKanaToHiragana(word)).length > 0);
}

function getSentenceBuckets(sentences) {
    const normalized = sanitizeWordList(sentences);
    const short = splitSentenceToChunks(normalized, 6, 14);
    const medium = splitSentenceToChunks(normalized, 8, 22);
    return {
        short: sanitizeWordList(short),
        medium: sanitizeWordList(medium),
        full: normalized
    };
}

function resolveSentenceBucketByScore(score, buckets) {
    if (!buckets) return [];
    const bucket = score < 5 ? buckets.short : score < 15 ? buckets.medium : buckets.full;
    return Array.isArray(bucket) ? bucket : [];
}

function chooseWordFromPool(pool, recentWords = []) {
    const safePool = Array.isArray(pool) ? pool.filter((word) => typeof word === 'string' && word.trim()) : [];
    if (safePool.length === 0) return '';
    const recentSet = new Set(Array.isArray(recentWords) ? recentWords : []);
    const candidates = safePool.filter((word) => !recentSet.has(word));
    const source = candidates.length > 0 ? candidates : safePool;
    return source[Math.floor(Math.random() * source.length)];
}

function getRankLabel(streakDays) {
    let label = RANK_THRESHOLDS[0].label;
    RANK_THRESHOLDS.forEach((rule) => {
        if (streakDays >= rule.days) {
            label = rule.label;
        }
    });
    return label;
}

function calcWpm(typedChars, elapsedSeconds) {
    const safeChars = nonNegativeInteger(typedChars);
    const safeSeconds = Math.max(1, finiteNumber(elapsedSeconds, 1));
    return Math.round((safeChars / 5) / (safeSeconds / 60));
}

function normalizeStatsHistory(history, limit = 10) {
    const safeLimit = nonNegativeInteger(limit);
    if (!Array.isArray(history) || safeLimit === 0) return [];
    return history
        .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
        .filter((entry) => ['wpm', 'accuracy', 'missRate'].every((key) => Number.isFinite(finiteNumber(entry[key], NaN))))
        .slice(-safeLimit)
        .map((entry) => {
            const normalized = {
                wpm: nonNegativeInteger(entry.wpm),
                accuracy: Math.min(100, Math.max(0, finiteNumber(entry.accuracy))),
                missRate: Math.min(100, Math.max(0, finiteNumber(entry.missRate)))
            };
            for (const key of ['date', 'level', 'mode', 'unitMode', 'charTraining']) {
                if (typeof entry[key] === 'string') normalized[key] = entry[key];
            }
            for (const key of ['score', 'miss', 'maxCombo']) {
                if (key in entry) normalized[key] = nonNegativeInteger(entry[key]);
            }
            return normalized;
        });
}

function resolveRestoredRomajiPattern(savedPattern, validPatterns, fallbackPattern) {
    if (typeof savedPattern !== 'string') return fallbackPattern;
    const valid = typeof validPatterns?.isComplete === 'function'
        ? validPatterns.isComplete(savedPattern)
        : validPatterns instanceof Set && validPatterns.has(savedPattern);
    return valid ? savedPattern : fallbackPattern;
}

function sanitizeTypingInput(value) {
    const text = normalizeKanaToHiragana(typeof value === 'string' ? value : '').toLowerCase();
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (/^[a-z]$/.test(char)) {
            result += char;
        } else if (char === 'ー') {
            result += getLastVowel(result);
        } else if (char === 'ん') {
            // 確定済みのかなは、次の入力が母音でも曖昧にならない形にする。
            result += 'nn';
        } else if (char === 'っ') {
            result += 'xtu';
        } else if (ROMAJI_MAP[text.slice(i, i + 2)]) {
            result += ROMAJI_MAP[text.slice(i, i + 2)][0];
            i++;
        } else if (ROMAJI_MAP[char]) {
            result += ROMAJI_MAP[char][0];
        }
    }
    return result;
}

function getLastVowel(romajiText) {
    const safe = String(romajiText || '').toLowerCase();
    for (let i = safe.length - 1; i >= 0; i--) {
        const char = safe[i];
        if (char === 'a' || char === 'i' || char === 'u' || char === 'e' || char === 'o') {
            return char;
        }
    }
    return '';
}

function applyLongVowelToPatterns(patterns) {
    const result = [];
    const seen = new Set();

    for (const pattern of patterns) {
        const vowel = getLastVowel(pattern);
        const extended = vowel ? `${pattern}${vowel}` : pattern;
        if (seen.has(extended)) continue;
        seen.add(extended);
        result.push(extended);
        if (result.length >= MAX_PATTERN_COUNT) {
            break;
        }
    }

    return result;
}

/**
 * かな位置間の遷移として候補を保持する。全文候補の直積を作らずに入力判定する。
 * 促音・撥音は直後の候補と結び付け、別表記の子音が混ざらないようにする。
 */
function compilePatternGraph(value) {
    if (typeof value !== 'string' || value.length > MAX_WORD_LENGTH * 2) {
        return { text: '', edges: [[]], defaults: [''], canonical: '' };
    }
    const text = normalizeKanaToHiragana(value).replace(/[\s。、！？!?・「」『』（）()….,]/g, '');
    const supported = text.length > 0 && text.length <= MAX_WORD_LENGTH && Array.from(text).every((char) => char === 'ー' || ROMAJI_MAP[char]);
    if (!supported) return { text: '', edges: [[]], defaults: [''], canonical: '' };

    const vowels = [];
    let vowel = '';
    for (let i = 0; i < text.length; i++) {
        vowels[i] = vowel;
        vowel = getLastVowel(ROMAJI_MAP[text[i]]?.[0]) || vowel;
    }
    const edges = Array.from({ length: text.length + 1 }, () => []);
    const defaults = Array(text.length + 1).fill('');
    const canonical = Array(text.length + 1).fill('');
    for (let i = text.length - 1; i >= 0; i--) {
        const char = text[i];
        const candidates = [];
        const add = (label, next) => candidates.push({ label, next });
        let preferred = null;
        if (char === 'ー') {
            add(vowels[i], i + 1);
        } else if (char === 'っ') {
            ROMAJI_MAP['っ'].forEach((label) => add(label, i + 1));
            edges[i + 1].forEach((edge) => {
                if (/^[b-df-hj-mp-tv-z]/.test(edge.label)) {
                    const doubled = { label: edge.label[0] + edge.label, next: edge.next };
                    if (!preferred) preferred = doubled;
                    candidates.push(doubled);
                    if (edge.label.startsWith('ch')) add('t' + edge.label, edge.next);
                }
            });
        } else if (char === 'ん') {
            const singleN = edges[i + 1].filter((edge) => /^[^aeiouy]/.test(edge.label) && text[i + 1] !== 'ん');
            if (i === text.length - 1) add('n', i + 1);
            const canonicalNext = edges[i + 1][0];
            if (singleN.includes(canonicalNext)) {
                preferred = { label: 'n' + canonicalNext.label, next: canonicalNext.next };
                // ヒントの既存表記（な行の前では nn）を維持し、短い n も入力では許可する。
                if (!canonicalNext.label.startsWith('n')) candidates.push(preferred);
            }
            add('nn', i + 1);
            add('xn', i + 1);
            singleN.forEach((edge) => add('n' + edge.label, edge.next));
        } else {
            const compound = i + 1 < text.length ? ROMAJI_MAP[text.slice(i, i + 2)] : null;
            if (compound) compound.forEach((label) => add(label, i + 2));
            // 小書きのかなを一文字ずつ確定するスマホ入力にも対応する。
            ROMAJI_MAP[char].forEach((label) => add(label, i + 1));
        }
        const seen = new Set();
        edges[i] = candidates.filter(({ label, next }) => {
            const key = `${label}:${next}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        const first = edges[i][0];
        defaults[i] = first.label + defaults[first.next];
        const preferredEdge = preferred || first;
        canonical[i] = preferredEdge.label + canonical[preferredEdge.next];
    }
    return { text, edges, defaults, canonical: canonical[0] };
}

function createPatternMatcher(graph) {
    const { text, edges, defaults } = graph;
    function search(input, complete) {
        const normalized = typeof input === 'string' ? input.toLowerCase() : '';
        if (!text || normalized.length > text.length * 4 || !/^[a-z]*$/.test(normalized) || (complete && !normalized)) return null;
        const memo = new Map();
        function visit(index, offset) {
            const key = `${index}:${offset}`;
            if (memo.has(key)) return memo.get(key);
            if (index === text.length) return offset === normalized.length ? '' : null;
            const remaining = normalized.slice(offset);
            for (const edge of edges[index]) {
                if (!complete && edge.label.startsWith(remaining)) {
                    return edge.label + defaults[edge.next];
                }
                if (!normalized.startsWith(edge.label, offset)) continue;
                const suffix = visit(edge.next, offset + edge.label.length);
                if (suffix !== null) {
                    const match = edge.label + suffix;
                    memo.set(key, match);
                    return match;
                }
            }
            memo.set(key, null);
            return null;
        }
        return visit(0, 0);
    }
    return Object.freeze({
        findMatch: (input) => search(input, false),
        hasPrefix: (input) => search(input, false) !== null,
        isComplete: (input) => search(input, true) !== null
    });
}

function enumeratePatterns(graph) {
    if (!graph.text) return [];
    const patterns = [];
    const seen = new Set();
    function visit(index, prefix) {
        if (patterns.length >= MAX_PATTERN_COUNT) return;
        if (index === graph.text.length) {
            if (!prefix || seen.has(prefix)) return;
            seen.add(prefix);
            patterns.push(prefix);
            return;
        }
        for (const edge of graph.edges[index]) {
            visit(edge.next, prefix + edge.label);
            if (patterns.length >= MAX_PATTERN_COUNT) break;
        }
    }
    visit(0, '');
    return patterns;
}

function findMatchingPattern(input, patterns) {
    const normalized = sanitizeTypingInput(input);
    if (normalized.length === 0) return null;
    if (typeof patterns?.findMatch === 'function') return patterns.findMatch(normalized);
    if (!Array.isArray(patterns)) return null;
    return patterns.find((pattern) => typeof pattern === 'string' && pattern.startsWith(normalized)) || null;
}

function buildPatternCache(hiragana, { includePatterns = true } = {}) {
    const graph = compilePatternGraph(hiragana);
    const matcher = createPatternMatcher(graph);
    const defaultPattern = graph.defaults[0] || '';
    const patterns = includePatterns ? enumeratePatterns(graph) : defaultPattern ? [defaultPattern] : [];
    const patternSet = new Set(patterns);
    const prefixSet = new Set(['']);
    patterns.forEach((pattern) => {
        for (let i = 1; i <= pattern.length; i++) prefixSet.add(pattern.slice(0, i));
    });
    return { patterns, patternSet, prefixSet, defaultPattern, matcher };
}

function hiraganaToRomaji(hiragana) {
    return compilePatternGraph(hiragana).canonical;
}

function isCorrectInput(input, hiragana, cachedPatternSet = null) {
    const normalizedInput = sanitizeTypingInput(input);
    if (!normalizedInput) return false;
    if (typeof cachedPatternSet?.isComplete === 'function') return cachedPatternSet.isComplete(normalizedInput);
    if (cachedPatternSet instanceof Set) return cachedPatternSet.has(normalizedInput);
    return createPatternMatcher(compilePatternGraph(hiragana)).isComplete(normalizedInput);
}

function generateAllPatterns(hiragana) {
    return enumeratePatterns(compilePatternGraph(hiragana));
}

export {
    ROMAJI_MAP,
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
};

