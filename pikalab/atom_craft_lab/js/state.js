// このタブでのみ保持するアプリ状態（永続化は未実装）
export const state = {
    currentMode: 'craft',
    soundEnabled: true,
    fontLarge: false,
    reduceMotion: false,
    darkMode: false,
    showCoeffOne: false,
    selectedRecipeId: 'H2O',
    chamberAtoms: ['H', 'H', 'O'],
    discoveredMolecules: new Set(),
    currentStageIndex: 0,
    reactantCoeffs: [1, 1],
    productCoeffs: [1],
    clearedStages: new Set(),
    elapsedSeconds: 0,
    breakReminded: false
};
