document.addEventListener('DOMContentLoaded', () => {
  /* =========================================
     CONFIG
     ========================================= */
  const CONFIG = {
    TITLE_MAX: 40,
    DESC_MAX: 80,
    MAX_IMAGE_BYTES: 10 * 1024 * 1024,
    RATIO_IDEAL: 1.91,
    RATIO_TOLERANCE_MIN: 1.8,
    RATIO_TOLERANCE_MAX: 2.0
  };

  const els = {
    ogTitle: document.getElementById('ogTitle'),
    ogDesc: document.getElementById('ogDesc'),
    siteName: document.getElementById('siteName'),
    imageInput: document.getElementById('imageInput'),
    dropZone: document.getElementById('dropZone'),
    imagePreviewContainer: document.getElementById('imagePreviewContainer'),
    imagePreviewThumb: document.getElementById('imagePreviewThumb'),
    uploadPlaceholder: document.querySelector('.upload-placeholder'),
    removeImageBtn: document.getElementById('removeImageBtn'),
    resetBtn: document.getElementById('resetBtn'),
    
    countTitle: document.getElementById('countTitle'),
    countDesc: document.getElementById('countDesc'),
    ratioWarning: document.getElementById('ratioWarning'),
    
    tabBtns: document.querySelectorAll('.tab-btn'),
    cardViews: document.querySelectorAll('.card-view'),
    
    previewImgs: document.querySelectorAll('.preview-img'),
    metaDomains: document.querySelectorAll('.meta-domain'),
    metaTitles: document.querySelectorAll('.meta-title'),
    metaDescs: document.querySelectorAll('.meta-desc'),
    
    previewThemeToggle: document.getElementById('previewThemeToggle'),
    previewCanvas: document.getElementById('previewCanvas')
  };

  // プレースホルダー画像
  const PLACEHOLDER_IMG = 'data:image/svg+xml;charset=UTF-8,%3Csvg width%3D%22600%22 height%3D%22315%22 xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox%3D%220 0 600 315%22 preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle type%3D%22text%2Fcss%22%3E%23holder_1b%20text%20%7B%20fill%3A%23AAAAAA%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A40pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg id%3D%22holder_1b%22%3E%3Crect width%3D%22600%22 height%3D%22315%22 fill%3D%22%23EEEEEE%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext x%3D%22220%22 y%3D%22170%22%3ENO IMAGE%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E';
  
  let currentImageData = PLACEHOLDER_IMG;

  function init() {
    // 1. Text Update
    [els.ogTitle, els.ogDesc, els.siteName].forEach(el => {
      el.addEventListener('input', updateText);
    });

    // 2. File Upload
    els.imageInput.addEventListener('change', (e) => {
      if(e.target.files.length) handleFile(e.target.files[0]);
    });
    
    // Drop Zone Events
    els.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      els.dropZone.style.borderColor = 'var(--c-primary)';
      els.dropZone.style.background = 'var(--c-bg)';
    });
    els.dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      els.dropZone.style.borderColor = '';
      els.dropZone.style.background = '';
    });
    els.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      els.dropZone.style.borderColor = '';
      els.dropZone.style.background = '';
      if(e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    els.dropZone.addEventListener('click', (e) => {
      if (e.target === els.imageInput) return;
      els.imageInput.click();
    });
    
    // Keyboard
    els.dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        els.imageInput.click();
      }
    });

    els.removeImageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetImage();
    });

    // 3. Tabs
    els.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        els.tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.target;
        els.cardViews.forEach(view => {
          view.classList.remove('active');
          if(view.id === `view-${target}`) view.classList.add('active');
        });
      });
    });

    // 4. Dark Mode
    els.previewThemeToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        els.previewCanvas.classList.remove('theme-light');
        els.previewCanvas.classList.add('theme-dark');
      } else {
        els.previewCanvas.classList.remove('theme-dark');
        els.previewCanvas.classList.add('theme-light');
      }
    });

    // 5. Smart Reset (Useless Standard confirm deleted for elegance!)
    els.resetBtn.addEventListener('click', () => {
      // ユーザーの入力体験を守るため、確認なしでシュッとリセットして操作ストレスを極限まで低減！
      els.ogTitle.value = '';
      els.ogDesc.value = '';
      els.siteName.value = '';
      resetImage();
      updateText();
    });
    
    updatePreviewImages();
  }

  /* =========================================
     Logic & Intelligent Aspect Crop Math
     ========================================= */

  function updateText() {
    const title = els.ogTitle.value || 'No Title';
    const desc = els.ogDesc.value || 'No description provided.';
    const domain = els.siteName.value || 'katakatalab.com';

    els.countTitle.textContent = `${els.ogTitle.value.length} / ${CONFIG.TITLE_MAX}`;
    els.countDesc.textContent = `${els.ogDesc.value.length} / ${CONFIG.DESC_MAX}`;

    if(els.ogTitle.value.length > CONFIG.TITLE_MAX) els.countTitle.classList.add('limit-over');
    else els.countTitle.classList.remove('limit-over');

    if(els.ogDesc.value.length > CONFIG.DESC_MAX) els.countDesc.classList.add('limit-over');
    else els.countDesc.classList.remove('limit-over');

    els.metaTitles.forEach(el => el.textContent = title);
    els.metaDescs.forEach(el => el.textContent = desc);
    els.metaDomains.forEach(el => el.textContent = domain);
  }

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください (JPEG, PNG, WebPなど)');
      return;
    }

    if (file.size > CONFIG.MAX_IMAGE_BYTES) {
      alert('画像サイズが大きすぎます。10MB以下の画像を選択してください。');
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      currentImageData = e.target.result;
      showImagePreview(true);
      updatePreviewImages();
      checkAspectRatio(currentImageData);
    };
    
    reader.onerror = () => {
      alert('ファイルの読み込みに失敗しました');
    };
    
    reader.readAsDataURL(file);
  }

  // アップロード画像の比率ズレを高度に計算し、見切れマスクを動的に適用するインテリジェント関数！
  function checkAspectRatio(dataUrl) {
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      
      // 1. 推奨比率(1.91:1)からの逸脱による警告判定
      if (ratio < CONFIG.RATIO_TOLERANCE_MIN || ratio > CONFIG.RATIO_TOLERANCE_MAX) {
        els.ratioWarning.style.display = 'block';
        els.ratioWarning.textContent = `画像比率は ${ratio.toFixed(2)}:1 です。横長カードはだいたい 1.91:1 で中央を残して切り抜きます。下の枠はその切り抜き後の見え方です。`;
      } else {
        els.ratioWarning.style.display = 'none';
      }

      clearTrimMasks();
    };
    
    img.onerror = () => {
      els.ratioWarning.style.display = 'none';
      clearTrimMasks();
    };
    img.src = dataUrl;
  }

  // アスペクト比の差分から見切れ範囲を弾き出すコア数学
  function applyVisualTrimMasks(ratio) {
    const targetLargeRatio = 1.91; // X Large, Facebook, LINE の共通ターゲット比率
    const targetSquareRatio = 1.0;  // X Small (正方形) のターゲット比率

    // ① 横長/縦長共通カード (1.91:1) の見切れ領域を計算
    const largeMask = calculateMaskPercentages(ratio, targetLargeRatio);
    // ② 正方形カード (1:1) の見切れ領域を計算
    const squareMask = calculateMaskPercentages(ratio, targetSquareRatio);

    // CSSカスタムプロパティを使って、各プレビュー画像ラッパーにマスク範囲を直接注入！
    applyMaskCSS('#view-twitter-large .card-image-wrapper', largeMask);
    applyMaskCSS('#view-facebook .card-image-wrapper', largeMask);
    applyMaskCSS('#view-line .card-image-wrapper', largeMask);
    
    applyMaskCSS('#view-twitter-summary .card-image-wrapper', squareMask);
  }

  // 比率の数学的差分から上下左右のトリミングパーセンテージを弾き出すヘルパー
  function calculateMaskPercentages(imgRatio, targetRatio) {
    let top = 0, bottom = 0, left = 0, right = 0;

    if (imgRatio > targetRatio) {
      // 画像が推奨比率より横に広い場合 => 左右がカットされる
      const visibleRatio = targetRatio / imgRatio;
      const cutPercent = (1 - visibleRatio) * 100;
      left = cutPercent / 2;
      right = cutPercent / 2;
    } else if (imgRatio < targetRatio) {
      // 画像が推奨比率より縦に長い場合 => 上下がカットされる
      const visibleRatio = imgRatio / targetRatio;
      const cutPercent = (1 - visibleRatio) * 100;
      top = cutPercent / 2;
      bottom = cutPercent / 2;
    }

    return { top, bottom, left, right };
  }

  function applyMaskCSS(selector, mask) {
    const wrapper = document.querySelector(selector);
    if (!wrapper) return;

    wrapper.style.setProperty('--mask-top', `${mask.top.toFixed(4)}%`);
    wrapper.style.setProperty('--mask-bottom', `${mask.bottom.toFixed(4)}%`);
    wrapper.style.setProperty('--mask-left', `${mask.left.toFixed(4)}%`);
    wrapper.style.setProperty('--mask-right', `${mask.right.toFixed(4)}%`);
  }

  function clearTrimMasks() {
    const emptyMask = { top: 0, bottom: 0, left: 0, right: 0 };
    applyMaskCSS('#view-twitter-large .card-image-wrapper', emptyMask);
    applyMaskCSS('#view-facebook .card-image-wrapper', emptyMask);
    applyMaskCSS('#view-line .card-image-wrapper', emptyMask);
    applyMaskCSS('#view-twitter-summary .card-image-wrapper', emptyMask);
  }

  function resetImage() {
    els.imageInput.value = '';
    currentImageData = PLACEHOLDER_IMG;
    showImagePreview(false);
    updatePreviewImages();
    els.ratioWarning.style.display = 'none';
    clearTrimMasks();
  }

  function showImagePreview(hasImage) {
    if (hasImage) {
      els.imagePreviewThumb.src = currentImageData;
      els.imagePreviewContainer.style.display = 'flex';
      els.uploadPlaceholder.style.display = 'none';
    } else {
      els.imagePreviewContainer.style.display = 'none';
      els.uploadPlaceholder.style.display = 'block';
    }
  }

  function updatePreviewImages() {
    els.previewImgs.forEach(img => {
      img.src = currentImageData;
    });
  }

  // 入力データの保護 (beforeunload)
  window.addEventListener('beforeunload', (e) => {
    const hasTitle = els.ogTitle.value.trim() !== '';
    const hasDesc = els.ogDesc.value.trim() !== '';
    const hasImage = currentImageData !== PLACEHOLDER_IMG;
    
    if (hasTitle || hasDesc || hasImage) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  init();
});
