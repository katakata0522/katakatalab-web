const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
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
    const lighter = Math.max(first, second);
    const darker = Math.min(first, second);
    return (lighter + 0.05) / (darker + 0.05);
}

function ruleBlock(css, selectorPattern, label) {
    const block = css.match(new RegExp(`${selectorPattern}\\s*\\{([^}]*)\\}`, 'is'))?.[1] ?? '';
    assert.ok(block, `${label}: dark-mode rule`);
    return block;
}

function hexProperty(block, propertyPattern, label) {
    const color = block.match(
        new RegExp(`(?:^|;)\\s*(?:${propertyPattern})\\s*:\\s*(#[0-9a-f]{6})`, 'i'),
    )?.[1];
    assert.ok(color, `${label}: color`);
    return color;
}

test('ホームのカテゴリタブはナイトモードで十分な文字コントラストを持つ', () => {
    const html = read('index.html');
    const css = read('tailwind.input.css');

    assert.match(html, /id="category-tabs"/);
    const panel = ruleBlock(css, 'body\\.theme-night #category-tabs', 'category tabs');
    const inactive = ruleBlock(css, 'body\\.theme-night #category-tabs button:not\\(\\.tab-active\\)', 'inactive category tab');
    const active = ruleBlock(css, 'body\\.theme-night #category-tabs \\.tab-active', 'active category tab');

    const panelBg = hexProperty(panel, 'background-color', 'category tabs background');
    const inactiveText = hexProperty(inactive, 'color', 'inactive category tab text');
    const activeBg = hexProperty(active, 'background-color', 'active category tab background');
    const activeText = hexProperty(active, 'color', 'active category tab text');

    assert.ok(contrastRatio(inactiveText, panelBg) >= 4.5, 'inactive category tab contrast');
    assert.ok(contrastRatio(activeText, activeBg) >= 4.5, 'active category tab contrast');
});

test('記事一覧の悩みフィルターはポータル由来のナイトモードで専用背景を持つ', () => {
    const html = read('articles/index.html');
    const css = read('articles/style.css');

    assert.match(html, /<section class="[^"]*dynamic-bg[^"]*">\s*<h2[^>]*>\s*<span[^>]*>psychology_alt/s);
    assert.match(css, /body\.theme-night \.dynamic-bg\s*\{[^}]*background(?:-color)?\s*:/is);
    assert.match(css, /body\.theme-night \.worry-pill\s*\{[^}]*background(?:-color)?\s*:/is);
});

test('集中回数バッジはポータル由来のナイトモードで十分な文字コントラストを持つ', () => {
    const html = read('focus_studio/index.html');
    const css = read('focus_studio/style.css');

    assert.match(html, /id="complete-count-badge"/);
    const badge = ruleBlock(css, 'body\\.theme-night #complete-count-badge', 'complete count badge');
    const count = ruleBlock(css, 'body\\.theme-night #complete-count', 'complete count');

    const background = hexProperty(badge, 'background(?:-color)?', 'complete count badge background');
    const badgeText = hexProperty(badge, 'color', 'complete count badge text');
    const countText = hexProperty(count, 'color', 'complete count text');

    assert.ok(contrastRatio(badgeText, background) >= 4.5, 'complete count badge contrast');
    assert.ok(contrastRatio(countText, background) >= 4.5, 'complete count value contrast');
});

test('スマホの記事タイトルは孤立文字を避ける専用サイズ調整を持つ', () => {
    const html = read('articles/smart-child.html');
    const css = read('articles/style.css');

    assert.match(html, /<h1 class="[^"]*article-title-balanced[^"]*">/);
    assert.match(css, /@media \(max-width:[^)]+\)[\s\S]*?\.article-title-balanced\s*\{[^}]*font-size\s*:/is);
});

test('読書感想文タイトルは構成メモを明確に表示する', () => {
    const html = read('book_report/index.html');

    assert.match(html, /<span class="text-adventure-sky">「構成メモ」<\/span>/);
    assert.doesNotMatch(html, /<h1[^>]*>[\s\S]*?ジェネレーター[\s\S]*?<\/h1>/i);
});
