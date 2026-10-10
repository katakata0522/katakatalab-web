import { PRESETS, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from './constants.js?v=20260613-2';

export class Store {
    constructor() {
        this.state = {
            mode: 'composite',
            type: 'basic',

            // Canvas & Image Data
            image: null,
            imgWidth: DEFAULT_CANVAS_WIDTH,
            imgHeight: DEFAULT_CANVAS_HEIGHT,

            // Center Point (Relative 0.0 - 1.0)
            centerX: 0.5,
            centerY: 0.5,

            // View
            zoom: 1.0,
            panX: 0,
            panY: 0,

            // Random seed for stable pattern generation
            seed: 12345,

            // Parameters (Initialize with Basic)
            params: { ...PRESETS.basic, whiteBorder: false }
        };

        this.listeners = [];
        this.undoStack = [];
        this.redoStack = [];
        this.MAX_HISTORY = 20;
        this._isDirty = false;
    }

    /**
     * Get a frozen shallow copy of the state.
     * Prevents accidental mutation from outside.
     * @returns {Readonly<Object>}
     */
    getState() {
        return Object.freeze({ ...this.state, params: Object.freeze({ ...this.state.params }) });
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners of changes.
     * @param {string[]} changedKeys - List of keys that changed.
     */
    notify(changedKeys = []) {
        this.listeners.forEach(listener => listener(this.getState(), changedKeys));
    }

    /**
     * Deep merge helper for nested objects
     * @param {Object} target
     * @param {Object} source
     * @returns {Object}
     */
    #deepMerge(target, source) {
        const result = { ...target };

        for (const key of Object.keys(source)) {
            if (
                source[key] !== null &&
                typeof source[key] === 'object' &&
                !Array.isArray(source[key]) &&
                target[key] !== null &&
                typeof target[key] === 'object' &&
                !Array.isArray(target[key])
            ) {
                result[key] = this.#deepMerge(target[key], source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    /**
     * Update state and notify listeners.
     * @param {Object} updates - Partial state updates.
     * @param {boolean} saveHistory - Whether to push to undo stack.
     */
    setState(updates, saveHistory = false) {
        if (saveHistory) {
            this.pushHistory();
        }

        this.state = this.#deepMerge(this.state, updates);
        this._isDirty = true;
        this.notify(Object.keys(updates));
    }

    updateParams(newParams, saveHistory = false) {
        if (saveHistory) {
            this.pushHistory();
        }
        this.state.params = { ...this.state.params, ...newParams };
        this._isDirty = true;
        this.notify(['params']);
    }

    /**
     * Rotate the random seed and save to history.
     */
    rotateSeed() {
        this.pushHistory();
        this.state.seed = Math.floor(Math.random() * 4000000000);
        this._isDirty = true;
        this.notify(['seed']);
    }

    setPreset(type) {
        if (PRESETS[type]) {
            this.pushHistory();
            this.state.type = type;
            this.state.params = { ...this.state.params, ...PRESETS[type] };
            this._isDirty = true;
            this.notify(['type', 'params']);
        }
    }

    // --- History Management ---
    getSnapshot() {
        return JSON.parse(JSON.stringify({
            params: this.state.params,
            centerX: this.state.centerX,
            centerY: this.state.centerY,
            type: this.state.type,
            mode: this.state.mode,
            seed: this.state.seed
        }));
    }

    pushHistory(force = false) {
        // Skip if nothing has changed since last push
        if (!force && !this._isDirty && this.undoStack.length > 0) return;

        const snapshot = this.getSnapshot();
        const last = this.undoStack[this.undoStack.length - 1];
        if (last && JSON.stringify(last) === JSON.stringify(snapshot)) {
            this._isDirty = false;
            this.notify(['history']);
            return;
        }

        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.MAX_HISTORY) this.undoStack.shift();
        this.redoStack = [];
        this._isDirty = false;
        this.notify(['history']);
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const current = this.getSnapshot();
        this.redoStack.push(current);

        const prev = this.undoStack.pop();
        this.restoreSnapshot(prev);
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const next = this.redoStack.pop();
        this.undoStack.push(this.getSnapshot());
        this.restoreSnapshot(next);
    }

    restoreSnapshot(snapshot) {
        this.state.params = snapshot.params;
        this.state.centerX = snapshot.centerX;
        this.state.centerY = snapshot.centerY;
        this.state.type = snapshot.type;
        this.state.mode = snapshot.mode;
        this.state.seed = snapshot.seed;
        this._isDirty = false;
        this.notify(['snapshot', 'history']);
    }

    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }
}

export const store = new Store();
