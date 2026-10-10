'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { stampRuntimeWorkers } = require('../.github/scripts/build-public-root.cjs');
const definitions = [["sw.js","CACHE_NAME","CACHE_PREFIX","ASSETS"],["qrcode/sw.js","STATIC_CACHE","CACHE_PREFIX","STATIC_ASSETS"],["emphasis-lines/sw.js","CACHE_NAME","CACHE_PREFIX","ASSETS_TO_CACHE"],["password-generator/sw.js","CACHE_NAME","CACHE_PREFIX","ASSETS"],["lab-tools/gravity-todo/sw.js","APP_SHELL_CACHE","APP_SHELL_CACHE_PREFIX","APP_SHELL_URLS"],["lab-tools/kids-smile-land/service-worker.js","CACHE_NAME","CACHE_PREFIX","ASSETS"]];
test('各PWAの配信資産変更とランタイム変更を更新版へ反映する', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'katakata-pwa-release-'));
  t.after(() => fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'pwa-runtime.js'),'/* shared */');
  fs.writeFileSync(path.join(root,'education-sw-privacy.js'),'/* education privacy */');
  for (const [file,, , list] of definitions) {
    const source = fs.readFileSync(path.join(__dirname,'..',file),'utf8');
    const target = path.join(root,file);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,source);
    const assets = source.match(new RegExp('const '+list+' = \\[([\\s\\S]*?)\\];'))[1];
    for (const match of assets.matchAll(/['"]([^'"]+)['"]/g)) {
      const url = new URL(match[1],'https://test.invalid/'+path.posix.dirname(file)+'/');
      const asset = path.join(root,url.pathname+(url.pathname.endsWith('/')?'index.html':''));
      fs.mkdirSync(path.dirname(asset),{recursive:true});
      fs.writeFileSync(asset,'/* asset */');
    }
  }
  const initial = stampRuntimeWorkers(root);
  assert.deepEqual(stampRuntimeWorkers(root),initial,'同一配信内容は同じ版');
  fs.appendFileSync(path.join(root,'password-generator/vault.js'),'/* fix */');
  const changed = stampRuntimeWorkers(root);
  for (let i=0;i<changed.length;i++) {
    if (changed[i].file === 'password-generator/sw.js') assert.notEqual(changed[i].cacheName,initial[i].cacheName);
    else assert.equal(changed[i].cacheName,initial[i].cacheName);
  }
  fs.appendFileSync(path.join(root,'pwa-runtime.js'),'/* fix */');
  const shared = stampRuntimeWorkers(root);
  assert.ok(shared.every((worker,i) => worker.cacheName !== changed[i].cacheName));
  fs.appendFileSync(path.join(root,'education-sw-privacy.js'),'/* privacy fix */');
  const privacy = stampRuntimeWorkers(root);
  for (let i=0;i<privacy.length;i++) {
    if (privacy[i].file.startsWith('lab-tools/kids-smile-land/')) assert.notEqual(privacy[i].cacheName,shared[i].cacheName);
    else assert.equal(privacy[i].cacheName,shared[i].cacheName);
  }
});

