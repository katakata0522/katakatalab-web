import type { MotionPattern } from '../types/motion';
import { EASING_OPTIONS, buildStructuredPrompt } from '../utils/motionHelpers';

export const MICRO_AND_LAYOUT_PATTERNS: MotionPattern[] = [
  // =========================================================================
  // 06. ボタン・ホバー反応 (micro)
  // =========================================================================
  {
    id: 'micro-tactile-press',
    category: 'micro',
    title: '物理ボタンの押し込み感（タクタイル）',
    subtitle: '下に立体的な厚みの影を持たせ、マウスを乗せると少し浮き・押すとカチッと沈む手触り',
    mechanismTag: 'box-shadow差分 + translateY',
    xRayCaption: 'ボタン下の「影の厚み」を押し込み時に 0px へ減らし、同じ分だけ本体を下に下げています',
    interactiveHint: '「再生」または中央の青いボタンをホバー＆クリックできます',
    defaultDuration: 0.22,
    durationRange: { min: 0.08, max: 1.0, step: 0.02 },
    secondarySlider: {
      label: '押し込み深さ',
      unit: 'px',
      min: 2,
      max: 8,
      step: 1,
      defaultValue: 4
    },
    defaultEasing: 'snappy',
    hasEasingControl: false,
    steps: [
      {
        title: '① 影をぼかさず「厚み」として下に敷く',
        detail: 'blur（ぼかし）を0pxにした硬い下向きの影を使うと、立体的なボタンの側面（厚み）に見えます。',
        codeHint: 'box-shadow: 0 4px 0 #1d4ed8'
      },
      {
        title: '② 押した瞬間（:active）に本体を4px下げる',
        detail: '影の厚みと同じピクセルだけ本体を下へ移動させます。',
        codeHint: 'transform: translateY(4px)'
      },
      {
        title: '③ 同時に影を0pxにして「床に着いた感」を出す',
        detail: '本体が下がった分だけ影を消すと、本当に物理スイッチを押し込んだ錯覚が生まれます。',
        codeHint: 'box-shadow: 0 0 0 #1d4ed8'
      }
    ],
    keywords: ['ボタン', '押す', '立体', 'タクタイル', 'クリック', 'ホバー'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '物理ボタンの押し込み感（タクタイル）',
        goal: 'ボタンに物理スイッチのような厚みを持たせ、押した瞬間にカチッと下へ沈み込む気持ちいい手触りにしたいです。',
        mechanism:
          `通常時は下にぼかしのない厚み影（box-shadow: 0 ${params.distance}px 0 濃い色）を付け、:active（押下中）に transform: translateY(${params.distance}px) と box-shadow: 0 0 0 を同時に指定します。`,
        requirements: [
          '周囲の要素が押したときにズレないよう height/margin ではなく transform と box-shadow で表現してください',
          '押している感が即座に伝わるよう transition は短め（0.1〜0.18秒）にしてください'
        ],
        params,
        secondaryLabel: '押し込み深さ',
        secondaryUnit: 'px',
        targetNote
      }),
    buildCode: (params) => `<button class="tactile-btn" type="button">今すぐ試してみる</button>

<style>
.tactile-btn {
  padding: 12px 24px;
  border: 0;
  border-radius: 12px;
  background: #2563eb;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 ${params.distance}px 0 #1d4ed8;
  transition: transform ${params.duration.toFixed(2)}s ease, box-shadow ${params.duration.toFixed(2)}s ease;
}

.tactile-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 ${params.distance + 1}px 0 #1d4ed8;
}

.tactile-btn:active {
  transform: translateY(${params.distance}px);
  box-shadow: 0 0 0 #1d4ed8;
}
</style>`
  },
  {
    id: 'micro-click-ripple',
    category: 'micro',
    title: 'クリック座標から広がる波紋（リップル）',
    subtitle: '押した「まさにその場所」を中心にして、水面の輪のように波紋が広がり消える反応',
    mechanismTag: 'クリック座標取得 + scale(0→3)',
    xRayCaption: 'ボタン内のクリック位置（offsetX, offsetY）を計算し、その座標から丸い波を拡大しています',
    interactiveHint: '「再生」またはボタンの好きな場所（左端・中央・右端）をクリックしてみてください',
    defaultDuration: 0.8,
    durationRange: { min: 0.25, max: 2.2, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① ボタン内のどこが押されたか座標を測る',
        detail: '中心ではなく「左端を押したら左端から波紋が広がる」のがリアリティの鍵です。',
        codeHint: 'e.clientX - rect.left'
      },
      {
        title: '② その座標に直径サイズの丸い波を置く',
        detail: 'overflow: hidden のボタン内部で、計測した X・Y の位置に円形 span を生成します。',
        codeHint: 'left: x; top: y; border-radius: 50%'
      },
      {
        title: '③ 一気に大きくしながら透明にして消す',
        detail: 'scale(0) → scale(2.8) へ広げつつ opacity を 0 にして、アニメ終了後に要素を削除します。',
        codeHint: 'scale(0 → 2.8) + opacity(0)'
      }
    ],
    keywords: ['波紋', 'リップル', 'クリック', 'ボタン', 'フィードバック'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'クリック座標から広がる波紋（リップル）',
        goal: 'ボタンのどこをクリックしても、クリックした指先の位置を中心にして波紋がふわっと広がって消えるエフェクトにしたいです。',
        mechanism:
          'ボタンに overflow: hidden; position: relative を設定し、クリック時に getBoundingClientRect() から相対座標（x, y）を算出して丸い波紋 span を配置し、scale(0→2.8) & opacity(0.5→0) のアニメーション後に削除します。',
        requirements: [
          'アニメーションが終わった波紋用DOMは animationend イベントまたは setTimeout で必ず消去してください',
          '波紋がボタンテキストのクリック判定を邪魔しないよう pointer-events: none を付けてください'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<button class="ripple-btn" id="rippleBtn" type="button">クリックして波紋を見る</button>

<style>
.ripple-btn {
  position: relative;
  overflow: hidden;
  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid #d4d4d8;
  background: #ffffff;
  font-weight: 600;
  cursor: pointer;
}

.ripple-wave {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.25);
  pointer-events: none;
  transform: translate(-50%, -50%) scale(0);
  animation: rippleWave ${params.duration.toFixed(2)}s ease-out forwards;
}

@keyframes rippleWave {
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(2.8);
  }
}
</style>

<script>
(() => {
  const btn = document.getElementById("rippleBtn");
  if (!btn) return;
  btn.addEventListener("click", (e) => {
    const rect = btn.getBoundingClientRect();
    const wave = document.createElement("span");
    wave.className = "ripple-wave";
    wave.style.left = (e.clientX - rect.left) + "px";
    wave.style.top = (e.clientY - rect.top) + "px";
    btn.appendChild(wave);
    setTimeout(() => wave.remove(), ${Math.round(params.duration * 1000)});
  });
})();
</script>`
  },
  {
    id: 'micro-underline-sweep',
    category: 'micro',
    title: '入る時は左から・離れる時は右へ抜ける下線',
    subtitle: 'リンクにマウスを乗せると左から線が伸び、外すと右端へ向かってスッと抜ける粋な動き',
    mechanismTag: '::after + transform-originの入れ替え',
    xRayCaption: '普段の支点を「右」に、ホバー中だけの支点を「左」にすると方向が一直線に繋がります',
    interactiveHint: '「再生」またはステージ内のリンクテキストにマウスを乗せて離してみてください',
    defaultDuration: 0.45,
    durationRange: { min: 0.15, max: 1.8, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① 普段の下線は「右端」を支点にして縮める',
        detail: '通常状態（マウスが離れている時）の基準点を right に設定し、scaleX(0) にしておきます。',
        codeHint: 'transform-origin: right; scaleX(0)'
      },
      {
        title: '② マウスが乗った瞬間だけ「左端」支点に切り替え',
        detail: ':hover 時だけ基準点を left に書き換えて scaleX(1) に伸ばすと、左端から右へ線が伸びます。',
        codeHint: ':hover { transform-origin: left; scaleX(1) }'
      },
      {
        title: '③ マウスが離れると「右端」支点に戻り右へ消える',
        detail: 'ホバーが外れた瞬間に基準点が right へ戻るため、線が左に引き返すのではなく右端へ通り抜けます。',
        codeHint: '左→右の一方通行になる！'
      }
    ],
    keywords: ['リンク', '下線', 'ホバー', 'スイープ', '左から右', 'メニュー'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '入る時は左から・離れる時は右へ抜ける下線',
        goal: 'ナビゲーションや文章内リンクにホバーしたとき、下線が左から伸びて、カーソルを離すと右へスッと抜けて消える洗練された動きにしたいです。',
        mechanism:
          '::after の下線要素に対し、通常時は transform-origin: right; transform: scaleX(0) を指定し、:hover 時のみ transform-origin: left; transform: scaleX(1) に切り替えます。',
        requirements: [
          'JavaScript は使わず CSS の transform-origin の切り替えだけで実装してください',
          'タッチデバイスやキーボードフォーカス（:focus-visible）時にも反応するようにしてください'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<a href="#" class="sweep-link">詳しく仕組みを見てみる →</a>

<style>
.sweep-link {
  position: relative;
  display: inline-block;
  color: #18181b;
  text-decoration: none;
  padding-bottom: 4px;
}

.sweep-link::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 2px;
  background: #2563eb;
  transform: scaleX(0);
  transform-origin: right center;
  transition: transform ${params.duration.toFixed(2)}s ${ease};
}

.sweep-link:hover::after,
.sweep-link:focus-visible::after {
  transform: scaleX(1);
  transform-origin: left center;
}
</style>`;
    }
  },
  {
    id: 'micro-magnetic-button',
    category: 'micro',
    title: 'マグネット吸い付きボタン（カーソル追従）',
    subtitle: 'カーソルを近づけると、磁石に引かれるようにボタンがわずかにポインター側へ寄ってくる',
    mechanismTag: 'マウス相対座標 × 係数(0.25)',
    xRayCaption: 'ボタン中心とカーソル座標の差（dx, dy）を計算し、少し弱い比率を掛けて吸い寄せています',
    interactiveHint: '「再生」または枠内のボタン付近でマウスをゆっくり動かしてみてください',
    defaultDuration: 0.35,
    durationRange: { min: 0.1, max: 1.2, step: 0.05 },
    secondarySlider: {
      label: '吸い付き強さ',
      unit: 'px',
      min: 6,
      max: 28,
      step: 2,
      defaultValue: 14
    },
    defaultEasing: 'snappy',
    hasEasingControl: false,
    steps: [
      {
        title: '① ボタンの中心とマウスのズレを測る',
        detail: 'ボタンの中央座標から見て、今カーソルが「右に何px、下に何px」にあるかを計算します。',
        codeHint: 'dx = mouseX - centerX'
      },
      {
        title: '② 全力ではなく「3割程度」だけ寄せる',
        detail: '100%ついていくとボタンが逃げてしまうので、最大±14px程度の控えめな距離に抑えます。',
        codeHint: 'clamp(dx * 0.28, ±14px)'
      },
      {
        title: '③ 外れたらバネのように真ん中へ戻す',
        detail: 'カーソルが要素から離れたら座標を (0, 0) にリセットし、CSS の transition で元の位置へ戻します。',
        codeHint: 'onMouseLeave → translate(0, 0)'
      }
    ],
    keywords: ['マグネット', '磁石', '追従', 'マウス', 'ホバー', 'ボタン'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'マグネット吸い付きボタン（カーソル追従）',
        goal: '重要なCTAボタンにカーソルを乗せて動かすと、磁石に吸い寄せられるようにボタンが少しだけカーソル方向に追従する演出にしたいです。',
        mechanism:
          `mousemove 時にボタン中心からのオフセットを計算して最大 ±${params.distance}px の範囲で translate(x, y) を与え、mouseleave 時に (0, 0) へ滑らかに戻します。`,
        requirements: [
          'スマホなどのタッチ端末（pointer: coarse）では無効化して不要なズレを防いでください',
          '追従中もクリックが外れないよう移動量は現在の指定値程度に抑えてください'
        ],
        params,
        secondaryLabel: '最大移動量',
        secondaryUnit: 'px',
        targetNote
      }),
    buildCode: (params) => `<button class="mag-btn" id="magBtn" type="button">EXPLORE MORE</button>

<style>
.mag-btn {
  padding: 14px 28px;
  border-radius: 9999px;
  border: 1px solid #18181b;
  background: #18181b;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
  transition: transform ${params.duration.toFixed(2)}s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>

<script>
(() => {
  const btn = document.getElementById("magBtn");
  if (!btn) return;
  const maxPull = ${params.distance};
  btn.addEventListener("mousemove", (e) => {
    const rect = btn.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    btn.style.transform = \`translate3d(\${relX * maxPull}px, \${relY * maxPull}px, 0)\`;
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "translate3d(0, 0, 0)";
  });
})();
</script>`
  },

  // =========================================================================
  // 07. 立て付け・スクロール・待機 (layout)
  // =========================================================================
  {
    id: 'layout-sticky-split',
    category: 'layout',
    title: '左説明固定 × 右スクロール（Sticky 2段組）',
    subtitle: '左の見出しや案内だけを画面に留め、右側の詳細カードだけがスルスル流れる定番の立て付け',
    mechanismTag: '2カラム + position: sticky',
    xRayCaption: '左側カラムに position: sticky; top: 16px を指定し、親ブロックの終わりまで吸い付いて留まります',
    interactiveHint: '「再生」で自動スクロールデモ、または枠内のミニページを直接スクロールできます',
    defaultDuration: 2.6,
    durationRange: { min: 1.0, max: 6.0, step: 0.2 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 画面を左右2つの列（Grid）に分ける',
        detail: '左側に「見出しや目次」、右側に「縦長の特徴リスト」を並べる2カラム構成にします。',
        codeHint: 'grid-template-columns: 1fr 1.3fr'
      },
      {
        title: '② 左側の箱に align-self: start と sticky を付ける',
        detail: '親と同じ高さに引き伸ばされないよう align-self: start を付け、position: sticky で上端に引っ掛けます。',
        codeHint: 'position: sticky; top: 24px'
      },
      {
        title: '③ 親のセクションが終わると自然に一緒に流れる',
        detail: 'position: fixed と違って画面を占有しっぱなしにならず、次のセクションが来たら自然に上へ押し流されます。',
        codeHint: 'fixed ではなく sticky！'
      }
    ],
    keywords: ['レイアウト', '立て付け', 'sticky', '固定', '2カラム', 'スクロール'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '左説明固定 × 右スクロール（Sticky 2段組）',
        goal: '特徴紹介やFAQセクションで、左側の見出しコラムがスクロールに追従して固定され、右側の長いリストだけがスクロールする2カラムの立て付けにしたいです。',
        mechanism:
          '親を display: grid; grid-template-columns: 1fr 1.3fr; align-items: start にし、左側要素に position: sticky; top: 32px を設定します（親に overflow: hidden を付けないのが注意点）。',
        requirements: [
          'スマホ幅（768px未満）では1カラム縦積みに戻し、sticky を解除してください',
          'position: sticky が効かなくなるため祖先要素に overflow: hidden を使わないでください（必要なら overflow: clip）'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<section class="sticky-split">
  <div class="sticky-left">
    <h2>選ばれる3つの理由</h2>
    <p>右をスクロールしても左の見出しが見え続けます。</p>
  </div>
  <div class="scroll-right">
    <article class="card">特徴 01</article>
    <article class="card">特徴 02</article>
    <article class="card">特徴 03</article>
  </div>
</section>

<style>
.sticky-split {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 32px;
  align-items: start;
}

.sticky-left {
  position: sticky;
  top: 24px;
}

.card {
  padding: 20px;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  transition: transform ${params.duration.toFixed(2)}s ease, border-color ${params.duration.toFixed(2)}s ease;
}
.card:hover { transform: translateY(-2px); border-color: #cbd5e1; }

@media (max-width: 768px) {
  .sticky-split {
    grid-template-columns: 1fr;
  }
  .sticky-left {
    position: static;
  }
}
</style>`
  },
  {
    id: 'layout-shrinking-header',
    category: 'layout',
    title: 'スクロールで縮む追従ヘッダー＋進捗バー',
    subtitle: '最初はゆとりある高さで、読み始めるとスリムに縮み読了バーが伸びるサイト構造',
    mechanismTag: 'scroll量検知 + 状態クラス + scaleX',
    xRayCaption: 'スクロールが 24px を超えるとヘッダーが薄型モードへ切り替わり、底辺の青線が読了率に連動します',
    interactiveHint: '「再生」またはミニページ内を上下にスクロールして変化を確認できます',
    defaultDuration: 0.45,
    durationRange: { min: 0.15, max: 1.5, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: false,
    steps: [
      {
        title: '① ヘッダーを画面上端に貼り付ける',
        detail: 'スクロールしてもナビを見失わないよう、上端に sticky（または fixed）で固定します。',
        codeHint: 'position: sticky; top: 0'
      },
      {
        title: '② 少しスクロールしたらコンパクト化する',
        detail: 'スクロール位置が一定量を超えたら高さを少し縮め、薄い半透明ガラスと下線影を付けます。',
        codeHint: 'scrollTop > 24 → .is-compact'
      },
      {
        title: '③ 底辺に「どれだけ読んだか」のゲージを添える',
        detail: '現在のスクロール割合（0〜1）を scaleX に渡すだけで、重くならない読了プログレスバーが作れます。',
        codeHint: 'transform: scaleX(progress)'
      }
    ],
    keywords: ['ヘッダー', 'スクロール', '追従', '縮む', 'プログレスバー', '立て付け'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'スクロールで縮む追従ヘッダー＋進捗バー',
        goal: 'ページをスクロールし始めると上部ヘッダーが少しスリムになって背景ぼかしが付き、下端に記事の読了進捗バーが伸びる構造にしたいです。',
        mechanism:
          'sticky ヘッダーに対して scroll イベントで scrollY > 24 を判定しコンパクト状態クラスを切り替え、同時に計算したスクロール進捗率（0〜1）を下端のバーの scaleX に反映します。',
        requirements: [
          'scroll イベントは requestAnimationFrame または passive: true で負荷を抑えてください',
          'ヘッダーの高さが縮むときに本文がガクッと跳ねないよう padding または transform で調整してください'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<header class="site-header" id="siteHeader">
  <div class="header-inner">
    <strong>MySite</strong>
    <nav>概要 / 機能 / 料金</nav>
  </div>
  <div class="read-bar" id="readBar"></div>
</header>

<style>
.site-header {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e4e4e7;
  transition: padding ${params.duration.toFixed(2)}s ease, box-shadow ${params.duration.toFixed(2)}s ease;
  padding: 16px 24px;
}

.site-header.is-compact {
  padding: 8px 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.read-bar {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 2px;
  background: #2563eb;
  transform-origin: left center;
  transform: scaleX(0);
}
</style>

<script>
(() => {
  const header = document.getElementById('siteHeader');
  const readBar = document.getElementById('readBar');
  if (!header || !readBar) return;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    header.classList.toggle('is-compact', y > 40);
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    readBar.style.transform = \`scaleX(\${Math.min(1, y / max)})\`;
  }, { passive: true });
})();
</script>`
  },
  {
    id: 'layout-bento-grid',
    category: 'layout',
    title: 'Bento（弁当箱）グリッド配置レイアウト',
    subtitle: '大小の四角い枠をパズルのように噛み合わせ、情報の重要度に強弱をつけるモダン構造',
    mechanismTag: 'CSS Grid span（2列・2行結合）',
    xRayCaption: '基本のマス目を敷き、目玉要素だけ「横2マス（col-span-2）」や「縦2行（row-span-2）」に広げています',
    interactiveHint: '「再生」で各ブロックが順に組まれる様子と、マス目構造を確認できます',
    defaultDuration: 0.6,
    durationRange: { min: 0.25, max: 2.2, step: 0.05 },
    secondarySlider: {
      label: 'マス間の余白',
      unit: 'px',
      min: 6,
      max: 24,
      step: 2,
      defaultValue: 12
    },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 均等な方眼マス目をベースに引く',
        detail: 'まず 3列や4列の均等な格子（Grid）を用意します。これが「弁当箱の仕切り」の基準になります。',
        codeHint: 'grid-template-columns: repeat(3, 1fr)'
      },
      {
        title: '② 一番見せたい要素だけ「2マス分」占有させる',
        detail: 'すべて同じ大きさだと単調になるため、主役カードだけ横2列や縦2行にまたがらせます。',
        codeHint: 'grid-column: span 2 / grid-row: span 2'
      },
      {
        title: '③ 均等なすき間（gap）と角丸で統一感を出す',
        detail: 'サイズが違う箱が並んでも、すき間（gap）と角丸の半径を全カードで揃えるだけでプロっぽく整います。',
        codeHint: 'gap: 12px; border-radius: 16px'
      }
    ],
    keywords: ['Bento', 'ベントー', 'グリッド', 'レイアウト', '配置', '立て付け', 'カード'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'Bento（弁当箱）グリッド配置レイアウト',
        goal: '特徴や機能紹介セクションを、大小のカードが美しく噛み合うBentoグリッド型のレイアウトにしたいです。',
        mechanism:
          `CSS Grid（PC時は3列または4列、gap: ${params.distance}px）を敷き、主役カードには grid-column: span 2 や grid-row: span 2 を指定して大小の強弱を作ります。`,
        requirements: [
          'モバイル幅（640px未満）では自動的に1列縦並びにフォールバックさせてください',
          'すべてのカードで border-radius と枠線トーンを統一し、カードの入れ子（枠の中に枠）を避けてください'
        ],
        params,
        secondaryLabel: 'カード間の余白',
        secondaryUnit: 'px',
        targetNote
      }),
    buildCode: (params) => `<section class="bento-grid">
  <div class="bento-item bento-wide">主役機能（横2マス）</div>
  <div class="bento-item">サブ指標</div>
  <div class="bento-item">補足A</div>
  <div class="bento-item">補足B</div>
  <div class="bento-item">補足C</div>
</section>

<style>
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${params.distance}px;
}

.bento-item {
  padding: 20px;
  border-radius: 16px;
  border: 1px solid #e4e4e7;
  background: #ffffff;
}

.bento-wide {
  grid-column: span 2;
}

@media (max-width: 640px) {
  .bento-grid { grid-template-columns: 1fr; }
  .bento-wide { grid-column: span 1; }
}
</style>`
  },
  {
    id: 'layout-marquee-loop',
    category: 'layout',
    title: '途切れない無限ループ・マーキー帯',
    subtitle: '導入企業ロゴや新着タグが、継ぎ目なくずっと右から左へ流れ続ける帯レイアウト',
    mechanismTag: '同じリスト2個並び + translateX(-50%)',
    xRayCaption: '同じセット（A・B）を2回連続で並べておき、1セット分（-50%）動いたら0%へ瞬間リセットします',
    interactiveHint: '「再生」で一時停止／再開・ホバーやタップでピタッと止まる動きも確認できます',
    defaultDuration: 12,
    durationRange: { min: 4, max: 30, step: 1 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 同じ中身を「2セット分」横に並べる',
        detail: '1セットだけだと流れ切ったあとに空白ができます。全く同じ配列を2つ繋げて並べるのが種明かしです。',
        codeHint: '[Set A] + [Set A (複製)]'
      },
      {
        title: '② 全体のちょうど半分（-50%）だけ左へ動かす',
        detail: '等速（linear）で 0% → -50% へ動かすと、2セット目の先頭がちょうど最初の位置に来ます。',
        codeHint: 'translateX(-50%) + linear'
      },
      {
        title: '③ マウスを乗せたら読めるよう一時停止させる',
        detail: ':hover 時に animation-play-state: paused を入れておくと、気になった項目を止められます。',
        codeHint: 'animation-play-state: paused'
      }
    ],
    keywords: ['マーキー', 'ループ', '無限', 'ロゴ', '流れる', 'ティッカー'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '途切れない無限ループ・マーキー帯',
        goal: 'ロゴやタグの一覧が継ぎ目なくずっと横方向へ流れ続け、マウスを乗せると一時停止するマーキー帯を作りたいです。',
        mechanism:
          `同じリストアイテム群を2セット横並びに連結し、overflow: hidden の外枠の中で linear 無限ループで translateX(0) から translateX(-50%) まで ${params.duration.toFixed(0)}秒かけて動かします。`,
        requirements: [
          '複製側のリストにはスクリーンリーダーが二重に読まないよう aria-hidden="true" を付けてください',
          '左右の端に淡いグラデーションマスクを掛けるとさらに自然に出入りして見えます'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div class="marquee-wrap">
  <div class="marquee-track">
    <span>Fast UI</span><span>Zero Bloat</span><span>Clear Motion</span><span>Accessible</span>
    <span aria-hidden="true">Fast UI</span><span aria-hidden="true">Zero Bloat</span>
    <span aria-hidden="true">Clear Motion</span><span aria-hidden="true">Accessible</span>
  </div>
</div>

<style>
.marquee-wrap {
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent);
  mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent);
}

.marquee-track {
  display: flex;
  gap: 16px;
  width: max-content;
  animation: marqueeLoop ${params.duration.toFixed(1)}s linear infinite;
}

.marquee-wrap:hover .marquee-track {
  animation-play-state: paused;
}

@keyframes marqueeLoop {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
</style>`
  },
  {
    id: 'layout-skeleton-toast',
    category: 'layout',
    title: '読み込みスケルトン＆通知トースト',
    subtitle: '待ち時間の不安を和らげる「光の帯スケルトン」と、完了を知らせる「右下トースト」',
    mechanismTag: '光帯スライド + 下端からトースト出現',
    xRayCaption: '灰色の仮枠の上を斜めの光（gradient）が横切り、完了時には下端から通知カードが浮かびます',
    interactiveHint: '「再生」を押すと読み込み中（スケルトン）→ 完了通知（トースト）の流れが実演されます',
    defaultDuration: 1.6,
    durationRange: { min: 0.5, max: 4.0, step: 0.1 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 本物の記事と同じ形の「灰色の型」を先に置く',
        detail: 'ぐるぐる回るアイコンより、これから表示される形を薄いグレーで先に見せると待ち時間が短く感じます。',
        codeHint: '骨格プレースホルダー'
      },
      {
        title: '② 左から右へ薄い光のグラデーションを流す',
        detail: '灰色の枠の上を白い半透明のグラデーション帯を繰り返し通過させ「通信中」を伝えます。',
        codeHint: 'translateX(-100% → 100%)'
      },
      {
        title: '③ 完了時に邪魔にならない角からトーストを出す',
        detail: '「保存しました」などの通知は中央モーダルで操作を止めず、右下や下部から数秒だけ浮かせます。',
        codeHint: 'role="status" / 数秒後に退場'
      }
    ],
    keywords: ['スケルトン', 'ローディング', '読み込み', 'トースト', '通知', '待機'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '読み込みスケルトン＆通知トースト',
        goal: 'データ読み込み中は実際のカードに近い形のスケルトンが左から右へ光り、処理完了時は右下（または下部）に完了トーストがスッと現れて数秒後に消えるようにしたいです。',
        mechanism:
          'グレー枠の上に ::after の斜め白グラデーション層を重ねて translateX(-100%→100%) をループさせ、完了時は role="status" のトーストを translateY(16px→0) & opacity(0→1) で出現させます。',
        requirements: [
          '通知トーストはユーザーの操作をブロックしない位置（右下など）に配置し、約3秒で自動的に消えるようにしてください',
          'スクリーンリーダー向けに通知要素へ aria-live="polite" を設定してください'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<button id="saveDemoBtn" type="button">保存して通知を表示</button>
<div class="skeleton-box" id="skeletonBox"></div>
<div class="toast-msg" id="toastMsg" role="status" aria-live="polite">保存が完了しました</div>

<style>
.skeleton-box {
  position: relative;
  overflow: hidden;
  height: 20px;
  border-radius: 8px;
  background: #e4e4e7;
}

.skeleton-box::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent);
  animation: shimmer ${params.duration.toFixed(2)}s infinite;
}

.toast-msg {
  position: fixed;
  right: 20px;
  bottom: 20px;
  padding: 10px 16px;
  border-radius: 10px;
  background: #18181b;
  color: #ffffff;
  opacity: 0;
  transform: translateY(16px);
  pointer-events: none;
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-msg.is-show {
  opacity: 1;
  transform: translateY(0);
}

@keyframes shimmer {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}
</style>

<script>
(() => {
  const toast = document.getElementById('toastMsg');
  const skeleton = document.getElementById('skeletonBox');
  const saveBtn = document.getElementById('saveDemoBtn');
  if (!toast || !skeleton || !saveBtn) return;
  let timer;

  saveBtn.addEventListener('click', () => {
    skeleton.hidden = false;
    clearTimeout(timer);
    setTimeout(() => {
      skeleton.hidden = true;
      toast.classList.add('is-show');
      timer = setTimeout(() => toast.classList.remove('is-show'), 2500);
    }, ${(params.duration * 1000).toFixed(0)});
  });
})();
</script>`
  }
];
