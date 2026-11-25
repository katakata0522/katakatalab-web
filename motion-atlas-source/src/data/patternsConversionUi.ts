import type { MotionPattern } from '../types/motion';
import { EASING_OPTIONS, buildStructuredPrompt } from '../utils/motionHelpers';

export const CONVERSION_UI_PATTERNS: MotionPattern[] = [
  {
    id: 'conv-pricing-static',
    category: 'pricing',
    title: '王道3列料金プラン表（おすすめ列を浮かせる視線誘導）',
    subtitle: 'マネタイズページの基本構成。真ん中の「一番選ばれているプラン」だけを色枠＋影で浮かせて決断を助けます',
    mechanismTag: '3列比較Grid + 主役プラン強調階層（静的配置）',
    xRayCaption: '3つとも同じ見た目にするのではなく、推奨プランだけに「濃い枠線・人気ラベル・青いボタン」を集中させています',
    interactiveHint: '右上の「PC / スマホ」で狭い画面幅での縦1列並びを確認できます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.35,
    durationRange: { min: 0.15, max: 1.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① プランは多くても 3 列までに絞る',
        detail: '選択肢が多すぎると人が迷って離脱するため、松・竹・梅の 3 プラン構成が鉄板です。',
        codeHint: 'grid-template-columns: repeat(3, 1fr)'
      },
      {
        title: '② 選んでほしい列だけボタンを塗りつぶす',
        detail: '他2つは薄い枠線ボタン、推奨プランだけ濃い塗りつぶしボタンにすると視線が自然に止まります。',
        codeHint: 'border: 2px solid #2563eb; background: #2563eb (CTA)'
      },
      {
        title: '③ 価格数字は tabular-nums で揃える',
        detail: '縦や横に並んだ金額が見比べやすいよう、等幅数字にしてフォントサイズに強弱を付けます。',
        codeHint: 'font-variant-numeric: tabular-nums'
      }
    ],
    keywords: ['料金表', 'プラン', '比較', 'おすすめ', 'マネタイズ', 'サブスク', '静的'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '王道3列料金プラン表（おすすめ強調配置）',
        goal: 'ライト／スタンダード／プロの3プランを並べ、中央のおすすめプランだけを青枠と「人気」バッジ・塗りつぶしボタンで引き立てる。',
        mechanism: 'CSS Grid による 3 列配置（モバイル時は 1 列縦積み）と、色・枠線・ボタン強度による視覚的優先順位付け。',
        isStatic: true,
        requirements: [
          'おすすめ列以外にも違いが一瞬で分かる短い説明文を添える',
          '金額には font-variant-numeric: tabular-nums を指定して縦並びでも揃えやすくする'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<section class="pricing-grid" aria-label="料金プラン">
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
</style>`
  },
  {
    id: 'conv-billing-toggle',
    category: 'pricing',
    title: '月額 ⇄ 年額（割引）の切り替えスイッチ＆価格表示',
    subtitle: 'サブスク登録ページでおなじみの切り替えボタン。「年額なら20%お得」と一目で納得して選べます',
    mechanismTag: 'ピル型スイッチ + 連動価格テキスト（tabular-nums）',
    xRayCaption: '上のトグル状態（月額／年額）が下の金額カードとお得額メッセージを同時に差し替えています',
    interactiveHint: '「再生」または「月額払い / 年額払い」ボタンを直接クリックして比較できます',
    defaultDuration: 0.4,
    durationRange: { min: 0.15, max: 1.4, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 月額と年額を同じピル枠に並べる',
        detail: '年額側に「20%お得」と一言添えておくと、切り替えたくなるモチベーションが生まれます。',
        codeHint: 'aria-pressed="true" + 角丸トレイ'
      },
      {
        title: '② 金額と「年額での合計節約額」を同時に書き換える',
        detail: '月換算の数字だけでなく「年間2,400円お得」のように具体額を見せると親切です。',
        codeHint: 'tabular-nums で数字幅を固定'
      },
      {
        title: '③ 年額を選んだ時だけ枠をほんのり緑・青へ変化',
        detail: '「お得に切り替わった」という手応えを優しい背景色・枠色の変化で伝えます。',
        codeHint: 'transition: border-color, background-color'
      }
    ],
    keywords: ['月額', '年額', 'スイッチ', 'トグル', 'サブスク', '料金', '割引'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '月額・年額切り替えスイッチ＆料金連動',
        goal: 'ピル型の「月額払い／年額払い（お得）」トグルを切り替えると、プラン価格とお得額メッセージが滑らかに連動更新されるUIを作る。',
        mechanism: 'トグルボタン群（aria-pressed）と連動した状態分岐で価格文字・割引注記・強調ボーダー色を切り替え。',
        requirements: [
          '金額が切り替わってもレイアウトがガタつかないよう tabular-nums と固定行高を設定する',
          '初期表示では比較しやすい基準を明示し、キーボードでも操作可能にする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div class="billing-box">
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
  transition: background-color ${params.duration.toFixed(2)}s ease, box-shadow ${params.duration.toFixed(2)}s ease, color ${params.duration.toFixed(2)}s ease;
}
.bill-btn.is-active { background: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
.plan-price { font-size: 32px; font-weight: 800; font-variant-numeric: tabular-nums; transition: opacity ${params.duration.toFixed(2)}s ease; }
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
</script>`
  },
  {
    id: 'conv-submit-feedback',
    category: 'forms',
    title: '送信中 → 緑の✓完了へ姿を変えるボタン',
    subtitle: '登録・保存ボタンを押したあと「いま送ってるよ」「無事に終わったよ✓」を同じボタンの上で迷わず伝える安心UI',
    mechanismTag: '3状態遷移（idle → loading＋無効化 → success）',
    xRayCaption: 'loading 中はボタンを disabled にして連打による二重送信を防ぎつつ、完了後に緑色へ変化させます',
    interactiveHint: '「再生」または「申し込む」ボタンそのものをクリックして一連の流れを見られます',
    defaultDuration: 0.9,
    durationRange: { min: 0.4, max: 2.5, step: 0.1 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 送信ボタンの幅を min-width で少し固定する',
        detail: '文言が「送信」→「送信中...」→「完了」に変わってもボタンの横幅がガクッと縮まないようにします。',
        codeHint: 'min-width: 200px'
      },
      {
        title: '② 送信中は回転アイコン＋ disabled で二重押し防止',
        detail: '処理中を視覚的に伝えながら、2回続けて送信されてしまうトラブルを同時に防ぎます。',
        codeHint: 'button.disabled = true'
      },
      {
        title: '③ 成功したら緑（emerald）＋ チェック✓ へ変える',
        detail: '文字だけでなく色とアイコンを同時に切り替えると、一目で「無事に終わった」と安心できます。',
        codeHint: 'background: #059669'
      }
    ],
    keywords: ['ボタン', 'フォーム', '送信', '完了', 'チェック', 'ローディング', 'フィードバック', '二重送信防止'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '状態遷移フィードバック付き送信ボタン',
        goal: 'クリック後「送信しています...（無効化＋スピナー）」→「保存・送信が完了しました ✓（緑背景）」へ滑らかに変化する安心感の高いボタンを作る。',
        mechanism: 'idle / loading / success の3状態ステート管理と、min-width 固定・disabled 二重送信防御の組み合わせ。',
        requirements: [
          'loading 中は必ず disabled にして二重クリックを防ぐ',
          '状態変化によるボタン幅のガタつきを抑えるため min-width を指定する'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<button type="button" id="submitDemo" class="state-btn">申し込む（送信ボタン）</button>

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
    }, ${Math.round(params.duration * 1000)});
  });
})();
</script>`
  },
  {
    id: 'conv-floating-label',
    category: 'forms',
    title: '入力すると見出し文字が枠の上へ逃げるフォーム（フローティングラベル）',
    subtitle: '最初は入力欄の中に書いてある案内文字が、入力した瞬間に上へ小さく移動し「何を入力中か」を忘れさせない仕組み',
    mechanismTag: '入力枠内の余白上寄せ + top / font-size トランジション',
    xRayCaption: 'label を入力欄の上端へ重ねておき、フォーカス時または文字が入ったら top を上へ・文字を青く小さく変えます',
    interactiveHint: '「再生」または入力枠をクリックして実際に文字を打って試せます',
    defaultDuration: 0.3,
    durationRange: { min: 0.15, max: 1.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 入力枠の内側上部にラベル移動用の余白を確保',
        detail: '上に移動したあとの文字と入力文字が重ならないよう、padding-top を少し広めに取っておきます。',
        codeHint: 'padding: 20px 12px 8px'
      },
      {
        title: '② CSS の :focus と :not(:placeholder-shown) を組み合わせる',
        detail: 'フォーカスしている間と、すでに文字が入っている間は上へ留まり続けます。',
        codeHint: '.field input:focus + label, .field input:not(:placeholder-shown) + label'
      },
      {
        title: '③ pointer-events: none でラベルがクリックを邪魔しないように',
        detail: '文字の上をクリックしても確実に入力欄にカーソルが入るよう必須の気配りです。',
        codeHint: 'pointer-events: none'
      }
    ],
    keywords: ['フォーム', '入力', 'フローティングラベル', 'メールアドレス', 'お問い合わせ', '登録'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'フローティングラベル付き入力欄',
        goal: '入力前はプレースホルダー位置にあるラベルが、フォーカスまたは入力と同時に左上の小さな青い見出し位置へ滑らかに移動するフォームを作る。',
        mechanism: 'CSS の :focus / :not(:placeholder-shown)（あるいはReactの状態判定）による label の top / font-size / color 切り替え。',
        requirements: [
          '移動先の上部位置と入力テキストが重ならないよう padding-top を確保する',
          'ラベルには pointer-events: none（または htmlFor 紐づけ）を付けて入力しづらくしない'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div class="float-field">
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
  transition: all ${params.duration.toFixed(2)}s ease;
}
.float-field input:focus { border-color: #2563eb; }
.float-field input:focus + label,
.float-field input:not(:placeholder-shown) + label {
  top: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #2563eb;
}
</style>`
  },
  {
    id: 'conv-read-more',
    category: 'forms',
    title: '下端ぼかし付き・高さが伸びる「続きを読む」折りたたみ',
    subtitle: '長い説明文をいきなり全部見せて圧迫せず、下を白くぼかして「気になった人だけ開ける」親切な省略テクニック',
    mechanismTag: 'max-height 制限 + 下端白グラデーション（pointer-events: none）',
    xRayCaption: 'テキストの底に重ねた白いグラデーション幕を開いた瞬間に opacity: 0 で消しています',
    interactiveHint: '「再生」または下の「続きを読む」ボタンをクリックして開閉できます',
    defaultDuration: 0.45,
    durationRange: { min: 0.2, max: 1.4, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 外枠に overflow: hidden と初期の高さ制限を掛ける',
        detail: '最初の 2〜3 行だけを見せる高さ（max-height: 72px など）で一旦止めます。',
        codeHint: 'max-height: 72px; overflow: hidden'
      },
      {
        title: '② 下端に「透明 → 白」のグラデーション膜を被せる',
        detail: '文章の終わりをスッとフェードアウトさせることで「まだ下に続きがある」と自然に伝わります。',
        codeHint: 'linear-gradient(to top, #fff 15%, transparent)'
      },
      {
        title: '③ ボタンクリックで展開し、膜を消す',
        detail: '開くと同時に文字表示を全開にし、ボタンラベルも「折りたたむ」に切り替えます。',
        codeHint: 'aria-expanded="true"'
      }
    ],
    keywords: ['続きを読む', '折りたたみ', 'グラデーション', 'ぼかし', '長文', '省略', 'アコーディオン'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'グラデーションぼかし付き「続きを読む」折りたたみ',
        goal: '長い説明やレビューの初期表示高さを抑えて下端を白いグラデーションでぼかし、「続きを読む」クリックで滑らかに全文展開できるようにする。',
        mechanism: 'max-height と overflow: hidden、下端の linear-gradient オーバーレイを is-expanded クラスで同時制御。',
        requirements: [
          '開閉ボタンには aria-expanded を付けて状態を明示する',
          '展開後はグラデーション幕を完全に透明（opacity: 0）かつ pointer-events: none にする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div class="read-box" id="readBox">
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
  transition: max-height ${params.duration.toFixed(2)}s ease;
}
.read-box.is-open { max-height: 240px; }
.read-fade {
  position: absolute;
  inset: auto 0 0 0;
  height: 36px;
  background: linear-gradient(to top, #ffffff 15%, transparent);
  pointer-events: none;
  transition: opacity ${params.duration.toFixed(2)}s ease;
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
</script>`
  },
  {
    id: 'conv-back-to-top',
    category: 'guides',
    title: 'スクロールすると右下にそっと現れる「↑ TOPへ戻る」ボタン',
    subtitle: '一番上を見ている時は姿を隠しておき、ある程度下に読み進めた時だけ右下に重なって現れる気が利く案内部品',
    mechanismTag: '固定配置（right/bottom）+ スクロール量しきい値判定',
    xRayCaption: '最初から出さずに「scrollTop > しきい値」の条件を超えた瞬間だけ不透明＆せり上がりで出現させます',
    interactiveHint: '「再生」または枠内を下へスクロールし、出た右下ボタンをクリックして上へ戻れます',
    defaultDuration: 0.7,
    durationRange: { min: 0.25, max: 1.8, step: 0.05 },
    defaultEasing: 'spring',
    hasEasingControl: true,
    steps: [
      {
        title: '① 画面右下に position: fixed で重ねて待機させる',
        detail: '普段は opacity: 0 と少し下に下げた状態（translateY(16px)）にして透明化しておきます。',
        codeHint: 'position: fixed; right: 20px; bottom: 20px'
      },
      {
        title: '② スクロール量がしきい値を超えたらクラスを付ける',
        detail: '1画面ぶんほど下に読んだ頃（例：300px）からスッと浮き上がらせると邪魔になりません。',
        codeHint: 'btn.classList.toggle("is-visible", window.scrollY > 300)'
      },
      {
        title: '③ クリックしたら滑らかに 0px へ戻す',
        detail: '一瞬でワープするより smooth スクロールで戻すと、位置感覚を失わずに済みます。',
        codeHint: 'window.scrollTo({ top: 0, behavior: "smooth" })'
      }
    ],
    keywords: ['TOPへ戻る', 'フローティング', '右下', 'ボタン', '重なり', 'スクロール'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'しきい値出現「↑ TOPへ戻る」フローティングボタン',
        goal: 'ページ最上部では隠れていて、一定量スクロールした時だけ右下にそっと浮き上がり、クリックで最上部へ滑らかに戻すボタンを作る。',
        mechanism: 'position: fixed 右下固定 ＋ scroll 監視によるしきい値判定 ＋ opacity / translateY トランジション。',
        requirements: [
          '非表示状態では pointer-events: none にして意図しないタップを防ぐ',
          'prefers-reduced-motion 有効時は scrollTo の behavior を auto に切り替える'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<button type="button" id="backToTop" class="btt-btn" aria-label="一番上へ戻る">↑ TOP</button>

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
  transition: opacity 0.25s ease, transform 0.25s ${ease};
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
</script>`;
    }
  }
];
