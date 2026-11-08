# 115万キロのファンノート

公開先：https://katakatalab.com/higedanfan/

楽曲データとアプリの編集元は [higedanfan](https://github.com/katakata0522/higedanfan)。この版のソースは [c7888e5](https://github.com/katakata0522/higedanfan/tree/c7888e591c0a85f5fdc04d305626df61946ad0ad)。Node.js 24 で npm ci、npm run lint、npm test、npm run build の順に実行する。

生成された index.html、`songs/<楽曲ID>/index.html`、assets 内の JS と CSS、third-party-licenses.txt を higedanfan/ に入れる。未使用の旧バンドルを残さない。開発用設定・API キーは含めない。現在の独立ページは全90曲。5曲の個別原稿と、確認済みデータから組み立てた85曲の概要に共通テンプレートを適用する。

タブ・ホーム画面のアイコンと共有画像は、編集元の `brand/` にあるオリジナルの4ファイルを使用する。Publicでは実画像をGitに含めず、`qa/published-dependencies.json` にサイズ・SHA-256とCI用の代替画像を登録する。本番ではPrivateの `higedanfan/` に置いた実画像を `privateOverlay` のSHA-256と照合して配信する。

楽曲ページの画像欄は全曲共通の正方形の仮枠で、画像は読み込まない。既存の挿絵素材は同じ素材経路で保管し、後から画像を使う場合に備えてPrivateの照合契約を維持する。

マイセトリの追加は、通常の保存を待つ間、同じタブのセッションストレージにも記録する。再読み込み後は既存の保存データと照合し、別タブで削除・初期化された曲を古い操作で戻さない。

公開ビルドではファンサイトの全HTMLを共通アクセス解析の注入対象から外す。プライバシーポリシーと一致させるため、解析コードが混入した場合はビルドを止める。

トップの入口は projects.json が正本。変更後に node scripts/build-project-cards.cjs で index.html を再生成する。配信時は通常の Private pin 手順に従う。
