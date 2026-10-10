import { ECOLOGY } from '../ecology';
import { eventBus } from '../core/EventBus';
import { CONFIG } from '../core/config';
import { createElement, createDiv, escapeHTML } from '../utils/dom';
import { deepSeaData, DeepSeaItem, DepthMarker, markersData } from '../data';
import { StorageManager } from '../core/StorageManager';

export class FieldRenderer {
    private container: HTMLElement | null;
    private creatureNodes: Map<string, HTMLImageElement>;
    private capturedIds: Set<string>;
    private entityNodes = new Map<string, HTMLElement>();
    private observer: IntersectionObserver;
    private isNightMode: boolean = false;
    private storage: StorageManager;
    private spawnedRareIds: Set<string>;

    constructor(containerId: string) {
        this.container = document.getElementById(containerId);
        this.creatureNodes = new Map();
        this.capturedIds = new Set();
        this.storage = new StorageManager();
        this.spawnedRareIds = new Set();
        
        eventBus.on(CONFIG.EVENTS.PHOTO_CAPTURED, (ids: string[]) => {
            this.capturedIds = new Set(ids);
            this.updateSilhouetteState();
        });
        
        eventBus.on(CONFIG.EVENTS.DATA_RESET, () => {
            this.capturedIds.clear();
            this.spawnedRareIds.clear();
            this.updateSilhouetteState();
            this.render(); // データリセット時はクイズも消えるため全体を再描画
        });

        // クイズ解決時は全体再描画ではなく、ロックされた生物のみを動的アンロック（チラつき防止）
        eventBus.on('quiz_solved_update', () => {
            this.updateLockedCreatures();
        });

        // Intersection Observer for Lazy Loading
        const scrollContainer = document.getElementById('scroll-container');
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target as HTMLImageElement;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    this.observer.unobserve(img);
                }
            });
        }, {
            root: scrollContainer,
            rootMargin: '600px', // 左右・縦スクロールに対応したマージン
            threshold: 0.05
        });
    }

    render(): void {
        if (!this.container) return;
        // 再描画で取り外す画像の監視を解除し、旧DOMを保持しない。
        this.observer.disconnect();
        this.container.innerHTML = '';
        this.entityNodes.clear();
        this.creatureNodes.clear(); // #5: Render再呼び出し時にcreatureNodesをクリアする
        
        const markersContainer = document.getElementById('depth-markers-overlay');
        if (markersContainer) {
            markersContainer.innerHTML = '';
        }

        // コンテナの高さを動的に設定 (1px ＝ 1m システムの厳密な同期)
        this.updateContainerHeight();

        // #11: Depth markers (Render in depth-markers-overlay to bypass searchlight darkness overlay)
        markersData.forEach((marker: DepthMarker) => {
            const div = createDiv('depth-marker');
            
            // 潜行開始オフセット 450px を適用
            const offsetDepth = marker.depth + CONFIG.SCROLL.SURFACE_OFFSET;
            if (markersContainer) {
                div.style.top = '0px';
                div.dataset.depth = offsetDepth.toString();
            } else {
                div.style.top = `${offsetDepth}px`;
            }
            
            const span = createElement('span', `depth-label ${marker.class}`);
            span.textContent = marker.label;
            div.appendChild(span);
            
            if (markersContainer) {
                markersContainer.appendChild(div);
            } else {
                this.container!.appendChild(div);
            }
        });

        const solvedCount = this.storage.loadQuiz().length;

        // Entities (Creatures, Battles, Vents)
        deepSeaData.forEach((item: DeepSeaItem) => {
            // レア出現判定 (spawnRateが設定されている場合)のキャッシュ化による固定
            if (item.spawnRate !== undefined) {
                if (!this.spawnedRareIds.has(item.id)) {
                    if (Math.random() <= item.spawnRate) {
                        this.spawnedRareIds.add(item.id);
                    }
                }
                if (!this.spawnedRareIds.has(item.id)) {
                    return; // 出現確率に満たない場合はDOMを生成しない
                }
            }

            let el: HTMLElement | null = null;
            
            if (item.type === 'creature' || item.type === 'landmark') {
                el = this.createCreatureElement(item);
            } else if (item.type === 'battle') {
                el = this.createBattleElement(item);
            } else if (item.type === 'vent') {
                el = this.createVentElement(item);
            }
            
            if (el) {
                // クイズポイント制限チェック (DOM自体は生成し、非表示クラスを付与することでチラつき防止)
                if (item.spawnPointsRequired !== undefined && solvedCount < item.spawnPointsRequired) {
                    el.classList.add('creature-locked');
                }
                this.entityNodes.set(item.id, el);
                this.container!.appendChild(el);
                
                // 画像要素を監視対象に追加して遅延読み込み
                const images = el.querySelectorAll('img');
                images.forEach(img => {
                    const imgEl = img as HTMLImageElement;
                    const factId = imgEl.closest('[data-fact-id]')?.getAttribute('data-fact-id');
                    if (factId) {
                        this.creatureNodes.set(factId, imgEl);
                    } else if (item.id) {
                        this.creatureNodes.set(item.id, imgEl);
                    }
                    this.observer.observe(imgEl);
                });
            }
        });

        // 描画完了イベントを発火
        eventBus.emit(CONFIG.EVENTS.FIELD_RENDERED);
    }

    private createCreatureElement(item: DeepSeaItem): HTMLElement {
        const div = createDiv(`creature-circle-container ${item.anim_class || ''}`);
        const currentDepth = (this.isNightMode && item.nightDepth_m !== undefined) ? item.nightDepth_m : (item.depth_m || 0);
        div.style.top = `${currentDepth + CONFIG.SCROLL.SURFACE_OFFSET}px`;
        if (item.left) {
            div.style.left = item.left;
        } else if (item.right) {
            div.style.right = item.right;
        }
        div.setAttribute('data-fact-id', item.id);
        const ecology = ECOLOGY[item.id];
        if (ecology) {
            div.dataset.habitat = ecology.habitat;
            div.dataset.exhibitDepth = String(currentDepth);
            if (ecology.habitat === '海底' || ecology.habitat === '熱水域の海底') div.classList.add('habitat-seafloor');
        }
        
        let extraHtml = '';
        if (item.glow) {
            extraHtml = '<div class="creature-glow-point" style="top: -24px; left: 50%; transform: translateX(-50%);"></div>';
        }

        const sizePx = item.size || 96;
        const borderClass = item.border_class || 'border-white';
        const bgClass = item.bg_class || 'bg-blue-400';
        
        const isCaptured = this.capturedIds.has(item.id);
        const stateClass = isCaptured ? 'creature-img-registered' : 'creature-img-unregistered';

        const filterStyle = item.cssFilter ? `filter: ${item.cssFilter};` : '';

        div.innerHTML = `
            <div class="creature-circle-inner" style="width: ${sizePx}px; height: ${sizePx}px;">
                ${extraHtml}
                <img class="creature-img ${stateClass} ${borderClass} ${bgClass}" 
                     style="width: ${sizePx}px; height: ${sizePx}px; ${filterStyle}"
                     data-src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}">
            </div>
            <div class="creature-label" style="max-width: ${sizePx + 40}px; margin-left: auto; margin-right: auto;">${escapeHTML(item.title)}</div>
            ${ecology ? `<div class="ecology-caption">${currentDepth.toLocaleString()}m · ${escapeHTML(ecology.habitat)}</div>` : ''}
        `;
        return div;
    }

    private createBattleElement(item: DeepSeaItem): HTMLElement {
        const div = createDiv('battle-container ecology-encounter');
        div.dataset.exhibitDepth = String(item.depth_m || 0);
        div.style.top = `${(item.depth_m || 0) + CONFIG.SCROLL.SURFACE_OFFSET}px`;

        // #9: participants配列から戦闘対象（マッコウクジラ、ダイオウイカ）を取得する
        const participants = item.participants || [];
        const whale = participants.find(p => p.id === 'whale')!;
        const squid = participants.find(p => p.id === 'squid')!;

        if (!whale || !squid) return div;

        const isWhaleCaptured = this.capturedIds.has(whale.id);
        const isSquidCaptured = this.capturedIds.has(squid.id);

        const whaleStateClass = isWhaleCaptured ? 'creature-img-registered' : 'creature-img-unregistered';
        const squidStateClass = isSquidCaptured ? 'creature-img-registered' : 'creature-img-unregistered';

        div.innerHTML = `
            <div class="battle-inner">
                <div class="encounter-caption">${(item.depth_m || 0).toLocaleString()}m · 採食中の遭遇イメージ</div>
                <div class="battle-whale creature-circle-container" data-fact-id="${whale.id}">
                    <div class="creature-circle-inner" style="width: 256px; height: 256px;">
                        <img class="creature-img ${whaleStateClass} border-slate-600/50 bg-transparent" 
                             style="width: 256px; height: 256px;"
                             data-src="${escapeHTML(whale.image)}" alt="${escapeHTML(whale.title)}">
                    </div>
                    <div class="battle-versus">VS</div>
                    <div class="creature-label" style="max-width: 296px; margin-left: auto; margin-right: auto;">${escapeHTML(whale.title)}</div>
                </div>
                <div class="battle-squid creature-circle-container" data-fact-id="${squid.id}">
                    <div class="creature-circle-inner" style="width: 256px; height: 256px;">
                        <img class="creature-img ${squidStateClass} border-red-900/50 bg-transparent" 
                             style="width: 256px; height: 256px;"
                             data-src="${escapeHTML(squid.image)}" alt="${escapeHTML(squid.title)}">
                    </div>
                    <div class="creature-label" style="max-width: 296px; margin-left: auto; margin-right: auto;">${escapeHTML(squid.title)}</div>
                </div>
            </div>
        `;
        return div;
    }

    private createVentElement(item: DeepSeaItem): HTMLElement {
        const div = createDiv('vent-container');
        div.style.top = `${(item.depth_m || 0) + CONFIG.SCROLL.SURFACE_OFFSET}px`;

        div.innerHTML = `
            <div class="vent-inner" data-fact-id="${item.id}">
                <div class="relative" style="display: inline-block;">
                    <div class="vent-glow-red"></div>
                    <div class="vent-glow-yellow"></div>
                    <img class="vent-image" style="width: 384px; height: 384px;" data-src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}">
                </div>
                <h2 class="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-t from-red-500 to-yellow-200 mt-12 tracking-widest drop-shadow-[0_0_20px_rgba(255,100,0,0.8)]">10,000m</h2>
                <p class="text-4xl text-white font-bold mt-4 tracking-widest drop-shadow-md">CHALLENGER DEEP</p>
                <div class="mt-6 flex justify-center gap-2">
                     <span class="material-symbols-outlined text-yellow-400 animate-bounce">star</span>
                     <span class="text-xl text-yellow-100">MISSION COMPLETE</span>
                     <span class="material-symbols-outlined text-yellow-400 animate-bounce">star</span>
                </div>
            </div>
        `;
        return div;
    }

    private updateSilhouetteState(): void {
        for (const [id, img] of this.creatureNodes.entries()) {
            const isCaptured = this.capturedIds.has(id);
            if (isCaptured) {
                img.classList.remove('creature-img-unregistered');
                img.classList.add('creature-img-registered');
            } else {
                img.classList.remove('creature-img-registered');
                img.classList.add('creature-img-unregistered');
            }
        }
    }

    setTimeMode(isNight: boolean): void {
        this.isNightMode = isNight;
        this.updateCreaturePositions();
    }

    private updateCreaturePositions(): void {
        deepSeaData.forEach((item: DeepSeaItem) => {
            const el = this.entityNodes.get(item.id);
            if (el) {
                const targetDepth = (this.isNightMode && item.nightDepth_m !== undefined) ? item.nightDepth_m : (item.depth_m || 0);
                el.style.top = `${targetDepth + CONFIG.SCROLL.SURFACE_OFFSET}px`;
                if (ECOLOGY[item.id]) {
                    el.dataset.exhibitDepth = String(targetDepth);
                    const caption = el.querySelector('.ecology-caption');
                    if (caption) caption.textContent = `${targetDepth.toLocaleString()}m · ${ECOLOGY[item.id].habitat}`;
                }
            }
        });
    }

    updateContainerHeight(): void {
        const parentContent = document.getElementById('deep-sea-content');
        if (parentContent) {
            parentContent.style.height = `${CONFIG.SCROLL.MAX_DEPTH + CONFIG.SCROLL.SURFACE_OFFSET + window.innerHeight}px`;
        }
    }

    updateLockedCreatures(): void {
        const solvedCount = this.storage.loadQuiz().length;
        deepSeaData.forEach((item: DeepSeaItem) => {
            if (item.spawnPointsRequired !== undefined) {
                const el = this.entityNodes.get(item.id);
                if (el) {
                    if (solvedCount >= item.spawnPointsRequired) {
                        if (el.classList.contains('creature-locked')) {
                            el.classList.remove('creature-locked');
                            el.classList.add('creature-unlocked-fade');
                        }
                    } else {
                        el.classList.add('creature-locked');
                        el.classList.remove('creature-unlocked-fade');
                    }
                }
            }
        });
    }
}

