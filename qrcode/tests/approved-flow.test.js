'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const script=fs.readFileSync(path.join(root,'script.js'),'utf8');
for(const file of ['index.html','en/index.html']) test(`${file}: single QR controls stay outside the inert sidebar`,()=>{
 const html=fs.readFileSync(path.join(root,file),'utf8'); const sidebar=html.indexOf('<aside id="settingsSidebar"');
 for(const id of ['dataType','templateFields','exportFormat','openLogoBtn','printQrBtn']) {
   assert.equal(html.split(`id="${id}"`).length,2,`${id} must be unique`);
   assert(html.indexOf(`id="${id}"`)<sidebar,`${id} must be in primary flow`);
 }
 const colors=html.slice(html.indexOf('id="colorDetails"'),html.indexOf('</details>',html.indexOf('id="colorDetails"')));
 for(const id of ['qrForeground','qrBackground','transparentBg','eccLevel','qrPadding']) assert(colors.includes(`id="${id}"`));
 assert.match(html,/<details class="advanced-settings" id="colorDetails">/);
 assert.match(html,/id="qrPrintArea" aria-hidden="true"><canvas/);
});
function callback(id,scope){const start=script.indexOf(`document.getElementById('${id}')?.addEventListener('click', () => {`);assert(start>=0);const bodyStart=script.indexOf('{',start)+1;const end=script.indexOf('\n    });',bodyStart);vm.runInNewContext('(function(){'+script.slice(bodyStart,end)+'})()',scope);}
test('Print ignores invalid/pending QR and copies only the successful canvas once',()=>{
 for(const valid of [false,true]) for(const disabled of [false,true]) {
 let count=0,drawn=null;const canvas={width:250,height:250}; const output={getContext:()=>({fillRect(){},drawImage(x){drawn=x}})};
 callback('printQrBtn',{state:{renderReady:true},els:{downloadBtn:{disabled},canvas},isValidContent:()=>valid,document:{getElementById:()=>output},window:{print(){count++}}});
 assert.equal(count,valid&&!disabled?1:0); if(count){assert.equal(drawn,canvas);assert.equal(output.width,250);}
 }
});
test('Logo discovery only opens existing settings; it does not enable or load a logo',()=>{
 let opened=0,focused=0;const panel={open:false,querySelector:()=>({focus(){focused++}})};
 callback('openLogoBtn',{openSidebar(){opened++},els:{settingsSidebar:{querySelector:()=>panel}}});
 assert.equal(opened,1);assert.equal(panel.open,true);assert.equal(focused,1);
});
test('Print CSS excludes all other body content and does not expose bulk output',()=>{
 const css=fs.readFileSync(path.join(root,'style.css'),'utf8');assert.match(css,/@media print\s*\{\s*body > \* \{ display: none !important;/);assert.match(css,/body > #qrPrintArea \{ display: block !important;/);
});

test('failed render remains disabled after debounce loading clears; print cannot use stale canvas',()=>{
 const section=(name,next)=>script.slice(script.indexOf(`  const ${name} =`),script.indexOf(`  const ${next} =`));
 let printCalls=0;
 const scope={console:{error(){}},state:{criticalError:false,qr:{},currentDataType:'plain',currentLang:'en'},els:{canvas:{style:{},width:250,height:250},placeholder:{style:{}},downloadBtn:{disabled:false},fileNamePreview:{},errorMsg:{style:{}},loading:{style:{}},text:{value:'valid but unrenderable'},size:{value:'100'},fgColor:{value:'#000000'},bgColor:{value:'#ffffff'},transparentBg:{checked:false},qrPadding:{value:'20'}},validateTemplateInput:()=>({valid:true}),isValidContent:()=>true,updatePaddingDisplay(){},updateQualityReport(){},setQrWithSafePadding(){throw Error('cannot fit safe margin')},getEffectiveEccLevel:()=> 'H',applyLogoOverlay(){},updateFileNamePreview(){},t:k=>k,document:{getElementById:()=>({getContext:()=>({fillRect(){},drawImage(){}})})},window:{print(){printCalls++}}};
 vm.runInNewContext(section('setLoading','updateSizeDisplay')+section('updateQR','triggerDownload')+'setLoading(true); updateQR(); setLoading(false);',scope);
 assert.equal(scope.els.downloadBtn.disabled,true);assert.equal(scope.state.renderReady,false);
 callback('printQrBtn',scope);assert.equal(printCalls,0);
 scope.setQrWithSafePadding=()=>{};
 vm.runInNewContext('updateQR(); setLoading(false);',scope);
 assert.equal(scope.state.renderReady,true);assert.equal(scope.els.downloadBtn.disabled,false);
 callback('printQrBtn',scope);assert.equal(printCalls,1);
});
