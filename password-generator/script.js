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
    const MIN_MASTER_PASSWORD_LENGTH = 16;
    const MIN_MASTER_PASSWORD_SCORE = 45;
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
    const checkTime = $('check-time');

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
    let pendingImportNotice = false;
    let isPinMode = false;
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
    async function copyTextWithPrivacy(text, successMessage, itemElement = null) {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else if (!fallbackCopyText(text)) {
                throw new Error('clipboard api unavailable');
            }
            
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
            showToast('コピーに失敗しました', 'error');
            return false;
        }
    }

    function fallbackCopyText(text) {
        try {
            const temp = document.createElement('textarea');
            temp.value = text;
            temp.setAttribute('readonly', '');
            temp.style.position = 'fixed';
            temp.style.opacity = '0';
            temp.style.pointerEvents = 'none';
            document.body.appendChild(temp);
            temp.select();
            const copied = document.execCommand('copy');
            temp.remove();
            return copied;
        } catch {
            return false;
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
            if (isNaN(v)) return;
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
            const strength = logic.checkStrength(pwd);
            const label = logic.getStrengthLabel(strength);
            const crackTime = logic.estimateCrackTime(pwd);

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
            pwdText.appendChild(createHighlightedPassword(pwd));

            clickTarget.appendChild(pwdText);

            if (!isPinMode) {
                const infoRow = document.createElement('div');
                infoRow.className = 'd-flex justify-content-between align-items-center mt-1 pwd-info-row';
                const labelSpan = document.createElement('span');
                labelSpan.className = label.class;
                labelSpan.textContent = `${label.emoji} ${label.label}`;
                const timeSpan = document.createElement('span');
                timeSpan.className = 'text-muted';
                timeSpan.textContent = `🕐 ${crackTime}`;
                infoRow.appendChild(labelSpan);
                infoRow.appendChild(timeSpan);

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
            item.appendChild(clickTarget);
            item.appendChild(copyBtn);
            resultList.appendChild(item);
        });
    }

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
            isPinMode = (btn.dataset.preset === 'pin' || btn.dataset.preset === 'bank');
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
            const time = logic.estimateCrackTime(pwd);
            
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

            checkTime.innerHTML = `<strong>${time}</strong>`;
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

    // ================================================================
    //  ボールト（パスワード管理）
    // ================================================================
    const vaultLockScreen = $('vault-lock-screen');
    const vaultMain = $('vault-main');
    const vaultForm = $('vault-form');
    const vaultMasterPw = $('vault-master-pw');
    const vaultMasterPwConfirm = $('vault-master-pw-confirm');
    const vaultConfirmWrap = $('vault-confirm-wrap');
    const vaultMasterHelp = $('vault-master-help');
    const vaultMasterLabel = $('vault-master-label');
    const vaultMasterScore = $('vault-master-score');
    const vaultMasterBar = $('vault-master-bar');
    const vaultMasterTip = $('vault-master-tip');
    const vaultLockTitle = $('vault-lock-title');
    const vaultLockDesc = $('vault-lock-desc');
    const vaultLockError = $('vault-lock-error');
    const vaultUnlockBtn = $('vault-unlock-btn');
    const vaultPwToggle = $('vault-pw-toggle');
    const vaultLockBtn = $('vault-lock-btn');
    const vaultEntries = $('vault-entries');
    const vaultSearch = $('vault-search');
    const vaultAddBtn = $('vault-add-btn');
    const vaultSiteName = $('vault-site-name');
    
    // 提案B: カテゴリ拡張
    const vaultCategory = $('vault-category');
    
    const vaultPassword = $('vault-password');
    const vaultCustomFields = $('vault-custom-fields');
    const vaultAddFieldBtn = $('vault-add-field-btn');
    const vaultSaveBtn = $('vault-save-btn');
    const vaultCancelBtn = $('vault-cancel-btn');
    const vaultEditId = $('vault-edit-id');
    const vaultFormTitle = $('vault-form-title');
    const vaultDestroyBtn = $('vault-destroy-btn');
    const vaultResetCorruptBtn = $('vault-reset-corrupt-btn');
    const vaultExportBtn = $('vault-export-btn');
    const vaultImportInput = $('vault-import-input');
    
    const chestIcon = $('pwd-chest-icon');

    // カテゴリ定義
    const CATEGORIES = Object.freeze({
        all: { label: 'すべて', emoji: '📂', class: 'pwd-cat-other' },
        social: { label: 'SNS・メディア', emoji: '🌐', class: 'pwd-cat-sns' },
        shopping: { label: 'ショッピング', emoji: '🛍', class: 'pwd-cat-shopping' },
        finance: { label: '銀行・金融', emoji: '🏦', class: 'pwd-cat-finance' },
        work: { label: '仕事・学校', emoji: '💼', class: 'pwd-cat-work' },
        other: { label: 'その他', emoji: '🗝', class: 'pwd-cat-other' }
    });

    let currentActiveCategory = 'all';

    function evaluateMasterPassword(pw) {
        let score = 0;
        const tips = [];
        const length = pw.length;
        const typeCount =
            (/[a-z]/.test(pw) ? 1 : 0) +
            (/[A-Z]/.test(pw) ? 1 : 0) +
            (/[0-9]/.test(pw) ? 1 : 0) +
            (/[^a-zA-Z0-9]/.test(pw) ? 1 : 0);

        score += Math.min(60, length * 3);
        score += typeCount * 10;
        if (typeCount >= 3) score += 10;
        if (/(.)\1{2,}/.test(pw)) score -= 10;
        if (/\s/.test(pw)) score -= 10;
        score = Math.max(0, Math.min(100, score));

        if (length < MIN_MASTER_PASSWORD_LENGTH) tips.push(`${MIN_MASTER_PASSWORD_LENGTH}文字以上にする`);
        if (!/[a-z]/.test(pw)) tips.push('英小文字を入れる');
        if (!/[A-Z]/.test(pw)) tips.push('英大文字を入れる');
        if (!/[0-9]/.test(pw)) tips.push('数字を入れる');
        if (!/[^a-zA-Z0-9]/.test(pw)) tips.push('記号を入れる');

        let label = '弱い';
        if (score >= 80) label = '強い';
        else if (score >= 55) label = '普通';

        return {
            score,
            label,
            tip: tips.length > 0 ? `改善: ${tips[0]}` : '十分に強いパスワードです',
            cssClass: getStrengthClass(score),
        };
    }

    function renderMasterPasswordHelp() {
        if (!vaultMasterHelp) return;
        if (vault.exists()) {
            vaultMasterHelp.hidden = true;
            return;
        }
        vaultMasterHelp.hidden = false;
        const result = evaluateMasterPassword(vaultMasterPw.value);
        vaultMasterLabel.textContent = `強度: ${result.label}`;
        vaultMasterScore.textContent = `${result.score}/100`;
        vaultMasterBar.value = result.score;
        vaultMasterBar.className = `strength-progress strength-progress-sm ${result.cssClass}`;
        vaultMasterTip.textContent = result.tip;
    }

    // 初期状態: ボールトの存在に応じてUIを切り替え
    function initVaultUI() {
        const vaultExists = vault.exists();
        const hasArtifacts = typeof vault.hasStoredArtifacts === 'function' && vault.hasStoredArtifacts();
        const cryptoSupported = typeof vault.isCryptoSupported === 'function' && vault.isCryptoSupported();

        chestIcon.textContent = vaultExists ? '🔒' : '🔑';

        if (!cryptoSupported) {
            vaultLockTitle.textContent = 'このブラウザではボールト機能を利用できません';
            vaultLockDesc.textContent = 'Web Crypto API 非対応のため、パスワード管理タブは使用できません。';
            vaultConfirmWrap.hidden = true;
            vaultUnlockBtn.textContent = '利用不可';
            vaultUnlockBtn.disabled = true;
            if (vaultResetCorruptBtn) vaultResetCorruptBtn.hidden = true;
        } else if (vaultExists) {
            vaultLockTitle.textContent = 'マスターパスワードを入力';
            vaultLockDesc.textContent = 'ボールトを開くにはマスターパスワードを入力してください。';
            vaultConfirmWrap.hidden = true;
            vaultUnlockBtn.textContent = '🔓 ロック解除';
            vaultUnlockBtn.disabled = false;
            if (vaultResetCorruptBtn) vaultResetCorruptBtn.hidden = true;
        } else {
            vaultLockTitle.textContent = 'マスターパスワードを設定';
            vaultLockDesc.textContent = `ボールト内のデータはこのパスワード（${MIN_MASTER_PASSWORD_LENGTH}文字以上）で暗号化されます。忘れると復元できません。`;
            vaultConfirmWrap.hidden = false;
            vaultUnlockBtn.textContent = '🔐 ボールトを作成';
            vaultUnlockBtn.disabled = false;
            if (vaultResetCorruptBtn) vaultResetCorruptBtn.hidden = !hasArtifacts;
        }
        vaultLockScreen.hidden = false;
        vaultMain.hidden = true;
        vaultForm.hidden = true;
        vaultLockError.hidden = true;
        if (cryptoSupported && !vaultExists && hasArtifacts) {
            vaultLockError.textContent = '⚠️ 以前のボールトデータが破損している可能性があります。必要なら下の初期化を実行してください。';
            vaultLockError.hidden = false;
        }
        vaultMasterPw.value = '';
        vaultMasterPwConfirm.value = '';
        renderMasterPasswordHelp();
    }

    // マスターPW表示切替
    let vaultPwVisible = false;
    if (vaultPwToggle) {
        vaultPwToggle.addEventListener('click', () => {
            vaultPwVisible = !vaultPwVisible;
            vaultMasterPw.type = vaultPwVisible ? 'text' : 'password';
            vaultMasterPwConfirm.type = vaultPwVisible ? 'text' : 'password';
            vaultPwToggle.textContent = vaultPwVisible ? '🙈' : '👁️';
        });
    }
    if (vaultMasterPw) vaultMasterPw.addEventListener('input', renderMasterPasswordHelp);
    if (vaultMasterPwConfirm) vaultMasterPwConfirm.addEventListener('input', renderMasterPasswordHelp);

    const handleVaultUnlockEnter = (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (vaultUnlockBtn) vaultUnlockBtn.click();
    };
    if (vaultMasterPw) vaultMasterPw.addEventListener('keydown', handleVaultUnlockEnter);
    if (vaultMasterPwConfirm) vaultMasterPwConfirm.addEventListener('keydown', handleVaultUnlockEnter);

    // ロック解除 / セットアップ
    if (vaultUnlockBtn) {
        vaultUnlockBtn.addEventListener('click', async () => {
            const pw = vaultMasterPw.value;
            vaultLockError.hidden = true;
            if (typeof vault.isCryptoSupported === 'function' && !vault.isCryptoSupported()) {
                vaultLockError.textContent = '❌ このブラウザはボールト暗号化に対応していません';
                vaultLockError.hidden = false;
                return;
            }

            if (vault.exists()) {
                // 既存ボールトを開く
                vaultUnlockBtn.disabled = true;
                vaultUnlockBtn.textContent = '🔄 解錠中...';
                chestIcon.style.transform = 'scale(0.8) rotate(-10deg)';
                try {
                    const ok = await vault.unlock(pw);
                    if (ok) {
                        chestIcon.textContent = '🔓';
                        chestIcon.style.transform = 'scale(1.2) rotate(10deg)';
                        setTimeout(() => {
                            showVaultMain();
                            if (pendingImportNotice) {
                                showToast(`インポートデータを ${vault.entries.length} 件読み込みました`, 'success');
                                pendingImportNotice = false;
                            }
                        }, 300);
                    } else {
                        chestIcon.textContent = '🔒';
                        chestIcon.style.transform = 'none';
                        vaultLockError.textContent = '❌ マスターパスワードが違います';
                        vaultLockError.hidden = false;
                    }
                } catch (e) {
                    chestIcon.textContent = '🔒';
                    chestIcon.style.transform = 'none';
                    vaultLockError.textContent = `エラー: ${e.message}`;
                    vaultLockError.hidden = false;
                }
                vaultUnlockBtn.disabled = false;
                vaultUnlockBtn.textContent = '🔓 ロック解除';
            } else {
                // 新規セットアップ
                const confirmPw = vaultMasterPwConfirm.value;
                if (pw.length < MIN_MASTER_PASSWORD_LENGTH) {
                    vaultLockError.textContent = `❌ ${MIN_MASTER_PASSWORD_LENGTH}文字以上にしてください`;
                    vaultLockError.hidden = false;
                    return;
                }
                if (pw !== confirmPw) {
                    vaultLockError.textContent = '❌ パスワードが一致しません';
                    vaultLockError.hidden = false;
                    return;
                }
                const pwStrength = evaluateMasterPassword(pw);
                if (pwStrength.score < MIN_MASTER_PASSWORD_SCORE) {
                    vaultLockError.textContent = '❌ 強度が弱いです。英大小文字・数字・記号を混ぜてください';
                    vaultLockError.hidden = false;
                    return;
                }
                vaultUnlockBtn.disabled = true;
                vaultUnlockBtn.textContent = '🔄 作成中...';
                try {
                    await vault.setup(pw);
                    showToast('ボールトを作成しました！', 'success');
                    showVaultMain();
                } catch (e) {
                    vaultLockError.textContent = `エラー: ${e.message}`;
                    vaultLockError.hidden = false;
                }
                vaultUnlockBtn.disabled = false;
                vaultUnlockBtn.textContent = '🔐 ボールトを作成';
            }
        });
    }

    function showVaultMain() {
        vaultLockScreen.hidden = true;
        vaultMain.hidden = false;
        vaultForm.hidden = true;
        renderVaultEntries();
    }

    // ロック
    if (vaultLockBtn) {
        vaultLockBtn.addEventListener('click', () => {
            vault.lock();
            initVaultUI();
            showToast('ボールトをロックしました', 'info');
        });
    }

    // カテゴリフィルターイベント
    const catBtns = document.querySelectorAll('.pwd-cat-btn');
    catBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            catBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            currentActiveCategory = btn.getAttribute('data-category');
            renderVaultEntries(vaultSearch.value);
        });
    });

    // エントリ一覧レンダリング（カテゴリ絞り込み対応）
    function renderVaultEntries(query = '') {
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
                help.textContent = '下のボタンから追加してください';
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
            const cat = CATEGORIES[entry.category || 'other'];
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
            copyBtn.addEventListener('click', async () => {
                const copied = await copyTextWithPrivacy(entry.password, `${entry.siteName} のパスワードをコピーしました`, card);
                if (!copied) return;
                copyBtn.textContent = '✅';
                setTimeout(() => { copyBtn.textContent = '📋'; }, 1000);
            });

            // 編集ボタン
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-outline-secondary btn-sm';
            editBtn.textContent = '✏️';
            editBtn.title = '編集';
            editBtn.setAttribute('aria-label', `${entry.siteName || 'このエントリ'}を編集`);
            editBtn.addEventListener('click', () => openEditForm(entry));

            // 削除ボタン
            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-outline-danger btn-sm';
            delBtn.textContent = '🗑️';
            delBtn.title = '削除';
            delBtn.setAttribute('aria-label', `${entry.siteName || 'このエントリ'}を削除`);
            delBtn.addEventListener('click', async () => {
                if (!confirm(`「${entry.siteName}」を削除しますか？`)) return;
                try {
                    await vault.deleteEntry(entry.id);
                    renderVaultEntries(vaultSearch.value);
                    showToast('削除しました', 'info');
                } catch (e) {
                    showToast(`削除エラー: ${e.message}`, 'error');
                }
            });

            actions.appendChild(copyBtn);
            actions.appendChild(editBtn);
            actions.appendChild(delBtn);
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
                entry.fields.forEach(f => {
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
                        await copyTextWithPrivacy(f.value, `${f.label} をコピーしました`);
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

    // 検索
    if (vaultSearch) {
        vaultSearch.addEventListener('input', () => {
            if (vault.isUnlocked) renderVaultEntries(vaultSearch.value);
        });
    }

    // ===== 追加/編集フォーム =====
    function openAddForm() {
        vaultMain.hidden = true;
        vaultForm.hidden = false;
        vaultFormTitle.textContent = '新規追加';
        vaultSiteName.value = '';
        vaultCategory.value = 'other'; // 初期化
        vaultPassword.value = '';
        vaultEditId.value = '';
        vaultCustomFields.replaceChildren();
    }

    function openEditForm(entry) {
        vaultMain.hidden = true;
        vaultForm.hidden = false;
        vaultFormTitle.textContent = '編集';
        vaultSiteName.value = entry.siteName;
        vaultCategory.value = entry.category || 'other'; // 編集値ロード
        vaultPassword.value = entry.password;
        vaultEditId.value = entry.id;
        vaultCustomFields.replaceChildren();
        if (entry.fields) {
            entry.fields.forEach(f => addCustomFieldRow(f.label, f.value));
        }
    }

    function addCustomFieldRow(label = '', value = '') {
        const row = document.createElement('div');
        row.className = 'd-flex gap-2 mb-2 vault-field-row';

        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.className = 'pwd-text-input vault-field-label-input';
        labelInput.style.height = '38px';
        labelInput.placeholder = '項目名（例: メアド）';
        labelInput.value = label;

        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.className = 'pwd-text-input';
        valueInput.style.height = '38px';
        valueInput.placeholder = '値';
        valueInput.value = value;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-outline-danger btn-sm';
        removeBtn.style.padding = '0 0.5rem';
        removeBtn.textContent = '✕';
        removeBtn.setAttribute('aria-label', 'この項目を削除');
        removeBtn.addEventListener('click', () => row.remove());

        row.appendChild(labelInput);
        row.appendChild(valueInput);
        row.appendChild(removeBtn);
        vaultCustomFields.appendChild(row);
    }

    if (vaultAddBtn) vaultAddBtn.addEventListener('click', openAddForm);
    if (vaultAddFieldBtn) vaultAddFieldBtn.addEventListener('click', () => addCustomFieldRow());

    // パスワードフィールド表示切替
    document.querySelectorAll('.vault-field-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            if (input) {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                btn.textContent = isPassword ? '🙈' : '👁️';
            }
        });
    });

    // 保存
    const submitVaultForm = async () => {
        const siteName = vaultSiteName.value.trim();
        const password = vaultPassword.value;
        const category = vaultCategory.value;

        if (!siteName) { showToast('サイト名を入力してください', 'error'); return; }
        if (!password) { showToast('パスワードを入力してください', 'error'); return; }

        // カスタムフィールド収集
        const fields = [];
        vaultCustomFields.querySelectorAll('.vault-field-row').forEach(row => {
            const inputs = row.querySelectorAll('input');
            const label = inputs[0]?.value.trim();
            const value = inputs[1]?.value.trim();
            if (label && value) fields.push({ label, value });
        });

        try {
            const editId = vaultEditId.value;
            if (editId) {
                await vault.updateEntry(editId, { siteName, password, category, fields });
                showToast('更新しました！', 'success');
            } else {
                await vault.addEntry({ siteName, password, category, fields });
                showToast('追加しました！', 'success');
            }
            showVaultMain();
        } catch (e) {
            showToast(`保存エラー: ${e.message}`, 'error');
        }
    };

    if (vaultSaveBtn) {
        vaultSaveBtn.addEventListener('click', submitVaultForm);
    }
    const handleVaultFormEnter = (e) => {
        if (e.key !== 'Enter') return;
        if (!(e.target instanceof HTMLInputElement)) return;
        e.preventDefault();
        submitVaultForm();
    };
    if (vaultSiteName) vaultSiteName.addEventListener('keydown', handleVaultFormEnter);
    if (vaultPassword) vaultPassword.addEventListener('keydown', handleVaultFormEnter);
    if (vaultCustomFields) vaultCustomFields.addEventListener('keydown', handleVaultFormEnter);

    // キャンセル
    if (vaultCancelBtn) vaultCancelBtn.addEventListener('click', showVaultMain);

    // 全削除
    if (vaultDestroyBtn) {
        vaultDestroyBtn.addEventListener('click', () => {
            if (!confirm('⚠️ ボールトの全データを完全に削除しますか？\nこの操作は元に戻せません。')) return;
            if (!confirm('本当に削除しますか？（最終確認）')) return;
            vault.destroy();
            pendingImportNotice = false;
            initVaultUI();
            showToast('ボールトを削除しました', 'info');
        });
    }

    if (vaultResetCorruptBtn) {
        vaultResetCorruptBtn.addEventListener('click', () => {
            if (!confirm('壊れた可能性のあるボールトデータを初期化します。続行しますか？')) return;
            vault.destroy();
            pendingImportNotice = false;
            initVaultUI();
            showToast('ボールトデータを初期化しました', 'info');
        });
    }

    // エクスポート (暗号インポート・エクスポートUX強化 B4)
    if (vaultExportBtn) {
        vaultExportBtn.addEventListener('click', () => {
            try {
                const data = vault.exportEncrypted();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `password-vault-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('🔑 ボールトをエクスポートしました', 'success');
            } catch (e) { showToast(`エクスポートエラー: ${e.message}`, 'error'); }
        });
    }

    // インポート
    if (vaultImportInput) {
        vaultImportInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const fileKb = (file.size / 1024).toFixed(1);
                const ok = confirm(`「${file.name}」(${fileKb} KB) をインポートします。\n現在のボールトデータは置き換えられます。続行しますか？`);
                if (!ok) {
                    e.target.value = '';
                    return;
                }
                const text = await file.text();
                vault.importEncrypted(text);
                pendingImportNotice = true;
                initVaultUI();
                showToast('🔑 インポートが成功しました！ロック解除後に反映されます。', 'success');
            } catch (err) {
                showToast(`インポートエラー: ${err.message}`, 'error');
            }
            e.target.value = '';
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
