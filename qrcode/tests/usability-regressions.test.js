'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'); const vm=require('node:vm'); const path=require('node:path');
const script=fs.readFileSync(process.env.QR_TEST_SCRIPT || path.join(__dirname,'../script.js'),'utf8');
function bulk(){
 const state={bulkRows:[{value:'previous'}],bulkLoadId:0};
 const els={bulkCsvText:{value:'previous'},bulkSummary:{textContent:'previous'},bulkStatus:{textContent:'previous'}};
 const ctx={state,els,t:x=>x,console:{error(){}},disabled:false,clears:0};
 ctx.clearBulkPreview=()=>ctx.clears++;ctx.setBulkDownloadButtonsDisabled=x=>ctx.disabled=x;
 ctx.parseBulkCsv=()=>{ if(els.bulkCsvText.value==='INVALID'){state.bulkRows=[];ctx.disabled=true;els.bulkSummary.textContent='invalid';}else{state.bulkRows=[{value:els.bulkCsvText.value}];ctx.disabled=false;els.bulkSummary.textContent='loaded';}};
 const start=script.indexOf('  const invalidateBulkRead =')>=0?script.indexOf('  const invalidateBulkRead ='):script.indexOf('  const readBulkCsvFile =');
 vm.runInNewContext(script.slice(start,script.indexOf('  const updateQR =',start))+';this.read=readBulkCsvFile;this.invalidate=typeof invalidateBulkRead === "function" ? invalidateBulkRead : ()=>{};',ctx);
 return ctx;
}
function deferred(){let resolve,reject; const promise=new Promise((r,j)=>{resolve=r;reject=j;});return {file:{text:()=>promise},resolve,reject};}
test('latest CSV selection wins when earlier read completes last',async()=>{const h=bulk(),a=deferred(),b=deferred();const x=h.read(a.file),y=h.read(b.file);b.resolve('new');await y;a.resolve('old');await x;assert.equal(h.els.bulkCsvText.value,'new');});
test('later invalid CSV remains invalid despite older success',async()=>{const h=bulk(),a=deferred(),b=deferred();const x=h.read(a.file),y=h.read(b.file);b.resolve('INVALID');await y;a.resolve('old');await x;assert.equal(h.els.bulkCsvText.value,'INVALID');assert.equal(h.disabled,true);assert.equal(h.state.bulkRows.length,0);});
test('late old read failure does not overwrite newer success',async()=>{const h=bulk(),a=deferred(),b=deferred();const x=h.read(a.file),y=h.read(b.file);b.resolve('new');await y;a.reject(Error('old'));await x;assert.equal(h.disabled,false);assert.equal(h.els.bulkSummary.textContent,'loaded');});
test('later read failure does not resurrect older rows',async()=>{const h=bulk(),a=deferred(),b=deferred();const x=h.read(a.file),y=h.read(b.file);b.reject(Error('new'));await y;a.resolve('old');await x;assert.equal(h.state.bulkRows.length,0);assert.equal(h.disabled,true);assert.equal(h.els.bulkSummary.textContent,'bulk.fileReadFailed');});
test('new pending read disables previous download and clears parsed rows',async()=>{const h=bulk(),a=deferred();const x=h.read(a.file);assert.equal(h.disabled,true);assert.equal(h.state.bulkRows.length,0);a.resolve('new');await x;});
test('manual edit invalidates pending read',async()=>{const h=bulk(),a=deferred();const x=h.read(a.file);h.invalidate();h.els.bulkCsvText.value='manual';a.resolve('old');await x;assert.equal(h.els.bulkCsvText.value,'manual');});
test('empty file selection invalidates pending read',async()=>{const h=bulk(),a=deferred();const x=h.read(a.file);await h.read(null);a.resolve('old');await x;assert.equal(h.state.bulkRows.length,0);assert.equal(h.disabled,true);});
for(const [w,h] of [[400,100],[100,400],[100,100]]) for(const backdrop of [true,false]) test(`logo ${w}x${h} keeps aspect ratio and box, backdrop=${backdrop}`,()=>{
 const calls=[],rects=[];const context={save(){},restore(){},fill(){},drawImage(...a){calls.push(a);}};
 const canvas={width:250,height:250,getContext:()=>context};
 const ctx={state:{logoImage:{naturalWidth:w,naturalHeight:h},qr:{canvas}},els:{logoWarning:{style:{}},logoBackdrop:{checked:backdrop}},hasLogo:()=>true,getLogoPercent:()=>14,drawRoundedRect:(...a)=>rects.push(a)};
 const start=script.indexOf('  const applyLogoOverlay ='); vm.runInNewContext(script.slice(start,script.indexOf('  const updateLogoSizeDisplay =',start))+';applyLogoOverlay();',ctx);
 const [,x,y,dw,dh]=calls[0];assert.equal(dw/dh,w/h);assert.equal(Math.max(dw,dh),35);assert.equal(x+dw/2,125);assert.equal(y+dh/2,125);assert.equal(rects.length,backdrop?1:0);if(backdrop){assert.equal(rects[0][3],44.8);assert.equal(rects[0][4],44.8);}
});
test('manual text edit and explicit parse are wired to invalidate reads',()=>{assert.match(script,/bulkCsvText\.addEventListener\('input', \(\) => \{\s+invalidateBulkRead\(\)/);assert.match(script,/bulkPreviewBtn\.addEventListener\('click', \(\) => \{\s+invalidateBulkRead\(\)/);});
