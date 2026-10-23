import { MAX_IMAGE_SIZE } from '../constants.js?v=20261010-1';

/**
 * ImageService - 画像の読み込みとリサイズ処理を担当
 * UIManagerから分離された画像処理ロジック
 */
export class ImageService {
    static MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

    /**
     * ファイルから画像を読み込み、必要に応じてリサイズする
     * @param {File} file - 読み込むファイル
     * @returns {Promise<{image: HTMLImageElement, width: number, height: number}>}
     */
    static async loadImage(file) {
        if (!file) {
            throw new Error('画像ファイルを選択してください');
        }
        if (!['image/png', 'image/jpeg'].includes(file.type)) {
            throw new Error('PNGまたはJPEG形式の画像を選択してください');
        }
        if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > this.MAX_UPLOAD_BYTES) {
            throw new Error('画像は20MB以下のファイルを選択してください');
        }

        // 1. FileをDataURLとして読み込む
        const dataUrl = await this.#readFileAsDataURL(file);

        // 2. DataURLからImageを作成
        const img = await this.#loadImageFromDataURL(dataUrl);

        // 3. 必要に応じてリサイズ
        if (img.width > MAX_IMAGE_SIZE || img.height > MAX_IMAGE_SIZE) {
            return await this.resizeImage(img);
        }

        return {
            image: img,
            width: img.width,
            height: img.height,
            resized: false
        };
    }

    /**
     * FileをDataURLとして読み込む
     * @param {File} file
     * @returns {Promise<string>}
     */
    static #readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.onload = (event) => resolve(event.target.result);
            reader.readAsDataURL(file);
        });
    }

    /**
     * DataURLからImageを作成
     * @param {string} dataUrl
     * @returns {Promise<HTMLImageElement>}
     */
    static #loadImageFromDataURL(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onerror = () => reject(new Error('Failed to load image'));
            img.onload = () => resolve(img);
            img.src = dataUrl;
        });
    }

    /**
     * 画像を最大サイズに収まるようリサイズする
     * @param {HTMLImageElement} img - 元の画像
     * @returns {Promise<{image: HTMLImageElement, width: number, height: number}>}
     */
    static async resizeImage(img) {
        let w = img.width;
        let h = img.height;
        if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) {
            throw new Error('画像の縦横サイズが不正です');
        }
        const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));

        // 一時キャンバスでリサイズ
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) throw new Error('画像のリサイズに失敗しました');
        ctx.drawImage(img, 0, 0, w, h);

        // 新しいImageオブジェクトを作成
        const resizedImg = await this.#loadImageFromDataURL(
            tempCanvas.toDataURL('image/png')
        );

        return {
            image: resizedImg,
            width: w,
            height: h,
            resized: true,
            originalWidth: img.width,
            originalHeight: img.height
        };
    }

    /**
     * キャンバスサイズをパースする
     * @param {string} preset - "1080x1080" のような形式
     * @returns {{width: number, height: number} | null}
     */
    static parseCanvasPreset(preset) {
        if (typeof preset !== 'string' || !/^\d{1,4}x\d{1,4}$/i.test(preset)) return null;
        const [width, height] = preset.toLowerCase().split('x').map(Number);
        if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)
            || width < 1 || height < 1 || width > 4096 || height > 4096) return null;
        return { width, height };
    }
}
