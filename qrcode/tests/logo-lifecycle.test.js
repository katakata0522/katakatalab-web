'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = fs.readFileSync(path.join(__dirname,'../script.js'),'utf8');
function harness() {
  const images=[];
  const state={logoLoadId:0,logoImage:null,logoDataUrl:'',currentPlan:'pro'};
  const scope={state,MAX_LOGO_FILE_BYTES:2*1024*1024,els:{logoFile:{value:''},logoPreview:{src:'',hidden:true},logoWarning:{style:{}}},
    t:key=>key, isProPlan:()=>state.currentPlan==='pro',setPlanStatus:()=>{},updateQR:()=>{},
    FileReader:class { readAsDataURL(file) {this.result='data:image/png;base64,'+file.name;queueMicrotask(()=>this.onload());}},
    Image:class {constructor(){this.complete=false;images.push(this);} set src(value){this.source=value;}}
  };
  const from=script.indexOf('  const clearLogoState =');
  const to=script.indexOf('  const getTemplateGroups =',from);
  vm.runInNewContext(script.slice(from,to)+'\nglobalThis.api={clearLogoState,loadLogoFromFile};',scope);
  return {state,scope,api:scope.api,images,complete(image){image.complete=true;image.naturalWidth=100;image.naturalHeight=100;image.onload();}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('先に選んだロゴの読み込みが遅れても、後から選んだロゴを上書きしない',async()=>{
  const h=harness();
  const first=h.api.loadLogoFromFile({name:'first',size:20});await tick();
  const second=h.api.loadLogoFromFile({name:'second',size:20});await tick();
  h.complete(h.images[1]);await second;
  h.complete(h.images[0]);await first;
  assert.equal(h.state.logoDataUrl,'data:image/png;base64,second');
  assert.equal(h.scope.els.logoPreview.src,h.state.logoDataUrl);
});

test('読み込み中に削除したロゴは、完了しても復活しない',async()=>{
  const h=harness();const pending=h.api.loadLogoFromFile({name:'first',size:20});await tick();
  h.api.clearLogoState();h.complete(h.images[0]);await pending;
  assert.equal(h.state.logoImage,null);assert.equal(h.scope.els.logoPreview.hidden,true);
});

test('読み込み中にProが無効になるとロゴを反映しない',async()=>{
  const h=harness();const pending=h.api.loadLogoFromFile({name:'first',size:20});await tick();
  h.state.currentPlan='free';h.complete(h.images[0]);await pending;
  assert.equal(h.state.logoImage,null);
});

test('容量超過の次ファイルを選んだ場合も、前の未完了ファイルを復活させない',async()=>{
  const h=harness();const pending=h.api.loadLogoFromFile({name:'first',size:20});await tick();
  await h.api.loadLogoFromFile({name:'oversize',size:3*1024*1024});h.complete(h.images[0]);await pending;
  assert.equal(h.state.logoImage,null);
});
