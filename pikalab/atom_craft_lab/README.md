# アトム・クラフト・ラボ | PikaLab

中学校理科「化学変化と原子・分子」を遊びながら学ぶ無料教材。8種類の物質づくり、8ステージの化学反応式パズル、16スタンプの図鑑を収録。広告・アクセス解析はありません。

## 起動・ビルド

PikaLabルートで以下を実行します。

```sh
npm ci
npm run build:atom-css
npm run dev
```

`npm run dev` と `npm run build` は専用のTailwind CSSを自動生成します。PikaLab本番ではセキュリティ設定によりTailwind実行型CDNのスクリプトが遮断されるため、同じクラス・テーマのCSSを静的ファイルへ変換して使用します。編集対象は `tailwind.input.css` と `tailwind.config.cjs` で、`tailwind.generated.css` は自動生成物です。

## ファイル構成

- `index.html`：画面とPikaLabへの戻るリンク、SEOタグ
- `assets/app.css`：原子表示やアニメーションの固有CSS
- `js/data.js`：元素・物質・8ステージの教材データ
- `js/state.js`, `js/chemistry.js`：操作状態と化学計算
- `js/audio.js`, `js/molecule-svg.js`：効果音と模式図
- `js/craft.js`, `js/balance.js`, `js/book.js`, `js/app.js`：3つの学習画面と操作処理
- `tests/chemistry.test.mjs`：Node標準テスト。PikaLabの `npm run test:node` から自動検出

## 留意点

- 設定・スタンプはページ再読み込みで初期化されます。
- 分子・非分子性物質のモデルは学習向けの簡略表現を含みます。
- 本番反映はPublicソースのPR、Privateの固定コミット更新と通常のデプロイを通じて行います。
