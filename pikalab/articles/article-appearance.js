// 本文の描画前にポータルで選んだテーマを反映する。
try {
    const profile = localStorage.getItem('wonder_school_profile_v2');
    if (profile && JSON.parse(profile)?.darkMode) document.body.classList.add('theme-night');
} catch {
    // ストレージを利用できない場合や古い設定が壊れている場合は標準テーマで表示する。
}

// 外部フォントの読み込みで本文の表示を待たせない。
for (const font of document.querySelectorAll('link[data-article-font]')) {
    font.media = 'all';
}
