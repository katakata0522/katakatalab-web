const AspectRatioLogic = (() => {
  const ADVISOR_RELATIVE_TOLERANCE = 0.025;

  const STANDARD_RATIOS = [
    { ratio: 16 / 9, display: "16:9", label: "YouTube・標準ワイド動画", labelEn: "YouTube and standard widescreen video" },
    { ratio: 9 / 16, display: "9:16", label: "スマホ縦長動画・ショート・リール", labelEn: "vertical mobile video, Shorts, and Reels" },
    { ratio: 4 / 3, display: "4:3", label: "スタンダード・旧テレビ・iPad画面", labelEn: "standard video, older TV, and iPad displays" },
    { ratio: 3 / 4, display: "3:4", label: "縦型スタンダード", labelEn: "vertical standard layouts" },
    { ratio: 1 / 1, display: "1:1", label: "スクエア・Instagram投稿・アイコン", labelEn: "square posts and icons" },
    { ratio: 4 / 5, display: "4:5", label: "縦長SNS投稿・ポートレート", labelEn: "portrait social posts and images" },
    { ratio: 5 / 4, display: "5:4", label: "横長ポートレート比率", labelEn: "landscape 5:4 layouts" },
    { ratio: 3 / 2, display: "3:2", label: "写真・カメラでよく使われる比率", labelEn: "a common photo and camera ratio" },
    { ratio: 2 / 3, display: "2:3", label: "縦位置写真でよく使われる比率", labelEn: "a common portrait photo ratio" },
    { ratio: 21 / 9, display: "21:9", label: "ウルトラワイド・シネマスコープ映画", labelEn: "ultrawide and cinema content" },
    { ratio: 9 / 21, display: "9:21", label: "スマホ縦長シネマ", labelEn: "vertical cinema content" },
    { ratio: 1.618, display: "1.618:1 (黄金比)", label: "デザインや構図で参照される黄金比", labelEn: "the golden ratio used in composition" },
    { ratio: 1 / 1.618, display: "1:1.618 (黄金比)", label: "縦型の黄金比", labelEn: "a vertical golden-ratio layout" },
    { ratio: 1.414, display: "1.414:1 (白銀比)", label: "紙面設計などで参照される白銀比", labelEn: "the silver ratio used in paper and layout design" },
    { ratio: 1 / 1.414, display: "1:1.414 (白銀比)", label: "縦型の白銀比", labelEn: "a vertical silver-ratio layout" }
  ];

  const PRACTICAL_PRESETS = [
    { w: 4, h: 5, ratioText: '4:5', label: 'Portrait' },
    { w: 3, h: 2, ratioText: '3:2', label: 'Photo' }
  ];

  function isPositiveNumber(value) {
    return Number.isFinite(value) && value > 0;
  }

  function gcd(a, b) {
    a = Math.abs(Math.trunc(a));
    b = Math.abs(Math.trunc(b));
    return b === 0 ? a : gcd(b, a % b);
  }

  function dimensionFromWidth(width, ratioW, ratioH) {
    if (![width, ratioW, ratioH].every(isPositiveNumber)) return null;
    const result = Math.round(width * (ratioH / ratioW));
    return Number.isSafeInteger(result) && result > 0 ? result : null;
  }

  function dimensionFromHeight(height, ratioW, ratioH) {
    if (![height, ratioW, ratioH].every(isPositiveNumber)) return null;
    const result = Math.round(height * (ratioW / ratioH));
    return Number.isSafeInteger(result) && result > 0 ? result : null;
  }

  function ratioFromDimensions(width, height) {
    if (![width, height].every(isPositiveNumber)) return null;

    const normalizedWidth = Math.round(width);
    const normalizedHeight = Math.round(height);
    if (![normalizedWidth, normalizedHeight].every(Number.isSafeInteger) || normalizedWidth <= 0 || normalizedHeight <= 0) return null;

    const common = gcd(normalizedWidth, normalizedHeight);
    if (common <= 0) return null;

    return {
      w: normalizedWidth / common,
      h: normalizedHeight / common
    };
  }

  function findStandardRatio(ratioW, ratioH) {
    if (![ratioW, ratioH].every(isPositiveNumber)) return null;
    const targetRatio = ratioW / ratioH;

    return STANDARD_RATIOS.find((item) => {
      const relativeDifference = Math.abs(item.ratio - targetRatio) / item.ratio;
      return relativeDifference <= ADVISOR_RELATIVE_TOLERANCE;
    }) || null;
  }

  return {
    ADVISOR_RELATIVE_TOLERANCE,
    STANDARD_RATIOS,
    PRACTICAL_PRESETS,
    dimensionFromWidth,
    dimensionFromHeight,
    ratioFromDimensions,
    findStandardRatio
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AspectRatioLogic;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const pageLang = (document.documentElement.lang || '').toLowerCase().split('-')[0];
    const t = (ja, en) => pageLang === 'en' ? en : ja;

    function ensurePracticalPresets() {
      const presetGrid = document.querySelector('.preset-grid');
      if (!presetGrid) return;

      const specialPreset = presetGrid.querySelector('.btn-preset.special');
      AspectRatioLogic.PRACTICAL_PRESETS.forEach((preset) => {
        const selector = `.btn-preset[data-w="${preset.w}"][data-h="${preset.h}"]`;
        if (presetGrid.querySelector(selector)) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn-preset';
        button.dataset.w = String(preset.w);
        button.dataset.h = String(preset.h);

        const ratioText = document.createElement('span');
        ratioText.className = 'ratio-text';
        ratioText.textContent = preset.ratioText;

        const ratioLabel = document.createElement('span');
        ratioLabel.className = 'ratio-label';
        ratioLabel.textContent = preset.label;

        button.append(ratioText, ratioLabel);
        presetGrid.insertBefore(button, specialPreset || null);
      });
    }

    function ensureRatioModeControls() {
      const detectBtn = document.getElementById('detectBtn');
      if (!detectBtn || !detectBtn.parentElement) return;

      detectBtn.textContent = t('🪄 入力サイズから比率を逆算', '🪄 Detect ratio from dimensions');

      if (!document.getElementById('ratioLockBtn')) {
        const lockButton = document.createElement('button');
        lockButton.type = 'button';
        lockButton.id = 'ratioLockBtn';
        lockButton.className = 'btn-detect';
        lockButton.setAttribute('aria-pressed', 'true');
        detectBtn.parentElement.insertBefore(lockButton, detectBtn);
      }

      if (!document.getElementById('ratioModeHelp')) {
        const help = document.createElement('div');
        help.id = 'ratioModeHelp';
        help.className = 'ratio-label';
        detectBtn.parentElement.insertBefore(help, detectBtn.nextSibling);
      }
    }

    ensurePracticalPresets();
    ensureRatioModeControls();

    const els = {
      ratioW: document.getElementById('ratioW'),
      ratioH: document.getElementById('ratioH'),
      width: document.getElementById('width'),
      height: document.getElementById('height'),
      deviceWrapper: document.getElementById('deviceWrapper'),
      previewBox: document.getElementById('previewBox'),
      boxDims: document.getElementById('boxDims'),
      infoRatio: document.getElementById('infoRatio'),
      presetBtns: document.querySelectorAll('.btn-preset'),
      swapBtn: document.getElementById('swapBtn'),
      detectBtn: document.getElementById('detectBtn'),
      ratioLockBtn: document.getElementById('ratioLockBtn'),
      ratioModeHelp: document.getElementById('ratioModeHelp'),
      inputs: document.querySelectorAll('.input-number'),
      deviceBtns: document.querySelectorAll('.btn-device'),
      advisorArea: document.getElementById('advisorArea'),
      advisorText: document.getElementById('advisorText'),
      copyCssRatio: document.getElementById('copyCssRatio'),
      copyDims: document.getElementById('copyDims'),
      snippetRatioVal: document.getElementById('snippetRatioVal'),
      snippetDimsVal: document.getElementById('snippetDimsVal'),
      badgeCssRatio: document.getElementById('badgeCssRatio'),
      badgeDims: document.getElementById('badgeDims'),
      status: document.getElementById('calculationStatus'),
      manualCopy: document.getElementById('manualAspectCopy')
    };

    if (!els.ratioW || !els.ratioH || !els.width || !els.height || !els.previewBox) {
      return;
    }

    let isUpdating = false;
    let currentDevice = 'monitor';
    let isRatioLocked = true;
    let resizeTimer = 0;
    let copyGeneration = 0;
    let copyTimer = 0;

    function isValidInput(value) {
      return Number.isFinite(value) && value > 0;
    }

    function setStatus(message) {
      if (els.status) els.status.textContent = message;
    }

    function validate(value, element) {
      const isDimension = element === els.width || element === els.height;
      const valid = isValidInput(value) && (!isDimension || Number.isSafeInteger(value));
      element.classList.toggle('input-error', !valid);
      element.setAttribute('aria-invalid', String(!valid));
      return valid;
    }

    function normalizeDimension(element) {
      const value = Number(element.value);
      if (Number.isFinite(value) && value > 0) element.value = Math.round(value);
    }

    function validState() {
      const values = [els.ratioW, els.ratioH, els.width, els.height].map(el => Number(el.value));
      const valid = [els.ratioW, els.ratioH, els.width, els.height]
        .map((el, i) => validate(values[i], el)).every(Boolean);
      const ratio = values[0] / values[1];
      return valid && Number.isFinite(ratio) && ratio > 0;
    }

    function updateRatioModeUi() {
      if (!els.ratioLockBtn) return;

      els.ratioLockBtn.setAttribute('aria-pressed', String(isRatioLocked));
      els.ratioLockBtn.textContent = isRatioLocked
        ? t('🔒 比率固定 ON', '🔒 Ratio lock ON')
        : t('🔓 比率固定 OFF', '🔓 Ratio lock OFF');

      if (els.ratioModeHelp) {
        els.ratioModeHelp.textContent = isRatioLocked
          ? t('片方のサイズを変えると、比率を保ってもう片方を自動計算します。', 'Changing one dimension recalculates the other while preserving the ratio.')
          : t('幅と高さは整数pxに丸め、その2つから比率を逆算します。', 'Dimensions are rounded to whole pixels before detecting their ratio.');
      }
    }

    function setRatioLock(locked, { recalculate = false } = {}) {
      isRatioLocked = Boolean(locked);
      updateRatioModeUi();
      if (isRatioLocked && recalculate) updateFromRatio();
    }

    function setRatio(w, h) {
      setRatioLock(true);
      els.ratioW.value = w;
      els.ratioH.value = h;
      updateFromRatio();
    }

    function setDeviceFrame(device) {
      currentDevice = device;
      els.deviceBtns.forEach((button) => {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', String(button.dataset.device === device));
      });
      const activeBtn = Array.from(els.deviceBtns).find((button) => button.dataset.device === device);
      if (activeBtn) activeBtn.classList.add('active');

      if (els.deviceWrapper) {
        els.deviceWrapper.className = `device-wrapper frame-${device}`;
      }
      updatePreview();
    }

    function updateFromRatio() {
      if (isUpdating) return;
      isUpdating = true;

      const ratioW = parseFloat(els.ratioW.value);
      const ratioH = parseFloat(els.ratioH.value);
      const width = Number(els.width.value);

      if (!isValidInput(ratioW) || !isValidInput(ratioH)) {
        updatePreview();
        isUpdating = false;
        return;
      }

      const newHeight = AspectRatioLogic.dimensionFromWidth(width, ratioW, ratioH);
      els.height.value = newHeight === null ? '' : newHeight;

      updatePreview();
      isUpdating = false;
    }

    function updateFromSize(targetId) {
      if (isUpdating) return;
      isUpdating = true;

      if (isRatioLocked) {
        const ratioW = parseFloat(els.ratioW.value);
        const ratioH = parseFloat(els.ratioH.value);
        if (!isValidInput(ratioW) || !isValidInput(ratioH)) {
          updatePreview();
          isUpdating = false;
          return;
        }

        if (targetId === 'width') {
          const width = parseFloat(els.width.value);
          if (validate(width, els.width)) {
            const nextHeight = AspectRatioLogic.dimensionFromWidth(width, ratioW, ratioH);
            els.height.value = nextHeight === null ? '' : nextHeight;
          }
        } else {
          const height = parseFloat(els.height.value);
          if (validate(height, els.height)) {
            const nextWidth = AspectRatioLogic.dimensionFromHeight(height, ratioW, ratioH);
            els.width.value = nextWidth === null ? '' : nextWidth;
          }
        }
      } else {
        const width = parseFloat(els.width.value);
        const height = parseFloat(els.height.value);
        const widthValid = validate(width, els.width);
        const heightValid = validate(height, els.height);

        if (widthValid && heightValid) {
          applyRatioFromDimensions(width, height);
        }
      }

      updatePreview();
      isUpdating = false;
    }

    function applyRatioFromDimensions(width, height) {
      const detected = AspectRatioLogic.ratioFromDimensions(width, height);
      if (!detected) return false;

      els.ratioW.value = detected.w;
      els.ratioH.value = detected.h;
      return true;
    }

    function calcRatioFromSize() {
      normalizeDimension(els.width);
      normalizeDimension(els.height);
      const width = parseFloat(els.width.value);
      const height = parseFloat(els.height.value);

      if (validate(width, els.width) && validate(height, els.height)) {
        applyRatioFromDimensions(width, height);
      }
      updatePreview();
    }

    function updatePreview() {
      if (els.manualCopy) { els.manualCopy.hidden = true; els.manualCopy.value = ''; }
      copyGeneration += 1;
      window.clearTimeout(copyTimer);
      [els.badgeCssRatio, els.badgeDims].forEach(badge => {
        if (badge) { badge.textContent = t('📋 コピー', '📋 Copy'); badge.style.color = ''; }
      });
      const valid = validState();
      [els.copyCssRatio, els.copyDims].forEach(button => { if (button) button.disabled = !valid; });
      if (!valid) {
        setStatus(t('正の比率と、1以上の安全な整数pxを入力してください。計算できない値はコピーできません。', 'Enter a positive ratio and safe whole-pixel dimensions of at least 1. Invalid results cannot be copied.'));
        els.infoRatio.textContent = '—';
        els.boxDims.textContent = '—';
        if (els.snippetRatioVal) els.snippetRatioVal.textContent = '—';
        if (els.snippetDimsVal) els.snippetDimsVal.textContent = '—';
        els.previewBox.style.visibility = 'hidden';
        if (els.advisorArea) els.advisorArea.classList.add('hidden');
        els.presetBtns.forEach(button => { button.classList.remove('active'); button.setAttribute('aria-pressed', 'false'); });
        return;
      }
      setStatus('');
      els.previewBox.style.visibility = '';
      const ratioW = Number(els.ratioW.value);
      const ratioH = Number(els.ratioH.value);
      const width = els.width.value || 0;
      const height = els.height.value || 0;
      const targetRatio = ratioW / ratioH;

      els.presetBtns.forEach((button) => {
        const buttonW = parseFloat(button.dataset.w);
        const buttonH = parseFloat(button.dataset.h);
        const buttonRatio = buttonW / buttonH;
        const relativeDifference = Math.abs(buttonRatio - targetRatio) / buttonRatio;
        button.classList.toggle('active', relativeDifference < 0.001);
        button.setAttribute('aria-pressed', String(relativeDifference < 0.001));
      });

      if (ratioW > 0 && ratioH > 0) {
        els.previewBox.style.aspectRatio = `${ratioW} / ${ratioH}`;

        if (currentDevice === 'phone') {
          els.previewBox.style.width = 'auto';
          els.previewBox.style.height = targetRatio > 1 ? '45%' : '80%';
        } else if (currentDevice === 'cinema') {
          els.previewBox.style.width = targetRatio > 2.3 ? '95%' : 'auto';
          els.previewBox.style.height = targetRatio > 2.3 ? 'auto' : '65%';
        } else if (targetRatio > 3) {
          els.previewBox.style.width = '90%';
          els.previewBox.style.height = 'auto';
        } else if (targetRatio < 0.33) {
          els.previewBox.style.width = 'auto';
          els.previewBox.style.height = '90%';
        } else {
          els.previewBox.style.width = 'auto';
          els.previewBox.style.height = '65%';
        }
      }

      els.boxDims.textContent = `${width} × ${height}`;
      const boxRect = els.previewBox.getBoundingClientRect();
      els.boxDims.style.opacity = boxRect.width < 70 || boxRect.height < 45 ? '0' : '1';

      const displayW = String(ratioW);
      const displayH = String(ratioH);
      els.infoRatio.textContent = `${displayW} : ${displayH}`;

      if (els.snippetRatioVal) els.snippetRatioVal.textContent = `${displayW} / ${displayH}`;
      if (els.snippetDimsVal) els.snippetDimsVal.textContent = `${width} × ${height}`;

      checkAdvisor(ratioW, ratioH);
    }

    function checkAdvisor(ratioW, ratioH) {
      const foundMatch = AspectRatioLogic.findStandardRatio(ratioW, ratioH);
      if (!foundMatch || !els.advisorArea || !els.advisorText) {
        if (els.advisorArea) els.advisorArea.classList.add('hidden');
        return;
      }

      const enAdvisor = `Close to <strong>${foundMatch.display}</strong> (${foundMatch.labelEn}). This is a practical match for that layout.`;
      els.advisorText.replaceChildren();
      if (pageLang === 'en') {
        els.advisorText.append(
          document.createTextNode('Close to '),
          Object.assign(document.createElement('strong'), { textContent: foundMatch.display }),
          document.createTextNode(` (${foundMatch.labelEn}). This is a practical match for that layout.`)
        );
        void enAdvisor;
      } else {
        els.advisorText.append(
          document.createTextNode('ほぼ '),
          Object.assign(document.createElement('strong'), { textContent: foundMatch.display }),
          document.createTextNode(` (${foundMatch.label}) の比率です。用途に合うか確認して目安として使えます。`)
        );
      }
      els.advisorArea.classList.remove('hidden');
    }

    function init() {
      els.inputs.forEach((input) => {
        input.addEventListener('focus', function() {
          this.select();
        });
        input.addEventListener('input', function() {
          this.classList.remove('input-error');
        });
      });

      [els.ratioW, els.ratioH].forEach((element) => element.addEventListener('input', () => {
        if (!isRatioLocked) setRatioLock(true);
        updateFromRatio();
      }));

      [els.width, els.height].forEach((element) => {
        element.addEventListener('input', (event) => updateFromSize(event.target.id));
        element.addEventListener('blur', () => { normalizeDimension(element); updateFromSize(element.id); });
      });

      els.presetBtns.forEach((button) => {
        button.addEventListener('click', () => {
          setRatio(parseFloat(button.dataset.w), parseFloat(button.dataset.h));
          button.style.transform = 'scale(0.95)';
          setTimeout(() => button.style.transform = '', 150);
        });
      });

      if (els.swapBtn) {
        els.swapBtn.addEventListener('click', () => {
          const widthRatio = parseFloat(els.ratioW.value);
          const heightRatio = parseFloat(els.ratioH.value);
          if (!isValidInput(widthRatio) || !isValidInput(heightRatio)) return;

          setRatioLock(true);
          els.ratioW.value = heightRatio;
          els.ratioH.value = widthRatio;
          els.swapBtn.style.transform = 'rotate(180deg)';
          setTimeout(() => els.swapBtn.style.transform = '', 300);
          updateFromRatio();
        });
      }

      if (els.detectBtn) {
        els.detectBtn.addEventListener('click', () => {
          setRatioLock(false);
          calcRatioFromSize();
          els.detectBtn.style.transform = 'scale(0.95)';
          setTimeout(() => els.detectBtn.style.transform = '', 150);
        });
      }

      if (els.ratioLockBtn) {
        els.ratioLockBtn.addEventListener('click', () => {
          setRatioLock(!isRatioLocked, { recalculate: !isRatioLocked });
        });
      }

      els.deviceBtns.forEach((button) => {
        button.addEventListener('click', () => setDeviceFrame(button.dataset.device));
      });

      async function copyWithFeedback(badge, text) {
        if (!validState()) { updatePreview(); return; }
        const generation = ++copyGeneration;
        if (els.manualCopy) { els.manualCopy.hidden = true; els.manualCopy.value = ''; }
        window.clearTimeout(copyTimer);
        try {
          if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
          await navigator.clipboard.writeText(text);
          if (generation !== copyGeneration) return;
          setStatus(t('コピーしました。', 'Copied.'));
          if (badge) {
            badge.textContent = t('✓ コピー済', '✓ Copied');
            badge.style.color = '#10b981';
            copyTimer = window.setTimeout(() => {
              if (generation !== copyGeneration) return;
              badge.textContent = t('📋 コピー', '📋 Copy');
              badge.style.color = '';
            }, 1500);
          }
        } catch (_) {
          if (generation !== copyGeneration) return;
          setStatus(t('コピーできませんでした。下の選択済みテキストを手動でコピーしてください。', 'Copy failed. Copy the selected text below manually.'));
          if (els.manualCopy) {
            els.manualCopy.value = text;
            els.manualCopy.hidden = false;
            els.manualCopy.focus();
            els.manualCopy.select();
          }
        }
      }

      if (els.copyCssRatio) {
        els.copyCssRatio.addEventListener('click', () => {
          if (!validState()) { updatePreview(); return; }
          copyWithFeedback(els.badgeCssRatio, `aspect-ratio: ${Number(els.ratioW.value)} / ${Number(els.ratioH.value)};`);
        });
      }
      if (els.copyDims) {
        els.copyDims.addEventListener('click', () => {
          if (!validState()) { updatePreview(); return; }
          copyWithFeedback(els.badgeDims, `${Number(els.width.value)} × ${Number(els.height.value)}`);
        });
      }

      els.ratioW.value = 16;
      els.ratioH.value = 9;
      els.width.value = 1920;
      els.height.value = 1080;
      els.inputs.forEach(input => input.setAttribute('aria-describedby', 'calculationStatus'));
      updateRatioModeUi();
      setDeviceFrame(currentDevice);
    }

    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(updatePreview, 100);
    });
    init();
  });
}
