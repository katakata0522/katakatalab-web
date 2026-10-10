export const MAX_IMAGE_SIZE = 2048;
export const REFERENCE_SIZE = 1000;

// デフォルトキャンバスサイズ（画像未読み込み時）
export const DEFAULT_CANVAS_WIDTH = 1080;
export const DEFAULT_CANVAS_HEIGHT = 1080;

// UI定数
export const TOAST_DURATION_MS = 2500;
export const DEBOUNCE_RESIZE_MS = 100;
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 4.0;
export const ZOOM_STEP = 0.1;
export const ASSET_VERSION = '20260613-2';

export const PRESETS = {
    basic: {
        count: 60, width: 4.0, minLen: 40, maxLen: 100, randomness: 0,
        color: "#FF0000", endColor: "", taper: 0, aperture: 360, direction: 0
    },
    manga: {
        count: 100, width: 2.0, minLen: 35, maxLen: 120, randomness: 10,
        color: "#000000", endColor: "", taper: 90, aperture: 360, direction: 0
    },
    radial: {
        count: 50, width: 1.0, minLen: 0, maxLen: 100, randomness: 10,
        color: "#FFD700", endColor: "", taper: 0, aperture: 360, direction: 0
    },
    speed: {
        count: 30, width: 3.0, minLen: 20, maxLen: 150, randomness: 20,
        color: "#000000", endColor: "", taper: 50, direction: 45, aperture: 360
    }
};
