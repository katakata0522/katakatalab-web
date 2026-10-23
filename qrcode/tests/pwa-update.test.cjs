'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/pwa.js'),'utf8');

async function setup(){
  const handlers={},listeners={},posted=[];
  let reloads=0;
  const registration={waiting:{postMessage(value){posted.push(JSON.parse(JSON.stringify(value)));}},addEventListener(){}};
  const document={readyState:'complete',getElementById(){return null;},head:{appendChild(){}},body:{appendChild(){}},
    createElement(tag){return tag==='div'?{isConnected:true,setAttribute(){},querySelector(selector){return {addEventListener(event,handler){handlers[selector]=handler;}};},remove(){this.isConnected=false;}}:{};}};
  const navigator={language:'ja',serviceWorker:{register:async()=>registration,addEventListener(event,handler){listeners[event]=handler;}}};
  vm.runInNewContext(source,{document,navigator,window:{isSecureContext:true,location:{reload(){reloads++;}}},setTimeout(){},console});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(typeof handlers['[data-update-now]'],'function','Waiting worker must show an actionable update prompt');
  return {registration,listeners,posted,click:handlers['[data-update-now]'],reloads:()=>reloads};
}

test('QR update still reloads after waiting worker activates before click',async()=>{
  const h=await setup();
  h.registration.waiting=null;
  assert.doesNotThrow(()=>h.click());
  assert.equal(h.reloads(),1);
  assert.deepEqual(h.posted,[]);
});

test('QR waiting worker gets activation message and reloads on controller change',async()=>{
  const h=await setup();
  h.click();
  assert.deepEqual(h.posted,[{type:'SKIP_WAITING'}]);
  assert.equal(h.reloads(),0);
  assert.equal(typeof h.listeners.controllerchange,'function');
  h.listeners.controllerchange();
  assert.equal(h.reloads(),1);
});
