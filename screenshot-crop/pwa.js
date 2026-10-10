'use strict';

(() => {
  const installButton = document.getElementById('pwaInstallButton');
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  const isStandalone = () => (
    window.matchMedia?.('(display-mode: standalone)').matches
    || navigator.standalone === true
  );

  let deferredInstallPrompt = null;
  let activeToast = null;
  let updatePromptShown = false;

  function closeToast() {
    if (!activeToast) return;
    activeToast.remove();
    activeToast = null;
  }

  function showToast(message, options = {}) {
    closeToast();

    const toast = document.createElement('div');
    toast.className = 'pwa-toast';
    toast.setAttribute('role', 'status');

    const text = document.createElement('span');
    text.className = 'pwa-toast__message';
    text.textContent = message;
    toast.append(text);

    if (options.primaryLabel && typeof options.onPrimary === 'function') {
      const primary = document.createElement('button');
      primary.type = 'button';
      primary.className = 'pwa-toast__button pwa-toast__button--primary';
      primary.textContent = options.primaryLabel;
      primary.addEventListener('click', options.onPrimary);
      toast.append(primary);
    }

    if (options.secondaryLabel) {
      const secondary = document.createElement('button');
      secondary.type = 'button';
      secondary.className = 'pwa-toast__button';
      secondary.textContent = options.secondaryLabel;
      secondary.addEventListener('click', closeToast);
      toast.append(secondary);
    }

    document.body.append(toast);
    activeToast = toast;

    if (options.autoCloseMs) {
      window.setTimeout(() => {
        if (activeToast === toast) closeToast();
      }, options.autoCloseMs);
    }
  }

  function hideInstallButton() {
    if (installButton) installButton.hidden = true;
  }

  function showInstallButton() {
    if (!installButton || isStandalone()) return;
    installButton.hidden = false;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    showInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    hideInstallButton();
    showToast('ホーム画面に追加しました。次回から1タップで開けます。', {
      autoCloseMs: 4200,
    });
  });

  if (installButton) {
    installButton.addEventListener('click', async () => {
      if (isStandalone()) {
        hideInstallButton();
        return;
      }

      if (deferredInstallPrompt) {
        const prompt = deferredInstallPrompt;
        deferredInstallPrompt = null;
        hideInstallButton();

        try {
          await prompt.prompt();
          await prompt.userChoice;
        } catch (error) {
          console.warn('PWA install prompt failed:', error);
        }
        return;
      }

      if (isIos) {
        showToast('Safariの共有ボタンから「ホーム画面に追加」を選んでください。', {
          secondaryLabel: '閉じる',
        });
      }
    });
  }

  if (isIos && !isStandalone()) {
    showInstallButton();
  }

  const displayMode = window.matchMedia?.('(display-mode: standalone)');
  displayMode?.addEventListener?.('change', () => {
    if (isStandalone()) hideInstallButton();
  });

  if (!('serviceWorker' in navigator)) return;

  const secureContext = location.protocol === 'https:'
    || location.hostname === 'localhost'
    || location.hostname === '127.0.0.1';
  if (!secureContext) return;

  function showUpdatePrompt(registration) {
    if (updatePromptShown || !registration.waiting) return;
    updatePromptShown = true;

    showToast('スクショ端カットの更新があります。', {
      primaryLabel: '更新する',
      secondaryLabel: '後で',
      onPrimary: () => {
        const waiting = registration.waiting;
        if (!waiting) return;

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          location.reload();
        }, { once: true });

        waiting.postMessage({ type: 'SKIP_WAITING' });
      },
    });
  }

  function watchForUpdates(registration) {
    if (registration.waiting) showUpdatePrompt(registration);

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;

      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && registration.waiting) {
          showUpdatePrompt(registration);
        }
      });
    });
  }

  async function registerWorker() {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
      watchForUpdates(registration);

      window.setTimeout(() => {
        registration.update().catch(() => {});
      }, 3000);
    } catch (error) {
      console.warn('Screenshot crop service worker registration failed:', error);
    }
  }

  // Do not wait for images or analytics to finish loading.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerWorker, { once: true });
  } else {
    registerWorker();
  }
})();
