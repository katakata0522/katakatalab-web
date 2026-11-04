# GitHub連携の作業手順

対象の公開ソースは https://github.com/katakata0522/katakatalab-web です。
Dot・Muse・Codexなどから作業するときは、作業場所、権限、認証、コミット名義を別々に確認します。
別環境のフォルダーが見つからないことや、ツールに名義入力欄がないことだけでは、GitHubの権限不足とは判断できません。

## 1. 現在の環境で作業場所を確認する

既存の作業フォルダーがあれば、まず次を読み取り確認します。

```sh
git rev-parse --show-toplevel
git remote get-url origin
git status --short --branch
```

originが上記の公開リポジトリであることを確認します。別リポジトリのoriginを書き換えて流用しません。
未コミット変更や未共有コミットがある場合は保持し、別のworktreeまたは新しいcloneで今回の変更を分離します。

クラウド側では、利用者のパソコンのパスは通常そのまま使えません。
Gitが利用でき、現在の環境に作業フォルダーがなければ、許可された作業領域で次を実行します。
公開ソースのcloneに新しいトークンは不要です。`--depth`は付けず、メール検査に必要な履歴を取得します。

```sh
git clone https://github.com/katakata0522/katakatalab-web.git
cd katakatalab-web
```

この公開リポジトリの取得にPrivate側の履歴、設定、素材、ログを混ぜません。
Gitがない環境ではGitHub連携の読み取り機能でもソースを確認できますが、それをローカルの作業フォルダーやpush経路の確認済みとは扱いません。

## 2. 公開名義を明示する

所有者本人として作業するAIの公開名義は次のとおりです。
このnoreplyアドレスはGitHubの本人設定画面で確認した値です。
外部コントリビューターは自分の確認済み公開名義を使用し、この名義を流用しません。

```sh
git config --local user.name "katakata0522"
git config --local user.email "191018749+katakata0522@users.noreply.github.com"
git config --local user.useConfigOnly true
git var GIT_AUTHOR_IDENT
git var GIT_COMMITTER_IDENT
```

この設定は対象リポジトリに適用し、他のリポジトリのグローバル設定は変えません。
`git var`で実効値を確認し、authorとcommitterの両方が公開名義であることを確認してからコミットします。
環境変数や`--author`などで設定が上書きされる場合もあるため、設定値だけで検査済みとせず、次の手順で生成済みコミットを検査します。
確認中に個人メールが表示された場合は、公開ログ・PR本文・成果物へ転載しません。

GitHubのメール非公開設定と、CLIのGit名義は別の設定です。
GitHubの設定画面では「Keep my email addresses private」と「Block command line pushes that expose my email」を読み取り確認します。
設定変更が必要なら、対象と影響を説明して本人へ確認します。

## 3. 専用ブランチで変更し、push前に検査する

```sh
git fetch --no-tags origin main
git rev-parse origin/main
git switch -c fix/DESCRIPTIVE-UNIQUE-NAME origin/main
```

`git rev-parse`で得た完全なSHAを、今回の公開済み基準`BASE_SHA`として保持します。
上のブランチ名は作業内容に合わせた未使用の名前へ置き換えます。
既存の作業を保持したうえで変更・関連検証・コミットを行い、次の`BASE_SHA`を保持したSHAへ置き換えて検査します。

```sh
python scripts/commit-privacy/commit_privacy_preflight.py --repo . --ref HEAD --exclude-ref BASE_SHA
```

Python 3.9以降を使用します。環境によっては`python3`です。
終了値0かつ、新しいコミットがある場合は`checked_commits`が1以上であることを確認します。
終了値1または2は公開を止め、[既存検査の説明](../scripts/commit-privacy/README.md)に従って原因を調べます。
この検査はauthor/committerのメールが対象です。コミット名、メッセージ、本文、ファイルの秘密情報や公開可否も別途確認します。

既存認証でのGit pushが利用できるかは、変更を送信しないdry-runで確認できます。
次のブランチ名も今回の専用ブランチ名へ置き換えます。

```sh
git push --dry-run origin HEAD:refs/heads/fix/DESCRIPTIVE-UNIQUE-NAME
git push -u origin HEAD:refs/heads/fix/DESCRIPTIVE-UNIQUE-NAME
```

実pushはメール検査と関連検証の成功後に行います。mainへ直接pushせず、PRを作成します。
PR作成とコミット作成は別の操作なので、PRの作成にはGitHub連携ツールを使用できます。
PRでは変更内容に必要な検査を確認し、必須チェック成功前にマージしません。
文書のみの変更などで対象外のworkflowが起動しなかった場合は、その事実を成功した検査と区別します。

## 4. 連携ツールや認証で止まった場合

GitHub REST API自体にはauthor/committerの指定がありますが、連携ツールがその入力欄を公開しているとは限りません。
名義を明示できず、生成される名義を確かめられない書き込み経路では、試験コミットを公開して確認しません。
GitHubのメール非公開設定だけを根拠に、すべてのAPI・外部サービスのコミットが同じ名義になると断定しません。

既存の認証を使えるGit、またはauthor/committerを明示できる承認済みの書き込み経路を使います。
連携ツールの認証と、現在の環境のGit push認証は別です。cloneに成功してもpush認証の確認済みとは扱いません。
接続エラーでは、名前解決・ネットワーク制約と認証エラーを区別します。
権限不足を示す具体的なエラーがない限り、再接続やトークン再発行、権限拡大を解決策として要求しません。

書き込み経路だけが使えない場合も、読み取り・差分作成・可能な検証は進めます。
残る障害は、対象リポジトリ、試した経路、エラーの種類、未送信の差分、必要な次の操作を具体的に報告します。
認証情報の作成・変更、保護ルールの回避、公開範囲の拡大は行いません。

## 5. 完了の確認

変更を含むコミットSHA、PR、最新HEADのCI、マージ結果を確認します。
Public側のマージは本番配信の完了ではありません。本番反映は既存のPrivate側の正規経路で確認します。
アプリの画面・動作を変えた場合は、対象URLでの実機確認まで区別して報告します。

GitHub公式資料:

- [コミットメールの設定](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address)
- [REST APIのコミット作成とauthor/committer](https://docs.github.com/en/rest/git/commits#create-a-commit)
