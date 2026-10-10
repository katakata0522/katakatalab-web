(() => {
    'use strict';

    const ALLOWED_KEYS = new Set([
        'pikalab-dark-mode',
        'pikalab-large-text'
    ]);

    function isAllowedKey(key) {
        return typeof key === 'string' && ALLOWED_KEYS.has(key);
    }

    function get(key) {
        if (!isAllowedKey(key)) return null;
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.warn(`[PikaLab Articles] 設定を読み込めませんでした (${key})`, error);
            return null;
        }
    }

    function set(key, value) {
        if (!isAllowedKey(key)) return false;
        try {
            localStorage.setItem(key, String(value));
            return true;
        } catch (error) {
            console.warn(`[PikaLab Articles] 設定を保存できませんでした (${key})`, error);
            return false;
        }
    }

    window.PikaLabArticlePreferences = Object.freeze({ get, set });
})();
