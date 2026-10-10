import { store } from './state.js?v=20260613-2';
import { LineRenderer } from './renderers/renderer.js?v=20260613-2';
import { UIManager } from './ui.js?v=20260613-2';
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from './constants.js?v=20260613-2';

// Init Logic
document.addEventListener('DOMContentLoaded', () => {

    // 1. Setup Canvas
    const bgCanvas = document.getElementById('bgCanvas');
    const lineCanvas = document.getElementById('lineCanvas');

    // Initial size (matched with default state)
    bgCanvas.width = DEFAULT_CANVAS_WIDTH;
    bgCanvas.height = DEFAULT_CANVAS_HEIGHT;
    lineCanvas.width = DEFAULT_CANVAS_WIDTH;
    lineCanvas.height = DEFAULT_CANVAS_HEIGHT;

    // 2. Initialize Subsystems
    const renderer = new LineRenderer(lineCanvas, bgCanvas);
    const ui = new UIManager(renderer); // UI manages subscriptions to store

    // 3. Initial Render
    // Set initial size styles
    const cw = document.getElementById('canvasWrapper');
    cw.style.width = `${DEFAULT_CANVAS_WIDTH}px`;
    cw.style.height = `${DEFAULT_CANVAS_HEIGHT}px`;

    // Trigger initial UI update and first render
    const initialState = store.getState();
    ui.updateInputValues(initialState);
    ui.updateTypeUI(initialState.type);
    // Note: Mode UI is synchronized via store subscription in UIManager
    ui.centerView();

    renderer.drawPlaceholder(initialState);
    renderer.render(initialState);

    // 4. データ保護 (beforeunload) — 画像ファイルがアップロード済みの場合のみ警告
    const fileInput = document.getElementById('fileInput');
    let hasUploadedFile = false;
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            hasUploadedFile = fileInput.files && fileInput.files.length > 0;
        });
    }
    window.addEventListener('beforeunload', (e) => {
        if (hasUploadedFile) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // 5. Admin panel control (batch generation)
    const isAdmin = new URLSearchParams(window.location.search).has('admin');
    const batchPanel = document.getElementById('batchPanel');
    if (batchPanel && isAdmin) {
        batchPanel.style.display = '';
    }
});

// Service Worker 登録 (PWA)
if ('serviceWorker' in navigator) {
    const register = () => {
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
            .then(reg => {
                if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
                    console.log('[SW] Registered:', reg.scope);
                }
            })
            .catch(err => {
                console.warn('[SW] Registration failed:', err);
            });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', register, { once: true });
    else register();
}
