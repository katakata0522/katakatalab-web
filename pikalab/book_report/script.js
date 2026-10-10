/*
 * 読書感想文クエストの本体と補助機能を順番に読み込む。
 * DOMの準備状態に応じた初期化は、各スクリプト自身が担当する。
 */
(function loadBookReportCore() {
    'use strict';

    if (typeof document === 'undefined') {
        if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
            module.exports = require('./script-core.js');
        }
        return;
    }

    const currentScript = document.currentScript;
    const baseUrl = currentScript && currentScript.src
        ? new URL('.', currentScript.src)
        : new URL('./', window.location.href);

    const coreScript = document.createElement('script');
    coreScript.src = new URL('script-core.js', baseUrl).href;
    coreScript.async = false;

    coreScript.addEventListener('load', () => {
        const supportScript = document.createElement('script');
        supportScript.src = new URL('summer-support.js', baseUrl).href;
        supportScript.async = false;
        supportScript.addEventListener('error', () => {
            console.error('Book Report summer support script could not be loaded.');
        }, { once: true });
        document.head.appendChild(supportScript);
    }, { once: true });

    coreScript.addEventListener('error', () => {
        console.error('Book Report core script could not be loaded.');
    }, { once: true });

    document.head.appendChild(coreScript);
})();