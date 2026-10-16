/* PikaLab Train Island — pure educational model, plus accessible controls and SVG graph. */
(function (root,factory){'use strict';const api=factory(); if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.TrainIslandGame=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DISTANCE=1200;const MIN_SPEED=12,MAX_SPEED=48,STEP=6;
function validSpeed(n){return Number.isFinite(n)&&n>=MIN_SPEED&&n<=MAX_SPEED&&(n-MIN_SPEED)%STEP===0;}
function arrivalMinutes(speed){if(!validSpeed(speed))throw new RangeError('速度は12〜48km/hの6km/h刻みで指定してください');return DISTANCE/(speed*1000/60);}
function positionMetres(speed,time){if(!validSpeed(speed)||!Number.isFinite(time)||time<0)throw new RangeError('速度または経過時間が正しくありません');return Math.min(DISTANCE,Math.max(0,speed*1000/60*time));}
function outcome(speedA,speedB){let a=arrivalMinutes(speedA),b=arrivalMinutes(speedB);return {a,b,success:Math.abs(a-b)<0.01,early:a<b?'A':a>b?'B':null,delay:Math.abs(a-b)};}
function modelAt(speedA,speedB,time){const outcomeData=outcome(speedA,speedB);return {a:positionMetres(speedA,time),b:positionMetres(speedB,time),time,arrivals:outcomeData};}
const round1=n=>(Math.round(n*10)/10).toFixed(1);
function init(){
 const $=id=>document.getElementById(id);
 let stage;
 try{stage=window.TrainIsland3D.createWorld($('worldCanvas'),$('labelCanvas'));
     $('renderStatus').textContent='ドラッグで島を回せます';
 }catch(error){$('renderStatus').textContent='3Dを表示できません。ページを読み直してください。';console.error(error);return;}
 const speedInputs=[$('speedA'),$('speedB')];const labels=[$('speedAValue'),$('speedBValue')];
 let state={t:0,running:false,finished:false,last:0,started:false};
 const svgNS='http://www.w3.org/2000/svg';const svgEl=(tag,attrs)=>{const e=document.createElementNS(svgNS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e};
 function speeds(){return [Number(speedInputs[0].value),Number(speedInputs[1].value)];}
 function updateSliderLabels(){speeds().forEach((v,i)=>{labels[i].innerHTML=`${v} <small>km/h</small>`;speedInputs[i].style.setProperty('--percent',Math.round((v-MIN_SPEED)/(MAX_SPEED-MIN_SPEED)*100)+'%');});}
 function resetResult(){const r=$('result');r.hidden=true;r.removeAttribute('data-success');}
 function setPlayLabel(){let text=state.finished?'もう一度走らせる':state.running?'一時停止':state.started?'つづきを走らせる':'列車を走らせる'; $('playLabel').textContent=text; $('playIcon').textContent=state.running?'Ⅱ':'▶';}
 function setRunningInputs(disabled){speedInputs.forEach(e=>e.disabled=disabled);}
 function clearRun(){state.t=0;state.running=false;state.finished=false;state.started=false;state.last=0;stage.setTrains(0,0);setRunningInputs(false);resetResult();setPlayLabel();updateGraph();}
 function checkResult(){const [a,b]=speeds(),r=outcome(a,b);const card=$('result');card.hidden=false;card.dataset.success=String(r.success);
   if(r.success){$('resultHeading').textContent='ぴったり！ 同時に到着！';$('resultExplanation').textContent=`2台とも${round1(r.a)}分で中央駅に着いたよ。同じ道のりでは、同じ速さなら時間も同じになるね。`;}
   else{$('resultHeading').textContent=`${r.early}列車が先に到着したよ`;$('resultExplanation').textContent=`Aは${round1(r.a)}分、Bは${round1(r.b)}分。${round1(r.delay)}分の差ができたよ。速さをそろえて、もう一度試してみよう。`;}
 }
 function updateGraph(){const [a,b]=speeds(),r=outcome(a,b);const maxT=Math.ceil((Math.max(r.a,r.b)+.45)*2)/2;
    const x0=65,y0=259,w=470,h=216;const xp=t=>x0+w*t/maxT,yp=d=>y0-h*d/DISTANCE;
    const grid=$('graphGrid'),lines=$('graphLines'),dots=$('graphDots');grid.replaceChildren();lines.replaceChildren();dots.replaceChildren();
    for(let dist=0;dist<=DISTANCE;dist+=400){const y=yp(dist);grid.append(svgEl('line',{x1:x0,x2:x0+w,y1:y,y2:y,stroke:'#e2e8e8','stroke-width':1.5}));let label=svgEl('text',{x:x0-11,y:y+5,fill:'#82959b','font-size':14,'font-weight':750,'text-anchor':'end'});label.textContent=dist;grid.append(label);}
    const tickStep=maxT>6?2:1;for(let t=0;t<=maxT+.001;t+=tickStep){const x=xp(t);grid.append(svgEl('line',{x1:x,x2:x,y1:y0,y2:y0-h,stroke:'#edf0ed','stroke-width':1.2}));const label=svgEl('text',{x,y:y0+22,'text-anchor':'middle',fill:'#84969a','font-size':13,'font-weight':750});label.textContent=t;grid.append(label);}
    grid.append(svgEl('path',{d:`M${x0},${y0-h-8}V${y0}H${x0+w+8}`,fill:'none',stroke:'#8c9fa3','stroke-width':2,'stroke-linecap':'round'}));
    const xLabel=svgEl('text',{x:x0+w/2,y:302,'text-anchor':'middle',fill:'#7a898f','font-size':15,'font-weight':800});xLabel.textContent='時間（分）';grid.append(xLabel);
    const yLabel=svgEl('text',{x:15,y:28,fill:'#7a898f','font-size':13,'font-weight':850});yLabel.textContent='距離（m）';grid.append(yLabel);
    const plotTime=state.started?Math.min(state.t,maxT):0;
    // A gentle preview of the expected trajectories, so the chart is never empty.
    // Solid lines replace the dashed guides as the trains actually travel.
    [[a,'#ce676b'],[b,'#548db6']].forEach(([speed,color])=>{
      const finish=arrivalMinutes(speed);
      lines.append(svgEl('path',{d:`M${x0},${y0} L${xp(finish)},${yp(DISTANCE)} L${xp(maxT)},${yp(DISTANCE)}`,fill:'none',stroke:color,'stroke-width':3.4,'stroke-opacity':.23,'stroke-dasharray':'6 8','stroke-linecap':'round'}));
    });
    [[a,'#ce676b',false],[b,'#548db6',true]].forEach(([speed,color,dashed])=>{
      const arrive=arrivalMinutes(speed),traceTo=Math.min(plotTime,maxT);
      if(traceTo<=0)return;
      const mid=Math.min(traceTo,arrive);
      const x1=xp(mid),y1=yp(positionMetres(speed,mid));let d=`M${x0},${y0} L${x1},${y1}`;
      if(traceTo>arrive)d+=` L${xp(traceTo)},${yp(DISTANCE)}`;
      const path=svgEl('path',{d,fill:'none',stroke:color,'stroke-width':dashed?4.6:4.8,'stroke-linejoin':'round','stroke-linecap':'round'});
      if(dashed)path.setAttribute('stroke-dasharray','10 7');lines.append(path);
      dots.append(svgEl('circle',{cx:xp(traceTo),cy:yp(positionMetres(speed,traceTo)),r:6.5,fill:color,stroke:'#fff','stroke-width':3}));
    });
    $('timeOutput').textContent=round1(state.t)+'分';
    if(!state.started)$('arrivalOutput').textContent='速さをかえて走らせよう';
    else if(state.finished)$('arrivalOutput').textContent='A '+round1(r.a)+'分 / B '+round1(r.b)+'分';
    else $('arrivalOutput').textContent='駅まで 1,200m';
 }
 speedInputs.forEach(e=>e.addEventListener('input',()=>{if(state.started)clearRun();updateSliderLabels();updateGraph();}));
 $('startButton').addEventListener('click',()=>{
   if(state.finished)clearRun();
   state.running=!state.running;state.started=true;state.last=0;setPlayLabel();setRunningInputs(true);resetResult();updateGraph();
 });
 $('againButton').addEventListener('click',clearRun);
 $('zoomIn').addEventListener('click',()=>stage.zoomBy(1.17));$('zoomOut').addEventListener('click',()=>stage.zoomBy(1/1.17));$('resetCamera').addEventListener('click',()=>stage.resetCamera());
 function frame(now){const dt=state.last?Math.min(.08,(now-state.last)/1000):0;state.last=now;
   if(state.running){const [a,b]=speeds();state.t+=dt*.92;const ends=outcome(a,b);let endT=Math.max(ends.a,ends.b);
     if(state.t>=endT){state.t=endT;state.running=false;state.finished=true;checkResult();setPlayLabel();setRunningInputs(false);}
     stage.setTrains(positionMetres(a,state.t)/DISTANCE,positionMetres(b,state.t)/DISTANCE);
     updateGraph();}
   window.requestAnimationFrame(frame);
 }
 updateSliderLabels();setPlayLabel();stage.setTrains(0,0);updateGraph();window.requestAnimationFrame(frame);
 window.__pikaIslandDebug={getState:()=>({...state,speeds:speeds(),renderer:stage.getRenderType(),scene:stage.getSceneStats()}),jumpToEnd(){const [a,b]=speeds();state.t=Math.max(outcome(a,b).a,outcome(a,b).b);state.running=false;state.started=true;state.finished=true;stage.setTrains(1,1);setRunningInputs(false);checkResult();setPlayLabel();updateGraph();}};
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();}
return {DISTANCE,MIN_SPEED,MAX_SPEED,STEP,validSpeed,arrivalMinutes,positionMetres,outcome,modelAt};
});
