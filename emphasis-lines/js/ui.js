import { store } from './state.js?v=20260613-2';
import { BatchManager } from './managers/BatchManager.js?v=20260613-2';
import { ImageService } from './services/ImageService.js?v=20260613-2';
import { ExportService } from './services/ExportService.js?v=20260613-2';
import { AnalyticsManager } from './utils/analytics.js?v=20260613-2';
import { TOAST_DURATION_MS, DEBOUNCE_RESIZE_MS, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from './constants.js?v=20260613-2';

/**
 * CSS class constants for button states
 */
const BUTTON_CLASSES = {
    active: ['bg-blue-600', 'text-white', 'shadow'],
    inactive: ['text-gray-300', 'hover:bg-gray-600']
};

export class UIManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.els = this.#initializeElements();
        this.isDragging = false;
        this._sliderTooltip = null; // ツールチップ要素
        this._pinchStartDist = 0;  // ピンチズーム初期距離
        this._historyCaptureActive = false;

        this.#setupEventListeners();
        this.#subscribeToStore();
        this.#setupSliderTooltips();
        this.#setupPinchZoom();
        this.#updateHistoryUI();
        this.#checkFirstVisit();

        // Initialize BatchManager
        const lineCanvas = document.getElementById('lineCanvas');
        const bgCanvas = document.getElementById('bgCanvas');
        this.batchManager = new BatchManager(renderer, lineCanvas, bgCanvas);
    }

    /**
     * Initialize DOM element references
     */
    #initializeElements() {
        const els = {
            canvasWrapper: document.getElementById('canvasWrapper'),
            fileInput: document.getElementById('fileInput'),
            centerPoint: document.getElementById('centerPoint'),
            loading: document.getElementById('loadingOverlay'),
            helpModal: document.getElementById('helpModal'),
            helpModalContent: document.getElementById('helpModalContent'),
            btnHelp: document.getElementById('btnHelp'),
            btnCloseHelp: document.getElementById('btnCloseHelp'),
            btnHelpDone: document.getElementById('btnHelpDone'),
            btnExport: document.getElementById('btnExport'),
            btnExportSVG: document.getElementById('btnExportSVG'),
            btnUndo: document.getElementById('btnUndo'),
            btnRedo: document.getElementById('btnRedo'),
            gradientToggle: document.getElementById('toggleGradient'),
            endColor: document.getElementById('paramEndColor'),
            toggleAdvanced: document.getElementById('toggleAdvanced'),
            groupAdvanced: document.getElementById('groupAdvanced'),
            iconAdvanced: document.getElementById('iconAdvanced'),
            inputs: {
                count: document.getElementById('paramCount'),
                width: document.getElementById('paramWidth'),
                minLen: document.getElementById('paramMinLen'),
                maxLen: document.getElementById('paramMaxLen'),
                color: document.getElementById('paramColor'),
                colorHex: document.getElementById('paramColorHex'),
                whiteBorder: document.getElementById('paramWhiteBorder'),
                randomness: document.getElementById('paramRandom'),
                direction: document.getElementById('paramDirection'),
                aperture: document.getElementById('paramAperture'),
                taper: document.getElementById('paramTaper'),
            },
            displays: {
                count: document.getElementById('valCount'),
                width: document.getElementById('valWidth'),
                minLen: document.getElementById('valMinLen'),
                maxLen: document.getElementById('valMaxLen'),
                color: document.getElementById('valColor'),
                randomness: document.getElementById('valRandom'),
                zoom: document.getElementById('zoomLabel'),
                direction: document.getElementById('valDirection'),
                aperture: document.getElementById('valAperture'),
                taper: document.getElementById('valTaper'),
            },
            // Batch UI Elements
            btnBatchGenerate: document.getElementById('btnBatchGenerate'),
            paramBatchCount: document.getElementById('paramBatchCount'),
            valBatchCount: document.getElementById('valBatchCount'),
            paramBatchTheme: document.getElementById('paramBatchTheme'),
            batchProgress: document.getElementById('batchProgress'),
            batchProgressBar: document.getElementById('batchProgressBar'),
            batchProgressText: document.getElementById('batchProgressText'),
        };

        // 必須要素のNull チェック
        this.#validateRequiredElements(els);

        return els;
    }

    /**
     * 必須DOM要素の存在を検証し、欠落があれば警告を出力
     * @param {Object} els - 要素オブジェクト
     */
    #validateRequiredElements(els) {
        const requiredIds = [
            'canvasWrapper', 'fileInput', 'centerPoint', 'loading',
            'btnExport', 'btnExportSVG', 'btnUndo', 'btnRedo',
            'gradientToggle', 'endColor', 'toggleAdvanced', 'groupAdvanced'
        ];

        const missing = requiredIds.filter(id => !els[id]);

        if (missing.length > 0) {
            console.error(`[UIManager] Required DOM elements not found: ${missing.join(', ')}`);
        }

        // 入力要素のチェック
        const missingInputs = Object.entries(els.inputs)
            .filter(([_, el]) => !el)
            .map(([key]) => `input:${key}`);

        if (missingInputs.length > 0) {
            console.warn(`[UIManager] Optional input elements not found: ${missingInputs.join(', ')}`);
        }
    }

    /**
     * Subscribe to store changes
     */
    #subscribeToStore() {
        store.subscribe((state, changedKeys) => {
            const renderKeys = ['params', 'type', 'snapshot', 'seed', 'centerX', 'centerY'];
            if (changedKeys.some(k => renderKeys.includes(k))) {
                this.updateInputValues(state);
                requestAnimationFrame(() => this.renderer.render(state));
            }
            if (changedKeys.includes('history')) {
                this.#updateHistoryUI();
            }
            if (changedKeys.includes('mode')) {
                this.#updateButtonGroupUI('.mode-btn', 'mode', state.mode);
            }
        });
    }

    /**
     * Setup all event listeners (delegated to category-specific methods)
     */
    #setupEventListeners() {
        this.#setupInputListeners();
        this.#setupButtonListeners();
        this.#setupCanvasListeners();
        this.#setupModalListeners();
        this.#setupFileListeners();
        this.#setupKeyboardListeners();

        // パルスアニメーション：最初の操作で停止
        const uploadLabel = document.getElementById('imageUploadLabel');
        if (uploadLabel) {
            const stopPulse = () => {
                uploadLabel.classList.add('no-pulse');
                document.removeEventListener('pointerdown', stopPulse);
            };
            document.addEventListener('pointerdown', stopPulse);
        }
    }

    /**
     * Setup input (slider/checkbox) event listeners
     */
    #setupInputListeners() {
        Object.entries(this.els.inputs).forEach(([key, input]) => {
            if (!input) return;

            // Skip colorHex - handled separately
            if (key === 'colorHex') return;

            input.addEventListener('pointerdown', () => this.#beginHistoryCapture());
            input.addEventListener('focus', () => this.#beginHistoryCapture());
            input.addEventListener('blur', () => this.#endHistoryCapture());

            input.addEventListener('input', () => {
                const val = input.type === 'checkbox' ? input.checked : input.value;
                store.updateParams({ [key]: val }, false);
                this.#updateDisplays(key, val);
                // Sync HEX input when color picker changes
                if (key === 'color' && this.els.inputs.colorHex) {
                    this.els.inputs.colorHex.value = val.toUpperCase();
                }
            });

            input.addEventListener('change', () => {
                const val = input.type === 'checkbox' ? input.checked : input.value;
                store.updateParams({ [key]: val }, false);
                this.#endHistoryCapture();
            });
        });

        // HEX color input handler
        const hexInput = this.els.inputs.colorHex;
        if (hexInput) {
            hexInput.addEventListener('pointerdown', () => this.#beginHistoryCapture());
            hexInput.addEventListener('focus', () => this.#beginHistoryCapture());
            hexInput.addEventListener('blur', () => this.#endHistoryCapture());

            hexInput.addEventListener('input', () => {
                let val = hexInput.value.trim().toUpperCase();
                // Auto-add # if missing
                if (val && !val.startsWith('#')) {
                    val = '#' + val;
                }
                // Validate hex color format
                if (/^#[0-9A-F]{6}$/i.test(val)) {
                    store.updateParams({ color: val }, false);
                    if (this.els.inputs.color) {
                        this.els.inputs.color.value = val;
                    }
                    this.#updateDisplays('color', val);
                }
            });
            hexInput.addEventListener('change', () => {
                let val = hexInput.value.trim().toUpperCase();
                if (val && !val.startsWith('#')) {
                    val = '#' + val;
                }
                if (/^#[0-9A-F]{6}$/i.test(val)) {
                    store.updateParams({ color: val }, false);
                    this.#endHistoryCapture();
                }
            });
        }

        this.#setupGradientControls();
    }

    /**
     * パラメータ編集前の状態を1回だけ履歴に保存する
     */
    #beginHistoryCapture() {
        if (this._historyCaptureActive) return;
        store.pushHistory(true);
        this._historyCaptureActive = true;
    }

    /**
     * パラメータ編集の履歴保存区間を終了する
     */
    #endHistoryCapture() {
        this._historyCaptureActive = false;
    }

    /**
     * グラデーション入力を状態へ接続する
     */
    #setupGradientControls() {
        const toggle = this.els.gradientToggle;
        const endColor = this.els.endColor;
        if (!toggle || !endColor) return;

        const applyGradient = () => {
            const value = toggle.checked ? endColor.value : '';
            endColor.disabled = !toggle.checked;
            store.updateParams({ endColor: value }, false);
        };

        toggle.addEventListener('pointerdown', () => this.#beginHistoryCapture());
        toggle.addEventListener('focus', () => this.#beginHistoryCapture());
        toggle.addEventListener('change', () => {
            applyGradient();
            this.#endHistoryCapture();
        });

        endColor.addEventListener('pointerdown', () => this.#beginHistoryCapture());
        endColor.addEventListener('focus', () => this.#beginHistoryCapture());
        endColor.addEventListener('input', () => {
            if (toggle.checked) {
                store.updateParams({ endColor: endColor.value }, false);
            }
        });
        endColor.addEventListener('change', () => {
            if (toggle.checked) {
                store.updateParams({ endColor: endColor.value }, false);
            }
            this.#endHistoryCapture();
        });
        endColor.addEventListener('blur', () => this.#endHistoryCapture());

        applyGradient();
    }

    /**
     * Setup button event listeners
     */
    #setupButtonListeners() {
        // Type Buttons
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                store.setPreset(type);
                this.#updateButtonGroupUI('.type-btn', 'type', type);
                AnalyticsManager.trackEvent('change_line_type', { type });
            });
        });

        // Mode Buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.#handleModeChange(btn.dataset.mode));
        });

        // Canvas Preset
        const canvasPreset = document.getElementById('canvasPreset');
        if (canvasPreset) {
            canvasPreset.addEventListener('change', () => {
                const size = ImageService.parseCanvasPreset(canvasPreset.value);
                if (size) this.#resizeCanvas(size.width, size.height);
            });
        }

        // Advanced Toggle
        this.els.toggleAdvanced.addEventListener('click', () => {
            const isHidden = this.els.groupAdvanced.classList.toggle('hidden');
            this.els.iconAdvanced.classList.toggle('rotate-180');
            this.els.toggleAdvanced.setAttribute('aria-expanded', !isHidden);
        });

        // Regenerate Button
        const btnRegenerate = document.getElementById('btnRegenerate');
        if (btnRegenerate) {
            btnRegenerate.addEventListener('click', () => store.rotateSeed());
        }

        // View Controls
        document.getElementById('btnZoomIn').addEventListener('click', () => this.#updateZoom(0.1));
        document.getElementById('btnZoomOut').addEventListener('click', () => this.#updateZoom(-0.1));
        document.getElementById('btnFit').addEventListener('click', () => this.centerView());

        // Undo/Redo
        this.els.btnUndo.addEventListener('click', () => store.undo());
        this.els.btnRedo.addEventListener('click', () => store.redo());

        // Export with success toast
        this.els.btnExport.addEventListener('click', () => this.#exportImage());
        this.els.btnExportSVG.addEventListener('click', () => this.#exportSVG());

        // Preset Color Buttons
        document.querySelectorAll('.color-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                if (color) {
                    store.updateParams({ color }, true);
                    // Update color input visually
                    if (this.els.inputs.color) {
                        this.els.inputs.color.value = color;
                    }
                    this.#updateDisplays('color', color);
                    // Update preset button selection
                    this.#updatePresetColorSelection(color);
                }
            });
        });


        // Batch Generation
        if (this.els.btnBatchGenerate) {
            this.els.btnBatchGenerate.addEventListener('click', async () => {
                const count = parseInt(this.els.paramBatchCount.value, 10);
                const themeKey = this.els.paramBatchTheme ? this.els.paramBatchTheme.value : '';

                this.els.btnBatchGenerate.disabled = true;
                this.els.batchProgress.classList.remove('hidden');

                // Progress callback
                this.batchManager.onProgress = (current, total) => {
                    const percent = Math.round((current / total) * 100);
                    this.els.batchProgressBar.style.width = `${percent}%`;
                    this.els.batchProgressText.textContent = `${current}/${total} 枚生成中...`;
                };

                try {
                    await this.batchManager.downloadAsZip({
                        count,
                        themeKey: themeKey || null,
                        width: 3840, // 4K resolution
                        height: 2160
                    }, `emphasis_materials_${themeKey ? themeKey.toLowerCase() : 'random'}_vol1`);

                    this.#showToast(`${count}枚の素材生成が完了しました！`, 'success');
                } catch (error) {
                    console.error(error);
                    this.#showToast('生成中にエラーが発生しました', 'error');
                } finally {
                    this.els.btnBatchGenerate.disabled = false;
                    setTimeout(() => {
                        this.els.batchProgress.classList.add('hidden');
                        this.els.batchProgressBar.style.width = '0%';
                    }, 2000);
                }
            });
        }

        // Batch Slider
        if (this.els.paramBatchCount) {
            this.els.paramBatchCount.addEventListener('input', (e) => {
                this.els.valBatchCount.textContent = `${e.target.value}枚`;
            });
        }

        // Window Resize
        window.addEventListener('resize', () => {
            // Debounce slightly
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => {
                this.centerView();
            }, 100);
        });
    }

    /**
     * Setup canvas interaction listeners
     */
    #setupCanvasListeners() {
        const lineCanvas = document.getElementById('lineCanvas');

        lineCanvas.addEventListener('pointerdown', (e) => {
            this.isDragging = true;
            store.pushHistory(true);
            lineCanvas.setPointerCapture(e.pointerId);
            this.#moveCenter(e);
        });

        lineCanvas.addEventListener('pointermove', (e) => {
            if (this.isDragging) this.#moveCenter(e);
        });

        lineCanvas.addEventListener('pointerup', () => {
            if (this.isDragging) {
                this.isDragging = false;
            }
        });
    }

    /**
     * Setup modal (help) listeners
     */
    #setupModalListeners() {
        this.els.btnHelp.addEventListener('click', () => this.#toggleHelp(true));
        this.els.btnCloseHelp.addEventListener('click', () => this.#toggleHelp(false));
        this.els.btnHelpDone.addEventListener('click', () => this.#toggleHelp(false));

        // バックドロップ（モーダル外）クリックで閉じる
        this.els.helpModal.addEventListener('click', (e) => {
            if (e.target === this.els.helpModal) {
                this.#toggleHelp(false);
            }
        });
    }

    /**
     * Setup file input listeners
     */
    #setupFileListeners() {
        this.els.fileInput.addEventListener('change', (e) => this.#handleFileSelect(e));

        // Drag & Drop support
        const dropZone = document.getElementById('imageUploadLabel');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-green-400', 'bg-green-900');
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('border-green-400', 'bg-green-900');
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-green-400', 'bg-green-900');
                const file = e.dataTransfer?.files[0];
                if (file && file.type.startsWith('image/')) {
                    this.#loadImageFile(file);
                }
            });
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    #setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            // Escape: ヘルプモーダルを閉じる
            if (e.key === 'Escape') {
                this.#toggleHelp(false);
                return;
            }
            // Ctrl+Z: Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                store.undo();
            }
            // Ctrl+Y or Ctrl+Shift+Z: Redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                store.redo();
            }
            // Ctrl+S: Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.#exportImage();
            }
        });
    }

    /**
     * Handle mode change (composite/lines)
     */
    #handleModeChange(mode) {
        store.setState({ mode }, true);

        const canvasSizeGroup = document.getElementById('canvasSizeGroup');
        if (canvasSizeGroup) {
            canvasSizeGroup.classList.toggle('hidden', mode !== 'lines');
        }

        if (mode === 'composite') {
            this.renderer.drawPlaceholder(store.getState());
        } else {
            const { width, height } = this.renderer.bgCanvas;
            this.renderer.ctxBg.clearRect(0, 0, width, height);
        }

        this.renderer.render(store.getState());

        // Update mode description
        const modeDesc = document.getElementById('modeDesc');
        if (modeDesc) {
            const isEn = document.documentElement.lang === 'en';
            modeDesc.textContent = mode === 'composite'
                ? (isEn ? 'Combine an image and the generated lines into one file.' : '画像を背景にして、線と合成した1枚の画像を作成します。')
                : (isEn ? 'Export lines only on a transparent background.' : '背景を透明にして、線のみのPNG画像を作成します。');
        }
    }

    /**
     * Update button group UI (DRY helper for type/mode buttons)
     * @param {string} selector - CSS selector for buttons
     * @param {string} dataKey - data attribute key (e.g., 'type', 'mode')
     * @param {string} activeValue - currently active value
     */
    #updateButtonGroupUI(selector, dataKey, activeValue) {
        document.querySelectorAll(selector).forEach(btn => {
            const isActive = btn.dataset[dataKey] === activeValue;

            BUTTON_CLASSES.active.forEach(cls => btn.classList.toggle(cls, isActive));
            BUTTON_CLASSES.inactive.forEach(cls => btn.classList.toggle(cls, !isActive));
        });
    }

    /**
     * Update input values from state
     */
    updateInputValues(state) {
        const { params } = state;
        Object.entries(this.els.inputs).forEach(([key, input]) => {
            if (!input) return;

            // colorHex syncs with color, not a separate param
            if (key === 'colorHex') {
                input.value = params.color?.toUpperCase() || '#000000';
                return;
            }

            const val = params[key];
            if (input.type === 'checkbox') {
                input.checked = val;
            } else {
                input.value = val;
            }
            this.#updateDisplays(key, val);
        });

        // Logic for hiding aperture in speed mode
        const grpAp = document.getElementById('groupAperture');
        grpAp?.classList.toggle('hidden', state.type === 'speed');

        // Update Center Point
        this.els.centerPoint.style.left = `${state.centerX * 100}%`;
        this.els.centerPoint.style.top = `${state.centerY * 100}%`;
        this.els.centerPoint.style.display = (state.type === 'speed') ? 'none' : 'block';

        if (this.els.gradientToggle && this.els.endColor) {
            const hasGradient = Boolean(params.endColor);
            this.els.gradientToggle.checked = hasGradient;
            this.els.endColor.disabled = !hasGradient;
            if (hasGradient) {
                this.els.endColor.value = params.endColor;
            }
        }

        // 中心点の座標表示を更新
        const coordsEl = document.getElementById('centerCoords');
        if (coordsEl) {
            coordsEl.textContent = `${Math.round(state.centerX * 100)}%, ${Math.round(state.centerY * 100)}%`;
        }
    }

    /**
     * Update display values next to sliders
     */
    #updateDisplays(key, val) {
        const display = this.els.displays[key];
        if (!display) return;

        let suffix = '';
        if (['direction', 'aperture', 'angle'].includes(key)) suffix = '°';
        else if (['minLen', 'maxLen', 'randomness', 'taper'].includes(key)) suffix = '%';

        display.textContent = key === 'color' ? val : val + suffix;
    }

    /**
     * Update type button UI
     */
    updateTypeUI(type) {
        this.#updateButtonGroupUI('.type-btn', 'type', type);
    }

    /**
     * Update history (undo/redo) button states
     */
    #updateHistoryUI() {
        this.els.btnUndo.disabled = !store.canUndo();
        this.els.btnRedo.disabled = !store.canRedo();
    }

    /**
     * Resize the canvas
     */
    #resizeCanvas(w, h) {
        store.setState({ imgWidth: w, imgHeight: h }, true);

        this.renderer.bgCanvas.width = w;
        this.renderer.bgCanvas.height = h;
        this.renderer.lineCanvas.width = w;
        this.renderer.lineCanvas.height = h;
        this.els.canvasWrapper.style.width = `${w}px`;
        this.els.canvasWrapper.style.height = `${h}px`;

        this.renderer.ctxBg.clearRect(0, 0, w, h);
        this.renderer.render(store.getState());
        this.centerView();
    }

    /**
     * Move the center point based on pointer position
     */
    #moveCenter(e) {
        const rect = this.renderer.lineCanvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        store.setState({ centerX: x, centerY: y });
    }

    /**
     * Update zoom level
     */
    #updateZoom(delta) {
        const { zoom } = store.getState();
        const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom + delta));
        store.setState({ zoom: z });
        this.#applyZoom(z);
    }

    /**
     * Center and fit the view
     */
    centerView() {
        const c = this.els.canvasWrapper.parentElement;
        const { imgWidth, imgHeight } = store.getState();
        const wr = (c.clientWidth - 40) / imgWidth;
        const hr = (c.clientHeight - 40) / imgHeight;
        const z = Math.min(wr, hr, 1.0);
        store.setState({ zoom: z });
        this.#applyZoom(z);
    }

    /**
     * Apply zoom transform
     */
    #applyZoom(zoom) {
        this.els.canvasWrapper.style.transform = `scale(${zoom})`;
        this.els.displays.zoom.textContent = `${Math.round(zoom * 100)}%`;
    }

    /**
     * Handle file selection with error feedback
     */
    async #handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        await this.#loadImageFile(file);
    }

    /**
     * Load image file (shared by file input and drag & drop)
     */
    async #loadImageFile(file) {
        this.els.loading.classList.remove('hidden');

        try {
            const loaded = await ImageService.loadImage(file);
            this.#finishLoad(loaded.image, loaded.width, loaded.height);
            if (loaded.resized) {
                this.#showToast(`長辺を${loaded.width}×${loaded.height}に縮小しました（上限2048px）。`, 'info');
            }
        } catch (error) {
            console.error('Failed to load image:', error);
            this.#showLoadError(error.message);
        } finally {
            this.els.loading.classList.add('hidden');
        }
    }

    /**
     * Show error message to user with recovery guidance
     */
    #showLoadError(message) {
        const uploadLabel = document.getElementById('imageUploadLabel');
        if (uploadLabel) {
            uploadLabel.classList.remove('no-pulse', 'border-blue-500', 'bg-blue-900', 'border-green-500', 'bg-green-900');
            uploadLabel.classList.add('border-red-500', 'bg-red-900');

            const iconEl = uploadLabel.querySelector('i');
            const textEl = uploadLabel.querySelector('.text-sm');
            const subTextEl = uploadLabel.querySelector('.text-xs');

            if (iconEl) {
                iconEl.className = 'ph ph-warning-circle text-2xl text-red-400 mb-1';
            }
            if (textEl) {
                textEl.textContent = `読み込みエラー: ${message}`;
                textEl.className = 'text-sm font-medium text-red-300';
            }
            if (subTextEl) {
                subTextEl.textContent = 'JPEGまたはPNG画像をお試しください。クリックで再選択できます。';
                subTextEl.className = 'text-xs text-red-400 mt-1';
            }
        }
        this.#showToast('画像の読み込みに失敗しました。別の画像をお試しください。', 'error');
    }

    /**
     * Finish image load process
     */
    #finishLoad(imgObj, w, h) {
        store.setState({
            image: imgObj,
            imgWidth: w,
            imgHeight: h,
            mode: 'composite'
        }, true);

        this.renderer.bgCanvas.width = w;
        this.renderer.bgCanvas.height = h;
        this.renderer.lineCanvas.width = w;
        this.renderer.lineCanvas.height = h;
        this.els.canvasWrapper.style.width = `${w}px`;
        this.els.canvasWrapper.style.height = `${h}px`;

        this.#updateButtonGroupUI('.mode-btn', 'mode', 'composite');
        this.renderer.drawPlaceholder(store.getState());
        this.renderer.render(store.getState());
        this.centerView();

        this.#updateUploadLabelSuccess(w, h);
        AnalyticsManager.trackEvent('load_image_success', { width: w, height: h });
    }

    /**
     * Update upload label to show success state
     */
    #updateUploadLabelSuccess(w, h) {
        const uploadLabel = document.getElementById('imageUploadLabel');
        if (!uploadLabel) return;

        uploadLabel.classList.remove('no-pulse', 'border-blue-500', 'bg-blue-900', 'border-red-500', 'bg-red-900');
        uploadLabel.classList.add('border-green-500', 'bg-green-900');

        const iconEl = uploadLabel.querySelector('i');
        const textEl = uploadLabel.querySelector('.text-sm');
        const subTextEl = uploadLabel.querySelector('.text-xs');

        if (iconEl) {
            iconEl.className = 'ph ph-check-circle text-2xl text-green-400 mb-1';
        }
        if (textEl) {
            textEl.textContent = `画像読み込み完了！ (${w} x ${h})`;
            textEl.className = 'text-sm font-medium text-green-300';
        }
        if (subTextEl) {
            subTextEl.textContent = 'クリックで別の画像に変更';
        }
    }

    /**
     * Toggle help modal
     */
    #toggleHelp(show) {
        if (show) {
            this._previousFocus = document.activeElement;
            this.els.helpModal.classList.remove('hidden');
            requestAnimationFrame(() => {
                this.els.helpModal.classList.remove('opacity-0');
                this.els.helpModalContent.classList.remove('scale-95');
            });
            // フォーカストラップ: モーダル内に閉じ込める
            this.els.helpModalContent.addEventListener('keydown', this._focusTrapHandler = (e) => {
                if (e.key !== 'Tab') return;
                const focusable = this.els.helpModalContent.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            });
            // 閉じるボタンにフォーカス
            this.els.btnCloseHelp?.focus();
        } else {
            this.els.helpModal.classList.add('opacity-0');
            this.els.helpModalContent.classList.add('scale-95');
            setTimeout(() => this.els.helpModal.classList.add('hidden'), 200);
            // フォーカストラップ解除
            if (this._focusTrapHandler) {
                this.els.helpModalContent.removeEventListener('keydown', this._focusTrapHandler);
                this._focusTrapHandler = null;
            }
            // 前のフォーカスに戻る
            this._previousFocus?.focus();
        }
    }

    /**
     * Export image using ExportService
     */
    async #exportImage() {
        const state = store.getState();

        const success = await ExportService.exportImage({
            lineCanvas: this.renderer.lineCanvas,
            image: state.image,
            width: state.imgWidth,
            height: state.imgHeight,
            mode: state.mode,
            type: state.type,
            onError: (message) => this.#showToast(`保存失敗: ${message}`, 'error')
        });

        if (success) {
            this.#showToast('画像を保存しました！', 'success');
            AnalyticsManager.trackEvent('export_image', {
                type: state.type,
                mode: state.mode,
                count: state.params.count
            });
        }
    }

    /**
     * SVG形式で保存する
     */
    #exportSVG() {
        const state = store.getState();

        const success = ExportService.exportSVG({
            lineCanvas: this.renderer.lineCanvas,
            width: state.imgWidth,
            height: state.imgHeight,
            type: state.type,
            onError: (message) => this.#showToast(`SVG保存失敗: ${message}`, 'error')
        });

        if (success) {
            const isEn = document.documentElement.lang === 'en';
            this.#showToast(isEn
                ? 'Saved an SVG wrapper around a PNG of the lines. The background image is not included.'
                : '線のPNGを包んだSVGを保存しました。合成した背景画像は入りません。', 'success');
            AnalyticsManager.trackEvent('export_svg', {
                type: state.type,
                count: state.params.count
            });
        }
    }

    /**
     * Update preset color button selection
     */
    #updatePresetColorSelection(selectedColor) {
        document.querySelectorAll('.color-preset').forEach(btn => {
            const isSelected = btn.dataset.color === selectedColor;
            btn.classList.toggle('active', isSelected);
            btn.classList.toggle('border-gray-600', !isSelected);
        });
    }

    /**
     * スライダーツールチップの初期化
     * スライダー操作中に値をポップアップ表示する
     */
    #setupSliderTooltips() {
        // ツールチップ要素を1つ作成して再利用
        const tooltip = document.createElement('div');
        tooltip.className = 'slider-tooltip';
        document.body.appendChild(tooltip);
        this._sliderTooltip = tooltip;

        const allSliders = document.querySelectorAll('input[type="range"]');
        allSliders.forEach(slider => {
            slider.addEventListener('input', () => this.#showSliderTooltip(slider));
            slider.addEventListener('pointerdown', () => this.#showSliderTooltip(slider));
            slider.addEventListener('pointerup', () => this.#hideSliderTooltip());
            slider.addEventListener('change', () => this.#hideSliderTooltip());
        });
    }

    #showSliderTooltip(slider) {
        const tooltip = this._sliderTooltip;
        if (!tooltip) return;

        const rect = slider.getBoundingClientRect();
        const ratio = (slider.value - slider.min) / (slider.max - slider.min);
        const thumbX = rect.left + ratio * rect.width;

        tooltip.textContent = slider.value;
        tooltip.style.left = `${thumbX}px`;
        tooltip.style.top = `${rect.top - 4}px`;
        tooltip.classList.add('visible');
    }

    #hideSliderTooltip() {
        if (this._sliderTooltip) {
            this._sliderTooltip.classList.remove('visible');
        }
    }

    /**
     * ピンチズーム対応
     */
    #setupPinchZoom() {
        const container = document.getElementById('canvasContainer');
        if (!container) return;

        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                this._pinchStartDist = this.#getTouchDistance(e.touches);
            }
        }, { passive: false });

        container.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const dist = this.#getTouchDistance(e.touches);
                const scale = dist / this._pinchStartDist;
                if (scale > 1.05) {
                    this.#updateZoom(0.05);
                    this._pinchStartDist = dist;
                } else if (scale < 0.95) {
                    this.#updateZoom(-0.05);
                    this._pinchStartDist = dist;
                }
            }
        }, { passive: false });
    }

    #getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 初回訪問チェック: 操作を遮る自動モーダルは表示しない
     */
    #checkFirstVisit() {
        const key = 'emphasislines_visited';
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, '1');
        }
    }

    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - 'success', 'error', or 'info'
     */
    #showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');

        const bgColor = {
            success: 'bg-green-600',
            error: 'bg-red-600',
            info: 'bg-blue-600'
        }[type] || 'bg-blue-600';

        const iconClass = {
            success: 'ph-check-circle',
            error: 'ph-x-circle',
            info: 'ph-info'
        }[type] || 'ph-info';

        toast.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 transform transition-all duration-300 translate-y-4 opacity-0`;

        // XSS-safe DOM construction
        const icon = document.createElement('i');
        icon.className = `ph-fill ${iconClass} text-xl`;
        const span = document.createElement('span');
        span.className = 'font-medium';
        span.textContent = message;
        toast.appendChild(icon);
        toast.appendChild(span);

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-4', 'opacity-0');
        });

        // Remove after delay
        setTimeout(() => {
            toast.classList.add('translate-y-4', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, TOAST_DURATION_MS);
    }
}
