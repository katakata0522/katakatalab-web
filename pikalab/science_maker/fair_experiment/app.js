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
    solved: new Set()
  };
  const OPTION_LETTERS = ['A', 'B', 'C'];
  const initialLabels = { plant: '植物', sugar: 'コップ', pendulum: 'ふりこ' };

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
    render();
    if (shouldScroll) focusWorkbench();
  }
  function focusWorkbench() {
    $('investigation').scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    $('investigation').focus({ preventScroll: true });
  }
  function renderNav() {
    for (const btn of document.querySelectorAll('[data-case-id]')) {
      const id = btn.dataset.caseId;
      const current = id === state.activeId;
      const complete = state.solved.has(id);
      btn.classList.toggle('is-current', current);
      btn.classList.toggle('is-complete', complete);
      btn.setAttribute('aria-pressed', current ? 'true' : 'false');
      const label = btn.querySelector('.ticket-status');
      if (label) label.textContent = complete ? '✓ 解決済み' : current ? '調査中 ↗' : '未調査 ↗';
    }
    $('completedCount').textContent = `${state.solved.size} / ${lib.CASES.length}`;
  }
  function renderCaseHeader() {
    const item = activeCase(); const progress = entry();
    $('caseOrdinal').textContent = '/ FILE ' + item.order;
    $('currentCaseTitle').textContent = item.title;
    $('caseDescription').textContent = item.description;
    $('caseOrdinal').textContent = `/ FILE ${item.order}`;
    $('stageCounter').innerHTML = progress.finished
      ? '<span aria-hidden="true">✦</span> <strong>調査完了！</strong>'
      : `<span aria-hidden="true">✶</span> 手がかりを <strong>${progress.index + 1} / ${item.steps.length}</strong> 調査中`;
  }
  function renderObservations() {
    const item = activeCase(); const progress = entry();
    const repaired = progress.index === 2 || (progress.index === 1 && progress.accepted) || progress.finished;
    const container = $('observationList'); container.replaceChildren();
    const rows = item.observations;
    ['a', 'b'].forEach((side, sideIndex) => {
      const card = el('div', 'observation-card');
      const top = el('div', 'observation-head');
      top.append(el('strong', '', `実験 ${side.toUpperCase()}`), el('span', '', initialLabels[item.id] || 'じっけん'));
      const list = el('div', 'observation-rows');
      for (const obs of rows) {
        const visibleValue = side === 'b' && repaired && obs.repairedB ? obs.repairedB : obs[side];
        const highlighted = obs.kind === 'mistake' && !repaired;
        const row = el('div', `observation-row${highlighted ? ' emphasis' : ''}${obs.kind === 'mistake' && repaired ? ' resolved' : ''}`);
        row.append(el('span', '', obs.name), el('strong', '', visibleValue));
        list.appendChild(row);
      }
      card.append(top, list);
      container.appendChild(card);
    });
    $('sceneArt').dataset.type = item.scene;
    $('sceneArt').innerHTML = sceneSvg(item.scene, repaired);
  }
  function renderChoices() {
    const item = activeCase(), progress = entry(), step = item.steps[progress.index];
    $('stepEyebrow').textContent = step.eyebrow;
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
    $('hintButton').textContent = progress.hintLevel ? (progress.hintLevel === 1 ? '✳ もう少しヒント' : '✳ ヒントを確認') : '✳ ヒントをみる';
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
    $('nextCaseButton').innerHTML = allDone ? '最初の事件を見直す <span aria-hidden="true">→</span>' : 'つぎの事件へ <span aria-hidden="true">→</span>';
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
    goToCase(unsolved ? unsolved.id : lib.CASES[0].id);
  }
  function showHelp() {
    const d = $('helpDialog');
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  }
  function closeHelp() {
    const d = $('helpDialog');
    if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
  }
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
    return baseStart + end;
  }
})();
