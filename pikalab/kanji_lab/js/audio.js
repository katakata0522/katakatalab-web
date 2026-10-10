// --- KANJI LAB AUDIO MODULE (Web Audio API) ---
// Tone.js を廃止し、Web Audio API ネイティブで再実装。約1MBの削減。
(function () {
    let isMuted = false;
    let audioCtx = null;

    function getCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    // 音符の周波数（Hz）定義
    const NOTE = {
        C3: 130.81, F3: 174.61,
        C4: 261.63, E4: 329.63, G4: 392.00,
        C5: 523.25, E5: 659.25, G5: 783.99,
        C6: 1046.50
    };

    /**
     * 単音を内部的に再生する
     * @param {AudioContext} ctx
     * @param {GainNode} masterGain
     * @param {number} freq 周波数 (Hz)
     * @param {number} startTime 開始時刻 (秒)
     * @param {number} duration 音の長さ (秒)
     */
    function playNote(ctx, masterGain, freq, startTime, duration) {
        const osc = ctx.createOscillator();
        const envGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        envGain.gain.setValueAtTime(0.3, startTime);
        envGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(envGain);
        envGain.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
    }

    let syncVolume = 1.0;
    function syncSettings() {
        try {
            const stored = localStorage.getItem('wonder_school_profile_v2');
            if (stored) {
                const data = JSON.parse(stored);
                if (data.isMuted !== undefined) {
                    isMuted = !!data.isMuted;
                }
                if (data.volumeDb !== undefined) {
                    const db = data.volumeDb;
                    if (db <= -40) {
                        isMuted = true;
                        syncVolume = 0;
                    } else {
                        syncVolume = Math.pow(10, db / 40);
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to sync settings in KanjiLabAudio:', e);
        }
    }

    /**
     * 和音（複数音）を再生する
     * @param {number[]} freqs 周波数の配列
     * @param {number} duration 音の長さ (秒)
     * @param {number} [stagger=0] 各音のずらし間隔 (秒)
     */
    function playChord(freqs, duration, stagger) {
        stagger = stagger || 0;
        try {
            syncSettings();
            if (isMuted) return;
            var ctx = getCtx();
            if (ctx.state === 'suspended') ctx.resume();
            var masterGain = ctx.createGain();
            masterGain.gain.value = 0.35 * syncVolume;
            masterGain.connect(ctx.destination);
            var now = ctx.currentTime;
            freqs.forEach(function (freq, i) {
                playNote(ctx, masterGain, freq, now + i * stagger, duration);
            });
        } catch (e) {
            console.warn('Audio play error:', e);
        }
    }

    var AudioModule = {
        getMuted: function () { return isMuted; },

        setMuted: function (val) {
            isMuted = !!val;
            return isMuted;
        },

        toggleMute: function () {
            isMuted = !isMuted;
            return isMuted;
        },

        // 初回ユーザー操作でAudioContextを事前作成・アンロック
        triggerInit: function () {
            try { getCtx(); } catch (e) { /* ignore */ }
        },

        playSound: function (type) {
            if (isMuted) return;
            if (type === 'select') {
                playChord([NOTE.C5], 0.09);
            } else if (type === 'combine') {
                playChord([NOTE.C4, NOTE.E4, NOTE.G4], 0.25, 0.03);
            } else if (type === 'success') {
                playChord([NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6], 0.4, 0.04);
            } else if (type === 'fail') {
                playChord([NOTE.F3, NOTE.C3], 0.35, 0.06);
            } else if (type === 'clear') {
                playChord([NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5], 0.6, 0.05);
            }
        }
    };

    window.KanjiLabAudio = AudioModule;
})();

// 追加機能はコアゲームから分離してフェイルソフトに読み込む。
// roles -> UX -> exposure の順で読み、最後に通常出題だけを安全に絞る。
(function loadKanjiLabEnhancements() {
    function loadScript(src, marker, warning) {
        return new Promise((resolve) => {
            const existing = document.querySelector(`script[${marker}]`);
            if (existing) {
                if (existing.dataset.loaded === 'true') resolve();
                else existing.addEventListener('load', resolve, { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = false;
            script.setAttribute(marker, 'true');
            script.addEventListener('load', () => {
                script.dataset.loaded = 'true';
                resolve();
            }, { once: true });
            script.addEventListener('error', () => {
                console.warn(warning);
                resolve();
            }, { once: true });
            document.head.appendChild(script);
        });
    }

    loadScript('./js/roles.js?v=20260831', 'data-kanji-roles-script', 'Kanji Lab exposure roles failed to load; full catalog remains available.')
        .then(() => loadScript('./js/ux.js?v=20260831', 'data-kanji-ux-script', 'Kanji Lab UX layer failed to load; core game remains available.'))
        .then(() => loadScript('./js/exposure.js?v=20260831', 'data-kanji-exposure-script', 'Kanji Lab exposure policy failed to load; full catalog remains available.'));
})();
