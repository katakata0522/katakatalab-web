import { MOLECULE_RECIPES, BALANCE_STAGES } from './data.js';
import { state } from './state.js';

export function renderBookSection() {
    const totalStamps = state.discoveredMolecules.size + state.clearedStages.size;
    document.getElementById('bookProgressText').textContent = `🏅 ${totalStamps} / 16 スタンプ`;

    const molGrid = document.getElementById('bookMoleculesGrid');
    molGrid.innerHTML = MOLECULE_RECIPES.map(m => {
        const unlocked = state.discoveredMolecules.has(m.id);
        const cls = unlocked
            ? 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 hover:border-sky-400'
            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-400 opacity-80';

        return `<button type="button" data-action="jump-to-molecule" data-recipe-id="${m.id}" class="p-3.5 rounded-2xl border text-left transition cursor-pointer ${cls}">
            <div class="flex items-center justify-between mb-1">
                <span class="font-mono font-extrabold text-base text-sky-700 dark:text-sky-300">${m.formula}</span>
                <span class="text-[11px] font-bold">${unlocked ? '🏅 発見済' : '🔒 未発見'}</span>
            </div>
            <div class="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">${m.name}</div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${unlocked ? m.explain : m.hint}</p>
        </button>`;
    }).join('');

    const reactGrid = document.getElementById('bookReactionsGrid');
    reactGrid.innerHTML = BALANCE_STAGES.map((s, idx) => {
        const cleared = state.clearedStages.has(s.id);
        const leftStr = s.reactants.map(r => (r.targetCoeff > 1 ? r.targetCoeff : '') + r.formula).join(' + ');
        const rightStr = s.products.map(p => (p.targetCoeff > 1 ? p.targetCoeff : '') + p.formula).join(' + ');
        const cls = cleared
            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400'
            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-400 opacity-80';

        return `<button type="button" data-action="jump-to-stage" data-stage-index="${idx}" class="p-3.5 rounded-2xl border text-left flex items-center justify-between gap-2 transition cursor-pointer ${cls}">
            <div class="min-w-0">
                <div class="text-[11px] font-bold text-slate-500 dark:text-slate-400">${s.shortName}</div>
                <div class="font-mono font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate mt-0.5">
                    ${cleared ? `${leftStr} → ${rightStr}` : 'パズルに挑戦しよう ➔'}
                </div>
            </div>
            <span class="shrink-0 text-xs font-extrabold">${cleared ? '🏅' : '⚖️'}</span>
        </button>`;
    }).join('');
}

export function updateStampBadge() {
    const total = state.discoveredMolecules.size + state.clearedStages.size;
    document.getElementById('stampCountBadge').textContent = `${total}/16`;
}
