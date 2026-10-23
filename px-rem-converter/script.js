document.addEventListener('DOMContentLoaded', () => {
  const pageLang = (document.documentElement.lang || '').toLowerCase().split('-')[0];
  // DOM要素
  const els = {
    rootBase: document.getElementById('rootBase'),
    pxInput: document.getElementById('pxInput'),
    remInput: document.getElementById('remInput'),
    previewRoot: document.getElementById('previewRoot'),
    previewText: document.getElementById('previewText'),
    infoPx: document.getElementById('infoPx'),
    infoRem: document.getElementById('infoRem'),
    tableBody: document.getElementById('tableBody'),
    copyBtn: document.getElementById('copyCssBtn'),
    rootPresets: document.querySelectorAll('[data-root]'),
    
    // Advanced Usability Elements
    pxCard: document.getElementById('pxCard'),
    remCard: document.getElementById('remCard'),
    codeFormatSelect: document.getElementById('codeFormatSelect'),
    customPxInput: document.getElementById('customPxInput'),
    addSizeBtn: document.getElementById('addSizeBtn'),
    resetSizesBtn: document.getElementById('resetSizesBtn'),
    listMessage: document.getElementById('listMessage')
  };

  if (!els.rootBase || !els.pxInput || !els.remInput || !els.tableBody) {
    return;
  }

  // 定数・設定
  const MIN_PX = 1;     // 表示崩れ防止のための最小サイズ
  const MAX_PX = 300;   // 表示崩れ防止のための最大サイズ（プレビューの自由度拡大）
  const DEFAULT_SIZES = [8, 10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96];

  
  // 早見表サイズリスト（localStorageから復元）
  let customSizes = [...DEFAULT_SIZES];
  let lastEdited = 'px';
  let resetTimer = null;
  let copyTimer = null;
  let copyGeneration = 0;
  const storageBlocked = new Set();
  function disarmReset() {
    clearTimeout(resetTimer);
    if (els.resetSizesBtn) {
      els.resetSizesBtn.dataset.armed = '';
      els.resetSizesBtn.textContent = pageLang === 'en' ? '↩ Reset' : '↩ リセット';
    }
  }
  function updateCopyLabel() {
    els.copyBtn.textContent = pageLang === 'en' ? `Copy this list as code (${customSizes.length})` : `この一覧をコードでコピー（${customSizes.length}件）`;
    els.copyBtn.disabled = !customSizes.length || !Number.isFinite(getRoot());
  }

  function invalidateCopy() {
    copyGeneration += 1;
    clearTimeout(copyTimer);
    const manualCopy = document.getElementById('manualCopyCode');
    if (manualCopy) {
      if (!manualCopy.hidden && manualCopy.value) showListMessage('');
      manualCopy.hidden = true;
      manualCopy.value = '';
    }
    els.copyBtn.classList.remove('is-copied');
    updateCopyLabel();
  }

  // 初期化
  function init() {
    // 1. localStorage からカスタムサイズリストとプレビューテキストを復元
    loadSavedData();

    // 2. 入力フォーカス発光エフェクトの登録
    initCardFocusEffects();

    // 3. 入力イベントの監視
    els.rootBase.addEventListener('input', () => {
      disarmReset();
      (lastEdited === 'rem' ? syncFromRem : syncFromPx)();
      generateTable();
      updatePresetState();
    });

    els.rootPresets.forEach((btn) => {
      btn.addEventListener('click', () => {
        els.rootBase.value = btn.dataset.root;
        els.rootBase.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    updatePresetState();

    els.pxInput.addEventListener('input', () => { lastEdited = 'px'; disarmReset(); syncFromPx(); });
    els.remInput.addEventListener('input', () => { lastEdited = 'rem'; disarmReset(); syncFromRem(); });
    els.copyBtn.addEventListener('click', copyCodeFormat);

    // 4. カスタムサイズ追加アクション
    els.customPxInput.addEventListener('input', disarmReset);
    els.codeFormatSelect.addEventListener('change', () => { disarmReset(); invalidateCopy(); });
    els.addSizeBtn.addEventListener('click', addCustomSize);
    els.customPxInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomSize();
      }
    });

    // 5. リセットは誤操作防止のため二度押し
    if (els.resetSizesBtn) {
      els.resetSizesBtn.addEventListener('click', () => {
        if (els.resetSizesBtn.dataset.armed !== '1') {
          els.resetSizesBtn.dataset.armed = '1';
          resetTimer = setTimeout(disarmReset, 5000);
          els.resetSizesBtn.textContent = pageLang === 'en' ? 'Click again to reset' : 'もう一度押すと戻します';
          showListMessage(pageLang === 'en' ? 'Click reset once more to restore the default list.' : 'リセットをもう一度押すと、早見表を初期状態に戻します。');
          return;
        }
        disarmReset();
        customSizes = [...DEFAULT_SIZES];
        const saved = safeSetStorage('pxRemCustomSizes', JSON.stringify(customSizes));
        generateTable();
        els.resetSizesBtn.dataset.armed = '';
        els.resetSizesBtn.textContent = pageLang === 'en' ? '↩ Reset' : '↩ リセット';
        if (saved) showListMessage(pageLang === 'en' ? 'The reference table was reset.' : '早見表を初期状態に戻しました。');
      });
    }

    // 6. プレビューはプレーンテキストだけ保存する（HTMLを復元しない）
    if (els.previewText) {
      els.previewText.addEventListener('input', () => {
        disarmReset();
        safeSetStorage('pxRemPreviewText', els.previewText.textContent);
      });
    }

    // 初期表示生成
    generateTable();
    syncFromPx(); // デフォルト値を反映
  }

  /* =========================================
     LOCAL STORAGE & LOADERS
     ========================================= */

  function sanitizeSizes(value) {
    if (!Array.isArray(value)) return [...DEFAULT_SIZES];
    const cleaned = [...new Set(value
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item >= 1 && item <= 500))];
    cleaned.sort((a, b) => a - b);
    return cleaned.slice(0, 80);
  }

  function showListMessage(text) {
    if (!els.listMessage) return;
    els.listMessage.hidden = !text;
    els.listMessage.textContent = text || '';
  }

  function safeGetStorage(key) {
    try { return localStorage.getItem(key); } catch (_) { storageBlocked.add(key); return null; }
  }

  function safeSetStorage(key, value) {
    try {
      if (storageBlocked.has(key)) throw new Error('Unreadable previous data');
      localStorage.setItem(key, value); return true;
    } catch (_) {
      showListMessage(pageLang === 'en' ? 'Updated on this screen, but could not save for next time. Previous saved data was kept.' : 'この画面には反映しましたが、次回用に保存できませんでした。元の保存データは保持しています。');
      return false;
    }
  }

  function loadSavedData() {
    const savedText = safeGetStorage('pxRemPreviewText');
    if (savedText && els.previewText) {
      els.previewText.textContent = savedText;
    }

    const savedSizes = safeGetStorage('pxRemCustomSizes');
    if (savedSizes) {
      try {
        const parsed = JSON.parse(savedSizes);
        if (!Array.isArray(parsed) || parsed.length > 80 || parsed.some(v => !['number','string'].includes(typeof v) || !String(v).trim() || !Number.isFinite(Number(v)) || Number(v) < 1 || Number(v) > 500)) throw new Error('Invalid saved list');
        customSizes = sanitizeSizes(parsed);
      } catch (e) {
        storageBlocked.add('pxRemCustomSizes');
        showListMessage(pageLang === 'en' ? 'Saved list could not be read. It has not been overwritten.' : '保存済み一覧を読み込めませんでした。元のデータは上書きしていません。');
        customSizes = [...DEFAULT_SIZES];
      }
    } else {
      customSizes = [...DEFAULT_SIZES];
    }
  }

  function initCardFocusEffects() {
    // PX入力カードのフォーカス
    els.pxInput.addEventListener('focus', () => els.pxCard.classList.add('focused'));
    els.pxInput.addEventListener('blur', () => els.pxCard.classList.remove('focused'));

    // REM入力カードのフォーカス
    els.remInput.addEventListener('focus', () => els.remCard.classList.add('focused'));
    els.remInput.addEventListener('blur', () => els.remCard.classList.remove('focused'));
  }

  /* =========================================
     MATH HELPERS
     ========================================= */

  // PX / ROOT 計算・丸め共通ヘルパー
  function pxToRem(px, root) {
    if (!Number.isFinite(px) || !Number.isFinite(root) || root <= 0) return 0;
    const rem = px / root;
    return Number.isFinite(rem * 10000) ? Math.round(rem * 10000) / 10000 : 0; // 少数第4位まで
  }

  // REM / ROOT 計算・丸め共通ヘルパー
  function remToPx(rem, root) {
    if (!Number.isFinite(rem) || !Number.isFinite(root) || root <= 0) return 0;
    const px = rem * root;
    return Number.isFinite(px * 100) ? Math.round(px * 100) / 100 : 0; // PXは少数第2位まで
  }

  /* =========================================
     SYNCHRONIZATION LOGIC
     ========================================= */

  // PX入力時の処理
  function syncFromPx() {
    const root = getRoot();
    const px = parseFloat(els.pxInput.value);

    if (!Number.isFinite(root) || !Number.isFinite(px) || !Number.isFinite(px / root * 10000)) {
      els.remInput.value = '';
      updatePreview(NaN, 0);
      return;
    }

    const remFormatted = pxToRem(px, root);

    // 循環更新を防ぐため、フォーカスがない場合のみ更新
    if (document.activeElement !== els.remInput) {
      els.remInput.value = remFormatted;
    }
    
    updatePreview(px, remFormatted);
  }

  // REM入力時の処理
  function syncFromRem() {
    const root = getRoot();
    const rem = parseFloat(els.remInput.value);

    if (!Number.isFinite(root) || !Number.isFinite(rem) || !Number.isFinite(rem * root * 100)) {
      els.pxInput.value = '';
      updatePreview(NaN, 0);
      return;
    }

    const pxFormatted = remToPx(rem, root);

    if (document.activeElement !== els.pxInput) {
      els.pxInput.value = pxFormatted;
    }

    updatePreview(pxFormatted, rem);
  }

  // 16 / 10 ボタンの選択状態
  function updatePresetState() {
    const root = getRoot();
    els.rootPresets.forEach((btn) => {
      const isActive = Number(btn.dataset.root) === root;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  // Preview uses a bounded demo root; numeric conversion retains the entered root.
  function updatePreview(px, rem) {
    const root = getRoot();
    const notice = document.getElementById('previewLimitNotice');
    const displayRoot = Number.isFinite(root) ? Math.max(MIN_PX, Math.min(MAX_PX, root)) : 16;
    if (els.previewRoot) els.previewRoot.style.fontSize = `${displayRoot}px`;
    if (!Number.isFinite(px) || px <= 0 || !Number.isFinite(root)) {
      els.previewText.style.fontSize = '';
      els.infoPx.textContent = '- px';
      els.infoRem.textContent = '- rem';
      if (notice) {
        notice.hidden = false;
        notice.textContent = pageLang === 'en' ? 'No font-size preview for invalid, zero or negative values. Numeric conversions can still be used for spacing.' : '無効な値・0・負数は文字サイズのプレビュー対象外です。数値の換算結果は余白などに利用できます。';
      }
      return;
    }
    const displayPx = Math.max(MIN_PX, Math.min(MAX_PX, px));
    // Divide by the actual demo root, not the unbounded numeric root.
    els.previewText.style.fontSize = `${displayPx / displayRoot}em`;
    els.infoPx.textContent = `${px}px`;
    els.infoRem.textContent = `${rem}rem`;
    if (notice) {
      const limited = displayPx !== px || displayRoot !== root;
      notice.hidden = !limited;
      notice.textContent = limited ? (pageLang === 'en'
        ? `Preview only: text ${displayPx}px, demo root ${displayRoot}px (bounded to 1–300px). Conversion values above are unchanged.`
        : `プレビューのみ：文字 ${displayPx}px、擬似ルート ${displayRoot}px（1〜300pxに制限）。上の換算値は変更していません。`) : '';
    }
  }

  // 基準値の取得（バリデーション付き）
  function getRoot() {
    const val = Number(els.rootBase.value);
    const valid = String(els.rootBase.value).trim() !== '' && Number.isFinite(val) && val > 0 && Number.isFinite(500 / val * 10000);
    els.rootBase.setAttribute('aria-invalid', String(!valid));
    const message = document.getElementById('rootError');
    if (message) message.hidden = valid;
    return valid ? val : NaN;
  }

  /* =========================================
     CUSTOM SIZE LIST MANAGEMENT
     ========================================= */

  // リリストへのサイズ追加
  function addCustomSize() {
    disarmReset();
    const pxValue = Number(els.customPxInput.value);
    if (!Number.isFinite(pxValue) || pxValue < 1 || pxValue > 500) {
      showListMessage(pageLang === 'en' ? 'Enter a number from 1 to 500 (decimals allowed).' : '1pxから500pxの数値を入力してください（小数も可）。');
      return;
    }

    if (customSizes.includes(pxValue)) {
      showListMessage(pageLang === 'en' ? 'That size is already in the table.' : 'このサイズはすでに早見表にあります。');
      return;
    }

    if (customSizes.length >= 80) {
      showListMessage(pageLang === 'en' ? 'The table can hold up to 80 sizes.' : '早見表は80件までです。不要な行を削除してください。');
      return;
    }

    customSizes.push(pxValue);
    customSizes.sort((a, b) => a - b); // 昇順ソート

    // 保存 ＆ 再描画
    const saved = safeSetStorage('pxRemCustomSizes', JSON.stringify(customSizes));
    generateTable();
    if (saved) showListMessage('');
    els.customPxInput.value = '';
    els.customPxInput.focus();
  }

  // リストからのサイズ削除
  function deleteSize(px) {
    disarmReset();
    customSizes = customSizes.filter(s => s !== px);
    safeSetStorage('pxRemCustomSizes', JSON.stringify(customSizes));
    generateTable();
  }

  // 早見表の生成
  function generateTable() {
    const root = getRoot();
    els.tableBody.replaceChildren();
    invalidateCopy();

    customSizes.forEach((px) => {
      const rem = pxToRem(px, root);
      const tr = document.createElement('tr');

      const pxCell = document.createElement('td');
      const pxButton = document.createElement('button');
      pxButton.type = 'button';
      pxButton.className = 'clickable-row-cell';
      pxButton.dataset.px = String(px);
      pxButton.title = pageLang === 'en' ? 'Set this size in the preview' : 'このサイズをプレビューにセット';
      pxButton.textContent = `${px}px`;
      pxButton.addEventListener('click', () => {
        els.pxInput.value = String(px);
        lastEdited = 'px';
        disarmReset();
        syncFromPx();
        els.pxInput.focus();
      });
      pxCell.appendChild(pxButton);

      const remCell = document.createElement('td');
      remCell.textContent = Number.isFinite(root) ? `${rem}rem` : '—';

      const sampleCell = document.createElement('td');
      const sample = document.createElement('span');
      sample.className = 'sample-text';
      sample.style.fontSize = `${Math.min(MAX_PX, px)}px`;
      if (px > MAX_PX) sample.title = pageLang === 'en' ? `Preview limited to ${MAX_PX}px` : `サンプル表示は${MAX_PX}pxに制限`;
      sample.textContent = 'The quick brown fox';
      sampleCell.appendChild(sample);

      const deleteCell = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-delete-size';
      deleteBtn.title = pageLang === 'en' ? 'Remove this row' : 'この行を削除';
      deleteBtn.setAttribute('aria-label', pageLang === 'en' ? `Remove the ${px} px row` : `${px}pxの行を削除`);
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', () => deleteSize(px));
      deleteCell.appendChild(deleteBtn);

      tr.append(pxCell, remCell, sampleCell, deleteCell);
      els.tableBody.appendChild(tr);
    });
  }

  /* =========================================
     MULTI-FORMAT CODE GENERATOR
     ========================================= */

  function copyCodeFormat() {
    const root = getRoot();
    const format = els.codeFormatSelect.value;
    
    if (!Number.isFinite(root) || !customSizes.length) return;
    const generation = ++copyGeneration;
    clearTimeout(copyTimer);
    const sizes = [...customSizes];
    const isWindows = navigator.userAgent.toLowerCase().includes('win');
    const newline = isWindows ? '\r\n' : '\n';
    
    let generatedText = '';

    if (format === 'css') {
      // CSS 変数形式
      generatedText = `/* Root Base: ${root}px */${newline}:root {${newline}`;
      sizes.forEach(px => {
        const rem = pxToRem(px, root);
        generatedText += `  --fs-${String(px).replace('.', 'p')}: ${rem}rem; /* ${px}px */${newline}`;
      });
      generatedText += `}`;
    } else if (format === 'scss') {
      // SCSS 変数形式
      generatedText = `// Root Base: ${root}px${newline}`;
      sizes.forEach(px => {
        const rem = pxToRem(px, root);
        generatedText += `$fs-${String(px).replace('.', 'p')}: ${rem}rem; // ${px}px${newline}`;
      });
    } else if (format === 'tailwind') {
      // Tailwind CSS 設定ファイル形式
      generatedText = `// Tailwind CSS configuration${newline}fontSize: {${newline}`;
      sizes.forEach(px => {
        const rem = pxToRem(px, root);
        generatedText += `  '${px}': '${rem}rem', // ${px}px${newline}`;
      });
      generatedText += `}`;
    } else if (format === 'classes') {
      // CSS クラス形式
      generatedText = `/* Root Base: ${root}px */${newline}`;
      sizes.forEach(px => {
        const rem = pxToRem(px, root);
        generatedText += `.text-${String(px).replace('.', 'p')} { font-size: ${rem}rem; } /* ${px}px */${newline}`;
      });
    }

    const manualCopy = document.getElementById('manualCopyCode');
    if (manualCopy) { manualCopy.hidden = true; manualCopy.value = ''; }
    copyText(generatedText)
      .then(() => {
        if (generation !== copyGeneration) return;
        showListMessage('');
        els.copyBtn.textContent = pageLang === 'en' ? 'Copied!' : 'コピーしました';
        els.copyBtn.classList.add('is-copied');
        copyTimer = setTimeout(() => {
          updateCopyLabel();
          els.copyBtn.classList.remove('is-copied');
        }, 1500);
      })
      .catch(() => {
        if (generation !== copyGeneration) return;
        if (manualCopy) {
          manualCopy.value = generatedText;
          manualCopy.hidden = false;
          manualCopy.focus();
          manualCopy.select();
        }
        showListMessage(pageLang === 'en' ? 'Copy failed. Select the text and copy it manually.' : 'コピーに失敗しました。手動で選択してコピーしてください。');
      });
  }

  function copyText(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try { return Promise.resolve(navigator.clipboard.writeText(text)); } catch (error) { return Promise.reject(error); }
    }
    return new Promise((resolve, reject) => {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      try {
        if (document.execCommand('copy')) resolve();
        else reject(new Error('copy failed'));
      } catch (error) {
        reject(error);
      }
      area.remove();
    });
  }

  init();
});
