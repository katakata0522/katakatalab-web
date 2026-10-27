import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
import os from 'node:os';
import {createServer} from 'node:http';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const root=path.resolve('public-build');const given=process.argv[2];let server;
let base=given;if(!base){server=createServer((req,res)=>{const u=new URL(req.url,'http://localhost');let f=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f)){res.writeHead(404).end();return;}const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
const artifactDir=path.resolve(process.env.KATAKATA_BROWSER_ARTIFACTS||path.join(os.tmpdir(),'katakata-local-tools-browser'));fs.mkdirSync(artifactDir,{recursive:true});
const browser=await chromium.launch({headless:true});
// 買物メモは通常の文書内に置き、旧ドロワーの移動指定による左切れも検出する。
async function verifyDiscountMemo(page, width) {
  await page.goto(base+'/discount-calc/', {waitUntil:'networkidle'});
  assert.equal(await page.locator('#cartDrawer').isVisible(), false);
  await page.locator('#price').fill('1000');
  await page.locator('#customRate').fill('20');
  await page.locator('#memoShop').fill('検証用の店');
  await page.locator('#memoDate').fill('2026-10-11');
  await page.locator('#btnCartCustom').click();
  assert.match(await page.locator('#cartItems').textContent(), /検証用の店/);
  assert.match(await page.locator('#cartFinalTotal').textContent(), /800/);
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('#cartItems').textContent(), /2026-10-11/);
  const geometry=await page.locator('#cartDrawer,#cartItems,#cartClearBtn').evaluateAll(nodes=>nodes.map(node=>{const rect=node.getBoundingClientRect();return {id:node.id,left:rect.left,right:rect.right,width:rect.width};}));
  for(const rect of geometry){assert.ok(rect.width>0, rect.id+' has visible width');assert.ok(rect.left>=0&&rect.right<=width, rect.id+' stays inside viewport');}
  await page.locator('#cartDrawer').screenshot({path:path.join(artifactDir,'discount-memo-'+width+'.png')});
  page.once('dialog', dialog=>dialog.accept());
  await page.locator('#cartClearBtn').click();
  assert.equal(await page.locator('#cartDrawer').isVisible(), false);
  console.log(JSON.stringify({discountMemo:'PASS',width,geometry,storageReload:'PASS',clear:'PASS'}));
}
try{if(!given){const {verifyRootUpdate}=await import('./pwa-update-e2e.mjs');await verifyRootUpdate(browser,root);}for(const width of [360,390,1366]){const page=await browser.newPage({viewport:{width,height:850}});const errors=[];const missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))missing.push(r.url());});
await page.goto(base+'/moyamoya-sorter/',{waitUntil:'networkidle'});await page.clock.install();await page.locator('#moyamoyaText').fill('メール返信 <img src=x onerror="window.__xss=true">');await page.locator('#sortBtn').click();await page.locator('#resultSection').waitFor({state:'visible'});if(width===360){const analyticsEvents=await page.evaluate(()=>window.dataLayer.map(entry=>Array.from(entry)).filter(entry=>entry[0]==='event'));assert.ok(analyticsEvents.some(entry=>entry[1]==='tool_start'&&entry[2]?.tool_id==='moyamoya-sorter'));assert.ok(analyticsEvents.some(entry=>entry[1]==='tool_action'&&entry[2]?.action_id==='sort'));const analyticsPayload=JSON.stringify(analyticsEvents);assert.equal(analyticsPayload.includes('メール返信'),false);assert.equal(analyticsPayload.includes('<img'),false);}assert.equal(await page.evaluate(()=>Boolean(window.__xss)),false);assert.equal(await page.locator('#resultSection img').count(),0);await page.locator('#startTimerBtn').click();await page.clock.fastForward(6100);assert.notEqual(await page.locator('#timerDigits').textContent(),'02:00');await page.locator('#startTimerBtn').click();const paused=await page.locator('#timerDigits').textContent();await page.clock.fastForward(8000);assert.equal(await page.locator('#timerDigits').textContent(),paused);await page.locator('#resetTimerBtn').click();assert.equal(await page.locator('#timerDigits').textContent(),'02:00');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(artifactDir,'moyamoya-'+width+'.png'),fullPage:true});
await page.goto(base+'/chiritsumo-calc/',{waitUntil:'networkidle'});while(await page.locator('.item-switch:checked').count())await page.locator('.item-switch:checked').first().locator('..').click();await page.locator('#toggleCustomBtn').click();await page.locator('#customName').fill('<img src=x onerror=alert(1)>');await page.locator('#customAmount').fill('1000');await page.locator('#customFreq').selectOption('monthly');await page.locator('#addCustomBtn').click();assert.equal(await page.locator('#expenseGrid img').count(),0);assert.equal(await page.locator('#monthlyStat').textContent(),'¥1,000');await page.locator('[data-period="1y"]').click();await page.waitForFunction(()=>document.querySelector('#summaryAmount').textContent==='12,000');await page.locator('#investToggle').locator('..').click();await page.waitForFunction(()=>document.querySelector('#summaryAmount').textContent==='12,279');assert.equal(await page.locator('#investResultBanner').isVisible(),true);assert.match(await page.locator('#summaryPeriodLabel').textContent(),/仮定/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(artifactDir,'chiritsumo-'+width+'.png'),fullPage:true});await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#monthlyStat').textContent(),'¥1,000');await page.locator('#toggleCustomBtn').click();await page.locator('#customName').fill('Enter確認');await page.locator('#customAmount').fill('1000');await page.locator('#customName').press('Enter');assert.equal(await page.locator('#monthlyStat').textContent(),'¥2,000');assert.equal(await page.locator('.expense-del-btn').count(),2);

await verifyDiscountMemo(page, width);
await page.addInitScript(()=>{
  window.__copiedImageTypes=[];
  window.__lastClipboardBlob=null;
  window.__sharedFileCount=0;
  class TestClipboardItem{
    constructor(data){this.types=Object.keys(data);this.data=data;}
  }
  Object.defineProperty(window,'ClipboardItem',{configurable:true,value:TestClipboardItem});
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
    read:async()=>[],
    write:async(items)=>{
      for(const item of items){
        for(const value of Object.values(item.data||{})){
          const resolved=await value;
          if(resolved instanceof Blob) window.__lastClipboardBlob=resolved;
        }
      }
      window.__copiedImageTypes=items.flatMap(item=>item.types||[]);
    }
  }});
  Object.defineProperty(navigator,'share',{configurable:true,value:async(payload)=>{
    window.__sharedFileCount=Array.isArray(payload?.files)?payload.files.length:0;
  }});
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
});
await page.goto(base+'/screenshot-crop/',{waitUntil:'networkidle'});
if(width===360){
  const pwaState=await page.evaluate(async()=>{
    const manifestResponse=await fetch('./manifest.webmanifest');
    const manifest=await manifestResponse.json();
    const registration=await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('service-worker-timeout')),6000))
    ]);
    return {
      manifestType:manifestResponse.headers.get('content-type')||'',
      manifest,
      scope:registration.scope,
      cacheKeys:await caches.keys()
    };
  });
  assert.match(pwaState.manifestType,/application\/manifest\+json/);
  assert.equal(pwaState.manifest.display,'standalone');
  assert.equal(pwaState.manifest.scope,'/screenshot-crop/');
  assert.ok(pwaState.scope.endsWith('/screenshot-crop/'));
  assert.ok(pwaState.cacheKeys.some(key=>key.startsWith('screenshot-crop-static-')));

  await page.evaluate(()=>{
    window.__pwaPromptCalls=0;
    const event=new Event('beforeinstallprompt',{cancelable:true});
    event.prompt=async()=>{window.__pwaPromptCalls+=1;};
    event.userChoice=Promise.resolve({outcome:'accepted'});
    window.dispatchEvent(event);
  });
  assert.equal(await page.locator('#pwaInstallButton').isVisible(),true);
  await page.locator('#pwaInstallButton').click();
  await page.waitForFunction(()=>window.__pwaPromptCalls===1);
  assert.equal(await page.locator('#pwaInstallButton').isVisible(),false);
}
const firstView=await page.evaluate(()=>{
  const upload=document.querySelector('#uploadSection')?.getBoundingClientRect();
  const title=document.querySelector('#page-title')?.getBoundingClientRect();
  return {uploadTop:upload?.top??99999,uploadBottom:upload?.bottom??99999,titleTop:title?.top??99999,viewport:innerHeight};
});
assert.ok(firstView.titleTop<firstView.viewport*0.35);
assert.ok(firstView.uploadTop<firstView.viewport*0.45);
assert.ok(firstView.uploadBottom<=firstView.viewport);
const screenshotSvg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="2400"><rect width="1080" height="2400" fill="#fff"/></svg>');
await page.locator('#fileInput').setInputFiles({name:'unsafe-vector.svg',mimeType:'image/svg+xml',buffer:screenshotSvg});
await page.waitForFunction(()=>document.querySelector('#uploadMessage').textContent.includes('対応形式'));
assert.equal(await page.locator('#editorSection').isVisible(),false);

const screenshotDataUrl=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');
  canvas.width=1080;canvas.height=2400;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#111827';ctx.fillRect(0,0,1080,92);
  ctx.fillStyle='#e0f2fe';ctx.fillRect(0,92,1080,2200);
  ctx.fillStyle='#111827';ctx.fillRect(0,2292,1080,108);
  ctx.fillStyle='#172033';ctx.font='72px sans-serif';ctx.fillText('Screenshot crop test',72,280);
  return canvas.toDataURL('image/png');
});
const screenshotPng=Buffer.from(screenshotDataUrl.split(',')[1],'base64');
if(width===360){
  const context=page.context();
  await context.setOffline(true);
  try{
    await page.reload({waitUntil:'domcontentloaded',timeout:10000});
    assert.equal(await page.locator('#page-title').textContent(),'スクショ端カット');
    await page.locator('#fileInput').setInputFiles({
      name:'offline-screenshot.png',
      mimeType:'image/png',
      buffer:screenshotPng
    });
    await page.locator('#editorSection').waitFor({state:'visible'});
    assert.ok(Number(await page.locator('#cropTop').inputValue())>0);
  }finally{
    await context.setOffline(false);
  }
  await page.reload({waitUntil:'networkidle'});
  console.log(JSON.stringify({screenshotCropPwa:'PASS',installPrompt:'PASS',offlineProcessing:'PASS',scope:'/screenshot-crop/'}));
}
await page.locator('#fileInput').setInputFiles({name:'screenshot-test.png',mimeType:'image/png',buffer:screenshotPng});
await page.locator('#editorSection').waitFor({state:'visible'});
assert.match(await page.locator('#detectedLabel').textContent(),/スマホ縦長/);
assert.match(await page.locator('#readyHint').textContent(),/切り取り位置.*保存/);
assert.equal(await page.locator('#batchProgress').isVisible(),false);
assert.equal(await page.locator('.edge-toggle').count(),4);
if(width<=390){
  assert.equal(await page.locator('.tool-start').isVisible(),false);
  assert.equal(await page.locator('.tools-link').isVisible(),false);
  assert.equal(await page.locator('#quickActionDock').isVisible(),true);
  assert.equal(await page.locator('#quickCopyButton').isVisible(),true);
  assert.equal(await page.locator('#quickShareButton').isVisible(),true);
  assert.equal(await page.locator('#saveButton').isVisible(),false);
  assert.equal(await page.locator('#copyButton').isVisible(),false);
  assert.equal(await page.locator('#shareButton').isVisible(),false);
  assert.equal((await page.locator('#removeCurrentButton').textContent()).trim(),'画像を外す');

  const mobileEditorDensity=await page.evaluate(()=>{
    const preset=document.querySelector('#presetBar')?.getBoundingClientRect();
    const canvas=document.querySelector('#canvasShell')?.getBoundingClientRect();
    const compare=document.querySelector('#compareButton')?.getBoundingClientRect();
    const dock=document.querySelector('#quickActionDock')?.getBoundingClientRect();
    const remove=document.querySelector('#removeCurrentButton')?.getBoundingClientRect();
    const replace=document.querySelector('#replaceButton')?.getBoundingClientRect();
    const presetSlots=[...document.querySelectorAll('.preset-slot')].map(el=>el.getBoundingClientRect().height);
    return {
      presetHeight:preset?.height??999,
      presetAfterCanvas:(preset?.top??0)-(canvas?.bottom??999),
      compareToCanvas:(canvas?.top??999)-(compare?.bottom??0),
      compareHeight:compare?.height??0,
      removeHeight:remove?.height??0,
      replaceHeight:replace?.height??0,
      presetMinHeight:Math.min(...presetSlots),
      dockHeight:dock?.height??999
    };
  });
  assert.ok(mobileEditorDensity.presetHeight<=68);
  assert.ok(mobileEditorDensity.presetAfterCanvas>=0);
  assert.ok(mobileEditorDensity.compareToCanvas<=10);
  assert.ok(mobileEditorDensity.compareHeight>=44);
  assert.ok(mobileEditorDensity.removeHeight>=44);
  assert.ok(mobileEditorDensity.replaceHeight>=44);
  assert.ok(mobileEditorDensity.presetMinHeight>=44);
  assert.ok(mobileEditorDensity.dockHeight<=62);
}else{
  assert.equal(await page.locator('.tool-start').isVisible(),false);
  assert.equal(await page.locator('.tools-link').isVisible(),false);
  assert.equal(await page.locator('#quickActionDock').isVisible(),false);
  assert.equal(await page.locator('#saveButton').isVisible(),true);
  if(width===1366){
    assert.equal(await page.locator('.control-column').evaluate(el=>getComputedStyle(el).position),'sticky');
  }
}
const copySelector=width<=390?'#quickCopyButton':'#copyButton';
await page.locator(copySelector).click();
await page.waitForFunction(()=>document.querySelector('#exportMessage').textContent.includes('コピーしました'));
assert.deepEqual(await page.evaluate(()=>window.__copiedImageTypes),['image/png']);
if(width<=390){
  await page.locator('#quickShareButton').click();
  await page.waitForFunction(()=>document.querySelector('#exportMessage').textContent.includes('共有メニュー'));
  assert.equal(await page.evaluate(()=>window.__sharedFileCount),1);
}

// Single-image use stays as simple as before.
assert.equal(await page.locator('#batchStrip').isVisible(),false);
assert.equal(await page.locator('#saveAllIndividualButton').isVisible(),false);
assert.equal(await page.locator('#saveAllButton').isVisible(),false);
assert.equal(await page.locator('#edgeTop').isChecked(),true);
assert.equal(await page.locator('#edgeBottom').isChecked(),false);
assert.equal(await page.locator('#edgeLeft').isChecked(),false);
assert.equal(await page.locator('#edgeRight').isChecked(),false);
assert.ok(Number(await page.locator('#cropTop').inputValue())>0);
assert.equal(Number(await page.locator('#cropBottom').inputValue()),0);

// Optional masking stays out of the way until explicitly opened.
assert.equal(await page.locator('#redactionPanel').evaluate(el=>el.open),false);
await page.locator('#redactionPanel > summary').click();
assert.equal(await page.locator('#redactionPanel').evaluate(el=>el.open),true);

await page.locator('[data-redaction-tool="black"]').click();
assert.equal(await page.locator('[data-redaction-tool="black"]').getAttribute('aria-pressed'),'true');
await page.locator('#previewCanvas').scrollIntoViewIfNeeded();
const maskCanvasBox=await page.locator('#previewCanvas').boundingBox();
assert.ok(maskCanvasBox);
await page.mouse.move(maskCanvasBox.x+maskCanvasBox.width*0.30,maskCanvasBox.y+maskCanvasBox.height*0.35);
await page.mouse.down();
await page.mouse.move(maskCanvasBox.x+maskCanvasBox.width*0.55,maskCanvasBox.y+maskCanvasBox.height*0.45,{steps:4});
await page.mouse.up();
assert.equal((await page.locator('#redactionCount').textContent()).trim(),'1件');

const blackMaskPixel=await page.locator('#previewCanvas').evaluate(canvas=>{
  const data=canvas.getContext('2d').getImageData(
    Math.round(canvas.width*0.40),
    Math.round(canvas.height*0.40),
    1,
    1
  ).data;
  return Array.from(data);
});
assert.ok(blackMaskPixel[0]<40&&blackMaskPixel[1]<50&&blackMaskPixel[2]<60&&blackMaskPixel[3]>200);

// The same mask is baked into the actual clipboard export, not preview-only.
await page.locator(copySelector).click();
await page.waitForFunction(()=>document.querySelector('#exportMessage').textContent.includes('コピーしました'));
const exportedBlackMaskPixel=await page.evaluate(async()=>{
  const blob=window.__lastClipboardBlob;
  if(!(blob instanceof Blob)) return null;
  const bitmap=await createImageBitmap(blob);
  const canvas=document.createElement('canvas');
  canvas.width=bitmap.width;
  canvas.height=bitmap.height;
  const ctx=canvas.getContext('2d');
  ctx.drawImage(bitmap,0,0);
  const cropTop=Number(document.querySelector('#cropTop').value)||0;
  const cropLeft=Number(document.querySelector('#cropLeft').value)||0;
  const x=Math.max(0,Math.min(canvas.width-1,Math.round(1080*0.40-cropLeft)));
  const y=Math.max(0,Math.min(canvas.height-1,Math.round(2400*0.40-cropTop)));
  return Array.from(ctx.getImageData(x,y,1,1).data);
});
assert.ok(exportedBlackMaskPixel);
assert.ok(exportedBlackMaskPixel[0]<40&&exportedBlackMaskPixel[1]<50&&exportedBlackMaskPixel[2]<60&&exportedBlackMaskPixel[3]>200);

await page.locator('#undoRedactionButton').click();
assert.equal(await page.locator('#redactionCount').isHidden(),true);

await page.locator('[data-redaction-tool="blur"]').click();
assert.equal(await page.locator('[data-redaction-tool="blur"]').getAttribute('aria-pressed'),'true');
await page.locator('#previewCanvas').scrollIntoViewIfNeeded();
const blurCanvasBox=await page.locator('#previewCanvas').boundingBox();
assert.ok(blurCanvasBox);
await page.mouse.move(blurCanvasBox.x+blurCanvasBox.width*0.30,blurCanvasBox.y+blurCanvasBox.height*0.35);
await page.mouse.down();
await page.mouse.move(blurCanvasBox.x+blurCanvasBox.width*0.55,blurCanvasBox.y+blurCanvasBox.height*0.45,{steps:4});
await page.mouse.up();
assert.equal((await page.locator('#redactionCount').textContent()).trim(),'1件');

await page.locator('#clearRedactionButton').click();
assert.equal(await page.locator('#redactionCount').isHidden(),true);
await page.locator('#redactionPanel > summary').click();
assert.equal(await page.locator('#redactionPanel').evaluate(el=>el.open),false);

// Explicit presets stay separate from automatic device learning.
assert.equal(await page.locator('.preset-slot').count(),3);
assert.equal(await page.locator('#presetSlot1 [data-preset-state]').textContent(),'＋');
await page.locator('#advancedCropPanel > summary').click();
await page.locator('#cropTop').evaluate(el=>{el.value='137';el.dispatchEvent(new Event('input',{bubbles:true}));});
assert.equal(await page.locator('#cropTopValue').textContent(),'137px');
await page.locator('#presetSlot1').click();
assert.equal(await page.locator('#presetManager').isVisible(),true);
assert.match(await page.locator('#presetSaveButton').textContent(),/現在の切り方を保存/);
await page.locator('#presetSaveButton').click();
assert.equal(await page.locator('#presetSlot1 [data-preset-state]').textContent(),'✓');
assert.match(await page.evaluate(()=>localStorage.getItem('screenshotCrop.cropPresets.v1')||''),/"top":137/);

// Moving the yellow line after applying never auto-overwrites the preset.
await page.locator('#cropTop').evaluate(el=>{el.value='141';el.dispatchEvent(new Event('input',{bubbles:true}));});
assert.match(await page.evaluate(()=>localStorage.getItem('screenshotCrop.cropPresets.v1')||''),/"top":137/);
await page.locator('#presetSlot1').click();
assert.equal(await page.locator('#cropTopValue').textContent(),'137px');
assert.match(await page.locator('#presetSaveButton').textContent(),/現在の切り方で上書き/);

// Overwrite happens only through the explicit button.
await page.locator('#cropTop').evaluate(el=>{el.value='143';el.dispatchEvent(new Event('input',{bubbles:true}));});
await page.locator('#presetSaveButton').click();
assert.match(await page.evaluate(()=>localStorage.getItem('screenshotCrop.cropPresets.v1')||''),/"top":143/);
await page.locator('#cropTop').evaluate(el=>{el.value='165';el.dispatchEvent(new Event('input',{bubbles:true}));});
await page.locator('#presetSlot1').click();
assert.equal(await page.locator('#cropTopValue').textContent(),'143px');

// The same stored px is available in another page/session and is not height-scaled.
const longPresetData=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');
  canvas.width=1080;canvas.height=5000;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#111827';ctx.fillRect(0,0,1080,90);
  ctx.fillStyle='#e0f2fe';ctx.fillRect(0,90,1080,4800);
  ctx.fillStyle='#111827';ctx.fillRect(0,4890,1080,110);
  return canvas.toDataURL('image/png').split(',')[1];
});
const presetPopupPromise=page.waitForEvent('popup');
await page.evaluate(url=>window.open(url,'preset-persistence-test'),base+'/screenshot-crop/');
const presetPage=await presetPopupPromise;
await presetPage.waitForLoadState('networkidle');
await presetPage.locator('#fileInput').setInputFiles({
  name:'preset-long-private.png',
  mimeType:'image/png',
  buffer:Buffer.from(longPresetData,'base64')
});
await presetPage.locator('#editorSection').waitFor({state:'visible'});
await presetPage.locator('#presetSlot1').click();
assert.equal(await presetPage.locator('#cropTopValue').textContent(),'143px');
await presetPage.close();

await page.locator('#presetCloseButton').click();
if(await page.locator('#advancedCropPanel').evaluate(el=>el.open)){
  await page.locator('#advancedCropPanel > summary').click();
}

// Add two more screenshots. Multi-image controls appear only now.
const multiData=await page.evaluate(()=>{
  const make=(w,h,label,top,bottom)=>{
    const canvas=document.createElement('canvas');
    canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#111827';ctx.fillRect(0,0,w,top);
    ctx.fillStyle='#e0f2fe';ctx.fillRect(0,top,w,h-top-bottom);
    ctx.fillStyle='#111827';ctx.fillRect(0,h-bottom,w,bottom);
    ctx.fillStyle='#172033';ctx.font='64px sans-serif';ctx.fillText(label,60,top+150);
    return canvas.toDataURL('image/png').split(',')[1];
  };
  return [
    {name:'second-private-name.png',data:make(1170,2532,'Second',96,110)},
    {name:'third-private-name.png',data:make(1080,1920,'Third',82,92)}
  ];
});
await page.locator('#fileInput').setInputFiles(multiData.map(item=>({
  name:item.name,
  mimeType:'image/png',
  buffer:Buffer.from(item.data,'base64')
})));
await page.waitForFunction(()=>document.querySelectorAll('.batch-item').length===3);
assert.equal(await page.locator('#batchStrip').isVisible(),true);
assert.equal(await page.locator('#batchProgress').isVisible(),true);
assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('has-batch')),true);
assert.equal(await page.locator('#saveAllIndividualButton').isVisible(),true);
assert.equal(await page.locator('#saveAllButton').isVisible(),true);
assert.equal(await page.locator('#batchAutoNote').isVisible(),true);
assert.match(await page.locator('#saveAllIndividualButton').textContent(),/3枚を個別保存/);
assert.match(await page.locator('#saveAllButton').textContent(),/3枚を1つにまとめる（ZIP）/);
assert.match(await page.locator('#batchAutoNote').textContent(),/未確認の画像も/);
assert.equal(await page.locator('.batch-item').count(),3);
assert.match(await page.locator('#batchProgress').textContent(),/3枚中 1枚目/);
assert.equal(await page.locator('#batchReview').isVisible(),true);
assert.match(await page.locator('#batchReviewText').textContent(),/2枚はまだ画面で確認していません/);
assert.equal(await page.locator('#reviewNextButton').isVisible(),true);
assert.equal(await page.locator('.batch-item[data-status="unreviewed"]').count(),2);
assert.equal(await page.locator('.batch-item[data-status="adjusted"]').count(),1);

// The most recent manual px adjustment is inherited by an untouched image of the same kind.
await page.locator('#reviewNextButton').click();
await page.waitForFunction(()=>document.querySelector('#batchProgress').textContent.includes('2枚目'));
await page.locator('#advancedCropPanel > summary').click();
await page.locator('#cropTop').evaluate(el=>{el.value='123';el.dispatchEvent(new Event('input',{bubbles:true}));});
assert.equal(await page.locator('#cropTopValue').textContent(),'123px');
await page.locator('.batch-item').nth(2).click();
await page.waitForFunction(()=>document.querySelector('#batchProgress').textContent.includes('3枚目'));
assert.equal(await page.locator('#cropTopValue').textContent(),'123px');
assert.equal(await page.locator('#reviewNextButton').isVisible(),false);
assert.match(await page.locator('#batchReviewText').textContent(),/全3枚を確認済み/);
assert.match(await page.locator('#readyHint').textContent(),/切り取り位置.*保存/);

// A later manual adjustment becomes the new recent value, but does not overwrite an already manually adjusted image.
await page.locator('#cropTop').evaluate(el=>{el.value='127';el.dispatchEvent(new Event('input',{bubbles:true}));});
assert.equal(await page.locator('#cropTopValue').textContent(),'127px');
await page.locator('.batch-item').nth(1).click();
await page.waitForFunction(()=>document.querySelector('#batchProgress').textContent.includes('2枚目'));
assert.equal(await page.locator('#cropTopValue').textContent(),'123px');

// Save current image and explicitly advance to the next one.
const singleBatchDownloadPromise=page.waitForEvent('download');
await page.locator(width<=390?'#quickSaveButton':'#saveButton').click();
const singleBatchDownload=await singleBatchDownloadPromise;
assert.match(singleBatchDownload.suggestedFilename(),/-safe\.(?:png|jpg|webp)$/);
await page.waitForFunction(()=>document.querySelector('#batchProgress').textContent.includes('3枚目'));
assert.equal(await page.locator('.batch-item').nth(1).evaluate(el=>el.classList.contains('is-saved')),true);

// Multi-image export can also save normal image files without ZIP.
const individualDownloads=[];
const onIndividualDownload=download=>individualDownloads.push(download);
page.on('download',onIndividualDownload);
await page.locator('#saveAllIndividualButton').click();
await page.waitForFunction(()=>document.querySelector('#exportMessage').textContent.includes('個別保存を開始'));
await page.waitForTimeout(400);
page.off('download',onIndividualDownload);
assert.equal(individualDownloads.length,3);
assert.deepEqual(individualDownloads.map(download=>download.suggestedFilename()),[
  '01-screenshot-test-safe.png',
  '02-second-private-name-safe.png',
  '03-third-private-name-safe.png'
]);

// ZIP export is still built locally and contains all selected images.
const zipDownloadPromise=page.waitForEvent('download');
await page.locator('#saveAllButton').click();
const zipDownload=await zipDownloadPromise;
assert.match(zipDownload.suggestedFilename(),/^screenshot-safe-3files\.zip$/);
const zipPath=await zipDownload.path();
const zipBytes=fs.readFileSync(zipPath);
assert.equal(zipBytes.readUInt32LE(0),0x04034b50);
assert.ok(zipBytes.toString('utf8').includes('01-screenshot-test-safe.png'));
assert.ok(zipBytes.toString('utf8').includes('02-second-private-name-safe.png'));
assert.ok(zipBytes.toString('utf8').includes('03-third-private-name-safe.png'));
assert.equal(await page.locator('.batch-item.is-saved').count(),3);

// Remove only the current item without disturbing the rest of the queue.
await page.locator('#removeCurrentButton').click();
await page.waitForFunction(()=>document.querySelectorAll('.batch-item').length===2);
assert.equal(await page.locator('.batch-item').count(),2);
assert.match(await page.locator('#batchProgress').textContent(),/2枚中/);

// Core edge controls and compare remain simple in batch mode.
await page.locator('#edgeBottom').check();
assert.ok(Number(await page.locator('#cropBottom').inputValue())>0);
await page.locator('#compareButton').click();
assert.equal(await page.locator('#compareButton').getAttribute('aria-pressed'),'true');
await page.locator('#compareButton').click();

if(width===360){
  const cropEvents=await page.evaluate(()=>window.dataLayer.map(entry=>Array.from(entry)).filter(entry=>entry[0]==='event'));
  assert.ok(cropEvents.some(entry=>entry[1]==='tool_action'&&entry[2]?.tool_id==='screenshot-crop'&&entry[2]?.action_id==='copy_image_quick'));
  assert.ok(cropEvents.some(entry=>entry[1]==='tool_action'&&entry[2]?.tool_id==='screenshot-crop'&&entry[2]?.action_id==='share_image_quick'));
  assert.ok(cropEvents.some(entry=>entry[1]==='tool_action'&&entry[2]?.tool_id==='screenshot-crop'&&entry[2]?.action_id==='save_image_quick'));
  assert.ok(cropEvents.some(entry=>entry[1]==='tool_action'&&entry[2]?.tool_id==='screenshot-crop'&&entry[2]?.action_id==='save_all_individual'));
  assert.ok(cropEvents.some(entry=>entry[1]==='tool_action'&&entry[2]?.tool_id==='screenshot-crop'&&entry[2]?.action_id==='save_all_zip'));
  const cropPayload=JSON.stringify(cropEvents);
  assert.equal(cropPayload.includes('screenshot-test.png'),false);
  assert.equal(cropPayload.includes('second-private-name.png'),false);
  assert.equal(cropPayload.includes('third-private-name.png'),false);
}

assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.screenshot({path:path.join(artifactDir,'screenshot-crop-'+width+'.png'),fullPage:true});

assert.deepEqual(errors,[]);
assert.deepEqual(missing,[]);
console.log(JSON.stringify({width,inputEscaping:'PASS',timer:'PASS',savings:12000,assumedInvestment:12279,persistence:'PASS',screenshotCrop:'PASS',simplifiedHierarchy:'PASS',stickyControls:'PASS',fastActions:'PASS',clipboardCopy:'PASS',mobileActionDock:'PASS',mobileEditorDensity:'PASS',simpleEdgeSelection:'PASS',cropPresets:'PASS',presetPersistence:'PASS',multiImageQueue:'PASS',batchManualInheritance:'PASS',individualBatchExport:'PASS',zipExport:'PASS',advancedSettings:'PASS',compare:'PASS',firstViewActionable:'PASS',overflow:false,scriptErrors:errors.length,missingAssets:missing.length}));
await page.close();}


if (!given) {
  const context = await browser.newContext({viewport:{width:390,height:850}});
  const pwaPage = await context.newPage();
  const workerPath = path.join(root,'screenshot-crop/sw.js');
  const corePath = path.join(root,'screenshot-crop/core.js');
  const workerSource = fs.readFileSync(workerPath,'utf8');
  const coreSource = fs.readFileSync(corePath,'utf8');
  try {
    await pwaPage.route(base+'/analytics.js', () => new Promise(() => {}));
    await pwaPage.goto(base+'/screenshot-crop/',{waitUntil:'domcontentloaded'});
    await pwaPage.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
    await pwaPage.evaluate(()=>localStorage.setItem('pwa-audit-sentinel','keep'));
    await context.setOffline(true);
    await pwaPage.reload({waitUntil:'domcontentloaded'});
    assert.equal(await pwaPage.locator('#dropZone').isVisible(),true);
    const png = await pwaPage.evaluate(()=>{
      const c=document.createElement('canvas');c.width=1080;c.height=2400;
      const x=c.getContext('2d');x.fillStyle='#111827';x.fillRect(0,0,1080,2400);
      x.fillStyle='#e0f2fe';x.fillRect(0,100,1080,2200);
      return c.toDataURL('image/png').split(',')[1];
    });
    await pwaPage.locator('#fileInput').setInputFiles({
      name:'offline-test.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')
    });
    await pwaPage.locator('#editorSection').waitFor({state:'visible'});
    await pwaPage.waitForFunction(()=>/切り取り位置.*保存/.test(document.querySelector('#readyHint').textContent));
    const [download] = await Promise.all([
      pwaPage.waitForEvent('download'),
      pwaPage.locator('#quickSaveButton').click()
    ]);
    assert.match(download.suggestedFilename(), /-safe\.(?:png|jpg|webp)$/);
    await context.setOffline(false);
    fs.writeFileSync(corePath,coreSource+'\nwindow.__pwaAuditRevision = 2;\n');
    fs.writeFileSync(workerPath,workerSource.replace(
      /const STATIC_CACHE = '[^']+';/,
      "const STATIC_CACHE = 'screenshot-crop-static-audit-update';"
    ));
    await pwaPage.evaluate(async()=>{
      const r=await navigator.serviceWorker.getRegistration();await r.update();
    });
    await pwaPage.waitForFunction(async()=>{
      const r=await navigator.serviceWorker.getRegistration();return Boolean(r.waiting);
    });
    assert.equal(await pwaPage.evaluate(()=>window.__pwaAuditRevision),undefined);
    await pwaPage.getByRole('button',{name:'更新する',exact:true}).click();
    await pwaPage.waitForFunction(()=>window.__pwaAuditRevision===2);
    assert.equal(await pwaPage.evaluate(()=>localStorage.getItem('pwa-audit-sentinel')),'keep');
    // An incomplete update must leave the working version active.
    fs.writeFileSync(workerPath,workerSource.replace(
      /const STATIC_CACHE = '[^']+';/,
      "const STATIC_CACHE = 'screenshot-crop-static-audit-broken';"
    ).replace("'./core.js'","'./missing-audit-core.js'"));
    await pwaPage.evaluate(async()=>{
      const r=await navigator.serviceWorker.getRegistration();
      window.__auditInstallFailed=new Promise(resolve=>{
        r.addEventListener('updatefound',()=>{
          const w=r.installing;
          w.addEventListener('statechange',()=>{if(w.state==='redundant')resolve(true)});
        },{once:true});
      });
      await r.update();
    });
    assert.equal(await pwaPage.evaluate(()=>window.__auditInstallFailed),true);
    await context.setOffline(true);
    await pwaPage.reload({waitUntil:'domcontentloaded'});
    assert.equal(await pwaPage.evaluate(()=>window.__pwaAuditRevision),2);
    assert.equal(await pwaPage.locator('#dropZone').isVisible(),true);
    console.log(JSON.stringify({pwaOfflineLaunch:'PASS',pwaOfflineExport:'PASS',
      stalledAnalytics:'PASS',userAcceptedUpdate:'PASS',updateStoragePreserved:'PASS',
      failedUpdateKeepsWorkingVersion:'PASS'}));
  } finally {
    fs.writeFileSync(workerPath,workerSource);
    fs.writeFileSync(corePath,coreSource);
    await context.close();
  }
}


if (!given) {
  for (const app of ['/', '/discount-calc/', '/qrcode/', '/emphasis-lines/', '/password-generator/', '/lab-tools/gravity-todo/', '/lab-tools/kids-smile-land/']) {
    const context = await browser.newContext({viewport:{width:390,height:850}});
    const page = await context.newPage();
    try {
      await page.route(base+'/analytics.js', () => new Promise(() => {}));
      await page.route('https://fonts.googleapis.com/**', () => new Promise(() => {}));
      await page.goto(base+app, {waitUntil:'domcontentloaded'});
      await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
      await page.evaluate(() => localStorage.setItem('pwa-audit-sentinel','keep'));
      const first = await page.title();
      await context.setOffline(true);
      await page.reload({waitUntil:'domcontentloaded',timeout:10000});
      assert.equal(await page.title(), first, app+': 同じ入口をオフライン表示');
      assert.equal(await page.evaluate(() => localStorage.getItem('pwa-audit-sentinel')), 'keep');
      assert.ok((await page.locator('body').textContent()).trim().length > 20);
      if (app === '/lab-tools/gravity-todo/') {
        // Canvasより上の常設ボタンを実クリックし、pointer-events継承の回帰を検出する。
        await page.waitForFunction(() => document.querySelector('#task-count').textContent === '3');
        await page.locator('#task-input').fill('履歴ボタン検証');
        await page.locator('#task-input').press('Enter');
        const task = page.locator('.task-list-item').filter({hasText:'履歴ボタン検証'});
        await task.locator('[data-action="destroy"]').click();
        await page.locator('#undo-btn').click();
        await task.waitFor({state:'visible'});
        await page.locator('#redo-btn').click();
        await task.waitFor({state:'detached'});
        await page.locator('#undo-btn').click();
        await task.waitFor({state:'visible'});
          await page.locator('#save-status').waitFor({state:'hidden'});
        await page.reload({waitUntil:'domcontentloaded'});
        await task.waitFor({state:'visible'});
        assert.equal(await page.locator('#task-count').textContent(), '1', 'デモを保存せず実タスクだけ復元');
      }
      console.log(JSON.stringify({app,offlineLaunch:'PASS',stalledAnalytics:'PASS',storagePreserved:'PASS'}));
    } finally { await context.close(); }
  }
}

const shortPage=await browser.newPage({viewport:{width:1024,height:600}});
await shortPage.goto(base+'/screenshot-crop/',{waitUntil:'networkidle'});
const shortView=await shortPage.evaluate(()=>{
  const upload=document.querySelector('#uploadSection')?.getBoundingClientRect();
  return {top:upload?.top??99999,bottom:upload?.bottom??99999,viewport:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth};
});
assert.ok(shortView.top<shortView.viewport*0.5);
assert.ok(shortView.bottom<=shortView.viewport);
assert.equal(shortView.overflow,false);
assert.equal(await shortPage.locator('[data-edge-preset]').count(),0);
assert.equal(await shortPage.locator('[data-effect]').count(),0);
const shortPngData=await shortPage.evaluate(()=>{
  const canvas=document.createElement('canvas');
  canvas.width=1080;canvas.height=2400;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#111827';ctx.fillRect(0,0,1080,92);
  ctx.fillStyle='#e0f2fe';ctx.fillRect(0,92,1080,2200);
  ctx.fillStyle='#111827';ctx.fillRect(0,2292,1080,108);
  return canvas.toDataURL('image/png').split(',')[1];
});
await shortPage.locator('#fileInput').setInputFiles({
  name:'short-screen.png',
  mimeType:'image/png',
  buffer:Buffer.from(shortPngData,'base64')
});
await shortPage.locator('#editorSection').waitFor({state:'visible'});
assert.equal(await shortPage.locator('#quickActionDock').isVisible(),true);
assert.equal(await shortPage.locator('#quickSaveButton').isVisible(),true);
assert.equal(await shortPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await shortPage.screenshot({path:path.join(artifactDir,'screenshot-crop-short-desktop.png'),fullPage:true});
await shortPage.close();
console.log(JSON.stringify({screenshotCropShortViewport:'PASS',shortScreenQuickDock:'PASS',simpleUi:'PASS',width:1024,height:600}));

// 実画面で損益ゼロと黒字の境界、1円単位の釣銭を確認する。
const doujinPage=await browser.newPage({viewport:{width:390,height:850}});
try {
  const doujinErrors=[];
  doujinPage.on('pageerror',error=>doujinErrors.push(error.message));
  await doujinPage.route('**/*',route=>{
    const url=route.request().url();
    if(url.startsWith(base)) return route.continue();
    if(url.includes('cdn.tailwindcss.com')) return route.fulfill({contentType:'text/javascript',body:'window.tailwind={config:{}};'});
    return route.abort();
  });
  await doujinPage.goto(base+'/doujin-calc/',{waitUntil:'domcontentloaded'});
  await doujinPage.waitForFunction(()=>document.querySelector('#label-total-cost')?.textContent==='¥44,500');
  await doujinPage.locator('#input-custom-price').fill('500');
  await doujinPage.waitForFunction(()=>document.querySelector('#custom-breakeven')?.textContent==='90部');
  assert.match(await doujinPage.locator('#label-slider-breakeven').textContent(),/89部 \(損益分岐\)/);
  assert.match(await doujinPage.locator('#textarea-menu-memo').inputValue(),/黒字化ライン: 90部で黒字化/);
  await doujinPage.locator('#input-custom-price').fill('899');
  await doujinPage.waitForFunction(()=>document.querySelector('#change-1')?.textContent.startsWith('40枚'));
  assert.equal(await doujinPage.locator('#row-change-1').evaluate(el=>el.classList.contains('hidden')),false);
  assert.match(await doujinPage.locator('#custom-comfort-desc').textContent(),/1円玉×1/);
  assert.match(await doujinPage.locator('#textarea-menu-memo').inputValue(),/1円玉40枚/);
  await doujinPage.locator('#input-custom-price').fill('895');
  await doujinPage.waitForFunction(()=>document.querySelector('#change-5')?.textContent.startsWith('40枚'));
  assert.equal(await doujinPage.locator('#row-change-5').evaluate(el=>el.classList.contains('hidden')),false);
  await doujinPage.locator('#input-custom-price').fill('899.5');
  assert.equal(await doujinPage.locator('#input-custom-price').getAttribute('aria-invalid'),'true');
  assert.match(await doujinPage.locator('#label-change-total').textContent(),/1円単位/);
  assert.match(await doujinPage.locator('#textarea-menu-memo').inputValue(),/1円単位の整数/);
  assert.deepEqual(doujinErrors,[]);
  console.log(JSON.stringify({doujinProfitBoundary:'PASS',doujinSmallChange:'PASS',doujinInvalidPrice:'PASS'}));
} finally { await doujinPage.close(); }

const analyticsPage=await browser.newPage({viewport:{width:390,height:850}});
await analyticsPage.route('**/*googletagmanager.com/**',route=>route.abort());
await analyticsPage.route('**/*google-analytics.com/**',route=>route.abort());
await analyticsPage.goto(base+'/',{waitUntil:'domcontentloaded'});
const privateSearch='送信禁止テスト検索語';
await analyticsPage.locator('#project-search').fill(privateSearch);
await analyticsPage.waitForTimeout(900);
assert.equal(analyticsPage.url().includes('q='),false);
assert.equal(analyticsPage.url().includes('tool_q='),false);
const searchEvents=await analyticsPage.evaluate(()=>window.dataLayer.map(entry=>Array.from(entry)).filter(entry=>entry[0]==='event'));
assert.ok(searchEvents.some(entry=>entry[1]==='site_search'&&entry[2]?.search_length>0));
assert.equal(JSON.stringify(searchEvents).includes(privateSearch),false);

await analyticsPage.goto(base+'/guides/tool-selection-guide.html',{waitUntil:'domcontentloaded'});
await analyticsPage.evaluate(()=>{
  document.documentElement.style.scrollBehavior='auto';
  window.scrollTo(0,Math.max(0,(document.documentElement.scrollHeight-innerHeight)*0.75));
});
await analyticsPage.waitForFunction(()=>window.dataLayer
  .map(entry=>Array.from(entry))
  .some(entry=>entry[0]==='event'&&entry[1]==='content_progress'&&entry[2]?.progress_percent===50));
const contentEvents=await analyticsPage.evaluate(()=>window.dataLayer.map(entry=>Array.from(entry)).filter(entry=>entry[0]==='event'));
assert.ok(contentEvents.some(entry=>entry[1]==='content_progress'&&entry[2]?.progress_percent===50));
await analyticsPage.close();
console.log(JSON.stringify({analyticsPrivacy:'PASS',analyticsToolEvents:'PASS',analyticsSearch:'PASS',analyticsContentProgress:'PASS'}));
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
