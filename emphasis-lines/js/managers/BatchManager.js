import { store } from '../state.js?v=20260613-2';
import { PRESETS } from '../constants.js?v=20260613-2';
import { Random } from '../utils/random.js?v=20260613-2';

// テーマ定義 (売れる素材パッケージ)
const THEMES = {
    IMPACT: {
        name: 'impact',
        base: 'manga',
        params: {
            count: [120, 200],
            width: [3.0, 8.0],
            minLen: [20, 50],
            maxLen: [80, 100],
            randomness: [0.1, 0.4],
            colors: ['#000000', '#FF0000', '#FFD700']
        }
    },
    SPEED: {
        name: 'speed',
        base: 'speed',
        params: {
            count: [40, 80],
            width: [1.0, 4.0],
            minLen: [50, 80],
            maxLen: [90, 120],
            taper: [0.0, 0.5],
            colors: ['#000000', '#FFFFFF', '#0000FF']
        }
    },
    HORROR: {
        name: 'horror',
        base: 'manga',
        params: {
            count: [150, 250],
            width: [0.5, 2.5],
            minLen: [10, 90],
            maxLen: [20, 100],
            randomness: [0.6, 1.0],
            colors: ['#000000', '#4B0082', '#8B0000']
        }
    },
    POP: {
        name: 'pop',
        base: 'radial',
        params: {
            count: [50, 80],
            width: [5.0, 12.0],
            minLen: [40, 60],
            maxLen: [80, 100],
            taper: [0.0, 0.2],
            colors: ['#FF69B4', '#00BFFF', '#FFD700', '#32CD32']
        }
    },
    COMIC: {
        name: 'comic',
        base: 'manga',
        params: {
            count: [60, 100],
            width: [4.0, 10.0],
            minLen: [30, 60],
            maxLen: [50, 80],
            taper: [0.8, 1.0],
            randomness: [0.1, 0.3],
            colors: ['#000000']
        }
    }
};

/**
 * BatchManager - 素材量産用バッチ生成機能
 * ⚠️ 管理者専用機能
 */
export class BatchManager {
    constructor(renderer, lineCanvas, bgCanvas) {
        this.renderer = renderer;
        this.lineCanvas = lineCanvas;
        this.bgCanvas = bgCanvas;
        this.history = [];
        this.rng = new Random();
    }

    /**
     * バッチ生成を実行
     * @param {Object} options
     */
    async generate(options) {
        const {
            count = 10,
            themeKey = null,
            width = 3840,
            height = 2160
        } = options;

        const results = [];
        const originalState = store.getState();
        this.history = [];

        this.lineCanvas.width = width;
        this.lineCanvas.height = height;
        this.bgCanvas.width = width;
        this.bgCanvas.height = height;

        const theme = THEMES[themeKey];

        for (let i = 0; i < count; i++) {
            let params, type, color, seed;
            let attempts = 0;
            const maxAttempts = 10;

            do {
                seed = Date.now() + i + attempts;
                this.rng.setSeed(seed);

                if (theme) {
                    type = theme.base;
                    const colorIndex = Math.floor(this.rng.next() * theme.params.colors.length);
                    color = theme.params.colors[colorIndex];

                    const p = theme.params;
                    params = {
                        ...PRESETS[type],
                        count: Math.floor(this.rng.range(p.count[0], p.count[1])),
                        width: this.rng.range(p.width[0], p.width[1]),
                        minLen: this.rng.range(p.minLen[0], p.minLen[1]),
                        maxLen: this.rng.range(p.maxLen[0], p.maxLen[1]),
                        randomness: p.randomness ? this.rng.range(p.randomness[0], p.randomness[1]) : PRESETS[type].randomness,
                        taper: p.taper ? this.rng.range(p.taper[0], p.taper[1]) : PRESETS[type].taper,
                        color,
                        whiteBorder: color === '#000000' || color === '#0000FF' || color === '#4B0082'
                    };
                } else {
                    const types = ['basic', 'manga', 'radial', 'speed'];
                    const colors = ['#000000', '#FF0000', '#0000FF', '#FFFF00', '#FFFFFF'];
                    type = types[Math.floor(this.rng.next() * types.length)];
                    color = colors[Math.floor(this.rng.next() * colors.length)];
                    params = {
                        ...PRESETS[type],
                        count: Math.floor(this.rng.range(30, 150)),
                        width: this.rng.range(1.0, 8.0),
                        minLen: this.rng.range(10, 40),
                        maxLen: this.rng.range(60, 100),
                        color,
                        whiteBorder: color === '#000000'
                    };
                }

                attempts++;
            } while (this.#isDuplicate(params) && attempts < maxAttempts);

            this.#addToHistory(params);

            const tempState = {
                ...originalState,
                type,
                imgWidth: width,
                imgHeight: height,
                centerX: 0.5,
                centerY: 0.5,
                seed,
                params
            };

            this.renderer.render(tempState);

            const blob = await this.#canvasToBlob(this.lineCanvas);
            results.push(blob);

            if (this.onProgress) this.onProgress(i + 1, count);
        }

        // 復元
        store.setState({ imgWidth: originalState.imgWidth, imgHeight: originalState.imgHeight });
        this.lineCanvas.width = originalState.imgWidth;
        this.lineCanvas.height = originalState.imgHeight;
        this.bgCanvas.width = originalState.imgWidth;
        this.bgCanvas.height = originalState.imgHeight;

        return results;
    }

    /**
     * 重複判定ロジック
     */
    #isDuplicate(newParams) {
        if (this.history.length === 0) return false;

        for (const oldParams of this.history) {
            if (newParams.color !== oldParams.color) continue;

            const diffCount = Math.abs(newParams.count - oldParams.count) / 200;
            const diffWidth = Math.abs(newParams.width - oldParams.width) / 10;
            const diffMinLen = Math.abs(newParams.minLen - oldParams.minLen) / 100;
            const diffMaxLen = Math.abs(newParams.maxLen - oldParams.maxLen) / 100;

            const totalDiff = diffCount + diffWidth + diffMinLen + diffMaxLen;

            if (totalDiff < 0.05) {
                return true;
            }
        }
        return false;
    }

    #addToHistory(params) {
        if (this.history.length > 50) this.history.shift();
        this.history.push(params);
    }

    /**
     * JSZip を動的に読み込む（エラーハンドリング + タイムアウト付き）
     * @returns {Promise<void>}
     */
    async #loadJSZip() {
        if (window.JSZip) return;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.integrity = 'sha512-XMVd28F1oH/O71fzwBnV7HoI/lNv1Fzj0bFcEX/W1pVdIYF3R9VS1Z1M4q4zXcR73MCh+JnFCojhB1CR7+Aqw==';
            script.crossOrigin = 'anonymous';

            const timeout = setTimeout(() => {
                reject(new Error('JSZip の読み込みがタイムアウトしました（10秒）'));
            }, 10000);

            script.onload = () => {
                clearTimeout(timeout);
                resolve();
            };

            script.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('JSZip の読み込みに失敗しました。ネットワーク接続を確認してください。'));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * 生成した画像をZIPでダウンロード
     */
    async downloadAsZip(options, zipName = 'emphasis_lines_pack') {
        const blobs = await this.generate(options);

        await this.#loadJSZip();

        const zip = new window.JSZip();
        const folder = zip.folder('emphasis_lines');

        blobs.forEach((blob, index) => {
            const fileName = `line_${String(index + 1).padStart(3, '0')}.png`;
            folder.file(fileName, blob);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        this.#downloadBlob(content, `${zipName}.zip`);
    }

    /**
     * 連番でひとつずつダウンロード
     */
    async downloadSequential(options, prefix = 'line') {
        const blobs = await this.generate(options);

        for (let i = 0; i < blobs.length; i++) {
            const fileName = `${prefix}_${String(i + 1).padStart(3, '0')}.png`;
            this.#downloadBlob(blobs[i], fileName);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * キャンバスをBlobに変換
     */
    #canvasToBlob(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas to Blob conversion failed'));
            }, 'image/png');
        });
    }

    /**
     * Blobをダウンロード
     */
    #downloadBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
