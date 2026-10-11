'use strict';
const assert=require('node:assert/strict');
class Clock {
  constructor(){this.now=0;this.next=0;this.jobs=new Map();this.history=[];}
  setTimeout(fn,ms=0){assert.equal(typeof fn,'function');const id=++this.next;this.jobs.set(id,{id,fn,at:this.now+ms,period:0});return id;}
  clearTimeout(id){this.jobs.delete(id);}
  setInterval(fn,ms){assert.ok(ms>0);const id=this.setTimeout(fn,ms);this.jobs.get(id).period=ms;return id;}
  clearInterval(id){this.clearTimeout(id);}
  tick(ms){const end=this.now+ms;let n=0;for(;;){const job=[...this.jobs.values()].filter(x=>x.at<=end).sort((a,b)=>a.at-b.at||a.id-b.id)[0];if(!job)break;if(++n>10000)throw Error('Timer runaway');this.now=job.at;if(job.period)job.at+=job.period;else this.jobs.delete(job.id);this.history.push(job.id);job.fn();}this.now=end;}
  bindings(){return Object.fromEntries(['setTimeout','clearTimeout','setInterval','clearInterval'].map(n=>[n,this[n].bind(this)]));}
}
function readers(){
  const instances=[];
  class Reader {
    static EMPTY=0;static LOADING=1;static DONE=2;
    constructor(){this.EMPTY=0;this.LOADING=1;this.DONE=2;this.readyState=0;this.onload=null;this.onerror=null;this.onabort=null;this.onloadend=null;this.result=null;this.error=null;this.listeners=new Map();instances.push(this);}
    addEventListener(type,fn){const a=this.listeners.get(type)??[];a.push(fn);this.listeners.set(type,a);}
    removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)??[]).filter(f=>f!==fn));}
    emit(type){const event={target:this,type};if(typeof this['on'+type]==='function')this['on'+type](event);for(const fn of this.listeners.get(type)??[])fn(event);}
    readAsText(file,encoding){assert.equal(this.readyState,0);this.file=file;this.encoding=encoding;this.readyState=1;}
    abort(){if(this.readyState!==1)return;this.readyState=2;this.result=null;this.emit('abort');this.emit('loadend');}
    succeed(text){assert.equal(this.readyState,1,'Cannot deliver native load after reader aborted');this.result=text;this.readyState=2;this.emit('load');this.emit('loadend');}
    fail(){assert.equal(this.readyState,1);this.error=new Error('read failed');this.readyState=2;this.emit('error');this.emit('loadend');}
    queuedLoad(text){const handler=this.onload;assert.equal(typeof handler,'function','Capture before invalidation');return()=>handler({target:{result:text},type:'load'});}
    queuedError(){const handler=this.onerror;assert.equal(typeof handler,'function','Capture before invalidation');return()=>handler({target:this,type:'error'});}
  }
  return {FileReader:Reader,instances};
}
if(require.main===module){const c=new Clock();let count=0;const id=c.setTimeout(()=>count++,600);c.clearTimeout(id);c.tick(1000);assert.equal(count,0);const periodic=c.setInterval(()=>count++,100);c.tick(250);assert.equal(count,2);c.clearInterval(periodic);c.tick(1000);assert.equal(count,2);const {FileReader:R}=readers();const r=new R();r.readAsText({});r.abort();assert.throws(()=>r.succeed('late'));console.log('Async harness self-tests passed');}
module.exports={Clock,readers};
