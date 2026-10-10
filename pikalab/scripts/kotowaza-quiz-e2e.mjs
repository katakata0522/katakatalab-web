import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 基準・候補とも変更しない実ビルド出力を使う。生ソースやpublicで代替しない。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.env.PIKALAB_DIST_ROOT || path.join(root, 'dist'));
const artifactDir = path.join(root, 'visual-guard-artifacts', 'kotowaza-quiz');
const NOW = '2026-01-08T12:00:01Z';
const KEY = 'kotowaza_quiz_highscore';
const VIEWPORTS = [{ width: 320, height: 740 }, { width: 390, height: 844 },
    { width: 667, height: 375 }, { width: 1280, height: 900 }];
const servers = [], results = [], failures = [];
let browser, candidateUrl, baselineUrl;

// b8730644の共有データから固定した独立の期待値。候補アプリは読み込まない。
// アプリ内部状態や関数に触れず、表示された問題・選択肢だけで回答を選ぶ。
const ITEMS = [
    {"kanji": "犬も歩けば棒に当たる", "hiragana": "いぬもあるけばぼうにあたる", "meaning": "何かしていれば思わぬことがある", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "猿も木から落ちる", "hiragana": "さるもきからおちる", "meaning": "達人でも失敗することがある", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "花より団子", "hiragana": "はなよりだんご", "meaning": "風流より実益を優先する", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "笑う門には福来る", "hiragana": "わらうかどにはふくきたる", "meaning": "笑顔でいれば幸せが来る", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "早起きは三文の徳", "hiragana": "はやおきはさんもんのとく", "meaning": "早起きすると良いことがある", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "鬼に金棒", "hiragana": "おににかなぼう", "meaning": "強い者がさらに強くなる", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "蛙の子は蛙", "hiragana": "かえるのこはかえる", "meaning": "子は親に似る", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "七転び八起き", "hiragana": "ななころびやおき", "meaning": "何度失敗しても諦めない", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "石の上にも三年", "hiragana": "いしのうえにもさんねん", "meaning": "辛抱すれば成功する", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "急がば回れ", "hiragana": "いそがばまわれ", "meaning": "急ぐときこそ安全な道を選べ", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "継続は力なり", "hiragana": "けいぞくはちからなり", "meaning": "続けることが大切", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "時は金なり", "hiragana": "ときはかねなり", "meaning": "時間は貴重である", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "善は急げ", "hiragana": "ぜんはいそげ", "meaning": "良いことはすぐに実行せよ", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "千里の道も一歩から", "hiragana": "せんりのみちもいっぽから", "meaning": "大きなことも小さな一歩から始まる", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "習うより慣れろ", "hiragana": "ならうよりなれろ", "meaning": "理論より実践が大事", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "失敗は成功の母", "hiragana": "しっぱいはせいこうのはは", "meaning": "失敗を振り返って学ぶことが、次の成功につながるという教え", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "好きこそ物の上手なれ", "hiragana": "すきこそもののじょうずなれ", "meaning": "好きなことには熱心に取り組むので、上達しやすいというたとえ", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "口は災いの元", "hiragana": "くちはわざわいのもと", "meaning": "言葉が災難を招く", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "三つ子の魂百まで", "hiragana": "みつごのたましいひゃくまで", "meaning": "幼いころの性質は年をとっても変わりにくい、というたとえ", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "光陰矢の如し", "hiragana": "こういんやのごとし", "meaning": "月日は矢のように過ぎる", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "塵も積もれば山となる", "hiragana": "ちりもつもればやまとなる", "meaning": "小さなことも積み重なると大きくなる", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "類は友を呼ぶ", "hiragana": "るいはともをよぶ", "meaning": "似た者同士が集まる", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "二度あることは三度ある", "hiragana": "にどあることはさんどある", "meaning": "同じことは繰り返される", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "人のふり見て我がふり直せ", "hiragana": "ひとのふりみてわがふりなおせ", "meaning": "他人を見て自分を正せ", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "仏の顔も三度", "hiragana": "ほとけのかおもさんど", "meaning": "温厚な人でも、何度も無礼なことをされれば怒る", "difficulty": 1, "type": "kotowaza"},
    {"kanji": "二兎を追う者は一兎をも得ず", "hiragana": "にとをおうものはいっとをもえず", "meaning": "欲張ると何も得られない", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "百聞は一見に如かず", "hiragana": "ひゃくぶんはいっけんにしかず", "meaning": "聞くより見る方がよくわかる", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "覆水盆に返らず", "hiragana": "ふくすいぼんにかえらず", "meaning": "一度起きたことは元に戻らない", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "目は口ほどに物を言う", "hiragana": "めはくちほどにものをいう", "meaning": "目で気持ちが伝わる", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "案ずるより産むが易し", "hiragana": "あんずるよりうむがやすし", "meaning": "心配するより実行した方が簡単", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "雨降って地固まる", "hiragana": "あめふってじかたまる", "meaning": "問題や争いのあと、かえって関係や基盤がよくなることのたとえ", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "帯に短し襷に長し", "hiragana": "おびにみじかしたすきにながし", "meaning": "中途半端で役に立たない", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "勝って兜の緒を締めよ", "hiragana": "かってかぶとのおをしめよ", "meaning": "成功しても油断するな", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "苦あれば楽あり", "hiragana": "くあればらくあり", "meaning": "苦しい時と楽しい時は移り変わる、という教え", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "転ばぬ先の杖", "hiragana": "ころばぬさきのつえ", "meaning": "事前に用心する", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "三人寄れば文殊の知恵", "hiragana": "さんにんよればもんじゅのちえ", "meaning": "相談すれば良い案が出る", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "知らぬが仏", "hiragana": "しらぬがほとけ", "meaning": "知らない方が心穏やか", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "棚から牡丹餅", "hiragana": "たなからぼたもち", "meaning": "思いがけない幸運", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "鉄は熱いうちに打て", "hiragana": "てつはあついうちにうて", "meaning": "チャンスを逃すな", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "隣の芝生は青い", "hiragana": "となりのしばふはあおい", "meaning": "他人のものは良く見える", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "泣きっ面に蜂", "hiragana": "なきっつらにはち", "meaning": "不幸が重なる", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "能ある鷹は爪を隠す", "hiragana": "のうあるたかはつめをかくす", "meaning": "実力者は見せびらかさない", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "備えあれば憂いなし", "hiragana": "そなえあればうれいなし", "meaning": "普段から準備しておけば、いざという時に慌てにくいという教え", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "灯台下暗し", "hiragana": "とうだいもとくらし", "meaning": "身近なことは気づきにくい", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "身から出た錆", "hiragana": "みからでたさび", "meaning": "自分の悪い行いや不注意が原因で、自分が苦しむこと", "baselineMeaning": "自分の行いの結果", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "焼け石に水", "hiragana": "やけいしにみず", "meaning": "効果がほとんどない", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "渡る世間に鬼はなし", "hiragana": "わたるせけんにおにはなし", "meaning": "世の中には親切な人もいる", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "井の中の蛙大海を知らず", "hiragana": "いのなかのかわずたいかいをしらず", "meaning": "狭い世界で満足している", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "出る杭は打たれる", "hiragana": "でるくいはうたれる", "meaning": "目立つと非難される", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "初心忘るべからず", "hiragana": "しょしんわするべからず", "meaning": "最初の志を忘れるな", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "触らぬ神に祟りなし", "hiragana": "さわらぬかみにたたりなし", "meaning": "関わらなければ問題は起きない", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "論より証拠", "hiragana": "ろんよりしょうこ", "meaning": "理屈より実際の証拠", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "住めば都", "hiragana": "すめばみやこ", "meaning": "住み慣れると、どんな場所でも居心地よく感じるようになるというたとえ", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "立つ鳥跡を濁さず", "hiragana": "たつとりあとをにごさず", "meaning": "去る時は後始末をしろ", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "天は二物を与えず", "hiragana": "てんはにぶつをあたえず", "meaning": "一人にいくつもの優れた才能がそろうことは少ない、という言い回し", "difficulty": 2, "type": "kotowaza"},
    {"kanji": "魚心あれば水心", "hiragana": "うおごころあればみずごころ", "meaning": "相手の出方次第で対応が変わる", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "亀の甲より年の功", "hiragana": "かめのこうよりとしのこう", "meaning": "経験は貴重", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "聞くは一時の恥聞かぬは一生の恥", "hiragana": "きくはいっときのはじきかぬはいっしょうのはじ", "meaning": "知らないことは聞くべき", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "郷に入っては郷に従え", "hiragana": "ごうにいってはごうにしたがえ", "meaning": "その地の習慣に従う", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "情けは人の為ならず", "hiragana": "なさけはひとのためならず", "meaning": "人に親切にすると自分に返ってくる", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "背に腹は代えられぬ", "hiragana": "せにはらはかえられぬ", "meaning": "大事なことのためには犠牲もやむを得ない", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "虎穴に入らずんば虎子を得ず", "hiragana": "こけつにいらずんばこじをえず", "meaning": "リスクを取らなければ成功しない", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "馬の耳に念仏", "hiragana": "うまのみみにねんぶつ", "meaning": "言っても効果がない", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "実るほど頭を垂れる稲穂かな", "hiragana": "みのるほどこうべをたれるいなほかな", "meaning": "偉い人ほど謙虚である", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "正直者は馬鹿を見る", "hiragana": "しょうじきものはばかをみる", "meaning": "正直すぎると損をする", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "弘法も筆の誤り", "hiragana": "こうぼうもふでのあやまり", "meaning": "名人でも失敗することがある", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "河童の川流れ", "hiragana": "かっぱのかわながれ", "meaning": "得意分野でも失敗することがある", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "虻蜂取らず", "hiragana": "あぶはちとらず", "meaning": "二つを追って両方失う", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "安物買いの銭失い", "hiragana": "やすものがいのぜにうしない", "meaning": "値段だけで質のよくない物を選ぶと、かえって損をすることがあるという戒め", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "噂をすれば影", "hiragana": "うわさをすればかげ", "meaning": "噂をすると本人が現れる", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "医者の不養生", "hiragana": "いしゃのふようじょう", "meaning": "専門家が自分のことはおろそかにする", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "一寸先は闇", "hiragana": "いっすんさきはやみ", "meaning": "先のことはわからない", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "嘘も方便", "hiragana": "うそもほうべん", "meaning": "相手や状況のために、やむを得ない嘘が手段になることもあるという言い回し", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "縁の下の力持ち", "hiragana": "えんのしたのちからもち", "meaning": "陰で支える人", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "親の心子知らず", "hiragana": "おやのこころこしらず", "meaning": "親の気持ちは子に伝わりにくい", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "果報は寝て待て", "hiragana": "かほうはねてまて", "meaning": "できることをした後は、よい知らせを焦らず待つという教え", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "五十歩百歩", "hiragana": "ごじっぽひゃっぽ", "meaning": "大差がない", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "残り物には福がある", "hiragana": "のこりものにはふくがある", "meaning": "残ったものにも良いものがある", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "捨てる神あれば拾う神あり", "hiragana": "すてるかみあればひろうかみあり", "meaning": "見放す人がいても助けてくれる人がいる", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "下手の横好き", "hiragana": "へたのよこずき", "meaning": "下手なのに好む", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "目から鱗", "hiragana": "めからうろこ", "meaning": "急に理解できる", "difficulty": 3, "type": "kotowaza"},
    {"kanji": "一石二鳥", "hiragana": "いっせきにちょう", "meaning": "一つのことで二つの利益を得る", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "十人十色", "hiragana": "じゅうにんといろ", "meaning": "人それぞれ考えが違う", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "一期一会", "hiragana": "いちごいちえ", "meaning": "一生に一度の出会いを大切にする", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "以心伝心", "hiragana": "いしんでんしん", "meaning": "言葉を使わずに心が通じ合う", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "喜怒哀楽", "hiragana": "きどあいらく", "meaning": "人間の様々な感情", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "試行錯誤", "hiragana": "しこうさくご", "meaning": "失敗を繰り返しながら進む", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "四苦八苦", "hiragana": "しくはっく", "meaning": "非常に苦労する", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "自画自賛", "hiragana": "じがじさん", "meaning": "自分で自分をほめる", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "弱肉強食", "hiragana": "じゃくにくきょうしょく", "meaning": "弱い者が強い者の犠牲になり、強い者が栄えること", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "心機一転", "hiragana": "しんきいってん", "meaning": "気持ちを新たにする", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "日進月歩", "hiragana": "にっしんげっぽ", "meaning": "日々進歩する", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "半信半疑", "hiragana": "はんしんはんぎ", "meaning": "信じる気持ちと疑う気持ちが半々", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "百発百中", "hiragana": "ひゃっぱつひゃくちゅう", "meaning": "全て的中する", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "無我夢中", "hiragana": "むがむちゅう", "meaning": "我を忘れて熱中する", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "油断大敵", "hiragana": "ゆだんたいてき", "meaning": "油断は最大の敵", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "臨機応変", "hiragana": "りんきおうへん", "meaning": "状況に応じて対処する", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "完全無欠", "hiragana": "かんぜんむけつ", "meaning": "欠点が全くない", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "興味津津", "hiragana": "きょうみしんしん", "meaning": "非常に興味がある", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "三日坊主", "hiragana": "みっかぼうず", "meaning": "飽きっぽくて長続きしない", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "絶体絶命", "hiragana": "ぜったいぜつめい", "meaning": "逃れようのない状況", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "危機一髪", "hiragana": "ききいっぱつ", "meaning": "非常に危険な状態", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "一長一短", "hiragana": "いっちょういったん", "meaning": "良い点と悪い点がある", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "意気投合", "hiragana": "いきとうごう", "meaning": "互いの気持ちがぴったり合う", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "一進一退", "hiragana": "いっしんいったい", "meaning": "進んだり後退したり", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "二人三脚", "hiragana": "ににんさんきゃく", "meaning": "二人で協力して進む", "difficulty": 1, "type": "yojijukugo"},
    {"kanji": "一心不乱", "hiragana": "いっしんふらん", "meaning": "一つのことに集中する", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "一念発起", "hiragana": "いちねんほっき", "meaning": "決意を固めて事を始める", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "異口同音", "hiragana": "いくどうおん", "meaning": "多くの人が同じことを言う", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "因果応報", "hiragana": "いんがおうほう", "meaning": "行いに応じた報いがある", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "温故知新", "hiragana": "おんこちしん", "meaning": "古いことを学び新しい知識を得る", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "起死回生", "hiragana": "きしかいせい", "meaning": "絶望的な状況から立ち直る", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "空前絶後", "hiragana": "くうぜんぜつご", "meaning": "前例がなく今後もない", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "言語道断", "hiragana": "ごんごどうだん", "meaning": "とんでもないこと", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "順風満帆", "hiragana": "じゅんぷうまんぱん", "meaning": "物事が順調に進む", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "針小棒大", "hiragana": "しんしょうぼうだい", "meaning": "小さなことを大げさに言う", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "前代未聞", "hiragana": "ぜんだいみもん", "meaning": "今まで聞いたことがない", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "大器晩成", "hiragana": "たいきばんせい", "meaning": "大人物は遅れて頭角を現す", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "大同小異", "hiragana": "だいどうしょうい", "meaning": "だいたい同じ", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "単刀直入", "hiragana": "たんとうちょくにゅう", "meaning": "前置きなく本題に入る", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "天真爛漫", "hiragana": "てんしんらんまん", "meaning": "純粋で飾り気がない", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "電光石火", "hiragana": "でんこうせっか", "meaning": "非常に速いこと", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "独立独歩", "hiragana": "どくりつどっぽ", "meaning": "他に頼らず自分の力で進む", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "馬耳東風", "hiragana": "ばじとうふう", "meaning": "人の意見を聞き流す", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "八方美人", "hiragana": "はっぽうびじん", "meaning": "誰にでも良い顔をする", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "不言実行", "hiragana": "ふげんじっこう", "meaning": "黙って実行する", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "本末転倒", "hiragana": "ほんまつてんとう", "meaning": "大事なことと些細なことが逆になる", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "用意周到", "hiragana": "よういしゅうとう", "meaning": "準備が行き届いている", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "老若男女", "hiragana": "ろうにゃくなんにょ", "meaning": "年齢性別を問わず全ての人", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "疑心暗鬼", "hiragana": "ぎしんあんき", "meaning": "疑い始めると何でも疑わしく見える", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "急転直下", "hiragana": "きゅうてんちょっか", "meaning": "状況が急に変わる", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "五里霧中", "hiragana": "ごりむちゅう", "meaning": "状況がわからず迷う", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "自暴自棄", "hiragana": "じぼうじき", "meaning": "やけくそになる", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "質実剛健", "hiragana": "しつじつごうけん", "meaning": "飾り気がなく誠実で丈夫", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "支離滅裂", "hiragana": "しりめつれつ", "meaning": "まとまりがなくばらばら", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "創意工夫", "hiragana": "そういくふう", "meaning": "新しいアイデアを考え出す", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "適材適所", "hiragana": "てきざいてきしょ", "meaning": "人を適した場所に配置する", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "徹頭徹尾", "hiragana": "てっとうてつび", "meaning": "最初から最後まで一貫して", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "天下無敵", "hiragana": "てんかむてき", "meaning": "誰にも負けない", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "一触即発", "hiragana": "いっしょくそくはつ", "meaning": "すぐに爆発しそうな状況", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "意気揚揚", "hiragana": "いきようよう", "meaning": "得意げで誇らしい様子", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "威風堂堂", "hiragana": "いふうどうどう", "meaning": "威厳があり堂々としている", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "有名無実", "hiragana": "ゆうめいむじつ", "meaning": "名ばかりで実質がない", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "暗中模索", "hiragana": "あんちゅうもさく", "meaning": "手がかりのないまま探る", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "一刀両断", "hiragana": "いっとうりょうだん", "meaning": "思い切って処理する", "difficulty": 2, "type": "yojijukugo"},
    {"kanji": "才色兼備", "hiragana": "さいしょくけんび", "meaning": "才能と美しさを兼ね備える", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "晴耕雨読", "hiragana": "せいこううどく", "meaning": "悠々自適の生活", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "千載一遇", "hiragana": "せんざいいちぐう", "meaning": "滅多にない良い機会", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "朝三暮四", "hiragana": "ちょうさんぼし", "meaning": "目先の利益にとらわれる", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "二束三文", "hiragana": "にそくさんもん", "meaning": "非常に安い値段", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "明鏡止水", "hiragana": "めいきょうしすい", "meaning": "邪念のない澄んだ心", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "面目躍如", "hiragana": "めんもくやくじょ", "meaning": "評判通りの活躍をする", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "竜頭蛇尾", "hiragana": "りゅうとうだび", "meaning": "始めは勢いがあるが終わりは振るわない", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "和気藹藹", "hiragana": "わきあいあい", "meaning": "和やかな雰囲気", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "我田引水", "hiragana": "がでんいんすい", "meaning": "自分に都合よく物事を運ぶ", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "画竜点睛", "hiragana": "がりょうてんせい", "meaning": "仕上げに大切な一点を加える", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "奇想天外", "hiragana": "きそうてんがい", "meaning": "普通では思いつかない", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "玉石混交", "hiragana": "ぎょくせきこんこう", "meaning": "良いものと悪いものが混じっている", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "荒唐無稽", "hiragana": "こうとうむけい", "meaning": "根拠がなくでたらめ", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "縦横無尽", "hiragana": "じゅうおうむじん", "meaning": "自由自在に行動する", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "七転八倒", "hiragana": "しちてんばっとう", "meaning": "苦しみもがく", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "森羅万象", "hiragana": "しんらばんしょう", "meaning": "この世の全てのもの", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "正正堂堂", "hiragana": "せいせいどうどう", "meaning": "卑怯な手段を使わず、正しい態度で堂々と行動すること", "baselineMeaning": "正々堂々と振る舞う", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "抱腹絶倒", "hiragana": "ほうふくぜっとう", "meaning": "お腹を抱えて大笑いする", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "傍若無人", "hiragana": "ぼうじゃくぶじん", "meaning": "周りを気にせず勝手に振る舞う", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "満身創痍", "hiragana": "まんしんそうい", "meaning": "全身傷だらけ", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "無味乾燥", "hiragana": "むみかんそう", "meaning": "面白みがない", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "孟母三遷", "hiragana": "もうぼさんせん", "meaning": "教育には環境が大切", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "唯我独尊", "hiragana": "ゆいがどくそん", "meaning": "自分だけが偉いと思う", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "悠悠自適", "hiragana": "ゆうゆうじてき", "meaning": "のんびりと自由に暮らす", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "羊頭狗肉", "hiragana": "ようとうくにく", "meaning": "見かけは立派だが、中身がそれに伴わないこと", "baselineMeaning": "見かけと中身が違う", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "落花流水", "hiragana": "らっかりゅうすい", "meaning": "男女が互いに想い合う", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "理路整然", "hiragana": "りろせいぜん", "meaning": "筋道が通っている", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "冷静沈着", "hiragana": "れいせいちんちゃく", "meaning": "落ち着いて動じない", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "六根清浄", "hiragana": "ろっこんしょうじょう", "meaning": "心身を清める", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "一挙両得", "hiragana": "いっきょりょうとく", "meaning": "一つの行動で二つの利益", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "一朝一夕", "hiragana": "いっちょういっせき", "meaning": "わずかな時間", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "天涯孤独", "hiragana": "てんがいこどく", "meaning": "身寄りがなく孤独", "difficulty": 3, "type": "yojijukugo"},
    {"kanji": "同床異夢", "hiragana": "どうしょういむ", "meaning": "同じ立場でも考えが違う", "difficulty": 3, "type": "yojijukugo"}
];
// 別途監査した漢字の区切り・読みをテスト自身の固定期待値にする。
const EQUIVALENT_GROUPS = [["猿も木から落ちる", "弘法も筆の誤り", "河童の川流れ"], ["一石二鳥", "一挙両得"], ["二兎を追う者は一兎をも得ず", "虻蜂取らず"], ["大同小異", "五十歩百歩"], ["晴耕雨読", "悠悠自適"], ["無我夢中", "一心不乱"], ["馬耳東風", "馬の耳に念仏"], ["五里霧中", "暗中模索"], ["転ばぬ先の杖", "備えあれば憂いなし", "用意周到"], ["空前絶後", "前代未聞"], ["四苦八苦", "七転八倒"], ["危機一髪", "絶体絶命", "一触即発"], ["継続は力なり", "石の上にも三年", "七転び八起き"], ["試行錯誤", "失敗は成功の母", "七転び八起き"], ["十人十色", "同床異夢"], ["以心伝心", "目は口ほどに物を言う"], ["馬の耳に念仏", "焼け石に水"], ["因果応報", "身から出た錆", "情けは人の為ならず"], ["羊頭狗肉", "有名無実"], ["臨機応変", "魚心あれば水心"], ["心機一転", "一念発起"], ["犬も歩けば棒に当たる", "棚から牡丹餅"]];
const FILLIN = {
    "いっせきにちょう": {"display": "一石【　　】", "answer": "にちょう"},
    "じゅうにんといろ": {"display": "十人【　　】", "answer": "といろ"},
    "いちごいちえ": {"display": "一期【　　】", "answer": "いちえ"},
    "いしんでんしん": {"display": "以心【　　】", "answer": "でんしん"},
    "きどあいらく": {"display": "喜怒【　　】", "answer": "あいらく"},
    "しこうさくご": {"display": "試行【　　】", "answer": "さくご"},
    "しくはっく": {"display": "四苦【　　】", "answer": "はっく"},
    "じがじさん": {"display": "自画【　　】", "answer": "じさん"},
    "じゃくにくきょうしょく": {"display": "弱肉【　　】", "answer": "きょうしょく"},
    "しんきいってん": {"display": "心機【　　】", "answer": "いってん"},
    "にっしんげっぽ": {"display": "日進【　　】", "answer": "げっぽ"},
    "はんしんはんぎ": {"display": "半信【　　】", "answer": "はんぎ"},
    "ひゃっぱつひゃくちゅう": {"display": "百発【　　】", "answer": "ひゃくちゅう"},
    "むがむちゅう": {"display": "無我【　　】", "answer": "むちゅう"},
    "ゆだんたいてき": {"display": "油断【　　】", "answer": "たいてき"},
    "りんきおうへん": {"display": "臨機【　　】", "answer": "おうへん"},
    "かんぜんむけつ": {"display": "完全【　　】", "answer": "むけつ"},
    "きょうみしんしん": {"display": "興味【　　】", "answer": "しんしん"},
    "みっかぼうず": {"display": "三日【　　】", "answer": "ぼうず"},
    "ぜったいぜつめい": {"display": "絶体【　　】", "answer": "ぜつめい"},
    "ききいっぱつ": {"display": "危機【　　】", "answer": "いっぱつ"},
    "いっちょういったん": {"display": "一長【　　】", "answer": "いったん"},
    "いきとうごう": {"display": "意気【　　】", "answer": "とうごう"},
    "いっしんいったい": {"display": "一進【　　】", "answer": "いったい"},
    "ににんさんきゃく": {"display": "二人【　　】", "answer": "さんきゃく"},
    "いっしんふらん": {"display": "一心【　　】", "answer": "ふらん"},
    "いちねんほっき": {"display": "一念【　　】", "answer": "ほっき"},
    "いくどうおん": {"display": "異口【　　】", "answer": "どうおん"},
    "いんがおうほう": {"display": "因果【　　】", "answer": "おうほう"},
    "おんこちしん": {"display": "温故【　　】", "answer": "ちしん"},
    "きしかいせい": {"display": "起死【　　】", "answer": "かいせい"},
    "くうぜんぜつご": {"display": "空前【　　】", "answer": "ぜつご"},
    "ごんごどうだん": {"display": "言語【　　】", "answer": "どうだん"},
    "じゅんぷうまんぱん": {"display": "順風【　　】", "answer": "まんぱん"},
    "しんしょうぼうだい": {"display": "針小【　　】", "answer": "ぼうだい"},
    "ぜんだいみもん": {"display": "前代【　　】", "answer": "みもん"},
    "たいきばんせい": {"display": "大器【　　】", "answer": "ばんせい"},
    "だいどうしょうい": {"display": "大同【　　】", "answer": "しょうい"},
    "たんとうちょくにゅう": {"display": "単刀【　　】", "answer": "ちょくにゅう"},
    "てんしんらんまん": {"display": "天真【　　】", "answer": "らんまん"},
    "でんこうせっか": {"display": "電光【　　】", "answer": "せっか"},
    "どくりつどっぽ": {"display": "独立【　　】", "answer": "どっぽ"},
    "ばじとうふう": {"display": "馬耳【　　】", "answer": "とうふう"},
    "はっぽうびじん": {"display": "八方【　　】", "answer": "びじん"},
    "ふげんじっこう": {"display": "不言【　　】", "answer": "じっこう"},
    "ほんまつてんとう": {"display": "本末【　　】", "answer": "てんとう"},
    "よういしゅうとう": {"display": "用意【　　】", "answer": "しゅうとう"},
    "ろうにゃくなんにょ": {"display": "老若【　　】", "answer": "なんにょ"},
    "ぎしんあんき": {"display": "疑心【　　】", "answer": "あんき"},
    "きゅうてんちょっか": {"display": "急転【　　】", "answer": "ちょっか"},
    "ごりむちゅう": {"display": "五里【　　】", "answer": "むちゅう"},
    "じぼうじき": {"display": "自暴【　　】", "answer": "じき"},
    "しつじつごうけん": {"display": "質実【　　】", "answer": "ごうけん"},
    "しりめつれつ": {"display": "支離【　　】", "answer": "めつれつ"},
    "そういくふう": {"display": "創意【　　】", "answer": "くふう"},
    "てきざいてきしょ": {"display": "適材【　　】", "answer": "てきしょ"},
    "てっとうてつび": {"display": "徹頭【　　】", "answer": "てつび"},
    "てんかむてき": {"display": "天下【　　】", "answer": "むてき"},
    "いっしょくそくはつ": {"display": "一触【　　】", "answer": "そくはつ"},
    "いきようよう": {"display": "意気【　　】", "answer": "ようよう"},
    "いふうどうどう": {"display": "威風【　　】", "answer": "どうどう"},
    "ゆうめいむじつ": {"display": "有名【　　】", "answer": "むじつ"},
    "あんちゅうもさく": {"display": "暗中【　　】", "answer": "もさく"},
    "いっとうりょうだん": {"display": "一刀【　　】", "answer": "りょうだん"},
    "さいしょくけんび": {"display": "才色【　　】", "answer": "けんび"},
    "せいこううどく": {"display": "晴耕【　　】", "answer": "うどく"},
    "せんざいいちぐう": {"display": "千載【　　】", "answer": "いちぐう"},
    "ちょうさんぼし": {"display": "朝三【　　】", "answer": "ぼし"},
    "にそくさんもん": {"display": "二束【　　】", "answer": "さんもん"},
    "めいきょうしすい": {"display": "明鏡【　　】", "answer": "しすい"},
    "めんもくやくじょ": {"display": "面目【　　】", "answer": "やくじょ"},
    "りゅうとうだび": {"display": "竜頭【　　】", "answer": "だび"},
    "わきあいあい": {"display": "和気【　　】", "answer": "あいあい"},
    "がでんいんすい": {"display": "我田【　　】", "answer": "いんすい"},
    "がりょうてんせい": {"display": "画竜【　　】", "answer": "てんせい"},
    "きそうてんがい": {"display": "奇想【　　】", "answer": "てんがい"},
    "ぎょくせきこんこう": {"display": "玉石【　　】", "answer": "こんこう"},
    "こうとうむけい": {"display": "荒唐【　　】", "answer": "むけい"},
    "じゅうおうむじん": {"display": "縦横【　　】", "answer": "むじん"},
    "しちてんばっとう": {"display": "七転【　　】", "answer": "ばっとう"},
    "しんらばんしょう": {"display": "森羅【　　】", "answer": "ばんしょう"},
    "せいせいどうどう": {"display": "正正【　　】", "answer": "どうどう"},
    "ほうふくぜっとう": {"display": "抱腹【　　】", "answer": "ぜっとう"},
    "ぼうじゃくぶじん": {"display": "傍若【　　】", "answer": "ぶじん"},
    "まんしんそうい": {"display": "満身【　　】", "answer": "そうい"},
    "むみかんそう": {"display": "無味【　　】", "answer": "かんそう"},
    "もうぼさんせん": {"display": "孟母【　　】", "answer": "さんせん"},
    "ゆいがどくそん": {"display": "唯我【　　】", "answer": "どくそん"},
    "ゆうゆうじてき": {"display": "悠悠【　　】", "answer": "じてき"},
    "ようとうくにく": {"display": "羊頭【　　】", "answer": "くにく"},
    "らっかりゅうすい": {"display": "落花【　　】", "answer": "りゅうすい"},
    "りろせいぜん": {"display": "理路【　　】", "answer": "せいぜん"},
    "れいせいちんちゃく": {"display": "冷静【　　】", "answer": "ちんちゃく"},
    "ろっこんしょうじょう": {"display": "六根【　　】", "answer": "しょうじょう"},
    "いっきょりょうとく": {"display": "一挙【　　】", "answer": "りょうとく"},
    "いっちょういっせき": {"display": "一朝【　　】", "answer": "いっせき"},
    "てんがいこどく": {"display": "天涯【　　】", "answer": "こどく"},
    "どうしょういむ": {"display": "同床【　　】", "answer": "いむ"},
    "いぬもあるけばぼうにあたる": {"display": "犬も歩けば【　　】", "answer": "ぼうにあたる"},
    "さるもきからおちる": {"display": "猿も【　　】", "answer": "きからおちる"},
    "はなよりだんご": {"display": "花より【　　】", "answer": "だんご"},
    "わらうかどにはふくきたる": {"display": "笑う門には【　　】", "answer": "ふくきたる"},
    "はやおきはさんもんのとく": {"display": "早起きは【　　】", "answer": "さんもんのとく"},
    "おににかなぼう": {"display": "鬼に【　　】", "answer": "かなぼう"},
    "かえるのこはかえる": {"display": "【　　】の子は蛙", "answer": "かえる"},
    "ななころびやおき": {"display": "七転び【　　】", "answer": "やおき"},
    "いしのうえにもさんねん": {"display": "石の上にも【　　】", "answer": "さんねん"},
    "いそがばまわれ": {"display": "急がば【　　】", "answer": "まわれ"},
    "けいぞくはちからなり": {"display": "継続は【　　】", "answer": "ちからなり"},
    "ときはかねなり": {"display": "時は【　　】", "answer": "かねなり"},
    "ぜんはいそげ": {"display": "善は【　　】", "answer": "いそげ"},
    "せんりのみちもいっぽから": {"display": "千里の道も【　　】", "answer": "いっぽから"},
    "ならうよりなれろ": {"display": "習うより【　　】", "answer": "なれろ"},
    "しっぱいはせいこうのはは": {"display": "失敗は成功の【　　】", "answer": "はは"},
    "すきこそもののじょうずなれ": {"display": "好きこそ物の【　　】", "answer": "じょうずなれ"},
    "くちはわざわいのもと": {"display": "口は【　　】", "answer": "わざわいのもと"},
    "みつごのたましいひゃくまで": {"display": "三つ子の魂【　　】", "answer": "ひゃくまで"},
    "こういんやのごとし": {"display": "光陰【　　】", "answer": "やのごとし"},
    "ちりもつもればやまとなる": {"display": "塵も積もれば【　　】", "answer": "やまとなる"},
    "るいはともをよぶ": {"display": "類は【　　】", "answer": "ともをよぶ"},
    "にどあることはさんどある": {"display": "二度あることは【　　】", "answer": "さんどある"},
    "ひとのふりみてわがふりなおせ": {"display": "人のふり見て【　　】", "answer": "わがふりなおせ"},
    "ほとけのかおもさんど": {"display": "仏の顔も【　　】", "answer": "さんど"},
    "にとをおうものはいっとをもえず": {"display": "二兎を追う者は【　　】", "answer": "いっとをもえず"},
    "ひゃくぶんはいっけんにしかず": {"display": "百聞は【　　】", "answer": "いっけんにしかず"},
    "ふくすいぼんにかえらず": {"display": "覆水盆に【　　】", "answer": "かえらず"},
    "めはくちほどにものをいう": {"display": "目は口ほどに【　　】", "answer": "ものをいう"},
    "あんずるよりうむがやすし": {"display": "案ずるより【　　】", "answer": "うむがやすし"},
    "あめふってじかたまる": {"display": "雨降って【　　】", "answer": "じかたまる"},
    "おびにみじかしたすきにながし": {"display": "帯に短し【　　】", "answer": "たすきにながし"},
    "かってかぶとのおをしめよ": {"display": "勝って兜の【　　】", "answer": "おをしめよ"},
    "くあればらくあり": {"display": "苦あれば【　　】", "answer": "らくあり"},
    "ころばぬさきのつえ": {"display": "転ばぬ先の【　　】", "answer": "つえ"},
    "さんにんよればもんじゅのちえ": {"display": "三人寄れば【　　】", "answer": "もんじゅのちえ"},
    "しらぬがほとけ": {"display": "知らぬが【　　】", "answer": "ほとけ"},
    "たなからぼたもち": {"display": "棚から【　　】", "answer": "ぼたもち"},
    "てつはあついうちにうて": {"display": "鉄は熱い【　　】", "answer": "うちにうて"},
    "となりのしばふはあおい": {"display": "隣の芝生は【　　】", "answer": "あおい"},
    "なきっつらにはち": {"display": "泣きっ面に【　　】", "answer": "はち"},
    "のうあるたかはつめをかくす": {"display": "能ある鷹は【　　】", "answer": "つめをかくす"},
    "そなえあればうれいなし": {"display": "備えあれば【　　】", "answer": "うれいなし"},
    "とうだいもとくらし": {"display": "灯台【　　】", "answer": "もとくらし"},
    "みからでたさび": {"display": "身から出た【　　】", "answer": "さび"},
    "やけいしにみず": {"display": "焼け石に【　　】", "answer": "みず"},
    "わたるせけんにおにはなし": {"display": "渡る世間に【　　】", "answer": "おにはなし"},
    "いのなかのかわずたいかいをしらず": {"display": "井の中の蛙【　　】", "answer": "たいかいをしらず"},
    "でるくいはうたれる": {"display": "出る杭は【　　】", "answer": "うたれる"},
    "しょしんわするべからず": {"display": "初心【　　】", "answer": "わするべからず"},
    "さわらぬかみにたたりなし": {"display": "触らぬ神に【　　】", "answer": "たたりなし"},
    "ろんよりしょうこ": {"display": "論より【　　】", "answer": "しょうこ"},
    "すめばみやこ": {"display": "住めば【　　】", "answer": "みやこ"},
    "たつとりあとをにごさず": {"display": "立つ鳥【　　】", "answer": "あとをにごさず"},
    "てんはにぶつをあたえず": {"display": "天は【　　】", "answer": "にぶつをあたえず"},
    "うおごころあればみずごころ": {"display": "魚心あれば【　　】", "answer": "みずごころ"},
    "かめのこうよりとしのこう": {"display": "亀の甲より年の【　　】", "answer": "こう"},
    "きくはいっときのはじきかぬはいっしょうのはじ": {"display": "聞くは一時の恥聞かぬは一生の【　　】", "answer": "はじ"},
    "ごうにいってはごうにしたがえ": {"display": "郷に入っては郷に【　　】", "answer": "したがえ"},
    "なさけはひとのためならず": {"display": "情けは人の為【　　】", "answer": "ならず"},
    "せにはらはかえられぬ": {"display": "背に腹は代え【　　】", "answer": "られぬ"},
    "こけつにいらずんばこじをえず": {"display": "虎穴に入らずんば虎子を【　　】", "answer": "えず"},
    "うまのみみにねんぶつ": {"display": "馬の耳に【　　】", "answer": "ねんぶつ"},
    "みのるほどこうべをたれるいなほかな": {"display": "実るほど頭を垂れる【　　】", "answer": "いなほかな"},
    "しょうじきものはばかをみる": {"display": "正直者は馬鹿を【　　】", "answer": "みる"},
    "こうぼうもふでのあやまり": {"display": "弘法も筆の【　　】", "answer": "あやまり"},
    "かっぱのかわながれ": {"display": "河童の川【　　】", "answer": "ながれ"},
    "あぶはちとらず": {"display": "虻蜂【　　】", "answer": "とらず"},
    "やすものがいのぜにうしない": {"display": "安物買いの銭【　　】", "answer": "うしない"},
    "うわさをすればかげ": {"display": "噂をすれば【　　】", "answer": "かげ"},
    "いしゃのふようじょう": {"display": "医者の【　　】", "answer": "ふようじょう"},
    "いっすんさきはやみ": {"display": "一寸先は【　　】", "answer": "やみ"},
    "うそもほうべん": {"display": "嘘も【　　】", "answer": "ほうべん"},
    "えんのしたのちからもち": {"display": "縁の下の【　　】", "answer": "ちからもち"},
    "おやのこころこしらず": {"display": "親の心子【　　】", "answer": "しらず"},
    "かほうはねてまて": {"display": "果報は【　　】", "answer": "ねてまて"},
    "ごじっぽひゃっぽ": {"display": "五十歩【　　】", "answer": "ひゃっぽ"},
    "のこりものにはふくがある": {"display": "残り物には福が【　　】", "answer": "ある"},
    "すてるかみあればひろうかみあり": {"display": "捨てる神あれば【　　】", "answer": "ひろうかみあり"},
    "へたのよこずき": {"display": "下手の【　　】", "answer": "よこずき"},
    "めからうろこ": {"display": "目から【　　】", "answer": "うろこ"}
};

async function serveDist(input) {
    const directory = path.resolve(input);
    await access(path.join(directory, 'kotowaza_quiz/index.html'));
    assert.ok((await stat(path.join(directory, 'assets'))).isDirectory(), `${directory} must be an actual build output`);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
        '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
        '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
    const server = createServer(async (request, response) => {
        try {
            const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
            let file = path.resolve(directory, `.${pathname}`);
            if (file !== directory && !file.startsWith(directory + path.sep)) { response.writeHead(403).end(); return; }
            if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
            response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            response.end(await readFile(file));
        } catch (error) { response.writeHead(['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500).end(); }
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    servers.push(server);
    return `http://127.0.0.1:${server.address().port}/kotowaza_quiz/`;
}

async function writeAssetManifest(directory, name) {
    const origin = 'http://kotowaza-build.invalid';
    const pending = [new URL('/kotowaza_quiz/index.html', origin)], files = new Map();
    while (pending.length) {
        const url = pending.shift();
        if (url.origin !== origin) continue;
        const relative = decodeURIComponent(url.pathname).replace(/^\//, '');
        if (files.has(relative)) continue;
        const file = path.resolve(directory, relative);
        assert.ok(file.startsWith(directory + path.sep), 'Manifest stays inside the build root');
        const content = await readFile(file), source = content.toString('utf8'), references = [];
        files.set(relative, { path: relative, bytes: content.length, sha256: createHash('sha256').update(content).digest('hex') });
        if (file.endsWith('.html')) {
            for (const match of source.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)) references.push(match[1].replaceAll('&amp;', '&'));
        } else if (file.endsWith('.css')) {
            for (const match of source.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) references.push(match[1]);
            for (const match of source.matchAll(/@import\s+["']([^"']+)["']/gi)) references.push(match[1]);
        } else if (/\.m?js$/.test(file)) {
            for (const match of source.matchAll(/\b(?:import|export)\s*(?:[^;'"\n]*?\bfrom\s*)?["']([^"']+)["']/g)) references.push(match[1]);
            for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) references.push(match[1]);
        }
        for (const reference of references) {
            if (/^(?:data:|#)/.test(reference)) continue;
            const next = new URL(reference, url);
            if (next.origin === origin) pending.push(next);
        }
    }
    await writeJSON(`${name}-asset-manifest.json`, { entry: 'kotowaza_quiz/index.html', algorithm: 'sha256',
        files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)) });
}
async function verifyAssets(directory, name) {
    const manifest = JSON.parse(await readFile(path.join(artifactDir, `${name}-asset-manifest.json`), 'utf8'));
    for (const entry of manifest.files) {
        const bytes = await readFile(path.join(directory, entry.path));
        assert.equal(bytes.length, entry.bytes, `${name}: immutable asset size ${entry.path}`);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, `${name}: immutable asset ${entry.path}`);
    }
    return { name, files: manifest.files.length, sha256: createHash('sha256').update(JSON.stringify(manifest)).digest('hex') };
}
const writeJSON = (name, value) => writeFile(path.join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`);

// 制御するのはブラウザー環境の境界だけ。アプリ状態・関数・配信ソース・
// 問題データを置換せず、点数や進行を内部から強制しない。
function installEnvironment(options) {
    let seed = options.seed ?? 0x51eed;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
    for (const [key, value] of Object.entries(options.storage || {})) localStorage.setItem(key, value);
    if (options.denyStorage) {
        for (const method of ['getItem', 'setItem', 'removeItem']) {
            Storage.prototype[method] = () => { throw new DOMException('Test storage denied', 'SecurityError'); };
        }
    } else if (options.quotaExceeded) {
        Storage.prototype.setItem = () => { throw new DOMException('Test quota full', 'QuotaExceededError'); };
    }
    if (options.audioConstructorFailure) {
        const UnavailableAudioContext = class { constructor() { throw new DOMException('Test audio unavailable', 'NotSupportedError'); } };
        window.AudioContext = UnavailableAudioContext;
        window.webkitAudioContext = UnavailableAudioContext;
    }
}
async function createCase(viewport = VIEWPORTS[1], options = {}) {
    const context = await browser.newContext({ viewport, hasTouch: true, colorScheme: 'light',
        reducedMotion: 'reduce', locale: 'ja-JP', timezoneId: 'UTC', serviceWorkers: options.nativeEnvironment ? 'allow' : 'block' });
    if (!options.nativeEnvironment) {
        await context.addInitScript(installEnvironment, options);
        await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
        await context.route('https://fonts.gstatic.com/**', route => route.abort());
    }
    const page = await context.newPage(), errors = [], requestFailures = [], dialogs = [];
    page.setDefaultTimeout(10_000);
    page.on('pageerror', error => errors.push(error.stack || error.message));
    page.on('response', response => {
        if (response.url().startsWith('http://127.0.0.1:') && response.status() >= 400) requestFailures.push(`${response.status()} ${new URL(response.url()).pathname}`);
    });
    page.on('requestfailed', request => {
        if (request.url().startsWith('http://127.0.0.1:')) requestFailures.push(`${request.failure()?.errorText} ${new URL(request.url()).pathname}`);
    });
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
    if (!options.nativeEnvironment) {
        await page.clock.install({ time: new Date('2026-01-08T12:00:00Z') });
        await page.clock.pauseAt(new Date(NOW));
    }
    return { context, page, errors, requestFailures, dialogs, options };
}
async function ready(current, url = candidateUrl) {
    assert.equal((await current.page.goto(url, { waitUntil: 'load' })).status(), 200);
    await current.page.locator('#start-screen.active').waitFor();
    if (!current.options.nativeEnvironment) await current.page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }' });
    await current.page.evaluate(() => document.fonts.ready);
    if (current.options.nativeEnvironment) await current.page.waitForFunction(() => document.querySelector('.btn-mode') === document.activeElement);
    else await current.page.clock.runFor(100);
}
const screenshot = (page, name) => page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true, animations: 'disabled', timeout: 10_000 });
async function runCase(name, work, options = {}, viewport = VIEWPORTS[1]) {
    const record = { name, viewport, status: 'passed' }, began = Date.now();
    let current;
    try {
        current = await createCase(viewport, options);
        await ready(current);
        await work(current.page, record, current);
        assert.deepEqual(current.errors, [], 'No unhandled browser exceptions');
        assert.deepEqual(current.requestFailures, [], 'All local built assets load');
        assert.deepEqual(current.dialogs, [], 'No unexpected alerts');
        console.log(`[OK] Kotowaza Quiz: ${name}`);
    } catch (error) {
        record.status = 'failed'; record.error = error.stack || String(error);
        failures.push(new Error(`${name}: ${error.message}`, { cause: error }));
        console.error(`[FAIL] Kotowaza Quiz: ${name}: ${error.message}`);
        if (current?.page) { try { await screenshot(current.page, `${name}-failure`); } catch (captureError) { record.screenshotError = captureError.message; } }
    } finally {
        Object.assign(record, { durationMs: Date.now() - began, pageErrors: current?.errors || [], requestFailures: current?.requestFailures || [], dialogs: current?.dialogs || [] });
        await current?.context.close(); results.push(record); await writeJSON('results.json', results);
    }
}
const text = async (page, selector) => (await page.locator(selector).textContent()).trim();
const number = async (page, selector) => Number(await text(page, selector));
async function counters(page) {
    return { correct: await number(page, '#correct-count'), wrong: await number(page, '#wrong-count'),
        score: await number(page, '#score-points'), progress: await text(page, '#progress-text'), accuracy: await text(page, '#accuracy-rate') };
}
async function assertScreen(page, screen) {
    assert.equal(await page.locator('.screen.active').count(), 1);
    assert.equal(await page.locator(`#${screen}-screen`).isVisible(), true, `${screen} screen visible`);
}
async function assertFocus(page, selector) {
    assert.equal(await page.locator(selector).evaluate(node => node === document.activeElement), true, `${selector} has focus`);
}
function expectedPool(category = 'all', difficulty = 'all', count = 'all') {
    const items = ITEMS.filter(item => (category === 'all' || item.type === category) && (difficulty === 'all' || item.difficulty === Number(difficulty)));
    return { items, total: count === 'all' ? items.length : Math.min(Number(count), items.length) };
}
async function start(page, { mode = 'meaning', category = 'all', difficulty = 'all', count = '10', settle = true } = {}) {
    await page.locator(`#category-select [data-value="${category}"]`).click();
    await page.locator(`#difficulty-select [data-value="${difficulty}"]`).click();
    await page.locator(`.btn-count[data-count="${count}"]`).click();
    await page.locator(`.btn-mode[data-mode="${mode}"]`).click();
    if (settle) await page.clock.runFor(100);
    await assertScreen(page, 'game');
    assert.equal(await text(page, '#progress-text'), `1 / ${expectedPool(category, difficulty, count).total}`);
    assert.equal(await page.locator('#choices-area').isVisible(), mode === 'meaning');
    assert.equal(await page.locator('#fillin-area').isVisible(), mode === 'fillin');
    if (settle) await assertFocus(page, mode === 'fillin' ? '#fillin-input' : '.choice-btn:first-child');
}
async function currentItem(page, mode) {
    const rendered = await text(page, '#question-text');
    const level = ((await text(page, '#difficulty-badge')).match(/★/g) || []).length;
    const candidates = ITEMS.filter(item => mode === 'meaning' ? item.kanji === rendered
        : FILLIN[item.hiragana]?.display === rendered && item.difficulty === level);
    assert.equal(candidates.length, 1, `Visible ${mode} question resolves uniquely to independent fixture: ${rendered}`);
    const item = candidates[0];
    return baselineUrl && page.url().startsWith(baselineUrl) && item.baselineMeaning ? { ...item, meaning: item.baselineMeaning } : item;
}
async function answer(page, mode, correct = true, { advance = true } = {}) {
    const item = await currentItem(page, mode), before = await counters(page);
    if (mode === 'meaning') {
        const choices = await page.locator('.choice-btn').allTextContents();
        assert.equal(new Set(choices).size, 4, 'Four distinct answer choices');
        assert.equal(choices.filter(choice => choice === item.meaning).length, 1, 'Exactly one independently correct choice');
        if (!baselineUrl || !page.url().startsWith(baselineUrl)) {
            const equivalentNames = EQUIVALENT_GROUPS.filter(group => group.includes(item.kanji)).flat();
            const equivalentMeanings = ITEMS.filter(entry => entry.kanji !== item.kanji && equivalentNames.includes(entry.kanji)).map(entry => entry.meaning);
            assert.equal(choices.some(choice => choice !== item.meaning && equivalentMeanings.includes(choice)), false, 'No independently audited equivalent meaning is offered as a wrong answer');
        }
        const index = choices.findIndex(choice => correct ? choice === item.meaning : choice !== item.meaning);
        await page.locator('.choice-btn').nth(index).click();
    } else {
        await page.locator('#fillin-input').fill(correct ? FILLIN[item.hiragana].answer : 'まちがいです');
        await page.locator('#submit-btn').click();
        assert.equal(await text(page, '#question-text'), item.hiragana, 'Answer reveals the full reading');
    }
    const after = await counters(page);
    assert.equal(after.correct, before.correct + (correct ? 1 : 0));
    assert.equal(after.wrong, before.wrong + (correct ? 0 : 1));
    assert.equal(after.accuracy, `${Math.round(after.correct / (after.correct + after.wrong) * 100)}%`);
    assert.equal(after.progress, before.progress, 'Feedback retains the answered question');
    if (correct) assert.ok(after.score > before.score && after.score - before.score <= 300, 'Bounded score awarded once');
    else { assert.equal(after.score, before.score); assert.match(await text(page, '#feedback'), /不正解/); }
    if (advance) await page.clock.runFor(1500);
    return item;
}
async function finish(page, mode, wrongIndices = []) {
    const total = Number((await text(page, '#progress-text')).split('/')[1]), encountered = [];
    for (let index = 0; index < total; index++) encountered.push(await answer(page, mode, !wrongIndices.includes(index)));
    await assertScreen(page, 'result');
    assert.equal(await text(page, '#result-correct'), `${total - wrongIndices.length} / ${total}`);
    assert.equal(await text(page, '#result-accuracy'), `${Math.round((total - wrongIndices.length) / total * 100)}%`);
    return encountered;
}

async function gameplaySuite() {
    for (const mode of ['meaning', 'fillin']) {
        await runCase(`${mode}-complete-incorrect-review-retry-home`, async (page, record) => {
            await start(page, { mode });
            const items = await finish(page, mode, [0, 3]);
            assert.equal(await page.locator('#wrong-answer-list li').count(), 2);
            assert.deepEqual(await page.locator('#wrong-answer-list .wrong-q').allTextContents(), [items[0].kanji, items[3].kanji]);
            const score = await number(page, '#result-total-score');
            assert.ok(score > 0);
            await page.clock.runFor(100);
            await assertFocus(page, '#retry-btn');
            await page.locator('#review-btn').click();
            await page.clock.runFor(100);
            assert.equal(await text(page, '#progress-text'), '1 / 2');
            const reviewed = await finish(page, mode);
            assert.deepEqual(reviewed.map(item => item.kanji).sort(), [items[0].kanji, items[3].kanji].sort());
            assert.equal(await text(page, '#result-title-badge'), '📖 復習完了！');
            assert.equal(await text(page, '#result-highscore'), '-');
            assert.equal(await page.locator('#review-section').isVisible(), false);
            await page.locator('#retry-btn').click();
            assert.equal(await text(page, '#progress-text'), '1 / 10', 'Retry returns to selected normal count, not review count');
            assert.equal(await number(page, '#score-points'), 0);
            await page.locator('#quit-btn').click();
            await assertScreen(page, 'start');
            await start(page, { mode });
            await finish(page, mode);
            await page.locator('#home-btn').click();
            await page.clock.runFor(4000);
            await assertScreen(page, 'start');
            await assertFocus(page, '.btn-mode:first-of-type');
            record.wrongAndReviewed = reviewed.map(item => item.kanji);
        });
        await runCase(`${mode}-all-179-questions-exact-content`, async (page, record) => {
            await start(page, { mode, count: 'all' });
            const seen = new Set(), coverage = [];
            for (let index = 0; index < ITEMS.length; index++) {
                const item = await currentItem(page, mode);
                assert.equal(seen.has(item.kanji), false, 'No repeated question within a run');
                seen.add(item.kanji);
                if (mode === 'fillin') {
                    assert.equal(await text(page, '#question-text'), FILLIN[item.hiragana].display);
                    assert.match(FILLIN[item.hiragana].display, /【　　】/);
                }
                coverage.push({ question: item.kanji, display: await text(page, '#question-text'), answer: mode === 'fillin' ? FILLIN[item.hiragana].answer : item.meaning });
                await answer(page, mode);
            }
            assert.equal(seen.size, 179);
            await assertScreen(page, 'result');
            assert.equal(await text(page, '#result-correct'), '179 / 179');
            assert.equal(await text(page, '#result-accuracy'), '100%');
            record.covered = coverage;
            await writeJSON(`${mode}-full-corpus-coverage.json`, coverage);
        });
    }
}

async function settingsSuite() {
    for (const mode of ['meaning', 'fillin']) {
        await runCase(`${mode}-every-category-difficulty-count-combination`, async (page, record) => {
            record.combinations = [];
            for (const category of ['all', 'kotowaza', 'yojijukugo']) {
                for (const difficulty of ['all', '1', '2', '3']) {
                    for (const count of ['10', '30', '80', 'all']) {
                        await start(page, { mode, category, difficulty, count });
                        const item = await currentItem(page, mode), expected = expectedPool(category, difficulty, count);
                        assert.ok(expected.items.some(entry => entry.kanji === item.kanji));
                        assert.equal(await page.locator('#category-select .active').getAttribute('data-value'), category);
                        assert.equal(await page.locator('#difficulty-select .active').getAttribute('data-value'), difficulty);
                        assert.equal(await page.locator('.btn-count.active').getAttribute('data-count'), count);
                        for (const selector of ['#category-select .btn-config', '#difficulty-select .btn-config', '.btn-count']) {
                            assert.equal(await page.locator(`${selector}[aria-pressed="true"]`).count(), 1, 'Selections expose exactly one pressed button');
                        }
                        await answer(page, mode);
                        assert.equal(await text(page, '#progress-text'), `2 / ${expected.total}`);
                        record.combinations.push({ category, difficulty, count, total: expected.total, first: item.kanji });
                        await page.locator('#quit-btn').click();
                    }
                }
            }
            assert.equal(record.combinations.length, 48);
        });
    }
    // 最初の描画だけでなく絞り込んだ全問を解き、後半への別カテゴリ混入、
    // 難易度順序、問題数上限の不具合も検出する。
    for (const category of ['all', 'kotowaza', 'yojijukugo']) {
        for (const difficulty of ['all', '1', '2', '3']) {
            if (category === 'all' && difficulty === 'all') continue;
            await runCase(`meaning-full-pool-${category}-${difficulty}`, async (page, record) => {
                await start(page, { category, difficulty, count: 'all' });
                const expected = expectedPool(category, difficulty), seen = [], levels = [];
                for (let i = 0; i < expected.total; i++) {
                    const item = await answer(page, 'meaning'); seen.push(item.kanji); levels.push(item.difficulty);
                }
                assert.deepEqual([...seen].sort(), expected.items.map(item => item.kanji).sort());
                assert.deepEqual(levels, [...levels].sort(), 'Difficulty progresses from easy to hard');
                await assertScreen(page, 'result');
                record.questions = seen;
            });
        }
    }
}

async function inputSuite() {
    await runCase('meaning-shortcuts-guard-composition-repeat-and-modifiers', async page => {
        await start(page);
        for (const key of ['1', '2', '3', '4']) {
            const before = await counters(page);
            for (const init of [{ repeat: true }, { isComposing: true }, { keyCode: 229 },
                { ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }]) {
                await page.locator('body').dispatchEvent('keydown', { key, code: `Digit${key}`, bubbles: true, ...init });
                assert.deepEqual(await counters(page), before, `Ignore ${key} ${JSON.stringify(init)}`);
            }
            await page.keyboard.press(key);
            const after = await counters(page);
            assert.equal(after.correct + after.wrong, before.correct + before.wrong + 1, `Plain ${key} answers exactly once`);
            await page.keyboard.press(key);
            await page.locator('.choice-btn').nth(Number(key) - 1).dispatchEvent('click');
            assert.deepEqual(await counters(page), after, 'Queued repeated activation cannot rescore feedback');
            await page.clock.runFor(1500);
        }
        await page.locator('#quit-btn').click();
        const home = await counters(page);
        await page.keyboard.press('1'); await page.keyboard.press('4');
        await page.locator('.choice-btn').first().dispatchEvent('click');
        assert.deepEqual(await counters(page), home, 'Stale choice event cannot score outside the game');
    });

    await runCase('fillin-empty-double-submit-and-held-enter', async page => {
        await start(page, { mode: 'fillin' });
        const input = page.locator('#fillin-input');
        const initial = await counters(page);
        await input.fill(' \u3000 '); await page.locator('#submit-btn').click();
        assert.deepEqual(await counters(page), initial, 'Empty normalized input is not an answer');
        const item = await currentItem(page, 'fillin');
        await input.fill(FILLIN[item.hiragana].answer);
        await page.keyboard.down('Enter');
        const answered = await counters(page);
        assert.equal(answered.correct, 1);
        await page.locator('#submit-btn').dispatchEvent('click');
        await input.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true });
        assert.deepEqual(await counters(page), answered, 'Submit plus Enter cannot duplicate points');
        await page.clock.runFor(1500);
        const next = await currentItem(page, 'fillin');
        await input.fill(FILLIN[next.hiragana].answer);
        const readyForNext = await counters(page);
        await page.keyboard.down('Enter');
        assert.deepEqual(await counters(page), readyForNext, 'Held Enter repeat cannot answer the next question');
        await page.keyboard.up('Enter'); await page.keyboard.press('Enter');
        assert.equal(await number(page, '#correct-count'), 2);
    });

    await runCase('fillin-native-ime-composition-commit-cancel', async (page, record, current) => {
        await start(page, { mode: 'fillin' });
        const item = await currentItem(page, 'fillin'), answerText = FILLIN[item.hiragana].answer;
        const katakana = [...answerText].map(char => String.fromCharCode(char.charCodeAt(0) + 0x60)).join('');
        const cdp = await current.context.newCDPSession(page);
        await cdp.send('Input.imeSetComposition', { text: katakana, selectionStart: katakana.length, selectionEnd: katakana.length });
        assert.equal(await page.locator('#fillin-input').inputValue(), katakana, 'Uncommitted katakana remains unchanged');
        await page.locator('#fillin-input').dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, keyCode: 229, bubbles: true });
        await page.locator('#submit-btn').dispatchEvent('click');
        assert.equal(await number(page, '#correct-count'), 0, 'Neither Enter nor queued submit judges composition');
        assert.equal(await page.locator('#fillin-input').inputValue(), katakana);
        await cdp.send('Input.insertText', { text: katakana });
        assert.equal(await page.locator('#fillin-input').inputValue(), answerText, 'Commit normalizes katakana');
        assert.equal(await number(page, '#correct-count'), 0, 'Commit itself does not submit a quiz answer');
        await page.keyboard.press('Enter');
        assert.equal(await number(page, '#correct-count'), 1);
        await page.clock.runFor(1500);
        await cdp.send('Input.imeSetComposition', { text: '誤変換', selectionStart: 3, selectionEnd: 3 });
        assert.equal(await page.locator('#fillin-input').inputValue(), '誤変換');
        await cdp.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 });
        assert.equal(await page.locator('#fillin-input').inputValue(), '');
        assert.equal(await number(page, '#wrong-count'), 0, 'Canceled composition does not count as incorrect');
        await cdp.detach(); record.nativeIME = 'Chromium Input.imeSetComposition + Input.insertText';
    });

    await runCase('fillin-halfwidth-combining-kana-hint-and-inactive-controls', async page => {
        await start(page, { mode: 'fillin', category: 'kotowaza', difficulty: '1', count: 'all' });
        // 通常の回答操作で「花より団子」へ進み、内部の問題を強制しない。
        let item = await currentItem(page, 'fillin'), traversed = 0;
        while (item.kanji !== '花より団子') {
            await answer(page, 'fillin'); item = await currentItem(page, 'fillin');
            assert.ok(++traversed < 25);
        }
        await page.locator('#fillin-input').fill('ﾀﾞﾝｺﾞ');
        assert.equal(await page.locator('#fillin-input').inputValue(), 'だんご');
        await page.locator('#fillin-input').fill('た\u3099んこ\u3099');
        assert.equal(await page.locator('#fillin-input').inputValue(), 'だんご', 'Combining dakuten composes before matching');
        await page.locator('#fillin-input').fill(''); await page.locator('#hint-btn').click();
        assert.equal(await page.locator('#fillin-input').inputValue(), 'だ');
        await page.locator('#fillin-input').fill('だん'); await page.locator('#hint-btn').dispatchEvent('click');
        assert.equal(await page.locator('#fillin-input').inputValue(), 'だん', 'Hint is one-shot for a question');
        await page.locator('#fillin-input').fill(' ﾀﾞﾝｺﾞ\u3000');
        const before = await counters(page); await page.locator('#submit-btn').click();
        assert.equal(await number(page, '#correct-count'), before.correct + 1);
        await page.locator('#quit-btn').click();
        const home = await counters(page);
        await page.locator('#submit-btn').dispatchEvent('click'); await page.locator('#hint-btn').dispatchEvent('click');
        await page.clock.runFor(5000);
        assert.deepEqual(await counters(page), home, 'Stale fill-in events cannot answer or schedule while idle');
        await assertScreen(page, 'start');
        await start(page, { mode: 'meaning' });
        const meaning = await counters(page);
        await page.locator('#submit-btn').dispatchEvent('click');
        assert.deepEqual(await counters(page), meaning, 'Hidden fill-in control cannot answer meaning mode');
    });
}

async function visibilityBoundary(page, hidden) {
    await page.evaluate(hidden => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
        document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
}
async function lifecycleSuite() {
    for (const mode of ['meaning', 'fillin']) {
        await runCase(`${mode}-visibility-pauses-feedback-and-speed-bonus`, async page => {
            await start(page, { mode, settle: false });
            await page.clock.runFor(2000);
            await visibilityBoundary(page, true);
            const beforeHidden = await counters(page);
            await page.clock.runFor(120_000);
            await page.keyboard.press(mode === 'meaning' ? '1' : 'Enter');
            assert.deepEqual(await counters(page), beforeHidden, 'Hidden page cannot score or progress');
            await visibilityBoundary(page, false);
            await page.clock.runFor(1000);
            await answer(page, mode, true, { advance: false });
            assert.equal(await number(page, '#score-points'), 170, 'Only three visible seconds reduce speed bonus');
            await page.clock.runFor(500);
            await visibilityBoundary(page, true);
            const feedback = await counters(page);
            await page.clock.runFor(60_000);
            assert.deepEqual(await counters(page), feedback, 'Hidden feedback retains question and score');
            await visibilityBoundary(page, false);
            await page.clock.runFor(999);
            assert.equal(await text(page, '#progress-text'), feedback.progress, 'Remaining feedback time is preserved');
            await page.clock.runFor(1);
            assert.equal(await text(page, '#progress-text'), '2 / 10');
            await page.clock.setSystemTime(new Date('2038-01-01T00:00:00Z'));
            await page.clock.runFor(1000);
            const oldScore = await number(page, '#score-points');
            await answer(page, mode, true, { advance: false });
            assert.equal(await number(page, '#score-points') - oldScore, 210, 'Wall-clock jumps do not alter monotonic speed bonus');
            await page.clock.runFor(1500);
            await page.clock.setSystemTime(new Date('1999-01-01T00:00:00Z'));
            await page.clock.runFor(1000);
            const oldScore2 = await number(page, '#score-points');
            await answer(page, mode, true, { advance: false });
            assert.equal(await number(page, '#score-points') - oldScore2, 230, 'Backward wall-clock jumps cannot inflate score');
        });
    }
    await runCase('rapid-quit-restart-cancels-transition-focus-celebration', async page => {
        await start(page, { settle: false });
        await answer(page, 'meaning', true, { advance: false });
        await page.locator('#quit-btn').click();
        await start(page, { mode: 'fillin', settle: false });
        const restarted = await text(page, '#question-text');
        await page.clock.runFor(5000);
        await assertScreen(page, 'game'); await assertFocus(page, '#fillin-input');
        assert.equal(await text(page, '#question-text'), restarted);
        assert.equal(await text(page, '#progress-text'), '1 / 10');
        assert.equal(await number(page, '#score-points'), 0);
        await page.locator('#quit-btn').click();
        await start(page);
        await finish(page, 'meaning');
        // 全問正解演出が始まる500msの待ち時間内にタイトルへ戻る。
        await page.locator('#home-btn').click();
        await start(page, { mode: 'fillin' });
        await page.clock.runFor(5000);
        assert.equal(await page.locator('.confetti, .combo-popup').count(), 0, 'Old perfect/combo effects never spill into a new session');
        assert.equal(await text(page, '#progress-text'), '1 / 10');
        await assertFocus(page, '#fillin-input');
    });
    await runCase('celebration-and-combo-effects-are-bounded-and-cleaned', async page => {
        await start(page);
        for (let i = 0; i < 3; i++) {
            await answer(page, 'meaning', true, { advance: false });
            assert.ok(await page.locator('.combo-popup').count() <= 1);
            await page.clock.runFor(1500);
            assert.equal(await page.locator('.combo-popup').count(), 0, 'Expired combo nodes are removed');
        }
        for (let i = 3; i < 10; i++) await answer(page, 'meaning');
        await page.clock.runFor(500);
        const confetti = await page.locator('.confetti').count();
        assert.ok(confetti > 0 && confetti <= 50, 'Single bounded perfect burst');
        await page.clock.runFor(3000);
        assert.equal(await page.locator('.confetti, .combo-popup').count(), 0);
        await page.locator('#retry-btn').click(); await page.locator('#quit-btn').click();
        await page.clock.runFor(60_000);
        await assertScreen(page, 'start');
        assert.equal(await page.locator('.confetti, .combo-popup').count(), 0);
    });
}

// 中央に触れるだけでは上下端の欠けを検出できない。スクロール後の全辺を
// 画面とスクロール・クリップ祖先の交差領域に対して検査する。
async function fullyReachable(page, selector, record) {
    const control = page.locator(selector);
    await control.scrollIntoViewIfNeeded();
    await control.click({ trial: true });
    const measurement = await control.evaluate(node => {
        const rect = node.getBoundingClientRect();
        const clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight }, ancestors = [];
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
            const style = getComputedStyle(parent), box = parent.getBoundingClientRect();
            const clipsX = /^(auto|scroll|hidden|clip)$/.test(style.overflowX);
            const clipsY = /^(auto|scroll|hidden|clip)$/.test(style.overflowY);
            if (clipsX) { clip.left = Math.max(clip.left, box.left + parent.clientLeft); clip.right = Math.min(clip.right, box.left + parent.clientLeft + parent.clientWidth); }
            if (clipsY) { clip.top = Math.max(clip.top, box.top + parent.clientTop); clip.bottom = Math.min(clip.bottom, box.top + parent.clientTop + parent.clientHeight); }
            if (clipsX || clipsY) ancestors.push({ element: parent.id || parent.tagName, overflowX: style.overflowX,
                overflowY: style.overflowY, clipAfterAncestor: { ...clip } });
        }
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return { box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
            left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }, clip, ancestors,
            reachable: !!hit && (hit === node || node.contains(hit)) };
    });
    (record.reachability ||= []).push({ selector, ...measurement });
    const { box, clip } = measurement;
    assert.ok(box.width > 0 && box.height > 0);
    assert.ok(box.left >= clip.left - 1 && box.right <= clip.right + 1 && box.top >= clip.top - 1 && box.bottom <= clip.bottom + 1,
        `${selector} must be fully visible within the viewport and every clipping ancestor: ${JSON.stringify(measurement)}`);
    assert.equal(measurement.reachable, true, `${selector} receives native pointer input without force or DOM click`);
    return measurement;
}

async function parentsAndTouchSuite() {
    for (const viewport of VIEWPORTS) {
        await runCase(`parents-focus-keyboard-and-touch-${viewport.width}x${viewport.height}`, async (page, record) => {
            const opener = page.locator('[data-action="parents-modal-open"]');
            await opener.tap();
            assert.equal(await page.locator('#parents-modal').evaluate(node => node.open), true);
            assert.equal(await opener.getAttribute('aria-expanded'), 'true');
            assert.equal(await page.locator('#parents-modal').evaluate(node => node.contains(document.activeElement)), true);
            await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
            assert.equal(await page.locator('#parents-modal').evaluate(node => node.contains(document.activeElement)), true, 'Native modal traps focus');
            await page.keyboard.press('1');
            await assertScreen(page, 'start');
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('#parents-modal').evaluate(node => node.open), false);
            assert.equal(await opener.getAttribute('aria-expanded'), 'false');
            await assertFocus(page, '[data-action="parents-modal-open"]');
            await opener.tap();
            const close = page.locator('[data-action="parents-modal-close"]').last();
            await close.scrollIntoViewIfNeeded(); await close.tap();
            assert.equal(await page.locator('#parents-modal').evaluate(node => node.open), false);
            await assertFocus(page, '[data-action="parents-modal-open"]');
            await start(page, { mode: 'fillin' });
            assert.equal(await page.locator('#fillin-input').getAttribute('inputmode'), 'text');
            for (const selector of ['#quit-btn', '#fillin-input', '#hint-btn', '#submit-btn']) await fullyReachable(page, selector, record);
            await page.locator('#hint-btn').tap();
            const item = await currentItem(page, 'fillin');
            assert.equal(await page.locator('#fillin-input').inputValue(), FILLIN[item.hiragana].answer[0]);
            await page.locator('#fillin-input').fill(FILLIN[item.hiragana].answer);
            await page.locator('#submit-btn').tap();
            assert.equal(await number(page, '#correct-count'), 1);
            await page.clock.runFor(1500);
            await page.locator('#quit-btn').tap();
            await page.clock.runFor(100);
            await opener.tap();
            await page.clock.runFor(1000);
            assert.equal(await page.locator('#parents-modal').evaluate(node => node.contains(document.activeElement)), true, 'Delayed home focus cannot escape modal');
            await page.keyboard.press('Escape');
            await screenshot(page, `touch-${viewport.width}x${viewport.height}`);
        }, {}, viewport);
    }
}

// 公開環境と同じフォントを読み、実時間・実乱数・通常入力のまま短い画面を検査する。
// 本文やアプリ状態を差し替えず、基準比較とは別の新規コンテキストで実行する。
async function realFontsSmokeSuite() {
    for (const viewport of VIEWPORTS) {
        await runCase(`real-fonts-native-smoke-${viewport.width}x${viewport.height}`, async (page, record) => {
            record.environment = { fonts: 'network-loaded', routes: 'none', serviceWorkers: 'allow',
                clock: 'native', random: 'native', initScripts: 'none' };
            record.fonts = await page.evaluate(async () => {
                await document.fonts.load('400 16px "M PLUS Rounded 1c"');
                await document.fonts.load('700 16px "M PLUS Rounded 1c"');
                await document.fonts.ready;
                return [...document.fonts].map(font => ({ family: font.family, status: font.status, weight: font.weight }));
            });
            assert.ok(record.fonts.some(font => font.family.replace(/["']/g, '') === 'M PLUS Rounded 1c' && font.status === 'loaded'),
                'The real Japanese web font must load; a fallback-font-only pass is insufficient');
            await page.locator('[data-action="parents-modal-open"]').tap();
            const close = page.locator('[data-action="parents-modal-close"]').last();
            await close.scrollIntoViewIfNeeded(); await close.tap();
            await assertFocus(page, '[data-action="parents-modal-open"]');
            for (const mode of ['meaning', 'fillin']) {
                await page.locator(`.btn-mode[data-mode="${mode}"]`).click();
                await assertScreen(page, 'game');
                const selector = mode === 'meaning' ? '.choice-btn:first-child' : '#fillin-input';
                await page.waitForFunction(selector => document.querySelector(selector) === document.activeElement, selector);
                assert.equal(await text(page, '#progress-text'), '1 / 10');
                const controls = mode === 'meaning' ? ['#quit-btn', '.choice-btn:nth-child(1)', '.choice-btn:nth-child(4)']
                    : ['#quit-btn', '#fillin-input', '#hint-btn', '#submit-btn'];
                for (const control of controls) await fullyReachable(page, control, record);
                await page.screenshot({ path: path.join(artifactDir, `real-fonts-${viewport.width}x${viewport.height}-${mode}.png`), fullPage: true });
                const item = await currentItem(page, mode), before = await counters(page);
                if (mode === 'meaning') {
                    const options = await page.locator('.choice-btn').allTextContents();
                    assert.equal(options.filter(option => option === item.meaning).length, 1);
                    await page.locator('.choice-btn').nth(options.indexOf(item.meaning)).click();
                } else {
                    await page.locator('#fillin-input').fill(FILLIN[item.hiragana].answer);
                    await page.locator('#submit-btn').tap();
                }
                assert.equal(await number(page, '#correct-count'), before.correct + 1);
                const gained = await number(page, '#score-points') - before.score;
                assert.ok(gained >= 100 && gained <= 300, 'Native wall-clock timing keeps answer points bounded');
                await page.waitForFunction(() => document.querySelector('#progress-text').textContent.trim() === '2 / 10');
                await fullyReachable(page, '#quit-btn', record);
                await page.locator('#quit-btn').tap();
                await assertScreen(page, 'start');
                await page.waitForFunction(() => document.querySelector('.btn-mode') === document.activeElement);
            }
        }, { nativeEnvironment: true }, viewport);
    }
}

async function storageSuite() {
    const corrupt = [['invalid-json', '{broken'], ['null', 'null'], ['array', '[999]'], ['primitive', '42'],
        ['invalid-scores', JSON.stringify({ meaning_10_all_all: -99, meaning_10: 'Infinity', fillin_10_all_all: {}, fillin_10: null })]];
    for (const [label, value] of corrupt) {
        await runCase(`storage-corrupt-${label}`, async page => {
            await start(page); await finish(page, 'meaning');
            assert.doesNotMatch(await page.locator('#result-screen').innerText(), /NaN|Infinity|undefined|\[object Object\]/);
            assert.ok(parseInt(await text(page, '#result-highscore'), 10) >= 0);
            await page.locator('#home-btn').click();
            await start(page, { mode: 'fillin' }); await finish(page, 'fillin', [0]);
            assert.doesNotMatch(await page.locator('#result-screen').innerText(), /NaN|Infinity|undefined|\[object Object\]/);
        }, { storage: { [KEY]: value, wonder_school_profile_v2: value } });
    }
    for (const boundary of ['denyStorage', 'quotaExceeded', 'audioConstructorFailure']) {
        for (const mode of ['meaning', 'fillin']) {
            await runCase(`${boundary}-${mode}-still-completes`, async page => {
                await start(page, { mode }); await finish(page, mode, [1]);
                assert.equal(await text(page, '#result-correct'), '9 / 10');
                assert.doesNotMatch(await page.locator('#result-screen').innerText(), /NaN|Infinity|undefined/);
                await page.locator('#review-btn').click(); await finish(page, mode);
                await page.locator('#home-btn').click(); await assertScreen(page, 'start');
            }, { [boundary]: true });
        }
    }
    await runCase('storage-legacy-highscore-and-review-isolation', async page => {
        await start(page); await finish(page, 'meaning', [0]);
        assert.equal(parseInt(await text(page, '#result-highscore'), 10), 12345, 'Legacy all/all high score is retained');
        const before = await page.evaluate(key => localStorage.getItem(key), KEY);
        await page.locator('#review-btn').click(); await finish(page, 'meaning');
        assert.equal(await text(page, '#result-highscore'), '-');
        assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), before, 'Review must not overwrite persistent records');
        await page.locator('#home-btn').click();
        await start(page, { category: 'yojijukugo', difficulty: '1' }); await finish(page, 'meaning');
        assert.ok(parseInt(await text(page, '#result-highscore'), 10) < 12345, 'Filtered high score does not inherit an unrelated legacy record');
    }, { storage: { [KEY]: JSON.stringify({ meaning_10: 12345 }) } });
}

async function layoutSnapshot(page) {
    return page.evaluate(() => {
        const round = value => Math.round(value * 100) / 100;
        const key = node => {
            if (node.id) return `#${node.id}`;
            if (node === document.body) return 'body';
            const peers = [...node.parentElement.children].filter(peer => peer.tagName === node.tagName);
            return `${key(node.parentElement)}>${node.tagName.toLowerCase()}:nth-of-type(${peers.indexOf(node) + 1})`;
        };
        const properties = ['display', 'position', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
            'color', 'backgroundColor', 'borderTopColor', 'borderTopWidth', 'borderRadius', 'paddingTop', 'paddingRight',
            'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'gap',
            'gridTemplateColumns', 'flexDirection', 'alignItems', 'justifyContent', 'textAlign', 'boxShadow', 'overflowX', 'overflowY'];
        const nodes = [...document.querySelectorAll('body, body *')].flatMap(node => {
            if (['SCRIPT', 'STYLE', 'LINK', 'META'].includes(node.tagName)) return [];
            const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
            if (!rect.width || !rect.height || style.visibility === 'hidden' || style.display === 'none') return [];
            return [{ key: key(node), gameContainer: node.classList.contains('game-container'), parent: node.parentElement === document.documentElement ? null : key(node.parentElement),
                dynamicRegion: node.closest('#question-text, #choices-area')?.id || null,
                text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),
                box: { x: round(rect.x + scrollX), y: round(rect.y + scrollY), width: round(rect.width), height: round(rect.height) },
                style: Object.fromEntries(properties.map(property => [property, style[property]])),
                semantics: { role: node.getAttribute('role'), label: node.getAttribute('aria-label'), expanded: node.getAttribute('aria-expanded'),
                    pressed: node.getAttribute('aria-pressed'), disabled: node.disabled ?? null },
                value: node instanceof HTMLInputElement ? node.value : null }];
        });
        return { viewport: { width: innerWidth, height: innerHeight }, width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight, activeElement: document.activeElement?.id || document.activeElement?.tagName,
            nodes };
    });
}

function compareLayout(actual, expected, name, state) {
    const previousNodes = new Map(expected.nodes.map(node => [node.key, node]));
    const actualNodes = new Map(actual.nodes.map(node => [node.key, node]));
    const differences = [], allowedContentDifferences = [];
    const dynamic = ['meaning', 'fillin', 'review'].includes(state);
    const changedRegions = ['question-text', 'choices-area'].flatMap(id => {
        const before = expected.nodes.filter(node => node.dynamicRegion === id).map(node => node.text).join('\n');
        const after = actual.nodes.filter(node => node.dynamicRegion === id).map(node => node.text).join('\n');
        const oldRoot = previousNodes.get(`#${id}`), root = actualNodes.get(`#${id}`);
        return dynamic && before !== after && oldRoot && root ? [{ id, before: oldRoot.box, after: root.box, delta: root.box.height - oldRoot.box.height }] : [];
    });
    const previousContainer = expected.nodes.find(node => node.gameContainer);
    const currentContainer = actual.nodes.find(node => node.gameContainer);
    const totalReflow = changedRegions.reduce((sum, region) => sum + region.delta, 0);
    const containerReflow = previousContainer && currentContainer && changedRegions.length > 0
        && Math.abs(currentContainer.box.height - previousContainer.box.height - totalReflow) <= 1;
    const centeredShift = containerReflow ? currentContainer.box.y - previousContainer.box.y : 0;
    const oldGame = previousNodes.get('#game-screen'), newGame = actualNodes.get('#game-screen');
    const shortViewportFix = actual.viewport.height <= 500 && expected.viewport.height <= 500 && dynamic
        && changedRegions.length === 0 && oldGame && newGame && previousContainer && currentContainer
        && oldGame.style.paddingTop === '32px' && newGame.style.paddingTop === '48px'
        && Math.abs(newGame.box.height - oldGame.box.height - 16) <= 1
        && Math.abs(newGame.box.y - oldGame.box.y) <= 1
        && Math.abs(currentContainer.box.y - previousContainer.box.y - 16) <= 1
        && Math.abs(currentContainer.box.height - previousContainer.box.height) <= 1;
    const gameAncestors = new Set();
    for (let key = oldGame?.parent; key; key = previousNodes.get(key)?.parent) gameAncestors.add(key);
    const insideGame = key => {
        for (let cursor = actualNodes.get(key)?.parent; cursor; cursor = actualNodes.get(cursor)?.parent) if (cursor === '#game-screen') return true;
        return false;
    };
    const viewportFixReason = 'Short viewport quit-button clipping: game top padding 32px to 48px, exactly 16px vertical compensation';
    const add = (difference, allowed = false) => (allowed ? allowedContentDifferences : differences).push(difference);
    for (const [key, previous] of previousNodes) {
        const node = actualNodes.get(key);
        if (!node) { add({ key, property: 'missing' }); continue; }
        const changedContent = changedRegions.some(region => node.dynamicRegion === region.id);
        for (const property of ['text', 'value']) {
            if (node[property] !== previous[property]) add({ key, property, previous: previous[property], actual: node[property],
                ...(changedContent ? { reason: 'Audited fill-in correction or independently validated sampled choice/question text' } : {}) }, property === 'text' && changedContent);
        }
        for (const property of Object.keys(previous.style)) {
            if (node.style[property] === previous.style[property]) continue;
            const gradeContrastFix = key === '#result-grade' && ['color', 'borderTopColor'].includes(property)
                && previous.style[property] === 'rgb(51, 65, 85)' && node.style[property] === 'rgb(255, 248, 231)';
            const gameTopPaddingFix = shortViewportFix && key === '#game-screen' && property === 'paddingTop'
                && previous.style[property] === '32px' && node.style[property] === '48px';
            add({ key, property: `style.${property}`, previous: previous.style[property], actual: node.style[property],
                ...(gradeContrastFix ? { reason: 'Verified dark result-card foreground contrast fix; exact old/new colors only, geometry remains strict' } : {}),
                ...(gameTopPaddingFix ? { reason: viewportFixReason } : {}) }, gradeContrastFix || gameTopPaddingFix);
        }
        for (const property of ['x', 'y', 'width', 'height']) {
            if (Math.abs(node.box[property] - previous.box[property]) <= 1) continue;
            const delta = node.box[property] - previous.box[property];
            // 文言修正に伴う改行差は、実測した領域の高さで説明できる縦方向
            // の変化だけを許可する。インライン文字そのもの以外の横位置・幅・全CSSは厳密に比較する。
            // 許可した差分も根拠と画像を残す。
            const preceding = changedRegions.filter(region => previous.box.y >= region.before.y + region.before.height - 1 && node.box.y >= region.after.y + region.after.height - 1);
            const contained = changedRegions.filter(region => previous.box.y <= region.before.y + 1 && previous.box.y + previous.box.height >= region.before.y + region.before.height - 1);
            const inlineTextExtent = changedContent && node.style.display === 'inline' && ['x', 'width'].includes(property);
            const shortViewportGeometryFix = shortViewportFix && Math.abs(delta - 16) <= 1
                && ((property === 'y' && (insideGame(key) || previous.box.y >= oldGame.box.y + oldGame.box.height - 1))
                    || (property === 'height' && (key === '#game-screen' || gameAncestors.has(key))));
            const allowed = shortViewportGeometryFix || inlineTextExtent
                || (property === 'height' && (changedContent || (contained.length > 0 && Math.abs(delta - contained.reduce((sum, region) => sum + region.delta, 0)) <= 1)))
                || (property === 'y' && (changedContent || (containerReflow && Math.abs(delta - centeredShift - preceding.reduce((sum, region) => sum + region.delta, 0)) <= 1)));
            add({ key, property: `box.${property}`, previous: previous.box[property], actual: node.box[property],
                ...(allowed ? { reason: shortViewportGeometryFix ? viewportFixReason : inlineTextExtent ? 'Intrinsic inline glyph extent changes with audited text; structural widths remain strict' : 'Vertical reflow explained by changed rendered content', changedRegions } : {}) }, allowed);
        }
    }
    for (const key of actualNodes.keys()) if (!previousNodes.has(key)) add({ key, property: 'added' });
    if (Math.abs(actual.width - expected.width) > 1) add({ property: 'page.width', previous: expected.width, actual: actual.width });
    if (Math.abs(actual.height - expected.height) > 1) {
        const delta = actual.height - expected.height, explained = changedRegions.reduce((sum, region) => sum + region.delta, 0);
        const viewportHeightFix = shortViewportFix && Math.abs(delta - 16) <= 1;
        add({ property: 'page.height', previous: expected.height, actual: actual.height,
            ...(viewportHeightFix ? { reason: viewportFixReason } : {}) }, viewportHeightFix || (changedRegions.length > 0 && Math.abs(delta - explained) <= 1));
    }
    return { name, differences, allowedContentDifferences };
}

// 透明な背景を直近の色だけで判定せず、計算済みの祖先背景を順に合成する。
// グラデーションは計算済みの色停止点を全て候補にし、最も低い比率を採用する。
async function resultGradeContrast(page) {
    return page.locator('#result-grade').evaluate(node => {
        const parse = value => {
            const values = value.match(/[\d.]+/g)?.map(Number);
            return values && values.length >= 3 ? [values[0], values[1], values[2], values[3] ?? 1] : null;
        };
        const over = (front, back) => {
            const alpha = front[3] + back[3] * (1 - front[3]);
            return [0, 1, 2].map(index => alpha ? (front[index] * front[3] + back[index] * back[3] * (1 - front[3])) / alpha : 0).concat(alpha);
        };
        const luminance = color => color.slice(0, 3).map(value => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
        const ancestors = [];
        for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) ancestors.unshift(ancestor);
        let backgrounds = [[255, 255, 255, 1]];
        const layers = [];
        for (const ancestor of ancestors) {
            const style = getComputedStyle(ancestor);
            const color = parse(style.backgroundColor);
            const imageColors = [...style.backgroundImage.matchAll(/rgba?\([^)]*\)/g)].map(match => parse(match[0])).filter(Boolean);
            layers.push({ element: ancestor.id ? `#${ancestor.id}` : ancestor.tagName.toLowerCase(),
                backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage });
            if (color) backgrounds = backgrounds.map(background => over(color, background));
            if (imageColors.length) backgrounds = backgrounds.flatMap(background => imageColors.map(stop => over(stop, background)));
            if (ancestor === document.body) {
                const texture = getComputedStyle(ancestor, '::before');
                const textureStops = [...texture.backgroundImage.matchAll(/rgba?\([^)]*\)/g)].map(match => parse(match[0])).filter(Boolean);
                if (texture.content !== 'none' && textureStops.length) {
                    layers.push({ element: 'body::before', backgroundColor: texture.backgroundColor, backgroundImage: texture.backgroundImage });
                    backgrounds = backgrounds.flatMap(background => [[...background], ...textureStops.map(stop => over(stop, background))]);
                }
            }
        }
        const style = getComputedStyle(node), foreground = parse(style.color);
        const candidates = backgrounds.map(background => {
            const fg = luminance(over(foreground, background)), bg = luminance(background);
            return { background, contrast: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05) };
        });
        const size = parseFloat(style.fontSize), weight = Number(style.fontWeight) || 400;
        const largeText = size >= 24 || (size >= 18.6667 && weight >= 700);
        return { foreground: style.color, fontSize: style.fontSize, fontWeight: style.fontWeight,
            largeText, minimumRequired: largeText ? 3 : 4.5, layers, candidates,
            minimumContrast: Math.min(...candidates.map(item => item.contrast)),
            method: 'Computed ancestor colors alpha-composited over computed gradient-stop candidates, including body texture; report conservative minimum' };
    });
}

async function layoutSuite() {
    for (const viewport of VIEWPORTS) {
        await runCase(`layout-${viewport.width}x${viewport.height}`, async (page, record) => {
            const baseline = baselineUrl ? await createCase(viewport) : null;
            const comparisons = []; record.states = [];
            try {
                if (baseline) await ready(baseline, baselineUrl);
                const pages = [page, baseline?.page].filter(Boolean);
                for (const state of ['start', 'modal', 'meaning', 'result', 'review', 'fillin']) {
                    for (const target of pages) {
                        if (state === 'modal') await target.locator('[data-action="parents-modal-open"]').click();
                        if (state === 'meaning') {
                            await target.keyboard.press('Escape');
                            await start(target);
                        }
                        if (state === 'result') await finish(target, 'meaning', Array.from({ length: 10 }, (_, index) => index));
                        if (state === 'review') await target.locator('#review-btn').click();
                        if (state === 'fillin') { await target.locator('#quit-btn').click(); await start(target, { mode: 'fillin' }); }
                        await target.clock.runFor(100);
                        await target.evaluate(() => window.scrollTo(0, 0));
                    }
                    const label = `${viewport.width}x${viewport.height}-${state}`, actual = await layoutSnapshot(page);
                    const expected = baseline ? await layoutSnapshot(baseline.page) : null;
                    if (state === 'result') {
                        actual.resultGradeContrast = await resultGradeContrast(page);
                        if (baseline) expected.resultGradeContrast = await resultGradeContrast(baseline.page);
                        record.resultGradeContrast = { candidate: actual.resultGradeContrast, baseline: expected?.resultGradeContrast || null };
                    }
                    await writeJSON(`${label}-geometry.json`, { candidate: actual, baseline: expected });
                    if (state === 'result') assert.ok(actual.resultGradeContrast.minimumContrast >= actual.resultGradeContrast.minimumRequired,
                        'Result grade meets computed large-text contrast across every composited background candidate');
                    await screenshot(page, `${label}-candidate`);
                    if (baseline) {
                        await screenshot(baseline.page, `${label}-baseline`);
                        comparisons.push(compareLayout(actual, expected, label, state));
                    }
                    record.states.push({ state, measuredElements: actual.nodes.length });
                }
                record.baselineComparison = baseline ? 'compared' : 'skipped: KOTOWAZA_QUIZ_BASELINE_ROOT is unset';
                record.comparisons = comparisons;
                await writeJSON(`${viewport.width}x${viewport.height}-comparison.json`, comparisons);
                assert.deepEqual(comparisons.flatMap(item => item.differences.map(diff => ({ state: item.name, ...diff }))), [], 'Preserve baseline layout/styles outside explicitly recorded content reflow');
                if (baseline) {
                    assert.deepEqual(baseline.errors, [], 'No baseline unhandled exceptions');
                    assert.deepEqual(baseline.requestFailures, [], 'Baseline built assets load');
                }
            } finally { await baseline?.context.close(); }
        }, {}, viewport);
    }
}

async function performanceSample(current, count = 80) {
    const { page, context } = current, cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    await start(page, { count: String(count) });
    await cdp.send('HeapProfiler.collectGarbage');
    const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(item => [item.name, item.value]));
    const before = await metrics(), samples = [];
    for (let index = 0; index < count; index++) {
        const a = await metrics(); await answer(page, 'meaning'); const b = await metrics();
        samples.push({ question: index + 1, scriptMs: (b.ScriptDuration - a.ScriptDuration) * 1000,
            taskMs: (b.TaskDuration - a.TaskDuration) * 1000, heapAllocatedNetBytes: b.JSHeapUsedSize - a.JSHeapUsedSize,
            nodes: b.Nodes, eventListeners: b.JSEventListeners });
    }
    await page.clock.runFor(4000); await page.locator('#home-btn').click(); await page.clock.runFor(100);
    await cdp.send('HeapProfiler.collectGarbage');
    const after = await metrics(), dom = await cdp.send('Memory.getDOMCounters');
    await cdp.detach();
    return { before, after, retainedHeapDeltaBytes: after.JSHeapUsedSize - before.JSHeapUsedSize, dom, samples,
        note: 'Read-only Chromium performance metrics. Per-question net heap is not total allocation and may include GC. Browser clock is controlled; no timing threshold or claimed native timer count.' };
}
// 仮想時計だけではAudioContextの実時間やBlinkの破棄待ちを進められない。
// 接続中DOMと全体カウンターを分け、同じ画面状態で実時間・GC後の安定値を測る。
async function retentionSnapshot(page, cdp) {
    const connected = await page.evaluate(() => {
        const nodesByType = {}, elementsByTag = {};
        const walker = document.createTreeWalker(document, NodeFilter.SHOW_ALL);
        let count = 0;
        do {
            const node = walker.currentNode;
            count++;
            nodesByType[node.nodeType] = (nodesByType[node.nodeType] || 0) + 1;
            if (node.nodeType === Node.ELEMENT_NODE) elementsByTag[node.tagName] = (elementsByTag[node.tagName] || 0) + 1;
        } while (walker.nextNode());
        return { count, nodesByType, elementsByTag,
            activeScreen: document.querySelector('.screen.active')?.id,
            effects: document.querySelectorAll('.confetti, .combo-popup').length };
    });
    const dom = await cdp.send('Memory.getDOMCounters');
    const metrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(item => [item.name, item.value]));
    return { connected, dom, audioHandlers: metrics.AudioHandlers,
        heapUsedBytes: metrics.JSHeapUsedSize, documents: metrics.Documents,
        detachedScriptStates: metrics.DetachedScriptStates };
}
async function settledRetentionCheckpoint(page, cdp, label, record) {
    const checkpoint = { label, samples: [], stable: false };
    record.repeatedSessions.checkpoints.push(checkpoint);
    await page.clock.runFor(5000);
    for (let attempt = 0; attempt < 6; attempt++) {
        // 最長440msの音が終わる実時間を確保し、V8とBlinkの相互参照を二巡回収する。
        await new Promise(resolve => setTimeout(resolve, 600));
        await cdp.send('HeapProfiler.collectGarbage');
        await new Promise(resolve => setTimeout(resolve, 25));
        await cdp.send('HeapProfiler.collectGarbage');
        const sample = await retentionSnapshot(page, cdp);
        checkpoint.samples.push(sample);
        const previous = checkpoint.samples.at(-2);
        const signature = item => JSON.stringify({ connected: item.connected, dom: item.dom,
            audioHandlers: item.audioHandlers, documents: item.documents, detachedScriptStates: item.detachedScriptStates });
        checkpoint.stable = !!previous && signature(previous) === signature(sample);
        checkpoint.final = sample;
        // 失敗や待ち時間超過でも、比較対象を含めた生の測定値を必ず残す。
        await writeJSON('performance.json', record);
        if (checkpoint.stable) break;
    }
    assert.equal(checkpoint.stable, true, `${label}: renderer/audio counters settle after native audio and repeated GC; see recorded samples`);
    return checkpoint.final;
}
async function captureRetentionHeap(cdp, record) {
    const chunks = [], collect = event => chunks.push(event.chunk);
    cdp.on('HeapProfiler.addHeapSnapshotChunk', collect);
    try {
        await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
        const name = 'retention-failure.heapsnapshot';
        await writeFile(path.join(artifactDir, name), chunks.join(''));
        record.repeatedSessions.failureHeapSnapshot = name;
    } catch (error) { record.repeatedSessions.heapSnapshotError = error.message; }
    finally { cdp.off('HeapProfiler.addHeapSnapshotChunk', collect); }
}
async function repeatedSessionBatch(page, count) {
    assert.equal(count % 2, 0, 'Each equal-state batch must finish with fill-in mode');
    for (let repeat = 0; repeat < count; repeat++) {
        const mode = repeat % 2 ? 'fillin' : 'meaning';
        await start(page, { mode, settle: false });
        await answer(page, mode, true, { advance: false });
        await page.locator('#quit-btn').click();
        await page.clock.runFor(5000);
    }
    await assertScreen(page, 'start');
}
async function performanceSuite() {
    await runCase('performance-real-question-flow-and-repeated-session-cleanup', async (page, record, current) => {
        record.candidate = await performanceSample(current);
        await writeJSON('performance.json', record);
        if (baselineUrl) {
            const baseline = await createCase();
            try { await ready(baseline, baselineUrl); record.baseline = await performanceSample(baseline); }
            finally { await baseline.context.close(); }
            await writeJSON('performance.json', record);
        }
        // 80問の測定履歴やリザルトDOMを混ぜず、両モードを温めた独立ページで比較する。
        const retention = await createCase();
        const cdp = await retention.context.newCDPSession(retention.page);
        record.repeatedSessions = { warmupSessions: 4, sessionsPerBatch: 12, checkpoints: [],
            bounds: { globalNodes: 20, globalEventListeners: 4, connectedDOM: 'exact equality at every settled checkpoint' },
            rationale: 'CDP counts include detached and native objects. Warm both modes, drain actual audio, perform repeated cross-heap GC, and compare equal start-screen states across two batches.' };
        try {
            await ready(retention);
            await cdp.send('Performance.enable');
            await repeatedSessionBatch(retention.page, 4);
            const before = await settledRetentionCheckpoint(retention.page, cdp, 'warmed-baseline', record);
            record.repeatedSessions.before = before;
            await repeatedSessionBatch(retention.page, 12);
            const afterFirst = await settledRetentionCheckpoint(retention.page, cdp, 'after-first-12', record);
            record.repeatedSessions.afterFirst = afterFirst;
            await repeatedSessionBatch(retention.page, 12);
            const afterSecond = await settledRetentionCheckpoint(retention.page, cdp, 'after-second-12', record);
            record.repeatedSessions.afterSecond = afterSecond;
            record.repeatedSessions.deltas = { firstNodes: afterFirst.dom.nodes - before.dom.nodes,
                secondNodes: afterSecond.dom.nodes - before.dom.nodes,
                secondBatchNodes: afterSecond.dom.nodes - afterFirst.dom.nodes,
                firstListeners: afterFirst.dom.jsEventListeners - before.dom.jsEventListeners,
                secondListeners: afterSecond.dom.jsEventListeners - before.dom.jsEventListeners };
            await writeJSON('performance.json', record);
            for (const [label, after] of [['first batch', afterFirst], ['second batch', afterSecond]]) {
                assert.deepEqual(after.connected, before.connected, `${label}: connected DOM stays exactly bounded at the same home state`);
                assert.ok(after.dom.nodes <= before.dom.nodes + 20, `${label}: global DOM nodes retain the original +20 bound; see performance.json`);
                assert.ok(after.dom.jsEventListeners <= before.dom.jsEventListeners + 4, `${label}: global listeners retain the original +4 bound; see performance.json`);
                assert.equal(after.audioHandlers, before.audioHandlers, `${label}: native audio nodes return to the warmed idle baseline`);
                assert.equal(after.documents, before.documents, `${label}: repeated games do not retain extra documents`);
            }
            const stable = await counters(retention.page);
            await retention.page.clock.runFor(60_000);
            assert.deepEqual(await counters(retention.page), stable, 'No stale observable question timers remain after cleanup');
            assert.equal(await retention.page.locator('.confetti, .combo-popup').count(), 0);
            assert.deepEqual(retention.errors, [], 'Retention page has no unhandled exceptions');
            assert.deepEqual(retention.requestFailures, [], 'Retention page uses all actual built assets');
            assert.deepEqual(retention.dialogs, [], 'Retention page has no unexpected alerts');
        } catch (error) {
            record.repeatedSessions.failure = error.stack || String(error);
            await writeJSON('performance.json', record);
            await captureRetentionHeap(cdp, record);
            throw error;
        } finally {
            await writeJSON('performance.json', record);
            await cdp.detach(); await retention.context.close();
        }
    });
}
try {
    await mkdir(artifactDir, { recursive: true });
    assert.equal(ITEMS.length, 179);
    assert.equal(Object.keys(FILLIN).length, 179);
    for (const item of ITEMS) assert.ok(FILLIN[item.hiragana], `Missing independent fill-in fixture: ${item.kanji}`);
    candidateUrl = await serveDist(dist); await writeAssetManifest(dist, 'candidate');
    let baselineDist;
    if (process.env.KOTOWAZA_QUIZ_BASELINE_ROOT) {
        baselineDist = path.resolve(process.env.KOTOWAZA_QUIZ_BASELINE_ROOT);
        assert.notEqual(dist, baselineDist, 'Baseline and candidate must be different build roots');
        baselineUrl = await serveDist(baselineDist); await writeAssetManifest(baselineDist, 'baseline');
    } else console.log('[INFO] KOTOWAZA_QUIZ_BASELINE_ROOT unset: baseline comparison explicitly skipped; candidate interactions, 4 widths and evidence still run.');
    browser = await chromium.launch({ headless: true });
    await writeJSON('run-metadata.json', { browser: 'Chromium', version: browser.version(), candidateDist: dist, baselineDist: baselineDist || null,
        time: NOW, viewports: VIEWPORTS, serviceWorkers: 'blocked', corpusBase: 'b87306448a9ea91a8a954873974c63538bd14b0a',
        boundaries: ['seeded Math.random', 'controlled browser clock and wall-clock jumps', 'storage fixtures/failures',
            'AudioContext constructor failure', 'native Chromium IME', 'synthetic document visibilitychange', 'keyboard/queued DOM input events'],
        assertions: 'Rendered DOM and read-only browser performance measurements only; no imported app code, exposed runtime state, mocked answers, forced internal transitions, or substituted built assets',
        layoutExceptions: 'Audited dynamic text/reflow, exact result-grade contrast colors, and short active-game viewport top padding 32px→48px with only explained +16px vertical deltas; all exceptions recorded',
        productionLikeSmoke: 'Four fresh contexts with real Japanese fonts, service workers allowed, no routes/init scripts/clock/random overrides' });
    await layoutSuite();
    await gameplaySuite();
    await settingsSuite();
    await inputSuite();
    await lifecycleSuite();
    await parentsAndTouchSuite();
    await realFontsSmokeSuite();
    await storageSuite();
    await performanceSuite();
    const verification = [await verifyAssets(dist, 'candidate')];
    if (baselineDist) verification.push(await verifyAssets(baselineDist, 'baseline'));
    await writeJSON('asset-verification.json', verification);
    await writeJSON('summary.json', { total: results.length, passed: results.filter(item => item.status === 'passed').length,
        failed: failures.length, baselineComparison: baselineDist ? 'performed' : 'explicitly skipped', artifactDir });
    if (failures.length) throw new AggregateError(failures, `Kotowaza Quiz built E2E: ${failures.length}/${results.length} cases failed; see ${artifactDir}/results.json`);
    console.log(`[OK] Kotowaza Quiz built E2E: ${results.length} passed. Screenshots, geometry, corpus coverage, performance and asset hashes: ${artifactDir}`);
} catch (error) {
    await writeJSON('run-error.json', { error: error.stack || String(error), completedCases: results.length }).catch(() => {});
    throw error;
} finally {
    await browser?.close();
    for (const server of servers.reverse()) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
