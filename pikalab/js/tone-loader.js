(function initializeToneLoader(global) {
    'use strict';

    let loadPromise = null;

    /**
     * Tone.jsを最初の音声操作時に一度だけ読み込む。
     * @param {string} sourceUrl - 同一サイト内のTone.js URL
     * @returns {Promise<object>} Tone.js本体
     */
    function load(sourceUrl) {
        if (global.Tone) return Promise.resolve(global.Tone);
        if (loadPromise) return loadPromise;

        loadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = sourceUrl;
            script.async = true;
            script.dataset.pikalabToneLoader = 'true';

            script.onload = () => {
                if (global.Tone) {
                    resolve(global.Tone);
                    return;
                }
                loadPromise = null;
                reject(new Error('Tone.jsの読み込み後に本体を確認できませんでした。'));
            };

            script.onerror = () => {
                loadPromise = null;
                reject(new Error('Tone.jsの読み込みに失敗しました。'));
            };

            document.head.appendChild(script);
        });

        return loadPromise;
    }

    global.PikaLabToneLoader = Object.freeze({ load });
}(window));
