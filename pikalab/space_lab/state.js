// ============================================================
// ほしぞら・アドベンチャー - state.js
// アプリケーション全体の状態管理モジュール
// ============================================================
import { CONFIG } from './config.js';
import { normalizeSpaceLabState } from './state-normalizer.mjs';

function parseStoredJson(rawValue, fallbackValue) {
    if (!rawValue) return fallbackValue;
    try {
        return JSON.parse(rawValue);
    } catch (error) {
        console.warn('[State] 保存データを読み込めないため、安全な既定値を使用します。', error);
        return fallbackValue;
    }
}

// ============================================================
// 例外安全な localStorage ヘルパー
// ============================================================
export const StorageHelper = {
    _fallbackMemory: Object.create(null),
    _isAvailable: null,

    checkAvailability() {
        if (this._isAvailable !== null) return this._isAvailable;
        try {
            const key = '__storage_test__';
            localStorage.setItem(key, key);
            localStorage.removeItem(key);
            this._isAvailable = true;
        } catch (e) {
            this._isAvailable = false;
            console.warn('[StorageHelper] localStorage is not available. Falling back to memory storage.');
        }
        return this._isAvailable;
    },

    getItem(key, defaultValue = null) {
        // 保存先が途中で容量不足になった場合も、このセッションの最新値を優先する。
        if (Object.prototype.hasOwnProperty.call(this._fallbackMemory, key)) return this._fallbackMemory[key];
        try {
            // 書き込み容量がなくても既存の進捗は読めるため、書き込み検査で制限しない。
            const val = localStorage.getItem(key);
            return val !== null ? val : defaultValue;
        } catch (e) {
            console.warn('[StorageHelper] getItem failed:', e);
            return defaultValue;
        }
    },

    setItem(key, value) {
        const valStr = String(value);
        try {
            // 容量やアクセスが回復した場合は、次の保存から通常の永続化へ戻す。
            localStorage.setItem(key, valStr);
            delete this._fallbackMemory[key];
            this._isAvailable = true;
            return true;
        } catch (e) {
            this._isAvailable = false;
            console.warn('[StorageHelper] setItem failed:', e);
            this._fallbackMemory[key] = valStr;
            return false;
        }
    }

};

export const State = {
    visited:        new Set(),
    scrollX:        0,
    scrollVelocity: 0,
    isDragging:     false,
    dragStartX:     0,
    dragLastX:      0,
    audioInit:      false,
    bgmStarted:     false,
    solvedQuizzes:  {},   // planetId -> Array of solved quiz indexes (0, 1, 2)
    readSecrets:    [],   // read secret column IDs
    isMuted:        false,
    currentPlanet:  null,
    ufoInterval:    null,
    hoveredPlanet:  null,
    images:         {},   // id -> HTMLImageElement
    bgImage:        null,
    planetData:     [],   // computed canvas positions
    totalWidth:     0,
    viewportW:      0,
    viewportH:      0,
    dpr:            1,

    init() {
        try {
            const normalized = normalizeSpaceLabState({
                visited: parseStoredJson(StorageHelper.getItem(CONFIG.STORAGE_KEY_VISITED), []),
                solvedQuizzes: parseStoredJson(StorageHelper.getItem(CONFIG.STORAGE_KEY_SOLVED_QUIZZES), {}),
                readSecrets: parseStoredJson(StorageHelper.getItem(CONFIG.STORAGE_KEY_READ_SECRETS), [])
            });
            this.visited = new Set(normalized.visited);
            this.solvedQuizzes = normalized.solvedQuizzes;
            this.readSecrets = normalized.readSecrets;
            
            // wonder_school_profile_v2 (ポータル設定) からミュートを同期
            let isMutedSet = false;
            try {
                const portalRaw = StorageHelper.getItem('wonder_school_profile_v2');
                if (portalRaw) {
                    const portalData = JSON.parse(portalRaw);
                    if (typeof portalData?.isMuted === 'boolean') {
                        this.isMuted = portalData.isMuted;
                        isMutedSet = true;
                    }
                }
            } catch (e) {
                console.warn('Failed to sync portal mute in space_lab:', e);
            }

            if (!isMutedSet) {
                const savedMuted = StorageHelper.getItem(CONFIG.STORAGE_KEY_BGM_MUTED);
                if (savedMuted) {
                    this.isMuted = savedMuted === 'true';
                }
            }

        } catch(e) {
            console.warn('Failed to load State:', e);
        }
    },
    
    saveMute() {
        StorageHelper.setItem(CONFIG.STORAGE_KEY_BGM_MUTED, String(this.isMuted));
        const key = 'wonder_school_profile_v2';
        const profile = parseStoredJson(StorageHelper.getItem(key), null);
        // ポータルの既存設定だけを更新し、破損データや未作成のプロフィールは置き換えない。
        if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
            StorageHelper.setItem(key, JSON.stringify({ ...profile, isMuted: this.isMuted }));
        }
    },

    save() {
        try { 
            StorageHelper.setItem(CONFIG.STORAGE_KEY_VISITED, JSON.stringify([...this.visited])); 
            StorageHelper.setItem(CONFIG.STORAGE_KEY_SOLVED_QUIZZES, JSON.stringify(this.solvedQuizzes));
            StorageHelper.setItem(CONFIG.STORAGE_KEY_BGM_MUTED, String(this.isMuted));
            StorageHelper.setItem(CONFIG.STORAGE_KEY_READ_SECRETS, JSON.stringify(this.readSecrets));
        } catch(e) {
            console.warn('Failed to save State:', e);
        }
    }
};

