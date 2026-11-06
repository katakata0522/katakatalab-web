# 115万キロのファンノート

公開先：https://katakatalab.com/higedanfan/

楽曲データとアプリの編集元は [higedanfan](https://github.com/katakata0522/higedanfan)。この版のソースは [cef617b](https://github.com/katakata0522/higedanfan/tree/cef617b9ee56aa138753459c79406ced76849e2c)。Node.js 24 で npm ci、npm run lint、node --import tsx --test src/utils/fanLogic.test.ts、npm run build の順に実行する。

生成された index.html、assets 内の JS と CSS、third-party-licenses.txt を higedanfan/ に入れる。未使用の旧バンドルを残さない。画像素材・開発用設定・API キーは必要ない。ファンノートのカードはCSSで描画する。

トップの入口は projects.json が正本。変更後に node scripts/build-project-cards.cjs で index.html を再生成する。配信時は通常の Private pin 手順に従う。
