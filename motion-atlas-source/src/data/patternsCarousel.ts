import type { MotionPattern } from '../types/motion';
import { EASING_OPTIONS, buildStructuredPrompt } from '../utils/motionHelpers';

export const CAROUSEL_PATTERNS: MotionPattern[] = [
  {
    id: 'carousel-scroll-snap',
    category: 'carousel',
    title: 'ピタッと吸い付く横スクロール列（Scroll Snap＋矢印）',
    subtitle: '指やトラックパッドで横に流してもカードが途中で途切れず、1枚ずつ綺麗にピタッと止まる現代の基本カルーセル',
    mechanismTag: 'scroll-snap-type: x mandatory + 左右送るボタン',
    xRayCaption: '親に scroll-snap-type: x mandatory、子カードに scroll-snap-align: start を書くだけで JavaScript 計算なしに吸い付きます',
    interactiveHint: '「再生」・左右矢印ボタン・カード列の直接横スクロールすべて試せます',
    defaultDuration: 0.65,
    durationRange: { min: 0.25, max: 1.8, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 外枠に横スクロール＋スナップ宣言を書く',
        detail: 'overflow-x: auto に scroll-snap-type: x mandatory を付けると、指を離したときに最寄りのカードへ自動吸着します。',
        codeHint: 'scroll-snap-type: x mandatory; scroll-behavior: smooth'
      },
      {
        title: '② 子カード側に shrink-0 と吸着基準点を付ける',
        detail: '縮小しないよう flex-shrink: 0 にした上で、scroll-snap-align: start を指定します。',
        codeHint: 'flex: 0 0 220px; scroll-snap-align: start'
      },
      {
        title: '③ PCユーザー向けに「‹」「›」ボタンも用意する',
        detail: 'マウス中心の人向けに、クリックでカード幅ぶん scrollBy するボタンを添えると親切です。',
        codeHint: 'track.scrollBy({ left: 236, behavior: "smooth" })'
      }
    ],
    keywords: ['カルーセル', '横スクロール', 'スライダー', 'スナップ', 'scroll-snap', 'サムネイル', '指', 'スワイプ'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'ピタッと吸い付く横スクロール列（CSS Scroll Snap）',
        goal: 'カードやサムネイルが横一列に並び、指スワイプ・マウスホイール・左右矢印のどれで送っても 1 枚の区切りでピタッと止まるカルーセルを作る。',
        mechanism: 'CSS Scroll Snap（scroll-snap-type: x mandatory / scroll-snap-align: start）と、左右ボタンの smooth scrollBy を併用。',
        requirements: [
          'スマホのタッチスワイプと PC マウスの左右矢印ボタンの両方が気持ちよく動くようにする',
          '横スクロールバー自体は視覚ノイズにならないよう隠すか細く整える'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div class="snap-wrap" role="region" aria-roledescription="carousel">
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
  transition: transform ${params.duration.toFixed(2)}s ease, border-color ${params.duration.toFixed(2)}s ease;
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
</script>`
  },
  {
    id: 'carousel-peek-slider',
    category: 'carousel',
    title: '右端に次のカードがチラ見えするスライダー（Peek型）',
    subtitle: 'あえて 1 枚で枠いっぱいにせず右横に次のカードの一部を見せて、「まだ続きがある」と自然に伝える構成',
    mechanismTag: 'カード幅 72% + translateX(idx * 送り幅%)',
    xRayCaption: '主役カード幅を 100% 未満にすることで、「右端の切れ端＝次に進める合図」として機能させています',
    interactiveHint: '「再生」・下の丸ドット・矢印・右に覗いたカードクリックで切り替えできます',
    defaultDuration: 0.55,
    durationRange: { min: 0.2, max: 1.6, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① 外枠を overflow: hidden にして内側トラックを横長にする',
        detail: '見えている枠の外に次のカード群を待機させ、位置だけを横移動させます。',
        codeHint: 'overflow: hidden'
      },
      {
        title: '② 主役カードの横幅を 70〜80% にして右端に余白を作る',
        detail: 'ピッタリ100%にすると1枚しかないように見えますが、次の端が見えるとスクロール誘導になります。',
        codeHint: 'flex: 0 0 72%'
      },
      {
        title: '③ 現在番号 × 移動量 でトラック全体を滑らせる',
        detail: '選択中の丸ドットと前後ボタンも同期させると、今何枚目かも直感で分かります。',
        codeHint: 'transform: translateX(-calc(idx * 74%))'
      }
    ],
    keywords: ['カルーセル', 'スライダー', 'チラ見え', 'Peek', 'ドット', '切り替え', '横流れ'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '右端に次のカードがチラ見えするスライダー（Peek型）',
        goal: '現在メインのカードを左側 72% 幅で見せつつ右端に次のカードを少し覗かせ、ボタンやドット操作で滑らかに左へ送れるスライダーにする。',
        mechanism: 'flex 項目幅を 72% に抑えて overflow: hidden 内のトラックを translateX で段階移動。',
        requirements: [
          '現在の枚数が分かるページネーションドットと前後ボタンを併設する',
          '右端に覗いている次のカード自体をクリックしても次へ進めるようにすると自然です'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="peek-viewport">
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
  transition: transform ${params.duration.toFixed(2)}s ${ease};
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
</script>`;
    }
  },
  {
    id: 'carousel-thumb-sync',
    category: 'carousel',
    title: '下のサムネをクリックすると上が変わる連動ギャラリー',
    subtitle: 'ショッピングサイトや作品紹介の定番。下に並んだ小さな四角サムネイルを選ぶと上の主役ビジュアルが切り替わります',
    mechanismTag: '共通インデックス連動（メイン枠 ⇄ 下部サムネイル群）',
    xRayCaption: '上の大枠と下の四角ボタン列が同じ番号（activeIndex）を見ており、選んだサムネイルにだけ強調枠を付けています',
    interactiveHint: '「再生」または下の四角サムネイルをどれでも直接クリックして切り替えられます',
    defaultDuration: 0.65,
    durationRange: { min: 0.2, max: 1.8, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 上に大きめのメイン枠、下に均等グリッドのサムネイルを置く',
        detail: 'grid-template-columns: repeat(4, 1fr) などで四角いサムネイルを行儀よく並べます。',
        codeHint: 'grid-template-columns: repeat(4, 1fr)'
      },
      {
        title: '② サムネイルクリックで現在選択中のデータを差し替える',
        detail: '押したサムネイルのインデックスを使ってメイン表示の画像・見出し・説明文を同期更新します。',
        codeHint: 'aria-pressed="true" + 強調枠'
      },
      {
        title: '③ 選択中のサムネイルは色枠＋わずかな拡大で迷わせない',
        detail: '今どのサムネイルを見ているのか一目で分かるよう border と scale で印を残します。',
        codeHint: 'border-color: #2563eb; transform: scale(1.03)'
      }
    ],
    keywords: ['サムネイル', 'ギャラリー', 'EC', '商品写真', '切り替え', 'クリック', '連動'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'サムネイル選択・連動ギャラリー',
        goal: '上部にメイン表示、下部に複数の小さな四角サムネイルを並べ、クリック／タップしたサムネイルに応じてメイン表示を即時切り替えする。',
        mechanism: '共有する activeIndex 状態によってメイン側の内容を更新し、選択中サムネイルボタンへ aria-pressed="true" と強調枠を付与。',
        requirements: [
          'サムネイルにはキーボードでも移動しやすいよう <button type="button"> と代替テキストを設定する',
          '現在選択中のサムネイルは青枠などで明確にハイライトする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<div class="gallery-wrap">
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
  transition: opacity ${params.duration.toFixed(2)}s ease;
}
.thumb-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.thumb {
  padding: 10px 6px;
  border-radius: 10px;
  border: 1px solid #e4e4e7;
  background: #fafafa;
  cursor: pointer;
  transition: transform ${params.duration.toFixed(2)}s ease, border-color ${params.duration.toFixed(2)}s ease, background-color ${params.duration.toFixed(2)}s ease;
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
</script>`
  },
  {
    id: 'carousel-lightbox',
    category: 'carousel',
    title: 'サムネクリックで暗転＋中央に拡大表示（ライトボックス）',
    subtitle: '一覧の小さい枠をクリックすると背景が暗くなり、画面中央に大きく浮き出て前後の画像も送れる仕組み',
    mechanismTag: '暗転バックドロップ + scale(0.86→1) 拡大モーダル',
    xRayCaption: '通常の一覧（下層）はその場から動かさず、クリック時だけ上層（z-index: 20）に拡大モーダルを開いています',
    interactiveHint: '「再生」または並んだ 3 つのサムネイルどれでもクリック（ESC で閉じます）',
    defaultDuration: 0.45,
    durationRange: { min: 0.2, max: 1.5, step: 0.05 },
    defaultEasing: 'spring',
    hasEasingControl: true,
    steps: [
      {
        title: '① 一覧のサムネイルを軽量なボタンとして並べる',
        detail: 'クリックした項目の番号（0, 1, 2...）だけを保存する仕組みにします。',
        codeHint: 'openLightbox(index)'
      },
      {
        title: '② クリックされたら半透明の黒幕と拡大カードを同時表示',
        detail: '背景を暗く落とすことで周囲の雑多な情報を消し、主役の拡大プレビューだけに視線を集めます。',
        codeHint: 'background: rgba(9, 9, 11, 0.6)'
      },
      {
        title: '③ 背景クリック・✕ボタン・Escapeキーの3通りで閉じられるように',
        detail: '「どれで閉じようとしても閉じられる」設計にしておくと、ストレスが全くありません。',
        codeHint: 'if (e.key === "Escape") dialog.close()'
      }
    ],
    keywords: ['ライトボックス', '拡大', 'モーダル', 'サムネイル', 'ギャラリー', 'dialog', '暗転'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'ライトボックス拡大ギャラリー',
        goal: '一覧の小さなサムネイルをクリックすると背景が暗転して画面中央に大きく浮き出て、左右ボタンで連続閲覧・Escapeキーや枠外クリックで閉じられるようにする。',
        mechanism: '<dialog>（または全画面固定オーバーレイ）＋ opacity/scale トランジション＋左右矢印とキーボード操作対応。',
        requirements: [
          'Escape キー・背景クリック・右上の閉じるボタンのいずれでも安全に閉じられるようにする',
          '拡大中も画面上で前後の要素へ送れるボタンを配置する'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="lb-grid">
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
  animation: zoomIn ${params.duration.toFixed(2)}s ${ease} both;
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
</script>`;
    }
  },
  {
    id: 'carousel-stack-deck',
    category: 'carousel',
    title: 'トランプのように後ろからせり上がる重ねカード・デッキ',
    subtitle: '複数のカードを奥行き方向へ重ねて置き、クリックするたびに後ろのカードがスッと手前に繰り上がる独創UI',
    mechanismTag: '順番計算（pos）による scale / translateY / z-index 循環',
    xRayCaption: '各カードが自分の奥行き順番（pos = 0, 1, 2）を計算し、数字が小さいほど大きく上へ出ます',
    interactiveHint: '「再生」または重ねられたカードをクリックすると次々めくれます',
    defaultDuration: 0.5,
    durationRange: { min: 0.2, max: 1.5, step: 0.05 },
    defaultEasing: 'spring',
    hasEasingControl: true,
    steps: [
      {
        title: '① カードを同じ位置に absolute 重ねする',
        detail: '横並べせず、親枠の上端に重ねて省スペースに複数枚を待機させます。',
        codeHint: 'position: absolute; inset: 0 auto auto 0; width: 100%'
      },
      {
        title: '② 今先頭から何番目か（pos）を割り出す',
        detail: '(番号 - 先頭番号 + 総数) % 総数 で、今何段目かをループ計算します。',
        codeHint: 'pos = (i - active + len) % len'
      },
      {
        title: '③ pos に応じて縮小率・下ズレ・重なり順を割り当てる',
        detail: '0番目＝等倍・最前面、1番目＝少し小さく少し下…にすると立体トランプのように見えます。',
        codeHint: 'translateY(pos * 10px) scale(1 - pos * 0.06)'
      }
    ],
    keywords: ['重ねカード', 'スタック', 'トランプ', 'デッキ', 'めくる', '独創的', '省スペース'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'トランプ式 重ねカード・デッキ',
        goal: '重なったカードを1枚クリック（または送りボタン）するたびに、後ろのカードが手前にせり上がって循環するインタラクティブスタックを作る。',
        mechanism: '全カードを同位置へ重ね、(index - topIndex + total) % total から z-index・translateY・scale を動的計算。',
        requirements: [
          '最前面だけでなく後ろのカードの上端・色が少し覗くように translateY を段階付けする',
          'クリック操作しやすいようカード全体または明快な送りボタンを <button> にする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="deck" id="cardDeck">
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
  transition: transform ${params.duration.toFixed(2)}s ${ease}, opacity ${params.duration.toFixed(2)}s ease;
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
</script>`;
    }
  }
];
