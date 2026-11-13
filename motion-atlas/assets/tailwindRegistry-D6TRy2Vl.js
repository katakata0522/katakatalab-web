import{t as e}from"./index-Bpu_XHlw.js";function t(e){return`duration-[${Math.max(50,Math.round(e*1e3))}ms]`}function n(t){return`ease-[${e[t].css.replace(/\s+/g,``)}]`}function r(e,r=`transition-all`){return`${r} ${t(e.duration)} ${n(e.easing)}`}var i={"text-mask-slide-up":e=>`<!-- Tailwind CSS + Safe JS: Mask Slide Up -->
<div class="overflow-hidden">
  <h2 id="twMaskTitle" data-open="false" class="${r(e,`transition-transform`)} translate-y-[${e.distance}px] data-[open=true]:translate-y-0 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
    伝わるデザインは、動きから。
  </h2>
</div>
<script>
(() => {
  const el = document.getElementById('twMaskTitle');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
<\/script>`,"text-sweep-left-to-right":e=>`<!-- Tailwind CSS + Safe JS: Left-to-Right Clip Reveal -->
<div class="relative inline-block overflow-hidden">
  <span id="twSweepText" data-open="false" class="block text-2xl sm:text-3xl font-bold text-zinc-900 ${r(e)} [clip-path:inset(0_100%_0_0)] data-[open=true]:[clip-path:inset(0_0%_0_0)]">
    視線を左から右へ運ぶ
  </span>
</div>
<script>
(() => {
  const el = document.getElementById('twSweepText');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
<\/script>`,"text-stagger-chars":e=>`<!-- Tailwind CSS + Safe JS: Staggered Characters -->
<p id="twStaggerChars" data-open="false" class="group flex flex-wrap text-2xl font-extrabold text-zinc-900" aria-label="MOTION">
  <span class="inline-block ${r(e)} delay-[0ms] translate-y-[${e.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">M</span>
  <span class="inline-block ${r(e)} delay-[45ms] translate-y-[${e.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">O</span>
  <span class="inline-block ${r(e)} delay-[90ms] translate-y-[${e.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">T</span>
  <span class="inline-block ${r(e)} delay-[135ms] translate-y-[${e.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">I</span>
  <span class="inline-block ${r(e)} delay-[180ms] translate-y-[${e.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">O</span>
  <span class="inline-block ${r(e)} delay-[225ms] translate-y-[${e.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">N</span>
</p>
<script>
(() => {
  const el = document.getElementById('twStaggerChars');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
<\/script>`,"text-typewriter":e=>`<!-- Tailwind CSS + Safe JS: Typewriter -->
<p class="font-mono text-xl sm:text-2xl font-bold text-zinc-900">
  <span id="twTypeOut"></span><span class="ml-0.5 inline-block h-6 w-0.5 animate-pulse bg-blue-600 align-middle" aria-hidden="true"></span>
</p>
<script>
(() => {
  const el = document.getElementById('twTypeOut');
  const text = '伝わるデザインは、動きから。';
  if (!el) return;
  let i = 0;
  const step = Math.max(25, Math.round(${e.duration*1e3} / text.length));
  const timer = setInterval(() => {
    i += 1;
    el.textContent = text.slice(0, i);
    if (i >= text.length) clearInterval(timer);
  }, step);
})();
<\/script>`,"text-marker-highlight":e=>`<!-- Tailwind CSS + Safe JS: Marker Highlight Underline -->
<p class="text-xl sm:text-2xl font-bold text-zinc-900">
  要点だけを
  <span class="relative inline-block px-1">
    <span id="twMarkerLine" data-open="false" aria-hidden="true" class="absolute inset-x-0 bottom-0.5 h-3 origin-left rounded bg-amber-300/80 ${r(e,`transition-transform`)} scale-x-0 data-[open=true]:scale-x-100"></span>
    <span class="relative z-10">ひと目で伝える</span>
  </span>
</p>
<script>
(() => {
  const el = document.getElementById('twMarkerLine');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
<\/script>`,"text-tracking-compress":e=>`<!-- Tailwind CSS + Safe JS: Tracking Compress -->
<p id="twTrackText" data-open="false" class="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-[${(Math.max(4,e.distance)*.025).toFixed(3)}em] opacity-30 ${r(e)} data-[open=true]:tracking-[0.02em] data-[open=true]:opacity-100">
  MOTION ATLAS
</p>
<script>
(() => {
  const el = document.getElementById('twTrackText');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
<\/script>`,"text-scroll-fill":e=>`<!-- Tailwind CSS + Safe JS: Scroll Ink Fill Text -->
<div class="max-w-md space-y-3">
  <p id="twScrollFill" class="bg-clip-text text-xl sm:text-2xl font-extrabold text-transparent [background-size:200%_100%] ${r(e,`transition-[background-position]`)}" style="background-image: linear-gradient(90deg, #18181b 50%, #d4d4d8 50%); background-position: 45% 0;">
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
<\/script>`,"text-word-slot":e=>`<!-- Tailwind CSS + Safe JS: Vertical Word Slot -->
<div class="inline-flex items-center gap-2 text-xl sm:text-2xl font-bold text-zinc-900">
  <span>動きがあれば、UIは</span>
  <div class="h-9 w-28 overflow-hidden rounded-lg border border-blue-200 bg-blue-50/70">
    <div id="twSlotTrack" class="${r(e,`transition-transform`)} text-center text-blue-700 font-extrabold leading-9">
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
<\/script>`,"text-outline-fill":e=>`<!-- Tailwind CSS: Outline to Solid Fill -->
<div class="group relative inline-block cursor-pointer select-none">
  <span class="block text-3xl sm:text-5xl font-black tracking-tight text-transparent [-webkit-text-stroke:1.5px_#18181b]">CREATIVE UI</span>
  <span aria-hidden="true" class="absolute inset-0 block text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 ${r(e)} [clip-path:inset(0_100%_0_0)] group-hover:[clip-path:inset(0_0%_0_0)]">CREATIVE UI</span>
</div>`,"reveal-fade-lift":e=>`<!-- Tailwind CSS + Safe JS: Fade + Lift -->
<article id="twFadeCard" data-open="false" class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs ${r(e)} translate-y-[${e.distance}px] opacity-0 data-[open=true]:translate-y-0 data-[open=true]:opacity-100">
  <h3 class="text-base font-bold text-zinc-900">ふわっと浮き上がるカード</h3>
  <p class="mt-1 text-xs text-zinc-500">透明度と Y 軸を同時に遷移させます。</p>
</article>
<script>
(() => {
  const el = document.getElementById('twFadeCard');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
<\/script>`,"reveal-curtain-block":e=>`<!-- Tailwind CSS: Curtain Reveal -->
<div class="relative inline-block overflow-hidden rounded-xl bg-white px-5 py-3 shadow-xs">
  <span class="relative z-10 text-xl font-extrabold text-zinc-900">幕が上がって文字が現れる</span>
  <span aria-hidden="true" class="absolute inset-0 z-20 origin-right bg-zinc-900 ${r(e,`transition-transform`)} scale-x-0"></span>
</div>`,"reveal-stagger-grid":e=>`<!-- Tailwind CSS + Safe JS: Stagger Grid -->
<div id="twStaggerGrid" data-open="false" class="group grid grid-cols-3 gap-3">
  <div class="rounded-xl border border-zinc-200 bg-white p-4 ${r(e)} delay-[0ms] translate-y-[${e.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">01</div>
  <div class="rounded-xl border border-zinc-200 bg-white p-4 ${r(e)} delay-[80ms] translate-y-[${e.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">02</div>
  <div class="rounded-xl border border-zinc-200 bg-white p-4 ${r(e)} delay-[160ms] translate-y-[${e.distance}px] opacity-0 group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100">03</div>
</div>
<script>
(() => {
  const el = document.getElementById('twStaggerGrid');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
<\/script>`,"reveal-3d-flip":e=>`<!-- Tailwind CSS + Safe JS: 3D Perspective Rise -->
<div class="[perspective:900px]">
  <div id="twFlipRise" data-open="false" class="origin-top rounded-2xl border border-zinc-200 bg-white p-5 shadow-md ${r(e)} [transform:rotateX(-28deg)] opacity-0 data-[open=true]:[transform:rotateX(0deg)] data-[open=true]:opacity-100">
    <h3 class="text-base font-bold text-zinc-900">奥行きのある立体登場</h3>
  </div>
</div>
<script>
(() => {
  const el = document.getElementById('twFlipRise');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
<\/script>`,"reveal-frame-zoom":e=>`<!-- Tailwind CSS: Image Inside Fixed Frame Zoom -->
<article class="group h-40 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
  <div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-zinc-100 text-sm font-bold text-zinc-700 ${r(e,`transition-transform`)} group-hover:scale-[${(1+e.distance/100).toFixed(2)}]">
    カードビジュアル
  </div>
</article>`,"reveal-caption-overlay":e=>`<!-- Tailwind CSS: Slide-up Caption Overlay -->
<article class="group relative h-40 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
  <div class="p-4 text-xs font-semibold text-zinc-600">作品ビジュアル</div>
  <div class="absolute inset-x-0 bottom-0 bg-zinc-950/85 p-3 text-xs font-semibold text-white translate-y-full group-hover:translate-y-0 ${r(e,`transition-transform`)}">
    事例タイトル・解説テキスト
  </div>
</article>`,"reveal-blur-focus":e=>`<!-- Tailwind CSS + Safe JS: Blur to Sharp Focus -->
<div id="twBlurCard" data-open="false" class="rounded-xl border border-zinc-200 bg-white p-5 ${r(e)} blur-[${Math.min(16,Math.max(4,e.distance))}px] opacity-30 scale-[1.03] data-[open=true]:blur-none data-[open=true]:opacity-100 data-[open=true]:scale-100">
  ピントが合うコンテンツ
</div>
<script>
(() => {
  const el = document.getElementById('twBlurCard');
  if (el) requestAnimationFrame(() => { el.dataset.open = 'true'; });
})();
<\/script>`,"reveal-staggered-offset":()=>`<!-- Tailwind CSS: Static Staggered 2-Col Offset -->
<div class="grid grid-cols-1 gap-4 pb-6 md:grid-cols-2">
  <div class="rounded-xl border border-zinc-200 bg-white p-4">01 左列カード</div>
  <div class="rounded-xl border border-zinc-200 bg-white p-4 md:translate-y-4">02 右列（段差あり）</div>
</div>`,"nav-slide-drawer":e=>`<!-- Tailwind CSS + Safe JS: Slide Drawer -->
<button id="twDrawerOpen" type="button" aria-expanded="false" class="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold">メニュー</button>
<aside id="twDrawerPanel" class="fixed inset-y-0 left-0 z-50 w-64 -translate-x-full bg-white p-5 shadow-xl ${r(e,`transition-transform`)} data-[open=true]:translate-x-0" data-open="false" aria-hidden="true">
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
<\/script>`,"nav-fullscreen-curtain":e=>`<!-- Tailwind CSS + Safe JS: Radial Fullscreen Clip Menu -->
<button id="twCurtainBtn" type="button" aria-expanded="false" class="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white">メニュー展開</button>
<nav id="twCurtain" data-open="false" class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-zinc-950 text-2xl font-bold text-white ${r(e)} [clip-path:circle(0%_at_92%_8%)] data-[open=true]:[clip-path:circle(150%_at_92%_8%)]">
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
<\/script>`,"nav-top-accordion":e=>`<!-- Tailwind CSS + Safe JS: CSS Grid Row Top Accordion -->
<button id="twTopAccBtn" type="button" aria-expanded="false" class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-800">メニュー ▾</button>
<div id="twTopAccWrap" class="grid grid-rows-[0fr] ${r(e)} data-[open=true]:grid-rows-[1fr]" data-open="false">
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
<\/script>`,"nav-bottom-sheet":e=>`<!-- Tailwind CSS + Safe JS: Thumb Bottom Sheet -->
<button id="twSheetOpen" type="button" class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold">アクションを開く</button>
<div id="twSheet" data-open="false" class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-zinc-200 bg-white p-4 shadow-2xl ${r(e,`transition-transform`)} translate-y-full data-[open=true]:translate-y-0">
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
<\/script>`,"nav-icon-morph-variants":e=>`<!-- Tailwind CSS + Safe JS: + to × Icon Morph -->
<button id="twMorphBtn" type="button" aria-expanded="false" aria-label="メニューを開く" class="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white ${r(e,`transition-transform`)}">
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
<\/script>`,"nav-stagger-drawer":e=>`<!-- Tailwind CSS: Staggered Links Inside Drawer -->
<nav class="group flex w-60 flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-3" data-open="true">
  <a href="#a" class="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-800 ${r(e)} delay-[80ms] group-data-[open=true]:translate-x-0 group-data-[open=true]:opacity-100 -translate-x-3 opacity-0">ホーム</a>
  <a href="#b" class="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-800 ${r(e)} delay-[140ms] group-data-[open=true]:translate-x-0 group-data-[open=true]:opacity-100 -translate-x-3 opacity-0">機能</a>
  <a href="#c" class="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-800 ${r(e)} delay-[200ms] group-data-[open=true]:translate-x-0 group-data-[open=true]:opacity-100 -translate-x-3 opacity-0">料金</a>
</nav>`,"nav-app-tab-bar":e=>`<!-- Tailwind CSS + Safe JS: App Bottom Tab Bar -->
<nav id="twAppTabBar" class="grid grid-cols-4 border-t border-zinc-200 bg-white/95 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))]" aria-label="主要タブ">
  <button type="button" data-active="true" class="group flex flex-col items-center py-1 text-[11px] font-semibold text-zinc-500 data-[active=true]:font-bold data-[active=true]:text-blue-700" aria-current="page">
    <span class="rounded-full px-3 py-1 ${r(e)} group-data-[active=true]:bg-blue-50">ホーム</span>
  </button>
  <button type="button" class="group flex flex-col items-center py-1 text-[11px] font-semibold text-zinc-500 data-[active=true]:font-bold data-[active=true]:text-blue-700">
    <span class="rounded-full px-3 py-1 ${r(e)} group-data-[active=true]:bg-blue-50">さがす</span>
  </button>
  <button type="button" class="group flex flex-col items-center py-1 text-[11px] font-semibold text-zinc-500 data-[active=true]:font-bold data-[active=true]:text-blue-700">
    <span class="rounded-full px-3 py-1 ${r(e)} group-data-[active=true]:bg-blue-50">保存</span>
  </button>
  <button type="button" class="group flex flex-col items-center py-1 text-[11px] font-semibold text-zinc-500 data-[active=true]:font-bold data-[active=true]:text-blue-700">
    <span class="rounded-full px-3 py-1 ${r(e)} group-data-[active=true]:bg-blue-50">設定</span>
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
<\/script>`,"tabs-sliding-underline":e=>`<!-- Tailwind CSS + Safe JS: Sliding Underline Tabs -->
<div id="twUnderTabs" class="relative inline-flex border-b border-zinc-200" role="tablist">
  <button type="button" data-i="0" class="w-16 py-2 text-xs font-bold text-blue-600" role="tab" aria-selected="true">概要</button>
  <button type="button" data-i="1" class="w-16 py-2 text-xs font-semibold text-zinc-500" role="tab" aria-selected="false">仕様</button>
  <span id="twUnderBar" aria-hidden="true" class="absolute bottom-0 left-0 h-0.5 w-16 bg-blue-600 ${r(e,`transition-transform`)}"></span>
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
<\/script>`,"tabs-floating-pill":e=>`<!-- Tailwind CSS + Safe JS: Floating Segment Pill -->
<div id="twSegTabs" class="relative grid w-64 grid-cols-2 rounded-full bg-zinc-100 p-1 text-xs font-semibold">
  <span id="twSegPill" aria-hidden="true" class="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-xs ${r(e,`transition-transform`)}"></span>
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
<\/script>`,"tabs-content-slide":e=>`<!-- Tailwind CSS + Safe JS: Sliding Panel Switch -->
<div class="w-full max-w-sm space-y-2">
  <div class="flex gap-2">
    <button type="button" class="tw-slide-tab rounded-lg bg-zinc-900 px-3 py-1 text-xs font-bold text-white" data-idx="0">1. 基本</button>
    <button type="button" class="tw-slide-tab rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600" data-idx="1">2. 詳細</button>
  </div>
  <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white">
    <div id="twSlideTrack" class="flex w-[200%] ${r(e,`transition-transform`)} translate-x-0">
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
<\/script>`,"tabs-smooth-accordion":e=>`<!-- Tailwind CSS + Safe JS: Smooth Grid Row Accordion -->
<div class="rounded-xl border border-zinc-200 bg-white p-3">
  <button id="twAccBtn" type="button" class="flex w-full items-center justify-between text-left text-xs font-bold text-zinc-900" aria-expanded="false">
    <span>Q. コピーしたコードは商用利用できますか？</span>
    <span id="twAccPlus" class="${r(e,`transition-transform`)}">+</span>
  </button>
  <div id="twAccBody" data-open="false" class="grid grid-rows-[0fr] opacity-0 data-[open=true]:grid-rows-[1fr] data-[open=true]:opacity-100 ${r(e)}">
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
<\/script>`,"tabs-filter-chips":e=>`<!-- Tailwind CSS + Safe JS: Filter Chips -->
<div class="space-y-2">
  <div id="twChipRow" class="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="絞り込み">
    <button type="button" data-cat="all" aria-pressed="true" class="shrink-0 rounded-full border border-zinc-900 bg-zinc-900 px-3.5 py-1 text-xs font-bold text-white ${r(e)}">すべて</button>
    <button type="button" data-cat="text" aria-pressed="false" class="shrink-0 rounded-full border border-zinc-200 bg-white px-3.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 ${r(e)}">文字</button>
    <button type="button" data-cat="nav" aria-pressed="false" class="shrink-0 rounded-full border border-zinc-200 bg-white px-3.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 ${r(e)}">ナビ</button>
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
        ? 'shrink-0 rounded-full border border-zinc-900 bg-zinc-900 px-3.5 py-1 text-xs font-bold text-white ${r(e)}'
        : 'shrink-0 rounded-full border border-zinc-200 bg-white px-3.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 ${r(e)}';
    });
    list.querySelectorAll('li').forEach((li) => { li.hidden = cat !== 'all' && li.dataset.cat !== cat; });
  }));
})();
<\/script>`,"tabs-vertical-settings":e=>`<!-- Tailwind CSS + Safe JS: Responsive Vertical Settings Tabs -->
<div id="twVertSet" class="grid grid-cols-1 overflow-hidden rounded-xl border border-zinc-200 bg-white md:grid-cols-[160px_1fr]">
  <div class="flex overflow-x-auto border-b border-zinc-200 bg-zinc-50 md:flex-col md:border-r md:border-b-0" role="tablist">
    <button type="button" data-msg="アカウント基本情報の設定画面" role="tab" aria-selected="true" class="shrink-0 border-b-2 border-blue-600 bg-blue-50 px-3.5 py-2.5 text-left text-xs font-bold text-blue-700 md:border-b-0 md:border-l-[3px] ${r(e)}">アカウント</button>
    <button type="button" data-msg="メール・アプリ通知の詳細管理" role="tab" aria-selected="false" class="shrink-0 border-b-2 border-transparent px-3.5 py-2.5 text-left text-xs font-medium text-zinc-600 hover:bg-zinc-100 md:border-b-0 md:border-l-[3px] ${r(e)}">通知設定</button>
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
        ? 'shrink-0 border-b-2 border-blue-600 bg-blue-50 px-3.5 py-2.5 text-left text-xs font-bold text-blue-700 md:border-b-0 md:border-l-[3px] ${r(e)}'
        : 'shrink-0 border-b-2 border-transparent px-3.5 py-2.5 text-left text-xs font-medium text-zinc-600 hover:bg-zinc-100 md:border-b-0 md:border-l-[3px] ${r(e)}';
    });
  }));
})();
<\/script>`,"search-icon-expand":e=>`<!-- Tailwind CSS + Safe JS: Expanding Search Bar -->
<div class="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 focus-within:border-blue-500">
  <button id="twSearchToggle" type="button" aria-label="検索を開く" class="text-xs text-zinc-500">🔍</button>
  <input id="twSearchExpand" type="search" placeholder="検索..." class="w-0 opacity-0 text-xs text-zinc-800 outline-none data-[open=true]:w-44 data-[open=true]:opacity-100 focus:w-44 focus:opacity-100 ${r(e,`transition-all`)}" />
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
<\/script>`,"search-inline-bar":e=>`<!-- Tailwind CSS: Always-visible Inline Search Bar -->
<div class="flex max-w-sm items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/15 ${r(e)}">
  <span class="text-xs text-zinc-400" aria-hidden="true">🔍</span>
  <input type="search" placeholder="キーワードや #番号で検索..." class="w-full bg-transparent text-xs text-zinc-800 outline-none placeholder:text-zinc-400" />
</div>`,"search-backdrop-typography":e=>`<!-- Tailwind CSS: Giant Watermark Search Header -->
<div class="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6">
  <span aria-hidden="true" class="pointer-events-none select-none font-black text-5xl tracking-tight text-zinc-100">SEARCH</span>
  <input type="search" placeholder="図鑑の中から探す..." class="relative z-10 -mt-5 w-full rounded-xl border border-zinc-300 bg-white/95 px-3.5 py-2 text-xs shadow-sm outline-none focus:border-blue-500 ${r(e)}" />
</div>`,"search-command-modal":e=>`<!-- Tailwind CSS + Safe JS: Command Palette Modal -->
<button id="twCmdOpen" type="button" class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">検索パレット (⌘K)</button>
<dialog id="twCmdModal" class="m-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-zinc-950/40 ${r(e)}">
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
<\/script>`,"search-autocomplete":e=>`<!-- Tailwind CSS + Safe JS: Autocomplete Popover -->
<div class="relative max-w-xs">
  <input id="twAcIn" type="search" placeholder="キーワードや #番号..." class="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 ${r(e)}" />
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
      btn.className = 'w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-zinc-700 hover:bg-blue-50 hover:text-blue-700 ${r(e)}';
      btn.textContent = text;
      btn.addEventListener('click', () => { input.value = text; render(); });
      li.appendChild(btn);
      list.appendChild(li);
    });
  };
  input.addEventListener('input', render);
  render();
})();
<\/script>`,"search-popular-chips":e=>`<!-- Tailwind CSS + Safe JS: Popular Search Chips -->
<div class="max-w-xs space-y-2">
  <div class="flex items-center gap-1 rounded-xl border border-zinc-300 bg-white px-2.5 py-1 focus-within:border-blue-500">
    <input id="twTagIn" type="text" placeholder="探したい語句を入力" class="flex-1 text-xs outline-none" />
    <button id="twTagClear" type="button" hidden class="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-600">クリア</button>
  </div>
  <div id="twTagRow" class="flex flex-wrap gap-1.5">
    <button type="button" data-tag="#001 下から出現" aria-pressed="false" class="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 hover:border-blue-300 hover:text-blue-700 ${r(e)}">#001 下から出現</button>
    <button type="button" data-tag="hover" aria-pressed="false" class="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 hover:border-blue-300 hover:text-blue-700 ${r(e)}">hover</button>
    <button type="button" data-tag="料金" aria-pressed="false" class="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 hover:border-blue-300 hover:text-blue-700 ${r(e)}">料金</button>
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
<\/script>`,"text-circular-badge":t=>`<!-- Tailwind CSS: Rotating Circular SVG Badge -->
<svg viewBox="0 0 120 120" class="h-28 w-28 animate-[spin_${Math.max(2,Math.round(t.duration*6))}s_linear_infinite]">
  <defs><path id="twRing" d="M 60,60 m -42,0 a 42,42 0 1,1 84,0 a 42,42 0 1,1 -84,0" /></defs>
  <text class="fill-zinc-900 text-[10.5px] font-bold tracking-[0.22em]">
    <textPath href="#twRing">KATAKATALAB • MOTION ATLAS •</textPath>
  </text>
</svg>
<!-- ease preset: ${e[t.easing].label} -->`},a={"micro-tactile-press":e=>`<!-- Tailwind CSS: Tactile Press Button -->
<button type="button" class="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm ${r(e,`transition-transform`)} hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.97]">
  クリックしてみる
</button>`,"micro-click-ripple":e=>`<!-- Tailwind CSS + Safe JS: Click Coordinates Ripple -->
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
    setTimeout(() => s.remove(), ${Math.max(250,Math.round(e.duration*1e3))});
  });
})();
<\/script>`,"micro-underline-sweep":e=>`<!-- Tailwind CSS: Origin-flip Hover Underline -->
<a href="#more" class="relative inline-block py-1 text-sm font-bold text-zinc-900 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-right after:scale-x-0 after:bg-blue-600 after:${r(e,`transition-transform`)} hover:after:origin-left hover:after:scale-x-100">
  詳しく見てみる
</a>`,"micro-magnetic-button":e=>`<!-- Tailwind CSS + Safe JS: Magnetic Pull Button -->
<button type="button" id="twMagBtn" class="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md ${r(e,`transition-transform`)}">
  引き寄せボタン
</button>
<script>
(() => {
  const btn = document.getElementById('twMagBtn');
  if (!btn) return;
  btn.addEventListener('mousemove', (e) => {
    const r = btn.getBoundingClientRect();
    const dx = Math.max(-${e.distance}, Math.min(${e.distance}, (e.clientX - (r.left + r.width / 2)) * 0.35));
    const dy = Math.max(-${e.distance}, Math.min(${e.distance}, (e.clientY - (r.top + r.height / 2)) * 0.35));
    btn.style.transform = \`translate3d(\${dx}px, \${dy}px, 0)\`;
  });
  btn.addEventListener('mouseleave', () => { btn.style.transform = 'translate3d(0,0,0)'; });
})();
<\/script>`,"micro-button-3d":e=>`<!-- Tailwind CSS: 3D Thick Push Button -->
<button type="button" class="rounded-xl border border-blue-700 bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_5px_0_#1d4ed8] ${r(e,`transition-all`)} active:translate-y-1 active:shadow-[0_1px_0_#1d4ed8]">
  立体プッシュボタン
</button>`,"micro-button-shimmer":e=>`<!-- Tailwind CSS: Group-hover Shimmer CTA -->
<button type="button" class="group relative overflow-hidden rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-bold text-white">
  <span class="relative z-10">今すぐ試してみる</span>
  <span aria-hidden="true" class="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent group-hover:left-[160%] ${r(e,`transition-all`)}"></span>
</button>`,"micro-button-arrow":e=>`<!-- Tailwind CSS: Arrow Slide on Hover -->
<a href="#detail" class="group inline-flex items-center gap-2 rounded-full border border-zinc-900 px-5 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-900 hover:text-white ${r(e)}">
  詳細を見る <span aria-hidden="true" class="inline-block group-hover:translate-x-1.5 ${r(e,`transition-transform`)}">→</span>
</a>`,"micro-button-copy":e=>`<!-- Tailwind CSS + Safe JS: Self-resetting Copy Button -->
<button type="button" id="twCopyBtn" class="rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 ${r(e)}">
  コードをコピー
</button>
<script>
(() => {
  const btn = document.getElementById('twCopyBtn');
  if (!btn) return;
  let timer = 0;
  btn.addEventListener('click', () => {
    clearTimeout(timer);
    btn.className = 'rounded-lg border border-emerald-600 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 ${r(e)}';
    btn.textContent = '✓ コピー完了！';
    timer = setTimeout(() => {
      btn.className = 'rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 ${r(e)}';
      btn.textContent = 'コードをコピー';
    }, 1600);
  });
})();
<\/script>`,"micro-button-hold":e=>`<!-- Tailwind CSS + Safe JS: Long-press Confirm Button -->
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
    const ms = ${Math.round(e.duration*1e3)};
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
<\/script>`,"micro-heart-pop":e=>`<!-- Tailwind CSS + Safe JS: Heart Like Scale Bounce -->
<button id="twHeartBtn" type="button" aria-pressed="false" aria-label="お気に入り" class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-xl text-zinc-400 ${r(e,`transition-all`)}">
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
<\/script>`,"layout-sticky-split":e=>`<!-- Tailwind CSS: Sticky Sidebar 2-Column Split -->
<section class="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr] md:items-start">
  <aside class="rounded-xl border border-zinc-200 bg-white p-4 md:sticky md:top-6">
    <h2 class="text-sm font-bold text-zinc-900">左側固定説明</h2>
    <p class="mt-1 text-xs text-zinc-500">スクロール中も定位置に留まります。</p>
  </aside>
  <div class="space-y-3">
    <div class="h-32 rounded-xl border border-zinc-200 bg-white p-4 text-xs ${r(e)} hover:-translate-y-0.5 hover:border-zinc-300">詳細ステップ 01</div>
    <div class="h-32 rounded-xl border border-zinc-200 bg-white p-4 text-xs ${r(e)} hover:-translate-y-0.5 hover:border-zinc-300">詳細ステップ 02</div>
  </div>
</section>`,"layout-shrinking-header":e=>`<!-- Tailwind CSS + Safe JS: Shrinking Header + Top Progress Line -->
<div id="twShrinkScroll" class="h-44 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50">
  <header id="twShrinkHdr" class="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur ${r(e)}">
    <div id="twShrinkInner" class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 text-xs font-bold text-zinc-900 ${r(e)}">
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
<\/script>`,"layout-bento-grid":e=>`<!-- Tailwind CSS: Responsive Bento Box Grid -->
<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
  <div class="col-span-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs ${r(e)} hover:-translate-y-0.5">主役カード（2列占有）</div>
  <div class="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs">数値指標</div>
  <div class="rounded-2xl border border-zinc-200 bg-blue-50/70 p-4 text-xs font-bold text-blue-800">注目機能</div>
</div>`,"layout-marquee-loop":e=>`<!-- Tailwind CSS: Seamless Infinite Marquee -->
<div class="overflow-hidden border-y border-zinc-200 bg-zinc-50 py-2">
  <div class="flex w-max gap-6 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)] animate-[marquee_${Math.max(2,Math.round(e.duration*6))}s_linear_infinite]">
    <span class="text-xs font-bold text-zinc-600">REACT</span><span class="text-xs font-bold text-zinc-600">TAILWIND</span><span class="text-xs font-bold text-zinc-600">MOTION</span>
    <span class="text-xs font-bold text-zinc-600">REACT</span><span class="text-xs font-bold text-zinc-600">TAILWIND</span><span class="text-xs font-bold text-zinc-600">MOTION</span>
  </div>
</div>`,"layout-skeleton-toast":e=>`<!-- Tailwind CSS + Safe JS: Pulse Skeleton + Top Toast -->
<div class="space-y-3">
  <button id="twLoadBtn" type="button" class="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-bold">読み込みを実行</button>
  <div class="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
    <div class="h-9 w-9 animate-pulse rounded-lg bg-zinc-200"></div>
    <div class="flex-1 space-y-1.5">
      <div class="h-3 w-2/3 animate-pulse rounded bg-zinc-200"></div>
      <div class="h-2.5 w-1/2 animate-pulse rounded bg-zinc-100"></div>
    </div>
  </div>
  <div id="twToastMsg" role="status" class="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md opacity-0 translate-y-2 ${r(e)}">✓ 読み込みが完了しました</div>
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
<\/script>`,"carousel-scroll-snap":e=>`<!-- Tailwind CSS + Safe JS: CSS Scroll Snap Horizontal Strip -->
<div class="flex items-center gap-2">
  <button id="twSnapPrev" type="button" aria-label="前へ" class="h-8 w-8 shrink-0 rounded-full border border-zinc-200 bg-white text-sm font-bold">‹</button>
  <div id="twSnapTrack" class="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none]">
    <div class="w-52 shrink-0 snap-start rounded-xl border border-zinc-200 bg-white p-4 text-xs font-bold ${r(e)} hover:-translate-y-0.5">スライド 01</div>
    <div class="w-52 shrink-0 snap-start rounded-xl border border-zinc-200 bg-white p-4 text-xs font-bold ${r(e)} hover:-translate-y-0.5">スライド 02</div>
    <div class="w-52 shrink-0 snap-start rounded-xl border border-zinc-200 bg-white p-4 text-xs font-bold ${r(e)} hover:-translate-y-0.5">スライド 03</div>
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
<\/script>`,"carousel-peek-slider":e=>`<!-- Tailwind CSS + Safe JS: Next-card Peek Slider -->
<div class="space-y-2 overflow-hidden">
  <div id="twPeekTrack" class="flex gap-3 ${r(e,`transition-transform`)}">
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
<\/script>`,"carousel-thumb-sync":e=>`<!-- Tailwind CSS + Safe JS: Thumbnail Sync Gallery -->
<div class="max-w-sm space-y-2">
  <div id="twMainView" class="flex h-32 items-center justify-center rounded-xl border border-zinc-200 bg-blue-50 text-sm font-bold text-blue-900 ${r(e)}">シーン 01</div>
  <div id="twThumbGrid" class="grid grid-cols-3 gap-2">
    <button type="button" data-title="シーン 01" aria-pressed="true" class="rounded-lg border border-blue-500 bg-white py-2 text-[11px] font-bold text-blue-700 scale-[1.03] ${r(e)}">01</button>
    <button type="button" data-title="シーン 02" aria-pressed="false" class="rounded-lg border border-zinc-200 bg-white py-2 text-[11px] text-zinc-600 ${r(e)}">02</button>
    <button type="button" data-title="シーン 03" aria-pressed="false" class="rounded-lg border border-zinc-200 bg-white py-2 text-[11px] text-zinc-600 ${r(e)}">03</button>
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
        ? 'rounded-lg border border-blue-500 bg-white py-2 text-[11px] font-bold text-blue-700 scale-[1.03] ${r(e)}'
        : 'rounded-lg border border-zinc-200 bg-white py-2 text-[11px] text-zinc-600 ${r(e)}';
    });
  }));
})();
<\/script>`,"carousel-lightbox":e=>`<!-- Tailwind CSS + Safe JS: Native Dialog Lightbox -->
<button id="twLbOpen" type="button" class="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs font-bold hover:border-blue-400">画像を拡大表示</button>
<dialog id="twLb" class="m-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl backdrop:bg-zinc-950/60 ${r(e)}">
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
<\/script>`,"carousel-stack-deck":e=>`<!-- Tailwind CSS + Safe JS: Layered Stacked Card Deck -->
<div class="space-y-3 text-center">
  <div id="twDeck" class="relative mx-auto h-36 w-64">
    <div data-pos="1" class="absolute inset-0 translate-y-3 scale-95 rounded-2xl border border-zinc-200 bg-zinc-100 ${r(e)}"></div>
    <div data-pos="0" class="relative flex h-full items-center justify-center rounded-2xl border border-zinc-200 bg-white font-bold text-zinc-900 shadow-md ${r(e)}">前面カード 01</div>
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
<\/script>`,"craft-flip-card":e=>`<!-- Tailwind CSS + Safe JS: 3D Backface-hidden Flip Card -->
<button id="twFlipBtn" type="button" data-flipped="false" aria-pressed="false" class="group block h-36 w-60 text-left [perspective:900px]">
  <div class="relative h-full w-full [transform-style:preserve-3d] ${r(e,`transition-transform`)} group-hover:[transform:rotateY(180deg)] group-data-[flipped=true]:[transform:rotateY(180deg)]">
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
<\/script>`,"craft-before-after":e=>`<!-- Tailwind CSS + Safe JS: Before / After Clip Slider -->
<div class="relative h-32 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900 text-white">
  <div class="flex h-full items-center justify-center text-xs font-bold">AFTER（完成後）</div>
  <div id="twBaLayer" class="absolute inset-0 flex items-center justify-center bg-zinc-100 text-xs font-bold text-zinc-700 [clip-path:inset(0_${100-Math.min(100,Math.max(0,e.distance))}%_0_0)]">BEFORE</div>
  <input id="twBaRange" type="range" min="0" max="100" value="${Math.min(100,Math.max(0,e.distance))}" class="absolute inset-x-2 bottom-2 z-20 accent-blue-600" aria-label="比較スライダー" />
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
<\/script>`,"craft-tilt-shine":e=>`<!-- Tailwind CSS + Safe JS: 3D Tilt & Shine -->
<div id="twTilt" class="relative w-64 overflow-hidden rounded-2xl bg-zinc-900 p-5 text-white shadow-lg ${r(e,`transition-transform`)}">
  <div class="text-xs font-mono text-zinc-400">3D TILT CARD</div>
  <div class="mt-2 text-sm font-bold">カーソル方向へ立体傾き</div>
</div>
<script>
(() => {
  const card = document.getElementById('twTilt');
  if (!card) return;
  const maxTilt = ${Math.min(20,Math.max(4,e.distance))};
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    const rx = (((r.top + r.height / 2) - e.clientY) / (r.height / 2)) * maxTilt;
    const ry = ((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * maxTilt;
    card.style.transform = \`perspective(800px) rotateX(\${rx.toFixed(1)}deg) rotateY(\${ry.toFixed(1)}deg)\`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)'; });
})();
<\/script>`,"craft-number-counter":e=>`<!-- Tailwind CSS + Safe JS: Decelerating Number Counter -->
<div class="rounded-xl border border-zinc-200 bg-white p-4 text-center">
  <div class="text-[11px] font-medium text-zinc-500">収録パターン</div>
  <div id="twCounter" class="mt-1 font-extrabold text-4xl tracking-tight text-zinc-900 tabular-nums">0</div>
</div>
<script>
(() => {
  const el = document.getElementById('twCounter');
  if (!el) return;
  const target = 100;
  const ms = ${Math.max(200,Math.round(e.duration*1e3))};
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
<\/script>`,"craft-scrollspy-toc":e=>`<!-- Tailwind CSS + Safe JS: Live Scrollspy Two-Column TOC -->
<div class="grid max-w-md grid-cols-[1.4fr_1fr] overflow-hidden rounded-xl border border-zinc-200 bg-white">
  <div id="twSpyBody" class="h-36 space-y-6 overflow-y-auto p-3 text-xs text-zinc-600">
    <section id="twS1" data-spy="0" class="min-h-24"><strong class="text-zinc-900">1. 導入</strong><p>概要の説明文...</p></section>
    <section id="twS2" data-spy="1" class="min-h-24"><strong class="text-zinc-900">2. 仕組み</strong><p>連動ロジック解説...</p></section>
  </div>
  <nav id="twSpyToc" class="border-l border-zinc-100 bg-zinc-50/70 p-2.5 text-[11px]" aria-label="目次">
    <a href="#twS1" class="block border-l-2 border-blue-600 pl-2 font-bold text-blue-700 ${r(e)}">1. 導入</a>
    <a href="#twS2" class="mt-1 block border-l-2 border-transparent pl-2 text-zinc-500 ${r(e)}">2. 仕組み</a>
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
          ? 'block border-l-2 border-blue-600 pl-2 font-bold text-blue-700 ${r(e)}'
          : 'mt-1 block border-l-2 border-transparent pl-2 text-zinc-500 ${r(e)}';
      });
    }
  }, { root, threshold: 0.5 });
  root.querySelectorAll('section').forEach((s) => io.observe(s));
})();
<\/script>`},o={"hf-classic-header":()=>`<!-- Tailwind CSS: Classic 3-Column Header -->
<header class="flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-3">
  <a href="#top" class="text-sm font-extrabold text-zinc-900">BrandLogo</a>
  <nav class="hidden gap-6 text-xs font-medium text-zinc-600 md:flex">
    <a href="#features" class="hover:text-zinc-900">特徴</a>
    <a href="#pricing" class="hover:text-zinc-900">料金</a>
    <a href="#faq" class="hover:text-zinc-900">FAQ</a>
  </nav>
  <a href="#start" class="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-zinc-700">はじめる</a>
</header>`,"hf-centered-brand":()=>`<!-- Tailwind CSS: Centered Wordmark Header -->
<header class="grid grid-cols-3 items-center border-b border-zinc-200 bg-white px-5 py-3 text-xs font-medium text-zinc-600">
  <div class="flex gap-4"><a href="#shop">Shop</a><a href="#journal">Journal</a></div>
  <a href="#top" class="text-center font-serif text-base font-bold tracking-widest text-zinc-900">ATELIER</a>
  <div class="flex justify-end gap-4"><a href="#search">Search</a><a href="#cart">Cart</a></div>
</header>`,"hf-floating-pill":e=>`<!-- Tailwind CSS + Safe JS: Floating Pill Smart Header -->
<header id="twFloatPill" class="sticky top-3 z-40 mx-auto flex max-w-xl items-center justify-between rounded-full border border-zinc-200/80 bg-white/90 px-4 py-2 shadow-sm backdrop-blur ${r(e)}">
  <span class="text-xs font-extrabold text-zinc-900">Motion</span>
  <nav class="flex gap-4 text-xs text-zinc-600"><a href="#a">一覧</a><a href="#b">使い方</a></nav>
  <a href="#go" class="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold text-white">開く</a>
</header>
<script>
(() => {
  const hdr = document.getElementById('twFloatPill');
  if (!hdr) return;
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    hdr.classList.toggle('-translate-y-20', y > 120 && y > lastY);
    hdr.classList.toggle('opacity-0', y > 120 && y > lastY);
    lastY = y;
  }, { passive: true });
})();
<\/script>`,"hf-mega-menu":e=>`<!-- Tailwind CSS + Safe JS: Expandable Mega Menu Header -->
<header class="relative border-b border-zinc-200 bg-white px-5 py-3">
  <div class="flex items-center justify-between">
    <span class="text-sm font-bold text-zinc-900">Product</span>
    <button id="twMegaBtn" type="button" aria-expanded="false" class="text-xs font-semibold text-blue-600">製品一覧 ▾</button>
  </div>
  <div id="twMegaPanel" hidden class="mt-3 grid grid-cols-3 gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs ${r(e)}">
    <div class="rounded-lg bg-white p-2.5 font-semibold">分析ツール</div>
    <div class="rounded-lg bg-white p-2.5 font-semibold">デザイン図鑑</div>
    <div class="rounded-lg bg-white p-2.5 font-semibold">テンプレート集</div>
  </div>
</header>
<script>
(() => {
  const btn = document.getElementById('twMegaBtn');
  const panel = document.getElementById('twMegaPanel');
  if (!btn || !panel) return;
  btn.addEventListener('click', () => {
    const next = panel.hidden;
    panel.hidden = !next;
    btn.setAttribute('aria-expanded', String(next));
  });
})();
<\/script>`,"hdr-link-hover-grow":e=>`<!-- Tailwind CSS: Nav Link Scale & Color Lift -->
<nav class="flex gap-4 border-b border-zinc-200 bg-white px-5 py-3 text-xs font-semibold text-zinc-500">
  <a href="#a" class="${r(e)} hover:scale-105 hover:text-zinc-950">概要</a>
  <a href="#b" class="${r(e)} hover:scale-105 hover:text-zinc-950">特徴</a>
  <a href="#c" class="${r(e)} hover:scale-105 hover:text-zinc-950">料金</a>
</nav>`,"hdr-link-underline":e=>`<!-- Tailwind CSS + Safe JS: Active Bottom Underline -->
<nav id="twLineNav" class="flex gap-5 border-b border-zinc-200 bg-white px-5 py-3 text-xs font-semibold">
  <a href="#a" aria-current="page" class="border-b-2 border-blue-600 pb-1 text-zinc-950 ${r(e)}">特徴</a>
  <a href="#b" class="border-b-2 border-transparent pb-1 text-zinc-500 hover:text-zinc-900 ${r(e)}">事例</a>
</nav>
<script>
(() => {
  const links = document.querySelectorAll('#twLineNav a');
  links.forEach((el) => el.addEventListener('click', () => {
    links.forEach((a) => {
      const on = a === el;
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
      a.className = on
        ? 'border-b-2 border-blue-600 pb-1 text-zinc-950 ${r(e)}'
        : 'border-b-2 border-transparent pb-1 text-zinc-500 hover:text-zinc-900 ${r(e)}';
    });
  }));
})();
<\/script>`,"hdr-link-pill-active":e=>`<!-- Tailwind CSS + Safe JS: Segment Track Pill Header -->
<nav id="twPillNav" class="inline-flex gap-1 rounded-full bg-zinc-100 p-1 text-xs font-semibold">
  <a href="#a" aria-current="page" class="rounded-full bg-white px-3 py-1 text-zinc-900 shadow-2xs ${r(e)}">特徴</a>
  <a href="#b" class="rounded-full px-3 py-1 text-zinc-500 hover:text-zinc-900 ${r(e)}">料金</a>
</nav>
<script>
(() => {
  const links = document.querySelectorAll('#twPillNav a');
  links.forEach((el) => el.addEventListener('click', () => {
    links.forEach((a) => {
      const on = a === el;
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
      a.className = on
        ? 'rounded-full bg-white px-3 py-1 text-zinc-900 shadow-2xs ${r(e)}'
        : 'rounded-full px-3 py-1 text-zinc-500 hover:text-zinc-900 ${r(e)}';
    });
  }));
})();
<\/script>`,"hdr-announcement-two-tier":()=>`<!-- Tailwind CSS + Safe JS: Two-Tier Announcement + Main Nav -->
<div>
  <div id="twAnnBar" class="flex items-center justify-center gap-3 bg-zinc-900 px-4 py-1 text-[11px] font-medium text-white">
    <span>✨ v2.0 リリース：全100種を収録しました</span>
    <button id="twAnnClose" type="button" aria-label="告知を閉じる" class="rounded px-1 text-zinc-400 hover:text-white">✕</button>
  </div>
  <header class="flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-2.5 text-xs">
    <span class="font-extrabold text-zinc-900">KatakataLab</span>
    <nav class="flex gap-4 text-zinc-600"><a href="#a">一覧</a><a href="#b">FAQ</a></nav>
  </header>
</div>
<script>
(() => {
  const bar = document.getElementById('twAnnBar');
  const btn = document.getElementById('twAnnClose');
  if (bar && btn) btn.addEventListener('click', () => bar.remove());
})();
<\/script>`,"hdr-transparent-to-solid":e=>`<!-- Tailwind CSS + Safe JS: Transparent Over Hero → Solid Bar -->
<header id="twHeroBar" class="sticky top-0 z-40 flex items-center justify-between border-b border-transparent bg-transparent px-5 py-3 text-xs font-bold text-white ${r(e)}">
  <span>Brand</span><span>メニュー</span>
</header>
<script>
(() => {
  const bar = document.getElementById('twHeroBar');
  if (!bar) return;
  const sync = () => {
    const solid = window.scrollY > 36;
    bar.classList.toggle('bg-white/95', solid);
    bar.classList.toggle('text-zinc-900', solid);
    bar.classList.toggle('border-zinc-200', solid);
    bar.classList.toggle('bg-transparent', !solid);
    bar.classList.toggle('text-white', !solid);
  };
  window.addEventListener('scroll', sync, { passive: true });
})();
<\/script>`,"hdr-rail-sidebar":()=>`<!-- Tailwind CSS: Sticky 2-Pane Navigation Rail -->
<div class="grid min-h-[140px] grid-cols-[150px_1fr] overflow-hidden rounded-xl border border-zinc-200 bg-white">
  <aside class="border-r border-zinc-200 bg-zinc-50 p-3 text-xs">
    <div class="mb-2 font-bold text-zinc-900">カテゴリ</div>
    <ul class="space-y-1 text-zinc-600"><li class="rounded bg-blue-50 px-2 py-1 font-bold text-blue-700">01 文字</li><li class="px-2 py-1">02 出現</li></ul>
  </aside>
  <main class="p-4 text-xs text-zinc-600">メインコンテンツ領域</main>
</div>`,"hf-sitemap-footer":()=>`<!-- Tailwind CSS: 3-Column Sitemap Footer -->
<footer class="border-t border-zinc-200 bg-zinc-50 px-6 py-8 text-xs text-zinc-600">
  <div class="grid grid-cols-2 gap-6 md:grid-cols-3">
    <div><h4 class="mb-2 font-bold text-zinc-900">製品</h4><ul class="space-y-1"><li>特徴</li><li>料金</li></ul></div>
    <div><h4 class="mb-2 font-bold text-zinc-900">資料</h4><ul class="space-y-1"><li>導入ガイド</li><li>FAQ</li></ul></div>
    <div><h4 class="mb-2 font-bold text-zinc-900">規約</h4><ul class="space-y-1"><li>利用規約</li><li>プライバシー</li></ul></div>
  </div>
</footer>`,"hf-minimal-footer":()=>`<!-- Tailwind CSS: Single-Line Minimal Footer -->
<footer class="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-5 py-4 text-xs text-zinc-500">
  <span>© 2026 KatakataLab</span>
  <div class="flex gap-4"><a href="#terms" class="hover:text-zinc-900">規約</a><a href="#contact" class="hover:text-zinc-900">お問合せ</a></div>
</footer>`,"hf-curtain-reveal-footer":e=>`<!-- Tailwind CSS: Sticky Curtain Reveal Footer -->
<div class="relative z-10 bg-white p-6 shadow-sm ${r(e,`transition-transform`)}">メイン本文エリア（重なり z-10）</div>
<footer class="bg-zinc-950 px-6 py-8 text-xs text-zinc-300 md:sticky md:bottom-0 md:z-0">
  <p class="font-bold text-white">末尾に固定されたリビール・フッター</p>
</footer>`,"ftr-cta-docked":()=>`<!-- Tailwind CSS: Docked CTA Banner Footer -->
<footer class="border-t border-zinc-200 bg-zinc-950 p-6 text-white">
  <div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-zinc-900 p-5">
    <div><div class="text-sm font-bold">今すぐ使ってみませんか？</div><div class="text-xs text-zinc-400">全100種がすぐコピー可能</div></div>
    <a href="#start" class="rounded-full bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500">無料ではじめる</a>
  </div>
</footer>`,"ftr-giant-wordmark":()=>`<!-- Tailwind CSS: Oversized Footer Wordmark -->
<footer class="overflow-hidden border-t border-zinc-200 bg-white pt-6 text-center">
  <div class="text-xs text-zinc-400">© KatakataLab / はじっこぐらし</div>
  <div class="mt-2 select-none text-[13vw] leading-[0.82] font-black tracking-tighter text-zinc-900" aria-hidden="true">KATAKATALAB</div>
</footer>`,"ftr-newsletter-form":()=>`<!-- Tailwind CSS + Safe JS: Footer Newsletter Subscribe Row -->
<footer class="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 bg-zinc-50 px-5 py-5 text-xs">
  <span class="font-bold text-zinc-900">新着UIの更新を受け取る</span>
  <form id="twNewsForm" class="flex items-center gap-2">
    <input id="twNewsMail" type="email" required placeholder="you@example.com" class="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-500" />
    <button type="submit" class="rounded-lg bg-zinc-900 px-4 py-1.5 font-bold text-white hover:bg-zinc-700">登録</button>
    <span id="twNewsMsg" class="text-[11px] font-semibold text-emerald-700" role="status"></span>
  </form>
</footer>
<script>
(() => {
  const form = document.getElementById('twNewsForm');
  const mail = document.getElementById('twNewsMail');
  const msg = document.getElementById('twNewsMsg');
  if (!form || !mail || !msg) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!mail.value.includes('@')) return;
    msg.textContent = '✓ 登録を受け付けました';
    mail.value = '';
  });
})();
<\/script>`,"ftr-compact-utility":()=>`<!-- Tailwind CSS: Status Indicator & Language Switch Footer -->
<footer class="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-3 text-xs text-zinc-600">
  <span class="inline-flex items-center gap-1.5 font-medium"><span class="h-2 w-2 rounded-full bg-emerald-500"></span>All systems operational</span>
  <select aria-label="表示言語" class="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs">
    <option>日本語</option><option>English</option>
  </select>
</footer>`,"conv-pricing-static":()=>`<!-- Tailwind CSS: 3-Column Recommended Pricing Table -->
<div class="grid gap-4 md:grid-cols-3">
  <div class="rounded-2xl border border-zinc-200 bg-white p-5"><div class="text-xs font-bold">Starter</div><div class="mt-2 text-2xl font-extrabold">¥0</div></div>
  <div class="relative rounded-2xl border-2 border-blue-600 bg-white p-5 shadow-md"><span class="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white">人気</span><div class="mt-2 text-xs font-bold">Pro</div><div class="mt-1 text-2xl font-extrabold text-blue-700">¥1,980</div></div>
  <div class="rounded-2xl border border-zinc-200 bg-white p-5"><div class="text-xs font-bold">Team</div><div class="mt-2 text-2xl font-extrabold">¥4,800</div></div>
</div>`,"conv-billing-toggle":e=>`<!-- Tailwind CSS + Safe JS: Monthly / Annual Switch -->
<div class="space-y-3 text-center">
  <div id="twBillGroup" role="group" aria-label="請求間隔" class="inline-flex items-center gap-1 rounded-full bg-zinc-100 p-1 text-xs font-bold">
    <button type="button" data-mode="monthly" aria-pressed="true" class="rounded-full bg-white px-3 py-1 text-zinc-900 shadow-2xs ${r(e)}">月額</button>
    <button type="button" data-mode="yearly" aria-pressed="false" class="rounded-full px-3 py-1 text-zinc-600 ${r(e)}">年額 (20%OFF)</button>
  </div>
  <div id="twPriceOut" class="text-3xl font-extrabold tabular-nums text-zinc-900 ${r(e)}">¥1,200</div>
</div>
<script>
(() => {
  const grp = document.getElementById('twBillGroup');
  const out = document.getElementById('twPriceOut');
  if (!grp || !out) return;
  const btns = grp.querySelectorAll('button');
  btns.forEach((b) => b.addEventListener('click', () => {
    const yearly = b.dataset.mode === 'yearly';
    out.textContent = yearly ? '¥960' : '¥1,200';
    btns.forEach((x) => {
      const on = x === b;
      x.setAttribute('aria-pressed', String(on));
      x.className = on
        ? 'rounded-full bg-white px-3 py-1 text-zinc-900 shadow-2xs ${r(e)}'
        : 'rounded-full px-3 py-1 text-zinc-600 ${r(e)}';
    });
  }));
})();
<\/script>`,"price-matrix-table":()=>`<!-- Tailwind CSS + Safe JS: Comparison Matrix + Mobile Plan Tabs -->
<div class="max-w-md space-y-2">
  <table class="hidden w-full border-collapse text-xs sm:table">
    <thead><tr class="border-b border-zinc-200 text-zinc-500"><th scope="col" class="py-2 text-left">機能</th><th scope="col">無料</th><th scope="col" class="bg-blue-50/70 font-bold text-blue-700">Pro</th></tr></thead>
    <tbody class="divide-y divide-zinc-100"><tr><td class="py-2 font-medium">商用利用</td><td class="text-center">○</td><td class="bg-blue-50/70 text-center font-bold text-blue-700">◎ 優先</td></tr></tbody>
  </table>
  <div class="rounded-xl border border-zinc-200 bg-white p-3 text-center sm:hidden">
    <div id="twMatTabs" class="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 text-xs font-bold">
      <button type="button" data-spec="¥0 / 商用○" class="rounded bg-white py-1 text-blue-700">無料</button>
      <button type="button" data-spec="¥980 / 商用◎優先" class="rounded py-1 text-zinc-600">Pro</button>
    </div>
    <p id="twMatSpec" class="mt-2 text-xs text-zinc-700">¥0 / 商用○</p>
  </div>
</div>
<script>
(() => {
  const row = document.getElementById('twMatTabs');
  const spec = document.getElementById('twMatSpec');
  if (!row || !spec) return;
  row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    spec.textContent = b.dataset.spec || '';
  }));
})();
<\/script>`,"price-usage-estimator":e=>`<!-- Tailwind CSS + Safe JS: Seat Slider Price Calculator -->
<div class="max-w-xs space-y-2 rounded-xl border border-zinc-200 bg-white p-4">
  <div class="flex justify-between text-xs font-semibold"><span>人数: <strong id="twSeatN">5</strong>名</span><span id="twSeatTotal" class="font-extrabold text-blue-700 tabular-nums ${r(e)}">¥4,900/月</span></div>
  <input id="twSeatRange" type="range" min="1" max="20" value="5" class="w-full accent-blue-600" aria-label="人数" />
</div>
<script>
(() => {
  const rng = document.getElementById('twSeatRange');
  const nEl = document.getElementById('twSeatN');
  const totEl = document.getElementById('twSeatTotal');
  if (!rng || !nEl || !totEl) return;
  rng.addEventListener('input', () => {
    const n = Math.min(20, Math.max(1, Number(rng.value) || 1));
    nEl.textContent = String(n);
    totEl.textContent = '¥' + (n * (n >= 10 ? 780 : 980)).toLocaleString('ja-JP') + '/月';
  });
})();
<\/script>`,"price-trust-assurance":()=>`<!-- Tailwind CSS: Trust Microcopy & 1-Question FAQ -->
<div class="max-w-sm rounded-2xl border border-zinc-200 bg-white p-4">
  <button type="button" class="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700">14日間の無料トライアルを始める</button>
  <p class="mt-2 text-center text-[11px] text-zinc-500">✓ いつでも1クリック解約 • ✓ 請求前にお知らせ</p>
  <details class="mt-2.5 border-t border-zinc-100 pt-2 text-xs">
    <summary class="cursor-pointer font-semibold text-zinc-700">Q. 無料期間中に解約すると請求されますか？</summary>
    <p class="mt-1 text-[11px] text-zinc-500">いいえ。期間内にワンクリックで解約すれば請求は発生しません。</p>
  </details>
</div>`,"conv-submit-feedback":e=>`<!-- Tailwind CSS + Safe JS: Submit Loading to ✓ Success -->
<button id="twSubmitBtn" type="button" class="min-w-[160px] rounded-xl bg-zinc-900 px-5 py-2 text-xs font-bold text-white ${r(e)}">
  送信する
</button>
<script>
(() => {
  const btn = document.getElementById('twSubmitBtn');
  if (!btn) return;
  let timer = 0;
  btn.addEventListener('click', () => {
    clearTimeout(timer);
    btn.disabled = true;
    btn.textContent = '送信中...';
    timer = setTimeout(() => {
      btn.disabled = false;
      btn.className = 'min-w-[160px] rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white ${r(e)}';
      btn.textContent = '✓ 送信完了！';
    }, ${Math.max(400,Math.round(e.duration*1e3))});
  });
})();
<\/script>`,"conv-floating-label":e=>`<!-- Tailwind CSS: Peer Floating Label Input -->
<div class="relative max-w-xs">
  <input id="twFloatEmail" type="email" placeholder=" " class="peer w-full rounded-xl border border-zinc-300 bg-white px-3 pt-4 pb-1.5 text-xs outline-none focus:border-blue-600" />
  <label for="twFloatEmail" class="pointer-events-none absolute top-1 left-3 text-[10px] font-bold text-blue-600 ${r(e)} peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-normal peer-placeholder-shown:text-zinc-400 peer-focus:top-1 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-blue-600">メールアドレス</label>
</div>`,"conv-read-more":e=>`<!-- Tailwind CSS + Safe JS: Gradient Mask Read More Expand -->
<div class="max-w-sm space-y-2 rounded-xl border border-zinc-200 bg-white p-4">
  <div id="twMoreBody" class="max-h-14 overflow-hidden text-xs leading-relaxed text-zinc-600 ${r(e)}">長文の説明を最初はコンパクトに折りたたみ、興味を持った人がクリックした時だけ全文を展開します。</div>
  <button id="twMoreBtn" type="button" aria-expanded="false" class="text-xs font-bold text-blue-600">続きを読む ▾</button>
</div>
<script>
(() => {
  const body = document.getElementById('twMoreBody');
  const btn = document.getElementById('twMoreBtn');
  if (!body || !btn) return;
  btn.addEventListener('click', () => {
    const open = body.classList.toggle('max-h-14') === false;
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? '閉じる ▴' : '続きを読む ▾';
  });
})();
<\/script>`,"form-validation-shake":e=>`<!-- Tailwind CSS + Safe JS: Input Error + Immediate Guidance -->
<form id="twValForm" class="max-w-xs space-y-1.5">
  <div class="flex gap-2">
    <input id="twValIn" type="text" placeholder="name@example.com" aria-invalid="false" class="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs outline-none ${r(e)}" />
    <button type="submit" class="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white">確認</button>
  </div>
  <p id="twValErr" role="alert" hidden class="text-[11px] font-semibold text-rose-600">@を含む正しい形式で入力してください</p>
</form>
<script>
(() => {
  const form = document.getElementById('twValForm');
  const inp = document.getElementById('twValIn');
  const err = document.getElementById('twValErr');
  if (!form || !inp || !err) return;
  inp.addEventListener('input', () => { err.hidden = true; inp.setAttribute('aria-invalid', 'false'); inp.classList.remove('border-rose-500', 'bg-rose-50'); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(inp.value.trim());
    err.hidden = ok;
    inp.setAttribute('aria-invalid', String(!ok));
    inp.classList.toggle('border-rose-500', !ok);
    inp.classList.toggle('bg-rose-50', !ok);
  });
})();
<\/script>`,"form-password-strength":e=>`<!-- Tailwind CSS + Safe JS: Password Strength Bar -->
<div class="max-w-xs space-y-1.5">
  <input id="twPw" type="password" placeholder="パスワードを入力" class="w-full rounded-xl border border-zinc-300 px-3 py-1.5 text-xs outline-none focus:border-blue-500" />
  <div class="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200"><div id="twPwBar" class="h-full w-0 bg-rose-500 ${r(e)}"></div></div>
  <small id="twPwLbl" class="block text-[11px] text-zinc-500">未入力</small>
</div>
<script>
(() => {
  const pw = document.getElementById('twPw');
  const bar = document.getElementById('twPwBar');
  const lbl = document.getElementById('twPwLbl');
  if (!pw || !bar || !lbl) return;
  pw.addEventListener('input', () => {
    const v = pw.value;
    let s = 0;
    if (v.length >= 6) s++;
    if (/[0-9]/.test(v) && /[a-zA-Z]/.test(v)) s++;
    if (v.length >= 10 && /[^a-zA-Z0-9]/.test(v)) s++;
    if (v && s === 0) s = 1;
    bar.className = 'h-full ${r(e)} ' + ['w-0', 'w-1/3 bg-rose-500', 'w-2/3 bg-amber-500', 'w-full bg-emerald-500'][s];
    lbl.textContent = ['未入力', '弱い（6文字以上推奨）', 'まずまず（記号も追加）', '安全（十分な強度）'][s];
  });
})();
<\/script>`,"form-step-progress":e=>`<!-- Tailwind CSS + Safe JS: Multi-Step Progress Header -->
<div class="max-w-sm space-y-2">
  <div class="flex items-center justify-between text-[11px] font-bold text-zinc-700">
    <span id="twStepTxt">ステップ 1 / 3</span>
    <span id="twStepPct" class="text-blue-600">33%</span>
  </div>
  <div class="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200"><div id="twStepBar" class="h-full w-1/3 rounded-full bg-blue-600 ${r(e)}"></div></div>
  <div class="flex gap-2">
    <button id="twStepPrev" type="button" class="rounded border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold">戻る</button>
    <button id="twStepNext" type="button" class="rounded bg-zinc-900 px-2.5 py-1 text-[11px] font-bold text-white">次へ</button>
  </div>
</div>
<script>
(() => {
  const txt = document.getElementById('twStepTxt');
  const pct = document.getElementById('twStepPct');
  const bar = document.getElementById('twStepBar');
  const prev = document.getElementById('twStepPrev');
  const next = document.getElementById('twStepNext');
  if (!txt || !pct || !bar || !prev || !next) return;
  let step = 1;
  const sync = () => {
    const p = Math.round((step / 3) * 100);
    txt.textContent = \`ステップ \${step} / 3\`;
    pct.textContent = p + '%';
    bar.style.width = p + '%';
  };
  prev.addEventListener('click', () => { step = Math.max(1, step - 1); sync(); });
  next.addEventListener('click', () => { step = Math.min(3, step + 1); sync(); });
})();
<\/script>`,"form-file-dropzone":e=>`<!-- Tailwind CSS + Safe JS: Interactive File Dropzone -->
<label id="twDropZone" class="flex max-w-sm cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-5 text-center text-xs text-zinc-600 hover:border-blue-400 hover:bg-blue-50/50 ${r(e)}">
  <input id="twDropInput" type="file" class="sr-only" />
  <span id="twDropLabel" class="font-bold text-zinc-800">ファイルをドロップまたはクリックして選択</span>
  <span class="mt-0.5 text-[11px] text-zinc-400">PNG / SVG / PDF 対応</span>
</label>
<script>
(() => {
  const z = document.getElementById('twDropZone');
  const inp = document.getElementById('twDropInput');
  const lbl = document.getElementById('twDropLabel');
  if (!z || !inp || !lbl) return;
  z.addEventListener('dragover', (e) => { e.preventDefault(); z.classList.add('border-blue-500', 'bg-blue-50'); });
  z.addEventListener('dragleave', () => z.classList.remove('border-blue-500', 'bg-blue-50'));
  z.addEventListener('drop', (e) => {
    e.preventDefault(); z.classList.remove('border-blue-500', 'bg-blue-50');
    const file = e.dataTransfer && e.dataTransfer.files[0];
    if (file) lbl.textContent = '添付済み：' + file.name;
  });
  inp.addEventListener('change', () => { if (inp.files && inp.files[0]) lbl.textContent = '添付済み：' + inp.files[0].name; });
})();
<\/script>`,"conv-back-to-top":e=>`<!-- Tailwind CSS + Safe JS: Back-to-Top Floating Pill -->
<button id="twTopPill" type="button" class="fixed right-5 bottom-5 rounded-full bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white shadow-lg opacity-0 pointer-events-none translate-y-2 data-[show=true]:opacity-100 data-[show=true]:pointer-events-auto data-[show=true]:translate-y-0 ${r(e)}">↑ TOPへ戻る</button>
<script>
(() => {
  const btn = document.getElementById('twTopPill');
  if (!btn) return;
  const sync = () => { btn.dataset.show = String(window.scrollY > 220); };
  window.addEventListener('scroll', sync, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();
<\/script>`,"guide-btt-minimal-arrow":e=>`<!-- Tailwind CSS + Safe JS: Minimal Floating Arrow Up Button -->
<button id="twMinTop" type="button" aria-label="先頭へ戻る" class="fixed right-5 bottom-5 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-sm font-bold text-zinc-900 shadow-md opacity-0 pointer-events-none translate-y-2 data-[show=true]:opacity-100 data-[show=true]:pointer-events-auto data-[show=true]:translate-y-0 ${r(e)}">↑</button>
<script>
(() => {
  const btn = document.getElementById('twMinTop');
  if (!btn) return;
  const sync = () => { btn.dataset.show = String(window.scrollY > 240); };
  window.addEventListener('scroll', sync, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();
<\/script>`,"guide-btt-progress-ring":e=>`<!-- Tailwind CSS + Safe JS: Scroll-Progress Circular Back-to-Top -->
<button id="twRingTop" type="button" aria-label="先頭へ戻る" class="fixed right-5 bottom-5 grid h-11 w-11 place-items-center rounded-full bg-white shadow-md opacity-0 pointer-events-none data-[show=true]:opacity-100 data-[show=true]:pointer-events-auto ${r(e)}">
  <svg width="44" height="44" viewBox="0 0 40 40" class="-rotate-90" aria-hidden="true">
    <circle cx="20" cy="20" r="16" fill="none" stroke="#e4e4e7" stroke-width="2.5" />
    <circle id="twRingArc" cx="20" cy="20" r="16" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="100.53" stroke-dashoffset="100.53" stroke-linecap="round" />
  </svg>
  <span class="absolute text-xs font-extrabold text-zinc-900">↑</span>
</button>
<script>
(() => {
  const btn = document.getElementById('twRingTop');
  const arc = document.getElementById('twRingArc');
  if (!btn || !arc) return;
  const c = 2 * Math.PI * 16;
  const sync = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pct = Math.min(1, Math.max(0, window.scrollY / max));
    arc.style.strokeDashoffset = (c * (1 - pct)).toFixed(2);
    btn.dataset.show = String(window.scrollY > 180);
  };
  window.addEventListener('scroll', sync, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();
<\/script>`,"guide-btt-static-footer":()=>`<!-- Tailwind CSS: Non-Floating Static Footer Anchor -->
<footer class="flex items-center justify-between border-t border-zinc-200 px-5 py-4 text-xs text-zinc-500">
  <span>© KatakataLab</span>
  <a href="#top" class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-bold text-zinc-700 hover:bg-zinc-50">↑ 先頭へ戻る</a>
</footer>`,"guide-dismissible-banner":e=>`<!-- Tailwind CSS + Safe JS: Dismissible Top Notice Banner -->
<div id="twNoticeBar" class="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-900 ${r(e)}">
  <span class="truncate">新機能が追加されました！詳細はガイドをご覧ください。</span>
  <button id="twNoticeClose" type="button" aria-label="閉じる" class="shrink-0 rounded p-1 font-bold text-blue-700 hover:bg-blue-100">✕</button>
</div>
<script>
(() => {
  const bar = document.getElementById('twNoticeBar');
  const btn = document.getElementById('twNoticeClose');
  if (!bar || !btn) return;
  btn.addEventListener('click', () => {
    bar.classList.add('opacity-0', '-translate-y-1');
    setTimeout(() => bar.remove(), ${Math.max(150,Math.round(e.duration*1e3))});
  });
})();
<\/script>`,"guide-tooltip-popover":e=>`<!-- Tailwind CSS + Safe JS: Hover / Focus / Click Accessible Tooltip -->
<span class="group relative inline-flex items-center">
  <button id="twTipBtn" type="button" aria-expanded="false" aria-describedby="twTip1" class="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300 text-[11px] font-bold text-zinc-600">?</button>
  <span id="twTip1" role="tooltip" data-open="false" class="pointer-events-none absolute bottom-full left-1/2 mb-1.5 w-48 -translate-x-1/2 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-md group-hover:opacity-100 group-focus-within:opacity-100 data-[open=true]:opacity-100 ${r(e)}">補足説明をここに短く添えます。</span>
</span>
<script>
(() => {
  const btn = document.getElementById('twTipBtn');
  const tip = document.getElementById('twTip1');
  if (!btn || !tip) return;
  btn.addEventListener('click', () => {
    const on = tip.dataset.open !== 'true';
    tip.dataset.open = String(on);
    btn.setAttribute('aria-expanded', String(on));
  });
})();
<\/script>`,"guide-empty-state":()=>`<!-- Tailwind CSS: Helpful Empty State Card -->
<div class="flex max-w-sm flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/70 p-6 text-center">
  <div class="text-sm font-bold text-zinc-900">まだ項目がありません</div>
  <p class="mt-1 text-xs text-zinc-500">よく使う動きを保存するとここに追加されます。</p>
  <button type="button" class="mt-3 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-bold text-white">一覧を見る</button>
</div>`,"guide-pagination-vs-more":e=>`<!-- Tailwind CSS + Safe JS: Numbered Pagination + Load More -->
<div class="max-w-xs space-y-2.5">
  <nav id="twPager" class="inline-flex items-center gap-1" aria-label="ページ送り">
    <button type="button" aria-current="page" class="h-8 w-8 rounded-lg bg-zinc-900 text-xs font-bold text-white ${r(e)}">1</button>
    <button type="button" class="h-8 w-8 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 ${r(e)}">2</button>
    <button type="button" class="h-8 w-8 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 ${r(e)}">3</button>
  </nav>
  <button id="twLoadMore" type="button" class="block w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 ${r(e)}">＋ もっと見る（2/6件）</button>
</div>
<script>
(() => {
  const nav = document.getElementById('twPager');
  const more = document.getElementById('twLoadMore');
  if (nav) {
    const btns = nav.querySelectorAll('button');
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => {
        const on = x === b;
        on ? x.setAttribute('aria-current', 'page') : x.removeAttribute('aria-current');
        x.className = on
          ? 'h-8 w-8 rounded-lg bg-zinc-900 text-xs font-bold text-white ${r(e)}'
          : 'h-8 w-8 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 ${r(e)}';
      });
    }));
  }
  if (more) {
    let n = 2;
    more.addEventListener('click', () => {
      n = n >= 6 ? 2 : n + 2;
      more.textContent = n >= 6 ? '✓ 全6件を表示中（戻す）' : \`＋ もっと見る（\${n}/6件）\`;
    });
  }
})();
<\/script>`,"guide-inline-confirm":e=>`<!-- Tailwind CSS + Safe JS: Modal-free Inline 2-Step Confirm -->
<div id="twInlineBox" class="inline-flex min-h-9 items-center gap-2"></div>
<script>
(() => {
  const box = document.getElementById('twInlineBox');
  if (!box) return;
  const idle = () => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 ${r(e)}';
    b.textContent = '削除する';
    b.onclick = ask;
    box.replaceChildren(b);
  };
  const ask = () => {
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white ${r(e)}';
    ok.textContent = 'はい、削除する';
    ok.onclick = () => { box.textContent = '✓ 削除しました'; };
    const no = document.createElement('button');
    no.type = 'button';
    no.className = 'rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 ${r(e)}';
    no.textContent = '戻る';
    no.onclick = idle;
    box.replaceChildren(ok, no);
  };
  idle();
})();
<\/script>`},s={...i,...a,...o};function c(e,t){let n=s[e.id];return n?n(t):`<!-- ${e.title} (Tailwind CSS Fallback) -->\n${e.buildCode(t)}`}export{s as TAILWIND_REGISTRY,c as renderTailwindCode};