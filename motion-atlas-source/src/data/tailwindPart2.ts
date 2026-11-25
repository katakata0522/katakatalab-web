import { TailwindBuilder, twTransition } from './tailwindHelpers';

export const TAILWIND_PART_2: Record<string, TailwindBuilder> = {
  // === 05. Microinteractions & Buttons (10) ===
  'micro-tactile-press': (p) => `<!-- Tailwind CSS: Tactile Press Button -->
<button type="button" class="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm ${twTransition(p, 'transition-transform')} hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.97]">
  クリックしてみる
</button>`,

  'micro-click-ripple': (p) => `<!-- Tailwind CSS + Safe JS: Click Coordinates Ripple -->
<button type="button" id="twRippleBtn" class="relative overflow-hidden rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-bold text-zinc-900 shadow-xs">
  タップで波紋が広がる
</button>
<script>
(() => {
  const btn = document.getElementById('twRippleBtn');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    const r = btn.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'pointer-events-none absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 animate-ping';
    s.style.left = (e.clientX - r.left) + 'px';
    s.style.top = (e.clientY - r.top) + 'px';
    btn.appendChild(s);
    setTimeout(() => s.remove(), ${Math.max(250, Math.round(p.duration * 1000))});
  });
})();
</script>`,

  'micro-underline-sweep': (p) => `<!-- Tailwind CSS: Origin-flip Hover Underline -->
<a href="#more" class="relative inline-block py-1 text-sm font-bold text-zinc-900 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-right after:scale-x-0 after:bg-blue-600 after:${twTransition(p, 'transition-transform')} hover:after:origin-left hover:after:scale-x-100">
  詳しく見てみる
</a>`,

  'micro-magnetic-button': (p) => `<!-- Tailwind CSS + Safe JS: Magnetic Pull Button -->
<button type="button" id="twMagBtn" class="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md ${twTransition(p, 'transition-transform')}">
  引き寄せボタン
</button>
<script>
(() => {
  const btn = document.getElementById('twMagBtn');
  if (!btn) return;
  btn.addEventListener('mousemove', (e) => {
    const r = btn.getBoundingClientRect();
    const dx = Math.max(-${p.distance}, Math.min(${p.distance}, (e.clientX - (r.left + r.width / 2)) * 0.35));
    const dy = Math.max(-${p.distance}, Math.min(${p.distance}, (e.clientY - (r.top + r.height / 2)) * 0.35));
    btn.style.transform = \`translate3d(\${dx}px, \${dy}px, 0)\`;
  });
  btn.addEventListener('mouseleave', () => { btn.style.transform = 'translate3d(0,0,0)'; });
})();
</script>`,

  'micro-button-3d': (p) => `<!-- Tailwind CSS: 3D Thick Push Button -->
<button type="button" class="rounded-xl border border-blue-700 bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_5px_0_#1d4ed8] ${twTransition(p, 'transition-all')} active:translate-y-1 active:shadow-[0_1px_0_#1d4ed8]">
  立体プッシュボタン
</button>`,

  'micro-button-shimmer': (p) => `<!-- Tailwind CSS: Group-hover Shimmer CTA -->
<button type="button" class="group relative overflow-hidden rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-bold text-white">
  <span class="relative z-10">今すぐ試してみる</span>
  <span aria-hidden="true" class="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent group-hover:left-[160%] ${twTransition(p, 'transition-all')}"></span>
</button>`,

  'micro-button-arrow': (p) => `<!-- Tailwind CSS: Arrow Slide on Hover -->
<a href="#detail" class="group inline-flex items-center gap-2 rounded-full border border-zinc-900 px-5 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-900 hover:text-white ${twTransition(p)}">
  詳細を見る <span aria-hidden="true" class="inline-block group-hover:translate-x-1.5 ${twTransition(p, 'transition-transform')}">→</span>
</a>`,

  'micro-button-copy': (p) => `<!-- Tailwind CSS + Safe JS: Self-resetting Copy Button -->
<button type="button" id="twCopyBtn" class="rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 ${twTransition(p)}">
  コードをコピー
</button>
<script>
(() => {
  const btn = document.getElementById('twCopyBtn');
  if (!btn) return;
  let timer = 0;
  btn.addEventListener('click', () => {
    clearTimeout(timer);
    btn.className = 'rounded-lg border border-emerald-600 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 ${twTransition(p)}';
    btn.textContent = '✓ コピー完了！';
    timer = setTimeout(() => {
      btn.className = 'rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 ${twTransition(p)}';
      btn.textContent = 'コードをコピー';
    }, 1600);
  });
})();
</script>`,

  'micro-button-hold': (p) => `<!-- Tailwind CSS + Safe JS: Long-press Confirm Button -->
<button type="button" id="twHoldBtn" class="relative select-none overflow-hidden rounded-xl border border-rose-300 bg-white px-5 py-2 text-xs font-bold text-rose-700">
  <span id="twHoldFill" class="absolute inset-y-0 left-0 w-0 bg-rose-100"></span>
  <span id="twHoldTxt" class="relative z-10">長押しで実行確定</span>
</button>
<script>
(() => {
  const b = document.getElementById('twHoldBtn');
  const f = document.getElementById('twHoldFill');
  const t = document.getElementById('twHoldTxt');
  if (!b || !f || !t) return;
  let raf = 0;
  const reset = () => { cancelAnimationFrame(raf); f.style.width = '0%'; };
  b.addEventListener('pointerdown', () => {
    const start = performance.now();
    const ms = ${Math.round(p.duration * 1000)};
    const step = (now) => {
      const pct = Math.min(100, ((now - start) / ms) * 100);
      f.style.width = pct + '%';
      if (pct < 100) raf = requestAnimationFrame(step);
      else t.textContent = '✓ 実行確定';
    };
    raf = requestAnimationFrame(step);
  });
  b.addEventListener('pointerup', reset);
  b.addEventListener('pointerleave', reset);
})();
</script>`,

  'micro-heart-pop': (p) => `<!-- Tailwind CSS + Safe JS: Heart Like Scale Bounce -->
<button id="twHeartBtn" type="button" aria-pressed="false" aria-label="お気に入り" class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-xl text-zinc-400 ${twTransition(p, 'transition-all')}">
  ♥
</button>
<script>
(() => {
  const btn = document.getElementById('twHeartBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const liked = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(liked));
    btn.classList.toggle('text-rose-500', liked);
    btn.classList.toggle('scale-125', liked);
  });
})();
</script>`,

  // === 06. Layout & Scroll (5) ===
  'layout-sticky-split': (p) => `<!-- Tailwind CSS: Sticky Sidebar 2-Column Split -->
<section class="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr] md:items-start">
  <aside class="rounded-xl border border-zinc-200 bg-white p-4 md:sticky md:top-6">
    <h2 class="text-sm font-bold text-zinc-900">左側固定説明</h2>
    <p class="mt-1 text-xs text-zinc-500">スクロール中も定位置に留まります。</p>
  </aside>
  <div class="space-y-3">
    <div class="h-32 rounded-xl border border-zinc-200 bg-white p-4 text-xs ${twTransition(p)} hover:-translate-y-0.5 hover:border-zinc-300">詳細ステップ 01</div>
    <div class="h-32 rounded-xl border border-zinc-200 bg-white p-4 text-xs ${twTransition(p)} hover:-translate-y-0.5 hover:border-zinc-300">詳細ステップ 02</div>
  </div>
</section>`,

  'layout-shrinking-header': (p) => `<!-- Tailwind CSS + Safe JS: Shrinking Header + Top Progress Line -->
<div id="twShrinkScroll" class="h-44 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50">
  <header id="twShrinkHdr" class="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur ${twTransition(p)}">
    <div id="twShrinkInner" class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 text-xs font-bold text-zinc-900 ${twTransition(p)}">
      <span>MotionLab</span><span>メニュー</span>
    </div>
    <div id="twShrinkBar" class="h-0.5 w-full origin-left scale-x-0 bg-blue-600 transition-transform duration-75"></div>
  </header>
  <div class="space-y-6 p-4 text-xs text-zinc-500">
    <p>下にスクロールするとヘッダーが縮みます。</p><p>読了ゲージが右へ伸びます。</p><p class="pb-20">記事末尾エリア。</p>
  </div>
</div>
<script>
(() => {
  const box = document.getElementById('twShrinkScroll');
  const inner = document.getElementById('twShrinkInner');
  const bar = document.getElementById('twShrinkBar');
  if (!box || !inner || !bar) return;
  box.addEventListener('scroll', () => {
    const y = box.scrollTop;
    const max = Math.max(1, box.scrollHeight - box.clientHeight);
    inner.classList.toggle('h-10', y > 24);
    inner.classList.toggle('h-14', y <= 24);
    bar.style.transform = \`scaleX(\${Math.min(1, y / max).toFixed(3)})\`;
  }, { passive: true });
})();
</script>`,

  'layout-bento-grid': (p) => `<!-- Tailwind CSS: Responsive Bento Box Grid -->
<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
  <div class="col-span-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs ${twTransition(p)} hover:-translate-y-0.5">主役カード（2列占有）</div>
  <div class="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs">数値指標</div>
  <div class="rounded-2xl border border-zinc-200 bg-blue-50/70 p-4 text-xs font-bold text-blue-800">注目機能</div>
</div>`,

  'layout-marquee-loop': (p) => `<!-- Tailwind CSS: Seamless Infinite Marquee -->
<div class="overflow-hidden border-y border-zinc-200 bg-zinc-50 py-2">
  <div class="flex w-max gap-6 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)] animate-[marquee_${Math.max(2, Math.round(p.duration * 6))}s_linear_infinite]">
    <span class="text-xs font-bold text-zinc-600">REACT</span><span class="text-xs font-bold text-zinc-600">TAILWIND</span><span class="text-xs font-bold text-zinc-600">MOTION</span>
    <span class="text-xs font-bold text-zinc-600">REACT</span><span class="text-xs font-bold text-zinc-600">TAILWIND</span><span class="text-xs font-bold text-zinc-600">MOTION</span>
  </div>
</div>`,

  'layout-skeleton-toast': (p) => `<!-- Tailwind CSS + Safe JS: Pulse Skeleton + Top Toast -->
<div class="space-y-3">
  <button id="twLoadBtn" type="button" class="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-bold">読み込みを実行</button>
  <div class="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
    <div class="h-9 w-9 animate-pulse rounded-lg bg-zinc-200"></div>
    <div class="flex-1 space-y-1.5">
      <div class="h-3 w-2/3 animate-pulse rounded bg-zinc-200"></div>
      <div class="h-2.5 w-1/2 animate-pulse rounded bg-zinc-100"></div>
    </div>
  </div>
  <div id="twToastMsg" role="status" class="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md opacity-0 translate-y-2 ${twTransition(p)}">✓ 読み込みが完了しました</div>
</div>
<script>
(() => {
  const btn = document.getElementById('twLoadBtn');
  const toast = document.getElementById('twToastMsg');
  if (!btn || !toast) return;
  let timer = 0;
  btn.addEventListener('click', () => {
    clearTimeout(timer);
    toast.classList.remove('opacity-0', 'translate-y-2');
    timer = setTimeout(() => toast.classList.add('opacity-0', 'translate-y-2'), 1800);
  });
})();
</script>`,

  // === 07. Carousel & Sliders (5) ===
  'carousel-scroll-snap': (p) => `<!-- Tailwind CSS + Safe JS: CSS Scroll Snap Horizontal Strip -->
<div class="flex items-center gap-2">
  <button id="twSnapPrev" type="button" aria-label="前へ" class="h-8 w-8 shrink-0 rounded-full border border-zinc-200 bg-white text-sm font-bold">‹</button>
  <div id="twSnapTrack" class="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none]">
    <div class="w-52 shrink-0 snap-start rounded-xl border border-zinc-200 bg-white p-4 text-xs font-bold ${twTransition(p)} hover:-translate-y-0.5">スライド 01</div>
    <div class="w-52 shrink-0 snap-start rounded-xl border border-zinc-200 bg-white p-4 text-xs font-bold ${twTransition(p)} hover:-translate-y-0.5">スライド 02</div>
    <div class="w-52 shrink-0 snap-start rounded-xl border border-zinc-200 bg-white p-4 text-xs font-bold ${twTransition(p)} hover:-translate-y-0.5">スライド 03</div>
  </div>
  <button id="twSnapNext" type="button" aria-label="次へ" class="h-8 w-8 shrink-0 rounded-full border border-zinc-200 bg-white text-sm font-bold">›</button>
</div>
<script>
(() => {
  const tr = document.getElementById('twSnapTrack');
  const prev = document.getElementById('twSnapPrev');
  const next = document.getElementById('twSnapNext');
  if (!tr || !prev || !next) return;
  prev.addEventListener('click', () => tr.scrollBy({ left: -220, behavior: 'smooth' }));
  next.addEventListener('click', () => tr.scrollBy({ left: 220, behavior: 'smooth' }));
})();
</script>`,

  'carousel-peek-slider': (p) => `<!-- Tailwind CSS + Safe JS: Next-card Peek Slider -->
<div class="space-y-2 overflow-hidden">
  <div id="twPeekTrack" class="flex gap-3 ${twTransition(p, 'transition-transform')}">
    <article class="w-[72%] shrink-0 rounded-xl border border-zinc-200 bg-white p-5 text-xs font-bold">01. 主役スライド</article>
    <article class="w-[72%] shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-xs font-bold text-zinc-600">02. 次カードチラ見え</article>
    <article class="w-[72%] shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-xs font-bold text-zinc-600">03. 末尾カード</article>
  </div>
  <button id="twPeekNext" type="button" class="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-bold text-zinc-700">次へ進む ›</button>
</div>
<script>
(() => {
  const tr = document.getElementById('twPeekTrack');
  const btn = document.getElementById('twPeekNext');
  if (!tr || !btn) return;
  let idx = 0;
  btn.addEventListener('click', () => {
    idx = (idx + 1) % tr.children.length;
    tr.style.transform = \`translateX(-\${idx * 74}%)\`;
  });
})();
</script>`,

  'carousel-thumb-sync': (p) => `<!-- Tailwind CSS + Safe JS: Thumbnail Sync Gallery -->
<div class="max-w-sm space-y-2">
  <div id="twMainView" class="flex h-32 items-center justify-center rounded-xl border border-zinc-200 bg-blue-50 text-sm font-bold text-blue-900 ${twTransition(p)}">シーン 01</div>
  <div id="twThumbGrid" class="grid grid-cols-3 gap-2">
    <button type="button" data-title="シーン 01" aria-pressed="true" class="rounded-lg border border-blue-500 bg-white py-2 text-[11px] font-bold text-blue-700 scale-[1.03] ${twTransition(p)}">01</button>
    <button type="button" data-title="シーン 02" aria-pressed="false" class="rounded-lg border border-zinc-200 bg-white py-2 text-[11px] text-zinc-600 ${twTransition(p)}">02</button>
    <button type="button" data-title="シーン 03" aria-pressed="false" class="rounded-lg border border-zinc-200 bg-white py-2 text-[11px] text-zinc-600 ${twTransition(p)}">03</button>
  </div>
</div>
<script>
(() => {
  const view = document.getElementById('twMainView');
  const grid = document.getElementById('twThumbGrid');
  if (!view || !grid) return;
  const btns = grid.querySelectorAll('button');
  btns.forEach((b) => b.addEventListener('click', () => {
    view.textContent = b.dataset.title || '';
    btns.forEach((x) => {
      const on = x === b;
      x.setAttribute('aria-pressed', String(on));
      x.className = on
        ? 'rounded-lg border border-blue-500 bg-white py-2 text-[11px] font-bold text-blue-700 scale-[1.03] ${twTransition(p)}'
        : 'rounded-lg border border-zinc-200 bg-white py-2 text-[11px] text-zinc-600 ${twTransition(p)}';
    });
  }));
})();
</script>`,

  'carousel-lightbox': (p) => `<!-- Tailwind CSS + Safe JS: Native Dialog Lightbox -->
<button id="twLbOpen" type="button" class="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs font-bold hover:border-blue-400">画像を拡大表示</button>
<dialog id="twLb" class="m-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl backdrop:bg-zinc-950/60 ${twTransition(p)}">
  <div class="flex h-40 items-center justify-center rounded-xl bg-zinc-100 text-sm font-bold">拡大ビュー</div>
  <button id="twLbClose" type="button" class="mt-3 w-full rounded-lg bg-zinc-900 py-2 text-xs font-bold text-white">閉じる</button>
</dialog>
<script>
(() => {
  const dlg = document.getElementById('twLb');
  const open = document.getElementById('twLbOpen');
  const close = document.getElementById('twLbClose');
  if (!dlg || !open || !close) return;
  open.addEventListener('click', () => dlg.showModal());
  close.addEventListener('click', () => dlg.close());
})();
</script>`,

  'carousel-stack-deck': (p) => `<!-- Tailwind CSS + Safe JS: Layered Stacked Card Deck -->
<div class="space-y-3 text-center">
  <div id="twDeck" class="relative mx-auto h-36 w-64">
    <div data-pos="1" class="absolute inset-0 translate-y-3 scale-95 rounded-2xl border border-zinc-200 bg-zinc-100 ${twTransition(p)}"></div>
    <div data-pos="0" class="relative flex h-full items-center justify-center rounded-2xl border border-zinc-200 bg-white font-bold text-zinc-900 shadow-md ${twTransition(p)}">前面カード 01</div>
  </div>
  <button id="twDeckNext" type="button" class="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-bold">次をめくる ›</button>
</div>
<script>
(() => {
  const deck = document.getElementById('twDeck');
  const btn = document.getElementById('twDeckNext');
  if (!deck || !btn) return;
  let step = 0;
  const titles = ['前面カード 01', '前面カード 02', '前面カード 03'];
  btn.addEventListener('click', () => {
    step = (step + 1) % titles.length;
    const front = deck.querySelector('[data-pos="0"]');
    if (front) front.textContent = titles[step];
  });
})();
</script>`,

  // === 08. Creative Craft (5) ===
  'craft-flip-card': (p) => `<!-- Tailwind CSS + Safe JS: 3D Backface-hidden Flip Card -->
<button id="twFlipBtn" type="button" data-flipped="false" aria-pressed="false" class="group block h-36 w-60 text-left [perspective:900px]">
  <div class="relative h-full w-full [transform-style:preserve-3d] ${twTransition(p, 'transition-transform')} group-hover:[transform:rotateY(180deg)] group-data-[flipped=true]:[transform:rotateY(180deg)]">
    <div class="absolute inset-0 flex items-center justify-center rounded-xl border border-zinc-200 bg-white font-bold [backface-visibility:hidden]">表面（ホバー／クリックで回転）</div>
    <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-zinc-900 font-bold text-white [backface-visibility:hidden] [transform:rotateY(180deg)]">裏面メッセージ</div>
  </div>
</button>
<script>
(() => {
  const btn = document.getElementById('twFlipBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const flipped = btn.dataset.flipped !== 'true';
    btn.dataset.flipped = String(flipped);
    btn.setAttribute('aria-pressed', String(flipped));
  });
})();
</script>`,

  'craft-before-after': (p) => `<!-- Tailwind CSS + Safe JS: Before / After Clip Slider -->
<div class="relative h-32 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900 text-white">
  <div class="flex h-full items-center justify-center text-xs font-bold">AFTER（完成後）</div>
  <div id="twBaLayer" class="absolute inset-0 flex items-center justify-center bg-zinc-100 text-xs font-bold text-zinc-700 [clip-path:inset(0_${100 - Math.min(100, Math.max(0, p.distance))}%_0_0)]">BEFORE</div>
  <input id="twBaRange" type="range" min="0" max="100" value="${Math.min(100, Math.max(0, p.distance))}" class="absolute inset-x-2 bottom-2 z-20 accent-blue-600" aria-label="比較スライダー" />
</div>
<script>
(() => {
  const layer = document.getElementById('twBaLayer');
  const range = document.getElementById('twBaRange');
  if (!layer || !range) return;
  range.addEventListener('input', () => {
    const v = Math.min(100, Math.max(0, Number(range.value) || 0));
    layer.style.clipPath = \`inset(0 \${100 - v}% 0 0)\`;
  });
})();
</script>`,

  'craft-tilt-shine': (p) => `<!-- Tailwind CSS + Safe JS: 3D Tilt & Shine -->
<div id="twTilt" class="relative w-64 overflow-hidden rounded-2xl bg-zinc-900 p-5 text-white shadow-lg ${twTransition(p, 'transition-transform')}">
  <div class="text-xs font-mono text-zinc-400">3D TILT CARD</div>
  <div class="mt-2 text-sm font-bold">カーソル方向へ立体傾き</div>
</div>
<script>
(() => {
  const card = document.getElementById('twTilt');
  if (!card) return;
  const maxTilt = ${Math.min(20, Math.max(4, p.distance))};
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    const rx = (((r.top + r.height / 2) - e.clientY) / (r.height / 2)) * maxTilt;
    const ry = ((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * maxTilt;
    card.style.transform = \`perspective(800px) rotateX(\${rx.toFixed(1)}deg) rotateY(\${ry.toFixed(1)}deg)\`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)'; });
})();
</script>`,

  'craft-number-counter': (p) => `<!-- Tailwind CSS + Safe JS: Decelerating Number Counter -->
<div class="rounded-xl border border-zinc-200 bg-white p-4 text-center">
  <div class="text-[11px] font-medium text-zinc-500">収録パターン</div>
  <div id="twCounter" class="mt-1 font-extrabold text-4xl tracking-tight text-zinc-900 tabular-nums">0</div>
</div>
<script>
(() => {
  const el = document.getElementById('twCounter');
  if (!el) return;
  const target = 100;
  const ms = ${Math.max(200, Math.round(p.duration * 1000))};
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
</script>`,

  'craft-scrollspy-toc': (p) => `<!-- Tailwind CSS + Safe JS: Live Scrollspy Two-Column TOC -->
<div class="grid max-w-md grid-cols-[1.4fr_1fr] overflow-hidden rounded-xl border border-zinc-200 bg-white">
  <div id="twSpyBody" class="h-36 space-y-6 overflow-y-auto p-3 text-xs text-zinc-600">
    <section id="twS1" data-spy="0" class="min-h-24"><strong class="text-zinc-900">1. 導入</strong><p>概要の説明文...</p></section>
    <section id="twS2" data-spy="1" class="min-h-24"><strong class="text-zinc-900">2. 仕組み</strong><p>連動ロジック解説...</p></section>
  </div>
  <nav id="twSpyToc" class="border-l border-zinc-100 bg-zinc-50/70 p-2.5 text-[11px]" aria-label="目次">
    <a href="#twS1" class="block border-l-2 border-blue-600 pl-2 font-bold text-blue-700 ${twTransition(p)}">1. 導入</a>
    <a href="#twS2" class="mt-1 block border-l-2 border-transparent pl-2 text-zinc-500 ${twTransition(p)}">2. 仕組み</a>
  </nav>
</div>
<script>
(() => {
  const root = document.getElementById('twSpyBody');
  const toc = document.getElementById('twSpyToc');
  if (!root || !toc) return;
  const links = toc.querySelectorAll('a');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const idx = Number(e.target.getAttribute('data-spy'));
      links.forEach((a, i) => {
        const active = i === idx;
        a.className = active
          ? 'block border-l-2 border-blue-600 pl-2 font-bold text-blue-700 ${twTransition(p)}'
          : 'mt-1 block border-l-2 border-transparent pl-2 text-zinc-500 ${twTransition(p)}';
      });
    }
  }, { root, threshold: 0.5 });
  root.querySelectorAll('section').forEach((s) => io.observe(s));
})();
</script>`
};
