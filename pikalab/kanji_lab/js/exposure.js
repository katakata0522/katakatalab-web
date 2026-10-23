// --- KANJI LAB EXPOSURE POLICY ---
(function () {
    'use strict';

    const Data = window.KanjiLabData;
    const Roles = window.KanjiLabRoles;
    if (!Data || !Roles) return;

    let quizExposure = 'default'; // 'default' | 'full'

    function whenAppReady(callback) {
        const run = () => {
            if (window.App) callback(window.App);
            else setTimeout(run, 0);
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run, { once: true });
        } else {
            run();
        }
    }

    // 固定カタログごとに一度だけ絞る。共有Dataは常にフルカタログのまま。
    const defaultPools = new WeakMap();
    function defaultPool(entries) {
        if (!defaultPools.has(entries)) defaultPools.set(entries, Roles.getDefaultQuizPool(entries));
        return defaultPools.get(entries);
    }

    function getPool(mode, exposure = quizExposure) {
        const entries = mode === 'lr' ? Data.KANJI_LR : mode === 'ud' ? Data.KANJI_UD : Data.KANJI_ALL;
        return exposure === 'full' ? entries : defaultPool(entries);
    }

    function getCounts() {
        const tiers = Roles.getTierCounts(Data.KANJI_ALL);
        return {
            standard: tiers.standard,
            discovery: tiers.discovery,
            deep: tiers.deep,
            default: tiers.standard + tiers.discovery,
            full: Data.KANJI_ALL.length
        };
    }

    function updateHelpCopy() {
        const help = document.getElementById('help-content');
        if (!help) return;
        const sections = Array.from(help.querySelectorAll('h3'));
        const quiz = sections.find(h => h.textContent.includes('クイズモード'));
        if (!quiz?.nextElementSibling) return;

        const counts = getCounts();
        quiz.nextElementSibling.textContent = `「がったい」と「ぶんかい」の2つのモードで遊べるよ。基本・応用・上下・今日のお題は${counts.default}字の通常プールから出題。全問コースでは${counts.full}字すべてが対象で、深い発見の漢字にも挑戦できるよ！`;
    }

    function decorateAllCourseCard() {
        const grid = document.getElementById('courses-grid');
        if (!grid) return;
        const card = Array.from(grid.querySelectorAll(':scope > button'))
            .find(button => button.querySelector('h3')?.textContent.includes('全問コース'));
        if (!card || card.dataset.exposureDecorated === 'true') return;

        const counts = getCounts();
        card.dataset.exposureDecorated = 'true';
        const heading = card.querySelector('h3');
        const description = card.querySelector('p');
        if (heading) {
            const badge = document.createElement('span');
            badge.className = 'ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 align-middle text-[10px] font-black text-indigo-700';
            badge.textContent = '🔭 深い発見あり';
            heading.appendChild(badge);
        }
        if (description) {
            description.textContent = `${counts.full}字すべてからランダムに10問。普段のコースでは出にくい深い発見の漢字も含むよ！`;
        }
    }

    function patchApp(App) {
        if (App.__kanjiExposurePatched) return;
        App.__kanjiExposurePatched = true;

        if (App.quiz?.startCourse) {
            const originalStartCourse = App.quiz.startCourse.bind(App.quiz);
            App.quiz.startCourse = function (courseId, ...rest) {
                // 「全問」は名前どおりフルカタログ。その他は deep を通常出題から外す。
                quizExposure = courseId === 'all' ? 'full' : 'default';
                return originalStartCourse(courseId, ...rest);
            };
        }

        if (App.daily?.startDailyChallenge) {
            const originalStartDaily = App.daily.startDailyChallenge.bind(App.daily);
            App.daily.startDailyChallenge = function (...args) {
                quizExposure = 'default';
                return originalStartDaily(...args);
            };
        }

        if (App.ui?.renderCourses) {
            const originalRenderCourses = App.ui.renderCourses.bind(App.ui);
            App.ui.renderCourses = function (...args) {
                const result = originalRenderCourses(...args);
                decorateAllCourseCard();
                return result;
            };
        }
    }

    function init(App) {
        patchApp(App);
        updateHelpCopy();
        decorateAllCourseCard();
    }

    window.KanjiLabExposure = Object.freeze({
        defaultPool,
        getPool,
        getDefaultCounts: function () {
            return {
                lr: defaultPool(Data.KANJI_LR).length,
                ud: defaultPool(Data.KANJI_UD).length,
                all: defaultPool(Data.KANJI_ALL).length,
                full: Data.KANJI_ALL.length
            };
        },
        getTierCounts: getCounts,
        getQuizExposure: function () { return quizExposure; }
    });

    whenAppReady(init);
})();
