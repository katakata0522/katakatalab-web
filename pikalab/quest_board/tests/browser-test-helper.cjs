const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const CONTENT_TYPES = Object.freeze({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8'
});

function startStaticServer(rootDirectory) {
    const absoluteRoot = path.resolve(rootDirectory);
    const server = http.createServer((request, response) => {
        try {
            const requestUrl = new URL(request.url, 'http://127.0.0.1');
            const decodedPath = decodeURIComponent(requestUrl.pathname);
            let filePath = path.resolve(absoluteRoot, `.${decodedPath}`);

            if (filePath !== absoluteRoot && !filePath.startsWith(`${absoluteRoot}${path.sep}`)) {
                response.writeHead(403).end('Forbidden');
                return;
            }

            if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
                filePath = path.join(filePath, 'index.html');
            }
            if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
                response.writeHead(404).end('Not Found');
                return;
            }

            const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()]
                || 'application/octet-stream';
            response.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(filePath).pipe(response);
        } catch {
            response.writeHead(400).end('Bad Request');
        }
    });

    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            resolve({
                baseUrl: `http://127.0.0.1:${address.port}`,
                close: () => new Promise((closeResolve, closeReject) => {
                    server.closeAllConnections();
                    server.close((error) => error ? closeReject(error) : closeResolve());
                })
            });
        });
    });
}

async function withBrowserPage(rootDirectory, callback) {
    const server = await startStaticServer(rootDirectory);
    let browser;
    let context;

    try {
        browser = await chromium.launch({ headless: true });
        context = await browser.newContext();
        const page = await context.newPage();
        return await callback({ page, baseUrl: server.baseUrl });
    } finally {
        // 起動途中や終了処理の失敗でも、作成済みのリソースを必ず解放する。
        try {
            if (context) await context.close();
        } finally {
            try {
                if (browser) await browser.close();
            } finally {
                await server.close();
            }
        }
    }
}

module.exports = { withBrowserPage };
