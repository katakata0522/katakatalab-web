document.addEventListener('DOMContentLoaded', () => {
  /* =========================================
     CONFIG
     ========================================= */
  const isEnglish = (document.documentElement?.lang || '').toLowerCase().startsWith('en');
  const t = (ja, en) => isEnglish ? en : ja;
  const CONFIG = {
    TITLE_MAX: 40,
    DESC_MAX: 80,
    MAX_IMAGE_BYTES: 10 * 1024 * 1024,
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
  let imageGeneration = 0;
  let imagePending = false;
  function setImagePending(pending) {
    imagePending = pending;
    els.dropZone.setAttribute('aria-busy', String(pending));
    const status = document.getElementById('imageLoadStatus');
    if (status) status.textContent = pending ? t('画像を確認中です。確認が終わるまで直前のプレビューを表示します。', 'Checking the image. The previous preview remains until it is ready.') : '';
  }

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
      if (e.target === els.imageInput || els.removeImageBtn.contains(e.target)) return;
      els.imageInput.click();
    });
    
    // Keyboard
    els.dropZone.addEventListener('keydown', (e) => {
      if (e.target === els.dropZone && (e.key === 'Enter' || e.key === ' ')) {
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
        els.tabBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
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
    
    els.tabBtns.forEach(btn => btn.setAttribute('aria-pressed', String(btn.classList.contains('active'))));
    updateText();
    updatePreviewImages();
  }

  /* =========================================
     Text and image preview logic
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
    // Every new selection supersedes older asynchronous work, including invalid files.
    const generation = ++imageGeneration;
    setImagePending(false);
    els.imageInput.value = '';
    if (!file.type.startsWith('image/')) {
      alert(t('画像ファイルを選択してください (JPEG, PNG, WebPなど)', 'Choose an image file (JPEG, PNG, WebP, etc.).'));
      return;
    }
    if (file.size > CONFIG.MAX_IMAGE_BYTES) {
      alert(t('画像サイズが大きすぎます。10MiB以下の画像を選択してください。', 'Choose an image of 10 MiB or less.'));
      return;
    }
    setImagePending(true);
    const fail = () => {
      if (generation !== imageGeneration) return;
      setImagePending(false);
      alert(t('画像を読み込めませんでした。別の画像を選択してください。直前のプレビューは保持しています。', 'The image could not be loaded. Choose another image. The previous preview has been kept.'));
    };
    const reader = new FileReader();
    reader.onload = (e) => {
      if (generation !== imageGeneration) return;
      const dataUrl = e.target.result;
      if (typeof dataUrl !== 'string') { fail(); return; }
      const img = new Image();
      img.onload = () => {
        if (generation !== imageGeneration) return;
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        const ratio = width / height;
        if (!Number.isFinite(ratio) || ratio <= 0 || width <= 0 || height <= 0) { fail(); return; }
        setImagePending(false);
        currentImageData = dataUrl;
        showImagePreview(true);
        updatePreviewImages();
        if (ratio < CONFIG.RATIO_TOLERANCE_MIN || ratio > CONFIG.RATIO_TOLERANCE_MAX) {
          els.ratioWarning.style.display = 'block';
          els.ratioWarning.textContent = t(
            `画像比率は ${ratio.toFixed(2)}:1 です。このモックの横長カードは約1.91:1で中央を残して切り抜きます。実際のSNS表示はサービス側で確認してください。`,
            `The image ratio is ${ratio.toFixed(2)}:1. This mock's wide cards use an approximately 1.91:1 centered crop. Check the actual display on the service.`
          );
        } else {
          els.ratioWarning.style.display = 'none';
        }
      };
      img.onerror = fail;
      try { img.src = dataUrl; } catch (_) { fail(); }
    };
    reader.onerror = fail;
    reader.onabort = fail;
    try { reader.readAsDataURL(file); } catch (_) { fail(); }
  }

  function resetImage() {
    imageGeneration += 1;
    setImagePending(false);
    els.imageInput.value = '';
    currentImageData = PLACEHOLDER_IMG;
    showImagePreview(false);
    updatePreviewImages();
    els.ratioWarning.style.display = 'none';
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
    const hasDomain = els.siteName.value.trim() !== ''; 
    
    if (hasTitle || hasDesc || hasDomain || hasImage || imagePending) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  init();
});
