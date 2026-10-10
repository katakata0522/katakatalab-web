/**
 * PikaLab - UI Module
 * モーダル・メニュー・フォーカストラップ制御
 */

import { TIMING } from './constants.js';
import { playSound } from './audio.js';
import { userProfile, saveProfile } from './profile.js';

// --- フォーカストラップ管理 ---
let currentFocusTrap = null;
let previousActiveElement = null; // モーダルを開いた要素を記憶

// ドロップダウンメニュー用
let lastMenuTrigger = null;
let menuKeyDownHandler = null;
let menuOpenTimer = null;
let menuCloseTimer = null;

/**
 * トグルスイッチの状態を更新するヘルパー（共有用）
 */
export function updateToggleSwitch(toggleId, knobId, isActive) {
    const toggle = document.getElementById(toggleId);
    const knob = document.getElementById(knobId);
    if (!toggle || !knob) return;

    if (isActive) {
        toggle.classList.remove('bg-slate-300');
        toggle.classList.add('bg-indigo-500');
        knob.style.transform = 'translateX(24px)';
    } else {
        toggle.classList.add('bg-slate-300');
        toggle.classList.remove('bg-indigo-500');
        knob.style.transform = 'translateX(0)';
    }
}

/**
 * フォーカストラップを設定
 */
export function setupFocusTrap(modalId) {
    removeFocusTrap();
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // 現在のフォーカス要素を記憶（モーダルを開いたボタン）
    let activeEl = document.activeElement;

    // もしフォーカスされた要素がドロップダウンメニューの中にあるなら、
    // モーダルが閉じたときのフォーカス復帰先をメニューのトリガーボタン（#menu-toggle-btn）にする
    const menu = document.getElementById('dropdown-menu');
    if (menu && menu.contains(activeEl)) {
        const menuToggleBtn = document.getElementById('menu-toggle-btn');
        if (menuToggleBtn) {
            activeEl = menuToggleBtn;
        }
    }
    previousActiveElement = activeEl;

    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
        if (e.key !== 'Tab' && e.key !== 'Escape') return;

        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        }

        if (e.key === 'Escape') {
            closeModal(modalId);
        }
    };

    modal.addEventListener('keydown', handleKeyDown);
    currentFocusTrap = { modalId, handler: handleKeyDown, focusTimer: null };

    if (firstFocusable) {
        currentFocusTrap.focusTimer = setTimeout(() => firstFocusable.focus(), TIMING.MODAL_FADE);
    }
}

/**
 * フォーカストラップを解除
 */
export function removeFocusTrap() {
    if (currentFocusTrap) {
        clearTimeout(currentFocusTrap.focusTimer);
        const modal = document.getElementById(currentFocusTrap.modalId);
        if (modal) {
            modal.removeEventListener('keydown', currentFocusTrap.handler);
        }
        currentFocusTrap = null;
    }
}

/**
 * モーダルを閉じる
 */
export function closeModal(id) {
    playSound('click');
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
        
        // Focus Trap 解除
        const mainContent = document.getElementById('main-interface') || document.getElementById('main-content') || document.querySelector('main');
        const header = document.querySelector('header');
        if (mainContent) mainContent.removeAttribute('inert');
        if (header) header.removeAttribute('inert');
        removeFocusTrap();

        // フォーカスを元の要素に復元（アクセシビリティ向上）
        if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
            previousActiveElement.focus();
            previousActiveElement = null;
        }
    }
}

/**
 * 汎用モーダルオープン関数
 * @param {string} modalId - モーダルのDOM ID
 * @param {Function} [initCallback] - モーダル表示直前に実行する処理
 */
export function openModal(modalId, initCallback = null) {
    playSound('click');
    if (initCallback) initCallback();
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    
        // Focus Trap / Accessibility: 背面をinertにする
        const mainContent = document.getElementById('main-interface') || document.getElementById('main-content') || document.querySelector('main');
        const header = document.querySelector('header');
        if (mainContent) mainContent.setAttribute('inert', 'true');
        if (header) header.setAttribute('inert', 'true');
        setupFocusTrap(modalId);
    }
}

/**
 * メニューキーイベントを設定
 */
function setupMenuKeyEvents() {
    const menu = document.getElementById('dropdown-menu');
    if (!menu) return;

    if (menuKeyDownHandler) {
        menu.removeEventListener('keydown', menuKeyDownHandler);
    }

    menuKeyDownHandler = (e) => {
        if (e.key !== 'Tab' && e.key !== 'Escape') return;

        // メニュー内の有効な（表示されている）フォーカス可能な要素を取得
        const focusableElements = Array.from(menu.querySelectorAll(
            'input, button, a, [tabindex]:not([tabindex="-1"])'
        )).filter(el => {
            return el.offsetWidth > 0 && el.offsetHeight > 0;
        });

        if (focusableElements.length === 0) return;

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            maybeCloseMenu(true); // Escapeで閉じる場合はフォーカスをトリガーに戻す
        }
    };

    menu.addEventListener('keydown', menuKeyDownHandler);
}

/**
 * メニューキーイベントを解除
 */
function removeMenuKeyEvents() {
    const menu = document.getElementById('dropdown-menu');
    if (menu && menuKeyDownHandler) {
        menu.removeEventListener('keydown', menuKeyDownHandler);
        menuKeyDownHandler = null;
    }
}

/**
 * メニューを閉じる（開いている場合）
 * @param {boolean} shouldRestoreFocus - メニューを開いたトリガーにフォーカスを戻すか
 */
export function maybeCloseMenu(shouldRestoreFocus = true) {
    const menu = document.getElementById('dropdown-menu');
    if (menu && !menu.classList.contains('hidden') && menuCloseTimer === null) {
        toggleMenu(shouldRestoreFocus);
    }
}

/**
 * メニューの表示/非表示を切り替え
 * @param {boolean} shouldRestoreFocus - メニューを開いたトリガーにフォーカスを戻すか
 */
export function toggleMenu(shouldRestoreFocus = true) {
    const menu = document.getElementById('dropdown-menu');
    if (!menu) return;

    // 閉じるアニメーション中の再操作は、古いタイマーを破棄して開き直す。
    const shouldOpen = menu.classList.contains('hidden') || menuCloseTimer !== null;
    clearTimeout(menuOpenTimer);
    clearTimeout(menuCloseTimer);
    menuOpenTimer = null;
    menuCloseTimer = null;

    if (shouldOpen) {
        lastMenuTrigger = document.activeElement; // メニューを開いたときのトリガー要素を保存
        menu.classList.remove('hidden');
        
        menuOpenTimer = setTimeout(() => {
            menuOpenTimer = null;
            menu.classList.add('opacity-100', 'scale-100');
            menu.classList.remove('opacity-0', 'scale-95');
            const searchInput = document.getElementById('app-search');
            if (searchInput) {
                searchInput.focus();
            }
        }, TIMING.MENU_OPEN_DELAY);

        setupMenuKeyEvents();
    } else {
        menu.classList.add('opacity-0', 'scale-95');
        menu.classList.remove('opacity-100', 'scale-100');
        
        removeMenuKeyEvents();

        menuCloseTimer = setTimeout(() => {
            menuCloseTimer = null;
            menu.classList.add('hidden');
        }, TIMING.MENU_CLOSE);

        if (shouldRestoreFocus && lastMenuTrigger && typeof lastMenuTrigger.focus === 'function') {
            lastMenuTrigger.focus();
        }
        lastMenuTrigger = null;
    }
}

/**
 * テキストサイズのUI表示を更新（内部ヘルパー）
 * @param {string} size - 'normal' または 'large'
 */
function updateTextSizeUI(size) {
    const body = document.body;
    const btnNormal = document.getElementById('text-normal');
    const btnLarge = document.getElementById('text-large');

    if (size === 'large') {
        body.classList.add('text-large');
        if (btnLarge) {
            btnLarge.classList.add('bg-white', 'shadow-sm', 'text-indigo-600');
            btnLarge.classList.remove('text-slate-400');
        }
        if (btnNormal) {
            btnNormal.classList.remove('bg-white', 'shadow-sm', 'text-indigo-600');
            btnNormal.classList.add('text-slate-400');
        }
    } else {
        body.classList.remove('text-large');
        if (btnNormal) {
            btnNormal.classList.add('bg-white', 'shadow-sm', 'text-indigo-600');
            btnNormal.classList.remove('text-slate-400');
        }
        if (btnLarge) {
            btnLarge.classList.remove('bg-white', 'shadow-sm', 'text-indigo-600');
            btnLarge.classList.add('text-slate-400');
        }
    }
}

/**
 * テキストサイズを設定
 * @param {string} size - 'normal' または 'large'
 * @param {boolean} shouldSave - プロファイルに保存するか（デフォルト: true）
 */
export function setTextSize(size, shouldSave = true) {
    playSound('click');
    updateTextSizeUI(size);

    // プロファイルに保存
    if (shouldSave) {
        userProfile.textSize = size;
        saveProfile();
    }
}

/**
 * 動きを減らすモードを切り替え
 * @param {boolean} shouldSave - プロファイルに保存するか（デフォルト: true）
 */
export function toggleMotion(shouldSave = true) {
    playSound('click');
    document.body.classList.toggle('reduce-motion');
    const isReduced = document.body.classList.contains('reduce-motion');
    updateToggleSwitch('motion-toggle', 'motion-knob', isReduced);

    // プロファイルに保存
    if (shouldSave) {
        userProfile.reduceMotion = isReduced;
        saveProfile();
    }
}

/**
 * ユーザー設定を適用（ページロード時）
 * プロファイルから読み込んだ設定をUIに反映
 */
export function applyUserSettings() {
    // テキストサイズを復元（ヘルパー関数を使用）
    const textSize = userProfile.textSize || 'normal';
    if (textSize === 'large') {
        updateTextSizeUI(textSize);
    }

    // 動きを減らすモードを復元
    if (userProfile.reduceMotion) {
        document.body.classList.add('reduce-motion');
        updateToggleSwitch('motion-toggle', 'motion-knob', true);
    }
}

/**
 * UI関連のイベントリスナーを初期化
 * main.jsから明示的に呼び出すことで、モジュールインポート時の副作用を防ぐ
 */
export function initUIEventListeners() {
    // クリック外でメニューを閉じる
    document.addEventListener('click', function (event) {
        const menu = document.getElementById('dropdown-menu');
        const btn = document.getElementById('menu-toggle-btn');
        if (!menu || !btn) return;
        if (!menu.classList.contains('hidden') && !menu.contains(event.target) && !btn.contains(event.target)) {
            maybeCloseMenu(false);
        }
    });
}

/**
 * 共通トースト通知を表示する（オフライン検知やその他通知用）
 * @param {string} message - 表示するメッセージ
 * @param {string} type - 'info' | 'success' | 'warning' | 'error'
 */
export function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'false');
        document.body.appendChild(container);
    }
    
    // 重複防止
    const existingToasts = container.querySelectorAll('.toast');
    for (const t of existingToasts) {
        const textSpan = t.querySelector('.toast-text');
        if (textSpan && textSpan.textContent === message) {
            return;
        }
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    
    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'warning') icon = 'warning';
    if (type === 'error') icon = 'error';

    toast.innerHTML = `
        <span class="material-symbols-rounded toast-icon">${icon}</span>
        <span class="toast-text">${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
