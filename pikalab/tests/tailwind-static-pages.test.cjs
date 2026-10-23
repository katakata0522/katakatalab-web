const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

const pages = [
    'index.html',
    'atom_craft_lab/index.html',
    'articles/index.html',
    'privacy.html',
    'terms.html',
    'kanji_lab/index.html',
    'manabi_land/index.html',
    'speed_reader/index.html',
    'science_maker/index.html',
    'rhythm_lab/index.html'
];

test('Tailwind CDNに依存せずサイト内アセットを読み込む', () => {
    for (const relativePath of pages) {
        const html = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
        assert.ok(
            !html.includes('https://cdn.tailwindcss.com'),
            `${relativePath} に Tailwind CDN が残っています。`
        );
        assert.match(
            html,
            relativePath === 'atom_craft_lab/index.html' ? /assets\/app\.css/ : /(?:tailwind(?:\.generated)?|style)\.css/,
            `${relativePath} がサイト内の表示アセットを参照していません。`
        );
    }
});
