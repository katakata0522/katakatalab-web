'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const game=fs.readFileSync(path.join(root,'game.js'),'utf8');

test('1画面の列車・グラフ・操作と見出しは全て一意',()=>{
  for(const name of ['worldCanvas','gameControls','startButton','speedA','speedB','result','graphCard','timeGraph','toggleGraph','closeGraph']){
    assert.equal((html.match(new RegExp(`id="${name}"`,'g'))||[]).length,1,name);
  }
  assert.equal((html.match(/id="startButton"/g)||[]).length,1);
  assert.ok(html.includes('class="play-layout"'));
  assert.ok(html.includes('aria-controls="graphCard" aria-expanded="false"'));
});

test('再挑戦は主ボタンにまとめ、スクロール先への往復を強制しない',()=>{
  assert.ok(!html.includes('id="againButton"'));
  assert.ok(!game.includes('scrollIntoView'));
  assert.ok(game.includes("state.finished?'もう一度走らせる'"));
  assert.ok(game.includes('setGraphOpen'));
});

test('デスクトップとスマホの画面・グラフに専用のレイアウト',()=>{
  assert.ok(css.includes('grid-template-columns:minmax(0,1fr) clamp(358px,32vw,444px)'));
  assert.ok(css.includes('@media(min-width:980px) and (min-height:650px)'));
  assert.ok(css.includes('.app-shell.graph-open .graph-card'));
  assert.ok(css.includes('height:100svh'));
});

test('教育画面に広告・解析・ネットワーク依存を含まない',()=>{
  for(const raw of [html,css,game]){
    const s=raw.replaceAll("http://www.w3.org/2000/svg", ""); // An XML namespace is not a network request.
    for(const forbidden of ['googletagmanager','google-analytics','adsbygoogle','doubleclick.net','cdn.tailwindcss','http://','https://']){
      assert.ok(!s.includes(forbidden),forbidden);
    }
  }
  assert.ok(html.includes("connect-src 'none'"));
});
