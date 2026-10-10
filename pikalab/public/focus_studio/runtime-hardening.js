(() => {
    'use strict';

    if (typeof app !== 'object' || !app) return;

    const TIMER_TICK_INTERVAL_MS = 250;
    const AUDIO_TRANSITION_GRACE_MS = 1200;
    const TIMER_MODES = new Set(['focus', 'break']);

    let timerTickerId = null;

    const clearTimerTicker = () => {
        if (timerTickerId !== null) {
            clearInterval(timerTickerId);
            timerTickerId = null;
        }
        app.timerInterval = null;
    };

    // 入力側のdirty判定を共有し、別タブの新しい入力を古い値で上書きしない。
    const flushTask = () => app.saveTaskImmediately();

    const waitForAudioBriefly = async () => {
        let timeoutId = null;
        try {
            return await Promise.race([
                app.ensureAudio(),
                new Promise((resolve) => {
                    timeoutId = setTimeout(() => resolve(false), AUDIO_TRANSITION_GRACE_MS);
                })
            ]);
        } catch (error) {
            console.error('Audio preparation failed:', error);
            return false;
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    };

    const syncTimerFromClock = (completeWhenElapsed = true) => {
        if (!app.isRunning || !Number.isFinite(app.__timerDeadlineMs)) return false;

        // 表示だけを秒へ丸め、再開に用いる残り時間はミリ秒のまま保つ。
        app.__timerRemainingMs = Math.max(0, app.__timerDeadlineMs - Date.now());
        const remainingSeconds = Math.ceil(app.__timerRemainingMs / 1000);

        if (remainingSeconds !== app.timeLeft) {
            app.timeLeft = remainingSeconds;
            app.updateDisplay();
        }

        if (remainingSeconds === 0 && completeWhenElapsed) {
            clearTimerTicker();
            app.isRunning = false;
            const completedAt = app.__timerDeadlineMs;
            app.__timerDeadlineMs = null;
            void app.completeTimer(completedAt);
            return true;
        }
        return remainingSeconds === 0;
    };

    const startTimerTicker = () => {
        clearTimerTicker();
        if (!app.isRunning || app.__pageIsHiding || !Number.isFinite(app.__timerDeadlineMs)) return;
        timerTickerId = setInterval(() => syncTimerFromClock(true), TIMER_TICK_INTERVAL_MS);
        app.timerInterval = timerTickerId;
    };

    const syncDrawerAccessibility = () => {
        const button = app.dom?.openSoundDrawerBtn;
        const drawer = app.dom?.soundDrawer;
        if (!button || !drawer) return;
        button.setAttribute('aria-controls', drawer.id || 'sound-drawer');
        button.setAttribute('aria-expanded', String(!drawer.classList.contains('translate-x-full')));
    };

    const syncSoundAccessibility = (soundId) => {
        const soundData = app.soundsData?.find((sound) => sound.id === soundId);
        if (!soundData) return;
        const button = document.getElementById(`btn-${soundId}`);
        const slider = document.getElementById(`vol-${soundId}`);
        if (button) {
            button.setAttribute('aria-label', soundData.name);
            button.setAttribute('aria-pressed', String(Boolean(app.sounds[soundId])));
        }
        if (slider) slider.setAttribute('aria-label', soundData.name);
    };

    app.__timerDeadlineMs = null;
    app.__timerRemainingMs = null;
    app.__chimeDeadlineMs = null;
    app.__timerCompletionPromise = null;
    app.__timerMode = 'focus';
    app.__pageIsHiding = false;
    app.__chimeTransitioning = false;
    app.__focusRuntimeHardeningInstalled = true;

    const originalCancelPendingBreakTransition = app.cancelPendingBreakTransition.bind(app);
    app.cancelPendingBreakTransition = function hardenedCancelPendingBreakTransition() {
        this.__chimeTransitioning = false;
        this.__chimeDeadlineMs = null;
        return originalCancelPendingBreakTransition();
    };

    const originalRegisterServiceWorker = app.registerServiceWorker.bind(app);
    app.registerServiceWorker = function hardenedRegisterServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.register('./sw-hardened.js', { scope: './', updateViaCache: 'none' })
            .then((registration) => registration.update().catch(() => undefined))
            .catch((error) => {
                console.error('Service Worker registration failed:', error);
                originalRegisterServiceWorker();
            });
    };

    // 元のイベント登録を一時的に差し替えない。初期化前の明示フラグで担当を分ける。
    const originalSetTimer = app.setTimer.bind(app);
    app.setTimer = function hardenedSetTimer(minutes, mode) {
        if (!TIMER_MODES.has(mode)) return;
        if (mode === 'focus') this.__timerMode = 'focus';
        return originalSetTimer(minutes, mode);
    };

    app.resetTimerState = function hardenedResetTimerState(minutes, mode = null) {
        const timerMode = TIMER_MODES.has(mode) ? mode : this.__timerMode;
        const safeMinutes = this.getValidatedMinutes(minutes, timerMode);
        clearTimerTicker();
        this.cancelPendingBreakTransition();
        this.isRunning = false;
        this.__timerDeadlineMs = null;
        this.__timerRemainingMs = safeMinutes * 60 * 1000;
        this.__timerCompletionPromise = null;
        this.__timerMode = timerMode;
        if (this.dom?.playIcon) this.dom.playIcon.innerText = 'play_arrow';
        this.timeLeft = safeMinutes * 60;
        this.totalTime = this.timeLeft;
        this.updateDisplay();
    };

    const originalStartBreakMode = app.startBreakMode.bind(app);
    app.startBreakMode = function hardenedStartBreakMode(startedAt = Date.now()) {
        this.__timerMode = 'break';
        this.__chimeTransitioning = false;
        this.__chimeDeadlineMs = null;
        this.__timerRemainingMs = this.currentBreakTime * 60 * 1000;
        originalStartBreakMode();
        // スリープ中にチャイムが終わった場合も、休憩は予定時刻から計算する。
        if (this.isRunning) {
            this.__timerDeadlineMs = startedAt + this.totalTime * 1000;
            syncTimerFromClock(true);
            startTimerTicker();
        }
    };

    const finishChimeIfElapsed = () => {
        if (!Number.isFinite(app.__chimeDeadlineMs) || Date.now() < app.__chimeDeadlineMs) return;
        const startedAt = app.__chimeDeadlineMs;
        app.cancelPendingBreakTransition();
        app.startBreakMode(startedAt);
    };

    const scheduleChimeCompletion = (transitionId) => {
        app.chimeTimeoutId = setTimeout(() => {
            app.chimeTimeoutId = null;
            if (transitionId !== app.chimeTransitionId || !Number.isFinite(app.__chimeDeadlineMs)) return;
            // OSの時計が後退しても、期限前のコールバックで遷移予約を失わない。
            if (Date.now() < app.__chimeDeadlineMs) scheduleChimeCompletion(transitionId);
            else finishChimeIfElapsed();
        }, Math.max(0, app.__chimeDeadlineMs - Date.now()));
    };

    app.playSchoolChimeAndStartBreak = async function hardenedPlaySchoolChimeAndStartBreak(completedAt = Date.now()) {
        this.cancelPendingBreakTransition();
        const transitionId = this.chimeTransitionId;
        this.__chimeTransitioning = true;
        this.__chimeDeadlineMs = completedAt + this.CONSTANTS.CHIME_DURATION_MS;
        // 復帰時に終了済みのチャイムを最初から鳴らさない。
        if (Date.now() >= this.__chimeDeadlineMs) { finishChimeIfElapsed(); return; }
        const audioReady = await waitForAudioBriefly();
        if (transitionId !== this.chimeTransitionId) return;
        if (!audioReady || !window.Tone) {
            this.__chimeTransitioning = false;
            this.__chimeDeadlineMs = null;
            this.startBreakMode(completedAt);
            return;
        }
        if (Date.now() >= this.__chimeDeadlineMs) { finishChimeIfElapsed(); return; }
        this.isChimePlaying = true;
        this.dom.chimeStatus.classList.remove('hidden');
        this.dom.timerDisplay.classList.add('opacity-20');
        this.dom.playIcon.style.display = 'none';
        this.disposeChimeNodes();
        try {
            const tone = window.Tone;
            this.chimeSynth = new tone.Synth({ oscillator: { type: 'triangle' },
                envelope: { attack: 0.05, decay: 0.2, sustain: 0.2, release: 2 } });
            this.chimeSynth.toDestination();
            this.chimeSynth.volume.value = this.chimeVolume;
            this.chimeReverb = new tone.Reverb({ decay: 3, wet: 0.3 });
            this.chimeReverb.toDestination();
            this.chimeSynth.connect(this.chimeReverb);
            const now = tone.now();
            const elapsed = Math.max(0, (Date.now() - completedAt) / 1000);
            const notes = [['E5', '0.8', 0], ['C5', '0.8', 1], ['D5', '0.8', 2], ['G4', '1.5', 3],
                ['G4', '0.8', 6], ['D5', '0.8', 7], ['E5', '0.8', 8], ['C5', '2.0', 9]];
            for (const [note, duration, offset] of notes) {
                if (offset >= elapsed - 0.1) this.chimeSynth.triggerAttackRelease(note, duration, now + Math.max(0, offset - elapsed));
            }
        } catch (error) {
            this.disposeChimeNodes();
            console.error('Failed to play school chime:', error);
        }
        scheduleChimeCompletion(transitionId);
        this.__chimeTransitioning = false;
    };

    app.completeTimer = function hardenedCompleteTimer(completedAt = Date.now()) {
        if (this.__timerCompletionPromise) return this.__timerCompletionPromise;
        if (this.__chimeTransitioning || this.isChimePlaying) return Promise.resolve();
        clearTimerTicker();
        this.__timerDeadlineMs = null;
        this.__timerRemainingMs = 0;
        this.isRunning = false;
        if (this.dom?.playIcon) this.dom.playIcon.innerText = 'play_arrow';
        const transitionId = this.chimeTransitionId;
        const mode = this.__timerMode;
        let completing;
        completing = Promise.resolve().then(async () => {
            if (transitionId !== this.chimeTransitionId) return;
            if (mode === 'focus') {
                if (this.incrementCompletedCount) await this.incrementCompletedCount(() => transitionId === this.chimeTransitionId);
                else {
                    this.completedCount = Math.min(this.CONSTANTS.MAX_COMPLETED_COUNT, this.completedCount + 1);
                    this.saveState();
                }
                if (transitionId !== this.chimeTransitionId) return;
                this.updateDisplay();
                // 休憩まで眠っていた場合の次の完了処理を妨げない。
                if (this.__timerCompletionPromise === completing) this.__timerCompletionPromise = null;
                void this.playSchoolChimeAndStartBreak(completedAt);
            } else {
                const activeFocusButton = document.querySelector('.timer-preset[data-mode="focus"].timer-btn-active');
                this.setTimer(activeFocusButton?.dataset.value || this.CONSTANTS.DEFAULT_FOCUS_MINUTES, 'focus');
                const soundGeneration = this.chimeTransitionId;
                // 過去の休憩終了音を遅れて再生しない。
                if (Date.now() - completedAt > 1500 || this.__pageIsHiding) return;
                const audioReady = await waitForAudioBriefly();
                if (!audioReady || !window.Tone || soundGeneration !== this.chimeTransitionId || this.__pageIsHiding) return;
                let synth;
                try {
                    synth = new window.Tone.Synth();
                    synth.toDestination();
                    synth.volume.value = this.chimeVolume;
                    synth.triggerAttackRelease('G4', '0.5');
                    setTimeout(() => synth.dispose(), 1000);
                } catch (error) {
                    try { synth?.dispose(); } catch (_) {}
                    console.error('Failed to play break end sound:', error);
                }
            }
        }).catch(error => console.error('Timer completion failed:', error)).finally(() => {
            if (this.__timerCompletionPromise === completing) this.__timerCompletionPromise = null;
        });
        this.__timerCompletionPromise = completing;
        return completing;
    };

    app.toggleTimer = function hardenedToggleTimer() {
        if (this.__chimeTransitioning || this.isChimePlaying || this.__timerCompletionPromise) return;
        if (this.isRunning) {
            const completedAt = this.__timerDeadlineMs;
            const elapsed = syncTimerFromClock(false);
            clearTimerTicker();
            this.isRunning = false;
            this.__timerDeadlineMs = null;
            if (this.dom?.playIcon) this.dom.playIcon.innerText = 'play_arrow';
            this.updateDisplay();
            if (elapsed) void this.completeTimer(completedAt);
            return;
        }
        void this.ensureAudio();
        if (this.timeLeft <= 0) {
            const selector = this.__timerMode === 'break'
                ? '.timer-preset[data-mode="break"].break-btn-active'
                : '.timer-preset[data-mode="focus"].timer-btn-active';
            const activeButton = document.querySelector(selector);
            const fallback = this.__timerMode === 'break' ? this.CONSTANTS.DEFAULT_BREAK_MINUTES : this.CONSTANTS.DEFAULT_FOCUS_MINUTES;
            this.timeLeft = this.getValidatedMinutes(activeButton?.dataset.value || fallback, this.__timerMode) * 60;
            this.totalTime = this.timeLeft;
            this.__timerRemainingMs = this.timeLeft * 1000;
        }
        const remaining = Number.isFinite(this.__timerRemainingMs) && this.__timerRemainingMs > 0
            ? this.__timerRemainingMs : this.timeLeft * 1000;
        this.isRunning = true;
        if (this.dom?.playIcon) this.dom.playIcon.innerText = 'pause';
        this.__timerDeadlineMs = Date.now() + remaining;
        this.updateDisplay();
        startTimerTicker();
    };

    const originalSetupSoundMixerUI = app.setupSoundMixerUI.bind(app);
    app.setupSoundMixerUI = function hardenedSetupSoundMixerUI() {
        const result = originalSetupSoundMixerUI();
        this.soundsData.forEach((sound) => syncSoundAccessibility(sound.id));
        syncDrawerAccessibility();
        return result;
    };

    const originalToggleSound = app.toggleSound.bind(app);
    app.toggleSound = async function hardenedToggleSound(soundId) {
        const result = await originalToggleSound(soundId);
        syncSoundAccessibility(soundId);
        return result;
    };

    const originalToggleSoundDrawer = app.toggleSoundDrawer.bind(app);
    app.toggleSoundDrawer = function hardenedToggleSoundDrawer() {
        const result = originalToggleSoundDrawer();
        syncDrawerAccessibility();
        return result;
    };

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            flushTask();
            syncTimerFromClock(false);
            return;
        }
        if (document.visibilityState === 'visible') {
            finishChimeIfElapsed();
            syncTimerFromClock(true);
            startTimerTicker();
        }
    });

    window.addEventListener('pagehide', () => {
        app.__pageIsHiding = true;
        app.suspendAudioForPage?.();
        // ページ離脱中に予約済みの音符が、復帰後へずれて鳴らないよう解放する。
        app.disposeChimeNodes();
        flushTask();
        syncTimerFromClock(false);
        clearTimerTicker();
    });

    window.addEventListener('pageshow', (event) => {
        app.__pageIsHiding = false;
        if (!event.persisted) return;
        finishChimeIfElapsed();
        app.resumeAudioForPage?.();
        syncTimerFromClock(true);
        startTimerTicker();
    });
})();

