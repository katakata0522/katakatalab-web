import type { MotionPattern } from '../types/motion';
import { EASING_OPTIONS, buildStructuredPrompt } from '../utils/motionHelpers';

export const NAV_TABS_SEARCH_PATTERNS: MotionPattern[] = [
  // =========================================================================
  // 03. ハンバーガー・メニューの開き方 (nav)
  // =========================================================================
  {
    id: 'nav-slide-drawer',
    category: 'nav',
    title: '横スライドドロワー（三本線 → ✕ 変形）',
    subtitle: '右または左の画面端からメニュー板が滑り出し、後ろを薄暗く覆う標準的な開き方',
    mechanismTag: 'translateX(100%→0) + 暗幕',
    xRayCaption: '閉じている間は画面外（+100%）に待機させ、開閉クラスだけで滑らせています',
    interactiveHint: '右上の「再生」または枠内のハンバーガーアイコンを直接クリックできます',
    defaultDuration: 0.5,
    durationRange: { min: 0.15, max: 2.0, step: 0.05 },
    secondarySlider: {
      label: 'ドロワー幅',
      unit: '%',
      min: 45,
      max: 85,
      step: 5,
      defaultValue: 65
    },
    defaultEasing: 'snappy',
    hasEasingControl: true,
    steps: [
      {
        title: '① メニュー板を画面の外側へ逃がしておく',
        detail: '普段は右端の外側（100%分右）に隠してあり、レイアウトの邪魔を一切しません。',
        codeHint: 'transform: translateX(100%)'
      },
      {
        title: '② 三本線を中央で交差させて「✕」に変える',
        detail: '上の線と下の線を中央に寄せつつ ±45度回転させ、真ん中の線だけを透明にします。',
        codeHint: 'rotate(45deg) / opacity: 0'
      },
      {
        title: '③ 背景の半透明幕を敷いて誤操作を防ぐ',
        detail: 'メイン画面の上に薄い暗幕（バックドロップ）を重ね、暗幕クリックでも閉じられるようにします。',
        codeHint: 'aria-expanded / Escで閉じる'
      }
    ],
    keywords: ['ハンバーガー', 'ドロワー', 'メニュー', 'スライド', 'ナビ'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '横スライドドロワー（三本線 → ✕ 変形）',
        goal: 'ハンバーガーボタンをクリックするとボタンが滑らかに「✕」へ変形し、画面端から幅 ' + params.distance + '% のスライドメニューが出るようにしたいです。',
        mechanism:
          'メニューパネルを普段は transform: translateX(100%) で画面外に配置し、is-open 状態になったら translateX(0) に遷移させ、背後に半透明の暗幕（クリックで閉じる）を表示します。',
        requirements: [
          'ハンバーガーボタンには aria-expanded と aria-controls を付けてアクセシビリティを保ってください',
          'Escキーまたは背景の暗幕クリックでも確実に閉じられるようにしてください'
        ],
        params,
        secondaryLabel: 'ドロワー幅',
        secondaryUnit: '%',
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div id="drawerRoot">
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
  transition: opacity ${params.duration.toFixed(2)}s ease;
}

.drawer-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: min(320px, ${params.distance}vw);
  height: 100vh;
  background: #ffffff;
  padding: 24px;
  display: grid;
  align-content: start;
  gap: 12px;
  transform: translate3d(100%, 0, 0);
  transition: transform ${params.duration.toFixed(2)}s ${ease};
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
</script>`;
    }
  },
  {
    id: 'nav-fullscreen-curtain',
    category: 'nav',
    title: '全画面幕引きメニュー（サークル拡張）',
    subtitle: 'ボタンの位置から円形に画面全体へ幕が広がり、大きな文字メニューを見せる演出',
    mechanismTag: 'clip-path: circle(0% → 150%)',
    xRayCaption: 'ボタンの位置（右上）を中心に、円の切り抜き半径を 0% から 150% まで広げています',
    interactiveHint: '「再生」または右上のメニューボタンをクリックして開閉できます',
    defaultDuration: 0.75,
    durationRange: { min: 0.25, max: 2.2, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① メニュー画面を最初から全面に重ねて置く',
        detail: '画面全体を覆うメニュー層を用意し、普段はクリックできないように透かしておきます。',
        codeHint: 'position: fixed; inset: 0'
      },
      {
        title: '② ボタンの場所を中心点にした円形マスクで隠す',
        detail: '半径 0% の丸い穴（起点は右上ボタン位置）でメニュー層を完全に隠した状態を作ります。',
        codeHint: 'clip-path: circle(0% at 92% 14%)'
      },
      {
        title: '③ 開いた瞬間に半径を150%まで拡大する',
        detail: '円を画面対角線より大きい 150% に広げると、ボタンからインクが広がるように全画面メニューが現れます。',
        codeHint: 'clip-path: circle(150% at 92% 14%)'
      }
    ],
    keywords: ['全画面', 'オーバーレイ', 'ハンバーガー', '円形', 'クリップパス', 'ブランド'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '全画面幕引きメニュー（サークル拡張）',
        goal: 'ハンバーガーボタンを押した位置から波紋・円形のように画面全体へメニュー幕が広がる演出にしたいです。',
        mechanism:
          '全画面固定のオーバーレイ層に対して、閉じている時は clip-path: circle(0% at 右上ボタン座標)、開く時は clip-path: circle(150% at 右上ボタン座標) へ変化させます。',
        requirements: [
          '閉じている時は誤クリックを防ぐため pointer-events: none と visibility: hidden を切り替えてください',
          '開いた後は中のメニュー項目を少し時間差でフェードインさせるとさらに上質に見えます'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<button id="curtainBtn" type="button" aria-expanded="false" aria-controls="fullMenu">メニューを開く</button>
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
  transition: clip-path ${params.duration.toFixed(2)}s ${ease}, visibility ${params.duration.toFixed(2)}s;
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
</script>`;
    }
  },
  {
    id: 'nav-top-accordion',
    category: 'nav',
    title: '上端押し下げアコーディオン展開',
    subtitle: 'ヘッダーのすぐ下からパカッと下に開く、迷いにくい折りたたみナビゲーション',
    mechanismTag: 'grid-template-rows: 0fr → 1fr',
    xRayCaption: 'height: auto の代わりに grid の行比率（0fr→1fr）を使い、中身の高さに合わせて滑らかに開きます',
    interactiveHint: '「再生」またはミニヘッダー内の「MENU」ボタンをクリックできます',
    defaultDuration: 0.5,
    durationRange: { min: 0.15, max: 2.0, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: true,
    steps: [
      {
        title: '① CSSの「高さauto」はアニメーションできない問題',
        detail: '中身が何行あるか決まっていないメニューは、普通の height: auto だとアニメーションが効きません。',
        codeHint: 'height: auto はアニメ不可'
      },
      {
        title: '② Grid の 0fr → 1fr テクニックを使う',
        detail: '親を display: grid にし、行の高さ比率を 0fr（高さゼロ）から 1fr（中身ぴったり）へ変えると滑らかに動きます。',
        codeHint: 'grid-template-rows: 0fr → 1fr'
      },
      {
        title: '③ 内側の箱だけ overflow: hidden にする',
        detail: '子要素に min-height: 0; overflow: hidden を指定するだけで、JS計測なしに完全自動の高さ展開が実現します。',
        codeHint: 'min-height: 0'
      }
    ],
    keywords: ['アコーディオン', 'ドロップダウン', 'ヘッダー', 'ハンバーガー', '展開'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '上端押し下げアコーディオン展開',
        goal: 'ヘッダーのメニューボタンを押すと、ヘッダー直下から自然な高さでスッと下に開くアコーディオン型メニューにしたいです。',
        mechanism:
          'JSで高さを計算する代わりに CSS Grid の grid-template-rows: 0fr（閉）から 1fr（開）への transition を利用し、内側の要素に min-height: 0; overflow: hidden を設定します。',
        requirements: [
          'メニューの項目数が変わっても壊れないよう固定 px 高さは使わず 0fr / 1fr 方式で実装してください',
          '開閉ボタンに aria-expanded と aria-controls を連動させ、閉じている間は aria-hidden="true" や inert で誤フォーカスを防いでください'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<button id="dropBtn" type="button" aria-expanded="false" aria-controls="dropMenu">メニュー ▼</button>
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
  transition: grid-template-rows ${params.duration.toFixed(2)}s ${ease};
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
</script>`;
    }
  },
  {
    id: 'nav-bottom-sheet',
    category: 'nav',
    title: 'ボトムシートせり上がり（スマホ親指向け）',
    subtitle: '画面の一番下からカードが持ち上がり、指が届きやすい位置にメニューを出す設計',
    mechanismTag: '下端配置 + translateY(100%→0)',
    xRayCaption: '上部に「引っ張りつまみ」を置き、親指ゾーンの下端から上へスライドさせています',
    interactiveHint: '「再生」またはミニスマホ下部のメニューボタンを押せます',
    defaultDuration: 0.55,
    durationRange: { min: 0.2, max: 2.0, step: 0.05 },
    defaultEasing: 'spring',
    hasEasingControl: true,
    steps: [
      {
        title: '① スマホで届きやすい画面下端に配置する',
        detail: '片手持ちの親指は画面上部に届きにくいため、モバイルでは下端からメニューを出すと使いやすくなります。',
        codeHint: 'bottom: 0; border-radius: 20px 20px 0 0'
      },
      {
        title: '② 上端に小さなハンドル（棒）を添える',
        detail: '「上から下に引き下げられそう」という視覚的ヒント（アフォーダンス）を小さなグレーの棒で伝えます。',
        codeHint: 'w-10 h-1 rounded-full'
      },
      {
        title: '③ 下の画面外からバネ感で持ち上げる',
        detail: '少しだけ弾むカーブで translateY(100% → 0) に動かすと、アプリのような心地よい手触りになります。',
        codeHint: 'translateY(100% → 0)'
      }
    ],
    keywords: ['ボトムシート', 'スマホ', 'モバイル', 'メニュー', '下から', 'ハンバーガー'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'ボトムシートせり上がり（スマホ親指向け）',
        goal: 'スマホ表示のメニューボタンを押したとき、画面下端から上角丸のボトムシートが気持ちよくせり上がる設計にしたいです。',
        mechanism:
          'bottom: 0 に固定した角丸シートを普段は translateY(100%) で下に隠し、開くと暗幕とともに translateY(0) へ移動させます。',
        requirements: [
          'シート上端の中央に小さな横棒ハンドルを配置し、モバイルアプリらしい見た目にしてください',
          '最大高さを max-height: 80dvh 程度に抑え、背後が少し見える状態にしてください'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<button id="sheetOpenBtn" type="button">詳細メニューを開く</button>
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
  transition: transform ${params.duration.toFixed(2)}s ${ease};
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
</script>`;
    }
  },

  // =========================================================================
  // 04. タブ・切り替え (tabs)
  // =========================================================================
  {
    id: 'tabs-sliding-underline',
    category: 'tabs',
    title: '下線スライド移動タブ',
    subtitle: '選んだタブの真下へ、1本のアンダーラインが滑るように追いかけてくる定番UI',
    mechanismTag: '1本の線 + left / width 追従',
    xRayCaption: '各タブに線を1本ずつ置くのではなく、共通の「1本の線」の位置と幅を移動させています',
    interactiveHint: '「再生」またはタブ（概要／仕組み／事例）を直接クリックできます',
    defaultDuration: 0.45,
    durationRange: { min: 0.15, max: 1.8, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: true,
    steps: [
      {
        title: '① タブごとに線を付けないのが秘密',
        detail: '各ボタンに個別の border-bottom を付けるとパッと点滅するだけで滑って見えません。',
        codeHint: '共有インジケーター要素は1つ'
      },
      {
        title: '② 選択されたボタンの位置と横幅を測る',
        detail: '押されたタブの左端からの距離（offsetLeft）と横幅（offsetWidth）を取得します。',
        codeHint: 'offsetLeft / offsetWidth'
      },
      {
        title: '③ 共通の1本線をその位置・幅へ滑らせる',
        detail: '線を translateX と width で目標の位置へアニメーションさせると、生き物のように線が移動します。',
        codeHint: 'transform: translateX(...) '
      }
    ],
    keywords: ['タブ', '下線', 'スライド', 'インジケーター', '切り替え'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '下線スライド移動タブ',
        goal: 'タブを切り替えたとき、選択中の下線がパッと消え替わるのではなく、横方向にスッと滑って移動するようにしたいです。',
        mechanism:
          'タブ一覧の親要素内に1つだけインジケーター用の下線要素（position: absolute; bottom: 0）を置き、選択されたタブの offsetLeft と offsetWidth に合わせて translateX と width を transition させます。',
        requirements: [
          'ウィンドウ幅が変わっても位置がズレないよう resize 時にも座標を再計算してください',
          'role="tablist" / role="tab" / aria-selected を正しく付与してください'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="tab-bar" role="tablist">
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
  transition: transform ${params.duration.toFixed(2)}s ${ease}, width ${params.duration.toFixed(2)}s ${ease};
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
</script>`;
    }
  },
  {
    id: 'tabs-floating-pill',
    category: 'tabs',
    title: 'ピル背景スルッと移動（セグメント切替）',
    subtitle: '白いカプセル型の座布団がタブの裏を滑走する、iOSやモダンWebで人気のUI',
    mechanismTag: '背面カプセル移動 + z-index層分け',
    xRayCaption: '薄いグレーのトレイ内で、白い角丸座布団（z:1）が文字（z:2）の後ろを滑っています',
    interactiveHint: '「再生」またはピル内の選択肢をクリックして切り替えできます',
    defaultDuration: 0.45,
    durationRange: { min: 0.15, max: 1.8, step: 0.05 },
    defaultEasing: 'spring',
    hasEasingControl: true,
    steps: [
      {
        title: '① 灰色の角丸トレイを敷く',
        detail: '選択肢全体を包む、少しだけ凹んだような薄いグレーの背景トレイを用意します。',
        codeHint: 'background: #f4f4f5; border-radius: 999px'
      },
      {
        title: '② 文字の後ろに白い「座布団」を1枚置く',
        detail: 'ボタンの文字（z-index: 2）の裏側（z-index: 1）に、角丸で白い影つきの座布団要素を置きます。',
        codeHint: 'z-index: 1 (座布団) < 2 (文字)'
      },
      {
        title: '③ 選んだ項目へ座布団を移動させる',
        detail: '均等幅なら translateX(インデックス × 100%) だけで位置計算不要の超クリーン実装ができます。',
        codeHint: 'translateX(calc(idx * 100%))'
      }
    ],
    keywords: ['タブ', 'ピル', 'セグメント', '切り替え', 'カプセル', 'スイッチ'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'ピル背景スルッと移動（セグメント切替）',
        goal: '月払い/年払い や 表示切替 のようなスイッチで、選択中の白い角丸背景が滑らかに横移動するUIにしたいです。',
        mechanism:
          'グレーの角丸コンテナの中に、文字層（z-index: 2）と1枚の移動する白いピル背景（z-index: 1）を重ね、選択中のタブ位置へ translateX で移動させます。',
        requirements: [
          '移動中の視認性が落ちないよう、白いピル要素にはわずかなドロップシャドウを付けてください',
          '文字色は選択中と非選択中で明確なコントラスト差をつけてください'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="seg-track" id="segTrack" role="tablist" style="--count:3; --active:0">
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
  transition: transform ${params.duration.toFixed(2)}s ${ease};
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
</script>`;
    }
  },
  {
    id: 'tabs-content-slide',
    category: 'tabs',
    title: '中身パネルの横スライド切り替え',
    subtitle: 'タブを変えると、下のコンテンツ自体がページをめくるように横に滑って入れ替わる',
    mechanismTag: '横並びトラック + translateX(-N00%)',
    xRayCaption: '3ページ分のパネルを横1列に繋げておき、外枠の窓越しに全体を横にズラしています',
    interactiveHint: '「再生」または上のStepタブ（1 / 2 / 3）をクリックできます',
    defaultDuration: 0.55,
    durationRange: { min: 0.2, max: 2.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① 窓枠（表示エリア）に overflow: hidden をかける',
        detail: '外側の枠には「1ページ分の幅だけ見せて、隣にはみ出たページは隠す」窓を作ります。',
        codeHint: 'overflow: hidden'
      },
      {
        title: '② 中身ページを横一列に並べておく',
        detail: '3つのタブなら幅100%の箱を横に3つ繋げた長いベルトコンベアを作ります。',
        codeHint: 'display: flex'
      },
      {
        title: '③ ベルト全体を -0%, -100%, -200% ズラす',
        detail: '選んだタブ番号に応じてベルトを横に滑らせるだけで、左右どちらの切り替え方向も自然に表現できます。',
        codeHint: 'translateX(calc(index * -100%))'
      }
    ],
    keywords: ['タブ', 'スライド', 'パネル', 'カルーセル', '切り替え', '横'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '中身パネルの横スライド切り替え',
        goal: 'タブやステップを切り替えたとき、中のコンテンツパネル自体が左右に滑って切り替わるようにしたいです。',
        mechanism:
          '表示窓を overflow: hidden にし、内部に flex で各パネル（flex: 0 0 100%）を横並びに配置して、アクティブ番号に応じてコンテナを translateX(calc(index * -100%)) で移動させます。',
        requirements: [
          '各パネルの高さが大きく異なる場合に不自然な余白が出ないよう設計してください',
          '非表示のタブ内要素にフォーカスが飛ばないよう inert 属性または tabIndex 管理を行ってください'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="panel-tabs" role="tablist">
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
  transition: transform ${params.duration.toFixed(2)}s ${ease};
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
</script>`;
    }
  },
  {
    id: 'tabs-smooth-accordion',
    category: 'tabs',
    title: 'FAQ・折りたたみアコーディオン',
    subtitle: '質問をクリックすると「＋」が「✕」に回転し、答えが滑らかに押し開く設計',
    mechanismTag: '0fr→1fr + アイコン45度回転',
    xRayCaption: '質問行をクリックすると行比率 0fr→1fr で押し広げ、右端の＋記号も回転させています',
    interactiveHint: '「再生」または質問行を直接クリックして開閉を試せます',
    defaultDuration: 0.45,
    durationRange: { min: 0.15, max: 1.8, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① ＋記号を45度回して「✕」に見せる',
        detail: '閉じる用の別アイコンを読み込むのではなく、同じ「＋」を回転させることで状態の変化が直感的になります。',
        codeHint: 'transform: rotate(45deg)'
      },
      {
        title: '② 答え部分を Grid 0fr → 1fr で開閉する',
        detail: '文字数が変わっても崩れず、下にある別の質問項目も滑らかに押し下げられます。',
        codeHint: 'grid-template-rows: 0fr → 1fr'
      },
      {
        title: '③ 一緒に透明度もふわっと変化させる',
        detail: '高さの開閉と同時に中の文字の opacity を 0 → 1 へ少し変えると、見切れ感がなくなります。',
        codeHint: 'opacity: 0 → 1'
      }
    ],
    keywords: ['アコーディオン', 'FAQ', '折りたたみ', '開閉', '質問'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'FAQ・折りたたみアコーディオン',
        goal: 'よくある質問や詳細欄をクリックすると、右端の「＋」が回転しつつ回答文が滑らかに展開するアコーディオンにしたいです。',
        mechanism:
          'grid-template-rows: 0fr → 1fr と opacity: 0 → 1 の併用で高さをアニメーションさせ、ボタン内の「＋」アイコンを rotate(45deg) で回転させます。',
        requirements: [
          'button 要素と aria-expanded を使い、キーボード（Enter/Space）でも開閉できるようにしてください',
          '閉じている回答領域内のリンクや操作要素には tabindex や inert 管理を行い、非表示パネルへタブ移動しないようにしてください'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="acc-item" id="accItem">
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
  transition: grid-template-rows ${params.duration.toFixed(2)}s ${ease}, opacity ${params.duration.toFixed(2)}s ease;
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
  transition: transform ${params.duration.toFixed(2)}s ${ease};
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
</script>`;
    }
  },

  // =========================================================================
  // 05. 検索UIの置き方 (search)
  // =========================================================================
  {
    id: 'search-icon-expand',
    category: 'search',
    title: '虫眼鏡1個 → タップで横に伸びる検索',
    subtitle: '普段はアイコン1個だけでヘッダーをすっきり保ち、使う時だけ入力欄が広がる置き方',
    mechanismTag: 'width遷移 + 自動focus',
    xRayCaption: '閉時はアイコン幅（40px）に畳み、開いた瞬間に入力欄幅を広げつつフォーカスを当てます',
    interactiveHint: '「再生」または右上の虫眼鏡アイコンをクリック・文字入力できます',
    defaultDuration: 0.5,
    durationRange: { min: 0.15, max: 1.8, step: 0.05 },
    secondarySlider: {
      label: '展開時の幅',
      unit: 'px',
      min: 160,
      max: 290,
      step: 10,
      defaultValue: 220
    },
    defaultEasing: 'snappy',
    hasEasingControl: true,
    steps: [
      {
        title: '① 普段はアイコン1個の省スペースで置く',
        detail: 'ヘッダーのメニュー項目が多いサイトでは、最初から長い検索バーを置かず虫眼鏡だけにするとスッキリします。',
        codeHint: 'width: 40px（閉）'
      },
      {
        title: '② 押した瞬間に左方向へ入力欄を伸ばす',
        detail: '横幅を 40px → 220px へ滑らかに広げ、中に入力欄（input）とクリア「✕」ボタンを現します。',
        codeHint: 'width: 220px（開）'
      },
      {
        title: '③ 伸ばすと同時に文字入力できる状態にする',
        detail: '開いた後に自動フォーカス（input.focus()）をかけると、ユーザーはクリック1回でそのまま文字を打てます。',
        codeHint: 'inputRef.focus()'
      }
    ],
    keywords: ['検索', '虫眼鏡', 'ヘッダー', '展開', 'アイコン', '置き方'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '虫眼鏡1個 → タップで横に伸びる検索',
        goal: 'ヘッダーがごちゃつかないよう普段は虫眼鏡アイコン1個だけにして、クリックすると検索ボックスが横にスーッと伸びるUIにしたいです。',
        mechanism:
          `検索コンテナの横幅を 40px から ${params.distance}px へ transition させ、展開と同時に入力欄へ自動 focus() します。入力値が空でフォーカスが外れたら元に戻ります。`,
        requirements: [
          '開いた直後にそのままタイピングできるよう input.focus() を入れてください',
          '何か文字が入力されている間は勝手に閉じないよう制御してください'
        ],
        params,
        secondaryLabel: '展開時の幅',
        secondaryUnit: 'px',
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<div class="search-expand" id="searchBox">
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
  transition: width ${params.duration.toFixed(2)}s ${ease};
}

.search-expand.is-open {
  width: min(${params.distance}px, 100%);
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
</script>`;
    }
  },
  {
    id: 'search-inline-bar',
    category: 'search',
    title: '常設インライン検索バー（すぐ探せる王道）',
    subtitle: '「探すこと」が主役のサイト向けに、入力欄もボタンも隠さず最初から出しておく配置',
    mechanismTag: '常時表示 + フォーカス輪郭強調',
    xRayCaption: '「探せる場所」を迷わせないため隠さず配置し、入力中だけ青い外枠（focus-within）で反応します',
    interactiveHint: '「再生」または枠内の検索バーに直接入力・タグ選択ができます',
    defaultDuration: 0.4,
    durationRange: { min: 0.1, max: 1.5, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① あえて「隠さない」ことで迷いをゼロにする',
        detail: '図鑑・ECサイト・ヘルプなど「検索が主目的」のサイトでは、アイコン1個より常時バーが見つけてもらいやすいです。',
        codeHint: '発見性（Discoverability）優先'
      },
      {
        title: '② 左に虫眼鏡・中央に入力・右に実行/消去',
        detail: '左端に虫眼鏡マーク、中央にプレースホルダー例、右端に青い検索ボタンという世界標準の配置にします。',
        codeHint: 'flex: 1 + 右ボタン'
      },
      {
        title: '③ クリックした瞬間だけ光る外枠を付ける',
        detail: '親ボックスに :focus-within を使い、入力欄を押したときバー全体が青い輪郭で浮かび上がるようにします。',
        codeHint: ':focus-within'
      }
    ],
    keywords: ['検索', '検索バー', '常時表示', '配置', 'EC', '図鑑'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '常設インライン検索バー（すぐ探せる王道）',
        goal: 'ユーザーが迷わずすぐ検索できるよう、虫眼鏡アイコン・入力欄・検索ボタンが最初から一体で見えている検索バーにしたいです。',
        mechanism:
          '横並びの Pill/角丸コンテナ内に左アイコン・可変幅 input・右検索ボタンを並べ、:focus-within で入力中だけ枠線色と淡いリングを滑らかに強調します。',
        requirements: [
          'プレースホルダーには「例：ボタン、スクロール」のように具体的な入力例を入れてください',
          '入力があるときだけ右側にクリア（×）ボタンを出してください'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<form class="inline-search" role="search">
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
  transition: border-color ${params.duration.toFixed(2)}s ease, box-shadow ${params.duration.toFixed(2)}s ease;
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
</style>`
  },
  {
    id: 'search-backdrop-typography',
    category: 'search',
    title: '背景透かし文字付き・重ね検索レイアウト',
    subtitle: '後ろに大きな「SEARCH」等の装飾文字を敷き、前面に検索バーを浮かせるデザイン配置',
    mechanismTag: 'z-index層重ね + 半透明ぼかし',
    xRayCaption: '背面（z:1）に大きな背景文字を置き、前面（z:2）の半透明ガラス風検索窓を重ねています',
    interactiveHint: '「再生」を押すと背面文字と前面検索バーの重なり登場が見られます（入力も可）',
    defaultDuration: 0.75,
    durationRange: { min: 0.25, max: 2.2, step: 0.05 },
    secondarySlider: {
      label: '背景文字の透け具合',
      unit: '%',
      min: 6,
      max: 24,
      step: 2,
      defaultValue: 12
    },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① 背面レイヤー（奥）に巨大な装飾文字を置く',
        detail: '後ろのレイヤー（z-index: 1）に「SEARCH」などの文字を薄く大きく配置し、デザイン上の奥行きを作ります。',
        codeHint: 'position: absolute; z-index: 1'
      },
      {
        title: '② 前面レイヤー（手前）に検索バーを浮かせる',
        detail: '手前のレイヤー（z-index: 2）に検索ボックスを少し重ねて配置します。背景が少し透けると重なりが綺麗に見えます。',
        codeHint: 'backdrop-filter: blur(6px)'
      },
      {
        title: '③ 入力中は後ろの文字が邪魔にならない工夫',
        detail: '背景文字には pointer-events: none と薄い透明度を使い、前面の入力文字の読みやすさを絶対に邪魔しないのが鉄則です。',
        codeHint: 'pointer-events: none; user-select: none'
      }
    ],
    keywords: ['検索', '背景', '透かし', '後ろ', 'タイポ', 'レイアウト', 'おしゃれ'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '背景透かし文字付き・重ね検索レイアウト',
        goal: '検索バーの後ろのレイアウトに大きな「SEARCH」等の装飾文字を配置し、手前に検索入力欄が重なって見えるデザイン性の高いセクションにしたいです。',
        mechanism:
          `親コンテナを position: relative にし、背面に巨大な透かし文字（opacity: ${(params.distance / 100).toFixed(2)}, pointer-events: none, z-index: 1）を置き、前面（z-index: 2）に薄い半透明＋backdrop-filter の検索バーを重ねます。`,
        requirements: [
          '背面文字がクリックや選択の邪魔にならないよう pointer-events: none と aria-hidden="true" を付けてください',
          '検索入力の文字と背面文字が重なっても読みにくくならないよう、前面ボックスは白ベース90%程度の不透明度を保ってください'
        ],
        params,
        secondaryLabel: '背景文字の濃さ',
        secondaryUnit: '%',
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      const alpha = (params.distance / 100).toFixed(2);
      return `<section class="editorial-search-wrap">
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
  color: rgba(24, 24, 27, ${alpha});
  pointer-events: none;
  user-select: none;
  animation: fadeUp ${params.duration.toFixed(2)}s ${ease} both;
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
</style>`;
    }
  },
  {
    id: 'search-command-modal',
    category: 'search',
    title: '⌘K 中央コマンド検索モーダル',
    subtitle: '小さなボタンやショートカットから画面中央に浮き上がり、候補もすぐ出せる高機能配置',
    mechanismTag: '擬似トリガー + 中央オーバーレイ',
    xRayCaption: '普段は小さな「検索ボタン（⌘K）」だけ置き、押したときだけ中央モーダルを出現させます',
    interactiveHint: '「再生」または「⌘K で検索」ボタンを押してモーダルを開けます',
    defaultDuration: 0.4,
    durationRange: { min: 0.15, max: 1.5, step: 0.05 },
    defaultEasing: 'snappy',
    hasEasingControl: true,
    steps: [
      {
        title: '① 普段は小さなボタン（バッジ付き）だけ見せる',
        detail: 'ヘッダーのスペースを食わずに「いつでもどこでも検索できる入口」を作れます。',
        codeHint: '<button>🔍 検索 ⌘K</button>'
      },
      {
        title: '② 押すと背景を軽くぼかして中央に浮かべる',
        detail: '注意を検索だけに集中させるため、背後に半透明ぼかし幕を敷き、中央上部にパネルを出します。',
        codeHint: 'scale(0.96 → 1) + backdrop'
      },
      {
        title: '③ 入力欄のすぐ下に候補リストを出せる',
        detail: 'モーダル内なら縦幅に余裕があるため、おすすめキーワードや履歴をすぐ下に並べて選べます。',
        codeHint: '入力欄 + 即時候補リスト'
      }
    ],
    keywords: ['検索', 'モーダル', 'コマンドパレット', '⌘K', 'ポップアップ'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '⌘K 中央コマンド検索モーダル',
        goal: '普段はコンパクトな検索ボタン（⌘K表示）にして、押すと画面中央に背景ぼかし付きの検索モーダルがふわっと浮かぶUIにしたいです。',
        mechanism:
          'ネイティブの <dialog> またはモーダルオーバーレイを使い、トリガー押下または Cmd/Ctrl+K で開き、scale(0.96) + opacity: 0 から scale(1) + opacity: 1 へ遷移させます。',
        requirements: [
          'モーダルが開いたら入力欄に自動フォーカスし、Escキーや外側クリックで閉じられるようにしてください',
          '背景には軽めの半透明暗幕を敷いて入力に集中しやすくしてください'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<button id="openSearchModal" type="button">🔍 検索 <kbd>⌘K</kbd></button>

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
  animation: modalPop ${params.duration.toFixed(2)}s ${ease} both;
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
</script>`;
    }
  }
];
