const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function element(id='') {
 const attrs={}, classes=new Set(); const e={id,value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,checked:false,style:{},dataset:{},children:[],listeners:{},tagName:'DIV',selectionStart:0,selectionEnd:0,
  setAttribute(k,v){attrs[k]=String(v)},getAttribute:k=>attrs[k],removeAttribute(k){delete attrs[k]},classList:{add:(...x)=>x.forEach(v=>classes.add(v)),remove:(...x)=>x.forEach(v=>classes.delete(v)),contains:x=>classes.has(x),toggle(x,b){b??=!classes.has(x);if(b)classes.add(x);else classes.delete(x)}},
  appendChild(x){this.children.push(x);return x},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x},querySelectorAll(){return[]},querySelector(){return null},getBoundingClientRect(){return {top:0}},focus(){this.focused=true},select(){this.selected=true},remove(){this.removed=true},blur(){},
  addEventListener(k,f){(this.listeners[k]??=[]).push(f)},fire(k,event={}){return Promise.all((this.listeners[k]||[]).map(f=>f.call(this,{target:this,preventDefault(){},stopPropagation(){},...event})))},click(){return this.fire('click')},dispatchEvent(event){return this.fire(event.type,event)}
 };return e;
}
function controller(tool,exports,{init=true,lang='ja',saved={},elements={},lists={},extras={}}={}) {
 const es={},storage=new Map(Object.entries(saved)),writes=[],timers=new Map();let ready,timerId=0;
 const document={documentElement:{lang},body:element(),activeElement:null,getElementById(id){if(!es[id]){es[id]=element(id);Object.assign(es[id],elements[id]||{});}return es[id]},querySelectorAll:selector=>lists[selector]||[],querySelector:()=>({value:'split'}),createElement:tag=>Object.assign(element(),{tagName:tag.toUpperCase()}),createDocumentFragment:()=>element(),addEventListener(k,f){if(k==='DOMContentLoaded')ready=f},execCommand:()=>false};
 const context={document,console,navigator:{userAgent:'Linux',clipboard:{writeText:async text=>{context.copied=text}}},localStorage:{getItem:k=>storage.get(k)??null,setItem(k,v){writes.push([k,v]);storage.set(k,v)}},window:{addEventListener(){},scrollTo(){},requestAnimationFrame:f=>f()},setTimeout(f){const id=++timerId;timers.set(id,f);return id},clearTimeout:id=>timers.delete(id),setInterval(){},clearInterval(){},Event:class{constructor(type){this.type=type}},...extras};context.window.setTimeout=context.setTimeout;
 const source=fs.readFileSync(path.join(process.env.SOURCE_ROOT||path.resolve(__dirname,'../../..'),tool,'script.js'),'utf8').replace(/\n  init\(\);\n\}\);/,`\n globalThis.api={${exports}};${init?'init();':''}\n});`);
 vm.createContext(context);vm.runInContext(source,context);ready();return {es,storage,writes,timers,context,api:context.api};
}
module.exports={controller,element};
