(function () {
  'use strict';

  // Child-focused pages never initialize analytics, including if a stale page loader remains cached.
  let educationPath = window.location.pathname;
  try { educationPath = decodeURIComponent(educationPath); } catch { /* 不正なエンコードでも起動は止めない */ }
  educationPath = new URL(educationPath.replaceAll('\\', '/').replace(/\/{2,}/g, '/'), 'https://education.invalid').pathname.toLowerCase();
  if (/^\/(?:pikalab(?:\/|$)|lab-tools\/kids-smile-land(?:\/|$)|usagi-app(?:\/|$)|kirarin-play-park(?:\/|$)|pikalab-story\.html$)/.test(educationPath)) return;

  const measurementId = 'G-FYFPS7L9X9';
  const toolPaths = [
    ['/lab-tools/gravity-todo/', 'gravity-todo'],
    ['/aspect-ratio-calc/', 'aspect-ratio-calc'],
    ['/screenshot-crop/', 'screenshot-crop'],
    ['/chiritsumo-calc/', 'chiritsumo-calc'],
    ['/moyamoya-sorter/', 'moyamoya-sorter'],
    ['/discount-calc/', 'discount-calc'],
    ['/emphasis-lines/', 'emphasis-lines'],
    ['/doujin-calc/', 'doujin-calc'],
    ['/font-lab/', 'font-lab'],
    ['/ogp-simulator/', 'ogp-simulator'],
    ['/password-generator/', 'password-generator'],
    ['/px-rem-converter/', 'px-rem-converter'],
    ['/qrcode/', 'qrcode'],
    ['/seireki/', 'seireki'],
    ['/text-diff/', 'text-diff']
  ];
  const trackedActions = {
    'qrcode': {
      downloadBtn: 'download',
      savePresetBtn: 'preset_save',
      loadPresetBtn: 'preset_load',
      bulkPreviewBtn: 'bulk_preview',
      bulkDownloadBtn: 'bulk_download',
      bulkZipBtn: 'bulk_zip',
      scannerToggleBtn: 'scanner_toggle'
    },
    'password-generator': {
      'gen-btn': 'generate',
      'copy-all-btn': 'copy_all',
      'share-btn': 'share',
      'install-app-btn': 'install_app'
    },
    'aspect-ratio-calc': {
      swapBtn: 'swap',
      detectBtn: 'detect_ratio'
    },
    'screenshot-crop': {
      pasteButton: 'paste_image',
      autoAgainButton: 'auto_crop_again',
      saveButton: 'save_image',
      quickSaveButton: 'save_image_quick',
      copyButton: 'copy_image',
      quickCopyButton: 'copy_image_quick',
      saveAllIndividualButton: 'save_all_individual',
      saveAllButton: 'save_all_zip',
      shareButton: 'share_image',
      quickShareButton: 'share_image_quick',
      replaceButton: 'add_images',
      removeCurrentButton: 'remove_image',
      compareButton: 'compare_original'
    },
    'px-rem-converter': {
      copyCssBtn: 'copy_css',
      addSizeBtn: 'add_size',
      resetSizesBtn: 'reset_sizes'
    },
    'text-diff': {
      compareBtn: 'compare',
      btnCopyDiff: 'copy_diff',
      swapBtn: 'swap',
      clearBtn: 'clear'
    },
    'ogp-simulator': {
      removeImageBtn: 'remove_image',
      resetBtn: 'reset'
    },
    'discount-calc': {
      customPrice: 'apply_custom_rate',
      btnCartCustom: 'add_custom_cart',
      cartClearBtn: 'clear_cart'
    },
    'seireki': {
      copyBtn: 'copy',
      copyAllResumeBtn: 'copy_resume',
      'tab-age': 'tab_age',
      'tab-resume': 'tab_resume',
      'tab-life': 'tab_life'
    },
    'moyamoya-sorter': {
      sortBtn: 'sort',
      actNowBtn: 'act_now',
      startTimerBtn: 'timer_start',
      copyResultBtn: 'copy_result',
      shareXBtn: 'share_x',
      retryBtn: 'retry'
    },
    'chiritsumo-calc': {
      addCustomBtn: 'add_custom',
      copyChiritsumoBtn: 'copy',
      nativeShareBtn: 'share_native',
      shareChiritsumoXBtn: 'share_x',
      printSheetBtn: 'print'
    }
  };
  const attributionParameters = new Set([
    'gclid', 'dclid', 'wbraid', 'gbraid', 'shelf', 'type', 'lang'
  ]);

  function normalizePathname(pathname) {
    const value = String(pathname || '/').replace(/\/{2,}/g, '/');
    return value.startsWith('/') ? value : '/' + value;
  }

  function getToolId(pathname) {
    const normalized = normalizePathname(pathname);
    const match = toolPaths.find(function (entry) {
      return normalized === entry[0].slice(0, -1) || normalized.startsWith(entry[0]);
    });
    return match ? match[1] : '';
  }

  function getContentGroup(pathname) {
    const normalized = normalizePathname(pathname);
    if (normalized === '/') return 'Home';
    if (
      normalized.startsWith('/privacy/')
      || normalized === '/privacy.html'
      || normalized === '/terms.html'
      || normalized === '/contact.html'
      || normalized.endsWith('/privacy.html')
      || normalized.endsWith('/terms.html')
    ) return 'Legal / Support';
    if (normalized.startsWith('/guides/it-basics/')) return 'IT Basics';
    if (normalized.startsWith('/guides/')) return 'Guide';
    if (normalized.startsWith('/en/') || normalized.startsWith('/international/')) return 'International';
    if (getToolId(normalized)) return 'Tool';
    if (
      normalized === '/who-is-katakata.html'
      || normalized === '/about-katakatalab.html'
      || normalized === '/updates.html'
      || normalized === '/sitemap.html'
    ) return 'Site Info';
    if (normalized === '/gear.html' || normalized === '/note-selection.html') return 'Content';
    if (normalized === '/404.html' || normalized === '/offline.html') return 'System';
    return 'Other';
  }

  function sanitizePageLocation(value) {
    try {
      const url = new URL(value || window.location.href);
      const next = new URL(url.origin + url.pathname);
      url.searchParams.forEach(function (parameterValue, key) {
        if (key.startsWith('utm_') || attributionParameters.has(key)) {
          next.searchParams.append(key, parameterValue);
        }
      });
      return next.toString();
    } catch (error) {
      return window.location.origin + window.location.pathname;
    }
  }

  function sanitizePageReferrer(value) {
    if (!value) return '';
    try {
      const url = new URL(value);
      if (url.origin === window.location.origin) {
        return url.origin + url.pathname;
      }
      return url.origin + '/';
    } catch (error) {
      return '';
    }
  }

  function safeToken(value, fallback) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);
    return normalized || fallback || 'unknown';
  }

  const pagePath = normalizePathname(window.location.pathname);
  const contentGroup = getContentGroup(pagePath);
  const currentToolId = getToolId(pagePath);

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('set', {
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    content_group: contentGroup,
    page_location: sanitizePageLocation(window.location.href),
    page_referrer: sanitizePageReferrer(document.referrer)
  });

  function loadAnalytics() {
    if (document.querySelector('script[data-katakata-ga4]')) return;
    const existing = document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
    if (existing) {
      existing.setAttribute('data-katakata-ga4', 'existing');
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-katakata-ga4', 'shared');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }

  function track(eventName, parameters) {
    const params = Object.assign({
      content_group: contentGroup
    }, parameters || {});

    if (currentToolId && !params.tool_id) params.tool_id = currentToolId;
    window.gtag('event', eventName, params);
  }

  let toolStarted = false;
  function trackToolStart(interactionType) {
    if (!currentToolId || toolStarted) return;
    toolStarted = true;
    track('tool_start', {
      tool_id: currentToolId,
      interaction_type: safeToken(interactionType, 'interaction')
    });
  }

  function trackToolAction(actionId) {
    if (!currentToolId || !actionId) return;
    trackToolStart('action');
    track('tool_action', {
      tool_id: currentToolId,
      action_id: safeToken(actionId, 'action')
    });
  }

  function trackShare(method, contentType, itemId) {
    track('share', {
      method: safeToken(method, 'unknown'),
      content_type: safeToken(contentType, 'content'),
      item_id: safeToken(itemId, 'site')
    });
  }

  function getSelectionSource(element) {
    if (!element || !element.closest) return 'other';
    if (element.closest('.search-suggestion-link')) return 'search_suggestion';
    if (element.closest('.recent-project-link')) return 'recent_project';
    if (element.closest('[data-project-card], [data-id].card')) return 'project_card';
    if (element.closest('nav, .bottom-nav, .mobile-menu')) return 'navigation';
    if (element.closest('footer')) return 'footer';
    if (element.closest('article, .article-content, .guide-page')) return 'article';
    return 'other';
  }

  function trackInternalSelection(link) {
    if (!link || !link.href) return;

    let destination;
    try {
      destination = new URL(link.href, window.location.href);
    } catch (error) {
      return;
    }

    if (destination.origin !== window.location.origin) return;
    if (normalizePathname(destination.pathname) === pagePath) return;

    const destinationGroup = getContentGroup(destination.pathname);
    const allowedGroups = new Set(['Tool', 'Guide', 'IT Basics', 'International', 'Content', 'Site Info']);
    if (!allowedGroups.has(destinationGroup)) return;

    const destinationToolId = getToolId(destination.pathname);
    const contentId = destinationToolId || safeToken(destination.pathname.replace(/^\/+|\/+$/g, ''), 'home');

    track('select_content', {
      content_type: destinationGroup.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      content_id: contentId,
      selection_source: getSelectionSource(link)
    });
  }

  function bindToolInteractions() {
    if (!currentToolId) return;

    function isMeaningfulField(target) {
      if (!target || !target.matches) return false;
      if (!target.matches('input, select, textarea')) return false;
      const type = String(target.getAttribute('type') || '').toLowerCase();
      return !['hidden', 'button', 'submit', 'reset'].includes(type);
    }

    document.addEventListener('input', function (event) {
      if (isMeaningfulField(event.target)) trackToolStart('input');
    }, true);

    document.addEventListener('change', function (event) {
      if (isMeaningfulField(event.target)) trackToolStart('change');
    }, true);
  }

  function bindClickTracking() {
    document.addEventListener('click', function (event) {
      const target = event.target;
      const link = target && target.closest ? target.closest('a[href]') : null;
      if (link) trackInternalSelection(link);

      if (!currentToolId || !target || !target.closest) return;
      const button = target.closest('button, [role="button"]');
      if (!button || !button.id) return;

      const actionMap = trackedActions[currentToolId];
      if (actionMap && actionMap[button.id]) {
        trackToolAction(actionMap[button.id]);
      }
    }, true);
  }

  function bindContentProgressTracking() {
    const readableGroups = new Set(['Guide', 'IT Basics', 'Content', 'Site Info']);
    if (!readableGroups.has(contentGroup)) return;

    let sentMidpoint = false;

    function measureProgress() {
      if (sentMidpoint) return;

      const documentHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body ? document.body.scrollHeight : 0
      );
      const scrollable = documentHeight - window.innerHeight;
      if (scrollable < 400) return;

      const progress = window.scrollY / scrollable;
      if (progress < 0.5) return;

      sentMidpoint = true;
      track('content_progress', {
        progress_percent: 50
      });
      window.removeEventListener('scroll', measureProgress);
    }

    window.addEventListener('scroll', measureProgress, { passive: true });
    measureProgress();
  }

  function bindHomepageSearchTracking() {
    const input = document.getElementById('project-search');
    if (!input) return;

    let timer = null;
    let lastSignature = '';

    function sendSearchSummary() {
      const query = String(input.value || '').trim();
      if (!query) return;

      const activeFilter = document.querySelector('.shelf-nav-btn.active');
      const filterId = safeToken(activeFilter && activeFilter.getAttribute('data-filter'), 'all');
      const resultCount = document.querySelectorAll('#projects-grid .card, #secondary-projects-grid .card').length;
      const signature = [query, filterId, resultCount].join(':');
      if (signature === lastSignature) return;
      lastSignature = signature;

      track('site_search', {
        search_length: Math.min(query.length, 80),
        result_count: resultCount,
        filter_id: filterId
      });
    }

    input.addEventListener('input', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(sendSearchSummary, 700);
    });

    document.querySelectorAll('.shelf-nav-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        track('filter_select', {
          filter_id: safeToken(button.getAttribute('data-filter'), 'all')
        });
      });
    });
  }

  window.KatakataAnalytics = Object.freeze({
    track: track,
    trackShare: trackShare,
    trackToolAction: trackToolAction,
    trackToolStart: trackToolStart,
    sanitizePageLocation: sanitizePageLocation,
    sanitizePageReferrer: sanitizePageReferrer,
    getContentGroup: getContentGroup,
    getToolId: getToolId
  });

  loadAnalytics();

  function initializeInteractionTracking() {
    bindToolInteractions();
    bindClickTracking();
    bindHomepageSearchTracking();
    bindContentProgressTracking();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeInteractionTracking, { once: true });
  } else {
    initializeInteractionTracking();
  }
}());
