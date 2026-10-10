/**
 * PikaLab Articles Hub - Interactive Search, Filtering & Pagination
 * High-performance client-side filtering with URL sync and empty state.
 */
(() => {
    'use strict';

    function initHub() {
        const articleList = document.getElementById('article-list');
        if (!articleList) return;

        const articles = Array.from(articleList.querySelectorAll('.premium-article-card'));
        if (articles.length === 0) return;

        const loadMoreBtn = document.getElementById('load-more-btn');
        const loadMoreContainer = document.getElementById('load-more-container');
        const searchInputs = Array.from(document.querySelectorAll('.article-search-input, input[aria-label="サイト内検索"]'));
        const pills = Array.from(document.querySelectorAll('.worry-pill'));
        const noResults = document.getElementById('no-results-state');
        const resultCountBadge = document.getElementById('search-result-count');

        const INITIAL_COUNT = 6;
        const PAGE_STEP = 10;

        // Precompute lowercase search text for each article to optimize performance
        const articleData = articles.map(card => {
            const titleEl = card.querySelector('.title') || card.querySelector('h2, h3');
            const bodyEl = card.querySelector('.body') || card.querySelector('p');
            const tagEl = card.querySelector('.tag');
            const category = (card.getAttribute('data-category') || '').trim();

            const title = titleEl ? titleEl.textContent.trim().toLowerCase() : '';
            const body = bodyEl ? bodyEl.textContent.trim().toLowerCase() : '';
            const tag = tagEl ? tagEl.textContent.trim().toLowerCase() : '';

            return {
                card,
                category,
                searchText: `${title} ${body} ${tag} ${category.toLowerCase()}`
            };
        });

        // Read initial state from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        let currentFilter = urlParams.get('category') || 'all';
        let searchQuery = (urlParams.get('q') || '').trim();
        let currentlyVisible = INITIAL_COUNT;

        // Validate currentFilter against available pills
        const validFilterExists = pills.some(p => p.getAttribute('data-filter') === currentFilter);
        if (!validFilterExists && currentFilter !== 'all') {
            currentFilter = 'all';
        }

        // Initialize search inputs with URL query
        searchInputs.forEach(input => {
            input.value = searchQuery;
        });

        // Sync pill UI
        function updatePillUI() {
            pills.forEach(pill => {
                const filter = pill.getAttribute('data-filter');
                if (filter === currentFilter) {
                    pill.classList.add('active-pill');
                } else {
                    pill.classList.remove('active-pill');
                }
            });
        }

        // Update URL search parameters smoothly without page reload
        function syncURLParams() {
            const params = new URLSearchParams(window.location.search);
            params.delete('category');
            params.delete('q');
            if (currentFilter && currentFilter !== 'all') {
                params.set('category', currentFilter);
            }
            if (searchQuery) {
                params.set('q', searchQuery);
            }
            const queryString = params.toString();
            const path = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
            const newUrl = path + window.location.hash;
            window.history.replaceState({ category: currentFilter, q: searchQuery }, '', newUrl);
        }

        // Apply filtering, search, and pagination
        function applyLimitAndFilter() {
            const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
            let totalMatched = 0;
            let visibleCount = 0;
            const animatedCards = [];

            articleData.forEach(item => {
                const { card, category, searchText } = item;
                card.classList.remove('article-fade-in', 'hidden-article', 'article-hidden-by-limit');

                const matchCategory = currentFilter === 'all' || category === currentFilter;
                const matchSearch = queryWords.length === 0 || queryWords.every(word => searchText.includes(word));
                const matches = matchCategory && matchSearch;

                if (matches) {
                    totalMatched++;
                    if (currentlyVisible > visibleCount) {
                        animatedCards.push(card);
                        visibleCount++;
                    } else {
                        card.classList.add('article-hidden-by-limit');
                    }
                } else {
                    card.classList.add('hidden-article');
                }
            });

            // 全カードの表示状態をまとめて反映してから、一度だけ再レイアウトする。
            // カードごとの読み取り・書き込み往復を避け、同じフェード演出を保つ。
            if (animatedCards.length) {
                void articleList.offsetWidth;
                animatedCards.forEach(card => card.classList.add('article-fade-in'));
            }

            // Update "Load More" button visibility
            if (loadMoreContainer) {
                loadMoreContainer.style.display = (totalMatched > currentlyVisible) ? 'block' : 'none';
            }

            // Update Empty State
            if (noResults) {
                noResults.style.display = (totalMatched === 0) ? 'block' : 'none';
            }

            // Update result count badge if present
            if (resultCountBadge) {
                if (currentFilter !== 'all' || searchQuery !== '') {
                    resultCountBadge.textContent = `${totalMatched}件`;
                    resultCountBadge.style.display = 'inline-flex';
                } else {
                    resultCountBadge.style.display = 'none';
                }
            }

            updatePillUI();
            syncURLParams();
        }

        // Search Input Handlers (debounced for smoothness)
        let searchTimer = null;
        searchInputs.forEach(input => {
            input.addEventListener('input', () => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    searchQuery = input.value.trim();
                    // Sync other search inputs if any
                    searchInputs.forEach(other => {
                        if (other !== input) other.value = input.value;
                    });
                    currentlyVisible = INITIAL_COUNT;
                    applyLimitAndFilter();
                }, 150);
            });

            // Clear on Escape
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && input.value) {
                    input.value = '';
                    searchInputs.forEach(other => { other.value = ''; });
                    searchQuery = '';
                    currentlyVisible = INITIAL_COUNT;
                    applyLimitAndFilter();
                }
            });
        });

        // Pill Click Handlers
        pills.forEach(pill => {
            pill.addEventListener('click', (e) => {
                e.preventDefault();
                currentFilter = pill.getAttribute('data-filter') || 'all';
                currentlyVisible = INITIAL_COUNT;
                applyLimitAndFilter();

                // Smooth scroll up if user is past the list top
                const rect = articleList.getBoundingClientRect();
                if (rect.top < 0) {
                    window.scrollTo({
                        top: articleList.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Load More Click Handler
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                currentlyVisible += PAGE_STEP;
                applyLimitAndFilter();
            });
        }

        // Reset Filter & Search Button (inside Empty State)
        const resetBtn = document.getElementById('reset-filters-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                currentFilter = 'all';
                searchQuery = '';
                searchInputs.forEach(input => { input.value = ''; });
                currentlyVisible = INITIAL_COUNT;
                applyLimitAndFilter();
            });
        }

        // Handle browser Back/Forward navigation
        window.addEventListener('popstate', (e) => {
            const state = e.state || {};
            const params = new URLSearchParams(window.location.search);
            currentFilter = state.category || params.get('category') || 'all';
            searchQuery = (state.q !== undefined ? state.q : params.get('q')) || '';
            searchInputs.forEach(input => { input.value = searchQuery; });
            currentlyVisible = INITIAL_COUNT;
            applyLimitAndFilter();
        });

        // Initial application
        applyLimitAndFilter();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHub);
    } else {
        initHub();
    }
})();
