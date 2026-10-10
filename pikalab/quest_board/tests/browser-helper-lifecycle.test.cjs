const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { chromium } = require('playwright');
const { withBrowserPage } = require('./browser-test-helper.cjs');

for (const failureAt of ['launch', 'newContext', 'newPage', 'callback', 'contextClose', 'browserClose', null]) {
    test(`ブラウザ補助: ${failureAt || '正常終了'}でもサーバーと作成済み資源を解放する`, async (t) => {
        let server;
        const closed = [];
        const originalCreateServer = http.createServer;
        t.mock.method(http, 'createServer', (...args) => {
            server = originalCreateServer(...args);
            return server;
        });
        const fail = (stage) => {
            if (failureAt === stage) throw new Error(stage);
        };
        const context = {
            async newPage() { fail('newPage'); return {}; },
            async close() { closed.push('context'); fail('contextClose'); }
        };
        const browser = {
            async newContext() { fail('newContext'); return context; },
            async close() { closed.push('browser'); fail('browserClose'); }
        };
        t.mock.method(chromium, 'launch', async () => { fail('launch'); return browser; });

        const operation = withBrowserPage(__dirname, async () => { fail('callback'); return 'ok'; });
        if (failureAt) await assert.rejects(operation, new RegExp(failureAt));
        else assert.equal(await operation, 'ok');
        assert.equal(server.listening, false);
        const expected = failureAt === 'launch' ? []
            : failureAt === 'newContext' ? ['browser'] : ['context', 'browser'];
        assert.deepEqual(closed, expected);
    });
}
