# color_lab 保守メモ

## 目的
このコンテンツを、文言と機能を維持したまま安全に改善するための運用ルール。

## 変更時の必須チェック
1. `node --check pikalab/color_lab/script.js`
2. `node --test pikalab/color_lab/*.test.*`
3. `py -3 .github/scripts/validate_pikalab.py`

## ガードレール
- 画面文言はユーザー指示なしで変更しない
- 既存機能の仕様を変更しない
- 入力バリデーションとエラーハンドリングを維持・強化する

## 回帰しやすいポイント
- ローカル参照パス（HTML内のscript/link/img）
- レスポンシブ時のレイアウト崩れ
- キーボード操作とフォーカス遷移
- レベル判定の二重実行（連打）とスコア重複
- デプロイ後の本番差分（ローカル最新版との不一致）


## 個別整理の検証記録
`REFACTOR_NOTES.md` に変更範囲と測定条件を記載。ブラウザ検査は既存CIの `Verify Color Lab browser interactions` で配信物に対して実施する。
