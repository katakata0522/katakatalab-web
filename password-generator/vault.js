/**
 * パスワードボールト v2.0
 * Web Crypto API (PBKDF2 + AES-GCM) による暗号化
 * LocalStorage にマスターパスワードで暗号化保存
 */

const VAULT_STORAGE_KEY = 'password-gen-vault';
const VAULT_SALT_KEY = 'password-gen-vault-salt';
const MIN_MASTER_PASSWORD_LENGTH = 12;
const KDF_ITERATIONS = 600000;
const MAX_IMPORT_JSON_LENGTH = 16 * 1024 * 1024;
const VAULT_WRITE_LOCK = 'password-gen-vault-write';
const MAX_ENTRY_COUNT = 1000;
const MAX_TEXT_LENGTH = 1024;

class PasswordVault {
    constructor() {
        this._key = null;
        this._entries = [];
        this._unlocked = false;
        this._epoch = 0;
        this._baseline = null;
        this._busy = false;
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

    _snapshot() {
        // Reads must fail closed: a denied read must never look like an empty vault.
        try {
            return { data: localStorage.getItem(VAULT_STORAGE_KEY), salt: localStorage.getItem(VAULT_SALT_KEY) };
        } catch { throw this._storageFailure('読込'); }
    }

    _record(snapshot) {
        const data = JSON.parse(snapshot.data);
        const salt = data?.salt === undefined ? snapshot.salt : data.salt;
        if (!this._isValidHex(salt)) throw new Error('ボールトのソルトが不正です');
        if (!this._isValidEncryptedData(data)) throw new Error('暗号化データ形式が不正です');
        return { salt, data: { iv: data.iv, ct: data.ct } };
    }

    _assertCurrent(snapshot, epoch) {
        if (this._epoch !== epoch) throw new Error('操作はロックにより中止されました');
        const current = this._snapshot();
        if (current.data !== snapshot.data || current.salt !== snapshot.salt) {
            throw new Error('別のタブでボールトが変更されました。ロックして最新データを開き直してください');
        }
    }

    async _withWrite(action) {
        if (!globalThis.navigator?.locks?.request) {
            throw new Error('このブラウザでは安全な同時保存に対応していません。閲覧・エクスポートは利用できます');
        }
        if (this._busy) throw new Error('処理中です。完了してからもう一度お試しください');
        this._busy = true;
        const epoch = this._epoch;
        try {
            return await navigator.locks.request(VAULT_WRITE_LOCK, async () => {
                if (epoch !== this._epoch) throw new Error('操作はロックにより中止されました');
                return action(epoch);
            });
        } finally { this._busy = false; }
    }

    /** ボールトが存在するか */
    exists() {
        try { this._record(this._snapshot()); return true; } catch { return false; }
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
        return this._entries.map(entry => ({ ...entry, fields: entry.fields.map(field => ({ ...field })) }));
    }

    async setup(masterPassword) {
        if (!this.isCryptoSupported()) throw new Error('このブラウザはボールト暗号化に対応していません');
        this._validateMasterPassword(masterPassword);
        return this._withWrite(async epoch => {
            const snapshot = this._snapshot();
            if (snapshot.data !== null || snapshot.salt !== null) {
                throw new Error('既存のボールトデータがあります。新規作成で上書きできません');
            }
            const salt = this._bufToHex(crypto.getRandomValues(new Uint8Array(16)));
            const key = await this._deriveKey(masterPassword, this._hexToBuf(salt));
            await this._save([], key, salt, snapshot, epoch);
            if (epoch !== this._epoch) throw new Error('操作はロックにより中止されました');
            this._key = key;
            this._entries = [];
            this._unlocked = true;
        });
    }

    async unlock(masterPassword) {
        if (!this.isCryptoSupported()) throw new Error('このブラウザはボールト暗号化に対応していません');
        if (typeof masterPassword !== 'string' || !masterPassword) throw new Error('マスターパスワードを入力してください');
        this.lock();
        const epoch = this._epoch;
        const snapshot = this._snapshot();
        const { salt, data } = this._record(snapshot);
        try {
            const key = await this._deriveKey(masterPassword, this._hexToBuf(salt));
            const entries = this._normalizeEntries(JSON.parse(await this._decrypt(data, key)));
            this._assertCurrent(snapshot, epoch);
            this._key = key;
            this._entries = entries;
            this._baseline = snapshot;
            this._unlocked = true;
            return true;
        } catch (error) {
            if (epoch === this._epoch) this.lock();
            if (error.name === 'OperationError') return false;
            throw error;
        }
    }

    lock() {
        this._epoch++;
        this._key = null;
        this._entries = [];
        this._baseline = null;
        this._unlocked = false;
    }

    async _mutate(change) {
        this._requireUnlocked();
        return this._withWrite(async epoch => {
            this._requireUnlocked();
            const snapshot = this._baseline;
            this._assertCurrent(snapshot, epoch);
            const entries = this.entries;
            const result = change(entries);
            const { salt } = this._record(snapshot);
            await this._save(entries, this._key, salt, snapshot, epoch);
            if (epoch !== this._epoch) throw new Error('操作はロックにより中止されました');
            this._entries = entries;
            return result;
        });
    }

    async addEntry(entry) {
        return this._mutate(entries => {
            if (!entry || typeof entry !== 'object') throw new Error('登録データが不正です');
            if (entries.length >= MAX_ENTRY_COUNT) throw new Error(`登録上限（${MAX_ENTRY_COUNT}件）に達しました`);
            const now = new Date().toISOString();
            const newEntry = {
                id: crypto.randomUUID(), siteName: this._sanitizeText(entry.siteName),
                password: this._sanitizeText(entry.password), category: this._sanitizeText(entry.category) || 'other',
                fields: this._normalizeFields(entry.fields), createdAt: now, updatedAt: now,
            };
            entries.push(newEntry);
            return { ...newEntry, fields: newEntry.fields.map(field => ({ ...field })) };
        });
    }

    async updateEntry(id, updates) {
        return this._mutate(entries => {
            if (typeof id !== 'string' || !id) throw new Error('更新対象IDが不正です');
            if (!updates || typeof updates !== 'object') throw new Error('更新データが不正です');
            const entry = entries.find(entry => entry.id === id);
            if (!entry) throw new Error('エントリが見つかりません');
            for (const name of ['siteName', 'password', 'category']) {
                if (updates[name] !== undefined) entry[name] = this._sanitizeText(updates[name]);
            }
            if (updates.fields !== undefined) entry.fields = this._normalizeFields(updates.fields);
            entry.updatedAt = new Date().toISOString();
            return { ...entry, fields: entry.fields.map(field => ({ ...field })) };
        });
    }

    async deleteEntry(id) {
        return this._mutate(entries => {
            if (typeof id !== 'string' || !id) throw new Error('削除対象IDが不正です');
            const index = entries.findIndex(entry => entry.id === id);
            if (index < 0) throw new Error('エントリが見つかりません');
            entries.splice(index, 1);
        });
    }

    search(query) {
        if (!query) return this.entries;
        const q = String(query).toLowerCase();
        return this.entries.filter(e => {
            const siteName = String(e.siteName || '').toLowerCase();
            const fieldsMatch = Array.isArray(e.fields)
                && e.fields.some(f => String(f.value || '').toLowerCase().includes(q));
            return siteName.includes(q) || fieldsMatch;
        });
    }

    async destroy() {
        const snapshot = this._baseline || this._snapshot();
        return this._withWrite(async epoch => {
            this._assertCurrent(snapshot, epoch);
            const dataRemoved = this._storageRemove(VAULT_STORAGE_KEY);
            const saltRemoved = this._storageRemove(VAULT_SALT_KEY);
            if (!dataRemoved || !saltRemoved) {
                const restored = this._restoreStoragePair(snapshot.salt, snapshot.data);
                if (!restored) throw new Error('削除に失敗し、保存状態を確認できません。バックアップを保持してください');
                throw this._storageFailure('削除');
            }
            this.lock();
        });
    }

    exportEncrypted() {
        const snapshot = this._snapshot();
        if (!snapshot.data) throw new Error('エクスポートするデータがありません');
        return JSON.stringify(this._record(snapshot));
    }

    async importEncrypted(jsonStr, masterPassword, signal = null) {
        if (typeof jsonStr !== 'string' || !jsonStr) throw new Error('インポートデータが空です');
        if (jsonStr.length > MAX_IMPORT_JSON_LENGTH) throw new Error('インポートデータが大きすぎます（上限16MB）');
        let parsed;
        try { parsed = JSON.parse(jsonStr); } catch { throw new Error('JSON形式が不正です'); }
        if (!parsed || typeof parsed !== 'object') throw new Error('不正なインポートデータです');
        const { salt, data } = parsed;
        if (!this._isValidHex(salt)) throw new Error('ソルト形式が不正です');
        if (!this._isValidEncryptedData(data)) throw new Error('暗号化データ形式が不正です');
        if (typeof masterPassword !== 'string' || !masterPassword) throw new Error('インポート元のマスターパスワードを入力してください');
        const snapshot = this._baseline || this._snapshot();
        return this._withWrite(async epoch => {
            this._assertCurrent(snapshot, epoch);
            const key = await this._deriveKey(masterPassword, this._hexToBuf(salt));
            let entries;
            try { entries = JSON.parse(await this._decrypt(data, key)); }
            catch { throw new Error('インポート元のパスワードが違うか、バックアップが壊れています'); }
            this._validateImportedEntries(entries);
            if (signal?.aborted) throw new Error('インポートをキャンセルしました');
            this._assertCurrent(snapshot, epoch);
            // One atomic setItem: failed validation, quota denial or interruption preserves the old record.
            const record = JSON.stringify({ salt, iv: data.iv, ct: data.ct });
            if (!this._storageSet(VAULT_STORAGE_KEY, record)) throw this._storageFailure('インポート');
            this.lock();
        });
    }

    _validateImportedEntries(entries) {
        if (!Array.isArray(entries) || entries.length > MAX_ENTRY_COUNT) throw new Error('ボールト内データ形式が不正です');
        const ids = new Set();
        for (const entry of entries) {
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('ボールト内データ形式が不正です');
            for (const name of ['siteName', 'password']) {
                if (typeof entry[name] !== 'string' || entry[name].length > MAX_TEXT_LENGTH) throw new Error('ボールト内データ形式が不正です');
            }
            if (typeof entry.id !== 'string' || !entry.id || ids.has(entry.id)) throw new Error('ボールト内IDが不正です');
            ids.add(entry.id);
            if (entry.category !== undefined && (typeof entry.category !== 'string' || entry.category.length > MAX_TEXT_LENGTH)) throw new Error('カテゴリ形式が不正です');
            if (entry.fields !== undefined && (!Array.isArray(entry.fields) || entry.fields.length > 50)) throw new Error('項目形式が不正です');
            for (const field of entry.fields || []) {
                if (!field || typeof field.label !== 'string' || typeof field.value !== 'string' || field.label.length > MAX_TEXT_LENGTH || field.value.length > MAX_TEXT_LENGTH) throw new Error('項目形式が不正です');
            }
        }
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

    async _save(entries, key, salt, snapshot, epoch) {
        const encrypted = await this._encrypt(JSON.stringify(entries), key);
        const backup = JSON.stringify({ salt, data: encrypted });
        if (backup.length > MAX_IMPORT_JSON_LENGTH) throw new Error('保存上限（バックアップ16MB）を超えています。登録内容を減らしてください');
        const data = JSON.stringify({ salt, ...encrypted });
        this._assertCurrent(snapshot, epoch);
        if (!this._storageSet(VAULT_STORAGE_KEY, data)) throw this._storageFailure('保存');
        this._baseline = { data, salt: snapshot.salt };
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

    async _encrypt(plaintext, key = this._key) {
        const enc = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            enc.encode(plaintext)
        );
        return {
            iv: this._bufToHex(iv),
            ct: this._bufToHex(new Uint8Array(ciphertext)),
        };
    }

    async _decrypt(data, key = this._key) {
        const iv = this._hexToBuf(data.iv);
        const ct = this._hexToBuf(data.ct);
        const plaintext = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
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
