# QR Maker Lab

URLや文章、Wi-Fi、メール、連絡先などをQRコードにするブラウザツールです。無料のPNG作成を利用できます。Proは販売準備中です。

## 初めて使うとき

1. `qrcode/index.html` をHTTPサーバーから開き、用途に合うテンプレートを選びます。
2. 入力後のQRコードを確認し、「PNG保存」で画像を保存します。
3. 配布前に、実際に使うスマートフォンや印刷物で読み取りを確認してください。

入力内容と画像はブラウザ内で処理します。Proのライセンス確認は、設定された検証APIとの通信を伴います。詳しくは画面の送信ポリシーと `privacy.html` を参照してください。

## Pro機能の状態と出力の制約

ライセンスAPIが未設定のときはProを有効化しません。通信障害時はキーを保持し、接続復旧後に再試行できます。無効・期限切れ・失効の応答ではProと保存キーを解除します。

SVGとPDFは、現在の実装ではPNG画像を内包します。拡大して細部が増えるベクター出力ではありません。画面の品質スコアは設定の目安であり、実機の読み取り成功を保証しません。

購入、キーの発行・失効、返金などの運用は、この公開ソースだけでは完結しません。ライセンス管理、サーバー設定、本番配信はPrivate側で管理します。

## 公開ソースの検証

リポジトリのルートで、必要な公開済み素材を検証用に用意します。素材やCI専用設定はGitへ追加せず、本番配信にも使わないでください。

```sh
python3 scripts/public-qa/prepare.py
npm --prefix qrcode test
npm ci --ignore-scripts --no-audit --no-fund
npx playwright install chromium --only-shell
node qrcode/tests/quality-browser-smoke.cjs
```

`npm --prefix qrcode test` は、画面・公開ファイルの契約、ブラウザ側のライセンス状態遷移、ロゴ読み込みの順序とキャンセルを検証します。通信・DOMを代替するNodeテストで、PrivateのライセンスAPI実装や管理コマンドは対象に含めません。

ブラウザスモークは、ローカルのソースをChromiumで描画し、無料PNG保存、テスト用ライセンス応答でのSVG保存、SVGがPNGを内包すること、日英の説明、1280pxと390pxの表示を確認します。テスト用APIの応答は検証コンテキスト内だけに置き、本番の `js/pro-config.js` は書き換えません。

Public Web Root Quality Checkのブラウザ工程でも同じスモークを実行します。Draft PRでは製品QAのジョブを省略する既存方針を維持しています。実購入、本番API、カメラを使った読取り、実際の印刷物、Service Workerの更新はこのスモークの検証範囲に含みません。
