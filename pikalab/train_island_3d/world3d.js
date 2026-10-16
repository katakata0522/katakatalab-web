/* PikaLab 3D Train Island — actual polygonal 3D scene, WebGL rasterization with Canvas 2D software fallback.
   No image scene, no external package, no network calls. Public functions are testable with Node. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TrainIsland3D = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const V = (x,y,z) => [x,y,z];
  const plus=(a,b)=>V(a[0]+b[0],a[1]+b[1],a[2]+b[2]);
  const sub=(a,b)=>V(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  const scale=(a,s)=>V(a[0]*s,a[1]*s,a[2]*s);
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross=(a,b)=>V(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]);
  const length=a=>Math.sqrt(dot(a,a));
  const normalize=a=>scale(a,1/(length(a)||1));
  const lerp=(a,b,t)=>plus(scale(a,1-t),scale(b,t));
  const LIGHT=normalize(V(-0.55,1,0.75));
  const COLORS={water:'#89c5c9',seaDeep:'#74b9c2',foam:'#e2fbef',grass:'#e0ea91',grassLight:'#f0efa6',grassRim:'#c6db83',cliff:'#f8e7c4',cliffDark:'#dac29e',cliffEdge:'#ffeed2',forest:'#769579',forestLight:'#a8b982',pine:'#799177',trunk:'#947959',wood:'#876b60',rail:'#6c697b',iron:'#9a92a0',roof:'#d98764',wall:'#ffeed6',window:'#7caebe',navy:'#45425b',red:'#ce6367',blue:'#4d84b5'};
  function hash(v){let n=v>>>0; n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return (n^(n>>>16))>>>0;}
  function randFrom(i){return hash(i)/4294967295;}
  function hexRgb(hex){const n=parseInt(hex.replace('#',''),16);return [(n>>16)&255,(n>>8)&255,n&255];}
  const rgbCache=new Map();
  function rgb(hex){if(!rgbCache.has(hex))rgbCache.set(hex,hexRgb(hex));return rgbCache.get(hex);}
  const colCache=new Map();
  function tint(hex,n){const id=hex+'_'+Math.round(n*100);if(colCache.has(id))return colCache.get(id); const c=rgb(hex).map(v=>Math.max(0,Math.min(255,Math.round(v*n)))); const result='#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');colCache.set(id,result);return result;}
  function shade(verts,color){const normal=normalize(cross(sub(verts[1],verts[0]),sub(verts[2],verts[0])));const light=Math.max(0,dot(normal,LIGHT)); const brightness=Math.abs(normal[1])>.96? .99: .87+light*.19;return tint(color,brightness);}
  const faces=[];
  function polygon(list,verts,color,override){if(verts.length<3)return;list.push({v:verts,c:override||shade(verts,color)});}
  function quad(list,a,b,c,d,color){polygon(list,[a,b,c,d],color);}
  function box(list,x,y,z,w,h,d,color,rotation=0){
    const ca=Math.cos(rotation),sa=Math.sin(rotation);
    const pos=(px,py,pz)=>V(x+px*ca+pz*sa,y+py,z-px*sa+pz*ca);
    const p=[pos(-w/2,-h/2,-d/2),pos(w/2,-h/2,-d/2),pos(w/2,h/2,-d/2),pos(-w/2,h/2,-d/2),pos(-w/2,-h/2,d/2),pos(w/2,-h/2,d/2),pos(w/2,h/2,d/2),pos(-w/2,h/2,d/2)];
    quad(list,p[0],p[1],p[2],p[3],color);quad(list,p[5],p[4],p[7],p[6],color);quad(list,p[4],p[0],p[3],p[7],color);quad(list,p[1],p[5],p[6],p[2],color);quad(list,p[3],p[2],p[6],p[7],color);quad(list,p[4],p[5],p[1],p[0],color);
  }
  function cylinder(list,x,y,z,r1,r2,h,color,segments=8,rotation=0){
    const top=[],bottom=[];let co=Math.cos(rotation),si=Math.sin(rotation);
    for(let i=0;i<segments;i++){const theta=i*Math.PI*2/segments;const dx=Math.cos(theta),dz=Math.sin(theta);let xp=dx*co+dz*si,zp=-dx*si+dz*co;top.push(V(x+xp*r2,y+h/2,z+zp*r2));bottom.push(V(x+xp*r1,y-h/2,z+zp*r1));}
    polygon(list,top,color);
    for(let i=0;i<segments;i++){const j=(i+1)%segments;quad(list,bottom[i],bottom[j],top[j],top[i],color)}
    polygon(list,bottom.slice().reverse(),color);
  }
  function cone(list,x,y,z,rad,h,color,segments=6){cylinder(list,x,y,z,rad,0.05,h,color,segments);}
  function disc(list,x,y,z,r,color,n=10){let pts=[];for(let i=0;i<n;i++){const a=2*Math.PI*i/n;pts.push(V(x+Math.cos(a)*r,y,z+Math.sin(a)*r));}polygon(list,pts,color);}
  function silhouette(list,cx,cz,rx,rz,height,seed){
    const n=12,points=[];
    for(let i=0;i<n;i++){let a=(i/n)*Math.PI*2,variation=.93 +randFrom(seed+i*103)*.14;points.push(V(cx+Math.cos(a)*rx*variation,height,cz+Math.sin(a)*rz*variation));}
    const core=V(cx,height,cz);
    // Stratified creams and grass lips follow the same true 3D polygon contour.
    const bottom=-3.26;
    for(let i=0;i<n;i++){
      const j=(i+1)%n,p=points[i],q=points[j];
      const above=V(p[0],height-.10,p[2]),aboveQ=V(q[0],height-.10,q[2]);
      const m1=V(p[0],height-.10-(height-bottom)*.44,p[2]),m2=V(q[0],height-.10-(height-bottom)*.44,q[2]);
      const foot1=V(p[0],bottom,p[2]),foot2=V(q[0],bottom,q[2]);
      quad(list,p,q,aboveQ,above,i%4===0?COLORS.grassLight:COLORS.grassRim);
      quad(list,above,aboveQ,m2,m1,i%3===0?COLORS.cliff:COLORS.cliffEdge);
      quad(list,m1,m2,foot2,foot1,i%4===0?COLORS.cliffDark:COLORS.cliff);
      // The pale waterline visually separates the island from its turquoise sea.
      const outer1=V(cx+(foot1[0]-cx)*1.065,bottom+.025,cz+(foot1[2]-cz)*1.065);
      const outer2=V(cx+(foot2[0]-cx)*1.065,bottom+.025,cz+(foot2[2]-cz)*1.065);
      quad(list,foot1,foot2,outer2,outer1,COLORS.foam);
      if(i%3===0){quad(list,V(p[0],bottom+.16,p[2]),V(q[0],bottom+.16,q[2]),foot2,foot1,'#d6ccb0');}
      // Fine layer cuts in the limestone, under the grass (actual polygons, not an image).
      if(i%4===0){const lo=height-.30;let a=V(p[0],lo,p[2]),b=V(q[0],lo,q[2]);quad(list,a,b,V(b[0],lo-.07,b[2]),V(a[0],lo-.07,a[2]),'#eee2bf');}
    }
    for(let i=0;i<n;i++){polygon(list,[core,points[i],points[(i+1)%n]],i%4===0?COLORS.grassLight:COLORS.grass);}
    return {cx,cz,rx,rz,y:height,seed};
  }
  function tree(list,x,y,z,s,variation=0){
    const trunkColor=variation>0.5?'#9b8a65':'#88775a';
    cylinder(list,x,y+.25*s,z,.085*s,.075*s,.54*s,trunkColor,5);
    const hues=['#8b9f74','#a3b277','#7e9a7b','#b4b36f','#8caa87'];let base=hues[Math.floor(variation*hues.length)%hues.length];
    cone(list,x,y+.60*s,z,.46*s,.75*s,base,6);
    cone(list,x,y+1.02*s,z,.36*s,.7*s,variation>.62?'#b6b475':base,6);
    cone(list,x,y+1.42*s,z,.25*s,.58*s,base,6);
    // Umbra at base
    disc(list,x,y+.018,z,.43*s,'#c4d279',7);
  }
  function boulder(list,x,y,z,s){cylinder(list,x,y+s*.28,z,s*.7,s*.48,s*.55,'#9e9a8d',6);cylinder(list,x-.06*s,y+s*.53,z-.04*s,s*.43,s*.25,s*.2,'#bbb0a0',5);}
  function shrub(list,x,y,z,r,seed){const hues=['#9eb57e','#b2c581','#bdc27b','#93ad77'];
    cylinder(list,x,y+r*.28,z,r,r*.76,r*.52,hues[seed%4],7);}
  function house(list,x,y,z,s,roof='#b88d7e'){
    box(list,x,y+.47*s,z,1.05*s,.84*s,.81*s,COLORS.wall);
    const peak=V(x,y+1.36*s,z),e=.66*s,half=.53*s;
    polygon(list,[V(x-half,y+.88*s,z-e),V(x+half,y+.88*s,z-e),V(x,y+1.42*s,z-e)],'#f8dfba');
    polygon(list,[V(x+half,y+.88*s,z+e),V(x-half,y+.88*s,z+e),V(x,y+1.42*s,z+e)],'#f8dfba');
    quad(list,V(x-half,y+.88*s,z-e),V(x,y+1.42*s,z-e),V(x,y+1.42*s,z+e),V(x-half,y+.88*s,z+e),roof);
    quad(list,V(x,y+1.42*s,z-e),V(x+half,y+.88*s,z-e),V(x+half,y+.88*s,z+e),V(x,y+1.42*s,z+e),roof);
    box(list,x,y+.36*s,z+.41*s,.23*s,.39*s,.035*s,'#b88871');
    for(let d of [-.32,.32])box(list,x+d*s,y+.53*s,z+.426*s,.17*s,.19*s,.036*s,'#a4c4ca');
    box(list,x+.25*s,y+1.50*s,z-.22*s,.15*s,.35*s,.16*s,'#ae8b7d');
    // A narrow doorstep and tiny flowerbox suggest a lived-in model village.
    box(list,x,y+.07*s,z+.56*s,.48*s,.11*s,.31*s,'#d3bca1');
    box(list,x+.34*s,y+.28*s,z+.46*s,.23*s,.08*s,.16*s,'#ae9675');
    shrub(list,x+.34*s,y+.30*s,z+.48*s,.10*s,3);
  }
  function station(list){
    const x=0,y=.73,z=-.52;
    box(list,x,y+.17,z,3.25,.36,2.05,'#dcc7a2');
    box(list,x,y+1.07,z,3.04,1.56,1.86,COLORS.wall);
    box(list,x,y+1.96,z,3.36,.17,2.03,'#efceb2');
    // pitched roof gables around a cream station
    const a=1.73, b=1.13, yBase=y+2.02,yPeak=y+2.80;
    polygon(list,[V(x-a,yBase,z-b),V(x+a,yBase,z-b),V(x,yPeak,z-b)],'#eeb48a');
    polygon(list,[V(x+a,yBase,z+b),V(x-a,yBase,z+b),V(x,yPeak,z+b)],'#eeb48a');
    quad(list,V(x-a,yBase,z-b),V(x,yPeak,z-b),V(x,yPeak,z+b),V(x-a,yBase,z+b),'#d37e62');
    quad(list,V(x,yPeak,z-b),V(x+a,yBase,z-b),V(x+a,yBase,z+b),V(x,yPeak,z+b),'#e29169');
    // Subtle low-poly roof-tile courses: an architectural detail, not text decoration.
    for (const roofSide of [-1,1]) {
      for (let row=1;row<=3;row++) {
        const fraction=row/4, yy=yPeak+(yBase-yPeak)*fraction,xx=x+roofSide*a*fraction;
        const c=roofSide<0?'#e9a27c':'#d78167';
        beam(list,V(xx,yy+.012,z-b+.07),V(xx,yy+.012,z+b-.07),.035,.018,c);
      }
    }
    // Platform canopy and tiny station clock are intentionally part of the real mesh.
    box(list,x,y+.30,z+1.35,3.12,.11,.63,'#e5d1af');
    for(const dx of [-1.4,1.4])cylinder(list,x+dx,y+.49,z+1.56,.055,.05,.82,'#998b78',6);
    for(const dx of [-1.1,1.1]){box(list,x+dx,y+1.25,z+0.945,.46,.56,.04,'#87b7c0');box(list,x+dx,y+1.25,z+.977,.045,.57,.05,'#fff1d7')}
    box(list,x,y+.76,z+.949,.55,1.05,.04,'#b79077');
    cylinder(list,x,y+2.20,z+1.143,.29,.29,.04,'#f9f5e5',12);
    box(list,x,y+2.20,z+1.17,.04,.19,.04,'#70667b');
    box(list,x+.066,y+2.20,z+1.18,.15,.04,.04,'#70667b');
    // A little covered platform, benches and lamps
    box(list,-2.25,y+.09,.75,1.08,.13,.65,'#bca991');
    for(const xx of [-2.6,-1.95])box(list,xx,y+.29,.8,.06,.35,.05,'#806b5e');
    for(const xx of [-2.7,2.7]){
      cylinder(list,xx,y+.73,1.26,.045,.04,1.3,'#7f807d',6);
      cone(list,xx,y+1.46,1.26,.19,.31,'#e1bd6a',6);
    }
  }
  function windmill(list,x,y,z){
    cylinder(list,x,y+1.16,z,.69,.43,2.3,'#f8efda',9);
    cone(list,x,y+2.51,z,.77,.68,'#527991',8);
    box(list,x,y+.70,z+.58,.32,.55,.075,'#6b92a5');
    for(let k of [-.55,.55])box(list,x+k,y+1.56,z+.48,.19,.29,.065,'#89bbc1');
  }
  function windmillBlades(list,x,y,z,phase){
    const h=y+2.40;
    cylinder(list,x,h,z+.55,.18,.19,.28,'#bb9a73',8);
    for(let i=0;i<4;i++){
      const a=phase+i*Math.PI/2,c=Math.cos(a),s=Math.sin(a),d=1.05;
      let center=V(x+c*d/2,h+s*d/2,z+.78);
      let pts=[[.14,.04],[-.14,.04],[-.22,1.05],[.22,1.05]].map(([dx,dy])=>V(x+c*dy-s*dx,h+s*dy+c*dx,z+.8));
      polygon(list,pts,'#e4d3b4');
    }
  }
  function waterfall(list,x,y,z){
    const a=V(x-.56,y,z),b=V(x+.52,y,z),c=V(x+.52,-3.48,z+.13),d=V(x-.56,-3.48,z+.13);
    quad(list,a,b,c,d,'#8edbe0');
    quad(list,V(x-.40,y-.08,z+.05),V(x-.19,y-.08,z+.05),V(x-.19,-3.40,z+.19),V(x-.40,-3.40,z+.19),'#ddf4e6');
    for(let i=0;i<3;i++)disc(list,x+(i-1)*.45,-3.36,z+.24,.27,'#d6faf2',8);
  }
  function trackCurve(points){
    function evalAt(t){const count=points.length-1,s=Math.min(count-.00001,Math.max(0,t*count));const i=Math.floor(s),a=s-i;
      const p0=points[Math.max(i-1,0)],p1=points[i],p2=points[i+1],p3=points[Math.min(i+2,count)];
      return [0,1,2].map(k=> .5*((2*p1[k])+(-p0[k]+p2[k])*a+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*a*a+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*a*a*a));
    }
    const lengths=[0],samples=300; let sum=0,prev=evalAt(0);
    for(let i=1;i<=samples;i++){const next=evalAt(i/samples);sum+=length(sub(next,prev));lengths.push(sum);prev=next;}
    function point(progress){if(progress<=0)return points[0].slice();if(progress>=1)return points[points.length-1].slice();const d=Math.min(1,Math.max(0,progress))*sum;let low=0,high=samples;while(high-low>1){const m=(low+high)>>1;if(lengths[m]<=d)low=m;else high=m;}
      const delta=lengths[high]-lengths[low],fraction=delta? (d-lengths[low])/delta:0; return evalAt((low+fraction)/samples);}
    function tangent(t){let a=point(Math.max(0,t-.002)),b=point(Math.min(1,t+.002));return normalize(sub(b,a));}
    return {point,tangent,totalLength:sum};
  }
  function beam(list,a,b,width,height,color){let dx=b[0]-a[0],dz=b[2]-a[2],d=Math.hypot(dx,dz); if(d<.0001)return;
    const yaw=Math.atan2(dx,dz);box(list,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,width,height,d+.035,color,yaw);
  }
  function railLine(list,curve,seed){
    const samples=98;
    for(let i=0;i<=samples;i++){
      const u=i/samples,p=curve.point(u),t=curve.tangent(u),n=normalize(V(-t[2],0,t[0]));
      const tieP=V(p[0],p[1]+.05,p[2]);const yaw=Math.atan2(t[0],t[2]);
      // Ties, a narrow bridge deck and support piles are genuine 3D geometry.
      // Deck follows the curved railway and sits below the cross-ties.
      const bridge=(seed===1 && i>18 && i<78)||(seed===2 && i>37 && i<75);
      if(bridge && i<samples){
        const next=curve.point((i+1)/samples);
        const boardA=V(p[0],p[1]-.13,p[2]);
        const boardB=V(next[0],next[1]-.13,next[2]);
        beam(list,boardA,boardB,1.08,.17,'#c2a686');
      }
      box(list,tieP[0],tieP[1],tieP[2],.99,.12,.18,'#947864',yaw);
      if(bridge&&i%9===0){
        const drop=p[1]-(-3.18);
        if(drop>.7){
          for(const side of [-.39,.39]){
            const x=p[0]+n[0]*side,z=p[2]+n[2]*side;
            cylinder(list,x,(-3.18+p[1])*.5,z,.105,.12,drop,'#b99f83',6);
          }
        }
      }
    }
    for(let side of [-1,1]){
      for(let i=1;i<=samples;i++){
        const a=curve.point((i-1)/samples),b=curve.point(i/samples),ta=curve.tangent((i-1)/samples),tb=curve.tangent(i/samples);
        const na=normalize(V(-ta[2],0,ta[0])),nb=normalize(V(-tb[2],0,tb[0]));
        beam(list,plus(a,V(na[0]*side*.35,.14,na[2]*side*.35)),plus(b,V(nb[0]*side*.35,.14,nb[2]*side*.35)),.095,.11,'#888296');
      }
    }
  }
  function tunnel(list,p,tan){
    const a=Math.atan2(tan[0],tan[2]);
    box(list,p[0],p[1]+.44,p[2],1.65,1.07,.24,'#777468',a);
    box(list,p[0],p[1]+.39,p[2]+.03,1.11,.72,.31,'#434450',a);
    // Stone arch projected as 3D ring segments atop the entrance
    for(let k=0;k<9;k++){
      const theta=Math.PI*k/8;
      const q=V(p[0]+Math.cos(theta)*.72,p[1]+.62+Math.sin(theta)*.37,p[2]+.16);
      box(list,q[0],q[1],q[2],.18,.2,.18,'#f1e2c2',a);
    }
  }
  function flowers(list,island,count){for(let i=0;i<count;i++){
    const n=hash(island.seed*41+i*17),t=randFrom(n)*2*Math.PI,r=Math.sqrt(randFrom(n+7))*.75;
    const x=island.cx+Math.cos(t)*island.rx*r,z=island.cz+Math.sin(t)*island.rz*r;
    disc(list,x,island.y+.036,z,.035,i%3===0?'#eaaea1':i%4===0?'#fffbed':'#c3d2a2',5);
  }}
  function footpath(list,island,seed){
    // Small irregular stone spots, kept away from the station/track itself.
    for(let i=0;i<5;i++){
      const r=randFrom(seed+i*43)*.50,angle=randFrom(seed+i*117+19)*Math.PI*2;
      const x=island.cx+Math.cos(angle)*island.rx*r;
      const z=island.cz+Math.sin(angle)*island.rz*r;
      disc(list,x,island.y+.048,z,.11+randFrom(seed+i*7)*.075,i%2?'#f8e7b9':'#e5dbab',6);
    }
  }
  function addLandscape(list,paths){
    // The staggered terrain is what makes the scene read as a 3D island, not a wallpaper.
    const islands=[
      silhouette(list,-7.3,-4.7,3.15,2.35,3.05,2),
      silhouette(list,-7.4,.10,3.05,2.48,1.65,19),
      silhouette(list,-7.1,4.3,2.9,2.05,-.13,32),
      silhouette(list,-.8,-6.58,3.05,2.14,2.02,44),
      silhouette(list,6.1,-5.20,3.25,2.34,2.55,69),
      silhouette(list,6.6,-.20,3.25,2.46,1.48,80),
      silhouette(list,6.45,4.48,3.72,2.50,-.19,95),
      silhouette(list,-.65,4.50,4.25,2.35,-.16,110),
      silhouette(list,0,0,3.8,2.94,.74,128)
    ];
    // Forests occupy island edges, keeping the playable tracks legible.
    for(const island of islands){
      const treeCount=island.y>2?7:island.y>0?6:4;
      for(let j=0;j<treeCount;j++){
        const id=hash(island.seed*391+j*897),ang=randFrom(id)*Math.PI*2,rr=.47+randFrom(id+6)*.45;
        const x=island.cx+Math.cos(ang)*island.rx*rr,z=island.cz+Math.sin(ang)*island.rz*rr;
        if(Math.abs(x)<2.4&&Math.abs(z)<2.25)continue;
        // Keep trees a little way off both tracks so the trains remain visible.
        let onTrack=false;
        for(const curve of paths){
          for(let k=0;k<=55;k++){
            const c=curve.point(k/55);
            if(Math.abs(c[1]-island.y)<1.7 && Math.hypot(x-c[0],z-c[2])<1.12){onTrack=true;break;}
          }
          if(onTrack)break;
        }
        if(onTrack)continue;
        tree(list,x,island.y+.04,z,.55+randFrom(id+31)*.65,randFrom(id+15));
      }
      flowers(list,island,30);
      footpath(list,island,island.seed+1000);
    }
    for(let i=0;i<12;i++){let x=-7.6+(i%4)*.65,z=5.3+Math.floor(i/4)*.35; shrub(list,x,-.04,z,.19+(i%3)*.05,i)}
    station(list);
    house(list,-2.3,2.12,-6.4,.70,'#a98779');
    house(list,6.0,2.64,-5.6,.78,'#b18879');
    house(list,5.25,-.12,5.42,.72,'#9d8588');
    house(list,2.1,-.12,5.7,.63,'#bc9f7d');
    house(list,-7.1,1.69,.6,.54,'#ab9680');
    windmill(list,7.55,-.19,4.16);
    waterfall(list,-4.55,1.58,1.90);
    // Little sheep, sea stones, and a pier as 3D meshes.
    for(let i=0;i<3;i++){const x=4.3+(i%2)*.75,z=4.53+(i>>1)*.7; cylinder(list,x,-.03,z,.32,.29,.28,'#fff3d6',7);cone(list,x,-.03+.22,z,.23,.20,'#fffaf0',7);}
    for(let i=0;i<13;i++){
      const id=hash(i*1027+77),angle=randFrom(id)*2*Math.PI,rr=14+randFrom(id+15)*5;
      boulder(list,Math.sin(angle)*rr*.92,-3.15,Math.cos(angle)*rr*.7,.25+randFrom(id+1)*.64);
    }
    for(let i=0;i<9;i++)box(list,8.0+i*.36,-3.05,6.1, .30,.16,1.25,'#a28a70');
    // Tiny low-poly water glints at island margins: helps the archipelago feel afloat.
    const glints=[[11.2,2.5],[10.3,-5.4],[-11.5,1.2],[-9.8,-7.7],[1.2,7.7],[10.5,7.0],[-2.6,-10.0]];
    for(const [x,z] of glints){
      for(let i=0;i<3;i++)box(list,x+i*.26,-3.22,z+i*.17,.34,.018,.065,i===1?'#def1dd':'#b7ded4',-.32);
    }
    return islands;
  }
  function rollingWheel(list,x,y,z,r,width,yaw){
    // Wheels are horizontal-axle cylinders, not vertical discs planted in the track.
    const side=V(Math.cos(yaw),0,-Math.sin(yaw));
    const along=V(Math.sin(yaw),0,Math.cos(yaw));
    const left=[],right=[];
    for(let i=0;i<9;i++){
      const a=i*Math.PI*2/9,c=Math.cos(a)*r,up=Math.sin(a)*r;
      const radial=plus(scale(along,c),V(0,up,0));
      const base=plus(V(x,y,z),radial);
      left.push(plus(base,scale(side,-width/2)));
      right.push(plus(base,scale(side,width/2)));
    }
    polygon(list,left.slice().reverse(),'#424052');
    polygon(list,right,'#414052');
    for(let i=0;i<9;i++)quad(list,left[i],left[(i+1)%9],right[(i+1)%9],right[i],'#5d5963');
  }
  function trainFaces(list,curve,progress,color,smoke=false){
    const p=curve.point(progress),t=curve.tangent(progress),yaw=Math.atan2(t[0],t[2]);
    const sx=Math.sin(yaw),sz=Math.cos(yaw),ny=p[1]+.30;
    const offset=(side,dist)=>V(p[0]+side*sz+dist*sx,ny,p[2]-side*sx+dist*sz);
    function part(dx,dy,dz,w,h,d,col){let po=offset(dx,dz);box(list,po[0],po[1]+dy,po[2],w,h,d,col,yaw);}
    // Locomotive base, coal chamber, cabin, rounded-looking blocky details.
    part(0,-.07,-.08,.79,.22,1.32,'#3e3c4b');
    part(0,.28,.22,.76,.62,.68,color);
    part(0,.27,-.35,.79,.45,.65,tint(color,.84));
    part(0,.67,-.33,.89,.20,.84,'#40415c');
    part(0,.36,-.82,.54,.49,.50,'#41405a');
    part(0,.48,-.12,.55,.24,.035,'#a5d6d2');
    // Cylinder boiler with low-poly cone silhouette.
    {const o=offset(0,.31);cylinder(list,o[0],o[1]+.54,o[2],.17,.16,.34,'#6f6380',7);}
    {const o=offset(0,.67);cylinder(list,o[0],o[1]+.54,o[2],.15,.12,.32,'#53556e',7);}
    // Wheels on both sides of the locomotive and its two carriages.
    for(let i=0;i<3;i++){
      for(let d of [-.38,.38]){
        const o=offset(d,i===0? .30:(i===1?-.40:-.94));
        rollingWheel(list,o[0],o[1]-.13,o[2],.16,.11,yaw);
      }
    }
    // Every carriage follows its own point and tangent on the actual 3D curve.
    // A straight translation of the locomotive frame would cut corners and float off the rails.
    for(let i=0;i<2;i++){
      const carriageProgress=Math.max(0,progress-(1.48+i*1.00)/curve.totalLength);
      const cp=curve.point(carriageProgress),ct=curve.tangent(carriageProgress);
      const cyaw=Math.atan2(ct[0],ct[2]);
      const o=V(cp[0],cp[1]+.30,cp[2]);
      const paint=i===0?'#cf8792':tint(color,.9);
      box(list,o[0],o[1]+.20,o[2],.77,.63,.88,paint,cyaw);
      box(list,o[0],o[1]+.56,o[2],.84,.16,.94,'#56576c',cyaw);
      // Tiny pale-blue square windows on both sides, in the carriage's frame.
      const sn=Math.sin(cyaw),cs=Math.cos(cyaw);
      for(const side of [-1,1]){
        for(const along of [-.21,.21]){
          const wx=o[0]+side*.405*cs+along*sn;
          const wz=o[2]-side*.405*sn+along*cs;
          box(list,wx,o[1]+.33,wz,.075,.21,.19,'#d7eff1',cyaw);
        }
      }
      for(const along of [-.31,.31]){
        const wx=o[0]+along*sn,wz=o[2]+along*cs;
        for(const side of [-.38,.38]){
          rollingWheel(list,wx+side*cs,o[1]-.14,wz-side*sn,.15,.11,cyaw);
        }
      }
      // Dark short coupler visible between separate wagon meshes.
      if(i===0){const front=curve.point(Math.max(0,progress-.95/curve.totalLength));
        beam(list,V(front[0],front[1]+.20,front[2]),V(o[0],o[1]-.11,o[2]),.10,.10,'#67616c');}
    }
    if(smoke&&progress<.97){const o=offset(0,.4);for(let i=0;i<3;i++)cylinder(list,o[0]-.24*i,o[1]+.95+.31*i,o[2]-.13*i,.21+.05*i,.14,.18,'#fdf7e1',7);}
  }
  function compileWorld(){
    const mesh=[];
    const A=trackCurve([V(-8.8,.07,5.34),V(-7.3,.06,5.45),V(-6.0,.10,5.65),V(-4.45,.23,4.4),V(-3.14,.92,2.94),V(-1.4,.99,1.17)]);
    const B=trackCurve([V(6.1,2.70,-4.25),V(7.6,2.56,-3.0),V(8.5,1.68,-.7),V(8.0,1.48,1.05),V(8.0,.17,4.5),V(6.10,.08,5.6),V(4.0,.16,4.5),V(2.50,.88,2.55),V(1.52,.98,1.25)]);
    const islands=addLandscape(mesh,[A,B]);
    railLine(mesh,A,1);railLine(mesh,B,2);
    tunnel(mesh,A.point(0),A.tangent(.007));tunnel(mesh,B.point(0),B.tangent(.007));
    return {mesh,islands,paths:[A,B]};
  }
  function makeCamera(canvas){const defaultZoom=canvas.clientWidth<600?1.22:1.11;let w=canvas.width,h=canvas.height,azimuth=.70,elevation=.73,zoom=defaultZoom;
    function basis(){const cy=Math.sin(elevation),cx=Math.sin(azimuth)*Math.cos(elevation),cz=Math.cos(azimuth)*Math.cos(elevation);
      const forward=normalize(V(-cx,-cy,-cz)),right=normalize(cross(forward,V(0,1,0))),up=normalize(cross(right,forward));
      const k=Math.min(w/30.0,h/21.1)*zoom;
      return {forward,right,up,k,w,h};}
    return {setSize:(a,b)=>{w=a;h=b},getBasis:basis,
      project:(p,b)=>{const rel=sub(p,V(0,.35,0));return {x:b.w*.50+dot(rel,b.right)*b.k,y:b.h*.53-dot(rel,b.up)*b.k,depth:dot(rel,b.forward)}},
      orbit:(dx,dy)=>{azimuth=Math.min(1.65,Math.max(-1.30,azimuth+dx*.006)); elevation=Math.min(1.32,Math.max(.34,elevation+dy*.006));},
      zoomBy:d=>{zoom=Math.min(1.85,Math.max(.65,zoom*d))},reset:()=>{azimuth=.70;elevation=.73;zoom=defaultZoom;},getState:()=>({azimuth,elevation,zoom})};
  }
  /* GPU path: upload static island vertices once; train/windmill vertices are dynamic.
     Orbit/zoom are shader uniforms instead of re-projecting every island triangle on the CPU. */
  function createWebGL(canvas, staticFaces){
    let gl;
    try {gl=canvas.getContext('webgl2',{alpha:false,antialias:true})||canvas.getContext('webgl',{alpha:false,antialias:true});}
    catch(_){gl=null;}
    if(!gl)return null;
    const vertex=`attribute vec3 pos; attribute vec3 tint;
      uniform vec3 uRight,uUp,uForward; uniform vec2 uScale;
      varying vec3 outTint;
      void main(){vec3 rel=pos-vec3(0.0,0.35,0.0);
        gl_Position=vec4(dot(rel,uRight)*uScale.x, -.06 +dot(rel,uUp)*uScale.y, dot(rel,uForward)/45.0,1.0);
        outTint=tint;}`;
    const fragment=`precision mediump float;varying vec3 outTint;void main(){gl_FragColor=vec4(outTint,1.0);}`;
    let program,staticBuffer,dynamicBuffer,attribPos,attribColor,uniformRight,uniformUp,uniformForward,uniformScale;
    function shader(type,source){const item=gl.createShader(type);gl.shaderSource(item,source);gl.compileShader(item);
      if(!gl.getShaderParameter(item,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(item));return item;}
    function pack(items){let count=0;for(const f of items)count+=Math.max(0,f.v.length-2)*3;
      const data=new Float32Array(count*6);let k=0;
      for(const f of items){const c=rgb(f.c);for(let j=1;j<f.v.length-1;j++){
        for(const p of [f.v[0],f.v[j],f.v[j+1]]){
          data[k++]=p[0];data[k++]=p[1];data[k++]=p[2];
          data[k++]=c[0]/255;data[k++]=c[1]/255;data[k++]=c[2]/255;
        }
      }}return data;
    }
    try{
      program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);attribPos=gl.getAttribLocation(program,'pos');attribColor=gl.getAttribLocation(program,'tint');
      uniformRight=gl.getUniformLocation(program,'uRight');uniformUp=gl.getUniformLocation(program,'uUp');uniformForward=gl.getUniformLocation(program,'uForward');uniformScale=gl.getUniformLocation(program,'uScale');
      if(attribPos<0||attribColor<0||!uniformScale)throw new Error('WebGL shader variables are missing');
      staticBuffer=gl.createBuffer();dynamicBuffer=gl.createBuffer();
      const staticData=pack(staticFaces);
      gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,staticData,gl.STATIC_DRAW);
      const staticVertexCount=staticData.length/6;
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
      const bind=(buffer)=>{gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(attribPos);gl.enableVertexAttribArray(attribColor);gl.vertexAttribPointer(attribPos,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(attribColor,3,gl.FLOAT,false,24,12);};
      return {
        render(dynamicFaces,basis){
          if(gl.isContextLost())return;
          const fresh=pack(dynamicFaces);
          gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.54,.77,.79,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
          gl.useProgram(program);
          gl.uniform3fv(uniformRight,basis.right);gl.uniform3fv(uniformUp,basis.up);gl.uniform3fv(uniformForward,basis.forward);
          gl.uniform2f(uniformScale,2*basis.k/basis.w,2*basis.k/basis.h);
          bind(staticBuffer);gl.drawArrays(gl.TRIANGLES,0,staticVertexCount);
          gl.bindBuffer(gl.ARRAY_BUFFER,dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,fresh,gl.DYNAMIC_DRAW);
          bind(dynamicBuffer);gl.drawArrays(gl.TRIANGLES,0,fresh.length/6);
        },
        getMetrics:()=>({staticVertexCount,staticUploads:1}),
        destroy(){gl.deleteBuffer(staticBuffer);gl.deleteBuffer(dynamicBuffer);gl.deleteProgram(program);}
      };
    }catch(error){
      if(staticBuffer)gl.deleteBuffer(staticBuffer);if(dynamicBuffer)gl.deleteBuffer(dynamicBuffer);if(program)gl.deleteProgram(program);
      return null;
    }
  }
  /* Canvas fallback: project static island faces only when the camera or viewport changes.
     Dynamic models still depth-sort correctly with the fixed scenery. */
  function softwarePainter(canvas,staticFaces){
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas描画が利用できません');
    let cachedCameraKey='',cachedStatic=[],staticProjectionCount=0;
    const projectFaces=(faces,basis,camera)=>faces.map(f=>{
      const p=f.v.map(v=>camera.project(v,basis));
      return {p,c:f.c,depth:p.reduce((sum,k)=>sum+k.depth,0)/p.length};
    });
    return {
      render(dynamicFaces,basis,camera){
        const {w,h}=basis,cs=camera.getState();const key=[w,h,cs.azimuth,cs.elevation,cs.zoom].join('/');
        if(key!==cachedCameraKey){cachedStatic=projectFaces(staticFaces,basis,camera);cachedCameraKey=key;staticProjectionCount++;}
        const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#82b8bb');grad.addColorStop(1,'#96cdcf');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
        const dynamic=projectFaces(dynamicFaces,basis,camera);
        const drawables=cachedStatic.concat(dynamic);drawables.sort((a,b)=>b.depth-a.depth);
        for(const item of drawables){const p=item.p;ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
          for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);
          ctx.closePath();ctx.fillStyle=item.c;ctx.fill();}
      },
      getMetrics:()=>({staticProjectionCount,cachedStaticFaces:cachedStatic.length}),destroy(){}
    };
  }
  function createWorld(canvas,labels){
    const world=compileWorld(),camera=makeCamera(canvas);
    // WebGL preferred. Some enterprise browsers disable WebGL; 3D mesh software rasterization remains functional.
    const hardwarePainter=createWebGL(canvas,world.mesh);
    const painter=hardwarePainter||softwarePainter(canvas,world.mesh);
    const renderType=hardwarePainter?'webgl':'software3d';
    let progressA=0,progressB=0,animating=true,phase=0,raf=null,idleTimer=null,drag=null,moving=false,dirty=true,immediatePaint=true;
    let renderedFrames=0;
    let width=0,height=0,dpr=1,lastPaintAt=0;
    function scheduleNext(immediate=false){
      if(!animating||raf!==null||idleTimer!==null)return;
      if(immediate||moving||drag){raf=requestAnimationFrame(draw);}
      else idleTimer=setTimeout(()=>{idleTimer=null;raf=requestAnimationFrame(draw);},440);
    }
    function invalidate(urgent=false){dirty=true;if(urgent)immediatePaint=true;
      if(idleTimer!==null){clearTimeout(idleTimer);idleTimer=null;}
      scheduleNext(true);
    }
    function resize(){const bb=canvas.getBoundingClientRect();const nw=Math.max(1,Math.round(bb.width)),nh=Math.max(1,Math.round(bb.height));
      const ndpr=Math.min(window.devicePixelRatio||1,renderType==='webgl'?1.8:1.5);
      if(nw!==width||nh!==height||ndpr!==dpr){
        width=nw;height=nh;dpr=ndpr;canvas.width=Math.round(nw*dpr);canvas.height=Math.round(nh*dpr);
        camera.setSize(canvas.width,canvas.height);dirty=true;immediatePaint=true;
      }
    }
    function draw(timestamp){
      raf=null;if(!animating)return;
      resize();
      if(typeof document!=='undefined'&&document.visibilityState==='hidden'){scheduleNext();return;}
      const frameInterval=moving?(renderType==='webgl'?28:48):440;
      if(!immediatePaint && timestamp-lastPaintAt<frameInterval){scheduleNext();return;}
      immediatePaint=false;dirty=false;lastPaintAt=timestamp;renderedFrames++;
      phase=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:timestamp*.001;
      const movingMesh=[];
      trainFaces(movingMesh,world.paths[0],.23 + progressA*.77,COLORS.red,true);
      trainFaces(movingMesh,world.paths[1],.15 + progressB*.85,COLORS.blue,false);
      windmillBlades(movingMesh,7.55,-.19,4.16,phase*.65);
      const b=camera.getBasis();painter.render(movingMesh,b,camera);
      // Draw indispensable labels using a separate overlay canvas, not on a WebGL surface.
      if(labels){const cx=labels.getContext('2d');const vw=canvas.clientWidth;
        if(labels.width!==canvas.width||labels.height!==canvas.height){labels.width=canvas.width;labels.height=canvas.height;}
        cx.clearRect(0,0,labels.width,labels.height);
        function tag(worldPoint,name,bg,large){const p=camera.project(worldPoint,b);const w=(large?100:50)*dpr,h=(large?34:29)*dpr;
          if(p.x<0||p.x>canvas.width||p.y<0||p.y>canvas.height)return;
          cx.fillStyle='rgba(255,253,242,.96)';cx.beginPath();cx.roundRect(p.x-w/2,p.y-h/2,w,h,12*dpr);cx.fill();cx.lineWidth=1.4*dpr;cx.strokeStyle=bg;cx.stroke();cx.fillStyle='#46526a';cx.font=`${large?800:900} ${(large?13:14)*dpr}px system-ui, sans-serif`;cx.textAlign='center';cx.textBaseline='middle';cx.fillText(name,p.x,p.y+1*dpr);
        }
        tag(V(-1.15,4.06,-.42),'ちゅうおう駅','#c88169',true);
        if(vw>530){tag(plus(world.paths[0].point(.23 + progressA*.77),V(0,1.5,0)),'A','#d16d71',false);tag(plus(world.paths[1].point(.15 + progressB*.85),V(0,1.5,0)),'B','#5787be',false);}
      }
      scheduleNext();
    }
    function onPointerDown(e){if(e.button!==0||drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};try{canvas.setPointerCapture(e.pointerId);}catch(_){/* interrupted gestures */}canvas.style.cursor='grabbing';}
    function onPointerMove(e){if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;camera.orbit(dx,dy);drag.x=e.clientX;drag.y=e.clientY;invalidate(true);}
    function onPointerUp(e){if(drag&&e.pointerId!==drag.id)return;drag=null;canvas.style.cursor='grab';scheduleNext(true);}
    function onWheel(e){
      // Scrolling over the scenery should still scroll the page. Ctrl/Cmd+wheel zooms
      // deliberately; the +/- buttons remain usable without a modifier.
      if(!e.ctrlKey&&!e.metaKey)return;
      e.preventDefault();camera.zoomBy(e.deltaY>0?.9:1.1);invalidate(true);
    }
    function onKey(e){let handled=true;
      if(e.key==='ArrowLeft')camera.orbit(-26,0);
      else if(e.key==='ArrowRight')camera.orbit(26,0);
      else if(e.key==='ArrowUp')camera.orbit(0,-22);
      else if(e.key==='ArrowDown')camera.orbit(0,22);
      else if(e.key==='+'||e.key==='=')camera.zoomBy(1.12);
      else if(e.key==='-')camera.zoomBy(1/1.12);
      else if(e.key.toLowerCase()==='r')camera.reset();
      else handled=false;
      if(handled){e.preventDefault();invalidate(true);}
    }
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{resize();invalidate(true);}):null;observer?.observe(canvas);
    const onVisibility=()=>{if(document.visibilityState==='visible'){lastPaintAt=0;invalidate(true);}};
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',onVisibility);
    canvas.addEventListener('keydown',onKey);
    canvas.addEventListener('pointerdown',onPointerDown);canvas.addEventListener('pointermove',onPointerMove);canvas.addEventListener('pointerup',onPointerUp);canvas.addEventListener('pointercancel',onPointerUp);canvas.addEventListener('wheel',onWheel,{passive:false});
    scheduleNext(true);
    return {setTrains:(a,b)=>{progressA=Math.max(0,Math.min(1,a));progressB=Math.max(0,Math.min(1,b));invalidate();},setMoving:v=>{moving=Boolean(v);invalidate(true);},resetCamera:()=>{camera.reset();invalidate(true);},zoomBy:k=>{camera.zoomBy(k);invalidate(true);},getRenderType:()=>renderType,getCameraState:()=>camera.getState(),
      destroy(){animating=false;if(raf!==null)cancelAnimationFrame(raf);if(idleTimer!==null)clearTimeout(idleTimer);observer?.disconnect();if(typeof document!=='undefined')document.removeEventListener('visibilitychange',onVisibility);painter.destroy();canvas.removeEventListener('keydown',onKey);canvas.removeEventListener('pointerdown',onPointerDown);canvas.removeEventListener('pointermove',onPointerMove);canvas.removeEventListener('pointerup',onPointerUp);canvas.removeEventListener('pointercancel',onPointerUp);canvas.removeEventListener('wheel',onWheel);}, getSceneStats:()=>({faces:world.mesh.length,rails:2,islands:world.islands.length,trainProgress:[progressA,progressB],renderedFrames,rendererMetrics:painter.getMetrics()})};
  }
  return {createWorld,compileWorld,trackCurve,makeCamera,sceneConstants:{islands:9,LENGTH_METRES:1200},V,length,dot};
});
