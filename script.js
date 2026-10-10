document.addEventListener('DOMContentLoaded', () => {

    let allProjects = [];
    let searchInput; // スコープを広げてキーボードショートカットでの ReferenceError を防止
    const projectFilterState = window.KatakataProjectFilterState;
    const projectHistory = window.KatakataProjectHistory;

    // --- P. iOS/Safari 対応の背景スクロール防止ヘルパー ---
    let scrollPosition = 0;
    function preventBodyScroll(prevent) {
        const body = document.body;
        const header = document.querySelector('.header');
        const bottomNav = document.querySelector('.bottom-nav');
        const scrollTopBtn = document.getElementById('scroll-top');

        if (prevent) {
            if (body.classList.contains('no-scroll')) return;
            const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
            scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
            
            body.style.position = 'fixed';
            body.style.top = `-${scrollPosition}px`;
            body.style.width = '100%';
            
            if (scrollBarWidth > 0) {
                body.style.paddingRight = `${scrollBarWidth}px`;
                if (header) header.style.paddingRight = `${scrollBarWidth}px`;
                if (bottomNav) bottomNav.style.paddingRight = `${scrollBarWidth}px`;
                if (scrollTopBtn) scrollTopBtn.style.marginRight = `${scrollBarWidth}px`;
            }
            body.classList.add('no-scroll');
        } else {
            if (!body.classList.contains('no-scroll')) return;
            body.style.position = '';
            body.style.top = '';
            body.style.width = '';
            body.style.paddingRight = '';
            
            if (header) header.style.paddingRight = '';
            if (bottomNav) bottomNav.style.paddingRight = '';
            if (scrollTopBtn) scrollTopBtn.style.marginRight = '';
            
            body.classList.remove('no-scroll');
            window.scrollTo(0, scrollPosition);
        }
    }

    // --- A. details (アコーディオン) のスムーズアニメーション化 ---
    document.querySelectorAll('.lab-note').forEach(details => {
        const summary = details.querySelector('summary');
        if (!summary) return;

        summary.addEventListener('click', (e) => {
            e.preventDefault(); // デフォルトの瞬時開閉を無効化
            if (details.classList.contains('is-animating')) return;
            details.classList.add('is-animating');

            const summaryHeight = summary.offsetHeight;

            if (!details.open) {
                details.open = true;
                const fullHeight = details.scrollHeight;
                details.style.height = `${summaryHeight}px`;
                details.style.overflow = 'hidden';

                const animation = details.animate([
                    { height: `${summaryHeight}px` },
                    { height: `${fullHeight}px` }
                ], {
                    duration: 300,
                    easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
                });

                animation.onfinish = () => {
                    details.style.height = '';
                    details.style.overflow = '';
                    details.classList.remove('is-animating');
                };
            } else {
                const currentHeight = details.offsetHeight;
                details.style.overflow = 'hidden';

                const animation = details.animate([
                    { height: `${currentHeight}px` },
                    { height: `${summaryHeight}px` }
                ], {
                    duration: 250,
                    easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
                });

                animation.onfinish = () => {
                    details.open = false;
                    details.style.height = '';
                    details.style.overflow = '';
                    details.classList.remove('is-animating');
                };
            }
        });
    });

    // --- 0. アンカーリンクで details 要素を自動展開 ---
    function openDetailsForHash() {
        const hash = location.hash;
        if (!hash) return;
        try {
            const target = document.querySelector(hash);
            if (!target) return;
            // target自身またはその祖先にdetailsがあれば展開
            let el = target;
            while (el && el !== document.body) {
                if (el.tagName === 'DETAILS') {
                    if (!el.open) {
                        el.open = true;
                    }
                    setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                    break;
                }
                el = el.parentElement;
            }
        } catch (e) { /* セレクタエラーを無視 */ }
    }
    openDetailsForHash();
    window.addEventListener('hashchange', openDetailsForHash);

    // --- 1. Mobile Menu Toggle ---
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const menuCloseBtn = document.querySelector('.menu-close-btn');
    const menuOverlay = document.querySelector('.menu-overlay') || document.getElementById('menu-overlay');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');
    const bars = document.querySelectorAll('.bar');

    function toggleMobileMenu(isOpen) {
        if (!mobileMenu) return;
        const active = (isOpen !== undefined) ? isOpen : !mobileMenu.classList.contains('active');
        const backElements = document.querySelectorAll('main, footer, .bottom-nav');

        if (active) {
            mobileMenu.classList.add('active');
            mobileMenu.setAttribute('aria-hidden', 'false');
            if (menuToggle) menuToggle.setAttribute('aria-expanded', 'true');
            if (menuOverlay) menuOverlay.classList.add('active');
            if (bars.length >= 3) {
                bars[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                bars[1].style.opacity = '0';
                bars[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
            }
            backElements.forEach(el => el.setAttribute('aria-hidden', 'true'));
            preventBodyScroll(true);
            
            // 開いたときに閉じボタンへフォーカス移動（アクセシビリティ向上）
            setTimeout(() => {
                if (menuCloseBtn) menuCloseBtn.focus();
            }, 50);
        } else {
            mobileMenu.classList.remove('active');
            mobileMenu.setAttribute('aria-hidden', 'true');
            if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
            if (menuOverlay) menuOverlay.classList.remove('active');
            if (bars.length >= 3) {
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            }
            backElements.forEach(el => el.removeAttribute('aria-hidden'));
            preventBodyScroll(false);
            
            // 閉じたとき元のボタンへフォーカスを戻す
            if (menuToggle) menuToggle.focus();
        }
    }

    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            toggleMobileMenu();
        });
    }

    if (menuCloseBtn) {
        menuCloseBtn.addEventListener('click', () => {
            toggleMobileMenu(false);
        });
    }

    // Close menu on overlay click
    if (menuOverlay) {
        menuOverlay.addEventListener('click', () => {
            toggleMobileMenu(false);
        });
    }

    // Close menu on link click
    if (mobileLinks && mobileMenu) {
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                toggleMobileMenu(false);
            });
        });
    }

    // --- 1.2 Mobile Menu Focus Trap & Global Focus Management ---
    if (mobileMenu) {
        mobileMenu.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' || e.keyCode === 9) {
                const focusableElements = mobileMenu.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
                if (focusableElements.length === 0) return;
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        });
    }

    // フォーカストラップ漏れを防止するグローバル監視
    document.addEventListener('focusin', (e) => {
        const modal = document.getElementById('project-modal');
        // モーダルがアクティブな場合、外部へのフォーカス移動を強制的に引き戻す
        if (modal && modal.classList.contains('active')) {
            if (!modal.contains(e.target)) {
                const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusableElements.length > 0) {
                    e.preventDefault();
                    focusableElements[0].focus();
                }
            }
        }
        // モバイルメニューがアクティブな場合も同様に引き戻す
        else if (mobileMenu && mobileMenu.classList.contains('active')) {
            if (!mobileMenu.contains(e.target) && e.target !== menuToggle) {
                const focusableElements = mobileMenu.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
                if (focusableElements.length > 0) {
                    e.preventDefault();
                    focusableElements[0].focus();
                }
            }
        }
    });

    // --- 2. Project Filtering & Search (Refactored & Optimized) ---
    
    // HTMLエスケープ関数（XSS対策＆属性値破壊防止）
    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag));
    }

    // デバウンス関数（タイピング時の負荷軽減）
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // IntersectionObserver を一度だけ初期化（メモリリーク防止）
    let globalObserver = null;
    if ('IntersectionObserver' in window) {
        globalObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    globalObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.05,
            rootMargin: '0px 0px -30px 0px'
        });
    }

    function bindScrollAnimations() {
        const cards = document.querySelectorAll('.projects-grid .card');
        cards.forEach(card => {
            if (!card.classList.contains('visible')) {
                card.classList.add('fade-in-up');
                if (globalObserver) {
                    globalObserver.observe(card);
                } else {
                    card.classList.add('visible');
                }
            }
        });
    }

    function shouldOpenProjectInNewTab(url) {
        if (!url || url.startsWith('#') || url.startsWith('mailto:')) return false;
        return true;
    }

    function renderProjectCard(p) {
        const isFeatured = p.featured;
        const url = p.url || '';
        const story = p.story || '';
        const guide = p.guide || '';
        const detailText = p.detail || '';
        const guideAttr = guide ? `data-guide="${escapeHTML(guide)}"` : '';
        const storyAttr = story ? `data-story="${escapeHTML(story)}"` : '';
        const aliasesAttr = `data-aliases="${escapeHTML(JSON.stringify(Array.isArray(p.aliases) ? p.aliases : []))}"`;

        return `
            <article class="card ${isFeatured ? 'card--featured' : ''}"
                     data-id="${escapeHTML(p.id)}"
                     data-group="${escapeHTML(p.group || 'primary')}"
                     data-category="${escapeHTML(p.category)}"
                     data-shelf="${escapeHTML(p.shelf)}"
                     data-url="${escapeHTML(url)}"
                     ${aliasesAttr}
                     ${storyAttr}
                     ${guideAttr}
                     data-detail="${escapeHTML(detailText)}">
                ${isFeatured ? '<div class="card-visual" aria-hidden="true">🧪</div>' : ''}
                <div class="card-body">
                    <div class="card-header">
                        <div class="card-tag ${escapeHTML(p.tagClass)}">${escapeHTML(p.tagText)}</div>
                        ${p.targetBadge ? `<span class="badge-target font-badge">${escapeHTML(p.targetBadge)}</span>` : ''}
                        ${p.statusBadge ? `<span class="badge-new">${escapeHTML(p.statusBadge)}</span>` : ''}
                    </div>
                    <h3 class="card-title">${escapeHTML(p.title)}</h3>
                    <p class="card-text">${escapeHTML(p.text)}</p>
                    ${p.guideLinks ? `
                        <div class="card-guide-links">
                            <span class="guide-label">クイックガイド:</span>
                            ${p.guideLinks.map(link => `<a href="${escapeHTML(link.url)}" class="guide-badge-link" target="_blank" rel="noopener noreferrer">${escapeHTML(link.text)}</a>`).join('')}
                        </div>
                    ` : ''}
                    <div class="card-actions">
                        <a href="${escapeHTML(url)}" class="card-link"${shouldOpenProjectInNewTab(url) ? ' target="_blank" rel="noopener noreferrer"' : ''}>使う →</a>
                        ${p.actions.detail ? '<button type="button" class="card-detail-btn">詳しく見る</button>' : ''}
                    </div>
                </div>
            </article>
        `;
    }

    function filterProjects({ syncUrl = true } = {}) {
        const primaryGrid = document.getElementById('projects-grid');
        const secondaryGrid = document.getElementById('secondary-projects-grid');
        const primaryTitle = document.getElementById('primary-projects-title');
        const secondaryProjects = document.getElementById('secondary-projects');
        const searchInput = document.getElementById('project-search');
        const searchClear = document.getElementById('search-clear');
        const noResults = document.getElementById('search-no-results');
        if (!primaryGrid || !secondaryGrid) return;

        const activeFilterBtn = document.querySelector('.shelf-nav-btn.active');
        const activeFilter = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';
        const searchQuery = searchInput ? searchInput.value.trim() : '';
        const searchText = projectFilterState
            ? projectFilterState.normalizeProjectSearchText(searchQuery)
            : searchQuery.toLowerCase();

        document.querySelectorAll('.shelf-nav-btn').forEach(button => {
            button.setAttribute('aria-pressed', button === activeFilterBtn ? 'true' : 'false');
        });

        if (searchClear) {
            searchClear.hidden = (searchText === '');
        }

        const filtered = allProjects.filter(p => {
            const matchesFilter = (activeFilter === 'all' || p.shelf === activeFilter);
            
            const corpus = projectFilterState
                ? projectFilterState.createProjectSearchCorpus(p)
                : [p.title, p.text, p.detail, p.tagText].filter(Boolean).join(' ').toLowerCase();
            const matchesSearch = !searchText || corpus.includes(searchText);

            return matchesFilter && matchesSearch;
        });

        const primaryProjects = filtered.filter(p => (p.group || 'primary') === 'primary');
        const secondaryItems = filtered.filter(p => p.group === 'secondary');

        primaryGrid.innerHTML = primaryProjects.map(renderProjectCard).join('');
        secondaryGrid.innerHTML = secondaryItems.map(renderProjectCard).join('');
        if (primaryTitle) primaryTitle.hidden = primaryProjects.length === 0;
        if (secondaryProjects) secondaryProjects.hidden = secondaryItems.length === 0;
        const secondaryHeading = document.getElementById('secondary-projects-heading');
        if (secondaryHeading) secondaryHeading.hidden = secondaryItems.length === 0;

        if (filtered.length === 0) {
            if (noResults) {
                noResults.hidden = false;
                noResults.classList.add('visible');
                const noResultsText = noResults.querySelector('.no-results-text');
                if (noResultsText) {
                    noResultsText.textContent = searchQuery
                        ? `「${searchQuery}」に一致するツールは見つかりませんでした。`
                        : `「${activeFilterBtn?.textContent.trim() || '選択中の棚'}」のツールは見つかりませんでした。`;
                }
            }
            renderSearchSuggestions(searchQuery, activeFilter);
        } else {
            if (noResults) {
                noResults.hidden = true;
                noResults.classList.remove('visible');
            }
            renderSearchSuggestions('');
            bindScrollAnimations();
        }

        const filterStatus = document.getElementById('project-filter-status');
        if (filterStatus) {
            const filterLabel = activeFilterBtn?.textContent.trim() || 'すべて';
            filterStatus.textContent = searchQuery
                ? `${filtered.length}件のツールが見つかりました。棚: ${filterLabel}、検索: ${searchQuery}`
                : `${filtered.length}件のツールを表示中。棚: ${filterLabel}`;
        }

        if (syncUrl && projectFilterState && window.history?.replaceState) {
            // 自由入力の検索語は通常閲覧URLへ残さず、GA4のpage_locationにも流れにくくする。
            // 共有ボタンを押した場合だけ、下の initProjectShare で検索語入りURLを生成する。
            const nextUrl = projectFilterState.buildProjectFilterUrl(window.location.href, {
                filter: activeFilter,
                query: '',
            });
            if (nextUrl && nextUrl !== window.location.href) {
                window.history.replaceState({ projectFilter: true }, '', nextUrl);
            }
        }
        updateProjectShareVisibility(activeFilter, searchQuery);
    }

    function renderSearchSuggestions(query, activeFilter = 'all') {
        const container = document.getElementById('search-suggestions');
        const list = document.getElementById('search-suggestions-list');
        if (!container || !list) return;
        if (!query || !projectFilterState?.getProjectSearchSuggestions) {
            container.hidden = true;
            list.innerHTML = '';
            return;
        }

        const candidates = activeFilter === 'all'
            ? allProjects
            : allProjects.filter((project) => project.shelf === activeFilter);
        const suggestions = projectFilterState.getProjectSearchSuggestions(candidates, query, 3);
        list.innerHTML = suggestions.map((project) => {
            const url = project.url || '#';
            const externalAttr = shouldOpenProjectInNewTab(url)
                ? ' target="_blank" rel="noopener noreferrer"'
                : '';
            return `<a class="search-suggestion-link" data-project-id="${escapeHTML(project.id)}" href="${escapeHTML(url)}"${externalAttr}>${escapeHTML(project.title)}</a>`;
        }).join('');
        container.hidden = suggestions.length === 0;
    }

    function updateProjectShareVisibility(activeFilter, query) {
        const row = document.getElementById('project-share-row');
        if (!row) return;
        row.hidden = activeFilter === 'all' && !query;
    }

    async function copyText(text) {
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (error) {
                // 権限やブラウザ制限がある場合は下の互換手段へ進む
            }
        }

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        let copied = false;
        try {
            copied = document.execCommand('copy');
        } catch (error) {
            copied = false;
        }
        textarea.remove();
        return copied;
    }

    function initProjectShare() {
        const shareButton = document.getElementById('project-share');
        const status = document.getElementById('project-share-status');
        if (!shareButton) return;

        shareButton.addEventListener('click', async () => {
            const activeFilterBtn = document.querySelector('.shelf-nav-btn.active');
            const activeFilter = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';
            const query = searchInput ? searchInput.value.trim() : '';
            const shareUrl = projectFilterState
                ? projectFilterState.buildProjectFilterUrl(window.location.href, {
                    filter: activeFilter,
                    query,
                })
                : window.location.href;

            const copied = await copyText(shareUrl);
            if (status) status.textContent = copied
                ? '絞り込みリンクをコピーしました。'
                : 'リンクをコピーできませんでした。URLを手動でコピーしてください。';
            if (copied && window.KatakataAnalytics?.trackShare) {
                window.KatakataAnalytics.trackShare(
                    'clipboard',
                    'project_filter',
                    activeFilter === 'all' ? 'search_filter' : activeFilter,
                );
            }
            const originalLabel = '🔗 絞り込みを共有';
            shareButton.textContent = copied ? '✅ コピーしました' : originalLabel;
            window.setTimeout(() => {
                shareButton.textContent = originalLabel;
            }, 1600);
        });
    }

    function renderRecentProjects() {
        const section = document.getElementById('recent-projects');
        const list = document.getElementById('recent-projects-list');
        if (!section || !list || !projectHistory) return;

        const projectsById = new Map(allProjects.map((project) => [project.id, project]));
        const recentProjects = projectHistory.readRecentProjectIds()
            .map((id) => projectsById.get(id))
            .filter(Boolean);
        list.innerHTML = recentProjects.map((project) => {
            const url = project.url || '#';
            const externalAttr = shouldOpenProjectInNewTab(url)
                ? ' target="_blank" rel="noopener noreferrer"'
                : '';
            return `<a class="recent-project-link" data-project-id="${escapeHTML(project.id)}" href="${escapeHTML(url)}"${externalAttr}>${escapeHTML(project.title)}</a>`;
        }).join('');
        section.hidden = recentProjects.length === 0;
    }

    function initProjectHistory() {
        if (!projectHistory) return;
        const clearButton = document.getElementById('recent-projects-clear');

        document.addEventListener('click', (event) => {
            const link = event.target.closest('.card-link, .search-suggestion-link, .recent-project-link');
            if (!link) return;
            const card = link.closest('[data-id]');
            const projectId = card?.getAttribute('data-id') || link.getAttribute('data-project-id');
            if (!projectId) return;
            projectHistory.recordRecentProject(projectId);
            renderRecentProjects();
        });

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                projectHistory.clearRecentProjects();
                renderRecentProjects();
                clearButton.focus();
            });
        }
    }

    // デバウンスされたフィルタ関数
    const debouncedFilter = debounce(filterProjects, 150);

    function initProjects() {
        // フィルタボタン設定（即時反映）
        const filterBtns = document.querySelectorAll('.shelf-nav-btn');
        const initialState = projectFilterState
            ? projectFilterState.readProjectFilterState(window.location.search)
            : { filter: 'all', query: '' };
        const initialFilterBtn = Array.from(filterBtns).find(btn => btn.getAttribute('data-filter') === initialState.filter);
        if (initialFilterBtn) {
            filterBtns.forEach(btn => btn.classList.toggle('active', btn === initialFilterBtn));
        }

        // 共有URLから初期状態を復元する
        searchInput = document.getElementById('project-search');
        if (searchInput) searchInput.value = initialState.query;

        filterProjects({ syncUrl: false });

        if (filterBtns.length > 0) {
            filterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    filterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    filterProjects();
                });
            });
        }

        // 検索入力設定
        const searchClear = document.getElementById('search-clear');
        if (searchInput) {
            let isComposing = false;
            searchInput.addEventListener('compositionstart', () => { isComposing = true; });
            searchInput.addEventListener('compositionend', () => {
                isComposing = false;
                filterProjects(); // 確定時は即時反映
            });
            searchInput.addEventListener('input', () => {
                if (!isComposing) {
                    debouncedFilter(); // タイピング中はデバウンス
                }
            });

            if (searchClear) {
                searchClear.addEventListener('click', () => {
                    searchInput.value = '';
                    searchClear.hidden = true;
                    searchInput.focus();
                    filterProjects(); // 即時反映
                });
            }
        }

        // 検索結果0件時クリア設定（即時反映）
        const noResultsClearBtn = document.getElementById('no-results-clear-btn');
        if (noResultsClearBtn) {
            noResultsClearBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (searchClear) searchClear.hidden = true;
                filterProjects();
            });
        }

        window.addEventListener('popstate', () => {
            if (!projectFilterState) return;
            const state = projectFilterState.readProjectFilterState(window.location.search);
            filterBtns.forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-filter') === state.filter);
            });
            if (searchInput) searchInput.value = state.query;
            filterProjects({ syncUrl: false });
        });
    }

    // 初期HTMLのカードをフォールバック用データとして読み取る
    function readStaticProjects() {
        return Array.from(document.querySelectorAll('[data-project-card="static"]')).map(card => ({
            id: card.dataset.id || '',
            group: card.dataset.group || 'primary',
            category: card.dataset.category || '',
            shelf: card.dataset.shelf || '',
            url: card.dataset.url || '',
            story: card.dataset.story || '',
            guide: card.dataset.guide || '',
            detail: card.dataset.detail || '',
            featured: card.classList.contains('card--featured'),
            tagText: card.querySelector('.card-tag')?.textContent.trim() || '',
            tagClass: Array.from(card.querySelector('.card-tag')?.classList || []).find(name => name.startsWith('tag-')) || '',
            targetBadge: card.querySelector('.badge-target')?.textContent.trim() || '',
            statusBadge: card.querySelector('.badge-new')?.textContent.trim() || '',
            title: card.querySelector('.card-title')?.textContent.trim() || '',
            text: card.querySelector('.card-text')?.textContent.trim() || '',
            aliases: (() => {
                try {
                    const aliases = JSON.parse(card.getAttribute('data-aliases') || '[]');
                    return Array.isArray(aliases) ? aliases : [];
                } catch (error) {
                    return [];
                }
            })(),
            guideLinks: Array.from(card.querySelectorAll('.guide-badge-link')).map(link => ({
                text: link.textContent.trim(),
                url: link.getAttribute('href') || ''
            })),
            actions: {
                // D7: 主操作は常に「使う」表記に寄せる（カード種別で揺らがない）
                mainText: '使う →',
                detail: Boolean(card.querySelector('.card-detail-btn'))
            }
        }));
    }

    function getProjectDataUrl() {
        const scriptSource = document.querySelector('script[src*="script.js"]')?.getAttribute('src') || '';
        let version = 'latest';
        try {
            version = new URL(scriptSource, window.location.href).searchParams.get('v') || version;
        } catch (error) {
            // 静的フォールバックを使い、データ取得自体は続ける
        }
        return `/projects.json?v=${encodeURIComponent(version)}`;
    }

    // 静的カードで先に操作可能にし、JSON取得後に内容を同期する
    const grid = document.getElementById('projects-grid');
    if (grid) {
        allProjects = readStaticProjects();
        initProjects();
        initProjectShare();
        initProjectHistory();
        renderRecentProjects();

        fetch(getProjectDataUrl())
            .then(response => {
                if (!response.ok) throw new Error('Failed to load projects');
                return response.json();
            })
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) throw new Error('Projects data is empty');
                allProjects = data;
                filterProjects();
                renderRecentProjects();
            })
            .catch(err => {
                console.warn('作品データの更新取得に失敗したため静的カードを使用します:', err);
                const status = document.getElementById('project-data-status');
                if (status) status.hidden = false;
            });
    }

    // --- A2: ヒーロー「もっと読む」（モバイルでサブを折りたたみ） ---
    const heroMoreBtn = document.getElementById('hero-more-btn');
    const heroSubtitle = document.getElementById('hero-subtitle');
    if (heroMoreBtn && heroSubtitle) {
        heroMoreBtn.addEventListener('click', () => {
            const nowCollapsed = heroSubtitle.classList.toggle('is-collapsed');
            heroMoreBtn.setAttribute('aria-expanded', nowCollapsed ? 'false' : 'true');
            heroMoreBtn.textContent = nowCollapsed ? 'もっと読む' : '閉じる';
        });
    }

    // --- 3. Dark Mode Toggle ---
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');

    function updateThemeColorMeta() {
        if (!metaThemeColor) return;
        if (body.classList.contains('dark-mode')) {
            metaThemeColor.setAttribute('content', '#0B132B');
        } else {
            metaThemeColor.setAttribute('content', '#FF7675');
        }
    }

    function updateThemeToggleIcon(isDark) {
        if (!themeToggle) return;
        const moonIcon = themeToggle.querySelector('.svg-moon');
        const sunIcon = themeToggle.querySelector('.svg-sun');
        if (moonIcon && sunIcon) {
            if (isDark) {
                moonIcon.style.display = 'none';
                sunIcon.style.display = 'block';
            } else {
                moonIcon.style.display = 'block';
                sunIcon.style.display = 'none';
            }
        } else {
            // 旧ページの互換用フォールバック
            themeToggle.textContent = isDark ? '☀️' : '🌙';
        }
    }

    if (themeToggle) {
        const prefersDarkScheme = typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-color-scheme: dark)')
            : null;

        function applyTheme(isDark) {
            body.classList.toggle('dark-mode', isDark);
            updateThemeToggleIcon(isDark);
            updateThemeColorMeta();
        }

        function readSavedTheme() {
            const savedTheme = localStorage.getItem('theme');
            return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : null;
        }

        const savedTheme = readSavedTheme();
        applyTheme(savedTheme ? savedTheme === 'dark' : Boolean(prefersDarkScheme?.matches));

        themeToggle.addEventListener('click', () => {
            const isDark = !body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            applyTheme(isDark);
        });

        const syncWithSystemTheme = (event) => {
            if (readSavedTheme()) return;
            applyTheme(event.matches);
        };

        if (prefersDarkScheme?.addEventListener) {
            prefersDarkScheme.addEventListener('change', syncWithSystemTheme);
        } else if (prefersDarkScheme?.addListener) {
            prefersDarkScheme.addListener(syncWithSystemTheme);
        }
    }

    // --- 4. Scroll to Top Button ---
    const scrollTopBtn = document.getElementById('scroll-top');
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // --- 5. Interactive Hero Flask (Fun!) ---
    const flask = document.getElementById('interactive-flask');
    const labThemes = [
        {
            name: 'コーラルピンク（情熱・メイン）',
            primary: '#FF7675',
            darkPrimary: '#D63031',
            accent: '#FFEAA7',
            rgb: '255, 118, 117'
        },
        {
            name: 'スカイブルー（実用Webツール）',
            primary: '#54A0FF',
            darkPrimary: '#2E86DE',
            accent: '#74B9FF',
            rgb: '84, 160, 255'
        },
        {
            name: 'エメラルドミント（読書・研究・知のひらめき）',
            primary: '#10B981',
            darkPrimary: '#059669',
            accent: '#55EFC4',
            rgb: '16, 185, 129'
        },
        {
            name: 'ラベンダーパープル（遊び・好奇心・ゲーム）',
            primary: '#786FA6',
            darkPrimary: '#5F27CD',
            accent: '#A29BFE',
            rgb: '120, 111, 166'
        },
        {
            name: 'サンイエロー（教育・あたたかさ・秘密基地）',
            primary: '#F5CD79',
            darkPrimary: '#E5A93C',
            accent: '#FFEAA7',
            rgb: '245, 205, 121'
        }
    ];

    let currentThemeIndex = 0;

    function applyLabTheme(index, isInteractive = false) {
        const theme = labThemes[index];
        if (!theme) return;
        currentThemeIndex = index;

        document.documentElement.style.setProperty('--c-primary', theme.primary);
        document.documentElement.style.setProperty('--c-primary-dark', theme.darkPrimary);
        document.documentElement.style.setProperty('--c-accent', theme.accent);
        document.documentElement.style.setProperty('--card-theme-rgb', theme.rgb);

        if (flask) {
            const liquid = flask.querySelector('.art-flask-liquid');
            if (liquid) {
                liquid.style.background = `linear-gradient(180deg, ${theme.primary} 0%, ${theme.darkPrimary} 100%)`;
            }
            const bubbles = flask.querySelectorAll('.art-bubble');
            bubbles.forEach(b => {
                b.style.borderColor = theme.primary;
            });
            const flaskBtn = flask.querySelector('.cozy-lab-art');
            if (flaskBtn) {
                flaskBtn.setAttribute('aria-label', `フラスコを振って色を変更（現在: ${theme.name}）`);
                flaskBtn.setAttribute('title', `現在: ${theme.name}（クリックで色が変わります）`);
            }
            if (isInteractive) {
                flask.style.transition = 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)';
                flask.style.transform = 'scale(0.9) rotate(8deg)';
                setTimeout(() => {
                    flask.style.transform = 'scale(1.06) rotate(-4deg)';
                    setTimeout(() => {
                        flask.style.transform = 'scale(1) rotate(0deg)';
                    }, 140);
                }, 140);
            }
        }

        try {
            localStorage.setItem('lab_theme_index', String(index));
            localStorage.setItem('lab_accent_color', theme.primary);
        } catch(e) {}
    }

    try {
        const savedIndex = localStorage.getItem('lab_theme_index');
        if (savedIndex !== null && !isNaN(Number(savedIndex))) {
            const idx = Number(savedIndex) % labThemes.length;
            applyLabTheme(idx, false);
        } else {
            const savedColor = localStorage.getItem('lab_accent_color');
            if (savedColor) {
                const found = labThemes.findIndex(t => t.primary.toLowerCase() === savedColor.toLowerCase());
                if (found !== -1) {
                    applyLabTheme(found, false);
                } else {
                    document.documentElement.style.setProperty('--c-accent', savedColor);
                    document.documentElement.style.setProperty('--c-primary', savedColor);
                }
            }
        }
    } catch(e) {}

    if (flask) {
        flask.addEventListener('click', () => {
            const nextIndex = (currentThemeIndex + 1) % labThemes.length;
            applyLabTheme(nextIndex, true);
        });
    }

    // --- 6. Scroll Animations ---
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '100px 0px 100px 0px'
    };

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.section-title, .about-card, .link-card').forEach(el => {
            el.classList.add('fade-in-up');
            observer.observe(el);
        });
        // カード群はコンテンツファーストで即時可視化を担保
        document.querySelectorAll('.card').forEach(el => {
            el.classList.add('visible');
        });
    } else {
        document.querySelectorAll('.section-title, .card, .about-card, .link-card').forEach(el => {
            el.classList.add('visible');
        });
    }

    // --- 7. Phase 2 Features ---


    // 7.2 Quick View Modal
    const modal = document.getElementById('project-modal');
    if (modal) {
        const modalClose = modal.querySelector('.modal-close');
        const modalTitle = modal.querySelector('.modal-title');
        const modalDesc = modal.querySelector('.modal-desc');
        const modalTag = modal.querySelector('.modal-tag');
        const modalMainLink = modal.querySelector('.modal-main-link');
        const modalStoryLink = modal.querySelector('.modal-story-link');
        const modalGuideLink = modal.querySelector('.modal-guide-link');
        const modalShare = modal.querySelector('.modal-share');
        const projectGrids = document.querySelectorAll('.projects-grid');
        let lastFocusedElement;

        if (projectGrids.length > 0) {
            projectGrids.forEach(projectsGrid => projectsGrid.addEventListener('click', (e) => {
                const detailBtn = e.target.closest('.card-detail-btn');
                if (detailBtn) {
                    e.preventDefault();
                    lastFocusedElement = document.activeElement;
                    const card = detailBtn.closest('.card');
                    if (!card) return;

                    const titleEl = card.querySelector('.card-title');
                    const textEl = card.querySelector('.card-text');
                    const tagEl = card.querySelector('.card-tag');

                    if (modalTitle && titleEl) modalTitle.textContent = titleEl.textContent;
                    if (modalDesc && textEl) modalDesc.textContent = card.getAttribute('data-detail') || textEl.textContent;
                    if (modalTag && tagEl) {
                        modalTag.textContent = tagEl.textContent;
                        const tagClass = Array.from(tagEl.classList).find(c => c.startsWith('tag-'));
                        if (tagClass) modalTag.className = 'modal-tag ' + tagClass;
                    }

                    const url = card.getAttribute('data-url');
                    const story = card.getAttribute('data-story');
                    const guide = card.getAttribute('data-guide');

                    if (modalMainLink) {
                        if (url) { 
                            modalMainLink.href = url; 
                            modalMainLink.style.display = 'inline-flex'; 
                            if (shouldOpenProjectInNewTab(url)) {
                                modalMainLink.target = '_blank';
                                modalMainLink.rel = 'noopener noreferrer';
                            } else {
                                modalMainLink.removeAttribute('target');
                                modalMainLink.removeAttribute('rel');
                            }
                        }
                        else { modalMainLink.style.display = 'none'; }
                    }

                    if (modalStoryLink) {
                        if (story) { modalStoryLink.href = story; modalStoryLink.style.display = 'inline-flex'; }
                        else { modalStoryLink.style.display = 'none'; }
                    }

                    if (modalGuideLink) {
                        if (guide) { modalGuideLink.href = guide; modalGuideLink.style.display = 'inline-flex'; }
                        else { modalGuideLink.style.display = 'none'; }
                    }

                    // Show — aria-hidden と body.no-scroll も制御
                    modal.classList.add('active');
                    modal.setAttribute('aria-hidden', 'false');
                    preventBodyScroll(true);

                    // モーダル以外のすべてのルート直下要素を非活性化（スクリーンリーダー漏れを完全排除）
                    const backElements = Array.from(document.body.children).filter(el => {
                        return el !== modal && el.tagName !== 'SCRIPT';
                    });
                    backElements.forEach(el => el.setAttribute('aria-hidden', 'true'));

                    if (modalClose) modalClose.focus();
                    return;
                }

                // カード全体のクリッカブル化（詳しく見るボタンや個別リンク以外のカード表面をクリックしたときはツールへ直行）
                const card = e.target.closest('.card');
                if (card && !e.target.closest('a') && !e.target.closest('button')) {
                    const mainLink = card.querySelector('.card-link');
                    if (mainLink && mainLink.href) {
                        if (mainLink.target === '_blank') {
                            window.open(mainLink.href, '_blank', 'noopener,noreferrer');
                        } else {
                            window.location.href = mainLink.href;
                        }
                    }
                }
            }));
        }

        function closeModal() {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            preventBodyScroll(false);

            // 背後要素の aria-hidden を解除
            const backElements = Array.from(document.body.children).filter(el => {
                return el !== modal && el.tagName !== 'SCRIPT';
            });
            backElements.forEach(el => el.removeAttribute('aria-hidden'));

            if (lastFocusedElement) lastFocusedElement.focus();
        }

        if (modalClose) {
            modalClose.addEventListener('click', closeModal);
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Focus Trap inside Modal (ゴーストフォーカスを排除し、視覚的に表示されている要素のみを対象化)
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' || e.keyCode === 9) {
                const rawElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                // 表示されている要素のみをフィルタリング
                const focusableElements = Array.from(rawElements).filter(el => {
                    return !el.hasAttribute('hidden') && el.offsetParent !== null;
                });
                if (focusableElements.length === 0) return;
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) { e.preventDefault(); lastElement.focus(); }
                } else {
                    if (document.activeElement === lastElement) { e.preventDefault(); firstElement.focus(); }
                }
            }
        });

        // Share Functionality
        if (modalShare) {
            modalShare.addEventListener('click', async () => {
                const shareData = {
                    title: 'KatakataLab - ' + (modalTitle ? modalTitle.textContent : ''),
                    text: modalDesc ? modalDesc.textContent : '',
                    url: window.location.href
                };

                if (navigator.share) {
                    try {
                        await navigator.share(shareData);
                    } catch (err) {
                        console.log('Share canceled');
                    }
                } else {
                    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.title)}&url=${encodeURIComponent(shareData.url)}`;
                    window.open(twitterUrl, '_blank');
                }
            });
        }
    }

    // --- 8. Keyboard Shortcuts (グローバル) ---
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('project-modal');

        if (e.key === 'Escape') {
            // モーダルが開いていれば閉じる
            if (modal && modal.classList.contains('active')) {
                modal.querySelector('.modal-close') && modal.querySelector('.modal-close').click();
            }
            // モバイルメニューが開いていれば閉じる
            else if (mobileMenu && mobileMenu.classList.contains('active')) {
                toggleMobileMenu(false);
                if (menuToggle) menuToggle.focus();
            }
            if (searchInput) searchInput.blur();
        }

        // / : Focus Search
        if (e.key === '/' && searchInput && document.activeElement !== searchInput) {
            e.preventDefault();
            searchInput.focus();
        }

        // T : Toggle Theme
        if ((e.key === 't' || e.key === 'T') && themeToggle) {
            if (searchInput && document.activeElement !== searchInput) {
                themeToggle.click();
            }
        }
    });

    // --- 9. Scroll Handler (統合・RAF最適化・レイアウト再計算の完全排除) ---
    const bottomNavLinks = document.querySelectorAll('.bottom-nav-link');
    const cachedSections = Array.from(document.querySelectorAll('section, details#updates'));
    let sectionDimensions = [];
    let scrollTicking = false;

    // セクションの位置と高さをキャッシュする関数
    function updateSectionDimensions() {
        sectionDimensions = cachedSections.map(section => {
            return {
                id: section.getAttribute('id'),
                top: section.offsetTop - 150,
                bottom: section.offsetTop - 150 + section.offsetHeight
            };
        });
    }

    // 初期化時とリサイズ時にのみDOMプロパティを読み込みキャッシュを更新
    updateSectionDimensions();
    window.addEventListener('resize', debounce(updateSectionDimensions, 200));

    function onScroll() {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        // scroll-top-btn
        if (scrollTopBtn) {
            scrollTopBtn.classList.toggle('visible', scrollY > 300);
        }
        
        // bottom-nav アクティブ状態（キャッシュされた値を使用し、Reflow / Layout Thrashingを完全排除）
        if (bottomNavLinks.length > 0 && sectionDimensions.length > 0) {
            let current = '';
            for (let i = 0; i < sectionDimensions.length; i++) {
                const dim = sectionDimensions[i];
                if (scrollY >= dim.top && scrollY < dim.bottom) {
                    current = dim.id;
                    break;
                }
            }
            if (current) {
                bottomNavLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === '#' + current);
                });
            }
        }
        scrollTicking = false;
    }

    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            requestAnimationFrame(onScroll);
            scrollTicking = true;
        }
    }, { passive: true });

    if (bottomNavLinks.length > 0) {
        bottomNavLinks.forEach(link => {
            link.addEventListener('click', function() {
                bottomNavLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    // --- 10. PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
            .then(reg => console.log('SW registered', reg))
            .catch(err => console.warn('SW failed:', err));
    }

    // --- 11. Footer Copyright Year Auto-Update ---
    const copyYearEl = document.getElementById('copy-year');
    if (copyYearEl) {
        copyYearEl.textContent = new Date().getFullYear();
    }

    // --- 12. PWA Custom Install Prompt Handling (PC & Mobile Support) ---
    let deferredPrompt;
    const pwaInstallBtn = document.getElementById('pwa-install-btn');
    const pwaInstallBtnMobile = document.getElementById('pwa-install-btn-mobile');
    const pwaInstallLiMobile = document.getElementById('pwa-install-li-mobile');
    const pwaInstallSepMobile = document.getElementById('pwa-install-sep-mobile');
    
    function setInstallPromptVisible(visible) {
        if (pwaInstallBtn) {
            pwaInstallBtn.hidden = !visible;
            pwaInstallBtn.style.display = visible ? 'inline-flex' : 'none';
        }
        if (pwaInstallBtnMobile && pwaInstallLiMobile && pwaInstallSepMobile) {
            pwaInstallBtnMobile.hidden = !visible;
            pwaInstallLiMobile.hidden = !visible;
            pwaInstallSepMobile.hidden = !visible;
        }
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        setInstallPromptVisible(true);
    });

    async function handleInstallPromptClick() {
        if (!deferredPrompt) return;
        setInstallPromptVisible(false);
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA install prompt outcome: ${outcome}`);
        deferredPrompt = null;
    }

    if (pwaInstallBtn) {
        pwaInstallBtn.addEventListener('click', handleInstallPromptClick);
    }
    if (pwaInstallBtnMobile) {
        pwaInstallBtnMobile.addEventListener('click', handleInstallPromptClick);
    }

    window.addEventListener('appinstalled', () => {
        console.log('PWA appinstalled successfully');
        setInstallPromptVisible(false);
    });

});
