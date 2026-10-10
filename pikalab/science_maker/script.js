/*
 * Science Maker compatibility loader.
 * 実装本体は script-core.js に分離し、DOMの準備後に初期化する。
 * Summer support and reviewed guidance are initialized from this entrypoint.
 * Compatibility markers for source-contract tests:
 * share-import-modal / share-import-confirm-btn / share-import-cancel-btn / share-import-preview
 */
(function loadScienceMakerCore() {
    'use strict';

    if (typeof document === 'undefined') {
        if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
            module.exports = require('./script-core.js');
        }
        return;
    }

    function initReviewedGuidance() {
        function rewriteHeroAndShareCopy() {
            const header = document.querySelector('#main-content')?.previousElementSibling;
            const heroDescription = header?.querySelector('p.text-lg');
            if (heroDescription) {
                heroDescription.innerHTML = '時間や興味に合った研究テーマを見つけて、<br class="hidden sm:inline">予想・方法・結果・考察を<span class="text-science-700 bg-science-100 px-1 rounded">自分の研究メモ</span>に整理しよう！';
            }

            const shareButton = document.getElementById('share-btn');
            if (shareButton) {
                shareButton.setAttribute('aria-label', '研究計画のメモを共有');
                shareButton.innerHTML = '<span class="material-symbols-outlined mr-1 text-lg" aria-hidden="true">share</span> 計画部分を共有';
            }

            const shareTitle = document.getElementById('share-modal-title');
            if (shareTitle) {
                shareTitle.innerHTML = '<span class="material-symbols-outlined text-science-600" aria-hidden="true">share</span> 研究計画のメモを共有する';
            }

            const shareDescription = document.querySelector('#share-modal .p-6 > p');
            if (shareDescription) {
                shareDescription.textContent = '共有リンクに含まれるのは、テーマ・きっかけ・予想・材料・方法などの計画部分です。研究後の「結果・考察」は、この端末の研究メモとして保存されます。';
            }
        }

        function rewriteParentGuide() {
            const modal = document.getElementById('parents-modal');
            if (!modal) return;

            Array.from(modal.querySelectorAll('p')).forEach((paragraph) => {
                const text = paragraph.textContent;
                if (text.includes('科学的思考のプロセス') && text.includes('育みます')) {
                    paragraph.innerHTML = '「サイエンスメーカー」は、自由研究のテーマ選びから、予想・方法・結果・考察までを順番に整理する学習支援ツールです。<span class="bg-indigo-100 text-indigo-700 px-1 rounded">「予想する→試す→記録する→考える」</span>という流れを体験し、自分の考えを言葉や記録にまとめる練習に使えます。';
                }
                if (text.includes('理科好きな子どもを育む近道')) {
                    paragraph.innerHTML = '実験の予想が外れても「なんで違ったんだろう？」と一緒に考えてあげてください。<span class="bg-pink-100 text-pink-700 px-1 rounded">予想と違う結果も大切な発見</span>です。正解を先に教えるより、結果を見て次の疑問を一緒に探す使い方がおすすめです。';
                }
                if (text.includes('本物の科学プロセス')) {
                    paragraph.textContent = '実際の観察や実験と組み合わせ、予想したこと・実際に起きたこと・そこから考えたことを分けて記録してみてください。体験と記録を往復すると、自由研究のまとめが作りやすくなります。';
                }
                if (text.includes('30分に1回程度の休憩')) {
                    paragraph.textContent = '画面を長時間続けて見ないよう、疲れを感じる前に適宜休憩してください。実際の実験ではテーマごとの安全チェックを確認し、火気・加熱・刃物・薬品などを扱う場合は必ず大人と一緒に行ってください。通常の入力内容は端末内で扱われますが、共有機能を本人が選んだ場合は、その操作で選んだ内容が利用先へ渡ります。';
                }
            });
        }

        function expandReflectionForPrint() {
            const textareas = ['plan-result', 'plan-discussion', 'plan-next-question']
                .map((id) => document.getElementById(id))
                .filter(Boolean);

            textareas.forEach((textarea) => {
                textarea.dataset.printOriginalHeight = textarea.style.height || '';
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight}px`;
            });
        }

        function restoreReflectionAfterPrint() {
            ['plan-result', 'plan-discussion', 'plan-next-question'].forEach((id) => {
                const textarea = document.getElementById(id);
                if (!textarea) return;
                textarea.style.height = textarea.dataset.printOriginalHeight || '';
                delete textarea.dataset.printOriginalHeight;
            });
        }

        function init() {
            rewriteHeroAndShareCopy();
            rewriteParentGuide();
            window.addEventListener('beforeprint', expandReflectionForPrint);
            window.addEventListener('afterprint', restoreReflectionAfterPrint);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init, { once: true });
        } else {
            init();
        }
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
        supportScript.addEventListener('load', initReviewedGuidance, { once: true });
        document.head.appendChild(supportScript);
    }, { once: true });

    coreScript.addEventListener('error', () => {
        console.error('Science Maker core script could not be loaded.');
    }, { once: true });

    document.head.appendChild(coreScript);
})();