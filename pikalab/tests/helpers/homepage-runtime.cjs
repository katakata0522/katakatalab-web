const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');

function setup({ baseline, stored = {}, storage, catalog } = {}) {
    const counts = { queries: 0, textReads: 0, classWrites: 0, writes: 0, listeners: 0, menuCloses: 0 };
    const elements = new Map();
    let now = 0, sequence = 0;
    const timers = new Map();
    function element(id = '') {
        let markup = '', text = '';
        const classes = new Set();
        const listeners = new Map();
        const el = { id, dataset: {}, style: {}, children: [], listeners,
            classList: {
                add(...xs) { counts.classWrites++; xs.forEach(x => classes.add(x)); },
                remove(...xs) { counts.classWrites++; xs.forEach(x => classes.delete(x)); },
                toggle(x, on) { counts.classWrites++; if (on) classes.add(x); else classes.delete(x); },
                contains(x) { return classes.has(x); }
            },
            set className(value) { classes.clear(); value.split(/\s+/).forEach(x => classes.add(x)); },
            get innerHTML() { return markup; },
            set innerHTML(value) { markup = value; text = value.replace(/<[^>]*>/g, ''); this.children = []; },
            get textContent() { counts.textReads++; return text; },
            set textContent(value) { text = value; },
            appendChild(child) { this.children.push(child); child.parentElement = this; return child; },
            replaceChildren(fragment) { this.children = fragment.children; this.children.forEach(x => x.parentElement = this); },
            addEventListener(type, listener) { counts.listeners++; listeners.set(type, listener); },
            querySelectorAll(selector) { return selector === 'a[data-launch-app]' ? [] : this.children; },
            querySelector() { return null; },
            contains(target) { return target === this || this.children.some(child => child === target || child.contains?.(target)); },
            setAttribute(name, value) { this[name] = value; },
            getAttribute(name) { return this[name]; },
        };
        if (id) elements.set(id, el);
        return el;
    }
    for (const id of ['apps-grid','grid-title','search-empty','app-search-clear','app-search','launcher-overlay','launcher-text']) element(id);
    const document = {
        getElementById: id => elements.get(id),
        querySelectorAll(selector) { counts.queries++; return selector === '.app-card' ? elements.get('apps-grid').children : []; },
        createElement: () => element(), createDocumentFragment: () => element(), createTextNode: value => ({ textContent: value })
    };
    const data = { ...stored };
    const localStorage = storage || {
        getItem: key => data[key] ?? null,
        setItem(key, value) { counts.writes++; data[key] = value; },
        removeItem(key) { delete data[key]; }
    };
    const context = { document, localStorage, console: { log() {}, warn() {}, error() {} },
        APP_DATA: catalog || JSON.parse(fs.readFileSync(path.join(root, 'js/app-data.json'), 'utf8')),
        normalizeProfileName: (name, fallback = 'ゲスト') => typeof name === 'string' && name.trim() ? name.trim().slice(0, 40) : fallback,
        countVisitedLabs: (badges, ids) => new Set(badges.filter(id => ids.has(id))).size,
        startAudio: () => Promise.resolve(), playSound() {}, toggleMenu() {}, maybeCloseMenu() { counts.menuCloses++; }, alert() {},
        setTimeout(fn, delay) { const id = ++sequence; timers.set(id, { fn, at: now + delay }); return id; },
        clearTimeout: id => timers.delete(id)
    };
    vm.createContext(context);
    for (const file of ['constants.js','profile.js','apps.js']) {
        const filename = baseline && file !== 'constants.js' ? path.join(baseline, file) : path.join(root,'js',file);
        let source = fs.readFileSync(filename, 'utf8').replace(/^import .*?;\n/gm, '').replace(/export /g, '');
        if (baseline && file === 'apps.js') source = source.replace(/const TAB_BUTTON_IDS = \[.*?\];/, '');
        vm.runInContext(source, context, { filename });
    }
    vm.runInContext('this.api = { renderAppCards, setCategory, setSearchTerm, filterApps, launchApp, getTodayMissionApp, loadProfile, saveProfile, addBadge, recordRecentApp, userProfile, updateRecentUI, STORAGE_KEY, STORAGE_KEY_LEGACY, TIMING, normalizeProfileData }; if (typeof batchProfileUpdates === "function") this.api.batchProfileUpdates = batchProfileUpdates;', context);
    function advance(ms) {
        const end = now + ms;
        while (true) {
            const next = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a,b) => a[1].at - b[1].at)[0];
            if (!next) break;
            now = next[1].at; timers.delete(next[0]); next[1].fn();
        }
        now = end;
    }
    return { ...context.api, counts, data, elements, element, advance, timers,
        visible: () => elements.get('apps-grid').children.filter(c => !c.classList.contains('hidden')).map(c => c.dataset.appId),
        resetCounts: () => Object.keys(counts).forEach(key => counts[key] = 0)
    };
}
module.exports = { setup };
