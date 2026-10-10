(() => {
  'use strict';

  const PRESET_VERSION = 1;
  const STORAGE_KEY = 'screenshotCrop.cropPresets.v1';
  const SLOT_COUNT = 3;
  const EDGE_KEYS = Object.freeze(['top', 'bottom', 'left', 'right']);

  function normalizeSlot(slot) {
    const number = Math.round(Number(slot));
    return number >= 1 && number <= SLOT_COUNT ? number : 0;
  }

  function cloneEdges(edges) {
    return {
      top: Boolean(edges?.top),
      bottom: Boolean(edges?.bottom),
      left: Boolean(edges?.left),
      right: Boolean(edges?.right),
    };
  }

  function cloneCrop(crop) {
    return {
      top: Math.max(0, Math.round(Number(crop?.top) || 0)),
      bottom: Math.max(0, Math.round(Number(crop?.bottom) || 0)),
      left: Math.max(0, Math.round(Number(crop?.left) || 0)),
      right: Math.max(0, Math.round(Number(crop?.right) || 0)),
    };
  }

  function sanitizePreset(raw, fallbackSlot = 0) {
    if (!raw || typeof raw !== 'object') return null;
    const slot = normalizeSlot(raw.slot || fallbackSlot);
    if (!slot) return null;

    const enabledEdges = cloneEdges(raw.enabledEdges);
    const crop = cloneCrop(raw.crop);
    EDGE_KEYS.forEach((edge) => {
      if (!enabledEdges[edge]) crop[edge] = 0;
    });

    return {
      version: PRESET_VERSION,
      slot,
      enabledEdges,
      crop,
    };
  }

  function emptyPresets() {
    return Array.from({ length: SLOT_COUNT }, () => null);
  }

  function normalizePresets(source) {
    const result = emptyPresets();
    if (!Array.isArray(source)) return result;

    source.forEach((raw, index) => {
      const preset = sanitizePreset(raw, index + 1);
      if (preset) result[preset.slot - 1] = preset;
    });
    return result;
  }

  function defaultStorage() {
    try {
      return typeof globalThis !== 'undefined' ? globalThis.localStorage || null : null;
    } catch {
      return null;
    }
  }

  function loadPresets(storage = defaultStorage()) {
    if (!storage) return emptyPresets();
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return emptyPresets();
      const parsed = JSON.parse(raw);
      return normalizePresets(Array.isArray(parsed) ? parsed : parsed?.presets);
    } catch {
      return emptyPresets();
    }
  }

  function savePresets(presets, storage = defaultStorage()) {
    if (!storage) return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({
        version: PRESET_VERSION,
        presets: normalizePresets(presets),
      }));
      return true;
    } catch {
      return false;
    }
  }

  function getPreset(presets, slot) {
    const normalizedSlot = normalizeSlot(slot);
    if (!normalizedSlot) return null;
    return normalizePresets(presets)[normalizedSlot - 1];
  }

  function setPreset(presets, slot, enabledEdges, crop) {
    const normalizedSlot = normalizeSlot(slot);
    const next = normalizePresets(presets);
    if (!normalizedSlot) {
      return { presets: next, preset: null, changed: false };
    }

    const preset = sanitizePreset({
      slot: normalizedSlot,
      enabledEdges,
      crop,
    });
    if (!preset) {
      return { presets: next, preset: null, changed: false };
    }

    const previous = next[normalizedSlot - 1];
    const changed = JSON.stringify(previous) !== JSON.stringify(preset);
    next[normalizedSlot - 1] = preset;
    return { presets: next, preset, changed };
  }

  function deletePreset(presets, slot) {
    const normalizedSlot = normalizeSlot(slot);
    const next = normalizePresets(presets);
    if (!normalizedSlot) return { presets: next, deleted: false };

    const deleted = Boolean(next[normalizedSlot - 1]);
    next[normalizedSlot - 1] = null;
    return { presets: next, deleted };
  }

  const api = Object.freeze({
    PRESET_VERSION,
    STORAGE_KEY,
    SLOT_COUNT,
    EDGE_KEYS,
    emptyPresets,
    normalizePresets,
    loadPresets,
    savePresets,
    getPreset,
    setPreset,
    deletePreset,
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ScreenshotCropPresets = api;
})();
