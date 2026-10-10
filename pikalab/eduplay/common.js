// common.js - 知育ひろば共通ロジック

// 共通データ（キャラクターやアイテム）
const EduData = {
    items: [
        { id: 'lion', emoji: "🦁", name: "ライオン", desc: "たてがみが かっこいいよ！" },
        { id: 'elephant', emoji: "🐘", name: "ぞう", desc: "おはなが ながいね！" },
        { id: 'giraffe', emoji: "🦒", name: "きりん", desc: "くびが とっても ながい！" },
        { id: 'dog', emoji: "🐶", name: "いぬ", desc: "ワンワン！ なかよしだよ。" },
        { id: 'cat', emoji: "🐱", name: "ねこ", desc: "ニャーオ！ しなやかだね。" },
        { id: 'rabbit', emoji: "🐰", name: "うさぎ", desc: "ぴょんぴょん！ みみが ながいね。" },
        { id: 'apple', emoji: "🍎", name: "りんご", desc: "あかくて シャキシャキ！" },
        { id: 'banana', emoji: "🍌", name: "バナナ", desc: "きいろくて あまいね。" },
        { id: 'strawberry', emoji: "🍓", name: "いちご", desc: "あかくて つぶつぶ！" },
        { id: 'donut', emoji: "🍩", name: "ドーナツ", desc: "あまくて まるいね。" },
        { id: 'onigiri', emoji: "🍙", name: "おにぎり", desc: "おいしい おこめだよ。" },
        { id: 'cake', emoji: "🍰", name: "ケーキ", desc: "あまくて ふわふわ！" },
        { id: 'car', emoji: "🚓", name: "パトカー", desc: "ウーウー！ けいさつだよ。" },
        { id: 'fire_engine', emoji: "🚒", name: "しょうぼうしゃ", desc: "カンカン！ かじを けすよ。" },
        { id: 'train', emoji: "🚄", name: "しんかんせん", desc: "ビューン！ とっても はやい！" },
        { id: 'bus', emoji: "🚌", name: "バス", desc: "みんなを のせて はしるよ。" },
        { id: 'airplane', emoji: "✈️", name: "ひこうき", desc: "おそらを とんでいくよ！" },
        { id: 'ship', emoji: "🚢", name: "ふね", desc: "うみの うえを すすむよ。" },
        { id: 'circle', emoji: "⭕️", name: "まる", desc: "コロコロ まんまる！" },
        { id: 'triangle', emoji: "🔺", name: "さんかく", desc: "とんがりが ３つあるね。" },
        { id: 'square', emoji: "🔲", name: "しかく", desc: "かくかく しているね。" },
        { id: 'star', emoji: "⭐", name: "ほし", desc: "おそらで キラキラ！" },
        { id: 'heart', emoji: "❤️", name: "ハート", desc: "かわいい かたちだね！" },
        { id: 'crescent', emoji: "🌙", name: "みかづき", desc: "おつきさまの かたち！" },
        { id: 'butterfly', emoji: "🦋", name: "ちょうちょ", desc: "ヒラヒラ とんでるよ。" },
        { id: 'ladybug', emoji: "🐞", name: "てんとうむし", desc: "みずたま もようだね。" },
        { id: 'bee', emoji: "🐝", name: "はち", desc: "ブーン！ みつを あつめるよ。" },
        { id: 'caterpillar', emoji: "🐛", name: "あおむし", desc: "はっぱを ムシャムシャ。" },
        { id: 'ant', emoji: "🐜", name: "あり", desc: "ちいさくて ちからもち！" },
        { id: 'snail', emoji: "🐌", name: "かたつむり", desc: "おうちを せおっているよ。" }
    ],
    // カテゴリごとのアイテム取得ヘルパー
    getItemsByIDs: function(idArray) {
        return this.items.filter(item => idArray.includes(item.id));
    }
};

const EDU_SOUND_STORAGE_KEY = 'wonder_school_profile_v2';
const EDU_SOUND_DEFAULTS = Object.freeze({ isOn: true, volume: 0.1 });

function getSafeLocalStorage(scope = typeof globalThis !== 'undefined' ? globalThis : null) {
    try {
        return scope?.localStorage ?? null;
    } catch (error) {
        console.warn('[EduPlay] ブラウザ保存領域を利用できません。', error);
        return null;
    }
}

function normalizeEduSoundVolume(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return EDU_SOUND_DEFAULTS.volume;
    return Math.min(1, Math.max(0.01, parsed));
}

function loadEduSoundSettings(storage) {
    try {
        const stored = storage?.getItem(EDU_SOUND_STORAGE_KEY);
        if (!stored) return { ...EDU_SOUND_DEFAULTS };

        const data = JSON.parse(stored);
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return { ...EDU_SOUND_DEFAULTS };
        }

        const isOn = typeof data.isMuted === 'boolean'
            ? !data.isMuted
            : EDU_SOUND_DEFAULTS.isOn;
        const volume = Number.isFinite(Number(data.volumeDb))
            ? normalizeEduSoundVolume(Math.pow(10, Number(data.volumeDb) / 40))
            : EDU_SOUND_DEFAULTS.volume;

        return { isOn, volume };
    } catch (error) {
        console.warn('[EduSound] 音設定を読み込めませんでした。既定値を使用します。', error);
        return { ...EDU_SOUND_DEFAULTS };
    }
}

function saveEduSoundSettings(storage, isOn, volume) {
    try {
        if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
            return false;
        }

        let profile = {};
        const stored = storage.getItem(EDU_SOUND_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                profile = parsed;
            }
        }

        const normalizedVolume = normalizeEduSoundVolume(volume);
        profile.isMuted = !Boolean(isOn);
        profile.volumeDb = 40 * Math.log10(normalizedVolume);
        storage.setItem(EDU_SOUND_STORAGE_KEY, JSON.stringify(profile));
        return true;
    } catch (error) {
        console.warn('[EduSound] 音設定を保存できませんでした。', error);
        return false;
    }
}

// 音声管理モジュール
const EduSound = {
    isOn: true,
    preferredVoice: null,
    volume: 0.1, // デフォルトボリューム (db = -20)

    syncButton: function(btnElement) {
        const btn = btnElement || (typeof document !== 'undefined' ? document.getElementById('sound-toggle') : null);
        if (!btn) return;
        btn.innerText = this.isOn ? '🔊' : '🔇';
        btn.setAttribute('aria-label', this.isOn ? '音を消す' : '音を出す');
        btn.setAttribute('aria-pressed', this.isOn ? 'true' : 'false');
    },
    
    init: function() {
        const storage = getSafeLocalStorage();
        const settings = loadEduSoundSettings(storage);
        this.isOn = settings.isOn;
        this.volume = settings.volume;

        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const loadVoices = () => {
                const voices = window.speechSynthesis.getVoices();
                this.preferredVoice = voices.find(v => v.lang === 'ja-JP' && (v.name.includes('Google') || v.name.includes('Online') || v.name.includes('Nanami') || v.name.includes('Kyoko'))) 
                                   || voices.find(v => v.lang.includes('ja'));
            };
            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        // ミュートボタンの初期テキストを同期
        if (typeof document !== 'undefined') {
            setTimeout(() => this.syncButton(), 100);
        }
    },
    
    toggle: function(btnElement) {
        this.isOn = !this.isOn;
        if (this.isOn) {
            if (this.volume <= 0) this.volume = 0.1;
            this.speak('おとをだすよ');
        } else {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        }
        this.syncButton(btnElement);
        const storage = getSafeLocalStorage();
        saveEduSoundSettings(storage, this.isOn, this.volume);
    },
    
    speak: function(text, rate = 0.9, pitch = 1.2) {
        if (!this.isOn || !('speechSynthesis' in window)) return;
        
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ja-JP';
            utterance.rate = rate;
            utterance.pitch = pitch;
            utterance.volume = this.volume;
            
            if (!this.preferredVoice && window.speechSynthesis.getVoices().length > 0) {
                this.init();
            }
            if (this.preferredVoice) {
                utterance.voice = this.preferredVoice;
            }
            
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error("Speech synthesis failed", e);
        }
    }
};

// 再プレイ時に前のクリア画面の監視・フォーカス処理を残さない。
const clearOverlayCleanups = new WeakMap();

// ユーティリティモジュール（紙吹雪やシャッフル）
const EduUtils = {
    // モード変更や再プレイで、前の画面の遅延処理をまとめて取り消す。
    createTimerScope: function() {
        const pending = new Set();
        return {
            schedule(callback, delay) {
                const id = setTimeout(() => {
                    pending.delete(id);
                    callback();
                }, delay);
                pending.add(id);
                return id;
            },
            clear() {
                pending.forEach(id => clearTimeout(id));
                pending.clear();
            }
        };
    },
    shootConfetti: function() {
        const colors = ['#fce18a', '#ff726d', '#b48def', '#f4306d', '#55efc4'];
        const fragment = document.createDocumentFragment();
        
        for(let i = 0; i < 40; i++) {
            let conf = document.createElement('div');
            conf.className = 'confetti-piece';
            conf.style.left = Math.random() * 100 + 'vw';
            conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            
            let startY = Math.random() * 20 + 10 + 'vh';
            let endY = '100vh';
            let startX = 0;
            let endX = Math.random() * 100 - 50 + 'px';

            conf.animate([
                { transform: `translate3d(${startX}, ${startY}, 0) rotate(0deg)`, opacity: 1 },
                { transform: `translate3d(${endX}, ${endY}, 0) rotate(${Math.random()*360}deg)`, opacity: 0 }
            ], { 
                duration: Math.random() * 1000 + 1500, 
                easing: 'cubic-bezier(.37,0,.63,1)' 
            });

            fragment.appendChild(conf);
            
            // ガベージコレクションのためにsetTimeoutで消す
            setTimeout(() => {
                if (conf.parentNode) conf.remove();
            }, 2500);
        }
        document.body.appendChild(fragment);
    },
    
    shuffleArray: function(array) {
        let newArray = [...array];
        let currentIndex = newArray.length, randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
        }
        return newArray;
    },

    awardEduplayBadge: function() {
        try {
            const STORAGE_KEY = 'wonder_school_profile_v2';
            const storage = getSafeLocalStorage();
            if (!storage) return;
            let profileRaw = storage.getItem(STORAGE_KEY);
            let profile = { badges: [] };
            if (profileRaw) {
                profile = JSON.parse(profileRaw);
            }
            if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
                profile = { badges: [] };
            }
            if (!Array.isArray(profile.badges)) {
                profile.badges = [];
            }
            if (!profile.badges.includes('eduplay')) {
                profile.badges.push('eduplay');
                storage.setItem(STORAGE_KEY, JSON.stringify(profile));
                console.log('Awarded badge: eduplay');
                setTimeout(() => {
                    EduSound.speak("「ひろばのスター」バッジをゲットしたよ！");
                }, 1000);
            }
        } catch (e) {
            console.error('Failed to award badge:', e);
        }
    },

    completeGameClear: function(speechText, overlayId = 'clear-overlay') {
        try {
            if (speechText) {
                EduSound.speak(speechText);
            }
            this.shootConfetti();
            this.awardEduplayBadge();
            const overlay = document.getElementById(overlayId);
            if (overlay) {
                const previousCleanup = clearOverlayCleanups.get(overlay);
                if (previousCleanup) previousCleanup();
                // 背面要素 (id="app") を inert にしてキーボード操作をブロック
                const appContainer = document.getElementById('app');
                const wasInert = appContainer && appContainer.hasAttribute('inert');
                if (appContainer) {
                    appContainer.setAttribute('inert', 'true');
                }

                overlay.classList.remove('hidden');

                // クリア画面の最初のフォーカス可能要素（通常は「もういっかい！」ボタン）にフォーカス
                const focusTimer = setTimeout(() => {
                    if (overlay.classList.contains('hidden')) return;
                    const firstBtn = overlay.querySelector('button, a');
                    if (firstBtn) firstBtn.focus();
                }, 100);

                // Tabキーのフォーカストラップハンドラを設定
                const handleOverlayKeyDown = (e) => {
                    if (overlay.classList.contains('hidden')) {
                        overlay.removeEventListener('keydown', handleOverlayKeyDown);
                        return;
                    }
                    if (e.key === 'Tab') {
                        const focusables = overlay.querySelectorAll('button, a');
                        if (focusables.length > 0) {
                            const first = focusables[0];
                            const last = focusables[focusables.length - 1];
                            if (e.shiftKey && document.activeElement === first) {
                                e.preventDefault();
                                last.focus();
                            } else if (!e.shiftKey && document.activeElement === last) {
                                e.preventDefault();
                                first.focus();
                            }
                        }
                    }
                };
                overlay.addEventListener('keydown', handleOverlayKeyDown);

                // 非表示になった時点でリスナー・遅延フォーカスも片付ける。
                const cleanup = () => {
                    clearTimeout(focusTimer);
                    overlay.removeEventListener('keydown', handleOverlayKeyDown);
                    observer.disconnect();
                    if (appContainer && !wasInert) appContainer.removeAttribute('inert');
                    clearOverlayCleanups.delete(overlay);
                };
                const observer = new MutationObserver(() => {
                    if (!overlay.classList.contains('hidden')) return;
                    cleanup();
                    const backBtn = document.getElementById('game-back-btn');
                    if (backBtn) backBtn.focus();
                });
                clearOverlayCleanups.set(overlay, cleanup);
                observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
            }
        } catch (e) {
            console.error('Failed during game clear process:', e);
        }
    },

    setupLongPressBack: function(btnElement, targetUrl) {
        if (!btnElement) return;

        // 既存のインラインonclick属性を削除し、長押しでのみ動作するようにする
        btnElement.removeAttribute('onclick');

        let pressTimer; let startTime; const showTooltip = () => { const oldTip = document.getElementById('longpress-back-tip'); if (oldTip) oldTip.remove(); const tip = document.createElement('div'); tip.id = 'longpress-back-tip'; tip.innerText = '1.5\u3073\u3087\u3046 \u306a\u304c\u304a\u3057 \u3057\u3066\u306d\uff01'; Object.assign(tip.style, { position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%) translateY(10px)', backgroundColor: '#ef4444', color: '#ffffff', padding: '12px 24px', borderRadius: '9999px', boxShadow: '0 8px 16px rgba(0,0,0,0.15)', zIndex: '99999', fontSize: '18px', fontWeight: 'bold', pointerEvents: 'none', opacity: '0', transition: 'opacity 0.2s ease, transform 0.2s ease', border: '3px solid #ffffff' }); document.body.appendChild(tip); requestAnimationFrame(() => { tip.style.opacity = '1'; tip.style.transform = 'translateX(-50%) translateY(0)'; }); EduSound.speak('\u3044\u3061\u3066\u3093\u3054\u3073\u3087\u3046 \u306a\u304c\u304a\u3057 \u3057\u3066\u306d'); setTimeout(() => { tip.style.opacity = '0'; tip.style.transform = 'translateX(-50%) translateY(-10px)'; setTimeout(() => tip.remove(), 200); }, 2000); };
        let isPressing = false;
        const holdTime = 1500; // 1.5秒長押し
        
        // プログレスゲージ用に背景色（薄い赤）をセット
        btnElement.style.backgroundImage = 'linear-gradient(to right, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.3))';
        btnElement.style.backgroundRepeat = 'no-repeat';
        btnElement.style.backgroundSize = '0% 100%';
        btnElement.style.backgroundPosition = 'left center';
        
        // 文字の末尾にながおしヒントを追加
        const originalText = btnElement.innerText;
        const baseHintText = originalText + " (おしつづけてね)";
        btnElement.innerText = baseHintText;
        btnElement.title = "1.5びょう ながおし してね！";

        const startPress = (e) => {
            if (e.cancelable) e.preventDefault();
            if (isPressing) return;
            isPressing = true; startTime = Date.now();
            
            // ゲージアニメーション開始
            btnElement.style.transition = `background-size ${holdTime}ms linear`;
            btnElement.style.backgroundSize = '100% 100%';
            
            // 押し続けている間のテキスト動的変化（ぎゅーっ！）
            btnElement.innerText = baseHintText + " ぎゅーっ！";
            
            EduSound.speak("ぎゅーっと おしてね！", 1.0, 1.3);
            
            pressTimer = setTimeout(() => {
                if (isPressing) {
                    location.href = targetUrl;
                }
            }, holdTime);
        };

        const endPress = () => {
            if (!isPressing) return;
            isPressing = false;
            clearTimeout(pressTimer);
            // ゲージリセット
            btnElement.style.transition = 'none';
            btnElement.style.backgroundSize = '0% 100%';
            
            // テキストを元に戻す
            btnElement.innerText = baseHintText; const elapsed = Date.now() - startTime; if (elapsed < holdTime && elapsed > 100) { showTooltip(); }
        };

        btnElement.addEventListener('pointerdown', startPress);
        btnElement.addEventListener('pointerup', endPress);
        btnElement.addEventListener('pointercancel', endPress);
        
        // スクリュー等の誤動作を防止
        btnElement.style.touchAction = 'none';
    }
};

// 初期化実行
if (typeof window !== 'undefined') {
    EduSound.init();
}

// タブ切り替え時（非表示時）の音声読み上げ停止処理（ホスピタリティ）
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        }
    });
}

// 保護者向けモーダル共通制御ロジック
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const openBtns = document.querySelectorAll('[data-action="parents-modal-open"]');
        const closeBtns = document.querySelectorAll('[data-action="parents-modal-close"]');
        const dialog = document.getElementById('parents-modal');
        if (!dialog) return;

        let opener = null;
        const restoreOpener = () => {
            openBtns.forEach(btn => btn.setAttribute('aria-expanded', 'false'));
            if (opener) opener.focus();
            opener = null;
        };
        const closeDialog = () => {
            if (typeof dialog.close === 'function') {
                dialog.close();
            } else {
                dialog.removeAttribute('open');
                dialog.style.display = 'none';
                restoreOpener();
            }
        };
        openBtns.forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.preventDefault();
                opener = btn;
                if (typeof dialog.showModal === 'function') {
                    dialog.showModal();
                } else {
                    dialog.setAttribute('open', '');
                    dialog.style.display = 'block';
                }
                btn.setAttribute('aria-expanded', 'true');
            });
        });
        closeBtns.forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.preventDefault();
                closeDialog();
            });
        });
        // Escapeによるネイティブの閉じ方でも展開状態とフォーカスを戻す。
        dialog.addEventListener('close', restoreOpener);
        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) closeDialog();
        });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EDU_SOUND_STORAGE_KEY,
        getSafeLocalStorage,
        loadEduSoundSettings,
        saveEduSoundSettings
    };
}
