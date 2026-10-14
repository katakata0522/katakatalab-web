import { ATOMS, BALANCE_STAGES } from './data.js';
import { state } from './state.js';
import { playSound } from './audio.js';
import { calculateSideAtomTotals, gcd } from './chemistry.js';
import { updateStampBadge } from './book.js';

export function loadBalanceStage(index) {
    state.currentStageIndex = index;
    const stage = BALANCE_STAGES[index];
    state.reactantCoeffs = stage.reactants.map(() => 1);
    state.productCoeffs = stage.products.map(() => 1);
    document.getElementById('balanceFeedbackBox').classList.add('hidden');
    renderBalanceStageUI();
}

function renderMoleculePackHTML(atomsObj) {
    const spheres = [];
    Object.entries(atomsObj).forEach(([sym, count]) => {
        const atom = ATOMS[sym];
        for (let i = 0; i < count; i++) {
            spheres.push(
                `<span class="atom-sphere w-6 h-6 text-[10px]" style="background-color: ${atom.color}; color: ${atom.text};">${atom.symbol}</span>`
            );
        }
    });
    return `<div class="inline-flex items-center gap-0.5 px-2 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 shadow-sm animate-pop">${spheres.join('')}</div>`;
}

export function renderBalanceStageUI() {
    const stage = BALANCE_STAGES[state.currentStageIndex];

    const selector = document.getElementById('balanceStageSelector');
    selector.innerHTML = BALANCE_STAGES.map((s, idx) => {
        const isCurrent = idx === state.currentStageIndex;
        const isCleared = state.clearedStages.has(s.id);
        const cls = isCurrent
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

        return `<button type="button" data-action="select-stage" data-stage-index="${idx}" class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1 border cursor-pointer ${cls}">
            <span>${isCleared ? '🏅' : '⚖️'}</span>
            <span>${s.shortName}</span>
        </button>`;
    }).join('');

    document.getElementById('balanceStageTitle').textContent = stage.title;
    document.getElementById('balanceStageDesc').textContent = stage.desc;

    const formatTerm = (item, coeff, colorClass) => {
        const showNum = coeff > 1 || state.showCoeffOne;
        const coeffBadge = showNum
            ? `<span class="px-2 py-0.5 rounded-lg ${colorClass} text-amber-300 font-black mr-0.5">${coeff}</span>`
            : '';
        return `<span class="inline-flex items-center">${coeffBadge}<span>${item.formula}</span></span>`;
    };

    const leftEq = stage.reactants.map((r, i) => formatTerm(r, state.reactantCoeffs[i], 'bg-sky-500/30 border border-sky-400/40')).join(' <span class="text-slate-500">＋</span> ');
    const rightEq = stage.products.map((p, i) => formatTerm(p, state.productCoeffs[i], 'bg-emerald-500/30 border border-emerald-400/40')).join(' <span class="text-slate-500">＋</span> ');
    document.getElementById('liveEquationDisplay').innerHTML = `${leftEq} <span class="text-indigo-400 mx-1">→</span> ${rightEq}`;

    const renderControlCards = (items, coeffs, side) => {
        return items.map((item, idx) => {
            const c = coeffs[idx];
            const packs = Array.from({ length: c }, () => renderMoleculePackHTML(item.atoms)).join('');
            return `<div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2">
                <div class="flex items-center justify-between gap-2">
                    <div>
                        <span class="font-mono font-extrabold text-base text-slate-900 dark:text-white">${item.formula}</span>
                        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">${item.name}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <button type="button" data-action="change-coeff" data-side="${side}" data-index="${idx}" data-delta="-1" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-extrabold text-base flex items-center justify-center transition cursor-pointer" aria-label="${item.name}を減らす">−</button>
                        <span class="w-8 text-center font-mono font-extrabold text-base text-indigo-600 dark:text-indigo-400">×${c}</span>
                        <button type="button" data-action="change-coeff" data-side="${side}" data-index="${idx}" data-delta="1" class="w-8 h-8 rounded-xl bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/70 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-200 font-extrabold text-base flex items-center justify-center transition cursor-pointer" aria-label="${item.name}を増やす">＋</button>
                    </div>
                </div>
                <div class="flex flex-wrap gap-1.5">${packs}</div>
            </div>`;
        }).join('');
    };

    document.getElementById('reactantsControlList').innerHTML = renderControlCards(stage.reactants, state.reactantCoeffs, 'left');
    document.getElementById('productsControlList').innerHTML = renderControlCards(stage.products, state.productCoeffs, 'right');

    const leftTotals = calculateSideAtomTotals(stage.reactants, state.reactantCoeffs);
    const rightTotals = calculateSideAtomTotals(stage.products, state.productCoeffs);

    const sumLeft = Object.values(leftTotals).reduce((a, b) => a + b, 0);
    const sumRight = Object.values(rightTotals).reduce((a, b) => a + b, 0);
    document.getElementById('leftTotalAtomsBadge').textContent = `計 ${sumLeft}粒`;
    document.getElementById('rightTotalAtomsBadge').textContent = `計 ${sumRight}粒`;

    const allElements = Array.from(new Set([...Object.keys(leftTotals), ...Object.keys(rightTotals)]));
    let allMatched = true;

    const compGrid = document.getElementById('elementComparisonGrid');
    compGrid.innerHTML = allElements.map(sym => {
        const lCount = leftTotals[sym] || 0;
        const rCount = rightTotals[sym] || 0;
        const isEqual = lCount === rCount;
        if (!isEqual) allMatched = false;
        const atom = ATOMS[sym];
        const cls = isEqual
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
            : 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-800';

        return `<div class="px-3 py-2 rounded-xl border flex items-center justify-between ${cls}">
            <div class="flex items-center gap-1.5">
                <span class="atom-sphere w-6 h-6 text-[11px]" style="background-color: ${atom.color}; color: ${atom.text};">${atom.symbol}</span>
                <span class="font-extrabold text-xs">${atom.name}</span>
            </div>
            <div class="font-mono font-extrabold text-xs flex items-center gap-1">
                <span class="text-sky-700 dark:text-sky-300">左${lCount}</span>
                <span>${isEqual ? '＝' : '≠'}</span>
                <span class="text-emerald-700 dark:text-emerald-300">右${rCount}</span>
                <span>${isEqual ? '✅' : '⚠️'}</span>
            </div>
        </div>`;
    }).join('');

    const beam = document.getElementById('seesawBeam');
    const tiltCaption = document.getElementById('seesawTiltCaption');
    const statusBadge = document.getElementById('equationStatusBadge');
    const reactBtn = document.getElementById('triggerReactionBtn');
    const reactBtnLabel = document.getElementById('triggerReactionBtnLabel');

    if (allMatched) {
        beam.style.transform = 'rotate(0deg)';
        tiltCaption.textContent = '✨ すべての原子の数がピタッとそろったよ！';
        tiltCaption.className = 'text-xs font-extrabold text-emerald-600 dark:text-emerald-400';
        statusBadge.textContent = '✨ つり合いOK！';
        statusBadge.className = 'shrink-0 text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40';
        reactBtn.classList.add('pulse-ready');
        reactBtnLabel.textContent = '✨ つり合いOK！化学反応を起こす！';
    } else {
        const diff = Math.max(-10, Math.min(10, (sumRight - sumLeft) * 2.2));
        beam.style.transform = `rotate(${diff === 0 ? 3 : diff}deg)`;
        tiltCaption.textContent = sumLeft > sumRight
            ? '⬅️ 左（反応まえ）の粒が多いよ'
            : sumRight > sumLeft
                ? '➡️ 右（反応あと）の粒が多いよ'
                : '⚠️ 種類ごとの数がまだ違うよ';
        tiltCaption.className = 'text-xs font-bold text-amber-600 dark:text-amber-400';
        statusBadge.textContent = '⚖️ 数をそろえよう';
        statusBadge.className = 'shrink-0 text-xs font-extrabold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30';
        reactBtn.classList.remove('pulse-ready');
        reactBtnLabel.textContent = 'この数で反応させる！';
    }
}

export function verifyBalanceAndReact() {
    const stage = BALANCE_STAGES[state.currentStageIndex];
    const leftTotals = calculateSideAtomTotals(stage.reactants, state.reactantCoeffs);
    const rightTotals = calculateSideAtomTotals(stage.products, state.productCoeffs);
    const allElements = Array.from(new Set([...Object.keys(leftTotals), ...Object.keys(rightTotals)]));
    const allMatched = allElements.every(sym => leftTotals[sym] === rightTotals[sym]);

    const box = document.getElementById('balanceFeedbackBox');

    if (!allMatched) {
        playSound('hint');
        const mismatched = allElements.filter(sym => leftTotals[sym] !== rightTotals[sym]).map(sym => ATOMS[sym].name);
        box.className = 'rounded-2xl p-4 border text-xs sm:text-sm font-bold leading-relaxed bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800 animate-pop';
        box.innerHTML = `⚠️ まだ <strong>${mismatched.join('・')}</strong> の数が左右でそろっていないよ。「＋」「−」でパックの数を変えてみよう！`;
        return;
    }

    const allCoeffs = [...state.reactantCoeffs, ...state.productCoeffs];
    const commonDivisor = allCoeffs.reduce((acc, val) => gcd(acc, val));

    if (commonDivisor > 1) {
        playSound('hint');
        box.className = 'rounded-2xl p-4 border text-xs sm:text-sm font-bold leading-relaxed bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800 animate-pop';
        box.innerHTML = `💡 <strong>左右の数は同じになったね！</strong> でも化学反応式では「もっとも簡単な整数の比」にするルールがあるから、全部のパック数を <strong>${commonDivisor}で割って</strong> みよう！`;
        return;
    }

    playSound('success');
    state.clearedStages.add(stage.id);
    updateStampBadge();
    renderBalanceStageUI();

    const nextIndex = (state.currentStageIndex + 1) % BALANCE_STAGES.length;
    box.className = 'rounded-2xl p-4 border text-xs sm:text-sm font-bold leading-relaxed bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800 animate-pop';
    box.innerHTML = `<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
            <div class="text-sm sm:text-base font-extrabold mb-0.5">🎉 大正解！化学反応がピタッと成立したよ！</div>
            <p class="text-xs sm:text-sm">${stage.trivia}</p>
        </div>
        <button type="button" data-action="select-stage" data-stage-index="${nextIndex}" class="shrink-0 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm transition cursor-pointer">
            つぎのステージへ ➔
        </button>
    </div>`;
}
