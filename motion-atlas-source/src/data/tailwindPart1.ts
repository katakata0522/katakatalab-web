import { TailwindBuilder, twTransition } from './tailwindHelpers';
import { EASING_OPTIONS } from '../utils/motionHelpers';

export const TAILWIND_PART_1: Record<string, TailwindBuilder> = {
  // === 01. Text & Reveal (17) ===
  'text-mask-slide-up': (p) => `<!-- Tailwind CSS + Safe JS: Mask Slide Up -->
<div class="overflow-hidden">
  <h2 id="twMaskTitle" data-open="false" class="${twTransition(p, 'transition-transform')} translate-y-[${p.distance}px] data-[open=true]:translate-y-0 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
    伝わるデザインは、動きから。
  </h2>
</div>
<script>
(() => {
  const el = document.getElementById('twMaskTitle');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
</script>`,

  'text-sweep-left-to-right': (p) => `<!-- Tailwind CSS + Safe JS: Left-to-Right Clip Reveal -->
<div class="relative inline-block overflow-hidden">
  <span id="twSweepText" data-open="false" class="block text-2xl sm:text-3xl font-bold text-zinc-900 ${twTransition(p)} [clip-path:inset(0_100%_0_0)] data-[open=true]:[clip-path:inset(0_0%_0_0)]">
    視線を左から右へ運ぶ
  </span>
</div>
<script>
(() => {
  const el = document.getElementById('twSweepText');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
</script>`,

  'text-stagger-chars': (p) => `<!-- Tailwind CSS + Safe JS: Staggered Characters -->
<p id="twStaggerChars" data-open="false" class="group flex flex-wrap text-2xl font-extrabold text-zinc-900" aria-label="MOTION">
  <span class="inline-block ${twTransition(p)} delay-[0ms] translate-y-[${p.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">M</span>
  <span class="inline-block ${twTransition(p)} delay-[45ms] translate-y-[${p.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">O</span>
  <span class="inline-block ${twTransition(p)} delay-[90ms] translate-y-[${p.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">T</span>
  <span class="inline-block ${twTransition(p)} delay-[135ms] translate-y-[${p.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">I</span>
  <span class="inline-block ${twTransition(p)} delay-[180ms] translate-y-[${p.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">O</span>
  <span class="inline-block ${twTransition(p)} delay-[225ms] translate-y-[${p.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">N</span>
</p>
<script>
(() => {
  const el = document.getElementById('twStaggerChars');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
</script>`,

  'text-typewriter': (p) => `<!-- Tailwind CSS + Safe JS: Typewriter -->
<p class="font-mono text-xl sm:text-2xl font-bold text-zinc-900">
  <span id="twTypeOut"></span><span class="ml-0.5 inline-block h-6 w-0.5 animate-pulse bg-blue-600 align-middle" aria-hidden="true"></span>
</p>
<script>
(() => {
  const el = document.getElementById('twTypeOut');
  const text = '伝わるデザインは、動きから。';
  if (!el) return;
  let i = 0;
  const step = Math.max(25, Math.round(${p.duration * 1000} / text.length));
  const timer = setInterval(() => {
    i += 1;
    el.textContent = text.slice(0, i);
    if (i >= text.length) clearInterval(timer);
  }, step);
})();
</script>`,

  'text-marker-highlight': (p) => `<!-- Tailwind CSS + Safe JS: Marker Highlight Underline -->
<p class="text-xl sm:text-2xl font-bold text-zinc-900">
  要点だけを
  <span class="relative inline-block px-1">
    <span id="twMarkerLine" data-open="false" aria-hidden="true" class="absolute inset-x-0 bottom-0.5 h-3 origin-left rounded bg-amber-300/80 ${twTransition(p, 'transition-transform')} scale-x-0 data-[open=true]:scale-x-100"></span>
    <span class="relative z-10">ひと目で伝える</span>
  </span>
</p>
<script>
(() => {
  const el = document.getElementById('twMarkerLine');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
</script>`,

  'text-tracking-compress': (p) => `<!-- Tailwind CSS + Safe JS: Tracking Compress -->
<p id="twTrackText" data-open="false" class="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-[${(Math.max(4, p.distance) * 0.025).toFixed(3)}em] opacity-30 ${twTransition(p)} data-[open=true]:tracking-[0.02em] data-[open=true]:opacity-100">
  MOTION ATLAS
</p>
<script>
(() => {
  const el = document.getElementById('twTrackText');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
</script>`,

  'text-scroll-fill': (p) => `<!-- Tailwind CSS + Safe JS: Scroll Ink Fill Text -->
<div class="max-w-md space-y-3">
  <p id="twScrollFill" class="bg-clip-text text-xl sm:text-2xl font-extrabold text-transparent [background-size:200%_100%] ${twTransition(p, 'transition-[background-position]')}" style="background-image: linear-gradient(90deg, #18181b 50%, #d4d4d8 50%); background-position: 45% 0;">
    スクロールに合わせて文字に色が染み渡ります。
  </p>
  <input id="twFillRange" type="range" min="0" max="100" value="55" class="w-full accent-blue-600" aria-label="塗り進捗" />
</div>
<script>
(() => {
  const p = document.getElementById('twScrollFill');
  const r = document.getElementById('twFillRange');
  if (!p || !r) return;
  r.addEventListener('input', () => {
    const v = Math.min(100, Math.max(0, Number(r.value) || 0));
    p.style.backgroundPosition = (100 - v) + '% 0';
  });
})();
</script>`,

  'text-word-slot': (p) => `<!-- Tailwind CSS + Safe JS: Vertical Word Slot -->
<div class="inline-flex items-center gap-2 text-xl sm:text-2xl font-bold text-zinc-900">
  <span>動きがあれば、UIは</span>
  <div class="h-9 w-28 overflow-hidden rounded-lg border border-blue-200 bg-blue-50/70">
    <div id="twSlotTrack" class="${twTransition(p, 'transition-transform')} text-center text-blue-700 font-extrabold leading-9">
      <div>伝わる</div><div>迷わない</div><div>記憶に残る</div>
    </div>
  </div>
</div>
<script>
(() => {
  const track = document.getElementById('twSlotTrack');
  if (!track || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let i = 0;
  setInterval(() => {
    i = (i + 1) % 3;
    track.style.transform = \`translateY(\${-i * 36}px)\`;
  }, 1800);
})();
</script>`,

  'text-outline-fill': (p) => `<!-- Tailwind CSS: Outline to Solid Fill -->
<div class="group relative inline-block cursor-pointer select-none">
  <span class="block text-3xl sm:text-5xl font-black tracking-tight text-transparent [-webkit-text-stroke:1.5px_#18181b]">CREATIVE UI</span>
  <span aria-hidden="true" class="absolute inset-0 block text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 ${twTransition(p)} [clip-path:inset(0_100%_0_0)] group-hover:[clip-path:inset(0_0%_0_0)]">CREATIVE UI</span>
</div>`,

  'reveal-fade-lift': (p) => `<!-- Tailwind CSS + Safe JS: Fade + Lift -->
<article id="twFadeCard" data-open="false" class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs ${twTransition(p)} translate-y-[${p.distance}px] opacity-0 data-[open=true]:translate-y-0 data-[open=true]:opacity-100">
  <h3 class="text-base font-bold text-zinc-900">ふわっと浮き上がるカード</h3>
  <p class="mt-1 text-xs text-zinc-500">透明度と Y 軸を同時に遷移させます。</p>
</article>
<script>
(() => {
  const el = document.getElementById('twFadeCard');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
</script>`,

  'reveal-curtain-block': (p) => `<!-- Tailwind CSS: Curtain Reveal -->
<div class="relative inline-block overflow-hidden rounded-xl bg-white px-5 py-3 shadow-xs">
  <span class="relative z-10 text-xl font-extrabold text-zinc-900">幕が上がって文字が現れる</span>
  <span aria-hidden="true" class="absolute inset-0 z-20 origin-right bg-zinc-900 ${twTransition(p, 'transition-transform')} scale-x-0"></span>
</div>`,

  'reveal-stagger-grid': (p) => `<!-- Tailwind CSS + Safe JS: Stagger Grid -->
<div id="twStaggerGrid" data-open="false" class="group grid grid-cols-3 gap-3">
  <div class="rounded-xl border border-zinc-200 bg-white p-4 ${twTransition(p)} delay-[0ms] translate-y-[${p.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">01</div>
  <div class="rounded-xl border border-zinc-200 bg-white p-4 ${twTransition(p)} delay-[80ms] translate-y-[${p.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">02</div>
  <div class="rounded-xl border border-zinc-200 bg-white p-4 ${twTransition(p)} delay-[160ms] translate-y-[${p.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">03</div>
</div>
<script>
(() => {
  const el = document.getElementById('twStaggerGrid');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
</script>`,

  'reveal-3d-flip': (p) => `<!-- Tailwind CSS + Safe JS: 3D Perspective Rise -->
<div class="[perspective:900px]">
  <div id="twFlipRise" data-open="false" class="origin-top rounded-2xl border border-zinc-200 bg-white p-5 shadow-md ${twTransition(p)} [transform:rotateX(-28deg)] opacity-0 data-[open=true]:[transform:rotateX(0deg)] data-[open=true]:opacity-100">
    <h3 class="text-base font-bold text-zinc-900">奥行きのある立体登場</h3>
  </div>
</div>
<script>
(() => {
  const el = document.getElementById('twFlipRise');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
</script>`,

  'reveal-frame-zoom': (p) => `<!-- Tailwind CSS: Image Inside Fixed Frame Zoom -->
<article class="group h-40 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
  <div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-zinc-100 text-sm font-bold text-zinc-700 ${twTransition(p, 'transition-transform')} group-hover:scale-[${(1 + p.distance / 100).toFixed(2)}]">
    カードビジュアル
  </div>
</article>`,

  'reveal-caption-overlay': (p) => `<!-- Tailwind CSS: Slide-up Caption Overlay -->
<article class="group relative h-40 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
  <div class="p-4 text-xs font-semibold text-zinc-600">作品ビジュアル</div>
  <div class="absolute inset-x-0 bottom-0 bg-zinc-950/85 p-3 text-xs font-semibold text-white translate-y-full group-hover:translate-y-0 ${twTransition(p, 'transition-transform')}">
    事例タイトル・解説テキスト
  </div>
</article>`,

  'reveal-blur-focus': (p) => `<!-- Tailwind CSS + Safe JS: Blur to Sharp Focus -->
<div id="twBlurCard" data-open="false" class="rounded-xl border border-zinc-200 bg-white p-5 ${twTransition(p)} blur-[${Math.min(16, Math.max(4, p.distance))}px] opacity-30 scale-[1.03] data-[open=true]:blur-none data-[open=true]:opacity-100 data-[open=true]:scale-100">
  ピントが合うコンテンツ
</div>
<script>
(() => {
  const el = document.getElementById('twBlurCard');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
</script>`,

  'reveal-staggered-offset': () => `<!-- Tailwind CSS: Static Staggered 2-Col Offset -->
<div class="grid grid-cols-1 gap-4 pb-6 md:grid-cols-2">
  <div class="rounded-xl border border-zinc-200 bg-white p-4">01 左列カード</div>
  <div class="rounded-xl border border-zinc-200 bg-white p-4 md:translate-y-4">02 右列（段差あり）</div>
</div>`,

  // === 02. Navigation (7) ===
  'nav-slide-drawer': (p) => `<!-- Tailwind CSS + Safe JS: Slide Drawer -->
<button id="twDrawerOpen" type="button" aria-expanded="false" class="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold">メニュー</button>
<aside id="twDrawerPanel" class="fixed inset-y-0 left-0 z-50 w-64 -translate-x-full bg-white p-5 shadow-xl ${twTransition(p, 'transition-transform')} data-[open=true]:translate-x-0" data-open="false" aria-hidden="true">
  <button id="twDrawerClose" type="button" class="text-xs font-bold text-zinc-500">✕ 閉じる</button>
  <nav class="mt-4 flex flex-col gap-2 text-sm font-medium text-zinc-800">
    <a href="#top" class="rounded-lg px-2 py-1.5 hover:bg-zinc-100">ホーム</a>
    <a href="#work" class="rounded-lg px-2 py-1.5 hover:bg-zinc-100">事例一覧</a>
  </nav>
</aside>
<script>
(() => {
  const openBtn = document.getElementById('twDrawerOpen');
  const closeBtn = document.getElementById('twDrawerClose');
  const panel = document.getElementById('twDrawerPanel');
  if (!openBtn || !closeBtn || !panel) return;
  const setOpen = (on) => {
    panel.dataset.open = String(on);
    panel.setAttribute('aria-hidden', String(!on));
    openBtn.setAttribute('aria-expanded', String(on));
  };
  openBtn.addEventListener('click', () => setOpen(true));
  closeBtn.addEventListener('click', () => setOpen(false));
})();
</script>`,

  'nav-fullscreen-curtain': (p) => `<!-- Tailwind CSS + Safe JS: Radial Fullscreen Clip Menu -->
<button id="twCurtainBtn" type="button" aria-expanded="false" class="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white">メニュー展開</button>
<nav id="twCurtain" data-open="false" class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-zinc-950 text-2xl font-bold text-white ${twTransition(p)} [clip-path:circle(0%_at_92%_8%)] data-[open=true]:[clip-path:circle(150%_at_92%_8%)]">
  <button id="twCurtainClose" type="button" class="text-sm font-normal text-zinc-400 hover:text-white">✕ 閉じる</button>
  <a href="#about" class="hover:text-blue-400">私たちについて</a>
  <a href="#services" class="hover:text-blue-400">サービス</a>
  <a href="#contact" class="hover:text-blue-400">お問い合わせ</a>
</nav>
<script>
(() => {
  const btn = document.getElementById('twCurtainBtn');
  const closeBtn = document.getElementById('twCurtainClose');
  const nav = document.getElementById('twCurtain');
  if (!btn || !closeBtn || !nav) return;
  const setOpen = (on) => { nav.dataset.open = String(on); btn.setAttribute('aria-expanded', String(on)); };
  btn.addEventListener('click', () => setOpen(true));
  closeBtn.addEventListener('click', () => setOpen(false));
})();
</script>`,

  'nav-top-accordion': (p) => `<!-- Tailwind CSS + Safe JS: CSS Grid Row Top Accordion -->
<button id="twTopAccBtn" type="button" aria-expanded="false" class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-800">メニュー ▾</button>
<div id="twTopAccWrap" class="grid grid-rows-[0fr] ${twTransition(p)} data-[open=true]:grid-rows-[1fr]" data-open="false">
  <nav class="min-h-0 overflow-hidden border-b border-zinc-200 bg-white px-4">
    <div class="flex flex-col gap-2 py-3 text-sm font-medium text-zinc-700">
      <a href="#f">機能一覧</a>
      <a href="#p">料金プラン</a>
    </div>
  </nav>
</div>
<script>
(() => {
  const btn = document.getElementById('twTopAccBtn');
  const wrap = document.getElementById('twTopAccWrap');
  if (!btn || !wrap) return;
  btn.addEventListener('click', () => {
    const next = wrap.dataset.open !== 'true';
    wrap.dataset.open = String(next);
    btn.setAttribute('aria-expanded', String(next));
  });
})();
</script>`,

  'nav-bottom-sheet': (p) => `<!-- Tailwind CSS + Safe JS: Thumb Bottom Sheet -->
<button id="twSheetOpen" type="button" class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold">アクションを開く</button>
<div id="twSheet" data-open="false" class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-zinc-200 bg-white p-4 shadow-2xl ${twTransition(p, 'transition-transform')} translate-y-full data-[open=true]:translate-y-0">
  <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300"></div>
  <div class="space-y-2 text-sm font-semibold text-zinc-800">
    <button type="button" class="w-full rounded-xl bg-zinc-100 py-2.5">リンクをコピー</button>
    <button id="twSheetClose" type="button" class="w-full rounded-xl bg-blue-600 py-2.5 text-white">閉じる</button>
  </div>
</div>
<script>
(() => {
  const open = document.getElementById('twSheetOpen');
  const close = document.getElementById('twSheetClose');
  const sheet = document.getElementById('twSheet');
  if (!open || !close || !sheet) return;
  open.addEventListener('click', () => { sheet.dataset.open = 'true'; });
  close.addEventListener('click', () => { sheet.dataset.open = 'false'; });
})();
</script>`,

  'nav-icon-morph-variants': (p) => `<!-- Tailwind CSS + Safe JS: + to × Icon Morph -->
<button id="twMorphBtn" type="button" aria-expanded="false" aria-label="メニューを開く" class="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white ${twTransition(p, 'transition-transform')}">
  <span class="h-0.5 w-4 rounded-full bg-zinc-900"></span>
  <span class="absolute h-4 w-0.5 rounded-full bg-zinc-900"></span>
</button>
<script>
(() => {
  const btn = document.getElementById('twMorphBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const open = btn.classList.toggle('rotate-45');
    btn.setAttribute('aria-expanded', String(open));
  });
})();
</script>`,

  'nav-stagger-drawer': (p) => `<!-- Tailwind CSS: Staggered Links Inside Drawer -->
<nav class="group flex w-60 flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-3" data-open="true">
  <a href="#a" class="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-800 ${twTransition(p)} delay-[80ms] group-data-[open=true]:translate-x-0 group-data-[open=true]:opacity-100 -translate-x-3 opacity-0">ホーム</a>
  <a href="#b" class="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-800 ${twTransition(p)} delay-[140ms] group-data-[open=true]:translate-x-0 group-data-[open=true]:opacity-100 -translate-x-3 opacity-0">機能</a>
  <a href="#c" class="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-800 ${twTransition(p)} delay-[200ms] group-data-[open=true]:translate-x-0 group-data-[open=true]:opacity-100 -translate-x-3 opacity-0">料金</a>
</nav>`,

  'nav-app-tab-bar': (p) => `<!-- Tailwind CSS + Safe JS: App Bottom Tab Bar -->
<nav id="twAppTabBar" class="grid grid-cols-4 border-t border-zinc-200 bg-white/95 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))]" aria-label="主要タブ">
  <button type="button" data-active="true" class="group flex flex-col items-center py-1 text-[11px] font-semibold text-zinc-500 data-[active=true]:font-bold data-[active=true]:text-blue-700" aria-current="page">
    <span class="rounded-full px-3 py-1 ${twTransition(p)} group-data-[active=true]:bg-blue-50">ホーム</span>
  </button>
  <button type="button" class="group flex flex-col items-center py-1 text-[11px] font-semibold text-zinc-500 data-[active=true]:font-bold data-[active=true]:text-blue-700">
    <span class="rounded-full px-3 py-1 ${twTransition(p)} group-data-[active=true]:bg-blue-50">さがす</span>
  </button>
  <button type="button" class="group flex flex-col items-center py-1 text-[11px] font-semibold text-zinc-500 data-[active=true]:font-bold data-[active=true]:text-blue-700">
    <span class="rounded-full px-3 py-1 ${twTransition(p)} group-data-[active=true]:bg-blue-50">保存</span>
  </button>
  <button type="button" class="group flex flex-col items-center py-1 text-[11px] font-semibold text-zinc-500 data-[active=true]:font-bold data-[active=true]:text-blue-700">
    <span class="rounded-full px-3 py-1 ${twTransition(p)} group-data-[active=true]:bg-blue-50">設定</span>
  </button>
</nav>
<script>
(() => {
  const bar = document.getElementById('twAppTabBar');
  if (!bar) return;
  const items = bar.querySelectorAll('button');
  items.forEach((btn) => btn.addEventListener('click', () => {
    items.forEach((b) => { b.dataset.active = String(b === btn); b === btn ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'); });
  }));
})();
</script>`,

  // === 03. Tabs & Accordions (6) ===
  'tabs-sliding-underline': (p) => `<!-- Tailwind CSS + Safe JS: Sliding Underline Tabs -->
<div id="twUnderTabs" class="relative inline-flex border-b border-zinc-200" role="tablist">
  <button type="button" data-i="0" class="w-16 py-2 text-xs font-bold text-blue-600" role="tab" aria-selected="true">概要</button>
  <button type="button" data-i="1" class="w-16 py-2 text-xs font-semibold text-zinc-500" role="tab" aria-selected="false">仕様</button>
  <span id="twUnderBar" aria-hidden="true" class="absolute bottom-0 left-0 h-0.5 w-16 bg-blue-600 ${twTransition(p, 'transition-transform')}"></span>
</div>
<script>
(() => {
  const wrap = document.getElementById('twUnderTabs');
  const bar = document.getElementById('twUnderBar');
  if (!wrap || !bar) return;
  const tabs = wrap.querySelectorAll('[role="tab"]');
  tabs.forEach((btn, idx) => btn.addEventListener('click', () => {
    bar.style.transform = \`translateX(\${idx * 100}%)\`;
    tabs.forEach((t) => {
      const on = t === btn;
      t.setAttribute('aria-selected', String(on));
      t.className = on ? 'w-16 py-2 text-xs font-bold text-blue-600' : 'w-16 py-2 text-xs font-semibold text-zinc-500';
    });
  }));
})();
</script>`,

  'tabs-floating-pill': (p) => `<!-- Tailwind CSS + Safe JS: Floating Segment Pill -->
<div id="twSegTabs" class="relative grid w-64 grid-cols-2 rounded-full bg-zinc-100 p-1 text-xs font-semibold">
  <span id="twSegPill" aria-hidden="true" class="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-xs ${twTransition(p, 'transition-transform')}"></span>
  <button type="button" data-i="0" class="relative z-10 py-1.5 text-zinc-900">月額</button>
  <button type="button" data-i="1" class="relative z-10 py-1.5 text-zinc-500">年額</button>
</div>
<script>
(() => {
  const wrap = document.getElementById('twSegTabs');
  const pill = document.getElementById('twSegPill');
  if (!wrap || !pill) return;
  const btns = wrap.querySelectorAll('button');
  btns.forEach((b, idx) => b.addEventListener('click', () => {
    pill.style.transform = \`translateX(\${idx * 100}%)\`;
    btns.forEach((x) => { x.className = x === b ? 'relative z-10 py-1.5 text-zinc-900' : 'relative z-10 py-1.5 text-zinc-500'; });
  }));
})();
</script>`,

  'tabs-content-slide': (p) => `<!-- Tailwind CSS + Safe JS: Sliding Panel Switch -->
<div class="w-full max-w-sm space-y-2">
  <div class="flex gap-2">
    <button type="button" class="tw-slide-tab rounded-lg bg-zinc-900 px-3 py-1 text-xs font-bold text-white" data-idx="0">1. 基本</button>
    <button type="button" class="tw-slide-tab rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600" data-idx="1">2. 詳細</button>
  </div>
  <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white">
    <div id="twSlideTrack" class="flex w-[200%] ${twTransition(p, 'transition-transform')} translate-x-0">
      <div class="w-1/2 p-4 text-xs text-zinc-700">タブ 1 のパネル内容</div>
      <div class="w-1/2 p-4 text-xs text-zinc-700">タブ 2 のパネル内容</div>
    </div>
  </div>
</div>
<script>
(() => {
  const track = document.getElementById('twSlideTrack');
  const tabs = document.querySelectorAll('.tw-slide-tab');
  if (!track || tabs.length === 0) return;
  tabs.forEach((t, idx) => t.addEventListener('click', () => {
    track.style.transform = \`translateX(-\${idx * 50}%)\`;
  }));
})();
</script>`,

  'tabs-smooth-accordion': (p) => `<!-- Tailwind CSS + Safe JS: Smooth Grid Row Accordion -->
<div class="rounded-xl border border-zinc-200 bg-white p-3">
  <button id="twAccBtn" type="button" class="flex w-full items-center justify-between text-left text-xs font-bold text-zinc-900" aria-expanded="false">
    <span>Q. コピーしたコードは商用利用できますか？</span>
    <span id="twAccPlus" class="${twTransition(p, 'transition-transform')}">+</span>
  </button>
  <div id="twAccBody" data-open="false" class="grid grid-rows-[0fr] opacity-0 data-[open=true]:grid-rows-[1fr] data-[open=true]:opacity-100 ${twTransition(p)}">
    <p class="min-h-0 overflow-hidden pt-2 text-xs text-zinc-600">はい、MIT準拠で個人・商用問わず自由にお使いいただけます。</p>
  </div>
</div>
<script>
(() => {
  const btn = document.getElementById('twAccBtn');
  const body = document.getElementById('twAccBody');
  const plus = document.getElementById('twAccPlus');
  if (!btn || !body || !plus) return;
  btn.addEventListener('click', () => {
    const open = body.dataset.open !== 'true';
    body.dataset.open = String(open);
    btn.setAttribute('aria-expanded', String(open));
    plus.classList.toggle('rotate-45', open);
  });
})();
</script>`,

  'tabs-filter-chips': (p) => `<!-- Tailwind CSS + Safe JS: Filter Chips -->
<div class="space-y-2">
  <div id="twChipRow" class="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="絞り込み">
    <button type="button" data-cat="all" aria-pressed="true" class="shrink-0 rounded-full border border-zinc-900 bg-zinc-900 px-3.5 py-1 text-xs font-bold text-white ${twTransition(p)}">すべて</button>
    <button type="button" data-cat="text" aria-pressed="false" class="shrink-0 rounded-full border border-zinc-200 bg-white px-3.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 ${twTransition(p)}">文字</button>
    <button type="button" data-cat="nav" aria-pressed="false" class="shrink-0 rounded-full border border-zinc-200 bg-white px-3.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 ${twTransition(p)}">ナビ</button>
  </div>
  <ul id="twChipList" class="space-y-1 text-xs text-zinc-700">
    <li data-cat="text" class="rounded-lg border border-zinc-200 px-3 py-1.5">文字の動き</li>
    <li data-cat="nav" class="rounded-lg border border-zinc-200 px-3 py-1.5">スライドメニュー</li>
  </ul>
</div>
<script>
(() => {
  const row = document.getElementById('twChipRow');
  const list = document.getElementById('twChipList');
  if (!row || !list) return;
  row.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => {
    const cat = btn.dataset.cat || 'all';
    row.querySelectorAll('button').forEach((c) => {
      const on = c === btn;
      c.setAttribute('aria-pressed', String(on));
      c.className = on
        ? 'shrink-0 rounded-full border border-zinc-900 bg-zinc-900 px-3.5 py-1 text-xs font-bold text-white ${twTransition(p)}'
        : 'shrink-0 rounded-full border border-zinc-200 bg-white px-3.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 ${twTransition(p)}';
    });
    list.querySelectorAll('li').forEach((li) => { li.hidden = cat !== 'all' && li.dataset.cat !== cat; });
  }));
})();
</script>`,

  'tabs-vertical-settings': (p) => `<!-- Tailwind CSS + Safe JS: Responsive Vertical Settings Tabs -->
<div id="twVertSet" class="grid grid-cols-1 overflow-hidden rounded-xl border border-zinc-200 bg-white md:grid-cols-[160px_1fr]">
  <div class="flex overflow-x-auto border-b border-zinc-200 bg-zinc-50 md:flex-col md:border-r md:border-b-0" role="tablist">
    <button type="button" data-msg="アカウント基本情報の設定画面" role="tab" aria-selected="true" class="shrink-0 border-b-2 border-blue-600 bg-blue-50 px-3.5 py-2.5 text-left text-xs font-bold text-blue-700 md:border-b-0 md:border-l-[3px] ${twTransition(p)}">アカウント</button>
    <button type="button" data-msg="メール・アプリ通知の詳細管理" role="tab" aria-selected="false" class="shrink-0 border-b-2 border-transparent px-3.5 py-2.5 text-left text-xs font-medium text-zinc-600 hover:bg-zinc-100 md:border-b-0 md:border-l-[3px] ${twTransition(p)}">通知設定</button>
  </div>
  <div id="twVertPanel" role="tabpanel" class="p-4 text-xs text-zinc-700">アカウント基本情報の設定画面</div>
</div>
<script>
(() => {
  const root = document.getElementById('twVertSet');
  const panel = document.getElementById('twVertPanel');
  if (!root || !panel) return;
  const tabs = root.querySelectorAll('[role="tab"]');
  tabs.forEach((t) => t.addEventListener('click', () => {
    panel.textContent = t.dataset.msg || '';
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.className = on
        ? 'shrink-0 border-b-2 border-blue-600 bg-blue-50 px-3.5 py-2.5 text-left text-xs font-bold text-blue-700 md:border-b-0 md:border-l-[3px] ${twTransition(p)}'
        : 'shrink-0 border-b-2 border-transparent px-3.5 py-2.5 text-left text-xs font-medium text-zinc-600 hover:bg-zinc-100 md:border-b-0 md:border-l-[3px] ${twTransition(p)}';
    });
  }));
})();
</script>`,

  // === 04. Search & Input (6) ===
  'search-icon-expand': (p) => `<!-- Tailwind CSS + Safe JS: Expanding Search Bar -->
<div class="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 focus-within:border-blue-500">
  <button id="twSearchToggle" type="button" aria-label="検索を開く" class="text-xs text-zinc-500">🔍</button>
  <input id="twSearchExpand" type="search" placeholder="検索..." class="w-0 opacity-0 text-xs text-zinc-800 outline-none data-[open=true]:w-44 data-[open=true]:opacity-100 focus:w-44 focus:opacity-100 ${twTransition(p, 'transition-all')}" />
</div>
<script>
(() => {
  const btn = document.getElementById('twSearchToggle');
  const inp = document.getElementById('twSearchExpand');
  if (!btn || !inp) return;
  btn.addEventListener('click', () => {
    const on = inp.dataset.open !== 'true';
    inp.dataset.open = String(on);
    if (on) inp.focus();
  });
})();
</script>`,

  'search-inline-bar': (p) => `<!-- Tailwind CSS: Always-visible Inline Search Bar -->
<div class="flex max-w-sm items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/15 ${twTransition(p)}">
  <span class="text-xs text-zinc-400" aria-hidden="true">🔍</span>
  <input type="search" placeholder="キーワードや #番号で検索..." class="w-full bg-transparent text-xs text-zinc-800 outline-none placeholder:text-zinc-400" />
</div>`,

  'search-backdrop-typography': (p) => `<!-- Tailwind CSS: Giant Watermark Search Header -->
<div class="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6">
  <span aria-hidden="true" class="pointer-events-none select-none font-black text-5xl tracking-tight text-zinc-100">SEARCH</span>
  <input type="search" placeholder="図鑑の中から探す..." class="relative z-10 -mt-5 w-full rounded-xl border border-zinc-300 bg-white/95 px-3.5 py-2 text-xs shadow-sm outline-none focus:border-blue-500 ${twTransition(p)}" />
</div>`,

  'search-command-modal': (p) => `<!-- Tailwind CSS + Safe JS: Command Palette Modal -->
<button id="twCmdOpen" type="button" class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">検索パレット (⌘K)</button>
<dialog id="twCmdModal" class="m-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-950/40 ${twTransition(p)}">
  <div class="flex items-center border-b border-zinc-200 px-3.5 py-2.5">
    <input type="search" placeholder="コマンドまたはパターン名を検索 (⌘K)" class="w-full text-xs text-zinc-800 outline-none" />
    <button id="twCmdClose" type="button" class="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">ESC</button>
  </div>
  <div class="p-2 text-xs text-zinc-600">#001 下から出現・#014 コマンド検索</div>
</dialog>
<script>
(() => {
  const modal = document.getElementById('twCmdModal');
  const openBtn = document.getElementById('twCmdOpen');
  const closeBtn = document.getElementById('twCmdClose');
  if (!modal || !openBtn || !closeBtn) return;
  openBtn.addEventListener('click', () => modal.showModal());
  closeBtn.addEventListener('click', () => modal.close());
})();
</script>`,

  'search-autocomplete': (p) => `<!-- Tailwind CSS + Safe JS: Autocomplete Popover -->
<div class="relative max-w-xs">
  <input id="twAcIn" type="search" placeholder="キーワードや #番号..." class="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 ${twTransition(p)}" />
  <ul id="twAcList" class="mt-1.5 space-y-0.5 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg empty:hidden" role="listbox"></ul>
</div>
<script>
(() => {
  const input = document.getElementById('twAcIn');
  const list = document.getElementById('twAcList');
  if (!input || !list) return;
  const items = ['#014 検索スポットライト', '#038 トグルスイッチ', '#084 長押し確定'];
  const render = () => {
    const q = input.value.replace(/[\\u0000-\\u001F\\u007F]/g, '').slice(0, 40).trim().toLowerCase();
    list.replaceChildren();
    items.filter((t) => !q || t.toLowerCase().includes(q)).forEach((text) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-zinc-700 hover:bg-blue-50 hover:text-blue-700 ${twTransition(p)}';
      btn.textContent = text;
      btn.addEventListener('click', () => { input.value = text; render(); });
      li.appendChild(btn);
      list.appendChild(li);
    });
  };
  input.addEventListener('input', render);
  render();
})();
</script>`,

  'search-popular-chips': (p) => `<!-- Tailwind CSS + Safe JS: Popular Search Chips -->
<div class="max-w-xs space-y-2">
  <div class="flex items-center gap-1 rounded-xl border border-zinc-300 bg-white px-2.5 py-1 focus-within:border-blue-500">
    <input id="twTagIn" type="text" placeholder="探したい語句を入力" class="flex-1 text-xs outline-none" />
    <button id="twTagClear" type="button" hidden class="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-600">クリア</button>
  </div>
  <div id="twTagRow" class="flex flex-wrap gap-1.5">
    <button type="button" data-tag="#001 下から出現" aria-pressed="false" class="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 hover:border-blue-300 hover:text-blue-700 ${twTransition(p)}">#001 下から出現</button>
    <button type="button" data-tag="hover" aria-pressed="false" class="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 hover:border-blue-300 hover:text-blue-700 ${twTransition(p)}">hover</button>
    <button type="button" data-tag="料金" aria-pressed="false" class="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 hover:border-blue-300 hover:text-blue-700 ${twTransition(p)}">料金</button>
  </div>
</div>
<script>
(() => {
  const input = document.getElementById('twTagIn');
  const clr = document.getElementById('twTagClear');
  const row = document.getElementById('twTagRow');
  if (!input || !clr || !row) return;
  const sync = () => {
    clr.hidden = !input.value;
    row.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(input.value === b.dataset.tag)));
  };
  row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.tag || ''; sync(); }));
  clr.addEventListener('click', () => { input.value = ''; sync(); });
  input.addEventListener('input', sync);
})();
</script>`,

  'text-circular-badge': (p) => `<!-- Tailwind CSS: Rotating Circular SVG Badge -->
<svg viewBox="0 0 120 120" class="h-28 w-28 animate-[spin_${Math.max(2, Math.round(p.duration * 6))}s_linear_infinite]">
  <defs><path id="twRing" d="M 60,60 m -42,0 a 42,42 0 1,1 84,0 a 42,42 0 1,1 -84,0" /></defs>
  <text class="fill-zinc-900 text-[10.5px] font-bold tracking-[0.22em]">
    <textPath href="#twRing">KATAKATALAB • MOTION ATLAS •</textPath>
  </text>
</svg>
<!-- ease preset: ${EASING_OPTIONS[p.easing].label} -->`
};
