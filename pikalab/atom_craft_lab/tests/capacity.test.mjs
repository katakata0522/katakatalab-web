import assert from 'node:assert/strict';import fs from 'node:fs';
const mode='candidate', nodes=new Map(), listeners=[];let intervals=0;
function el(){let classes=new Set();return {textContent:'',innerHTML:'',style:{},get className(){return [...classes].join(' ')},set className(v){classes=new Set(v.split(/\s+/))},classList:{add(x){classes.add(x)},remove(x){classes.delete(x)},contains(x){return classes.has(x)},toggle(x){classes.has(x)?classes.delete(x):classes.add(x)}}};}
globalThis.document={readyState:'complete',body:{addEventListener(type,fn){listeners.push({type,fn})}},getElementById(id){if(!nodes.has(id))nodes.set(id,el());return nodes.get(id);}};
globalThis.window={};globalThis.setInterval=()=>{intervals++;};
await import('../js/app.js');
const {state}=await import('../js/state.js');state.soundEnabled=false;
assert.equal(listeners.length,1);assert.equal(listeners[0].type,'click');assert.equal(intervals,1);
const click=attrs=>listeners[0].fn({target:{closest:()=>({getAttribute:k=>attrs[k]??null})}});
click({'data-action':'clear-chamber'});
for(let i=0;i<8;i++)click({'data-action':'add-atom','data-atom':'H'});
const before=[...state.chamberAtoms];let error=null;
try{click({'data-action':'add-atom','data-atom':'O'});}catch(e){error=String(e);}
const after=[...state.chamberAtoms];assert.deepEqual(after,before);
const cases=['real full ESM graph initializes','one click listener and one timer registered','8 atoms accepted','ninth rejected without state mutation'];
if(mode==='candidate'){
 assert.equal(error,null);assert.equal(nodes.get('craftFeedbackText').textContent,'💡 ポッドには8個まで入れられるよ。粒をタップすると減らせるよ！');assert.equal(nodes.get('craftFeedbackBar').classList.contains('hidden'),false);cases.push('existing capacity message visible, no exception');
 for(let i=0;i<3;i++)click({'data-action':'add-atom','data-atom':'O'});assert.deepEqual([...state.chamberAtoms],before);cases.push('repeated overflow remains safe');
 click({'data-action':'remove-atom','data-index':'0'});assert.equal(state.chamberAtoms.length,7);click({'data-action':'add-atom','data-atom':'O'});assert.equal(state.chamberAtoms.length,8);assert.equal(state.chamberAtoms.at(-1),'O');cases.push('remove then refill recovers');
 click({'data-action':'clear-chamber'});click({'data-action':'fill-mission-atoms'});click({'data-action':'synthesize-molecule'});assert.equal(state.discoveredMolecules.has('H2O'),true);assert.match(nodes.get('craftFeedbackText').textContent,/完成したよ/);cases.push('existing synthesis feedback still works');
}else assert.match(error,/showCraftFeedback is not defined/);
console.log('PASS: 8 atom-capacity and recovery contracts');
