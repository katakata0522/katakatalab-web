import { TOAST_DURATION_MS } from '../constants.js?v=20261010-1';

/**
 * ToastManager - トースト通知を担当
 * UIManagerから分離された通知ロジック
 */
export class ToastManager {
    constructor() {
        this.container = document.getElementById('toastContainer');
    }

    /**
     * トースト通知を表示
     * @param {string} message - メッセージ
     * @param {'success'|'error'|'info'} type - タイプ
     */
    show(message, type = 'info') {
        if (!this.container) return;

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

        this.container.appendChild(toast);

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

    /**
     * 成功トーストを表示
     */
    success(message) {
        this.show(message, 'success');
    }

    /**
     * エラートーストを表示
     */
    error(message) {
        this.show(message, 'error');
    }

    /**
     * 情報トーストを表示
     */
    info(message) {
        this.show(message, 'info');
    }
}
