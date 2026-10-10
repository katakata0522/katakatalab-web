# quest_board 保守メモ

## 目的
このコンテンツは、文言や機能を維持しつつ安全に改修するために、最低限の自動検証を前提に運用する。

## 変更時の必須チェック
1. `node --check pikalab/quest_board/script.js`
2. `node pikalab/quest_board/tests/quest_board.test.cjs`
3. `python3 .github/scripts/validate_pikalab.py`

## JSON-LDとCSP
現行の `index.html` は `script-src` で `'unsafe-inline'` を許可しているため、JSON-LDごとのsha256ハッシュ同期は使っていません。JSON-LDを編集しても、CSPハッシュの更新は不要です。

`.github/scripts/sync_quest_board_csp.py` は過去のhashベース運用を追跡できるよう履歴として残していますが、通常実行では停止します。将来 `'unsafe-inline'` を廃止して厳格なhashベースCSPへ移行するときは、CSP全体の設計と合わせて同期方式を再評価してください。

## 回帰しやすいポイント
- `help-modal` の `role/aria-*` 属性
- `quest-count` スライダー操作時の再描画負荷
- `quest_card` の縮尺計算（極小画面）
- `../pikalab_ogp_compressed.jpg` の存在と `og:*` / `twitter:image` の整合


## 個別の回帰検証
- `node --test pikalab/quest_board/tests/state-lifecycle.test.cjs`
- `cd pikalab && npm run build:all && npm run test:quest-e2e`
- `QUEST_BOARD_BASELINE_ROOT`で比較する実ビルドを指定。`QUEST_BOARD_PRODUCTION_URL`は公開後の通常URL・初回/再読込・参照アセット照合に使用。
- `quest-browser`は既存品質検証を省かず並列に実行する。画像・実測・PDFをartifactに残す。

## 状態と操作の契約
- 初期表示・共有の確認前は保存値を変更しない。編集時は別タブの最新値と変更欄を合成し、同じ欄の競合では手元の明示編集を優先する。
- タイトル・ごほうびは従来通りコードポイント単位の30文字。IME変換中は入力を書き換えない。
- 回数入力は100ms単位でまとめ、change・非表示・離脱・印刷・共有の前に最後の値を確定する。
- ボタンDOMは回数が変わる時だけ生成する。リサイズ監視は寸法が変わった時だけ縮尺を再計測する。
- 自動縮小後もスタンプの44pxを保つ。収まらない縦方向は上端からスクロール可能にする。
- 音声とコピー失敗はボード編集を止めず、保存/コピーの失敗を成功と表示しない。
- 印刷時は画面幅に依存しない列数を使い、ダイアログと暗色背景を含めない。スタンプ印刷設定をbeforeprintでも同期する。
