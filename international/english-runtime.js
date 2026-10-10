(() => {
  'use strict';

  // 既存ツールが実行時に差し替える短い状態文だけを英語化する互換レイヤー。
  // 検索対象になる見出し・説明・操作ラベルは各英語HTMLへ静的に出力する。
  if ((document.documentElement.lang || '').toLowerCase().split('-')[0] !== 'en') return;

  const exact = new Map(Object.entries({
    'コピーしました！': 'Copied!',
    'コピーに失敗しました': 'Copy failed.',
    'クリップボードへのコピーに失敗しました。': 'Could not copy to the clipboard.',
    'CSSコードをコピー': 'Copy CSS',
    'コピー完了！': 'Copied!',
    'フォント適用中...': 'Loading font…',
    'フォントを適用しました': 'Font applied.',
    'フォントの読み込みに失敗しました': 'The font could not be loaded.',
    '入力内容がありません': 'Enter content first.',
    '比較する文章を両方入力してください': 'Enter text in both fields before comparing.',
    '差分はありません': 'No differences found.',
    '完全一致': 'Identical',
    '追加': 'Added',
    '削除': 'Deleted',
    '変更': 'Changed',
    '比較中...': 'Comparing…',
    '入力をクリアしました': 'Inputs cleared.',
    '元に戻しました': 'Restored.',
    '画像を選択してください。': 'Choose an image first.',
    '対応していない画像形式です。': 'This image format is not supported.',
    '画像ファイルが大きすぎます。10MB以下の画像を選択してください。': 'The image is too large. Choose a file under 10 MB.',
    '画像を読み込めませんでした。': 'The image could not be loaded.',
    '画像比率は推奨範囲内です': 'The image ratio is within the recommended range.',
    '画像比率が推奨値と異なります': 'The image ratio differs from the recommendation.',
    '早見表に追加しました': 'Added to the reference table.',
    'このサイズはすでに登録されています': 'This size is already in the table.',
    '有効な数値を入力してください': 'Enter a valid number.',
    '初期値に戻しました': 'Reset to defaults.',
    'この行を削除': 'Remove this row',
    '処理中...': 'Working…',
    '画像を選択してください': 'Choose an image',
    'PNGで保存': 'Save PNG',
    'SVGで保存': 'Save SVG',
    '設定': 'Settings',
    '合成画像': 'Composite image',
    '線素材のみ': 'Lines only',
  }));

  const patterns = [
    [/^ほぼ\s*(.+?)\s*の比率です！$/, 'Close to $1.'],
    [/^(\d+)文字$/, '$1 characters'],
    [/^差分:\s*(\d+)件$/, '$1 differences'],
    [/^現在:\s*(.+)$/, 'Current: $1'],
    [/^(\d+)pxの行を削除$/, 'Remove the $1 px row'],
  ];

  function translate(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return value;
    if (exact.has(normalized)) return exact.get(normalized);
    for (const [pattern, replacement] of patterns) {
      if (pattern.test(normalized)) return normalized.replace(pattern, replacement);
    }
    return value;
  }

  function translateTextNode(node) {
    const original = node.nodeValue;
    const leading = original.match(/^\s*/)?.[0] || '';
    const trailing = original.match(/\s*$/)?.[0] || '';
    const translated = translate(original);
    if (translated !== original) node.nodeValue = `${leading}${translated}${trailing}`;
  }

  function translateElement(element) {
    for (const attribute of ['aria-label', 'title', 'placeholder']) {
      if (!element.hasAttribute(attribute)) continue;
      const original = element.getAttribute(attribute);
      const translated = translate(original);
      if (translated !== original) element.setAttribute(attribute, translated);
    }

    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) translateTextNode(child);
      if (child.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(child.tagName)) {
        translateElement(child);
      }
    }
  }

  const nativeAlert = window.alert.bind(window);
  const nativeConfirm = window.confirm.bind(window);
  window.alert = (message) => nativeAlert(translate(message));
  window.confirm = (message) => nativeConfirm(translate(message));

  const start = () => {
    translateElement(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') translateTextNode(mutation.target);
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
          if (node.nodeType === Node.ELEMENT_NODE) translateElement(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
