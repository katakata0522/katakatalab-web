/**
 * toast.js
 * トースト通知マネージャー
 */

export class Toast {
  static show(message, type = 'info', duration = 2500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgClass = type === 'error'
      ? 'bg-rose-600 text-white'
      : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900';

    toast.className = `${bgClass} px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 transform transition-all duration-300 translate-y-3 opacity-0 pointer-events-auto border border-white/10`;
    toast.textContent = message;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-3', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('translate-y-3', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}
