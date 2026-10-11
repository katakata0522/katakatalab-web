# book_report 保守メモ

## 目的
このコンテンツを、文言と機能を維持したまま安全に改善するための運用ルール。

## 変更時の必須チェック
1. `node --check pikalab/book_report/script.js`
2. `node --test pikalab/book_report/script.test.js`
3. `py -3 .github/scripts/validate_pikalab.py`

## ガードレール
- 画面文言はユーザー指示なしで変更しない
- 既存機能の仕様を変更しない
- 入力バリデーションとエラーハンドリングを維持・強化する

## 回帰しやすいポイント
- ローカル参照パス（HTML内のscript/link/img）
- レスポンシブ時のレイアウト崩れ
- キーボード操作とフォーカス遷移
- LocalStorage復元時の境界値


## 個別の回帰検証
- `node --test pikalab/book_report/*.test.*`
- `cd pikalab && npm run build:all && npm run test:book-e2e`
- `BOOK_REPORT_BASELINE_ROOT` は同じ PR 基点の実ビルド。`BOOK_REPORT_PRODUCTION_URL` は公開後の通常 URL・初回/再読込・アセット照合に使う。
- `book-browser` はscopeの共通品質チェック成功後に実行し、4画面幅・PDF・計測結果をrunner内に作成する。Public CIでは権利確認中の素材を含む成果物をアップロードしないため、ジョブ終了後の保存は保証しない。

## 状態と表示の契約
- 入力と保存はコードポイント単位の既存上限を使い、空白・改行を保つ。IME変換中の値は切らず、保存しない。
- 500msでまとめて保存し、離脱・非表示・印刷・共有・しおり切替の前に確定する。保存失敗時は成功扱いせず、別しおりへ移動しない。
- しおりはタブごとに保持する。同じしおりの別欄の変更は3方向に合成し、同じ欄では手元で編集した値を優先する。
- 閲覧だけで保存値を作成・削除しない。共有データの既存内容への取り込みは確認後、DOMへ反映してから保存する。
- summer-supportの公開中の構成メモと質問を正本の表示として保つ。本体との連携はdocumentの`book-report:*`イベントで同期する。
- ガチャの中断時はタイマーを破棄し、背景へのTab移動を防ぐ。印刷前は練習欄を開いて同期し、印刷後に開閉状態を戻す。
