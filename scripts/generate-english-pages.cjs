const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repositoryRoot = path.resolve(__dirname, '..');
const UPDATED = '2026-07-16';
const PASSWORD_GUIDE_UPDATED = '2026-07-22';
const HUB_UPDATED = '2026-08-02';
const HUB_UPDATED_LABEL = 'August 2, 2026';
const ENGLISH_SHELL_VERSION = '20260805-lab';

const COMMON_REPLACEMENTS = Object.freeze([
  ['🏠 ホーム', '🏠 Home'],
  ['パンくずリスト', 'Breadcrumb'],
  ['⚠️ JavaScriptが無効になっています', '⚠️ JavaScript is disabled'],
  ['このツールはブラウザ上での計算のためにJavaScriptを使用します。有効にしてからご利用ください。', 'This tool needs JavaScript to calculate and preview results in your browser. Enable JavaScript and reload the page.'],
  ['運営者情報', 'About the operator'],
  ['利用規約', 'Terms'],
  ['プライバシーポリシー', 'Privacy'],
  ['お問い合わせ', 'Contact'],
  ['サイトマップ', 'Sitemap'],
  ['サイト情報', 'Site information'],
]);

const TOOL_CONFIGS = Object.freeze([
  {
    source: 'emphasis-lines/index.html',
    output: 'emphasis-lines/en/index.html',
    slug: 'emphasis-lines',
    name: 'Emphasis Lines Studio',
    title: 'Free Emphasis Lines Generator for Thumbnails | KatakataLab',
    description: 'Create focus, speed, manga, and radial emphasis lines in your browser, adjust their shape and color, then export PNG or SVG assets without an account.',
    category: 'DesignApplication',
    intro: 'Create reusable focus-line assets for thumbnails, comics, slides, and social posts without uploading your source image. The editor supports four line styles, transparent line-only output, positioning, color, taper, density, and repeatable random patterns.',
    steps: [
      'Choose Composite image to place lines over a JPEG or PNG, or Lines only to create a transparent asset.',
      'Select Basic, Hand-drawn, Radial, or Speed, then adjust line count, width, center, aperture, and randomness.',
      'Check the intended crop, then save a PNG. For a reusable overlay, choose Lines only and place the transparent PNG above your artwork in an image editor. Keep faces and text clear of dense lines.',
    ],
    limits: 'PNG follows the selected output mode. SVG embeds a PNG of the lines only; it does not include the background image, add resolution, or provide editable vector paths. Large exports depend on device memory, and resizing or compression in another editor can alter their appearance. You may use generated images commercially without attribution. Do not redistribute the tool or resell the generated images themselves, including in asset packs.',
    privacy: 'Uploaded images and line settings are processed locally in the browser. They are not sent to KatakataLab. Analytics can record ordinary page-view information, but not the image content you edit.',
    startMarker: null,
    replacements: [
      ['強調線メーカー (Emphasis Lines Studio)', 'Emphasis Lines Studio'],
      ['強調線メーカー', 'Emphasis Lines Studio'],
      ['処理中...', 'Working…'], ['設定', 'Settings'], ['使い方とQ&A', 'How to use & FAQ'],
      ['まずは画像を選択してください', 'Choose an image (optional)'],
      ['JPEG, PNG（またはこのまま線素材のみ作成）', 'JPEG or PNG — or create a line-only asset'],
      ['PNG・JPEG（各20MBまで）。画像なしでも線素材を作れます。', 'PNG or JPEG (up to 20 MB each). You can also create lines without an image.'],
      ['出力モード', 'Output mode'], ['合成画像', 'Composite image'], ['線素材のみ', 'Lines only'],
      ['画像を背景にして、線と合成した1枚の画像を作成します。', 'Combine an image and the generated lines into one file.'],
      ['キャンバスサイズ', 'Canvas size'], ['Instagram等', 'Instagram etc.'], ['カスタム (開発中)', 'Custom (planned)'],
      ['線タイプ', 'Line style'], ['汎用', 'Basic'], ['手書き', 'Hand-drawn'], ['放射', 'Radial'], ['斜線', 'Speed'],
      ['線の本数', 'Line count'], ['太さ', 'Width'], ['中心円（内側、外側）', 'Center gap (inner / outer)'],
      ['色', 'Color'], ['白フチ', 'White outline'], ['グラデーション', 'Gradient'], ['グラデーション終了色', 'Gradient end color'],
      ['詳細設定', 'Advanced settings'], ['パターン（乱数）を再生成', 'Regenerate random pattern'],
      ['※色や太さを変えても、このボタンを押すまでパターンは維持されます', 'The pattern remains stable while you adjust color or width.'],
      ['入り抜き', 'Taper'], ['※「シュッ」と鋭い線になります', 'Higher values create sharper tips.'],
      ['描画範囲', 'Aperture'], ['向き', 'Direction'], ['ランダム度', 'Randomness'],
      ['PNG保存', 'Save PNG'], ['画像はサーバーに送信されず、ブラウザ内で処理されます。', 'Images are processed locally in your browser and are not uploaded.'],
      ['画像はサーバーに送信されず、ブラウザ内で処理されます。キャンバスをクリックすると中心を動かせます。SVGは線のPNG埋め込みです。', 'Images are processed locally in your browser and are not uploaded. Click the canvas to move the center. SVG embeds a PNG of the lines only.'],
      ['ヒント＆活用ガイド', 'Tips & usage guide'], ['📖 かんたん使い方ガイド', '📖 Quick guide'],
      ['線タイプを選ぶ', 'Choose a line style'], ['「汎用」「手書き」「放射」「斜線」から選択', 'Pick Basic, Hand-drawn, Radial, or Speed.'],
      ['色と太さを調整', 'Adjust color and width'], ['プリセット色ボタンでワンタップ変更', 'Use a preset or choose a custom color.'],
      ['中心点をクリックで移動', 'Click to move the center'], ['キャンバス上でクリックすると、線の中心位置を変更できます', 'Click the canvas to move the focus point.'],
      ['画像を保存', 'Export the result'], ['青いボタンをクリックでPNGダウンロード', 'Use the blue button to download a PNG.'],
      ['💡 詳細設定の説明', '💡 Advanced controls'],
      ['線を「シュッ」と鋭くします。0%で棒状、100%で三角形になります。', 'Taper changes lines from rectangular at 0% to pointed at 100%.'],
      ['線を360度全体ではなく、一部の方向だけに限定できます。', 'Aperture limits the lines to part of the full 360-degree circle.'],
      ['線の位置や太さにバラツキを加えて自然な印象に。', 'Randomness varies placement and width for a more organic result.'],
      ['📜 ライセンス・利用規約', '📜 License & terms'], ['✅ 商用利用OK', '✅ Commercial use allowed'],
      ['このツールで生成した画像は、商用・非商用を問わず自由にご利用いただけます。', 'You may use generated images for commercial and non-commercial work.'],
      ['✅ クレジット不要', '✅ Attribution not required'], ['作者表記なしでお使いいただけます。表記していただけたり宣伝していただけたら泣いて喜びます。', 'You may use the result without credit, although a link is always appreciated.'],
      ['⚠️ 禁止事項', '⚠️ Restrictions'], ['生成画像そのものの再販売（素材集としての販売等）、およびツール自体の再配布は禁止とさせていただいております。ご理解のほどよろしくお願いいたします。', 'Do not redistribute the tool or resell the generated images themselves, including in asset packs.'],
      ['⌨️ ショートカット', '⌨️ Shortcuts'], ['元に戻す', 'Undo'], ['やり直し', 'Redo'], ['ヘルプを閉じる', 'Close help'], ['閉じる', 'Close'],
      ['使い方・ヒント', 'Usage tips'], ['ヘルプを開く', 'Open help'], ['戻る (Ctrl+Z)', 'Undo (Ctrl+Z)'],
      ['拡大', 'Zoom in'], ['縮小', 'Zoom out'], ['画面にフィット', 'Fit to screen'], ['使い方とQ&Aを見る', 'View usage guide and FAQ'],
      ['汎用タイプ', 'Basic style'], ['手書きタイプ', 'Hand-drawn style'], ['放射タイプ', 'Radial style'], ['斜線タイプ', 'Speed-line style'],
      ['線の太さ', 'Line width'], ['最短の長さ', 'Minimum length'], ['最長の長さ', 'Maximum length'],
      ['Color: 黒', 'Color: black'], ['Color: 白', 'Color: white'], ['Color: 赤', 'Color: red'], ['Color: 黄', 'Color: yellow'], ['Color: 青', 'Color: blue'], ['Color: 緑', 'Color: green'], ['Color: オレンジ', 'Color: orange'], ['Color: ピンク', 'Color: pink'],
      ['カスタムカラーピッカー', 'Custom color picker'], ['カラーコード入力', 'Color code'], ['白フチを有効にする', 'Enable white outline'], ['グラデーションを有効にする', 'Enable gradient'],
      ['線の先端を尖らせます', 'Sharpen the line tips'], ['入り抜き（テーパー）', 'Taper'], ['線を一部の方向だけに限定', 'Limit lines to part of the circle'], ['描画範囲（度）', 'Aperture in degrees'],
      ['線の方向を回転', 'Rotate line direction'], ['線の向き（角度）', 'Line direction in degrees'], ['線の位置や太さのバラツキ', 'Vary line position and width'], ['SVG形式で保存', 'Save as SVG'],
      ['線のPNGを埋め込んだSVGを保存します。合成した背景画像は入りません。', 'Save an SVG containing a PNG of the lines. The background image is not included.'],
      ['黒', 'Black'], ['白', 'White'], ['赤', 'Red'], ['黄', 'Yellow'], ['青', 'Blue'], ['緑', 'Green'], ['オレンジ', 'Orange'], ['ピンク', 'Pink'],
      ['🧭 用途別の使い分け', '🧭 Choosing a style by use case'],
      ['サムネイルや見出しの強調:', 'Thumbnails and headings:'],
      ['汎用タイプで中心を被写体に合わせると、視線を集める背景素材として使いやすくなります。', 'Align the Basic style with the subject to create a background that guides attention.'],
      ['漫画・手描き風の演出:', 'Manga and hand-drawn effects:'],
      ['手書きタイプとランダム度を組み合わせると、均一すぎない勢いを出せます。', 'Combine Hand-drawn style with Randomness for energy that does not feel overly uniform.'],
      ['方向を限定したい場合:', 'When direction matters:'],
      ['放射・斜線タイプに描画範囲と向きを加えると、商品や人物を避けたレイアウトを作れます。', 'Use Aperture and Direction with Radial or Speed-line style to keep lines away from a product or person.'],
      ['🔍 使う前に知っておきたいこと', '🔍 Before you use it'],
      ['入力画像の読み込み、線の生成、PNG・SVG保存はブラウザ内で行います。画像や設定をこのツールのサーバーへ送信して保存する仕組みではありません。', 'Images are loaded, lines are generated, and PNG/SVG files are saved in your browser. This tool does not send or store images or settings on its server.'],
      ['ただし、ページ表示時には広告・アクセス解析・外部フォントなどの通信が発生する場合があります。機密画像を扱うときは、共有端末やブラウザ拡張機能の状況も確認してください。', 'The page may still contact advertising, analytics, and font services. When editing sensitive images, also consider the device and browser extensions you are using.'],
      ['作成者: かたかた / 更新日: 2026年7月22日', 'Created by Katakata · Updated: July 22, 2026'],
    ],
  },
  {
    source: 'font-lab/index.html', output: 'font-lab/en/index.html', slug: 'font-lab',
    name: 'Japanese Web Font Lab', title: 'Japanese Web Font Tester and CSS Generator | KatakataLab',
    description: 'Compare Japanese web fonts with editable text, tune size, weight, spacing, and line height, then copy practical CSS while learning how font loading affects performance.',
    category: 'DeveloperApplication',
    intro: 'Japanese fonts contain far more glyphs than Latin-only fonts, so visual choice and delivery cost must be considered together. This lab lets you compare real Japanese sample text while generating CSS for a chosen family, size, weight, tracking, and line height.',
    steps: ['Edit the heading, paragraph, and button in the live preview so the sample resembles your actual interface.', 'Switch fonts and test both desktop and mobile widths. Adjust weight before spacing because a heavier face can change perceived density.', 'Copy the generated CSS, then verify the exact font request and layout shift in browser developer tools on a cold load.'],
    limits: 'The preview uses available web-font files and browser rendering. A font may render differently by operating system, fallback stack, antialiasing, or unsupported weight. Only preload a font file that is used above the fold; unnecessary preloads compete with HTML, CSS, and images.',
    privacy: 'Preview text stays in the page and is not submitted to KatakataLab. External font providers can receive normal network request metadata when their font files are loaded.',
    startMarker: '<section id="section-showcase"',
    replacements: [
      ['Katakata Font-Lab | 日本語Webフォントの比較シミュレータ＆超軽量化の教科書', 'Japanese Web Font Lab'],
      ['⚠ このサイトのシミュレータ機能にはJavaScriptが必要です。ブラウザの設定でJavaScriptを有効にしてください。', '⚠ This simulator needs JavaScript. Enable JavaScript in your browser and reload the page.'],
      ['本文へスキップ', 'Skip to content'], ['比較ツール', 'Font tester'], ['フォント見本市', 'Font samples'], ['技術コラム', 'Performance notes'],
      ['開発者のためのフォント研究室', 'A practical Japanese font lab for developers'],
      ['フォントが変われば、', 'The font changes'], ['作品の「ぬくもり」が変わる。', 'how your interface feels.'],
      ['「M PLUS Rounded 1c」や「Zen Maru Gothic」など、日本語Webフォントをブラウザ上で打ち替えながらCSSを比較できるシミュレータです。プリロード、セグメント分割配信、サブセット化で表示負荷を抑える考え方と注意点もまとめています。', 'Compare Japanese web fonts such as M PLUS Rounded 1c and Zen Maru Gothic with your own text, then copy CSS and review practical delivery trade-offs.'],
      ['1. 比較シミュレータ & CSSジェネレータ', '1. Live font tester & CSS generator'], ['枠内のテキストは自由に編集可能です！', 'Every text field in the preview is editable.'],
      ['フォント適用中...', 'Loading font…'], ['ここに見出しのタイトルを入力してね！', 'Type a Japanese or English heading here'],
      ['ここは本文のテキストエリアです。日本語のWebフォントは、文字の形や太さ、丸みによって読者に与える『ぬくもり』や『読みやすさ』が劇的に変化します。好きな文字を打ち替えて、スマホでの見え方やCSSの行間設定などを心地よく調整してみてください。', 'Replace this paragraph with the copy you plan to publish. Japanese glyph shape, weight, spacing, and line height can change both readability and the emotional tone of an interface. Compare at mobile width before choosing a production font.'],
      ['ボタンの文字', 'Button label'], ['タイポグラフィ調整', 'Typography controls'], ['フォントの種類', 'Font family'],
      ['ふんわり標準丸文字', 'soft rounded'], ['可愛さMAX丸文字', 'friendly rounded'], ['シャープで知的', 'neutral and crisp'], ['レトロで優しい明朝体', 'gentle retro Mincho'], ['味のある個性派手書き', 'expressive handwriting'], ['極太・強烈見出し', 'heavy display'], ['ポップな手書き風', 'playful handwriting'],
      ['文字サイズ (本文)', 'Body font size'], ['フォントの太さ (Weight)', 'Font weight'], ['文字の間隔 (letter-spacing)', 'Letter spacing'], ['行の高さ (line-height)', 'Line height'],
      ['出力コード (HTML & CSS)', 'Generated HTML & CSS'], ['CSSコード', 'CSS code'], ['HTMLインポート', 'HTML import'], ['CSSコードをコピー', 'Copy CSS'],
      ['KatakataLab ホームへ', 'Go to KatakataLab home'], ['メインナビゲーション', 'Main navigation'], ['ダークモードに切り替える', 'Switch to dark mode'], ['ダークモード切替', 'Toggle dark mode'],
      ['画面幅表示の切り替え', 'Preview width'], ['デスクトップ表示', 'Desktop preview'], ['PC表示', 'Desktop view'], ['モバイル表示', 'Mobile preview'], ['スマホ表示', 'Mobile view'], ['ページの一番上へ戻る', 'Back to top'],
      ['比較の使い方', 'How to compare'],
      ['実テキストで試す。', 'Try real copy.'],
      ['見出し・本文・ボタンを、公開する文言に近づけてから書体を切り替えます。', 'Match the heading, body, and button to the words you will ship, then switch families.'],
      ['太さを先に決める。', 'Choose weight first.'],
      ['字間や行間より先にウェイトを見ると、密度の差が分かりやすいです。', 'Weight changes density more than tracking or line height, so decide it before those.'],
      ['開発者ツールでコールドロードを見る。', 'Check a cold load in developer tools.'],
      ['キャッシュを無効にした再読み込みで、実際に落ちるフォントファイルとレイアウトのずれを確認します。', 'Disable cache and reload to see which files load and whether the layout shifts.'],
    ],
  },
  {
    source: 'aspect-ratio-calc/index.html', output: 'aspect-ratio-calc/en/index.html', slug: 'aspect-ratio-calc',
    name: 'Aspect Ratio Calculator', title: 'Aspect Ratio Calculator and Resize Preview | KatakataLab',
    description: 'Calculate a missing width or height from any aspect ratio, detect common ratios, swap orientation, and preview the result for video, images, CSS, and responsive layouts.',
    category: 'DeveloperApplication',
    intro: 'Use this calculator when an image, video, embed, or CSS box must keep the same proportions at a new size. Enter a ratio and either width or height; the missing dimension is calculated immediately and the preview helps catch an accidental portrait or landscape orientation.',
    steps: ['Enter the ratio as two positive values, such as 16 and 9, or use detection when you already know both pixel dimensions.', 'Enter either the target width or height. The paired dimension updates from the exact ratio and is rounded for practical pixel output.', 'Swap orientation when moving between landscape and portrait, then verify the receiving platform does not apply an additional crop.'],
    limits: 'A matching ratio does not guarantee that text or faces remain visible after a platform crop. The displayed pixel value is a geometric calculation, not a compression or image-quality estimate. For CSS layouts, consider using the native aspect-ratio property and allow the container width to remain responsive.',
    privacy: 'All numbers are calculated locally. No dimensions or project data are transmitted to KatakataLab.',
    startMarker: '<article class="article-content">',
    replacements: [
      ['アスペクト比計算｜片方の辺からもう片方のピクセルを出す', 'Aspect Ratio Calculator | Find the missing pixel dimension'],
      ['片方の幅または高さから、もう片方のピクセルを計算します。画像ファイルの読み込みや切り抜きはしません。ピクセル計算と枠プレビューの道具です。', 'Calculate the missing width or height in pixels. This page does not load or crop image files. It is a pixel calculator with a frame preview.'],
      ['アスペクト比計算ツール', 'Aspect Ratio Calculator'],
      ['アスペクト比<span class="accent">計算</span>', 'Aspect Ratio <span class="accent">Calc</span>'],
      ['片方の辺からもう片方のピクセルを出します。画像ファイルの読み込みや切り抜きはしません。ピクセル計算と枠プレビューの道具です。', 'Enter one side to get the other in pixels. This page does not load or crop images. It is a pixel calculator with a frame preview.'],
      ['(比率)', '(ratio)'],
      ['比率を手動逆算', 'Detect ratio from dimensions'],
      ['入力サイズから比率を逆算', 'Detect ratio from dimensions'],
      ['(解像度 px)', '(resolution in px)'],
      ['操作説明：幅・高さ・比欄の動き', 'How width, height, and the ratio fields work'],
      ['幅を変えると高さが出る', 'Changing width updates height'],
      ['初期状態ではサイズを入れても比は固定', 'By default, entering a size keeps the ratio locked'],
      ['サイズを入れても比は固定', 'Entering a size keeps the ratio locked'],
      ['「比率固定 ON」のあいだは、幅や高さを変えても比欄はいま選んでいる比率のままです。黄金比など小数の比も、固定中は整数比に化けません。ピクセルは整数に丸めます。「比率固定 OFF」にすると、幅と高さから比を追従して出し直します。', 'While Ratio lock is ON, changing width or height keeps the current ratio. Decimal ratios such as the golden ratio stay as-is while locked. Pixel values are rounded to whole numbers. Turning Ratio lock OFF rebuilds the ratio from width and height.'],
      ['幅や高さを変えても、比欄はいま選んでいる比率のままです。黄金比など小数の比も、サイズ入力だけでは整数比に化けません。ピクセルは整数に丸めます。', 'Changing width or height keeps the current ratio. Decimal ratios such as the golden ratio are not reduced to integers until you detect the ratio. Pixel values are rounded to whole numbers.'],
      ['初期状態は「比率固定 ON」です。比率を入れると、幅から高さ（またはその逆）のピクセルを計算します。固定中はサイズを変えても比は変わりません。', 'Ratio lock starts ON. Enter a ratio to calculate the missing pixel dimension. While locked, changing a size does not change the ratio.'],
      ['比率を入れると、幅から高さ（またはその逆）のピクセルを計算します。サイズを変えても比は固定されたままです。', 'Enter a ratio to calculate the missing pixel dimension. Changing a size keeps the ratio locked.'],
      ['「入力サイズから比率を逆算」を押すか「比率固定」を OFF にすると、いまの幅と高さから比を出し直します。定番比率に近い場合は目安も出ます。', 'Use Detect ratio from dimensions or turn Ratio lock OFF to rebuild the ratio from the current width and height. Close matches to common ratios are shown as a hint.'],
      ['「比率を手動逆算」を押すと、いまの幅と高さから比を出し直します。定番比率に近い場合は目安も出ます。', 'Use Detect ratio from dimensions to rebuild the ratio from the current width and height. Close matches to common ratios are shown as a hint.'],
      ['「入力サイズから比率を逆算」ボタンの意味', 'What Detect ratio from dimensions does'],
      ['「比率を手動逆算」ボタンの意味', 'What Detect ratio from dimensions does'],
      ['いま入っている幅と高さから、最大公約数で比を出し直し、比率固定を OFF にします。サイズ入力のあと、比へ明示的に戻したいときに使います。画像ファイルを読み込んで比を検出する機能ではありません。', 'It rebuilds the ratio from the current width and height using their greatest common divisor, and turns Ratio lock OFF. Use it when you want the ratio fields to follow the sizes. It does not load an image file to detect a ratio.'],
      ['Monitor / Phone / Cinema は装飾枠', 'Monitor, Phone, and Cinema are decorative frames'],
      ['ほぼ 16:9 (YouTube等) の比率です！', 'Close to 16:9, a common video ratio.'],
      ['比率プリセット', 'Ratio presets'],
      ['縦横を入れ替え', 'Swap width and height'],
      ['縦横入れ替え', 'Swap orientation'],
      ['表示フレーム切り替え', 'Preview frame'],
      ['PCモニター表示', 'Desktop frame'],
      ['スマホ表示', 'Phone frame'],
      ['シネマスコープ表示', 'Cinema frame'],
    ],
  },
  {
    source: 'px-rem-converter/index.html', output: 'px-rem-converter/en/index.html', slug: 'px-rem-converter',
    name: 'PX to REM Converter', title: 'PX to REM Converter with CSS Scale Table | KatakataLab',
    description: 'Convert pixels and rem units in both directions, change the root font size, preview readable text, and copy CSS variables, SCSS variables, or utility-class output.',
    category: 'DeveloperApplication',
    intro: 'REM units scale from the document root and are useful for type and spacing systems that respect user settings. This converter handles both directions, makes the root size explicit, and turns selected values into reusable CSS, SCSS, or class snippets.',
    steps: ['Confirm the root size used by your project. The browser default is commonly 16 px, but your stylesheet may override it.', 'Enter a pixel or rem value; the other field updates from value ÷ root or value × root.', 'Add recurring sizes to the reference table, choose an output format, and copy the generated tokens into your project.'],
    limits: 'Changing the root to 10 px for easier arithmetic can reduce expected browser scaling if implemented carelessly. Do not treat px as physically identical across screens. Test zoom, user font-size preferences, and long translated copy before adopting a scale.',
    privacy: 'Conversions and custom scale values stay in the browser. The page does not upload your CSS or input values.',
    startMarker: '<section class="article-content">',
    replacements: [['PX to REM 変換ラボ｜Web制作・デザイナー向け計算ツール - KatakataLab', 'PX to REM Converter'], ['px / rem 変換', 'PX to REM Converter'], ['Webデザイナー・開発者のための単位変換ラボ', 'Unit converter for designers and developers'], ['基準サイズ (Root HTML):', 'Root font size:'], ['よく使う基準', 'Common root sizes'], ['基準を16pxにする', 'Set root to 16 px'], ['基準を10pxにする', 'Set root to 10 px'], ['ブラウザの既定はだいたい <strong>16px = 1rem</strong> です。root を 10 にすると <strong>14px = 1.4rem</strong> になります。', 'Browsers commonly default to <strong>16px = 1rem</strong>. If the root is 10, <strong>14px = 1.4rem</strong>.'], ['<code>font-size: 62.5%</code> は「ユーザー既定の 62.5%」なので、既定が 16px なら約 10px、ユーザーが 20px なら 12.5px です。<code>font-size: 10px</code> 固定とは別です。', '<code>font-size: 62.5%</code> is 62.5% of the user’s default. At 16px that is about 10px; at 20px it is 12.5px. That is not the same as <code>font-size: 10px</code>.'], ['このページの基準入力には、プロジェクトの実際の root を入れてください。', 'Put your project’s actual root in this page’s base-size field.'], ['(絶対サイズ・ピクセル)', '(absolute pixel value)'], ['(相対サイズ・レム)', '(root-relative rem value)'], ['見た目の確認', 'Size preview'], ['表示中:', 'Current size:'], ['プレビュー箱の文字サイズはこのページの基準値です。本文は箱を擬似ルートにした rem 相当（親基準の em）で見せています。本物の rem は文書の html を見ます。これはこのページの基準値での見た目です。OSの文字サイズ変更そのものではありません。', 'The preview box uses this page’s root size. The sample text uses em against that box, as a rem-like demo. Real rem looks at the document html. This shows size at this page’s root value. It is not the same as changing the OS text size.'], ['コピーは主要サイズのみ（早見表の全行ではありません）', 'Copy includes common sizes only, not every row in the table.'], ['あのイーハトーヴォ的のすきとおった風、夏でも底に冷たさをもつ青いそら... (編集可能)', 'Preview text: edit this sentence to test the selected size and readability.'], ['CSS変数 (--fs-16)', 'CSS variable (--fs-16)'], ['SCSS変数 ($fs-16)', 'SCSS variable ($fs-16)'], ['CSSクラス (.text-16)', 'CSS class (.text-16)'], ['コードをコピー', 'Copy code'], ['早見表にサイズを追加する：', 'Add a size to the reference table:'], ['リストに追加', 'Add to table'], ['↩ リセット', '↩ Reset'], ['基準サイズ (Root HTML)', 'Root font size'], ['変換元のピクセル値 (PX)', 'Pixel value to convert'], ['変換元のレム値 (REM)', 'REM value to convert'], ['クリックしてテキストを自由に変更できます', 'Click to edit the preview text'], ['出力コード形式', 'Output code format'], ['早見表に追加するピクセル値', 'Pixel value to add'], ['早見表をデフォルトに戻す', 'Reset the reference table'], ['早見表をデフォルトのサイズに戻す', 'Restore default reference sizes']],
  },
  {
    source: 'text-diff/index.html', output: 'text-diff/en/index.html', slug: 'text-diff',
    name: 'Browser Text Diff Checker', title: 'Text Diff Checker for Lines and Characters | KatakataLab',
    description: 'Compare two text or code versions in your browser, inspect additions and deletions by line or character, switch split and unified views, and copy the result.',
    category: 'DeveloperApplication',
    intro: 'Compare drafts, configuration files, source snippets, or copied records without creating an account. Line mode is best for structural edits, while character mode helps locate punctuation, spacing, and small wording changes.',
    steps: ['Paste the earlier version into Original and the revised version into New. Avoid adding secrets even though comparison is local.', 'Choose Line or Character granularity and Split or Unified presentation, then run Compare.', 'Move through each highlighted change and copy only the result you actually need. Use a source-control diff for repository history and review.'],
    limits: 'Very large inputs can use substantial browser memory. Line-ending differences, invisible Unicode characters, and normalization can appear as changes even when text looks similar. This tool is for visual comparison; it does not merge files or prove semantic equivalence.',
    privacy: 'Comparison runs in your browser and input text is not sent to KatakataLab for the diff operation. External libraries are loaded as page assets, so do not use any browser tool as a substitute for an approved confidential-data workflow.',
    startMarker: '<article class="article-content">',
    replacements: [['テキスト差分チェックツール｜文章・コード比較【ブラウザ完結】', 'Browser Text Diff Checker'], ['テキスト差分チェック', 'Text Diff Checker'], ['文字 (Char)', 'Character'], ['行 (Line)', 'Line'], ['左右 (Split)', 'Split'], ['統合 (Unified)', 'Unified'], ['🗑 全クリア', '🗑 Clear all'], ['📥 入力をクリアしました', '📥 Inputs cleared'], ['元に戻す (Undo)', 'Undo'], ['Original (変更前)', 'Original'], ['New (変更後)', 'New'], ['完全一致 (Identical)', 'Identical'], ['削除 (Deleted)', 'Deleted'], ['追加 (Added)', 'Added'], ['※ ↵ は改行の変更を表します', '↵ indicates a line-break change.'], ['入力した文章は比較処理のために外部送信しません', 'Input text is not sent out for comparison'], ['ツール操作メニュー', 'Tool actions'], ['文字単位で比較する', 'Compare by character'], ['行単位で比較する', 'Compare by line'], ['左右分割で表示する', 'Show split view'], ['統合ビューで表示する', 'Show unified view'], ['左右のテキストを入れ替え', 'Swap the two inputs'], ['両方の入力を全てクリア', 'Clear both inputs'], ['両方の入力をすべてクリア', 'Clear both inputs'], ['差分を比較 (Ctrl+Enter)', 'Compare (Ctrl+Enter)'], ['Originalに貼り付け', 'Paste into Original'], ['ファイルから読み込み', 'Load from file'], ['Originalのファイルをアップロードする', 'Upload the Original file'], ['ここに元の文章を入力...（テキストファイルのドロップにも対応）', 'Enter the original text or drop a text file'], ['Newに貼り付け', 'Paste into New'], ['Newのファイルをアップロードする', 'Upload the New file'], ['ここに新しい文章を入力...（テキストファイルのドロップにも対応）', 'Enter the revised text or drop a text file'], ['前の差分へ', 'Previous difference'], ['次の差分へ', 'Next difference'], ['差分をコピー', 'Copy differences'], ['編集に戻る', 'Back to editing']],
  },
  {
    source: 'qrcode/index.html', output: 'qrcode/en/index.html', slug: 'qrcode',
    name: 'QR Maker Lab', title: 'Free QR Code Generator with Templates and Checks | KatakataLab',
    description: 'Create QR codes for URLs, Wi-Fi, email, phone, social profiles, and contacts, check contrast and quiet zone quality, then save the result from your browser.',
    category: 'UtilitiesApplication',
    intro: 'Generate a QR code for plain text or a structured template, then check color contrast, margin, error correction, and optional logo coverage before saving. The page includes practical templates for Wi-Fi, email, phone, LINE, social profiles, and vCard contacts.',
    steps: ['Choose the content type and enter only the fields that the recipient needs. Preview the encoded value before distribution.', 'Keep foreground and background contrast high, retain a quiet zone, and use a stronger error-correction level when placing a modest logo.', 'Test the exported code with more than one phone, at the real print or screen size, and under the lighting where it will be used.'],
    limits: 'A QR code that renders successfully is not automatically safe or readable in every context. Dense content creates smaller modules, reflective materials can reduce contrast, and a logo can cover recoverable data. Never encode credentials in a public handout unless disclosure is intended.',
    privacy: 'QR content is generated locally and is not collected for analytics or advertising. The license field is sent only when you explicitly request license verification; that request includes the license key and using domain as described beside the field.',
    startMarker: '<article class="article-content" data-lang-block="ja">',
    replacements: [
      ['JavaScriptを有効にするとQRコードを作成できます。', 'Enable JavaScript to create a QR code.'],
      ['登録不要・基本機能無料・無制限で使えるQR作成ツール', 'No signup · Core features are free · Create without a usage counter'],
      ['データテンプレート', 'Data templates'],
      ['中央ロゴを挿入し、読み取り安全性を自動判定します。', 'Insert a center logo and automatically review likely scan safety.'],
      ['色・サイズ・余白・ロゴ設定を保存して再利用できます。', 'Save and reuse color, size, margin, and logo settings.'],
      ['テンプレートを切り替えなくても、SNS向けQRをすぐ生成できます。', 'Create a social-profile QR without switching away from this panel.'],
      ['`value,name` 形式で複数のQRをまとめて生成できます。', 'Generate multiple QR codes from `value,name` CSV rows.'],
      ['この端末のカメラで、生成結果を読み取りチェックできます。', 'Use this device camera to test the generated result.'],
      ['QRコード作成エリア', 'QR code creation area'], ['基本設定', 'Basic settings'], ['コード色のクイック選択', 'Quick code colors'], ['プレビュー', 'Preview'], ['テンプレートのクイック選択', 'Quick templates'], ['データテンプレート選択', 'Data template selection'], ['モバイル操作バー', 'Mobile action bar'], ['黒', 'Black'], ['赤', 'Red'], ['緑', 'Green'], ['青', 'Blue'], ['紫', 'Purple'], ['茶', 'Brown'],
    ],
  },
  {
    source: 'ogp-simulator/index.html', output: 'ogp-simulator/en/index.html', slug: 'ogp-simulator',
    name: 'Social Share Preview Simulator', title: 'OG Image and Social Share Preview Simulator | KatakataLab',
    description: 'Preview a title, description, site name, and image in X, Facebook, and LINE-style cards, check the image ratio, and catch likely cropping before publishing.',
    category: 'DeveloperApplication',
    intro: 'A social preview can crop a carefully designed image or truncate copy after a platform update. This simulator gives one comparison workspace for common large-card and compact-card layouts so you can inspect hierarchy and safe areas before publishing metadata.',
    steps: ['Choose the exact image you plan to expose through og:image and enter realistic title, description, and site-name text.', 'Compare large and compact cards. Keep critical text and faces away from the outer edge because clients can crop differently.', 'Publish the metadata, then use each platform’s official debugger or a private test post to confirm the fetched result and cache.'],
    limits: 'The previews are approximations, not screenshots from each platform. Clients can change layout, crop rules, typography, caching, and whether a description appears. A successful local preview does not confirm that a crawler can access the public image URL.',
    privacy: 'Selected images are previewed locally and are not uploaded to KatakataLab. The page reads the local file only to display its dimensions and preview.',
    startMarker: '<article class="article-content">',
    replacements: [['OGPシミュレーター｜X(Twitter)・LINE・Facebookの表示確認＆画像比率チェック', 'Social Share Preview Simulator'], ['OGPシミュレーター', 'Social Share Preview'], ['(サムネイル画像)', '(share image)'], ['クリックして画像を選択', 'Click to choose an image'], ['またはここにドロップ', 'or drop it here'], ['@katakata_toybox · 1分', '@katakata_toybox · 1 min'], ['新しいWebツールを公開しました！SNSでシェアしたときのサムネイル（OGP画像）の表示を、本物のタイムラインそっくりに一発確認できます！公開前に見切れをチェックしよう！', 'Preview how a new web tool may look when shared. Check the image crop and copy before publishing.'], ['こちらの記事もおすすめ！タイムライン上でコンパクトに表示される「サマリーカード」の見え方はこちらでシミュレートできます。', 'This compact summary-card view helps you check whether the title remains clear without a large image.'], ['1分前 · 🌐', '1 minute ago · 🌐'], ['ブログの新しい記事を公開しました！Facebookのフィード上でシェアされたとき、どのようなレイアウトでユーザーにアピールできるかを本物そっくりに確認できます。', 'Preview the hierarchy of an article link in a Facebook-style feed before publishing.'], ['👍 いいね！', '👍 Like'], ['💬 コメントする', '💬 Comment'], ['↩️ シェア', '↩️ Share'], ['※ 実際の表示は各アプリのアップデート等により異なる場合があります。', 'Actual layouts can differ after app and platform updates.'], ['画像はサーバーに送信されません', 'Images are not uploaded'], ['OGP設定入力', 'Share metadata inputs'], ['画像をアップロード', 'Upload image'], ['削除', 'Remove'], ['画像を削除', 'Remove image'], ['記事のタイトルを入力...', 'Enter the page title'], ['記事の説明文を入力...', 'Enter the page description'], ['プレビュー表示', 'Preview'], ['ダークモード切り替え', 'Toggle dark mode']],
  },
]);

function replaceAllExact(html, replacements) {
  let output = html;
  const ordered = [...COMMON_REPLACEMENTS, ...replacements]
    .sort(([left], [right]) => right.length - left.length);
  for (const [from, to] of ordered) output = output.split(from).join(to);
  return output;
}

function flattenMessages(value, prefix = '', result = new Map()) {
  if (!value || typeof value !== 'object') return result;
  for (const [key, child] of Object.entries(value)) {
    const messageKey = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') result.set(messageKey, child);
    else flattenMessages(child, messageKey, result);
  }
  return result;
}

function qrDictionaryReplacements() {
  const script = fs.readFileSync(path.join(repositoryRoot, 'qrcode/script.js'), 'utf8');
  const prefix = 'const I18N = ';
  const start = script.indexOf(prefix);
  const resolveStart = script.indexOf('const resolveMessage', start);
  const end = script.lastIndexOf(';', resolveStart);
  if (start < 0 || end < 0) throw new Error('QRの日英辞書を読み取れません');
  const dictionary = vm.runInNewContext(`(${script.slice(start + prefix.length, end)})`, Object.create(null), { timeout: 1000 });
  const japanese = flattenMessages(dictionary.ja);
  const english = flattenMessages(dictionary.en);
  if (japanese.size !== english.size) throw new Error('QRの日英辞書の構造が一致しません');
  return [...japanese].map(([key, message]) => {
    if (!english.has(key)) throw new Error(`QR英語辞書にキーがありません: ${key}`);
    return [message, english.get(key)];
  });
}

function replaceMeta(html, attribute, key, value) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\s+${attribute}="${escaped}"\\s+content="[^"]*"\\s*\\/?>`, 'i');
  return html.replace(pattern, `<meta ${attribute}="${key}" content="${value}">`);
}

function schema(config) {
  return `<script type="application/ld+json">
  ${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebApplication', name: config.name,
    url: `https://katakatalab.com/${config.slug}/en/`, description: config.description,
    applicationCategory: config.category, operatingSystem: 'Any', inLanguage: 'en',
    isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Person', name: 'Katakata' }, dateModified: UPDATED,
  }, null, 2)}
  </script>`;
}

function englishShellStylesheet() {
  return `<link rel="stylesheet" href="/international/english-shell.css?v=${ENGLISH_SHELL_VERSION}">`;
}

function editorialHeadAssets() {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
${englishShellStylesheet()}
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<meta name="theme-color" content="#ff7675">`;
}

function addBodyClasses(html, classNames) {
  return html.replace(/<body([^>]*)>/i, (bodyTag, attributes) => {
    const classAttribute = attributes.match(/\sclass="([^"]*)"/i);
    if (!classAttribute) return `<body class="${classNames.join(' ')}"${attributes}>`;
    const merged = [...new Set([...classAttribute[1].split(/\s+/).filter(Boolean), ...classNames])].join(' ');
    return `<body${attributes.replace(classAttribute[0], ` class="${merged}"`)}>`;
  });
}

function siteHeader(links) {
  const navigation = links.map(({ href, label, ...attributes }) => {
    const serializedAttributes = Object.entries(attributes)
      .map(([name, value]) => ` ${name}="${value}"`)
      .join('');
    return `<a href="${href}"${serializedAttributes}>${label}</a>`;
  }).join('');

  return `<header class="english-site-header">
  <div class="english-site-header__inner">
    <a class="english-site-brand" href="/en/"><img src="/icon.svg" alt="" width="34" height="34"><strong>Katakata<span>Lab</span></strong></a>
    <nav class="english-site-nav" aria-label="Primary">${navigation}</nav>
  </div>
</header>`;
}

function siteFooter() {
  return `<footer class="english-site-footer">
  <nav class="english-site-footer__links" aria-label="Site information">
    <a href="/en/">English tools</a>
    <a href="/en/site-information.html">Site information</a>
    <a href="/privacy.html">Privacy (Japanese)</a>
    <a href="/terms.html">Terms (Japanese)</a>
    <a href="/contact.html">Contact</a>
  </nav>
  <p>© 2026 KatakataLab</p>
</footer>`;
}

function toolNavigation(config, japanese) {
  const isQr = config.slug === 'qrcode';
  const japaneseLink = isQr
    ? ''
    : `\n  <a href="${japanese}" hreflang="ja" lang="ja">Japanese version</a>`;
  const homeLabel = isQr ? '🧪 KatakataLab English' : '🧪 English tool index';
  return `<nav class="english-tool-bar" aria-label="Language and English tools">
  <a class="english-tool-bar__home" href="https://katakatalab.com/en/">${homeLabel}</a>${japaneseLink}
</nav>`;
}

function article(config) {
  const steps = config.steps.map((step) => `<li>${step}</li>`).join('\n');
  return `<section class="article-content english-content" aria-labelledby="english-guide-title">
    <header>
      <p><strong>Created by Katakata</strong> · Last reviewed <time datetime="${UPDATED}">July 16, 2026</time></p>
      <h2 id="english-guide-title">How to use ${config.name}</h2>
      <p>${config.intro}</p>
    </header>
    <section>
      <h3>Practical workflow</h3>
      <ol>${steps}</ol>
    </section>
    <section>
      <h3>Accuracy and limitations</h3>
      <p>${config.limits}</p>
    </section>
    <section>
      <h3>Privacy and data handling</h3>
      <p>${config.privacy}</p>
    </section>
    <section>
      <h3>Why this page exists</h3>
      <p>KatakataLab publishes small browser tools built from recurring design and development tasks. This English page is maintained as a complete entry point, not as an automatic translation or a doorway page. If a control, explanation, or result is unclear, use the <a href="https://katakatalab.com/contact.html">contact page</a> and include the tool name, browser, and expected result without sending confidential input.</p>
      <p>For another workflow, browse the <a href="https://katakatalab.com/en/">English tool index</a> or switch to the <a href="https://katakatalab.com/${config.slug}/" hreflang="ja" lang="ja">Japanese version</a>.</p>
    </section>
  </section>`;
}

function englishFooter() {
  return `<!-- Auto-Injected Unified Footer -->
<footer class="tool-footer" aria-label="Site information">
  <a href="https://katakatalab.com/en/">🧪 KatakataLab English</a><span class="tool-footer__separator" aria-hidden="true">|</span>
  <a href="https://katakatalab.com/en/site-information.html">Site information</a><span class="tool-footer__separator" aria-hidden="true">|</span>
  <a href="https://katakatalab.com/contact.html">Contact</a><span class="tool-footer__separator" aria-hidden="true">|</span>
  <a href="https://katakatalab.com/privacy.html">Privacy (Japanese)</a><span class="tool-footer__separator" aria-hidden="true">|</span>
  <a href="https://katakatalab.com/terms.html">Terms (Japanese)</a>
</footer>`;
}

function localizeTool(config) {
  let html = fs.readFileSync(path.join(repositoryRoot, config.source), 'utf8');
  const canonical = `https://katakatalab.com/${config.slug}/en/`;
  const japanese = `https://katakatalab.com/${config.slug}/`;
  html = html.replace(/<html\s+lang="ja"/i, '<html lang="en"');
  // 完成済み英語ツールは独立した検索入口として公開する。
  // 強調線メーカーだけは日本語本体と同じく審査用noindexを維持する。
  if (config.slug === 'emphasis-lines') {
    if (/<meta\s+name=["']robots["']/i.test(html)) {
      html = html.replace(/<meta\s+name=["']robots["'][^>]*>/i, '<meta name="robots" content="noindex, follow">');
    } else {
      html = html.replace(/(<meta\s+charset=[^>]*>)/i, '$1\n    <meta name="robots" content="noindex, follow">');
    }
  } else {
    html = html.replace(/\s*<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex[^"']*["'][^>]*>\s*/i, '\n  ');
  }
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${config.title}</title>`);
  html = replaceMeta(html, 'name', 'description', config.description);
  html = replaceMeta(html, 'property', 'og:title', config.title);
  html = replaceMeta(html, 'property', 'og:description', config.description);
  html = replaceMeta(html, 'property', 'og:url', canonical);
  html = replaceMeta(html, 'name', 'twitter:title', config.title);
  html = replaceMeta(html, 'name', 'twitter:description', config.description);
  html = html.replace(/\s*<link rel="alternate" hreflang="(?:ja|en|x-default)" href="[^"]+">/gi, '');
  html = html.replace(/<link rel="canonical" href="[^"]+">/i, `<link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="ja" href="${japanese}">
  <link rel="alternate" hreflang="en" href="${canonical}">
  <link rel="alternate" hreflang="x-default" href="${japanese}">`);
  html = html.replace(/(<meta\s+name="viewport"[^>]*>)/i, `$1
  <base href="/${config.slug}/">`);
  html = html.replace('</head>', `  ${englishShellStylesheet()}\n</head>`);
  html = html.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i, schema(config));
  html = html.replace(/<script\b[^>]*pagead2\.googlesyndication\.com[\s\S]*?<\/script>\s*/gi, '');
  const replacements = config.slug === 'qrcode'
    ? [...config.replacements, ...qrDictionaryReplacements()]
    : config.replacements;
  html = replaceAllExact(html, replacements);

  const footerMarker = '<!-- Auto-Injected Unified Footer -->';
  const footerIndex = html.indexOf(footerMarker);
  if (footerIndex < 0) throw new Error(`共通フッターが見つかりません: ${config.source}`);

  if (config.startMarker) {
    const startIndex = html.indexOf(config.startMarker);
    if (startIndex < 0 || startIndex >= footerIndex) throw new Error(`英語本文の置換位置が不正です: ${config.source}`);
    const containerClose = config.slug === 'px-rem-converter' ? '</article>' : '</main>';
    html = `${html.slice(0, startIndex)}${article(config)}\n${containerClose}\n  ${html.slice(footerIndex)}`;
  } else {
    const mainEnd = html.lastIndexOf('</main>', footerIndex);
    if (mainEnd < 0) throw new Error(`main終端が見つかりません: ${config.source}`);
    html = `${html.slice(0, mainEnd + 7)}\n${article(config)}\n${html.slice(footerIndex)}`;
  }

  const currentFooterStart = html.indexOf(footerMarker);
  const footerEnd = html.indexOf('</footer>', currentFooterStart);
  if (footerEnd < 0) throw new Error(`フッター終端が見つかりません: ${config.source}`);
  html = `${html.slice(0, currentFooterStart)}${englishFooter()}${html.slice(footerEnd + 9)}`;
  html = html.replace('</body>', '  <script src="/international/english-runtime.js" defer></script>\n</body>');
  html = addBodyClasses(html, ['english-tool-page', `english-tool--${config.slug}`]);
  html = html.replace(/<body([^>]*)>/i, `<body$1>\n  ${toolNavigation(config, japanese)}`);

  if (config.slug === 'emphasis-lines') {
    html = html.replace(/href="guide\.html"/g, 'href="/emphasis-lines/guide.html"');
  }

  return html;
}

function hubPage() {
  const cards = TOOL_CONFIGS.map((tool) => `<article class="english-tool-card"><h2><a href="/${tool.slug}/en/">${tool.name}</a></h2><p>${tool.description}</p><a class="english-card-action" href="/${tool.slug}/en/">Open tool →</a></article>`).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Free Browser Tools in English | KatakataLab</title>
<meta name="description" content="Use KatakataLab’s English browser tools for design, text comparison, QR codes, responsive sizing, web fonts, and social previews without creating an account.">
<link rel="canonical" href="https://katakatalab.com/en/"><link rel="alternate" hreflang="ja" href="https://katakatalab.com/"><link rel="alternate" hreflang="en" href="https://katakatalab.com/en/"><link rel="alternate" hreflang="x-default" href="https://katakatalab.com/"><meta property="og:title" content="Free Browser Tools in English | KatakataLab"><meta property="og:description" content="Focused browser tools with practical explanations, limitations, privacy notes, and no signup."><meta property="og:type" content="website"><meta property="og:url" content="https://katakatalab.com/en/">
${editorialHeadAssets()}
<script type="application/ld+json">${JSON.stringify({ '@context':'https://schema.org','@type':'CollectionPage',name:'KatakataLab English Browser Tools',url:'https://katakatalab.com/en/',description:'English browser tools for design and development workflows.',inLanguage:'en',dateModified:HUB_UPDATED,author:{'@type':'Person',name:'Katakata'} })}</script></head>
<body class="english-site-shell english-hub-page">${siteHeader([
  { href: '/', label: 'Japanese home', hreflang: 'ja', lang: 'ja' },
  { href: '/en/site-information.html', label: 'Site information' },
  { href: '/contact.html', label: 'Contact' },
])}
<main class="english-site-main english-site-main--hub"><section class="english-hero"><p class="english-eyebrow">KatakataLab · English</p><h1>Small browser tools for real production tasks.</h1><p class="english-lead">These tools grew from recurring design and development work: calculating a crop, comparing copy, testing a Japanese font, building a QR code, or checking how a social card may be trimmed. Each page includes the working tool, a practical workflow, limitations, and a plain-language data-handling note.</p></section>
<section aria-labelledby="tools-title"><h2 class="english-section-title" id="tools-title">Choose a tool</h2><div class="english-tool-grid">${cards}<article class="english-tool-card"><h2><a href="/guides/en/social-image-sizes.html">Social image size guide</a></h2><p>Use current working ratios for link previews and thumbnails, understand which values are platform guidance, and plan a central safe area for unpredictable crops.</p><a class="english-card-action" href="/guides/en/social-image-sizes.html">Read guide →</a></article><article class="english-tool-card"><h2><a href="/guides/en/password-security.html">Password security guide</a></h2><p>Choose unique passwords, use a manager safely, understand current NIST guidance, and avoid treating complexity rules as a substitute for length and phishing resistance.</p><a class="english-card-action" href="/guides/en/password-security.html">Read guide →</a></article></div></section>
<section class="english-notes"><h2>What visitors can expect</h2><p>Each English page is a complete entry point with a working tool, a practical workflow, known limitations, and a clear path back to the Japanese version. The site does not redirect visitors by browser language, so saved URLs remain predictable.</p><p>Tool inputs are handled as described on each page. Pages may still load fonts, analytics, or libraries, so never paste credentials, private customer records, or regulated data into an unapproved web tool.</p><p>Last editorial review: <time datetime="${HUB_UPDATED}">${HUB_UPDATED_LABEL}</time>. Created and maintained by Katakata. Corrections are welcome through the <a href="/contact.html">contact page</a>.</p></section></main>
${siteFooter()}</body></html>`;
}

function socialGuidePage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Social Image Sizes and Safe-Area Guide (2026) | KatakataLab</title><meta name="description" content="Plan social share images and video thumbnails with practical 1.91:1, 16:9, square, and vertical working sizes, source-backed notes, and crop-safe design checks.">
<link rel="canonical" href="https://katakatalab.com/guides/en/social-image-sizes.html"><link rel="alternate" hreflang="ja" href="https://katakatalab.com/guides/sns-image-size-guide.html"><link rel="alternate" hreflang="en" href="https://katakatalab.com/guides/en/social-image-sizes.html"><link rel="alternate" hreflang="x-default" href="https://katakatalab.com/guides/sns-image-size-guide.html">
<meta property="og:title" content="Social Image Sizes and Safe-Area Guide (2026)"><meta property="og:description" content="Source-backed working sizes and a safer workflow for social link images and thumbnails."><meta property="og:type" content="article"><meta property="og:url" content="https://katakatalab.com/guides/en/social-image-sizes.html">
${editorialHeadAssets()}
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Article',headline:'Social Image Sizes and Safe-Area Guide',url:'https://katakatalab.com/guides/en/social-image-sizes.html',inLanguage:'en',dateModified:UPDATED,author:{'@type':'Person',name:'Katakata'},publisher:{'@type':'Organization',name:'KatakataLab'}})}</script></head>
<body class="english-site-shell english-guide-page">${siteHeader([
  { href: '/en/', label: 'English tools' },
  { href: '/guides/sns-image-size-guide.html', label: '日本語', hreflang: 'ja', lang: 'ja' },
  { href: '/en/site-information.html', label: 'Site information' },
])}<main class="english-site-main english-article-main"><header class="english-article-hero"><p class="english-article-meta">Created by Katakata · Reviewed <time datetime="${UPDATED}">July 16, 2026</time></p><h1>Social image sizes: use ratios first, pixels second</h1><p>Platform layouts change, and the same link can be shown as a large card, compact card, notification, or cropped mobile tile. A reliable workflow starts with the intended aspect ratio, keeps critical content in a central safe area, and verifies the published URL with the platform’s current preview or debugger.</p></header>
<article class="english-article-body"><h2>Practical working sizes</h2><table><thead><tr><th>Use</th><th>Working canvas</th><th>What the source supports</th></tr></thead><tbody>
<tr><td>General Open Graph / large link card</td><td><strong>1200 × 630</strong> (about 1.91:1)</td><td>LinkedIn documents 1.91:1 and 1200 × 627 for a custom Page post preview. 1200 × 630 is a practical cross-site working canvas, not a guarantee that every client uses the full image.</td></tr>
<tr><td>LinkedIn image post</td><td><strong>1080 px wide</strong>; ratio from 3:1 to 4:5</td><td>LinkedIn recommends 1080 px width for photo posts, accepts ratios from 3:1 through 4:5, and warns that wider ratios are centered and cropped.</td></tr>
<tr><td>YouTube video thumbnail</td><td><strong>3840 × 2160</strong> or another high-resolution 16:9 image</td><td>YouTube currently recommends 3840 × 2160, a minimum width of 640, and the 16:9 ratio commonly used by players and previews. Vertical-video surfaces can replace it with an auto-generated 4:5 thumbnail.</td></tr>
<tr><td>Square reusable asset</td><td><strong>1080 × 1080</strong> (1:1)</td><td>A square master is convenient for image-first posts, but it is not a substitute for link-preview testing. Keep important content away from the edges.</td></tr>
<tr><td>Vertical feed asset</td><td><strong>1080 × 1350</strong> (4:5)</td><td>4:5 makes better use of vertical feed space on many clients. LinkedIn accepts up to 4:5 for photo posts; other platforms should be checked in their current composer.</td></tr></tbody></table>
<p class="note"><strong>Do not treat this table as a permanent platform contract.</strong> The first three rows distinguish official current guidance from KatakataLab’s practical cross-platform canvas. For platforms without stable public specifications, verify in the actual publishing flow.</p>
<h2>Safe-area workflow</h2><ol><li>Choose a ratio for the primary destination and make a separate export when the second destination uses a meaningfully different crop.</li><li>Keep the logo, face, and main phrase inside roughly the central 80% of the canvas. This is a design buffer, not an official platform measurement.</li><li>Use short, high-contrast text. Metadata can be truncated independently of the image, so the graphic should not require the full description to make sense.</li><li>Compress the final file without making small text or gradients visibly blocky. Confirm that the public image URL returns successfully to logged-out crawlers.</li><li>After publishing, inspect a real share. Cached previews may require the platform’s refresh/debug tool before a changed image appears.</li></ol>
<h2>Metadata checklist</h2><pre><code>&lt;meta property="og:title" content="A specific page title"&gt;
&lt;meta property="og:description" content="A useful summary"&gt;
&lt;meta property="og:image" content="https://example.com/share.jpg"&gt;
&lt;meta property="og:image:width" content="1200"&gt;
&lt;meta property="og:image:height" content="630"&gt;
&lt;meta name="twitter:card" content="summary_large_image"&gt;</code></pre><p>Use an absolute HTTPS image URL, provide meaningful alt text where supported, and avoid using a generic site-wide image for every article. The visible page title and share metadata should describe the same content.</p>
<h2>Sources and scope</h2><ul><li><a href="https://www.linkedin.com/help/linkedin/answer/a566445">LinkedIn Help: custom Page post preview</a> — 1.91:1 and 1200 × 627.</li><li><a href="https://www.linkedin.com/help/linkedin/answer/a527229/share-photos-or-videos?lang=en">LinkedIn Help: share photos</a> — width, file size, and accepted ratio range.</li><li><a href="https://support.google.com/youtube/answer/72431">YouTube Help: custom thumbnails</a> — current resolution, format, and ratio guidance.</li></ul><p>This page does not claim a single pixel size is universally optimal. It records the sources reviewed on the date above and explains a resilient production process.</p>
<h2>Related tools</h2><p class="tools"><a href="/ogp-simulator/en/">Social preview simulator</a><a href="/aspect-ratio-calc/en/">Aspect ratio calculator</a><a href="/emphasis-lines/en/">Emphasis lines generator</a></p></article></main>
${siteFooter()}</body></html>`;
}

function passwordSecurityGuidePage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Password Security Guide: Length, Uniqueness, and Storage | KatakataLab</title><meta name="description" content="A practical password security guide covering unique passwords, length, password managers, multi-factor authentication, and current NIST guidance.">
<link rel="canonical" href="https://katakatalab.com/guides/en/password-security.html"><link rel="alternate" hreflang="ja" href="https://katakatalab.com/guides/password-guide.html"><link rel="alternate" hreflang="en" href="https://katakatalab.com/guides/en/password-security.html"><link rel="alternate" hreflang="x-default" href="https://katakatalab.com/guides/password-guide.html">
<meta property="og:title" content="Password Security Guide: Length, Uniqueness, and Storage | KatakataLab"><meta property="og:description" content="A practical guide to unique passwords, safer storage, password managers, and multi-factor authentication."><meta property="og:type" content="article"><meta property="og:url" content="https://katakatalab.com/guides/en/password-security.html"><meta property="og:site_name" content="KatakataLab"><meta name="twitter:card" content="summary_large_image">
${editorialHeadAssets()}
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Article',headline:'Password Security Guide: Length, Uniqueness, and Storage',url:'https://katakatalab.com/guides/en/password-security.html',inLanguage:'en',dateModified:PASSWORD_GUIDE_UPDATED,author:{'@type':'Person',name:'Katakata'},publisher:{'@type':'Organization',name:'KatakataLab'}})}</script></head>
<body class="english-site-shell english-guide-page">${siteHeader([
  { href: '/en/', label: 'English tools' },
  { href: '/guides/password-guide.html', label: '日本語', hreflang: 'ja', lang: 'ja' },
  { href: '/en/site-information.html', label: 'Site information' },
])}<main class="english-site-main english-article-main"><header class="english-article-hero"><p class="english-article-meta">Created by Katakata · Reviewed <time datetime="${PASSWORD_GUIDE_UPDATED}">July 22, 2026</time></p><h1>Password security: make the safe choice easier to repeat</h1><p>Password security is less about inventing a clever string and more about preventing reuse, storing credentials safely, and adding another factor when an account supports it. This guide is educational, not an account-recovery or security-monitoring service.</p></header>
<article class="english-article-body"><p class="note"><strong>Short version:</strong> use a different password for every important service, prefer a long randomly generated value, store it in a password manager, and enable multi-factor authentication or a passkey where available. Never paste an existing password into a tool just to test it.</p>
<h2>Length and uniqueness come first</h2><p>A password that is reused across services creates a chain reaction: one service breach or phishing page can expose access to another account. A long password or passphrase is useful, but it does not compensate for reuse. Generate a separate value for email, finance, work, social accounts, and other services that matter.</p><p>Current NIST SP 800-63B guidance says verifiers should require at least 15 characters when a password is used as a single-factor authentication mechanism, permit at least 64 characters, and avoid arbitrary composition rules as the main security control. These are requirements for services and verifiers, not a promise that every website follows them.</p>
<h2>Use a manager instead of memorizing everything</h2><ol><li>Choose a password manager with a master credential or passkey that you can protect.</li><li>Generate a unique random password for each service and let the manager fill it when possible.</li><li>Keep recovery codes in a separate, protected place and decide how a trusted person could help if you lose access.</li><li>Review old reused passwords first, beginning with email, financial accounts, cloud storage, and administrator accounts.</li></ol><p>Password managers make unique passwords practical. They also mean the master credential and recovery process deserve extra care: protect them, keep software updated, and do not approve unexpected sign-in prompts.</p>
<h2>Passwords are not phishing-resistant</h2><p>A strong password can still be entered into a convincing fake login page. Multi-factor authentication reduces the damage of a stolen password, while passkeys are designed to resist many phishing flows. Enable the strongest practical option offered by the service, and verify the domain before entering credentials.</p>
<h2>What KatakataLab can and cannot do</h2><p>The Japanese password generator linked below can create values in the browser and provides local handling notes. A browser-side tool does not make every surrounding action safe: clipboard history, screenshots, browser extensions, device malware, and account recovery settings still matter. Do not use a public page to inspect an existing secret.</p><p><a href="/password-generator/" hreflang="ja" lang="ja">Open the password generator (Japanese)</a></p>
<h2>Sources and scope</h2><p>This guide was reviewed on July 22, 2026. For the normative details behind the length and composition discussion, read <a href="https://pages.nist.gov/800-63-4/sp800-63b/authenticators/" rel="noopener noreferrer">NIST SP 800-63B, Authenticators</a>. Provider policies and phishing threats change, so check the current security guidance for the service you use.</p></article></main>
${siteFooter()}</body></html>`;
}

function siteInformationPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>English Site Information | KatakataLab</title><meta name="description" content="Operator, editorial, privacy, advertising, and contact notes for the English section of KatakataLab."><link rel="canonical" href="https://katakatalab.com/en/site-information.html">${editorialHeadAssets()}</head><body class="english-site-shell english-information-page">${siteHeader([
    { href: '/en/', label: 'English tools' },
    { href: '/', label: 'Japanese home', hreflang: 'ja', lang: 'ja' },
    { href: '/contact.html', label: 'Contact' },
  ])}<main class="english-site-main english-article-main"><header class="english-article-hero"><p class="english-breadcrumb"><a href="/en/">← English tools</a></p><h1>Site information</h1><p>KatakataLab is a personal web-tool project created and maintained by Katakata in Japan. The English section provides focused browser utilities and explanatory material for international visitors.</p></header><article class="english-article-body"><h2>Editorial policy</h2><p>Tool pages describe their intended workflow, limitations, and data handling. Dates indicate the latest editorial review, not a promise that every third-party platform remains unchanged. Corrections can be sent through the contact page.</p><h2>Privacy and data handling</h2><p>Tool-specific input handling is described on each page. Pages may still load fonts, analytics, or libraries, and normal analytics may process page-view and device information. Never paste credentials, private customer records, or regulated data into an unapproved web tool. The authoritative site privacy policy and terms are currently published in Japanese.</p><h2>Contact and governing pages</h2><ul><li><a href="/who-is-katakata.html">Operator profile (Japanese)</a></li><li><a href="/privacy.html">Privacy policy (Japanese)</a></li><li><a href="/terms.html">Terms of use (Japanese)</a></li><li><a href="/contact.html">Contact</a></li></ul><p>Last reviewed: <time datetime="${HUB_UPDATED}">${HUB_UPDATED_LABEL}</time>.</p></article></main>${siteFooter()}</body></html>`;
}

function writePage(outputRoot, relativePath, content) {
  const outputPath = path.join(outputRoot, relativePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${content.trim()}\n`, 'utf8');
}

function resolveEnglishOutputRoot(outputRoot) {
  if (typeof outputRoot !== 'string' || !outputRoot.trim()) {
    throw new TypeError('英語ページ生成は出力先ディレクトリを明示してください');
  }
  const resolved = path.resolve(outputRoot);
  if (resolved === repositoryRoot) {
    throw new Error('レビュー済み英語HTMLが正本です。リポジトリ直下への再生成はしないでください');
  }
  return resolved;
}

function generateEnglishPages(outputRoot) {
  const targetRoot = resolveEnglishOutputRoot(outputRoot);
  for (const config of TOOL_CONFIGS) writePage(targetRoot, config.output, localizeTool(config));
  writePage(targetRoot, 'en/index.html', hubPage());
  writePage(targetRoot, 'en/site-information.html', siteInformationPage());
  writePage(targetRoot, 'guides/en/social-image-sizes.html', socialGuidePage());
  writePage(targetRoot, 'guides/en/password-security.html', passwordSecurityGuidePage());
  return { tools: TOOL_CONFIGS.length, pages: TOOL_CONFIGS.length + 4 };
}

if (require.main === module) {
  try {
    const outputRoot = process.argv[2];
    if (!outputRoot) {
      throw new Error('使い方: node scripts/generate-english-pages.cjs <preview-output-dir>。公開用HTMLは直接再生成しません');
    }
    const result = generateEnglishPages(outputRoot);
    console.log(`英語ページのプレビューを生成しました: tools=${result.tools}, pages=${result.pages}`);
  } catch (error) {
    console.error(`[generate-english-pages] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}

module.exports = { TOOL_CONFIGS, generateEnglishPages, localizeTool, resolveEnglishOutputRoot };
