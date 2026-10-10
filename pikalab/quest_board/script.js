/**
 * Quest Board - おうちクエストボード
 * スタンプラリー形式の習慣トラッカー
 */

// ===================================
// Configuration
// ===================================
const CONFIG = {
    TOAST_DURATION: 3000,
    MAX_VISIBLE_TOASTS: 3,
    MIN_COUNT: 5,
    MAX_COUNT: 35,
    DEFAULT_COUNT: 10,
    DEBOUNCE_DELAY: 100,
    MAX_TITLE_LENGTH: 30,
    MAX_REWARD_LENGTH: 30,
    MAX_SHARE_PARAM_LENGTH: 4096,
    STORAGE_KEY: 'questBoardData'
};

// ===================================
// DOM Elements Cache
// ===================================
const elements = {};
const questBoardState = {
    lastRenderedCount: null,
    persistedState: null,
    dirtyCount: false,
    composing: new Set(),
    saveWarningShown: false,
    scaleFrame: null,
    observesLayout: false
};
const modalState = {
    lastFocusedElement: null,
    pendingSharedQuest: null
};

// ===================================
// Utility: Debounce
// ===================================
function debounce(func, wait) {
    let timeout = null;
    let pendingArgs = null;
    const run = () => {
        if (timeout !== null) clearTimeout(timeout);
        timeout = null;
        if (!pendingArgs) return;
        const args = pendingArgs;
        pendingArgs = null;
        func(...args);
    };
    const debounced = (...args) => {
        pendingArgs = args;
        if (timeout !== null) clearTimeout(timeout);
        timeout = setTimeout(run, wait);
    };
    debounced.flush = run;
    debounced.cancel = () => {
        if (timeout !== null) clearTimeout(timeout);
        timeout = null;
        pendingArgs = null;
    };
    return debounced;
}

function normalizeCount(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
        return CONFIG.DEFAULT_COUNT;
    }
    return Math.max(CONFIG.MIN_COUNT, Math.min(CONFIG.MAX_COUNT, parsed));
}

function countCharacters(value) {
    const text = typeof value === 'string' ? value : String(value ?? '');
    return Array.from(text).length;
}

function truncateCharacters(value, maxLength) {
    const text = typeof value === 'string' ? value : String(value ?? '');
    const parsedMax = Number(maxLength);
    const safeMax = Number.isFinite(parsedMax) ? Math.max(0, Math.floor(parsedMax)) : 0;
    return Array.from(text).slice(0, safeMax).join('');
}

function calculateContainScale(containerWidth, containerHeight, contentWidth, contentHeight, minScale = 0.1, maxScale = 1) {
    const safeContainerWidth = Number(containerWidth);
    const safeContainerHeight = Number(containerHeight);
    const safeContentWidth = Number(contentWidth);
    const safeContentHeight = Number(contentHeight);
    const safeMinScale = Number(minScale);
    const safeMaxScale = Number(maxScale);

    if (!Number.isFinite(safeContainerWidth) || !Number.isFinite(safeContainerHeight)
        || !Number.isFinite(safeContentWidth) || !Number.isFinite(safeContentHeight)
        || safeContainerWidth <= 0 || safeContainerHeight <= 0
        || safeContentWidth <= 0 || safeContentHeight <= 0
        || !Number.isFinite(safeMinScale) || !Number.isFinite(safeMaxScale)
        || safeMinScale <= 0 || safeMaxScale <= 0 || safeMinScale > safeMaxScale) {
        return 1;
    }

    const scaleWidth = safeContainerWidth / safeContentWidth;
    const scaleHeight = safeContainerHeight / safeContentHeight;
    const rawScale = Math.min(scaleWidth, scaleHeight, safeMaxScale);

    return Math.max(rawScale, safeMinScale);
}

function parseStampIndex(value, maxCount) {
    const parsedIndex = typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value)) ? Number(value) : NaN;
    const safeMaxCount = Number(maxCount);
    if (!Number.isInteger(parsedIndex) || !Number.isInteger(safeMaxCount) || safeMaxCount < 1) {
        return null;
    }
    if (parsedIndex < 1 || parsedIndex > safeMaxCount) {
        return null;
    }
    return parsedIndex;
}

function resizeStampState(stamps, count) {
    const safeCount = normalizeCount(count);
    const source = Array.isArray(stamps) ? stamps : [];
    return Array.from({ length: safeCount }, (_, index) => source[index] === true);
}

function normalizeStoredQuestData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

    const count = normalizeCount(data.count);
    return {
        title: typeof data.title === 'string'
            ? truncateCharacters(data.title, CONFIG.MAX_TITLE_LENGTH)
            : '',
        count,
        reward: typeof data.reward === 'string'
            ? truncateCharacters(data.reward, CONFIG.MAX_REWARD_LENGTH)
            : '',
        stamps: resizeStampState(data.stamps, count)
    };
}

// ===================================
// Storage: LocalStorage管理
// ===================================
const Storage = {
    save(data) {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            console.warn('LocalStorageへの保存に失敗しました:', error);
            return false;
        }
    },
    read() {
        try {
            const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (raw === null) return { ok: true, data: null };
            const data = normalizeStoredQuestData(JSON.parse(raw));
            return { ok: !!data, data };
        } catch (error) {
            console.warn('LocalStorageからの読み込みに失敗しました:', error);
            return { ok: false, data: null };
        }
    }
};

// ===================================
// State Management
// ===================================
let stampState = [];
let flushPendingBoard = () => {};

function getState(includeProgress = true) {
    const count = normalizeCount(elements.questCount?.value);
    return {
        title: truncateCharacters(elements.questTitle?.value || '', CONFIG.MAX_TITLE_LENGTH),
        count,
        reward: truncateCharacters(elements.questReward?.value || '', CONFIG.MAX_REWARD_LENGTH),
        stamps: includeProgress ? resizeStampState(stampState, count) : new Array(count).fill(false)
    };
}

function mergeQuestState(base, local, remote) {
    if (!base || !remote) return local;
    const count = local.count !== base.count ? local.count : remote.count;
    return {
        title: local.title !== base.title ? local.title : remote.title,
        count,
        reward: local.reward !== base.reward ? local.reward : remote.reward,
        stamps: Array.from({ length: count }, (_, index) => {
            const previous = base.stamps[index] === true;
            const current = local.stamps[index] === true;
            return current !== previous ? current : remote.stamps[index] === true;
        })
    };
}

function applyQuestState(data) {
    elements.questTitle.value = data.title;
    elements.questCount.value = String(data.count);
    elements.questReward.value = data.reward;
    stampState = resizeStampState(data.stamps, data.count);
    updateBoard(false);
    // 回数が同じときはボタンを作り直さず、フォーカスと既存DOMを保つ。
    elements.stampGrid.querySelectorAll('.stamp-spot').forEach((spot, index) => {
        spot.classList.toggle('stamped', stampState[index]);
        spot.setAttribute('aria-pressed', String(stampState[index]));
    });
}

function applyStampOperation(data, operation) {
    if (!operation) return data;
    return { ...data, stamps: data.stamps.map((stamp, offset) => {
        const inRange = operation.stamped ? offset < operation.index : offset >= operation.index - 1;
        return inRange ? operation.stamped : stamp;
    }) };
}

function saveState(stampOperation = null) {
    const local = getState();
    const remote = Storage.read();
    const next = applyStampOperation(mergeQuestState(questBoardState.persistedState, local, remote.ok ? remote.data : null), stampOperation);
    const serialized = JSON.stringify(next);
    const alreadySaved = remote.ok && JSON.stringify(remote.data) === serialized;
    const saved = alreadySaved || Storage.save(next);
    if (saved) {
        questBoardState.persistedState = next;
        questBoardState.saveWarningShown = false;
    } else if (!questBoardState.saveWarningShown) {
        questBoardState.saveWarningShown = true;
        showToast('この端末に保存できませんでした。画面を閉じる前に、進捗を含む共有リンクで控えてください', 'info');
    }
    if (serialized !== JSON.stringify(local)) applyQuestState(next);
    return saved;
}

function loadState() {
    const loaded = Storage.read();
    if (!loaded.ok || !loaded.data) return false;
    questBoardState.persistedState = loaded.data;
    elements.questTitle.value = loaded.data.title;
    elements.questCount.value = String(loaded.data.count);
    elements.questReward.value = loaded.data.reward;
    stampState = loaded.data.stamps;
    return true;
}

function syncStoredState() {
    if (questBoardState.dirtyCount || questBoardState.composing.size) return;
    const remote = Storage.read();
    if (!remote.ok) return;
    // 別タブでの削除を受けた後、閲覧だけで古い保存値を復活させない。
    if (!remote.data) {
        questBoardState.persistedState = getState();
        return;
    }
    const next = mergeQuestState(questBoardState.persistedState, getState(), remote.data);
    questBoardState.persistedState = remote.data;
    if (JSON.stringify(next) !== JSON.stringify(getState())) applyQuestState(next);
}

// ===================================
// Toast Notification System
// ===================================
function showToast(message, type = 'info') {
    if (!elements.toastContainer) return;

    while (elements.toastContainer.children.length >= CONFIG.MAX_VISIBLE_TOASTS) {
        elements.toastContainer.firstElementChild?.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');

    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded';
    icon.setAttribute('aria-hidden', 'true');

    switch (type) {
        case 'success':
            icon.textContent = 'check_circle';
            break;
        case 'info':
        default:
            icon.textContent = 'info';
    }

    toast.appendChild(icon);
    toast.appendChild(document.createTextNode(message));
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, CONFIG.TOAST_DURATION);
}

// ===================================
// Grid Generation
// ===================================
function generateGrid(count) {
    const grid = elements.stampGrid;
    if (!grid) return;

    grid.innerHTML = '';

    const template = elements.stampIconTemplate;
    const fragment = document.createDocumentFragment();

    for (let i = 1; i <= count; i++) {
        const spot = document.createElement('button');
        spot.type = 'button';
        spot.className = 'stamp-spot';
        spot.setAttribute('aria-label', `スタンプ ${i}`);
        spot.dataset.index = i;

        // 保存されたスタンプ状態を復元
        const isStamped = stampState[i - 1] === true;
        if (isStamped) {
            spot.classList.add('stamped');
        }
        spot.setAttribute('aria-pressed', isStamped ? 'true' : 'false');

        if (i === count) {
            spot.classList.add('goal');
        }

        const numSpan = document.createElement('span');
        numSpan.className = 'stamp-number';
        numSpan.textContent = i;

        const markDiv = document.createElement('div');
        markDiv.className = 'stamp-mark';

        if (template) {
            markDiv.appendChild(template.content.cloneNode(true));
        }

        spot.appendChild(numSpan);
        spot.appendChild(markDiv);
        fragment.appendChild(spot);
    }

    grid.appendChild(fragment);
    questBoardState.lastRenderedCount = count;
}

// ===================================
// Audio Manager (サウンド制御モジュール)
// ===================================
const AudioManager = {
    audioCtx: null,
    isMuted: false,
    volumeRatio: 0.1, // デフォルト (db = -20)

    init() {
        if (typeof window === 'undefined') return;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        if (!this.audioCtx) {
            try { this.audioCtx = new Ctx(); }
            catch { return; }
        }
        this.isMuted = false;
        this.volumeRatio = 0.1;
        
        // wonder_school_profile_v2 から設定を同期
        try {
            const stored = localStorage.getItem('wonder_school_profile_v2');
            if (stored) {
                const data = JSON.parse(stored);
                if (data && typeof data === 'object' && data.isMuted !== undefined) {
                    this.isMuted = !!data.isMuted;
                }
                if (typeof data?.volumeDb === 'number' && Number.isFinite(data.volumeDb)) {
                    const db = Math.max(-40, Math.min(0, data.volumeDb));
                    if (db <= -40) {
                        this.isMuted = true;
                        this.volumeRatio = 0;
                    } else {
                        this.volumeRatio = Math.pow(10, db / 40);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to load volume in QuestBoard AudioManager:", e);
        }

        if (this.audioCtx.state === 'suspended') {
            try { Promise.resolve(this.audioCtx.resume()).catch(() => {}); } catch { /* 音声の失敗でスタンプを止めない。 */ }
        }
    },

    playSparkle() {
        this.init();
        if (!this.audioCtx || this.isMuted) return;

        try {
            const now = this.audioCtx.currentTime;
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, i) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = freq;
                
                const delay = i * 0.05; // 50msずれ
                const dur = 0.15;
                
                gain.gain.setValueAtTime(0, now + delay);
                gain.gain.linearRampToValueAtTime(0.08 * this.volumeRatio, now + delay + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
                
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                
                osc.start(now + delay);
                osc.stop(now + delay + dur + 0.01);
                
                osc.onended = () => {
                    osc.disconnect();
                    gain.disconnect();
                };
            });
        } catch (e) {
            console.warn('Failed to play sparkle sound:', e);
        }
    },

    playClick() {
        this.init();
        if (!this.audioCtx || this.isMuted) return;

        try {
            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
            
            gain.gain.setValueAtTime(0.05 * this.volumeRatio, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            
            osc.start(now);
            osc.stop(now + 0.05);
            
            osc.onended = () => {
                osc.disconnect();
                gain.disconnect();
            };
        } catch (e) {
            // ignore
        }
    }
};

// ===================================
// Stamp Toggle (累積スタンプシステム)
// ===================================
function toggleStamp(spot) {
    if (!spot || !elements.stampGrid || !elements.stampGrid.contains(spot)) return;
    flushPendingBoard();
    syncStoredState();

    const allSpots = elements.stampGrid.querySelectorAll('.stamp-spot');
    const clickedIndex = parseStampIndex(spot.dataset.index, allSpots.length);
    if (clickedIndex === null) return;

    // クリックしたスタンプが既にスタンプ済みかどうか
    const wasStamped = stampState[clickedIndex - 1] === true;

    if (wasStamped) {
        // 誤リセット防止ロック
        if (!confirm('本当にスタンプを消しますか？\n（このスタンプから先がすべて消えます）')) {
            return;
        }
        AudioManager.playClick();
        // スタンプ済みをクリック → このスタンプ以降を全て解除
        allSpots.forEach(s => {
            const idx = parseStampIndex(s.dataset.index, allSpots.length);
            if (idx !== null && idx >= clickedIndex) {
                s.classList.remove('stamped');
                s.setAttribute('aria-pressed', 'false');
                stampState[idx - 1] = false;
            }
        });
    } else {
        AudioManager.playSparkle();
        // 未スタンプをクリック → このスタンプ以下を全てスタンプ
        allSpots.forEach(s => {
            const idx = parseStampIndex(s.dataset.index, allSpots.length);
            if (idx !== null && idx <= clickedIndex) {
                s.classList.add('stamped');
                s.setAttribute('aria-pressed', 'true');
                stampState[idx - 1] = true;
            }
        });

        // ゴール達成チェック
        if (clickedIndex === allSpots.length) {
            showToast('🎉 おめでとう！ゴール達成！', 'success');
        }
    }

    // 確認ダイアログ中の別タブ更新にも、明示した累積範囲の操作を適用する。
    saveState({ index: clickedIndex, stamped: !wasStamped });
}

// ===================================
// Event Delegation for Stamp Grid
// ===================================
function handleStampGridInteraction(event) {
    if (!(event.target instanceof Element)) return;
    const spot = event.target.closest('.stamp-spot');
    if (!spot) return;

    toggleStamp(spot);
}

// ===================================
// Board Update
// ===================================
function updateBoard(shouldPersist = true) {
    if (questBoardState.composing.size) return;
    const titleValue = truncateCharacters(elements.questTitle?.value || '', CONFIG.MAX_TITLE_LENGTH);
    const rewardValue = truncateCharacters(elements.questReward?.value || '', CONFIG.MAX_REWARD_LENGTH);
    const title = titleValue || 'クエスト名未設定';
    const count = normalizeCount(elements.questCount?.value);
    const reward = rewardValue || 'ごほうび未設定';

    if (elements.questTitle && elements.questTitle.value !== titleValue) {
        elements.questTitle.value = titleValue;
    }
    if (elements.questReward && elements.questReward.value !== rewardValue) {
        elements.questReward.value = rewardValue;
    }

    // textContentはHTMLを解釈しないため、XSSリスクなし
    if (elements.dispTitle && elements.dispTitle.textContent !== title) elements.dispTitle.textContent = title;

    if (elements.dispReward && elements.dispReward.textContent !== reward) elements.dispReward.textContent = reward;

    if (elements.countVal && elements.countVal.textContent !== String(count)) elements.countVal.textContent = String(count);

    if (elements.questCount) {
        elements.questCount.value = String(count);
    }

    // 回数を変更しても、範囲内に残る獲得済みスタンプは保持する
    stampState = resizeStampState(stampState, count);

    const shouldRegenerateGrid = !!elements.stampGrid && (
        elements.stampGrid.childElementCount !== count ||
        questBoardState.lastRenderedCount !== count
    );

    if (shouldRegenerateGrid) {
        generateGrid(count);
    }
    if (shouldRegenerateGrid || !questBoardState.observesLayout) requestScale();
    if (shouldPersist) {
        saveState();
    }
}

// ===================================
// Scale Adjustment (Responsive)
// ===================================
function requestScale() {
    if (questBoardState.scaleFrame !== null) return;
    questBoardState.scaleFrame = requestAnimationFrame(() => {
        questBoardState.scaleFrame = null;
        adjustScale();
    });
}

function adjustScale() {
    const container = elements.questContainer;
    const card = elements.questCard;
    const grid = elements.stampGrid;
    if (!container || !card || !grid || window.matchMedia('print').matches) return;
    const count = normalizeCount(elements.questCount.value);
    const narrow = window.matchMedia('(max-width: 767px)').matches;
    if (!narrow) {
        const preferred = count > 28 ? 7 : count > 21 ? 6 : count > 15 ? 5 : count > 9 ? 4 : 3;
        const gap = parseFloat(getComputedStyle(grid).columnGap) || 15;
        const fitting = Math.max(1, Math.floor((grid.clientWidth + gap) / (44 + gap)));
        grid.style.gridTemplateColumns = `repeat(${Math.min(preferred, fitting)}, 1fr)`;
    }
    const cardW = card.offsetWidth;
    const cardH = card.offsetHeight;
    if (cardW <= 0 || cardH <= 0) return;
    const rawScale = calculateContainScale(Math.max(container.clientWidth - 40, 1), Math.max(container.clientHeight - 80, 1), cardW, cardH);
    const spots = [...grid.children];
    const smallest = Math.min(...spots.map(spot => {
        const style = getComputedStyle(spot);
        return Math.min(parseFloat(style.width), parseFloat(style.height));
    }));
    // CSSの44pxをボード全体の縮小で打ち消さない。縦に収まらない場合はスクロールする。
    const scale = Math.min(1, Math.max(rawScale, smallest > 0 ? 44 / smallest : 1));
    const transform = `scale(${scale})`;
    if (card.style.transform !== transform) card.style.transform = transform;
    container.classList.toggle('quest-scroll-board', cardH > container.clientHeight - 32);
}

// ===================================
// Print Function
// ===================================
function preparePrint() {
    flushPendingBoard();
    if (!questBoardState.composing.size) updateBoard(false);
    document.body.classList.toggle('print-stamps', !!elements.printWithStamps?.checked);
    const count = normalizeCount(elements.questCount.value);
    // 印刷は画面幅に依存せず、既存の回数別の列構成を使う。
    const columns = count > 28 ? 7 : count > 21 ? 6 : count > 15 ? 5 : count > 9 ? 4 : 3;
    elements.stampGrid.style.setProperty('--print-columns', columns);
    elements.stampGrid.style.setProperty('--print-rows', Math.ceil(count / columns));
}

function handlePrint() {
    preparePrint();
    window.print();
}

// ===================================
// Input Validation
// ===================================
function enforceMaxLength(input, maxLength) {
    if (!input || typeof input.value !== 'string') return;
    const truncated = truncateCharacters(input.value, maxLength);
    if (input.value !== truncated) {
        input.value = truncated;
    }
}

// ===================================
// Initialization
// ===================================
function initializeElements() {
    elements.questTitle = document.getElementById('quest-title');
    elements.questCount = document.getElementById('quest-count');
    elements.questReward = document.getElementById('quest-reward');
    elements.countVal = document.getElementById('count-val');
    elements.dispTitle = document.getElementById('disp-title');
    elements.dispReward = document.getElementById('disp-reward');
    elements.stampGrid = document.getElementById('stamp-grid');
    elements.questCard = document.getElementById('quest-card');
    elements.questContainer = document.querySelector('.quest-container');
    elements.printBtn = document.getElementById('print-btn');
    elements.toastContainer = document.getElementById('toast-container');
    elements.stampIconTemplate = document.getElementById('stamp-icon-template');
    elements.shareBtn = document.getElementById('share-btn');
    elements.shareModal = document.getElementById('share-modal');
    elements.shareCloseBtn = document.getElementById('share-close-btn');
    elements.shareCopyBtn = document.getElementById('share-copy-btn');
    elements.shareLinkInput = document.getElementById('share-link-input');
    elements.shareQrcode = document.getElementById('share-qrcode');
    elements.shareImportModal = document.getElementById('share-import-modal');
    elements.shareImportPreview = document.getElementById('share-import-preview');
    elements.shareImportConfirmBtn = document.getElementById('share-import-confirm-btn');
    elements.shareImportCancelBtn = document.getElementById('share-import-cancel-btn');
    elements.printWithStamps = document.getElementById('print-with-stamps');
}

function validateRequiredElements() {
    const requiredEntries = [
        ['questTitle', elements.questTitle, '#quest-title'],
        ['questCount', elements.questCount, '#quest-count'],
        ['questReward', elements.questReward, '#quest-reward'],
        ['countVal', elements.countVal, '#count-val'],
        ['dispTitle', elements.dispTitle, '#disp-title'],
        ['dispReward', elements.dispReward, '#disp-reward'],
        ['stampGrid', elements.stampGrid, '#stamp-grid'],
        ['questCard', elements.questCard, '#quest-card'],
        ['questContainer', elements.questContainer, '.quest-container'],
        ['printBtn', elements.printBtn, '#print-btn'],
        ['toastContainer', elements.toastContainer, '#toast-container'],
        ['stampIconTemplate', elements.stampIconTemplate, '#stamp-icon-template']
    ];

    const missingSelectors = requiredEntries
        .filter(([, element]) => !element)
        .map(([, , selector]) => selector);
    if (missingSelectors.length === 0) return true;

    console.error(`初期化に失敗しました。必須DOM要素が不足しています: ${missingSelectors.join(', ')}`);
    return false;
}

function setupEventListeners() {
    const pendingCount = debounce(() => {
        if (questBoardState.composing.size) return;
        questBoardState.dirtyCount = false;
        updateBoard();
    }, CONFIG.DEBOUNCE_DELAY);
    const debouncedAdjustScale = debounce(requestScale, CONFIG.DEBOUNCE_DELAY);
    flushPendingBoard = () => pendingCount.flush();

    for (const input of [elements.questTitle, elements.questReward]) {
        const limit = input === elements.questTitle ? CONFIG.MAX_TITLE_LENGTH : CONFIG.MAX_REWARD_LENGTH;
        const commitInput = () => {
            enforceMaxLength(input, limit);
            pendingCount.cancel();
            questBoardState.dirtyCount = false;
            updateBoard();
        };
        input.addEventListener('compositionstart', () => {
            // スライダーの遅延描画を変換開始前に確定し、変換中の文字を後から切らない。
            pendingCount.flush();
            questBoardState.composing.add(input);
        });
        input.addEventListener('compositionend', () => {
            questBoardState.composing.delete(input);
            commitInput();
        });
        input.addEventListener('input', event => {
            if (!event.isComposing && !questBoardState.composing.has(input)) commitInput();
        });
    }
    elements.questCount.addEventListener('input', () => {
        const count = normalizeCount(elements.questCount.value);
        elements.questCount.value = String(count);
        elements.countVal.textContent = String(count);
        questBoardState.dirtyCount = true;
        pendingCount();
    });
    elements.questCount.addEventListener('change', () => {
        if (questBoardState.dirtyCount) pendingCount.flush();
    });
    elements.printBtn.addEventListener('click', handlePrint);
    elements.printWithStamps?.addEventListener('change', () => {
        document.body.classList.toggle('print-stamps', elements.printWithStamps.checked);
    });
    elements.stampGrid.addEventListener('click', handleStampGridInteraction);
    window.addEventListener('resize', debouncedAdjustScale);
    window.addEventListener('orientationchange', debouncedAdjustScale);
    window.addEventListener('load', requestScale, { once: true });
    window.addEventListener('beforeprint', preparePrint);
    window.addEventListener('afterprint', requestScale);
    window.addEventListener('pagehide', flushPendingBoard);
    window.addEventListener('storage', event => {
        if (event.key === CONFIG.STORAGE_KEY || event.key === null) syncStoredState();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) flushPendingBoard();
        else syncStoredState();
    });
    if (typeof ResizeObserver === 'function') {
        const observer = new ResizeObserver(requestScale);
        observer.observe(elements.questCard);
        observer.observe(elements.questContainer);
        questBoardState.observesLayout = true;
    }
    if (document.fonts?.ready) document.fonts.ready.then(requestScale).catch(() => {});
}

function setBackgroundInteractivity(disabled) {
    const backgroundTargets = [
        document.querySelector('header'),
        document.getElementById('main-content'),
        document.querySelector('.skip-link')
    ];

    backgroundTargets.forEach((target) => {
        if (!target) return;
        if (disabled) {
            target.setAttribute('aria-hidden', 'true');
            target.setAttribute('inert', '');
        } else {
            target.removeAttribute('aria-hidden');
            target.removeAttribute('inert');
        }
    });
}

// ===================================
// Help Modal for Parents
// ===================================
function initHelpModal() {
    // 開閉処理は index.html 内のインラインスクリプトで初期化する。
}

function encodeUtf8ToBase64Url(value) {
    const bytes = new TextEncoder().encode(String(value ?? ''));
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function decodeBase64UrlToUtf8(base64Url) {
    let standardBase64 = String(base64Url ?? '')
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    while (standardBase64.length % 4) {
        standardBase64 += '=';
    }

    const binary = atob(standardBase64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function serializeQuestData(data) {
    try {
        return encodeUtf8ToBase64Url(JSON.stringify(data));
    } catch (e) {
        console.error('シリアライズ失敗:', e);
        return '';
    }
}

function deserializeQuestData(base64Str) {
    try {
        return JSON.parse(decodeBase64UrlToUtf8(base64Str));
    } catch (e) {
        console.error('デシリアライズ失敗:', e);
        return null;
    }
}

function validateQuestShareData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const allowedKeys = ['title', 'count', 'reward', 'stamps'];
    const dataKeys = Object.keys(data);
    if (dataKeys.length !== allowedKeys.length || dataKeys.some((key) => !allowedKeys.includes(key))) return null;
    if (typeof data.title !== 'string' || countCharacters(data.title) > CONFIG.MAX_TITLE_LENGTH) return null;
    if (typeof data.reward !== 'string' || countCharacters(data.reward) > CONFIG.MAX_REWARD_LENGTH) return null;
    if (!Number.isInteger(data.count) || data.count < CONFIG.MIN_COUNT || data.count > CONFIG.MAX_COUNT) return null;
    if (!Array.isArray(data.stamps) || data.stamps.length !== data.count) return null;
    if (!data.stamps.every((stamp) => typeof stamp === 'boolean')) return null;

    return {
        title: data.title,
        count: data.count,
        reward: data.reward,
        stamps: [...data.stamps]
    };
}

function parseQuestShareData(base64Str) {
    if (typeof base64Str !== 'string'
        || base64Str.length === 0
        || base64Str.length > CONFIG.MAX_SHARE_PARAM_LENGTH
        || !/^[A-Za-z0-9_-]+$/.test(base64Str)) {
        return null;
    }
    return validateQuestShareData(deserializeQuestData(base64Str));
}

function getQuestShareDataFromSearch(search) {
    if (typeof search !== 'string') return null;
    const urlParams = new URLSearchParams(search);
    const qValues = urlParams.getAll('q');
    return qValues.length === 1 ? parseQuestShareData(qValues[0]) : null;
}

function shouldPersistInitialQuestState(search) {
    if (typeof search !== 'string') return true;
    return !new URLSearchParams(search).has('q');
}

function clearShareUrlParam() {
    if (typeof window === 'undefined' || typeof window.history?.replaceState !== 'function') return;
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('q');
    window.history.replaceState(window.history.state, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
}

function closeShareImportModal() {
    if (!elements.shareImportModal) return;
    elements.shareImportModal.classList.add('hidden');
    elements.shareImportModal.classList.remove('flex');
    elements.shareImportModal.setAttribute('aria-hidden', 'true');
    setBackgroundInteractivity(false);
    elements.questTitle?.focus();
}

function cancelSharedQuestImport() {
    modalState.pendingSharedQuest = null;
    clearShareUrlParam();
    closeShareImportModal();
}

function importSharedQuestData() {
    const data = modalState.pendingSharedQuest;
    if (!data) return;

    if (elements.questTitle) {
        elements.questTitle.value = data.title;
    }
    if (elements.questCount) {
        elements.questCount.value = String(data.count);
    }
    if (elements.questReward) {
        elements.questReward.value = data.reward;
    }
    stampState = resizeStampState(data.stamps, data.count);
    generateGrid(data.count);

    modalState.pendingSharedQuest = null;
    // 明示した取り込みは現在のボード全体を置き換える。過去との差分合成をしない。
    questBoardState.persistedState = null;
    updateBoard();
    clearShareUrlParam();
    closeShareImportModal();
    showToast('🎉 共有されたクエストを読み込みました！', 'success');
}

function focusSharedQuestPreview() {
    requestAnimationFrame(() => {
        if (modalState.pendingSharedQuest && !elements.shareImportModal.classList.contains('hidden')) {
            elements.shareImportConfirmBtn.focus({ preventScroll: true });
        }
    });
}

function openShareImportPreview(data) {
    if (!elements.shareImportModal || !elements.shareImportPreview || !elements.shareImportConfirmBtn) {
        return false;
    }

    modalState.pendingSharedQuest = data;
    const completedCount = data.stamps.filter(Boolean).length;
    elements.shareImportPreview.textContent =
        `「${data.title || 'クエスト名未設定'}」／${data.count}回／スタンプ ${completedCount}個`;
    elements.shareImportModal.classList.remove('hidden');
    elements.shareImportModal.classList.add('flex');
    elements.shareImportModal.setAttribute('aria-hidden', 'false');
    setBackgroundInteractivity(true);
    elements.shareImportConfirmBtn.focus();
    focusSharedQuestPreview();
    return true;
}

function initShareImportModal() {
    if (!elements.shareImportModal || !elements.shareImportConfirmBtn || !elements.shareImportCancelBtn) return;
    // 初期URLのフラグメント移動がDOMContentLoaded後にフォーカスを奪っても戻す。
    window.addEventListener('load', focusSharedQuestPreview, { once: true });
    window.addEventListener('pageshow', focusSharedQuestPreview);
    elements.shareImportConfirmBtn.addEventListener('click', importSharedQuestData);
    elements.shareImportCancelBtn.addEventListener('click', cancelSharedQuestImport);
    elements.shareImportModal.addEventListener('click', (event) => {
        if (event.target === elements.shareImportModal) {
            cancelSharedQuestImport();
        }
    });
    elements.shareImportModal.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            cancelSharedQuestImport();
        } else if (event.key === 'Tab') {
            trapModalFocus(event, elements.shareImportModal);
        }
    });
}

function loadFromUrlParams(search = null) {
    if (typeof window === 'undefined') return false;
    const effectiveSearch = typeof search === 'string' ? search : window.location.search;
    const urlParams = new URLSearchParams(effectiveSearch);
    if (!urlParams.has('q')) return false;

    const data = getQuestShareDataFromSearch(effectiveSearch);
    if (!data) {
        clearShareUrlParam();
        showToast('共有データを読み込めませんでした', 'info');
        return false;
    }

    return openShareImportPreview(data);
}

function trapModalFocus(event, modal) {
    const focusable = [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter(node => !node.disabled && node.getClientRects().length > 0);
    const first = focusable[0], last = focusable.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

async function copyShareLink(value, input, isCurrent = () => true) {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch { /* 対応ブラウザでは選択範囲のコピーへフォールバックする。 */ }
    if (!input.isConnected || input.value !== value || !isCurrent()) return false;
    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);
    try { return document.execCommand('copy') === true; } catch { return false; }
}

function initShareModal() {
    const shareBtn = elements.shareBtn;
    const shareModal = elements.shareModal;
    const shareCloseBtn = elements.shareCloseBtn;
    const shareCopyBtn = elements.shareCopyBtn;
    const shareLinkInput = elements.shareLinkInput;
    const shareQrcode = elements.shareQrcode;
    const shareWithProgress = document.getElementById('share-with-progress');

    if (shareBtn && shareModal && shareCloseBtn && shareCopyBtn && shareLinkInput && shareQrcode) {
        let copyGeneration = 0;

        const updateShareContent = () => {
            copyGeneration++;
            shareCopyBtn.disabled = false;
            const includeProgress = !!(shareWithProgress && shareWithProgress.checked);
            const state = getState(includeProgress);
            const base64Data = serializeQuestData(state);

            shareQrcode.innerHTML = '';
            if (!base64Data) {
                shareLinkInput.value = '';
                shareQrcode.textContent = '共有リンクを作成できませんでした';
                return;
            }

            const shareUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + "?q=" + base64Data;
            shareLinkInput.value = shareUrl;

            // 既存のQRコード表示をクリアして再生成
            if (shareUrl.length > 1500) {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'text-xs text-red-500 font-bold p-3 border border-red-200 rounded-lg bg-red-50/50 text-center leading-relaxed';
                warningDiv.textContent = '文字数が多いためQRコードを自動生成できません。下の「コピー」ボタンをクリックして、リンクを直接共有してください。';
                shareQrcode.appendChild(warningDiv);
                return;
            }
            try {
                new QRCode(shareQrcode, {
                    text: shareUrl,
                    width: 180,
                    height: 180,
                    colorDark: "#292524",
                    colorLight: "#fafaf9",
                    correctLevel: QRCode.CorrectLevel.M
                });
                
                // qrcode.js が生成する canvas/img の親としてのスタイル調整
                const img = shareQrcode.querySelector('img');
                if (img) {
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'contain';
                }
            } catch (e) {
                console.error('QRコード生成失敗:', e);
                shareQrcode.textContent = 'QRコードの生成に失敗しました';
            }
        };

        const openShareModal = () => {
            if (!shareModal.classList.contains('hidden')) {
                return;
            }

            flushPendingBoard();
            syncStoredState();
            // モーダルを開くときはデフォルトで「進捗を含めない」をセット
            if (shareWithProgress) {
                shareWithProgress.checked = false;
            }
            updateShareContent();

            modalState.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            shareModal.classList.remove('hidden');
            shareModal.classList.add('flex');
            shareModal.setAttribute('aria-hidden', 'false');
            shareBtn.setAttribute('aria-expanded', 'true');
            setBackgroundInteractivity(true);
            shareCloseBtn.focus();
        };

        const closeShareModal = () => {
            if (shareModal.classList.contains('hidden')) {
                return;
            }
            copyGeneration++;
            shareCopyBtn.disabled = false;
            shareModal.classList.add('hidden');
            shareModal.classList.remove('flex');
            shareModal.setAttribute('aria-hidden', 'true');
            shareBtn.setAttribute('aria-expanded', 'false');
            setBackgroundInteractivity(false);
            if (modalState.lastFocusedElement) {
                modalState.lastFocusedElement.focus();
            } else {
                shareBtn.focus();
            }
        };

        shareCopyBtn.addEventListener('click', async () => {
            if (!shareLinkInput.value || shareCopyBtn.disabled) return;
            const generation = ++copyGeneration;
            shareCopyBtn.disabled = true;
            const copied = await copyShareLink(shareLinkInput.value, shareLinkInput, () => generation === copyGeneration && !shareModal.classList.contains('hidden')); 
            if (generation !== copyGeneration || shareModal.classList.contains('hidden')) return;
            shareCopyBtn.disabled = false;
            showToast(copied ? '📋 リンクをコピーしました！' : 'コピーできませんでした。リンクを選択して手動でコピーしてください', copied ? 'success' : 'info');
        });

        shareBtn.addEventListener('click', openShareModal);
        shareCloseBtn.addEventListener('click', closeShareModal);

        if (shareWithProgress) {
            shareWithProgress.addEventListener('change', updateShareContent);
        }

        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) {
                closeShareModal();
            }
        });

        shareModal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeShareModal();
                return;
            }

            if (e.key === 'Tab') trapModalFocus(e, shareModal);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !shareModal.classList.contains('hidden')) {
                e.preventDefault();
                closeShareModal();
            }
        });
    }
}

function initApp() {
    initializeElements();
    if (!validateRequiredElements()) return;
    setupEventListeners();

    // 既存データを先に復元し、共有データは確認後にだけ取り込む
    loadState();
    updateBoard(false);
    questBoardState.persistedState ||= getState();

    // モーダルの初期化
    initHelpModal();
    initShareModal();
    initShareImportModal();
    loadFromUrlParams();
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        initApp();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debounce,
        mergeQuestState,
        applyStampOperation,
        normalizeCount,
        countCharacters,
        truncateCharacters,
        normalizeStoredQuestData,
        calculateContainScale,
        parseStampIndex,
        resizeStampState,
        encodeUtf8ToBase64Url,
        decodeBase64UrlToUtf8,
        serializeQuestData,
        deserializeQuestData,
        validateQuestShareData,
        parseQuestShareData,
        getQuestShareDataFromSearch,
        shouldPersistInitialQuestState,
        loadFromUrlParams
    };
}

