# rhythm_lab 保守メモ

## 目的
このコンテンツを、文言と機能を維持したまま安全に改善するための運用ルール。

## 変更時の必須チェック
1. `node --check pikalab/rhythm_lab/script.js`
2. `node pikalab/rhythm_lab/tests/rhythm_lab.test.cjs`
3. `node pikalab/rhythm_lab/tests/rhythm_persistence_v2.test.cjs`
   - モーダルの再開回帰: `node --test pikalab/rhythm_lab/tests/share-modal-lifecycle.test.cjs`
4. `cd pikalab && npm run build:all && npm run test:rhythm-e2e`
   - 320/390/667/1280px、ヘルプ・共有・保護者モーダル、BPMの逐字入力、音声初期化の取消と実Tone.js再生を確認する
   - PRではbase SHAのRhythmだけを比較し、レイアウト寸法と修正対象外の本文を維持する。故障していたセル色・ダーク配色・二重アイコンの復旧は意図した差分として扱う
5. `py -3 .github/scripts/validate_pikalab.py`（Windows）または `python3 .github/scripts/validate_pikalab.py`

## 保存・共有の互換仕様
- 作品の正本キーは `rhythmlab_user_projects_v2`。BPMと5楽器×16ステップのパターンを一緒に保持する。
- 自動保存の正本キーは `rhythmlab_autosave_project_v2`。BPMとパターンを一緒に保持する。
- 旧 `rhythmlab_user_presets` と `rhythmlab_autosave_grid` は互換読み込み対象。v2への保存成功後にだけ旧キーを削除する。
- 旧保存形式・旧共有リンクにはBPM情報が存在しないため、互換読み込み時は従来既定値の120 BPMとして扱う。
- 共有v2はBPMとパターンを含む。巨大・不正な共有値は適用前に拒否する。
- 保存形式を将来拡張する場合は `schemaVersion` を更新し、旧形式の読み込み互換を先に設計する。

## ガードレール
- 画面文言はユーザー指示なしで変更しない
- 既存機能の仕様を変更しない
- 入力バリデーションとエラーハンドリングを維持・強化する
- 旧保存データを移行前に破棄しない

## 回帰しやすいポイント
- ローカル参照パス（HTML内のscript/link/img）
- レスポンシブ時のレイアウト崩れ
- キーボード操作とフォーカス遷移
- LocalStorage復元時の境界値
- 作品保存・自動保存・共有でBPMとパターンが一致して復元されること
- 旧保存形式・旧共有リンクが120 BPMとして読み継げること
- `node --test pikalab/rhythm_lab/tests/*.test.cjs` で、音声の再開・失敗・取消、保存拒否、旧キーの削除失敗、別タブの順次保存を検証する
- 音声開始は取消できる要求番号を持ち、古い描画や非表示後の初期化完了で再開しない。MetalSynthはNoiseSynthと異なり音程・音価・時刻を渡す
- 保存作品は操作直前の保存一覧を読み、削除は作品IDで行う。これは順次操作の上書き防止であり、localStorageに跨る真の同時書込みの排他制御ではない
- 未編集タブは離脱時に自動保存しない。保存失敗時の編集データと再試行状態を保つ
- 音符セルの見た目はnative buttonのdata属性に結びつける。存在しないroleやclassを前提とした静的テストだけで済ませない

## QR配信正本
- `js/qrcode.min.js` と `public/js/qrcode.min.js` を一致させる。開発サーバーはpublic側を優先し、ビルドでは正本側をコピーするため、開発表示だけでは正本の故障を検出できない
- `tests/qrcode-runtime.test.cjs` で多項式乗算・誤り訂正と本番URLを検証し、Rhythm E2Eでは実distのバイトと4利用先の描画を確認する
