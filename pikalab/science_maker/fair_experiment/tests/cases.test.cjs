'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = require('../cases.js');
const ROOT = path.resolve(__dirname,'..');

const chapterGroups = ['intro', 'compare', 'advanced'];
const expectedIds = ['plant','sugar','pendulum','ramp','shadow','magnet','sprout','evaporate','rubber'];

test('9事件 × 3ステップ = 27問。IDと並びに重複がない', () => {
  assert.deepEqual(data.validateCases(data.CASES), []);
  assert.deepEqual(data.CASES.map(x => x.id), expectedIds);
  assert.equal(data.CASES.length, 9);
  assert.equal(data.CASES.reduce((sum,c) => sum + c.steps.length,0),27);
  assert.equal(new Set(data.CASES.map(c=>c.order)).size,9);
  assert.deepEqual(data.CASES.map(x => x.order),['01','02','03','04','05','06','07','08','09']);
});

test('画面には3事件ずつ選択できる3つのグループがある', () => {
  for (const chapter of chapterGroups) assert.equal(data.CASES.filter(c=>c.chapter===chapter).length,3);
});

test('すべての選択肢は1つだけ正解し、誤答に説明・2段階ヒントがある', () => {
  for (const item of data.CASES) {
    for (const [index, step] of item.steps.entries()) {
      const options=step.options;
      assert.equal(options.length,3);
      assert.equal(options.filter(option=>data.judgeAnswer(item,index,option.id).correct).length,1);
      assert.equal(step.hints.length,2);
      assert.ok(step.hints.every(h=>h.length>=12), `${item.id}/${step.id}: hints`);
      for (const option of options) {
        const result=data.judgeAnswer(item,index,option.id);
        assert.ok(result.valid);
        assert.ok(result.feedback.length>=10,`${item.id}/${step.id}/${option.id}`);
        assert.ok(option.label.length<55,`${item.id}/${step.id}: long choice`);
      }
    }
  }
});

test('目的に合わせ1条件だけ変更、意図しない1条件だけ修正可能', () => {
  for (const item of data.CASES) {
    const rows=item.observations;
    assert.equal(rows.filter(o=>o.a!==o.b).length,2,item.id);
    assert.equal(rows.filter(o=>o.kind==='changed').length,1,item.id);
    const repairs=rows.filter(o=>o.kind==='mistake');
    assert.equal(repairs.length,1,item.id);
    assert.ok(repairs[0].repairedB);
    const updated=rows.map(o=>({...o,b:o.repairedB??o.b}));
    assert.deepEqual(updated.filter(o=>o.a!==o.b).map(o=>o.kind),['changed'],item.id);
    assert.equal(item.steps[0].answer,repairs[0].id,`${item.id}: stage1 must identify the wrong variable`);
  }
});

test('旧3事件の教材設定と回答は変更しない',()=>{
  const answers={plant:['water','100','height'],sugar:['stirring','10','duration'],pendulum:['weight','50','time']};
  for(const [id,expected] of Object.entries(answers)){
    assert.deepEqual(data.getCase(id).steps.map(s=>s.answer),expected);
  }
});

test('6追加事件は実験計画・結果の測定・限定的な結論を問い分ける',()=>{
  const expected={ramp:['mass','100','time'],shadow:['size','5','shadow'],magnet:['count','5','limited'],sprout:['seed','asagao','count'],evaporate:['water','100','remaining'],rubber:['tension','same','hz']};
  for(const [id,answers] of Object.entries(expected)){
    assert.deepEqual(data.getCase(id).steps.map(s=>s.answer),answers);
  }
  assert.match(data.getCase('magnet').steps[2].description,/仮の結果/);
  assert.match(data.getCase('evaporate').learning,/温度/);
  assert.match(data.getCase('rubber').learning,/模式図/);
});

test('不正な選択、存在しないIDやステップは回答として受け付けない',()=>{
  assert.equal(data.getCase('missing'),null);
  const item=data.getCase('plant');
  assert.equal(data.judgeAnswer(item,0,'__prototype__').valid,false);
  assert.equal(data.judgeAnswer(item,10,'water').valid,false);
  assert.equal(data.judgeAnswer(item,0,null).valid,false);
});

test('事件ID、観察項目IDの重複を拒否する',()=>{
  assert.ok(data.validateCases([data.CASES[0],data.CASES[0]]).length>0);
  const cloned=JSON.parse(JSON.stringify(data.CASES[3]));
  cloned.observations[1].id=cloned.observations[0].id;
  assert.ok(data.validateCases([cloned]).length>0);
});

test('新作画面では飾りテキストを削り、進捗と事件数は正確に表現する',()=>{
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const source=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
  assert.doesNotMatch(html,/PIKALAB ORIGINAL|SCIENCE MYSTERY|THE CASE FILES|A LITTLE SCIENCE SECRET|約3分|EXCELLENT DETECTIVE WORK/);
  assert.match(html,/id="caseChapters"/);
  assert.match(html,/id="completedCount"/);
  assert.match(source,/renderChapters/);
  assert.match(source,/comparison-board|compare-row/);
  assert.match(source,/saveSolved/);
});

test('教育ページに広告・外部解析・実行時CSS CDNがない',()=>{
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  assert.doesNotMatch(html,/googletagmanager|googlesyndication|doubleclick|tailwindcss\.com|cdn\.jsdelivr|analytics\.js|https:\/\/.*\.js/i);
  assert.match(html,/content="noindex,nofollow"/);
});
