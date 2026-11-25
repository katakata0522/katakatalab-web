import { TailwindBuilder, twTransition } from './tailwindHelpers';

export const TAILWIND_PART_3: Record<string, TailwindBuilder> = {
  // === 09. Header (10) ===
  'hf-classic-header': () => `<!-- Tailwind CSS: Classic 3-Column Header -->
<header class="flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-3">
  <a href="#top" class="text-sm font-extrabold text-zinc-900">BrandLogo</a>
  <nav class="hidden gap-6 text-xs font-medium text-zinc-600 md:flex">
    <a href="#features" class="hover:text-zinc-900">特徴</a>
    <a href="#pricing" class="hover:text-zinc-900">料金</a>
    <a href="#faq" class="hover:text-zinc-900">FAQ</a>
  </nav>
  <a href="#start" class="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-zinc-700">はじめる</a>
</header>`,

  'hf-centered-brand': () => `<!-- Tailwind CSS: Centered Wordmark Header -->
<header class="grid grid-cols-3 items-center border-b border-zinc-200 bg-white px-5 py-3 text-xs font-medium text-zinc-600">
  <div class="flex gap-4"><a href="#shop">Shop</a><a href="#journal">Journal</a></div>
  <a href="#top" class="text-center font-serif text-base font-bold tracking-widest text-zinc-900">ATELIER</a>
  <div class="flex justify-end gap-4"><a href="#search">Search</a><a href="#cart">Cart</a></div>
</header>`,

  'hf-floating-pill': (p) => `<!-- Tailwind CSS + Safe JS: Floating Pill Smart Header -->
<header id="twFloatPill" class="sticky top-3 z-40 mx-auto flex max-w-xl items-center justify-between rounded-full border border-zinc-200/80 bg-white/90 px-4 py-2 shadow-sm backdrop-blur ${twTransition(p)}">
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
</script>`,

  'hf-mega-menu': (p) => `<!-- Tailwind CSS + Safe JS: Expandable Mega Menu Header -->
<header class="relative border-b border-zinc-200 bg-white px-5 py-3">
  <div class="flex items-center justify-between">
    <span class="text-sm font-bold text-zinc-900">Product</span>
    <button id="twMegaBtn" type="button" aria-expanded="false" class="text-xs font-semibold text-blue-600">製品一覧 ▾</button>
  </div>
  <div id="twMegaPanel" hidden class="mt-3 grid grid-cols-3 gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs ${twTransition(p)}">
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
</script>`,

  'hdr-link-hover-grow': (p) => `<!-- Tailwind CSS: Nav Link Scale & Color Lift -->
<nav class="flex gap-4 border-b border-zinc-200 bg-white px-5 py-3 text-xs font-semibold text-zinc-500">
  <a href="#a" class="${twTransition(p)} hover:scale-105 hover:text-zinc-950">概要</a>
  <a href="#b" class="${twTransition(p)} hover:scale-105 hover:text-zinc-950">特徴</a>
  <a href="#c" class="${twTransition(p)} hover:scale-105 hover:text-zinc-950">料金</a>
</nav>`,

  'hdr-link-underline': (p) => `<!-- Tailwind CSS + Safe JS: Active Bottom Underline -->
<nav id="twLineNav" class="flex gap-5 border-b border-zinc-200 bg-white px-5 py-3 text-xs font-semibold">
  <a href="#a" aria-current="page" class="border-b-2 border-blue-600 pb-1 text-zinc-950 ${twTransition(p)}">特徴</a>
  <a href="#b" class="border-b-2 border-transparent pb-1 text-zinc-500 hover:text-zinc-900 ${twTransition(p)}">事例</a>
</nav>
<script>
(() => {
  const links = document.querySelectorAll('#twLineNav a');
  links.forEach((el) => el.addEventListener('click', () => {
    links.forEach((a) => {
      const on = a === el;
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
      a.className = on
        ? 'border-b-2 border-blue-600 pb-1 text-zinc-950 ${twTransition(p)}'
        : 'border-b-2 border-transparent pb-1 text-zinc-500 hover:text-zinc-900 ${twTransition(p)}';
    });
  }));
})();
</script>`,

  'hdr-link-pill-active': (p) => `<!-- Tailwind CSS + Safe JS: Segment Track Pill Header -->
<nav id="twPillNav" class="inline-flex gap-1 rounded-full bg-zinc-100 p-1 text-xs font-semibold">
  <a href="#a" aria-current="page" class="rounded-full bg-white px-3 py-1 text-zinc-900 shadow-2xs ${twTransition(p)}">特徴</a>
  <a href="#b" class="rounded-full px-3 py-1 text-zinc-500 hover:text-zinc-900 ${twTransition(p)}">料金</a>
</nav>
<script>
(() => {
  const links = document.querySelectorAll('#twPillNav a');
  links.forEach((el) => el.addEventListener('click', () => {
    links.forEach((a) => {
      const on = a === el;
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
      a.className = on
        ? 'rounded-full bg-white px-3 py-1 text-zinc-900 shadow-2xs ${twTransition(p)}'
        : 'rounded-full px-3 py-1 text-zinc-500 hover:text-zinc-900 ${twTransition(p)}';
    });
  }));
})();
</script>`,

  'hdr-announcement-two-tier': () => `<!-- Tailwind CSS + Safe JS: Two-Tier Announcement + Main Nav -->
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
</script>`,

  'hdr-transparent-to-solid': (p) => `<!-- Tailwind CSS + Safe JS: Transparent Over Hero → Solid Bar -->
<header id="twHeroBar" class="sticky top-0 z-40 flex items-center justify-between border-b border-transparent bg-transparent px-5 py-3 text-xs font-bold text-white ${twTransition(p)}">
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
</script>`,

  'hdr-rail-sidebar': () => `<!-- Tailwind CSS: Sticky 2-Pane Navigation Rail -->
<div class="grid min-h-[140px] grid-cols-[150px_1fr] overflow-hidden rounded-xl border border-zinc-200 bg-white">
  <aside class="border-r border-zinc-200 bg-zinc-50 p-3 text-xs">
    <div class="mb-2 font-bold text-zinc-900">カテゴリ</div>
    <ul class="space-y-1 text-zinc-600"><li class="rounded bg-blue-50 px-2 py-1 font-bold text-blue-700">01 文字</li><li class="px-2 py-1">02 出現</li></ul>
  </aside>
  <main class="p-4 text-xs text-zinc-600">メインコンテンツ領域</main>
</div>`,

  // === 10. Footer (7) ===
  'hf-sitemap-footer': () => `<!-- Tailwind CSS: 3-Column Sitemap Footer -->
<footer class="border-t border-zinc-200 bg-zinc-50 px-6 py-8 text-xs text-zinc-600">
  <div class="grid grid-cols-2 gap-6 md:grid-cols-3">
    <div><h4 class="mb-2 font-bold text-zinc-900">製品</h4><ul class="space-y-1"><li>特徴</li><li>料金</li></ul></div>
    <div><h4 class="mb-2 font-bold text-zinc-900">資料</h4><ul class="space-y-1"><li>導入ガイド</li><li>FAQ</li></ul></div>
    <div><h4 class="mb-2 font-bold text-zinc-900">規約</h4><ul class="space-y-1"><li>利用規約</li><li>プライバシー</li></ul></div>
  </div>
</footer>`,

  'hf-minimal-footer': () => `<!-- Tailwind CSS: Single-Line Minimal Footer -->
<footer class="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-5 py-4 text-xs text-zinc-500">
  <span>© 2026 KatakataLab</span>
  <div class="flex gap-4"><a href="#terms" class="hover:text-zinc-900">規約</a><a href="#contact" class="hover:text-zinc-900">お問合せ</a></div>
</footer>`,

  'hf-curtain-reveal-footer': (p) => `<!-- Tailwind CSS: Sticky Curtain Reveal Footer -->
<div class="relative z-10 bg-white p-6 shadow-sm ${twTransition(p, 'transition-transform')}">メイン本文エリア（重なり z-10）</div>
<footer class="bg-zinc-950 px-6 py-8 text-xs text-zinc-300 md:sticky md:bottom-0 md:z-0">
  <p class="font-bold text-white">末尾に固定されたリビール・フッター</p>
</footer>`,

  'ftr-cta-docked': () => `<!-- Tailwind CSS: Docked CTA Banner Footer -->
<footer class="border-t border-zinc-200 bg-zinc-950 p-6 text-white">
  <div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-zinc-900 p-5">
    <div><div class="text-sm font-bold">今すぐ使ってみませんか？</div><div class="text-xs text-zinc-400">全100種がすぐコピー可能</div></div>
    <a href="#start" class="rounded-full bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500">無料ではじめる</a>
  </div>
</footer>`,

  'ftr-giant-wordmark': () => `<!-- Tailwind CSS: Oversized Footer Wordmark -->
<footer class="overflow-hidden border-t border-zinc-200 bg-white pt-6 text-center">
  <div class="text-xs text-zinc-400">© KatakataLab / はじっこぐらし</div>
  <div class="mt-2 select-none text-[13vw] leading-[0.82] font-black tracking-tighter text-zinc-900" aria-hidden="true">KATAKATALAB</div>
</footer>`,

  'ftr-newsletter-form': () => `<!-- Tailwind CSS + Safe JS: Footer Newsletter Subscribe Row -->
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
</script>`,

  'ftr-compact-utility': () => `<!-- Tailwind CSS: Status Indicator & Language Switch Footer -->
<footer class="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-3 text-xs text-zinc-600">
  <span class="inline-flex items-center gap-1.5 font-medium"><span class="h-2 w-2 rounded-full bg-emerald-500"></span>All systems operational</span>
  <select aria-label="表示言語" class="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs">
    <option>日本語</option><option>English</option>
  </select>
</footer>`,

  // === 11. Pricing & Plans (5) ===
  'conv-pricing-static': () => `<!-- Tailwind CSS: 3-Column Recommended Pricing Table -->
<div class="grid gap-4 md:grid-cols-3">
  <div class="rounded-2xl border border-zinc-200 bg-white p-5"><div class="text-xs font-bold">Starter</div><div class="mt-2 text-2xl font-extrabold">¥0</div></div>
  <div class="relative rounded-2xl border-2 border-blue-600 bg-white p-5 shadow-md"><span class="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white">人気</span><div class="mt-2 text-xs font-bold">Pro</div><div class="mt-1 text-2xl font-extrabold text-blue-700">¥1,980</div></div>
  <div class="rounded-2xl border border-zinc-200 bg-white p-5"><div class="text-xs font-bold">Team</div><div class="mt-2 text-2xl font-extrabold">¥4,800</div></div>
</div>`,

  'conv-billing-toggle': (p) => `<!-- Tailwind CSS + Safe JS: Monthly / Annual Switch -->
<div class="space-y-3 text-center">
  <div id="twBillGroup" role="group" aria-label="請求間隔" class="inline-flex items-center gap-1 rounded-full bg-zinc-100 p-1 text-xs font-bold">
    <button type="button" data-mode="monthly" aria-pressed="true" class="rounded-full bg-white px-3 py-1 text-zinc-900 shadow-2xs ${twTransition(p)}">月額</button>
    <button type="button" data-mode="yearly" aria-pressed="false" class="rounded-full px-3 py-1 text-zinc-600 ${twTransition(p)}">年額 (20%OFF)</button>
  </div>
  <div id="twPriceOut" class="text-3xl font-extrabold tabular-nums text-zinc-900 ${twTransition(p)}">¥1,200</div>
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
        ? 'rounded-full bg-white px-3 py-1 text-zinc-900 shadow-2xs ${twTransition(p)}'
        : 'rounded-full px-3 py-1 text-zinc-600 ${twTransition(p)}';
    });
  }));
})();
</script>`,

  'price-matrix-table': () => `<!-- Tailwind CSS + Safe JS: Comparison Matrix + Mobile Plan Tabs -->
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
</script>`,

  'price-usage-estimator': (p) => `<!-- Tailwind CSS + Safe JS: Seat Slider Price Calculator -->
<div class="max-w-xs space-y-2 rounded-xl border border-zinc-200 bg-white p-4">
  <div class="flex justify-between text-xs font-semibold"><span>人数: <strong id="twSeatN">5</strong>名</span><span id="twSeatTotal" class="font-extrabold text-blue-700 tabular-nums ${twTransition(p)}">¥4,900/月</span></div>
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
</script>`,

  'price-trust-assurance': () => `<!-- Tailwind CSS: Trust Microcopy & 1-Question FAQ -->
<div class="max-w-sm rounded-2xl border border-zinc-200 bg-white p-4">
  <button type="button" class="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700">14日間の無料トライアルを始める</button>
  <p class="mt-2 text-center text-[11px] text-zinc-500">✓ いつでも1クリック解約 • ✓ 請求前にお知らせ</p>
  <details class="mt-2.5 border-t border-zinc-100 pt-2 text-xs">
    <summary class="cursor-pointer font-semibold text-zinc-700">Q. 無料期間中に解約すると請求されますか？</summary>
    <p class="mt-1 text-[11px] text-zinc-500">いいえ。期間内にワンクリックで解約すれば請求は発生しません。</p>
  </details>
</div>`,

  // === 12. Forms & Feedback (7) ===
  'conv-submit-feedback': (p) => `<!-- Tailwind CSS + Safe JS: Submit Loading to ✓ Success -->
<button id="twSubmitBtn" type="button" class="min-w-[160px] rounded-xl bg-zinc-900 px-5 py-2 text-xs font-bold text-white ${twTransition(p)}">
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
      btn.className = 'min-w-[160px] rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white ${twTransition(p)}';
      btn.textContent = '✓ 送信完了！';
    }, ${Math.max(400, Math.round(p.duration * 1000))});
  });
})();
</script>`,

  'conv-floating-label': (p) => `<!-- Tailwind CSS: Peer Floating Label Input -->
<div class="relative max-w-xs">
  <input id="twFloatEmail" type="email" placeholder=" " class="peer w-full rounded-xl border border-zinc-300 bg-white px-3 pt-4 pb-1.5 text-xs outline-none focus:border-blue-600" />
  <label for="twFloatEmail" class="pointer-events-none absolute top-1 left-3 text-[10px] font-bold text-blue-600 ${twTransition(p)} peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-normal peer-placeholder-shown:text-zinc-400 peer-focus:top-1 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-blue-600">メールアドレス</label>
</div>`,

  'conv-read-more': (p) => `<!-- Tailwind CSS + Safe JS: Gradient Mask Read More Expand -->
<div class="max-w-sm space-y-2 rounded-xl border border-zinc-200 bg-white p-4">
  <div id="twMoreBody" class="max-h-14 overflow-hidden text-xs leading-relaxed text-zinc-600 ${twTransition(p)}">長文の説明を最初はコンパクトに折りたたみ、興味を持った人がクリックした時だけ全文を展開します。</div>
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
</script>`,

  'form-validation-shake': (p) => `<!-- Tailwind CSS + Safe JS: Input Error + Immediate Guidance -->
<form id="twValForm" class="max-w-xs space-y-1.5">
  <div class="flex gap-2">
    <input id="twValIn" type="text" placeholder="name@example.com" aria-invalid="false" class="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs outline-none ${twTransition(p)}" />
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
</script>`,

  'form-password-strength': (p) => `<!-- Tailwind CSS + Safe JS: Password Strength Bar -->
<div class="max-w-xs space-y-1.5">
  <input id="twPw" type="password" placeholder="パスワードを入力" class="w-full rounded-xl border border-zinc-300 px-3 py-1.5 text-xs outline-none focus:border-blue-500" />
  <div class="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200"><div id="twPwBar" class="h-full w-0 bg-rose-500 ${twTransition(p)}"></div></div>
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
    bar.className = 'h-full ${twTransition(p)} ' + ['w-0', 'w-1/3 bg-rose-500', 'w-2/3 bg-amber-500', 'w-full bg-emerald-500'][s];
    lbl.textContent = ['未入力', '弱い（6文字以上推奨）', 'まずまず（記号も追加）', '安全（十分な強度）'][s];
  });
})();
</script>`,

  'form-step-progress': (p) => `<!-- Tailwind CSS + Safe JS: Multi-Step Progress Header -->
<div class="max-w-sm space-y-2">
  <div class="flex items-center justify-between text-[11px] font-bold text-zinc-700">
    <span id="twStepTxt">ステップ 1 / 3</span>
    <span id="twStepPct" class="text-blue-600">33%</span>
  </div>
  <div class="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200"><div id="twStepBar" class="h-full w-1/3 rounded-full bg-blue-600 ${twTransition(p)}"></div></div>
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
</script>`,

  'form-file-dropzone': (p) => `<!-- Tailwind CSS + Safe JS: Interactive File Dropzone -->
<label id="twDropZone" class="flex max-w-sm cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-5 text-center text-xs text-zinc-600 hover:border-blue-400 hover:bg-blue-50/50 ${twTransition(p)}">
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
</script>`,

  // === 13. Guides & Navigation Helpers (10) ===
  'conv-back-to-top': (p) => `<!-- Tailwind CSS + Safe JS: Back-to-Top Floating Pill -->
<button id="twTopPill" type="button" class="fixed right-5 bottom-5 rounded-full bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white shadow-lg opacity-0 pointer-events-none translate-y-2 data-[show=true]:opacity-100 data-[show=true]:pointer-events-auto data-[show=true]:translate-y-0 ${twTransition(p)}">↑ TOPへ戻る</button>
<script>
(() => {
  const btn = document.getElementById('twTopPill');
  if (!btn) return;
  const sync = () => { btn.dataset.show = String(window.scrollY > 220); };
  window.addEventListener('scroll', sync, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();
</script>`,

  'guide-btt-minimal-arrow': (p) => `<!-- Tailwind CSS + Safe JS: Minimal Floating Arrow Up Button -->
<button id="twMinTop" type="button" aria-label="先頭へ戻る" class="fixed right-5 bottom-5 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-sm font-bold text-zinc-900 shadow-md opacity-0 pointer-events-none translate-y-2 data-[show=true]:opacity-100 data-[show=true]:pointer-events-auto data-[show=true]:translate-y-0 ${twTransition(p)}">↑</button>
<script>
(() => {
  const btn = document.getElementById('twMinTop');
  if (!btn) return;
  const sync = () => { btn.dataset.show = String(window.scrollY > 240); };
  window.addEventListener('scroll', sync, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();
</script>`,

  'guide-btt-progress-ring': (p) => `<!-- Tailwind CSS + Safe JS: Scroll-Progress Circular Back-to-Top -->
<button id="twRingTop" type="button" aria-label="先頭へ戻る" class="fixed right-5 bottom-5 grid h-11 w-11 place-items-center rounded-full bg-white shadow-md opacity-0 pointer-events-none data-[show=true]:opacity-100 data-[show=true]:pointer-events-auto ${twTransition(p)}">
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
</script>`,

  'guide-btt-static-footer': () => `<!-- Tailwind CSS: Non-Floating Static Footer Anchor -->
<footer class="flex items-center justify-between border-t border-zinc-200 px-5 py-4 text-xs text-zinc-500">
  <span>© KatakataLab</span>
  <a href="#top" class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-bold text-zinc-700 hover:bg-zinc-50">↑ 先頭へ戻る</a>
</footer>`,

  'guide-dismissible-banner': (p) => `<!-- Tailwind CSS + Safe JS: Dismissible Top Notice Banner -->
<div id="twNoticeBar" class="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-900 ${twTransition(p)}">
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
    setTimeout(() => bar.remove(), ${Math.max(150, Math.round(p.duration * 1000))});
  });
})();
</script>`,

  'guide-tooltip-popover': (p) => `<!-- Tailwind CSS + Safe JS: Hover / Focus / Click Accessible Tooltip -->
<span class="group relative inline-flex items-center">
  <button id="twTipBtn" type="button" aria-expanded="false" aria-describedby="twTip1" class="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300 text-[11px] font-bold text-zinc-600">?</button>
  <span id="twTip1" role="tooltip" data-open="false" class="pointer-events-none absolute bottom-full left-1/2 mb-1.5 w-48 -translate-x-1/2 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-md group-hover:opacity-100 group-focus-within:opacity-100 data-[open=true]:opacity-100 ${twTransition(p)}">補足説明をここに短く添えます。</span>
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
</script>`,

  'guide-empty-state': () => `<!-- Tailwind CSS: Helpful Empty State Card -->
<div class="flex max-w-sm flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/70 p-6 text-center">
  <div class="text-sm font-bold text-zinc-900">まだ項目がありません</div>
  <p class="mt-1 text-xs text-zinc-500">よく使う動きを保存するとここに追加されます。</p>
  <button type="button" class="mt-3 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-bold text-white">一覧を見る</button>
</div>`,

  'guide-pagination-vs-more': (p) => `<!-- Tailwind CSS + Safe JS: Numbered Pagination + Load More -->
<div class="max-w-xs space-y-2.5">
  <nav id="twPager" class="inline-flex items-center gap-1" aria-label="ページ送り">
    <button type="button" aria-current="page" class="h-8 w-8 rounded-lg bg-zinc-900 text-xs font-bold text-white ${twTransition(p)}">1</button>
    <button type="button" class="h-8 w-8 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 ${twTransition(p)}">2</button>
    <button type="button" class="h-8 w-8 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 ${twTransition(p)}">3</button>
  </nav>
  <button id="twLoadMore" type="button" class="block w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 ${twTransition(p)}">＋ もっと見る（2/6件）</button>
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
          ? 'h-8 w-8 rounded-lg bg-zinc-900 text-xs font-bold text-white ${twTransition(p)}'
          : 'h-8 w-8 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 ${twTransition(p)}';
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
</script>`,

  'guide-inline-confirm': (p) => `<!-- Tailwind CSS + Safe JS: Modal-free Inline 2-Step Confirm -->
<div id="twInlineBox" class="inline-flex min-h-9 items-center gap-2"></div>
<script>
(() => {
  const box = document.getElementById('twInlineBox');
  if (!box) return;
  const idle = () => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 ${twTransition(p)}';
    b.textContent = '削除する';
    b.onclick = ask;
    box.replaceChildren(b);
  };
  const ask = () => {
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white ${twTransition(p)}';
    ok.textContent = 'はい、削除する';
    ok.onclick = () => { box.textContent = '✓ 削除しました'; };
    const no = document.createElement('button');
    no.type = 'button';
    no.className = 'rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 ${twTransition(p)}';
    no.textContent = '戻る';
    no.onclick = idle;
    box.replaceChildren(ok, no);
  };
  idle();
})();
</script>`
};
