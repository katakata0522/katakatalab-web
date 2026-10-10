(function initializeKotobaStorage(globalScope) {
    'use strict';

    const BEST_SCORE_KEY = 'kotoba_bestScore';

    function readBestScore() {
        try {
            const raw = globalScope.localStorage.getItem(BEST_SCORE_KEY);
            if (typeof raw !== 'string' || !/^\d+$/.test(raw.trim())) return 0;
            const score = Number(raw.trim());
            return Number.isSafeInteger(score) && score >= 0 ? score : 0;
        } catch (_error) {
            // 保存領域が拒否されても、ゲームの起動は継続する。
            return 0;
        }
    }

    function writeBestScore(score) {
        if (!Number.isSafeInteger(score) || score < 0) return false;
        try {
            globalScope.localStorage.setItem(BEST_SCORE_KEY, String(score));
            return true;
        } catch (_error) {
            // 今回のプレイ中の最高得点はゲーム本体が保持する。
            return false;
        }
    }

    const api = Object.freeze({ readBestScore, writeBestScore });
    globalScope.KotobaStorage = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
