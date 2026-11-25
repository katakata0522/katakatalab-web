import type { MotionPattern } from '../types/motion';
import { EASING_OPTIONS, buildStructuredPrompt } from '../utils/motionHelpers';

export const TEXT_NAV_EXTENDED_PATTERNS: MotionPattern[] = [
  // =========================================================================
  // 01. 文字の動き (#064 - #068)
  // =========================================================================
  {
    id: 'text-tracking-compress',
    category: 'text',
    title: '広がった字間がギュッと締まって定着する（シネマ導入）',
    subtitle: '映画のタイトルのように広い文字間隔からゆっくり中心へ引き締まり、重厚な第一印象を作る動き',
    mechanismTag: 'letter-spacing + opacity 収束',
    xRayCaption: 'letter-spacing を 0.45em の広さから 0.02em の標準間隔へ滑らかに縮めています',
    interactiveHint: '「再生」で広くなった状態から中心へ締まる動きを繰り返せます',
    defaultDuration: 0.9,
    durationRange: { min: 0.3, max: 2.2, step: 0.05 },
    secondarySlider: {
      label: '初期の広がり具合',
      unit: '段階',
      min: 6,
      max: 24,
      step: 2,
      defaultValue: 16
    },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① 初期状態は字間を大きく開けて薄く表示',
        detail: 'letter-spacing を広めに設定し、透明度に少し余白を残しておくと緊張感が出ます。',
        codeHint: 'letter-spacing: 0.4em; opacity: 0.25'
      },
      {
        title: '② 減速カーブで標準の字間（0.02em）へ寄せる',
        detail: '中央揃え（text-align: center）にしておくと左右対称に中心へ集まります。',
        codeHint: 'text-align: center; letter-spacing: 0.02em'
      },
      {
        title: '③ 短すぎると落ち着きが消えるため 0.8〜1.1秒が適切',
        detail: 'シネマ風の余韻を出すため、速さよりも後半の減速余韻を大切にします。',
        codeHint: 'transition: letter-spacing 0.9s ease-out'
      }
    ],
    keywords: ['文字', '字間', 'トラッキング', 'シネマ', 'タイトル', '引き締まる'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '字間が詰まるシネマ登場アニメーション',
        goal: '大きく横に広がった状態の見出し文字が、中央に向かって静かに引き締まりながらくっきり定着する演出を作りたいです。',
        mechanism:
          `text-align: center の文字に対し、初期 letter-spacing を ${(params.distance * 0.025).toFixed(2)}em・opacity: 0.25 にしてから、通常間隔（0.02em）・opacity: 1 へ滑らかに収束させます。`,
        requirements: [
          '親枠の幅が狭いモバイルでも折り返してガタつかないよう余白・文字サイズを調整する',
          '文字が詰まりすぎて可読性が落ちないよう最終 letter-spacing は -0.02em 以上を維持する'
        ],
        params,
        secondaryLabel: '広がり量',
        secondaryUnit: '段階',
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      const spread = (params.distance * 0.025).toFixed(2);
      return `<h1 class="cinema-title is-animating">MOTION ATLAS</h1>

<style>
.cinema-title {
  text-align: center;
  font-weight: 800;
  letter-spacing: ${spread}em;
  opacity: 0.25;
  transition: letter-spacing ${params.duration.toFixed(2)}s ${ease}, opacity 0.4s ease;
}
.cinema-title.is-active {
  letter-spacing: 0.02em;
  opacity: 1;
}
</style>

<script>
(() => {
  const el = document.querySelector('.cinema-title');
  if (!el) return;
  requestAnimationFrame(() => el.classList.add('is-active'));
})();
</script>`;
    }
  },
  {
    id: 'text-scroll-fill',
    category: 'text',
    title: '読む位置に合わせて文字にインクが染み込む',
    subtitle: '最初は薄いグレーだった長い文章が、スクロールや進行に合わせて左から濃い黒へ塗り替わります',
    mechanismTag: 'background-clip: text + 進行率グラデーション',
    xRayCaption: '文字の形で背景グラデーションを型抜き（background-clip: text）し、境目%を動かしています',
    interactiveHint: '「再生」または下のスライダーをドラッグして色の染み込み具合を試せます',
    defaultDuration: 1.4,
    durationRange: { min: 0.4, max: 3.0, step: 0.1 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 文字自身の色を transparent（透明）にする',
        detail: '背景に塗った濃淡2色のグラデーションを透かして見せるための準備です。',
        codeHint: 'color: transparent; background-clip: text'
      },
      {
        title: '② 黒とグレーの境目 % を数値で制御する',
        detail: 'linear-gradient(90deg, #18181b 60%, #d4d4d8 60%) のように境目を動かすだけです。',
        codeHint: 'linear-gradient(90deg, #18181b P%, #d4d4d8 P%)'
      },
      {
        title: '③ スクロール量に連動させると没入感が高まる',
        detail: 'LPのブランドメッセージやストーリー紹介セクションで視線を途切れさせません。',
        codeHint: 'style.setProperty("--read-pct", pct + "%")'
      }
    ],
    keywords: ['文字', 'スクロール', '塗りつぶし', 'ハイライト', '読み進め', 'グラデーション'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '進行率で文字色が染み込むリード文',
        goal: '薄いグレーのテキストが、閲覧進捗に合わせて左端から濃いインク色に塗り替わっていく表現を作りたいです。',
        mechanism:
          'background-clip: text と color: transparent を用い、CSSカスタムプロパティ --pct を境界にした2色 linear-gradient を進捗値に応じて更新します。',
        requirements: [
          'prefers-reduced-motion 時は最初から 100% 濃色で読みやすく表示する',
          'background-clip: text 非対応環境でも判読できるようベース文字色のフォールバックを併記する'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<p class="fill-text" style="--pct: 55%">
  読み進めるリズムに合わせて言葉が浮かび上がります。
</p>

<style>
.fill-text {
  font-weight: 800;
  color: #18181b;
  color: transparent;
  background-image: linear-gradient(90deg, #18181b 50%, #d4d4d8 50%);
  background-size: 200% 100%;
  background-position: calc(100% - var(--pct)) 0;
  -webkit-background-clip: text;
  background-clip: text;
  transition: background-position ${params.duration.toFixed(2)}s ease;
}
</style>`
  },
  {
    id: 'text-word-slot',
    category: 'text',
    title: '一語だけがスロットのようにくるくる入れ替わる',
    subtitle: '見出しの前半は固定したまま、強調したい単語枠だけを上書き交換して複数用途を1画面で伝えます',
    mechanismTag: '固定見出し + overflow: hidden 縦スライド枠',
    xRayCaption: '「仕組み」をONにすると切り抜き枠の上下に待機している次の単語が透けて見えます',
    interactiveHint: '「再生」または下の単語ボタンをクリックしてスロット切り替えを試せます',
    defaultDuration: 0.45,
    durationRange: { min: 0.2, max: 1.2, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: true,
    steps: [
      {
        title: '① 入れ替える語を1列に縦積みし、1行分の高さで切り抜く',
        detail: '単語リストの親要素を 1行分の高さ + overflow: hidden にして1語だけを見せます。',
        codeHint: 'height: 36px; overflow: hidden'
      },
      {
        title: '② transform: translateY(-番号 × 行高) でズラす',
        detail: '2番目なら -36px、3番目なら -72px と正確な高さ単位で上へ送ります。',
        codeHint: 'transform: translateY(-72px)'
      },
      {
        title: '③ 高さをピクセル単位で揃えるとガタつかない',
        detail: 'line-height と item height を一致させておくと上下のズレがゼロになります。',
        codeHint: 'display: flex; align-items: center; height: 36px'
      }
    ],
    keywords: ['スロット', '文字切り替え', '回転', 'ローテーション', 'コピー', '見出し'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '見出しの一語だけが入れ替わるワードスロット',
        goal: '見出し文章の強調語句だけを固定枠の中で上下スライドさせ、サービスの複数メリットをリズミカルに見せたいです。',
        mechanism:
          '単語を縦に並べたトラックを高さ固定 + overflow: hidden 枠に収め、translateY(-index * lineHeight) を transition で送ります。',
        requirements: [
          '最長単語の幅に合わせて枠幅（min-width）を確保し周囲の文章が左右に揺れないようにする',
          '自動切り替えタイマーはタブ非表示時（document.hidden）やページ離脱時に必ずクリア・停止する'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="headline">
  UIは、
  <div class="slot-win">
    <div class="slot-track" id="slotTrack">
      <span>伝わる</span><span>心地よい</span><span>迷わない</span>
    </div>
  </div>
</div>

<style>
.slot-win { display: inline-block; height: 36px; overflow: hidden; vertical-align: middle; }
.slot-track { display: flex; flex-direction: column; transition: transform ${params.duration.toFixed(2)}s ${ease}; }
.slot-track span { height: 36px; line-height: 36px; font-weight: 800; color: #2563eb; }
</style>

<script>
(() => {
  const track = document.getElementById('slotTrack');
  if (!track) return;
  let i = 0;
  setInterval(() => {
    i = (i + 1) % 3;
    track.style.transform = 'translateY(' + (-i * 36) + 'px)';
  }, 1800);
})();
</script>`;
    }
  },
  {
    id: 'text-circular-badge',
    category: 'text',
    title: '円周に沿ってゆっくり回るスタンプ見出し',
    subtitle: 'SVGの円パスに文字を沿わせて回転させ、ヒーローの右下やスクロール誘導に視線のアクセントを添えます',
    mechanismTag: 'SVG <textPath> + 360度連続回転',
    xRayCaption: '文字の下にある点線の円が SVG の <path> ガイドで、グループ全体を 0→360度 で回転させています',
    defaultDuration: 1.5,
    durationRange: { min: 0.6, max: 3.0, step: 0.1 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① SVGの <path> で真円を定義する',
        detail: '見た目には線を描かず（fill="none"）、文字を沿わせる軌道としてだけ使います。',
        codeHint: '<path id="circle" d="..." />'
      },
      {
        title: '② <textPath> で円周上に文字列を配置する',
        detail: 'href で円の ID を指定し、letter-spacing で1周ぐるっとバランス良く広げます。',
        codeHint: '<textPath href="#circle">...</textPath>'
      },
      {
        title: '③ CSS animation infinite linear で一定速度回転',
        detail: '減速させず linear（等速）でゆっくり回すのが酔わない秘訣です。',
        codeHint: 'animation: spin 12s linear infinite'
      }
    ],
    keywords: ['円形テキスト', '回転', 'スタンプ', 'シール', 'SVG', 'スクロールダウン'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '円周に沿って回転するスタンプテキスト',
        goal: '円形の軌道に沿って文字が並び、ゆっくり等速回転するデザインスタンプを作りたいです。',
        mechanism:
          'インライン SVG の <defs><path> 円軌道へ <textPath> で文字列を添わせ、SVG 全体を animation: linear infinite で 360deg 回転させます。',
        requirements: [
          '中央アイコンは回転させず固定し、文字リングだけが落ち着いて回るようにする',
          '装飾用の回転テキストリングには aria-hidden="true" を付け、本文の読み上げを妨げないようにする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div class="badge-wrap">
  <svg viewBox="0 0 120 120" class="spin-ring" aria-hidden="true">
    <defs><path id="cPath" d="M60,60 m-42,0 a42,42 0 1,1 84,0 a42,42 0 1,1 -84,0"/></defs>
    <text font-size="10" font-weight="700" letter-spacing="2">
      <textPath href="#cPath">SCROLL DOWN • MOTION ATLAS •</textPath>
    </text>
  </svg>
</div>

<style>
.spin-ring { width: 112px; height: 112px; animation: spinRing ${(params.duration * 8).toFixed(1)}s linear infinite; }
@keyframes spinRing { to { transform: rotate(360deg); } }
</style>`
  },
  {
    id: 'text-outline-fill',
    category: 'text',
    title: '中抜き線文字が左からベタ塗りに変わる',
    subtitle: '輪郭だけの文字の上に塗りつぶし文字を重ね、clip-path で左からじわっと色を流し込む演出です',
    mechanismTag: 'text-stroke 輪郭 + clip-path 塗りレイヤー',
    xRayCaption: '下層に輪郭だけ・上層に塗りつぶしを重ね、上層の可視範囲 clip-path を左から解放しています',
    interactiveHint: '「再生」または文字をクリックすると輪郭と塗りつぶしが切り替わります',
    defaultDuration: 0.65,
    durationRange: { min: 0.25, max: 1.8, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: true,
    steps: [
      {
        title: '① 同じ文字を「線だけ」と「塗りつぶし」の2枚重ねにする',
        detail: '下層を transparent + -webkit-text-stroke にし、上層をベタ塗り文字でぴったり重ねます。',
        codeHint: '-webkit-text-stroke: 1.5px #18181b'
      },
      {
        title: '② 上層のクリップを inset(0 100% 0 0) にする',
        detail: '最初は右側 100% を隠しておくことで下の線文字だけがくっきり見えます。',
        codeHint: 'clip-path: inset(0 100% 0 0)'
      },
      {
        title: '③ 再生・ホバー時に inset(0 0% 0 0) へ開く',
        detail: '左からインクが注がれるようなシャープな変化をレイアウトズレなしで表現できます。',
        codeHint: 'clip-path: inset(0 0% 0 0)'
      }
    ],
    keywords: ['アウトライン', '中抜き', '塗りつぶし', '線文字', 'clip-path', 'ホバー'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '輪郭文字が左から塗りつぶされる見出し',
        goal: 'アウトライン（中抜き線）の見出しに左端から色が流れ込んで塗りつぶし文字に変わる表現を作りたいです。',
        mechanism:
          '2層重ねの文字のうち上層塗りを clip-path: inset(0 100% 0 0) から inset(0 0% 0 0) へトランジションさせます。',
        requirements: [
          'aria-hidden="true" を複製層に付け、スクリーンリーダーが同じ文を2回読み上げないようにする',
          '下層の輪郭文字と上層の塗り文字は同一フォント・字間・行高を揃え、滲みやズレを防ぐ'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="outline-wrap">
  <span class="outline-base">CREATIVE UI</span>
  <span class="outline-fill" aria-hidden="true">CREATIVE UI</span>
</div>

<style>
.outline-wrap { position: relative; display: inline-block; font-size: 36px; font-weight: 900; }
.outline-base { color: transparent; -webkit-text-stroke: 1.5px #18181b; }
.outline-fill {
  position: absolute; inset: 0; color: #18181b;
  clip-path: inset(0 100% 0 0);
  transition: clip-path ${params.duration.toFixed(2)}s ${ease};
}
.outline-wrap:hover .outline-fill { clip-path: inset(0 0% 0 0); }
</style>`;
    }
  },

  // =========================================================================
  // 02. 枠・カードの登場 (#069 - #072)
  // =========================================================================
  {
    id: 'reveal-frame-zoom',
    category: 'reveal',
    title: '外枠サイズを変えずに中身の写真だけをズームする',
    subtitle: '写真やサムネイルに触れたとき、隣のカードを押し出さず額縁の内側だけを拡大して上品に反応します',
    mechanismTag: '外枠 overflow: hidden + 内枠 scale',
    xRayCaption: '「仕組み」をONにすると額縁を飛び出した拡大画像の範囲が見えます',
    interactiveHint: '「再生」またはカードをクリックして内側ズームの切り替えを試せます',
    defaultDuration: 0.45,
    durationRange: { min: 0.2, max: 1.4, step: 0.05 },
    secondarySlider: {
      label: 'ズーム拡大率',
      unit: '%増',
      min: 4,
      max: 24,
      step: 2,
      defaultValue: 12
    },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① 外枠カードに overflow: hidden を指定',
        detail: 'どれだけ中身が大きくなっても額縁の輪郭からはみ出さない壁を作ります。',
        codeHint: 'overflow: hidden; border-radius: 12px'
      },
      {
        title: '② 内側の画像要素だけに scale(1.12) を当てる',
        detail: '親ではなく子要素（写真・グラフィック層）だけを拡大することで周辺配置を守ります。',
        codeHint: '.card:hover .card-media { transform: scale(1.12) }'
      },
      {
        title: '③ 拡大倍率は 1.05〜1.14 倍が上品',
        detail: 'やりすぎると画像が粗く見えるため、10%前後のズームと減速イージングが王道です。',
        codeHint: 'transition: transform 0.45s cubic-bezier(...)'
      }
    ],
    keywords: ['カード', '拡大', 'ズーム', 'サムネイル', '額縁', 'overflow'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '額縁固定・内側画像だけズームするカード',
        goal: 'カードにホバーやフォーカスを当てたとき、外枠の寸法や角丸を変えず内側のビジュアルだけが滑らかに拡大されるようにしたいです。',
        mechanism:
          `外枠に overflow: hidden をかけ、内側メディア要素だけを transform: scale(1.${String(params.distance).padStart(2, '0')}) にアニメーションさせます。`,
        requirements: [
          '角丸（border-radius）が Safari でも一瞬はがれないよう外枠に overflow: hidden + isolation: isolate を付与する',
          'ズーム倍率は 1.05〜1.14 倍程度に抑え、画像がぼやけたり周辺レイアウトを押したりしないようにする'
        ],
        params,
        secondaryLabel: '拡大率',
        secondaryUnit: '%増',
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      const sc = (1 + params.distance / 100).toFixed(2);
      return `<article class="photo-card">
  <div class="photo-inner">カードビジュアル</div>
</article>

<style>
.photo-card { overflow: hidden; border-radius: 12px; width: 260px; height: 150px; }
.photo-inner {
  width: 100%; height: 100%;
  transition: transform ${params.duration.toFixed(2)}s ${ease};
}
.photo-card:hover .photo-inner { transform: scale(${sc}); }
</style>`;
    }
  },
  {
    id: 'reveal-caption-overlay',
    category: 'reveal',
    title: '画像の足元から説明帯がせり上がるオーバーレイ',
    subtitle: '普段はビジュアルを綺麗に見せ、触れた瞬間にだけ下から半透明の説明帯を滑らせて情報を足します',
    mechanismTag: '下部絶対配置 + translateY(100% → 0)',
    xRayCaption: '画像の下辺（外）に隠していた半透明パネルを translateY(0) で引き上げています',
    interactiveHint: '「再生」または画像へカーソル／タップすると説明帯が上がります',
    defaultDuration: 0.35,
    durationRange: { min: 0.15, max: 1.0, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: true,
    steps: [
      {
        title: '① 説明パネルを bottom: 0 に重ね、下に100%押し出して隠す',
        detail: 'height を変えるのではなく translateY(100%) で枠外に待機させます。',
        codeHint: 'transform: translateY(100%)'
      },
      {
        title: '② 濃い半透明背景（rgba）で白文字の可読性を守る',
        detail: '写真の上に文字が乗ると読みづらくなるため、必ず背景黒幕でコントラストを確保します。',
        codeHint: 'background: rgba(9, 9, 11, 0.86)'
      },
      {
        title: '③ タッチ端末ではタップ開閉にも対応',
        detail: 'スマホはホバーがないため、タップでも見られるようトグルや常時表示 fallback を組みます。',
        codeHint: '.card:hover .cap, .card.is-open .cap'
      }
    ],
    keywords: ['画像', 'キャプション', '説明', 'オーバーレイ', 'ポートフォリオ', 'ホバー'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '画像下部から説明幕が滑るキャプションオーバーレイ',
        goal: '作品サムネイルの上に普段は説明を載せず、ホバーやタップ時だけ下から半透明キャプション帯がせり上がるようにしたいです。',
        mechanism:
          'overflow: hidden カードの最下部に position: absolute で説明パネルを置き、translateY(100%) から translateY(0) へ滑らせます。',
        requirements: [
          'スマホなどのタッチ画面でもタップやフォーカスで見られるよう .is-open クラスも併用する',
          '写真の上の文字が埋もれないよう暗色のオーバーレイグラデーションで WCAG コントラスト比 4.5:1 以上を保つ'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="media-card">
  <div class="media-cap">事例タイトル・概要</div>
</div>

<style>
.media-card { position: relative; overflow: hidden; border-radius: 12px; width: 260px; height: 160px; }
.media-cap {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 12px;
  color: #fff; background: rgba(9,9,11,0.86);
  transform: translateY(100%);
  transition: transform ${params.duration.toFixed(2)}s ${ease};
}
.media-card:hover .media-cap { transform: translateY(0); }
</style>`;
    }
  },
  {
    id: 'reveal-blur-focus',
    category: 'reveal',
    title: 'ぼかしが晴れながらクッキリ焦点が合う登場',
    subtitle: '霧の奥からピントが合うように、filter: blur() と透明度を同時にクリアして繊細に浮かび上がらせます',
    mechanismTag: 'filter: blur() → 0px + scale(1.03 → 1)',
    xRayCaption: '最初だけ軽いぼかし（blur）とわずかな拡大をかけ、定位置と同時にピントをゼロへ戻しています',
    interactiveHint: '「再生」でピンボケからくっきり定着する演出を確認できます',
    defaultDuration: 0.75,
    durationRange: { min: 0.25, max: 1.8, step: 0.05 },
    secondarySlider: {
      label: 'ぼかしの強さ',
      unit: 'px',
      min: 2,
      max: 16,
      step: 2,
      defaultValue: 8
    },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① 初期ぼかしは 6〜12px 程度に控えめに抑える',
        detail: 'blur が大きすぎると描画負荷が高くなるため、16px 以下に留めるのがプロ基準です。',
        codeHint: 'filter: blur(8px); opacity: 0.3'
      },
      {
        title: '② scale(1.03 → 1) を添えるとピント感が増す',
        detail: 'カメラのレンズが被写体に合うようなわずかな収縮が自然です。',
        codeHint: 'transform: scale(1.03) → scale(1)'
      },
      {
        title: '③ アニメーション終了後は blur(0px) にして文字を鋭く保つ',
        detail: '終了後はフィルタを外し、通常のくっきりした文字レンダリングへ戻します。',
        codeHint: 'filter: blur(0px); opacity: 1'
      }
    ],
    keywords: ['ぼかし', 'ブラー', 'フォーカス', 'ピント', '登場', '上品'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'ぼかし解除によるフォーカス登場',
        goal: 'カードやパネルがぼんやり霞んだ状態から、カメラのピントが合うようにくっきり浮かび上がる演出を作りたいです。',
        mechanism:
          `filter: blur(${params.distance}px)・opacity: 0.3・scale(1.03) から blur(0px)・opacity: 1・scale(1) へ遷移させます。`,
        requirements: [
          'モバイルの性能低下を防ぐため blur 上限は 12〜16px 以内かつ短時間で解除する',
          '完了状態では filter: blur(0px) へ戻し、文字の輪郭がぼやけたまま残らないようにする'
        ],
        params,
        secondaryLabel: 'ぼかし半径',
        secondaryUnit: 'px',
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="focus-card is-visible">ピントが合うカード</div>

<style>
.focus-card {
  filter: blur(${params.distance}px); opacity: 0.3; transform: scale(1.03);
  transition: filter ${params.duration.toFixed(2)}s ${ease}, opacity ${params.duration.toFixed(2)}s ease, transform ${params.duration.toFixed(2)}s ${ease};
}
.focus-card.is-visible { filter: blur(0px); opacity: 1; transform: scale(1); }
</style>`;
    }
  },
  {
    id: 'reveal-staggered-offset',
    category: 'reveal',
    title: '段違いグリッド配置（左右の視線を緩やかにずらす静的組版）',
    subtitle: '2列カードの右列だけを少し下に下げて配置し、均等な一覧に余白のリズムを生むデザイン手法です',
    mechanismTag: '2列Grid + 偶数カラム translateY オフセット（静的配置）',
    xRayCaption: 'PC表示のときだけ右側列に 16px の段差余白を作り、単調な格子並びを防いでいます',
    interactiveHint: '右上の「PC / スマホ」でスマホ時に段差をゼロへ戻す工夫を確認できます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.35,
    durationRange: { min: 0.2, max: 1.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① PC時は 2 列目（nth-child(even)）だけ下にずらす',
        detail: '全カードを同じ高さで揃えるより、リズムと雑誌のような洗練された余白が生まれます。',
        codeHint: '@media (min-width: 768px) { .card:nth-child(even) { transform: translateY(24px); } }'
      },
      {
        title: '② スマホ（1列表示）では必ず段差を解除する',
        detail: '縦1列に並んだときに段差が残ると余白が不揃いに見えるため、狭い画面では 0 に戻します。',
        codeHint: 'transform: none (on mobile)'
      },
      {
        title: '③ セクション下部に逃げ余白（padding-bottom）を足す',
        detail: '右列が下に飛び出すぶん、親セクションの底余白を少し多めに取って干渉を防ぎます。',
        codeHint: 'padding-bottom: 32px'
      }
    ],
    keywords: ['段違い', 'オフセット', 'グリッド', '2列', '配置', '静的', 'デザイン'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '段違い2列オフセットグリッド（静的組版）',
        goal: '事例カードや特徴カードを2列に並べるとき、右列だけを半段下にずらしてリズム感のある洗練されたレイアウトを組みたいです。',
        mechanism:
          'Desktop幅以上でのみ偶数列アイテムへ translateY(24px) を与え、1列表示となるモバイル幅ではオフセットを解除して縦整列に保ちます。',
        isStatic: true,
        requirements: [
          '最下部の要素が下のセクションに重ならないようコンテナに十分な下余白を持たせる',
          'スマホ幅（768px 未満）の 1 列表示時は段差 translateY を無効化し均等な余白に戻す'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<div class="offset-grid">
  <div class="item">01 左列</div>
  <div class="item">02 右列（段差あり）</div>
</div>

<style>
.offset-grid { display: grid; grid-template-columns: 1fr; gap: 16px; padding-bottom: 24px; }
@media (min-width: 768px) {
  .offset-grid { grid-template-columns: repeat(2, 1fr); }
  .offset-grid .item:nth-child(even) { transform: translateY(16px); }
}
</style>`
  },

  // =========================================================================
  // 03. ナビ・メニュー (#073 - #075)
  // =========================================================================
  {
    id: 'nav-icon-morph-variants',
    category: 'nav',
    title: '開閉アイコン変形 3 パターン比較（三→×／三→←／＋→×）',
    subtitle: 'メニューやアコーディオンのボタン線自体が角度を変えて別の形に変身する 3 つの定番表現',
    mechanismTag: '3本線の回転・中央線フェード比較',
    xRayCaption: 'それぞれ独立したSVG・CSS棒グラフ線の rotate() と opacity だけで別アイコンへ変身させています',
    interactiveHint: '「再生」または各アイコンを押して 3 種類の変形を見比べられます',
    defaultDuration: 0.3,
    durationRange: { min: 0.15, max: 0.9, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: false,
    steps: [
      {
        title: '① 三 → ×：上下2本を 45度/-45度に交差、真ん中は消す',
        detail: '全画面メニューやドロワーの「開く／閉じる」として一番直感的に伝わります。',
        codeHint: 'rotate(45deg) / opacity: 0 / rotate(-45deg)'
      },
      {
        title: '② 三 → ←：上下の線を短くして先端へ 35度 傾ける',
        detail: '詳細画面から一覧へ「戻る」意図をシームレスに伝えるアプリ向け手法です。',
        codeHint: 'width: 9px; rotate(-35deg)'
      },
      {
        title: '③ ＋ → ×：十字をそのまま 45度 回すだけ',
        detail: 'FAQのアコーディオンや「新規追加キャンセル」に最小コードで使える便利な変形です。',
        codeHint: 'transform: rotate(45deg)'
      }
    ],
    keywords: ['ハンバーガー', 'アイコン変形', 'モーフィング', 'バツ', '矢印', 'メニューボタン'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'メニューボタンのモーフィング変形バリエーション',
        goal: 'ハンバーガーボタンやアコーディオンのアイコンが、開く・戻る・閉じる状態に応じて滑らかに別シンボルへ変形する表現を入れたいです。',
        mechanism:
          'ボタン内の棒線要素に対し、is-open 状態で rotate / translate / scale を同時遷移させ、アイコン画像の差し替えなしに変形させます。',
        requirements: [
          'aria-expanded 属性とラベル文字列を開閉状態に合わせて更新する',
          '回転やモーフィング時にアイコン中心がブレないよう 36〜44px 四方のタップ領域を確保する'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<button class="plus-btn" type="button" aria-expanded="false" aria-label="メニューを開く">
  <span class="bar h"></span><span class="bar v"></span>
</button>

<style>
.plus-btn { position: relative; width: 32px; height: 32px; transition: transform ${params.duration.toFixed(2)}s ${EASING_OPTIONS[params.easing].css}; }
.plus-btn.is-open { transform: rotate(45deg); }
.bar { position: absolute; left: 8px; top: 15px; width: 16px; height: 2px; background: #18181b; }
.bar.v { transform: rotate(90deg); }
</style>

<script>
(() => {
  const btn = document.querySelector('.plus-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const open = btn.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
  });
})();
</script>`
  },
  {
    id: 'nav-stagger-drawer',
    category: 'nav',
    title: 'ドロワー内のリンクが時間差でスッと並ぶ',
    subtitle: '横からメニュー板が出たあと、中のリンク文字が少しだけ時間差で現れて洗練された手触りを作ります',
    mechanismTag: 'パネル本体 slide + 項目 transition-delay 階段',
    xRayCaption: 'メニュー外枠のスライドに 80ms + 項目番号×60ms の待ち時間を付けて順番に滑り込ませています',
    interactiveHint: '「再生」または「メニューを開く」ボタンで開閉と順番登場を確認できます',
    defaultDuration: 0.4,
    durationRange: { min: 0.2, max: 1.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① まず暗幕とドロワー本体をスライドインさせる',
        detail: '容器が定位置へ収まる途中で項目も追いかけ始めると軽快に見えます。',
        codeHint: 'transform: translateX(-100% → 0)'
      },
      {
        title: '② 各メニューリンクへ 60ms 刻みの delay を振る',
        detail: '閉じる時は delay を 0ms にして一瞬で消えるとストレスが残りません。',
        codeHint: 'transition-delay: calc(80ms + var(--i) * 60ms)'
      },
      {
        title: '③ 背景幕クリック＆Escキーで確実に閉じられるように',
        detail: 'どの操作でも迷わず画面へ戻れる逃げ道を用意します。',
        codeHint: 'backdrop.addEventListener("click", close)'
      }
    ],
    keywords: ['ドロワー', 'スライドメニュー', '時間差', 'ナビ', 'ハンバーガー中身'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '項目が順番に登場するサイドドロワー',
        goal: 'スマホや左側のドロワーメニューを開いたとき、中のリンクが時間差（スタガー）で順番に滑らかに現れるようにしたいです。',
        mechanism:
          'パネルを translateX(0) へスライドすると同時に、各リンクに連番ベースの transition-delay（例: 80ms + idx*60ms）を設定します。',
        requirements: [
          'メニューを閉じる瞬間は transition-delay を 0ms に戻し、閉鎖がもたつかないようにする',
          '最後の項目まで待ち時間が出すぎないよう、1項目あたりの遅延は 35〜50ms 程度に抑える'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<nav class="drawer">
  <a style="--i:0" href="#a">ホーム</a>
  <a style="--i:1" href="#b">機能</a>
  <a style="--i:2" href="#c">料金</a>
</nav>

<style>
.drawer { transform: translateX(-100%); transition: transform ${params.duration.toFixed(2)}s ${ease}; }
.drawer.is-open { transform: translateX(0); }
.drawer a { opacity: 0; transform: translateX(-12px); transition: opacity .25s, transform .25s; }
.drawer.is-open a { opacity: 1; transform: translateX(0); transition-delay: calc(80ms + var(--i) * 60ms); }
</style>`;
    }
  },
  {
    id: 'nav-app-tab-bar',
    category: 'nav',
    title: '画面下部・アプリ風タブバー（親指操作のピル強調）',
    subtitle: 'スマホアプリの足元に固定し、選んだタブのアイコン周りに柔らかい丸カプセルが点灯する移動バー',
    mechanismTag: '下部固定 4等分Grid + 選択タブカプセル強調',
    xRayCaption: 'アイコンの下に引いた横長カプセル背景と文字色の変化で現在ページを示しています',
    interactiveHint: '「再生」または下の「ホーム・さがす・保存・設定」を押して切り替えできます',
    defaultDuration: 0.25,
    durationRange: { min: 0.1, max: 0.8, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: false,
    hasViewportToggle: true,
    steps: [
      {
        title: '① タブ項目数は 3〜5 個に絞って均等グリッドに',
        detail: '押し間違いを防ぐため、文字とアイコンをセットで縦並びに揃えます。',
        codeHint: 'grid-template-columns: repeat(4, 1fr)'
      },
      {
        title: '② 選択アイコン背後に淡い色カプセル（ピル）を表示',
        detail: 'アイコンだけ色を変えるより指で押した位置がはっきり目に入ります。',
        codeHint: 'background: #eff6ff; border-radius: 9999px'
      },
      {
        title: '③ iPhone等の下部バーと重ならない safe-area 配慮',
        detail: '実運用時は padding-bottom に env(safe-area-inset-bottom) を足すと安全です。',
        codeHint: 'padding-bottom: env(safe-area-inset-bottom)'
      }
    ],
    keywords: ['ボトムナビ', 'タブバー', 'スマホ', 'アプリ風', '下部ナビ', 'フッターメニュー'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'アプリ風下部タブバー（カプセル点灯）',
        goal: 'スマホ向けのウェブアプリで、画面下端に 4 つの主要切り替えタブを配置し、選択中のアイコンにカプセル背景が点くようにしたいです。',
        mechanism:
          'grid-template-columns: repeat(4, 1fr) のナビバー内にアイコン＋ラベルを配置し、aria-current="page" 項目のみ背景ピルと青文字へ切り替えます。',
        requirements: [
          'env(safe-area-inset-bottom) を考慮して画面下端の操作領域と干渉しない余白を確保する',
          '現在表示中のタブに aria-current="page" と明瞭な背景ピル／文字色の変化を付与する'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<nav id="appTabBar" class="app-tab-bar" aria-label="主要タブ">
  <button type="button" class="tab-item is-active" aria-current="page">
    <span class="tab-pill">ホーム</span>
  </button>
  <button type="button" class="tab-item"><span class="tab-pill">さがす</span></button>
  <button type="button" class="tab-item"><span class="tab-pill">保存</span></button>
  <button type="button" class="tab-item"><span class="tab-pill">設定</span></button>
</nav>

<style>
.app-tab-bar { display: grid; grid-template-columns: repeat(4, 1fr); padding: 6px 6px calc(6px + env(safe-area-inset-bottom)); border-top: 1px solid #e4e4e7; background: rgba(255,255,255,.95); }
.tab-item { border: none; background: transparent; padding: 6px 2px; font-size: 11px; font-weight: 600; color: #71717a; cursor: pointer; }
.tab-pill { display: inline-block; padding: 5px 12px; border-radius: 9999px; transition: background-color ${params.duration.toFixed(2)}s ease, color ${params.duration.toFixed(2)}s ease; }
.tab-item.is-active .tab-pill { background: #eff6ff; color: #1d4ed8; font-weight: 700; }
</style>

<script>
(() => {
  const bar = document.getElementById('appTabBar');
  if (!bar) return;
  const items = bar.querySelectorAll('.tab-item');
  items.forEach((btn) => btn.addEventListener('click', () => {
    items.forEach((b) => { b.classList.remove('is-active'); b.removeAttribute('aria-current'); });
    btn.classList.add('is-active');
    btn.setAttribute('aria-current', 'page');
  }));
})();
</script>`
  },

  // =========================================================================
  // 04. タブ・アコーディオン (#076 - #077)
  // =========================================================================
  {
    id: 'tabs-filter-chips',
    category: 'tabs',
    title: '横並び絞り込みチップ（押すと一覧が即フィルタされる）',
    subtitle: '丸いタグボタンを横に並べて、選んだカテゴリに合うカードだけをその場で絞り込んで見せるUI',
    mechanismTag: '横スクロール許可チップ列 + 即時配列フィルタ',
    xRayCaption: '画面幅が狭くても折り返さず横へ流せるよう overflow-x: auto を使っています',
    interactiveHint: '「再生」または上のチップ（「文字」「ナビ」など）をクリックして絞込できます',
    defaultDuration: 0.25,
    durationRange: { min: 0.1, max: 0.8, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: false,
    steps: [
      {
        title: '① チップには shrink-0（縮まない）を指定',
        detail: '横一列で並べる際、文字が縦に折れて崩れないよう flex-shrink: 0 にします。',
        codeHint: 'flex-shrink: 0; white-space: nowrap'
      },
      {
        title: '② 選択チップは反転カラー（黒背景・白文字）で明確に',
        detail: '一覧の見出しより主張しすぎず、何で絞り込み中かひと目で分かります。',
        codeHint: 'aria-pressed="true"'
      },
      {
        title: '③ 「すべて」を先頭に置いて解除を1クリックに',
        detail: 'どの絞り込みからでもすぐ全件表示に戻れる安心設計にします。',
        codeHint: 'filter(item => cat === "all" || item.cat === cat)'
      }
    ],
    keywords: ['絞り込み', 'チップ', 'フィルター', 'タグ', 'タブ', '一覧'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '即時絞り込みフィルターチップ列',
        goal: '「すべて／カテゴリ別」のピルボタンを横並びで置き、押した瞬間に下の一覧カードを絞り込めるようにしたいです。',
        mechanism:
          'overflow-x: auto のチップ行で選択状態を state 管理し、aria-pressed の切り替えと表示配列の filter を連動させます。',
        requirements: [
          '狭幅スマホでも横スクロールできるようにし、折り返しで縦幅を圧迫しない',
          '選択中のチップには aria-pressed="true" を連動させ、色の差に加えてフォントウェイトでも識別させる'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div class="chip-filter-wrap">
  <div id="chipRow" class="chip-row" role="group" aria-label="絞り込み">
    <button type="button" class="chip is-active" data-cat="all" aria-pressed="true">すべて</button>
    <button type="button" class="chip" data-cat="text" aria-pressed="false">文字</button>
    <button type="button" class="chip" data-cat="nav" aria-pressed="false">ナビ</button>
  </div>
  <ul id="chipItems" class="chip-items">
    <li data-cat="text">テキスト・リビール表現</li>
    <li data-cat="nav">スライディング・メニュー</li>
    <li data-cat="text">タイプライター見出し</li>
  </ul>
</div>

<style>
.chip-row { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px; }
.chip { flex-shrink: 0; padding: 6px 14px; border-radius: 9999px; border: 1px solid #e4e4e7; background: #fff; font-size: 12px; cursor: pointer; transition: background-color ${params.duration.toFixed(2)}s ease, color ${params.duration.toFixed(2)}s ease, border-color ${params.duration.toFixed(2)}s ease; }
.chip.is-active { background: #18181b; color: #fff; border-color: #18181b; font-weight: 700; }
.chip-items { margin: 8px 0 0; padding: 0; list-style: none; display: grid; gap: 6px; font-size: 12px; }
.chip-items li { padding: 8px 12px; border: 1px solid #e4e4e7; border-radius: 8px; }
</style>

<script>
(() => {
  const row = document.getElementById('chipRow');
  const items = document.querySelectorAll('#chipItems li');
  if (!row) return;
  row.querySelectorAll('.chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-cat') || 'all';
      row.querySelectorAll('.chip').forEach((c) => {
        const on = c === btn;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', String(on));
      });
      items.forEach((li) => {
        li.hidden = cat !== 'all' && li.getAttribute('data-cat') !== cat;
      });
    });
  });
})();
</script>`
  },
  {
    id: 'tabs-vertical-settings',
    category: 'tabs',
    title: '設定画面向け・縦並びサイドタブ（スマホ時は横タブへ自動変化）',
    subtitle: '左に項目リスト・右に詳細内容を並べる管理画面の定番を、スマホ幅では上の横タブへ切り替えます',
    mechanismTag: 'PC 2列縦タブ ↔ モバイル上段横タブ切り替え',
    xRayCaption: '画面幅に応じて左の青バー付き縦リストと上部タブを切り替えて表示破綻を防いでいます',
    interactiveHint: '右上の「PC / スマホ」でレイアウト変化を、「アカウント・通知設定」で中身を確認できます',
    hasViewportToggle: true,
    defaultDuration: 0.25,
    durationRange: { min: 0.1, max: 0.8, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 選択肢の文章が長い時は「横」ではなく「縦」にする',
        detail: '「アカウント設定」「通知スケジュール」などは縦積みにした方が文字が切れず読めます。',
        codeHint: 'grid-template-columns: 160px 1fr'
      },
      {
        title: '② 左端の青い縦バーで現在位置をガイド',
        detail: '背景色変化に加えて左に 4px の色棒を置くと選択中の視認性が跳ね上がります。',
        codeHint: 'border-left: 3px solid #2563eb'
      },
      {
        title: '③ スマホ幅では 1 列（上タブ・下本文）に組み替える',
        detail: '横幅が足りない環境では横に2分割せず上下分割に落とします。',
        codeHint: 'flex-direction: column (mobile)'
      }
    ],
    keywords: ['縦タブ', '設定画面', 'サイドタブ', 'レスポンシブ', 'マイページ'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'レスポンシブ縦並び設定タブ',
        goal: '設定画面の左側に縦並びメニュー、右側に詳細パネルを置き、スマホ画面では上部横タブに自動変化させたいです。',
        mechanism:
          'CSS Grid でデスクトップは 2 カラム（左メニュー＋右パネル）、モバイル幅では 1 カラムのフレックスタブ配列へ切り替えます。',
        requirements: [
          'role="tablist" / role="tab" / role="tabpanel" と aria-selected でキーボード操作にも対応させる',
          '狭幅画面（768px 未満）では上部横スクロールタブへ切り替え、本文領域が圧迫されないようにする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div id="settingsTabs" class="settings-box">
  <div class="settings-nav" role="tablist" aria-label="設定メニュー">
    <button type="button" class="stab is-active" role="tab" aria-selected="true" data-panel="0">アカウント</button>
    <button type="button" class="stab" role="tab" aria-selected="false" data-panel="1">通知設定</button>
    <button type="button" class="stab" role="tab" aria-selected="false" data-panel="2">外観</button>
  </div>
  <div class="settings-panel" role="tabpanel" id="settingsPanel">表示名やログイン情報を管理できます。</div>
</div>

<style>
.settings-box { display: grid; grid-template-columns: 1fr; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; background: #fff; }
.settings-nav { display: flex; overflow-x: auto; border-bottom: 1px solid #e4e4e7; background: #fafafa; }
.stab { flex-shrink: 0; padding: 10px 14px; border: none; border-bottom: 2px solid transparent; background: transparent; text-align: left; font-size: 12px; color: #52525b; cursor: pointer; transition: background-color ${params.duration.toFixed(2)}s ease, color ${params.duration.toFixed(2)}s ease, border-color ${params.duration.toFixed(2)}s ease; }
.stab.is-active { background: #eff6ff; color: #1d4ed8; font-weight: 700; border-bottom-color: #2563eb; }
.settings-panel { padding: 16px; font-size: 13px; color: #27272a; }
@media (min-width: 768px) {
  .settings-box { grid-template-columns: 160px 1fr; }
  .settings-nav { flex-direction: column; border-bottom: none; border-right: 1px solid #e4e4e7; }
  .stab { border-bottom: none; border-left: 3px solid transparent; }
  .stab.is-active { border-left-color: #2563eb; }
}
</style>

<script>
(() => {
  const texts = [
    '表示名やログイン情報を管理できます。',
    '新着アップデートと通知頻度を設定します。',
    'ライト表示・アニメーション抑制を選びます。'
  ];
  const root = document.getElementById('settingsTabs');
  const panel = document.getElementById('settingsPanel');
  if (!root || !panel) return;
  const tabs = root.querySelectorAll('[role="tab"]');
  tabs.forEach((btn) => btn.addEventListener('click', () => {
    const idx = Number(btn.getAttribute('data-panel')) || 0;
    tabs.forEach((t) => {
      const on = t === btn;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    panel.textContent = texts[idx] || '';
  }));
})();
</script>`
  },

  // =========================================================================
  // 05. 検索窓・入力欄 (#078 - #079)
  // =========================================================================
  {
    id: 'search-autocomplete',
    category: 'search',
    title: '入力すると候補がすぐ下に並ぶ予測変換リスト',
    subtitle: '1文字打つたびに一致候補を安全にサニタイズして絞り込み、上下キーやタップで選べる検索補助UI',
    mechanismTag: 'サニタイズ入力 + 予測ドロップダウン + キーボード選択',
    xRayCaption: '入力文字の制御記号を取り除いてから通し番号と日本語両方で候補配列を検索しています',
    interactiveHint: '「再生」または入力欄に「#01」「スイッチ」等を打ち、↓↑キーや候補タップを試せます',
    defaultDuration: 0.25,
    durationRange: { min: 0.1, max: 0.8, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: false,
    steps: [
      {
        title: '① 入力値はすぐ検索ロジックへ渡す前にサニタイズ',
        detail: '制御文字や過長入力をカットし、描画も安全なテキストノードだけで行います。',
        codeHint: 'sanitizePlainText(input, 40)'
      },
      {
        title: '② 通し番号（#014）でもキーワードでもヒットさせる',
        detail: 'ユーザーが番号を覚えていても言葉で探しても同じリストに導けます。',
        codeHint: 'serial.includes(q) || label.includes(q)'
      },
      {
        title: '③ ↑↓キーと Enter でマウスなしでも選べる',
        detail: 'activeIndex を管理しておくとPC作業者の検索体験が劇的に向上します。',
        codeHint: 'ArrowDown / ArrowUp / Enter'
      }
    ],
    keywords: ['検索', 'オートコンプリート', '予測候補', 'サジェスト', 'キーボード', 'ドロップダウン'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '安全フィルタ付き予測候補オートコンプリート',
        goal: '検索ボックスへの入力に合わせて直下に候補リストを表示し、通し番号・キーワードどちらでも絞り込んで ↑↓ キーで選択できるようにしたいです。',
        mechanism:
          '入力値を制御文字除去・文字数上限で正規化した上で候補リストと部分一致比較し、React の安全なテキスト描画のみでリストを描画します。',
        requirements: [
          '候補は innerHTML 等を使わず安全な要素生成（createElement + textContent / JSX）で描画する',
          '候補リストの展開状態を role="listbox" と aria-expanded 等で明示し、上下キー・Escape でも閉じられるようにする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div class="ac-wrap">
  <input id="acInput" class="ac-input" type="search" placeholder="キーワードや #番号..." autocomplete="off" />
  <ul id="acList" class="ac-list" role="listbox"></ul>
</div>

<style>
.ac-wrap { position: relative; max-width: 300px; }
.ac-input { width: 100%; padding: 8px 12px; border: 1px solid #d4d4d8; border-radius: 10px; font-size: 13px; outline: none; transition: border-color ${params.duration.toFixed(2)}s ease, box-shadow ${params.duration.toFixed(2)}s ease; }
.ac-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.15); }
.ac-list { margin: 6px 0 0; padding: 4px; list-style: none; border: 1px solid #e4e4e7; border-radius: 10px; background: #fff; box-shadow: 0 8px 20px rgba(0,0,0,.06); }
.ac-list:empty { display: none; }
.ac-list li button { width: 100%; padding: 7px 10px; border: none; border-radius: 6px; background: transparent; text-align: left; font-size: 12px; cursor: pointer; transition: background-color ${params.duration.toFixed(2)}s ease, color ${params.duration.toFixed(2)}s ease; }
.ac-list li button:hover { background: #eff6ff; color: #1d4ed8; }
</style>

<script>
(() => {
  const input = document.getElementById('acInput');
  const list = document.getElementById('acList');
  if (!input || !list) return;
  const items = ['#014 検索スポットライト', '#038 トグルスイッチ', '#084 長押し確定'];
  const render = () => {
    const q = input.value.replace(/[\\u0000-\\u001F\\u007F]/g, '').slice(0, 40).trim();
    list.replaceChildren();
    items.filter((t) => !q || t.toLowerCase().includes(q.toLowerCase())).forEach((text) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = text;
      btn.addEventListener('click', () => { input.value = text; render(); });
      li.appendChild(btn);
      list.appendChild(li);
    });
  };
  input.addEventListener('input', render);
  render();
})();
</script>`
  },
  {
    id: 'search-popular-chips',
    category: 'search',
    title: 'よく検索されるタグボタン付き検索窓（迷わせない導線）',
    subtitle: '何を入力すればよいか迷う人に向けて、検索窓のすぐ下に「よく探される例」を押しやすく並べます',
    mechanismTag: '入力欄 + 1タップ注入サジェストタグ列',
    xRayCaption: 'タグを押した瞬間にその文字列をサニタイズした上で検索欄の state へ直接流し込んでいます',
    interactiveHint: '「再生」または下の「#001 下から出現」などのタグを押すと入力欄へ即反映されます',
    defaultDuration: 0.25,
    durationRange: { min: 0.1, max: 0.8, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 空の検索欄だけではユーザーは手が止まりやすい',
        detail: 'よく探される番号や単語を 3〜4 個チップで並べて「1タップ検索」を提供します。',
        codeHint: '<button onClick={() => setQuery(tag)}>...'
      },
      {
        title: '② 入力後は「クリア」ボタンで一発で空に戻す',
        detail: '別の語句を試し直しやすいよう、文字がある時だけ右端にクリアを出します。',
        codeHint: '{query && <button>クリア</button>}'
      },
      {
        title: '③ チップ色を押下状態に合わせて強調',
        detail: '今どのタグで検索中かもひと目で分かる状態にしておきます。',
        codeHint: 'aria-pressed={query === tag}'
      }
    ],
    keywords: ['検索タグ', 'おすすめ検索', '人気キーワード', '入力補助', '検索欄'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'おすすめ検索チップ付き検索ボックス',
        goal: 'ユーザーが入力に迷わないよう、検索欄の直下に 1 クリックで検索欄へ流し込める「よく検索されるタグ」を並べたいです。',
        mechanism:
          '検索語句の状態（query）を共有し、チップのクリックで対象キーワードを直接入力 state へセットして検索を実行します。',
        requirements: [
          '1クリックで入力リセットできるクリアボタンを値あり時のみ表示する',
          '各人気キーワードチップに aria-pressed を連動させ、ボタン選択状態が入力欄と常に一致するようにする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div class="search-box">
  <div class="search-field">
    <input id="tagSearchInput" type="text" placeholder="探したい語句を入力" />
    <button type="button" id="tagClearBtn" hidden>クリア</button>
  </div>
  <div class="tag-row">
    <button type="button" class="tag-chip" data-tag="#001 下から出現" aria-pressed="false">#001 下から出現</button>
    <button type="button" class="tag-chip" data-tag="hover" aria-pressed="false">hover</button>
    <button type="button" class="tag-chip" data-tag="料金" aria-pressed="false">料金</button>
  </div>
</div>

<style>
.search-box { max-width: 320px; display: grid; gap: 8px; }
.search-field { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid #d4d4d8; border-radius: 10px; background: #fff; }
.search-field input { flex: 1; border: none; outline: none; font-size: 13px; }
#tagClearBtn { border: none; background: #f4f4f5; border-radius: 6px; padding: 2px 8px; font-size: 11px; cursor: pointer; }
.tag-row { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-chip { padding: 4px 10px; border: 1px solid #e4e4e7; border-radius: 9999px; background: #fff; font-size: 11px; cursor: pointer; transition: background-color ${params.duration.toFixed(2)}s ease, border-color ${params.duration.toFixed(2)}s ease, color ${params.duration.toFixed(2)}s ease; }
.tag-chip[aria-pressed="true"] { border-color: #2563eb; background: #eff6ff; color: #1d4ed8; font-weight: 700; }
</style>

<script>
(() => {
  const input = document.getElementById('tagSearchInput');
  const clearBtn = document.getElementById('tagClearBtn');
  if (!input || !clearBtn) return;
  const sync = () => {
    clearBtn.hidden = input.value.length === 0;
    document.querySelectorAll('.tag-chip').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(input.value === btn.getAttribute('data-tag')));
    });
  };
  document.querySelectorAll('.tag-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      input.value = btn.getAttribute('data-tag') || '';
      sync();
    });
  });
  clearBtn.addEventListener('click', () => { input.value = ''; sync(); });
  input.addEventListener('input', sync);
})();
</script>`
  },

  // =========================================================================
  // 06. ボタンの手応え (#080 - #085)
  // =========================================================================
  {
    id: 'micro-button-3d',
    category: 'micro',
    title: '下に厚みがある立体プッシュボタン（沈み込む手応え）',
    subtitle: 'ボタンの底に濃い影の厚みを付け、押した瞬間だけ下に 4px 沈ませて物理スイッチのような快感を出します',
    mechanismTag: 'box-shadow 厚み + :active translateY 圧縮',
    xRayCaption: '下方向の box-shadow(0 5px 0) を押下時に 1px へ縮め、同時に本体を 4px 下へ沈めています',
    interactiveHint: '「再生」またはボタンをカチッとクリックして沈み込みを試せます',
    defaultDuration: 0.15,
    durationRange: { min: 0.08, max: 0.4, step: 0.02 },
    defaultEasing: 'snappy',
    hasEasingControl: false,
    steps: [
      {
        title: '① ぼかしのない「濃い影」を真下へ 5px 置く',
        detail: 'blur を 0 にして濃い同系色を置くことで、プラスチックの厚みのように見えます。',
        codeHint: 'box-shadow: 0 5px 0 #1e3a8a'
      },
      {
        title: '② :active（押した瞬間）だけ影を減らして本体を下げる',
        detail: '下に 4px 動かしたぶんだけ影を 4px 減らすと、底面の高さが動かず完璧な沈みになります。',
        codeHint: 'transform: translateY(4px); box-shadow: 0 1px 0 #1e3a8a'
      },
      {
        title: '③ 反応速度は 75ms 以下の超高速に',
        detail: '押し心地は遅延があると鈍く感じるため、一番短いトランジションを当てます。',
        codeHint: 'transition: transform 75ms, box-shadow 75ms'
      }
    ],
    keywords: ['立体ボタン', '3Dボタン', 'プッシュ', '押す', 'クリック感', '影'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '物理スイッチ風の立体プッシュボタン',
        goal: '下に厚みのある立体ボタンを作り、押した瞬間だけ影が薄くなって本体が下に沈み込む気持ちいい手応えを実装したいです。',
        mechanism:
          'ぼかし 0px の濃い下影（0 5px 0 色）を付け、:active 時に translateY(4px) と box-shadow: 0 1px 0 を同時に適用します。',
        requirements: [
          '沈んだ分だけ影も同ピクセル削ることで、ボタン下の文章位置がガタつかないようにする',
          'キーボードフォーカス（focus-visible）やタッチ操作でも十分なコントラストと沈み反応を確認できるようにする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<button type="button" class="btn-3d">押してみる</button>

<style>
.btn-3d {
  background: #2563eb; color: #fff; font-weight: 700;
  padding: 12px 24px; border-radius: 12px; border: none;
  box-shadow: 0 5px 0 #1e3a8a;
  transition: transform ${Math.round(params.duration * 1000)}ms ease, box-shadow ${Math.round(params.duration * 1000)}ms ease;
}
.btn-3d:active {
  transform: translateY(4px);
  box-shadow: 0 1px 0 #1e3a8a;
}
</style>`
  },
  {
    id: 'micro-button-shimmer',
    category: 'micro',
    title: '表面を斜めの光の帯がサッと走るシマーCTAボタン',
    subtitle: '「無料で始める」などの一番押してほしい主役ボタンに斜めのハイライト光を走らせて上品に目立たせます',
    mechanismTag: 'overflow: hidden + skewX 斜め光の横断',
    xRayCaption: 'ボタン枠内で斜め -12度に傾けた白い透明グラデーション帯を左端から右端へ横断させています',
    interactiveHint: '「再生」またはボタンをクリックすると白い光の筋が表面を走ります',
    defaultDuration: 0.65,
    durationRange: { min: 0.3, max: 1.5, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① ボタンに overflow: hidden と relative を設定',
        detail: '光がボタンの外へはみ出さないように必ず切り抜き枠を作ります。',
        codeHint: 'position: relative; overflow: hidden'
      },
      {
        title: '② 白の透明グラデーション帯を skewX(-12deg) で傾ける',
        detail: '縦長ではなく少し斜めにするだけで金属やガラスの反射光のように見えます。',
        codeHint: 'linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent)'
      },
      {
        title: '③ 文字レイヤーより奥／手前のバランスを保つ',
        detail: 'pointer-events: none を光要素に付けてクリック判定を邪魔しないようにします。',
        codeHint: 'pointer-events: none'
      }
    ],
    keywords: ['キラッと光る', 'シマー', 'CTA', '主役ボタン', '光沢', '目立つ'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '表面を光が走るシマーCTAボタン',
        goal: 'メインの行動喚起ボタンの表面を斜めの光の帯がスッと駆け抜ける、上品で目を引くCTAを作りたいです。',
        mechanism:
          'overflow: hidden なボタン内に傾けた白い透明グラデーション要素を置き、ホバー時や注目時に translateX で左外から右外へ通過させます。',
        requirements: [
          '過度な連続点滅は避け、ホバー時や1度きりの注目演出に留める',
          '光沢帯のレイヤーには pointer-events: none と aria-hidden="true" を付けてクリック判定を妨げない'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<button type="button" class="btn-shimmer">
  <span>今すぐ始める</span>
  <span class="shine" aria-hidden="true"></span>
</button>

<style>
.btn-shimmer { position: relative; overflow: hidden; background: #18181b; color: #fff; padding: 12px 24px; border-radius: 12px; }
.shine {
  position: absolute; inset: 0; width: 50%; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent);
  transform: translateX(-140%) skewX(-12deg);
  transition: transform ${params.duration.toFixed(2)}s ${ease};
}
.btn-shimmer:hover .shine { transform: translateX(300%) skewX(-12deg); }
</style>`;
    }
  },
  {
    id: 'micro-button-arrow',
    category: 'micro',
    title: 'ホバーで矢印だけが右へスッと伸びる誘導ボタン',
    subtitle: '「次へ進む」「詳しく見る」のボタンで矢印アイコンだけ少し先へ動かすことで、押した先の移動を示唆します',
    mechanismTag: 'ボタン本体固定 + 矢印のみ translateX(+6px)',
    xRayCaption: 'ボタン文字と外枠サイズは一切変えず、矢印SVGだけに小さな前進移動をかけています',
    interactiveHint: '「再生」またはボタンにカーソルを乗せると矢印だけが右へ進みます',
    defaultDuration: 0.25,
    durationRange: { min: 0.1, max: 0.8, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: true,
    steps: [
      {
        title: '① ボタン外枠の幅が変わらないよう margin は使わない',
        detail: 'gap や padding を増やすとボタン幅が膨らんで隣がズレます。必ず transform にします。',
        codeHint: '.btn:hover .arrow { transform: translateX(6px) }'
      },
      {
        title: '② 移動距離は +4〜6px のわずかな幅にする',
        detail: '小さく前に進む動きだけで「次へ進む」先読みイメージが十分伝わります。',
        codeHint: 'translate3d(6px, 0, 0)'
      },
      {
        title: '③ 白背景⇔黒塗り反転を合わせるとさらに明快',
        detail: '色の反転とアイコンの前進が重なることでクリック確信度が高まります。',
        codeHint: 'transition: transform 0.25s, background-color 0.2s'
      }
    ],
    keywords: ['矢印', 'ボタン', '詳細を見る', 'ホバー', '誘導', 'アイコン移動'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '矢印アイコンだけ前進するリンクボタン',
        goal: '「詳しく見る →」のボタンにホバーしたとき、テキスト位置は動かさずに矢印アイコンだけが右へ数ピクセル進み出る反応にしたいです。',
        mechanism:
          '親ボタンの :hover をきっかけに子アイコンへ transform: translate3d(6px, 0, 0) のトランジションを適用します。',
        requirements: [
          'ボタン自体の横幅が広がらないよう right padding にも十分な余裕を持たせる',
          '矢印の移動は transform: translateX のみで行い、文字位置のブレや改行を防ぐ'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<a href="#detail" class="arrow-btn">
  詳細を見る <span class="arr" aria-hidden="true">→</span>
</a>

<style>
.arrow-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border: 1px solid #18181b; border-radius: 9999px; }
.arr { display: inline-block; transition: transform ${params.duration.toFixed(2)}s ${ease}; }
.arrow-btn:hover .arr { transform: translateX(6px); }
</style>`;
    }
  },
  {
    id: 'micro-button-copy',
    category: 'micro',
    title: 'コピーボタンの一瞬チェック変化（完了後に元へ戻る）',
    subtitle: 'URLやコードをコピーする瞬間、アイコンが「✓ コピー完了！」へ緑色に変わり 1.6秒後に戻る親切設計',
    mechanismTag: '状態反転UI + タイマー自動リセット',
    xRayCaption: 'クリックで copied=true にしてチェック図形へ替え、setTimeout で自動リセット（アンマウント時破棄）しています',
    interactiveHint: '「再生」または「コードをコピー」ボタンを押すと完了表示への切り替えが見られます',
    defaultDuration: 0.25,
    durationRange: { min: 0.1, max: 0.8, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: false,
    steps: [
      {
        title: '① アラート窓（alert）を出さずボタン自身で答える',
        detail: 'コピーするたびにポップアップを閉じる手間を省き、押した場所そのもので成功を伝えます。',
        codeHint: 'copied ? "コピー完了！" : "コピーする"'
      },
      {
        title: '② 緑色（チェック）に変えて 1.5〜2 秒見せる',
        detail: 'すぐに元に戻すと見落とすため、しっかり視認できる約1.6秒間だけ保持します。',
        codeHint: 'setTimeout(() => setCopied(false), 1600)'
      },
      {
        title: '③ 連続クリック時は古いタイマーを必ず解除',
        detail: 'clearTimeout(timerRef) を先に行うことで、2回目だけ一瞬で消えるバグを防ぎます。',
        codeHint: 'clearTimeout(prevTimer)'
      }
    ],
    keywords: ['コピー', 'クリップボード', 'チェック', '完了フィードバック', 'ボタン'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '自己完結型コピー完了フィードバックボタン',
        goal: 'コピーボタンを押したとき別画面やアラートを出さず、ボタン自身が「✓ コピー完了！」に変わって約1.6秒後に元へ戻るようにしたいです。',
        mechanism:
          'クリックで copied 状態を true にし色・ラベルを切り替え、保持している setTimeout をリセット付きで 1.6 秒後に false へ戻します。',
        requirements: [
          '連続クリック時や画面離脱時にタイマーが重ならないよう clearTimeout を徹底する',
          'Clipboard API が非SSLや権限拒否で失敗した場合でも例外を出さず安全にフォールバックする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<button type="button" id="copySampleBtn" class="copy-btn">コードをコピー</button>

<style>
.copy-btn { padding: 8px 14px; border: 1px solid #d4d4d8; border-radius: 8px; background: #fff; color: #18181b; font-size: 12px; font-weight: 600; cursor: pointer; transition: all ${params.duration.toFixed(2)}s ease; }
.copy-btn.is-copied { border-color: #16a34a; background: #f0fdf4; color: #15803d; }
</style>

<script>
(() => {
  const btn = document.getElementById('copySampleBtn');
  if (!btn) return;
  let timerId = 0;
  btn.addEventListener('click', () => {
    clearTimeout(timerId);
    btn.classList.add('is-copied');
    btn.textContent = '✓ コピー完了！';
    timerId = setTimeout(() => {
      btn.classList.remove('is-copied');
      btn.textContent = 'コードをコピー';
    }, 1600);
  });
})();
</script>`
  },
  {
    id: 'micro-button-hold',
    category: 'micro',
    title: '誤爆を防ぐ「長押しで確定」プログレスボタン',
    subtitle: '削除や決済など取り消せない操作で、押し続けている間だけ背景ゲージが溜まり 100% で実行する安全装置',
    mechanismTag: 'onPointerDown + requestAnimationFrame ゲージ充填',
    xRayCaption: '押している最中だけ毎フレーム進行 % を増やし、途中で指を離すと安全のため 0% へキャンセルしています',
    interactiveHint: '「再生」またはボタンを長押し（途中で離すと0%へ戻る確認も可能）してください',
    defaultDuration: 0.9,
    durationRange: { min: 0.4, max: 2.0, step: 0.1 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① クリック（一瞬のタップ）では発動させない',
        detail: '誤タップでデータを消す事故を UI の仕組みレベルでゼロにできます。',
        codeHint: 'onPointerDown -> requestAnimationFrame'
      },
      {
        title: '② 指を離した（onPointerUp / Leave）ら即 0% リセット',
        detail: '「あ、間違えた」と思ったら離すだけでキャンセル完了になる安心感があります。',
        codeHint: 'cancelAnimationFrame(rafId); setPct(0)'
      },
      {
        title: '③ 確定時だけ安全色や完了ラベルへ固定',
        detail: '100% に到達した瞬間に「完了！」へ切り替わる明快な達成感を返します。',
        codeHint: 'if (pct >= 100) confirmAction()'
      }
    ],
    keywords: ['長押し', 'ホールド', '誤操作防止', '削除', '安全', 'プログレスボタン'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '誤操作防止の長押し確定ボタン',
        goal: '危険な削除や確定アクションにおいて、単発クリックではなく約 0.9 秒の長押しでゲージが満タンになった時だけ実行されるボタンを作りたいです。',
        mechanism:
          'pointerdown で requestAnimationFrame ループを開始して進捗ゲージの幅を伸ばし、pointerup/pointerleave で中断リセット、100%到達時に確定処理を呼びます。',
        requirements: [
          'スマホでの長押しテキスト選択メニューが出ないよう user-select: none を設定する',
          'キーボード利用者向けにも長押し相当や確認UIの代替操作を提供し、操作不能を防ぐ'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<button type="button" id="holdBtn" class="hold-btn">
  <span class="hold-fill" id="holdFill"></span>
  <span class="hold-label" id="holdLabel">長押しで実行</span>
</button>

<style>
.hold-btn { position: relative; overflow: hidden; padding: 10px 20px; border: 1px solid #fda4af; border-radius: 10px; user-select: none; }
.hold-fill { position: absolute; inset: 0; width: 0%; background: #ffe4e6; }
.hold-label { position: relative; z-index: 1; color: #be123c; font-weight: 700; }
</style>

<script>
(() => {
  const btn = document.getElementById('holdBtn');
  const fill = document.getElementById('holdFill');
  const label = document.getElementById('holdLabel');
  if (!btn || !fill || !label) return;
  let raf = 0;
  const reset = () => { cancelAnimationFrame(raf); fill.style.width = '0%'; };
  btn.addEventListener('pointerdown', () => {
    const start = performance.now();
    const ms = ${Math.round(params.duration * 1000)};
    const step = (now) => {
      const p = Math.min(100, ((now - start) / ms) * 100);
      fill.style.width = p + '%';
      if (p < 100) raf = requestAnimationFrame(step);
      else label.textContent = '✓ 実行確定';
    };
    raf = requestAnimationFrame(step);
  });
  btn.addEventListener('pointerup', reset);
  btn.addEventListener('pointerleave', reset);
})();
</script>`
  },
  {
    id: 'micro-heart-pop',
    category: 'micro',
    title: 'いいね／お気に入りアイコンの「ぽん！」と弾む反応',
    subtitle: 'ハートや星を押した瞬間に 1.36倍 まで一気に膨らんで 0.92倍 に戻り定着する心地よい手応え表現',
    mechanismTag: '@keyframes 多段階バウンド (1 → 1.36 → 0.92 → 1)',
    xRayCaption: '単調な scale 1→1.2 ではなく一瞬大きく弾ませて少しだけ戻す 4 点キーフレームを使っています',
    interactiveHint: '「再生」またはハートアイコンをクリックしてオン／オフの弾みを確認できます',
    defaultDuration: 0.36,
    durationRange: { min: 0.2, max: 0.9, step: 0.04 },
    defaultEasing: 'spring',
    hasEasingControl: true,
    steps: [
      {
        title: '① ON にする瞬間だけ keyframes で大→小→元の弾みを作る',
        detail: '1.0 → 1.36 → 0.92 → 1.0 と 1 回揺り戻しを入れると生き物のような手触りになります。',
        codeHint: '0%: 1 / 35%: 1.36 / 65%: 0.92 / 100%: 1'
      },
      {
        title: '② 解除（OFF）時は弾ませず静かに灰色へ戻す',
        detail: '取り消すときは大げさに弾ませずスッと引くのが自然です。',
        codeHint: 'style={isLiked ? popAnim : undefined}'
      },
      {
        title: '③ 再び押した時に毎回動くようキーを更新する',
        detail: 'React や DOM ではキー切り替えまたはクラス付け直しで毎回確実に再生させます。',
        codeHint: '<Heart key={animCount} />'
      }
    ],
    keywords: ['ハート', 'お気に入り', 'いいね', 'お気に入りボタン', 'バウンド', '弾む'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'ぽんと弾むいいね／お気に入りアイコン',
        goal: 'ハートやお気に入り星アイコンを ON にしたとき、ただ色が変わるだけでなく一度大きく膨らんで元の大きさへ心地よく収まるようにしたいです。',
        mechanism:
          '@keyframes で 0%(scale 1) → 35%(scale 1.36) → 65%(scale 0.92) → 100%(scale 1) の 4 点スケール変化を短時間で再生します。',
        requirements: [
          'お気に入り解除時はアニメーションさせず静かに通常色へ戻す',
          'button の aria-pressed 状態をアイコン色と一致させ、スクリーンリーダーにも現在状態を伝える'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<button type="button" class="heart-btn" aria-pressed="false">♥</button>

<style>
.heart-btn { font-size: 24px; color: #a1a1aa; border: none; background: transparent; cursor: pointer; }
.heart-btn.is-liked { color: #f43f5e; animation: heartPop ${params.duration.toFixed(2)}s ${ease}; }
@keyframes heartPop {
  0% { transform: scale(1); }
  35% { transform: scale(1.36); }
  65% { transform: scale(0.92); }
  100% { transform: scale(1); }
}
</style>`;
    }
  }
];
