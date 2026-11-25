import type { MotionPattern } from '../types/motion';
import { EASING_OPTIONS, buildStructuredPrompt } from '../utils/motionHelpers';

export const MONETIZE_GUIDES_EXTENDED_PATTERNS: MotionPattern[] = [
  // =========================================================================
  // 12. 料金・比較UI (#086 - #088)
  // =========================================================================
  {
    id: 'price-matrix-table',
    category: 'pricing',
    title: '機能比較マトリクス表（おすすめ列に薄色背景・モバイル切替）',
    subtitle: 'プランごとの機能差を表形式でひと目で比べられるようにしつつ、狭いスマホ幅ではプラン切替タブへ自動変化させます',
    mechanismTag: 'おすすめ列色分け表 ↔ モバイルプラン単列タブ',
    xRayCaption: 'PC時は中央「スタンダード」列を淡青背景で強調し、スマホ時は横スクロール崩壊を防ぐタブ型に自動切替します',
    interactiveHint: '右上の「PC / スマホ」で表形式とスマホ向け切替の見え方を比較できます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.3,
    durationRange: { min: 0.15, max: 0.8, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① おすすめプランの「縦列まるごと」に薄い色を敷く',
        detail: 'ヘッダーだけでなく下までの列全体に淡い青背景を引くと、視線が迷わず強みを比べられます。',
        codeHint: 'td.is-featured { background: rgba(239, 246, 255, 0.5); }'
      },
      {
        title: '② スマホで4列の表をそのまま縮小しない',
        detail: '無理に並べると文字が潰れるため、モバイル時はプラン選択タブ＋1列表示に切り替えます。',
        codeHint: 'mobile: segmented tabs + single column'
      },
      {
        title: '③ 対応していない項目は「✕」より「―」で落ち着かせる',
        detail: '薄い横棒にすると否定的になりすぎず、対応欄（あり・無制限）が自然に際立ちます。',
        codeHint: '<td class="muted">―</td>'
      }
    ],
    keywords: ['料金表', '比較表', 'マトリクス', 'プラン比較', 'レスポンシブ', 'テーブル'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'レスポンシブ料金機能比較マトリクス',
        goal: '3つのプランの機能差を整理した比較表を作り、おすすめプランの列全体に薄いハイライト背景を付け、スマホ時はプラン切替タブ型で読みやすく表示したいです。',
        mechanism:
          'デスクトップ幅では <table> でおすすめ列の th/td へ同一のハイライト背景色を適用し、狭い幅ではタブで選んだ 1 プランだけをカード表示します。',
        isStatic: true,
        requirements: [
          'table には th[scope="col"] を使い支援技術でも行・列対応が読めるようにする',
          'スマホ幅（640px 未満）では横スクロールによる見切れを避け、プラン別タブ切り替え UI へフォールバックする'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<div class="matrix-shell">
  <!-- PC：機能比較表 -->
  <div class="matrix-desktop">
    <table class="matrix-table">
      <thead>
        <tr>
          <th scope="col">機能項目</th>
          <th scope="col">ライト<br /><small>¥0</small></th>
          <th scope="col" class="featured">スタンダード<br /><small>¥980</small></th>
          <th scope="col">プロ<br /><small>¥2,480</small></th>
        </tr>
      </thead>
      <tbody>
        <tr><td>保存件数</td><td>3件</td><td class="featured">無制限</td><td>無制限</td></tr>
        <tr><td>チーム共有</td><td class="muted">―</td><td class="featured">対応</td><td>対応</td></tr>
        <tr><td>専任サポート</td><td class="muted">―</td><td class="featured muted">―</td><td>あり</td></tr>
      </tbody>
    </table>
  </div>

  <!-- スマホ：プラン別タブ切替 -->
  <div class="matrix-mobile">
    <div class="m-tabs" role="tablist">
      <button type="button" role="tab" data-plan="ライト|¥0|3件 / メール / ー">ライト</button>
      <button type="button" role="tab" class="is-active" data-plan="スタンダード|¥980|無制限 / チーム / 優先">スタンダード</button>
      <button type="button" role="tab" data-plan="プロ|¥2,480|無制限 / 監査ログ / 専任">プロ</button>
    </div>
    <div class="m-panel"><strong id="mPrice">¥980</strong>/月<p id="mSpec">無制限 / チーム / 優先</p></div>
  </div>
</div>

<style>
.matrix-table { width: 100%; border-collapse: collapse; font-size: 13px; background: #fff; }
.matrix-table th, .matrix-table td { padding: 10px; border-bottom: 1px solid #e4e4e7; text-align: center; }
.matrix-table th:first-child, .matrix-table td:first-child { text-align: left; }
.matrix-table .featured { background: #eff6ff; color: #1d4ed8; font-weight: 700; }
.matrix-table .muted { color: #a1a1aa; font-weight: 400; }
.matrix-mobile { display: none; border: 1px solid #e4e4e7; border-radius: 12px; padding: 12px; background: #fff; text-align: center; }
.m-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; background: #f4f4f5; padding: 4px; border-radius: 8px; }
.m-tabs button { border: none; background: transparent; padding: 6px; font-size: 12px; border-radius: 6px; cursor: pointer; }
.m-tabs button.is-active { background: #fff; color: #1d4ed8; font-weight: 700; }
@media (max-width: 640px) { .matrix-desktop { display: none; } .matrix-mobile { display: block; } }
</style>

<script>
(() => {
  const tabs = document.querySelectorAll('.m-tabs button');
  const priceEl = document.getElementById('mPrice');
  const specEl = document.getElementById('mSpec');
  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabs.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const parts = (btn.dataset.plan || '').split('|');
      if (priceEl && parts[1]) priceEl.textContent = parts[1];
      if (specEl && parts[2]) specEl.textContent = parts[2];
    });
  });
})();
</script>`
  },
  {
    id: 'price-usage-estimator',
    category: 'pricing',
    title: '人数スライダー連動お見積り計算機（大口割引表示付き）',
    subtitle: '「うちのチームだと月いくらかな？」をスライダーで動かしてすぐ計算でき、人数が増えると自動割引タグも点灯します',
    mechanismTag: 'range入力 + tabular-nums 合計金額リアクション',
    xRayCaption: 'スライダー値の変更に合わせて単価判定（10名以上割引）と合計桁幅ブレ防止（tabular-nums）を行っています',
    interactiveHint: '「再生」またはスライダーを動かして金額・割引バッジの変化を確認できます',
    defaultDuration: 0.3,
    durationRange: { min: 0.15, max: 0.8, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 入力させずスライダーで直感的に見積もらせる',
        detail: 'キーボード入力を強いるより、つまみを動かすだけで「安い／妥当」を体感してもらえます。',
        codeHint: '<input type="range" min="1" max="20" />'
      },
      {
        title: '② 数字の幅がガタつかないよう tabular-nums を指定',
        detail: '「1」と「8」の幅が違うと金額が左右に揺れて安っぽく見えるため等幅数字にします。',
        codeHint: 'font-variant-numeric: tabular-nums'
      },
      {
        title: '③ ボリューム割引の切り替わりでバッジを出す',
        detail: '「10名以上で割引適用」などのご褒美タグが見えると多人数検討の後押しになります。',
        codeHint: '{seats >= 10 && <span class="badge">割引適用</span>}'
      }
    ],
    keywords: ['見積もり', '計算', 'スライダー', '料金計算', '人数', 'マネタイズ'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '人数連動・リアルタイム料金見積りスライダー',
        goal: '利用人数スライダーを動かすだけで月額の合計金額を即計算し、一定人数以上で割引バッジが点灯する納得型見積りUIを作りたいです。',
        mechanism:
          'range input の値から単価（例: 10名以上で単価割引）と合計金額を計算し、font-variant-numeric: tabular-nums で金額表示を更新します。',
        requirements: [
          '単価ルールや通貨フォーマットを純粋関数で計算し、常に有限数値（Number.isFinite）で検証する',
          'スライダー操作中に数字の横幅がガタつかないよう font-variant-numeric: tabular-nums を必ず適用する'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div class="estimator">
  <label>人数：<span id="seatOut">5</span>名</label>
  <input id="seatRange" type="range" min="1" max="20" value="5" />
  <div class="total">¥<span id="priceOut">4,900</span>/月</div>
</div>

<style>
.total { font-variant-numeric: tabular-nums; font-weight: 800; font-size: 24px; transition: color ${params.duration.toFixed(2)}s ease, transform ${params.duration.toFixed(2)}s ease; }
</style>

<script>
(() => {
  const range = document.getElementById('seatRange');
  const seatOut = document.getElementById('seatOut');
  const priceOut = document.getElementById('priceOut');
  if (!range || !seatOut || !priceOut) return;
  range.addEventListener('input', () => {
    const n = Math.min(20, Math.max(1, Number(range.value) || 1));
    const unit = n >= 10 ? 780 : 980;
    seatOut.textContent = String(n);
    priceOut.textContent = (n * unit).toLocaleString('ja-JP');
  });
})();
</script>`
  },
  {
    id: 'price-trust-assurance',
    category: 'pricing',
    title: '購入ボタン直下の安心マイクロコピー＆即確認FAQ（静的設計）',
    subtitle: '申し込む直前に「勝手に課金されない？」「すぐやめられる？」という不安をその場で解消する誠実な配置',
    mechanismTag: '主CTA + 不安解消2行コピー + 折りたたみFAQ（静的）',
    xRayCaption: '派手な煽りや偽のカウントダウンを排し、「1クリック解約」「事前通知」と1クリックFAQを直下に置いています',
    interactiveHint: 'FAQ行をクリックしてその場での疑問解消動作を確認できます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.25,
    durationRange: { min: 0.1, max: 0.8, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 不安がよぎる「ボタンの真下」に事実を短く書く',
        detail: '画面一番下の利用規約に隠さず、登録ボタンの直下に「いつでも解約可」を置きます。',
        codeHint: '<button>開始</button><small>1クリックで解約可能</small>'
      },
      {
        title: '② 「自動課金の前にお知らせ」など誠実な約束を明記',
        detail: 'こっそり請求しないことを明言する方が長期的な信頼と継続率につながります。',
        codeHint: '安心アイコン + 短文2項目まで'
      },
      {
        title: '③ 一番聞かれる1問だけその場で開けるようにする',
        detail: '別ページへ飛ばすと戻ってこなくなるため、1問アコーディオンを下に置きます。',
        codeHint: '<details><summary>Q...</summary><p>A...</p></details>'
      }
    ],
    keywords: ['マイクロコピー', '安心', '解約', 'トライアル', 'CVR', 'コンバージョン', 'FAQ'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '登録ボタン直下の安心マイクロコピー＆ミニFAQ',
        goal: '無料トライアルや購入ボタンの直下に、解約しやすさ・請求タイミングの安心情報とよく聞かれる1問FAQを添えて不安なく進めるようにしたいです。',
        mechanism:
          'CTA ボタン直下にアイコン付きの短い安心コピーを 2 つ横並びで配置し、直下にネイティブ開閉可能な 1 問 FAQ を添えます。',
        isStatic: true,
        requirements: [
          '過剰な緊急性（偽の残り時間タイマー等）を使わず事実だけを落ち着いた表現で伝える',
          '解約条件のミニ FAQ には標準の <details> / <summary> を使い、スクリプトなしでも展開可能にする'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<div class="cta-trust">
  <button type="button" class="cta-btn">14日間の無料トライアルを始める</button>
  <p class="trust-note">✓ いつでも1クリック解約　•　✓ 自動課金前にメールでお知らせ</p>
  <details class="trust-faq">
    <summary>Q. 無料期間中に解約すると請求されますか？</summary>
    <p>いいえ。期間内にワンクリックで解約すれば請求は一切発生しません。</p>
  </details>
</div>

<style>
.cta-trust { max-width: 360px; padding: 16px; border: 1px solid #e4e4e7; border-radius: 12px; background: #fff; }
.cta-btn { width: 100%; padding: 12px; border: none; border-radius: 10px; background: #2563eb; color: #fff; font-weight: 700; cursor: pointer; }
.trust-note { margin: 10px 0 0; text-align: center; font-size: 12px; color: #52525b; }
.trust-faq { margin-top: 10px; border-top: 1px solid #f4f4f5; padding-top: 8px; font-size: 12px; }
.trust-faq summary { cursor: pointer; font-weight: 600; color: #3f3f46; }
</style>`
  },

  // =========================================================================
  // 13. フォーム・フィードバック (#089 - #092)
  // =========================================================================
  {
    id: 'form-validation-shake',
    category: 'forms',
    title: '入力エラー時のやさしい横揺れ＋即理由ガイド',
    subtitle: '誤りがある時に入力欄が小さく左右にブルッと揺れて注意を引き、すぐ下に「どう直せばいいか」を明示します',
    mechanismTag: '@keyframes 水平振動 + aria-invalid 赤枠 + 具体メッセージ',
    xRayCaption: 'エラー検出時だけ入力欄に 360ms の左右振動（±6px）をかけ、下に具体的な修正ガイドを出しています',
    interactiveHint: '「再生」または「確認する」を押してエラー時の揺れと修正時解除を試せます',
    defaultDuration: 0.36,
    durationRange: { min: 0.2, max: 0.8, step: 0.04 },
    defaultEasing: 'snappy',
    hasEasingControl: false,
    steps: [
      {
        title: '① 振動幅は ±6px、時間は 0.35秒以内で上品に',
        detail: '大きく揺らしすぎると画面酔いするため、軽く「違いますよ」と合図する程度にします。',
        codeHint: 'translate3d(-6px, 0, 0) ↔ (+6px, 0, 0)'
      },
      {
        title: '② 色と揺れだけでなく「直し方」を文章で書く',
        detail: '色覚特性のある方も困らないよう「エラー」だけでなく「@を含めて入力」と示します。',
        codeHint: '<p role="alert">@を含めて入力してください</p>'
      },
      {
        title: '③ 再入力を始めたらすぐ赤枠を解除する',
        detail: '直そうと文字を打っている最中もずっと赤いと責められている感覚になるため、入力で消します。',
        codeHint: 'onChange -> setError(false)'
      }
    ],
    keywords: ['バリデーション', 'エラー', 'シェイク', '揺れる', 'フォーム', '入力チェック'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'エラー時シェイク振動＆修正ガイド付き入力欄',
        goal: 'フォーム送信時に形式エラーがあった場合、該当入力欄を軽く左右に揺らして気づかせ、直下に具体的な修正メッセージを表示したいです。',
        mechanism:
          '検証失敗時に対象 input へ keyframes（±6px 水平往復）と aria-invalid="true" を付与し、直下に role="alert" の修正案内を出します。',
        requirements: [
          'ユーザーが文字を打ち直した瞬間にエラー状態と赤枠を即座に解除してストレスを与えない',
          '赤枠と揺れだけに頼らず aria-invalid="true" と role="alert" の具体的な修正メッセージを併記する'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<form id="mailForm" class="mail-form">
  <div class="mail-row">
    <input id="mailField" type="text" placeholder="name@example.com" aria-invalid="false" />
    <button type="submit">確認する</button>
  </div>
  <p id="mailErr" class="mail-err" role="alert" hidden>「@」を含む正しいメールアドレス形式で入力してください</p>
</form>

<style>
.mail-row { display: flex; gap: 8px; max-width: 340px; }
.mail-row input { flex: 1; padding: 8px 12px; border: 1px solid #d4d4d8; border-radius: 10px; }
.mail-row input.is-shake { border-color: #e11d48; background: #fff1f2; animation: shakeX ${params.duration.toFixed(2)}s ease; }
.mail-row button { padding: 8px 14px; border: none; border-radius: 10px; background: #18181b; color: #fff; font-weight: 700; }
.mail-err { margin: 6px 0 0; font-size: 12px; font-weight: 600; color: #e11d48; }
@keyframes shakeX { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
</style>

<script>
(() => {
  const form = document.getElementById('mailForm');
  const input = document.getElementById('mailField');
  const err = document.getElementById('mailErr');
  if (!form || !input || !err) return;
  input.addEventListener('input', () => {
    input.classList.remove('is-shake');
    input.setAttribute('aria-invalid', 'false');
    err.hidden = true;
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(input.value.trim());
    if (!ok) {
      input.classList.remove('is-shake');
      void input.offsetWidth;
      input.classList.add('is-shake');
      input.setAttribute('aria-invalid', 'true');
      err.hidden = false;
    }
  });
})();
</script>`
  },
  {
    id: 'form-password-strength',
    category: 'forms',
    title: 'パスワード強度メーター（色ゲージ＋表示切り替え目アイコン）',
    subtitle: '文字数や英数字記号の混在に合わせて 3 本のバーが赤→黄→緑へ伸び、打ち間違い確認用の表示ボタンも付きます',
    mechanismTag: '3段階ゲージ + password/text type 切替',
    xRayCaption: '打鍵ごとに制御文字を除去した上で複雑度（0〜3点）を算出し、3本ゲージの色と幅を切り替えています',
    interactiveHint: '「再生」の自動入力や、自分で文字・数字・記号を打ってゲージ上昇を試せます',
    defaultDuration: 0.3,
    durationRange: { min: 0.15, max: 0.8, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 送信前でも「何が足りないか」を言葉で伝える',
        detail: '赤ゲージの隣に「英数字や記号を混ぜると安心」と添えることで再入力を減らせます。',
        codeHint: 'length >= 6 / mixed chars / >= 10 + symbol'
      },
      {
        title: '② 「●●●●」を確認できる目アイコンを必ず置く',
        detail: 'スマホでのタイプミスによるロックアウトを防ぐ必須パーツです。',
        codeHint: 'type={show ? "text" : "password"}'
      },
      {
        title: '③ 判定に使うだけで生値はコンソールやログへ残さない',
        detail: '画面表示用の強度計算だけをローカルで完結させ、パスワード平文を外に出しません。',
        codeHint: 'local calculation only (zero logging)'
      }
    ],
    keywords: ['パスワード', '強度', 'メーター', '会員登録', 'セキュリティ', '表示切替'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'ライブパスワード強度メーター＆表示切り替え欄',
        goal: 'パスワード登録欄の下に 3 段階の強度バー（弱い／まずまず／安全）をリアルタイム表示し、伏字の表示/非表示ボタンも付けたいです。',
        mechanism:
          '文字数・英数字混在・記号有無の 3 軸で強度スコアを計算して 3 本の色付きバーを更新し、目のアイコン押下で input の type 属性を切り替えます。',
        requirements: [
          'パスワード文字列のコピー送信やログ出力をせず、クライアント内の強度表示だけに使用する',
          'ゲージ色だけでなく「文字数・英数字・記号」など具体的な強度理由テキストと表示切替ボタンを添える'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div class="pw-box">
  <div class="pw-row">
    <input id="pwField" type="password" placeholder="英数・記号を組み合わせて入力" />
    <button type="button" id="pwToggle" aria-label="表示切替">表示</button>
  </div>
  <div class="pw-bars"><span id="b1"></span><span id="b2"></span><span id="b3"></span></div>
  <small id="pwLabel">未入力</small>
</div>

<style>
.pw-box { max-width: 320px; display: grid; gap: 8px; }
.pw-row { display: flex; border: 1px solid #d4d4d8; border-radius: 10px; padding: 4px 10px; background: #fff; }
.pw-row input { flex: 1; border: none; outline: none; font-size: 13px; }
.pw-bars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.pw-bars span { height: 6px; border-radius: 9999px; background: #e4e4e7; transition: background-color ${params.duration.toFixed(2)}s ease; }
</style>

<script>
(() => {
  const pw = document.getElementById('pwField');
  const toggle = document.getElementById('pwToggle');
  const bars = [document.getElementById('b1'), document.getElementById('b2'), document.getElementById('b3')];
  const label = document.getElementById('pwLabel');
  if (!pw || !toggle || !label) return;
  toggle.addEventListener('click', () => {
    const show = pw.type === 'password';
    pw.type = show ? 'text' : 'password';
    toggle.textContent = show ? '隠す' : '表示';
  });
  pw.addEventListener('input', () => {
    const v = pw.value;
    let s = 0;
    if (v.length >= 6) s++;
    if (/[0-9]/.test(v) && /[a-zA-Z]/.test(v)) s++;
    if (v.length >= 10 && /[^a-zA-Z0-9]/.test(v)) s++;
    if (v && s === 0) s = 1;
    const color = s === 1 ? '#f43f5e' : s === 2 ? '#f59e0b' : '#10b981';
    bars.forEach((b, i) => { if (b) b.style.background = i < s ? color : '#e4e4e7'; });
    label.textContent = ['未入力', '弱い（6文字以上推奨）', 'まずまず（記号も追加）', '安全（十分な強度）'][s];
  });
})();
</script>`
  },
  {
    id: 'form-step-progress',
    category: 'forms',
    title: '迷わせないステップバー（「あと何歩で終わるか」を見せる）',
    subtitle: '入力項目が多い申し込みでも 1 → 2 → 3 の現在地とつながる青い線を見せることで途中離脱を防ぎます',
    mechanismTag: 'ステップ番号ノード + 接続プログレスバー伸縮',
    xRayCaption: 'ステップ数に応じた割合（0% / 50% / 100%）で背後の青線の幅を伸ばし、済んだ丸印を緑チェックに変えています',
    interactiveHint: '「再生」または番号や「次へ」を押してステップ進行を確認できます',
    defaultDuration: 0.35,
    durationRange: { min: 0.15, max: 0.9, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① 全工程は 3〜4 ステップ以内に分割する',
        detail: '1画面に20個入力欄を並べるより、3ステップに分けて「もう半分」を見せる方が完了率が上がります。',
        codeHint: 'width: calc(stepIndex * 50%)'
      },
      {
        title: '② 終わったステップは緑のチェック ✓ に変える',
        detail: '完了した実感を積み上げることで最後の「完了する」まで進みやすくなります。',
        codeHint: 'done ? <CheckIcon /> : stepNumber'
      },
      {
        title: '③ 前ステップへ番号タップでも戻れるように',
        detail: '入力内容を直したいとき迷わず前へ戻れる導線を確保します。',
        codeHint: '<button onClick={() => goStep(idx)}>'
      }
    ],
    keywords: ['ステップバー', 'ウィザード', '申し込み手順', 'プログレスバー', '進捗'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '完了チェック付きマルチステップ進捗バー',
        goal: '登録や決済などの複数ステップ入力画面で、「全3ステップ中のどこにいるか」を繋ぐ青い線と完了チェック印で分かりやすく表示したいです。',
        mechanism:
          '横並びのステップ丸印の背後に伸びるプログレスバー（幅: stepIdx/(total-1) * 100%）をトランジションさせ、完了ステップをチェック記号へ差し替えます。',
        requirements: [
          '現在のステップに aria-current="step" を付けて位置関係を明確にする',
          '前の手順へ戻るボタンや残りステップ数を添えて途中で迷わないようにする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="step-card">
  <div class="step-track">
    <div class="step-bg"></div>
    <div id="stepBar" class="step-fill" style="transition: width ${params.duration.toFixed(2)}s ${ease};"></div>
    <button type="button" class="step-dot is-current" data-step="0"><span>1</span><small>基本情報</small></button>
    <button type="button" class="step-dot" data-step="1"><span>2</span><small>プラン選択</small></button>
    <button type="button" class="step-dot" data-step="2"><span>3</span><small>完了確認</small></button>
  </div>
  <div class="step-footer">
    <span id="stepText">ステップ 1 / 3：基本情報</span>
    <button type="button" id="nextStepBtn">次へ</button>
  </div>
</div>

<style>
.step-card { max-width: 360px; display: grid; gap: 12px; }
.step-track { position: relative; display: flex; justify-content: space-between; align-items: flex-start; }
.step-bg, .step-fill { position: absolute; left: 14px; top: 14px; height: 2px; }
.step-bg { right: 14px; background: #e4e4e7; }
.step-fill { width: 0%; background: #2563eb; }
.step-dot { position: relative; z-index: 1; background: none; border: none; display: grid; place-items: center; gap: 4px; cursor: pointer; }
.step-dot span { width: 28px; height: 28px; border-radius: 9999px; border: 1px solid #d4d4d8; background: #fff; font: 700 12px/26px sans-serif; color: #71717a; }
.step-dot.is-current span { border-color: #2563eb; color: #1d4ed8; box-shadow: 0 0 0 4px #dbeafe; }
.step-dot.is-done span { border-color: #059669; background: #059669; color: #fff; }
.step-dot small { font-size: 10px; font-weight: 700; color: #52525b; }
.step-footer { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1px solid #e4e4e7; border-radius: 12px; background: #fff; font-size: 12px; font-weight: 700; }
.step-footer button { border: none; border-radius: 8px; padding: 5px 10px; background: #18181b; color: #fff; font-size: 11px; cursor: pointer; }
</style>

<script>
(() => {
  const labels = ['基本情報', 'プラン選択', '完了確認'];
  const dots = document.querySelectorAll('.step-dot');
  const bar = document.getElementById('stepBar');
  const text = document.getElementById('stepText');
  const next = document.getElementById('nextStepBtn');
  let cur = 0;
  const sync = (idx) => {
    cur = idx;
    if (bar) bar.style.width = cur === 0 ? '0px' : 'calc(' + (cur * 50) + '% - ' + (cur * 14) + 'px)';
    if (text) text.textContent = 'ステップ ' + (cur + 1) + ' / 3：' + labels[cur];
    dots.forEach((d, i) => {
      d.classList.toggle('is-done', i < cur);
      d.classList.toggle('is-current', i === cur);
      const badge = d.querySelector('span');
      if (badge) badge.textContent = i < cur ? '✓' : String(i + 1);
    });
  };
  dots.forEach((d, i) => d.addEventListener('click', () => sync(i)));
  if (next) next.addEventListener('click', () => sync((cur + 1) % 3));
})();
</script>`;
    }
  },
  {
    id: 'form-file-dropzone',
    category: 'forms',
    title: '点線ドロップ枠（ドラッグ接近で青くハイライト・添付解除）',
    subtitle: '画像やPDFを枠の上へ持ってきた瞬間に点線と背景が青く反応し、「ここに落とせる」と手触りで伝えます',
    mechanismTag: 'dragover 点線反転 + 添付ファイルチップ表示',
    xRayCaption: 'dragover イベント時に青枠・微小拡大し、ドロップ後はファイル名をサニタイズした添付カードへ切り替えます',
    interactiveHint: '「再生」や「テストファイルを選ぶ」または実際のファイルドラッグでも試せます',
    defaultDuration: 0.25,
    durationRange: { min: 0.1, max: 0.8, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: false,
    steps: [
      {
        title: '① ドロップ予定地の定石は「2px 破線枠」',
        detail: '実線カードと一目で区別できるため、世界共通で「ファイルを置ける場所」と認識されます。',
        codeHint: 'border: 2px dashed #d4d4d8'
      },
      {
        title: '② dragover 中だけ青色＋背景色＋scale(1.01) で迎える',
        detail: 'ファイルの吸い付き感を出すため e.preventDefault() を忘れずに書きます。',
        codeHint: 'onDragOver={(e) => { e.preventDefault(); setOver(true); }}'
      },
      {
        title: '③ 添付ファイル名もサニタイズして安全表示＋×ボタンで削除可',
        detail: 'ファイル名に制御文字が含まれる場合に備え、サニタイズし取り消しボタンを付けます。',
        codeHint: 'sanitizePlainText(file.name, 40)'
      }
    ],
    keywords: ['アップロード', 'ドラッグアンドドロップ', 'ファイル添付', 'ドロップゾーン', 'フォーム'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'ドラッグ接近反応付きファイルアップロード枠',
        goal: '破線で囲まれたファイル受付ボックスにファイルを重ねた瞬間に枠色が青く強調され、添付後は削除ボタン付きカードへ切り替わるUIを作りたいです。',
        mechanism:
          'dragover でハイライト状態へ切り替え、drop やファイル選択後は安全なテキストとしてファイル名・サイズカードを表示します。',
        requirements: [
          'ドロップ以外にも通常のクリック選択ボタンを併用し、スマホ・キーボードでも必ず添付できるようにする',
          'ドラッグ進入時の色・破線・拡大強調は dragleave / drop 時に確実に解除し状態が残らないようにする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div id="dropZone" class="drop-zone">ここにファイルをドロップ</div>

<style>
.drop-zone { border: 2px dashed #d4d4d8; border-radius: 12px; padding: 24px; text-align: center; transition: all ${params.duration.toFixed(2)}s ease; }
.drop-zone.is-over { border-color: #2563eb; background: #eff6ff; transform: scale(1.01); }
</style>

<script>
(() => {
  const z = document.getElementById('dropZone');
  if (!z) return;
  z.addEventListener('dragover', (e) => { e.preventDefault(); z.classList.add('is-over'); });
  z.addEventListener('dragleave', () => z.classList.remove('is-over'));
  z.addEventListener('drop', (e) => {
    e.preventDefault(); z.classList.remove('is-over');
    const file = e.dataTransfer && e.dataTransfer.files[0];
    if (file) z.textContent = '添付済み：' + file.name;
  });
})();
</script>`
  },

  // =========================================================================
  // 14. 案内・戻る・空状態 (#093 - #100)
  // =========================================================================
  {
    id: 'guide-btt-minimal-arrow',
    category: 'guides',
    title: '戻るボタン形態②：スクロール後半だけ浮く控えめ矢印アイコン',
    subtitle: '一番上では隠しておき、少し下へ読み進めた時だけ右下に丸い ↑ ボタンをすっと浮かび上がらせます',
    mechanismTag: 'scroll > 閾値 監視 + フェード＆微小スライド浮上',
    xRayCaption: 'ページ最上部では pointer-events: none で隠れ、52px 以上スクロールすると右下に浮かびます',
    interactiveHint: '「再生」または中身の枠をスクロールし、現れた右下の「↑」ボタンをクリックできます',
    defaultDuration: 0.45,
    durationRange: { min: 0.2, max: 1.2, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 一番上にいる時はボタンを見せない',
        detail: '最初から右下に「↑」があると押しても意味がなく視界ノイズになるため、閾値超えまで隠します。',
        codeHint: 'setShown(el.scrollTop > 52)'
      },
      {
        title: '② 非表示時は opacity: 0 だけでなく pointer-events: none に',
        detail: '透明のままクリックできると意図せず誤クリックされるため必ず当たり判定を消します。',
        codeHint: 'pointer-events: none (when hidden)'
      },
      {
        title: '③ クリックで滑らかに scrollTo({ top: 0 })',
        detail: 'ワープではなく滑らかに戻ることで「ページ先頭へ帰ってきた」感覚を作れます。',
        codeHint: 'window.scrollTo({ top: 0, behavior: "smooth" })'
      }
    ],
    keywords: ['ページトップ', '上に戻る', '控えめ', '矢印', 'スクロール', '追従'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'スクロール後だけ浮かぶミニマル上戻るボタン',
        goal: '初期表示では画面をスッキリ保ち、一定以上スクロールした時だけ右下に小さな丸型「↑」ボタンをフェード出現させたいです。',
        mechanism:
          'scroll 位置が閾値を超えたときだけ is-visible クラスで opacity: 1 / translateY(0) にし、非表示時は pointer-events: none で誤タップを防ぎます。',
        requirements: [
          '非表示状態ではタップできないよう pointer-events: none と aria-hidden を適切に切り替える',
          'ページ上端付近（scrollY <= 300px）では非表示にして本文やヒーロー視認性を妨げないようにする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<button type="button" id="minTopBtn" class="min-top-btn" aria-label="先頭へ戻る">↑</button>

<style>
.min-top-btn {
  position: fixed; right: 20px; bottom: 20px; width: 40px; height: 40px; border-radius: 9999px;
  opacity: 0; transform: translateY(12px); pointer-events: none; transition: opacity ${params.duration.toFixed(2)}s ease, transform ${params.duration.toFixed(2)}s ease;
}
.min-top-btn.is-shown { opacity: 1; transform: translateY(0); pointer-events: auto; }
</style>

<script>
(() => {
  const btn = document.getElementById('minTopBtn');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('is-shown', window.scrollY > 240), { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();
</script>`
  },
  {
    id: 'guide-btt-progress-ring',
    category: 'guides',
    title: '戻るボタン形態③：読了ゲージ円リング付きトップへ戻る',
    subtitle: '戻るボタンの外周が円グラフになっており、「今この記事の何%まで読んだか」をリアルタイムに示します',
    mechanismTag: 'SVG circle stroke-dashoffset + 戻るボタン統合',
    xRayCaption: '円の周長 circumference × (1 - 読了率) を SVG の stroke-dashoffset へ代入しています',
    interactiveHint: '「再生」または中身の文書を上下にスクロールすると青いリングの伸び縮みを見られます',
    defaultDuration: 0.5,
    durationRange: { min: 0.25, max: 1.4, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 円の半径 r から周長（2πr）を計算する',
        detail: 'stroke-dasharray に円1周の長さを渡すと「点線のすき間なし1本リング」が作れます。',
        codeHint: 'const c = 2 * Math.PI * 16'
      },
      {
        title: '② stroke-dashoffset で塗りの残り長さを制御',
        detail: '0% ならオフセット = c（空）、100% ならオフセット = 0（満タン）にします。',
        codeHint: 'stroke-dashoffset = c * (1 - pct / 100)'
      },
      {
        title: '③ 長文ブログ・ドキュメントと特に相性が良い',
        detail: 'あとどれくらいで読み終えるかがさりげなく分かり、そのまま先頭復帰もできます。',
        codeHint: '-rotate-90 で真上12時位置からスタート'
      }
    ],
    keywords: ['読了ゲージ', 'プログレスリング', '円形メーター', 'ページトップ', '戻る', 'SVG'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '読了プログレスリング一体型の先頭へ戻るボタン',
        goal: '長文記事や図鑑ページで、ページの読了割合を外周の青い円リングで示しつつクリックで先頭へ戻れる丸ボタンを右下に置きたいです。',
        mechanism:
          'scroll 進捗（0〜1）から 2πr × (1 - progress) を求め、戻るボタン背景の SVG <circle> の stroke-dashoffset をリアルタイム更新します。',
        requirements: [
          'scroll イベントは passive: true で登録し、描画が重くならないようにする',
          '円周進捗は SVG の transform: rotate(-90deg) を起点にし、真上から時計回りに進むように揃える'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<button type="button" id="bttRingBtn" class="btt-ring" aria-label="先頭へ戻る">
  <svg width="44" height="44" viewBox="0 0 40 40" class="btt-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="16" fill="none" stroke="#e4e4e7" stroke-width="2.5" />
    <circle id="ringBar" cx="20" cy="20" r="16" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="100.53" stroke-dashoffset="100.53" stroke-linecap="round" />
  </svg>
  <span class="btt-arrow" aria-hidden="true">↑</span>
</button>

<style>
.btt-ring { position: fixed; right: 20px; bottom: 20px; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 9999px; border: none; background: #fff; box-shadow: 0 6px 20px rgba(0,0,0,.1); cursor: pointer; opacity: 0; pointer-events: none; transition: opacity ${params.duration.toFixed(2)}s ease; }
.btt-ring.is-visible { opacity: 1; pointer-events: auto; }
.btt-svg { transform: rotate(-90deg); }
#ringBar { transition: stroke-dashoffset ${Math.max(0.08, params.duration * 0.4).toFixed(2)}s linear; }
.btt-arrow { position: absolute; font-size: 14px; font-weight: 800; color: #18181b; }
</style>

<script>
(() => {
  const btn = document.getElementById('bttRingBtn');
  const ring = document.getElementById('ringBar');
  if (!btn || !ring) return;
  const c = 2 * Math.PI * 16;
  const sync = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pct = Math.min(1, Math.max(0, window.scrollY / max));
    ring.style.strokeDashoffset = (c * (1 - pct)).toFixed(2);
    btn.classList.toggle('is-visible', window.scrollY > 180);
  };
  window.addEventListener('scroll', sync, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  sync();
})();
</script>`
  },
  {
    id: 'guide-btt-static-footer',
    category: 'guides',
    title: '戻るボタン形態④：フッター定位置アンカー（浮遊なし・静的配置）',
    subtitle: '追従ボタンをあえて置かずページ末尾にしっかり据え置く、本文の閲覧を邪魔しない最も落ち着いた選択',
    mechanismTag: '追従固定なし + フッター内静的ボタン（静的配置）',
    xRayCaption: '画面右下に浮く部品を作らないため、スマホの小画面でも本文の文字が常に 100% 見えます',
    interactiveHint: '「先頭へ戻る」ボタンを押すと一番上へ滑らかに戻る静的配置の効果を確認できます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.45,
    durationRange: { min: 0.2, max: 1.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 「常に右下に浮遊させる」を疑ってみる',
        detail: 'チャット窓・Cookie帯・戻るボタンが画面隅に重なると非常に窮屈になるため、静的設置も有力解です。',
        codeHint: 'footer border-top bar placement'
      },
      {
        title: '② フッター最上段の右側に落ち着いた枠ボタンで配置',
        detail: '読み終えて視線が最後に辿り着く位置に置くため、「次にどこへ行こう」のタイミングで押せます。',
        codeHint: 'display: flex; justify-content: space-between'
      },
      {
        title: '③ 一番上へ戻る処理だけは滑らかに',
        detail: '配置自体は動かさず、押した先のジャンプ移動だけスムーズにすると洗練されます。',
        codeHint: 'window.scrollTo({ top: 0, behavior: "smooth" })'
      }
    ],
    keywords: ['戻るボタン', 'フッター', '静的', '固定なし', 'アンカー', 'スマホ見やすい'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'フッター定位置の静的な先頭へ戻るボタン',
        goal: '画面の隅にボタンを常時浮遊させず、フッター上部へ自然に組み込んだ「↑ 先頭へ戻る」ボタンを置きたいです。',
        mechanism:
          'position: fixed を使わずフッター領域内の右側へボタンを固定配置し、クリック時のみ smooth scroll でページ先頭へ戻します。',
        isStatic: true,
        requirements: [
          'スマホ横幅でも押しやすいタップ領域（min-height: 36px 以上）を確保する',
          '追従要素を持たずレイアウト最下段に固定されるため、本文の隅を絶対に覆わない'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<footer class="static-footer">
  <span>© KatakataLab</span>
  <a href="#top" class="back-top-anchor">↑ 先頭へ戻る</a>
</footer>

<style>
.static-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-top: 1px solid #e4e4e7; }
.back-top-anchor { font-size: 12px; font-weight: 700; color: #3f3f46; text-decoration: none; }
</style>`
  },
  {
    id: 'guide-dismissible-banner',
    category: 'guides',
    title: '上部の「×で閉じられる」お知らせ告知バナー',
    subtitle: 'セールや新機能の告知をページ最上部に出しつつ、読んだ人が「×」で片付けられる行儀の良い通知帯',
    mechanismTag: '条件レンダリング解除 + 再表示復帰状態',
    xRayCaption: '閉じられた状態（bannerOpen=false）ではDOM高さを残さずスッキリ詰め、誤って閉じても再表示例を学べます',
    interactiveHint: '「再生」または右側の「×」ボタンを押して閉じた時のスッキリ感を確認できます',
    defaultDuration: 0.25,
    durationRange: { min: 0.1, max: 0.6, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 必ず右端に「× 閉じる」ボタンを付ける',
        detail: '閉じられないバナーは全画面の見やすさを奪うため、読後に消せる手段を用意します。',
        codeHint: '<button aria-label="お知らせを閉じる">×</button>'
      },
      {
        title: '② 実サイトではセッション記憶（localStorage 等）と組み合わせる',
        detail: '別ページへ移るたびに何度も同じ通知が出続けないよう閉じた記録を安全に保持します。',
        codeHint: 'sessionStorage / state toggle'
      },
      {
        title: '③ 文言は1行・50文字以内に収める',
        detail: 'スマホで2行3行に膨らむとヘッダーが下に押し出されすぎるため簡潔に書きます。',
        codeHint: 'truncate / concise 1-line announcement'
      }
    ],
    keywords: ['バナー', 'お知らせ', '閉じる', '告知', 'キャンペーン', '通知バー'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '×ボタンで閉じられる告知バナー',
        goal: 'ページ最上部にキャンペーンや新着のお知らせ帯を表示し、不要になったユーザーが右端の × ボタンで閉じられるようにしたいです。',
        mechanism:
          '閉じるボタンで表示フラグを false にしてレイアウトから安全に取り除き、実運用では状態またはストレージへ閉じた記録を残します。',
        requirements: [
          'モバイル画面でも文字が画面外にはみ出さないようフレックス折り返し・文字省略を行う',
          '閉じるボタンには分かりやすい aria-label を付け、消える際は不透明度変化で唐突さを抑える'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div id="topBanner" class="banner" role="region" aria-label="お知らせ">
  <span class="banner-text">新プラン公開中：年額払いで 20% 割引キャンペーン実施中</span>
  <button type="button" id="closeBannerBtn" aria-label="閉じる">×</button>
</div>

<style>
.banner { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; border-radius: 12px; background: #2563eb; color: #fff; font-size: 12px; font-weight: 600; transition: opacity ${params.duration.toFixed(2)}s ease, transform ${params.duration.toFixed(2)}s ease; }
.banner.is-closing { opacity: 0; transform: translateY(-6px); }
.banner-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#closeBannerBtn { flex-shrink: 0; border: none; border-radius: 6px; padding: 2px 8px; background: rgba(255,255,255,.15); color: #fff; cursor: pointer; }
</style>

<script>
(() => {
  const b = document.getElementById('topBanner');
  const btn = document.getElementById('closeBannerBtn');
  if (!b || !btn) return;
  btn.addEventListener('click', () => {
    b.classList.add('is-closing');
    setTimeout(() => b.remove(), ${Math.round(params.duration * 1000)});
  });
})();
</script>`
  },
  {
    id: 'guide-tooltip-popover',
    category: 'guides',
    title: '「？」に重ねるとふわりと開く吹き出し補足ツールチップ',
    subtitle: '用語の意味や割引条件など「常に書くと画面がうるさい補足」だけを必要な人向けに出し入れする吹き出し',
    mechanismTag: 'relative 親基準 + bottom: full 吹き出し + 三角しっぽ',
    xRayCaption: '「補足説明を見る」ボタンの真上に CSS ボーダー三角しっぽ付き吹き出しを配置しています',
    interactiveHint: '「再生」またはボタンにホバー／クリックして吹き出しの開閉を試せます',
    defaultDuration: 0.2,
    durationRange: { min: 0.1, max: 0.6, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: false,
    steps: [
      {
        title: '① 必須情報ではなく「補足情報」だけをしまう',
        detail: '絶対に読ませたい注意書きをツールチップに隠すと見落とされるため、補足に絞ります。',
        codeHint: 'role="tooltip"'
      },
      {
        title: '② スマホ（ホバーなし）向けにクリック開閉も必ず対応',
        detail: 'onClick でも開閉できるようにするとタッチデバイスでも同じ補足が読めます。',
        codeHint: 'hover + click toggle'
      },
      {
        title: '③ しっぽ三角形はボーダー透明 trick で綺麗に描く',
        detail: 'border-top-color だけ色を付けた高さ0要素でピタッとボタン真上へ指させます。',
        codeHint: 'border: 4px solid transparent; border-top-color: #18181b'
      }
    ],
    keywords: ['ツールチップ', 'ポップオーバー', '吹き出し', '補足', 'ヘルプ', '？'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'ホバー＆タップ両対応の吹き出しツールチップ',
        goal: '「？」マークや補足ボタンの真上に、必要な時だけわかりやすい短い吹き出しツールチップが出る仕組みを作りたいです。',
        mechanism:
          'トリガー要素を基準（position: relative）にして真上に吹き出し要素（bottom: 100%）と三角矢印を重ね、hover とクリック両方で開閉します。',
        requirements: [
          'role="tooltip" と aria-describedby を紐づけてアクセシビリティにも対応する',
          'マウスホバーだけでなくクリック／タップや :focus-visible フォーカスでも補足を読めるようにする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="tip-wrap">
  <button type="button" id="tipTrigger" class="tip-btn" aria-describedby="tipBox" aria-expanded="false">？ 補足説明を見る</button>
  <div id="tipBox" role="tooltip" class="tip-pop">2ヶ月分お得になります</div>
</div>

<style>
.tip-wrap { position: relative; display: inline-block; }
.tip-btn { border: 1px solid #d4d4d8; border-radius: 9999px; background: #fff; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; }
.tip-pop {
  position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%) translateY(4px);
  opacity: 0; pointer-events: none; background: #18181b; color: #fff; padding: 7px 11px; border-radius: 10px;
  white-space: nowrap; font-size: 11px; box-shadow: 0 8px 20px rgba(0,0,0,.18);
  transition: opacity ${params.duration.toFixed(2)}s ${ease}, transform ${params.duration.toFixed(2)}s ${ease};
}
.tip-pop::after { content: ""; position: absolute; top: 100%; left: 50%; margin-left: -4px; border: 4px solid transparent; border-top-color: #18181b; }
.tip-wrap:hover .tip-pop, .tip-wrap.is-open .tip-pop { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto; }
</style>

<script>
(() => {
  const wrap = document.querySelector('.tip-wrap');
  const btn = document.getElementById('tipTrigger');
  if (!wrap || !btn) return;
  btn.addEventListener('click', () => {
    const open = wrap.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
  });
})();
</script>`;
    }
  },
  {
    id: 'guide-empty-state',
    category: 'guides',
    title: 'データ0件「まだ何もありません」の案内デザイン（エンプティステート）',
    subtitle: '検索結果0件やリスト空っぽの時に「真っ白な空白」にせず、原因と次に押すべき1ボタンを示す安心設計',
    mechanismTag: '空状態専用ブロック + 回復CTA 1個（静的構成）',
    xRayCaption: '「一致なし」で終わらせず「条件をリセットして戻る」という次の行動ボタンを1つ添えるのがプロ仕様です',
    interactiveHint: '「条件をリセットして戻る」を押してリスト状態との切り替えを確認できます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.25,
    durationRange: { min: 0.15, max: 0.6, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 0件のまま画面を真っ白（何も表示しない）にしない',
        detail: 'バグや通信エラーと誤解されるため、専用アイコン＋一言で「正しく0件である」と伝えます。',
        codeHint: '{items.length === 0 && <EmptyState />}'
      },
      {
        title: '② なぜ空なのか・次どうすればいいかを1文ずつ',
        detail: '「条件を広げる」「新規作成する」など解決する道筋を短く提示します。',
        codeHint: '原因説明 + 次アクション 1 つ'
      },
      {
        title: '③ リカバリーボタンを必ず 1 つ置く',
        detail: '検索条件リセットやサンプル追加ボタンがあると、ユーザーは袋小路に入りません。',
        codeHint: '<button onClick={reset}>条件をリセット</button>'
      }
    ],
    keywords: ['空状態', 'エンプティステート', '0件', '見つかりません', '静的', '案内'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '次の行動を案内するエンプティステート設計',
        goal: '検索結果が0件のときや初期状態でデータがないときに、真っ白な画面ではなく丁寧なメッセージと「リセット／追加」ボタンを1つ表示したいです。',
        mechanism:
          'データ配列長が 0 の分岐に破線枠・アイコン・理由メッセージ・復帰用CTAボタンを備えた専用コンポーネントをレンダリングします。',
        isStatic: true,
        requirements: [
          'スマホ幅でも中央揃え・適度な余白（padding）を保ち窮屈に見せない',
          'なぜ表示がないのかの簡潔な理由と、条件リセットや新規作成など「次の一歩」のボタンを 1 つ添える'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<div class="empty-box" role="status">
  <div class="empty-icon" aria-hidden="true">📥</div>
  <p class="empty-title">一致する項目がありません</p>
  <p class="empty-sub">条件をリセットするとすべての項目を再表示できます。</p>
  <button type="button" class="empty-cta">条件をリセットして戻る</button>
</div>

<style>
.empty-box { max-width: 340px; border: 1px dashed #d4d4d8; border-radius: 14px; background: #fff; padding: 20px; text-align: center; }
.empty-icon { width: 36px; height: 36px; margin: 0 auto 8px; border-radius: 9999px; background: #f4f4f5; display: grid; place-items: center; }
.empty-title { margin: 0; font-size: 13px; font-weight: 700; color: #18181b; }
.empty-sub { margin: 4px 0 12px; font-size: 12px; color: #71717a; }
.empty-cta { border: none; border-radius: 8px; padding: 7px 14px; background: #18181b; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
</style>`
  },
  {
    id: 'guide-pagination-vs-more',
    category: 'guides',
    title: 'ページ送り「1・2・3」vs「もっと見る追加」の使い分け（静的）',
    subtitle: '戻りたい場所を覚えられる番号式と、気軽に見続けられる追加式をスイッチして役割の違いを体験できます',
    mechanismTag: 'ページ分割番号 vs 追記スライス読み込み（静的配置）',
    xRayCaption: '資料・図鑑・検索には「番号」、SNS・画像ギャラリーには「もっと見る」が向く違いを並べて試せます',
    interactiveHint: '上の切り替えタブで「ページ番号」と「もっと見る」の両方の動きを試せます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.25,
    durationRange: { min: 0.15, max: 0.6, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 「あとで3ページ目に戻りたい」サイトは番号（1・2・3）',
        detail: 'EC商品や検索結果ではページ位置が記憶でき、フッターにもすぐ辿り着けます。',
        codeHint: 'items.slice((page - 1) * perPage, page * perPage)'
      },
      {
        title: '② 流し見したい一覧は「もっと見る（追記）」',
        detail: '画面遷移なしで縦に継ぎ足すことでリズムよく次々チェックできます。',
        codeHint: 'items.slice(0, visibleCount)'
      },
      {
        title: '③ 自動無限スクロールよりボタン型「もっと見る」が安全な場合も多い',
        detail: '下にあるフッターを押したいのに逃げていくストレスを防げます。',
        codeHint: '<button onClick={() => setCount(c => c + 10)}>もっと見る</button>'
      }
    ],
    keywords: ['ページネーション', 'ページ送り', 'もっと見る', '一覧読み込み', '比較', '静的'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '用途別ページング比較（ページ番号 vs もっと見る）',
        goal: '大量の一覧データを見せるとき、場所を記憶しやすい「1・2・3 番号式」とテンポ良く増やせる「もっと見る追加式」を要件に合わせて作り分けたいです。',
        mechanism:
          '配列の切り出しを page 指定の slice 制御（ページ番号）または表示件数上限加算制御（もっと見る）で安全に行います。',
        isStatic: true,
        requirements: [
          '全件表示に達したら「もっと見る」ボタンを非表示または完了状態へ切り替える',
          '選択中のページ番号には aria-current="page" を付け、切り替え後の総件数も読み上げ可能にする'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<div class="paging-box">
  <!-- パターンA：ページ番号式 -->
  <nav aria-label="ページ送り" class="pager">
    <button type="button" class="is-active" aria-current="page">1</button>
    <button type="button">2</button>
    <button type="button">3</button>
  </nav>
  <!-- パターンB：追記「もっと見る」式 -->
  <button type="button" id="loadMoreBtn" class="more-btn">＋ 次の項目を読み込む（<span id="shownCnt">2</span>/6件）</button>
</div>

<style>
.paging-box { display: grid; gap: 10px; max-width: 340px; }
.pager { display: flex; gap: 6px; }
.pager button { width: 28px; height: 28px; border-radius: 6px; border: 1px solid #e4e4e7; background: #fff; font-weight: 700; cursor: pointer; }
.pager button.is-active { background: #2563eb; border-color: #2563eb; color: #fff; }
.more-btn { border: 1px solid #d4d4d8; border-radius: 10px; padding: 8px 12px; background: #fafafa; font-size: 12px; font-weight: 700; cursor: pointer; }
</style>

<script>
(() => {
  const btn = document.getElementById('loadMoreBtn');
  const cnt = document.getElementById('shownCnt');
  if (!btn || !cnt) return;
  let total = 2;
  btn.addEventListener('click', () => {
    total = total >= 6 ? 2 : total + 2;
    cnt.textContent = String(total);
  });
})();
</script>`
  },
  {
    id: 'guide-inline-confirm',
    category: 'guides',
    title: 'アラート窓を開かない「その場2段階確認」ボタン',
    subtitle: 'ブラウザ標準の confirm() や大きいダイアログを出さず、ボタンのその場で「本当に？ [はい] [戻る]」を展開します',
    mechanismTag: '3状態ステートマシン（idle → ask → done）',
    xRayCaption: '状態変数（idle / ask / done）を切り替えるだけで画面全体を遮らず確実に確認ワンクッションを挟みます',
    interactiveHint: '「再生」または「この下書きを削除する」を押して2段階ボタンの展開を試せます',
    defaultDuration: 0.25,
    durationRange: { min: 0.1, max: 0.7, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: false,
    steps: [
      {
        title: '① リスト行内の削除などには画面全体モーダルは大げさすぎる',
        detail: '視線を画面中央へ飛ばさず、今指やカーソルがある場所で確認を終えられるため快適です。',
        codeHint: 'phase: "idle" | "ask" | "done"'
      },
      {
        title: '② 本当に実行ボタンとキャンセル（戻る）ボタンの色分けを明快に',
        detail: '危険操作は赤塗り、キャンセルは白背景で押すべき位置を取り違えないようにします。',
        codeHint: '[ はい、削除 (赤) ] [ 戻る (白) ]'
      },
      {
        title: '③ confirm() のブロックを使わないため非同期UXと調和する',
        detail: '現代のWebアプリ標準のデザインとして、画面のトーンを壊さず安全確認を実装できます。',
        codeHint: 'onClick={() => setPhase("ask")}'
      }
    ],
    keywords: ['確認ボタン', 'インライン確認', '2段階', '削除確認', 'モーダルレス', '安全'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'モーダル不要のその場2段階確認UI',
        goal: 'リスト項目などの削除・取消操作時に、全画面ダイアログや window.confirm() を開かずその場で「本当に実行しますか？ [はい][戻る]」を展開したいです。',
        mechanism:
          'idle / ask / done の状態に応じてボタン領域の内容をインラインで切り替え、視線移動ゼロで二重確認を行います。',
        requirements: [
          '展開直後にボタン位置が急激にズレて誤爆しないよう十分な間隔・色差を持たせる',
          'モーダルを出さずにその場で確定・取消へ戻る際もコンテナ高（min-height）を一定に保ち周囲を動かさない'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div id="inlineBox" class="inline-confirm"></div>

<style>
.inline-confirm { display: inline-flex; align-items: center; gap: 8px; min-height: 36px; font-size: 13px; }
.btn-del, .btn-danger, .btn-cancel { transition: background-color ${params.duration.toFixed(2)}s ease, transform ${params.duration.toFixed(2)}s ease; }
.btn-del { padding: 7px 14px; border: 1px solid #fecdd3; border-radius: 8px; background: #fff1f2; color: #be123c; font-weight: 700; cursor: pointer; }
.btn-danger { padding: 7px 14px; border: none; border-radius: 8px; background: #e11d48; color: #fff; font-weight: 700; cursor: pointer; }
.btn-cancel { padding: 7px 12px; border: 1px solid #e4e4e7; border-radius: 8px; background: #fff; color: #3f3f46; font-weight: 600; cursor: pointer; }
.confirm-done { color: #16a34a; font-weight: 700; }
</style>

<script>
(() => {
  const box = document.getElementById('inlineBox');
  if (!box) return;
  const renderIdle = () => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn-del'; b.textContent = 'この項目を削除';
    b.onclick = renderAsk;
    box.replaceChildren(b);
  };
  const renderAsk = () => {
    const ok = document.createElement('button');
    ok.type = 'button'; ok.className = 'btn-danger'; ok.textContent = 'はい、削除する';
    ok.onclick = () => {
      const done = document.createElement('span');
      done.className = 'confirm-done';
      done.textContent = '✓ 削除しました';
      box.replaceChildren(done);
    };
    const cancel = document.createElement('button');
    cancel.type = 'button'; cancel.className = 'btn-cancel'; cancel.textContent = '戻る';
    cancel.onclick = renderIdle;
    box.replaceChildren(ok, cancel);
  };
  renderIdle();
})();
</script>`
  }
];
