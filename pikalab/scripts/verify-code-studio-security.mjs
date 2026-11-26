import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const pikalabRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const useBuild = process.argv.includes('--build');
const server = await startStaticServer(useBuild ? path.join(pikalabRoot, 'dist') : pikalabRoot);
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    await page.route('**/*', (route) => {
        const url = new URL(route.request().url());
        return url.origin === baseUrl ? route.continue() : route.abort();
    });

    await page.goto(`${baseUrl}/${useBuild ? 'code-studio' : '.code-studio'}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
        () => Object.getOwnPropertyDescriptor(JSON, 'parse')?.writable === true,
        undefined,
        { timeout: 2_000 }
    );

    const jsonBoundary = await page.evaluate(() => {
        const parsed = JSON.parse('{"constructor":{"prototype":"preserved"},"__proto__":"text"}');
        const descriptor = Object.getOwnPropertyDescriptor(JSON, 'parse');
        return {
            constructorValue: parsed.constructor.prototype,
            protoValue: parsed.__proto__,
            hasOwnConstructor: Object.prototype.hasOwnProperty.call(parsed, 'constructor'),
            hasOwnProto: Object.prototype.hasOwnProperty.call(parsed, '__proto__'),
            writable: descriptor ? descriptor.writable : null
        };
    });
    if (
        jsonBoundary.constructorValue !== 'preserved'
        || jsonBoundary.protoValue !== 'text'
        || !jsonBoundary.hasOwnConstructor
        || !jsonBoundary.hasOwnProto
        || jsonBoundary.writable !== true
    ) {
        throw new Error(`JSON.parseがユーザーJSONを改変しています: ${JSON.stringify(jsonBoundary)}`);
    }

    await page.locator('#ai-import-btn').click();

    if (useBuild) {
        async function verifyDescription() {
            const description = await page.locator('[data-i18n="modal_import_desc"]').evaluate(element => ({
                text: element.textContent, breaks: element.querySelectorAll('br').length
            }));
            if (description.text.includes('<br>') || description.breaks !== 1
                || (description.text.match(/HTML\/CSS\/JS/g) || []).length !== 1) {
                throw new Error('AI Pasteの説明文に生タグ・重複・改行欠損があります');
            }
        }
        await verifyDescription();
        for (const language of ['en', 'ja']) {
            await page.locator('#ai-import-cancel-btn').click();
            await page.locator('#tools-toggle').click();
            await page.locator('#sel-lang').selectOption(language);
            await page.locator('#tools-close').click();
            await page.locator('#ai-import-btn').click();
            await verifyDescription();
        }
        await page.locator('#ai-import-modal-close').click();
        for (const width of [1280, 390]) {
            await page.setViewportSize({ width, height: 900 });
            const geometry = await page.locator('#param-insert-select').evaluate(element => {
                const control = element.getBoundingClientRect();
                const header = element.closest('.pane-header').getBoundingClientRect();
                return { left: control.left, right: control.right, top: control.top, bottom: control.bottom,
                    headerLeft: header.left, headerRight: header.right, headerTop: header.top, headerBottom: header.bottom };
            });
            if (geometry.left < geometry.headerLeft || geometry.right > geometry.headerRight
                || geometry.top < geometry.headerTop || geometry.bottom > geometry.headerBottom) {
                throw new Error(`${width}pxでパラメータ挿入欄が見切れています`);
            }
        }
        await page.setViewportSize({ width: 1366, height: 900 });
        await page.locator('#ai-import-btn').click();
    }

    const payload = '<img src="/missing-pikalab-xss.png" onerror="document.body.dataset.pikaXss=\'executed\'">';
    await page.locator('#ai-import-text').fill(payload);
    await page.locator('#ai-import-submit-btn').click();
    await page.locator('#ai-review-btn').click();
    await page.locator('.review-card').first().waitFor({ state: 'visible', timeout: 10_000 });

    const marker = await page.evaluate(() => document.body.dataset.pikaXss || 'not-executed');
    if (marker !== 'not-executed') {
        throw new Error('AIレビューの文字列がHTMLとして実行されました');
    }

    const reviewTexts = await page.locator('.review-card').allTextContents();
    const injectedElements = await page.locator('.review-card img').count();
    if (injectedElements !== 0 || !reviewTexts.some((text) => text.includes('onerror'))) {
        throw new Error('攻撃文字列が安全なテキストとしてレビューへ表示されませんでした');
    }

    console.log(`Code Studio実ブラウザ検証: JSON境界とAIレビューDOM XSS${useBuild ? '、AI Paste翻訳、ツールバー表示' : ''}は正常です`);
    await context.close();
} finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
}

function startStaticServer(directory) {
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.ttf': 'font/ttf',
    };
    const serverInstance = http.createServer((request, response) => {
        const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
        const decodedPath = decodeURIComponent(requestUrl.pathname);
        const normalizedPath = path.normalize(decodedPath).replace(/^([.][.][/\\])+/, '');
        let filePath = path.join(directory, normalizedPath);
        if (!filePath.startsWith(directory)) {
            response.writeHead(403);
            response.end('Forbidden');
            return;
        }
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }
        if (!fs.existsSync(filePath)) {
            response.writeHead(404);
            response.end('Not found');
            return;
        }
        const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        response.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(response);
    });
    return new Promise((resolve) => {
        serverInstance.listen(0, '127.0.0.1', () => resolve(serverInstance));
    });
}
