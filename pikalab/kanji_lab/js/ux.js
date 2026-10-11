// --- KANJI LAB UX ENHANCEMENTS ---
(function () {
    'use strict';

    const Data = window.KanjiLabData;
    const Roles = window.KanjiLabRoles || null;
    if (!Data) return;

    const UX_STATE = {
        partnerOnly: window.matchMedia('(max-width: 767px)').matches,
        showDeepParts: false,
        anchorSide: null,
        collectionFilter: 'all',
        partQueries: { left: '', right: '' },
        collectionQuery: ''
    };

    const MODAL_CONFIGS = [
        { modalId: 'help-modal', panelId: 'help-content', closeId: 'close-help-btn' },
        { modalId: 'settings-modal', panelId: 'settings-content', closeId: 'close-settings-btn' },
        { modalId: 'title-modal', panelId: 'title-content', closeId: 'close-title-btn' },
        { modalId: 'dict-detail-modal', panelId: 'dict-detail-content', closeId: 'close-dict-detail-btn' },
        { modalId: 'collection-modal', panelId: 'collection-panel', closeId: 'close-collection-btn' },
        { modalId: 'wrong-modal', panelId: 'wrong-panel', closeId: 'close-wrong-btn' }
    ];

    function whenAppReady(callback) {
        const run = () => {
            if (window.App) callback(window.App);
            else setTimeout(run, 0);
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run, { once: true });
        } else {
            run();
        }
    }

    function ensureStylesheet() {
        if (document.querySelector('link[data-kanji-ux-style]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = './ux.css?v=20260831b';
        link.dataset.kanjiUxStyle = 'true';
        document.head.appendChild(link);
    }

    function currentMode() {
        return document.getElementById('mode-ud')?.getAttribute('aria-pressed') === 'true' ? 'ud' : 'lr';
    }

    function currentPool() {
        return currentMode() === 'ud' ? Data.KANJI_UD : Data.KANJI_LR;
    }

    function normalizeText(value) {
        return String(value || '').normalize('NFKC').toLowerCase().trim();
    }

    const entrySearchCache = new WeakMap();
    function entryHaystack(entry) {
        if (!entrySearchCache.has(entry)) {
            entrySearchCache.set(entry, normalizeText([entry.k, entry.l, entry.r, entry.y, entry.on, entry.kun, entry.m].filter(Boolean).join(' ')));
        }
        return entrySearchCache.get(entry);
    }

    // パーツごとの検索・相棒・役割を一度索引化し、入力ごとの全件走査を避ける。
    const poolIndexCache = new WeakMap();
    function poolIndex(pool = currentPool()) {
        if (!poolIndexCache.has(pool)) {
            const index = { left: new Map(), right: new Map() };
            for (const entry of pool) {
                for (const [side, part, partner] of [['left', entry.l, entry.r], ['right', entry.r, entry.l]]) {
                    if (!index[side].has(part)) index[side].set(part, { entries: [], partners: new Set(), deepOnly: true });
                    const item = index[side].get(part);
                    item.entries.push(entry);
                    item.partners.add(partner);
                    item.deepOnly = item.deepOnly && getTier(entry.k) === 'deep';
                }
            }
            index.deepOnlyCount = [...index.left.values(), ...index.right.values()].filter(item => item.deepOnly).length;
            poolIndexCache.set(pool, index);
        }
        return poolIndexCache.get(pool);
    }

    function getStoredCollection() {
        if (window.App?.storage?.getCollection) return window.App.storage.getCollection();
        try {
            const raw = localStorage.getItem('pikalab_kanji_progress');
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed?.collection) ? parsed.collection.filter(k => typeof k === 'string') : [];
        } catch (_) {
            return [];
        }
    }

    function getTier(kanji) {
        return Roles?.getTier ? Roles.getTier(kanji) : 'standard';
    }

    function setPressed(button, pressed) {
        if (!button) return;
        button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    }

    function makeKeyboardClickable(element, label) {
        if (!element || element.dataset.uxKeyboardClickable === 'true') return;
        element.dataset.uxKeyboardClickable = 'true';
        element.classList.add('ux-keyboard-clickable');
        element.setAttribute('role', 'button');
        element.tabIndex = 0;
        if (label) element.setAttribute('aria-label', label);
        element.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            element.click();
        });
    }

    function syncTabA11y() {
        const tabLab = document.getElementById('tab-lab');
        const tabGame = document.getElementById('tab-game');
        const viewLab = document.getElementById('view-lab');
        const viewGame = document.getElementById('view-game');
        const tabList = tabLab?.parentElement;
        if (tabList) tabList.setAttribute('role', 'tablist');
        [tabLab, tabGame].forEach(btn => btn?.setAttribute('role', 'tab'));
        if (viewLab) {
            viewLab.setAttribute('role', 'tabpanel');
            viewLab.setAttribute('aria-labelledby', 'tab-lab');
        }
        if (viewGame) {
            viewGame.setAttribute('role', 'tabpanel');
            viewGame.setAttribute('aria-labelledby', 'tab-game');
        }
        const labVisible = !viewLab?.classList.contains('hidden');
        if (tabLab) {
            tabLab.setAttribute('aria-selected', labVisible ? 'true' : 'false');
            tabLab.setAttribute('aria-controls', 'view-lab');
        }
        if (tabGame) {
            tabGame.setAttribute('aria-selected', labVisible ? 'false' : 'true');
            tabGame.setAttribute('aria-controls', 'view-game');
        }
    }

    function syncModeA11y() {
        const lr = document.getElementById('mode-lr');
        const ud = document.getElementById('mode-ud');
        const group = lr?.parentElement;
        if (group) {
            group.setAttribute('role', 'group');
            group.setAttribute('aria-label', '漢字の組み合わせ方向');
        }
        const isUd = ud?.className.includes('mode-btn-active');
        if (lr) setPressed(lr, !isUd);
        if (ud) setPressed(ud, !!isUd);
    }

    function enhanceModalA11y() {
        MODAL_CONFIGS.forEach(({ modalId, panelId }) => {
            const modal = document.getElementById(modalId);
            const panel = document.getElementById(panelId);
            if (!modal || !panel) return;
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            const heading = panel.querySelector('h1, h2, h3');
            if (heading) {
                if (!heading.id) heading.id = `${modalId}-title`;
                modal.setAttribute('aria-labelledby', heading.id);
            }
        });

        const labels = new Map([
            ['help-btn', '遊び方を開く'],
            ['mute-btn', '音のオン・オフを切り替える'],
            ['close-help-btn', '遊び方を閉じる'],
            ['close-settings-btn', '設定を閉じる'],
            ['close-title-btn', '称号選択を閉じる'],
            ['close-dict-detail-btn', '漢字カードを閉じる'],
            ['close-collection-btn', '漢字図鑑を閉じる'],
            ['close-wrong-btn', 'にがてノートを閉じる']
        ]);
        labels.forEach((label, id) => document.getElementById(id)?.setAttribute('aria-label', label));

        makeKeyboardClickable(document.getElementById('header-title-badge'), '称号を変更する');

        const toast = document.getElementById('unlock-toast');
        if (toast) {
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
        }
    }

    function updateHelpAndParentCopy() {
        const help = document.getElementById('help-content');
        if (help) {
            const sections = Array.from(help.querySelectorAll('h3'));
            const make = sections.find(h => h.textContent.includes('つくるモード'));
            const quiz = sections.find(h => h.textContent.includes('クイズモード'));
            if (make?.nextElementSibling) {
                make.nextElementSibling.textContent = '左右・上下の2つのパーツを選ぶと、自動で合体するよ。普段は深い発見専用のパーツを少し畳んでいるけれど、「深いパーツ」からいつでも表示できるよ！';
            }
            if (quiz?.nextElementSibling) {
                quiz.nextElementSibling.textContent = `「がったい」と「ぶんかい」の2つのモードで遊べるよ。現在は${Data.KANJI_ALL.length}字の監査済みカタログから出題され、常用外の発見漢字にも出会えるよ！`;
            }
        }

        const parents = document.getElementById('parents-modal');
        if (parents) {
            const headings = Array.from(parents.querySelectorAll('h3'));
            const aim = headings.find(h => h.textContent.includes('このアプリのねらい'));
            const home = headings.find(h => h.textContent.includes('おうちでの活用方法'));
            const health = headings.find(h => h.textContent.includes('健康への配慮'));
            if (aim?.nextElementSibling) {
                aim.nextElementSibling.textContent = '「漢字ラボ」は、漢字を部品に分けて組み合わせながら、字形・読み・意味のつながりを発見する学習ツールです。常用漢字だけに限定せず、普段は出会いにくい漢字も「こんな字があるんだ」という発見として扱います。すべてを暗記することを目的にはしていません。';
            }
            if (home?.nextElementSibling) {
                home.nextElementSibling.textContent = '「どの組み合わせが面白かった？」「初めて知った字はあった？」と話してみてください。正解数だけでなく、知らない漢字に興味を持ったこと自体を学びとして楽しめる設計です。';
            }
            if (health?.nextElementSibling) {
                health.nextElementSibling.textContent = '画面を長く見続けないよう、疲れを感じる前に適度な休憩を取り、遠くを見るなどして目を休めてください。年齢や利用環境に合わせて、無理のない時間で楽しむことをおすすめします。';
            }
        }
    }

    function guardParentsDialog() {
        const dialog = document.getElementById('parents-modal');
        if (!dialog || dialog.dataset.kanjiUxGuarded === 'true') return;
        dialog.dataset.kanjiUxGuarded = 'true';

        document.addEventListener('click', (event) => {
            const openBtn = event.target.closest?.('[data-action="parents-modal-open"]');
            const closeBtn = event.target.closest?.('[data-action="parents-modal-close"]');
            const backdrop = event.target === dialog;
            if (!openBtn && !closeBtn && !backdrop) return;

            event.preventDefault();
            event.stopImmediatePropagation();

            if (openBtn) {
                if (!dialog.open) {
                    if (typeof dialog.showModal === 'function') dialog.showModal();
                    else dialog.setAttribute('open', '');
                }
                openBtn.setAttribute('aria-expanded', 'true');
                return;
            }

            if (dialog.open && typeof dialog.close === 'function') dialog.close();
            else dialog.removeAttribute('open');
            const trigger = document.querySelector('[data-action="parents-modal-open"]');
            if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
                if (closeBtn) trigger.focus();
            }
        }, true);

        dialog.addEventListener('close', () => {
            const trigger = document.querySelector('[data-action="parents-modal-open"]');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
    }

    function cleanupDuplicatedParentsMarkup() {
        const duplicateStyles = Array.from(document.querySelectorAll('style'))
            .filter(style => style.textContent.includes('#parents-modal::backdrop'));
        duplicateStyles.slice(1).forEach(style => style.remove());

        const duplicateScripts = Array.from(document.querySelectorAll('script:not([src])'))
            .filter(script => script.textContent.includes("querySelectorAll('[data-action=\"parents-modal-open\"]')"));
        duplicateScripts.slice(1).forEach(script => script.remove());
    }

    function selectedPart(side) {
        const value = document.getElementById(side === 'left' ? 'display-left' : 'display-right')?.textContent.trim();
        return value && value !== '?' ? value : null;
    }

    function syncPartnerToggleLabel() {
        const button = document.getElementById('kanji-partner-only');
        if (!button) return;
        setPressed(button, UX_STATE.partnerOnly);
        button.textContent = UX_STATE.partnerOnly ? '✨ 相棒だけ ON' : '👀 相棒だけ OFF';
        button.setAttribute('aria-label', `最初に選んだパーツと合体できる相棒だけに絞る: ${UX_STATE.partnerOnly ? 'オン' : 'オフ'}`);
    }

    function deepOnlyPartCount() {
        return poolIndex().deepOnlyCount;
    }

    function syncDeepToggleLabel() {
        const button = document.getElementById('kanji-deep-parts');
        if (!button) return;
        const count = deepOnlyPartCount();
        button.hidden = count === 0;
        setPressed(button, UX_STATE.showDeepParts);
        button.textContent = UX_STATE.showDeepParts ? '🔭 深いパーツ ON' : `🔭 深いパーツ OFF${count ? ` +${count}` : ''}`;
        button.setAttribute('aria-label', `深い発見専用のパーツを表示する: ${UX_STATE.showDeepParts ? 'オン' : 'オフ'}${count ? `、対象${count}個` : ''}`);
    }

    function syncResetButton() {
        const button = document.getElementById('kanji-reset-selection');
        if (!button) return;
        const hasSelection = !!selectedPart('left') || !!selectedPart('right');
        button.disabled = !hasSelection;
        button.setAttribute('aria-disabled', hasSelection ? 'false' : 'true');
    }

    function ensureLabActions(App) {
        const view = document.getElementById('view-lab');
        if (!view || view.querySelector('.kanji-ux-actions')) return;
        const modeWrap = document.getElementById('mode-lr')?.closest('.flex.justify-center');
        if (!modeWrap) return;

        const actions = document.createElement('div');
        actions.className = 'kanji-ux-actions';
        actions.innerHTML = `
            <button type="button" class="kanji-ux-partner-toggle" id="kanji-partner-only"></button>
            <button type="button" class="kanji-ux-deep-toggle" id="kanji-deep-parts"></button>
            <button type="button" class="kanji-ux-reset-btn" id="kanji-reset-selection" disabled>↺ 選びなおす</button>
            <button type="button" class="kanji-ux-discovery-btn" id="kanji-random-discovery">🎲 おまかせ発見</button>
        `;
        modeWrap.insertAdjacentElement('afterend', actions);
        syncPartnerToggleLabel();
        syncDeepToggleLabel();
        syncResetButton();

        document.getElementById('kanji-partner-only')?.addEventListener('click', () => {
            UX_STATE.partnerOnly = !UX_STATE.partnerOnly;
            syncPartnerToggleLabel();
            App.ui.updatePartButtonsAssist();
        });
        document.getElementById('kanji-deep-parts')?.addEventListener('click', () => {
            UX_STATE.showDeepParts = !UX_STATE.showDeepParts;
            syncDeepToggleLabel();
            applyPartFilters();
        });
        document.getElementById('kanji-reset-selection')?.addEventListener('click', () => resetSelection(App));
        document.getElementById('kanji-random-discovery')?.addEventListener('click', () => randomDiscovery(App));
    }

    function ensurePartToolbar(side) {
        const list = document.getElementById(side === 'left' ? 'list-p1' : 'list-p2');
        if (!list) return;
        const card = list.parentElement;
        if (!card || card.querySelector(`[data-part-toolbar="${side}"]`)) return;

        const toolbar = document.createElement('div');
        toolbar.className = 'kanji-ux-toolbar';
        toolbar.dataset.partToolbar = side;
        toolbar.innerHTML = `
            <input class="kanji-ux-search" type="search" inputmode="search" autocomplete="off" spellcheck="false"
                aria-label="${side === 'left' ? '左または上' : '右または下'}パーツを検索"
                placeholder="パーツ・漢字・読みで検索">
            <span class="kanji-ux-count" aria-live="polite">0件</span>
        `;
        list.insertAdjacentElement('beforebegin', toolbar);
        toolbar.querySelector('input')?.addEventListener('input', (event) => {
            UX_STATE.partQueries[side] = event.currentTarget.value;
            applyPartFilters();
        });
    }

    function clearPartQueries() {
        UX_STATE.partQueries.left = '';
        UX_STATE.partQueries.right = '';
        document.querySelectorAll('[data-part-toolbar] input').forEach(input => { input.value = ''; });
    }

    function buttonMatchesQuery(button, side, query) {
        const q = normalizeText(query);
        if (!q) return true;
        const part = button.textContent.trim();
        if (normalizeText(part).includes(q)) return true;
        return poolIndex()[side].get(part)?.entries.some(entry => entryHaystack(entry).includes(q)) || false;
    }

    function isDeepOnlyPart(side, part) {
        return poolIndex()[side].get(part)?.deepOnly || false;
    }

    function isCompatiblePart(side, part) {
        if (!UX_STATE.partnerOnly || !UX_STATE.anchorSide || side === UX_STATE.anchorSide) return true;
        const anchor = selectedPart(UX_STATE.anchorSide);
        if (!anchor) return true;
        return poolIndex()[UX_STATE.anchorSide].get(anchor)?.partners.has(part) || false;
    }

    function shouldShowDeepPart(side, part) {
        if (!isDeepOnlyPart(side, part)) return true;
        if (UX_STATE.showDeepParts) return true;
        if (selectedPart(side) === part) return true;
        return normalizeText(UX_STATE.partQueries[side]).length > 0;
    }

    function applyPartFilters() {
        ['left', 'right'].forEach(side => {
            const list = document.getElementById(side === 'left' ? 'list-p1' : 'list-p2');
            const toolbar = document.querySelector(`[data-part-toolbar="${side}"]`);
            if (!list) return;
            const buttons = Array.from(list.querySelectorAll('button'));
            let visible = 0;
            buttons.forEach(button => {
                let assistDisabled = button.classList.contains('pointer-events-none') || button.classList.contains('opacity-30');
                // 「相棒だけ」では最初に選んだ側をアンカーとして残す。
                // これにより両側が互いにロックされず、アンカーを別パーツへ変更できる。
                if (UX_STATE.partnerOnly && UX_STATE.anchorSide === side) {
                    button.classList.remove('opacity-30', 'pointer-events-none');
                    assistDisabled = false;
                }
                button.setAttribute('aria-disabled', assistDisabled ? 'true' : 'false');
                button.disabled = assistDisabled;

                const part = button.textContent.trim();
                const queryMatch = buttonMatchesQuery(button, side, UX_STATE.partQueries[side]);
                const partnerMatch = isCompatiblePart(side, part);
                const tierMatch = shouldShowDeepPart(side, part);
                const show = queryMatch && partnerMatch && tierMatch;
                button.classList.toggle('ux-filtered-out', !show);
                if (show) visible++;
            });
            const count = toolbar?.querySelector('.kanji-ux-count');
            if (count) count.textContent = `${visible}/${buttons.length}`;
        });
        syncDeepToggleLabel();
        syncResetButton();
    }

    function syncSelectedParts() {
        ['list-p1', 'list-p2'].forEach(id => {
            const list = document.getElementById(id);
            if (!list) return;
            Array.from(list.querySelectorAll('button')).forEach(button => {
                button.setAttribute('aria-pressed', button.classList.contains('selected') ? 'true' : 'false');
            });
        });
        syncResetButton();
    }

    function resetSelection(App) {
        UX_STATE.anchorSide = null;
        App.lab.setLabMode(currentMode());
        applyPartFilters();
        hideMobileResult();
    }

    function ensureMobileResult() {
        if (document.getElementById('kanji-mobile-result')) return;
        const bar = document.createElement('div');
        bar.id = 'kanji-mobile-result';
        bar.setAttribute('role', 'status');
        bar.setAttribute('aria-live', 'polite');
        bar.innerHTML = `
            <span class="ux-equation" aria-hidden="true"></span>
            <span class="ux-result-copy">
                <span class="ux-result-reading"></span>
                <span class="ux-result-meaning"></span>
            </span>
            <button type="button" class="ux-result-jump" aria-label="合体結果へ移動">↑</button>
        `;
        document.body.appendChild(bar);
        bar.querySelector('.ux-result-jump')?.addEventListener('click', () => {
            document.getElementById('stage-container')?.scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                block: 'center'
            });
        });
    }

    function hideMobileResult() {
        document.getElementById('kanji-mobile-result')?.classList.remove('is-visible');
        document.body.classList.remove('kanji-mobile-result-open');
    }

    function updateMobileResult() {
        const bar = document.getElementById('kanji-mobile-result');
        if (!bar || document.getElementById('view-lab')?.classList.contains('hidden')) {
            hideMobileResult();
            return;
        }
        const left = selectedPart('left');
        const right = selectedPart('right');
        const match = left && right ? currentPool().find(entry => entry.l === left && entry.r === right) : null;
        if (!match) {
            hideMobileResult();
            return;
        }
        bar.querySelector('.ux-equation').textContent = `${left} ＋ ${right} ＝ ${match.k}`;
        bar.querySelector('.ux-result-reading').textContent = [match.on && `音 ${match.on}`, match.kun && `訓 ${match.kun}`].filter(Boolean).join('　') || match.y;
        bar.querySelector('.ux-result-meaning').textContent = match.m;
        bar.classList.add('is-visible');
        document.body.classList.add('kanji-mobile-result-open');
    }

    function ensureCollectionTools() {
        const panel = document.getElementById('collection-panel');
        const grid = document.getElementById('collection-grid');
        if (!panel || !grid || panel.querySelector('.kanji-collection-tools')) return;
        const tools = document.createElement('div');
        tools.className = 'kanji-collection-tools';
        tools.innerHTML = `
            <div class="kanji-collection-summary">
                <strong id="kanji-collection-progress">見つけた 0 / ${Data.KANJI_ALL.length}</strong>
                <span>新しい発見から表示</span>
            </div>
            <input class="kanji-ux-search" id="kanji-collection-search" type="search" inputmode="search" autocomplete="off" spellcheck="false"
                aria-label="図鑑を漢字・読み・意味で検索" placeholder="漢字・読み・意味で検索">
            <div class="kanji-collection-filters" role="group" aria-label="図鑑の絞り込み">
                <button type="button" class="kanji-ux-filter-chip" data-collection-filter="all" aria-pressed="true">すべて</button>
                <button type="button" class="kanji-ux-filter-chip" data-collection-filter="lr" aria-pressed="false">左右</button>
                <button type="button" class="kanji-ux-filter-chip" data-collection-filter="ud" aria-pressed="false">上下</button>
                <button type="button" class="kanji-ux-filter-chip" data-collection-filter="deep" aria-pressed="false" ${Roles ? '' : 'hidden'}>🔭 深い発見</button>
                <button type="button" class="kanji-ux-filter-chip" data-collection-filter="shiny" aria-pressed="false">✨ キラ</button>
            </div>
            <p id="kanji-collection-empty-filter" class="hidden text-center text-xs font-bold text-slate-400 py-2">条件に合う発見済み漢字はまだないよ。</p>
        `;
        grid.insertAdjacentElement('beforebegin', tools);
        tools.querySelector('#kanji-collection-search')?.addEventListener('input', (event) => {
            UX_STATE.collectionQuery = event.currentTarget.value;
            applyCollectionFilter();
        });
        tools.querySelectorAll('[data-collection-filter]').forEach(button => {
            button.addEventListener('click', () => {
                UX_STATE.collectionFilter = button.dataset.collectionFilter;
                tools.querySelectorAll('[data-collection-filter]').forEach(item => setPressed(item, item === button));
                applyCollectionFilter();
            });
        });
    }

    function sortCollectionRecentFirst() {
        const grid = document.getElementById('collection-grid');
        if (!grid) return;
        const cards = Array.from(grid.children);
        for (let index = cards.length - 1; index >= 0; index--) {
            grid.appendChild(cards[index]);
        }
    }

    function applyCollectionFilter() {
        const grid = document.getElementById('collection-grid');
        if (!grid) return;
        const q = normalizeText(UX_STATE.collectionQuery);
        const cards = Array.from(grid.children).map(card => ({
            card,
            entry: Data.KANJI_ALL.find(item => item.k === card.textContent.trim())
        })).filter(item => item.entry);
        const progress = document.getElementById('kanji-collection-progress');
        if (progress) progress.textContent = `見つけた ${cards.length} / ${Data.KANJI_ALL.length}`;

        let visible = 0;
        cards.forEach(({ card, entry }) => {
            const kanji = entry.k;
            const isUd = Data.KANJI_UD.some(item => item.k === kanji);
            const isShiny = card.classList.contains('shining-card');
            const tier = getTier(kanji);
            const filterMatch = UX_STATE.collectionFilter === 'all'
                || (UX_STATE.collectionFilter === 'lr' && !isUd)
                || (UX_STATE.collectionFilter === 'ud' && isUd)
                || (UX_STATE.collectionFilter === 'deep' && tier === 'deep')
                || (UX_STATE.collectionFilter === 'shiny' && isShiny);
            const queryMatch = !q || entryHaystack(entry).includes(q);
            const show = filterMatch && queryMatch;
            card.classList.toggle('ux-collection-hidden', !show);
            card.dataset.kanji = kanji;
            card.dataset.structure = isUd ? 'ud' : 'lr';
            card.dataset.tier = tier;
            makeKeyboardClickable(card, `${kanji}の漢字カードを開く`);
            if (show) visible++;
        });
        const empty = document.getElementById('kanji-collection-empty-filter');
        if (empty) empty.classList.toggle('hidden', cards.length === 0 || visible > 0);
    }

    function enhanceTitleKeyboardNavigation() {
        document.querySelectorAll('#title-list-container > .cursor-pointer').forEach(item => {
            const name = item.querySelector('span')?.textContent.trim() || '称号';
            makeKeyboardClickable(item, `${name}を選択する`);
        });
    }

    function updateStructureBadge(kanji) {
        const badge = document.getElementById('dict-detail-stars');
        if (!badge) return;
        const isUd = Data.KANJI_UD.some(item => item.k === kanji);
        const structure = isUd ? '上下' : '左右';
        const tier = getTier(kanji);
        const suffix = tier === 'deep' ? ' · 深い発見' : tier === 'discovery' ? ' · 発見' : '';
        badge.textContent = `${structure}${suffix}`;
        badge.className = 'ux-structure-badge';
        badge.dataset.tier = tier;
        badge.setAttribute('aria-label', `構造: ${structure}${tier === 'deep' ? '、深い発見の漢字' : tier === 'discovery' ? '、発見漢字' : ''}`);
    }

    function randomDiscovery(App) {
        const discovered = new Set(getStoredCollection());
        const unseen = Data.KANJI_ALL.filter(entry => !discovered.has(entry.k));
        const pool = unseen.length ? unseen : Data.KANJI_ALL;
        const entry = pool[Math.floor(Math.random() * pool.length)];
        if (!entry) return;

        const isUd = Data.KANJI_UD.some(item => item.k === entry.k);
        UX_STATE.anchorSide = null;
        App.lab.setLabMode(isUd ? 'ud' : 'lr');
        const needsDeepPart = isDeepOnlyPart('left', entry.l) || isDeepOnlyPart('right', entry.r);
        if (needsDeepPart) UX_STATE.showDeepParts = true;
        clearPartQueries();
        syncDeepToggleLabel();
        applyPartFilters();

        const leftBtn = Array.from(document.querySelectorAll('#list-p1 button')).find(button => button.textContent.trim() === entry.l);
        const rightBtn = Array.from(document.querySelectorAll('#list-p2 button')).find(button => button.textContent.trim() === entry.r);
        if (!leftBtn || !rightBtn) return;
        leftBtn.click();
        rightBtn.click();
        document.getElementById('stage-container')?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'center'
        });
    }

    function patchApp(App) {
        if (App.__kanjiUxPatched) return;
        App.__kanjiUxPatched = true;

        const originalRenderLabUI = App.ui.renderLabUI.bind(App.ui);
        App.ui.renderLabUI = function (...args) {
            const result = originalRenderLabUI(...args);
            ensurePartToolbar('left');
            ensurePartToolbar('right');
            syncModeA11y();
            syncSelectedParts();
            applyPartFilters();
            updateMobileResult();
            return result;
        };

        const originalAssist = App.ui.updatePartButtonsAssist.bind(App.ui);
        App.ui.updatePartButtonsAssist = function (...args) {
            const result = originalAssist(...args);
            syncSelectedParts();
            applyPartFilters();
            return result;
        };

        const originalSelectPart = App.ui.selectPart.bind(App.ui);
        App.ui.selectPart = function (side, ...rest) {
            const beforeLeft = selectedPart('left');
            const beforeRight = selectedPart('right');
            if (!UX_STATE.anchorSide) {
                if (beforeLeft && !beforeRight) UX_STATE.anchorSide = 'left';
                else if (beforeRight && !beforeLeft) UX_STATE.anchorSide = 'right';
                else if (!beforeLeft && !beforeRight) UX_STATE.anchorSide = side;
            }
            // 元の処理が resetResult → updatePartButtonsAssist を必ず通る。
            const result = originalSelectPart(side, ...rest);
            updateMobileResult();
            return result;
        };

        const originalCombine = App.lab.combineKanji.bind(App.lab);
        App.lab.combineKanji = function (...args) {
            const result = originalCombine(...args);
            updateMobileResult();
            return result;
        };

        const originalSetMode = App.lab.setLabMode.bind(App.lab);
        App.lab.setLabMode = function (...args) {
            const before = currentMode();
            UX_STATE.anchorSide = null;
            const result = originalSetMode(...args);
            syncModeA11y();
            if (before !== args[0]) clearPartQueries();
            applyPartFilters();
            updateMobileResult();
            return result;
        };

        const originalSwitchTab = App.ui.switchTab.bind(App.ui);
        App.ui.switchTab = function (...args) {
            const result = originalSwitchTab(...args);
            syncTabA11y();
            if (args[0] !== 'lab') hideMobileResult();
            else updateMobileResult();
            return result;
        };

        const originalUpdateCol = App.ui.updateCol.bind(App.ui);
        App.ui.updateCol = function (...args) {
            const result = originalUpdateCol(...args);
            ensureCollectionTools();
            sortCollectionRecentFirst();
            applyCollectionFilter();
            return result;
        };

        const originalOpenDict = App.ui.openDictDetail.bind(App.ui);
        App.ui.openDictDetail = function (kanji, ...rest) {
            const result = originalOpenDict(kanji, ...rest);
            updateStructureBadge(kanji);
            return result;
        };

        const originalRenderTitleList = App.ui.renderTitleList.bind(App.ui);
        App.ui.renderTitleList = function (...args) {
            const result = originalRenderTitleList(...args);
            enhanceTitleKeyboardNavigation();
            return result;
        };

    }

    function init(App) {
        ensureStylesheet();
        enhanceModalA11y();
        updateHelpAndParentCopy();
        guardParentsDialog();
        cleanupDuplicatedParentsMarkup();
        ensureLabActions(App);
        ensurePartToolbar('left');
        ensurePartToolbar('right');
        ensureMobileResult();
        ensureCollectionTools();
        patchApp(App);
        syncTabA11y();
        syncModeA11y();
        syncSelectedParts();
        applyPartFilters();
        sortCollectionRecentFirst();
        applyCollectionFilter();
        enhanceTitleKeyboardNavigation();

        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) hideMobileResult();
            else updateMobileResult();
        });
    }

    window.KanjiLabUX = Object.freeze({
        getState: function () {
            return {
                partnerOnly: UX_STATE.partnerOnly,
                showDeepParts: UX_STATE.showDeepParts,
                anchorSide: UX_STATE.anchorSide,
                collectionFilter: UX_STATE.collectionFilter
            };
        }
    });

    ensureStylesheet();
    whenAppReady(init);
})();
