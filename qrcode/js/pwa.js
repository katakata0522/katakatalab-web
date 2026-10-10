'use strict';

(() => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const isSecureHost = window.isSecureContext;
  if (!isSecureHost) {
    return;
  }

  const locale = String(navigator.language || '').toLowerCase();
  const copy = locale.startsWith('ja')
    ? {
      message: '新しいバージョンがあります。',
      update: '更新する',
      close: '閉じる'
    }
    : {
      message: 'A new version is available.',
      update: 'Update',
      close: 'Close'
    };
  let promptShown = false;

  const injectPromptStyle = () => {
    if (document.getElementById('pwa-update-style')) {
      return;
    }
    const style = document.createElement('style');
    style.id = 'pwa-update-style';
    style.textContent = `
      .pwa-update-toast {
        position: fixed;
        right: 14px;
        bottom: 14px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: min(420px, calc(100vw - 28px));
        padding: 12px 14px;
        border-radius: 12px;
        border: 1px solid rgba(58, 212, 167, 0.56);
        background: rgba(8, 20, 42, 0.95);
        color: #eaf6ff;
        box-shadow: 0 16px 34px rgba(2, 8, 24, 0.55);
        font: 700 0.92rem/1.4 "BIZ UDPGothic", "Yu Gothic UI", "Meiryo", sans-serif;
      }
      .pwa-update-toast__msg {
        flex: 1 1 auto;
      }
      .pwa-update-toast__btn {
        border: 1px solid rgba(58, 212, 167, 0.66);
        border-radius: 999px;
        padding: 6px 12px;
        cursor: pointer;
        font: 900 0.78rem/1 "BIZ UDPGothic", "Yu Gothic UI", "Meiryo", sans-serif;
      }
      .pwa-update-toast__btn--primary {
        background: linear-gradient(135deg, #3ad4a7 0%, #2cbf93 100%);
        color: #032819;
      }
      .pwa-update-toast__btn--ghost {
        background: transparent;
        color: #d8e9ff;
      }
      @media (max-width: 640px) {
        .pwa-update-toast {
          left: 10px;
          right: 10px;
          bottom: 70px;
          flex-wrap: wrap;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const showUpdatePrompt = (registration) => {
    if (promptShown || !registration || !registration.waiting) {
      return;
    }
    promptShown = true;
    injectPromptStyle();

    const toast = document.createElement('div');
    toast.className = 'pwa-update-toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <span class="pwa-update-toast__msg">${copy.message}</span>
      <button type="button" class="pwa-update-toast__btn pwa-update-toast__btn--primary" data-update-now>${copy.update}</button>
      <button type="button" class="pwa-update-toast__btn pwa-update-toast__btn--ghost" data-update-close>${copy.close}</button>
    `;

    const close = () => {
      if (!toast.isConnected) return;
      toast.remove();
      promptShown = false;
    };

    const updateBtn = toast.querySelector('[data-update-now]');
    const closeBtn = toast.querySelector('[data-update-close]');
    if (updateBtn) {
      updateBtn.addEventListener('click', () => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        }, { once: true });
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', close);
    }

    document.body.appendChild(toast);
  };

  const observeUpdate = (registration) => {
    if (!registration) return;
    if (registration.waiting) {
      showUpdatePrompt(registration);
    }

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdatePrompt(registration);
        }
      });
    });
  };

  const registerPwa = async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
      observeUpdate(registration);
      if (typeof registration.update === 'function') {
        setTimeout(() => {
          registration.update().catch(() => {});
        }, 3000);
      }
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', registerPwa, { once: true });
  else registerPwa();
})();
