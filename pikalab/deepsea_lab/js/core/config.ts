export const CONFIG = {
    LIGHT: {
        OFF_MAX_DEPTH: 200,
        AUTO_MAX_DEPTH: 1000,
        ACTIVE_MAX_DEPTH: 9000,
        MAX_DEPTH: 10000,
        MAX_DARKNESS: 0.98,
        MAX_INTENSITY: 0.85
    },
    STORAGE: {
        KEY: 'deepsea_captured_ids',
        VERSION: 1
    },
    EVENTS: {
        PHOTO_CAPTURED: 'PHOTO_CAPTURED',
        DATA_RESET: 'DATA_RESET',
        FIELD_RENDERED: 'FIELD_RENDERED',
        TIME_CHANGED: 'TIME_CHANGED',
        DEPTH_CHANGED: 'depth:changed'
    },
    AUDIO: {
        SONAR_FREQ: 800,
        SONAR_DURATION: 1.5,
        LPF_MAX_FREQ: 1000,
        LPF_MIN_FREQ: 100
    },
    SONAR: {
        COOLDOWN_MS: 2000,
        WAVE_DURATION_MS: 3000,
        DETECTION_RADIUS_VH: 1.5 // viewport height multiplier
    },
    SCROLL: {
        SURFACE_OFFSET: 450,
        MAX_DEPTH: 10000
    },
    DIVER_HEIGHT: 1.7
} as const;
