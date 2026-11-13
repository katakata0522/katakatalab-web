const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./StageTextAndReveal-C0BnZD9M.js","./rolldown-runtime-WkwZ5CU-.js","./vendor-icons-D-_THepi.js","./vendor-react-BUCC-DA6.js","./StageNavAndTabs-DpXJ9B6Y.js","./StageSearchMicroLayout--G2ehlWL.js","./scrollAnim-DFyjiKmW.js","./StageHeaderFooter-DZ-f20pn.js","./StageHeaderFooterExtended-D7WQcDCg.js","./StageTextNavExtended-CQ3x623q.js","./StageMonetizeGuidesExtended-D7K_rInG.js","./StageCreativeCraft-BCiWJz10.js","./StageCarousel-DBckfGJ7.js","./StageConversionUi-DO8qVfjg.js"])))=>i.map(i=>d[i]);
import{n as e}from"./rolldown-runtime-WkwZ5CU-.js";import{B as t,E as n,F as r,O as i,P as a,R as o,S as s,_ as c,a as l,c as u,d,i as f,m as p,p as m,r as ee,t as te,u as h,w as g,z as _}from"./vendor-icons-D-_THepi.js";import{n as v,t as y}from"./vendor-react-BUCC-DA6.js";(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var b=e(t(),1),x=v(),S=Object.freeze([`smooth`,`snappy`,`spring`]);function C(e,t){return typeof e!=`string`||t<=0?``:e.replace(/[\u0000-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g,``).slice(0,t)}function w(e,t,n,r,i=t){let a=Math.min(n,Math.max(t,Number.isFinite(e)?e:i)),o=(r.toString().split(`.`)[1]??``).length;return Number(a.toFixed(o))}function T(e,t=`smooth`){return typeof e==`string`&&S.includes(e)?e:S.includes(t)?t:`smooth`}function E(e,t){return{duration:w(t.duration??e.defaultDuration,e.durationRange.min,e.durationRange.max,e.durationRange.step,e.defaultDuration),distance:e.secondarySlider?w(t.distance??e.secondarySlider.defaultValue,e.secondarySlider.min,e.secondarySlider.max,e.secondarySlider.step,e.secondarySlider.defaultValue):0,easing:T(t.easing,e.defaultEasing)}}var D=Object.freeze({smooth:Object.freeze({id:`smooth`,label:`なめらか`,css:`cubic-bezier(0.22, 1, 0.36, 1)`,description:`最初が速く、止まる直前にスッと減速する上品なカーブ`}),snappy:Object.freeze({id:`snappy`,label:`キビキビ`,css:`cubic-bezier(0.16, 1, 0.3, 1)`,description:`反応が早く、小気味よくピタッと止まる実務向けカーブ`}),spring:Object.freeze({id:`spring`,label:`少し弾む`,css:`cubic-bezier(0.34, 1.45, 0.64, 1)`,description:`終点を少しだけ行き過ぎて戻る、親しみのあるバネ感`})}),O=Object.freeze([Object.freeze({id:`text`,code:`01`,label:`文字の動き`,shortLabel:`文字`,description:`見出しやキャッチコピーを印象的に登場させるテキスト表現`}),Object.freeze({id:`reveal`,code:`02`,label:`箱・カードの出現`,shortLabel:`出現`,description:`写真・カード・記事ブロックを違和感なく画面に迎え入れる動き`}),Object.freeze({id:`nav`,code:`03`,label:`ハンバーガー・メニュー`,shortLabel:`メニュー`,description:`ボタンを押したときのメニューの開き方・画面の覆い方`}),Object.freeze({id:`tabs`,code:`04`,label:`タブ・切り替え`,shortLabel:`タブ`,description:`選択中の目印の動かし方と、中身の切り替え体験`}),Object.freeze({id:`search`,code:`05`,label:`検索UIの置き方`,shortLabel:`検索UI`,description:`虫眼鏡1個から全面透かし文字まで、検索窓の配置と振る舞い`}),Object.freeze({id:`micro`,code:`06`,label:`ボタン・ホバー反応`,shortLabel:`反応`,description:`押した感覚やカーソルに反応する小さな手触り（マイクロインタラクション）`}),Object.freeze({id:`layout`,code:`07`,label:`立て付け・スクロール・待機`,shortLabel:`立て付け`,description:`ページ全体のレイアウト構造、スクロール連動、待機・通知表現`}),Object.freeze({id:`header`,code:`08`,label:`ヘッダー（頭・リンク表現）`,shortLabel:`ヘッダー`,description:`サイトの看板であるヘッダー構造と、クリック・ホバー時のリンク表現違い`}),Object.freeze({id:`footer`,code:`09`,label:`フッター（足・着地）`,shortLabel:`フッター`,description:`サイトマップ型・超軽量1行・登録欄付き・CTA一体・幕上がり等の足元設計`}),Object.freeze({id:`craft`,code:`10`,label:`独創仕掛け・数値・目次`,shortLabel:`独創仕掛け`,description:`カード裏返し・ビフォーアフター比較・数値カウント・追従目次などの見せ場ギミック`}),Object.freeze({id:`carousel`,code:`11`,label:`カルーセル・ギャラリー`,shortLabel:`カルーセル`,description:`横に送るサムネイル・チラ見せスライダー・拡大ライトボックス・重ねカードめくり`}),Object.freeze({id:`pricing`,code:`12`,label:`料金・比較（マネタイズ）`,shortLabel:`料金・比較`,description:`プラン比較・○×表・月額/年額スイッチ・利用量計算など契約判断を助ける設計`}),Object.freeze({id:`forms`,code:`13`,label:`フォーム・操作反応`,shortLabel:`フォーム`,description:`送信状態変化・ラベル移動・エラー揺れ・ステップ進捗・ファイル投入の手触り`}),Object.freeze({id:`guides`,code:`14`,label:`案内・戻る・状態ページ`,shortLabel:`案内・戻る`,description:`TOPへ戻る4形態・お知らせ帯・ツールチップ・空状態・2段階確認などの気配りUI`})]);function k(e){let t=D[e.params.easing],n=C(e.targetNote??``,160).trim()||`（ここに適用したい場所を入力：例・トップページの見出し／ヘッダー／商品一覧）`,r=[];return e.isStatic?r.push(`- 動きの有無: なし（静的配置・レスポンシブ構造重視）`):r.push(`- 所要時間: ${e.params.duration.toFixed(2)}秒`),e.secondaryLabel&&r.push(`- ${e.secondaryLabel}: ${e.params.distance}${e.secondaryUnit??``}`),e.isStatic||r.push(`- 動きの質感: ${t.label}（CSS: ${t.css}）`),[`次のWebアニメーション／UI表現を、私のサイトに実装してください。`,``,`■ 適用したい場所`,n,``,`■ やりたい動き・見せ方（${e.name}）`,e.goal,``,`■ パラメータ・構成指定`,...r,``,`■ 裏側の仕組み（実装方式）`,e.mechanism,``,`■ 実装時の注意点`,...e.requirements.map(e=>`- ${e}`),...e.isStatic?[]:[`- OSの「視差効果を減らす（prefers-reduced-motion: reduce）」が有効な場合は過度な移動を控えてください`]].join(`
`)}async function A(e){if(!e)return!1;if(navigator.clipboard&&window.isSecureContext)try{return await navigator.clipboard.writeText(e),!0}catch{}let t=document.activeElement instanceof HTMLElement?document.activeElement:null,n=document.createElement(`textarea`);try{return n.value=e,n.setAttribute(`readonly`,``),n.setAttribute(`aria-hidden`,`true`),n.style.position=`fixed`,n.style.top=`-9999px`,n.style.left=`-9999px`,n.style.opacity=`0`,document.body.appendChild(n),n.select(),document.execCommand(`copy`)}catch{return!1}finally{n.parentNode&&n.parentNode.removeChild(n),t?.focus?.()}}var j=[{id:`text-mask-slide-up`,category:`text`,title:`下からぐっと出現（マスク・スライドアップ）`,subtitle:`見出しやタイトルが、見えない境界線の下からせり上がって現れる王道表現`,mechanismTag:`overflow: hidden + translateY`,xRayCaption:`オレンジ点線枠（overflow: hidden）の外から文字を押し上げています`,defaultDuration:.75,durationRange:{min:.25,max:2.5,step:.05},secondarySlider:{label:`押し上げ距離`,unit:`px`,min:16,max:90,step:2,defaultValue:44},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① 見えない切り抜き箱を用意する`,detail:`文字を囲む親ボックスに「枠からはみ出た部分を隠す」設定をかけます。これが種明かしの正体です。`,codeHint:`overflow: hidden`},{title:`② 最初は枠の真下に文字を待機させる`,detail:`文字そのものを指定ピクセルだけ下へずらし、親ボックスの切り抜きラインの外に隠しておきます。`,codeHint:`transform: translateY(44px)`},{title:`③ 一気に定位置（0px）へ滑らせる`,detail:`後半ほどゆっくり減速するカーブで元の位置へ戻すと、何もない場所から文字がせり上がったように見えます。`,codeHint:`translateY(0)`}],keywords:[`下から`,`文字`,`せり上がる`,`見出し`,`マスク`,`slide up`,`reveal`],buildPrompt:(e,t)=>k({name:`下からぐっと出現（マスク・スライドアップ）`,goal:`見出しテキストが見えない水平ラインの下からスッとせり上がって登場する動きにしたいです。`,mechanism:`親要素に overflow: hidden を設定して切り抜き枠を作り、子要素のテキストを初期状態で translateY(${e.distance}px) と opacity: 0 に配置してから、translateY(0) と opacity: 1 へアニメーションさせます。`,requirements:[`レイアウトのガタつきを防ぐため、margin ではなく GPU負荷の軽い transform と opacity のみで動かしてください`,`文字の下部（g や y などのディセンダ）が切れないよう親要素に少し余白（padding-bottom）を持たせてください`],params:e,secondaryLabel:`押し上げ距離`,secondaryUnit:`px`,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="reveal-mask">
  <h2 class="reveal-text">伝わるデザインは、動きから。</h2>
</div>

<style>
.reveal-mask {
  overflow: hidden;
  padding-bottom: 4px;
}

.reveal-text {
  margin: 0;
  animation: maskSlideUp ${e.duration.toFixed(2)}s ${t} both;
}

@keyframes maskSlideUp {
  from {
    opacity: 0;
    transform: translate3d(0, ${e.distance}px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal-text {
    animation: none;
  }
}
</style>`}},{id:`text-sweep-left-to-right`,category:`text`,title:`左から右へ流れる登場（ワイプ出現）`,subtitle:`カーテンを右へ開けるように、文字の左端から順にくっきり現れる動き`,mechanismTag:`clip-path + translateX`,xRayCaption:`最初は右端100%を隠した切り抜き窓（clip-path）を左から右へ開いています`,defaultDuration:.95,durationRange:{min:.3,max:2.8,step:.05},secondarySlider:{label:`横スライド幅`,unit:`px`,min:0,max:80,step:4,defaultValue:32},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① 右側を100%切り抜いて隠す`,detail:`要素の上下左右をトリミングできる CSS の「切り抜き窓」を使い、右側から100%分を覆い隠します。`,codeHint:`clip-path: inset(0 100% 0 0)`},{title:`② 少し左側にオフセットしておく`,detail:`同時に文字全体を少しだけ左へ寄せておくと、「左から流れ込んでくる」勢いが自然に加わります。`,codeHint:`translateX(-32px)`},{title:`③ 切り抜き窓を0%にして全開にする`,detail:`右側の切り抜き量を 100% → 0% へ減らしながら定位置へ戻すことで、インクが走るように文字が現れます。`,codeHint:`clip-path: inset(0 0 0 0)`}],keywords:[`左から右`,`流れる`,`ワイプ`,`clip-path`,`文字`,`横`],buildPrompt:(e,t)=>k({name:`左から右へ流れる登場（ワイプ出現）`,goal:`文字が左から右へカーテンが開くようにスッと流れながら現れる動きにしたいです。`,mechanism:`clip-path: inset(0 100% 0 0) と translateX(-${e.distance}px) の状態から、clip-path: inset(0 0 0 0) と translateX(0) へ変化させます。`,requirements:[`親要素の横幅が不自然に伸びないよう、元の横幅を確保したまま clip-path で切り抜いてください`,`文字が途中で欠けないよう inline-block または block 要素に適用してください`],params:e,secondaryLabel:`横スライド幅`,secondaryUnit:`px`,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<p class="sweep-text">左から右へ、言葉が流れ込む。</p>

<style>
.sweep-text {
  display: inline-block;
  margin: 0;
  animation: sweepRight ${e.duration.toFixed(2)}s ${t} both;
}

@keyframes sweepRight {
  0% {
    opacity: 0.25;
    transform: translate3d(-${e.distance}px, 0, 0);
    clip-path: inset(0 100% 0 0);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    clip-path: inset(0 0 0 0);
  }
}
</style>`}},{id:`text-stagger-chars`,category:`text`,title:`1文字ずつ波打つ連鎖（スタガー）`,subtitle:`テキストを1文字ずつバラして、少しだけ時間をずらしながら順番に浮かび上げる`,mechanismTag:`span分割 + animation-delay`,xRayCaption:`各文字を別々の箱（span）に分け、開始時刻だけを少しずつ遅らせています`,defaultDuration:.65,durationRange:{min:.2,max:2.5,step:.05},secondarySlider:{label:`文字間のズレ`,unit:`ms`,min:20,max:250,step:5,defaultValue:75},defaultEasing:`spring`,hasEasingControl:!0,steps:[{title:`① 文を1文字ずつの要素に分ける`,detail:`見た目上は1行の文章ですが、裏側では「あ」「い」「う」…と1文字ごとに独立した箱に入れています。`,codeHint:`<span>文</span><span>字</span>`},{title:`② 同じアニメーションに時間差をつける`,detail:`動き自体は全員同じ「下から少し浮き上がる」だけ。何番目かに応じて待ち時間だけをずらします。`,codeHint:`animation-delay: calc(var(--i) * 75ms)`},{title:`③ スクリーンリーダーにも配慮する`,detail:`音声読み上げが1文字ずつバラバラに読まないよう、見た目用要素と読み上げ用テキストの配慮を添えます。`,codeHint:`aria-label / aria-hidden`}],keywords:[`1文字ずつ`,`順番`,`スタガー`,`波`,`パラパラ`,`文字`],buildPrompt:(e,t)=>k({name:`1文字ずつ波打つ連鎖（スタガー）`,goal:`見出しの文字が1文字ずつリズムよく順番に下からポンッと現れるようにしたいです。`,mechanism:`テキストを1文字ずつ inline-block の <span> に分割し、インデックス番号 --i に応じて animation-delay: calc(var(--i) * ${e.distance}ms) を設定して出現アニメーションさせます。`,requirements:[`半角スペースが潰れないよう white-space: pre を使ってください`,`スクリーンリーダーで1文字ずつ読み上げられないよう、親に aria-label を付けて各 span には aria-hidden="true" を付けてください`],params:e,secondaryLabel:`文字間のズレ`,secondaryUnit:`ms`,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<h2 class="stagger-title" aria-label="リズムで伝える言葉">
  <span style="--i:0" aria-hidden="true">リ</span>
  <span style="--i:1" aria-hidden="true">ズ</span>
  <span style="--i:2" aria-hidden="true">ム</span>
  <span style="--i:3" aria-hidden="true">で</span>
  <span style="--i:4" aria-hidden="true">伝</span>
  <span style="--i:5" aria-hidden="true">え</span>
  <span style="--i:6" aria-hidden="true">る</span>
</h2>

<style>
.stagger-title span {
  display: inline-block;
  white-space: pre;
  animation: charRise ${e.duration.toFixed(2)}s ${t} both;
  animation-delay: calc(var(--i) * ${e.distance}ms);
}

@keyframes charRise {
  from {
    opacity: 0;
    transform: translate3d(0, 24px, 0) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
</style>`}},{id:`text-typewriter`,category:`text`,title:`タイプライター打鍵（1文字ずつ打ち込む）`,subtitle:`誰かが今キーボードで入力しているようなライブ感と物語性を出す表現`,mechanismTag:`文字列スライス + 点滅カーソル`,xRayCaption:`文字数カウントを1つずつ増やしながら、右端に点滅する縦線カーソルを表示しています`,defaultDuration:1.8,durationRange:{min:.5,max:4.5,step:.1},secondarySlider:{label:`余白カーソル幅`,unit:`px`,min:2,max:6,step:1,defaultValue:3},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 表示する文字数を0から少しずつ増やす`,detail:`全文をあらかじめ持っておき、一定間隔のタイマーで「最初からN文字目まで」を切り出して表示します。`,codeHint:`text.slice(0, count)`},{title:`② 右端に細い縦線カーソルを置く`,detail:`文字のすぐ右に border-right や疑似要素で細い線を置き、0.8秒周期で点滅させます。`,codeHint:`animation: blink 0.8s step-end infinite`},{title:`③ 改行ガタつきを抑える`,detail:`途中で複数行に折り返してガタつかないよう、最小の高さをあらかじめ確保しておくと安定します。`,codeHint:`min-height`}],keywords:[`タイプライター`,`タイピング`,`カーソル`,`1文字ずつ`,`打ち込み`],buildPrompt:(e,t)=>k({name:`タイプライター打鍵（1文字ずつ打ち込む）`,goal:`キャッチコピーやAIの返答メッセージが、目の前で1文字ずつタイプされているように表示したいです。`,mechanism:`合計 ${e.duration.toFixed(2)}秒かけて文字列の先頭から1文字ずつ slice() で表示文字数を増やし、末尾に幅 ${e.distance}px の点滅カーソルを表示します。`,requirements:[`日本語（全角文字）でも綺麗に動くよう CSS の ch 単位ではなく JS の文字数カウント（Array.from でサロゲートペア対応）で制御してください`,`再表示する際は前回のタイマーを必ず clearInterval / clearTimeout してください`],params:e,secondaryLabel:`カーソル線幅`,secondaryUnit:`px`,targetNote:t}),buildCode:e=>`<p class="typewriter-line">
  <span id="typeTarget"></span><span class="type-caret" aria-hidden="true"></span>
</p>

<style>
.type-caret {
  display: inline-block;
  width: ${e.distance}px;
  height: 1.1em;
  margin-left: 3px;
  vertical-align: text-bottom;
  background: #2563eb;
  animation: caretBlink 0.8s step-end infinite;
}

@keyframes caretBlink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
</style>

<script>
(() => {
  const message = "アイデアを、そのまま動きにする。";
  const chars = Array.from(message);
  const target = document.getElementById("typeTarget");
  if (!target) return;

  const stepMs = Math.max(16, Math.round((${e.duration.toFixed(2)} * 1000) / chars.length));
  let index = 0;
  const timer = setInterval(() => {
    index += 1;
    target.textContent = chars.slice(0, index).join("");
    if (index >= chars.length) clearInterval(timer);
  }, stepMs);
})();
<\/script>`},{id:`text-marker-highlight`,category:`text`,title:`蛍光マーカーが左から引かれる`,subtitle:`注目してほしいキーワードの背後に、ペンで線を引くように色の帯が伸びる演出`,mechanismTag:`::before + scaleX(0→1)`,xRayCaption:`文字の背面（z-index: -1）に置いた色帯の横幅倍率を 0%→100% に伸ばしています`,defaultDuration:.7,durationRange:{min:.2,max:2.5,step:.05},secondarySlider:{label:`帯の高さ`,unit:`%`,min:20,max:100,step:5,defaultValue:45},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① 文字の下敷き用レイヤーを作る`,detail:`強調したい文字の後ろ（背面レイヤー）に、半透明の黄色や青の四角い帯を敷きます。`,codeHint:`z-index: -1 / position: absolute`},{title:`② 左端をピン留めして横幅0に縮める`,detail:`伸び始める基準点を「左端（left）」に固定し、横方向の倍率を 0（見えない状態）にしておきます。`,codeHint:`transform-origin: left; transform: scaleX(0)`},{title:`③ 倍率を1に戻して線を引く`,detail:`横倍率を 0 → 1 へ戻すと、まるで人の手が左から蛍光ペンを引いたような自然な強調になります。`,codeHint:`transform: scaleX(1)`}],keywords:[`マーカー`,`下線`,`ハイライト`,`強調`,`左から右`,`ペン`],buildPrompt:(e,t)=>k({name:`蛍光マーカーが左から引かれる`,goal:`重要なキーワードの後ろに、左から右へ蛍光ペンで線を引くようなハイライト帯をつけたいです。`,mechanism:`対象テキストを position: relative; z-index: 1 にし、背面に配置した帯（高さ ${e.distance}%）を transform-origin: left center で scaleX(0) から scaleX(1) へアニメーションさせます。`,requirements:[`width ではなく scaleX で伸ばすことで描画パフォーマンスを軽く保ってください`,`文字と背景帯のコントラストが落ちないよう淡い背景色（例: rgba(253, 224, 71, 0.55)）を使ってください`],params:e,secondaryLabel:`帯の高さ`,secondaryUnit:`%`,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<p class="lead">
  大事な場所だけを、<span class="marker-word">直感的に強調</span>します。
</p>

<style>
.marker-word {
  position: relative;
  z-index: 1;
  display: inline-block;
  padding: 0 4px;
}

.marker-word::before {
  content: "";
  position: absolute;
  left: 0;
  bottom: 2px;
  width: 100%;
  height: ${e.distance}%;
  background: rgba(253, 224, 71, 0.65);
  border-radius: 3px;
  z-index: -1;
  transform-origin: left center;
  animation: markerDraw ${e.duration.toFixed(2)}s ${t} both;
}

@keyframes markerDraw {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
</style>`}},{id:`reveal-fade-lift`,category:`reveal`,title:`ふわっと浮き上がり（フェード＋リフト）`,subtitle:`写真やカードが、少し下から浮かび上がりながら優しく輪郭を表す基本モーション`,mechanismTag:`opacity + translateY + scale`,xRayCaption:`薄い点線位置から少し拡大しつつ上方向へスッと持ち上げています`,defaultDuration:.75,durationRange:{min:.25,max:2.5,step:.05},secondarySlider:{label:`浮き上がり量`,unit:`px`,min:8,max:72,step:4,defaultValue:28},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① 透明・少し下・わずかに小さめで待機`,detail:`いきなり100%出現させるのではなく、97%サイズで28px下に控えておくと角が取れた印象になります。`,codeHint:`opacity: 0; scale(0.97)`},{title:`② 移動と透明度を同時に変化させる`,detail:`透明度を上げつつ元の位置（0px, 100%サイズ）へ引き上げることで「浮かび上がる」質感が生まれます。`,codeHint:`translateY(0) scale(1)`},{title:`③ スクロール連動と相性抜群`,detail:`画面に入った瞬間を IntersectionObserver で検知してこのクラスを付けるのが現場の定番です。`,codeHint:`IntersectionObserver`}],keywords:[`ふわっと`,`カード`,`フェード`,`浮き上がり`,`出現`,`スクロール`],buildPrompt:(e,t)=>k({name:`ふわっと浮き上がり（フェード＋リフト）`,goal:`カードや画像ブロックが画面に現れる際、少し下からふわっと浮かび上がる自然な出現にしたいです。`,mechanism:`opacity: 0, transform: translateY(${e.distance}px) scale(0.97) から opacity: 1, translateY(0) scale(1) へ遷移させます。`,requirements:[`移動距離を大きくしすぎると重たく見えるため、現在の指定距離前後を保ってください`,`スクロールで表示される要素の場合は IntersectionObserver（threshold: 0.15）と組み合わせて一度だけ再生してください`],params:e,secondaryLabel:`浮き上がり量`,secondaryUnit:`px`,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="fade-lift-card">
  <h3>すっきり浮かぶカード</h3>
  <p>視覚的な引っかかりを抑えた上品な出現です。</p>
</div>

<style>
.fade-lift-card {
  animation: fadeLift ${e.duration.toFixed(2)}s ${t} both;
}

@keyframes fadeLift {
  from {
    opacity: 0;
    transform: translate3d(0, ${e.distance}px, 0) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
</style>`}},{id:`reveal-curtain-block`,category:`reveal`,title:`色幕めくり出現（リビールブロック）`,subtitle:`色のついた幕が横切ってからスッと引き、その裏から中身が顔を出す演出`,mechanismTag:`2段階 scaleX + transform-origin切替`,xRayCaption:`前半で左端から幕が伸び（0→1）、折り返しで右端支点に切り替えて縮んでいます（1→0）`,defaultDuration:1.1,durationRange:{min:.4,max:3,step:.05},defaultEasing:`snappy`,hasEasingControl:!0,steps:[{title:`① 前半：左から幕を伸ばして覆う`,detail:`最初の45%の時間で、色つきの長方形幕を左端から右端へ100%の幅まで一気に伸ばします。`,codeHint:`origin: left; scaleX: 0 → 1`},{title:`② 折り返し：隠れていた中身をオンにする`,detail:`幕が画面を完全に覆った瞬間に、裏にある文字や画像の透明度を 0 → 1 へ切り替えます。`,codeHint:`opacity: 0 → 1`},{title:`③ 後半：基準点を右へ移して幕を抜く`,detail:`伸び縮みの基準点を「左」から「右」に切り替え、幕を縮めることで右方向へ抜けていく動きになります。`,codeHint:`origin: right; scaleX: 1 → 0`}],keywords:[`カーテン`,`幕`,`ブロック`,`リビール`,`めくり`,`ブランド`],buildPrompt:(e,t)=>k({name:`色幕めくり出現（リビールブロック）`,goal:`アクセント色の幕が左から走って領域を覆った直後、右へ抜けると同時に中の要素が現れる演出にしたいです。`,mechanism:`前面の ::after 幕を前半で transform-origin: left の scaleX(0→1) で広げ、中間のタイミングで中の要素を opacity: 1 にし、後半で transform-origin: right に切り替えて scaleX(1→0) で消します。`,requirements:[`幕が完全に閉じた瞬間（45%付近）に中身が切り替わるようにキーフレームを調整してください`,`要素の外へ幕が飛び出さないよう overflow: hidden を指定してください`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="curtain-box">
  <span class="curtain-content">BRAND CONCEPT 2026</span>
</div>

<style>
.curtain-box {
  position: relative;
  display: inline-block;
  overflow: hidden;
  padding: 12px 20px;
}

.curtain-content {
  display: inline-block;
  font-weight: 700;
  animation: curtainShow ${e.duration.toFixed(2)}s linear both;
}

.curtain-box::after {
  content: "";
  position: absolute;
  inset: 0;
  background: #2563eb;
  animation: curtainSlide ${e.duration.toFixed(2)}s ${t} both;
}

@keyframes curtainShow {
  0%, 44% { opacity: 0; }
  45%, 100% { opacity: 1; }
}

@keyframes curtainSlide {
  0% { transform-origin: left center; transform: scaleX(0); }
  45% { transform-origin: left center; transform: scaleX(1); }
  46% { transform-origin: right center; transform: scaleX(1); }
  100% { transform-origin: right center; transform: scaleX(0); }
}
</style>`}},{id:`reveal-stagger-grid`,category:`reveal`,title:`カード連鎖スタガー登場`,subtitle:`一覧の複数カードが「タタタン」と心地よいリズムで順番に揃う構造`,mechanismTag:`CSS変数 --i × 遅延時間`,xRayCaption:`各カードに番号（0, 1, 2, 3）を振り、待機時間だけを掛け算でずらしています`,defaultDuration:.55,durationRange:{min:.2,max:2.5,step:.05},secondarySlider:{label:`カード間のズレ`,unit:`ms`,min:40,max:600,step:20,defaultValue:220},defaultEasing:`snappy`,hasEasingControl:!0,steps:[{title:`① 同じ出現クラスを全カードに貼る`,detail:`動きのレシピ自体は1つだけ作ります。4枚あっても別々のアニメーションを書く必要はありません。`,codeHint:`.stagger-item`},{title:`② 何枚目かを表す番号だけ渡す`,detail:`各カードにカスタム変数で 0, 1, 2, 3 と順番を持たせ、待ち時間に掛け算します。`,codeHint:`delay: calc(var(--i) * 220ms)`},{title:`③ 1枚ずつ区切って見せるリズム`,detail:`1枚あたり 180〜240ms ほど間を取ると、塊ではなく「1・2・3・4」と心地よく分離して届きます。`,codeHint:`180ms〜240ms推奨`}],keywords:[`カード`,`グリッド`,`一覧`,`順番`,`スタガー`,`連鎖`],buildPrompt:(e,t)=>k({name:`カード連鎖スタガー登場`,goal:`並ぶ複数のカードが同時にパッと出るのではなく、左上から順に小気味よく連鎖して現れるようにしたいです。`,mechanism:`各カード要素に style="--i: 0, 1, 2..." を与え、animation-delay: calc(var(--i) * ${e.distance}ms) で時間差出現させます。`,requirements:[`カード数が多い場合に最後のカードが遅くなりすぎないよう、最大遅延に上限（例: 6枚目以降はリセット）を設けてください`,`レイアウトが崩れないよう transform と opacity のみ変化させてください`],params:e,secondaryLabel:`カード間のズレ`,secondaryUnit:`ms`,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="card-grid">
  <div class="grid-card" style="--i:0">01</div>
  <div class="grid-card" style="--i:1">02</div>
  <div class="grid-card" style="--i:2">03</div>
  <div class="grid-card" style="--i:3">04</div>
</div>

<style>
.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.grid-card {
  padding: 18px;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  background: #ffffff;
  animation: staggerEnter ${e.duration.toFixed(2)}s ${t} both;
  animation-delay: calc(var(--i) * ${e.distance}ms);
}

@keyframes staggerEnter {
  from {
    opacity: 0;
    transform: translate3d(0, 22px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
</style>`}},{id:`reveal-3d-flip`,category:`reveal`,title:`立体3D起き上がり（パースペクティブ）`,subtitle:`寝かせていたパネルや文字が、手前にパタッと起き上がってくる奥行き演出`,mechanismTag:`perspective + rotateX`,xRayCaption:`カメラ距離（perspective: 700px）を設定した空間で、X軸を中心に手前に回転させています`,defaultDuration:.85,durationRange:{min:.25,max:2.5,step:.05},secondarySlider:{label:`初期の傾き角`,unit:`度`,min:20,max:90,step:5,defaultValue:65},defaultEasing:`spring`,hasEasingControl:!0,steps:[{title:`① 空間の「遠近感」を指定する`,detail:`ただ回転させるだけだと平面が縮むだけに見えます。カメラとの距離（perspective）を指定して遠近感を出します。`,codeHint:`perspective(700px)`},{title:`② 奥側へパタンと倒した状態から開始`,detail:`横軸（X軸）を中心に指定角度だけ傾けておきます。上端を奥へ倒すイメージです。`,codeHint:`rotateX(-65deg)`},{title:`③ 正面（0度）へ起き上がらせる`,detail:`少し弾むカーブで 0deg へ戻すと、看板やカードが目の前に立ち上がる立体感が出ます。`,codeHint:`rotateX(0deg)`}],keywords:[`3D`,`立体`,`回転`,`フリップ`,`起き上がり`,`カード`],buildPrompt:(e,t)=>k({name:`立体3D起き上がり（パースペクティブ）`,goal:`カードやパネルが奥に倒れた状態から、立体的な遠近感を伴って正面にパタッと起き上がるようにしたいです。`,mechanism:`transform: perspective(700px) rotateX(-${e.distance}deg) translateY(12px) の状態から rotateX(0deg) へ回転させます。`,requirements:[`必ず perspective() を指定して平面的な潰れではなく3Dの遠近感を維持してください`,`ぼやけを防ぐため回転後に transform: none 相当の整数位置へ収まるようにしてください`],params:e,secondaryLabel:`初期の傾き角`,secondaryUnit:`度`,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="flip-panel">立体的に立ち上がるパネル</div>

<style>
.flip-panel {
  padding: 20px 24px;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  background: #ffffff;
  transform-origin: bottom center;
  animation: flipUp ${e.duration.toFixed(2)}s ${t} both;
}

@keyframes flipUp {
  from {
    opacity: 0;
    transform: perspective(700px) rotateX(-${e.distance}deg) translate3d(0, 12px, 0);
  }
  to {
    opacity: 1;
    transform: perspective(700px) rotateX(0deg) translate3d(0, 0, 0);
  }
}
</style>`}}],M=[{id:`nav-slide-drawer`,category:`nav`,title:`横スライドドロワー（三本線 → ✕ 変形）`,subtitle:`右または左の画面端からメニュー板が滑り出し、後ろを薄暗く覆う標準的な開き方`,mechanismTag:`translateX(100%→0) + 暗幕`,xRayCaption:`閉じている間は画面外（+100%）に待機させ、開閉クラスだけで滑らせています`,interactiveHint:`右上の「再生」または枠内のハンバーガーアイコンを直接クリックできます`,defaultDuration:.5,durationRange:{min:.15,max:2,step:.05},secondarySlider:{label:`ドロワー幅`,unit:`%`,min:45,max:85,step:5,defaultValue:65},defaultEasing:`snappy`,hasEasingControl:!0,steps:[{title:`① メニュー板を画面の外側へ逃がしておく`,detail:`普段は右端の外側（100%分右）に隠してあり、レイアウトの邪魔を一切しません。`,codeHint:`transform: translateX(100%)`},{title:`② 三本線を中央で交差させて「✕」に変える`,detail:`上の線と下の線を中央に寄せつつ ±45度回転させ、真ん中の線だけを透明にします。`,codeHint:`rotate(45deg) / opacity: 0`},{title:`③ 背景の半透明幕を敷いて誤操作を防ぐ`,detail:`メイン画面の上に薄い暗幕（バックドロップ）を重ね、暗幕クリックでも閉じられるようにします。`,codeHint:`aria-expanded / Escで閉じる`}],keywords:[`ハンバーガー`,`ドロワー`,`メニュー`,`スライド`,`ナビ`],buildPrompt:(e,t)=>k({name:`横スライドドロワー（三本線 → ✕ 変形）`,goal:`ハンバーガーボタンをクリックするとボタンが滑らかに「✕」へ変形し、画面端から幅 `+e.distance+`% のスライドメニューが出るようにしたいです。`,mechanism:`メニューパネルを普段は transform: translateX(100%) で画面外に配置し、is-open 状態になったら translateX(0) に遷移させ、背後に半透明の暗幕（クリックで閉じる）を表示します。`,requirements:[`ハンバーガーボタンには aria-expanded と aria-controls を付けてアクセシビリティを保ってください`,`Escキーまたは背景の暗幕クリックでも確実に閉じられるようにしてください`],params:e,secondaryLabel:`ドロワー幅`,secondaryUnit:`%`,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div id="drawerRoot">
  <button id="menuBtn" type="button" aria-expanded="false" aria-controls="drawerNav">メニュー</button>
  <div id="drawerBackdrop" class="drawer-backdrop" aria-hidden="true"></div>
  <nav id="drawerNav" class="drawer-panel" aria-hidden="true">
    <a href="#about">概要</a>
    <a href="#works">実績</a>
    <a href="#contact">お問い合わせ</a>
  </nav>
</div>

<style>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(24, 24, 27, 0.28);
  opacity: 0;
  pointer-events: none;
  transition: opacity ${e.duration.toFixed(2)}s ease;
}

.drawer-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: min(320px, ${e.distance}vw);
  height: 100vh;
  background: #ffffff;
  padding: 24px;
  display: grid;
  align-content: start;
  gap: 12px;
  transform: translate3d(100%, 0, 0);
  transition: transform ${e.duration.toFixed(2)}s ${t};
}

.is-open .drawer-backdrop {
  opacity: 1;
  pointer-events: auto;
}

.is-open .drawer-panel {
  transform: translate3d(0, 0, 0);
}
</style>

<script>
(() => {
  const root = document.getElementById('drawerRoot');
  const btn = document.getElementById('menuBtn');
  const nav = document.getElementById('drawerNav');
  const backdrop = document.getElementById('drawerBackdrop');
  if (!root || !btn || !nav || !backdrop) return;

  function setOpen(next) {
    root.classList.toggle('is-open', next);
    btn.setAttribute('aria-expanded', String(next));
    nav.setAttribute('aria-hidden', String(!next));
  }

  btn.addEventListener('click', () => setOpen(!root.classList.contains('is-open')));
  backdrop.addEventListener('click', () => setOpen(false));
})();
<\/script>`}},{id:`nav-fullscreen-curtain`,category:`nav`,title:`全画面幕引きメニュー（サークル拡張）`,subtitle:`ボタンの位置から円形に画面全体へ幕が広がり、大きな文字メニューを見せる演出`,mechanismTag:`clip-path: circle(0% → 150%)`,xRayCaption:`ボタンの位置（右上）を中心に、円の切り抜き半径を 0% から 150% まで広げています`,interactiveHint:`「再生」または右上のメニューボタンをクリックして開閉できます`,defaultDuration:.75,durationRange:{min:.25,max:2.2,step:.05},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① メニュー画面を最初から全面に重ねて置く`,detail:`画面全体を覆うメニュー層を用意し、普段はクリックできないように透かしておきます。`,codeHint:`position: fixed; inset: 0`},{title:`② ボタンの場所を中心点にした円形マスクで隠す`,detail:`半径 0% の丸い穴（起点は右上ボタン位置）でメニュー層を完全に隠した状態を作ります。`,codeHint:`clip-path: circle(0% at 92% 14%)`},{title:`③ 開いた瞬間に半径を150%まで拡大する`,detail:`円を画面対角線より大きい 150% に広げると、ボタンからインクが広がるように全画面メニューが現れます。`,codeHint:`clip-path: circle(150% at 92% 14%)`}],keywords:[`全画面`,`オーバーレイ`,`ハンバーガー`,`円形`,`クリップパス`,`ブランド`],buildPrompt:(e,t)=>k({name:`全画面幕引きメニュー（サークル拡張）`,goal:`ハンバーガーボタンを押した位置から波紋・円形のように画面全体へメニュー幕が広がる演出にしたいです。`,mechanism:`全画面固定のオーバーレイ層に対して、閉じている時は clip-path: circle(0% at 右上ボタン座標)、開く時は clip-path: circle(150% at 右上ボタン座標) へ変化させます。`,requirements:[`閉じている時は誤クリックを防ぐため pointer-events: none と visibility: hidden を切り替えてください`,`開いた後は中のメニュー項目を少し時間差でフェードインさせるとさらに上質に見えます`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<button id="curtainBtn" type="button" aria-expanded="false" aria-controls="fullMenu">メニューを開く</button>
<nav id="fullMenu" class="full-menu" aria-hidden="true">
  <button id="curtainClose" type="button">✕ 閉じる</button>
  <a href="#work">作品集</a>
  <a href="#about">コンセプト</a>
  <a href="#contact">お問い合わせ</a>
</nav>

<style>
.full-menu {
  position: fixed;
  inset: 0;
  background: #18181b;
  color: #ffffff;
  display: grid;
  place-content: center;
  gap: 16px;
  clip-path: circle(0% at calc(100% - 28px) 28px);
  visibility: hidden;
  pointer-events: none;
  transition: clip-path ${e.duration.toFixed(2)}s ${t}, visibility ${e.duration.toFixed(2)}s;
}

.full-menu.is-open {
  clip-path: circle(150% at calc(100% - 28px) 28px);
  visibility: visible;
  pointer-events: auto;
}
</style>

<script>
(() => {
  const openBtn = document.getElementById('curtainBtn');
  const closeBtn = document.getElementById('curtainClose');
  const menu = document.getElementById('fullMenu');
  if (!openBtn || !closeBtn || !menu) return;

  function toggleCurtain(open) {
    menu.classList.toggle('is-open', open);
    openBtn.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
  }

  openBtn.addEventListener('click', () => toggleCurtain(true));
  closeBtn.addEventListener('click', () => toggleCurtain(false));
})();
<\/script>`}},{id:`nav-top-accordion`,category:`nav`,title:`上端押し下げアコーディオン展開`,subtitle:`ヘッダーのすぐ下からパカッと下に開く、迷いにくい折りたたみナビゲーション`,mechanismTag:`grid-template-rows: 0fr → 1fr`,xRayCaption:`height: auto の代わりに grid の行比率（0fr→1fr）を使い、中身の高さに合わせて滑らかに開きます`,interactiveHint:`「再生」またはミニヘッダー内の「MENU」ボタンをクリックできます`,defaultDuration:.5,durationRange:{min:.15,max:2,step:.05},defaultEasing:`snappy`,hasEasingControl:!0,steps:[{title:`① CSSの「高さauto」はアニメーションできない問題`,detail:`中身が何行あるか決まっていないメニューは、普通の height: auto だとアニメーションが効きません。`,codeHint:`height: auto はアニメ不可`},{title:`② Grid の 0fr → 1fr テクニックを使う`,detail:`親を display: grid にし、行の高さ比率を 0fr（高さゼロ）から 1fr（中身ぴったり）へ変えると滑らかに動きます。`,codeHint:`grid-template-rows: 0fr → 1fr`},{title:`③ 内側の箱だけ overflow: hidden にする`,detail:`子要素に min-height: 0; overflow: hidden を指定するだけで、JS計測なしに完全自動の高さ展開が実現します。`,codeHint:`min-height: 0`}],keywords:[`アコーディオン`,`ドロップダウン`,`ヘッダー`,`ハンバーガー`,`展開`],buildPrompt:(e,t)=>k({name:`上端押し下げアコーディオン展開`,goal:`ヘッダーのメニューボタンを押すと、ヘッダー直下から自然な高さでスッと下に開くアコーディオン型メニューにしたいです。`,mechanism:`JSで高さを計算する代わりに CSS Grid の grid-template-rows: 0fr（閉）から 1fr（開）への transition を利用し、内側の要素に min-height: 0; overflow: hidden を設定します。`,requirements:[`メニューの項目数が変わっても壊れないよう固定 px 高さは使わず 0fr / 1fr 方式で実装してください`,`開閉ボタンに aria-expanded と aria-controls を連動させ、閉じている間は aria-hidden="true" や inert で誤フォーカスを防いでください`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<button id="dropBtn" type="button" aria-expanded="false" aria-controls="dropMenu">メニュー ▼</button>
<div class="dropdown-wrap" id="dropMenu" aria-hidden="true">
  <div class="dropdown-inner">
    <a href="#">ホーム</a>
    <a href="#">機能一覧</a>
    <a href="#">料金プラン</a>
  </div>
</div>

<style>
.dropdown-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows ${e.duration.toFixed(2)}s ${t};
}

.dropdown-wrap.is-open {
  grid-template-rows: 1fr;
}

.dropdown-inner {
  min-height: 0;
  overflow: hidden;
  display: grid;
  gap: 8px;
}
</style>

<script>
(() => {
  const dropBtn = document.getElementById('dropBtn');
  const dropMenu = document.getElementById('dropMenu');
  if (!dropBtn || !dropMenu) return;

  dropBtn.addEventListener('click', () => {
    const open = dropMenu.classList.toggle('is-open');
    dropBtn.setAttribute('aria-expanded', String(open));
    dropMenu.setAttribute('aria-hidden', String(!open));
  });
})();
<\/script>`}},{id:`nav-bottom-sheet`,category:`nav`,title:`ボトムシートせり上がり（スマホ親指向け）`,subtitle:`画面の一番下からカードが持ち上がり、指が届きやすい位置にメニューを出す設計`,mechanismTag:`下端配置 + translateY(100%→0)`,xRayCaption:`上部に「引っ張りつまみ」を置き、親指ゾーンの下端から上へスライドさせています`,interactiveHint:`「再生」またはミニスマホ下部のメニューボタンを押せます`,defaultDuration:.55,durationRange:{min:.2,max:2,step:.05},defaultEasing:`spring`,hasEasingControl:!0,steps:[{title:`① スマホで届きやすい画面下端に配置する`,detail:`片手持ちの親指は画面上部に届きにくいため、モバイルでは下端からメニューを出すと使いやすくなります。`,codeHint:`bottom: 0; border-radius: 20px 20px 0 0`},{title:`② 上端に小さなハンドル（棒）を添える`,detail:`「上から下に引き下げられそう」という視覚的ヒント（アフォーダンス）を小さなグレーの棒で伝えます。`,codeHint:`w-10 h-1 rounded-full`},{title:`③ 下の画面外からバネ感で持ち上げる`,detail:`少しだけ弾むカーブで translateY(100% → 0) に動かすと、アプリのような心地よい手触りになります。`,codeHint:`translateY(100% → 0)`}],keywords:[`ボトムシート`,`スマホ`,`モバイル`,`メニュー`,`下から`,`ハンバーガー`],buildPrompt:(e,t)=>k({name:`ボトムシートせり上がり（スマホ親指向け）`,goal:`スマホ表示のメニューボタンを押したとき、画面下端から上角丸のボトムシートが気持ちよくせり上がる設計にしたいです。`,mechanism:`bottom: 0 に固定した角丸シートを普段は translateY(100%) で下に隠し、開くと暗幕とともに translateY(0) へ移動させます。`,requirements:[`シート上端の中央に小さな横棒ハンドルを配置し、モバイルアプリらしい見た目にしてください`,`最大高さを max-height: 80dvh 程度に抑え、背後が少し見える状態にしてください`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<button id="sheetOpenBtn" type="button">詳細メニューを開く</button>
<div id="sheetBackdrop" class="sheet-backdrop" hidden></div>
<section id="bottomSheet" class="bottom-sheet" role="dialog" aria-modal="true" aria-hidden="true">
  <div class="sheet-handle"></div>
  <p>下から引き上がるアクションメニュー</p>
  <button id="sheetCloseBtn" type="button">閉じる</button>
</section>

<style>
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(24, 24, 27, 0.3);
}

.bottom-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 80dvh;
  background: #ffffff;
  border-radius: 20px 20px 0 0;
  padding: 12px 20px 28px;
  transform: translate3d(0, 100%, 0);
  transition: transform ${e.duration.toFixed(2)}s ${t};
}

.bottom-sheet.is-open {
  transform: translate3d(0, 0, 0);
}

.sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: 9999px;
  background: #d4d4d8;
  margin: 0 auto 12px;
}
</style>

<script>
(() => {
  const sheet = document.getElementById('bottomSheet');
  const backdrop = document.getElementById('sheetBackdrop');
  const openBtn = document.getElementById('sheetOpenBtn');
  const closeBtn = document.getElementById('sheetCloseBtn');
  if (!sheet || !backdrop || !openBtn || !closeBtn) return;

  function setSheetOpen(open) {
    sheet.classList.toggle('is-open', open);
    sheet.setAttribute('aria-hidden', String(!open));
    backdrop.hidden = !open;
  }

  openBtn.addEventListener('click', () => setSheetOpen(true));
  closeBtn.addEventListener('click', () => setSheetOpen(false));
  backdrop.addEventListener('click', () => setSheetOpen(false));
})();
<\/script>`}},{id:`tabs-sliding-underline`,category:`tabs`,title:`下線スライド移動タブ`,subtitle:`選んだタブの真下へ、1本のアンダーラインが滑るように追いかけてくる定番UI`,mechanismTag:`1本の線 + left / width 追従`,xRayCaption:`各タブに線を1本ずつ置くのではなく、共通の「1本の線」の位置と幅を移動させています`,interactiveHint:`「再生」またはタブ（概要／仕組み／事例）を直接クリックできます`,defaultDuration:.45,durationRange:{min:.15,max:1.8,step:.05},defaultEasing:`snappy`,hasEasingControl:!0,steps:[{title:`① タブごとに線を付けないのが秘密`,detail:`各ボタンに個別の border-bottom を付けるとパッと点滅するだけで滑って見えません。`,codeHint:`共有インジケーター要素は1つ`},{title:`② 選択されたボタンの位置と横幅を測る`,detail:`押されたタブの左端からの距離（offsetLeft）と横幅（offsetWidth）を取得します。`,codeHint:`offsetLeft / offsetWidth`},{title:`③ 共通の1本線をその位置・幅へ滑らせる`,detail:`線を translateX と width で目標の位置へアニメーションさせると、生き物のように線が移動します。`,codeHint:`transform: translateX(...) `}],keywords:[`タブ`,`下線`,`スライド`,`インジケーター`,`切り替え`],buildPrompt:(e,t)=>k({name:`下線スライド移動タブ`,goal:`タブを切り替えたとき、選択中の下線がパッと消え替わるのではなく、横方向にスッと滑って移動するようにしたいです。`,mechanism:`タブ一覧の親要素内に1つだけインジケーター用の下線要素（position: absolute; bottom: 0）を置き、選択されたタブの offsetLeft と offsetWidth に合わせて translateX と width を transition させます。`,requirements:[`ウィンドウ幅が変わっても位置がズレないよう resize 時にも座標を再計算してください`,`role="tablist" / role="tab" / aria-selected を正しく付与してください`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="tab-bar" role="tablist">
  <button type="button" class="tab-btn is-active" role="tab" aria-selected="true">概要</button>
  <button type="button" class="tab-btn" role="tab" aria-selected="false">仕組み</button>
  <button type="button" class="tab-btn" role="tab" aria-selected="false">応用例</button>
  <span class="tab-line" id="tabLine"></span>
</div>

<style>
.tab-bar {
  position: relative;
  display: inline-flex;
  border-bottom: 1px solid #e4e4e7;
}

.tab-btn {
  border: 0;
  background: transparent;
  padding: 10px 16px;
  cursor: pointer;
}

.tab-line {
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: #2563eb;
  transition: transform ${e.duration.toFixed(2)}s ${t}, width ${e.duration.toFixed(2)}s ${t};
}
</style>

<script>
(() => {
  const buttons = Array.from(document.querySelectorAll('.tab-btn'));
  const line = document.getElementById('tabLine');
  if (!line || buttons.length === 0) return;

  function moveLine(target) {
    line.style.width = target.offsetWidth + 'px';
    line.style.transform = \`translateX(\${target.offsetLeft}px)\`;
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', String(active));
      });
      moveLine(btn);
    });
  });

  window.addEventListener('resize', () => {
    const current = document.querySelector('.tab-btn.is-active');
    if (current) moveLine(current);
  });

  moveLine(buttons[0]);
})();
<\/script>`}},{id:`tabs-floating-pill`,category:`tabs`,title:`ピル背景スルッと移動（セグメント切替）`,subtitle:`白いカプセル型の座布団がタブの裏を滑走する、iOSやモダンWebで人気のUI`,mechanismTag:`背面カプセル移動 + z-index層分け`,xRayCaption:`薄いグレーのトレイ内で、白い角丸座布団（z:1）が文字（z:2）の後ろを滑っています`,interactiveHint:`「再生」またはピル内の選択肢をクリックして切り替えできます`,defaultDuration:.45,durationRange:{min:.15,max:1.8,step:.05},defaultEasing:`spring`,hasEasingControl:!0,steps:[{title:`① 灰色の角丸トレイを敷く`,detail:`選択肢全体を包む、少しだけ凹んだような薄いグレーの背景トレイを用意します。`,codeHint:`background: #f4f4f5; border-radius: 999px`},{title:`② 文字の後ろに白い「座布団」を1枚置く`,detail:`ボタンの文字（z-index: 2）の裏側（z-index: 1）に、角丸で白い影つきの座布団要素を置きます。`,codeHint:`z-index: 1 (座布団) < 2 (文字)`},{title:`③ 選んだ項目へ座布団を移動させる`,detail:`均等幅なら translateX(インデックス × 100%) だけで位置計算不要の超クリーン実装ができます。`,codeHint:`translateX(calc(idx * 100%))`}],keywords:[`タブ`,`ピル`,`セグメント`,`切り替え`,`カプセル`,`スイッチ`],buildPrompt:(e,t)=>k({name:`ピル背景スルッと移動（セグメント切替）`,goal:`月払い/年払い や 表示切替 のようなスイッチで、選択中の白い角丸背景が滑らかに横移動するUIにしたいです。`,mechanism:`グレーの角丸コンテナの中に、文字層（z-index: 2）と1枚の移動する白いピル背景（z-index: 1）を重ね、選択中のタブ位置へ translateX で移動させます。`,requirements:[`移動中の視認性が落ちないよう、白いピル要素にはわずかなドロップシャドウを付けてください`,`文字色は選択中と非選択中で明確なコントラスト差をつけてください`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="seg-track" id="segTrack" role="tablist" style="--count:3; --active:0">
  <span class="seg-pill" aria-hidden="true"></span>
  <button type="button" role="tab" aria-selected="true">日次</button>
  <button type="button" role="tab" aria-selected="false">週次</button>
  <button type="button" role="tab" aria-selected="false">月次</button>
</div>

<style>
.seg-track {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--count), 1fr);
  padding: 4px;
  border-radius: 9999px;
  background: #f4f4f5;
}

.seg-pill {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc((100% - 8px) / var(--count));
  border-radius: 9999px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  transform: translateX(calc(var(--active) * 100%));
  transition: transform ${e.duration.toFixed(2)}s ${t};
}

.seg-track button {
  position: relative;
  z-index: 1;
  background: transparent;
  border: 0;
  padding: 8px 16px;
  cursor: pointer;
}
</style>

<script>
(() => {
  const track = document.getElementById('segTrack');
  if (!track) return;
  const tabs = Array.from(track.querySelectorAll('[role="tab"]'));

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      track.style.setProperty('--active', String(index));
      tabs.forEach((t, i) => t.setAttribute('aria-selected', String(i === index)));
    });
  });
})();
<\/script>`}},{id:`tabs-content-slide`,category:`tabs`,title:`中身パネルの横スライド切り替え`,subtitle:`タブを変えると、下のコンテンツ自体がページをめくるように横に滑って入れ替わる`,mechanismTag:`横並びトラック + translateX(-N00%)`,xRayCaption:`3ページ分のパネルを横1列に繋げておき、外枠の窓越しに全体を横にズラしています`,interactiveHint:`「再生」または上のStepタブ（1 / 2 / 3）をクリックできます`,defaultDuration:.55,durationRange:{min:.2,max:2,step:.05},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① 窓枠（表示エリア）に overflow: hidden をかける`,detail:`外側の枠には「1ページ分の幅だけ見せて、隣にはみ出たページは隠す」窓を作ります。`,codeHint:`overflow: hidden`},{title:`② 中身ページを横一列に並べておく`,detail:`3つのタブなら幅100%の箱を横に3つ繋げた長いベルトコンベアを作ります。`,codeHint:`display: flex`},{title:`③ ベルト全体を -0%, -100%, -200% ズラす`,detail:`選んだタブ番号に応じてベルトを横に滑らせるだけで、左右どちらの切り替え方向も自然に表現できます。`,codeHint:`translateX(calc(index * -100%))`}],keywords:[`タブ`,`スライド`,`パネル`,`カルーセル`,`切り替え`,`横`],buildPrompt:(e,t)=>k({name:`中身パネルの横スライド切り替え`,goal:`タブやステップを切り替えたとき、中のコンテンツパネル自体が左右に滑って切り替わるようにしたいです。`,mechanism:`表示窓を overflow: hidden にし、内部に flex で各パネル（flex: 0 0 100%）を横並びに配置して、アクティブ番号に応じてコンテナを translateX(calc(index * -100%)) で移動させます。`,requirements:[`各パネルの高さが大きく異なる場合に不自然な余白が出ないよう設計してください`,`非表示のタブ内要素にフォーカスが飛ばないよう inert 属性または tabIndex 管理を行ってください`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="panel-tabs" role="tablist">
  <button type="button" class="panel-tab is-active" role="tab" aria-selected="true">ページ 1</button>
  <button type="button" class="panel-tab" role="tab" aria-selected="false">ページ 2</button>
  <button type="button" class="panel-tab" role="tab" aria-selected="false">ページ 3</button>
</div>
<div class="panel-viewport">
  <div class="panel-track" id="panelTrack">
    <section class="panel-page">ページ 1 の内容</section>
    <section class="panel-page">ページ 2 の内容</section>
    <section class="panel-page">ページ 3 の内容</section>
  </div>
</div>

<style>
.panel-tabs {
  display: inline-flex;
  gap: 8px;
  margin-bottom: 8px;
}

.panel-viewport {
  overflow: hidden;
  width: 100%;
}

.panel-track {
  display: flex;
  transition: transform ${e.duration.toFixed(2)}s ${t};
}

.panel-page {
  flex: 0 0 100%;
}
</style>

<script>
(() => {
  const trackEl = document.getElementById('panelTrack');
  const tabBtns = Array.from(document.querySelectorAll('.panel-tab'));
  if (!trackEl || tabBtns.length === 0) return;

  tabBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      trackEl.style.transform = \`translateX(-\${idx * 100}%)\`;
      tabBtns.forEach((b, i) => {
        const active = i === idx;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', String(active));
      });
    });
  });
})();
<\/script>`}},{id:`tabs-smooth-accordion`,category:`tabs`,title:`FAQ・折りたたみアコーディオン`,subtitle:`質問をクリックすると「＋」が「✕」に回転し、答えが滑らかに押し開く設計`,mechanismTag:`0fr→1fr + アイコン45度回転`,xRayCaption:`質問行をクリックすると行比率 0fr→1fr で押し広げ、右端の＋記号も回転させています`,interactiveHint:`「再生」または質問行を直接クリックして開閉を試せます`,defaultDuration:.45,durationRange:{min:.15,max:1.8,step:.05},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① ＋記号を45度回して「✕」に見せる`,detail:`閉じる用の別アイコンを読み込むのではなく、同じ「＋」を回転させることで状態の変化が直感的になります。`,codeHint:`transform: rotate(45deg)`},{title:`② 答え部分を Grid 0fr → 1fr で開閉する`,detail:`文字数が変わっても崩れず、下にある別の質問項目も滑らかに押し下げられます。`,codeHint:`grid-template-rows: 0fr → 1fr`},{title:`③ 一緒に透明度もふわっと変化させる`,detail:`高さの開閉と同時に中の文字の opacity を 0 → 1 へ少し変えると、見切れ感がなくなります。`,codeHint:`opacity: 0 → 1`}],keywords:[`アコーディオン`,`FAQ`,`折りたたみ`,`開閉`,`質問`],buildPrompt:(e,t)=>k({name:`FAQ・折りたたみアコーディオン`,goal:`よくある質問や詳細欄をクリックすると、右端の「＋」が回転しつつ回答文が滑らかに展開するアコーディオンにしたいです。`,mechanism:`grid-template-rows: 0fr → 1fr と opacity: 0 → 1 の併用で高さをアニメーションさせ、ボタン内の「＋」アイコンを rotate(45deg) で回転させます。`,requirements:[`button 要素と aria-expanded を使い、キーボード（Enter/Space）でも開閉できるようにしてください`,`閉じている回答領域内のリンクや操作要素には tabindex や inert 管理を行い、非表示パネルへタブ移動しないようにしてください`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="acc-item" id="accItem">
  <button type="button" class="acc-trigger" aria-expanded="false" aria-controls="accBody">
    <span>よくある質問</span>
    <span class="acc-plus" aria-hidden="true">+</span>
  </button>
  <div class="acc-body" id="accBody">
    <div>height: auto では滑らかに閉じ開けできませんが、CSS Grid の 0fr → 1fr なら綺麗に伸縮します。</div>
  </div>
</div>

<style>
.acc-trigger {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  border: 0;
  background: transparent;
  padding: 12px 0;
  cursor: pointer;
}

.acc-body {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows ${e.duration.toFixed(2)}s ${t}, opacity ${e.duration.toFixed(2)}s ease;
}
.acc-item.is-open .acc-body {
  grid-template-rows: 1fr;
  opacity: 1;
}
.acc-body > div {
  min-height: 0;
  overflow: hidden;
}
.acc-plus {
  transition: transform ${e.duration.toFixed(2)}s ${t};
}
.acc-item.is-open .acc-plus {
  transform: rotate(45deg);
}
</style>

<script>
(() => {
  const accItem = document.getElementById('accItem');
  const accBtn = accItem ? accItem.querySelector('.acc-trigger') : null;
  if (!accItem || !accBtn) return;

  accBtn.addEventListener('click', () => {
    const open = accItem.classList.toggle('is-open');
    accBtn.setAttribute('aria-expanded', String(open));
  });
})();
<\/script>`}},{id:`search-icon-expand`,category:`search`,title:`虫眼鏡1個 → タップで横に伸びる検索`,subtitle:`普段はアイコン1個だけでヘッダーをすっきり保ち、使う時だけ入力欄が広がる置き方`,mechanismTag:`width遷移 + 自動focus`,xRayCaption:`閉時はアイコン幅（40px）に畳み、開いた瞬間に入力欄幅を広げつつフォーカスを当てます`,interactiveHint:`「再生」または右上の虫眼鏡アイコンをクリック・文字入力できます`,defaultDuration:.5,durationRange:{min:.15,max:1.8,step:.05},secondarySlider:{label:`展開時の幅`,unit:`px`,min:160,max:290,step:10,defaultValue:220},defaultEasing:`snappy`,hasEasingControl:!0,steps:[{title:`① 普段はアイコン1個の省スペースで置く`,detail:`ヘッダーのメニュー項目が多いサイトでは、最初から長い検索バーを置かず虫眼鏡だけにするとスッキリします。`,codeHint:`width: 40px（閉）`},{title:`② 押した瞬間に左方向へ入力欄を伸ばす`,detail:`横幅を 40px → 220px へ滑らかに広げ、中に入力欄（input）とクリア「✕」ボタンを現します。`,codeHint:`width: 220px（開）`},{title:`③ 伸ばすと同時に文字入力できる状態にする`,detail:`開いた後に自動フォーカス（input.focus()）をかけると、ユーザーはクリック1回でそのまま文字を打てます。`,codeHint:`inputRef.focus()`}],keywords:[`検索`,`虫眼鏡`,`ヘッダー`,`展開`,`アイコン`,`置き方`],buildPrompt:(e,t)=>k({name:`虫眼鏡1個 → タップで横に伸びる検索`,goal:`ヘッダーがごちゃつかないよう普段は虫眼鏡アイコン1個だけにして、クリックすると検索ボックスが横にスーッと伸びるUIにしたいです。`,mechanism:`検索コンテナの横幅を 40px から ${e.distance}px へ transition させ、展開と同時に入力欄へ自動 focus() します。入力値が空でフォーカスが外れたら元に戻ります。`,requirements:[`開いた直後にそのままタイピングできるよう input.focus() を入れてください`,`何か文字が入力されている間は勝手に閉じないよう制御してください`],params:e,secondaryLabel:`展開時の幅`,secondaryUnit:`px`,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="search-expand" id="searchBox">
  <button id="searchToggleBtn" type="button" aria-expanded="false" aria-label="検索を開く">🔍</button>
  <input id="searchExpandInput" type="search" placeholder="キーワード..." />
</div>

<style>
.search-expand {
  display: inline-flex;
  align-items: center;
  width: 40px;
  max-width: 100%;
  height: 40px;
  border-radius: 9999px;
  border: 1px solid #e4e4e7;
  overflow: hidden;
  transition: width ${e.duration.toFixed(2)}s ${t};
}

.search-expand.is-open {
  width: min(${e.distance}px, 100%);
  padding-right: 12px;
}

.search-expand button {
  flex: none;
  width: 38px;
  height: 38px;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.search-expand input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.search-expand.is-open input {
  opacity: 1;
}
</style>

<script>
(() => {
  const box = document.getElementById('searchBox');
  const toggleBtn = document.getElementById('searchToggleBtn');
  const input = document.getElementById('searchExpandInput');
  if (!box || !toggleBtn || !input) return;

  toggleBtn.addEventListener('click', () => {
    const open = box.classList.toggle('is-open');
    toggleBtn.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(() => input.focus(), 80);
  });
})();
<\/script>`}},{id:`search-inline-bar`,category:`search`,title:`常設インライン検索バー（すぐ探せる王道）`,subtitle:`「探すこと」が主役のサイト向けに、入力欄もボタンも隠さず最初から出しておく配置`,mechanismTag:`常時表示 + フォーカス輪郭強調`,xRayCaption:`「探せる場所」を迷わせないため隠さず配置し、入力中だけ青い外枠（focus-within）で反応します`,interactiveHint:`「再生」または枠内の検索バーに直接入力・タグ選択ができます`,defaultDuration:.4,durationRange:{min:.1,max:1.5,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① あえて「隠さない」ことで迷いをゼロにする`,detail:`図鑑・ECサイト・ヘルプなど「検索が主目的」のサイトでは、アイコン1個より常時バーが見つけてもらいやすいです。`,codeHint:`発見性（Discoverability）優先`},{title:`② 左に虫眼鏡・中央に入力・右に実行/消去`,detail:`左端に虫眼鏡マーク、中央にプレースホルダー例、右端に青い検索ボタンという世界標準の配置にします。`,codeHint:`flex: 1 + 右ボタン`},{title:`③ クリックした瞬間だけ光る外枠を付ける`,detail:`親ボックスに :focus-within を使い、入力欄を押したときバー全体が青い輪郭で浮かび上がるようにします。`,codeHint:`:focus-within`}],keywords:[`検索`,`検索バー`,`常時表示`,`配置`,`EC`,`図鑑`],buildPrompt:(e,t)=>k({name:`常設インライン検索バー（すぐ探せる王道）`,goal:`ユーザーが迷わずすぐ検索できるよう、虫眼鏡アイコン・入力欄・検索ボタンが最初から一体で見えている検索バーにしたいです。`,mechanism:`横並びの Pill/角丸コンテナ内に左アイコン・可変幅 input・右検索ボタンを並べ、:focus-within で入力中だけ枠線色と淡いリングを滑らかに強調します。`,requirements:[`プレースホルダーには「例：ボタン、スクロール」のように具体的な入力例を入れてください`,`入力があるときだけ右側にクリア（×）ボタンを出してください`],params:e,targetNote:t}),buildCode:e=>`<form class="inline-search" role="search">
  <span aria-hidden="true">🔍</span>
  <input type="search" placeholder="キーワードで探す（例：テキスト、タブ）" />
  <button type="submit">検索</button>
</form>

<style>
.inline-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 5px 5px 14px;
  border: 1px solid #d4d4d8;
  border-radius: 12px;
  background: #ffffff;
  transition: border-color ${e.duration.toFixed(2)}s ease, box-shadow ${e.duration.toFixed(2)}s ease;
}

.inline-search:focus-within {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

.inline-search input {
  flex: 1;
  border: 0;
  outline: none;
}
</style>`},{id:`search-backdrop-typography`,category:`search`,title:`背景透かし文字付き・重ね検索レイアウト`,subtitle:`後ろに大きな「SEARCH」等の装飾文字を敷き、前面に検索バーを浮かせるデザイン配置`,mechanismTag:`z-index層重ね + 半透明ぼかし`,xRayCaption:`背面（z:1）に大きな背景文字を置き、前面（z:2）の半透明ガラス風検索窓を重ねています`,interactiveHint:`「再生」を押すと背面文字と前面検索バーの重なり登場が見られます（入力も可）`,defaultDuration:.75,durationRange:{min:.25,max:2.2,step:.05},secondarySlider:{label:`背景文字の透け具合`,unit:`%`,min:6,max:24,step:2,defaultValue:12},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① 背面レイヤー（奥）に巨大な装飾文字を置く`,detail:`後ろのレイヤー（z-index: 1）に「SEARCH」などの文字を薄く大きく配置し、デザイン上の奥行きを作ります。`,codeHint:`position: absolute; z-index: 1`},{title:`② 前面レイヤー（手前）に検索バーを浮かせる`,detail:`手前のレイヤー（z-index: 2）に検索ボックスを少し重ねて配置します。背景が少し透けると重なりが綺麗に見えます。`,codeHint:`backdrop-filter: blur(6px)`},{title:`③ 入力中は後ろの文字が邪魔にならない工夫`,detail:`背景文字には pointer-events: none と薄い透明度を使い、前面の入力文字の読みやすさを絶対に邪魔しないのが鉄則です。`,codeHint:`pointer-events: none; user-select: none`}],keywords:[`検索`,`背景`,`透かし`,`後ろ`,`タイポ`,`レイアウト`,`おしゃれ`],buildPrompt:(e,t)=>k({name:`背景透かし文字付き・重ね検索レイアウト`,goal:`検索バーの後ろのレイアウトに大きな「SEARCH」等の装飾文字を配置し、手前に検索入力欄が重なって見えるデザイン性の高いセクションにしたいです。`,mechanism:`親コンテナを position: relative にし、背面に巨大な透かし文字（opacity: ${(e.distance/100).toFixed(2)}, pointer-events: none, z-index: 1）を置き、前面（z-index: 2）に薄い半透明＋backdrop-filter の検索バーを重ねます。`,requirements:[`背面文字がクリックや選択の邪魔にならないよう pointer-events: none と aria-hidden="true" を付けてください`,`検索入力の文字と背面文字が重なっても読みにくくならないよう、前面ボックスは白ベース90%程度の不透明度を保ってください`],params:e,secondaryLabel:`背景文字の濃さ`,secondaryUnit:`%`,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<section class="editorial-search-wrap">
  <div class="bg-word" aria-hidden="true">SEARCH</div>
  <form class="front-search" role="search">
    <input type="search" placeholder="探したい言葉を入力..." />
    <button type="submit">探す</button>
  </form>
</section>

<style>
.editorial-search-wrap {
  position: relative;
  padding: 36px 20px;
  display: grid;
  place-items: center;
}

.bg-word {
  position: absolute;
  z-index: 1;
  font-size: clamp(44px, 9vw, 88px);
  font-weight: 800;
  letter-spacing: 0.14em;
  color: rgba(24, 24, 27, ${(e.distance/100).toFixed(2)});
  pointer-events: none;
  user-select: none;
  animation: fadeUp ${e.duration.toFixed(2)}s ${t} both;
}

.front-search {
  position: relative;
  z-index: 2;
  width: min(440px, 100%);
  display: flex;
  padding: 6px 6px 6px 16px;
  border-radius: 14px;
  border: 1px solid #d4d4d8;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
}
</style>`}},{id:`search-command-modal`,category:`search`,title:`⌘K 中央コマンド検索モーダル`,subtitle:`小さなボタンやショートカットから画面中央に浮き上がり、候補もすぐ出せる高機能配置`,mechanismTag:`擬似トリガー + 中央オーバーレイ`,xRayCaption:`普段は小さな「検索ボタン（⌘K）」だけ置き、押したときだけ中央モーダルを出現させます`,interactiveHint:`「再生」または「⌘K で検索」ボタンを押してモーダルを開けます`,defaultDuration:.4,durationRange:{min:.15,max:1.5,step:.05},defaultEasing:`snappy`,hasEasingControl:!0,steps:[{title:`① 普段は小さなボタン（バッジ付き）だけ見せる`,detail:`ヘッダーのスペースを食わずに「いつでもどこでも検索できる入口」を作れます。`,codeHint:`<button>🔍 検索 ⌘K</button>`},{title:`② 押すと背景を軽くぼかして中央に浮かべる`,detail:`注意を検索だけに集中させるため、背後に半透明ぼかし幕を敷き、中央上部にパネルを出します。`,codeHint:`scale(0.96 → 1) + backdrop`},{title:`③ 入力欄のすぐ下に候補リストを出せる`,detail:`モーダル内なら縦幅に余裕があるため、おすすめキーワードや履歴をすぐ下に並べて選べます。`,codeHint:`入力欄 + 即時候補リスト`}],keywords:[`検索`,`モーダル`,`コマンドパレット`,`⌘K`,`ポップアップ`],buildPrompt:(e,t)=>k({name:`⌘K 中央コマンド検索モーダル`,goal:`普段はコンパクトな検索ボタン（⌘K表示）にして、押すと画面中央に背景ぼかし付きの検索モーダルがふわっと浮かぶUIにしたいです。`,mechanism:`ネイティブの <dialog> またはモーダルオーバーレイを使い、トリガー押下または Cmd/Ctrl+K で開き、scale(0.96) + opacity: 0 から scale(1) + opacity: 1 へ遷移させます。`,requirements:[`モーダルが開いたら入力欄に自動フォーカスし、Escキーや外側クリックで閉じられるようにしてください`,`背景には軽めの半透明暗幕を敷いて入力に集中しやすくしてください`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<button id="openSearchModal" type="button">🔍 検索 <kbd>⌘K</kbd></button>

<dialog id="cmdDialog" class="cmd-dialog">
  <input id="cmdSearchInput" type="search" placeholder="ページや機能を検索..." autofocus />
  <ul class="cmd-list">
    <li>文字アニメーション</li>
    <li>ハンバーガーメニュー</li>
  </ul>
</dialog>

<style>
.cmd-dialog {
  width: min(480px, 92vw);
  border: 1px solid #e4e4e7;
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.16);
}

.cmd-dialog::backdrop {
  background: rgba(24, 24, 27, 0.32);
  backdrop-filter: blur(2px);
}

.cmd-dialog[open] {
  animation: modalPop ${e.duration.toFixed(2)}s ${t} both;
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.96) translateY(-8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>

<script>
(() => {
  const dialog = document.getElementById('cmdDialog');
  const openModalBtn = document.getElementById('openSearchModal');
  if (!dialog || !openModalBtn) return;

  openModalBtn.addEventListener('click', () => dialog.showModal());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      dialog.open ? dialog.close() : dialog.showModal();
    }
  });
})();
<\/script>`}}],N=[{id:`micro-tactile-press`,category:`micro`,title:`物理ボタンの押し込み感（タクタイル）`,subtitle:`下に立体的な厚みの影を持たせ、マウスを乗せると少し浮き・押すとカチッと沈む手触り`,mechanismTag:`box-shadow差分 + translateY`,xRayCaption:`ボタン下の「影の厚み」を押し込み時に 0px へ減らし、同じ分だけ本体を下に下げています`,interactiveHint:`「再生」または中央の青いボタンをホバー＆クリックできます`,defaultDuration:.22,durationRange:{min:.08,max:1,step:.02},secondarySlider:{label:`押し込み深さ`,unit:`px`,min:2,max:8,step:1,defaultValue:4},defaultEasing:`snappy`,hasEasingControl:!1,steps:[{title:`① 影をぼかさず「厚み」として下に敷く`,detail:`blur（ぼかし）を0pxにした硬い下向きの影を使うと、立体的なボタンの側面（厚み）に見えます。`,codeHint:`box-shadow: 0 4px 0 #1d4ed8`},{title:`② 押した瞬間（:active）に本体を4px下げる`,detail:`影の厚みと同じピクセルだけ本体を下へ移動させます。`,codeHint:`transform: translateY(4px)`},{title:`③ 同時に影を0pxにして「床に着いた感」を出す`,detail:`本体が下がった分だけ影を消すと、本当に物理スイッチを押し込んだ錯覚が生まれます。`,codeHint:`box-shadow: 0 0 0 #1d4ed8`}],keywords:[`ボタン`,`押す`,`立体`,`タクタイル`,`クリック`,`ホバー`],buildPrompt:(e,t)=>k({name:`物理ボタンの押し込み感（タクタイル）`,goal:`ボタンに物理スイッチのような厚みを持たせ、押した瞬間にカチッと下へ沈み込む気持ちいい手触りにしたいです。`,mechanism:`通常時は下にぼかしのない厚み影（box-shadow: 0 ${e.distance}px 0 濃い色）を付け、:active（押下中）に transform: translateY(${e.distance}px) と box-shadow: 0 0 0 を同時に指定します。`,requirements:[`周囲の要素が押したときにズレないよう height/margin ではなく transform と box-shadow で表現してください`,`押している感が即座に伝わるよう transition は短め（0.1〜0.18秒）にしてください`],params:e,secondaryLabel:`押し込み深さ`,secondaryUnit:`px`,targetNote:t}),buildCode:e=>`<button class="tactile-btn" type="button">今すぐ試してみる</button>

<style>
.tactile-btn {
  padding: 12px 24px;
  border: 0;
  border-radius: 12px;
  background: #2563eb;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 ${e.distance}px 0 #1d4ed8;
  transition: transform ${e.duration.toFixed(2)}s ease, box-shadow ${e.duration.toFixed(2)}s ease;
}

.tactile-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 ${e.distance+1}px 0 #1d4ed8;
}

.tactile-btn:active {
  transform: translateY(${e.distance}px);
  box-shadow: 0 0 0 #1d4ed8;
}
</style>`},{id:`micro-click-ripple`,category:`micro`,title:`クリック座標から広がる波紋（リップル）`,subtitle:`押した「まさにその場所」を中心にして、水面の輪のように波紋が広がり消える反応`,mechanismTag:`クリック座標取得 + scale(0→3)`,xRayCaption:`ボタン内のクリック位置（offsetX, offsetY）を計算し、その座標から丸い波を拡大しています`,interactiveHint:`「再生」またはボタンの好きな場所（左端・中央・右端）をクリックしてみてください`,defaultDuration:.8,durationRange:{min:.25,max:2.2,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① ボタン内のどこが押されたか座標を測る`,detail:`中心ではなく「左端を押したら左端から波紋が広がる」のがリアリティの鍵です。`,codeHint:`e.clientX - rect.left`},{title:`② その座標に直径サイズの丸い波を置く`,detail:`overflow: hidden のボタン内部で、計測した X・Y の位置に円形 span を生成します。`,codeHint:`left: x; top: y; border-radius: 50%`},{title:`③ 一気に大きくしながら透明にして消す`,detail:`scale(0) → scale(2.8) へ広げつつ opacity を 0 にして、アニメ終了後に要素を削除します。`,codeHint:`scale(0 → 2.8) + opacity(0)`}],keywords:[`波紋`,`リップル`,`クリック`,`ボタン`,`フィードバック`],buildPrompt:(e,t)=>k({name:`クリック座標から広がる波紋（リップル）`,goal:`ボタンのどこをクリックしても、クリックした指先の位置を中心にして波紋がふわっと広がって消えるエフェクトにしたいです。`,mechanism:`ボタンに overflow: hidden; position: relative を設定し、クリック時に getBoundingClientRect() から相対座標（x, y）を算出して丸い波紋 span を配置し、scale(0→2.8) & opacity(0.5→0) のアニメーション後に削除します。`,requirements:[`アニメーションが終わった波紋用DOMは animationend イベントまたは setTimeout で必ず消去してください`,`波紋がボタンテキストのクリック判定を邪魔しないよう pointer-events: none を付けてください`],params:e,targetNote:t}),buildCode:e=>`<button class="ripple-btn" id="rippleBtn" type="button">クリックして波紋を見る</button>

<style>
.ripple-btn {
  position: relative;
  overflow: hidden;
  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid #d4d4d8;
  background: #ffffff;
  font-weight: 600;
  cursor: pointer;
}

.ripple-wave {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.25);
  pointer-events: none;
  transform: translate(-50%, -50%) scale(0);
  animation: rippleWave ${e.duration.toFixed(2)}s ease-out forwards;
}

@keyframes rippleWave {
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(2.8);
  }
}
</style>

<script>
(() => {
  const btn = document.getElementById("rippleBtn");
  if (!btn) return;
  btn.addEventListener("click", (e) => {
    const rect = btn.getBoundingClientRect();
    const wave = document.createElement("span");
    wave.className = "ripple-wave";
    wave.style.left = (e.clientX - rect.left) + "px";
    wave.style.top = (e.clientY - rect.top) + "px";
    btn.appendChild(wave);
    setTimeout(() => wave.remove(), ${Math.round(e.duration*1e3)});
  });
})();
<\/script>`},{id:`micro-underline-sweep`,category:`micro`,title:`入る時は左から・離れる時は右へ抜ける下線`,subtitle:`リンクにマウスを乗せると左から線が伸び、外すと右端へ向かってスッと抜ける粋な動き`,mechanismTag:`::after + transform-originの入れ替え`,xRayCaption:`普段の支点を「右」に、ホバー中だけの支点を「左」にすると方向が一直線に繋がります`,interactiveHint:`「再生」またはステージ内のリンクテキストにマウスを乗せて離してみてください`,defaultDuration:.45,durationRange:{min:.15,max:1.8,step:.05},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① 普段の下線は「右端」を支点にして縮める`,detail:`通常状態（マウスが離れている時）の基準点を right に設定し、scaleX(0) にしておきます。`,codeHint:`transform-origin: right; scaleX(0)`},{title:`② マウスが乗った瞬間だけ「左端」支点に切り替え`,detail:`:hover 時だけ基準点を left に書き換えて scaleX(1) に伸ばすと、左端から右へ線が伸びます。`,codeHint:`:hover { transform-origin: left; scaleX(1) }`},{title:`③ マウスが離れると「右端」支点に戻り右へ消える`,detail:`ホバーが外れた瞬間に基準点が right へ戻るため、線が左に引き返すのではなく右端へ通り抜けます。`,codeHint:`左→右の一方通行になる！`}],keywords:[`リンク`,`下線`,`ホバー`,`スイープ`,`左から右`,`メニュー`],buildPrompt:(e,t)=>k({name:`入る時は左から・離れる時は右へ抜ける下線`,goal:`ナビゲーションや文章内リンクにホバーしたとき、下線が左から伸びて、カーソルを離すと右へスッと抜けて消える洗練された動きにしたいです。`,mechanism:`::after の下線要素に対し、通常時は transform-origin: right; transform: scaleX(0) を指定し、:hover 時のみ transform-origin: left; transform: scaleX(1) に切り替えます。`,requirements:[`JavaScript は使わず CSS の transform-origin の切り替えだけで実装してください`,`タッチデバイスやキーボードフォーカス（:focus-visible）時にも反応するようにしてください`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<a href="#" class="sweep-link">詳しく仕組みを見てみる →</a>

<style>
.sweep-link {
  position: relative;
  display: inline-block;
  color: #18181b;
  text-decoration: none;
  padding-bottom: 4px;
}

.sweep-link::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 2px;
  background: #2563eb;
  transform: scaleX(0);
  transform-origin: right center;
  transition: transform ${e.duration.toFixed(2)}s ${t};
}

.sweep-link:hover::after,
.sweep-link:focus-visible::after {
  transform: scaleX(1);
  transform-origin: left center;
}
</style>`}},{id:`micro-magnetic-button`,category:`micro`,title:`マグネット吸い付きボタン（カーソル追従）`,subtitle:`カーソルを近づけると、磁石に引かれるようにボタンがわずかにポインター側へ寄ってくる`,mechanismTag:`マウス相対座標 × 係数(0.25)`,xRayCaption:`ボタン中心とカーソル座標の差（dx, dy）を計算し、少し弱い比率を掛けて吸い寄せています`,interactiveHint:`「再生」または枠内のボタン付近でマウスをゆっくり動かしてみてください`,defaultDuration:.35,durationRange:{min:.1,max:1.2,step:.05},secondarySlider:{label:`吸い付き強さ`,unit:`px`,min:6,max:28,step:2,defaultValue:14},defaultEasing:`snappy`,hasEasingControl:!1,steps:[{title:`① ボタンの中心とマウスのズレを測る`,detail:`ボタンの中央座標から見て、今カーソルが「右に何px、下に何px」にあるかを計算します。`,codeHint:`dx = mouseX - centerX`},{title:`② 全力ではなく「3割程度」だけ寄せる`,detail:`100%ついていくとボタンが逃げてしまうので、最大±14px程度の控えめな距離に抑えます。`,codeHint:`clamp(dx * 0.28, ±14px)`},{title:`③ 外れたらバネのように真ん中へ戻す`,detail:`カーソルが要素から離れたら座標を (0, 0) にリセットし、CSS の transition で元の位置へ戻します。`,codeHint:`onMouseLeave → translate(0, 0)`}],keywords:[`マグネット`,`磁石`,`追従`,`マウス`,`ホバー`,`ボタン`],buildPrompt:(e,t)=>k({name:`マグネット吸い付きボタン（カーソル追従）`,goal:`重要なCTAボタンにカーソルを乗せて動かすと、磁石に吸い寄せられるようにボタンが少しだけカーソル方向に追従する演出にしたいです。`,mechanism:`mousemove 時にボタン中心からのオフセットを計算して最大 ±${e.distance}px の範囲で translate(x, y) を与え、mouseleave 時に (0, 0) へ滑らかに戻します。`,requirements:[`スマホなどのタッチ端末（pointer: coarse）では無効化して不要なズレを防いでください`,`追従中もクリックが外れないよう移動量は現在の指定値程度に抑えてください`],params:e,secondaryLabel:`最大移動量`,secondaryUnit:`px`,targetNote:t}),buildCode:e=>`<button class="mag-btn" id="magBtn" type="button">EXPLORE MORE</button>

<style>
.mag-btn {
  padding: 14px 28px;
  border-radius: 9999px;
  border: 1px solid #18181b;
  background: #18181b;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
  transition: transform ${e.duration.toFixed(2)}s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>

<script>
(() => {
  const btn = document.getElementById("magBtn");
  if (!btn) return;
  const maxPull = ${e.distance};
  btn.addEventListener("mousemove", (e) => {
    const rect = btn.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    btn.style.transform = \`translate3d(\${relX * maxPull}px, \${relY * maxPull}px, 0)\`;
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "translate3d(0, 0, 0)";
  });
})();
<\/script>`},{id:`layout-sticky-split`,category:`layout`,title:`左説明固定 × 右スクロール（Sticky 2段組）`,subtitle:`左の見出しや案内だけを画面に留め、右側の詳細カードだけがスルスル流れる定番の立て付け`,mechanismTag:`2カラム + position: sticky`,xRayCaption:`左側カラムに position: sticky; top: 16px を指定し、親ブロックの終わりまで吸い付いて留まります`,interactiveHint:`「再生」で自動スクロールデモ、または枠内のミニページを直接スクロールできます`,defaultDuration:2.6,durationRange:{min:1,max:6,step:.2},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 画面を左右2つの列（Grid）に分ける`,detail:`左側に「見出しや目次」、右側に「縦長の特徴リスト」を並べる2カラム構成にします。`,codeHint:`grid-template-columns: 1fr 1.3fr`},{title:`② 左側の箱に align-self: start と sticky を付ける`,detail:`親と同じ高さに引き伸ばされないよう align-self: start を付け、position: sticky で上端に引っ掛けます。`,codeHint:`position: sticky; top: 24px`},{title:`③ 親のセクションが終わると自然に一緒に流れる`,detail:`position: fixed と違って画面を占有しっぱなしにならず、次のセクションが来たら自然に上へ押し流されます。`,codeHint:`fixed ではなく sticky！`}],keywords:[`レイアウト`,`立て付け`,`sticky`,`固定`,`2カラム`,`スクロール`],buildPrompt:(e,t)=>k({name:`左説明固定 × 右スクロール（Sticky 2段組）`,goal:`特徴紹介やFAQセクションで、左側の見出しコラムがスクロールに追従して固定され、右側の長いリストだけがスクロールする2カラムの立て付けにしたいです。`,mechanism:`親を display: grid; grid-template-columns: 1fr 1.3fr; align-items: start にし、左側要素に position: sticky; top: 32px を設定します（親に overflow: hidden を付けないのが注意点）。`,requirements:[`スマホ幅（768px未満）では1カラム縦積みに戻し、sticky を解除してください`,`position: sticky が効かなくなるため祖先要素に overflow: hidden を使わないでください（必要なら overflow: clip）`],params:e,targetNote:t}),buildCode:e=>`<section class="sticky-split">
  <div class="sticky-left">
    <h2>選ばれる3つの理由</h2>
    <p>右をスクロールしても左の見出しが見え続けます。</p>
  </div>
  <div class="scroll-right">
    <article class="card">特徴 01</article>
    <article class="card">特徴 02</article>
    <article class="card">特徴 03</article>
  </div>
</section>

<style>
.sticky-split {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 32px;
  align-items: start;
}

.sticky-left {
  position: sticky;
  top: 24px;
}

.card {
  padding: 20px;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  transition: transform ${e.duration.toFixed(2)}s ease, border-color ${e.duration.toFixed(2)}s ease;
}
.card:hover { transform: translateY(-2px); border-color: #cbd5e1; }

@media (max-width: 768px) {
  .sticky-split {
    grid-template-columns: 1fr;
  }
  .sticky-left {
    position: static;
  }
}
</style>`},{id:`layout-shrinking-header`,category:`layout`,title:`スクロールで縮む追従ヘッダー＋進捗バー`,subtitle:`最初はゆとりある高さで、読み始めるとスリムに縮み読了バーが伸びるサイト構造`,mechanismTag:`scroll量検知 + 状態クラス + scaleX`,xRayCaption:`スクロールが 24px を超えるとヘッダーが薄型モードへ切り替わり、底辺の青線が読了率に連動します`,interactiveHint:`「再生」またはミニページ内を上下にスクロールして変化を確認できます`,defaultDuration:.45,durationRange:{min:.15,max:1.5,step:.05},defaultEasing:`snappy`,hasEasingControl:!1,steps:[{title:`① ヘッダーを画面上端に貼り付ける`,detail:`スクロールしてもナビを見失わないよう、上端に sticky（または fixed）で固定します。`,codeHint:`position: sticky; top: 0`},{title:`② 少しスクロールしたらコンパクト化する`,detail:`スクロール位置が一定量を超えたら高さを少し縮め、薄い半透明ガラスと下線影を付けます。`,codeHint:`scrollTop > 24 → .is-compact`},{title:`③ 底辺に「どれだけ読んだか」のゲージを添える`,detail:`現在のスクロール割合（0〜1）を scaleX に渡すだけで、重くならない読了プログレスバーが作れます。`,codeHint:`transform: scaleX(progress)`}],keywords:[`ヘッダー`,`スクロール`,`追従`,`縮む`,`プログレスバー`,`立て付け`],buildPrompt:(e,t)=>k({name:`スクロールで縮む追従ヘッダー＋進捗バー`,goal:`ページをスクロールし始めると上部ヘッダーが少しスリムになって背景ぼかしが付き、下端に記事の読了進捗バーが伸びる構造にしたいです。`,mechanism:`sticky ヘッダーに対して scroll イベントで scrollY > 24 を判定しコンパクト状態クラスを切り替え、同時に計算したスクロール進捗率（0〜1）を下端のバーの scaleX に反映します。`,requirements:[`scroll イベントは requestAnimationFrame または passive: true で負荷を抑えてください`,`ヘッダーの高さが縮むときに本文がガクッと跳ねないよう padding または transform で調整してください`],params:e,targetNote:t}),buildCode:e=>`<header class="site-header" id="siteHeader">
  <div class="header-inner">
    <strong>MySite</strong>
    <nav>概要 / 機能 / 料金</nav>
  </div>
  <div class="read-bar" id="readBar"></div>
</header>

<style>
.site-header {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e4e4e7;
  transition: padding ${e.duration.toFixed(2)}s ease, box-shadow ${e.duration.toFixed(2)}s ease;
  padding: 16px 24px;
}

.site-header.is-compact {
  padding: 8px 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.read-bar {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 2px;
  background: #2563eb;
  transform-origin: left center;
  transform: scaleX(0);
}
</style>

<script>
(() => {
  const header = document.getElementById('siteHeader');
  const readBar = document.getElementById('readBar');
  if (!header || !readBar) return;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    header.classList.toggle('is-compact', y > 40);
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    readBar.style.transform = \`scaleX(\${Math.min(1, y / max)})\`;
  }, { passive: true });
})();
<\/script>`},{id:`layout-bento-grid`,category:`layout`,title:`Bento（弁当箱）グリッド配置レイアウト`,subtitle:`大小の四角い枠をパズルのように噛み合わせ、情報の重要度に強弱をつけるモダン構造`,mechanismTag:`CSS Grid span（2列・2行結合）`,xRayCaption:`基本のマス目を敷き、目玉要素だけ「横2マス（col-span-2）」や「縦2行（row-span-2）」に広げています`,interactiveHint:`「再生」で各ブロックが順に組まれる様子と、マス目構造を確認できます`,defaultDuration:.6,durationRange:{min:.25,max:2.2,step:.05},secondarySlider:{label:`マス間の余白`,unit:`px`,min:6,max:24,step:2,defaultValue:12},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 均等な方眼マス目をベースに引く`,detail:`まず 3列や4列の均等な格子（Grid）を用意します。これが「弁当箱の仕切り」の基準になります。`,codeHint:`grid-template-columns: repeat(3, 1fr)`},{title:`② 一番見せたい要素だけ「2マス分」占有させる`,detail:`すべて同じ大きさだと単調になるため、主役カードだけ横2列や縦2行にまたがらせます。`,codeHint:`grid-column: span 2 / grid-row: span 2`},{title:`③ 均等なすき間（gap）と角丸で統一感を出す`,detail:`サイズが違う箱が並んでも、すき間（gap）と角丸の半径を全カードで揃えるだけでプロっぽく整います。`,codeHint:`gap: 12px; border-radius: 16px`}],keywords:[`Bento`,`ベントー`,`グリッド`,`レイアウト`,`配置`,`立て付け`,`カード`],buildPrompt:(e,t)=>k({name:`Bento（弁当箱）グリッド配置レイアウト`,goal:`特徴や機能紹介セクションを、大小のカードが美しく噛み合うBentoグリッド型のレイアウトにしたいです。`,mechanism:`CSS Grid（PC時は3列または4列、gap: ${e.distance}px）を敷き、主役カードには grid-column: span 2 や grid-row: span 2 を指定して大小の強弱を作ります。`,requirements:[`モバイル幅（640px未満）では自動的に1列縦並びにフォールバックさせてください`,`すべてのカードで border-radius と枠線トーンを統一し、カードの入れ子（枠の中に枠）を避けてください`],params:e,secondaryLabel:`カード間の余白`,secondaryUnit:`px`,targetNote:t}),buildCode:e=>`<section class="bento-grid">
  <div class="bento-item bento-wide">主役機能（横2マス）</div>
  <div class="bento-item">サブ指標</div>
  <div class="bento-item">補足A</div>
  <div class="bento-item">補足B</div>
  <div class="bento-item">補足C</div>
</section>

<style>
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${e.distance}px;
}

.bento-item {
  padding: 20px;
  border-radius: 16px;
  border: 1px solid #e4e4e7;
  background: #ffffff;
}

.bento-wide {
  grid-column: span 2;
}

@media (max-width: 640px) {
  .bento-grid { grid-template-columns: 1fr; }
  .bento-wide { grid-column: span 1; }
}
</style>`},{id:`layout-marquee-loop`,category:`layout`,title:`途切れない無限ループ・マーキー帯`,subtitle:`導入企業ロゴや新着タグが、継ぎ目なくずっと右から左へ流れ続ける帯レイアウト`,mechanismTag:`同じリスト2個並び + translateX(-50%)`,xRayCaption:`同じセット（A・B）を2回連続で並べておき、1セット分（-50%）動いたら0%へ瞬間リセットします`,interactiveHint:`「再生」で一時停止／再開・ホバーやタップでピタッと止まる動きも確認できます`,defaultDuration:12,durationRange:{min:4,max:30,step:1},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 同じ中身を「2セット分」横に並べる`,detail:`1セットだけだと流れ切ったあとに空白ができます。全く同じ配列を2つ繋げて並べるのが種明かしです。`,codeHint:`[Set A] + [Set A (複製)]`},{title:`② 全体のちょうど半分（-50%）だけ左へ動かす`,detail:`等速（linear）で 0% → -50% へ動かすと、2セット目の先頭がちょうど最初の位置に来ます。`,codeHint:`translateX(-50%) + linear`},{title:`③ マウスを乗せたら読めるよう一時停止させる`,detail:`:hover 時に animation-play-state: paused を入れておくと、気になった項目を止められます。`,codeHint:`animation-play-state: paused`}],keywords:[`マーキー`,`ループ`,`無限`,`ロゴ`,`流れる`,`ティッカー`],buildPrompt:(e,t)=>k({name:`途切れない無限ループ・マーキー帯`,goal:`ロゴやタグの一覧が継ぎ目なくずっと横方向へ流れ続け、マウスを乗せると一時停止するマーキー帯を作りたいです。`,mechanism:`同じリストアイテム群を2セット横並びに連結し、overflow: hidden の外枠の中で linear 無限ループで translateX(0) から translateX(-50%) まで ${e.duration.toFixed(0)}秒かけて動かします。`,requirements:[`複製側のリストにはスクリーンリーダーが二重に読まないよう aria-hidden="true" を付けてください`,`左右の端に淡いグラデーションマスクを掛けるとさらに自然に出入りして見えます`],params:e,targetNote:t}),buildCode:e=>`<div class="marquee-wrap">
  <div class="marquee-track">
    <span>Fast UI</span><span>Zero Bloat</span><span>Clear Motion</span><span>Accessible</span>
    <span aria-hidden="true">Fast UI</span><span aria-hidden="true">Zero Bloat</span>
    <span aria-hidden="true">Clear Motion</span><span aria-hidden="true">Accessible</span>
  </div>
</div>

<style>
.marquee-wrap {
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent);
  mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent);
}

.marquee-track {
  display: flex;
  gap: 16px;
  width: max-content;
  animation: marqueeLoop ${e.duration.toFixed(1)}s linear infinite;
}

.marquee-wrap:hover .marquee-track {
  animation-play-state: paused;
}

@keyframes marqueeLoop {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
</style>`},{id:`layout-skeleton-toast`,category:`layout`,title:`読み込みスケルトン＆通知トースト`,subtitle:`待ち時間の不安を和らげる「光の帯スケルトン」と、完了を知らせる「右下トースト」`,mechanismTag:`光帯スライド + 下端からトースト出現`,xRayCaption:`灰色の仮枠の上を斜めの光（gradient）が横切り、完了時には下端から通知カードが浮かびます`,interactiveHint:`「再生」を押すと読み込み中（スケルトン）→ 完了通知（トースト）の流れが実演されます`,defaultDuration:1.6,durationRange:{min:.5,max:4,step:.1},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 本物の記事と同じ形の「灰色の型」を先に置く`,detail:`ぐるぐる回るアイコンより、これから表示される形を薄いグレーで先に見せると待ち時間が短く感じます。`,codeHint:`骨格プレースホルダー`},{title:`② 左から右へ薄い光のグラデーションを流す`,detail:`灰色の枠の上を白い半透明のグラデーション帯を繰り返し通過させ「通信中」を伝えます。`,codeHint:`translateX(-100% → 100%)`},{title:`③ 完了時に邪魔にならない角からトーストを出す`,detail:`「保存しました」などの通知は中央モーダルで操作を止めず、右下や下部から数秒だけ浮かせます。`,codeHint:`role="status" / 数秒後に退場`}],keywords:[`スケルトン`,`ローディング`,`読み込み`,`トースト`,`通知`,`待機`],buildPrompt:(e,t)=>k({name:`読み込みスケルトン＆通知トースト`,goal:`データ読み込み中は実際のカードに近い形のスケルトンが左から右へ光り、処理完了時は右下（または下部）に完了トーストがスッと現れて数秒後に消えるようにしたいです。`,mechanism:`グレー枠の上に ::after の斜め白グラデーション層を重ねて translateX(-100%→100%) をループさせ、完了時は role="status" のトーストを translateY(16px→0) & opacity(0→1) で出現させます。`,requirements:[`通知トーストはユーザーの操作をブロックしない位置（右下など）に配置し、約3秒で自動的に消えるようにしてください`,`スクリーンリーダー向けに通知要素へ aria-live="polite" を設定してください`],params:e,targetNote:t}),buildCode:e=>`<button id="saveDemoBtn" type="button">保存して通知を表示</button>
<div class="skeleton-box" id="skeletonBox"></div>
<div class="toast-msg" id="toastMsg" role="status" aria-live="polite">保存が完了しました</div>

<style>
.skeleton-box {
  position: relative;
  overflow: hidden;
  height: 20px;
  border-radius: 8px;
  background: #e4e4e7;
}

.skeleton-box::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent);
  animation: shimmer ${e.duration.toFixed(2)}s infinite;
}

.toast-msg {
  position: fixed;
  right: 20px;
  bottom: 20px;
  padding: 10px 16px;
  border-radius: 10px;
  background: #18181b;
  color: #ffffff;
  opacity: 0;
  transform: translateY(16px);
  pointer-events: none;
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-msg.is-show {
  opacity: 1;
  transform: translateY(0);
}

@keyframes shimmer {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}
</style>

<script>
(() => {
  const toast = document.getElementById('toastMsg');
  const skeleton = document.getElementById('skeletonBox');
  const saveBtn = document.getElementById('saveDemoBtn');
  if (!toast || !skeleton || !saveBtn) return;
  let timer;

  saveBtn.addEventListener('click', () => {
    skeleton.hidden = false;
    clearTimeout(timer);
    setTimeout(() => {
      skeleton.hidden = true;
      toast.classList.add('is-show');
      timer = setTimeout(() => toast.classList.remove('is-show'), 2500);
    }, ${(e.duration*1e3).toFixed(0)});
  });
})();
<\/script>`}],P=[{id:`hf-classic-header`,category:`header`,title:`王道3分割1行ヘッダー（迷わない定番）`,subtitle:`左にロゴ・中央にリンク4つ・右端に主役ボタンを置く、初見の人が一瞬で理解できるヘッダー配置`,mechanismTag:`Flex 3分割（左・中・右）+ レスポンシブ切替`,xRayCaption:`「左＝サイト名」「中＝ページ移動」「右＝大事な行動ボタン」の役割を 1 行に整理しています`,interactiveHint:`右上の「PC / スマホ」で狭い画面幅での折りたたみ方も確認できます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.35,durationRange:{min:.15,max:1,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 横並び 3 ブロックを justify-between で離す`,detail:`左端にロゴ、真ん中にナビゲーション、右端に注目ボタンを置いて視線の流れを作ります。`,codeHint:`display: flex; justify-content: space-between; align-items: center`},{title:`② 高さは 56〜64px、リンクは 4〜5 個までに絞る`,detail:`項目が多すぎると折り返して窮屈になるため、最重要のページだけ並べるのがコツです。`,codeHint:`height: 60px; gap: 24px`},{title:`③ スマホ幅ではリンク群を隠しメニューボタンへ`,detail:`768px 未満では中央リンクを非表示にし、右端にハンバーガーアイコンを出して崩れを防ぎます。`,codeHint:`@media (max-width: 767px) { .nav { display: none; } }`}],keywords:[`ヘッダー`,`header`,`定番`,`3分割`,`ナビゲーション`,`静的`,`レスポンシブ`,`CTA`],buildPrompt:(e,t)=>k({name:`王道3分割1行ヘッダー`,goal:`左端にロゴ、中央に主要リンク4件、右端にアクションボタンを配置したシンプルで迷わない1行ヘッダーにする。`,mechanism:`display: flex + justify-content: space-between による水平配置と、スマホ幅でのハンバーガー折りたたみ切替。`,isStatic:!0,requirements:[`ヘッダー高さは 56〜64px に抑え、初回表示の面積を取りすぎないようにする`,`右端ボタンだけ背景色を付けて「次に押すべき場所」を明確にする`,`画面幅 768px 未満ではリンク群を折りたたんでメニューボタンに切り替える`],params:e,targetNote:t}),buildCode:()=>`<header class="site-header">
  <a href="/" class="brand">Katakata</a>
  <nav class="main-nav" aria-label="メインナビ">
    <a href="#features">特徴</a>
    <a href="#guide">使い方</a>
    <a href="#pricing">料金</a>
    <a href="#cases">事例</a>
  </nav>
  <a href="#start" class="cta-btn">はじめる</a>
  <button type="button" class="menu-toggle" aria-expanded="false" aria-label="メニューを開く">≡</button>
</header>

<style>
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 60px;
  padding: 0 24px;
  background: #ffffff;
  border-bottom: 1px solid #e4e4e7;
}
.brand { font-weight: 800; color: #18181b; text-decoration: none; }
.main-nav { display: flex; gap: 24px; font-size: 14px; }
.main-nav a { color: #52525b; text-decoration: none; }
.cta-btn {
  padding: 8px 16px;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}
.menu-toggle { display: none; border: 1px solid #e4e4e7; background: #fff; border-radius: 6px; padding: 6px 10px; }

@media (max-width: 767px) {
  .main-nav, .cta-btn { display: none; }
  .menu-toggle { display: inline-flex; }
}
</style>`},{id:`hf-centered-brand`,category:`header`,title:`ロゴ中央・左右振り分けヘッダー（雑誌・ブランド風）`,subtitle:`左右の文字量が違っていてもブランドロゴが画面のど真ん中にビシッと座る設計`,mechanismTag:`3列均等Grid（1fr auto 1fr）による厳密センター配置`,xRayCaption:`両端の枠を同じ「1fr」幅にすることで、左右の項目数に差があっても中央ロゴが一切ズレません`,interactiveHint:`右上の「PC / スマホ」でスマホ幅（左≡ / 中央ロゴ / 右検索）への変化を確認できます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.35,durationRange:{min:.15,max:1,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① Flexbox ではなく CSS Grid（1fr auto 1fr）を使う`,detail:`justify-content: space-between では左と右の文字長の違いでロゴが偏りますが、1fr が両端の重みを均一にします。`,codeHint:`grid-template-columns: 1fr auto 1fr`},{title:`② 左に閲覧リンク、右に補助アイコンを分ける`,detail:`左側を読み物系メニュー、右側を検索・問い合わせなど補助導線に分けるとバランスが取れます。`,codeHint:`justify-self: end`},{title:`③ スマホ幅でも「中央ロゴ」だけは崩さない`,detail:`同じ 3 列構造のまま、左＝メニューボタン、中央＝ロゴ、右＝虫眼鏡の 3 点へ自然に縮約できます。`,codeHint:`display: grid; align-items: center`}],keywords:[`ヘッダー`,`header`,`中央`,`ロゴ`,`ブランド`,`雑誌`,`grid`,`静的`],buildPrompt:(e,t)=>k({name:`ロゴ中央・左右振り分けヘッダー`,goal:`雑誌やポートフォリオのようにブランドロゴを厳密に中央へ配置し、左右にメニューと補助機能を品よく振り分ける。`,mechanism:`CSS Grid の grid-template-columns: 1fr auto 1fr を使って左右の余白バランスを自動均一化。`,isStatic:!0,requirements:[`justify-content: space-between ではなく grid-template-columns: 1fr auto 1fr を採用して中央ズレを防ぐ`,`モバイル時も「左：メニュー／中：ロゴ／右：検索アイコン」の 3 点構造を維持する`],params:e,targetNote:t}),buildCode:()=>`<header class="brand-header">
  <nav class="left-links" aria-label="特集メニュー">
    <a href="#journal">特集</a>
    <a href="#stories">読みもの</a>
  </nav>
  <a href="/" class="center-logo">ATELIER</a>
  <div class="right-tools">
    <a href="#about">案内</a>
    <button type="button" aria-label="検索">検索</button>
  </div>
</header>

<style>
.brand-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: 64px;
  padding: 0 24px;
  background: #ffffff;
  border-bottom: 1px solid #e4e4e7;
}
.left-links { display: flex; gap: 18px; font-size: 13px; }
.center-logo {
  font-weight: 800;
  letter-spacing: 0.2em;
  color: #18181b;
  text-decoration: none;
}
.right-tools {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  font-size: 13px;
}
</style>`},{id:`hf-floating-pill`,category:`header`,title:`浮き島ピル型スマートヘッダー（スクロールで隠れて戻る）`,subtitle:`画面上部から少し浮いたカプセル型のヘッダー。下に読む時は邪魔にならず引っ込み、上に少し戻すと再出現します`,mechanismTag:`角丸ピル浮遊 + スクロール上下方向判定（Smart Hide）`,xRayCaption:`前回のスクロール量（prevY）と現在位置を比較し、「下へ進んだら上退避」「少し上へ戻ったら再表示」を切り替えます`,interactiveHint:`「再生」または枠内の本文を上下にスクロールして動きを確かめられます`,defaultDuration:.55,durationRange:{min:.2,max:1.8,step:.05},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① 上端から少し浮かせてカプセル型にする`,detail:`画面端にベタッと貼らず、top: 12px と border-radius: 9999px で軽やかな浮遊感を作ります。`,codeHint:`position: sticky; top: 12px; border-radius: 9999px`},{title:`② 前回のスクロール位置と大小を比べる`,detail:`下へスクロール中（currentY > prevY）は画面外の -140% へ隠し、読むスペースを最大化します。`,codeHint:`header.classList.toggle("is-hidden", y > 80 && y > prevY)`},{title:`③ 上へ少しでも戻ったら即座に降ろす`,detail:`「上へ戻ろうとした＝メニューが見たい合図」と判定してスッと戻すと使い心地が一気に上がります。`,codeHint:`transform: translateY(-150%) ↔ translateY(0)`}],keywords:[`ヘッダー`,`浮き島`,`ピル`,`スマートヘッダー`,`スクロール`,`隠れる`,`追従`],buildPrompt:(e,t)=>k({name:`浮き島ピル型スマートヘッダー`,goal:`画面上部から少し浮いた角丸カプセル型のヘッダーを配置し、下方向スクロールで一時退避・上方向スクロールで再表示させる。`,mechanism:`scroll イベントで前回スクロール座標 prevY との増減を判定し、translateY(-150%) と translateY(0) を切り替える。`,requirements:[`最上部付近（scrollY <= 80）では必ず表示状態に保つ`,`高さ・横幅はコンテンツに合わせ max-width を制限し、背景に薄い透過＋ぼかしを加える`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<header id="smartPill" class="pill-header">
  <span class="pill-logo">Atlas</span>
  <nav class="pill-links">
    <a href="#overview">概要</a>
    <a href="#features">機能</a>
    <a href="#start" class="pill-cta">開始</a>
  </nav>
</header>

<style>
.pill-header {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translate(-50%, 0);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 8px 18px;
  border-radius: 9999px;
  border: 1px solid rgba(228, 228, 231, 0.9);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transition: transform ${e.duration.toFixed(2)}s ${t};
  z-index: 50;
}
.pill-header.is-hidden {
  transform: translate(-50%, -160%);
}
</style>

<script>
(() => {
  const pill = document.getElementById('smartPill');
  if (!pill) return;
  let prevY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    pill.classList.toggle('is-hidden', y > 80 && y > prevY);
    prevY = y;
  }, { passive: true });
})();
<\/script>`}},{id:`hf-mega-menu`,category:`header`,title:`広く見渡せるメガメニュー展開ヘッダー`,subtitle:`小さな縦並びリストではなく、説明付きカードを横に広げたパネルで迷わず目的ページを探せる構成`,mechanismTag:`親ヘッダー基準 + 全幅絶対配置パネル（Grid 3列）`,xRayCaption:`ヘッダーのすぐ下に position: absolute の横幅パネルを吊り下げ、opacity と translateY で開きます`,interactiveHint:`「再生」またはヘッダー内の「機能一覧」ボタンをクリックして開閉できます`,defaultDuration:.45,durationRange:{min:.15,max:1.6,step:.05},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① ヘッダーを親基準（position: relative）にする`,detail:`メニューボタンの狭い幅に引っ張られず、ヘッダー全幅で展開するパネルの土台を作ります。`,codeHint:`.header-wrap { position: relative; }`},{title:`② パネル内を 3 列カードにして説明を添える`,detail:`リンク名だけでなく「何ができるか」を 1 行添えると、クリック前の迷いがなくなります。`,codeHint:`grid-template-columns: repeat(3, 1fr)`},{title:`③ opacity とわずかな縦移動で出す`,detail:`閉じる時は pointer-events: none を掛けて下の要素のクリックを邪魔しないようにします。`,codeHint:`pointer-events: none ↔ auto`}],keywords:[`ヘッダー`,`メガメニュー`,`ドロップダウン`,`パネル`,`一覧`,`情報設計`],buildPrompt:(e,t)=>k({name:`広く見渡せるメガメニュー展開ヘッダー`,goal:`ナビ項目をクリック／ホバーした際、ヘッダー下部に横3列カード形式の大きな案内パネルを滑らかに展開する。`,mechanism:`relative なヘッダー下に absolute のワイドパネルを配置し、aria-expanded 連動で opacity と translateY を切り替え。`,requirements:[`非表示時は pointer-events: none と aria-hidden="true" を設定する`,`Escape キーやパネル外クリックで直感的に閉じられるようにする`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<header class="mega-header" id="megaHeader">
  <span class="logo">Atlas</span>
  <button type="button" id="megaToggle" aria-expanded="false">機能一覧 ▾</button>

  <div class="mega-panel" id="megaPanel" aria-hidden="true">
    <a href="#tools" class="mega-card"><strong>制作ツール</strong><span>直感的な編集画面</span></a>
    <a href="#ai" class="mega-card"><strong>AI支援</strong><span>指示文を自動生成</span></a>
    <a href="#security" class="mega-card"><strong>安全設計</strong><span>CSP・サニタイズ実装</span></a>
  </div>
</header>

<style>
.mega-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #ffffff;
  border-bottom: 1px solid #e4e4e7;
}
.mega-panel {
  position: absolute;
  left: 16px;
  right: 16px;
  top: calc(100% + 8px);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-8px);
  transition: opacity ${e.duration.toFixed(2)}s ease, transform ${e.duration.toFixed(2)}s ${t};
}
.mega-panel.is-open {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}
</style>

<script>
(() => {
  const btn = document.getElementById('megaToggle');
  const panel = document.getElementById('megaPanel');
  if (!btn || !panel) return;
  btn.addEventListener('click', () => {
    const open = panel.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
  });
})();
<\/script>`}},{id:`hf-sitemap-footer`,category:`footer`,title:`安心の3列サイトマップ・フッター（王道着地）`,subtitle:`ページの最下部でサイト全体を見渡し直せる、ブランド説明＋カテゴリ列＋コピーライトの標準構造`,mechanismTag:`Grid 列配分（ブランド 1.3fr + リンク3列）`,xRayCaption:`濃い背景色に変えて「ページの終着点」を視覚的に伝え、スマホ幅では 2 列に折りたたみます`,interactiveHint:`右上の「PC / スマホ」で狭い画面での 2 列折りたたみ構造を確認できます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.35,durationRange:{min:.15,max:1,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 左列を少し広げてブランドの要約を置く`,detail:`1.3fr 程度の幅を取り、サイト名と短い一言説明を置いてから右へリンク列を並べます。`,codeHint:`grid-template-columns: 1.3fr 1fr 1fr 1fr`},{title:`② 下端にコピーライト帯を細線で区切る`,detail:`border-top で情報エリアと著作権表記を分けると、画面全体が引き締まって見えます。`,codeHint:`border-top: 1px solid #27272a`},{title:`③ スマホ幅ではブランド欄を横全幅（col-span-2）に`,detail:`ブランド説明を一番上に 1 行取り、下のリクエスト欄を 2 列で並べると縦長になりすぎません。`,codeHint:`grid-template-columns: repeat(2, 1fr)`}],keywords:[`フッター`,`footer`,`サイトマップ`,`多列`,`定番`,`静的`,`レスポンシブ`],buildPrompt:(e,t)=>k({name:`安心の3列サイトマップ・フッター`,goal:`ページ最下部にブランドの短い紹介と3列のカテゴリリンク、下端コピーライト帯を備えた落ち着いた着地フッターを作る。`,mechanism:`CSS Grid で PC時は「紹介1.3fr ＋ リンク3列」、スマホ時は「紹介全幅 ＋ 2列」に切り替える。`,isStatic:!0,requirements:[`本文との境界がはっきり分かる背景トーン差と上下の余白を十分にとる`,`各リンクにはキーボードフォーカスリングとホバー明度変化を付ける`],params:e,targetNote:t}),buildCode:()=>`<footer class="site-footer">
  <div class="footer-grid">
    <div class="footer-brand">
      <strong>KatakataLab</strong>
      <p>作りながら学べる Web の表現と道具の図鑑。</p>
    </div>
    <div>
      <h4>図鑑</h4>
      <ul><li><a href="#text">文字の動き</a></li><li><a href="#search">検索UI</a></li></ul>
    </div>
    <div>
      <h4>学ぶ</h4>
      <ul><li><a href="#steps">仕組み解説</a></li><li><a href="#prompt">AI指示文</a></li></ul>
    </div>
    <div>
      <h4>案内</h4>
      <ul><li><a href="#terms">利用規約</a></li><li><a href="#contact">連絡先</a></li></ul>
    </div>
  </div>
  <div class="footer-bottom">© 2026 KatakataLab</div>
</footer>

<style>
.site-footer { background: #18181b; color: #a1a1aa; padding: 40px 24px 24px; font-size: 13px; }
.footer-grid {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.3fr repeat(3, 1fr);
  gap: 24px;
}
.footer-brand strong { color: #ffffff; font-size: 15px; }
.footer-grid h4 { margin: 0 0 8px; color: #ffffff; font-size: 13px; }
.footer-grid ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
.footer-grid a { color: inherit; text-decoration: none; }
.footer-bottom {
  max-width: 1080px;
  margin: 28px auto 0;
  padding-top: 16px;
  border-top: 1px solid #27272a;
  font-size: 12px;
}
@media (max-width: 767px) {
  .footer-grid { grid-template-columns: repeat(2, 1fr); }
  .footer-brand { grid-column: 1 / -1; }
}
</style>`},{id:`hf-minimal-footer`,category:`footer`,title:`超軽量1行ミニマルフッター（道具・アプリ向け）`,subtitle:`Webアプリや個人ポートフォリオで主役画面の邪魔をしない、細線1本と最小リンクだけの引き算フッター`,mechanismTag:`1px 上線 + Flex 両端寄せ（スマホは中央2段）`,xRayCaption:`情報量をコピーライト＋3リンクまでに削ることで、主役コンテンツの余韻を保ちます`,interactiveHint:`右上の「PC / スマホ」で狭い画面時の中央2段並びを確認できます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.35,durationRange:{min:.15,max:1,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① リンクを 3 つ程度に絞って 1 行に収める`,detail:`道具系のサイトでは巨大なフッターは不要なので、規約・連絡・使い方程度に厳選します。`,codeHint:`display: flex; justify-content: space-between`},{title:`② 濃い色ではなく薄い境界線だけで区切る`,detail:`背景は白または薄いグレー（#fafafa）のまま 1px の上線を入れると圧迫感が出ません。`,codeHint:`border-top: 1px solid #e4e4e7`},{title:`③ スマホ幅では中央揃えの縦並びへ`,detail:`横並びに無理やり詰め込まず、flex-direction: column + align-items: center で美しく畳みます。`,codeHint:`@media (max-width: 639px) { flex-direction: column; }`}],keywords:[`フッター`,`footer`,`ミニマル`,`1行`,`シンプル`,`ツール`,`静的`],buildPrompt:(e,t)=>k({name:`超軽量1行ミニマルフッター`,goal:`コピーライトと最小限のリンク（2〜3個）だけを 1 行に整えた、道具アプリ・個人サイト向けの軽快なフッターにする。`,mechanism:`薄い上境界線と Flexbox 両端配置を使い、モバイル幅でのみ中央揃えの縦2段へ切り替える。`,isStatic:!0,requirements:[`フッターの高さが画面を圧迫しないよう上下パディングは 16〜24px に抑える`,`文字色は控えめなグレーにし、クリック可能なリンクのみホバーで濃くする`],params:e,targetNote:t}),buildCode:()=>`<footer class="mini-footer">
  <span>© 2026 KatakataLab</span>
  <nav class="mini-links" aria-label="フッター案内">
    <a href="#how-to">使い方</a>
    <a href="#privacy">規約</a>
    <a href="#contact">連絡</a>
  </nav>
</footer>

<style>
.mini-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 24px;
  border-top: 1px solid #e4e4e7;
  background: #fafafa;
  color: #71717a;
  font-size: 12px;
}
.mini-links { display: flex; gap: 16px; }
.mini-links a { color: inherit; text-decoration: none; }
.mini-links a:hover { color: #18181b; }
@media (max-width: 639px) {
  .mini-footer { flex-direction: column; text-align: center; }
}
</style>`},{id:`hf-curtain-reveal-footer`,category:`footer`,title:`最下部で幕が上がって現れるリビール・フッター`,subtitle:`本文の後ろにフッターを隠しておき、最後まで読み終えると幕が上がるように姿を見せる独創的演出`,mechanismTag:`背面固定フッター (z:1) + 前面本文シート (z:2)`,xRayCaption:`フッター自体が動くのではなく、前面の白い本文ブロックの底に余白を開けて上へ過ぎ去らせています`,interactiveHint:`「再生」または枠内を一番下までスクロールして動きを確認できます`,defaultDuration:2.2,durationRange:{min:1,max:5,step:.2},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① フッターを一番奥（z-index: 1）に固定配置する`,detail:`position: fixed または sticky で画面下端に待機させ、最初は本文シートの裏に隠します。`,codeHint:`position: fixed; bottom: 0; z-index: 1`},{title:`② 本文ラッパーを手前（z-index: 2）にして影を落とす`,detail:`前面の本文にはっきりとした背景色と下側の影を付け、後ろのフッターを完全に覆います。`,codeHint:`position: relative; z-index: 2; background: #fff`},{title:`③ 本文の下にフッター高さ分の margin-bottom を空ける`,detail:`最後までスクロールして本文が上へ抜けると、空いた空間から奥のフッターが顔を出します。`,codeHint:`margin-bottom: var(--footer-height)`}],keywords:[`フッター`,`footer`,`リビール`,`幕上がり`,`独創的`,`奥行き`,`z-index`,`スクロール`],buildPrompt:(e,t)=>k({name:`最下部で幕が上がって現れるリビール・フッター`,goal:`通常時は本文の裏に待機しているフッターが、ページ最下部までスクロールすると前面の本文が幕のように上がり姿を現す仕掛けを作る。`,mechanism:`背面固定（fixed; bottom: 0; z-index: 1）のフッターと、前面（z-index: 2）でフッター高さ分の margin-bottom を持つ本文セクションを重ねる。`,requirements:[`フッター内容がスマホ画面からはみ出す場合は、安全のためモバイル時は通常の静的フッターへフォールバックする`,`背面フッター内のリンクは本文が通り過ぎた後のみ操作される設計にする`],params:e,targetNote:t}),buildCode:e=>`<main class="curtain-main">
  <h1>記事やコンテンツの本文</h1>
  <p>最後までスクロールすると、下の暗いフッターが見えてきます。</p>
</main>

<footer class="reveal-footer">
  <h2>次のアイデアを、形にしよう。</h2>
  <a href="#top">一番上へ戻る</a>
</footer>

<style>
:root { --footer-h: 220px; }

.curtain-main {
  position: relative;
  z-index: 2;
  background: #ffffff;
  margin-bottom: var(--footer-h);
  padding: 48px 24px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
  transition: transform ${e.duration.toFixed(2)}s ease;
}

.reveal-footer {
  position: fixed;
  inset: auto 0 0 0;
  height: var(--footer-h);
  z-index: 1;
  background: #18181b;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

@media (max-width: 767px) {
  .curtain-main { margin-bottom: 0; box-shadow: none; }
  .reveal-footer { position: static; height: auto; padding: 36px 20px; }
}
</style>`}],F=[{id:`craft-flip-card`,category:`craft`,title:`くるっと裏返る3D解説フリップカード`,subtitle:`表面に見出しや写真、クリック／再生で立体的に180度反転して裏側の種明かし・詳細を見せるカード`,mechanismTag:`preserve-3d + rotateY(180deg) + 裏面非表示`,xRayCaption:`表と裏の箱を背中合わせで重ね、両方とも backface-visibility: hidden で裏側を隠しています`,interactiveHint:`「再生」またはカードそのものをクリックして表裏を裏返せます`,defaultDuration:.75,durationRange:{min:.25,max:2.2,step:.05},defaultEasing:`spring`,hasEasingControl:!0,steps:[{title:`① 外枠に遠近感（perspective）を設定する`,detail:`親ボックスに perspective: 900px を与えると、回った時に手前が大きく奥が小さい立体感が出ます。`,codeHint:`perspective: 900px`},{title:`② 内側の回転体に preserve-3d を指定する`,detail:`表面と裏面を入れた回転パネルに transform-style: preserve-3d を指定し、3D空間を保ちます。`,codeHint:`transform-style: preserve-3d`},{title:`③ 裏面は最初から 180度回して背面隠し`,detail:`表も裏も backface-visibility: hidden を付けると、裏を向いた側が消えて正しく入れ替わります。`,codeHint:`backface-visibility: hidden`}],keywords:[`カード`,`フリップ`,`裏返し`,`3D`,`回転`,`クイズ`,`解説`,`インタラクティブ`],buildPrompt:(e,t)=>k({name:`くるっと裏返る3D解説フリップカード`,goal:`カードをクリックすると立体的に Y 軸 180 度回転し、裏面に隠れていた補足解説が現れるフリップカードを作る。`,mechanism:`perspective + transform-style: preserve-3d + backface-visibility: hidden により表面と rotateY(180deg) の裏面を切り替え。`,requirements:[`クリック可能なカード全体は <button> にし、aria-pressed で反転状態を伝える`,`表と裏の文字が反転中や回転後に重なって透けないよう backface-visibility: hidden を両方に入れる`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="flip-scene">
  <button type="button" class="flip-card" id="flipCard" aria-pressed="false">
    <span class="face front">表面：クリックで裏返す</span>
    <span class="face back">裏面：種明かしや詳細解説</span>
  </button>
</div>

<style>
.flip-scene { perspective: 900px; width: 280px; height: 170px; }
.flip-card {
  position: relative;
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
  transform-style: preserve-3d;
  transition: transform ${e.duration.toFixed(2)}s ${t};
  cursor: pointer;
}
.flip-card.is-flipped { transform: rotateY(180deg); }
.face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 14px;
  backface-visibility: hidden;
  padding: 16px;
}
.front { background: #ffffff; border: 1px solid #e4e4e7; color: #18181b; }
.back { background: #18181b; color: #ffffff; transform: rotateY(180deg); }
</style>

<script>
(() => {
  const card = document.getElementById('flipCard');
  if (!card) return;
  card.addEventListener('click', () => {
    const flipped = card.classList.toggle('is-flipped');
    card.setAttribute('aria-pressed', String(flipped));
  });
})();
<\/script>`}},{id:`craft-before-after`,category:`craft`,title:`ツマミで引っ張るビフォー・アフター比較`,subtitle:`改善前と改善後の画面・写真をぴったり同じ位置に重ね、中央の線をつまんで左右に比較するインタラクティブUI`,mechanismTag:`同位置重ね + clip-path: inset(切り抜き%)`,xRayCaption:`幅（width）を縮めると中身が潰れるため、幅は 100% のまま clip-path で見える範囲だけ切り抜いています`,interactiveHint:`「再生」で自動比較、または青いつまみを左右にドラッグして見比べられます`,defaultDuration:1.6,durationRange:{min:.5,max:4,step:.1},secondarySlider:{label:`初期分割位置`,unit:`%`,min:20,max:80,step:5,defaultValue:50},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① Before と After をまったく同じ大きさで重ねる`,detail:`2つの画面を position: absolute; inset: 0 で完全にぴったり重ね合わせます。`,codeHint:`position: absolute; inset: 0`},{title:`② 手前だけを clip-path: inset() で隠す`,detail:`右側から何%隠すかを変化させると、絵や文字の比率が一切歪まずスッと境目だけが動きます。`,codeHint:`clip-path: inset(0 calc(100% - var(--split)) 0 0)`},{title:`③ Pointer イベント（マウス/指の両対応）で割合更新`,detail:`カーソル横位置 ÷ 枠幅 を 5%〜95% に丸め、レンジスライダー並みの滑らかな比較体験を実現します。`,codeHint:`pointerdown / pointermove`}],keywords:[`比較`,`ビフォーアフター`,`スライダー`,`クリップ`,`clip-path`,`ドラッグ`,`独創的`],buildPrompt:(e,t)=>k({name:`ビフォー・アフター比較スライダー`,goal:`改善前（Before）と改善後（After）の見た目・写真をぴったり重ね、ドラッグできる境界ハンドルで自由に比較できるUIにする。`,mechanism:`2層を同サイズで重ね、上層に clip-path: inset(0 calc(100% - split) 0 0) を掛けて内容が潰れないよう切り抜き。`,secondaryLabel:`初期分割位置`,secondaryUnit:`%`,requirements:[`マウス操作とスマホの指ドラッグの両方が動くよう pointer 系イベントと touch-action: none を使う`,`上下の文字やボタンが比較中に横幅圧縮されないよう width 変更ではなく clip-path で切り抜く`],params:e,targetNote:t}),buildCode:e=>`<div class="ba-box" id="baBox" style="--split: ${e.distance}%;">
  <div class="ba-layer ba-after">AFTER（整理後のデザイン）</div>
  <div class="ba-layer ba-before">BEFORE（整理前のデザイン）</div>
  <div class="ba-handle" aria-hidden="true"></div>
</div>

<style>
.ba-box {
  position: relative;
  height: 200px;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid #e4e4e7;
  touch-action: none;
  cursor: ew-resize;
  user-select: none;
}
.ba-layer { position: absolute; inset: 0; padding: 20px; }
.ba-after { background: #ffffff; }
.ba-before {
  background: #e4e4e7;
  clip-path: inset(0 calc(100% - var(--split)) 0 0);
}
.ba-handle {
  position: absolute;
  top: 0; bottom: 0;
  left: var(--split);
  width: 2px;
  background: #2563eb;
}
</style>

<script>
(() => {
  const box = document.getElementById('baBox');
  if (!box) return;
  let dragging = false;
  const update = (x) => {
    const r = box.getBoundingClientRect();
    if (r.width <= 0) return;
    const pct = Math.min(95, Math.max(5, ((x - r.left) / r.width) * 100));
    box.style.setProperty('--split', pct.toFixed(1) + '%');
  };
  box.addEventListener('pointerdown', (e) => { dragging = true; update(e.clientX); });
  window.addEventListener('pointermove', (e) => { if (dragging) update(e.clientX); });
  window.addEventListener('pointerup', () => { dragging = false; });
})();
<\/script>`},{id:`craft-tilt-shine`,category:`craft`,title:`カーソルに反応して傾く3Dチルト＆ツヤ光沢カード`,subtitle:`マウスを当てた角へ向かってカードが少し沈み込み、同時にガラスのようなツヤ反射が追いかける立体表現`,mechanismTag:`マウス座標 (-0.5〜+0.5) × 角度 + radial-gradient 光沢`,xRayCaption:`カード中心からの X/Y ズレを角度（rotateX / rotateY）に変換し、光沢の中心座標も同じ割合で動かしています`,interactiveHint:`「再生」でのデモ、または暗いカードの上にマウスを乗せて動かせます`,defaultDuration:.45,durationRange:{min:.15,max:1.5,step:.05},secondarySlider:{label:`最大傾き角`,unit:`度`,min:4,max:18,step:2,defaultValue:10},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① カード中心を 0 としてカーソル位置を割合化`,detail:`端から端を 0〜1 にし、中心との差（-0.5 〜 +0.5）を出すと上下左右の傾く向きが決まります。`,codeHint:`nx = (clientX - rect.left) / rect.width`},{title:`② rotateX と rotateY へ掛け算する（最大 8〜12度）`,detail:`傾きすぎると文字が読みづらくなるため、10度前後までに抑えると上品な質感になります。`,codeHint:`transform: rotateX(...) rotateY(...)`},{title:`③ 半透明の丸い光（radial-gradient）を追従させる`,detail:`カーソル座標の % 位置へ白い薄光を置くと、本当に平面が光を反射しているような手触りになります。`,codeHint:`radial-gradient(circle at X% Y%, ...)`}],keywords:[`3D`,`チルト`,`傾く`,`光沢`,`ツヤ`,`ホバー`,`カーソル`,`カード`],buildPrompt:(e,t)=>k({name:`カーソル連動 3D チルト＆ツヤ光沢カード`,goal:`カード上にカーソルを乗せると、ポインターの位置に応じて立体的に傾きつつ柔らかな光沢スポットが追従する表現にする。`,mechanism:`mousemove で算出したカード内相対位置（0〜100%）から rotateX/rotateY と radial-gradient 座標を同時更新し、mouseleave で水平に戻す。`,secondaryLabel:`最大傾き角`,secondaryUnit:`度`,requirements:[`傾けすぎるとテキストが歪むため最大傾きは 10〜14度 以内に抑える`,`ポインターがないタッチ端末や reduced-motion 時は過度な傾きを動かさない`],params:e,targetNote:t}),buildCode:e=>`<div class="tilt-wrap" id="tiltWrap">
  <div class="tilt-card" id="tiltCard">
    <div class="tilt-shine" id="tiltShine"></div>
    <h3>立体チルト＋光の反射</h3>
    <p>マウスに合わせて傾きと光沢が動きます。</p>
  </div>
</div>

<style>
.tilt-wrap { perspective: 800px; width: 280px; }
.tilt-card {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  padding: 24px;
  background: #18181b;
  color: #ffffff;
  transition: transform 0.2s ease-out;
}
.tilt-shine {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.22), transparent 62%);
}
</style>

<script>
(() => {
  const wrap = document.getElementById('tiltWrap');
  const card = document.getElementById('tiltCard');
  const shine = document.getElementById('tiltShine');
  if (!wrap || !card || !shine) return;
  const maxDeg = ${e.distance};

  wrap.addEventListener('mousemove', (e) => {
    const r = wrap.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    card.style.transform = \`rotateX(\${((0.5 - ny) * maxDeg * 2).toFixed(2)}deg) rotateY(\${((nx - 0.5) * maxDeg * 2).toFixed(2)}deg)\`;
    shine.style.background = \`radial-gradient(circle at \${(nx * 100).toFixed(0)}% \${(ny * 100).toFixed(0)}%, rgba(255,255,255,0.22), transparent 62%)\`;
  });
  wrap.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateX(0deg) rotateY(0deg)';
  });
})();
<\/script>`},{id:`craft-number-counter`,category:`craft`,title:`0から目標値へ減速着地する数字カウントアップ`,subtitle:`実績数字やスコアが 0 から目標値へ向かって最初は速く・最後はゆっくり減速しながらピタッと着地する表現`,mechanismTag:`requestAnimationFrame 減速曲線 + 等幅数字 (tabular-nums)`,xRayCaption:`font-variant-numeric: tabular-nums を指定して、数字が増えるたびに横幅がガタガタ揺れるのを防いでいます`,interactiveHint:`「再生」でカウントアップの加速・減速着地を確認できます`,defaultDuration:1.4,durationRange:{min:.4,max:3.5,step:.1},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① 必ず font-variant-numeric: tabular-nums を付ける`,detail:`プロポーショナルフォントは「1」と「8」で幅が違うため、等幅指定がないと数字が横揺れします。`,codeHint:`font-variant-numeric: tabular-nums`},{title:`② 経過時間 t（0→1）を 3乗カーブで減速させる`,detail:`一定の速さだと最後が唐突に止まるため、終盤ほどゆっくり進む式に通して余韻を作ります。`,codeHint:`eased = 1 - Math.pow(1 - t, 3)`},{title:`③ 画面に入ったタイミングで 1 回だけ起動する`,detail:`IntersectionObserver を使って見えた瞬間から回すと、着地シーンを確実に見せられます。`,codeHint:`IntersectionObserver + requestAnimationFrame`}],keywords:[`数字`,`カウントアップ`,`実績`,`統計`,`アニメーション`,`tabular-nums`],buildPrompt:(e,t)=>k({name:`0から減速着地する数字カウントアップ`,goal:`実績数値や統計データを 0 から目標数値へ滑らかにカウントアップさせ、ゴール手前で減速して着地させる。`,mechanism:`requestAnimationFrame で進行度 t を 1 - Math.pow(1 - t, 3) でイージングし、CSS の tabular-nums で横揺れをゼロにする。`,requirements:[`数字要素に必ず font-variant-numeric: tabular-nums を設定し、桁変化時のブレを完全に防ぐ`,`カウント完了後は目標の厳密な数値文字列（小数点やカンマ含む）で確定させる`],params:e,targetNote:t}),buildCode:e=>`<div class="stat-card">
  <span class="stat-label">収録パターン</span>
  <strong class="stat-num" id="countTarget" data-target="42">0</strong>
</div>

<style>
.stat-num {
  font-size: 36px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
</style>

<script>
(() => {
  const el = document.getElementById('countTarget');
  if (!el) return;
  const target = Number(el.dataset.target || 0);
  const duration = ${Math.round(e.duration*1e3)};
  const start = performance.now();

  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
<\/script>`},{id:`craft-scrollspy-toc`,category:`craft`,title:`読んでいる章に目印が追従するライブ目次（Scrollspy）`,subtitle:`長い解説記事を読み進めると、横の目次のハイライトと青い線が今見ている章へ自動で移動する親切ナビ`,mechanismTag:`Sticky 目次 + 現在章位置の自動判定 (Scrollspy)`,xRayCaption:`画面の上端から一定の高さを通過した見出しを検出して、右側の目次ボタンへアクティブ印を移しています`,interactiveHint:`「再生」・目次テキストのクリック・左本文のスクロールのどれでも連動します`,defaultDuration:2.6,durationRange:{min:1,max:5,step:.2},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 目次を画面横に sticky 固定して常に視界へ残す`,detail:`長い記事の「いま全体の中でどの辺りか」を迷わせない道標になります。`,codeHint:`position: sticky; top: 24px`},{title:`② 見出し位置を通過するたびに現在番号を更新`,detail:`IntersectionObserver（または各見出しの offsetTop 比較）で今読んでいる章を 1 つだけ強調します。`,codeHint:`IntersectionObserver({ rootMargin: "-20% 0px -70% 0px" })`},{title:`③ 目次クリックで該当セクションへスムーズスクロール`,detail:`見るだけでなくジャンプ導線としても働く双方向の読書ガイドに仕上げます。`,codeHint:`section.scrollIntoView({ behavior: "smooth" })`}],keywords:[`目次`,`Scrollspy`,`スクロール連動`,`記事`,`長文`,`現在位置`,`追従`],buildPrompt:(e,t)=>k({name:`読んでいる章に目印が追従するライブ目次（Scrollspy）`,goal:`本文を読み進めるにつれてサイドの目次ハイライトと左の青い縦ラインが現在の章へ追従し、クリックで該当箇所へ移動できるUIを作る。`,mechanism:`2カラムで目次を position: sticky にし、IntersectionObserver で画面上部に差し掛かった見出し ID の目次項目をアクティブ化。`,requirements:[`現在アクティブな目次項目には左線インジケーターと aria-current="location" を付与する`,`クリックジャンプ先の見出しには scroll-margin-top を設定し固定ヘッダー被りを防ぐ`],params:e,targetNote:t}),buildCode:e=>`<div class="article-layout">
  <div class="article-body">
    <section id="sec1" class="doc-sec"><h2>01. 余白のリズム</h2><p>...</p></section>
    <section id="sec2" class="doc-sec"><h2>02. 初動の間白</h2><p>...</p></section>
    <section id="sec3" class="doc-sec"><h2>03. 情報の強弱</h2><p>...</p></section>
  </div>
  <aside class="toc-sticky">
    <a href="#sec1" class="toc-link is-active">01. 余白のリズム</a>
    <a href="#sec2" class="toc-link">02. 初動の間白</a>
    <a href="#sec3" class="toc-link">03. 情報の強弱</a>
  </aside>
</div>

<style>
.article-layout { display: grid; grid-template-columns: 1fr 220px; gap: 32px; }
.toc-sticky { position: sticky; top: 24px; align-self: start; display: grid; gap: 6px; border-left: 2px solid #e4e4e7; padding-left: 12px; }
.toc-link { color: #71717a; text-decoration: none; font-size: 13px; transition: color ${e.duration.toFixed(2)}s ease, transform ${e.duration.toFixed(2)}s ease; }
.toc-link.is-active { color: #2563eb; font-weight: 700; transform: translateX(3px); }
.doc-sec { scroll-margin-top: 24px; min-height: 280px; }
</style>

<script>
(() => {
  const sections = Array.from(document.querySelectorAll('.doc-sec'));
  const links = Array.from(document.querySelectorAll('.toc-link'));
  if (sections.length === 0 || links.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
      });
    }
  }, { rootMargin: '-20% 0px -70% 0px' });

  sections.forEach((sec) => observer.observe(sec));
})();
<\/script>`}],I=[{id:`carousel-scroll-snap`,category:`carousel`,title:`ピタッと吸い付く横スクロール列（Scroll Snap＋矢印）`,subtitle:`指やトラックパッドで横に流してもカードが途中で途切れず、1枚ずつ綺麗にピタッと止まる現代の基本カルーセル`,mechanismTag:`scroll-snap-type: x mandatory + 左右送るボタン`,xRayCaption:`親に scroll-snap-type: x mandatory、子カードに scroll-snap-align: start を書くだけで JavaScript 計算なしに吸い付きます`,interactiveHint:`「再生」・左右矢印ボタン・カード列の直接横スクロールすべて試せます`,defaultDuration:.65,durationRange:{min:.25,max:1.8,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 外枠に横スクロール＋スナップ宣言を書く`,detail:`overflow-x: auto に scroll-snap-type: x mandatory を付けると、指を離したときに最寄りのカードへ自動吸着します。`,codeHint:`scroll-snap-type: x mandatory; scroll-behavior: smooth`},{title:`② 子カード側に shrink-0 と吸着基準点を付ける`,detail:`縮小しないよう flex-shrink: 0 にした上で、scroll-snap-align: start を指定します。`,codeHint:`flex: 0 0 220px; scroll-snap-align: start`},{title:`③ PCユーザー向けに「‹」「›」ボタンも用意する`,detail:`マウス中心の人向けに、クリックでカード幅ぶん scrollBy するボタンを添えると親切です。`,codeHint:`track.scrollBy({ left: 236, behavior: "smooth" })`}],keywords:[`カルーセル`,`横スクロール`,`スライダー`,`スナップ`,`scroll-snap`,`サムネイル`,`指`,`スワイプ`],buildPrompt:(e,t)=>k({name:`ピタッと吸い付く横スクロール列（CSS Scroll Snap）`,goal:`カードやサムネイルが横一列に並び、指スワイプ・マウスホイール・左右矢印のどれで送っても 1 枚の区切りでピタッと止まるカルーセルを作る。`,mechanism:`CSS Scroll Snap（scroll-snap-type: x mandatory / scroll-snap-align: start）と、左右ボタンの smooth scrollBy を併用。`,requirements:[`スマホのタッチスワイプと PC マウスの左右矢印ボタンの両方が気持ちよく動くようにする`,`横スクロールバー自体は視覚ノイズにならないよう隠すか細く整える`],params:e,targetNote:t}),buildCode:e=>`<div class="snap-wrap" role="region" aria-roledescription="carousel">
  <button type="button" id="snapPrev" aria-label="前のカード">‹</button>
  <div class="snap-track" id="snapTrack">
    <article class="snap-card">#1 テキスト演出</article>
    <article class="snap-card">#2 カード出現</article>
    <article class="snap-card">#3 検索配置</article>
    <article class="snap-card">#4 ヘッダー設計</article>
  </div>
  <button type="button" id="snapNext" aria-label="次のカード">›</button>
</div>

<style>
.snap-wrap { display: flex; align-items: center; gap: 8px; }
.snap-track {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scrollbar-width: none;
}
.snap-track::-webkit-scrollbar { display: none; }
.snap-card {
  flex: 0 0 210px;
  scroll-snap-align: start;
  padding: 20px;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  background: #ffffff;
  transition: transform ${e.duration.toFixed(2)}s ease, border-color ${e.duration.toFixed(2)}s ease;
}
.snap-card:hover { transform: translateY(-2px); border-color: #cbd5e1; }
</style>

<script>
(() => {
  const track = document.getElementById('snapTrack');
  const prev = document.getElementById('snapPrev');
  const next = document.getElementById('snapNext');
  if (!track || !prev || !next) return;
  prev.addEventListener('click', () => track.scrollBy({ left: -222, behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: 222, behavior: 'smooth' }));
})();
<\/script>`},{id:`carousel-peek-slider`,category:`carousel`,title:`右端に次のカードがチラ見えするスライダー（Peek型）`,subtitle:`あえて 1 枚で枠いっぱいにせず右横に次のカードの一部を見せて、「まだ続きがある」と自然に伝える構成`,mechanismTag:`カード幅 72% + translateX(idx * 送り幅%)`,xRayCaption:`主役カード幅を 100% 未満にすることで、「右端の切れ端＝次に進める合図」として機能させています`,interactiveHint:`「再生」・下の丸ドット・矢印・右に覗いたカードクリックで切り替えできます`,defaultDuration:.55,durationRange:{min:.2,max:1.6,step:.05},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① 外枠を overflow: hidden にして内側トラックを横長にする`,detail:`見えている枠の外に次のカード群を待機させ、位置だけを横移動させます。`,codeHint:`overflow: hidden`},{title:`② 主役カードの横幅を 70〜80% にして右端に余白を作る`,detail:`ピッタリ100%にすると1枚しかないように見えますが、次の端が見えるとスクロール誘導になります。`,codeHint:`flex: 0 0 72%`},{title:`③ 現在番号 × 移動量 でトラック全体を滑らせる`,detail:`選択中の丸ドットと前後ボタンも同期させると、今何枚目かも直感で分かります。`,codeHint:`transform: translateX(-calc(idx * 74%))`}],keywords:[`カルーセル`,`スライダー`,`チラ見え`,`Peek`,`ドット`,`切り替え`,`横流れ`],buildPrompt:(e,t)=>k({name:`右端に次のカードがチラ見えするスライダー（Peek型）`,goal:`現在メインのカードを左側 72% 幅で見せつつ右端に次のカードを少し覗かせ、ボタンやドット操作で滑らかに左へ送れるスライダーにする。`,mechanism:`flex 項目幅を 72% に抑えて overflow: hidden 内のトラックを translateX で段階移動。`,requirements:[`現在の枚数が分かるページネーションドットと前後ボタンを併設する`,`右端に覗いている次のカード自体をクリックしても次へ進めるようにすると自然です`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="peek-viewport">
  <div class="peek-track" id="peekTrack">
    <div class="peek-slide">01. 第一のスライド</div>
    <div class="peek-slide">02. 第二のスライド</div>
    <div class="peek-slide">03. 第三のスライド</div>
  </div>
</div>
<button type="button" id="peekNext">次へ進む ›</button>

<style>
.peek-viewport { overflow: hidden; }
.peek-track {
  display: flex;
  gap: 12px;
  transition: transform ${e.duration.toFixed(2)}s ${t};
}
.peek-slide {
  flex: 0 0 72%;
  padding: 28px 20px;
  border-radius: 14px;
  border: 1px solid #e4e4e7;
  background: #ffffff;
}
</style>

<script>
(() => {
  const track = document.getElementById('peekTrack');
  const nextBtn = document.getElementById('peekNext');
  if (!track || !nextBtn) return;
  let index = 0;
  const total = track.children.length;
  nextBtn.addEventListener('click', () => {
    index = (index + 1) % total;
    track.style.transform = \`translateX(-\${index * 74}%)\`;
  });
})();
<\/script>`}},{id:`carousel-thumb-sync`,category:`carousel`,title:`下のサムネをクリックすると上が変わる連動ギャラリー`,subtitle:`ショッピングサイトや作品紹介の定番。下に並んだ小さな四角サムネイルを選ぶと上の主役ビジュアルが切り替わります`,mechanismTag:`共通インデックス連動（メイン枠 ⇄ 下部サムネイル群）`,xRayCaption:`上の大枠と下の四角ボタン列が同じ番号（activeIndex）を見ており、選んだサムネイルにだけ強調枠を付けています`,interactiveHint:`「再生」または下の四角サムネイルをどれでも直接クリックして切り替えられます`,defaultDuration:.65,durationRange:{min:.2,max:1.8,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 上に大きめのメイン枠、下に均等グリッドのサムネイルを置く`,detail:`grid-template-columns: repeat(4, 1fr) などで四角いサムネイルを行儀よく並べます。`,codeHint:`grid-template-columns: repeat(4, 1fr)`},{title:`② サムネイルクリックで現在選択中のデータを差し替える`,detail:`押したサムネイルのインデックスを使ってメイン表示の画像・見出し・説明文を同期更新します。`,codeHint:`aria-pressed="true" + 強調枠`},{title:`③ 選択中のサムネイルは色枠＋わずかな拡大で迷わせない`,detail:`今どのサムネイルを見ているのか一目で分かるよう border と scale で印を残します。`,codeHint:`border-color: #2563eb; transform: scale(1.03)`}],keywords:[`サムネイル`,`ギャラリー`,`EC`,`商品写真`,`切り替え`,`クリック`,`連動`],buildPrompt:(e,t)=>k({name:`サムネイル選択・連動ギャラリー`,goal:`上部にメイン表示、下部に複数の小さな四角サムネイルを並べ、クリック／タップしたサムネイルに応じてメイン表示を即時切り替えする。`,mechanism:`共有する activeIndex 状態によってメイン側の内容を更新し、選択中サムネイルボタンへ aria-pressed="true" と強調枠を付与。`,requirements:[`サムネイルにはキーボードでも移動しやすいよう <button type="button"> と代替テキストを設定する`,`現在選択中のサムネイルは青枠などで明確にハイライトする`],params:e,targetNote:t}),buildCode:e=>`<div class="gallery-wrap">
  <div class="gallery-main" id="galleryMain">PREVIEW 01：朝のデスク</div>
  <div class="thumb-grid" id="thumbGrid">
    <button type="button" class="thumb is-active" aria-pressed="true" data-title="PREVIEW 01：朝のデスク">朝のデスク</button>
    <button type="button" class="thumb" aria-pressed="false" data-title="PREVIEW 02：夜の書斎">夜の書斎</button>
    <button type="button" class="thumb" aria-pressed="false" data-title="PREVIEW 03：構成メモ">構成メモ</button>
    <button type="button" class="thumb" aria-pressed="false" data-title="PREVIEW 04：モバイル枠">モバイル枠</button>
  </div>
</div>

<style>
.gallery-main {
  padding: 28px 20px;
  border-radius: 14px;
  border: 1px solid #e4e4e7;
  background: #f8fafc;
  font-weight: 700;
  margin-bottom: 10px;
  transition: opacity ${e.duration.toFixed(2)}s ease;
}
.thumb-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.thumb {
  padding: 10px 6px;
  border-radius: 10px;
  border: 1px solid #e4e4e7;
  background: #fafafa;
  cursor: pointer;
  transition: transform ${e.duration.toFixed(2)}s ease, border-color ${e.duration.toFixed(2)}s ease, background-color ${e.duration.toFixed(2)}s ease;
}
.thumb.is-active { border-color: #2563eb; background: #ffffff; color: #1d4ed8; transform: scale(1.03); }
</style>

<script>
(() => {
  const main = document.getElementById('galleryMain');
  const grid = document.getElementById('thumbGrid');
  if (!main || !grid) return;
  const thumbs = Array.from(grid.querySelectorAll('.thumb'));
  thumbs.forEach((btn) => {
    btn.addEventListener('click', () => {
      main.textContent = btn.dataset.title || '';
      thumbs.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
    });
  });
})();
<\/script>`},{id:`carousel-lightbox`,category:`carousel`,title:`サムネクリックで暗転＋中央に拡大表示（ライトボックス）`,subtitle:`一覧の小さい枠をクリックすると背景が暗くなり、画面中央に大きく浮き出て前後の画像も送れる仕組み`,mechanismTag:`暗転バックドロップ + scale(0.86→1) 拡大モーダル`,xRayCaption:`通常の一覧（下層）はその場から動かさず、クリック時だけ上層（z-index: 20）に拡大モーダルを開いています`,interactiveHint:`「再生」または並んだ 3 つのサムネイルどれでもクリック（ESC で閉じます）`,defaultDuration:.45,durationRange:{min:.2,max:1.5,step:.05},defaultEasing:`spring`,hasEasingControl:!0,steps:[{title:`① 一覧のサムネイルを軽量なボタンとして並べる`,detail:`クリックした項目の番号（0, 1, 2...）だけを保存する仕組みにします。`,codeHint:`openLightbox(index)`},{title:`② クリックされたら半透明の黒幕と拡大カードを同時表示`,detail:`背景を暗く落とすことで周囲の雑多な情報を消し、主役の拡大プレビューだけに視線を集めます。`,codeHint:`background: rgba(9, 9, 11, 0.6)`},{title:`③ 背景クリック・✕ボタン・Escapeキーの3通りで閉じられるように`,detail:`「どれで閉じようとしても閉じられる」設計にしておくと、ストレスが全くありません。`,codeHint:`if (e.key === "Escape") dialog.close()`}],keywords:[`ライトボックス`,`拡大`,`モーダル`,`サムネイル`,`ギャラリー`,`dialog`,`暗転`],buildPrompt:(e,t)=>k({name:`ライトボックス拡大ギャラリー`,goal:`一覧の小さなサムネイルをクリックすると背景が暗転して画面中央に大きく浮き出て、左右ボタンで連続閲覧・Escapeキーや枠外クリックで閉じられるようにする。`,mechanism:`<dialog>（または全画面固定オーバーレイ）＋ opacity/scale トランジション＋左右矢印とキーボード操作対応。`,requirements:[`Escape キー・背景クリック・右上の閉じるボタンのいずれでも安全に閉じられるようにする`,`拡大中も画面上で前後の要素へ送れるボタンを配置する`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="lb-grid">
  <button type="button" class="lb-thumb" data-caption="1. グリッド配置">サムネ1</button>
  <button type="button" class="lb-thumb" data-caption="2. 余白の設計">サムネ2</button>
  <button type="button" class="lb-thumb" data-caption="3. 配色ルール">サムネ3</button>
</div>

<dialog id="lbDialog" class="lb-dialog">
  <p id="lbCaption"></p>
  <button type="button" id="lbClose">閉じる</button>
</dialog>

<style>
.lb-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.lb-dialog::backdrop { background: rgba(9, 9, 11, 0.6); }
.lb-dialog[open] {
  border: 1px solid #e4e4e7;
  border-radius: 16px;
  padding: 20px;
  animation: zoomIn ${e.duration.toFixed(2)}s ${t} both;
}
@keyframes zoomIn {
  from { opacity: 0; transform: scale(0.88); }
  to { opacity: 1; transform: scale(1); }
}
</style>

<script>
(() => {
  const dialog = document.getElementById('lbDialog');
  const caption = document.getElementById('lbCaption');
  const closeBtn = document.getElementById('lbClose');
  if (!dialog || !caption || !closeBtn) return;
  document.querySelectorAll('.lb-thumb').forEach((btn) => {
    btn.addEventListener('click', () => {
      caption.textContent = btn.dataset.caption || '';
      dialog.showModal();
    });
  });
  closeBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
})();
<\/script>`}},{id:`carousel-stack-deck`,category:`carousel`,title:`トランプのように後ろからせり上がる重ねカード・デッキ`,subtitle:`複数のカードを奥行き方向へ重ねて置き、クリックするたびに後ろのカードがスッと手前に繰り上がる独創UI`,mechanismTag:`順番計算（pos）による scale / translateY / z-index 循環`,xRayCaption:`各カードが自分の奥行き順番（pos = 0, 1, 2）を計算し、数字が小さいほど大きく上へ出ます`,interactiveHint:`「再生」または重ねられたカードをクリックすると次々めくれます`,defaultDuration:.5,durationRange:{min:.2,max:1.5,step:.05},defaultEasing:`spring`,hasEasingControl:!0,steps:[{title:`① カードを同じ位置に absolute 重ねする`,detail:`横並べせず、親枠の上端に重ねて省スペースに複数枚を待機させます。`,codeHint:`position: absolute; inset: 0 auto auto 0; width: 100%`},{title:`② 今先頭から何番目か（pos）を割り出す`,detail:`(番号 - 先頭番号 + 総数) % 総数 で、今何段目かをループ計算します。`,codeHint:`pos = (i - active + len) % len`},{title:`③ pos に応じて縮小率・下ズレ・重なり順を割り当てる`,detail:`0番目＝等倍・最前面、1番目＝少し小さく少し下…にすると立体トランプのように見えます。`,codeHint:`translateY(pos * 10px) scale(1 - pos * 0.06)`}],keywords:[`重ねカード`,`スタック`,`トランプ`,`デッキ`,`めくる`,`独創的`,`省スペース`],buildPrompt:(e,t)=>k({name:`トランプ式 重ねカード・デッキ`,goal:`重なったカードを1枚クリック（または送りボタン）するたびに、後ろのカードが手前にせり上がって循環するインタラクティブスタックを作る。`,mechanism:`全カードを同位置へ重ね、(index - topIndex + total) % total から z-index・translateY・scale を動的計算。`,requirements:[`最前面だけでなく後ろのカードの上端・色が少し覗くように translateY を段階付けする`,`クリック操作しやすいようカード全体または明快な送りボタンを <button> にする`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="deck" id="cardDeck">
  <button type="button" class="deck-item">01. 先頭カード</button>
  <button type="button" class="deck-item">02. 二番目のカード</button>
  <button type="button" class="deck-item">03. 三番目のカード</button>
</div>

<style>
.deck { position: relative; width: 260px; height: 140px; }
.deck-item {
  position: absolute;
  inset: 0 0 auto 0;
  height: 112px;
  border-radius: 14px;
  border: 1px solid #e4e4e7;
  background: #ffffff;
  transition: transform ${e.duration.toFixed(2)}s ${t}, opacity ${e.duration.toFixed(2)}s ease;
  cursor: pointer;
}
</style>

<script>
(() => {
  const deck = document.getElementById('cardDeck');
  if (!deck) return;
  const items = Array.from(deck.querySelectorAll('.deck-item'));
  let top = 0;

  function render() {
    items.forEach((el, i) => {
      const pos = (i - top + items.length) % items.length;
      el.style.zIndex = String(items.length - pos);
      el.style.transform = \`translateY(\${pos * 10}px) scale(\${1 - pos * 0.06})\`;
    });
  }

  items.forEach((el) => el.addEventListener('click', () => {
    top = (top + 1) % items.length;
    render();
  }));
  render();
})();
<\/script>`}}],ne=[{id:`conv-pricing-static`,category:`pricing`,title:`王道3列料金プラン表（おすすめ列を浮かせる視線誘導）`,subtitle:`マネタイズページの基本構成。真ん中の「一番選ばれているプラン」だけを色枠＋影で浮かせて決断を助けます`,mechanismTag:`3列比較Grid + 主役プラン強調階層（静的配置）`,xRayCaption:`3つとも同じ見た目にするのではなく、推奨プランだけに「濃い枠線・人気ラベル・青いボタン」を集中させています`,interactiveHint:`右上の「PC / スマホ」で狭い画面幅での縦1列並びを確認できます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.35,durationRange:{min:.15,max:1,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① プランは多くても 3 列までに絞る`,detail:`選択肢が多すぎると人が迷って離脱するため、松・竹・梅の 3 プラン構成が鉄板です。`,codeHint:`grid-template-columns: repeat(3, 1fr)`},{title:`② 選んでほしい列だけボタンを塗りつぶす`,detail:`他2つは薄い枠線ボタン、推奨プランだけ濃い塗りつぶしボタンにすると視線が自然に止まります。`,codeHint:`border: 2px solid #2563eb; background: #2563eb (CTA)`},{title:`③ 価格数字は tabular-nums で揃える`,detail:`縦や横に並んだ金額が見比べやすいよう、等幅数字にしてフォントサイズに強弱を付けます。`,codeHint:`font-variant-numeric: tabular-nums`}],keywords:[`料金表`,`プラン`,`比較`,`おすすめ`,`マネタイズ`,`サブスク`,`静的`],buildPrompt:(e,t)=>k({name:`王道3列料金プラン表（おすすめ強調配置）`,goal:`ライト／スタンダード／プロの3プランを並べ、中央のおすすめプランだけを青枠と「人気」バッジ・塗りつぶしボタンで引き立てる。`,mechanism:`CSS Grid による 3 列配置（モバイル時は 1 列縦積み）と、色・枠線・ボタン強度による視覚的優先順位付け。`,isStatic:!0,requirements:[`おすすめ列以外にも違いが一瞬で分かる短い説明文を添える`,`金額には font-variant-numeric: tabular-nums を指定して縦並びでも揃えやすくする`],params:e,targetNote:t}),buildCode:()=>`<section class="pricing-grid" aria-label="料金プラン">
  <div class="plan-card">
    <h3>ライト</h3>
    <p class="price">¥0<span>/月</span></p>
    <p class="desc">まずは試したい個人向け</p>
    <a href="#free" class="btn-outline">選ぶ</a>
  </div>
  <div class="plan-card is-featured">
    <span class="badge">人気</span>
    <h3>スタンダード</h3>
    <p class="price">¥980<span>/月</span></p>
    <p class="desc">機能も容量もちょうどいい本命</p>
    <a href="#std" class="btn-primary">このプランを選ぶ</a>
  </div>
  <div class="plan-card">
    <h3>プロ</h3>
    <p class="price">¥2,480<span>/月</span></p>
    <p class="desc">チーム利用・共同編集向け</p>
    <a href="#pro" class="btn-outline">選ぶ</a>
  </div>
</section>

<style>
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-items: end;
}
.plan-card {
  position: relative;
  padding: 20px;
  border-radius: 14px;
  border: 1px solid #e4e4e7;
  background: #ffffff;
}
.plan-card.is-featured {
  border: 2px solid #2563eb;
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.12);
}
.price { font-size: 28px; font-weight: 800; font-variant-numeric: tabular-nums; }
.btn-primary { display: block; text-align: center; padding: 10px; border-radius: 8px; background: #2563eb; color: #fff; text-decoration: none; font-weight: 700; }
.btn-outline { display: block; text-align: center; padding: 10px; border-radius: 8px; border: 1px solid #e4e4e7; color: #18181b; text-decoration: none; }
@media (max-width: 767px) { .pricing-grid { grid-template-columns: 1fr; } }
</style>`},{id:`conv-billing-toggle`,category:`pricing`,title:`月額 ⇄ 年額（割引）の切り替えスイッチ＆価格表示`,subtitle:`サブスク登録ページでおなじみの切り替えボタン。「年額なら20%お得」と一目で納得して選べます`,mechanismTag:`ピル型スイッチ + 連動価格テキスト（tabular-nums）`,xRayCaption:`上のトグル状態（月額／年額）が下の金額カードとお得額メッセージを同時に差し替えています`,interactiveHint:`「再生」または「月額払い / 年額払い」ボタンを直接クリックして比較できます`,defaultDuration:.4,durationRange:{min:.15,max:1.4,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 月額と年額を同じピル枠に並べる`,detail:`年額側に「20%お得」と一言添えておくと、切り替えたくなるモチベーションが生まれます。`,codeHint:`aria-pressed="true" + 角丸トレイ`},{title:`② 金額と「年額での合計節約額」を同時に書き換える`,detail:`月換算の数字だけでなく「年間2,400円お得」のように具体額を見せると親切です。`,codeHint:`tabular-nums で数字幅を固定`},{title:`③ 年額を選んだ時だけ枠をほんのり緑・青へ変化`,detail:`「お得に切り替わった」という手応えを優しい背景色・枠色の変化で伝えます。`,codeHint:`transition: border-color, background-color`}],keywords:[`月額`,`年額`,`スイッチ`,`トグル`,`サブスク`,`料金`,`割引`],buildPrompt:(e,t)=>k({name:`月額・年額切り替えスイッチ＆料金連動`,goal:`ピル型の「月額払い／年額払い（お得）」トグルを切り替えると、プラン価格とお得額メッセージが滑らかに連動更新されるUIを作る。`,mechanism:`トグルボタン群（aria-pressed）と連動した状態分岐で価格文字・割引注記・強調ボーダー色を切り替え。`,requirements:[`金額が切り替わってもレイアウトがガタつかないよう tabular-nums と固定行高を設定する`,`初期表示では比較しやすい基準を明示し、キーボードでも操作可能にする`],params:e,targetNote:t}),buildCode:e=>`<div class="billing-box">
  <div class="billing-switch" role="group" aria-label="お支払い間隔">
    <button type="button" class="bill-btn is-active" data-mode="monthly" aria-pressed="true">月額払い</button>
    <button type="button" class="bill-btn" data-mode="yearly" aria-pressed="false">年額払い（20%お得）</button>
  </div>
  <div class="price-panel">
    <strong id="planPrice" class="plan-price">¥980</strong><span> / 月</span>
    <p id="planNote">いつでも解約できる月額プラン</p>
  </div>
</div>

<style>
.billing-switch { display: inline-flex; padding: 4px; border-radius: 9999px; background: #f4f4f5; }
.bill-btn {
  border: 0; border-radius: 9999px; padding: 6px 14px; background: transparent; cursor: pointer; font-weight: 700;
  transition: background-color ${e.duration.toFixed(2)}s ease, box-shadow ${e.duration.toFixed(2)}s ease, color ${e.duration.toFixed(2)}s ease;
}
.bill-btn.is-active { background: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
.plan-price { font-size: 32px; font-weight: 800; font-variant-numeric: tabular-nums; transition: opacity ${e.duration.toFixed(2)}s ease; }
</style>

<script>
(() => {
  const btns = Array.from(document.querySelectorAll('.bill-btn'));
  const priceEl = document.getElementById('planPrice');
  const noteEl = document.getElementById('planNote');
  if (!priceEl || !noteEl || btns.length === 0) return;

  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const yearly = btn.dataset.mode === 'yearly';
      btns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      priceEl.textContent = yearly ? '¥780' : '¥980';
      noteEl.textContent = yearly ? '年額 ¥9,360（2,400円 お得）' : 'いつでも解約できる月額プラン';
    });
  });
})();
<\/script>`},{id:`conv-submit-feedback`,category:`forms`,title:`送信中 → 緑の✓完了へ姿を変えるボタン`,subtitle:`登録・保存ボタンを押したあと「いま送ってるよ」「無事に終わったよ✓」を同じボタンの上で迷わず伝える安心UI`,mechanismTag:`3状態遷移（idle → loading＋無効化 → success）`,xRayCaption:`loading 中はボタンを disabled にして連打による二重送信を防ぎつつ、完了後に緑色へ変化させます`,interactiveHint:`「再生」または「申し込む」ボタンそのものをクリックして一連の流れを見られます`,defaultDuration:.9,durationRange:{min:.4,max:2.5,step:.1},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 送信ボタンの幅を min-width で少し固定する`,detail:`文言が「送信」→「送信中...」→「完了」に変わってもボタンの横幅がガクッと縮まないようにします。`,codeHint:`min-width: 200px`},{title:`② 送信中は回転アイコン＋ disabled で二重押し防止`,detail:`処理中を視覚的に伝えながら、2回続けて送信されてしまうトラブルを同時に防ぎます。`,codeHint:`button.disabled = true`},{title:`③ 成功したら緑（emerald）＋ チェック✓ へ変える`,detail:`文字だけでなく色とアイコンを同時に切り替えると、一目で「無事に終わった」と安心できます。`,codeHint:`background: #059669`}],keywords:[`ボタン`,`フォーム`,`送信`,`完了`,`チェック`,`ローディング`,`フィードバック`,`二重送信防止`],buildPrompt:(e,t)=>k({name:`状態遷移フィードバック付き送信ボタン`,goal:`クリック後「送信しています...（無効化＋スピナー）」→「保存・送信が完了しました ✓（緑背景）」へ滑らかに変化する安心感の高いボタンを作る。`,mechanism:`idle / loading / success の3状態ステート管理と、min-width 固定・disabled 二重送信防御の組み合わせ。`,requirements:[`loading 中は必ず disabled にして二重クリックを防ぐ`,`状態変化によるボタン幅のガタつきを抑えるため min-width を指定する`],params:e,targetNote:t}),buildCode:e=>`<button type="button" id="submitDemo" class="state-btn">申し込む（送信ボタン）</button>

<style>
.state-btn {
  min-width: 210px;
  padding: 12px 20px;
  border: 0;
  border-radius: 12px;
  background: #18181b;
  color: #ffffff;
  font-weight: 700;
  transition: background-color 0.25s ease;
  cursor: pointer;
}
.state-btn.is-loading { background: #52525b; cursor: wait; }
.state-btn.is-success { background: #059669; }
</style>

<script>
(() => {
  const btn = document.getElementById('submitDemo');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.className = 'state-btn is-loading';
    btn.textContent = '送信しています...';
    setTimeout(() => {
      btn.className = 'state-btn is-success';
      btn.textContent = '✓ 保存・送信が完了しました';
      setTimeout(() => {
        btn.disabled = false;
        btn.className = 'state-btn';
        btn.textContent = '申し込む（送信ボタン）';
      }, 1500);
    }, ${Math.round(e.duration*1e3)});
  });
})();
<\/script>`},{id:`conv-floating-label`,category:`forms`,title:`入力すると見出し文字が枠の上へ逃げるフォーム（フローティングラベル）`,subtitle:`最初は入力欄の中に書いてある案内文字が、入力した瞬間に上へ小さく移動し「何を入力中か」を忘れさせない仕組み`,mechanismTag:`入力枠内の余白上寄せ + top / font-size トランジション`,xRayCaption:`label を入力欄の上端へ重ねておき、フォーカス時または文字が入ったら top を上へ・文字を青く小さく変えます`,interactiveHint:`「再生」または入力枠をクリックして実際に文字を打って試せます`,defaultDuration:.3,durationRange:{min:.15,max:1,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 入力枠の内側上部にラベル移動用の余白を確保`,detail:`上に移動したあとの文字と入力文字が重ならないよう、padding-top を少し広めに取っておきます。`,codeHint:`padding: 20px 12px 8px`},{title:`② CSS の :focus と :not(:placeholder-shown) を組み合わせる`,detail:`フォーカスしている間と、すでに文字が入っている間は上へ留まり続けます。`,codeHint:`.field input:focus + label, .field input:not(:placeholder-shown) + label`},{title:`③ pointer-events: none でラベルがクリックを邪魔しないように`,detail:`文字の上をクリックしても確実に入力欄にカーソルが入るよう必須の気配りです。`,codeHint:`pointer-events: none`}],keywords:[`フォーム`,`入力`,`フローティングラベル`,`メールアドレス`,`お問い合わせ`,`登録`],buildPrompt:(e,t)=>k({name:`フローティングラベル付き入力欄`,goal:`入力前はプレースホルダー位置にあるラベルが、フォーカスまたは入力と同時に左上の小さな青い見出し位置へ滑らかに移動するフォームを作る。`,mechanism:`CSS の :focus / :not(:placeholder-shown)（あるいはReactの状態判定）による label の top / font-size / color 切り替え。`,requirements:[`移動先の上部位置と入力テキストが重ならないよう padding-top を確保する`,`ラベルには pointer-events: none（または htmlFor 紐づけ）を付けて入力しづらくしない`],params:e,targetNote:t}),buildCode:e=>`<div class="float-field">
  <input id="emailInput" type="email" placeholder=" " />
  <label for="emailInput">メールアドレス（必須）</label>
</div>

<style>
.float-field { position: relative; max-width: 320px; }
.float-field input {
  width: 100%;
  padding: 20px 12px 8px;
  border: 1px solid #d4d4d8;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
}
.float-field label {
  position: absolute;
  left: 12px;
  top: 14px;
  color: #a1a1aa;
  font-size: 13px;
  pointer-events: none;
  transition: all ${e.duration.toFixed(2)}s ease;
}
.float-field input:focus { border-color: #2563eb; }
.float-field input:focus + label,
.float-field input:not(:placeholder-shown) + label {
  top: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #2563eb;
}
</style>`},{id:`conv-read-more`,category:`forms`,title:`下端ぼかし付き・高さが伸びる「続きを読む」折りたたみ`,subtitle:`長い説明文をいきなり全部見せて圧迫せず、下を白くぼかして「気になった人だけ開ける」親切な省略テクニック`,mechanismTag:`max-height 制限 + 下端白グラデーション（pointer-events: none）`,xRayCaption:`テキストの底に重ねた白いグラデーション幕を開いた瞬間に opacity: 0 で消しています`,interactiveHint:`「再生」または下の「続きを読む」ボタンをクリックして開閉できます`,defaultDuration:.45,durationRange:{min:.2,max:1.4,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 外枠に overflow: hidden と初期の高さ制限を掛ける`,detail:`最初の 2〜3 行だけを見せる高さ（max-height: 72px など）で一旦止めます。`,codeHint:`max-height: 72px; overflow: hidden`},{title:`② 下端に「透明 → 白」のグラデーション膜を被せる`,detail:`文章の終わりをスッとフェードアウトさせることで「まだ下に続きがある」と自然に伝わります。`,codeHint:`linear-gradient(to top, #fff 15%, transparent)`},{title:`③ ボタンクリックで展開し、膜を消す`,detail:`開くと同時に文字表示を全開にし、ボタンラベルも「折りたたむ」に切り替えます。`,codeHint:`aria-expanded="true"`}],keywords:[`続きを読む`,`折りたたみ`,`グラデーション`,`ぼかし`,`長文`,`省略`,`アコーディオン`],buildPrompt:(e,t)=>k({name:`グラデーションぼかし付き「続きを読む」折りたたみ`,goal:`長い説明やレビューの初期表示高さを抑えて下端を白いグラデーションでぼかし、「続きを読む」クリックで滑らかに全文展開できるようにする。`,mechanism:`max-height と overflow: hidden、下端の linear-gradient オーバーレイを is-expanded クラスで同時制御。`,requirements:[`開閉ボタンには aria-expanded を付けて状態を明示する`,`展開後はグラデーション幕を完全に透明（opacity: 0）かつ pointer-events: none にする`],params:e,targetNote:t}),buildCode:e=>`<div class="read-box" id="readBox">
  <div class="read-content">
    <p>最初の2〜3行だけを見せる長文エリアです。</p>
    <p>クリックすると隠れていた解説がすべて滑らかに表示されます。</p>
  </div>
  <div class="read-fade" aria-hidden="true"></div>
</div>
<button type="button" id="readBtn" aria-expanded="false">続きを読む</button>

<style>
.read-box {
  position: relative;
  max-height: 64px;
  overflow: hidden;
  transition: max-height ${e.duration.toFixed(2)}s ease;
}
.read-box.is-open { max-height: 240px; }
.read-fade {
  position: absolute;
  inset: auto 0 0 0;
  height: 36px;
  background: linear-gradient(to top, #ffffff 15%, transparent);
  pointer-events: none;
  transition: opacity ${e.duration.toFixed(2)}s ease;
}
.read-box.is-open .read-fade { opacity: 0; }
</style>

<script>
(() => {
  const box = document.getElementById('readBox');
  const btn = document.getElementById('readBtn');
  if (!box || !btn) return;
  btn.addEventListener('click', () => {
    const open = box.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? '折りたたむ' : '続きを読む';
  });
})();
<\/script>`},{id:`conv-back-to-top`,category:`guides`,title:`スクロールすると右下にそっと現れる「↑ TOPへ戻る」ボタン`,subtitle:`一番上を見ている時は姿を隠しておき、ある程度下に読み進めた時だけ右下に重なって現れる気が利く案内部品`,mechanismTag:`固定配置（right/bottom）+ スクロール量しきい値判定`,xRayCaption:`最初から出さずに「scrollTop > しきい値」の条件を超えた瞬間だけ不透明＆せり上がりで出現させます`,interactiveHint:`「再生」または枠内を下へスクロールし、出た右下ボタンをクリックして上へ戻れます`,defaultDuration:.7,durationRange:{min:.25,max:1.8,step:.05},defaultEasing:`spring`,hasEasingControl:!0,steps:[{title:`① 画面右下に position: fixed で重ねて待機させる`,detail:`普段は opacity: 0 と少し下に下げた状態（translateY(16px)）にして透明化しておきます。`,codeHint:`position: fixed; right: 20px; bottom: 20px`},{title:`② スクロール量がしきい値を超えたらクラスを付ける`,detail:`1画面ぶんほど下に読んだ頃（例：300px）からスッと浮き上がらせると邪魔になりません。`,codeHint:`btn.classList.toggle("is-visible", window.scrollY > 300)`},{title:`③ クリックしたら滑らかに 0px へ戻す`,detail:`一瞬でワープするより smooth スクロールで戻すと、位置感覚を失わずに済みます。`,codeHint:`window.scrollTo({ top: 0, behavior: "smooth" })`}],keywords:[`TOPへ戻る`,`フローティング`,`右下`,`ボタン`,`重なり`,`スクロール`],buildPrompt:(e,t)=>k({name:`しきい値出現「↑ TOPへ戻る」フローティングボタン`,goal:`ページ最上部では隠れていて、一定量スクロールした時だけ右下にそっと浮き上がり、クリックで最上部へ滑らかに戻すボタンを作る。`,mechanism:`position: fixed 右下固定 ＋ scroll 監視によるしきい値判定 ＋ opacity / translateY トランジション。`,requirements:[`非表示状態では pointer-events: none にして意図しないタップを防ぐ`,`prefers-reduced-motion 有効時は scrollTo の behavior を auto に切り替える`],params:e,targetNote:t}),buildCode:e=>`<button type="button" id="backToTop" class="btt-btn" aria-label="一番上へ戻る">↑ TOP</button>

<style>
.btt-btn {
  position: fixed;
  right: 20px;
  bottom: 20px;
  padding: 10px 14px;
  border: 0;
  border-radius: 9999px;
  background: #18181b;
  color: #ffffff;
  font-weight: 700;
  opacity: 0;
  pointer-events: none;
  transform: translateY(16px);
  transition: opacity 0.25s ease, transform 0.25s ${D[e.easing].css};
  cursor: pointer;
}
.btt-btn.is-visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}
</style>

<script>
(() => {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('is-visible', window.scrollY > 240);
  }, { passive: true });
  btn.addEventListener('click', () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });
})();
<\/script>`}],L=[{id:`hdr-link-hover-grow`,category:`header`,title:`リンク表現①：ホバー／選択でほんのり大きく濃くなる`,subtitle:`線や箱を追加せず、文字の色が黒く濃くなりつつ 1.06 倍にふわっと浮き立つ一番シンプルな反応`,mechanismTag:`文字色深化 + 微小 scale(1.08)`,xRayCaption:`装飾線を使わないためごちゃつかず、文字の濃さと 5〜8% の拡大だけで「押せる」と伝えます`,interactiveHint:`「再生」またはリンク文字（「特徴」「機能」「料金」「事例」）へ乗せて試せます`,defaultDuration:.25,durationRange:{min:.1,max:.9,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 通常時の文字色を薄めのグレー（#71717a）に抑える`,detail:`最初から真っ黒にせず余力を残すことで、ホバー時の黒変とわずかな拡大が引き立ちます。`,codeHint:`color: #71717a → #09090b`},{title:`② transform: scale(1.06) で周囲を押さずに拡大`,detail:`font-size を変えると隣の文字まで横ズレしてガタつくため、必ず transform: scale を使います。`,codeHint:`transform: scale(1.08) translateY(-1px)`},{title:`③ 速さは 0.18〜0.25秒 の軽快テンポに`,detail:`メニュー反応は遅いと重たく感じるため、素早くスッと反応させるのがコツです。`,codeHint:`transition: transform 0.2s, color 0.2s`}],keywords:[`ヘッダー`,`リンク`,`ホバー`,`拡大`,`大きくなる`,`シンプル`,`メニュー`],buildPrompt:(e,t)=>k({name:`ホバーでほんのり大きく濃くなるヘッダーリンク`,goal:`ヘッダーのナビゲーションリンクにカーソルを乗せたとき、背景枠や下線を付けずに文字色の濃化とごく小さな拡大（scale 1.08）で反応させる。`,mechanism:`font-size を変えずに transform: scale(1.08) と color トランジションを組み合わせ、周囲レイアウトのガタつきをゼロに抑える。`,requirements:[`周囲の項目が横にズレないよう font-weight 変化ではなく color + transform で反応させる`,`キーボード操作時の :focus-visible でもホバーと同等の強調と視認できるフォーカスリングを表示する`],params:e,targetNote:t}),buildCode:e=>`<nav class="grow-nav">
  <a href="#features">特徴</a>
  <a href="#guide">機能</a>
  <a href="#pricing">料金</a>
</nav>

<style>
.grow-nav { display: flex; gap: 24px; }
.grow-nav a {
  color: #71717a;
  text-decoration: none;
  font-weight: 600;
  transition: transform ${e.duration.toFixed(2)}s ease, color ${e.duration.toFixed(2)}s ease;
}
.grow-nav a:hover {
  color: #09090b;
  transform: scale(1.08) translateY(-1px);
}
</style>`},{id:`hdr-link-underline`,category:`header`,title:`リンク表現②：クリック・現在地で下にアンダーラインが引かれる`,subtitle:`選んだメニューの真下にだけ細いラインがスッと伸びて、「いまこのページを開いている」印を残す型`,mechanismTag:`::after 疑似要素 + scaleX(0 → 1)`,xRayCaption:`クリック／現在地になったリンクの底辺に置いた 2px の線が左端を支点に横へ伸びています`,interactiveHint:`「再生」またはヘッダー内の項目をクリックすると下線が切り替わります`,defaultDuration:.35,durationRange:{min:.15,max:1.2,step:.05},defaultEasing:`snappy`,hasEasingControl:!0,steps:[{title:`① リンクを position: relative、高さをヘッダーと揃える`,detail:`下の境界線に沿って綺麗に線が乗るよう、上下いっぱいの基準枠を作ります。`,codeHint:`position: relative; height: 100%`},{title:`② 底辺に太さ 2px のライン（::after）を透明縮小待機`,detail:`transform: scaleX(0) と transform-origin: left を指定して左端に畳んでおきます。`,codeHint:`transform: scaleX(0); transform-origin: left`},{title:`③ 現在ページ／ホバー時に scaleX(1) へ展開`,detail:`現在ページ（aria-current="page"）の線は引いたまま残すと現在地が一目で分かります。`,codeHint:`a[aria-current="page"]::after { transform: scaleX(1); }`}],keywords:[`ヘッダー`,`リンク`,`下線`,`アンダーライン`,`現在地`,`アクティブ`,`クリック`],buildPrompt:(e,t)=>k({name:`下線（アンダーライン）が引かれるヘッダーリンク`,goal:`ヘッダー項目にホバーまたは選択（現在地）すると、底辺に 2px のアンダーラインが左からスッと伸びて現在地を示すナビにする。`,mechanism:`::after 疑似要素に scaleX(0 → 1) + transform-origin: left を指定し、aria-current="page" 時は表示維持。`,requirements:[`現在のページ項目には aria-current="page" を付けて下線を固定表示する`,`幅の変更ではなく ::after の transform: scaleX() を使い周辺レイアウトの再計算を起こさないようにする`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<nav class="line-nav" id="lineNav">
  <a href="#a" class="is-active" aria-current="page">特徴</a>
  <a href="#b">機能</a>
  <a href="#c">料金</a>
</nav>

<style>
.line-nav { display: flex; gap: 24px; border-bottom: 1px solid #e4e4e7; }
.line-nav a {
  position: relative;
  padding: 12px 0;
  color: #71717a;
  text-decoration: none;
  font-weight: 600;
}
.line-nav a::after {
  content: "";
  position: absolute;
  inset: auto 0 -1px 0;
  height: 2px;
  background: #2563eb;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform ${e.duration.toFixed(2)}s ${t};
}
.line-nav a:hover, .line-nav a.is-active { color: #09090b; }
.line-nav a:hover::after, .line-nav a.is-active::after { transform: scaleX(1); }
</style>

<script>
(() => {
  const links = Array.from(document.querySelectorAll('#lineNav a'));
  links.forEach((link) => {
    link.addEventListener('click', () => {
      links.forEach((el) => {
        const active = el === link;
        el.classList.toggle('is-active', active);
        active ? el.setAttribute('aria-current', 'page') : el.removeAttribute('aria-current');
      });
    });
  });
})();
<\/script>`}},{id:`hdr-link-pill-active`,category:`header`,title:`リンク表現③：薄グレー帯の中で現在地だけ丸く枠囲み`,subtitle:`この図鑑のナビと同じ系譜。非選択は控えめなグレーにし、選んだ場所だけをくっきり角丸ピルで包む設計`,mechanismTag:`グレー帯トレイ + 選択ピル（黒塗り / 白抜き）`,xRayCaption:`薄いグレー帯を「器」にして現在地ボタンだけ濃いピルに変えるため、どこにいるか一目で把握できます`,interactiveHint:`「再生」または丸枠内の各項目をクリックして現在地を切り替えられます`,defaultDuration:.3,durationRange:{min:.1,max:1,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① ナビ全体を薄いグレー（#f4f4f5）の角丸帯でまとめる`,detail:`バラバラに文字を並べるより 1 つの操作島としてまとまりが生まれます。`,codeHint:`border-radius: 9999px; background: #f4f4f5; padding: 4px`},{title:`② 非選択項目は落ち着いたグレー文字のまま待機`,detail:`選択していない項目の主張を抑えることで、現在地のピルが真っ先に目に飛び込みます。`,codeHint:`color: #71717a`},{title:`③ 現在地だけ背景黒＋白文字の丸枠へ切り替える`,detail:`ホバー時だけ薄白（rgba(255,255,255,0.7)）を敷くと操作前後の違いも明確です。`,codeHint:`background: #18181b; color: #ffffff`}],keywords:[`ヘッダー`,`リンク`,`ピル`,`囲む`,`丸枠`,`現在地`,`グレーアウト`],buildPrompt:(e,t)=>k({name:`薄グレー帯＋丸ピル囲みの現在地ヘッダーリンク`,goal:`ヘッダーのリンク群を薄いグレーの角丸トレイに入れ、非選択リンクは薄グレー文字に抑えて現在選択中のリンクだけを濃い角丸ピルで囲む。`,mechanism:`トレイ枠と角丸ボタン群により、色コントラストだけで現在地と待機中を明確に区別。`,requirements:[`現在のページ項目には aria-current="page" を付与して背景色を濃くする`,`横幅が狭い画面でもピル内テキストが折り返されないよう white-space: nowrap と適切な横スクロール余白を確保する`],params:e,targetNote:t}),buildCode:e=>`<nav class="pill-tray" id="pillTray">
  <a href="#a" class="is-active" aria-current="page">特徴</a>
  <a href="#b">機能</a>
  <a href="#c">料金</a>
</nav>

<style>
.pill-tray {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 9999px;
  background: #f4f4f5;
}
.pill-tray a {
  padding: 6px 14px;
  border-radius: 9999px;
  color: #71717a;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all ${e.duration.toFixed(2)}s ease;
}
.pill-tray a:hover { background: rgba(255, 255, 255, 0.75); color: #18181b; }
.pill-tray a.is-active { background: #18181b; color: #ffffff; }
</style>

<script>
(() => {
  const links = Array.from(document.querySelectorAll('#pillTray a'));
  links.forEach((link) => {
    link.addEventListener('click', () => {
      links.forEach((el) => {
        const active = el === link;
        el.classList.toggle('is-active', active);
        active ? el.setAttribute('aria-current', 'page') : el.removeAttribute('aria-current');
      });
    });
  });
})();
<\/script>`},{id:`hdr-announcement-two-tier`,category:`header`,title:`2段構えヘッダー（上にお知らせ細帯＋下にメニュー）`,subtitle:`本ヘッダーのデザインを壊さず、最上段の薄いお知らせ帯でキャンペーンや新着アップデートを知らせる構造`,mechanismTag:`2層ヘッダー（お知らせ帯 + メインヘッダー）`,xRayCaption:`普段のヘッダーの上に 32px ほどの濃い細帯を積み上げ、× ボタンでいつでも非表示にできるようにします`,interactiveHint:`「PC / スマホ」切替や、上帯の「×」ボタン閉じ動作も試せます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.35,durationRange:{min:.15,max:1,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① お知らせ帯は高さ 32〜36px の超スリム設計にする`,detail:`太すぎると主役コンテンツを押し下げるため、1行だけで収まる細い帯に留めます。`,codeHint:`padding: 6px 16px; font-size: 12px`},{title:`② 本ヘッダーと強いコントラスト（黒×白）で役割分離`,detail:`メニューと混ざらないよう色味を変えると「これはお知らせ」と一目で区別できます。`,codeHint:`background: #18181b; color: #ffffff`},{title:`③ ユーザーが閉じられる × ボタンを右端に添える`,detail:`読み終えた人が自分で畳めるようにするとサイト全体の使い心地が上がります。`,codeHint:`aria-label="お知らせを閉じる"`}],keywords:[`ヘッダー`,`お知らせ`,`2段`,`バナー`,`アナウンス`,`静的`],buildPrompt:(e,t)=>k({name:`お知らせ帯＋メインメニューの2段構えヘッダー`,goal:`メインの1行ヘッダーの上部に、閉じるボタン付きのスリークなお知らせ帯を乗せた2段構造のヘッダーを作る。`,mechanism:`上段の細帯お知らせバー（背景コントラスト強め）＋下段の通常ナビゲーションバーを縦積み。`,isStatic:!0,requirements:[`お知らせバー右端に「×（閉じる）」ボタンを置き、閉じられるようにする`,`高さを抑えてファーストビューを圧迫しないようにする`],params:e,targetNote:t}),buildCode:()=>`<div class="top-wrapper">
  <div class="top-notice" id="topNotice">
    <span>新機能：通し番号検索（#001〜）に対応しました</span>
    <button type="button" id="closeNotice" aria-label="お知らせを閉じる">×</button>
  </div>
  <header class="main-head">
    <strong>Atlas</strong>
    <nav><a href="#features">機能</a><a href="#pricing">料金</a></nav>
  </header>
</div>

<style>
.top-notice {
  display: flex; align-items: center; justify-content: space-between;
  background: #18181b; color: #ffffff; padding: 6px 20px; font-size: 12px;
}
.top-notice button { border: 0; background: transparent; color: #a1a1aa; cursor: pointer; }
.main-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; background: #ffffff; border-bottom: 1px solid #e4e4e7;
}
.main-head nav { display: flex; gap: 20px; font-size: 13px; }
</style>

<script>
(() => {
  const bar = document.getElementById('topNotice');
  const btn = document.getElementById('closeNotice');
  if (!bar || !btn) return;
  btn.addEventListener('click', () => { bar.hidden = true; });
})();
<\/script>`},{id:`hdr-transparent-to-solid`,category:`header`,title:`ヒーロー透明ヘッダー → スクロールで白背景バーに変化`,subtitle:`大きな写真の最上部では透明＋白文字で景色を遮らず、下に読むと白背景＋黒文字の読みやすいバーへ切り替わる演出`,mechanismTag:`背景色・文字色クロスフェード（scrollY > しきい値）`,xRayCaption:`最上部（0〜28px）では background: transparent、それより下では白い固定バー＋境界線へ変化します`,interactiveHint:`「再生」または枠内の本文をスクロールして色の切り替わりを確認できます`,defaultDuration:.4,durationRange:{min:.15,max:1.2,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 初期状態は透明背景＋白文字で写真の上に重ねる`,detail:`position: fixed でファーストビュー写真の上に載せ、世界観を遮らないようにします。`,codeHint:`background: transparent; color: #ffffff`},{title:`② スクロール量がしきい値を超えたら is-solid 付与`,detail:`写真が通り過ぎて白い記事部分に入るタイミングで、ヘッダーを白背景＋黒文字へ変えます。`,codeHint:`header.classList.toggle("is-solid", window.scrollY > 60)`},{title:`③ 背景にわずかな透過ぼかしと下線を添える`,detail:`白背景になった後は境界線がはっきりし、下の本文文字が透けて読みにくくなるのを防ぎます。`,codeHint:`background: rgba(255,255,255,0.95); backdrop-filter: blur(8px)`}],keywords:[`ヘッダー`,`透明`,`透過`,`スクロール`,`切り替わり`,`ヒーロー`,`白文字`],buildPrompt:(e,t)=>k({name:`ヒーロー透過 → スクロール白背景ヘッダー`,goal:`画面最上部では透明＋白文字でメインビジュアルに溶け込み、一定量スクロールすると白背景＋黒文字＋細線ボーダーへ滑らかに切り替わる固定ヘッダーを作る。`,mechanism:`window.scrollY > 60 を判定し、is-solid クラスの ON/OFF で background-color / color / border-color をトランジション切り替え。`,requirements:[`透明時は写真と文字のコントラストが落ちないよう背景に暗いグラデーションを重ねる`,`文字色・ボタン色のコントラストも白背景後に合わせて同時切り替えする`],params:e,targetNote:t}),buildCode:e=>`<header id="heroHeader" class="hero-header">
  <span class="brand">Horizon</span>
  <nav><a href="#works">作品</a><a href="#contact">連絡</a></nav>
</header>

<style>
.hero-header {
  position: fixed;
  inset: 0 0 auto 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  color: #ffffff;
  background: transparent;
  transition: background-color ${e.duration.toFixed(2)}s ease, color ${e.duration.toFixed(2)}s ease;
  z-index: 50;
}
.hero-header.is-solid {
  background: rgba(255, 255, 255, 0.95);
  color: #18181b;
  border-bottom: 1px solid #e4e4e7;
  backdrop-filter: blur(8px);
}
</style>

<script>
(() => {
  const header = document.getElementById('heroHeader');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('is-solid', window.scrollY > 60);
  }, { passive: true });
})();
<\/script>`},{id:`hdr-rail-sidebar`,category:`header`,title:`左固定サイドレール型ナビ（図鑑・管理ツール向け2ペイン）`,subtitle:`上ではなく左端に縦長メニューを常設し、右側すべてを主役コンテンツに使える情報整理に強い構造`,mechanismTag:`2ペイン Grid + 左サイド sticky 固定`,xRayCaption:`左列幅（180〜240px）にカテゴリ一覧を常時表示し、スマホ幅では上部のバーへ折りたたみます`,interactiveHint:`「PC / スマホ」で左レールがスマホ上バーへ変わる様子を確認できます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.35,durationRange:{min:.15,max:1,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 左固定幅＋右可変幅（1fr）の2列を作る`,detail:`カテゴリ数が 6〜15 個ある図鑑やドキュメントでは、縦並びの方が一目で全体を見渡せます。`,codeHint:`grid-template-columns: 240px 1fr`},{title:`② 左ナビには position: sticky; top: 0 を掛ける`,detail:`右の長い一覧を下まで読んでも、左のメニューが迷子にならず手元に残ります。`,codeHint:`position: sticky; top: 20px`},{title:`③ スマホ幅では左レールを畳んで上バー＋ドロワーへ`,detail:`横幅が狭い画面では縦1列に戻し、ハンバーガーメニューに収納します。`,codeHint:`@media (max-width: 1023px)`}],keywords:[`サイドバー`,`左固定`,`サイドレール`,`2ペイン`,`図鑑`,`静的`,`ヘッダー`],buildPrompt:(e,t)=>k({name:`左固定サイドレール型ナビ（2ペイン構造）`,goal:`上ヘッダーを増やす代わりに左側に縦長メニューを固定配置し、右側全体を広々した主役エリアとして使える 2 ペイン構成にする。`,mechanism:`PC幅は 240px + 1fr の Grid＋sticky、モバイル幅では 1 列へ崩して上部ナビバー＋ドロワーに切り替える。`,isStatic:!0,requirements:[`カテゴリが増えてもはみ出さないようサイドバー自体に max-height と overflow-y: auto を設ける`,`タブレット・スマホ幅（1023px 以下）では左レールを上部バー＋ドロワーへ切り替え、本文領域を確保する`],params:e,targetNote:t}),buildCode:()=>`<div class="shell">
  <aside class="side-rail">
    <strong>SideRail</strong>
    <nav><a href="#s1" class="is-active">01 概要</a><a href="#s2">02 仕組み</a><a href="#s3">03 設定</a></nav>
  </aside>
  <main class="main-canvas">右側のコンテンツ領域</main>
</div>

<style>
.shell { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
.side-rail {
  position: sticky; top: 0; align-self: start; height: 100vh;
  padding: 20px; border-right: 1px solid #e4e4e7; background: #fafafa;
}
.side-rail nav { display: grid; gap: 6px; margin-top: 16px; }
.side-rail a { padding: 8px 10px; border-radius: 8px; text-decoration: none; color: #52525b; font-size: 13px; }
.side-rail a.is-active { background: #ffffff; color: #1d4ed8; font-weight: 700; }
.main-canvas { padding: 28px; }
@media (max-width: 767px) {
  .shell { grid-template-columns: 1fr; }
  .side-rail { position: static; height: auto; border-right: 0; border-bottom: 1px solid #e4e4e7; }
}
</style>`},{id:`ftr-cta-docked`,category:`footer`,title:`大きなCTAバナー一体型フッター（着地＋次の一歩）`,subtitle:`ページを最後まで読み終えた人のために、フッター最上部に目立つアクションカードを融合させた着地設計`,mechanismTag:`暗色フッター内 ＋ ハイコントラスト CTA カード`,xRayCaption:`濃い色のフッターの中に明るい青カードを差し込むことで、「読み終えたらここを押す」ゴールを作ります`,interactiveHint:`右上の「PC / スマホ」で狭い画面幅時の縦積みレイアウトも確認できます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.35,durationRange:{min:.15,max:1,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① フッターの上に誘導バナーを 1 枚統合する`,detail:`ただコピーライトで終わらせず「登録・相談・試しに使う」への最後の受け皿を用意します。`,codeHint:`border-radius: 16px; background: #2563eb`},{title:`② ボタンは白背景×青文字にして鮮明に際立たせる`,detail:`青いカードの上では白ボタンが一番強く目立ち、視線を迷わせません。`,codeHint:`background: #ffffff; color: #1d4ed8`},{title:`③ 下段の細線以下は控えめなリンク帯で引き締める`,detail:`CTAカードで感情・行動を促し、その下に規約・コピーライトを静かに添えます。`,codeHint:`border-top: 1px solid #27272a`}],keywords:[`フッター`,`footer`,`CTA`,`バナー`,`着地`,`登録誘導`,`静的`],buildPrompt:(e,t)=>k({name:`大きなCTAバナー一体型フッター`,goal:`フッターの上部に「無料で試す」などのアクション誘導カードを内蔵し、下段にシンプルなコピーライト帯を備えたコンバージョン向けフッターにする。`,mechanism:`ダークトーンの footer コンテナ上段にアクセントカラーの CTA カードを埋め込み、モバイルでは縦積み中央寄せに切り替え。`,isStatic:!0,requirements:[`CTA内の見出し・補足・ボタンの余白を保ちスマホでも窮屈に見えないようにする`,`CTAボタンは背景色に対してコントラスト比 4.5:1 以上と押しやすいパディング（44px 相当のタップ高）を確保する`],params:e,targetNote:t}),buildCode:()=>`<footer class="cta-footer">
  <div class="cta-banner">
    <div>
      <h3>今すぐ無料で試してみませんか？</h3>
      <p>登録は1分・いつでも解約できます</p>
    </div>
    <a href="#start" class="cta-white-btn">無料で始める</a>
  </div>
  <div class="cta-foot-bottom">
    <span>© 2026 KatakataLab</span>
    <nav><a href="#terms">利用規約</a><a href="#contact">お問い合わせ</a></nav>
  </div>
</footer>

<style>
.cta-footer { background: #18181b; color: #a1a1aa; padding: 32px 24px 24px; }
.cta-banner {
  max-width: 960px; margin: 0 auto 24px; padding: 24px; border-radius: 16px;
  background: #2563eb; color: #ffffff;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.cta-white-btn { background: #fff; color: #1d4ed8; padding: 10px 18px; border-radius: 10px; font-weight: 700; text-decoration: none; }
.cta-foot-bottom {
  max-width: 960px; margin: 0 auto; padding-top: 16px; border-top: 1px solid #27272a;
  display: flex; justify-content: space-between; font-size: 12px;
}
@media (max-width: 639px) { .cta-banner { flex-direction: column; text-align: center; } }
</style>`},{id:`ftr-giant-wordmark`,category:`footer`,title:`横幅いっぱいの巨大文字ロゴを敷いたブランドフッター`,subtitle:`細い案内帯の下にサービス名やスタジオ名を画面幅いっぱいにドンと配置する、デザイン重視サイト定番の余韻演出`,mechanismTag:`下端合わせ + 超大型字間タイポグラフィ`,xRayCaption:`画面横幅に応じたフォントサイズ（clamp）で文字を下端に敷き、世界観の余韻を残してページを閉じます`,interactiveHint:`「PC / スマホ」で画面幅に応じたタイポグラフィ文字の収まりを確認できます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.35,durationRange:{min:.15,max:1,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 上部にコンパクトな規約・SNS・コピーライト帯を置く`,detail:`必要な情報はこの 1 行でサッと済ませ、下の大きなスペースを空けます。`,codeHint:`display: flex; justify-content: space-between`},{title:`② clamp() で文字サイズを画面幅にフィットさせる`,detail:`PCでは大迫力、スマホでははみ出して横スクロールが起きないサイズへ自動調整します。`,codeHint:`font-size: clamp(2.5rem, 12vw, 9rem)`},{title:`③ 行高（line-height）を 0.85〜0.95 に詰めて底辺へ`,detail:`下の余白を少し切るかピタッと底へ置くとポスターのような締まりが出ます。`,codeHint:`line-height: 0.9; letter-spacing: -0.04em`}],keywords:[`フッター`,`巨大文字`,`タイポグラフィ`,`ブランド`,`ロゴ`,`ポスター`,`静的`],buildPrompt:(e,t)=>k({name:`巨大文字ロゴ・ブランドフッター`,goal:`上部にミニマルなリンク・著作権帯を置き、その下へ画面横幅いっぱいの超大型タイポグラフィブランド名を据えたポートフォリオ／ブランド風フッターを作る。`,mechanism:`clamp() によるレスポンシブ巨大文字サイズ＋引き締めた tracking（-0.04em）と line-height。`,isStatic:!0,requirements:[`スマホ幅でも横はみ出し（横スクロール）が絶対に出ないよう clamp() と overflow-hidden を設定する`,`装飾用の巨大ロゴ文字列には aria-hidden="true" を付与し、支援技術での重複読み上げを防ぐ`],params:e,targetNote:t}),buildCode:()=>`<footer class="wordmark-footer">
  <div class="wm-top">
    <span>© 2026 KATAKATALAB</span>
    <nav><a href="#works">Works</a><a href="#about">About</a><a href="#contact">Contact</a></nav>
  </div>
  <div class="wm-giant" aria-hidden="true">KATAKATA</div>
</footer>

<style>
.wordmark-footer {
  padding: 28px 24px 0;
  border-top: 1px solid #e4e4e7;
  background: #ffffff;
  overflow: hidden;
}
.wm-top { display: flex; justify-content: space-between; font-size: 12px; color: #71717a; margin-bottom: 18px; }
.wm-top nav { display: flex; gap: 16px; }
.wm-giant {
  font-size: clamp(2.75rem, 14vw, 8.5rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 0.88;
  text-align: center;
  color: #18181b;
  user-select: none;
}
</style>`},{id:`ftr-newsletter-form`,category:`footer`,title:`1行メール／更新通知登録フォーム付きフッター`,subtitle:`記事サイトやニュースサービスで定番の、「読んだ勢いのままメールアドレスを1行で登録できる」実用フッター`,mechanismTag:`インライン入力フォーム + 送信済みフィードバック`,xRayCaption:`説明文の横に [メールアドレス欄 ＋ 登録ボタン] を 1 セットで並べ、ページ移動なしで登録完了します`,interactiveHint:`「PC / スマホ」切替や、枠内のメールアドレス入力＆「登録」ボタンを試せます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.35,durationRange:{min:.15,max:1,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 入力は「メールアドレス1項目のみ」に絞る`,detail:`フッター内で項目が多いと離脱するため、アドレス 1 枠＋登録ボタンの 1 行だけにするのが鉄則です。`,codeHint:`<input type="email" /> + <button type="submit">`},{title:`② 「何が届くのか」を 1 行で約束する`,detail:`入力欄の横に「新機能の追加時のみお知らせ」と安心感を添えると登録率が上がります。`,codeHint:`flex: justify-between`},{title:`③ 入力サニタイズと送信後メッセージを用意`,detail:`制御文字や不正文字を弾き、登録押下後はその場で「済み✓」等に切り替えて安心させます。`,codeHint:`aria-label="お知らせ登録"`}],keywords:[`フッター`,`ニュースレター`,`メルマガ`,`フォーム`,`メールアドレス`,`登録`,`静的`],buildPrompt:(e,t)=>k({name:`1行メール登録フォーム付きフッター`,goal:`フッター内に簡潔な説明と「メールアドレス入力欄＋登録ボタン」を並べ、ページ遷移なしで登録完了状態を返せる構成にする。`,mechanism:`Flex 配置のインライン <form>＋クライアントサニタイズ＋送信時ステータス反転。`,isStatic:!0,requirements:[`ラベル（aria-label）とメールアドレス形式チェックを必ず設ける`,`モバイル幅では説明と入力フォームが縦2段に綺麗に折り返すようにする`],params:e,targetNote:t}),buildCode:()=>`<footer class="news-footer">
  <div class="news-row">
    <div>
      <strong>更新メールを受け取る</strong>
      <p>新しい表現の追加情報を月1〜2回お届けします。</p>
    </div>
    <form id="newsForm" class="news-form">
      <input id="newsEmail" type="email" required maxlength="80" placeholder="you@example.com" aria-label="メールアドレス" />
      <button type="submit" id="newsBtn">登録</button>
    </form>
  </div>
</footer>

<style>
.news-footer { padding: 28px 24px; background: #fafafa; border-top: 1px solid #e4e4e7; }
.news-row { max-width: 960px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; }
.news-form { display: flex; gap: 8px; }
.news-form input { padding: 8px 12px; border: 1px solid #d4d4d8; border-radius: 8px; }
.news-form button { padding: 8px 16px; border: 0; border-radius: 8px; background: #18181b; color: #fff; font-weight: 700; cursor: pointer; }
</style>

<script>
(() => {
  const form = document.getElementById('newsForm');
  const btn = document.getElementById('newsBtn');
  if (!form || !btn) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    btn.textContent = '✓ 登録済み';
  });
})();
<\/script>`},{id:`ftr-compact-utility`,category:`footer`,title:`稼働状況ドット・言語切替付きユーティリティフッター`,subtitle:`SaaSやツールサイトに多い「システム正常稼働中 ●」の安心ステータス表示＋言語／SNSリンクを1段に整える足元`,mechanismTag:`ステータスピル（緑ドット）+ 補助リンク群`,xRayCaption:`稼働ランプ（緑色の微小ドット）を見せるだけでツールとしての信頼感が一気に高まります`,interactiveHint:`右上の「PC / スマホ」で狭い画面幅での整列変化も確認できます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.35,durationRange:{min:.15,max:1,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 左に「正常稼働中」ステータスバッジを置く`,detail:`小さな緑色の丸点（6〜8px）と柔らかい緑背景のピルで現在の安心感を伝えます。`,codeHint:`border-radius: 9999px; background: #ecfdf5`},{title:`② 右に言語切替・外部リンクを控えめに揃える`,detail:`文字サイズを 12px に統一してフッターの重心を低く保ちます。`,codeHint:`display: flex; align-items: center; gap: 16px`},{title:`③ スマホ幅では左揃えの縦積みへ落とす`,detail:`窮屈に横並びさせず、1 行ずつゆとりを持って見せます。`,codeHint:`flex-direction: column; align-items: flex-start`}],keywords:[`フッター`,`ステータス`,`稼働`,`言語`,`SNS`,`SaaS`,`静的`],buildPrompt:(e,t)=>k({name:`稼働状況ドット・言語切替付きコンパクトフッター`,goal:`フッター左側に緑ドットの稼働ステータスバッジ、右側に言語切替・SNS案内を添えたツールサイト向けフッターにする。`,mechanism:`1行Flexbox 配置と淡色ピルステータス表示（スマホ時は左寄せ縦積み）。`,isStatic:!0,requirements:[`ステータス色の点滅アニメーション（pulse）を使う場合も控えめにして視覚負担を掛けない`,`色ドットだけに頼らず「正常稼働」などの明確な状態テキストを併記し、色覚特性に関わらず把握できるようにする`],params:e,targetNote:t}),buildCode:()=>`<footer class="util-footer">
  <span class="status-pill"><i class="dot" aria-hidden="true"></i>すべてのシステム正常稼働</span>
  <div class="util-right">
    <span>日本語 (JP)</span>
    <a href="#x">X</a>
    <a href="#github">GitHub</a>
  </div>
</footer>

<style>
.util-footer {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;
  padding: 16px 24px; border-top: 1px solid #e4e4e7; background: #ffffff; font-size: 12px; color: #71717a;
}
.status-pill {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
  border-radius: 9999px; border: 1px solid #a7f3d0; background: #ecfdf5; color: #065f46; font-weight: 600;
}
.dot { width: 7px; height: 7px; border-radius: 50%; background: #10b981; }
.util-right { display: flex; gap: 16px; }
</style>`}],re=[{id:`text-tracking-compress`,category:`text`,title:`広がった字間がギュッと締まって定着する（シネマ導入）`,subtitle:`映画のタイトルのように広い文字間隔からゆっくり中心へ引き締まり、重厚な第一印象を作る動き`,mechanismTag:`letter-spacing + opacity 収束`,xRayCaption:`letter-spacing を 0.45em の広さから 0.02em の標準間隔へ滑らかに縮めています`,interactiveHint:`「再生」で広くなった状態から中心へ締まる動きを繰り返せます`,defaultDuration:.9,durationRange:{min:.3,max:2.2,step:.05},secondarySlider:{label:`初期の広がり具合`,unit:`段階`,min:6,max:24,step:2,defaultValue:16},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① 初期状態は字間を大きく開けて薄く表示`,detail:`letter-spacing を広めに設定し、透明度に少し余白を残しておくと緊張感が出ます。`,codeHint:`letter-spacing: 0.4em; opacity: 0.25`},{title:`② 減速カーブで標準の字間（0.02em）へ寄せる`,detail:`中央揃え（text-align: center）にしておくと左右対称に中心へ集まります。`,codeHint:`text-align: center; letter-spacing: 0.02em`},{title:`③ 短すぎると落ち着きが消えるため 0.8〜1.1秒が適切`,detail:`シネマ風の余韻を出すため、速さよりも後半の減速余韻を大切にします。`,codeHint:`transition: letter-spacing 0.9s ease-out`}],keywords:[`文字`,`字間`,`トラッキング`,`シネマ`,`タイトル`,`引き締まる`],buildPrompt:(e,t)=>k({name:`字間が詰まるシネマ登場アニメーション`,goal:`大きく横に広がった状態の見出し文字が、中央に向かって静かに引き締まりながらくっきり定着する演出を作りたいです。`,mechanism:`text-align: center の文字に対し、初期 letter-spacing を ${(e.distance*.025).toFixed(2)}em・opacity: 0.25 にしてから、通常間隔（0.02em）・opacity: 1 へ滑らかに収束させます。`,requirements:[`親枠の幅が狭いモバイルでも折り返してガタつかないよう余白・文字サイズを調整する`,`文字が詰まりすぎて可読性が落ちないよう最終 letter-spacing は -0.02em 以上を維持する`],params:e,secondaryLabel:`広がり量`,secondaryUnit:`段階`,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<h1 class="cinema-title is-animating">MOTION ATLAS</h1>

<style>
.cinema-title {
  text-align: center;
  font-weight: 800;
  letter-spacing: ${(e.distance*.025).toFixed(2)}em;
  opacity: 0.25;
  transition: letter-spacing ${e.duration.toFixed(2)}s ${t}, opacity 0.4s ease;
}
.cinema-title.is-active {
  letter-spacing: 0.02em;
  opacity: 1;
}
</style>

<script>
(() => {
  const el = document.querySelector('.cinema-title');
  if (!el) return;
  requestAnimationFrame(() => el.classList.add('is-active'));
})();
<\/script>`}},{id:`text-scroll-fill`,category:`text`,title:`読む位置に合わせて文字にインクが染み込む`,subtitle:`最初は薄いグレーだった長い文章が、スクロールや進行に合わせて左から濃い黒へ塗り替わります`,mechanismTag:`background-clip: text + 進行率グラデーション`,xRayCaption:`文字の形で背景グラデーションを型抜き（background-clip: text）し、境目%を動かしています`,interactiveHint:`「再生」または下のスライダーをドラッグして色の染み込み具合を試せます`,defaultDuration:1.4,durationRange:{min:.4,max:3,step:.1},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 文字自身の色を transparent（透明）にする`,detail:`背景に塗った濃淡2色のグラデーションを透かして見せるための準備です。`,codeHint:`color: transparent; background-clip: text`},{title:`② 黒とグレーの境目 % を数値で制御する`,detail:`linear-gradient(90deg, #18181b 60%, #d4d4d8 60%) のように境目を動かすだけです。`,codeHint:`linear-gradient(90deg, #18181b P%, #d4d4d8 P%)`},{title:`③ スクロール量に連動させると没入感が高まる`,detail:`LPのブランドメッセージやストーリー紹介セクションで視線を途切れさせません。`,codeHint:`style.setProperty("--read-pct", pct + "%")`}],keywords:[`文字`,`スクロール`,`塗りつぶし`,`ハイライト`,`読み進め`,`グラデーション`],buildPrompt:(e,t)=>k({name:`進行率で文字色が染み込むリード文`,goal:`薄いグレーのテキストが、閲覧進捗に合わせて左端から濃いインク色に塗り替わっていく表現を作りたいです。`,mechanism:`background-clip: text と color: transparent を用い、CSSカスタムプロパティ --pct を境界にした2色 linear-gradient を進捗値に応じて更新します。`,requirements:[`prefers-reduced-motion 時は最初から 100% 濃色で読みやすく表示する`,`background-clip: text 非対応環境でも判読できるようベース文字色のフォールバックを併記する`],params:e,targetNote:t}),buildCode:e=>`<p class="fill-text" style="--pct: 55%">
  読み進めるリズムに合わせて言葉が浮かび上がります。
</p>

<style>
.fill-text {
  font-weight: 800;
  color: #18181b;
  color: transparent;
  background-image: linear-gradient(90deg, #18181b 50%, #d4d4d8 50%);
  background-size: 200% 100%;
  background-position: calc(100% - var(--pct)) 0;
  -webkit-background-clip: text;
  background-clip: text;
  transition: background-position ${e.duration.toFixed(2)}s ease;
}
</style>`},{id:`text-word-slot`,category:`text`,title:`一語だけがスロットのようにくるくる入れ替わる`,subtitle:`見出しの前半は固定したまま、強調したい単語枠だけを上書き交換して複数用途を1画面で伝えます`,mechanismTag:`固定見出し + overflow: hidden 縦スライド枠`,xRayCaption:`「仕組み」をONにすると切り抜き枠の上下に待機している次の単語が透けて見えます`,interactiveHint:`「再生」または下の単語ボタンをクリックしてスロット切り替えを試せます`,defaultDuration:.45,durationRange:{min:.2,max:1.2,step:.05},defaultEasing:`snappy`,hasEasingControl:!0,steps:[{title:`① 入れ替える語を1列に縦積みし、1行分の高さで切り抜く`,detail:`単語リストの親要素を 1行分の高さ + overflow: hidden にして1語だけを見せます。`,codeHint:`height: 36px; overflow: hidden`},{title:`② transform: translateY(-番号 × 行高) でズラす`,detail:`2番目なら -36px、3番目なら -72px と正確な高さ単位で上へ送ります。`,codeHint:`transform: translateY(-72px)`},{title:`③ 高さをピクセル単位で揃えるとガタつかない`,detail:`line-height と item height を一致させておくと上下のズレがゼロになります。`,codeHint:`display: flex; align-items: center; height: 36px`}],keywords:[`スロット`,`文字切り替え`,`回転`,`ローテーション`,`コピー`,`見出し`],buildPrompt:(e,t)=>k({name:`見出しの一語だけが入れ替わるワードスロット`,goal:`見出し文章の強調語句だけを固定枠の中で上下スライドさせ、サービスの複数メリットをリズミカルに見せたいです。`,mechanism:`単語を縦に並べたトラックを高さ固定 + overflow: hidden 枠に収め、translateY(-index * lineHeight) を transition で送ります。`,requirements:[`最長単語の幅に合わせて枠幅（min-width）を確保し周囲の文章が左右に揺れないようにする`,`自動切り替えタイマーはタブ非表示時（document.hidden）やページ離脱時に必ずクリア・停止する`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="headline">
  UIは、
  <div class="slot-win">
    <div class="slot-track" id="slotTrack">
      <span>伝わる</span><span>心地よい</span><span>迷わない</span>
    </div>
  </div>
</div>

<style>
.slot-win { display: inline-block; height: 36px; overflow: hidden; vertical-align: middle; }
.slot-track { display: flex; flex-direction: column; transition: transform ${e.duration.toFixed(2)}s ${t}; }
.slot-track span { height: 36px; line-height: 36px; font-weight: 800; color: #2563eb; }
</style>

<script>
(() => {
  const track = document.getElementById('slotTrack');
  if (!track) return;
  let i = 0;
  setInterval(() => {
    i = (i + 1) % 3;
    track.style.transform = 'translateY(' + (-i * 36) + 'px)';
  }, 1800);
})();
<\/script>`}},{id:`text-circular-badge`,category:`text`,title:`円周に沿ってゆっくり回るスタンプ見出し`,subtitle:`SVGの円パスに文字を沿わせて回転させ、ヒーローの右下やスクロール誘導に視線のアクセントを添えます`,mechanismTag:`SVG <textPath> + 360度連続回転`,xRayCaption:`文字の下にある点線の円が SVG の <path> ガイドで、グループ全体を 0→360度 で回転させています`,defaultDuration:1.5,durationRange:{min:.6,max:3,step:.1},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① SVGの <path> で真円を定義する`,detail:`見た目には線を描かず（fill="none"）、文字を沿わせる軌道としてだけ使います。`,codeHint:`<path id="circle" d="..." />`},{title:`② <textPath> で円周上に文字列を配置する`,detail:`href で円の ID を指定し、letter-spacing で1周ぐるっとバランス良く広げます。`,codeHint:`<textPath href="#circle">...</textPath>`},{title:`③ CSS animation infinite linear で一定速度回転`,detail:`減速させず linear（等速）でゆっくり回すのが酔わない秘訣です。`,codeHint:`animation: spin 12s linear infinite`}],keywords:[`円形テキスト`,`回転`,`スタンプ`,`シール`,`SVG`,`スクロールダウン`],buildPrompt:(e,t)=>k({name:`円周に沿って回転するスタンプテキスト`,goal:`円形の軌道に沿って文字が並び、ゆっくり等速回転するデザインスタンプを作りたいです。`,mechanism:`インライン SVG の <defs><path> 円軌道へ <textPath> で文字列を添わせ、SVG 全体を animation: linear infinite で 360deg 回転させます。`,requirements:[`中央アイコンは回転させず固定し、文字リングだけが落ち着いて回るようにする`,`装飾用の回転テキストリングには aria-hidden="true" を付け、本文の読み上げを妨げないようにする`],params:e,targetNote:t}),buildCode:e=>`<div class="badge-wrap">
  <svg viewBox="0 0 120 120" class="spin-ring" aria-hidden="true">
    <defs><path id="cPath" d="M60,60 m-42,0 a42,42 0 1,1 84,0 a42,42 0 1,1 -84,0"/></defs>
    <text font-size="10" font-weight="700" letter-spacing="2">
      <textPath href="#cPath">SCROLL DOWN • MOTION ATLAS •</textPath>
    </text>
  </svg>
</div>

<style>
.spin-ring { width: 112px; height: 112px; animation: spinRing ${(e.duration*8).toFixed(1)}s linear infinite; }
@keyframes spinRing { to { transform: rotate(360deg); } }
</style>`},{id:`text-outline-fill`,category:`text`,title:`中抜き線文字が左からベタ塗りに変わる`,subtitle:`輪郭だけの文字の上に塗りつぶし文字を重ね、clip-path で左からじわっと色を流し込む演出です`,mechanismTag:`text-stroke 輪郭 + clip-path 塗りレイヤー`,xRayCaption:`下層に輪郭だけ・上層に塗りつぶしを重ね、上層の可視範囲 clip-path を左から解放しています`,interactiveHint:`「再生」または文字をクリックすると輪郭と塗りつぶしが切り替わります`,defaultDuration:.65,durationRange:{min:.25,max:1.8,step:.05},defaultEasing:`snappy`,hasEasingControl:!0,steps:[{title:`① 同じ文字を「線だけ」と「塗りつぶし」の2枚重ねにする`,detail:`下層を transparent + -webkit-text-stroke にし、上層をベタ塗り文字でぴったり重ねます。`,codeHint:`-webkit-text-stroke: 1.5px #18181b`},{title:`② 上層のクリップを inset(0 100% 0 0) にする`,detail:`最初は右側 100% を隠しておくことで下の線文字だけがくっきり見えます。`,codeHint:`clip-path: inset(0 100% 0 0)`},{title:`③ 再生・ホバー時に inset(0 0% 0 0) へ開く`,detail:`左からインクが注がれるようなシャープな変化をレイアウトズレなしで表現できます。`,codeHint:`clip-path: inset(0 0% 0 0)`}],keywords:[`アウトライン`,`中抜き`,`塗りつぶし`,`線文字`,`clip-path`,`ホバー`],buildPrompt:(e,t)=>k({name:`輪郭文字が左から塗りつぶされる見出し`,goal:`アウトライン（中抜き線）の見出しに左端から色が流れ込んで塗りつぶし文字に変わる表現を作りたいです。`,mechanism:`2層重ねの文字のうち上層塗りを clip-path: inset(0 100% 0 0) から inset(0 0% 0 0) へトランジションさせます。`,requirements:[`aria-hidden="true" を複製層に付け、スクリーンリーダーが同じ文を2回読み上げないようにする`,`下層の輪郭文字と上層の塗り文字は同一フォント・字間・行高を揃え、滲みやズレを防ぐ`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="outline-wrap">
  <span class="outline-base">CREATIVE UI</span>
  <span class="outline-fill" aria-hidden="true">CREATIVE UI</span>
</div>

<style>
.outline-wrap { position: relative; display: inline-block; font-size: 36px; font-weight: 900; }
.outline-base { color: transparent; -webkit-text-stroke: 1.5px #18181b; }
.outline-fill {
  position: absolute; inset: 0; color: #18181b;
  clip-path: inset(0 100% 0 0);
  transition: clip-path ${e.duration.toFixed(2)}s ${t};
}
.outline-wrap:hover .outline-fill { clip-path: inset(0 0% 0 0); }
</style>`}},{id:`reveal-frame-zoom`,category:`reveal`,title:`外枠サイズを変えずに中身の写真だけをズームする`,subtitle:`写真やサムネイルに触れたとき、隣のカードを押し出さず額縁の内側だけを拡大して上品に反応します`,mechanismTag:`外枠 overflow: hidden + 内枠 scale`,xRayCaption:`「仕組み」をONにすると額縁を飛び出した拡大画像の範囲が見えます`,interactiveHint:`「再生」またはカードをクリックして内側ズームの切り替えを試せます`,defaultDuration:.45,durationRange:{min:.2,max:1.4,step:.05},secondarySlider:{label:`ズーム拡大率`,unit:`%増`,min:4,max:24,step:2,defaultValue:12},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① 外枠カードに overflow: hidden を指定`,detail:`どれだけ中身が大きくなっても額縁の輪郭からはみ出さない壁を作ります。`,codeHint:`overflow: hidden; border-radius: 12px`},{title:`② 内側の画像要素だけに scale(1.12) を当てる`,detail:`親ではなく子要素（写真・グラフィック層）だけを拡大することで周辺配置を守ります。`,codeHint:`.card:hover .card-media { transform: scale(1.12) }`},{title:`③ 拡大倍率は 1.05〜1.14 倍が上品`,detail:`やりすぎると画像が粗く見えるため、10%前後のズームと減速イージングが王道です。`,codeHint:`transition: transform 0.45s cubic-bezier(...)`}],keywords:[`カード`,`拡大`,`ズーム`,`サムネイル`,`額縁`,`overflow`],buildPrompt:(e,t)=>k({name:`額縁固定・内側画像だけズームするカード`,goal:`カードにホバーやフォーカスを当てたとき、外枠の寸法や角丸を変えず内側のビジュアルだけが滑らかに拡大されるようにしたいです。`,mechanism:`外枠に overflow: hidden をかけ、内側メディア要素だけを transform: scale(1.${String(e.distance).padStart(2,`0`)}) にアニメーションさせます。`,requirements:[`角丸（border-radius）が Safari でも一瞬はがれないよう外枠に overflow: hidden + isolation: isolate を付与する`,`ズーム倍率は 1.05〜1.14 倍程度に抑え、画像がぼやけたり周辺レイアウトを押したりしないようにする`],params:e,secondaryLabel:`拡大率`,secondaryUnit:`%増`,targetNote:t}),buildCode:e=>{let t=D[e.easing].css,n=(1+e.distance/100).toFixed(2);return`<article class="photo-card">
  <div class="photo-inner">カードビジュアル</div>
</article>

<style>
.photo-card { overflow: hidden; border-radius: 12px; width: 260px; height: 150px; }
.photo-inner {
  width: 100%; height: 100%;
  transition: transform ${e.duration.toFixed(2)}s ${t};
}
.photo-card:hover .photo-inner { transform: scale(${n}); }
</style>`}},{id:`reveal-caption-overlay`,category:`reveal`,title:`画像の足元から説明帯がせり上がるオーバーレイ`,subtitle:`普段はビジュアルを綺麗に見せ、触れた瞬間にだけ下から半透明の説明帯を滑らせて情報を足します`,mechanismTag:`下部絶対配置 + translateY(100% → 0)`,xRayCaption:`画像の下辺（外）に隠していた半透明パネルを translateY(0) で引き上げています`,interactiveHint:`「再生」または画像へカーソル／タップすると説明帯が上がります`,defaultDuration:.35,durationRange:{min:.15,max:1,step:.05},defaultEasing:`snappy`,hasEasingControl:!0,steps:[{title:`① 説明パネルを bottom: 0 に重ね、下に100%押し出して隠す`,detail:`height を変えるのではなく translateY(100%) で枠外に待機させます。`,codeHint:`transform: translateY(100%)`},{title:`② 濃い半透明背景（rgba）で白文字の可読性を守る`,detail:`写真の上に文字が乗ると読みづらくなるため、必ず背景黒幕でコントラストを確保します。`,codeHint:`background: rgba(9, 9, 11, 0.86)`},{title:`③ タッチ端末ではタップ開閉にも対応`,detail:`スマホはホバーがないため、タップでも見られるようトグルや常時表示 fallback を組みます。`,codeHint:`.card:hover .cap, .card.is-open .cap`}],keywords:[`画像`,`キャプション`,`説明`,`オーバーレイ`,`ポートフォリオ`,`ホバー`],buildPrompt:(e,t)=>k({name:`画像下部から説明幕が滑るキャプションオーバーレイ`,goal:`作品サムネイルの上に普段は説明を載せず、ホバーやタップ時だけ下から半透明キャプション帯がせり上がるようにしたいです。`,mechanism:`overflow: hidden カードの最下部に position: absolute で説明パネルを置き、translateY(100%) から translateY(0) へ滑らせます。`,requirements:[`スマホなどのタッチ画面でもタップやフォーカスで見られるよう .is-open クラスも併用する`,`写真の上の文字が埋もれないよう暗色のオーバーレイグラデーションで WCAG コントラスト比 4.5:1 以上を保つ`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="media-card">
  <div class="media-cap">事例タイトル・概要</div>
</div>

<style>
.media-card { position: relative; overflow: hidden; border-radius: 12px; width: 260px; height: 160px; }
.media-cap {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 12px;
  color: #fff; background: rgba(9,9,11,0.86);
  transform: translateY(100%);
  transition: transform ${e.duration.toFixed(2)}s ${t};
}
.media-card:hover .media-cap { transform: translateY(0); }
</style>`}},{id:`reveal-blur-focus`,category:`reveal`,title:`ぼかしが晴れながらクッキリ焦点が合う登場`,subtitle:`霧の奥からピントが合うように、filter: blur() と透明度を同時にクリアして繊細に浮かび上がらせます`,mechanismTag:`filter: blur() → 0px + scale(1.03 → 1)`,xRayCaption:`最初だけ軽いぼかし（blur）とわずかな拡大をかけ、定位置と同時にピントをゼロへ戻しています`,interactiveHint:`「再生」でピンボケからくっきり定着する演出を確認できます`,defaultDuration:.75,durationRange:{min:.25,max:1.8,step:.05},secondarySlider:{label:`ぼかしの強さ`,unit:`px`,min:2,max:16,step:2,defaultValue:8},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① 初期ぼかしは 6〜12px 程度に控えめに抑える`,detail:`blur が大きすぎると描画負荷が高くなるため、16px 以下に留めるのがプロ基準です。`,codeHint:`filter: blur(8px); opacity: 0.3`},{title:`② scale(1.03 → 1) を添えるとピント感が増す`,detail:`カメラのレンズが被写体に合うようなわずかな収縮が自然です。`,codeHint:`transform: scale(1.03) → scale(1)`},{title:`③ アニメーション終了後は blur(0px) にして文字を鋭く保つ`,detail:`終了後はフィルタを外し、通常のくっきりした文字レンダリングへ戻します。`,codeHint:`filter: blur(0px); opacity: 1`}],keywords:[`ぼかし`,`ブラー`,`フォーカス`,`ピント`,`登場`,`上品`],buildPrompt:(e,t)=>k({name:`ぼかし解除によるフォーカス登場`,goal:`カードやパネルがぼんやり霞んだ状態から、カメラのピントが合うようにくっきり浮かび上がる演出を作りたいです。`,mechanism:`filter: blur(${e.distance}px)・opacity: 0.3・scale(1.03) から blur(0px)・opacity: 1・scale(1) へ遷移させます。`,requirements:[`モバイルの性能低下を防ぐため blur 上限は 12〜16px 以内かつ短時間で解除する`,`完了状態では filter: blur(0px) へ戻し、文字の輪郭がぼやけたまま残らないようにする`],params:e,secondaryLabel:`ぼかし半径`,secondaryUnit:`px`,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="focus-card is-visible">ピントが合うカード</div>

<style>
.focus-card {
  filter: blur(${e.distance}px); opacity: 0.3; transform: scale(1.03);
  transition: filter ${e.duration.toFixed(2)}s ${t}, opacity ${e.duration.toFixed(2)}s ease, transform ${e.duration.toFixed(2)}s ${t};
}
.focus-card.is-visible { filter: blur(0px); opacity: 1; transform: scale(1); }
</style>`}},{id:`reveal-staggered-offset`,category:`reveal`,title:`段違いグリッド配置（左右の視線を緩やかにずらす静的組版）`,subtitle:`2列カードの右列だけを少し下に下げて配置し、均等な一覧に余白のリズムを生むデザイン手法です`,mechanismTag:`2列Grid + 偶数カラム translateY オフセット（静的配置）`,xRayCaption:`PC表示のときだけ右側列に 16px の段差余白を作り、単調な格子並びを防いでいます`,interactiveHint:`右上の「PC / スマホ」でスマホ時に段差をゼロへ戻す工夫を確認できます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.35,durationRange:{min:.2,max:1,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① PC時は 2 列目（nth-child(even)）だけ下にずらす`,detail:`全カードを同じ高さで揃えるより、リズムと雑誌のような洗練された余白が生まれます。`,codeHint:`@media (min-width: 768px) { .card:nth-child(even) { transform: translateY(24px); } }`},{title:`② スマホ（1列表示）では必ず段差を解除する`,detail:`縦1列に並んだときに段差が残ると余白が不揃いに見えるため、狭い画面では 0 に戻します。`,codeHint:`transform: none (on mobile)`},{title:`③ セクション下部に逃げ余白（padding-bottom）を足す`,detail:`右列が下に飛び出すぶん、親セクションの底余白を少し多めに取って干渉を防ぎます。`,codeHint:`padding-bottom: 32px`}],keywords:[`段違い`,`オフセット`,`グリッド`,`2列`,`配置`,`静的`,`デザイン`],buildPrompt:(e,t)=>k({name:`段違い2列オフセットグリッド（静的組版）`,goal:`事例カードや特徴カードを2列に並べるとき、右列だけを半段下にずらしてリズム感のある洗練されたレイアウトを組みたいです。`,mechanism:`Desktop幅以上でのみ偶数列アイテムへ translateY(24px) を与え、1列表示となるモバイル幅ではオフセットを解除して縦整列に保ちます。`,isStatic:!0,requirements:[`最下部の要素が下のセクションに重ならないようコンテナに十分な下余白を持たせる`,`スマホ幅（768px 未満）の 1 列表示時は段差 translateY を無効化し均等な余白に戻す`],params:e,targetNote:t}),buildCode:()=>`<div class="offset-grid">
  <div class="item">01 左列</div>
  <div class="item">02 右列（段差あり）</div>
</div>

<style>
.offset-grid { display: grid; grid-template-columns: 1fr; gap: 16px; padding-bottom: 24px; }
@media (min-width: 768px) {
  .offset-grid { grid-template-columns: repeat(2, 1fr); }
  .offset-grid .item:nth-child(even) { transform: translateY(16px); }
}
</style>`},{id:`nav-icon-morph-variants`,category:`nav`,title:`開閉アイコン変形 3 パターン比較（三→×／三→←／＋→×）`,subtitle:`メニューやアコーディオンのボタン線自体が角度を変えて別の形に変身する 3 つの定番表現`,mechanismTag:`3本線の回転・中央線フェード比較`,xRayCaption:`それぞれ独立したSVG・CSS棒グラフ線の rotate() と opacity だけで別アイコンへ変身させています`,interactiveHint:`「再生」または各アイコンを押して 3 種類の変形を見比べられます`,defaultDuration:.3,durationRange:{min:.15,max:.9,step:.05},defaultEasing:`snappy`,hasEasingControl:!1,steps:[{title:`① 三 → ×：上下2本を 45度/-45度に交差、真ん中は消す`,detail:`全画面メニューやドロワーの「開く／閉じる」として一番直感的に伝わります。`,codeHint:`rotate(45deg) / opacity: 0 / rotate(-45deg)`},{title:`② 三 → ←：上下の線を短くして先端へ 35度 傾ける`,detail:`詳細画面から一覧へ「戻る」意図をシームレスに伝えるアプリ向け手法です。`,codeHint:`width: 9px; rotate(-35deg)`},{title:`③ ＋ → ×：十字をそのまま 45度 回すだけ`,detail:`FAQのアコーディオンや「新規追加キャンセル」に最小コードで使える便利な変形です。`,codeHint:`transform: rotate(45deg)`}],keywords:[`ハンバーガー`,`アイコン変形`,`モーフィング`,`バツ`,`矢印`,`メニューボタン`],buildPrompt:(e,t)=>k({name:`メニューボタンのモーフィング変形バリエーション`,goal:`ハンバーガーボタンやアコーディオンのアイコンが、開く・戻る・閉じる状態に応じて滑らかに別シンボルへ変形する表現を入れたいです。`,mechanism:`ボタン内の棒線要素に対し、is-open 状態で rotate / translate / scale を同時遷移させ、アイコン画像の差し替えなしに変形させます。`,requirements:[`aria-expanded 属性とラベル文字列を開閉状態に合わせて更新する`,`回転やモーフィング時にアイコン中心がブレないよう 36〜44px 四方のタップ領域を確保する`],params:e,targetNote:t}),buildCode:e=>`<button class="plus-btn" type="button" aria-expanded="false" aria-label="メニューを開く">
  <span class="bar h"></span><span class="bar v"></span>
</button>

<style>
.plus-btn { position: relative; width: 32px; height: 32px; transition: transform ${e.duration.toFixed(2)}s ${D[e.easing].css}; }
.plus-btn.is-open { transform: rotate(45deg); }
.bar { position: absolute; left: 8px; top: 15px; width: 16px; height: 2px; background: #18181b; }
.bar.v { transform: rotate(90deg); }
</style>

<script>
(() => {
  const btn = document.querySelector('.plus-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const open = btn.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
  });
})();
<\/script>`},{id:`nav-stagger-drawer`,category:`nav`,title:`ドロワー内のリンクが時間差でスッと並ぶ`,subtitle:`横からメニュー板が出たあと、中のリンク文字が少しだけ時間差で現れて洗練された手触りを作ります`,mechanismTag:`パネル本体 slide + 項目 transition-delay 階段`,xRayCaption:`メニュー外枠のスライドに 80ms + 項目番号×60ms の待ち時間を付けて順番に滑り込ませています`,interactiveHint:`「再生」または「メニューを開く」ボタンで開閉と順番登場を確認できます`,defaultDuration:.4,durationRange:{min:.2,max:1,step:.05},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① まず暗幕とドロワー本体をスライドインさせる`,detail:`容器が定位置へ収まる途中で項目も追いかけ始めると軽快に見えます。`,codeHint:`transform: translateX(-100% → 0)`},{title:`② 各メニューリンクへ 60ms 刻みの delay を振る`,detail:`閉じる時は delay を 0ms にして一瞬で消えるとストレスが残りません。`,codeHint:`transition-delay: calc(80ms + var(--i) * 60ms)`},{title:`③ 背景幕クリック＆Escキーで確実に閉じられるように`,detail:`どの操作でも迷わず画面へ戻れる逃げ道を用意します。`,codeHint:`backdrop.addEventListener("click", close)`}],keywords:[`ドロワー`,`スライドメニュー`,`時間差`,`ナビ`,`ハンバーガー中身`],buildPrompt:(e,t)=>k({name:`項目が順番に登場するサイドドロワー`,goal:`スマホや左側のドロワーメニューを開いたとき、中のリンクが時間差（スタガー）で順番に滑らかに現れるようにしたいです。`,mechanism:`パネルを translateX(0) へスライドすると同時に、各リンクに連番ベースの transition-delay（例: 80ms + idx*60ms）を設定します。`,requirements:[`メニューを閉じる瞬間は transition-delay を 0ms に戻し、閉鎖がもたつかないようにする`,`最後の項目まで待ち時間が出すぎないよう、1項目あたりの遅延は 35〜50ms 程度に抑える`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<nav class="drawer">
  <a style="--i:0" href="#a">ホーム</a>
  <a style="--i:1" href="#b">機能</a>
  <a style="--i:2" href="#c">料金</a>
</nav>

<style>
.drawer { transform: translateX(-100%); transition: transform ${e.duration.toFixed(2)}s ${t}; }
.drawer.is-open { transform: translateX(0); }
.drawer a { opacity: 0; transform: translateX(-12px); transition: opacity .25s, transform .25s; }
.drawer.is-open a { opacity: 1; transform: translateX(0); transition-delay: calc(80ms + var(--i) * 60ms); }
</style>`}},{id:`nav-app-tab-bar`,category:`nav`,title:`画面下部・アプリ風タブバー（親指操作のピル強調）`,subtitle:`スマホアプリの足元に固定し、選んだタブのアイコン周りに柔らかい丸カプセルが点灯する移動バー`,mechanismTag:`下部固定 4等分Grid + 選択タブカプセル強調`,xRayCaption:`アイコンの下に引いた横長カプセル背景と文字色の変化で現在ページを示しています`,interactiveHint:`「再生」または下の「ホーム・さがす・保存・設定」を押して切り替えできます`,defaultDuration:.25,durationRange:{min:.1,max:.8,step:.05},defaultEasing:`snappy`,hasEasingControl:!1,hasViewportToggle:!0,steps:[{title:`① タブ項目数は 3〜5 個に絞って均等グリッドに`,detail:`押し間違いを防ぐため、文字とアイコンをセットで縦並びに揃えます。`,codeHint:`grid-template-columns: repeat(4, 1fr)`},{title:`② 選択アイコン背後に淡い色カプセル（ピル）を表示`,detail:`アイコンだけ色を変えるより指で押した位置がはっきり目に入ります。`,codeHint:`background: #eff6ff; border-radius: 9999px`},{title:`③ iPhone等の下部バーと重ならない safe-area 配慮`,detail:`実運用時は padding-bottom に env(safe-area-inset-bottom) を足すと安全です。`,codeHint:`padding-bottom: env(safe-area-inset-bottom)`}],keywords:[`ボトムナビ`,`タブバー`,`スマホ`,`アプリ風`,`下部ナビ`,`フッターメニュー`],buildPrompt:(e,t)=>k({name:`アプリ風下部タブバー（カプセル点灯）`,goal:`スマホ向けのウェブアプリで、画面下端に 4 つの主要切り替えタブを配置し、選択中のアイコンにカプセル背景が点くようにしたいです。`,mechanism:`grid-template-columns: repeat(4, 1fr) のナビバー内にアイコン＋ラベルを配置し、aria-current="page" 項目のみ背景ピルと青文字へ切り替えます。`,requirements:[`env(safe-area-inset-bottom) を考慮して画面下端の操作領域と干渉しない余白を確保する`,`現在表示中のタブに aria-current="page" と明瞭な背景ピル／文字色の変化を付与する`],params:e,targetNote:t}),buildCode:e=>`<nav id="appTabBar" class="app-tab-bar" aria-label="主要タブ">
  <button type="button" class="tab-item is-active" aria-current="page">
    <span class="tab-pill">ホーム</span>
  </button>
  <button type="button" class="tab-item"><span class="tab-pill">さがす</span></button>
  <button type="button" class="tab-item"><span class="tab-pill">保存</span></button>
  <button type="button" class="tab-item"><span class="tab-pill">設定</span></button>
</nav>

<style>
.app-tab-bar { display: grid; grid-template-columns: repeat(4, 1fr); padding: 6px 6px calc(6px + env(safe-area-inset-bottom)); border-top: 1px solid #e4e4e7; background: rgba(255,255,255,.95); }
.tab-item { border: none; background: transparent; padding: 6px 2px; font-size: 11px; font-weight: 600; color: #71717a; cursor: pointer; }
.tab-pill { display: inline-block; padding: 5px 12px; border-radius: 9999px; transition: background-color ${e.duration.toFixed(2)}s ease, color ${e.duration.toFixed(2)}s ease; }
.tab-item.is-active .tab-pill { background: #eff6ff; color: #1d4ed8; font-weight: 700; }
</style>

<script>
(() => {
  const bar = document.getElementById('appTabBar');
  if (!bar) return;
  const items = bar.querySelectorAll('.tab-item');
  items.forEach((btn) => btn.addEventListener('click', () => {
    items.forEach((b) => { b.classList.remove('is-active'); b.removeAttribute('aria-current'); });
    btn.classList.add('is-active');
    btn.setAttribute('aria-current', 'page');
  }));
})();
<\/script>`},{id:`tabs-filter-chips`,category:`tabs`,title:`横並び絞り込みチップ（押すと一覧が即フィルタされる）`,subtitle:`丸いタグボタンを横に並べて、選んだカテゴリに合うカードだけをその場で絞り込んで見せるUI`,mechanismTag:`横スクロール許可チップ列 + 即時配列フィルタ`,xRayCaption:`画面幅が狭くても折り返さず横へ流せるよう overflow-x: auto を使っています`,interactiveHint:`「再生」または上のチップ（「文字」「ナビ」など）をクリックして絞込できます`,defaultDuration:.25,durationRange:{min:.1,max:.8,step:.05},defaultEasing:`snappy`,hasEasingControl:!1,steps:[{title:`① チップには shrink-0（縮まない）を指定`,detail:`横一列で並べる際、文字が縦に折れて崩れないよう flex-shrink: 0 にします。`,codeHint:`flex-shrink: 0; white-space: nowrap`},{title:`② 選択チップは反転カラー（黒背景・白文字）で明確に`,detail:`一覧の見出しより主張しすぎず、何で絞り込み中かひと目で分かります。`,codeHint:`aria-pressed="true"`},{title:`③ 「すべて」を先頭に置いて解除を1クリックに`,detail:`どの絞り込みからでもすぐ全件表示に戻れる安心設計にします。`,codeHint:`filter(item => cat === "all" || item.cat === cat)`}],keywords:[`絞り込み`,`チップ`,`フィルター`,`タグ`,`タブ`,`一覧`],buildPrompt:(e,t)=>k({name:`即時絞り込みフィルターチップ列`,goal:`「すべて／カテゴリ別」のピルボタンを横並びで置き、押した瞬間に下の一覧カードを絞り込めるようにしたいです。`,mechanism:`overflow-x: auto のチップ行で選択状態を state 管理し、aria-pressed の切り替えと表示配列の filter を連動させます。`,requirements:[`狭幅スマホでも横スクロールできるようにし、折り返しで縦幅を圧迫しない`,`選択中のチップには aria-pressed="true" を連動させ、色の差に加えてフォントウェイトでも識別させる`],params:e,targetNote:t}),buildCode:e=>`<div class="chip-filter-wrap">
  <div id="chipRow" class="chip-row" role="group" aria-label="絞り込み">
    <button type="button" class="chip is-active" data-cat="all" aria-pressed="true">すべて</button>
    <button type="button" class="chip" data-cat="text" aria-pressed="false">文字</button>
    <button type="button" class="chip" data-cat="nav" aria-pressed="false">ナビ</button>
  </div>
  <ul id="chipItems" class="chip-items">
    <li data-cat="text">テキスト・リビール表現</li>
    <li data-cat="nav">スライディング・メニュー</li>
    <li data-cat="text">タイプライター見出し</li>
  </ul>
</div>

<style>
.chip-row { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px; }
.chip { flex-shrink: 0; padding: 6px 14px; border-radius: 9999px; border: 1px solid #e4e4e7; background: #fff; font-size: 12px; cursor: pointer; transition: background-color ${e.duration.toFixed(2)}s ease, color ${e.duration.toFixed(2)}s ease, border-color ${e.duration.toFixed(2)}s ease; }
.chip.is-active { background: #18181b; color: #fff; border-color: #18181b; font-weight: 700; }
.chip-items { margin: 8px 0 0; padding: 0; list-style: none; display: grid; gap: 6px; font-size: 12px; }
.chip-items li { padding: 8px 12px; border: 1px solid #e4e4e7; border-radius: 8px; }
</style>

<script>
(() => {
  const row = document.getElementById('chipRow');
  const items = document.querySelectorAll('#chipItems li');
  if (!row) return;
  row.querySelectorAll('.chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-cat') || 'all';
      row.querySelectorAll('.chip').forEach((c) => {
        const on = c === btn;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', String(on));
      });
      items.forEach((li) => {
        li.hidden = cat !== 'all' && li.getAttribute('data-cat') !== cat;
      });
    });
  });
})();
<\/script>`},{id:`tabs-vertical-settings`,category:`tabs`,title:`設定画面向け・縦並びサイドタブ（スマホ時は横タブへ自動変化）`,subtitle:`左に項目リスト・右に詳細内容を並べる管理画面の定番を、スマホ幅では上の横タブへ切り替えます`,mechanismTag:`PC 2列縦タブ ↔ モバイル上段横タブ切り替え`,xRayCaption:`画面幅に応じて左の青バー付き縦リストと上部タブを切り替えて表示破綻を防いでいます`,interactiveHint:`右上の「PC / スマホ」でレイアウト変化を、「アカウント・通知設定」で中身を確認できます`,hasViewportToggle:!0,defaultDuration:.25,durationRange:{min:.1,max:.8,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 選択肢の文章が長い時は「横」ではなく「縦」にする`,detail:`「アカウント設定」「通知スケジュール」などは縦積みにした方が文字が切れず読めます。`,codeHint:`grid-template-columns: 160px 1fr`},{title:`② 左端の青い縦バーで現在位置をガイド`,detail:`背景色変化に加えて左に 4px の色棒を置くと選択中の視認性が跳ね上がります。`,codeHint:`border-left: 3px solid #2563eb`},{title:`③ スマホ幅では 1 列（上タブ・下本文）に組み替える`,detail:`横幅が足りない環境では横に2分割せず上下分割に落とします。`,codeHint:`flex-direction: column (mobile)`}],keywords:[`縦タブ`,`設定画面`,`サイドタブ`,`レスポンシブ`,`マイページ`],buildPrompt:(e,t)=>k({name:`レスポンシブ縦並び設定タブ`,goal:`設定画面の左側に縦並びメニュー、右側に詳細パネルを置き、スマホ画面では上部横タブに自動変化させたいです。`,mechanism:`CSS Grid でデスクトップは 2 カラム（左メニュー＋右パネル）、モバイル幅では 1 カラムのフレックスタブ配列へ切り替えます。`,requirements:[`role="tablist" / role="tab" / role="tabpanel" と aria-selected でキーボード操作にも対応させる`,`狭幅画面（768px 未満）では上部横スクロールタブへ切り替え、本文領域が圧迫されないようにする`],params:e,targetNote:t}),buildCode:e=>`<div id="settingsTabs" class="settings-box">
  <div class="settings-nav" role="tablist" aria-label="設定メニュー">
    <button type="button" class="stab is-active" role="tab" aria-selected="true" data-panel="0">アカウント</button>
    <button type="button" class="stab" role="tab" aria-selected="false" data-panel="1">通知設定</button>
    <button type="button" class="stab" role="tab" aria-selected="false" data-panel="2">外観</button>
  </div>
  <div class="settings-panel" role="tabpanel" id="settingsPanel">表示名やログイン情報を管理できます。</div>
</div>

<style>
.settings-box { display: grid; grid-template-columns: 1fr; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; background: #fff; }
.settings-nav { display: flex; overflow-x: auto; border-bottom: 1px solid #e4e4e7; background: #fafafa; }
.stab { flex-shrink: 0; padding: 10px 14px; border: none; border-bottom: 2px solid transparent; background: transparent; text-align: left; font-size: 12px; color: #52525b; cursor: pointer; transition: background-color ${e.duration.toFixed(2)}s ease, color ${e.duration.toFixed(2)}s ease, border-color ${e.duration.toFixed(2)}s ease; }
.stab.is-active { background: #eff6ff; color: #1d4ed8; font-weight: 700; border-bottom-color: #2563eb; }
.settings-panel { padding: 16px; font-size: 13px; color: #27272a; }
@media (min-width: 768px) {
  .settings-box { grid-template-columns: 160px 1fr; }
  .settings-nav { flex-direction: column; border-bottom: none; border-right: 1px solid #e4e4e7; }
  .stab { border-bottom: none; border-left: 3px solid transparent; }
  .stab.is-active { border-left-color: #2563eb; }
}
</style>

<script>
(() => {
  const texts = [
    '表示名やログイン情報を管理できます。',
    '新着アップデートと通知頻度を設定します。',
    'ライト表示・アニメーション抑制を選びます。'
  ];
  const root = document.getElementById('settingsTabs');
  const panel = document.getElementById('settingsPanel');
  if (!root || !panel) return;
  const tabs = root.querySelectorAll('[role="tab"]');
  tabs.forEach((btn) => btn.addEventListener('click', () => {
    const idx = Number(btn.getAttribute('data-panel')) || 0;
    tabs.forEach((t) => {
      const on = t === btn;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    panel.textContent = texts[idx] || '';
  }));
})();
<\/script>`},{id:`search-autocomplete`,category:`search`,title:`入力すると候補がすぐ下に並ぶ予測変換リスト`,subtitle:`1文字打つたびに一致候補を安全にサニタイズして絞り込み、上下キーやタップで選べる検索補助UI`,mechanismTag:`サニタイズ入力 + 予測ドロップダウン + キーボード選択`,xRayCaption:`入力文字の制御記号を取り除いてから通し番号と日本語両方で候補配列を検索しています`,interactiveHint:`「再生」または入力欄に「#01」「スイッチ」等を打ち、↓↑キーや候補タップを試せます`,defaultDuration:.25,durationRange:{min:.1,max:.8,step:.05},defaultEasing:`snappy`,hasEasingControl:!1,steps:[{title:`① 入力値はすぐ検索ロジックへ渡す前にサニタイズ`,detail:`制御文字や過長入力をカットし、描画も安全なテキストノードだけで行います。`,codeHint:`sanitizePlainText(input, 40)`},{title:`② 通し番号（#014）でもキーワードでもヒットさせる`,detail:`ユーザーが番号を覚えていても言葉で探しても同じリストに導けます。`,codeHint:`serial.includes(q) || label.includes(q)`},{title:`③ ↑↓キーと Enter でマウスなしでも選べる`,detail:`activeIndex を管理しておくとPC作業者の検索体験が劇的に向上します。`,codeHint:`ArrowDown / ArrowUp / Enter`}],keywords:[`検索`,`オートコンプリート`,`予測候補`,`サジェスト`,`キーボード`,`ドロップダウン`],buildPrompt:(e,t)=>k({name:`安全フィルタ付き予測候補オートコンプリート`,goal:`検索ボックスへの入力に合わせて直下に候補リストを表示し、通し番号・キーワードどちらでも絞り込んで ↑↓ キーで選択できるようにしたいです。`,mechanism:`入力値を制御文字除去・文字数上限で正規化した上で候補リストと部分一致比較し、React の安全なテキスト描画のみでリストを描画します。`,requirements:[`候補は innerHTML 等を使わず安全な要素生成（createElement + textContent / JSX）で描画する`,`候補リストの展開状態を role="listbox" と aria-expanded 等で明示し、上下キー・Escape でも閉じられるようにする`],params:e,targetNote:t}),buildCode:e=>`<div class="ac-wrap">
  <input id="acInput" class="ac-input" type="search" placeholder="キーワードや #番号..." autocomplete="off" />
  <ul id="acList" class="ac-list" role="listbox"></ul>
</div>

<style>
.ac-wrap { position: relative; max-width: 300px; }
.ac-input { width: 100%; padding: 8px 12px; border: 1px solid #d4d4d8; border-radius: 10px; font-size: 13px; outline: none; transition: border-color ${e.duration.toFixed(2)}s ease, box-shadow ${e.duration.toFixed(2)}s ease; }
.ac-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.15); }
.ac-list { margin: 6px 0 0; padding: 4px; list-style: none; border: 1px solid #e4e4e7; border-radius: 10px; background: #fff; box-shadow: 0 8px 20px rgba(0,0,0,.06); }
.ac-list:empty { display: none; }
.ac-list li button { width: 100%; padding: 7px 10px; border: none; border-radius: 6px; background: transparent; text-align: left; font-size: 12px; cursor: pointer; transition: background-color ${e.duration.toFixed(2)}s ease, color ${e.duration.toFixed(2)}s ease; }
.ac-list li button:hover { background: #eff6ff; color: #1d4ed8; }
</style>

<script>
(() => {
  const input = document.getElementById('acInput');
  const list = document.getElementById('acList');
  if (!input || !list) return;
  const items = ['#014 検索スポットライト', '#038 トグルスイッチ', '#084 長押し確定'];
  const render = () => {
    const q = input.value.replace(/[\\u0000-\\u001F\\u007F]/g, '').slice(0, 40).trim();
    list.replaceChildren();
    items.filter((t) => !q || t.toLowerCase().includes(q.toLowerCase())).forEach((text) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = text;
      btn.addEventListener('click', () => { input.value = text; render(); });
      li.appendChild(btn);
      list.appendChild(li);
    });
  };
  input.addEventListener('input', render);
  render();
})();
<\/script>`},{id:`search-popular-chips`,category:`search`,title:`よく検索されるタグボタン付き検索窓（迷わせない導線）`,subtitle:`何を入力すればよいか迷う人に向けて、検索窓のすぐ下に「よく探される例」を押しやすく並べます`,mechanismTag:`入力欄 + 1タップ注入サジェストタグ列`,xRayCaption:`タグを押した瞬間にその文字列をサニタイズした上で検索欄の state へ直接流し込んでいます`,interactiveHint:`「再生」または下の「#001 下から出現」などのタグを押すと入力欄へ即反映されます`,defaultDuration:.25,durationRange:{min:.1,max:.8,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 空の検索欄だけではユーザーは手が止まりやすい`,detail:`よく探される番号や単語を 3〜4 個チップで並べて「1タップ検索」を提供します。`,codeHint:`<button onClick={() => setQuery(tag)}>...`},{title:`② 入力後は「クリア」ボタンで一発で空に戻す`,detail:`別の語句を試し直しやすいよう、文字がある時だけ右端にクリアを出します。`,codeHint:`{query && <button>クリア</button>}`},{title:`③ チップ色を押下状態に合わせて強調`,detail:`今どのタグで検索中かもひと目で分かる状態にしておきます。`,codeHint:`aria-pressed={query === tag}`}],keywords:[`検索タグ`,`おすすめ検索`,`人気キーワード`,`入力補助`,`検索欄`],buildPrompt:(e,t)=>k({name:`おすすめ検索チップ付き検索ボックス`,goal:`ユーザーが入力に迷わないよう、検索欄の直下に 1 クリックで検索欄へ流し込める「よく検索されるタグ」を並べたいです。`,mechanism:`検索語句の状態（query）を共有し、チップのクリックで対象キーワードを直接入力 state へセットして検索を実行します。`,requirements:[`1クリックで入力リセットできるクリアボタンを値あり時のみ表示する`,`各人気キーワードチップに aria-pressed を連動させ、ボタン選択状態が入力欄と常に一致するようにする`],params:e,targetNote:t}),buildCode:e=>`<div class="search-box">
  <div class="search-field">
    <input id="tagSearchInput" type="text" placeholder="探したい語句を入力" />
    <button type="button" id="tagClearBtn" hidden>クリア</button>
  </div>
  <div class="tag-row">
    <button type="button" class="tag-chip" data-tag="#001 下から出現" aria-pressed="false">#001 下から出現</button>
    <button type="button" class="tag-chip" data-tag="hover" aria-pressed="false">hover</button>
    <button type="button" class="tag-chip" data-tag="料金" aria-pressed="false">料金</button>
  </div>
</div>

<style>
.search-box { max-width: 320px; display: grid; gap: 8px; }
.search-field { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid #d4d4d8; border-radius: 10px; background: #fff; }
.search-field input { flex: 1; border: none; outline: none; font-size: 13px; }
#tagClearBtn { border: none; background: #f4f4f5; border-radius: 6px; padding: 2px 8px; font-size: 11px; cursor: pointer; }
.tag-row { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-chip { padding: 4px 10px; border: 1px solid #e4e4e7; border-radius: 9999px; background: #fff; font-size: 11px; cursor: pointer; transition: background-color ${e.duration.toFixed(2)}s ease, border-color ${e.duration.toFixed(2)}s ease, color ${e.duration.toFixed(2)}s ease; }
.tag-chip[aria-pressed="true"] { border-color: #2563eb; background: #eff6ff; color: #1d4ed8; font-weight: 700; }
</style>

<script>
(() => {
  const input = document.getElementById('tagSearchInput');
  const clearBtn = document.getElementById('tagClearBtn');
  if (!input || !clearBtn) return;
  const sync = () => {
    clearBtn.hidden = input.value.length === 0;
    document.querySelectorAll('.tag-chip').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(input.value === btn.getAttribute('data-tag')));
    });
  };
  document.querySelectorAll('.tag-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      input.value = btn.getAttribute('data-tag') || '';
      sync();
    });
  });
  clearBtn.addEventListener('click', () => { input.value = ''; sync(); });
  input.addEventListener('input', sync);
})();
<\/script>`},{id:`micro-button-3d`,category:`micro`,title:`下に厚みがある立体プッシュボタン（沈み込む手応え）`,subtitle:`ボタンの底に濃い影の厚みを付け、押した瞬間だけ下に 4px 沈ませて物理スイッチのような快感を出します`,mechanismTag:`box-shadow 厚み + :active translateY 圧縮`,xRayCaption:`下方向の box-shadow(0 5px 0) を押下時に 1px へ縮め、同時に本体を 4px 下へ沈めています`,interactiveHint:`「再生」またはボタンをカチッとクリックして沈み込みを試せます`,defaultDuration:.15,durationRange:{min:.08,max:.4,step:.02},defaultEasing:`snappy`,hasEasingControl:!1,steps:[{title:`① ぼかしのない「濃い影」を真下へ 5px 置く`,detail:`blur を 0 にして濃い同系色を置くことで、プラスチックの厚みのように見えます。`,codeHint:`box-shadow: 0 5px 0 #1e3a8a`},{title:`② :active（押した瞬間）だけ影を減らして本体を下げる`,detail:`下に 4px 動かしたぶんだけ影を 4px 減らすと、底面の高さが動かず完璧な沈みになります。`,codeHint:`transform: translateY(4px); box-shadow: 0 1px 0 #1e3a8a`},{title:`③ 反応速度は 75ms 以下の超高速に`,detail:`押し心地は遅延があると鈍く感じるため、一番短いトランジションを当てます。`,codeHint:`transition: transform 75ms, box-shadow 75ms`}],keywords:[`立体ボタン`,`3Dボタン`,`プッシュ`,`押す`,`クリック感`,`影`],buildPrompt:(e,t)=>k({name:`物理スイッチ風の立体プッシュボタン`,goal:`下に厚みのある立体ボタンを作り、押した瞬間だけ影が薄くなって本体が下に沈み込む気持ちいい手応えを実装したいです。`,mechanism:`ぼかし 0px の濃い下影（0 5px 0 色）を付け、:active 時に translateY(4px) と box-shadow: 0 1px 0 を同時に適用します。`,requirements:[`沈んだ分だけ影も同ピクセル削ることで、ボタン下の文章位置がガタつかないようにする`,`キーボードフォーカス（focus-visible）やタッチ操作でも十分なコントラストと沈み反応を確認できるようにする`],params:e,targetNote:t}),buildCode:e=>`<button type="button" class="btn-3d">押してみる</button>

<style>
.btn-3d {
  background: #2563eb; color: #fff; font-weight: 700;
  padding: 12px 24px; border-radius: 12px; border: none;
  box-shadow: 0 5px 0 #1e3a8a;
  transition: transform ${Math.round(e.duration*1e3)}ms ease, box-shadow ${Math.round(e.duration*1e3)}ms ease;
}
.btn-3d:active {
  transform: translateY(4px);
  box-shadow: 0 1px 0 #1e3a8a;
}
</style>`},{id:`micro-button-shimmer`,category:`micro`,title:`表面を斜めの光の帯がサッと走るシマーCTAボタン`,subtitle:`「無料で始める」などの一番押してほしい主役ボタンに斜めのハイライト光を走らせて上品に目立たせます`,mechanismTag:`overflow: hidden + skewX 斜め光の横断`,xRayCaption:`ボタン枠内で斜め -12度に傾けた白い透明グラデーション帯を左端から右端へ横断させています`,interactiveHint:`「再生」またはボタンをクリックすると白い光の筋が表面を走ります`,defaultDuration:.65,durationRange:{min:.3,max:1.5,step:.05},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① ボタンに overflow: hidden と relative を設定`,detail:`光がボタンの外へはみ出さないように必ず切り抜き枠を作ります。`,codeHint:`position: relative; overflow: hidden`},{title:`② 白の透明グラデーション帯を skewX(-12deg) で傾ける`,detail:`縦長ではなく少し斜めにするだけで金属やガラスの反射光のように見えます。`,codeHint:`linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent)`},{title:`③ 文字レイヤーより奥／手前のバランスを保つ`,detail:`pointer-events: none を光要素に付けてクリック判定を邪魔しないようにします。`,codeHint:`pointer-events: none`}],keywords:[`キラッと光る`,`シマー`,`CTA`,`主役ボタン`,`光沢`,`目立つ`],buildPrompt:(e,t)=>k({name:`表面を光が走るシマーCTAボタン`,goal:`メインの行動喚起ボタンの表面を斜めの光の帯がスッと駆け抜ける、上品で目を引くCTAを作りたいです。`,mechanism:`overflow: hidden なボタン内に傾けた白い透明グラデーション要素を置き、ホバー時や注目時に translateX で左外から右外へ通過させます。`,requirements:[`過度な連続点滅は避け、ホバー時や1度きりの注目演出に留める`,`光沢帯のレイヤーには pointer-events: none と aria-hidden="true" を付けてクリック判定を妨げない`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<button type="button" class="btn-shimmer">
  <span>今すぐ始める</span>
  <span class="shine" aria-hidden="true"></span>
</button>

<style>
.btn-shimmer { position: relative; overflow: hidden; background: #18181b; color: #fff; padding: 12px 24px; border-radius: 12px; }
.shine {
  position: absolute; inset: 0; width: 50%; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent);
  transform: translateX(-140%) skewX(-12deg);
  transition: transform ${e.duration.toFixed(2)}s ${t};
}
.btn-shimmer:hover .shine { transform: translateX(300%) skewX(-12deg); }
</style>`}},{id:`micro-button-arrow`,category:`micro`,title:`ホバーで矢印だけが右へスッと伸びる誘導ボタン`,subtitle:`「次へ進む」「詳しく見る」のボタンで矢印アイコンだけ少し先へ動かすことで、押した先の移動を示唆します`,mechanismTag:`ボタン本体固定 + 矢印のみ translateX(+6px)`,xRayCaption:`ボタン文字と外枠サイズは一切変えず、矢印SVGだけに小さな前進移動をかけています`,interactiveHint:`「再生」またはボタンにカーソルを乗せると矢印だけが右へ進みます`,defaultDuration:.25,durationRange:{min:.1,max:.8,step:.05},defaultEasing:`snappy`,hasEasingControl:!0,steps:[{title:`① ボタン外枠の幅が変わらないよう margin は使わない`,detail:`gap や padding を増やすとボタン幅が膨らんで隣がズレます。必ず transform にします。`,codeHint:`.btn:hover .arrow { transform: translateX(6px) }`},{title:`② 移動距離は +4〜6px のわずかな幅にする`,detail:`小さく前に進む動きだけで「次へ進む」先読みイメージが十分伝わります。`,codeHint:`translate3d(6px, 0, 0)`},{title:`③ 白背景⇔黒塗り反転を合わせるとさらに明快`,detail:`色の反転とアイコンの前進が重なることでクリック確信度が高まります。`,codeHint:`transition: transform 0.25s, background-color 0.2s`}],keywords:[`矢印`,`ボタン`,`詳細を見る`,`ホバー`,`誘導`,`アイコン移動`],buildPrompt:(e,t)=>k({name:`矢印アイコンだけ前進するリンクボタン`,goal:`「詳しく見る →」のボタンにホバーしたとき、テキスト位置は動かさずに矢印アイコンだけが右へ数ピクセル進み出る反応にしたいです。`,mechanism:`親ボタンの :hover をきっかけに子アイコンへ transform: translate3d(6px, 0, 0) のトランジションを適用します。`,requirements:[`ボタン自体の横幅が広がらないよう right padding にも十分な余裕を持たせる`,`矢印の移動は transform: translateX のみで行い、文字位置のブレや改行を防ぐ`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<a href="#detail" class="arrow-btn">
  詳細を見る <span class="arr" aria-hidden="true">→</span>
</a>

<style>
.arrow-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border: 1px solid #18181b; border-radius: 9999px; }
.arr { display: inline-block; transition: transform ${e.duration.toFixed(2)}s ${t}; }
.arrow-btn:hover .arr { transform: translateX(6px); }
</style>`}},{id:`micro-button-copy`,category:`micro`,title:`コピーボタンの一瞬チェック変化（完了後に元へ戻る）`,subtitle:`URLやコードをコピーする瞬間、アイコンが「✓ コピー完了！」へ緑色に変わり 1.6秒後に戻る親切設計`,mechanismTag:`状態反転UI + タイマー自動リセット`,xRayCaption:`クリックで copied=true にしてチェック図形へ替え、setTimeout で自動リセット（アンマウント時破棄）しています`,interactiveHint:`「再生」または「コードをコピー」ボタンを押すと完了表示への切り替えが見られます`,defaultDuration:.25,durationRange:{min:.1,max:.8,step:.05},defaultEasing:`snappy`,hasEasingControl:!1,steps:[{title:`① アラート窓（alert）を出さずボタン自身で答える`,detail:`コピーするたびにポップアップを閉じる手間を省き、押した場所そのもので成功を伝えます。`,codeHint:`copied ? "コピー完了！" : "コピーする"`},{title:`② 緑色（チェック）に変えて 1.5〜2 秒見せる`,detail:`すぐに元に戻すと見落とすため、しっかり視認できる約1.6秒間だけ保持します。`,codeHint:`setTimeout(() => setCopied(false), 1600)`},{title:`③ 連続クリック時は古いタイマーを必ず解除`,detail:`clearTimeout(timerRef) を先に行うことで、2回目だけ一瞬で消えるバグを防ぎます。`,codeHint:`clearTimeout(prevTimer)`}],keywords:[`コピー`,`クリップボード`,`チェック`,`完了フィードバック`,`ボタン`],buildPrompt:(e,t)=>k({name:`自己完結型コピー完了フィードバックボタン`,goal:`コピーボタンを押したとき別画面やアラートを出さず、ボタン自身が「✓ コピー完了！」に変わって約1.6秒後に元へ戻るようにしたいです。`,mechanism:`クリックで copied 状態を true にし色・ラベルを切り替え、保持している setTimeout をリセット付きで 1.6 秒後に false へ戻します。`,requirements:[`連続クリック時や画面離脱時にタイマーが重ならないよう clearTimeout を徹底する`,`Clipboard API が非SSLや権限拒否で失敗した場合でも例外を出さず安全にフォールバックする`],params:e,targetNote:t}),buildCode:e=>`<button type="button" id="copySampleBtn" class="copy-btn">コードをコピー</button>

<style>
.copy-btn { padding: 8px 14px; border: 1px solid #d4d4d8; border-radius: 8px; background: #fff; color: #18181b; font-size: 12px; font-weight: 600; cursor: pointer; transition: all ${e.duration.toFixed(2)}s ease; }
.copy-btn.is-copied { border-color: #16a34a; background: #f0fdf4; color: #15803d; }
</style>

<script>
(() => {
  const btn = document.getElementById('copySampleBtn');
  if (!btn) return;
  let timerId = 0;
  btn.addEventListener('click', () => {
    clearTimeout(timerId);
    btn.classList.add('is-copied');
    btn.textContent = '✓ コピー完了！';
    timerId = setTimeout(() => {
      btn.classList.remove('is-copied');
      btn.textContent = 'コードをコピー';
    }, 1600);
  });
})();
<\/script>`},{id:`micro-button-hold`,category:`micro`,title:`誤爆を防ぐ「長押しで確定」プログレスボタン`,subtitle:`削除や決済など取り消せない操作で、押し続けている間だけ背景ゲージが溜まり 100% で実行する安全装置`,mechanismTag:`onPointerDown + requestAnimationFrame ゲージ充填`,xRayCaption:`押している最中だけ毎フレーム進行 % を増やし、途中で指を離すと安全のため 0% へキャンセルしています`,interactiveHint:`「再生」またはボタンを長押し（途中で離すと0%へ戻る確認も可能）してください`,defaultDuration:.9,durationRange:{min:.4,max:2,step:.1},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① クリック（一瞬のタップ）では発動させない`,detail:`誤タップでデータを消す事故を UI の仕組みレベルでゼロにできます。`,codeHint:`onPointerDown -> requestAnimationFrame`},{title:`② 指を離した（onPointerUp / Leave）ら即 0% リセット`,detail:`「あ、間違えた」と思ったら離すだけでキャンセル完了になる安心感があります。`,codeHint:`cancelAnimationFrame(rafId); setPct(0)`},{title:`③ 確定時だけ安全色や完了ラベルへ固定`,detail:`100% に到達した瞬間に「完了！」へ切り替わる明快な達成感を返します。`,codeHint:`if (pct >= 100) confirmAction()`}],keywords:[`長押し`,`ホールド`,`誤操作防止`,`削除`,`安全`,`プログレスボタン`],buildPrompt:(e,t)=>k({name:`誤操作防止の長押し確定ボタン`,goal:`危険な削除や確定アクションにおいて、単発クリックではなく約 0.9 秒の長押しでゲージが満タンになった時だけ実行されるボタンを作りたいです。`,mechanism:`pointerdown で requestAnimationFrame ループを開始して進捗ゲージの幅を伸ばし、pointerup/pointerleave で中断リセット、100%到達時に確定処理を呼びます。`,requirements:[`スマホでの長押しテキスト選択メニューが出ないよう user-select: none を設定する`,`キーボード利用者向けにも長押し相当や確認UIの代替操作を提供し、操作不能を防ぐ`],params:e,targetNote:t}),buildCode:e=>`<button type="button" id="holdBtn" class="hold-btn">
  <span class="hold-fill" id="holdFill"></span>
  <span class="hold-label" id="holdLabel">長押しで実行</span>
</button>

<style>
.hold-btn { position: relative; overflow: hidden; padding: 10px 20px; border: 1px solid #fda4af; border-radius: 10px; user-select: none; }
.hold-fill { position: absolute; inset: 0; width: 0%; background: #ffe4e6; }
.hold-label { position: relative; z-index: 1; color: #be123c; font-weight: 700; }
</style>

<script>
(() => {
  const btn = document.getElementById('holdBtn');
  const fill = document.getElementById('holdFill');
  const label = document.getElementById('holdLabel');
  if (!btn || !fill || !label) return;
  let raf = 0;
  const reset = () => { cancelAnimationFrame(raf); fill.style.width = '0%'; };
  btn.addEventListener('pointerdown', () => {
    const start = performance.now();
    const ms = ${Math.round(e.duration*1e3)};
    const step = (now) => {
      const p = Math.min(100, ((now - start) / ms) * 100);
      fill.style.width = p + '%';
      if (p < 100) raf = requestAnimationFrame(step);
      else label.textContent = '✓ 実行確定';
    };
    raf = requestAnimationFrame(step);
  });
  btn.addEventListener('pointerup', reset);
  btn.addEventListener('pointerleave', reset);
})();
<\/script>`},{id:`micro-heart-pop`,category:`micro`,title:`いいね／お気に入りアイコンの「ぽん！」と弾む反応`,subtitle:`ハートや星を押した瞬間に 1.36倍 まで一気に膨らんで 0.92倍 に戻り定着する心地よい手応え表現`,mechanismTag:`@keyframes 多段階バウンド (1 → 1.36 → 0.92 → 1)`,xRayCaption:`単調な scale 1→1.2 ではなく一瞬大きく弾ませて少しだけ戻す 4 点キーフレームを使っています`,interactiveHint:`「再生」またはハートアイコンをクリックしてオン／オフの弾みを確認できます`,defaultDuration:.36,durationRange:{min:.2,max:.9,step:.04},defaultEasing:`spring`,hasEasingControl:!0,steps:[{title:`① ON にする瞬間だけ keyframes で大→小→元の弾みを作る`,detail:`1.0 → 1.36 → 0.92 → 1.0 と 1 回揺り戻しを入れると生き物のような手触りになります。`,codeHint:`0%: 1 / 35%: 1.36 / 65%: 0.92 / 100%: 1`},{title:`② 解除（OFF）時は弾ませず静かに灰色へ戻す`,detail:`取り消すときは大げさに弾ませずスッと引くのが自然です。`,codeHint:`style={isLiked ? popAnim : undefined}`},{title:`③ 再び押した時に毎回動くようキーを更新する`,detail:`React や DOM ではキー切り替えまたはクラス付け直しで毎回確実に再生させます。`,codeHint:`<Heart key={animCount} />`}],keywords:[`ハート`,`お気に入り`,`いいね`,`お気に入りボタン`,`バウンド`,`弾む`],buildPrompt:(e,t)=>k({name:`ぽんと弾むいいね／お気に入りアイコン`,goal:`ハートやお気に入り星アイコンを ON にしたとき、ただ色が変わるだけでなく一度大きく膨らんで元の大きさへ心地よく収まるようにしたいです。`,mechanism:`@keyframes で 0%(scale 1) → 35%(scale 1.36) → 65%(scale 0.92) → 100%(scale 1) の 4 点スケール変化を短時間で再生します。`,requirements:[`お気に入り解除時はアニメーションさせず静かに通常色へ戻す`,`button の aria-pressed 状態をアイコン色と一致させ、スクリーンリーダーにも現在状態を伝える`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<button type="button" class="heart-btn" aria-pressed="false">♥</button>

<style>
.heart-btn { font-size: 24px; color: #a1a1aa; border: none; background: transparent; cursor: pointer; }
.heart-btn.is-liked { color: #f43f5e; animation: heartPop ${e.duration.toFixed(2)}s ${t}; }
@keyframes heartPop {
  0% { transform: scale(1); }
  35% { transform: scale(1.36); }
  65% { transform: scale(0.92); }
  100% { transform: scale(1); }
}
</style>`}}],R=[{id:`price-matrix-table`,category:`pricing`,title:`機能比較マトリクス表（おすすめ列に薄色背景・モバイル切替）`,subtitle:`プランごとの機能差を表形式でひと目で比べられるようにしつつ、狭いスマホ幅ではプラン切替タブへ自動変化させます`,mechanismTag:`おすすめ列色分け表 ↔ モバイルプラン単列タブ`,xRayCaption:`PC時は中央「スタンダード」列を淡青背景で強調し、スマホ時は横スクロール崩壊を防ぐタブ型に自動切替します`,interactiveHint:`右上の「PC / スマホ」で表形式とスマホ向け切替の見え方を比較できます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.3,durationRange:{min:.15,max:.8,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① おすすめプランの「縦列まるごと」に薄い色を敷く`,detail:`ヘッダーだけでなく下までの列全体に淡い青背景を引くと、視線が迷わず強みを比べられます。`,codeHint:`td.is-featured { background: rgba(239, 246, 255, 0.5); }`},{title:`② スマホで4列の表をそのまま縮小しない`,detail:`無理に並べると文字が潰れるため、モバイル時はプラン選択タブ＋1列表示に切り替えます。`,codeHint:`mobile: segmented tabs + single column`},{title:`③ 対応していない項目は「✕」より「―」で落ち着かせる`,detail:`薄い横棒にすると否定的になりすぎず、対応欄（あり・無制限）が自然に際立ちます。`,codeHint:`<td class="muted">―</td>`}],keywords:[`料金表`,`比較表`,`マトリクス`,`プラン比較`,`レスポンシブ`,`テーブル`],buildPrompt:(e,t)=>k({name:`レスポンシブ料金機能比較マトリクス`,goal:`3つのプランの機能差を整理した比較表を作り、おすすめプランの列全体に薄いハイライト背景を付け、スマホ時はプラン切替タブ型で読みやすく表示したいです。`,mechanism:`デスクトップ幅では <table> でおすすめ列の th/td へ同一のハイライト背景色を適用し、狭い幅ではタブで選んだ 1 プランだけをカード表示します。`,isStatic:!0,requirements:[`table には th[scope="col"] を使い支援技術でも行・列対応が読めるようにする`,`スマホ幅（640px 未満）では横スクロールによる見切れを避け、プラン別タブ切り替え UI へフォールバックする`],params:e,targetNote:t}),buildCode:()=>`<div class="matrix-shell">
  <!-- PC：機能比較表 -->
  <div class="matrix-desktop">
    <table class="matrix-table">
      <thead>
        <tr>
          <th scope="col">機能項目</th>
          <th scope="col">ライト<br /><small>¥0</small></th>
          <th scope="col" class="featured">スタンダード<br /><small>¥980</small></th>
          <th scope="col">プロ<br /><small>¥2,480</small></th>
        </tr>
      </thead>
      <tbody>
        <tr><td>保存件数</td><td>3件</td><td class="featured">無制限</td><td>無制限</td></tr>
        <tr><td>チーム共有</td><td class="muted">―</td><td class="featured">対応</td><td>対応</td></tr>
        <tr><td>専任サポート</td><td class="muted">―</td><td class="featured muted">―</td><td>あり</td></tr>
      </tbody>
    </table>
  </div>

  <!-- スマホ：プラン別タブ切替 -->
  <div class="matrix-mobile">
    <div class="m-tabs" role="tablist">
      <button type="button" role="tab" data-plan="ライト|¥0|3件 / メール / ー">ライト</button>
      <button type="button" role="tab" class="is-active" data-plan="スタンダード|¥980|無制限 / チーム / 優先">スタンダード</button>
      <button type="button" role="tab" data-plan="プロ|¥2,480|無制限 / 監査ログ / 専任">プロ</button>
    </div>
    <div class="m-panel"><strong id="mPrice">¥980</strong>/月<p id="mSpec">無制限 / チーム / 優先</p></div>
  </div>
</div>

<style>
.matrix-table { width: 100%; border-collapse: collapse; font-size: 13px; background: #fff; }
.matrix-table th, .matrix-table td { padding: 10px; border-bottom: 1px solid #e4e4e7; text-align: center; }
.matrix-table th:first-child, .matrix-table td:first-child { text-align: left; }
.matrix-table .featured { background: #eff6ff; color: #1d4ed8; font-weight: 700; }
.matrix-table .muted { color: #a1a1aa; font-weight: 400; }
.matrix-mobile { display: none; border: 1px solid #e4e4e7; border-radius: 12px; padding: 12px; background: #fff; text-align: center; }
.m-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; background: #f4f4f5; padding: 4px; border-radius: 8px; }
.m-tabs button { border: none; background: transparent; padding: 6px; font-size: 12px; border-radius: 6px; cursor: pointer; }
.m-tabs button.is-active { background: #fff; color: #1d4ed8; font-weight: 700; }
@media (max-width: 640px) { .matrix-desktop { display: none; } .matrix-mobile { display: block; } }
</style>

<script>
(() => {
  const tabs = document.querySelectorAll('.m-tabs button');
  const priceEl = document.getElementById('mPrice');
  const specEl = document.getElementById('mSpec');
  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabs.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const parts = (btn.dataset.plan || '').split('|');
      if (priceEl && parts[1]) priceEl.textContent = parts[1];
      if (specEl && parts[2]) specEl.textContent = parts[2];
    });
  });
})();
<\/script>`},{id:`price-usage-estimator`,category:`pricing`,title:`人数スライダー連動お見積り計算機（大口割引表示付き）`,subtitle:`「うちのチームだと月いくらかな？」をスライダーで動かしてすぐ計算でき、人数が増えると自動割引タグも点灯します`,mechanismTag:`range入力 + tabular-nums 合計金額リアクション`,xRayCaption:`スライダー値の変更に合わせて単価判定（10名以上割引）と合計桁幅ブレ防止（tabular-nums）を行っています`,interactiveHint:`「再生」またはスライダーを動かして金額・割引バッジの変化を確認できます`,defaultDuration:.3,durationRange:{min:.15,max:.8,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 入力させずスライダーで直感的に見積もらせる`,detail:`キーボード入力を強いるより、つまみを動かすだけで「安い／妥当」を体感してもらえます。`,codeHint:`<input type="range" min="1" max="20" />`},{title:`② 数字の幅がガタつかないよう tabular-nums を指定`,detail:`「1」と「8」の幅が違うと金額が左右に揺れて安っぽく見えるため等幅数字にします。`,codeHint:`font-variant-numeric: tabular-nums`},{title:`③ ボリューム割引の切り替わりでバッジを出す`,detail:`「10名以上で割引適用」などのご褒美タグが見えると多人数検討の後押しになります。`,codeHint:`{seats >= 10 && <span class="badge">割引適用</span>}`}],keywords:[`見積もり`,`計算`,`スライダー`,`料金計算`,`人数`,`マネタイズ`],buildPrompt:(e,t)=>k({name:`人数連動・リアルタイム料金見積りスライダー`,goal:`利用人数スライダーを動かすだけで月額の合計金額を即計算し、一定人数以上で割引バッジが点灯する納得型見積りUIを作りたいです。`,mechanism:`range input の値から単価（例: 10名以上で単価割引）と合計金額を計算し、font-variant-numeric: tabular-nums で金額表示を更新します。`,requirements:[`単価ルールや通貨フォーマットを純粋関数で計算し、常に有限数値（Number.isFinite）で検証する`,`スライダー操作中に数字の横幅がガタつかないよう font-variant-numeric: tabular-nums を必ず適用する`],params:e,targetNote:t}),buildCode:e=>`<div class="estimator">
  <label>人数：<span id="seatOut">5</span>名</label>
  <input id="seatRange" type="range" min="1" max="20" value="5" />
  <div class="total">¥<span id="priceOut">4,900</span>/月</div>
</div>

<style>
.total { font-variant-numeric: tabular-nums; font-weight: 800; font-size: 24px; transition: color ${e.duration.toFixed(2)}s ease, transform ${e.duration.toFixed(2)}s ease; }
</style>

<script>
(() => {
  const range = document.getElementById('seatRange');
  const seatOut = document.getElementById('seatOut');
  const priceOut = document.getElementById('priceOut');
  if (!range || !seatOut || !priceOut) return;
  range.addEventListener('input', () => {
    const n = Math.min(20, Math.max(1, Number(range.value) || 1));
    const unit = n >= 10 ? 780 : 980;
    seatOut.textContent = String(n);
    priceOut.textContent = (n * unit).toLocaleString('ja-JP');
  });
})();
<\/script>`},{id:`price-trust-assurance`,category:`pricing`,title:`購入ボタン直下の安心マイクロコピー＆即確認FAQ（静的設計）`,subtitle:`申し込む直前に「勝手に課金されない？」「すぐやめられる？」という不安をその場で解消する誠実な配置`,mechanismTag:`主CTA + 不安解消2行コピー + 折りたたみFAQ（静的）`,xRayCaption:`派手な煽りや偽のカウントダウンを排し、「1クリック解約」「事前通知」と1クリックFAQを直下に置いています`,interactiveHint:`FAQ行をクリックしてその場での疑問解消動作を確認できます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.25,durationRange:{min:.1,max:.8,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 不安がよぎる「ボタンの真下」に事実を短く書く`,detail:`画面一番下の利用規約に隠さず、登録ボタンの直下に「いつでも解約可」を置きます。`,codeHint:`<button>開始</button><small>1クリックで解約可能</small>`},{title:`② 「自動課金の前にお知らせ」など誠実な約束を明記`,detail:`こっそり請求しないことを明言する方が長期的な信頼と継続率につながります。`,codeHint:`安心アイコン + 短文2項目まで`},{title:`③ 一番聞かれる1問だけその場で開けるようにする`,detail:`別ページへ飛ばすと戻ってこなくなるため、1問アコーディオンを下に置きます。`,codeHint:`<details><summary>Q...</summary><p>A...</p></details>`}],keywords:[`マイクロコピー`,`安心`,`解約`,`トライアル`,`CVR`,`コンバージョン`,`FAQ`],buildPrompt:(e,t)=>k({name:`登録ボタン直下の安心マイクロコピー＆ミニFAQ`,goal:`無料トライアルや購入ボタンの直下に、解約しやすさ・請求タイミングの安心情報とよく聞かれる1問FAQを添えて不安なく進めるようにしたいです。`,mechanism:`CTA ボタン直下にアイコン付きの短い安心コピーを 2 つ横並びで配置し、直下にネイティブ開閉可能な 1 問 FAQ を添えます。`,isStatic:!0,requirements:[`過剰な緊急性（偽の残り時間タイマー等）を使わず事実だけを落ち着いた表現で伝える`,`解約条件のミニ FAQ には標準の <details> / <summary> を使い、スクリプトなしでも展開可能にする`],params:e,targetNote:t}),buildCode:()=>`<div class="cta-trust">
  <button type="button" class="cta-btn">14日間の無料トライアルを始める</button>
  <p class="trust-note">✓ いつでも1クリック解約　•　✓ 自動課金前にメールでお知らせ</p>
  <details class="trust-faq">
    <summary>Q. 無料期間中に解約すると請求されますか？</summary>
    <p>いいえ。期間内にワンクリックで解約すれば請求は一切発生しません。</p>
  </details>
</div>

<style>
.cta-trust { max-width: 360px; padding: 16px; border: 1px solid #e4e4e7; border-radius: 12px; background: #fff; }
.cta-btn { width: 100%; padding: 12px; border: none; border-radius: 10px; background: #2563eb; color: #fff; font-weight: 700; cursor: pointer; }
.trust-note { margin: 10px 0 0; text-align: center; font-size: 12px; color: #52525b; }
.trust-faq { margin-top: 10px; border-top: 1px solid #f4f4f5; padding-top: 8px; font-size: 12px; }
.trust-faq summary { cursor: pointer; font-weight: 600; color: #3f3f46; }
</style>`},{id:`form-validation-shake`,category:`forms`,title:`入力エラー時のやさしい横揺れ＋即理由ガイド`,subtitle:`誤りがある時に入力欄が小さく左右にブルッと揺れて注意を引き、すぐ下に「どう直せばいいか」を明示します`,mechanismTag:`@keyframes 水平振動 + aria-invalid 赤枠 + 具体メッセージ`,xRayCaption:`エラー検出時だけ入力欄に 360ms の左右振動（±6px）をかけ、下に具体的な修正ガイドを出しています`,interactiveHint:`「再生」または「確認する」を押してエラー時の揺れと修正時解除を試せます`,defaultDuration:.36,durationRange:{min:.2,max:.8,step:.04},defaultEasing:`snappy`,hasEasingControl:!1,steps:[{title:`① 振動幅は ±6px、時間は 0.35秒以内で上品に`,detail:`大きく揺らしすぎると画面酔いするため、軽く「違いますよ」と合図する程度にします。`,codeHint:`translate3d(-6px, 0, 0) ↔ (+6px, 0, 0)`},{title:`② 色と揺れだけでなく「直し方」を文章で書く`,detail:`色覚特性のある方も困らないよう「エラー」だけでなく「@を含めて入力」と示します。`,codeHint:`<p role="alert">@を含めて入力してください</p>`},{title:`③ 再入力を始めたらすぐ赤枠を解除する`,detail:`直そうと文字を打っている最中もずっと赤いと責められている感覚になるため、入力で消します。`,codeHint:`onChange -> setError(false)`}],keywords:[`バリデーション`,`エラー`,`シェイク`,`揺れる`,`フォーム`,`入力チェック`],buildPrompt:(e,t)=>k({name:`エラー時シェイク振動＆修正ガイド付き入力欄`,goal:`フォーム送信時に形式エラーがあった場合、該当入力欄を軽く左右に揺らして気づかせ、直下に具体的な修正メッセージを表示したいです。`,mechanism:`検証失敗時に対象 input へ keyframes（±6px 水平往復）と aria-invalid="true" を付与し、直下に role="alert" の修正案内を出します。`,requirements:[`ユーザーが文字を打ち直した瞬間にエラー状態と赤枠を即座に解除してストレスを与えない`,`赤枠と揺れだけに頼らず aria-invalid="true" と role="alert" の具体的な修正メッセージを併記する`],params:e,targetNote:t}),buildCode:e=>`<form id="mailForm" class="mail-form">
  <div class="mail-row">
    <input id="mailField" type="text" placeholder="name@example.com" aria-invalid="false" />
    <button type="submit">確認する</button>
  </div>
  <p id="mailErr" class="mail-err" role="alert" hidden>「@」を含む正しいメールアドレス形式で入力してください</p>
</form>

<style>
.mail-row { display: flex; gap: 8px; max-width: 340px; }
.mail-row input { flex: 1; padding: 8px 12px; border: 1px solid #d4d4d8; border-radius: 10px; }
.mail-row input.is-shake { border-color: #e11d48; background: #fff1f2; animation: shakeX ${e.duration.toFixed(2)}s ease; }
.mail-row button { padding: 8px 14px; border: none; border-radius: 10px; background: #18181b; color: #fff; font-weight: 700; }
.mail-err { margin: 6px 0 0; font-size: 12px; font-weight: 600; color: #e11d48; }
@keyframes shakeX { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
</style>

<script>
(() => {
  const form = document.getElementById('mailForm');
  const input = document.getElementById('mailField');
  const err = document.getElementById('mailErr');
  if (!form || !input || !err) return;
  input.addEventListener('input', () => {
    input.classList.remove('is-shake');
    input.setAttribute('aria-invalid', 'false');
    err.hidden = true;
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(input.value.trim());
    if (!ok) {
      input.classList.remove('is-shake');
      void input.offsetWidth;
      input.classList.add('is-shake');
      input.setAttribute('aria-invalid', 'true');
      err.hidden = false;
    }
  });
})();
<\/script>`},{id:`form-password-strength`,category:`forms`,title:`パスワード強度メーター（色ゲージ＋表示切り替え目アイコン）`,subtitle:`文字数や英数字記号の混在に合わせて 3 本のバーが赤→黄→緑へ伸び、打ち間違い確認用の表示ボタンも付きます`,mechanismTag:`3段階ゲージ + password/text type 切替`,xRayCaption:`打鍵ごとに制御文字を除去した上で複雑度（0〜3点）を算出し、3本ゲージの色と幅を切り替えています`,interactiveHint:`「再生」の自動入力や、自分で文字・数字・記号を打ってゲージ上昇を試せます`,defaultDuration:.3,durationRange:{min:.15,max:.8,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 送信前でも「何が足りないか」を言葉で伝える`,detail:`赤ゲージの隣に「英数字や記号を混ぜると安心」と添えることで再入力を減らせます。`,codeHint:`length >= 6 / mixed chars / >= 10 + symbol`},{title:`② 「●●●●」を確認できる目アイコンを必ず置く`,detail:`スマホでのタイプミスによるロックアウトを防ぐ必須パーツです。`,codeHint:`type={show ? "text" : "password"}`},{title:`③ 判定に使うだけで生値はコンソールやログへ残さない`,detail:`画面表示用の強度計算だけをローカルで完結させ、パスワード平文を外に出しません。`,codeHint:`local calculation only (zero logging)`}],keywords:[`パスワード`,`強度`,`メーター`,`会員登録`,`セキュリティ`,`表示切替`],buildPrompt:(e,t)=>k({name:`ライブパスワード強度メーター＆表示切り替え欄`,goal:`パスワード登録欄の下に 3 段階の強度バー（弱い／まずまず／安全）をリアルタイム表示し、伏字の表示/非表示ボタンも付けたいです。`,mechanism:`文字数・英数字混在・記号有無の 3 軸で強度スコアを計算して 3 本の色付きバーを更新し、目のアイコン押下で input の type 属性を切り替えます。`,requirements:[`パスワード文字列のコピー送信やログ出力をせず、クライアント内の強度表示だけに使用する`,`ゲージ色だけでなく「文字数・英数字・記号」など具体的な強度理由テキストと表示切替ボタンを添える`],params:e,targetNote:t}),buildCode:e=>`<div class="pw-box">
  <div class="pw-row">
    <input id="pwField" type="password" placeholder="英数・記号を組み合わせて入力" />
    <button type="button" id="pwToggle" aria-label="表示切替">表示</button>
  </div>
  <div class="pw-bars"><span id="b1"></span><span id="b2"></span><span id="b3"></span></div>
  <small id="pwLabel">未入力</small>
</div>

<style>
.pw-box { max-width: 320px; display: grid; gap: 8px; }
.pw-row { display: flex; border: 1px solid #d4d4d8; border-radius: 10px; padding: 4px 10px; background: #fff; }
.pw-row input { flex: 1; border: none; outline: none; font-size: 13px; }
.pw-bars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.pw-bars span { height: 6px; border-radius: 9999px; background: #e4e4e7; transition: background-color ${e.duration.toFixed(2)}s ease; }
</style>

<script>
(() => {
  const pw = document.getElementById('pwField');
  const toggle = document.getElementById('pwToggle');
  const bars = [document.getElementById('b1'), document.getElementById('b2'), document.getElementById('b3')];
  const label = document.getElementById('pwLabel');
  if (!pw || !toggle || !label) return;
  toggle.addEventListener('click', () => {
    const show = pw.type === 'password';
    pw.type = show ? 'text' : 'password';
    toggle.textContent = show ? '隠す' : '表示';
  });
  pw.addEventListener('input', () => {
    const v = pw.value;
    let s = 0;
    if (v.length >= 6) s++;
    if (/[0-9]/.test(v) && /[a-zA-Z]/.test(v)) s++;
    if (v.length >= 10 && /[^a-zA-Z0-9]/.test(v)) s++;
    if (v && s === 0) s = 1;
    const color = s === 1 ? '#f43f5e' : s === 2 ? '#f59e0b' : '#10b981';
    bars.forEach((b, i) => { if (b) b.style.background = i < s ? color : '#e4e4e7'; });
    label.textContent = ['未入力', '弱い（6文字以上推奨）', 'まずまず（記号も追加）', '安全（十分な強度）'][s];
  });
})();
<\/script>`},{id:`form-step-progress`,category:`forms`,title:`迷わせないステップバー（「あと何歩で終わるか」を見せる）`,subtitle:`入力項目が多い申し込みでも 1 → 2 → 3 の現在地とつながる青い線を見せることで途中離脱を防ぎます`,mechanismTag:`ステップ番号ノード + 接続プログレスバー伸縮`,xRayCaption:`ステップ数に応じた割合（0% / 50% / 100%）で背後の青線の幅を伸ばし、済んだ丸印を緑チェックに変えています`,interactiveHint:`「再生」または番号や「次へ」を押してステップ進行を確認できます`,defaultDuration:.35,durationRange:{min:.15,max:.9,step:.05},defaultEasing:`smooth`,hasEasingControl:!0,steps:[{title:`① 全工程は 3〜4 ステップ以内に分割する`,detail:`1画面に20個入力欄を並べるより、3ステップに分けて「もう半分」を見せる方が完了率が上がります。`,codeHint:`width: calc(stepIndex * 50%)`},{title:`② 終わったステップは緑のチェック ✓ に変える`,detail:`完了した実感を積み上げることで最後の「完了する」まで進みやすくなります。`,codeHint:`done ? <CheckIcon /> : stepNumber`},{title:`③ 前ステップへ番号タップでも戻れるように`,detail:`入力内容を直したいとき迷わず前へ戻れる導線を確保します。`,codeHint:`<button onClick={() => goStep(idx)}>`}],keywords:[`ステップバー`,`ウィザード`,`申し込み手順`,`プログレスバー`,`進捗`],buildPrompt:(e,t)=>k({name:`完了チェック付きマルチステップ進捗バー`,goal:`登録や決済などの複数ステップ入力画面で、「全3ステップ中のどこにいるか」を繋ぐ青い線と完了チェック印で分かりやすく表示したいです。`,mechanism:`横並びのステップ丸印の背後に伸びるプログレスバー（幅: stepIdx/(total-1) * 100%）をトランジションさせ、完了ステップをチェック記号へ差し替えます。`,requirements:[`現在のステップに aria-current="step" を付けて位置関係を明確にする`,`前の手順へ戻るボタンや残りステップ数を添えて途中で迷わないようにする`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="step-card">
  <div class="step-track">
    <div class="step-bg"></div>
    <div id="stepBar" class="step-fill" style="transition: width ${e.duration.toFixed(2)}s ${t};"></div>
    <button type="button" class="step-dot is-current" data-step="0"><span>1</span><small>基本情報</small></button>
    <button type="button" class="step-dot" data-step="1"><span>2</span><small>プラン選択</small></button>
    <button type="button" class="step-dot" data-step="2"><span>3</span><small>完了確認</small></button>
  </div>
  <div class="step-footer">
    <span id="stepText">ステップ 1 / 3：基本情報</span>
    <button type="button" id="nextStepBtn">次へ</button>
  </div>
</div>

<style>
.step-card { max-width: 360px; display: grid; gap: 12px; }
.step-track { position: relative; display: flex; justify-content: space-between; align-items: flex-start; }
.step-bg, .step-fill { position: absolute; left: 14px; top: 14px; height: 2px; }
.step-bg { right: 14px; background: #e4e4e7; }
.step-fill { width: 0%; background: #2563eb; }
.step-dot { position: relative; z-index: 1; background: none; border: none; display: grid; place-items: center; gap: 4px; cursor: pointer; }
.step-dot span { width: 28px; height: 28px; border-radius: 9999px; border: 1px solid #d4d4d8; background: #fff; font: 700 12px/26px sans-serif; color: #71717a; }
.step-dot.is-current span { border-color: #2563eb; color: #1d4ed8; box-shadow: 0 0 0 4px #dbeafe; }
.step-dot.is-done span { border-color: #059669; background: #059669; color: #fff; }
.step-dot small { font-size: 10px; font-weight: 700; color: #52525b; }
.step-footer { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1px solid #e4e4e7; border-radius: 12px; background: #fff; font-size: 12px; font-weight: 700; }
.step-footer button { border: none; border-radius: 8px; padding: 5px 10px; background: #18181b; color: #fff; font-size: 11px; cursor: pointer; }
</style>

<script>
(() => {
  const labels = ['基本情報', 'プラン選択', '完了確認'];
  const dots = document.querySelectorAll('.step-dot');
  const bar = document.getElementById('stepBar');
  const text = document.getElementById('stepText');
  const next = document.getElementById('nextStepBtn');
  let cur = 0;
  const sync = (idx) => {
    cur = idx;
    if (bar) bar.style.width = cur === 0 ? '0px' : 'calc(' + (cur * 50) + '% - ' + (cur * 14) + 'px)';
    if (text) text.textContent = 'ステップ ' + (cur + 1) + ' / 3：' + labels[cur];
    dots.forEach((d, i) => {
      d.classList.toggle('is-done', i < cur);
      d.classList.toggle('is-current', i === cur);
      const badge = d.querySelector('span');
      if (badge) badge.textContent = i < cur ? '✓' : String(i + 1);
    });
  };
  dots.forEach((d, i) => d.addEventListener('click', () => sync(i)));
  if (next) next.addEventListener('click', () => sync((cur + 1) % 3));
})();
<\/script>`}},{id:`form-file-dropzone`,category:`forms`,title:`点線ドロップ枠（ドラッグ接近で青くハイライト・添付解除）`,subtitle:`画像やPDFを枠の上へ持ってきた瞬間に点線と背景が青く反応し、「ここに落とせる」と手触りで伝えます`,mechanismTag:`dragover 点線反転 + 添付ファイルチップ表示`,xRayCaption:`dragover イベント時に青枠・微小拡大し、ドロップ後はファイル名をサニタイズした添付カードへ切り替えます`,interactiveHint:`「再生」や「テストファイルを選ぶ」または実際のファイルドラッグでも試せます`,defaultDuration:.25,durationRange:{min:.1,max:.8,step:.05},defaultEasing:`snappy`,hasEasingControl:!1,steps:[{title:`① ドロップ予定地の定石は「2px 破線枠」`,detail:`実線カードと一目で区別できるため、世界共通で「ファイルを置ける場所」と認識されます。`,codeHint:`border: 2px dashed #d4d4d8`},{title:`② dragover 中だけ青色＋背景色＋scale(1.01) で迎える`,detail:`ファイルの吸い付き感を出すため e.preventDefault() を忘れずに書きます。`,codeHint:`onDragOver={(e) => { e.preventDefault(); setOver(true); }}`},{title:`③ 添付ファイル名もサニタイズして安全表示＋×ボタンで削除可`,detail:`ファイル名に制御文字が含まれる場合に備え、サニタイズし取り消しボタンを付けます。`,codeHint:`sanitizePlainText(file.name, 40)`}],keywords:[`アップロード`,`ドラッグアンドドロップ`,`ファイル添付`,`ドロップゾーン`,`フォーム`],buildPrompt:(e,t)=>k({name:`ドラッグ接近反応付きファイルアップロード枠`,goal:`破線で囲まれたファイル受付ボックスにファイルを重ねた瞬間に枠色が青く強調され、添付後は削除ボタン付きカードへ切り替わるUIを作りたいです。`,mechanism:`dragover でハイライト状態へ切り替え、drop やファイル選択後は安全なテキストとしてファイル名・サイズカードを表示します。`,requirements:[`ドロップ以外にも通常のクリック選択ボタンを併用し、スマホ・キーボードでも必ず添付できるようにする`,`ドラッグ進入時の色・破線・拡大強調は dragleave / drop 時に確実に解除し状態が残らないようにする`],params:e,targetNote:t}),buildCode:e=>`<div id="dropZone" class="drop-zone">ここにファイルをドロップ</div>

<style>
.drop-zone { border: 2px dashed #d4d4d8; border-radius: 12px; padding: 24px; text-align: center; transition: all ${e.duration.toFixed(2)}s ease; }
.drop-zone.is-over { border-color: #2563eb; background: #eff6ff; transform: scale(1.01); }
</style>

<script>
(() => {
  const z = document.getElementById('dropZone');
  if (!z) return;
  z.addEventListener('dragover', (e) => { e.preventDefault(); z.classList.add('is-over'); });
  z.addEventListener('dragleave', () => z.classList.remove('is-over'));
  z.addEventListener('drop', (e) => {
    e.preventDefault(); z.classList.remove('is-over');
    const file = e.dataTransfer && e.dataTransfer.files[0];
    if (file) z.textContent = '添付済み：' + file.name;
  });
})();
<\/script>`},{id:`guide-btt-minimal-arrow`,category:`guides`,title:`戻るボタン形態②：スクロール後半だけ浮く控えめ矢印アイコン`,subtitle:`一番上では隠しておき、少し下へ読み進めた時だけ右下に丸い ↑ ボタンをすっと浮かび上がらせます`,mechanismTag:`scroll > 閾値 監視 + フェード＆微小スライド浮上`,xRayCaption:`ページ最上部では pointer-events: none で隠れ、52px 以上スクロールすると右下に浮かびます`,interactiveHint:`「再生」または中身の枠をスクロールし、現れた右下の「↑」ボタンをクリックできます`,defaultDuration:.45,durationRange:{min:.2,max:1.2,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 一番上にいる時はボタンを見せない`,detail:`最初から右下に「↑」があると押しても意味がなく視界ノイズになるため、閾値超えまで隠します。`,codeHint:`setShown(el.scrollTop > 52)`},{title:`② 非表示時は opacity: 0 だけでなく pointer-events: none に`,detail:`透明のままクリックできると意図せず誤クリックされるため必ず当たり判定を消します。`,codeHint:`pointer-events: none (when hidden)`},{title:`③ クリックで滑らかに scrollTo({ top: 0 })`,detail:`ワープではなく滑らかに戻ることで「ページ先頭へ帰ってきた」感覚を作れます。`,codeHint:`window.scrollTo({ top: 0, behavior: "smooth" })`}],keywords:[`ページトップ`,`上に戻る`,`控えめ`,`矢印`,`スクロール`,`追従`],buildPrompt:(e,t)=>k({name:`スクロール後だけ浮かぶミニマル上戻るボタン`,goal:`初期表示では画面をスッキリ保ち、一定以上スクロールした時だけ右下に小さな丸型「↑」ボタンをフェード出現させたいです。`,mechanism:`scroll 位置が閾値を超えたときだけ is-visible クラスで opacity: 1 / translateY(0) にし、非表示時は pointer-events: none で誤タップを防ぎます。`,requirements:[`非表示状態ではタップできないよう pointer-events: none と aria-hidden を適切に切り替える`,`ページ上端付近（scrollY <= 300px）では非表示にして本文やヒーロー視認性を妨げないようにする`],params:e,targetNote:t}),buildCode:e=>`<button type="button" id="minTopBtn" class="min-top-btn" aria-label="先頭へ戻る">↑</button>

<style>
.min-top-btn {
  position: fixed; right: 20px; bottom: 20px; width: 40px; height: 40px; border-radius: 9999px;
  opacity: 0; transform: translateY(12px); pointer-events: none; transition: opacity ${e.duration.toFixed(2)}s ease, transform ${e.duration.toFixed(2)}s ease;
}
.min-top-btn.is-shown { opacity: 1; transform: translateY(0); pointer-events: auto; }
</style>

<script>
(() => {
  const btn = document.getElementById('minTopBtn');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('is-shown', window.scrollY > 240), { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();
<\/script>`},{id:`guide-btt-progress-ring`,category:`guides`,title:`戻るボタン形態③：読了ゲージ円リング付きトップへ戻る`,subtitle:`戻るボタンの外周が円グラフになっており、「今この記事の何%まで読んだか」をリアルタイムに示します`,mechanismTag:`SVG circle stroke-dashoffset + 戻るボタン統合`,xRayCaption:`円の周長 circumference × (1 - 読了率) を SVG の stroke-dashoffset へ代入しています`,interactiveHint:`「再生」または中身の文書を上下にスクロールすると青いリングの伸び縮みを見られます`,defaultDuration:.5,durationRange:{min:.25,max:1.4,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 円の半径 r から周長（2πr）を計算する`,detail:`stroke-dasharray に円1周の長さを渡すと「点線のすき間なし1本リング」が作れます。`,codeHint:`const c = 2 * Math.PI * 16`},{title:`② stroke-dashoffset で塗りの残り長さを制御`,detail:`0% ならオフセット = c（空）、100% ならオフセット = 0（満タン）にします。`,codeHint:`stroke-dashoffset = c * (1 - pct / 100)`},{title:`③ 長文ブログ・ドキュメントと特に相性が良い`,detail:`あとどれくらいで読み終えるかがさりげなく分かり、そのまま先頭復帰もできます。`,codeHint:`-rotate-90 で真上12時位置からスタート`}],keywords:[`読了ゲージ`,`プログレスリング`,`円形メーター`,`ページトップ`,`戻る`,`SVG`],buildPrompt:(e,t)=>k({name:`読了プログレスリング一体型の先頭へ戻るボタン`,goal:`長文記事や図鑑ページで、ページの読了割合を外周の青い円リングで示しつつクリックで先頭へ戻れる丸ボタンを右下に置きたいです。`,mechanism:`scroll 進捗（0〜1）から 2πr × (1 - progress) を求め、戻るボタン背景の SVG <circle> の stroke-dashoffset をリアルタイム更新します。`,requirements:[`scroll イベントは passive: true で登録し、描画が重くならないようにする`,`円周進捗は SVG の transform: rotate(-90deg) を起点にし、真上から時計回りに進むように揃える`],params:e,targetNote:t}),buildCode:e=>`<button type="button" id="bttRingBtn" class="btt-ring" aria-label="先頭へ戻る">
  <svg width="44" height="44" viewBox="0 0 40 40" class="btt-svg" aria-hidden="true">
    <circle cx="20" cy="20" r="16" fill="none" stroke="#e4e4e7" stroke-width="2.5" />
    <circle id="ringBar" cx="20" cy="20" r="16" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="100.53" stroke-dashoffset="100.53" stroke-linecap="round" />
  </svg>
  <span class="btt-arrow" aria-hidden="true">↑</span>
</button>

<style>
.btt-ring { position: fixed; right: 20px; bottom: 20px; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 9999px; border: none; background: #fff; box-shadow: 0 6px 20px rgba(0,0,0,.1); cursor: pointer; opacity: 0; pointer-events: none; transition: opacity ${e.duration.toFixed(2)}s ease; }
.btt-ring.is-visible { opacity: 1; pointer-events: auto; }
.btt-svg { transform: rotate(-90deg); }
#ringBar { transition: stroke-dashoffset ${Math.max(.08,e.duration*.4).toFixed(2)}s linear; }
.btt-arrow { position: absolute; font-size: 14px; font-weight: 800; color: #18181b; }
</style>

<script>
(() => {
  const btn = document.getElementById('bttRingBtn');
  const ring = document.getElementById('ringBar');
  if (!btn || !ring) return;
  const c = 2 * Math.PI * 16;
  const sync = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pct = Math.min(1, Math.max(0, window.scrollY / max));
    ring.style.strokeDashoffset = (c * (1 - pct)).toFixed(2);
    btn.classList.toggle('is-visible', window.scrollY > 180);
  };
  window.addEventListener('scroll', sync, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  sync();
})();
<\/script>`},{id:`guide-btt-static-footer`,category:`guides`,title:`戻るボタン形態④：フッター定位置アンカー（浮遊なし・静的配置）`,subtitle:`追従ボタンをあえて置かずページ末尾にしっかり据え置く、本文の閲覧を邪魔しない最も落ち着いた選択`,mechanismTag:`追従固定なし + フッター内静的ボタン（静的配置）`,xRayCaption:`画面右下に浮く部品を作らないため、スマホの小画面でも本文の文字が常に 100% 見えます`,interactiveHint:`「先頭へ戻る」ボタンを押すと一番上へ滑らかに戻る静的配置の効果を確認できます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.45,durationRange:{min:.2,max:1,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 「常に右下に浮遊させる」を疑ってみる`,detail:`チャット窓・Cookie帯・戻るボタンが画面隅に重なると非常に窮屈になるため、静的設置も有力解です。`,codeHint:`footer border-top bar placement`},{title:`② フッター最上段の右側に落ち着いた枠ボタンで配置`,detail:`読み終えて視線が最後に辿り着く位置に置くため、「次にどこへ行こう」のタイミングで押せます。`,codeHint:`display: flex; justify-content: space-between`},{title:`③ 一番上へ戻る処理だけは滑らかに`,detail:`配置自体は動かさず、押した先のジャンプ移動だけスムーズにすると洗練されます。`,codeHint:`window.scrollTo({ top: 0, behavior: "smooth" })`}],keywords:[`戻るボタン`,`フッター`,`静的`,`固定なし`,`アンカー`,`スマホ見やすい`],buildPrompt:(e,t)=>k({name:`フッター定位置の静的な先頭へ戻るボタン`,goal:`画面の隅にボタンを常時浮遊させず、フッター上部へ自然に組み込んだ「↑ 先頭へ戻る」ボタンを置きたいです。`,mechanism:`position: fixed を使わずフッター領域内の右側へボタンを固定配置し、クリック時のみ smooth scroll でページ先頭へ戻します。`,isStatic:!0,requirements:[`スマホ横幅でも押しやすいタップ領域（min-height: 36px 以上）を確保する`,`追従要素を持たずレイアウト最下段に固定されるため、本文の隅を絶対に覆わない`],params:e,targetNote:t}),buildCode:()=>`<footer class="static-footer">
  <span>© KatakataLab</span>
  <a href="#top" class="back-top-anchor">↑ 先頭へ戻る</a>
</footer>

<style>
.static-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-top: 1px solid #e4e4e7; }
.back-top-anchor { font-size: 12px; font-weight: 700; color: #3f3f46; text-decoration: none; }
</style>`},{id:`guide-dismissible-banner`,category:`guides`,title:`上部の「×で閉じられる」お知らせ告知バナー`,subtitle:`セールや新機能の告知をページ最上部に出しつつ、読んだ人が「×」で片付けられる行儀の良い通知帯`,mechanismTag:`条件レンダリング解除 + 再表示復帰状態`,xRayCaption:`閉じられた状態（bannerOpen=false）ではDOM高さを残さずスッキリ詰め、誤って閉じても再表示例を学べます`,interactiveHint:`「再生」または右側の「×」ボタンを押して閉じた時のスッキリ感を確認できます`,defaultDuration:.25,durationRange:{min:.1,max:.6,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 必ず右端に「× 閉じる」ボタンを付ける`,detail:`閉じられないバナーは全画面の見やすさを奪うため、読後に消せる手段を用意します。`,codeHint:`<button aria-label="お知らせを閉じる">×</button>`},{title:`② 実サイトではセッション記憶（localStorage 等）と組み合わせる`,detail:`別ページへ移るたびに何度も同じ通知が出続けないよう閉じた記録を安全に保持します。`,codeHint:`sessionStorage / state toggle`},{title:`③ 文言は1行・50文字以内に収める`,detail:`スマホで2行3行に膨らむとヘッダーが下に押し出されすぎるため簡潔に書きます。`,codeHint:`truncate / concise 1-line announcement`}],keywords:[`バナー`,`お知らせ`,`閉じる`,`告知`,`キャンペーン`,`通知バー`],buildPrompt:(e,t)=>k({name:`×ボタンで閉じられる告知バナー`,goal:`ページ最上部にキャンペーンや新着のお知らせ帯を表示し、不要になったユーザーが右端の × ボタンで閉じられるようにしたいです。`,mechanism:`閉じるボタンで表示フラグを false にしてレイアウトから安全に取り除き、実運用では状態またはストレージへ閉じた記録を残します。`,requirements:[`モバイル画面でも文字が画面外にはみ出さないようフレックス折り返し・文字省略を行う`,`閉じるボタンには分かりやすい aria-label を付け、消える際は不透明度変化で唐突さを抑える`],params:e,targetNote:t}),buildCode:e=>`<div id="topBanner" class="banner" role="region" aria-label="お知らせ">
  <span class="banner-text">新プラン公開中：年額払いで 20% 割引キャンペーン実施中</span>
  <button type="button" id="closeBannerBtn" aria-label="閉じる">×</button>
</div>

<style>
.banner { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; border-radius: 12px; background: #2563eb; color: #fff; font-size: 12px; font-weight: 600; transition: opacity ${e.duration.toFixed(2)}s ease, transform ${e.duration.toFixed(2)}s ease; }
.banner.is-closing { opacity: 0; transform: translateY(-6px); }
.banner-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#closeBannerBtn { flex-shrink: 0; border: none; border-radius: 6px; padding: 2px 8px; background: rgba(255,255,255,.15); color: #fff; cursor: pointer; }
</style>

<script>
(() => {
  const b = document.getElementById('topBanner');
  const btn = document.getElementById('closeBannerBtn');
  if (!b || !btn) return;
  btn.addEventListener('click', () => {
    b.classList.add('is-closing');
    setTimeout(() => b.remove(), ${Math.round(e.duration*1e3)});
  });
})();
<\/script>`},{id:`guide-tooltip-popover`,category:`guides`,title:`「？」に重ねるとふわりと開く吹き出し補足ツールチップ`,subtitle:`用語の意味や割引条件など「常に書くと画面がうるさい補足」だけを必要な人向けに出し入れする吹き出し`,mechanismTag:`relative 親基準 + bottom: full 吹き出し + 三角しっぽ`,xRayCaption:`「補足説明を見る」ボタンの真上に CSS ボーダー三角しっぽ付き吹き出しを配置しています`,interactiveHint:`「再生」またはボタンにホバー／クリックして吹き出しの開閉を試せます`,defaultDuration:.2,durationRange:{min:.1,max:.6,step:.05},defaultEasing:`snappy`,hasEasingControl:!1,steps:[{title:`① 必須情報ではなく「補足情報」だけをしまう`,detail:`絶対に読ませたい注意書きをツールチップに隠すと見落とされるため、補足に絞ります。`,codeHint:`role="tooltip"`},{title:`② スマホ（ホバーなし）向けにクリック開閉も必ず対応`,detail:`onClick でも開閉できるようにするとタッチデバイスでも同じ補足が読めます。`,codeHint:`hover + click toggle`},{title:`③ しっぽ三角形はボーダー透明 trick で綺麗に描く`,detail:`border-top-color だけ色を付けた高さ0要素でピタッとボタン真上へ指させます。`,codeHint:`border: 4px solid transparent; border-top-color: #18181b`}],keywords:[`ツールチップ`,`ポップオーバー`,`吹き出し`,`補足`,`ヘルプ`,`？`],buildPrompt:(e,t)=>k({name:`ホバー＆タップ両対応の吹き出しツールチップ`,goal:`「？」マークや補足ボタンの真上に、必要な時だけわかりやすい短い吹き出しツールチップが出る仕組みを作りたいです。`,mechanism:`トリガー要素を基準（position: relative）にして真上に吹き出し要素（bottom: 100%）と三角矢印を重ね、hover とクリック両方で開閉します。`,requirements:[`role="tooltip" と aria-describedby を紐づけてアクセシビリティにも対応する`,`マウスホバーだけでなくクリック／タップや :focus-visible フォーカスでも補足を読めるようにする`],params:e,targetNote:t}),buildCode:e=>{let t=D[e.easing].css;return`<div class="tip-wrap">
  <button type="button" id="tipTrigger" class="tip-btn" aria-describedby="tipBox" aria-expanded="false">？ 補足説明を見る</button>
  <div id="tipBox" role="tooltip" class="tip-pop">2ヶ月分お得になります</div>
</div>

<style>
.tip-wrap { position: relative; display: inline-block; }
.tip-btn { border: 1px solid #d4d4d8; border-radius: 9999px; background: #fff; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; }
.tip-pop {
  position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%) translateY(4px);
  opacity: 0; pointer-events: none; background: #18181b; color: #fff; padding: 7px 11px; border-radius: 10px;
  white-space: nowrap; font-size: 11px; box-shadow: 0 8px 20px rgba(0,0,0,.18);
  transition: opacity ${e.duration.toFixed(2)}s ${t}, transform ${e.duration.toFixed(2)}s ${t};
}
.tip-pop::after { content: ""; position: absolute; top: 100%; left: 50%; margin-left: -4px; border: 4px solid transparent; border-top-color: #18181b; }
.tip-wrap:hover .tip-pop, .tip-wrap.is-open .tip-pop { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto; }
</style>

<script>
(() => {
  const wrap = document.querySelector('.tip-wrap');
  const btn = document.getElementById('tipTrigger');
  if (!wrap || !btn) return;
  btn.addEventListener('click', () => {
    const open = wrap.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
  });
})();
<\/script>`}},{id:`guide-empty-state`,category:`guides`,title:`データ0件「まだ何もありません」の案内デザイン（エンプティステート）`,subtitle:`検索結果0件やリスト空っぽの時に「真っ白な空白」にせず、原因と次に押すべき1ボタンを示す安心設計`,mechanismTag:`空状態専用ブロック + 回復CTA 1個（静的構成）`,xRayCaption:`「一致なし」で終わらせず「条件をリセットして戻る」という次の行動ボタンを1つ添えるのがプロ仕様です`,interactiveHint:`「条件をリセットして戻る」を押してリスト状態との切り替えを確認できます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.25,durationRange:{min:.15,max:.6,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 0件のまま画面を真っ白（何も表示しない）にしない`,detail:`バグや通信エラーと誤解されるため、専用アイコン＋一言で「正しく0件である」と伝えます。`,codeHint:`{items.length === 0 && <EmptyState />}`},{title:`② なぜ空なのか・次どうすればいいかを1文ずつ`,detail:`「条件を広げる」「新規作成する」など解決する道筋を短く提示します。`,codeHint:`原因説明 + 次アクション 1 つ`},{title:`③ リカバリーボタンを必ず 1 つ置く`,detail:`検索条件リセットやサンプル追加ボタンがあると、ユーザーは袋小路に入りません。`,codeHint:`<button onClick={reset}>条件をリセット</button>`}],keywords:[`空状態`,`エンプティステート`,`0件`,`見つかりません`,`静的`,`案内`],buildPrompt:(e,t)=>k({name:`次の行動を案内するエンプティステート設計`,goal:`検索結果が0件のときや初期状態でデータがないときに、真っ白な画面ではなく丁寧なメッセージと「リセット／追加」ボタンを1つ表示したいです。`,mechanism:`データ配列長が 0 の分岐に破線枠・アイコン・理由メッセージ・復帰用CTAボタンを備えた専用コンポーネントをレンダリングします。`,isStatic:!0,requirements:[`スマホ幅でも中央揃え・適度な余白（padding）を保ち窮屈に見せない`,`なぜ表示がないのかの簡潔な理由と、条件リセットや新規作成など「次の一歩」のボタンを 1 つ添える`],params:e,targetNote:t}),buildCode:()=>`<div class="empty-box" role="status">
  <div class="empty-icon" aria-hidden="true">📥</div>
  <p class="empty-title">一致する項目がありません</p>
  <p class="empty-sub">条件をリセットするとすべての項目を再表示できます。</p>
  <button type="button" class="empty-cta">条件をリセットして戻る</button>
</div>

<style>
.empty-box { max-width: 340px; border: 1px dashed #d4d4d8; border-radius: 14px; background: #fff; padding: 20px; text-align: center; }
.empty-icon { width: 36px; height: 36px; margin: 0 auto 8px; border-radius: 9999px; background: #f4f4f5; display: grid; place-items: center; }
.empty-title { margin: 0; font-size: 13px; font-weight: 700; color: #18181b; }
.empty-sub { margin: 4px 0 12px; font-size: 12px; color: #71717a; }
.empty-cta { border: none; border-radius: 8px; padding: 7px 14px; background: #18181b; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
</style>`},{id:`guide-pagination-vs-more`,category:`guides`,title:`ページ送り「1・2・3」vs「もっと見る追加」の使い分け（静的）`,subtitle:`戻りたい場所を覚えられる番号式と、気軽に見続けられる追加式をスイッチして役割の違いを体験できます`,mechanismTag:`ページ分割番号 vs 追記スライス読み込み（静的配置）`,xRayCaption:`資料・図鑑・検索には「番号」、SNS・画像ギャラリーには「もっと見る」が向く違いを並べて試せます`,interactiveHint:`上の切り替えタブで「ページ番号」と「もっと見る」の両方の動きを試せます`,hasPlayback:!1,hasViewportToggle:!0,defaultDuration:.25,durationRange:{min:.15,max:.6,step:.05},defaultEasing:`smooth`,hasEasingControl:!1,steps:[{title:`① 「あとで3ページ目に戻りたい」サイトは番号（1・2・3）`,detail:`EC商品や検索結果ではページ位置が記憶でき、フッターにもすぐ辿り着けます。`,codeHint:`items.slice((page - 1) * perPage, page * perPage)`},{title:`② 流し見したい一覧は「もっと見る（追記）」`,detail:`画面遷移なしで縦に継ぎ足すことでリズムよく次々チェックできます。`,codeHint:`items.slice(0, visibleCount)`},{title:`③ 自動無限スクロールよりボタン型「もっと見る」が安全な場合も多い`,detail:`下にあるフッターを押したいのに逃げていくストレスを防げます。`,codeHint:`<button onClick={() => setCount(c => c + 10)}>もっと見る</button>`}],keywords:[`ページネーション`,`ページ送り`,`もっと見る`,`一覧読み込み`,`比較`,`静的`],buildPrompt:(e,t)=>k({name:`用途別ページング比較（ページ番号 vs もっと見る）`,goal:`大量の一覧データを見せるとき、場所を記憶しやすい「1・2・3 番号式」とテンポ良く増やせる「もっと見る追加式」を要件に合わせて作り分けたいです。`,mechanism:`配列の切り出しを page 指定の slice 制御（ページ番号）または表示件数上限加算制御（もっと見る）で安全に行います。`,isStatic:!0,requirements:[`全件表示に達したら「もっと見る」ボタンを非表示または完了状態へ切り替える`,`選択中のページ番号には aria-current="page" を付け、切り替え後の総件数も読み上げ可能にする`],params:e,targetNote:t}),buildCode:()=>`<div class="paging-box">
  <!-- パターンA：ページ番号式 -->
  <nav aria-label="ページ送り" class="pager">
    <button type="button" class="is-active" aria-current="page">1</button>
    <button type="button">2</button>
    <button type="button">3</button>
  </nav>
  <!-- パターンB：追記「もっと見る」式 -->
  <button type="button" id="loadMoreBtn" class="more-btn">＋ 次の項目を読み込む（<span id="shownCnt">2</span>/6件）</button>
</div>

<style>
.paging-box { display: grid; gap: 10px; max-width: 340px; }
.pager { display: flex; gap: 6px; }
.pager button { width: 28px; height: 28px; border-radius: 6px; border: 1px solid #e4e4e7; background: #fff; font-weight: 700; cursor: pointer; }
.pager button.is-active { background: #2563eb; border-color: #2563eb; color: #fff; }
.more-btn { border: 1px solid #d4d4d8; border-radius: 10px; padding: 8px 12px; background: #fafafa; font-size: 12px; font-weight: 700; cursor: pointer; }
</style>

<script>
(() => {
  const btn = document.getElementById('loadMoreBtn');
  const cnt = document.getElementById('shownCnt');
  if (!btn || !cnt) return;
  let total = 2;
  btn.addEventListener('click', () => {
    total = total >= 6 ? 2 : total + 2;
    cnt.textContent = String(total);
  });
})();
<\/script>`},{id:`guide-inline-confirm`,category:`guides`,title:`アラート窓を開かない「その場2段階確認」ボタン`,subtitle:`ブラウザ標準の confirm() や大きいダイアログを出さず、ボタンのその場で「本当に？ [はい] [戻る]」を展開します`,mechanismTag:`3状態ステートマシン（idle → ask → done）`,xRayCaption:`状態変数（idle / ask / done）を切り替えるだけで画面全体を遮らず確実に確認ワンクッションを挟みます`,interactiveHint:`「再生」または「この下書きを削除する」を押して2段階ボタンの展開を試せます`,defaultDuration:.25,durationRange:{min:.1,max:.7,step:.05},defaultEasing:`snappy`,hasEasingControl:!1,steps:[{title:`① リスト行内の削除などには画面全体モーダルは大げさすぎる`,detail:`視線を画面中央へ飛ばさず、今指やカーソルがある場所で確認を終えられるため快適です。`,codeHint:`phase: "idle" | "ask" | "done"`},{title:`② 本当に実行ボタンとキャンセル（戻る）ボタンの色分けを明快に`,detail:`危険操作は赤塗り、キャンセルは白背景で押すべき位置を取り違えないようにします。`,codeHint:`[ はい、削除 (赤) ] [ 戻る (白) ]`},{title:`③ confirm() のブロックを使わないため非同期UXと調和する`,detail:`現代のWebアプリ標準のデザインとして、画面のトーンを壊さず安全確認を実装できます。`,codeHint:`onClick={() => setPhase("ask")}`}],keywords:[`確認ボタン`,`インライン確認`,`2段階`,`削除確認`,`モーダルレス`,`安全`],buildPrompt:(e,t)=>k({name:`モーダル不要のその場2段階確認UI`,goal:`リスト項目などの削除・取消操作時に、全画面ダイアログや window.confirm() を開かずその場で「本当に実行しますか？ [はい][戻る]」を展開したいです。`,mechanism:`idle / ask / done の状態に応じてボタン領域の内容をインラインで切り替え、視線移動ゼロで二重確認を行います。`,requirements:[`展開直後にボタン位置が急激にズレて誤爆しないよう十分な間隔・色差を持たせる`,`モーダルを出さずにその場で確定・取消へ戻る際もコンテナ高（min-height）を一定に保ち周囲を動かさない`],params:e,targetNote:t}),buildCode:e=>`<div id="inlineBox" class="inline-confirm"></div>

<style>
.inline-confirm { display: inline-flex; align-items: center; gap: 8px; min-height: 36px; font-size: 13px; }
.btn-del, .btn-danger, .btn-cancel { transition: background-color ${e.duration.toFixed(2)}s ease, transform ${e.duration.toFixed(2)}s ease; }
.btn-del { padding: 7px 14px; border: 1px solid #fecdd3; border-radius: 8px; background: #fff1f2; color: #be123c; font-weight: 700; cursor: pointer; }
.btn-danger { padding: 7px 14px; border: none; border-radius: 8px; background: #e11d48; color: #fff; font-weight: 700; cursor: pointer; }
.btn-cancel { padding: 7px 12px; border: 1px solid #e4e4e7; border-radius: 8px; background: #fff; color: #3f3f46; font-weight: 600; cursor: pointer; }
.confirm-done { color: #16a34a; font-weight: 700; }
</style>

<script>
(() => {
  const box = document.getElementById('inlineBox');
  if (!box) return;
  const renderIdle = () => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn-del'; b.textContent = 'この項目を削除';
    b.onclick = renderAsk;
    box.replaceChildren(b);
  };
  const renderAsk = () => {
    const ok = document.createElement('button');
    ok.type = 'button'; ok.className = 'btn-danger'; ok.textContent = 'はい、削除する';
    ok.onclick = () => {
      const done = document.createElement('span');
      done.className = 'confirm-done';
      done.textContent = '✓ 削除しました';
      box.replaceChildren(done);
    };
    const cancel = document.createElement('button');
    cancel.type = 'button'; cancel.className = 'btn-cancel'; cancel.textContent = '戻る';
    cancel.onclick = renderIdle;
    box.replaceChildren(ok, cancel);
  };
  renderIdle();
})();
<\/script>`}],z=Object.freeze([...j,...M,...N,...P,...F,...I,...ne,...L,...re,...R]),ie=Object.freeze(`text-mask-slide-up.text-sweep-left-to-right.text-stagger-chars.text-typewriter.text-marker-highlight.reveal-fade-lift.reveal-curtain-block.reveal-stagger-grid.reveal-3d-flip.nav-slide-drawer.nav-fullscreen-curtain.nav-top-accordion.nav-bottom-sheet.tabs-sliding-underline.tabs-floating-pill.tabs-content-slide.tabs-smooth-accordion.search-icon-expand.search-inline-bar.search-backdrop-typography.search-command-modal.micro-tactile-press.micro-click-ripple.micro-underline-sweep.micro-magnetic-button.layout-sticky-split.layout-shrinking-header.layout-bento-grid.layout-marquee-loop.layout-skeleton-toast.hf-classic-header.hf-centered-brand.hf-floating-pill.hf-mega-menu.hf-sitemap-footer.hf-minimal-footer.hf-curtain-reveal-footer.craft-flip-card.craft-before-after.craft-tilt-shine.craft-number-counter.craft-scrollspy-toc.carousel-scroll-snap.carousel-peek-slider.carousel-thumb-sync.carousel-lightbox.carousel-stack-deck.conv-pricing-static.conv-billing-toggle.conv-submit-feedback.conv-floating-label.conv-read-more.conv-back-to-top.hdr-link-hover-grow.hdr-link-underline.hdr-link-pill-active.hdr-announcement-two-tier.hdr-transparent-to-solid.hdr-rail-sidebar.ftr-cta-docked.ftr-giant-wordmark.ftr-newsletter-form.ftr-compact-utility.text-tracking-compress.text-scroll-fill.text-word-slot.text-circular-badge.text-outline-fill.reveal-frame-zoom.reveal-caption-overlay.reveal-blur-focus.reveal-staggered-offset.nav-icon-morph-variants.nav-stagger-drawer.nav-app-tab-bar.tabs-filter-chips.tabs-vertical-settings.search-autocomplete.search-popular-chips.micro-button-3d.micro-button-shimmer.micro-button-arrow.micro-button-copy.micro-button-hold.micro-heart-pop.price-matrix-table.price-usage-estimator.price-trust-assurance.form-validation-shake.form-password-strength.form-step-progress.form-file-dropzone.guide-btt-minimal-arrow.guide-btt-progress-ring.guide-btt-static-footer.guide-dismissible-banner.guide-tooltip-popover.guide-empty-state.guide-pagination-vs-more.guide-inline-confirm`.split(`.`)),ae=Object.create(null);ie.forEach((e,t)=>{ae[e]=t+1});var oe=Object.freeze(ae);function B(e){return Object.prototype.hasOwnProperty.call(oe,e)?oe[e]??0:0}function V(e){return!Number.isFinite(e)||e<=0?`#---`:`#${String(Math.floor(e)).padStart(3,`0`)}`}function se(e,t){if(!Number.isFinite(e)||e<=0)return 0;let n=t.trim(),r=n.match(/^#?(\d{1,3})$/);if(!r)return 0;let i=r[1]??``,a=n.startsWith(`#`),o=Number(i),s=String(e).padStart(3,`0`);return i.length===3?s===i?2:0:e===o?2:a||i.startsWith(`0`)?+!!s.startsWith(i):0}var H=`katakata_motion_favorites_v1`;function ce(e){try{let t=window.localStorage.getItem(H);if(!t)return[];let n=JSON.parse(t);if(!Array.isArray(n))return[];let r=[],i=new Set;for(let t of n)typeof t==`string`&&e.has(t)&&!i.has(t)&&(i.add(t),r.push(t));return r}catch{return[]}}function U(e){let[t,n]=(0,b.useState)(()=>ce(e));(0,b.useEffect)(()=>{try{window.localStorage.setItem(H,JSON.stringify(t))}catch{}},[t]);let r=(0,b.useMemo)(()=>new Set(t),[t]),i=(0,b.useCallback)(t=>{e.has(t)&&n(e=>e.includes(t)?e.filter(e=>e!==t):[...e,t])},[e]),a=(0,b.useCallback)(()=>{n([])},[]);return{favoriteSet:r,favoriteCount:t.length,toggleFavorite:i,clearFavorites:a}}var W=`(prefers-reduced-motion: reduce)`;function le(){return typeof window>`u`||typeof window.matchMedia!=`function`?!1:window.matchMedia(W).matches}function G(){let[e,t]=(0,b.useState)(le);return(0,b.useEffect)(()=>{if(typeof window>`u`||typeof window.matchMedia!=`function`)return;let e=window.matchMedia(W);t(e.matches);let n=e=>{t(e.matches)};return e.addEventListener(`change`,n),()=>{e.removeEventListener(`change`,n)}},[]),e}var K=Object.freeze([{label:`#001 下から出現`,query:`#001`},{label:`#014 検索モーダル`,query:`#014`},{label:`#038 カード裏返し`,query:`#038`},{label:`#046 料金トグル`,query:`#046`},{label:`#054 ヘッダー`,query:`ヘッダー`},{label:`ボタン`,query:`ボタン`},{label:`カルーセル`,query:`カルーセル`},{label:`フォーム`,query:`フォーム`}]),q=[[`hover`,`ホバー`],[`header`,`ヘッダー`],[`footer`,`フッター`],[`button`,`ボタン`],[`modal`,`モーダル`],[`drawer`,`ドロワー`],[`search`,`検索`],[`accordion`,`アコーディオン`],[`carousel`,`カルーセル`],[`slider`,`スライダー`],[`pricing`,`料金`],[`price`,`料金`],[`tab`,`タブ`],[`scroll`,`スクロール`],[`skeleton`,`スケルトン`],[`tooltip`,`ツールチップ`],[`card`,`カード`],[`form`,`フォーム`],[`flip`,`裏返し`],[`typewriter`,`タイプライター`],[`toast`,`トースト`],[`fade`,`フェード`],[`menu`,`メニュー`],[`sticky`,`追従`],[`top`,`戻る`],[`btt`,`戻る`],[`confirm`,`確認`],[`badge`,`バッジ`],[`blur`,`ぼかし`],[`loading`,`待機`],[`filter`,`絞り込み`],[`drop`,`ドロップ`],[`password`,`パスワード`],[`error`,`エラー`],[`empty`,`空状態`]];function J(e){let t=e.trim().toLowerCase();return t?t.split(/\s+/).filter(Boolean).map(e=>{let t=new Set([e]);for(let[n,r]of q)e.includes(n)&&t.add(r),e.includes(r)&&t.add(n);return[...t]}):[]}function ue(e){switch(e){case`header`:return{kind:`browser-chrome`,containerClass:`bg-zinc-50/75 border-zinc-200`,chromeLabel:`ブラウザ上端プレビュー`};case`footer`:return{kind:`browser-chrome`,containerClass:`bg-zinc-50/75 border-zinc-200`,chromeLabel:`ページ末尾プレビュー`};case`pricing`:case`forms`:case`guides`:return{kind:`ui-sheet`,containerClass:`bg-[#F9F8F4] border-zinc-200/90`};case`carousel`:case`craft`:return{kind:`gallery-matte`,containerClass:`bg-zinc-50/90 border-zinc-200/90`};default:return{kind:`lab-grid`,containerClass:`stage-dot-grid border-zinc-200`}}}var de=`modulepreload`,fe=function(e,t){return new URL(e,t).href},pe={},me=function(e){return e.pathname.endsWith(`.css`)},Y=function(e,t,n){if(t in e)return e[t];let r=n();if(!r){e[t]=void 0;return}let i=r.then(()=>{e[t]=void 0},n=>{throw e[t]=void 0,n});return e[t]=i,i},X=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e,i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function s(e){return import.meta.resolve?new URL(import.meta.resolve(e)):new URL(e,import.meta.url)}r=o(t.map(t=>{t=fe(t,n);let r=s(t),i=me(r);return Y(pe,r.href,()=>{if(e===void 0){e={all:new Set,styles:new Set};let t=document.getElementsByTagName(`link`);for(let n=t.length-1;n>=0;n--){let r=t[n];e.all.add(r.href),r.rel===`stylesheet`&&e.styles.add(r.href)}}if((i?e.styles:e.all).has(r.href))return;let t=document.createElement(`link`);if(t.rel=i?`stylesheet`:de,i||(t.as=`script`),t.crossOrigin=``,t.href=r.href,a&&t.setAttribute(`nonce`,a),document.head.appendChild(t),i)return new Promise((e,n)=>{let i=a=>{t.removeEventListener(`load`,i),t.removeEventListener(`error`,i),a.type===`error`?n(Error(`Unable to preload CSS for ${r}`)):e(a)};t.addEventListener(`load`,i),t.addEventListener(`error`,i)})})}).filter(e=>e!==void 0))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})},he=null;async function ge(e,t){return he||=X(()=>import(`./tailwindRegistry-D6TRy2Vl.js`),[],import.meta.url),(await he).renderTailwindCode(e,t)}var Z=y(),_e=class extends b.Component{state={hasError:!1};static getDerivedStateFromError(){return{hasError:!0}}componentDidUpdate(e){this.state.hasError&&e.resetKey!==this.props.resetKey&&this.setState({hasError:!1})}handleReset=()=>{this.setState({hasError:!1})};render(){return this.state.hasError?this.props.variant===`stage`?(0,Z.jsxs)(`div`,{role:`alert`,className:`flex flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-5 text-center`,children:[(0,Z.jsx)(`p`,{className:`text-xs font-semibold text-zinc-700`,children:`このプレビューの表示中に問題が発生しました`}),(0,Z.jsxs)(`button`,{type:`button`,onClick:this.handleReset,className:`inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 cursor-pointer`,children:[(0,Z.jsx)(h,{className:`h-3 w-3`}),(0,Z.jsx)(`span`,{children:`表示をリセット`})]})]}):(0,Z.jsx)(`div`,{role:`alert`,className:`flex min-h-screen items-center justify-center bg-[#faf9f6] p-6 text-zinc-900`,children:(0,Z.jsxs)(`div`,{className:`w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-xs`,children:[(0,Z.jsx)(`h1`,{className:`text-base font-bold text-zinc-900`,children:`画面の表示に問題が発生しました`}),(0,Z.jsx)(`p`,{className:`mt-1.5 text-xs leading-relaxed text-zinc-500`,children:`一時的な表示エラーを検知しました。下のボタンから表示を復帰できます。`}),(0,Z.jsxs)(`button`,{type:`button`,onClick:()=>window.location.reload(),className:`mt-4 inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 cursor-pointer`,children:[(0,Z.jsx)(h,{className:`h-3.5 w-3.5`}),(0,Z.jsx)(`span`,{children:`ページを再読み込み`})]})]})}):this.props.children}},ve=b.lazy(()=>X(()=>import(`./StageTextAndReveal-C0BnZD9M.js`).then(e=>({default:e.StageTextAndReveal})),__vite__mapDeps([0,1,2,3]),import.meta.url)),Q=b.lazy(()=>X(()=>import(`./StageNavAndTabs-DpXJ9B6Y.js`).then(e=>({default:e.StageNavAndTabs})),__vite__mapDeps([4,1,2,3]),import.meta.url)),$=b.lazy(()=>X(()=>import(`./StageSearchMicroLayout--G2ehlWL.js`).then(e=>({default:e.StageSearchMicroLayout})),__vite__mapDeps([5,1,2,6,3]),import.meta.url)),ye=b.lazy(()=>X(()=>import(`./StageHeaderFooter-DZ-f20pn.js`).then(e=>({default:e.StageHeaderFooter})),__vite__mapDeps([7,1,2,6,3]),import.meta.url)),be=b.lazy(()=>X(()=>import(`./StageHeaderFooterExtended-D7WQcDCg.js`).then(e=>({default:e.StageHeaderFooterExtended})),__vite__mapDeps([8,1,2,6,3]),import.meta.url)),xe=b.lazy(()=>X(()=>import(`./StageTextNavExtended-CQ3x623q.js`).then(e=>({default:e.StageTextNavExtended})),__vite__mapDeps([9,1,2,3]),import.meta.url)),Se=b.lazy(()=>X(()=>import(`./StageMonetizeGuidesExtended-D7K_rInG.js`).then(e=>({default:e.StageMonetizeGuidesExtended})),__vite__mapDeps([10,1,2,6,3]),import.meta.url)),Ce=b.lazy(()=>X(()=>import(`./StageCreativeCraft-BCiWJz10.js`).then(e=>({default:e.StageCreativeCraft})),__vite__mapDeps([11,1,2,6,3]),import.meta.url)),we=b.lazy(()=>X(()=>import(`./StageCarousel-DBckfGJ7.js`).then(e=>({default:e.StageCarousel})),__vite__mapDeps([12,1,2,3]),import.meta.url)),Te=b.lazy(()=>X(()=>import(`./StageConversionUi-DO8qVfjg.js`).then(e=>({default:e.StageConversionUi})),__vite__mapDeps([13,1,2,6,3]),import.meta.url)),Ee=new Set([`text-tracking-compress`,`text-scroll-fill`,`text-word-slot`,`text-circular-badge`,`text-outline-fill`,`reveal-frame-zoom`,`reveal-caption-overlay`,`reveal-blur-focus`,`reveal-staggered-offset`,`nav-icon-morph-variants`,`nav-stagger-drawer`,`nav-app-tab-bar`,`tabs-filter-chips`,`tabs-vertical-settings`,`search-autocomplete`,`search-popular-chips`,`micro-button-3d`,`micro-button-shimmer`,`micro-button-arrow`,`micro-button-copy`,`micro-button-hold`,`micro-heart-pop`]);function De(e){let{patternId:t}=e;return Ee.has(t)?(0,Z.jsx)(xe,{...e}):t.startsWith(`hdr-`)||t.startsWith(`ftr-`)?(0,Z.jsx)(be,{...e}):t.startsWith(`price-`)||t.startsWith(`form-`)||t.startsWith(`guide-`)?(0,Z.jsx)(Se,{...e}):t.startsWith(`text-`)||t.startsWith(`reveal-`)?(0,Z.jsx)(ve,{...e}):t.startsWith(`nav-`)||t.startsWith(`tabs-`)?(0,Z.jsx)(Q,{...e}):t.startsWith(`hf-`)?(0,Z.jsx)(ye,{...e}):t.startsWith(`craft-`)?(0,Z.jsx)(Ce,{...e}):t.startsWith(`carousel-`)?(0,Z.jsx)(we,{...e}):t.startsWith(`conv-`)?(0,Z.jsx)(Te,{...e}):(0,Z.jsx)($,{...e})}var Oe=e=>(0,Z.jsx)(b.Suspense,{fallback:(0,Z.jsx)(`div`,{className:`flex min-h-[120px] items-center justify-center text-xs text-zinc-400`,children:`プレビューを読み込み中...`}),children:De(e)}),ke=({label:e,unit:t,min:n,max:r,step:i,value:a,ariaLabel:o,onChange:s,onCommit:c})=>{let l=(0,b.useId)(),[u,d]=(0,b.useState)(!1),[f,p]=(0,b.useState)(String(a));(0,b.useEffect)(()=>{u||p(String(a))},[a,u]);let m=e=>w(e,n,r,i,a);return(0,Z.jsxs)(`div`,{className:`flex min-w-[200px] flex-1 items-center gap-2.5`,children:[(0,Z.jsx)(`label`,{htmlFor:l,className:`shrink-0 text-xs font-semibold text-zinc-600`,children:e}),(0,Z.jsx)(`input`,{id:l,type:`range`,className:`atlas-slider w-full`,min:n,max:r,step:i,value:a,onChange:e=>{s(m(Number.parseFloat(e.target.value)))},onPointerUp:()=>c?.(),onKeyUp:e=>{(e.key===`ArrowLeft`||e.key===`ArrowRight`||e.key===`ArrowUp`||e.key===`ArrowDown`)&&c?.()}}),(0,Z.jsxs)(`div`,{className:`flex shrink-0 items-center gap-1`,children:[(0,Z.jsx)(`input`,{type:`number`,"aria-label":o,min:n,max:r,step:i,value:u?f:String(a),onFocus:e=>{d(!0),p(String(a)),e.currentTarget.select()},onChange:e=>{let t=e.target.value;p(t);let i=Number.parseFloat(t);!Number.isNaN(i)&&i>=n&&i<=r&&s(m(i))},onBlur:()=>{d(!1);let e=Number.parseFloat(f);if(Number.isNaN(e)){p(String(a));return}let t=m(e);p(String(t)),t!==a&&s(t),c?.()},onKeyDown:e=>{e.key===`Enter`?e.currentTarget.blur():e.key===`Escape`&&(p(String(a)),d(!1),e.currentTarget.blur())},className:`w-14 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-right font-mono text-xs text-zinc-800 outline-none focus:border-blue-500`}),(0,Z.jsx)(`span`,{className:`text-[11px] text-zinc-500`,children:t})]})]})},Ae=500,je=b.memo(({pattern:e,serialCode:t,isFavorite:o,onToggleFavorite:c,globalTargetNote:u,prefersReducedMotion:p=!1,codeFormat:te,onChangeCodeFormat:_})=>{let v=(0,b.useMemo)(()=>({duration:e.defaultDuration,distance:e.secondarySlider?.defaultValue??0,easing:e.defaultEasing}),[e]),[y,x]=(0,b.useState)(v),[S,w]=(0,b.useState)(0),[T,O]=(0,b.useState)(!1),[k,j]=(0,b.useState)(!1),[M,N]=(0,b.useState)(!1),[P,F]=(0,b.useState)(`desktop`),I=e.hasPlayback!==!1,ne=I||!!e.secondarySlider||!!e.hasEasingControl,[L,re]=(0,b.useState)(!1),[R,z]=(0,b.useState)(`steps`),[ie,ae]=(0,b.useState)(``),[oe,B]=(0,b.useState)(`html`),[V,se]=(0,b.useState)(``),[H,ce]=(0,b.useState)(null),U=(0,b.useRef)(null),W=(0,b.useRef)(null),le=(0,b.useRef)(null),G=(0,b.useRef)(!1),K=te??oe,q=_??B;(0,b.useEffect)(()=>()=>{U.current!==null&&window.clearTimeout(U.current),W.current!==null&&window.clearTimeout(W.current)},[]),(0,b.useEffect)(()=>{if(!I||p||G.current)return;let e=le.current;if(!e||typeof IntersectionObserver!=`function`)return;let t=new IntersectionObserver(e=>{e.some(e=>e.isIntersecting)&&!G.current&&(G.current=!0,w(e=>e===0?1:e),t.disconnect())},{threshold:.35});return t.observe(e),()=>t.disconnect()},[I,p]);let J=(0,b.useMemo)(()=>E(e,y),[e,y]),de=k?3.2:1,fe=k?Number((J.duration*de).toFixed(2)):J.duration;(0,b.useEffect)(()=>{if(!L||R!==`code`||K!==`tailwind`)return;let t=!1;return ge(e,J).then(e=>{t||se(e)}),()=>{t=!0}},[L,R,K,e,J]);let pe=Math.abs(J.duration-v.duration)>.001||!!e.secondarySlider&&J.distance!==v.distance||J.easing!==v.easing,me=C(u,160).trim(),Y=C(ie,160).trim()||me,X=(0,b.useMemo)(()=>L&&R===`prompt`?e.buildPrompt(J,Y):``,[L,R,e,J,Y]),he=(0,b.useMemo)(()=>L&&R===`code`&&K===`html`?e.buildCode(J):``,[L,R,K,e,J]),ve=K===`tailwind`?V||`Tailwind CSSコードを読み込み中...`:he,Q=ue(e.category),$=(0,b.useCallback)(()=>{W.current!==null&&(window.clearTimeout(W.current),W.current=null),O(!0),W.current=window.setTimeout(()=>{W.current=null,O(!1),w(e=>e+1)},Ae)},[]),ye=()=>{let e=!k;j(e),e&&$()},be=async t=>{await A(t===`prompt`?e.buildPrompt(J,Y):K===`tailwind`?await ge(e,J):e.buildCode(J))&&(U.current!==null&&window.clearTimeout(U.current),ce(t),U.current=window.setTimeout(()=>{ce(null),U.current=null},2e3))};return(0,Z.jsxs)(`article`,{id:e.id,className:`atlas-card-perf scroll-mt-20 rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0_6px_20px_rgba(0,0,0,0.04)]`,children:[(0,Z.jsxs)(`header`,{className:`mb-3 flex items-start justify-between gap-3`,children:[(0,Z.jsxs)(`div`,{className:`min-w-0`,children:[(0,Z.jsxs)(`h2`,{className:`text-base sm:text-[17px] font-bold tracking-tight text-zinc-900`,children:[(0,Z.jsx)(`span`,{className:`mr-2 inline-block rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 align-middle font-mono text-[11px] font-bold text-zinc-600`,children:t}),(0,Z.jsx)(`span`,{className:`align-middle`,children:e.title})]}),(0,Z.jsx)(`p`,{className:`mt-1 text-xs sm:text-[13px] leading-relaxed text-zinc-500`,children:e.subtitle})]}),(0,Z.jsxs)(`button`,{type:`button`,onClick:()=>c(e.id),"aria-pressed":o,"aria-label":o?`${t} をお気に入りから外す`:`${t} をお気に入りに追加`,title:o?`お気に入り済み（クリックで解除）`:`お気に入りに保存`,className:`shrink-0 inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-95 ${o?`border-amber-300 bg-amber-50 text-amber-800`:`border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300 hover:text-zinc-700`}`,children:[(0,Z.jsx)(ee,{className:`h-3.5 w-3.5 transition-transform duration-150 ${o?`fill-amber-400 text-amber-500 scale-110`:``}`}),(0,Z.jsx)(`span`,{className:`hidden sm:inline text-[11px]`,children:o?`保存済み`:`保存`})]})]}),(0,Z.jsxs)(`div`,{ref:le,className:`relative flex min-h-[245px] sm:min-h-[260px] flex-col justify-between overflow-hidden rounded-xl border p-2.5 sm:p-3 ${Q.containerClass}`,children:[(0,Z.jsxs)(`div`,{className:`z-30 flex w-full flex-wrap items-center justify-between gap-1.5`,children:[(0,Z.jsx)(`div`,{className:`min-w-0`,children:I&&k?(0,Z.jsxs)(`div`,{className:`inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/95 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700`,children:[`0.3× スロー中（`,fe.toFixed(2),`秒）`]}):Q.kind===`browser-chrome`?(0,Z.jsxs)(`div`,{className:`inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/90 px-2.5 py-0.5 text-[10px] font-medium text-zinc-500`,children:[(0,Z.jsxs)(`span`,{className:`inline-flex items-center gap-1`,"aria-hidden":`true`,children:[(0,Z.jsx)(`span`,{className:`h-1.5 w-1.5 rounded-full bg-zinc-300`}),(0,Z.jsx)(`span`,{className:`h-1.5 w-1.5 rounded-full bg-zinc-300`}),(0,Z.jsx)(`span`,{className:`h-1.5 w-1.5 rounded-full bg-zinc-300`})]}),(0,Z.jsx)(`span`,{children:Q.chromeLabel})]}):null}),(0,Z.jsxs)(`div`,{className:`ml-auto flex flex-wrap items-center justify-end gap-1.5`,children:[e.hasViewportToggle&&(0,Z.jsxs)(`div`,{className:`inline-flex items-center rounded-lg border border-zinc-200 bg-white/95 p-0.5`,role:`group`,"aria-label":`画面幅のプレビュー切り替え`,children:[(0,Z.jsxs)(`button`,{type:`button`,onClick:()=>F(`desktop`),"aria-pressed":P===`desktop`,title:`PC幅の配置で見る`,className:`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${P===`desktop`?`bg-zinc-900 text-white`:`text-zinc-500 hover:text-zinc-900`}`,children:[(0,Z.jsx)(m,{className:`h-3 w-3`}),(0,Z.jsx)(`span`,{children:`PC`})]}),(0,Z.jsxs)(`button`,{type:`button`,onClick:()=>F(`mobile`),"aria-pressed":P===`mobile`,title:`スマホ幅の折りたたみ配置で見る`,className:`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${P===`mobile`?`bg-zinc-900 text-white`:`text-zinc-500 hover:text-zinc-900`}`,children:[(0,Z.jsx)(l,{className:`h-3 w-3`}),(0,Z.jsx)(`span`,{children:`スマホ`})]})]}),(0,Z.jsxs)(`button`,{type:`button`,onClick:()=>N(e=>!e),"aria-pressed":M,title:`裏側の枠線や仕組みを可視化`,className:`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${M?`border-orange-300 bg-orange-50 text-orange-700`:`border-zinc-200 bg-white/95 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900`}`,children:[(0,Z.jsx)(g,{className:`h-3.5 w-3.5`}),(0,Z.jsx)(`span`,{children:`仕組み`})]}),I&&(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsxs)(`button`,{type:`button`,onClick:ye,"aria-pressed":k,title:`動きをゆっくりスロー再生で確認`,className:`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${k?`border-blue-300 bg-blue-50 text-blue-700`:`border-zinc-200 bg-white/95 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900`}`,children:[(0,Z.jsx)(s,{className:`h-3.5 w-3.5`}),(0,Z.jsx)(`span`,{children:`スロー`})]}),(0,Z.jsxs)(`button`,{type:`button`,onClick:$,className:`inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700 active:translate-y-px cursor-pointer`,children:[(0,Z.jsx)(d,{className:`h-3.5 w-3.5 fill-current`}),(0,Z.jsx)(`span`,{children:S===0&&!T?`再生`:`もう一度`})]})]})]})]}),(0,Z.jsx)(`div`,{className:`flex flex-1 w-full items-center justify-center px-1.5 sm:px-2 py-3`,children:(0,Z.jsx)(_e,{variant:`stage`,resetKey:e.id,children:(0,Z.jsx)(Oe,{patternId:e.id,playKey:S,isWaitingStart:T,slowFactor:de,effectiveDuration:fe,controls:J,showXRay:M,viewportMode:P})})}),M?(0,Z.jsx)(`div`,{className:`z-20 flex items-center justify-center pt-1`,children:(0,Z.jsxs)(`div`,{className:`rounded-lg border border-orange-200 bg-orange-50/95 px-2.5 py-1 text-center text-[11px] font-medium text-orange-900 shadow-2xs`,children:[(0,Z.jsx)(`span`,{className:`font-bold`,children:`仕組み: `}),e.xRayCaption]})}):e.interactiveHint?(0,Z.jsx)(`div`,{className:`pointer-events-none pt-1 text-center text-[11px] text-zinc-400`,children:e.interactiveHint}):(0,Z.jsx)(`div`,{className:`h-2`,"aria-hidden":`true`})]}),ne&&(0,Z.jsxs)(`div`,{className:`mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3.5 py-2.5`,children:[I&&(0,Z.jsx)(ke,{label:`速さ`,unit:`秒`,min:e.durationRange.min,max:e.durationRange.max,step:e.durationRange.step,value:J.duration,ariaLabel:`${e.title}の速さ（秒）`,onChange:t=>x(n=>E(e,{...n,duration:t})),onCommit:$}),e.secondarySlider&&(0,Z.jsx)(ke,{label:e.secondarySlider.label,unit:e.secondarySlider.unit,min:e.secondarySlider.min,max:e.secondarySlider.max,step:e.secondarySlider.step,value:J.distance,ariaLabel:`${e.title}の${e.secondarySlider.label}`,onChange:t=>x(n=>E(e,{...n,distance:t})),onCommit:I?$:void 0}),e.hasEasingControl&&(0,Z.jsx)(`div`,{className:`flex items-center gap-1`,role:`group`,"aria-label":`動きの質感`,children:Object.keys(D).map(t=>{let n=D[t],r=J.easing===t;return(0,Z.jsx)(`button`,{type:`button`,"aria-pressed":r,onClick:()=>{x(n=>E(e,{...n,easing:t})),I&&$()},title:n.description,className:`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${r?`bg-zinc-900 text-white`:`border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100`}`,children:n.label},t)})}),pe&&(0,Z.jsxs)(`button`,{type:`button`,onClick:()=>{x(v),I&&$()},title:`数値を初期値に戻す`,className:`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-800 cursor-pointer`,children:[(0,Z.jsx)(h,{className:`h-3 w-3`}),(0,Z.jsx)(`span`,{children:`戻す`})]})]}),(0,Z.jsxs)(`div`,{className:`mt-3.5 flex flex-wrap items-center justify-between gap-2`,children:[(0,Z.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2`,children:[(0,Z.jsx)(`button`,{type:`button`,onClick:()=>be(`prompt`),className:`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${H===`prompt`?`bg-emerald-600 text-white`:`bg-zinc-900 text-white hover:bg-zinc-800`}`,children:H===`prompt`?(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsx)(r,{className:`h-3.5 w-3.5`}),(0,Z.jsx)(`span`,{children:`AI指示文をコピーしました`})]}):(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsx)(f,{className:`h-3.5 w-3.5`}),(0,Z.jsx)(`span`,{children:`AIへの指示文をコピー`})]})}),(0,Z.jsxs)(`div`,{className:`inline-flex items-center rounded-xl border border-zinc-200 bg-white p-0.5`,children:[(0,Z.jsxs)(`div`,{className:`flex items-center border-r border-zinc-100 pr-0.5 mr-0.5`,role:`group`,"aria-label":`コード形式を選択`,children:[(0,Z.jsx)(`button`,{type:`button`,"aria-pressed":K===`html`,onClick:()=>q(`html`),className:`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${K===`html`?`bg-zinc-900 text-white`:`text-zinc-500 hover:text-zinc-800`}`,children:`HTML`}),(0,Z.jsx)(`button`,{type:`button`,"aria-pressed":K===`tailwind`,onClick:()=>q(`tailwind`),className:`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${K===`tailwind`?`bg-blue-600 text-white`:`text-zinc-500 hover:text-zinc-800`}`,children:`Tailwind`})]}),(0,Z.jsx)(`button`,{type:`button`,onClick:()=>be(`code`),className:`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${H===`code`?`bg-emerald-50 text-emerald-800`:`text-zinc-700 hover:bg-zinc-50`}`,children:H===`code`?(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsx)(r,{className:`h-3.5 w-3.5`}),(0,Z.jsx)(`span`,{children:K===`tailwind`?`Tailwindコピー完了`:`コードをコピー完了`})]}):(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsx)(n,{className:`h-3.5 w-3.5`}),(0,Z.jsx)(`span`,{children:`コードをコピー`})]})})]})]}),(0,Z.jsxs)(`button`,{type:`button`,onClick:()=>re(e=>!e),"aria-expanded":L,className:`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer`,children:[(0,Z.jsx)(i,{className:`h-3.5 w-3.5`}),(0,Z.jsx)(`span`,{children:`解説・中身を見る`}),(0,Z.jsx)(a,{className:`h-3.5 w-3.5 transition-transform duration-200 ${L?`rotate-180`:``}`})]})]}),L&&(0,Z.jsxs)(`div`,{className:`mt-3.5 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5`,children:[(0,Z.jsxs)(`div`,{className:`mb-3 flex items-center justify-between gap-2 border-b border-zinc-200 pb-2`,children:[(0,Z.jsx)(`div`,{className:`flex flex-wrap items-center gap-1`,role:`tablist`,children:[{id:`steps`,label:`仕組み（3ステップ）`},{id:`prompt`,label:`AIへの指示文`},{id:`code`,label:`実装コード`}].map(e=>(0,Z.jsx)(`button`,{type:`button`,role:`tab`,"aria-selected":R===e.id,onClick:()=>z(e.id),className:`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${R===e.id?`border border-zinc-200 bg-white text-zinc-900 shadow-2xs`:`text-zinc-500 hover:text-zinc-800`}`,children:e.label},e.id))}),(0,Z.jsx)(`span`,{className:`hidden sm:inline rounded bg-zinc-200/70 px-2 py-0.5 font-mono text-[10px] text-zinc-700`,children:e.mechanismTag})]}),R===`steps`&&(0,Z.jsx)(`div`,{className:`grid gap-2 sm:grid-cols-3`,children:e.steps.map(e=>(0,Z.jsxs)(`div`,{className:`rounded-lg border border-zinc-200/80 bg-white p-3`,children:[(0,Z.jsx)(`div`,{className:`text-xs font-bold text-zinc-900`,children:e.title}),(0,Z.jsx)(`p`,{className:`mt-1 text-[11px] leading-relaxed text-zinc-600`,children:e.detail}),e.codeHint&&(0,Z.jsx)(`code`,{className:`mt-2 inline-block rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-blue-700`,children:e.codeHint})]},e.title))}),R===`prompt`&&(0,Z.jsxs)(`div`,{className:`space-y-2.5`,children:[(0,Z.jsxs)(`div`,{className:`flex flex-col gap-2 sm:flex-row sm:items-center`,children:[(0,Z.jsx)(`label`,{htmlFor:`target-${e.id}`,className:`shrink-0 text-xs font-semibold text-zinc-700`,children:`どこに使う？（任意）`}),(0,Z.jsx)(`input`,{id:`target-${e.id}`,type:`text`,maxLength:160,value:ie,onChange:e=>ae(C(e.target.value,160)),placeholder:`例：トップページの見出し、記事カードのボタン...`,className:`w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-blue-500`})]}),(0,Z.jsx)(`pre`,{className:`atlas-scroll max-h-60 overflow-auto rounded-lg border border-zinc-200 bg-white p-3 text-xs leading-relaxed text-zinc-800 whitespace-pre-wrap`,children:X})]}),R===`code`&&(0,Z.jsxs)(`div`,{className:`space-y-2`,children:[(0,Z.jsxs)(`div`,{className:`flex flex-wrap items-center justify-between gap-2 text-[11px]`,children:[(0,Z.jsxs)(`div`,{className:`inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-0.5`,role:`group`,"aria-label":`表示コード形式`,children:[(0,Z.jsx)(`button`,{type:`button`,"aria-pressed":K===`html`,onClick:()=>q(`html`),className:`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${K===`html`?`bg-zinc-900 text-white`:`text-zinc-500 hover:text-zinc-900`}`,children:`HTML + CSS`}),(0,Z.jsx)(`button`,{type:`button`,"aria-pressed":K===`tailwind`,onClick:()=>q(`tailwind`),className:`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${K===`tailwind`?`bg-blue-600 text-white`:`text-zinc-500 hover:text-zinc-900`}`,children:`Tailwind CSS`})]}),(0,Z.jsx)(`span`,{className:`text-[11px] text-zinc-500`,children:`個人・商用利用・改変・コピペ自由（MIT準拠）`})]}),(0,Z.jsx)(`pre`,{className:`atlas-scroll max-h-64 overflow-auto rounded-lg border border-zinc-200 bg-zinc-900 p-3 text-[11px] leading-relaxed text-zinc-100`,children:(0,Z.jsx)(`code`,{children:ve})})]})]})]})}),Me=({categories:e,activeCategory:t,isSearching:n,countByCategory:r,totalCount:i,favoriteCount:a,variant:o,onSelect:s})=>{let l=o===`sidebar`;return(0,Z.jsxs)(`nav`,{"aria-label":`アニメーションカテゴリ`,className:l?`space-y-0.5`:`space-y-1`,children:[l&&(0,Z.jsx)(`div`,{className:`px-2.5 pb-1 text-[11px] font-bold tracking-wider text-zinc-400`,children:`カテゴリで選ぶ`}),(0,Z.jsx)(`div`,{className:l?`pb-1.5`:`pb-1`,children:(0,Z.jsxs)(`button`,{type:`button`,"aria-current":!n&&t===`favorites`?`page`:void 0,onClick:()=>s(`favorites`),className:`flex w-full items-center justify-between rounded-xl px-3 text-left font-semibold transition-colors cursor-pointer ${l?`py-1.5 text-[13px]`:`py-2.5 text-xs`} ${!n&&t===`favorites`?l?`bg-amber-50 text-amber-800 shadow-2xs border border-amber-200`:`bg-amber-50 text-amber-800`:l?`text-zinc-700 hover:bg-amber-50/50 hover:text-amber-900 border border-transparent`:`text-zinc-700 hover:bg-zinc-100`}`,children:[(0,Z.jsxs)(`span`,{className:`inline-flex items-center gap-1.5`,children:[(0,Z.jsx)(ee,{className:`h-3.5 w-3.5 ${a>0?`fill-amber-400 text-amber-500`:`text-amber-500/80`}`}),`お気に入り`]}),(0,Z.jsx)(`span`,{className:`font-mono text-[10px] ${l?`text-zinc-500`:`rounded-full bg-white px-2 py-0.5 text-zinc-500 border border-zinc-200`}`,children:a})]})}),e.map(e=>{let i=!n&&t===e.id;return(0,Z.jsxs)(`button`,{type:`button`,"aria-current":i?`page`:void 0,onClick:()=>s(e.id),className:`flex w-full items-center justify-between rounded-xl px-3 text-left font-semibold transition-colors cursor-pointer ${l?`py-1.5 text-[12.5px]`:`py-2 text-xs`} ${i?l?`bg-white text-blue-700 shadow-2xs border border-zinc-200/90`:`bg-blue-50 text-blue-700`:l?`text-zinc-600 hover:bg-white/70 hover:text-zinc-900 border border-transparent`:`text-zinc-700 hover:bg-zinc-100`}`,children:[(0,Z.jsxs)(`span`,{className:`truncate`,children:[(0,Z.jsx)(`span`,{className:`mr-1.5 font-mono text-[11px] ${i?`text-blue-500`:l?`text-zinc-400`:`opacity-60`}`,children:e.code}),e.label]}),(0,Z.jsx)(`span`,{className:`ml-2 rounded-full px-1.5 py-0.5 font-mono text-[10px] ${l?i?`bg-blue-50 text-blue-700`:`text-zinc-400`:`bg-white px-2 text-zinc-500 border border-zinc-200`}`,children:r[e.id]??0})]},e.id)}),(0,Z.jsx)(`div`,{className:l?`pt-1.5`:`pt-1`,children:(0,Z.jsxs)(`button`,{type:`button`,"aria-current":!n&&t===`all`?`page`:void 0,onClick:()=>s(`all`),className:`flex w-full items-center justify-between rounded-xl px-3 text-left font-semibold transition-colors cursor-pointer ${l?`py-1.5 text-[12.5px]`:`py-2.5 text-xs`} ${!n&&t===`all`?l?`bg-white text-blue-700 shadow-2xs border border-zinc-200/90`:`bg-blue-50 text-blue-700`:l?`text-zinc-500 hover:bg-white/70 hover:text-zinc-900 border border-transparent`:`text-zinc-700 hover:bg-zinc-100`}`,children:[(0,Z.jsxs)(`span`,{className:`inline-flex items-center gap-1.5`,children:[(0,Z.jsx)(c,{className:`h-3.5 w-3.5`}),l?`すべて表示`:`すべて一覧で見る`]}),(0,Z.jsx)(`span`,{className:`font-mono text-[10px] ${l?`text-zinc-400`:`rounded-full bg-white px-2 py-0.5 text-zinc-500 border border-zinc-200`}`,children:i})]})}),(0,Z.jsx)(`div`,{className:`mt-1.5 border-t border-zinc-200/80 pt-2`,children:(0,Z.jsx)(`a`,{href:`../`,className:`flex w-full items-center justify-between rounded-xl px-3 text-left font-semibold no-underline transition-colors ${l?`py-1.5 text-[12.5px] text-zinc-600 hover:bg-white/70 hover:text-zinc-900 border border-transparent`:`py-2.5 text-xs text-zinc-700 hover:bg-zinc-100`}`,children:(0,Z.jsxs)(`span`,{className:`inline-flex items-center gap-1.5`,children:[(0,Z.jsx)(_,{className:`h-3.5 w-3.5 text-zinc-400`}),`KatakataLabへ`]})})})]})};function Ne(e){let t=J(e);if(t.length===0)return[];let n=z.map(n=>{let r=B(n.id),i=se(r,e),a=[V(r).toLowerCase(),n.title,n.subtitle,n.mechanismTag,...n.keywords].join(` `).toLowerCase(),o=t.every(e=>e.some(e=>a.includes(e)));return{pattern:n,serialScore:i,matched:i>0||o}}).filter(e=>e.matched);return n.sort((e,t)=>t.serialScore-e.serialScore),n.map(e=>e.pattern)}var Pe=()=>{let[e,t]=(0,b.useState)(`text`),[n,r]=(0,b.useState)(``),[i,a]=(0,b.useState)(!1),[s,c]=(0,b.useState)(``),[l,d]=(0,b.useState)(`html`),[f,m]=(0,b.useState)(!1),[h,g]=(0,b.useState)(-1),_=G(),{favoriteSet:v,favoriteCount:y,toggleFavorite:x}=U((0,b.useMemo)(()=>new Set(z.map(e=>e.id)),[])),S=(0,b.useRef)(null),w=(0,b.useRef)(null),T=(0,b.useRef)(null),E=n.trim().toLowerCase(),D=(0,b.useDeferredValue)(E),k=(0,b.useDeferredValue)(s);(0,b.useEffect)(()=>{if(!f)return;let e=e=>{w.current&&e instanceof Node&&!w.current.contains(e)&&(m(!1),g(-1))},t=t=>e(t.target),n=t=>e(t.target);return document.addEventListener(`mousedown`,t),document.addEventListener(`focusin`,n),()=>{document.removeEventListener(`mousedown`,t),document.removeEventListener(`focusin`,n)}},[f]);let A=(0,b.useMemo)(()=>E?Ne(E).slice(0,5):[],[E]),j=(0,b.useMemo)(()=>D?Ne(D):e===`all`?z:e===`favorites`?z.filter(e=>v.has(e.id)):z.filter(t=>t.category===e),[e,D,v]),M=(0,b.useMemo)(()=>O.find(t=>t.id===e),[e]),N=(0,b.useMemo)(()=>{if(e===`all`||e===`favorites`||D)return null;let t=O.findIndex(t=>t.id===e);return t===-1||t===O.length-1?O[0]??null:O[t+1]??null},[e,D]),P=(0,b.useMemo)(()=>{let e={};for(let t of z)e[t.category]=(e[t.category]??0)+1;return e},[]),F=(0,b.useCallback)(()=>{a(!1),window.requestAnimationFrame(()=>{S.current?.focus()})},[]);(0,b.useEffect)(()=>{if(!i)return;let e=document.body.style.overflow;document.body.style.overflow=`hidden`;let t=e=>{e.key===`Escape`&&F()};return window.addEventListener(`keydown`,t),()=>{document.body.style.overflow=e,window.removeEventListener(`keydown`,t)}},[i,F]);let I=(0,b.useCallback)(e=>{t(e),r(``),a(!1);let n=window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches;window.scrollTo({top:0,behavior:n?`auto`:`smooth`})},[]);return(0,Z.jsxs)(`div`,{id:`top`,className:`page-dot-grid min-h-screen text-zinc-900`,children:[(0,Z.jsxs)(`header`,{className:`sticky top-0 z-40 border-b border-zinc-200/90 bg-white/90 backdrop-blur-md`,children:[(0,Z.jsxs)(`div`,{className:`mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6`,children:[(0,Z.jsxs)(`div`,{className:`flex items-center gap-2.5`,children:[(0,Z.jsx)(`button`,{ref:S,type:`button`,onClick:()=>a(!0),"aria-expanded":i,"aria-label":`カテゴリメニューを開く`,className:`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 lg:hidden cursor-pointer`,children:(0,Z.jsx)(p,{className:`h-4 w-4`})}),(0,Z.jsxs)(`a`,{href:`#top`,onClick:e=>{e.preventDefault(),I(`text`)},className:`flex items-center gap-2.5 text-zinc-900 no-underline`,children:[(0,Z.jsxs)(`svg`,{width:`26`,height:`26`,viewBox:`0 0 32 32`,fill:`none`,"aria-hidden":`true`,className:`shrink-0`,children:[(0,Z.jsx)(`rect`,{x:`4`,y:`7`,width:`14`,height:`18`,rx:`3`,stroke:`#94A3B8`,strokeWidth:`1.8`,strokeDasharray:`3 2.5`}),(0,Z.jsx)(`rect`,{x:`13`,y:`5`,width:`15`,height:`20`,rx:`3.5`,fill:`#2563EB`,fillOpacity:`0.12`,stroke:`#2563EB`,strokeWidth:`2`}),(0,Z.jsx)(`path`,{d:`M19 12L24 15L19 18V12Z`,fill:`#2563EB`})]}),(0,Z.jsxs)(`div`,{className:`leading-tight`,children:[(0,Z.jsx)(`span`,{className:`block text-sm sm:text-base font-extrabold tracking-tight text-zinc-900 whitespace-nowrap`,children:`動きの仕組み図鑑`}),(0,Z.jsx)(`span`,{className:`hidden sm:block text-[11px] text-zinc-500`,children:`KatakataLab Motion Atlas`})]})]})]}),(0,Z.jsxs)(`div`,{ref:w,className:`relative flex-1 max-w-[185px] sm:max-w-sm`,children:[(0,Z.jsxs)(`div`,{className:`flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/70 px-2.5 sm:px-3 py-1.5 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/15 transition-all`,children:[(0,Z.jsx)(u,{className:`h-3.5 w-3.5 shrink-0 text-zinc-400`}),(0,Z.jsx)(`input`,{ref:T,type:`search`,maxLength:80,value:n,role:`combobox`,"aria-expanded":f,"aria-controls":`header-search-popover`,"aria-autocomplete":`list`,onFocus:()=>m(!0),onChange:e=>{r(C(e.target.value,80)),m(!0),g(-1)},onKeyDown:e=>{let t=E?A.length:K.length;if(e.key===`ArrowDown`&&t>0)e.preventDefault(),m(!0),g(e=>(e+1)%t);else if(e.key===`ArrowUp`&&t>0)e.preventDefault(),m(!0),g(e=>e<=0?t-1:e-1);else if(e.key===`Enter`&&f&&h>=0){if(e.preventDefault(),E){let e=A[h];e&&(r(V(B(e.id))),m(!1),g(-1))}else{let e=K[h];e&&(r(e.query),m(!1),g(-1))}}else e.key===`Escape`&&(m(!1),g(-1))},placeholder:`動き・英語・#番号を検索`,"aria-label":`アニメーション・通し番号・英語キーワードを検索`,className:`w-full min-w-0 bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 outline-none`}),n&&(0,Z.jsx)(`button`,{type:`button`,"aria-label":`検索をクリア`,onClick:()=>{r(``),g(-1),T.current?.focus()},className:`text-zinc-400 hover:text-zinc-700 cursor-pointer`,children:(0,Z.jsx)(te,{className:`h-3.5 w-3.5`})})]}),f&&(0,Z.jsx)(`div`,{id:`header-search-popover`,role:`listbox`,"aria-label":E?`一致した候補`:`よく検索されるキーワード`,className:`absolute right-0 left-auto sm:left-0 mt-1.5 w-[min(90vw,340px)] sm:w-full rounded-xl border border-zinc-200 bg-white p-2.5 shadow-lg z-50`,children:E?A.length>0?(0,Z.jsx)(`ul`,{className:`space-y-0.5`,children:A.map((e,t)=>{let n=V(B(e.id));return(0,Z.jsx)(`li`,{children:(0,Z.jsxs)(`button`,{type:`button`,onClick:()=>{r(n),m(!1),g(-1)},className:`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors cursor-pointer ${h===t?`bg-blue-50 text-blue-800`:`text-zinc-700 hover:bg-zinc-100`}`,children:[(0,Z.jsx)(`span`,{className:`shrink-0 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-600`,children:n}),(0,Z.jsx)(`span`,{className:`truncate font-medium`,children:e.title})]})},e.id)})}):(0,Z.jsxs)(`p`,{className:`px-2 py-1.5 text-[11px] text-zinc-500`,children:[`「`,n,`」に合う候補が見つかりません`]}):(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`div`,{className:`mb-1.5 text-[10px] font-semibold tracking-wide text-zinc-400`,children:`よく検索される例（英語検索もOK：hover / modal 等）`}),(0,Z.jsx)(`div`,{className:`flex flex-wrap gap-1.5`,children:K.map((e,t)=>(0,Z.jsx)(`button`,{type:`button`,onClick:()=>{r(e.query),m(!1),g(-1)},className:`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${h===t?`border-blue-500 bg-blue-50 text-blue-700`:`border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-blue-300 hover:bg-blue-50/70`}`,children:e.label},e.label))})]})})]})]}),(0,Z.jsxs)(`div`,{className:`relative border-t border-zinc-100 bg-white/80 lg:hidden`,children:[(0,Z.jsxs)(`div`,{className:`no-scrollbar flex items-center gap-1.5 overflow-x-auto px-4 py-2 pr-10`,children:[(0,Z.jsxs)(`button`,{type:`button`,"aria-pressed":!E&&e===`all`,onClick:()=>I(`all`),className:`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${!E&&e===`all`?`bg-zinc-900 text-white`:`bg-zinc-100 text-zinc-700 hover:bg-zinc-200`}`,children:[`すべて (`,z.length,`)`]}),(0,Z.jsxs)(`button`,{type:`button`,"aria-pressed":!E&&e===`favorites`,onClick:()=>I(`favorites`),className:`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${!E&&e===`favorites`?`bg-amber-500 text-white`:`bg-amber-50 text-amber-800 hover:bg-amber-100`}`,children:[(0,Z.jsx)(ee,{className:`h-3 w-3 fill-current`}),(0,Z.jsxs)(`span`,{children:[`お気に入り (`,y,`)`]})]}),O.map(t=>{let n=!E&&e===t.id;return(0,Z.jsxs)(`button`,{type:`button`,"aria-pressed":n,onClick:()=>I(t.id),className:`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${n?`bg-zinc-900 text-white`:`bg-zinc-100 text-zinc-600 hover:bg-zinc-200`}`,children:[t.code,` `,t.shortLabel]},t.id)})]}),(0,Z.jsx)(`div`,{"aria-hidden":`true`,className:`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white via-white/85 to-transparent`})]})]}),i&&(0,Z.jsxs)(`div`,{className:`fixed inset-0 z-50 lg:hidden`,role:`dialog`,"aria-modal":`true`,"aria-label":`カテゴリメニュー`,children:[(0,Z.jsx)(`div`,{className:`absolute inset-0 bg-zinc-900/30 backdrop-blur-[1px]`,onClick:F}),(0,Z.jsxs)(`aside`,{className:`relative z-10 flex h-full w-72 flex-col bg-white p-4 shadow-xl`,children:[(0,Z.jsxs)(`div`,{className:`mb-4 flex items-center justify-between border-b border-zinc-100 pb-3`,children:[(0,Z.jsx)(`span`,{className:`text-sm font-bold text-zinc-900`,children:`カテゴリを選ぶ`}),(0,Z.jsx)(`button`,{type:`button`,onClick:F,"aria-label":`メニューを閉じる`,className:`rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 cursor-pointer`,children:(0,Z.jsx)(te,{className:`h-4 w-4`})})]}),(0,Z.jsxs)(`div`,{className:`flex-1 overflow-y-auto space-y-4`,children:[(0,Z.jsx)(Me,{categories:O,activeCategory:e,isSearching:!!E,countByCategory:P,totalCount:z.length,favoriteCount:y,variant:`drawer`,onSelect:I}),(0,Z.jsxs)(`div`,{className:`rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3`,children:[(0,Z.jsx)(`label`,{htmlFor:`globalTargetInputDrawer`,className:`block text-[11px] font-semibold text-zinc-700`,children:`AI指示の適用先メモ（任意）`}),(0,Z.jsx)(`input`,{id:`globalTargetInputDrawer`,type:`text`,maxLength:160,value:s,onChange:e=>c(C(e.target.value,160)),placeholder:`例：ポートフォリオの見出し`,className:`mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-blue-500`})]})]})]})]}),(0,Z.jsxs)(`div`,{className:`mx-auto flex max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:py-8`,children:[(0,Z.jsx)(`aside`,{className:`hidden lg:block w-60 shrink-0`,children:(0,Z.jsxs)(`div`,{className:`sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar space-y-5 pb-4`,children:[(0,Z.jsx)(Me,{categories:O,activeCategory:e,isSearching:!!E,countByCategory:P,totalCount:z.length,favoriteCount:y,variant:`sidebar`,onSelect:I}),(0,Z.jsxs)(`div`,{className:`rounded-xl border border-zinc-200/80 bg-white/80 p-3`,children:[(0,Z.jsx)(`label`,{htmlFor:`globalTargetInput`,className:`block text-[11px] font-bold text-zinc-700`,children:`AI指示の適用先メモ（任意）`}),(0,Z.jsx)(`p`,{className:`mt-0.5 text-[11px] leading-snug text-zinc-400`,children:`書くと全カードの「AI指示文」に反映されます`}),(0,Z.jsx)(`input`,{id:`globalTargetInput`,type:`text`,maxLength:160,value:s,onChange:e=>c(C(e.target.value,160)),placeholder:`例：ポートフォリオの見出し`,className:`mt-2 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-blue-500`})]})]})}),(0,Z.jsxs)(`main`,{className:`min-w-0 flex-1 max-w-3xl`,children:[(0,Z.jsx)(`div`,{className:`mb-4 rounded-xl border border-zinc-200/80 bg-white/85 px-3 py-2.5 lg:hidden`,children:(0,Z.jsxs)(`div`,{className:`flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3`,children:[(0,Z.jsx)(`label`,{htmlFor:`globalTargetInputMobile`,className:`shrink-0 text-[11px] font-semibold text-zinc-700`,children:`AI指示の適用先メモ（任意）`}),(0,Z.jsx)(`input`,{id:`globalTargetInputMobile`,type:`text`,maxLength:160,value:s,onChange:e=>c(C(e.target.value,160)),placeholder:`例：LPのヒーロー見出し、料金ボタン...`,className:`w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-blue-500`})]})}),_&&(0,Z.jsx)(`div`,{role:`status`,className:`mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-600`,children:`OSの「視差効果を減らす」設定が有効なため、自動再生を抑えています（「再生」ボタンで個別に動きを確認できます）。`}),(0,Z.jsx)(`div`,{className:`mb-5 flex flex-wrap items-end justify-between gap-2 border-b border-zinc-200/80 pb-3.5`,children:E?(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`div`,{className:`text-xs font-mono text-blue-600`,children:`SEARCH RESULT`}),(0,Z.jsxs)(`h1`,{className:`mt-0.5 text-xl font-extrabold tracking-tight text-zinc-900`,children:[`「`,n,`」の検索結果（`,j.length,`件）`]})]}):M?(0,Z.jsxs)(`div`,{children:[(0,Z.jsxs)(`div`,{className:`text-xs font-mono text-blue-600`,children:[`CATEGORY `,M.code]}),(0,Z.jsx)(`h1`,{className:`mt-0.5 text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900`,children:M.label}),(0,Z.jsx)(`p`,{className:`mt-1 text-xs sm:text-sm text-zinc-500`,children:M.description})]}):e===`favorites`?(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`div`,{className:`text-xs font-mono text-amber-600`,children:`FAVORITES`}),(0,Z.jsxs)(`h1`,{className:`mt-0.5 text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900`,children:[`お気に入りに保存した表現（`,j.length,`件）`]}),(0,Z.jsx)(`p`,{className:`mt-1 text-xs sm:text-sm text-zinc-500`,children:`右上の★ボタンで保存したお気に入りをまとめて見比べ・AIコピーできます`})]}):(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`div`,{className:`text-xs font-mono text-blue-600`,children:`ALL PATTERNS`}),(0,Z.jsxs)(`h1`,{className:`mt-0.5 text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900`,children:[`すべての動き・UIパターン（`,z.length,`種類）`]}),(0,Z.jsx)(`p`,{className:`mt-1 text-xs sm:text-sm text-zinc-500`,children:`右上の「再生」・「スロー」・「仕組み」や通し番号（#001〜）で確かめられます`})]})}),j.length>0?(0,Z.jsx)(`div`,{className:`space-y-5`,children:j.map(e=>(0,Z.jsx)(je,{pattern:e,serialCode:V(B(e.id)),isFavorite:v.has(e.id),onToggleFavorite:x,globalTargetNote:k,prefersReducedMotion:_,codeFormat:l,onChangeCodeFormat:d},e.id))}):e===`favorites`&&!E?(0,Z.jsxs)(`div`,{className:`rounded-2xl border border-zinc-200 bg-white p-10 text-center`,children:[(0,Z.jsx)(`p`,{className:`text-sm font-semibold text-zinc-700`,children:`お気に入りに保存されたパターンはまだありません`}),(0,Z.jsx)(`p`,{className:`mt-1 text-xs text-zinc-500`,children:`気になったカードの右上にある「保存（★）」を押すと、ここにまとめて見返せます`}),(0,Z.jsx)(`button`,{type:`button`,onClick:()=>I(`all`),className:`mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer`,children:`すべてのパターンを見る`})]}):(0,Z.jsxs)(`div`,{className:`rounded-2xl border border-zinc-200 bg-white p-10 text-center`,children:[(0,Z.jsx)(`p`,{className:`text-sm font-semibold text-zinc-700`,children:`一致するアニメーション・番号が見つかりませんでした`}),(0,Z.jsx)(`p`,{className:`mt-1 text-xs text-zinc-500`,children:`「左から」「ヘッダー」「#014」「038」などの言葉や通し番号でお試しください`}),(0,Z.jsx)(`button`,{type:`button`,onClick:()=>r(``),className:`mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer`,children:`検索をリセット`})]}),N&&(0,Z.jsxs)(`div`,{className:`mt-8 flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-white px-5 py-4`,children:[(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`div`,{className:`text-[11px] font-mono text-zinc-400`,children:`NEXT CATEGORY`}),(0,Z.jsxs)(`div`,{className:`text-sm font-bold text-zinc-900`,children:[N.code,` `,N.label]})]}),(0,Z.jsxs)(`button`,{type:`button`,onClick:()=>I(N.id),className:`inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 cursor-pointer`,children:[(0,Z.jsx)(`span`,{children:`次を見る`}),(0,Z.jsx)(o,{className:`h-3.5 w-3.5`})]})]}),(0,Z.jsxs)(`footer`,{className:`mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200/80 pt-5 text-xs text-zinc-500`,children:[(0,Z.jsx)(`span`,{children:`© 2026 KatakataLab / はじっこぐらし（掲載コードは個人・商用利用・改変・コピペ自由／MIT準拠）`}),(0,Z.jsx)(`span`,{children:`動きの仕組み図鑑（Motion Atlas）`})]})]})]})]})},Fe=document.getElementById(`root`);if(!Fe)throw Error(`Root mount container (#root) not found`);(0,x.createRoot)(Fe).render((0,Z.jsx)(b.StrictMode,{children:(0,Z.jsx)(_e,{variant:`page`,children:(0,Z.jsx)(Pe,{})})}));export{C as n,D as t};