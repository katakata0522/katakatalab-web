const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {stampScreenshotCropWorker,ensureAnalyticsCoverage}=require('../.github/scripts/build-public-root.cjs');
test('PWA release revision tracks public assets and ignores its own stamped revision',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'crop-pwa-release-'));
 const app=path.join(root,'screenshot-crop');fs.mkdirSync(app);
 try {
  fs.writeFileSync(path.join(app,'index.html'),'<html><head></head><body>app</body></html>');
  fs.writeFileSync(path.join(app,'core.js'),'/* first */');
  fs.writeFileSync(path.join(app,'sw.js'),"const STATIC_CACHE = 'screenshot-crop-static-test';\nconst CORE_ASSETS = ['./', './core.js'];");
  ensureAnalyticsCoverage(root);
  assert.match(fs.readFileSync(path.join(app,'index.html'),'utf8'),/<script async src="\/analytics.js"><\/script>/);
  const first=stampScreenshotCropWorker(root);
  assert.equal(stampScreenshotCropWorker(root),first);
  fs.appendFileSync(path.join(app,'core.js'),'/* second */');
  const second=stampScreenshotCropWorker(root);assert.notEqual(second,first);
  fs.appendFileSync(path.join(app,'index.html'),'<!-- changed -->');
  assert.notEqual(stampScreenshotCropWorker(root),second);
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});
