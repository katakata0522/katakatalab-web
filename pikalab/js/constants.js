/**
 * PikaLab - Constants & Configuration
 * 定数とアプリケーション設定を一元管理
 */

// トップの既存起動経路を変えず、季節限定の補助導線だけを追加する
import './summer-homework.js';

// --- タイミング定数 (単位: ミリ秒) ---
export const TIMING = {
    TRANSITION: 500,           // 画面遷移アニメーション
    LAUNCH_DELAY: 1500,        // アプリ起動前の待機時間
    MENU_DELAY: 200,           // メニュー表示の遅延
    MENU_CLOSE: 200,           // メニューを閉じるアニメーション
    MENU_OPEN_DELAY: 10,       // メニュー開くアニメーション開始遅延
    HERO_TRANSITION: 300,      // ヒーローセクション切り替え
    MODAL_FADE: 10,            // モーダルフェードアニメーション開始遅延
    OVERLAY_HIDE: 1000         // オーバーレイ非表示までの待機時間
};

// --- 時間帯の境界値 (単位: 時) ---
export const TIME_RANGES = {
    MORNING_START: 5,          // 朝の開始
    MORNING_END: 10,           // 朝の終了
    AFTERNOON_START: 10,       // 昼の開始
    AFTERNOON_END: 17,         // 昼の終了（夕方開始）
    EVENING_START: 17,         // 夕方の開始
    EVENING_END: 21,           // 夕方の終了（夜開始）
    SUNSET_START: 16,          // 夕焼けテーマ開始
    SUNSET_END: 19,            // 夕焼けテーマ終了（夜テーマ開始）
    NIGHT_START: 19,           // 夜テーマ開始
    NIGHT_END: 5               // 夜テーマ終了（翌朝まで）
};

// --- サウンド定数 ---
export const SOUND_EFFECTS = {
    hover: { freq: 880, dur: 0.04, type: 'sine', vol: 0.05 },
    click: { freq: 659, dur: 0.08, type: 'sine', vol: 0.07 },
    success: [
        { freq: 523, dur: 0.12, type: 'sine', vol: 0.06, delay: 0 },
        { freq: 659, dur: 0.12, type: 'sine', vol: 0.06, delay: 60 },
        { freq: 784, dur: 0.15, type: 'sine', vol: 0.06, delay: 120 }
    ],
    launch: [
        { freq: 440, dur: 0.08, type: 'sine', vol: 0.05, delay: 0 },
        { freq: 554, dur: 0.08, type: 'sine', vol: 0.05, delay: 80 },
        { freq: 659, dur: 0.12, type: 'sine', vol: 0.06, delay: 160 }
    ],
    badge: [
        { freq: 784, dur: 0.08, type: 'sine', vol: 0.06, delay: 0 },
        { freq: 988, dur: 0.08, type: 'sine', vol: 0.06, delay: 100 },
        { freq: 1175, dur: 0.15, type: 'sine', vol: 0.07, delay: 200 }
    ],
    logo: [
        { freq: 523, dur: 0.06, type: 'sine', vol: 0.05, delay: 0 },
        { freq: 659, dur: 0.06, type: 'sine', vol: 0.05, delay: 40 },
        { freq: 784, dur: 0.08, type: 'sine', vol: 0.05, delay: 80 }
    ]
};

// --- ロゴカラー ---
export const LOGO_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];

// --- ストレージキー ---
// ※ 旧キー 'wonder_school_profile_v2' から移行済み（profile.js のloadProfile内で引き継ぎ処理）
export const STORAGE_KEY = 'pikalab_profile_v1';
export const STORAGE_KEY_LEGACY = 'wonder_school_profile_v2';

// --- カテゴリ関連 ---
export const TAB_BUTTON_IDS = ['btn-low', 'btn-high', 'btn-middle', 'btn-parents'];

export const GRID_TITLE_BY_CATEGORY = {
    parents: "保護者・サポートツール",
    middle: "すべてのラボ (All Access)",
    default: "おすすめのラボ"
};

// --- ヒーローセクション設定 ---
export const HERO_CONFIG = {
    low: {
        tagText: "1ねんせい 〜 3ねんせい",
        tagClass: "inline-block px-3 py-1 rounded-full bg-yellow-100 text-yellow-600 text-xs font-black mb-3",
        titleHtml: `いろ と おと で<br><span class="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-green-500">あそぼう！</span>`,
        description: "「まなびランド」や「リズム・スタジオ」が おすすめだよ。",
        iconName: "toys",
        iconClass: "material-symbols-rounded text-6xl md:text-8xl text-yellow-400"
    },
    high: {
        tagText: "4年生 〜 6年生",
        tagClass: "inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-xs font-black mb-3",
        titleHtml: `漢字 と 科学 に<br><span class="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">挑戦！</span>`,
        description: "「漢字パズル」や「速読」にチャレンジしよう。",
        iconName: "rocket_launch",
        iconClass: "material-symbols-rounded text-6xl md:text-8xl text-orange-400"
    },
    middle: {
        tagText: "中学生",
        tagClass: "inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-600 text-xs font-black mb-3",
        titleHtml: `クリエイティブな<br><span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">作品をつくろう</span>`,
        description: "全てのラボを使って、自由な発想で作品を作り出そう。",
        iconName: "auto_awesome",
        iconClass: "material-symbols-rounded text-6xl md:text-8xl text-indigo-400"
    },
    parents: {
        tagText: "お役立ちツール",
        tagClass: "inline-block px-3 py-1 rounded-full bg-teal-100 text-teal-600 text-xs font-black mb-3",
        titleHtml: `学習をサポートする<br><span class="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">便利な道具たち</span>`,
        description: "自由研究や読書感想文、日々の習慣化を助けるツール集です。",
        iconName: "handyman",
        iconClass: "material-symbols-rounded text-6xl md:text-8xl text-teal-400"
    }
};

// --- アバター設定 ---
export const AVATAR_ICON_MAP = {
    'face': 'face',
    'sentiment_satisfied': 'sentiment_satisfied',
    'psychology': 'psychology',
    'robot_2': 'robot_2'
};

export const AVATAR_EMOJI_MAP = {
    'face': '😄',
    'sentiment_satisfied': '😊',
    'psychology': '🧐',
    'robot_2': '🤖'
};

// --- 常に表示するアプリ ---
export const ALWAYS_VISIBLE_APPS = new Set(['focus-timer', 'speed-reader']);

// --- 審査期間中の表示制御 ---
export const SHOW_AMAZON_ASSOCIATE_CARD = false;

// --- 最近のアプリ最大数 ---
export const RECENT_MAX = 3;

// --- ラボ訪問数に応じた探索ランク ---
export const RANK_THRESHOLDS = [
    { min: 10, rank: 'ラボ・エクスプローラー', desc: 'たくさんのラボを見てまわったね！', progress: 100 },
    { min: 6, rank: 'ラボ・ナビゲーター', desc: 'いろいろなラボを探検中！', progress: 75 },
    { min: 3, rank: 'ラボ・スカウト', desc: '気になるラボが増えてきたね！', progress: 50 },
    { min: 1, rank: 'ラボ・ビギナー', desc: '最初のラボを見つけた！', progress: 25 },
    { min: 0, rank: 'はじめの一歩', desc: '気になるラボをひらいてみよう！', progress: 10 }
];

// --- アプリカード定義 ---
import { APP_DATA } from './app-data.js';
export const APP_DEFINITIONS = APP_DATA.apps;


// --- ラボ訪問スタンプ定義（保存IDは既存badgesを互換利用） ---
export const BADGE_DEFINITIONS = {
    ...Object.fromEntries(APP_DEFINITIONS.filter(app => app.badge).map(app => [app.id, { ...app.badge, name: app.appName }])),
    'first-login': { name: 'にゅうがく', icon: 'school', color: 'text-blue-500 bg-blue-50' }
};

// --- アプリ別メッセージ ---
export const APP_MESSAGES = {
    'default': '【準備中】\n現在、鋭意制作中です！\n公開をお楽しみに！'
};

// --- レーダーチャート（ラボ利用ダッシュボード）設定 ---
export const RADAR_CHART_CONFIG = {
    MAX_VAL: 10,
    LEVELS: 4,
    SIZE: 200,
    MAX_RADIUS: 60
};

export const GENRE_MAPPING = [
    { name: '国語', key: 'kokugo', apps: ['kanji-lab', 'speed-reader', 'typing-dojo', 'kotowaza-quiz', 'book-report'] },
    { name: '算数', key: 'sansu', apps: ['manabi-land', 'fraction-lab'] },
    { name: '理科', key: 'rika', apps: ['deepsea-lab', 'space-lab', 'science-maker'] },
    { name: '芸術', key: 'geijutsu', apps: ['color-lab', 'rhythm-lab'] },
    { name: '生活', key: 'seikatsu', apps: ['focus-timer', 'paper-gen', 'quest-board'] }
];