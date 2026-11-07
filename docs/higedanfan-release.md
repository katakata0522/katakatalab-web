# 115万キロのファンノート

公開先：https://katakatalab.com/higedanfan/

楽曲データとアプリの編集元は [higedanfan](https://github.com/katakata0522/higedanfan)。この版のソースは [ad403ad](https://github.com/katakata0522/higedanfan/tree/ad403ad00217db90e40c1f4644d629ad484a3be4)。Node.js 24 で npm ci、npm run lint、npm test、npm run build の順に実行する。

生成された index.html、assets 内の JS と CSS、third-party-licenses.txt を higedanfan/ に入れる。未使用の旧バンドルを残さない。開発用設定・API キーは含めない。

タブ・ホーム画面のアイコンと共有画像は、編集元の `brand/` にあるオリジナルの4ファイルを使用する。Publicでは実画像をGitに含めず、`qa/published-dependencies.json` にサイズ・SHA-256とCI用の代替画像を登録する。本番ではPrivateの `higedanfan/` に置いた実画像を `privateOverlay` のSHA-256と照合して配信する。

トップの入口は projects.json が正本。変更後に node scripts/build-project-cards.cjs で index.html を再生成する。配信時は通常の Private pin 手順に従う。
