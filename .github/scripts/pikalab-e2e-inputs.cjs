// 実行先を確認した検証専用ファイルだけを列挙する。
// 未知のスクリプトや共有ヘルパーは全E2E・デプロイ判定から除外しない。
const LAB_E2E_CHECKS = {
    'test:book-e2e': { lab: 'book', file: 'pikalab/scripts/book-report-e2e.mjs' },
    'test:kanji-e2e': { lab: 'kanji', file: 'pikalab/kanji_lab/tests/browser-interactions.test.cjs' },
    'test:rhythm-e2e': { lab: 'rhythm', file: 'pikalab/scripts/rhythm-lab-e2e.mjs' },
    'test:manabi-e2e': { lab: 'manabi', file: 'pikalab/scripts/manabi-land-e2e.mjs' },
    'test:speed-reader-e2e': { lab: 'speed_reader', file: 'pikalab/scripts/speed-reader-e2e.mjs' },
    'test:typing-dojo-e2e': { lab: 'typing_dojo', file: 'pikalab/scripts/typing-dojo-e2e.mjs' },
    'test:kotowaza-quiz-e2e': { lab: 'kotowaza', file: 'pikalab/scripts/kotowaza-quiz-e2e.mjs' },
    'test:fraction-e2e': { lab: 'fraction', file: 'pikalab/scripts/fraction-lab-e2e.mjs' },
    'test:focus-e2e': { lab: 'focus', file: 'pikalab/scripts/focus-studio-e2e.mjs' },
    'test:focus-deep-e2e': { lab: 'focus', file: 'pikalab/scripts/focus-studio-deep-e2e.mjs' },
    'test:space-e2e': { lab: 'space', file: 'pikalab/scripts/space-lab-e2e.mjs' },
    'test:paper-e2e': { lab: 'paper', file: 'pikalab/scripts/paper-gen-e2e.mjs' },
    'test:quest-e2e': { lab: 'quest', file: 'pikalab/scripts/quest-board-e2e.mjs' },
};

// 選択・package比較・配信除外は同じ定義から派生し、一覧の更新漏れを防ぐ。
const LAB_E2E_FILES = Object.freeze(Object.fromEntries(
    Object.values(LAB_E2E_CHECKS).map(({ file, lab }) => [file, lab])));
const LAB_E2E_SCRIPTS = Object.freeze(Object.fromEntries(
    Object.entries(LAB_E2E_CHECKS).map(([script, { file }]) => [script, file])));

module.exports = { LAB_E2E_FILES, LAB_E2E_SCRIPTS };
