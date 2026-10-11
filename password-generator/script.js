import { PasswordLogic } from './pwd-logic.js';
import { PasswordVault } from './vault.js';

document.addEventListener('DOMContentLoaded', () => {
    const logic = new PasswordLogic();
    const vault = new PasswordVault();

    // ===== プリセット =====
    const PRESETS = Object.freeze({
        standard: { length: 16, useLower: true, useUpper: true, useNumber: true, useSymbol: false },
        strong: { length: 24, useLower: true, useUpper: true, useNumber: true, useSymbol: true },
        pin: { length: 4, useLower: false, useUpper: false, useNumber: true, useSymbol: false },
        wifi: { length: 20, useLower: true, useUpper: true, useNumber: true, useSymbol: false },
        bank: { length: 6, useLower: false, useUpper: false, useNumber: true, useSymbol: false },
    });
    const DEFAULTS = Object.freeze({
        length: 16, count: 5,
        useLower: true, useUpper: true, useNumber: true, useSymbol: false,
        excludeAmbiguous: true,
        saveHistory: false,
        autoClearClipboard: false,
        clipboardClearSeconds: 30,
    });
    const MAX_LENGTH = 64;
    const MAX_COUNT = 10;
    const MAX_CUSTOM_SYMBOLS_LENGTH = 128;
    const MIN_CLIPBOARD_CLEAR_SECONDS = 5;
    const MAX_CLIPBOARD_CLEAR_SECONDS = 120;
    const STORAGE_KEY = 'password-gen-settings';

    function normalizeCustomSymbols(value) {
        return String(value || '').slice(0, MAX_CUSTOM_SYMBOLS_LENGTH);
    }

    // ===== DOM =====
    const $ = id => document.getElementById(id);
    const inputs = {
        length: $('length'), lenInput: $('len-input'),
        count: $('count'), countInput: $('count-input'),
        useLower: $('useLower'), useUpper: $('useUpper'),
        useNumber: $('useNumber'), useSymbol: $('useSymbol'),
        customSymbols: $('customSymbols'), customSymbolWrap: $('custom-symbol-wrap'),
        excludeAmbiguous: $('excludeAmbiguous'),
        saveHistory: $('saveHistory'),
        autoClearClipboard: $('autoClearClipboard'),
        clipboardClearSeconds: $('clipboardClearSeconds'),
        genBtn: $('gen-btn'), resetBtn: $('reset-btn'), shareBtn: $('share-btn'),
    };
    const resultList = $('result-list');
    const copyAllBtn = $('copy-all-btn');
    const presetBtns = document.querySelectorAll('.preset-btn');
    
    // パスワード診断 DOM
    const checkInput = $('check-input');
    const checkToggle = $('check-toggle');
    const checkResult = $('check-result');
    const checkEmoji = $('check-emoji');
    const checkLabel = $('check-label');
    const checkScore = $('check-score');
    const checkBar = $('check-bar');

    // 履歴パネル DOM
    const historyBtn = $('history-btn');
    const historyPanel = $('history-panel');
    const historyClose = $('history-close');
    const historyList = $('history-list');

    const netStatus = $('net-status');
    const installAppBtn = $('install-app-btn');
    const themeToggle = $('theme-toggle');

    let currentPasswords = [];
    let debounceTimer = null;
    let clipboardClearTimer = null;
    let deferredInstallPrompt = null;
    let vaultUiSession = 0;
    let isPinMode = false;
    let resultsHidden = false;
    const sessionHistory = [];
    const isEnterOrSpace = (event) => event.key === 'Enter' || event.key === ' ';

    function getStrengthClass(score) {
        if (score > 70) return 'strength-high';
        if (score > 40) return 'strength-medium';
        return 'strength-low';
    }

    function clampClipboardClearSeconds(v) {
        return Math.max(MIN_CLIPBOARD_CLEAR_SECONDS, Math.min(v, MAX_CLIPBOARD_CLEAR_SECONDS));
    }

    function updateClipboardOptionState() {
        const enabled = !!inputs.autoClearClipboard?.checked;
        if (inputs.clipboardClearSeconds) {
            inputs.clipboardClearSeconds.disabled = !enabled;
        }
    }

    function setHistoryEnabled(enabled) {
        if (!historyBtn) return;
        historyBtn.disabled = !enabled;
        historyBtn.classList.toggle('disabled', !enabled);
        historyBtn.setAttribute('aria-disabled', String(!enabled));
        historyBtn.title = enabled ? '履歴を表示' : '履歴保存がOFFです';
        if (!enabled) {
            sessionHistory.length = 0;
            if (historyPanel) historyPanel.hidden = true;
        }
    }

    // ===== タブ切り替えロジック (Vanilla JS) =====
    const tabBtns = document.querySelectorAll('.pwd-tab-btn');
    const tabPanels = document.querySelectorAll('.pwd-tab-panel');

    function switchTab(tabId) {
        if (tabId !== 'vault') { vault.lock(); initVaultUI(); }
        tabBtns.forEach(btn => {
            const active = btn.getAttribute('data-tab') === tabId;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', String(active));
        });

        tabPanels.forEach(panel => {
            const active = panel.id === `panel-${tabId}`;
            panel.classList.toggle('active', active);
            if (active) {
                panel.style.display = 'flex';
                setTimeout(() => {
                    panel.style.opacity = '1';
                    panel.style.transform = 'translateY(0)';
                }, 50);
            } else {
                panel.style.opacity = '0';
                panel.style.transform = 'translateY(10px)';
                panel.style.display = 'none';
            }
        });
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.getAttribute('data-tab'));
        });
    });

    // ===== コピー自動消去視覚タイムバー連動 =====
    async function copyTextWithPrivacy(text, successMessage, itemElement = null, isCurrent = () => true) {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else if (!fallbackCopyText(text)) {
                throw new Error('clipboard api unavailable');
            }
            
            if (!isCurrent()) return false;
            if (successMessage) showToast(successMessage, 'success');
            
            // 消去オプションが有効な場合、進行バーアニメーションを発火
            if (inputs.autoClearClipboard?.checked && itemElement) {
                const sec = clampClipboardClearSeconds(parseInt(inputs.clipboardClearSeconds?.value, 10) || DEFAULTS.clipboardClearSeconds);
                let timerBar = itemElement.querySelector('.pwd-timer-bar');
                if (!timerBar) {
                    timerBar = document.createElement('div');
                    timerBar.className = 'pwd-timer-bar';
                    itemElement.appendChild(timerBar);
                }
                // アニメーションのリセット
                timerBar.style.transition = 'none';
                timerBar.style.width = '100%';
                void timerBar.offsetWidth; // リフロー強制発火
                timerBar.style.transition = `width ${sec}s linear`;
                timerBar.style.width = '0%';
            }

            scheduleClipboardAutoClear(text);
            return true;
        } catch (e) {
            if (!isCurrent()) return false;
            showToast('コピーに失敗しました', 'error');
            return false;
        }
    }

    function fallbackCopyText(text) {
        let temp = null;
        try {
            temp = document.createElement('textarea');
            temp.value = text;
            temp.setAttribute('readonly', '');
            temp.style.position = 'fixed';
            temp.style.opacity = '0';
            temp.style.pointerEvents = 'none';
            document.body.appendChild(temp);
            temp.select();
            return document.execCommand('copy');
        } catch {
            return false;
        } finally {
            if (temp) { temp.value = ''; temp.remove(); }
        }
    }

    function scheduleClipboardAutoClear(expectedText) {
        if (!inputs.autoClearClipboard?.checked) return;
        if (!navigator.clipboard?.writeText || !navigator.clipboard?.readText) return;
        if (clipboardClearTimer) clearTimeout(clipboardClearTimer);

        const sec = clampClipboardClearSeconds(parseInt(inputs.clipboardClearSeconds?.value, 10) || DEFAULTS.clipboardClearSeconds);
        if (inputs.clipboardClearSeconds) inputs.clipboardClearSeconds.value = sec;
        clipboardClearTimer = setTimeout(async () => {
            try {
                const current = await navigator.clipboard.readText();
                if (current === expectedText) {
                    await navigator.clipboard.writeText('');
                    showToast('クリップボードを自動消去しました', 'info');
                    // タイムバーの削除
                    document.querySelectorAll('.pwd-timer-bar').forEach(bar => bar.remove());
                }
            } catch {
                // 権限未許可ブラウザでは何もしない
            }
        }, sec * 1000);
    }

    // ===== Toast =====
    let toastContainer = null;
    function getToastContainer() {
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-stack';
            document.body.appendChild(toastContainer);
        }
        return toastContainer;
    }
    function showToast(message, type = 'info') {
        const container = getToastContainer();
        const toast = document.createElement('div');
        toast.className = `app-toast app-toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        requestAnimationFrame(() => { toast.classList.add('is-visible'); });
        setTimeout(() => {
            toast.classList.remove('is-visible');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // ===== ハイライト =====
    function createHighlightedPassword(pwd) {
        const fragment = document.createDocumentFragment();
        for (const char of pwd) {
            const span = document.createElement('span');
            if (/[0-9]/.test(char)) span.className = 'pwd-char-number';
            else if (/[A-Z]/.test(char)) span.className = 'pwd-char-upper';
            else if (/[^a-zA-Z0-9]/.test(char)) span.className = 'pwd-char-symbol';
            else span.className = 'pwd-char-lower';
            span.textContent = char;
            fragment.appendChild(span);
        }
        return fragment;
    }

    // ===== スライダー同期 =====
    function syncSliderAndInput(slider, numberInput) {
        slider.addEventListener('input', () => { numberInput.value = slider.value; });
        numberInput.addEventListener('input', () => {
            let v = parseInt(numberInput.value, 10);
            if (isNaN(v)) { numberInput.value = slider.value; return; }
            v = Math.max(parseInt(slider.min), Math.min(v, parseInt(slider.max)));
            slider.value = v;
            numberInput.value = v;
        });
    }

    function clampLength(v) { return Math.max(4, Math.min(v, MAX_LENGTH)); }
    function clampCount(v) { return Math.max(1, Math.min(v, MAX_COUNT)); }

    function debouncedGenerate() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { generate(); saveSettings(); }, 100);
    }

    // ===== LocalStorage 設定 =====
    function loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return;
            const s = JSON.parse(saved);
            if (typeof s !== 'object' || s === null) return;
            const len = parseInt(s.length, 10);
            if (!isNaN(len) && len >= 4 && len <= MAX_LENGTH) { inputs.length.value = len; inputs.lenInput.value = len; }
            const cnt = parseInt(s.count, 10);
            if (!isNaN(cnt) && cnt >= 1 && cnt <= MAX_COUNT) { inputs.count.value = cnt; inputs.countInput.value = cnt; }
            if (typeof s.useLower === 'boolean') inputs.useLower.checked = s.useLower;
            if (typeof s.useUpper === 'boolean') inputs.useUpper.checked = s.useUpper;
            if (typeof s.useNumber === 'boolean') inputs.useNumber.checked = s.useNumber;
            if (typeof s.useSymbol === 'boolean') inputs.useSymbol.checked = s.useSymbol;
            if (typeof s.excludeAmbiguous === 'boolean') inputs.excludeAmbiguous.checked = s.excludeAmbiguous;
            if (typeof s.customSymbols === 'string') inputs.customSymbols.value = normalizeCustomSymbols(s.customSymbols);
            if (typeof s.saveHistory === 'boolean') inputs.saveHistory.checked = s.saveHistory;
            if (typeof s.autoClearClipboard === 'boolean') inputs.autoClearClipboard.checked = s.autoClearClipboard;
            const clearSec = parseInt(s.clipboardClearSeconds, 10);
            if (!isNaN(clearSec)) inputs.clipboardClearSeconds.value = clampClipboardClearSeconds(clearSec);
            inputs.customSymbolWrap.hidden = !inputs.useSymbol.checked;
            updateClipboardOptionState();
            setHistoryEnabled(inputs.saveHistory.checked);
        } catch (e) { console.error('Failed to load settings:', e); localStorage.removeItem(STORAGE_KEY); }
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                length: parseInt(inputs.length.value, 10), count: parseInt(inputs.count.value, 10),
                useLower: inputs.useLower.checked, useUpper: inputs.useUpper.checked,
                useNumber: inputs.useNumber.checked, useSymbol: inputs.useSymbol.checked,
                excludeAmbiguous: inputs.excludeAmbiguous.checked, customSymbols: normalizeCustomSymbols(inputs.customSymbols.value),
                saveHistory: inputs.saveHistory.checked,
                autoClearClipboard: inputs.autoClearClipboard.checked,
                clipboardClearSeconds: clampClipboardClearSeconds(parseInt(inputs.clipboardClearSeconds.value, 10) || DEFAULTS.clipboardClearSeconds),
            }));
        } catch (e) { console.error('Failed to save settings:', e); }
    }

    function resetSettings() {
        inputs.length.value = DEFAULTS.length; inputs.lenInput.value = DEFAULTS.length;
        inputs.count.value = DEFAULTS.count; inputs.countInput.value = DEFAULTS.count;
        inputs.useLower.checked = DEFAULTS.useLower; inputs.useUpper.checked = DEFAULTS.useUpper;
        inputs.useNumber.checked = DEFAULTS.useNumber; inputs.useSymbol.checked = DEFAULTS.useSymbol;
        inputs.excludeAmbiguous.checked = DEFAULTS.excludeAmbiguous;
        inputs.saveHistory.checked = DEFAULTS.saveHistory;
        inputs.autoClearClipboard.checked = DEFAULTS.autoClearClipboard;
        inputs.clipboardClearSeconds.value = DEFAULTS.clipboardClearSeconds;
        inputs.customSymbols.value = '';
        inputs.customSymbolWrap.hidden = true;
        updateClipboardOptionState();
        setHistoryEnabled(inputs.saveHistory.checked);
        isPinMode = false;
        presetBtns.forEach(b => { b.classList.remove('active', 'btn-secondary'); b.classList.add('btn-outline-secondary'); });
        localStorage.removeItem(STORAGE_KEY);
        generate();
    }

    // ===== 生成 =====
    function generate() {
        isPinMode = inputs.useNumber.checked && !inputs.useLower.checked && !inputs.useUpper.checked && !inputs.useSymbol.checked;
        const purpose = $('generation-purpose');
        if (purpose) purpose.textContent = isPinMode
            ? '数字PIN：端末・サービスが数字の暗証番号を指定する場合に使用してください。一般的なログイン用パスワードには英字も加えてください。'
            : 'パスワード：利用先の条件に合わせ、サービスごとに使い回さず設定してください。';
        let len = parseInt(inputs.length.value, 10);
        let cnt = parseInt(inputs.count.value, 10);
        len = clampLength(len);
        cnt = clampCount(cnt);
        try {
            currentPasswords = logic.generate({
                length: len, count: cnt,
                useLower: inputs.useLower.checked, useUpper: inputs.useUpper.checked,
                useNumber: inputs.useNumber.checked, useSymbol: inputs.useSymbol.checked,
                customSymbols: normalizeCustomSymbols(inputs.customSymbols.value).trim(),
                excludeAmbiguous: inputs.excludeAmbiguous.checked,
            });
            renderResults(currentPasswords);
            addToHistory(currentPasswords);
        } catch (e) {
            console.error('Generate failed:', e);
            currentPasswords = [];
            renderResults(currentPasswords);
            showToast('このブラウザでは安全な生成が利用できません', 'error');
        }
    }

    // ===== レンダリング =====
    function renderResults(passwords) {
        resultList.replaceChildren();
        if (passwords.length === 0) {
            const msg = document.createElement('div');
            msg.className = 'text-danger small text-center py-3';
            msg.textContent = '文字セットを選択してください';
            resultList.appendChild(msg);
            return;
        }
        passwords.forEach(pwd => {
            const strength = logic.checkStrength(pwd, logic.lastGeneratedPoolSize);
            const label = logic.getStrengthLabel(strength);

            const item = document.createElement('div');
            item.className = 'pwd-item';

            const clickTarget = document.createElement('div');
            clickTarget.className = 'w-100 pwd-click-target';
            clickTarget.title = 'クリックでコピー';
            clickTarget.tabIndex = 0;
            clickTarget.setAttribute('role', 'button');
            clickTarget.setAttribute('aria-label', 'パスワードをコピー');

            const pwdText = document.createElement('div');
            pwdText.className = 'pwd-text';
            let hidden = resultsHidden;
            const renderPassword = () => {
                pwdText.replaceChildren();
                if (hidden) pwdText.textContent = '••••••••';
                else pwdText.appendChild(createHighlightedPassword(pwd));
            };
            renderPassword();

            clickTarget.appendChild(pwdText);

            if (!isPinMode) {
                const infoRow = document.createElement('div');
                infoRow.className = 'd-flex justify-content-between align-items-center mt-1 pwd-info-row';
                const labelSpan = document.createElement('span');
                labelSpan.className = label.class;
                labelSpan.textContent = `${label.emoji} ${label.label} / 参考値`;
                infoRow.appendChild(labelSpan);

                const meter = document.createElement('progress');
                meter.className = `strength-progress strength-progress-sm ${getStrengthClass(strength)}`;
                meter.max = 100;
                meter.value = strength;
                meter.setAttribute('aria-label', 'パスワード強度');

                clickTarget.appendChild(meter);
                clickTarget.appendChild(infoRow);
            }

            const copyBtn = document.createElement('button');
            copyBtn.className = 'btn btn-sm btn-outline-primary ms-3 copy-pwd-btn';
            copyBtn.title = 'コピー';
            copyBtn.setAttribute('aria-label', 'このパスワードをコピー');
            copyBtn.textContent = '📋';

            const doCopy = async () => {
                const copied = await copyTextWithPrivacy(pwd, 'コピーしました！', item);
                if (!copied) return;
                copyBtn.textContent = '✅';
                copyBtn.classList.replace('btn-outline-primary', 'btn-success');
                item.classList.add('pwd-item-copied');
                setTimeout(() => {
                    copyBtn.textContent = '📋';
                    copyBtn.classList.replace('btn-success', 'btn-outline-primary');
                    item.classList.remove('pwd-item-copied');
                }, 1000);
            };
            clickTarget.addEventListener('click', doCopy);
            clickTarget.addEventListener('keydown', (e) => {
                if (isEnterOrSpace(e)) {
                    e.preventDefault();
                    doCopy();
                }
            });
            copyBtn.addEventListener('click', (e) => { e.stopPropagation(); doCopy(); });
            const visibilityBtn = document.createElement('button');
            visibilityBtn.type = 'button';
            visibilityBtn.className = 'btn btn-sm btn-outline-secondary pwd-visibility-btn';
            const updateVisibilityLabel = () => {
                visibilityBtn.textContent = hidden ? '表示' : '隠す';
                visibilityBtn.setAttribute('aria-label', hidden ? 'この生成結果を表示' : 'この生成結果を隠す');
                visibilityBtn.setAttribute('aria-pressed', String(hidden));
            };
            updateVisibilityLabel();
            visibilityBtn.addEventListener('click', () => {
                hidden = !hidden;
                renderPassword();
                updateVisibilityLabel();
            });
            item.appendChild(clickTarget);
            item.appendChild(visibilityBtn);
            item.appendChild(copyBtn);
            resultList.appendChild(item);
        });
    }

    const visibilityAllBtn = $('visibility-all-btn');
    if (visibilityAllBtn) visibilityAllBtn.addEventListener('click', () => {
        resultsHidden = !resultsHidden;
        visibilityAllBtn.textContent = resultsHidden ? 'すべて表示' : 'すべて隠す';
        visibilityAllBtn.setAttribute('aria-pressed', String(resultsHidden));
        renderResults(currentPasswords);
    });

    // ===== 全部コピー =====
    if (copyAllBtn) {
        copyAllBtn.addEventListener('click', async () => {
            if (currentPasswords.length === 0) return;
            const copied = await copyTextWithPrivacy(currentPasswords.join('\n'), '全てコピーしました！');
            if (!copied) return;
            const orig = copyAllBtn.textContent;
            copyAllBtn.textContent = '✅ コピー済み';
            setTimeout(() => { copyAllBtn.textContent = orig; }, 2000);
        });
    }

    // ===== プリセット =====
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = PRESETS[btn.dataset.preset];
            if (!preset) return;
            const cLen = clampLength(preset.length);
            inputs.length.value = cLen; inputs.lenInput.value = cLen;
            inputs.useLower.checked = preset.useLower; inputs.useUpper.checked = preset.useUpper;
            inputs.useNumber.checked = preset.useNumber; inputs.useSymbol.checked = preset.useSymbol;
            inputs.customSymbolWrap.hidden = !preset.useSymbol;
            inputs.excludeAmbiguous.checked = !(btn.dataset.preset === 'pin' || btn.dataset.preset === 'bank');
            presetBtns.forEach(b => { b.classList.remove('active', 'btn-secondary'); b.classList.add('pwd-preset-btn'); });
            btn.classList.add('active');
            generate(); saveSettings();
        });
    });

    // ===== 記号連動 =====
    inputs.useSymbol.addEventListener('change', () => {
        inputs.customSymbolWrap.hidden = !inputs.useSymbol.checked;
    });

    // ===== スライダー同期 =====
    syncSliderAndInput(inputs.length, inputs.lenInput);
    syncSliderAndInput(inputs.count, inputs.countInput);

    // ===== イベントリスナー =====
    [inputs.length, inputs.count, inputs.lenInput, inputs.countInput].forEach(el => { el.addEventListener('input', debouncedGenerate); });
    [inputs.useLower, inputs.useUpper, inputs.useNumber, inputs.useSymbol, inputs.excludeAmbiguous].forEach(el => {
        el.addEventListener('change', () => { generate(); saveSettings(); });
    });
    inputs.customSymbols.addEventListener('input', () => {
        const normalized = normalizeCustomSymbols(inputs.customSymbols.value);
        if (inputs.customSymbols.value !== normalized) {
            inputs.customSymbols.value = normalized;
        }
        debouncedGenerate();
    });
    inputs.genBtn.addEventListener('click', generate);
    if (inputs.resetBtn) inputs.resetBtn.addEventListener('click', resetSettings);
    if (inputs.saveHistory) {
        inputs.saveHistory.addEventListener('change', () => {
            setHistoryEnabled(inputs.saveHistory.checked);
            saveSettings();
        });
    }
    if (inputs.autoClearClipboard) {
        inputs.autoClearClipboard.addEventListener('change', () => {
            updateClipboardOptionState();
            saveSettings();
        });
    }
    if (inputs.clipboardClearSeconds) {
        inputs.clipboardClearSeconds.addEventListener('input', () => {
            const value = clampClipboardClearSeconds(parseInt(inputs.clipboardClearSeconds.value, 10) || DEFAULTS.clipboardClearSeconds);
            inputs.clipboardClearSeconds.value = value;
            saveSettings();
        });
    }

    // ===== 文字種と長さに基づく参考診断 =====
    let checkVisible = false;
    if (checkToggle) {
        checkToggle.addEventListener('click', () => {
            checkVisible = !checkVisible;
            checkInput.type = checkVisible ? 'text' : 'password';
            checkToggle.textContent = checkVisible ? '🙈' : '👁️';
        });
    }
    
    // 表示は強度の目安であり、安全性の保証ではない
    const DEFENSE_STATES = Object.freeze({
        weak: { icon: '🚪', label: '要改善', desc: '短い、または使う文字の種類が少ない状態です。長くして使い回しを避けてください。' },
        normal: { icon: '⛓️', label: '標準', desc: '一定の長さがあります。利用先の条件を確認し、可能ならさらに長くしてください。' },
        strong: { icon: '🛡️', label: '高強度', desc: '文字種と長さから見た強度は高めです。サービスごとの固有設定と多要素認証も併用してください。' },
        super: { icon: '🔮', label: '非常に高強度', desc: '文字種と長さから見た推定値は高い状態です。端末・保存先・利用サービスの安全性は別途確認してください。' }
    });

    if (checkInput) {
        checkInput.addEventListener('input', () => {
            const pwd = checkInput.value;
            if (!pwd) {
                checkResult.hidden = true;
                return;
            }
            checkResult.hidden = false;
            const score = logic.checkStrength(pwd);
            const lbl = logic.getStrengthLabel(score);
            
            // 防壁のビジュアル連動
            let defense = DEFENSE_STATES.weak;
            if (score >= 80) defense = DEFENSE_STATES.super;
            else if (score >= 60) defense = DEFENSE_STATES.strong;
            else if (score >= 40) defense = DEFENSE_STATES.normal;

            checkEmoji.textContent = defense.icon;
            checkLabel.textContent = defense.label;
            checkLabel.className = `pwd-defense-title ${lbl.class}`;
            checkScore.textContent = `強度スコア: ${score}/100`;
            
            checkBar.value = score;
            checkBar.className = `strength-progress strength-progress-md ${getStrengthClass(score)}`;
            
            // 超強固(80点以上)時のネオン脈動クラス付与
            checkResult.className = 'pwd-defense-chamber active';
            checkResult.classList.add(getStrengthClass(score));
            if (score >= 80) {
                checkResult.classList.add('super');
            } else {
                checkResult.classList.remove('super');
            }

        });
    }

    // トップと同じ body.dark-mode を使う。Bootstrap は読み込んでいない。
    function applyTheme(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        const moonIcon = themeToggle?.querySelector('.svg-moon');
        const sunIcon = themeToggle?.querySelector('.svg-sun');
        if (moonIcon && sunIcon) {
            moonIcon.style.display = isDark ? 'none' : 'block';
            sunIcon.style.display = isDark ? 'block' : 'none';
        }
        try {
            const value = isDark ? 'dark' : 'light';
            localStorage.setItem('theme', value);
            localStorage.setItem('password-gen-theme', value);
        } catch { }
    }
    if (themeToggle) {
        const moonIcon = themeToggle.querySelector('.svg-moon');
        const sunIcon = themeToggle.querySelector('.svg-sun');
        if (moonIcon && sunIcon) {
            const isDark = document.body.classList.contains('dark-mode');
            moonIcon.style.display = isDark ? 'none' : 'block';
            sunIcon.style.display = isDark ? 'block' : 'none';
        }
        themeToggle.addEventListener('click', () => {
            applyTheme(!document.body.classList.contains('dark-mode'));
        });
    }

    // ===== 生成履歴 =====
    function addToHistory(passwords) {
        if (!inputs.saveHistory.checked) return;
        if (passwords.length === 0) return;
        const now = new Date();
        const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        sessionHistory.unshift({ time: ts, passwords: [...passwords] });
        if (sessionHistory.length > 20) sessionHistory.pop();
    }
    function renderHistory() {
        historyList.replaceChildren();
        if (sessionHistory.length === 0) {
            const p = document.createElement('p');
            p.className = 'text-muted text-center'; p.textContent = 'まだ履歴はありません';
            historyList.appendChild(p); return;
        }
        sessionHistory.forEach(entry => {
            const div = document.createElement('div'); div.className = 'mb-2 pb-2 border-bottom';
            const header = document.createElement('div'); header.className = 'text-muted history-time';
            header.textContent = `🕐 ${entry.time}`;
            div.appendChild(header);
            const pre = document.createElement('pre');
            pre.className = 'mb-0 mt-1 history-pre';
            pre.textContent = entry.passwords.join('\n');
            div.appendChild(pre); historyList.appendChild(div);
        });
    }
    if (historyBtn) historyBtn.addEventListener('click', () => {
        if (!inputs.saveHistory.checked) {
            showToast('履歴保存がOFFです。設定から有効化できます。', 'info');
            return;
        }
        const isOpening = historyPanel.hidden;
        historyPanel.hidden = !historyPanel.hidden;
        if (isOpening) renderHistory();
    });
    if (historyClose) historyClose.addEventListener('click', () => { historyPanel.hidden = true; });

    // ===== 共有 =====
    if (inputs.shareBtn) {
        inputs.shareBtn.addEventListener('click', async () => {
            const p = new URLSearchParams();
            p.set('len', inputs.length.value);
            p.set('cnt', inputs.count.value); p.set('lower', inputs.useLower.checked ? '1' : '0');
            p.set('upper', inputs.useUpper.checked ? '1' : '0');
            p.set('digit', inputs.useNumber.checked ? '1' : '0');
            p.set('sym', inputs.useSymbol.checked ? '1' : '0');
            if (inputs.customSymbols.value) p.set('csym', normalizeCustomSymbols(inputs.customSymbols.value));
            p.set('excl', inputs.excludeAmbiguous.checked ? '1' : '0');
            const url = `${location.origin}${location.pathname}?${p.toString()}`;
            const copied = await copyTextWithPrivacy(url, '共有URLをコピーしました！');
            if (!copied) prompt('このURLを共有:', url);
        });
    }
    function loadFromURL() {
        const p = new URLSearchParams(location.search);
        if (p.size === 0) return false;
        if (p.has('len')) {
            const v = clampLength(parseInt(p.get('len'), 10) || DEFAULTS.length);
            inputs.length.value = v; inputs.lenInput.value = v;
        }
        if (p.has('cnt')) {
            const v = clampCount(parseInt(p.get('cnt'), 10) || DEFAULTS.count);
            inputs.count.value = v; inputs.countInput.value = v;
        }
        if (p.has('lower')) inputs.useLower.checked = p.get('lower') === '1';
        if (p.has('upper')) inputs.useUpper.checked = p.get('upper') === '1';
        if (p.has('digit')) inputs.useNumber.checked = p.get('digit') === '1';
        if (p.has('sym')) { inputs.useSymbol.checked = p.get('sym') === '1'; inputs.customSymbolWrap.hidden = !inputs.useSymbol.checked; }
        if (p.has('csym')) inputs.customSymbols.value = normalizeCustomSymbols(p.get('csym'));
        if (p.has('excl')) inputs.excludeAmbiguous.checked = p.get('excl') === '1';
        return true;
    }

    // ===== ショートカット =====
    function isTypingTarget(target) {
        if (!target) return false;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
        return !!target.isContentEditable;
    }

    document.addEventListener('keydown', (e) => {
        const withPrimaryModifier = (e.ctrlKey || e.metaKey) && !e.altKey;
        if (!withPrimaryModifier) return;
        if (isTypingTarget(e.target)) return;

        const key = String(e.key || '').toLowerCase();

        if (!e.shiftKey && key === 'g') {
            e.preventDefault();
            generate();
            showToast('再生成しました', 'info');
            return;
        }

        if (e.shiftKey && key === 'c') {
            e.preventDefault();
            if (currentPasswords.length > 0) {
                copyTextWithPrivacy(currentPasswords.join('\n'), '全てコピーしました！');
            }
        }
    });

    // ===== Legacy vault: read-only recovery. No setup, import, save or delete UI. =====
    const vaultLockScreen = $('vault-lock-screen');
    const vaultMain = $('vault-main');
    const vaultMasterPw = $('vault-master-pw');
    const vaultLockError = $('vault-lock-error');
    const vaultUnlockBtn = $('vault-unlock-btn');
    const vaultEntries = $('vault-entries');
    const vaultSearch = $('vault-search');
    const vaultLockBtn = $('vault-lock-btn');
    const vaultExportBtn = $('vault-export-btn');
    const recoveryTab = document.querySelector('[data-tab="vault"]');
    const CATEGORIES = Object.freeze({
        all: { label: 'すべて', emoji: '📂', class: 'pwd-cat-other' },
        social: { label: 'SNS・メディア', emoji: '🌐', class: 'pwd-cat-sns' },
        shopping: { label: 'ショッピング', emoji: '🛍', class: 'pwd-cat-shopping' },
        finance: { label: '銀行・金融', emoji: '🏦', class: 'pwd-cat-finance' },
        work: { label: '仕事・学校', emoji: '💼', class: 'pwd-cat-work' },
        other: { label: 'その他', emoji: '🗝', class: 'pwd-cat-other' }
    });
    let currentActiveCategory = 'all';

    function clearMasterInputs() {
        vaultMasterPw.value = '';
        vaultMasterPw.type = 'password';
    }
    function initVaultUI() {
        vaultUiSession++;
        vaultEntries.replaceChildren();
        vaultSearch.value = '';
        clearMasterInputs();
        vaultLockScreen.hidden = false;
        vaultMain.hidden = true;
        vaultLockError.hidden = true;
        let artifacts = false;
        try { artifacts = vault.hasStoredArtifacts(); }
        catch (_) { artifacts = true; }
        if (recoveryTab) recoveryTab.hidden = !artifacts;
        const exists = vault.exists();
        vaultUnlockBtn.disabled = !exists || !vault.isCryptoSupported();
        vaultUnlockBtn.textContent = 'ロック解除して取り出す';
        vaultExportBtn.disabled = !exists;
        if (artifacts && !exists) {
            vaultLockError.textContent = '旧データを読み込めませんでした。元の保存領域は変更していません。サイトデータを削除せず、以前のバックアップを保管してください。';
            vaultLockError.hidden = false;
        }
    }
    function showVaultMain() {
        if (!vault.isUnlocked) return;
        clearMasterInputs();
        vaultLockScreen.hidden = true;
        vaultMain.hidden = false;
        renderVaultEntries();
    }
    vaultUnlockBtn.addEventListener('click', async () => {
        if (vaultUnlockBtn.disabled || !vault.exists()) return;
        const session = vaultUiSession;
        const password = vaultMasterPw.value;
        clearMasterInputs();
        vaultUnlockBtn.disabled = true;
        vaultLockError.hidden = true;
        try {
            const ok = await vault.unlock(password);
            if (session !== vaultUiSession) return;
            if (ok) showVaultMain();
            else { vaultLockError.textContent = 'マスターパスワードが違います。'; vaultLockError.hidden = false; }
        } catch (error) {
            if (session === vaultUiSession) { vaultLockError.textContent = `取り出しエラー: ${error.message}`; vaultLockError.hidden = false; }
        } finally {
            if (session === vaultUiSession) vaultUnlockBtn.disabled = false;
        }
    });
    vaultMasterPw.addEventListener('keydown', event => {
        if (event.key === 'Enter') { event.preventDefault(); vaultUnlockBtn.click(); }
    });
    vaultLockBtn.addEventListener('click', () => { vault.lock(); initVaultUI(); });
    vaultSearch.addEventListener('input', () => { if (vault.isUnlocked) renderVaultEntries(vaultSearch.value); });
    vaultExportBtn.addEventListener('click', () => {
        if (vaultExportBtn.disabled) return;
        try {
            const data = vault.exportEncrypted();
            const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `password-vault-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            showToast('暗号化バックアップの保存を開始しました', 'info');
        } catch (error) { showToast(`取り出しエラー: ${error.message}`, 'error'); }
    });
    window.addEventListener('storage', event => {
        if (event.key === 'password-gen-vault' || event.key === 'password-gen-vault-salt' || event.key === null) {
            vault.lock();
            initVaultUI();
            showToast('保存内容が変わりました。開き直してください。', 'info');
        }
    });
    window.addEventListener('pagehide', () => { vault.lock(); initVaultUI(); });
    function renderVaultEntries(query = '') {
        if (!vault.isUnlocked) { vaultEntries.replaceChildren(); return; }
        const session = vaultUiSession;
        const currentEntry = id => session === vaultUiSession && vault.isUnlocked ? vault.entries.find(item => item.id === id) : null;
        let entries = query ? vault.search(query) : vault.entries;
        
        // カテゴリ別フィルタリング
        if (currentActiveCategory !== 'all') {
            entries = entries.filter(e => e.category === currentActiveCategory);
        }

        vaultEntries.replaceChildren();

        if (entries.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'text-center text-muted py-4';
            if (query || currentActiveCategory !== 'all') {
                empty.textContent = '🔍 該当するエントリが見つかりません';
            } else {
                const lead = document.createElement('div');
                lead.textContent = '📭 まだパスワードが登録されていません';
                const help = document.createElement('small');
                help.textContent = '取り出せる保存済みパスワードはありません';
                empty.appendChild(lead);
                empty.appendChild(help);
            }
            vaultEntries.appendChild(empty);
            return;
        }

        entries.forEach(entry => {
            const card = document.createElement('div');
            card.className = 'vault-entry card mb-2';

            const body = document.createElement('div');
            body.className = 'card-body p-2 px-3';

            // サイト名行
            const header = document.createElement('div');
            header.className = 'd-flex justify-content-between align-items-center';
            
            const titleCol = document.createElement('div');
            titleCol.className = 'd-flex align-items-center gap-2';
            
            const siteName = document.createElement('strong');
            siteName.className = 'small';
            siteName.textContent = entry.siteName || '(名前なし)';
            
            // カテゴリバッジの表示 (提案B)
            const cat = CATEGORIES[entry.category] || CATEGORIES.other;
            const badge = document.createElement('span');
            badge.className = `pwd-cat-badge ${cat.class}`;
            badge.innerHTML = `${cat.emoji} ${cat.label}`;
            
            titleCol.appendChild(siteName);
            titleCol.appendChild(badge);

            const actions = document.createElement('div');
            actions.className = 'd-flex gap-1';

            // コピーボタン
            const copyBtn = document.createElement('button');
            copyBtn.className = 'btn btn-outline-primary btn-sm';
            copyBtn.textContent = '📋';
            copyBtn.title = 'パスワードをコピー';
            copyBtn.setAttribute('aria-label', `${entry.siteName || 'このエントリ'}のパスワードをコピー`);
            const entryId = entry.id;
            copyBtn.addEventListener('click', async () => {
                const entry = currentEntry(entryId);
                if (!entry) return;
                const copied = await copyTextWithPrivacy(entry.password, 'パスワードをコピーしました', card, () => session === vaultUiSession && vault.isUnlocked);
                if (!copied) return;
                copyBtn.textContent = '✅';
                setTimeout(() => { copyBtn.textContent = '📋'; }, 1000);
            });

            actions.appendChild(copyBtn);
            header.appendChild(titleCol);
            header.appendChild(actions);
            body.appendChild(header);

            // パスワード表示 (マスク + トグル)
            const pwRow = document.createElement('div');
            pwRow.className = 'd-flex align-items-center gap-2 mt-1';
            const pwDisplay = document.createElement('code');
            pwDisplay.className = 'small';
            pwDisplay.textContent = '••••••••';
            let pwVisible = false;
            const pwToggle = document.createElement('button');
            pwToggle.className = 'btn btn-link btn-sm p-0 text-decoration-none';
            pwToggle.textContent = '👁️';
            pwToggle.setAttribute('aria-label', 'パスワード表示を切り替え');
            pwToggle.addEventListener('click', () => {
                const entry = currentEntry(entryId);
                if (!entry) return;
                pwVisible = !pwVisible;
                pwDisplay.textContent = pwVisible ? entry.password : '••••••••';
                pwToggle.textContent = pwVisible ? '🙈' : '👁️';
            });
            pwRow.appendChild(pwDisplay);
            pwRow.appendChild(pwToggle);
            body.appendChild(pwRow);

            // カスタムフィールド表示
            if (entry.fields && entry.fields.length > 0) {
                const fieldsDiv = document.createElement('div');
                fieldsDiv.className = 'mt-1';
                entry.fields.forEach((f, fieldIndex) => {
                    const row = document.createElement('div');
                    row.className = 'd-flex align-items-center gap-1 small text-muted vault-field-row-inline';
                    const lbl = document.createElement('span');
                    lbl.textContent = `${f.label}:`;
                    lbl.className = 'fw-bold';
                    const val = document.createElement('span');
                    val.textContent = f.value;
                    const cpBtn = document.createElement('button');
                    cpBtn.className = 'btn btn-link btn-sm p-0 text-decoration-none vault-field-copy-btn';
                    cpBtn.textContent = '📋';
                    cpBtn.setAttribute('aria-label', `${f.label || 'この項目'}をコピー`);
                    cpBtn.addEventListener('click', async () => {
                        const f = currentEntry(entryId)?.fields[fieldIndex];
                        if (!f) return;
                        await copyTextWithPrivacy(f.value, '項目をコピーしました', null, () => session === vaultUiSession && vault.isUnlocked);
                    });
                    row.appendChild(lbl);
                    row.appendChild(val);
                    row.appendChild(cpBtn);
                    fieldsDiv.appendChild(row);
                });
                body.appendChild(fieldsDiv);
            }

            card.appendChild(body);
            vaultEntries.appendChild(card);
        });
    }

    // ===== FAQ アコーディオン開閉ロジック (Vanilla JS) =====
    const faqItems = document.querySelectorAll('.pwd-faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.pwd-faq-question');
        const answer = item.querySelector('.pwd-faq-answer');
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // 他のすべてのアコーディオンを閉じる
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
                otherItem.querySelector('.pwd-faq-answer').style.maxHeight = '0px';
            });

            if (!isActive) {
                item.classList.add('active');
                answer.style.maxHeight = `${answer.scrollHeight + 30}px`;
            } else {
                item.classList.remove('active');
                answer.style.maxHeight = '0px';
            }
        });
    });

    // ボールトUI初期化
    initVaultUI();

    // ===== 初期化 =====
    updateClipboardOptionState();
    setHistoryEnabled(inputs.saveHistory.checked);
    loadSettings();
    loadFromURL();
    generate();

    // ===== ネットワーク状態 =====
    function updateNetworkStatus() {
        if (!netStatus) return;
        const online = navigator.onLine;
        netStatus.textContent = online ? '● オンライン' : '● オフライン';
        netStatus.classList.toggle('pwd-net-status-online', online);
        netStatus.classList.toggle('pwd-net-status-offline', !online);
    }
    window.addEventListener('online', () => {
        updateNetworkStatus();
        showToast('オンラインに復帰しました', 'info');
    });
    window.addEventListener('offline', () => {
        updateNetworkStatus();
        showToast('オフラインです。キャッシュ済み機能のみ利用できます', 'info');
    });
    updateNetworkStatus();

    // ===== PWAインストール導線 =====
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        if (installAppBtn) installAppBtn.hidden = false;
    });
    if (installAppBtn) {
        installAppBtn.addEventListener('click', async () => {
            if (!deferredInstallPrompt) return;
            deferredInstallPrompt.prompt();
            const choice = await deferredInstallPrompt.userChoice;
            if (choice.outcome === 'accepted') {
                showToast('インストールを開始しました', 'success');
            }
            deferredInstallPrompt = null;
            installAppBtn.hidden = true;
        });
    }
    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        if (installAppBtn) installAppBtn.hidden = true;
        showToast('アプリをインストールしました', 'success');
    });

    // PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(err => console.warn('SW registration failed:', err));
    }

    // 入力データの保護 (beforeunload) - 保管庫がアンロックされている場合のみ保護
    window.addEventListener('beforeunload', (e) => {
        const isVaultUnlocked = vaultMain && !vaultMain.hidden;
        if (isVaultUnlocked) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
});
