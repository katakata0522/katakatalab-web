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
    const samples=Math.max(98,Math.ceil(curve.totalLength*7));
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
  // Level geometry and object placement share the same track-proximity model.
  // All static props use the actual curved rails, not a rectangular exclusion guess.
  // A connected, mostly level mainland is the playable railway surface.
  // Higher dramatic mesas live offshore so the railroad is never squeezed between them.
  // Polygon is deliberately asymmetric, with an eastern cape and broad western meadow.
  const MAINLAND_OUTLINE=Object.freeze([
    [-17.35,-5.45],[-15.45,-9.25],[-11.05,-10.85],[-6.5,-11.2],[-2.2,-10.08],
    [3.1,-10.70],[9.45,-9.85],[14.28,-8.23],[17.45,-4.5],[18.30,.35],
    [15.96,5.35],[11.65,8.15],[6.24,9.74],[.90,10.28],[-4.77,9.55],
    [-10.32,8.58],[-15.73,6.22],[-18.16,1.57]
  ]);
  function pointInPolygon(x,z,polygon){
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const a=polygon[i],b=polygon[j];
      if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  }
  function distanceToPolygonEdge(x,z,polygon){
    let best=Infinity;
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length];
      best=Math.min(best,pointSegmentDistanceXZ(x,z,[a[0],0,a[1]],[b[0],0,b[1]]));
    }
    return best;
  }
  function insideLand(island,x,z,padding=.10){
    if(island.shape==='mainland')return pointInPolygon(x,z,MAINLAND_OUTLINE)&&distanceToPolygonEdge(x,z,MAINLAND_OUTLINE)>=padding;
    const u=(x-island.cx)/island.rx,v=(z-island.cz)/island.rz;
    return Math.hypot(u,v)<1-padding/Math.min(island.rx,island.rz);
  }
  function mainland(list){
    const height=.73,bottom=-3.26,outline=MAINLAND_OUTLINE;
    const n=outline.length,pts=outline.map(([x,z])=>V(x,height,z));
    // Tessellate the grass into small cells. Giant centre-fan triangles would be
    // sorted behind/in front of the railroad as a whole by the Canvas fallback,
    // causing tracks to disappear even though their real Y coordinate is above it.
    function clipHalfplane(poly,axis,limit,keepGreater){
      const inside=p=>keepGreater?p[axis]>=limit-1e-8:p[axis]<=limit+1e-8;
      const clipped=[];
      for(let i=0;i<poly.length;i++){
        const a=poly[i],b=poly[(i+1)%poly.length],ia=inside(a),ib=inside(b);
        if(ia)clipped.push(a);
        if(ia!==ib){
          const t=(limit-a[axis])/(b[axis]-a[axis]);
          clipped.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
        }
      }
      return clipped;
    }
    const cellSize=1.28;
    for(let ix=0;ix<30;ix++)for(let iz=0;iz<20;iz++){
      const x0=-19+ix*cellSize,z0=-12+iz*cellSize;
      let patch=clipHalfplane(outline,0,x0,true);
      if(patch.length<3)continue;
      patch=clipHalfplane(patch,0,x0+cellSize,false);
      if(patch.length<3)continue;
      patch=clipHalfplane(patch,1,z0,true);
      if(patch.length<3)continue;
      patch=clipHalfplane(patch,1,z0+cellSize,false);
      if(patch.length<3)continue;
      polygon(list,patch.map(([x,z])=>V(x,height,z)),COLORS.grass);
    }
    for(let i=0;i<n;i++){
      const j=(i+1)%n,p=pts[i],q=pts[j];
      const first=V(p[0],height-.13,p[2]),next=V(q[0],height-.13,q[2]);
      const m1=V(p[0],bottom+(height-bottom)*.53,p[2]),m2=V(q[0],bottom+(height-bottom)*.53,q[2]);
      const foot1=V(p[0],bottom,p[2]),foot2=V(q[0],bottom,q[2]);
      quad(list,p,q,next,first,COLORS.grassRim);
      quad(list,first,next,m2,m1,i%4===0?COLORS.cliffEdge:COLORS.cliff);
      quad(list,m1,m2,foot2,foot1,i%4===0?COLORS.cliffDark:COLORS.cliff);
      const foam1=V(p[0]*1.018,bottom+.034,p[2]*1.018),foam2=V(q[0]*1.018,bottom+.034,q[2]*1.018);
      quad(list,foot1,foot2,foam2,foam1,COLORS.foam);
      if(i%3===0)quad(list,V(p[0],bottom+.43,p[2]),V(q[0],bottom+.43,q[2]),
        V(q[0],bottom+.31,q[2]),V(p[0],bottom+.31,p[2]),'#e6d4b1');
    }
    return {cx:0,cz:0,rx:15.1,rz:8.65,y:height,seed:128,shape:'mainland'};
  }
  // Seed 128 is the whole mainland, not a small round pedestal.
  // Elevated pieces are purposefully *off* the railroad map.
  const ISLAND_DEFINITIONS=Object.freeze([
    [-19.90,8.96,2.28,1.72,3.34,162],[-13.08,14.04,2.32,1.72,3.28,171],
    [0.95,14.44,2.65,1.86,3.52,188],[12.46,13.03,2.59,1.75,3.08,210],
    [20.82,6.80,2.72,1.99,3.16,220],[20.62,-11.40,2.36,1.75,2.70,165],
    [-19.75,-12.65,2.67,1.85,3.18,44]
  ]);
  const LANDMARK_SPECS=Object.freeze([
    {id:'seaside-windmill',type:'windmill',islandSeed:220,preferred:[.01,-.08],size:1},
    // The town, farm and waterfront now genuinely occupy the broad mainland.
    {id:'west-village',type:'house',islandSeed:128,preferred:[-.70,-.43],size:.69,roof:'#ab9680'},
    {id:'flower-cottage',type:'house',islandSeed:128,preferred:[-.47,.43],size:.73,roof:'#bc9f7d'},
    {id:'farm-cottage',type:'house',islandSeed:128,preferred:[.43,-.64],size:.78,roof:'#b18879'},
    {id:'east-village',type:'house',islandSeed:128,preferred:[.74,.29],size:.72,roof:'#b39b85'},
    {id:'southern-house',type:'house',islandSeed:128,preferred:[-.17,-.79],size:.68,roof:'#a98779'},
    {id:'northern-islet',type:'house',islandSeed:188,preferred:[.04,.01],size:.71,roof:'#9d8588'},
    {id:'east-islet',type:'house',islandSeed:165,preferred:[-.04,.02],size:.65,roof:'#b99b82'}
  ]);
  function trackSegments(paths,step=220){
    return paths.map(curve=>{
      const pts=[];
      for(let i=0;i<=step;i++)pts.push(curve.point(i/step));
      return pts;
    });
  }
  function pointSegmentDistanceXZ(x,z,a,b){
    const dx=b[0]-a[0],dz=b[2]-a[2],div=dx*dx+dz*dz;
    const t=div?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/div)):0;
    return Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t);
  }
  function clearanceToTracks(x,z,segments){
    let best=Infinity;
    for(const path of segments){for(let i=1;i<path.length;i++){
      const distance=pointSegmentDistanceXZ(x,z,path[i-1],path[i]);
      if(distance<best)best=distance;
    }}
    return best;
  }
  function footprintRadius(spec){return spec.type==='windmill'?1.57:1.06*spec.size;}
  function layoutLandmarks(islands,paths){
    const segments=trackSegments(paths),occupied=[];
    const anchors=new Map(islands.map(island=>[island.seed,island]));
    const sites=[];
    for(const spec of LANDMARK_SPECS){
      const island=anchors.get(spec.islandSeed);
      if(!island)throw new Error('Unknown island for '+spec.id);
      const radius=footprintRadius(spec),railMargin=1.15; // train width, wheels, and a gap
      // Spiral candidates preserve the original designer intention when safe.
      const candidates=[spec.preferred];
      for(const ring of [.18,.34,.49,.63,.73]){
        for(let i=0;i<24;i++){
          const angle=(2*Math.PI*i/24)+(spec.islandSeed*.027);
          candidates.push([spec.preferred[0]+Math.cos(angle)*ring, spec.preferred[1]+Math.sin(angle)*ring]);
        }
      }
      let chosen=null;
      for(const [u,v] of candidates){
        // Leave at least part of the building roof inside the low-poly grass rim.
        const x=island.cx+island.rx*u,z=island.cz+island.rz*v;
        if(!insideLand(island,x,z,radius+.19))continue;
        if(clearanceToTracks(x,z,segments)<radius+railMargin)continue;
        if(Math.hypot(x,z)<(spec.type==='windmill'?4.5:3.45))continue; // central station
        if(occupied.some(other=>Math.hypot(x-other.x,z-other.z)<radius+other.radius+.44))continue;
        chosen={...spec,x,z,y:island.y,radius,clearance:clearanceToTracks(x,z,segments)};
        break;
      }
      if(!chosen)throw new Error('Could not place '+spec.id+' away from the tracks');
      sites.push(chosen);occupied.push(chosen);
    }
    return sites;
  }
  function trainSafeSite(x,z,radius,paths){
    return clearanceToTracks(x,z,paths)>=radius+1.05;
  }
  function addLandscape(list,paths){
    const islands=[mainland(list),...ISLAND_DEFINITIONS.map(([cx,cz,rx,rz,y,seed])=>silhouette(list,cx,cz,rx,rz,y,seed))];
    const segments=trackSegments(paths);
    const landmarks=layoutLandmarks(islands,paths);
    const trees=[];
    for(const item of landmarks){
      if(item.type==='windmill')windmill(list,item.x,item.y,item.z);
      else house(list,item.x,item.y,item.z,item.size,item.roof);
    }
    for(const island of islands){
      const treeCount=island.shape==='mainland'?180:8;
      for(let j=0;j<treeCount;j++){
        const id=hash(island.seed*391+j*897),ang=randFrom(id)*Math.PI*2,rr=.28+randFrom(id+6)*.71;
        const x=island.cx+Math.cos(ang)*island.rx*rr,z=island.cz+Math.sin(ang)*island.rz*rr;
        const size=.47+randFrom(id+31)*.67;
        if(!insideLand(island,x,z,.55*size+.24))continue;
        if(Math.abs(x)<3.4&&Math.abs(z)<3.1)continue;
        if(!trainSafeSite(x,z,.50*size,segments))continue;
        if(landmarks.some(item=>Math.hypot(x-item.x,z-item.z)<item.radius+.53*size+.28))continue;
        tree(list,x,island.y+.04,z,size,randFrom(id+15));
        trees.push({x,z,size,y:island.y,clearance:clearanceToTracks(x,z,segments)});
      }
      if(island.shape==='mainland'){
        // Meadows, tiny picnic parks and farm rows spread the story across the map.
        for(const [cx,cz] of [[-12,3.6],[-8.7,-7.5],[-3.8,-6.4],[5.5,7.1],[10,-2.5],[13,3.8]]){
          if(!insideLand(island,cx,cz,1.05)||!trainSafeSite(cx,cz,1.05,segments))continue;
          for(let q=0;q<4;q++){
            const px=cx+(q%2)*.68-.34,pz=cz+Math.floor(q/2)*.62-.31;
            disc(list,px,island.y+.036,pz,.27,q%3===0?'#d6df8e':'#edf0ad',7);
            shrub(list,px,island.y+.041,pz,.13,q);
          }
        }
        for(let r=0;r<5;r++){
          const fx=-5.70+r*.39,fz=-6.6;
          if(insideLand(island,fx,fz,.24)&&trainSafeSite(fx,fz,.36,segments))
            box(list,fx,island.y+.018,fz,.23,.025,1.4,r%2?'#a3b87a':'#b6c486');
        }
      }
      flowers(list,island,island.shape==='mainland'?140:20);
      footpath(list,island,island.seed+1000);
    }
    // Beach sheep were previously beside the B line; their new enclosure is inland.
    for(let i=0;i<3;i++){
      const x=5.15+(i%2)*.85,z=7.00+(i>>1)*.68;
      if(!trainSafeSite(x,z,.34,segments)||!insideLand(islands[0],x,z,.4))continue;
      cylinder(list,x,.92,z,.32,.29,.28,'#fff3d6',7);
      cone(list,x,1.13,z,.23,.20,'#fffaf0',7);
    }
    waterfall(list,-19.55,3.33,7.91);
    // Rocks and a small pier sit in the water, outside the train's clearance envelope.
    for(let i=0;i<15;i++){
      const id=hash(i*1027+77),angle=randFrom(id)*2*Math.PI,rr=23.0+randFrom(id+15)*5;
      boulder(list,Math.sin(angle)*rr*.92,-3.15,Math.cos(angle)*rr*.7,.25+randFrom(id+1)*.64);
    }
    for(let i=0;i<9;i++)box(list,14.5+i*.31,-3.05,7.35,.28,.16,1.15,'#a28a70');
    const glints=[[15,2.5],[14.2,-7],[-15.5,1.2],[-14.8,-9.1],[2.7,12],[14,9.3],[-4.4,-12.9]];
    for(const [x,z] of glints){for(let i=0;i<3;i++)box(list,x+i*.26,-3.22,z+i*.17,.34,.018,.065,i===1?'#def1dd':'#b7ded4',-.32);}
    station(list);
    return {islands,landmarks,trees};
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
    // Two full-span routes sweep the grassy mainland instead of staying on a few isolated pedestals.
    // Their curved approaches keep the final station position exactly as before.
    const A=trackCurve([
      V(-15.9,.98,-5.85),V(-15.0,.98,-7.65),V(-12.8,.98,-8.10),V(-10.40,.98,-6.78),
      V(-11.7,.98,-3.60),V(-13.75,.98,-.15),V(-13.20,.98,3.35),
      V(-10.50,.98,5.42),V(-7.45,.98,6.90),V(-4.54,.98,6.36),
      V(-4.35,.98,4.05),V(-5.13,.98,2.27),V(-3.20,.98,1.15),V(-1.4,.99,1.17)
    ]);
    const B=trackCurve([
      V(14.95,.98,-6.95),V(12.50,.98,-7.66),V(9.70,.98,-7.48),
      V(8.30,.98,-5.20),V(9.97,.98,-2.58),V(13.25,.98,-.58),
      V(13.90,.98,2.77),V(11.65,.98,5.03),V(8.00,.98,6.11),
      V(5.05,.98,5.98),V(3.67,.98,3.65),V(2.77,.98,1.72),V(1.52,.98,1.25)
    ]);
    const {islands,landmarks,trees}=addLandscape(mesh,[A,B]);
    railLine(mesh,A,1);railLine(mesh,B,2);
    tunnel(mesh,A.point(0),A.tangent(.007));tunnel(mesh,B.point(0),B.tangent(.007));
    return {mesh,islands,paths:[A,B],landmarks,trees,mainlandOutline:MAINLAND_OUTLINE};
  }
  function makeCamera(canvas){const defaultZoom=canvas.clientWidth<600?.94:.87;let w=canvas.width,h=canvas.height,azimuth=.58,elevation=.94,zoom=defaultZoom,target=V(0,.35,0);
    function basis(){const cy=Math.sin(elevation),cx=Math.sin(azimuth)*Math.cos(elevation),cz=Math.cos(azimuth)*Math.cos(elevation);
      const forward=normalize(V(-cx,-cy,-cz)),right=normalize(cross(forward,V(0,1,0))),up=normalize(cross(right,forward));
      const k=Math.min(w/38.5,h/27.2)*zoom;
      return {forward,right,up,k,w,h};}
    return {setSize:(a,b)=>{w=a;h=b},getBasis:basis,
      project:(p,b)=>{const rel=sub(p,target);return {x:b.w*.50+dot(rel,b.right)*b.k,y:b.h*.53-dot(rel,b.up)*b.k,depth:dot(rel,b.forward)}},
      orbit:(dx,dy)=>{azimuth=Math.min(1.65,Math.max(-1.30,azimuth+dx*.006)); elevation=Math.min(1.32,Math.max(.34,elevation+dy*.006));},
      zoomBy:d=>{zoom=Math.min(2.7,Math.max(.63,zoom*d))},
      pan:(dx,dy)=>{const b=basis(),wx=scale(b.right,-dx/b.k),wy=scale(b.up,dy/b.k);target=V(Math.max(-20.5,Math.min(20.5,target[0]+wx[0]+wy[0])),.35,Math.max(-15.8,Math.min(15.8,target[2]+wx[2]+wy[2])))},
      reset:()=>{azimuth=.58;elevation=.94;zoom=defaultZoom;target=V(0,.35,0);},getState:()=>({azimuth,elevation,zoom,target:target.slice()})};
  }
  /* GPU path: upload static island vertices once; train/windmill vertices are dynamic.
     Orbit/zoom are shader uniforms instead of re-projecting every island triangle on the CPU. */
  function createWebGL(canvas, staticFaces){
    let gl;
    try {gl=canvas.getContext('webgl2',{alpha:false,antialias:true})||canvas.getContext('webgl',{alpha:false,antialias:true});}
    catch(_){gl=null;}
    if(!gl)return null;
    const vertex=`attribute vec3 pos; attribute vec3 tint;
      uniform vec3 uRight,uUp,uForward,uTarget; uniform vec2 uScale;
      varying vec3 outTint;
      void main(){vec3 rel=pos-uTarget;
        gl_Position=vec4(dot(rel,uRight)*uScale.x, -.06 +dot(rel,uUp)*uScale.y, dot(rel,uForward)/45.0,1.0);
        outTint=tint;}`;
    const fragment=`precision mediump float;varying vec3 outTint;void main(){gl_FragColor=vec4(outTint,1.0);}`;
    let program,staticBuffer,dynamicBuffer,attribPos,attribColor,uniformRight,uniformUp,uniformForward,uniformScale,uniformTarget;
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
      uniformRight=gl.getUniformLocation(program,'uRight');uniformUp=gl.getUniformLocation(program,'uUp');uniformForward=gl.getUniformLocation(program,'uForward');uniformScale=gl.getUniformLocation(program,'uScale');uniformTarget=gl.getUniformLocation(program,'uTarget');
      if(attribPos<0||attribColor<0||!uniformScale||!uniformTarget)throw new Error('WebGL shader variables are missing');
      staticBuffer=gl.createBuffer();dynamicBuffer=gl.createBuffer();
      const staticData=pack(staticFaces);
      gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,staticData,gl.STATIC_DRAW);
      const staticVertexCount=staticData.length/6;
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
      const bind=(buffer)=>{gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(attribPos);gl.enableVertexAttribArray(attribColor);gl.vertexAttribPointer(attribPos,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(attribColor,3,gl.FLOAT,false,24,12);};
      return {
        render(dynamicFaces,basis,camera){
          if(gl.isContextLost())return;
          const fresh=pack(dynamicFaces);
          gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.54,.77,.79,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
          gl.useProgram(program);
          gl.uniform3fv(uniformRight,basis.right);gl.uniform3fv(uniformUp,basis.up);gl.uniform3fv(uniformForward,basis.forward);gl.uniform3fv(uniformTarget,camera.getState().target);
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
    const projectFaces=(faces,basis,camera)=>{
      const visible=[];
      for(const face of faces){
        const p=face.v.map(v=>camera.project(v,basis));
        // Keep a margin so faces crossing the viewport border are never clipped.
        if(p.every(v=>v.x< -36)||p.every(v=>v.x>basis.w+36)||
           p.every(v=>v.y< -36)||p.every(v=>v.y>basis.h+36))continue;
        visible.push({p,c:face.c,depth:p.reduce((sum,k)=>sum+k.depth,0)/p.length});
      }
      return visible;
    };
    return {
      render(dynamicFaces,basis,camera){
        const {w,h}=basis,cs=camera.getState();const key=[w,h,cs.azimuth,cs.elevation,cs.zoom,...cs.target].join('/');
        if(key!==cachedCameraKey){cachedStatic=projectFaces(staticFaces,basis,camera).sort((a,b)=>b.depth-a.depth);cachedCameraKey=key;staticProjectionCount++;}
        const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#82b8bb');grad.addColorStop(1,'#96cdcf');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
        const dynamic=projectFaces(dynamicFaces,basis,camera).sort((a,b)=>b.depth-a.depth);
        // Linear merge of two sorted lists: static scenery is not re-sorted every animation frame.
        let si=0,di=0;
        while(si<cachedStatic.length||di<dynamic.length){
          const next=si>=cachedStatic.length?dynamic[di++]:di>=dynamic.length?cachedStatic[si++]:
            (cachedStatic[si].depth>=dynamic[di].depth?cachedStatic[si++]:dynamic[di++]);
          const p=next.p;ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
          for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);
          ctx.closePath();ctx.fillStyle=next.c;ctx.fill();
        }
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
      trainFaces(movingMesh,world.paths[0],.068 + progressA*.932,COLORS.red,true);
      trainFaces(movingMesh,world.paths[1],.062 + progressB*.938,COLORS.blue,false);
      {const mill=world.landmarks.find(item=>item.type==='windmill');windmillBlades(movingMesh,mill.x,mill.y,mill.z,phase*.65);}
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
        if(vw>530){tag(plus(world.paths[0].point(.068 + progressA*.932),V(0,1.5,0)),'A','#d16d71',false);tag(plus(world.paths[1].point(.062 + progressB*.938),V(0,1.5,0)),'B','#5787be',false);}
      }
      scheduleNext();
    }
    // A one-finger horizontal drag rotates the scene while ordinary vertical
    // touch scrolling remains available. Two fingers pan across the larger map.
    const activeTouches=new Map();
    let touchCentre=null;
    function meanTouch(){const items=[...activeTouches.values()];return {x:items.reduce((n,p)=>n+p.x,0)/items.length,y:items.reduce((n,p)=>n+p.y,0)/items.length};}
    function onPointerDown(e){
      if(e.pointerType==='touch'){
        activeTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(activeTouches.size>=2){drag=null;touchCentre=meanTouch();}
        else {drag={id:e.pointerId,x:e.clientX,y:e.clientY,pan:false};}
      }else if(e.button===0&&!drag){drag={id:e.pointerId,x:e.clientX,y:e.clientY,pan:e.shiftKey};}
      else return;
      try{canvas.setPointerCapture(e.pointerId);}catch(_){/* interrupted gestures */}
      canvas.style.cursor='grabbing';
    }
    function onPointerMove(e){
      if(e.pointerType==='touch'&&activeTouches.has(e.pointerId)){
        activeTouches.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(activeTouches.size>=2){
          const now=meanTouch();
          if(touchCentre)camera.pan(now.x-touchCentre.x,now.y-touchCentre.y);
          touchCentre=now;invalidate(true);return;
        }
      }
      if(!drag||drag.id!==e.pointerId)return;
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(drag.pan)camera.pan(dx,dy);else camera.orbit(dx,dy);
      drag.x=e.clientX;drag.y=e.clientY;invalidate(true);
    }
    function onPointerUp(e){
      if(e.pointerType==='touch'){
        activeTouches.delete(e.pointerId);touchCentre=null;drag=null;
      }else if(!drag||drag.id===e.pointerId)drag=null;
      canvas.style.cursor='grab';scheduleNext(true);
    }
    function onWheel(e){
      // Scrolling over the scenery should still scroll the page. Ctrl/Cmd+wheel zooms
      // deliberately; the +/- buttons remain usable without a modifier.
      if(!e.ctrlKey&&!e.metaKey)return;
      e.preventDefault();camera.zoomBy(e.deltaY>0?.9:1.1);invalidate(true);
    }
    function onKey(e){let handled=true;
      if(e.key==='ArrowLeft')e.shiftKey?camera.pan(-26,0):camera.orbit(-26,0);
      else if(e.key==='ArrowRight')e.shiftKey?camera.pan(26,0):camera.orbit(26,0);
      else if(e.key==='ArrowUp')e.shiftKey?camera.pan(0,-22):camera.orbit(0,-22);
      else if(e.key==='ArrowDown')e.shiftKey?camera.pan(0,22):camera.orbit(0,22);
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
      destroy(){animating=false;if(raf!==null)cancelAnimationFrame(raf);if(idleTimer!==null)clearTimeout(idleTimer);observer?.disconnect();if(typeof document!=='undefined')document.removeEventListener('visibilitychange',onVisibility);painter.destroy();canvas.removeEventListener('keydown',onKey);canvas.removeEventListener('pointerdown',onPointerDown);canvas.removeEventListener('pointermove',onPointerMove);canvas.removeEventListener('pointerup',onPointerUp);canvas.removeEventListener('pointercancel',onPointerUp);canvas.removeEventListener('wheel',onWheel);}, getSceneStats:()=>({faces:world.mesh.length,rails:2,islands:world.islands.length,mainland:true,landmarks:world.landmarks.length,treeCount:world.trees.length,trainProgress:[progressA,progressB],renderedFrames,rendererMetrics:painter.getMetrics()})};
  }
  return {createWorld,compileWorld,trackCurve,makeCamera,layoutLandmarks,clearanceToTracks,trackSegments,pointInPolygon,distanceToPolygonEdge,insideLand,MAINLAND_OUTLINE,LANDMARK_SPECS,ISLAND_DEFINITIONS,sceneConstants:{islands:ISLAND_DEFINITIONS.length+1,LENGTH_METRES:1200,layout:'broad-mainland-with-offshore-mesas'},V,length,dot};
});
