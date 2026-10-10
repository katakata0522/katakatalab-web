/**
 * PikaLab - Theme Module
 * テーマ・ダークモード管理
 */

import { TIME_RANGES } from './constants.js';
import { userProfile, saveProfile } from './profile.js';
import { updateToggleSwitch } from './ui.js';

/**
 * 時間帯に応じたテーマを適用
 */
export function applyTimeBasedTheme(hour) {
    const body = document.body;
    body.classList.remove('theme-sunset', 'theme-night');

    if (hour >= TIME_RANGES.SUNSET_START && hour < TIME_RANGES.SUNSET_END) {
        body.classList.add('theme-sunset');
    } else if (hour >= TIME_RANGES.NIGHT_START || hour < TIME_RANGES.NIGHT_END) {
        body.classList.add('theme-night');
    }
}

/**
 * ダークモードを切り替え
 */
export function toggleDarkMode(playSound = null) {
    if (playSound) playSound('click');
    userProfile.darkMode = !userProfile.darkMode;
    saveProfile();
    applyTheme();
}

/**
 * テーマを適用
 */
export function applyTheme() {
    const body = document.body;

    body.classList.remove('theme-sunset', 'theme-night');

    if (userProfile.darkMode) {
        body.classList.add('theme-night');
    } else {
        const hour = new Date().getHours();
        applyTimeBasedTheme(hour);
    }

    // 共通ヘルパーを使用
    updateToggleSwitch('dark-mode-toggle', 'dark-mode-knob', userProfile.darkMode);
}

/**
 * 時間帯による挨拶とテーマ設定
 */
export function checkTimeGreeting(isLoginScreen) {
    const hour = new Date().getHours();
    let greeting = "ようこそ！";

    if (hour >= TIME_RANGES.MORNING_START && hour < TIME_RANGES.MORNING_END) {
        greeting = "おはよう！ 早起きだね！";
    } else if (hour >= TIME_RANGES.AFTERNOON_START && hour < TIME_RANGES.AFTERNOON_END) {
        greeting = "こんにちは！ 研究日和だね！";
    } else if (hour >= TIME_RANGES.EVENING_START && hour < TIME_RANGES.EVENING_END) {
        greeting = "こんばんは！ 今日もがんばったね。";
    } else {
        greeting = "こんばんは… 夜ふかしは ほどほどにね。";
    }

    if (isLoginScreen) {
        const loginGreeting = document.getElementById('login-greeting');
        if (loginGreeting) loginGreeting.textContent = greeting;
    }

    // 時間帯に合わせてテーマを変更（ダークモードがオフの場合のみ）
    if (!userProfile.darkMode) {
        applyTimeBasedTheme(hour);
    }
}
