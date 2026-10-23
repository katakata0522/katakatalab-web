// 保存境界の検証。壊れた項目だけ初期値へ戻し、正常な進捗は残す。
(function (root) {
    'use strict';

    function normalizeProgress(value, catalog, titles) {
        const record = input => input && typeof input === 'object' && !Array.isArray(input) ? input : {};
        const saved = record(value);
        const kanji = new Set(catalog.map(entry => entry.k));
        const knownTitles = new Set(titles);
        const knownThemes = new Set(['default', 'matcha', 'cyber', 'sakura']);
        const strings = (input, valid) => [...new Set(Array.isArray(input) ? input.filter(item => typeof item === 'string' && valid(item)) : [])];
        const integer = input => Number.isSafeInteger(input) && input >= 0;
        const isDate = input => {
            if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
            const date = new Date(input + 'T12:00:00Z');
            return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === input;
        };
        const numbers = (input, validKey, validValue) => Object.fromEntries(
            Object.entries(record(input)).filter(([key, number]) => validKey(key) && validValue(number))
        );
        const courseKey = key => /^(combine|decompose)_(basic|advanced|vertical|all)$/.test(key);
        const unlockedTitles = strings(saved.unlockedTitles, item => knownTitles.has(item));
        if (!unlockedTitles.includes('合体ビギナー')) unlockedTitles.unshift('合体ビギナー');
        const unlockedThemes = strings(saved.unlockedThemes, item => knownThemes.has(item));
        if (!unlockedThemes.includes('default')) unlockedThemes.unshift('default');
        return {
            collection: strings(saved.collection, item => kanji.has(item)),
            quizScores: numbers(saved.quizScores, courseKey, integer),
            quizStars: numbers(saved.quizStars, courseKey, n => integer(n) && n <= 3),
            theme: knownThemes.has(saved.theme) ? saved.theme : 'default',
            configAssist: typeof saved.configAssist === 'boolean' ? saved.configAssist : true,
            configFurigana: typeof saved.configFurigana === 'boolean' ? saved.configFurigana : false,
            dailyClearHistory: strings(saved.dailyClearHistory, isDate),
            dailyBestTimes: numbers(saved.dailyBestTimes, isDate, n => typeof n === 'number' && Number.isFinite(n) && n >= 0),
            shiningKanji: strings(saved.shiningKanji, item => kanji.has(item)),
            holoTickets: integer(saved.holoTickets) ? saved.holoTickets : 0,
            unlockedTitles,
            unlockedThemes,
            isMuted: typeof saved.isMuted === 'boolean' ? saved.isMuted : false,
            selectedTitle: unlockedTitles.includes(saved.selectedTitle) ? saved.selectedTitle : '合体ビギナー',
            wrongKanjiList: strings(saved.wrongKanjiList, item => kanji.has(item)),
            lastRewardedStreakDate: isDate(saved.lastRewardedStreakDate) ? saved.lastRewardedStreakDate : ''
        };
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = { normalizeProgress };
    else root.KanjiLabProgress = Object.freeze({ normalizeProgress });
})(typeof window === 'undefined' ? globalThis : window);
