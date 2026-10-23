document.addEventListener('DOMContentLoaded', () => {
  /* =========================================
     CONFIG & STATE
     ========================================= */
  const CONFIG = {
    MAX_CHARS: 50000,
    SCROLL_SYNC_TIMEOUT: 50,
    MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024, // 安全のため2MB以上のファイルを制限（ブラウザフリーズ防止）
    ALLOWED_EXTENSIONS: ['txt', 'md', 'js', 'css', 'html', 'json', 'xml', 'csv', 'yaml', 'yml']
  };

  const els = {
    textOriginal: document.getElementById('textOriginal'),
    textNew: document.getElementById('textNew'),
    charCountOriginal: document.getElementById('charCountOriginal'),
    charCountNew: document.getElementById('charCountNew'),
    compareBtn: document.getElementById('compareBtn'),
    clearBtn: document.getElementById('clearBtn'),
    editBtn: document.getElementById('editBtn'),
    swapBtn: document.getElementById('swapBtn'),
    pasteBtns: document.querySelectorAll('.btn-paste'),
    
    inputSection: document.getElementById('inputSection'),
    resultSection: document.getElementById('resultSection'),
    viewToggle: document.getElementById('viewToggle'),
    loading: document.getElementById('loadingOverlay'),
    alertBox: document.getElementById('alertBox'),
    statusMessage: document.getElementById('statusMessage'),
    
    diffOriginal: document.getElementById('diffOriginal'),
    diffNew: document.getElementById('diffNew'),
    diffUnified: document.getElementById('diffUnified'),
    diffViewSplit: document.getElementById('diffViewSplit'),
    diffViewUnified: document.getElementById('diffViewUnified'),
    
    modeRadios: document.querySelectorAll('input[name="diffMode"]'),
    viewRadios: document.querySelectorAll('input[name="viewMode"]'),

    // Advanced Usability Elements
    btnPrevDiff: document.getElementById('btnPrevDiff'),
    btnNextDiff: document.getElementById('btnNextDiff'),
    btnCopyDiff: document.getElementById('btnCopyDiff'),
    diffNav: document.getElementById('diffNav'),
    diffStat: document.getElementById('diffStat'),
    fileInputs: document.querySelectorAll('.file-input'),

    // File info success indicators
    fileInfoOriginal: document.getElementById('fileInfoOriginal'),
    fileInfoNew: document.getElementById('fileInfoNew')
  };

  const isEnglish = document.documentElement.lang === 'en';
  // State Variables
  const pasteReads = new WeakMap();
  let copyGeneration = 0;
  let comparisonGeneration = 0, compareTimer = null, lastComparison = null, comparisonDirty = true;
  const fileReads = new WeakMap();
  function cancelFileRead(area) {
    pasteReads.delete(area);
    const pending = fileReads.get(area);
    fileReads.delete(area);
    if (pending && typeof pending.abort === 'function') pending.abort();
  }
  function cancelAllFileReads() {
    [els.textOriginal, els.textNew].forEach(cancelFileRead);
  }
  let clearBackup = null;
  let toastTimeoutId = null;
  let toastProgressIntervalId = null;
  const undoToast = document.getElementById('undoToast');
  const undoBtn = document.getElementById('undoBtn');
  
  // Performance Optimization Caches
  let jumpTargets = [];
  let currentJumpIndex = -1;
  let unifiedLinesCache = []; // コピー用のプレーンテキスト行キャッシュ（DOM走査の負荷排除）
  let isSyncLocked = false;   // ジャンプ中のスクロール同期競合保護ロック

  /* =========================================
     INIT
     ========================================= */
  function init() {
    // 1. 文字入力監視 & ショートカットキー
    [els.textOriginal, els.textNew].forEach(area => {
      area.addEventListener('input', () => { cancelFileRead(area); updateCharCounts(); });
      area.addEventListener('keydown', handleKeyInput);
      
      // Drag & Drop Setup
      initDragAndDrop(area);
    });

    // 2. ファイル入力監視
    els.fileInputs.forEach(input => {
      input.addEventListener('change', handleFileSelect);
    });

    // 3. ボタンアクション
    els.compareBtn.addEventListener('click', () => {
      clearTimeout(compareTimer);
      const generation = ++comparisonGeneration;
      comparisonDirty = true;
      els.btnCopyDiff.disabled = true;
      els.loading.style.display = 'flex';
      compareTimer = setTimeout(() => { if (generation === comparisonGeneration) runCompare(); }, 50);
    });
    
    // Undo付きスマートクリア
    els.clearBtn.addEventListener('click', () => {
      cancelAllFileReads();
      const origVal = els.textOriginal.value;
      const newVal = els.textNew.value;
      
      if (!origVal && !newVal) return;
      
      clearBackup = { original: origVal, new: newVal };
      
      els.textOriginal.value = '';
      els.textNew.value = '';
      updateCharCounts();
      toggleSection('input');
      hideAlert();
      
      showUndoToast();
    });

    els.editBtn.addEventListener('click', () => { invalidateComparison(); toggleSection('input'); });

    // Swap機能
    els.swapBtn.addEventListener('click', () => {
      cancelAllFileReads();
      const temp = els.textOriginal.value;
      els.textOriginal.value = els.textNew.value;
      els.textNew.value = temp;
      updateCharCounts();
      
      const icon = els.swapBtn.querySelector('.icon-swap');
      if(icon) {
        icon.style.transition = 'transform 0.3s';
        icon.style.transform = 'rotate(180deg)';
        setTimeout(() => icon.style.transform = '', 300);
      }
    });

    // View切り替え（ジャンプターゲットのインテリジェント継承）
    els.viewRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        switchView(e.target.value);
        updateJumpTargets();
      });
    });

    els.modeRadios.forEach((radio) => {
      radio.addEventListener('change', invalidateComparison);
    });

    // Paste機能
    els.pasteBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetId = btn.dataset.target === 'original' ? 'textOriginal' : 'textNew';
        const area = document.getElementById(targetId);
        cancelFileRead(area);
        const token = {};
        pasteReads.set(area, token);
        try {
          const text = await navigator.clipboard.readText();
          if (pasteReads.get(area) !== token) return;
          cancelFileRead(area);
          area.value = text;
          updateCharCounts();
          area.focus();
        } catch (err) {
          if (pasteReads.get(area) !== token) return;
          const isEn = document.documentElement.lang === 'en';
          showAlert(isEn
            ? 'Clipboard permission is missing. Paste manually.'
            : 'クリップボードの読み取り権限がありません。手動で貼り付けてください。');
        }
      });
    });

    // Smart Jump ボタン
    els.btnPrevDiff.addEventListener('click', () => scrollDiff(-1));
    els.btnNextDiff.addEventListener('click', () => scrollDiff(1));

    // Unified コピーボタン
    els.btnCopyDiff.addEventListener('click', copyUnifiedDiff);
    document.getElementById('copyFormat')?.addEventListener('change', resetCopyStatus);

    // Sync Scroll
    initScrollSync(els.diffOriginal, els.diffNew);
  }

  /* =========================================
     DRAG & DROP & FILE READERS (Robust Validations)
     ========================================= */

  function initDragAndDrop(textarea) {
    ['dragenter', 'dragover'].forEach(eventName => {
      textarea.addEventListener(eventName, (e) => {
        e.preventDefault();
        textarea.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      textarea.addEventListener(eventName, (e) => {
        e.preventDefault();
        textarea.classList.remove('drag-over');
      }, false);
    });

    textarea.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        if (validateTextFile(files[0])) {
          readFileToTextarea(files[0], textarea);
        }
      }
    }, false);
  }

  function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      const targetId = e.target.dataset.target === 'original' ? 'textOriginal' : 'textNew';
      const textarea = document.getElementById(targetId);
      if (validateTextFile(files[0])) {
        readFileToTextarea(files[0], textarea);
      }
      e.target.value = ''; // 選択値リセット
    }
  }

  // 強固なファイル検証（クラッシュと文字化けの徹底防御）
  function validateTextFile(file) {
    if (file.size > CONFIG.MAX_FILE_SIZE_BYTES) {
      showAlert(isEnglish ? 'File is too large. The limit is 2 MB.' : `⚠️ ファイルサイズが大きすぎます。読み込み上限は2MBです。（ドロップされたファイル: ${(file.size / (1024 * 1024)).toFixed(2)}MB）`);
      return false;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    const isTextMime = file.type.startsWith('text/') || 
                       file.type === 'application/json' || 
                       file.type === 'application/javascript' ||
                       file.type === 'application/xml';
    const isAllowedExt = CONFIG.ALLOWED_EXTENSIONS.includes(ext);

    if (!isTextMime && !isAllowedExt) {
      showAlert(isEnglish ? `Use a text file (${CONFIG.ALLOWED_EXTENSIONS.join(', ')}).` : `⚠️ テキストファイル以外のファイルは読み込めません。（サポート拡張子: ${CONFIG.ALLOWED_EXTENSIONS.join(', ')}）`);
      return false;
    }

    hideAlert();
    return true;
  }

  function readFileToTextarea(file, textarea) {
    cancelFileRead(textarea);
    const reader = new FileReader();
    fileReads.set(textarea, reader);
    reader.onload = (event) => {
      if (fileReads.get(textarea) !== reader) return;
      fileReads.delete(textarea);
      textarea.value = event.target.result;
      updateCharCounts();
      textarea.focus();

      // 1. 成功時のグリーン枠フラッシュエフェクトを発火
      textarea.classList.add('flash-success');
      setTimeout(() => {
        textarea.classList.remove('flash-success');
      }, 1200);

      // 2. 読み込み成功バッジをフワッと表示する親切設計（安心フィードバック）
      const isOriginal = textarea.id === 'textOriginal';
      const badge = isOriginal ? els.fileInfoOriginal : els.fileInfoNew;
      if (badge) {
        // 表示名が長い場合は省略
        const displayName = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
        badge.textContent = `✓ ${displayName} ${isEnglish ? 'loaded' : '読込済'}`;
        badge.style.display = 'inline-flex';
        badge.style.opacity = '1';
        
        clearTimeout(textarea.fileInfoTimeout);
        textarea.fileInfoTimeout = setTimeout(() => {
          badge.style.transition = 'opacity 0.3s ease-out';
          badge.style.opacity = '0';
          setTimeout(() => {
            badge.style.display = 'none';
            badge.style.opacity = '';
            badge.style.transition = '';
          }, 300);
        }, 3000);
      }
    };
    reader.onerror = () => {
      if (fileReads.get(textarea) !== reader) return;
      fileReads.delete(textarea);
      showAlert(isEnglish ? 'Could not read the file.' : 'ファイルの読み込み中にエラーが発生しました。');
    };
    reader.readAsText(file, 'UTF-8');
  }

  /* =========================================
     CORE KEY & CHAR LOGIC
     ========================================= */

  function handleKeyInput(e) {
    // Tab and Shift+Tab retain native focus navigation without editing text.
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      els.compareBtn.click();
    }
  }

  function resetCopyStatus() {
    ++copyGeneration;
    els.btnCopyDiff.textContent = isEnglish ? 'Copy selected text' : '選んだ内容をコピー';
    els.btnCopyDiff.style.borderColor = '';
    els.btnCopyDiff.style.color = '';
    const manual = document.getElementById('manualCopyDiff');
    if (manual) { manual.hidden = true; manual.value = ''; }
  }

  function invalidateComparison() {
    resetCopyStatus();
    comparisonGeneration++;
    clearTimeout(compareTimer);
    comparisonDirty = true;
    els.loading.style.display = 'none';
    els.btnCopyDiff.disabled = true;
    els.btnPrevDiff.disabled = true;
    els.btnNextDiff.disabled = true;
    const status = document.getElementById('comparisonStatus');
    if (status) status.textContent = lastComparison ? (isEnglish ? 'Inputs or method changed. Compare again.' : '入力・方式が変わりました。比較し直してください。') : '';
    const manual = document.getElementById('manualCopyDiff');
    if (manual) { manual.hidden = true; manual.value = ''; }
  }

  function updateCharCounts() {
    invalidateComparison();
    const lenOrig = els.textOriginal.value.length;
    const lenNew = els.textNew.value.length;
    els.charCountOriginal.textContent = `${lenOrig}${isEnglish ? ' chars' : '文字'}`;
    els.charCountNew.textContent = `${lenNew}${isEnglish ? ' chars' : '文字'}`;

    if (lenOrig > CONFIG.MAX_CHARS || lenNew > CONFIG.MAX_CHARS) {
      els.charCountOriginal.style.color = '#ef4444';
      els.charCountNew.style.color = '#ef4444';
      showAlert(isEnglish ? `Text exceeds ${CONFIG.MAX_CHARS} characters and may be slow.` : `⚠️ 文字数が多すぎます（推奨: ${CONFIG.MAX_CHARS}文字以内）。動作が遅くなる可能性があります。`);
    } else {
      els.charCountOriginal.style.color = '';
      els.charCountNew.style.color = '';
      hideAlert();
    }
  }

  function getMode() {
    let mode = 'lines';
    els.modeRadios.forEach(r => { if(r.checked) mode = r.value; });
    return mode;
  }

  function runCompare() {
    const generation = ++comparisonGeneration;
    clearTimeout(compareTimer);
    comparisonDirty = true;
    els.btnCopyDiff.disabled = true;
    hideAlert();
    const original = els.textOriginal.value;
    const newTxt = els.textNew.value;
    const mode = getMode();

    if (typeof Diff === 'undefined') {
      els.loading.style.display = 'none';
      showAlert(isEnglish ? 'Could not load the comparison library. Check your connection and reload.' : '差分ライブラリの読み込みに失敗しました。通信状況を確認して再読み込みしてください。');
      return;
    }

    if (!original && !newTxt) {
      els.loading.style.display = 'none';
      showAlert(isEnglish ? 'Enter text to compare.' : '比較するテキストを入力してください。');
      return;
    }

    if (original === newTxt) {
      els.statusMessage.style.display = 'inline-flex';
    } else {
      els.statusMessage.style.display = 'none';
    }

    try {
      let diff;
      if (mode === 'lines') {
        diff = Diff.diffLines(original, newTxt);
      } else {
        // jsdiff 5 diffChars splits UTF-16 surrogate pairs. Compare code points,
        // without Unicode normalization or changes to the user's original text.
        diff = Diff.diffArrays(Array.from(original), Array.from(newTxt))
          .map(part => ({ ...part, value: part.value.join('') }));
      }

      renderSplitView(diff, mode);
      renderUnifiedView(diff);
      // Copy is derived from raw line differences, never reconstructed from HTML.
      unifiedLinesCache = rawDiffLines(Diff.diffLines(original, newTxt));
      lastComparison = { original, newText: newTxt, mode };
      comparisonDirty = false;
      els.btnCopyDiff.disabled = false;
      els.btnPrevDiff.disabled = false;
      els.btnNextDiff.disabled = false;
      const status = document.getElementById('comparisonStatus');
      if (status) status.textContent = '';
      els.resultSection.classList.toggle('code-mode', mode === 'lines');
      toggleSection('result');
      
      calculateDiffStats(diff);

      setTimeout(() => {
        if (generation !== comparisonGeneration || comparisonDirty) return;
        // Stickyヘッダーの高さ分だけ上にスクロールマージンを設ける（ヘッダーと被るのを防止）
        const offset = 70;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = els.resultSection.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }, 100);

    } catch (e) {
      console.error(e);
      showAlert(isEnglish ? 'Comparison failed. The text may be too complex or too long.' : 'エラーが発生しました。テキストが複雑すぎるか、長すぎます。');
    } finally {
      els.loading.style.display = 'none';
    }
  }

  /* =========================================
     RENDERERS & STATS
     ========================================= */

  function wrapDiffPart(value, tag) {
    const lines = String(value).split('\n');
    return lines.map((line, index) => {
      const hasNewline = index < lines.length - 1;
      if (!hasNewline && line === '') return '';
      const escaped = escapeHtml(line);
      const content = line || !tag ? `<${tag || 'span'}>${escaped}</${tag || 'span'}>` : '';
      const newline = hasNewline ? (tag ? `<${tag} class="is-newline"></${tag}>\n` : '\n') : '';
      return content + newline;
    }).join('');
  }

  function splitRawLines(text) {
    if (!text) return [];
    const lines = text.split('\n');
    if (lines.at(-1) === '') lines.pop();
    return lines;
  }
  function rawDiffLines(diff) {
    return diff.flatMap(part => splitRawLines(part.value).map(line => `${part.added ? '+' : part.removed ? '-' : ' '} ${line.replace(/\r$/, '')}`));
  }
  function alignedRows(diff) {
    const rows = []; let left = [], right = [];
    const flush = () => {
      for (let i=0;i<Math.max(left.length,right.length);i++) rows.push({left:left[i] ?? null,right:right[i] ?? null,changed:true});
      left=[]; right=[];
    };
    for (const part of diff) {
      if (part.removed) left.push(...splitRawLines(part.value));
      else if (part.added) right.push(...splitRawLines(part.value));
      else { flush(); for (const line of splitRawLines(part.value)) rows.push({left:line,right:line,changed:false}); }
    }
    flush(); return rows;
  }
  function renderAlignedLines(diff) {
    const rows = alignedRows(diff); let leftNumber=0,rightNumber=0;
    const render = (row, side) => {
      const value = row[side];
      if (value === null) return '<div class="diff-line diff-placeholder" aria-hidden="true"><div class="diff-line-num"></div><div class="diff-line-marker"></div><div class="diff-line-content">&nbsp;</div></div>';
      const number = side === 'left' ? ++leftNumber : ++rightNumber;
      const tag = row.changed ? (side === 'left' ? 'del' : 'ins') : 'span';
      const kind = row.changed ? (side === 'left' ? 'del' : 'add') : '';
      const marker = row.changed ? (side === 'left' ? '-' : '+') : ' ';
      return `<div class="diff-line ${kind}"><div class="diff-line-num">${number}</div><div class="diff-line-marker">${marker}</div><div class="diff-line-content"><${tag}>${escapeHtml(value) || '&nbsp;'}</${tag}></div></div>`;
    };
    els.diffOriginal.innerHTML = rows.map(row=>render(row,'left')).join('');
    els.diffNew.innerHTML = rows.map(row=>render(row,'right')).join('');
  }
  function renderSplitView(diff, mode = getMode()) {
    if (mode === 'lines') { renderAlignedLines(diff); return; }
    let htmlOrig = '';
    let htmlNew = '';

    diff.forEach(part => {
      if (part.added) {
        htmlNew += wrapDiffPart(part.value, 'ins');
      } else if (part.removed) {
        htmlOrig += wrapDiffPart(part.value, 'del');
      } else {
        htmlOrig += wrapDiffPart(part.value, '');
        htmlNew += wrapDiffPart(part.value, '');
      }
    });

    els.diffOriginal.innerHTML = buildLineBasedHtml(htmlOrig, 'del');
    els.diffNew.innerHTML = buildLineBasedHtml(htmlNew, 'add');
  }

  function renderUnifiedView(diff) {
    if (getMode() === 'lines') {
      unifiedLinesCache = rawDiffLines(diff);
      let oldNumber = 0, newNumber = 0;
      els.diffUnified.innerHTML = diff.flatMap(part => splitRawLines(part.value).map(value => {
        const tag = part.added ? 'ins' : part.removed ? 'del' : 'span';
        const kind = part.added ? 'add' : part.removed ? 'del' : '';
        const marker = part.added ? '+' : part.removed ? '-' : ' ';
        const number = part.added ? `  ${++newNumber}` : part.removed ? `${++oldNumber}` : `${++oldNumber}   ${++newNumber}`;
        return `<div class="diff-line ${kind}"><div class="diff-line-num" style="width: 5.5em; text-align: center;">${number}</div><div class="diff-line-marker">${marker}</div><div class="diff-line-content"><${tag}>${escapeHtml(value)}</${tag}></div></div>`;
      })).join('');
      return;
    }
    let html = '';
    diff.forEach(part => {
      if (part.added) {
        html += wrapDiffPart(part.value, 'ins');
      } else if (part.removed) {
        html += wrapDiffPart(part.value, 'del');
      } else {
        html += wrapDiffPart(part.value, '');
      }
    });

    const lines = html.split(/\r?\n/);
    let result = '';
    let lineNumOrig = 1;
    let lineNumNew = 1;
    const cacheLines = []; // コピー用のプレーンテキスト行構築バッファ

    lines.forEach((line, index) => {
      if (index === lines.length - 1 && line === '') return;

      let currentClass = 'diff-line';
      let marker = ' ';
      const hasDel = /<del(?:\s|>)/.test(line);
      const hasIns = /<ins(?:\s|>)/.test(line);
      let numDisplay = '';

      if (hasDel && hasIns) {
        currentClass += ' mod';
        marker = '≠';
        numDisplay = `${lineNumOrig} ⇄ ${lineNumNew}`;
        lineNumOrig++;
        lineNumNew++;
      } else if (hasDel) {
        currentClass += ' del';
        marker = '-';
        numDisplay = `${lineNumOrig}`;
        lineNumOrig++;
      } else if (hasIns) {
        currentClass += ' add';
        marker = '+';
        numDisplay = `  ${lineNumNew}`;
        lineNumNew++;
      } else {
        numDisplay = `${lineNumOrig}   ${lineNumNew}`;
        lineNumOrig++;
        lineNumNew++;
      }

      // エスケープ除去＆プレーンテキスト抽出で行をキャッシュ保存
      const textContent = line.replace(/<[^>]*>/g, '')
                              .replace(/&lt;/g, '<')
                              .replace(/&gt;/g, '>')
                              .replace(/&quot;/g, '"')
                              .replace(/&#039;/g, "'")
                              .replace(/&amp;/g, '&');
      cacheLines.push(`${marker} ${textContent}`);

      result += `
        <div class="${currentClass}">
          <div class="diff-line-num" style="width: 5.5em; text-align: center;">${numDisplay}</div>
          <div class="diff-line-marker">${marker}</div>
          <div class="diff-line-content">${line}</div>
        </div>
      `;
    });

    els.diffUnified.innerHTML = result;
    
    // コピー用のプレーンテキストキャッシュの構築（超高速化）
    unifiedLinesCache = cacheLines;
  }

  function buildLineBasedHtml(rawHtml, changeClass) {
    if (!rawHtml) return '';
    const lines = rawHtml.split(/\r?\n/);
    let result = '';

    lines.forEach((line, index) => {
      if (index === lines.length - 1 && line === '') return;

      const lineNum = index + 1;
      let isChanged = false;
      let currentMarker = ' ';
      let currentClass = 'diff-line';

      if (changeClass === 'del' && (/<del(?:\s|>)/.test(line))) {
        isChanged = true;
        currentClass += ' del';
        currentMarker = '-';
      } else if (changeClass === 'add' && (/<ins(?:\s|>)/.test(line))) {
        isChanged = true;
        currentClass += ' add';
        currentMarker = '+';
      }

      result += `
        <div class="${currentClass}">
          <div class="diff-line-num">${lineNum}</div>
          <div class="diff-line-marker">${currentMarker}</div>
          <div class="diff-line-content">${line}</div>
        </div>
      `;
    });

    return result;
  }

  function calculateDiffStats(diff) {
    let addCount = 0;
    let delCount = 0;

    diff.forEach(part => {
      if (part.added) addCount++;
      if (part.removed) delCount++;
    });

    if ((addCount > 0 || delCount > 0) && els.textOriginal.value !== els.textNew.value) {
      els.diffNav.style.display = 'flex';
      els.diffStat.innerHTML = `
        <span class="del-count">${isEnglish ? 'Removed: ' : '削除: '}${delCount}${isEnglish ? ' regions' : '箇所'}</span>
        <span class="add-count">${isEnglish ? 'Added: ' : '追加: '}${addCount}${isEnglish ? ' regions' : '箇所'}</span>
      `;
      updateJumpTargets();
    } else {
      els.diffNav.style.display = 'none';
      jumpTargets = [];
      currentJumpIndex = -1;
    }
  }

  /* =========================================
     SMART JUMP & COPY TOOLS (Performance Caching)
     ========================================= */

  function updateJumpTargets() {
    const isSplit = (document.querySelector('input[name="viewMode"]:checked').value === 'split');
    
    // 直前のジャンプ先要素のテキスト内容を記憶
    const prevTarget = jumpTargets[currentJumpIndex] || null;
    let prevText = '';
    if (prevTarget) {
      prevText = prevTarget.textContent;
    }

    jumpTargets = [];
    currentJumpIndex = -1;

    if (isSplit) {
      const origDels = els.diffOriginal.querySelectorAll('del');
      const newInss = els.diffNew.querySelectorAll('ins');
      
      const origList = Array.from(origDels);
      const newList = Array.from(newInss);
      
      const maxLen = Math.max(origList.length, newList.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < origList.length) jumpTargets.push(origList[i]);
        if (i < newList.length) jumpTargets.push(newList[i]);
      }
    } else {
      const inssAndDels = els.diffUnified.querySelectorAll('ins, del');
      jumpTargets = Array.from(inssAndDels);
    }

    // インテリジェントジャンプ位置継承ロジック
    if (prevTarget && jumpTargets.length > 0) {
      const matchedIdx = jumpTargets.findIndex(el => el.textContent === prevText);
      if (matchedIdx !== -1) {
        currentJumpIndex = matchedIdx;
      }
    }
  }

  function scrollDiff(direction) {
    if (comparisonDirty || jumpTargets.length === 0) return;

    currentJumpIndex += direction;
    if (currentJumpIndex >= jumpTargets.length) {
      currentJumpIndex = 0;
    } else if (currentJumpIndex < 0) {
      currentJumpIndex = jumpTargets.length - 1;
    }

    const target = jumpTargets[currentJumpIndex];
    if (target) {
      // スムーズジャンプ中の同期スクロール競合を完全ロック保護！
      isSyncLocked = true;

      // ジャンプ先ターゲットを画面中央にスクロール
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // 1. 親の行要素 (.diff-line) を特定し、面全体をふわっとパルス発光（超絶視認性）
      const parentLine = target.closest('.diff-line');
      if (parentLine) {
        parentLine.classList.add('pulse-highlight');
        setTimeout(() => {
          parentLine.classList.remove('pulse-highlight');
        }, 1000);
      }

      // 2. 文字自体のアウトライン強調（二重の強調）
      target.style.transition = 'outline 0.2s ease';
      target.style.outline = '3px solid var(--c-primary)';
      target.style.outlineOffset = '2px';
      
      setTimeout(() => {
        target.style.outline = 'none';
        isSyncLocked = false; // スムーズスクロール完了後に安全にロック解除
      }, 550);
    }
  }

  // OS自動判別によるインテリジェントコピー（WindowsならCRLF、それ以外はLF）
  function copyUnifiedDiff() {
    if (!lastComparison || comparisonDirty) return;
    const generation = comparisonGeneration;
    const copyTask = ++copyGeneration;
    const isCurrent = () => generation === comparisonGeneration && !comparisonDirty && copyTask === copyGeneration;

    const isWindows = navigator.userAgent.toLowerCase().includes('win');
    const newline = isWindows ? '\r\n' : '\n';
    const format = document.getElementById('copyFormat')?.value || 'diff';
    const copyText = format === 'new' ? lastComparison.newText : unifiedLinesCache.join(newline) + (unifiedLinesCache.length ? newline : '');
    const manual = document.getElementById('manualCopyDiff');
    if (manual) { manual.hidden = true; manual.value = ''; }

    const doCopy = (text) => {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          return Promise.resolve(navigator.clipboard.writeText(text)).catch(() => {
            if (!isCurrent()) throw new Error('stale copy');
            return fallbackCopy(text);
          });
        } catch (_) { return fallbackCopy(text); }
      }
      return fallbackCopy(text);
    };

    const fallbackCopy = (text) => {
      return new Promise((resolve, reject) => {
        if (!isCurrent()) { reject(new Error('stale copy')); return; }
        let ta;
        const previousFocus = document.activeElement;
        try {
          ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand('copy');
          if (ok) resolve(); else reject(new Error('copy failed'));
        } catch (e) { reject(e); } finally {
          if (ta) ta.remove();
          if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
        }
      });
    };

    doCopy(copyText).then(() => {
      if (!isCurrent()) return;
      els.btnCopyDiff.textContent = isEnglish ? 'Copied!' : 'コピーしました';
      els.btnCopyDiff.style.borderColor = '#16a34a';
      els.btnCopyDiff.style.color = '#16a34a';
      
      setTimeout(() => {
        if (!isCurrent()) return;
        els.btnCopyDiff.textContent = isEnglish ? 'Copy selected text' : '選んだ内容をコピー';
        els.btnCopyDiff.style.borderColor = '';
        els.btnCopyDiff.style.color = '';
      }, 1500);
    }).catch(err => {
      if (!isCurrent()) return;
      if (manual) { manual.value = copyText; manual.hidden = false; manual.focus(); manual.select(); }
      showAlert(isEnglish ? 'Copy failed. Select the text below and copy manually.' : 'コピーに失敗しました。下のテキストを選択して手動でコピーしてください。');
    });
  }

  /* =========================================
     UI & SYNC SCROLL (Collision Protection)
     ========================================= */

  function initScrollSync(el1, el2) {
    let activeEl = null;

    const sync = (source, target) => {
      if (isSyncLocked) return; // ジャンプ動作中は同期イベントをバイパスしてガタつきを完全に抑止
      if (activeEl && activeEl !== source) return;
      activeEl = source;

      target.scrollTop = source.scrollTop;
      target.scrollLeft = source.scrollLeft;

      clearTimeout(source.syncTimeout);
      source.syncTimeout = setTimeout(() => {
        activeEl = null;
      }, CONFIG.SCROLL_SYNC_TIMEOUT);
    };

    el1.addEventListener('scroll', () => sync(el1, el2), { passive: true });
    el2.addEventListener('scroll', () => sync(el2, el1), { passive: true });
  }

  function toggleSection(sec) {
    if (sec === 'result') {
      els.inputSection.style.display = 'grid';
      els.resultSection.style.display = 'block';
      els.compareBtn.style.display = 'flex';
      els.viewToggle.style.display = 'flex';
      els.swapBtn.style.display = 'inline-flex';
      
      const currentView = document.querySelector('input[name="viewMode"]:checked').value;
      switchView(currentView);
    } else {
      els.inputSection.style.display = 'grid';
      els.resultSection.style.display = 'none';
      els.compareBtn.style.display = 'flex';
      els.viewToggle.style.display = 'none';
      els.swapBtn.style.display = 'inline-flex'; 
      els.diffNav.style.display = 'none'; 
    }
  }

  function switchView(mode) {
    if (mode === 'split') {
      els.diffViewSplit.style.display = 'grid';
      els.diffViewUnified.style.display = 'none';
      els.diffOriginal.scrollTop = 0;
      els.diffNew.scrollTop = 0;
    } else {
      els.diffViewSplit.style.display = 'none';
      els.diffViewUnified.style.display = 'flex';
    }

    els.btnCopyDiff.style.display = lastComparison ? 'inline-flex' : 'none';

  }

  function showAlert(msg) {
    els.alertBox.textContent = msg;
    els.alertBox.style.display = 'block';
  }

  function hideAlert() {
    els.alertBox.style.display = 'none';
  }

  function showUndoToast() {
    if (!undoToast) return;

    clearTimeout(toastTimeoutId);
    clearInterval(toastProgressIntervalId);

    undoToast.style.display = 'block';
    undoToast.offsetHeight; // Reflow
    undoToast.classList.add('show');

    const progressBar = undoToast.querySelector('.undo-progress');
    let timeLeft = 5000;
    const totalTime = 5000;

    if (progressBar) {
      progressBar.style.transform = 'scaleX(1)';
    }

    const intervalTick = 50;
    toastProgressIntervalId = setInterval(() => {
      timeLeft -= intervalTick;
      if (timeLeft <= 0) {
        clearInterval(toastProgressIntervalId);
        hideUndoToast();
      } else {
        const percent = timeLeft / totalTime;
        if (progressBar) {
          progressBar.style.transform = `scaleX(${percent})`;
        }
      }
    }, intervalTick);

    undoBtn.onclick = () => {
      cancelAllFileReads();
      if (clearBackup) {
        els.textOriginal.value = clearBackup.original;
        els.textNew.value = clearBackup.new;
        updateCharCounts();
        clearBackup = null;
      }
      clearInterval(toastProgressIntervalId);
      hideUndoToast();
    };
  }

  function hideUndoToast() {
    if (!undoToast) return;
    undoToast.classList.remove('show');
    setTimeout(() => {
      if (!undoToast.classList.contains('show')) {
        undoToast.style.display = 'none';
      }
    }, 400);
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 入力データの保護 (beforeunload)
  window.addEventListener('beforeunload', (e) => {
    const hasOrig = els.textOriginal.value.trim() !== '';
    const hasNew = els.textNew.value.trim() !== '';
    if (hasOrig || hasNew) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  init();
});
