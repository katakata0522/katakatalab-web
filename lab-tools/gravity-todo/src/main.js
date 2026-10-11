import { PhysicsEngine } from './PhysicsEngine.js';
import { SettingsManager } from './SettingsManager.js';
import { normalizeTaskText } from './taskText.js';

document.addEventListener('DOMContentLoaded', () => {
  const engine = new PhysicsEngine('canvas-container');
  document.getElementById('undo-btn')?.addEventListener('click', () => engine.undoLastRemoval());
  document.getElementById('redo-btn')?.addEventListener('click', () => engine.redoLastRemoval());
  const reducedEffects = document.getElementById('reduced-effects');
  if (reducedEffects) {
    reducedEffects.checked = SettingsManager.load().reducedEffects === true;
    reducedEffects.addEventListener('change', () => reportSettingsSave(SettingsManager.save({ reducedEffects: reducedEffects.checked })));
  }
  function reportSettingsSave(saved) {
    const message = document.getElementById('settings-save-status');
    if (message) message.textContent = saved ? '' : '設定はこの画面のみ反映しています。以前の保存データは保持しました。';
  }


  const form           = document.getElementById('task-form');
  const input          = document.getElementById('task-input');
  const inputContainer = document.querySelector('.input-container');
  const nukeBtn        = document.getElementById('nuke-btn');
  const addBtn         = document.querySelector('.add-btn');
  const charCount      = document.getElementById('char-count');
  const bgmBtn         = document.getElementById('bgm-btn');

  // ======== ヒントバー（起動直後に表示 → 操作 or 8秒で消える） ========
  const hintBar   = document.getElementById('hint-bar');
  const hintClose = document.getElementById('hint-close');
  let hintDismissed = false;

  function hideHint() {
    if (!hintBar || hintDismissed) return;
    hintDismissed = true;
    hintBar.classList.add('hint-bar--hiding');
    setTimeout(() => {
      hintBar.classList.add('hidden');
      hintBar.classList.remove('hint-bar--hiding');
    }, 400);
  }
  hintClose?.addEventListener('click', hideHint);
  // 8秒後に自動非表示
  setTimeout(hideHint, 8000);

  // ======== BGM ON/OFF ========
  const bgm = engine.bgmManager;
  const updateBgmBtn = (playing) => {
    if (!bgmBtn) return;
    bgmBtn.textContent = playing ? '🔊' : '🎵';
    bgmBtn.setAttribute('aria-pressed', String(playing));
    bgmBtn.classList.toggle('is-active', playing);
    bgmBtn.title = playing ? 'BGM OFF' : 'BGM ON';
  };
  updateBgmBtn(bgm.loadPreference());
  const sfxMuteBtn = document.getElementById('sfx-mute-btn');
  const updateSfxBtn = (muted) => {
    if (!sfxMuteBtn) return;
    sfxMuteBtn.textContent = muted ? '🔇' : '🔈';
    sfxMuteBtn.setAttribute('aria-pressed', String(muted));
    sfxMuteBtn.title = muted ? '効果音を出す' : '効果音を止める';
  };
  updateSfxBtn(engine.soundManager.muted);
  sfxMuteBtn?.addEventListener('click', () => {
    updateSfxBtn(engine.soundManager.toggleMuted());
  });
  bgmBtn?.addEventListener('click', () => {
    const playing = bgm.toggle();
    updateBgmBtn(playing);
  });

  // ======== ジャイロ重力 ON/OFF ========
  const gyro = engine.gyroManager;
  const gyroToggle = document.getElementById('gyro-toggle');
  const gyroCalibrateBtn = document.getElementById('gyro-calibrate-btn');

  const updateGyroToggle = (enabled) => {
    if (!gyroToggle) return;
    gyroToggle.classList.toggle('is-on', enabled);
    gyroToggle.setAttribute('aria-checked', String(enabled));
    if (gyroCalibrateBtn) {
      gyroCalibrateBtn.classList.toggle('hidden', !enabled);
    }
  };

  // 前回の設定を復元
  if (gyro.loadPreference() && gyro.supported) {
    gyro.enable().then(ok => updateGyroToggle(ok));
  }

  gyroToggle?.addEventListener('click', async () => {
    const result = await gyro.toggle();
    updateGyroToggle(result);
    // ONにした瞬間、いまの姿勢を基準にする
    if (result) {
      gyro.calibrate(gyro.currentBeta, gyro.currentGamma);
    }

    if (!result && gyro.supported && !gyro.permissionGranted) {
      alert('ジャイロセンサーの使用が許可されていません。ブラウザの設定を確認してください。');
    }
    if (!gyro.supported) {
      alert('お使いのデバイスではジャイロセンサーに対応していません。');
    }
  });

  gyroCalibrateBtn?.addEventListener('click', () => {
    gyro.calibrate(gyro.currentBeta, gyro.currentGamma);
    gyroCalibrateBtn.textContent = '基準をリセットしました✓';
    setTimeout(() => {
      gyroCalibrateBtn.textContent = '現在の角度を基準にする';
    }, 2000);
  });

  // ======== タスク整列 ========
  const rearrangeBtn = document.getElementById('rearrange-btn');
  rearrangeBtn?.addEventListener('click', () => {
    if (rearrangeBtn.disabled) return;
    engine.rearrangeTasks();
  });

  // ======== カラー設定パネル ========
  const settingsBtn   = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const presetList    = document.getElementById('preset-list');
  const customColor   = document.getElementById('custom-block-color');
  const customBorder  = document.getElementById('custom-block-border');

  function applyColorChange(color, border, presetId) {
    reportSettingsSave(SettingsManager.save({ blockColor: color, blockBorder: border, preset: presetId }));
    if (customColor)  customColor.value  = color;
    if (customBorder) customBorder.value = border;
    // 既存ブロックも一括変更
    engine.recolorAllBlocks();
    buildPresets();
  }

  function buildPresets() {
    if (!presetList) return;
    presetList.innerHTML = '';
    const current = SettingsManager.load();
    SettingsManager.PRESETS.forEach(preset => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-btn' + (current.preset === preset.id ? ' is-active' : '');
      btn.setAttribute('aria-pressed', current.preset === preset.id ? 'true' : 'false');
      btn.title = preset.name;
      btn.style.setProperty('--p-block',  preset.block);
      btn.style.setProperty('--p-border', preset.border);
      // XSS安全: DOM APIでテキスト挿入（innerHTMLを使わない）
      const swatch = document.createElement('span');
      swatch.className = 'preset-swatch';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'preset-name';
      nameSpan.textContent = preset.name;
      btn.appendChild(swatch);
      btn.appendChild(nameSpan);
      btn.addEventListener('click', () => applyColorChange(preset.block, preset.border, preset.id));
      presetList.appendChild(btn);
    });
  }
  buildPresets();

  const initialSettings = SettingsManager.load();
  if (customColor)  customColor.value  = initialSettings.blockColor;
  if (customBorder) customBorder.value = initialSettings.blockBorder;

  customColor?.addEventListener('input', () => {
    applyColorChange(customColor.value, SettingsManager.load().blockBorder, 'custom');
  });
  customBorder?.addEventListener('input', () => {
    applyColorChange(SettingsManager.load().blockColor, customBorder.value, 'custom');
  });

  settingsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !settingsPanel.classList.contains('hidden');
    settingsPanel.classList.toggle('hidden');
    settingsBtn.setAttribute('aria-expanded', String(!isOpen));
  });
  document.addEventListener('click', (e) => {
    if (!settingsPanel?.classList.contains('hidden') &&
        !settingsPanel.contains(e.target) &&
        e.target !== settingsBtn) {
      settingsPanel.classList.add('hidden');
      settingsBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  // ======== タスク入力 ========
  let lastSubmitTime = 0;

  const syncInputState = () => {
    const max = Number(input.getAttribute('maxlength') || 20);
    const len = input.value.length;
    if (charCount) charCount.textContent = `${len}/${max}`;
    if (addBtn)    addBtn.disabled = engine.storageReady === false || normalizeTaskText(input.value).length === 0;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await engine.ready;
    if (engine.storageReady === false) return;

    const now = Date.now();
    if (now - lastSubmitTime < 300) return;
    lastSubmitTime = now;

    const text = normalizeTaskText(input.value);
    if (text) {
      if (engine.getTaskCount() >= 100) {
        alert('空間の限界です。タスクを爆破して減らしてください。');
        return;
      }

      // カラー判定
      const colorRadio = document.querySelector('input[name="drop-color"]:checked');
      const colorType = colorRadio ? colorRadio.value : 'default';

      let blockColor = null;
      let blockBorder = null;

      switch(colorType) {
        case 'work':
          blockColor = '#0f3460'; blockBorder = '#4a90e2';
          break;
        case 'private':
          blockColor = '#1b5e20'; blockBorder = '#4caf50';
          break;
        case 'urgent':
          blockColor = '#b71c1c'; blockBorder = '#ff5252';
          break;
      }

      engine.addTask(text, undefined, undefined, undefined, {
        blockColor,
        blockBorder
      });
      input.value = '';
      syncInputState();
      hideHint();
      inputContainer.classList.add('flash');
      setTimeout(() => inputContainer.classList.remove('flash'), 150);
    }
    input.focus();
  });

  nukeBtn?.addEventListener('click', async () => {
    await engine.ready;
    engine.confirmAndNukeAll();
  });

  document.addEventListener('gravity:storageStatus', syncInputState);
  document.getElementById('retry-storage')?.addEventListener('click', async () => {
    await engine.ready;
    await engine.restoreTasks();
    syncInputState();
  });

  input.addEventListener('input', syncInputState);
  input.addEventListener('focus', () => inputContainer?.classList.add('is-focused'));
  input.addEventListener('blur',  () => inputContainer?.classList.remove('is-focused'));

  requestAnimationFrame(() => document.body.classList.add('app-ready'));
  syncInputState();
  input.focus();
  // ======== Xシェア機能 ========
  const shareBtn = document.getElementById('share-btn');
  shareBtn?.addEventListener('click', () => {
    const destroyCount = parseInt(document.getElementById('destroy-count')?.textContent || '0', 10);
    const text = `今日はタスクを ${destroyCount} 個、物理的に爆破しました！💥\n\nGravity-Todo（タスク爆破アプリ）\n#GravityTodo #かたかたラボ`;
    const url = `https://katakatalab.com/lab-tools/gravity-todo/`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  });

  // オフライン時のシェアボタン制御
  const updateShareBtnState = () => {
    if (!shareBtn) return;
    if (navigator.onLine) {
      shareBtn.style.opacity = '1';
      shareBtn.style.pointerEvents = 'auto';
      shareBtn.title = '破壊スコアをXでシェア';
    } else {
      shareBtn.style.opacity = '0.3';
      shareBtn.style.pointerEvents = 'none';
      shareBtn.title = 'オフライン時はシェアできません';
    }
  };
  window.addEventListener('online', updateShareBtnState);
  window.addEventListener('offline', updateShareBtnState);
  updateShareBtnState();

  // ======== PWAインストール ========
  let deferredPrompt;
  const installBtn = document.getElementById('install-btn');

  window.addEventListener('beforeinstallprompt', (e) => {
    // デフォルトのミニインフォバーを表示させない
    e.preventDefault();
    deferredPrompt = e;
    // インストールボタンを表示
    if (installBtn) installBtn.classList.remove('hidden');
  });

  installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch (error) {
      console.warn('インストール案内を表示できませんでした。', error);
    } finally {
      installBtn.classList.add('hidden');
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installBtn?.classList.add('hidden');
  });

});

