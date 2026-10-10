/*
 * PikaLab - 夏休みの宿題入口
 * 7〜8月だけ、既存トップのヒーロー直下に小さな季節導線を表示する。
 */
(function initSummerHomeworkModule(globalScope) {
    'use strict';

    const SECTION_ID = 'summer-homework-entry';
    const SUMMER_MONTHS = new Set([6, 7]); // Date#getMonth(): 6=July, 7=August

    function isSummerHomeworkSeason(date = new Date()) {
        return date instanceof Date
            && Number.isFinite(date.getTime())
            && SUMMER_MONTHS.has(date.getMonth());
    }

    function buildSummerHomeworkSection(doc) {
        const section = doc.createElement('section');
        section.id = SECTION_ID;
        section.className = 'hidden mb-8';
        section.setAttribute('aria-labelledby', 'summer-homework-title');
        section.innerHTML = `
            <div class="bg-gradient-to-br from-amber-50 via-white to-sky-50 border-2 border-amber-100 rounded-3xl p-5 md:p-6 shadow-sm">
                <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-5">
                    <div>
                        <p class="text-xs font-black text-amber-500 mb-1 flex items-center gap-1">
                            <span class="material-symbols-rounded text-base" aria-hidden="true">sunny</span>
                            夏休みおたすけコーナー
                        </p>
                        <h3 id="summer-homework-title" class="text-xl md:text-2xl font-black text-slate-800">🌻 夏休みの宿題、ここから進めよう</h3>
                        <p class="text-sm text-slate-500 font-bold mt-1">答えを作るのではなく、自分で仕上げるための「考える・まとめる」をお手伝いするよ。</p>
                    </div>
                    <p class="text-[11px] text-slate-400 font-bold md:text-right">提出形式は学校の指示を優先してね。</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <a href="science_maker/" class="group bg-white border-2 border-emerald-100 hover:border-emerald-300 rounded-2xl p-4 flex items-start gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <span class="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                            <span class="material-symbols-rounded text-2xl" aria-hidden="true">science</span>
                        </span>
                        <span class="min-w-0">
                            <strong class="block text-slate-800 font-black mb-1 group-hover:text-emerald-700">🔬 自由研究</strong>
                            <span class="block text-xs md:text-sm text-slate-500 font-bold leading-relaxed">テーマ探しから、予想・方法・結果・考察の研究メモまで。</span>
                        </span>
                    </a>

                    <a href="book_report/" class="group bg-white border-2 border-sky-100 hover:border-sky-300 rounded-2xl p-4 flex items-start gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <span class="w-11 h-11 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                            <span class="material-symbols-rounded text-2xl" aria-hidden="true">auto_stories</span>
                        </span>
                        <span class="min-w-0">
                            <strong class="block text-slate-800 font-black mb-1 group-hover:text-sky-700">📚 読書感想文</strong>
                            <span class="block text-xs md:text-sm text-slate-500 font-bold leading-relaxed">自分の感想を見つけて、書くための構成メモを作ろう。</span>
                        </span>
                    </a>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a href="focus_studio/" class="bg-white/80 hover:bg-white border border-orange-100 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-bold text-slate-600 transition-colors">
                        <span class="material-symbols-rounded text-orange-500" aria-hidden="true">timer</span>
                        <span><strong class="text-slate-700">集中スタジオ</strong> — タイマーで少しずつ進める</span>
                    </a>
                    <a href="paper_gen/" class="bg-white/80 hover:bg-white border border-indigo-100 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-bold text-slate-600 transition-colors">
                        <span class="material-symbols-rounded text-indigo-500" aria-hidden="true">description</span>
                        <span><strong class="text-slate-700">用紙メーカー</strong> — 原稿用紙・方眼紙などを用意</span>
                    </a>
                </div>
            </div>
        `;
        return section;
    }

    function mountSummerHomeworkEntry(options = {}) {
        const doc = options.document || globalScope.document;
        const date = options.date || new Date();
        if (!doc || !isSummerHomeworkSeason(date)) return false;
        if (doc.getElementById(SECTION_ID)) return true;

        const hero = doc.getElementById('hero-section');
        if (!hero || !hero.parentNode) return false;

        const section = buildSummerHomeworkSection(doc);
        hero.insertAdjacentElement('afterend', section);
        section.classList.remove('hidden');
        return true;
    }

    if (globalScope.document) {
        const start = () => mountSummerHomeworkEntry();
        if (globalScope.document.readyState === 'loading') {
            globalScope.document.addEventListener('DOMContentLoaded', start, { once: true });
        } else {
            start();
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            SECTION_ID,
            isSummerHomeworkSeason,
            buildSummerHomeworkSection,
            mountSummerHomeworkEntry
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
