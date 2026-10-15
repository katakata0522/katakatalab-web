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
  const STORAGE_KEY = 'pikalab_experiment_detective_v2';
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
    render();
    const selected = Array.from(document.querySelectorAll('input[name="detective-choice"]')).find(e => e.checked);
    selected?.focus({ preventScroll: true });
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
    const baseStart = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 300" preserveAspectRatio="xMidYMid meet" role="img" aria-label="実験AとBの模式図。結果ではなく実験の条件を表しています。"><defs><linearGradient id="tableGr" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d0b89a"/><stop offset="1" stop-color="#bda788"/></linearGradient><linearGradient id="glassGr" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".75"/><stop offset="1" stop-color="#ffffff" stop-opacity=".2"/></linearGradient></defs><path d="M0 252h640v48H0z" fill="#ddcebc" opacity=".56"/><path d="M10 258h620" stroke="#c3b59e" stroke-width="3" stroke-linecap="round"/><path d="M320 25v218" stroke="#c8c0bd" stroke-dasharray="6 9" stroke-width="2" opacity=".9"/><rect x="61" y="18" width="62" height="31" rx="12" fill="#fffdf8" stroke="#e1d8c7" stroke-width="2"/><text x="92" y="40" text-anchor="middle" font-size="18" font-family="sans-serif" font-weight="900" fill="#6555a4">A</text><rect x="515" y="18" width="62" height="31" rx="12" fill="#fffdf8" stroke="#e1d8c7" stroke-width="2"/><text x="546" y="40" text-anchor="middle" font-size="18" font-family="sans-serif" font-weight="900" fill="#6555a4">B</text><circle cx="311" cy="13" r="4" fill="#ffbc65"/>`;
    const end = '</svg>';
    if (type === 'plant') {
      const pot = (x,leafColor) => `<g transform="translate(${x},0)"><ellipse cx="0" cy="257" rx="76" ry="10" fill="#8f806f" opacity=".13"/><path d="M-37 194H37L27 252H-27z" fill="#dc977d" stroke="#ba7765" stroke-width="4" stroke-linejoin="round"/><path d="M-41 193h82" stroke="#b87163" stroke-width="11" stroke-linecap="round"/><path d="M0 194V130" stroke="#5b946f" stroke-width="8" stroke-linecap="round"/><path d="M2 166c-34 5-49-13-48-30 28-3 46 8 48 30Z" fill="${leafColor}" stroke="#528b76" stroke-width="3"/><path d="M1 152c1-30 18-44 44-44-1 27-19 43-44 44Z" fill="#77b89a" stroke="#528b76" stroke-width="3"/><path d="M0 138c-20-10-22-31-8-44 19 11 20 29 8 44Z" fill="#a2c69d" stroke="#528b76" stroke-width="3"/><path d="M-33 197h66" stroke="#efbea2" stroke-width="3" stroke-linecap="round"/></g>`;
      const sun = (x) => `<g transform="translate(${x},70)" stroke="#ebb259" stroke-width="4" stroke-linecap="round"><circle cx="0" cy="0" r="22" fill="#ffdc83" stroke="#f4c05f" stroke-width="3"/>${[0,45,90,135,180,225,270,315].map(i=>`<path transform="rotate(${i})" d="M0 -31v-11"/>`).join('')}</g>`;
      // The same sunshine symbol on both sides prevents the drawing from implying a second changed variable (light intensity).
      const drops = (x,count) => Array.from({length:count},(_,i)=>`<path d="M${x+i*17} 188q7-14 7-17c0 4 7 13 7 17 0 8-14 8-14 0Z" fill="#70b3c3" opacity=".95"/>`).join('');
      return baseStart + `<rect x="58" y="79" width="220" height="170" rx="18" fill="#ffffff" opacity=".13"/><rect x="358" y="79" width="220" height="170" rx="18" fill="#fff" opacity=".15"/>${sun(100)}${sun(480)}${pot(190,'#9acb9a')}${pot(448,'#9acb9a')}<g>${drops(105,2)}${drops(365,repaired?2:1)}</g><g fill="none" stroke="#a8ae92" stroke-width="2" stroke-dasharray="4 5"><path d="M115 108v139"/><path d="M376 108v139"/></g>` + end;
    }
    if (type === 'sugar') {
      const beaker = (x,hot) => `<g transform="translate(${x},0)"><ellipse cx="0" cy="263" rx="80" ry="9" fill="#809b9a" opacity=".15"/><path d="M-47 110V228Q-47 240-31 240H31q16 0 16-12V110" fill="url(#glassGr)" stroke="#6b9ba5" stroke-width="6" stroke-linecap="round"/><path d="M-45 153Q-18 145 0 153T45 153V226Q45 238 29 238H-29q-16 0-16-12Z" fill="${hot?'#a9d4d6':'#b3d9e6'}" opacity=".86"/><path d="M-45 155Q-21 148 0 156t45-1" stroke="#77afc7" stroke-width="3" fill="none"/><path d="M-62 112h124" stroke="#6b9ba5" stroke-width="6" stroke-linecap="round"/><path d="M-47 192h17m-17 15h17m-17 15h17" stroke="#779dab" stroke-width="3"/><rect x="-27" y="168" width="18" height="15" rx="3" fill="#fffbf2" stroke="#c6c1b5" stroke-width="2"/><rect x="-2" y="180" width="18" height="15" rx="3" fill="#fffef7" stroke="#c6c1b5" stroke-width="2"/><path d="M-6 72l30 46" stroke="#e0ae68" stroke-width="8" stroke-linecap="round"/><path d="M-6 70v28" stroke="#c08a4d" stroke-width="5" stroke-linecap="round"/></g>`;
      return baseStart + `<circle cx="196" cy="81" r="30" fill="#e9f9f6" stroke="#7bb3ae" stroke-width="3"/><path d="M196 67v18l10 6" fill="none" stroke="#5c908c" stroke-width="5" stroke-linecap="round"/><circle cx="446" cy="80" r="30" fill="#fff1d2" stroke="#e9bf6a" stroke-width="3"/><path d="M446 64v20l-12 7" fill="none" stroke="#c8a25b" stroke-width="5" stroke-linecap="round"/>${beaker(190,false)}${beaker(446,true)}<path d="M286 156h64" stroke="#d1c9c3" stroke-dasharray="5 6" stroke-width="4"/>` + end;
    }
    if (type === 'pendulum') {
      const swing = (x,length,r) => `<g transform="translate(${x},0)"><path d="M-82 66H82" stroke="#837a90" stroke-width="9" stroke-linecap="round"/><path d="M-64 66V256M64 66V256" stroke="#b6a9b7" stroke-width="7" stroke-linecap="round"/><path d="M-84 260H83" stroke="#ad9cae" stroke-width="8" stroke-linecap="round"/><circle cy="68" cx="0" r="9" fill="#f1c579" stroke="#9f8275" stroke-width="3"/><path d="M0 72L${length===125?'-39':'-22'} ${72+length}" stroke="#777386" stroke-width="3.8" stroke-linecap="round"/><circle cx="${length===125?'-39':'-22'}" cy="${72+length}" r="${r}" fill="#f5a577" stroke="#c27963" stroke-width="3"/><path d="M${length===125?'-39':'-22'} ${74+length-r}q8-6 15 1" fill="none" stroke="#ffe2b9" stroke-width="3.5" stroke-linecap="round"/><path d="M-81 260H84" stroke="#897e90" stroke-width="2.5"/></g>`;
      return baseStart + `${swing(193,125,17)}${swing(444,163,repaired?17:24)}<path d="M217 93q36 45 24 83" fill="none" stroke="#c3b0c9" stroke-width="2" stroke-dasharray="5 6"/><path d="M458 96q47 42 28 99" fill="none" stroke="#c3b0c9" stroke-width="2" stroke-dasharray="5 6"/>` + end;
    }
    if (type === 'ramp') {
      const ramp = (x,steep,heavy) => `<g transform="translate(${x},0)"><path d="M-110 246L-12 ${steep?148:194}H110V260H-110Z" fill="#dac5af" stroke="#a89989" stroke-width="3"/><path d="M-110 246L-12 ${steep?148:194}" stroke="#8f8299" stroke-width="9" stroke-linecap="round"/><g transform="translate(${-42},${steep?188:222}) rotate(${steep?-42:-26})"><rect x="-30" y="-18" width="60" height="27" rx="9" fill="#81b7a7" stroke="#3e897d" stroke-width="3"/><path d="M-17-18l8-15h27l11 15" fill="#b1d9cf" stroke="#3e897d" stroke-width="3"/><circle cx="-19" cy="12" r="10" fill="#5c5877"/><circle cx="20" cy="12" r="10" fill="#5c5877"/></g>${heavy?'<circle cx="72" cy="210" r="16" fill="#e0ac7f" stroke="#c38b68" stroke-width="3"/>':''}</g>`;
      return baseStart + ramp(185,false,false) + ramp(450,true,!repaired) + end;
    }
    if (type === 'shadow') {
      const shadow = (x,big,far) => `<g transform="translate(${x},0)"><rect x="73" y="95" width="9" height="142" rx="3" fill="#92afa7"/><rect x="66" y="230" width="40" height="8" rx="4" fill="#659889"/><path d="M78 107L24 150L6 128Q30 84 77 94Z" fill="#f8cf7d" stroke="#ce9e59" stroke-width="3"/><path d="M23 147L${far?95:120} 202L135 146" fill="#fff0b9" opacity=".5"/><circle cx="${far?114:130}" cy="193" r="${big?24:15}" fill="#db967e" stroke="#b97868" stroke-width="3"/><rect x="177" y="99" width="10" height="139" fill="#9a8baf"/><rect x="187" y="107" width="48" height="130" rx="5" fill="#fffef8" stroke="#b5a4bf" stroke-width="3"/><ellipse cx="206" cy="195" rx="${big?25:18}" ry="${big?30:23}" fill="#8a7499" opacity=".22"/></g>`;
      return baseStart + shadow(41,false,false) + shadow(351,!repaired,true) + end;
    }
    if (type === 'magnet') {
      const magnet = (x,far,many) => `<g transform="translate(${x},0)"><path d="M-70 100v62q0 78 71 78 71 0 71-78v-62h-36v61q0 42-35 42-35 0-35-42v-61Z" fill="#dc8d83" stroke="#b46e66" stroke-width="4"/><path d="M-70 101h36v29h-36zm106 0h36v29H36z" fill="#b8e0d2" stroke="#598f80" stroke-width="3"/><path d="M-15 257h70" stroke="#9d9eac" stroke-width="3"/><g stroke="#758394" stroke-width="3" fill="none">${Array.from({length:many?10:5},(_,i)=>`<path d="M${-46+(i%5)*26} ${(far?51:82)+Math.floor(i/5)*29}q-6-6-13 0l-8 8q-5 8 3 10 7 3 11-4l7-7"/>`).join('')}</g></g>`;
      return baseStart + magnet(184,false,false) + magnet(454,true,!repaired) + end;
    }
    if (type === 'sprout') {
      const bowl = (x,water,other) => `<g transform="translate(${x},0)"><ellipse cx="0" cy="259" rx="94" ry="9" fill="#a58a73" opacity=".14"/><path d="M-86 203H86l-17 42H-69z" fill="#e3b587" stroke="#bd896a" stroke-width="4"/><rect x="-78" y="186" width="157" height="22" rx="11" fill="#f2c9a8" stroke="#bc927d" stroke-width="3"/>${Array.from({length:5},(_,i)=>`<ellipse cx="${-55+i*27}" cy="189" rx="8" ry="5" fill="${other?'#a9856f':'#997853'}" stroke="#8b7259" stroke-width="1.8"/>`).join('')}${water?'<path d="M-75 197H74" stroke="#81c3ca" stroke-width="5" stroke-linecap="round" opacity=".7"/>':''}</g>`;
      return baseStart + bowl(182,true,false) + bowl(454,false,!repaired) + end;
    }
    if (type === 'evaporate') {
      const vessel=(x,wide,more)=>`<g transform="translate(${x},0)"><ellipse cx="0" cy="260" rx="${wide?102:68}" ry="8" fill="#8a928d" opacity=".13"/><path d="M${wide?-102:-62} 120v104q0 20 20 20h${wide?164:84}q20 0 20-20V120" fill="url(#glassGr)" stroke="#78a5ac" stroke-width="5"/><path d="M${wide?-100:-60} ${more?171:205}v48q0 21 18 21h${wide?164:84}q18 0 18-21v-48z" fill="#a6d8df" opacity=".82"/><path d="M${wide?-102:-62} 121H${wide?102:62}" stroke="#78a5ac" stroke-width="6" stroke-linecap="round"/><path d="M-35 92q-10-15 0-28m32 26q-10-15 0-28m34 30q-10-15 0-28" stroke="#a5bfc2" stroke-width="3" stroke-dasharray="4 6" fill="none"/></g>`;
      return baseStart + vessel(184,false,true) + vessel(452,true,repaired) + end;
    }
    if (type === 'rubber') {
      const guitar = (x,long,strong)=>`<g transform="translate(${x},0)"><rect x="-98" y="119" width="196" height="113" rx="19" fill="#e9cfae" stroke="#bd9b82" stroke-width="4"/><rect x="-78" y="137" width="157" height="75" rx="9" fill="#f9e8c6"/><path d="M${long?-70:-42} 176H${long?72:43}" stroke="#b67a98" stroke-width="${strong?10:6}" stroke-linecap="round"/><path d="M${long?-70:-42} 156v40M${long?72:43} 156v40" stroke="#917e9b" stroke-width="5"/><path d="M-37 115q13-35 30-18 18 17 31-9" fill="none" stroke="#dca76e" stroke-width="4" stroke-dasharray="5 7"/><circle cx="0" cy="90" r="5" fill="#f5c56b"/></g>`;
      return baseStart + guitar(190,false,false) + guitar(450,true,!repaired) + end;
    }
    return baseStart + end;
  }
})();
