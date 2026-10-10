import { ECOLOGY, ECOLOGY_REVIEWED_AT } from './ecology';
import { deepSeaData, type DeepSeaItem } from './data';
import { CONFIG } from './core/config';

const REVIEWED_AT = '2026-08-07';
const REMOVED_CONTENT_IDS = new Set<string>(['golden_oarfish']);

type SourceReference = { label: string; url: string };
type LearningNote = {
  status: 'observed' | 'established' | 'hypothesis' | 'folklore';
  heading: string;
  text: string;
  prompt: string;
  sources: SourceReference[];
};

const SOURCE_CATALOG = {
  coelacanth: {
    label: 'Smithsonian Ocean — Coelacanth',
    url: 'https://ocean.si.edu/ocean-life/fish/coelacanth'
  },
  barreleye: {
    label: 'MBARI — Barreleye fish',
    url: 'https://www.mbari.org/animal/barreleye-fish/'
  },
  barreleyeResearch: {
    label: 'MBARI — transparent head / rotating eyes research',
    url: 'https://www.mbari.org/news/researchers-solve-mystery-of-deep-sea-fish-with-tubular-eyes-and-transparent-head/'
  },
  oarfish: {
    label: 'Florida Museum — Oarfish',
    url: 'https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/oarfish/'
  },
  oarfishEarthquake: {
    label: 'Seismological Society of America — deep-sea fish and earthquakes (2019)',
    url: 'https://www.seismosoc.org/news/deep-sea-fish-do-not-signal-upcoming-earthquake-in-japan/'
  },
  frilledShark: {
    label: 'Australian Museum — Frill Shark',
    url: 'https://australian.museum/learn/animals/fishes/frill-shark-chlamydoselachus-anguineus-garman-1884/'
  },
  blobfish: {
    label: 'Australian Museum — Blobfish',
    url: 'https://australian.museum/learn/animals/fishes/fathead-psychrolutes-aka-mr-blobby/'
  },
  spermWhale: {
    label: 'NOAA Fisheries — Sperm whale clicks',
    url: 'https://www.fisheries.noaa.gov/science-blog/diving-deep-sperm-whale-clicks'
  },
  hydrothermalVent: {
    label: 'NOAA — What is a hydrothermal vent?',
    url: 'https://oceanservice.noaa.gov/facts/vents.html'
  },
  challengerDeep: {
    label: 'NOAA — Challenger Deep depth',
    url: 'https://oceanservice.noaa.gov/facts/oceandepth.html'
  }
};

const LEARNING_NOTES: Record<string, LearningNote> = {
  coelacanth: {
    status: 'observed',
    heading: '🔬 からだのヒミツ',
    text: 'シーラカンスには、普通の脊椎動物のように完全に骨化した背骨の中心が少なく、体の長さ方向に液体で満たされた「脊索」が残っています。',
    prompt: '🤔 「昔の特徴を残している」ことと、「昔からまったく変わっていない」ことは同じかな？',
    sources: [SOURCE_CATALOG.coelacanth]
  },
  barreleye: {
    status: 'hypothesis',
    heading: '👀 見えたこと / 💭 まだ研究中',
    text: '透明な頭の中で目が上向きから前向きへ回転することは観察されています。一方で、透明なシールドがクダクラゲ類の刺胞から目を守るという説明は、研究者が考えている有力な仮説です。',
    prompt: '🤔 もし君が深海ロボットを使えるなら、「目を守るシールド説」をどうやって確かめる？',
    sources: [SOURCE_CATALOG.barreleye, SOURCE_CATALOG.barreleyeResearch]
  },
  oarfish: {
    status: 'folklore',
    heading: '🌊 深海のウワサを科学チェック！',
    text: '日本では、リュウグウノツカイなど珍しい深海魚が現れると「地震が近い」と語られることがあります。でも日本の記録を調べた2019年の統計研究では、深海魚の出現と地震のはっきりした関係はほとんど見つかりませんでした。',
    prompt: '🤔 それでも、なぜこんな言い伝えが生まれたんだろう？「珍しいから記憶に残る」「大きな出来事と結びつけた」以外にも理由を考えてみよう。',
    sources: [SOURCE_CATALOG.oarfish, SOURCE_CATALOG.oarfishEarthquake]
  },
  frilled_shark: {
    status: 'established',
    heading: '🦈 ほんとうにサメ？',
    text: 'ラブカはウナギのように細長い姿ですが、れっきとしたサメの仲間です。6対のえら穴と、3本の長い尖りをもつ特徴的な歯があります。',
    prompt: '🤔 見た目が似ていても、仲間分けにはどんな特徴を見ればよさそう？',
    sources: [SOURCE_CATALOG.frilledShark]
  },
  blobfish: {
    status: 'established',
    heading: '🐟 写真だけで決めつけない',
    text: '有名な「ぶよぶよの顔」は、深い場所から引き上げられた標本の姿で広まりました。ROVが深海で撮った仲間は、陸上で有名な写真とはかなり違う姿をしています。',
    prompt: '🤔 生き物を「本当の姿」で知るには、標本・写真・生息地での観察をどう組み合わせればいいかな？',
    sources: [SOURCE_CATALOG.blobfish]
  },
  whale: {
    status: 'established',
    heading: '🔊 暗闇を「音」で見る',
    text: 'マッコウクジラは深く潜って獲物を探すとき、強いクリック音を出し、返ってくる反響を使って周囲や獲物を探ります。巨大な頭の内部は、この音を作り、送り出すしくみに関わっています。',
    prompt: '🤔 光がほとんどない深海では、「見る」以外にどんな感覚が役立つだろう？',
    sources: [SOURCE_CATALOG.spermWhale]
  },
  hydrothermal_vent: {
    status: 'established',
    heading: '🌋 太陽がなくても生態系？',
    text: '熱水噴出孔は、海水が海底の割れ目から入り、地下で熱せられて再び噴き出す場所です。周りには、太陽光ではなく化学反応からエネルギーを得る微生物を土台にした生態系があります。',
    prompt: '🤔 「生き物には太陽の光が必要」と思っていたら、この場所はどんな驚きをくれる？',
    sources: [SOURCE_CATALOG.hydrothermalVent]
  },
  vent: {
    status: 'established',
    heading: '🏁 海の底のゴール',
    text: 'チャレンジャー海淵は、現在知られている海の最深部です。近年の精密な測定では最深部がおよそ10,935mと報告されています。PikaLabでは「10,000m DIVE」をゲームのゴールとして丸めて表示しています。',
    prompt: '🤔 もし海面から10,935mまで1mずつ目盛りをつけたら、東京スカイツリーは何本くらい入るだろう？',
    sources: [SOURCE_CATALOG.challengerDeep]
  }
};

function findItem(id: string): DeepSeaItem | null {
  for (const item of deepSeaData) {
    if (item.id === id) return item;
    if (item.type === 'battle' && Array.isArray(item.participants)) {
      const participant = item.participants.find((candidate) => candidate.id === id);
      if (participant) return participant;
    }
  }
  return null;
}

function patchItem(id: string, patch: Partial<DeepSeaItem>) {
  const item = findItem(id);
  if (!item) return;
  Object.assign(item, patch);
}

function removeFictionalRareContent() {
  for (let index = deepSeaData.length - 1; index >= 0; index -= 1) {
    if (REMOVED_CONTENT_IDS.has(deepSeaData[index].id)) {
      deepSeaData.splice(index, 1);
    }
  }
}

function migrateLegacyStorage() {
  if (typeof localStorage === 'undefined') return;

  try {
    const raw = localStorage.getItem(CONFIG.STORAGE.KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((id: unknown): id is string => typeof id === 'string' && !REMOVED_CONTENT_IDS.has(id));
        localStorage.setItem(CONFIG.STORAGE.KEY, JSON.stringify({ v: CONFIG.STORAGE.VERSION, data: filtered }));
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.data)) {
        parsed.data = parsed.data.filter((id: unknown): id is string => typeof id === 'string' && !REMOVED_CONTENT_IDS.has(id));
        localStorage.setItem(CONFIG.STORAGE.KEY, JSON.stringify(parsed));
      }
    }

    const quizKey = `${CONFIG.STORAGE.KEY}_quiz`;
    const quizRaw = localStorage.getItem(quizKey);
    if (quizRaw) {
      const quizIds = JSON.parse(quizRaw);
      if (Array.isArray(quizIds)) {
        localStorage.setItem(quizKey, JSON.stringify(quizIds.filter((id: unknown): id is string => typeof id === 'string' && !REMOVED_CONTENT_IDS.has(id))));
      }
    }
  } catch (error) {
    console.warn('Deep Sea content migration skipped:', error);
  }
}

function addAccurateHydrothermalVent() {
  if (deepSeaData.some((item) => item.id === 'hydrothermal_vent')) return;

  const missionIndex = deepSeaData.findIndex((item) => item.id === 'vent');
  const hydrothermalVent: DeepSeaItem = {
    id: 'hydrothermal_vent',
    title: '熱水噴出孔',
    englishName: 'Hydrothermal Vent',
    depthRange: '数百m - 約5000m（場所による）',
    sizeRange: '場所による',
    description: '海底の割れ目から、地下で熱せられた水が噴き出す場所。黒い煙のように見えるものは、熱水に溶けていた鉱物が冷たい海水に触れて細かな粒になったものです。',
    fact: '太陽の光が届かなくても、化学反応からエネルギーを得る微生物を土台にして、たくさんの生き物が集まる生態系ができます。',
    depth_m: 4700,
    right: '8%',
    size: 160,
    type: 'landmark',
    anim_class: 'animate-pulse-slow',
    border_class: 'border-orange-400/30',
    bg_class: 'bg-black',
    image: 'images/deepsea_vent_1780389410123.png',
    is_artifact: true
  };

  if (missionIndex >= 0) {
    deepSeaData.splice(missionIndex, 0, hydrothermalVent);
  } else {
    deepSeaData.push(hydrothermalVent);
  }
}

function applyScientificCopyCorrections() {
  patchItem('coelacanth', {
    description: '約4億年前から仲間の化石が知られる肉鰭類（にくきるい）の魚。現生のシーラカンスも古い特徴をいくつも残しているため「生きた化石」と呼ばれることがあります。ヒレの内部には骨格があり、左右のヒレを独特のリズムで動かして泳ぎます。',
    macroFact: '体の中には、普通の脊椎動物のように完全に骨化した背骨の中心が少なく、液体で満たされた太い「脊索（せきさく）」が頭から尾の方向へ残っているんだ。'
  });

  patchItem('barreleye', {
    description: '透明で液体に満たされた頭のシールドの中に、緑色の筒のような「目」があります。口の上に見える2つの小さな点は目ではなく、においを感じる器官です。',
    fact: '深海での観察と生きた個体の研究から、目を上向きから前向きへ回転させられることが確かめられています。上を見て獲物を探し、食べるときには前を見ることができます。',
    macroFact: '研究者は、透明なシールドがクダクラゲ類の刺胞から目を守るのではないかと考えています。ただし、これは観察から立てられた「仮説」で、食べ方の細部にはまだ分からないことがあります。'
  });

  patchItem('oarfish', {
    description: '銀色の平たく長い体と、赤いヒレが目立つ巨大な硬骨魚。とても珍しく、海面近くで見られることが少ないため、昔の「シーサーペント（海の大蛇）」伝説のモデルになった可能性も考えられています。',
    fact: '長い体を大きくくねらせるより、背びれを波のように動かして泳ぎます。体を縦にして漂う姿も観察されていて、獲物を探す行動ではないかと考えられています。',
    macroFact: '体には普通の魚のようなウロコがなく、皮膚は銀色に見えるグアニンという物質で覆われています。長い体そのものが、まだまだ観察したくなる深海のナゾです。'
  });

  patchItem('frilled_shark', {
    description: 'ウナギのような細長い体に、フリルのように見える6対のえら穴を持つサメの仲間。現代の多くのサメとは違う特徴をいくつも残しています。',
    fact: '口には、3本の長い尖りを持つ特徴的な歯が何列も並んでいます。内向きの歯は、イカなどの滑りやすい獲物をつかむのに役立つと考えられています。'
  });

  patchItem('blobfish', {
    description: '深海に暮らすニュウドウカジカの仲間。やわらかい体をしていて、深海でROVに撮影された姿は、陸上で有名になった「ぶよぶよの顔」の写真とはかなり違って見えます。',
    fact: '深海から急に引き上げられた魚は、圧力や温度の大きな変化で本来の姿が崩れることがあります。深海生物を知るときは「どこで撮られた姿か」も大切な手がかりです。'
  });

  patchItem('whale', {
    description: '世界最大のハクジラで、長い息こらえをしながら深海へ潜ってイカなどを探します。巨大な頭の中には、強いクリック音を作って前方へ送り出すしくみに関わる器官があります。',
    fact: '深く潜って獲物を探すときは「クリック」という音を出し、物や獲物から返ってくる反響を手がかりにします。近づくとクリックの間隔を速める「バズ」も使います。'
  });

  patchItem('squid', {
    fact: '2本の長い触腕と8本の腕には吸盤があり、その周りにはギザギザした硬いリングがあります。マッコウクジラの皮膚に丸い吸盤の痕が残ることもあります。'
  });

  patchItem('vent', {
    title: 'チャレンジャー海淵',
    englishName: 'Challenger Deep',
    depthRange: '約10,935m（最深部の測定値）',
    sizeRange: '海底地形',
    description: 'マリアナ海溝にある、現在知られている世界の海で最も深い場所。PikaLabでは遊びやすく「10,000m DIVE」をミッションのゴールにしています。画面の光や噴き上がるような演出はゴール演出で、ここに熱水噴出孔があることを示すものではありません。',
    fact: '2020年の潜水調査データを使った研究では、最深部は平均海面から10,935m（誤差を含む）と推定されています。深さの測定そのものも、圧力・重力・海水の性質を補正する科学なんです。'
  });
}

function createSourceLink(source: SourceReference): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = source.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = 'text-[10px] text-cyan-300 hover:text-cyan-200 underline underline-offset-2 break-words';
  link.textContent = source.label;
  return link;
}

function ensureLearningPanel(): HTMLElement | null {
  const factElement = document.getElementById('sea-fact');
  if (!factElement || !factElement.parentElement) return null;

  let panel = document.getElementById('deepsea-learning-note');
  if (panel) return panel;

  panel = document.createElement('section');
  panel.id = 'deepsea-learning-note';
  panel.className = 'mt-4 p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-left';
  factElement.parentElement.appendChild(panel);
  return panel;
}

function findCurrentItemByTitle(): DeepSeaItem | null {
  const title = document.getElementById('sea-title')?.textContent?.trim();
  if (!title) return null;

  for (const item of deepSeaData) {
    if (item.title === title) return item;
    if (item.type === 'battle' && Array.isArray(item.participants)) {
      const participant = item.participants.find((candidate) => candidate.title === title);
      if (participant) return participant;
    }
  }
  return null;
}

function renderLearningPanel() {
  const panel = ensureLearningPanel();
  if (!panel) return;

  const item = findCurrentItemByTitle();
  const note = item ? LEARNING_NOTES[item.id] : null;
  const ecology = item ? ECOLOGY[item.id] : null;
  if (!note && !ecology) {
    panel.classList.add('hidden');
    panel.textContent = '';
    return;
  }

  panel.classList.remove('hidden');
  panel.textContent = '';

  if (ecology) {
    const heading = document.createElement('h3');
    heading.className = 'text-sm font-black text-cyan-200 mb-2';
    heading.textContent = '🧭 すむ場所と展示の見方';
    panel.appendChild(heading);
    const details = document.createElement('p');
    details.className = 'text-xs sm:text-sm text-slate-200 leading-relaxed';
    const placement = ecology.night === undefined
      ? `展示点 ${ecology.depth.toLocaleString()}m（昼夜共通）`
      : `展示点 昼${ecology.depth.toLocaleString()}m / 夜${ecology.night.toLocaleString()}m`;
    details.textContent = `${ecology.taxon} ｜ ${ecology.habitat} ｜ ${placement}。${ecology.evidence}`;
    panel.appendChild(details);
    const light = document.createElement('p');
    light.className = 'mt-3 text-xs text-slate-200 leading-relaxed';
    light.textContent = `${ecology.light || '発光の表現は確認できた資料と区別しています。'} 絵・大きさ・縁の光は観察を楽しむための表現で、実写や発光の実測ではありません。いろライトは演出照明で、蛍光の実験ではありません。`;
    panel.appendChild(light);
    const sources = document.createElement('div');
    sources.className = 'mt-3 flex flex-col gap-1';
    const reviewed = document.createElement('span');
    reviewed.className = 'text-[10px] text-slate-500';
    reviewed.textContent = `生態の情報確認: ${ECOLOGY_REVIEWED_AT}（リンク先の画像は転載していません）`;
    sources.appendChild(reviewed);
    ecology.sources.forEach(([label, url]) => sources.appendChild(createSourceLink({ label, url })));
    panel.appendChild(sources);
  }
  if (!note) return;

  const heading = document.createElement('h3');
  heading.className = 'text-sm font-black text-cyan-200 mb-2';
  heading.textContent = note.heading;
  panel.appendChild(heading);

  const body = document.createElement('p');
  body.className = 'text-xs sm:text-sm text-slate-200 leading-relaxed';
  body.textContent = note.text;
  panel.appendChild(body);

  const prompt = document.createElement('div');
  prompt.className = 'mt-3 p-3 rounded-lg bg-indigo-950/40 border border-indigo-400/20 text-xs sm:text-sm text-indigo-100 font-bold leading-relaxed';
  prompt.textContent = note.prompt;
  panel.appendChild(prompt);

  const sourceBox = document.createElement('div');
  sourceBox.className = 'mt-3 pt-3 border-t border-cyan-500/10 flex flex-col gap-1';

  const sourceHeading = document.createElement('span');
  sourceHeading.className = 'text-[10px] uppercase tracking-wider text-slate-500 font-bold';
  sourceHeading.textContent = `情報確認: ${REVIEWED_AT}`;
  sourceBox.appendChild(sourceHeading);

  note.sources.forEach((source) => sourceBox.appendChild(createSourceLink(source)));
  panel.appendChild(sourceBox);
}

function updateAlbumTotal() {
  const badge = document.querySelector('.album-badge');
  if (!badge) return;

  const total = deepSeaData.reduce((count, item) => {
    if (item.type === 'battle' && Array.isArray(item.participants)) return count + item.participants.length;
    return count + 1;
  }, 0);

  const countElement = document.getElementById('album-count');
  if (!countElement) return;

  for (const node of Array.from(badge.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.includes('/')) {
      node.textContent = `/${total}`;
    }
  }
}

removeFictionalRareContent();
migrateLegacyStorage();
addAccurateHydrothermalVent();
applyScientificCopyCorrections();

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    updateAlbumTotal();

    const titleElement = document.getElementById('sea-title');
    if (titleElement) {
      const observer = new MutationObserver(() => renderLearningPanel());
      observer.observe(titleElement, { childList: true, subtree: true, characterData: true });
    }

    renderLearningPanel();
  });
}

