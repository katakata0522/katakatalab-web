// キャンバス描画用の入力文字列を安全に整形する
// Canvas.fillText()はHTMLを解釈しないためXSS直接リスクは低いが、
// IndexedDBに保存されるため防御的にサニタイズする。
export function normalizeTaskText(value) {
  return String(value ?? '')
    .trim()
    .replace(/[<>&"'`]/g, ''); // HTMLメタ文字を除去
}
