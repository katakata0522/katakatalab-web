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
