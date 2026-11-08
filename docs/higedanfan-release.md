# 115万キロのファンノート

公開先：https://katakatalab.com/higedanfan/

楽曲データとアプリの編集元は [higedanfan](https://github.com/katakata0522/higedanfan)。この版のソースは [ae273ac](https://github.com/katakata0522/higedanfan/tree/ae273aceaf094456be27a3eb3fe7d53772c0ab34)。Node.js 24 で npm ci、npm run lint、npm test、npm run build の順に実行する。

生成された index.html、`songs/<楽曲ID>/index.html`、assets 内の JS と CSS、third-party-licenses.txt を higedanfan/ に入れる。未使用の旧バンドルを残さない。開発用設定・API キーは含めない。現在の独立ページは全90曲。5曲の個別原稿と、確認済みデータから組み立てた85曲の概要に共通テンプレートを適用する。

タブ・ホーム画面のアイコンと共有画像は、編集元の `brand/` にあるオリジナルの4ファイルを使用する。Publicでは実画像をGitに含めず、`qa/published-dependencies.json` にサイズ・SHA-256とCI用の代替画像を登録する。本番ではPrivateの `higedanfan/` に置いた実画像を `privateOverlay` のSHA-256と照合して配信する。

楽曲ページの挿絵 `brand/song-art/<楽曲ID>-editorial.png` も同じ素材経路で `higedanfan/song-art/` に配置する。PublicのCIでは代替画像を使用し、本番では元画像のSHA-256を照合する。挿絵は当サイト制作のイメージ画像であり、公式ジャケットではない。

楽曲ページには Apple Music の公式プレーヤーを埋め込む。確認済みの音源にだけプレーヤーを表示し、未確認の場合や手動で切り替えた場合は当サイトの画像を表示する。Apple の画像ファイルは配信パッケージに含めない。

トップの入口は projects.json が正本。変更後に node scripts/build-project-cards.cjs で index.html を再生成する。配信時は通常の Private pin 手順に従う。
