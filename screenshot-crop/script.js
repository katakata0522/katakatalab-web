(() => {
  'use strict';

  const Core = window.ScreenshotCropCore;
  const ImageOps = window.ScreenshotCropImage;
  const Preview = window.ScreenshotCropPreview;
  const Zip = window.ScreenshotCropZip;
  const DeviceProfiles = window.ScreenshotCropDeviceProfiles;
  const Presets = window.ScreenshotCropPresets;
  if (!Core || !ImageOps || !Preview || !Zip || !DeviceProfiles || !Presets) {
    throw new Error('Screenshot crop dependencies failed to load');
  }

  const {
    CONFIG,
    EDGE_KEYS,
    clamp,
    defaultEdges,
    cloneEdges,
    cloneCrop,
    fallbackEdgeCrop,
    buildSelectedCrop,
    normalizeCrop,
    isAllowedMimeType,
    validateFile,
    estimateCrop,
    outputName,
  } = Core;
  const {
    decodeObjectUrl,
    createDecodeCache,
    analyzeImageEdges,
    createThumbnailBlob,
    exportCroppedBlob,
  } = ImageOps;
  const {
    computeLayout,
    scaleCrop,
    drawCropOverlay,
    closestEdge: findClosestEdge,
  } = Preview;
  const { createStoredZip } = Zip;
  const {
    loadProfiles,
    saveProfiles,
    resolveProfile,
    upsertProfile,
  } = DeviceProfiles;
  const {
    loadPresets,
    savePresets,
    getPreset,
    setPreset,
    deletePreset,
  } = Presets;

  const decodeCache = createDecodeCache();
  let itemSequence = 0;
  let interactiveFrameId = 0;
  let interactiveNeedsControls = false;
  let lastBatchScrolledIndex = -1;
  let profileToastTimer = 0;



  const state = {
    items: [],
    currentIndex: -1,
    image: null,
    crop: { top: 0, right: 0, bottom: 0, left: 0 },
    mode: 'auto',
    detected: 'generic',
    enabledEdges: defaultEdges(),
    compareOriginal: false,
    draggingEdge: '',
    manualTouched: false,
    activationToken: 0,
    profiles: loadProfiles(),
    presets: loadPresets(),
    selectedPresetSlot: 0,
    lastManualBatchAdjustment: null,
    previewCache: {
      itemId: 0,
      width: 0,
      height: 0,
      canvas: null,
    },
  };

  const els = {};
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    Object.assign(els, {
      fileInput: document.getElementById('fileInput'),
      dropZone: document.getElementById('dropZone'),
      pasteButton: document.getElementById('pasteButton'),
      replaceButton: document.getElementById('replaceButton'),
      removeCurrentButton: document.getElementById('removeCurrentButton'),
      uploadMessage: document.getElementById('uploadMessage'),
      editorSection: document.getElementById('editorSection'),
      batchProgress: document.getElementById('batchProgress'),
      readyHint: document.getElementById('readyHint'),
      batchStrip: document.getElementById('batchStrip'),
      batchList: document.getElementById('batchList'),
      prevImageButton: document.getElementById('prevImageButton'),
      nextImageButton: document.getElementById('nextImageButton'),
      presetSlotButtons: [...document.querySelectorAll('[data-preset-slot]')],
      presetManager: document.getElementById('presetManager'),
      presetManagerText: document.getElementById('presetManagerText'),
      presetSaveButton: document.getElementById('presetSaveButton'),
      presetDeleteButton: document.getElementById('presetDeleteButton'),
      presetCloseButton: document.getElementById('presetCloseButton'),
      previewCanvas: document.getElementById('previewCanvas'),
      canvasShell: document.getElementById('canvasShell'),
      canvasHelp: document.getElementById('canvasHelp'),
      detectedLabel: document.getElementById('detectedLabel'),
      editState: document.getElementById('editState'),
      resultSize: document.getElementById('resultSize'),
      removedSummary: document.getElementById('removedSummary'),
      compareButton: document.getElementById('compareButton'),
      autoAgainButton: document.getElementById('autoAgainButton'),
      safeMargin: document.getElementById('safeMargin'),
      modeButtons: [...document.querySelectorAll('.mode-button')],
      edgeInputs: [...document.querySelectorAll('[data-edge]')],
      cropTop: document.getElementById('cropTop'),
      cropBottom: document.getElementById('cropBottom'),
      cropLeft: document.getElementById('cropLeft'),
      cropRight: document.getElementById('cropRight'),
      cropTopValue: document.getElementById('cropTopValue'),
      cropBottomValue: document.getElementById('cropBottomValue'),
      cropLeftValue: document.getElementById('cropLeftValue'),
      cropRightValue: document.getElementById('cropRightValue'),
      saveButton: document.getElementById('saveButton'),
      copyButton: document.getElementById('copyButton'),
      saveAllIndividualButton: document.getElementById('saveAllIndividualButton'),
      saveAllButton: document.getElementById('saveAllButton'),
      batchAutoNote: document.getElementById('batchAutoNote'),
      batchReview: document.getElementById('batchReview'),
      batchReviewText: document.getElementById('batchReviewText'),
      reviewNextButton: document.getElementById('reviewNextButton'),
      shareButton: document.getElementById('shareButton'),
      quickActionDock: document.getElementById('quickActionDock'),
      quickSaveButton: document.getElementById('quickSaveButton'),
      quickCopyButton: document.getElementById('quickCopyButton'),
      quickShareButton: document.getElementById('quickShareButton'),
      exportMessage: document.getElementById('exportMessage'),
      profileToast: document.getElementById('profileToast'),
    });

    updateEdgeControls();
    updateModeButtons();
    updateCompareState();
    updateBatchUI();
    updatePresetUI();
    updateQuickActions();

    els.fileInput.addEventListener('change', (event) => {
      const files = [...(event.target.files || [])];
      if (files.length) addFiles(files);
      event.target.value = '';
    });

    els.replaceButton.addEventListener('click', () => els.fileInput.click());
    els.removeCurrentButton.addEventListener('click', removeCurrentItem);
    els.pasteButton.addEventListener('click', pasteFromClipboard);

    els.prevImageButton.addEventListener('click', () => activateItem(state.currentIndex - 1));
    els.nextImageButton.addEventListener('click', () => activateItem(state.currentIndex + 1));
    els.batchList.addEventListener('click', onBatchListClick);
    els.presetSlotButtons.forEach((button) => button.addEventListener('click', onPresetSlotClick));
    els.presetSaveButton.addEventListener('click', saveSelectedPreset);
    els.presetDeleteButton.addEventListener('click', deleteSelectedPreset);
    els.presetCloseButton.addEventListener('click', closePresetManager);

    els.dropZone.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      els.fileInput.click();
    });

    ['dragenter', 'dragover'].forEach((name) => {
      els.dropZone.addEventListener(name, (event) => {
        event.preventDefault();
        els.dropZone.classList.add('is-dragover');
      });
    });

    ['dragleave', 'drop'].forEach((name) => {
      els.dropZone.addEventListener(name, (event) => {
        event.preventDefault();
        els.dropZone.classList.remove('is-dragover');
      });
    });

    els.dropZone.addEventListener('drop', (event) => {
      addFiles([...(event.dataTransfer?.files || [])]);
    });

    document.addEventListener('paste', (event) => {
      const files = [...(event.clipboardData?.files || [])];
      if (files.length) addFiles(files);
    });

    els.edgeInputs.forEach((input) => {
      input.addEventListener('change', () => {
        const item = currentItem();
        if (!item || !state.image) return;

        const edge = input.dataset.edge;
        state.enabledEdges[edge] = input.checked;

        if (!input.checked) {
          state.crop[edge] = 0;
        } else if (state.crop[edge] === 0) {
          const estimated = item.estimatedCrop?.[edge] || 0;
          state.crop[edge] = estimated || fallbackEdgeCrop(
            state.image.naturalWidth,
            state.image.naturalHeight,
            edge,
          );
        }

        state.crop = normalizeCrop(
          state.crop,
          state.image.naturalWidth,
          state.image.naturalHeight,
        );
        state.manualTouched = true;

        item.crop = cloneCrop(state.crop);
        item.enabledEdges = cloneEdges(state.enabledEdges);
        item.manualTouched = true;
        item.inheritedBatchAdjustment = false;
        item.saved = false;

        if (state.lastManualBatchAdjustment?.edge === edge) {
          state.lastManualBatchAdjustment = null;
        }

        state.compareOriginal = false;
        updateBatchUI();
        updateCompareState();
        updateEdgeControls();
        updateEditState();
        setMessage(els.exportMessage, '');
        syncControls();
        drawPreview();
      });
    });

    els.modeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        state.mode = button.dataset.mode;
        state.items.forEach((item) => {
          item.autoDirty = true;
          item.saved = false;
        });
        updateModeButtons();
        applyAutoCrop();
      });
    });

    els.safeMargin.addEventListener('change', () => {
      state.items.forEach((item) => {
        item.autoDirty = true;
        item.saved = false;
      });
      updateBatchUI();
      applyAutoCrop();
    });
    els.autoAgainButton.addEventListener('click', applyAutoCrop);

    [
      [els.cropTop, 'top'],
      [els.cropBottom, 'bottom'],
      [els.cropLeft, 'left'],
      [els.cropRight, 'right'],
    ].forEach(([input, edge]) => {
      input.addEventListener('input', () => {
        if (!state.image || !state.enabledEdges[edge]) return;
        state.compareOriginal = false;
        updateCompareState();
        state.crop[edge] = Number(input.value);
        state.crop = normalizeCrop(state.crop, state.image.naturalWidth, state.image.naturalHeight);
        state.manualTouched = true;
        markCurrentItemUnsaved();
        recordManualBatchAdjustment(edge);
        storeCurrentItemState();
        updateBatchUI();
        setMessage(els.exportMessage, '');
        updateEditState();
        syncControls();
        scheduleInteractiveRender(false);
      });
    });

    els.compareButton.addEventListener('click', () => {
      state.compareOriginal = !state.compareOriginal;
      updateCompareState();
      drawPreview();
    });

    els.previewCanvas.addEventListener('pointerdown', onPointerDown);
    els.previewCanvas.addEventListener('pointermove', onPointerMove);
    els.previewCanvas.addEventListener('pointerup', onPointerUp);
    els.previewCanvas.addEventListener('pointercancel', onPointerUp);

    els.saveButton.addEventListener('click', saveImage);
    els.quickSaveButton.addEventListener('click', saveImage);
    els.copyButton.addEventListener('click', copyImageToClipboard);
    els.quickCopyButton.addEventListener('click', copyImageToClipboard);
    els.saveAllIndividualButton.addEventListener('click', saveAllIndividually);
    els.saveAllButton.addEventListener('click', saveAllAsZip);
    els.reviewNextButton.addEventListener('click', activateNextUnreviewed);
    els.shareButton.addEventListener('click', shareImage);
    els.quickShareButton.addEventListener('click', shareImage);

    window.addEventListener('resize', debounce(() => {
      invalidatePreviewCache();
      drawPreview();
    }, 120));
    window.addEventListener('pagehide', () => {
      if (interactiveFrameId) window.cancelAnimationFrame(interactiveFrameId);
      interactiveFrameId = 0;
      interactiveNeedsControls = false;
      releaseAllObjectUrls();
    }, { once: true });
  }

  function currentItem() {
    return state.currentIndex >= 0 ? state.items[state.currentIndex] : null;
  }

  function createItem(file) {
    return {
      id: ++itemSequence,
      file,
      objectUrl: URL.createObjectURL(file),
      thumbnailUrl: '',
      thumbnailPromise: null,
      thumbnailFailed: false,
      width: 0,
      height: 0,
      detected: 'generic',
      boundaries: {},
      estimatedCrop: null,
      crop: null,
      enabledEdges: null,
      profileMatch: null,
      inheritedBatchAdjustment: false,
      appliedPresetSlot: 0,
      manualTouched: false,
      visited: false,
      saved: false,
      autoDirty: true,
    };
  }

  function releaseItemUrls(item) {
    if (!item) return;
    decodeCache.remove(item.id);
    if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
    if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
    item.objectUrl = '';
    item.thumbnailUrl = '';
  }

  function releaseAllObjectUrls() {
    decodeCache.clear();
    state.items.forEach((item) => {
      if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
      if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
      item.objectUrl = '';
      item.thumbnailUrl = '';
    });
    invalidatePreviewCache();
  }

  function totalBatchBytes() {
    return state.items.reduce((sum, item) => sum + item.file.size, 0);
  }

  async function addFiles(files) {
    let skippedFormat = 0;
    let skippedLimit = 0;
    let added = 0;
    let bytes = totalBatchBytes();
    const startIndex = state.items.length;

    for (const file of files) {
      if (validateFile(file)) {
        skippedFormat += 1;
        continue;
      }
      if (state.items.length >= CONFIG.maxBatchCount || bytes + file.size > CONFIG.maxBatchBytes) {
        skippedLimit += 1;
        continue;
      }
      state.items.push(createItem(file));
      bytes += file.size;
      added += 1;
    }

    updateBatchUI();

    if (added > 0) {
      const target = state.currentIndex < 0 ? startIndex : state.currentIndex;
      await activateItem(target, { scroll: state.currentIndex < 0 });
    }

    if (skippedFormat || skippedLimit) {
      const parts = [];
      if (skippedFormat) parts.push(`${skippedFormat}枚は対応形式外または25MB超過`);
      if (skippedLimit) parts.push(`${skippedLimit}枚は最大8枚・合計50MBの上限超過`);
      setMessage(els.uploadMessage, `${parts.join('、')}のため追加しませんでした。`, 'error');
    } else if (added > 1) {
      setMessage(els.uploadMessage, `${added}枚を追加しました。画像はすべてブラウザ内だけで扱います。`, 'success');
    } else {
      setMessage(els.uploadMessage, '');
    }
  }

  function removeCurrentItem() {
    if (state.currentIndex < 0) return;
    removeItemAt(state.currentIndex);
  }

  function resetEditor() {
    state.currentIndex = -1;
    state.image = null;
    state.crop = { top: 0, right: 0, bottom: 0, left: 0 };
    state.detected = 'generic';
    state.compareOriginal = false;
    state.selectedPresetSlot = 0;
    state.lastManualBatchAdjustment = null;
    invalidatePreviewCache();
    state.manualTouched = false;
    els.editorSection.hidden = true;
    updateBatchUI();
    updateQuickActions();
    setMessage(els.uploadMessage, '');
    setMessage(els.exportMessage, '');
    updatePresetUI();
  }

  function decodeItem(item) {
    return decodeCache.get(item.id, item.objectUrl);
  }

  async function ensureThumbnail(item, decodedImage = null) {
    if (!item || item.thumbnailFailed || item.thumbnailUrl) return item?.thumbnailUrl || '';
    if (item.thumbnailPromise) return item.thumbnailPromise;

    item.thumbnailPromise = (async () => {
      let temporaryImage = null;
      try {
        const image = decodedImage || await decodeObjectUrl(item.objectUrl);
        if (!decodedImage) temporaryImage = image;
        const blob = await createThumbnailBlob(image);
        if (!state.items.includes(item)) return '';
        item.thumbnailUrl = URL.createObjectURL(blob);
        updateBatchUI();
        return item.thumbnailUrl;
      } catch (error) {
        item.thumbnailFailed = true;
        console.warn('Thumbnail generation skipped:', error);
        return '';
      } finally {
        if (temporaryImage) {
          try { temporaryImage.src = ''; } catch {}
        }
        item.thumbnailPromise = null;
      }
    })();

    return item.thumbnailPromise;
  }

  let thumbnailHydrationScheduled = false;
  function scheduleThumbnailHydration() {
    if (thumbnailHydrationScheduled || state.items.length <= 1) return;
    thumbnailHydrationScheduled = true;

    const schedule = window.requestIdleCallback
      ? (callback) => window.requestIdleCallback(callback, { timeout: 1200 })
      : (callback) => window.setTimeout(() => callback({ timeRemaining: () => 0 }), 120);

    schedule(async (deadline) => {
      thumbnailHydrationScheduled = false;
      for (const item of state.items) {
        if (item.thumbnailUrl || item.thumbnailPromise || item.thumbnailFailed) continue;
        await ensureThumbnail(item);
        if (typeof deadline.timeRemaining === 'function' && deadline.timeRemaining() < 4) break;
      }
      if (state.items.some((item) => !item.thumbnailUrl && !item.thumbnailPromise && !item.thumbnailFailed)) {
        scheduleThumbnailHydration();
      }
    });
  }

  function invalidatePreviewCache() {
    state.previewCache.itemId = 0;
    state.previewCache.width = 0;
    state.previewCache.height = 0;
    state.previewCache.canvas = null;
  }

  function getPreviewBase(drawW, drawH) {
    const item = currentItem();
    const cache = state.previewCache;
    if (
      item
      && cache.itemId === item.id
      && cache.width === drawW
      && cache.height === drawH
      && cache.canvas
    ) {
      return cache.canvas;
    }

    const canvas = document.createElement('canvas');
    canvas.width = drawW;
    canvas.height = drawH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(state.image, 0, 0, drawW, drawH);

    cache.itemId = item?.id || 0;
    cache.width = drawW;
    cache.height = drawH;
    cache.canvas = canvas;
    return canvas;
  }

  function markCurrentItemUnsaved() {
    const item = currentItem();
    if (!item || !item.saved) return;
    item.saved = false;
    updateBatchUI();
  }

  function edgesForAutoType(type, preferredEdge = '') {
    const edges = { top: false, bottom: false, left: false, right: false };
    const edge = preferredEdge || (type === 'desktop-landscape' ? 'bottom' : 'top');
    if (EDGE_KEYS.includes(edge)) edges[edge] = true;
    else edges.top = true;
    return edges;
  }

  function cropFromRememberedProfile(profile, width, height) {
    const crop = { top: 0, right: 0, bottom: 0, left: 0 };
    if (profile && EDGE_KEYS.includes(profile.edge)) {
      crop[profile.edge] = profile.cropPx;
    }
    return normalizeCrop(crop, width, height);
  }

  function computeAutoForItem(item, image) {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const profileMatch = state.mode === 'auto'
      ? resolveProfile(state.profiles, width, height)
      : null;

    if (profileMatch?.profile) {
      const rememberedCrop = cropFromRememberedProfile(profileMatch.profile, width, height);
      item.width = width;
      item.height = height;
      item.detected = profileMatch.detected;
      item.profileMatch = profileMatch;
      item.boundaries = {};
      item.estimatedCrop = rememberedCrop;
      item.enabledEdges = edgesForAutoType(profileMatch.detected, profileMatch.profile.edge);
      item.crop = rememberedCrop;
      item.inheritedBatchAdjustment = false;
      item.manualTouched = false;
      item.autoDirty = false;
      return;
    }

    const forcedType = state.mode === 'auto' && profileMatch?.matchType === 'rotated-device'
      ? profileMatch.detected
      : '';
    const boundaries = forcedType
      ? analyzeImageEdges(image, forcedType)
      : (item.boundaries && Object.keys(item.boundaries).length
        ? item.boundaries
        : analyzeImageEdges(image));
    const estimate = estimateCrop(
      width,
      height,
      forcedType || state.mode,
      els.safeMargin.checked,
      boundaries,
    );

    item.width = width;
    item.height = height;
    item.detected = estimate.appliedType || estimate.detected;
    item.profileMatch = profileMatch;
    item.boundaries = boundaries;
    item.estimatedCrop = estimate.crop;
    item.enabledEdges = edgesForAutoType(
      item.detected,
      profileMatch?.suggestedEdge || '',
    );
    const shouldKeepZeroDesktopCrop = state.mode === 'auto'
      && item.detected === 'desktop-landscape'
      && !profileMatch?.profile
      && estimate.crop.bottom === 0;
    item.crop = shouldKeepZeroDesktopCrop
      ? normalizeCrop(estimate.crop, width, height)
      : buildSelectedCrop(estimate.crop, item.enabledEdges, width, height);
    item.inheritedBatchAdjustment = false;
    item.manualTouched = false;
    item.autoDirty = false;
  }

  function adjustmentDeviceKey(item) {
    return item?.profileMatch?.deviceKey
      || item?.profileMatch?.profile?.deviceKey
      || '';
  }

  function recordManualBatchAdjustment(edge) {
    const item = currentItem();
    if (!item || !EDGE_KEYS.includes(edge) || !state.enabledEdges[edge]) return;
    const cropPx = Math.max(0, Math.round(state.crop[edge] || 0));
    if (!cropPx) return;

    item.inheritedBatchAdjustment = false;
    state.lastManualBatchAdjustment = {
      detected: state.detected,
      edge,
      cropPx,
      deviceKey: adjustmentDeviceKey(item),
      sourceItemId: item.id,
    };
  }

  function canApplyManualBatchAdjustment(item, adjustment) {
    if (!item || !adjustment || !item.crop || item.manualTouched || item.saved) return false;
    if (adjustment.detected === 'generic' || item.detected === 'generic') return false;
    if (item.detected !== adjustment.detected) return false;
    if (!EDGE_KEYS.includes(adjustment.edge) || !item.enabledEdges?.[adjustment.edge]) return false;

    const itemDeviceKey = adjustmentDeviceKey(item);
    if (adjustment.deviceKey && itemDeviceKey && adjustment.deviceKey !== itemDeviceKey) return false;
    return true;
  }

  function applyManualBatchAdjustment(item) {
    const adjustment = state.lastManualBatchAdjustment;
    if (!canApplyManualBatchAdjustment(item, adjustment)) {
      item.inheritedBatchAdjustment = false;
      return false;
    }

    const nextCrop = cloneCrop(item.crop);
    nextCrop[adjustment.edge] = adjustment.cropPx;
    item.crop = normalizeCrop(nextCrop, item.width, item.height);
    item.inheritedBatchAdjustment = true;
    item.saved = false;
    return true;
  }

  let nextPreparationToken = 0;
  function scheduleNextItemPreparation() {
    const token = ++nextPreparationToken;
    const nextItem = state.items[state.currentIndex + 1];
    if (!nextItem) return;

    const schedule = window.requestIdleCallback
      ? (callback) => window.requestIdleCallback(callback, { timeout: 900 })
      : (callback) => window.setTimeout(callback, 120);

    schedule(async () => {
      if (token !== nextPreparationToken) return;
      if (state.items[state.currentIndex + 1] !== nextItem) return;

      try {
        const image = await decodeItem(nextItem);
        if (token !== nextPreparationToken) return;
        if (state.items[state.currentIndex + 1] !== nextItem) return;

        if (!nextItem.crop || nextItem.autoDirty || !nextItem.width || !nextItem.height) {
          computeAutoForItem(nextItem, image);
        }
      } catch (error) {
        if (error?.message !== 'decode-cancelled') {
          console.warn('Next image preparation skipped:', error);
        }
      }
    });
  }

  async function activateItem(index, options = {}) {
    if (index < 0 || index >= state.items.length) return;
    if (index === state.currentIndex && state.image) {
      updateBatchUI();
      scheduleNextItemPreparation();
      if (options.scroll) requestAnimationFrame(scrollEditorIntoView);
      return;
    }

    const token = ++state.activationToken;
    const item = state.items[index];

    storeCurrentItemState();
    state.currentIndex = index;
    state.selectedPresetSlot = 0;
    state.compareOriginal = false;
    updateBatchUI();
    updateCompareState();
    setMessage(els.exportMessage, '');
    setMessage(els.uploadMessage, '画像を読み込んでいます…', 'info');

    try {
      const image = await decodeItem(item);
      if (token !== state.activationToken) return;

      if (!item.crop || item.autoDirty || !item.width || !item.height) {
        computeAutoForItem(item, image);
      }
      applyManualBatchAdjustment(item);
      item.visited = true;

      state.image = image;
      invalidatePreviewCache();
      void ensureThumbnail(item, image);
      state.detected = item.detected;
      state.crop = cloneCrop(item.crop);
      state.enabledEdges = cloneEdges(item.enabledEdges || defaultEdges());
      state.manualTouched = Boolean(item.manualTouched);

      configureRanges();
      els.editorSection.hidden = false;
      document.body.classList.add('has-editor');

      els.detectedLabel.textContent = deviceLabel(state.detected);
      updateModeButtons();
      updateEdgeControls();
      updateEditState();
      syncControls();
      drawPreview();
      updateBatchUI();
      updatePresetUI();
      updateQuickActions();
      setMessage(els.uploadMessage, '');

      if (options.scroll) {
        requestAnimationFrame(scrollEditorIntoView);
      }
      scheduleThumbnailHydration();
      scheduleNextItemPreparation();
    } catch (error) {
      if (token !== state.activationToken) return;
      console.error(error);
      const code = error?.message || '';
      const message = code === 'too-many-pixels' || code === 'too-large-dimension'
        ? '画像の解像度が大きすぎるため、この画像を一覧から外しました。'
        : code === 'decode-timeout'
          ? '読み込みに時間がかかりすぎたため、この画像を一覧から外しました。'
          : '読み込めない画像だったため、一覧から外しました。';
      setMessage(els.uploadMessage, message, 'error');
      removeItemAt(index);
    }
  }

  function storeCurrentItemState() {
    const item = currentItem();
    if (!item || !state.image) return;
    item.crop = cloneCrop(state.crop);
    item.enabledEdges = cloneEdges(state.enabledEdges);
    item.manualTouched = Boolean(state.manualTouched);
    if (item.manualTouched) item.inheritedBatchAdjustment = false;
    item.detected = state.detected;
    item.width = state.image.naturalWidth;
    item.height = state.image.naturalHeight;
  }

  function syncStateFromCurrentItem() {
    const item = currentItem();
    if (!item || !item.crop) return;
    state.crop = cloneCrop(item.crop);
    state.enabledEdges = cloneEdges(item.enabledEdges || defaultEdges());
  }

  function removeItemAt(index) {
    const item = state.items[index];
    if (!item) return;
    releaseItemUrls(item);
    state.items.splice(index, 1);

    if (!state.items.length) {
      resetEditor();
      return;
    }

    const nextIndex = Math.min(index, state.items.length - 1);
    state.currentIndex = -1;
    invalidatePreviewCache();
    updateBatchUI();
    activateItem(nextIndex);
  }

  function applyAutoCrop() {
    const item = currentItem();
    if (!item || !state.image) return;
    computeAutoForItem(item, state.image);
    item.saved = false;

    state.detected = item.detected;
    state.crop = cloneCrop(item.crop);
    state.enabledEdges = cloneEdges(item.enabledEdges || defaultEdges());
    state.manualTouched = false;
    item.inheritedBatchAdjustment = false;
    state.compareOriginal = false;
    setMessage(els.exportMessage, '');

    els.detectedLabel.textContent = deviceLabel(state.detected);
    updateModeButtons();
    updateEdgeControls();
    updateCompareState();
    updateEditState();
    syncControls();
    drawPreview();
    updateBatchUI();
  }

  function deviceLabel(type) {
    if (type === 'phone-portrait') return 'スマホ縦長のスクショらしい形';
    if (type === 'phone-landscape') return 'スマホ横長のスクショらしい形';
    if (type === 'desktop-landscape') return 'PC・横長画面らしい形';
    return '一般画像（手動確認がおすすめ）';
  }

  function updateModeButtons() {
    els.modeButtons.forEach((button) => {
      const active = button.dataset.mode === state.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function updateEdgeControls() {
    els.edgeInputs.forEach((input) => {
      const active = Boolean(state.enabledEdges[input.dataset.edge]);
      input.checked = active;
      input.closest('.edge-toggle')?.classList.toggle('is-active', active);
    });

    [
      [els.cropTop, 'top'],
      [els.cropBottom, 'bottom'],
      [els.cropLeft, 'left'],
      [els.cropRight, 'right'],
    ].forEach(([input, edge]) => {
      const enabled = Boolean(state.enabledEdges[edge]);
      input.disabled = !enabled;
      input.closest('.range-row')?.classList.toggle('is-disabled', !enabled);
    });
  }

  function updateCompareState() {
    els.compareButton.setAttribute('aria-pressed', String(state.compareOriginal));
    els.compareButton.textContent = state.compareOriginal ? '編集に戻る' : '元画像と比較';
    if (els.canvasHelp) {
      els.canvasHelp.textContent = state.compareOriginal
        ? '元画像を表示中です'
        : '黄色いバーを指やマウスで動かして微調整できます';
    }
  }

  function updateEditState() {
    els.editState.textContent = state.manualTouched ? '手動調整済み' : '自動調整';
    if (!els.readyHint) return;

    if (!state.image) {
      els.readyHint.textContent = '自動調整中…';
    } else if (state.manualTouched) {
      els.readyHint.textContent = '調整済み。このまま保存できます';
    } else if (currentItem()?.inheritedBatchAdjustment) {
      els.readyHint.textContent = '前の画像で調整した位置に合わせました。そのまま微調整できます';
    } else if (currentItem()?.profileMatch?.matchType === 'profile') {
      els.readyHint.textContent = '前回使った切り取り位置に合わせました。そのまま保存できます';
    } else if (state.detected === 'generic') {
      els.readyHint.textContent = '自動候補を表示しました。黄色いバーだけ確認してください';
    } else {
      els.readyHint.textContent = '自動調整済み。このまま保存できます';
    }
  }

  function updatePresetUI() {
    if (!els.presetSlotButtons?.length) return;

    els.presetSlotButtons.forEach((button) => {
      const slot = Number(button.dataset.presetSlot);
      const preset = getPreset(state.presets, slot);
      const selected = slot === state.selectedPresetSlot;
      button.classList.toggle('is-registered', Boolean(preset));
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute(
        'aria-label',
        `プリセット${slot}（${preset ? '登録済み' : '未登録'}）`,
      );
      const stateLabel = button.querySelector('[data-preset-state]');
      if (stateLabel) stateLabel.textContent = preset ? '✓' : '＋';
    });

    const slot = state.selectedPresetSlot;
    if (!slot || !state.image) {
      els.presetManager.hidden = true;
      return;
    }

    const preset = getPreset(state.presets, slot);
    els.presetManager.hidden = false;
    if (preset) {
      els.presetManagerText.textContent = `プリセット${slot}を選択中。変更は上書き保存するまでプリセットへ反映されません。`;
      els.presetSaveButton.textContent = '現在の切り方で上書き';
      els.presetDeleteButton.textContent = `プリセット${slot}を削除`;
      els.presetDeleteButton.hidden = false;
    } else {
      els.presetManagerText.textContent = `プリセット${slot}は未登録です。黄色いバーを合わせてから保存してください。`;
      els.presetSaveButton.textContent = '現在の切り方を保存';
      els.presetDeleteButton.hidden = true;
    }
  }

  function onPresetSlotClick(event) {
    if (!state.image) return;
    const slot = Number(event.currentTarget?.dataset?.presetSlot || 0);
    if (!slot) return;

    state.selectedPresetSlot = slot;
    const preset = getPreset(state.presets, slot);
    if (preset) applyPresetToCurrentImage(slot, preset);
    updatePresetUI();
  }

  function applyPresetToCurrentImage(slot, preset) {
    const item = currentItem();
    if (!item || !state.image || !preset) return;

    state.enabledEdges = cloneEdges(preset.enabledEdges);
    state.crop = normalizeCrop(
      cloneCrop(preset.crop),
      state.image.naturalWidth,
      state.image.naturalHeight,
    );
    state.manualTouched = true;
    state.compareOriginal = false;

    item.crop = cloneCrop(state.crop);
    item.enabledEdges = cloneEdges(state.enabledEdges);
    item.manualTouched = true;
    item.inheritedBatchAdjustment = false;
    item.appliedPresetSlot = slot;
    item.saved = false;

    updateCompareState();
    updateEditState();
    syncControls();
    drawPreview();
    updateBatchUI();
    setMessage(els.exportMessage, '');
    showToast(`プリセット${slot}を適用しました ✓`, 3200);
  }

  function saveSelectedPreset() {
    const slot = state.selectedPresetSlot;
    if (!slot || !state.image) return;

    const result = setPreset(state.presets, slot, state.enabledEdges, state.crop);
    if (!savePresets(result.presets)) {
      showToast('プリセットを保存できませんでした。ブラウザの保存設定をご確認ください。', 5000);
      return;
    }

    state.presets = result.presets;
    const item = currentItem();
    if (item) item.appliedPresetSlot = slot;
    updatePresetUI();
    showToast(`プリセット${slot}を保存しました ✓`, 3600);
  }

  function deleteSelectedPreset() {
    const slot = state.selectedPresetSlot;
    if (!slot) return;

    const result = deletePreset(state.presets, slot);
    if (!result.deleted) {
      updatePresetUI();
      return;
    }
    if (!savePresets(result.presets)) {
      showToast('プリセットを削除できませんでした。ブラウザの保存設定をご確認ください。', 5000);
      return;
    }

    state.presets = result.presets;
    state.items.forEach((item) => {
      if (item.appliedPresetSlot === slot) item.appliedPresetSlot = 0;
    });
    updatePresetUI();
    showToast(`プリセット${slot}を削除しました。`, 3200);
  }

  function closePresetManager() {
    state.selectedPresetSlot = 0;
    updatePresetUI();
  }

  function batchStatus(item) {
    if (item?.saved) return { key: 'saved', label: '保存済' };
    if (item?.manualTouched) return { key: 'adjusted', label: '調整済' };
    if (item?.visited) return { key: 'auto', label: '自動' };
    return { key: 'unreviewed', label: '未確認' };
  }

  function activateNextUnreviewed() {
    const index = state.items.findIndex((item) => !item.visited);
    if (index >= 0) activateItem(index);
  }

  function createBatchButton(item, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'batch-item';
    button.dataset.itemId = String(item.id);
    button.setAttribute('role', 'listitem');
    button.setAttribute('aria-label', `${index + 1}枚目を編集`);

    const previewSlot = document.createElement('span');
    previewSlot.className = 'batch-preview-slot';

    const number = document.createElement('span');
    number.className = 'batch-item-index';

    const status = document.createElement('span');
    status.className = 'batch-item-status';

    button.append(previewSlot, number, status);
    return button;
  }

  function onBatchListClick(event) {
    const button = event.target.closest?.('.batch-item');
    if (!button || !els.batchList.contains(button)) return;
    const itemId = Number(button.dataset.itemId);
    const index = state.items.findIndex((item) => item.id === itemId);
    if (index >= 0) activateItem(index);
  }

  function syncBatchPreview(button, item) {
    const slot = button.querySelector('.batch-preview-slot');
    if (!slot) return;

    const currentUrl = slot.dataset.thumbnailUrl || '';
    if (item.thumbnailUrl && currentUrl !== item.thumbnailUrl) {
      const image = document.createElement('img');
      image.src = item.thumbnailUrl;
      image.alt = '';
      image.decoding = 'async';
      slot.replaceChildren(image);
      slot.dataset.thumbnailUrl = item.thumbnailUrl;
      return;
    }

    if (!item.thumbnailUrl && currentUrl) {
      slot.replaceChildren();
      delete slot.dataset.thumbnailUrl;
    }

    if (!item.thumbnailUrl && slot.childElementCount === 0) {
      const placeholder = document.createElement('span');
      placeholder.className = 'batch-item-placeholder';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.textContent = '▧';
      slot.append(placeholder);
    }
  }

  function syncBatchList() {
    const needsRebuild = els.batchList.children.length !== state.items.length
      || state.items.some((item, index) => (
        els.batchList.children[index]?.dataset.itemId !== String(item.id)
      ));

    if (needsRebuild) {
      const fragment = document.createDocumentFragment();
      state.items.forEach((item, index) => fragment.append(createBatchButton(item, index)));
      els.batchList.replaceChildren(fragment);
    }

    state.items.forEach((item, index) => {
      const button = els.batchList.children[index];
      if (!button) return;
      const isCurrent = index === state.currentIndex;
      const status = batchStatus(item);
      button.classList.toggle('is-current', isCurrent);
      button.classList.toggle('is-saved', status.key === 'saved');
      button.dataset.status = status.key;
      if (isCurrent) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
      button.setAttribute('aria-label', `${index + 1}枚目・${status.label}・編集`);

      const number = button.querySelector('.batch-item-index');
      if (number) number.textContent = String(index + 1);
      const statusLabel = button.querySelector('.batch-item-status');
      if (statusLabel) statusLabel.textContent = status.label;
      syncBatchPreview(button, item);
    });
  }

  function updateBatchUI() {
    const count = state.items.length;
    const current = state.currentIndex;

    document.body.classList.toggle('has-batch', count > 1);
    els.batchProgress.hidden = count <= 1;
    els.batchStrip.hidden = count <= 1;
    els.saveAllIndividualButton.hidden = count <= 1;
    els.saveAllButton.hidden = count <= 1;
    els.batchAutoNote.hidden = count <= 1;
    els.removeCurrentButton.hidden = count === 0;
    els.batchReview.hidden = count <= 1;

    if (count === 0) {
      els.batchProgress.textContent = '';
      els.batchProgress.hidden = true;
      els.batchList.replaceChildren();
      lastBatchScrolledIndex = -1;
      return;
    }

    els.batchProgress.textContent = count === 1
      ? '1枚を編集中'
      : `${count}枚中 ${Math.max(1, current + 1)}枚目`;

    els.prevImageButton.disabled = current <= 0;
    els.nextImageButton.disabled = current < 0 || current >= count - 1;

    els.saveButton.textContent = count > 1 && current < count - 1
      ? 'この画像を保存して次へ'
      : count > 1 ? 'この画像を保存' : '画像を保存';
    els.saveAllIndividualButton.textContent = `${count}枚を個別保存`;
    els.saveAllButton.textContent = `${count}枚を1つにまとめる（ZIP）`;
    els.quickSaveButton.textContent = count > 1 && current < count - 1 ? '保存→次へ' : '保存';

    if (count > 1) {
      const unreviewedCount = state.items.filter((item) => !item.visited).length;
      const adjustedCount = state.items.filter((item) => item.manualTouched).length;
      if (unreviewedCount > 0) {
        els.batchReviewText.textContent = `${unreviewedCount}枚はまだ画面で確認していません。自動候補のまま一括保存することもできます。`;
        els.reviewNextButton.hidden = false;
      } else {
        els.batchReviewText.textContent = adjustedCount > 0
          ? `全${count}枚を確認済み・${adjustedCount}枚を調整済み`
          : `全${count}枚を確認済み`;
        els.reviewNextButton.hidden = true;
      }
    }

    syncBatchList();
    if (current >= 0 && current !== lastBatchScrolledIndex) {
      lastBatchScrolledIndex = current;
      requestAnimationFrame(() => {
        els.batchList.querySelector('.batch-item.is-current')?.scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
        });
      });
    }
  }

  function configureRanges() {
    const width = state.image.naturalWidth;
    const height = state.image.naturalHeight;
    els.cropTop.max = Math.round(height * 0.28);
    els.cropBottom.max = Math.round(height * 0.28);
    els.cropLeft.max = Math.round(width * 0.25);
    els.cropRight.max = Math.round(width * 0.25);
  }

  function syncControls() {
    if (!state.image) return;

    [
      [els.cropTop, els.cropTopValue, 'top'],
      [els.cropBottom, els.cropBottomValue, 'bottom'],
      [els.cropLeft, els.cropLeftValue, 'left'],
      [els.cropRight, els.cropRightValue, 'right'],
    ].forEach(([input, output, edge]) => {
      input.value = String(state.crop[edge]);
      output.textContent = `${state.crop[edge].toLocaleString()}px`;
    });

    updateEdgeControls();

    const sourceW = state.image.naturalWidth;
    const sourceH = state.image.naturalHeight;
    const resultW = sourceW - state.crop.left - state.crop.right;
    const resultH = sourceH - state.crop.top - state.crop.bottom;
    const activeParts = EDGE_KEYS
      .filter((edge) => state.enabledEdges[edge] && state.crop[edge] > 0)
      .map((edge) => {
        const labels = { top: '上', bottom: '下', left: '左', right: '右' };
        return `${labels[edge]} ${state.crop[edge].toLocaleString()}px`;
      });

    els.resultSize.textContent = `${resultW.toLocaleString()} × ${resultH.toLocaleString()}px`;
    els.removedSummary.textContent = activeParts.length
      ? `${activeParts.join('・')}をカット`
      : '端は切りません（メタデータのみ除去）';
  }

  function drawPreview() {
    if (!state.image || !els.previewCanvas || !els.canvasShell) return;

    const imageW = state.image.naturalWidth;
    const imageH = state.image.naturalHeight;
    const { scale, drawW, drawH } = computeLayout(
      imageW,
      imageH,
      els.canvasShell.clientWidth,
      window.innerHeight,
      CONFIG,
    );

    const canvas = els.previewCanvas;
    if (canvas.width !== drawW || canvas.height !== drawH) {
      canvas.width = drawW;
      canvas.height = drawH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const base = getPreviewBase(drawW, drawH);
    if (!base) return;
    ctx.clearRect(0, 0, drawW, drawH);
    ctx.drawImage(base, 0, 0);

    if (state.compareOriginal) return;
    drawCropOverlay(ctx, drawW, drawH, scaleCrop(state.crop, scale), state.enabledEdges);
  }

  function pointerPosition(event) {
    const rect = els.previewCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (els.previewCanvas.width / rect.width),
      y: (event.clientY - rect.top) * (els.previewCanvas.height / rect.height),
    };
  }

  function onPointerDown(event) {
    if (!state.image) return;
    const edge = findClosestEdge({
      position: pointerPosition(event),
      canvasWidth: els.previewCanvas.width,
      canvasHeight: els.previewCanvas.height,
      imageWidth: state.image.naturalWidth,
      imageHeight: state.image.naturalHeight,
      crop: state.crop,
      enabledEdges: state.enabledEdges,
      compareOriginal: state.compareOriginal,
    });
    if (!edge) return;
    state.draggingEdge = edge;
    els.previewCanvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!state.image || !state.draggingEdge) return;
    const pos = pointerPosition(event);
    const imageX = (pos.x / els.previewCanvas.width) * state.image.naturalWidth;
    const imageY = (pos.y / els.previewCanvas.height) * state.image.naturalHeight;
    const width = state.image.naturalWidth;
    const height = state.image.naturalHeight;
    const minRemain = CONFIG.minRemainPx;

    if (state.draggingEdge === 'top') {
      state.crop.top = clamp(imageY, 0, height - state.crop.bottom - minRemain);
    } else if (state.draggingEdge === 'bottom') {
      state.crop.bottom = clamp(height - imageY, 0, height - state.crop.top - minRemain);
    } else if (state.draggingEdge === 'left') {
      state.crop.left = clamp(imageX, 0, width - state.crop.right - minRemain);
    } else if (state.draggingEdge === 'right') {
      state.crop.right = clamp(width - imageX, 0, width - state.crop.left - minRemain);
    }

    state.crop = normalizeCrop(state.crop, width, height);
    state.compareOriginal = false;
    state.manualTouched = true;
    markCurrentItemUnsaved();
    recordManualBatchAdjustment(state.draggingEdge);
    updateCompareState();
    updateEditState();
    storeCurrentItemState();
    setMessage(els.exportMessage, '');
    scheduleInteractiveRender();
    event.preventDefault();
  }

  function onPointerUp(event) {
    if (!state.draggingEdge) return;
    flushInteractiveRender();
    updateBatchUI();
    state.draggingEdge = '';
    if (els.previewCanvas.hasPointerCapture?.(event.pointerId)) {
      els.previewCanvas.releasePointerCapture(event.pointerId);
    }
  }

  function scheduleInteractiveRender(syncControlsOnFrame = true) {
    interactiveNeedsControls ||= syncControlsOnFrame;
    if (interactiveFrameId) return;
    interactiveFrameId = window.requestAnimationFrame(() => {
      interactiveFrameId = 0;
      if (interactiveNeedsControls) syncControls();
      interactiveNeedsControls = false;
      drawPreview();
    });
  }

  function flushInteractiveRender() {
    if (!interactiveFrameId) return;
    window.cancelAnimationFrame(interactiveFrameId);
    interactiveFrameId = 0;
    if (interactiveNeedsControls) syncControls();
    interactiveNeedsControls = false;
    drawPreview();
  }

  function scrollEditorIntoView() {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    els.editorSection.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function debounce(fn, wait) {
    let timer = 0;
    return (...args) => {
      clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), wait);
    };
  }

  function setMessage(element, message = '', tone = '') {
    element.textContent = message;
    if (tone) element.dataset.tone = tone;
    else delete element.dataset.tone;
  }

  async function pasteFromClipboard() {
    setMessage(els.uploadMessage, '');
    if (!navigator.clipboard?.read) {
      setMessage(els.uploadMessage, 'このブラウザでは画像の直接貼り付けに対応していません。画像を選ぶボタンをご利用ください。', 'error');
      return;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      const files = [];
      for (const clipboardItem of clipboardItems) {
        const imageType = clipboardItem.types.find((type) => isAllowedMimeType(type));
        if (!imageType) continue;
        const blob = await clipboardItem.getType(imageType);
        files.push(new File([blob], `clipboard-image-${files.length + 1}`, { type: imageType }));
      }
      if (files.length) await addFiles(files);
      else setMessage(els.uploadMessage, 'クリップボードにPNG・JPG・WebP画像が見つかりませんでした。', 'error');
    } catch (error) {
      console.warn(error);
      setMessage(els.uploadMessage, 'クリップボードを読み取れませんでした。画像を選ぶボタンをご利用ください。', 'error');
    }
  }

  function canCopyImageToClipboard() {
    return Boolean(navigator.clipboard?.write && typeof window.ClipboardItem === 'function');
  }

  function canShareImage() {
    return Boolean(navigator.share && typeof File === 'function');
  }

  function updateQuickActions() {
    const active = Boolean(state.image && state.items.length);
    document.body.classList.toggle('has-editor', active);

    if (els.quickActionDock) els.quickActionDock.hidden = !active;

    const copyAvailable = active && canCopyImageToClipboard();
    els.copyButton.hidden = !copyAvailable;
    els.quickCopyButton.hidden = !copyAvailable;

    const shareAvailable = active && canShareImage();
    els.shareButton.hidden = !shareAvailable;
    els.quickShareButton.hidden = !shareAvailable;
  }

  function setButtonsBusy(buttons, busy, busyLabel = '処理中…') {
    buttons.filter(Boolean).forEach((button) => {
      if (busy) {
        if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.textContent = busyLabel;
      } else {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        if (button.dataset.idleLabel) {
          button.textContent = button.dataset.idleLabel;
          delete button.dataset.idleLabel;
        }
      }
    });
  }

  function rememberableCrop(item) {
    if (!item?.crop || !item.width || !item.height) return null;
    const edges = item.enabledEdges || defaultEdges();
    const candidates = EDGE_KEYS
      .filter((edge) => edges[edge] && Number(item.crop[edge]) > 0)
      .map((edge) => ({ edge, cropPx: Math.round(item.crop[edge]) }));

    if (!candidates.length) return null;
    const preferred = item.profileMatch?.profile?.edge;
    return candidates.find((candidate) => candidate.edge === preferred)
      || candidates.sort((a, b) => b.cropPx - a.cropPx)[0];
  }

  function showToast(message, duration = 4000) {
    if (!els.profileToast) return;
    window.clearTimeout(profileToastTimer);
    els.profileToast.textContent = message;
    els.profileToast.hidden = false;
    requestAnimationFrame(() => els.profileToast.classList.add('is-visible'));
    profileToastTimer = window.setTimeout(() => {
      els.profileToast.classList.remove('is-visible');
      window.setTimeout(() => {
        if (!els.profileToast.classList.contains('is-visible')) els.profileToast.hidden = true;
      }, 180);
    }, duration);
  }

  function showProfileToast() {
    showToast(
      'この切り取り位置を覚えました ✓\n次回から同じ端末のスクショは、自動でこの位置に合わせます。\n高さはいつでも黄色いバーを動かして変更できます。',
      9000,
    );
  }

  function rememberSuccessfulItems(items) {
    let nextProfiles = state.profiles;
    let changed = false;

    items.forEach((item) => {
      const remembered = rememberableCrop(item);
      if (!remembered) return;
      const result = upsertProfile(nextProfiles, {
        width: item.width,
        height: item.height,
        detected: item.detected,
        edge: remembered.edge,
        cropPx: remembered.cropPx,
      });
      nextProfiles = result.profiles;
      changed ||= result.changed;
    });

    if (!changed || !saveProfiles(nextProfiles)) return false;
    state.profiles = nextProfiles;

    state.items.forEach((item) => {
      item.profileMatch = item.width && item.height
        ? resolveProfile(state.profiles, item.width, item.height)
        : item.profileMatch;
      if (!items.includes(item) && !item.manualTouched && !item.saved) {
        item.autoDirty = true;
      }
    });

    showProfileToast();
    return true;
  }

  async function copyImageToClipboard() {
    const item = currentItem();
    if (!item || !state.image || !canCopyImageToClipboard()) return;

    storeCurrentItemState();
    const buttons = [els.copyButton, els.quickCopyButton];
    setButtonsBusy(buttons, true, 'コピー中…');
    setMessage(els.exportMessage, '貼り付け用画像を作っています…', 'info');

    try {
      const blobPromise = exportCroppedBlob(
        state.image,
        item.file,
        state.crop,
        { mime: 'image/png' },
      ).then(({ blob }) => blob);
      const clipboardItem = new window.ClipboardItem({ 'image/png': blobPromise });
      await navigator.clipboard.write([clipboardItem]);
      rememberSuccessfulItems([item]);
      setMessage(els.exportMessage, '加工画像をコピーしました。投稿先へそのまま貼り付けられます。', 'success');
    } catch (error) {
      console.warn(error);
      setMessage(
        els.exportMessage,
        '画像をクリップボードへコピーできませんでした。「画像を保存」をご利用ください。',
        'error',
      );
    } finally {
      setButtonsBusy(buttons, false);
    }
  }

  async function prepareItemForExport(item) {
    const image = item === currentItem() && state.image
      ? state.image
      : await decodeItem(item);
    if (!item.crop || item.autoDirty || !item.width || !item.height) {
      computeAutoForItem(item, image);
    }
    return { image, crop: cloneCrop(item.crop) };
  }

  function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function saveImage() {
    const item = currentItem();
    if (!item || !state.image) return;

    storeCurrentItemState();
    const saveButtons = [els.saveButton, els.quickSaveButton];
    setButtonsBusy(saveButtons, true, '作成中…');
    setMessage(els.exportMessage, '保存用画像を作っています…', 'info');

    try {
      const { blob, name } = await exportCroppedBlob(state.image, item.file, state.crop);
      triggerDownload(blob, name);
      rememberSuccessfulItems([item]);
      item.saved = true;
      updateBatchUI();

      const hasNext = state.items.length > 1 && state.currentIndex < state.items.length - 1;
      if (hasNext) {
        const nextIndex = state.currentIndex + 1;
        await activateItem(nextIndex);
        setMessage(els.exportMessage, `${nextIndex}枚目を保存しました。次の画像です。`, 'success');
      } else {
        setMessage(els.exportMessage, '保存用画像を作成しました。元画像は変更していません。', 'success');
      }
    } catch (error) {
      console.error(error);
      setMessage(els.exportMessage, '画像の書き出しに失敗しました。切る範囲を少し戻して、もう一度お試しください。', 'error');
    } finally {
      setButtonsBusy(saveButtons, false);
      updateBatchUI();
    }
  }

  async function saveAllIndividually() {
    if (state.items.length <= 1) return;
    storeCurrentItemState();

    const originalLabel = els.saveAllIndividualButton.textContent;
    const batchButtons = [
      els.saveAllIndividualButton,
      els.saveAllButton,
      els.saveButton,
      els.quickSaveButton,
      els.copyButton,
      els.quickCopyButton,
      els.shareButton,
      els.quickShareButton,
    ].filter(Boolean);

    batchButtons.forEach((button) => { button.disabled = true; });
    els.saveAllIndividualButton.setAttribute('aria-busy', 'true');
    setMessage(els.exportMessage, '個別ファイルとして保存する画像を準備しています…', 'info');

    try {
      const downloads = [];
      for (let index = 0; index < state.items.length; index += 1) {
        const item = state.items[index];
        els.saveAllIndividualButton.textContent = `準備中 ${index + 1} / ${state.items.length}`;
        const { image, crop } = await prepareItemForExport(item);
        const result = await exportCroppedBlob(image, item.file, crop);
        const prefix = `${String(index + 1).padStart(2, '0')}-`;
        downloads.push({
          name: outputName(item.file, result.mime, prefix),
          blob: result.blob,
        });
      }

      downloads.forEach(({ blob, name }) => triggerDownload(blob, name));
      rememberSuccessfulItems(state.items);
      state.items.forEach((item) => { item.saved = true; });
      updateBatchUI();
      setMessage(
        els.exportMessage,
        `${state.items.length}枚の個別保存を開始しました。ブラウザが複数ダウンロードの確認を表示した場合は許可してください。`,
        'success',
      );
    } catch (error) {
      console.error(error);
      setMessage(
        els.exportMessage,
        '個別保存の準備に失敗しました。ZIP保存を使うか、枚数を減らしてお試しください。',
        'error',
      );
    } finally {
      batchButtons.forEach((button) => { button.disabled = false; });
      els.saveAllIndividualButton.removeAttribute('aria-busy');
      els.saveAllIndividualButton.textContent = originalLabel;
      updateBatchUI();
    }
  }

  async function saveAllAsZip() {
    if (state.items.length <= 1) return;
    storeCurrentItemState();

    const originalLabel = els.saveAllButton.textContent;
    els.saveAllButton.disabled = true;
    [els.saveAllIndividualButton, els.saveButton, els.quickSaveButton, els.copyButton, els.quickCopyButton, els.shareButton, els.quickShareButton]
      .filter(Boolean)
      .forEach((button) => { button.disabled = true; });
    els.saveAllButton.setAttribute('aria-busy', 'true');
    setMessage(els.exportMessage, '未確認の画像も自動判定してZIPを作っています…', 'info');

    try {
      const entries = [];
      for (let index = 0; index < state.items.length; index += 1) {
        const item = state.items[index];
        els.saveAllButton.textContent = `ZIPを作成中 ${index + 1} / ${state.items.length}`;
        const { image, crop } = await prepareItemForExport(item);
        const result = await exportCroppedBlob(image, item.file, crop);
        const prefix = `${String(index + 1).padStart(2, '0')}-`;
        entries.push({
          name: outputName(item.file, result.mime, prefix),
          blob: result.blob,
        });
      }

      const zip = await createStoredZip(entries);
      triggerDownload(zip, `screenshot-safe-${state.items.length}files.zip`);
      rememberSuccessfulItems(state.items);
      state.items.forEach((item) => { item.saved = true; });
      updateBatchUI();
      setMessage(els.exportMessage, `${state.items.length}枚を自動処理してZIPにまとめました。`, 'success');
    } catch (error) {
      console.error(error);
      setMessage(els.exportMessage, 'まとめて保存に失敗しました。1枚ずつ保存するか、枚数を減らしてお試しください。', 'error');
    } finally {
      els.saveAllButton.disabled = false;
      [els.saveAllIndividualButton, els.saveButton, els.quickSaveButton, els.copyButton, els.quickCopyButton, els.shareButton, els.quickShareButton]
        .filter(Boolean)
        .forEach((button) => { button.disabled = false; });
      els.saveAllButton.removeAttribute('aria-busy');
      els.saveAllButton.textContent = originalLabel;
      updateBatchUI();
    }
  }

  async function shareImage() {
    const item = currentItem();
    if (!item || !state.image || !navigator.share) return;
    storeCurrentItemState();

    const shareButtons = [els.shareButton, els.quickShareButton];
    setButtonsBusy(shareButtons, true, '共有準備中…');
    setMessage(els.exportMessage, '共有用画像を作っています…', 'info');

    try {
      const { blob, mime, name } = await exportCroppedBlob(state.image, item.file, state.crop);
      const file = new File([blob], name, { type: mime });
      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        throw new Error('cannot-share-files');
      }
      await navigator.share({ files: [file], title: '切り抜いたスクリーンショット' });
      rememberSuccessfulItems([item]);
      setMessage(els.exportMessage, '共有メニューへ渡しました。', 'success');
    } catch (error) {
      if (error?.name === 'AbortError') {
        setMessage(els.exportMessage, '');
      } else {
        console.warn(error);
        setMessage(els.exportMessage, 'この端末では画像ファイルの共有に対応していないようです。「画像を保存」をご利用ください。', 'error');
      }
    } finally {
      setButtonsBusy(shareButtons, false);
    }
  }
})();
