import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const pikalabRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await startStaticServer(pikalabRoot);
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    await page.route('**/*', (route) => {
        const url = new URL(route.request().url());
        return url.origin === baseUrl ? route.continue() : route.abort();
    });

    await page.goto(`${baseUrl}/.code-studio/`, { waitUntil: 'domcontentloaded' });
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

    console.log('Code Studio実ブラウザ検証: JSON境界とAIレビューDOM XSSは正常です');
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
