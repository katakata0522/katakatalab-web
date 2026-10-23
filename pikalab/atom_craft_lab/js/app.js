import { MOLECULE_RECIPES, BALANCE_STAGES } from './data.js';
import { state } from './state.js';
import { playSound } from './audio.js';
import {
    renderCraftMissionsAndPalette,
    renderCraftChamber,
    hideSynthesizedView,
    synthesizeMolecule
} from './craft.js';
import { loadBalanceStage, renderBalanceStageUI, verifyBalanceAndReact } from './balance.js';
import { renderBookSection, updateStampBadge } from './book.js';

function switchMode(mode) {
    playSound('pop');
    state.currentMode = mode;

    const sections = {
        craft: document.getElementById('sectionCraft'),
        balance: document.getElementById('sectionBalance'),
        book: document.getElementById('sectionBook')
    };
    const tabs = {
        craft: document.getElementById('tabModeCraft'),
        balance: document.getElementById('tabModeBalance'),
        book: document.getElementById('tabModeBook')
    };

    Object.keys(sections).forEach(k => {
        if (k === mode) {
            sections[k].classList.remove('hidden');
            tabs[k].className = 'flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-extrabold text-xs sm:text-sm transition bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm cursor-pointer';
        } else {
            sections[k].classList.add('hidden');
            tabs[k].className = 'flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-extrabold text-xs sm:text-sm transition text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer';
        }
    });

    if (mode === 'book') renderBookSection();
}

function handleGlobalClick(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.getAttribute('data-action');

    switch (action) {
        case 'switch-mode': {
            const mode = target.getAttribute('data-mode');
            if (mode) switchMode(mode);
            break;
        }
        case 'toggle-settings': {
            playSound('pop');
            document.getElementById('settingsDrawer').classList.toggle('hidden');
            break;
        }
        case 'toggle-sound': {
            state.soundEnabled = !state.soundEnabled;
            document.getElementById('soundIcon').textContent = state.soundEnabled ? '🔊' : '🔇';
            document.getElementById('soundLabel').textContent = state.soundEnabled ? '音 ON' : '音 OFF';
            if (state.soundEnabled) playSound('pop');
            break;
        }
        case 'toggle-font': {
            playSound('pop');
            state.fontLarge = !state.fontLarge;
            document.documentElement.classList.toggle('font-large', state.fontLarge);
            document.getElementById('fontLabel').textContent = state.fontLarge ? '文字：おおきく' : '文字：ふつう';
            break;
        }
        case 'toggle-motion': {
            playSound('pop');
            state.reduceMotion = !state.reduceMotion;
            document.body.classList.toggle('reduce-motion', state.reduceMotion);
            document.getElementById('motionLabel').textContent = state.reduceMotion ? '動きをへらす：ON' : '動きをへらす：OFF';
            break;
        }
        case 'toggle-theme': {
            playSound('pop');
            state.darkMode = !state.darkMode;
            document.documentElement.classList.toggle('dark', state.darkMode);
            document.getElementById('themeIcon').textContent = state.darkMode ? '☀️' : '🌙';
            document.getElementById('themeLabel').textContent = state.darkMode ? '夜の画面：ON' : '夜の画面：OFF';
            break;
        }
        case 'select-mission': {
            const recipeId = target.getAttribute('data-recipe-id');
            if (recipeId) {
                playSound('pop');
                state.selectedRecipeId = recipeId;
                hideSynthesizedView();
                renderCraftMissionsAndPalette();
                renderCraftChamber();
            }
            break;
        }
        case 'next-mission': {
            playSound('pop');
            const curIdx = MOLECULE_RECIPES.findIndex(r => r.id === state.selectedRecipeId);
            const nextRecipe = MOLECULE_RECIPES[(curIdx + 1) % MOLECULE_RECIPES.length];
            state.selectedRecipeId = nextRecipe.id;
            state.chamberAtoms = [];
            hideSynthesizedView();
            renderCraftMissionsAndPalette();
            renderCraftChamber();
            break;
        }
        case 'fill-mission-atoms': {
            const recipe = MOLECULE_RECIPES.find(r => r.id === state.selectedRecipeId);
            if (recipe && recipe.defaultAtoms) {
                hideSynthesizedView();
                playSound('pop');
                state.chamberAtoms = [...recipe.defaultAtoms];
                renderCraftChamber();
            }
            break;
        }
        case 'add-atom': {
            const atomKey = target.getAttribute('data-atom');
            if (!atomKey) break;
            hideSynthesizedView();
            if (state.chamberAtoms.length >= 8) {
                showCraftFeedback('amber', '💡 ポッドには8個まで入れられるよ。粒をタップすると減らせるよ！');
                playSound('hint');
                return;
            }
            playSound('pop');
            state.chamberAtoms.push(atomKey);
            renderCraftChamber();
            break;
        }
        case 'remove-atom': {
            const idx = parseInt(target.getAttribute('data-index'), 10);
            if (!isNaN(idx)) {
                hideSynthesizedView();
                playSound('remove');
                state.chamberAtoms.splice(idx, 1);
                renderCraftChamber();
            }
            break;
        }
        case 'clear-chamber': {
            hideSynthesizedView();
            playSound('remove');
            state.chamberAtoms = [];
            renderCraftChamber();
            break;
        }
        case 'synthesize-molecule': {
            synthesizeMolecule();
            break;
        }
        case 'toggle-coeff-one': {
            playSound('pop');
            state.showCoeffOne = !state.showCoeffOne;
            document.getElementById('toggleCoeffOneBtn').textContent = state.showCoeffOne
                ? '📝 係数「1」も表示中'
                : '📝 係数「1」を省略中';
            renderBalanceStageUI();
            break;
        }
        case 'select-stage': {
            const stageIdx = parseInt(target.getAttribute('data-stage-index'), 10);
            if (!isNaN(stageIdx)) {
                playSound('pop');
                loadBalanceStage(stageIdx);
            }
            break;
        }
        case 'change-coeff': {
            const side = target.getAttribute('data-side');
            const idx = parseInt(target.getAttribute('data-index'), 10);
            const delta = parseInt(target.getAttribute('data-delta'), 10);
            const arr = side === 'left' ? state.reactantCoeffs : state.productCoeffs;
            const nextVal = arr[idx] + delta;
            if (nextVal < 1 || nextVal > 6) {
                playSound('hint');
                return;
            }
            playSound(delta > 0 ? 'pop' : 'remove');
            arr[idx] = nextVal;
            document.getElementById('balanceFeedbackBox').classList.add('hidden');
            renderBalanceStageUI();
            break;
        }
        case 'reset-stage': {
            playSound('remove');
            loadBalanceStage(state.currentStageIndex);
            break;
        }
        case 'show-balance-hint': {
            playSound('hint');
            const stage = BALANCE_STAGES[state.currentStageIndex];
            const box = document.getElementById('balanceFeedbackBox');
            box.className = 'rounded-2xl p-4 border text-xs sm:text-sm font-bold leading-relaxed bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800 animate-pop';
            box.innerHTML = `💡 <strong>ヒント：</strong>${stage.hint}`;
            break;
        }
        case 'verify-balance': {
            verifyBalanceAndReact();
            break;
        }
        case 'jump-to-molecule': {
            const recipeId = target.getAttribute('data-recipe-id');
            if (recipeId) {
                state.selectedRecipeId = recipeId;
                const recipe = MOLECULE_RECIPES.find(r => r.id === recipeId);
                if (recipe) state.chamberAtoms = [...recipe.defaultAtoms];
                hideSynthesizedView();
                renderCraftMissionsAndPalette();
                renderCraftChamber();
                switchMode('craft');
            }
            break;
        }
        case 'jump-to-stage': {
            const stageIdx = parseInt(target.getAttribute('data-stage-index'), 10);
            if (!isNaN(stageIdx)) {
                loadBalanceStage(stageIdx);
                switchMode('balance');
            }
            break;
        }
        case 'close-break-modal': {
            document.getElementById('breakModal').classList.add('hidden');
            break;
        }
    }
}

function initApp() {
    document.body.addEventListener('click', handleGlobalClick);
    renderCraftMissionsAndPalette();
    renderCraftChamber();
    loadBalanceStage(0);
    updateStampBadge();

    /* 時計表示で焦らせず、バックグラウンドで30分経過時のみ休憩を案内 */
    setInterval(() => {
        state.elapsedSeconds++;
        if (state.elapsedSeconds >= 1800 && !state.breakReminded) {
            state.breakReminded = true;
            document.getElementById('breakModal').classList.remove('hidden');
        }
    }, 1000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
