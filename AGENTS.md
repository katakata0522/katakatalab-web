# 公開ソースの作業ルール

既存の画面・機能・本文と未完了の修正を保持する。変更は専用ブランチとPRで検証する。
秘密情報、個人/運用データ、サーバー設定、権利未確認素材、旧PrivateのGit履歴・Issue・ログを持ち込まない。
qa/published-dependencies.json の素材をコミットしない。CI専用の代替素材・設定を本番に使わない。
本番デプロイはPrivate管理。Public CIはcontents:read、認証情報非保持、Secretsなし。外部PRを特権付きで実行しない。
失敗を隠すために検査を削らず、対象の挙動と既存仕様を確認して修正する。未実施の検証を合格と報告しない。

## GitHub連携とコミット名義

公開ソースの正本は https://github.com/katakata0522/katakatalab-web 。作業開始時に [GitHub連携の作業手順](docs/github-agent-workflow.md) を確認する。
所有者本人として作業するAIは、公開名義 `katakata0522` と確認済みメール `191018749+katakata0522@users.noreply.github.com` をauthor/committerの両方に使用する。push前に既存のコミットメール検査を実行する。
別環境のローカルパスが見つからない場合は、現在の環境へ公開リポジトリをcloneできるか確認する。作業場所、読み書き権限、push認証、名義指定の可否は個別に調べる。
名義を指定できない連携ツールで試験コミットを公開しない。既存認証を使えるGitなどを優先し、根拠なく再接続・トークン再発行・権限変更を求めない。
