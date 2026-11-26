import type { MotionPattern } from '../types/motion';
import { EASING_OPTIONS, buildStructuredPrompt } from '../utils/motionHelpers';

export const HEADER_FOOTER_PATTERNS: MotionPattern[] = [
  {
    id: 'hf-classic-header',
    category: 'header',
    title: '王道3分割1行ヘッダー（迷わない定番）',
    subtitle: '左にロゴ・中央にリンク4つ・右端に主役ボタンを置く、初見の人が一瞬で理解できるヘッダー配置',
    mechanismTag: 'Flex 3分割（左・中・右）+ レスポンシブ切替',
    xRayCaption: '「左＝サイト名」「中＝ページ移動」「右＝大事な行動ボタン」の役割を 1 行に整理しています',
    interactiveHint: '右上の「PC / スマホ」で狭い画面幅での折りたたみ方も確認できます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.35,
    durationRange: { min: 0.15, max: 1.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 横並び 3 ブロックを justify-between で離す',
        detail: '左端にロゴ、真ん中にナビゲーション、右端に注目ボタンを置いて視線の流れを作ります。',
        codeHint: 'display: flex; justify-content: space-between; align-items: center'
      },
      {
        title: '② 高さは 56〜64px、リンクは 4〜5 個までに絞る',
        detail: '項目が多すぎると折り返して窮屈になるため、最重要のページだけ並べるのがコツです。',
        codeHint: 'height: 60px; gap: 24px'
      },
      {
        title: '③ スマホ幅ではリンク群を隠しメニューボタンへ',
        detail: '768px 未満では中央リンクを非表示にし、右端にハンバーガーアイコンを出して崩れを防ぎます。',
        codeHint: '@media (max-width: 767px) { .nav { display: none; } }'
      }
    ],
    keywords: ['ヘッダー', 'header', '定番', '3分割', 'ナビゲーション', '静的', 'レスポンシブ', 'CTA'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '王道3分割1行ヘッダー',
        goal: '左端にロゴ、中央に主要リンク4件、右端にアクションボタンを配置したシンプルで迷わない1行ヘッダーにする。',
        mechanism: 'display: flex + justify-content: space-between による水平配置と、スマホ幅でのハンバーガー折りたたみ切替。',
        isStatic: true,
        requirements: [
          'ヘッダー高さは 56〜64px に抑え、初回表示の面積を取りすぎないようにする',
          '右端ボタンだけ背景色を付けて「次に押すべき場所」を明確にする',
          '画面幅 768px 未満ではリンク群を折りたたんでメニューボタンに切り替える'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<header class="site-header">
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
</style>`
  },
  {
    id: 'hf-centered-brand',
    category: 'header',
    title: 'ロゴ中央・左右振り分けヘッダー（雑誌・ブランド風）',
    subtitle: '左右の文字量が違っていてもブランドロゴが画面のど真ん中にビシッと座る設計',
    mechanismTag: '3列均等Grid（1fr auto 1fr）による厳密センター配置',
    xRayCaption: '両端の枠を同じ「1fr」幅にすることで、左右の項目数に差があっても中央ロゴが一切ズレません',
    interactiveHint: '右上の「PC / スマホ」でスマホ幅（左≡ / 中央ロゴ / 右検索）への変化を確認できます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.35,
    durationRange: { min: 0.15, max: 1.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① Flexbox ではなく CSS Grid（1fr auto 1fr）を使う',
        detail: 'justify-content: space-between では左と右の文字長の違いでロゴが偏りますが、1fr が両端の重みを均一にします。',
        codeHint: 'grid-template-columns: 1fr auto 1fr'
      },
      {
        title: '② 左に閲覧リンク、右に補助アイコンを分ける',
        detail: '左側を読み物系メニュー、右側を検索・問い合わせなど補助導線に分けるとバランスが取れます。',
        codeHint: 'justify-self: end'
      },
      {
        title: '③ スマホ幅でも「中央ロゴ」だけは崩さない',
        detail: '同じ 3 列構造のまま、左＝メニューボタン、中央＝ロゴ、右＝虫眼鏡の 3 点へ自然に縮約できます。',
        codeHint: 'display: grid; align-items: center'
      }
    ],
    keywords: ['ヘッダー', 'header', '中央', 'ロゴ', 'ブランド', '雑誌', 'grid', '静的'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: 'ロゴ中央・左右振り分けヘッダー',
        goal: '雑誌やポートフォリオのようにブランドロゴを厳密に中央へ配置し、左右にメニューと補助機能を品よく振り分ける。',
        mechanism: 'CSS Grid の grid-template-columns: 1fr auto 1fr を使って左右の余白バランスを自動均一化。',
        isStatic: true,
        requirements: [
          'justify-content: space-between ではなく grid-template-columns: 1fr auto 1fr を採用して中央ズレを防ぐ',
          'モバイル時も「左：メニュー／中：ロゴ／右：検索アイコン」の 3 点構造を維持する'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<header class="brand-header">
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
</style>`
  },
  {
    id: 'hf-floating-pill',
    category: 'header',
    title: '浮き島ピル型スマートヘッダー（スクロールで隠れて戻る）',
    subtitle: '画面上部から少し浮いたカプセル型のヘッダー。下に読む時は邪魔にならず引っ込み、上に少し戻すと再出現します',
    mechanismTag: '角丸ピル浮遊 + スクロール上下方向判定（Smart Hide）',
    xRayCaption: '前回のスクロール量（prevY）と現在位置を比較し、「下へ進んだら上退避」「少し上へ戻ったら再表示」を切り替えます',
    interactiveHint: '「再生」または枠内の本文を上下にスクロールして動きを確かめられます',
    defaultDuration: 0.55,
    durationRange: { min: 0.2, max: 1.8, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① 上端から少し浮かせてカプセル型にする',
        detail: '画面端にベタッと貼らず、top: 12px と border-radius: 9999px で軽やかな浮遊感を作ります。',
        codeHint: 'position: sticky; top: 12px; border-radius: 9999px'
      },
      {
        title: '② 前回のスクロール位置と大小を比べる',
        detail: '下へスクロール中（currentY > prevY）は画面外の -140% へ隠し、読むスペースを最大化します。',
        codeHint: 'header.classList.toggle("is-hidden", y > 80 && y > prevY)'
      },
      {
        title: '③ 上へ少しでも戻ったら即座に降ろす',
        detail: '「上へ戻ろうとした＝メニューが見たい合図」と判定してスッと戻すと使い心地が一気に上がります。',
        codeHint: 'transform: translateY(-150%) ↔ translateY(0)'
      }
    ],
    keywords: ['ヘッダー', '浮き島', 'ピル', 'スマートヘッダー', 'スクロール', '隠れる', '追従'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '浮き島ピル型スマートヘッダー',
        goal: '画面上部から少し浮いた角丸カプセル型のヘッダーを配置し、下方向スクロールで一時退避・上方向スクロールで再表示させる。',
        mechanism: 'scroll イベントで前回スクロール座標 prevY との増減を判定し、translateY(-150%) と translateY(0) を切り替える。',
        requirements: [
          '最上部付近（scrollY <= 80）では必ず表示状態に保つ',
          '高さ・横幅はコンテンツに合わせ max-width を制限し、背景に薄い透過＋ぼかしを加える'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<header id="smartPill" class="pill-header">
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
  transition: transform ${params.duration.toFixed(2)}s ${ease};
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
</script>`;
    }
  },
  {
    id: 'hf-mega-menu',
    category: 'header',
    title: '広く見渡せるメガメニュー展開ヘッダー',
    subtitle: '小さな縦並びリストではなく、説明付きカードを横に広げたパネルで迷わず目的ページを探せる構成',
    mechanismTag: '親ヘッダー基準 + 全幅絶対配置パネル（Grid 3列）',
    xRayCaption: 'ヘッダーのすぐ下に position: absolute の横幅パネルを吊り下げ、opacity と translateY で開きます',
    interactiveHint: '「再生」またはヘッダー内の「機能一覧」ボタンをクリックして開閉できます',
    defaultDuration: 0.45,
    durationRange: { min: 0.15, max: 1.6, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: true,
    steps: [
      {
        title: '① ヘッダーを親基準（position: relative）にする',
        detail: 'メニューボタンの狭い幅に引っ張られず、ヘッダー全幅で展開するパネルの土台を作ります。',
        codeHint: '.header-wrap { position: relative; }'
      },
      {
        title: '② パネル内を 3 列カードにして説明を添える',
        detail: 'リンク名だけでなく「何ができるか」を 1 行添えると、クリック前の迷いがなくなります。',
        codeHint: 'grid-template-columns: repeat(3, 1fr)'
      },
      {
        title: '③ opacity とわずかな縦移動で出す',
        detail: '閉じる時は pointer-events: none を掛けて下の要素のクリックを邪魔しないようにします。',
        codeHint: 'pointer-events: none ↔ auto'
      }
    ],
    keywords: ['ヘッダー', 'メガメニュー', 'ドロップダウン', 'パネル', '一覧', '情報設計'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '広く見渡せるメガメニュー展開ヘッダー',
        goal: 'ナビ項目をクリック／ホバーした際、ヘッダー下部に横3列カード形式の大きな案内パネルを滑らかに展開する。',
        mechanism: 'relative なヘッダー下に absolute のワイドパネルを配置し、aria-expanded 連動で opacity と translateY を切り替え。',
        requirements: [
          '非表示時は pointer-events: none と aria-hidden="true" を設定する',
          'Escape キーやパネル外クリックで直感的に閉じられるようにする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => {
      const ease = EASING_OPTIONS[params.easing].css;
      return `<header class="mega-header" id="megaHeader">
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
  transition: opacity ${params.duration.toFixed(2)}s ease, transform ${params.duration.toFixed(2)}s ${ease};
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
</script>`;
    }
  },
  {
    id: 'hf-sitemap-footer',
    category: 'footer',
    title: '安心の3列サイトマップ・フッター（王道着地）',
    subtitle: 'ページの最下部でサイト全体を見渡し直せる、ブランド説明＋カテゴリ列＋コピーライトの標準構造',
    mechanismTag: 'Grid 列配分（ブランド 1.3fr + リンク3列）',
    xRayCaption: '濃い背景色に変えて「ページの終着点」を視覚的に伝え、スマホ幅では 2 列に折りたたみます',
    interactiveHint: '右上の「PC / スマホ」で狭い画面での 2 列折りたたみ構造を確認できます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.35,
    durationRange: { min: 0.15, max: 1.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① 左列を少し広げてブランドの要約を置く',
        detail: '1.3fr 程度の幅を取り、サイト名と短い一言説明を置いてから右へリンク列を並べます。',
        codeHint: 'grid-template-columns: 1.3fr 1fr 1fr 1fr'
      },
      {
        title: '② 下端にコピーライト帯を細線で区切る',
        detail: 'border-top で情報エリアと著作権表記を分けると、画面全体が引き締まって見えます。',
        codeHint: 'border-top: 1px solid #27272a'
      },
      {
        title: '③ スマホ幅ではブランド欄を横全幅（col-span-2）に',
        detail: 'ブランド説明を一番上に 1 行取り、下のリクエスト欄を 2 列で並べると縦長になりすぎません。',
        codeHint: 'grid-template-columns: repeat(2, 1fr)'
      }
    ],
    keywords: ['フッター', 'footer', 'サイトマップ', '多列', '定番', '静的', 'レスポンシブ'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '安心の3列サイトマップ・フッター',
        goal: 'ページ最下部にブランドの短い紹介と3列のカテゴリリンク、下端コピーライト帯を備えた落ち着いた着地フッターを作る。',
        mechanism: 'CSS Grid で PC時は「紹介1.3fr ＋ リンク3列」、スマホ時は「紹介全幅 ＋ 2列」に切り替える。',
        isStatic: true,
        requirements: [
          '本文との境界がはっきり分かる背景トーン差と上下の余白を十分にとる',
          '各リンクにはキーボードフォーカスリングとホバー明度変化を付ける'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<footer class="site-footer">
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
</style>`
  },
  {
    id: 'hf-minimal-footer',
    category: 'footer',
    title: '超軽量1行ミニマルフッター（道具・アプリ向け）',
    subtitle: 'Webアプリや個人ポートフォリオで主役画面の邪魔をしない、細線1本と最小リンクだけの引き算フッター',
    mechanismTag: '1px 上線 + Flex 両端寄せ（スマホは中央2段）',
    xRayCaption: '情報量をコピーライト＋3リンクまでに削ることで、主役コンテンツの余韻を保ちます',
    interactiveHint: '右上の「PC / スマホ」で狭い画面時の中央2段並びを確認できます',
    hasPlayback: false,
    hasViewportToggle: true,
    defaultDuration: 0.35,
    durationRange: { min: 0.15, max: 1.0, step: 0.05 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① リンクを 3 つ程度に絞って 1 行に収める',
        detail: '道具系のサイトでは巨大なフッターは不要なので、規約・連絡・使い方程度に厳選します。',
        codeHint: 'display: flex; justify-content: space-between'
      },
      {
        title: '② 濃い色ではなく薄い境界線だけで区切る',
        detail: '背景は白または薄いグレー（#fafafa）のまま 1px の上線を入れると圧迫感が出ません。',
        codeHint: 'border-top: 1px solid #e4e4e7'
      },
      {
        title: '③ スマホ幅では中央揃えの縦並びへ',
        detail: '横並びに無理やり詰め込まず、flex-direction: column + align-items: center で美しく畳みます。',
        codeHint: '@media (max-width: 639px) { flex-direction: column; }'
      }
    ],
    keywords: ['フッター', 'footer', 'ミニマル', '1行', 'シンプル', 'ツール', '静的'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '超軽量1行ミニマルフッター',
        goal: 'コピーライトと最小限のリンク（2〜3個）だけを 1 行に整えた、道具アプリ・個人サイト向けの軽快なフッターにする。',
        mechanism: '薄い上境界線と Flexbox 両端配置を使い、モバイル幅でのみ中央揃えの縦2段へ切り替える。',
        isStatic: true,
        requirements: [
          'フッターの高さが画面を圧迫しないよう上下パディングは 16〜24px に抑える',
          '文字色は控えめなグレーにし、クリック可能なリンクのみホバーで濃くする'
        ],
        params,
        targetNote
      }),
    buildCode: () => `<footer class="mini-footer">
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
</style>`
  },
  {
    id: 'hf-curtain-reveal-footer',
    category: 'footer',
    title: '最下部で幕が上がって現れるリビール・フッター',
    subtitle: '本文の後ろにフッターを隠しておき、最後まで読み終えると幕が上がるように姿を見せる独創的演出',
    mechanismTag: '背面固定フッター (z:1) + 前面本文シート (z:2)',
    xRayCaption: 'フッター自体が動くのではなく、前面の白い本文ブロックの底に余白を開けて上へ過ぎ去らせています',
    interactiveHint: '「再生」または枠内を一番下までスクロールして動きを確認できます',
    defaultDuration: 2.2,
    durationRange: { min: 1.0, max: 5.0, step: 0.2 },
    defaultEasing: 'smooth',
    hasEasingControl: false,
    steps: [
      {
        title: '① フッターを一番奥（z-index: 1）に固定配置する',
        detail: 'position: fixed または sticky で画面下端に待機させ、最初は本文シートの裏に隠します。',
        codeHint: 'position: fixed; bottom: 0; z-index: 1'
      },
      {
        title: '② 本文ラッパーを手前（z-index: 2）にして影を落とす',
        detail: '前面の本文にはっきりとした背景色と下側の影を付け、後ろのフッターを完全に覆います。',
        codeHint: 'position: relative; z-index: 2; background: #fff'
      },
      {
        title: '③ 本文の下にフッター高さ分の margin-bottom を空ける',
        detail: '最後までスクロールして本文が上へ抜けると、空いた空間から奥のフッターが顔を出します。',
        codeHint: 'margin-bottom: var(--footer-height)'
      }
    ],
    keywords: ['フッター', 'footer', 'リビール', '幕上がり', '独創的', '奥行き', 'z-index', 'スクロール'],
    buildPrompt: (params, targetNote) =>
      buildStructuredPrompt({
        name: '最下部で幕が上がって現れるリビール・フッター',
        goal: '通常時は本文の裏に待機しているフッターが、ページ最下部までスクロールすると前面の本文が幕のように上がり姿を現す仕掛けを作る。',
        mechanism: '背面固定（fixed; bottom: 0; z-index: 1）のフッターと、前面（z-index: 2）でフッター高さ分の margin-bottom を持つ本文セクションを重ねる。',
        requirements: [
          'フッター内容がスマホ画面からはみ出す場合は、安全のためモバイル時は通常の静的フッターへフォールバックする',
          '背面フッター内のリンクは本文が通り過ぎた後のみ操作される設計にする'
        ],
        params,
        targetNote
      }),
    buildCode: (params) => `<main class="curtain-main">
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
  transition: transform ${params.duration.toFixed(2)}s ease;
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
</style>`
  }
];
