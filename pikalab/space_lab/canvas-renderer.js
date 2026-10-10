// ============================================================
// ほしぞら・アドベンチャー - canvas-renderer.js
// Canvas描画制御モジュール
// ============================================================
import { PLANETS } from './data.js';
import { resolvePlanetImageUrl } from './planet-image-url.mjs';
import { CONFIG, PLANET_RADII, PLANET_GAP, GLOW_COLORS } from './config.js';
import { State } from './state.js';
import { UI } from './ui-controller.js';

const makeBlackTransparent = (img, planetId) => {
    if (!img) return null;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return img;
    try {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const maxRadius = Math.min(cx, cy);
        
        // 土星 (saturn) と天王星 (uranus) は環（リング）があるため円形マスクを除外
        const useCircularMask = planetId !== 'saturn' && planetId !== 'uranus';
        
        // 惑星ごとにマスク半径の比率を調整してエッジノイズを削る
        let maskRadiusRatio = 0.945;
        if (planetId === 'sun') {
            maskRadiusRatio = 0.98;
        } else if (planetId === 'venus') {
            maskRadiusRatio = 0.915; // 金星のエッジの白いノイズを確実に削り落とす
        } else if (planetId === 'mercury') {
            maskRadiusRatio = 0.93;  // 水星も少し絞り気味にして綺麗にする
        } 

        const clipRadius = maxRadius * maskRadiusRatio;
        const clipRadiusSquared = clipRadius * clipRadius;
        const fadeRadiusSquared = Math.max(0, clipRadius - 2) ** 2;
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const idx = (y * canvas.width + x) * 4;
                
                if (useCircularMask) {
                    const distSquared = (x - cx) ** 2 + (y - cy) ** 2;
                    if (distSquared > clipRadiusSquared) {
                        data[idx + 3] = 0; // 円の外側は完全に透過
                        continue;
                    } else if (distSquared > fadeRadiusSquared) {
                        // 平方根は境界の2pxだけに限定し、同じ透過マスクを保つ。
                        const ratio = (clipRadius - Math.sqrt(distSquared)) / 2;
                        data[idx + 3] = Math.min(data[idx + 3], data[idx + 3] * ratio);
                    }
                }
                
                // 既存の黒背景透過ロジック（円の内側、またはマスク対象外の惑星）
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const maxVal = Math.max(r, g, b);
                if (maxVal < 18) {
                    if (maxVal < 4) {
                        data[idx + 3] = 0;
                    } else {
                        const ratio = (maxVal - 4) / (18 - 4);
                        data[idx + 3] = Math.min(data[idx + 3], data[idx + 3] * ratio);
                    }
                }
            }
        }
        
        ctx.putImageData(imgData, 0, 0);
        
        const newImg = new Image();
        newImg.src = canvas.toDataURL();
        return newImg;
    } catch (e) {
        console.warn("Failed to process image transparency:", e);
        return img;
    }
};

export const CanvasMap = {
    ctx: null,
    _shootingStars: [],
    _labelWidths: new Map(),
    _a11yButtons: new Map(),
    _hoverPoint: null,
    _keyboardPlanet: null,
    _drag: null,
    _lastFrameTime: null,
    _lastDomPosition: null,

    init() {
        this.ctx = UI.DOM.canvas.getContext('2d');
        this.resize();
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.resize(), 150);
        });
        this.bindEvents();
        // フォント読込前の代替フォントで測った幅を残さない。
        const clearLabelWidths = () => this._labelWidths.clear();
        if (document.fonts) {
            document.fonts.ready.then(clearLabelWidths);
            document.fonts.addEventListener?.('loadingdone', clearLabelWidths);
        }
    },

    resize() {
        State.dpr = window.devicePixelRatio || 1;
        State.viewportW = window.innerWidth;
        State.viewportH = window.innerHeight;
        
        UI.DOM.canvas.width  = State.viewportW * State.dpr;
        UI.DOM.canvas.height = State.viewportH * State.dpr;
        UI.DOM.canvas.style.width  = `${State.viewportW}px`;
        UI.DOM.canvas.style.height = `${State.viewportH}px`;
        
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(State.dpr, State.dpr);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        this._buildPlanetLayout();
        // モーダル表示中もリサイズで消えた背景だけを復元し、アニメーションは再開しない。
        if (!this.loopActive) this.drawFrame(performance.now(), true);
    },

    _buildPlanetLayout() {
        const W  = State.viewportW;
        const cy = State.viewportH / 2;
        const scale = W < 600 ? CONFIG.CANVAS.BASE_SCALE_MOBILE : 1;
        const startPad = W < 600 ? CONFIG.CANVAS.START_PAD_MOBILE : CONFIG.CANVAS.START_PAD_PC;

        let x = startPad;


        State.planetData = PLANETS.map((p, i) => {
            const r  = (PLANET_RADII[p.id] || 50) * scale;
            const cx = x + r;
            const entry = {
                ...p, cx, cy, r,
                glowColor: GLOW_COLORS[p.id] || 'rgba(255,255,255,0.5)',
                phase: i * 0.9
            };

            if (UI.DOM.a11yContainer) {
                let btn = this._a11yButtons.get(p.id);
                if (!btn) {
                    btn = document.createElement('button');
                    btn.className = 'absolute bg-transparent border-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-400 rounded-full';
                    btn.ariaLabel = `${p.name}の詳細を見る`;
                    btn.onclick = () => window._AppBridge?.handlePlanetClick(btn._planetEntry);
                    btn.onfocus = () => {
                        this._keyboardPlanet = btn._planetEntry;
                        this._hoverPoint = null;
                        State.hoveredPlanet = btn._planetEntry;
                        this.focusPlanetInViewport(btn._planetEntry);
                    };
                    btn.onblur = () => {
                        if (this._keyboardPlanet?.id === p.id) this._keyboardPlanet = null;
                        if (State.hoveredPlanet?.id === p.id) State.hoveredPlanet = null;
                    };
                    this._a11yButtons.set(p.id, btn);
                    UI.DOM.a11yContainer.appendChild(btn);
                }
                // 要素を再利用し、リサイズでフォーカスを失わず座標だけを更新する。
                btn._planetEntry = entry;
                btn.style.width = `${r * 2.5}px`;
                btn.style.height = `${r * 2.5}px`;
                btn.style.left = `${cx - r * 1.25}px`;
                btn.style.top = `${cy - r * 1.25}px`;
                if (this._keyboardPlanet?.id === p.id) {
                    this._keyboardPlanet = entry;
                    State.hoveredPlanet = entry;
                }
            }

            x = cx + r + (PLANET_GAP[p.id] || 90) * scale;
            return entry;
        });
        State.totalWidth = x + startPad;
        if (UI.DOM.a11yContainer) UI.DOM.a11yContainer.style.width = `${State.totalWidth}px`;

        const maxScroll = Math.max(0, State.totalWidth - W);
        State.scrollX = Math.max(0, Math.min(State.scrollX, maxScroll));
        this._lastDomPosition = null;
        this._syncViewportDom();
        if (this._keyboardPlanet) this.focusPlanetInViewport(this._keyboardPlanet);
        if (window._AppBridge?.renderMinimapDots) {
            window._AppBridge.renderMinimapDots();
        }
    },

    async loadImages() {
        const load = (src, planetId) => new Promise(resolve => {
            const img = new Image();
            let processed = null;
            let originalLoaded = false;
            let settled = false;
            const finish = (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                img.onload = img.onerror = null;
                if (processed && processed !== img) processed.onload = processed.onerror = null;
                resolve(result);
            };
            // 加工後PNGのデコードまで含む期限。遅い加工画像は読み込み済み原画像へ戻す。
            const timeoutId = setTimeout(() => {
                if (!originalLoaded) img.removeAttribute('src');
                finish(originalLoaded ? img : null);
            }, 5000);
            img.onload = () => {
                originalLoaded = true;
                try {
                    processed = makeBlackTransparent(img, planetId);
                    if (!processed || processed === img) return finish(img);
                    processed.onload = () => finish(processed);
                    processed.onerror = () => finish(img);
                    if (processed.complete && processed.naturalWidth > 0) finish(processed);
                } catch (error) {
                    console.warn('[CanvasMap] 画像加工に失敗したため原画像を使用します:', error);
                    finish(img);
                }
            };
            img.onerror = () => finish(null);
            img.src = src;
        });
        const planets = await Promise.all(PLANETS.map(p => load(resolvePlanetImageUrl(p.image), p.id)));
        PLANETS.forEach((p, i) => { if (planets[i]) State.images[p.id] = planets[i]; });
    },

    loopActive: false,
    animationFrameId: null,

    startLoop() {
        if (this.loopActive || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
        this.loopActive = true;
        this._lastFrameTime = null;
        const loop = (timestamp) => {
            this.animationFrameId = null;
            if (!this.loopActive) return;
            this.drawFrame(timestamp);
            if (this.loopActive) this.animationFrameId = requestAnimationFrame(loop);
        };
        loop();
    },

    pause() {
        this.loopActive = false;
        this._lastFrameTime = null;
        this.cancelDrag();
        this._hoverPoint = null;
        State.hoveredPlanet = this._keyboardPlanet;
        // 再開前に未実行のフレームを取り消し、描画ループの多重化を防ぐ。
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    },

    play() {
        this.startLoop();
    },

    drawFrame(timestamp, still = false) {
        const now = Number.isFinite(timestamp) ? timestamp : performance.now();
        const frameScale = still ? 0 : this._lastFrameTime === null ? 1 : Math.max(0, Math.min(4, (now - this._lastFrameTime) / (1000 / 60)));
        if (!still) {
            this._lastFrameTime = now;
            this._advanceScroll(frameScale);
            this._syncViewportDom();
        }
        if (!still && this._hoverPoint && !State.isDragging) {
            State.hoveredPlanet = this._planetAtPos(this._hoverPoint.x, this._hoverPoint.y);
            UI.DOM.canvas.style.cursor = State.hoveredPlanet ? 'pointer' : 'grab';
        }
        const ctx = this.ctx;
        const W = State.viewportW;
        const H = State.viewportH;
        const t = Date.now() / 1000;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.clearRect(0, 0, W, H);
        
        // 高速スクロール時のスピード線描画（宇宙高速移動演出）
        if (Math.abs(State.scrollVelocity) > 12) {
            ctx.save();
            ctx.strokeStyle = 'rgba(147, 197, 253, 0.25)';
            ctx.lineWidth = 1.0;
            const dir = Math.sign(State.scrollVelocity);
            const count = Math.min(6, Math.floor(Math.abs(State.scrollVelocity) / 3));
            for (let i = 0; i < count; i++) {
                const sy = Math.random() * H;
                const sx = Math.random() * W;
                const len = 40 + Math.random() * 100;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx - dir * len, sy);
                ctx.stroke();
            }
            ctx.restore();
        }

        this._renderShootingStars(ctx, frameScale);

        const orbitY = H / 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(96,165,250,0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 10]);
        ctx.shadowColor = 'rgba(96,165,250,0.6)';
        ctx.shadowBlur = 12;
        ctx.beginPath();

        // 惑星（および環）の表示領域を避けて軌道線を描くことで、環や本体を線が貫通する「人間的な気持ち悪さ」を完全に防ぐ
        let currentX = 0;
        const skipIntervals = State.planetData.map(p => {
            const sx = p.cx - State.scrollX;
            // 土星は環の幅が広いため大きめにスキップ、天王星も環の広がりを考慮
            const factor = (p.id === 'saturn') ? 1.75 : ((p.id === 'uranus') ? 1.35 : 0.92);
            const halfW = p.r * factor;
            return { left: sx - halfW, right: sx + halfW };
        });

        skipIntervals.forEach(interval => {
            if (interval.left > currentX) {
                ctx.moveTo(currentX, orbitY);
                ctx.lineTo(interval.left, orbitY);
            }
            currentX = Math.max(currentX, interval.right);
        });

        if (currentX < W) {
            ctx.moveTo(currentX, orbitY);
            ctx.lineTo(W, orbitY);
        }

        ctx.stroke();
        ctx.restore();

        State.planetData.forEach(p => {
            const sx = p.cx - State.scrollX;
            if (sx + p.r < -80 || sx - p.r > W + 80) return;

            const floatDY = Math.sin(t * CONFIG.CANVAS.FLOAT_SPEED + p.phase) * CONFIG.CANVAS.FLOAT_AMPLITUDE;
            const sy = p.cy + floatDY;
            const isHovered  = State.hoveredPlanet?.id === p.id;
            const isVisited  = State.visited.has(p.id);
            const img        = State.images[p.id];
            const drawR      = p.r * (isHovered ? CONFIG.CANVAS.HOVER_SCALE : 1);

            ctx.save();
            // 1. シャドウ（グロー効果）を描画する
            ctx.shadowColor = p.glowColor;
            ctx.shadowBlur  = isHovered ? 70 : 40;
            ctx.fillStyle = 'rgba(0,0,0,1)'; // 真っ黒な円を描いてシャドウを発生させる
            ctx.beginPath(); 
            // 惑星画像のエッジのフチと光が重なって白浮きするのを防ぐため、シャドウの発生源の円を少し内側に配置する
            const glowR = drawR * (p.id === 'venus' ? 0.88 : (p.id === 'mercury' ? 0.91 : 0.93));
            ctx.arc(sx, sy, glowR, 0, Math.PI * 2); 
            ctx.fill();
            ctx.restore();

            // 2. 惑星画像を描画する
            if (img) {
                ctx.save();
                // ロード時に透過PNG化済みのため、クリップやscreen合成は一切不要で、端の欠けやフチのない綺麗な描画が実現します。
                ctx.drawImage(img, sx - drawR, sy - drawR, drawR * 2, drawR * 2);
                ctx.restore();
            } else {
                ctx.save();
                ctx.fillStyle = p.glowColor;
                ctx.beginPath(); 
                ctx.arc(sx, sy, drawR * 0.95, 0, Math.PI * 2); 
                ctx.fill();
                ctx.restore();
            }

            if (isHovered) {
                ctx.save();
                ctx.strokeStyle = p.glowColor;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 5]);
                ctx.shadowColor = p.glowColor;
                ctx.shadowBlur = 16;
                ctx.beginPath();
                ctx.arc(sx, sy, drawR * 1.4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            if (isVisited) {
                const bx = sx + drawR * 0.62;
                const by = sy - drawR * 0.62;
                ctx.save();
                ctx.shadowColor = 'rgba(16,185,129,0.8)'; ctx.shadowBlur = 10;
                ctx.fillStyle = '#10B981'; ctx.strokeStyle = '#0F172A'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(bx, by, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('✓', bx, by);
                ctx.restore();
            }

            // 土星と天王星は環の縦方向の広がりがあるため、ラベルの余白を多めに取って窮屈さを解消する
            const labelPadding = (p.id === 'saturn') ? 48 : (p.id === 'uranus' ? 38 : 32);
            const labelY = orbitY + p.r + labelPadding;
            this._drawLabel(ctx, p.name, sx, labelY, isHovered);
        });

    },

    _advanceScroll(frameScale) {
        if (State.isDragging) return;
        const maxScroll = Math.max(0, State.totalWidth - State.viewportW);
        if (State.scrollX < 0 || State.scrollX > maxScroll) {
            const target = State.scrollX < 0 ? 0 : maxScroll;
            State.scrollX += (target - State.scrollX) * (1 - Math.pow(0.84, frameScale));
            State.scrollVelocity = 0;
            if (Math.abs(State.scrollX - target) < 0.5) State.scrollX = target;
        } else if (Math.abs(State.scrollVelocity) > 0.3) {
            // 60Hzの移動量と減衰を基準にし、高リフレッシュレートでも速さを保つ。
            const decay = Math.pow(0.91, frameScale);
            State.scrollX += State.scrollVelocity * (1 - decay) / (1 - 0.91);
            State.scrollVelocity *= decay;
            if (State.scrollX < 0 || State.scrollX > maxScroll) State.scrollVelocity *= 0.5;
        } else {
            State.scrollVelocity = 0;
        }
    },

    _syncViewportDom() {
        const position = `${State.scrollX}:${State.viewportW}:${State.totalWidth}`;
        if (position === this._lastDomPosition) return;
        this._lastDomPosition = position;
        this._updateMinimap();
        this._updateA11y();
        this._updateParallax();
        const maxScroll = Math.max(0, State.totalWidth - State.viewportW);
        const updateWarning = (element, visible) => {
            if (!element) return;
            element.classList.toggle('opacity-0', !visible);
            element.classList.toggle('opacity-100', visible);
        };
        updateWarning(UI.DOM.boundaryWarningLeft, maxScroll > 0 && State.scrollX <= 1);
        updateWarning(UI.DOM.boundaryWarningRight, maxScroll > 0 && State.scrollX >= maxScroll - 1);
    },

    _updateParallax() {
        if (UI.DOM.bgLayer && UI.DOM.starsLayer) {
            const maxScroll = Math.max(0, State.totalWidth - State.viewportW);
            {
                const ratio = maxScroll > 0 ? State.scrollX / maxScroll : 0;
                const bgX = -ratio * (State.viewportW * 0.2); 
                UI.DOM.bgLayer.style.transform = `translateX(${bgX}px)`;
                UI.DOM.starsLayer.style.transform = `translateX(${bgX * 1.5}px)`;
            }
        }
    },

    _updateA11y() {
        if (UI.DOM.a11yContainer) {
            UI.DOM.a11yContainer.style.transform = `translateX(${-State.scrollX}px)`;
        }
    },

    focusPlanetInViewport(planet) {
        if (!planet || !Number.isFinite(planet.cx) || !Number.isFinite(planet.r)) return;

        const visibleLeft = State.scrollX;
        const visibleRight = State.scrollX + State.viewportW;
        const padding = 24;
        const isOutside = planet.cx - planet.r < visibleLeft + padding
            || planet.cx + planet.r > visibleRight - padding;
        if (!isOutside) return;

        const maxScroll = Math.max(0, State.totalWidth - State.viewportW);
        State.scrollX = Math.max(0, Math.min(maxScroll, planet.cx - State.viewportW / 2));
        State.scrollVelocity = 0;
        this._syncViewportDom();
    },

    _drawLabel(ctx, text, x, y, hovered) {
        ctx.save();
        ctx.font = "900 13px 'M PLUS Rounded 1c', sans-serif";
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        let mw = this._labelWidths.get(text);
        if (mw === undefined) {
            mw = ctx.measureText(text).width;
            this._labelWidths.set(text, mw);
        }
        const pw = mw + 24; const ph = 28; const r = 14;
        const px = x - pw / 2; const py = y - ph / 2;

        ctx.fillStyle = hovered ? 'rgba(37, 99, 235, 0.5)' : 'rgba(15, 23, 42, 0.4)';
        ctx.strokeStyle = hovered ? 'rgba(96, 165, 250, 0.9)' : 'rgba(148, 163, 184, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = hovered ? 'rgba(59, 130, 246, 0.6)' : 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 10;
        
        ctx.beginPath(); ctx.roundRect(px, py, pw, ph, r); ctx.fill(); 
        ctx.shadowBlur = 0; ctx.stroke();

        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'; ctx.shadowBlur = 4;
        ctx.fillStyle = hovered ? '#ffffff' : '#e2e8f0';
        ctx.fillText(text, x, y);
        ctx.restore();
    },

    _renderShootingStars(ctx, frameScale = 1) {
        // 通常は0.003だが、スクロール速度が上がるにつれて最大0.05まで流星の確率が上がる
        const chance = 0.003 + Math.min(0.047, Math.abs(State.scrollVelocity) * 0.002);
        if (Math.random() < 1 - Math.pow(1 - chance, frameScale)) {
            this._shootingStars.push({
                x: Math.random() * State.viewportW * 1.5,
                y: Math.random() * State.viewportH * 0.4,
                vx: -(5 + Math.random() * 5),
                vy: 2 + Math.random() * 3,
                alpha: 1
            });
        }
        this._shootingStars = this._shootingStars.filter(s => s.alpha > 0.02);
        this._shootingStars.forEach(s => {
            ctx.save();
            const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 12, s.y - s.vy * 12);
            g.addColorStop(0, `rgba(255,255,255,${s.alpha})`);
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = g; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x - s.vx * 14, s.y - s.vy * 14);
            ctx.stroke(); ctx.restore();
            s.x += s.vx * frameScale; s.y += s.vy * frameScale; s.alpha -= 0.022 * frameScale;
        });
    },

    _updateMinimap() {
        if (!UI.DOM.miniIndicator) return;
        const max = Math.max(1, State.totalWidth - State.viewportW);
        const pct = Math.min(100, Math.max(0, (State.scrollX / max) * 100));
        UI.DOM.miniIndicator.style.left = `${pct}%`;
        if (State.scrollX > 60 && UI.DOM.scrollHint && !UI.DOM.scrollHint.classList.contains('opacity-0')) {
            UI.DOM.scrollHint.classList.add('opacity-0', 'pointer-events-none');
            if (UI.DOM.miniMap) UI.DOM.miniMap.classList.remove('opacity-0');
        }
    },

    _planetAtPos(cx, cy) {
        const t = Date.now() / 1000;
        return State.planetData.find(p => {
            const sx = p.cx - State.scrollX;
            const sy = p.cy + Math.sin(t * CONFIG.CANVAS.FLOAT_SPEED + p.phase) * CONFIG.CANVAS.FLOAT_AMPLITUDE;
            return Math.hypot(cx - sx, cy - sy) < p.r * 1.25;
        }) || null;
    },

    _canvasPos(e) {
        const rect = UI.DOM.canvas.getBoundingClientRect();
        const src  = e.touches ? e.touches[0] : e;
        return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    },

    cancelDrag() {
        this._drag = null;
        State.isDragging = false;
        State.scrollVelocity = 0;
        if (UI.DOM.canvas) UI.DOM.canvas.style.cursor = State.hoveredPlanet ? 'pointer' : 'grab';
    },

    bindEvents() {
        const c = UI.DOM.canvas;
        const begin = (point, kind, timeStamp) => {
            this._drag = { kind, id: point.identifier, x: point.clientX, y: point.clientY,
                moved: 0, lastTime: timeStamp };
            State.isDragging = true;
            State.dragStartX = State.dragLastX = point.clientX;
            State.scrollVelocity = 0;
            this._hoverPoint = null;
            State.hoveredPlanet = null;
            c.style.cursor = 'grabbing';
        };
        const move = (point, timeStamp) => {
            if (!this._drag) return;
            this._drag.moved = Math.max(this._drag.moved, Math.hypot(point.clientX - this._drag.x, point.clientY - this._drag.y));
            const dx = point.clientX - State.dragLastX;
            const max = Math.max(0, State.totalWidth - State.viewportW);
            const candidate = State.scrollX - dx;
            State.scrollX -= dx * (candidate < 0 || candidate > max ? 0.25 : 1);
            const elapsed = timeStamp - this._drag.lastTime;
            State.scrollVelocity = -dx * (elapsed > 0 ? Math.min(2, (1000 / 60) / elapsed) : 1);
            State.dragLastX = point.clientX;
            this._drag.lastTime = timeStamp;
            this._syncViewportDom();
        };
        const end = (point, threshold) => {
            if (!this._drag) return;
            const distance = Math.max(this._drag.moved, Math.hypot(point.clientX - this._drag.x, point.clientY - this._drag.y));
            this._hoverPoint = this._drag.kind === 'mouse' ? this._canvasPos(point) : null;
            State.hoveredPlanet = this._hoverPoint ? this._planetAtPos(this._hoverPoint.x, this._hoverPoint.y) : null;
            this._drag = null;
            State.isDragging = false;
            c.style.cursor = State.hoveredPlanet ? 'pointer' : 'grab';
            if (distance < threshold) {
                State.scrollVelocity = 0;
                const pos = this._canvasPos(point);
                const planet = this._planetAtPos(pos.x, pos.y);
                if (planet) window._AppBridge?.handlePlanetClick(planet);
            }
        };
        c.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            begin(e, 'mouse', e.timeStamp);
        });
        window.addEventListener('mousemove', e => {
            if (this._drag?.kind === 'mouse') {
                if (e.buttons === 0) this.cancelDrag();
                else move(e, e.timeStamp);
            } else if (!State.isDragging) {
                this._hoverPoint = e.target === c ? this._canvasPos(e) : null;
                State.hoveredPlanet = this._hoverPoint
                    ? this._planetAtPos(this._hoverPoint.x, this._hoverPoint.y) : this._keyboardPlanet;
                c.style.cursor = State.hoveredPlanet ? 'pointer' : 'grab';
            }
        });
        c.addEventListener('mouseleave', () => {
            this._hoverPoint = null;
            if (!State.isDragging) State.hoveredPlanet = this._keyboardPlanet;
        });
        window.addEventListener('mouseup', e => {
            if (e.button === 0 && this._drag?.kind === 'mouse') end(e, 6);
        });
        c.addEventListener('touchstart', e => {
            if (e.touches.length !== 1) return this.cancelDrag();
            begin(e.touches[0], 'touch', e.timeStamp);
        }, { passive: true });
        c.addEventListener('touchmove', e => {
            if (this._drag?.kind !== 'touch') return;
            const touch = Array.from(e.touches).find(t => t.identifier === this._drag.id);
            if (touch) move(touch, e.timeStamp);
        }, { passive: true });
        c.addEventListener('touchend', e => {
            if (this._drag?.kind !== 'touch') return;
            const touch = Array.from(e.changedTouches).find(t => t.identifier === this._drag.id);
            if (touch) end(touch, 10);
        }, { passive: true });
        c.addEventListener('touchcancel', () => this.cancelDrag(), { passive: true });
        window.addEventListener('blur', () => {
            this.cancelDrag();
            this._hoverPoint = null;
            State.hoveredPlanet = this._keyboardPlanet;
        });
        c.addEventListener('wheel', e => {
            e.preventDefault();
            const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? State.viewportW : 1;
            const delta = (e.deltaX || e.deltaY) * unit;
            const max = Math.max(0, State.totalWidth - State.viewportW);
            const candidate = State.scrollX + delta;
            State.scrollX += delta * (candidate < 0 || candidate > max ? 0.25 : 1);
            State.scrollVelocity = 0;
            this._syncViewportDom();
        }, { passive: false });
        c.style.cursor = 'grab';
    }
};
