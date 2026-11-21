// 記事で選んだテーマを優先し、初回だけポータルの設定を引き継ぐ。
try {
    const preference = localStorage.getItem('pikalab-dark-mode');
    const darkMode = preference === null
        ? JSON.parse(localStorage.getItem('wonder_school_profile_v2'))?.darkMode
        : preference === 'true';
    if (darkMode) document.body.classList.add('dark-mode');
} catch {
    // ストレージを利用できない場合や古い設定が壊れている場合は標準テーマで表示する。
}

// 外部フォントの読み込みで本文の表示を待たせない。
for (const font of document.querySelectorAll('link[data-article-font]')) {
    font.media = 'all';
}
