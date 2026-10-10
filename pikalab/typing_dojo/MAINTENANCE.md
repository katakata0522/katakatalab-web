# typing_dojo 保守メモ

## 目的と範囲
タイピング道場の文言・通常時の表示・採点ルールを維持し、入力と中断復元を安全に保つ。
共有CSS、PWA/Service Worker、他コンテンツはこの変更範囲に含めない。

## 変更時の確認
1. `node --check pikalab/typing_dojo/script.js` と `node --check pikalab/typing_dojo/typing-core.js`
2. `node --test pikalab/typing_dojo/tests/*.test.cjs`
   - 既存ロジック: `node pikalab/typing_dojo/tests/typing_dojo.test.cjs`
   - ローカル日付・夏時間: `local-date.test.cjs`
   - ローマ字・かな・保存設定: `typing-core.test.cjs`
   - DOM/タイマーの決定的モデル: `runtime-resilience.test.cjs`
3. `python3 .github/scripts/validate_pikalab.py`
4. `cd pikalab && npm run typecheck && npm run build:all && npm run verify:build && npm test`
5. 構築した `dist` を使い `npm run test:typing-dojo-e2e` を実行する。
   - 比較元も同じビルド手順で構築し `TYPING_DOJO_BASELINE_ROOT` に指定する。
   - 320×740、390×844、667×375、1280×900の画面・実操作・画像・アセットSHAを保存する。
   - NodeのDOMモデルは実ブラウザ確認の代用ではない。
6. 最新PR headのCI成功後にマージし、既存デプロイの成功と通常の公開URLで対象アセット・操作を確認する。

## 入力の正本
- 文字入力の採点は `input` に集約する。keydownで入力欄の値に文字を足して予測採点しない。
- IME変換中は値・得点を変更しない。確定かなはローマ字へ正規化する。
- 選択範囲の置換、削除、貼り付け、物理キー、自作キーボードを同じ判定へ通す。
- `buildPatternCache(word, { includePatterns: false })` のコンパクトmatcherで前方一致・完了判定を行う。表示用の有限な列挙リストを正解の全体集合とみなさない。
- ヒントはtextContentで組み立て、保存値をHTMLとして挿入しない。

## 中断と保存
- タイマーはperformance.nowによる経過時間を精算し、停止前の端数を保つ。
- 設定を開いた場合だけ自動停止し、設定が止めたゲームだけ閉じた後に再開する。明示停止は維持する。
- 背景のカウントダウンは進めない。Escapeは開始待ちも中断できる。
- カウントダウン、タイマー、遅延フォーカスは所有者を確認し、旧セッションから新セッションへ作用させない。
- 正解直後の保存には次の問題を入れる。通常語彙は設定から再生成し、復習の残り・ミス語・ボーナス状態だけ必要に応じて保存する。
- 不正な期限・語・数値を含むセッションは復元しない。読書き拒否時も当該タブの日次進捗・履歴を保持するが、保存成功とは表示しない。
- ページ離脱はpagehideで扱い、キャンセル可能なbeforeunloadで実行中の計時だけを失わない。

## 表示の差分
通常画面のレイアウトと文言は保持する。高さ不足で操作不能だった設定・ガイド・停止画面には内側スクロールを設け、フォーカス・ARIA・背面inertを同期する。
