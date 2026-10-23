const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(process.env.SOURCE_ROOT || '.','aspect-ratio-calc/script.js'),'utf8');
function harness({rejectCopy=false,clipboard=true,writeText}={}) {
 const ids='ratioW ratioH width height deviceWrapper previewBox boxDims infoRatio swapBtn detectBtn ratioLockBtn ratioModeHelp advisorArea advisorText copyCssRatio copyDims snippetRatioVal snippetDimsVal badgeCssRatio badgeDims calculationStatus manualAspectCopy'.split(' '),els={};
 function element(id='') {const classes=new Set;return {id,value:'',textContent:'',style:{},dataset:{},events:{},attrs:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,b)=>b?classes.add(x):classes.delete(x),contains:x=>classes.has(x)},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,f){(this.events[k]??=[]).push(f)},emit(k){for(const f of this.events[k]||[]) f.call(this,{target:this})},getBoundingClientRect(){return {width:300,height:200}},append(){},replaceChildren(){},select(){this.selected=true},focus(){this.focused=true}};}
 ids.forEach(id=>els[id]=element(id));els.detectBtn.parentElement={insertBefore(){}};
 const copies=[],document={documentElement:{lang:'ja'},getElementById:id=>els[id]||null,querySelector:()=>null,querySelectorAll:s=>s==='.input-number'?['ratioW','ratioH','width','height'].map(id=>els[id]):[],createElement:()=>element(),createTextNode:t=>({textContent:t}),addEventListener:(k,f)=>{if(k==='DOMContentLoaded')f()}};
 vm.runInNewContext(source,{document,window:{addEventListener(){},clearTimeout(){},setTimeout(){}},navigator:{clipboard:clipboard?{writeText:t=>{copies.push(t);return writeText?writeText(t):rejectCopy?Promise.reject(new Error('denied')):Promise.resolve()}}:undefined},setTimeout(){}});
 return {els,copies,input(id,v){els[id].value=String(v);els[id].emit('input')},click(id){els[id].emit('click')},blur(id){els[id].emit('blur')}};
}
module.exports={harness};
