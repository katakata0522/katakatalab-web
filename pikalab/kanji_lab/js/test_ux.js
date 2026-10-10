const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const uxPath = path.join(__dirname, 'ux.js');
const rolesPath = path.join(__dirname, 'roles.js');
const audioPath = path.join(__dirname, 'audio.js');
const htmlPath = path.join(root, 'index.html');
const cssPath = path.join(root, 'ux.css');

const ux = fs.readFileSync(uxPath, 'utf8');
const roles = fs.readFileSync(rolesPath, 'utf8');
const audio = fs.readFileSync(audioPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

let failed = false;
function fail(message) {
    console.error(`[ERROR] ${message}`);
    failed = true;
}
function requireText(source, text, label) {
    if (!source.includes(text)) fail(`${label} is missing required contract: ${text}`);
}
function forbidText(source, text, label) {
    if (source.includes(text)) fail(`${label} still contains deprecated text: ${text}`);
}
function relativeLuminance(hexColor) {
    const channels = hexColor.slice(1).match(/.{2}/g).map((channel) => {
        const value = Number.parseInt(channel, 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}
function contrastRatio(firstColor, secondColor) {
    const first = relativeLuminance(firstColor);
    const second = relativeLuminance(secondColor);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
function requireAaRule(source, selector, label) {
    const marker = source.indexOf(selector);
    if (marker < 0) return fail(`${label} selector is missing`);
    const open = source.indexOf('{', marker);
    const close = source.indexOf('}', open);
    const block = source.slice(open + 1, close);
    const foreground = block.match(/(?:^|;)\s*color\s*:\s*(#[0-9a-f]{6})/i)?.[1];
    const background = block.match(/(?:^|;)\s*background-color\s*:\s*(#[0-9a-f]{6})/i)?.[1];
    if (!foreground || !background) return fail(`${label} needs explicit foreground/background colors`);
    const ratio = contrastRatio(foreground, background);
    if (ratio < 4.5) fail(`${label} contrast is ${ratio.toFixed(2)} (< 4.5)`);
}

for (const [source, label] of [[ux, 'ux.js'], [roles, 'roles.js']]) {
    try {
        new Function(source);
    } catch (error) {
        fail(`${label} has a syntax error: ${error.message}`);
    }
}

try {
    const appended = [];
    const domContentLoadedHandlers = [];
    const documentMock = {
        readyState: 'loading',
        querySelector: () => null,
        createElement: () => ({ rel: '', href: '', dataset: {}, addEventListener: () => {} }),
        head: { appendChild: node => appended.push(node) },
        addEventListener: (type, handler) => {
            if (type === 'DOMContentLoaded') domContentLoadedHandlers.push(handler);
        }
    };
    const windowMock = {
        KanjiLabData: { KANJI_ALL: [], KANJI_LR: [], KANJI_UD: [] },
        matchMedia: () => ({ matches: false })
    };
    vm.runInNewContext(ux, {
        window: windowMock,
        document: documentMock,
        console,
        setTimeout: () => 0,
        localStorage: { getItem: () => null }
    }, { filename: 'ux.js', timeout: 1_000 });
    if (appended.length !== 1 || appended[0].dataset.kanjiUxStyle !== 'true') {
        fail('ux.js loading path did not inject exactly one guarded stylesheet.');
    }
    if (domContentLoadedHandlers.length !== 1) {
        fail('ux.js must register exactly one DOMContentLoaded readiness hook while loading.');
    }
    if (!windowMock.KanjiLabUX || typeof windowMock.KanjiLabUX.getState !== 'function') {
        fail('ux.js must expose a small read-only state surface for diagnostics.');
    }
} catch (error) {
    fail(`ux.js minimal-DOM bootstrap failed: ${error.message}`);
}

if (!/\.\/js\/ux\.js\?v=[^'"]+/.test(audio)) {
    fail('audio.js UX bootstrap is missing a cache-busted ux.js URL.');
}
requireText(audio, 'data-kanji-ux-script', 'audio.js duplicate-load guard');

requireText(roles, 'isDeepOnlyPart', 'deep-only part helper');
requireText(roles, 'getDeepOnlyParts', 'deep-only part list helper');
requireText(roles, 'matches.every(isDeepEntry)', 'deep-only means every matching kanji is deep');

requireText(ux, 'パーツ・漢字・読みで検索', 'part search');
requireText(ux, '相棒だけ ON', 'partner-only visible state');
requireText(ux, 'UX_STATE.anchorSide', 'partner anchor state');
requireText(ux, "if (UX_STATE.partnerOnly && UX_STATE.anchorSide === side)", 'anchor side remains selectable');
requireText(ux, '↺ 選びなおす', 'explicit selection reset');
requireText(ux, 'resetSelection(App)', 'selection reset behavior');
requireText(ux, '深いパーツ OFF', 'deep-parts default state');
requireText(ux, 'isDeepOnlyPart(side, part)', 'deep-only part filtering');
requireText(ux, 'normalizeText(UX_STATE.partQueries[side]).length > 0', 'search can reveal deep-only parts');
requireText(ux, "const needsDeepPart = isDeepOnlyPart('left', entry.l) || isDeepOnlyPart('right', entry.r)", 'random discovery checks whether a hidden deep-only part is actually needed');
requireText(ux, 'if (needsDeepPart) UX_STATE.showDeepParts = true', 'random discovery reveals deep-only parts only when needed');
requireText(ux, 'おまかせ発見', 'random discovery');
requireText(ux, '見つけた ${cards.length} / ${Data.KANJI_ALL.length}', 'collection progress');
requireText(ux, '新しい発見から表示', 'recent-first collection copy');
requireText(ux, 'sortCollectionRecentFirst', 'recent-first collection ordering');
requireText(ux, "data-collection-filter=\"lr\"", 'LR collection filter');
requireText(ux, "data-collection-filter=\"ud\"", 'UD collection filter');
requireText(ux, "data-collection-filter=\"deep\"", 'deep discovery collection filter');
requireText(ux, "data-collection-filter=\"shiny\"", 'shiny collection filter');
requireText(ux, "tier === 'deep' ? ' · 深い発見'", 'grounded deep discovery detail badge');
requireText(ux, "tier === 'discovery' ? ' · 発見'", 'grounded discovery detail badge');
requireText(ux, "aria-live', 'polite'", 'live-region accessibility');
requireText(ux, "role', 'dialog'", 'dialog semantics');
requireText(ux, "role', 'tabpanel'", 'tabpanel semantics');
requireText(ux, 'makeKeyboardClickable', 'keyboard activation helper');
requireText(ux, "event.key !== 'Enter' && event.key !== ' '", 'Enter/Space activation');
requireText(ux, 'enhanceTitleKeyboardNavigation', 'title keyboard navigation');
requireText(ux, 'installModalKeyboardGuard', 'dialog keyboard containment');
requireText(ux, "contains(document.activeElement)", 'nested dialogs prioritize the modal that owns focus');
requireText(ux, "element.closest('[hidden], .hidden')", 'hidden controls are excluded from focus loop');
requireText(ux, "event.key === 'Escape'", 'Escape closes custom dialogs');
requireText(ux, "event.key !== 'Tab'", 'Tab focus loop');
requireText(ux, 'restoreModalFocus', 'dialog trigger focus restoration');
requireText(ux, 'clearPartQueries', 'mode-switch search reset');
requireText(ux, 'prefers-reduced-motion: reduce', 'reduced-motion behavior hook');
requireText(ux, 'event.stopImmediatePropagation()', 'duplicate parents-listener guard');
requireText(ux, 'cleanupDuplicatedParentsMarkup()', 'duplicate parents DOM cleanup');
requireText(ux, "if (args[0] !== 'lab') hideMobileResult()", 'mobile result tab cleanup');
requireText(ux, 'isCompatiblePart', 'partner compatibility independent of assist setting');

requireText(css, '#kanji-mobile-result', 'mobile result bar styles');
requireText(css, '.kanji-ux-search', 'search styles');
requireText(css, '.kanji-ux-deep-toggle', 'deep-parts control styles');
requireText(css, '.kanji-ux-reset-btn', 'reset control styles');
requireText(css, '.ux-structure-badge[data-tier="deep"]', 'deep badge visual distinction');
requireText(css, '.ux-structure-badge[data-tier="discovery"]', 'discovery badge visual distinction');
requireText(css, '@media (prefers-reduced-motion: reduce)', 'reduced-motion styles');
requireText(css, '.ux-structure-badge', 'structure badge styles');
requireText(css, '.kanji-part-btn.selected', 'selected part contrast override');
requireAaRule(css, '.kanji-part-btn.selected', 'selected part high-contrast color');
requireText(css, '.ux-keyboard-clickable:focus-visible', 'keyboard focus visibility');
requireText(css, '#open-settings-btn', '44px header touch target');
requireText(css, 'min-height: 44px', 'minimum touch height');
requireText(css, '#header-title-badge', 'title badge touch target');
requireText(css, 'min-height: 32px', 'title badge minimum touch height');
requireText(css, '#quiz-label-left', 'stronger quiz side-label contrast');
requireText(css, '#quiz-label-right', 'stronger quiz side-label contrast');

if (html.includes('全166問')) {
    requireText(ux, '${Data.KANJI_ALL.length}字の監査済みカタログ', 'dynamic quiz count replacement');
}
if ((html.match(/data-action="parents-modal-open"/g) || []).length > 1) {
    requireText(ux, 'guardParentsDialog()', 'parents duplicate-listener mitigation');
    requireText(ux, 'duplicateScripts.slice(1).forEach', 'parents duplicate DOM cleanup');
}

forbidText(ux, "'★'.repeat", 'UX rarity display');
forbidText(ux, '30分に1回程度', 'parent health guidance override');

if (failed) {
    console.error('\n❌ KANJI UX VALIDATION FAILED');
    process.exit(1);
}
console.log('\n✅ KANJI UX SOURCE CONTRACTS PASSED');
