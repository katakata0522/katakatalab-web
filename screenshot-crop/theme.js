(() => {
  'use strict';

  const STORAGE_KEY = 'theme';
  const LIGHT_THEME_COLOR = '#f8fafc';
  const DARK_THEME_COLOR = '#0b1220';

  function readSavedTheme(storage) {
    try {
      const store = storage || window.localStorage;
      const value = store?.getItem?.(STORAGE_KEY);
      return value === 'dark' || value === 'light' ? value : '';
    } catch {
      return '';
    }
  }

  function writeSavedTheme(isDark, storage) {
    try {
      const store = storage || window.localStorage;
      store?.setItem?.(STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Storage may be unavailable in restricted contexts.
    }
  }

  function resolveInitialTheme(savedTheme, systemPrefersDark) {
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'light') return false;
    return Boolean(systemPrefersDark);
  }

  function updateThemeColorMeta(isDark) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
    }
  }

  function updateToggleButton(button, isDark) {
    if (!button) return;
    button.setAttribute('aria-pressed', String(isDark));
    button.setAttribute('aria-label', isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え');
    button.setAttribute('title', isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え');
    button.dataset.theme = isDark ? 'dark' : 'light';
  }

  function applyTheme(isDark) {
    const dark = Boolean(isDark);
    document.documentElement?.classList?.toggle('dark-mode', dark);
    document.body?.classList?.toggle('dark-mode', dark);
    updateThemeColorMeta(dark);
    const button = document.getElementById('themeToggleButton');
    updateToggleButton(button, dark);
    return dark;
  }

  function initTheme() {
    const prefersDarkScheme = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

    const initialDark = resolveInitialTheme(
      readSavedTheme(),
      Boolean(prefersDarkScheme?.matches),
    );
    applyTheme(initialDark);

    const button = document.getElementById('themeToggleButton');
    if (button) {
      button.addEventListener('click', () => {
        const nextDark = !document.documentElement.classList.contains('dark-mode');
        writeSavedTheme(nextDark);
        applyTheme(nextDark);
      });
    }

    const syncWithSystemTheme = (event) => {
      if (readSavedTheme()) return;
      applyTheme(Boolean(event.matches));
    };

    if (prefersDarkScheme?.addEventListener) {
      prefersDarkScheme.addEventListener('change', syncWithSystemTheme);
    } else if (prefersDarkScheme?.addListener) {
      prefersDarkScheme.addListener(syncWithSystemTheme);
    }

    window.addEventListener?.('storage', (event) => {
      if (event.key !== STORAGE_KEY) return;
      const saved = readSavedTheme();
      applyTheme(resolveInitialTheme(saved, Boolean(prefersDarkScheme?.matches)));
    });
  }

  const api = Object.freeze({
    STORAGE_KEY,
    LIGHT_THEME_COLOR,
    DARK_THEME_COLOR,
    readSavedTheme,
    writeSavedTheme,
    resolveInitialTheme,
    applyTheme,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.ScreenshotCropTheme = api;
    // Apply class early to avoid light flash if DOM is already ready or loading.
    const saved = readSavedTheme();
    const systemDark = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(resolveInitialTheme(saved, systemDark));
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initTheme, { once: true });
    } else {
      initTheme();
    }
  }
})();
