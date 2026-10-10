/**
 * PikaLab - Profile Module
 * ユーザープロフィールの永続化・管理
 */

import { STORAGE_KEY, STORAGE_KEY_LEGACY, AVATAR_ICON_MAP, AVATAR_EMOJI_MAP, BADGE_DEFINITIONS, RECENT_MAX, RANK_THRESHOLDS, TIMING, APP_DEFINITIONS } from './constants.js';
import { normalizeProfileName } from './profile-name.mjs';
import { countVisitedLabs } from './visit-metrics.mjs';

// --- ユーザープロフィール（内部状態） ---
const _defaultProfile = {
    name: 'ゲスト',
    avatar: 'face',
    // 既存保存形式との互換性のためキー名はbadgesのまま。Lab IDは「初回訪問スタンプ」を表す。
    badges: [],
    loginCount: 0,
    recentApps: [],
    darkMode: false,
    textSize: 'normal',      // 新規追加: テキストサイズ設定
    reduceMotion: false,     // 新規追加: 動きを減らすモード設定
    volumeDb: -20,           // 新規追加: 音量（デシベル値）設定
    isMuted: false,          // 新規追加: ミュート設定
    playCounts: {},          // アプリ別起動回数（習熟度・完了数ではない）
    lastMissionClearedDate: '' // 既存互換キー: 最後にデイリーLabチェックインした日付(YYYY-MM-DD)
};

// 配列・オブジェクトを共有すると、初期プロフィールの記録が次の復元へ混入する。
function createDefaultProfile() {
    return { ..._defaultProfile, badges: [], recentApps: [], playCounts: {} };
}
const _userProfile = createDefaultProfile();
let profileUpdateDepth = 0;
let profileSavePending = false;
const _appUrlById = new Map(
    APP_DEFINITIONS
        .filter(app => app && typeof app.id === 'string' && typeof app.url === 'string' && app.url && app.url !== '#')
        .map(app => [app.id, app.url.trim()])
);
const _launchableAppIds = new Set(_appUrlById.keys());

/**
 * 最近使ったアプリの保存データを検証
 * id と url の対応関係が定義と一致するものだけ許可する
 */
function isValidRecentApp(item) {
    if (!item || typeof item !== 'object') return false;
    if (typeof item.id !== 'string') return false;
    if (typeof item.url !== 'string') return false;

    const normalizedId = item.id.trim();
    const normalizedUrl = item.url.trim();
    if (!normalizedId || !normalizedUrl) return false;

    const expectedUrl = _appUrlById.get(normalizedId);
    return expectedUrl === normalizedUrl;
}

/**
 * 保存データを安全な形に正規化
 * 型崩れや不正値で実行時エラーにならないよう防御する
 */
function normalizeProfileData(raw) {
    const safe = createDefaultProfile();
    if (!raw || typeof raw !== 'object') return safe;

    safe.name = normalizeProfileName(raw.name, _defaultProfile.name);

    safe.avatar = (typeof raw.avatar === 'string' && AVATAR_ICON_MAP[raw.avatar])
        ? raw.avatar
        : _defaultProfile.avatar;

    safe.badges = Array.isArray(raw.badges)
        ? raw.badges.filter(id => typeof id === 'string').slice(0, 200)
        : [];

    safe.loginCount = Number.isFinite(raw.loginCount)
        ? Math.max(0, Math.floor(raw.loginCount))
        : 0;

    safe.recentApps = Array.isArray(raw.recentApps)
        ? raw.recentApps
            .filter(isValidRecentApp)
            .map(item => ({
                id: item.id.trim(),
                name: (typeof item.name === 'string' ? item.name.trim() : '').slice(0, 80),
                url: _appUrlById.get(item.id.trim()) || ''
            }))
            .filter(item => item.id && item.name && item.url)
            .slice(0, RECENT_MAX)
        : [];

    safe.darkMode = Boolean(raw.darkMode);
    safe.textSize = raw.textSize === 'large' ? 'large' : 'normal';
    safe.reduceMotion = Boolean(raw.reduceMotion);
    safe.volumeDb = Number.isFinite(raw.volumeDb) ? Math.max(-40, Math.min(0, raw.volumeDb)) : -20;
    safe.isMuted = Boolean(raw.isMuted);

    safe.playCounts = (raw.playCounts && typeof raw.playCounts === 'object') ? { ...raw.playCounts } : {};
    for (const key in safe.playCounts) {
        if (!Number.isFinite(safe.playCounts[key])) {
            safe.playCounts[key] = 0;
        } else {
            safe.playCounts[key] = Math.max(0, Math.floor(safe.playCounts[key]));
        }
    }
    safe.lastMissionClearedDate = typeof raw.lastMissionClearedDate === 'string' ? raw.lastMissionClearedDate : '';

    return safe;
}

/**
 * userProfileへのアクセスをProxy経由で提供
 * 将来的にバリデーションや変更検知を追加可能
 */
export const userProfile = new Proxy(_userProfile, {
    get(target, prop) {
        return target[prop];
    },
    set(target, prop, value) {
        target[prop] = value;
        return true;
    }
});

/**
 * プロフィールを保存
 * LocalStorageの容量超過時のエラーハンドリングを追加
 */
export function saveProfile() {
    if (profileUpdateDepth > 0) {
        profileSavePending = true;
        return false;
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_userProfile));
        return true;
    } catch (e) {
        console.error('Failed to save profile:', e);
        return false;
    }
}

/**
 * 一回の操作による同期更新をまとめ、保存とJSON化を最後の一回だけ行う。
 * 通常のsaveProfileや入れ子の更新も同じ保存経路を使う。
 */
export function batchProfileUpdates(update) {
    profileUpdateDepth++;
    try {
        return update();
    } finally {
        profileUpdateDepth--;
        if (profileUpdateDepth === 0 && profileSavePending) {
            profileSavePending = false;
            saveProfile();
        }
    }
}

/**
 * プロフィールを読み込み
 * @returns {boolean} 読み込み成功したかどうか
 */
export function loadProfile() {
    let savedData;
    let fromLegacy = false;
    try {
        savedData = localStorage.getItem(STORAGE_KEY);
        if (!savedData) {
            savedData = localStorage.getItem(STORAGE_KEY_LEGACY);
            fromLegacy = Boolean(savedData);
        }
    } catch (e) {
        // 保存領域の読み取り拒否はデータ破損ではない。既存データを削除しない。
        console.error('Saved profile error:', e);
        return false;
    }
    if (!savedData) return false;

    let parsed;
    try {
        parsed = JSON.parse(savedData);
    } catch (e) {
        console.error('Saved profile error:', e);
        // 旧データは移行成功まで残し、不正な現行JSONだけを除去する。
        if (!fromLegacy) {
            try { localStorage.removeItem(STORAGE_KEY); }
            catch (removeError) { console.error('Failed to remove broken profile:', removeError); }
        }
        return false;
    }
    Object.assign(_userProfile, normalizeProfileData(parsed));
    const persisted = saveProfile();
    if (fromLegacy && persisted) {
        try {
            localStorage.removeItem(STORAGE_KEY_LEGACY);
            console.log('[PikaLab] プロフィールデータを新しいキーに移行しました。');
        } catch (e) {
            // 旧キー削除の拒否で、読み込み済みの記録や新キーを失わない。
            console.error('Failed to remove legacy profile:', e);
        }
    }
    return true;
}

/**
 * ユーザーデータをリセット
 */
export function resetUserData() {
    if (confirm('ほんとうに データを けしますか？ (ログアウト)')) {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.error('Failed to clear profile:', e);
        }
        location.reload();
    }
}

/**
 * スタンプを追加
 * Lab IDは初回訪問の記録。学習完了や習熟度は表さない。
 */
export function addBadge(badgeId, playBadgeSound = null) {
    if (!userProfile.badges.includes(badgeId)) {
        userProfile.badges.push(badgeId);
        saveProfile();
        updateProfileUI();
        if (playBadgeSound) {
            setTimeout(() => playBadgeSound('badge'), TIMING.TRANSITION);
        }
    }
}

/**
 * 最近のアプリを記録
 */
export function recordRecentApp(appId, appName, url) {
    const normalizedId = typeof appId === 'string' ? appId.trim() : '';
    const expectedUrl = _appUrlById.get(normalizedId);
    if (!normalizedId || !expectedUrl || url === '#') return;

    const safeName = (typeof appName === 'string' ? appName.trim() : '').slice(0, 80) || normalizedId;
    const list = Array.isArray(userProfile.recentApps) ? [...userProfile.recentApps] : [];
    const filtered = list.filter(item => item.id !== normalizedId).filter(isValidRecentApp);
    filtered.unshift({ id: normalizedId, name: safeName, url: expectedUrl });
    userProfile.recentApps = filtered.slice(0, RECENT_MAX);
    saveProfile();
}

/**
 * アバター絵文字を取得
 */
export function getAvatarEmoji(type) {
    return AVATAR_EMOJI_MAP[type] || AVATAR_EMOJI_MAP.face;
}

/**
 * プロフィールUIを更新
 */
export function updateProfileUI() {
    const headerUsername = document.getElementById('header-username');
    const headerAvatar = document.getElementById('header-avatar');
    const modalAvatarDisplay = document.getElementById('modal-avatar-display');
    const modalUsernameDisplay = document.getElementById('modal-username-display');
    const userRankDisplay = document.getElementById('user-rank-display');
    const rankTitle = document.getElementById('rank-title');
    const rankDesc = document.getElementById('rank-desc');
    const rankProgress = document.getElementById('rank-progress');

    if (headerUsername) headerUsername.textContent = userProfile.name;
    if (headerAvatar) {
        const icon = AVATAR_ICON_MAP[userProfile.avatar] || AVATAR_ICON_MAP.face;
        headerAvatar.textContent = icon;
    }
    if (modalAvatarDisplay) modalAvatarDisplay.textContent = getAvatarEmoji(userProfile.avatar);
    if (modalUsernameDisplay) modalUsernameDisplay.textContent = userProfile.name;

    // ランクは「訪問したLab数」のみで計算する。first-login等のシステムスタンプは含めない。
    const visitedLabCount = countVisitedLabs(userProfile.badges, _launchableAppIds);
    const rankInfo = RANK_THRESHOLDS.find(r => visitedLabCount >= r.min) || RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];

    if (userRankDisplay) userRankDisplay.textContent = rankInfo.rank;
    if (rankTitle) rankTitle.textContent = rankInfo.rank;
    if (rankDesc) rankDesc.textContent = rankInfo.desc;
    if (rankProgress) rankProgress.style.width = `${rankInfo.progress}%`;

    const rankLabel = rankTitle?.parentElement?.previousElementSibling;
    if (rankLabel) rankLabel.textContent = 'ラボ探索ランク';

    // 記録UIも、起動履歴を学習到達度のように誤認させない表現へ揃える。
    const recordSubtitle = document.getElementById('record-modal-title')?.nextElementSibling;
    if (recordSubtitle) recordSubtitle.textContent = 'あつめたスタンプとラボ利用の記録だよ！';

    const stampHeading = document.getElementById('badge-grid')?.parentElement?.querySelector('h3');
    if (stampHeading) stampHeading.textContent = '訪問・記念スタンプ';

    const dashboardHeading = document.getElementById('radar-chart-container')?.parentElement?.querySelector('h4');
    if (dashboardHeading) dashboardHeading.textContent = 'ラボ利用ダッシュボード';
}

/**
 * 名前を編集
 */
export function editUserName(playSound = null) {
    if (playSound) playSound('click');
    const currentName = userProfile.name || 'ゲスト';
    const newName = prompt('新しいおなまえを入力してね！', currentName);

    const normalizedName = normalizeProfileName(newName, '');
    if (normalizedName) {
        userProfile.name = normalizedName;
        saveProfile();
        updateProfileUI();
        if (playSound) playSound('success');
    }
}

let isBadgesRendered = false;

/**
 * ラボ訪問スタンプのグリッドをレンダリング（DOMトラッシング対策済み）
 */
export function renderBadges() {
    const grid = document.getElementById('badge-grid');
    if (!grid) return;

    // 初回のみDOM要素を構築
    if (!isBadgesRendered) {
        grid.innerHTML = '';
        Object.keys(BADGE_DEFINITIONS).forEach(id => {
            const def = BADGE_DEFINITIONS[id];
            const el = document.createElement('div');
            el.id = `badge-item-${id}`;
            el.className = 'badge-item aspect-square rounded-xl flex flex-col items-center justify-center p-2 border-2 transition-all';
            
            el.innerHTML = `
                <span class="material-symbols-rounded text-3xl mb-1">${def.icon}</span>
                <span class="badge-label text-[10px] font-bold leading-tight text-center">???</span>
            `;
            grid.appendChild(el);
        });
        isBadgesRendered = true;
    }

    // 2回目以降は状態（CSSクラスとテキスト）のみを更新
    Object.keys(BADGE_DEFINITIONS).forEach(id => {
        const def = BADGE_DEFINITIONS[id];
        const hasBadge = userProfile.badges.includes(id);
        const el = document.getElementById(`badge-item-${id}`);
        if (!el) return;

        const label = el.querySelector('.badge-label');
        if (hasBadge) {
            el.className = `badge-item aspect-square rounded-xl flex flex-col items-center justify-center p-2 transition-all bg-white shadow-sm border-transparent ${def.color}`;
            if (label) label.textContent = def.name;
        } else {
            el.className = 'badge-item aspect-square rounded-xl flex flex-col items-center justify-center p-2 transition-all bg-slate-100 border-2 border-slate-200 text-slate-300 grayscale';
            if (label) label.textContent = '???';
        }
    });
}