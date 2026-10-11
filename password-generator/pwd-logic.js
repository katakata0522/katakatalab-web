/**
 * パスワード生成ロジッククラス v2.0
 * 安全な乱数生成器を使用し、細かな条件指定に対応
 * - パスワード生成（文字種・長さ・除外ルール指定）
 * - 強度計算 + クラック推定時間
 */
class PasswordLogic {
    constructor() {
        this.CHAR_SETS = Object.freeze({
            lower: 'abcdefghijklmnopqrstuvwxyz',
            upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            number: '0123456789',
            symbol: '!@#$%^&*()_+-=[]{}|;:,.<>?'
        });
        // 紛らわしい文字の定義
        this.AMBIGUOUS_CHARS = /[il1LoO0]/g;
    }

    /**
     * パスワードを生成する
     * @param {Object} options
     * @param {number} [options.length=12] - パスワードの長さ
     * @param {boolean} [options.useLower=true] - 小文字を使用
     * @param {boolean} [options.useUpper=true] - 大文字を使用
     * @param {boolean} [options.useNumber=true] - 数字を使用
     * @param {boolean} [options.useSymbol=false] - 記号を使用
     * @param {string} [options.customSymbols=''] - カスタム記号セット（空の場合はデフォルト）
     * @param {boolean} [options.excludeAmbiguous=false] - 紛らわしい文字を除外
     * @param {number} [options.count=1] - 生成個数
     * @returns {string[]} 生成されたパスワードの配列
     */
    generate(options) {
        this.lastGeneratedPoolSize = 0;
        const {
            length = 12,
            useLower = true,
            useUpper = true,
            useNumber = true,
            useSymbol = false,
            customSymbols = '',
            excludeAmbiguous = false,
            count = 1
        } = options;

        const requiredSets = [];
        let charPool = '';

        if (useLower) {
            const chars = this._filterAmbiguous(this.CHAR_SETS.lower, excludeAmbiguous);
            if (chars.length === 0) return [];
            requiredSets.push(chars);
            charPool += chars;
        }
        if (useUpper) {
            const chars = this._filterAmbiguous(this.CHAR_SETS.upper, excludeAmbiguous);
            if (chars.length === 0) return [];
            requiredSets.push(chars);
            charPool += chars;
        }
        if (useNumber) {
            const chars = this._filterAmbiguous(this.CHAR_SETS.number, excludeAmbiguous);
            if (chars.length === 0) return [];
            requiredSets.push(chars);
            charPool += chars;
        }
        if (useSymbol) {
            // カスタム記号セットが指定されていればそちらを使用
            const symbolSet = customSymbols || this.CHAR_SETS.symbol;
            const chars = this._filterAmbiguous(symbolSet, excludeAmbiguous);
            if (chars.length === 0) return [];
            requiredSets.push(chars);
            charPool += chars;
        }

        // 文字プールが空の場合は空配列を返す
        if (charPool === '') return [];
        // 必須セット数が長さを超える場合は生成不可
        if (length < requiredSets.length) return [];

        this.lastGeneratedPoolSize = new Set(charPool.split('')).size;
        const passwords = [];
        for (let i = 0; i < count; i++) {
            passwords.push(this._createSingle(charPool, length, requiredSets));
        }
        return passwords;
    }

    /**
     * パスワード強度をエントロピーベースで計算
     * @param {string} pwd - チェックするパスワード
     * @returns {number} 0-100の強度スコア
     */
    /**
     * 手入力の文字カテゴリから候補数を概算（生成条件とは別の参考値）
     * @param {string} pwd - 対象のパスワード
     * @returns {number} カテゴリから概算した候補数
     * @private
     */
    _calculatePoolSize(pwd) {
        if (!pwd) return 0;
        let poolSize = 0;
        let hasLower = false;
        let hasUpper = false;
        let hasNumber = false;
        let hasSymbol = false;
        
        const chars = Array.from(pwd);
        const uniqueOthers = new Set();

        for (const char of chars) {
            if (/[a-z]/.test(char)) {
                hasLower = true;
            } else if (/[A-Z]/.test(char)) {
                hasUpper = true;
            } else if (/[0-9]/.test(char)) {
                hasNumber = true;
            } else if (this.CHAR_SETS.symbol.includes(char)) {
                hasSymbol = true;
            } else {
                // 全角文字やカスタム記号、スペースなどの未知の文字種
                uniqueOthers.add(char);
            }
        }

        if (hasLower) poolSize += 26;
        if (hasUpper) poolSize += 26;
        if (hasNumber) poolSize += 10;
        if (hasSymbol) poolSize += this.CHAR_SETS.symbol.length;
        
        // 未知の文字はユニークな文字数分をプールに追加（最低限の安全性評価）
        if (uniqueOthers.size > 0) {
            poolSize += uniqueOthers.size;
        }

        return poolSize;
    }

    // Generated values use their actual configured pool. Manual input is only a
    // rough reference, with simple repetition and straight sequences discounted.
    _estimateEntropy(pwd, generatedPoolSize) {
        if (!pwd) return 0;
        const poolSize = generatedPoolSize === undefined ? this._calculatePoolSize(pwd) : generatedPoolSize;
        if (!Number.isFinite(poolSize) || poolSize <= 1) return 0;
        if (generatedPoolSize !== undefined) return pwd.length * Math.log2(poolSize);
        const chars = Array.from(pwd);
        let length = chars.length;
        // KMP prefix table finds the shortest repeated unit in linear time.
        const prefix = new Uint32Array(length);
        for (let i = 1; i < length; i++) {
            let j = prefix[i - 1];
            while (j > 0 && chars[i] !== chars[j]) j = prefix[j - 1];
            if (chars[i] === chars[j]) j++;
            prefix[i] = j;
        }
        const period = length - prefix[length - 1];
        if (length % period === 0) length = period;
        if (length > 2) {
            const step = chars[1].codePointAt(0) - chars[0].codePointAt(0);
            if (step === 1 || step === -1) {
                let sequential = true;
                for (let i = 2; i < length; i++) {
                    if (chars[i].codePointAt(0) - chars[i - 1].codePointAt(0) !== step) { sequential = false; break; }
                }
                if (sequential) length = 1;
            }
        }
        return length * Math.log2(poolSize);
    }

    checkStrength(pwd, generatedPoolSize) {
        return Math.min(100, Math.round((this._estimateEntropy(pwd, generatedPoolSize) / 128) * 100));
    }

    /**
     * パスワード強度ラベルを返す (A1)
     * @param {number} score - 0-100の強度スコア
     * @returns {{label: string, emoji: string, class: string}}
     */
    getStrengthLabel(score) {
        if (score >= 80) return { label: '非常に高い（参考）', emoji: '💎', class: 'text-primary' };
        if (score >= 60) return { label: '強い', emoji: '🟢', class: 'text-success' };
        if (score >= 40) return { label: '普通', emoji: '🟡', class: 'text-warning' };
        return { label: '弱い', emoji: '🔴', class: 'text-danger' };
    }

    /**
     * クラック推定時間を計算して文字列で返す (A2)
     * @param {string} pwd - パスワード
     * @returns {string} 人間が読める推定時間
     */
    estimateCrackTime(pwd, generatedPoolSize) {
        if (!pwd) return '-';

        const guessesPerSecond = 1e9; // 10億回/秒の攻撃速度を想定

        // 対数空間での計算 (モジュロバイアスやJSのInfinityによる桁崩れを完全回避)
        // log2(seconds) = length * log2(poolSize) - log2(2 * guessesPerSecond)
        const log2Seconds = this._estimateEntropy(pwd, generatedPoolSize) - (1 + Math.log2(guessesPerSecond));

        // 1年 = 31536000 秒
        const log2Year = Math.log2(31536000);

        if (log2Seconds < 0) return '一瞬';
        if (log2Seconds < Math.log2(60)) return `${Math.round(Math.pow(2, log2Seconds))}秒`;
        if (log2Seconds < Math.log2(3600)) return `${Math.round(Math.pow(2, log2Seconds) / 60)}分`;
        if (log2Seconds < Math.log2(86400)) return `${Math.round(Math.pow(2, log2Seconds) / 3600)}時間`;
        if (log2Seconds < log2Year) return `${Math.round(Math.pow(2, log2Seconds) / 86400)}日`;

        // 年単位の計算
        const log2Years = log2Seconds - log2Year;
        
        // 1000年 = 2^9.96 年
        if (log2Years < Math.log2(1000)) {
            return `約${Math.round(Math.pow(2, log2Years))}年`;
        }
        // 100万年 = 2^19.93 年
        if (log2Years < Math.log2(1e6)) {
            return `約${Math.round(Math.pow(2, log2Years) / 1000)}千年`;
        }
        // 10億年 = 2^29.89 年
        if (log2Years < Math.log2(1e9)) {
            return `約${Math.round(Math.pow(2, log2Years) / 1e6)}百万年`;
        }
        
        return `数億年以上`;
    }

    /**
     * 単一のパスワードを生成
     * @param {string} pool - 文字プール
     * @param {number} len - 長さ
     * @param {string[]} requiredSets - 必須文字セット
     * @returns {string} 生成されたパスワード
     * @private
     */
    _createSingle(pool, len, requiredSets) {
        const chars = [];

        // 必須セットから最低1文字ずつ確保
        for (const set of requiredSets) {
            chars.push(this._pickRandomChar(set));
        }

        // 残りは全体プールから補充
        while (chars.length < len) {
            chars.push(this._pickRandomChar(pool));
        }

        // セキュアにシャッフル
        this._secureShuffle(chars);
        return chars.join('');
    }

    /**
     * 紛らわしい文字を除外
     * @param {string} set - 文字セット
     * @param {boolean} excludeAmbiguous - 除外するか
     * @returns {string} フィルタ済み文字セット
     * @private
     */
    _filterAmbiguous(set, excludeAmbiguous) {
        if (!excludeAmbiguous) return set;
        return set.replace(this.AMBIGUOUS_CHARS, '');
    }

    /**
     * ランダムに1文字選択
     * @param {string} set - 文字セット
     * @returns {string} 選ばれた文字
     * @private
     */
    _pickRandomChar(set) {
        const index = this._getRandomInt(set.length);
        return set[index];
    }

    /**
     * 配列をセキュアにシャッフル
     * @param {string[]} array - シャッフルする配列
     * @private
     */
    _secureShuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this._getRandomInt(i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * 暗号論的に安全な乱数を生成
     * @param {number} max - 最大値（排他）
     * @returns {number} 0からmax-1までの整数
     * @private
     */
    _getRandomInt(max) {
        if (max <= 0) return 0;
        if (max > 0xFFFFFFFF) throw new RangeError(`_getRandomInt: max (${max}) exceeds safe limit`);
        if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
            throw new Error('このブラウザは安全な乱数生成に対応していません');
        }
        const maxUint = 0xFFFFFFFF;
        const limit = Math.floor(maxUint / max) * max;
        const buffer = new Uint32Array(1);
        let value = 0;
        do {
            crypto.getRandomValues(buffer);
            value = buffer[0];
        } while (value >= limit);
        return value % max;
    }
}

// ES Module export
if (typeof globalThis !== 'undefined') {
    globalThis.PasswordLogic = PasswordLogic;
}
export { PasswordLogic };
