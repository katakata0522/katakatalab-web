/* PikaLab Experiment Detective Lab — zero API calls, ads or analytics. */
(() => {
  'use strict';
  const lib = globalThis.ExperimentDetectiveData;
  if (!lib || lib.validateCases(lib.CASES).length) {
    const panel = document.getElementById('activeTask');
    if (panel) panel.textContent = '事件ファイルの読み込みに失敗しました。ページを再読み込みしてください。';
    return;
  }

  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'pikalab_experiment_detective_v2';
  const state = {
    activeId: lib.CASES[0].id,
    entries: new Map(lib.CASES.map(item => [item.id, newEntry()])),
    solved: readSolved()
  };
  const OPTION_LETTERS = ['A', 'B', 'C'];
  const CHAPTERS = Object.freeze([
    { id: 'intro', label: 'はじめの事件', range: '01–03' },
    { id: 'compare', label: '光と動き', range: '04–06' },
    { id: 'advanced', label: 'もう一歩', range: '07–09' }
  ]);
  function readSolved() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (!Array.isArray(saved.completed)) return new Set();
      return new Set(saved.completed.filter(id => !!lib.getCase(id)));
    } catch (_) { return new Set(); }
  }
  function saveSolved() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, completed: [...state.solved] })); }
    catch (_) { /* No tracking, and storage is optional. */ }
  }
  let activeChapter = 'intro';

  function newEntry() {
    return { index: 0, selected: null, accepted: false, lastFeedback: null, incorrectId: null, hintLevel: 0, finished: false };
  }
  function activeCase() { return lib.getCase(state.activeId); }
  function entry() { return state.entries.get(state.activeId); }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function goToCase(id, shouldScroll = true) {
    if (!lib.getCase(id)) return;
    state.activeId = id;
    activeChapter = lib.getCase(id).chapter;
    render();
    if (shouldScroll) focusWorkbench();
  }
  function focusWorkbench() {
    $('investigation').scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    $('investigation').focus({ preventScroll: true });
  }
  function renderChapters() {
    const container = $('caseChapters'); container.replaceChildren();
    CHAPTERS.forEach(chapter => {
      const items = lib.CASES.filter(item => item.chapter === chapter.id);
      const solved = items.filter(item => state.solved.has(item.id)).length;
      const btn = el('button', `chapter-button${activeChapter === chapter.id ? ' is-active' : ''}`);
      btn.type = 'button'; btn.dataset.chapter = chapter.id;
      btn.setAttribute('aria-pressed', activeChapter === chapter.id ? 'true' : 'false');
      btn.setAttribute('aria-label', `${chapter.label}、全${items.length}事件中${solved}事件解決`);
      btn.append(el('span', 'chapter-name', chapter.label), el('span', 'chapter-progress', `${solved}/${items.length}`));
      container.appendChild(btn);
    });
  }
  function renderNav() {
    renderChapters();
    const list = $('caseNavigation'); list.replaceChildren();
    const cases = lib.CASES.filter(item => item.chapter === activeChapter);
    cases.forEach(item => {
      const current = item.id === state.activeId;
      const complete = state.solved.has(item.id);
      const btn = el('button', `case-ticket${current ? ' is-current' : ''}${complete ? ' is-complete' : ''}`);
      btn.type = 'button'; btn.dataset.caseId = item.id;
      btn.setAttribute('aria-pressed', current ? 'true' : 'false');
      const title = el('span', 'ticket-title');
      const emoji = el('span', 'ticket-emoji', item.emoji); emoji.setAttribute('aria-hidden', 'true');
      const copy = el('span', 'ticket-copy', item.title);
      copy.append(el('small', '', item.subtitle));
      title.append(emoji, copy);
      btn.append(el('span', 'ticket-number', `事件 ${item.order}`), title,
        el('span', 'ticket-status', complete ? '✓ 解決済み' : current ? '調査中' : '未調査'));
      list.appendChild(btn);
    });
    $('completedCount').textContent = `${state.solved.size} / ${lib.CASES.length}`;
    $('fileCount').textContent = String(lib.CASES.length).padStart(2, '0');
  }
  function renderCaseHeader() {
    const item = activeCase(); const progress = entry();
    $('caseOrdinal').textContent = ` / 事件 ${item.order}`;
    $('currentCaseTitle').textContent = item.title;
    $('caseDescription').textContent = item.description;

    $('stageCounter').textContent = progress.finished ? '調査完了' : `手がかり ${progress.index + 1} / ${item.steps.length}`;
  }
  function renderObservations() {
    const item = activeCase(); const progress = entry();
    const repaired = progress.index === 2 || (progress.index === 1 && progress.accepted) || progress.finished;
    const locatedMistake = progress.index > 0 || progress.accepted || progress.finished;
    const board = $('observationList'); board.replaceChildren();
    const head = el('div', 'comparison-head');
    head.append(el('span', '', '条件'), el('span', '', '実験 A'), el('span', '', '実験 B'));
    board.append(head);
    item.observations.forEach(obs => {
      const found = obs.kind === 'mistake' && locatedMistake && !repaired;
      const corrected = obs.kind === 'mistake' && repaired;
      const row = el('div', `compare-row${found ? ' is-found' : ''}${corrected ? ' is-corrected' : ''}`);
      row.append(el('span', 'compare-name', obs.name), el('strong', 'compare-a', obs.a),
        el('strong', 'compare-b', repaired && obs.repairedB ? obs.repairedB : obs.b));
      if (corrected) row.lastElementChild.setAttribute('aria-label', `修正後 ${obs.repairedB}`);
      board.appendChild(row);
    });
    $('sceneArt').dataset.type = item.scene;
    $('sceneArt').innerHTML = sceneSvg(item.scene, repaired);
  }
  function renderChoices() {
    const item = activeCase(), progress = entry(), step = item.steps[progress.index];
    $('stepEyebrow').textContent = step.eyebrow.replace(/^\d+\s*\/\s*/, '');
    $('questionTitle').textContent = step.title;
    $('questionDetail').textContent = step.description;
    $('stepNumber').textContent = String(progress.index + 1).padStart(2, '0');
    Array.from($('stepDots').children).forEach((dot, index) => {
      dot.classList.toggle('active', index === progress.index);
      dot.classList.toggle('passed', index < progress.index);
    });
    const group = $('choiceGroup'); group.replaceChildren();
    for (const [index, opt] of step.options.entries()) {
      const label = el('label', 'choice-option');
      const chosen = progress.selected === opt.id;
      label.classList.toggle('is-correct', chosen && progress.accepted);
      label.classList.toggle('is-incorrect', progress.incorrectId === opt.id);
      const radio = el('input');
      radio.type = 'radio'; radio.name = 'detective-choice'; radio.value = opt.id;
      radio.checked = chosen; radio.disabled = progress.accepted;
      radio.setAttribute('aria-label', `${OPTION_LETTERS[index]}: ${opt.label}`);
      const letter = el('span', 'choice-letter', OPTION_LETTERS[index]); letter.setAttribute('aria-hidden', 'true');
      const name = el('span', 'choice-label', opt.label);
      const indicator = el('span', 'choice-indicator'); indicator.setAttribute('aria-hidden', 'true');
      label.append(radio, letter, name, indicator);
      group.appendChild(label);
    }
    const feedback = $('feedback');
    if (progress.lastFeedback) {
      feedback.hidden = false;
      feedback.dataset.kind = progress.accepted ? 'correct' : 'incorrect';
      feedback.textContent = (progress.accepted ? '✦ いいぞ！ ' : '✳ おしい！ ') + progress.lastFeedback;
    } else {
      feedback.hidden = true; feedback.textContent = '';
    }
    const hint = $('hintBox');
    if (progress.hintLevel > 0) {
      hint.hidden = false;
      $('hintCopy').textContent = step.hints[progress.hintLevel - 1];
    } else { hint.hidden = true; $('hintCopy').textContent = ''; }
    $('hintButton').hidden = progress.accepted;
    $('hintButton').textContent = progress.hintLevel ? (progress.hintLevel === 1 ? 'もう少しヒント' : 'ヒントを確認') : 'ヒントを見る';
    const submit = $('submitButton');
    submit.disabled = !progress.accepted && !progress.selected;
    submit.innerHTML = progress.accepted
      ? (progress.index === item.steps.length - 1 ? '事件を解決する <span aria-hidden="true">✦</span>' : 'つぎの手がかりへ <span aria-hidden="true">→</span>')
      : 'これで調査する <span aria-hidden="true">→</span>';
  }
  function renderCompletion() {
    const item = activeCase();
    $('completeTitle').textContent = item.title + '、解決！';
    $('completeText').textContent = item.ending;
    $('completeLearning').textContent = item.learning;
    const allDone = state.solved.size === lib.CASES.length;
    $('nextCaseButton').innerHTML = allDone ? '事件一覧に戻る <span aria-hidden="true">→</span>' : 'つぎの事件へ <span aria-hidden="true">→</span>';
  }
  function render() {
    const progress = entry();
    renderNav(); renderCaseHeader(); renderObservations();
    $('taskHead').hidden = progress.finished;
    $('activeTask').hidden = progress.finished;
    $('completionPanel').hidden = !progress.finished;
    $('taskPanel').classList.toggle('is-finished', progress.finished);
    if (progress.finished) { renderCompletion(); return; }
    renderChoices();
  }

  function handleSubmit() {
    const item = activeCase(); const progress = entry();
    if (progress.finished) return;
    if (progress.accepted) {
      if (progress.index === item.steps.length - 1) {
        progress.finished = true;
        state.solved.add(item.id);
        saveSolved();
        render();
        $('completionPanel').focus({ preventScroll: true });
      } else {
        progress.index++;
        progress.selected = null;
        progress.accepted = false;
        progress.lastFeedback = null;
        progress.incorrectId = null;
        progress.hintLevel = 0;
        render();
        $('questionTitle').setAttribute('tabindex', '-1');
        $('questionTitle').focus({ preventScroll: true });
      }
      return;
    }
    if (!progress.selected) return;
    const result = lib.judgeAnswer(item, progress.index, progress.selected);
    if (!result.valid) return;
    progress.accepted = result.correct;
    progress.lastFeedback = result.feedback;
    progress.incorrectId = result.correct ? null : progress.selected;
    render();
    $('submitButton').focus({ preventScroll: true });
  }
  function handleSelect(event) {
    if (!event.target.matches('input[name="detective-choice"]')) return;
    const progress = entry();
    if (progress.accepted || progress.finished) return;
    progress.selected = event.target.value;
    progress.lastFeedback = null; progress.incorrectId = null;
    // Keep the actual radio element mounted while children explore choices.
    // Rebuilding here breaks keyboard focus and screen-reader navigation.
    for (const label of $('choiceGroup').querySelectorAll('.choice-option')) {
      label.classList.remove('is-incorrect', 'is-correct');
    }
    $('feedback').hidden = true;
    $('feedback').textContent = '';
    $('submitButton').disabled = false;
  }
  function handleHint() {
    const progress = entry();
    if (progress.finished || progress.accepted) return;
    progress.hintLevel = Math.min(2, progress.hintLevel + 1);
    render();
    $('hintButton').focus({ preventScroll: true });
  }
  function replay() {
    state.entries.set(state.activeId, newEntry());
    render(); focusWorkbench();
  }
  function nextCase() {
    const currentIndex = lib.CASES.findIndex(item => item.id === state.activeId);
    const unsolved = lib.CASES.slice(currentIndex + 1).concat(lib.CASES.slice(0, currentIndex + 1)).find(item => !state.solved.has(item.id));
    if (unsolved) goToCase(unsolved.id);
    else { $('filesTitle').scrollIntoView({ behavior: 'auto', block: 'start' }); $('filesTitle').focus({ preventScroll: true }); }
  }
  function showHelp() {
    const d = $('helpDialog');
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  }
  function closeHelp() {
    const d = $('helpDialog');
    if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
  }
  $('caseChapters').addEventListener('click', event => {
    const button = event.target.closest('[data-chapter]');
    if (!button) return;
    const chapter = button.dataset.chapter;
    if (!CHAPTERS.some(c => c.id === chapter)) return;
    activeChapter = chapter;
    const available = lib.CASES.filter(item => item.chapter === chapter);
    const preferred = available.find(item => !state.solved.has(item.id)) || available[0];
    state.activeId = preferred.id;
    render();
    const current = $('caseChapters').querySelector('[aria-pressed="true"]');
    current?.focus({ preventScroll: true });
  });
  $('caseNavigation').addEventListener('click', event => {
    const btn = event.target.closest('[data-case-id]');
    if (btn) goToCase(btn.dataset.caseId);
  });
  $('choiceGroup').addEventListener('change', handleSelect);
  $('submitButton').addEventListener('click', handleSubmit);
  $('hintButton').addEventListener('click', handleHint);
  $('resetCaseButton').addEventListener('click', replay);
  $('replayButton').addEventListener('click', replay);
  $('nextCaseButton').addEventListener('click', nextCase);
  $('startButton').addEventListener('click', focusWorkbench);
  $('helpOpen').addEventListener('click', showHelp);
  $('helpClose').addEventListener('click', closeHelp);
  $('helpStart').addEventListener('click', () => { closeHelp(); focusWorkbench(); });
  $('helpDialog').addEventListener('click', event => { if (event.target === $('helpDialog')) closeHelp(); });
  $('clearProgress').addEventListener('click', () => {
    if (!window.confirm('この端末の解決済み記録を消して、すべて最初から調査しますか？')) return;
    state.solved.clear();
    state.entries = new Map(lib.CASES.map(item => [item.id, newEntry()]));
    saveSolved(); closeHelp(); goToCase(lib.CASES[0].id);
  });
  render();

  function sceneSvg(type, repaired) {
    const baseStart = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" preserveAspectRatio="xMidYMid meet" role="img" aria-label="実験AとBの模式図。結果ではなく実験の条件を表しています。"><defs><linearGradient id="tableGr" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d0b89a"/><stop offset="1" stop-color="#bda788"/></linearGradient><linearGradient id="glassGr" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".75"/><stop offset="1" stop-color="#ffffff" stop-opacity=".2"/></linearGradient></defs><rect x="36" y="62" width="244" height="184" rx="20" fill="#ffffff" opacity=".18"/><rect x="360" y="62" width="244" height="184" rx="20" fill="#ffffff" opacity=".18"/><path d="M0 266h640v54H0z" fill="#ddcebc" opacity=".56"/><path d="M10 271h620" stroke="#c3b59e" stroke-width="3" stroke-linecap="round"/><path d="M320 32v214" stroke="#c8c0bd" stroke-dasharray="6 9" stroke-width="2" opacity=".88"/><rect x="52" y="28" width="58" height="30" rx="12" fill="#fffdf8" stroke="#e1d8c7" stroke-width="2"/><text x="81" y="48" text-anchor="middle" font-size="18" font-family="sans-serif" font-weight="900" fill="#6555a4">A</text><rect x="376" y="28" width="58" height="30" rx="12" fill="#fffdf8" stroke="#e1d8c7" stroke-width="2"/><text x="405" y="48" text-anchor="middle" font-size="18" font-family="sans-serif" font-weight="900" fill="#6555a4">B</text><circle cx="320" cy="18" r="4" fill="#ffbc65"/>`;
    const end = '</svg>';
    const frameGuides = '<g fill="none" stroke="#a8ae92" stroke-width="2" stroke-dasharray="4 5" opacity=".85"><path d="M152 112v130"/><path d="M476 112v130"/></g>';
    if (type === 'plant') {
      const pot = (x, leafColor) => `<g transform="translate(${x},0)"><ellipse cx="0" cy="258" rx="72" ry="9" fill="#8f806f" opacity=".13"/><path d="M-34 198H34L25 252H-25z" fill="#dc977d" stroke="#ba7765" stroke-width="4" stroke-linejoin="round"/><path d="M-38 197h76" stroke="#b87163" stroke-width="10" stroke-linecap="round"/><path d="M0 198V134" stroke="#5b946f" stroke-width="8" stroke-linecap="round"/><path d="M2 170c-31 5-45-12-44-28 26-3 43 8 44 28Z" fill="${leafColor}" stroke="#528b76" stroke-width="3"/><path d="M1 156c1-28 17-41 41-41-1 25-18 40-41 41Z" fill="#77b89a" stroke="#528b76" stroke-width="3"/><path d="M0 141c-18-9-20-28-8-40 18 10 19 27 8 40Z" fill="#a2c69d" stroke="#528b76" stroke-width="3"/><path d="M-30 202h60" stroke="#efbea2" stroke-width="3" stroke-linecap="round"/></g>`;
      const sun = (x) => `<g transform="translate(${x},86)" stroke="#ebb259" stroke-width="4" stroke-linecap="round"><circle cx="0" cy="0" r="18" fill="#ffdc83" stroke="#f4c05f" stroke-width="3"/>${[0,45,90,135,180,225,270,315].map(i=>`<path transform="rotate(${i})" d="M0 -26v-9"/>`).join('')}</g>`;
      const drops = (x, count) => Array.from({ length: count }, (_, i) => `<path d="M${x + i * 15} 196q6-12 6-15c0 3 6 11 6 15 0 8-12 8-12 0Z" fill="#70b3c3" opacity=".95"/>`).join('');
      return baseStart + frameGuides + `${sun(220)}${sun(544)}${pot(162, '#9acb9a')}${pot(486, '#9acb9a')}<g>${drops(116, 2)}${drops(440, repaired ? 2 : 1)}</g>` + end;
    }
    if (type === 'sugar') {
      const beaker = (x, hot) => `<g transform="translate(${x},4)"><ellipse cx="0" cy="261" rx="72" ry="9" fill="#809b9a" opacity=".15"/><path d="M-43 114V228Q-43 240-29 240H29q14 0 14-12V114" fill="url(#glassGr)" stroke="#6b9ba5" stroke-width="6" stroke-linecap="round"/><path d="M-41 156Q-18 148 0 156T41 156V226Q41 238 27 238H-27q-14 0-14-12Z" fill="${hot ? '#a9d4d6' : '#b3d9e6'}" opacity=".86"/><path d="M-41 158Q-19 150 0 158t41-2" stroke="#77afc7" stroke-width="3" fill="none"/><path d="M-56 116h112" stroke="#6b9ba5" stroke-width="6" stroke-linecap="round"/><path d="M-43 194h16m-16 15h16m-16 15h16" stroke="#779dab" stroke-width="3"/><rect x="-26" y="169" width="16" height="14" rx="3" fill="#fffbf2" stroke="#c6c1b5" stroke-width="2"/><rect x="-2" y="180" width="16" height="14" rx="3" fill="#fffef7" stroke="#c6c1b5" stroke-width="2"/><path d="M-6 74l28 42" stroke="#e0ae68" stroke-width="8" stroke-linecap="round"/><path d="M-6 72v26" stroke="#c08a4d" stroke-width="5" stroke-linecap="round"/></g>`;
      return baseStart + `<circle cx="176" cy="92" r="26" fill="#e9f9f6" stroke="#7bb3ae" stroke-width="3"/><path d="M176 79v16l10 6" fill="none" stroke="#5c908c" stroke-width="5" stroke-linecap="round"/><circle cx="500" cy="92" r="26" fill="#fff1d2" stroke="#e9bf6a" stroke-width="3"/><path d="M500 76v18l-11 6" fill="none" stroke="#c8a25b" stroke-width="5" stroke-linecap="round"/>${beaker(160, false)}${beaker(484, true)}<path d="M250 165h140" stroke="#d1c9c3" stroke-dasharray="5 6" stroke-width="4"/>` + end;
    }
    if (type === 'pendulum') {
      const swing = (x, length, r) => `<g transform="translate(${x},0)"><path d="M-78 76H78" stroke="#837a90" stroke-width="9" stroke-linecap="round"/><path d="M-60 76V258M60 76V258" stroke="#b6a9b7" stroke-width="7" stroke-linecap="round"/><path d="M-80 262H80" stroke="#ad9cae" stroke-width="8" stroke-linecap="round"/><circle cy="78" cx="0" r="9" fill="#f1c579" stroke="#9f8275" stroke-width="3"/><path d="M0 82L${length === 125 ? '-34' : '-20'} ${82 + length}" stroke="#777386" stroke-width="3.8" stroke-linecap="round"/><circle cx="${length === 125 ? '-34' : '-20'}" cy="${82 + length}" r="${r}" fill="#f5a577" stroke="#c27963" stroke-width="3"/><path d="M${length === 125 ? '-34' : '-20'} ${84 + length - r}q8-6 15 1" fill="none" stroke="#ffe2b9" stroke-width="3.5" stroke-linecap="round"/><path d="M-79 262H79" stroke="#897e90" stroke-width="2.5"/></g>`;
      return baseStart + `${swing(170, 125, 17)}${swing(494, 163, repaired ? 17 : 24)}<path d="M193 103q34 42 24 76" fill="none" stroke="#c3b0c9" stroke-width="2" stroke-dasharray="5 6"/><path d="M508 107q42 38 28 90" fill="none" stroke="#c3b0c9" stroke-width="2" stroke-dasharray="5 6"/>` + end;
    }
    if (type === 'ramp') {
      const ramp = (x, steep, heavy) => `<g transform="translate(${x},0)"><path d="M-102 248L-16 ${steep ? 156 : 198}H102V262H-102Z" fill="#dac5af" stroke="#a89989" stroke-width="3"/><path d="M-102 248L-16 ${steep ? 156 : 198}" stroke="#8f8299" stroke-width="9" stroke-linecap="round"/><g transform="translate(${-38},${steep ? 194 : 224}) rotate(${steep ? -42 : -26})"><rect x="-28" y="-17" width="56" height="25" rx="9" fill="#81b7a7" stroke="#3e897d" stroke-width="3"/><path d="M-17-17l7-14h25l10 14" fill="#b1d9cf" stroke="#3e897d" stroke-width="3"/><circle cx="-18" cy="11" r="9" fill="#5c5877"/><circle cx="18" cy="11" r="9" fill="#5c5877"/></g>${heavy ? '<circle cx="64" cy="214" r="14" fill="#e0ac7f" stroke="#c38b68" stroke-width="3"/>' : ''}</g>`;
      return baseStart + ramp(168, false, false) + ramp(492, true, !repaired) + end;
    }
    if (type === 'shadow') {
      const shadow = (x, big, far) => `<g transform="translate(${x},0)"><rect x="74" y="102" width="8" height="136" rx="3" fill="#92afa7"/><rect x="67" y="231" width="38" height="8" rx="4" fill="#659889"/><path d="M78 111L30 149L12 131Q34 92 77 100Z" fill="#f8cf7d" stroke="#ce9e59" stroke-width="3"/><path d="M29 148L${far ? 98 : 122} 198L136 147" fill="#fff0b9" opacity=".5"/><circle cx="${far ? 114 : 129}" cy="191" r="${big ? 23 : 15}" fill="#db967e" stroke="#b97868" stroke-width="3"/><rect x="177" y="108" width="10" height="130" fill="#9a8baf"/><rect x="187" y="114" width="48" height="123" rx="5" fill="#fffef8" stroke="#b5a4bf" stroke-width="3"/><ellipse cx="206" cy="193" rx="${big ? 25 : 18}" ry="${big ? 30 : 23}" fill="#8a7499" opacity=".22"/></g>`;
      return baseStart + shadow(38, false, false) + shadow(362, !repaired, true) + end;
    }
    if (type === 'magnet') {
      const magnet = (x, far, many) => `<g transform="translate(${x},0)"><path d="M-68 108v56q0 74 68 74 68 0 68-74v-56h-34v55q0 40-34 40-34 0-34-40v-55Z" fill="#dc8d83" stroke="#b46e66" stroke-width="4"/><path d="M-68 109h34v27h-34zm102 0h34v27H34z" fill="#b8e0d2" stroke="#598f80" stroke-width="3"/><path d="M-15 252h68" stroke="#9d9eac" stroke-width="3"/><g stroke="#758394" stroke-width="3" fill="none">${Array.from({length: many ? 10 : 5}, (_, i) => `<path d="M${-44 + (i % 5) * 24} ${(far ? 57 : 88) + Math.floor(i / 5) * 26}q-6-6-13 0l-8 8q-5 8 3 10 7 3 11-4l7-7"/>`).join('')}</g></g>`;
      return baseStart + magnet(164, false, false) + magnet(488, true, !repaired) + end;
    }
    if (type === 'sprout') {
      const bowl = (x, water, other) => `<g transform="translate(${x},0)"><ellipse cx="0" cy="260" rx="88" ry="9" fill="#a58a73" opacity=".14"/><path d="M-80 206H80l-15 39H-65z" fill="#e3b587" stroke="#bd896a" stroke-width="4"/><rect x="-73" y="189" width="146" height="20" rx="10" fill="#f2c9a8" stroke="#bc927d" stroke-width="3"/>${Array.from({ length: 5 }, (_, i) => `<ellipse cx="${-51 + i * 25}" cy="192" rx="7" ry="4.5" fill="${other ? '#a9856f' : '#997853'}" stroke="#8b7259" stroke-width="1.8"/>`).join('')}${water ? '<path d="M-70 199H70" stroke="#81c3ca" stroke-width="5" stroke-linecap="round" opacity=".7"/>' : ''}</g>`;
      return baseStart + bowl(164, true, false) + bowl(488, false, !repaired) + end;
    }
    if (type === 'evaporate') {
      const vessel = (x, wide, more) => `<g transform="translate(${x},0)"><ellipse cx="0" cy="260" rx="${wide ? 94 : 62}" ry="8" fill="#8a928d" opacity=".13"/><path d="M${wide ? -92 : -58} 126v100q0 18 18 18h${wide ? 148 : 80}q18 0 18-18V126" fill="url(#glassGr)" stroke="#78a5ac" stroke-width="5"/><path d="M${wide ? -90 : -56} ${more ? 176 : 206}v44q0 18 16 18h${wide ? 148 : 80}q16 0 16-18v-44z" fill="#a6d8df" opacity=".82"/><path d="M${wide ? -92 : -58} 127H${wide ? 92 : 58}" stroke="#78a5ac" stroke-width="6" stroke-linecap="round"/><path d="M-34 96q-10-15 0-28m30 26q-10-15 0-28m32 30q-10-15 0-28" stroke="#a5bfc2" stroke-width="3" stroke-dasharray="4 6" fill="none"/></g>`;
      return baseStart + vessel(164, false, true) + vessel(488, true, repaired) + end;
    }
    if (type === 'rubber') {
      const guitar = (x, long, strong) => `<g transform="translate(${x},0)"><rect x="-92" y="126" width="184" height="103" rx="18" fill="#e9cfae" stroke="#bd9b82" stroke-width="4"/><rect x="-72" y="142" width="144" height="69" rx="9" fill="#f9e8c6"/><path d="M${long ? -64 : -38} 176H${long ? 66 : 38}" stroke="#b67a98" stroke-width="${strong ? 9 : 6}" stroke-linecap="round"/><path d="M${long ? -64 : -38} 158v37M${long ? 66 : 38} 158v37" stroke="#917e9b" stroke-width="5"/><path d="M-34 123q12-31 28-17 17 16 29-8" fill="none" stroke="#dca76e" stroke-width="4" stroke-dasharray="5 7"/><circle cx="0" cy="102" r="5" fill="#f5c56b"/></g>`;
      return baseStart + guitar(166, false, false) + guitar(490, true, !repaired) + end;
    }
    return baseStart + end;
  }
})();
