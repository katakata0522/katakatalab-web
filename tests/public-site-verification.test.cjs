const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyPublicSite } = require('../scripts/verify-public-site.cjs');

function createFixtureFetch(pages, statuses = {}) {
  return async (requestUrl) => {
    const url = new URL(requestUrl);
    const path = url.pathname;
    return {
      status: statuses[path] ?? 200,
      url: requestUrl,
      text: async () => pages[path] ?? '',
    };
  };
}







test('公開サイト検証はhttp以外の不正なベースURLを拒否する', async () => {
  await assert.rejects(
    () => verifyPublicSite({ baseUrl: 'javascript:alert(1)', fetchImpl: async () => ({}) }),
    /httpまたはhttps/,
  );
});


