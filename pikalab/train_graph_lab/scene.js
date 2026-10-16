/* Decorative SVG 2.5D diorama. Position comes exclusively from game-core. */
(function (root) {
  'use strict';
  const TRACK_LEFT=134, TRACK_RIGHT=1066;
  const toSceneX = metres => TRACK_LEFT+(TRACK_RIGHT-TRACK_LEFT)*metres/1200;
  const trees = [
    [99,188,.76],[195,183,1.02],[292,205,.72],[386,177,.83],
    [815,185,1],[927,188,.84],[1090,175,.95],[1153,211,.58]
  ];
  const tree=(x,y,s) => `<g transform="translate(${x} ${y}) scale(${s})" aria-hidden="true">
    <ellipse cx="6" cy="41" rx="28" ry="8" fill="#376b5c" opacity=".12"/>
    <path d="M0 4V42" stroke="#926b4d" stroke-width="10" stroke-linecap="round"/>
    <path d="M-38 11L-14-22Q0-47 16-22L39 11Q38 30 9 27L-18 26Q-46 26-38 11Z" fill="#68ae91" stroke="#3f8b75" stroke-width="4"/>
    <path d="M-22 -6Q-12-25 7-25" stroke="#a5ddaf" stroke-width="8" stroke-linecap="round" fill="none" opacity=".9"/>
  </g>`;
  const sleepers = Array.from({length:30},(_,i)=>{
    const x=140+i*31.5;
    return `<path d="M${x} 274l-11 14m11 46l-11 14" stroke="#a18d7a" stroke-width="7" stroke-linecap="round" opacity=".95"/>`;
  }).join('');
  const wildFlowers = [[172,229],[345,225],[723,214],[909,228],[1050,209]].map(([x,y],i)=>`<g transform="translate(${x} ${y})"><path d="M0 10v-10" stroke="#77ac7e" stroke-width="3"/><circle cx="0" cy="-4" r="5" fill="${i%2?'#e9a99c':'#ffcf6d'}"/><circle r="2.5" cy="-4" fill="#fff7d3"/></g>`).join('');
  function train(type){
    const a = type === 'A';
    const name=a?'A':'B',body=a?'#559fc5':'#e7a15f',roof=a?'#347eab':'#c67b44',trim=a?'#285e87':'#9a643a';
    return `<g id="train${name}" class="model-train" aria-hidden="true">
      <ellipse cx="0" cy="30" rx="62" ry="13" fill="#3a4d5e" opacity=".17"/>
      <path d="M-51-25l17-16h70l17 16-13 6h-77Z" fill="${roof}" stroke="${trim}" stroke-width="3" stroke-linejoin="round"/>
      <rect x="-56" y="-26" width="112" height="47" rx="11" fill="${body}" stroke="${trim}" stroke-width="3"/>
      <path d="M39-24l17-2v37q0 9-9 10h-8Z" fill="${roof}" opacity=".92"/>
      <path d="M-47-10h77" stroke="${trim}" stroke-width="2" opacity=".35"/>
      <rect x="-42" y="-17" width="24" height="22" rx="5" fill="#dff3f4" stroke="#bad8dc" stroke-width="2"/>
      <rect x="-12" y="-17" width="24" height="22" rx="5" fill="#dff3f4" stroke="#bad8dc" stroke-width="2"/>
      <rect x="18" y="-17" width="16" height="22" rx="5" fill="#dff3f4" stroke="#bad8dc" stroke-width="2"/>
      <path d="M-41-15h22M-10-15h20" stroke="#fff" stroke-width="3" opacity=".8"/>
      <circle cx="-35" cy="23" r="10" fill="#344658" stroke="#c2c1b5" stroke-width="4"/>
      <circle cx="31" cy="23" r="10" fill="#344658" stroke="#c2c1b5" stroke-width="4"/>
      <rect x="-54" y="5" width="108" height="8" rx="3" fill="${trim}" opacity=".65"/>
      <circle cx="45" cy="0" r="4" fill="#fff2ca"/>
      <rect x="-49" y="-31" width="23" height="15" rx="7" fill="#fffdf2" stroke="${trim}" stroke-width="2"/>
      <text x="-37.5" y="-20" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="900" fill="${trim}">${name}</text>
    </g>`;
  }
  const station=(x,scale=1)=>`<g transform="translate(${x} 180) scale(${scale})" aria-hidden="true">
    <ellipse cy="45" rx="81" ry="15" fill="#47665f" opacity=".12"/>
    <rect x="-60" y="-40" width="120" height="90" rx="7" fill="#fcf2d4" stroke="#bda989" stroke-width="4"/>
    <path d="M-80-37l80-48 80 48 0 17H-80Z" fill="#dd8977" stroke="#b9695d" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-61-35H61" stroke="#eab3a6" stroke-width="7" stroke-linecap="round"/>
    <rect x="-20" y="3" width="40" height="46" rx="3" fill="#82b6bf" stroke="#6b969f" stroke-width="3"/>
    <path d="M0 3V49" stroke="#fff4de" stroke-width="4"/>
    <rect x="-49" y="-22" width="20" height="22" rx="3" fill="#abd1d1" stroke="#85acad" stroke-width="3"/>
    <rect x="29" y="-22" width="20" height="22" rx="3" fill="#abd1d1" stroke="#85acad" stroke-width="3"/>
    <rect x="-33" y="-49" width="66" height="23" rx="8" fill="#fffdf6" stroke="#bd9981" stroke-width="3"/>
    <text y="-33" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="14" fill="#625875">中央駅</text>
  </g>`;
  function markup(){
    return `<svg id="railSvg" class="rail-svg" viewBox="0 0 1200 430" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="railTitle railDesc">
      <title id="railTitle">小さな鉄道の模型</title><desc id="railDesc">青いA列車とオレンジのB列車がそれぞれの線路を反対方向に走ります。中央には中央駅があります。</desc>
      <defs>
        <linearGradient id="landTop" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d7edbb"/><stop offset="1" stop-color="#b9d49c"/></linearGradient>
        <linearGradient id="landSide" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#9ab585"/><stop offset="1" stop-color="#729578"/></linearGradient>
        <linearGradient id="railStone" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ddd8cc"/><stop offset="1" stop-color="#afa99f"/></linearGradient>
        <filter id="drop"><feGaussianBlur stdDeviation="13"/></filter>
      </defs>
      <path d="M75 360Q590 408 1130 360L1185 392Q590 438 20 390Z" fill="#6b675f" opacity=".13" filter="url(#drop)"/>
      <path d="M33 231L1167 231L1182 355Q1158 387 1108 397H94Q44 382 18 358Z" fill="url(#landSide)" stroke="#82a17b" stroke-width="3"/>
      <path d="M18 241Q41 218 101 214H1099Q1164 219 1182 243V349Q1160 371 1105 374H95Q43 373 18 349Z" fill="url(#landTop)" stroke="#8bb397" stroke-width="3"/>
      <path d="M41 355Q590 369 1157 355" stroke="#9eb98d" stroke-width="6" opacity=".45" fill="none"/>
      <path d="M41 254Q460 242 1120 252" stroke="#f3e9ba" stroke-width="16" stroke-linecap="round" opacity=".5" fill="none"/>
      ${trees.map(item=>tree(...item)).join('')}${wildFlowers}
      ${station(600,.97)}
      <g class="track-rail" aria-hidden="true">
        <path d="M115 278H1085" stroke="#a99b8d" stroke-width="33" stroke-linecap="round" opacity=".26"/>
        <path d="M115 336H1085" stroke="#a99b8d" stroke-width="33" stroke-linecap="round" opacity=".26"/>
        ${sleepers}
        <path d="M115 272H1085M115 286H1085M115 330H1085M115 344H1085" stroke="#e9edf0" stroke-width="5" stroke-linecap="round"/>
        <path d="M115 272H1085M115 330H1085" stroke="#677883" stroke-width="2" opacity=".7"/>
      </g>
      <g id="targetMarker" aria-hidden="true"><rect id="targetHalo" x="587" y="254" width="26" height="110" rx="13" fill="#f2bc6c" opacity=".27"/><path id="targetLine" d="M600 243V355" stroke="#b5873e" stroke-width="3" stroke-dasharray="5 7" opacity=".85"/><path id="targetFlag" d="M585 229H615L600 247Z" fill="#d99b48"/></g>
      ${train('A')}${train('B')}
      <g aria-hidden="true" id="sceneMeetPin" class="scene-meet-pin" opacity="0"><circle r="24" fill="#2e876a" fill-opacity=".14" stroke="#2e876a" stroke-width="4"/><circle r="7" fill="#2e876a"/></g>
    </svg>`;
  }
  function update(scene,apos,bpos,goal,showMeet=false,meetPos=0){
    if(!scene || !scene.querySelector) return;
    const a=scene.querySelector('#trainA'),b=scene.querySelector('#trainB');
    if(a)a.setAttribute('transform',`translate(${toSceneX(apos).toFixed(3)} 267)`);
    if(b)b.setAttribute('transform',`translate(${toSceneX(bpos).toFixed(3)} 326)`);
    const x=toSceneX(goal);
    const targetLine=scene.querySelector('#targetLine'),halo=scene.querySelector('#targetHalo'),flag=scene.querySelector('#targetFlag');
    if(targetLine)targetLine.setAttribute('d',`M${x} 242V358`);
    if(halo)halo.setAttribute('x',String(x-13));
    if(flag)flag.setAttribute('d',`M${x-15} 229H${x+15}L${x} 247Z`);
    const pin=scene.querySelector('#sceneMeetPin');
    if(pin){pin.setAttribute('opacity',showMeet?'1':'0');pin.setAttribute('transform',`translate(${toSceneX(meetPos).toFixed(3)} 297)`);}
  }
  root.TrainGraphScene={markup,update,toSceneX};
})(typeof window !== 'undefined' ? window : globalThis);
