# 115万キロのファンノート

公開先：https://katakatalab.com/higedanfan/

楽曲データとアプリの編集元は [higedanfan](https://github.com/katakata0522/higedanfan)。この版のソースは [302c9e6](https://github.com/katakata0522/higedanfan/tree/302c9e601d0a40ca3c288f228309e0a3d768de93)。Node.js 24 で npm ci、npm run lint、npm test、npm run build の順に実行する。

聖地マップは場所とバンドのつながりで絞り込み、複数の分類に属する場所はそれぞれに表示する。広域しか確認できない撮影地は地図の範囲を明示し、訪問案内をしない場所には地図や訪問記録を表示しない。

生成された index.html、`songs/<楽曲ID>/index.html`、assets 内の JS と CSS、third-party-licenses.txt を higedanfan/ に入れる。未使用の旧バンドルを残さない。開発用設定・API キーは含めない。現在の独立ページは全90曲で、それぞれの紹介文に共通テンプレートを適用する。

タブ・ホーム画面のアイコンと共有画像は、編集元の `brand/` にあるオリジナルの4ファイルを使用する。Publicでは実画像をGitに含めず、`qa/published-dependencies.json` にサイズ・SHA-256とCI用の代替画像を登録する。本番ではPrivateの `higedanfan/` に置いた実画像を `privateOverlay` のSHA-256と照合して配信する。

楽曲ページの画像欄は全曲共通の正方形の仮枠で、画像は読み込まない。既存の挿絵素材は同じ素材経路で保管し、後から画像を使う場合に備えてPrivateの照合契約を維持する。

マイセトリの追加は、通常の保存を待つ間、同じタブのセッションストレージにも記録する。再読み込み後は既存の保存データと照合し、別タブで削除・初期化された曲を古い操作で戻さない。

テンポは資料によって拍の数え方や数値が異なるため「約」を付ける。資料差が大きく採用を保留した７曲は「調査中」とし、テンポ順と平均から未確定値を除外する。曲別の参考値・別表記と照合状況は、編集元の `docs/bpm-audit-2026-11-08.md` に記録する。

公開ビルドではファンサイトの全HTMLを共通アクセス解析の注入対象から外す。プライバシーポリシーと一致させるため、解析コードが混入した場合はビルドを止める。

トップの入口は projects.json が正本。変更後に node scripts/build-project-cards.cjs で index.html を再生成する。配信時は通常の Private pin 手順に従う。

マイソング診断の結果は、おすすめの曲名と大きなYouTubeプレビューから表示する。回答の変更は末尾の閉じた「条件を変えて探す」にまとめ、再診断とコーナー移動も結果より後に置く。結果表示時は曲名へフォーカスとスクロールを合わせる。
