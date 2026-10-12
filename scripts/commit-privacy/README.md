# 今後のコミットメールの確認

Python 3.9以降、外部パッケージ不要。Windowsの匿名パイプにも対応します。
author と committer の両方を検査し、メール値は出力しません。

既に公開済みの履歴を変更せず、新しく公開する範囲を指定します。基準のSHAは、
作業開始時に確認した公開mainの完全なSHAを使用してください。浅いcloneでは
検査を完了扱いにしません。

```sh
python scripts/commit-privacy/commit_privacy_preflight.py --repo . --ref HEAD --exclude-ref BASE_SHA
```

終了値0は指定範囲で違反なし、1は許可外メール、2は検査未完了です。
1または2では公開を止めます。既存履歴の削除・書換え・fetch・push・設定変更は行いません。
`--exclude-ref`を省略すると指定refの全祖先を検査します。空の明示範囲はchecked_commitsが0です。

GitHub公式の「Keep my email addresses private」を確認し、ローカルGitにも
本人の設定画面で確認したnoreplyアドレスを使用してください。推測したアドレスは使いません。
「Block command line pushes that expose my email」も補助になります。

PRのCIはsourceとGitHub生成mergeの両方を検査します。ただし、PR作成後に生成された
mergeはCI開始前から閲覧できるため、CIだけではメールの初回露出を防げません。
アカウント側の非公開設定を確認する前に試験PRを作らないでください。
この変更はアカウント設定・branch protection・過去履歴を変更しません。

検査対象はGitのauthor/committerメールです。本文・tagger・Co-authored-by・ファイル中の
秘密情報は別の検査対象です。noreplyの書式一致は本人認証ではありません。

公式資料:
- https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address
- https://docs.github.com/en/account-and-profile/reference/email-addresses-reference

検証: ローカルではWindows上で42テスト成功。Linuxと実際のGitHub生成mergeは、このworkflowの実行結果で確認してください。
