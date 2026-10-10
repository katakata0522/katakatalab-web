'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'qr_meker_details_state_v1';
  const detailsNodes = Array.from(document.querySelectorAll('details[data-details-id]'));
  if (detailsNodes.length === 0) {
    return;
  }

  const getPathKey = () => {
    try {
      const url = new URL(window.location.href);
      return url.pathname || '/';
    } catch {
      return window.location.pathname || '/';
    }
  };

  const pathKey = getPathKey();

  const loadStore = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };

  const saveStore = (store) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // 保存不可でも動作継続
    }
  };

  const writeCurrentState = () => {
    const store = loadStore();
    const next = {};
    detailsNodes.forEach((detail) => {
      next[detail.dataset.detailsId] = detail.open;
    });
    store[pathKey] = next;
    saveStore(store);
  };

  const restoreState = () => {
    const store = loadStore();
    const pageState = store[pathKey];
    if (!pageState || typeof pageState !== 'object') {
      return;
    }
    detailsNodes.forEach((detail) => {
      const id = detail.dataset.detailsId;
      if (Object.prototype.hasOwnProperty.call(pageState, id)) {
        detail.open = Boolean(pageState[id]);
      }
    });
  };

  const faqRoot = document.querySelector('[data-faq-controls]');
  const faqOpenAllBtn = faqRoot ? faqRoot.querySelector('[data-faq-open-all]') : null;
  const faqCloseAllBtn = faqRoot ? faqRoot.querySelector('[data-faq-close-all]') : null;
  const faqDetails = faqRoot ? Array.from(faqRoot.querySelectorAll('details[data-details-id]')) : [];

  const updateFaqButtons = () => {
    if (!faqOpenAllBtn || !faqCloseAllBtn || faqDetails.length === 0) return;
    const allOpen = faqDetails.every((detail) => detail.open);
    const allClosed = faqDetails.every((detail) => !detail.open);
    faqOpenAllBtn.disabled = allOpen;
    faqCloseAllBtn.disabled = allClosed;
  };

  const setFaqOpenState = (open) => {
    faqDetails.forEach((detail) => {
      detail.open = open;
    });
    writeCurrentState();
    updateFaqButtons();
  };

  restoreState();
  detailsNodes.forEach((detail) => {
    detail.addEventListener('toggle', () => {
      writeCurrentState();
      updateFaqButtons();
    });
  });

  if (faqOpenAllBtn && faqCloseAllBtn && faqDetails.length > 0) {
    faqOpenAllBtn.addEventListener('click', () => {
      setFaqOpenState(true);
    });
    faqCloseAllBtn.addEventListener('click', () => {
      setFaqOpenState(false);
    });
    updateFaqButtons();
  }
});
