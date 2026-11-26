const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {stampScreenshotCropWorker,ensureAnalyticsCoverage}=require('../.github/scripts/build-public-root.cjs');

test('installation fetches a release-specific URL and serves it for the HTML asset reference', async () => {
 const listeners=new Map(), entries=new Map();
 const scope='https://katakatalab.com/screenshot-crop/';
 const cache={
   async addAll(requests) {
     for (const request of requests) {
       const url=new URL(request.url);
       assert.ok(url.searchParams.get('v'), 'precache must bypass previous CDN entries');
       entries.set(request.url, new Response('installed '+url.pathname));
     }
   },
   async match(key) { return entries.get(typeof key==='string' ? key : key.url); },
 };
 const worker=fs.readFileSync(path.join(__dirname,'../screenshot-crop/sw.js'),'utf8');
 vm.runInNewContext(worker,{
   self:{location:new URL('sw.js',scope),registration:{scope},addEventListener:(name,fn)=>listeners.set(name,fn)},
   caches:{open:async()=>cache}, URL, Request,
 });
 let pending;
 listeners.get('install')({waitUntil(p){pending=p;}});
 await pending;
 for (const name of ['style.css','script.js','pwa.js']) {
   listeners.get('fetch')({request:new Request(scope+name+'?v=html-release'),respondWith(p){pending=p;}});
   assert.equal(await (await pending).text(),'installed /screenshot-crop/'+name);
 }
});
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
