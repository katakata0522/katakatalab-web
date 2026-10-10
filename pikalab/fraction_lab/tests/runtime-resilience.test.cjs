const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 比較監査では環境変数で旧版を指定できる。通常の実行はこのテストの親ディレクトリを使う。
const appRoot = process.env.FRACTION_LAB_TEST_ROOT || path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(appRoot, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(appRoot, 'style.css'), 'utf8');
const source = fs.readFileSync(path.join(appRoot, 'script.js'), 'utf8');
const conceptSource = fs.readFileSync(path.join(appRoot, 'concept-evolution.js'), 'utf8');
const math = require(path.join(appRoot, 'script.js'));

// 描画結果やイベントの契約を検証する小さなDOM。レイアウト・ネイティブ入力制約・読み上げは
// 再現しないため、実ブラウザーでの確認を置き換えない。
class TestEvent {
    constructor(type, options = {}) { this.type = type; Object.assign(this, options); }
    preventDefault() { this.defaultPrevented = true; }
}

function matches(element, selector) {
    if (element.nodeType !== 1) return false;
    const tag = selector.match(/^[a-z][\w-]*/i)?.[0];
    if (tag && element.tagName !== tag.toUpperCase()) return false;
    const id = selector.match(/#([\w-]+)/)?.[1];
    if (id && element.id !== id) return false;
    for (const [, token] of selector.matchAll(/\.((?:\\.|[\w/-])+)/g)) {
        if (!element.classList.contains(token.replace(/\\(.)/g, '$1'))) return false;
    }
    for (const [, name, value] of selector.matchAll(/\[([\w-]+)(?:=["']?([^"'\]]+)["']?)?\]/g)) {
        if (element.getAttribute(name) === null) return false;
        if (value !== undefined && element.getAttribute(name) !== value) return false;
    }
    return true;
}

class Element {
    constructor(tag, document, nodeType = 1) {
        this.tagName = tag.toUpperCase(); this.ownerDocument = document; this.nodeType = nodeType;
        this.attributes = new Map(); this.childNodes = []; this.parentElement = null;
        this.style = {}; this.listeners = new Map(); this.disabled = false;
        this.dataset = new Proxy({}, {
            get: (_, name) => this.getAttribute(`data-${String(name).replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`),
            set: (_, name, value) => { this.setAttribute(`data-${String(name).replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`, value); return true; }
        });
        this.classList = {
            contains: token => this.className.split(/\s+/).includes(token),
            add: (...tokens) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...tokens])].join(' '); },
            remove: (...tokens) => { this.className = this.className.split(/\s+/).filter(token => !tokens.includes(token)).join(' '); },
            toggle: (token, force) => {
                const add = force === undefined ? !this.classList.contains(token) : force;
                this.classList[add ? 'add' : 'remove'](token); return add;
            }
        };
    }
    get children() { return this.childNodes.filter(node => node.nodeType === 1); }
    get childElementCount() { return this.children.length; }
    get id() { return this.getAttribute('id') || ''; }
    set id(value) { this.setAttribute('id', value); }
    get className() { return this.getAttribute('class') || ''; }
    set className(value) { this.setAttribute('class', value); }
    get value() { return this._value ?? this.getAttribute('value') ?? ''; }
    set value(value) { this._value = String(value); }
    get min() { return this.getAttribute('min') || ''; }
    set min(value) { this.setAttribute('min', value); }
    get max() { return this.getAttribute('max') || ''; }
    set max(value) { this.setAttribute('max', value); }
    get open() { return this.attributes.has('open'); }
    get textContent() { return this.nodeType === 3 ? this._text : this.childNodes.map(node => node.textContent).join(''); }
    set textContent(value) {
        if (this.nodeType === 3) { this._text = String(value); return; }
        this.replaceChildren();
        if (String(value)) this.appendChild(this.ownerDocument.createTextNode(String(value)));
    }
    get innerText() { return this.textContent; }
    set innerText(value) { this.textContent = value; }
    get innerHTML() { return this.textContent; }
    set innerHTML(value) { this.textContent = String(value).replace(/<[^>]*>/g, ''); }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
    setAttribute(name, value) {
        this.attributes.set(name, String(value));
        if (name === 'style') {
            for (const declaration of String(value).split(';')) {
                const [key, ...rest] = declaration.split(':');
                if (key.trim()) this.style[key.trim()] = rest.join(':').trim();
            }
        }
    }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(node) {
        if (node.nodeType === 11) { [...node.childNodes].forEach(child => this.appendChild(child)); return node; }
        node.remove(); node.parentElement = this; this.childNodes.push(node); return node;
    }
    append(...nodes) { nodes.forEach(node => this.appendChild(typeof node === 'string' ? this.ownerDocument.createTextNode(node) : node)); }
    replaceChildren(...nodes) { this.childNodes.forEach(node => { node.parentElement = null; }); this.childNodes = []; this.append(...nodes); }
    remove() {
        if (!this.parentElement) return;
        const siblings = this.parentElement.childNodes; siblings.splice(siblings.indexOf(this), 1); this.parentElement = null;
    }
    after(node) {
        const parent = this.parentElement; node.remove();
        parent.childNodes.splice(parent.childNodes.indexOf(this) + 1, 0, node); node.parentElement = parent;
    }
    contains(node) { return node === this || this.childNodes.some(child => child.contains(node)); }
    closest(selector) { return matches(this, selector) ? this : this.parentElement?.closest(selector) || null; }
    querySelectorAll(selector) {
        const parts = selector.trim().split(/\s+/);
        const result = [];
        const visit = node => {
            for (const child of node.childNodes) {
                if (matches(child, parts.at(-1))) {
                    let ancestor = child.parentElement; let index = parts.length - 2;
                    while (index >= 0 && ancestor) {
                        if (matches(ancestor, parts[index])) index -= 1;
                        ancestor = ancestor.parentElement;
                    }
                    if (index < 0) result.push(child);
                }
                visit(child);
            }
        };
        visit(this); return result;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    addEventListener(type, callback, options = {}) {
        const listeners = this.listeners.get(type) || [];
        if (!listeners.some(listener => listener.callback === callback)) listeners.push({ callback, once: !!options.once });
        this.listeners.set(type, listeners);
    }
    dispatchEvent(event) {
        event.target ||= this; event.currentTarget = this;
        for (const listener of [...(this.listeners.get(event.type) || [])]) {
            if (listener.once) this.listeners.set(event.type, this.listeners.get(event.type).filter(item => item !== listener));
            listener.callback(event);
        }
        if (event.bubbles && this.parentElement) this.parentElement.dispatchEvent(event);
        return !event.defaultPrevented;
    }
    click() { if (!this.disabled) this.dispatchEvent(new TestEvent('click', { bubbles: true })); }
    focus() { this.ownerDocument.activeElement = this; }
    getBoundingClientRect() { return { left: 100, right: 500, top: 100, bottom: 500 }; }
    showModal() { this.setAttribute('open', ''); }
    close() { this.removeAttribute('open'); this.dispatchEvent(new TestEvent('close')); }
}

function createDocument(markup) {
    const document = new Element('document', null, 9); document.ownerDocument = document;
    document.readyState = 'loading';
    document.createElement = tag => new Element(tag, document);
    document.createElementNS = (_, tag) => document.createElement(tag);
    document.createDocumentFragment = () => new Element('fragment', document, 11);
    document.createTextNode = value => { const node = new Element('text', document, 3); node.textContent = value; return node; };
    document.getElementById = id => document.querySelector(`#${id}`);
    const stack = [document];
    const voids = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
    for (const token of markup.replace(/<!--[\s\S]*?-->/g, '').match(/<[^>]+>|[^<]+/g) || []) {
        if (token.startsWith('<!')) continue;
        if (token.startsWith('</')) {
            const tag = token.match(/^<\/([\w-]+)/)?.[1].toUpperCase();
            while (stack.length > 1) { if (stack.pop().tagName === tag) break; }
        } else if (token.startsWith('<')) {
            const tag = token.match(/^<([\w-]+)/)?.[1];
            if (!tag) continue;
            const element = document.createElement(tag);
            for (const [, name, quoted, single, bare] of token.slice(tag.length + 1, -1).matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
                element.setAttribute(name, quoted ?? single ?? bare ?? '');
            }
            stack.at(-1).appendChild(element);
            if (!voids.has(tag) && !token.endsWith('/>')) stack.push(element);
        } else {
            stack.at(-1).appendChild(document.createTextNode(token.replace(/&amp;/g, '&')));
        }
    }
    document.body = document.querySelector('body'); document.activeElement = document.body;
    return document;
}

function harness({ profile = {}, initialize = true, concept = false } = {}) {
    const document = createDocument(html); let stored = JSON.stringify(profile);
    let readFailure = false; let writeCount = 0;
    const context = vm.createContext({
        document, Event: TestEvent, queueMicrotask: callback => callback(), console: { error() {} },
        localStorage: {
            getItem: () => { if (readFailure) throw new Error('読み取り不可'); return stored; },
            setItem: (_, value) => { writeCount += 1; stored = value; }
        }
    });
    vm.runInContext(source, context, { filename: 'script.js' });
    if (concept) vm.runInContext(conceptSource, context, { filename: 'concept-evolution.js' });
    if (initialize) { document.readyState = 'interactive'; document.dispatchEvent(new TestEvent('DOMContentLoaded')); }
    return {
        context, document, get: id => document.getElementById(id),
        failStorageReads: () => { readFailure = true; }, get writeCount() { return writeCount; },
        get profile() { return JSON.parse(stored); }, set profile(value) { stored = JSON.stringify(value); }
    };
}

function setValues(h, values) { for (const [id, value] of Object.entries(values)) h.get(id).value = value; }
function assertSameChildren(element, saved) {
    assert.equal(element.children.length, saved.length);
    saved.forEach((node, index) => assert.ok(element.children[index] === node, `子要素${index}を再利用する`));
}

test('数値入力の丸めは指数表記をNumberとして読み、空欄・非数値を既定値にする', () => {
    for (const [value, expected] of [['1e1', 10], ['2e0', 2], ['3.9', 3], ['12tail', 4], ['', 4], ['   ', 4], [Infinity, 4]]) {
        assert.equal(math.clampInteger(value, 1, 12, 4), expected, String(value));
    }
});

test('エジプト分数は範囲外・空欄・小数を別の値に置き換えず拒否する', () => {
    for (const [n, d] of [[1, 0], [0, 4], ['', 4], [1, ''], [' ', 4], [1.5, 4], [1, 4.5], [1, 101], [100, 100], [-1, 4], [4, 4], [5, 4], ['1oops', 4], [NaN, 4], [1, Infinity]]) {
        const result = math.decomposeEgyptianFraction(n, d);
        assert.equal(result.ok, false, `${n}/${d}`);
        assert.equal(result.terms.length, 0, `${n}/${d} の代替結果を出さない`);
    }
    assert.deepEqual(math.decomposeEgyptianFraction('1e1', '20').terms, ['1/2']);
});

test('許容される全4950真分数を正確に分解できる', () => {
    for (let d = 2; d <= 100; d++) for (let n = 1; n < d; n++) {
        const result = math.decomposeEgyptianFraction(String(n), String(d));
        assert.equal(result.ok, true, `${n}/${d}`);
        let numerator = 0n; let denominator = 1n; let previous = 0n;
        for (const term of result.terms) {
            const unit = BigInt(term.split('/')[1]);
            assert.ok(unit > previous); previous = unit;
            numerator = numerator * unit + denominator; denominator *= unit;
        }
        assert.equal(numerator * BigInt(d), BigInt(n) * denominator, `${n}/${d}`);
    }
});

test('エジプト分数のエラー時に前回結果を消し、入力をそのまま残す', () => {
    const h = harness();
    for (const [n, d] of [[4, 4], [1, 0], [0, 4], ['', ''], [1.5, 4], [100, 100], [1, 101]]) {
        setValues(h, { 'egypt-n': 3, 'egypt-d': 4 }); h.get('btn-calc-egypt').click();
        assert.match(h.get('egypt-formula').textContent, /3\/4\s*=\s*1\/2\s*\+\s*1\/4/);
        setValues(h, { 'egypt-n': n, 'egypt-d': d }); h.get('btn-calc-egypt').click();
        assert.equal(h.get('egypt-n').value, String(n)); assert.equal(h.get('egypt-d').value, String(d));
        assert.equal(h.get('egypt-warning').classList.contains('hidden'), false);
        assert.equal(h.get('egypt-content').classList.contains('hidden'), true);
        assert.notEqual(h.get('egypt-content').style.display, 'flex');
        assert.equal(h.get('egypt-formula').textContent, ''); assert.equal(h.get('egypt-steps').textContent, '');
    }
});

test('エジプト入力の編集で古い答えを消し、Enterで新しい答えを出す', () => {
    const h = harness(); h.get('btn-calc-egypt').click();
    h.get('egypt-n').value = '1'; h.get('egypt-n').dispatchEvent(new TestEvent('input'));
    assert.equal(h.get('egypt-formula').textContent, '');
    h.get('egypt-n').dispatchEvent(new TestEvent('keydown', { key: 'Enter', isComposing: true }));
    assert.equal(h.get('egypt-formula').textContent, '');
    h.get('egypt-n').dispatchEvent(new TestEvent('keydown', { key: 'Enter', repeat: true }));
    assert.equal(h.get('egypt-formula').textContent, '');
    const enter = new TestEvent('keydown', { key: 'Enter' }); h.get('egypt-n').dispatchEvent(enter);
    assert.equal(enter.defaultPrevented, true); assert.match(h.get('egypt-formula').textContent, /1\/4\s*=\s*1\/4/);
});

test('分子だけを動かすとSVG・棒・数直線の同じ要素を再利用する', () => {
    const h = harness(); const ids = ['vis-pizza-svg', 'vis-bar', 'vis-line-marks'];
    const saved = ids.map(id => [...h.get(id).children]);
    h.get('vis-numer').value = '3'; h.get('vis-numer').dispatchEvent(new TestEvent('input'));
    ids.forEach((id, index) => assertSameChildren(h.get(id), saved[index]));
    assert.equal(h.get('vis-bar').children.filter(node => node.classList.contains('active')).length, 3);
    assert.equal(h.get('vis-line-fill').style.width, '75%');
    h.get('vis-denom').value = '2'; h.get('vis-denom').dispatchEvent(new TestEvent('input'));
    assert.equal(h.get('vis-pizza-svg').children.length, 3); assert.equal(h.get('vis-bar').children.length, 2);
    assert.equal(h.get('vis-line-marks').children.length, 3); assert.equal(h.get('vis-display').textContent, '2/2');
});

test('分母1の円と棒にも分子を選ぶ委譲クリック用メタデータがある', () => {
    const h = harness(); setValues(h, { 'vis-denom': 1, 'vis-numer': 0 }); h.context.updateVisual();
    const part = h.get('vis-pizza-svg').querySelector('[data-fraction-part]');
    assert.ok(part); assert.equal(part.tagName, 'CIRCLE'); assert.equal(part.dataset.fractionPart, '1');
    part.click(); assert.equal(h.get('vis-numer').value, '1'); assert.equal(h.get('vis-display').textContent, '1/1');
    setValues(h, { 'vis-denom': 4, 'vis-numer': 0 }); h.context.updateVisual();
    h.get('vis-bar').children[2].click(); assert.equal(h.get('vis-display').textContent, '3/4');
});

test('比較図の色と同値判定を保ち、SVGの再生成を避ける', () => {
    const h = harness(); const svg = h.get('cmp-svg-2'); const saved = [...svg.children];
    assert.equal(h.get('cmp-icon').textContent, 'equal'); assert.match(h.get('cmp-status').textContent, /同じ大きさ/);
    h.get('cmp-n2').value = '3'; h.context.updateCompare(); assertSameChildren(svg, saved);
    assert.equal(svg.children[1].getAttribute('fill'), '#EC4899');
    assert.equal(h.get('cmp-icon').textContent, 'chevron_left'); assert.match(h.get('cmp-status').textContent, /右の分数/);
    // presentation属性を打ち消す固定色がactiveルールへ戻らないことも確認する。
    for (const [, declarations] of css.matchAll(/\.pizza-slice\.active\s*\{([^}]+)\}/g)) {
        assert.doesNotMatch(declarations, /(?:^|;)\s*fill\s*:\s*var\(--accent-color\)/);
    }
});

test('古いHTMLに比較のライブ通知先がなくても初期化と比較操作を続行する', () => {
    const h = harness({ initialize: false });
    h.get('cmp-status')?.remove();
    assert.equal(h.get('cmp-status'), null, 'キャッシュ済みHTMLの通知先欠落を再現する');
    h.document.readyState = 'interactive';
    assert.doesNotThrow(() => h.document.dispatchEvent(new TestEvent('DOMContentLoaded')));
    assert.equal(h.get('cmp-disp-1').textContent, '1/2');
    assert.equal(h.get('cmp-disp-2').textContent, '2/4');
    assert.equal(h.get('cmp-icon').textContent, 'equal');
    assert.equal(h.get('calc-res-text').textContent, '3/5', '比較の後の初期化も完了する');
    assert.equal(h.get('sub-res-text').textContent, '2/5');

    h.get('cmp-n2').value = '3';
    assert.doesNotThrow(() => h.get('cmp-n2').dispatchEvent(new TestEvent('input')));
    assert.equal(h.get('cmp-disp-2').textContent, '3/4');
    assert.equal(h.get('cmp-val-2').textContent, '0.75');
    assert.equal(h.get('cmp-bar-2').style.width, '75%');
    assert.equal(h.get('cmp-icon').textContent, 'chevron_left');
    assert.equal(h.get('cmp-svg-2').children[1].getAttribute('fill'), '#EC4899');

    h.get('cmp-n1').value = '2';
    assert.doesNotThrow(() => h.context.updateCompare());
    assert.equal(h.get('cmp-disp-1').textContent, '2/2');
    assert.equal(h.get('cmp-icon').textContent, 'chevron_right');
});

test('加減算の全UI範囲で式・警告が正しく、結果図も同じ要素を再利用する', () => {
    const h = harness();
    for (let d = 2; d <= 10; d++) {
        setValues(h, { 'calc-denom': d, 'sub-denom': d }); h.context.updateCalc(); h.context.updateSub();
        const addNodes = [...h.get('calc-svg-res').children]; const subNodes = [...h.get('sub-svg-res').children];
        for (let a = 1; a < d; a++) for (let b = 1; b < d; b++) {
            setValues(h, { 'calc-n1': a, 'calc-n2': b }); h.context.updateCalc();
            assert.equal(h.get('calc-res-text').textContent, `${a + b}/${d}`);
            assert.equal(h.get('calc-warning').classList.contains('hidden'), a + b <= d);
            assertSameChildren(h.get('calc-svg-res'), addNodes);
        }
        for (let a = 1; a <= d; a++) for (let b = 0; b <= d; b++) {
            setValues(h, { 'sub-n1': a, 'sub-n2': b }); h.context.updateSub();
            assert.equal(h.get('sub-res-text').textContent, `${a - b}/${d}`);
            assert.equal(h.get('sub-warning').classList.contains('hidden'), a >= b);
            assertSameChildren(h.get('sub-svg-res'), subNodes);
            h.get('sub-svg-res').children.slice(1).forEach((part, index) => {
                assert.equal(part.getAttribute('fill-opacity'), index >= a - b && index < a ? '0.3' : '1');
            });
        }
    }
});

test('加減算の分母・分子をUI範囲にそろえ、正規化した値を入力にも返す', () => {
    const h = harness();
    setValues(h, { 'calc-denom': 99, 'calc-n1': '1e1', 'calc-n2': -2 }); h.context.updateCalc();
    assert.equal(h.get('calc-denom').value, '10'); assert.equal(h.get('calc-n1').value, '9');
    assert.equal(h.get('calc-n2').value, '1'); assert.equal(h.get('calc-res-text').textContent, '10/10');
    setValues(h, { 'sub-denom': -1, 'sub-n1': -10, 'sub-n2': 90 }); h.context.updateSub();
    assert.equal(h.get('sub-denom').value, '2'); assert.equal(h.get('sub-n1').value, '1');
    assert.equal(h.get('sub-n2').value, '2'); assert.equal(h.get('sub-res-text').textContent, '-1/2');
});

test('別タブの設定と無関係なプロフィール項目を保持して今回のキーだけ保存する', () => {
    const h = harness({ profile: { darkMode: true, reduceMotion: false, displayName: '保持' } });
    h.profile = { darkMode: false, reduceMotion: false, displayName: '更新済み', favoriteApps: ['fraction_lab'] };
    h.get('motion-toggle').click();
    assert.deepEqual(h.profile, { darkMode: false, reduceMotion: true, displayName: '更新済み', favoriteApps: ['fraction_lab'] });
    assert.equal(h.document.body.classList.contains('theme-light'), true);
    assert.equal(h.get('dark-mode-toggle').getAttribute('aria-pressed'), 'false');
    assert.equal(h.get('motion-toggle').getAttribute('aria-pressed'), 'true');
});

test('共有プロフィールの読み取りに失敗したら書き込み可能でも上書きを試みない', () => {
    const profile = { darkMode: true, reduceMotion: false, displayName: '保持', favoriteApps: ['fraction_lab'] };
    const h = harness({ profile }); h.failStorageReads();
    assert.doesNotThrow(() => vm.runInContext("userSettings.reduceMotion = true; saveSettings('reduceMotion');", h.context));
    assert.equal(h.writeCount, 0, '既存データが不明な場合はsetItemを呼ばない');
    assert.deepEqual(h.profile, profile);
});

test('初期化の再呼び出しでも操作リスナーを重複登録しない', () => {
    const h = harness(); h.context.init(); h.context.init();
    for (const [id, type] of [['btn-calc-egypt', 'click'], ['vis-numer', 'input'], ['parents-modal-open-btn', 'click']]) {
        assert.equal(h.get(id).listeners.get(type)?.length, 1, `${id}:${type}`);
    }
    const plus = h.document.querySelector('[data-target="vis-numer"][data-action="inc"]');
    plus.click(); assert.equal(h.get('vis-numer').value, '2');
});

test('モーダルとARIA参照先が存在し、比較・変換結果を読み上げへ通知する', () => {
    const h = harness({ initialize: false });
    for (const element of h.document.querySelectorAll('[aria-controls]')) {
        for (const id of element.getAttribute('aria-controls').split(/\s+/)) assert.ok(h.get(id), id);
    }
    for (const element of h.document.querySelectorAll('[aria-labelledby]')) {
        for (const id of element.getAttribute('aria-labelledby').split(/\s+/)) assert.ok(h.get(id), id);
    }
    for (const trigger of h.document.querySelectorAll('[data-action="open-modal"]')) {
        const dialog = h.get(trigger.dataset.target); assert.ok(dialog); assert.equal(dialog.tagName, 'DIALOG');
    }
    for (const id of ['cmp-status', 'egypt-warning', 'egypt-result-box']) assert.equal(h.get(id)?.getAttribute('aria-live'), 'polite', id);
});

test('ダイアログの内側クリックを閉じず、外側と閉じる操作でフォーカスを戻す', () => {
    const h = harness(); const trigger = h.get('parents-modal-open-btn'); const dialog = h.get('parents-modal');
    trigger.click(); assert.equal(dialog.open, true); assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    dialog.dispatchEvent(new TestEvent('click', { clientX: 200, clientY: 200 })); assert.equal(dialog.open, true);
    dialog.dispatchEvent(new TestEvent('click', { clientX: 20, clientY: 20 })); assert.equal(dialog.open, false);
    assert.equal(trigger.getAttribute('aria-expanded'), 'false'); assert.ok(h.document.activeElement === trigger);
    trigger.click(); dialog.querySelector('[data-action="close-modal"]').click();
    assert.equal(dialog.open, false); assert.ok(h.document.activeElement === trigger);
});

test('クイズは重複描画・二重回答を防ぎ、回答・次問・結果・再挑戦で操作対象へフォーカスする', () => {
    const h = harness({ concept: true });
    assert.ok(h.document.activeElement === h.document.body, '初期表示ではフォーカスを奪わない');
    vm.runInContext(conceptSource, h.context);
    assert.equal(h.document.querySelectorAll('#fraction-number-concept-card').length, 1);
    assert.equal(h.document.querySelectorAll('#fraction-misconception-check').length, 1);
    const area = h.get('fraction-check-question-area');
    const group = area.querySelector('[role="group"]');
    assert.ok(group, '選択肢を設問と関連付ける');
    const question = h.get(group.getAttribute('aria-labelledby'));
    assert.ok(question && area.contains(question) && question.textContent.trim());
    const options = area.querySelectorAll('button'); options[1].click();
    // disabledでもdispatchEventは配信される。他の選択肢で加点し直せないことを確認。
    options[0].dispatchEvent(new TestEvent('click'));
    let next = area.querySelector('[role="status"]').querySelector('button');
    assert.ok(h.document.activeElement === next); assert.equal(area.querySelector('[role="status"]').querySelectorAll('button').length, 1);
    next.click(); assert.ok(h.document.activeElement === area.querySelector('button'));
    area.querySelectorAll('button')[2].click(); next = h.document.activeElement; next.click();
    assert.ok(h.document.activeElement === area.querySelector('button'));
    area.querySelector('button').click(); h.document.activeElement.click();
    const retry = area.querySelector('button'); assert.ok(h.document.activeElement === retry);
    assert.match(area.textContent, /^2 \/ 3/);
    const resultStatus = area.querySelector('[role="status"]');
    assert.ok(resultStatus); assert.equal(resultStatus.getAttribute('aria-live'), 'polite');
    assert.equal(resultStatus.getAttribute('aria-atomic'), 'true'); assert.match(resultStatus.textContent, /^2 \/ 3/);
    retry.click(); assert.ok(h.document.activeElement === area.querySelector('button'));
    assert.equal(area.querySelectorAll('button').length, 3); assert.match(area.textContent, /^QUESTION 1 \/ 3/);
});

test('設定の一項目変更は不正な既知フラグを正規化し、別タブの正常値を残す', () => {
    for (const profile of [null, [], 42, { darkMode: 'false', reduceMotion: 9 }]) {
        const h = harness({ profile });
        h.get('motion-toggle').dispatchEvent(new TestEvent('click'));
        assert.deepEqual(h.profile, { darkMode: true, reduceMotion: true });
    }
    const h = harness();
    h.profile = { darkMode: false, reduceMotion: false, favoriteApps: ['fraction_lab'] };
    h.get('motion-toggle').dispatchEvent(new TestEvent('click'));
    assert.deepEqual(h.profile, { darkMode: false, reduceMotion: true, favoriteApps: ['fraction_lab'] });
});
