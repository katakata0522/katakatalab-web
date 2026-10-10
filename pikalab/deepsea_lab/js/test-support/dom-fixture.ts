// DOM実装への依存を増やさず、状態・予約回数・座標計算の契約だけを検証する。
export class FakeElement {
    children: FakeElement[] = [];
    parentElement: FakeElement | null = null;
    offsetParent: FakeElement | null = null;
    attrs = new Map<string, string>();
    listeners = new Map<string, Array<(event: any) => void>>();
    classes = new Set<string>();
    classList = {
        add: (...names: string[]) => names.forEach(name => this.classes.add(name)),
        remove: (...names: string[]) => names.forEach(name => this.classes.delete(name)),
        contains: (name: string) => this.classes.has(name),
        toggle: (name: string, force?: boolean) => { const add = force ?? !this.classes.has(name); add ? this.classes.add(name) : this.classes.delete(name); return add; }
    };
    get className() { return [...this.classes].join(' '); }
    set className(value: string) { this.classes = new Set(value.split(/\s+/).filter(Boolean)); }
    styleValues = new Map<string, string>();
    priorities = new Map<string, string>();
    style: any;
    textContent = '';
    innerHTML = '';
    scrollTop = 0;
    scrollLeft = 0;
    clientWidth = 390;
    clientHeight = 780;
    dataset: Record<string, string> = {};
    isConnected = true;
    disabled = false;
    rect = { top: 0, left: 0, width: 70, height: 70, y: 0 };
    onFocus = () => {};
    layoutReads = 0;
    get offsetTop() { this.layoutReads++; return this.rect.top; }
    get offsetLeft() { this.layoutReads++; return this.rect.left; }
    get offsetWidth() { this.layoutReads++; return this.rect.width; }
    get offsetHeight() { this.layoutReads++; return this.rect.height; }
    constructor(public id = '', public tagName = 'DIV') {
        this.style = {
            setProperty: (name: string, value: string, priority = '') => { this.styleValues.set(name, value); this.priorities.set(name, priority); },
            getPropertyValue: (name: string) => this.styleValues.get(name) || '',
            getPropertyPriority: (name: string) => this.priorities.get(name) || ''
        };
        for (const [property, css] of [['overflowY', 'overflow-y'], ['overflowX', 'overflow-x']]) {
            Object.defineProperty(this.style, property, { get: () => this.styleValues.get(css) || '', set: value => { this.styleValues.set(css, value); this.priorities.set(css, ''); } });
        }
    }
    get parentNode() { return this.parentElement; }
    setAttribute(name: string, value: string) { this.attrs.set(name, value); }
    getAttribute(name: string) { return this.attrs.get(name) ?? null; }
    hasAttribute(name: string) { return this.attrs.has(name); }
    removeAttribute(name: string) { this.attrs.delete(name); }
    appendChild(child: FakeElement) { child.remove(); this.children.push(child); child.parentElement = this; return child; }
    removeChild(child: FakeElement) { child.remove(); }
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); this.parentElement = null; }
    addEventListener(type: string, listener: (event: any) => void) { const list = this.listeners.get(type) || []; list.push(listener); this.listeners.set(type, list); }
    removeEventListener(type: string, listener: (event: any) => void) { this.listeners.set(type, (this.listeners.get(type) || []).filter(candidate => candidate !== listener)); }
    fire(type: string, event: any = {}) { (this.listeners.get(type) || []).forEach(listener => listener({ target: this, currentTarget: this, stopPropagation() {}, preventDefault() {}, ...event })); }
    matches(selector: string): boolean {
        return selector.split(',').some(part => {
            const value = part.trim();
            if (value.includes(':not(.hidden)') && this.classList.contains('hidden')) return false;
            if (value.includes(':not([disabled])') && this.disabled) return false;
            const clean = value.replace(/:not\([^)]*\)/g, '');
            if (clean.startsWith('#')) { const [id] = clean.slice(1).split('['); return this.id === id && (!clean.includes('[open]') || this.hasAttribute('open')); }
            if (clean.startsWith('.')) return this.classList.contains(clean.slice(1));
            if (clean.startsWith('[')) { const match = clean.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/); return !!match && (match[2] === undefined ? this.hasAttribute(match[1]) : this.getAttribute(match[1]) === match[2]); }
            return this.tagName.toLowerCase() === clean.toLowerCase();
        });
    }
    querySelectorAll(selector: string): FakeElement[] { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
    querySelector(selector: string) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector: string): FakeElement | null { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
    focus() { this.onFocus(); }
    getBoundingClientRect() { return { ...this.rect, y: this.rect.top }; }
    scrollTo(options: { top?: number; left?: number }) { if (options.top !== undefined) this.scrollTop = options.top; if (options.left !== undefined) this.scrollLeft = options.left; }
}

export function createDomFixture() {
    const ids = new Map<string, FakeElement>();
    const root = new FakeElement('body', 'BODY');
    const doc: any = {
        body: root, documentElement: new FakeElement('html', 'HTML'), hidden: false, readyState: 'complete', activeElement: root,
        getElementById: (id: string) => ids.get(id) || null,
        querySelector: (selector: string) => root.querySelector(selector),
        querySelectorAll: (selector: string) => root.querySelectorAll(selector),
        createElement: (tag: string) => make('', tag.toUpperCase()),
        addEventListener: root.addEventListener.bind(root), removeEventListener: root.removeEventListener.bind(root)
    };
    function make(id = '', tag = 'DIV', parent = root) {
        const element = new FakeElement(id, tag);
        element.onFocus = () => { doc.activeElement = element; };
        if (id) ids.set(id, element);
        parent.appendChild(element);
        return element;
    }
    const nav = make('nav', 'NAV'); nav.classList.add('modal-layer');
    const marker = make('depth-markers-overlay'); marker.classList.add('modal-layer');
    const fog = make('fog-overlay'); fog.classList.add('modal-layer');
    const scroll = make('scroll-container'); scroll.rect.top = 64;
    const field = make('deep-sea-content', 'DIV', scroll);
    make('hud-container'); make('btn-surface', 'BUTTON');
    for (const id of ['sea-modal', 'album-modal', 'completion-modal']) {
        const modal = make(id); modal.className = 'modal-layer hidden';
        const closeId = id === 'sea-modal' ? 'btn-close-modal' : id === 'album-modal' ? 'btn-close-album' : 'btn-close-completion';
        make(closeId, 'BUTTON', modal);
    }
    make('btn-reset-album', 'BUTTON', ids.get('album-modal'));
    make('album-grid', 'DIV', ids.get('album-modal'));
    make('album-count'); make('album-progress'); make('album-progress-bar');
    make('radar-left-overlay'); make('radar-right-overlay');
    const win = new FakeElement('window') as FakeElement & { innerWidth: number; innerHeight: number };
    win.innerWidth = 390; win.innerHeight = 844;
    return { doc, win, ids, make, scroll, field, nav, fire: root.fire.bind(root) };
}
