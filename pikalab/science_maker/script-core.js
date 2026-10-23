/**
 * Science Maker - 自由研究「テーマ診断」＆「計画書」メーカー
 * 夏休み駆け込み寺
 */

// ===================================
// Configuration
// ===================================
const CONFIG = {
    TOAST_DURATION: 3000,
    TOAST_EXIT_DURATION: 300,
    MAX_VISIBLE_TOASTS: 3,
    MAX_SHARE_PARAM_LENGTH: 24000,
    MAX_SHARE_DATE_LENGTH: 30
};

const PLAN_FIELD_LIMITS = Object.freeze({
    studentName: 60,
    title: 80,
    motivation: 500,
    hypothesis: 500,
    materials: 300,
    method: 1000
});

const QUIZ_OPTIONS = Object.freeze({
    time: Object.freeze(['1day', '3days', '1week']),
    type: Object.freeze(['experiment', 'craft', 'observe', 'investigate'])
});

const STEP_IDS = Object.freeze(['step-quiz', 'step-results', 'step-plan']);

const TIME_LABEL_MAP = Object.freeze({
    '1day': '1日',
    '3days': '3日',
    '1week': '1週間'
});

const COMMON_SAFETY_NOTES = Object.freeze([
    '火気・加熱・刃物・薬品を使う作業は、必ず保護者の方と一緒に行ってください。',
    '実験中は飲食を避け、終了後は手洗いと片付けを行ってください。',
    '気分が悪くなったり、刺激を感じたら、すぐに中止して換気・洗浄をしてください。'
]);

const TOPIC_TYPE_META = Object.freeze({
    experiment: Object.freeze({ label: '実験', className: 'text-purple-600 bg-purple-100' }),
    craft: Object.freeze({ label: '工作', className: 'text-orange-600 bg-orange-100' }),
    observe: Object.freeze({ label: '観察', className: 'text-green-600 bg-green-100' }),
    investigate: Object.freeze({ label: '調べ学習', className: 'text-blue-600 bg-blue-100' })
});

const ACTIVE_DIAGNOSE_BUTTON_CLASSES = Object.freeze([
    'bg-gradient-to-r',
    'from-science-500',
    'to-lab-blue',
    'hover:from-science-600',
    'hover:to-blue-600',
    'hover:-translate-y-1',
    'shadow-xl',
    'cursor-pointer'
]);

const INACTIVE_DIAGNOSE_BUTTON_CLASSES = Object.freeze([
    'bg-gray-300',
    'cursor-not-allowed',
    'scale-95'
]);

// ===================================
// Topics Database
// ===================================
// NOTE: topics are loaded from topics.js
function getTopicsData() {
    if (typeof topics !== 'undefined' && Array.isArray(topics)) {
        return topics;
    }
    if (typeof globalThis !== 'undefined' && Array.isArray(globalThis.topics)) {
        return globalThis.topics;
    }
    return [];
}

if (getTopicsData().length === 0) {
    if (typeof document !== 'undefined') {
        console.error('❌ topics.js の読み込みに失敗したか、データが空です');
    }
    if (typeof globalThis !== 'undefined') {
        globalThis.topics = [];
    }
}

// ===================================
// Application State
// ===================================
const state = {
    userAnswers: { time: null, type: null },
    lastModalTrigger: null,
    selectedTopicId: null,
    createdAtDate: null,
    pendingSharedPlan: null
};

// ===================================
// Storage: LocalStorage管理
// ===================================
const Storage = {
    save(data) {
        try {
            localStorage.setItem('scienceMakerData_v1', JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn('LocalStorageへの保存に失敗しました:', e);
            showToast('この端末に保存できませんでした。入力内容を控えてからページを閉じてください。', 'error');
            return false;
        }
    },
    load() {
        try {
            const data = localStorage.getItem('scienceMakerData_v1');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.warn('LocalStorageからの読み込みに失敗しました:', e);
            return null;
        }
    },
    clear() {
        try {
            localStorage.removeItem('scienceMakerData_v1');
        } catch (e) {
            console.warn('LocalStorageのクリアに失敗しました:', e);
        }
    }
};

// ===================================
// DOM Elements Cache
// ===================================
const elements = {
    diagnoseBtn: null,
    resultsContainer: null,
    resultTimeLabel: null,
    parentModal: null,
    parentGuideBtn: null,
    parentModalCloseBtn: null,
    parentModalCloseBottomBtn: null,
    toastContainer: null,
    hypothesisHelpBtn: null,
    hypothesisHelpTooltip: null,
    planSafetyList: null,
    stepSections: []
};

// ===================================
// Utility
// ===================================
function clampNumber(value, min, max, fallback = min) {
    const parsed = Number(value);
    const safeFallback = Math.min(max, Math.max(min, Number(fallback)));
    if (!Number.isFinite(parsed)) return safeFallback;
    return Math.min(max, Math.max(min, parsed));
}

function normalizeQuizAnswer(key, value) {
    if (!Object.prototype.hasOwnProperty.call(QUIZ_OPTIONS, key)) return null;
    return QUIZ_OPTIONS[key].includes(value) ? value : null;
}

function isValidStepId(stepId) {
    return STEP_IDS.includes(stepId);
}

function collectSafetyNotes(topic) {
    const notes = [...COMMON_SAFETY_NOTES];
    if (topic && Array.isArray(topic.safety)) {
        topic.safety.forEach((note) => {
            if (typeof note !== 'string') return;
            const trimmed = note.trim();
            if (trimmed.length > 0) notes.push(trimmed);
        });
    }
    return Array.from(new Set(notes));
}

function renderSafetyNotes(topic) {
    if (typeof document === 'undefined') return;

    const list = elements.planSafetyList || document.getElementById('plan-safety-list');
    if (!list) return;

    const notes = collectSafetyNotes(topic);
    list.innerHTML = '';

    const fragment = document.createDocumentFragment();
    notes.forEach((note) => {
        const item = document.createElement('li');
        item.textContent = note;
        fragment.appendChild(item);
    });
    list.appendChild(fragment);
}

// ===================================
// State & Synchronization
// ===================================
function serializePlanData(data) {
    try {
        const jsonStr = JSON.stringify(data);
        return btoa(unescape(encodeURIComponent(jsonStr)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    } catch (e) {
        console.error('シリアライズ失敗:', e);
        return '';
    }
}

function deserializePlanData(base64Str) {
    try {
        let standardBase64 = base64Str
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        while (standardBase64.length % 4) {
            standardBase64 += '=';
        }
        const jsonStr = decodeURIComponent(escape(atob(standardBase64)));
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('デシリアライズ失敗:', e);
        return null;
    }
}

function isValidPlanDate(value) {
    if (typeof value !== 'string' || value.length > CONFIG.MAX_SHARE_DATE_LENGTH) return false;
    const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(value);
    if (!match) return false;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1 || month < 1 || month > 12 || day < 1) return false;

    const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day <= daysInMonth[month - 1];
}

function validatePlanShareData(data, topicsData = getTopicsData()) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const allowedKeys = ['topicId', 'createdAt', ...Object.keys(PLAN_FIELD_LIMITS)];
    const dataKeys = Object.keys(data);
    if (dataKeys.length !== allowedKeys.length || dataKeys.some((key) => !allowedKeys.includes(key))) return null;
    if (!Array.isArray(topicsData) || typeof data.topicId !== 'string') return null;
    if (!topicsData.some((topic) => topic && topic.id === data.topicId)) return null;
    if (!isValidPlanDate(data.createdAt)) return null;

    const validated = {
        topicId: data.topicId,
        createdAt: data.createdAt
    };

    for (const [fieldName, maxLength] of Object.entries(PLAN_FIELD_LIMITS)) {
        const value = data[fieldName];
        if (typeof value !== 'string' || value.length > maxLength) return null;
        validated[fieldName] = value;
    }

    return validated;
}

function parsePlanShareData(base64Str, topicsData = getTopicsData()) {
    if (typeof base64Str !== 'string'
        || base64Str.length === 0
        || base64Str.length > CONFIG.MAX_SHARE_PARAM_LENGTH
        || !/^[A-Za-z0-9_-]+$/.test(base64Str)) {
        return null;
    }
    return validatePlanShareData(deserializePlanData(base64Str), topicsData);
}

function getPlanShareDataFromSearch(search, topicsData = getTopicsData()) {
    if (typeof search !== 'string') return null;
    const urlParams = new URLSearchParams(search);
    const qValues = urlParams.getAll('q');
    return qValues.length === 1 ? parsePlanShareData(qValues[0], topicsData) : null;
}

function getPlanState() {
    return {
        topicId: state.selectedTopicId,
        createdAt: state.createdAtDate,
        studentName: document.getElementById('student-name')?.value || '',
        title: document.getElementById('plan-title')?.value || '',
        motivation: document.getElementById('plan-motivation')?.value || '',
        hypothesis: document.getElementById('plan-hypothesis')?.value || '',
        materials: document.getElementById('plan-materials')?.value || '',
        method: document.getElementById('plan-method')?.value || ''
    };
}

function savePlanState() {
    if (state.selectedTopicId) {
        return Storage.save(getPlanState());
    }
}

function loadPlanState(data) {
    if (!data || typeof data !== 'object') return false;

    state.selectedTopicId = data.topicId;
    state.createdAtDate = data.createdAt || new Date().toLocaleDateString('ja-JP');

    const topicsData = getTopicsData();
    const topic = topicsData.find(t => t.id === data.topicId);
    renderSafetyNotes(topic);

    const fields = {
        'student-name': data.studentName || '',
        'plan-title': data.title || '',
        'plan-motivation': data.motivation || '',
        'plan-hypothesis': data.hypothesis || '',
        'plan-materials': data.materials || '',
        'plan-method': data.method || ''
    };

    for (const [id, val] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) {
            el.value = val;
            const printEl = document.getElementById(`print-${id}`);
            if (printEl) {
                printEl.textContent = val;
            }
            updateCounterFor(id);
        }
    }

    const currentDate = document.getElementById('current-date');
    if (currentDate) {
        currentDate.textContent = state.createdAtDate;
    }

    notifyPlanLoaded();
    return true;
}

// 操作方法や保存の成否にかかわらず、表示中の計画と結果欄を同期する。
function notifyPlanLoaded() {
    if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function') {
        document.dispatchEvent(new Event('science-maker:plan-loaded'));
    }
}

const COUNTER_LIMITS = Object.freeze({
    'student-name': 60,
    'plan-title': 80,
    'plan-motivation': 500,
    'plan-hypothesis': 500,
    'plan-materials': 300,
    'plan-method': 1000
});

function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

const debouncedSave = debounce(() => savePlanState(), 500);

function updateCounterFor(id) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(id);
    const counterEl = document.getElementById(`counter-${id}`);
    const limit = COUNTER_LIMITS[id];
    if (el && counterEl && limit) {
        const len = el.value.length;
        const remain = limit - len;
        counterEl.textContent = `あと ${remain} 文字`;
        if (remain <= 10) { counterEl.className = 'text-right text-xs text-red-500 font-bold mt-1 mr-1 print:hidden'; el.style.borderColor = '#f87171'; el.style.backgroundColor = '#fef2f2'; } else { counterEl.className = 'text-right text-xs text-gray-400 mt-1 mr-1 print:hidden'; el.style.borderColor = ''; el.style.backgroundColor = ''; }
    }
}

const boundPrintInputs = new WeakSet();

function syncPrintElements() {
    if (typeof document === 'undefined') return;
    const ids = ['student-name', 'plan-title', 'plan-motivation', 'plan-hypothesis', 'plan-materials', 'plan-method'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        const printEl = document.getElementById(`print-${id}`);
        if (el && printEl) {
            printEl.textContent = el.value;
            updateCounterFor(id);
            // テーマ変更でも同じ入力要素を使うため、保存イベントは一度だけ登録する。
            if (boundPrintInputs.has(el)) return;
            boundPrintInputs.add(el);
            el.addEventListener('input', () => {
                printEl.textContent = el.value;
                updateCounterFor(id);
                debouncedSave();
            });
        }
    });
}

// ===================================
// Toast Notification System
// ===================================
function showToast(message, type = 'info') {
    if (!elements.toastContainer || typeof document === 'undefined') return;

    const template = document.getElementById('toast-template');
    if (!(template instanceof HTMLTemplateElement)) return;

    while (elements.toastContainer.children.length >= CONFIG.MAX_VISIBLE_TOASTS) {
        elements.toastContainer.firstElementChild?.remove();
    }

    const clone = template.content.cloneNode(true);
    const toast = clone.querySelector('.toast');
    const icon = clone.querySelector('.material-symbols-outlined');
    const messageEl = clone.querySelector('.toast-message');
    if (!toast || !icon || !messageEl) return;

    toast.classList.add(type);

    switch (type) {
        case 'success':
            icon.textContent = 'check_circle';
            break;
        case 'error':
            icon.textContent = 'error';
            break;
        default:
            icon.textContent = 'info';
    }

    messageEl.textContent = message;
    elements.toastContainer.appendChild(clone);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), CONFIG.TOAST_EXIT_DURATION);
    }, CONFIG.TOAST_DURATION);
}

// ===================================
// Quiz Functions
// ===================================
function setQuizAnswer(key, value) {
    const safeValue = normalizeQuizAnswer(key, value);
    if (safeValue === null) {
        console.warn(`⚠️ 不正なクイズ入力を無視しました: key=${key}, value=${value}`);
        return;
    }

    state.userAnswers[key] = safeValue;
    checkQuizComplete();
}

function checkQuizComplete() {
    const btn = elements.diagnoseBtn;
    if (!btn) return;

    const isComplete = Boolean(state.userAnswers.time && state.userAnswers.type);
    btn.disabled = !isComplete;

    if (isComplete) {
        btn.classList.remove(...INACTIVE_DIAGNOSE_BUTTON_CLASSES);
        btn.classList.add(...ACTIVE_DIAGNOSE_BUTTON_CLASSES);
    } else {
        btn.classList.remove(...ACTIVE_DIAGNOSE_BUTTON_CLASSES);
        btn.classList.add(...INACTIVE_DIAGNOSE_BUTTON_CLASSES);
    }
}

// ===================================
// Results Display
// ===================================
function showResults() {
    const topicsData = getTopicsData();
    if (topicsData.length === 0) {
        showToast('テーマデータの読み込みに失敗しました。ページを再読み込みしてください。', 'error');
        console.error('❌ topics データが利用できません');
        return;
    }

    if (!state.userAnswers.time || !state.userAnswers.type) {
        showToast('クイズの回答を選んでください', 'error');
        return;
    }

    const timeMatched = topicsData.filter((topic) => topic.time === state.userAnswers.time);
    if (timeMatched.length === 0) {
        showToast('条件に合うテーマが見つかりませんでした', 'error');
        return;
    }

    const scoredTopics = timeMatched.map((topic, index) => {
        const score = topic.category === state.userAnswers.type ? 10 : 0;
        return { ...topic, score, order: index };
    });
    scoredTopics.sort((a, b) => (b.score - a.score) || (a.order - b.order));
    const results = scoredTopics.slice(0, 3);

    if (elements.resultTimeLabel) {
        elements.resultTimeLabel.textContent = TIME_LABEL_MAP[state.userAnswers.time] || '';
    }

    const container = elements.resultsContainer;
    const template = typeof document !== 'undefined'
        ? document.getElementById('result-card-template')
        : null;
    if (!container || !(template instanceof HTMLTemplateElement)) return;

    container.innerHTML = '';

    results.forEach((topic) => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.result-card');
        if (!card) return;

        const meta = TOPIC_TYPE_META[topic.category] || { label: '', className: '' };

        const typeEl = card.querySelector('.card-type');
        if (typeEl) {
            typeEl.textContent = meta.label;
            typeEl.className = `card-type text-xs font-bold px-2 py-1 rounded ${meta.className}`;
        }

        const timeEl = card.querySelector('.card-time');
        if (timeEl) {
            timeEl.textContent = TIME_LABEL_MAP[topic.time] || '';
        }

        const titleEl = card.querySelector('.card-title');
        if (titleEl) {
            titleEl.textContent = topic.title;
        }

        const descEl = card.querySelector('.card-desc');
        if (descEl) {
            descEl.textContent = topic.desc;
        }

        const starContainer = card.querySelector('.card-difficulty');
        if (starContainer) {
            const difficulty = clampNumber(topic.difficulty, 1, 3, 1);
            starContainer.setAttribute('aria-label', `難易度 ${difficulty}`);
            starContainer.textContent = '★'.repeat(difficulty) + '☆'.repeat(3 - difficulty);
        }

        card.setAttribute('aria-label', `${topic.title} - クリックして計画書を作成`);
        card.addEventListener('click', () => selectTopic(topic.id));
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectTopic(topic.id);
            }
        });

        container.appendChild(clone);
    });

    switchStep('step-results');
}

// ===================================
// Topic Selection & Plan
// ===================================
function selectTopic(id) {
    const topicsData = getTopicsData();
    const topic = topicsData.find((item) => item.id === id);
    if (!topic) {
        showToast('選択されたテーマが見つかりませんでした', 'error');
        console.error(`❌ Topic ID "${id}" が見つかりません`);
        return;
    }

    // 同じテーマを開き直す操作では、編集中の計画を初期化しない。
    if (state.selectedTopicId === id) {
        switchStep('step-plan');
        return;
    }

    state.selectedTopicId = id;
    state.createdAtDate = new Date().toLocaleDateString('ja-JP');

    const planTitle = document.getElementById('plan-title');
    const planMotivation = document.getElementById('plan-motivation');
    const planHypothesis = document.getElementById('plan-hypothesis');
    const planMaterials = document.getElementById('plan-materials');
    const planMethod = document.getElementById('plan-method');
    const currentDate = document.getElementById('current-date');

    if (planTitle) planTitle.value = topic.title;
    if (planMotivation) planMotivation.value = `【きっかけ】\n${topic.motivation || '面白そうだと思ったからです。'}\n\n【調べたいこと】\n`;
    if (planHypothesis) planHypothesis.value = '';
    if (planMaterials) planMaterials.value = topic.materials;
    if (planMethod) planMethod.value = `${topic.desc}\n\n1. \n2. \n3. `;
    renderSafetyNotes(topic);
    if (currentDate) currentDate.textContent = state.createdAtDate;

    syncPrintElements();
    savePlanState();
    notifyPlanLoaded();

    switchStep('step-plan');
    showToast(`「${topic.title}」を選択しました`, 'success');
}

// ===================================
// Step Navigation
// ===================================
function switchStep(targetId) {
    if (!isValidStepId(targetId) || typeof document === 'undefined') {
        console.warn(`⚠️ 不正なステップIDを無視しました: ${targetId}`);
        return;
    }

    const sections = elements.stepSections.length > 0
        ? elements.stepSections
        : Array.from(document.querySelectorAll('.step-section'));
    sections.forEach((section) => section.classList.remove('active'));

    const target = document.getElementById(targetId);
    if (target) {
        target.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================================
// Modal Functions
// ===================================
function removeDialogFallbackBackdrop() {
    const backdrop = typeof document !== 'undefined'
        ? document.getElementById('dialog-fallback-backdrop')
        : null;
    if (backdrop) backdrop.remove();
}

function openModal(modal, triggerElement = null) {
    if (!modal) return;

    state.lastModalTrigger = triggerElement instanceof HTMLElement ? triggerElement : null;
    if (state.lastModalTrigger) {
        state.lastModalTrigger.setAttribute('aria-expanded', 'true');
    }

    if (typeof modal.showModal === 'function') {
        if (!modal.open) {
            modal.showModal();
        }
        return;
    }

    console.warn('⚠️ このブラウザは <dialog> 要素に対応していません。Fallback モードで表示します。');
    modal.setAttribute('open', '');
    modal.style.display = 'block';

    if (!document.getElementById('dialog-fallback-backdrop')) {
        const backdrop = document.createElement('div');
        backdrop.id = 'dialog-fallback-backdrop';
        backdrop.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 998;';
        backdrop.addEventListener('click', () => closeModal(modal));
        document.body.appendChild(backdrop);
    }
    modal.style.zIndex = '999';
}

function closeModal(modal) {
    if (!modal) return;

    if (typeof modal.close === 'function' && modal.open) {
        modal.close();
    } else {
        modal.removeAttribute('open');
        modal.style.display = 'none';
    }

    removeDialogFallbackBackdrop();

    if (state.lastModalTrigger) {
        state.lastModalTrigger.setAttribute('aria-expanded', 'false');
        state.lastModalTrigger.focus();
        state.lastModalTrigger = null;
    }
}

// ===================================
// 共有計画書の取り込み
// ===================================
function clearShareUrlParam() {
    if (typeof window === 'undefined' || typeof window.history?.replaceState !== 'function') return;
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('q');
    window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
}

function createShareImportModal() {
    if (typeof document === 'undefined') return null;
    const existingModal = document.getElementById('share-import-modal');
    if (existingModal) return existingModal;

    const modal = document.createElement('dialog');
    modal.id = 'share-import-modal';
    modal.className = 'backdrop:bg-gray-900/60 backdrop:backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-sm m-auto p-0 print:hidden';
    modal.setAttribute('aria-labelledby', 'share-import-modal-title');

    const panel = document.createElement('div');
    panel.className = 'bg-white rounded-2xl p-6 space-y-5';

    const title = document.createElement('h3');
    title.id = 'share-import-modal-title';
    title.className = 'text-lg font-bold text-gray-800';
    title.textContent = '共有された計画書を確認';

    const preview = document.createElement('p');
    preview.id = 'share-import-preview';
    preview.className = 'text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-200 rounded-xl p-4';

    const note = document.createElement('p');
    note.className = 'text-xs text-gray-500';
    note.textContent = '現在の計画書は、取り込むまで変更されません。';

    const actions = document.createElement('div');
    actions.className = 'flex gap-3 justify-end';

    const cancelButton = document.createElement('button');
    cancelButton.id = 'share-import-cancel-btn';
    cancelButton.type = 'button';
    cancelButton.className = 'px-4 py-2 rounded-lg border border-gray-200 text-gray-600 font-bold hover:bg-gray-50';
    cancelButton.textContent = 'キャンセル';

    const confirmButton = document.createElement('button');
    confirmButton.id = 'share-import-confirm-btn';
    confirmButton.type = 'button';
    confirmButton.className = 'px-4 py-2 rounded-lg bg-science-600 text-white font-bold hover:bg-science-700';
    confirmButton.textContent = 'この計画書を取り込む';

    actions.append(cancelButton, confirmButton);
    panel.append(title, preview, note, actions);
    modal.appendChild(panel);
    document.body.appendChild(modal);
    return modal;
}

function closeShareImportModal() {
    const modal = typeof document !== 'undefined'
        ? document.getElementById('share-import-modal')
        : null;
    closeModal(modal);
    document.getElementById('plan-title')?.focus();
}

function cancelSharedPlanImport() {
    state.pendingSharedPlan = null;
    clearShareUrlParam();
    closeShareImportModal();
}

function importSharedPlanData() {
    const data = state.pendingSharedPlan;
    if (!data) return;

    state.pendingSharedPlan = null;
    if (!loadPlanState(data)) {
        showToast('共有データを読み込めませんでした', 'error');
        return;
    }

    savePlanState();
    switchStep('step-plan');
    clearShareUrlParam();
    closeShareImportModal();
    showToast('🎉 共有された計画書を読み込みました！', 'success');
}

function openShareImportPreview(data) {
    const modal = createShareImportModal();
    const preview = typeof document !== 'undefined'
        ? document.getElementById('share-import-preview')
        : null;
    const confirmButton = typeof document !== 'undefined'
        ? document.getElementById('share-import-confirm-btn')
        : null;
    if (!modal || !preview || !confirmButton) return false;

    state.pendingSharedPlan = data;
    const topic = getTopicsData().find((item) => item.id === data.topicId);
    preview.textContent = `「${data.title || topic?.title || 'タイトル未設定'}」／${data.studentName || '名前未設定'}`;
    openModal(modal);
    confirmButton.focus();
    return true;
}

function initShareImportModal() {
    const modal = createShareImportModal();
    if (!modal) return;

    document.getElementById('share-import-confirm-btn')?.addEventListener('click', importSharedPlanData);
    document.getElementById('share-import-cancel-btn')?.addEventListener('click', cancelSharedPlanImport);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            cancelSharedPlanImport();
        }
    });
    modal.addEventListener('cancel', (event) => {
        event.preventDefault();
        cancelSharedPlanImport();
    });
}

function loadFromUrlParams(search = null) {
    if (typeof window === 'undefined') return false;
    const effectiveSearch = typeof search === 'string' ? search : window.location.search;
    const urlParams = new URLSearchParams(effectiveSearch);
    if (!urlParams.has('q')) return false;

    const data = getPlanShareDataFromSearch(effectiveSearch);
    if (!data) {
        clearShareUrlParam();
        showToast('共有データを読み込めませんでした', 'error');
        return false;
    }

    return openShareImportPreview(data);
}

// ===================================
// Hypothesis Help
// ===================================
function setupHypothesisHelp() {
    const btn = elements.hypothesisHelpBtn;
    const tooltip = elements.hypothesisHelpTooltip;
    if (!btn || !tooltip) return;

    const setExpanded = (expanded) => {
        btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        tooltip.classList.toggle('hidden', !expanded);
    };

    btn.addEventListener('click', (event) => {
        event.preventDefault();
        const isExpanded = btn.getAttribute('aria-expanded') === 'true';
        setExpanded(!isExpanded);
    });

    document.addEventListener('click', (event) => {
        if (!(event.target instanceof Node)) return;
        if (btn.contains(event.target) || tooltip.contains(event.target)) return;
        setExpanded(false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setExpanded(false);
        }
    });
}

// ===================================
// Share Modal Functions
// ===================================
function initShareModal() {
    if (typeof document === 'undefined') return;

    const shareBtn = document.getElementById('share-btn');
    const shareModal = document.getElementById('share-modal');
    const shareCloseBtn = document.getElementById('share-modal-close');
    const shareCopyBtn = document.getElementById('share-copy-btn');
    const shareLinkInput = document.getElementById('share-link-input');
    const shareQrcode = document.getElementById('share-qrcode');

    if (shareBtn && shareModal && shareCloseBtn && shareCopyBtn && shareLinkInput && shareQrcode) {
        let qrCodeInstance = null;

        const openShareModal = () => {
            if (shareModal.open) return;

            const planState = getPlanState();
            const base64Data = serializePlanData(planState);
            const shareUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + "?q=" + base64Data;

            shareLinkInput.value = shareUrl;

            shareQrcode.innerHTML = '';

            // URLが1500文字を超える場合はQRコードの自動生成を制限する（カメラの読み取り限界およびクラッシュ回避）
            if (shareUrl.length > 1500) {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'text-xs text-red-500 font-bold p-4 text-center leading-relaxed h-full flex flex-col items-center justify-center';
                warningDiv.innerHTML = '⚠️ 入力された文字数が非常に多いため、QRコードを自動生成できません。<br>下の「コピー」ボタンをクリックして、リンクをメールやLINE等で直接共有してください。';
                shareQrcode.appendChild(warningDiv);
            } else {
                try {
                    qrCodeInstance = new QRCode(shareQrcode, {
                        text: shareUrl,
                        width: 180,
                        height: 180,
                        colorDark: "#1f2937",
                        colorLight: "#f9fafb",
                        correctLevel: QRCode.CorrectLevel.M
                    });
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
            }

            openModal(shareModal, shareBtn);
        };

        shareBtn.addEventListener('click', openShareModal);
        shareCloseBtn.addEventListener('click', () => closeModal(shareModal));
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) closeModal(shareModal);
        });

        shareCopyBtn.addEventListener('click', () => {
            shareLinkInput.select();
            shareLinkInput.setSelectionRange(0, 99999);
            try {
                navigator.clipboard.writeText(shareLinkInput.value).then(() => {
                    showToast('📋 リンクをコピーしました！', 'success');
                }).catch(() => {
                    document.execCommand('copy');
                    showToast('📋 リンクをコピーしました！', 'success');
                });
            } catch (err) {
                document.execCommand('copy');
                showToast('📋 リンクをコピーしました！', 'success');
            }
        });
    }
}

// ===================================
// Initialization
// ===================================
function initializeElements() {
    elements.diagnoseBtn = document.getElementById('diagnose-btn');
    elements.resultsContainer = document.getElementById('results-container');
    elements.resultTimeLabel = document.getElementById('result-time-label');
    elements.parentModal = document.getElementById('parent-modal');
    elements.parentGuideBtn = document.getElementById('parent-guide-btn');
    elements.parentModalCloseBtn = document.getElementById('parent-modal-close');
    elements.parentModalCloseBottomBtn = document.getElementById('parent-modal-close-bottom');
    elements.toastContainer = document.getElementById('toast-container');
    elements.hypothesisHelpBtn = document.getElementById('plan-hypothesis-help-btn');
    elements.hypothesisHelpTooltip = document.getElementById('plan-hypothesis-help-tooltip');
    elements.planSafetyList = document.getElementById('plan-safety-list');
    elements.stepSections = Array.from(document.querySelectorAll('.step-section'));
}

function validateRequiredElements() {
    const required = [
        ['diagnoseBtn', elements.diagnoseBtn, '#diagnose-btn'],
        ['resultsContainer', elements.resultsContainer, '#results-container'],
        ['resultTimeLabel', elements.resultTimeLabel, '#result-time-label'],
        ['toastContainer', elements.toastContainer, '#toast-container'],
        ['planSafetyList', elements.planSafetyList, '#plan-safety-list']
    ];

    const missing = required
        .filter(([, element]) => !element)
        .map(([, , selector]) => selector);

    if (missing.length > 0) {
        console.error(`初期化に失敗しました。必須DOM要素が不足しています: ${missing.join(', ')}`);
        return false;
    }

    return true;
}

function setupEventListeners() {
    document.querySelectorAll('input[name="time"]').forEach((input) => {
        input.addEventListener('change', () => setQuizAnswer('time', input.value));
    });
    document.querySelectorAll('input[name="type"]').forEach((input) => {
        input.addEventListener('change', () => setQuizAnswer('type', input.value));
    });

    elements.diagnoseBtn?.addEventListener('click', showResults);
    document.getElementById('back-to-quiz-btn')?.addEventListener('click', () => switchStep('step-quiz'));
    document.getElementById('back-to-results-btn')?.addEventListener('click', () => switchStep('step-results'));

    document.getElementById('print-btn')?.addEventListener('click', () => {
        window.print();
        showToast('印刷ダイアログを開きました', 'info');
    });

    const modal = elements.parentModal;
    if (modal) {
        elements.parentGuideBtn?.addEventListener('click', () => openModal(modal, elements.parentGuideBtn));
        elements.parentModalCloseBtn?.addEventListener('click', () => closeModal(modal));
        elements.parentModalCloseBottomBtn?.addEventListener('click', () => closeModal(modal));

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal(modal);
            }
        });

        modal.addEventListener('close', () => {
            removeDialogFallbackBackdrop();
            if (state.lastModalTrigger) {
                state.lastModalTrigger.setAttribute('aria-expanded', 'false');
                state.lastModalTrigger.focus();
                state.lastModalTrigger = null;
            }
        });
    }

    setupHypothesisHelp();
}

function setupStorageEventListener() {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', (e) => {
        if (e.key === 'scienceMakerData_v1') {
            try {
                const data = JSON.parse(e.newValue);
                if (data && typeof data === 'object') {
                    const activeId = document.activeElement ? document.activeElement.id : null;
                    const topicChanged = state.selectedTopicId !== data.topicId;
                    state.selectedTopicId = data.topicId;
                    state.createdAtDate = data.createdAt || state.createdAtDate;

                    const fields = {
                        'student-name': data.studentName || '',
                        'plan-title': data.title || '',
                        'plan-motivation': data.motivation || '',
                        'plan-hypothesis': data.hypothesis || '',
                        'plan-materials': data.materials || '',
                        'plan-method': data.method || ''
                    };

                    for (const [id, val] of Object.entries(fields)) {
                        if (id === activeId) continue;
                        const el = document.getElementById(id);
                        if (el && el.value !== val) {
                            el.value = val;
                            const printEl = document.getElementById(`print-${id}`);
                            if (printEl) {
                                printEl.textContent = val;
                            }
                            updateCounterFor(id);
                        }
                    }

                    const currentDate = document.getElementById('current-date');
                    if (currentDate) {
                        currentDate.textContent = state.createdAtDate;
                    }

                    const topicsData = getTopicsData();
                    const topic = topicsData.find(t => t.id === data.topicId);
                    renderSafetyNotes(topic);
                    if (topicChanged) notifyPlanLoaded();
                }
            } catch (err) {
                console.error('Failed to parse storage update:', err);
            }
        }
    });
}

function initApp() {
    if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    initializeElements();
    if (!validateRequiredElements()) return;

    // 既存データを先に復元し、共有データは確認後にだけ取り込む
    const savedData = Storage.load();
    if (savedData && savedData.topicId) {
        loadPlanState(savedData);
        switchStep('step-plan');
        showToast('前回の計画書を読み込みました', 'success');
    }

    checkQuizComplete();
    setupEventListeners();
    initShareModal();
    initShareImportModal();
    loadFromUrlParams();
    syncPrintElements();
    setupStorageEventListener();
}

if (typeof document !== 'undefined') {
    // 動的ロードがDOMContentLoadedの前後どちらでも、準備済みDOMで一度だけ起動する。
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp, { once: true });
    } else {
        initApp();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        clampNumber,
        normalizeQuizAnswer,
        isValidStepId,
        getTopicsData,
        collectSafetyNotes,
        validatePlanShareData,
        parsePlanShareData,
        getPlanShareDataFromSearch,
        loadFromUrlParams
    };
}
