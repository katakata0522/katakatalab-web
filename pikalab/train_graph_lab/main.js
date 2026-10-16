/* Train Graph Lab UI controller: one model, one user-adjustable variable per mission. */
(function () {
  'use strict';
  const core=globalThis.TrainGraphCore, scene=globalThis.TrainGraphScene;
  const $ = id => document.getElementById(id);
  if(!core || !scene) {console.error('列車の学習エンジンが読み込めませんでした');return;}
  const PLOT={left:70, right:583, top:38, bottom:281};
  const SCALE_MIN_PER_SEC=.64;
  const PROGRESS_KEY='pikalab_train_graph_lab_solved_v1';
  const safeSolved=()=>{
    try {const input=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'[]');return new Set(Array.isArray(input)?input.filter(id=>core.MISSIONS.some(m=>m.id===id)):[]);} catch {return new Set();}
  };
  const state={missionIndex:0,value:core.MISSIONS[0].initial, mode:'idle', time:0, outcome:null, graphMax:4, frame:0, prevFrameTs:0, solved:safeSolved()};
  const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

  function storeSolved(){try{localStorage.setItem(PROGRESS_KEY,JSON.stringify([...state.solved]));}catch{/* Play remains available without storage */}}
  function mission(){return core.MISSIONS[state.missionIndex];}
  function result(){return core.outcome(mission(),state.value);}
  function formNum(n){return Number(n).toFixed(1).replace(/\.0$/,'');}
  function axisMax(){return Math.max(4,Math.ceil((state.outcome?.meet.time||3)+.9));}
  const plotX = t => PLOT.left+(PLOT.right-PLOT.left)*t/state.graphMax;
  const plotY = metres => PLOT.bottom-(PLOT.bottom-PLOT.top)*metres/core.LENGTH;
  function svgEl(tag,attrs={}){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;}
  function add(parent,tag,attrs,text){const n=svgEl(tag,attrs);if(text!==undefined)n.textContent=text;parent.appendChild(n);return n;}

  function renderGrid(){
    const grid=$('graphGrid');grid.replaceChildren();
    for(const distance of [0,300,600,900,1200]){
      const y=plotY(distance);
      add(grid,'path',{d:`M${PLOT.left} ${y}H${PLOT.right}`,stroke:distance===600?'#d7d0a9':'#e5e6e3','stroke-width':distance===600?1.7:1,'stroke-dasharray':distance===600?'4 6':'none'});
    }
    for(const distance of [0,600,1200]){
      const y=plotY(distance);
      add(grid,'text',{x:61,y:y+4,'text-anchor':'end','font-size':13,'font-weight':700,fill:'#747e89'},String(distance));
    }
    for(let t=0;t<=state.graphMax;t++){
      const x=plotX(t);
      add(grid,'path',{d:`M${x} ${PLOT.top}V${PLOT.bottom}`,stroke:'#e6e7e3','stroke-width':1});
      add(grid,'text',{x,y:PLOT.bottom+25,'text-anchor':'middle','font-size':13,fill:'#747e89','font-weight':700},String(t));
    }
    add(grid,'path',{d:`M${PLOT.left} ${PLOT.top}V${PLOT.bottom}H${PLOT.right}`,fill:'none',stroke:'#667780','stroke-width':2.4,'stroke-linecap':'round'});
    add(grid,'text',{x:PLOT.left,y:19,'font-size':14,'font-weight':900,fill:'#606d78'},'位置（m）');
    add(grid,'text',{x:PLOT.right,y:331,'text-anchor':'end','font-size':14,'font-weight':900,fill:'#606d78'},'時間（分）');
    add(grid,'text',{x:PLOT.right,y:19,'text-anchor':'end','font-size':12,fill:'#927ba7','font-weight':800},'西の駅からの距離');
  }
  function drawGraph(t, showMeet){
    const traces=$('graphTraces'),markers=$('graphMarkers');
    traces.replaceChildren();markers.replaceChildren();
    if(state.mode==='idle')return;
    const {params,meet}=state.outcome;
    const sampleCount=Math.max(1,Math.ceil(t/.045));
    for(const [key,color] of [['a','#3b97c4'],['b','#dc914c']]){
      const points=[];
      for(let i=0;i<=sampleCount;i++){
        const now=t*i/sampleCount;
        const position=core.position(params,now)[key];
        points.push(`${i?'L':'M'}${plotX(now).toFixed(2)},${plotY(position).toFixed(2)}`);
      }
      add(traces,'path',{d:points.join(' '),stroke:'#ffffff','stroke-width':8,fill:'none','stroke-linejoin':'round','stroke-linecap':'round'});
      add(traces,'path',{d:points.join(' '),stroke:color,'stroke-width':4.8,fill:'none','stroke-linejoin':'round','stroke-linecap':'round'});
      const last=core.position(params,t)[key];
      add(markers,'circle',{cx:plotX(t),cy:plotY(last),r:8.5,fill:color,stroke:'#fff','stroke-width':3.2});
    }
    if(showMeet){
      const x=plotX(meet.time),y=plotY(meet.place);
      add(markers,'circle',{cx:x,cy:y,r:16,fill:'#2d876b','fill-opacity':.13,stroke:'#2d876b','stroke-width':2.2});
      add(markers,'circle',{cx:x,cy:y,r:5.2,fill:'#2d876b',stroke:'#fff','stroke-width':2});
    }
  }

  function cancel(){if(state.frame){cancelAnimationFrame(state.frame);state.frame=0;}state.prevFrameTs=0;}
  function updatePositions(){
    const cfg=state.outcome?.params||core.configForMission(mission(),state.value);
    const p=core.position(cfg,state.time);
    $('posA').textContent=core.formatPos(p.a);
    $('posB').textContent=core.formatPos(p.b);
    $('currentTime').textContent=`${state.time.toFixed(1)}分`;
    scene.update($('diorama'),p.a,p.b,mission().target,state.mode==='completed',state.outcome?.meet.place||0);
    drawGraph(state.time,state.mode==='completed');
  }
  function playLabel(){
    $('playLabel').textContent=state.mode==='running'?'一時停止':state.mode==='paused'?'つづきを走らせる':state.mode==='completed'?'もう一度走らせる':'列車を走らせる';
    $('playButton').setAttribute('aria-label',$('playLabel').textContent);
  }
  function clearResult(){
    $('resultCard').hidden=true;$('resultCard').classList.remove('is-success');
    $('resultWhy').textContent='';$('resultTitle').textContent='';$('resultText').textContent='';$('nextButton').hidden=true;
  }
  function reset(){
    cancel();state.mode='idle';state.time=0;state.outcome=null;state.graphMax=4;
    clearResult();$('graphEmpty').hidden=false;
    $('controlSlider').disabled=false;$('graphSummary').textContent='線が交わるところが、2台の出会い。';
    renderGrid();updatePositions();playLabel();
  }
  function changeInput(value){
    const numeric=Number(value);
    if(!mission().choices.includes(numeric))return;
    state.value=numeric;
    $('controlSlider').value=String(numeric);
    $('sliderValue').textContent=`${formNum(numeric)}${mission().unit}`;
    $('controlSlider').setAttribute('aria-valuetext',`${formNum(numeric)} ${mission().unit==='km/h'?'キロメートル毎時':'分'}`);
    if(mission().axis==='speedA')$('fixedA').textContent=`${numeric}km/h`;
    if(mission().axis==='speedB')$('fixedB').textContent=`${numeric}km/h`;
    reset();
  }
  function updateProgress(){
    $('progressBadge').textContent=`できた ${state.solved.size} / ${core.MISSIONS.length}`;
    document.querySelectorAll('[data-mission]').forEach(b=>b.classList.toggle('is-done',state.solved.has(b.dataset.mission)));
  }
  function switchMission(index,focus=false){
    if(index<0||index>=core.MISSIONS.length)return;
    cancel();state.missionIndex=index;state.value=mission().initial;
    const m=mission();
    $('missionNumber').textContent=`ミッション ${m.number} / 03`;
    $('missionTitle').textContent=m.title;$('missionGoal').textContent=m.goal;
    $('goalPosition').textContent=m.target===600?'中央駅・600m':'800m地点';
    $('sliderLabel').textContent=m.inputLabel;
    $('sliderHelp').textContent=m.axis==='delayB'?'B列車を、何分あとから出発させる？':'速さを変えると、出会う場所が動くよ。';
    $('fixedA').textContent=`${m.aSpeed}km/h`;
    $('fixedB').textContent=`${m.bSpeed}km/h`;
    $('controlSlider').min=String(m.choices[0]);$('controlSlider').max=String(m.choices.at(-1));
    $('controlSlider').step=String(m.choices[1]-m.choices[0]);
    $('sliderTicks').replaceChildren();
    for(const value of m.choices){const s=document.createElement('span');s.textContent=formNum(value);$('sliderTicks').appendChild(s);}
    document.querySelectorAll('[data-mission]').forEach(btn=>{
      const active=btn.dataset.mission===m.id;
      btn.classList.toggle('is-current',active);
      if(active)btn.setAttribute('aria-current','step');else btn.removeAttribute('aria-current');
    });
    changeInput(m.initial);
    if(focus) $('missionTitle').focus({preventScroll:true});
  }
  function finish(){
    cancel();state.mode='completed';state.time=state.outcome.meet.time;
    const {meet,success,direction,shortDistance,advice}=state.outcome;
    updatePositions();$('controlSlider').disabled=false;
    $('resultCard').hidden=false;$('resultCard').classList.toggle('is-success',success);
    $('resultIcon').textContent=success?'✓':'↺';
    $('resultTitle').textContent=success?'ミッション成功！':'あと少し！';
    $('resultText').textContent=success
      ? `${core.formatTime(meet.time)}後に、目標の${core.formatPos(mission().target)}地点で出会えたよ。`
      : `目標から${direction}へ${shortDistance}mずれたよ。出会ったのは${core.formatPos(meet.place)}地点。`;
    $('resultWhy').textContent=success?mission().why:advice;
    $('graphSummary').textContent=`2つの線は ${core.formatTime(meet.time)}・${core.formatPos(meet.place)} で交わったよ。`;
    if(success){state.solved.add(mission().id);storeSolved();updateProgress();$('nextButton').hidden=state.missionIndex===core.MISSIONS.length-1;}
    playLabel();
  }
  function tick(timestamp){
    if(state.mode!=='running')return;
    if(!state.prevFrameTs) state.prevFrameTs=timestamp;
    const deltaMs=Math.min(64,Math.max(0,timestamp-state.prevFrameTs));state.prevFrameTs=timestamp;
    state.time=Math.min(state.outcome.meet.time,state.time+deltaMs/1000*SCALE_MIN_PER_SEC);
    updatePositions();
    if(state.time >= state.outcome.meet.time-1e-8){finish();return;}
    state.frame=requestAnimationFrame(tick);
  }
  function play(){
    if(state.mode==='running'){cancel();state.mode='paused';playLabel();return;}
    if(state.mode==='completed'){reset();}
    if(state.mode==='idle'){
      state.outcome=result();state.graphMax=axisMax();renderGrid();
      $('graphEmpty').hidden=true;
    }
    if(reducedMotion()) {state.mode='running';finish();return;}
    state.mode='running';$('controlSlider').disabled=true;playLabel();
    state.frame=requestAnimationFrame(tick);
  }
  function attach(){
    $('diorama').innerHTML=scene.markup();
    $('missionTabs').addEventListener('click',event=>{
      const button=event.target.closest('button[data-mission]');if(!button)return;
      const index=core.MISSIONS.findIndex(m=>m.id===button.dataset.mission);
      switchMission(index);
    });
    $('controlSlider').addEventListener('input',event=>changeInput(event.target.value));
    $('playButton').addEventListener('click',play);
    $('resetButton').addEventListener('click',reset);
    $('nextButton').addEventListener('click',()=>{
      const i=Math.min(core.MISSIONS.length-1,state.missionIndex+1);switchMission(i);
      document.querySelector('.mission-goal').scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'start'});
    });
    const dialog=$('guideDialog');
    $('openGuide').addEventListener('click',()=>dialog.showModal());
    $('closeGuide').addEventListener('click',()=>dialog.close());
    $('guideOkay').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden&&state.mode==='running'){cancel();state.mode='paused';playLabel();}
    });
    updateProgress();switchMission(0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();
