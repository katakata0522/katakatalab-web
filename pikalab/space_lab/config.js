// ============================================================
// ほしぞら・アドベンチャー - config.js
// アプリケーションの設定、マジックナンバー、共通CSSクラスの定義
// ============================================================

export const CONFIG = {
    // ---- Canvas Animations & Layout ----
    CANVAS: {
        BASE_SCALE_MOBILE: 0.65,
        START_PAD_MOBILE: 60,
        START_PAD_PC: 120,
        FLOAT_AMPLITUDE: 12, // 惑星の上下浮遊幅 (px)
        FLOAT_SPEED: 0.7,    // 浮遊アニメーションの速度係数
        HOVER_SCALE: 1.13,   // ホバー時の惑星拡大率
    },
    
    // ---- Audio Frequencies ----
    AUDIO: {
        BGM_FREQ1: 40,
        BGM_FREQ2: 40.5,
        BGM_LFO_FREQ: 0.05,
    },

    // ---- UI Settings ----
    UI: {
        // UFO出現確率とインターバル
        UFO_INTERVAL_MS: 10000,
        UFO_SPAWN_CHANCE: 0.1,
        // オートワープのアニメーション時間
        WARP_DURATION_MS: 800,
    },

    // ---- LocalStorage Key ----
    STORAGE_KEY_VISITED: 'pikalab_spacelab_visited',
    STORAGE_KEY_BADGE: 'pikalab_badge_space-lab',
    STORAGE_KEY_SOLVED_QUIZZES: 'pikalab_spacelab_solved_quizzes',
    STORAGE_KEY_BGM_MUTED: 'pikalab_spacelab_bgm_muted',
    STORAGE_KEY_READ_SECRETS: 'pikalab_spacelab_read_secrets',
    
    // ---- Tailwind CSS Classes (JSで動的生成するもの) ----
    CLASSES: {
        QUIZ_BTN: 'w-full text-left px-5 py-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-2xl text-white font-bold transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 backdrop-blur-sm whitespace-normal break-words',
        QUIZ_BTN_CORRECT: 'w-full text-left px-5 py-4 bg-green-500/10 border-2 border-green-500 rounded-2xl text-green-300 font-bold transition-all backdrop-blur-sm shadow-[0_0_15px_rgba(34,197,94,0.2)] flex items-center justify-between whitespace-normal break-words',
        QUIZ_BTN_WRONG:   'w-full text-left px-5 py-4 bg-red-500/10 border-2 border-red-500 rounded-2xl text-red-300 font-bold transition-all backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.2)] flex items-center justify-between whitespace-normal break-words',
        QUIZ_BTN_DISABLED:'w-full text-left px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white/40 font-bold backdrop-blur-sm pointer-events-none whitespace-normal break-words',
        SECRET_TAB: 'text-left w-full p-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-3 group',
        SECRET_TAB_ACTIVE_BASE: 'border-indigo-500 bg-slate-700', // split by space if needed
        MINIMAP_BTN: 'absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 transition-all cursor-pointer shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-1 focus:ring-offset-slate-900 z-20',
        MINIMAP_BTN_VISITED: 'bg-emerald-500 border-emerald-300 hover:bg-emerald-400 hover:scale-125 hover:shadow-[0_0_12px_rgba(16,185,129,0.9)]',
        MINIMAP_BTN_UNVISITED: 'bg-slate-700 border-slate-400 hover:bg-cyan-400 hover:border-cyan-300 hover:scale-125 hover:shadow-[0_0_12px_rgba(6,182,212,0.9)]',
    }
};

// 惑星固有のサイズ定義
export const PLANET_RADII = {
    sun: 90, mercury: 35, venus: 52, earth: 58,
    mars: 40, jupiter: 78, saturn: 74, uranus: 52, neptune: 50
};

// 惑星間の距離（ギャップ）定義
export const PLANET_GAP = {
    sun: 80, mercury: 70, venus: 80, earth: 90,
    mars: 100, jupiter: 130, saturn: 150, uranus: 120, neptune: 60
};

// グローエフェクトの色定義
export const GLOW_COLORS = {
    sun:     'rgba(251,146,60,0.9)',  mercury: 'rgba(156,163,175,0.7)',
    venus:   'rgba(250,204,21,0.7)',  earth:   'rgba(59,130,246,0.9)',
    mars:    'rgba(239,68,68,0.8)',   jupiter: 'rgba(251,146,60,0.6)',
    saturn:  'rgba(250,204,21,0.6)',  uranus:  'rgba(147,197,253,0.7)',
    neptune: 'rgba(37,99,235,0.8)'
};
