const test=require('node:test');const assert=require('node:assert/strict');const g=require('../game.js');const w=require('../world3d.js');
test('1200mへの到着時間を速度から正しく求める',()=>{assert.equal(g.arrivalMinutes(12),6);assert.equal(g.arrivalMinutes(24),3);assert.equal(g.arrivalMinutes(48),1.5)});
test('同じ速度なら同時に到着',()=>{assert.equal(g.outcome(30,30).success,true);assert.equal(g.outcome(30,30).delay,0)});
test('異なる速度なら先に着く列車が正しい',()=>{assert.equal(g.outcome(42,24).early,'A');assert.equal(g.outcome(12,48).early,'B')});
test('列車は発車前と到着後を範囲内に保つ',()=>{assert.equal(g.positionMetres(24,0),0);assert.equal(g.positionMetres(24,10),1200)});
test('境界以外・刻み以外の速さを拒否',()=>{for(let x of [-2,0,16,50,NaN,Infinity])assert.equal(g.validSpeed(x),false);assert.throws(()=>g.arrivalMinutes(9),RangeError)});
test('同じ世界時刻に両列車の距離が正しく進む',()=>{const s=g.modelAt(24,12,1.5);assert.equal(s.a,600);assert.equal(s.b,300)});
test('曲線の始点終点・接線・弧長が一貫する',()=>{let c=w.trackCurve([[0,0,0],[2,0,1],[4,0,2]]);assert.deepEqual(c.point(0),[0,0,0]);assert.deepEqual(c.point(1),[4,0,2]);assert.ok(c.totalLength>4&&c.totalLength<5);assert.ok(w.length(c.tangent(.5))>0.99)});
test('平地の本島と7つの高い離島、2本の線路で構成される',()=>{const s=w.compileWorld();assert.equal(s.islands.length,8);assert.equal(s.islands[0].shape,'mainland');assert.equal(s.paths.length,2);assert.ok(s.mesh.length>2000);assert.ok(s.mesh.every(m=>m.v.every(v=>v.every(Number.isFinite))))});
test('3Dカメラは斜め見下ろしで画面上の座標に投影できる',()=>{const c=w.makeCamera({width:1280,height:720});const b=c.getBasis();let a=c.project([0,0,0],b),p=c.project([4,0,0],b);assert.ok(Number.isFinite(a.x)&&Number.isFinite(p.y));assert.notEqual(a.x,p.x);c.orbit(30,-12);c.zoomBy(1.2);assert.ok(c.getState().zoom>1)});

test('実際の1,200mと時速の単位変換が一貫する',()=>{
  for(const v of [12,18,24,30,36,42,48]){
    const t=g.arrivalMinutes(v);
    assert.ok(Math.abs(g.positionMetres(v,t)-g.DISTANCE)<1e-7);
    assert.ok(Math.abs(g.positionMetres(v,t/2)-600)<1e-7);
  }
});
test('列車のアニメーションは模型を観察できる速度で進む',()=>{
  assert.ok(g.SIM_MINUTES_PER_SECOND>0 && g.SIM_MINUTES_PER_SECOND<1);
});
test('カメラのリセットはPC・スマホそれぞれの初期倍率に戻る',()=>{
  for(const width of [320,390,768,1280]){
    const camera=w.makeCamera({width,height:800,clientWidth:width});
    const original=camera.getState();
    camera.orbit(250,-130);camera.zoomBy(1.4);camera.reset();
    assert.deepEqual(camera.getState(),original);
  }
});
test('2本の3D線路は最終駅へ到達するまで連続した曲線になる',()=>{
  const scene=w.compileWorld();
  for(const curve of scene.paths){
    assert.ok(curve.totalLength>7);
    let last=curve.point(0);
    for(let i=1;i<=100;i++){
      const p=curve.point(i/100);
      assert.ok(p.every(Number.isFinite));
      assert.ok(w.length([p[0]-last[0],p[1]-last[1],p[2]-last[2]])<curve.totalLength/8);
      last=p;
    }
  }
});

test('速さの比較に使うグラフの横軸は全速度で一定',()=>{
  assert.equal(g.GRAPH_MAX_MINUTES,6);
  for(const speed of [12,18,24,30,36,42,48]){
    assert.ok(g.arrivalMinutes(speed)<=g.GRAPH_MAX_MINUTES);
    assert.ok(g.arrivalMinutes(speed)>0);
  }
  assert.ok(g.positionMetres(48,1)>g.positionMetres(24,1));
});

test('到着時刻後はグラフの距離が1200mで水平になる',()=>{
  const end=g.arrivalMinutes(30);
  assert.equal(g.positionMetres(30,end),1200);
  assert.equal(g.positionMetres(30,end+1),1200);
});

test('3D橋・建物の造形は有限で、描画対象の面が十分にある',()=>{
  const world=w.compileWorld();
  assert.ok(world.mesh.length>7000);
  assert.ok(world.mesh.every(f=>f.v.length>=3 && f.v.every(v=>v.length===3&&v.every(Number.isFinite))));
});


test('建物と風車の全配置は、車体の幅を含む線路安全帯の外側',()=>{
  const scene=w.compileWorld();
  const segments=w.trackSegments(scene.paths,900);
  assert.ok(scene.landmarks.length>=8);
  for(const object of scene.landmarks){
    const measured=w.clearanceToTracks(object.x,object.z,segments);
    const minDistance=object.radius+1.15;
    assert.ok(measured>=minDistance-.025,`${object.id}: track distance ${measured.toFixed(2)}, required ${minDistance.toFixed(2)}`);
    const island=scene.islands.find(i=>i.seed===object.islandSeed);
    assert.ok(island,`${object.id} island exists`);
    assert.ok(w.insideLand(island,object.x,object.z,object.radius+.14),`${object.id}: whole building must rest on grass`);
  }
});

test('木も線路と建物を遮らない位置を自動で選ぶ',()=>{
  const scene=w.compileWorld();
  const segments=w.trackSegments(scene.paths,600);
  assert.ok(scene.trees.length>=40,'scenery should remain richly populated');
  for(const tree of scene.trees){
    assert.ok(w.clearanceToTracks(tree.x,tree.z,segments)>=.50*tree.size+1.05-.025);
    for(const landmark of scene.landmarks){
      assert.ok(Math.hypot(tree.x-landmark.x,tree.z-landmark.z)>=landmark.radius+.53*tree.size+.28-.01);
    }
  }
});

test('本島全域を巡る2本の線路は長く、駅の座標を維持',()=>{
  const scene=w.compileWorld();
  assert.ok(scene.paths[0].totalLength>34);
  assert.ok(scene.paths[1].totalLength>33);
  assert.deepEqual(scene.paths[0].point(1),[-1.4,.99,1.17]);
  assert.deepEqual(scene.paths[1].point(1),[1.52,.98,1.25]);
  assert.equal(w.sceneConstants.islands,8);
});

test('地図を広げて見るためのカメラ移動はリセットできる',()=>{
  const camera=w.makeCamera({width:1280,height:800,clientWidth:1280});
  const original=camera.getState();
  const p0=camera.project([10,0,4],camera.getBasis());
  camera.pan(140,-90);
  const after=camera.getState();
  assert.notDeepEqual(after.target,original.target);
  const p1=camera.project([10,0,4],camera.getBasis());
  assert.notEqual(p0.x,p1.x);
  camera.reset();
  assert.deepEqual(camera.getState(),original);
});


test('広大な本島の全ルートが平地から海へ落ちない',()=>{
  const scene=w.compileWorld(),mainland=scene.islands[0];
  assert.equal(mainland.shape,'mainland');
  for(const [id,route] of scene.paths.entries()){
    let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(let k=0;k<=500;k++){
      const [x,y,z]=route.point(k/500);
      assert.ok(w.insideLand(mainland,x,z,.18),`route ${id} has left the mainland at ${k/500}: (${x.toFixed(2)},${z.toFixed(2)})`);
      assert.ok(Math.abs(y-0.98)<0.03,`route ${id} must remain at the flat railway height`);
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
    }
    assert.ok(maxX-minX>10.5,`route ${id} should use an extensive east-west span`);
    assert.ok(maxZ-minZ>10.0,`route ${id} should use the north-south meadows`);
  }
});

test('高い島は本島から離れた離島になり、建物は本島にも分散する',()=>{
  const scene=w.compileWorld(),mainland=scene.islands[0];
  assert.equal(w.MAINLAND_OUTLINE.length,18);
  assert.equal(scene.islands.length,8);
  for(const island of scene.islands.slice(1)){
    assert.ok(island.y>2.5,'offshore plateau must be raised');
    assert.ok(!w.insideLand(mainland,island.cx,island.cz,.1),'offshore centre cannot overlap mainland');
  }
  const village=scene.landmarks.filter(x=>x.islandSeed===128);
  assert.ok(village.length>=5,'railway town, coast and farm should occupy the mainland');
  assert.ok(village.some(x=>x.x< -5)&&village.some(x=>x.x>5),'homes should cover both western and eastern sides');
});

test('立体地形を細分化して線路の描画抜けを防ぎ、メッシュ数を制限する',()=>{
  const world=w.compileWorld();
  assert.ok(world.mesh.length>=12000,'landscape and train scenery must have sufficient polygons');
  assert.ok(world.mesh.length<23000,'avoid unbounded scenery generation on mobile');
  assert.ok(world.mesh.every(f=>f.v.every(point=>point.every(Number.isFinite))));
  assert.ok(world.trees.length>=70,'wide meadow should contain groves outside railroad clearance');
  assert.equal(w.sceneConstants.layout,'broad-mainland-with-offshore-mesas');
});


test('カメラで遠い離島や平原の端まで移動できる',()=>{
  const c=w.makeCamera({width:1280,height:800,clientWidth:1280});
  c.pan(3000,0);const far=c.getState();
  assert.ok(Math.abs(far.target[0])>10 || Math.abs(far.target[2])>10,'camera must reach outer islands');
  assert.ok(Math.abs(far.target[0])<=20.5 && Math.abs(far.target[2])<=15.8,'camera remains bounded');
  c.reset();assert.deepEqual(c.getState().target,[0,.35,0]);
});
