/**
 * ExportService - 画像のエクスポート処理を担当
 */
export class ExportService {
    /**
     * 合成画像をPNGとしてエクスポートする
     * @param {Object} options - エクスポートオプション
     * @param {HTMLCanvasElement} options.lineCanvas - 線が描画されたキャンバス
     * @param {HTMLImageElement|null} options.image - 背景画像（nullの場合は白背景）
     * @param {number} options.width - 出力幅
     * @param {number} options.height - 出力高さ
     * @param {string} options.mode - 'composite' または 'lines'
     * @param {string} options.type - 線のタイプ（ファイル名に使用）
     * @param {Function} [options.onError] - エラー時コールバック
     * @returns {Promise<boolean>} 成功時はtrue、失敗時はfalse
     */
    static async exportImage({ lineCanvas, image, width, height, mode, type, onError }) {
        try {
            if (!lineCanvas || !(lineCanvas instanceof HTMLCanvasElement)) {
                throw new Error('Invalid lineCanvas provided');
            }
            if (width <= 0 || height <= 0) {
                throw new Error('Invalid dimensions: width and height must be positive');
            }

            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = width;
            exportCanvas.height = height;
            const ctx = exportCanvas.getContext('2d');

            if (!ctx) {
                throw new Error('Failed to get 2D context for export canvas');
            }

            // 背景を描画（compositeモードの場合）
            if (mode === 'composite') {
                if (image) {
                    ctx.drawImage(image, 0, 0, width, height);
                } else {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                }
            }

            // 線を描画
            ctx.drawImage(lineCanvas, 0, 0, width, height);

            // toBlob() でメモリ効率的にダウンロード
            const blob = await new Promise((resolve, reject) => {
                exportCanvas.toBlob(b => {
                    if (b) resolve(b);
                    else reject(new Error('Failed to generate image blob'));
                }, 'image/png');
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = this.generateFileName(type, 'png');
            link.href = url;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            return true;
        } catch (error) {
            console.error('[ExportService] Export failed:', error);
            if (typeof onError === 'function') {
                onError(error.message);
            }
            return false;
        }
    }

    /**
     * SVG形式で線をエクスポートする
     * Canvasの描画内容をSVG内のimage要素として埋め込む
     * @param {Object} options
     * @param {HTMLCanvasElement} options.lineCanvas
     * @param {number} options.width
     * @param {number} options.height
     * @param {string} options.type
     * @param {Function} [options.onError]
     * @returns {boolean}
     */
    static exportSVG({ lineCanvas, width, height, type, onError }) {
        try {
            const dataUrl = lineCanvas.toDataURL('image/png');

            const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" href="${dataUrl}" />
</svg>`;

            const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = this.generateFileName(type, 'svg');
            link.href = url;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            return true;
        } catch (error) {
            console.error('[ExportService] SVG export failed:', error);
            if (typeof onError === 'function') {
                onError(error.message);
            }
            return false;
        }
    }

    /**
     * エクスポートファイル名を生成する
     * @param {string} type - 線のタイプ
     * @param {string} [ext='png'] - 拡張子
     * @returns {string} ファイル名
     */
    static generateFileName(type, ext = 'png') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeType = typeof type === 'string' ? type : 'lines';
        return `emphasis-${safeType}-${timestamp}.${ext}`;
    }
}
