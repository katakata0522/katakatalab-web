import { MAX_IMAGE_SIZE } from '../constants.js?v=20260613-2';

/**
 * ImageService - 画像の読み込みとリサイズ処理を担当
 * UIManagerから分離された画像処理ロジック
 */
export class ImageService {
    /**
     * ファイルから画像を読み込み、必要に応じてリサイズする
     * @param {File} file - 読み込むファイル
     * @returns {Promise<{image: HTMLImageElement, width: number, height: number}>}
     */
    static async loadImage(file) {
        if (!file) {
            throw new Error('No file provided');
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
        const ratio = w / h;

        if (w > h) {
            w = MAX_IMAGE_SIZE;
            h = MAX_IMAGE_SIZE / ratio;
        } else {
            h = MAX_IMAGE_SIZE;
            w = MAX_IMAGE_SIZE * ratio;
        }

        // 一時キャンバスでリサイズ
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        tempCanvas.getContext('2d').drawImage(img, 0, 0, w, h);

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
        const parts = preset.split('x').map(Number);
        if (parts.length === 2 && parts[0] && parts[1]) {
            return { width: parts[0], height: parts[1] };
        }
        return null;
    }
}
