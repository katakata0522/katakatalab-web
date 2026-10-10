// ============================================================
// ほしぞら・アドベンチャー - script.js (Main Entry)
// ============================================================
import { PLANETS, SECRET_COLUMNS } from './data.js';
import { resolvePlanetImageUrl } from './planet-image-url.mjs';
import { CONFIG } from './config.js';
import { State, StorageHelper } from './state.js';
import { AudioManager as Audio } from './audio-manager.js';
import { UI } from './ui-controller.js';
import { CanvasMap } from './canvas-renderer.js';
import { TaskScope, ModalStack } from './lifecycle.mjs';

// ============================================================
// ============================================================
// Starfield - 共通3D星フィールドクラス（WarpLoader / WarpTransition の共通基盤）
// WarpLoader と WarpTransition のコードを DRY 原則に基づき1クラスに統合。
// パラメータで外観を切り替え、バグ修正が両方に確実に反映される。
// ============================================================
function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

class Starfield {
    constructor({ numStars = 150, speed = 35, maxSpeed = null, blurAlpha = 0.25, lineWidth = 2.0, colorFn = null }) {
        this.numStars = numStars;
        this.speed    = speed;
        this._baseSpeed = speed;
        this.maxSpeed  = maxSpeed ?? speed; // ローダー用の加速上限
        this.blurAlpha = blurAlpha;
        this.lineWidth = lineWidth;
        this.colorFn   = colorFn;           // (i, alpha) => strokeStyle string
        this.canvas    = null;
        this.ctx       = null;
        this.stars     = [];
        this.animId    = null;
        this.running   = false;
        this._resizeHandler = null;
        this.lastFrameTime = null;
    }

    _initStars() {
        this.stars = Array.from({ length: this.numStars }, () => ({
            x: (Math.random() - 0.5) * 1000,
            y: (Math.random() - 0.5) * 1000,
            z: Math.random() * 1000,
        }));
    }

    _resize() {
        if (this.canvas) {
            this.canvas.width  = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    /** ローダー専用：進行度に応じて速度を加速させる */
    setSpeedProgress(progress) {
        this.speed = this._baseSpeed + Math.pow(progress, 2.5) * (this.maxSpeed - this._baseSpeed);
    }

    /** canvasEl を渡して初期化する（ローダー用） */
    mount(canvasEl) {
        this.canvas = canvasEl;
        this.ctx    = canvasEl.getContext('2d');
        this._resize();
        this._resizeHandler = () => this._resize();
        window.addEventListener('resize', this._resizeHandler);
        this._initStars();
        this.running = true;
    }

    /** canvasEl を渡して初期化し、直ちに描画を開始する（ローダー用） */
    startImmediately(canvasEl) {
        this.mount(canvasEl);
        this._draw();
    }

    /** canvas ID を渡して初期化する（トランジション用） */
    mountById(id) {
        const el = document.getElementById(id);
        if (!el) return;
        this.mount(el);
        this.running = false; // start() が呼ばれるまで描画しない
    }

    start() {
        if (this.running) return;
        this._initStars();
        this.running = true;
        this.lastFrameTime = null;
        this._draw();
    }

    _draw(time = performance.now()) {
        this.animId = null;
        if (!this.running || !this.ctx || document.hidden) return;
        const frameScale = this.lastFrameTime === null ? 1 : Math.min(3, Math.max(0, (time - this.lastFrameTime) / (1000 / 60)));
        this.lastFrameTime = time;
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const cx = W / 2;
        const cy = H / 2;

        ctx.fillStyle = `rgba(2, 6, 23, ${1 - Math.pow(1 - this.blurAlpha, frameScale)})`;
        ctx.fillRect(0, 0, W, H);
        ctx.lineWidth = this.lineWidth;

        for (let i = 0; i < this.numStars; i++) {
            const s  = this.stars[i];
            const pz = s.z + this.speed;
            const px1 = (s.x / pz) * W + cx;
            const py1 = (s.y / pz) * H + cy;

            s.z -= this.speed * frameScale;
            if (s.z <= 0) {
                s.x = (Math.random() - 0.5) * 1000;
                s.y = (Math.random() - 0.5) * 1000;
                s.z = 1000;
                continue;
            }

            const px2 = (s.x / s.z) * W + cx;
            const py2 = (s.y / s.z) * H + cy;
            if (px2 < 0 || px2 > W || py2 < 0 || py2 > H) continue;

            const alpha = Math.min(1, (1000 - s.z) / 700);
            ctx.strokeStyle = this.colorFn
                ? this.colorFn(i, alpha, this.speed, this.maxSpeed)
                : `rgba(147, 197, 253, ${alpha})`;

            ctx.beginPath();
            ctx.moveTo(px1, py1);
            ctx.lineTo(px2, py2);
            ctx.stroke();
        }

        this.animId = requestAnimationFrame((time) => this._draw(time));
    }

    stop() {
        this.running = false;
        if (this.animId !== null) cancelAnimationFrame(this.animId);
        this.animId = null;
        this.lastFrameTime = null;
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    setPageVisible(visible) {
        if (this.animId !== null) cancelAnimationFrame(this.animId);
        this.animId = null;
        this.lastFrameTime = null;
        if (visible && this.running) this._draw();
    }

    destroy() {
        this.stop();
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
        // ローダー終了後は画面サイズのビットマップと星配列を保持しない。
        if (this.canvas) {
            this.canvas.width = 0;
            this.canvas.height = 0;
        }
        this.canvas = null;
        this.ctx = null;
        this.stars = [];
    }
}

// ---- ローダー用インスタンス（ロード画面のハイパーワープ演出） ----
const WarpLoader = new Starfield({
    numStars: 220,
    speed: 2,
    maxSpeed: 55,
    blurAlpha: 0.15,
    lineWidth: 1.5,
    colorFn: (i, alpha, speed, maxSpeed) => {
        const f = Math.min(1, speed / maxSpeed);
        if (f > 0.6) return `rgba(255, 255, 255, ${alpha})`;
        return `rgba(${135 + Math.floor(120 * f)}, ${206 + Math.floor(49 * f)}, 250, ${alpha})`;
    }
});

// ---- トランジション用インスタンス（惑星遷移演出） ----
const WarpTransition = new Starfield({
    numStars: 150,
    speed: 35,
    blurAlpha: 0.25,
    lineWidth: 2.0,
    colorFn: (i, alpha) => {
        if (i % 5 === 0) return `rgba(167, 139, 250, ${alpha})`;
        if (i % 3 === 0) return `rgba(6, 182, 212, ${alpha})`;
        return `rgba(147, 197, 253, ${alpha})`;
    }
});

const App = {
    navigation: new TaskScope(),
    quizTasks: new TaskScope(),
    secretTasks: new TaskScope(),
    ufoTasks: new TaskScope(),
    celebrationTasks: new TaskScope(),
    ready: false,
    pageActive: true,
    transitioning: false,

    syncPlayback() {
        if (!this.ready || !this.pageActive || document.hidden || this.hasOpenedModal()) CanvasMap.pause();
        else CanvasMap.play();
    },

    cancelNavigation() {
        this.navigation.cancel();
        this.transitioning = false;
        WarpTransition.stop();
        UI.DOM.warpOverlay.classList.remove('opacity-100');
        UI.DOM.warpOverlay.classList.add('opacity-0', 'pointer-events-none');
        this.modals?.block(!this.ready);
    },

    clearQuizTasks() {
        this.quizTasks.cancel();
        UI.DOM.stamp.classList.add('opacity-0', 'pointer-events-none');
        UI.DOM.stamp.querySelectorAll('.starburst-particle').forEach(node => node.remove());
    },
    async init() {
        UI.init();
        State.init();
        this.modals = new ModalStack(
            [UI.DOM.modal, UI.DOM.ufoModal, UI.DOM.celOverlay, UI.DOM.secretModal],
            [document.querySelector('main > header'), UI.DOM.miniMap, document.getElementById('space-map-viewport'), UI.DOM.ufoBtn, UI.DOM.btnSecretColumn, UI.DOM.pwaToast],
            () => this.syncPlayback()
        );
        this.modals.block(true);
        UI.DOM.bgmToggleBtn?.setAttribute('aria-pressed', String(State.isMuted));
        
        // Initialize cinematic warp canvas (新Starfield API: mountById を使用)
        WarpTransition.mountById('warp-canvas');
        
        // BGMミュートの初期表示同期
        if (State.isMuted) {
            if (UI.DOM.bgmIconOn) UI.DOM.bgmIconOn.classList.add('hidden');
            if (UI.DOM.bgmIconOff) UI.DOM.bgmIconOff.classList.remove('hidden');
        } else {
            if (UI.DOM.bgmIconOn) UI.DOM.bgmIconOn.classList.remove('hidden');
            if (UI.DOM.bgmIconOff) UI.DOM.bgmIconOff.classList.add('hidden');
        }
        
        // canvas-renderer.js から handlePlanetClick / renderMinimapDots を呼べるよう
        // 最小限のブリッジのみグローバルに露出（デバッグ用の State 全体は非公開）
        window._AppBridge = {
            handlePlanetClick: (p) => this.handlePlanetClick(p),
            renderMinimapDots: () => this.renderMinimapDots(),
        };

        // Auto-resume audio on first user touch/drag/click anywhere
        const enableAudio = async () => {
            window.removeEventListener('mousedown', enableAudio);
            window.removeEventListener('touchstart', enableAudio);
            window.removeEventListener('keydown', enableAudio);
            await Audio.ensure();
        };
        window.addEventListener('mousedown', enableAudio);
        window.addEventListener('touchstart', enableAudio, { passive: true });
        window.addEventListener('keydown', enableAudio);

        // 非表示・履歴移動では古いワープを取り消し、音声と描画を同時に休止する。
        const updateVisibility = () => {
            const visible = this.pageActive && !document.hidden;
            if (!visible) {
                this.cancelNavigation();
                this.stopUFO();
            } else this.setupUFO();
            void Audio.setPageVisible(visible);
            WarpLoader.setPageVisible(visible);
            WarpTransition.setPageVisible(visible);
            this.syncPlayback();
        };
        document.addEventListener('visibilitychange', updateVisibility);
        window.addEventListener('pagehide', () => { this.pageActive = false; updateVisibility(); });
        window.addEventListener('pageshow', () => { this.pageActive = true; updateVisibility(); });
        const parentsDialog = document.getElementById('parents-modal');
        if (parentsDialog) {
            new MutationObserver(() => this.syncPlayback()).observe(parentsDialog, { attributes: true, attributeFilter: ['open'] });
        }

        CanvasMap.init();

        // 3D Hyperspace Warp Loading Screen
        const loaderCanvas = document.getElementById('warp-loader-canvas');
        if (loaderCanvas && UI.DOM.loadingOverlay) {
            // Starfield クラスの startImmediately メソッドを使用して初期化と描画を開始
            WarpLoader.startImmediately(loaderCanvas);

            // Fix2: loadPromise は未使用だった → 変数代入をなくし .catch() を追加
            let assetsLoaded = false;
            CanvasMap.loadImages()
                .then(() => { assetsLoaded = true; })
                .catch(e => console.error('[SpaceLab] 画像ロード失敗:', e))
                .finally(() => { assetsLoaded = true; });

            // Smooth progress interpolation (cinematic minimum warp loading of ~2.5s)
            let progress = 0;
            const progressInterval = setInterval(() => {
                if (progress < 0.9) {
                    progress += 0.015; // Smooth progression
                } else if (assetsLoaded) {
                    progress += 0.04;
                }

                if (progress >= 1) {
                    progress = 1;
                    clearInterval(progressInterval);
                    this.completeWarpLoading();
                } else {
                    this.updateLoadingProgress(progress);
                }
            }, 40);
        } else {
            // Fallback if loader screen is missing
            await CanvasMap.loadImages();
            this.ready = true;
            this.modals.block(false);
            this.syncPlayback();
        }

        this.bindModalEvents();
        this.setupUFO();
        this.initSecretColumns();

        // マーカーの押下をドラッグと混同せず、キャンセル時も入力を解放する。
        const mm = UI.DOM.miniMap;
        if (mm) {
            let pointerId = null;
            let startX = 0;
            let dragging = false;
            let suppressClickUntil = 0;
            const handleMMDrag = (clientX) => {
                const rect = mm.getBoundingClientRect();
                const width = rect.width - 16;
                if (width <= 0) return;
                const percent = Math.max(0, Math.min(1, (clientX - rect.left - 8) / width));
                State.scrollX = percent * Math.max(0, State.totalWidth - State.viewportW);
                State.scrollVelocity = 0;
            };
            const endDrag = event => {
                if (event?.type === 'pointerup' && dragging) suppressClickUntil = performance.now() + 400;
                pointerId = null;
                dragging = false;
            };
            mm.addEventListener('pointerdown', event => {
                if (event.button !== 0 || this.hasOpenedModal() || this.transitioning) return;
                pointerId = event.pointerId;
                suppressClickUntil = 0;
                startX = event.clientX;
                dragging = false;
                const marker = event.target.closest('button');
                // ボタン自身に捕捉を残し、動かさないタップは従来どおりワープする。
                (marker || mm).setPointerCapture(pointerId);
                if (!marker) handleMMDrag(event.clientX);
            });
            mm.addEventListener('pointermove', event => {
                if (event.pointerId !== pointerId) return;
                if (Math.abs(event.clientX - startX) >= 4) dragging = true;
                if (dragging) handleMMDrag(event.clientX);
            });
            mm.addEventListener('click', event => {
                if (event.detail > 0 && performance.now() < suppressClickUntil) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }
            }, true);
            for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) mm.addEventListener(type, endDrag);
            window.addEventListener('blur', endDrag);
            document.addEventListener('visibilitychange', endDrag);
        }

        if (UI.DOM.bgmToggleBtn) {
            UI.DOM.bgmToggleBtn.addEventListener('click', () => {
                void Audio.ensure();
                void Audio.toggleMute(UI.DOM.bgmIconOn, UI.DOM.bgmIconOff);
                UI.DOM.bgmToggleBtn.setAttribute('aria-pressed', String(State.isMuted));
            });
        }
        
        // PWA Service Worker is managed globally by the parent PikaLab project.
        // Redundant local sw.js registration removed to prevent scope conflicts and cache pollution.
    },

    updateLoadingProgress(progress) {
        const pct = Math.floor(progress * 100);
        const bar = UI.DOM.loadingProgressBar;
        const text = UI.DOM.loadingPercentage;
        const feed = UI.DOM.loadingStatusFeed;

        if (bar) bar.style.width = `${pct}%`;
        if (text) text.textContent = `WARP JUMP INITIALIZED: ${pct}%`;

        if (feed) {
            let status = '► SYSTEM INITIALIZING...';
            if (progress > 0.92)      status = '► WARNING: WARP DRIVE ENGAGED. HYPERJUMP ACTIVE.';
            else if (progress > 0.80) status = '► ENGAGING HYPERDRIVE MANIFOLD FOR TACHYON JUMP...';
            else if (progress > 0.65) status = '► WARP GENERATOR POWER GRID STABILIZED AT 100%';
            else if (progress > 0.50) status = '► COMPILING SOLAR MAP DATA & STELLAR COORDINATES...';
            else if (progress > 0.35) status = '► CHARGING METRIC COMPRESSION FIELD COILS (1.21 GW)...';
            else if (progress > 0.18) status = '► ESTABLISHING HYPERSPACE TELEMETRY LINK...';
            else                      status = '► SYSTEM DIAGNOSTICS: CORE ONLINE.';
            feed.textContent = status;
        }

        // Fix1: window.WarpLoader 経由ではなく、スコープ内の WarpLoader インスタンスを直接参照
        WarpLoader.setSpeedProgress(progress);
    },

    async completeWarpLoading() {
        // Hyperspace Warp Jump Flash Effect
        const flash = document.getElementById('warp-loader-flash');
        if (flash) {
            flash.classList.remove('opacity-0');
            flash.classList.add('opacity-100');
            // Play warp boom sound if audio is already resumed
            try { Audio.play('fx', 'levelUp', 0.25, 'sawtooth', 0.5); } catch(e) {}
            await new Promise(r => setTimeout(r, 450));
        }

        WarpLoader.destroy();

        if (UI.DOM.loadingOverlay) {
            UI.DOM.loadingOverlay.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => {
                UI.DOM.loadingOverlay.classList.add('hidden');
                if (flash) {
                    flash.classList.remove('opacity-100');
                    flash.classList.add('opacity-0');
                    setTimeout(() => flash.classList.add('hidden'), 500);
                }
            }, 1000);
        }

        this.ready = true;
        this.modals.block(false);
        this.syncPlayback();
    },

    hasOpenedModal() {
        return Boolean(this.modals?.top || document.getElementById('parents-modal')?.open);
    },

    handlePlanetClick(p) {
        if (!this.ready || !this.pageActive || document.hidden || this.hasOpenedModal()) return;
        this.cancelNavigation();
        this.navigationOpener = document.activeElement;
        this._beginPlanetWarp(p);
    },

    _beginPlanetWarp(p) {
        this.transitioning = true;
        this.modals.block(true);
        void Audio.ensure();
        Audio.play('fx', 'click');
        Audio.play('tone', 300, 0.1, 'sawtooth', 0.05);
        this.navigation.later(() => Audio.play('tone', 400, 0.1, 'sawtooth', 0.05), 100);
        this.navigation.later(() => Audio.play('tone', 600, 0.3, 'sawtooth', 0.05), 200);
        UI.DOM.warpOverlay.classList.remove('opacity-0', 'pointer-events-none');
        UI.DOM.warpOverlay.classList.add('opacity-100');
        WarpTransition.start();
        this.navigation.later(() => this.showModal(p), 800);
    },

    showModal(p) {
        this.cancelNavigation();
        this.clearQuizTasks();
        State.currentPlanet = p.id;
        this._updateModalContent(p);
        this._setupQuiz(p);
        this._openModalAnimation();
        this.modals.open(UI.DOM.modal, this.navigationOpener);
        this.quizTasks.later(() => {
            if (this.modals.top === UI.DOM.modal) UI.DOM.closeBtn.focus({ preventScroll: true });
        }, 100);
    },

    /** モーダルの画像・テキスト・クレジット情報を更新する */
    _updateModalContent(p) {
        const d = UI.DOM.detail;
        const cachedImg = State.images[p.id];
        if (d.image) {
            d.image.src = cachedImg ? cachedImg.src : resolvePlanetImageUrl(p.image);
            d.image.style.filter = `drop-shadow(0 0 40px ${p.glowColor || 'rgba(255,255,255,0.4)'})`;
        }

        // textContent を使用してXSSを防ぐ
        if (d.type) d.type.textContent     = p.type;
        if (d.name) d.name.textContent     = p.name;
        if (d.desc) d.desc.textContent     = p.description;
        if (d.size) d.size.textContent     = p.sizeComparison;
        if (d.distance) d.distance.textContent = p.distanceFromSun;
        if (d.temp) d.temp.textContent     = p.temperature;
        if (d.trivia) d.trivia.textContent   = p.trivia;

        if (d.credit) d.credit.textContent = p.imageCredit ? `Image Credit: ${p.imageCredit}` : 'Image Credit: NASA';

        if (d.realPhotoBtn) {
            d.realPhotoBtn.href = p.realPhotoUrl;
            d.realPhotoBtn.style.display = p.realPhotoUrl ? 'inline-flex' : 'none';
        }
    },

    /** クイズ進行度バッジを更新する */
    _updateQuizProgressBadge(solvedCount, totalQuizzes) {
        const titleEl = UI.DOM.quiz.section.querySelector('h3');
        if (titleEl) {
            titleEl.innerHTML = `
                <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                宇宙クイズに挑戦！ <span class="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-[10px] font-bold">調査状況: ${escapeHTML(solvedCount.toString())}/${escapeHTML(totalQuizzes.toString())}</span>
            `;
        }
    },

    /** クイズセクションの状態（未解答 / 全問正解済み）を判定して表示を構築する */
    _setupQuiz(p) {
        this.quizTasks.cancel();
        this.quizAnswered = false;
        UI.DOM.quiz.res.classList.add('opacity-0', 'pointer-events-none');
        UI.DOM.quiz.res.setAttribute('inert', '');

        if (!State.solvedQuizzes[p.id]) State.solvedQuizzes[p.id] = [];
        const solvedCount  = State.solvedQuizzes[p.id].length;
        const totalQuizzes = p.quizzes?.length || 0;
        const isAllSolved  = solvedCount === totalQuizzes;

        // クイズタイトルの進行度バッジを安全に更新
        this._updateQuizProgressBadge(solvedCount, totalQuizzes);

        // 自動救済ロジック: 3問すべて正解しているのに訪問済み（Set）に登録されていない場合
        if (isAllSolved && !State.visited.has(p.id)) {
            this.markVisited(p.id);
        }

        if (totalQuizzes > 0) {
            UI.DOM.quiz.section.classList.remove('hidden');
            
            if (isAllSolved) {
                // 全問正解済み → 復習モード（全問からランダムで1問を表示・操作不可）
                if (this.currentReviewIndex === undefined || this.currentReviewPlanet !== p.id) {
                    this.currentReviewIndex = Math.floor(Math.random() * totalQuizzes);
                    this.currentReviewPlanet = p.id;
                }
                const q = p.quizzes[this.currentReviewIndex];
                UI.DOM.quiz.q.textContent = q.question;
                UI.DOM.quiz.options.innerHTML = '';
                
                q.options.forEach((opt, idx) => {
                    const b = document.createElement('button');
                    b.textContent = opt;
                    b.disabled = true;
                    if (idx === q.correctIndex) {
                        b.className = CONFIG.CLASSES.QUIZ_BTN_CORRECT + ' pointer-events-none';
                        const icon = document.createElement('span');
                        icon.textContent = '✓';
                        icon.className = 'text-green-400 font-black text-lg ml-2 shrink-0';
                        b.appendChild(icon);
                    } else {
                        b.className = CONFIG.CLASSES.QUIZ_BTN_DISABLED;
                    }
                    UI.DOM.quiz.options.appendChild(b);
                });
                
                UI.DOM.quiz.icon.textContent = '⭕';
                UI.DOM.quiz.text.textContent = '完全調査済み (復習モード)';
                UI.DOM.quiz.exp.textContent = q.explanation;
                UI.DOM.quiz.btn.classList.remove('hidden');
                UI.DOM.quiz.btn.textContent = '別のクイズを見る';
                UI.DOM.quiz.btn.onclick = () => {
                    const offset = totalQuizzes > 1 ? 1 + Math.floor(Math.random() * (totalQuizzes - 1)) : 0;
                    this.currentReviewIndex = (this.currentReviewIndex + offset) % totalQuizzes;
                    this._setupQuiz(p);
                    UI.DOM.quiz.btn.focus({ preventScroll: true });
                };
                UI.DOM.quiz.retryBtn.classList.add('hidden');
                
                UI.DOM.quiz.res.classList.remove('max-h-0', 'opacity-0', 'pointer-events-none');
                UI.DOM.quiz.res.classList.add('max-h-[500px]', 'opacity-100', 'pointer-events-auto');
                UI.DOM.quiz.res.removeAttribute('inert');
            } else {
                // 未解答問題をランダムに1問選んで表示
                const unsolved = [];
                for (let i = 0; i < totalQuizzes; i++) {
                    if (!State.solvedQuizzes[p.id].includes(i)) unsolved.push(i);
                }
                const randomIdx = unsolved[Math.floor(Math.random() * unsolved.length)];
                this.currentQuizIndex = randomIdx;
                const q = p.quizzes[randomIdx];
                
                UI.DOM.quiz.q.textContent = q.question;
                UI.DOM.quiz.options.innerHTML = '';
                
                q.options.forEach((opt, idx) => {
                    const b = document.createElement('button');
                    b.textContent = opt;
                    b.className = CONFIG.CLASSES.QUIZ_BTN + ' quiz-cyber-btn';
                    b.onclick = () => this.handleQuiz(q, idx);
                    UI.DOM.quiz.options.appendChild(b);
                });
                
                // 初期状態（回答前）は結果パネルにフォーカスが当たらないよう、ボタンも完全にhiddenにして隠蔽
                UI.DOM.quiz.btn.classList.add('hidden');
                UI.DOM.quiz.retryBtn.classList.add('hidden');
                UI.DOM.quiz.res.classList.add('max-h-0', 'opacity-0', 'pointer-events-none');
                UI.DOM.quiz.res.classList.remove('max-h-[500px]', 'opacity-100', 'pointer-events-auto');
                UI.DOM.quiz.res.setAttribute('inert', '');
            }
        } else {
            UI.DOM.quiz.section.classList.add('hidden');
        }
    },

    /** ワープ次へボタンの可視性・スクロール位置・モーダル表示アニメーションを実行する */
    _openModalAnimation() {
        if (State.visited.size < PLANETS.length) UI.DOM.warpNextBtn.classList.remove('hidden');
        else UI.DOM.warpNextBtn.classList.add('hidden');

        if (UI.DOM.modalBody) UI.DOM.modalBody.scrollTop = 0;
        else UI.DOM.modal.scrollTop = 0;

        UI.DOM.modal.classList.remove('opacity-0', 'pointer-events-none');
        UI.DOM.modal.classList.add('opacity-100');
        
        Audio.play('tone', 600, 0.1, 'sine', 0.1);
        this.quizTasks.later(() => Audio.play('tone', 800, 0.4, 'sine', 0.1), 100);
    },


    handleQuiz(quizObj, idx) {
        const ok = idx === quizObj.correctIndex;
        const currentPlanetId = State.currentPlanet;
        const p = PLANETS.find(x => x.id === currentPlanetId);
        if (!p || this.quizAnswered || this.modals.top !== UI.DOM.modal || p.quizzes[this.currentQuizIndex] !== quizObj) return;
        
        const buttons = UI.DOM.quiz.options.children;
        
        if (ok) {
            this.quizAnswered = true;
            // 正解の場合：すべてのボタンをロックし、結果パネルを表示する
            for (let i = 0; i < buttons.length; i++) {
                buttons[i].disabled = true;
                buttons[i].onclick = null;
                
                if (i === idx) {
                    buttons[i].className = CONFIG.CLASSES.QUIZ_BTN_CORRECT;
                    if (!buttons[i].querySelector('.correct-icon')) {
                        const icon = document.createElement('span');
                        icon.textContent = '✓';
                        icon.className = 'correct-icon text-green-400 font-black text-lg ml-2 shrink-0';
                        buttons[i].appendChild(icon);
                    }
                } else {
                    buttons[i].className = CONFIG.CLASSES.QUIZ_BTN_DISABLED;
                }
            }

            UI.DOM.quiz.icon.textContent = '⭕';
            UI.DOM.quiz.text.textContent = '大正解！';
            UI.DOM.quiz.exp.textContent = quizObj.explanation;
            
            UI.DOM.quiz.res.classList.remove('max-h-0', 'opacity-0', 'pointer-events-none');
            UI.DOM.quiz.res.classList.add('max-h-[500px]', 'opacity-100', 'pointer-events-auto');
            UI.DOM.quiz.res.removeAttribute('inert');

            Audio.play('fx', 'correct');
            
            // 正解インデックスを保存
            if (!State.solvedQuizzes[currentPlanetId]) {
                State.solvedQuizzes[currentPlanetId] = [];
            }
            if (!State.solvedQuizzes[currentPlanetId].includes(this.currentQuizIndex)) {
                State.solvedQuizzes[currentPlanetId].push(this.currentQuizIndex);
                State.save();
            }
            
            const solvedCount = State.solvedQuizzes[currentPlanetId].length;
            const totalQuizzes = p.quizzes?.length || 0;
            
            // 即時進行度インジケーターを更新
            this._updateQuizProgressBadge(solvedCount, totalQuizzes);
            
            if (solvedCount === totalQuizzes) {
                // バグ①救済：2秒待たずに即座にmarkVisitedを呼んでStateを同期する！
                this.markVisited(currentPlanetId);

                // 全問制覇時
                UI.DOM.quiz.btn.textContent = '了解！';
                UI.DOM.quiz.btn.classList.remove('hidden');
                UI.DOM.quiz.btn.onclick = () => {
                    UI.DOM.quiz.btn.onclick = null;
                    UI.DOM.quiz.res.classList.remove('max-h-[500px]', 'opacity-100', 'pointer-events-auto');
                    UI.DOM.quiz.res.classList.add('max-h-0', 'opacity-0', 'pointer-events-none');
                    UI.DOM.quiz.res.setAttribute('inert', '');
                    this.quizTasks.later(() => {
                        UI.DOM.quiz.btn.classList.add('hidden');
                    }, 500);
                };
                UI.DOM.quiz.retryBtn.classList.add('hidden');
                this.quizTasks.later(() => this.showStamp(currentPlanetId), 500);
            } else {
                // まだ未正解のクイズがある
                UI.DOM.quiz.btn.textContent = '次の問題へ';
                UI.DOM.quiz.btn.classList.remove('hidden');
                UI.DOM.quiz.retryBtn.classList.add('hidden');
                UI.DOM.quiz.btn.onclick = () => {
                    UI.DOM.quiz.btn.onclick = null;
                    UI.DOM.quiz.res.classList.remove('max-h-[500px]', 'opacity-100', 'pointer-events-auto');
                    UI.DOM.quiz.res.classList.add('max-h-0', 'opacity-0', 'pointer-events-none');
                    UI.DOM.quiz.res.setAttribute('inert', '');
                    // クイズセクションのみを局所的に再構築してチラつきを防止
                    this.quizTasks.later(() => {
                        UI.DOM.quiz.btn.classList.add('hidden');
                        this._setupQuiz(p);
                        UI.DOM.quiz.options.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
                    }, 400);
                };
            }
        } else {
            // 不正解の場合：クリックした選択肢のみを赤色（✗）にして無効化（disabled）。他はそのまま
            const wrongBtn = buttons[idx];
            wrongBtn.disabled = true;
            wrongBtn.onclick = null;
            wrongBtn.className = CONFIG.CLASSES.QUIZ_BTN_WRONG;
            if (!wrongBtn.querySelector('.wrong-icon')) {
                const icon = document.createElement('span');
                icon.textContent = '✗';
                icon.className = 'wrong-icon text-red-400 font-black text-lg ml-2 shrink-0';
                wrongBtn.appendChild(icon);
            }
            
            // はかせのヒントの表示（その惑星の豆知識をヒントとして再利用）
            UI.DOM.quiz.icon.textContent = '💡';
            UI.DOM.quiz.text.textContent = 'ちがうみたいじゃ！';
            
            const hintText = p.trivia ? `はかせのヒント：『${p.trivia}』という話を知っておるかな？これを参考に考えてみるのじゃ！` : 'もう一度よく考えてみるのじゃ！';
            UI.DOM.quiz.exp.textContent = hintText;
            
            // 選択肢はそのまま選び直せるため「了解！」や「リトライ」ボタンは非表示
            UI.DOM.quiz.btn.classList.add('hidden');
            UI.DOM.quiz.retryBtn.classList.add('hidden');
            
            UI.DOM.quiz.res.classList.remove('max-h-0', 'opacity-0', 'pointer-events-none');
            UI.DOM.quiz.res.classList.add('max-h-[500px]', 'opacity-100', 'pointer-events-auto');
            UI.DOM.quiz.res.removeAttribute('inert');

            // 効果音を鳴らす
            Audio.play('tone', 150, 0.3, 'sawtooth', 0.1);
        }
    },

    showStamp(id) {
        UI.DOM.stamp.classList.remove('opacity-0', 'pointer-events-none');
        this._spawnStarburst();
        Audio.play('fx', 'levelUp');
        this.quizTasks.later(() => {
            UI.DOM.stamp.classList.add('opacity-0', 'pointer-events-none');
            if (State.visited.size < PLANETS.length) UI.DOM.warpNextBtn.classList.remove('hidden');
            else UI.DOM.warpNextBtn.classList.add('hidden');
        }, 1500);
    },

    _spawnStarburst() {
        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            p.className = 'starburst-particle';
            const angle = Math.random() * Math.PI * 2;
            const dist  = 50 + Math.random() * 100;
            p.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
            p.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
            p.style.left = '50%'; p.style.top = '50%';
            UI.DOM.stamp.appendChild(p);
            this.quizTasks.later(() => p.remove(), 600);
        }
    },

    markVisited(id) {
        if (!State.visited.has(id)) {
            State.visited.add(id); 
            State.save();
            this.updateBadgeHeaderUI(); // ヘッダーのバッジと進行度インジケーターを更新
            if (State.visited.size === PLANETS.length) this.celebrationTasks.later(() => this.checkCel(), 800);
            this.renderMinimapDots(); // ミニマップドットをVisitedカラーに即時更新
        }
    },

    checkCel() {
        const hasSeenBadge = StorageHelper.getItem(CONFIG.STORAGE_KEY_BADGE) === 'true';
        if (!hasSeenBadge) {
            this.cancelNavigation();
            Audio.play('fx', 'levelUp');
            UI.DOM.celOverlay.classList.remove('opacity-0', 'pointer-events-none');
            UI.DOM.celOverlay.classList.add('opacity-100');
            this.modals.open(UI.DOM.celOverlay);
            
            this.celebrationTasks.later(() => { 
                UI.DOM.celBox.classList.remove('scale-90'); 
                UI.DOM.celBox.classList.add('scale-100'); 
                UI.DOM.closeCelBtn?.focus();
            }, 100);
            this.unlockSecretColumns();
        }
    },

    closeModal(restoreFocus = true) {
        this.clearQuizTasks();
        Audio.play('fx', 'click');
        UI.DOM.modal.classList.remove('opacity-100');
        UI.DOM.modal.classList.add('opacity-0', 'pointer-events-none');
        this.modals.close(UI.DOM.modal, restoreFocus);
    },

    closeUfo() {
        UI.DOM.ufoModal.classList.remove('opacity-100', 'pointer-events-auto');
        UI.DOM.ufoModal.classList.add('opacity-0', 'pointer-events-none');
        this.ufoTasks.cancel();
        this.modals.close(UI.DOM.ufoModal);
    },

    closeCelebration() {
        this.celebrationTasks.cancel();
        UI.DOM.celOverlay.classList.remove('opacity-100');
        UI.DOM.celOverlay.classList.add('opacity-0', 'pointer-events-none');
        UI.DOM.celBox.classList.remove('scale-100');
        UI.DOM.celBox.classList.add('scale-90');
        StorageHelper.setItem(CONFIG.STORAGE_KEY_BADGE, 'true');
        this.updateBadgeHeaderUI();
        this.modals.close(UI.DOM.celOverlay);
    },

    closeSecret() {
        this.secretTasks.cancel();
        UI.DOM.secretModal.classList.remove('opacity-100', 'pointer-events-auto');
        UI.DOM.secretModal.classList.add('opacity-0', 'pointer-events-none');
        this.modals.close(UI.DOM.secretModal);
        this.secretTasks.later(() => UI.DOM.secretModal.classList.add('hidden'), 300);
    },

    autoPilot() {
        const next = PLANETS.find(p => !State.visited.has(p.id));
        if (next) this.autoPilotToPlanet(next.id);
    },

    autoPilotToPlanet(planetId) {
        const pd = State.planetData.find(p => p.id === planetId);
        if (!pd || !this.ready || !this.pageActive || document.hidden) return;
        this.cancelNavigation();
        this.navigationOpener = this.modals.top === UI.DOM.modal
            ? this.modals.stack.find(entry => entry.element === UI.DOM.modal)?.opener
            : document.activeElement;
        if (this.modals.top === UI.DOM.modal) this.closeModal(false);
        if (this.hasOpenedModal()) return;
        this.transitioning = true;
        this.modals.block(true);
        State.scrollVelocity = 0;
        UI.DOM.warpOverlay.classList.remove('opacity-0', 'pointer-events-none');
        UI.DOM.warpOverlay.classList.add('opacity-100');
        WarpTransition.start();
        const start = State.scrollX;
        const t0 = performance.now();
        const ease = t => t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
        const animate = () => {
            const current = State.planetData.find(planet => planet.id === planetId);
            const dest = Math.max(0, Math.min(current.cx - State.viewportW / 2, State.totalWidth - State.viewportW));
            const progress = Math.min((performance.now() - t0) / CONFIG.UI.WARP_DURATION_MS, 1);
            State.scrollX = start + (dest - start) * ease(progress);
            if (progress < 1) this.navigation.frame(animate);
            else this.navigation.later(() => this._beginPlanetWarp(current), 400);
        };
        animate();
    },

    renderMinimapDots() {
        if (!UI.DOM.minimapMarkers) return;
        const totalW = State.totalWidth || 1;
        
        State.planetData.forEach(p => {
            const pct = (p.cx / totalW) * 100;
            
            let btn = UI.DOM.minimapMarkers.querySelector(`[data-planet="${p.id}"]`);
            if (!btn) {
                btn = document.createElement('button');
                btn.dataset.planet = p.id;
                btn.onclick = (event) => {
                    event.stopPropagation();
                    Audio.play('fx', 'click');
                    this.autoPilotToPlanet(p.id);
                };
                UI.DOM.minimapMarkers.appendChild(btn);
            }
            btn.className = 'absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 transition-all cursor-pointer shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-1 focus:ring-offset-slate-900 z-20';
            btn.style.left = `${pct}%`;
            
            const isVisited = State.visited.has(p.id);
            if (isVisited) {
                btn.className += ' bg-emerald-500 border-emerald-300 hover:bg-emerald-400 hover:scale-125 hover:shadow-[0_0_12px_rgba(16,185,129,0.9)]';
            } else {
                btn.className += ' bg-slate-700 border-slate-400 hover:bg-cyan-400 hover:border-cyan-300 hover:scale-125 hover:shadow-[0_0_12px_rgba(6,182,212,0.9)]';
            }
            
            btn.title = p.name;
            btn.setAttribute('aria-label', `${p.name}へワープ`);
            
        });
    },

    bindModalEvents() {
        UI.DOM.closeBtn.addEventListener('click', () => this.closeModal());
        UI.DOM.closeModalBottomBtn?.addEventListener('click', () => this.closeModal());
        UI.DOM.closeUfoBtn?.addEventListener('click', () => this.closeUfo());
        UI.DOM.closeCelBtn?.addEventListener('click', () => this.closeCelebration());
        UI.DOM.warpNextBtn?.addEventListener('click', () => this.autoPilot());
        document.addEventListener('keydown', event => {
            const parents = document.getElementById('parents-modal');
            this.modals.trap(event, parents?.open ? parents : this.modals.top);
            if (event.key !== 'Escape') return;
            const top = this.modals.top;
            if (top === UI.DOM.celOverlay) this.closeCelebration();
            else if (top === UI.DOM.ufoModal) this.closeUfo();
            else if (top === UI.DOM.secretModal) this.closeSecret();
            else if (top === UI.DOM.modal) this.closeModal();
            else if (this.transitioning) {
                this.cancelNavigation();
                this.navigationOpener?.focus({ preventScroll: true });
            } else return;
            event.preventDefault();
        });
    },

    hideUFO() {
        this.ufoTasks.cancel();
        UI.DOM.ufoBtn.classList.add('opacity-0', 'pointer-events-none');
        UI.DOM.ufoBtn.setAttribute('tabindex', '-1');
        UI.DOM.ufoBtn.style.transition = 'none';
        UI.DOM.ufoBtn.style.left = '-100px';
    },

    setupUFO() {
        if (State.ufoInterval || !UI.DOM.ufoBtn || document.hidden || !this.pageActive) return;
        State.ufoInterval = setInterval(() => {
            if (!this.ready || this.hasOpenedModal() || this.transitioning) return;
            if (Math.random() >= CONFIG.UI.UFO_SPAWN_CHANCE || !UI.DOM.ufoBtn.classList.contains('opacity-0')) return;
            const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
            const top = Math.random() < 0.5 ? 12 + Math.random() * 13 : 75 + Math.random() * 13;
            UI.DOM.ufoBtn.style.top = `${top}%`;
            UI.DOM.ufoBtn.style.left = reducedMotion ? '50vw' : '-100px';
            UI.DOM.ufoBtn.style.transition = 'none';
            UI.DOM.ufoBtn.classList.remove('opacity-0', 'pointer-events-none');
            UI.DOM.ufoBtn.setAttribute('tabindex', '0');
            if (!reducedMotion) this.ufoTasks.later(() => {
                UI.DOM.ufoBtn.style.transition = 'left 15s linear';
                UI.DOM.ufoBtn.style.left = '120vw';
            }, 50);
            this.ufoTasks.later(() => this.hideUFO(), 15000);
        }, CONFIG.UI.UFO_INTERVAL_MS);
        UI.DOM.ufoBtn.onclick = () => {
            if (this.hasOpenedModal() || this.transitioning) return;
            const opener = document.activeElement === UI.DOM.ufoBtn ? UI.DOM.headerBadgeBtn : document.activeElement;
            Audio.play('fx', 'correct');
            this.hideUFO();
            UI.DOM.ufoModal.classList.remove('opacity-0', 'pointer-events-none');
            UI.DOM.ufoModal.classList.add('opacity-100', 'pointer-events-auto');
            this.modals.open(UI.DOM.ufoModal, opener);
            this.ufoTasks.later(() => {
                if (this.modals.top === UI.DOM.ufoModal) UI.DOM.closeUfoBtn?.focus({ preventScroll: true });
            }, 50);
        };
        if (!UI.DOM.ufoBtn.dataset.keyboardReady) {
            UI.DOM.ufoBtn.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    UI.DOM.ufoBtn.click();
                }
            });
            UI.DOM.ufoBtn.dataset.keyboardReady = 'true';
        }
    },

    stopUFO() {
        clearInterval(State.ufoInterval);
        State.ufoInterval = null;
        this.hideUFO();
    },

    unlockSecretColumns() {
        if (!UI.DOM.btnSecretColumn) return;
        UI.DOM.btnSecretColumn.classList.remove('hidden');
        void UI.DOM.btnSecretColumn.offsetWidth;
        UI.DOM.btnSecretColumn.classList.remove('opacity-0', 'pointer-events-none');
        UI.DOM.btnSecretColumn.classList.add('opacity-100', 'pointer-events-auto', 'flex');
    },

    initSecretColumns() {
        // ヘッダーの常設バッジボタンのバインド
        if (UI.DOM.headerBadgeBtn) {
            UI.DOM.headerBadgeBtn.addEventListener('click', () => {
                Audio.play('fx', 'click');
                this.openSecretModal();
            });
        }

        // 初期ロード時にバッジヘッダーUIの更新
        this.updateBadgeHeaderUI();

        if (UI.DOM.btnSecretColumn) {
            UI.DOM.btnSecretColumn.addEventListener('click', () => {
                Audio.play('fx', 'click');
                this.openSecretModal();
            });
        }
        UI.DOM.btnCloseSecret?.addEventListener('click', () => {
            Audio.play('fx', 'click');
            this.closeSecret();
        });
    },

    updateBadgeHeaderUI() {
        const hasSeenBadge = StorageHelper.getItem(CONFIG.STORAGE_KEY_BADGE) === 'true';
        const isAllVisited = State.visited && State.visited.size === PLANETS.length;

        if (isAllVisited) {
            this.unlockSecretColumns();
            if (hasSeenBadge) {
                if (UI.DOM.headerBadgeDot) UI.DOM.headerBadgeDot.classList.add('hidden');
            } else {
                if (UI.DOM.headerBadgeDot) UI.DOM.headerBadgeDot.classList.remove('hidden');
            }
        } else {
            if (UI.DOM.headerBadgeDot) UI.DOM.headerBadgeDot.classList.add('hidden');
        }
    },

    openSecretModal() {
        this.secretTasks.cancel();
        this.cancelNavigation();
        UI.DOM.secretModal.classList.remove('hidden');
        void UI.DOM.secretModal.offsetWidth;
        UI.DOM.secretModal.classList.remove('opacity-0', 'pointer-events-none');
        UI.DOM.secretModal.classList.add('opacity-100', 'pointer-events-auto');
        this.modals.open(UI.DOM.secretModal);

        const isAllVisited = State.visited && State.visited.size === PLANETS.length;
        if (isAllVisited) {
            StorageHelper.setItem(CONFIG.STORAGE_KEY_BADGE, 'true');
            if (UI.DOM.headerBadgeDot) UI.DOM.headerBadgeDot.classList.add('hidden');
        }

        this.renderBadgeStatus();
        this.renderSecretTabs();

        this.secretTasks.later(() => {
            if (this.modals.top === UI.DOM.secretModal) UI.DOM.btnCloseSecret?.focus({ preventScroll: true });
        }, 100);
    },

    renderBadgeStatus() {
        if (!UI.DOM.badgeStatusContainer) return;
        const total = PLANETS.length;
        const current = State.visited ? State.visited.size : 0;
        const earned = current === total;
        const pct = Math.floor((current / total) * 100);

        const currentEscaped = escapeHTML(current.toString());
        const totalEscaped = escapeHTML(total.toString());
        const pctEscaped = escapeHTML(pct.toString());
        const badgeTitle = earned ? '太陽系マスター制覇' : '宇宙飛行士 (解析中)';
        const badgeTitleClass = earned ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 text-neon-amber' : 'text-slate-300 font-bold';

        UI.DOM.badgeStatusContainer.innerHTML = `
            <div class="relative w-full overflow-hidden p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/90 via-slate-950/90 to-blue-950/90 border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.25)] flex flex-col items-center hud-scanlines">
                <!-- ホログラフィックスキャンライン -->
                <div class="hologram-scan-line"></div>
                <!-- パスポート上部のSFヘッダー -->
                <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500"></div>
                <div class="w-full flex justify-between items-center text-[7px] font-mono text-cyan-400/90 tracking-widest uppercase mb-2.5 border-b border-cyan-500/20 pb-1">
                    <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>DEEP-SPACE PASSPORT</span>
                    <span class="font-bold">SECURE LOG</span>
                </div>
                
                <div class="flex items-center gap-3.5 w-full">
                    <!-- バッジ（アバター） - 横にコンパクト配置 -->
                    <div class="relative flex items-center justify-center shrink-0">
                        <div class="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping pointer-events-none ${earned ? '' : 'hidden'}"></div>
                        <div class="w-12 h-12 rounded-full bg-slate-900/90 border ${earned ? 'border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.4)]' : 'border-cyan-500/30 shadow-[inset_0_0_10px_rgba(6,182,212,0.2)]'} flex items-center justify-center text-2xl filter ${earned ? 'drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'grayscale opacity-50'}">
                            ${earned ? '🎖️' : '🛸'}
                        </div>
                    </div>
                    
                    <!-- ステータス ＆ 進捗メッセージ -->
                    <div class="flex-1 min-w-0 text-left">
                        <h3 class="font-black text-xs tracking-wider mb-0.5 ${badgeTitleClass}">
                            ${escapeHTML(badgeTitle)}
                        </h3>
                        <p class="text-[9px] text-slate-400 leading-tight">
                            ${earned 
                                ? 'すべての星を巡り、ライセンスを完全承認したよ！' 
                                : `クイズ解析完了: <span class="text-cyan-400 font-bold">${currentEscaped} / ${totalEscaped} セクター</span>`}
                        </p>
                    </div>
                </div>
                
                <!-- プログレスバー - 下部に配置 -->
                <div class="w-full mt-2.5">
                    <div class="w-full h-1.5 bg-slate-950 rounded-full border border-cyan-500/20 overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
                        <div class="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${earned ? 'from-yellow-400 via-amber-500 to-yellow-300' : 'from-cyan-500 via-blue-500 to-indigo-500'}"
                             style="width: ${pctEscaped}%"></div>
                    </div>
                    <div class="flex justify-between text-[7px] font-mono text-slate-500 mt-1 tracking-wider">
                        <span>LAUNCH PREP</span>
                        <span class="text-cyan-400 font-bold text-neon-cyan">${pctEscaped}% COMPLETE</span>
                        <span>STABLE ORBIT</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderSecretTabs() {
        UI.DOM.secretTabsContainer.innerHTML = '';
        const total = PLANETS.length;
        const current = State.visited ? State.visited.size : 0;

        SECRET_COLUMNS.forEach((col, i) => {
            const btn = document.createElement('button');
            btn.className = CONFIG.CLASSES.SECRET_TAB + ' border border-slate-700/60 transition-all relative';
            
            const isUnlocked = current > i; // 1星クリアでインデックス0のファイル①が解放

            const div = document.createElement('div');
            div.className = isUnlocked 
                ? `bg-${escapeHTML(col.color)}-500/10 p-2 rounded-lg text-${escapeHTML(col.color)}-400 group-hover:scale-105 transition-transform border border-${escapeHTML(col.color)}-500/30`
                : 'bg-slate-900/60 p-2 rounded-lg text-slate-500 transition-transform border border-slate-700/40';
            const spanIcon = document.createElement('span');
            spanIcon.className = 'material-symbols-rounded';
            spanIcon.textContent = isUnlocked ? col.icon : 'lock';
            div.appendChild(spanIcon);
            
            const spanText = document.createElement('span');
            spanText.className = isUnlocked ? 'font-bold text-xs text-slate-200 tracking-wider' : 'font-bold text-xs text-slate-500 tracking-wider';
            spanText.textContent = col.title.split('：')[0];
            
            btn.appendChild(div);
            btn.appendChild(spanText);

            // 未読通知ドットの追加 (案⑥)
            let unreadDot = null;
            if (isUnlocked) {
                const isRead = State.readSecrets.includes(col.id);
                if (!isRead) {
                    unreadDot = document.createElement('span');
                    unreadDot.className = 'w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] inline-block shrink-0 ml-auto mr-1 animate-pulse';
                    btn.appendChild(unreadDot);
                }
            }

            if (!isUnlocked) {
                btn.addEventListener('click', () => {
                    Audio.play('tone', 150, 0.2, 'sawtooth', 0.1);
                    Array.from(UI.DOM.secretTabsContainer.children).forEach(c => {
                        c.className = CONFIG.CLASSES.SECRET_TAB + ' border border-slate-700/60 relative';
                    });
                    btn.className = CONFIG.CLASSES.SECRET_TAB + ' border-red-500/50 bg-red-950/20 relative';
                    
                    const needed = (i + 1) - current;
                    const unvisited = PLANETS.filter(p => !State.visited.has(p.id)).map(p => p.name);
                    const listHtml = unvisited.length > 0
                        ? `<div class="mt-4 p-4 bg-slate-950/80 rounded-xl border border-red-500/30 text-left w-full max-w-sm shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                             <p class="text-[9px] font-mono font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 animate-pulse">
                               <span class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>⚠️ SECTOR ANOMALY DETECTED
                             </p>
                             <p class="text-[9px] font-mono text-slate-500 mb-2">以下の座標に未確認のデータシグナルが存在します。該当エリアのクイズプロトコルを解除してください。</p>
                             <ul class="text-xs text-slate-300 space-y-1.5 font-bold">
                               ${unvisited.map(name => `<li class="flex items-center gap-2"><span class="text-red-500">►</span>${escapeHTML(name)}</li>`).join('')}
                             </ul>
                           </div>`
                        : '';
                    
                    UI.DOM.secretContentArea.innerHTML = `
                        <div class="text-center text-slate-400 py-6 flex flex-col items-center justify-center h-full relative">
                            <span class="material-symbols-rounded text-6xl text-red-500/60 mb-3 animate-pulse">lock</span>
                            <h3 class="text-base font-black text-white mb-2 tracking-widest text-neon-pink">DATA STREAM ENCRYPTED</h3>
                            <p class="text-xs max-w-sm leading-relaxed text-slate-400">
                                解読（アンロック）には、あと <span class="text-rose-400 font-black text-sm mx-1">${escapeHTML(needed.toString())}個</span> の天体を完全調査（クイズ制覇）する必要があります。
                             </p>
                            ${listHtml}
                        </div>
                    `;
                });
            } else {
                btn.addEventListener('click', () => {
                    Audio.play('fx', 'click');
                    Array.from(UI.DOM.secretTabsContainer.children).forEach(c => {
                        c.className = CONFIG.CLASSES.SECRET_TAB + ' border border-slate-700/60 relative';
                    });
                    btn.className = CONFIG.CLASSES.SECRET_TAB + ' secret-tab-neon-active relative';
                    
                    // 既読化＆保存処理 (案⑥)
                    if (!State.readSecrets.includes(col.id)) {
                        State.readSecrets.push(col.id);
                        State.save();
                        if (unreadDot) {
                            unreadDot.remove();
                            unreadDot = null;
                        }
                    }

                    UI.DOM.secretContentArea.innerHTML = `
                        <div class="w-full flex items-center justify-between text-[8px] font-mono text-${escapeHTML(col.color)}-400/80 tracking-widest uppercase mb-4 border-b border-indigo-500/20 pb-2">
                            <span>TRANSMISSION OK</span>
                            <span>DATALOG ID: SC-${escapeHTML(col.id.toUpperCase())}</span>
                        </div>
                        <h3 class="text-base md:text-lg font-black text-${escapeHTML(col.color)}-300 mb-4 tracking-wider flex items-center gap-2">
                            <span class="material-symbols-rounded text-xl">${escapeHTML(col.icon)}</span>
                            ${escapeHTML(col.title)}
                        </h3>
                        <div class="space-y-4 text-xs md:text-sm text-slate-300 leading-relaxed custom-scrollbar overflow-y-auto max-h-[360px] pr-1">
                            ${col.content}
                        </div>
                    `;
                });
            }

            UI.DOM.secretTabsContainer.appendChild(btn);
            if (i === 0) btn.click();
        });
    }
};

async function cleanupLegacySpaceLabServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const legacyScope = new URL('./', window.location.href).href;
    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
            registrations
                .filter((registration) => registration.scope === legacyScope)
                .map((registration) => registration.unregister())
        );
        if ('caches' in window) await caches.delete('spacelab-cache-v4');
    } catch (error) {
        console.warn('[SpaceLab] 旧Service Workerの解除に失敗しました:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    void cleanupLegacySpaceLabServiceWorker();
    App.init();
});

