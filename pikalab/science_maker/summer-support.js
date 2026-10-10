/*
 * PikaLab Science Maker - Summer homework support layer
 * Keeps the existing visual design while strengthening the research process.
 */
(function initScienceSummerSupport() {
    'use strict';

    if (typeof document === 'undefined') return;

    const SUPPORT_FLAG = 'scienceSummerSupportReady';
    const REFLECTION_STORAGE_KEY = 'scienceMakerReflection_v2';
    const PREFERENCE_STORAGE_KEY = 'scienceMakerPreference_v1';

    const FILTERS = Object.freeze({
        none: {
            label: '条件なし',
            description: ''
        },
        noHeat: {
            label: '火・強い加熱を避けたい',
            description: '火や強い加熱を使う可能性があるテーマを外しました。'
        },
        noOutdoor: {
            label: '外出なしで進めたい',
            description: '公園や街歩きなど、外へ出ることが前提のテーマを外しました。'
        },
        noAdultRequired: {
            label: '付き添い必須を避けたい',
            description: '保護者・大人の付き添いが明記されているテーマを外しました。'
        }
    });

    const TYPE_META = Object.freeze({
        experiment: { label: '実験', className: 'text-purple-600 bg-purple-100' },
        craft: { label: '工作', className: 'text-orange-600 bg-orange-100' },
        observe: { label: '観察', className: 'text-green-600 bg-green-100' },
        investigate: { label: '調べ学習', className: 'text-blue-600 bg-blue-100' }
    });

    const TIME_LABEL = Object.freeze({
        '1day': '1日',
        '3days': '3日',
        '1week': '1週間'
    });

    function getTopicsSafe() {
        try {
            if (typeof topics !== 'undefined' && Array.isArray(topics)) return topics;
        } catch (error) {
            console.warn('Science Maker topics are not available yet:', error);
        }
        return Array.isArray(globalThis.topics) ? globalThis.topics : [];
    }

    function getCorePlan() {
        try {
            const raw = localStorage.getItem('scienceMakerData_v1');
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.warn('Science Maker plan could not be read:', error);
            return null;
        }
    }

    function getCurrentTopicId() {
        return getCorePlan()?.topicId || 'draft';
    }

    function readReflectionMap() {
        try {
            const raw = localStorage.getItem(REFLECTION_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch (error) {
            console.warn('Science reflection data could not be read:', error);
            return {};
        }
    }

    function writeReflectionForCurrentTopic(data) {
        try {
            const map = readReflectionMap();
            map[getCurrentTopicId()] = data;
            localStorage.setItem(REFLECTION_STORAGE_KEY, JSON.stringify(map));
        } catch (error) {
            console.warn('Science reflection data could not be saved:', error);
        }
    }

    function readReflectionForCurrentTopic() {
        const map = readReflectionMap();
        return map[getCurrentTopicId()] || {
            result: '',
            outcome: '',
            discussion: '',
            nextQuestion: ''
        };
    }

    function topicText(topic) {
        return [
            topic?.title,
            topic?.desc,
            topic?.materials,
            ...(Array.isArray(topic?.safety) ? topic.safety : [])
        ].filter(Boolean).join(' ');
    }

    function requiresHeat(topic) {
        return /(火|加熱|コンロ|熱湯|電子レンジ|オーブン|アイロン|ろうそく|線香|太陽炉|鍋で|湯せん)/.test(topicText(topic));
    }

    function requiresOutdoor(topic) {
        return /(公園|街を歩|近所の|外の気温|虫の集まる場所|屋外|散歩|歩いて|大地図を作ろう)/.test(topicText(topic));
    }

    function requiresAdult(topic) {
        if (topic?.adultRequired === true) return true;
        const safetyText = Array.isArray(topic?.safety) ? topic.safety.join(' ') : '';
        return /(保護者|大人と一緒|付き添)/.test(safetyText);
    }

    function topicMatchesPreference(topic, preference) {
        switch (preference) {
            case 'noHeat':
                return !requiresHeat(topic);
            case 'noOutdoor':
                return !requiresOutdoor(topic);
            case 'noAdultRequired':
                return !requiresAdult(topic);
            default:
                return true;
        }
    }

    function updateStaticCopy() {
        const header = document.querySelector('#main-content')?.previousElementSibling;
        const heroDescription = header?.querySelector('p.text-lg');
        if (heroDescription) {
            heroDescription.innerHTML = '使える時間や興味、安全条件に合う研究テーマ候補を見つけて、<br class="hidden sm:inline">予想・方法・結果・考察を<span class="text-science-700 bg-science-100 px-1 rounded">自分の研究メモ</span>に整理しよう！';
        }

        const printButton = document.getElementById('print-btn');
        if (printButton) {
            printButton.setAttribute('aria-label', '研究メモを印刷');
            printButton.innerHTML = '<span class="material-symbols-outlined mr-1 text-lg" aria-hidden="true">print</span> 研究メモを印刷';
        }

        const template = document.getElementById('result-card-template');
        const actionLabel = template?.content?.querySelector('.text-science-600.font-bold.text-sm');
        if (actionLabel) {
            actionLabel.innerHTML = '研究メモを作る <span class="material-symbols-outlined text-lg ml-1" aria-hidden="true">arrow_forward</span>';
        }

        const helper = document.getElementById('results-container')?.nextElementSibling;
        if (helper && helper.textContent.includes('計画書')) {
            helper.textContent = '👆 気になるテーマを選ぶと、予想や方法を書ける「研究メモ」が開くよ！';
        }

        const planPaper = document.getElementById('plan-paper');
        if (planPaper) {
            const planTitle = planPaper.querySelector('h2');
            const planSubtitle = planTitle?.nextElementSibling;
            if (planSubtitle) {
                planSubtitle.textContent = '研究を進めるための下書き・記録用メモです。';
            }

            if (!document.getElementById('science-school-rule-note')) {
                const headerBlock = planTitle?.closest('.border-b-4');
                const note = document.createElement('div');
                note.id = 'science-school-rule-note';
                note.className = 'mb-7 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-relaxed text-amber-800 print:border-gray-300 print:bg-white print:text-gray-700';
                note.innerHTML = '📝 これは研究を整理するためのメモです。<strong>提出するときは、学校から指定された用紙・形式・書き方を優先</strong>してください。';
                headerBlock?.insertAdjacentElement('afterend', note);
            }
        }
    }

    function setupPreferencePanel() {
        if (document.getElementById('science-preference-panel')) return;

        const diagnoseButton = document.getElementById('diagnose-btn');
        const submitWrap = diagnoseButton?.closest('.text-center');
        if (!diagnoseButton || !submitWrap) return;

        let savedPreference = 'none';
        try {
            const saved = localStorage.getItem(PREFERENCE_STORAGE_KEY);
            if (saved && Object.prototype.hasOwnProperty.call(FILTERS, saved)) savedPreference = saved;
        } catch (error) {}

        const panel = document.createElement('div');
        panel.id = 'science-preference-panel';
        panel.className = 'bg-amber-50 rounded-2xl p-6 border-2 border-amber-100';
        panel.innerHTML = `
            <div class="flex items-center mb-3">
                <span class="bg-amber-400 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3 shadow-sm">＋</span>
                <div>
                    <h3 class="font-bold text-lg text-amber-900">もう少しだけ絞る？ <span class="text-xs font-medium text-amber-600">（任意）</span></h3>
                    <p class="text-xs text-amber-700 mt-1">夏休みの状況に合わせて、候補だけを絞り込めるよ。</p>
                </div>
            </div>
            <fieldset class="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-label="研究テーマの追加条件">
                ${Object.entries(FILTERS).map(([value, meta]) => `
                    <label class="cursor-pointer">
                        <input type="radio" name="science-preference" value="${value}" class="sr-only peer" ${value === savedPreference ? 'checked' : ''}>
                        <span class="block min-h-[44px] rounded-xl border-2 border-amber-100 bg-white/80 px-3 py-3 text-center text-sm font-bold text-gray-600 transition peer-checked:border-amber-400 peer-checked:bg-amber-100 peer-checked:text-amber-900">${meta.label}</span>
                    </label>
                `).join('')}
            </fieldset>
        `;
        submitWrap.insertAdjacentElement('beforebegin', panel);

        panel.querySelectorAll('input[name="science-preference"]').forEach((input) => {
            input.addEventListener('change', () => {
                try {
                    localStorage.setItem(PREFERENCE_STORAGE_KEY, input.value);
                } catch (error) {}
            });
        });

        diagnoseButton.addEventListener('click', () => {
            window.setTimeout(applyPreferenceToResults, 0);
        });
    }

    function getSelectedPreference() {
        return document.querySelector('input[name="science-preference"]:checked')?.value || 'none';
    }

    function renderTopicCard(topic, container, template) {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.result-card');
        if (!card) return;

        const meta = TYPE_META[topic.category] || { label: '', className: '' };
        const typeElement = card.querySelector('.card-type');
        if (typeElement) {
            typeElement.textContent = meta.label;
            typeElement.className = `card-type text-xs font-bold px-2 py-1 rounded ${meta.className}`;
        }

        const timeElement = card.querySelector('.card-time');
        if (timeElement) timeElement.textContent = TIME_LABEL[topic.time] || '';

        const titleElement = card.querySelector('.card-title');
        if (titleElement) titleElement.textContent = topic.title || '';

        const descElement = card.querySelector('.card-desc');
        if (descElement) descElement.textContent = topic.desc || '';

        const difficulty = Math.max(1, Math.min(3, Number(topic.difficulty) || 1));
        const stars = card.querySelector('.card-difficulty');
        if (stars) {
            stars.textContent = '★'.repeat(difficulty) + '☆'.repeat(3 - difficulty);
            stars.setAttribute('aria-label', `難易度 ${difficulty}`);
        }

        const openTopic = () => {
            try {
                if (typeof selectTopic === 'function') selectTopic(topic.id);
            } catch (error) {
                console.error('Science Maker topic could not be opened:', error);
            }
            window.setTimeout(loadReflectionIntoPanel, 0);
        };

        card.setAttribute('aria-label', `${topic.title} - 研究メモを開く`);
        card.addEventListener('click', openTopic);
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openTopic();
            }
        });
        container.appendChild(clone);
    }

    function applyPreferenceToResults() {
        const preference = getSelectedPreference();
        if (preference === 'none') {
            document.getElementById('science-preference-status')?.remove();
            return;
        }

        const selectedTime = document.querySelector('input[name="time"]:checked')?.value;
        const selectedType = document.querySelector('input[name="type"]:checked')?.value;
        const container = document.getElementById('results-container');
        const template = document.getElementById('result-card-template');
        if (!selectedTime || !selectedType || !container || !(template instanceof HTMLTemplateElement)) return;

        const allForTime = getTopicsSafe().filter((topic) => topic.time === selectedTime);
        const matching = allForTime
            .filter((topic) => topicMatchesPreference(topic, preference))
            .map((topic, order) => ({ ...topic, _score: topic.category === selectedType ? 10 : 0, _order: order }))
            .sort((a, b) => (b._score - a._score) || (a._order - b._order))
            .slice(0, 3);

        let status = document.getElementById('science-preference-status');
        if (!status) {
            status = document.createElement('div');
            status.id = 'science-preference-status';
            status.className = 'mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-relaxed text-amber-800';
            container.insertAdjacentElement('beforebegin', status);
        }

        if (matching.length === 0) {
            status.textContent = `この追加条件では候補が見つからなかったので、元のおすすめを表示しています。条件を「条件なし」に戻すか、別の期間・種類も試してみてね。`;
            return;
        }

        status.textContent = `${FILTERS[preference].label}：${FILTERS[preference].description} ${matching.length < 3 ? `条件に合う候補は${matching.length}件でした。` : ''}`;
        container.innerHTML = '';
        matching.forEach((topic) => renderTopicCard(topic, container, template));
    }

    function createReflectionPanel() {
        const marker = Array.from(document.querySelectorAll('#plan-paper p')).find((element) => element.textContent.includes('ここから下は研究が終わってから'));
        const section = marker?.parentElement;
        if (!section || document.getElementById('plan-result')) return;

        section.innerHTML = `
            <p class="text-center text-xs font-bold text-gray-400 mb-6 bg-gray-100 inline-block px-4 py-1 rounded-full mx-auto block w-max">
                ↓ ここから下は研究が終わってから書こう ↓
            </p>

            <div class="mb-8">
                <label for="plan-result" class="block text-sm font-black text-gray-700 mb-2">⑥ 結果（実際にどうなった？）</label>
                <p class="text-xs text-gray-500 font-bold mb-2">見たこと・測った数字・回数などを、そのまま記録しよう。予想と違っても大丈夫！</p>
                <textarea id="plan-result" rows="6" maxlength="1200" class="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-science-500 focus:bg-white outline-none resize-y bg-gray-50 text-gray-700 leading-relaxed transition-colors" placeholder="例：3回測ると、Aは○分、Bは○分、Cは○分だった。"></textarea>
            </div>

            <div class="mb-8">
                <span class="block text-sm font-black text-gray-700 mb-3">⑦ 予想と比べてどうだった？</span>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="予想と結果の比較">
                    <label class="cursor-pointer"><input type="radio" name="science-outcome" value="matched" class="sr-only peer"><span class="block rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-3 text-center text-sm font-bold text-gray-600 peer-checked:border-science-400 peer-checked:bg-science-50 peer-checked:text-science-800">予想と同じ</span></label>
                    <label class="cursor-pointer"><input type="radio" name="science-outcome" value="different" class="sr-only peer"><span class="block rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-3 text-center text-sm font-bold text-gray-600 peer-checked:border-science-400 peer-checked:bg-science-50 peer-checked:text-science-800">予想と違った</span></label>
                    <label class="cursor-pointer"><input type="radio" name="science-outcome" value="unclear" class="sr-only peer"><span class="block rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-3 text-center text-sm font-bold text-gray-600 peer-checked:border-science-400 peer-checked:bg-science-50 peer-checked:text-science-800">まだ分からない</span></label>
                </div>
            </div>

            <div class="mb-8">
                <label for="plan-discussion" class="block text-sm font-black text-gray-700 mb-2">⑧ 考察（どうしてこの結果になったと思う？）</label>
                <p id="science-discussion-prompt" class="text-xs text-science-700 font-bold mb-2 bg-science-50 border border-science-100 rounded-lg px-3 py-2">結果を見て、「なぜ？」を1つ考えてみよう。</p>
                <textarea id="plan-discussion" rows="6" maxlength="1200" class="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-science-500 focus:bg-white outline-none resize-y bg-gray-50 text-gray-700 leading-relaxed transition-colors" placeholder="正解を書く場所ではなく、自分の考えを書く場所だよ。"></textarea>
            </div>

            <div>
                <label for="plan-next-question" class="block text-sm font-black text-gray-700 mb-2">⑨ 次に気になったこと</label>
                <p class="text-xs text-gray-500 font-bold mb-2">「次は○○でも試したい」「もっと○○を調べたい」が1つ見つかれば、研究は大成功。</p>
                <textarea id="plan-next-question" rows="4" maxlength="600" class="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-science-500 focus:bg-white outline-none resize-y bg-gray-50 text-gray-700 leading-relaxed transition-colors" placeholder="例：温度を変えたら結果も変わるのか試してみたい。"></textarea>
            </div>
        `;

        section.querySelectorAll('textarea, input[name="science-outcome"]').forEach((element) => {
            element.addEventListener('input', saveReflectionFromPanel);
            element.addEventListener('change', () => {
                updateDiscussionPrompt();
                saveReflectionFromPanel();
            });
        });
        loadReflectionIntoPanel();
    }

    function updateDiscussionPrompt() {
        const outcome = document.querySelector('input[name="science-outcome"]:checked')?.value || '';
        const prompt = document.getElementById('science-discussion-prompt');
        if (!prompt) return;

        const messages = {
            matched: '予想と同じだったのは、どの条件が関係していそう？ 別の条件でも同じになるかな？',
            different: 'どこが予想と違った？ 測り方・材料・温度・回数など、結果に影響したものはありそう？',
            unclear: 'もう一度確かめるなら、回数を増やす？ 測り方を変える？ 比べる条件を減らす？'
        };
        prompt.textContent = messages[outcome] || '結果を見て、「なぜ？」を1つ考えてみよう。';
    }

    function saveReflectionFromPanel() {
        const result = document.getElementById('plan-result')?.value || '';
        const discussion = document.getElementById('plan-discussion')?.value || '';
        const nextQuestion = document.getElementById('plan-next-question')?.value || '';
        const outcome = document.querySelector('input[name="science-outcome"]:checked')?.value || '';
        writeReflectionForCurrentTopic({ result, outcome, discussion, nextQuestion });
    }

    function loadReflectionIntoPanel() {
        if (!document.getElementById('plan-result')) return;
        const data = readReflectionForCurrentTopic();

        const result = document.getElementById('plan-result');
        const discussion = document.getElementById('plan-discussion');
        const nextQuestion = document.getElementById('plan-next-question');
        if (result) result.value = data.result || '';
        if (discussion) discussion.value = data.discussion || '';
        if (nextQuestion) nextQuestion.value = data.nextQuestion || '';

        document.querySelectorAll('input[name="science-outcome"]').forEach((input) => {
            input.checked = input.value === data.outcome;
        });
        updateDiscussionPrompt();
    }

    function setupTopicChangeSync() {
        document.getElementById('results-container')?.addEventListener('click', () => {
            window.setTimeout(loadReflectionIntoPanel, 0);
        });
        document.getElementById('share-import-confirm-btn')?.addEventListener('click', () => {
            window.setTimeout(loadReflectionIntoPanel, 0);
        });
    }

    function init() {
        if (document.documentElement.dataset[SUPPORT_FLAG] === 'true') return;
        document.documentElement.dataset[SUPPORT_FLAG] = 'true';
        updateStaticCopy();
        setupPreferencePanel();
        createReflectionPanel();
        setupTopicChangeSync();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();