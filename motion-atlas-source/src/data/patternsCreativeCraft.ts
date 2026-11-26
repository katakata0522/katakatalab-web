import type { MotionPattern } from '../types/motion';
import { EASING_OPTIONS, buildStructuredPrompt } from '../utils/motionHelpers';

export const CREATIVE_CRAFT_PATTERNS: MotionPattern[] = [
  {
    id: 'craft-flip-card',
    category: 'craft',
    title: 'くるっと裏返る3D解説フリップカード',
    subtitle: '表面に見出しや写真、クリック／再生で立体的に180度反転して裏側の種明かし・詳細を見せるカード',
    mechanismTag: 'preserve-3d + rotateY(180deg) + 裏面非表示',
    xRayCaption: '表と裏の箱を背中合わせで重ね、両方とも backface-visibility: hidden で裏側を隠しています',
    interactiveHint: '「再生」またはカードそのものをクリックして表裏を裏返せます',
    defaultDuration: 0.75,
    durationRange: { min: 0.25, max: 2.2, step: 0.05 },
    defaultEasing: 'spring',
    hasEasingControl: true,
    steps: [
      {
        title: '① 外枠に遠近感（perspective）を設定する',
        detail: '親ボックスに perspective: 900px を与えると、回った時に手前が大きく奥が小さい立体感が出ます。',
        codeHint: 'perspective: 900px'
      },
      {
        title: '② 内側の回転体に preserve-3d を指定する',
        detail: '表面と裏面を入れた回転パネルに transform-style: preserve-3d を指定し、3D空間を保ちます。',
        codeHint: 'transform-style: preserve-3d'
      },
      {
        title: '③ 裏面は最初から 180度回して背面隠し',
        detail: '表も裏も backface-visibility: hidden を付けると、裏を向いた側が消えて正しく入れ替わります。',
        codeHint: 'backface-visibility: hidden'
      }
    ],
    keywords: ['カード', 'フリップ', '裏返し', '3D', '回転', 'クイズ', '解説', 'インタラクティブ'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'くるっと裏返る3D解説フリップカード',
        goal: 'カードをクリックすると立体的に Y 軸 180 度回転し、裏面に隠れていた補足解説が現れるフリップカードを作る。',
        mechanism: 'perspective + transform-style: preserve-3d + backface-visibility: hidden により表面と rotateY(180deg) の裏面を切り替え。',
        requirements: [
          'クリック可能なカード全体は <button> にし、aria-pressed で反転状態を伝える',
          '表と裏の文字が反転中や回転後に重なって透けないよう backface-visibility: hidden を両方に入れる'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="flip-scene">
  <button type="button" class="flip-card" id="flipCard" aria-pressed="false">
    <span class="face front">表面：クリックで裏返す</span>
    <span class="face back">裏面：種明かしや詳細解説</span>
  </button>
</div>

<style>
.flip-scene { perspective: 900px; width: 280px; height: 170px; }
.flip-card {
  position: relative;
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
  transform-style: preserve-3d;
  transition: transform ${params.duration.toFixed(2)}s ${ease};
  cursor: pointer;
}
.flip-card.is-flipped { transform: rotateY(180deg); }
.face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 14px;
  backface-visibility: hidden;
  padding: 16px;
}
.front { background: #ffffff; border: 1px solid #e4e4e7; color: #18181b; }
.back { background: #18181b; color: #ffffff; transform: rotateY(180deg); }
</style>

<script>
(() => {
  const card = document.getElementById('flipCard');
  if (!card) return;
  card.addEventListener('click', () => {
    const flipped = card.classList.toggle('is-flipped');
    card.setAttribute('aria-pressed', String(flipped));
  });
})();
</script>`;
    }
  },
  {
    id: 'craft-before-after',
    category: 'craft',
    title: 'ツマミで引っ張るビフォー・アフター比較',
    subtitle: '改善前と改善後の画面・写真をぴったり同じ位置に重ね、中央の線をつまんで左右に比較するインタラクティブUI',
    mechanismTag: '同位置重ね + clip-path: inset(切り抜き%)',
    xRayCaption: '幅（width）を縮めると中身が潰れるため、幅は 100% のまま clip-path で見える範囲だけ切り抜いています',
    interactiveHint: '「再生」で自動比較、または青いつまみを左右にドラッグして見比べられます',
    defaultDuration: 1.6,
    durationRange: { min: 0.5, max: 4.0, step: 0.1 },
    secondarySlider: {
      label: '初期分割位置',
      unit: '%',
      min: 20,
      max: 80,
      step: 5,
      defaultValue: 50
    },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① Before と After をまったく同じ大きさで重ねる',
        detail: '2つの画面を position: absolute; inset: 0 で完全にぴったり重ね合わせます。',
        codeHint: 'position: absolute; inset: 0'
      },
      {
        title: '② 手前だけを clip-path: inset() で隠す',
        detail: '右側から何%隠すかを変化させると、絵や文字の比率が一切歪まずスッと境目だけが動きます。',
        codeHint: 'clip-path: inset(0 calc(100% - var(--split)) 0 0)'
      },
      {
        title: '③ Pointer イベント（マウス/指の両対応）で割合更新',
        detail: 'カーソル横位置 ÷ 枠幅 を 5%〜95% に丸め、レンジスライダー並みの滑らかな比較体験を実現します。',
        codeHint: 'pointerdown / pointermove'
      }
    ],
    keywords: ['比較', 'ビフォーアフター', 'スライダー', 'クリップ', 'clip-path', 'ドラッグ', '独創的'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'ビフォー・アフター比較スライダー',
        goal: '改善前（Before）と改善後（After）の見た目・写真をぴったり重ね、ドラッグできる境界ハンドルで自由に比較できるUIにする。',
        mechanism: '2層を同サイズで重ね、上層に clip-path: inset(0 calc(100% - split) 0 0) を掛けて内容が潰れないよう切り抜き。',
        secondaryLabel: '初期分割位置',
        secondaryUnit: '%',
        requirements: [
          'マウス操作とスマホの指ドラッグの両方が動くよう pointer 系イベントと touch-action: none を使う',
          '上下の文字やボタンが比較中に横幅圧縮されないよう width 変更ではなく clip-path で切り抜く'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div class="ba-box" id="baBox" style="--split: ${params.distance}%;">
  <div class="ba-layer ba-after">AFTER（整理後のデザイン）</div>
  <div class="ba-layer ba-before">BEFORE（整理前のデザイン）</div>
  <div class="ba-handle" aria-hidden="true"></div>
</div>

<style>
.ba-box {
  position: relative;
  height: 200px;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid #e4e4e7;
  touch-action: none;
  cursor: ew-resize;
  user-select: none;
}
.ba-layer { position: absolute; inset: 0; padding: 20px; }
.ba-after { background: #ffffff; }
.ba-before {
  background: #e4e4e7;
  clip-path: inset(0 calc(100% - var(--split)) 0 0);
}
.ba-handle {
  position: absolute;
  top: 0; bottom: 0;
  left: var(--split);
  width: 2px;
  background: #2563eb;
}
</style>

<script>
(() => {
  const box = document.getElementById('baBox');
  if (!box) return;
  let dragging = false;
  const update = (x) => {
    const r = box.getBoundingClientRect();
    if (r.width <= 0) return;
    const pct = Math.min(95, Math.max(5, ((x - r.left) / r.width) * 100));
    box.style.setProperty('--split', pct.toFixed(1) + '%');
  };
  box.addEventListener('pointerdown', (e) => { dragging = true; update(e.clientX); });
  window.addEventListener('pointermove', (e) => { if (dragging) update(e.clientX); });
  window.addEventListener('pointerup', () => { dragging = false; });
})();
</script>`
  },
  {
    id: 'craft-tilt-shine',
    category: 'craft',
    title: 'カーソルに反応して傾く3Dチルト＆ツヤ光沢カード',
    subtitle: 'マウスを当てた角へ向かってカードが少し沈み込み、同時にガラスのようなツヤ反射が追いかける立体表現',
    mechanismTag: 'マウス座標 (-0.5〜+0.5) × 角度 + radial-gradient 光沢',
    xRayCaption: 'カード中心からの X/Y ズレを角度（rotateX / rotateY）に変換し、光沢の中心座標も同じ割合で動かしています',
    interactiveHint: '「再生」でのデモ、または暗いカードの上にマウスを乗せて動かせます',
    defaultDuration: 0.45,
    durationRange: { min: 0.15, max: 1.5, step: 0.05 },
    secondarySlider: {
      label: '最大傾き角',
      unit: '度',
      min: 4,
      max: 18,
      step: 2,
      defaultValue: 10
    },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① カード中心を 0 としてカーソル位置を割合化',
        detail: '端から端を 0〜1 にし、中心との差（-0.5 〜 +0.5）を出すと上下左右の傾く向きが決まります。',
        codeHint: 'nx = (clientX - rect.left) / rect.width'
      },
      {
        title: '② rotateX と rotateY へ掛け算する（最大 8〜12度）',
        detail: '傾きすぎると文字が読みづらくなるため、10度前後までに抑えると上品な質感になります。',
        codeHint: 'transform: rotateX(...) rotateY(...)'
      },
      {
        title: '③ 半透明の丸い光（radial-gradient）を追従させる',
        detail: 'カーソル座標の % 位置へ白い薄光を置くと、本当に平面が光を反射しているような手触りになります。',
        codeHint: 'radial-gradient(circle at X% Y%, ...)'
      }
    ],
    keywords: ['3D', 'チルト', '傾く', '光沢', 'ツヤ', 'ホバー', 'カーソル', 'カード'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'カーソル連動 3D チルト＆ツヤ光沢カード',
        goal: 'カード上にカーソルを乗せると、ポインターの位置に応じて立体的に傾きつつ柔らかな光沢スポットが追従する表現にする。',
        mechanism: 'mousemove で算出したカード内相対位置（0〜100%）から rotateX/rotateY と radial-gradient 座標を同時更新し、mouseleave で水平に戻す。',
        secondaryLabel: '最大傾き角',
        secondaryUnit: '度',
        requirements: [
          '傾けすぎるとテキストが歪むため最大傾きは 10〜14度 以内に抑える',
          'ポインターがないタッチ端末や reduced-motion 時は過度な傾きを動かさない'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div class="tilt-wrap" id="tiltWrap">
  <div class="tilt-card" id="tiltCard">
    <div class="tilt-shine" id="tiltShine"></div>
    <h3>立体チルト＋光の反射</h3>
    <p>マウスに合わせて傾きと光沢が動きます。</p>
  </div>
</div>

<style>
.tilt-wrap { perspective: 800px; width: 280px; }
.tilt-card {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  padding: 24px;
  background: #18181b;
  color: #ffffff;
  transition: transform 0.2s ease-out;
}
.tilt-shine {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.22), transparent 62%);
}
</style>

<script>
(() => {
  const wrap = document.getElementById('tiltWrap');
  const card = document.getElementById('tiltCard');
  const shine = document.getElementById('tiltShine');
  if (!wrap || !card || !shine) return;
  const maxDeg = ${params.distance};

  wrap.addEventListener('mousemove', (e) => {
    const r = wrap.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    card.style.transform = \`rotateX(\${((0.5 - ny) * maxDeg * 2).toFixed(2)}deg) rotateY(\${((nx - 0.5) * maxDeg * 2).toFixed(2)}deg)\`;
    shine.style.background = \`radial-gradient(circle at \${(nx * 100).toFixed(0)}% \${(ny * 100).toFixed(0)}%, rgba(255,255,255,0.22), transparent 62%)\`;
  });
  wrap.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateX(0deg) rotateY(0deg)';
  });
})();
</script>`
  },
  {
    id: 'craft-number-counter',
    category: 'craft',
    title: '0から目標値へ減速着地する数字カウントアップ',
    subtitle: '実績数字やスコアが 0 から目標値へ向かって最初は速く・最後はゆっくり減速しながらピタッと着地する表現',
    mechanismTag: 'requestAnimationFrame 減速曲線 + 等幅数字 (tabular-nums)',
    xRayCaption: 'font-variant-numeric: tabular-nums を指定して、数字が増えるたびに横幅がガタガタ揺れるのを防いでいます',
    interactiveHint: '「再生」でカウントアップの加速・減速着地を確認できます',
    defaultDuration: 1.4,
    durationRange: { min: 0.4, max: 3.5, step: 0.1 },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① 必ず font-variant-numeric: tabular-nums を付ける',
        detail: 'プロポーショナルフォントは「1」と「8」で幅が違うため、等幅指定がないと数字が横揺れします。',
        codeHint: 'font-variant-numeric: tabular-nums'
      },
      {
        title: '② 経過時間 t（0→1）を 3乗カーブで減速させる',
        detail: '一定の速さだと最後が唐突に止まるため、終盤ほどゆっくり進む式に通して余韻を作ります。',
        codeHint: 'eased = 1 - Math.pow(1 - t, 3)'
      },
      {
        title: '③ 画面に入ったタイミングで 1 回だけ起動する',
        detail: 'IntersectionObserver を使って見えた瞬間から回すと、着地シーンを確実に見せられます。',
        codeHint: 'IntersectionObserver + requestAnimationFrame'
      }
    ],
    keywords: ['数字', 'カウントアップ', '実績', '統計', 'アニメーション', 'tabular-nums'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '0から減速着地する数字カウントアップ',
        goal: '実績数値や統計データを 0 から目標数値へ滑らかにカウントアップさせ、ゴール手前で減速して着地させる。',
        mechanism: 'requestAnimationFrame で進行度 t を 1 - Math.pow(1 - t, 3) でイージングし、CSS の tabular-nums で横揺れをゼロにする。',
        requirements: [
          '数字要素に必ず font-variant-numeric: tabular-nums を設定し、桁変化時のブレを完全に防ぐ',
          'カウント完了後は目標の厳密な数値文字列（小数点やカンマ含む）で確定させる'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div class="stat-card">
  <span class="stat-label">収録パターン</span>
  <strong class="stat-num" id="countTarget" data-target="42">0</strong>
</div>

<style>
.stat-num {
  font-size: 36px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
</style>

<script>
(() => {
  const el = document.getElementById('countTarget');
  if (!el) return;
  const target = Number(el.dataset.target || 0);
  const duration = ${Math.round(params.duration * 1000)};
  const start = performance.now();

  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
</script>`
  },
  {
    id: 'craft-scrollspy-toc',
    category: 'craft',
    title: '読んでいる章に目印が追従するライブ目次（Scrollspy）',
    subtitle: '長い解説記事を読み進めると、横の目次のハイライトと青い線が今見ている章へ自動で移動する親切ナビ',
    mechanismTag: 'Sticky 目次 + 現在章位置の自動判定 (Scrollspy)',
    xRayCaption: '画面の上端から一定の高さを通過した見出しを検出して、右側の目次ボタンへアクティブ印を移しています',
    interactiveHint: '「再生」・目次テキストのクリック・左本文のスクロールのどれでも連動します',
    defaultDuration: 2.6,
    durationRange: { min: 1.0, max: 5.0, step: 0.2 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 目次を画面横に sticky 固定して常に視界へ残す',
        detail: '長い記事の「いま全体の中でどの辺りか」を迷わせない道標になります。',
        codeHint: 'position: sticky; top: 24px'
      },
      {
        title: '② 見出し位置を通過するたびに現在番号を更新',
        detail: 'IntersectionObserver（または各見出しの offsetTop 比較）で今読んでいる章を 1 つだけ強調します。',
        codeHint: 'IntersectionObserver({ rootMargin: "-20% 0px -70% 0px" })'
      },
      {
        title: '③ 目次クリックで該当セクションへスムーズスクロール',
        detail: '見るだけでなくジャンプ導線としても働く双方向の読書ガイドに仕上げます。',
        codeHint: 'section.scrollIntoView({ behavior: "smooth" })'
      }
    ],
    keywords: ['目次', 'Scrollspy', 'スクロール連動', '記事', '長文', '現在位置', '追従'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '読んでいる章に目印が追従するライブ目次（Scrollspy）',
        goal: '本文を読み進めるにつれてサイドの目次ハイライトと左の青い縦ラインが現在の章へ追従し、クリックで該当箇所へ移動できるUIを作る。',
        mechanism: '2カラムで目次を position: sticky にし、IntersectionObserver で画面上部に差し掛かった見出し ID の目次項目をアクティブ化。',
        requirements: [
          '現在アクティブな目次項目には左線インジケーターと aria-current="location" を付与する',
          'クリックジャンプ先の見出しには scroll-margin-top を設定し固定ヘッダー被りを防ぐ'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div class="article-layout">
  <div class="article-body">
    <section id="sec1" class="doc-sec"><h2>01. 余白のリズム</h2><p>...</p></section>
    <section id="sec2" class="doc-sec"><h2>02. 初動の間白</h2><p>...</p></section>
    <section id="sec3" class="doc-sec"><h2>03. 情報の強弱</h2><p>...</p></section>
  </div>
  <aside class="toc-sticky">
    <a href="#sec1" class="toc-link is-active">01. 余白のリズム</a>
    <a href="#sec2" class="toc-link">02. 初動の間白</a>
    <a href="#sec3" class="toc-link">03. 情報の強弱</a>
  </aside>
</div>

<style>
.article-layout { display: grid; grid-template-columns: 1fr 220px; gap: 32px; }
.toc-sticky { position: sticky; top: 24px; align-self: start; display: grid; gap: 6px; border-left: 2px solid #e4e4e7; padding-left: 12px; }
.toc-link { color: #71717a; text-decoration: none; font-size: 13px; transition: color ${params.duration.toFixed(2)}s ease, transform ${params.duration.toFixed(2)}s ease; }
.toc-link.is-active { color: #2563eb; font-weight: 700; transform: translateX(3px); }
.doc-sec { scroll-margin-top: 24px; min-height: 280px; }
</style>

<script>
(() => {
  const sections = Array.from(document.querySelectorAll('.doc-sec'));
  const links = Array.from(document.querySelectorAll('.toc-link'));
  if (sections.length === 0 || links.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
      });
    }
  }, { rootMargin: '-20% 0px -70% 0px' });

  sections.forEach((sec) => observer.observe(sec));
})();
</script>`
  }
];
