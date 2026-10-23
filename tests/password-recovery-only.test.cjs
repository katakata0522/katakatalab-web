const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../password-generator/script.js','utf8');
const start=source.indexOf('    // ===== Legacy vault:');const end=source.indexOf('    // ===== FAQ アコーディオン',start);
function element(){return {value:'',textContent:'',hidden:false,disabled:false,children:[],listeners:{},style:{},setAttribute(){},classList:{},replaceChildren(){this.children=[];this.textContent=''},appendChild(e){this.children.push(e)},addEventListener(k,f){this.listeners[k]=f},click(){return this.listeners.click?.()}}}
function harness({artifacts=false,exists=false}={}){
 const es={},listeners={};let unlocked=false,stored=[{id:'1',siteName:'dummy',category:'other',password:'Dummy-7!',fields:[]}],resolve;
 const vault={hasStoredArtifacts:()=>artifacts,exists:()=>exists,isCryptoSupported:()=>true,get isUnlocked(){return unlocked},get entries(){return stored},search:()=>stored,lock(){unlocked=false},unlock:()=>new Promise(r=>{resolve=()=>{unlocked=true;r(true)}}),exportEncrypted:()=>'{"fixture":"encrypted"}'};
 const context={$:id=>es[id]??=element(),document:{querySelector:()=>es.tab??=element(),createElement:()=>element()},window:{addEventListener(k,f){listeners[k]=f}},vault,vaultUiSession:0,copyTextWithPrivacy:async()=>true,showToast(){},setTimeout(){},Blob,URL:{createObjectURL:()=>'',revokeObjectURL(){}}};
 vm.createContext(context);vm.runInContext(source.slice(start,end)+'\ninitVaultUI();globalThis.api={initVaultUI,renderVaultEntries};',context);
 return {es,listeners,context,vault,release(){resolve()},setUnlocked(){unlocked=true}};
}
test('new users have no legacy recovery entry; no writes during startup',()=>{const h=harness();assert(h.es.tab.hidden);assert(h.es['vault-unlock-btn'].disabled);assert(h.es['vault-export-btn'].disabled)});
test('existing artifacts reveal recovery and preserve malformed state without reset control',()=>{const h=harness({artifacts:true});assert(!h.es.tab.hidden);assert(h.es['vault-unlock-btn'].disabled);assert.match(h.es['vault-lock-error'].textContent,/変更していません/)});
test('unlock clears master immediately and lock clears rendered plaintext and search',async()=>{
 const h=harness({artifacts:true,exists:true});h.es['vault-master-pw'].value='dummy master';const work=h.es['vault-unlock-btn'].click();assert.equal(h.es['vault-master-pw'].value,'');h.release();await work;assert(!h.es['vault-main'].hidden);assert(h.es['vault-entries'].children.length);h.es['vault-search'].value='secret';h.es['vault-lock-btn'].click();assert.equal(h.es['vault-entries'].children.length,0);assert.equal(h.es['vault-search'].value,'');assert(h.es['vault-main'].hidden);
});
test('storage change during pending unlock never repopulates recovery DOM',async()=>{const h=harness({artifacts:true,exists:true});const work=h.es['vault-unlock-btn'].click();h.listeners.storage({key:'password-gen-vault'});h.release();await work;assert(h.es['vault-main'].hidden);assert.equal(h.es['vault-entries'].children.length,0)});
test('stale card copy and reveal callbacks cannot operate after lock and re-unlock',async()=>{
 const h=harness({artifacts:true,exists:true});h.setUnlocked();h.context.api.renderVaultEntries();const card=h.es['vault-entries'].children[0],body=card.children[0],copy=body.children[0].children[1].children[0],toggle=body.children[1].children[1],display=body.children[1].children[0];let copied=0;h.context.copyTextWithPrivacy=async()=>{copied++};h.es['vault-lock-btn'].click();h.setUnlocked();await copy.click();toggle.click();assert.equal(copied,0);assert.equal(display.textContent,'••••••••');
});

test('leaving recovery cancels a pending unlock before it can render',async()=>{
 const h=harness({artifacts:true,exists:true});const work=h.es['vault-unlock-btn'].click();
 h.context.tabBtns=[];h.context.tabPanels=[];
 const a=source.indexOf('    function switchTab('),b=source.indexOf('    tabBtns.forEach(btn => {\n        btn.addEventListener',a);
 vm.runInContext(source.slice(a,b)+"switchTab('gen');",h.context);
 h.release();await work;assert(h.es['vault-main'].hidden);assert.equal(h.es['vault-entries'].children.length,0);
});
