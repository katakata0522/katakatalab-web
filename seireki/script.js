/**
 * ==========================================================================
 * KatakataLab - 年齢・和暦・西暦 早見表＆計算機 プレミアムJS (script.js)
 * ==========================================================================
 */

const Logic = window.SeirekiLogic;

if (!Logic) {
  console.error('SeirekiLogic が読み込まれていません');
}

const CONFIG = Logic ? {
  maxAge: Logic.MAX_AGE,
  currentYear: new Date().getFullYear(),
  minYear: Logic.MIN_YEAR
} : {
  maxAge: 120,
  currentYear: new Date().getFullYear(),
  minYear: 1868
};

let lastHighlightedYear = null;

// DOMのキャッシュ
let UI = {};

/**
 * 初期化処理
 */
function init() {
  if (!Logic) return;
  cacheDOM();
  setupEventListeners();
  initStaticTexts();
  generateHayamiTable();
  updateAllCalculations();
}

/**
 * DOM要素のキャッシュ
 */
function cacheDOM() {
  UI = {
    // タブ切り替え
    tabBtns: document.querySelectorAll('.seireki-tab-btn'),
    tabPanels: document.querySelectorAll('.seireki-tab-panel'),
    
    // 入力
    inputYear: document.getElementById('inputYear'),
    eraName: document.getElementById('eraName'),
    eraYear: document.getElementById('eraYear'),
    birthMonth: document.getElementById('birthMonth'),
    birthDay: document.getElementById('birthDay'),
    clearBtn: document.getElementById('clearBtn'),
    earlyBirthCheckbox: document.getElementById('earlyBirth'),
    resumeNote: document.getElementById('resumeNote'),
    
    // タブ1: 年齢・和暦
    resultArea: document.getElementById('resultArea'),
    copyBtn: document.getElementById('copyBtn'),
    hayamiTableBody: document.querySelector('#hayamiTable tbody'),
    
    // タブ2: 履歴書学歴
    resumeGrid: document.getElementById('resumeGrid'),
    copyAllResumeBtn: document.getElementById('copyAllResumeBtn'),
    
    // タブ3: 厄年・長寿
    yakuniAlertMale: document.getElementById('yakuniAlertMale'),
    yakuniAlertFemale: document.getElementById('yakuniAlertFemale'),
    longevityList: document.getElementById('longevityList'),
    
    // スタティックテキスト
    currentYearText: document.getElementById('currentYearText'),
    reiwaYearText: document.getElementById('reiwaYearText'),
    tableCurrentYearText: document.getElementById('tableCurrentYearText'),
    copyrightYearText: document.getElementById('copyrightYearText'),
    
    // テーマ切り替え
    themeToggle: document.getElementById('theme-toggle')
  };
}

/**
 * イベントリスナー設定
 */
function setupEventListeners() {
  // タブ切り替え
  UI.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  UI.inputYear.addEventListener('input', () => {
    sanitizeYearInput(UI.inputYear, 4);
    syncWarekiFromWestern();
    updateClearButtonVisibility();
    updateAllCalculations();
  });

  if (UI.eraYear) UI.eraYear.addEventListener('input', () => {
    sanitizeYearInput(UI.eraYear, 2);
    syncWesternFromWareki();
    updateClearButtonVisibility();
    updateAllCalculations();
  });

  if (UI.eraName) UI.eraName.addEventListener('change', () => {
    syncWesternFromWareki();
    updateAllCalculations();
  });

  [UI.birthMonth, UI.birthDay].forEach((field) => {
    if (!field) return;
    field.addEventListener('change', () => {
      applyEarlyBirthFromDate();
      updateAllCalculations();
    });
  });

  UI.clearBtn.addEventListener('click', () => {
    UI.inputYear.value = '';
    UI.eraYear.value = '';
    UI.birthMonth.value = '';
    UI.birthDay.value = '';
    UI.earlyBirthCheckbox.checked = false;
    UI.earlyBirthCheckbox.disabled = false;
    UI.inputYear.focus();
    updateClearButtonVisibility();
    updateAllCalculations();
  });

  UI.earlyBirthCheckbox.addEventListener('change', () => {
    updateAllCalculations();
  });

  // メイン結果コピーボタン
  UI.copyBtn.addEventListener('click', () => {
    const val = UI.inputYear.value;
    if (val.length < 4) return;
    
    const birthYear = Logic.parseWesternYear(val);
    if (!birthYear) return;
    const age = Logic.describeAge(birthYear, CONFIG.currentYear, currentBirthdayOptions());
    const wareki = Logic.warekiDisplay(birthYear);
    const eto = Logic.etoOf(birthYear);
    const manLine = age.manAge === null
      ? `今年迎える年齢：${age.turningAge}歳（誕生日前は満 ${Math.max(0, age.turningAge - 1)}歳）`
      : `今年迎える年齢：${age.turningAge}歳／満 ${age.manAge}歳`;

    const copyText = `【年齢・和暦 計算結果】\n生まれた年：西暦 ${birthYear}年（${wareki}）\n${manLine}\n干支：${eto}年\n\nby KatakataLab (https://katakatalab.com/seireki/)`;
    copyToClipboard(copyText, UI.copyBtn, "📋 結果をコピー");
  });

  // 学歴一括コピーボタン
  UI.copyAllResumeBtn.addEventListener('click', () => {
    const items = UI.resumeGrid.querySelectorAll('.seireki-resume-item');
    if (items.length === 0) return;
    
    const earlyLabel = UI.earlyBirthCheckbox.checked ? '早生まれ補正済み' : '早生まれ未補正';
    let copyText = `【履歴書用 学歴の仮置き】\n対象：標準の6-3-3-4・現役進学（${earlyLabel}）\n浪人・留年・高専・短大・専門・院は対象外です。\n`;
    items.forEach(item => {
      const label = item.querySelector('.seireki-resume-label').textContent;
      const year = item.querySelector('.seireki-resume-year').textContent;
      copyText += `${label}：${year}\n`;
    });
    copyText += `\nby KatakataLab (https://katakatalab.com/seireki/)`;
    
    copyToClipboard(copyText, UI.copyAllResumeBtn, "📋 学歴を一括コピー");
  });

  // テーマ切り替えボタン
  if (UI.themeToggle) {
    UI.themeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      try {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      } catch (e) {}
    });
  }
}

/**
 * 静的テキストの初期化
 */
function initStaticTexts() {
  const currentReiwa = CONFIG.currentYear - 2018;
  if (UI.currentYearText) UI.currentYearText.textContent = CONFIG.currentYear;
  if (UI.reiwaYearText) UI.reiwaYearText.textContent = currentReiwa;
  if (UI.tableCurrentYearText) UI.tableCurrentYearText.textContent = CONFIG.currentYear;
  if (UI.copyrightYearText) UI.copyrightYearText.textContent = CONFIG.currentYear;
  
  // プレースホルダーを動的に20年前の年に設定
  UI.inputYear.placeholder = `例：${CONFIG.currentYear - 20}`;
  fillDateSelect(UI.birthMonth, 12, '月');
  fillDateSelect(UI.birthDay, 31, '日');
}

function fillDateSelect(select, max, suffix) {
  if (!select || select.options.length > 1) return;
  for (let value = 1; value <= max; value += 1) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = `${value}${suffix}`;
    select.appendChild(option);
  }
}

/**
 * タブ切り替え処理
 */
function switchTab(tabId) {
  UI.tabBtns.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    }
  });

  UI.tabPanels.forEach(panel => {
    if (panel.id === `panel-${tabId}`) {
      panel.classList.add('active');
      // 滑らかなフェード表示
      panel.style.display = 'flex';
      setTimeout(() => {
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
      }, 50);
    } else {
      panel.classList.remove('active');
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(10px)';
      panel.style.display = 'none';
    }
  });
}

/**
 * クリアボタンの表示状態切り替え
 */
function updateClearButtonVisibility() {
  if (UI.inputYear.value.length > 0) {
    UI.clearBtn.classList.add('visible');
  } else {
    UI.clearBtn.classList.remove('visible');
  }
}

function sanitizeYearInput(field, maxLength) {
  if (!field) return;
  const cleaned = String(field.value || '')
    .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xFEE0))
    .replace(/[^0-9]/g, '')
    .slice(0, maxLength);
  if (cleaned !== field.value) field.value = cleaned;
}

function syncWarekiFromWestern() {
  const year = Logic.parseWesternYear(UI.inputYear.value);
  if (!year) return;
  const era = Logic.ERAS.find((item) => year >= item.start);
  if (!era || !UI.eraName || !UI.eraYear) return;
  UI.eraName.value = era.name;
  UI.eraYear.value = String(year - era.start + 1);
}

function syncWesternFromWareki() {
  if (!UI.eraName || !UI.eraYear || !UI.eraYear.value) return;
  const year = Logic.warekiToWestern(UI.eraName.value, Number.parseInt(UI.eraYear.value, 10));
  if (!year) return;
  UI.inputYear.value = String(year);
}

function currentBirthdayOptions() {
  const today = new Date();
  return {
    month: UI.birthMonth?.value ? Number(UI.birthMonth.value) : null,
    day: UI.birthDay?.value ? Number(UI.birthDay.value) : null,
    todayMonth: today.getMonth() + 1,
    todayDay: today.getDate()
  };
}

function applyEarlyBirthFromDate() {
  const judged = Logic.isEarlyBirth(
    UI.birthMonth?.value,
    UI.birthDay?.value,
    Logic.parseWesternYear(UI.inputYear?.value)
  );
  if (judged === null) {
    UI.earlyBirthCheckbox.disabled = false;
    return;
  }
  UI.earlyBirthCheckbox.checked = judged;
  UI.earlyBirthCheckbox.disabled = true;
}

/**
 * クリップボードへのコピー処理（マイクロインタラクション付き）
 */
async function copyToClipboard(text, btnElement, originalHtml) {
  let copied = false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (_) {
      copied = false;
    }
  }
  if (!copied) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      copied = document.execCommand('copy');
      ta.remove();
    } catch (_) {
      copied = false;
    }
  }

  if (copied) {
    btnElement.textContent = "✅ コピーしました！";
    btnElement.style.borderColor = "var(--c-success)";
    btnElement.style.color = "var(--c-success)";

    setTimeout(() => {
      btnElement.textContent = originalHtml;
      btnElement.style.borderColor = "";
      btnElement.style.color = "";
    }, 2000);
  } else {
    alert('コピーに失敗しました。手動で範囲選択してコピーしてください。');
  }
}

/**
 * 早見表（テーブル）の自動生成
 */
function generateHayamiTable() {
  const fragment = document.createDocumentFragment();
  
  for (let i = 0; i <= CONFIG.maxAge; i++) {
    const targetYear = CONFIG.currentYear - i;
    if (targetYear < CONFIG.minYear) break;
    
    const tr = document.createElement('tr');
    if (i === 0) {
      tr.classList.add('current-year');
    }
    
    tr.dataset.year = String(targetYear);
    const yearCell = document.createElement('td');
    yearCell.className = 'year-en';
    yearCell.textContent = `${targetYear}年`;
    const warekiCell = document.createElement('td');
    warekiCell.textContent = Logic.warekiDisplay(targetYear);
    const ageCell = document.createElement('td');
    ageCell.className = 'age-highlight';
    ageCell.textContent = `${i}歳`;
    const etoCell = document.createElement('td');
    etoCell.textContent = `${Logic.etoOf(targetYear)}年`;
    tr.append(yearCell, warekiCell, ageCell, etoCell);
    
    fragment.appendChild(tr);
  }
  
  UI.hayamiTableBody.replaceChildren();
  UI.hayamiTableBody.appendChild(fragment);
}

/**
 * すべての計算処理をアップデートする親関数
 */
function updateAllCalculations() {
  const val = UI.inputYear.value;
  
  if (val.length < 4) {
    showPlaceholderState();
    return;
  }
  
  const birthYear = Logic.parseWesternYear(val);
  if (!birthYear) return;
  
  if (birthYear > CONFIG.currentYear) {
    showErrorState("未来の年は入力できません");
    return;
  }
  
  if (birthYear < CONFIG.minYear) {
    showErrorState(`明治元年（${CONFIG.minYear}年）以降で入力してください`);
    return;
  }
  
  // 正常計算処理へ
  calculateMainResult(birthYear);
  calculateResumeDates(birthYear);
  calculateYakuAndLongevity(birthYear);
  highlightHayamiRow(birthYear);
}

/**
 * 未入力または不完全入力時のプレースホルダー表示
 */
function replaceWithMessage(container, className, text) {
  if (!container) return;
  container.replaceChildren();
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  container.appendChild(el);
}

function showPlaceholderState() {
  UI.resultArea.replaceChildren();
  const sub = document.createElement('div');
  sub.className = 'seireki-result-sub';
  sub.textContent = '生まれた年（西暦4桁）を入力すると自動で計算します';
  const main = document.createElement('div');
  main.className = 'seireki-result-main';
  main.textContent = '---';
  UI.resultArea.append(sub, main);
  UI.copyBtn.classList.remove('visible');

  replaceWithMessage(
    UI.resumeGrid,
    'seireki-empty-message',
    '生まれた年を入力すると、履歴書用の入学・卒業年度が自動計算されます。'
  );
  UI.copyAllResumeBtn.classList.remove('visible');

  UI.yakuniAlertMale.style.display = 'none';
  UI.yakuniAlertFemale.style.display = 'none';
  replaceWithMessage(
    UI.longevityList,
    'seireki-empty-message',
    '生まれた年を入力すると、厄年と長寿お祝いの節目が表示されます。'
  );
  if (UI.resumeNote) UI.resumeNote.textContent = '';
  highlightHayamiRow(null);
}

/**
 * エラー発生時の状態表示
 */
function showErrorState(message) {
  replaceWithMessage(UI.resultArea, 'seireki-result-error', `⚠️ ${message}`);
  UI.copyBtn.classList.remove('visible');
  replaceWithMessage(UI.resumeGrid, 'seireki-empty-message seireki-empty-message--error', '⚠️ 正しい年を入力してください');
  UI.copyAllResumeBtn.classList.remove('visible');
  UI.yakuniAlertMale.style.display = 'none';
  UI.yakuniAlertFemale.style.display = 'none';
  UI.longevityList.replaceChildren();
}

/**
 * タブ1: 年齢・和暦・干支のリアルタイム計算
 */
function highlightHayamiRow(birthYear) {
  if (!UI.hayamiTableBody) return;
  const rows = UI.hayamiTableBody.querySelectorAll('tr');
  let target = null;
  rows.forEach((row) => {
    const isMatch = row.dataset.year === String(birthYear);
    row.classList.toggle('is-selected-year', isMatch);
    if (isMatch) target = row;
  });
  if (target && lastHighlightedYear !== String(birthYear)) {
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  lastHighlightedYear = target ? String(birthYear) : null;
}

function calculateMainResult(birthYear) {
  const age = Logic.describeAge(birthYear, CONFIG.currentYear, currentBirthdayOptions());
  const wareki = Logic.warekiDisplay(birthYear);
  const eto = Logic.etoOf(birthYear);
  const manText = age.manAge === null
    ? `※誕生日前の方は満 ${Math.max(0, age.turningAge - 1)}歳です。月日を入れると満年齢を出します。`
    : `満年齢：${age.manAge}歳`;

  UI.resultArea.replaceChildren();
  const sub = document.createElement('div');
  sub.className = 'seireki-result-sub';
  sub.textContent = `${birthYear}年（${wareki}）生まれ`;
  const main = document.createElement('div');
  main.className = 'seireki-result-main';
  main.append('今年迎える年齢：');
  const ageEl = document.createElement('span');
  ageEl.className = 'age';
  ageEl.textContent = String(age.turningAge);
  const etoEl = document.createElement('span');
  etoEl.className = 'seireki-eto';
  etoEl.textContent = `(${eto}年)`;
  main.append(ageEl, '歳 ', etoEl);
  const note = document.createElement('div');
  note.className = 'seireki-result-sub';
  note.style.marginTop = '0.25rem';
  note.textContent = manText;
  UI.resultArea.append(sub, main, note);

  UI.copyBtn.classList.add('visible');
}

/**
 * タブ2: 履歴書用学歴計算（早生まれ完全対応）
 */
function calculateResumeDates(birthYear) {
  const isEarlyBirth = UI.earlyBirthCheckbox.checked;
  const timeline = Logic.resumeTimeline(birthYear, { earlyBirth: isEarlyBirth });
  if (UI.resumeNote) {
    UI.resumeNote.textContent = isEarlyBirth
      ? '早生まれ補正済み。標準の6-3-3-4・現役進学の仮置きです。浪人・留年・高専等は対象外です。'
      : '早生まれ未補正。標準の6-3-3-4・現役進学の仮置きです。1月1日〜4月1日生まれはチェックを入れてください。';
  }

  UI.resumeGrid.replaceChildren();
  timeline.forEach((item) => {
    const itemWareki = Logic.warekiDisplay(item.year);
    const dateStr = `${item.year}年（${itemWareki}）${item.month}月`;
    const copyTargetText = `${item.label}：${dateStr}`;

    const row = document.createElement('div');
    row.className = 'seireki-resume-item';
    const info = document.createElement('div');
    info.className = 'seireki-resume-info';
    const label = document.createElement('span');
    label.className = 'seireki-resume-label';
    label.textContent = item.label;
    const year = document.createElement('span');
    year.className = 'seireki-resume-year';
    year.textContent = dateStr;
    info.append(label, year);
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'seireki-resume-copy-btn';
    copyBtn.title = `${item.label}をコピー`;
    copyBtn.setAttribute('aria-label', `${item.label}をコピー`);
    copyBtn.textContent = '📋';
    copyBtn.addEventListener('click', () => {
      copyToClipboard(copyTargetText, copyBtn, '📋');
    });
    row.append(info, copyBtn);
    UI.resumeGrid.appendChild(row);
  });

  UI.copyAllResumeBtn.classList.add('visible');
}

/**
 * タブ3: 厄年・長寿お祝い計算（数え年基準）
 */
function yakuMessage(kazueAge, honAges, genderLabel) {
  const next = Logic.nextYakudoshi(kazueAge, honAges);
  if (!next) {
    return `${genderLabel}：数え年 ${kazueAge}歳。一般的な本厄の目安は過ぎています。`;
  }
  if (next.kind === '次') {
    return `${genderLabel}：数え年 ${kazueAge}歳。次の本厄の目安は数え${next.hon}歳（あと約${next.yearsLater}年）です。`;
  }
  return `${genderLabel}：数え年 ${kazueAge}歳は${next.kind}の目安です（本厄は数え${next.hon}歳）。地域や神社で案内が違うことがあります。`;
}

function yakuAlertClass(kazueAge, honAges, dangerHon) {
  const next = Logic.nextYakudoshi(kazueAge, honAges);
  if (!next || next.kind === '次') return 'info';
  if (next.hon === dangerHon) return 'danger';
  return 'warn';
}

function renderYakuAlert(target, title, text, alertClass) {
  if (!target) return;
  target.style.display = 'flex';
  target.className = `seireki-alert-card ${alertClass}`;
  target.replaceChildren();
  const icon = document.createElement('div');
  icon.className = 'seireki-alert-icon';
  icon.textContent = alertClass === 'info' ? '🛡️' : '⚠️';
  const body = document.createElement('div');
  body.className = 'seireki-alert-body';
  const heading = document.createElement('h3');
  heading.textContent = title;
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  body.append(heading, paragraph);
  target.append(icon, body);
}

function calculateYakuAndLongevity(birthYear) {
  const kazueAge = CONFIG.currentYear - birthYear + 1;
  const maleAges = [25, 42, 61];
  const femaleAges = [19, 33, 37, 61];

  renderYakuAlert(
    UI.yakuniAlertMale,
    '男性の厄年情報',
    yakuMessage(kazueAge, maleAges, '男性'),
    yakuAlertClass(kazueAge, maleAges, 42)
  );
  renderYakuAlert(
    UI.yakuniAlertFemale,
    '女性の厄年情報',
    yakuMessage(kazueAge, femaleAges, '女性'),
    yakuAlertClass(kazueAge, femaleAges, 33)
  );

  const longevityMilestones = [
    { name: '還暦 (かんれき)', age: 60, isKazue: false, desc: '満60歳 / 数え61歳 赤いちゃんちゃんこで有名' },
    { name: '古希 (こき)', age: 70, isKazue: true, desc: '数え70歳 / 満69歳 紫色でお祝い' },
    { name: '喜寿 (きじゅ)', age: 77, isKazue: true, desc: '数え77歳 / 満76歳 紫色でお祝い' },
    { name: '傘寿 (さんじゅ)', age: 80, isKazue: true, desc: '数え80歳 / 満79歳 黄（金）色でお祝い' },
    { name: '米寿 (べいじゅ)', age: 88, isKazue: true, desc: '数え88歳 / 満87歳 黄（金）色でお祝い' },
    { name: '卒寿 (そつじゅ)', age: 90, isKazue: true, desc: '数え90歳 / 満89歳 白色でお祝い' },
    { name: '白寿 (はくじゅ)', age: 99, isKazue: true, desc: '数え99歳 / 満98歳 白色でお祝い' },
    { name: '百寿 (ひゃくじゅ)', age: 100, isKazue: true, desc: '数え100歳 / 満99歳 百は「もも」とも読み、桃色でお祝い' }
  ];

  UI.longevityList.replaceChildren();
  longevityMilestones.forEach((milestone) => {
    const celebrateYear = milestone.isKazue ? birthYear + milestone.age - 1 : birthYear + milestone.age;
    const item = document.createElement('div');
    item.className = 'seireki-badge-item';
    item.title = milestone.desc;
    const title = document.createElement('span');
    title.className = 'seireki-badge-title';
    title.textContent = milestone.name;
    const value = document.createElement('span');
    value.className = 'seireki-badge-value';
    const yearStrong = document.createElement('strong');
    yearStrong.textContent = `${celebrateYear}年`;
    const wareki = document.createTextNode(` (${Logic.warekiDisplay(celebrateYear)}) `);
    const status = document.createElement('span');
    if (celebrateYear === CONFIG.currentYear) {
      item.classList.add('highlight-danger');
      status.textContent = '【今年！】';
    } else if (celebrateYear < CONFIG.currentYear) {
      status.className = 'seireki-badge-past';
      status.textContent = '(お祝い済み)';
    } else {
      status.className = 'seireki-badge-future';
      status.textContent = `(あと ${celebrateYear - CONFIG.currentYear}年)`;
    }
    value.append(yearStrong, wareki, status);
    item.append(title, value);
    UI.longevityList.appendChild(item);
  });
}

// DOMの読込完了後に実行
document.addEventListener('DOMContentLoaded', init);
