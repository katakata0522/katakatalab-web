(() => {
  'use strict';

  const PROFILE_VERSION = 1;
  const STORAGE_KEY = 'screenshotCrop.deviceProfiles.v1';
  const MAX_PROFILES = 24;
  const EDGE_KEYS = Object.freeze(['top', 'bottom', 'left', 'right']);
  const DEVICE_CLASSES = Object.freeze(['phone', 'desktop', 'tablet']);

  function positiveInt(value) {
    const number = Math.round(Number(value));
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function orientationFor(width, height) {
    return Number(height) >= Number(width) ? 'portrait' : 'landscape';
  }

  function closeDimension(a, b, ratio = 0.02, minPx = 4) {
    const left = positiveInt(a);
    const right = positiveInt(b);
    if (!left || !right) return false;
    return Math.abs(left - right) <= Math.max(minPx, Math.round(Math.max(left, right) * ratio));
  }

  function sanitizeProfile(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const deviceClass = DEVICE_CLASSES.includes(raw.deviceClass) ? raw.deviceClass : '';
    const orientation = raw.orientation === 'portrait' || raw.orientation === 'landscape'
      ? raw.orientation
      : '';
    const baseWidth = positiveInt(raw.baseWidth);
    const baseHeight = positiveInt(raw.baseHeight);
    const edge = EDGE_KEYS.includes(raw.edge) ? raw.edge : '';
    const cropPx = positiveInt(raw.cropPx);
    const deviceKey = typeof raw.deviceKey === 'string' ? raw.deviceKey.slice(0, 80) : '';

    if (!deviceClass || !orientation || !baseWidth || !baseHeight || !edge || !cropPx || !deviceKey) {
      return null;
    }

    return {
      version: PROFILE_VERSION,
      deviceClass,
      orientation,
      baseWidth,
      baseHeight,
      edge,
      cropPx,
      deviceKey,
    };
  }

  function normalizeProfiles(profiles) {
    if (!Array.isArray(profiles)) return [];
    return profiles
      .map(sanitizeProfile)
      .filter(Boolean)
      .slice(-MAX_PROFILES);
  }

  function defaultStorage() {
    try {
      return typeof globalThis !== 'undefined' ? globalThis.localStorage || null : null;
    } catch {
      return null;
    }
  }

  function loadProfiles(storage = defaultStorage()) {
    if (!storage) return [];
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const source = Array.isArray(parsed) ? parsed : parsed?.profiles;
      return normalizeProfiles(source);
    } catch {
      return [];
    }
  }

  function saveProfiles(profiles, storage = defaultStorage()) {
    if (!storage) return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({
        version: PROFILE_VERSION,
        profiles: normalizeProfiles(profiles),
      }));
      return true;
    } catch {
      return false;
    }
  }

  function detectedTypeForProfile(profile) {
    if (profile.deviceClass === 'desktop') return 'desktop-landscape';
    if (profile.deviceClass === 'phone') {
      return profile.orientation === 'portrait' ? 'phone-portrait' : 'phone-landscape';
    }
    return 'generic';
  }

  function sameOrientationScore(profile, width, height) {
    if (profile.orientation !== orientationFor(width, height)) return -1;

    if (
      closeDimension(profile.baseWidth, width, 0.012)
      && closeDimension(profile.baseHeight, height, 0.012)
    ) {
      return 140;
    }

    if (profile.deviceClass === 'phone' && profile.orientation === 'portrait') {
      if (
        closeDimension(profile.baseWidth, width, 0.012)
        && height >= Math.round(profile.baseHeight * 0.82)
      ) {
        return 120;
      }
      return -1;
    }

    if (profile.deviceClass === 'phone' && profile.orientation === 'landscape') {
      if (
        closeDimension(profile.baseHeight, height, 0.012)
        && width >= Math.round(profile.baseWidth * 0.82)
      ) {
        return 116;
      }
      return -1;
    }

    if (profile.deviceClass === 'desktop' && profile.orientation === 'landscape') {
      if (
        closeDimension(profile.baseWidth, width, 0.02)
        && closeDimension(profile.baseHeight, height, 0.12)
      ) {
        return 108;
      }
    }

    return -1;
  }

  function rotatedPhoneScore(profile, width, height) {
    if (profile.deviceClass !== 'phone') return -1;
    const orientation = orientationFor(width, height);
    if (orientation === profile.orientation) return -1;

    const matchesRotation = closeDimension(profile.baseWidth, height, 0.025)
      && closeDimension(profile.baseHeight, width, 0.025);
    return matchesRotation ? 112 : -1;
  }

  function pickBest(profiles, scorer, width, height) {
    let best = null;
    let bestScore = -1;
    profiles.forEach((profile) => {
      const score = scorer(profile, width, height);
      if (score >= bestScore && score >= 0) {
        best = profile;
        bestScore = score;
      }
    });
    return { profile: best, score: bestScore };
  }

  function resolveProfile(profiles, width, height) {
    const normalized = normalizeProfiles(profiles);
    const direct = pickBest(normalized, sameOrientationScore, width, height);
    if (direct.profile) {
      return {
        matchType: 'profile',
        confidence: 'high',
        detected: detectedTypeForProfile(direct.profile),
        profile: direct.profile,
        linkedProfile: direct.profile,
        suggestedEdge: direct.profile.edge,
        deviceKey: direct.profile.deviceKey,
      };
    }

    const rotated = pickBest(normalized, rotatedPhoneScore, width, height);
    if (rotated.profile) {
      return {
        matchType: 'rotated-device',
        confidence: 'high',
        detected: orientationFor(width, height) === 'portrait'
          ? 'phone-portrait'
          : 'phone-landscape',
        profile: null,
        linkedProfile: rotated.profile,
        suggestedEdge: 'top',
        deviceKey: rotated.profile.deviceKey,
      };
    }

    return {
      matchType: 'none',
      confidence: 'low',
      detected: 'generic',
      profile: null,
      linkedProfile: null,
      suggestedEdge: '',
      deviceKey: '',
    };
  }

  function inferDeviceClass({ width, height, detected, edge, match }) {
    if (match?.profile?.deviceClass) return match.profile.deviceClass;
    if (match?.linkedProfile?.deviceClass) return match.linkedProfile.deviceClass;
    if (String(detected).startsWith('phone-')) return 'phone';
    if (detected === 'desktop-landscape') return 'desktop';

    const orientation = orientationFor(width, height);
    if (orientation === 'portrait') return 'phone';
    if (edge === 'top') return 'phone';
    if (edge === 'bottom') return 'desktop';
    return Number(width) >= 1200 ? 'desktop' : 'phone';
  }

  function buildDeviceKey(deviceClass, width, height, inheritedKey = '') {
    if (inheritedKey) return inheritedKey;
    const w = positiveInt(width);
    const h = positiveInt(height);
    if (deviceClass === 'phone' || deviceClass === 'tablet') {
      return `${deviceClass}:${Math.min(w, h)}x${Math.max(w, h)}`;
    }
    return `${deviceClass}:${w}x${h}`;
  }

  function upsertProfile(profiles, input = {}) {
    const normalized = normalizeProfiles(profiles);
    const width = positiveInt(input.width);
    const height = positiveInt(input.height);
    const cropPx = positiveInt(input.cropPx);
    const edge = EDGE_KEYS.includes(input.edge) ? input.edge : '';

    if (!width || !height || !cropPx || !edge) {
      return { profiles: normalized, changed: false, created: false, profile: null };
    }

    const match = resolveProfile(normalized, width, height);
    const deviceClass = DEVICE_CLASSES.includes(input.deviceClass)
      ? input.deviceClass
      : inferDeviceClass({
          width,
          height,
          detected: input.detected,
          edge,
          match,
        });
    const orientation = orientationFor(width, height);

    let existingIndex = -1;
    if (match.profile && match.profile.orientation === orientation) {
      existingIndex = normalized.findIndex((profile) => (
        profile.deviceKey === match.profile.deviceKey
        && profile.orientation === match.profile.orientation
      ));
    } else if (match.deviceKey) {
      existingIndex = normalized.findIndex((profile) => (
        profile.deviceKey === match.deviceKey
        && profile.orientation === orientation
      ));
    }

    if (existingIndex >= 0) {
      const existing = normalized[existingIndex];
      if (existing.edge === edge && existing.cropPx === cropPx) {
        return { profiles: normalized, changed: false, created: false, profile: existing };
      }

      const updated = {
        ...existing,
        edge,
        cropPx,
      };
      const next = normalized.slice();
      next.splice(existingIndex, 1);
      next.push(updated);
      return {
        profiles: next.slice(-MAX_PROFILES),
        changed: true,
        created: false,
        profile: updated,
      };
    }

    const deviceKey = buildDeviceKey(
      deviceClass,
      width,
      height,
      match.deviceKey || input.deviceKey || '',
    );
    const created = {
      version: PROFILE_VERSION,
      deviceClass,
      orientation,
      baseWidth: width,
      baseHeight: height,
      edge,
      cropPx,
      deviceKey,
    };

    return {
      profiles: [...normalized, created].slice(-MAX_PROFILES),
      changed: true,
      created: true,
      profile: created,
    };
  }

  const api = Object.freeze({
    PROFILE_VERSION,
    STORAGE_KEY,
    MAX_PROFILES,
    EDGE_KEYS,
    orientationFor,
    sanitizeProfile,
    normalizeProfiles,
    loadProfiles,
    saveProfiles,
    resolveProfile,
    inferDeviceClass,
    upsertProfile,
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ScreenshotCropDeviceProfiles = api;
})();
