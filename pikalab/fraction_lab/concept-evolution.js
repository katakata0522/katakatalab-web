/**
 * Fraction Lab - Concept Evolution
 * 既存デザインを変えずに「分数は1つの数」という理解と誤概念チェックを追加する。
 */
(() => {
    'use strict';

    const FRACTION_EVOLUTION_CONFIG = Object.freeze({
        EQUAL_PARTITION_COPY: '🍕 1つのものを「部分と全体」で表すときは、同じ大きさに分ける「等分」が大切だよ。分数そのものは、数直線にも置ける「1つの数」なんだ。',
        QUESTIONS: Object.freeze([
            Object.freeze({
                question: '1/4 と 1/8。同じ大きさの「1」から分けたなら、大きいのはどっち？',
                options: Object.freeze(['1/4', '1/8', '同じ']),
                answerIndex: 0,
                explanation: '1を4等分した1つ分は、1を8等分した1つ分より大きいよ。「分母の数字が大きい＝大きな分数」ではないのがポイント！'
            }),
            Object.freeze({
                question: '2/4 と 1/2 を数直線に置くと、どうなる？',
                options: Object.freeze(['2/4の方が大きい', '1/2の方が大きい', '同じ場所になる']),
                answerIndex: 2,
                explanation: '2/4 と 1/2 は同じ大きさ。同じ数でも、分数の表し方は1つだけじゃないんだ。'
            }),
            Object.freeze({
                question: '3/4 は、数直線ではどこにいる数？',
                options: Object.freeze(['0と1の間', '1と2の間', '3と4の間']),
                answerIndex: 0,
                explanation: '3/4は「3と4」ではなく、0と1の間にある1つの数。1にかなり近い大きさだよ。'
            })
        ])
    });

    function updateEqualPartitionCopy() {
        const candidates = Array.from(document.querySelectorAll('#view-whatis .text-amber-400'));
        const warning = candidates.find((element) => element.textContent?.includes('大きさがバラバラ'));
        if (!warning) return;
        warning.textContent = FRACTION_EVOLUTION_CONFIG.EQUAL_PARTITION_COPY;
    }

    function createConceptCard() {
        if (document.getElementById('fraction-number-concept-card')) return null;

        const firstGrid = document.querySelector('#view-whatis .grid.grid-cols-1.md\\:grid-cols-3');
        if (!firstGrid || !firstGrid.parentElement) return null;

        const card = document.createElement('section');
        card.id = 'fraction-number-concept-card';
        card.className = 'glass-panel p-6 rounded-2xl border border-sky-500/30';
        card.setAttribute('aria-labelledby', 'fraction-number-concept-title');

        const header = document.createElement('div');
        header.className = 'flex items-start gap-3';

        const icon = document.createElement('span');
        icon.className = 'material-symbols-rounded text-sky-400 text-3xl';
        icon.textContent = 'pin';
        icon.setAttribute('aria-hidden', 'true');

        const textWrap = document.createElement('div');
        const title = document.createElement('h3');
        title.id = 'fraction-number-concept-title';
        title.className = 'light-panel-heading text-lg font-black text-white mb-2';
        title.textContent = '分数は「2つの数字」じゃなくて、1つの数！';

        const description = document.createElement('p');
        description.className = 'light-panel-copy text-sm text-slate-300 leading-relaxed font-bold';
        description.textContent = 'たとえば 3/4 は、「3」と「4」を別々に比べるものではなく、0と1の間にある大きさを持った1つの数だよ。ピザで見ても、長さで測っても、数直線に置いても、3/4の大きさは同じ。';

        textWrap.appendChild(title);
        textWrap.appendChild(description);
        header.appendChild(icon);
        header.appendChild(textWrap);
        card.appendChild(header);

        firstGrid.after(card);
        return card;
    }

    function createMisconceptionCheck() {
        if (document.getElementById('fraction-misconception-check')) return;

        const conceptCard = document.getElementById('fraction-number-concept-card') || createConceptCard();
        if (!conceptCard) return;

        const section = document.createElement('section');
        section.id = 'fraction-misconception-check';
        section.className = 'glass-panel p-6 rounded-2xl border border-indigo-500/30';
        section.setAttribute('aria-labelledby', 'fraction-check-title');

        const title = document.createElement('h3');
        title.id = 'fraction-check-title';
        title.className = 'light-panel-heading text-lg font-black text-white mb-1 flex items-center gap-2';
        title.textContent = '🧠 思いこみチェック！';

        const lead = document.createElement('p');
        lead.className = 'light-panel-copy text-xs sm:text-sm text-slate-400 font-bold mb-5';
        lead.textContent = '間違えても大丈夫。「なんで？」が見つかったら、それが今日の発見だよ。';

        const questionArea = document.createElement('div');
        questionArea.id = 'fraction-check-question-area';

        section.appendChild(title);
        section.appendChild(lead);
        section.appendChild(questionArea);
        conceptCard.after(section);

        let currentIndex = 0;
        let correctCount = 0;

        const renderQuestion = (shouldFocus = false) => {
            let answered = false;
            const item = FRACTION_EVOLUTION_CONFIG.QUESTIONS[currentIndex];
            questionArea.textContent = '';

            const progress = document.createElement('div');
            progress.className = 'light-panel-copy text-[10px] text-indigo-300 font-black tracking-wider mb-2';
            progress.textContent = `QUESTION ${currentIndex + 1} / ${FRACTION_EVOLUTION_CONFIG.QUESTIONS.length}`;

            const question = document.createElement('p');
            question.id = 'fraction-check-question';
            question.className = 'light-panel-heading text-sm sm:text-base text-white font-black leading-relaxed mb-4';
            question.textContent = item.question;

            const optionGrid = document.createElement('div');
            optionGrid.setAttribute('role', 'group');
            optionGrid.setAttribute('aria-labelledby', 'fraction-check-question');
            optionGrid.className = 'grid grid-cols-1 sm:grid-cols-3 gap-2';

            const feedback = document.createElement('div');
            feedback.className = 'hidden mt-4 p-4 rounded-xl border text-sm font-bold leading-relaxed';
            feedback.setAttribute('role', 'status');
            feedback.setAttribute('aria-live', 'polite');

            item.options.forEach((option, optionIndex) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 rounded-xl px-4 py-3 font-bold transition';
                button.textContent = option;
                button.addEventListener('click', () => {
                    if (answered) return;
                    answered = true;
                    const isCorrect = optionIndex === item.answerIndex;
                    if (isCorrect) correctCount += 1;

                    optionGrid.querySelectorAll('button').forEach((candidate) => {
                        candidate.disabled = true;
                        candidate.classList.add('opacity-70');
                    });

                    button.classList.remove('opacity-70', 'border-slate-600');
                    button.classList.add(isCorrect ? 'border-emerald-400' : 'border-amber-400');

                    feedback.className = `light-panel-copy mt-4 p-4 rounded-xl border text-sm font-bold leading-relaxed ${isCorrect ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-100' : 'bg-amber-950/30 border-amber-500/30 text-amber-100'}`;
                    feedback.textContent = `${isCorrect ? '✨ せいかい！' : '🔍 ここが発見ポイント！'} ${item.explanation}`;

                    const nextButton = document.createElement('button');
                    nextButton.type = 'button';
                    nextButton.className = 'mt-3 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-black transition';
                    nextButton.textContent = currentIndex < FRACTION_EVOLUTION_CONFIG.QUESTIONS.length - 1 ? '次のナゾへ →' : '結果を見る';
                    nextButton.addEventListener('click', () => {
                        if (currentIndex < FRACTION_EVOLUTION_CONFIG.QUESTIONS.length - 1) {
                            currentIndex += 1;
                            renderQuestion(true);
                        } else {
                            renderResult();
                        }
                    }, { once: true });
                    feedback.appendChild(nextButton);
                    nextButton.focus();
                }, { once: true });
                optionGrid.appendChild(button);
            });

            questionArea.appendChild(progress);
            questionArea.appendChild(question);
            questionArea.appendChild(optionGrid);
            questionArea.appendChild(feedback);
            if (shouldFocus) optionGrid.querySelector('button').focus();
        };

        const renderResult = () => {
            questionArea.textContent = '';

            const result = document.createElement('div');
            result.setAttribute('role', 'status');
            result.setAttribute('aria-live', 'polite');
            result.setAttribute('aria-atomic', 'true');
            result.className = 'text-center p-5 rounded-xl bg-sky-950/30 border border-sky-500/20';

            const score = document.createElement('div');
            score.className = 'light-panel-heading text-3xl font-black text-sky-300 mb-2';
            score.textContent = `${correctCount} / ${FRACTION_EVOLUTION_CONFIG.QUESTIONS.length}`;

            const message = document.createElement('p');
            message.className = 'light-panel-copy text-sm text-slate-200 font-bold leading-relaxed';
            message.textContent = correctCount === FRACTION_EVOLUTION_CONFIG.QUESTIONS.length
                ? '全部つながった！ 分数を「大きさを持つ1つの数」として見られているね。'
                : '間違えたところこそ今日の収穫！ 数直線や「見てわかる」タブで、もう一度大きさを確かめてみよう。';

            const retry = document.createElement('button');
            retry.type = 'button';
            retry.className = 'mt-4 bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-xl font-black transition';
            retry.textContent = 'もう一回ためす';
            retry.addEventListener('click', () => {
                currentIndex = 0;
                correctCount = 0;
                renderQuestion(true);
            });

            result.appendChild(score);
            result.appendChild(message);
            result.appendChild(retry);
            questionArea.appendChild(result);
            retry.focus();
        };

        renderQuestion();
    }

    function initializeConceptEvolution() {
        updateEqualPartitionCopy();
        createConceptCard();
        createMisconceptionCheck();
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { FRACTION_EVOLUTION_CONFIG };
        return;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeConceptEvolution, { once: true });
    } else {
        initializeConceptEvolution();
    }
})();

