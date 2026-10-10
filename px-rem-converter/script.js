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
  // コピー対象は早見表より少ない主要サイズのみ
  const COPY_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];
  
  // 早見表サイズリスト（localStorageから復元）
  let customSizes = [];

  // 初期化
  function init() {
    // 1. localStorage からカスタムサイズリストとプレビューテキストを復元
    loadSavedData();

    // 2. 入力フォーカス発光エフェクトの登録
    initCardFocusEffects();

    // 3. 入力イベントの監視
    els.rootBase.addEventListener('input', () => {
      syncFromPx();
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

    els.pxInput.addEventListener('input', syncFromPx);
    els.remInput.addEventListener('input', syncFromRem);
    els.copyBtn.addEventListener('click', copyCodeFormat);

    // 4. カスタムサイズ追加アクション
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
          els.resetSizesBtn.textContent = pageLang === 'en' ? 'Click again to reset' : 'もう一度押すと戻します';
          showListMessage(pageLang === 'en' ? 'Click reset once more to restore the default list.' : 'リセットをもう一度押すと、早見表を初期状態に戻します。');
          return;
        }
        customSizes = [...DEFAULT_SIZES];
        safeSetStorage('pxRemCustomSizes', JSON.stringify(customSizes));
        generateTable();
        els.resetSizesBtn.dataset.armed = '';
        els.resetSizesBtn.textContent = pageLang === 'en' ? '↩ Reset' : '↩ リセット';
        showListMessage(pageLang === 'en' ? 'The reference table was reset.' : '早見表を初期状態に戻しました。');
      });
    }

    // 6. プレビューはプレーンテキストだけ保存する（HTMLを復元しない）
    if (els.previewText) {
      els.previewText.addEventListener('input', () => {
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
      .filter((item) => Number.isInteger(item) && item >= 1 && item <= 500))];
    cleaned.sort((a, b) => a - b);
    return cleaned.length > 0 ? cleaned.slice(0, 80) : [...DEFAULT_SIZES];
  }

  function showListMessage(text) {
    if (!els.listMessage) return;
    els.listMessage.hidden = !text;
    els.listMessage.textContent = text || '';
  }

  function loadSavedData() {
    const savedText = safeGetStorage('pxRemPreviewText');
    if (savedText && els.previewText) {
      els.previewText.textContent = savedText;
    }

    const savedSizes = localStorage.getItem('pxRemCustomSizes');
    if (savedSizes) {
      try {
        customSizes = sanitizeSizes(JSON.parse(savedSizes));
      } catch (e) {
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
    if (isNaN(px) || isNaN(root) || root <= 0) return 0;
    const rem = px / root;
    return Math.round(rem * 10000) / 10000; // 少数第4位まで
  }

  // REM / ROOT 計算・丸め共通ヘルパー
  function remToPx(rem, root) {
    if (isNaN(rem) || isNaN(root) || root <= 0) return 0;
    const px = rem * root;
    return Math.round(px * 100) / 100; // PXは少数第2位まで
  }

  /* =========================================
     SYNCHRONIZATION LOGIC
     ========================================= */

  // PX入力時の処理
  function syncFromPx() {
    const root = getRoot();
    const px = parseFloat(els.pxInput.value);

    if (isNaN(px)) {
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

    if (isNaN(rem)) {
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

  // プレビューの更新（箱＝このページの基準、本文＝rem 相当）
  function updatePreview(px, rem) {
    const root = getRoot();
    if (els.previewRoot) {
      const clampedRoot = Math.max(MIN_PX, Math.min(MAX_PX, root));
      els.previewRoot.style.fontSize = `${clampedRoot}px`;
    }

    if (isNaN(px) || px <= 0) {
      els.previewText.style.fontSize = '';
      els.infoPx.textContent = '- px';
      els.infoRem.textContent = '- rem';
      return;
    }

    // rem は html の font-size を見る。箱を擬似ルートにした追従デモとして em で同じ比率を見せる
    const clampedPx = Math.max(MIN_PX, Math.min(MAX_PX, px));
    const demoRem = root > 0 ? clampedPx / root : rem;
    els.previewText.style.fontSize = `${demoRem}em`;
    els.infoPx.textContent = `${px}px`;
    els.infoRem.textContent = `${rem}rem`;
  }

  // 基準値の取得（バリデーション付き）
  function getRoot() {
    let val = parseFloat(els.rootBase.value);
    if (isNaN(val) || val <= 0) val = 16;
    return val;
  }

  /* =========================================
     CUSTOM SIZE LIST MANAGEMENT
     ========================================= */

  // リリストへのサイズ追加
  function addCustomSize() {
    const pxValue = parseInt(els.customPxInput.value, 10);
    if (isNaN(pxValue) || pxValue < 1 || pxValue > 500) {
      showListMessage(pageLang === 'en' ? 'Enter a whole number from 1 to 500.' : '1pxから500pxの整数を入力してください。');
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
    safeSetStorage('pxRemCustomSizes', JSON.stringify(customSizes));
    generateTable();
    showListMessage('');
    els.customPxInput.value = '';
    els.customPxInput.focus();
  }

  // リストからのサイズ削除
  function deleteSize(px) {
    customSizes = customSizes.filter(s => s !== px);
    safeSetStorage('pxRemCustomSizes', JSON.stringify(customSizes));
    generateTable();
  }

  // 早見表の生成
  function generateTable() {
    const root = getRoot();
    els.tableBody.replaceChildren();

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
        syncFromPx();
        els.pxInput.focus();
      });
      pxCell.appendChild(pxButton);

      const remCell = document.createElement('td');
      remCell.textContent = `${rem}rem`;

      const sampleCell = document.createElement('td');
      const sample = document.createElement('span');
      sample.className = 'sample-text';
      sample.style.fontSize = `${Math.min(MAX_PX, px)}px`;
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
    
    const sizes = COPY_SIZES;
    const isWindows = navigator.userAgent.toLowerCase().includes('win');
    const newline = isWindows ? '\r\n' : '\n';
    
    let generatedText = '';

    if (format === 'css') {
      // CSS 変数形式
      generatedText = `/* Root Base: ${root}px */${newline}:root {${newline}`;
      sizes.forEach(px => {
        const rem = pxToRem(px, root);
        generatedText += `  --fs-${px}: ${rem}rem; /* ${px}px */${newline}`;
      });
      generatedText += `}`;
    } else if (format === 'scss') {
      // SCSS 変数形式
      generatedText = `// Root Base: ${root}px${newline}`;
      sizes.forEach(px => {
        const rem = pxToRem(px, root);
        generatedText += `$fs-${px}: ${rem}rem; // ${px}px${newline}`;
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
        generatedText += `.text-${px} { font-size: ${rem}rem; } /* ${px}px */${newline}`;
      });
    }

    copyText(generatedText)
      .then(() => {
        const originalLabel = els.copyBtn.textContent;
        els.copyBtn.textContent = pageLang === 'en' ? 'Copied!' : 'コピーしました';
        els.copyBtn.classList.add('is-copied');
        window.setTimeout(() => {
          els.copyBtn.textContent = originalLabel;
          els.copyBtn.classList.remove('is-copied');
        }, 1500);
      })
      .catch(() => {
        showListMessage(pageLang === 'en' ? 'Copy failed. Select the text and copy it manually.' : 'コピーに失敗しました。手動で選択してコピーしてください。');
      });
  }

  function copyText(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text);
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
