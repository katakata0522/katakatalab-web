# focus_studio 保守メモ

## 目的
このコンテンツを、文言と機能を維持したまま安全に改善するための運用ルール。

## 変更時の必須チェック
1. `node --check pikalab/focus_studio/script.js`
2. `py -3 .github/scripts/validate_pikalab.py`
3. `node --test pikalab/focus_studio/tests/runtime-lifecycle.test.cjs`
4. 公開ランタイムの変更時は `cd pikalab && npm run build:all` の後、`node --test focus_studio/tests/interactive-build.test.cjs`（Playwright Chromiumが必要）

## 公開ランタイム
- 公開ビルドでは `public/focus_studio/runtime-hardening.js` が注入される。タイマー検証は元の `script.js` と組み合わせた状態で行う。
- チャイム音声待ち・完了処理中のリセットは、古い非同期処理が新しいタイマー状態を変更しないことを確認する。

## ガードレール
- 画面文言はユーザー指示なしで変更しない
- 既存機能の仕様を変更しない
- 入力バリデーションとエラーハンドリングを維持・強化する

## 回帰しやすいポイント
- ローカル参照パス（HTML内のscript/link/img）
- レスポンシブ時のレイアウト崩れ
- キーボード操作とフォーカス遷移
- LocalStorage復元時の境界値


## 2026-10-04 時間・音声・保存の回帰検証
- タイマーは終了予定時刻とミリ秒単位の残り時間を保持する。表示の切り上げ値を再開計算に使わない。
- 集中・14秒のチャイム・休憩は予定時刻で接続し、スリープ中に過ぎたチャイムや休憩終了音を復帰後に再生しない。
- 初期化済みの音声でも再開待ちを1.2秒に制限し、音声が使えなくても休憩へ進む。
- リセットは完了処理とチャイムを世代番号で無効化する。古いPromiseのfinallyで次の完了処理を解除しない。
- 環境音は希望状態と実際のノードを分け、全停止は保留中の開始も取り消す。停止操作は音声の再開を待たない。
- 目標の保存は変更した入力だけを対象とし、無変更タブの離脱で別タブの新しい目標を上書きしない。
- 同時完了回数はWeb Locks対応時に保存更新を直列化する。保存拒否時もタイマーを使える。非対応ブラウザの同時書き込みは完全な原子性を保証しない。
- キーボード長押し・変換中・修飾キー・入力欄・開いたダイアログをタイマーのSpace操作から除外する。

追加の確認:
1. `node --test focus_studio/tests/runtime-lifecycle.test.cjs focus_studio/tests/source-regressions.test.cjs`
2. 実ビルド後 `npm run test:focus-deep-e2e`。既存の `test:focus-e2e` も維持する。
3. `FOCUS_STUDIO_BASELINE_ROOT` は同じPR基点のdist。360/390/768/1440pxの初期画面・ダークモード・操作画面を画像とDOM/CSSで確認する。
4. 公開後 `FOCUS_STUDIO_PRODUCTION_URL=https://katakatalab.com/pikalab/focus_studio/ npm run test:focus-deep-e2e`。通常URLの新規コンテキスト初回と再読み込みのアセットSHAを実ビルドと照合する。

ブラウザが終了・凍結されている間にJavaScriptや音を強制実行することはできない。復帰時は予定時刻へ追いつく。再読み込みで動作中タイマーを復元する新機能は追加していない。

画像確認で判明したダークモードの白地上の白文字は、ロゴ・環境音ボタン・完了回数とリセットのhoverに限定して濃い文字色へ補正する。位置・面積・背景色は変更しない。
音声E2EではTone.jsの共有制御信号（mono/128フレーム/全0または全1）を実音声ループと区別し、生の総数・バッファ特性・再利用も記録する。ライブラリの共有信号をアプリの再生漏れと誤判定しない。

白地の暗色文字補正はFocus単独ダークモードに限定する。ポータルのtheme-nightを引き継いだ黒い面は既存の明るい文字を保ち、両テーマでヘッダーのコントラストを実測する。
