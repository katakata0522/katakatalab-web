/**
 * リズム・プログラミング Lab - Main Script
 * モジュールパターンでカプセル化
 */
const RhythmLab = (function () {
    'use strict';

    // ========================================
    // 定数
    // ========================================
    const STEPS = 16;
    const BEATS_PER_MEASURE = 4;
    const LAST_STEP_INDEX = STEPS - 1;
    const INSTRUMENTS = ['hihat', 'clap', 'snare', 'tom', 'kick'];
    const STORAGE_KEY = 'rhythmlab_user_projects_v2';
    const LEGACY_STORAGE_KEY = 'rhythmlab_user_presets';
    const VOLUME_STORAGE_KEY = 'rhythmlab_volume';
    const DARK_MODE_STORAGE_KEY = 'rhythmlab_dark_mode';
    const AUTOSAVE_STORAGE_KEY = 'rhythmlab_autosave_project_v2';
    const LEGACY_AUTOSAVE_STORAGE_KEY = 'rhythmlab_autosave_grid';
    const STORAGE_SCHEMA_VERSION = 2;
    const MAX_SHARE_PARAM_LENGTH = 4096;
    const MAX_USER_PRESETS = 20;
    const MAX_PRESET_NAME_LENGTH = 20;
    const MIN_TEMPO = 60;
    const MAX_TEMPO = 240;
    const DEFAULT_TEMPO = 120;
    const MIN_VOLUME = 0;
    const MAX_VOLUME = 100;
    const DEFAULT_VOLUME = 80;
    const ERROR_TOAST_DURATION = 5000;
    const AUDIO_ERROR_THROTTLE_MS = 10000;
    const SAVE_PRESET_LOCK_DURATION = 500; // 保存処理のロック時間
    const STORAGE_ERROR_MESSAGE = '保存できませんでした。ブラウザの保存容量や設定を確認してください。';

    // 楽器の音符・再生設定
    const INSTRUMENT_CONFIG = {
        kick: { note: 'C1', duration: '8n' },
        snare: { note: null, duration: '8n' },
        hihat: { note: 200, duration: '32n' },
        clap: { note: null, duration: '8n' },
        tom: { note: 'G2', duration: '8n' }
    };

    // シンセサイザー設定
    const SYNTH_CONFIG = {
        kick: {
            type: 'MembraneSynth',
            options: {
                pitchDecay: 0.05,
                octaves: 10,
                oscillator: { type: 'sine' },
                // リリースを短くしてタイトに、アタックを強調
                envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4, attackCurve: 'exponential' }
            },
            volume: 0
        },
        snare: {
            type: 'NoiseSynth',
            options: {
                noise: { type: 'white' },
                // ディケイを少し短くして歯切れよく
                envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
            },
            volume: -8
        },
        hihat: {
            type: 'MetalSynth',
            options: {
                envelope: { attack: 0.001, decay: 0.05, release: 0.01 }, // より短く鋭く
                harmonicity: 5.1,
                modulationIndex: 32,
                resonance: 4000,
                octaves: 1.5
            },
            volume: -15
        },
        clap: {
            type: 'NoiseSynth',
            options: {
                noise: { type: 'pink' },
                // クラップ特有の短い破裂音シミュレートのためリリースを極短に
                envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
            },
            volume: -10
        },
        tom: {
            type: 'MembraneSynth',
            options: {
                pitchDecay: 0.05,
                octaves: 4,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 1 }
            },
            volume: -5
        }
    };

    // ボタンクラス名
    const BUTTON_CLASSES = {
        playing: 'bg-slate-700 hover:bg-slate-800 text-white w-20 h-20 rounded-full shadow-inner flex items-center justify-center transition-transform scale-95 flex-shrink-0',
        stopped: 'bg-pink-500 hover:bg-pink-600 text-white w-20 h-20 rounded-full shadow-[0_6px_0_#be185d] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 active:shadow-none active:translate-y-1.5 flex-shrink-0'
    };

    // セルクラス名（モバイルでのタッチ領域を拡大）
    const CELL_CLASSES = {
        base: 'w-10 h-12 md:w-12 md:h-16 rounded-lg cursor-pointer transition-all duration-100 border flex-shrink-0 touch-manipulation',
        inactive: 'border-slate-600 bg-slate-900 hover:bg-slate-700',
        active: 'scale-105'
    };

    // インジケータークラス名
    const INDICATOR_CLASSES = {
        inactive: 'w-10 h-2 md:w-12 rounded-full bg-slate-700 transition-colors flex-shrink-0',
        active: 'w-10 h-2 md:w-12 rounded-full bg-white shadow-[0_0_10px_white] scale-110 flex-shrink-0'
    };

    // プリセット（子どもにも分かりやすく、ジャンル感が伝わる定番形）
    const PRESETS = {
        rock: {
            // 典型的な8ビート。バックビートに少しだけ推進力を足した形
            kick: [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
            snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1], // 最後オープン気味
            clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            tom: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0]
        },
        house: {
            // ハウス定番の四つ打ち。クラップと裏拍ハイハットで踊れる形
            kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            hihat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
            clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // Snareとレイヤー
            tom: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]
        },
        hiphop: {
            // Boom Bapスタイル。重いキックと2拍4拍のスネアを前に出す
            kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0],
            snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            tom: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0]
        },
        latin: {
            // ラテンポップ風。クラーベのアクセントと2拍4拍のバックビートを両立
            kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
            snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            clap: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0],
            tom: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]
        },
        funk: {
            // 16分ハイハットとシンコペーションしたスネアでノリを出す
            kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0],
            snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0],
            hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            tom: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
        },
        tomgroove: {
            // タムを主役にした練習向けグルーヴ。バックビートは残して迷いにくくする
            kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
            snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            hihat: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            tom: [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0]
        }
    };

    const PRESET_LABELS = {
        rock: '8ビート',
        house: 'ハウス',
        hiphop: 'ヒップホップ',
        latin: 'ラテン',
        funk: 'ファンク',
        tomgroove: 'トムグルーヴ'
    };

    // パフォーマンス用キャッシュ
    const stepClassCache = {
        active: new Array(STEPS),
        inactive: new Array(STEPS)
    };

    let isPlaying = false;
    let currentStep = 0;
    let tempo = DEFAULT_TEMPO;
    let volume = DEFAULT_VOLUME;
    let isAudioInit = false;
    let audioInitPromise = null;
    let synths = {};
    let masterGain = null;
    let limiter = null;
    let transportEventId = null;
    let lastAudioErrorAt = 0;
    let userPresets = [];
    let selectedPresetName = null;
    let errorToastTimeout = null; // トースト重複防止用
    let lastHelpTrigger = null;
    let playbackRequestId = 0;
    let isStartingPlayback = false;
    let audioGeneration = 0;
    const previewRequests = {};
    let shareModalCloseTimer = null;
    let lastFocusedElement = null;

    // 処理中フラグ（連打防止）
    const processingLocks = {
        savePreset: false
    };

    const grid = {};
    INSTRUMENTS.forEach(inst => {
        grid[inst] = new Array(STEPS).fill(0);
    });

    // ========================================
    // DOMキャッシュ
    // ========================================
    const domCache = {
        modal: null,
        playBtn: null,
        playIcon: null,
        tempoDisplay: null,
        tempoSlider: null,
        volumeSlider: null,
        volumeDisplay: null,
        stepIndicators: null,
        presetCurrentStatus: null,
        presetNameInput: null,
        userPresetList: null,
        helpBtn: null,
        helpCloseBtn: null,
        helpOkBtn: null,
        darkModeToggle: null,
        darkIcon: null,
        lightIcon: null,
        clearBeatsBtn: null,
        savePresetBtn: null,
        presetButtons: {},
        errorToast: null,
        rows: {},
        rowClearBtns: {},
        instrumentBtns: {},
        indicators: [],
        cells: {},
        shareBtn: null,
        shareModal: null,
        shareCloseBtn: null,
        shareCopyBtn: null,
        shareOkBtn: null,
        shareLinkInput: null,
        shareQrcode: null,
        shareContent: null
    };

    /**
     * DOM要素をキャッシュする
     */
    function cacheDOMElements() {
        domCache.modal = document.getElementById('help-modal');
        domCache.playBtn = document.getElementById('play-btn');
        domCache.playIcon = document.getElementById('play-icon');
        domCache.tempoDisplay = document.getElementById('tempo-input');
        domCache.tempoSlider = document.getElementById('tempo-slider');
        domCache.volumeSlider = document.getElementById('volume-slider');
        domCache.volumeDisplay = document.getElementById('volume-display');
        domCache.stepIndicators = document.getElementById('step-indicators');
        domCache.presetCurrentStatus = document.getElementById('preset-current-status');
        domCache.presetNameInput = document.getElementById('preset-name');
        domCache.userPresetList = document.getElementById('user-preset-list');
        domCache.helpBtn = document.getElementById('help-btn');
        domCache.helpCloseBtn = document.getElementById('help-close-btn');
        domCache.helpOkBtn = document.getElementById('help-ok-btn');
        domCache.darkModeToggle = document.getElementById('dark-mode-toggle');
        domCache.darkIcon = domCache.darkModeToggle?.querySelector('.dark-icon') ?? null;
        domCache.lightIcon = domCache.darkModeToggle?.querySelector('.light-icon') ?? null;
        domCache.clearBeatsBtn = document.getElementById('clear-beats-btn');
        domCache.savePresetBtn = document.getElementById('save-preset-btn');
        domCache.errorToast = document.getElementById('error-toast');
        domCache.shareBtn = document.getElementById('share-btn');
        domCache.shareModal = document.getElementById('share-modal');
        domCache.shareCloseBtn = document.getElementById('share-close-btn');
        domCache.shareCopyBtn = document.getElementById('share-copy-btn');
        domCache.shareOkBtn = document.getElementById('share-ok-btn');
        domCache.shareLinkInput = document.getElementById('share-link-input');
        domCache.shareQrcode = document.getElementById('share-qrcode');
        domCache.shareContent = document.getElementById('share-content');

        // プリセットボタン（定数PRESETSから動的に取得）
        Object.keys(PRESETS).forEach(name => {
            domCache.presetButtons[name] = document.getElementById(`preset-${name}`);
        });

        INSTRUMENTS.forEach(inst => {
            domCache.rows[inst] = document.getElementById(`row-${inst}`);
            domCache.rowClearBtns[inst] = document.getElementById(`clear-${inst}`);
            domCache.instrumentBtns[inst] = document.getElementById(`instrument-${inst}`);
        });
    }

    /**
     * テンポ値を安全な範囲へ正規化
     */
    function normalizeTempo(value) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed)) return DEFAULT_TEMPO;
        return clamp(parsed, MIN_TEMPO, MAX_TEMPO);
    }

    /**
     * 必須DOM要素の存在を検証
     */
    function validateRequiredElements() {
        const requiredElements = [
            ['playBtn', domCache.playBtn, '#play-btn'],
            ['playIcon', domCache.playIcon, '#play-icon'],
            ['tempoSlider', domCache.tempoSlider, '#tempo-slider'],
            ['tempoDisplay', domCache.tempoDisplay, '#tempo-input'],
            ['volumeSlider', domCache.volumeSlider, '#volume-slider'],
            ['volumeDisplay', domCache.volumeDisplay, '#volume-display'],
            ['stepIndicators', domCache.stepIndicators, '#step-indicators'],
            ['presetCurrentStatus', domCache.presetCurrentStatus, '#preset-current-status'],
            ['presetNameInput', domCache.presetNameInput, '#preset-name'],
            ['userPresetList', domCache.userPresetList, '#user-preset-list'],
            ['savePresetBtn', domCache.savePresetBtn, '#save-preset-btn'],
            ['clearBeatsBtn', domCache.clearBeatsBtn, '#clear-beats-btn'],
            ['modal', domCache.modal, '#help-modal'],
            ['helpBtn', domCache.helpBtn, '#help-btn'],
            ['helpCloseBtn', domCache.helpCloseBtn, '#help-close-btn'],
            ['helpOkBtn', domCache.helpOkBtn, '#help-ok-btn'],
            ['darkModeToggle', domCache.darkModeToggle, '#dark-mode-toggle'],
            ['errorToast', domCache.errorToast, '#error-toast']
        ];

        const missingSelectors = requiredElements
            .filter(([, element]) => !element)
            .map(([, , selector]) => selector);
        if (missingSelectors.length > 0) {
            console.error(`初期化に失敗しました。必須DOM要素が不足しています: ${missingSelectors.join(', ')}`);
            return false;
        }

        const missingRows = INSTRUMENTS.filter((inst) => !domCache.rows[inst]).map((inst) => `#row-${inst}`);
        const missingRowClearButtons = INSTRUMENTS.filter((inst) => !domCache.rowClearBtns[inst]).map((inst) => `#clear-${inst}`);
        const missingInstrumentButtons = INSTRUMENTS.filter((inst) => !domCache.instrumentBtns[inst]).map((inst) => `#instrument-${inst}`);
        const missingPresetButtons = Object.keys(PRESETS)
            .filter((name) => !domCache.presetButtons[name])
            .map((name) => `#preset-${name}`);
        const missingInstrumentSelectors = [
            ...missingRows,
            ...missingRowClearButtons,
            ...missingInstrumentButtons,
            ...missingPresetButtons
        ];
        if (missingInstrumentSelectors.length > 0) {
            console.error(`初期化に失敗しました。楽器DOM要素が不足しています: ${missingInstrumentSelectors.join(', ')}`);
            return false;
        }

        return true;
    }

    // ========================================
    // ヘルプモーダル
    // ========================================
    function openHelp() {
        if (!domCache.modal || domCache.modal.open) return;
        lastHelpTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : domCache.helpBtn;
        domCache.modal.showModal();
        domCache.helpBtn?.setAttribute('aria-expanded', 'true');
    }

    function closeHelp() {
        if (!domCache.modal?.open) return;
        domCache.modal.close();
        domCache.helpBtn?.setAttribute('aria-expanded', 'false');
        const trigger = lastHelpTrigger;
        lastHelpTrigger = null;
        if (trigger && document.contains(trigger)) trigger.focus();
    }

    /**
     * ダークモード表示を適用
     */
    function applyDarkMode(isDark) {
        document.body.classList.toggle('theme-night', isDark);
        domCache.darkModeToggle?.setAttribute('aria-pressed', String(isDark));
        if (isDark) {
            document.documentElement.classList.add('dark');
            domCache.darkIcon?.classList.add('hidden');
            domCache.lightIcon?.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            domCache.darkIcon?.classList.remove('hidden');
            domCache.lightIcon?.classList.add('hidden');
        }
    }

    /**
     * ダークモードの初期状態を適用
     */
    function initDarkMode() {
        let savedDarkMode = null;
        try {
            savedDarkMode = localStorage.getItem(DARK_MODE_STORAGE_KEY);
        } catch (_error) {
            savedDarkMode = null;
        }

        if (savedDarkMode !== null) {
            applyDarkMode(savedDarkMode === 'true');
            return;
        }

        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            applyDarkMode(true);
        } else {
            applyDarkMode(false);
        }
    }

    /**
     * ダークモードを切り替える
     */
    function toggleDarkMode() {
        const isDark = !document.documentElement.classList.contains('dark');
        applyDarkMode(isDark);
        writeTextToStorage(
            () => localStorage,
            DARK_MODE_STORAGE_KEY,
            isDark ? 'true' : 'false',
            showErrorToast
        );
    }

    // ========================================
    // オーディオエンジン
    // ========================================
    function disposeAudioGraph() {
        Object.values(synths).forEach((synth) => {
            try { synth?.dispose?.(); } catch (_error) { /* noop */ }
        });
        synths = {};
        try { masterGain?.dispose?.(); } catch (_error) { /* noop */ }
        try { limiter?.dispose?.(); } catch (_error) { /* noop */ }
        masterGain = null;
        limiter = null;
        isAudioInit = false;
    }

    function reportAudioInitError(error) {
        console.error('オーディオ初期化エラー:', error);
        const now = Date.now();
        if (now - lastAudioErrorAt < AUDIO_ERROR_THROTTLE_MS) return;
        lastAudioErrorAt = now;
        showErrorToast('音声の初期化に失敗しました。編集はそのまま使えます。音を鳴らす操作でもう一度試せます。');
    }

    async function initAudio() {
        if (audioInitPromise) return audioInitPromise;
        if (isAudioInit && Tone.context.state === 'running') return true;

        // Promiseを先に登録することで同期例外でも次の操作で再試行できる。
        audioInitPromise = Promise.resolve().then(async () => {
            try {
                await window.PikaLabToneLoader.load('../assets/tone-14.8.49.js');
                if (Tone.context.state !== 'running') await Tone.start();
                if (isAudioInit) return true;

                Tone.context.lookAhead = 0.15;
                limiter = new Tone.Limiter(-1).toDestination();
                masterGain = new Tone.Gain(volume / 100).connect(limiter);
                INSTRUMENTS.forEach(inst => {
                    const config = SYNTH_CONFIG[inst];
                    synths[inst] = new Tone[config.type](config.options).connect(masterGain);
                    synths[inst].volume.value = config.volume;
                });
                Tone.Transport.bpm.value = tempo;
                isAudioInit = true;
                return true;
            } catch (error) {
                disposeAudioGraph();
                reportAudioInitError(error);
                return false;
            } finally {
                audioInitPromise = null;
            }
        });
        return audioInitPromise;
    }

    /**
     * ボリュームを更新
     */
    function updateVolume(val) {
        const parsed = parseInt(val, 10);
        // 範囲チェック
        volume = clamp(parsed, MIN_VOLUME, MAX_VOLUME);

        if (domCache.volumeDisplay) {
            domCache.volumeDisplay.textContent = volume;
        }
        if (domCache.volumeSlider && domCache.volumeSlider.value !== volume.toString()) {
            domCache.volumeSlider.value = volume;
        }
        if (masterGain) {
            masterGain.gain.rampTo(volume / 100, 0.1);
        }
        writeTextToStorage(() => localStorage, VOLUME_STORAGE_KEY, volume.toString(), showErrorToast);
    }

    /**
     * 値を指定範囲内に収める
     */
    function clamp(value, min, max) {
        if (isNaN(value)) return min;
        return Math.max(min, Math.min(max, value));
    }

    /**
     * 保存されたボリュームを読み込み
     */
    function loadVolumeFromStorage() {
        try {
            const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
            if (saved !== null) {
                const parsed = parseInt(saved, 10);
                // 範囲チェックでバリデーション
                volume = clamp(parsed, MIN_VOLUME, MAX_VOLUME);
                if (domCache.volumeSlider) {
                    domCache.volumeSlider.value = volume;
                }
                if (domCache.volumeDisplay) {
                    domCache.volumeDisplay.textContent = volume;
                }
            }
        } catch (e) {
            volume = DEFAULT_VOLUME;
        }
    }

    /**
     * エラートーストを表示（重複防止付き）
     */
    function showErrorToast(message) {
        if (!domCache.errorToast) return;

        // 前のタイマーをクリア（重複防止）
        if (errorToastTimeout) {
            clearTimeout(errorToastTimeout);
            errorToastTimeout = null;
        }

        const messageEl = domCache.errorToast.querySelector('.error-message');
        if (messageEl) {
            messageEl.textContent = message;
        }

        domCache.errorToast.classList.remove('hidden');
        domCache.errorToast.classList.add('animate-slide-in');

        errorToastTimeout = setTimeout(() => {
            domCache.errorToast.classList.add('hidden');
            domCache.errorToast.classList.remove('animate-slide-in');
            errorToastTimeout = null;
        }, ERROR_TOAST_DURATION);
    }

    /**
     * 単発音を再生（データ駆動）
     */
    async function playOneShot(type, shouldPlay = () => true) {
        const generation = audioGeneration;
        const request = (previewRequests[type] || 0) + 1;
        previewRequests[type] = request;
        const success = await initAudio();
        if (!success || generation !== audioGeneration || previewRequests[type] !== request ||
            document.visibilityState === 'hidden' || !shouldPlay()) return;
        playSoundAtTime(type);
    }

    /**
     * 音程を持つSynthとNoiseSynthの引数契約を一箇所で管理する。
     */
    function playSoundAtTime(type, time) {
        const synth = synths[type];
        const config = INSTRUMENT_CONFIG[type];
        if (!synth || !config) return;
        try {
            if (config.note !== null) {
                synth.triggerAttackRelease(config.note, config.duration, time);
            } else {
                synth.triggerAttackRelease(config.duration, time);
            }
        } catch (error) {
            console.error('音声再生エラー:', error);
        }
    }

    // ========================================
    // ユーティリティ
    // ========================================
    function shouldAddMargin(idx) {
        return (idx + 1) % BEATS_PER_MEASURE === 0 && idx !== LAST_STEP_INDEX;
    }

    function getMarginClass(idx) {
        return shouldAddMargin(idx) ? 'mr-4' : '';
    }

    function getBeatAccentLevel(idx) {
        const stepsPerBeat = STEPS / BEATS_PER_MEASURE;
        const stepsPerHalfMeasure = stepsPerBeat * 2;
        if (idx % stepsPerHalfMeasure === 0) return 'primary';
        if (idx % stepsPerBeat === 0) return 'secondary';
        return 'none';
    }

    function getPresetLabel(name) {
        return PRESET_LABELS[name] || name;
    }

    function updatePresetSelectionUI() {
        Object.entries(domCache.presetButtons).forEach(([name, btn]) => {
            if (!btn) return;
            const isSelected = name === selectedPresetName;
            btn.dataset.selected = isSelected ? 'true' : 'false';
            btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        });
    }

    function updateCurrentPatternStatus(label) {
        if (!domCache.presetCurrentStatus) return;
        domCache.presetCurrentStatus.textContent = label;
    }

    function selectPreset(name) {
        selectedPresetName = PRESETS[name] ? name : null;
        updatePresetSelectionUI();
        if (selectedPresetName) {
            updateCurrentPatternStatus(`いまのお手本: ${getPresetLabel(selectedPresetName)}`);
        }
    }

    function markCustomPattern(label = 'いまのリズム: じぶんで作成中') {
        selectedPresetName = null;
        updatePresetSelectionUI();
        updateCurrentPatternStatus(label);
    }

    /**
     * 現在のグリッド（楽譜）の状態を解析し、プリセットやからっぽの状態を自動検出する
     */
    function detectCurrentPattern() {
        // すべての楽器が0（からっぽ）かチェック
        let isAllZero = true;
        for (const inst of INSTRUMENTS) {
            if (grid[inst].some(val => val !== 0)) {
                isAllZero = false;
                break;
            }
        }
        if (isAllZero) {
            selectedPresetName = null;
            updatePresetSelectionUI();
            updateCurrentPatternStatus('いまのリズム: からっぽ');
            return;
        }

        // 既存のプリセットと一致するかチェック
        for (const [name, preset] of Object.entries(PRESETS)) {
            let matches = true;
            for (const inst of INSTRUMENTS) {
                for (let i = 0; i < STEPS; i++) {
                    const presetVal = preset[inst][i] || 0;
                    const gridVal = grid[inst][i] || 0;
                    if (presetVal !== gridVal) {
                        matches = false;
                        break;
                    }
                }
                if (!matches) break;
            }
            if (matches) {
                selectedPresetName = name;
                updatePresetSelectionUI();
                updateCurrentPatternStatus(`いまのお手本: ${getPresetLabel(name)}`);
                return;
            }
        }

        // ユーザープリセットと一致するかチェック
        for (let idx = 0; idx < userPresets.length; idx++) {
            const up = userPresets[idx];
            let matches = true;
            for (const inst of INSTRUMENTS) {
                for (let i = 0; i < STEPS; i++) {
                    const presetVal = up.data[inst][i] || 0;
                    const gridVal = grid[inst][i] || 0;
                    if (presetVal !== gridVal) {
                        matches = false;
                        break;
                    }
                }
                if (!matches) break;
            }
            if (matches) {
                selectedPresetName = null;
                updatePresetSelectionUI();
                updateCurrentPatternStatus(`いまのリズム: ${up.name}`);
                return;
            }
        }

        // いずれでもない場合はカスタム
        selectedPresetName = null;
        updatePresetSelectionUI();
        updateCurrentPatternStatus('いまのリズム: じぶんで作成中');
    }

    // ========================================
    // グリッドUI
    // ========================================
    function initGrid() {
        if (!domCache.stepIndicators) return;

        domCache.stepIndicators.innerHTML = '';
        domCache.indicators = [];
        domCache.cells = {};

        // ステップごとのクラス文字列をキャッシュ（パフォーマンス最適化）
        for (let i = 0; i < STEPS; i++) {
            const marginClass = getMarginClass(i);
            stepClassCache.active[i] = `${INDICATOR_CLASSES.active} ${marginClass}`;
            stepClassCache.inactive[i] = `${INDICATOR_CLASSES.inactive} ${marginClass}`;
        }

        INSTRUMENTS.forEach(inst => {
            if (domCache.rows[inst]) {
                domCache.rows[inst].innerHTML = '';
            }
            domCache.cells[inst] = [];
        });

        for (let i = 0; i < STEPS; i++) {
            const marginClass = getMarginClass(i);

            // インジケーター作成
            const ind = document.createElement('div');
            // キャッシュされたクラスを使用
            ind.className = stepClassCache.inactive[i];
            ind.id = `ind-${i}`;
            ind.dataset.beatAccent = getBeatAccentLevel(i);
            domCache.stepIndicators.appendChild(ind);
            domCache.indicators[i] = ind;

            // 各楽器のセル作成
            INSTRUMENTS.forEach(inst => {
                const cell = createCell(inst, i);
                if (domCache.rows[inst]) {
                    domCache.rows[inst].appendChild(cell);
                }
                domCache.cells[inst][i] = cell;
            });
        }
    }

    function createCell(type, idx) {
        const button = document.createElement('button');
        const marginClass = getMarginClass(idx);
        button.type = 'button';
        button.className = `${CELL_CLASSES.base} ${CELL_CLASSES.inactive} ${marginClass}`;
        button.dataset.type = type;
        button.dataset.index = idx;
        button.dataset.beatAccent = getBeatAccentLevel(idx);
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-label', `ステップ ${idx + 1}`);
        button.addEventListener('click', () => toggleNote(type, idx));
        return button;
    }

    function toggleNote(type, idx) {
        grid[type][idx] = grid[type][idx] ? 0 : 1;
        detectCurrentPattern();
        saveAutosaveToStorage();

        const cell = domCache.cells[type]?.[idx];
        if (cell) {
            renderCell(type, idx, cell);
        }

        if (grid[type][idx]) {
            void playOneShot(type, () => grid[type][idx] === 1);
        }
    }

    function renderCell(type, idx, el) {
        if (!el) return;

        const isActive = grid[type][idx];
        if (el.getAttribute('aria-pressed') === String(Boolean(isActive))) return;
        const marginClass = getMarginClass(idx);

        if (isActive) {
            el.className = `${CELL_CLASSES.base} ${CELL_CLASSES.active} ${marginClass}`;
            el.setAttribute('aria-pressed', 'true');
        } else {
            el.className = `${CELL_CLASSES.base} ${CELL_CLASSES.inactive} ${marginClass}`;
            el.setAttribute('aria-pressed', 'false');
        }
    }

    function updateAllCells() {
        INSTRUMENTS.forEach(type => {
            for (let i = 0; i < STEPS; i++) {
                const cell = domCache.cells[type]?.[i];
                if (cell) {
                    renderCell(type, i, cell);
                }
            }
        });
    }

    function clearRow(type) {
        grid[type].fill(0);
        detectCurrentPattern();
        saveAutosaveToStorage();
        for (let i = 0; i < STEPS; i++) {
            const cell = domCache.cells[type]?.[i];
            if (cell) {
                renderCell(type, i, cell);
            }
        }
    }

    // ========================================
    // 再生制御
    // ========================================
    function updatePlaybackButton() {
        if (domCache.playIcon) {
            domCache.playIcon.textContent = isPlaying ? 'stop' : 'play_arrow';
            domCache.playIcon.className = isPlaying ? 'material-symbols-rounded text-5xl' : 'material-symbols-rounded text-5xl ml-1';
        }
        if (domCache.playBtn) {
            domCache.playBtn.className = isPlaying ? BUTTON_CLASSES.playing : BUTTON_CLASSES.stopped;
        }
    }

    function stopPlayback() {
        playbackRequestId += 1;
        audioGeneration += 1;
        isStartingPlayback = false;
        isPlaying = false;
        if (typeof Tone !== 'undefined') {
            try { Tone.Transport.stop(); } catch (_error) { /* 停止後のUI復帰は続ける */ }
            if (transportEventId !== null) {
                try { Tone.Transport.clear(transportEventId); } catch (_error) { /* 登録済みイベントだけを片付ける */ }
                transportEventId = null;
            }
            try { Tone.Draw.cancel(); } catch (_error) { /* 世代番号でも古い描画を無効化する */ }
        }
        currentStep = 0;
        resetVisuals();
        updatePlaybackButton();
    }

    async function togglePlay() {
        if (isPlaying || isStartingPlayback) {
            stopPlayback();
            return;
        }
        const request = ++playbackRequestId;
        isStartingPlayback = true;
        try {
            const success = await initAudio();
            if (!success || request !== playbackRequestId || document.visibilityState === 'hidden') return;
            currentStep = 0;
            Tone.Transport.bpm.value = tempo;
            transportEventId = Tone.Transport.scheduleRepeat(playStep, '16n');
            isPlaying = true;
            Tone.Transport.start();
            updatePlaybackButton();
        } catch (error) {
            stopPlayback();
            reportAudioInitError(error);
        } finally {
            if (request === playbackRequestId) isStartingPlayback = false;
        }
    }

    function playStep(time) {
        if (!isPlaying) return;
        const request = playbackRequestId;
        // 現在のステップをクロージャでキャプチャ
        const stepToDraw = currentStep;

        Tone.Draw.schedule(() => {
            // 再生停止していたら描画しない
            if (!isPlaying || request !== playbackRequestId) return;
            updateStepVisuals(stepToDraw);
        }, time);

        // データ駆動で各楽器を再生
        INSTRUMENTS.forEach(inst => {
            if (grid[inst][currentStep]) {
                playSoundAtTime(inst, time);
            }
        });

        currentStep = (currentStep + 1) % STEPS;
    }

    function updateStepVisuals(step) {
        const prev = (step - 1 + STEPS) % STEPS;
        const prevEl = domCache.indicators[prev];

        // キャッシュされたクラス文字列を適用
        if (prevEl) {
            prevEl.className = stepClassCache.inactive[prev];
        }

        const currEl = domCache.indicators[step];
        if (currEl) {
            currEl.className = stepClassCache.active[step];
        }
    }

    function resetVisuals() {
        for (let i = 0; i < STEPS; i++) {
            const el = domCache.indicators[i];
            if (el) {
                // キャッシュを利用して高速化
                el.className = stepClassCache.inactive[i];
            }
        }
    }

    function updateTempo(val, syncInput = true) {
        tempo = normalizeTempo(val);
        if (domCache.tempoSlider && domCache.tempoSlider.value !== tempo.toString()) {
            domCache.tempoSlider.value = tempo.toString();
        }
        if (syncInput && domCache.tempoDisplay && domCache.tempoDisplay.value !== tempo.toString()) {
            domCache.tempoDisplay.value = tempo.toString();
        }
        if (isPlaying) {
            Tone.Transport.bpm.rampTo(tempo, 0.1);
        } else if (isAudioInit) {
            Tone.Transport.bpm.value = tempo;
        }
    }

    // ========================================
    // プリセット管理
    // ========================================
    function loadPreset(name) {
        const p = PRESETS[name];
        if (!p) return;
        applyGrid(p);
        selectPreset(name);
        saveAutosaveToStorage();
        void playOneShot('hihat');
    }

    function loadUserPreset(idx) {
        if (idx < 0 || idx >= userPresets.length) return;
        const project = userPresets[idx];
        if (!project?.data) return;
        updateTempo(project.tempo ?? DEFAULT_TEMPO);
        applyGrid(project.data);
        markCustomPattern(`いまのリズム: ${project.name || '保存したリズム'}`);
        saveAutosaveToStorage();
        void playOneShot('hihat');
    }

    function applyGrid(p) {
        INSTRUMENTS.forEach(inst => {
            grid[inst] = normalizeStepArray(p?.[inst]);
        });
        updateAllCells();
    }

    function clearBeats() {
        if (!shouldClearAllBeats(window.confirm.bind(window))) return;
        INSTRUMENTS.forEach(inst => grid[inst].fill(0));
        updateAllCells();
        detectCurrentPattern();
        saveAutosaveToStorage();
    }

    /**
     * 全消去の確認結果を返す
     */
    function shouldClearAllBeats(confirmFn) {
        if (typeof confirmFn !== 'function') return false;
        return confirmFn('すべてのビートを消しますか？この操作は元に戻せません。') === true;
    }

    function cloneGridData(data = grid) {
        const cloned = {};
        INSTRUMENTS.forEach(inst => {
            cloned[inst] = normalizeStepArray(data?.[inst]);
        });
        return cloned;
    }

    function createProjectId() {
        return `rhythm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    // IDがない旧データも再読み込みのたびに別作品へ変わらないようにする。
    function createImportedProjectId(name, tempoValue, data, createdAt) {
        const identity = JSON.stringify([name, tempoValue, data, createdAt]);
        let first = 2166136261;
        let second = 5381;
        for (let index = 0; index < identity.length; index++) {
            const code = identity.charCodeAt(index);
            first = Math.imul(first ^ code, 16777619);
            second = Math.imul(second, 33) ^ code;
        }
        return `rhythm-import-${(first >>> 0).toString(16)}-${(second >>> 0).toString(16)}`;
    }

    function toStoredProject(project) {
        return {
            schemaVersion: STORAGE_SCHEMA_VERSION,
            id: project.id,
            name: project.name,
            tempo: normalizeTempo(project.tempo),
            pattern: cloneGridData(project.data),
            createdAt: project.createdAt,
            updatedAt: project.updatedAt
        };
    }

    function saveUserPreset() {
        if (processingLocks.savePreset) return;
        processingLocks.savePreset = true;

        try {
            // 別タブで追加された作品を古い一覧で上書きしない。
            const latest = readStoredPresets();
            if (!latest) return;
            const currentPresets = latest.presets;
            if (currentPresets.length >= MAX_USER_PRESETS) {
                showErrorToast(`プリセットは最大${MAX_USER_PRESETS}個まで保存できます。`);
                return;
            }

            let name = domCache.presetNameInput?.value.trim() || `リズム ${currentPresets.length + 1}`;
            if (name.length > MAX_PRESET_NAME_LENGTH) {
                name = name.substring(0, MAX_PRESET_NAME_LENGTH);
            }

            const now = Date.now();
            const nextPresets = [...currentPresets, {
                schemaVersion: STORAGE_SCHEMA_VERSION,
                id: createProjectId(),
                name,
                tempo: normalizeTempo(tempo),
                data: cloneGridData(),
                createdAt: now,
                updatedAt: now
            }];
            if (!savePresetsToStorage(nextPresets)) return;
            userPresets = nextPresets;

            if (domCache.presetNameInput) {
                domCache.presetNameInput.value = '';
            }

            renderUserPresetList();
            void playOneShot('clap');
        } finally {
            setTimeout(() => { processingLocks.savePreset = false; }, SAVE_PRESET_LOCK_DURATION);
        }
    }

    /**
     * ユーザープリセットを削除（シンプル・同期処理）
     */
    function deleteUserPreset(idx) {
        if (idx < 0 || idx >= userPresets.length) return;

        const target = userPresets[idx];
        const presetName = target.name;
        // confirmはブロッキング処理なので、ここでのロックは不要（かつトラブルの元）
        if (!confirm(`「${presetName}」を削除しますか？`)) return;

        const latest = readStoredPresets();
        if (!latest) return;
        const nextPresets = [...latest.presets];
        const targetIndex = nextPresets.findIndex(project => project.id === target.id);
        if (targetIndex !== -1) nextPresets.splice(targetIndex, 1);
        if (!savePresetsToStorage(nextPresets)) return;
        userPresets = nextPresets;
        renderUserPresetList();
    }

    /**
     * localStorageにv2作品を保存
     */
    function savePresetsToStorage(presets = userPresets) {
        return writeJsonToStorage(() => localStorage, STORAGE_KEY, presets.map(toStoredProject), showErrorToast);
    }

    /**
     * v2作品を読み込み、v2が未作成なら旧プリセットを120 BPMとして移行する
     */
    function readStoredPresets() {
        try {
            let sourceKey = STORAGE_KEY;
            let saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) {
                sourceKey = LEGACY_STORAGE_KEY;
                saved = localStorage.getItem(LEGACY_STORAGE_KEY);
            }
            if (!saved) return { presets: [], sourceKey };
            const parsed = JSON.parse(saved);
            if (!Array.isArray(parsed)) throw new TypeError('プリセットデータが配列ではありません');
            const presets = parsed.map(sanitizePresetItem).filter(item => item !== null).slice(0, MAX_USER_PRESETS);
            return { presets, sourceKey };
        } catch (error) {
            console.error('プリセット読み込みエラー:', error);
            showErrorToast(STORAGE_ERROR_MESSAGE);
            return null;
        }
    }

    function removeLegacyStorage(key) {
        try { localStorage.removeItem(key); }
        catch (error) { console.warn('旧保存データの整理を見送りました:', error); }
    }

    function loadPresetsFromStorage() {
        const stored = readStoredPresets();
        if (!stored) return;
        userPresets = stored.presets;
        if (stored.sourceKey === LEGACY_STORAGE_KEY && userPresets.length && savePresetsToStorage(userPresets)) {
            removeLegacyStorage(LEGACY_STORAGE_KEY);
        }
    }

    let saveAutosaveTimeoutId = null;
    let lastAutosaveSnapshot = null;
    let autosaveDirty = false;

    function currentAutosaveProject() {
        return {
            schemaVersion: STORAGE_SCHEMA_VERSION,
            tempo: normalizeTempo(tempo),
            pattern: cloneGridData()
        };
    }

    /**
     * オートセーブを実行する（デバウンス処理）
     */
    function saveAutosaveToStorage() {
        autosaveDirty = true;
        if (saveAutosaveTimeoutId) {
            clearTimeout(saveAutosaveTimeoutId);
        }
        saveAutosaveTimeoutId = setTimeout(() => {
            saveAutosaveImmediately();
        }, 1000); // 1秒間操作がなければ保存
    }

    /**
     * 現在のグリッド状態をオートセーブとして localStorage に即時保存する
     */
    function saveAutosaveImmediately(force = false) {
        if (force) autosaveDirty = true;
        if (saveAutosaveTimeoutId) {
            clearTimeout(saveAutosaveTimeoutId);
            saveAutosaveTimeoutId = null;
        }
        if (!force && !autosaveDirty) return true;
        const project = currentAutosaveProject();
        const snapshot = JSON.stringify(project);
        if (!force && snapshot === lastAutosaveSnapshot) {
            autosaveDirty = false;
            return true;
        }
        const saved = writeJsonToStorage(() => localStorage, AUTOSAVE_STORAGE_KEY, {
            ...project, updatedAt: Date.now()
        }, showErrorToast);
        if (saved) {
            lastAutosaveSnapshot = snapshot;
            autosaveDirty = false;
        }
        return saved;
    }

    /**
     * JSONデータを保存し、失敗時は必ず画面通知する
     */
    function writeJsonToStorage(storage, key, value, notifyError) {
        try {
            const serialized = JSON.stringify(value);
            if (typeof serialized !== 'string') {
                throw new TypeError('保存データをJSONへ変換できません');
            }
            return writeTextToStorage(storage, key, serialized, notifyError);
        } catch (error) {
            console.error('保存エラー:', error);
            if (typeof notifyError === 'function') {
                notifyError(STORAGE_ERROR_MESSAGE);
            }
            return false;
        }
    }

    /**
     * 文字列の設定値を保存し、失敗時は画面通知する
     */
    function writeTextToStorage(storage, key, value, notifyError) {
        try {
            if (typeof storage === 'function') storage = storage();
            if (!storage || typeof storage.setItem !== 'function' || typeof key !== 'string' || !key) {
                throw new TypeError('保存先または保存キーが不正です');
            }
            if (typeof value !== 'string') {
                throw new TypeError('保存値は文字列である必要があります');
            }
            storage.setItem(key, value);
            return true;
        } catch (error) {
            console.error('保存エラー:', error);
            if (typeof notifyError === 'function') {
                notifyError(STORAGE_ERROR_MESSAGE);
            }
            return false;
        }
    }

    /**
     * BPMとグリッドをv2共有ペイロードへ変換する
     */
    function serializeGridData(data, tempoValue = tempo) {
        try {
            const jsonStr = JSON.stringify({
                schemaVersion: STORAGE_SCHEMA_VERSION,
                tempo: normalizeTempo(tempoValue),
                pattern: cloneGridData(data)
            });
            return btoa(unescape(encodeURIComponent(jsonStr)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
        } catch (e) {
            console.error('シリアライズ失敗:', e);
            return '';
        }
    }

    /**
     * 共有キー文字列を復元する。巨大入力はデコード前に拒否する。
     */
    function deserializeGridData(base64Str) {
        if (typeof base64Str !== 'string' || !base64Str || base64Str.length > MAX_SHARE_PARAM_LENGTH) {
            return null;
        }
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

    /**
     * 共有データを全楽器16ステップの安全な形式へ変換する
     */
    function normalizeSharedGridData(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

        const normalized = {};
        for (const inst of INSTRUMENTS) {
            const steps = data[inst];
            if (!Array.isArray(steps) || steps.length !== STEPS) return null;
            if (!steps.every(value => value === 0 || value === 1 || value === false || value === true)) {
                return null;
            }
            normalized[inst] = steps.map(value => value ? 1 : 0);
        }
        return normalized;
    }

    /**
     * v2共有はBPM+パターン、旧共有は120 BPM+パターンとして扱う
     */
    function normalizeSharedProject(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
        if (data.schemaVersion === STORAGE_SCHEMA_VERSION) {
            const pattern = normalizeSharedGridData(data.pattern);
            if (!pattern) return null;
            return { tempo: normalizeTempo(data.tempo), pattern };
        }
        const legacyPattern = normalizeSharedGridData(data);
        return legacyPattern ? { tempo: DEFAULT_TEMPO, pattern: legacyPattern } : null;
    }

    /**
     * URLパラメータから共有データを復元する
     */
    function loadFromUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const pData = urlParams.get('p');
        if (!pData) return false;

        const project = normalizeSharedProject(deserializeGridData(pData));
        if (!project) {
            showErrorToast('共有データを読み込めませんでした。リンクが正しいか確認してください。');
            return false;
        }

        if (!confirmSharedGridImport(window.confirm.bind(window))) return false;

        updateTempo(project.tempo);
        applyGrid(project.pattern);
        detectCurrentPattern();
        saveAutosaveImmediately(true);

        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
        return true;
    }

    /**
     * 共有リンクの適用前に明示確認する
     */
    function confirmSharedGridImport(confirmFn) {
        if (typeof confirmFn !== 'function') return false;
        return confirmFn('共有されたリズムを読み込みますか？現在のリズムと自動保存データは上書きされます。') === true;
    }

    let isShareModalOpen = false;

    let lastQrCodeUrl = null;

    /**
     * 共有モーダルを開く
     */
    function openShareModal() {
        if (!domCache.shareModal || !domCache.shareContent) return;

        if (shareModalCloseTimer !== null) {
            clearTimeout(shareModalCloseTimer);
            shareModalCloseTimer = null;
        }

        const base64Data = serializeGridData(grid, tempo);
        const shareUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + "?p=" + base64Data;

        if (domCache.shareLinkInput) {
            domCache.shareLinkInput.value = shareUrl;
        }

        // 同じ作品の開き直しではQRの符号化とcanvas生成を繰り返さない。
        if (domCache.shareQrcode && (shareUrl !== lastQrCodeUrl || !domCache.shareQrcode.hasChildNodes())) {
            domCache.shareQrcode.innerHTML = '';
            try {
                new QRCode(domCache.shareQrcode, {
                    text: shareUrl,
                    width: 180,
                    height: 180,
                    colorDark: "#ec4899", // pikalab theme pink
                    colorLight: "#fafaf9",
                    correctLevel: QRCode.CorrectLevel.M
                });
                lastQrCodeUrl = shareUrl;
                
                // qrcode.js が生成する canvas/img の親としてのスタイル調整
                const img = domCache.shareQrcode.querySelector('img');
                if (img) {
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'contain';
                }
            } catch (e) {
                lastQrCodeUrl = null;
                console.error('QRコード生成失敗:', e);
                domCache.shareQrcode.textContent = 'QRコードの生成に失敗しました';
            }
        }

        // 閉じる途中の再表示では、モーダル内のボタンを復帰先で上書きしない。
        if (document.activeElement instanceof HTMLElement && !domCache.shareModal.contains?.(document.activeElement)) {
            lastFocusedElement = document.activeElement;
        }

        isShareModalOpen = true;
        domCache.shareModal.classList.remove('hidden');
        domCache.shareModal.setAttribute('aria-hidden', 'false');
        domCache.shareBtn?.setAttribute('aria-expanded', 'true');
        void domCache.shareModal.offsetWidth; // リフロー
        domCache.shareModal.classList.remove('opacity-0');
        domCache.shareContent.classList.remove('scale-95');
        domCache.shareContent.classList.add('scale-100');

        requestAnimationFrame(() => {
            if (isShareModalOpen) domCache.shareCloseBtn?.focus();
        });
    }

    /**
     * 共有モーダルを閉じる
     */
    function closeShareModal() {
        if (!domCache.shareModal || !domCache.shareContent) return;
        if (!isShareModalOpen) return;

        const focusTarget = (lastFocusedElement instanceof HTMLElement && document.contains(lastFocusedElement))
            ? lastFocusedElement
            : domCache.shareBtn;
        isShareModalOpen = false;
        domCache.shareModal.classList.add('opacity-0');
        domCache.shareModal.setAttribute('aria-hidden', 'true');
        domCache.shareBtn?.setAttribute('aria-expanded', 'false');
        domCache.shareContent.classList.remove('scale-100');
        domCache.shareContent.classList.add('scale-95');

        shareModalCloseTimer = setTimeout(() => {
            shareModalCloseTimer = null;
            domCache.shareModal.classList.add('hidden');
            lastFocusedElement = null;
            requestAnimationFrame(() => {
                if (!isShareModalOpen) focusTarget?.focus();
            });
        }, 300);
    }

    /**
     * 共有リンクをクリップボードにコピーする
     */
    async function copyShareLink() {
        if (!domCache.shareLinkInput) return;
        const link = domCache.shareLinkInput.value;
        let copied = false;
        try {
            await navigator.clipboard.writeText(link);
            copied = true;
        } catch (_error) {
            try {
                domCache.shareLinkInput.select();
                domCache.shareLinkInput.setSelectionRange(0, link.length);
                copied = document.execCommand('copy') === true;
            } catch (_fallbackError) { /* 手動コピーへ案内する */ }
        }
        if (copied) alert('📋 リンクをコピーしました！');
        else showErrorToast('コピーできませんでした。共有用URLを選択してコピーしてください。');
    }

    /**
     * オートセーブされたデータを localStorage から読み込み復元する
     */
    function loadAutosaveFromStorage() {
        try {
            let sourceKey = AUTOSAVE_STORAGE_KEY;
            let saved = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
            if (!saved) {
                sourceKey = LEGACY_AUTOSAVE_STORAGE_KEY;
                saved = localStorage.getItem(LEGACY_AUTOSAVE_STORAGE_KEY);
            }
            if (!saved) return false;

            const parsed = JSON.parse(saved);
            const project = parsed?.schemaVersion === STORAGE_SCHEMA_VERSION
                ? { tempo: normalizeTempo(parsed.tempo), pattern: normalizeSharedGridData(parsed.pattern) }
                : { tempo: DEFAULT_TEMPO, pattern: normalizeSharedGridData(parsed) };
            if (!project.pattern) return false;

            updateTempo(project.tempo);
            applyGrid(project.pattern);
            detectCurrentPattern();

            if (sourceKey === AUTOSAVE_STORAGE_KEY) {
                lastAutosaveSnapshot = JSON.stringify(currentAutosaveProject());
            }
            if (sourceKey === LEGACY_AUTOSAVE_STORAGE_KEY && saveAutosaveImmediately(true)) {
                removeLegacyStorage(LEGACY_AUTOSAVE_STORAGE_KEY);
            }
            return true;
        } catch (error) {
            console.error('オートセーブ読み込みエラー:', error);
        }
        return false;
    }

    /**
     * ステップ配列を安全な形式に正規化
     */
    function normalizeStepArray(rawSteps) {
        const safeSteps = new Array(STEPS).fill(0);
        if (!Array.isArray(rawSteps)) {
            return safeSteps;
        }

        for (let i = 0; i < STEPS; i++) {
            const numericValue = Number(rawSteps[i]);
            safeSteps[i] = Number.isFinite(numericValue) && numericValue > 0 ? 1 : 0;
        }
        return safeSteps;
    }

    /**
     * 保存済みプリセット1件を安全な形式に正規化
     */
    function sanitizePresetItem(item) {
        if (!item || typeof item !== 'object') return null;

        const rawName = typeof item.name === 'string' ? item.name.trim() : '';
        if (!rawName) return null;

        const isV2 = item.schemaVersion === STORAGE_SCHEMA_VERSION;
        const rawData = isV2 ? item.pattern : item.data;
        if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) return null;

        const safeData = {};
        INSTRUMENTS.forEach(inst => {
            safeData[inst] = normalizeStepArray(rawData[inst]);
        });

        const now = Date.now();
        const createdAt = Number.isFinite(item.createdAt) ? item.createdAt : now;
        return {
            schemaVersion: STORAGE_SCHEMA_VERSION,
            id: typeof item.id === 'string' && item.id.trim() ? item.id.trim().slice(0, 100)
                : createImportedProjectId(rawName.slice(0, MAX_PRESET_NAME_LENGTH), normalizeTempo(isV2 ? item.tempo : DEFAULT_TEMPO), safeData, Number.isFinite(item.createdAt) ? item.createdAt : null),
            name: rawName.slice(0, MAX_PRESET_NAME_LENGTH),
            tempo: normalizeTempo(isV2 ? item.tempo : DEFAULT_TEMPO),
            data: safeData,
            createdAt,
            updatedAt: Number.isFinite(item.updatedAt) ? item.updatedAt : createdAt
        };
    }

    function renderUserPresetList() {
        if (!domCache.userPresetList) return;

        if (userPresets.length === 0) {
            domCache.userPresetList.innerHTML = '<span class="text-xs text-slate-400 dark:text-slate-500 italic py-1">まだ保存されていません</span>';
            return;
        }

        domCache.userPresetList.innerHTML = '';
        userPresets.forEach((p, idx) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'user-preset-item flex items-center gap-1';

            const btn = document.createElement('button');
            btn.className = 'user-preset-btn px-3 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-l-lg text-xs font-bold text-slate-600 dark:text-slate-200 hover:bg-pink-50 dark:hover:bg-pink-900 hover:border-pink-300 dark:hover:border-pink-500 hover:text-pink-500 dark:hover:text-pink-300 transition flex items-center gap-1 whitespace-nowrap';
            btn.innerHTML = `<span class="material-symbols-rounded text-xs">music_note</span> ${escapeHtml(p.name)}`;
            btn.addEventListener('click', () => loadUserPreset(idx));
            btn.title = `クリックで読み込み`;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'user-preset-delete px-2 py-1 bg-slate-100 dark:bg-slate-600 border border-l-0 border-slate-200 dark:border-slate-600 rounded-r-lg text-xs text-slate-400 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500 transition';
            deleteBtn.innerHTML = '<span class="material-symbols-rounded text-sm">close</span>';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteUserPreset(idx);
            });
            deleteBtn.title = '削除';
            deleteBtn.setAttribute('aria-label', `${p.name}を削除`);

            wrapper.appendChild(btn);
            wrapper.appendChild(deleteBtn);
            domCache.userPresetList.appendChild(wrapper);
        });
    }

    /**
     * HTMLエスケープ（XSS対策）
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ========================================
    // イベントリスナーのセットアップ
    // ========================================
    function isModalOpen() {
        const isHelpOpen = !!domCache.modal?.open;
        const isShareOpen = !!domCache.shareModal && !domCache.shareModal.classList.contains('hidden');
        return isHelpOpen || isShareOpen || !!document.getElementById('parents-modal')?.open;
    }

    function getPresetNameFromCode(code) {
        switch (code) {
            case 'Digit1':
            case 'Numpad1':
                return 'rock';
            case 'Digit2':
            case 'Numpad2':
                return 'house';
            case 'Digit3':
            case 'Numpad3':
                return 'hiphop';
            case 'Digit4':
            case 'Numpad4':
                return 'latin';
            case 'Digit5':
            case 'Numpad5':
                return 'funk';
            case 'Digit6':
            case 'Numpad6':
                return 'tomgroove';
            default:
                return null;
        }
    }

    function getPresetSnapshot(name) {
        const preset = PRESETS[name];
        if (!preset) return null;

        const snapshot = {};
        INSTRUMENTS.forEach((inst) => {
            snapshot[inst] = normalizeStepArray(preset[inst]);
        });
        return snapshot;
    }

    function shouldIgnoreGlobalShortcutTarget(target) {
        if (!target || typeof target !== 'object') return true;
        if (target.isContentEditable) return true;

        const tagName = typeof target.tagName === 'string' ? target.tagName.toLowerCase() : '';
        const isFormControl = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || tagName === 'button';
        const isLink = tagName === 'a';
        const role = typeof target.getAttribute === 'function' ? target.getAttribute('role') : null;
        const hasRhythmCellAncestor = typeof target.closest === 'function'
            ? target.closest('button[data-type][data-index], [data-type][data-index][role="button"]') !== null
            : false;
        const isRhythmCell = hasRhythmCellAncestor || role === 'button';

        return isFormControl || isLink || isRhythmCell;
    }

    function setupParentsModal() {
        const dialog = document.getElementById('parents-modal');
        const openButtons = Array.from(document.querySelectorAll('[data-action="parents-modal-open"]'));
        const closeButtons = Array.from(document.querySelectorAll('[data-action="parents-modal-close"]'));
        if (!dialog || openButtons.length === 0) return;

        let lastTrigger = null;

        const syncExpanded = (expanded) => {
            openButtons.forEach((button) => button.setAttribute('aria-expanded', expanded ? 'true' : 'false'));
        };

        const openDialog = (trigger) => {
            lastTrigger = trigger instanceof HTMLElement ? trigger : null;
            if (typeof dialog.showModal === 'function') {
                if (!dialog.open) dialog.showModal();
            } else {
                dialog.setAttribute('open', '');
            }
            syncExpanded(true);
        };

        const closeDialog = () => {
            if (typeof dialog.close === 'function') {
                if (dialog.open) dialog.close();
            } else {
                dialog.removeAttribute('open');
            }
            syncExpanded(false);
            lastTrigger?.focus();
            lastTrigger = null;
        };

        openButtons.forEach((button) => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                openDialog(button);
            });
        });

        closeButtons.forEach((button) => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                closeDialog();
            });
        });

        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) closeDialog();
        });
        dialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            closeDialog();
        });
        dialog.addEventListener('close', () => {
            syncExpanded(false);
        });
    }

    function setupEventListeners() {
        // 再生ボタン
        domCache.playBtn?.addEventListener('click', togglePlay);

        // テンポスライダー
        domCache.tempoSlider?.addEventListener('input', (e) => {
            updateTempo(e.target.value);
            saveAutosaveToStorage();
        });

        // テンポ入力フィールド (キーボード直接入力)
        domCache.tempoDisplay?.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (Number.isFinite(val) && val >= MIN_TEMPO && val <= MAX_TEMPO) {
                updateTempo(val, false);
                saveAutosaveToStorage();
            }
        });
        domCache.tempoDisplay?.addEventListener('blur', (e) => {
            updateTempo(e.target.value);
            saveAutosaveToStorage();
        });
        domCache.tempoDisplay?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.target.blur();
            }
        });

        // ボリュームスライダー
        domCache.volumeSlider?.addEventListener('input', (e) => updateVolume(e.target.value));

        // ヘルプモーダル
        domCache.helpBtn?.addEventListener('click', openHelp);
        domCache.helpCloseBtn?.addEventListener('click', closeHelp);
        domCache.helpOkBtn?.addEventListener('click', closeHelp);
        domCache.modal?.addEventListener('cancel', (event) => {
            event.preventDefault();
            closeHelp();
        });
        domCache.modal?.addEventListener('close', () => {
            if (!domCache.modal.open) domCache.helpBtn?.setAttribute('aria-expanded', 'false');
        });
        domCache.darkModeToggle?.addEventListener('click', toggleDarkMode);

        // モーダル背景クリックで閉じる
        domCache.modal?.addEventListener('click', (e) => {
            if (e.target === domCache.modal) {
                closeHelp();
            }
        });

        // 共有モーダル
        domCache.shareBtn?.addEventListener('click', openShareModal);
        domCache.shareCloseBtn?.addEventListener('click', closeShareModal);
        domCache.shareOkBtn?.addEventListener('click', closeShareModal);
        domCache.shareCopyBtn?.addEventListener('click', copyShareLink);
        
        domCache.shareModal?.addEventListener('click', (e) => {
            if (e.target === domCache.shareModal) {
                closeShareModal();
            }
        });

        // オートセーブのための離脱時イベント
        window.addEventListener('pagehide', () => {
            saveAutosaveImmediately();
            stopPlayback();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                saveAutosaveImmediately();
                stopPlayback();
            }
        });

        // グローバルキーボードショートカット
        document.addEventListener('keydown', handleGlobalKeydown);

        // ビート全削除
        domCache.clearBeatsBtn?.addEventListener('click', clearBeats);

        // プリセット保存
        domCache.savePresetBtn?.addEventListener('click', saveUserPreset);

        // プリセットボタン
        Object.entries(domCache.presetButtons).forEach(([name, btn]) => {
            btn?.addEventListener('click', () => loadPreset(name));
        });

        // 各楽器の試聴ボタンとクリアボタン
        INSTRUMENTS.forEach(inst => {
            domCache.instrumentBtns[inst]?.addEventListener('click', () => playOneShot(inst));
            domCache.rowClearBtns[inst]?.addEventListener('click', () => clearRow(inst));
        });
    }

    /**
     * グローバルキーボードイベントハンドラ
     */
    function handleGlobalKeydown(e) {
        if (e.defaultPrevented) return;

        // モーダルが開いている場合
        if (isModalOpen()) {
            if (e.key === 'Escape') {
                if (document.getElementById('parents-modal')?.open) return;
                e.preventDefault();
                if (domCache.modal?.open) {
                    closeHelp();
                } else if (!!domCache.shareModal && !domCache.shareModal.classList.contains('hidden')) {
                    closeShareModal();
                }
                return;
            }
            if (e.key === 'Tab') {
                handleFocusTrap(e);
            }
            return;
        }

        if (e.repeat || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
        if (shouldIgnoreGlobalShortcutTarget(e.target)) return;

        // グローバルショートカット（モーダルが閉じている時のみ）
        if (e.code === 'Space') {
            e.preventDefault();
            togglePlay();
            return;
        }

        const presetName = getPresetNameFromCode(e.code);
        if (presetName) {
            loadPreset(presetName);
        }
    }

    /**
     * モーダル内のフォーカストラップ
     */
    function handleFocusTrap(e) {
        let activeContainer = null;
        if (domCache.modal?.open) {
            return; // native dialogがフォーカスを閉じ込める
        } else if (!!domCache.shareModal && !domCache.shareModal.classList.contains('hidden')) {
            activeContainer = domCache.shareContent;
        }
        if (!activeContainer) return;

        const focusableElements = activeContainer.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            // Shift+Tab: 最初の要素から最後へ
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab: 最後の要素から最初へ
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    // ========================================
    // 初期化
    // ========================================
    function init() {
        cacheDOMElements();
        if (!validateRequiredElements()) return;
        initDarkMode();
        loadPresetsFromStorage();
        loadVolumeFromStorage();
        updateTempo(domCache.tempoSlider?.value);
        initGrid();
        setupEventListeners();
        setupParentsModal();
        
        // URLパラメータからの復元を最優先で試みる。なければオートセーブから復元
        const urlRestored = loadFromUrlParams();
        if (!urlRestored) {
            const restored = loadAutosaveFromStorage();
            if (!restored) {
                lastAutosaveSnapshot = JSON.stringify(currentAutosaveProject());
                markCustomPattern('いまのお手本: まだえらんでいません');
            }
        }
        
        renderUserPresetList();
    }

    // DOM準備完了後に初期化
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    // ========================================
    // 公開API（デバッグ・テスト用）
    // ========================================
    return {
        // 内部状態へのアクセス（テスト用）
        getState: () => ({ isPlaying, currentStep, tempo, isAudioInit, grid: { ...grid } }),
        getUserPresets: () => [...userPresets],
        __test: {
            clamp,
            getBeatAccentLevel,
            normalizeTempo,
            getPresetNameFromCode,
            shouldIgnoreGlobalShortcutTarget,
            getPresetSnapshot,
            normalizeSharedGridData,
            normalizeSharedProject,
            deserializeGridData,
            sanitizePresetItem,
            confirmSharedGridImport,
            shouldClearAllBeats,
            writeTextToStorage,
            writeJsonToStorage
        }
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RhythmLab;
}
