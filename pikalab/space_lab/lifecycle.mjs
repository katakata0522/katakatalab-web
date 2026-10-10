// 遅延処理は画面の世代にひも付け、閉じた画面へ古い結果を戻さない。
export class TaskScope {
    constructor() {
        this.generation = 0;
        this.timers = new Set();
        this.frames = new Set();
    }
    cancel() {
        this.generation += 1;
        for (const id of this.timers) clearTimeout(id);
        for (const id of this.frames) cancelAnimationFrame(id);
        this.timers.clear();
        this.frames.clear();
    }
    later(callback, delay) {
        const generation = this.generation;
        const id = setTimeout(() => {
            this.timers.delete(id);
            if (generation === this.generation) callback();
        }, delay);
        this.timers.add(id);
        return id;
    }
    frame(callback) {
        const generation = this.generation;
        const id = requestAnimationFrame((time) => {
            this.frames.delete(id);
            if (generation === this.generation) callback(time);
        });
        this.frames.add(id);
        return id;
    }
}

// 見た目のフェードと操作可能性を分離。重なる達成画面でも戻り先を失わない。
export class ModalStack {
    constructor(modals, backgrounds, onChange) {
        this.modals = modals.filter(Boolean);
        this.backgrounds = backgrounds.filter(Boolean);
        this.stack = [];
        this.blocked = false;
        this.onChange = onChange;
        this.sync();
    }
    get top() { return this.stack.at(-1)?.element || null; }
    open(element, opener = document.activeElement) {
        if (this.stack.some(entry => entry.element === element)) return;
        this.stack.push({ element, opener });
        this.sync();
    }
    close(element, restoreFocus = true) {
        const index = this.stack.findIndex(entry => entry.element === element);
        if (index < 0) return;
        const wasTop = element === this.top;
        const [entry] = this.stack.splice(index, 1);
        this.sync();
        if (restoreFocus && wasTop) {
            const target = entry.opener;
            if (target?.isConnected && !target.disabled && target.getClientRects().length > 0
                && getComputedStyle(target).visibility !== 'hidden' && !target.closest('[inert]')
                && (!this.top || this.top.contains(target))) {
                target.focus({ preventScroll: true });
            } else if (this.top) this.focus(this.top);
        }
    }
    block(value) {
        this.blocked = value;
        this.sync();
    }
    sync() {
        for (const element of this.modals) {
            const inactive = element !== this.top;
            if (inactive && element.contains(document.activeElement)) document.activeElement?.blur?.();
            element.inert = inactive;
            element.setAttribute('aria-hidden', String(inactive));
        }
        for (const element of this.backgrounds) element.inert = this.blocked || Boolean(this.top);
        this.onChange?.();
    }
    focusables(element) {
        return [...element.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
            .filter(node => !node.disabled && !node.closest('[inert]') && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden');
    }
    focus(element = this.top) {
        this.focusables(element)[0]?.focus({ preventScroll: true });
    }
    trap(event, modal = this.top) {
        if (event.key !== 'Tab' || !modal) return;
        const focusables = this.focusables(modal);
        if (!focusables.length) { event.preventDefault(); return; }
        const first = focusables[0], last = focusables.at(-1), active = document.activeElement;
        if (!modal.contains(active) || (event.shiftKey ? active === first : active === last)) {
            (event.shiftKey ? last : first).focus({ preventScroll: true });
            event.preventDefault();
        }
    }
}
