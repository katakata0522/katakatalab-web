import type { MotionPattern } from '../types/motion';
import { EASING_OPTIONS, buildStructuredPrompt } from '../utils/motionHelpers';

export const TEXT_AND_REVEAL_PATTERNS: MotionPattern[] = [
  // =========================================================================
  // 01. 文字の動き (text)
  // =========================================================================
  {
    id: 'text-mask-slide-up',
    category: 'text',
    title: '下からぐっと出現（マスク・スライドアップ）',
    subtitle: '見出しやタイトルが、見えない境界線の下からせり上がって現れる王道表現',
    mechanismTag: 'overflow: hidden + translateY',
    xRayCaption: 'オレンジ点線枠（overflow: hidden）の外から文字を押し上げています',
    defaultDuration: 0.75,
    durationRange: { min: 0.25, max: 2.5, step: 0.05 },
    secondarySlider: {
      label: '押し上げ距離',
      unit: 'px',
      min: 16,
      max: 90,
      step: 2,
      defaultValue: 44
    },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① 見えない切り抜き箱を用意する',
        detail: '文字を囲む親ボックスに「枠からはみ出た部分を隠す」設定をかけます。これが種明かしの正体です。',
        codeHint: 'overflow: hidden'
      },
      {
        title: '② 最初は枠の真下に文字を待機させる',
        detail: '文字そのものを指定ピクセルだけ下へずらし、親ボックスの切り抜きラインの外に隠しておきます。',
        codeHint: 'transform: translateY(44px)'
      },
      {
        title: '③ 一気に定位置（0px）へ滑らせる',
        detail: '後半ほどゆっくり減速するカーブで元の位置へ戻すと、何もない場所から文字がせり上がったように見えます。',
        codeHint: 'translateY(0)'
      }
    ],
    keywords: ['下から', '文字', 'せり上がる', '見出し', 'マスク', 'slide up', 'reveal'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '下からぐっと出現（マスク・スライドアップ）',
        goal: '見出しテキストが見えない水平ラインの下からスッとせり上がって登場する動きにしたいです。',
        mechanism:
          `親要素に overflow: hidden を設定して切り抜き枠を作り、子要素のテキストを初期状態で translateY(${params.distance}px) と opacity: 0 に配置してから、translateY(0) と opacity: 1 へアニメーションさせます。`,
        requirements: [
          'レイアウトのガタつきを防ぐため、margin ではなく GPU負荷の軽い transform と opacity のみで動かしてください',
          '文字の下部（g や y などのディセンダ）が切れないよう親要素に少し余白（padding-bottom）を持たせてください'
        ],
        params,
        secondaryLabel: '押し上げ距離',
        secondaryUnit: 'px',
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="reveal-mask">
  <h2 class="reveal-text">伝わるデザインは、動きから。</h2>
</div>

<style>
.reveal-mask {
  overflow: hidden;
  padding-bottom: 4px;
}

.reveal-text {
  margin: 0;
  animation: maskSlideUp ${params.duration.toFixed(2)}s ${ease} both;
}

@keyframes maskSlideUp {
  from {
    opacity: 0;
    transform: translate3d(0, ${params.distance}px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal-text {
    animation: none;
  }
}
</style>`;
    }
  },
  {
    id: 'text-sweep-left-to-right',
    category: 'text',
    title: '左から右へ流れる登場（ワイプ出現）',
    subtitle: 'カーテンを右へ開けるように、文字の左端から順にくっきり現れる動き',
    mechanismTag: 'clip-path + translateX',
    xRayCaption: '最初は右端100%を隠した切り抜き窓（clip-path）を左から右へ開いています',
    defaultDuration: 0.95,
    durationRange: { min: 0.3, max: 2.8, step: 0.05 },
    secondarySlider: {
      label: '横スライド幅',
      unit: 'px',
      min: 0,
      max: 80,
      step: 4,
      defaultValue: 32
    },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① 右側を100%切り抜いて隠す',
        detail: '要素の上下左右をトリミングできる CSS の「切り抜き窓」を使い、右側から100%分を覆い隠します。',
        codeHint: 'clip-path: inset(0 100% 0 0)'
      },
      {
        title: '② 少し左側にオフセットしておく',
        detail: '同時に文字全体を少しだけ左へ寄せておくと、「左から流れ込んでくる」勢いが自然に加わります。',
        codeHint: 'translateX(-32px)'
      },
      {
        title: '③ 切り抜き窓を0%にして全開にする',
        detail: '右側の切り抜き量を 100% → 0% へ減らしながら定位置へ戻すことで、インクが走るように文字が現れます。',
        codeHint: 'clip-path: inset(0 0 0 0)'
      }
    ],
    keywords: ['左から右', '流れる', 'ワイプ', 'clip-path', '文字', '横'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '左から右へ流れる登場（ワイプ出現）',
        goal: '文字が左から右へカーテンが開くようにスッと流れながら現れる動きにしたいです。',
        mechanism:
          `clip-path: inset(0 100% 0 0) と translateX(-${params.distance}px) の状態から、clip-path: inset(0 0 0 0) と translateX(0) へ変化させます。`,
        requirements: [
          '親要素の横幅が不自然に伸びないよう、元の横幅を確保したまま clip-path で切り抜いてください',
          '文字が途中で欠けないよう inline-block または block 要素に適用してください'
        ],
        params,
        secondaryLabel: '横スライド幅',
        secondaryUnit: 'px',
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<p class="sweep-text">左から右へ、言葉が流れ込む。</p>

<style>
.sweep-text {
  display: inline-block;
  margin: 0;
  animation: sweepRight ${params.duration.toFixed(2)}s ${ease} both;
}

@keyframes sweepRight {
  0% {
    opacity: 0.25;
    transform: translate3d(-${params.distance}px, 0, 0);
    clip-path: inset(0 100% 0 0);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    clip-path: inset(0 0 0 0);
  }
}
</style>`;
    }
  },
  {
    id: 'text-stagger-chars',
    category: 'text',
    title: '1文字ずつ波打つ連鎖（スタガー）',
    subtitle: 'テキストを1文字ずつバラして、少しだけ時間をずらしながら順番に浮かび上げる',
    mechanismTag: 'span分割 + animation-delay',
    xRayCaption: '各文字を別々の箱（span）に分け、開始時刻だけを少しずつ遅らせています',
    defaultDuration: 0.65,
    durationRange: { min: 0.2, max: 2.5, step: 0.05 },
    secondarySlider: {
      label: '文字間のズレ',
      unit: 'ms',
      min: 20,
      max: 250,
      step: 5,
      defaultValue: 75
    },
    defaultEasing: 'spring',
    hasEasingControl: true,
    steps: [
      {
        title: '① 文を1文字ずつの要素に分ける',
        detail: '見た目上は1行の文章ですが、裏側では「あ」「い」「う」…と1文字ごとに独立した箱に入れています。',
        codeHint: '<span>文</span><span>字</span>'
      },
      {
        title: '② 同じアニメーションに時間差をつける',
        detail: '動き自体は全員同じ「下から少し浮き上がる」だけ。何番目かに応じて待ち時間だけをずらします。',
        codeHint: 'animation-delay: calc(var(--i) * 75ms)'
      },
      {
        title: '③ スクリーンリーダーにも配慮する',
        detail: '音声読み上げが1文字ずつバラバラに読まないよう、見た目用要素と読み上げ用テキストの配慮を添えます。',
        codeHint: 'aria-label / aria-hidden'
      }
    ],
    keywords: ['1文字ずつ', '順番', 'スタガー', '波', 'パラパラ', '文字'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '1文字ずつ波打つ連鎖（スタガー）',
        goal: '見出しの文字が1文字ずつリズムよく順番に下からポンッと現れるようにしたいです。',
        mechanism:
          `テキストを1文字ずつ inline-block の <span> に分割し、インデックス番号 --i に応じて animation-delay: calc(var(--i) * ${params.distance}ms) を設定して出現アニメーションさせます。`,
        requirements: [
          '半角スペースが潰れないよう white-space: pre を使ってください',
          'スクリーンリーダーで1文字ずつ読み上げられないよう、親に aria-label を付けて各 span には aria-hidden="true" を付けてください'
        ],
        params,
        secondaryLabel: '文字間のズレ',
        secondaryUnit: 'ms',
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<h2 class="stagger-title" aria-label="リズムで伝える言葉">
  <span style="--i:0" aria-hidden="true">リ</span>
  <span style="--i:1" aria-hidden="true">ズ</span>
  <span style="--i:2" aria-hidden="true">ム</span>
  <span style="--i:3" aria-hidden="true">で</span>
  <span style="--i:4" aria-hidden="true">伝</span>
  <span style="--i:5" aria-hidden="true">え</span>
  <span style="--i:6" aria-hidden="true">る</span>
</h2>

<style>
.stagger-title span {
  display: inline-block;
  white-space: pre;
  animation: charRise ${params.duration.toFixed(2)}s ${ease} both;
  animation-delay: calc(var(--i) * ${params.distance}ms);
}

@keyframes charRise {
  from {
    opacity: 0;
    transform: translate3d(0, 24px, 0) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
</style>`;
    }
  },
  {
    id: 'text-typewriter',
    category: 'text',
    title: 'タイプライター打鍵（1文字ずつ打ち込む）',
    subtitle: '誰かが今キーボードで入力しているようなライブ感と物語性を出す表現',
    mechanismTag: '文字列スライス + 点滅カーソル',
    xRayCaption: '文字数カウントを1つずつ増やしながら、右端に点滅する縦線カーソルを表示しています',
    defaultDuration: 1.8,
    durationRange: { min: 0.5, max: 4.5, step: 0.1 },
    secondarySlider: {
      label: '余白カーソル幅',
      unit: 'px',
      min: 2,
      max: 6,
      step: 1,
      defaultValue: 3
    },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 表示する文字数を0から少しずつ増やす',
        detail: '全文をあらかじめ持っておき、一定間隔のタイマーで「最初からN文字目まで」を切り出して表示します。',
        codeHint: 'text.slice(0, count)'
      },
      {
        title: '② 右端に細い縦線カーソルを置く',
        detail: '文字のすぐ右に border-right や疑似要素で細い線を置き、0.8秒周期で点滅させます。',
        codeHint: 'animation: blink 0.8s step-end infinite'
      },
      {
        title: '③ 改行ガタつきを抑える',
        detail: '途中で複数行に折り返してガタつかないよう、最小の高さをあらかじめ確保しておくと安定します。',
        codeHint: 'min-height'
      }
    ],
    keywords: ['タイプライター', 'タイピング', 'カーソル', '1文字ずつ', '打ち込み'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'タイプライター打鍵（1文字ずつ打ち込む）',
        goal: 'キャッチコピーやAIの返答メッセージが、目の前で1文字ずつタイプされているように表示したいです。',
        mechanism:
          `合計 ${params.duration.toFixed(2)}秒かけて文字列の先頭から1文字ずつ slice() で表示文字数を増やし、末尾に幅 ${params.distance}px の点滅カーソルを表示します。`,
        requirements: [
          '日本語（全角文字）でも綺麗に動くよう CSS の ch 単位ではなく JS の文字数カウント（Array.from でサロゲートペア対応）で制御してください',
          '再表示する際は前回のタイマーを必ず clearInterval / clearTimeout してください'
        ],
        params,
        secondaryLabel: 'カーソル線幅',
        secondaryUnit: 'px',
        targetNote
      }),
    buildCode: (params) => `<p class="typewriter-line">
  <span id="typeTarget"></span><span class="type-caret" aria-hidden="true"></span>
</p>

<style>
.type-caret {
  display: inline-block;
  width: ${params.distance}px;
  height: 1.1em;
  margin-left: 3px;
  vertical-align: text-bottom;
  background: #2563eb;
  animation: caretBlink 0.8s step-end infinite;
}

@keyframes caretBlink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
</style>

<script>
(() => {
  const message = "アイデアを、そのまま動きにする。";
  const chars = Array.from(message);
  const target = document.getElementById("typeTarget");
  if (!target) return;

  const stepMs = Math.max(16, Math.round((${params.duration.toFixed(2)} * 1000) / chars.length));
  let index = 0;
  const timer = setInterval(() => {
    index += 1;
    target.textContent = chars.slice(0, index).join("");
    if (index >= chars.length) clearInterval(timer);
  }, stepMs);
})();
</script>`
  },
  {
    id: 'text-marker-highlight',
    category: 'text',
    title: '蛍光マーカーが左から引かれる',
    subtitle: '注目してほしいキーワードの背後に、ペンで線を引くように色の帯が伸びる演出',
    mechanismTag: '::before + scaleX(0→1)',
    xRayCaption: '文字の背面（z-index: -1）に置いた色帯の横幅倍率を 0%→100% に伸ばしています',
    defaultDuration: 0.7,
    durationRange: { min: 0.2, max: 2.5, step: 0.05 },
    secondarySlider: {
      label: '帯の高さ',
      unit: '%',
      min: 20,
      max: 100,
      step: 5,
      defaultValue: 45
    },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① 文字の下敷き用レイヤーを作る',
        detail: '強調したい文字の後ろ（背面レイヤー）に、半透明の黄色や青の四角い帯を敷きます。',
        codeHint: 'z-index: -1 / position: absolute'
      },
      {
        title: '② 左端をピン留めして横幅0に縮める',
        detail: '伸び始める基準点を「左端（left）」に固定し、横方向の倍率を 0（見えない状態）にしておきます。',
        codeHint: 'transform-origin: left; transform: scaleX(0)'
      },
      {
        title: '③ 倍率を1に戻して線を引く',
        detail: '横倍率を 0 → 1 へ戻すと、まるで人の手が左から蛍光ペンを引いたような自然な強調になります。',
        codeHint: 'transform: scaleX(1)'
      }
    ],
    keywords: ['マーカー', '下線', 'ハイライト', '強調', '左から右', 'ペン'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '蛍光マーカーが左から引かれる',
        goal: '重要なキーワードの後ろに、左から右へ蛍光ペンで線を引くようなハイライト帯をつけたいです。',
        mechanism:
          `対象テキストを position: relative; z-index: 1 にし、背面に配置した帯（高さ ${params.distance}%）を transform-origin: left center で scaleX(0) から scaleX(1) へアニメーションさせます。`,
        requirements: [
          'width ではなく scaleX で伸ばすことで描画パフォーマンスを軽く保ってください',
          '文字と背景帯のコントラストが落ちないよう淡い背景色（例: rgba(253, 224, 71, 0.55)）を使ってください'
        ],
        params,
        secondaryLabel: '帯の高さ',
        secondaryUnit: '%',
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<p class="lead">
  大事な場所だけを、<span class="marker-word">直感的に強調</span>します。
</p>

<style>
.marker-word {
  position: relative;
  z-index: 1;
  display: inline-block;
  padding: 0 4px;
}

.marker-word::before {
  content: "";
  position: absolute;
  left: 0;
  bottom: 2px;
  width: 100%;
  height: ${params.distance}%;
  background: rgba(253, 224, 71, 0.65);
  border-radius: 3px;
  z-index: -1;
  transform-origin: left center;
  animation: markerDraw ${params.duration.toFixed(2)}s ${ease} both;
}

@keyframes markerDraw {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
</style>`;
    }
  },

  // =========================================================================
  // 02. 箱・カードの出現 (reveal)
  // =========================================================================
  {
    id: 'reveal-fade-lift',
    category: 'reveal',
    title: 'ふわっと浮き上がり（フェード＋リフト）',
    subtitle: '写真やカードが、少し下から浮かび上がりながら優しく輪郭を表す基本モーション',
    mechanismTag: 'opacity + translateY + scale',
    xRayCaption: '薄い点線位置から少し拡大しつつ上方向へスッと持ち上げています',
    defaultDuration: 0.75,
    durationRange: { min: 0.25, max: 2.5, step: 0.05 },
    secondarySlider: {
      label: '浮き上がり量',
      unit: 'px',
      min: 8,
      max: 72,
      step: 4,
      defaultValue: 28
    },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① 透明・少し下・わずかに小さめで待機',
        detail: 'いきなり100%出現させるのではなく、97%サイズで28px下に控えておくと角が取れた印象になります。',
        codeHint: 'opacity: 0; scale(0.97)'
      },
      {
        title: '② 移動と透明度を同時に変化させる',
        detail: '透明度を上げつつ元の位置（0px, 100%サイズ）へ引き上げることで「浮かび上がる」質感が生まれます。',
        codeHint: 'translateY(0) scale(1)'
      },
      {
        title: '③ スクロール連動と相性抜群',
        detail: '画面に入った瞬間を IntersectionObserver で検知してこのクラスを付けるのが現場の定番です。',
        codeHint: 'IntersectionObserver'
      }
    ],
    keywords: ['ふわっと', 'カード', 'フェード', '浮き上がり', '出現', 'スクロール'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'ふわっと浮き上がり（フェード＋リフト）',
        goal: 'カードや画像ブロックが画面に現れる際、少し下からふわっと浮かび上がる自然な出現にしたいです。',
        mechanism:
          `opacity: 0, transform: translateY(${params.distance}px) scale(0.97) から opacity: 1, translateY(0) scale(1) へ遷移させます。`,
        requirements: [
          '移動距離を大きくしすぎると重たく見えるため、現在の指定距離前後を保ってください',
          'スクロールで表示される要素の場合は IntersectionObserver（threshold: 0.15）と組み合わせて一度だけ再生してください'
        ],
        params,
        secondaryLabel: '浮き上がり量',
        secondaryUnit: 'px',
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="fade-lift-card">
  <h3>すっきり浮かぶカード</h3>
  <p>視覚的な引っかかりを抑えた上品な出現です。</p>
</div>

<style>
.fade-lift-card {
  animation: fadeLift ${params.duration.toFixed(2)}s ${ease} both;
}

@keyframes fadeLift {
  from {
    opacity: 0;
    transform: translate3d(0, ${params.distance}px, 0) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
</style>`;
    }
  },
  {
    id: 'reveal-curtain-block',
    category: 'reveal',
    title: '色幕めくり出現（リビールブロック）',
    subtitle: '色のついた幕が横切ってからスッと引き、その裏から中身が顔を出す演出',
    mechanismTag: '2段階 scaleX + transform-origin切替',
    xRayCaption: '前半で左端から幕が伸び（0→1）、折り返しで右端支点に切り替えて縮んでいます（1→0）',
    defaultDuration: 1.1,
    durationRange: { min: 0.4, max: 3.0, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: true,
    steps: [
      {
        title: '① 前半：左から幕を伸ばして覆う',
        detail: '最初の45%の時間で、色つきの長方形幕を左端から右端へ100%の幅まで一気に伸ばします。',
        codeHint: 'origin: left; scaleX: 0 → 1'
      },
      {
        title: '② 折り返し：隠れていた中身をオンにする',
        detail: '幕が画面を完全に覆った瞬間に、裏にある文字や画像の透明度を 0 → 1 へ切り替えます。',
        codeHint: 'opacity: 0 → 1'
      },
      {
        title: '③ 後半：基準点を右へ移して幕を抜く',
        detail: '伸び縮みの基準点を「左」から「右」に切り替え、幕を縮めることで右方向へ抜けていく動きになります。',
        codeHint: 'origin: right; scaleX: 1 → 0'
      }
    ],
    keywords: ['カーテン', '幕', 'ブロック', 'リビール', 'めくり', 'ブランド'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '色幕めくり出現（リビールブロック）',
        goal: 'アクセント色の幕が左から走って領域を覆った直後、右へ抜けると同時に中の要素が現れる演出にしたいです。',
        mechanism:
          `前面の ::after 幕を前半で transform-origin: left の scaleX(0→1) で広げ、中間のタイミングで中の要素を opacity: 1 にし、後半で transform-origin: right に切り替えて scaleX(1→0) で消します。`,
        requirements: [
          '幕が完全に閉じた瞬間（45%付近）に中身が切り替わるようにキーフレームを調整してください',
          '要素の外へ幕が飛び出さないよう overflow: hidden を指定してください'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="curtain-box">
  <span class="curtain-content">BRAND CONCEPT 2026</span>
</div>

<style>
.curtain-box {
  position: relative;
  display: inline-block;
  overflow: hidden;
  padding: 12px 20px;
}

.curtain-content {
  display: inline-block;
  font-weight: 700;
  animation: curtainShow ${params.duration.toFixed(2)}s linear both;
}

.curtain-box::after {
  content: "";
  position: absolute;
  inset: 0;
  background: #2563eb;
  animation: curtainSlide ${params.duration.toFixed(2)}s ${ease} both;
}

@keyframes curtainShow {
  0%, 44% { opacity: 0; }
  45%, 100% { opacity: 1; }
}

@keyframes curtainSlide {
  0% { transform-origin: left center; transform: scaleX(0); }
  45% { transform-origin: left center; transform: scaleX(1); }
  46% { transform-origin: right center; transform: scaleX(1); }
  100% { transform-origin: right center; transform: scaleX(0); }
}
</style>`;
    }
  },
  {
    id: 'reveal-stagger-grid',
    category: 'reveal',
    title: 'カード連鎖スタガー登場',
    subtitle: '一覧の複数カードが「タタタン」と心地よいリズムで順番に揃う構造',
    mechanismTag: 'CSS変数 --i × 遅延時間',
    xRayCaption: '各カードに番号（0, 1, 2, 3）を振り、待機時間だけを掛け算でずらしています',
    defaultDuration: 0.55,
    durationRange: { min: 0.2, max: 2.5, step: 0.05 },
    secondarySlider: {
      label: 'カード間のズレ',
      unit: 'ms',
      min: 40,
      max: 600,
      step: 20,
      defaultValue: 220
    },
    defaultEasing: 'snappy',
    hasEasingControl: true,
    steps: [
      {
        title: '① 同じ出現クラスを全カードに貼る',
        detail: '動きのレシピ自体は1つだけ作ります。4枚あっても別々のアニメーションを書く必要はありません。',
        codeHint: '.stagger-item'
      },
      {
        title: '② 何枚目かを表す番号だけ渡す',
        detail: '各カードにカスタム変数で 0, 1, 2, 3 と順番を持たせ、待ち時間に掛け算します。',
        codeHint: 'delay: calc(var(--i) * 220ms)'
      },
      {
        title: '③ 1枚ずつ区切って見せるリズム',
        detail: '1枚あたり 180〜240ms ほど間を取ると、塊ではなく「1・2・3・4」と心地よく分離して届きます。',
        codeHint: '180ms〜240ms推奨'
      }
    ],
    keywords: ['カード', 'グリッド', '一覧', '順番', 'スタガー', '連鎖'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'カード連鎖スタガー登場',
        goal: '並ぶ複数のカードが同時にパッと出るのではなく、左上から順に小気味よく連鎖して現れるようにしたいです。',
        mechanism:
          `各カード要素に style="--i: 0, 1, 2..." を与え、animation-delay: calc(var(--i) * ${params.distance}ms) で時間差出現させます。`,
        requirements: [
          'カード数が多い場合に最後のカードが遅くなりすぎないよう、最大遅延に上限（例: 6枚目以降はリセット）を設けてください',
          'レイアウトが崩れないよう transform と opacity のみ変化させてください'
        ],
        params,
        secondaryLabel: 'カード間のズレ',
        secondaryUnit: 'ms',
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="card-grid">
  <div class="grid-card" style="--i:0">01</div>
  <div class="grid-card" style="--i:1">02</div>
  <div class="grid-card" style="--i:2">03</div>
  <div class="grid-card" style="--i:3">04</div>
</div>

<style>
.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.grid-card {
  padding: 18px;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  background: #ffffff;
  animation: staggerEnter ${params.duration.toFixed(2)}s ${ease} both;
  animation-delay: calc(var(--i) * ${params.distance}ms);
}

@keyframes staggerEnter {
  from {
    opacity: 0;
    transform: translate3d(0, 22px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
</style>`;
    }
  },
  {
    id: 'reveal-3d-flip',
    category: 'reveal',
    title: '立体3D起き上がり（パースペクティブ）',
    subtitle: '寝かせていたパネルや文字が、手前にパタッと起き上がってくる奥行き演出',
    mechanismTag: 'perspective + rotateX',
    xRayCaption: 'カメラ距離（perspective: 700px）を設定した空間で、X軸を中心に手前に回転させています',
    defaultDuration: 0.85,
    durationRange: { min: 0.25, max: 2.5, step: 0.05 },
    secondarySlider: {
      label: '初期の傾き角',
      unit: '度',
      min: 20,
      max: 90,
      step: 5,
      defaultValue: 65
    },
    defaultEasing: 'spring',
    hasEasingControl: true,
    steps: [
      {
        title: '① 空間の「遠近感」を指定する',
        detail: 'ただ回転させるだけだと平面が縮むだけに見えます。カメラとの距離（perspective）を指定して遠近感を出します。',
        codeHint: 'perspective(700px)'
      },
      {
        title: '② 奥側へパタンと倒した状態から開始',
        detail: '横軸（X軸）を中心に指定角度だけ傾けておきます。上端を奥へ倒すイメージです。',
        codeHint: 'rotateX(-65deg)'
      },
      {
        title: '③ 正面（0度）へ起き上がらせる',
        detail: '少し弾むカーブで 0deg へ戻すと、看板やカードが目の前に立ち上がる立体感が出ます。',
        codeHint: 'rotateX(0deg)'
      }
    ],
    keywords: ['3D', '立体', '回転', 'フリップ', '起き上がり', 'カード'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '立体3D起き上がり（パースペクティブ）',
        goal: 'カードやパネルが奥に倒れた状態から、立体的な遠近感を伴って正面にパタッと起き上がるようにしたいです。',
        mechanism:
          `transform: perspective(700px) rotateX(-${params.distance}deg) translateY(12px) の状態から rotateX(0deg) へ回転させます。`,
        requirements: [
          '必ず perspective() を指定して平面的な潰れではなく3Dの遠近感を維持してください',
          'ぼやけを防ぐため回転後に transform: none 相当の整数位置へ収まるようにしてください'
        ],
        params,
        secondaryLabel: '初期の傾き角',
        secondaryUnit: '度',
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="flip-panel">立体的に立ち上がるパネル</div>

<style>
.flip-panel {
  padding: 20px 24px;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  background: #ffffff;
  transform-origin: bottom center;
  animation: flipUp ${params.duration.toFixed(2)}s ${ease} both;
}

@keyframes flipUp {
  from {
    opacity: 0;
    transform: perspective(700px) rotateX(-${params.distance}deg) translate3d(0, 12px, 0);
  }
  to {
    opacity: 1;
    transform: perspective(700px) rotateX(0deg) translate3d(0, 0, 0);
  }
}
</style>`;
    }
  }
];
