# 動きの仕組み図鑑｜KatakataLab Motion Atlas

> 再生・スロー再生・種明かし図解でWebアニメーションとUIの置き方がわかり、AIへの指示文（プロンプト）とコードをそのまま持ち帰れるカタログサイトです。

## 主な特徴
- **14カテゴリ・100パターンのカタログ**。文字の動き、箱の出現、メニュー、タブ切替、検索UI、マイクロインタラクション、ページの構成、ヘッダー、フッター、独創仕掛け、カルーセル、料金・比較、フォーム、案内・戻る。
- **1ブロック1ステージの低認知負荷UI**: 囲われたドット方眼ステージの右上に「仕組み」「スロー」「再生」を集約
- **数値＆スライダーでリアルタイム調整**: 速さ（秒）・距離・ズレ時間・動きの質感を調整でき、その値が出力プロンプト・コードにも即反映
- **バイブコーダー向け「AIへの指示文をコピー」＆エンジニア向け「コードをコピー」** の2系統ワンクリックコピー

## 起動方法

Node.js はリポジトリ直下の [`.node-version`](../.node-version) に記載のバージョンを使います。以下のコマンドは `motion-atlas-source/` で実行します。図鑑のデータは `src/data/`、実演は `src/components/stages/` にあります。

```bash
# ロックファイルに従って依存パッケージを用意
npm ci --ignore-scripts

# 開発サーバー起動
npm run dev

# TypeScript の型検査
npm run lint

# 本番ビルド（dist/ と standalone.html を生成）
npm run build

# ビルド済みファイルの検証
npm test

# ビルド結果のプレビュー
npm run start
```

## KatakataLab サブディレクトリ配置

KatakataLab の公開ページは、リポジトリ直下の `motion-atlas/` から配信します。

```powershell
npm run release:check -- ..
npm run release:prepare -- ..
```

`release:check` は現行の配信ファイルと再ビルド結果を照合します。`release:prepare` は型検査・ビルド・既存テストを実行して、差分があれば `.release/` の新しいフォルダーに出力します。既存の公開用HTMLから説明文、共有アイコン、CSPなどを引き継ぎ、Viteのアセット参照を更新します。RootのCIでもソースのビルド結果を配信ファイルと照合します。

公開する際は、出力された `motion-atlas/` のファイルをリポジトリ直下の同じ相対パスに反映し、編集元と一緒にPRに含めます。[KatakataLabのGitHub連携手順](../docs/github-agent-workflow.md)

`dist/` は相対パスに対応し、`404.html` と `manifest.webmanifest` を含みます。単独で配布する場合は、必要なApache設定を `public/.htaccess`、アイコンを `public/assets/favicon.svg` に用意できます。ローカルで手軽に確認する場合は、このフォルダーの `standalone.html` を開けます。
