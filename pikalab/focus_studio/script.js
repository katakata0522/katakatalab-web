// --- App Logic Encapsulation ---
const app = {
    // --- CONSTANTS ---
    CONSTANTS: {
        DEFAULT_FOCUS_MINUTES: 25,
        DEFAULT_BREAK_MINUTES: 5,
        DEFAULT_CHIME_VOLUME: -15,
        CHIME_DURATION_MS: 14000,
        MAX_COMPLETED_COUNT: 10000,
        MIN_FOCUS_MINUTES: 1,
        MAX_FOCUS_MINUTES: 180,
        MIN_BREAK_MINUTES: 1,
        MAX_BREAK_MINUTES: 60,
        MIN_CHIME_VOLUME: -40,
        MAX_CHIME_VOLUME: 0,
        DRAWER_FOCUSABLE_SELECTOR: 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        STORAGE_KEYS: {
            COMPLETED_COUNT: 'focusStudioCompletedCount',
            TASK: 'focusStudioTask',
            CHIME_VOLUME: 'focusStudioChimeVolume',
            DARK_MODE: 'focusStudioDarkMode'
        },
        // Class name constants to avoid repetition
        CLASSES: {
            FOCUS_BTN_ACTIVE: 'timer-preset aspect-square rounded-xl bg-kawaii-primary text-white font-bold shadow-lg scale-105 border-2 border-transparent transition-all flex items-center justify-center timer-btn-active',
            FOCUS_BTN_INACTIVE: 'timer-preset aspect-square rounded-xl bg-white text-kawaii-text font-bold shadow-sm hover:border-kawaii-primary/50 border-2 border-transparent transition-all flex items-center justify-center',
            BREAK_BTN_ACTIVE: 'timer-preset py-3 rounded-xl bg-kawaii-accent text-teal-800 font-bold hover:bg-kawaii-accent transition-all border border-transparent text-sm break-btn-active scale-105 shadow-md',
            BREAK_BTN_INACTIVE: 'timer-preset py-3 rounded-xl bg-kawaii-accent/40 text-teal-800 font-bold hover:bg-kawaii-accent transition-all border border-transparent text-sm'
        },
        // Static color mappings for sound cards (Tailwind JIT compatibility)
        SOUND_COLORS: {
            amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-100' },
            pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-100' },
            blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-100' },
            orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-100' },
            slate: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-100' }
        },
        DEBOUNCE_DELAY_MS: 300
    },

    // --- STATE ---
    timerInterval: null,
    timeLeft: 25 * 60,
    totalTime: 25 * 60,
    isRunning: false,
    completedCount: 0,
    currentBreakTime: 5,
    chimeVolume: -15,
    audioReady: false,
    audioInitializationPromise: null,
    audioSuspensionPromise: null,
    audioLifecycleId: 0,
    audioPageSuspended: false,
    soundDesired: {},
    soundGenerations: {},
    sounds: {},
    chimeSynth: null, // Track synth for cleanup
    chimeReverb: null, // Track reverb for cleanup
    chimeTimeoutId: null,
    chimeTransitionId: 0,
    isChimePlaying: false,
    drawerHideTimeoutId: null,
    drawerShowTimeoutId: null,
    lastFocusedElement: null,
    saveTaskTimeoutId: null, // For debouncing task save
    taskDirty: false,
    lastSavedTask: '',
    hiddenTimestamp: null,

    // --- INITIALIZATION ---
    init() {
        this.loadState();
        this.loadSettings();
        this.initDarkMode();
        this.registerServiceWorker();
        this.setupToneJsAudio();
        this.initDOMReferences();
        this.setDrawerModalState(false);
        this.bindEvents();
        this.setupProgressRing();
        this.updateDisplay();
        this.updateButtons(this.CONSTANTS.DEFAULT_FOCUS_MINUTES, 'focus');
        this.updateButtons(this.CONSTANTS.DEFAULT_BREAK_MINUTES, 'break');
        this.setupSoundMixerUI();
    },

    /**
     * Load settings from LocalStorage (volume, dark mode)
     */
    loadSettings() {
        try {
            const savedVolume = localStorage.getItem(this.CONSTANTS.STORAGE_KEYS.CHIME_VOLUME);
            if (savedVolume !== null) {
                this.chimeVolume = this.sanitizeInteger(
                    savedVolume,
                    this.CONSTANTS.MIN_CHIME_VOLUME,
                    this.CONSTANTS.MAX_CHIME_VOLUME,
                    this.CONSTANTS.DEFAULT_CHIME_VOLUME
                );
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    },

    sanitizeInteger(value, min, max, fallback) {
        // 空文字・部分的な数値・無限大を保存値として受け入れない。
        if (typeof value !== 'number' && typeof value !== 'string') return fallback;
        if (typeof value === 'string' && !/^[+-]?\d+$/.test(value.trim())) return fallback;
        const parsed = Number(value);
        if (!Number.isSafeInteger(parsed)) return fallback;
        if (parsed < min) return min;
        if (parsed > max) return max;
        return parsed;
    },

    getValidatedMinutes(value, mode) {
        const fallback = mode === 'break'
            ? this.CONSTANTS.DEFAULT_BREAK_MINUTES
            : this.CONSTANTS.DEFAULT_FOCUS_MINUTES;
        const min = mode === 'break'
            ? this.CONSTANTS.MIN_BREAK_MINUTES
            : this.CONSTANTS.MIN_FOCUS_MINUTES;
        const max = mode === 'break'
            ? this.CONSTANTS.MAX_BREAK_MINUTES
            : this.CONSTANTS.MAX_FOCUS_MINUTES;

        return this.sanitizeInteger(value, min, max, fallback);
    },

    /**
     * Initialize dark mode based on saved preference or system preference
     */
    initDarkMode() {
        try {
            const savedMode = localStorage.getItem(this.CONSTANTS.STORAGE_KEYS.DARK_MODE);
            if (savedMode === 'true') {
                document.documentElement.classList.add('dark');
            } else if (savedMode === null) {
                // Check system preference
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                }
            }
        } catch (error) {
            console.error('Failed to init dark mode:', error);
        }
    },

    /**
     * Toggle dark mode
     */
    toggleDarkMode() {
        const isDark = document.documentElement.classList.toggle('dark');
        try {
            localStorage.setItem(this.CONSTANTS.STORAGE_KEYS.DARK_MODE, isDark.toString());
        } catch (error) {
            console.error('Failed to save dark mode preference:', error);
        }
    },

    /**
     * Update dark mode icon based on current state
     */
    updateDarkModeIcon() {
        if (this.dom.darkModeIcon) {
            const isDark = document.documentElement.classList.contains('dark');
            this.dom.darkModeIcon.innerText = isDark ? 'light_mode' : 'dark_mode';
        }
    },

    /**
     * Register Service Worker for PWA
     */
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw-hardened.js', { scope: './', updateViaCache: 'none' })
                .catch(err => console.error('Service Worker registration failed:', err));
        }
    },

    /**
     * Load saved state from LocalStorage with error handling
     */
    loadState() {
        try {
            const savedCount = localStorage.getItem(this.CONSTANTS.STORAGE_KEYS.COMPLETED_COUNT);
            if (savedCount !== null) {
                this.completedCount = this.sanitizeInteger(savedCount, 0, this.CONSTANTS.MAX_COMPLETED_COUNT, 0);
            }
        } catch (error) {
            console.error('Failed to load state from localStorage:', error);
        }
    },

    /**
     * Save state to LocalStorage with error handling
     */
    saveState() {
        try {
            localStorage.setItem(
                this.CONSTANTS.STORAGE_KEYS.COMPLETED_COUNT,
                this.completedCount.toString()
            );
        } catch (error) {
            console.error('Failed to save state to localStorage:', error);
        }
    },

    /**
     * Setup Tone.js audio context initialization on user gesture
     */
    setupToneJsAudio() {
        document.body.addEventListener('click', () => this.ensureAudio(), { once: true });
        document.body.addEventListener('touchend', () => this.ensureAudio(), { once: true });
    },

    /**
     * Ensure Tone.js audio context is running
     * @returns {Promise<boolean>} Success status
     */
    ensureAudio() {
        if (this.audioPageSuspended || this.__pageIsHiding) return Promise.resolve(false);
        if (this.audioSuspensionPromise) {
            const lifecycleId = this.audioLifecycleId;
            return this.audioSuspensionPromise.then(() => lifecycleId === this.audioLifecycleId ? this.ensureAudio() : false);
        }
        if (this.audioReady && window.Tone?.context?.state === 'running') return Promise.resolve(true);
        if (this.audioInitializationPromise) return this.audioInitializationPromise;

        const lifecycleId = this.audioLifecycleId;
        const isCurrent = () => lifecycleId === this.audioLifecycleId && !this.audioPageSuspended && !this.__pageIsHiding;
        const stopStaleAudio = async () => {
            // resume()がpagehide時のsuspend()より後に完了しても離脱中の音を再開しない。
            if (this.audioPageSuspended || this.__pageIsHiding) await this.suspendCurrentAudioContext();
            return false;
        };
        const preparation = (async () => {
            try {
                await window.PikaLabToneLoader.load('../assets/tone-14.8.49.js');
                if (!isCurrent()) return stopStaleAudio();
                const tone = window.Tone;
                await tone.start();
                if (!isCurrent()) return stopStaleAudio();
                if (tone.context.state !== 'running') await tone.context.resume();
                if (!isCurrent()) return stopStaleAudio();
                this.audioReady = tone.context.state === 'running';
                return this.audioReady;
            } catch (error) {
                if (isCurrent()) this.audioReady = false;
                else await stopStaleAudio();
                console.error('Tone.js audio context could not be started:', error);
                return false;
            }
        })();
        this.audioInitializationPromise = preparation;
        void preparation.finally(() => {
            if (this.audioInitializationPromise === preparation) this.audioInitializationPromise = null;
        });
        return preparation;
    },

    suspendAudioForPage() {
        this.audioPageSuspended = true;
        this.audioLifecycleId += 1;
        this.audioInitializationPromise = null;
        // 戻る操作で復帰する既存の音は残し、離脱前の未完了の開始だけを取り消す。
        this.soundsData.forEach(({ id }) => {
            this.soundGenerations[id] = (this.soundGenerations[id] || 0) + 1;
            this.soundDesired[id] = Boolean(this.sounds[id]);
            this.syncSoundState(id);
        });
        void this.suspendCurrentAudioContext();
    },

    suspendCurrentAudioContext() {
        const previous = this.audioSuspensionPromise;
        const suspension = (async () => {
            try {
                if (previous) await previous;
                const context = window.Tone?.context;
                const suspendable = context?.rawContext || context;
                if (typeof suspendable?.suspend === 'function') await suspendable.suspend();
            } catch (_) {}
        })();
        this.audioSuspensionPromise = suspension;
        void suspension.finally(() => {
            if (this.audioSuspensionPromise === suspension) this.audioSuspensionPromise = null;
        });
        return suspension;
    },

    async resumeAudioForPage() {
        this.audioPageSuspended = false;
        const lifecycleId = this.audioLifecycleId;
        // 直前のsuspend完了後に再開し、遅い停止が復帰した音を消さないようにする。
        if (this.audioSuspensionPromise) await this.audioSuspensionPromise;
        if (lifecycleId !== this.audioLifecycleId || this.audioPageSuspended || this.__pageIsHiding) return;
        if (Object.keys(this.sounds).length || this.isChimePlaying) await this.ensureAudio();
    },

    async incrementCompletedCount(isCurrent = () => true) {
        const increment = () => {
            if (!isCurrent()) return false;
            let storedCount = 0;
            try {
                storedCount = this.sanitizeInteger(localStorage.getItem(this.CONSTANTS.STORAGE_KEYS.COMPLETED_COUNT),
                    0, this.CONSTANTS.MAX_COMPLETED_COUNT, 0);
            } catch (_) {}
            this.completedCount = Math.min(this.CONSTANTS.MAX_COMPLETED_COUNT,
                Math.max(this.completedCount, storedCount) + 1);
            this.saveState();
            this.updateDisplay();
            return true;
        };
        const locks = typeof navigator !== 'undefined' ? navigator.locks : null;
        if (typeof locks?.request === 'function') {
            try {
                return await locks.request('focusStudioCompletedCount', increment);
            } catch (error) {
                console.error('Failed to synchronize completed count:', error);
            }
        }
        // Web Locks非対応環境では、保存済みの大きな値を上書きしない。
        return increment();
    },

    handleStorageChange(event) {
        try {
            if (event.storageArea && event.storageArea !== localStorage) return;
        } catch (_) { return; }
        const keys = this.CONSTANTS.STORAGE_KEYS;
        if (event.key === keys.TASK && !this.taskDirty) {
            this.lastSavedTask = event.newValue || '';
            if (this.dom.taskInput) this.dom.taskInput.value = this.lastSavedTask;
        } else if (event.key === keys.COMPLETED_COUNT) {
            this.completedCount = Math.max(this.completedCount,
                this.sanitizeInteger(event.newValue, 0, this.CONSTANTS.MAX_COMPLETED_COUNT, 0));
            this.updateDisplay();
        } else if (event.key === keys.CHIME_VOLUME) {
            this.chimeVolume = this.sanitizeInteger(event.newValue, this.CONSTANTS.MIN_CHIME_VOLUME,
                this.CONSTANTS.MAX_CHIME_VOLUME, this.CONSTANTS.DEFAULT_CHIME_VOLUME);
            const slider = document.getElementById('chime-volume-slider');
            if (slider) slider.value = this.chimeVolume;
        } else if (event.key === keys.DARK_MODE) {
            const dark = event.newValue === 'true' || (event.newValue === null
                && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
            document.documentElement.classList.toggle('dark', Boolean(dark));
            this.updateDarkModeIcon();
        }
    },

    // --- DOM REFERENCES (Caching for performance) ---
    dom: {},
    initDOMReferences() {
        this.dom.timerDisplay = document.getElementById('timer-display');
        this.dom.timerLabel = document.getElementById('timer-label');
        this.dom.progressCircle = document.getElementById('progress-ring');
        this.dom.playIcon = document.getElementById('icon-timer');
        this.dom.countDisplay = document.getElementById('complete-count');
        this.dom.nextBreakDisplay = document.getElementById('next-break-display');
        this.dom.chimeStatus = document.getElementById('chime-status');
        this.dom.soundDrawer = document.getElementById('sound-drawer');
        this.dom.drawerOverlay = document.getElementById('drawer-overlay');
        this.dom.soundBadge = document.getElementById('sound-badge');
        this.dom.taskInput = document.getElementById('task-input');
        this.dom.openSoundDrawerBtn = document.getElementById('open-sound-drawer-btn');
        this.dom.soundDrawerCloseBtn = document.getElementById('sound-drawer-close-btn');
        this.dom.darkModeToggleBtn = document.getElementById('dark-mode-toggle-btn');
        this.dom.darkModeIcon = document.getElementById('dark-mode-icon');
        this.dom.header = document.querySelector('header');
        this.dom.mainContent = document.getElementById('main-content');
        this.dom.footer = document.querySelector('footer');
    },

    // --- EVENT BINDING ---
    bindEvents() {
        // Header
        document.querySelector('header .cursor-pointer')?.addEventListener('click', () => location.reload());
        this.dom.taskInput?.addEventListener('input', () => this.saveTask());
        this.dom.taskInput?.addEventListener('change', () => this.saveTaskImmediately());
        this.dom.taskInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
                this.saveTaskImmediately();
            }
        });
        window.addEventListener('beforeunload', () => this.saveTaskImmediately());
        window.addEventListener('storage', (event) => this.handleStorageChange(event));
        this.dom.openSoundDrawerBtn?.addEventListener('click', () => this.toggleSoundDrawer());
        this.dom.soundDrawerCloseBtn?.addEventListener('click', () => this.toggleSoundDrawer());
        this.dom.drawerOverlay?.addEventListener('click', () => this.toggleSoundDrawer());
        document.getElementById('stop-all-sounds-btn')?.addEventListener('click', () => this.stopAllSounds());
        document.getElementById('chime-volume-slider')?.addEventListener('input', (e) => this.setChimeVolume(e.target.value));

        // Dark mode toggle
        this.dom.darkModeToggleBtn?.addEventListener('click', () => {
            this.toggleDarkMode();
            this.updateDarkModeIcon();
        });
        this.updateDarkModeIcon();

        // Escape key to close drawer, Space to toggle timer
        document.addEventListener('keydown', (e) => {
            if (e.defaultPrevented || e.isComposing || e.keyCode === 229) return;
            if (e.key === 'Escape' && this.isSoundDrawerOpen()) {
                this.toggleSoundDrawer();
                return;
            }

            if (e.key === 'Tab' && this.isSoundDrawerOpen()) {
                this.handleDrawerFocusTrap(e);
                return;
            }

            if (e.code !== 'Space' || e.defaultPrevented || e.repeat || e.isComposing || e.keyCode === 229
                || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
            const interactive = 'button, a[href], input, textarea, select, summary, audio, video, [contenteditable]:not([contenteditable="false"]), [role="button"]';
            const target = e.target || document.activeElement;
            if (target?.isContentEditable || target?.closest?.(interactive)
                || document.activeElement?.isContentEditable || document.activeElement?.closest?.(interactive)) return;
            if (this.isSoundDrawerOpen() || document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]:not([aria-hidden="true"])')) return;
            e.preventDefault();
            this.toggleTimer();
        });

        // Main Timer Controls
        document.getElementById('btn-main-action')?.addEventListener('click', () => this.toggleTimer());
        document.getElementById('restart-btn')?.addEventListener('click', () => this.resetTimerState(this.totalTime / 60));

        // Presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('preset-btn-active'));
                btn.classList.add('preset-btn-active');
                this.setTimer(btn.dataset.break, 'break');
                this.setTimer(btn.dataset.focus, 'focus');
            });
        });

        // Timer Presets
        document.querySelectorAll('.timer-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                this.setTimer(target?.dataset?.value, target?.dataset?.mode);
            });
        });

        // Initial task load with error handling (no escapeHtml needed for input.value)
        try {
            const savedTask = localStorage.getItem(this.CONSTANTS.STORAGE_KEYS.TASK);
            this.lastSavedTask = savedTask || '';
            if (this.dom.taskInput) this.dom.taskInput.value = this.lastSavedTask;
        } catch (error) {
            console.error('Failed to load saved task:', error);
        }

        // Restore chime volume slider value
        const chimeSlider = document.getElementById('chime-volume-slider');
        if (chimeSlider) {
            chimeSlider.value = this.chimeVolume;
        }

        // タブ切り替え時（非表示時）の音声一時停止およびタイマーの同期処理（ホスピタリティ）
        document.addEventListener('visibilitychange', () => {
            if (this.__focusRuntimeHardeningInstalled) return;
            if (document.visibilityState === 'hidden') {
                if (this.audioReady && Tone.context && Tone.context.state === 'running') {
                    Tone.context.suspend().catch(() => {});
                }
                if (this.isRunning) {
                    this.hiddenTimestamp = Date.now();
                }
            } else if (document.visibilityState === 'visible') {
                if (this.audioReady && Tone.context && Tone.context.state === 'suspended') {
                    Tone.context.resume().catch(() => {});
                }
                if (this.isRunning && this.hiddenTimestamp) {
                    const elapsedSeconds = Math.floor((Date.now() - this.hiddenTimestamp) / 1000);
                    this.hiddenTimestamp = null;
                    if (elapsedSeconds > 0) {
                        this.timeLeft = Math.max(0, this.timeLeft - elapsedSeconds);
                        this.updateDisplay();
                        if (this.timeLeft <= 0) {
                            this.completeTimer();
                        }
                    }
                }
            }
        });
    },

    /**
     * Save current task to LocalStorage with debouncing
     */
    saveTask() {
        this.taskDirty = true;
        // Clear previous timeout
        if (this.saveTaskTimeoutId) {
            clearTimeout(this.saveTaskTimeoutId);
        }
        // Debounce the save operation
        this.saveTaskTimeoutId = setTimeout(() => {
            this.saveTaskImmediately();
        }, this.CONSTANTS.DEBOUNCE_DELAY_MS);
    },

    /**
     * Save current task to LocalStorage immediately without debouncing
     */
    saveTaskImmediately() {
        if (this.saveTaskTimeoutId) {
            clearTimeout(this.saveTaskTimeoutId);
            this.saveTaskTimeoutId = null;
        }
        const input = this.dom.taskInput;
        if (!input || (!this.taskDirty && input.value === this.lastSavedTask)) return;
        this.taskDirty = true;
        try {
            localStorage.setItem(this.CONSTANTS.STORAGE_KEYS.TASK, input.value);
            this.lastSavedTask = input.value;
            this.taskDirty = false;
        } catch (error) {
            console.error('Failed to save task immediately:', error);
        }
    },

    setChimeVolume(val) {
        this.chimeVolume = this.sanitizeInteger(
            val,
            this.CONSTANTS.MIN_CHIME_VOLUME,
            this.CONSTANTS.MAX_CHIME_VOLUME,
            this.CONSTANTS.DEFAULT_CHIME_VOLUME
        );
        try {
            localStorage.setItem(this.CONSTANTS.STORAGE_KEYS.CHIME_VOLUME, this.chimeVolume.toString());
        } catch (error) {
            console.error('Failed to save chime volume:', error);
        }
    },

    isSoundDrawerOpen() {
        return this.dom.soundDrawer && !this.dom.soundDrawer.classList.contains('translate-x-full');
    },

    setDrawerModalState(isOpen) {
        const drawer = this.dom.soundDrawer;
        if (!drawer) return;

        drawer.setAttribute('aria-modal', isOpen ? 'true' : 'false');
        drawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        drawer.inert = !isOpen;

        const targets = [this.dom.header, this.dom.mainContent, this.dom.footer];
        targets.forEach((target) => {
            if (!target) return;
            if (isOpen) {
                target.setAttribute('inert', '');
            } else {
                target.removeAttribute('inert');
            }
        });
    },

    handleDrawerFocusTrap(e) {
        const drawer = this.dom.soundDrawer;
        if (!drawer) return;

        const focusableElements = Array.from(
            drawer.querySelectorAll(this.CONSTANTS.DRAWER_FOCUSABLE_SELECTOR)
        ).filter((element) => !element.hidden && !element.closest?.('[hidden], [inert]')
            && (typeof element.getClientRects !== 'function' || element.getClientRects().length > 0));
        if (focusableElements.length === 0) {
            e.preventDefault();
            return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        if (e.shiftKey) {
            if (activeElement === firstElement || !drawer.contains(activeElement)) {
                e.preventDefault();
                lastElement.focus();
            }
            return;
        }

        if (activeElement === lastElement || !drawer.contains(activeElement)) {
            e.preventDefault();
            firstElement.focus();
        }
    },

    toggleSoundDrawer() {
        const d = this.dom.soundDrawer;
        const o = this.dom.drawerOverlay;
        if (!d || !o) return;

        if (this.drawerHideTimeoutId) {
            clearTimeout(this.drawerHideTimeoutId);
            this.drawerHideTimeoutId = null;
        }
        if (this.drawerShowTimeoutId) {
            clearTimeout(this.drawerShowTimeoutId);
            this.drawerShowTimeoutId = null;
        }

        if (d.classList.contains('translate-x-full')) {
            // Opening drawer
            this.lastFocusedElement = document.activeElement;
            d.classList.remove('translate-x-full');
            o.classList.remove('hidden');
            this.drawerShowTimeoutId = setTimeout(() => {
                this.drawerShowTimeoutId = null;
                if (this.isSoundDrawerOpen()) o.classList.remove('opacity-0');
            }, 10);
            this.setDrawerModalState(true);
            // Focus the close button for accessibility
            this.dom.soundDrawerCloseBtn?.focus();
        } else {
            // Closing drawer
            d.classList.add('translate-x-full');
            o.classList.add('opacity-0');
            this.drawerHideTimeoutId = setTimeout(() => {
                o.classList.add('hidden');
                this.drawerHideTimeoutId = null;
            }, 300);
            this.setDrawerModalState(false);
            if (this.lastFocusedElement instanceof HTMLElement && this.lastFocusedElement.isConnected !== false
                && !this.lastFocusedElement.closest('[inert]')) {
                this.lastFocusedElement.focus();
            } else {
                this.dom.openSoundDrawerBtn?.focus();
            }
        }
    },

    stopAllSounds() {
        const ids = new Set([...Object.keys(this.sounds), ...Object.keys(this.soundDesired)]);
        ids.forEach((id) => this.stopSound(id));
    },

    // --- TIMER LOGIC ---
    setupProgressRing() {
        this.dom.radius = this.dom.progressCircle.r.baseVal.value;
        this.dom.circumference = this.dom.radius * 2 * Math.PI;
        this.dom.progressCircle.style.strokeDasharray = `${this.dom.circumference} ${this.dom.circumference}`;
        this.dom.progressCircle.style.strokeDashoffset = 0;
    },

    setProgress(percent) {
        const offset = this.dom.circumference - (percent / 100) * this.dom.circumference;
        this.dom.progressCircle.style.strokeDashoffset = offset;
    },

    updateDisplay() {
        const m = Math.floor(this.timeLeft / 60);
        const s = this.timeLeft % 60;
        this.dom.timerDisplay.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        document.title = this.isRunning ? `(${m}:${s.toString().padStart(2, '0')}) Focus Studio` : 'Focus Studio';
        const percent = this.totalTime > 0 ? ((this.totalTime - this.timeLeft) / this.totalTime) * 100 : 0;
        this.setProgress(percent);

        const countText = String(this.completedCount);
        if (this.dom.countDisplay.innerText !== countText) this.dom.countDisplay.innerText = countText;

        if (this.dom.timerLabel.innerText === 'きゅうけい！') {
            this.dom.nextBreakDisplay.style.display = 'none';
        } else {
            this.dom.nextBreakDisplay.style.display = 'block';
            const breakText = `次回の休憩: ${this.currentBreakTime}分`;
            if (this.dom.nextBreakDisplay.innerText !== breakText) this.dom.nextBreakDisplay.innerText = breakText;
        }

        // Update aria-valuenow for progressbar
        document.querySelector('[role="progressbar"]')?.setAttribute('aria-valuenow', 100 - Math.round(percent));
    },

    setTimer(minutes, mode) {
        if (mode !== 'focus' && mode !== 'break') return;
        const validatedMinutes = this.getValidatedMinutes(minutes, mode);

        if (mode === 'break') {
            this.currentBreakTime = validatedMinutes;
            this.updateButtons(validatedMinutes, 'break');

            if (this.dom.timerLabel.innerText === 'きゅうけい！') this.resetTimerState(validatedMinutes, 'break');
        } else {
            this.resetTimerState(validatedMinutes, 'focus');
            this.updateButtons(validatedMinutes, 'focus');
            this.dom.timerLabel.innerText = 'しゅうちゅう！';
            this.dom.timerLabel.className = 'text-kawaii-primary font-bold text-xl md:text-2xl mb-2 tracking-widest uppercase opacity-80';
            this.dom.progressCircle.classList.replace('text-teal-400', 'text-kawaii-primary');
            this.dom.chimeStatus.classList.add('hidden');
            this.dom.timerDisplay.classList.remove('opacity-20');
            this.dom.playIcon.style.display = 'block';
        }
        this.updateDisplay();
    },

    resetTimerState(minutes, mode = null) {
        const fallbackMode = this.dom.timerLabel?.innerText === 'きゅうけい！' ? 'break' : 'focus';
        const timerMode = mode === 'break' || mode === 'focus' ? mode : fallbackMode;
        const validatedMinutes = this.getValidatedMinutes(minutes, timerMode);
        clearInterval(this.timerInterval);
        this.cancelPendingBreakTransition();
        this.isRunning = false;
        this.dom.playIcon.innerText = 'play_arrow';
        this.timeLeft = validatedMinutes * 60;
        this.totalTime = this.timeLeft;
        this.updateDisplay();
    },

    updateButtons(minutes, mode) {
        const { CLASSES } = this.CONSTANTS;
        document.querySelectorAll('.timer-preset').forEach(btn => {
            if (btn.dataset.mode !== mode) return;
            const btnVal = parseInt(btn.dataset.value, 10);
            const isActive = btnVal === minutes;
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            if (mode === 'focus') {
                btn.className = isActive ? CLASSES.FOCUS_BTN_ACTIVE : CLASSES.FOCUS_BTN_INACTIVE;
            } else {
                btn.className = isActive ? CLASSES.BREAK_BTN_ACTIVE : CLASSES.BREAK_BTN_INACTIVE;
            }
        });
    },

    async toggleTimer() {
        if (this.isChimePlaying) return;
        await this.ensureAudio();
        if (this.isRunning) {
            clearInterval(this.timerInterval);
            this.isRunning = false;
            this.dom.playIcon.innerText = 'play_arrow';
        } else {
            if (this.timeLeft <= 0) {
                // If timer finished, reset to totalTime to restart the same timer type
                if (this.dom.timerLabel.innerText === 'しゅうちゅう！') {
                    const activeBtn = document.querySelector('.timer-preset[data-mode="focus"].timer-btn-active');
                    const focusMinutes = this.getValidatedMinutes(activeBtn?.dataset.value, 'focus');
                    this.timeLeft = focusMinutes * 60;
                } else {
                    const activeBtn = document.querySelector('.timer-preset[data-mode="break"].break-btn-active');
                    const breakMinutes = this.getValidatedMinutes(activeBtn?.dataset.value, 'break');
                    this.timeLeft = breakMinutes * 60;
                }
                this.totalTime = this.timeLeft;
            }
            this.isRunning = true;
            this.dom.playIcon.innerText = 'pause';
            this.timerInterval = setInterval(() => {
                if (this.timeLeft > 0) {
                    this.timeLeft--;
                    this.updateDisplay();
                } else {
                    this.completeTimer();
                }
            }, 1000);
        }
    },

    async completeTimer() {
        clearInterval(this.timerInterval);
        this.isRunning = false;
        this.dom.playIcon.innerText = 'play_arrow';

        if (this.dom.timerLabel.innerText === 'しゅうちゅう！') {
            if (this.completedCount < this.CONSTANTS.MAX_COMPLETED_COUNT) {
                this.completedCount++;
            }
            this.saveState();
            this.updateDisplay();
            this.playSchoolChimeAndStartBreak();
        } else {
            const audioReady = await this.ensureAudio();
            if (audioReady) {
                try {
                    const synth = new Tone.Synth().toDestination();
                    synth.triggerAttackRelease("G4", "0.5");
                    // Dispose after sound finishes
                    setTimeout(() => synth.dispose(), 1000);
                } catch (error) {
                    console.error('Failed to play break end sound:', error);
                }
            }
            const activeBtn = document.querySelector('.timer-preset[data-mode="focus"].timer-btn-active');
            this.setTimer(activeBtn?.dataset.value || this.CONSTANTS.DEFAULT_FOCUS_MINUTES, 'focus');
        }
    },

    cancelPendingBreakTransition() {
        this.chimeTransitionId += 1;
        if (this.chimeTimeoutId) {
            clearTimeout(this.chimeTimeoutId);
            this.chimeTimeoutId = null;
        }

        if (this.isChimePlaying) {
            this.isChimePlaying = false;
            this.disposeChimeNodes();
            this.dom.chimeStatus.classList.add('hidden');
            this.dom.timerDisplay.classList.remove('opacity-20');
            this.dom.playIcon.style.display = 'block';
        }
    },

    /**
     * Dispose previous chime audio nodes to prevent memory leak
     */
    disposeChimeNodes() {
        const nodes = [this.chimeSynth, this.chimeReverb];
        this.chimeSynth = null;
        this.chimeReverb = null;
        nodes.forEach((node) => {
            try { node?.dispose(); } catch (error) { console.error('Failed to dispose chime:', error); }
        });
    },

    /**
     * Play school chime melody and transition to break mode
     */
    async playSchoolChimeAndStartBreak() {
        this.cancelPendingBreakTransition();
        const transitionId = this.chimeTransitionId;
        this.isChimePlaying = true;
        this.dom.chimeStatus.classList.remove('hidden');
        this.dom.timerDisplay.classList.add('opacity-20');
        this.dom.playIcon.style.display = 'none';

        // Dispose any previous chime nodes
        this.disposeChimeNodes();

        const audioReady = await this.ensureAudio();
        // 音声準備中にリセットされたチャイムを再開しない。
        if (transitionId !== this.chimeTransitionId || !this.isChimePlaying) return;
        if (audioReady) {
            try {
                this.chimeSynth = new Tone.Synth({
                    oscillator: { type: "triangle" },
                    envelope: { attack: 0.05, decay: 0.2, sustain: 0.2, release: 2 }
                }).toDestination();
                this.chimeSynth.volume.value = this.chimeVolume;
                this.chimeReverb = new Tone.Reverb({ decay: 3, wet: 0.3 }).toDestination();
                this.chimeSynth.connect(this.chimeReverb);

                const now = Tone.now();
                this.chimeSynth.triggerAttackRelease("E5", "0.8", now);
                this.chimeSynth.triggerAttackRelease("C5", "0.8", now + 1);
                this.chimeSynth.triggerAttackRelease("D5", "0.8", now + 2);
                this.chimeSynth.triggerAttackRelease("G4", "1.5", now + 3);
                const p2 = now + 6.0;
                this.chimeSynth.triggerAttackRelease("G4", "0.8", p2);
                this.chimeSynth.triggerAttackRelease("D5", "0.8", p2 + 1);
                this.chimeSynth.triggerAttackRelease("E5", "0.8", p2 + 2);
                this.chimeSynth.triggerAttackRelease("C5", "2.0", p2 + 3);
            } catch (error) {
                console.error('Failed to play school chime:', error);
            }
        }

        this.chimeTimeoutId = setTimeout(() => {
            this.chimeTimeoutId = null;
            if (!this.isChimePlaying) return;
            this.disposeChimeNodes(); // Clean up after chime finishes
            this.startBreakMode();
        }, this.CONSTANTS.CHIME_DURATION_MS);
    },

    startBreakMode() {
        this.isChimePlaying = false;
        this.dom.chimeStatus.classList.add('hidden');
        this.dom.timerDisplay.classList.remove('opacity-20');
        this.dom.playIcon.style.display = 'block';
        this.dom.timerLabel.innerText = 'きゅうけい！';
        this.dom.timerLabel.className = 'text-teal-500 font-bold text-xl md:text-2xl mb-2 tracking-widest uppercase opacity-80';
        this.dom.progressCircle.classList.replace('text-kawaii-primary', 'text-teal-400');
        this.timeLeft = this.currentBreakTime * 60;
        this.totalTime = this.timeLeft;
        this.updateDisplay();
        this.toggleTimer();
    },

    // --- SOUND MIXER LOGIC ---
    soundsData: [
        { id: 'brown', name: 'しずかな波の音', desc: '深いしゅうちゅう・まわりの音をさえぎる', icon: 'waves', color: 'amber', type: 'brown' },
        { id: 'pink', name: 'やすらぐ風の音', desc: 'リラックスできる風の音', icon: 'water_drop', color: 'pink', type: 'pink' },
        { id: 'rain', name: 'あめの音', desc: 'しとしと降る雨のシミュレーション', icon: 'rainy', color: 'blue', type: 'rain' },
        { id: 'cafe', name: 'カフェのにぎわい', desc: 'ちょうどいいざわざわ感', icon: 'storefront', color: 'orange', type: 'cafe' },
        { id: 'white', name: 'テレビのすな嵐', desc: '雑念を消すデジタルしゅうはすう', icon: 'air', color: 'slate', type: 'white' },
    ],

    setupSoundMixerUI() {
        const soundContainer = document.getElementById('sound-container');
        if (!soundContainer) return;

        const { SOUND_COLORS } = this.CONSTANTS;
        soundContainer.innerHTML = '';
        this.soundsData.forEach(s => {
            const colors = SOUND_COLORS[s.color] || SOUND_COLORS.slate;
            const card = document.createElement('div');
            card.className = `bg-slate-50 p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent`;
            card.innerHTML = `
                <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center gap-3">
                        <div class="p-2 ${colors.bg} ${colors.text} rounded-xl"><span class="material-symbols-rounded">${s.icon}</span></div>
                        <div><div class="font-bold text-sm text-slate-700">${s.name}</div><div class="text-[10px] text-slate-400">${s.desc}</div></div>
                    </div>
                    <button id="btn-${s.id}" class="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-kawaii-primary hover:border-kawaii-primary transition-all shadow-sm">
                        <span class="material-symbols-rounded">play_arrow</span>
                    </button>
                </div>
                <input type="range" id="vol-${s.id}" min="-60" max="-10" value="-20" disabled class="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-kawaii-primary">
            `;
            soundContainer.appendChild(card);
            document.getElementById(`btn-${s.id}`)?.addEventListener('click', () => this.toggleSound(s.id));
            document.getElementById(`vol-${s.id}`)?.addEventListener('input', (e) => {
                if (this.sounds[s.id]) {
                    const volume = this.sanitizeInteger(e.target.value, -60, -10, -20);
                    this.sounds[s.id].volume.rampTo(volume, 0.1);
                }
            });
        });

        this.updateSoundBadge();
    },

    syncSoundState(type) {
        const soundData = this.soundsData.find((sound) => sound.id === type);
        if (!soundData) return;
        const active = Boolean(this.sounds[type]);
        const button = document.getElementById(`btn-${type}`);
        const slider = document.getElementById(`vol-${type}`);
        if (button) {
            const icon = button.querySelector('span');
            if (icon) icon.innerText = active ? 'pause' : 'play_arrow';
            button.classList.toggle('bg-kawaii-primary', active);
            button.classList.toggle('text-white', active);
            button.classList.toggle('bg-white', !active);
            button.classList.toggle('text-slate-400', !active);
            button.setAttribute('aria-label', soundData.name);
            button.setAttribute('aria-pressed', String(active));
        }
        if (slider) {
            slider.disabled = !active;
            slider.setAttribute('aria-label', soundData.name);
        }
        this.updateSoundBadge();
    },

    disposeSoundResources(resources) {
        // 一部の生成や停止に失敗しても、作成済みの全ノードを解放する。
        for (const resource of resources) {
            try { resource.stop?.(); } catch (_) {}
        }
        for (const resource of resources) {
            try { resource.dispose?.(); } catch (_) {}
        }
    },

    stopSound(type) {
        this.soundDesired[type] = false;
        this.soundGenerations[type] = (this.soundGenerations[type] || 0) + 1;
        const sound = this.sounds[type];
        delete this.sounds[type];
        if (sound) this.disposeSoundResources([sound]);
        this.syncSoundState(type);
    },

    async toggleSound(type) {
        const soundData = this.soundsData.find((sound) => sound.id === type);
        const button = document.getElementById(`btn-${type}`);
        const slider = document.getElementById(`vol-${type}`);
        if (!soundData || !button || !slider) return;
        const requested = this.soundDesired[type] ?? Boolean(this.sounds[type]);
        if (requested || this.sounds[type]) {
            this.stopSound(type);
            return;
        }

        this.soundDesired[type] = true;
        const generation = (this.soundGenerations[type] || 0) + 1;
        this.soundGenerations[type] = generation;
        const resources = [];
        try {
            const audioReady = await this.ensureAudio();
            if (generation !== this.soundGenerations[type] || !this.soundDesired[type] || this.audioPageSuspended) return;
            if (!audioReady) {
                this.soundDesired[type] = false;
                this.syncSoundState(type);
                return;
            }
            const tone = window.Tone;
            const noise = new tone.Noise(type === 'rain' ? 'pink' : type === 'cafe' ? 'brown' : soundData.type);
            resources.push(noise);
            noise.volume.value = this.sanitizeInteger(slider.value, -60, -10, -20);
            if (type === 'rain') {
                const filter = new tone.AutoFilter('4n', 200, 0.5);
                resources.push(filter);
                filter.toDestination();
                noise.connect(filter);
                filter.start();
            } else if (type === 'cafe') {
                const filter = new tone.Filter(800, 'lowpass');
                resources.push(filter);
                filter.toDestination();
                const lfo = new tone.LFO(0.5, 400, 1000);
                resources.push(lfo);
                lfo.connect(filter.frequency);
                noise.connect(filter);
                lfo.start();
            } else {
                noise.toDestination();
            }
            noise.start();
            this.sounds[type] = {
                volume: noise.volume,
                stop: () => {
                    resources.forEach((resource) => { try { resource.stop?.(); } catch (_) {} });
                },
                dispose: () => {
                    resources.forEach((resource) => { try { resource.dispose?.(); } catch (_) {} });
                }
            };
        } catch (error) {
            this.disposeSoundResources(resources);
            if (generation === this.soundGenerations[type]) this.soundDesired[type] = false;
            console.error('Error playing sound:', error);
        }
        this.syncSoundState(type);
    },

    updateSoundBadge() {
        if (this.dom.soundBadge) {
            this.dom.soundBadge.style.display = Object.keys(this.sounds).length > 0 ? 'block' : 'none';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());

