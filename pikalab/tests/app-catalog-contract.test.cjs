const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const jsCatalogPath = path.join(root, 'js', 'app-data.js');
const jsonCatalogPath = path.join(root, 'js', 'app-data.json');

function readJsonCatalog() {
    return JSON.parse(fs.readFileSync(jsonCatalogPath, 'utf8'));
}

function launchableApps(catalog) {
    return catalog.apps.filter((app) => !app.isAmazonCard);
}

test('app-data.jsonを唯一のカタログ正本として読み込む', () => {
    const source = fs.readFileSync(jsCatalogPath, 'utf8');
    assert.match(source, /import\s+appData\s+from\s+['"]\.\/app-data\.json['"]/);
    assert.match(source, /export\s+const\s+APP_DATA\s*=\s*appData/);
    assert.doesNotMatch(source, /"apps"\s*:/);
});

test('PikaLabカタログは公開LabのID・URL・必須表示情報を一意に持つ', () => {
    const catalog = readJsonCatalog();
    assert.ok(Array.isArray(catalog.apps), 'apps配列');

    const apps = launchableApps(catalog);
    assert.ok(apps.length > 0, '公開Labを1件以上カタログで管理する');

    const ids = new Set();
    const urls = new Set();
    for (const app of apps) {
        assert.equal(typeof app.id, 'string', 'id');
        assert.ok(app.id.trim(), '空のidを許可しない');
        assert.ok(!ids.has(app.id), `重複id: ${app.id}`);
        ids.add(app.id);

        assert.equal(typeof app.url, 'string', `${app.id}: url`);
        assert.ok(app.url.trim() && app.url !== '#', `${app.id}: 有効なurl`);
        assert.ok(!urls.has(app.url), `重複url: ${app.url}`);
        urls.add(app.url);

        for (const field of ['appName', 'title', 'description', 'subjectTag', 'buttonText']) {
            assert.equal(typeof app[field], 'string', `${app.id}: ${field}`);
            assert.ok(app[field].trim(), `${app.id}: ${field}は空にしない`);
        }
        assert.ok(Array.isArray(app.categories) && app.categories.length > 0, `${app.id}: categories`);
        if (Object.prototype.hasOwnProperty.call(app, 'indexable')) {
            assert.equal(typeof app.indexable, 'boolean', `${app.id}: indexableはboolean`);
        }
    }
});

test('カタログ内のローカル遷移先が実在する', () => {
    for (const app of launchableApps(readJsonCatalog())) {
        if (/^https?:\/\//i.test(app.url)) continue;

        const cleanUrl = app.url.split(/[?#]/, 1)[0];
        const target = cleanUrl.endsWith('/')
            ? path.join(root, cleanUrl, 'index.html')
            : path.join(root, cleanUrl);
        assert.ok(fs.existsSync(target), `${app.id}: 遷移先が存在する (${app.url})`);
    }
});

test('検索公開フラグとrobots方針が一致する', () => {
    for (const app of launchableApps(readJsonCatalog())) {
        const cleanUrl = app.url.split(/[?#]/, 1)[0];
        const target = cleanUrl.endsWith('/')
            ? path.join(root, cleanUrl, 'index.html')
            : path.join(root, cleanUrl);
        const html = fs.readFileSync(target, 'utf8');

        if (app.indexable === true) {
            assert.doesNotMatch(html, /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i, `${app.id}: indexable Labにnoindexを残さない`);
        } else {
            assert.match(html, /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i, `${app.id}: 未公開Labはnoindexを維持する`);
        }
    }
});

test('constants.jsはカタログ正本をimportして公開定義へ渡す', () => {
    const constants = fs.readFileSync(path.join(root, 'js', 'constants.js'), 'utf8');
    assert.match(constants, /import\s+\{\s*APP_DATA\s*\}\s+from\s+['"]\.\/app-data\.js['"]/);
    assert.match(constants, /export\s+const\s+APP_DEFINITIONS\s*=\s*APP_DATA\.apps/);
});
