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
    TOAST_CONTAINER: 'toast-container',
    PARENT_MODAL: 'parent-modal',
    PARENT_MODAL_CONTENT: 'parent-modal-content',
    PARENT_MODAL_OVERLAY: 'parent-modal-overlay'
};

const TEXT_TEMPLATES = {
    MOTIVATION: {
        cover: '表紙の絵やタイトルにとても惹かれたからです。',
        recommend: '先生（または親）に「面白いよ」とすすめられたからです。',
        movie: '前に映画（アニメ）で見たことがあって、本でも読んでみたいと思ったからです。',
        interest: '私の好きなことに関系がある本だったからです。',
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
        partBPlaceholder: '例：何度も実験をくり返し、電球を発明して',
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
        const portalRaw = localStorage.getItem('wonder_school_profile_v2');
        if (portalRaw) {
            const portalData = JSON.parse(portalRaw);
            if (portalData.textSize === 'large') {
                document.body.classList.add('text-large');
            }
            if (portalData.reduceMotion === true) {
                document.body.classList.add('reduce-motion');
            }
        }
    } catch (e) {
        console.error("Failed to apply portal settings:", e);
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
        return text.replace(/[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Extended_Pictographic}]+/gu, '').trim();
    },

    sanitizeFilename(name) {
        if (!name) return '';
        return name
            .replace(/[/\\:*?"<>|]/g, '_')
            .replace(/\s+/g, '_')
            .substring(0, 100);
    },

    coerceSafeString(value, maxLength = 300) {
        const normalized = typeof value === 'string' ? value : '';
        const trimmed = normalized.trim();
        return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
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
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
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

            activeSlot: 1, // 現在のスロット番号
            currentGachaTarget: null,
            latestGachaChosen: null,
            focusTrapHandler: null,
            previouslyFocused: null,

            // ----------------------------------------
            // Initialization
            // ----------------------------------------
            init() {
                applyPortalSettings();
                const urlRestored = this.loadFromUrlParams();
                if (!urlRestored) {
                    this.loadSavedData();
                }
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
            },

            listenStorageChanges() {
                window.addEventListener('storage', (e) => {
                    if (e.key === this.getStorageKey() || e.key === CONFIG.ACTIVE_SLOT_KEY) {
                        this.loadSavedData();
                        this.restoreStep();
                        this.applyGenreUI();
                        const resultSection = getElement(SELECTORS.RESULT_SECTION);
                        if (resultSection && !resultSection.classList.contains('hidden')) {
                            this.populateResults();
                        }
                    }
                });
            },

            // ----------------------------------------
            // URL Share & Serialization & Print Synchronization
            // ----------------------------------------
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
                    const jsonStr = new TextDecoder().decode(bytes);
                    return JSON.parse(jsonStr);
                } catch (e) {
                    console.error('デシリアライズ失敗:', e);
                    return null;
                }
            },

            loadFromUrlParams() {
                try {
                    const params = new URLSearchParams(window.location.search);
                    const dataParam = params.get('data');
                    if (!dataParam) return false;

                    const decodedData = this.deserializePlanData(dataParam);
                    if (decodedData && typeof decodedData === 'object') {
                        this.resetFormDataToDefault();
                        for (const field of ALLOWED_FORM_FIELDS) {
                            if (decodedData[field] !== undefined) {
                                const maxLength = CONFIG.MAX_LENGTHS[field] || 1000;
                                this.formData[field] = Utils.coerceSafeString(decodedData[field], maxLength);
                            }
                        }
                        this.currentStep = decodedData.currentStep || 1;
                        this.saveData();
                        this.populateForm();

                        if (decodedData.showResults) {
                            const wizardForm = getElement(SELECTORS.WIZARD_FORM);
                            const resultSection = getElement(SELECTORS.RESULT_SECTION);
                            const progressContainer = getElement(SELECTORS.PROGRESS_CONTAINER);
                            if (wizardForm) wizardForm.style.display = 'none';
                            if (progressContainer) progressContainer.style.display = 'none';
                            if (resultSection) {
                                resultSection.classList.remove('hidden');
                            }
                            this.populateResults();
                        } else {
                            this.restoreStep();
                        }

                        if (typeof history !== 'undefined' && history.replaceState) {
                            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                            history.replaceState({path: cleanUrl}, '', cleanUrl);
                        }

                        this.showToast('共有された感想文データを読み込みました');
                        return true;
                    }
                } catch (e) {
                    console.warn('Failed to load from URL params:', e);
                }
                return false;
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
                };

                const closeShareModal = () => {
                    shareModal.close();
                    if (lastShareTrigger && typeof lastShareTrigger.focus === 'function') {
                        lastShareTrigger.focus();
                        lastShareTrigger = null;
                    }
                };

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
                    shareCopyBtn.addEventListener('click', () => {
                        shareLinkInput.select();
                        shareLinkInput.setSelectionRange(0, 99999);
                        try {
                            navigator.clipboard.writeText(shareLinkInput.value).then(() => {
                                this.showToast('📋 リンクをコピーしました！');
                            }).catch(() => {
                                document.execCommand('copy');
                                this.showToast('📋 リンクをコピーしました！');
                            });
                        } catch (err) {
                            document.execCommand('copy');
                            this.showToast('📋 リンクをコピーしました！');
                        }
                    });
                }
            },

            getStorageKey(slot = this.activeSlot) {
                return `${CONFIG.STORAGE_KEY_PREFIX}${slot}`;
            },

            applyInputConstraints() {
                const fieldConfig = [
                    ['book-title', CONFIG.MAX_LENGTHS.title],
                    ['book-author', CONFIG.MAX_LENGTHS.author],
                    ['synopsis-part-a', CONFIG.MAX_LENGTHS.synopsisPartA],
                    ['synopsis-part-b', CONFIG.MAX_LENGTHS.synopsisPartB],
                    ['synopsis-part-c', CONFIG.MAX_LENGTHS.synopsisPartC],
                    ['motivation-detail', CONFIG.MAX_LENGTHS.motivationDetail],
                    ['scene-desc', CONFIG.MAX_LENGTHS.sceneDesc],
                    ['scene-myself', CONFIG.MAX_LENGTHS.sceneMyself],
                    ['conclusion-change', CONFIG.MAX_LENGTHS.conclusionChange]
                ];

                fieldConfig.forEach(([id, maxLength]) => {
                    const element = getElement(id);
                    if (!element) return;
                    element.maxLength = maxLength;
                    
                    const countSpan = getElement(`${id}-char-count`);
                    const updateCount = () => {
                        const len = Utils.getCharLength(element.value);
                        if (countSpan) {
                            countSpan.textContent = len;
                        }
                        const container = getElement(`${id}-counter-container`);
                        if (container) {
                            if (len >= maxLength) {
                                container.className = 'char-counter danger';
                            } else if (len >= maxLength * 0.8) {
                                container.className = 'char-counter warning';
                            } else {
                                container.className = 'char-counter';
                            }
                        }
                    };

                    element.addEventListener('input', () => {
                        element.value = Utils.coerceSafeString(element.value, maxLength);
                        updateCount();
                    });
                    updateCount();
                });
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
                getElement('print-btn')?.addEventListener('click', () => window.print());
                getElement('reset-btn')?.addEventListener('click', () => this.resetForm());
                getElement('big-print-pdf-btn')?.addEventListener('click', () => window.print());

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
                            document.querySelectorAll('.copy-card').forEach(c => c.classList.remove('active'));
                            card.classList.add('active');
                            this.formData.selectedOpening = targetId;
                            this.updateMeter();
                            this.saveData();
                        }
                    });

                    card.setAttribute('tabindex', '0');
                    card.setAttribute('role', 'button');
                    card.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            const targetId = card.dataset.copyTarget;
                            if (targetId) {
                                this.copyText(targetId);
                                
                                document.querySelectorAll('.copy-card').forEach(c => c.classList.remove('active'));
                                card.classList.add('active');
                                this.formData.selectedOpening = targetId;
                                this.updateMeter();
                                this.saveData();
                            }
                        }
                    });
                });

                // Modal
                getElement('open-parent-btn')?.addEventListener('click', () => this.openModal());
                getElement(SELECTORS.PARENT_MODAL_OVERLAY)?.addEventListener('click', () => this.closeModal());
                getElement('parent-modal-close')?.addEventListener('click', () => this.closeModal());
                getElement('parent-modal-close-bottom')?.addEventListener('click', () => this.closeModal());

                // Escape key to close modal
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        const modal = getElement(SELECTORS.PARENT_MODAL);
                        if (modal && !modal.classList.contains('hidden')) {
                            this.closeModal();
                        }
                    }
                });
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
                const textarea = getElement('draft-textarea');
                const loadBtn = getElement('load-outline-to-draft-btn');

                if (textarea) {
                    textarea.addEventListener('input', () => {
                        this.formData.draftText = textarea.value;
                        this.updateDraftCounters();
                        this.syncPrintElements();
                        this.saveData();
                    });
                }

                if (loadBtn) {
                    loadBtn.addEventListener('click', () => {
                        this.loadOutlineToDraft();
                    });
                }
            },

            setupAutosave() {
                const debouncedSave = debounce(() => this.saveData(), CONFIG.AUTOSAVE_DEBOUNCE);

                document.querySelectorAll('input[type="text"], textarea').forEach(input => {
                    if (input.id === 'draft-textarea') return; // 清書エディタは別途監視
                    input.addEventListener('input', debouncedSave);
                });
            },

            // ----------------------------------------
            // Navigation Logic
            // ----------------------------------------
            nextStep(step) {
                if (!this.validateStep(step)) return;
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

                    setTimeout(() => {
                        const firstInput = next.querySelector('input, textarea');
                        if (firstInput) {
                            firstInput.focus();
                        }
                    }, CONFIG.ANIMATION_DURATION + 200);
                }
            },

            prevStep(step) {
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
                    if (field) field.classList.remove('error');
                    if (errorEl) errorEl.textContent = '';
                };

                const setError = (fieldId, message) => {
                    const field = getElement(fieldId);
                    const errorEl = getElement(`${fieldId}-error`);
                    if (field) {
                        field.classList.add('error');
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
                return getElement(id)?.value?.trim() || '';
            },

            getRadioValue(name) {
                return document.querySelector(`input[name="${name}"]:checked`)?.value || '';
            },

            collectData() {
                const selectedFeeling = document.querySelector('.feeling-chip.selected')?.dataset?.val || this.formData.sceneFeeling;
                const selectedGenre = document.querySelector('input[name="genre"]:checked')?.value || this.formData.genre || 'story';
                this.formData = {
                    ...this.formData,
                    genre: selectedGenre,
                    title: Utils.coerceSafeString(this.getFieldValue('book-title'), CONFIG.MAX_LENGTHS.title),
                    author: Utils.coerceSafeString(this.getFieldValue('book-author'), CONFIG.MAX_LENGTHS.author),
                    synopsisPartA: Utils.coerceSafeString(this.getFieldValue('synopsis-part-a'), CONFIG.MAX_LENGTHS.synopsisPartA),
                    synopsisPartB: Utils.coerceSafeString(this.getFieldValue('synopsis-part-b'), CONFIG.MAX_LENGTHS.synopsisPartB),
                    synopsisPartC: Utils.coerceSafeString(this.getFieldValue('synopsis-part-c'), CONFIG.MAX_LENGTHS.synopsisPartC),
                    motivation: this.getRadioValue('motivation'),
                    motivationDetail: Utils.coerceSafeString(this.getFieldValue('motivation-detail'), CONFIG.MAX_LENGTHS.motivationDetail),
                    sceneDesc: Utils.coerceSafeString(this.getFieldValue('scene-desc'), CONFIG.MAX_LENGTHS.sceneDesc),
                    sceneFeeling: Utils.coerceSafeString(selectedFeeling, CONFIG.MAX_LENGTHS.sceneFeeling),
                    sceneMyself: Utils.coerceSafeString(this.getFieldValue('scene-myself'), CONFIG.MAX_LENGTHS.sceneMyself),
                    conclusionChange: Utils.coerceSafeString(this.getFieldValue('conclusion-change'), CONFIG.MAX_LENGTHS.conclusionChange),
                    draftText: Utils.coerceSafeString(this.getFieldValue('draft-textarea'), CONFIG.MAX_LENGTHS.draftText)
                };
            },

            saveData() {
                this.collectData();
                try {
                    this.persistState();
                    this.updateSlotTitles(); // しおりタイトルの更新
                } catch (e) {
                    console.warn('Failed to save data to localStorage:', e);
                }
            },

            saveStep() {
                try {
                    this.persistState();
                } catch (e) {
                    console.warn('Failed to save step:', e);
                }
            },

            persistState() {
                const dataToSave = {
                    formData: this.formData,
                    currentStep: this.currentStep,
                    savedAt: new Date().toISOString()
                };
                localStorage.setItem(this.getStorageKey(), JSON.stringify(dataToSave));
                localStorage.setItem(CONFIG.ACTIVE_SLOT_KEY, String(this.activeSlot));
            },

            loadSavedData(requestedSlot = null) {
                this.resetFormDataToDefault();
                this.currentStep = 1;
                const hasRequestedSlot = [1, 2, 3].includes(requestedSlot);
                if (hasRequestedSlot) this.activeSlot = requestedSlot;
                try {
                    // 現在のアクティブスロットを取得
                    if (!hasRequestedSlot) {
                        const savedActiveSlot = localStorage.getItem(CONFIG.ACTIVE_SLOT_KEY);
                        this.activeSlot = ['1', '2', '3'].includes(savedActiveSlot) ? Number(savedActiveSlot) : 1;
                    }

                    const key = this.getStorageKey();
                    const saved = localStorage.getItem(key);

                    if (saved) {
                        const data = JSON.parse(saved);
                        if (data.formData && typeof data.formData === 'object' && !Array.isArray(data.formData)) {
                            if (data.formData.synopsis && !data.formData.synopsisPartA) {
                                data.formData.synopsisPartA = data.formData.synopsis;
                                delete data.formData.synopsis;
                            }

                            for (const field of ALLOWED_FORM_FIELDS) {
                                if (Object.prototype.hasOwnProperty.call(data.formData, field) &&
                                    typeof data.formData[field] === 'string') {
                                    const maxLength = CONFIG.MAX_LENGTHS[field] || 1000;
                                    this.formData[field] = Utils.coerceSafeString(data.formData[field], maxLength);
                                }
                            }
                            if (!this.formData.genre) {
                                this.formData.genre = 'story';
                            }
                            if (!this.formData.selectedOpening) {
                                this.formData.selectedOpening = 'opening-a';
                            }
                        }
                        if (Number.isInteger(data.currentStep) && data.currentStep >= 1 && data.currentStep <= CONFIG.TOTAL_STEPS) {
                            this.currentStep = data.currentStep;
                        }
                    } else {
                        this.currentStep = 1;
                    }
                } catch (e) {
                    console.warn('Failed to load saved data, self-repairing slot:', e);
                    try {
                        localStorage.removeItem(this.getStorageKey());
                    } catch (err) {}
                }
                this.populateForm();
                this.updateSlotTabsUI();
                this.updateSlotTitles();
                this.syncPrintElements();
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
                        el.value = value || '';
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
                if (![1, 2, 3].includes(slotNum) || slotNum === this.activeSlot || this.isSlotSwitching) return;

                // 切り替え直前の入力も、元のしおりへ確実に保存する。
                this.saveData();
                const wizard = getElement(SELECTORS.WIZARD_FORM);
                if (wizard) {
                    this.isSlotSwitching = true;
                    wizard.style.opacity = '0.5';
                    setTimeout(() => {
                        this.loadSavedData(slotNum);
                        this.saveStep();
                        this.restoreStep();
                        this.applyGenreUI();
                        
                        const wizardForm = getElement(SELECTORS.WIZARD_FORM);
                        const resultSection = getElement(SELECTORS.RESULT_SECTION);
                        const progressContainer = getElement(SELECTORS.PROGRESS_CONTAINER);
                        
                        if (wizardForm) wizardForm.style.display = 'block';
                        if (progressContainer) progressContainer.style.display = 'block';
                        if (resultSection) resultSection.classList.add('hidden');

                        wizard.style.opacity = '1';
                        this.isSlotSwitching = false;
                        this.showToast(`本棚のしおり ${slotNum} を開いたよ！📖`);
                    }, 150);
                } else {
                    this.loadSavedData(slotNum);
                    this.saveStep();
                    this.restoreStep();
                    this.applyGenreUI();
                }
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
                            const title = data?.formData?.title;
                            titleEl.textContent = title ? title : '題名なし';
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
                this.saveData();
                const field = getElement('conclusion-change');
                if (field) {
                    field.classList.remove('error');
                }

                if (!this.formData.conclusionChange) {
                    const field = getElement('conclusion-change');
                    if (field) {
                        field.classList.add('error');
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
                    const sceneSnippet = Utils.escapeHTML((d.sceneDesc || '').substring(0, 20));
                    openingC.innerHTML = TEXT_TEMPLATES.OPENING_C(safeTitle, sceneSnippet);
                }

                // Sync UI selected copy-card active highlights
                const activeId = this.formData.selectedOpening || 'opening-a';
                document.querySelectorAll('.copy-card').forEach(card => {
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

                this.updateMeter();
            },

            updateMeter() {
                const activeId = this.formData.selectedOpening || 'opening-a';
                const openingText = getElement(activeId)?.innerText || '';
                const bodyScene = getElement('body-scene-ref')?.innerText || '';
                const bodyMyself = getElement('body-myself-ref')?.innerText || '';
                const conclusion = getElement('conclusion-text')?.innerText || '';

                const total = Utils.getCharLength(openingText) + Utils.getCharLength(bodyScene) + Utils.getCharLength(bodyMyself) + Utils.getCharLength(conclusion);
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
                    await navigator.clipboard.writeText(text);
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
                    await navigator.clipboard.writeText(fullText);
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
                    URL.revokeObjectURL(url);
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
https://katakatalab.com/manner/`);
                        
                        window.location.href = `mailto:?subject=${mailSubject}&body=${mailBody}`;
                    }).catch(err => {
                        console.error('Mail clipboard copy failed:', err);
                        const mailSubject = encodeURIComponent(`【読書感想文設計図】「${title}」`);
                        const mailBody = encodeURIComponent(`本のタイトル：「${title}」の感想文設計図を作成しました。
詳細はサイトでご確認ください。

https://katakatalab.com/manner/`);
                        window.location.href = `mailto:?subject=${mailSubject}&body=${mailBody}`;
                    });
                }
            },

            resetForm() {
                if (confirm('入力した内容が消えてしまいますが、よろしいですか？')) {
                    try {
                        localStorage.removeItem(this.getStorageKey());
                    } catch (e) {
                        console.warn('Failed to clear localStorage:', e);
                    }
                    location.reload();
                }
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

                this.formData.draftText = combinedText;
                const textarea = getElement('draft-textarea');
                if (textarea) {
                    textarea.value = combinedText;
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
                const modal = getElement('gacha-modal');
                const content = getElement('gacha-modal-content');
                if (!modal || !content) return;

                this.currentGachaTarget = target;
                modal.classList.remove('hidden');
                requestAnimationFrame(() => {
                    content.classList.add('active');
                });

                this.rollGacha(target);
            },

            closeGachaModal() {
                const modal = getElement('gacha-modal');
                const content = getElement('gacha-modal-content');
                if (!modal || !content) return;

                content.classList.remove('active');
                setTimeout(() => {
                    modal.classList.add('hidden');
                }, CONFIG.ANIMATION_DURATION);
            },

            rollGacha(target) {
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
                    closeBtn.disabled = true;
                    closeBtn.style.opacity = '0.5';
                    closeBtn.style.pointerEvents = 'none';
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

                setTimeout(() => {
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

            // ----------------------------------------
            // Modal focus trap & transition
            // ----------------------------------------
            lastModalTrigger: null,

            openModal() {
                const modal = getElement(SELECTORS.PARENT_MODAL);
                if (!modal) return;

                this.lastModalTrigger = document.activeElement;

                if (!modal.dataset.clickBound) {
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) {
                            this.closeModal();
                        }
                    });
                    modal.dataset.clickBound = 'true';
                }

                modal.showModal();
            },

            closeModal() {
                const modal = getElement(SELECTORS.PARENT_MODAL);
                if (!modal) return;
                modal.close();
                if (this.lastModalTrigger && typeof this.lastModalTrigger.focus === 'function') {
                    this.lastModalTrigger.focus();
                    this.lastModalTrigger = null;
                }
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
        createBookReportApp
    };
}
