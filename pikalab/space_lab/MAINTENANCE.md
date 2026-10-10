# ほしぞら・アドベンチャーの保守

## 状態と非同期処理

- 学習進捗は既存の保存キーを維持する。破損値は正規化し、保存容量不足の後も同一セッションでは最新のメモリー値を読む
- `lifecycle.mjs` の `TaskScope` はワープ・問題・ひみつファイル・UFO・達成演出の世代を分ける。閉じる／移動する操作で以前のタイマーとフレームを取り消す
- `ModalStack` はフェードの見た目と `inert` を分離する。達成演出を閉じても、その下の天体モーダルは操作・描画停止状態を維持する
- BGMは4声の既存構成を維持する。発振器→音量→パン→マスターの接続と、表示／ミュートの非同期競合をテストする
- rAFの経過時間は60Hz相当を基準にし、復帰直後の大きな飛びを抑える。表示位置が同じフレームではミニマップ・背景・キーボード用位置のDOMを書き直さない
- UFOは同じ画面座標を飛ぶが、専用の固定・クリップ領域に収める。画面外の飛行が文書のスクロール幅を広げない

## 学習情報の確認（2026-10-04）

値の概数や説明の意味を保ち、観測事実・推測・画像の対象を区別する。

- [NASAの温度比較](https://science.nasa.gov/resource/solar-system-temperatures/)：巨大惑星の値は固体表面ではなく1気圧層。共通ラベルは「温度」
- [太陽のSDO画像](https://www.nasa.gov/image-article/sunny-day/)：旧リンクは別の系外惑星の想像図だった
- [水星の全球モザイク](https://science.nasa.gov/photojournal/mercury-globe-0n-0e/)：旧PIA19200は火星のクレーターだった
- [木星と大赤斑](https://science.nasa.gov/asset/hubble/jupiter-and-the-great-red-spot/)：旧記事URLの404を修正
- [土星の自然色モザイク](https://science.nasa.gov/photojournal/saturn-four-years-on/)：旧リンクは5衛星の画像だった
- [金星のレーダー画像](https://science.nasa.gov/photojournal/venus-computer-simulated-global-view-of-the-northern-hemisphere/)：観測データの加工画像も含むため、外部リンクの案内は「NASAの観測画像を見る」
- [大赤斑の観測史](https://science.nasa.gov/missions/hubble/nasas-hubble-watches-jupiters-great-red-spot-behave-like-a-stress-ball/)：17世紀の斑点との同一性を断定せず、少なくとも150年以上とする
- [オールトの雲](https://science.nasa.gov/solar-system/oort-cloud/facts/)：直接確認済みとせず推定される集団として説明
- [55 Cancri eの観測日時](https://science.nasa.gov/asset/webb/super-earth-exoplanet-55-cancri-e-nircam-miri-emission-spectrum/)：2024年は発表年。観測は2022年11月・2023年3月

外部リンクの差し替えと、ローカルの天体画像のクレジットは別扱い。画像そのものやクレジットを機械的に変更しない。

## 検証

- `node --test space_lab/tests/*.test.cjs`：データ、描画ループ、入力中断、保存障害、音声経路、モーダルと遅延処理
- `npm run test:space-e2e`：実際のViteビルドを配信するPlaywright検証。4幅の画面／操作、27問、復習、各モーダル、繰り返し・中断、保存、非表示復帰、UFO画面外飛行を確認
- `SPACE_LAB_BASELINE_ROOT` に同じPR基点の実ビルドを渡すと、初期レイアウトと処理回数を比較できる
- 通常表示は実フォントを取得する別ケースで確認する。故障注入は保存・音声・画像等の環境境界だけに限定し、アプリの回答・状態・配信内容を置換しない
- 成果物は `visual-guard-artifacts/space/`。画面画像・テスト結果・幅計測・アセットハッシュを保存する
- ブラウザーを起動できない環境で、VMテストを実ブラウザー確認の代わりと主張しない。CIの最終headを確認する

共有PWA／Service Workerの所有範囲や公開経路はこの作業で変更しない。

### 実フォントで再現した操作の重なり

- ヘッダーの透明な余白でミニマップの押下を遮らない。リンク・ボタンの操作は維持する
- 374px以下ではタイトルが4行になりミニマップへ重なったため、同じ文言を2行へ収める文字寸法だけを調整する。それ以外の初期配置は基点と比較する
- ひみつファイルのロック説明は長い本文を固定高の中央から溢れさせない。狭い画面でも後半のタブを覆わない
- 追加のSpace実ブラウザー検査は独立ジョブで並列実行する。既存全体チェックの項目や判定を減らさない
