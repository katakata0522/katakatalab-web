import { REFERENCE_SIZE } from '../constants.js?v=20261010-1';
import { Random } from '../utils/random.js?v=20261010-1';
import { validateRenderParams } from '../utils/validation.js?v=20261010-1';
import { AnalyticsManager } from '../utils/analytics.js?v=20261010-1';

/**
 * @typedef {Object} LineParams
 * @property {number} count - 線の本数
 * @property {number} width - 基本線幅（スケール適用済）
 * @property {string} color - 線の色
 * @property {number} randomness - ランダム性 (0-1)
 * @property {number} taper - テーパー率 (0-1)
 * @property {number} minLen - 最小長さ (%)
 * @property {number} maxLen - 最大長さ (%)
 * @property {boolean} whiteBorder - 白フチの有無
 * @property {number} directionRad - 方向（ラジアン）
 * @property {number} directionDeg - 方向（度）
 * @property {number} apertureRad - 開き角度（ラジアン）
 */

/**
 * @typedef {Object} RenderContext
 * @property {number} canvasWidth - キャンバス幅
 * @property {number} canvasHeight - キャンバス高さ
 * @property {number} centerX - 中心X座標（ピクセル）
 * @property {number} centerY - 中心Y座標（ピクセル）
 * @property {number} diagonal - 対角線の長さ
 * @property {number} scale - スケール係数
 * @property {string} type - 線のタイプ (basic, manga, radial, speed)
 * @property {LineParams} params - 描画パラメータ
 */

export class LineRenderer {
    constructor(lineCanvas, bgCanvas) {
        this.ctxLine = lineCanvas.getContext('2d');
        this.ctxBg = bgCanvas.getContext('2d');
        this.lineCanvas = lineCanvas;
        this.bgCanvas = bgCanvas;
        this.rng = new Random();
    }

    /**
     * Calculate border width for white stroke, scaled to canvas size
     * @returns {number} Border width in pixels
     */
    #getBorderWidth() {
        return 4 * (Math.max(this.bgCanvas.width, this.bgCanvas.height) / REFERENCE_SIZE);
    }

    /**
     * Clear the line canvas.
     * @param {number} width 
     * @param {number} height 
     */
    clear(width, height) {
        this.ctxLine.clearRect(0, 0, width, height);
    }

    drawPlaceholder(state) {
        const { width, height } = this.bgCanvas;
        const ctx = this.ctxBg;

        ctx.clearRect(0, 0, width, height); // Always clear

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // No placeholder text: preview and PNG export must look the same.
        // Without an image, leave a clean white background for the lines.
        if (state.image) {
            ctx.drawImage(state.image, 0, 0, width, height);
        }
    }

    /**
     * Main render method.
     * @param {Object} state - Application state containing params and context.
     */
    render(state) {
        const startTime = performance.now();
        const w = state.imgWidth;
        const h = state.imgHeight;

        this.clear(w, h);
        this.ctxLine.lineCap = 'round';
        this.rng.setSeed(state.seed || 12345);

        const scale = Math.max(w, h) / REFERENCE_SIZE;
        const rawParams = state.params;

        const cleanParams = validateRenderParams(rawParams);

        /** @type {RenderContext} */
        const context = {
            canvasWidth: w,
            canvasHeight: h,
            centerX: w * state.centerX,
            centerY: h * state.centerY,
            diagonal: Math.sqrt(w * w + h * h),
            scale: scale,
            type: state.type,
            params: {
                count: cleanParams.count,
                width: cleanParams.width * scale,
                color: cleanParams.color,
                endColor: cleanParams.endColor || '',
                randomness: cleanParams.randomness / 100,
                taper: cleanParams.taper / 100,
                minLen: cleanParams.minLen,
                maxLen: cleanParams.maxLen,
                whiteBorder: cleanParams.whiteBorder,
                directionRad: (cleanParams.direction - 90) * (Math.PI / 180),
                directionDeg: cleanParams.direction,
                apertureRad: cleanParams.aperture * (Math.PI / 180)
            }
        };

        if (state.type === 'speed') {
            this.drawSpeedLines(context);
        } else {
            this.drawRadiatingLines(context);
        }

        const endTime = performance.now();
        AnalyticsManager.trackPerformance('render_time', endTime - startTime);
    }

    /**
     * 放射状の線を描画
     * @param {RenderContext} ctx - レンダリングコンテキスト
     */
    drawRadiatingLines(ctx) {
        const { centerX: cx, centerY: cy, diagonal: diag, type, params } = ctx;
        const { count, width, color, endColor, randomness: rand, taper, directionRad: dirRad, apertureRad, minLen: minLenPct, maxLen: maxLenPct, whiteBorder } = params;

        const canvasCtx = this.ctxLine;
        const startAngle = dirRad - (apertureRad / 2);
        const angleStep = apertureRad / count;

        for (let i = 0; i < count; i++) {
            let angle = startAngle + (i * angleStep);

            // Jitter
            if (type === 'radial') {
                angle += (this.rng.next() - 0.5) * angleStep * rand * 2.0;
            } else {
                angle += (this.rng.next() - 0.5) * angleStep * rand * 0.8;
            }

            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            // Lengths
            let minR = (diag * (minLenPct / 200));
            if (type === 'manga') {
                minR *= (1.0 + (this.rng.next() - 0.5) * rand);
            }

            const maxLenFactor = maxLenPct / 100;
            const lenRand = 1.0 + (this.rng.next() - 0.5) * rand;
            let maxR = (type === 'basic') ? minR + (diag * 0.5 * maxLenFactor * lenRand) : (diag * maxLenFactor);
            if (type === 'radial') maxR = minR + (diag * 0.5 * maxLenFactor * (0.8 + this.rng.next() * 0.4));

            const x1 = cx + cos * minR;
            const y1 = cy + sin * minR;
            const x2 = cx + cos * maxR;
            const y2 = cy + sin * maxR;

            let thisWidth = width * (1 + (this.rng.next() - 0.5) * rand);

            // グラデーション or 単色
            const lineColor = endColor
                ? this.#createGradient(canvasCtx, x1, y1, x2, y2, color, endColor)
                : color;

            if (taper > 0.1) {
                this.drawTaperedStroke(canvasCtx, x2, y2, x1, y1, thisWidth, thisWidth * (1 - taper), lineColor, whiteBorder);
            } else {
                this.drawLineStroke(canvasCtx, x1, y1, x2, y2, thisWidth, lineColor, whiteBorder);
            }
        }
    }

    /**
     * スピード線を描画
     * @param {RenderContext} ctx - レンダリングコンテキスト
     */
    drawSpeedLines(ctx) {
        const { canvasWidth: w, canvasHeight: h, diagonal: diag, params } = ctx;
        const { count, width, color, endColor, randomness: rand, taper, directionDeg: angleDeg, minLen: minLenPct, maxLen: maxLenPct, whiteBorder } = params;

        const canvasCtx = this.ctxLine;
        const angleRad = angleDeg * (Math.PI / 180);
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const pCos = Math.cos(angleRad + Math.PI / 2);
        const pSin = Math.sin(angleRad + Math.PI / 2);

        const coverage = diag * 2;
        const step = coverage / count;
        const centerX = w / 2;
        const centerY = h / 2;

        // NOTE: Loop from -count/2 to count/2 to center lines and match UI count
        const halfCount = Math.floor(count / 2);
        for (let i = -halfCount; i < halfCount; i++) {
            const offset = i * step + (this.rng.next() - 0.5) * step * rand;
            const bx = centerX + pCos * offset;
            const by = centerY + pSin * offset;

            const len = diag * (maxLenPct / 100 + 0.5) * (1 + this.rng.next() * 0.5);
            const segmentLen = len * (0.2 + (minLenPct / 100));
            const shift = (this.rng.next() - 0.5) * diag;

            const x1 = bx + cos * (shift - segmentLen);
            const y1 = by + sin * (shift - segmentLen);
            const x2 = bx + cos * (shift + segmentLen);
            const y2 = by + sin * (shift + segmentLen);

            const thisWidth = width * (0.8 + this.rng.next() * 0.4);

            const lineColor = endColor
                ? this.#createGradient(canvasCtx, x1, y1, x2, y2, color, endColor)
                : color;

            if (taper > 0.1) {
                this.drawTaperedStroke(canvasCtx, x1, y1, x2, y2, thisWidth, thisWidth * (1 - taper), lineColor, whiteBorder);
            } else {
                this.drawLineStroke(canvasCtx, x1, y1, x2, y2, thisWidth, lineColor, whiteBorder);
            }
        }
    }

    drawTaperedStroke(ctx, x1, y1, x2, y2, wStart, wEnd, color, whiteBorder) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx);
        const perp = angle + Math.PI / 2;
        const cos = Math.cos(perp);
        const sin = Math.sin(perp);

        const p1x = x1 + cos * (wStart / 2);
        const p1y = y1 + sin * (wStart / 2);
        const p2x = x2 + cos * (wEnd / 2);
        const p2y = y2 + sin * (wEnd / 2);
        const p3x = x2 - cos * (wEnd / 2);
        const p3y = y2 - sin * (wEnd / 2);
        const p4x = x1 - cos * (wStart / 2);
        const p4y = y1 - sin * (wStart / 2);

        if (whiteBorder) {
            const bW = this.#getBorderWidth();
            const bp1x = x1 + cos * (wStart / 2 + bW);
            const bp1y = y1 + sin * (wStart / 2 + bW);
            const bp2x = x2 + cos * (wEnd / 2 + bW);
            const bp2y = y2 + sin * (wEnd / 2 + bW);
            const bp3x = x2 - cos * (wEnd / 2 + bW);
            const bp3y = y2 - sin * (wEnd / 2 + bW);
            const bp4x = x1 - cos * (wStart / 2 + bW);
            const bp4y = y1 - sin * (wStart / 2 + bW);

            ctx.beginPath();
            ctx.moveTo(bp1x, bp1y);
            ctx.lineTo(bp2x, bp2y);
            ctx.lineTo(bp3x, bp3y);
            ctx.lineTo(bp4x, bp4y);
            ctx.closePath();
            ctx.fillStyle = "#FFFFFF";
            ctx.fill();
        }

        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(p3x, p3y);
        ctx.lineTo(p4x, p4y);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    drawLineStroke(ctx, x1, y1, x2, y2, width, color, whiteBorder) {
        if (whiteBorder) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth = width + this.#getBorderWidth();
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.stroke();
    }

    /**
     * 2点間のリニアグラデーションを生成
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x1 @param {number} y1
     * @param {number} x2 @param {number} y2
     * @param {string} startColor @param {string} endColor
     * @returns {CanvasGradient}
     */
    #createGradient(ctx, x1, y1, x2, y2, startColor, endColor) {
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, startColor);
        grad.addColorStop(1, endColor);
        return grad;
    }
}
