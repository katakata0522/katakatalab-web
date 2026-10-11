// --- KANJI LAB MAIN APPLICATION ---
(function () {
    // データおよびオーディオモジュールへのショートカット
    const Data = window.KanjiLabData;
    const Audio = window.KanjiLabAudio;

    // 定数定義
    const STORAGE_KEY = 'pikalab_kanji_progress';
    const CLASS_SHINING = 'shining-card';
    const catalogByKanji = new Map(Data.KANJI_ALL.map(entry => [entry.k, entry]));
    const verticalKanji = new Set(Data.KANJI_UD.map(entry => entry.k));

    // 出題用の絞り込みで、図鑑・ラボ共用のカタログを書き換えない。
    function getQuizPool(mode, exposure) {
        if (window.KanjiLabExposure?.getPool) return window.KanjiLabExposure.getPool(mode, exposure);
        return mode === 'lr' ? Data.KANJI_LR : mode === 'ud' ? Data.KANJI_UD : Data.KANJI_ALL;
    }

    // DOMキャッシュオブジェクト
    const dom = {};

    // 内部状態
    const col = new Set();

    // 音・訓を綺麗にフォーマットするヘルパー関数
    function formatReading(match) {
        const parts = [];
        if (match.on) parts.push(`音：${match.on}`);
        if (match.kun) parts.push(`訓：${match.kun}`);
        return parts.length > 0 ? parts.join('　') : match.y;
    }
    let selectedL = null;
    let selectedR = null;
    let currentLabMode = 'lr';

    // コース定義
    const COURSES = [
        { id: 'basic', name: '基本コース', desc: '基本のへん・つくり（木・日・言・氵・土・亻・女・口）', parts: ['木', '日', '言', '氵', '土', '亻', '女', '口'], type: 'lr' },
        { id: 'advanced', name: '応用コース', desc: '発展のへん・つくり（魚・金・扌・糸・忄・礻・彳・飠）', parts: ['魚', '金', '扌', '糸', '忄', '礻', '彳', '飠'], type: 'lr' },
        { id: 'vertical', name: '上下コース', desc: '上下合体の漢字（宀・竹・雨・艹・尸・亡・日）', parts: ['宀', '竹', '雨', '艹', '尸', '亡', '日'], type: 'ud' },
        { id: 'all', name: '全問コース', desc: 'すべての漢字からランダムに10問出題するよ！', parts: null, type: 'all' }
    ];

    // 類似するへん・かんむり（左・上パーツ）のグループ
    const SIMILAR_L = [
        ['氵', '彳', '忄', '礻', '亻'],
        ['木', '扌', '礻'],
        ['土', '士', '工'],
        ['口', '日', '目'],
        ['宀', '艹', '雨', '竹'],
        ['魚', '飠'],
        ['金', '木'],
        ['亡', '尸']
    ];

    // 類似するつくり・あし（右・下パーツ）のグループ
    const SIMILAR_R = [
        ['青', '昔', '云', '生', '良'],
        ['古', '吉', '舌', '同', '吾', '可', '司'],
        ['由', '申', '里', '旦', '本', '去'],
        ['未', '末'],
        ['弱', '羊', '半'],
        ['包', '毎', '皮', '交'],
        ['寺', '時', '侍', '持', '待'],
        ['反', '少', '也']
    ];

    let gameMode = null; // 'combine' or 'decompose'
    let quizPool = [];
    let currentQuizIndex = 0;
    let currentQuiz = null;
    let isAwaitingAnswer = false;
    let sessionFinished = true;
    let dailyQuizDate = null;
    let activeTab = 'lab';
    let qL = null;
    let qR = null;

    // クイズ用セーブデータ
    let quizScores = {};
    let quizStars = {};

    // 現在のクイズセッションの状態
    let currentCourseId = null;
    let currentCourse = null;
    let currentScore = 0;
    let currentCombo = 0;
    let mistakes = 0;
    let currentTheme = 'default';

    // 設定の初期状態
    let configAssist = true;
    let configFurigana = false;

    // デイリーお題モード用の状態
    let dailyClearHistory = []; // クリアした日付の配列
    let dailyBestTimes = {};    // 日付ごとのベストタイム（秒）
    let isDailyChallenge = false;
    let dailyStartTime = 0;
    let dailyElapsedTime = 0; // 経過ミリ秒
    let dailyTimerInterval = null;

    // キラカード用の状態
    const shiningKanji = new Set(); // キラカード化された漢字のセット

    // 称号・チケット・にがてノート用状態
    let holoTickets = 0;
    const unlockedTitles = new Set(['合体ビギナー']);
    const unlockedThemes = new Set(['default']);
    let selectedTitle = '合体ビギナー';
    let wrongKanjiList = [];
    let lastRewardedStreakDate = '';
    let currentRunMistakes = [];
    let lastMeaningPrefix = '';
    let lastMeaningRaw = '';

    // 称号の定義一覧
    const TITLES_CONFIG = [
        { id: 'beginner', name: '合体ビギナー', desc: 'はじめの一歩！', unlock: () => true },
        { id: 'mania', name: '合体マニア', desc: '図鑑に10文字集める', unlock: () => col.size >= 10 },
        { id: 'master', name: '合体マスター', desc: '図鑑に50文字集める', unlock: () => col.size >= 50 },
        { id: 'legend', name: '合体レジェンド', desc: '図鑑に100文字集める', unlock: () => col.size >= 100 },
        { id: 'shiny_collector', name: 'キラコレクター', desc: 'キラカードを5枚集める', unlock: () => shiningKanji.size >= 5 },
        { id: 'shiny_master', name: 'キラマスター', desc: 'キラカードを15枚集める', unlock: () => shiningKanji.size >= 15 },
        { id: 'quiz_fighter', name: 'クイズファイター', desc: '通常クイズをクリアする', unlock: () => Object.keys(quizScores).length >= 1 },
        { id: 'quiz_expert', name: 'クイズの達人', desc: 'いずれかのクイズで1000点以上とる', unlock: () => Object.values(quizScores).some(s => s >= 1000) },
        { id: 'daily_runner', name: 'デイリーランナー', desc: '今日のお題を1回クリアする', unlock: () => dailyClearHistory.length >= 1 },
        { id: 'speedstar', name: 'スピードスター', desc: '今日のお題を20秒未満でクリアする', unlock: () => Object.values(dailyBestTimes).some(t => t < 20) },
        { id: 'stamp_collector', name: 'スタンプコレクター', desc: 'スタンプが合計3個以上たまる', unlock: () => dailyClearHistory.length >= 3 }
    ];

    function getTodayString() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const r = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${r}`;
    }

    function seedRandom(seed) {
        let s = seed;
        return function () {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    // 簡易ふりがな置換辞書 (教育用)
    const RUBY_DICT = {
        '一年中': 'いちねんじゅう',
        '緑': 'みどり',
        '学校': 'がっこう',
        '集まって': 'あつまって',
        '住む': 'すむ',
        'お互い': 'おたがい',
        '相手': 'あいて',
        '元気': 'げんき',
        '湿気': 'しっけ',
        '使われる': 'つかわれる',
        '果物': 'くだもの',
        '将棋': 'しょうぎ',
        '工芸品': 'こうげいひん',
        '植物': 'しょくぶつ',
        '冬至': 'とうじ',
        'お風呂': 'おふろ',
        '言葉': 'ことば',
        '手紙': 'てがみ',
        '荷物': 'にもつ',
        '地面': 'じめん',
        'お殿様': 'おとのさま',
        '条件': 'じょうけん',
        '一時的': 'いちじてき',
        '仮定': 'かてい',
        '訪問': 'ほうもん',
        '記録': 'きろく',
        '要請': 'ようせい',
        '歌詞': 'かし',
        '台詞': 'せりふ',
        '良し悪し': 'よしあし',
        '裁判': 'さいばん',
        '暗記': 'あんき',
        '隙間': 'すきま',
        '西洋': 'せいよう',
        '注意': 'ちゅうい',
        '生活': 'せいかつ',
        '悲しい': 'かなしい',
        '痛み': 'いたみ',
        '港': 'みなと',
        '燃料': 'ねんりょう',
        '生命力': 'せいめいりょく',
        '高級': 'こうきゅう',
        '金属': 'きんぞく',
        '雅楽': 'ががく',
        '管楽器': 'かんがっき',
        '結晶': 'けっしょう',
        '芸能': 'げいのう',
        '中心部分': 'ちゅうしんぶぶん',
        '妄想': 'もうそう',
        '宇宙': 'うちゅう',
        '安心': 'あんしん',
        '値段': 'ねだん',
        '価値': 'かち',
        // --- 設定UI・ヒント文用 ---
        '合体': 'がったい',
        '相棒': 'あいぼう',
        '解説': 'かいせつ',
        '漢字': 'かんじ',
        '表示': 'ひょうじ',
        // --- 追加拡張単語 ---
        '不思議': 'ふしぎ',
        '予想': 'よそう',
        '俳優': 'はいゆう',
        '俳句': 'はいく',
        '傾斜': 'けいしゃ',
        '勲章': 'くんしょう',
        '反省': 'はんせい',
        '哺乳類': 'ほにゅうるい',
        '商売': 'しょうばい',
        '土地': 'とち',
        '地中': 'ちちゅう',
        '大衆魚': 'たいしゅうぎょ',
        '娯楽': 'ごらく',
        '実用的': 'じつようてき',
        '居間': 'いま',
        '情報': 'じょうほう',
        '挽回': 'ばんかい',
        '排除': 'はいじょ',
        '放浪': 'ほうろう',
        '整理': 'せいり',
        '文章': 'ぶんしょう',
        '新鮮': 'しんせん',
        '時間': 'じかん',
        '期待': 'きたい',
        '果実': 'かじつ',
        '柴犬': 'しばいぬ',
        '根拠': 'こんきょ',
        '植木鉢': 'うえきばち',
        '楽器': 'がっき',
        '武士': 'ぶし',
        '歴史': 'れきし',
        '評判': 'ひょうばん',
        '責任': 'せきにん',
        '王朝': 'おうちょう',
        '道理': 'どうり',
        '酸味': 'さんみ',
        '衣服': 'いふく',
        '神仏': 'しんぶつ',
        '祝賀': 'しゅくが',
        '紡績': 'ぼうせき',
        '維持': 'いじ',
        '縁起': 'えんぎ',
        '繊維': 'せんい',
        '淡水魚': 'たんすいぎょ',
        '雑巾': 'ぞうきん',
        '雑木': 'ぞうき',
        '大型': 'おおがた',
        '休憩': 'きゅうけい',
        '動物': 'どうぶつ',
        '燃料': 'ねんりょう',
        '料理': 'りょうり',
        '神社': 'じんじゃ',
        '神様': 'かみさま',
        '稲': 'いね',
        '田植え': 'たうえ'
    };

    // 語順と正規表現は固定なので、表示のたびに作り直さない。
    const rubyPatterns = Object.entries(RUBY_DICT)
        .sort((a, b) => b[0].length - a[0].length)
        .map(([kanji, ruby]) => [new RegExp(kanji, 'g'), `<ruby>${kanji}<rt>${ruby}</rt></ruby>`]);

    // ルビ置換ヘルパー
    function applyFurigana(text) {
        if (!configFurigana) return text;
        let result = text;
        
        for (const [regex, markup] of rubyPatterns) {
            // すでに置換されたrubyタグで分割し、その外側（平文）部分だけを置換することで入れ子を防ぐ
            const parts = result.split(/(<ruby>[^]*?<\/ruby>)/g);
            for (let i = 0; i < parts.length; i++) {
                if (!parts[i].startsWith('<ruby>')) {
                    parts[i] = parts[i].replace(regex, markup);
                }
            }
            result = parts.join('');
        }
        return result;
    }

    // デイリータイマーの一時停止・再開制御ヘルパー
    function resumeDailyTimer() {
        if (document.hidden || activeTab !== 'game' || !isDailyChallenge || !isAwaitingAnswer) return;
        if (dailyTimerInterval) clearInterval(dailyTimerInterval);
        dailyStartTime = Date.now() - dailyElapsedTime;
        dailyTimerInterval = setInterval(() => {
            dailyElapsedTime = Date.now() - dailyStartTime;
            const seconds = dailyElapsedTime / 1000;
            const timerEl = dom.quizCurrentTime;
            if (timerEl) {
                timerEl.textContent = seconds.toFixed(2);
            }
        }, 50);
    }

    function pauseDailyTimer() {
        if (dailyTimerInterval) {
            dailyElapsedTime = Date.now() - dailyStartTime;
            clearInterval(dailyTimerInterval);
            dailyTimerInterval = null;
        }
    }

    // プライベートシャッフルヘルパー
    function _shuffle(arr) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    // スマート選択肢生成ヘルパー
    function getSmartChoices(target, side, fullPool) {
        const groups = side === 'left' ? SIMILAR_L : SIMILAR_R;
        let candidates = [];
        
        // 類似グループを検索
        for (const group of groups) {
            if (group.includes(target)) {
                // target 以外の類似パーツを抽出
                candidates = group.filter(p => p !== target && fullPool.includes(p));
                break;
            }
        }
        
        // 候補をシャッフル
        candidates = _shuffle(candidates).slice(0, 3);
        
        // 不足分を補填
        if (candidates.length < 3) {
            const remaining = fullPool.filter(p => p !== target && !candidates.includes(p));
            const fill = _shuffle(remaining).slice(0, 3 - candidates.length);
            candidates = candidates.concat(fill);
        }
        
        // 正解を混ぜてシャッフル
        return _shuffle([target, ...candidates]);
    }

    // パーティクルエフェクト生成ヘルパー
    function createExplosion(parentEl) {
        if (!parentEl) return;
        const rect = parentEl.getBoundingClientRect();
        
        // エフェクト用のコンテナ（body直下に絶対配置）
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = `${rect.left + rect.width / 2}px`;
        container.style.top = `${rect.top + rect.height / 2}px`;
        container.style.pointerEvents = 'none';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
        
        const colors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'];
        const shapes = ['★', '●', '🌸', '✨', '◆', '☀'];
        const numParticles = 24;
        
        for (let i = 0; i < numParticles; i++) {
            const p = document.createElement('span');
            p.className = 'particle';
            
            // ランダムな飛散距離と角度
            const angle = Math.random() * Math.PI * 2;
            const distance = 60 + Math.random() * 100;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;
            
            p.style.setProperty('--dx', `${dx}px`);
            p.style.setProperty('--dy', `${dy}px`);
            
            // 色、形状、サイズ、遅延のランダム設定
            p.style.color = colors[Math.floor(Math.random() * colors.length)];
            p.style.fontSize = `${14 + Math.random() * 12}px`;
            p.textContent = shapes[Math.floor(Math.random() * shapes.length)];
            
            // CSSアニメーションの割り当て
            p.style.position = 'absolute';
            p.style.transform = 'translate(-50%, -50%)';
            p.style.animation = `particle-fly ${0.5 + Math.random() * 0.4}s cubic-bezier(0.15, 0.85, 0.3, 1) forwards`;
            
            container.appendChild(p);
        }
        
        // 1秒後にエフェクトコンテナを自動クリーンアップ
        setTimeout(() => {
            container.remove();
        }, 1000);
    }

    // DOM要素のキャッシュ一括処理ヘルパー
    function cacheElements() {
        const ids = [
            'theme-selector', 'tab-lab', 'tab-game', 'help-btn', 'close-help-btn',
            'help-ok-btn', 'mute-btn', 'mute-icon', 'mode-lr', 'mode-ud',
            'open-collection-btn', 'close-collection-btn', 'close-dict-detail-btn', 'dict-detail-master-btn',
            'dict-detail-modal', 'dict-detail-content', 'help-modal', 'help-content',
            'courses-back-btn', 'quiz-combine-btn', 'quiz-decompose-btn',
            'start-daily-btn', 'quiz-exit-btn', 'open-settings-btn', 'close-settings-btn',
            'settings-ok-btn', 'setting-assist', 'setting-furigana', 'settings-modal',
            'settings-content', 'quiz-submit-btn', 'result-btn', 'stage-clear-menu-btn',
            'header-title-badge', 'close-title-btn', 'title-ok-btn', 'title-modal',
            'title-content', 'open-wrong-btn', 'close-wrong-btn', 'wrong-modal',
            'wrong-panel', 'clear-review-btn', 'clear-review-panel', 'current-title-label',
            'opt-matcha', 'opt-cyber', 'opt-sakura', 'view-lab', 'view-game',
            'setting-assist-desc', 'setting-furigana-desc', 'collection-modal',
            'collection-panel', 'dict-detail-char', 'dict-detail-part1', 'dict-detail-part2',
            'dict-detail-reading', 'dict-detail-meaning', 'dict-detail-no', 'dict-detail-stars',
            'list-p1', 'list-p2', 'label-p1', 'label-p2', 'icon-p1', 'icon-p2',
            'parts-container', 'result-box', 'result-char', 'result-info',
            'result-reading', 'result-meaning', 'use-holo-ticket', 'holo-ticket-label',
            'holo-ticket-count', 'result-sparkle', 'collection-grid', 'selected-game-mode-label',
            'daily-date-label', 'daily-best-time-label', 'daily-stamps-container',
            'courses-grid', 'quiz-score', 'quiz-score-container', 'quiz-time-container-header',
            'quiz-current-time', 'quiz-combo-badge', 'quiz-combo', 'quiz-course-name',
            'quiz-num', 'quiz-timer-container', 'quiz-timer-bar', 'quiz-instruction',
            'quiz-combine-display', 'quiz-target-reading', 'quiz-target-meaning',
            'quiz-target-char', 'quiz-slots-container', 'quiz-choices-left',
            'quiz-choices-right', 'quiz-label-left', 'quiz-label-right', 'game-result',
            'result-title', 'result-icon', 'result-kanji', 'result-detail',
            'stage-clear', 'clear-icon', 'clear-title', 'clear-stars',
            'clear-normal-container', 'clear-score', 'clear-highscore-alert',
            'clear-daily-container', 'clear-daily-time', 'clear-daily-best-info',
            'clear-daily-newbest-alert', 'unlock-toast', 'toast-title-name',
            'wrong-grid', 'title-list-container', 'clear-review-list', 'game-menu',
            'game-courses', 'game-play', 'game-header'
        ];
        ids.forEach(id => {
            const propName = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            dom[propName] = document.getElementById(id);
        });
    }

    // モーダルごとに戻り先とタイマーを持ち、重ねた画面の順序を保つ。
    const modalStates = new Map();
    const modalStack = [];
    const previousInert = new Map();

    function getTopModal() {
        return modalStack[modalStack.length - 1] || null;
    }

    function getModalFocusable(panel) {
        return Array.from(panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]'))
            .filter(element => !element.disabled && element.tabIndex !== -1
                && !element.closest('[hidden], .hidden, [inert], .ux-filtered-out, .ux-collection-hidden'));
    }

    function focusModalState(state) {
        const focusable = getModalFocusable(state.panel);
        const close = focusable.find(element => element.id.startsWith('close-'));
        const target = close || focusable[0] || state.panel;
        if (target === state.panel && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus();
    }

    function syncModalLayers() {
        // この管理処理が変更した属性だけを元に戻す。
        previousInert.forEach((value, element) => {
            if (value === null) element.removeAttribute('inert');
            else element.setAttribute('inert', value);
        });
        previousInert.clear();

        const top = getTopModal();
        if (!top) return;
        // 本文だけでなく、背面のモーダルや後付けの操作バーも操作対象から外す。
        let branch = top.modal;
        while (branch.parentElement && branch.parentElement !== document.documentElement) {
            Array.from(branch.parentElement.children).forEach(sibling => {
                if (sibling === branch || ['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) return;
                previousInert.set(sibling, sibling.getAttribute('inert'));
                sibling.setAttribute('inert', '');
            });
            branch = branch.parentElement;
        }
        modalStack.forEach((state, index) => {
            state.modal.style.zIndex = String(50 + index);
        });
    }

    // 共通モーダル表示制御ヘルパー
    function showModal(modalEl, contentEl, type, labelledBy) {
        if (!modalEl) return;

        let state = modalStates.get(modalEl);
        if (!state) {
            state = { modal: modalEl, panel: contentEl || modalEl, type,
                trigger: document.activeElement, zIndex: modalEl.style.zIndex,
                focusTimer: null, hideTimer: null, closing: false };
            modalStates.set(modalEl, state);
        }
        if (state.focusTimer !== null) clearTimeout(state.focusTimer);
        if (state.hideTimer !== null) clearTimeout(state.hideTimer);
        state.hideTimer = null;
        state.closing = false;
        const previousIndex = modalStack.indexOf(state);
        if (previousIndex !== -1) modalStack.splice(previousIndex, 1);
        modalStack.push(state);

        modalEl.setAttribute('role', 'dialog');
        modalEl.setAttribute('aria-modal', 'true');
        if (labelledBy) modalEl.setAttribute('aria-labelledby', labelledBy);
        modalEl.classList.remove('hidden');
        syncModalLayers();
        void modalEl.offsetWidth; // リフローを強制してアニメーションを有効化
        
        if (type === 'slide') {
            if (contentEl) contentEl.classList.remove('translate-x-full');
        } else if (type !== 'instant') {
            modalEl.classList.remove('opacity-0');
            if (contentEl) {
                contentEl.classList.remove('scale-95');
                contentEl.classList.add('scale-100');
            }
        }

        // 開き直しや別モーダル表示後に、古い予約がフォーカスを奪わない。
        state.focusTimer = setTimeout(() => {
            state.focusTimer = null;
            if (getTopModal() === state && !state.closing) focusModalState(state);
        }, type === 'instant' ? 0 : 50);
    }

    // 共通モーダル非表示制御ヘルパー
    function hideModal(modalEl, contentEl, type) {
        const state = modalEl && modalStates.get(modalEl);
        if (!state || state.closing) return;
        state.closing = true;
        if (state.focusTimer !== null) clearTimeout(state.focusTimer);
        state.focusTimer = null;
        
        if (type === 'slide') {
            if (contentEl) contentEl.classList.add('translate-x-full');
        } else if (type !== 'instant') {
            modalEl.classList.add('opacity-0');
            if (contentEl) {
                contentEl.classList.remove('scale-100');
                contentEl.classList.add('scale-95');
            }
        }
        const complete = () => {
            const wasTop = getTopModal() === state;
            modalEl.classList.add('hidden');
            modalEl.style.zIndex = state.zIndex;
            if (contentEl) contentEl.classList.remove(CLASS_SHINING);
            modalStates.delete(modalEl);
            modalStack.splice(modalStack.indexOf(state), 1);
            // 背面を先に閉じた場合も、その中の消えたボタンへ戻さない。
            modalStack.forEach(other => {
                if (state.modal.contains(other.trigger)) other.trigger = state.trigger;
            });
            syncModalLayers();
            if (!wasTop) return;
            const top = getTopModal();
            const trigger = state.trigger;
            if (trigger?.isConnected && !trigger.disabled
                && !trigger.closest('[hidden], .hidden, [inert], .ux-filtered-out, .ux-collection-hidden')
                && (!top || top.modal.contains(trigger))) {
                trigger.focus();
            } else if (top) {
                focusModalState(top);
            }
        };
        if (type === 'instant') complete();
        else state.hideTimer = setTimeout(complete, 300);
    }

    const App = {
        init: function () {
            cacheElements();
            App.storage.loadProgress();
            App.theme.setTheme(currentTheme);
            App.ui.bindEvents();
            App.lab.setLabMode('lr');
            App.ui.updateCol();
            App.theme.updateThemeSelector();
            App.ui.updateDailyChallengePanel(); // デイリーパネルとスタンプラリーの更新
            App.ui.updateTitleDisplay();
            App.ui.updateHoloTicketUI();
            App.ui.updateMuteButtonUI();
            App.title.checkTitleUnlocks(true); // 静かにアンロック判定
            
            // 設定トグルの同期
            const assistChk = dom.settingAssist;
            if (assistChk) assistChk.checked = configAssist;
            const furiganaChk = dom.settingFurigana;
            if (furiganaChk) furiganaChk.checked = configFurigana;
            
            App.ui.refreshFuriganaDisplays();
        },

        // --- SUBMODULES ---

        // セーブデータ管理
        storage: {
            getCollection: function () { return Array.from(col); },
            loadProgress: function () {
                let saved = null;
                try {
                    saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
                } catch (error) {
                    console.warn('Failed to load progress (falling back to initial):', error);
                }
                const progress = window.KanjiLabProgress.normalizeProgress(saved, Data.KANJI_ALL, TITLES_CONFIG.map(title => title.name));
                const replaceSet = (target, values) => { target.clear(); values.forEach(value => target.add(value)); };
                replaceSet(col, progress.collection);
                replaceSet(shiningKanji, progress.shiningKanji);
                replaceSet(unlockedTitles, progress.unlockedTitles);
                replaceSet(unlockedThemes, progress.unlockedThemes);
                quizScores = progress.quizScores;
                quizStars = progress.quizStars;
                currentTheme = progress.theme;
                configAssist = progress.configAssist;
                configFurigana = progress.configFurigana;
                dailyClearHistory = progress.dailyClearHistory;
                dailyBestTimes = progress.dailyBestTimes;
                holoTickets = progress.holoTickets;
                Audio.setMuted(progress.isMuted);
                selectedTitle = progress.selectedTitle;
                wrongKanjiList = progress.wrongKanjiList;
                lastRewardedStreakDate = progress.lastRewardedStreakDate;
            },

            saveProgress: function () {
                try {
                    const data = {
                        collection: Array.from(col),
                        quizScores: quizScores,
                        quizStars: quizStars,
                        theme: currentTheme,
                        configAssist: configAssist,
                        configFurigana: configFurigana,
                        dailyClearHistory: dailyClearHistory,
                        dailyBestTimes: dailyBestTimes,
                        shiningKanji: Array.from(shiningKanji),
                        holoTickets: holoTickets,
                        unlockedTitles: Array.from(unlockedTitles),
                        unlockedThemes: Array.from(unlockedThemes),
                        isMuted: Audio.getMuted(),
                        selectedTitle: selectedTitle,
                        wrongKanjiList: wrongKanjiList,
                        lastRewardedStreakDate: lastRewardedStreakDate
                    };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                } catch (e) {
                    console.warn('Failed to save progress:', e);
                }
            }
        },

        // テーマ管理
        theme: {
            setTheme: function (themeName) {
                currentTheme = themeName;
                document.body.className = 'min-h-screen flex flex-col selection:bg-orange-200';
                
                if (themeName !== 'default') {
                    document.body.classList.add(`theme-${themeName}`);
                }
                
                const selector = dom.themeSelector;
                if (selector && selector.value !== themeName) {
                    selector.value = themeName;
                }
                
                App.storage.saveProgress();
            },

            updateThemeSelector: function () {
                const count = col.size;
                
                const optMatcha = dom.optMatcha;
                if (optMatcha) {
                    if (count >= 10) {
                        optMatcha.disabled = false;
                        optMatcha.textContent = '🍵 抹茶';
                    } else {
                        optMatcha.disabled = true;
                        optMatcha.textContent = `🔒 抹茶 (${count}/10語)`;
                    }
                }
                
                const optCyber = dom.optCyber;
                if (optCyber) {
                    if (count >= 30) {
                        optCyber.disabled = false;
                        optCyber.textContent = '⚡ サイバー';
                    } else {
                        optCyber.disabled = true;
                        optCyber.textContent = `🔒 サイバー (${count}/30語)`;
                    }
                }

                const optSakura = dom.optSakura;
                if (optSakura) {
                    const streak = App.daily.getStampStreakCount();
                    if (unlockedThemes.has('sakura') || streak >= 7) {
                        optSakura.disabled = false;
                        optSakura.textContent = '🌸 さくら';
                        if (!unlockedThemes.has('sakura')) {
                            unlockedThemes.add('sakura');
                            App.storage.saveProgress();
                        }
                    } else {
                        optSakura.disabled = true;
                        optSakura.textContent = `🔒 さくら (スタンプ ${streak}/7個)`;
                    }
                }
            }
        },

        // 画面表示・モーダル・イベント連携
        ui: {
            bindEvents: function () {
                App.ui.bindHeaderEvents();
                App.ui.bindLabEvents();
                App.ui.bindQuizEvents();
                App.ui.bindGlobalEvents();
            },

            bindHeaderEvents: function () {
                if (dom.themeSelector) {
                    dom.themeSelector.addEventListener('change', (e) => {
                        App.theme.setTheme(e.target.value);
                    });
                }
                if (dom.tabLab) dom.tabLab.addEventListener('click', () => App.ui.switchTab('lab'));
                if (dom.tabGame) dom.tabGame.addEventListener('click', () => App.ui.switchTab('game'));
                if (dom.openSettingsBtn) dom.openSettingsBtn.addEventListener('click', () => App.ui.openSettings());
                if (dom.helpBtn) dom.helpBtn.addEventListener('click', () => App.ui.openHelp());
                if (dom.muteBtn) dom.muteBtn.addEventListener('click', () => App.ui.toggleMute());
                if (dom.headerTitleBadge) dom.headerTitleBadge.addEventListener('click', () => App.ui.openTitleModal());
            },

            bindLabEvents: function () {
                if (dom.modeLr) dom.modeLr.addEventListener('click', () => App.lab.setLabMode('lr'));
                if (dom.modeUd) dom.modeUd.addEventListener('click', () => App.lab.setLabMode('ud'));
                if (dom.openCollectionBtn) dom.openCollectionBtn.addEventListener('click', () => App.ui.toggleCollection());
                if (dom.closeCollectionBtn) dom.closeCollectionBtn.addEventListener('click', () => App.ui.toggleCollection());
                if (dom.openWrongBtn) dom.openWrongBtn.addEventListener('click', () => App.ui.openWrongModal());
                if (dom.closeWrongBtn) dom.closeWrongBtn.addEventListener('click', () => App.ui.closeWrongModal());
            },

            bindQuizEvents: function () {
                if (dom.coursesBackBtn) dom.coursesBackBtn.addEventListener('click', () => App.quiz.exitGame());
                if (dom.quizCombineBtn) dom.quizCombineBtn.addEventListener('click', () => App.quiz.startGame('combine'));
                if (dom.quizDecomposeBtn) dom.quizDecomposeBtn.addEventListener('click', () => App.quiz.startGame('decompose'));
                if (dom.startDailyBtn) dom.startDailyBtn.addEventListener('click', () => App.daily.startDailyChallenge());
                if (dom.quizExitBtn) dom.quizExitBtn.addEventListener('click', () => App.quiz.exitToCourses());
                if (dom.quizSubmitBtn) dom.quizSubmitBtn.addEventListener('click', () => App.quiz.checkQuiz());
                if (dom.resultBtn) dom.resultBtn.addEventListener('click', () => App.quiz.nextQuiz());
                if (dom.stageClearMenuBtn) dom.stageClearMenuBtn.addEventListener('click', () => App.quiz.exitToCourses());
                
                if (dom.clearReviewBtn) {
                    dom.clearReviewBtn.addEventListener('click', () => {
                        Audio.playSound('select');
                        if (dom.clearReviewPanel) {
                            dom.clearReviewPanel.classList.toggle('hidden');
                        }
                    });
                }
            },

            bindGlobalEvents: function () {
                if (dom.closeHelpBtn) dom.closeHelpBtn.addEventListener('click', () => App.ui.closeHelp());
                if (dom.helpOkBtn) dom.helpOkBtn.addEventListener('click', () => App.ui.closeHelp());
                if (dom.helpModal) {
                    dom.helpModal.addEventListener('click', (e) => {
                        if (e.target === dom.helpModal) App.ui.closeHelp();
                    });
                }

                if (dom.closeDictDetailBtn) dom.closeDictDetailBtn.addEventListener('click', () => App.ui.closeDictDetail());
                if (dom.dictDetailMasterBtn) {
                    dom.dictDetailMasterBtn.addEventListener('click', () => {
                        const kanji = dom.dictDetailMasterBtn.dataset.kanji;
                        if (kanji) {
                            App.wrong.masterKanji(kanji);
                            App.ui.closeDictDetail();
                        }
                    });
                }
                if (dom.dictDetailModal) {
                    dom.dictDetailModal.addEventListener('click', (e) => {
                        if (e.target === dom.dictDetailModal) App.ui.closeDictDetail();
                    });
                }

                if (dom.closeSettingsBtn) dom.closeSettingsBtn.addEventListener('click', () => App.ui.closeSettings());
                if (dom.settingsOkBtn) dom.settingsOkBtn.addEventListener('click', () => App.ui.closeSettings());
                if (dom.settingsModal) {
                    dom.settingsModal.addEventListener('click', (e) => {
                        if (e.target === dom.settingsModal) App.ui.closeSettings();
                    });
                }

                if (dom.closeTitleBtn) dom.closeTitleBtn.addEventListener('click', () => App.ui.closeTitleModal());
                if (dom.titleOkBtn) dom.titleOkBtn.addEventListener('click', () => App.ui.closeTitleModal());
                if (dom.titleModal) {
                    dom.titleModal.addEventListener('click', (e) => {
                        if (e.target === dom.titleModal) App.ui.closeTitleModal();
                    });
                }

                if (dom.wrongModal) {
                    dom.wrongModal.addEventListener('click', (e) => {
                        if (e.target === dom.wrongModal) App.ui.closeWrongModal();
                    });
                }

                // トグルイベントの同期
                if (dom.settingAssist) {
                    dom.settingAssist.addEventListener('change', (e) => {
                        configAssist = e.target.checked;
                        App.storage.saveProgress();
                        App.ui.updatePartButtonsAssist();
                    });
                }
                if (dom.settingFurigana) {
                    dom.settingFurigana.addEventListener('change', (e) => {
                        configFurigana = e.target.checked;
                        App.storage.saveProgress();
                        App.ui.refreshFuriganaDisplays();
                    });
                }

                // 最前面だけを閉じ、Tab の移動も同じモーダル管理に集約する。
                document.addEventListener('keydown', (e) => {
                    const state = getTopModal();
                    if (!state || e.defaultPrevented) return;
                    if (e.key === 'Escape') {
                        // クイズは「つぎへ」「コース選択にもどる」でのみ進める。
                        if (state.type === 'instant') return;
                        e.preventDefault();
                        hideModal(state.modal, state.panel, state.type);
                        return;
                    }
                    if (e.key !== 'Tab') return;
                    const focusable = getModalFocusable(state.panel);
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    if (!first || !focusable.includes(document.activeElement)) {
                        e.preventDefault();
                        if (e.shiftKey && last) last.focus();
                        else focusModalState(state);
                    } else if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                });

                // 初回操作でオーディオを安全にアクティベートするフック
                document.body.addEventListener('click', () => {
                    Audio.triggerInit();
                }, { once: true });

                // タブ切り替え時にタイマーを一時停止・再開するホスピタリティ制御
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) {
                        if (isDailyChallenge) {
                            pauseDailyTimer();
                        }
                    } else {
                        if (isDailyChallenge && isAwaitingAnswer) {
                            resumeDailyTimer();
                        }
                    }
                });
            },

            switchTab: function (tab) {
                activeTab = tab;
                if (tab === 'lab') pauseDailyTimer();
                Audio.playSound('select');
                const l = dom.viewLab;
                const g = dom.viewGame;
                const tl = dom.tabLab;
                const tg = dom.tabGame;
                if (tab === 'lab') {
                    if (l) l.classList.remove('hidden');
                    if (g) g.classList.add('hidden');
                    if (tl) tl.className = 'tab-btn tab-btn-active';
                    if (tg) tg.className = 'tab-btn tab-btn-inactive';
                } else {
                    if (l) l.classList.add('hidden');
                    if (g) g.classList.remove('hidden');
                    if (tl) tl.className = 'tab-btn tab-btn-inactive';
                    if (tg) tg.className = 'tab-btn tab-btn-active';
                    App.quiz.exitGame();
                }
            },

            openHelp: function () {
                Audio.playSound('select');
                showModal(dom.helpModal, dom.helpContent, 'scale');
            },

            closeHelp: function () {
                hideModal(dom.helpModal, dom.helpContent, 'scale');
            },

            openSettings: function () {
                Audio.playSound('select');
                showModal(dom.settingsModal, dom.settingsContent, 'scale');
            },

            closeSettings: function () {
                hideModal(dom.settingsModal, dom.settingsContent, 'scale');
            },

            updatePartButtonsAssist: function () {
                const listP1 = dom.listP1;
                const listP2 = dom.listP2;
                if (!listP1 || !listP2) return;
                
                const btns1 = listP1.querySelectorAll('button');
                const btns2 = listP2.querySelectorAll('button');
                
                if (!configAssist) {
                    btns1.forEach(b => b.classList.remove('opacity-30', 'pointer-events-none'));
                    btns2.forEach(b => b.classList.remove('opacity-30', 'pointer-events-none'));
                    return;
                }
                
                const pool = currentLabMode === 'lr' ? Data.KANJI_LR : Data.KANJI_UD;

                // 左リストのフィルタリング
                if (selectedR) {
                    const validL = pool.filter(k => k.r === selectedR).map(k => k.l);
                    btns1.forEach(b => {
                        const char = b.textContent;
                        if (validL.includes(char)) {
                            b.classList.remove('opacity-30', 'pointer-events-none');
                        } else {
                            b.classList.add('opacity-30', 'pointer-events-none');
                        }
                    });
                } else {
                    btns1.forEach(b => b.classList.remove('opacity-30', 'pointer-events-none'));
                }
                
                // 右リストのフィルタリング
                if (selectedL) {
                    const validR = pool.filter(k => k.l === selectedL).map(k => k.r);
                    btns2.forEach(b => {
                        const char = b.textContent;
                        if (validR.includes(char)) {
                            b.classList.remove('opacity-30', 'pointer-events-none');
                        } else {
                            b.classList.add('opacity-30', 'pointer-events-none');
                        }
                    });
                } else {
                    btns2.forEach(b => b.classList.remove('opacity-30', 'pointer-events-none'));
                }
            },

            refreshFuriganaDisplays: function () {
                if (dom.resultMeaning && lastMeaningRaw) {
                    dom.resultMeaning.innerHTML = `${lastMeaningPrefix}${applyFurigana(lastMeaningRaw)}`;
                }
                if (currentQuiz && dom.gamePlay && !dom.gamePlay.classList.contains('hidden')) {
                    const dispCombine = dom.quizCombineDisplay;
                    if (dispCombine && !dispCombine.classList.contains('hidden')) {
                        if (dom.quizTargetMeaning) dom.quizTargetMeaning.innerHTML = applyFurigana(currentQuiz.m);
                    }
                }
                // 設定説明文のルビ動的切り替え
                const assistDesc = dom.settingAssistDesc;
                if (assistDesc) {
                    assistDesc.innerHTML = configFurigana 
                        ? applyFurigana('合体できる相棒のパーツだけを光らせて教えるよ！') 
                        : '合体できる相棒のパーツだけを光らせて教えるよ！';
                }
                const furiganaDesc = dom.settingFuriganaDesc;
                if (furiganaDesc) {
                    furiganaDesc.innerHTML = configFurigana 
                        ? applyFurigana('解説文の漢字にふりがなを表示するよ！') 
                        : '解説文の漢字にふりがなを表示するよ！';
                }
            },

            toggleCollection: function () {
                Audio.playSound('select');
                if (dom.collectionModal.classList.contains('hidden')) {
                    showModal(dom.collectionModal, dom.collectionPanel, 'slide');
                } else {
                    hideModal(dom.collectionModal, dom.collectionPanel, 'slide');
                }
            },

            openDictDetail: function (kanji) {
                Audio.playSound('select');
                const match = catalogByKanji.get(kanji);
                if (!match) return;

                const charEl = dom.dictDetailChar;
                const okuriganaMatch = match.kun ? match.kun.match(/（([^）]+)）/) : null;
                const okurigana = okuriganaMatch ? okuriganaMatch[1] : '';
                if (okurigana && charEl) {
                    charEl.innerHTML = `${match.k}<span class="text-4xl font-fude text-orange-500 ml-1 select-none">${okurigana}</span>`;
                    charEl.className = 'text-8xl font-fude text-orange-600 my-2 flex items-baseline justify-center w-full';
                } else if (charEl) {
                    charEl.textContent = match.k;
                    charEl.className = 'text-8xl font-fude text-orange-600 my-2';
                }

                if (dom.dictDetailPart1) dom.dictDetailPart1.textContent = match.l;
                if (dom.dictDetailPart2) dom.dictDetailPart2.textContent = match.r;
                if (dom.dictDetailReading) dom.dictDetailReading.textContent = formatReading(match);
                if (dom.dictDetailMeaning) dom.dictDetailMeaning.innerHTML = applyFurigana(match.m);

                // No. と レア度 (星) の反映
                const index = Data.KANJI_ALL.indexOf(match) + 1;
                if (dom.dictDetailNo) dom.dictDetailNo.textContent = `No. ${String(index).padStart(3, '0')}`;
                
                const rarity = App.lab.getKanjiRarity(kanji);
                const starsText = '★'.repeat(rarity) + '☆'.repeat(3 - rarity);
                if (dom.dictDetailStars) dom.dictDetailStars.textContent = starsText;

                // キラカード装飾の適用
                const isShiny = shiningKanji.has(kanji);
                if (isShiny && dom.dictDetailContent) {
                    dom.dictDetailContent.classList.add(CLASS_SHINING);
                } else if (dom.dictDetailContent) {
                    dom.dictDetailContent.classList.remove(CLASS_SHINING);
                }

                // 「克服した！」ボタンの表示制御
                if (dom.dictDetailMasterBtn) {
                    if (wrongKanjiList.includes(kanji)) {
                        dom.dictDetailMasterBtn.classList.remove('hidden');
                        dom.dictDetailMasterBtn.dataset.kanji = kanji;
                    } else {
                        dom.dictDetailMasterBtn.classList.add('hidden');
                        delete dom.dictDetailMasterBtn.dataset.kanji;
                    }
                }

                showModal(dom.dictDetailModal, dom.dictDetailContent, 'scale');
            },

            closeDictDetail: function () {
                hideModal(dom.dictDetailModal, dom.dictDetailContent, 'scale');
            },

            updateMuteButtonUI: function () {
                const muted = Audio.getMuted();
                const btn = dom.muteBtn;
                const icon = dom.muteIcon;
                if (muted) {
                    if (icon) icon.textContent = 'volume_off';
                    if (btn) btn.className = 'mute-btn mute-btn-muted';
                } else {
                    if (icon) icon.textContent = 'volume_up';
                    if (btn) btn.className = 'mute-btn mute-btn-active';
                }
            },

            toggleMute: function () {
                const muted = Audio.toggleMute();
                App.ui.updateMuteButtonUI();
                App.storage.saveProgress();
                if (!muted) {
                    Audio.playSound('select');
                }
            },

            renderLabUI: function () {
                const c1 = dom.listP1;
                const c2 = dom.listP2;
                const l1 = dom.labelP1;
                const l2 = dom.labelP2;
                const i1 = dom.iconP1;
                const i2 = dom.iconP2;
                const parts = dom.partsContainer;
                if (c1) c1.innerHTML = ''; 
                if (c2) c2.innerHTML = '';

                if (currentLabMode === 'lr') {
                    if (parts) {
                        parts.className = 'flex items-center gap-2 md:gap-4 transition-all';
                        parts.innerHTML = `
                            <div class="relative flex flex-col items-center justify-center">
                                <div class="w-24 h-24 md:w-32 md:h-32 border-4 border-dashed border-slate-300 rounded-3xl flex items-center justify-center bg-slate-50 text-slate-300 text-6xl md:text-7xl font-fude" id="display-left">?</div>
                                <span class="absolute top-full mt-2 text-[10px] md:text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full whitespace-nowrap">へん (左)</span>
                            </div>
                            <span class="material-symbols-rounded text-5xl md:text-6xl text-orange-300 animate-bounce">add</span>
                            <div class="relative flex flex-col items-center justify-center">
                                <div class="w-24 h-24 md:w-32 md:h-32 border-4 border-dashed border-slate-300 rounded-3xl flex items-center justify-center bg-slate-50 text-slate-300 text-6xl md:text-7xl font-fude" id="display-right">?</div>
                                <span class="absolute top-full mt-2 text-[10px] md:text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full whitespace-nowrap">つくり (右)</span>
                            </div>
                        `;
                    }
                    if (l1) l1.textContent = 'へん'; 
                    if (i1) i1.textContent = 'format_align_left';
                    if (l2) l2.textContent = 'つくり'; 
                    if (i2) i2.textContent = 'format_align_right';
                    if (c1) Data.PARTS_L_LR.forEach(p => App.ui.createBtn(p, 'left', c1));
                    if (c2) Data.PARTS_R_LR.forEach(p => App.ui.createBtn(p, 'right', c2));
                } else {
                    if (parts) {
                        parts.className = 'flex flex-col items-center gap-2 transition-all my-4';
                        parts.innerHTML = `
                            <div class="relative flex flex-col items-center justify-center">
                                <span class="absolute bottom-full mb-1 text-[9px] md:text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">かんむり (上)</span>
                                <div class="w-24 h-12 md:w-32 md:h-16 border-4 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50 text-slate-300 text-3xl md:text-4xl font-fude" id="display-left">?</div>
                            </div>
                            <span class="material-symbols-rounded text-xl md:text-2xl text-orange-300 animate-bounce my-2">add</span>
                            <div class="relative flex flex-col items-center justify-center">
                                <div class="w-24 h-12 md:w-32 md:h-16 border-4 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50 text-slate-300 text-3xl md:text-4xl font-fude" id="display-right">?</div>
                                <span class="absolute top-full mt-1 text-[9px] md:text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">あし (下)</span>
                            </div>
                        `;
                    }
                    if (l1) l1.textContent = 'かんむり'; 
                    if (i1) i1.textContent = 'vertical_align_top';
                    if (l2) l2.textContent = 'あし'; 
                    if (i2) i2.textContent = 'vertical_align_bottom';
                    if (c1) Data.PARTS_L_UD.forEach(p => App.ui.createBtn(p, 'left', c1));
                    if (c2) Data.PARTS_R_UD.forEach(p => App.ui.createBtn(p, 'right', c2));
                }
                selectedL = null; selectedR = null; App.ui.resetResult();
            },

            createBtn: function (char, side, container) {
                const btn = document.createElement('button');
                btn.className = 'bg-white border-b-4 border-slate-200 rounded-xl h-11 md:h-14 text-xl md:text-3xl font-fude hover:bg-orange-50 kanji-part-btn text-slate-700 focus:outline-none';
                btn.textContent = char;
                btn.addEventListener('click', () => App.ui.selectPart(side, char, btn));
                container.appendChild(btn);
            },

            selectPart: function (side, char, el) {
                Audio.playSound('select');
                const parent = side === 'left' ? dom.listP1 : dom.listP2;
                if (parent) {
                    Array.from(parent.children).forEach(b => b.classList.remove('selected'));
                }
                el.classList.add('selected');
                const disp = document.getElementById(side === 'left' ? 'display-left' : 'display-right');
                if (disp) disp.textContent = char;
                const clsLR = 'w-24 h-24 md:w-32 md:h-32 border-4 border-solid rounded-3xl flex items-center justify-center bg-white text-6xl md:text-7xl font-fude';
                const clsUD = 'w-24 h-12 md:w-32 md:h-16 border-4 border-solid rounded-xl flex items-center justify-center bg-white text-3xl md:text-4xl font-fude';
                if (side === 'left') {
                    selectedL = char;
                    if (disp) disp.className = currentLabMode === 'lr' ? `${clsLR} border-blue-200 text-blue-600` : `${clsUD} border-blue-200 text-blue-600`;
                } else {
                    selectedR = char;
                    if (disp) disp.className = currentLabMode === 'lr' ? `${clsLR} border-red-200 text-red-600` : `${clsUD} border-red-200 text-red-600`;
                }
                App.ui.resetResult();

                if (selectedL && selectedR) {
                    App.lab.combineKanji();
                }
            },

            resetResult: function () {
                const rc = dom.resultChar;
                const rb = dom.resultBox;
                const ri = dom.resultInfo;
                if (rc) {
                    rc.textContent = '?';
                    rc.className = 'text-7xl md:text-8xl font-fude text-slate-200';
                }
                if (rb) {
                    rb.className = 'w-28 h-28 md:w-32 md:h-32 border-4 border-orange-200 rounded-3xl flex items-center justify-center bg-white shadow-xl transform transition-all';
                }
                if (ri) ri.classList.add('opacity-0');
                lastMeaningPrefix = '';
                lastMeaningRaw = '';
                App.ui.updatePartButtonsAssist();
            },

            updateDailyChallengePanel: function () {
                const todayStr = getTodayString();
                
                // 日付表示更新
                const d = new Date();
                const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
                const dateLabel = dom.dailyDateLabel;
                if (dateLabel) dateLabel.textContent = dateStr;
                
                // 今日のベストタイム表示
                const bestTime = dailyBestTimes[todayStr];
                const bestLabel = dom.dailyBestTimeLabel;
                if (bestLabel) {
                    bestLabel.textContent = bestTime ? `${bestTime.toFixed(2)} 秒` : '未クリア';
                }
                
                // スタンプラリー表示の更新
                const container = dom.dailyStampsContainer;
                if (container) {
                    container.innerHTML = '';
                    
                    for (let i = 6; i >= 0; i--) {
                        const checkDate = new Date();
                        checkDate.setDate(d.getDate() - i);
                        
                        const y = checkDate.getFullYear();
                        const m = String(checkDate.getMonth() + 1).padStart(2, '0');
                        const r = String(checkDate.getDate()).padStart(2, '0');
                        const checkDateStr = `${y}-${m}-${r}`;
                        
                        const isCleared = dailyClearHistory.includes(checkDateStr);
                        const dayLabel = `${checkDate.getMonth() + 1}/${checkDate.getDate()}`;
                        
                        const slot = document.createElement('div');
                        if (isCleared) {
                            slot.className = 'stamp-slot bg-orange-100 text-orange-700 border-2 border-orange-400 transform scale-100 shadow-sm animate-pop-in';
                            slot.innerHTML = `
                                <span class="material-symbols-rounded text-lg text-orange-500 animate-bounce">verified</span>
                                <span class="mt-0.5 text-[8px] font-black">${dayLabel}</span>
                            `;
                        } else {
                            const isToday = (checkDateStr === todayStr);
                            slot.className = isToday 
                                ? 'stamp-slot bg-slate-50 text-slate-400 border-2 border-dashed border-orange-300 animate-pulse'
                                : 'stamp-slot bg-slate-50 text-slate-300 border-2 border-dashed border-slate-200';
                            slot.innerHTML = `
                                <span class="material-symbols-rounded text-lg text-slate-300">circle</span>
                                <span class="mt-0.5 text-[8px] font-black">${dayLabel}</span>
                            `;
                        }
                        container.appendChild(slot);
                    }
                }
            },

            updateCol: function () {
                const g = dom.collectionGrid;
                if (!g) return;
                if (col.size === 0) return;
                g.innerHTML = '';
                col.forEach(k => {
                    const d = document.createElement('div');
                    const isShiny = shiningKanji.has(k);
                    d.className = isShiny
                        ? `border-2 rounded-xl h-20 flex items-center justify-center text-4xl font-fude shadow-md animate-pop-in cursor-pointer active:scale-95 transition-all ${CLASS_SHINING}`
                        : 'bg-white border-2 border-orange-100 rounded-xl h-20 flex items-center justify-center text-4xl font-fude text-orange-800 shadow-sm animate-pop-in cursor-pointer hover:bg-orange-50 active:scale-95 transition-all';
                    d.textContent = k;
                    d.addEventListener('click', () => App.ui.openDictDetail(k));
                    g.appendChild(d);
                });
            },

            renderCourses: function () {
                const grid = dom.coursesGrid;
                if (!grid) return;
                grid.innerHTML = '';
                
                COURSES.forEach(course => {
                    const key = `${gameMode}_${course.id}`;
                    const highScore = quizScores[key] || 0;
                    const starCount = quizStars[key] || 0;
                    
                    let starsHtml = '';
                    for (let i = 1; i <= 3; i++) {
                        if (i <= starCount) {
                            starsHtml += '<span class="material-symbols-rounded text-yellow-400 text-2xl">star</span>';
                        } else {
                            starsHtml += '<span class="material-symbols-rounded text-slate-300 text-2xl">star</span>';
                        }
                    }
                    
                    const card = document.createElement('button');
                    card.className = 'bg-white hover:bg-orange-50 border-4 border-orange-200 hover:border-orange-400 rounded-3xl p-6 shadow-md hover:shadow-lg transition-all text-left flex flex-col justify-between gap-4 focus:outline-none';
                    card.innerHTML = `
                        <div class="w-full">
                            <div class="flex justify-between items-start w-full">
                                <h3 class="text-xl md:text-2xl font-black text-orange-800">${course.name}</h3>
                                <div class="flex">${starsHtml}</div>
                            </div>
                            <p class="text-xs md:text-sm text-slate-500 font-bold mt-1">${course.desc}</p>
                        </div>
                        <div class="flex justify-between items-center w-full mt-2">
                            <span class="text-xs font-bold text-slate-400">ハイスコア: <strong class="text-orange-600 text-sm font-black">${highScore}</strong> 点</span>
                            <span class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-sm transition-colors">挑戦する</span>
                        </div>
                    `;
                    card.addEventListener('click', () => App.quiz.startCourse(course.id));
                    grid.appendChild(card);
                });
            },

            renderQuizContent: function () {
                const num = currentQuizIndex + 1;
                const quizNumEl = dom.quizNum;
                if (quizNumEl && quizNumEl.parentNode) {
                    quizNumEl.parentNode.innerHTML = `もんだい <span id="quiz-num">${num}</span> / ${quizPool.length}`;
                    dom.quizNum = document.getElementById('quiz-num');
                }

                qL = null; qR = null;
                const isUD = verticalKanji.has(currentQuiz.k);
                if (dom.quizLabelLeft) dom.quizLabelLeft.textContent = isUD ? 'かんむり (上)' : 'へん (ひだり)';
                if (dom.quizLabelRight) dom.quizLabelRight.textContent = isUD ? 'あし (下)' : 'つくり (みぎ)';

                const btn = dom.quizSubmitBtn;
                if (btn) {
                    btn.disabled = true;
                    btn.className = 'quiz-submit-btn quiz-submit-btn-disabled';
                }

                const dispCombine = dom.quizCombineDisplay;
                const dispDecompose = dom.quizTargetChar;
                if (gameMode === 'combine') {
                    if (dispCombine) dispCombine.classList.remove('hidden'); 
                    if (dispDecompose) dispDecompose.classList.add('hidden');
                    if (dom.quizInstruction) dom.quizInstruction.textContent = '「よみ」と「いみ」から漢字をつくろう！';
                    if (dom.quizTargetReading) dom.quizTargetReading.textContent = currentQuiz.y;
                    if (dom.quizTargetMeaning) dom.quizTargetMeaning.innerHTML = applyFurigana(currentQuiz.m);
                } else {
                    if (dispCombine) dispCombine.classList.add('hidden'); 
                    if (dispDecompose) dispDecompose.classList.remove('hidden');
                    if (dom.quizInstruction) dom.quizInstruction.textContent = 'この漢字をバラバラにしよう！';
                    if (dispDecompose) dispDecompose.textContent = currentQuiz.k;
                }

                const sourcePool = getQuizPool(isUD ? 'ud' : 'lr');
                const allL = [...new Set(sourcePool.map(d => d.l))];
                const allR = [...new Set(sourcePool.map(d => d.r))];
                
                const choicesL = getSmartChoices(currentQuiz.l, 'left', allL);
                const choicesR = getSmartChoices(currentQuiz.r, 'right', allR);
                
                App.ui.renderQuizChoices('left', choicesL);
                App.ui.renderQuizChoices('right', choicesR);
                App.ui.updateQuizSlotsDisplay(isUD);
            },

            renderQuizChoices: function (side, chars) {
                const container = side === 'left' ? dom.quizChoicesLeft : dom.quizChoicesRight;
                if (!container) return;
                container.innerHTML = '';
                chars.forEach(c => {
                    const b = document.createElement('button');
                    b.className = 'quiz-choice-btn';
                    b.textContent = c;
                    b.addEventListener('click', () => App.ui.selectQuizPart(side, c, b));
                    container.appendChild(b);
                });
            },

            selectQuizPart: function (side, char, btn) {
                if (!isAwaitingAnswer || !currentQuiz || !btn || !['left', 'right'].includes(side)) return;
                Audio.playSound('select');
                const container = side === 'left' ? dom.quizChoicesLeft : dom.quizChoicesRight;
                if (container) {
                    Array.from(container.children).forEach(el => {
                        el.className = 'quiz-choice-btn';
                    });
                }
                btn.className = 'quiz-choice-btn quiz-choice-btn-selected';
                if (side === 'left') qL = char; else qR = char;
                const isUD = verticalKanji.has(currentQuiz.k);
                App.ui.updateQuizSlotsDisplay(isUD);
            },

            updateQuizSlotsDisplay: function (isUD) {
                const container = dom.quizSlotsContainer;
                if (!container) return;
                let sl = document.getElementById('quiz-slot-left');
                let sr = document.getElementById('quiz-slot-right');

                if (!sl || !sr) {
                    container.innerHTML = `
                        <div id="quiz-slot-left"></div>
                        <span class="material-symbols-rounded text-3xl text-orange-300 font-bold" id="quiz-slot-plus">add</span>
                        <div id="quiz-slot-right"></div>
                    `;
                    sl = document.getElementById('quiz-slot-left');
                    sr = document.getElementById('quiz-slot-right');
                }

                const plusEl = document.getElementById('quiz-slot-plus');
                if (plusEl) {
                    plusEl.style.display = isUD ? 'none' : 'block';
                }

                const base = isUD ? 'w-24 h-12 border-4 rounded-xl flex items-center justify-center text-3xl font-fude' : 'w-20 h-20 border-4 rounded-2xl flex items-center justify-center text-4xl font-fude';
                container.className = isUD ? 'flex flex-col items-center gap-2 mt-6' : 'flex justify-center gap-4 mt-8';

                if (sl) {
                    sl.textContent = qL || '?';
                    sl.className = qL ? `${base} border-solid border-blue-300 bg-blue-50 text-blue-800` : `${base} border-dashed border-slate-300 bg-slate-50 text-slate-300`;
                }
                if (sr) {
                    sr.textContent = qR || '?';
                    sr.className = qR ? `${base} border-solid border-red-300 bg-red-50 text-red-800` : `${base} border-dashed border-slate-300 bg-slate-50 text-slate-300`;
                }

                if (qL && qR) {
                    const b = dom.quizSubmitBtn;
                    if (b) {
                        b.disabled = false;
                        b.className = 'quiz-submit-btn quiz-submit-btn-enabled';
                    }
                }
            },

            openTitleModal: function () {
                Audio.playSound('select');
                App.ui.renderTitleList();
                showModal(dom.titleModal, dom.titleContent, 'scale');
            },

            closeTitleModal: function () {
                hideModal(dom.titleModal, dom.titleContent, 'scale');
            },

            renderTitleList: function () {
                const container = dom.titleListContainer;
                if (!container) return;
                container.innerHTML = '';
                
                TITLES_CONFIG.forEach(title => {
                    const isUnlocked = unlockedTitles.has(title.name);
                    const isSelected = selectedTitle === title.name;
                    
                    const item = document.createElement('div');
                    item.className = 'p-3 rounded-2xl border-2 flex justify-between items-center transition-all select-none';
                    
                    if (isUnlocked) {
                        if (isSelected) {
                            item.className += ' border-orange-500 bg-orange-50 text-orange-900 font-bold';
                        } else {
                            item.className += ' border-slate-200 bg-white hover:bg-orange-50/50 cursor-pointer text-slate-700';
                            item.addEventListener('click', () => {
                                App.title.selectTitle(title.name);
                            });
                        }
                        
                        item.innerHTML = `
                            <div class="flex flex-col text-left">
                                <span class="text-sm font-black flex items-center gap-1">🎖️ ${title.name} ${isSelected ? '<span class="text-xs text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">選択中</span>' : ''}</span>
                                <span class="text-xs text-slate-500 font-medium mt-0.5">${title.desc}</span>
                            </div>
                            ${isSelected ? '<span class="material-symbols-rounded text-orange-500">check_circle</span>' : '<span class="material-symbols-rounded text-slate-300">chevron_right</span>'}
                        `;
                    } else {
                        item.className += ' border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed';
                        item.innerHTML = `
                            <div class="flex flex-col text-left">
                                <span class="text-sm font-bold flex items-center gap-1">🔒 ？？？？</span>
                                <span class="text-xs text-slate-400 font-medium mt-0.5">解放条件: ${title.desc}</span>
                            </div>
                            <span class="material-symbols-rounded text-slate-300">lock</span>
                        `;
                    }
                    container.appendChild(item);
                });
            },

            updateTitleDisplay: function () {
                const label = dom.currentTitleLabel;
                if (label) {
                    label.textContent = selectedTitle;
                }
            },

            showUnlockToast: function (titleName) {
                const toast = dom.unlockToast;
                const nameEl = dom.toastTitleName;
                if (!toast || !nameEl) return;
                
                nameEl.textContent = titleName;
                toast.classList.add('show');
                
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 3000);
            },

            openWrongModal: function () {
                Audio.playSound('select');
                App.ui.renderWrongGrid();
                showModal(dom.wrongModal, dom.wrongPanel, 'slide');
            },

            closeWrongModal: function () {
                hideModal(dom.wrongModal, dom.wrongPanel, 'slide');
            },

            renderWrongGrid: function () {
                const grid = dom.wrongGrid;
                if (!grid) return;
                grid.innerHTML = '';
                
                if (wrongKanjiList.length === 0) {
                    grid.innerHTML = `
                        <div class="text-center text-slate-400 text-sm mt-10">
                            まだまちがえた漢字はないよ！<br>すばらしいね！✨
                        </div>
                    `;
                    return;
                }
                
                wrongKanjiList.forEach(kanji => {
                    const match = catalogByKanji.get(kanji);
                    if (!match) return;
                    
                    const item = document.createElement('div');
                    item.className = 'bg-white border-2 border-red-100 hover:border-red-300 rounded-2xl p-3 flex justify-between items-center shadow-sm transition-all hover:shadow-md cursor-pointer';
                    
                    item.addEventListener('click', (e) => {
                        if (e.target.closest('.master-btn')) return;
                        App.ui.openDictDetail(kanji);
                    });
                    
                    const isShiny = shiningKanji.has(kanji);
                    const shinyClass = isShiny ? `${CLASS_SHINING} text-orange-600` : 'text-slate-800';
                    const readingText = formatReading(match);
                    
                    item.innerHTML = `
                        <button type="button" class="wrong-detail-btn flex items-center gap-3 text-left" aria-label="${kanji}の漢字カードを開く">
                            <span class="w-12 h-12 flex items-center justify-center text-3xl font-fude rounded-xl border border-red-50 bg-red-50/30 ${shinyClass}">${kanji}</span>
                            <div class="flex flex-col">
                                <span class="text-xs font-black text-slate-400">${readingText}</span>
                                <span class="text-xs text-slate-600 font-bold mt-0.5 line-clamp-1">${applyFurigana(match.m)}</span>
                            </div>
                        </button>
                        <button type="button" class="master-btn w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all focus:outline-none" title="克服した！">
                            <span class="material-symbols-rounded text-xl">check</span>
                        </button>
                    `;
                    
                    const masterBtn = item.querySelector('.master-btn');
                    masterBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        App.wrong.masterKanji(kanji);
                    });
                    
                    grid.appendChild(item);
                });
            },

            updateHoloTicketUI: function () {
                const label = dom.holoTicketLabel;
                const count = dom.holoTicketCount;
                if (label && count) {
                    count.textContent = holoTickets;
                    if (holoTickets > 0) {
                        label.classList.remove('hidden');
                    } else {
                        label.classList.add('hidden');
                    }
                }
            },

            renderClearReviewList: function () {
                const container = dom.clearReviewList;
                if (!container) return;
                container.innerHTML = '';
                
                if (currentRunMistakes.length === 0) {
                    if (dom.clearReviewPanel) dom.clearReviewPanel.classList.add('hidden');
                    if (dom.clearReviewBtn) dom.clearReviewBtn.classList.add('hidden');
                    return;
                }
                
                currentRunMistakes.forEach(kanji => {
                    const b = document.createElement('button');
                    b.className = 'w-10 h-10 flex items-center justify-center text-xl font-fude bg-white border border-red-200 text-slate-800 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all focus:outline-none';
                    b.textContent = kanji;
                    b.addEventListener('click', () => {
                        App.ui.openDictDetail(kanji);
                    });
                    container.appendChild(b);
                });
            }
        },

        // 合体ラボの主要ロジック
        lab: {
            setLabMode: function (mode) {
                currentLabMode = mode;
                const mlr = dom.modeLr;
                const mud = dom.modeUd;
                if (mode === 'lr') {
                    if (mlr) mlr.className = 'mode-btn mode-btn-active';
                    if (mud) mud.className = 'mode-btn mode-btn-inactive';
                } else {
                    if (mud) mud.className = 'mode-btn mode-btn-active';
                    if (mlr) mlr.className = 'mode-btn mode-btn-inactive';
                }
                App.ui.renderLabUI();
            },

            combineKanji: function () {
                if (!selectedL || !selectedR) { Audio.playSound('fail'); return; }
                const pool = currentLabMode === 'lr' ? Data.KANJI_LR : Data.KANJI_UD;
                const match = pool.find(d => d.l === selectedL && d.r === selectedR);
                const rb = dom.resultBox;
                const rc = dom.resultChar;
                const ri = dom.resultInfo;
                const readingEl = dom.resultReading;
                const meaningEl = dom.resultMeaning;

                if (match) {
                    Audio.playSound('success');
                    const okuriganaMatch = match.kun ? match.kun.match(/（([^）]+)）/) : null;
                    const okurigana = okuriganaMatch ? okuriganaMatch[1] : '';
                    if (okurigana && rc) {
                        rc.innerHTML = `${match.k}<span class="text-3xl md:text-4xl text-orange-500 font-fude ml-1 select-none">${okurigana}</span>`;
                        rc.className = 'text-5xl md:text-6xl font-fude text-orange-600 flex items-baseline justify-center w-full';
                    } else if (rc) {
                        rc.textContent = match.k;
                        rc.className = 'text-8xl md:text-9xl font-fude text-orange-600';
                    }
                    if (rb) {
                        rb.className = 'w-28 h-28 md:w-32 md:h-32 border-4 border-orange-500 rounded-3xl flex items-center justify-center bg-white shadow-xl transform animate-bounce-pop';
                        createExplosion(rb);
                    }
                    
                    if (readingEl) readingEl.className = 'text-xl font-bold text-orange-600 leading-tight';
                    if (meaningEl) meaningEl.className = 'text-sm text-slate-500 font-medium bg-orange-50 px-3 py-1 rounded-lg inline-block border border-orange-100 mt-1';
                    
                    if (readingEl) readingEl.textContent = formatReading(match);
                    
                    let isShinyUnlocked = false;
                    let ticketRefunded = false;
                    const ticketChk = dom.useHoloTicket;
                    const useTicket = ticketChk && ticketChk.checked && holoTickets > 0;

                    if (!shiningKanji.has(match.k)) {
                        if (useTicket) {
                            shiningKanji.add(match.k);
                            isShinyUnlocked = true;
                            holoTickets--;
                            ticketChk.checked = false;
                            App.ui.updateHoloTicketUI();
                        } else if (Math.random() < 0.20) {
                            shiningKanji.add(match.k);
                            isShinyUnlocked = true;
                        }
                    } else if (useTicket) {
                        ticketRefunded = true;
                        ticketChk.checked = false;
                        App.ui.updateHoloTicketUI();
                    }

                    let prefix = '';
                    if (shiningKanji.has(match.k)) {
                        if (rb) rb.classList.add(CLASS_SHINING);
                        if (meaningEl) {
                            if (ticketRefunded) {
                                prefix = '✨<b>すでにキラカードだよ！チケットは使わなかったよ。</b>✨<br>';
                            } else if (useTicket) {
                                prefix = '🎟️✨<b>チケット使用でキラ確定！</b>✨<br>';
                            } else {
                                prefix = '✨<b>キラカード解放！</b>✨<br>';
                            }
                            meaningEl.innerHTML = `${prefix}${applyFurigana(match.m)}`;
                        }
                    } else {
                        if (rb) rb.classList.remove(CLASS_SHINING);
                        if (meaningEl) meaningEl.innerHTML = applyFurigana(match.m);
                    }
                    lastMeaningPrefix = prefix;
                    lastMeaningRaw = match.m;

                    if (ri) ri.classList.remove('opacity-0');
                    const s = dom.resultSparkle;
                    if (s) s.classList.remove('opacity-0');
                    setTimeout(() => { 
                        if (rb) rb.classList.remove('animate-bounce-pop'); 
                        if (s) s.classList.add('opacity-0'); 
                    }, 500);
                    
                    if (!col.has(match.k)) {
                        col.add(match.k);
                        App.ui.updateCol();
                        App.theme.updateThemeSelector();
                        App.storage.saveProgress();
                    } else if (isShinyUnlocked) {
                        App.ui.updateCol();
                        App.storage.saveProgress();
                    }
                    
                    App.title.checkTitleUnlocks();
                } else {
                    Audio.playSound('fail');
                    if (rb) {
                        rb.className = 'w-28 h-28 md:w-32 md:h-32 border-4 border-orange-200 rounded-3xl flex items-center justify-center bg-white shadow-xl transform transition-all';
                        rb.classList.add('animate-shake');
                        setTimeout(() => { rb.classList.remove('animate-shake'); }, 500);
                    }
                    if (rc) {
                        rc.textContent = '×';
                        rc.className = 'text-8xl md:text-9xl font-fude text-slate-400';
                    }

                    const pool = currentLabMode === 'lr' ? Data.KANJI_LR : Data.KANJI_UD;
                    const possiblePartners = pool
                        .filter(d => d.l === selectedL)
                        .map(d => d.r);
                    
                    let hintText = '';
                    if (possiblePartners.length > 0) {
                        const uniquePartners = [...new Set(possiblePartners)].slice(0, 3);
                        const listStr = uniquePartners.map(p => `「${p}」`).join(' や ');
                        hintText = currentLabMode === 'ud'
                            ? `ヒント: 上パーツ「${selectedL}」は、下に ${listStr} をあわせると合体できるよ！`
                            : `ヒント: 左パーツ「${selectedL}」は、右に ${listStr} をあわせると合体できるよ！`;
                    } else {
                        const possibleLefts = pool
                            .filter(d => d.r === selectedR)
                            .map(d => d.l);
                        if (possibleLefts.length > 0) {
                            const uniqueLefts = [...new Set(possibleLefts)].slice(0, 3);
                            const listStr = uniqueLefts.map(p => `「${p}」`).join(' や ');
                            hintText = currentLabMode === 'ud'
                                ? `ヒント: 下パーツ「${selectedR}」は、上に ${listStr} をあわせると合体できるよ！`
                                : `ヒント: 右パーツ「${selectedR}」は、左に ${listStr} をあわせると合体できるよ！`;
                        } else {
                            hintText = 'このパーツを組み合わせる漢字は登録されていないよ。';
                        }
                    }

                    if (readingEl) {
                        readingEl.textContent = 'がったいならず...';
                        readingEl.className = 'text-lg font-bold text-slate-400 leading-tight';
                    }
                    
                    if (meaningEl) {
                        meaningEl.innerHTML = applyFurigana(hintText);
                        meaningEl.className = 'text-xs text-slate-500 font-medium bg-slate-100 px-3 py-2 rounded-lg inline-block border border-slate-200 mt-1 max-w-[280px] text-left';
                    }
                    lastMeaningPrefix = '';
                    lastMeaningRaw = hintText;
                    
                    if (ri) ri.classList.remove('opacity-0');
                }
                App.ui.updatePartButtonsAssist();
            },

            getKanjiRarity: function (kanjiChar) {
                const match = catalogByKanji.get(kanjiChar);
                if (!match) return 1;
                
                const isUD = verticalKanji.has(kanjiChar);
                if (isUD) return 3;
                
                const basicParts = ['木', '日', '言', '氵', '土', '亻', '女', '口'];
                if (basicParts.includes(match.l) && basicParts.includes(match.r)) {
                    return 1;
                }
                
                return 2;
            }
        },

        // クイズ制御
        quiz: {
            startGame: function (mode) {
                pauseDailyTimer();
                isAwaitingAnswer = false;
                sessionFinished = true;
                Audio.playSound('select');
                gameMode = mode;
                isDailyChallenge = false;
                
                if (dom.gameMenu) dom.gameMenu.classList.add('hidden');
                if (dom.gameCourses) dom.gameCourses.classList.remove('hidden');
                if (dom.gamePlay) dom.gamePlay.classList.add('hidden');
                
                const label = dom.selectedGameModeLabel;
                if (label) {
                    label.textContent = mode === 'combine' ? 'がったいクイズ' : 'ぶんかいクイズ';
                }
                
                App.ui.renderCourses();
                App.ui.updateDailyChallengePanel();
            },

            startCourse: function (courseId) {
                Audio.playSound('select');
                const course = COURSES.find(c => c.id === courseId);
                if (!course) return;
                pauseDailyTimer();
                isDailyChallenge = false;
                currentCourseId = courseId;
                currentCourse = course;
                sessionFinished = false;
                
                currentScore = 0;
                currentCombo = 0;
                mistakes = 0;
                currentQuizIndex = 0;
                currentRunMistakes = [];
                
                if (dom.quizScore) dom.quizScore.textContent = '0';
                const comboBadge = dom.quizComboBadge;
                if (comboBadge) comboBadge.classList.add('hidden');
                
                const nameLabel = dom.quizCourseName;
                if (nameLabel) nameLabel.textContent = currentCourse.name;
                
                let filteredKanji = [];
                if (currentCourse.type === 'lr') {
                    filteredKanji = getQuizPool('lr').filter(k => currentCourse.parts.includes(k.l));
                } else if (currentCourse.type === 'ud') {
                    filteredKanji = getQuizPool('ud');
                } else {
                    filteredKanji = getQuizPool('all');
                }
                
                quizPool = App.helpers.shuffle(filteredKanji).slice(0, 10);
                
                if (dom.gameCourses) dom.gameCourses.classList.add('hidden');
                if (dom.gamePlay) dom.gamePlay.classList.remove('hidden');
                
                App.quiz.loadQuiz();
            },

            loadQuiz: function () {
                if (currentQuizIndex >= quizPool.length) {
                    App.quiz.finishCourse();
                    return;
                }
                
                currentQuiz = quizPool[currentQuizIndex];
                isAwaitingAnswer = true;
                App.ui.renderQuizContent();
                if (isDailyChallenge) {
                    resumeDailyTimer();
                }
            },

            checkQuiz: function () {
                // ボタン状態だけに頼らず、採点と進行を一問一回に限定する。
                if (!isAwaitingAnswer || !currentQuiz || !qL || !qR) return;
                isAwaitingAnswer = false;
                if (isDailyChallenge) {
                    pauseDailyTimer();
                }
                
                const btnSubmit = dom.quizSubmitBtn;
                if (btnSubmit) {
                    btnSubmit.disabled = true;
                    btnSubmit.className = 'quiz-submit-btn quiz-submit-btn-disabled';
                }

                const modal = dom.gameResult;
                const title = dom.resultTitle;
                const icon = dom.resultIcon;
                const kanji = dom.resultKanji;
                const detail = dom.resultDetail;
                const btn = dom.resultBtn;
                
                showModal(modal, modal, 'instant', 'result-title');
                
                const isCorrect = (qL === currentQuiz.l && qR === currentQuiz.r);
                const readingText = formatReading(currentQuiz);
                
                if (isCorrect) {
                    Audio.playSound('success');
                    if (icon) {
                        icon.textContent = 'check_circle';
                        icon.className = 'material-symbols-rounded text-6xl mb-4 block text-green-500 animate-bounce';
                    }
                    if (title) title.textContent = 'せいかい！';
                    
                    const okuriganaMatch = currentQuiz.kun ? currentQuiz.kun.match(/（([^）]+)）/) : null;
                    const okurigana = okuriganaMatch ? okuriganaMatch[1] : '';
                    if (kanji) {
                        if (okurigana) {
                            kanji.innerHTML = `${currentQuiz.k}<span class="text-2xl font-fude text-orange-500 ml-0.5 select-none">${okurigana}</span>`;
                        } else {
                            kanji.textContent = currentQuiz.k;
                        }
                        kanji.className = 'text-6xl font-fude text-orange-600 mb-4 flex items-baseline justify-center w-full animate-bounce-pop';
                    }
                    
                    setTimeout(() => {
                        if (kanji) createExplosion(kanji);
                    }, 50);
                    
                    const comboMultiplier = Math.min(2.0, 1.0 + currentCombo * 0.1);
                    const baseScore = 100;
                    const points = Math.round(baseScore * comboMultiplier);
                    
                    currentScore += points;
                    currentCombo++;
                    
                    if (dom.quizScore) dom.quizScore.textContent = currentScore;
                    
                    const comboBadge = dom.quizComboBadge;
                    if (comboBadge) {
                        if (dom.quizCombo) dom.quizCombo.textContent = currentCombo;
                        if (currentCombo >= 2) {
                            comboBadge.classList.remove('hidden');
                        }
                    }
                    
                    if (detail) detail.innerHTML = `${readingText}　意味：${applyFurigana(currentQuiz.m)}`;
                    if (btn) btn.textContent = 'つぎへ';
                } else {
                    Audio.playSound('fail');
                    if (icon) {
                        icon.textContent = 'cancel';
                        icon.className = 'material-symbols-rounded text-6xl mb-4 block text-red-500 animate-shake';
                    }
                    if (title) title.textContent = 'ざんねん...';
                    
                    const okuriganaMatch = currentQuiz.kun ? currentQuiz.kun.match(/（([^）]+)）/) : null;
                    const okurigana = okuriganaMatch ? okuriganaMatch[1] : '';
                    if (kanji) {
                        if (okurigana) {
                            kanji.innerHTML = `${currentQuiz.k}<span class="text-2xl font-fude text-orange-400 ml-0.5 select-none">${okurigana}</span>`;
                        } else {
                            kanji.textContent = currentQuiz.k;
                        }
                        kanji.className = 'text-6xl font-fude text-slate-600 mb-4 flex items-baseline justify-center w-full';
                    }
                    
                    if (detail) detail.innerHTML = `正解は [ ${currentQuiz.l} ] + [ ${currentQuiz.r} ] でした (${readingText}　意味：${applyFurigana(currentQuiz.m)})`;
                    if (btn) btn.textContent = 'つぎへ';
                    
                    currentRunMistakes.push(currentQuiz.k);
                    if (!wrongKanjiList.includes(currentQuiz.k)) {
                        wrongKanjiList.push(currentQuiz.k);
                    }

                    currentCombo = 0;
                    mistakes++;
                    const comboBadge = dom.quizComboBadge;
                    if (comboBadge) comboBadge.classList.add('hidden');
                }
                
                if (!isCorrect) App.storage.saveProgress();
                currentQuizIndex++;
            },

            nextQuiz: function () {
                if (!currentQuiz || isAwaitingAnswer || sessionFinished) return;
                hideModal(dom.gameResult, dom.gameResult, 'instant');
                if (currentQuizIndex >= quizPool.length) {
                    App.quiz.finishCourse();
                    return;
                }
                App.quiz.loadQuiz();
                dom.quizChoicesLeft?.querySelector('button')?.focus();
            },

            finishCourse: function () {
                if (sessionFinished || !quizPool.length || currentQuizIndex < quizPool.length) return;
                sessionFinished = true;
                isAwaitingAnswer = false;
                if (dailyTimerInterval) {
                    clearInterval(dailyTimerInterval);
                    dailyTimerInterval = null;
                }
                
                const clearModal = dom.stageClear;
                if (!clearModal) return;
                
                showModal(clearModal, clearModal, 'instant', 'clear-title');

                const reviewPanel = dom.clearReviewPanel;
                if (reviewPanel) reviewPanel.classList.add('hidden');
                const reviewBtn = dom.clearReviewBtn;
                if (reviewBtn) {
                    if (currentRunMistakes.length > 0) {
                        reviewBtn.classList.remove('hidden');
                        App.ui.renderClearReviewList();
                    } else {
                        reviewBtn.classList.add('hidden');
                    }
                }
                
                const normalContainer = dom.clearNormalContainer;
                const dailyContainer = dom.clearDailyContainer;
                const clearTitle = dom.clearTitle;
                
                if (isDailyChallenge) {
                    Audio.playSound('clear');
                    if (clearTitle) clearTitle.textContent = 'デイリークリア！';
                    if (normalContainer) normalContainer.classList.add('hidden');
                    if (dailyContainer) dailyContainer.classList.remove('hidden');
                    
                    const starsContainer = dom.clearStars;
                    if (starsContainer) starsContainer.innerHTML = '';
                    
                    const todayStr = dailyQuizDate;
                    const clearTimeSec = dailyElapsedTime / 1000;
                    if (dom.clearDailyTime) dom.clearDailyTime.textContent = `${clearTimeSec.toFixed(2)} 秒`;
                    
                    const previousBest = dailyBestTimes[todayStr];
                    const bestInfoEl = dom.clearDailyBestInfo;
                    const newBestAlert = dom.clearDailyNewbestAlert;
                    
                    if (bestInfoEl) {
                        bestInfoEl.textContent = previousBest 
                            ? `これまでのベスト: ${previousBest.toFixed(2)} 秒`
                            : 'これまでのベスト: なし';
                    }
                    
                    let isNewBest = false;
                    if (!previousBest || clearTimeSec < previousBest) {
                        dailyBestTimes[todayStr] = clearTimeSec;
                        isNewBest = true;
                    }
                    
                    if (newBestAlert) {
                        if (isNewBest) {
                            newBestAlert.classList.remove('hidden');
                        } else {
                            newBestAlert.classList.add('hidden');
                        }
                    }
                    
                    if (!dailyClearHistory.includes(todayStr)) {
                        dailyClearHistory.push(todayStr);
                    }
                    
                    App.storage.saveProgress();
                    App.ui.updateDailyChallengePanel();
                    App.daily.checkStampStreakReward();
                } else {
                    Audio.playSound('clear');
                    if (clearTitle) clearTitle.textContent = 'コースクリア！';
                    if (normalContainer) normalContainer.classList.remove('hidden');
                    if (dailyContainer) dailyContainer.classList.add('hidden');
                    
                    let stars = 1;
                    if (mistakes <= 1) {
                        stars = 3;
                    } else if (mistakes <= 3) {
                        stars = 2;
                    }
                    
                    const key = `${gameMode}_${currentCourseId}`;
                    const previousHighScore = quizScores[key] || 0;
                    const previousStars = quizStars[key] || 0;
                    
                    let isNewHighScore = false;
                    if (currentScore > previousHighScore) isNewHighScore = true;
                    if (!(key in quizScores) || isNewHighScore) quizScores[key] = currentScore;
                    if (stars > previousStars) {
                        quizStars[key] = stars;
                    }
                    
                    App.storage.saveProgress();
                    
                    if (dom.clearScore) dom.clearScore.textContent = currentScore;
                    
                    const highscoreAlert = dom.clearHighscoreAlert;
                    if (highscoreAlert) {
                        if (isNewHighScore) {
                            highscoreAlert.classList.remove('hidden');
                        } else {
                            highscoreAlert.classList.add('hidden');
                        }
                    }
                    
                    const starsContainer = dom.clearStars;
                    if (starsContainer) {
                        starsContainer.innerHTML = '';
                        for (let i = 1; i <= 3; i++) {
                            const starSpan = document.createElement('span');
                            starSpan.className = 'material-symbols-rounded text-5xl transition-all duration-500 scale-0 opacity-0';
                            starSpan.textContent = 'star';
                            starsContainer.appendChild(starSpan);
                            
                            setTimeout(() => {
                                starSpan.classList.remove('scale-0', 'opacity-0');
                                starSpan.classList.add('scale-100', 'opacity-100');
                                if (i <= stars) {
                                    starSpan.classList.add('text-yellow-400');
                                } else {
                                    starSpan.classList.add('text-slate-300');
                                }
                            }, i * 200);
                        }
                    }
                }
                App.title.checkTitleUnlocks();
                App.storage.saveProgress();
            },

            exitToCourses: function () {
                sessionFinished = true;
                isAwaitingAnswer = false;
                pauseDailyTimer();
                isDailyChallenge = false;
                
                if (dom.quizScoreContainer) dom.quizScoreContainer.classList.remove('hidden');
                if (dom.quizTimeContainerHeader) dom.quizTimeContainerHeader.classList.add('hidden');
                
                if (dom.gamePlay) dom.gamePlay.classList.add('hidden');
                hideModal(dom.gameResult, dom.gameResult, 'instant');
                hideModal(dom.stageClear, dom.stageClear, 'instant');
                
                if (dom.gameCourses) dom.gameCourses.classList.remove('hidden');
                App.ui.renderCourses();
                App.ui.updateDailyChallengePanel();
                dom.coursesBackBtn?.focus();
            },

            exitGame: function () {
                sessionFinished = true;
                isAwaitingAnswer = false;
                pauseDailyTimer();
                isDailyChallenge = false;
                
                if (dom.quizScoreContainer) dom.quizScoreContainer.classList.remove('hidden');
                if (dom.quizTimeContainerHeader) dom.quizTimeContainerHeader.classList.add('hidden');
                
                if (dom.gamePlay) dom.gamePlay.classList.add('hidden');
                if (dom.gameCourses) dom.gameCourses.classList.add('hidden');
                hideModal(dom.gameResult, dom.gameResult, 'instant');
                hideModal(dom.stageClear, dom.stageClear, 'instant');
                
                App.ui.closeDictDetail();
                if (dom.gameMenu) dom.gameMenu.classList.remove('hidden');
            }
        },

        // デイリーチャレンジ
        daily: {
            getStampStreakCount: function () {
                const d = new Date();
                let clearedCount = 0;
                for (let i = 6; i >= 0; i--) {
                    const checkDate = new Date();
                    checkDate.setDate(d.getDate() - i);
                    const y = checkDate.getFullYear();
                    const m = String(checkDate.getMonth() + 1).padStart(2, '0');
                    const r = String(checkDate.getDate()).padStart(2, '0');
                    const checkDateStr = `${y}-${m}-${r}`;
                    if (dailyClearHistory.includes(checkDateStr)) {
                        clearedCount++;
                    }
                }
                return clearedCount;
            },

            getDailyQuizzes: function () {
                const todayStr = getTodayString();
                const seedNum = parseInt(todayStr.replace(/-/g, ''));
                const rand = seedRandom(seedNum);
                
                const allKanji = [...getQuizPool('all', 'default')];
                for (let i = allKanji.length - 1; i > 0; i--) {
                    const j = Math.floor(rand() * (i + 1));
                    [allKanji[i], allKanji[j]] = [allKanji[j], allKanji[i]];
                }
                return allKanji.slice(0, 5);
            },

            startDailyChallenge: function () {
                pauseDailyTimer();
                Audio.playSound('select');
                isDailyChallenge = true;
                sessionFinished = false;
                dailyQuizDate = getTodayString();
                activeTab = 'game';
                gameMode = 'combine';
                
                currentScore = 0;
                currentCombo = 0;
                mistakes = 0;
                currentQuizIndex = 0;
                currentRunMistakes = [];
                
                if (dom.quizScoreContainer) dom.quizScoreContainer.classList.add('hidden');
                if (dom.quizTimeContainerHeader) dom.quizTimeContainerHeader.classList.remove('hidden');
                if (dom.quizCurrentTime) dom.quizCurrentTime.textContent = '0.00';
                
                const comboBadge = dom.quizComboBadge;
                if (comboBadge) comboBadge.classList.add('hidden');
                
                const nameLabel = dom.quizCourseName;
                if (nameLabel) nameLabel.textContent = '今日のお題';
                
                quizPool = App.daily.getDailyQuizzes();
                
                if (dom.gameCourses) dom.gameCourses.classList.add('hidden');
                if (dom.gamePlay) dom.gamePlay.classList.remove('hidden');
                
                dailyElapsedTime = 0;
                
                App.quiz.loadQuiz();
            },

            checkStampStreakReward: function () {
                const streak = App.daily.getStampStreakCount();
                const todayStr = getTodayString();
                if (streak === 7 && lastRewardedStreakDate !== todayStr) {
                    holoTickets++;
                    lastRewardedStreakDate = todayStr;
                    unlockedThemes.add('sakura'); // 永続的アンロックに追加
                    App.storage.saveProgress();
                    App.ui.updateHoloTicketUI();
                    App.theme.updateThemeSelector();
                    
                    const header = dom.gameHeader;
                    if (header) {
                        createExplosion(header);
                    }
                    
                    setTimeout(() => {
                        alert('🌸 デイリースタンプを7日間すべてクリアしました！ 🌸\n\n【コンプリート特典】\n🎟️「確定キラチケット」を1枚ゲット！\n🌸 テーマ「さくら」がアンロックされました！');
                    }, 300);
                }
            }
        },

        // 称号
        title: {
            selectTitle: function (titleName) {
                Audio.playSound('select');
                selectedTitle = titleName;
                App.storage.saveProgress();
                App.ui.updateTitleDisplay();
                App.ui.renderTitleList();
                setTimeout(() => App.ui.closeTitleModal(), 150);
            },

            checkTitleUnlocks: function (silent = false) {
                let newlyUnlocked = [];
                TITLES_CONFIG.forEach(title => {
                    if (!unlockedTitles.has(title.name)) {
                        if (title.unlock()) {
                            unlockedTitles.add(title.name);
                            newlyUnlocked.push(title.name);
                        }
                    }
                });
                
                if (newlyUnlocked.length > 0) {
                    App.storage.saveProgress();
                    if (!silent) {
                        Audio.playSound('success');
                        newlyUnlocked.forEach((titleName, index) => {
                            setTimeout(() => {
                                App.ui.showUnlockToast(titleName);
                            }, index * 2500);
                        });
                    }
                }
            }
        },

        // にがてノート
        wrong: {
            masterKanji: function (kanji) {
                Audio.playSound('success');
                wrongKanjiList = wrongKanjiList.filter(k => k !== kanji);
                currentRunMistakes = currentRunMistakes.filter(k => k !== kanji);
                App.storage.saveProgress();
                App.ui.renderWrongGrid();
                App.ui.renderClearReviewList();
            }
        },

        // ヘルパー関数
        helpers: {
            shuffle: function (arr) {
                return _shuffle(arr);
            }
        }
    };

    // DOM構築完了後に初期化
    document.addEventListener('DOMContentLoaded', () => {
        App.init();
        window.App = App;
    });
})();
