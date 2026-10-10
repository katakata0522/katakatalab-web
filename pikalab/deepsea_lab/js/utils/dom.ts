export function createElement(tag: string, className = '', attributes: Record<string, string> = {}): HTMLElement {
    const el = document.createElement(tag);
    if (className) el.className = className;
    
    for (const [key, value] of Object.entries(attributes)) {
        el.setAttribute(key, value);
    }
    
    return el;
}

export function createDiv(className = ''): HTMLDivElement {
    return createElement('div', className) as HTMLDivElement;
}

export function createImg(src: string, alt: string, className = ''): HTMLImageElement {
    const img = createElement('img', className, { src, alt }) as HTMLImageElement;
    return img;
}

export function escapeHTML(str: string | undefined | null): string {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
