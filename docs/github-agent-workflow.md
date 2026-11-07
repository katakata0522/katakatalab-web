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
git rev-parse --is-shallow-repository
```

originが上記の公開リポジトリであることを確認します。別リポジトリのoriginを書き換えて流用しません。
未コミット変更や未共有コミットがある場合は保持し、別のworktreeまたは新しいcloneで今回の変更を分離します。
履歴が浅い場合（最後のコマンドが`true`）は、公開先のoriginを確認してから`git fetch --unshallow --no-tags origin main`で必要な履歴を取得します。浅い履歴のままメール検査を省略しません。

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

既存認証でのGit push接続を事前確認するには、変更を送信しないdry-runを使用できます。
dry-runの成功だけでは、実送信時のサーバー処理やブランチ規則の成功は保証できません。実push後もリモートのSHAを確認します。
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
書き込み操作がタイムアウトした場合は、対象ブランチのSHA、PRの状態、マージ済みSHAなどを読み直します。エラー表示だけで未実行と判断して同じ変更を重複送信しません。
5xxなどサーバー側のエラーが続く場合は、[GitHub公式の障害情報](https://www.githubstatus.com/)と発生時刻を照合します。サービス障害を認証の故障として扱わず、復旧までは未送信の差分を保持します。
権限不足を示す具体的なエラーがない限り、再接続やトークン再発行、権限拡大を解決策として要求しません。

書き込み経路だけが使えない場合も、読み取り・差分作成・可能な検証は進めます。
残る障害は、対象リポジトリ、試した経路、エラーの種類、未送信の差分、必要な次の操作を具体的に報告します。
認証情報の作成・変更、保護ルールの回避、公開範囲の拡大は行いません。

## 5. 完了の確認

変更を含むコミットSHA、PR、最新HEADのCI、マージ結果を確認します。
CIはチェック名だけでなく対象SHA、通常実行とDraft通知、成功・未実行・中断を区別します。過去のHEADの成功を新しい差分の検証済みとは数えません。
Public側のマージは本番配信の完了ではありません。本番反映は既存のPrivate側の正規経路で確認します。
アプリの画面・動作を変えた場合は、対象URLでの実機確認まで区別して報告します。

GitHub公式資料:

- [コミットメールの設定](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address)
- [REST APIのコミット作成とauthor/committer](https://docs.github.com/en/rest/git/commits#create-a-commit)

## 6. 実行環境と依存監査

画面変更のローカル検証では、候補版の操作確認と旧版との比較を区別します。Speed Readerの比較には、PR基点の固定SHAから別にビルドした出力を`SPEED_READER_BASELINE_ROOT`で渡します。未指定の実行や`baselineComparison`が`skipped`の結果を、旧版との比較成功として報告しません。意図した追加UIは個別の操作・配置契約で確認し、それ以外の文言・配置・スタイルの検査は維持します。

PublicのRoot・PikaLab検証は`.node-version`のNode.js 24 LTSを使用します。Privateの配信用実行環境も同じLTSへ揃え、元の素材・設定を組み立てたビルドで確認します。ブラウザーは別の契約で、lockと公式コンテナーのPlaywright版を一致させます。

`npm run audit:dependencies`はRootとPikaLabのlockを現在の勧告と照合します。未知の警告は重大度を問わず停止し、通信・解析失敗を合格へ代替しません。

2026年11月5日に確認したdeepmergeのGHSA-gcqx-w48m-w2h4は、npmには残っていますが、[公式CVE記録](https://github.com/CVEProject/cvelistV5/blob/790fe3b1147c6f11580e9b00b18abcf2c7534af4/cves/2026/93xxx/CVE-2026-93753.json)で11月2日に却下されています。確認したnode-resolveの使用箇所も、初期化時の固定設定だけの複製です。
監査はこの通知と確認済み4依存の版だけを区別し、毎回公式CVEの現在状態を取得して`REJECTED`であることを確かめます。同じ依存の新勧告・重大度変更・版変更・CVEの再公開は自動承認しません。警告そのものを0件と表示したり、旧PWAへ強制変更したりしません。

## 7. 通常PRの統合チェック

通常PRは`public-pr-gate`で、必要なRoot/PikaLab検証、公開名義、公開境界、依存監査の実際の成功を確認します。文書のみなど、差分から対象外と確定できた品質検証だけを省略します。変更を取得できない場合は両方を実行し、対象を確定できない出力は合格にしません。

PikaLab内でも`completion`が、共有検証と選択された全ラボの成功を確認します。必要なジョブのfailure・cancelled・予期しないskippedは失敗です。
Draftは軽量の安全検査と`Draft public-pr-gate`通知を使い、通常ゲートの成功と区別します。Readyへの移行で通常検証を開始します。

PRの検査は同じコミットの再利用workflowを呼び、別の定義を重複実行しません。ヒゲダンサイトのURLだけを追加したsitemap.xmlと、ヒゲダン素材だけを変更した依存台帳は、内容を前後のコミットで照合してPikaLabの対象外とします。比較できない場合や他サイトにも変更がある場合はPikaLabを検証します。

mainのpush検査は、Privateの公開ソース固定を検証する独立のRoot・PikaLab・公開境界・依存監査を保ちます。PikaLabのworkflowはmainでも変更範囲を判定し、対象外なら軽い判定ジョブの成功で完了します。PikaLabに関係する変更は従来の検証を実行します。GitHub側の保護設定は、実際の通常ゲート成功を確認した後に別途適用します。
