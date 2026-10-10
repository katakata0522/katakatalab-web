/*
 * PikaLab Book Report Quest - Summer homework support layer
 * Keeps the adventure visual design while making the tool thinking-first.
 */
(function initBookReportSummerSupport() {
    'use strict';

    if (typeof document === 'undefined') return;

    const SUPPORT_FLAG = 'bookReportSummerSupportReady';
    const GRADE_PREFIX = 'bookReportSupportGrade_slot_';
    const OFFICIAL_RULES_URL = 'https://www.dokusyokansoubun.jp/youkou.html';

    const GRADE_META = Object.freeze({
        low: { label: '小学1・2年', limit: 800 },
        middle: { label: '小学3・4年', limit: 1200 },
        high: { label: '小学5・6年', limit: 1200 },
        junior: { label: '中学生', limit: 2000 },
        senior: { label: '高校生', limit: 2000 }
    });

    const GACHA_PROMPTS = Object.freeze({
        'book-synopsis': [
            'この本を「だれ・何について」「何が起きる」「一番大事なこと」の3つだけで説明すると？',
            '友だちに30秒で紹介するとしたら、どこまで話せば内容が伝わる？',
            'あらすじの中で、感想を書くために本当に必要な出来事はどれ？'
        ],
        'motivation-detail': [
            'この本を手に取った瞬間、最初に気になったのは何だった？',
            '読む前に「こんな本かな？」と想像していたことはある？',
            'ほかの本ではなく、この本を選んだ決め手を1つだけ挙げるなら？'
        ],
        'scene-desc': [
            '読み終わったあとも頭に残っている場面はどこ？ その場面で何が起きた？',
            'ページを戻ってもう一度読みたいと思った場面はある？ なぜ？',
            '一番「えっ」「すごい」「かなしい」と心が動いた瞬間はどこ？'
        ],
        'scene-myself': [
            'その場面で自分が主人公だったら、同じことをする？ それとも違う？',
            '主人公と自分で似ているところ・違うところを1つずつ探すなら？',
            '自分の経験で、この場面に少し似ている出来事はある？'
        ],
        'conclusion-change': [
            '読む前の自分と読み終わった今で、考えが少し変わったことは？',
            'この本から1つだけ持ち帰って、明日からやってみたいことは？',
            '未来の自分に「この本を読んだこと」を一言で伝えるなら何と言う？'
        ]
    });

    let currentGachaTarget = null;
    const volatileGradeBySlot = new Map();

    function activeSlot() {
        try {
            const raw = localStorage.getItem('bookReportQuestActiveSlot');
            return ['1', '2', '3'].includes(raw) ? raw : '1';
        } catch (error) {
            return '1';
        }
    }

    function gradeStorageKey(slot = activeSlot()) {
        return `${GRADE_PREFIX}${slot}`;
    }

    function selectedGrade() {
        const slot = activeSlot();
        try {
            const value = localStorage.getItem(gradeStorageKey(slot));
            if (Object.prototype.hasOwnProperty.call(GRADE_META, value)) return value;
        } catch (error) {}
        return volatileGradeBySlot.get(slot) || null;
    }

    function setSelectedGrade(value) {
        if (!Object.prototype.hasOwnProperty.call(GRADE_META, value)) return;
        const slot = activeSlot();
        volatileGradeBySlot.set(slot, value);
        try {
            localStorage.setItem(gradeStorageKey(slot), value);
        } catch (error) {}
        syncGradeUI();
    }

    function textValue(id) {
        return document.getElementById(id)?.value?.trim() || '';
    }

    function updateStaticCopy() {
        document.title = '読書感想文の構成メモ｜質問で考えを整理する無料ツール | PikaLab';

        const heroTitle = document.querySelector('header h1');
        if (heroTitle) {
            heroTitle.innerHTML = '読書感想文<br class="md:hidden"><span class="text-adventure-sky">「構成メモ」</span>';
        }
        const heroDescription = document.querySelector('header h1 + p');
        if (heroDescription) {
            heroDescription.innerHTML = '質問に答えながら、感じたことや理由を整理して、<br>自分で書くための「構成メモ」を作ろう！ 🎒✨';
        }

        const resultIntro = document.querySelector('#result-section .result-header p');
        if (resultIntro) resultIntro.textContent = 'これが君自身の言葉で書くための読書感想文「設計図」だ！';

        const resultBadge = document.querySelector('#result-section + .mt-8 .quest-badge, #result-section .quest-badge');
        if (resultBadge) resultBadge.textContent = '設計図を見ながら、学校のルールに合わせて自分の言葉で清書しよう！ 👍';

        const bigPrint = document.getElementById('big-print-pdf-btn');
        const bigPrintText = bigPrint?.querySelector('span:last-child');
        if (bigPrintText) bigPrintText.textContent = '構成メモを印刷・PDF保存';

        const copyAll = document.getElementById('copy-all-btn');
        if (copyAll) copyAll.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">content_copy</span> 構成メモをまとめてコピー';

        const shareButton = document.getElementById('share-btn');
        if (shareButton) shareButton.innerHTML = '<span class="material-symbols-rounded text-lg" aria-hidden="true">share</span> 構成メモを共有';

        const printGenko = document.getElementById('print-genko-btn');
        if (printGenko) printGenko.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">grid_goldenratio</span> 清書用の原稿用紙を開く 🪄';

        const printButton = document.getElementById('print-btn');
        if (printButton) printButton.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">print</span> 構成メモを印刷';

        const shareModalTitle = document.getElementById('share-modal-title');
        if (shareModalTitle) shareModalTitle.innerHTML = '<span class="material-symbols-rounded text-adventure-sky" aria-hidden="true">share</span> 構成メモを共有する';

        const draftSummary = document.querySelector('#draft-details summary span:first-child');
        if (draftSummary) draftSummary.innerHTML = '<span class="material-symbols-rounded text-adventure-sky" aria-hidden="true">edit_note</span> 📝 自分の言葉で書く練習メモ';

        const loadButton = document.getElementById('load-outline-to-draft-btn');
        if (loadButton) loadButton.innerHTML = '<span class="material-symbols-rounded text-sm" aria-hidden="true">auto_awesome</span> 構成メモを練習欄に入れる 🪄';

        const draftTextarea = document.getElementById('draft-textarea');
        if (draftTextarea) draftTextarea.placeholder = '設計図を見ながら、自分の言い方に直して書いてみよう。ここは練習用だよ。';

        const draftContainer = document.getElementById('draft-details')?.querySelector('.pt-4');
        const draftHint = draftContainer?.querySelector('p.text-xs');
        if (draftHint) draftHint.textContent = '💡 構成メモを材料にして、自分の言葉へ直す練習に使おう。そのまま提出する文章を自動で作る場所ではないよ。';

        const draftCounterLabels = document.querySelectorAll('#draft-details .text-xs.font-bold.text-adventure-wood');
        if (draftCounterLabels[0]) {
            draftCounterLabels[0].childNodes[0].textContent = '練習メモ文字数: ';
        }
        if (draftCounterLabels[1]) {
            draftCounterLabels[1].childNodes[0].textContent = '400字換算: ';
        }

        const meterTitle = document.querySelector('.meter-container h4');
        if (meterTitle) meterTitle.innerHTML = '<span class="material-symbols-rounded text-adventure-sun animate-bounce-slow" aria-hidden="true">description</span> 構成メモの量';

        const meterLabels = document.querySelectorAll('.meter-container .text-xs.text-gray-400.font-bold.block.mb-1');
        if (meterLabels[0]) meterLabels[0].textContent = '構成メモ文字数';
        if (meterLabels[1]) meterLabels[1].textContent = '400字換算のメモ量';

        const meterFootnote = document.querySelector('.meter-container > p.text-xs');
        if (meterFootnote) meterFootnote.textContent = '※これは提出字数ではなく、考えを整理したメモの量です。学校指定の字数・形式を優先してください。';

        const parentModal = document.getElementById('parents-modal');
        Array.from(parentModal?.querySelectorAll('p') || []).forEach((paragraph) => {
            if (paragraph.textContent.includes('AIが生成した草稿')) {
                paragraph.innerHTML = 'PikaLabは、質問とお子様が入力した内容から<strong>考えを整理する構成メモ</strong>を作ります。完成した感想文を自動で作るものではありません。「なぜそう思った？」「自分ならどうする？」と問いかけながら、お子様自身の言葉で清書するための材料としてお使いください。';
            }
            if (paragraph.textContent.includes('読書感想文の草稿を作成する')) {
                paragraph.innerHTML = '「読書感想文クエスト」は、本を読んだ後の感想・発見・気持ちを段階的な質問に答えながら整理し、<span class="bg-indigo-100 text-indigo-700 px-1 rounded">自分で書くための構成メモ</span>を作る支援ツールです。文章そのものを代わりに完成させるのではなく、「考えを言葉にする力」を支えることを目的としています。';
            }
            if (paragraph.textContent.includes('感想文が完成したら、ぜひ声に出して')) {
                paragraph.textContent = '下書きや清書の前に自分の文章を声に出して読むと、言い回しの重なりや文章のつながりに気づく手がかりになります。気になったところがあれば、お子様自身の言葉で直す時間としてご活用ください。';
            }
        });

        const details = parentModal?.querySelector('details');
        const summary = details?.querySelector('summary');
        if (summary && summary.textContent.includes('AI機能')) {
            summary.innerHTML = '<span class="material-symbols-rounded text-base text-slate-500">info</span> このツールのしくみとデータ <span class="material-symbols-rounded text-base text-slate-400 ml-auto">expand_more</span>';
        }
        const detailParagraphs = details ? Array.from(details.querySelectorAll('p')) : [];
        if (detailParagraphs[0]) {
            detailParagraphs[0].innerHTML = '本ツールは、お子様が入力した内容をもとに、<span class="font-bold text-slate-600">考えを整理するための構成メモや問いかけ</span>をブラウザ上で表示します。';
        }
        if (detailParagraphs[1]) {
            detailParagraphs[1].textContent = '外部AIに文章を送って完成した感想文を生成する機能はありません。構成メモを材料に、必ず本人が自分の言葉で清書してください。';
        }
        if (detailParagraphs[2]) {
            detailParagraphs[2].textContent = '通常の入力内容は端末内で扱われます。LINE・メール・共有リンクなどの共有機能を本人が選んだ場合は、その操作で選んだ内容が利用先へ渡ります。';
        }
    }

    function setupGradeSelector() {
        if (document.getElementById('book-grade-support')) return;
        const genreChips = document.getElementById('genre-chips');
        const genreWrapper = genreChips?.closest('.input-wrapper');
        if (!genreWrapper) return;

        const block = document.createElement('div');
        block.id = 'book-grade-support';
        block.className = 'input-wrapper bg-adventure-paper/50 p-5 rounded-2xl border-2 border-dashed border-adventure-sand/80';
        block.innerHTML = `
            <span class="label mb-2 flex items-center gap-1"><span class="material-symbols-rounded" aria-hidden="true">school</span> 学年（字数の参考に使うよ）</span>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="学年を選ぶ">
                ${Object.entries(GRADE_META).map(([value, meta]) => `
                    <label class="cursor-pointer">
                        <input type="radio" name="book-grade-support" value="${value}" class="sr-only peer">
                        <span class="block rounded-xl border-2 border-adventure-sand bg-white px-2 py-2.5 text-center text-xs font-bold text-adventure-ocean transition peer-checked:border-adventure-sky peer-checked:bg-blue-50">${meta.label}</span>
                    </label>
                `).join('')}
            </div>
            <div id="book-grade-rule-note" class="mt-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-3 text-xs font-bold leading-relaxed text-adventure-ocean"></div>
        `;
        genreWrapper.insertAdjacentElement('afterend', block);

        block.querySelectorAll('input[name="book-grade-support"]').forEach((input) => {
            input.addEventListener('change', () => setSelectedGrade(input.value));
        });
        syncGradeUI();
    }

    function syncGradeUI() {
        const grade = selectedGrade();
        const meta = grade ? GRADE_META[grade] : null;
        document.querySelectorAll('input[name="book-grade-support"]').forEach((input) => {
            input.checked = input.value === grade;
        });

        const note = document.getElementById('book-grade-rule-note');
        if (note) {
            if (meta) {
                note.innerHTML = `📏 第72回青少年読書感想文全国コンクールでは、${meta.label}は本文<strong>${meta.limit.toLocaleString()}字以内</strong>です。原則、原稿用紙に縦書き・自筆。<strong>提出先の学校の指示や地方審査の追加規定も確認</strong>してね。 <a href="${OFFICIAL_RULES_URL}" target="_blank" rel="noopener noreferrer" class="underline">公式要項</a>`;
            } else {
                note.innerHTML = `📏 学年を選ぶと、第72回青少年読書感想文全国コンクールの参考上限を表示します。低学年は本文800字以内、中・高学年は本文1,200字以内、中学・高校は本文2,000字以内です。<strong>提出先の学校の指示や地方審査の追加規定も確認</strong>してね。 <a href="${OFFICIAL_RULES_URL}" target="_blank" rel="noopener noreferrer" class="underline">公式要項</a>`;
            }
        }

        let resultNote = document.getElementById('book-result-grade-note');
        const meter = document.querySelector('.meter-container');
        if (meter && !resultNote) {
            resultNote = document.createElement('p');
            resultNote.id = 'book-result-grade-note';
            resultNote.className = 'text-xs text-adventure-ocean font-bold mt-3';
            meter.appendChild(resultNote);
        }
        if (resultNote) {
            resultNote.textContent = meta
                ? `${meta.label}の参考上限：本文${meta.limit.toLocaleString()}字以内。構成メモの文字数と提出字数は別ものだよ。`
                : '学年を選ぶと参考上限を確認できるよ。構成メモの文字数と提出字数は別ものです。';
        }
    }

    function transformResultIntoThinkingMap() {
        const resultSection = document.getElementById('result-section');
        if (!resultSection || resultSection.classList.contains('hidden')) return;

        const openingA = document.getElementById('opening-a');
        const openingB = document.getElementById('opening-b');
        const openingC = document.getElementById('opening-c');
        if (openingA) openingA.textContent = '本を選んだ理由から始める型：なぜこの本を選んだのか、自分だけのきっかけを1〜2文で書いてみよう。';
        if (openingB) openingB.textContent = '心が動いた場面から始める型：一番印象に残った瞬間を短く示して、「なぜ気になった？」へつなげよう。';
        if (openingC) openingC.textContent = '自分への問いから始める型：「自分ならどうする？」など、本から生まれた問いを自分の言葉で置いてみよう。';

        const synopsisParts = [textValue('synopsis-part-a'), textValue('synopsis-part-b'), textValue('synopsis-part-c')].filter(Boolean);
        const synopsis = document.getElementById('body-synopsis-ref');
        if (synopsis) synopsis.textContent = synopsisParts.length ? `本の内容メモ：${synopsisParts.join('／')}` : '本の内容は、感想に必要なところだけ短くメモしよう。';

        const scene = document.getElementById('body-scene-ref');
        const feeling = document.querySelector('.feeling-chip.selected')?.dataset?.val || '';
        if (scene) {
            const sceneText = textValue('scene-desc');
            scene.textContent = `心に残った場面：${sceneText || '（自分の言葉でメモしよう）'}${feeling ? `\nそのときの気持ち：${feeling}` : ''}\n→ 「なぜそう感じた？」を次の文章で考えてみよう。`;
        }

        const myself = document.getElementById('body-myself-ref');
        if (myself) myself.textContent = `自分と比べるメモ：${textValue('scene-myself') || '主人公と自分の同じところ・違うところを考えてみよう。'}\n→ 自分の経験や考えとつなげると、感想が自分だけのものになるよ。`;

        const conclusion = document.getElementById('conclusion-text');
        if (conclusion) conclusion.textContent = `読んだ後の変化：${textValue('conclusion-change') || '読む前と後で変わった考えをメモしよう。'}\n→ 最後の文章は、このメモを見ながら自分の言い方で書こう。`;

        const openingHeadings = document.querySelectorAll('.copy-card h4');
        if (openingHeadings[0]) openingHeadings[0].textContent = '① 選んだ理由から';
        if (openingHeadings[1]) openingHeadings[1].textContent = '② 心が動いた場面から';
        if (openingHeadings[2]) openingHeadings[2].textContent = '③ 自分への問いから';

        const conclusionHeading = document.querySelector('.timeline-item.orange h3');
        if (conclusionHeading) conclusionHeading.innerHTML = '<span class="paragraph-badge bg-orange-500">むすび</span><span class="material-symbols-rounded" aria-hidden="true">flag</span> 【むすび】読んだ後の自分';
        const conclusionLead = document.querySelector('.timeline-item.orange .bg-orange-50 > p.font-bold');
        if (conclusionLead) conclusionLead.textContent = '完成文ではなく、「最後に何を伝えたいか」のメモだよ。';

        updateBalanceNote();
        syncGradeUI();
    }

    function updateBalanceNote() {
        const meter = document.querySelector('.meter-container');
        if (!meter) return;

        let note = document.getElementById('reflection-balance-note');
        if (!note) {
            note = document.createElement('div');
            note.id = 'reflection-balance-note';
            note.className = 'mt-4 rounded-xl border px-4 py-3 text-xs font-bold leading-relaxed';
            meter.appendChild(note);
        }

        const synopsisLength = [textValue('synopsis-part-a'), textValue('synopsis-part-b'), textValue('synopsis-part-c')].join('').length;
        const reflectionLength = [textValue('motivation-detail'), textValue('scene-desc'), textValue('scene-myself'), textValue('conclusion-change')].join('').length;

        if (synopsisLength > 80 && reflectionLength < synopsisLength) {
            note.className = 'mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-relaxed text-amber-800';
            note.textContent = '📖 あらすじが少し多めかも。「なぜ心に残った？」「自分ならどうする？」など、自分の考えのメモをもう少し増やしてみよう。';
        } else if (reflectionLength >= 80) {
            note.className = 'mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-bold leading-relaxed text-green-800';
            note.textContent = '💭 自分の考えの材料が集まってきたね。あとは設計図を見ながら、自分の言い方へ直していこう。';
        } else {
            note.className = 'mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold leading-relaxed text-adventure-ocean';
            note.textContent = '💡 感想文の中心は「あらすじ」より「自分がどう感じたか」。心が動いた理由を1つずつ集めていこう。';
        }
    }

    function scheduleThinkingMap() {
        window.setTimeout(transformResultIntoThinkingMap, 0);
    }

    function setupResultTransformation() {
        document.querySelector('.btn-generate')?.addEventListener('click', scheduleThinkingMap);
        document.querySelectorAll('.copy-card').forEach((card) => card.addEventListener('click', () => window.setTimeout(transformResultIntoThinkingMap, 0)));

        const resultSection = document.getElementById('result-section');
        if (resultSection) {
            const observer = new MutationObserver(() => {
                if (!resultSection.classList.contains('hidden')) scheduleThinkingMap();
            });
            observer.observe(resultSection, { attributes: true, attributeFilter: ['class'] });
        }
    }

    function pickPrompt(target) {
        const pool = GACHA_PROMPTS[target] || [];
        return pool.length ? pool[Math.floor(Math.random() * pool.length)] : '自分の言葉で「なぜ？」を1つ考えてみよう。';
    }

    function replaceGachaResultWithQuestion(target) {
        window.setTimeout(() => {
            const display = document.getElementById('gacha-result-display');
            const question = document.getElementById('gacha-question');
            const text = document.getElementById('gacha-text');
            const apply = document.getElementById('gacha-apply-btn');
            if (!display || !question || !text || display.classList.contains('hidden')) return;

            question.textContent = '自分に聞いてみよう！';
            text.textContent = pickPrompt(target);
            if (apply) {
                apply.disabled = false;
                apply.textContent = 'この質問を考える！ ✍️';
            }
        }, 1250);
    }

    function closeGachaAndFocusTarget() {
        const modal = document.getElementById('gacha-modal');
        const content = document.getElementById('gacha-modal-content');
        content?.classList.remove('active');
        window.setTimeout(() => modal?.classList.add('hidden'), 250);

        const targetMap = {
            'book-synopsis': 'synopsis-part-a',
            'motivation-detail': 'motivation-detail',
            'scene-desc': 'scene-desc',
            'scene-myself': 'scene-myself',
            'conclusion-change': 'conclusion-change'
        };
        const target = document.getElementById(targetMap[currentGachaTarget] || currentGachaTarget);
        window.setTimeout(() => target?.focus(), 280);
    }

    function setupThinkingGacha() {
        document.querySelectorAll('.gacha-trigger-btn').forEach((button) => {
            button.addEventListener('click', () => {
                currentGachaTarget = button.dataset.target || null;
                replaceGachaResultWithQuestion(currentGachaTarget);
            });
        });

        document.getElementById('gacha-reroll-btn')?.addEventListener('click', () => replaceGachaResultWithQuestion(currentGachaTarget));

        const applyButton = document.getElementById('gacha-apply-btn');
        applyButton?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            closeGachaAndFocusTarget();
        }, true);
    }

    function buildShareMemo() {
        const title = textValue('book-title') || '無題の本';
        const author = textValue('book-author') || '作者未入力';
        const scene = textValue('scene-desc');
        const myself = textValue('scene-myself');
        const change = textValue('conclusion-change');
        return `【読書感想文の構成メモ】\n本：「${title}」／${author}\n\n心に残った場面：\n${scene || '（未入力）'}\n\n自分だったら：\n${myself || '（未入力）'}\n\n読んだ後の変化：\n${change || '（未入力）'}\n\n※完成した感想文ではありません。学校の指示に従い、本人が自分の言葉で清書するためのメモです。`;
    }

    function setupSafeFamilyShare() {
        const lineButtons = ['line-share-btn', 'big-line-share-btn'];
        lineButtons.forEach((id) => {
            document.getElementById(id)?.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                const text = buildShareMemo();
                window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank', 'noopener');
            }, true);
        });

        document.getElementById('email-share-btn')?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const title = textValue('book-title') || '読書感想文';
            const subject = encodeURIComponent(`【構成メモ】「${title}」`);
            const body = encodeURIComponent(buildShareMemo());
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        }, true);
    }

    function setupSlotSync() {
        document.querySelectorAll('.slot-tab').forEach((tab) => {
            tab.addEventListener('click', () => window.setTimeout(syncGradeUI, 220));
        });
    }

    function addSubmissionNotice() {
        if (document.getElementById('book-submission-notice')) return;
        const actions = document.getElementById('big-print-pdf-btn')?.closest('.mt-6');
        if (!actions) return;
        const note = document.createElement('div');
        note.id = 'book-submission-notice';
        note.className = 'mt-4 rounded-2xl border-2 border-adventure-sand bg-adventure-paper/70 px-5 py-4 text-xs font-bold leading-relaxed text-adventure-ocean print:hidden';
        note.innerHTML = `📝 印刷・PDF保存は<strong>構成メモの保管用</strong>です。第72回青少年読書感想文全国コンクールは原則「原稿用紙・縦書き・自筆」。学校・地方審査で追加の指定がある場合もあるので、提出前に必ず確認してね。 <a href="${OFFICIAL_RULES_URL}" target="_blank" rel="noopener noreferrer" class="underline">公式要項</a>`;
        actions.insertAdjacentElement('afterend', note);
    }

    function init() {
        if (document.documentElement.dataset[SUPPORT_FLAG] === 'true') return;
        document.documentElement.dataset[SUPPORT_FLAG] = 'true';
        updateStaticCopy();
        setupGradeSelector();
        setupResultTransformation();
        setupThinkingGacha();
        setupSafeFamilyShare();
        setupSlotSync();
        addSubmissionNotice();
        transformResultIntoThinkingMap();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();