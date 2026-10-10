/**
 * Color Lab - 純ロジック層
 * DOM依存を持たない計算処理のみを集約する
 */

(() => {
    const LOGIC_CONSTANTS = {
        BRIGHTNESS_THRESHOLD: 128,
        COLOR_NAME_THRESHOLD: 45
    };

    // 主要なカラーネーム代表値テーブル
    const COLOR_NAMES = [
        { name: "まっしろ", rgb: [255, 255, 255] },
        { name: "まっくろ", rgb: [0, 0, 0] },
        { name: "あか", rgb: [255, 0, 0] },
        { name: "みどり", rgb: [0, 255, 0] },
        { name: "あお", rgb: [0, 0, 255] },
        { name: "きいろ", rgb: [255, 255, 0] },
        { name: "みずいろ", rgb: [0, 255, 255] },
        { name: "ピンク", rgb: [255, 192, 203] },
        { name: "オレンジ", rgb: [255, 165, 0] },
        { name: "むらさき", rgb: [128, 0, 128] },
        { name: "グレー", rgb: [128, 128, 128] },
        { name: "ちゃいろ", rgb: [165, 42, 42] },
        { name: "ココアいろ", rgb: [183, 128, 128] },
        { name: "ミントいろ", rgb: [168, 230, 207] },
        { name: "さくらいろ", rgb: [255, 221, 225] },
        { name: "そらいろ", rgb: [135, 206, 235] },
        { name: "ゴールド", rgb: [255, 215, 0] },
        { name: "ネイビー", rgb: [0, 0, 128] },
        { name: "オリーブいろ", rgb: [128, 128, 0] },
        { name: "ライムグリーン", rgb: [50, 205, 50] },
        { name: "レモンいろ", rgb: [255, 250, 205] },
        { name: "モカベージュ", rgb: [245, 222, 179] },
        { name: "サーモンピンク", rgb: [250, 128, 114] },
        { name: "うすきみどり", rgb: [144, 238, 144] }
    ];

    /**
     * RGB値を16進カラーコードへ変換する
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @returns {string}
     */
    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    /**
     * 背景色の明るさに応じた文字色を返す
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @returns {string}
     */
    function getTextColor(r, g, b) {
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > LOGIC_CONSTANTS.BRIGHTNESS_THRESHOLD ? '#1e293b' : '#ffffff';
    }

    /**
     * RGB入力を 0-255 に補正する
     * @param {number|string} value
     * @param {number} fallback
     * @returns {number}
     */
    function coerceRgbValue(value, fallback = 0) {
        const parsed = Number.parseInt(String(value), 10);
        if (Number.isNaN(parsed)) {
            return fallback;
        }
        return Math.min(255, Math.max(0, parsed));
    }

    /**
     * 3要素のRGB配列へ正規化する
     * @param {unknown} tuple
     * @param {number} fallback
     * @returns {[number, number, number]}
     */
    function normalizeRgbTuple(tuple, fallback = 0) {
        if (!Array.isArray(tuple) || tuple.length !== 3) {
            return [fallback, fallback, fallback];
        }
        return [
            coerceRgbValue(tuple[0], fallback),
            coerceRgbValue(tuple[1], fallback),
            coerceRgbValue(tuple[2], fallback)
        ];
    }

    /**
     * RGB距離から 0-100 点を算出する
     * @param {number[]} current
     * @param {number[]} target
     * @returns {number}
     */
    function calculateColorScore(current, target) {
        if (!Array.isArray(current) || !Array.isArray(target) || current.length !== 3 || target.length !== 3) {
            return 0;
        }
        const safeCurrent = normalizeRgbTuple(current);
        const safeTarget = normalizeRgbTuple(target);
        const dist = Math.sqrt(
            Math.pow(safeCurrent[0] - safeTarget[0], 2) +
            Math.pow(safeCurrent[1] - safeTarget[1], 2) +
            Math.pow(safeCurrent[2] - safeTarget[2], 2)
        );
        const maxDist = Math.sqrt(255 * 255 * 3);
        return Math.max(0, Math.floor(100 - (dist / maxDist * 100)));
    }

    /**
     * スコアに対応する結果表示設定を返す
     * @param {number} score
     * @returns {{ title: string, className: string }}
     */
    function getResultPresentation(score) {
        if (score >= 95) {
            return {
                title: "てんさい！",
                className: "text-2xl font-black text-yellow-500 mb-1"
            };
        }
        if (score >= 80) {
            return {
                title: "すごい！",
                className: "text-2xl font-black text-green-500 mb-1"
            };
        }
        return {
            title: "おしい！",
            className: "text-2xl font-black text-slate-500 mb-1"
        };
    }

    /**
     * RGB表示用の短いラベルを返す
     * @param {number[]} rgb
     * @returns {string}
     */
    function formatRgbLabel(rgb) {
        const [r, g, b] = normalizeRgbTuple(rgb);
        return `R:${r} G:${g} B:${b}`;
    }

    /**
     * ゲーム進行状態を作成する
     * @param {number} levelCount
     * @returns {{ levelCount: number, currentLevelIndex: number, totalScore: number, completed: boolean }}
     */
    function createGameProgress(levelCount = 10) {
        const safeCount = Math.max(1, Number.parseInt(String(levelCount), 10) || 10);
        return {
            levelCount: safeCount,
            currentLevelIndex: 0,
            totalScore: 0,
            completed: false
        };
    }

    /**
     * ラウンド得点を進行状態に反映する
     * @param {{ levelCount: number, currentLevelIndex: number, totalScore: number, completed: boolean }} progress
     * @param {number} roundScore
     * @returns {{ levelCount: number, currentLevelIndex: number, totalScore: number, completed: boolean }}
     */
    function applyRoundScore(progress, roundScore) {
        if (!progress || typeof progress !== 'object') {
            return createGameProgress(10);
        }
        const safeScore = Math.max(0, Number.parseInt(String(roundScore), 10) || 0);
        return {
            levelCount: progress.levelCount,
            currentLevelIndex: progress.currentLevelIndex,
            totalScore: progress.totalScore + safeScore,
            completed: Boolean(progress.completed)
        };
    }

    /**
     * 次のレベルへ進める
     * @param {{ levelCount: number, currentLevelIndex: number, totalScore: number, completed: boolean }} progress
     * @returns {{ levelCount: number, currentLevelIndex: number, totalScore: number, completed: boolean }}
     */
    function advanceLevel(progress) {
        if (!progress || typeof progress !== 'object') {
            return createGameProgress(10);
        }
        const nextIndex = progress.currentLevelIndex + 1;
        const completed = nextIndex >= progress.levelCount;
        return {
            levelCount: progress.levelCount,
            currentLevelIndex: Math.min(nextIndex, progress.levelCount),
            totalScore: progress.totalScore,
            completed
        };
    }

    /**
     * 補色（反対の色）を計算する
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @returns {[number, number, number]}
     */
    function getComplementaryColor(r, g, b) {
        return [
            255 - coerceRgbValue(r, 128),
            255 - coerceRgbValue(g, 128),
            255 - coerceRgbValue(b, 128)
        ];
    }

    /**
     * 2つのRGBカラーをブレンド（合成）する
     * @param {{r: number, g: number, b: number}} colorA
     * @param {{r: number, g: number, b: number}} colorB
     * @returns {[number, number, number]}
     */
    function blendColors(colorA, colorB) {
        if (!colorA || !colorB) {
            return [128, 128, 128];
        }
        const r = Math.round((colorA.r + colorB.r) / 2);
        const g = Math.round((colorA.g + colorB.g) / 2);
        const b = Math.round((colorA.b + colorB.b) / 2);
        return [
            coerceRgbValue(r, 128),
            coerceRgbValue(g, 128),
            coerceRgbValue(b, 128)
        ];
    }

    /**
     * RGBをHSL文字列へ変換する
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @returns {string}
     */
    function rgbToHsl(r, g, b) {
        const nr = coerceRgbValue(r, 128) / 255;
        const ng = coerceRgbValue(g, 128) / 255;
        const nb = coerceRgbValue(b, 128) / 255;
        const max = Math.max(nr, ng, nb);
        const min = Math.min(nr, ng, nb);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case nr: h = (ng - nb) / d + (ng < nb ? 6 : 0); break;
                case ng: h = (nb - nr) / d + 2; break;
                case nb: h = (nr - ng) / d + 4; break;
            }
            h /= 6;
        }

        return `HSL(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
    }

    /**
     * 作成したRGBから最も近い代表的なカラーネームを返す
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @returns {string}
     */
    function getColorName(r, g, b) {
        const curR = coerceRgbValue(r, 128);
        const curG = coerceRgbValue(g, 128);
        const curB = coerceRgbValue(b, 128);
        
        let minDistance = Infinity;
        let closestName = "カスタムカラー";

        for (const color of COLOR_NAMES) {
            const [tr, tg, tb] = color.rgb;
            const dist = (
                Math.pow(curR - tr, 2) +
                Math.pow(curG - tg, 2) +
                Math.pow(curB - tb, 2)
            );
            if (dist < minDistance) {
                minDistance = dist;
                closestName = color.name;
            }
        }

        if (minDistance < LOGIC_CONSTANTS.COLOR_NAME_THRESHOLD ** 2) {
            return closestName;
        }
        return "カスタムカラー";
    }

    /**
     * キラお題適用時のスコア倍率計算（1.5倍、最大100点）
     * @param {number} score
     * @param {boolean} isShiny
     * @returns {number}
     */
    function applyShinyScoreMultiplier(score, isShiny) {
        const safeScore = Math.max(0, Math.min(100, Number.parseInt(String(score), 10) || 0));
        if (!isShiny) return safeScore;
        return Math.min(100, Math.round(safeScore * 1.5));
    }

    /**
     * タイムアタックにおける回答スコア別の時間ボーナス（秒）
     * @param {number} score
     * @returns {number}
     */
    function calculateTimeBonus(score) {
        const safeScore = Math.max(0, Number.parseInt(String(score), 10) || 0);
        if (safeScore >= 95) return 7;
        if (safeScore >= 80) return 4;
        if (safeScore >= 60) return 2;
        return 0;
    }

    /**
     * 合計スコアに基づくアワード（メダルと称号）の決定
     * @param {number} totalScore
     * @returns {{medal: string, title: string, medalEmoji: string}}
     */
    function getAward(totalScore) {
        const score = Math.max(0, Number.parseInt(String(totalScore), 10) || 0);
        if (score >= 950) {
            return { medal: 'gold', title: 'いろのまじゅつし', medalEmoji: '🥇' };
        }
        if (score >= 850) {
            return { medal: 'silver', title: 'カラーマスター', medalEmoji: '🥈' };
        }
        if (score >= 700) {
            return { medal: 'bronze', title: 'いろのけんきゅういん', medalEmoji: '🥉' };
        }
        return { medal: 'none', title: 'みならい助手', medalEmoji: '🎗️' };
    }

    const ColorLabLogic = {
        rgbToHex,
        getTextColor,
        coerceRgbValue,
        normalizeRgbTuple,
        calculateColorScore,
        getResultPresentation,
        formatRgbLabel,
        createGameProgress,
        applyRoundScore,
        advanceLevel,
        getComplementaryColor,
        blendColors,
        rgbToHsl,
        getColorName,
        applyShinyScoreMultiplier,
        calculateTimeBonus,
        getAward
    };

    if (typeof window !== 'undefined') {
        window.ColorLabLogic = ColorLabLogic;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ColorLabLogic;
    }
})();

