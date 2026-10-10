import { eventBus } from '../core/EventBus';
import { CONFIG } from '../core/config';
import { StorageManager } from '../core/StorageManager';
import { escapeHTML } from '../utils/dom';
import { deepSeaData, DeepSeaItem } from '../data';
import { playSound } from '../audio';
import { ConfettiManager } from '../utils/confetti';

export class AlbumManager {
    private storage: StorageManager;
    private capturedIds: Set<string>;
    private allCreatures: DeepSeaItem[];
    private dataMap: Record<string, DeepSeaItem>;

    private modal: HTMLElement | null;
    private albumModal: HTMLElement | null;
    private albumGrid: HTMLElement | null;
    private albumCount: HTMLElement | null;
    private albumProgress: HTMLElement | null;

    private confetti: ConfettiManager;
    private isJustCompleted: boolean = false;
    private completionModal: HTMLElement | null;
    private solvedQuizIds: Set<string>;
    private currentItem: DeepSeaItem | null = null;
    private modalOpeners = new Map<HTMLElement, HTMLElement | null>();
    private blockedElements = new Map<HTMLElement, boolean>();
    private scrollOverflow: { x: string; y: string; xPriority: string; yPriority: string } | null = null;
    private completionTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        this.storage = new StorageManager();
        this.capturedIds = new Set(this.storage.load());
        this.solvedQuizIds = new Set(this.storage.loadQuiz());
        
        this.allCreatures = [];
        deepSeaData.forEach(item => {
            if (item.type === 'battle' && item.participants) {
                item.participants.forEach(p => this.allCreatures.push(p));
            } else if (item.type !== 'battle') {
                this.allCreatures.push(item);
            }
        });
        this.dataMap = Object.fromEntries(this.allCreatures.map(item => [item.id, item]));

        this.modal = document.getElementById('sea-modal');
        this.albumModal = document.getElementById('album-modal');
        this.albumGrid = document.getElementById('album-grid');
        this.albumCount = document.getElementById('album-count');
        this.albumProgress = document.getElementById('album-progress');

        // #3: Null check warning logs for DOM elements
        if (!this.modal) console.warn("AlbumManager: Element with id 'sea-modal' not found.");
        if (!this.albumModal) console.warn("AlbumManager: Element with id 'album-modal' not found.");
        if (!this.albumGrid) console.warn("AlbumManager: Element with id 'album-grid' not found.");
        if (!this.albumCount) console.warn("AlbumManager: Element with id 'album-count' not found.");
        if (!this.albumProgress) console.warn("AlbumManager: Element with id 'album-progress' not found.");

        this.completionModal = document.getElementById('completion-modal');
        this.confetti = new ConfettiManager('confetti-canvas');

        this.bindEvents();
    }

    init(): void {
        this.updateHeaderUI();
        eventBus.emit(CONFIG.EVENTS.PHOTO_CAPTURED, Array.from(this.capturedIds));
    }

    has(id: string): boolean {
        return this.capturedIds.has(id);
    }

    private save(): void {
        this.storage.save(Array.from(this.capturedIds));
    }

    private updateHeaderUI(): void {
        const progressText = document.getElementById('album-progress');
        const progressBar = document.getElementById('album-progress-bar');
        
        if (this.albumCount) this.albumCount.textContent = this.capturedIds.size.toString();
        
        const total = this.allCreatures.length;
        if (progressText) progressText.textContent = `${this.capturedIds.size}/${total} 完了`;
        
        if (progressBar) {
            const pct = (this.capturedIds.size / total) * 100;
            progressBar.style.width = `${pct}%`;
        }
    }

    private renderAlbumGrid(): void {
        if (!this.albumGrid) return;
        this.albumGrid.innerHTML = '';
        
        const creatures = this.allCreatures.filter(item => !item.is_artifact);
        const landmarks = this.allCreatures.filter(item => item.is_artifact);
        
        const createSection = (title: string, items: DeepSeaItem[]) => {
            const sectionTitle = document.createElement('h3');
            sectionTitle.className = 'col-span-full text-left text-lg md:text-xl font-bold text-indigo-300 mt-4 border-b border-indigo-500/30 pb-2';
            sectionTitle.textContent = title;
            this.albumGrid!.appendChild(sectionTitle);
            
            items.forEach(item => {
                const isCaptured = this.has(item.id);
                const div = document.createElement('div');
                div.className = `p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-2 transition-all ${
                    isCaptured
                        ? 'bg-indigo-900/30 border-indigo-500/50 hover:bg-indigo-800/50 cursor-pointer'
                        : 'bg-black/50 border-white/10 opacity-70 cursor-not-allowed'
                }`;
                
                div.innerHTML = `
                    <div class="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 ${isCaptured ? 'border-indigo-400' : 'border-slate-700'} bg-black">
                        <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}" class="w-full h-full object-cover ${isCaptured ? '' : 'opacity-30 blur-sm'}">
                        ${!isCaptured ? '<div class="absolute inset-0 flex items-center justify-center text-white font-black text-2xl">?</div>' : ''}
                    </div>
                    <div class="text-xs md:text-sm font-bold text-white leading-tight h-8 flex items-center justify-center w-full">
                        ${isCaptured ? escapeHTML(item.title) : '未発見'}
                    </div>
                    <div class="text-[10px] text-indigo-300 font-mono">
                        ${isCaptured ? escapeHTML(item.depthRange) : '水深: ???'}
                    </div>
                `;
                
                if (isCaptured) {
                    div.addEventListener('click', () => {
                        this.closeModal(this.albumModal);
                        this.showFact(item.id, false);
                    });
                }
                this.albumGrid!.appendChild(div);
            });
        };
        
        createSection('深海生物', creatures);
        createSection('ランドマーク', landmarks);
    }

    registerCreature(id: string): void {
        const isNew = !this.has(id);

        if (isNew) {
            // 新発見エフェクト: 青い発光フラッシュ
            const flash = document.createElement('div');
            flash.className = 'flash-overlay';
            flash.style.backgroundColor = 'rgba(79, 195, 247, 0.3)';
            document.body.appendChild(flash);
            setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash); }, 400);

            playSound('badge');

            this.capturedIds.add(id);
            this.save();
            this.updateHeaderUI();
            eventBus.emit(CONFIG.EVENTS.PHOTO_CAPTURED, Array.from(this.capturedIds));
            
            // 全種類コンプリート判定
            if (this.capturedIds.size === this.allCreatures.length) {
                this.isJustCompleted = true;
            }
        } else {
            playSound('click');
        }

        this.showFact(id, isNew);
    }

    private parseSizeToMeters(sizeStr: string): number {
        // "10-15cm", "2.5-3.8m", "約50m" などの文字列から最大の数値をメートルで抽出
        const matches = sizeStr.match(/[\d.]+/g);
        if (!matches) return 0.5; // default
        let maxVal = Math.max(...matches.map(Number));
        if (sizeStr.includes('cm')) {
            maxVal = maxVal / 100;
        }
        return maxVal;
    }

    private showFact(id: string, isNew: boolean): void {
        const item = this.dataMap[id];
        if (!item || !this.modal) return;
        this.currentItem = item;

        const titleEl = document.getElementById('sea-title');
        const engEl = document.getElementById('sea-eng');
        const depthEl = document.getElementById('sea-depth');
        const sizeEl = document.getElementById('sea-size');
        const descEl = document.getElementById('sea-desc');
        const factEl = document.getElementById('sea-fact');

        if (titleEl) {
            titleEl.textContent = item.title;
            const badge = titleEl.parentElement?.querySelector('.new-badge');
            if (badge) badge.remove();
            if (isNew) {
                const newBadge = document.createElement('span');
                newBadge.className = 'new-badge inline-block ml-2 px-2 py-0.5 bg-cyan-400 text-black text-xs font-black rounded-full align-middle animate-pulse';
                newBadge.textContent = '図鑑登録！';
                titleEl.parentElement?.appendChild(newBadge);
                setTimeout(() => newBadge.remove(), 3000);
            }
        }
        if (engEl) engEl.textContent = item.englishName;
        if (depthEl) depthEl.textContent = item.depthRange;
        if (sizeEl) sizeEl.textContent = item.sizeRange;
        if (descEl) descEl.textContent = item.description;
        if (factEl) factEl.textContent = item.fact;

        // --- 📸 モーダル内ビジュアルの初期化 📸 ---
        const modalImg = document.getElementById('modal-creature-img') as HTMLImageElement;
        if (modalImg) {
            modalImg.src = item.image;
            modalImg.alt = item.title;
            modalImg.classList.remove('macro-zoom'); // ズーム用クラスだけを安全にピンポイントで削除
        }

        // --- 🔍 レンズ（ズーム）アンロックの制御 🔍 ---
        const isLensUnlocked = this.solvedQuizIds.size >= 2;
        const lensControlPanel = document.getElementById('lens-control-panel');
        const lensLockedMsg = document.getElementById('lens-locked-msg');
        
        // 通常/マクロ表示のリセット
        const descContainer = document.getElementById('sea-desc-container');
        const macroContainer = document.getElementById('sea-macro-container');
        const btnLensNormal = document.getElementById('btn-lens-normal');
        const btnLensMacro = document.getElementById('btn-lens-macro');

        if (descContainer) descContainer.classList.remove('hidden');
        if (macroContainer) macroContainer.classList.add('hidden');
        if (btnLensNormal) {
            btnLensNormal.className = 'bg-blue-600 hover:bg-blue-500 text-white rounded-full px-3 py-1.5 text-xs flex items-center gap-1 font-bold shadow-lg transition-colors border border-blue-400/30';
        }
        if (btnLensMacro) {
            btnLensMacro.className = 'bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full px-3 py-1.5 text-xs flex items-center gap-1 font-bold shadow-lg transition-all border border-slate-600/50';
        }

        if (isLensUnlocked) {
            if (lensControlPanel) lensControlPanel.classList.remove('hidden');
            if (lensLockedMsg) lensLockedMsg.classList.add('hidden');
        } else {
            if (lensControlPanel) lensControlPanel.classList.add('hidden');
            if (lensLockedMsg) lensLockedMsg.classList.remove('hidden');
        }

        // --- ❓ クイズコーナーの初期化 ❓ ---
        const quizContainer = document.getElementById('quiz-container');
        const quizQuestion = document.getElementById('quiz-question');
        const quizFeedback = document.getElementById('quiz-feedback');
        const quizOptions = document.querySelectorAll('.quiz-opt-btn');

        const quiz = item.quiz;
        if (quiz) {
            if (quizContainer) quizContainer.classList.remove('hidden');
            if (quizQuestion) quizQuestion.textContent = quiz.question;
            if (quizFeedback) quizFeedback.classList.add('hidden');

            const solved = this.solvedQuizIds.has(item.id);

            quizOptions.forEach((btn, index) => {
                const btnEl = btn as HTMLButtonElement;
                const optTextEl = btnEl.querySelector('.option-text');
                if (optTextEl) {
                    optTextEl.textContent = quiz.options[index] || '';
                }

                // スタイルの初期化
                btnEl.className = 'quiz-opt-btn w-full text-left bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 rounded-xl px-4 py-2.5 text-sm transition-all flex items-center gap-2';
                btnEl.disabled = solved;

                if (solved) {
                    if (index === quiz.answerIndex) {
                        btnEl.classList.add('quiz-correct');
                    }
                }
            });

            if (solved && quizFeedback) {
                quizFeedback.textContent = quiz.successFact;
                quizFeedback.className = 'p-4 rounded-xl text-sm font-bold border transition-all duration-300 quiz-correct block';
                quizFeedback.classList.remove('hidden');
            }
        } else {
            if (quizContainer) quizContainer.classList.add('hidden');
        }
        
        // スケール比較UIの生成
        let scaleContainer = document.getElementById('sea-scale-container');
        if (!scaleContainer) {
            scaleContainer = document.createElement('div');
            scaleContainer.id = 'sea-scale-container';
            scaleContainer.className = 'mt-4 p-4 bg-black/40 rounded-xl flex flex-col items-center justify-end h-32 relative overflow-hidden border border-indigo-900/50';
            if (factEl && factEl.parentNode) {
                factEl.parentNode.insertBefore(scaleContainer, factEl.nextSibling);
            }
        }
        
        if (item.is_artifact) {
            scaleContainer.style.display = 'none';
        } else {
            scaleContainer.style.display = 'flex';
            const sizeInMeters = this.parseSizeToMeters(item.sizeRange);
            const humanSize = CONFIG.DIVER_HEIGHT;
            
            const maxDimension = Math.max(sizeInMeters, humanSize);
            const scaleFactor = 100 / maxDimension;
            
            const humanHeightPct = Math.max(10, Math.min(90, humanSize * scaleFactor));
            const creatureHeightPct = Math.max(10, Math.min(90, sizeInMeters * scaleFactor));
            
            scaleContainer.innerHTML = `
                <div class="absolute top-1 left-2 text-[10px] text-indigo-300/70 font-bold tracking-widest">SIZE COMPARISON</div>
                <div class="flex items-end justify-center gap-2 md:gap-8 w-full h-full pb-2">
                    <div class="flex flex-col items-center justify-end shrink-0" style="height: 100%;">
                        <div class="w-6 md:w-8 bg-blue-400/80 rounded-t-full mb-1 shrink-0" style="height: ${humanHeightPct}%; min-height: 20px;" title="ダイバー (約1.7m)"></div>
                        <div class="text-[clamp(8px,2vw,10px)] text-blue-200 whitespace-nowrap">ダイバー</div>
                    </div>
                    <div class="flex flex-col items-center justify-end shrink-0" style="height: 100%; max-width: 70%;">
                        <div class="relative flex items-end justify-center shrink-0 w-full" style="height: ${creatureHeightPct}%; min-height: 20px;">
                            <img src="${escapeHTML(item.image)}" class="max-h-full max-w-full object-contain filter brightness-0 drop-shadow-[0_0_2px_rgba(255,255,255,0.3)]" alt="${escapeHTML(item.title)}">
                        </div>
                        <div class="text-[clamp(8px,2vw,10px)] text-indigo-200 mt-1 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">${escapeHTML(item.sizeRange)}</div>
                    </div>
                </div>
            `;
        }
        
        this.openModal(this.modal);
    }

    private getOpenModals(): HTMLElement[] {
        return [this.modal, this.albumModal, this.completionModal].filter(
            (modal): modal is HTMLElement => !!modal && !modal.classList.contains('hidden')
        );
    }

    private syncModalEnvironment(): void {
        const hasOpenModal = this.getOpenModals().length > 0;
        const content = document.getElementById('deep-sea-content');
        const scrollContainer = document.getElementById('scroll-container');

        if (hasOpenModal) {
            // 実際の背景だけをブロックし、既存の inert 状態は閉じる際に復元する。
            const background = [scrollContainer, document.querySelector<HTMLElement>('nav'),
                document.getElementById('hud-container'), document.getElementById('btn-surface')];
            background.forEach(element => {
                if (!element || this.blockedElements.has(element)) return;
                this.blockedElements.set(element, element.hasAttribute('inert'));
                element.setAttribute('inert', '');
            });
            content?.setAttribute('aria-hidden', 'true');
            if (scrollContainer && !this.scrollOverflow) {
                const style = scrollContainer.style;
                this.scrollOverflow = {
                    x: style.getPropertyValue('overflow-x'), y: style.getPropertyValue('overflow-y'),
                    xPriority: style.getPropertyPriority('overflow-x'), yPriority: style.getPropertyPriority('overflow-y')
                };
                // モバイル用 CSS の !important にも勝ち、横方向もロックする。
                style.setProperty('overflow-x', 'hidden', 'important');
                style.setProperty('overflow-y', 'hidden', 'important');
            }
            return;
        }

        this.blockedElements.forEach((wasInert, element) => {
            if (!wasInert) element.removeAttribute('inert');
        });
        this.blockedElements.clear();
        content?.removeAttribute('aria-hidden');
        if (scrollContainer && this.scrollOverflow) {
            const saved = this.scrollOverflow;
            scrollContainer.style.setProperty('overflow-x', saved.x, saved.xPriority);
            scrollContainer.style.setProperty('overflow-y', saved.y, saved.yPriority);
        }
        this.scrollOverflow = null;
    }

    private openModal(modalElement: HTMLElement | null): void {
        if (!modalElement || !modalElement.classList.contains('hidden')) return;
        this.modalOpeners.set(modalElement, document.activeElement as HTMLElement | null);
        modalElement.classList.remove('hidden');
        this.syncModalEnvironment();

        setTimeout(() => {
            // 開いてすぐ閉じた場合は、遅延処理で隠れたモーダルにフォーカスを戻さない。
            if (modalElement.classList.contains('hidden')) return;
            const openModals = this.getOpenModals();
            if (openModals[openModals.length - 1] !== modalElement) return;
            modalElement.querySelector<HTMLElement>('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus();
        }, 50);
        eventBus.emit('modal_opened', modalElement.id);
    }

    private closeModal(modalElement: HTMLElement | null): void {
        if (!modalElement || modalElement.classList.contains('hidden')) return;
        modalElement.classList.add('hidden');
        if (modalElement === this.completionModal) this.confetti.stop();
        this.syncModalEnvironment();
        eventBus.emit('modal_closed', modalElement.id);

        const opener = this.modalOpeners.get(modalElement);
        this.modalOpeners.delete(modalElement);
        const openModals = this.getOpenModals();
        if (openModals.length === 0 && opener?.isConnected) opener.focus();

        // 認定証は他の詳細や図鑑と重ねない。リセット時には予約も取り消す。
        if (this.isJustCompleted && openModals.length === 0 && this.completionTimer === null) {
            this.completionTimer = setTimeout(() => {
                this.completionTimer = null;
                if (!this.isJustCompleted || this.getOpenModals().length > 0) return;
                this.isJustCompleted = false;
                this.showCompletionReward();
            }, 500);
        }
    }

    private showCompletionReward(): void {
        if (!this.completionModal) return;
        this.openModal(this.completionModal);
        this.confetti.fire();
        
        // 何度か連続でファンファーレ音を鳴らす（簡易的なファンファーレ）
        playSound('badge');
        setTimeout(() => playSound('badge'), 300);
        setTimeout(() => playSound('badge'), 600);
    }

    private bindEvents(): void {
        const btnAlbum = document.getElementById('btn-album');
        const btnCloseAlbum = document.getElementById('btn-close-album');
        const btnResetAlbum = document.getElementById('btn-reset-album');
        const btnCloseModal = document.getElementById('btn-close-modal');
        const modalContent = document.getElementById('sea-modal-content');
        const btnCloseCompletion = document.getElementById('btn-close-completion');

        if (btnCloseCompletion) {
            btnCloseCompletion.addEventListener('click', () => {
                playSound('click');
                this.closeModal(this.completionModal);
            });
        }

        if (btnAlbum) {
            btnAlbum.addEventListener('click', (e) => {
                e.stopPropagation();
                playSound('click');
                this.renderAlbumGrid();
                this.openModal(this.albumModal);
            });
        }
        if (btnCloseAlbum) {
            btnCloseAlbum.addEventListener('click', (e) => {
                e.stopPropagation();
                playSound('click');
                this.closeModal(this.albumModal);
            });
        }
        if (btnResetAlbum) {
            btnResetAlbum.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('調査データをすべてリセットしますか？この操作は元に戻せません。')) {
                    playSound('click');
                    this.isJustCompleted = false;
                    if (this.completionTimer !== null) clearTimeout(this.completionTimer);
                    this.completionTimer = null;
                    this.capturedIds.clear();
                    this.solvedQuizIds.clear();
                    this.storage.clear();
                    this.updateHeaderUI();
                    this.renderAlbumGrid();
                    
                    // スクロールコンテナを最上部に戻す
                    const scrollContainer = document.getElementById('scroll-container');
                    if (scrollContainer) {
                        scrollContainer.scrollTop = 0;
                    }
                    
                    eventBus.emit(CONFIG.EVENTS.DATA_RESET);
                }
            });
        }
        if (btnCloseModal) {
            btnCloseModal.addEventListener('click', () => {
                playSound('click');
                this.closeModal(this.modal);
            });
        }
        if (this.modal) {
            this.modal.addEventListener('click', () => {
                playSound('click');
                this.closeModal(this.modal);
            });
        }
        if (modalContent) {
            modalContent.addEventListener('click', (e) => e.stopPropagation());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModals = this.getOpenModals();
                const topModal = openModals[openModals.length - 1];
                if (topModal) {
                    e.preventDefault();
                    this.closeModal(topModal);
                }
            }
        });

        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const factElement = target.closest('[data-fact-id]');
            if (factElement && !target.closest('#album-modal') && !target.closest('#sea-modal')) {
                const factId = factElement.getAttribute('data-fact-id');
                if (factId) this.registerCreature(factId); // #12: Removed takePhoto alias, use registerCreature directly
            }
        });

        // --- 📸 通常/マクロレンズ切り替えボタンのバインド 📸 ---
        const btnLensNormal = document.getElementById('btn-lens-normal');
        const btnLensMacro = document.getElementById('btn-lens-macro');
        if (btnLensNormal) {
            btnLensNormal.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleLensChange(false);
            });
        }
        if (btnLensMacro) {
            btnLensMacro.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleLensChange(true);
            });
        }

        // --- ❓ クイズ選択肢ボタンのバインド ❓ ---
        const quizOptions = document.querySelectorAll('.quiz-opt-btn');
        quizOptions.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const target = e.currentTarget as HTMLButtonElement;
                const index = parseInt(target.getAttribute('data-index') || '0', 10);
                this.handleQuizAnswer(index);
            });
        });
    }

    private handleQuizAnswer(index: number): void {
        const item = this.currentItem;
        if (!item || !item.quiz) return;

        const isCorrect = index === item.quiz.answerIndex;
        const quizFeedback = document.getElementById('quiz-feedback');
        const quizOptions = document.querySelectorAll('.quiz-opt-btn');

        if (isCorrect) {
            playSound('badge');
            this.solvedQuizIds.add(item.id);
            this.storage.saveQuiz(Array.from(this.solvedQuizIds));

            if (quizFeedback) {
                quizFeedback.textContent = item.quiz.successFact;
                quizFeedback.className = 'p-4 rounded-xl text-sm font-bold border transition-all duration-300 quiz-correct block';
                quizFeedback.classList.remove('hidden');
            }

            quizOptions.forEach((btn, idx) => {
                const btnEl = btn as HTMLButtonElement;
                btnEl.disabled = true;
                if (idx === item.quiz!.answerIndex) {
                    btnEl.classList.add('quiz-correct');
                }
            });

            eventBus.emit('quiz_solved_update');

            const currentPoints = this.solvedQuizIds.size;

            if (currentPoints === 2) {
                playSound('badge');
                this.showNotification('おめでとう！ クイズに2もん正解したので「ズームレンズ」が解放されたよ！🔍', 'biotech');
                const lensControlPanel = document.getElementById('lens-control-panel');
                const lensLockedMsg = document.getElementById('lens-locked-msg');
                if (lensControlPanel) lensControlPanel.classList.remove('hidden');
                if (lensLockedMsg) lensLockedMsg.classList.add('hidden');
            } else if (currentPoints === 3) {
                playSound('badge');
                this.showNotification('クイズに3もん正解！ この調子で深海のヒミツを調べてみよう！✨', 'stars');
            }
        } else {
            playSound('click');
            const clickedBtn = quizOptions[index] as HTMLButtonElement;
            clickedBtn.classList.add('quiz-incorrect');
            clickedBtn.disabled = true;
            
            if (quizFeedback) {
                quizFeedback.textContent = '❌ ちがうよ！ もういちど よくかんがえてみてね！';
                quizFeedback.className = 'p-4 rounded-xl text-sm font-bold border transition-all duration-300 quiz-incorrect block';
                quizFeedback.classList.remove('hidden');
            }
        }
    }

    private handleLensChange(isMacro: boolean): void {
        const item = this.currentItem;
        if (!item) return;

        const modalImg = document.getElementById('modal-creature-img') as HTMLImageElement;
        const descContainer = document.getElementById('sea-desc-container');
        const macroContainer = document.getElementById('sea-macro-container');
        const macroDesc = document.getElementById('sea-macro-desc');
        
        const btnLensNormal = document.getElementById('btn-lens-normal');
        const btnLensMacro = document.getElementById('btn-lens-macro');

        if (isMacro) {
            playSound('click');
            if (modalImg) modalImg.classList.add('macro-zoom');
            if (descContainer) descContainer.classList.add('hidden');
            if (macroContainer) {
                macroContainer.classList.remove('hidden');
                if (macroDesc) {
                    macroDesc.textContent = item.macroFact || item.fact || 'ミクロのデータは準備中だよ。';
                }
            }
            
            if (btnLensNormal) {
                btnLensNormal.className = 'bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full px-3 py-1.5 text-xs flex items-center gap-1 font-bold shadow-lg transition-all border border-slate-600/50';
            }
            if (btnLensMacro) {
                btnLensMacro.className = 'bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-3 py-1.5 text-xs flex items-center gap-1 font-bold shadow-lg transition-colors border border-emerald-400/30';
            }
        } else {
            playSound('click');
            if (modalImg) modalImg.classList.remove('macro-zoom');
            if (descContainer) descContainer.classList.remove('hidden');
            if (macroContainer) macroContainer.classList.add('hidden');

            if (btnLensNormal) {
                btnLensNormal.className = 'bg-blue-600 hover:bg-blue-500 text-white rounded-full px-3 py-1.5 text-xs flex items-center gap-1 font-bold shadow-lg transition-colors border border-blue-400/30';
            }
            if (btnLensMacro) {
                btnLensMacro.className = 'bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full px-3 py-1.5 text-xs flex items-center gap-1 font-bold shadow-lg transition-all border border-slate-600/50';
            }
        }
    }

    private showNotification(message: string, icon: string = 'info'): void {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <span class="material-symbols-rounded text-cyan-400 text-base">${icon}</span>
            <span>${message}</span>
        `;
        container.appendChild(toast);

        // 4秒後に自動削除 (CSSフェードアウトアニメーション後にDOMから消去)
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }
}
