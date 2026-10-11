const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto, randomUUID} = require('node:crypto');
const locks = require('./helpers/vault-locks.cjs');
const source = fs.readFileSync(require('node:path').join(__dirname,'../password-generator/vault.js'),'utf8').replace('export { PasswordVault };','');
const KEY='password-gen-vault', SALT='password-gen-vault-salt', PW='Synthetic-only-password-2026!';
function storage(initial={}) {
 const map=new Map(Object.entries(initial));
 return { writes:0, fail:false, failRead:false,
  getItem(k){if(this.failRead)throw Error('read denied');return map.has(k)?map.get(k):null},
  setItem(k,v){this.writes++;if(this.fail)throw Error('quota');map.set(k,String(v))},
  removeItem(k){map.delete(k)}, snapshot(){return Object.fromEntries(map)} };
}
function load(s, support=true) {
 const c={localStorage:s,navigator:support?locks(s):{},crypto:{subtle:webcrypto.subtle,getRandomValues:webcrypto.getRandomValues.bind(webcrypto),randomUUID},TextEncoder,TextDecoder,Uint8Array,Date,JSON};
 vm.runInNewContext(source,c);return new c.PasswordVault();
}
async function ready(){const s=storage(),v=load(s);await v.setup(PW);await v.addEntry({siteName:'dummy.example',password:'dummy-secret'});return {s,v}}
function gate(v,method){const old=v[method].bind(v);let release,started;const began=new Promise(r=>started=r);v[method]=async(...args)=>{started();await new Promise(r=>release=r);return old(...args)};return {began,release:()=>release()}}
test('two simultaneous VM tabs serialize and reject stale writer; reopen recovers',async()=>{
 const {s,v}=await ready(), other=load(s);await other.unlock(PW);const old=s.snapshot();
 const results=await Promise.allSettled([v.addEntry({siteName:'first',password:'a'}),other.addEntry({siteName:'second',password:'b'})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.match(results.find(r=>r.status==='rejected').reason.message,/別のタブ/);
 const reader=load(s);await reader.unlock(PW);assert.equal(reader.entries.length,2);assert.notDeepEqual(s.snapshot(),old);
 const loser=results[0].status==='rejected'?v:other;assert.equal(loser.entries.length,1);await loser.unlock(PW);await loser.addEntry({siteName:'after-reopen',password:'c'});assert.equal(loser.entries.length,3);
});
test('same instance overlapping mutation refuses instead of corrupt rollback',async()=>{
 const {s,v}=await ready(),g=gate(v,'_encrypt');const a=v.addEntry({siteName:'a',password:'a'});await g.began;
 await assert.rejects(v.addEntry({siteName:'b',password:'b'}),/処理中/);g.release();await a;assert.equal(v.entries.length,2);
});
for(const op of ['setup','unlock','save'])test(`lock cancels pending ${op} before publication/commit`,async()=>{
 const pair=op==='setup'?{s:storage()}:await ready(),s=pair.s,v=op==='setup'?load(s):pair.v;
 const before=s.snapshot(),g=gate(v,op==='save'?'_encrypt':'_deriveKey');
 const work=op==='save'?v.addEntry({siteName:'new',password:'x'}):v[op](PW);await g.began;v.lock();g.release();await assert.rejects(work,/ロック/);
 assert.equal(v.isUnlocked,false);assert.equal(v.entries.length,0);assert.deepEqual(s.snapshot(),before);
});
test('read-denied setup cannot overwrite artifacts',async()=>{const s=storage({[KEY]:'kept'}),v=load(s);s.failRead=true;await assert.rejects(v.setup(PW),/読込/);assert.equal(s.writes,0)});
test('setup refuses both intact vault and corrupted artifacts',async()=>{for(const data of [{[SALT]:'broken'},{[KEY]:'broken'}]){const s=storage(data),v=load(s);await assert.rejects(v.setup(PW),/既存/);assert.equal(s.writes,0)}});
test('without Web Locks legacy unlock and export work; every mutation refuses',async()=>{const {s,v}=await ready(),r=load(s,false);assert.equal(await r.unlock(PW),true);const backup=r.exportEncrypted(),before=s.snapshot();for(const work of [()=>r.addEntry({}),()=>r.updateEntry(r.entries[0].id,{}),()=>r.deleteEntry(r.entries[0].id),()=>r.destroy(),()=>r.importEncrypted(backup,PW),()=>r.setup(PW)])await assert.rejects(work,/同時保存/);assert.deepEqual(s.snapshot(),before)});
test('entry/search return deep copies',async()=>{const {v}=await ready();for(const rows of [v.entries,v.search('dummy')]){rows[0].password='changed';rows[0].fields.push({label:'bad',value:'bad'})}assert.equal(v.entries[0].password,'dummy-secret');assert.equal(v.entries[0].fields.length,0)});
test('wrong password, tamper and schema failure cause zero import writes',async()=>{
 const {s,v}=await ready(),before=s.snapshot(),backup=v.exportEncrypted();
 const bad=JSON.parse(backup);bad.data.ct=(bad.data.ct[0]==='0'?'1':'0')+bad.data.ct.slice(1);
 for(const [payload,password] of [[backup,'wrong'],[JSON.stringify(bad),PW]]){const writes=s.writes;await assert.rejects(v.importEncrypted(payload,password));assert.equal(s.writes,writes);assert.deepEqual(s.snapshot(),before);assert.equal(v.isUnlocked,true)}
 for(const content of [[null],{},[{id:'x',siteName:'ok',password:3}],Array(1001).fill({})]){const payload=JSON.stringify({salt:JSON.parse(backup).salt,data:await v._encrypt(JSON.stringify(content))});const writes=s.writes;await assert.rejects(v.importEncrypted(payload,PW),/形式/);assert.equal(s.writes,writes);assert.deepEqual(s.snapshot(),before)}
});
test('quota failure during atomic import retains complete old envelope and unlocked entries',async()=>{const a=await ready(),b=await ready(),before=b.s.snapshot();b.s.fail=true;await assert.rejects(b.v.importEncrypted(a.v.exportEncrypted(),PW),/インポートに失敗/);assert.deepEqual(b.s.snapshot(),before);assert.equal(b.v.isUnlocked,true)});
test('import cancelled by lock never writes',async()=>{const {s,v}=await ready(),g=gate(v,'_deriveKey'),before=s.snapshot();const work=v.importEncrypted(v.exportEncrypted(),PW);await g.began;v.lock();g.release();await assert.rejects(work,/ロック/);assert.deepEqual(s.snapshot(),before);assert.equal(v.isUnlocked,false)});
test('over-2MiB legitimate backup imports without truncation; new over-16MiB save rejects',async()=>{
 const {s,v}=await ready();const fields=Array.from({length:50},(_,i)=>({label:String(i)+'L'.repeat(1000),value:'V'.repeat(1024)}));
 for(let i=0;i<11;i++)await v.addEntry({siteName:'large'+i,password:'dummy',fields});const backup=v.exportEncrypted();assert(backup.length>2*1024*1024);const destination=storage(),other=load(destination);await other.importEncrypted(backup,PW);await other.unlock(PW);assert.equal(other.entries.length,12);assert.equal(other.entries[11].fields[49].value,'V'.repeat(1024));
 const before=s.snapshot();const original=v._encrypt.bind(v);v._encrypt=async()=>({iv:'00'.repeat(12),ct:'00'.repeat(9*1024*1024)});await assert.rejects(v.addEntry({siteName:'too-large',password:'x'}),/保存上限/);assert.deepEqual(s.snapshot(),before);assert.equal(v.entries.length,12);v._encrypt=original;
});
test('legacy separate-salt ciphertext is read without mutation and exported in old format',async()=>{
 const fixture=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'helpers/vault-legacy-fixture.json'),'utf8'));
 const s=storage({[KEY]:JSON.stringify(fixture.data),[SALT]:fixture.salt}),v=load(s),before=s.snapshot();assert.equal(await v.unlock(PW),true);assert.equal(v.entries[0].password,'legacy-dummy-secret');assert.equal(s.writes,0);assert.deepEqual(s.snapshot(),before);assert.deepEqual(JSON.parse(v.exportEncrypted()),fixture);
 await v.addEntry({siteName:'canonical-next',password:'x'});assert.equal(s.getItem(SALT),fixture.salt);assert.equal(JSON.parse(s.getItem(KEY)).salt,fixture.salt);
});
test('cancel during import verification retains storage and currently unlocked data',async()=>{const {s,v}=await ready(),g=gate(v,'_deriveKey'),before=s.snapshot(),controller=new AbortController();const work=v.importEncrypted(v.exportEncrypted(),PW,controller.signal);await g.began;controller.abort();g.release();await assert.rejects(work,/キャンセル/);assert.deepEqual(s.snapshot(),before);assert.equal(v.isUnlocked,true);assert.equal(v.entries[0].password,'dummy-secret')});
