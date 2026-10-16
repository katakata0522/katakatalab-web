'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('../game-core.js');
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol, `${a} vs ${b}`);

test('3ミッションを一意に定義し、操作変数は各1つ',()=>{
 assert.equal(c.MISSIONS.length,3);
 assert.equal(new Set(c.MISSIONS.map(x=>x.id)).size,3);
 for(const m of c.MISSIONS){assert.ok(m.choices.includes(m.initial));assert.equal(m.choices.length>=5,true);}
});
test('AとBは常に線路上、両端へ進む',()=>{
 const m=c.MISSIONS[0];const cfg=c.configForMission(m,12);
 assert.deepEqual(c.position(cfg,0),{a:0,b:1200});
 near(c.position(cfg,2).a,800);near(c.position(cfg,2).b,800);
 const end=c.position(cfg,200); assert.deepEqual(end,{a:1200,b:0});
});
test('問題1: 不正解では東800m、正解24km/hで中央600m/1.5分',()=>{
 const m=c.MISSIONS[0];const fail=c.outcome(m,12),good=c.outcome(m,24);
 near(fail.meet.place,800);assert.equal(fail.success,false);
 near(good.meet.place,600);near(good.meet.time,1.5);assert.equal(good.success,true);
});
test('問題2: 遅延1.5分で中央駅、経過3分',()=>{
 const m=c.MISSIONS[1];const fail=c.outcome(m,0),good=c.outcome(m,1.5);
 near(fail.meet.place,400);near(good.meet.place,600);
 near(good.meet.time,3);assert.equal(good.success,true);
 const before=c.position(good.params,1.25);near(before.b,1200);
});
test('問題3: Aを24km/hにすると800m地点、2分で会う',()=>{
 const m=c.MISSIONS[2]; const fail=c.outcome(m,12); const good=c.outcome(m,24);
 near(fail.meet.place,600);near(good.meet.place,800);near(good.meet.time,2);assert.equal(good.success,true);
});
test('変更可能な離散値だけを受け付ける',()=>{
 assert.throws(()=>c.configForMission(c.MISSIONS[0],23),RangeError);
 assert.throws(()=>c.configForMission(c.MISSIONS[1],-1),RangeError);
 assert.throws(()=>c.configForMission(c.MISSIONS[1],NaN),RangeError);
 assert.throws(()=>c.configForMission(c.MISSIONS[2],1000),RangeError);
});
test('発車時刻以降は位置が単調に推移し、出会い点は両車で一致',()=>{
 for(const m of c.MISSIONS)for(const value of m.choices){
  const o=c.outcome(m,value); near(c.position(o.params,o.meet.time).a,c.position(o.params,o.meet.time).b);
  let prevA=0,prevB=1200;
  for(let t=0;t<=8;t+=.125){const p=c.position(o.params,t);assert.ok(p.a>=prevA-1e-8&&p.b<=prevB+1e-8);prevA=p.a;prevB=p.b;}
 }
});
test('境界：先に片方が駅へ到着しても正しい場所で出会う',()=>{
 const o=c.calculateMeeting({aSpeed:24,bSpeed:24,delayA:0,delayB:6});
 near(o.time,3); near(o.place,1200);
});
test('入力の不正値を拒否',()=>{
 assert.throws(()=>c.position({aSpeed:0,bSpeed:24,delayA:0,delayB:0},0),TypeError);
 assert.throws(()=>c.position({aSpeed:24,bSpeed:24,delayA:0,delayB:0},Infinity),TypeError);
});
