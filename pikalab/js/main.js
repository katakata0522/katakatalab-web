/**
 * PikaLab - Main Entry Point
 * 初期化・イベントバインディング
 * @version 7.5
 */

import { TAB_BUTTON_IDS, TIMING, RADAR_CHART_CONFIG, GENRE_MAPPING } from './constants.js';
import {
    startAudio,
    playSound,
    toggleMute,
    setVolume,
    changeLogoColor,
    initAudioEventListeners,
    restoreAudioSettings
} from './audio.js';
import {
    userProfile,
    loadProfile,
    saveProfile,
    batchProfileUpdates,
    resetUserData,
    addBadge,
    updateProfileUI,
    renderBadges,
    editUserName
} from './profile.js';
import { normalizeProfileName } from './profile-name.mjs';
import {
    applyTheme,
    toggleDarkMode,
    checkTimeGreeting
} from './theme.js';
import {
    openModal,
    closeModal,
    toggleMenu,
    maybeCloseMenu,
    setTextSize,
    toggleMotion,
    initUIEventListeners,
    applyUserSettings,
    showToast
} from './ui.js';
import {
    renderAppCards,
    filterApps,
    setCategory,
    setSearchTerm,
    clearSearch,
    updateRecentUI,
    updateMissionUI
} from './apps.js';

// Service Workerの登録はpikalab/index.htmlの#pikalab-register-swだけが担当する。

/**
 * イベントバインディング
 */
function bindUiEvents() {
    const loginModal = document.getElementById('login-modal');
    if (loginModal) loginModal.addEventListener('keydown', trapLoginModalFocus);

    // ログインボタン
    const enterLabBtn = document.getElementById('enter-lab-btn');
    if (enterLabBtn) enterLabBtn.addEventListener('click', enterLab);

    // ゲストとして入るボタン（スキップ）
    const guestEnterBtn = document.getElementById('guest-enter-btn');
    if (guestEnterBtn) guestEnterBtn.addEventListener('click', () => {
        // 名前入力欄を空にしてゲスト名のままenterLabを実行
        const nameInput = document.getElementById('user-name-input');
        if (nameInput) nameInput.value = '';
        enterLab();
    });

    // ロゴクリック
    const headerLogo = document.getElementById('header-logo');
    if (headerLogo) headerLogo.addEventListener('click', changeLogoColor);

    // サウンドトグル
    const mainSoundToggle = document.getElementById('main-sound-toggle');
    if (mainSoundToggle) mainSoundToggle.addEventListener('click', toggleMute);

    const settingsSoundToggle = document.getElementById('settings-sound-toggle');
    if (settingsSoundToggle) settingsSoundToggle.addEventListener('click', toggleMute);

    // 音量スライダー
    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => setVolume(e.target.value));
    }

    // タブボタン
    TAB_BUTTON_IDS.forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const cat = id.replace('btn-', '');
        btn.addEventListener('click', () => setCategory(cat));
    });

    // メニュートグル
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    if (menuToggleBtn) menuToggleBtn.addEventListener('click', () => {
        // 起動直後の履歴を次にメニューを開く時点で反映する。
        updateRecentUI();
        toggleMenu();
    });

    // 検索入力
    const searchInput = document.getElementById('app-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => setSearchTerm(e.target.value));
    }

    // 検索クリアボタン
    const searchClearBtn = document.getElementById('app-search-clear');
    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', clearSearch);
    }

    // 検索結果0件時のリセットボタン
    const resetSearchBtn = document.getElementById('reset-search-btn');
    if (resetSearchBtn) {
        resetSearchBtn.addEventListener('click', clearSearch);
    }

    // 各種モーダルを開くボタン（汎用ハンドラで統合）
    const modalActions = {
        'open-record': () => openModal('record-modal', () => {
            renderBadges();
            updateProfileUI();
            renderRadarChart();
        }),
        'open-parents': () => openModal('parents-modal'),
        'open-settings': () => openModal('settings-modal')
    };
    Object.entries(modalActions).forEach(([action, handler]) => {
        document.querySelectorAll(`[data-action="${action}"]`).forEach(btn => {
            btn.addEventListener('click', () => {
                handler();
                maybeCloseMenu(false);
            });
        });
    });

    // モーダルクローズボタン
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });

    // モーダル背景クリックで閉じる
    ['record-modal', 'settings-modal', 'parents-modal'].forEach(id => {
        const overlay = document.getElementById(id);
        if (!overlay) return;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(id);
        });
        const panel = overlay.firstElementChild;
        if (panel) panel.addEventListener('click', (e) => e.stopPropagation());
    });

    document.querySelectorAll('.modal-content').forEach(panel => {
        panel.addEventListener('click', (e) => e.stopPropagation());
    });

    // 設定モーダル内のボタン
    const textNormal = document.getElementById('text-normal');
    if (textNormal) textNormal.addEventListener('click', () => setTextSize('normal'));
    const textLarge = document.getElementById('text-large');
    if (textLarge) textLarge.addEventListener('click', () => setTextSize('large'));

    const motionToggle = document.getElementById('motion-toggle');
    if (motionToggle) motionToggle.addEventListener('click', toggleMotion);

    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) darkModeToggle.addEventListener('click', () => toggleDarkMode(playSound));

    const resetBtn = document.getElementById('reset-user-data-btn');
    if (resetBtn) resetBtn.addEventListener('click', resetUserData);

    const editNameBtn = document.getElementById('edit-name-btn');
    if (editNameBtn) editNameBtn.addEventListener('click', () => editUserName(playSound));

    // キーボードアクセシビリティ（Enter/Spaceでクリック発火）
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const active = document.activeElement;
            if (active && (active.getAttribute('role') === 'button' || active.hasAttribute('tabindex'))) {
                if (active.tagName !== 'BUTTON' && active.tagName !== 'A') {
                    e.preventDefault();
                    active.click();
                } else if (e.key === ' ' && active.tagName === 'BUTTON') {
                    e.preventDefault();
                    active.click();
                }
            }
        }
    });
}

/**
 * ログイン中はキーボードフォーカスをモーダル内に保つ
 * @param {KeyboardEvent} event - キーボードイベント
 */
function trapLoginModalFocus(event) {
    if (event.key !== 'Tab') return;

    const modal = document.getElementById('login-modal');
    if (!modal || modal.style.display === 'none') return;

    const focusable = Array.from(modal.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )).filter((element) => !element.hidden);

    if (focusable.length === 0) {
        event.preventDefault();
        modal.focus({ preventScroll: true });
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

// 音声の開始待ちや画面遷移中の連打でも、入室処理は一度だけ実行する。
let hasEnteredLab = false;

/**
 * ラボに入る（ログイン処理）
 */
function enterLab() {
    if (hasEnteredLab) return;
    hasEnteredLab = true;

    // 音声が保留・拒否されても、プロフィール保存と入室を妨げない。
    try {
        startAudio()
            .then(() => playSound('success'))
            .catch((e) => console.warn('Audio start failed:', e));
    } catch (e) {
        console.warn('Audio start failed:', e);
    }

    const nameInput = document.getElementById('user-name-input');
    const normalizedName = normalizeProfileName(nameInput?.value, '');
    if (normalizedName) {
        userProfile.name = normalizedName;
    }

    batchProfileUpdates(() => {
        userProfile.loginCount++;
        addBadge('first-login', playSound);
        // バッジ取得済みの再入室でも、名前とログイン回数を必ず保存する
        saveProfile();
    });

    updateProfileUI();
    // 画面遷移
    const modal = document.getElementById('login-modal');
    const main = document.getElementById('main-interface');

    if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
        if (modal) modal.style.display = 'none';
        if (main) {
            main.inert = false;
            main.classList.remove('opacity-0', 'pointer-events-none');
            main.classList.add('opacity-100');
        }
        setCategory('low');
    }, TIMING.TRANSITION);
}

/**
 * ログインモーダルを表示
 */
function showLogin() {
    const modal = document.getElementById('login-modal');
    const main = document.getElementById('main-interface');
    if (!modal || !main) return;
    modal.style.display = 'flex';
    modal.classList.remove('opacity-0', 'pointer-events-none');
    main.inert = true;
    main.classList.add('opacity-0', 'pointer-events-none');
    modal.focus({ preventScroll: true });
}

/**
 * アバターボタンのハイライト状態を更新
 * @param {NodeList} avatarBtns - アバターボタンのリスト
 * @param {string} avatarId - ハイライトするアバターのID
 */
function highlightAvatar(avatarBtns, avatarId) {
    avatarBtns.forEach(b => b.classList.remove('bg-indigo-100', 'border-indigo-400'));
    const target = Array.from(avatarBtns).find(b => b.dataset.avatar === avatarId) || avatarBtns[0];
    if (target) target.classList.add('bg-indigo-100', 'border-indigo-400');
}

/**
 * アバター選択の初期化
 */
function initAvatarSelector() {
    const avatarBtns = document.querySelectorAll('.avatar-option');

    avatarBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetBtn = e.currentTarget;
            highlightAvatar(avatarBtns, targetBtn.dataset.avatar);
            userProfile.avatar = targetBtn.dataset.avatar;
            playSound('click');

            // ぷるんっ（jelly）アニメーションを追加
            const icon = targetBtn.querySelector('.material-symbols-rounded');
            if (icon) {
                icon.classList.remove('animate-jelly');
                void icon.offsetWidth; // Reflowを強制
                icon.classList.add('animate-jelly');
            }
        });
        btn.addEventListener('mouseenter', () => playSound('hover'));
    });

    // 初期選択
    if (avatarBtns.length) {
        highlightAvatar(avatarBtns, userProfile.avatar);
    }
}

/**
 * オフライン・オンライン検知の初期化
 */
function initNetworkStatusMonitoring() {
    if (!navigator.onLine) {
        showToast('オフラインですが、すでにダウンロードされた機能はそのまま遊べます！', 'warning');
    }

    window.addEventListener('offline', () => {
        showToast('オフラインになりました。ダウンロード済みの機能はそのまま遊べます！', 'warning');
    });

    window.addEventListener('online', () => {
        showToast('ネットワークに接続されました！', 'success');
    });
}

/**
 * アプリケーション初期化
 */
function init() {
    // ネットワーク監視とオフライン検知の初期化
    initNetworkStatusMonitoring();

    // グローバルイベントリスナーの初期化（副作用をコントロール）
    initAudioEventListeners();
    initUIEventListeners();

    // アプリカードをレンダリング
    renderAppCards();

    // イベントバインディング
    bindUiEvents();

    // プロフィール読み込み
    const hasProfile = loadProfile();
    restoreAudioSettings();
    const modal = document.getElementById('login-modal');
    const main = document.getElementById('main-interface');

    if (hasProfile) {
        // 既存ユーザー
        updateProfileUI();
        updateRecentUI();
        filterApps();
        applyTheme();
        applyUserSettings(); // テキストサイズ・動きを減らすモードを復元

        // ログインモーダルスキップ
        if (modal && main) {
            modal.style.display = 'none';
            main.inert = false;
            main.classList.remove('opacity-0', 'pointer-events-none');
            main.classList.add('opacity-100');
        }

        setCategory('low');
        checkTimeGreeting(false);
    } else {
        // 新規ユーザー
        showLogin();
        checkTimeGreeting(true);
        updateRecentUI();
        filterApps();
        applyTheme();
    }

    // アバター選択の初期化
    initAvatarSelector();

    // デイリーミッションUIの更新
    updateMissionUI();
}

// --- DOMContentLoaded で初期化 ---
document.addEventListener('DOMContentLoaded', init);

/**
 * 学習ダッシュボード（SVGレーダーチャート）を描画する
 */
export function renderRadarChart() {
    const container = document.getElementById('radar-chart-container');
    if (!container) return;

    const { MAX_VAL, LEVELS, SIZE, MAX_RADIUS } = RADAR_CHART_CONFIG;
    const center = SIZE / 2;
    const playCounts = userProfile.playCounts || {};

    // グリッド線（同心五角形）を描画
    let gridMarkup = '';
    for (let j = 1; j <= LEVELS; j++) {
        const r = (MAX_RADIUS / LEVELS) * j;
        const points = [];
        for (let i = 0; i < 5; i++) {
            const theta = -Math.PI / 2 + i * (2 * Math.PI / 5);
            const px = center + r * Math.cos(theta);
            const py = center + r * Math.sin(theta);
            points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
        }
        gridMarkup += `<polygon points="${points.join(' ')}" fill="none" stroke="#e2e8f0" stroke-width="1" />`;
    }

    // 軸線の描画
    let axisMarkup = '';
    for (let i = 0; i < 5; i++) {
        const theta = -Math.PI / 2 + i * (2 * Math.PI / 5);
        const px = center + MAX_RADIUS * Math.cos(theta);
        const py = center + MAX_RADIUS * Math.sin(theta);
        axisMarkup += `<line x1="${center}" y1="${center}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2 2" />`;
    }

    // 各ジャンルのスコア計算
    const scores = GENRE_MAPPING.map(g => {
        const count = g.apps.reduce((sum, appId) => sum + (playCounts[appId] || 0), 0);
        return Math.min(MAX_VAL, count);
    });

    const hasData = scores.some(s => s > 0);
    const dataPoints = [];

    for (let i = 0; i < 5; i++) {
        const score = scores[i];
        const val = hasData ? score : 0;
        const r = (MAX_RADIUS / MAX_VAL) * val;
        const theta = -Math.PI / 2 + i * (2 * Math.PI / 5);
        const px = center + r * Math.cos(theta);
        const py = center + r * Math.sin(theta);
        dataPoints.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }

    let dataMarkup = '';
    if (hasData) {
        dataMarkup += `<polygon points="${dataPoints.join(' ')}" class="radar-chart-polygon" fill="rgba(99, 102, 241, 0.2)" stroke="#6366f1" stroke-width="2.5" stroke-linejoin="round" />`;
        // 頂点のドット
        for (let i = 0; i < 5; i++) {
            const [px, py] = dataPoints[i].split(',').map(Number);
            dataMarkup += `<circle cx="${px}" cy="${py}" r="4.5" class="radar-chart-dot" style="animation-delay: ${i * 70}ms" fill="#6366f1" stroke="#ffffff" stroke-width="1.5" />`;
        }
    } else {
        dataMarkup += `<text x="${center}" y="${center + 5}" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">あそんで記録をのばそう！</text>`;
    }

    // ジャンルラベルの描画
    let labelMarkup = '';
    for (let i = 0; i < 5; i++) {
        const theta = -Math.PI / 2 + i * (2 * Math.PI / 5);
        const r = 78;
        let px = center + r * Math.cos(theta);
        let py = center + r * Math.sin(theta);
        
        let anchor = 'middle';
        if (Math.cos(theta) > 0.1) {
            anchor = 'start';
            px += 2;
        } else if (Math.cos(theta) < -0.1) {
            anchor = 'end';
            px -= 2;
        }
        
        if (Math.sin(theta) > 0.9) {
            py += 4;
        } else if (Math.sin(theta) < -0.9) {
            py -= 4;
        } else {
            py += 3;
        }

        labelMarkup += `<text x="${px.toFixed(1)}" y="${py.toFixed(1)}" text-anchor="${anchor}" fill="#475569" font-size="11" font-weight="900" class="font-pop">${GENRE_MAPPING[i].name}</text>`;
    }

    container.innerHTML = `
        <svg viewBox="0 0 ${SIZE} ${SIZE}" width="100%" height="100%" class="w-full h-full max-w-[220px] max-h-[220px] overflow-visible select-none">
            ${gridMarkup}
            ${axisMarkup}
            ${dataMarkup}
            ${labelMarkup}
        </svg>
    `;
}
