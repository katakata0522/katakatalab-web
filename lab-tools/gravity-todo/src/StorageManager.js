// タスクデータの永続化を担うクラス
export class StorageManager {
  static STORAGE_KEY = 'gravity_todo_tasks';
  static INITIALIZED_KEY = 'gravity_todo_initialized';
  static DB_NAME = 'gravity_todo_db';
  static STORE_NAME = 'app_state';
  static STATE_ID = 'tasks';
  static writeBlocked = false;

  static normalizeSubTasks(items) {
    return (Array.isArray(items) ? items : [])
      .filter(item => item && typeof item.text === 'string')
      .map(item => ({ ...item, text: item.text, done: item.done === true }));
  }

  // Reject unreadable records before normalization can silently discard user data.
  static validateStoredTasks(items) {
    if (!Array.isArray(items) || items.some(item =>
      !item || typeof item.text !== 'string' || !item.text ||
      item.text.replace(/[<>"'`]/g, '').substring(0, 20) !== item.text ||
      (item.subTasks !== undefined && (!Array.isArray(item.subTasks) || item.subTasks.some(sub =>
        !sub || typeof sub.text !== 'string' || (sub.done !== undefined && typeof sub.done !== 'boolean')))))) {
      throw new Error('Invalid stored task state; original data was retained.');
    }
  }

  // 保存用のタスク配列へ正規化する
  static normalizeTasks(items = []) {
    return (Array.isArray(items) ? items : [])
      .map((item) => {
        if (item?.label === 'task' && typeof item.taskText === 'string' && item.taskText) {
          return {
            id: item.id,
            text: item.taskText,
            x: Number.isFinite(item.position?.x) ? item.position.x : 0,
            y: Number.isFinite(item.position?.y) ? item.position.y : 0,
            angle: Number.isFinite(item.angle) ? item.angle : 0,
            subTasks: this.normalizeSubTasks(item.subTasks),
            blockColor:  item.render?.fillStyle   || null,
            blockBorder: item.render?.strokeStyle || null,
            isDemo: item.isDemo === true,
          };
        }

        if (typeof item?.text === 'string') {
          const normalizedTask = {
            text: item.text,
            x: Number.isFinite(item.x) ? item.x : 0,
            y: Number.isFinite(item.y) ? item.y : 0,
            angle: Number.isFinite(item.angle) ? item.angle : 0,
            subTasks: this.normalizeSubTasks(item.subTasks),
            blockColor: typeof item.blockColor === 'string' ? item.blockColor : null,
            blockBorder: typeof item.blockBorder === 'string' ? item.blockBorder : null,
            isDemo: item.isDemo === true
          };

          if (item.id !== undefined && item.id !== null) {
            normalizedTask.id = item.id;
          }

          return normalizedTask;
        }

        return null;
      })
      .filter(Boolean);
  }

  // IndexedDB を開く
  static openDatabase() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not available.'));
        return;
      }

      const request = indexedDB.open(this.DB_NAME, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
    });
  }

  // Transaction を Promise 化する
  static waitForTransaction(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    });
  }

  // ObjectStore から状態レコードを取得する
  static readStateRecord(store) {
    return new Promise((resolve, reject) => {
      const request = store.get(this.STATE_ID);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error('Failed to read IndexedDB state.'));
    });
  }

  // IndexedDB へ状態レコードを書き込む
  static async writeStateRecord(tasks) {
    if (this.writeBlocked) throw new Error('Task restore has not succeeded.');
    const db = await this.openDatabase();

    try {
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      store.put({
        id: this.STATE_ID,
        initialized: true,
        tasks: this.normalizeTasks(tasks)
      });
      await this.waitForTransaction(transaction);
    } finally {
      db.close();
    }
  }

  // 旧 localStorage 形式から IndexedDB へ移行する
  static async migrateLegacyState() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const hasInitialized = localStorage.getItem(this.INITIALIZED_KEY) === '1';

      if (raw === null && !hasInitialized) {
        return {
          hasSavedState: false,
          tasks: []
        };
      }

      let parsed = [];
      if (raw !== null) {
        const loaded = JSON.parse(raw);
        if (!Array.isArray(loaded)) throw new Error('Invalid legacy task state.');
        parsed = loaded;
      }

      this.validateStoredTasks(parsed);
      const persistable = this.normalizeTasks(parsed).filter((task) => !task.isDemo);
      const normalizedTasks = persistable;
      const migratedState = {
        hasSavedState: true,
        tasks: normalizedTasks
      };

      await this.writeStateRecord(normalizedTasks);
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.INITIALIZED_KEY);

      return migratedState;
    } catch (error) {
      console.warn('Failed to migrate legacy task state:', error);
      this.writeBlocked = true;
      return {
        ok: false, error,
        hasSavedState: false,
        tasks: []
      };
    }
  }

  // 現在のタスクリストを保存する
  static writeQueue = Promise.resolve();
  static saveTasks(items) {
    // Snapshot before waiting. Writes cannot complete out of order after Undo/Redo.
    const snapshot = this.normalizeTasks(items).filter(task => !task.isDemo)
      .map(task => ({ ...task, subTasks: task.subTasks.map(item => ({ ...item })) }));
    const work = this.writeQueue.then(async () => {
      try { await this.writeStateRecord(snapshot); return { ok: true }; }
      catch (error) { console.warn('Failed to save tasks to IndexedDB:', error); return { ok: false, error }; }
    });
    this.writeQueue = work.then(() => undefined, () => undefined);
    return work;
  }

  // 保存状態の有無も含めて読み込む
  static async loadState() {
    this.writeBlocked = true;
    try {
      const db = await this.openDatabase();

      try {
        const transaction = db.transaction(this.STORE_NAME, 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        // Attach transaction handlers before awaiting the request; observe both failures.
        const [stateRecord] = await Promise.all([
          this.readStateRecord(store), this.waitForTransaction(transaction)
        ]);
        if (stateRecord) this.validateStoredTasks(stateRecord.tasks);
        this.writeBlocked = false;

        if (!stateRecord) {
          return this.migrateLegacyState();
        }

        return {
          hasSavedState: true,
          tasks: this.normalizeTasks(stateRecord.tasks)
        };
      } finally {
        db.close();
      }
    } catch (error) {
      console.warn('Failed to load tasks from IndexedDB:', error);
      this.writeBlocked = true;
      return { ok: false, error, hasSavedState: false, tasks: [] };
    }
  }

  // 保存されたタスクリストを読み込む
  static async loadTasks() {
    const state = await this.loadState();
    return state.tasks;
  }

  // テスト用に IndexedDB を削除する
  static deleteDatabase() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        resolve();
        return;
      }

      const request = indexedDB.deleteDatabase(this.DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Failed to delete IndexedDB.'));
      request.onblocked = () => reject(new Error('IndexedDB deletion was blocked.'));
    });
  }

  // 今日の破壊スコアキーを取得
  static getTodayKey() {
    const d = new Date();
    return `destroy_count_${d.getFullYear()}_${d.getMonth()+1}_${d.getDate()}`;
  }

  // 今日の破壊スコアを取得
  static getDestroyCount() {
    try {
      const raw = localStorage.getItem(this.getTodayKey());
      const value = Number.parseInt(raw || '0', 10);
      return Number.isSafeInteger(value) && value >= 0 ? value : 0;
    } catch (error) {
      console.warn('破壊スコアを読み込めませんでした。', error);
      return 0;
    }
  }

  // 今日の破壊スコアを加算
  static incrementDestroyCount() {
    const key = this.getTodayKey();
    const current = this.getDestroyCount();
    const next = Math.min(current + 1, Number.MAX_SAFE_INTEGER);
    try {
      localStorage.setItem(key, String(next));
    } catch (error) {
      // 保存できない環境でもタスク破壊自体は継続する
      console.warn('破壊スコアを保存できませんでした。', error);
    }
    return next;
  }
}
