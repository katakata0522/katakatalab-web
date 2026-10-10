'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
test('カード生成はCRLFを増殖させず、再実行で出力が変わらない',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'katakata-card-newlines-'));
 try {
  fs.mkdirSync(path.join(dir,'scripts'));
  fs.copyFileSync(path.join(__dirname,'../scripts/build-project-cards.cjs'),path.join(dir,'scripts/build-project-cards.cjs'));
  const projects=['primary','secondary'].map((group,i)=>({id:'sample-'+i,group,category:'tool',shelf:'tool',url:'sample-'+i+'/',tagText:'例',tagClass:'tag-tool',title:'例',text:'説明',actions:{mainText:'開く'}}));
  fs.writeFileSync(path.join(dir,'projects.json'),JSON.stringify(projects));
  fs.writeFileSync(path.join(dir,'index.html'),'<main>\r\n<!-- PROJECT_CARDS_PRIMARY_START --><!-- PROJECT_CARDS_PRIMARY_END -->\r\n<!-- PROJECT_CARDS_SECONDARY_START --><!-- PROJECT_CARDS_SECONDARY_END -->\r\n</main>\r\n');
  const run=()=>execFileSync(process.execPath,[path.join(dir,'scripts/build-project-cards.cjs')]);
  run();const once=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  assert.equal(once.includes('\r\r'),false);
  assert.equal(/(?<!\r)\n/.test(once),false);
  run();assert.equal(fs.readFileSync(path.join(dir,'index.html'),'utf8'),once);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
