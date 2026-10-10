# before/after画像の独立レビュー

この追加比較は、公開HTMLの初期viewportを基準版と候補版で撮影する。元からあるresponsive guard・機能・source検査は変更しない。

- `report.json` の `status: review_required` は表示維持の合格ではない。新規比較の生の画素不一致だけを助言的な所見として扱い、マージ前の独立レビューを必須とする。
- `comparison.passed: false`、`strictPixelFailures`、`manualReviewRequired` と before/after/diff画像を保持する。channel許容2/255・許容変更画素0は変えない。描画ばらつきの自動承認・範囲mask・成功までの再撮影は行わない。
- route追加/削除、未完了capture、画像寸法、許可済み記事訂正以外の文書寸法、bitmapの位置/寸法/可視性、実行時・asset・時計・読込エラーは引き続き失敗扱いとし、終了コードを非zeroにする。画素の要レビュー状態でこれらを免除しない。
- レビュー担当者は対象commitと全所見を確認し、実画像、差分座標、関連source、同page再撮影・同一版の新規context対照を照合する。差が意図した変更または根拠のある描画ばらつきかを判断し、理由・確認範囲・未確認事項をPRに記録する。説明できない差は修正または判断待ちとし、マージしない。
- `review_required` 時の終了コード0は、決定的検査の完了と証跡の生成を示すだけで、独立レビューの完了やマージ許可を示さない。reportを書き換えてraw結果を合格にしない。
- 初期viewport以外のスクロール後・操作後・dark mode・ゲームプレイ全体の同一性は、この比較だけでは証明しない。
