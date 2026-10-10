if (typeof document !== 'undefined') {
    if (document.readyState === 'interactive' || document.readyState === 'complete') queueMicrotask(init);
    else document.addEventListener('DOMContentLoaded', init, { once: true });
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
    if (!['whatis', 'visual', 'compare', 'calc', 'sub', 'secret'].includes(id)) return;
    let activeTab = null;
    document.querySelectorAll('.nav-btn').forEach(b => {
        const isActive = b.dataset.tab === id;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        b.setAttribute('tabindex', isActive ? '0' : '-1');
        if (isActive) activeTab = b;
    });
    ['whatis', 'visual', 'compare', 'calc', 'sub', 'secret'].forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) {
            const isActive = v === id;
            el.classList.toggle('hidden', !isActive);
            el.classList.toggle('flex', isActive);
            el.hidden = !isActive;
        }
    });
    if (shouldFocus && activeTab) activeTab.focus();

    const liveStatus = document.getElementById('fraction-live-status');
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
    const svg = document.getElementById(svgId);
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
    const dInput = document.getElementById('vis-denom');
    const nInput = document.getElementById('vis-numer');
    const d = readBoundedInput(dInput, 1, 12, 1);
    nInput.max = d;
    const n = readBoundedInput(nInput, 0, d, 0);

    document.getElementById('vis-denom-val').innerText = d;
    document.getElementById('vis-numer-val').innerText = n;
    document.getElementById('vis-display').innerText = `${n}/${d}`;
    document.getElementById('vis-percent').innerText = Math.round((n / d) * 100) + "%";
    document.getElementById('vis-decimal').innerText = (n / d).toFixed(2);

    drawPizza('vis-pizza-svg', n, d, "#0EA5E9");

    const bar = document.getElementById('vis-bar');
    const marks = document.getElementById('vis-line-marks');
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
    Array.from(bar.children).forEach((part, index) => part.classList.toggle('active', index < n));
    const pct = (n / d) * 100;
    document.getElementById('vis-line-fill').style.width = `${pct}%`;
    document.getElementById('vis-line-dot').style.left = `${pct}%`;
}

// --- 2. Compare Mode ---
function updateCompare() {
    const n1In = document.getElementById('cmp-n1'); const d1In = document.getElementById('cmp-d1');
    const n2In = document.getElementById('cmp-n2'); const d2In = document.getElementById('cmp-d2');

    const d1 = readBoundedInput(d1In, 1, 12, 1); n1In.max = d1;
    const n1 = readBoundedInput(n1In, 0, d1, 0);
    const d2 = readBoundedInput(d2In, 1, 12, 1); n2In.max = d2;
    const n2 = readBoundedInput(n2In, 0, d2, 0);

    drawPizza('cmp-svg-1', n1, d1, '#0EA5E9');
    drawPizza('cmp-svg-2', n2, d2, '#EC4899'); // Pink

    // Bars
    document.getElementById('cmp-bar-1').style.width = `${(n1 / d1) * 100}%`;
    document.getElementById('cmp-bar-2').style.width = `${(n2 / d2) * 100}%`;

    // Display
    document.getElementById('cmp-disp-1').innerText = `${n1}/${d1}`;
    document.getElementById('cmp-disp-2').innerText = `${n2}/${d2}`;

    const v1 = n1 / d1; const v2 = n2 / d2;
    document.getElementById('cmp-val-1').innerText = v1.toFixed(2);
    document.getElementById('cmp-val-2').innerText = v2.toFixed(2);

    const relation = n1 * d2 === n2 * d1 ? '同じ大きさ' : n1 * d2 > n2 * d1 ? '左の分数のほうが大きい' : '右の分数のほうが大きい';
    const status = document.getElementById('cmp-status');
    if (status) status.textContent = `${n1}/${d1} と ${n2}/${d2} は、${relation}です`;
    const icon = document.getElementById('cmp-icon');
    const difference = n1 * d2 - n2 * d1;
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
    const d = readBoundedInput(document.getElementById('calc-denom'), 2, 10, 2);
    const n1In = document.getElementById('calc-n1');
    const n2In = document.getElementById('calc-n2');

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
        document.getElementById('calc-warning'),
        result.exceedsOne
            ? `答えは ${result.numerator}/${d}。これは1より大きい分数だよ。下のピザ図は1枚分（${d}/${d}）までを表示しているので、式の答えそのものとは分けて見てね。`
            : ''
    );

    document.getElementById('calc-d-val').innerText = d;
    document.getElementById('calc-d-common-1').innerText = d;
    document.getElementById('calc-d-common-2').innerText = d;
    document.getElementById('calc-res-text').innerText = `${result.numerator}/${d}`;

    drawPizza('calc-svg-1', n1, d, '#0EA5E9');
    drawPizza('calc-svg-2', n2, d, '#EC4899');

    getPizzaDrawing('calc-svg-res', d).parts.forEach((part, index) => {
        setSvgAttribute(part, 'fill', index < n1 ? '#0EA5E9' : index < result.numerator ? '#EC4899' : '#334155');
    });
}

function updateSub() {
    const d = readBoundedInput(document.getElementById('sub-denom'), 2, 10, 2);
    const n1In = document.getElementById('sub-n1');
    const n2In = document.getElementById('sub-n2');

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
        document.getElementById('sub-warning'),
        result.isNegative
            ? `答えは ${result.numerator}/${d}。0より小さい数は、この1枚のピザ図では表せないよ。式の答えは入力どおりの正しい値を表示しているよ。`
            : ''
    );

    document.getElementById('sub-d-val').innerText = d;
    document.getElementById('sub-d-common-1').innerText = d;
    document.getElementById('sub-d-common-2').innerText = d;
    document.getElementById('sub-res-text').innerText = `${result.numerator}/${d}`;

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
    document.getElementById('egypt-placeholder').style.display = 'block';
    const content = document.getElementById('egypt-content');
    content.classList.add('hidden');
    content.classList.remove('flex');
    document.getElementById('egypt-formula').replaceChildren();
    document.getElementById('egypt-steps').replaceChildren();
    document.getElementById('egypt-warning').classList.add('hidden');
}
function calcEgypt() {
    const nInput = document.getElementById('egypt-n');
    const dInput = document.getElementById('egypt-d');
    const input = validateEgyptianInput(nInput.value, dInput.value);
    resetEgyptResult();
    const warningEl = document.getElementById('egypt-warning');
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
    document.getElementById('egypt-placeholder').style.display = 'none';
    const content = document.getElementById('egypt-content');
    content.classList.remove('hidden');
    content.classList.add('flex');
    const formula = document.getElementById('egypt-formula');
    const first = document.createElement('span');
    first.className = 'text-slate-400 mr-2'; first.textContent = `${n}/${d} = `;
    formula.appendChild(first);
    decomposition.terms.forEach((term, index) => {
        if (index > 0) {
            const plus = document.createElement('span');
            plus.className = 'mx-2 text-slate-500'; plus.textContent = '+'; formula.appendChild(plus);
        }
        const item = document.createElement('span');
        item.className = 'text-amber-400 text-2xl'; item.textContent = term; formula.appendChild(item);
    });
    const steps = document.getElementById('egypt-steps');
    [`スタート: ${n}/${d}`, ...decomposition.remainders.map(value => `${value} が残ったよ`)].forEach((text, index) => {
        if (index > 0) {
            const arrow = document.createElement('span');
            arrow.className = 'text-amber-500'; arrow.textContent = ' → '; steps.appendChild(arrow);
        }
        steps.appendChild(document.createTextNode(text));
    });
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
    // Open modal buttons
    document.querySelectorAll('[data-action="open-modal"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.currentTarget.dataset.target;
            const dialog = document.getElementById(targetId);
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
            const dialog = document.getElementById(targetId);
            if (!dialog) return;

            if (typeof dialog.close === 'function') {
                dialog.close();
            } else {
                dialog.removeAttribute('open');
            }

            // Restore aria-expanded on trigger button
            const triggerBtn = document.querySelector(`[data-target="${targetId}"][data-action="open-modal"]`);
            if (triggerBtn) {
                triggerBtn.setAttribute('aria-expanded', 'false');
                triggerBtn.focus();
            }
        });
    });

    // Close dialog when clicking backdrop
    ['parents-modal', 'settings-modal'].forEach(id => {
        const dialog = document.getElementById(id);
        if (dialog) {
            dialog.addEventListener('click', (e) => {
                const rect = dialog.getBoundingClientRect();
                const outside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
                if (e.target === dialog && outside) {
                    if (typeof dialog.close === 'function') {
                        dialog.close();
                    } else {
                        dialog.removeAttribute('open');
                        const triggerBtn = document.querySelector(`[data-target="${id}"][data-action="open-modal"]`);
                        if (triggerBtn) {
                            triggerBtn.setAttribute('aria-expanded', 'false');
                            triggerBtn.focus();
                        }
                    }
                }
            });
            dialog.addEventListener('close', () => {
                const triggerBtn = document.querySelector(`[data-target="${id}"][data-action="open-modal"]`);
                if (triggerBtn) {
                    triggerBtn.setAttribute('aria-expanded', 'false');
                    triggerBtn.focus();
                }
            });
        }
    });

    // Settings switches toggle logic
    const darkToggle = document.getElementById('dark-mode-toggle');
    if (darkToggle) {
        darkToggle.addEventListener('click', () => {
            userSettings.darkMode = !userSettings.darkMode;
            applySettings();
            saveSettings('darkMode');
            applySettings();
        });
    }

    const motionToggle = document.getElementById('motion-toggle');
    if (motionToggle) {
        motionToggle.addEventListener('click', () => {
            userSettings.reduceMotion = !userSettings.reduceMotion;
            applySettings();
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

