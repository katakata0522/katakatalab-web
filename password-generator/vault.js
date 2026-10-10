/**
 * パスワードボールト v2.0
 * Web Crypto API (PBKDF2 + AES-GCM) による暗号化
 * LocalStorage にマスターパスワードで暗号化保存
 */

const VAULT_STORAGE_KEY = 'password-gen-vault';
const VAULT_SALT_KEY = 'password-gen-vault-salt';
const MIN_MASTER_PASSWORD_LENGTH = 12;
const KDF_ITERATIONS = 600000;
const MAX_IMPORT_JSON_LENGTH = 2 * 1024 * 1024;
const MAX_ENTRY_COUNT = 1000;
const MAX_TEXT_LENGTH = 1024;

class PasswordVault {
    constructor() {
        this._key = null;
        this._entries = [];
        this._unlocked = false;
    }

    _storageGet(key) {
        try { return localStorage.getItem(key); } catch { return null; }
    }

    _storageSet(key, val) {
        try { localStorage.setItem(key, val); return true; } catch { return false; }
    }

    _storageRemove(key) {
        try { localStorage.removeItem(key); return true; } catch { return false; }
    }

    _restoreStorageValue(key, previousValue) {
        return previousValue === null
            ? this._storageRemove(key)
            : this._storageSet(key, previousValue);
    }

    _restoreStoragePair(previousSalt, previousData) {
        const saltRestored = this._restoreStorageValue(VAULT_SALT_KEY, previousSalt);
        const dataRestored = this._restoreStorageValue(VAULT_STORAGE_KEY, previousData);
        return saltRestored && dataRestored;
    }

    _storageFailure(action = '保存') {
        return new Error(`ボールトの${action}に失敗しました。ブラウザのストレージ容量やプライベートモードの制限を確認してください`);
    }

    /** ボールトが存在するか */
    exists() {
        const encryptedText = this._storageGet(VAULT_STORAGE_KEY);
        const saltHex = this._storageGet(VAULT_SALT_KEY);
        if (!encryptedText || !saltHex || !this._isValidHex(saltHex)) {
            return false;
        }
        try {
            const encryptedData = JSON.parse(encryptedText);
            return this._isValidEncryptedData(encryptedData);
        } catch {
            return false;
        }
    }

    /** Web Crypto API が利用可能か */
    isCryptoSupported() {
        return !!globalThis.crypto
            && typeof globalThis.crypto.getRandomValues === 'function'
            && !!globalThis.crypto.subtle;
    }

    /** ボールト関連データの痕跡があるか（破損判定補助） */
    hasStoredArtifacts() {
        return this._storageGet(VAULT_STORAGE_KEY) !== null
            || this._storageGet(VAULT_SALT_KEY) !== null;
    }

    get isUnlocked() {
        return this._unlocked;
    }

    get entries() {
        return [...this._entries];
    }

    async setup(masterPassword) {
        if (!this.isCryptoSupported()) {
            throw new Error('このブラウザはボールト暗号化に対応していません');
        }
        this._validateMasterPassword(masterPassword);

        const previousSalt = this._storageGet(VAULT_SALT_KEY);
        const previousData = this._storageGet(VAULT_STORAGE_KEY);
        const previousKey = this._key;
        const previousEntries = this._entries;
        const previousUnlocked = this._unlocked;

        const salt = crypto.getRandomValues(new Uint8Array(16));
        this._key = await this._deriveKey(masterPassword, salt);
        this._entries = [];
        this._unlocked = true;

        try {
            if (!this._storageSet(VAULT_SALT_KEY, this._bufToHex(salt))) {
                throw this._storageFailure('作成');
            }
            await this._save();
        } catch (error) {
            this._restoreStoragePair(previousSalt, previousData);
            this._key = previousKey;
            this._entries = previousEntries;
            this._unlocked = previousUnlocked;
            throw error;
        }
    }

    async unlock(masterPassword) {
        if (!this.isCryptoSupported()) {
            throw new Error('このブラウザはボールト暗号化に対応していません');
        }
        if (typeof masterPassword !== 'string' || masterPassword.length === 0) {
            throw new Error('マスターパスワードを入力してください');
        }

        const saltHex = this._storageGet(VAULT_SALT_KEY);
        if (!saltHex || !this._isValidHex(saltHex)) {
            throw new Error('ボールトのソルトが不正です');
        }

        const salt = this._hexToBuf(saltHex);
        this._key = await this._deriveKey(masterPassword, salt);

        try {
            const encryptedText = this._storageGet(VAULT_STORAGE_KEY);
            if (!encryptedText) throw new Error('データが見つかりません');

            const encryptedData = JSON.parse(encryptedText);
            if (!this._isValidEncryptedData(encryptedData)) {
                throw new Error('暗号化データ形式が不正です');
            }

            const decrypted = await this._decrypt(encryptedData);
            const parsed = JSON.parse(decrypted);
            this._entries = this._normalizeEntries(parsed);
            this._unlocked = true;
            return true;
        } catch (e) {
            this._key = null;
            this._entries = [];
            this._unlocked = false;
            if (e.name === 'OperationError') return false;
            throw e;
        }
    }

    lock() {
        this._key = null;
        this._entries = [];
        this._unlocked = false;
    }

    async addEntry(entry) {
        this._requireUnlocked();
        if (!entry || typeof entry !== 'object') {
            throw new Error('登録データが不正です');
        }
        if (this._entries.length >= MAX_ENTRY_COUNT) {
            throw new Error(`登録上限（${MAX_ENTRY_COUNT}件）に達しました`);
        }

        const now = new Date().toISOString();
        const newEntry = {
            id: crypto.randomUUID(),
            siteName: this._sanitizeText(entry.siteName),
            password: this._sanitizeText(entry.password),
            category: this._sanitizeText(entry.category) || 'other',
            fields: this._normalizeFields(entry.fields),
            createdAt: now,
            updatedAt: now,
        };

        this._entries.push(newEntry);
        try {
            await this._save();
        } catch (error) {
            this._entries.pop();
            throw error;
        }
        return newEntry;
    }

    async updateEntry(id, updates) {
        this._requireUnlocked();
        if (typeof id !== 'string' || id.length === 0) {
            throw new Error('更新対象IDが不正です');
        }
        if (!updates || typeof updates !== 'object') {
            throw new Error('更新データが不正です');
        }

        const idx = this._entries.findIndex(e => e.id === id);
        if (idx === -1) throw new Error('エントリが見つかりません');

        const entry = this._entries[idx];
        const previousEntry = {
            ...entry,
            fields: Array.isArray(entry.fields) ? entry.fields.map(field => ({ ...field })) : [],
        };

        if (updates.siteName !== undefined) entry.siteName = this._sanitizeText(updates.siteName);
        if (updates.password !== undefined) entry.password = this._sanitizeText(updates.password);
        if (updates.category !== undefined) entry.category = this._sanitizeText(updates.category);
        if (updates.fields !== undefined) entry.fields = this._normalizeFields(updates.fields);
        entry.updatedAt = new Date().toISOString();

        try {
            await this._save();
        } catch (error) {
            this._entries[idx] = previousEntry;
            throw error;
        }
        return entry;
    }

    async deleteEntry(id) {
        this._requireUnlocked();
        if (typeof id !== 'string' || id.length === 0) {
            throw new Error('削除対象IDが不正です');
        }

        const previousEntries = this._entries;
        const nextEntries = this._entries.filter(e => e.id !== id);
        if (nextEntries.length === previousEntries.length) {
            throw new Error('エントリが見つかりません');
        }

        this._entries = nextEntries;
        try {
            await this._save();
        } catch (error) {
            this._entries = previousEntries;
            throw error;
        }
    }

    search(query) {
        if (!query) return this.entries;
        const q = String(query).toLowerCase();
        return this._entries.filter(e => {
            const siteName = String(e.siteName || '').toLowerCase();
            const fieldsMatch = Array.isArray(e.fields)
                && e.fields.some(f => String(f.value || '').toLowerCase().includes(q));
            return siteName.includes(q) || fieldsMatch;
        });
    }

    destroy() {
        const previousSalt = this._storageGet(VAULT_SALT_KEY);
        const previousData = this._storageGet(VAULT_STORAGE_KEY);
        const dataRemoved = this._storageRemove(VAULT_STORAGE_KEY);
        const saltRemoved = this._storageRemove(VAULT_SALT_KEY);

        if (!dataRemoved || !saltRemoved) {
            this._restoreStoragePair(previousSalt, previousData);
            throw this._storageFailure('削除');
        }
        this.lock();
    }

    exportEncrypted() {
        const encryptedText = this._storageGet(VAULT_STORAGE_KEY);
        const salt = this._storageGet(VAULT_SALT_KEY);
        if (!encryptedText || !salt) throw new Error('エクスポートするデータがありません');
        if (!this._isValidHex(salt)) throw new Error('ソルト形式が不正です');

        let encryptedData;
        try {
            encryptedData = JSON.parse(encryptedText);
        } catch {
            throw new Error('保存データの形式が壊れています');
        }
        if (!this._isValidEncryptedData(encryptedData)) {
            throw new Error('保存データの形式が不正です');
        }
        return JSON.stringify({ salt, data: encryptedData });
    }

    importEncrypted(jsonStr) {
        if (typeof jsonStr !== 'string' || jsonStr.length === 0) {
            throw new Error('インポートデータが空です');
        }
        if (jsonStr.length > MAX_IMPORT_JSON_LENGTH) {
            throw new Error('インポートデータが大きすぎます');
        }

        let parsed;
        try {
            parsed = JSON.parse(jsonStr);
        } catch {
            throw new Error('JSON形式が不正です');
        }
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('不正なインポートデータです');
        }

        const { salt, data } = parsed;
        if (!this._isValidHex(salt)) throw new Error('ソルト形式が不正です');
        if (!this._isValidEncryptedData(data)) throw new Error('暗号化データ形式が不正です');

        const previousSalt = this._storageGet(VAULT_SALT_KEY);
        const previousData = this._storageGet(VAULT_STORAGE_KEY);

        try {
            if (!this._storageSet(VAULT_SALT_KEY, salt)) {
                throw this._storageFailure('インポート');
            }
            if (!this._storageSet(VAULT_STORAGE_KEY, JSON.stringify(data))) {
                throw this._storageFailure('インポート');
            }
        } catch (error) {
            this._restoreStoragePair(previousSalt, previousData);
            throw error;
        }

        this.lock();
    }

    _requireUnlocked() {
        if (!this._unlocked || !this._key) {
            throw new Error('ボールトがロックされています');
        }
    }

    _validateMasterPassword(masterPassword) {
        if (typeof masterPassword !== 'string') {
            throw new Error('マスターパスワード形式が不正です');
        }
        if (masterPassword.length < MIN_MASTER_PASSWORD_LENGTH) {
            throw new Error(`マスターパスワードは${MIN_MASTER_PASSWORD_LENGTH}文字以上にしてください`);
        }
    }

    _sanitizeText(value) {
        if (typeof value !== 'string') return '';
        return value.slice(0, MAX_TEXT_LENGTH);
    }

    _normalizeFields(fields) {
        if (!Array.isArray(fields)) return [];
        return fields
            .slice(0, 50)
            .map((f) => ({
                label: this._sanitizeText(f?.label),
                value: this._sanitizeText(f?.value),
            }))
            .filter((f) => f.label && f.value);
    }

    _normalizeEntries(parsed) {
        if (!Array.isArray(parsed)) {
            throw new Error('ボールト内データ形式が不正です');
        }
        return parsed.slice(0, MAX_ENTRY_COUNT).map(entry => this._normalizeEntry(entry));
    }

    _normalizeEntry(entry) {
        const now = new Date().toISOString();
        return {
            id: (typeof entry?.id === 'string' && entry.id.length > 0) ? entry.id : crypto.randomUUID(),
            siteName: this._sanitizeText(entry?.siteName),
            password: this._sanitizeText(entry?.password),
            category: this._sanitizeText(entry?.category) || 'other',
            fields: this._normalizeFields(entry?.fields),
            createdAt: typeof entry?.createdAt === 'string' ? entry.createdAt : now,
            updatedAt: typeof entry?.updatedAt === 'string' ? entry.updatedAt : now,
        };
    }

    _isValidHex(value) {
        return typeof value === 'string'
            && value.length > 0
            && value.length % 2 === 0
            && /^[0-9a-f]+$/i.test(value);
    }

    _isValidEncryptedData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!this._isValidHex(data.iv) || data.iv.length !== 24) return false;
        if (!this._isValidHex(data.ct) || data.ct.length < 32) return false;
        return true;
    }

    async _save() {
        const plaintext = JSON.stringify(this._entries);
        const encrypted = await this._encrypt(plaintext);
        if (!this._storageSet(VAULT_STORAGE_KEY, JSON.stringify(encrypted))) {
            throw this._storageFailure('保存');
        }
    }

    async _deriveKey(password, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: KDF_ITERATIONS, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async _encrypt(plaintext) {
        const enc = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            this._key,
            enc.encode(plaintext)
        );
        return {
            iv: this._bufToHex(iv),
            ct: this._bufToHex(new Uint8Array(ciphertext)),
        };
    }

    async _decrypt(data) {
        const iv = this._hexToBuf(data.iv);
        const ct = this._hexToBuf(data.ct);
        const plaintext = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            this._key,
            ct
        );
        return new TextDecoder().decode(plaintext);
    }

    _bufToHex(buf) {
        if (!(buf instanceof Uint8Array)) buf = new Uint8Array(buf);
        let hex = '';
        for (let i = 0; i < buf.length; i++) {
            const val = buf[i];
            hex += (val < 16 ? '0' : '') + val.toString(16);
        }
        return hex;
    }

    _hexToBuf(hex) {
        if (!this._isValidHex(hex)) {
            throw new Error('16進文字列の形式が不正です');
        }
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            const high = parseInt(hex[i], 16);
            const low = parseInt(hex[i + 1], 16);
            bytes[i / 2] = (high << 4) | low;
        }
        return bytes;
    }
}

if (typeof globalThis !== 'undefined') {
    globalThis.PasswordVault = PasswordVault;
}
export { PasswordVault };
