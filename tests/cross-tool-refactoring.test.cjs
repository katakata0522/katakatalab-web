'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const themeSync = require(path.join(ROOT, 'theme-sync.js'));
const diffEngine = require(path.join(ROOT, 'text-diff/diff-engine.js'));

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    dump() { return Object.fromEntries(map.entries()); }
  };
}

function createClassList() {
  const set = new Set();
  return {
    add(c) { set.add(c); },
    remove(c) { set.delete(c); },
    contains(c) { return set.has(c); },
    toggle(c, force) {
      if (force === undefined) {
        if (set.has(c)) { set.delete(c); return false; }
        set.add(c); return true;
      }
      if (force) set.add(c);
      else set.delete(c);
      return Boolean(force);
    }
  };
}

function createMockButton(lang) {
  const attrs = new Map();
  if (lang) attrs.set('data-lang', lang);
  const listeners = [];
  return {
    textContent: '',
    getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; },
    setAttribute(name, val) { attrs.set(name, String(val)); },
    addEventListener(type, fn) { if (type === 'click') listeners.push(fn); },
    click() { listeners.forEach((fn) => fn()); },
    querySelector() { return null; }
  };
}

function createMockEnv({ lang = 'ja', osDark = false, storage }) {
  const button = createMockButton(lang === 'en' ? 'en' : null);
  const htmlClassList = createClassList();
  const bodyClassList = createClassList();
  const doc = {
    documentElement: { lang, classList: htmlClassList, dataset: {} },
    body: { classList: bodyClassList },
    querySelectorAll(selector) {
      return selector === '[data-theme-toggle]' ? [button] : [];
    }
  };
  let osListener = null;
  let storageListener = null;
  const win = {
    localStorage: storage,
    matchMedia() {
      return {
        matches: osDark,
        addEventListener(_evt, fn) { osListener = fn; }
      };
    },
    addEventListener(evt, fn) {
      if (evt === 'storage') storageListener = fn;
    }
  };
  return {
    doc,
    win,
    button,
    htmlClassList,
    bodyClassList,
    emitOsChange(matches) { if (osListener) osListener({ matches }); },
    emitStorage(key) { if (storageListener) storageListener({ key }); }
  };
}

function loadJsDiffFixture() {
  const src = read('tests/fixtures/jsdiff-5.1.0.min.js');
  const sandbox = { window: {}, self: {} };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.Diff || sandbox.window.Diff;
}

function reconstruct(parts) {
  let oldStr = '';
  let newStr = '';
  for (const p of parts) {
    if (!p.added) oldStr += p.value;
    if (!p.removed) newStr += p.value;
  }
  return { oldStr, newStr };
}

test('theme-sync: falls back to OS dark/light preference when storage is empty', () => {
  const storage = createMemoryStorage();
  const darkEnv = createMockEnv({ osDark: true, storage });
  const ctrlDark = themeSync.createThemeController({ document: darkEnv.doc, window: darkEnv.win, storage });
  ctrlDark.init();
  assert.equal(ctrlDark.isDark(), true);
  assert.equal(darkEnv.htmlClassList.contains('dark'), true);
  assert.equal(darkEnv.bodyClassList.contains('dark-mode'), true);
  assert.equal(darkEnv.doc.documentElement.dataset.theme, 'dark');
  assert.equal(darkEnv.button.getAttribute('aria-pressed'), 'true');
  assert.equal(storage.getItem('theme'), null);

  darkEnv.emitOsChange(false);
  assert.equal(ctrlDark.isDark(), false);
  assert.equal(darkEnv.bodyClassList.contains('dark-mode'), false);
});

test('theme-sync: explicit toggle persists canonical localStorage.theme and ignores OS flips afterwards', () => {
  const storage = createMemoryStorage();
  const env = createMockEnv({ lang: 'en', osDark: false, storage });
  const ctrl = themeSync.createThemeController({ document: env.doc, window: env.win, storage });
  ctrl.init();
  assert.equal(ctrl.isDark(), false);
  assert.equal(env.button.getAttribute('aria-label'), 'Switch to dark mode');

  env.button.click();
  assert.equal(ctrl.isDark(), true);
  assert.equal(storage.getItem('theme'), 'dark');
  assert.equal(env.button.getAttribute('aria-label'), 'Switch to light mode');

  env.emitOsChange(false);
  assert.equal(ctrl.isDark(), true);

  storage.setItem('theme', 'light');
  env.emitStorage('theme');
  assert.equal(ctrl.isDark(), false);
});

test('theme-sync: migrates legacy doujin_dark_theme key to canonical theme key', () => {
  const storageTrue = createMemoryStorage({ doujin_dark_theme: 'true' });
  const resTrue = themeSync.resolveTheme({ storage: storageTrue, osDark: false });
  assert.deepEqual(resTrue, { theme: 'dark', source: 'migrated' });
  assert.equal(storageTrue.getItem('theme'), 'dark');
  assert.equal(storageTrue.getItem('doujin_dark_theme'), null);

  const storageFalse = createMemoryStorage({ doujin_dark_theme: 'false' });
  const resFalse = themeSync.resolveTheme({ storage: storageFalse, osDark: true });
  assert.deepEqual(resFalse, { theme: 'light', source: 'migrated' });
  assert.equal(storageFalse.getItem('theme'), 'light');
  assert.equal(storageFalse.getItem('doujin_dark_theme'), null);
});

test('theme-sync: survives throwing storage implementations', () => {
  const brokenStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('quota'); },
    removeItem() { throw new Error('blocked'); }
  };
  const env = createMockEnv({ osDark: true, storage: brokenStorage });
  const ctrl = themeSync.createThemeController({ document: env.doc, window: env.win, storage: brokenStorage });
  assert.doesNotThrow(() => {
    ctrl.init();
    ctrl.toggle();
  });
  assert.equal(ctrl.isDark(), false);
});

test('diff-engine: diffLines handles identical, empty, insertions, deletions, and CRLF preservation', () => {
  assert.deepEqual(diffEngine.diffLines('', ''), []);
  assert.deepEqual(diffEngine.diffLines('a\nb\n', 'a\nb\n'), [{ value: 'a\nb\n', count: 2 }]);

  const crlfOld = 'line1\r\nline2\r\nline3\r\n';
  const crlfNew = 'line1\r\nline2-mod\r\nline3\r\nline4\r\n';
  const parts = diffEngine.diffLines(crlfOld, crlfNew);
  assert.deepEqual(reconstruct(parts), { oldStr: crlfOld, newStr: crlfNew });
  assert.ok(parts.some((p) => p.removed && p.value === 'line2\r\n'));
  assert.ok(parts.some((p) => p.added && p.value === 'line2-mod\r\n'));
  assert.ok(parts.some((p) => p.added && p.value === 'line4\r\n'));
});

test('diff-engine: diffChars handles astral Unicode emoji without splitting surrogate pairs', () => {
  const parts = diffEngine.diffChars('テスト😀完了', 'テスト😃完了');
  assert.deepEqual(reconstruct(parts), { oldStr: 'テスト😀完了', newStr: 'テスト😃完了' });
  for (const part of parts) {
    assert.equal(part.value.includes('\uFFFD'), false);
    for (const ch of part.value) {
      const code = ch.charCodeAt(0);
      assert.equal(code >= 0xDC00 && code <= 0xDFFF, false, 'must not emit unpaired low surrogate');
    }
  }
});

test('diff-engine: diffLines and diffChars match jsdiff 5.1.0 fixture on real-world samples', () => {
  const jsdiff = loadJsDiffFixture();
  const pairs = [
    [
      '【お知らせ】\n4月1日より営業時間を変更します。\n平日 9:00〜18:00\n土日祝 休業\nお問い合わせはフォームまで。',
      '【重要なお知らせ】\n4月1日より営業時間を変更します。\n平日 10:00〜19:00\n土曜 10:00〜15:00\n日祝 休業\nお問い合わせはフォームまで。'
    ],
    [
      'alpha\nbeta\ngamma\ndelta\nepsilon\n',
      'alpha\ngamma\ndelta\nzeta\nepsilon\n'
    ],
    [
      'only old line',
      ''
    ],
    [
      '',
      'only new line'
    ]
  ];

  for (const [oldText, newText] of pairs) {
    const localLines = diffEngine.diffLines(oldText, newText);
    const refLines = jsdiff.diffLines(oldText, newText);
    assert.deepEqual(reconstruct(localLines), { oldStr: oldText, newStr: newText });
    const countChanged = (arr) => arr.filter((p) => p.added || p.removed).reduce((s, p) => s + p.count, 0);
    assert.equal(countChanged(localLines), countChanged(refLines));

    const localChars = diffEngine.diffChars(oldText, newText);
    assert.deepEqual(reconstruct(localChars), { oldStr: oldText, newStr: newText });
  }
});

test('static optimization: external CDN runtime dependencies removed from doujin-calc and text-diff', () => {
  const doujinHtml = read('doujin-calc/index.html');
  assert.doesNotMatch(doujinHtml, /cdn\.tailwindcss\.com/);
  assert.match(doujinHtml, /href="\.\/css\/tailwind\.built\.css/);
  const builtCss = read('doujin-calc/css/tailwind.built.css');
  assert.ok(builtCss.length > 5000);
  assert.match(builtCss, /\.dark \.dark\\:bg-slate-900/);
  assert.match(builtCss, /\.sm\\:hidden/);
  assert.match(builtCss, /\.lg\\:grid-cols-4/);
  for (const line of builtCss.split('\n')) {
    const sel = line.split('{')[0];
    for (const m of sel.matchAll(/\\(.)/g)) {
      assert.ok([':', '/', '.', '[', ']', "'"].includes(m[1]), `invalid CSS escape in selector: ${sel.trim()}`);
    }
  }

  const previewServer = read('scripts/ai-studio-preview.mjs');
  assert.match(previewServer, /"theme-sync\.js"/);

  const doujinSw = read('doujin-calc/sw.js');
  assert.match(doujinSw, /css\/tailwind\.built\.css/);
  assert.match(doujinSw, /\.\.\/theme-sync\.js/);

  const diffJa = read('text-diff/index.html');
  const diffEn = read('text-diff/en/index.html');
  assert.doesNotMatch(diffJa, /cdnjs\.cloudflare\.com/);
  assert.doesNotMatch(diffEn, /cdnjs\.cloudflare\.com/);
  assert.match(diffJa, /diff-engine\.js/);
  assert.match(diffEn, /diff-engine\.js/);
});

test('static quality: refactored tool HTML pages have zero inline style= attributes and include dark-mode toggle', () => {
  const zeroInlineStylePages = [
    'px-rem-converter/index.html',
    'px-rem-converter/en/index.html',
    'text-diff/index.html',
    'text-diff/en/index.html',
    'ogp-simulator/index.html',
    'seireki/index.html',
    'discount-calc/index.html',
    'aspect-ratio-calc/index.html'
  ];

  for (const rel of zeroInlineStylePages) {
    const html = read(rel);
    assert.equal(/\sstyle\s*=\s*["']/.test(html), false, `${rel} should have no inline style= attributes`);
    assert.equal(
      html.includes('data-theme-toggle') || html.includes('id="theme-toggle"'),
      true,
      `${rel} should provide a dark-mode toggle button`
    );
  }
});

test('static UX upgrades: sample button, PX/REM value copy, DOM order, and OGP HTML meta output exist', () => {
  const diffJa = read('text-diff/index.html');
  const diffEn = read('text-diff/en/index.html');
  assert.match(diffJa, /id="sampleBtn"/);
  assert.match(diffEn, /id="sampleBtn"/);

  for (const rel of ['px-rem-converter/index.html', 'px-rem-converter/en/index.html']) {
    const html = read(rel);
    assert.match(html, /id="copyPxValBtn"/);
    assert.match(html, /id="copyRemValBtn"/);
    const panelIdx = html.indexOf('class="converter-panel"');
    const explainIdx = html.indexOf('class="root-explain"');
    assert.ok(panelIdx > 0 && explainIdx > panelIdx, `${rel}: .converter-panel must precede .root-explain in DOM`);
  }

  const ogpHtml = read('ogp-simulator/index.html');
  assert.match(ogpHtml, /id="ogpCodeOutput"/);
  assert.match(ogpHtml, /id="copyOgpMetaBtn"/);
});
