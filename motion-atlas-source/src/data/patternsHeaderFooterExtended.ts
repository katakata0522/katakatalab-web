import type { MotionPattern } from '../types/motion';
import { EASING_OPTIONS, buildStructuredPrompt } from '../utils/motionHelpers';

export const HEADER_FOOTER_EXTENDED_PATTERNS: MotionPattern[] = [
  {
    id: 'hdr-link-hover-grow',
    category: 'header',
    title: 'リンク表現①：ホバー／選択でほんのり大きく濃くなる',
    subtitle: '線や箱を追加せず、文字の色が黒く濃くなりつつ 1.06 倍にふわっと浮き立つ一番シンプルな反応',
    mechanismTag: '文字色深化 + 微小 scale(1.08)',
    xRayCaption: '装飾線を使わないためごちゃつかず、文字の濃さと 5〜8% の拡大だけで「押せる」と伝えます',
    interactiveHint: '「再生」またはリンク文字（「特徴」「機能」「料金」「事例」）へ乗せて試せます',
    defaultDuration: 0.25,
    durationRange: { min: 0.1, max: 0.9, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 通常時の文字色を薄めのグレー（#71717a）に抑える',
        detail: '最初から真っ黒にせず余力を残すことで、ホバー時の黒変とわずかな拡大が引き立ちます。',
        codeHint: 'color: #71717a → #09090b'
      },
      {
        title: '② transform: scale(1.06) で周囲を押さずに拡大',
        detail: 'font-size を変えると隣の文字まで横ズレしてガタつくため、必ず transform: scale を使います。',
        codeHint: 'transform: scale(1.08) translateY(-1px)'
      },
      {
        title: '③ 速さは 0.18〜0.25秒 の軽快テンポに',
        detail: 'メニュー反応は遅いと重たく感じるため、素早くスッと反応させるのがコツです。',
        codeHint: 'transition: transform 0.2s, color 0.2s'
      }
    ],
    keywords: ['ヘッダー', 'リンク', 'ホバー', '拡大', '大きくなる', 'シンプル', 'メニュー'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'ホバーでほんのり大きく濃くなるヘッダーリンク',
        goal: 'ヘッダーのナビゲーションリンクにカーソルを乗せたとき、背景枠や下線を付けずに文字色の濃化とごく小さな拡大（scale 1.08）で反応させる。',
        mechanism: 'font-size を変えずに transform: scale(1.08) と color トランジションを組み合わせ、周囲レイアウトのガタつきをゼロに抑える。',
        requirements: [
          '周囲の項目が横にズレないよう font-weight 変化ではなく color + transform で反応させる',
          'キーボード操作時の :focus-visible でもホバーと同等の強調と視認できるフォーカスリングを表示する'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<nav class="grow-nav">
  <a href="#features">特徴</a>
  <a href="#guide">機能</a>
  <a href="#pricing">料金</a>
</nav>

<style>
.grow-nav { display: flex; gap: 24px; }
.grow-nav a {
  color: #71717a;
  text-decoration: none;
  font-weight: 600;
  transition: transform ${params.duration.toFixed(2)}s ease, color ${params.duration.toFixed(2)}s ease;
}
.grow-nav a:hover {
  color: #09090b;
  transform: scale(1.08) translateY(-1px);
}
</style>`
  },
  {
    id: 'hdr-link-underline',
    category: 'header',
    title: 'リンク表現②：クリック・現在地で下にアンダーラインが引かれる',
    subtitle: '選んだメニューの真下にだけ細いラインがスッと伸びて、「いまこのページを開いている」印を残す型',
    mechanismTag: '::after 疑似要素 + scaleX(0 → 1)',
    xRayCaption: 'クリック／現在地になったリンクの底辺に置いた 2px の線が左端を支点に横へ伸びています',
    interactiveHint: '「再生」またはヘッダー内の項目をクリックすると下線が切り替わります',
    defaultDuration: 0.35,
    durationRange: { min: 0.15, max: 1.2, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: true,
    steps: [
      {
        title: '① リンクを position: relative、高さをヘッダーと揃える',
        detail: '下の境界線に沿って綺麗に線が乗るよう、上下いっぱいの基準枠を作ります。',
        codeHint: 'position: relative; height: 100%'
      },
      {
        title: '② 底辺に太さ 2px のライン（::after）を透明縮小待機',
        detail: 'transform: scaleX(0) と transform-origin: left を指定して左端に畳んでおきます。',
        codeHint: 'transform: scaleX(0); transform-origin: left'
      },
      {
        title: '③ 現在ページ／ホバー時に scaleX(1) へ展開',
        detail: '現在ページ（aria-current="page"）の線は引いたまま残すと現在地が一目で分かります。',
        codeHint: 'a[aria-current="page"]::after { transform: scaleX(1); }'
      }
    ],
    keywords: ['ヘッダー', 'リンク', '下線', 'アンダーライン', '現在地', 'アクティブ', 'クリック'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '下線（アンダーライン）が引かれるヘッダーリンク',
        goal: 'ヘッダー項目にホバーまたは選択（現在地）すると、底辺に 2px のアンダーラインが左からスッと伸びて現在地を示すナビにする。',
        mechanism: '::after 疑似要素に scaleX(0 → 1) + transform-origin: left を指定し、aria-current="page" 時は表示維持。',
        requirements: [
          '現在のページ項目には aria-current="page" を付けて下線を固定表示する',
          '幅の変更ではなく ::after の transform: scaleX() を使い周辺レイアウトの再計算を起こさないようにする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<nav class="line-nav" id="lineNav">
  <a href="#a" class="is-active" aria-current="page">特徴</a>
  <a href="#b">機能</a>
  <a href="#c">料金</a>
</nav>

<style>
.line-nav { display: flex; gap: 24px; border-bottom: 1px solid #e4e4e7; }
.line-nav a {
  position: relative;
  padding: 12px 0;
  color: #71717a;
  text-decoration: none;
  font-weight: 600;
}
.line-nav a::after {
  content: "";
  position: absolute;
  inset: auto 0 -1px 0;
  height: 2px;
  background: #2563eb;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform ${params.duration.toFixed(2)}s ${ease};
}
.line-nav a:hover, .line-nav a.is-active { color: #09090b; }
.line-nav a:hover::after, .line-nav a.is-active::after { transform: scaleX(1); }
</style>

<script>
(() => {
  const links = Array.from(document.querySelectorAll('#lineNav a'));
  links.forEach((link) => {
    link.addEventListener('click', () => {
      links.forEach((el) => {
        const active = el === link;
        el.classList.toggle('is-active', active);
        active ? el.setAttribute('aria-current', 'page') : el.removeAttribute('aria-current');
      });
    });
  });
})();
</script>`;
    }
  },
  {
    id: 'hdr-link-pill-active',
    category: 'header',
    title: 'リンク表現③：薄グレー帯の中で現在地だけ丸く枠囲み',
    subtitle: 'この図鑑のナビと同じ系譜。非選択は控えめなグレーにし、選んだ場所だけをくっきり角丸ピルで包む設計',
    mechanismTag: 'グレー帯トレイ + 選択ピル（黒塗り / 白抜き）',
    xRayCaption: '薄いグレー帯を「器」にして現在地ボタンだけ濃いピルに変えるため、どこにいるか一目で把握できます',
    interactiveHint: '「再生」または丸枠内の各項目をクリックして現在地を切り替えられます',
    defaultDuration: 0.3,
    durationRange: { min: 0.1, max: 1.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① ナビ全体を薄いグレー（#f4f4f5）の角丸帯でまとめる',
        detail: 'バラバラに文字を並べるより 1 つの操作島としてまとまりが生まれます。',
        codeHint: 'border-radius: 9999px; background: #f4f4f5; padding: 4px'
      },
      {
        title: '② 非選択項目は落ち着いたグレー文字のまま待機',
        detail: '選択していない項目の主張を抑えることで、現在地のピルが真っ先に目に飛び込みます。',
        codeHint: 'color: #71717a'
      },
      {
        title: '③ 現在地だけ背景黒＋白文字の丸枠へ切り替える',
        detail: 'ホバー時だけ薄白（rgba(255,255,255,0.7)）を敷くと操作前後の違いも明確です。',
        codeHint: 'background: #18181b; color: #ffffff'
      }
    ],
    keywords: ['ヘッダー', 'リンク', 'ピル', '囲む', '丸枠', '現在地', 'グレーアウト'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '薄グレー帯＋丸ピル囲みの現在地ヘッダーリンク',
        goal: 'ヘッダーのリンク群を薄いグレーの角丸トレイに入れ、非選択リンクは薄グレー文字に抑えて現在選択中のリンクだけを濃い角丸ピルで囲む。',
        mechanism: 'トレイ枠と角丸ボタン群により、色コントラストだけで現在地と待機中を明確に区別。',
        requirements: [
          '現在のページ項目には aria-current="page" を付与して背景色を濃くする',
          '横幅が狭い画面でもピル内テキストが折り返されないよう white-space: nowrap と適切な横スクロール余白を確保する'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<nav class="pill-tray" id="pillTray">
  <a href="#a" class="is-active" aria-current="page">特徴</a>
  <a href="#b">機能</a>
  <a href="#c">料金</a>
</nav>

<style>
.pill-tray {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 9999px;
  background: #f4f4f5;
}
.pill-tray a {
  padding: 6px 14px;
  border-radius: 9999px;
  color: #71717a;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all ${params.duration.toFixed(2)}s ease;
}
.pill-tray a:hover { background: rgba(255, 255, 255, 0.75); color: #18181b; }
.pill-tray a.is-active { background: #18181b; color: #ffffff; }
</style>

<script>
(() => {
  const links = Array.from(document.querySelectorAll('#pillTray a'));
  links.forEach((link) => {
    link.addEventListener('click', () => {
      links.forEach((el) => {
        const active = el === link;
        el.classList.toggle('is-active', active);
        active ? el.setAttribute('aria-current', 'page') : el.removeAttribute('aria-current');
      });
    });
  });
})();
</script>`
  },
  {
    id: 'hdr-announcement-two-tier',
    category: 'header',
    title: '2段構えヘッダー（上にお知らせ細帯＋下にメニュー）',
    subtitle: '本ヘッダーのデザインを壊さず、最上段の薄いお知らせ帯でキャンペーンや新着アップデートを知らせる構造',
    mechanismTag: '2層ヘッダー（お知らせ帯 + メインヘッダー）',
    xRayCaption: '普段のヘッダーの上に 32px ほどの濃い細帯を積み上げ、× ボタンでいつでも非表示にできるようにします',
    interactiveHint: '「PC / スマホ」切替や、上帯の「×」ボタン閉じ動作も試せます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.35,
    durationRange: { min: 0.15, max: 1.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① お知らせ帯は高さ 32〜36px の超スリム設計にする',
        detail: '太すぎると主役コンテンツを押し下げるため、1行だけで収まる細い帯に留めます。',
        codeHint: 'padding: 6px 16px; font-size: 12px'
      },
      {
        title: '② 本ヘッダーと強いコントラスト（黒×白）で役割分離',
        detail: 'メニューと混ざらないよう色味を変えると「これはお知らせ」と一目で区別できます。',
        codeHint: 'background: #18181b; color: #ffffff'
      },
      {
        title: '③ ユーザーが閉じられる × ボタンを右端に添える',
        detail: '読み終えた人が自分で畳めるようにするとサイト全体の使い心地が上がります。',
        codeHint: 'aria-label="お知らせを閉じる"'
      }
    ],
    keywords: ['ヘッダー', 'お知らせ', '2段', 'バナー', 'アナウンス', '静的'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'お知らせ帯＋メインメニューの2段構えヘッダー',
        goal: 'メインの1行ヘッダーの上部に、閉じるボタン付きのスリークなお知らせ帯を乗せた2段構造のヘッダーを作る。',
        mechanism: '上段の細帯お知らせバー（背景コントラスト強め）＋下段の通常ナビゲーションバーを縦積み。',
        isStatic: true,
        requirements: [
          'お知らせバー右端に「×（閉じる）」ボタンを置き、閉じられるようにする',
          '高さを抑えてファーストビューを圧迫しないようにする'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<div class="top-wrapper">
  <div class="top-notice" id="topNotice">
    <span>新機能：通し番号検索（#001〜）に対応しました</span>
    <button type="button" id="closeNotice" aria-label="お知らせを閉じる">×</button>
  </div>
  <header class="main-head">
    <strong>Atlas</strong>
    <nav><a href="#features">機能</a><a href="#pricing">料金</a></nav>
  </header>
</div>

<style>
.top-notice {
  display: flex; align-items: center; justify-content: space-between;
  background: #18181b; color: #ffffff; padding: 6px 20px; font-size: 12px;
}
.top-notice button { border: 0; background: transparent; color: #a1a1aa; cursor: pointer; }
.main-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; background: #ffffff; border-bottom: 1px solid #e4e4e7;
}
.main-head nav { display: flex; gap: 20px; font-size: 13px; }
</style>

<script>
(() => {
  const bar = document.getElementById('topNotice');
  const btn = document.getElementById('closeNotice');
  if (!bar || !btn) return;
  btn.addEventListener('click', () => { bar.hidden = true; });
})();
</script>`
  },
  {
    id: 'hdr-transparent-to-solid',
    category: 'header',
    title: 'ヒーロー透明ヘッダー → スクロールで白背景バーに変化',
    subtitle: '大きな写真の最上部では透明＋白文字で景色を遮らず、下に読むと白背景＋黒文字の読みやすいバーへ切り替わる演出',
    mechanismTag: '背景色・文字色クロスフェード（scrollY > しきい値）',
    xRayCaption: '最上部（0〜28px）では background: transparent、それより下では白い固定バー＋境界線へ変化します',
    interactiveHint: '「再生」または枠内の本文をスクロールして色の切り替わりを確認できます',
    defaultDuration: 0.4,
    durationRange: { min: 0.15, max: 1.2, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 初期状態は透明背景＋白文字で写真の上に重ねる',
        detail: 'position: fixed でファーストビュー写真の上に載せ、世界観を遮らないようにします。',
        codeHint: 'background: transparent; color: #ffffff'
      },
      {
        title: '② スクロール量がしきい値を超えたら is-solid 付与',
        detail: '写真が通り過ぎて白い記事部分に入るタイミングで、ヘッダーを白背景＋黒文字へ変えます。',
        codeHint: 'header.classList.toggle("is-solid", window.scrollY > 60)'
      },
      {
        title: '③ 背景にわずかな透過ぼかしと下線を添える',
        detail: '白背景になった後は境界線がはっきりし、下の本文文字が透けて読みにくくなるのを防ぎます。',
        codeHint: 'background: rgba(255,255,255,0.95); backdrop-filter: blur(8px)'
      }
    ],
    keywords: ['ヘッダー', '透明', '透過', 'スクロール', '切り替わり', 'ヒーロー', '白文字'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'ヒーロー透過 → スクロール白背景ヘッダー',
        goal: '画面最上部では透明＋白文字でメインビジュアルに溶け込み、一定量スクロールすると白背景＋黒文字＋細線ボーダーへ滑らかに切り替わる固定ヘッダーを作る。',
        mechanism: 'window.scrollY > 60 を判定し、is-solid クラスの ON/OFF で background-color / color / border-color をトランジション切り替え。',
        requirements: [
          '透明時は写真と文字のコントラストが落ちないよう背景に暗いグラデーションを重ねる',
          '文字色・ボタン色のコントラストも白背景後に合わせて同時切り替えする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<header id="heroHeader" class="hero-header">
  <span class="brand">Horizon</span>
  <nav><a href="#works">作品</a><a href="#contact">連絡</a></nav>
</header>

<style>
.hero-header {
  position: fixed;
  inset: 0 0 auto 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  color: #ffffff;
  background: transparent;
  transition: background-color ${params.duration.toFixed(2)}s ease, color ${params.duration.toFixed(2)}s ease;
  z-index: 50;
}
.hero-header.is-solid {
  background: rgba(255, 255, 255, 0.95);
  color: #18181b;
  border-bottom: 1px solid #e4e4e7;
  backdrop-filter: blur(8px);
}
</style>

<script>
(() => {
  const header = document.getElementById('heroHeader');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('is-solid', window.scrollY > 60);
  }, { passive: true });
})();
</script>`
  },
  {
    id: 'hdr-rail-sidebar',
    category: 'header',
    title: '左固定サイドレール型ナビ（図鑑・管理ツール向け2ペイン）',
    subtitle: '上ではなく左端に縦長メニューを常設し、右側すべてを主役コンテンツに使える情報整理に強い構造',
    mechanismTag: '2ペイン Grid + 左サイド sticky 固定',
    xRayCaption: '左列幅（180〜240px）にカテゴリ一覧を常時表示し、スマホ幅では上部のバーへ折りたたみます',
    interactiveHint: '「PC / スマホ」で左レールがスマホ上バーへ変わる様子を確認できます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.35,
    durationRange: { min: 0.15, max: 1.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 左固定幅＋右可変幅（1fr）の2列を作る',
        detail: 'カテゴリ数が 6〜15 個ある図鑑やドキュメントでは、縦並びの方が一目で全体を見渡せます。',
        codeHint: 'grid-template-columns: 240px 1fr'
      },
      {
        title: '② 左ナビには position: sticky; top: 0 を掛ける',
        detail: '右の長い一覧を下まで読んでも、左のメニューが迷子にならず手元に残ります。',
        codeHint: 'position: sticky; top: 20px'
      },
      {
        title: '③ スマホ幅では左レールを畳んで上バー＋ドロワーへ',
        detail: '横幅が狭い画面では縦1列に戻し、ハンバーガーメニューに収納します。',
        codeHint: '@media (max-width: 1023px)'
      }
    ],
    keywords: ['サイドバー', '左固定', 'サイドレール', '2ペイン', '図鑑', '静的', 'ヘッダー'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '左固定サイドレール型ナビ（2ペイン構造）',
        goal: '上ヘッダーを増やす代わりに左側に縦長メニューを固定配置し、右側全体を広々した主役エリアとして使える 2 ペイン構成にする。',
        mechanism: 'PC幅は 240px + 1fr の Grid＋sticky、モバイル幅では 1 列へ崩して上部ナビバー＋ドロワーに切り替える。',
        isStatic: true,
        requirements: [
          'カテゴリが増えてもはみ出さないようサイドバー自体に max-height と overflow-y: auto を設ける',
          'タブレット・スマホ幅（1023px 以下）では左レールを上部バー＋ドロワーへ切り替え、本文領域を確保する'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<div class="shell">
  <aside class="side-rail">
    <strong>SideRail</strong>
    <nav><a href="#s1" class="is-active">01 概要</a><a href="#s2">02 仕組み</a><a href="#s3">03 設定</a></nav>
  </aside>
  <main class="main-canvas">右側のコンテンツ領域</main>
</div>

<style>
.shell { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
.side-rail {
  position: sticky; top: 0; align-self: start; height: 100vh;
  padding: 20px; border-right: 1px solid #e4e4e7; background: #fafafa;
}
.side-rail nav { display: grid; gap: 6px; margin-top: 16px; }
.side-rail a { padding: 8px 10px; border-radius: 8px; text-decoration: none; color: #52525b; font-size: 13px; }
.side-rail a.is-active { background: #ffffff; color: #1d4ed8; font-weight: 700; }
.main-canvas { padding: 28px; }
@media (max-width: 767px) {
  .shell { grid-template-columns: 1fr; }
  .side-rail { position: static; height: auto; border-right: 0; border-bottom: 1px solid #e4e4e7; }
}
</style>`
  },
  {
    id: 'ftr-cta-docked',
    category: 'footer',
    title: '大きなCTAバナー一体型フッター（着地＋次の一歩）',
    subtitle: 'ページを最後まで読み終えた人のために、フッター最上部に目立つアクションカードを融合させた着地設計',
    mechanismTag: '暗色フッター内 ＋ ハイコントラスト CTA カード',
    xRayCaption: '濃い色のフッターの中に明るい青カードを差し込むことで、「読み終えたらここを押す」ゴールを作ります',
    interactiveHint: '右上の「PC / スマホ」で狭い画面幅時の縦積みレイアウトも確認できます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.35,
    durationRange: { min: 0.15, max: 1.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① フッターの上に誘導バナーを 1 枚統合する',
        detail: 'ただコピーライトで終わらせず「登録・相談・試しに使う」への最後の受け皿を用意します。',
        codeHint: 'border-radius: 16px; background: #2563eb'
      },
      {
        title: '② ボタンは白背景×青文字にして鮮明に際立たせる',
        detail: '青いカードの上では白ボタンが一番強く目立ち、視線を迷わせません。',
        codeHint: 'background: #ffffff; color: #1d4ed8'
      },
      {
        title: '③ 下段の細線以下は控えめなリンク帯で引き締める',
        detail: 'CTAカードで感情・行動を促し、その下に規約・コピーライトを静かに添えます。',
        codeHint: 'border-top: 1px solid #27272a'
      }
    ],
    keywords: ['フッター', 'footer', 'CTA', 'バナー', '着地', '登録誘導', '静的'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '大きなCTAバナー一体型フッター',
        goal: 'フッターの上部に「無料で試す」などのアクション誘導カードを内蔵し、下段にシンプルなコピーライト帯を備えたコンバージョン向けフッターにする。',
        mechanism: 'ダークトーンの footer コンテナ上段にアクセントカラーの CTA カードを埋め込み、モバイルでは縦積み中央寄せに切り替え。',
        isStatic: true,
        requirements: [
          'CTA内の見出し・補足・ボタンの余白を保ちスマホでも窮屈に見えないようにする',
          'CTAボタンは背景色に対してコントラスト比 4.5:1 以上と押しやすいパディング（44px 相当のタップ高）を確保する'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<footer class="cta-footer">
  <div class="cta-banner">
    <div>
      <h3>今すぐ無料で試してみませんか？</h3>
      <p>登録は1分・いつでも解約できます</p>
    </div>
    <a href="#start" class="cta-white-btn">無料で始める</a>
  </div>
  <div class="cta-foot-bottom">
    <span>© 2026 KatakataLab</span>
    <nav><a href="#terms">利用規約</a><a href="#contact">お問い合わせ</a></nav>
  </div>
</footer>

<style>
.cta-footer { background: #18181b; color: #a1a1aa; padding: 32px 24px 24px; }
.cta-banner {
  max-width: 960px; margin: 0 auto 24px; padding: 24px; border-radius: 16px;
  background: #2563eb; color: #ffffff;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.cta-white-btn { background: #fff; color: #1d4ed8; padding: 10px 18px; border-radius: 10px; font-weight: 700; text-decoration: none; }
.cta-foot-bottom {
  max-width: 960px; margin: 0 auto; padding-top: 16px; border-top: 1px solid #27272a;
  display: flex; justify-content: space-between; font-size: 12px;
}
@media (max-width: 639px) { .cta-banner { flex-direction: column; text-align: center; } }
</style>`
  },
  {
    id: 'ftr-giant-wordmark',
    category: 'footer',
    title: '横幅いっぱいの巨大文字ロゴを敷いたブランドフッター',
    subtitle: '細い案内帯の下にサービス名やスタジオ名を画面幅いっぱいにドンと配置する、デザイン重視サイト定番の余韻演出',
    mechanismTag: '下端合わせ + 超大型字間タイポグラフィ',
    xRayCaption: '画面横幅に応じたフォントサイズ（clamp）で文字を下端に敷き、世界観の余韻を残してページを閉じます',
    interactiveHint: '「PC / スマホ」で画面幅に応じたタイポグラフィ文字の収まりを確認できます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.35,
    durationRange: { min: 0.15, max: 1.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 上部にコンパクトな規約・SNS・コピーライト帯を置く',
        detail: '必要な情報はこの 1 行でサッと済ませ、下の大きなスペースを空けます。',
        codeHint: 'display: flex; justify-content: space-between'
      },
      {
        title: '② clamp() で文字サイズを画面幅にフィットさせる',
        detail: 'PCでは大迫力、スマホでははみ出して横スクロールが起きないサイズへ自動調整します。',
        codeHint: 'font-size: clamp(2.5rem, 12vw, 9rem)'
      },
      {
        title: '③ 行高（line-height）を 0.85〜0.95 に詰めて底辺へ',
        detail: '下の余白を少し切るかピタッと底へ置くとポスターのような締まりが出ます。',
        codeHint: 'line-height: 0.9; letter-spacing: -0.04em'
      }
    ],
    keywords: ['フッター', '巨大文字', 'タイポグラフィ', 'ブランド', 'ロゴ', 'ポスター', '静的'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '巨大文字ロゴ・ブランドフッター',
        goal: '上部にミニマルなリンク・著作権帯を置き、その下へ画面横幅いっぱいの超大型タイポグラフィブランド名を据えたポートフォリオ／ブランド風フッターを作る。',
        mechanism: 'clamp() によるレスポンシブ巨大文字サイズ＋引き締めた tracking（-0.04em）と line-height。',
        isStatic: true,
        requirements: [
          'スマホ幅でも横はみ出し（横スクロール）が絶対に出ないよう clamp() と overflow-hidden を設定する',
          '装飾用の巨大ロゴ文字列には aria-hidden="true" を付与し、支援技術での重複読み上げを防ぐ'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<footer class="wordmark-footer">
  <div class="wm-top">
    <span>© 2026 KATAKATALAB</span>
    <nav><a href="#works">Works</a><a href="#about">About</a><a href="#contact">Contact</a></nav>
  </div>
  <div class="wm-giant" aria-hidden="true">KATAKATA</div>
</footer>

<style>
.wordmark-footer {
  padding: 28px 24px 0;
  border-top: 1px solid #e4e4e7;
  background: #ffffff;
  overflow: hidden;
}
.wm-top { display: flex; justify-content: space-between; font-size: 12px; color: #71717a; margin-bottom: 18px; }
.wm-top nav { display: flex; gap: 16px; }
.wm-giant {
  font-size: clamp(2.75rem, 14vw, 8.5rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 0.88;
  text-align: center;
  color: #18181b;
  user-select: none;
}
</style>`
  },
  {
    id: 'ftr-newsletter-form',
    category: 'footer',
    title: '1行メール／更新通知登録フォーム付きフッター',
    subtitle: '記事サイトやニュースサービスで定番の、「読んだ勢いのままメールアドレスを1行で登録できる」実用フッター',
    mechanismTag: 'インライン入力フォーム + 送信済みフィードバック',
    xRayCaption: '説明文の横に [メールアドレス欄 ＋ 登録ボタン] を 1 セットで並べ、ページ移動なしで登録完了します',
    interactiveHint: '「PC / スマホ」切替や、枠内のメールアドレス入力＆「登録」ボタンを試せます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.35,
    durationRange: { min: 0.15, max: 1.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 入力は「メールアドレス1項目のみ」に絞る',
        detail: 'フッター内で項目が多いと離脱するため、アドレス 1 枠＋登録ボタンの 1 行だけにするのが鉄則です。',
        codeHint: '<input type="email" /> + <button type="submit">'
      },
      {
        title: '② 「何が届くのか」を 1 行で約束する',
        detail: '入力欄の横に「新機能の追加時のみお知らせ」と安心感を添えると登録率が上がります。',
        codeHint: 'flex: justify-between'
      },
      {
        title: '③ 入力サニタイズと送信後メッセージを用意',
        detail: '制御文字や不正文字を弾き、登録押下後はその場で「済み✓」等に切り替えて安心させます。',
        codeHint: 'aria-label="お知らせ登録"'
      }
    ],
    keywords: ['フッター', 'ニュースレター', 'メルマガ', 'フォーム', 'メールアドレス', '登録', '静的'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '1行メール登録フォーム付きフッター',
        goal: 'フッター内に簡潔な説明と「メールアドレス入力欄＋登録ボタン」を並べ、ページ遷移なしで登録完了状態を返せる構成にする。',
        mechanism: 'Flex 配置のインライン <form>＋クライアントサニタイズ＋送信時ステータス反転。',
        isStatic: true,
        requirements: [
          'ラベル（aria-label）とメールアドレス形式チェックを必ず設ける',
          'モバイル幅では説明と入力フォームが縦2段に綺麗に折り返すようにする'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<footer class="news-footer">
  <div class="news-row">
    <div>
      <strong>更新メールを受け取る</strong>
      <p>新しい表現の追加情報を月1〜2回お届けします。</p>
    </div>
    <form id="newsForm" class="news-form">
      <input id="newsEmail" type="email" required maxlength="80" placeholder="you@example.com" aria-label="メールアドレス" />
      <button type="submit" id="newsBtn">登録</button>
    </form>
  </div>
</footer>

<style>
.news-footer { padding: 28px 24px; background: #fafafa; border-top: 1px solid #e4e4e7; }
.news-row { max-width: 960px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; }
.news-form { display: flex; gap: 8px; }
.news-form input { padding: 8px 12px; border: 1px solid #d4d4d8; border-radius: 8px; }
.news-form button { padding: 8px 16px; border: 0; border-radius: 8px; background: #18181b; color: #fff; font-weight: 700; cursor: pointer; }
</style>

<script>
(() => {
  const form = document.getElementById('newsForm');
  const btn = document.getElementById('newsBtn');
  if (!form || !btn) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    btn.textContent = '✓ 登録済み';
  });
})();
</script>`
  },
  {
    id: 'ftr-compact-utility',
    category: 'footer',
    title: '稼働状況ドット・言語切替付きユーティリティフッター',
    subtitle: 'SaaSやツールサイトに多い「システム正常稼働中 ●」の安心ステータス表示＋言語／SNSリンクを1段に整える足元',
    mechanismTag: 'ステータスピル（緑ドット）+ 補助リンク群',
    xRayCaption: '稼働ランプ（緑色の微小ドット）を見せるだけでツールとしての信頼感が一気に高まります',
    interactiveHint: '右上の「PC / スマホ」で狭い画面幅での整列変化も確認できます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.35,
    durationRange: { min: 0.15, max: 1.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 左に「正常稼働中」ステータスバッジを置く',
        detail: '小さな緑色の丸点（6〜8px）と柔らかい緑背景のピルで現在の安心感を伝えます。',
        codeHint: 'border-radius: 9999px; background: #ecfdf5'
      },
      {
        title: '② 右に言語切替・外部リンクを控えめに揃える',
        detail: '文字サイズを 12px に統一してフッターの重心を低く保ちます。',
        codeHint: 'display: flex; align-items: center; gap: 16px'
      },
      {
        title: '③ スマホ幅では左揃えの縦積みへ落とす',
        detail: '窮屈に横並びさせず、1 行ずつゆとりを持って見せます。',
        codeHint: 'flex-direction: column; align-items: flex-start'
      }
    ],
    keywords: ['フッター', 'ステータス', '稼働', '言語', 'SNS', 'SaaS', '静的'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '稼働状況ドット・言語切替付きコンパクトフッター',
        goal: 'フッター左側に緑ドットの稼働ステータスバッジ、右側に言語切替・SNS案内を添えたツールサイト向けフッターにする。',
        mechanism: '1行Flexbox 配置と淡色ピルステータス表示（スマホ時は左寄せ縦積み）。',
        isStatic: true,
        requirements: [
          'ステータス色の点滅アニメーション（pulse）を使う場合も控えめにして視覚負担を掛けない',
          '色ドットだけに頼らず「正常稼働」などの明確な状態テキストを併記し、色覚特性に関わらず把握できるようにする'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<footer class="util-footer">
  <span class="status-pill"><i class="dot" aria-hidden="true"></i>すべてのシステム正常稼働</span>
  <div class="util-right">
    <span>日本語 (JP)</span>
    <a href="#x">X</a>
    <a href="#github">GitHub</a>
  </div>
</footer>

<style>
.util-footer {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;
  padding: 16px 24px; border-top: 1px solid #e4e4e7; background: #ffffff; font-size: 12px; color: #71717a;
}
.status-pill {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
  border-radius: 9999px; border: 1px solid #a7f3d0; background: #ecfdf5; color: #065f46; font-weight: 600;
}
.dot { width: 7px; height: 7px; border-radius: 50%; background: #10b981; }
.util-right { display: flex; gap: 16px; }
</style>`
  }
];
