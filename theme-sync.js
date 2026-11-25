/**
 * KatakataLab 共通テーマ同期モジュール (/theme-sync.js)
 * - サイト全体で localStorage.theme ('dark' | 'light') を正本として統一管理
 * - 旧キー (例: doujin_dark_theme) の自動マイグレーション対応
 * - OS の prefers-color-scheme とタブ間 storage イベントにリアルタイム追従
 */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'theme';

  function safeGetStorage(storage, key) {
    if (!storage) return null;
    try {
      return storage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeSetStorage(storage, key, value) {
    if (!storage) return false;
    try {
      storage.setItem(key, value);
      return true;
    } catch (_) {
      return false;
    }
  }

  function safeRemoveStorage(storage, key) {
    if (!storage) return false;
    try {
      storage.removeItem(key);
      return true;
    } catch (_) {
      return false;
    }
  }

  function normalizeStoredTheme(raw) {
    if (raw === 'dark' || raw === 'true') return 'dark';
    if (raw === 'light' || raw === 'false') return 'light';
    return null;
  }

  function resolveTheme(options) {
    var opts = options || {};
    var storage = 'storage' in opts ? opts.storage : (typeof localStorage !== 'undefined' ? localStorage : null);
    var legacyKeys = Array.isArray(opts.legacyKeys) ? opts.legacyKeys : ['doujin_dark_theme'];
    var osDark = typeof opts.osDark === 'boolean'
      ? opts.osDark
      : (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
          : false);

    var canonical = normalizeStoredTheme(safeGetStorage(storage, STORAGE_KEY));
    if (canonical) {
      return { theme: canonical, source: 'storage' };
    }

    for (var i = 0; i < legacyKeys.length; i += 1) {
      var legacyVal = normalizeStoredTheme(safeGetStorage(storage, legacyKeys[i]));
      if (legacyVal) {
        safeSetStorage(storage, STORAGE_KEY, legacyVal);
        safeRemoveStorage(storage, legacyKeys[i]);
        return { theme: legacyVal, source: 'migrated' };
      }
    }

    return { theme: osDark ? 'dark' : 'light', source: 'os' };
  }

  function createThemeController(options) {
    var opts = options || {};
    var doc = opts.document || (typeof document !== 'undefined' ? document : null);
    var win = opts.window || (typeof window !== 'undefined' ? window : null);
    var storage = 'storage' in opts ? opts.storage : (win && win.localStorage ? win.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null));
    var legacyKeys = Array.isArray(opts.legacyKeys) ? opts.legacyKeys : ['doujin_dark_theme'];
    var htmlDarkClass = opts.htmlDarkClass !== false;
    var bodyDarkClass = opts.bodyDarkClass !== false;
    var listeners = [];
    var initialized = false;
    var currentDark = false;

    function isEnglish() {
      if (!doc || !doc.documentElement) return false;
      var lang = String(doc.documentElement.lang || '').toLowerCase();
      return lang.indexOf('en') === 0;
    }

    function updateButtons(isDark) {
      if (!doc || typeof doc.querySelectorAll !== 'function') return;
      var btns = doc.querySelectorAll('[data-theme-toggle]');
      var en = isEnglish();
      for (var i = 0; i < btns.length; i += 1) {
        var btn = btns[i];
        var btnEn = btn.getAttribute('data-lang') === 'en' || en;
        btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        var label = isDark
          ? (btnEn ? 'Switch to light mode' : 'ライトモードに切り替え')
          : (btnEn ? 'Switch to dark mode' : 'ダークモードに切り替え');
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
        if (btn.getAttribute('data-custom-icon') !== 'true') {
          var iconEl = btn.querySelector ? btn.querySelector('.theme-toggle-icon') : null;
          if (iconEl) {
            iconEl.textContent = isDark ? '☀️' : '🌙';
          } else {
            btn.textContent = isDark ? '☀️' : '🌙';
          }
        }
      }
    }

    function apply(isDark) {
      currentDark = Boolean(isDark);
      if (doc) {
        if (doc.documentElement) {
          if (htmlDarkClass) {
            doc.documentElement.classList.toggle('dark', currentDark);
          }
          if (doc.documentElement.dataset) {
            doc.documentElement.dataset.theme = currentDark ? 'dark' : 'light';
          }
        }
        if (doc.body && bodyDarkClass) {
          doc.body.classList.toggle('dark-mode', currentDark);
        }
      }
      updateButtons(currentDark);
      for (var i = 0; i < listeners.length; i += 1) {
        try {
          listeners[i](currentDark);
        } catch (_) {}
      }
      return currentDark;
    }

    function getOsDark() {
      if (win && typeof win.matchMedia === 'function') {
        return win.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return false;
    }

    function syncFromEnvironment() {
      var resolved = resolveTheme({
        storage: storage,
        legacyKeys: legacyKeys,
        osDark: getOsDark()
      });
      return apply(resolved.theme === 'dark');
    }

    function setTheme(mode) {
      var normalized = normalizeStoredTheme(mode);
      if (!normalized) return currentDark;
      safeSetStorage(storage, STORAGE_KEY, normalized);
      return apply(normalized === 'dark');
    }

    function toggle() {
      return setTheme(currentDark ? 'light' : 'dark');
    }

    function subscribe(fn) {
      if (typeof fn === 'function') {
        listeners.push(fn);
      }
      return function unsubscribe() {
        var idx = listeners.indexOf(fn);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    }

    function bindToggleButtons() {
      if (!doc || typeof doc.querySelectorAll !== 'function') return;
      var btns = doc.querySelectorAll('[data-theme-toggle]');
      for (var i = 0; i < btns.length; i += 1) {
        var btn = btns[i];
        if (btn.getAttribute('data-theme-bound') === 'true') continue;
        btn.setAttribute('data-theme-bound', 'true');
        btn.addEventListener('click', function () {
          toggle();
        });
      }
      updateButtons(currentDark);
    }

    function init(initOpts) {
      if (initOpts) {
        if (Array.isArray(initOpts.legacyKeys)) legacyKeys = initOpts.legacyKeys;
        if (typeof initOpts.htmlDarkClass === 'boolean') htmlDarkClass = initOpts.htmlDarkClass;
        if (typeof initOpts.bodyDarkClass === 'boolean') bodyDarkClass = initOpts.bodyDarkClass;
      }

      syncFromEnvironment();
      bindToggleButtons();

      if (initialized) return currentDark;
      initialized = true;

      if (win && typeof win.matchMedia === 'function') {
        var mql = win.matchMedia('(prefers-color-scheme: dark)');
        var handleOsChange = function (e) {
          if (!normalizeStoredTheme(safeGetStorage(storage, STORAGE_KEY))) {
            apply(Boolean(e && e.matches));
          }
        };
        if (typeof mql.addEventListener === 'function') {
          mql.addEventListener('change', handleOsChange);
        } else if (typeof mql.addListener === 'function') {
          mql.addListener(handleOsChange);
        }
      }

      if (win && typeof win.addEventListener === 'function') {
        win.addEventListener('storage', function (e) {
          if (!e || e.key === STORAGE_KEY) {
            syncFromEnvironment();
          }
        });
      }

      return currentDark;
    }

    return {
      STORAGE_KEY: STORAGE_KEY,
      resolveTheme: resolveTheme,
      init: init,
      apply: apply,
      setTheme: setTheme,
      toggle: toggle,
      isDark: function () { return currentDark; },
      subscribe: subscribe,
      bindToggleButtons: bindToggleButtons,
      syncFromEnvironment: syncFromEnvironment
    };
  }

  var api = createThemeController();
  api.createThemeController = createThemeController;

  if (typeof window !== 'undefined') {
    window.KatakataTheme = api;
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        api.syncFromEnvironment();
        document.addEventListener('DOMContentLoaded', function () {
          api.init();
        });
      } else {
        api.init();
      }
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
