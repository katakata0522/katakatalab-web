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

const LOGIN_MODAL_FOCUSABLE_SELECTOR =
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * ログイン中はキーボードフォーカスをモーダル内に保つ
 * @param {KeyboardEvent} event - キーボードイベント
 */
function trapLoginModalFocus(event) {
    if (event.key !== 'Tab') return;

    const modal = document.getElementById('login-modal');
    if (!modal || modal.style.display === 'none') return;

    const focusable = Array.from(modal.querySelectorAll(LOGIN_MODAL_FOCUSABLE_SELECTOR))
        .filter((element) => !element.hidden);

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
    // onLine は端末の接続の目安であり、サイトへの通信可否ではない。
    // 初回表示では警告せず、閲覧中の状態変化だけを一度ずつ案内する。
    let connectionNoticeShown = false;

    window.addEventListener('offline', () => {
        if (connectionNoticeShown) return;
        connectionNoticeShown = true;
        showToast('通信が不安定な可能性があります。ページを開けない場合は、接続を確認してください。', 'warning');
    });

    window.addEventListener('online', () => {
        if (!connectionNoticeShown) return;
        connectionNoticeShown = false;
        showToast('接続状態が変わりました。開けなかったページは、もう一度試してください。', 'info');
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

let cachedRadarStatic = null;

function getRadarStaticParts() {
    if (cachedRadarStatic) return cachedRadarStatic;

    const { LEVELS, SIZE, MAX_RADIUS } = RADAR_CHART_CONFIG;
    const center = SIZE / 2;
    const axes = [];
    for (let i = 0; i < 5; i++) {
        const theta = -Math.PI / 2 + i * (2 * Math.PI / 5);
        axes.push({ cos: Math.cos(theta), sin: Math.sin(theta) });
    }

    let gridMarkup = '';
    for (let j = 1; j <= LEVELS; j++) {
        const r = (MAX_RADIUS / LEVELS) * j;
        const points = [];
        for (let i = 0; i < 5; i++) {
            const px = center + r * axes[i].cos;
            const py = center + r * axes[i].sin;
            points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
        }
        gridMarkup += `<polygon points="${points.join(' ')}" fill="none" stroke="#e2e8f0" stroke-width="1" />`;
    }

    let axisMarkup = '';
    let labelMarkup = '';
    for (let i = 0; i < 5; i++) {
        const { cos, sin } = axes[i];
        const ax = center + MAX_RADIUS * cos;
        const ay = center + MAX_RADIUS * sin;
        axisMarkup += `<line x1="${center}" y1="${center}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2 2" />`;

        let lx = center + 78 * cos;
        let ly = center + 78 * sin;
        let anchor = 'middle';
        if (cos > 0.1) {
            anchor = 'start';
            lx += 2;
        } else if (cos < -0.1) {
            anchor = 'end';
            lx -= 2;
        }
        if (sin > 0.9) {
            ly += 4;
        } else if (sin < -0.9) {
            ly -= 4;
        } else {
            ly += 3;
        }
        labelMarkup += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" fill="#475569" font-size="11" font-weight="900" class="font-pop">${GENRE_MAPPING[i].name}</text>`;
    }

    cachedRadarStatic = { SIZE, center, MAX_RADIUS, axes, gridMarkup, axisMarkup, labelMarkup };
    return cachedRadarStatic;
}

/**
 * 学習ダッシュボード（SVGレーダーチャート）を描画する
 */
export function renderRadarChart() {
    const container = document.getElementById('radar-chart-container');
    if (!container) return;

    const { MAX_VAL } = RADAR_CHART_CONFIG;
    const { SIZE, center, MAX_RADIUS, axes, gridMarkup, axisMarkup, labelMarkup } = getRadarStaticParts();
    const playCounts = userProfile.playCounts || {};

    // 各ジャンルのスコア計算
    let hasData = false;
    const scores = new Array(5);
    for (let i = 0; i < 5; i++) {
        const apps = GENRE_MAPPING[i].apps;
        let count = 0;
        for (let k = 0; k < apps.length; k++) {
            count += playCounts[apps[k]] || 0;
        }
        const clamped = Math.min(MAX_VAL, count);
        scores[i] = clamped;
        if (clamped > 0) hasData = true;
    }

    let dataMarkup = '';
    if (hasData) {
        const dataPoints = new Array(5);
        const dotCoords = new Array(5);
        const radiusStep = MAX_RADIUS / MAX_VAL;
        for (let i = 0; i < 5; i++) {
            const r = radiusStep * scores[i];
            const px = (center + r * axes[i].cos).toFixed(1);
            const py = (center + r * axes[i].sin).toFixed(1);
            dataPoints[i] = `${px},${py}`;
            dotCoords[i] = [Number(px), Number(py)];
        }
        dataMarkup += `<polygon points="${dataPoints.join(' ')}" class="radar-chart-polygon" fill="rgba(99, 102, 241, 0.2)" stroke="#6366f1" stroke-width="2.5" stroke-linejoin="round" />`;
        for (let i = 0; i < 5; i++) {
            const [px, py] = dotCoords[i];
            dataMarkup += `<circle cx="${px}" cy="${py}" r="4.5" class="radar-chart-dot" style="animation-delay: ${i * 70}ms" fill="#6366f1" stroke="#ffffff" stroke-width="1.5" />`;
        }
    } else {
        dataMarkup += `<text x="${center}" y="${center + 5}" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold">あそんで記録をのばそう！</text>`;
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
