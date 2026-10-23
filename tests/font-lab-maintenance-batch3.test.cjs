const test=require('node:test');
const assert=require('node:assert/strict');
const {setup,flush}=require('./helpers/maintenance-batch3/font-lab-harness.cjs');
const status=x=>x.ids['font-load-status'].querySelector('.status-text').textContent;
for(const mode of ['stylesheet','fontReject','emptyFace','noFonts'])test(`font failure is not reported as successful: ${mode}`,async()=>{
 const x=setup({[mode]:true});x.select("'Yomogi', cursive");x.links[0][mode==='stylesheet'?'onerror':'onload']();await flush();
 assert.notEqual(status(x),'適用完了！');assert.match(status(x),/確認できません/);assert.equal(x.ids['font-load-status'].classList.contains('success'),false);assert.equal(x.ids['preview-container'].classList.contains('loading'),false);
});
for(const weight of ['300','500'])test(`selected Kiwi weight ${weight} is actually requested`,async()=>{
 const x=setup();x.select("'Kiwi Maru', serif");x.ids['select-weight'].value=weight;x.ids['select-weight'].events.change();assert.equal(x.links.length,1);x.links[0].onload();await flush();assert.ok(x.loads.includes(`${weight} 1em "Kiwi Maru"`));assert.equal(status(x),'適用完了！');
});
test('HTML highlighting has intact span attributes and preserves raw copy',async()=>{
 const x=setup();x.tabs[1].events.click();x.click();await flush();const html=x.ids['output-html'].innerHTML;
 assert.doesNotMatch(html,/class=<span/);assert.doesNotMatch(html,/<link /);
 const unescape=s=>s.replace(/<[^>]+>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&amp;/g,'&');
 assert.equal(unescape(html),x.writes[0]);
});
test('CSS highlighting preserves literal CSS including fractional values',async()=>{
 const x=setup();x.click();await flush();assert.equal(x.ids['output-css'].innerHTML.replace(/<[^>]+>/g,'').replace(/&quot;/g,'"').replace(/&#039;/g,"'"),x.writes[0]);
});
test('synchronous clipboard failure falls back without escaping click',async()=>{
 const x=setup({copyThrow:true});assert.doesNotThrow(()=>x.click());await flush();assert.equal(x.ids['copy-css-btn'].querySelector('.btn-text').textContent,'CSSコピー成功！');
});
test('copy fallback failure reports failure',async()=>{
 const x=setup({noClipboard:true,execOK:false});x.click();await flush();assert.equal(x.ids['copy-css-btn'].querySelector('.btn-text').textContent,'コピーに失敗しました');
});
test('late rejected copy cannot fall back over newer copy',async()=>{
 let rejectOld;let calls=0;const x=setup({copyDeferred:()=>++calls===1?new Promise((_,r)=>rejectOld=r):Promise.resolve()});
 x.click();await flush();x.tabs[1].events.click();x.click();await flush();rejectOld(Error('old'));await flush();assert.equal(x.body.children.length,0);assert.equal(x.ids['copy-css-btn'].querySelector('.btn-text').textContent,'インポートタグをコピーしました！');
});
test('failed stylesheet can be retried',async()=>{
 const x=setup();x.select("'Yomogi', cursive");x.links[0].onerror();await flush();x.select("'Yomogi', cursive");assert.equal(x.links.length,2);x.links[1].onload();await flush();assert.equal(status(x),'適用完了！');
});
test('blocked storage does not break generation',()=>{const x=setup({storageThrow:true});assert.match(x.ids['output-css'].innerHTML,/16px/)});
test('completed copy label resets when input changes',async()=>{
 const x=setup();x.click();await flush();x.ids['slider-size'].value='28';x.ids['slider-size'].events.input();assert.equal(x.ids['copy-css-btn'].querySelector('.btn-text').textContent,'CSSコードをコピー');
});
test('HTML tab labels its actual copy operation',()=>{
 const x=setup();x.tabs[1].events.click();assert.equal(x.ids['copy-css-btn'].querySelector('.btn-text').textContent,'インポートタグをコピー');
});
test('CSS entities are not split by decoration spans',()=>{
 const x=setup();const html=x.ids['output-css'].innerHTML;assert.doesNotMatch(html,/&(?:quot|#039)<\/span>;/);assert.match(html,/font-family<\/span>:\s*<span class="hl-value">&#039;Zen Maru Gothic&#039;, sans-serif<\/span>/);
});
