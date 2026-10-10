# manabi_land 保守メモ

## 目的
文言・見た目・3種類の学習内容を保ち、入力・中断・繰り返しに強い実装を維持する。

## 変更時のチェック
1. `node --check pikalab/manabi_land/script.js`
2. `node --test pikalab/manabi_land/tests/*.test.cjs pikalab/tests/manabi-clock.test.cjs`
3. `cd pikalab && npm run build:all && npm run verify:build`
4. `npm run test:manabi-e2e`
   - 実distを配信して320/390/667/1280pxで各ゲーム・保護者モーダルを検証する
   - `MANABI_BASELINE_ROOT`指定時は変更前の本文・レイアウトも比較する
5. `python3 .github/scripts/validate_pikalab.py`

## 回帰しやすい契約
- 学習問題・星3個の演出時間・難易度・コインの種類を維持する
- 時計のドラッグは「あわせる」画面の有効な1本のポインターだけで行う。タブ・モード・モーダル・非表示・演出・リサイズで解放する
- 時計の数字は実際の文字盤サイズから配置し、リサイズで問題を作り直さない
- 文字探しのタイマーは非表示・別ゲーム・保護者ダイアログ・正解演出中に進めない
- ヒントは次問まで表示する。無限アニメーションの終了待ちリスナーを積まない
- 保護者ダイアログの初期化は一度だけ行い、Escape・ボタン・背景クリックで状態とフォーカスを戻す
- 音声初期化は単一のPromiseで共有し、失敗後の次の操作で再試行する。消音中は読み込まず、音声失敗でゲームを止めない
- ポータルのプロフィールは最新の値を読み、消音設定だけをマージする。保存不可でも画面内の操作は続ける
- 通常の表示には新しいTailwindクラスを増やさず、共有の生成CSSとPWA処理はこのコンテンツの都合で変更しない
- 公開後は通常URLと配信中script/CSSの一致を、既存キャッシュとは分けて確認する
