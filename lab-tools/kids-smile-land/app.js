(function() {
    // --- トースト通知（エラー・情報をユーザーにUI表示する汎用関数）---
    function showToast(message, type = 'error', duration = 4000) {
        const existing = document.getElementById('app-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'app-toast';
        const bgColor = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';
        toast.style.cssText = [
            'position:fixed', 'bottom:90px', 'left:50%', 'transform:translateX(-50%)',
            'background:' + bgColor, 'color:#fff', 'padding:10px 20px',
            'border-radius:999px', 'font-size:13px', 'font-weight:bold',
            'box-shadow:0 4px 16px rgba(0,0,0,0.2)', 'z-index:9999',
            'max-width:90vw', 'text-align:center', 'pointer-events:none',
            'transition:opacity 0.4s'
        ].join(';');
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    // --- DATA STORE 安全ロード (LocalStorage 破損時のクラッシュを完全ガード) ---

    let storageReadBlocked = false;
    function safeLoadJSON(key, defaultValue) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) return defaultValue;
            const parsed = JSON.parse(item);
            const normalize = (value, fallback) => {
                if (value === undefined) return fallback;
                if (Array.isArray(fallback)) {
                    if (!Array.isArray(value)) throw new Error('Invalid stored list');
                    const valid = key === 'smile_placed_stickers'
                        ? sticker => sticker && typeof sticker.id === 'string' && typeof sticker.emoji === 'string' && Number.isFinite(sticker.x) && Number.isFinite(sticker.y)
                        : sticker => typeof sticker === 'string' && sticker.length > 0;
                    if (!value.every(valid)) throw new Error('Invalid stored list item');
                    if (key === 'smile_placed_stickers') return value.filter(sticker =>
                        sticker && typeof sticker.id === 'string' && typeof sticker.emoji === 'string' &&
                        Number.isFinite(sticker.x) && Number.isFinite(sticker.y));
                    return value.filter(sticker => typeof sticker === 'string' && sticker.length > 0);
                }
                if (fallback && typeof fallback === 'object') {
                    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid stored object');
                    const object = value;
                    return Object.fromEntries(Object.entries(fallback).map(([name, initial]) => [name, normalize(object[name], initial)]));
                }
                if (typeof fallback === 'number') {
                    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid stored number');
                    return value;
                }
                if (typeof fallback === 'boolean') {
                    if (typeof value !== 'boolean') throw new Error('Invalid stored boolean');
                    return value;
                }
                return typeof value === typeof fallback ? value : fallback;
            };
            return normalize(parsed, defaultValue);
        } catch (e) {
            console.error(`LocalStorage parse error for key "${key}":`, e);
            storageReadBlocked = true;
            return defaultValue;
        }
    }

    function readStoredOption(key, allowedValues, defaultValue) {
        try {
            const value = localStorage.getItem(key);
            return allowedValues.includes(value) ? value : defaultValue;
        } catch (e) {
            console.error(`LocalStorage option read error for key "${key}":`, e);
            return defaultValue;
        }
    }

    function readStoredNumber(key, defaultValue, minValue, maxValue, allowedValues) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return defaultValue;
            const value = Number(raw);
            if (!Number.isFinite(value)) return defaultValue;
            if (Array.isArray(allowedValues) && !allowedValues.includes(value)) return defaultValue;
            return Math.min(maxValue, Math.max(minValue, value));
        } catch (e) {
            console.error(`LocalStorage number read error for key "${key}":`, e);
            return defaultValue;
        }
    }

    function readStoredText(key, defaultValue, maxLength) {
        try {
            const value = localStorage.getItem(key);
            if (typeof value !== 'string' || value.trim() === '') return defaultValue;
            return value.slice(0, maxLength);
        } catch (e) {
            console.error(`LocalStorage text read error for key "${key}":`, e);
            return defaultValue;
        }
    }

    // データの復元
    let myStickers = safeLoadJSON('smile_stickers', []);
    let placedStickers = safeLoadJSON('smile_placed_stickers', []);
    let selectedBg = readStoredOption('smile_selected_bg', ['grass', 'space', 'sea'], 'grass');

    // みまもり設定
    let smileLevel = readStoredOption('smile_level', ['easy', 'normal', 'hard'], 'easy'); // easy, normal, hard
    let smileTimerLimit = readStoredNumber('smile_timer_limit', 0, 0, 45, [0, 5, 15, 30, 45]); // 0=無制限, 5, 15, 30, 45分
    let smileVoiceVolume = readStoredNumber('smile_voice_volume', 1.0, 0, 1);
    let smileSynthVolume = readStoredNumber('smile_synth_volume', 1.0, 0, 1);
    let smileSleepReason = readStoredOption('smile_sleep_reason', ['eye', 'meal', 'sleep'], 'eye'); // eye, meal, sleep
    let smileKidsName = readStoredText('smile_kids_name', 'がんばったおともだち', 30);

    // SVGテキストへ安全に埋め込むためXMLの特殊文字をエスケープする
    function escapeXml(value = '') {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // がんばり統計
    let smileStats = safeLoadJSON('smile_stats', {
        plays: { draw: 0, hiragana: 0, quiz: 0, count: 0, match: 0, xylophone: 0, sticker: 0 },
        correct_answers: 0,
        count_corrects: 0,
        total_stickers: 0
    });

    // アチーブメント/実績ミッション状態
    let smileMissions = safeLoadJSON('smile_missions', {
        drawFirst: false,      // おえかきをはじめて遊んだ
        matchPerfect: false,   // えあわせを1回パーフェクトクリア
        xyloFirst: false,      // もっきんのえんそうを完奏した
        count10: false         // かずかぞえクイズで10回正解した
    });

    // Web Audio API 初期化
    let soundEnabled = false;
    let soundEpoch = 0;
    let audioOutput = null;
    const activeSoundNodes = new Set();
    let soundHoldTimer = null;
    let suppressSoundClick = false;
    let audioCtx;
    function createSoundOscillator() {
        const node = audioCtx.createOscillator();
        activeSoundNodes.add(node);
        node.onended = () => activeSoundNodes.delete(node);
        return node;
    }
    function syncSoundControl() {
        const button = document.getElementById('btn-sound');
        if (button) { button.textContent = soundEnabled ? '音をとめる' : '音をオン（長押し）'; button.setAttribute('aria-pressed', String(soundEnabled)); }
    }
    function enableSound() {
        soundEnabled = true;
        initAudio();
        if (audioOutput) audioOutput.gain.value = 1;
        syncSoundControl();
        const options = document.getElementById('sound-options');
        if (options) options.open = false;
    }
    function stopSound() {
        soundEnabled = false;
        soundEpoch++;
        if (audioOutput) audioOutput.gain.value = 0;
        activeSoundNodes.forEach(node => { try { node.stop(); node.disconnect(); } catch (_) {} });
        activeSoundNodes.clear();
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        clearTimeout(soundHoldTimer);
        // Invalidate any already-armed next click, while leaving the achievement readable.
        rewardPointerToken = null;
        if (pendingNextActivity) pendingNextActivity = { ...pendingNextActivity };
        syncSoundControl();
    }
    function bindSoundControls() {
        const button = document.getElementById('btn-sound');
        if (!button) return;
        let pointer = null, start = null, ready = false;
        const cancel = (clearClick = true) => {
            clearTimeout(soundHoldTimer); soundHoldTimer = null;
            pointer = null; start = null; ready = false;
            if (clearClick) suppressSoundClick = false;
        };
        button.addEventListener('pointerdown', event => {
            // Each genuinely new press may always stop sound with one click.
            suppressSoundClick = false;
            if (pointer !== null) { cancel(); return; }
            if (soundEnabled || (event.button !== undefined && event.button !== 0) || event.isPrimary === false) return;
            pointer = event.pointerId ?? 'mouse';
            start = { x: event.clientX, y: event.clientY };
            ready = false;
            button.setPointerCapture?.(event.pointerId);
            soundHoldTimer = setTimeout(() => { ready = true; }, 700);
        });
        button.addEventListener('pointermove', event => {
            if (pointer === null) return;
            if ((event.pointerId ?? 'mouse') !== pointer || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) cancel();
        });
        button.addEventListener('pointerup', event => {
            if (pointer === null || (event.pointerId ?? 'mouse') !== pointer) { cancel(); return; }
            const rect = button.getBoundingClientRect();
            const inside = !Number.isFinite(rect.left) || (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom);
            const activate = ready && inside && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 8;
            cancel();
            if (activate) { enableSound(); suppressSoundClick = true; }
        });
        ['pointercancel','pointerleave'].forEach(name => button.addEventListener(name, () => cancel()));
        button.addEventListener('lostpointercapture', () => { if (pointer !== null) cancel(); });
        window.addEventListener?.('pointerdown', event => { if (pointer !== null && (event.pointerId ?? 'mouse') !== pointer) cancel(); });
        window.addEventListener?.('blur', () => cancel());
        window.addEventListener?.('pagehide', () => { cancel(); stopSound(); });
        document.addEventListener?.('visibilitychange', () => { if (document.hidden) { cancel(); stopSound(); } });
        button.addEventListener('click', event => {
            if (suppressSoundClick && event.detail > 0) { suppressSoundClick = false; return; }
            suppressSoundClick = false;
            if (soundEnabled) { stopSound(); return; }
            const options = document.getElementById('sound-options');
            if (options) options.open = true;
            document.getElementById('btn-enable-sound')?.focus();
        });
        document.getElementById('btn-enable-sound')?.addEventListener('click', enableSound);
        syncSoundControl();
    }

    let audioNotSupported = false;
    function initAudio() {
        if (!soundEnabled || audioNotSupported) return;
        // ブラウザの自動再生制限に従い、最初のタップ・クリックまでは生成も再開もしない
        if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                audioOutput = audioCtx.createGain();
                audioOutput.gain.value = 1;
                audioOutput.connect(audioCtx.destination);
            } catch (e) {
                audioNotSupported = true;
                console.error("Web Audio API is not supported on this device/browser.", e);
                showToast("このブラウザは音声合成に対応していません。最新のChromeをお試しください。");
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(e => console.error("Failed to resume AudioContext:", e));
        }
    }


    // --- 日本語TTS音声読み上げシステム (ブラウザ内蔵の最高品質ボイス選定) ---
    let voicesList = [];
    let activeVoice = null;

    // デバウンスガード状態管理
    let lastSpeechTime = 0;
    let lastActionTime = 0;

    function loadSpeechVoices() {
        if (!window.speechSynthesis) return;
        try {
            voicesList = window.speechSynthesis.getVoices();
            const jpVoices = voicesList.filter(v => v.lang.includes('ja'));
            
            // 優しくクリアな日本語の声を自動優先選択
            const preferred = jpVoices.find(v => 
                v.name.includes('Kyoko') || 
                v.name.includes('Google') || 
                v.name.includes('Haruka') || 
                v.name.includes('Otoya') || 
                v.name.includes('Siri')
            );
            activeVoice = preferred || jpVoices[0] || null;

            // 保護者用のセレクトボックスを構築
            const select = document.getElementById('voice-select');
            if (select) {
                select.innerHTML = '';
                if (jpVoices.length === 0) {
                    select.innerHTML = `<option value="">日本語音声がみつかりません</option>`;
                } else {
                    jpVoices.forEach((v) => {
                        const opt = document.createElement('option');
                        opt.value = v.name;
                        opt.textContent = `${v.name} (${v.localService ? 'ローカル' : 'クラウド'})`;
                        if (activeVoice && v.name === activeVoice.name) {
                            opt.selected = true;
                        }
                        select.appendChild(opt);
                    });
                }
            }
        } catch (e) {
            console.error("Speech Synthesis error loading voices:", e);
        }
    }

    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadSpeechVoices;
        loadSpeechVoices();
    } else {
        // 音声合成非対応ブラウザへの通知
        showToast('このブラウザは日本語読み上げに対応していません。ChromeまたはSafariをお試しください。', 'info', 6000);
    }

    function changeVoiceSetting() {
        const select = document.getElementById('voice-select');
        if (select && select.value) {
            activeVoice = voicesList.find(v => v.name === select.value) || null;
        }
        speakText("この こえで おしゃべり するよ！");
    }

    // キャラクター固有の声パラメータ
    const charVoices = {
        momo: { emoji: '🐰', name: 'うさぎのももちゃん', pitch: 1.35, rate: 0.95 },
        leo: { emoji: '🦁', name: 'らいおんのレオくん', pitch: 0.95, rate: 1.0 },
        pan: { emoji: '🐼', name: 'ぱんだのパンちゃん', pitch: 1.15, rate: 0.90 }
    };

    let currentCharacter = 'momo';

    function updateNavigator(charKey, text) {
        currentCharacter = charKey;
        const config = charVoices[charKey];
        const charDiv = document.getElementById('navigator-char');
        const nameSpan = document.getElementById('navigator-name');
        const bubbleP = document.getElementById('navigator-bubble');

        if (charDiv) charDiv.textContent = config.emoji;
        if (nameSpan) nameSpan.textContent = config.name;
        if (bubbleP) bubbleP.textContent = text;

        // ジャンプアニメーション
        if (charDiv) {
            charDiv.classList.remove('animate-float');
            void charDiv.offsetWidth; // リフロートリガー
            charDiv.classList.add('animate-float');
        }

        speakText(text, config.pitch, config.rate);
    }

    function speakText(text, pitchOffset = 1.0, rateOffset = 1.0) {
        if (!soundEnabled || !window.speechSynthesis || smileVoiceVolume <= 0) return;

        // デバウンスガード（③ 幼児の超高速連打を防ぎ、キュー詰まりを防止）
        const now = Date.now();
        if (now - lastSpeechTime < 250) {
            return; // あまりに早すぎるリクエストは無視
        }
        lastSpeechTime = now;

        try {
            window.speechSynthesis.cancel(); // 前の音声をクリア

            initAudio();

            const utterance = new SpeechSynthesisUtterance(text);
            if (activeVoice) {
                utterance.voice = activeVoice;
            }
            utterance.lang = 'ja-JP';
            
            const pitchRangeInput = document.getElementById('voice-pitch-range');
            const basePitch = pitchRangeInput ? parseFloat(pitchRangeInput.value) : 1.25;
            
            utterance.pitch = basePitch * pitchOffset;
            utterance.rate = 0.95 * rateOffset;
            utterance.volume = smileVoiceVolume; // 読み上げ個別ボリューム反映

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error("Speech Synthesis run failed:", e);
        }
    }


    // --- 音響合成シンセシステム (Web Audio APIによる完全無料・安全なおもちゃ音) ---
    function synthSound(type) {
        if (!soundEnabled) return;
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;

        try {
            switch (type) {
                case 'correct': // あたり！ピコピコーン！
                    const freqs = [350, 440, 523, 659, 880];
                    freqs.forEach((freq, idx) => {
                        const t = now + idx * 0.08;
                        const osc = createSoundOscillator();
                        const gain = audioCtx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, t);
                        gain.gain.setValueAtTime(0, t);
                        gain.gain.linearRampToValueAtTime(0.15 * smileSynthVolume, t + 0.02);
                        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
                        
                        osc.connect(gain);
                        gain.connect(audioOutput);
                        osc.start(t);
                        osc.stop(t + 0.3);
                    });
                    break;

                case 'incorrect': // あれれ？ブブー不協和音
                    [150, 155].forEach(freq => {
                        const osc = createSoundOscillator();
                        const gain = audioCtx.createGain();
                        osc.type = 'sawtooth';
                        osc.frequency.setValueAtTime(freq, now);
                        gain.gain.setValueAtTime(0, now);
                        gain.gain.linearRampToValueAtTime(0.25 * smileSynthVolume, now + 0.05);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
                        
                        osc.connect(gain);
                        gain.connect(audioOutput);
                        osc.start(now);
                        osc.stop(now + 0.5);
                    });
                    break;

                case 'stamp': // シールペタ
                    const oscS = createSoundOscillator();
                    const gainS = audioCtx.createGain();
                    oscS.type = 'sine';
                    oscS.frequency.setValueAtTime(800, now);
                    oscS.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
                    gainS.gain.setValueAtTime(0.15 * smileSynthVolume, now);
                    gainS.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                    oscS.connect(gainS);
                    gainS.connect(audioOutput);
                    oscS.start(now);
                    oscS.stop(now + 0.15);
                    break;
            }
        } catch (soundError) {
            console.error("Synthesizer playback failed:", soundError);
        }
    }

    // どうぶつなきごえシンセ
    function playAnimalSynth(animal) {
        if (!soundEnabled) return;
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;

        try {
            switch(animal) {
                case 'dog': // キャンキャン！
                    for (let i = 0; i < 2; i++) {
                        const t = now + i * 0.22;
                        const osc = createSoundOscillator();
                        const gain = audioCtx.createGain();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(320, t);
                        osc.frequency.exponentialRampToValueAtTime(800, t + 0.04);
                        osc.frequency.exponentialRampToValueAtTime(250, t + 0.15);
                        
                        gain.gain.setValueAtTime(0, t);
                        gain.gain.linearRampToValueAtTime(0.25 * smileSynthVolume, t + 0.015);
                        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
                        
                        osc.connect(gain);
                        gain.connect(audioOutput);
                        osc.start(t);
                        osc.stop(t + 0.2);
                    }
                    break;

                case 'cat': // ニャーオ
                    const oscC = createSoundOscillator();
                    const oscC2 = createSoundOscillator();
                    const gainC = audioCtx.createGain();
                    
                    oscC.type = 'triangle';
                    oscC.frequency.setValueAtTime(400, now);
                    oscC.frequency.exponentialRampToValueAtTime(580, now + 0.2);
                    oscC.frequency.linearRampToValueAtTime(350, now + 0.65);
                    
                    oscC2.type = 'sine';
                    oscC2.frequency.setValueAtTime(800, now);
                    oscC2.frequency.exponentialRampToValueAtTime(1160, now + 0.2);
                    oscC2.frequency.linearRampToValueAtTime(700, now + 0.65);
                    
                    gainC.gain.setValueAtTime(0, now);
                    gainC.gain.linearRampToValueAtTime(0.18 * smileSynthVolume, now + 0.1);
                    gainC.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
                    
                    oscC.connect(gainC);
                    oscC2.connect(gainC);
                    gainC.connect(audioOutput);
                    oscC.start(now);
                    oscC2.start(now);
                    oscC.stop(now + 0.7);
                    oscC2.stop(now + 0.7);
                    break;

                case 'lion': // ガオーン！
                    const oscL = createSoundOscillator();
                    const filterL = audioCtx.createBiquadFilter();
                    const gainL = audioCtx.createGain();
                    
                    oscL.type = 'sawtooth';
                    oscL.frequency.setValueAtTime(75, now);
                    oscL.frequency.linearRampToValueAtTime(140, now + 0.2);
                    oscL.frequency.exponentialRampToValueAtTime(55, now + 0.85);
                    
                    const lfo = createSoundOscillator();
                    const lfoGain = audioCtx.createGain();
                    lfo.frequency.value = 28;
                    lfoGain.gain.value = 16;
                    lfo.connect(lfoGain);
                    lfoGain.connect(oscL.frequency);
                    
                    filterL.type = 'lowpass';
                    filterL.frequency.setValueAtTime(350, now);
                    filterL.frequency.exponentialRampToValueAtTime(950, now + 0.2);
                    filterL.frequency.exponentialRampToValueAtTime(200, now + 0.85);
                    
                    gainL.gain.setValueAtTime(0, now);
                    gainL.gain.linearRampToValueAtTime(0.35 * smileSynthVolume, now + 0.05);
                    gainL.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
                    
                    oscL.connect(filterL);
                    filterL.connect(gainL);
                    gainL.connect(audioOutput);
                    
                    lfo.start(now);
                    oscL.start(now);
                    lfo.stop(now + 0.95);
                    oscL.stop(now + 0.95);
                    break;

                case 'elephant': // パオーン！
                    const oscE1 = createSoundOscillator();
                    const oscE2 = createSoundOscillator();
                    const filterE = audioCtx.createBiquadFilter();
                    const gainE = audioCtx.createGain();
                    
                    oscE1.type = 'sawtooth';
                    oscE1.frequency.setValueAtTime(440, now);
                    oscE1.frequency.linearRampToValueAtTime(490, now + 0.12);
                    oscE1.frequency.exponentialRampToValueAtTime(320, now + 0.6);
                    
                    oscE2.type = 'square';
                    oscE2.frequency.setValueAtTime(444, now);
                    oscE2.frequency.linearRampToValueAtTime(494, now + 0.12);
                    oscE2.frequency.exponentialRampToValueAtTime(324, now + 0.6);
                    
                    const vib = createSoundOscillator();
                    const vibGain = audioCtx.createGain();
                    vib.frequency.value = 38;
                    vibGain.gain.value = 28;
                    vib.connect(vibGain);
                    vibGain.connect(oscE1.frequency);
                    vibGain.connect(oscE2.frequency);
                    
                    filterE.type = 'bandpass';
                    filterE.frequency.setValueAtTime(800, now);
                    filterE.frequency.exponentialRampToValueAtTime(1800, now + 0.12);
                    filterE.frequency.exponentialRampToValueAtTime(550, now + 0.6);
                    filterE.Q.value = 1.3;
                    
                    gainE.gain.setValueAtTime(0, now);
                    gainE.gain.linearRampToValueAtTime(0.28 * smileSynthVolume, now + 0.06);
                    gainE.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                    
                    oscE1.connect(filterE);
                    oscE2.connect(filterE);
                    filterE.connect(gainE);
                    gainE.connect(audioOutput);
                    
                    vib.start(now);
                    oscE1.start(now);
                    oscE2.start(now);
                    vib.stop(now + 0.65);
                    oscE1.stop(now + 0.65);
                    oscE2.stop(now + 0.65);
                    break;

                case 'frog': // ケロケロケロ
                    for (let i = 0; i < 4; i++) {
                        const t = now + i * 0.11;
                        const oscF = createSoundOscillator();
                        const gainF = audioCtx.createGain();
                        oscF.type = 'sawtooth';
                        oscF.frequency.setValueAtTime(140, t);
                        oscF.frequency.linearRampToValueAtTime(230, t + 0.03);
                        oscF.frequency.exponentialRampToValueAtTime(90, t + 0.07);
                        
                        gainF.gain.setValueAtTime(0, t);
                        gainF.gain.linearRampToValueAtTime(0.22 * smileSynthVolume, t + 0.012);
                        gainF.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
                        
                        oscF.connect(gainF);
                        gainF.connect(audioOutput);
                        oscF.start(t);
                        oscF.stop(t + 0.08);
                    }
                    break;
            }
        } catch (e) {
            console.error("Animal synth error:", e);
        }
    }


    // --- ホーム画面のなかまたちおしゃべりシステム ---
    function speakHomeCharacter(charKey) {
        const config = charVoices[charKey];
        if (!config) return;
        let text = '';
        if (charKey === 'momo') {
            text = "わたしは ももちゃん！ いっしょに たのしく あそぼうね！ どのアトラクションにする？";
        } else if (charKey === 'leo') {
            text = "オレは レオくんだぞ！ クイズで シールを いっぱい あつめてみてくれよな！ ガオーン！";
        } else if (charKey === 'pan') {
            text = "ぼくは パンちゃん。 シールデコで ぺたぺた はるのが だいすきなんだ〜。 いっしょにやろう〜。";
        }
        speakText(text, config.pitch, config.rate);
    }

    // --- タブ切り替えシステム ---
    let currentTab = 'home';

    let pendingNextActivity = null;
    let rewardPointerToken = null;
    let activityGeneration = 0;
    const activityTimers = new Set();
    function cancelActivityTimers() {
        activityGeneration++;
        activityTimers.forEach(clearTimeout);
        activityTimers.clear();
        pendingNextActivity = null;
        rewardPointerToken = null;
        missionRewardPending = false;
        const modal = document.getElementById('modal-sticker');
        if (modal) modal.classList.add('hidden');
    }
    function scheduleActivity(callback, delay) {
        const generation = activityGeneration;
        const tab = currentTab;
        const timer = setTimeout(() => {
            activityTimers.delete(timer);
            if (generation === activityGeneration && tab === currentTab) callback();
        }, delay);
        activityTimers.add(timer);
    }

    function switchTab(tabId, options = {}) {
        cancelActivityTimers();
        const silent = options.silent === true;
        if (!silent) initAudio();
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        
        const targetTab = document.getElementById(`tab-${tabId}`);
        if (targetTab) targetTab.classList.remove('hidden');

        // フッターアクティブ表現 (操作色の「ブルー」で統一)
        document.querySelectorAll('nav button').forEach(el => {
            el.classList.remove('bg-blue-50', 'border-blue-200', 'shadow-inner');
        });
        const activeNav = document.getElementById(`nav-${tabId}`);
        if (activeNav) activeNav.classList.add('bg-blue-50', 'border-blue-200', 'shadow-inner');

        currentTab = tabId;

        // おうちボタンと案内エリアの動的表示制御
        const btnBackHome = document.getElementById('btn-back-home');
        const navigatorArea = document.getElementById('navigator-area');

        if (tabId === 'home') {
            if (btnBackHome) btnBackHome.classList.add('hidden');
            if (navigatorArea) navigatorArea.classList.add('hidden');
        } else {
            if (btnBackHome) btnBackHome.classList.remove('hidden');
            if (navigatorArea) navigatorArea.classList.remove('hidden');
        }

        // アチーブメント判定用
        checkAndTriggerMissions();

        // 各種タブごとの初期化 ＆ がんばりレポート記録
        if (tabId === 'home') {
            if (!silent) speakText("キッズ・スマイル・ランドへ ようこそ！ なにして あそぶ？");
        } else if (tabId === 'hiragana') {
            updateNavigator('momo', "ひらがなを タップして、おしゃべり してみてね！");
            recordPlay('hiragana');
        } else if (tabId === 'count') {
            updateNavigator('pan', "くだものたちは いくつあるかな？ かぞえてね！");
            startCountQuiz();
            recordPlay('count');
        } else if (tabId === 'draw') {
            updateNavigator('momo', "おえかきや ぬりえをして、じゆうに あそぼう！");
            resizeCanvas();
            recordPlay('draw');
        } else if (tabId === 'quiz') {
            updateNavigator('leo', "おとを よくきいて、どの どうぶつか あてよう！");
            startQuizGame();
            recordPlay('quiz');
        } else if (tabId === 'match') {
            updateNavigator('pan', "おなじ どうぶつカードを めくって、えあわせしよう！");
            initMatchGame();
            recordPlay('match');
        } else if (tabId === 'xylophone') {
            updateNavigator('momo', "もっきんを たたいてみよう！ きれいな音がするよ。");
            startSongGuide();
            recordPlay('xylophone');
        } else if (tabId === 'sticker') {
            updateNavigator('momo', "あつめたシールを、すきな台紙に ぺたぺた はってね！");
            loadStickerCanvas();
            recordPlay('sticker');
        }
    }

    function saveStickers() {
        try {
            if (storageReadBlocked) throw new Error('Stored data could not be restored; original data retained.');
            localStorage.setItem('smile_stickers', JSON.stringify(myStickers));
            localStorage.setItem('smile_placed_stickers', JSON.stringify(placedStickers));
            localStorage.setItem('smile_selected_bg', selectedBg);
        } catch (e) {
            console.error("Failed to save stickers to LocalStorage:", e);
            showToast("この端末へ保存できていません。画面を閉じると今回のシールが失われる場合があります。");
        }
        updateStickerUI();
    }

    function saveSettings() {
        try {
            if (storageReadBlocked) throw new Error('Stored data could not be restored; original data retained.');
            localStorage.setItem('smile_level', smileLevel);
            localStorage.setItem('smile_timer_limit', smileTimerLimit);
            localStorage.setItem('smile_voice_volume', smileVoiceVolume);
            localStorage.setItem('smile_synth_volume', smileSynthVolume);
            localStorage.setItem('smile_sleep_reason', smileSleepReason);
            localStorage.setItem('smile_kids_name', smileKidsName);
            localStorage.setItem('smile_stats', JSON.stringify(smileStats));
            localStorage.setItem('smile_missions', JSON.stringify(smileMissions));
        } catch (e) {
            console.error("Failed to save settings to LocalStorage:", e);
            showToast("この端末へ設定や記録を保存できていません。保護者の方と保存設定をご確認ください。");
        }
    }

    function recordPlay(gameKey) {
        if (smileStats.plays[gameKey] !== undefined) {
            smileStats.plays[gameKey]++;
            saveSettings();
            updateStatsUI();
        }
    }

    function recordCorrect(kind) {
        smileStats.correct_answers++;
        if (kind === 'count') {
            smileStats.count_corrects = Number(smileStats.count_corrects || 0) + 1;
        }
        saveSettings();
        updateStatsUI();
    }

    function updateStickerUI() {
        const countEl = document.getElementById('sticker-count');
        if (countEl) countEl.textContent = myStickers.length;
        
        // 手持ちプール
        const pool = document.getElementById('sticker-pool');
        if (pool) {
            pool.innerHTML = '';
            if (myStickers.length === 0) {
                pool.innerHTML = `<span class="text-xs text-slate-400">クイズをクリアしてシールをあつめよう！</span>`;
            } else {
                myStickers.forEach((emoji, idx) => {
                    const btn = document.createElement('button');
                    btn.className = "w-11 h-11 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all shadow-sm select-none shrink-0";
                    btn.textContent = emoji;
                    btn.onclick = () => placeStickerOnCanvas(emoji, idx);
                    pool.appendChild(btn);
                });
            }
        }
    }

    // シール獲得処理
    let pendingSticker = '🐶';
    function setManualNext(callback) {
        pendingNextActivity = { callback, tab: currentTab, generation: activityGeneration };
        rewardPointerToken = null;
    }
    function grantRewardSticker() {
        pendingSticker = ALL_SEALS[Math.floor(Math.random() * ALL_SEALS.length)];
        myStickers.push(pendingSticker);
        
        // 統計
        smileStats.total_stickers++;
        saveStickers();
        saveSettings();
        updateStatsUI();

        // 新規シールバッジ点灯
        const badge = document.getElementById('badge-new');
        if (badge) badge.classList.remove('hidden');

        // モーダルオープン
        const modalEmoji = document.getElementById('get-sticker-emoji');
        if (modalEmoji) {
            modalEmoji.textContent = pendingSticker;
            modalEmoji.classList.remove('reward-celebrate');
            void modalEmoji.offsetWidth;
            modalEmoji.classList.add('reward-celebrate');
        }
        const nextButton = document.getElementById('btn-close-sticker-modal');
        if (nextButton) nextButton.textContent = pendingNextActivity ? 'つぎへ' : 'ありがとう！';
        const modal = document.getElementById('modal-sticker');
        if (modal) modal.classList.remove('hidden');
        
        // 効果音
        synthSound('correct');
    }

    function closeStickerModal(event) {
        if (pendingNextActivity && event?.detail !== 0 && rewardPointerToken !== pendingNextActivity) return;
        const next = pendingNextActivity;
        pendingNextActivity = null;
        rewardPointerToken = null;
        const modal = document.getElementById('modal-sticker');
        if (modal) modal.classList.add('hidden');
        if (next && next.generation === activityGeneration && next.tab === currentTab) {
            lastActionTime = Date.now();
            next.callback();
        } else if (!next) updateNavigator('momo', "新しいシール、おめでとう！シールデコだいしに はれるよ！");
    }


    // --- TAB 1: ひらがなボード ---
    const hiraData_standard = [
        {char: 'あ', word: 'あり', icon: '🐜'}, {char: 'い', word: 'いぬ', icon: '🐶'}, {char: 'う', word: 'うさぎ', icon: '🐰'}, {char: 'え', word: 'えんぴつ', icon: '✏️'}, {char: 'お', word: 'おにぎり', icon: '🍙'},
        {char: 'か', word: 'かさ', icon: '☂️'}, {char: 'き', word: 'きりん', icon: '🦒'}, {char: 'く', word: 'くるま', icon: '🚗'}, {char: 'け', word: 'けむし', icon: '🐛'}, {char: 'こ', word: 'こま', icon: '🪁'},
        {char: 'さ', word: 'さかな', icon: '🐟'}, {char: 'し', word: 'しんかんせん', icon: '🚄'}, {char: 'す', word: 'すいか', icon: '🍉'}, {char: 'せ', word: 'せみ', icon: '🐞'}, {char: 'そ', word: 'そら', icon: '☁️'},
        {char: 'た', word: 'たいこ', icon: '🥁'}, {char: 'ち', word: 'ちゅうりっぷ', icon: '🌷'}, {char: 'つ', word: 'つくえ', icon: '🪑'}, {char: 'て', word: 'てがみ', icon: '✉️'}, {char: 'と', word: 'とまと', icon: '🍅'},
        {char: 'な', word: 'なす', icon: '🍆'}, {char: 'に', word: 'にんじん', icon: '🥕'}, {char: 'ぬ', word: 'ぬいぐるみ', icon: '🧸'}, {char: 'ね', word: 'ねこ', icon: '🐱'}, {char: 'の', word: 'のりもの', icon: '🚲'},
        {char: 'は', word: 'はな', icon: '🌸'}, {char: 'ひ', word: 'ひこうき', icon: '✈️'}, {char: 'ふ', word: 'ふうせん', icon: '🎈'}, {char: 'へ', word: 'へび', icon: '🐍'}, {char: 'ほ', word: 'ほし', icon: '⭐'},
        {char: 'ま', word: 'まつり', icon: '🏮'}, {char: 'み', word: 'みかん', icon: '🍊'}, {char: 'む', word: 'むし', icon: '🐝'}, {char: 'め', word: 'めがね', icon: '👓'}, {char: 'も', word: 'もも', icon: '🍑'},
        {char: 'や', word: 'やま', icon: '⛰️'}, {char: '', word: '', icon: ''}, {char: 'ゆ', word: 'ゆき', icon: '❄️'}, {char: '', word: '', icon: ''}, {char: 'よ', word: 'よういどん', icon: '🏃'},
        {char: 'ら', word: 'らいおん', icon: '🦁'}, {char: 'り', word: 'りんご', icon: '🍎'}, {char: 'る', word: 'るすばん', icon: '🏠'}, {char: 'れ', word: 'れもん', icon: '🍋'}, {char: 'ろ', word: 'ろけっと', icon: '🚀'},
        {char: 'わ', word: 'わたあめ', icon: '☁️'}, {char: '', word: '', icon: ''}, {char: 'を', word: 'ほんをよむ', icon: '📖'}, {char: '', word: '', icon: ''}, {char: 'ん', word: 'にほんご', icon: '🇯🇵'}
    ];

    const hiraData_voiced = [
        {char: 'が', word: 'がらす', icon: '🥛'}, {char: 'ぎ', word: 'ぎゅうにゅう', icon: '🥛'}, {char: 'ぐ', word: 'ぐみの実', icon: '🍒'}, {char: 'げ', word: 'げた', icon: '🪵'}, {char: 'ご', word: 'ごりら', icon: '🦍'},
        {char: 'ざ', word: 'ざっし', icon: '📖'}, {char: 'じ', word: 'じてんしゃ', icon: '🚲'}, {char: 'ず', word: 'ずぼん', icon: '👖'}, {char: 'ぜ', word: 'ぜりー', icon: '🍮'}, {char: 'ぞ', word: 'ぞう', icon: '🐘'},
        {char: 'だ', word: 'だんご', icon: '🍡'}, {char: 'ぢ', word: 'はなぢ', icon: '🩸'}, {char: 'づ', word: 'かんづめ', icon: '🥫'}, {char: 'で', word: 'でんしゃ', icon: '🚃'}, {char: 'ど', word: 'どんぐり', icon: '🌰'},
        {char: 'ば', word: 'ばなな', icon: '🍌'}, {char: 'び', word: 'びん', icon: '🫙'}, {char: 'ぶ', word: 'ぶどう', icon: '🍇'}, {char: 'べ', word: 'べると', icon: '🎗️'}, {char: 'ぼ', word: 'ぼうし', icon: '👒'},
        {char: 'ぱ', word: 'ぱんだ', icon: '🐼'}, {char: 'ぴ', word: 'ぴあの', icon: '🎹'}, {char: 'ぷ', word: 'ぷりん', icon: '🍮'}, {char: 'ぺ', word: 'ぺんぎん', icon: '🐧'}, {char: 'ぽ', word: 'ぽすと', icon: '📮'}
    ];

    let activeHiraganaType = 'standard';

    function setHiraganaType(type) {
        activeHiraganaType = type;
        const btnStd = document.getElementById('btn-h-std');
        const btnVoi = document.getElementById('btn-h-voi');
        
        if (type === 'standard') {
            if (btnStd) btnStd.className = "px-4 py-2 rounded-lg text-sm font-bold bg-white text-blue-600 shadow-sm border border-slate-200 transition-all";
            if (btnVoi) btnVoi.className = "px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-blue-600 transition-all";
        } else {
            if (btnVoi) btnVoi.className = "px-4 py-2 rounded-lg text-sm font-bold bg-white text-blue-600 shadow-sm border border-slate-200 transition-all";
            if (btnStd) btnStd.className = "px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-blue-600 transition-all";
        }
        renderHiragana();
    }

    function renderHiragana() {
        const grid = document.getElementById('hiragana-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const data = (activeHiraganaType === 'standard') ? hiraData_standard : hiraData_voiced;

        data.forEach(item => {
            if (!item.char) {
                const empty = document.createElement('div');
                empty.className = "invisible";
                grid.appendChild(empty);
                return;
            }

            const card = document.createElement('button');
            card.className = "btn-puni shadow-orange-100 bg-amber-50/50 hover:bg-amber-100/50 p-2 rounded-2xl border-2 border-orange-100 flex flex-col items-center justify-between aspect-square relative";
            card.onclick = () => {
                updateNavigator('momo', `${item.char}！ ${item.word} の、 ${item.char}！`);
            };

            const charSpan = document.createElement('span');
            charSpan.className = "text-xl md:text-2xl font-black text-orange-600 self-start";
            charSpan.textContent = item.char;

            const iconSpan = document.createElement('span');
            iconSpan.className = "text-2xl md:text-3xl select-none mb-1";
            iconSpan.textContent = item.icon;

            const wordSpan = document.createElement('span');
            wordSpan.className = "text-[10px] md:text-xs text-slate-500 font-bold truncate w-full";
            wordSpan.textContent = item.word;

            card.appendChild(charSpan);
            card.appendChild(iconSpan);
            card.appendChild(wordSpan);

            grid.appendChild(card);
        });
    }


    // --- TAB 2: かずかぞえクイズ ---
    let currentCountAnswer = 0;
    let countAnswered = false;
    let countRoundGeneration = 0;
    const countEmojis = ['🍎', '🍌', '🍓', '🍊', '🎈', '🚗', '🐈', '🐶', '🍦', '🐧', '🐼', '🌻', '🥕', '🦖', '🍭'];

    function startCountQuiz() {
        const round = ++countRoundGeneration;
        countAnswered = false;
        const list = document.getElementById('count-items');
        const options = document.getElementById('count-options');
        if (!list || !options) return;
        list.innerHTML = '';
        options.innerHTML = '';

        // 学習レベルに合わせた範囲調整
        let minCount = 1;
        let maxCount = 10;
        let optionsNum = 3;

        if (smileLevel === 'easy') {
            maxCount = 5;
            optionsNum = 2; // 2択
        } else if (smileLevel === 'hard') {
            minCount = 11;
            maxCount = 20;
            optionsNum = 4; // 4択
        }

        // ランダムに個数を設定
        currentCountAnswer = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount; 
        const selectedEmoji = countEmojis[Math.floor(Math.random() * countEmojis.length)];

        for (let i = 0; i < currentCountAnswer; i++) {
            const el = document.createElement('div');
            el.className = "animate-float";
            el.style.animationDelay = `${i * 0.12}s`;
            el.textContent = selectedEmoji;
            list.appendChild(el);
        }

        // 選択肢作成 (操作色は「ブルー」)
        const choices = [currentCountAnswer];
        while (choices.length < optionsNum) {
            const wrong = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
            if (!choices.includes(wrong)) {
                choices.push(wrong);
            }
        }
        choices.sort((a, b) => a - b);

        choices.forEach(val => {
            const btn = document.createElement('button');
            btn.className = "btn-puni shadow-blue-200 bg-blue-500 hover:bg-blue-600 text-white font-black text-3xl py-4 rounded-3xl flex-1 border-2 border-white select-none";
            btn.textContent = val;
            btn.onclick = () => handleCountAnswer(val, round);
            options.appendChild(btn);
        });
    }

    function handleCountAnswer(choice, round = countRoundGeneration) {
        if (currentTab !== 'count' || round !== countRoundGeneration) return;
        if (countAnswered) return;
        // ③ デバウンスガード（ボタン連続高速タップの重複実行防止）
        const now = Date.now();
        if (now - lastActionTime < 400) return;
        lastActionTime = now;

        if (choice === currentCountAnswer) {
            countAnswered = true;
            updateNavigator('pan', "大せいかい！ 素晴らしいね！");
            recordCorrect('count');
            setManualNext(startCountQuiz);
            grantRewardSticker();
        } else {
            updateNavigator('pan', "あれれ？ もう一かい かぞえてみよう！");
            synthSound('incorrect');
        }
    }


    // --- TAB 3: おえかき（画面回転対応・筆圧エミュレーション） ---
    const canvas = document.getElementById('paint-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let brushColor = '#ff5e7e';
    let brushWidth = 'auto'; // 'auto' (指の速さで変化)、または 5, 15 (固定値)
    let rainbowHue = 0;

    // ④ 筆圧エミュレーション用移動スピードトラッキング
    let lastDrawTime = 0;

    function resizeCanvas() {
        if (!canvas || !canvas.parentElement) return;
        const parent = canvas.parentElement;
        const rect = parent.getBoundingClientRect();
        
        // 1. 現在のキャンバス描画内容をメモリ上の一時キャンバス（バッファ）に退避
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // 旧キャンバスからコピー
        tempCtx.drawImage(canvas, 0, 0);

        // 2. キャンバスの大きさを親コンテナサイズに再フィッティング
        canvas.width = rect.width;
        canvas.height = rect.height;

        // 3. 画質クリア処理をせずに、退避した内容を書き戻し（画面が回転しても描いた絵が絶対消えない）
        if (ctx) {
            ctx.save();
            ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        // したえがある場合は、再度ガイドライン（点線）を描写
        const templateSelect = document.getElementById('draw-template');
        const template = templateSelect ? templateSelect.value : 'none';
        if (template !== 'none') {
            drawTemplateGuide(template);
        }
    }

    window.addEventListener('resize', () => {
        if (currentTab === 'draw') {
            resizeCanvas();
        }
    });

    // おえかきマウスイベント＆タッチイベント
    function getCoords(e) {
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    function startDrawing(e) {
        isDrawing = true;
        const coords = getCoords(e);
        lastX = coords.x;
        lastY = coords.y;
        lastDrawTime = Date.now();
        initAudio(); // オーディオ再開
    }

    function draw(e) {
        if (!isDrawing || !ctx) return;
        e.preventDefault();
        const coords = getCoords(e);
        const now = Date.now();

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(coords.x, coords.y);

        // ④ 速度検知筆圧エミュレーション
        let currentWidth = brushWidth;
        if (brushWidth === 'auto') {
            const distance = Math.sqrt(Math.pow(coords.x - lastX, 2) + Math.pow(coords.y - lastY, 2));
            const timeDiff = Math.max(1, now - lastDrawTime);
            const velocity = distance / timeDiff; // ピクセル / ミリ秒

            // ゆっくり ➔ 太く(最大22px), 素早く ➔ 細く(最小3px)
            currentWidth = Math.max(3, Math.min(22, 20 - (velocity * 4)));
        }

        // ブラシ設定
        if (brushColor === 'rainbow') {
            ctx.strokeStyle = `hsl(${rainbowHue}, 90%, 65%)`;
            rainbowHue = (rainbowHue + 3) % 360;
            ctx.globalCompositeOperation = 'source-over';
        } else if (brushColor === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.strokeStyle = brushColor;
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.lineWidth = currentWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        lastX = coords.x;
        lastY = coords.y;
        lastDrawTime = now;
    }

    function stopDrawing() {
        isDrawing = false;
    }

    if (canvas) {
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        window.addEventListener('mouseup', stopDrawing);

        canvas.addEventListener('touchstart', startDrawing);
        canvas.addEventListener('touchmove', draw);
        window.addEventListener('touchend', stopDrawing);
    }

    function setDrawColor(color, btn) {
        brushColor = color;
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('ring-2', 'ring-blue-500', 'scale-110'));
        if (btn) btn.classList.add('ring-2', 'ring-blue-500', 'scale-110');
        
        if (color === 'eraser') {
            updateNavigator('momo', "けしごむで、きれいに けしちゃおう！");
        } else if (color === 'rainbow') {
            updateNavigator('momo', "にじいろペンだ！ まほうみたい！");
        } else {
            updateNavigator('momo', "新しいいろで、お絵かきスタート！");
        }
    }

    function setPenWidth(width, btn) {
        brushWidth = width;
        document.querySelectorAll('.stroke-btn').forEach(b => {
            b.className = "px-3 py-1.5 rounded-lg text-slate-500 font-bold hover:text-slate-700 transition-all stroke-btn";
        });
        if (btn) {
            if (width === 'auto') {
                btn.className = "px-3 py-1.5 rounded-lg bg-blue-100 shadow-sm font-black text-blue-700 border border-blue-200 transition-all stroke-btn";
            } else {
                btn.className = "px-3 py-1.5 rounded-lg bg-white shadow-sm font-bold text-slate-700 border border-slate-200 transition-all stroke-btn";
            }
        }
    }

    function clearCanvas(initial = false) {
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 下絵がロードされている場合、薄く再描画
        const templateSelect = document.getElementById('draw-template');
        const template = templateSelect ? templateSelect.value : 'none';
        if (template !== 'none') {
            drawTemplateGuide(template);
        }
        if (!initial) {
            updateNavigator('momo', "きれいに けしちゃった！また いっぱい描いてね。");
        }
    }

    function loadDrawTemplate() {
        const templateSelect = document.getElementById('draw-template');
        const template = templateSelect ? templateSelect.value : 'none';
        clearCanvas(true);
        if (template !== 'none') {
            updateNavigator('momo', "したえ（ぬりえ）が出たよ！そーっとなぞってみてね。");
        }
    }

    // 下絵を点線で描く
    function drawTemplateGuide(type) {
        if (!ctx || !canvas) return;
        ctx.save();
        ctx.strokeStyle = '#cbd5e1'; // 薄いグレー
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 8]);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        if (type === 'star') {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(cx + Math.cos((18 + i * 72) * Math.PI / 180) * 100, cy - Math.sin((18 + i * 72) * Math.PI / 180) * 100);
                ctx.lineTo(cx + Math.cos((54 + i * 72) * Math.PI / 180) * 45, cy - Math.sin((54 + i * 72) * Math.PI / 180) * 45);
            }
            ctx.closePath();
            ctx.stroke();
        } else if (type === 'cat') {
            ctx.beginPath();
            ctx.arc(cx, cy + 20, 75, 0, Math.PI * 2);
            ctx.moveTo(cx - 60, cy - 25);
            ctx.lineTo(cx - 70, cy - 90);
            ctx.lineTo(cx - 20, cy - 45);
            ctx.moveTo(cx + 60, cy - 25);
            ctx.lineTo(cx + 70, cy - 90);
            ctx.lineTo(cx + 20, cy - 45);
            ctx.stroke();
        } else if (type === 'car') {
            ctx.beginPath();
            ctx.moveTo(cx - 130, cy + 40);
            ctx.lineTo(cx - 130, cy - 10);
            ctx.lineTo(cx - 70, cy - 10);
            ctx.lineTo(cx - 40, cy - 50);
            ctx.lineTo(cx + 40, cy - 50);
            ctx.lineTo(cx + 80, cy - 10);
            ctx.lineTo(cx + 130, cy - 10);
            ctx.lineTo(cx + 130, cy + 40);
            ctx.closePath();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx - 70, cy + 40, 25, 0, Math.PI * 2);
            ctx.moveTo(cx + 70 + 25, cy + 40);
            ctx.arc(cx + 70, cy + 40, 25, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }


    // --- TAB 4: なきごえクイズ ---
    let quizAnimals = [
        { id: 'dog', name: 'いぬ 🐕', emoji: '🐕' },
        { id: 'cat', name: 'ねこ 🐈', emoji: '🐈' },
        { id: 'lion', name: 'らいおん 🦁', emoji: '🦁' },
        { id: 'elephant', name: 'ぞう 🐘', emoji: '🐘' },
        { id: 'frog', name: 'かえる 🐸', emoji: '🐸' }
    ];
    let currentQuizAnswer = '';
    let quizAnswered = false;
    let quizRoundGeneration = 0;

    function startQuizGame() {
        const round = ++quizRoundGeneration;
        quizAnswered = false;
        const target = quizAnimals[Math.floor(Math.random() * quizAnimals.length)];
        currentQuizAnswer = target.id;

        const options = document.getElementById('quiz-options');
        if (!options) return;
        options.innerHTML = '';

        // 対象も含めてランダムにどうぶつを選ぶ
        let choices = [target];
        while (choices.length < 4) {
            const rand = quizAnimals[Math.floor(Math.random() * quizAnimals.length)];
            if (!choices.some(c => c.id === rand.id)) {
                choices.push(rand);
            }
        }
        choices.sort(() => Math.random() - 0.5);

        choices.forEach(item => {
            const btn = document.createElement('button');
            btn.className = "btn-puni shadow-blue-100 bg-blue-50/55 hover:bg-blue-100 text-slate-800 p-4 rounded-3xl border-2 border-blue-200 flex flex-col items-center justify-center aspect-square gap-2 select-none";
            btn.onclick = () => handleQuizAnswer(item.id, round);
            
            const emojiSpan = document.createElement('span');
            emojiSpan.className = "text-4xl md:text-5xl";
            emojiSpan.textContent = item.emoji;

            const labelSpan = document.createElement('span');
            labelSpan.className = "text-sm font-bold text-slate-600";
            labelSpan.textContent = item.name;

            btn.appendChild(emojiSpan);
            btn.appendChild(labelSpan);
            options.appendChild(btn);
        });

        // 最初の鳴き声再生
        const epoch = soundEpoch;
        scheduleActivity(() => { if (epoch === soundEpoch) playQuizVoice(); }, 600);
    }

    function playQuizVoice() {
        if (currentTab !== 'quiz') return;
        playAnimalSynth(currentQuizAnswer);
    }

    function handleQuizAnswer(choice, round = quizRoundGeneration) {
        if (currentTab !== 'quiz' || round !== quizRoundGeneration) return;
        if (quizAnswered) return;
        // ③ デバウンスガード（ボタン連続高速タップの重複実行防止）
        const now = Date.now();
        if (now - lastActionTime < 400) return;
        lastActionTime = now;

        if (choice === currentQuizAnswer) {
            quizAnswered = true;
            updateNavigator('leo', "すごいっ！おみごと大せいかい！");
            recordCorrect();
            setManualNext(startQuizGame);
            grantRewardSticker();
        } else {
            updateNavigator('leo', "あれ？もう一度 おとを きいてみてね！");
            synthSound('incorrect');
        }
    }


    // --- TAB 5: カードえあわせ (神経衰弱) ---
    let matchRoundGeneration = 0;
    let matchCards = [];
    let firstSelectedCard = null;
    let secondSelectedCard = null;
    let canMatchTap = true;
    let matchedPairsCount = 0;
    let totalMatchPairs = 6;

    const matchAnimals = ['🐶', '🐈', '🐼', '🐰', '🦁', '🐘', '🐸', '🍉'];

    function initMatchGame() {
        matchRoundGeneration++;
        matchedPairsCount = 0;
        const pairsEl = document.getElementById('match-pairs');
        if (pairsEl) pairsEl.textContent = matchedPairsCount;
        firstSelectedCard = null;
        secondSelectedCard = null;
        canMatchTap = true;

        // 学習レベルに合わせたカード枚数とレイアウト決定
        let activeAnimals = [];
        let gridCols = "grid-cols-4";

        if (smileLevel === 'easy') {
            totalMatchPairs = 2; // 4枚
            activeAnimals = matchAnimals.slice(0, 2);
            gridCols = "grid-cols-2 max-w-[200px]";
        } else if (smileLevel === 'hard') {
            totalMatchPairs = 8; // 16枚
            activeAnimals = matchAnimals.slice(0, 8);
            gridCols = "grid-cols-4";
        } else {
            totalMatchPairs = 6; // 12枚
            activeAnimals = matchAnimals.slice(0, 6);
            gridCols = "grid-cols-4";
        }

        const totalPairsEl = document.getElementById('match-pairs-total');
        if (totalPairsEl) totalPairsEl.textContent = totalMatchPairs;

        // グリッドカラムのクラス更新
        const grid = document.getElementById('match-grid');
        if (!grid) return;
        grid.className = `grid ${gridCols} gap-3 w-full max-w-md aspect-square max-h-[380px] mx-auto`;
        grid.innerHTML = '';

        // ペアシャッフル
        let pool = [...activeAnimals, ...activeAnimals];
        pool.sort(() => Math.random() - 0.5);

        matchCards = [];
        pool.forEach((emoji, index) => {
            const card = document.createElement('button');
            card.className = "btn-puni shadow-blue-100 bg-blue-500 hover:bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl md:text-4xl font-bold border-2 border-white select-none relative aspect-square";
            card.dataset.index = index;
            card.dataset.emoji = emoji;
            card.onclick = () => handleMatchCardTap(card);
            
            // 裏面マーク
            const backMark = document.createElement('span');
            backMark.className = "absolute text-white/50 text-2xl";
            backMark.textContent = '❓';
            card.appendChild(backMark);

            grid.appendChild(card);
            matchCards.push(card);
        });
    }

    function handleMatchCardTap(card) {
        if (currentTab !== 'match' || !matchCards.includes(card) || !canMatchTap || card === firstSelectedCard || card.classList.contains('matched') || card.classList.contains('open')) return;
        initAudio();

        // カードをオープン
        card.className = "btn-puni shadow-inner bg-white text-slate-800 rounded-2xl flex items-center justify-center text-3xl md:text-4xl border-2 border-blue-200 select-none relative aspect-square open";
        card.innerHTML = card.dataset.emoji;

        // プチ木琴音（めくった感）
        playMokkinNote(440 + Math.random() * 200);

        if (!firstSelectedCard) {
            firstSelectedCard = card;
        } else {
            secondSelectedCard = card;
            canMatchTap = false;

            const round = matchRoundGeneration;
            // 判定
            if (firstSelectedCard.dataset.emoji === secondSelectedCard.dataset.emoji) {
                // ペア成立 (成功ステータス：エメラルド)
                scheduleActivity(() => {
                    if (round !== matchRoundGeneration) return;
                    firstSelectedCard.classList.add('matched');
                    secondSelectedCard.classList.add('matched');
                    firstSelectedCard.className = "bg-emerald-50 text-emerald-800 rounded-2xl flex items-center justify-center text-3xl md:text-4xl border-2 border-emerald-300 select-none relative aspect-square opacity-70 matched";
                    secondSelectedCard.className = "bg-emerald-50 text-emerald-800 rounded-2xl flex items-center justify-center text-3xl md:text-4xl border-2 border-emerald-300 select-none relative aspect-square opacity-70 matched";
                    
                    matchedPairsCount++;
                    const pairsEl = document.getElementById('match-pairs');
                    if (pairsEl) pairsEl.textContent = matchedPairsCount;
                    
                    synthSound('stamp');

                    firstSelectedCard = null;
                    secondSelectedCard = null;
                    canMatchTap = true;

                    if (matchedPairsCount === totalMatchPairs) {
                        updateNavigator('pan', "ぜんぶ そろったよ！ よくできたね！✨");
                        recordCorrect();
                        
                        // ⑤ アチーブメント判定：えあわせを1回パーフェクトクリア
                        if (!smileMissions.matchPerfect) {
                            smileMissions.matchPerfect = true;
                            saveSettings();
                        }

                        grantRewardSticker();
                    } else {
                        updateNavigator('pan', "あたり！ そのちょうし！");
                    }
                }, 600);
            } else {
                // はずれ、戻す
                scheduleActivity(() => {
                    if (round !== matchRoundGeneration) return;
                    firstSelectedCard.className = "btn-puni shadow-blue-100 bg-blue-500 hover:bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl md:text-4xl font-bold border-2 border-white select-none relative aspect-square";
                    firstSelectedCard.innerHTML = `<span class="absolute text-white/50 text-2xl">❓</span>`;
                    secondSelectedCard.className = "btn-puni shadow-blue-100 bg-blue-500 hover:bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl md:text-4xl font-bold border-2 border-white select-none relative aspect-square";
                    secondSelectedCard.innerHTML = `<span class="absolute text-white/50 text-2xl">❓</span>`;

                    synthSound('incorrect');

                    firstSelectedCard = null;
                    secondSelectedCard = null;
                    canMatchTap = true;
                    updateNavigator('pan', "あれれ？ おなじどうぶつは どこかな？");
                }, 1000);
            }
        }
    }


    // --- TAB 6: もっきん ＆ おとあてゲーム ---
    const scaleFreqs = [
        261.63, // ド
        293.66, // レ
        329.63, // ミ
        349.23, // ファ
        392.00, // ソ
        440.00, // ラ
        493.88, // シ
        523.25  // ド (高)
    ];

    const songs = {
        twinkle: [0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0], // きらきらぼし (前半)
        frog: [0, 1, 2, 3, 2, 1, 0, 2, 3, 4, 5, 4, 3, 2], // かえるのがっしょう
        sheep: [2, 1, 0, 1, 2, 2, 2, 1, 1, 1, 2, 4, 4] // メリーさんのひつじ
    };

    let activeSongKey = 'free';
    let currentSongIndex = 0;

    let isOtoateMode = false;
    let currentOtoateTargetNote = 0;

    function playMokkinNote(freq) {
        if (!soundEnabled) return;
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        
        try {
            // 主波形
            const osc1 = createSoundOscillator();
            osc1.type = 'triangle';
            osc1.frequency.value = freq;
            
            const osc2 = createSoundOscillator();
            osc2.type = 'sine';
            osc2.frequency.value = freq * 2; // 倍音
            
            // コツッというアタック音
            const oscClick = createSoundOscillator();
            oscClick.type = 'sine';
            oscClick.frequency.setValueAtTime(freq * 6, now);
            oscClick.frequency.exponentialRampToValueAtTime(freq, now + 0.02);
            
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3 * smileSynthVolume, now + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            
            const gainClick = audioCtx.createGain();
            gainClick.gain.setValueAtTime(0.18 * smileSynthVolume, now);
            gainClick.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

            osc1.connect(gain);
            osc2.connect(gain);
            oscClick.connect(gainClick);
            
            gain.connect(audioOutput);
            gainClick.connect(audioOutput);
            
            osc1.start(now);
            osc2.start(now);
            oscClick.start(now);
            
            osc1.stop(now + 0.45);
            osc2.stop(now + 0.45);
            oscClick.stop(now + 0.03);
        } catch (e) {
            console.error("Mokkin synthesizer run error:", e);
        }
    }

    function tapXylo(noteIndex) {
        playMokkinNote(scaleFreqs[noteIndex]);

        // おとあてモードのアクティブ時処理
        if (isOtoateMode) {
            if (noteIndex === currentOtoateTargetNote) {
                // 正解！
                updateNavigator('momo', "大せいかい！ おとあて、大せいこう！💮");
                recordCorrect();
                grantRewardSticker();
                exitOtoateMode();
            } else {
                // あれれ？
                updateNavigator('momo', "あれれ？ もう一回おとをきいてみてね！🎵");
                synthSound('incorrect');
            }
            return;
        }

        // ガイド中であれば進行確認
        if (activeSongKey !== 'free') {
            const song = songs[activeSongKey];
            const expected = song[currentSongIndex];

            if (noteIndex === expected) {
                currentSongIndex++;
                if (currentSongIndex >= song.length) {
                    // 曲クリア！(成功お祝い)
                    updateNavigator('momo', "わーい！上手に えんそうできたね！大パチパチパチ！");
                    recordCorrect();

                    // ⑤ アチーブメント判定：もっきんのえんそうを完奏した
                    if (!smileMissions.xyloFirst) {
                        smileMissions.xyloFirst = true;
                        saveSettings();
                    }

                    grantRewardSticker();
                    const select = document.getElementById('xylo-song');
                    if (select) select.value = 'free';
                    startSongGuide();
                } else {
                    updateSongGuideHighlight();
                }
            }
        }
    }

    let otoateGeneration = 0;
    // おとあてゲーム開始
    function startOtoateGame() {
        const generation = ++otoateGeneration;
        const epoch = soundEpoch;
        initAudio();
        isOtoateMode = true;
        activeSongKey = 'free';
        currentSongIndex = 0;
        
        const songSelect = document.getElementById('xylo-song');
        if (songSelect) songSelect.value = 'free';

        const guideText = document.getElementById('xylo-guide-text');
        const otoateText = document.getElementById('xylo-otoate-text');
        if (guideText) guideText.classList.add('hidden');
        if (otoateText) otoateText.classList.remove('hidden');

        clearXyloHighlights();

        // ド・レ・ミ・ファ・ソ の中からランダム選択
        currentOtoateTargetNote = Math.floor(Math.random() * 5); 

        updateNavigator('momo', "おとあてゲーム スタート！ いまから ならすおとを あててみてね！");
        
        const targetNote = currentOtoateTargetNote;
        scheduleActivity(() => {
            if (generation !== otoateGeneration || epoch !== soundEpoch || !isOtoateMode) return;
            playMokkinNote(scaleFreqs[targetNote]);
        }, 1800);
    }

    function exitOtoateMode() {
        otoateGeneration++;
        isOtoateMode = false;
        const otoateText = document.getElementById('xylo-otoate-text');
        if (otoateText) otoateText.classList.add('hidden');
    }

    function startSongGuide() {
        exitOtoateMode();
        const select = document.getElementById('xylo-song');
        if (!select) return;
        activeSongKey = select.value;
        currentSongIndex = 0;

        const guideText = document.getElementById('xylo-guide-text');
        if (activeSongKey === 'free') {
            if (guideText) guideText.classList.add('hidden');
            updateNavigator('momo', "すきなように 鍵盤をたたいて、メロディを ならそう！");
            clearXyloHighlights();
        } else {
            if (guideText) guideText.classList.remove('hidden');
            updateNavigator('momo', "ひかる鍵盤を、じゅんばんに たたいてみてね！");
            updateSongGuideHighlight();
        }
    }

    function clearXyloHighlights() {
        for (let i = 0; i < 8; i++) {
            const key = document.getElementById(`key-${i}`);
            if (key) key.classList.remove('guide-active');
        }
    }

    function updateSongGuideHighlight() {
        clearXyloHighlights();
        if (activeSongKey === 'free') return;

        const song = songs[activeSongKey];
        const targetNote = song[currentSongIndex];
        
        const targetBtn = document.getElementById(`key-${targetNote}`);
        if (targetBtn) {
            targetBtn.classList.add('guide-active');
        }
    }


    // --- TAB 7: シールデコ台紙 & シールずかん 📖 ---
    const ALL_SEALS = ['🐶', '🐱', '🐼', '🐰', '🦁', '🐘', '🐸', '🍉', '🍓', '🍌', '🚗', '🚀', '⭐', '🌈', '🍦', '🎨', '👑', '🧸', '🍭', '🔔'];
    
    // シールずかんを開く
    function openStickerZukan() {
        initAudio();
        const grid = document.getElementById('zukan-grid');
        const missionContainer = document.getElementById('mission-list');
        if (!grid || !missionContainer) return;

        grid.innerHTML = '';
        missionContainer.innerHTML = '';

        // 全20シールの獲得状況を反映
        ALL_SEALS.forEach(emoji => {
            const item = document.createElement('div');
            const isOwned = myStickers.includes(emoji) || placedStickers.some(s => s.emoji === emoji);

            if (isOwned) {
                item.className = "aspect-square bg-slate-50 border-2 border-yellow-300 rounded-2xl flex items-center justify-center text-3xl shadow-sm transition-all hover:scale-110 active:scale-95 cursor-pointer";
                item.textContent = emoji;
                // タップするとそのなまえを喋る
                item.onclick = () => speakStickerName(emoji);
            } else {
                item.className = "aspect-square bg-slate-100 border-2 border-slate-200 rounded-2xl flex items-center justify-center text-3xl filter grayscale opacity-40";
                item.textContent = emoji;
            }
            grid.appendChild(item);
        });

        // がんばりミッション進捗レンダリング
        const mData = [
            { key: 'drawFirst', label: '🎨 おえかきを はじめてあそぶ', done: smileMissions.drawFirst },
            { key: 'matchPerfect', label: '🃏 えあわせを パーフェクトクリア', done: smileMissions.matchPerfect },
            { key: 'xyloFirst', label: '🎵 もっきんで 1きょく かんそう', done: smileMissions.xyloFirst },
            { key: 'count10', label: '🔢 かずかぞえを 10かい せいかい', done: smileMissions.count10 }
        ];

        mData.forEach(m => {
            const el = document.createElement('div');
            el.className = "flex justify-between items-center py-1 border-b border-indigo-100/50";
            
            const txt = document.createElement('span');
            txt.className = "font-bold text-slate-600";
            txt.textContent = m.label;

            const status = document.createElement('span');
            if (m.done) {
                status.className = "text-emerald-500 font-bold flex items-center gap-0.5";
                status.textContent = 'できた！';
            } else {
                status.className = "text-slate-400 font-bold";
                status.textContent = `まだだよ`;
            }

            el.appendChild(txt);
            el.appendChild(status);
            missionContainer.appendChild(el);
        });

        document.getElementById('modal-zukan').classList.remove('hidden');
    }

    function closeStickerZukan() {
        const modal = document.getElementById('modal-zukan');
        if (modal) modal.classList.add('hidden');
    }

    // 獲得済みシールのなまえおしゃべり対応
    const stickerNames = {
        '🐶': 'いぬ', '🐱': 'ねこ', '🐼': 'ぱんだ', '🐰': 'うさぎ', '🦁': 'らいおん', 
        '🐘': 'ぞう', '🐸': 'かえる', '🍉': 'すいか', '🍓': 'いちご', '🍌': 'ばなな', 
        '🚗': 'くるま', '🚀': 'ろけっと', '⭐': 'おほしさま', '🌈': 'にじ', '🍦': 'あいすくりーむ', 
        '🎨': 'ぱれっと', '👑': 'おうかん', '🧸': 'おもちゃのくまちゃん', '🍭': 'あめちゃん', '🔔': 'べる'
    };

    function speakStickerName(emoji) {
        const name = stickerNames[emoji] || 'ごほうびシール';
        speakText(`${name} のシール！`);
    }

    const bgStyles = {
        grass: "background: linear-gradient(to bottom, #d1fae5, #86efac)", // はらっぱ
        space: "background: linear-gradient(to bottom, #0f172a, #1e1b4b)", // 宇宙
        sea: "background: linear-gradient(to bottom, #e0f2fe, #bae6fd)" // 青い海
    };

    function setStickerBg(bgKey) {
        selectedBg = bgKey;
        const canvasEl = document.getElementById('sticker-canvas');
        if (canvasEl) {
            canvasEl.className = `relative w-full h-[240px] md:h-[300px] border-4 border-dashed border-slate-200 rounded-2xl overflow-hidden transition-all duration-500`;
            canvasEl.style = bgStyles[bgKey];
        }
        saveStickers();
        updateNavigator('momo', "新しいだいしだ！お気に入りのシールをはろう！");
    }

    function loadStickerCanvas() {
        setStickerBg(selectedBg);
        renderPlacedStickers();
        updateStickerUI();
        
        // 新着バッジを消去
        const badge = document.getElementById('badge-new');
        if (badge) badge.classList.add('hidden');
    }

    // シールを貼る
    function placeStickerOnCanvas(emoji, poolIndex) {
        initAudio();

        // 手持ちプールから消費
        myStickers.splice(poolIndex, 1);
        
        // 中央付近に配置
        const newSticker = {
            id: 'stick_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            emoji: emoji,
            x: 45 + Math.random() * 10, // パーセント表記
            y: 40 + Math.random() * 10
        };

        placedStickers.push(newSticker);
        synthSound('stamp');
        saveStickers();
        renderPlacedStickers();
    }

    function renderPlacedStickers() {
        const canvasEl = document.getElementById('sticker-canvas');
        if (!canvasEl) return;
        
        // 元からあるデコ要素（シールのみ）をすべてクリアして再配置
        canvasEl.querySelectorAll('.sticker-item').forEach(el => el.remove());

        placedStickers.forEach(sticker => {
            const div = document.createElement('div');
            div.className = "sticker-item absolute text-5xl cursor-pointer select-none active:scale-110 transition-transform active:z-50 touch-none";
            div.textContent = sticker.emoji;
            div.style.left = `${sticker.x}%`;
            div.style.top = `${sticker.y}%`;
            div.id = sticker.id;

            // ドラッグ処理 (マルチタッチ・レスポンシブ頑健 ＆ 境界はみ出し紛失バグ防止)
            let startX, startY;
            let startLeft, startTop;

            function onDragStart(e) {
                initAudio();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;

                startX = clientX;
                startY = clientY;
                
                // 現在の%を基準値にする
                startLeft = parseFloat(div.style.left) || 0;
                startTop = parseFloat(div.style.top) || 0;

                window.addEventListener(e.touches ? 'touchmove' : 'mousemove', onDragMove, { passive: false });
                window.addEventListener(e.touches ? 'touchend' : 'mouseup', onDragEnd);
            }

            // px差分を台紙サイズ基準の％に変換して加算
            function onDragMove(e) {
                if (e.cancelable) e.preventDefault();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;

                const deltaX = clientX - startX;
                const deltaY = clientY - startY;

                const parentRect = canvasEl.getBoundingClientRect();

                const pctX = (deltaX / parentRect.width) * 100;
                const pctY = (deltaY / parentRect.height) * 100;

                let newLeft = startLeft + pctX;
                let newTop = startTop + pctY;

                // 【シール紛失防止クランプ】シールの幅（実寸約48px）を％換算して境界を安全制限
                const limitWidthPct = (48 / parentRect.width) * 100;
                const limitHeightPct = (48 / parentRect.height) * 100;

                const maxLeft = 100 - limitWidthPct;
                const maxTop = 100 - limitHeightPct;

                if (newLeft < 0) newLeft = 0;
                if (newLeft > maxLeft) newLeft = maxLeft;
                if (newTop < 0) newTop = 0;
                if (newTop > maxTop) newTop = maxTop;

                div.style.left = `${newLeft}%`;
                div.style.top = `${newTop}%`;
            }

            function onDragEnd() {
                window.removeEventListener('mousemove', onDragMove);
                window.removeEventListener('mouseup', onDragEnd);
                window.removeEventListener('touchmove', onDragMove);
                window.removeEventListener('touchend', onDragEnd);

                // 最終クランプ位置を保存
                sticker.x = parseFloat(div.style.left) || 0;
                sticker.y = parseFloat(div.style.top) || 0;
                saveStickers();
            }

            div.addEventListener('mousedown', onDragStart);
            div.addEventListener('touchstart', onDragStart, { passive: true });

            // ダブルクリックでシール剥がし
            let lastTap = 0;
            function handleDoubleTap() {
                const now = Date.now();
                if (now - lastTap < 300) {
                    // 剥がしてプールに戻す
                    peelSticker(sticker.id, sticker.emoji);
                }
                lastTap = now;
            }

            const peelBtn = document.createElement('button');
            peelBtn.type = 'button';
            peelBtn.className = 'sticker-peel-btn';
            peelBtn.textContent = 'はがす';
            peelBtn.setAttribute('aria-label', 'シールをはがす');
            peelBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                peelSticker(sticker.id, sticker.emoji);
            });
            div.addEventListener('click', handleDoubleTap);
            div.appendChild(peelBtn);

            canvasEl.appendChild(div);
        });
    }

    function peelSticker(stickerId, emoji) {
        placedStickers = placedStickers.filter((item) => item.id !== stickerId);
        myStickers.push(emoji);
        synthSound('stamp');
        saveStickers();
        renderPlacedStickers();
    }

    function clearStickersFromCanvas() {
        placedStickers.forEach(s => {
            myStickers.push(s.emoji);
        });
        placedStickers = [];
        saveStickers();
        renderPlacedStickers();
        updateNavigator('momo', "シールを ぜんぶはがして、きれいにしたよ！");
    }


    // --- アチーブメント/ミッション実績システム ---
    let missionRewardPending = false;
    function checkAndTriggerMissions() {
        if (missionRewardPending) return;
        const completed = [];
        if (!smileMissions.drawFirst && smileStats.plays.draw > 0) completed.push('drawFirst');
        if (!smileMissions.count10 && Number(smileStats.count_corrects || 0) >= 10) completed.push('count10');
        if (!completed.length) return;
        missionRewardPending = true;
        scheduleActivity(() => {
            missionRewardPending = false;
            completed.forEach(key => { smileMissions[key] = true; });
            saveSettings();
            updateNavigator('momo', "おめでとう！がんばりミッションをクリアしたよ！シールをプレゼント！🌟");
            grantRewardSticker();
        }, 1000);
    }


    // --- がんばり証明書（SVG証明書ローカル保存） ---
    function exportCertificateSVG() {
        try {
            initAudio();
            const kidsName = escapeXml(smileKidsName);
            const rawKidsName = String(smileKidsName || 'がんばったおともだち').slice(0, 30);
            const correctCount = smileStats.correct_answers;
            const stickersCount = smileStats.total_stickers;

            // SVGの構造定義
            const svgContent = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560" width="100%" height="100%">
                <rect width="100%" height="100%" fill="#FFFDF4"/>
                <rect x="25" y="25" width="750" height="510" fill="none" stroke="#FDBA74" stroke-width="8" rx="20"/>
                <rect x="40" y="40" width="720" height="480" fill="none" stroke="#E2E8F0" stroke-dasharray="8,8" stroke-width="4" rx="12"/>

                <text x="60" y="90" font-size="40">⭐</text>
                <text x="700" y="90" font-size="40">⭐</text>
                <text x="60" y="480" font-size="40">⭐</text>
                <text x="700" y="480" font-size="40">⭐</text>

                <text x="400" y="110" font-family="'Kiwi Maru', sans-serif" font-size="36" font-weight="bold" fill="#F97316" text-anchor="middle">がんばりしょうじょう</text>
                
                <text x="400" y="200" font-family="'Kiwi Maru', sans-serif" font-size="32" font-weight="black" fill="#1E293B" text-anchor="middle">${kidsName} どの</text>

                <text x="400" y="270" font-family="'Kiwi Maru', sans-serif" font-size="18" fill="#475569" text-anchor="middle">キッズ・スマイル・ランドで</text>
                <text x="400" y="310" font-family="'Kiwi Maru', sans-serif" font-size="18" fill="#475569" text-anchor="middle">あそんだ きろく</text>
                <text x="400" y="350" font-family="'Kiwi Maru', sans-serif" font-size="18" fill="#475569" text-anchor="middle">クイズ正解とシールの数を残します</text>

                <rect x="180" y="380" width="440" height="70" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2" rx="10"/>
                <text x="210" y="422" font-family="'Kiwi Maru', sans-serif" font-size="16" fill="#64748B">💮 クイズ正解：${correctCount} 回</text>
                <text x="440" y="422" font-family="'Kiwi Maru', sans-serif" font-size="16" fill="#64748B">✨ シール獲得：${stickersCount} こ</text>

                <text x="400" y="500" font-family="'Kiwi Maru', sans-serif" font-size="14" fill="#94A3B8" text-anchor="middle">うさぎのももちゃん ＆ らいおんのレオ ＆ ぱんだのパン より</text>
            </svg>
            `;

            // Blobデータを作成
            const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `がんばりしょうじょう_${rawKidsName.replace(/[\\/:*?"<>|]/g, '_')}.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            synthSound('correct');
            updateNavigator('momo', "おうちのプリンターでいんさつしてかざってね！たいへんよくがんばりました！🏆");
        } catch (e) {
            console.error("Failed to generate Certificate SVG:", e);
        }
    }

    function saveKidsName() {
        const input = document.getElementById('parent-kids-name');
        if (input) {
            smileKidsName = (input.value || 'がんばったおともだち').slice(0, 30);
            saveSettings();
        }
    }


    // --- あんしんタイマー管理システム ---
    let timerInterval = null;
    let timerSecondsLeft = 0;

    function initAppTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        const badge = document.getElementById('timer-badge');
        if (smileTimerLimit > 0) {
            timerSecondsLeft = smileTimerLimit * 60;
            if (badge) badge.classList.remove('hidden');
            updateTimerDisplay();

            timerInterval = setInterval(() => {
                timerSecondsLeft--;
                updateTimerDisplay();

                if (timerSecondsLeft <= 0) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    triggerSleepMode();
                }
            }, 1000);
        } else {
            if (badge) badge.classList.add('hidden');
        }
    }

    function updateTimerDisplay() {
        const min = Math.floor(timerSecondsLeft / 60);
        const sec = timerSecondsLeft % 60;
        const displayStr = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        const displayEl = document.getElementById('timer-countdown');
        if (displayEl) displayEl.textContent = displayStr;
    }

    const sleepReasonsTexts = {
        eye: {
            title: "おめめを やすめようね 👁️",
            body: "たくさん あそんだから、すこし やすもうね。<br>ももちゃんたちと『おめめピカピカ』おまじないをしよう！"
        },
        meal: {
            title: "ごはんの じかんだよ 🍙",
            body: "ももちゃんたちも おなかがすいちゃった！<br>ごはんをたべて、またあとで あそぼうね！"
        },
        sleep: {
            title: "ねんねの じかんだよ 😴",
            body: "おそらが くらいよ。みんなもおやすみのじかんだね。<br>またあした、げんきにあそぼうね！"
        }
    };

    function triggerSleepMode() {
        cancelActivityTimers();
        countRoundGeneration++;
        quizRoundGeneration++;
        const config = sleepReasonsTexts[smileSleepReason] || sleepReasonsTexts.eye;
        const titleEl = document.getElementById('sleep-title');
        const bodyEl = document.getElementById('sleep-body');
        
        if (titleEl) titleEl.textContent = config.title;
        if (bodyEl) bodyEl.innerHTML = config.body;

        const sleepModal = document.getElementById('modal-sleep');
        if (sleepModal) sleepModal.classList.remove('hidden');
        
        speakText(config.title.replace(/[👁️🍙😴]/g, '') + "。" + config.body.replace(/<br>/g, ''));
    }

    let isSleepUnlockFlow = false;
    function openParentModalFromSleep() {
        isSleepUnlockFlow = true;
        openParentModal();
    }


    // --- 保護者（みまもり）ロック画面 ＆ 入力正規化 ---
    let parentAuthAnswer = 0;

    function normalizeNum(str) {
        if (!str) return "";
        return str.replace(/[０-９]/g, function(s) {
            return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        }).replace(/\s+/g, '').trim();
    }

    function openParentModal() {
        const num1 = Math.floor(Math.random() * 8) + 2;
        const num2 = Math.floor(Math.random() * 8) + 2;
        parentAuthAnswer = num1 + num2;

        const quizText = document.getElementById('parent-quiz-text');
        if (quizText) quizText.textContent = `${num1} + ${num2} = ?`;
        const answerInput = document.getElementById('parent-answer');
        if (answerInput) answerInput.value = '';
        const modal = document.getElementById('modal-parent-auth');
        if (modal) modal.classList.remove('hidden');

        speakText("おとなの人、たしざんを おねがいします！");
    }

    function closeParentModal() {
        const modal = document.getElementById('modal-parent-auth');
        if (modal) modal.classList.add('hidden');
        isSleepUnlockFlow = false;
    }

    function submitParentAuth() {
        const inputEl = document.getElementById('parent-answer');
        const rawVal = inputEl ? inputEl.value : "";
        const normalized = normalizeNum(rawVal);
        const val = /^\+?\d+$/.test(normalized) ? Number(normalized) : NaN;

        if (!isNaN(val) && val === parentAuthAnswer) {
            const unlockSleep = isSleepUnlockFlow;
            closeParentModal();
            if (unlockSleep) {
                const sleepModal = document.getElementById('modal-sleep');
                if (sleepModal) sleepModal.classList.add('hidden');
                isSleepUnlockFlow = false;
                initAppTimer(); // タイマー再起動
                // Sleep cancels pending next-question jobs; start one fresh round.
                if (currentTab === 'count') startCountQuiz();
                else if (currentTab === 'quiz') startQuizGame();
                else if (currentTab === 'match') initMatchGame();
                updateNavigator('momo', "おかえりなさい！また いっしょに あそおうね！");
            } else {
                const settingsModal = document.getElementById('modal-parent-settings');
                if (settingsModal) settingsModal.classList.remove('hidden');
                loadSpeechVoices(); // ボイス再ロード
                updateStatsUI(); // 統計情報を反映
            }
        } else {
            synthSound('incorrect');
            speakText("あれれ？まちがえちゃった！おとなのひと、がんばって！");
        }
    }

    function closeParentSettings() {
        const modal = document.getElementById('modal-parent-settings');
        if (modal) modal.classList.add('hidden');
    }


    // --- みまもり設定内：タブ切り替え ＆ 設定値連動 ---
    function switchSettingsTab(tabKey) {
        initAudio();
        document.getElementById('set-content-sound').classList.add('hidden');
        document.getElementById('set-content-study').classList.add('hidden');
        document.getElementById('set-content-report').classList.add('hidden');

        document.getElementById('set-tab-sound').className = "flex-1 py-2 text-center border-b-2 border-transparent text-slate-500 hover:text-slate-800";
        document.getElementById('set-tab-study').className = "flex-1 py-2 text-center border-b-2 border-transparent text-slate-500 hover:text-slate-800";
        document.getElementById('set-tab-report').className = "flex-1 py-2 text-center border-b-2 border-transparent text-slate-500 hover:text-slate-800";

        // アクティブ化
        const targetContent = document.getElementById(`set-content-${tabKey}`);
        if (targetContent) targetContent.classList.remove('hidden');
        const targetTab = document.getElementById(`set-tab-${tabKey}`);
        if (targetTab) targetTab.className = "flex-1 py-2 text-center border-b-2 border-blue-500 text-blue-600";
    }

    function updateAudioLevels() {
        const voiceVolInput = document.getElementById('voice-volume-range');
        const synthVolInput = document.getElementById('synth-volume-range');
        
        const previousVoiceVolume = smileVoiceVolume;
        if (voiceVolInput) smileVoiceVolume = parseFloat(voiceVolInput.value);
        if (synthVolInput) smileSynthVolume = parseFloat(synthVolInput.value);
        if (previousVoiceVolume > 0 && smileVoiceVolume === 0 && window.speechSynthesis) {
            try {
                window.speechSynthesis.cancel();
            } catch (error) {
                console.warn('Speech cancellation failed:', error);
            }
        }
        saveSettings();
    }

    function changeStudyLevelSetting() {
        const select = document.getElementById('study-level-select');
        if (select) smileLevel = select.value;
        saveSettings();
        
        if (currentTab === 'match') {
            initMatchGame();
        } else if (currentTab === 'count') {
            startCountQuiz();
        }
    }

    function changeTimerLimitSetting() {
        const select = document.getElementById('timer-limit-select');
        if (select) smileTimerLimit = parseInt(select.value);
        saveSettings();
        initAppTimer();
    }

    function changeSleepReasonSetting() {
        const select = document.getElementById('sleep-reason-select');
        if (select) smileSleepReason = select.value;
        saveSettings();
    }

    function updateStatsUI() {
        const correctEl = document.getElementById('stat-correct');
        const stickersEl = document.getElementById('stat-stickers');
        if (correctEl) correctEl.textContent = smileStats.correct_answers;
        if (stickersEl) stickersEl.textContent = smileStats.total_stickers;

        const nameInput = document.getElementById('parent-kids-name');
        if (nameInput) nameInput.value = smileKidsName;

        const listContainer = document.getElementById('stat-play-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        const gameNames = {
            draw: '🎨 おえかき',
            hiragana: '🍎 おしゃべり',
            quiz: '🦁 なきごえ',
            count: '🔢 かずかぞえ',
            match: '🃏 えあわせ',
            xylophone: '🎵 もっきん',
            sticker: '🌟 シールデコ'
        };

        Object.keys(smileStats.plays).forEach(key => {
            const row = document.createElement('div');
            row.className = "flex justify-between items-center py-1 border-b border-slate-100 last:border-none";
            
            const label = document.createElement('span');
            label.className = "text-slate-600 font-bold";
            label.textContent = gameNames[key] || key;

            const val = document.createElement('span');
            val.className = "text-blue-500 font-black";
            val.textContent = `${smileStats.plays[key]} かい`;

            row.appendChild(label);
            row.appendChild(val);
            listContainer.appendChild(row);
        });
    }

    // --- カスタム確認ダイアログ (ブラウザのconfirmを置き換え) ---
    let confirmResolve = null;

    function showConfirm(title, body) {
        return new Promise((resolve) => {
            confirmResolve = resolve;
            const modal = document.getElementById('modal-confirm');
            const titleEl = document.getElementById('confirm-title');
            const bodyEl = document.getElementById('confirm-body');
            if (titleEl) titleEl.textContent = title;
            if (bodyEl) bodyEl.textContent = body;
            if (modal) modal.classList.remove('hidden');
        });
    }

    function handleConfirmResult(result) {
        const modal = document.getElementById('modal-confirm');
        if (modal) modal.classList.add('hidden');
        if (confirmResolve) {
            confirmResolve(result);
            confirmResolve = null;
        }
    }

    async function resetStats() {
        const confirmed = await showConfirm(
            'きろくをリセットしますか？',
            'がんばりレポートの記録がすべて消えます。この操作は元に戻せません。'
        );
        if (confirmed) {
            smileStats = {
                plays: { draw: 0, hiragana: 0, quiz: 0, count: 0, match: 0, xylophone: 0, sticker: 0 },
                correct_answers: 0,
                count_corrects: 0,
                total_stickers: 0
            };
            saveSettings();
            updateStatsUI();
        }
    }

    async function resetAppAll() {
        const confirmed = await showConfirm(
            'アプリを初期化しますか？',
            'シールや設定がすべて消えて最初からになります。この操作は元に戻せません。'
        );
        if (confirmed) {
            try {
                // 同一ドメインの他アプリデータを保護するため、
                // smile_ プレフィックスが付いたキーのみを個別削除
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('smile_')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
                storageReadBlocked = false;
            } catch (e) {
                console.error("Failed to clear app localStorage:", e);
                showToast("この端末のデータを初期化できませんでした。");
                return;
            }
            myStickers = [];
            placedStickers = [];
            selectedBg = 'grass';
            smileLevel = 'easy';
            smileTimerLimit = 0;
            smileVoiceVolume = 1.0;
            smileSynthVolume = 1.0;
            smileSleepReason = 'eye';
            smileKidsName = 'がんばったおともだち';
            smileStats = {
                plays: { draw: 0, hiragana: 0, quiz: 0, count: 0, match: 0, xylophone: 0, sticker: 0 },
                correct_answers: 0,
                count_corrects: 0,
                total_stickers: 0
            };
            smileMissions = {
                drawFirst: false,
                matchPerfect: false,
                xyloFirst: false,
                count10: false
            };
            saveStickers();
            saveSettings();
            closeParentSettings();
            location.reload();
        }
    }


    // --- 🌐 動的イベントリスナー紐付けシステム ---
    function bindUIEvents() {
        bindSoundControls();
        // おうちにもどるボタン
        const btnBackHome = document.getElementById('btn-back-home');
        if (btnBackHome) {
            btnBackHome.addEventListener('click', () => {
                switchTab('home');
            });
        }

        // ホーム画面のなかまたちおしゃべり
        const homeCharMomo = document.getElementById('home-char-momo');
        if (homeCharMomo) {
            homeCharMomo.addEventListener('click', () => {
                speakHomeCharacter('momo');
            });
        }
        const homeCharLeo = document.getElementById('home-char-leo');
        if (homeCharLeo) {
            homeCharLeo.addEventListener('click', () => {
                speakHomeCharacter('leo');
            });
        }
        const homeCharPan = document.getElementById('home-char-pan');
        if (homeCharPan) {
            homeCharPan.addEventListener('click', () => {
                speakHomeCharacter('pan');
            });
        }

        // 1. タブ切り替え・下部ナビゲーション
        document.querySelectorAll('[data-tab-target]').forEach(elem => {
            elem.addEventListener('click', (e) => {
                const tabId = e.currentTarget.getAttribute('data-tab-target');
                switchTab(tabId);
            });
        });

        // 2. おとなロック（ギア）ボタン
        const openParentModalBtn = document.getElementById('btn-open-parent-modal');
        if (openParentModalBtn) {
            openParentModalBtn.addEventListener('click', openParentModal);
        }

        // 3. ひらがなサブタブ
        document.querySelectorAll('[data-hiragana-type]').forEach(elem => {
            elem.addEventListener('click', (e) => {
                const type = e.currentTarget.getAttribute('data-hiragana-type');
                setHiraganaType(type);
            });
        });

        // 4. おえかきカラーパレット
        document.querySelectorAll('[data-draw-color]').forEach(elem => {
            elem.addEventListener('click', (e) => {
                const color = e.currentTarget.getAttribute('data-draw-color');
                setDrawColor(color, e.currentTarget);
            });
        });

        // 5. おえかきペンの太さ
        document.querySelectorAll('[data-draw-pen-width]').forEach(elem => {
            elem.addEventListener('click', (e) => {
                const widthAttr = e.currentTarget.getAttribute('data-draw-pen-width');
                const width = widthAttr === 'auto' ? 'auto' : parseInt(widthAttr);
                setPenWidth(width, e.currentTarget);
            });
        });

        // 6. したえテンプレート選択
        const drawTemplateSelect = document.getElementById('draw-template');
        if (drawTemplateSelect) {
            drawTemplateSelect.addEventListener('change', loadDrawTemplate);
        }

        // 7. キャンバスクリア
        const clearCanvasBtn = document.getElementById('btn-clear-canvas');
        if (clearCanvasBtn) {
            clearCanvasBtn.addEventListener('click', () => clearCanvas(false));
        }

        // 8. なきごえスピーカーボタン
        const playQuizVoiceBtn = document.getElementById('btn-play-quiz-voice');
        if (playQuizVoiceBtn) {
            playQuizVoiceBtn.addEventListener('click', playQuizVoice);
        }

        // 9. えあわせやりなおすボタン
        const restartMatchBtn = document.getElementById('btn-restart-match');
        if (restartMatchBtn) {
            restartMatchBtn.addEventListener('click', initMatchGame);
        }

        // 10. もっきん演奏ガイド選択
        const xyloSongSelect = document.getElementById('xylo-song');
        if (xyloSongSelect) {
            xyloSongSelect.addEventListener('change', startSongGuide);
        }

        // 11. おとあてゲーム開始ボタン
        const btnOtoate = document.getElementById('btn-otoate');
        if (btnOtoate) {
            btnOtoate.addEventListener('click', startOtoateGame);
        }

        // 12. もっきん鍵盤
        document.querySelectorAll('.xylo-key').forEach(elem => {
            elem.addEventListener('click', (e) => {
                const keyIndex = parseInt(e.currentTarget.getAttribute('data-key-index'));
                tapXylo(keyIndex);
            });
        });

        // 13. シールデコ台紙背景選択
        document.querySelectorAll('[data-sticker-bg]').forEach(elem => {
            elem.addEventListener('click', (e) => {
                const bg = e.currentTarget.getAttribute('data-sticker-bg');
                setStickerBg(bg);
            });
        });

        // 14. シールずかんオープン
        const btnOpenZukan = document.getElementById('btn-open-zukan');
        if (btnOpenZukan) {
            btnOpenZukan.addEventListener('click', openStickerZukan);
        }

        // 15. シールをぜんぶはがす
        const btnClearStickers = document.getElementById('btn-clear-stickers');
        if (btnClearStickers) {
            btnClearStickers.addEventListener('click', clearStickersFromCanvas);
        }
        const btnPeelSticker = document.getElementById('btn-peel-sticker');
        if (btnPeelSticker) {
            btnPeelSticker.addEventListener('click', () => {
                const last = placedStickers[placedStickers.length - 1];
                if (!last) return;
                peelSticker(last.id, last.emoji);
            });
        }

        // 16. モーダル操作：新しいシール獲得ありがとうボタン
        const btnCloseStickerModal = document.getElementById('btn-close-sticker-modal');
        if (btnCloseStickerModal) {
            btnCloseStickerModal.addEventListener('pointerdown', () => { rewardPointerToken = pendingNextActivity; });
            btnCloseStickerModal.addEventListener('pointercancel', () => { rewardPointerToken = null; });
            btnCloseStickerModal.addEventListener('click', closeStickerModal);
        }

        // 17. モーダル操作：ずかん閉じる
        const btnCloseZukan = document.getElementById('btn-close-zukan');
        if (btnCloseZukan) {
            btnCloseZukan.addEventListener('click', closeStickerZukan);
        }

        // 18. モーダル操作：おやすみロック解除ボタン
        const btnUnlockSleepParent = document.getElementById('btn-unlock-sleep-parent');
        if (btnUnlockSleepParent) {
            btnUnlockSleepParent.addEventListener('click', openParentModalFromSleep);
        }

        // 19. モーダル操作：おとなログインやめる
        const btnCloseParentModal = document.getElementById('btn-close-parent-modal');
        if (btnCloseParentModal) {
            btnCloseParentModal.addEventListener('click', closeParentModal);
        }

        // 20. モーダル操作：おとなログインすすむ
        const btnSubmitParentAuth = document.getElementById('btn-submit-parent-auth');
        if (btnSubmitParentAuth) {
            btnSubmitParentAuth.addEventListener('click', submitParentAuth);
        }

        // 21. モーダル操作：みまもり設定閉じる（ヘッダー）
        const btnCloseParentSettings = document.getElementById('btn-close-parent-settings');
        if (btnCloseParentSettings) {
            btnCloseParentSettings.addEventListener('click', closeParentSettings);
        }

        // 22. みまもり設定タブ切り替え
        document.querySelectorAll('[data-settings-tab]').forEach(elem => {
            elem.addEventListener('click', (e) => {
                const tab = e.currentTarget.getAttribute('data-settings-tab');
                switchSettingsTab(tab);
            });
        });

        // 23. みまもり設定：おしゃべりこえ選択
        const voiceSelect = document.getElementById('voice-select');
        if (voiceSelect) {
            voiceSelect.addEventListener('change', changeVoiceSetting);
        }

        // 24. みまもり設定：おしゃべり音量
        const voiceVolumeRange = document.getElementById('voice-volume-range');
        if (voiceVolumeRange) {
            voiceVolumeRange.addEventListener('change', updateAudioLevels);
            voiceVolumeRange.addEventListener('input', updateAudioLevels);
        }

        // 25. みまもり設定：効果音音量
        const synthVolumeRange = document.getElementById('synth-volume-range');
        if (synthVolumeRange) {
            synthVolumeRange.addEventListener('change', updateAudioLevels);
            synthVolumeRange.addEventListener('input', updateAudioLevels);
        }

        // 26. みまもり設定：がくしゅうレベル
        const studyLevelSelect = document.getElementById('study-level-select');
        if (studyLevelSelect) {
            studyLevelSelect.addEventListener('change', changeStudyLevelSetting);
        }

        // 27. みまもり設定：あんしんタイマー
        const timerLimitSelect = document.getElementById('timer-limit-select');
        if (timerLimitSelect) {
            timerLimitSelect.addEventListener('change', changeTimerLimitSetting);
        }

        // 28. みまもり設定：おやすみ理由
        const sleepReasonSelect = document.getElementById('sleep-reason-select');
        if (sleepReasonSelect) {
            sleepReasonSelect.addEventListener('change', changeSleepReasonSetting);
        }

        // 29. みまもり設定：おともだちのおなまえ
        const parentKidsName = document.getElementById('parent-kids-name');
        if (parentKidsName) {
            parentKidsName.addEventListener('change', saveKidsName);
        }

        // 30. みまもり設定：しょうじょう保存
        const btnExportCertificate = document.getElementById('btn-export-certificate');
        if (btnExportCertificate) {
            btnExportCertificate.addEventListener('click', exportCertificateSVG);
        }

        // 31. みまもり設定：記録リセット
        const btnResetStats = document.getElementById('btn-reset-stats');
        if (btnResetStats) {
            btnResetStats.addEventListener('click', resetStats);
        }

        // 32. みまもり設定：アプリ初期化
        const btnResetAppAll = document.getElementById('btn-reset-app-all');
        if (btnResetAppAll) {
            btnResetAppAll.addEventListener('click', resetAppAll);
        }

        // 33. みまもり設定：閉じる（ボトム）
        const btnCloseParentSettingsBottom = document.getElementById('btn-close-parent-settings-bottom');
        if (btnCloseParentSettingsBottom) {
            btnCloseParentSettingsBottom.addEventListener('click', closeParentSettings);
        }

        // 34. カスタム確認ダイアログ
        const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
        if (btnConfirmCancel) {
            btnConfirmCancel.addEventListener('click', () => handleConfirmResult(false));
        }
        const btnConfirmOk = document.getElementById('btn-confirm-ok');
        if (btnConfirmOk) {
            btnConfirmOk.addEventListener('click', () => handleConfirmResult(true));
        }
    }


    // --- アプリの初期起動処理 ---
    window.addEventListener('DOMContentLoaded', () => {
        try {
            // ローカル保存データからコントロール初期値を復元
            const studySelect = document.getElementById('study-level-select');
            const timerSelect = document.getElementById('timer-limit-select');
            const voiceVolRange = document.getElementById('voice-volume-range');
            const synthVolRange = document.getElementById('synth-volume-range');
            const reasonSelect = document.getElementById('sleep-reason-select');

            if (studySelect) studySelect.value = smileLevel;
            if (timerSelect) timerSelect.value = smileTimerLimit;
            if (voiceVolRange) voiceVolRange.value = smileVoiceVolume;
            if (synthVolRange) synthVolRange.value = smileSynthVolume;
            if (reasonSelect) reasonSelect.value = smileSleepReason;

            // イベントバインドの実行
            bindUIEvents();

            // 各種初期化
            renderHiragana();
            updateStickerUI();
            initAppTimer();
            
            // 最初に音声エンジンを読み込む
            if (window.speechSynthesis) {
                loadSpeechVoices();
            }

            // 最後にホーム画面を表示
            switchTab('home', { silent: true });

            // iOS対応タッチインターフェースオーディオ有効化
            document.body.addEventListener('click', function() {
                initAudio();
            }, { once: true });
            document.body.addEventListener('touchstart', function() {
                initAudio();
            }, { once: true });
        } catch (e) {
            console.error("Critical error in DOMContentLoaded initialization:", e);
        }
    });

})();
