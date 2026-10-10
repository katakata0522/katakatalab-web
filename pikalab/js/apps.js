import { APP_DEFINITIONS, SHOW_AMAZON_ASSOCIATE_CARD, ALWAYS_VISIBLE_APPS, HERO_CONFIG, TIMING, GRID_TITLE_BY_CATEGORY, APP_MESSAGES, TAB_BUTTON_IDS } from './constants.js';
import { userProfile, addBadge, recordRecentApp, saveProfile, batchProfileUpdates } from './profile.js';
import { maybeCloseMenu } from './ui.js';
import { startAudio, playSound } from './audio.js';

// --- 内部状態 ---
let currentCategory = 'low';
let currentSearchTerm = '';
let heroTimeoutId = null;
let launcherTimer = null;
let cardEntries = [];
const launchContainers = new WeakSet();
const ALLOWED_APP_URLS = new Set(
    APP_DEFINITIONS
        .filter(app => app && typeof app.url === 'string' && app.url && app.url !== '#')
        .map(app => app.url.trim())
);

// カタログは起動中に変わらないため、表示・日替わり抽選の候補を一度だけ解決する。
const VISIBLE_APPS = APP_DEFINITIONS.filter(canRenderApp);
const MISSION_APPS = VISIBLE_APPS.filter(app => !app.isAmazonCard);

/**
 * カテゴリを設定
 */
export function setCategory(cat) {
    playSound('click');
    currentCategory = cat;

    // タブの見た目リセット
    TAB_BUTTON_IDS.forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.classList.remove('tab-active', 'bg-white', 'text-blue-600', 'shadow-md');
        btn.classList.add('text-slate-500');
        btn.setAttribute('aria-pressed', 'false');
    });

    // アクティブ化
    const activeBtn = document.getElementById(`btn-${cat}`);
    if (activeBtn) {
        activeBtn.classList.add('tab-active');
        activeBtn.classList.remove('text-slate-500');
        activeBtn.setAttribute('aria-pressed', 'true');
    }

    updateHero(cat);
    filterApps();
}

/**
 * 検索語を設定
 */
export function setSearchTerm(term) {
    currentSearchTerm = (term || '').toLowerCase();

    // クリアボタンの表示切り替え
    const clearBtn = document.getElementById('app-search-clear');
    if (clearBtn) {
        if (currentSearchTerm) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    }

    filterApps();
}

/**
 * 検索条件を完全にクリアする
 */
export function clearSearch() {
    const searchInput = document.getElementById('app-search');
    if (searchInput) {
        searchInput.value = '';
    }
    setSearchTerm('');
}

function matchesCategory(categories, cat, appId) {
    if (appId === 'amazon-bookshelf' && !SHOW_AMAZON_ASSOCIATE_CARD) return false;
    if (ALWAYS_VISIBLE_APPS.has(appId)) {
        // ALWAYS_VISIBLEでも親向けタブ表示時は親タグ必須
        if (cat === 'parents') return categories.includes('parents');
        return true;
    }
    if (cat === 'parents') return categories.includes('parents');
    if (categories.includes('parents')) return false;
    return cat === 'middle' || categories.includes(cat);
}

/**
 * URLが安全か判定
 */
function isSafeUrl(url) {
    if (typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    if (/[\u0000-\u001F\u007F]/.test(trimmed)) return false;
    if (trimmed.startsWith('javascript:')) return false;
    if (trimmed.startsWith('data:')) return false;
    if (trimmed.startsWith('//')) return false;
    if (trimmed.startsWith('\\')) return false;
    if (trimmed.startsWith('/')) return false;
    if (trimmed.includes('..')) return false;
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
    if (hasScheme) return false;
    return ALLOWED_APP_URLS.has(trimmed);
}

/**
 * 現在公開してよいアプリか判定
 */
function canRenderApp(app) {
    if (!app) return false;
    if (app.isAmazonCard) return SHOW_AMAZON_ASSOCIATE_CARD;
    return isSafeUrl(app.url);
}

/**
 * アプリカードを動的生成してDOMにレンダリングする
 */
export function renderAppCards() {
    const grid = document.getElementById('apps-grid');
    if (!grid) return;

    const fragment = document.createDocumentFragment();
    cardEntries = VISIBLE_APPS.map(app => {
        const card = createCardElement(app);
        fragment.appendChild(card);
        // 実際に描画したテキストを使い、従来の検索対象（タグ・ボタンも含む）を保つ。
        return { card, app, searchText: (card.textContent || '').toLowerCase(), visible: null, highlight: null };
    });
    grid.replaceChildren(fragment);
    bindLaunchContainer(grid);
}

/**
 * 動的に作り直すカード・チェックイン・履歴の起動処理を一か所に保つ。
 */
function bindLaunchContainer(container, closeMenu = false) {
    if (launchContainers.has(container)) return;
    launchContainers.add(container);
    container.addEventListener('click', event => {
        const link = event.target.closest?.('a[data-launch-app]');
        if (!link || !container.contains(link)) return;
        const url = link.getAttribute('href');
        if (!isSafeUrl(url)) event.preventDefault();
        launchApp(url, link.dataset.appName, link.dataset.launchApp);
        if (closeMenu) maybeCloseMenu();
    });
}

/**
 * 個別のアプリカードDOM要素を作成する
 */
function createCardElement(app) {
    const card = document.createElement('div');
    card.className = 'app-card group relative bg-white rounded-3xl shadow-lg border-2 border-slate-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 opacity-100 flex flex-col justify-between shine-effect';
    card.dataset.categories = app.categories.join(',');
    card.dataset.appId = app.id;

    if (app.isAmazonCard) {
        card.className = 'app-card group relative bg-white rounded-3xl shadow-lg border-2 border-slate-200 overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 opacity-100 flex flex-col justify-between';
        
        let linksHtml = '';
        if (Array.isArray(app.amazonLinks)) {
            app.amazonLinks.forEach(link => {
                linksHtml += `
                    <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition group/item">
                        <div class="w-10 h-10 ${link.iconBgClass} rounded-xl flex items-center justify-center">
                            <span class="material-symbols-rounded">${link.icon}</span>
                        </div>
                        <div class="flex-1 text-left">
                            <div class="text-xs font-black text-slate-700 group-hover/item:text-indigo-600 transition-colors">${link.title}</div>
                            <div class="text-[10px] text-slate-400 font-bold">${link.desc}</div>
                        </div>
                        <span class="material-symbols-rounded text-slate-300 text-sm">open_in_new</span>
                    </a>
                `;
            });
        }

        card.innerHTML = `
            <div class="flex-1 flex flex-col">
                <div class="h-32 overflow-hidden relative ${app.headerBgClass}">
                    <div class="w-full h-full bg-gradient-to-br from-slate-100 via-white to-slate-200 relative">
                        <span class="material-symbols-rounded text-6xl text-slate-300 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">shelves</span>
                    </div>
                    <div class="absolute top-3 left-3 bg-slate-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-md">${app.subjectTag}</div>
                    <div class="${app.gradeLabelClass}">${app.gradeTag}</div>
                </div>
                <div class="p-5 flex-1">
                    <h3 class="text-lg font-black text-slate-800 mb-3 flex items-center gap-2">
                        <span class="material-symbols-rounded text-amber-500">star</span> ${app.title}
                    </h3>
                    <div class="space-y-2">
                        ${linksHtml}
                    </div>
                </div>
            </div>
            <div class="p-5 pt-0 border-t border-slate-50 mt-auto text-center">
                <span class="text-[9px] font-bold text-slate-400">※Amazonアソシエイトのリンクを使用しています</span>
            </div>
        `;
        return card;
    }

    let headerPatternHtml = '';
    if (app.headerPattern) {
        headerPatternHtml = `<div class="absolute top-0 left-0 w-full h-full opacity-20" style="background-image: radial-gradient(#F97316 2px, transparent 2px); background-size: 20px 20px;"></div>`;
    } else if (app.headerStarsPattern) {
        headerPatternHtml = `<div class="absolute top-0 left-0 w-full h-full opacity-35" style="background-image: radial-gradient(white 1px, transparent 1px); background-size: 20px 20px;"></div>`;
    }

    const gradeTagHtml = app.gradeTag 
        ? `<div class="absolute top-3 right-3 bg-white/90 backdrop-blur text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-lg border border-slate-200">${app.gradeTag}</div>`
        : '';

    card.innerHTML = `
        <div class="flex-1 flex flex-col">
            <div class="h-40 overflow-hidden relative ${app.headerBgClass || 'bg-slate-100'}">
                <div class="w-full h-full relative flex items-center justify-center">
                    ${headerPatternHtml}
                    <span class="material-symbols-rounded text-7xl text-slate-500/20 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 scale-110">${app.icon}</span>
                </div>
                <div class="absolute top-3 left-3 ${app.subjectTagColor || 'bg-slate-600'} text-white text-xs font-black px-3 py-1 rounded-full shadow-md">${app.subjectTag}</div>
                ${gradeTagHtml}
            </div>
            <div class="p-6 flex-1 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-start mb-2 gap-2">
                        <h3 class="text-xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug">${app.title}</h3>
                        <span class="material-symbols-rounded ${app.iconColor} text-3xl p-1.5 rounded-xl flex-shrink-0">${app.icon}</span>
                    </div>
                    <p class="text-sm text-slate-500 font-bold mb-6 leading-relaxed">${app.description}</p>
                </div>
            </div>
        </div>
        <div class="p-6 pt-0 mt-auto">
            <a href="${app.url}" target="_blank" data-launch-app="${app.id}" data-app-name="${app.appName}" class="w-full bg-slate-100 hover:${app.buttonHoverColor.replace('hover:', '')} hover:text-white text-slate-600 font-black py-3 rounded-2xl transition-all flex items-center justify-center gap-2 group-hover:shadow-md">
                <span class="material-symbols-rounded">play_arrow</span>
                <span>${app.buttonText}</span>
            </a>
        </div>
    `;
    return card;
}

/**
 * カードの表示/非表示を設定
 */
function setCardVisibility(card, shouldShow, highlight) {
    if (shouldShow) {
        card.classList.remove('hidden');
        card.classList.remove('opacity-60', 'grayscale');
        card.classList.add('opacity-100');
        card.classList.toggle('shine-effect', highlight);
    } else {
        card.classList.add('hidden');
        card.classList.remove('shine-effect');
    }
}

/**
 * ヒーローセクションを更新
 */
export function updateHero(cat) {
    const title = document.getElementById('hero-title');
    const desc = document.getElementById('hero-desc');
    const icon = document.getElementById('hero-icon');
    const tag = document.getElementById('hero-tag');
    const hero = document.getElementById('hero-section');
    const config = HERO_CONFIG[cat];

    if (!hero) return;

    if (heroTimeoutId) {
        clearTimeout(heroTimeoutId);
    }

    hero.classList.add('opacity-50', 'scale-95');

    heroTimeoutId = setTimeout(() => {
        if (config) {
            if (tag) {
                tag.textContent = config.tagText;
                tag.className = config.tagClass;
            }
            if (title) title.innerHTML = config.titleHtml;
            if (desc) desc.textContent = config.description;
            if (icon) {
                icon.textContent = config.iconName;
                icon.className = config.iconClass;
            }
        }
        hero.classList.remove('opacity-50', 'scale-95');
        heroTimeoutId = null;
    }, TIMING.HERO_TRANSITION);
}

/**
 * アプリをフィルタリング
 */
export function filterApps() {
    const gridTitle = document.getElementById('grid-title');
    const cat = currentCategory;

    if (gridTitle) {
        gridTitle.textContent = GRID_TITLE_BY_CATEGORY[cat] || GRID_TITLE_BY_CATEGORY.default;
    }

    let visibleCount = 0;
    cardEntries.forEach(entry => {
        const { card, app, searchText } = entry;
        const categories = app.categories;
        const shouldShow = matchesCategory(categories, cat, app.id) && searchText.includes(currentSearchTerm);
        const highlight = categories.includes(cat) || cat === 'middle' || cat === 'parents';

        // 同じ結果の検索やカテゴリ切替では、既存DOMに不要なクラス書き込みをしない。
        if (entry.visible !== shouldShow || (shouldShow && entry.highlight !== highlight)) {
            setCardVisibility(card, shouldShow, highlight);
            entry.visible = shouldShow;
            entry.highlight = highlight;
        }
        if (shouldShow) {
            visibleCount++;
        }
    });

    // 0件ヒット時のUI制御
    const emptyPlaceholder = document.getElementById('search-empty');
    if (emptyPlaceholder) {
        if (visibleCount === 0) {
            emptyPlaceholder.classList.remove('hidden');
            emptyPlaceholder.classList.add('flex');
        } else {
            emptyPlaceholder.classList.add('hidden');
            emptyPlaceholder.classList.remove('flex');
        }
    }
}

/**
 * アプリ起動時エフェクト
 * (別タブ遷移は <a>タグで行われるため、ここでは起動・訪問記録のみ)
 */
export function launchApp(filename, appName, appId) {
    const canLaunchUrl = isSafeUrl(filename);

    startAudio()
        .then(() => playSound('launch'))
        .catch((e) => {
            console.warn('Audio start failed:', e);
        });

    if (canLaunchUrl) {
        batchProfileUpdates(() => {
            // 初回起動は「Lab訪問スタンプ」。学習完了や習熟を意味しない。
            if (appId && !userProfile.badges.includes(appId)) {
                addBadge(appId, playSound);
            }
            recordRecentApp(appId, appName, filename);

            // 起動回数のカウント記録（利用頻度であり、到達度ではない）
            if (appId) {
                if (!userProfile.playCounts) {
                    userProfile.playCounts = {};
                }
                userProfile.playCounts[appId] = (userProfile.playCounts[appId] || 0) + 1;
                saveProfile();
            }

            // デイリーLabチェックイン判定。対象Labを開いた事実だけを記録する。
            const missionInfo = getTodayMissionApp();
            if (missionInfo && appId === missionInfo.app.id) {
                const todayStr = missionInfo.dateStr;
                if (userProfile.lastMissionClearedDate !== todayStr) {
                    userProfile.lastMissionClearedDate = todayStr;
                    saveProfile();
                    updateMissionUI();
                }
            }
        });
    }

    clearTimeout(launcherTimer);
    const overlay = document.getElementById('launcher-overlay');
    const text = document.getElementById('launcher-text');

    if (text) text.textContent = `Launching ${appName}...`;
    if (overlay) {
        overlay.classList.remove('launcher-fade-out', 'hidden');
    }

    // フェードアウト処理ヘルパー
    const fadeOutOverlay = () => {
        if (overlay) {
            overlay.classList.add('launcher-fade-out');
            launcherTimer = setTimeout(() => {
                launcherTimer = null;
                overlay.classList.add('hidden');
                overlay.classList.remove('launcher-fade-out');
            }, 300); // CSS transition の 300ms に同期
        }
    };

    launcherTimer = setTimeout(() => {
        if (!canLaunchUrl) {
            fadeOutOverlay();
            const message = APP_MESSAGES[appId] || APP_MESSAGES['default'];
            alert(message);
        } else {
            // 新規タブはHTMLの<a>タグのデフォルト動作で行われるため待つだけ
            launcherTimer = setTimeout(() => {
                fadeOutOverlay();
            }, TIMING.OVERLAY_HIDE);
        }
    }, TIMING.LAUNCH_DELAY);
}

/**
 * 今日のチェックイン対象アプリを決定論的に決定する
 * 既存API名は互換性のためgetTodayMissionAppのまま維持する。
 */
export function getTodayMissionApp() {
    const validApps = MISSION_APPS;
    if (validApps.length === 0) return null;

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
        hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % validApps.length;
    return {
        app: validApps[index],
        dateStr
    };
}

/**
 * デイリーLabチェックインUIを更新する
 */
export function updateMissionUI() {
    const missionSection = document.getElementById('mission-section');
    if (!missionSection) return;

    const missionInfo = getTodayMissionApp();
    if (!missionInfo) {
        missionSection.innerHTML = '';
        return;
    }

    const isCheckedIn = userProfile.lastMissionClearedDate === missionInfo.dateStr;
    const app = missionInfo.app;

    missionSection.innerHTML = `
        <div class="bg-gradient-to-r ${isCheckedIn ? 'from-emerald-500/10 to-teal-500/10 border-emerald-400/50' : 'from-amber-500/10 to-orange-500/10 border-amber-400/50'} border-2 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 transition-all animate-pop">
            <div class="flex items-center gap-3">
                <div class="${isCheckedIn ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'} p-3 rounded-2xl ${isCheckedIn ? '' : 'animate-pulse'} flex items-center justify-center">
                    <span class="material-symbols-rounded text-2xl block">${isCheckedIn ? 'check_circle' : 'explore'}</span>
                </div>
                <div class="text-left font-pop">
                    <div class="text-[10px] ${isCheckedIn ? 'text-emerald-600' : 'text-amber-600'} font-black tracking-wider uppercase">きょうの ラボ チェックイン</div>
                    <h3 class="text-base font-black text-slate-800">「${app.title}」を ひらいてみよう！</h3>
                </div>
            </div>
            <div class="w-full sm:w-auto text-right font-pop">
                ${isCheckedIn 
                    ? `<span class="bg-emerald-100 text-emerald-700 text-sm font-black px-5 py-2.5 rounded-2xl inline-flex items-center gap-1.5 shadow-sm">
                         <span class="material-symbols-rounded text-lg">check_circle</span> チェックイン完了！
                       </span>`
                    : `<a href="${app.url}" target="_blank" data-launch-app="${app.id}" data-app-name="${app.appName}" class="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white text-sm font-black px-6 py-3 rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-95 inline-flex items-center justify-center gap-1.5">
                         <span class="material-symbols-rounded text-base">open_in_new</span>
                         <span>ラボを ひらく</span>
                       </a>`
                }
            </div>
        </div>
    `;

    bindLaunchContainer(missionSection);
}

/**
 * 最近のアプリUIを更新
 */
export function updateRecentUI() {
    const list = document.getElementById('recent-list');
    if (!list) return;
    list.innerHTML = '';
    const items = (Array.isArray(userProfile.recentApps) ? userProfile.recentApps : [])
        .filter(item => isSafeUrl(item?.url));
    bindLaunchContainer(list, true);
    if (!items.length) {
        list.innerHTML = '<p class="text-[11px] text-slate-400 font-bold px-1">まだありません</p>';
        return;
    }
    items.forEach(item => {
        // ボタンも<a>タグに変更するか、別タブで開くか
        const a = document.createElement('a');
        a.href = item.url;
        a.target = '_blank';
        a.className = 'block w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-600 font-bold flex items-center justify-between gap-2 transition group';
        a.dataset.launchApp = item.id;
        a.dataset.appName = item.name;

        const left = document.createElement('span');
        left.className = 'flex items-center gap-2';
        const icon = document.createElement('span');
        icon.className = 'material-symbols-rounded text-slate-400 text-base group-hover:text-blue-500';
        icon.textContent = 'play_arrow';
        const nameNode = document.createTextNode(item.name);
        left.appendChild(icon);
        left.appendChild(nameNode);

        const code = document.createElement('span');
        code.className = 'text-[10px] text-slate-400 uppercase';
        code.textContent = item.id;

        a.appendChild(left);
        a.appendChild(code);
        
        list.appendChild(a);
    });
}

/**
 * 現在のカテゴリを取得
 */
export function getCurrentCategory() {
    return currentCategory;
}