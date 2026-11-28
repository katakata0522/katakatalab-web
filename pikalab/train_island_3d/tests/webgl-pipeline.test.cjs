'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const island = require('../world3d.js');

test('WebGL 3D path uploads static scenery once, moves trains using a separate GPU buffer',()=>{
  const calls={uploads:[],draws:[],uniforms:[],vertexSource:''};
  const gl={
    VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
    ARRAY_BUFFER:34962,STATIC_DRAW:35044,DYNAMIC_DRAW:35048,DEPTH_TEST:2929,
    LEQUAL:515,CULL_FACE:2884,TRIANGLES:4,FLOAT:5126,COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256,
    createShader:()=>({}),shaderSource(_shader,source){if(source.includes('attribute vec3 pos'))calls.vertexSource=source;},
    compileShader:()=>{},getShaderParameter:()=>true,getShaderInfoLog:()=>'',
    createProgram:()=>({}),attachShader:()=>{},linkProgram:()=>{},getProgramParameter:()=>true,
    getProgramInfoLog:()=>'',createBuffer:()=>({}),useProgram:()=>{},
    getAttribLocation:(_p,name)=>name==='pos'?0:1,getUniformLocation:(_p,name)=>({name}),
    enableVertexAttribArray:()=>{},viewport:()=>{},clearColor:()=>{},clear:()=>{},
    enable:()=>{},disable:()=>{},depthFunc:()=>{},uniform3fv(loc,arr){calls.uniforms.push({name:loc.name,values:[...arr]});},uniform2f:()=>{},
    bindBuffer:()=>{},bufferData(_target,data,usage){calls.uploads.push({usage,count:data.length});},
    vertexAttribPointer:()=>{},drawArrays(_kind,_first,count){calls.draws.push(count);},
    isContextLost:()=>false,deleteBuffer:()=>{},deleteProgram:()=>{}
  };
  const callbacks=new Map();let id=0;
  const globalNames=['window','document','requestAnimationFrame','cancelAnimationFrame','ResizeObserver'];
  const old=new Map(globalNames.map(key=>[key,globalThis[key]]));
  try{
    globalThis.window={devicePixelRatio:1,matchMedia:()=>({matches:false})};
    globalThis.document={visibilityState:'visible',addEventListener(){},removeEventListener(){}};
    globalThis.requestAnimationFrame=cb=>{callbacks.set(++id,cb);return id;};
    globalThis.cancelAnimationFrame=key=>callbacks.delete(key);
    globalThis.ResizeObserver=class{observe(){}disconnect(){}};
    const canvas={width:1000,height:700,clientWidth:1000,clientHeight:700,style:{},
      getBoundingClientRect:()=>({width:1000,height:700}),
      getContext:(name)=>name==='webgl2'?gl:null,
      addEventListener(){},removeEventListener(){}};
    const stage=island.createWorld(canvas,null);
    assert.equal(stage.getRenderType(),'webgl');
    assert.equal(calls.uploads.length,1,'Static mesh should be uploaded only during setup');
    assert.equal(calls.uploads[0].usage,gl.STATIC_DRAW);
    assert.ok(calls.vertexSource.includes('uRight')&&calls.vertexSource.includes('uForward')&&calls.vertexSource.includes('uTarget'), 'GPU orbit and panning use shader uniforms');
    const draw=callbacks.get(1);assert.ok(draw);callbacks.delete(1);draw(1000);
    assert.equal(calls.draws.length,2,'Static and animated models should be separate draw calls');
    assert.equal(calls.uploads.length,2,'Animated models should use a second buffer upload');
    assert.equal(calls.uploads[1].usage,gl.DYNAMIC_DRAW);
    assert.equal(stage.getSceneStats().rendererMetrics.staticUploads,1);
    assert.ok(calls.uniforms.some(u=>u.name==='uTarget'), 'camera target is uploaded to shader');
    stage.zoomBy(1.1);
    const pending=[...callbacks.entries()];
    assert.equal(pending.length,1);
    pending[0][1](1500);
    assert.equal(calls.draws.length,4);
    assert.equal(calls.uploads.filter(x=>x.usage===gl.STATIC_DRAW).length,1,
      'Camera changes must use new shader uniforms, not reupload the static 3D island');
    stage.destroy();
  }finally{
    for(const [key,value] of old){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
  }
});
