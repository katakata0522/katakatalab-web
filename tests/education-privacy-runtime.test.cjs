'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

test('教育PWAは古い共有ローダーと広告・解析通信をキャッシュにもネットワークにも渡さない', async () => {
  const handlers = [];
  vm.runInNewContext(fs.readFileSync(path.join(root, 'education-sw-privacy.js'), 'utf8'), {
    URL, Response, self: { addEventListener: (name, callback) => { if (name === 'fetch') handlers.push(callback); } },
  });
  for (const url of ['https://katakatalab.com/analytics.js?v=old', 'https://katakatalab.com/%61nalytics.js', 'https://www.googletagmanager.com/gtag/js', 'https://region1.google-analytics.com/g/collect', 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', 'https://googleads.g.doubleclick.net/pagead', 'https://www.clarity.ms/collect']) {
    let stopped = false, response;
    handlers[0]({ request: { url }, stopImmediatePropagation: () => { stopped = true; }, respondWith: value => { response = value; } });
    assert.equal(stopped, true, url);
    assert.equal(await (await response).text(), '', url);
  }
  for (const url of ['https://katakatalab.com/pikalab/js/app.js', 'https://fonts.googleapis.com/css2?family=Test', 'https://not-google-analytics.com/app.js']) {
    handlers[0]({ request: { url }, stopImmediatePropagation: () => assert.fail(url), respondWith: () => assert.fail(url) });
  }
});

test('教育ワーカーはコントローラー切替の完了をactivateに結びつける', async () => {
  let activate, claimed = false, done;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'education-sw-privacy.js'), 'utf8'), {
    URL, Response, self: { clients: { claim: async () => { claimed = true; } }, addEventListener: (name, callback) => { if (name === 'activate') activate = callback; } },
  });
  activate({ waitUntil: promise => { done = promise; } });
  await done;
  assert.equal(claimed, true);
});




