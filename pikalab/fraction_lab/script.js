if (typeof document !== 'undefined') {
    if (document.readyState === 'interactive' || document.readyState === 'complete') queueMicrotask(init);
    else document.addEventListener('DOMContentLoaded', init, { once: true });
}

const TAB_IDS = ['whatis', 'visual', 'compare', 'calc', 'sub', 'secret'];
const TAB_ID_SET = new Set(TAB_IDS);
const elementCacheByDoc = new WeakMap();

function getEl(id) {
    if (typeof document === 'undefined') return null;
    let cache = elementCacheByDoc.get(document);
    if (!cache) {
        cache = new Map();
        elementCacheByDoc.set(document, cache);
    }
    const cached = cache.get(id);
    if (cached && cached.isConnected !== false) return cached;
    const el = document.getElementById(id);
    if (el) cache.set(id, el);
    return el;
}

let initialized = false;
function init() {
    if (initialized) return;
    initialized = true;
    // Load Settings First
    loadSettings();

    // Tab Navigation
    const tabButtons = [...document.querySelectorAll('[role="tab"]')];
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.currentTarget.dataset.tab));
    });
    const tabList = document.querySelector('[role="tablist"]');
    tabList?.addEventListener('keydown', (event) => {
        const currentIndex = tabButtons.indexOf(document.activeElement);
        if (currentIndex < 0) return;

        let nextIndex = currentIndex;
        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabButtons.length;
        if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabButtons.length - 1;
        if (nextIndex === currentIndex && !['Home', 'End'].includes(event.key)) return;

        event.preventDefault();
        switchTab(tabButtons[nextIndex].dataset.tab, true);
    });

    // Visual Mode
    document.getElementById('vis-denom').addEventListener('input', updateVisual);
    document.getElementById('vis-numer').addEventListener('input', updateVisual);

    // Compare Mode
    ['cmp-n1', 'cmp-d1', 'cmp-n2', 'cmp-d2'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateCompare);
    });

    // Calc Mode
    document.getElementById('calc-denom').addEventListener('input', updateCalc);
    document.getElementById('calc-n1').addEventListener('change', updateCalc);
    document.getElementById('calc-n2').addEventListener('change', updateCalc);

    // Sub Mode
    document.getElementById('sub-denom').addEventListener('input', updateSub);
    document.getElementById('sub-n1').addEventListener('change', updateSub);
    document.getElementById('sub-n2').addEventListener('change', updateSub);

    // Egypt Mode
    document.getElementById('btn-calc-egypt').addEventListener('click', calcEgypt);
    ['egypt-n', 'egypt-d'].forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('input', resetEgyptResult);
        input.addEventListener('keydown', event => {
            if (event.key !== 'Enter' || event.isComposing || event.repeat) return;
            event.preventDefault();
            calcEgypt();
        });
    });
    // 図形を描き直しても、イベントを増やさず同じ親要素で受け取る。
    ['vis-pizza-svg', 'vis-bar'].forEach(id => {
        document.getElementById(id).addEventListener('click', event => {
            const part = event.target.closest('[data-fraction-part]');
            if (!part || !event.currentTarget.contains(part)) return;
            document.getElementById('vis-numer').value = part.dataset.fractionPart;
            updateVisual();
        });
    });

    // Slider & Input adjustment buttons
    document.querySelectorAll('.btn-adjust').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.currentTarget.dataset.target;
            const action = e.currentTarget.dataset.action;
            const input = document.getElementById(targetId);
            if (!input) return;

            const min = input.min !== '' ? Number(input.min) : 0;
            const max = input.max !== '' ? Number(input.max) : 100;
            const value = clampInteger(input.value, min, max, min);
            const delta = action === 'inc' ? 1 : action === 'dec' ? -1 : 0;
            input.value = Math.min(max, Math.max(min, value + delta));

            // Dispatch events to trigger corresponding updates
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });

    // Setup Modals and Settings Switch Actions
    setupModals();

    // Navigate from "whatis" to "visual" tab
    document.querySelectorAll('.btn-navigate-visual').forEach(btn => {
        btn.addEventListener('click', () => switchTab('visual', true));
    });

    // Initial Draw
    updateVisual();
    updateCompare();
    updateCalc();
    updateSub();
    switchTab('whatis');
}

function clampInteger(value, min, max, fallback) {
    const parsed = typeof value === 'string' && value.trim() === '' ? NaN : Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function analyzeSameDenominatorOperation(firstNumerator, secondNumerator, denominator, operation) {
    const d = Math.max(1, clampInteger(denominator, 1, 100, 1));
    const n1 = clampInteger(firstNumerator, 0, 100, 0);
    const n2 = clampInteger(secondNumerator, 0, 100, 0);
    const numerator = operation === 'subtract' ? n1 - n2 : n1 + n2;

    return {
        numerator,
        denominator: d,
        isNegative: numerator < 0,
        exceedsOne: numerator > d,
        fitsSingleUnitPicture: numerator >= 0 && numerator <= d
    };
}

function setArithmeticWarning(element, message) {
    if (!element || element.dataset.message === message) return;
    element.dataset.message = message;
    element.replaceChildren();
    if (!message) {
        element.classList.add('hidden');
        return;
    }

    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded text-base text-amber-400';
    icon.textContent = 'info';
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = message;
    element.append(icon, text);
    element.classList.remove('hidden');
}

function getGcdBigInt(a, b) {
    let x = a < 0n ? -a : a;
    let y = b < 0n ? -b : b;
    while (y !== 0n) {
        const temp = x % y;
        x = y;
        y = temp;
    }
    return x || 1n;
}

function decomposeEgyptianFraction(numerator, denominator, maxTerms = 20) {
    const input = validateEgyptianInput(numerator, denominator);
    if (!input.ok) return { ok: false, reason: input.reason, terms: [], remainders: [] };
    let n = BigInt(input.numerator);
    let d = BigInt(input.denominator);
    maxTerms = clampInteger(maxTerms, 0, 20, 20);


    const terms = [];
    const remainders = [];
    while (n > 0n && terms.length < maxTerms) {
        const unitD = (d + n - 1n) / n;
        terms.push(`1/${unitD.toString()}`);

        const newN = n * unitD - d;
        const newD = d * unitD;
        const gcd = getGcdBigInt(newN, newD);
        n = newN / gcd;
        d = newD / gcd;
        if (n > 0n) remainders.push(`${n}/${d}`);
    }

    if (n > 0n) {
        return { ok: false, reason: 'term_limit', terms, remainders };
    }

    return { ok: true, terms, remainders };
}

function switchTab(id, shouldFocus = false) {
    if (!TAB_ID_SET.has(id)) return;
    let activeTab = null;
    document.querySelectorAll('.nav-btn').forEach(b => {
        const isActive = b.dataset.tab === id;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        b.setAttribute('tabindex', isActive ? '0' : '-1');
        if (isActive) activeTab = b;
    });
    for (let i = 0; i < TAB_IDS.length; i++) {
        const v = TAB_IDS[i];
        const el = getEl(`view-${v}`);
        if (el) {
            const isActive = v === id;
            el.classList.toggle('hidden', !isActive);
            el.classList.toggle('flex', isActive);
            el.hidden = !isActive;
        }
    }
    if (shouldFocus && activeTab) activeTab.focus();

    const liveStatus = getEl('fraction-live-status');
    if (liveStatus && activeTab) {
        liveStatus.textContent = `${activeTab.textContent.trim()}を表示しました`;
    }
    if (id === 'visual') updateVisual();
    if (id === 'compare') updateCompare(); // Ensure resize
}

// 分母ごとの図形はそのSVG内で再利用し、分子変更では色だけを更新する。
const pizzaDrawings = new WeakMap();
function setSvgAttribute(node, name, value) {
    if (node.getAttribute(name) !== String(value)) node.setAttribute(name, value);
}
function getPizzaDrawing(svgId, denominator) {
    const svg = getEl(svgId);
    const d = clampInteger(denominator, 1, 12, 1);
    const cached = pizzaDrawings.get(svg);
    if (cached && cached.denominator === d) return cached;
    const ns = 'http://www.w3.org/2000/svg';
    const fragment = document.createDocumentFragment();
    const background = document.createElementNS(ns, 'circle');
    for (const [name, value] of Object.entries({ cx: 0, cy: 0, r: 1, fill: '#1E293B' })) background.setAttribute(name, value);
    fragment.appendChild(background);
    const parts = [];
    for (let i = 0; i < d; i++) {
        const part = document.createElementNS(ns, d === 1 ? 'circle' : 'path');
        if (d === 1) {
            for (const [name, value] of Object.entries({ cx: 0, cy: 0, r: 1 })) part.setAttribute(name, value);
        } else {
            const start = ((i * 360 / d) - 90) * Math.PI / 180;
            const end = (((i + 1) * 360 / d) - 90) * Math.PI / 180;
            part.setAttribute('d', `M 0 0 L ${Math.cos(start)} ${Math.sin(start)} A 1 1 0 0 1 ${Math.cos(end)} ${Math.sin(end)} Z`);
            part.setAttribute('stroke', '#0F172A');
            part.setAttribute('stroke-width', '0.02');
        }
        if (svgId === 'vis-pizza-svg') part.dataset.fractionPart = String(i + 1);
        fragment.appendChild(part);
        parts.push(part);
    }
    svg.replaceChildren(fragment);
    const drawing = { denominator: d, parts };
    pizzaDrawings.set(svg, drawing);
    return drawing;
}
function drawPizza(svgId, n, d, color = '#0EA5E9') {
    const drawing = getPizzaDrawing(svgId, d);
    drawing.parts.forEach((part, index) => {
        const active = index < n;
        setSvgAttribute(part, 'fill', active ? color : drawing.denominator === 1 ? '#1E293B' : '#334155');
        if (drawing.denominator > 1) setSvgAttribute(part, 'class', active ? 'pizza-slice active' : 'pizza-slice inactive');
    });
}
function readBoundedInput(input, min, max, fallback) {
    const value = clampInteger(input.value, min, max, fallback);
    input.value = value;
    return value;
}

// --- 1. Visual Mode ---
function updateVisual() {
    const dInput = getEl('vis-denom');
    const nInput = getEl('vis-numer');
    const d = readBoundedInput(dInput, 1, 12, 1);
    nInput.max = d;
    const n = readBoundedInput(nInput, 0, d, 0);

    const ratio = n / d;
    const pct = ratio * 100;
    getEl('vis-denom-val').innerText = d;
    getEl('vis-numer-val').innerText = n;
    getEl('vis-display').innerText = `${n}/${d}`;
    getEl('vis-percent').innerText = `${Math.round(pct)}%`;
    getEl('vis-decimal').innerText = ratio.toFixed(2);

    drawPizza('vis-pizza-svg', n, d, "#0EA5E9");

    const bar = getEl('vis-bar');
    const marks = getEl('vis-line-marks');
    // 分子だけのスライダー操作ではバー・目盛り・クリックリスナーを作り直さない。
    if (bar.childElementCount !== d) {
        const segments = document.createDocumentFragment();
        for (let i = 0; i < d; i++) {
            const segment = document.createElement('div');
            segment.className = 'bar-segment';
            segment.dataset.fractionPart = String(i + 1);
            segments.appendChild(segment);
        }
        bar.replaceChildren(segments);
        const labels = document.createDocumentFragment();
        for (const value of [0, 1]) {
            const label = document.createElement('div');
            label.className = 'nl-label'; label.style.left = `${value * 100}%`; label.innerText = value;
            labels.appendChild(label);
        }
        for (let i = 1; i < d; i++) {
            const mark = document.createElement('div');
            mark.className = 'nl-marker'; mark.style.left = `${(i / d) * 100}%`;
            labels.appendChild(mark);
        }
        marks.replaceChildren(labels);
    }
    const barChildren = bar.children;
    for (let index = 0; index < barChildren.length; index++) {
        barChildren[index].classList.toggle('active', index < n);
    }
    getEl('vis-line-fill').style.width = `${pct}%`;
    getEl('vis-line-dot').style.left = `${pct}%`;
}

// --- 2. Compare Mode ---
function updateCompare() {
    const n1In = getEl('cmp-n1'); const d1In = getEl('cmp-d1');
    const n2In = getEl('cmp-n2'); const d2In = getEl('cmp-d2');

    const d1 = readBoundedInput(d1In, 1, 12, 1); n1In.max = d1;
    const n1 = readBoundedInput(n1In, 0, d1, 0);
    const d2 = readBoundedInput(d2In, 1, 12, 1); n2In.max = d2;
    const n2 = readBoundedInput(n2In, 0, d2, 0);

    drawPizza('cmp-svg-1', n1, d1, '#0EA5E9');
    drawPizza('cmp-svg-2', n2, d2, '#EC4899'); // Pink

    const v1 = n1 / d1; const v2 = n2 / d2;
    // Bars
    getEl('cmp-bar-1').style.width = `${v1 * 100}%`;
    getEl('cmp-bar-2').style.width = `${v2 * 100}%`;

    // Display
    getEl('cmp-disp-1').innerText = `${n1}/${d1}`;
    getEl('cmp-disp-2').innerText = `${n2}/${d2}`;
    getEl('cmp-val-1').innerText = v1.toFixed(2);
    getEl('cmp-val-2').innerText = v2.toFixed(2);

    const difference = n1 * d2 - n2 * d1;
    const relation = difference === 0 ? '同じ大きさ' : difference > 0 ? '左の分数のほうが大きい' : '右の分数のほうが大きい';
    const status = getEl('cmp-status');
    if (status) status.textContent = `${n1}/${d1} と ${n2}/${d2} は、${relation}です`;
    const icon = getEl('cmp-icon');
    if (difference === 0) {
        icon.innerText = 'equal'; icon.className = "material-symbols-rounded text-6xl text-green-400";
    } else if (difference > 0) {
        icon.innerText = 'chevron_right'; icon.className = "material-symbols-rounded text-6xl text-sky-400";
    } else {
        icon.innerText = 'chevron_left'; icon.className = "material-symbols-rounded text-6xl text-pink-400";
    }
}

// --- 3 & 4. Calc & Sub Mode Helper ---
function updateCalc() {
    const d = readBoundedInput(getEl('calc-denom'), 2, 10, 2);
    const n1In = getEl('calc-n1');
    const n2In = getEl('calc-n2');

    n1In.min = 1;
    n2In.min = 1;
    n1In.max = d - 1;
    n2In.max = d - 1;
    const n1 = clampInteger(n1In.value, 1, d - 1, 1);
    const n2 = clampInteger(n2In.value, 1, d - 1, 1);
    n1In.value = n1;
    n2In.value = n2;

    const result = analyzeSameDenominatorOperation(n1, n2, d, 'add');
    setArithmeticWarning(
        getEl('calc-warning'),
        result.exceedsOne
            ? `答えは ${result.numerator}/${d}。これは1より大きい分数だよ。下のピザ図は1枚分（${d}/${d}）までを表示しているので、式の答えそのものとは分けて見てね。`
            : ''
    );

    getEl('calc-d-val').innerText = d;
    getEl('calc-d-common-1').innerText = d;
    getEl('calc-d-common-2').innerText = d;
    getEl('calc-res-text').innerText = `${result.numerator}/${d}`;

    drawPizza('calc-svg-1', n1, d, '#0EA5E9');
    drawPizza('calc-svg-2', n2, d, '#EC4899');

    getPizzaDrawing('calc-svg-res', d).parts.forEach((part, index) => {
        setSvgAttribute(part, 'fill', index < n1 ? '#0EA5E9' : index < result.numerator ? '#EC4899' : '#334155');
    });
}

function updateSub() {
    const d = readBoundedInput(getEl('sub-denom'), 2, 10, 2);
    const n1In = getEl('sub-n1');
    const n2In = getEl('sub-n2');

    n1In.min = 1;
    n2In.min = 0;
    n1In.max = d;
    n2In.max = d;
    const n1 = clampInteger(n1In.value, 1, d, 1);
    const n2 = clampInteger(n2In.value, 0, d, 0);
    n1In.value = n1;
    n2In.value = n2;

    const result = analyzeSameDenominatorOperation(n1, n2, d, 'subtract');
    setArithmeticWarning(
        getEl('sub-warning'),
        result.isNegative
            ? `答えは ${result.numerator}/${d}。0より小さい数は、この1枚のピザ図では表せないよ。式の答えは入力どおりの正しい値を表示しているよ。`
            : ''
    );

    getEl('sub-d-val').innerText = d;
    getEl('sub-d-common-1').innerText = d;
    getEl('sub-d-common-2').innerText = d;
    getEl('sub-res-text').innerText = `${result.numerator}/${d}`;

    drawPizza('sub-svg-1', n1, d, '#0EA5E9');
    drawPizza('sub-svg-2', n2, d, '#EC4899');

    getPizzaDrawing('sub-svg-res', d).parts.forEach((part, index) => {
        setSvgAttribute(part, 'fill', index < result.numerator ? '#0EA5E9' : index < n1 ? '#EC4899' : '#334155');
        setSvgAttribute(part, 'fill-opacity', index >= result.numerator && index < n1 ? 0.3 : 1);
    });
}

// --- 5. Egypt Mode ---
function validateEgyptianInput(numerator, denominator) {
    const n = typeof numerator === 'string' && numerator.trim() === '' ? NaN : Number(numerator);
    const d = typeof denominator === 'string' && denominator.trim() === '' ? NaN : Number(denominator);
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || n < 1 || n > 99 || d < 2 || d > 100) {
        return { ok: false, reason: 'input_range' };
    }
    return n < d ? { ok: true, numerator: n, denominator: d } : { ok: false, reason: 'improper_fraction' };
}
function resetEgyptResult() {
    getEl('egypt-placeholder').style.display = 'block';
    const content = getEl('egypt-content');
    content.classList.add('hidden');
    content.classList.remove('flex');
    getEl('egypt-formula').replaceChildren();
    getEl('egypt-steps').replaceChildren();
    getEl('egypt-warning').classList.add('hidden');
}
function calcEgypt() {
    const nInput = getEl('egypt-n');
    const dInput = getEl('egypt-d');
    const input = validateEgyptianInput(nInput.value, dInput.value);
    resetEgyptResult();
    const warningEl = getEl('egypt-warning');
    if (!input.ok) {
        // 入力を別の分数へ勝手に置き換えず、元の値を直せるように残す。
        warningEl.textContent = input.reason === 'input_range'
            ? 'エラー：分子は1〜99、分母は2〜100の整数を入力してね！'
            : 'エラー：真分数（分子が分母より小さい分数）を入力してね！ この変換機では1より小さい正の分数を、異なる単位分数の足し算に分けるよ。分子を分母より小さくして、もう一度「分解する！」ボタンを押してみてね！';
        warningEl.classList.remove('hidden');
        return;
    }
    const { numerator: n, denominator: d } = input;
    const decomposition = decomposeEgyptianFraction(n, d);
    if (!decomposition.ok) {
        warningEl.textContent = '分解を完了できませんでした。入力を確かめて、もう一度ためしてね。';
        warningEl.classList.remove('hidden');
        return;
    }
    getEl('egypt-placeholder').style.display = 'none';
    const content = getEl('egypt-content');
    content.classList.remove('hidden');
    content.classList.add('flex');
    const formula = getEl('egypt-formula');
    const formulaFrag = typeof document.createDocumentFragment === 'function' ? document.createDocumentFragment() : formula;
    const first = document.createElement('span');
    first.className = 'text-slate-400 mr-2'; first.textContent = `${n}/${d} = `;
    formulaFrag.appendChild(first);
    decomposition.terms.forEach((term, index) => {
        if (index > 0) {
            const plus = document.createElement('span');
            plus.className = 'mx-2 text-slate-500'; plus.textContent = '+'; formulaFrag.appendChild(plus);
        }
        const item = document.createElement('span');
        item.className = 'text-amber-400 text-2xl'; item.textContent = term; formulaFrag.appendChild(item);
    });
    if (formulaFrag !== formula) formula.appendChild(formulaFrag);

    const steps = getEl('egypt-steps');
    const stepsFrag = typeof document.createDocumentFragment === 'function' ? document.createDocumentFragment() : steps;
    [`スタート: ${n}/${d}`, ...decomposition.remainders.map(value => `${value} が残ったよ`)].forEach((text, index) => {
        if (index > 0) {
            const arrow = document.createElement('span');
            arrow.className = 'text-amber-500'; arrow.textContent = ' → '; stepsFrag.appendChild(arrow);
        }
        stepsFrag.appendChild(document.createTextNode(text));
    });
    if (stepsFrag !== steps) steps.appendChild(stepsFrag);
}

// --- Settings & Modal Logic ---
let userSettings = {
    darkMode: true, // Default to true (Fraction lab default style)
    reduceMotion: false
};

function readPortalProfile(requireReadableStorage = false) {
    let stored;
    try {
        stored = localStorage.getItem('wonder_school_profile_v2');
    } catch (error) {
        // 最新プロフィールを読めない場合は、不明な値を空データで上書きしない。
        if (requireReadableStorage) throw error;
        console.error('Failed to load settings:', error);
        return {};
    }
    try {
        const data = stored ? JSON.parse(stored) : null;
        return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch (error) {
        console.error('Failed to parse settings:', error);
        return {};
    }
}

function loadSettings() {
    const data = readPortalProfile();
    if (typeof data.darkMode === 'boolean') userSettings.darkMode = data.darkMode;
    if (typeof data.reduceMotion === 'boolean') userSettings.reduceMotion = data.reduceMotion;
    applySettings();
}

function saveSettings(changedKey) {
    try {
        // 共有プロフィールの、他のコンテンツが管理する値を保持する。
        const profile = { ...readPortalProfile(true) };
        for (const key of ['darkMode', 'reduceMotion']) {
            if (typeof profile[key] !== 'boolean') profile[key] = userSettings[key];
        }
        Object.assign(profile, changedKey ? { [changedKey]: userSettings[changedKey] } : userSettings);
        for (const key of ['darkMode', 'reduceMotion']) {
            if (typeof profile[key] === 'boolean') userSettings[key] = profile[key];
        }
        localStorage.setItem('wonder_school_profile_v2', JSON.stringify(profile));
    } catch (e) {
        console.error('Failed to save settings:', e);
    }
}

function applySettings() {
    // Apply Dark/Light mode
    // If darkMode is false, add theme-light class. Else, remove it.
    if (userSettings.darkMode === false) {
        document.body.classList.add('theme-light');
    } else {
        document.body.classList.remove('theme-light');
    }

    // Apply Reduce Motion
    if (userSettings.reduceMotion) {
        document.body.classList.add('reduced-motion');
    } else {
        document.body.classList.remove('reduced-motion');
    }

    // Sync toggle UI elements if they exist
    const darkToggle = document.getElementById('dark-mode-toggle');
    const motionToggle = document.getElementById('motion-toggle');

    if (darkToggle) {
        darkToggle.setAttribute('aria-pressed', userSettings.darkMode ? 'true' : 'false');
    }
    if (motionToggle) {
        motionToggle.setAttribute('aria-pressed', userSettings.reduceMotion ? 'true' : 'false');
    }
}

function setupModals() {
    const triggerByTarget = new Map();
    const restoreModalTrigger = (targetId) => {
        const triggerBtn = triggerByTarget.get(targetId)
            || document.querySelector(`[data-target="${targetId}"][data-action="open-modal"]`);
        if (triggerBtn) {
            triggerBtn.setAttribute('aria-expanded', 'false');
            triggerBtn.focus();
        }
    };

    // Open modal buttons
    document.querySelectorAll('[data-action="open-modal"]').forEach(btn => {
        const targetId = btn.dataset.target;
        if (targetId && !triggerByTarget.has(targetId)) {
            triggerByTarget.set(targetId, btn);
        }
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.target;
            const dialog = getEl(id);
            if (!dialog || dialog.open) return;

            if (typeof dialog.showModal === 'function') {
                dialog.showModal();
            } else {
                dialog.setAttribute('open', '');
            }
            e.currentTarget.setAttribute('aria-expanded', 'true');
        });
    });

    // Close modal buttons
    document.querySelectorAll('[data-action="close-modal"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.currentTarget.dataset.target;
            const dialog = getEl(targetId);
            if (!dialog) return;

            if (typeof dialog.close === 'function') {
                dialog.close();
            } else {
                dialog.removeAttribute('open');
            }

            // Restore aria-expanded on trigger button
            restoreModalTrigger(targetId);
        });
    });

    // Close dialog when clicking backdrop
    ['parents-modal', 'settings-modal'].forEach(id => {
        const dialog = getEl(id);
        if (dialog) {
            dialog.addEventListener('click', (e) => {
                const rect = dialog.getBoundingClientRect();
                const outside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
                if (e.target === dialog && outside) {
                    if (typeof dialog.close === 'function') {
                        dialog.close();
                    } else {
                        dialog.removeAttribute('open');
                        restoreModalTrigger(id);
                    }
                }
            });
            dialog.addEventListener('close', () => {
                restoreModalTrigger(id);
            });
        }
    });

    // Settings switches toggle logic
    const darkToggle = getEl('dark-mode-toggle');
    if (darkToggle) {
        darkToggle.addEventListener('click', () => {
            userSettings.darkMode = !userSettings.darkMode;
            saveSettings('darkMode');
            applySettings();
        });
    }

    const motionToggle = getEl('motion-toggle');
    if (motionToggle) {
        motionToggle.addEventListener('click', () => {
            userSettings.reduceMotion = !userSettings.reduceMotion;
            saveSettings('reduceMotion');
            applySettings();
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        clampInteger,
        analyzeSameDenominatorOperation,
        decomposeEgyptianFraction,
        validateEgyptianInput
    };
}

