const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/maintenance-aspect-harness.cjs');
const logic=require(require('node:path').resolve(process.env.SOURCE_ROOT||'.','aspect-ratio-calc/script.js'));
const tick=()=>new Promise(setImmediate);
test('invalid ratio cannot export and exposes error',()=>{const h=harness();h.input('ratioW',-1);h.click('copyCssRatio');assert.equal(h.copies.length,0);assert.equal(h.els.ratioW.attrs['aria-invalid'],'true');assert.equal(h.els.copyCssRatio.disabled,true)});
test('empty ratio cannot export fallback',()=>{const h=harness();h.input('ratioW',4);h.input('ratioW','');h.click('copyCssRatio');assert.equal(h.copies.length,0);assert.equal(h.els.infoRatio.textContent,'—')});
test('invalid dimension cannot export',()=>{const h=harness();h.input('width',-1);h.click('copyDims');assert.equal(h.copies.length,0)});
test('tiny ratio remains positive exact in CSS',()=>{const h=harness();h.input('ratioW',0.0004);h.click('copyCssRatio');assert.equal(h.copies[0],'aspect-ratio: 0.0004 / 9;')});
test('reject zero rounded output',()=>assert.equal(logic.dimensionFromHeight(1,1,10),null));
test('reject overflow and unsafeinteger output',()=>{assert.equal(logic.dimensionFromWidth(1e308,1,9),null);assert.equal(logic.dimensionFromWidth(Number.MAX_SAFE_INTEGER,1,2),null)});
test('zero calculated dimension disables exports',()=>{const h=harness();h.input('ratioW',1);h.input('ratioH',10);h.input('height',1);h.click('copyDims');assert.equal(h.copies.length,0);assert.equal(h.els.width.value,'')});
test('wholepixel rounding is consistent across input display and ratio',()=>{const h=harness();h.click('ratioLockBtn');h.input('width',1.4);assert.equal(+h.els.width.value,1.4);h.blur('width');h.input('height',1.6);assert.equal(+h.els.height.value,1.6);h.blur('height');assert.equal(+h.els.width.value,1);assert.equal(+h.els.height.value,2);assert.equal(h.els.snippetDimsVal.textContent,'1 × 2');assert.equal(h.els.infoRatio.textContent,'1 : 2')});
test('clipboard rejection is announced',async()=>{const h=harness({rejectCopy:true});h.click('copyCssRatio');await tick();assert.match(h.els.calculationStatus.textContent,/コピーできません/) });
test('missing clipboard is announced',async()=>{const h=harness({clipboard:false});h.click('copyDims');await tick();assert.match(h.els.calculationStatus.textContent,/コピーできません/) });
test('late rejection after input change is ignored',async()=>{let reject;const h=harness({writeText:()=>new Promise((_,r)=>reject=r)});h.click('copyDims');h.input('width',1200);reject(Error());await tick();assert.equal(h.els.calculationStatus.textContent,'');assert.equal(h.els.badgeDims.textContent,'📋 コピー')});
test('late success after input change is ignored',async()=>{let resolve;const h=harness({writeText:()=>new Promise(r=>resolve=r)});h.click('copyDims');h.input('width',1200);resolve();await tick();assert.equal(h.els.calculationStatus.textContent,'');assert.equal(h.els.badgeDims.textContent,'📋 コピー')});
test('normal correction restores calculation',()=>{const h=harness();h.input('width',-1);h.input('width',1200);assert.equal(+h.els.height.value,675);assert.equal(h.els.width.attrs['aria-invalid'],'false');assert.equal(h.els.copyDims.disabled,false)});

test('manual copy is selectable and invalidated by input',async()=>{const h=harness({rejectCopy:true});h.click('copyCssRatio');await tick();assert.equal(h.els.manualAspectCopy.value,'aspect-ratio: 16 / 9;');assert.equal(h.els.manualAspectCopy.hidden,false);assert.equal(h.els.manualAspectCopy.selected,true);h.input('width',100);assert.equal(h.els.manualAspectCopy.hidden,true);assert.equal(h.els.manualAspectCopy.value,'')});
