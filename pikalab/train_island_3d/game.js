/* PikaLab Train Island — pure educational model, plus accessible controls and SVG graph. */
(function (root,factory){'use strict';const api=factory(); if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.TrainIslandGame=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DISTANCE=1200;const MIN_SPEED=12,MAX_SPEED=48,STEP=6;const GRAPH_MAX_MINUTES=6;
// A simulated minute takes ~1.8 real seconds: the island should be seen, not flash by.
const SIM_MINUTES_PER_SECOND=.56;
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
 let lastGraphPaint=0,runnerId=null,graphScaffoldReady=false;
 // The graph always uses the same 0–6 minute scale. Changing its scale with
 // speed would make the slopes incomparable and obscure the intended lesson.
 const svgNS='http://www.w3.org/2000/svg';const svgEl=(tag,attrs)=>{const e=document.createElementNS(svgNS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e};
 function speeds(){return [Number(speedInputs[0].value),Number(speedInputs[1].value)];}
 function updateSliderLabels(){speeds().forEach((v,i)=>{labels[i].innerHTML=`${v} <small>km/h</small>`;speedInputs[i].style.setProperty('--percent',Math.round((v-MIN_SPEED)/(MAX_SPEED-MIN_SPEED)*100)+'%');});}
 function resetResult(){const r=$('result');r.hidden=true;r.removeAttribute('data-success');
   $('worldOutcome').hidden=true;$('worldOutcome').removeAttribute('data-success');
   const tip=$('graphLearning');if(tip)tip.hidden=true;}
 function updateSceneMessage(text){$('renderStatus').textContent=text;}
 function syncRunUi(){setPlayLabel();$('skipRun').hidden=!state.started||state.finished;}
 function reducedMotion(){return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);}
 function scheduleRunningFrame(){if(state.running&&runnerId===null)runnerId=requestAnimationFrame(frame);}
 function haltRunningFrame(){if(runnerId!==null){cancelAnimationFrame(runnerId);runnerId=null;}}
 function showWorld(){
   const box=$('worldCanvas').closest('.world-viewport');
   box.scrollIntoView({behavior:reducedMotion()?'instant':'smooth',block:'start'});
 }
 function setPlayLabel(){let text=state.finished?'もう一度走らせる':state.running?'一時停止':state.started?'つづきを走らせる':'列車を走らせる'; $('playLabel').textContent=text; $('playIcon').textContent=state.running?'Ⅱ':'▶';}
 function setRunningInputs(disabled){speedInputs.forEach(e=>e.disabled=disabled);}
 function clearRun(){state.t=0;state.running=false;state.finished=false;state.started=false;state.last=0;haltRunningFrame();
   stage.setTrains(0,0);stage.setMoving(false);setRunningInputs(false);resetResult();syncRunUi();updateGraph();
   updateSceneMessage('島を左右にドラッグして見渡せるよ');}
 function checkResult(){const [a,b]=speeds(),r=outcome(a,b);const card=$('result');card.hidden=false;card.dataset.success=String(r.success);
   if(r.success){$('resultHeading').textContent='ぴったり！ 同時に到着！';$('resultExplanation').textContent=`2台とも${round1(r.a)}分で中央駅に着いたよ。同じ道のりでは、同じ速さなら時間も同じになるね。`;}
   else{$('resultHeading').textContent=`${r.early}列車が先に到着したよ`;
     const hint=r.early==='A'?'Bを速くするか、Aをゆっくりにしてみよう。':'Aを速くするか、Bをゆっくりにしてみよう。';
     $('resultExplanation').textContent=`Aは${round1(r.a)}分、Bは${round1(r.b)}分。${round1(r.delay)}分ちがったよ。${hint}`;}
   const notice=$('worldOutcome');notice.hidden=false;notice.dataset.success=String(r.success);
   $('worldOutcomeTitle').textContent=r.success?'やったね！ 同時に到着！':`${r.early}れっしゃが先に到着！`;
   $('worldOutcomeDetail').textContent=r.success?`どちらも${round1(r.a)}分で到着したよ。`:`Aは${round1(r.a)}分、Bは${round1(r.b)}分。`; 
   updateSceneMessage('2台とも駅へ到着しました');
 }
 function finishRun(){
   haltRunningFrame();
   const [a,b]=speeds();state.t=Math.max(outcome(a,b).a,outcome(a,b).b);
   state.running=false;state.started=true;state.finished=true;state.last=0;
   stage.setTrains(1,1);stage.setMoving(false);setRunningInputs(false);
   checkResult();syncRunUi();updateGraph();
   const tip=$('graphLearning');if(tip){tip.hidden=false;tip.textContent=a===b?'線が同じ速さでのびると、同じ時間で同じ距離に着くよ。':'速い列車ほど線が急になるよ。横の同じ時間で比べると、進んだ距離の違いが分かるね。';}
 }
 function updateGraph(){const [a,b]=speeds(),r=outcome(a,b);const maxT=GRAPH_MAX_MINUTES;
    const x0=64,y0=259,w=402,h=216;const xp=t=>x0+w*t/maxT,yp=d=>y0-h*d/DISTANCE;
    const grid=$('graphGrid'),lines=$('graphLines'),dots=$('graphDots');lines.replaceChildren();dots.replaceChildren();
    if(!graphScaffoldReady){
      grid.replaceChildren();
      for(let dist=0;dist<=DISTANCE;dist+=400){const y=yp(dist);grid.append(svgEl('line',{x1:x0,x2:x0+w,y1:y,y2:y,stroke:'#e2e8e8','stroke-width':1.5}));let label=svgEl('text',{x:x0-11,y:y+5,fill:'#82959b','font-size':18,'font-weight':750,'text-anchor':'end'});label.textContent=dist;grid.append(label);}
      for(let t=0;t<=maxT;t++){const x=xp(t);grid.append(svgEl('line',{x1:x,x2:x,y1:y0,y2:y0-h,stroke:'#edf0ed','stroke-width':'1.2'}));const label=svgEl('text',{x,y:y0+22,'text-anchor':'middle',fill:'#84969a','font-size':18,'font-weight':750});label.textContent=t;grid.append(label);}
      grid.append(svgEl('path',{d:`M${x0},${y0-h-8}V${y0}H${x0+w+8}`,fill:'none',stroke:'#8c9fa3','stroke-width':2,'stroke-linecap':'round'}));
      const xLabel=svgEl('text',{x:x0+w/2,y:302,'text-anchor':'middle',fill:'#7a898f','font-size':17,'font-weight':800});xLabel.textContent='時間（分）';grid.append(xLabel);
      const yLabel=svgEl('text',{x:15,y:28,fill:'#7a898f','font-size':16,'font-weight':850});yLabel.textContent='距離（m）';grid.append(yLabel);
      graphScaffoldReady=true;
    }
    const plotTime=state.started?Math.min(state.t,maxT):0;
    // Do not draw the full answers before the user experiments with the trains.
    if(!state.started){
      const caption=svgEl('text',{x:265,y:139,'text-anchor':'middle',fill:'#7c9194','font-size':17,'font-weight':750});
      caption.textContent='列車が進むと、線がのびるよ';lines.append(caption);
      for(const [dx,color] of [[-4,'#ce676b'],[4,'#548db6']]){
        dots.append(svgEl('circle',{cx:x0+dx,cy:y0-2,r:5.8,fill:color,stroke:'#fff','stroke-width':2}));
      }
    }
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
    else $('arrivalOutput').textContent=`A のこり ${Math.round(DISTANCE-positionMetres(a,state.t))}m ・ B のこり ${Math.round(DISTANCE-positionMetres(b,state.t))}m`;
 }
 speedInputs.forEach(e=>e.addEventListener('input',()=>{if(state.started)clearRun();updateSliderLabels();updateGraph();}));
 $('startButton').addEventListener('click',()=>{
   if(state.finished)clearRun();
   // People who ask to reduce animations can read the result immediately.
   if(reducedMotion()){state.started=true;finishRun();showWorld();return;}
   const wasRunning=state.running;
   state.running=!state.running;state.started=true;state.last=0;
   stage.setMoving(state.running);setRunningInputs(true);resetResult();syncRunUi();updateGraph();
   if(state.running)scheduleRunningFrame();else haltRunningFrame();
   updateSceneMessage(state.running?'列車が中央駅へ走っています':'一時停止しています');
   if(!wasRunning&&state.t===0)showWorld();
 });
 $('skipRun').addEventListener('click',finishRun);
 $('jumpControls').addEventListener('click',()=>{$('gameControls').scrollIntoView({behavior:reducedMotion()?'instant':'smooth',block:'start'});});
 $('viewGraph').addEventListener('click',()=>{$('graphTitle').scrollIntoView({behavior:reducedMotion()?'instant':'smooth',block:'start'});});
 $('againButton').addEventListener('click',clearRun);
 $('zoomIn').addEventListener('click',()=>stage.zoomBy(1.17));$('zoomOut').addEventListener('click',()=>stage.zoomBy(1/1.17));$('resetCamera').addEventListener('click',()=>stage.resetCamera());
 function frame(now){
   runnerId=null;
   if(!state.running)return;
   const dt=state.last?Math.min(.25,Math.max(0,(now-state.last)/1000)):0;state.last=now;
   const [a,b]=speeds();state.t+=dt*SIM_MINUTES_PER_SECOND;
   const ends=outcome(a,b),endT=Math.max(ends.a,ends.b);
   if(state.t>=endT){finishRun();return;}
   stage.setTrains(positionMetres(a,state.t)/DISTANCE,positionMetres(b,state.t)/DISTANCE);
   // The chart's fixed grid is built once. Only moving paths and dots change.
   if(now-lastGraphPaint>105){lastGraphPaint=now;updateGraph();updateSceneMessage('走行中　'+round1(state.t)+'分');}
   scheduleRunningFrame();
 }
 updateSliderLabels();syncRunUi();stage.setTrains(0,0);stage.setMoving(false);updateGraph();
 window.__pikaIslandDebug={getState:()=>({...state,speeds:speeds(),renderer:stage.getRenderType(),camera:stage.getCameraState(),scene:stage.getSceneStats(),runningRaf:runnerId!==null,graphGridNodes:$('graphGrid').childNodes.length}),jumpToEnd:finishRun};
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();}
return {DISTANCE,MIN_SPEED,MAX_SPEED,STEP,GRAPH_MAX_MINUTES,SIM_MINUTES_PER_SECOND,validSpeed,arrivalMinutes,positionMetres,outcome,modelAt};
});
