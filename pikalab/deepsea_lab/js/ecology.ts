import type { DeepSeaItem } from './data';

export const ECOLOGY_REVIEWED_AT = '2026-10-03';
export type EcologyRecord = {
  taxon: string;
  bounds: readonly [number, number];
  range: string;
  depth: number;
  night?: number;
  left?: string;
  right?: string;
  habitat: '浅い海' | '中層' | '海底付近' | '海底' | '熱水域の海底';
  evidence: string;
  light?: string;
  title?: string;
  sources: readonly [string, string][];
};

// bounds は下記資料が支える展示用の区間。分布の絶対限界・平均深度ではない。
// 地域や種をまたぐ「深さの博物館」であり、全種が同じ海に共存する図ではない。
export const ECOLOGY: Readonly<Record<string, EcologyRecord>> = {
  clownfish: { taxon: 'Amphiprion ocellaris', bounds: [1,15], range: '1m - 15m（サンゴ礁）', depth: 8, left: '8%', habitat: '浅い海', evidence: 'イソギンチャクと暮らす浅いサンゴ礁の魚。夜に深海へ移る演出はしません。', sources: [['Fishes of Australia','https://fishesofaustralia.net.au/home/species/1275']] },
  turtle: { taxon: 'Chelonia mydas', bounds: [0,100], range: '浅い沿岸・回遊中の潜水（調査例は100mまで）', depth: 5, left: '35%', habitat: '浅い海', evidence: '呼吸のため海面へ戻ります。潜る深さは地域・成長段階・採食や休息で変わり、昼夜の動きを全個体共通にはしません。', sources: [['回遊中の潜水研究','https://pmc.ncbi.nlm.nih.gov/articles/PMC4580322/']] },
  dolphin: { taxon: 'Tursiops truncatus', bounds: [3,46], range: 'よく潜る深さの例 3m - 46m（生息地による）', depth: 10, left: '70%', habitat: '浅い海', evidence: '沿岸での潜水を描いた例です。息をするため海面へ戻り、ずっとこの深さに住むわけではありません。沖合の個体群ではさらに深い潜水もあります。', sources: [['SeaWorld — Bottlenose dolphin','https://seaworld.org/animals/facts/mammals/bottlenose-dolphin/']] },
  clione: { taxon: 'Clione spp.（属の仲間）', bounds: [0,600], range: '海面 - 600m（仲間の主な生息深度）', depth: 300, right: '8%', habitat: '中層', evidence: 'ここではクリオネ属の仲間として紹介します。資料で確認できない規則的な昼夜の上昇・下降は再現しません。', light: '透明な体や赤い内臓は自発光の証拠ではありません。蛍光を示す演出は加えていません。', sources: [['Monterey Bay Aquarium — Sea angel','https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/sea-angel'],['UCSB — Clione','https://biolum.eemb.ucsb.edu/organism/pictures/clione.html']] },
  coelacanth: { taxon: 'Latimeria spp.（属の仲間）', bounds: [91,400], range: '観察・生息例 約91m - 400m（地域による）', depth: 300, left: '35%', habitat: '海底付近', evidence: 'コモロでは昼に洞窟で休み、夜に外へ出て採食します。ただし、それを決まった深さへの鉛直移動とはみなしません。ここでは属の仲間として展示します。', sources: [['Smithsonian — Coelacanth','https://ocean.si.edu/ocean-life/fish/coelacanth'],['Nature Communications — 生息環境110〜400m','https://www.nature.com/articles/ncomms9222']] },
  oarfish: { taxon: 'Regalecus glesne', bounds: [15,1000], range: '15m - 1000m（200mより浅いことが多い）', depth: 450, right: '8%', habitat: '中層', evidence: '記録された生息範囲の中から450mを展示点に選びました。平均深度ではありません。銀色の体は光を反射します。', sources: [['Smithsonian STRI — Regalecus glesne','https://biogeodb.stri.si.edu/caribbean/en/thefishes/species/4940']] },
  goblin_shark: { taxon: 'Mitsukurina owstoni', bounds: [0,1200], range: '大陸斜面の海底付近（約1200mなどの記録）', depth: 450, left: '8%', habitat: '海底付近', evidence: '海底の近くを泳ぐサメ。1200mを絶対の限界とはしていません。深い場所での記録は今も更新されています。', sources: [['Australian Museum — Goblin shark','https://australian.museum/learn/animals/fishes/goblin-shark-mitsukurina-owstoni/'],['2026年の深度記録研究','https://doi.org/10.1111/jfb.70505']] },
  barreleye: { taxon: 'Macropinna microstoma', bounds: [600,800], range: '600m - 800m', depth: 700, left: 'calc(50% - 140px)', habitat: '中層', evidence: '緑色の筒状の目を持つ中層の魚。夜に350mまで上がるという根拠は確認できないため、昼夜とも同じ展示点です。', light: '目の緑色を自発光や蛍光とはみなしません。', sources: [['MBARI — Barreleye fish','https://www.mbari.org/animal/barreleye-fish/']] },
  viperfish: { taxon: 'Chauliodus sloani', bounds: [400,2500], range: '約400m - 2500m（地域・昼夜による）', depth: 800, night: 650, left: 'calc(50% - 4px)', habitat: '中層', evidence: '西部熱帯大西洋の調査で多かった帯は昼700〜900m、夜600〜700m。この展示は昼800m・夜650mの例です。一部だけが移動し、地域でも違います。', light: '体や目の下、背びれに発光器があります。光の色・強さを画面の縁取りで測れるわけではありません。', sources: [['2020年の鉛直分布研究','https://pmc.ncbi.nlm.nih.gov/articles/PMC7710699/'],['Australian Museum — Sloane’s viperfish','https://australian.museum/learn/animals/fishes/sloanes-viperfish-chauliodus-sloani/']] },
  frilled_shark: { taxon: 'Chlamydoselachus anguineus', bounds: [120,1500], range: '120m - 1500m（多くは500〜1000m）', depth: 1350, right: '8%', habitat: '海底付近', evidence: '大陸棚・斜面にすむサメ。1350mは記録範囲内の展示点で、最も多い深さではありません。', sources: [['Australian Museum — Frill shark','https://australian.museum/learn/animals/fishes/frill-shark-chlamydoselachus-anguineus-garman-1884/']] },
  cookiecutter_shark: { taxon: 'Isistius brasiliensis', bounds: [0,3700], range: '海面 - 約3700m（深度記録の範囲）', depth: 1500, night: 50, left: '55%', habitat: '中層', evidence: '昼は1000mより深い場所にいて、夜は海面近くへ上がることが知られています。1500m・50mはその動きを紹介する展示点で、全個体共通の深さではありません。', light: 'お腹の発光器による生物発光。暗い首輪の部分には発光器がありません。蛍光とは別のしくみです。', sources: [['Florida Museum — Cookiecutter shark','https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/cookiecutter-shark/'],['Florida Museum — Isistius研究','https://www.floridamuseum.ufl.edu/wp-content/uploads/sites/35/2018/07/Vol55No7archival.pdf']] },
  giant_isopod: { taxon: 'Bathynomus giganteus', bounds: [170,2140], range: '170m - 2140m', depth: 1700, right: '25%', habitat: '海底', evidence: '泥や粘土の海底を歩く掃除屋。目が照明を反射して光って見えることと、生物発光は別です。', sources: [['Aquarium of the Pacific — Giant isopod','https://www.aquariumofpacific.org/onlinelearningcenter/species/giant_isopod/P1']] },
  predatory_tunicate: { taxon: 'Megalodicopia hians', bounds: [204,3864], range: '204m - 3864m（研究の観察範囲）', depth: 2000, left: '8%', habitat: '海底', evidence: '海底の岩や斜面に付着して獲物を待ちます。泳いで昼夜に移動する生物ではありません。', sources: [['Monterey Canyonの原著研究','https://www.sciencedirect.com/science/article/abs/pii/S0967063705002761'],['MBARI — Predatory tunicate','https://www.mbari.org/animal/predatory-tunicate/']] },
  yeti_crab: { taxon: 'Kiwa hirsuta', bounds: [2200,2228], range: '約2200m（タイプ標本は2228m）', depth: 2228, right: '30%', habitat: '熱水域の海底', evidence: '熱水域の岩の上で発見された種類です。別種キワ・プラヴィダの細菌を育てる行動を、この種で確かめた事実とはしません。', sources: [['MBARI — Discovery of the yeti crab','https://www.mbari.org/news/discovery-of-the-yeti-crab/']] },
  blobfish: { taxon: 'Psychrolutes phrictus', bounds: [1279,2466], range: '観察例 1279m - 2466m（分布の限界ではない）', depth: 2466, left: '15%', habitat: '海底', evidence: '海底に暮らすニュウドウカジカ。英語のblobfishは他の近縁種にも使われます。イラストは標本写真や種の同定資料ではありません。', sources: [['高知大学 — 魚類目録','https://www.kochi-u.ac.jp/w3museum/Fish_Labo/FishCatalog/Fishlist/Scorpaeni.html'],['NOAA — Davidson Seamount調査','https://repository.library.noaa.gov/view/noaa/497/noaa_497_DS1.pdf'],['NOAA — Deep-sea animals','https://www.st.nmfs.noaa.gov/spo/SPO/pp16.pdf']] },
  scaly_foot_snail: { taxon: 'Chrysomallon squamiferum', bounds: [2400,2900], range: '約2400m - 2900m（熱水域）', depth: 2650, right: '20%', habitat: '熱水域の海底', evidence: 'インド洋の限られた熱水噴出域にすむ巻貝。どの海底にもいるわけではありません。', sources: [['JAMSTEC — スケーリーフット','https://www.jamstec.go.jp/e/about/press_release/20190723/'],['IUCN — 生息域・水深','https://doi.org/10.2305/IUCN.UK.2019-2.RLTS.T103636217A103636261.en']] },
  pelican_eel: { taxon: 'Eurypharynx pelecanoides', bounds: [500,3000], range: '500m - 3000m', depth: 3000, right: '20%', habitat: '中層', evidence: '水中を漂い、大きく広がる口を使います。海底に立つ魚ではありません。', light: '尾の先に発光器があります。全身が蛍光色に変わるという意味ではありません。', sources: [['Australian Museum — Pelican eel','https://australian.museum/learn/animals/fishes/pelican-eel-eurypharynx-pelecanoides/']] },
  swimming_sea_cucumber: { taxon: 'Enypniastes eximia', bounds: [461,5689], range: '461m - 5689m（記録の範囲）', depth: 3400, left: '25%', habitat: '海底付近', evidence: '泳いで移動し、海底へ降りて堆積物から食べ物をとります。ずっと中層だけで暮らすナマコではありません。', light: '刺激を受けたとき、発光する分泌物や表皮を使う防御が報告されています。常時ピンク色に光る蛍光ではありません。', sources: [['NOAA — Headless chicken monster','https://oceanexplorer.noaa.gov/ocean-fact/what-is-a-headless-chicken-monster/'],['INVEMAR — ナマコ類目録','https://www.invemar.org.co/redcostera1/invemar/docs/10454EQII__web.pdf'],['深海底の発光研究','https://journals.biologists.com/jeb/article/215/19/3335/10960/Light-and-vision-in-the-deep-sea-benthos-I']] },
  angler: { taxon: 'Ceratioidei（深海性アンコウの仲間）', bounds: [300,4000], range: '仲間の生息例 300m - 4000m（種による）', depth: 3700, left: '25%', habitat: '中層', title: 'チョウチンアンコウの仲間', evidence: 'ここでは特定の一種ではなく、光るルアーを持つ深海性の仲間を紹介します。3700mは展示上の例で、全種がこの深さにいるわけではありません。', light: 'ルアーでは共生する細菌が発光します。画面の黄色い光点は位置や明るさを単純化した演出です。', sources: [['MBARI — Deep-sea anglerfish','https://www.mbari.org/animal/deep-sea-anglerfish/']] },
  tripod: { taxon: 'Bathypterois grallator', bounds: [878,4720], range: '878m - 4720m', depth: 4400, right: '12%', habitat: '海底', evidence: '長いヒレを海底につけて立ち、流れに乗ってくる餌を待ちます。昼夜の鉛直移動は再現しません。', sources: [['Bishop Museum — 魚類目録','https://hbs.bishopmuseum.org/pubs-online/pdf/bz06.pdf']] },
  sea_pig: { taxon: 'Scotoplanes spp.（属の仲間）', bounds: [1000,6000], range: '1000m - 6000m（仲間の範囲）', depth: 4800, left: '15%', habitat: '海底', title: 'センジュナマコの仲間', evidence: '泥の海底を歩き、堆積物の有機物を食べます。ここではスコトプラネス属の仲間として展示します。', sources: [['MBARI — Sea pig','https://www.mbari.org/animal/sea-pig/']] },
  dumbo: { taxon: 'Grimpoteuthis spp.（属の仲間）', bounds: [2295,6957], range: '観察例 2295m - 6957m（種により異なる）', depth: 5400, left: '30%', habitat: '海底付近', title: 'ダンボオクトパスの仲間', evidence: '耳のようなヒレで海底近くを泳ぐジュウモンジダコ属の仲間。日本の「メンダコ」と同じ一種ではありません。深い記録は別種も含む属の記録です。', sources: [['NOAA — Deep-sea animals','https://spo.nmfs.noaa.gov/sites/default/files/pp16.pdf'],['2020年 — 5760m・6957mの観察','https://link.springer.com/article/10.1007/s00227-020-03701-1']] },
  snailfish: { taxon: 'Pseudoliparis swirei', bounds: [6898,7966], range: '6898m - 7966m（原記載の採集範囲）', depth: 7500, left: '30%', habitat: '海底付近', evidence: 'マリアナ海溝で採集された標本の深度です。映像記録や別種の最深記録とは分けています。魚が11000mまで暮らすという意味ではありません。', sources: [['原記載論文 — Pseudoliparis swirei','https://www.biotaxa.org/Zootaxa/article/view/zootaxa.4358.1.7']] },
  whale: { taxon: 'Physeter macrocephalus', bounds: [0,3000], range: '海面で呼吸・深い海へ潜って採食', depth: 700, habitat: '中層', evidence: '700mはイカを探す潜水の展示例。ずっと深海に住むのではなく、呼吸のため海面へ戻ります。相手との遭遇場面は観察映像の再現ではありません。', sources: [['NOAA — マッコウクジラの採食深度','https://www.fisheries.noaa.gov/s3/2024-11/authorization-hawaii-deepset-longline-fishery-biological-opinion-addended-2023-05-22.pdf'],['原著研究 — 400〜1200mの採食潜水','https://doi.org/10.1111/j.1365-2656.2006.01101.x']] },
  squid: { taxon: 'Architeuthis dux', bounds: [500,1000], range: '約500m - 1000m（主な生息深度の目安）', depth: 700, habitat: '中層', evidence: 'マッコウクジラに食べられる関係は知られています。この700mの遭遇場面は、その関係を紹介するイメージです。', sources: [['Smithsonian — Giant squid','https://ocean.si.edu/ocean-life/invertebrates/giant-squid'],['NOAA — 生きたダイオウイカの観察','https://repository.library.noaa.gov/view/noaa/59467/noaa_59467_DS1.pdf']] }
};

export function applyReviewedEcology(items: DeepSeaItem[]): void {
  for (const item of items) {
    const record = ECOLOGY[item.id];
    if (record) {
      item.depth_m = record.depth;
      item.depthRange = record.range;
      if (record.title) item.title = record.title;
      delete item.nightDepth_m;
      if (record.night !== undefined) item.nightDepth_m = record.night;
      delete item.fluorescent;
      delete item.left;
      delete item.right;
      if (record.left) item.left = record.left;
      if (record.right) item.right = record.right;
      if (record.habitat === '海底' || record.habitat === '熱水域の海底') item.anim_class = '';
    }
    if (item.type === 'battle' && item.participants) {
      item.depth_m = ECOLOGY.whale.depth;
      item.depthRange = `${item.depth_m}m（遭遇を描く展示上の例）`;
      applyReviewedEcology(item.participants);
    }
  }
}
