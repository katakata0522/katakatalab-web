const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { collectPublishedHtmlRoutes, selectVisualRoutes } = require('./published-html-routes.cjs');

test('トップと対象ラボ配下の全ページを残し、不明な指定は全件へ戻す', () => {
  const routes = ['/', '/eduplay/', '/eduplay/matching.html', '/speed_reader/', '/eduplay_extra/', '/privacy.html']
    .map(urlPath => ({ urlPath }));
  assert.deepEqual(selectVisualRoutes(routes, 'eduplay,speed_reader'), routes.slice(0, 4));
  for (const directories of [undefined, '', 'eduplay,unknown', 'privacy.html']) {
    assert.equal(selectVisualRoutes(routes, directories), routes);
  }
});

test('公開HTML検査はカタログ外・通常ページを含み、隠しソースを含めない', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pikalab-routes-'));
  try {
    for (const name of ['index.html', 'eduplay/index.html', 'eduplay/matching.html', 'articles/story.html', 'kotoba/index.html', 'code-studio/index.html', '.draft/index.html']) {
      const file = path.join(root, name); fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, '<html></html>');
    }
    const paths = collectPublishedHtmlRoutes(root).map(route => route.urlPath);
    assert.deepEqual(paths, ['/', '/articles/story.html', '/code-studio/', '/eduplay/', '/eduplay/matching.html', '/kotoba/']);
  } finally { fs.rmSync(root, {recursive:true,force:true}); }
});
