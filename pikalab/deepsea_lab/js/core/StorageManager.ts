import { CONFIG } from './config.js';

// 保存値は外部入力として扱い、Setへ渡す前にID配列へ正規化する。
function normalizeIds(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((id): id is string => typeof id === 'string' && id.length > 0)
        : [];
}

export class StorageManager {
    private key: string;
    private version: number;

    constructor() {
        this.key = CONFIG.STORAGE.KEY;
        this.version = CONFIG.STORAGE.VERSION;
    }

    load(): string[] {
        try {
            const raw = localStorage.getItem(this.key);
            if (!raw) return [];

            const parsed = JSON.parse(raw);
            
            if (parsed && typeof parsed === 'object' && parsed.v === this.version) {
                return normalizeIds(parsed.data);
            }
            
            if (Array.isArray(parsed)) {
                const ids = normalizeIds(parsed);
                this.save(ids);
                return ids;
            }

            return [];
        } catch (err) {
            console.error('Failed to load data from localStorage:', err);
            return [];
        }
    }

    save(dataArray: string[]): boolean {
        try {
            const payload = {
                v: this.version,
                data: dataArray
            };
            localStorage.setItem(this.key, JSON.stringify(payload));
            return true;
        } catch (err) {
            console.error('Failed to save data to localStorage. Quota exceeded?', err);
            return false;
        }
    }

    loadQuiz(): string[] {
        try {
            const raw = localStorage.getItem(this.key + '_quiz');
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return normalizeIds(parsed);
        } catch (err) {
            console.error('Failed to load quiz from localStorage:', err);
            return [];
        }
    }

    saveQuiz(solvedIds: string[]): boolean {
        try {
            localStorage.setItem(this.key + '_quiz', JSON.stringify(solvedIds));
            return true;
        } catch (err) {
            console.error('Failed to save quiz to localStorage:', err);
            return false;
        }
    }

    clear(): boolean {
        try {
            localStorage.removeItem(this.key);
            localStorage.removeItem(this.key + '_quiz');
            return true;
        } catch (err) {
            console.error('Failed to clear localStorage:', err);
            return false;
        }
    }
}
