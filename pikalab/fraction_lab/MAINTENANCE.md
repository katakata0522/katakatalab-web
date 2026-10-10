# fraction_lab 保守メモ

## 方針
- 既存の学習内容・レイアウトを保つ。確認できた誤りや操作不能だけを修正する。
- `index.html` は生ソース、`concept-evolution.js` はViteの変換で読み込まれる公開機能。ブラウザー確認は必ず実ビルドで行う。
- PWA・Service Worker・未公開コンテンツはこの単体整備の対象外。

## 計算・表示契約
- 通常の図は分母1〜12、足し算・引き算の分母は既存UIの2〜10。数字入力は確定時に整数・範囲へ整える。
- エジプト分数は分子1〜99、分母2〜100の整数で、0 < 分子 < 分母だけを受け付ける。入力を違う分数へ黙って置換しない。
- エジプト分数と途中式はBigIntで計算する。8/97には150桁の分母があり、Numberや固定桁丸めへ変更しない。
- 入力変更・検証エラー時は前の結果を消す。CSSクラスとinline displayの競合を作らない。
- 1枚を超える和・負の差は数式の正しい値と図の範囲の説明を保つ。
- 分母が同じ図形は再利用し、分子変更では色と位置を更新する。クリック処理は親へ委譲し、描画ごとにリスナーを増やさない。
- 設定は既存共有プロフィールへ保存する。別タブの更新を失わないよう、変更したキーだけを最新値へ結合する。

## 確認手順
1. `node --check pikalab/fraction_lab/script.js` と `node --check pikalab/fraction_lab/concept-evolution.js`
2. `node --test pikalab/fraction_lab/tests/*.cjs`
3. `cd pikalab && npm run build:all && npm run verify:build`
4. `FRACTION_LAB_BASELINE_ROOT=<PR基点のdist> npm run test:fraction-e2e`
5. 最終headの全必須CI、公開後の通常URLと配信アセットを確認する。

ブラウザー検査は320/390/667/1280pxでタブ・ドラッグ・数値入力・図形クリック・計算・連打・クイズ再試行・モーダル・設定保存を確認する。初期画面比較、実フォントの未加工環境、長いエジプト分数、描画再利用の測定を別々に記録する。
