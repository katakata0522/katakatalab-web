# 実験探偵ラボ ― PikaLab 新作ゲーム（Draft）

PikaLabの明るい研究室らしさを残し、事件ファイル・証拠ボード・研究ノートの物理的な質感を組み合わせた3事件の体験型理科ゲーム。

## このMVPでできること

- 植物／水温と砂糖／ふりこの3事件×各3ステップ（合計9問）
- 観察 → おかしい条件を発見 → 1条件を直す → 測定項目を選ぶ
- 誤答の説明・2段階ヒント・事件別の解決スタンプ（**ページ表示中のみ**）
- PC/タブレット/スマホのレスポンシブ表示、キーボード／タップ操作、モーション低減
- ゲーム画面でデータ収集・広告・アクセス解析・外部API通信を行わない

## 配置

提案配置： `pikalab/science_maker/fair_experiment/`。本体の3ステップや保存形式には**一切変更を加えない**。
公開サイトのカードにも追加しない。適切な監修・テスト完了後にScience Makerの「実験」カテゴリの計画書から、任意のテキストリンクを1件追加することを検討する。

## ファイル

- `index.html`: 静的HTML、強いCSPと `noindex`（未公開版）
- `assets/style.css`: Tailwindユーティリティを**ビルド済み**にしたCSS（CDN不要）＋世界観固有のデザイン
- `tailwind.input.css`: 編集元のTailwind（v3系）入力とオリジナルCSS
- `tailwind.config.cjs`: PikaLab既存のTailwind v3向け設定
- `cases.js`: 3つの架空実験シナリオ、採点ロジック、データ検証
- `app.js`: ステップ管理、操作、表示、各事件の模式SVG
- `tests/cases.test.cjs`: データ・採点テスト（Node標準テスト）

## 起動・検証

開発PCでフォルダごと静的サーバーに配置する。例：

```bash
python -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開く。

```bash
node --check app.js
node --check cases.js
node --test tests/*.test.cjs
```

Tailwind v3 CLIがある環境でスタイルを再ビルドする場合：

```bash
npx tailwindcss -c tailwind.config.cjs -i tailwind.input.css -o assets/style.css --minify
```

サンプルHTMLはTailwind CDNを読み込まない。フォントも外部への通信なしで端末の日本語フォントを使う。画像素材はオリジナルのSVG・CSS。

## 実装上の注意

- **架空の実験計画**。植物の生育、砂糖の溶解時間、ふりこの周期について測定値や因果結果を捏造しない。模式図は縮尺通りではない。
- これは「1つの条件の影響を調べる」初歩の実験設計であり、**複数条件を変える実験一般が科学的に無意味だと教えない**。
- 本作のストーリー・イラスト・操作を確認した上で、小学校理科の指導と文章表現について公開前の教材レビューを受ける。
- 配信時は既存 `pikalab/tests/ad-policy.test.cjs`・共通教育プライバシー検査・ビルド成果物・モバイルE2Eを実行。教育サイトへのGA4、AdSense、アフィリエイトの追加禁止。
- Public側へのPRは**本番デプロイではない**。Private側で不変コミット固定・資産・CSP・セキュリティ検証が終わるまで公開しない。

## 将来の検討（MVP外）

進捗の研究手帳連携、音声、事件追加、Science Makerからの文脈リンクなど。現時点では新たなアカウント・連続ログイン・ランキング・時間制限は作らない。
