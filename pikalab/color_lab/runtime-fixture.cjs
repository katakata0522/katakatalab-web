const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 実際のHTMLと本番イベントを使う最小DOM。描画・CSS・ブラウザ標準の検証は行わない。
// 非同期処理は仮想時計で進め、animationendはテストから明示して再現する。
function createRuntime(options = {}) {
    const root = options.root || process.env.COLOR_LAB_TEST_ROOT || __dirname;
    const storage = new Map(Object.entries(options.storage || {}));
    const timers = new Map();
    const errors = [];
    const counters = { elementsCreated: 0, listenersAdded: 0, idLookups: 0 };
    let now = 0;
    let nextTimerId = 0;
    let document;
    const decode = value => value.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    const encode = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    function matches(element, selector) {
        selector = selector.trim();
        if (selector.includes(',')) return selector.split(',').some(part => matches(element, part));
        const not = selector.match(/:not\(([^)]+)\)/);
        if (not) return matches(element, selector.replace(not[0], '')) && !matches(element, not[1]);
        if (selector === '*') return true;
        if (selector.startsWith('#')) return element.id === selector.slice(1);
        if (selector.startsWith('.')) return element.classList.contains(selector.slice(1));
        const attribute = selector.match(/^\[([^=\]]+)(?:=["']?([^"'\]]*)["']?)?\]$/);
        if (attribute) return element.hasAttribute(attribute[1]) &&
            (attribute[2] === undefined || element.getAttribute(attribute[1]) === attribute[2]);
        return element.tagName.toLowerCase() === selector.toLowerCase();
    }

    class Element {
        constructor(tag = 'div') {
            counters.elementsCreated++;
            this.tagName = tag === 'circle' ? tag : tag.toUpperCase();
            this.attributes = new Map();
            this.children = [];
            this.parentNode = null;
            this.dataset = {};
            this.style = { setProperty(name, value) { this[name] = String(value); } };
            this.listeners = new Map();
            this._text = '';
            this.value = '';
            this.disabled = false;
            this.hidden = false;
            this.classList = {
                add: (...tokens) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...tokens])].join(' '); },
                remove: (...tokens) => { this.className = this.className.split(/\s+/).filter(token => !tokens.includes(token)).join(' '); },
                contains: token => this.className.split(/\s+/).includes(token),
                toggle: (token, force) => {
                    const add = force === undefined ? !this.classList.contains(token) : force;
                    this.classList[add ? 'add' : 'remove'](token);
                    return add;
                }
            };
        }
        get id() { return this.getAttribute('id') || ''; }
        set id(value) { this.setAttribute('id', value); }
        get className() { return this.getAttribute('class') || ''; }
        set className(value) { this.setAttribute('class', value); }
        get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
        set textContent(value) { this.replaceChildren(); this._text = String(value); }
        get innerHTML() { return encode(this._text) + this.children.map(child => child.textContent).join(''); }
        set innerHTML(value) { this.replaceChildren(); parseMarkup(String(value), this); }
        get childElementCount() { return this.children.length; }
        get firstElementChild() { return this.children[0] || null; }
        get lastElementChild() { return this.children.at(-1) || null; }
        get parentElement() { return this.parentNode; }
        get isConnected() { return Boolean(document && document.root.contains(this)); }
        get clientWidth() { return 150; }
        get clientHeight() { return 200; }
        get offsetWidth() { return 100; }
        setAttribute(name, value) {
            value = String(value);
            this.attributes.set(name, value);
            if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
            if (name === 'value') this.value = value;
            if (name === 'disabled') this.disabled = true;
            if (name === 'hidden') this.hidden = true;
        }
        getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
        hasAttribute(name) { return this.attributes.has(name); }
        removeAttribute(name) {
            this.attributes.delete(name);
            if (name === 'disabled') this.disabled = false;
            if (name === 'hidden') this.hidden = false;
        }
        appendChild(child) {
            if (child.parentNode) child.parentNode.removeChild(child);
            this.children.push(child);
            child.parentNode = this;
            return child;
        }
        insertBefore(child, before) {
            const index = this.children.indexOf(before);
            if (index < 0) throw new Error('挿入先が親要素に存在しません');
            if (child.parentNode) child.parentNode.removeChild(child);
            this.children.splice(index, 0, child);
            child.parentNode = this;
            return child;
        }
        removeChild(child) {
            const index = this.children.indexOf(child);
            if (index < 0) throw new Error('削除対象が親要素に存在しません');
            if (document && child.contains(document.activeElement)) document.activeElement = document.body;
            this.children.splice(index, 1);
            child.parentNode = null;
            return child;
        }
        remove() { if (this.parentNode) this.parentNode.removeChild(this); }
        replaceChildren(...children) {
            for (const child of [...this.children]) this.removeChild(child);
            this._text = '';
            children.forEach(child => this.appendChild(child));
        }
        contains(element) { return this === element || this.children.some(child => child.contains(element)); }
        closest(selector) { return matches(this, selector) ? this : this.parentNode?.closest(selector) || null; }
        querySelectorAll(selector) {
            const result = [];
            for (const child of this.children) {
                if (matches(child, selector)) result.push(child);
                result.push(...child.querySelectorAll(selector));
            }
            return result;
        }
        querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
        addEventListener(type, listener, options = {}) {
            counters.listenersAdded++;
            if (!this.listeners.has(type)) this.listeners.set(type, []);
            this.listeners.get(type).push({ listener, once: Boolean(options.once) });
        }
        removeEventListener(type, listener) {
            this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item.listener !== listener));
        }
        focus() { if (this.isConnected && !this.disabled && this.getClientRects().length) document.activeElement = this; }
        getClientRects() {
            let node = this;
            while (node) {
                if (node.hidden || node.classList.contains('hidden') || node.hasAttribute('inert')) return [];
                node = node.parentNode;
            }
            return this.isConnected ? [this.getBoundingClientRect()] : [];
        }
        getBoundingClientRect() { return { x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }; }
    }

    function parseMarkup(markup, container) {
        // スクリプト実行はVMが担当するため、HTML解析では内容を除外する。
        markup = markup.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
        const stack = [container];
        const voidTags = new Set(['meta', 'link', 'input', 'img', 'br', 'hr', 'source', 'wbr']);
        for (const token of markup.match(/<[^>]+>|[^<]+/g) || []) {
            if (/^<!/.test(token)) continue;
            const closing = token.match(/^<\/([\w-]+)/);
            if (closing) {
                for (let index = stack.length - 1; index > 0; index--) {
                    if (stack[index].tagName.toLowerCase() === closing[1].toLowerCase()) { stack.length = index; break; }
                }
                continue;
            }
            const opening = token.match(/^<([\w-]+)\b([^>]*)>/);
            if (opening) {
                const tag = opening[1].toLowerCase();
                const element = new Element(tag);
                const attributes = opening[2].replace(/\/$/, '');
                for (const attribute of attributes.matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
                    element.setAttribute(attribute[1], decode(attribute[2] ?? attribute[3] ?? attribute[4] ?? ''));
                }
                stack.at(-1).appendChild(element);
                if (!voidTags.has(tag) && !/\/>$/.test(token)) stack.push(element);
            } else stack.at(-1)._text += decode(token);
        }
    }

    const rootElement = new Element('root');
    document = {
        root: rootElement, readyState: 'loading', hidden: false, listeners: new Map(),
        createElement: tag => new Element(tag),
        getElementById: id => { counters.idLookups++; return rootElement.querySelector(`#${id}`); },
        querySelector: selector => rootElement.querySelector(selector),
        querySelectorAll: selector => rootElement.querySelectorAll(selector),
        addEventListener: Element.prototype.addEventListener,
        removeEventListener: Element.prototype.removeEventListener
    };
    parseMarkup(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), rootElement);
    document.body = document.querySelector('body');
    document.activeElement = document.body;

    function dispatch(target, type, properties = {}) {
        const event = { type, target, currentTarget: target, bubbles: true, defaultPrevented: false,
            preventDefault() { this.defaultPrevented = true; },
            stopPropagation() { this.stopped = true; }, ...properties };
        const eventPath = [];
        for (let node = target; node; node = node.parentNode) eventPath.push(node);
        if (!eventPath.includes(document)) eventPath.push(document);
        for (const currentTarget of eventPath) {
            event.currentTarget = currentTarget;
            for (const { listener, once } of [...(currentTarget.listeners.get(type) || [])]) {
                listener(event);
                if (once) currentTarget.removeEventListener(type, listener);
            }
            if (event.stopped || !event.bubbles) break;
        }
        return event;
    }

    const schedule = (callback, delay, repeat) => {
        const id = ++nextTimerId;
        timers.set(id, { callback, delay: Number(delay) || 0, due: now + (Number(delay) || 0), repeat });
        return id;
    };
    const epoch = Date.UTC(2026, 9, 3, 12);
    class VirtualDate extends Date {
        constructor(...args) { super(...(args.length ? args : [epoch + now])); }
        static now() { return epoch + now; }
    }
    const context = {
        Date: VirtualDate,
        document, navigator: {}, console: { warn: (...args) => errors.push(args), error: (...args) => errors.push(args) },
        localStorage: {
            getItem(key) {
                if (options.storageReadBlocked) throw new Error('Storage read blocked');
                return storage.get(key) ?? null;
            },
            setItem(key, value) {
                if (options.storageWriteBlocked) throw new Error('Storage write blocked');
                storage.set(key, String(value));
            }
        },
        setTimeout: (callback, delay) => schedule(callback, delay, false),
        clearTimeout: id => timers.delete(id),
        setInterval: (callback, delay) => schedule(callback, delay, true),
        clearInterval: id => timers.delete(id),
        Math: Object.create(Math), scrollX: 0, scrollY: 0,
        matchMedia: () => ({ matches: Boolean(options.reducedMotion), addEventListener() {} })
    };
    context.Math.random = () => options.random ?? 0;
    context.window = context;
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(root, 'logic.js'), 'utf8'), context, { filename: 'logic.js' });
    // 状態観察のみの注入。本番関数を置換せず、操作は登録済みイベント経由で行う。
    const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
    if (!/\}\)\(\);\s*$/.test(source)) throw new Error('テスト用状態観察の挿入位置がありません');
    vm.runInContext(source.replace(/\}\)\(\);\s*$/, 'window.__colorLabTestState = state;\n})();'), context, { filename: 'script.js' });
    document.readyState = 'interactive';
    dispatch(document, 'DOMContentLoaded', { bubbles: false });
    document.readyState = 'complete';

    function byId(id) {
        const element = document.getElementById(id);
        if (!element) throw new Error(`要素がありません: #${id}`);
        return element;
    }
    return {
        root, document, storage, timers, errors, counters, state: context.__colorLabTestState, byId,
        dispatch: (target, type, properties) => dispatch(typeof target === 'string' ? byId(target) : target, type, properties),
        click(target) {
            target = typeof target === 'string' ? byId(target) : target;
            if (target.disabled) return;
            target.focus();
            return dispatch(target, 'click');
        },
        input(id, value) { const target = byId(id); target.value = String(value); dispatch(target, 'input'); },
        setHidden(hidden) { document.hidden = hidden; dispatch(document, 'visibilitychange', { bubbles: false }); },
        advance(milliseconds) {
            const end = now + milliseconds;
            for (let guard = 0; guard < 100000; guard++) {
                const next = [...timers.entries()].filter(([, timer]) => timer.due <= end)
                    .sort((left, right) => left[1].due - right[1].due || left[0] - right[0])[0];
                if (!next) { now = end; return; }
                const [id, timer] = next;
                now = timer.due;
                if (timer.repeat) timer.due += Math.max(1, timer.delay);
                else timers.delete(id);
                timer.callback();
            }
            throw new Error('仮想時計の処理回数が上限を超えました');
        },
        pendingTimers: delay => [...timers.values()].filter(timer => timer.delay === delay).length,
        slots: () => byId('saved-colors-container').querySelectorAll('.palette-slot'),
        paletteButton(index) { const slot = this.slots()[index]; return slot.querySelector('.palette-use-btn') || slot; }
    };
}

module.exports = { createRuntime };
