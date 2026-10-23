const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').resolve(process.env.SOURCE_ROOT||'.','ogp-simulator/script.js'),'utf8');
function env(){
 const els={},lists={},readers=[],images=[],alerts=[],win={};
 function el(id){return els[id] ||= {id,value:'',dataset:{target:id},attrs:{},setAttribute(k,v){this.attrs[k]=v},contains(target){return target===this},style:{setProperty(k,v){this[k]=v}},classList:{s:new Set,add(v){this.s.add(v)},remove(v){this.s.delete(v)},contains(v){return this.s.has(v)}},listeners:{},addEventListener(n,f){this.listeners[n]=f},click(){this.clicks=(this.clicks||0)+1},textContent:''};}
 const doc={documentElement:{lang:"ja"},getElementById:el,querySelector:s=>el(s),querySelectorAll:s=>lists[s] ||= Array.from({length:4},(_,i)=>el(s+i)),addEventListener(n,f){if(n==='DOMContentLoaded')f()}};
 function FR(){readers.push(this);this.readAsDataURL=f=>this.file=f;}
 function IM(){images.push(this);}
 vm.runInNewContext(src,{document:doc,window:{addEventListener(n,f){win[n]=f}},FileReader:FR,Image:IM,alert:m=>alerts.push(m)});
 return {els,lists,readers,images,alerts,win,el,select(f={type:'image/png',size:10}){el('imageInput').listeners.change({target:{files:[f]}})},read(i,data){readers[i].onload({target:{result:data}})},decode(i,w=1200,h=630){images[i].width=w;images[i].height=h;images[i].onload()},evt(target,key){return {target,key,preventDefault(){this.prevented=true},stopPropagation(){}}}};
}

module.exports={env};
