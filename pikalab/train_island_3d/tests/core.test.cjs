const test=require('node:test');const assert=require('node:assert/strict');const g=require('../game.js');const w=require('../world3d.js');
test('1200mへの到着時間を速度から正しく求める',()=>{assert.equal(g.arrivalMinutes(12),6);assert.equal(g.arrivalMinutes(24),3);assert.equal(g.arrivalMinutes(48),1.5)});
test('同じ速度なら同時に到着',()=>{assert.equal(g.outcome(30,30).success,true);assert.equal(g.outcome(30,30).delay,0)});
test('異なる速度なら先に着く列車が正しい',()=>{assert.equal(g.outcome(42,24).early,'A');assert.equal(g.outcome(12,48).early,'B')});
test('列車は発車前と到着後を範囲内に保つ',()=>{assert.equal(g.positionMetres(24,0),0);assert.equal(g.positionMetres(24,10),1200)});
test('境界以外・刻み以外の速さを拒否',()=>{for(let x of [-2,0,16,50,NaN,Infinity])assert.equal(g.validSpeed(x),false);assert.throws(()=>g.arrivalMinutes(9),RangeError)});
test('同じ世界時刻に両列車の距離が正しく進む',()=>{const s=g.modelAt(24,12,1.5);assert.equal(s.a,600);assert.equal(s.b,300)});
test('曲線の始点終点・接線・弧長が一貫する',()=>{let c=w.trackCurve([[0,0,0],[2,0,1],[4,0,2]]);assert.deepEqual(c.point(0),[0,0,0]);assert.deepEqual(c.point(1),[4,0,2]);assert.ok(c.totalLength>4&&c.totalLength<5);assert.ok(w.length(c.tangent(.5))>0.99)});
test('島は9つの3D立体島と2本の線路で構成される',()=>{const s=w.compileWorld();assert.equal(s.islands.length,9);assert.equal(s.paths.length,2);assert.ok(s.mesh.length>2000);assert.ok(s.mesh.every(m=>m.v.every(v=>v.every(Number.isFinite))))});
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
