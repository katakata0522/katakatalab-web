import { ATOMS, PALETTE_ATOM_KEYS, MOLECULE_RECIPES } from './data.js';
import { state } from './state.js';
import { playSound } from './audio.js';
import { getCompositionCounts, isCompositionMatch } from './chemistry.js';
import { getMoleculeSvg } from './molecule-svg.js';
import { updateStampBadge } from './book.js';

export function renderCraftMissionsAndPalette() {
    const currentRecipe = MOLECULE_RECIPES.find(r => r.id === state.selectedRecipeId) || MOLECULE_RECIPES[0];
    const btnContainer = document.getElementById('craftMissionButtons');

    btnContainer.innerHTML = MOLECULE_RECIPES.map(recipe => {
        const isSelected = recipe.id === currentRecipe.id;
        const isDone = state.discoveredMolecules.has(recipe.id);
        const cls = isSelected
            ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700';

        return `<button type="button" data-action="select-mission" data-recipe-id="${recipe.id}" class="px-3 py-2 rounded-2xl text-xs font-extrabold transition flex items-center justify-between gap-1.5 border cursor-pointer ${cls}">
            <span class="truncate">${isDone ? '🏅' : '🔹'} ${recipe.name}</span>
            <span class="font-mono opacity-85">${recipe.formula}</span>
        </button>`;
    }).join('');

    document.getElementById('craftMissionStatus').textContent = `発見済み：${state.discoveredMolecules.size} / 8種`;
    document.getElementById('craftTargetDesc').textContent = currentRecipe.hint;

    /* パレット描画：今のお題で使う原子には★バッジを表示して認知負荷を下げる */
    const paletteGrid = document.getElementById('atomPaletteGrid');
    paletteGrid.innerHTML = PALETTE_ATOM_KEYS.map(key => {
        const atom = ATOMS[key];
        const isNeeded = Boolean(currentRecipe.composition[key]);
        const borderCls = isNeeded
            ? 'border-sky-400 dark:border-sky-500 bg-sky-50/50 dark:bg-sky-950/30'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60';

        return `<button type="button" data-action="add-atom" data-atom="${key}" class="group relative p-2.5 rounded-2xl border hover:border-sky-500 flex items-center gap-2.5 transition active:scale-95 text-left cursor-pointer ${borderCls}">
            <span class="atom-sphere w-10 h-10 text-sm shrink-0 group-hover:scale-105" style="background-color: ${atom.color}; color: ${atom.text};">
                ${atom.symbol}
            </span>
            <div class="min-w-0 flex-1">
                <div class="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">${atom.name}</div>
                <div class="text-[11px] font-bold text-slate-400">＋ 追加</div>
            </div>
            ${isNeeded ? '<span class="text-[11px] font-extrabold text-sky-600 dark:text-sky-400">★</span>' : ''}
        </button>`;
    }).join('');
}

export function renderCraftChamber() {
    const currentRecipe = MOLECULE_RECIPES.find(r => r.id === state.selectedRecipeId) || MOLECULE_RECIPES[0];
    const currentCounts = getCompositionCounts(state.chamberAtoms);

    /* 目標レシピのチェックリスト表示（あといくつ必要か一目でわかる） */
    const checklistEl = document.getElementById('recipeChecklist');
    const reqBadges = Object.entries(currentRecipe.composition).map(([sym, reqCount]) => {
        const cur = currentCounts[sym] || 0;
        const ok = cur === reqCount;
        const atom = ATOMS[sym];
        const cls = ok
            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700'
            : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-extrabold ${cls}">
            <span class="w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center text-white font-bold" style="background:${atom.color}">${sym}</span>
            <span>${atom.name} ${cur}/${reqCount}個 ${ok ? '✅' : ''}</span>
        </span>`;
    });

    /* 目標以外の余分な原子が入っている場合の通知バッジ */
    Object.keys(currentCounts).forEach(sym => {
        if (!currentRecipe.composition[sym]) {
            reqBadges.push(`<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 text-xs font-extrabold">
                ⚠️ ${ATOMS[sym].name}(${sym})は使わないよ
            </span>`);
        }
    });
    checklistEl.innerHTML = reqBadges.join('');

    const container = document.getElementById('chamberAtomsContainer');
    const emptyPrompt = document.getElementById('chamberEmptyPrompt');
    const synthBtn = document.getElementById('synthesizeBtn');
    const synthBtnLabel = document.getElementById('synthesizeBtnLabel');

    if (state.chamberAtoms.length === 0) {
        container.innerHTML = '';
        emptyPrompt.classList.remove('hidden');
    } else {
        emptyPrompt.classList.add('hidden');
        container.innerHTML = state.chamberAtoms.map((sym, idx) => {
            const atom = ATOMS[sym];
            return `<button type="button" data-action="remove-atom" data-index="${idx}" title="タップして取り出す" class="animate-float group relative flex flex-col items-center p-1 cursor-pointer">
                <span class="atom-sphere w-14 h-14 text-base sm:text-lg" style="background-color: ${atom.color}; color: ${atom.text};">
                    ${atom.symbol}
                </span>
                <span class="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-1">${atom.name}</span>
                <span class="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">×</span>
            </button>`;
        }).join('');
    }

    /* レシピ通りに粒が揃ったらボタンを強調してアフォーダンスを高める */
    const matchedRecipe = MOLECULE_RECIPES.find(r => isCompositionMatch(currentCounts, r.composition));
    if (matchedRecipe) {
        synthBtn.classList.add('pulse-ready');
        synthBtnLabel.textContent = `✨ 準備OK！「${matchedRecipe.name}（${matchedRecipe.formula}）」に合成する！`;
    } else {
        synthBtn.classList.remove('pulse-ready');
        synthBtnLabel.textContent = '分子を合成する';
    }
}

export function hideSynthesizedView() {
    const resView = document.getElementById('synthesizedResultView');
    resView.classList.add('hidden');
    resView.classList.remove('flex');
    document.getElementById('chamberAtomsContainer').classList.remove('hidden');
    document.getElementById('craftFeedbackBar').classList.add('hidden');
}

export function showCraftFeedback(colorType, message) {
    const bar = document.getElementById('craftFeedbackBar');
    const textEl = document.getElementById('craftFeedbackText');
    bar.className = 'rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 border ';
    if (colorType === 'emerald') {
        bar.className += 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800';
    } else {
        bar.className += 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800';
    }
    textEl.textContent = message;
}

export function synthesizeMolecule() {
    if (state.chamberAtoms.length === 0) {
        showCraftFeedback('amber', '💡 左のパレットから★マークのついた原子をタップして入れてみよう！');
        playSound('hint');
        return;
    }

    const currentCounts = getCompositionCounts(state.chamberAtoms);
    const matched = MOLECULE_RECIPES.find(r => isCompositionMatch(currentCounts, r.composition));

    if (matched) {
        playSound('success');
        const isFirst = !state.discoveredMolecules.has(matched.id);
        state.discoveredMolecules.add(matched.id);
        state.selectedRecipeId = matched.id;

        document.getElementById('chamberAtomsContainer').classList.add('hidden');
        const resultView = document.getElementById('synthesizedResultView');
        resultView.classList.remove('hidden');
        resultView.classList.add('flex');

        document.getElementById('moleculeSvgHolder').innerHTML = getMoleculeSvg(matched.svgType);
        document.getElementById('synthResultCategory').textContent = matched.category;
        document.getElementById('synthResultName').textContent = `${matched.name}（${matched.formula}）`;
        document.getElementById('synthResultExplain').textContent = matched.explain;

        showCraftFeedback(
            'emerald',
            isFirst
                ? `🎉 新発見スタンプGET！「${matched.name}（${matched.formula}）」が完成したよ！`
                : `✨ 「${matched.name}（${matched.formula}）」の合成に成功！`
        );

        renderCraftMissionsAndPalette();
        updateStampBadge();
    } else {
        playSound('hint');
        const target = MOLECULE_RECIPES.find(r => r.id === state.selectedRecipeId) || MOLECULE_RECIPES[0];
        const diffs = [];
        const allKeys = new Set([...Object.keys(currentCounts), ...Object.keys(target.composition)]);
        allKeys.forEach(sym => {
            const cur = currentCounts[sym] || 0;
            const req = target.composition[sym] || 0;
            if (cur < req) diffs.push(`${ATOMS[sym].name}(${sym})をあと${req - cur}個入れる`);
            if (cur > req) diffs.push(`${ATOMS[sym].name}(${sym})を${cur - req}個へらす`);
        });
        showCraftFeedback('amber', `💡 目標の「${target.name}」には、【${diffs.join('・')}】とピッタリそろうよ！`);
    }
}
