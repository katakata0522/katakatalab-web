/**
 * Book Report Quest - Main Application Script
 * 読書感想文構成案ジェネレーター
 */

// ============================================
// Configuration Constants
// ============================================
const CONFIG = {
    TOTAL_STEPS: 4,
    STORAGE_KEY_PREFIX: 'bookReportQuestData_slot_', // スロットごとのLocalStorageキー接頭辞
    ACTIVE_SLOT_KEY: 'bookReportQuestActiveSlot', // 現在選ばれているスロット番号の保存キー
    ANIMATION_DURATION: 300,
    TOAST_DURATION: 3000,
    AUTOSAVE_DEBOUNCE: 500,
    MAX_LENGTHS: {
        title: 80,
        author: 60,
        synopsisPartA: 40,
        synopsisPartB: 60,
        synopsisPartC: 40,
        motivationDetail: 140,
        sceneDesc: 300,
        sceneFeeling: 40,
        sceneMyself: 300,
        conclusionChange: 300,
        draftText: 5000 // 清書用エディタは長文を許容
    }
};

const ALLOWED_FORM_FIELDS = [
    'genre', 'title', 'author', 'synopsisPartA', 'synopsisPartB', 'synopsisPartC',
    'motivation', 'motivationDetail', 'sceneDesc', 'sceneFeeling', 'sceneMyself', 'conclusionChange', 
    'selectedOpening', 'draftText'
];

const SELECTORS = {
    STEP_PREFIX: 'step-',
    PROGRESS_BAR: 'progress-bar',
    PROGRESS_CONTAINER: 'progress-container',
    PROGRESS_ANNOUNCEMENT: 'progress-announcement',
    WIZARD_FORM: 'wizard-form',
    RESULT_SECTION: 'result-section',
    TOAST_CONTAINER: 'toast-container'
};

const TEXT_TEMPLATES = {
    MOTIVATION: {
        cover: '表紙の絵やタイトルにとても惹かれたからです。',
        recommend: '先生（または親）に「面白いよ」とすすめられたからです。',
        movie: '前に映画（アニメ）で見たことがあって、本でも読んでみたいと思ったからです。',
        interest: '私の好きなことに関係がある本だったからです。',
        default: ''
    },
    OPENING_A: (title, author, reason) => `私が選んだ本は「${title}」（${author}）です。<br>この本を読もうと思ったきっかけは、${reason}`,
    OPENING_B: (title, feelingWord, feelingWordAlt) => `みなさんは、${feelingWord}経験をしたことがありますか？<br>「${title}」という本を読んで、私は${feelingWordAlt}場面に出会いました。`,
    OPENING_C: (title, sceneSnippet) => `「${sceneSnippet}...」<br>読み終わった後も、この場面が強く心に残っています。<br>私は「${title}」を読んで、主人公の姿にとても心を動かされました。`,
    BODY_SCENE: (desc, feeling) => `「${desc}」という場面。そこで私は「${feeling}」と感じました。`,
    BODY_MYSELF: (myself) => `主人公と自分を比べて、「${myself}」と考えました。`,
    CONCLUSION: (change) => `この本を読んで、私は「${change}」と強く思いました。<br>本の中の主人公のように、これからは私も大事なことを行動で示していきたいです。`
};

const GENRE_CONFIG = {
    story: {
        synopsisTitle: 'どんなお話？（あらすじ）',
        partALabel: 'だれが（主人公はだれ？）',
        partAPlaceholder: '例：メロスが',
        partBLabel: '何をする？（冒険や挑戦など）',
        partBPlaceholder: '例：親友を信じて走り抜け',
        partCLabel: 'どうなった？（結末など）',
        partCPlaceholder: '例：最後には約束を守りぬく',
        assists: {
            synopsisPartA: [
                { text: '主人公のメロスが', label: '🧑‍🤝‍🧑 メロスが' },
                { text: 'おじいさんとおばあさんが', label: '👴👵 おじいさんたちが' },
                { text: 'ロボットが', label: '🤖 ロボットが' }
            ],
            synopsisPartB: [
                { text: 'あきらめずに挑戦を続け', label: '🔥 挑戦を続け' },
                { text: '仲間と一緒に旅に出て', label: '🧭 旅に出て' },
                { text: '秘密の計画を実行し', label: '🤫 計画を実行し' }
            ],
            synopsisPartC: [
                { text: '大事な約束を守りぬく', label: '🤝 約束を守る' },
                { text: '最後には夢をかなえる', label: '✨ 夢をかなえる' },
                { text: '村に平和を取りもどす', label: '🏡 平和を取りもどす' }
            ]
        },
        gacha: [
            { question: '冒険するお話？', a: '勇気ある主人公が', b: '魔王をたおすために旅をして', c: '世界に平和を取りもどす' },
            { question: '友情のお話？', a: '二人の親友が', b: 'すれ違いを乗りこえて信じ合い', c: '強いきずなを結ぶ' },
            { question: '成長のお話？', a: '弱虫だった男の子が', b: '大きなカベに立ち向かい', c: '最後には自信を手に入れる' }
        ]
    },
    biography: {
        synopsisTitle: 'どんな人？（だれの一生？）',
        partALabel: 'だれが（主人公の偉人は？）',
        partAPlaceholder: '例：エジソンが',
        partBLabel: '何をした？（発明や努力など）',
        partBPlaceholder: '例：何度も実験をくり返し、実用的な電球を開発して',
        partCLabel: 'どうなった？（世界への影響など）',
        partCPlaceholder: '例：世界を明るくした',
        assists: {
            synopsisPartA: [
                { text: 'エジソンが', label: '💡 エジソンが' },
                { text: 'ヘレン・ケラーが', label: '🌟 ヘレン・ケラーが' },
                { text: '野口英世が', label: '🔬 野口英世が' }
            ],
            synopsisPartB: [
                { text: 'あきらめずに研究を重ね', label: '🧪 研究を重ね' },
                { text: '多くの困難を乗りこえ', label: '🏔️ 困難を乗りこえ' },
                { text: '新しい考え方を広めて', label: '📖 考えを広めて' }
            ],
            synopsisPartC: [
                { text: '人々のくらしを便利にした', label: '✨ くらしを便利に' },
                { text: '世界中の人を勇気づけた', label: '❤️ 人々を勇気づけた' },
                { text: '多くの病気から人を救った', label: '🩺 人々を救った' }
            ]
        },
        gacha: [
            { question: '大発明の偉人？', a: 'エジソンが', b: '電球など多くの発明に挑戦し', c: '世界を明るく便利に変えた' },
            { question: '努力を重ねた偉人？', a: '野口英世が', b: '病気の原因をつきとめる研究をし', c: '多くの人を救う手がかりを作った' },
            { question: '壁を越えた偉人？', a: 'ヘレン・ケラーが', b: '見えない・聞こえない壁をこえて', c: '世界中の人に希望をあたえた' }
        ]
    },
    science: {
        synopsisTitle: 'どんな本？（テーマ・内容）',
        partALabel: '何について？（図鑑や科学のテーマ）',
        partAPlaceholder: '例：アリの社会が',
        partBLabel: 'どんなひみつ？（おどろいた特徴など）',
        partBPlaceholder: '例：見事に役割分担をして、助け合ってくらしていて',
        partCLabel: 'どう思った？（一番伝えたいことなど）',
        partCPlaceholder: '例：人間よりもきそく正しい生活をしている',
        assists: {
            synopsisPartA: [
                { text: 'アリのくらしが', label: '🐜 アリのくらしが' },
                { text: '宇宙のふしぎが', label: '🚀 宇宙のふしぎが' },
                { text: '恐竜の生態が', label: '🦖 恐竜の生態が' }
            ],
            synopsisPartB: [
                { text: 'じつは人間と似た社会を持ち', label: '🏢 社会を持ち' },
                { text: '何億年もの歴史があり', label: '⏳ 歴史があり' },
                { text: 'まだなぞがたくさんあって', label: '🌀 なぞがあって' }
            ],
            synopsisPartC: [
                { text: '生きもののすごさを教えてくれる', label: '🌱 生きもののすごさ' },
                { text: '地球の外の広さを感じさせる', label: '🌌 宇宙の広さ' },
                { text: '自然の仕組みのふしぎを伝える', label: '🌊 自然のふしぎ' }
            ]
        },
        gacha: [
            { question: '虫や動物のふしぎ？', a: '小さなアリたちが', b: '女王アリを中心に役割分担をして', c: 'みんなで協力して生活している' },
            { question: '宇宙のひみつ？', a: 'はてしない宇宙には', b: 'ブラックホールなど謎の天体があり', c: '今も少しずつ広がっている' },
            { question: '恐竜の世界？', a: '大むかしの地球で', b: 'ティラノサウルスなどが支配し', c: 'あるとき突然すがたを消した' }
        ]
    }
};

// ============================================
function applyPortalSettings() {
    try {
        const raw = localStorage.getItem('wonder_school_profile_v2');
        const value = raw ? JSON.parse(raw) : null;
        const settings = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        document.body.classList.toggle('text-large', settings.textSize === 'large');
        document.body.classList.toggle('reduce-motion', settings.reduceMotion === true);
        document.body.classList.toggle('theme-night', settings.darkMode === true);
    } catch (error) {
        console.warn('Failed to apply portal settings:', error);
    }
}

// Utility Functions
// ============================================
const Utils = {
    getCharLength(str = '') {
        return Array.from(String(str)).length;
    },

    escapeHTML(str = '') {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    removeEmoji(text) {
        if (!text) return '';
        return String(text).replace(/[0-9#*]\uFE0F?\u20E3|[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u200D\uFE0F\u20E3]/gu, '').trim();
    },

    sanitizeFilename(name) {
        if (!name) return '';
        return Array.from(name.replace(/[/\\:*?"<>|\x00-\x1f]/g, '_').replace(/\s+/g, '_')).slice(0, 100).join('');
    },

    coerceSafeString(value, maxLength = 300) {
        const normalized = typeof value === 'string' ? value : '';
        const trimmed = normalized.trim();
        return this.truncateText(trimmed, maxLength);
    },

    truncateText(value, maxLength) {
        return Array.from(typeof value === 'string' ? value : '').slice(0, maxLength).join('');
    },

    escapeSelectorValue(value = '') {
        const stringValue = String(value);
        if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
            return CSS.escape(stringValue);
        }
        return stringValue
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\]/g, '\\]')
            .replace(/\n/g, '\\a ')
            .replace(/\r/g, '');
    },

    buildRadioValueSelector(name, value) {
        return `input[name="${this.escapeSelectorValue(name)}"][value="${this.escapeSelectorValue(value)}"]`;
    },

    combineSynopsis(genre, a, b, c) {
        const partA = (a || '').trim();
        const partB = (b || '').trim();
        const partC = (c || '').trim();

        if (!partA && !partB && !partC) return '';

        const suffixStory = 'お話';
        const suffixBiography = '一生を描いた本';
        const suffixScience = '様子について詳しく書かれた本';

        // Aのみの場合
        if (partA && !partB && !partC) {
            const cleanA = partA.replace(/[がは]$|について$|に関して$/, '');
            if (genre === 'story') {
                return `${cleanA}についてのお話`;
            } else if (genre === 'biography') {
                return `${cleanA}の一生を描いた本`;
            } else {
                return `${cleanA}について詳しく書かれた本`;
            }
        }

        let combined = '';

        if (partA) {
            let subject = partA;
            if (!/[がは]$/.test(partA) && !/について$/.test(partA) && !/に関して$/.test(partA) && !/の$/.test(partA)) {
                subject += 'が';
            }
            combined += subject;
        }

        if (partB) {
            let action = partB;
            // 「て」「で」「し」で終わらず、かつ日本語の連用中止形（「〜い/ち/り/ぎ/み/び/に」）でも終わらない場合のみ「て」を補う
            if (!/[てでし]$/.test(partB) && !/[いちりぎみびに]$/.test(partB)) {
                action += 'て';
            }
            if (combined) {
                combined += '、' + action;
            } else {
                combined += action;
            }
        }

        if (partC) {
            const cleanC = partC.replace(/。$/, '');
            if (combined) {
                combined += '、' + cleanC;
            } else {
                combined += cleanC;
            }
        }

        const suffix = genre === 'biography' ? suffixBiography : (genre === 'science' ? suffixScience : suffixStory);
        return combined + suffix;
    }
};

function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with ID "${id}" not found`);
    }
    return element;
}

function debounce(func, wait) {
    let timeout = null;
    let pending = false;
    const run = () => {
        if (timeout !== null) clearTimeout(timeout);
        timeout = null;
        if (!pending) return;
        pending = false;
        func();
    };
    const wrapped = () => {
        pending = true;
        if (timeout !== null) clearTimeout(timeout);
        timeout = setTimeout(run, wait);
    };
    wrapped.flush = run;
    wrapped.cancel = () => {
        if (timeout !== null) clearTimeout(timeout);
        timeout = null;
        pending = false;
    };
    return wrapped;
}

const FORM_IDS = Object.freeze({
    title: 'book-title', author: 'book-author', synopsisPartA: 'synopsis-part-a',
    synopsisPartB: 'synopsis-part-b', synopsisPartC: 'synopsis-part-c', motivationDetail: 'motivation-detail',
    sceneDesc: 'scene-desc', sceneMyself: 'scene-myself', conclusionChange: 'conclusion-change', draftText: 'draft-textarea'
});

function normalizeFormData(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const data = {};
    for (const field of ALLOWED_FORM_FIELDS) {
        data[field] = Utils.truncateText(value[field], CONFIG.MAX_LENGTHS[field] || 1000);
    }
    if (!Object.hasOwn(GENRE_CONFIG, data.genre)) data.genre = 'story';
    if (!['cover', 'recommend', 'movie', 'interest', 'other', ''].includes(data.motivation)) data.motivation = '';
    if (!['opening-a', 'opening-b', 'opening-c'].includes(data.selectedOpening)) data.selectedOpening = 'opening-a';
    return data;
}

function mergeFormData(base, local, remote) {
    if (!base || !remote) return { ...local };
    return Object.fromEntries(ALLOWED_FORM_FIELDS.map(field => [field, local[field] !== base[field] ? local[field] : remote[field]]));
}

function emitBookEvent(name, detail = {}) {
    if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
        document.dispatchEvent(new CustomEvent(`book-report:${name}`, { detail }));
    }
}

// ============================================
// Main Application
// ============================================
function createBookReportApp() {
        const app = {
            currentStep: 1,
            formData: {
                genre: 'story',
                title: '',
                author: '',
                synopsisPartA: '',
                synopsisPartB: '',
                synopsisPartC: '',
                motivation: '',
                motivationDetail: '',
                sceneDesc: '',
                sceneFeeling: '',
                sceneMyself: '',
                conclusionChange: '',
                selectedOpening: 'opening-a',
                draftText: '' // 下書きエディタの中身
            },

            activeSlot: 1, // 現在のタブで選んだしおり。別タブの選択では移動しない。
            persistedFormData: null,
            persistedStep: 1,
            composing: new Set(),
            dirty: false,
            saveWarningShown: false,
            counterUpdaters: [],
            navigationTimer: null,
            gachaTimer: null,
            gachaCloseTimer: null,
            gachaGeneration: 0,
            currentGachaTarget: null,
            latestGachaChosen: null,
            focusTrapHandler: null,
            previouslyFocused: null,

            // ----------------------------------------
            // Initialization
            // ----------------------------------------
            init() {
                applyPortalSettings();
                this.loadSavedData();
                this.loadFromUrlParams();
                this.applyInputConstraints();
                this.bindEvents();
                this.bindFeelingChips();
                this.bindOptionCards();
                this.bindGachaEvents();
                this.bindAssistButtons();
                this.bindDraftEditor();
                this.setupAutosave();
                this.restoreStep();
                this.applyGenreUI();
                this.initShareModal();
                this.syncPrintElements();
                this.listenStorageChanges();
                document.addEventListener('book-report:thinking-map-updated', () => this.updateMeter());
                document.addEventListener('book-report:gacha-dismiss', event => this.closeGachaModal(event.detail?.focusTarget));
                window.addEventListener('beforeprint', () => this.preparePrint());
                window.addEventListener('afterprint', () => this.restoreAfterPrint());
            },

            listenStorageChanges() {
                window.addEventListener('storage', event => {
                    if (event.key === 'wonder_school_profile_v2' || event.key === null) applyPortalSettings();
                    if (event.key === this.getStorageKey() || event.key === null) this.syncStoredState();
                    if (event.key === CONFIG.ACTIVE_SLOT_KEY || event.key?.startsWith(CONFIG.STORAGE_KEY_PREFIX)) this.updateSlotTitles();
                });
            },

            syncStoredState() {
                if (this.composing.size || this.isSlotSwitching) return;
                const remote = this.readStoredState();
                if (!remote.ok) return;
                if (!remote.data) {
                    this.persistedFormData = { ...this.formData };
                    return;
                }
                this.collectData();
                const next = mergeFormData(this.persistedFormData, this.formData, remote.data.formData);
                const changed = JSON.stringify(next) !== JSON.stringify(this.formData);
                this.formData = next;
                this.persistedFormData = { ...remote.data.formData };
                if (changed) {
                    this.populateForm();
                    this.applyGenreUI();
                    if (!getElement(SELECTORS.RESULT_SECTION)?.classList.contains('hidden')) this.populateResults();
                    this.syncPrintElements();
                }
            },

            readStoredState(slot = this.activeSlot) {
                try {
                    const raw = localStorage.getItem(this.getStorageKey(slot));
                    if (raw === null) return { ok: true, data: null, raw };
                    const value = JSON.parse(raw);
                    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, data: null };
                    const source = value.formData;
                    const formData = normalizeFormData(source);
                    if (!formData) return { ok: false, data: null };
                    if (typeof source.synopsis === 'string' && !source.synopsisPartA) formData.synopsisPartA = Utils.truncateText(source.synopsis, CONFIG.MAX_LENGTHS.synopsisPartA);
                    const currentStep = Number.isInteger(value.currentStep) && value.currentStep >= 1 && value.currentStep <= CONFIG.TOTAL_STEPS ? value.currentStep : 1;
                    return { ok: true, data: { formData, currentStep }, raw };
                } catch (error) {
                    return { ok: false, data: null };
                }
            },

            // 共有データは端末の保存内容と独立して検証する。


            serializePlanData(data) {
                try {
                    const jsonStr = JSON.stringify(data);
                    const bytes = new TextEncoder().encode(jsonStr);
                    let binString = '';
                    for (let i = 0; i < bytes.length; i++) {
                        binString += String.fromCharCode(bytes[i]);
                    }
                    return btoa(binString)
                        .replace(/\+/g, '-')
                        .replace(/\//g, '_')
                        .replace(/=+$/, '');
                } catch (e) {
                    console.error('シリアライズ失敗:', e);
                    return '';
                }
            },

            deserializePlanData(base64Str) {
                try {
                    if (typeof base64Str !== 'string' || base64Str.length > 100000 || !/^[A-Za-z0-9_-]+$/.test(base64Str)) return null;
                    let base64 = base64Str
                        .replace(/-/g, '+')
                        .replace(/_/g, '/');
                    while (base64.length % 4) {
                        base64 += '=';
                    }
                    const binString = atob(base64);
                    const bytes = new Uint8Array(binString.length);
                    for (let i = 0; i < binString.length; i++) {
                        bytes[i] = binString.charCodeAt(i);
                    }
                    const jsonStr = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
                    return JSON.parse(jsonStr);
                } catch (e) {
                    console.error('デシリアライズ失敗:', e);
                    return null;
                }
            },

            loadFromUrlParams() {
                try {
                    const url = new URL(window.location.href);
                    const dataParam = url.searchParams.get('data');
                    if (!dataParam) return false;
                    const decoded = this.deserializePlanData(dataParam);
                    const normalized = normalizeFormData(decoded);
                    if (!normalized || !ALLOWED_FORM_FIELDS.some(field => Object.hasOwn(decoded, field))) {
                        this.showToast('共有データを読み込めませんでした', 'error');
                        return false;
                    }
                    const hasLocalData = Object.keys(FORM_IDS).some(field => this.formData[field]) || this.formData.genre !== 'story' || this.formData.motivation || this.formData.sceneFeeling || this.formData.selectedOpening !== 'opening-a';
                    if (hasLocalData && !window.confirm(`しおり ${this.activeSlot} の内容を、共有された感想文データに置き換えますか？`)) return false;
                    this.formData = normalized;
                    this.currentStep = Number.isInteger(decoded.currentStep) && decoded.currentStep >= 1 && decoded.currentStep <= CONFIG.TOTAL_STEPS ? decoded.currentStep : 1;
                    this.populateForm();
                    // 明示的な取り込みは、確認前の保存値と合成しない。
                    this.persistedFormData = null;
                    this.pendingImportData = dataParam;
                    const saved = this.persistState();
                    this.updateSlotTitles();
                    if (decoded.showResults === true) {
                        const wizard = getElement(SELECTORS.WIZARD_FORM);
                        const progress = getElement(SELECTORS.PROGRESS_CONTAINER);
                        if (wizard) wizard.style.display = 'none';
                        if (progress) progress.style.display = 'none';
                        getElement(SELECTORS.RESULT_SECTION)?.classList.remove('hidden');
                        this.populateResults();
                    }
                    if (saved) this.showToast('共有された感想文データを読み込みました');
                    return true;
                } catch (error) {
                    console.warn('Failed to load from URL params:', error);
                    return false;
                }
            },


            clearImportedUrl() {
                if (!this.pendingImportData) return;
                try {
                    const url = new URL(window.location.href);
                    if (url.searchParams.get('data') === this.pendingImportData) {
                        url.searchParams.delete('data');
                        if (typeof history !== 'undefined' && history.replaceState) history.replaceState(history.state, '', url.href);
                    }
                    this.pendingImportData = null;
                } catch (error) { /* 保存成功とは独立に、復元用URLは残しておく。 */ }
            },

            syncPrintElements() {
                const textarea = getElement('draft-textarea');
                const printView = getElement('print-draft-view');
                if (textarea && printView) {
                    printView.textContent = textarea.value;
                }
            },

            initShareModal() {
                const shareBtn = getElement('share-btn');
                const shareModal = getElement('share-modal');
                const shareModalClose = getElement('share-modal-close');
                const shareCopyBtn = getElement('share-copy-btn');
                const shareLinkInput = getElement('share-link-input');
                const qrContainer = getElement('share-qrcode');

                if (!shareModal) return;

                let lastShareTrigger = null;

                const openShareModal = () => {
                    if (shareModal.open || this.composing.size) return;
                    this.saveData();
                    lastShareTrigger = document.activeElement;
                    const isResultsVisible = !getElement(SELECTORS.RESULT_SECTION)?.classList.contains('hidden');
                    const shareState = {
                        ...this.formData,
                        currentStep: this.currentStep,
                        showResults: isResultsVisible
                    };
                    const base64Data = this.serializePlanData(shareState);
                    
                    const params = new URLSearchParams();
                    if (base64Data) {
                        params.set('data', base64Data);
                    }
                    const shareUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?${params.toString()}`;

                    if (shareLinkInput) {
                        shareLinkInput.value = shareUrl;
                    }

                    if (qrContainer) {
                        qrContainer.innerHTML = '';
                        if (shareUrl.length > 1500) {
                            qrContainer.innerHTML = `
                                <div class="text-center p-4">
                                    <span class="material-symbols-rounded text-amber-500 text-4xl block mb-2" aria-hidden="true">warning</span>
                                    <p class="text-xs text-amber-800 font-bold leading-relaxed">
                                        文字数が多いため、QRコードを作成できません。<br>
                                        下の「コピー」ボタンをクリックし、リンクをメールやLINE等で直接共有してください。
                                    </p>
                                </div>
                            `;
                        } else {
                            try {
                                if (typeof QRCode !== 'undefined') {
                                    new QRCode(qrContainer, {
                                        text: shareUrl,
                                        width: 176,
                                        height: 176,
                                        colorDark: "#0288D1",
                                        colorLight: "#ffffff",
                                        correctLevel: QRCode.CorrectLevel.M
                                    });
                                } else {
                                    qrContainer.innerHTML = '<p class="text-xs text-red-500 font-bold">QRコード生成ライブラリの読み込みに失敗しました。</p>';
                                }
                            } catch (e) {
                                console.error('Failed to generate QR code:', e);
                                qrContainer.innerHTML = '<p class="text-xs text-red-500 font-bold">QRコード生成に失敗しました。</p>';
                            }
                        }
                    }

                    shareModal.showModal();
                    shareBtn?.setAttribute('aria-expanded', 'true');
                };

                const restoreShareFocus = () => {
                    shareBtn?.setAttribute('aria-expanded', 'false');
                    if (lastShareTrigger && typeof lastShareTrigger.focus === 'function') {
                        lastShareTrigger.focus();
                        lastShareTrigger = null;
                    }
                };

                shareModal.addEventListener('close', restoreShareFocus);
                const closeShareModal = () => shareModal.close();

                if (shareBtn) {
                    shareBtn.addEventListener('click', openShareModal);
                }

                if (shareModalClose) {
                    shareModalClose.addEventListener('click', closeShareModal);
                }

                shareModal.addEventListener('click', (e) => {
                    if (e.target === shareModal) {
                        closeShareModal();
                    }
                });

                if (shareCopyBtn && shareLinkInput) {
                    shareCopyBtn.addEventListener('click', async () => {
                        if (shareCopyBtn.disabled) return;
                        shareCopyBtn.disabled = true;
                        const value = shareLinkInput.value;
                        const copied = await this.copyClipboard(value, shareLinkInput, () => shareModal.open && shareLinkInput.value === value);
                        shareCopyBtn.disabled = false;
                        if (shareModal.open) this.showToast(copied ? '📋 リンクをコピーしました！' : 'コピーできませんでした', copied ? 'normal' : 'error');
                    });
                }
            },

            async copyClipboard(text, field = null, isCurrent = () => true) {
                try {
                    if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(text);
                        return true;
                    }
                } catch (error) {}
                if (!isCurrent()) return false;
                let temporary = null;
                const previous = document.activeElement;
                try {
                    if (!field) {
                        temporary = document.createElement('textarea');
                        temporary.value = text;
                        temporary.style.cssText = 'position:fixed;left:-10000px;top:0';
                        document.body.appendChild(temporary);
                        field = temporary;
                    }
                    field.focus();
                    field.select();
                    field.setSelectionRange(0, field.value.length);
                    return document.execCommand('copy') === true;
                } catch (error) {
                    return false;
                } finally {
                    temporary?.remove();
                    if (temporary && previous?.isConnected) previous.focus();
                }
            },

            getStorageKey(slot = this.activeSlot) {
                return `${CONFIG.STORAGE_KEY_PREFIX}${slot}`;
            },

            applyInputConstraints() {
                for (const [field, id] of Object.entries(FORM_IDS)) {
                    const element = getElement(id);
                    if (!element) continue;
                    const maxLength = CONFIG.MAX_LENGTHS[field];
                    // 表示カウンターと同じコードポイント単位。UTF-16のmaxlengthでは制限しない。
                    element.removeAttribute('maxlength');
                    const updateCount = () => {
                        const length = Utils.getCharLength(element.value);
                        const count = document.getElementById(`${id}-char-count`);
                        if (count) count.textContent = length;
                        const container = document.getElementById(`${id}-counter-container`);
                        if (container) container.className = `char-counter${length >= maxLength ? ' danger' : length >= maxLength * .8 ? ' warning' : ''}`;
                    };
                    this.counterUpdaters.push(updateCount);
                    element.addEventListener('compositionstart', () => {
                        this.pendingSave?.flush();
                        this.composing.add(id);
                    });
                    const commit = () => {
                        const next = Utils.truncateText(element.value, maxLength);
                        if (next !== element.value) element.value = next;
                        this.formData[field] = element.value;
                        updateCount();
                        if (field === 'draftText') { this.updateDraftCounters(); this.syncPrintElements(); }
                    };
                    element.addEventListener('input', event => {
                        if (event.isComposing || this.composing.has(id)) return;
                        commit();
                    });
                    element.addEventListener('compositionend', () => {
                        this.composing.delete(id);
                        commit();
                        this.scheduleSave();
                    });
                    updateCount();
                }
            },

            // ----------------------------------------
            // Event Binding
            // ----------------------------------------
            bindEvents() {
                // Navigation buttons
                document.querySelectorAll('.btn-next').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const step = Number(btn.dataset.nextStep);
                        if (!isNaN(step)) {
                            this.nextStep(step);
                        }
                    });
                });

                document.querySelectorAll('.btn-prev').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const step = Number(btn.dataset.prevStep);
                        if (!isNaN(step)) {
                            this.prevStep(step);
                        }
                    });
                });

                // Genre selection chips
                document.querySelectorAll('input[name="genre"]').forEach(radio => {
                    radio.addEventListener('change', (e) => {
                        this.formData.genre = e.target.value;
                        this.applyGenreUI();
                        this.saveData();
                    });
                });

                // Slot selection buttons (Bookshelf tabs)
                document.querySelectorAll('.slot-tab').forEach(tab => {
                    tab.addEventListener('click', () => {
                        const slotNum = Number(tab.dataset.slot);
                        if (!isNaN(slotNum)) {
                            this.switchSlot(slotNum);
                        }
                    });
                });

                // Generate button
                const generateBtn = document.querySelector('.btn-generate');
                if (generateBtn) {
                    generateBtn.addEventListener('click', () => this.generateOutline());
                }

                // Action buttons
                getElement('copy-all-btn')?.addEventListener('click', () => this.copyAllText());
                getElement('download-text-btn')?.addEventListener('click', () => this.downloadText());
                getElement('print-btn')?.addEventListener('click', () => this.print());
                getElement('reset-btn')?.addEventListener('click', () => this.resetForm());
                getElement('big-print-pdf-btn')?.addEventListener('click', () => this.print());
                getElement('print-genko-btn')?.addEventListener('click', event => {
                    if (!this.saveData()) { event.preventDefault(); return; }
                    try { localStorage.setItem(CONFIG.ACTIVE_SLOT_KEY, String(this.activeSlot)); } catch (error) { event.preventDefault(); this.warnSaveFailure(); }
                });

                // Share buttons
                getElement('line-share-btn')?.addEventListener('click', () => this.shareToSocial('line'));
                getElement('email-share-btn')?.addEventListener('click', () => this.shareToSocial('email'));
                getElement('big-line-share-btn')?.addEventListener('click', () => this.shareToSocial('line'));

                // Copy cards (selected opening selection & copying)
                document.querySelectorAll('.copy-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const targetId = card.dataset.copyTarget;
                        if (targetId) {
                            this.copyText(targetId);
                            
                            // Visual active highlight and active state registration
                            document.querySelectorAll('.copy-card').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
                            card.classList.add('active');
                            card.setAttribute('aria-pressed', 'true');
                            this.formData.selectedOpening = targetId;
                            this.updateMeter();
                            this.saveData();
                        }
                    });

                    card.setAttribute('tabindex', '0');
                    card.setAttribute('role', 'button');
                    card.addEventListener('keydown', event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            card.click();
                        }
                    });
                });

                // 保護者向けnative dialogはHTML側の共通ハンドラーが管理する。
            },

            bindFeelingChips() {
                document.querySelectorAll('.feeling-chip').forEach(chip => {
                    chip.addEventListener('click', (e) => {
                        document.querySelectorAll('.feeling-chip').forEach(c => {
                            c.classList.remove('selected');
                            c.setAttribute('aria-pressed', 'false');
                        });

                        const target = e.currentTarget;
                        target.classList.add('selected');
                        target.setAttribute('aria-pressed', 'true');
                        this.formData.sceneFeeling = target.dataset.val || '';
                        this.saveData();
                    });

                    chip.setAttribute('aria-pressed', chip.classList.contains('selected') ? 'true' : 'false');
                });
            },

            bindOptionCards() {
                document.querySelectorAll('.option-card input[type="radio"]').forEach(radio => {
                    radio.addEventListener('change', (e) => {
                        document.querySelectorAll('.option-card').forEach(card => {
                            const cardRadio = card.querySelector('input[type="radio"]');
                            if (cardRadio?.checked) {
                                card.classList.add('selected');
                            } else {
                                card.classList.remove('selected');
                            }
                        });

                        this.formData.motivation = e.target.value;
                        this.saveData();
                    });
                });
            },

            bindAssistButtons() {
                document.querySelectorAll('.assist-btn[data-target]').forEach(btn => {
                    if (btn.closest('#genre-chips') || btn.closest('.synopsis-part-box')) return;

                    btn.addEventListener('click', () => {
                        const targetId = btn.dataset.target;
                        const text = btn.dataset.text;
                        const input = getElement(targetId);
                        if (input && text) {
                            input.value = text;
                            input.dispatchEvent(new Event('input'));
                            this.saveData();
                        }
                    });
                });
            },

            bindGachaEvents() {
                document.querySelectorAll('.gacha-trigger-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const target = btn.dataset.target;
                        this.openGachaModal(target);
                    });
                });

                getElement('gacha-apply-btn')?.addEventListener('click', () => this.applyGachaResult());
                getElement('gacha-reroll-btn')?.addEventListener('click', () => this.rollGacha(this.currentGachaTarget));
                getElement('gacha-close-btn')?.addEventListener('click', () => this.closeGachaModal());
                getElement('gacha-modal-overlay')?.addEventListener('click', () => this.closeGachaModal());
            },

            bindDraftEditor() {
                getElement('load-outline-to-draft-btn')?.addEventListener('click', () => this.loadOutlineToDraft());
            },

            scheduleSave() {
                this.dirty = true;
                if (!this.composing.size) this.pendingSave?.();
            },

            setupAutosave() {
                this.pendingSave = debounce(() => this.saveData(), CONFIG.AUTOSAVE_DEBOUNCE);
                for (const id of Object.values(FORM_IDS)) {
                    getElement(id)?.addEventListener('input', event => {
                        if (!event.isComposing && !this.composing.has(id)) this.scheduleSave();
                    });
                }
                const flush = () => { if (!this.composing.size && this.dirty) this.saveData(); };
                window.addEventListener('pagehide', flush);
                document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
            },

            preparePrint() {
                this.saveData();
                this.syncPrintElements();
                const details = getElement('draft-details');
                if (details && this.printDetailsOpen === undefined) {
                    this.printDetailsOpen = details.open;
                    details.open = true;
                }
            },

            restoreAfterPrint() {
                const details = getElement('draft-details');
                if (details && this.printDetailsOpen !== undefined) details.open = this.printDetailsOpen;
                this.printDetailsOpen = undefined;
            },

            print() {
                this.preparePrint();
                try { window.print(); }
                catch (error) { this.showToast('印刷を開始できませんでした', 'error'); }
                finally { this.restoreAfterPrint(); }
            },

            // ----------------------------------------
            // Navigation Logic
            // ----------------------------------------


            nextStep(step) {
                if (step !== this.currentStep || this.composing.size || !this.validateStep(step)) return;
                this.cancelNavigation();
                this.saveData();

                const current = getElement(`${SELECTORS.STEP_PREFIX}${step}`);
                const next = getElement(`${SELECTORS.STEP_PREFIX}${step + 1}`);

                if (current && next) {
                    current.classList.remove('active');
                    next.classList.add('active');
                    this.currentStep = step + 1;
                    this.updateProgress();
                    this.saveStep();

                    window.scrollTo({ top: 0, behavior: 'smooth' });

                    this.navigationTimer = setTimeout(() => {
                        this.navigationTimer = null;
                        if (this.currentStep !== step + 1 || !next.classList.contains('active')) return;
                        const firstInput = next.querySelector('input:not([type=hidden]), textarea');
                        if (firstInput) {
                            firstInput.focus();
                        }
                    }, CONFIG.ANIMATION_DURATION + 200);
                }
            },

            cancelNavigation() {
                if (this.navigationTimer !== null) clearTimeout(this.navigationTimer);
                this.navigationTimer = null;
            },

            prevStep(step) {
                if (step !== this.currentStep || this.composing.size) return;
                this.cancelNavigation();
                this.saveData();
                const current = getElement(`${SELECTORS.STEP_PREFIX}${step}`);
                const prev = getElement(`${SELECTORS.STEP_PREFIX}${step - 1}`);

                if (current && prev) {
                    current.classList.remove('active');
                    prev.classList.add('active');
                    this.currentStep = step - 1;
                    this.updateProgress();
                    this.saveStep();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            },

            updateProgress() {
                const percent = (this.currentStep / CONFIG.TOTAL_STEPS) * 100;
                const bar = getElement(SELECTORS.PROGRESS_BAR);
                const container = getElement(SELECTORS.PROGRESS_CONTAINER);
                const announcement = getElement(SELECTORS.PROGRESS_ANNOUNCEMENT);

                if (bar) {
                    bar.style.width = `${percent}%`;
                }
                if (container) {
                    container.setAttribute('aria-valuenow', String(percent));
                }
                if (announcement) {
                    announcement.textContent = `ステップ ${this.currentStep} / ${CONFIG.TOTAL_STEPS}`;
                }
            },

            // ----------------------------------------
            // Validation
            // ----------------------------------------
            validateStep(step) {
                const clearError = (fieldId) => {
                    const field = getElement(fieldId);
                    const errorEl = getElement(`${fieldId}-error`);
                    if (field) { field.classList.remove('error'); field.removeAttribute('aria-invalid'); }
                    if (errorEl) errorEl.textContent = '';
                };

                const setError = (fieldId, message) => {
                    const field = getElement(fieldId);
                    const errorEl = getElement(`${fieldId}-error`);
                    if (field) {
                        field.classList.add('error');
                        field.setAttribute('aria-invalid', 'true');
                        field.focus();
                    }
                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                };

                if (step === 1) {
                    clearError('book-title');
                    const titleField = getElement('book-title');
                    const title = titleField?.value.trim() || '';
                    if (!title) {
                        setError('book-title', '本のタイトルを入力してください');
                        this.showToast('本のタイトルを教えてね！📕', 'error');
                        return false;
                    }
                }

                if (step === 2) {
                    const motivation = document.querySelector('input[name="motivation"]:checked');
                    if (!motivation) {
                        this.showToast('選んだ理由をひとつ選んでね！👆', 'error');
                        const firstRadio = document.querySelector('input[name="motivation"]');
                        if (firstRadio) firstRadio.focus();
                        return false;
                    }
                }

                if (step === 3) {
                    clearError('scene-desc');
                    const sceneField = getElement('scene-desc');
                    const scene = sceneField?.value.trim() || '';
                    if (!scene) {
                        setError('scene-desc', '心に残った場面を入力してください');
                        this.showToast('心に残った場面を少し書いてみて！✍️', 'error');
                        return false;
                    }
                }

                return true;
            },

            // ----------------------------------------
            // Data Management
            // ----------------------------------------
            getFieldValue(id) {
                return getElement(id)?.value || '';
            },

            getRadioValue(name) {
                return document.querySelector(`input[name="${name}"]:checked`)?.value || '';
            },

            collectData() {
                for (const [field, id] of Object.entries(FORM_IDS)) {
                    if (!this.composing.has(id)) this.formData[field] = Utils.truncateText(this.getFieldValue(id), CONFIG.MAX_LENGTHS[field]);
                }
                this.formData.genre = this.getRadioValue('genre') || this.formData.genre || 'story';
                this.formData.motivation = this.getRadioValue('motivation');
                this.formData.sceneFeeling = document.querySelector('.feeling-chip.selected')?.dataset?.val || this.formData.sceneFeeling;
            },

            warnSaveFailure() {
                if (!this.saveWarningShown) {
                    this.saveWarningShown = true;
                    this.showToast('この端末に保存できませんでした。画面を閉じる前に、共有リンクやテキストで控えてください', 'error');
                }
            },

            saveData() {
                if (this.composing.size) return false;
                this.pendingSave?.cancel();
                this.collectData();
                return this.persistState();
            },

            saveStep() { return this.persistState(); },

            persistState() {
                const remote = this.readStoredState();
                const local = this.formData;
                const next = mergeFormData(this.persistedFormData, local, remote.ok ? remote.data?.formData : null);
                const changed = JSON.stringify(next) !== JSON.stringify(local);
                const data = { formData: next, currentStep: this.currentStep };
                try {
                    const unchanged = remote.ok && JSON.stringify(remote.data) === JSON.stringify(data);
                    if (!unchanged) localStorage.setItem(this.getStorageKey(), JSON.stringify({ ...data, savedAt: new Date().toISOString() }));
                    this.formData = next;
                    this.persistedFormData = { ...next };
                    this.persistedStep = this.currentStep;
                    this.dirty = false;
                    this.saveWarningShown = false;
                    if (changed) { this.populateForm(); this.applyGenreUI(); }
                    this.updateSlotTitles();
                    this.clearImportedUrl();
                    return true;
                } catch (error) {
                    this.dirty = true;
                    this.warnSaveFailure();
                    return false;
                }
            },

            loadSavedData(requestedSlot = null) {
                this.resetFormDataToDefault();
                this.currentStep = 1;
                if ([1, 2, 3].includes(requestedSlot)) this.activeSlot = requestedSlot;
                else {
                    try {
                        const savedSlot = localStorage.getItem(CONFIG.ACTIVE_SLOT_KEY);
                        this.activeSlot = ['1', '2', '3'].includes(savedSlot) ? Number(savedSlot) : 1;
                    } catch (error) { this.activeSlot = 1; }
                }
                const stored = this.readStoredState();
                if (stored.ok && stored.data) {
                    this.formData = stored.data.formData;
                    this.currentStep = stored.data.currentStep;
                }
                // 壊れた保存内容は閲覧だけで削除しない。
                this.persistedFormData = { ...this.formData };
                this.persistedStep = this.currentStep;
                this.dirty = false;
                this.populateForm();
                this.updateSlotTabsUI();
                this.updateSlotTitles();
                this.syncPrintElements();
                if (document.documentElement) document.documentElement.dataset.bookReportActiveSlot = String(this.activeSlot);
                emitBookEvent('slot-restored', { slot: this.activeSlot });
            },

            resetFormDataToDefault() {
                this.formData = {
                    genre: 'story',
                    title: '',
                    author: '',
                    synopsisPartA: '',
                    synopsisPartB: '',
                    synopsisPartC: '',
                    motivation: '',
                    motivationDetail: '',
                    sceneDesc: '',
                    sceneFeeling: '',
                    sceneMyself: '',
                    conclusionChange: '',
                    selectedOpening: 'opening-a',
                    draftText: ''
                };
            },

            populateForm() {
                const setVal = (id, value) => {
                    const el = getElement(id);
                    if (el) {
                        if (el.value !== (value || '')) el.value = value || '';
                    }
                };

                setVal('book-title', this.formData.title);
                setVal('book-author', this.formData.author);
                setVal('synopsis-part-a', this.formData.synopsisPartA);
                setVal('synopsis-part-b', this.formData.synopsisPartB);
                setVal('synopsis-part-c', this.formData.synopsisPartC);
                setVal('motivation-detail', this.formData.motivationDetail);
                setVal('scene-desc', this.formData.sceneDesc);
                setVal('scene-myself', this.formData.sceneMyself);
                setVal('conclusion-change', this.formData.conclusionChange);
                setVal('draft-textarea', this.formData.draftText);

                if (this.formData.genre) {
                    const genreRadio = document.querySelector(`input[name="genre"][value="${Utils.escapeSelectorValue(this.formData.genre)}"]`);
                    if (genreRadio) {
                        genreRadio.checked = true;
                    }
                }

                // 別のしおりや空の保存先へ、前の本の選択状態を持ち越さない。
                document.querySelectorAll('input[name="motivation"]').forEach(radio => {
                    radio.checked = false;
                });
                document.querySelectorAll('.option-card').forEach(card => card.classList.remove('selected'));
                document.querySelectorAll('.feeling-chip').forEach(chip => {
                    chip.classList.remove('selected');
                    chip.setAttribute('aria-pressed', 'false');
                });

                if (this.formData.motivation) {
                    const radio = document.querySelector(Utils.buildRadioValueSelector('motivation', this.formData.motivation));
                    if (radio) {
                        radio.checked = true;
                        
                        radio.closest('.option-card')?.classList.add('selected');
                    }
                }

                if (this.formData.sceneFeeling) {
                    const chip = document.querySelector(`.feeling-chip[data-val="${Utils.escapeSelectorValue(this.formData.sceneFeeling)}"]`);
                    if (chip) {
                        chip.classList.add('selected');
                        chip.setAttribute('aria-pressed', 'true');
                    }
                }

                this.counterUpdaters.forEach(update => update());
                this.updateDraftCounters();
            },

            restoreStep() {
                for (let i = 1; i <= CONFIG.TOTAL_STEPS; i++) {
                    const step = getElement(`${SELECTORS.STEP_PREFIX}${i}`);
                    if (step) {
                        step.classList.remove('active');
                    }
                }

                const currentStepEl = getElement(`${SELECTORS.STEP_PREFIX}${this.currentStep}`);
                if (currentStepEl) {
                    currentStepEl.classList.add('active');
                }

                this.updateProgress();
            },

            // ----------------------------------------
            // Bookshelf Slot Select Logic
            // ----------------------------------------
            switchSlot(slotNum) {
                if (![1, 2, 3].includes(slotNum) || slotNum === this.activeSlot || this.composing.size) return;
                if (!this.saveData()) return;
                this.cancelNavigation();
                this.closeGachaModal();
                try { localStorage.setItem(CONFIG.ACTIVE_SLOT_KEY, String(slotNum)); }
                catch (error) { this.warnSaveFailure(); return; }
                this.loadSavedData(slotNum);
                this.restoreStep();
                this.applyGenreUI();
                const wizard = getElement(SELECTORS.WIZARD_FORM);
                const progress = getElement(SELECTORS.PROGRESS_CONTAINER);
                if (wizard) { wizard.style.display = 'block'; wizard.style.opacity = '1'; }
                if (progress) progress.style.display = 'block';
                getElement(SELECTORS.RESULT_SECTION)?.classList.add('hidden');
                this.showToast(`本棚のしおり ${slotNum} を開いたよ！📖`);
            },

            updateSlotTabsUI() {
                document.querySelectorAll('.slot-tab').forEach(tab => {
                    const slotNum = Number(tab.dataset.slot);
                    if (slotNum === this.activeSlot) {
                        tab.classList.add('active');
                        tab.setAttribute('aria-selected', 'true');
                    } else {
                        tab.classList.remove('active');
                        tab.setAttribute('aria-selected', 'false');
                    }
                });
            },

            updateSlotTitles() {
                for (let i = 1; i <= 3; i++) {
                    const titleEl = getElement(`slot-title-${i}`);
                    if (!titleEl) continue;

                    try {
                        const saved = localStorage.getItem(`${CONFIG.STORAGE_KEY_PREFIX}${i}`);
                        if (saved) {
                            const data = JSON.parse(saved);
                            const title = Utils.truncateText(data?.formData?.title, CONFIG.MAX_LENGTHS.title);
                            titleEl.textContent = title || '題名なし';
                        } else {
                            titleEl.textContent = 'からっぽ';
                        }
                    } catch (e) {
                        titleEl.textContent = 'からっぽ';
                    }
                }
            },

            // ----------------------------------------
            // Dynamic Genre UI Update
            // ----------------------------------------
            applyGenreUI() {
                const genre = this.formData.genre || 'story';
                const config = GENRE_CONFIG[genre];
                if (!config) return;

                const synopsisTitle = getElement('synopsis-title');
                if (synopsisTitle) synopsisTitle.textContent = config.synopsisTitle;

                const partALabel = getElement('synopsis-part-a-label');
                if (partALabel) partALabel.textContent = config.partALabel;
                const partAInput = getElement('synopsis-part-a');
                if (partAInput) partAInput.placeholder = config.partAPlaceholder;

                const partBLabel = getElement('synopsis-part-b-label');
                if (partBLabel) partBLabel.textContent = config.partBLabel;
                const partBInput = getElement('synopsis-part-b');
                if (partBInput) partBInput.placeholder = config.partBPlaceholder;

                const partCLabel = getElement('synopsis-part-c-label');
                if (partCLabel) partCLabel.textContent = config.partCLabel;
                const partCInput = getElement('synopsis-part-c');
                if (partCInput) partCInput.placeholder = config.partCPlaceholder;

                this.renderAssistChips('synopsis-part-a-assists', 'synopsis-part-a', config.assists.synopsisPartA);
                this.renderAssistChips('synopsis-part-b-assists', 'synopsis-part-b', config.assists.synopsisPartB);
                this.renderAssistChips('synopsis-part-c-assists', 'synopsis-part-c', config.assists.synopsisPartC);
            },

            renderAssistChips(containerId, targetInputId, chipData) {
                const container = getElement(containerId);
                if (!container) return;
                container.innerHTML = '';
                chipData.forEach(item => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'assist-btn';
                    btn.textContent = item.label;
                    btn.dataset.target = targetInputId;
                    btn.dataset.text = item.text;
                    btn.addEventListener('click', () => {
                        const input = getElement(targetInputId);
                        if (input) {
                            input.value = item.text;
                            input.dispatchEvent(new Event('input'));
                            this.saveData();
                        }
                    });
                    container.appendChild(btn);
                });
            },

            // ----------------------------------------
            // Generation
            // ----------------------------------------
            generateOutline() {
                if (this.composing.size) return;
                this.cancelNavigation();
                this.saveData();
                const field = getElement('conclusion-change');
                if (field) {
                    field.classList.remove('error');
                }

                if (!this.formData.conclusionChange.trim()) {
                    const field = getElement('conclusion-change');
                    if (field) {
                        field.classList.add('error');
                        field.setAttribute('aria-invalid', 'true');
                        field.focus();
                    }
                    this.showToast('最後に、どう変わったか教えてね！', 'error');
                    return;
                }

                const wizardForm = getElement(SELECTORS.WIZARD_FORM);
                const resultSection = getElement(SELECTORS.RESULT_SECTION);
                const progressContainer = getElement(SELECTORS.PROGRESS_CONTAINER);

                if (wizardForm) wizardForm.style.display = 'none';
                if (progressContainer) progressContainer.style.display = 'none';

                if (resultSection) {
                    resultSection.classList.remove('hidden');
                    resultSection.classList.add('animate-fade-in-up');
                }

                this.populateResults();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                this.showToast('クエストクリア！おめでとう！🎉');

                // 保存データからはステップをクリア（再生成のため、LocalStorageのステップだけリセット、フォーム内容は保持）
                try {
                    this.currentStep = 1;
                    this.persistState();
                    this.updateSlotTitles();
                } catch (e) {
                    console.warn('Failed to update slot step:', e);
                }
            },

            populateResults() {
                let reasonText = TEXT_TEMPLATES.MOTIVATION[this.formData.motivation] || TEXT_TEMPLATES.MOTIVATION.default;

                if (this.formData.motivationDetail) {
                    reasonText += ` 具体的には、${this.formData.motivationDetail}というところに興味を持ちました。`;
                }

                const d = this.formData;
                const safeTitle = Utils.escapeHTML(d.title);
                const safeAuthor = Utils.escapeHTML(d.author || '作');
                const safeReason = Utils.escapeHTML(reasonText);
                const feelingWord = Utils.removeEmoji(d.sceneFeeling) || '不思議な';
                const feelingWordAlt = Utils.removeEmoji(d.sceneFeeling) || '驚くような';

                // Opening patterns
                const openingA = getElement('opening-a');
                if (openingA) {
                    openingA.innerHTML = TEXT_TEMPLATES.OPENING_A(safeTitle, safeAuthor, safeReason);
                }

                const openingB = getElement('opening-b');
                if (openingB) {
                    openingB.innerHTML = TEXT_TEMPLATES.OPENING_B(safeTitle, Utils.escapeHTML(feelingWord), Utils.escapeHTML(feelingWordAlt));
                }

                const openingC = getElement('opening-c');
                if (openingC) {
                    const sceneSnippet = Utils.escapeHTML(Utils.truncateText(d.sceneDesc || '', 20));
                    openingC.innerHTML = TEXT_TEMPLATES.OPENING_C(safeTitle, sceneSnippet);
                }

                // Sync UI selected copy-card active highlights
                const activeId = this.formData.selectedOpening || 'opening-a';
                document.querySelectorAll('.copy-card').forEach(card => {
                    card.setAttribute('aria-pressed', String(card.dataset.copyTarget === activeId));
                    if (card.dataset.copyTarget === activeId) {
                        card.classList.add('active');
                    } else {
                        card.classList.remove('active');
                    }
                });

                // Synopsis (combined)
                const combinedSynopsis = Utils.combineSynopsis(d.genre, d.synopsisPartA, d.synopsisPartB, d.synopsisPartC);
                const bodySynopsisRef = getElement('body-synopsis-ref');
                if (bodySynopsisRef) {
                    bodySynopsisRef.textContent = combinedSynopsis || '（あらすじは書かれていません）';
                }

                // Body references
                const bodySceneRef = getElement('body-scene-ref');
                if (bodySceneRef) {
                    bodySceneRef.textContent = TEXT_TEMPLATES.BODY_SCENE(d.sceneDesc, d.sceneFeeling || 'すごい');
                }

                const bodyMyselfRef = getElement('body-myself-ref');
                if (bodyMyselfRef) {
                    bodyMyselfRef.textContent = TEXT_TEMPLATES.BODY_MYSELF(d.sceneMyself);
                }

                // Conclusion
                const conclusionText = getElement('conclusion-text');
                if (conclusionText) {
                    conclusionText.innerHTML = TEXT_TEMPLATES.CONCLUSION(Utils.escapeHTML(d.conclusionChange));
                }

                emitBookEvent('results-rendered');
                this.updateMeter();
            },

            updateMeter() {
                const activeId = this.formData.selectedOpening || 'opening-a';
                const openingText = getElement(activeId)?.innerText || '';
                const bodyScene = getElement('body-scene-ref')?.innerText || '';
                const bodyMyself = getElement('body-myself-ref')?.innerText || '';
                const conclusion = getElement('conclusion-text')?.innerText || '';

                const synopsis = getElement('body-synopsis-ref')?.innerText || '';
                const total = [openingText, synopsis, bodyScene, bodyMyself, conclusion].reduce((sum, text) => sum + Utils.getCharLength(text), 0);
                const sheets = (total / 400).toFixed(1);

                const totalCountEl = getElement('total-char-count');
                const sheetCountEl = getElement('page-sheet-count');

                if (totalCountEl) totalCountEl.textContent = total;
                if (sheetCountEl) sheetCountEl.textContent = sheets;
            },

            // ----------------------------------------
            // Toast Notifications
            // ----------------------------------------
            showToast(message, type = 'normal') {
                const container = getElement(SELECTORS.TOAST_CONTAINER);
                if (!container) return;

                const toast = document.createElement('div');
                toast.className = `toast ${type === 'error' ? 'error' : ''}`;
                toast.setAttribute('role', 'alert');

                const icon = type === 'error' ? 'error' : 'check_circle';
                const safeMessage = Utils.escapeHTML(message);
                toast.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${icon}</span><span>${safeMessage}</span>`;

                container.appendChild(toast);

                setTimeout(() => {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateY(10px)';
                    setTimeout(() => toast.remove(), CONFIG.ANIMATION_DURATION);
                }, CONFIG.TOAST_DURATION);
            },

            // ----------------------------------------
            // Copy & Download
            // ----------------------------------------
            async copyText(elementId) {
                const target = getElement(elementId);
                if (!target) return;

                const text = target.innerText;

                try {
                    if (!await this.copyClipboard(text)) throw new Error('copy failed');
                    this.showToast('コピーしました！');
                } catch (err) {
                    console.error('Copy failed:', err);
                    this.showToast('コピーできませんでした', 'error');
                }
            },

            async copyAllText() {
                const title = this.formData.title || '無題';
                const author = this.formData.author || '作';
                const opening = getElement(this.formData.selectedOpening || 'opening-a')?.innerText || '';
                const synopsis = getElement('body-synopsis-ref')?.innerText || '';
                const bodyScene = getElement('body-scene-ref')?.innerText || '';
                const bodyMyself = getElement('body-myself-ref')?.innerText || '';
                const conclusion = getElement('conclusion-text')?.innerText || '';

                const fullText = `【読書感想文メモ】
本のタイトル：「${title}」 (${author})

■はじめ
${opening}

■なか
あらすじ：
${synopsis}

心に残った場面：
${bodyScene}

自分との比較：
${bodyMyself}

■むすび
${conclusion}`;

                try {
                    if (!await this.copyClipboard(fullText)) throw new Error('copy failed');
                    this.showToast('まとめてコピーしました！');
                } catch (err) {
                    console.error('Copy all failed:', err);
                    this.showToast('コピーできませんでした', 'error');
                }
            },

            downloadText() {
                const title = this.formData.title || '無題';
                const author = this.formData.author || '作';
                const opening = getElement(this.formData.selectedOpening || 'opening-a')?.innerText || '';
                const synopsis = getElement('body-synopsis-ref')?.innerText || '';
                const bodyScene = getElement('body-scene-ref')?.innerText || '';
                const bodyMyself = getElement('body-myself-ref')?.innerText || '';
                const conclusion = getElement('conclusion-text')?.innerText || '';

                const fullText = `【読書感想文メモ】
作成日: ${new Date().toLocaleDateString('ja-JP')}
本のタイトル：「${title}」 (${author})

■はじめ
${opening}

■なか
あらすじ：
${synopsis}

心に残った場面：
${bodyScene}

自分との比較：
${bodyMyself}

■むすび
${conclusion}`;

                try {
                    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `読書感想文メモ_${Utils.sanitizeFilename(this.formData.title) || '無題'}.txt`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    this.showToast('ダウンロードしました！');
                } catch (err) {
                    console.error('Download failed:', err);
                    this.showToast('ダウンロードに失敗しました', 'error');
                }
            },

            shareToSocial(platform) {
                const title = this.formData.title || '無題の本';
                const author = this.formData.author || '作者不明';
                const opening = getElement(this.formData.selectedOpening || 'opening-a')?.innerText || '';
                const synopsis = getElement('body-synopsis-ref')?.innerText || '';
                const bodyScene = getElement('body-scene-ref')?.innerText || '';
                const bodyMyself = getElement('body-myself-ref')?.innerText || '';
                const conclusion = getElement('conclusion-text')?.innerText || '';

                const contentText = `【読書感想文メモ】
本のタイトル：「${title}」 (${author})

■はじめ（書き出し）
${opening}

■なか１（あらすじ）
${synopsis}

■なか２（一番心が動いた場面）
${bodyScene}

■なか３（自分だったらどうしたか）
${bodyMyself}

■むすび（まとめ）
${conclusion}`;

                const shareText = `子供が「読書感想文クエスト」で作成した読書感想文の構成案（設計図）です。
以下のメモを参考に原稿用紙に書き写すことができます。

${contentText}`;

                if (platform === 'line') {
                    const url = `https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`;
                    window.open(url, '_blank');
                } else if (platform === 'email') {
                    navigator.clipboard.writeText(shareText).then(() => {
                        this.showToast('構成案をコピーしました！メール本文に貼り付けてね 📨');
                        
                        const mailSubject = encodeURIComponent(`【読書感想文設計図】「${title}」の感想文メモ`);
                        const mailBody = encodeURIComponent(`子供が作成した「読書感想文クエスト」の設計図です。

※構成案の全文がすでにクリップボードにコピーされています。
このメール本文に【貼り付け（ペースト）】して送信してください！

---
夏休みの宿題おたすけツール（読書感想文クエスト）：
https://katakatalab.com/pikalab/book_report/`);
                        
                        window.location.href = `mailto:?subject=${mailSubject}&body=${mailBody}`;
                    }).catch(err => {
                        console.error('Mail clipboard copy failed:', err);
                        const mailSubject = encodeURIComponent(`【読書感想文設計図】「${title}」`);
                        const mailBody = encodeURIComponent(`本のタイトル：「${title}」の感想文設計図を作成しました。
詳細はサイトでご確認ください。

https://katakatalab.com/pikalab/book_report/`);
                        window.location.href = `mailto:?subject=${mailSubject}&body=${mailBody}`;
                    });
                }
            },

            resetForm() {
                if (!confirm('入力した内容が消えてしまいますが、よろしいですか？')) return;
                try {
                    localStorage.setItem(CONFIG.ACTIVE_SLOT_KEY, String(this.activeSlot));
                    localStorage.removeItem(this.getStorageKey());
                } catch (error) {
                    console.warn('Failed to clear localStorage:', error);
                    this.warnSaveFailure();
                    // 削除できなかった場合は、直前の未保存入力を保護する。
                    this.scheduleSave();
                    return;
                }
                this.pendingSave?.cancel();
                this.cancelNavigation();
                this.dirty = false;
                location.reload();
            },

            // ----------------------------------------
            // Draft Editor Methods
            // ----------------------------------------
            updateDraftCounters() {
                const text = this.formData.draftText || '';
                const count = Utils.getCharLength(text);
                const sheets = (count / 400).toFixed(1);

                const countEl = getElement('draft-char-count');
                const sheetsEl = getElement('draft-sheet-count');

                if (countEl) countEl.textContent = count;
                if (sheetsEl) sheetsEl.textContent = sheets;
            },

            loadOutlineToDraft() {
                const activeId = this.formData.selectedOpening || 'opening-a';
                const opening = getElement(activeId)?.innerText || '';
                const synopsis = getElement('body-synopsis-ref')?.innerText || '';
                const bodyScene = getElement('body-scene-ref')?.innerText || '';
                const bodyMyself = getElement('body-myself-ref')?.innerText || '';
                const conclusion = getElement('conclusion-text')?.innerText || '';

                if (!opening && !synopsis && !bodyScene && !bodyMyself && !conclusion) {
                    this.showToast('まだ構成案が作成されていないよ！', 'error');
                    return;
                }

                if (this.formData.draftText && !confirm('現在の下書きの内容が上書きされてしまいますが、よろしいですか？')) {
                    return;
                }

                const combinedText = `${opening}

${synopsis}

${bodyScene}

${bodyMyself}

${conclusion}`;

                this.formData.draftText = Utils.truncateText(combinedText, CONFIG.MAX_LENGTHS.draftText);
                const textarea = getElement('draft-textarea');
                if (textarea) {
                    textarea.value = this.formData.draftText;
                }
                this.updateDraftCounters();
                this.syncPrintElements();
                this.saveData();

                // アコーディオンを開く
                const details = getElement('draft-details');
                if (details) {
                    details.open = true;
                }

                this.showToast('構成案を下書きエリアに流し込んだよ！🪄');
            },

            applyGachaResult() {
                const target = this.currentGachaTarget;
                const chosen = this.latestGachaChosen;
                if (!target || !chosen) return;

                if (target === 'book-synopsis') {
                    const a = getElement('synopsis-part-a');
                    const b = getElement('synopsis-part-b');
                    const c = getElement('synopsis-part-c');
                    if (a) { a.value = chosen.a; a.dispatchEvent(new Event('input')); }
                    if (b) { b.value = chosen.b; b.dispatchEvent(new Event('input')); }
                    if (c) { c.value = chosen.c; c.dispatchEvent(new Event('input')); }
                } else {
                    const input = getElement(target);
                    if (input) {
                        input.value = chosen.text;
                        input.dispatchEvent(new Event('input'));
                    }
                }
                this.saveData();
                this.closeGachaModal();
                this.showToast('ガチャのヒントを入力欄に入れたよ！🪄');
            },

            // ----------------------------------------
            // Gacha Roulette演出 & ロジック
            // ----------------------------------------
            openGachaModal(target) {
                if (this.gachaOpen) return;
                const modal = getElement('gacha-modal');
                const content = getElement('gacha-modal-content');
                if (!modal || !content) return;
                if (this.gachaCloseTimer !== null) clearTimeout(this.gachaCloseTimer);
                this.gachaCloseTimer = null;
                this.gachaTrigger = document.activeElement;
                this.gachaOpen = true;
                this.currentGachaTarget = target;
                modal.classList.remove('hidden');
                const generation = ++this.gachaGeneration;
                requestAnimationFrame(() => {
                    if (this.gachaOpen && generation === this.gachaGeneration) content.classList.add('active');
                });
                const main = document.querySelector('main');
                if (main) { this.mainWasInert = main.inert; main.inert = true; }
                if (!this.gachaKeyHandler) {
                    this.gachaKeyHandler = event => {
                        if (!this.gachaOpen) return;
                        if (event.key === 'Escape') { event.preventDefault(); this.closeGachaModal(); return; }
                        if (event.key !== 'Tab') return;
                        const focusable = [...modal.querySelectorAll('button:not(:disabled), [tabindex="0"]')].filter(element => element.getClientRects().length);
                        const first = focusable[0], last = focusable.at(-1);
                        if (!first) { event.preventDefault(); return; }
                        if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
                        else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
                    };
                    document.addEventListener('keydown', this.gachaKeyHandler);
                }
                this.rollGacha(target);
                getElement('gacha-close-btn')?.focus();
            },

            closeGachaModal(focusTarget = null) {
                if (!this.gachaOpen) return;
                const wasOpen = this.gachaOpen;
                this.gachaOpen = false;
                this.gachaGeneration++;
                if (this.gachaTimer !== null) clearTimeout(this.gachaTimer);
                if (this.gachaCloseTimer !== null) clearTimeout(this.gachaCloseTimer);
                this.gachaTimer = null;
                this.gachaCloseTimer = null;
                this.latestGachaChosen = null;
                const modal = getElement('gacha-modal');
                const content = getElement('gacha-modal-content');
                if (content) content.classList.remove('active');
                if (wasOpen && modal) this.gachaCloseTimer = setTimeout(() => {
                    modal.classList.add('hidden');
                    this.gachaCloseTimer = null;
                }, CONFIG.ANIMATION_DURATION);
                if (typeof document.querySelector === 'function') {
                    const main = document.querySelector('main');
                    if (main && wasOpen) main.inert = this.mainWasInert || false;
                }
                if (wasOpen) {
                    const target = typeof focusTarget === 'string' ? getElement(focusTarget) : this.gachaTrigger;
                    if (target?.isConnected) target.focus();
                }
            },

            rollGacha(target) {
                if (this.gachaTimer !== null) clearTimeout(this.gachaTimer);
                const generation = this.gachaGeneration;
                this.latestGachaChosen = null;
                const spinner = getElement('gacha-slot-spinner');
                const resultDisplay = getElement('gacha-result-display');
                const applyBtn = getElement('gacha-apply-btn');
                const rerollBtn = getElement('gacha-reroll-btn');
                const closeBtn = getElement('gacha-close-btn');
                
                if (!spinner || !resultDisplay) return;

                spinner.classList.remove('hidden');
                spinner.classList.add('rolling');
                spinner.textContent = 'シャッフル中... 🎲';
                resultDisplay.classList.add('hidden');
                
                // ボタンの完全ロック
                if (applyBtn) applyBtn.disabled = true;
                if (rerollBtn) rerollBtn.disabled = true;
                if (closeBtn) {
                    closeBtn.disabled = false;
                    closeBtn.style.opacity = '';
                    closeBtn.style.pointerEvents = '';
                }

                let pool = [];
                if (target === 'book-synopsis') {
                    const genre = this.formData.genre || 'story';
                    pool = GENRE_CONFIG[genre]?.gacha || [];
                } else if (target === 'motivation-detail') {
                    pool = [
                        { question: '絵や装丁が気になる？', text: '表紙の絵が綺麗で、不思議な雰囲気がしたから。' },
                        { question: 'おすすめされた？', text: '友達（または親）が「すごく面白いよ」と教えてくれたから。' },
                        { question: '読んだことがあった？', text: '昔から知っているお話で、もう一度じっくり読んでみたいと思ったから。' }
                    ];
                } else if (target === 'scene-desc') {
                    pool = [
                        { question: 'ピンチに立ち向かう？', text: '主人公がピンチになりながらも、諦めずに立ち向かう場面。' },
                        { question: '協力する？', text: 'それまでバラバラだった仲間たちが、最後に一つになって協力しあう場面。' },
                        { question: '謎が解ける？', text: 'ずっと謎だったことが明らかになって、すべてが解決する場面。' }
                    ];
                } else if (target === 'scene-myself') {
                    pool = [
                        { question: '逃げてしまうかも？', text: 'もし私だったら、怖くて途中で諦めたり逃げ出したりしてしまったかもしれません。' },
                        { question: '同じように頑張る？', text: '私も同じような立場になったら、きっと主人公と同じように最後まで全力を尽くしたいと思います。' },
                        { question: '強くなりたい？', text: '私にはまだこんな勇気はないけれど、少しずつでも主人公のように強くなりたいです。' }
                    ];
                } else if (target === 'conclusion-change') {
                    pool = [
                        { question: '約束を守る？', text: 'これからは、友達との小さな約束でも絶対に守るように行動したいです。' },
                        { question: 'あきらめない？', text: 'つらくて途中で投げ出したいことがあっても、最後まで諦めずに努力を続けようと思います。' },
                        { question: '優しさを持つ？', text: '困っている人がいたら、見過ごさずに声をかける優しさを持とうと強く思いました。' }
                    ];
                }

                if (pool.length === 0) {
                    spinner.classList.remove('rolling');
                    spinner.textContent = 'データがありません';
                    return;
                }

                this.gachaTimer = setTimeout(() => {
                    this.gachaTimer = null;
                    if (!this.gachaOpen || generation !== this.gachaGeneration) return;
                    spinner.classList.remove('rolling');
                    spinner.classList.add('hidden');

                    const randIndex = Math.floor(Math.random() * pool.length);
                    const chosen = pool[randIndex];

                    const qEl = getElement('gacha-question');
                    const tEl = getElement('gacha-text');

                    if (qEl) qEl.textContent = chosen.question;
                    
                    if (tEl) {
                        if (target === 'book-synopsis') {
                            tEl.innerHTML = `
                                <div class="text-xs text-gray-500 font-bold mb-1">【結合後のイメージ】</div>
                                <div class="p-2 bg-blue-50 rounded text-gray-800 font-bold mb-3">
                                    ${Utils.combineSynopsis(this.formData.genre, chosen.a, chosen.b, chosen.c)}
                                </div>
                                <div class="space-y-1">
                                    <div><span class="text-xs text-adventure-ocean font-bold">A:</span> <span class="text-xs">${chosen.a}</span></div>
                                    <div><span class="text-xs text-adventure-ocean font-bold">B:</span> <span class="text-xs">${chosen.b}</span></div>
                                    <div><span class="text-xs text-adventure-ocean font-bold">C:</span> <span class="text-xs">${chosen.c}</span></div>
                                </div>
                            `;
                        } else {
                            tEl.textContent = chosen.text;
                        }
                    }

                    this.latestGachaChosen = chosen;
                    resultDisplay.classList.remove('hidden');
                    emitBookEvent('gacha-ready', { target });
                    
                    // ボタンのロック解除
                    if (applyBtn) applyBtn.disabled = false;
                    if (rerollBtn) rerollBtn.disabled = false;
                    if (closeBtn) {
                        closeBtn.disabled = false;
                        closeBtn.style.opacity = '';
                        closeBtn.style.pointerEvents = '';
                    }
                }, 1200);
            },

        };

        return app;
}

if (typeof document !== 'undefined') {
    const initializeBookReport = () => createBookReportApp().init();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeBookReport, { once: true });
    } else {
        initializeBookReport();
    }
}

// Node.js テスト用のエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Utils,
        createBookReportApp, normalizeFormData, mergeFormData, debounce
    };
}
