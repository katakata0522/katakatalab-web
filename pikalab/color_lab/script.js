/**
 * Color Lab - いろのじっけんしつ DX
 * 画面制御層（DOM依存あり）
 */

(() => {
    // ===================================
    // CONSTANTS
    // ===================================
    const CONSTANTS = {
        TOAST_DURATION_MS: 3000,
        ANIMATION_DURATION_MS: 300,
        COLOR_THRESHOLD: 10,
        MAX_TOASTS: 3,
        MAX_SAVED_SLOTS: 4
    };

    const SELECTORS = {
        TAB_LAB: 'tab-lab',
        TAB_GAME: 'tab-game',
        VIEW_LAB: 'view-lab',
        VIEW_GAME: 'view-game',
        TOAST_CONTAINER: 'toast-container',
        RESULT_MODAL: 'result-modal',
        CHECK_BUTTON: 'check-btn',
        NEXT_LEVEL_BUTTON: 'next-level-btn',
        EXIT_GAME_BUTTON: 'exit-game-btn',
        EXIT_GAME_COMPLETE_BUTTON: 'exit-game-from-complete',
        SAVED_COLORS_CONTAINER: 'saved-colors-container',
        RECIPE_LIST_CONTAINER: 'recipe-list-container',
        DRESSUP_MODAL: 'dressup-modal'
    };

    // ===================================
    // HELPER FUNCTIONS (EXCEPTION-SAFE STORAGE)
    // ===================================
    function safeLocalStorageSet(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn(`[color_lab] localStorage の書き込みに失敗しました (${key}):`, e);
            return false;
        }
    }

    function safeLocalStorageGet(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn(`[color_lab] localStorage の読み込みに失敗しました (${key}):`, e);
            return null;
        }
    }

    function readStoredCount(key) {
        const value = Number(safeLocalStorageGet(key));
        return Number.isSafeInteger(value) && value >= 0 ? value : 0;
    }

    function readDailyStamps() {
        try {
            const value = JSON.parse(safeLocalStorageGet('color_lab_daily_stamps') || '[]');
            return Array.isArray(value) ? [...new Set(value.filter(date =>
                typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
                Number.isFinite(Date.parse(date + 'T00:00:00Z')) &&
                new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) === date
            ))] : [];
        } catch { return []; }
    }

    // ===================================
    // LOGIC LAYER BINDING
    // ===================================
    let boundLogic = null;

    if (typeof window !== 'undefined' && window.ColorLabLogic) {
        boundLogic = window.ColorLabLogic;
    }

    if (!boundLogic && typeof require === 'function') {
        try {
            boundLogic = require('./logic.js');
        } catch (_error) {
            boundLogic = null;
        }
    }

    if (!boundLogic) {
        throw new Error("[color_lab] logic.js が読み込まれていません。ロード順を確認してください。");
    }

    const ColorLogic = boundLogic;

    // ===================================
    // APP STATE
    // ===================================
    const LEVELS_NORMAL = [
        { t: [255, 0, 0], h: "「あか」を まっくすに してみよう！", n: "あか" },
        { t: [0, 255, 0], h: "「みどり」を まっくすに！", n: "みどり" },
        { t: [0, 0, 255], h: "「あお」を まっくすに！", n: "あお" },
        { t: [255, 255, 255], h: "ぜんぶ まっくすで ひかりかがやく！", n: "しろ" },
        { t: [0, 0, 0], h: "ぜんぶ ゼロに すると...？", n: "くろ" },
        { t: [255, 255, 0], h: "「あか」と「みどり」を まぜるよ", n: "きいろ" },
        { t: [0, 255, 255], h: "「みどり」と「あお」を まぜるよ", n: "みずいろ" },
        { t: [255, 0, 255], h: "「あか」と「あお」を まぜるよ", n: "ピンク" },
        { t: [128, 128, 128], h: "ぜんぶ まんなか くらいだよ", n: "グレー" },
        { t: [255, 128, 128], h: "「あか」はまっくす。ほかははんぶん。", n: "うすいあか" }
    ];

    const LEVELS_CHALLENGE = [
        { t: [255, 165, 0], h: "あかをたくさん、みどりをすこし", n: "オレンジ" },
        { t: [128, 0, 128], h: "あかとあおを はんぶんずつ", n: "むらさき" },
        { t: [0, 0, 128], h: "あおだけ まんなかくらい", n: "こんいろ" },
        { t: [165, 42, 42], h: "あかをすこし、みどりはもっとすこし", n: "ちゃいろ" },
        { t: [255, 215, 0], h: "きいろに すこしあかみがあるかな？", n: "ゴールド" },
        { t: [0, 128, 0], h: "みどりだけ まんなかくらい", n: "ふかいみどり" },
        { t: [255, 105, 180], h: "あかをつよく、みどりをすこし、あおもつよく", n: "ホットピンク" },
        { t: [128, 128, 0], h: "あかとみどりを はんぶんずつ", n: "オリーブ" },
        { t: [64, 224, 208], h: "みどりとあおを つよく、あかはすこし", n: "ターコイズ" },
        { t: [75, 0, 130], h: "あかはすこし、あおをはんぶんくらい", n: "インディゴ" }
    ];

    const RECIPES_DATA = {
        basic: [
            { rgb: [255, 255, 255], name: "まっしろ", label: "しろ", color: "bg-white border-slate-200" },
            { rgb: [0, 0, 0], name: "まっくろ", label: "くろ", color: "bg-black border-slate-900" },
            { rgb: [255, 165, 0], name: "オレンジ", label: "オレンジ", color: "bg-orange-400 border-orange-200" },
            { rgb: [255, 255, 0], name: "きいろ", label: "きいろ", color: "bg-yellow-400 border-yellow-200" },
            { rgb: [128, 0, 128], name: "むらさき", label: "むらさき", color: "bg-purple-600 border-purple-400" },
            { rgb: [255, 192, 203], name: "ピンク", label: "ピンク", color: "bg-pink-300 border-pink-100" }
        ],
        fantasy: [
            { rgb: [253, 94, 83], name: "夕暮れのそら", label: "夕暮れのそら", color: "bg-[#FD5E53] border-red-300" },
            { rgb: [255, 179, 186], name: "いちごパフェ", label: "いちごパフェ", color: "bg-[#FFB3BA] border-pink-200" },
            { rgb: [75, 0, 130], name: "インディゴ", label: "まほうつかい", color: "bg-[#4B0082] border-indigo-700" },
            { rgb: [168, 230, 207], name: "ミントいろ", label: "ミントソーダ", color: "bg-[#A8E6CF] border-green-200" },
            { rgb: [255, 223, 186], name: "モカベージュ", label: "もこもこひつじ", color: "bg-[#FFDFBA] border-yellow-200" },
            { rgb: [186, 255, 201], name: "うすきみどり", label: "まっちゃラテ", color: "bg-[#BAFFC9] border-emerald-200" }
        ]
    };

    const state = {
        lab: {
            isUsingRecipe: false,
            savedColors: [null, null, null, null], // { r, g, b, name }
            selectedSlots: [], // ブレンド用（最大2つ）
            codeFormat: 'hex', // 'hex' | 'rgb' | 'hsl'
            currentRecipeTab: 'basic',
            draggedIndex: null,
            characterName: 'ぼく',
            equippedItem: 'none', // 'none' | 'hat' | 'ribbon' | 'glasses'
            eyeSpinTimer: null,
            blendTimer: null,
            burstTimer: null,
            colorName: null
        },
        game: {
            state: 'menu',
            mode: 'normal',
            currentLevelIndex: 0,
            score: 0,
            levels: [],
            progress: ColorLogic.createGameProgress(10),
            isChecking: false,
            lastActiveElementId: SELECTORS.CHECK_BUTTON,
            lastMenuFocusId: 'start-normal-game',
            timeLeft: 30,
            timerInterval: null,
            questionsSolved: 0,
            isShiny: false
        }
    };

    /* ==================== SHARED UTILS ==================== */

    /**
     * HTMLをエスケープしてXSSを防ぐ
     * @param {string} str
     * @returns {string}
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * DOM要素を安全に取得する
     * @param {string} id
     * @returns {HTMLElement|null}
     */
    function getElementByIdSafe(id) {
        if (typeof document === 'undefined') {
            return null;
        }
        const element = document.getElementById(id);
        if (!element) {
            console.error(`[color_lab] 要素が見つかりません: #${id}`);
        }
        return element;
    }

    /**
     * 要素がある場合のみイベントを登録する
     * @param {string} id
     * @param {string} eventName
     * @param {(event: Event) => void} handler
     */
    function addListenerIfExists(id, eventName, handler) {
        const element = getElementByIdSafe(id);
        if (element) {
            element.addEventListener(eventName, handler);
        }
    }

    /**
     * フォーカス可能な要素へフォーカスを戻す
     * @param {string} preferredId
     * @param {string} fallbackId
     */
    function restoreFocusById(preferredId, fallbackId = SELECTORS.CHECK_BUTTON) {
        const preferred = preferredId ? getElementByIdSafe(preferredId) : null;
        if (preferred && !preferred.classList.contains('hidden')) {
            preferred.focus();
            return;
        }
        const fallback = getElementByIdSafe(fallbackId);
        if (fallback && !fallback.classList.contains('hidden')) {
            fallback.focus();
        }
    }

    /**
     * 現在フォーカス中の要素IDを返す
     * @returns {string}
     */
    function getActiveElementId() {
        if (typeof document === 'undefined' || !document.activeElement) {
            return '';
        }
        const active = document.activeElement;
        if (active && typeof active.id === 'string') {
            return active.id;
        }
        return '';
    }

    // --- TOAST NOTIFICATION ---
    function showToast(message, type = 'info') {
        let container = getElementByIdSafe(SELECTORS.TOAST_CONTAINER);
        if (!container) {
            const body = document.body;
            const newContainer = document.createElement('div');
            newContainer.id = SELECTORS.TOAST_CONTAINER;
            newContainer.setAttribute('aria-live', 'polite');
            newContainer.setAttribute('aria-atomic', 'false');
            body.appendChild(newContainer);
            container = newContainer;
        } else {
            // 同一メッセージのトーストが既に表示されている場合は表示しない
            const existingToasts = container.querySelectorAll('.toast');
            for (const t of existingToasts) {
                const spans = t.querySelectorAll('span');
                if (spans.length >= 2 && spans[1].textContent === message) {
                    return;
                }
            }
        }

        while (container.childElementCount >= CONSTANTS.MAX_TOASTS) {
            const oldestToast = container.firstElementChild;
            if (!oldestToast) {
                break;
            }
            oldestToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'status');

        let icon = 'info';
        if (type === 'success') icon = 'check_circle';
        if (type === 'warning') icon = 'warning';
        if (type === 'error') icon = 'error';

        const safeMessage = escapeHtml(message);
        toast.innerHTML = `<span class="material-symbols-rounded toast-icon">${icon}</span><span>${safeMessage}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), CONSTANTS.ANIMATION_DURATION_MS);
        }, CONSTANTS.TOAST_DURATION_MS);
    }

    /* ==================== TAB SWITCHING ==================== */
    function switchTab(mode) {
        const labBtn = getElementByIdSafe(SELECTORS.TAB_LAB);
        const gameBtn = getElementByIdSafe(SELECTORS.TAB_GAME);
        const labView = getElementByIdSafe(SELECTORS.VIEW_LAB);
        const gameView = getElementByIdSafe(SELECTORS.VIEW_GAME);
        if (!labBtn || !gameBtn || !labView || !gameView) {
            return;
        }

        if (state.game.state !== 'menu') exitGame();
        if (mode !== 'lab') cancelBlend();

        if (mode === 'lab') {
            labBtn.classList.add('bg-yellow-400', 'text-white', 'shadow-[0_2px_0_rgba(180,83,9,0.3)]');
            labBtn.classList.remove('text-slate-400', 'hover:text-slate-600');
            gameBtn.classList.remove('bg-blue-500', 'text-white', 'shadow-[0_2px_0_#1e40af]');
            gameBtn.classList.add('text-slate-400', 'hover:text-slate-600');
            labView.classList.remove('hidden');
            labView.setAttribute('aria-hidden', 'false');
            gameView.classList.add('hidden');
            gameView.setAttribute('aria-hidden', 'true');
            labBtn.setAttribute('aria-selected', 'true');
            labBtn.setAttribute('tabindex', '0');
            gameBtn.setAttribute('aria-selected', 'false');
            gameBtn.setAttribute('tabindex', '-1');
        } else {
            gameBtn.classList.add('bg-blue-500', 'text-white', 'shadow-[0_2px_0_#1e40af]');
            gameBtn.classList.remove('text-slate-400', 'hover:text-slate-600');
            labBtn.classList.remove('bg-yellow-400', 'text-white', 'shadow-[0_2px_0_rgba(180,83,9,0.3)]');
            labBtn.classList.add('text-slate-400', 'hover:text-slate-600');
            gameView.classList.remove('hidden');
            gameView.setAttribute('aria-hidden', 'false');
            labView.classList.add('hidden');
            labView.setAttribute('aria-hidden', 'true');
            gameBtn.setAttribute('aria-selected', 'true');
            gameBtn.setAttribute('tabindex', '0');
            labBtn.setAttribute('aria-selected', 'false');
            labBtn.setAttribute('tabindex', '-1');

            if (state.game.state === 'menu') {
                showGameScreen('menu');
            }
        }
    }

    /* ==================== PALETTE MANAGEMENT ==================== */
    function loadSavedColors() {
        try {
            const data = safeLocalStorageGet('color_lab_saved_colors');
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    state.lab.savedColors = parsed.slice(0, CONSTANTS.MAX_SAVED_SLOTS).map(item => {
                        if (item && typeof item === 'object' && 'r' in item && 'g' in item && 'b' in item) {
                            return {
                                r: ColorLogic.coerceRgbValue(item.r, 128),
                                g: ColorLogic.coerceRgbValue(item.g, 128),
                                b: ColorLogic.coerceRgbValue(item.b, 128),
                                name: String(item.name || 'カスタムカラー')
                            };
                        }
                        return null;
                    });
                    while (state.lab.savedColors.length < CONSTANTS.MAX_SAVED_SLOTS) {
                        state.lab.savedColors.push(null);
                    }
                    return;
                }
            }
        } catch (e) {
            console.error('[color_lab] お気に入りカラーの読み込みに失敗しました', e);
        }
        state.lab.savedColors = Array(CONSTANTS.MAX_SAVED_SLOTS).fill(null);
    }

    function saveColorsToStorage() {
        try {
            return safeLocalStorageSet('color_lab_saved_colors', JSON.stringify(state.lab.savedColors));
        } catch (e) {
            console.error('[color_lab] お気に入りカラーの保存に失敗しました', e);
            return false;
        }
    }

    // スロットを保持して内容だけ同期し、選択や保存でフォーカスを失わない。
    let paletteSlots = null;
    function renderSavedColors() {
        const container = getElementByIdSafe(SELECTORS.SAVED_COLORS_CONTAINER);
        if (!container) return;
        if (!paletteSlots) {
            container.querySelectorAll('.palette-slot').forEach(slot => slot.remove());
            const blendBtn = getElementByIdSafe('blend-colors-btn');
            paletteSlots = state.lab.savedColors.map((_, index) => {
                const slot = document.createElement('div');
                slot.dataset.slotIndex = String(index);
                slot.className = 'palette-slot';
                const use = document.createElement('button');
                use.type = 'button';
                use.className = 'palette-use-btn';
                const remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'palette-delete-btn';
                remove.dataset.slotIndex = String(index);
                remove.setAttribute('aria-label', `おきにいり ${index + 1} をけす`);
                remove.textContent = '×';
                slot.appendChild(use);
                slot.appendChild(remove);
                for (const [type, handler] of Object.entries({ dragstart: handleDragStart, dragover: handleDragOver,
                    dragleave: handleDragLeave, drop: handleDrop, dragend: handleDragEnd })) {
                    slot.addEventListener(type, handler);
                }
                if (blendBtn) container.insertBefore(slot, blendBtn);
                else container.appendChild(slot);
                return { slot, use, remove };
            });
        }
        state.lab.savedColors.forEach((color, index) => {
            const { slot, use, remove } = paletteSlots[index];
            const selected = state.lab.selectedSlots.includes(index);
            slot.className = `palette-slot${color ? (selected ? ' selected' : '') : ' empty'}`;
            slot.style.backgroundColor = color ? `rgb(${color.r}, ${color.g}, ${color.b})` : '';
            slot.setAttribute('draggable', String(Boolean(color)));
            use.setAttribute('aria-label', color
                ? `おきにいり ${index + 1}: ${color.name} (つかう)${selected ? '（せんたく中）' : ''}`
                : `おきにいり ${index + 1} に保存`);
            use.setAttribute('aria-pressed', String(selected));
            const restoreSlotFocus = !color && document.activeElement === remove;
            remove.hidden = !color;
            if (restoreSlotFocus) use.focus();
        });
        updateBlendButtonState();
    }

    function updateBlendButtonState() {
        const blendBtn = getElementByIdSafe('blend-colors-btn');
        if (!blendBtn) return;

        if (state.lab.selectedSlots.length === 2 && state.lab.blendTimer === null) {
            blendBtn.removeAttribute('disabled');
            blendBtn.classList.remove('bg-slate-100', 'text-slate-400', 'border-slate-200');
            blendBtn.classList.add('bg-yellow-400', 'text-white', 'border-yellow-500');
        } else {
            blendBtn.setAttribute('disabled', 'true');
            blendBtn.classList.add('bg-slate-100', 'text-slate-400', 'border-slate-200');
            blendBtn.classList.remove('bg-yellow-400', 'text-white', 'border-yellow-500');
        }
    }

    function handlePaletteClick(e) {
        const target = e.target;
        
        // 削除ボタンがクリックされたかチェック
        const deleteBtn = target.closest('.palette-delete-btn');
        if (deleteBtn) {
            cancelBlend();
            e.stopPropagation();
            const index = parseInt(deleteBtn.dataset.slotIndex, 10);
            if (!isNaN(index) && index >= 0 && index < CONSTANTS.MAX_SAVED_SLOTS) {
                state.lab.savedColors[index] = null;
                // 選択状態からも削除
                const selIdx = state.lab.selectedSlots.indexOf(index);
                if (selIdx !== -1) {
                    state.lab.selectedSlots.splice(selIdx, 1);
                }
                saveColorsToStorage();
                renderSavedColors();
                showToast('パレットから けしたよ！', 'info');
            }
            return;
        }

        // スロット自体がクリックされたかチェック
        const slotBtn = target.closest('.palette-slot');
        if (slotBtn) {
            cancelBlend();
            const index = parseInt(slotBtn.dataset.slotIndex, 10);
            if (!isNaN(index) && index >= 0 && index < CONSTANTS.MAX_SAVED_SLOTS) {
                const color = state.lab.savedColors[index];
                if (color === null) {
                    // 現在の色を保存する
                    const sliderR = getElementByIdSafe('slider-r');
                    const sliderG = getElementByIdSafe('slider-g');
                    const sliderB = getElementByIdSafe('slider-b');
                    const nameDisplay = getElementByIdSafe('color-name-display');
                    if (sliderR && sliderG && sliderB) {
                        const r = ColorLogic.coerceRgbValue(sliderR.value, 128);
                        const g = ColorLogic.coerceRgbValue(sliderG.value, 128);
                        const b = ColorLogic.coerceRgbValue(sliderB.value, 128);
                        const name = nameDisplay ? nameDisplay.textContent : 'カスタムカラー';
                        
                        state.lab.savedColors[index] = { r, g, b, name };
                        const saved = saveColorsToStorage();
                        incrementSaveOrBlendCount('save'); // 保存回数カウント
                        renderSavedColors();
                        showToast(saved ? 'おきにいりに 保存したよ！' : '保存できなかったよ。このページでは いろをつかえるよ。', saved ? 'success' : 'warning');
                    }
                } else {
                    // 選択・ブレンドモード処理
                    const selIdx = state.lab.selectedSlots.indexOf(index);
                    if (selIdx !== -1) {
                        // 選択解除
                        state.lab.selectedSlots.splice(selIdx, 1);
                    } else {
                        // 選択追加（最大2つまで）
                        if (state.lab.selectedSlots.length >= 2) {
                            state.lab.selectedSlots.shift(); // 古いものを押し出し
                        }
                        state.lab.selectedSlots.push(index);
                        // 色を反映
                        setRGB(color.r, color.g, color.b, color.name);
                    }
                    renderSavedColors();
                }
            }
        }
    }

    function incrementSaveOrBlendCount(actionType) {
        if (actionType === 'save') {
            const count = readStoredCount('color_lab_save_count') + 1;
            safeLocalStorageSet('color_lab_save_count', String(count));
            checkAccessoryUnlockConditions(false); // 解放チェック
        } else if (actionType === 'blend') {
            const count = readStoredCount('color_lab_blend_count') + 1;
            safeLocalStorageSet('color_lab_blend_count', String(count));
            checkAccessoryUnlockConditions(false); // 解放チェック
        }
    }

    function spawnBlendSparkles(r, g, b) {
        const character = getElementByIdSafe('blob-character');
        if (!character) return;

        const charRect = character.getBoundingClientRect();
        const centerX = window.scrollX + charRect.left + (charRect.width / 2);
        const centerY = window.scrollY + charRect.top + (charRect.height / 2);

        const count = 12;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const distance = 80 + Math.random() * 60;
            const flyX = Math.cos(angle) * distance;
            const flyY = Math.sin(angle) * distance;

            const sparkle = document.createElement('div');
            sparkle.className = 'blend-sparkle';

            const isStar = Math.random() < 0.5;
            sparkle.textContent = isStar ? '⭐' : '🌸';
            sparkle.style.fontSize = `${16 + Math.random() * 12}px`;
            sparkle.style.color = `rgb(${r}, ${g}, ${b})`;
            
            sparkle.style.left = `${centerX - 10}px`;
            sparkle.style.top = `${centerY - 10}px`;

            sparkle.style.setProperty('--fly-x', `${flyX}px`);
            sparkle.style.setProperty('--fly-y', `${flyY}px`);

            document.body.appendChild(sparkle);

            sparkle.addEventListener('animationend', () => {
                sparkle.remove();
            });
        }
    }

    function cancelBlend() {
        if (state.lab.blendTimer === null && state.lab.burstTimer === null) return;
        clearTimeout(state.lab.blendTimer);
        clearTimeout(state.lab.burstTimer);
        state.lab.burstTimer = null;
        state.lab.blendTimer = null;
        const character = getElementByIdSafe('blob-character');
        if (character) {
            character.classList.remove('character-mixer-spin', 'character-pop-burst', 'animate-jelly');
            character.classList.add('animate-blob');
        }
        document.querySelectorAll('.face-part').forEach(eye => eye.classList.remove('eye-spin'));
        updateBlendButtonState();
    }

    function handleBlendColors() {
        if (state.lab.selectedSlots.length !== 2 || state.lab.blendTimer !== null) return;

        const idxA = state.lab.selectedSlots[0];
        const idxB = state.lab.selectedSlots[1];
        const colorA = state.lab.savedColors[idxA];
        const colorB = state.lab.savedColors[idxB];

        if (colorA && colorB) {
            const character = getElementByIdSafe('blob-character');
            const eyes = document.querySelectorAll('.face-part');

            // ブレンドカウント（ひげ解放用）をカウントアップ
            incrementSaveOrBlendCount('blend');

            // 1. ミキサー回転＆目が回る演出のトリガー
            if (character) {
                character.classList.remove('animate-blob', 'character-pop-burst');
                void character.offsetWidth;
                character.classList.add('character-mixer-spin');
            }
            eyes.forEach(eye => {
                if (eye.tagName === 'circle') {
                    eye.classList.add('eye-spin');
                }
            });

            // 1.2秒後に色を適用して爆発バウンド・星の飛び散りを演出
            state.lab.blendTimer = setTimeout(() => {
                state.lab.blendTimer = null;
                const blendedRgb = ColorLogic.blendColors(colorA, colorB);
                
                // 色を実際にセットして更新
                setRGB(blendedRgb[0], blendedRgb[1], blendedRgb[2], 'カスタムカラー');

                // 2. 回転を停止し、ポップバウンドをトリガー
                if (character) {
                    character.classList.remove('character-mixer-spin');
                    void character.offsetWidth;
                    character.classList.add('character-pop-burst');
                    state.lab.burstTimer = setTimeout(() => {
                        character.classList.remove('character-pop-burst', 'animate-jelly');
                        character.classList.add('animate-blob');
                        state.lab.burstTimer = null;
                    }, 650);
                }

                // 目を回すアニメーションを止める
                eyes.forEach(eye => {
                    if (eye.tagName === 'circle') {
                        eye.classList.remove('eye-spin');
                    }
                });

                // 3. カラフルな飛び散りパーティクルを生成
                spawnBlendSparkles(blendedRgb[0], blendedRgb[1], blendedRgb[2]);

                showToast('2つのいろを まぜあわせたよ！', 'success');

                // 選択状態を解除
                state.lab.selectedSlots = [];
                renderSavedColors();
            }, 1200);
            updateBlendButtonState();
        }
    }

    // --- DRAG & DROP FOR PALETTE SORTING ---
    function handleDragStart(e) {
        cancelBlend();
        const index = parseInt(e.currentTarget.dataset.slotIndex, 10);
        if (isNaN(index) || state.lab.savedColors[index] === null) {
            e.preventDefault();
            return;
        }
        state.lab.draggedIndex = index;
        e.currentTarget.classList.add('dragging');
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        const targetSlot = e.currentTarget.closest('.palette-slot');
        if (targetSlot && state.lab.draggedIndex !== null) {
            targetSlot.classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        const targetSlot = e.currentTarget.closest('.palette-slot');
        if (targetSlot) {
            targetSlot.classList.remove('drag-over');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        const dropIndex = parseInt(e.currentTarget.dataset.slotIndex, 10);
        const dragIndex = state.lab.draggedIndex;

        if (Number.isInteger(dragIndex) && dragIndex >= 0 && dragIndex < CONSTANTS.MAX_SAVED_SLOTS &&
            Number.isInteger(dropIndex) && dropIndex >= 0 && dropIndex < CONSTANTS.MAX_SAVED_SLOTS && dragIndex !== dropIndex) {
            // 要素の入れ替え
            const temp = state.lab.savedColors[dragIndex];
            state.lab.savedColors[dragIndex] = state.lab.savedColors[dropIndex];
            state.lab.savedColors[dropIndex] = temp;

            // 選択状態のインデックス更新
            state.lab.selectedSlots = state.lab.selectedSlots.map(selIdx => {
                if (selIdx === dragIndex) return dropIndex;
                if (selIdx === dropIndex) return dragIndex;
                return selIdx;
            });

            saveColorsToStorage();
            renderSavedColors();
            showToast('おきにいりを ならびかえたよ！', 'info');
        }
        handleDragEnd(e);
    }

    function handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        const slots = document.querySelectorAll('.palette-slot');
        slots.forEach(s => s.classList.remove('drag-over'));
        state.lab.draggedIndex = null;
    }

    /* ==================== RECIPE DYNAMIC RENDERING ==================== */
    function renderRecipes() {
        const container = getElementByIdSafe(SELECTORS.RECIPE_LIST_CONTAINER);
        if (!container) return;

        container.innerHTML = '';
        const list = RECIPES_DATA[state.lab.currentRecipeTab] || RECIPES_DATA.basic;

        list.forEach(recipe => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'p-2 rounded-xl border-2 border-slate-100 hover:border-yellow-300 hover:bg-yellow-50 transition-all text-left flex items-center gap-3 group bg-white shadow-sm focus:outline-none';
            
            // ボタンがクリックされた際、対応する色をセット
            btn.addEventListener('click', () => {
                setRGB(recipe.rgb[0], recipe.rgb[1], recipe.rgb[2], recipe.name);
            });

            // 色円とテキスト
            btn.innerHTML = `
                <div class="w-8 h-8 rounded-full ${recipe.color} border-2 shadow-sm"></div>
                <span class="font-bold text-slate-600 group-hover:text-yellow-600">${recipe.label}</span>
            `;
            container.appendChild(btn);
        });
    }

    function switchRecipeTab(tabId) {
        for (const name of ['basic', 'fantasy']) {
            const tab = getElementByIdSafe(`recipe-tab-${name}`);
            if (tab) tab.setAttribute('tabindex', name === tabId ? '0' : '-1');
        }
        if (tabId === 'basic') {
            state.lab.currentRecipeTab = 'basic';
            getElementByIdSafe('recipe-tab-basic').classList.add('bg-white', 'text-slate-700', 'shadow-sm');
            getElementByIdSafe('recipe-tab-basic').classList.remove('text-slate-400', 'hover:text-slate-600');
            getElementByIdSafe('recipe-tab-basic').setAttribute('aria-selected', 'true');

            getElementByIdSafe('recipe-tab-fantasy').classList.remove('bg-white', 'text-slate-700', 'shadow-sm');
            getElementByIdSafe('recipe-tab-fantasy').classList.add('text-slate-400', 'hover:text-slate-600');
            getElementByIdSafe('recipe-tab-fantasy').setAttribute('aria-selected', 'false');
        } else {
            state.lab.currentRecipeTab = 'fantasy';
            getElementByIdSafe('recipe-tab-fantasy').classList.add('bg-white', 'text-slate-700', 'shadow-sm');
            getElementByIdSafe('recipe-tab-fantasy').classList.remove('text-slate-400', 'hover:text-slate-600');
            getElementByIdSafe('recipe-tab-fantasy').setAttribute('aria-selected', 'true');

            getElementByIdSafe('recipe-tab-basic').classList.remove('bg-white', 'text-slate-700', 'shadow-sm');
            getElementByIdSafe('recipe-tab-basic').classList.add('text-slate-400', 'hover:text-slate-600');
            getElementByIdSafe('recipe-tab-basic').setAttribute('aria-selected', 'false');
        }
        renderRecipes();
    }

    /* ==================== COLOR CODE FORMAT TOGGLE ==================== */
    function toggleCodeFormat() {
        if (state.lab.codeFormat === 'hex') {
            state.lab.codeFormat = 'rgb';
        } else if (state.lab.codeFormat === 'rgb') {
            state.lab.codeFormat = 'hsl';
        } else {
            state.lab.codeFormat = 'hex';
        }
        updateLab();
    }

    /* ==================== CHARACTER NAME MANAGEMENT ==================== */
    function loadCharacterName() {
        state.lab.characterName = safeLocalStorageGet('color_lab_character_name') || 'ぼく';
        const display = getElementByIdSafe('character-name-display');
        if (display) {
            display.textContent = state.lab.characterName;
        }
    }

    function editCharacterName() {
        const newName = prompt('ぼくの なまえを おしえてね！', state.lab.characterName);
        if (newName !== null) {
            const trimmed = newName.trim();
            if (trimmed) {
                state.lab.characterName = trimmed;
                safeLocalStorageSet('color_lab_character_name', trimmed);
                const display = getElementByIdSafe('character-name-display');
                if (display) {
                    display.textContent = trimmed;
                }
                showToast(`なまえを 「${trimmed}」 にしたよ！`, 'success');
            }
        }
    }

    /* ==================== DRESSUP (きせかえ) MANAGEMENT ==================== */
    function checkAccessoryUnlockConditions(silent = false) {
        const unlocked = {
            crown: false,
            mustache: false,
            'star-glasses': false
        };

        const bestNormal = readStoredCount('color_lab_best_normal');
        const bestChallenge = readStoredCount('color_lab_best_challenge');
        if (bestNormal >= 900 || bestChallenge >= 900) {
            unlocked.crown = true;
        }

        const saveCount = readStoredCount('color_lab_save_count');
        if (saveCount >= 10) {
            unlocked.mustache = true;
        }

        const bestTA = readStoredCount('color_lab_best_timeattack');
        const stampCount = readDailyStamps().length;
        if (bestTA >= 3 || stampCount >= 2) {
            unlocked['star-glasses'] = true;
        }

        if (!silent) {
            ['crown', 'mustache', 'star-glasses'].forEach(item => {
                if (unlocked[item]) {
                    const wasUnlocked = safeLocalStorageGet(`color_lab_unlocked_${item}`) === 'true';
                    if (!wasUnlocked) {
                        safeLocalStorageSet(`color_lab_unlocked_${item}`, 'true');
                        let itemName = '新しいアイテム';
                        if (item === 'crown') itemName = '👑おうさまの王冠';
                        if (item === 'mustache') itemName = '🥸おもしろひげ';
                        if (item === 'star-glasses') itemName = '⭐星のめがね';
                        showToast(`${itemName} がつかえるようになったよ！`, 'success');
                    }
                }
            });
        } else {
            ['crown', 'mustache', 'star-glasses'].forEach(item => {
                if (unlocked[item]) {
                    safeLocalStorageSet(`color_lab_unlocked_${item}`, 'true');
                }
            });
        }

        return unlocked;
    }

    function loadEquippedItem() {
        const item = safeLocalStorageGet('color_lab_equipped_item') || 'none';
        if (item === 'crown' || item === 'mustache' || item === 'star-glasses') {
            const unlockedStatus = checkAccessoryUnlockConditions(true);
            if (!unlockedStatus[item]) {
                state.lab.equippedItem = 'none';
                applyEquipment('none');
                return;
            }
        }
        state.lab.equippedItem = item;
        applyEquipment(item);
    }

    // ダイアログの開閉・背景状態・フォーカスを一つの経路で管理する。
    let activeModal = null;
    function openModalCommon(modalId) {
        const modal = getElementByIdSafe(modalId);
        if (!modal || activeModal?.modal === modal) return;
        if (activeModal) closeModalCommon(activeModal.modal.id);
        const background = [document.getElementById('main-content') || document.querySelector('main'),
            document.querySelector('header')].filter(Boolean);
        activeModal = { modal, trigger: document.activeElement,
            background: background.map(element => ({ element, inert: element.hasAttribute('inert') })),
            overflow: document.body.style.overflow };
        background.forEach(element => element.setAttribute('inert', ''));
        document.body.style.overflow = 'hidden';
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        const first = getModalFocusable(modal)[0];
        if (first) first.focus();
        else { modal.setAttribute('tabindex', '-1'); modal.focus(); }
    }

    function getModalFocusable(modal) {
        return [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
            .filter(element => !element.disabled && !element.hidden && element.getClientRects().length);
    }

    function closeModalCommon(modalId) {
        if (!activeModal || activeModal.modal.id !== modalId) return;
        const { modal, trigger, background, overflow } = activeModal;
        activeModal = null;
        background.forEach(({ element, inert }) => { if (!inert) element.removeAttribute('inert'); });
        document.body.style.overflow = overflow;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        if (trigger?.isConnected && typeof trigger.focus === 'function') trigger.focus();
    }

    function handleModalKeydown(event) {
        if (!activeModal) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeModalCommon(activeModal.modal.id);
        } else if (event.key === 'Tab') {
            const focusable = getModalFocusable(activeModal.modal);
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!first) { event.preventDefault(); activeModal.modal.focus(); }
            else if (event.shiftKey && (document.activeElement === first || !activeModal.modal.contains(document.activeElement))) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !activeModal.modal.contains(document.activeElement))) {
                event.preventDefault(); first.focus();
            }
        }
    }

    function openDressupModal() {
        const modal = getElementByIdSafe(SELECTORS.DRESSUP_MODAL);
        if (!modal) return;

        const unlockedStatus = checkAccessoryUnlockConditions(false);

        openModalCommon(SELECTORS.DRESSUP_MODAL);

        const buttons = modal.querySelectorAll('.dressup-item-btn');
        buttons.forEach(btn => {
            const itemType = btn.dataset.item;
            if (itemType === state.lab.equippedItem) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }

            if (itemType === 'crown' || itemType === 'mustache' || itemType === 'star-glasses') {
                const isUnlocked = unlockedStatus[itemType];
                const lockOverlay = btn.querySelector('.lock-overlay');
                if (isUnlocked) {
                    btn.classList.remove('locked');
                    if (lockOverlay) lockOverlay.classList.add('hidden');
                } else {
                    btn.classList.add('locked');
                    if (lockOverlay) lockOverlay.classList.remove('hidden');
                }
            }
        });
    }

    function closeDressupModal() {
        closeModalCommon(SELECTORS.DRESSUP_MODAL);
    }

    function handleDressupItemClick(e) {
        const btn = e.currentTarget;
        const itemType = btn.dataset.item || 'none';

        if (btn.classList.contains('locked')) {
            e.stopPropagation();
            let conditionText = '';
            if (itemType === 'crown') {
                conditionText = '「ふつう」か「チャレンジ」コースで 900てん以上をとると 解放されるよ！';
            } else if (itemType === 'mustache') {
                conditionText = 'おきにいりのいろを 10かい保存すると 解放されるよ！';
            } else if (itemType === 'star-glasses') {
                conditionText = '「タイムアタック」で3もんクリアするか、デイリースタンプを2こ集めると 解放されるよ！';
            }
            showToast(conditionText, 'info');
            return;
        }

        applyEquipment(itemType);

        const modal = getElementByIdSafe(SELECTORS.DRESSUP_MODAL);
        if (modal) {
            const buttons = modal.querySelectorAll('.dressup-item-btn');
            buttons.forEach(b => {
                if (b === btn) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
        }

        state.lab.equippedItem = itemType;
    }

    function confirmDressup() {
        safeLocalStorageSet('color_lab_equipped_item', state.lab.equippedItem);
        closeDressupModal();
        showToast('きせかえ をきめたよ！', 'success');
    }

    let renderedEquipment = null;
    function applyEquipment(item) {
        if (renderedEquipment === item) return;
        renderedEquipment = item;
        ['svg-hat', 'svg-ribbon', 'svg-glasses', 'svg-crown', 'svg-mustache', 'svg-star-glasses', 'svg-sunglasses'].forEach(id => {
            const el = getElementByIdSafe(id);
            if (el) el.classList.add('hidden');
        });

        if (item && item !== 'none') {
            const el = getElementByIdSafe(`svg-${item}`);
            if (el) el.classList.remove('hidden');
        }
    }

    /* ==================== REACTION ANIMATIONS ==================== */
    function triggerEyeSpin() {
        const eyes = document.querySelectorAll('.face-part');
        eyes.forEach(eye => {
            if (eye.tagName === 'circle') {
                eye.classList.add('eye-spin');
            }
        });

        // 既存のタイマーをクリア
        if (state.lab.eyeSpinTimer) {
            clearTimeout(state.lab.eyeSpinTimer);
        }

        // ドラッグ終了（150ms入力なし）で目を戻す
        state.lab.eyeSpinTimer = setTimeout(() => {
            eyes.forEach(eye => {
                if (eye.tagName === 'circle') {
                    eye.classList.remove('eye-spin');
                }
            });
            state.lab.eyeSpinTimer = null;
        }, 150);
    }

    function speakColorName(name) {
        // 自動読み上げ機能は無効化されました
    }

    let lastDropTime = 0;
    function triggerColorDrop(colorType) {
        const now = Date.now();
        if (now - lastDropTime > 80) { // 80msの間隔で間引く
            spawnColorDrop(colorType);
            lastDropTime = now;
        }
    }

    function spawnColorDrop(colorType) {
        const slider = getElementByIdSafe(`slider-${colorType}`);
        const character = getElementByIdSafe('blob-character');
        if (!slider || !character) return;

        const sliderRect = slider.getBoundingClientRect();
        const charRect = character.getBoundingClientRect();

        // つまみの現在位置を算出
        const val = parseInt(slider.value, 10) || 0;
        const percent = val / 255;
        const startX = window.scrollX + sliderRect.left + (sliderRect.width * percent);
        const startY = window.scrollY + sliderRect.top + (sliderRect.height / 2);

        // 終点（キャラクターの中心やや上）
        const endX = window.scrollX + charRect.left + (charRect.width / 2);
        const endY = window.scrollY + charRect.top + (charRect.height / 2) - 15;

        const drop = document.createElement('div');
        drop.className = 'color-drop';

        // スライダー色に応じたカラー設定
        let colorCode = '#ef4444'; // あか
        if (colorType === 'g') colorCode = '#22c55e'; // みどり
        if (colorType === 'b') colorCode = '#3b82f6'; // あお
        drop.style.backgroundColor = colorCode;

        // 開始位置
        drop.style.left = `${startX - 7}px`;
        drop.style.top = `${startY - 7}px`;

        // CSS変数で相対移動量を渡す
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        drop.style.setProperty('--drop-x', `${deltaX}px`);
        drop.style.setProperty('--drop-y', `${deltaY}px`);

        document.body.appendChild(drop);

        drop.addEventListener('animationend', () => {
            drop.remove();
        });
    }

    /* ==================== LAB MODE LOGIC ==================== */

    let labElements = null;
    function updateLab() {
        if (!labElements) {
            const ids = ['slider-r', 'slider-g', 'slider-b', 'txt-r', 'txt-g', 'txt-b', 'blob-character', 'hex-code', 'color-name-display'];
            const elements = ids.map(getElementByIdSafe);
            if (elements.some(element => !element)) return;
            labElements = Object.fromEntries(ids.map((id, index) => [id, elements[index]]));
        }
        const sliderR = labElements['slider-r'];
        const sliderG = labElements['slider-g'];
        const sliderB = labElements['slider-b'];
        const txtR = labElements['txt-r'];
        const txtG = labElements['txt-g'];
        const txtB = labElements['txt-b'];
        const blob = labElements['blob-character'];
        const hexCode = labElements['hex-code'];
        const colorNameDisplay = labElements['color-name-display'];

        if (!sliderR || !sliderG || !sliderB || !txtR || !txtG || !txtB || !blob || !hexCode || !colorNameDisplay) {
            return;
        }

        const r = ColorLogic.coerceRgbValue(sliderR.value, 128);
        const g = ColorLogic.coerceRgbValue(sliderG.value, 128);
        const b = ColorLogic.coerceRgbValue(sliderB.value, 128);
        sliderR.value = String(r);
        sliderG.value = String(g);
        sliderB.value = String(b);

        txtR.textContent = String(r);
        txtG.textContent = String(g);
        txtB.textContent = String(b);

        blob.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        blob.style.color = ColorLogic.getTextColor(r, g, b);

        // カラーコード切り替え表示
        if (state.lab.codeFormat === 'hex') {
            hexCode.textContent = ColorLogic.rgbToHex(r, g, b);
        } else if (state.lab.codeFormat === 'rgb') {
            hexCode.textContent = `rgb(${r}, ${g}, ${b})`;
        } else {
            hexCode.textContent = ColorLogic.rgbToHsl(r, g, b);
        }

        // キャラクターの目の要素を取得
        const eyes = document.querySelectorAll('.face-part');

        // リアクション判定
        if (r < 10 && g < 10 && b < 10) {
            // まっくろ：眠る (zzz)
            eyes.forEach(eye => {
                if (eye.tagName === 'circle') eye.setAttribute('r', '2.5'); // 目をつぶる
            });
            applyEquipment(state.lab.equippedItem);
            colorNameDisplay.textContent = 'zzz...';
        } else if (r > 245 && g > 245 && b > 245) {
            // まっしろ：サングラス（メガネ）強制表示
            eyes.forEach(eye => {
                if (eye.tagName === 'circle') eye.setAttribute('r', '10'); // 目は元に戻す
            });
            applyEquipment('sunglasses'); // 強制サングラス
            colorNameDisplay.textContent = 'まっしろ';
            speakColorName('まっしろ');
        } else {
            // 通常時：目のサイズ復元 ＆ 本来の装備品を適用
            eyes.forEach(eye => {
                if (eye.tagName === 'circle') eye.setAttribute('r', '10');
            });
            applyEquipment(state.lab.equippedItem);

            // 主要カラーネームの自動判定おしゃべり適用
            const name = state.lab.colorName || ColorLogic.getColorName(r, g, b);
            colorNameDisplay.textContent = name;
            speakColorName(name);
        }
    }

    function setRGB(r, g, b, forcedName) {
        cancelBlend();
        state.lab.colorName = forcedName || null;
        state.lab.isUsingRecipe = true;
        const sliderR = getElementByIdSafe('slider-r');
        const sliderG = getElementByIdSafe('slider-g');
        const sliderB = getElementByIdSafe('slider-b');
        if (!sliderR || !sliderG || !sliderB) {
            state.lab.isUsingRecipe = false;
            return;
        }

        sliderR.value = String(ColorLogic.coerceRgbValue(r, 128));
        sliderG.value = String(ColorLogic.coerceRgbValue(g, 128));
        sliderB.value = String(ColorLogic.coerceRgbValue(b, 128));

        updateLab();
        
        // レシピ用の固有名称を強制表示（主要カラーネームでカバーしきれないオリジナル名用）
        if (forcedName) {
            const colorNameDisplay = getElementByIdSafe('color-name-display');
            if (colorNameDisplay && colorNameDisplay.textContent !== 'zzz...') {
                colorNameDisplay.textContent = forcedName;
            }
        }

        const character = getElementByIdSafe('blob-character');
        if (character) {
            character.classList.remove('animate-jelly');
            void character.offsetWidth;
            if (!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) character.classList.add('animate-jelly');
        }

        state.lab.isUsingRecipe = false;
    }

    // --- COMPLEMENTARY COLOR (反対の色) ---
    function setComplementaryColor() {
        const sliderR = getElementByIdSafe('slider-r');
        const sliderG = getElementByIdSafe('slider-g');
        const sliderB = getElementByIdSafe('slider-b');
        if (!sliderR || !sliderG || !sliderB) return;

        const r = ColorLogic.coerceRgbValue(sliderR.value, 128);
        const g = ColorLogic.coerceRgbValue(sliderG.value, 128);
        const b = ColorLogic.coerceRgbValue(sliderB.value, 128);

        const comp = ColorLogic.getComplementaryColor(r, g, b);
        setRGB(comp[0], comp[1], comp[2]);
        showToast('反対のいろ にしたよ！', 'success');
    }

    function copyColor() {
        const hexCode = getElementByIdSafe('hex-code');
        if (!hexCode) {
            return;
        }
        const text = hexCode.textContent || '';
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                showToast('コピーしたよ！', 'success');
            }).catch(() => {
                showToast('コピーに失敗したよ...', 'error');
            });
            return;
        }

        const legacyInput = document.createElement('input');
        legacyInput.value = text;
        legacyInput.setAttribute('readonly', '');
        legacyInput.style.position = 'absolute';
        legacyInput.style.opacity = '0';
        legacyInput.style.pointerEvents = 'none';
        document.body.appendChild(legacyInput);
        legacyInput.select();
        legacyInput.setSelectionRange(0, legacyInput.value.length);

        let copied = false;
        try {
            copied = document.execCommand('copy');
        } catch (_error) {
            copied = false;
        } finally {
            document.body.removeChild(legacyInput);
        }

        if (copied) {
            showToast('コピーしたよ！', 'success');
            return;
        }
        showToast('コピーに失敗したよ...', 'error');
    }

    /* ==================== GAME MODE LOGIC ==================== */

    function showGameScreen(id) {
        ['game-menu', 'game-main', 'game-complete'].forEach((elId) => {
            const section = getElementByIdSafe(elId);
            if (section) {
                section.classList.add('hidden');
                section.setAttribute('aria-hidden', 'true');
            }
        });
        const currentSection = getElementByIdSafe(`game-${id}`);
        if (currentSection) {
            currentSection.classList.remove('hidden');
            currentSection.setAttribute('aria-hidden', 'false');
        }
    }

    function updateRgbAssistLabels(targetRgb, playerRgb) {
        const targetLabel = getElementByIdSafe('game-target-rgb');
        const playerLabel = getElementByIdSafe('game-player-rgb');
        if (targetLabel && Array.isArray(targetRgb)) {
            targetLabel.textContent = ColorLogic.formatRgbLabel(ColorLogic.normalizeRgbTuple(targetRgb, 0));
        }
        if (playerLabel && Array.isArray(playerRgb)) {
            playerLabel.textContent = ColorLogic.formatRgbLabel(ColorLogic.normalizeRgbTuple(playerRgb, 0));
        }
    }

    function getRandomTargetColor() {
        const allPool = [...LEVELS_NORMAL, ...LEVELS_CHALLENGE];
        const selected = allPool[Math.floor(Math.random() * allPool.length)];
        return {
            t: [...selected.t],
            h: selected.h,
            n: selected.n
        };
    }

    function startTimer() {
        stopTimer();
        const display = getElementByIdSafe('game-timer-display');
        const timerPanel = getElementByIdSafe('game-timer-panel');
        if (timerPanel) {
            timerPanel.classList.remove('hidden');
        }
        
        // 再開時は残り時間と獲得したボーナスを保持する。初期化はresetGameStateで行う。
        if (display) {
            display.textContent = String(state.game.timeLeft);
        }
        
        state.game.timerInterval = setInterval(() => {
            state.game.timeLeft--;
            if (display) {
                display.textContent = String(state.game.timeLeft);
            }
            
            if (state.game.timeLeft <= 0) {
                stopTimer();
                handleTimeUp();
            }
        }, 1000);
    }
    
    function stopTimer() {
        if (state.game.timerInterval) {
            clearInterval(state.game.timerInterval);
            state.game.timerInterval = null;
        }
    }

    function handleTimeUp() {
        stopTimer();
        stopShinySparkleLoop();
        state.game.isChecking = false;
        state.game.state = 'complete';
        showGameScreen('complete');
        
        const completeTitle = getElementByIdSafe('complete-title');
        const completeSubtitle = getElementByIdSafe('complete-subtitle');
        if (completeTitle) {
            completeTitle.textContent = "タイムアップ！";
        }
        if (completeSubtitle) {
            completeSubtitle.textContent = `じかん切れ！ なんもん とけたかな？`;
        }
        
        const scoreLabel = getElementByIdSafe('complete-score-label');
        if (scoreLabel) {
            scoreLabel.textContent = "クリアした もんだい数";
        }
        const finalScore = getElementByIdSafe('final-score');
        if (finalScore) {
            finalScore.innerHTML = `${state.game.questionsSolved}<span class="text-xl text-slate-400 ml-2" id="final-score-max">もんクリア</span>`;
        }
        
        const awardPanel = getElementByIdSafe('award-display-panel');
        if (awardPanel) {
            awardPanel.classList.add('hidden');
        }
        
        saveTimeAttackHighScore(state.game.questionsSolved);
        markDailyStamp();
        
        restoreFocusById(SELECTORS.EXIT_GAME_COMPLETE_BUTTON, SELECTORS.EXIT_GAME_COMPLETE_BUTTON);
    }

    function getTodayString() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function markDailyStamp() {
        try {
            const today = getTodayString();
            const stamps = readDailyStamps();
            if (!stamps.includes(today)) {
                stamps.push(today);
                safeLocalStorageSet('color_lab_daily_stamps', JSON.stringify(stamps));
                showToast('きょうのスタンプを ゲットしたよ！', 'success');
                // 解放条件をチェック
                checkAccessoryUnlockConditions(false);
            }
        } catch (e) {
            console.error('[color_lab] スタンプ保存エラー:', e);
        }
    }

    function renderCalendar() {
        const grid = getElementByIdSafe('calendar-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        weekdays.forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'calendar-header-cell';
            cell.textContent = day;
            grid.appendChild(cell);
        });
        
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDay.getDay();
        const totalDays = lastDay.getDate();
        
        for (let i = 0; i < startDayOfWeek; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day-cell empty-day';
            grid.appendChild(empty);
        }
        
        const stampedDates = new Set(readDailyStamps());

        const todayStr = getTodayString();
        
        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const cell = document.createElement('div');
            cell.className = 'calendar-day-cell';
            cell.textContent = String(day);
            
            if (dateStr === todayStr) {
                cell.classList.add('today');
            }
            
            if (stampedDates.has(dateStr)) {
                cell.classList.add('stamped');
                cell.setAttribute('aria-label', `${day}日 スタンプあり`);
            } else {
                cell.setAttribute('aria-label', `${day}日`);
            }
            
            grid.appendChild(cell);
        }
    }

    function openCalendarModal() {
        renderCalendar();
        openModalCommon('calendar-modal');
    }
    
    function closeCalendarModal() {
        closeModalCommon('calendar-modal');
    }

    function saveHighScore(course, score) {
        try {
            const bestKey = `color_lab_best_${course}`;
            const currentBest = readStoredCount(bestKey);
            if (score > currentBest) {
                if (!safeLocalStorageSet(bestKey, String(score))) return false;
                
                const award = ColorLogic.getAward(score);
                safeLocalStorageSet(`color_lab_award_medal_${course}`, award.medalEmoji);
                safeLocalStorageSet(`color_lab_award_title_${course}`, award.title);
                
                // 解放条件をチェック
                checkAccessoryUnlockConditions(false);
                
                return true;
            }
        } catch (e) {
            console.error('[color_lab] ハイスコア保存エラー:', e);
        }
        return false;
    }
    
    function saveTimeAttackHighScore(solvedCount) {
        try {
            const bestKey = 'color_lab_best_timeattack';
            const currentBest = readStoredCount(bestKey);
            if (solvedCount > currentBest) {
                safeLocalStorageSet(bestKey, String(solvedCount));
                // 解放条件をチェック
                checkAccessoryUnlockConditions(false);
            }
        } catch (e) {
            console.error('[color_lab] タイムアタック自己ベスト保存エラー:', e);
        }
    }

    function renderTrophies() {
        const normalMedal = safeLocalStorageGet('color_lab_award_medal_normal') || '🎗️';
        const normalTitle = safeLocalStorageGet('color_lab_award_title_normal') || '未クリア';
        const normalScore = safeLocalStorageGet('color_lab_best_normal') || '0';
        
        const challengeMedal = safeLocalStorageGet('color_lab_award_medal_challenge') || '🎗️';
        const challengeTitle = safeLocalStorageGet('color_lab_award_title_challenge') || '未クリア';
        const challengeScore = safeLocalStorageGet('color_lab_best_challenge') || '0';
        
        const taSolved = safeLocalStorageGet('color_lab_best_timeattack') || '0';
        
        const elNormalTitle = getElementByIdSafe('trophy-title-normal');
        const elNormalMedal = getElementByIdSafe('trophy-medal-normal');
        if (elNormalTitle && elNormalMedal) {
            elNormalTitle.textContent = normalTitle === '未クリア' ? '未クリア' : `${normalTitle} (${normalScore}点)`;
            elNormalMedal.textContent = normalMedal;
        }
        
        const elChallengeTitle = getElementByIdSafe('trophy-title-challenge');
        const elChallengeMedal = getElementByIdSafe('trophy-medal-challenge');
        if (elChallengeTitle && elChallengeMedal) {
            elChallengeTitle.textContent = challengeTitle === '未クリア' ? '未クリア' : `${challengeTitle} (${challengeScore}点)`;
            elChallengeMedal.textContent = challengeMedal;
        }
        
        const elTaTitle = getElementByIdSafe('trophy-title-timeattack');
        const elTaScore = getElementByIdSafe('trophy-score-timeattack');
        if (elTaTitle && elTaScore) {
            elTaTitle.textContent = `${taSolved}問クリア`;
            elTaScore.textContent = taSolved;
        }
    }
    
    function openTrophyModal() {
        renderTrophies();
        openModalCommon('trophy-modal');
    }
    
    function closeTrophyModal() {
        closeModalCommon('trophy-modal');
    }

    function startGame(mode, sourceButtonId = '') {
        resetGameState();
        state.game.state = 'playing';
        state.game.mode = mode;
        const levelTotal = getElementByIdSafe('game-level-total');
        if (levelTotal) levelTotal.hidden = mode === 'timeattack';
        
        const timerPanel = getElementByIdSafe('game-timer-panel');
        if (timerPanel) {
            timerPanel.classList.add('hidden');
        }
        
        if (mode === 'timeattack') {
            state.game.levels = [getRandomTargetColor()];
            state.game.progress = ColorLogic.createGameProgress(999);
            startTimer();
        } else {
            state.game.levels = mode === 'normal' ? LEVELS_NORMAL : LEVELS_CHALLENGE;
            state.game.progress = ColorLogic.createGameProgress(state.game.levels.length);
        }
        
        state.game.isChecking = false;
        if (sourceButtonId) {
            state.game.lastMenuFocusId = sourceButtonId;
        }

        const badge = getElementByIdSafe('game-mode-badge');
        if (badge) {
            badge.className = "text-xs font-black px-2 py-0.5 rounded-full mb-1 inline-block";
            if (mode === 'normal') {
                badge.classList.add('bg-green-100', 'text-green-600');
                badge.textContent = "ふつう コース";
            } else if (mode === 'challenge') {
                badge.classList.add('bg-purple-100', 'text-purple-600');
                badge.textContent = "チャレンジ コース";
            } else {
                badge.classList.add('bg-red-100', 'text-red-600');
                badge.textContent = "タイムアタック";
            }
        }

        const scoreStars = getElementByIdSafe('score-stars');
        if (scoreStars) {
            scoreStars.innerHTML = '';
        }

        showGameScreen('main');
        loadLevel(0);
    }

    let shinySparkleInterval = null;

    function startShinySparkleLoop() {
        stopShinySparkleLoop();
        const wrapper = getElementByIdSafe('game-target-shine-wrapper');
        if (!wrapper) return;

        shinySparkleInterval = setInterval(() => {
            const sparkle = document.createElement('span');
            sparkle.className = 'shiny-particle';
            sparkle.textContent = Math.random() < 0.5 ? '✨' : '⭐';
            
            const width = wrapper.clientWidth || 150;
            const height = wrapper.clientHeight || 200;
            
            const x = Math.random() * (width - 30) + 10;
            const y = (height / 2) + (Math.random() * 60 - 20); 

            sparkle.style.left = `${x}px`;
            sparkle.style.top = `${y}px`;
            
            const scale = 0.6 + Math.random() * 0.8;
            const rotate = Math.random() * 360;
            const flyX = (Math.random() - 0.5) * 50;
            const flyY = -60 - Math.random() * 60;
            
            sparkle.style.setProperty('--fly-x', `${flyX}px`);
            sparkle.style.setProperty('--fly-y', `${flyY}px`);
            sparkle.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
            
            wrapper.appendChild(sparkle);

            sparkle.addEventListener('animationend', () => {
                sparkle.remove();
            });
        }, 300);
    }

    function stopShinySparkleLoop() {
        if (shinySparkleInterval) {
            clearInterval(shinySparkleInterval);
            shinySparkleInterval = null;
        }
        const wrapper = getElementByIdSafe('game-target-shine-wrapper');
        if (wrapper) {
            wrapper.querySelectorAll('.shiny-particle').forEach(el => el.remove());
        }
    }

    function resetGameState() {
        stopTimer();
        stopShinySparkleLoop();
        state.game.state = 'menu';
        state.game.mode = 'normal';
        state.game.currentLevelIndex = 0;
        state.game.score = 0;
        state.game.levels = [];
        state.game.progress = ColorLogic.createGameProgress(10);
        state.game.isChecking = false;
        state.game.timeLeft = 30;
        state.game.questionsSolved = 0;
        state.game.isShiny = false;
        state.game.timerSuspended = false;
    }

    function exitGame() {
        stopTimer();
        resetGameState();
        
        const timerPanel = getElementByIdSafe('game-timer-panel');
        if (timerPanel) {
            timerPanel.classList.add('hidden');
        }
        
        showGameScreen('menu');
        restoreFocusById(state.game.lastMenuFocusId, 'start-normal-game');
    }

    function loadLevel(idx) {
        if (state.game.mode === 'timeattack' && idx > 0) {
            state.game.levels = [getRandomTargetColor()];
        }

        const levelData = state.game.levels[state.game.mode === 'timeattack' ? 0 : idx];
        if (!levelData || !Array.isArray(levelData.t)) {
            console.error('[color_lab] レベルデータが不正です');
            return;
        }
        const levelDisplay = getElementByIdSafe('level-display');
        if (levelDisplay) {
            levelDisplay.textContent = String(idx + 1);
        }

        const targetRgb = ColorLogic.normalizeRgbTuple(levelData.t, 0);
        const gameTarget = getElementByIdSafe('game-target');
        if (gameTarget) {
            gameTarget.style.backgroundColor = `rgb(${targetRgb[0]}, ${targetRgb[1]}, ${targetRgb[2]})`;
            gameTarget.setAttribute('aria-label', levelData.n);
        }

        const gameHint = getElementByIdSafe('game-hint');
        if (gameHint) {
            gameHint.textContent = levelData.h;
        }

        // キラお題抽選 (15%の確率)
        state.game.isShiny = Math.random() < 0.15;
        const sparkles = getElementByIdSafe('target-shiny-sparkles');
        const label = getElementByIdSafe('game-target-shine-label');
        if (sparkles && label) {
            if (state.game.isShiny) {
                sparkles.classList.remove('hidden');
                label.textContent = "✨キラお題 (1.5倍)✨";
                label.classList.add('text-yellow-500', 'font-black');
                startShinySparkleLoop();
            } else {
                sparkles.classList.add('hidden');
                label.textContent = "おてほん";
                label.classList.remove('text-yellow-500', 'font-black');
                stopShinySparkleLoop();
            }
        } else {
            stopShinySparkleLoop();
        }

        const gameR = getElementByIdSafe('game-r');
        const gameG = getElementByIdSafe('game-g');
        const gameB = getElementByIdSafe('game-b');
        if (gameR) gameR.value = '128';
        if (gameG) gameG.value = '128';
        if (gameB) gameB.value = '128';
        updateGamePreview();
        updateRgbAssistLabels(targetRgb, [128, 128, 128]);

        const checkBtn = getElementByIdSafe(SELECTORS.CHECK_BUTTON);
        if (checkBtn) {
            checkBtn.classList.remove('hidden');
            checkBtn.disabled = false;
        }
        const resultModal = getElementByIdSafe(SELECTORS.RESULT_MODAL);
        if (resultModal) {
            resultModal.classList.add('hidden');
            resultModal.setAttribute('aria-hidden', 'true');
        }
        state.game.isChecking = false;
    }

    function updateGamePreview() {
        const gameR = getElementByIdSafe('game-r');
        const gameG = getElementByIdSafe('game-g');
        const gameB = getElementByIdSafe('game-b');
        const gamePlayer = getElementByIdSafe('game-player');
        const targetLevel = state.game.levels[state.game.mode === 'timeattack' ? 0 : state.game.currentLevelIndex];
        if (!gameR || !gameG || !gameB || !gamePlayer) {
            return;
        }

        const playerRgb = ColorLogic.normalizeRgbTuple([gameR.value, gameG.value, gameB.value], 128);
        gameR.value = String(playerRgb[0]);
        gameG.value = String(playerRgb[1]);
        gameB.value = String(playerRgb[2]);
        gamePlayer.style.backgroundColor = `rgb(${playerRgb[0]}, ${playerRgb[1]}, ${playerRgb[2]})`;

        if (targetLevel && Array.isArray(targetLevel.t)) {
            updateRgbAssistLabels(targetLevel.t, playerRgb);
        } else {
            updateRgbAssistLabels([128, 128, 128], playerRgb);
        }
    }

    function checkAnswer() {
        if (state.game.state !== 'playing' || state.game.isChecking) {
            return;
        }

        const gameR = getElementByIdSafe('game-r');
        const gameG = getElementByIdSafe('game-g');
        const gameB = getElementByIdSafe('game-b');
        if (!gameR || !gameG || !gameB) {
            return;
        }

        const targetLevel = state.game.levels[state.game.mode === 'timeattack' ? 0 : state.game.currentLevelIndex];
        if (!targetLevel || !Array.isArray(targetLevel.t)) {
            console.error('[color_lab] 正解チェック対象のレベルが不正です');
            return;
        }

        state.game.lastActiveElementId = getActiveElementId() || SELECTORS.CHECK_BUTTON;
        state.game.isChecking = true;

        const playerRgb = ColorLogic.normalizeRgbTuple([gameR.value, gameG.value, gameB.value], 128);
        const targetRgb = ColorLogic.normalizeRgbTuple(targetLevel.t, 0);

        const baseScore = ColorLogic.calculateColorScore(playerRgb, targetRgb);
        const score = ColorLogic.applyShinyScoreMultiplier(baseScore, state.game.isShiny);
        
        if (state.game.mode === 'timeattack') {
            const timeBonus = ColorLogic.calculateTimeBonus(score);
            state.game.timeLeft += timeBonus;
            const display = getElementByIdSafe('game-timer-display');
            if (display) {
                display.textContent = String(state.game.timeLeft);
            }
            if (timeBonus > 0) {
                showToast(`タイムボーナス +${timeBonus}秒！`, 'success');
            }
            state.game.questionsSolved++;
        }
        
        state.game.progress = ColorLogic.applyRoundScore(state.game.progress, score);
        state.game.score = state.game.progress.totalScore;

        const checkBtn = getElementByIdSafe(SELECTORS.CHECK_BUTTON);
        if (checkBtn) {
            checkBtn.classList.add('hidden');
            checkBtn.disabled = true;
        }

        const modal = getElementByIdSafe(SELECTORS.RESULT_MODAL);
        if (modal) {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
        }

        const resultView = ColorLogic.getResultPresentation(score);
        const title = getElementByIdSafe('result-title');
        if (title) {
            title.textContent = resultView.title;
            title.className = resultView.className;
        }

        const resultScore = getElementByIdSafe('result-score');
        if (resultScore) {
            resultScore.textContent = `${score}てん`;
        }

        const star = document.createElement('span');
        star.className = "material-symbols-rounded text-sm " + (score >= 80 ? "text-yellow-400" : "text-slate-200");
        star.textContent = "star";
        const scoreStars = getElementByIdSafe('score-stars');
        if (scoreStars) {
            scoreStars.appendChild(star);
        }

        const nextLevelBtn = getElementByIdSafe(SELECTORS.NEXT_LEVEL_BUTTON);
        if (nextLevelBtn) {
            nextLevelBtn.focus();
        }
    }

    function nextLevel() {
        if (state.game.state !== 'playing' || !state.game.isChecking) {
            return;
        }

        if (state.game.mode === 'timeattack') {
            state.game.currentLevelIndex++;
            state.game.isChecking = false;
            
            const resultModal = getElementByIdSafe(SELECTORS.RESULT_MODAL);
            if (resultModal) {
                resultModal.classList.add('hidden');
                resultModal.setAttribute('aria-hidden', 'true');
            }
            
            const checkBtn = getElementByIdSafe(SELECTORS.CHECK_BUTTON);
            if (checkBtn) {
                checkBtn.classList.remove('hidden');
                checkBtn.disabled = false;
            }
            
            loadLevel(state.game.currentLevelIndex);
            restoreFocusById(state.game.lastActiveElementId, SELECTORS.CHECK_BUTTON);
            return;
        }

        state.game.progress = ColorLogic.advanceLevel(state.game.progress);
        state.game.currentLevelIndex = state.game.progress.currentLevelIndex;
        state.game.isChecking = false;

        if (state.game.progress.completed) {
            state.game.state = 'complete';
            stopShinySparkleLoop();
            showGameScreen('complete');
            
            const completeTitle = getElementByIdSafe('complete-title');
            const completeSubtitle = getElementByIdSafe('complete-subtitle');
            if (completeTitle) {
                completeTitle.textContent = "コース クリア！";
            }
            if (completeSubtitle) {
                completeSubtitle.textContent = `おめでとう！さいごまで できたね！`;
            }
            
            const scoreLabel = getElementByIdSafe('complete-score-label');
            if (scoreLabel) {
                scoreLabel.textContent = "あなたの スコア";
            }
            
            const scoreElement = getElementByIdSafe('final-score');
            if (scoreElement) {
                scoreElement.innerHTML = `${state.game.score}<span class="text-xl text-slate-400 ml-2" id="final-score-max">/ 1000</span>`;
            }
            
            const award = ColorLogic.getAward(state.game.score);
            const awardPanel = getElementByIdSafe('award-display-panel');
            const awardMedal = getElementByIdSafe('award-medal-emoji');
            const awardTitle = getElementByIdSafe('award-title-name');
            if (awardPanel && awardMedal && awardTitle) {
                awardMedal.textContent = award.medalEmoji;
                awardTitle.textContent = award.title;
                awardPanel.classList.remove('hidden');
            }
            
            saveHighScore(state.game.mode, state.game.score);
            markDailyStamp();
            
            restoreFocusById(SELECTORS.EXIT_GAME_COMPLETE_BUTTON, SELECTORS.EXIT_GAME_COMPLETE_BUTTON);
            return;
        }

        loadLevel(state.game.currentLevelIndex);
        restoreFocusById(state.game.lastActiveElementId, SELECTORS.CHECK_BUTTON);
    }

    /* ==================== EVENT LISTENERS (INIT) ==================== */

    function handleTabKeydown(event) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
            return;
        }
        event.preventDefault();
        if (event.key === 'ArrowLeft') {
            switchTab('lab');
            const labTab = getElementByIdSafe(SELECTORS.TAB_LAB);
            if (labTab) {
                labTab.focus();
            }
            return;
        }
        switchTab('game');
        const gameTab = getElementByIdSafe(SELECTORS.TAB_GAME);
        if (gameTab) {
            gameTab.focus();
        }
    }

    function initApp() {
        const colorNameDisplay = getElementByIdSafe('color-name-display');
        if (colorNameDisplay) {
            colorNameDisplay.textContent = "カスタムカラー";
        }

        // 動的レシピ、パレット、なまえ、きせかえ初期化
        renderRecipes();
        loadSavedColors();
        renderSavedColors();
        loadCharacterName();
        loadEquippedItem();

        // イベント登録 (お気に入りコンテナ)
        const savedContainer = getElementByIdSafe(SELECTORS.SAVED_COLORS_CONTAINER);
        if (savedContainer) {
            savedContainer.addEventListener('click', handlePaletteClick);
        }

        document.addEventListener('keydown', handleModalKeydown);

        // なまえ編集ボタン
        addListenerIfExists('edit-name-btn', 'click', editCharacterName);

        // きせかえ開閉・設定
        addListenerIfExists('open-dressup-btn', 'click', openDressupModal);
        addListenerIfExists('close-dressup-btn', 'click', closeDressupModal);
        addListenerIfExists('confirm-dressup-btn', 'click', confirmDressup);

        document.querySelectorAll('.dressup-item-btn').forEach(btn => {
            btn.addEventListener('click', handleDressupItemClick);
        });

        // まぜるボタン
        addListenerIfExists('blend-colors-btn', 'click', handleBlendColors);

        // 反対の色ボタン
        addListenerIfExists('complementary-color-btn', 'click', setComplementaryColor);

        // レシピ切り替えタブ
        addListenerIfExists('recipe-tab-basic', 'click', () => switchRecipeTab('basic'));
        addListenerIfExists('recipe-tab-fantasy', 'click', () => switchRecipeTab('fantasy'));

        for (const name of ['basic', 'fantasy']) {
            addListenerIfExists(`recipe-tab-${name}`, 'keydown', event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === 'Home' ? 'basic' : event.key === 'End' ? 'fantasy' : name === 'basic' ? 'fantasy' : 'basic';
                switchRecipeTab(next);
                getElementByIdSafe(`recipe-tab-${next}`).focus();
            });
        }

        // コード形式切り替え
        addListenerIfExists('hex-code', 'click', toggleCodeFormat);

        // 一度きりの反応が通常の揺れを隠したまま残らないようにする。
        addListenerIfExists('blob-character', 'animationend', event => {
            if (event.target === event.currentTarget && event.animationName === 'jelly') {
                event.currentTarget.classList.remove('animate-jelly');
            }
        });

        // スライダー等
        updateLab();

        ['slider-r', 'slider-g', 'slider-b'].forEach((id) => {
            addListenerIfExists(id, 'input', () => {
                cancelBlend();
                state.lab.colorName = null;
                state.lab.isUsingRecipe = false;
                const colorType = id.split('-')[1]; // 'r', 'g', 'b'
                triggerColorDrop(colorType);
                updateLab();
            });
        });

        addListenerIfExists('copy-color-btn', 'click', copyColor);

        addListenerIfExists(SELECTORS.TAB_LAB, 'click', () => switchTab('lab'));
        addListenerIfExists(SELECTORS.TAB_GAME, 'click', () => switchTab('game'));
        addListenerIfExists(SELECTORS.TAB_LAB, 'keydown', handleTabKeydown);
        addListenerIfExists(SELECTORS.TAB_GAME, 'keydown', handleTabKeydown);

        addListenerIfExists('start-normal-game', 'click', () => startGame('normal', 'start-normal-game'));
        addListenerIfExists('start-challenge-game', 'click', () => startGame('challenge', 'start-challenge-game'));
        addListenerIfExists('start-timeattack-game', 'click', () => startGame('timeattack', 'start-timeattack-game'));

        addListenerIfExists('open-calendar-btn', 'click', openCalendarModal);
        addListenerIfExists('close-calendar-btn', 'click', closeCalendarModal);
        addListenerIfExists('close-calendar-btn-bottom', 'click', closeCalendarModal);
        
        addListenerIfExists('open-trophy-btn', 'click', openTrophyModal);
        addListenerIfExists('close-trophy-btn', 'click', closeTrophyModal);
        addListenerIfExists('close-trophy-btn-bottom', 'click', closeTrophyModal);

        ['game-r', 'game-g', 'game-b'].forEach((id) => {
            addListenerIfExists(id, 'input', updateGamePreview);
        });

        addListenerIfExists(SELECTORS.EXIT_GAME_BUTTON, 'click', exitGame);
        addListenerIfExists(SELECTORS.CHECK_BUTTON, 'click', checkAnswer);
        addListenerIfExists(SELECTORS.NEXT_LEVEL_BUTTON, 'click', nextLevel);
        addListenerIfExists(SELECTORS.EXIT_GAME_COMPLETE_BUTTON, 'click', exitGame);

        // タブ切り替え時（非表示時）のタイマー一時停止・再開処理（ホスピタリティ・省エネ）
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (state.game.state === 'playing' && state.game.mode === 'timeattack') {
                    stopTimer();
                    state.game.timerSuspended = true;
                }
                stopShinySparkleLoop();
            } else {
                if (state.game.state === 'playing' && state.game.mode === 'timeattack' && state.game.timerSuspended) {
                    startTimer();
                    state.game.timerSuspended = false;
                }
                if (state.game.state === 'playing' && state.game.isShiny) {
                    startShinySparkleLoop();
                }
            }
        });

        switchTab('lab');
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initApp);
        } else {
            initApp();
        }
    }
    // ===================================
    // EXPORTS FOR TESTING (BACKWARD COMPATIBILITY)
    // ===================================
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            rgbToHex: ColorLogic.rgbToHex,
            getTextColor: ColorLogic.getTextColor,
            coerceRgbValue: ColorLogic.coerceRgbValue,
            calculateColorScore: ColorLogic.calculateColorScore,
            getResultPresentation: ColorLogic.getResultPresentation,
            formatRgbLabel: ColorLogic.formatRgbLabel,
            createGameProgress: ColorLogic.createGameProgress,
            applyRoundScore: ColorLogic.applyRoundScore,
            advanceLevel: ColorLogic.advanceLevel
        };
    }
})();


