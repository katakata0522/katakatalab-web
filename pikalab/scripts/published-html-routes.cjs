'use strict';

const fs = require('node:fs');
const path = require('node:path');

// 公開済みビルド成果物を基準に、カタログに載らない教材・記事も漏れなく検査する。
function collectPublishedHtmlRoutes(buildRoot) {
  const root = path.resolve(buildRoot);
  const routes = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile() && entry.name.endsWith('.html')) {
        const relative = path.relative(root, target).split(path.sep).join('/');
        const urlPath = '/' + relative.replace(/(^|\/)index\.html$/, '$1');
        routes.push({ id: 'published-' + relative.replace(/\.html$/, '').replaceAll('/', '-'), urlPath });
      }
    }
  }
  visit(root);
  return routes.sort((a, b) => a.urlPath.localeCompare(b.urlPath));
}

function selectVisualRoutes(routes, directories) {
  if (!directories) return routes;
  const requested = new Set(directories.split(','));
  const found = new Set();
  const selected = routes.filter(route => {
    if (route.urlPath === '/') return true;
    const directory = /^\/([^/]+)\//.exec(route.urlPath)?.[1];
    if (!requested.has(directory)) return false;
    found.add(directory);
    return true;
  });
  // 指定したラボの公開経路を特定できなければ、全件を検証する。
  return found.size === requested.size ? selected : routes;
}

module.exports = { collectPublishedHtmlRoutes, selectVisualRoutes };
