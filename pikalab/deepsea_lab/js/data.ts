export interface DeepSeaItem {
  id: string;
  title: string;
  englishName: string;
  depthRange: string;
  sizeRange: string;
  description: string;
  fact: string;
  depth_m?: number;
  left?: string;
  right?: string;
  size?: number;
  type: 'creature' | 'battle' | 'vent' | 'landmark';
  anim_class?: string;
  border_class?: string;
  bg_class?: string;
  image: string;
  glow?: boolean;
  is_artifact?: boolean;
  participants?: DeepSeaItem[];
  spawnRate?: number;
  cssFilter?: string;
  quiz?: {
    question: string;
    options: string[];
    answerIndex: number;
    successFact: string;
  };
  fluorescent?: boolean;
  nightDepth_m?: number;
  spawnPointsRequired?: number;
  macroFact?: string;
}

export interface DepthMarker {
  depth: number;
  label: string;
  class: string;
}

export const deepSeaData: DeepSeaItem[] = [
  {
    id: "clownfish",
    title: "カクレクマノミ",
    englishName: "Clownfish",
    depthRange: "0m - 50m",
    sizeRange: "10-15cm",
    description: "サンゴ礁の浅い海に住んでいます。イソギンチャクと仲良しで、毒のある触手の中で敵から守られながら暮らしています。イソギンチャクには食べ残しをあげるなどしてお礼をしています。",
    fact: "群れでは大きなメスとオスが繁殖します。メスがいなくなると、繁殖していたオスがメスに性転換し、次に大きい個体が繁殖するオスになります。",
    depth_m: 120,
    left: "15%",
    size: 96,
    type: "creature",
    anim_class: "animate-float",
    border_class: "border-white",
    bg_class: "bg-blue-400",
    image: "images/deepsea_clownfish_1780390322711.png",
    quiz: {
      question: "カクレクマノミについてただしいものはどれ？",
      options: ["オスからメスに性別がかわることがある", "メスからオスにだけ性別がかわる", "いっしょう性別がかわらない"],
      answerIndex: 0,
      successFact: "せいかい！群れのメスがいなくなると、繁殖していたオスがメスに性転換します。"
    },
    macroFact: "体のまわりのネバネバした粘液（ねんえき）は、イソギンチャクの毒から身を守るための特別なバリアなんだよ！"
  },
  {
    id: "clione",
    title: "クリオネ",
    englishName: "Sea Angel",
    depthRange: "0m - 500m",
    sizeRange: "1-3cm",
    description: "「流氷の天使」と呼ばれる美しい姿ですが、実は殻のない巻貝の仲間。泳ぐ姿は天使のようですが、エサを食べるときは頭から6本の恐ろしい触手（バッカルコーン）を出して捕食します。",
    fact: "クリオネの主食は「ミジンウキマイマイ」という別の貝だけ。偏食家なのです。",
    depth_m: 300,
    nightDepth_m: 100,
    right: "20%",
    size: 96,
    type: "creature",
    anim_class: "animate-float",
    border_class: "border-blue-200/50",
    bg_class: "bg-cyan-900",
    image: "images/deepsea_clione_1780408407512.png",
    fluorescent: true,
    quiz: {
      question: "クリオネがエサを食べるときに出す、6本のしょく手の名前は？",
      options: ["エンジェルコーン", "バッカルコーン", "デビルコーン"],
      answerIndex: 1,
      successFact: "せいかい！頭から「バッカルコーン」を出して獲物をがっちり捕まえます。"
    }
  },
  {
    id: "dolphin",
    title: "バンドウイルカ",
    englishName: "Bottlenose Dolphin",
    depthRange: "0m - 200m",
    sizeRange: "2.5-3.8m",
    description: "好奇心旺盛で遊び好きな海の人気者。クリック音の反響を使う「エコーロケーション」で、濁った水の中でも獲物を探せます。仲間とのやりとりには、ホイッスルなどの音も使います。",
    fact: "寝るときは溺れないように、脳の半分だけ休ませて、もう半分で呼吸や敵を警戒しています。片目を開けたまま眠るんですよ。",
    depth_m: 500,
    right: "15%",
    size: 160,
    type: "creature",
    anim_class: "animate-float-delayed",
    border_class: "border-white",
    bg_class: "bg-blue-300",
    image: "images/deepsea_dolphin.png",
    quiz: {
      question: "バンドウイルカのねむりかたでただしいものは？",
      options: ["目を両方とじて、完全にねむる", "脳の半分だけ休ませて、片目を開けてねむる", "およぐのをやめて海底でねむる"],
      answerIndex: 1,
      successFact: "せいかい！イルカは溺れないように、脳の半分ずつ交互に眠らせます。"
    },
    macroFact: "イルカの皮膚のいちばん外側の層は、約2時間で入れ替わることがあるんだ。なめらかな表面を保ち、水の抵抗を減らすのに役立つと考えられているよ。"
  },
  {
    id: "coelacanth",
    title: "シーラカンス",
    englishName: "Coelacanth",
    depthRange: "150m - 700m",
    sizeRange: "1.5-2m",
    description: "「生きた化石」と呼ばれる古代魚。恐竜がいた時代から姿をほとんど変えずに生きています。普通の魚と違い、ヒレの根元に筋肉と骨があり、まるで手足のように動かして泳ぎます。",
    fact: "頭の中に「ロストラル器官」というゼリー状の組織があり、微弱な電気を感じ取って暗闇でも獲物を見つけることができます。",
    depth_m: 750,
    left: "25%",
    size: 160,
    type: "creature",
    anim_class: "",
    border_class: "border-slate-400/50",
    bg_class: "bg-slate-800",
    image: "images/deepsea_coelacanth_1780408220645.png",
    quiz: {
      question: "シーラカンスの太く肉厚なヒレの中を支えるものは？",
      options: ["筋肉と骨", "ウロコとトゲ", "たくさんの毒針"],
      answerIndex: 0,
      successFact: "せいかい！肉厚なヒレの中に筋肉と骨があり、左右のヒレを独特のリズムで動かして泳ぎます。"
    },
    macroFact: "背骨（せぼね）がなくて、かわりに油のような液体が詰まった管（脊索：せきさく）が頭から尾まで通っているんだ！"
  },
  {
    id: "turtle",
    title: "アオウミガメ",
    englishName: "Green Sea Turtle",
    depthRange: "0m - 300m",
    sizeRange: "80-150cm",
    description: "海の中を飛ぶように優雅に泳ぎます。主に海藻などを食べる草食性ですが、子供の頃はクラゲなども食べます。涙を流しているように見えるのは、体の中の塩分を出しているからです。",
    fact: "成体のメスは長い回遊のあと、生まれた地域に近い砂浜へ戻って産卵することが多く、地球の磁場などを手がかりにしていると考えられています。",
    depth_m: 200,
    left: "30%",
    size: 128,
    type: "creature",
    anim_class: "",
    border_class: "border-white/50",
    bg_class: "bg-blue-500",
    image: "images/deepsea_turtle_1780389293156.png",
    macroFact: "海水の塩分を目の近くにある塩類腺（えんるいせん）から出すため、まるで涙を流しているように見えるんだよ。"
  },
  {
    id: "barreleye",
    title: "デメニギス",
    englishName: "Barreleye Fish",
    depthRange: "600m - 800m",
    sizeRange: "15cm",
    description: "戦闘機のような透明なドーム状の頭を持っています。その中にある緑色の丸いカプセルのようなものが「目」です！口の上にある小さな点は目ではなく、鼻です。",
    fact: "普段、目は真上を向いて獲物の影を探していますが、食べる時は目を前に回転させることができます。透明な頭は目を守るシールドです。",
    depth_m: 1100,
    nightDepth_m: 350,
    left: "10%",
    size: 128,
    type: "creature",
    anim_class: "animate-float",
    border_class: "border-white/30",
    bg_class: "bg-black",
    image: "images/deepsea_barreleye_v2_1780408267611.png",
    fluorescent: true,
    quiz: {
      question: "デメニギスの透明な頭の中にある、緑色の丸い部分は体のどこ？",
      options: ["目", "脳みそ", "鼻"],
      answerIndex: 0,
      successFact: "せいかい！あの緑色のドーム状の球体がデメニギスの「目」です。"
    },
    macroFact: "透明なドームは実はゼリーのような物質で満たされていて、クラゲの毒針から目を守るヘルメットの役割をしているよ。"
  },
  {
    id: "oarfish",
    title: "リュウグウノツカイ",
    englishName: "Giant Oarfish",
    depthRange: "200m - 1000m",
    sizeRange: "3m - 11m",
    description: "銀色の平たく長い体を持つ深海の巨大魚。赤いトサカのようなヒレが特徴で、伝説の「シーサーペント（海の大蛇）」の正体とも言われています。",
    fact: "泳ぐときは体を横にくねらせるのではなく、背びれを波打たせて、まるで立ち泳ぎのように縦になって静止している姿が目撃されています。",
    depth_m: 1300,
    right: "15%",
    size: 192,
    type: "creature",
    anim_class: "",
    border_class: "border-white/30",
    bg_class: "bg-indigo-900",
    image: "images/deepsea_oarfish_v2_1780408254790.png",
    macroFact: "長い背ビレの先端には、水の中のわずかな振動や化学物質を感じ取る特別なセンサーがあると考えられているよ。"
  },
  {
    id: "golden_oarfish",
    title: "黄金のリュウグウノツカイ",
    englishName: "Golden Giant Oarfish",
    depthRange: "200m - 1000m",
    sizeRange: "3m - 11m",
    description: "数百万匹に一匹の確率でしか現れないと言われる、幻の黄金個体。見つけると幸運が訪れるかもしれません。",
    fact: "科学的にはアルビノ（色素欠乏）や突然変異によるものとされていますが、神々しい光を放っているように見えます。",
    depth_m: 1350,
    left: "10%",
    size: 192,
    type: "creature",
    anim_class: "animate-float",
    border_class: "border-yellow-400/80",
    bg_class: "bg-yellow-900",
    image: "images/deepsea_oarfish_v2_1780408254790.png",
    spawnRate: 0.2, // 20%の確率で出現
    cssFilter: "hue-rotate(320deg) brightness(1.8) saturate(2.5) drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))",
    spawnPointsRequired: 3,
    macroFact: "全身を覆う黄金のウロコ（のような組織）は、深海のわずかな青い光を反射して、自分自身の姿をカモフラージュする役割があるかもしれないんだ。"
  },
  {
    id: "frilled_shark",
    title: "ラブカ",
    englishName: "Frilled Shark",
    depthRange: "500m - 1000m",
    sizeRange: "1.5-2m",
    description: "ウナギのような細長い体に、フリルのようなエラを持つサメの仲間。原始的な特徴を多く残すことから「生きた化石」と呼ばれることがあります。",
    fact: "口の中には三つ又に分かれた鋭い歯が300本ほど並び、イカなどの滑りやすい獲物をとらえるのに役立ちます。",
    depth_m: 1500,
    left: "20%",
    size: 160,
    type: "creature",
    anim_class: "animate-float",
    border_class: "border-slate-600/50",
    bg_class: "bg-slate-900",
    image: "images/deepsea_frilled_shark_1780408341871.png"
  },
  {
    id: "cookiecutter_shark",
    title: "ダルマザメ",
    englishName: "Cookiecutter Shark",
    depthRange: "1000m",
    sizeRange: "40-50cm",
    description: "小さくて可愛い名前ですが、とても恐ろしいサメです。クジラや他の大型魚にこっそり近づき、鋭い歯で肉を丸く（クッキーを型抜きするように）くり抜いて食べて逃げます。",
    fact: "お腹が光ることで、下から見上げたときに海面の光に溶け込み、自分の影を消す「カウンターイルミネーション」というステルス機能を持っています。",
    depth_m: 1700,
    nightDepth_m: 250,
    right: "25%",
    size: 112,
    type: "creature",
    anim_class: "animate-float-delayed",
    border_class: "border-red-900/50",
    bg_class: "bg-black",
    image: "images/deepsea_cookiecutter_shark_1780408395069.png",
    macroFact: "鋭い下アゴの歯はすべての歯がつながっていて、クッキーの型を抜くように獲物の皮膚を丸くくり抜いて食べることができるんだ！"
  },
  {
    id: "predatory_tunicate",
    title: "オオグチボヤ",
    englishName: "Predatory Tunicate",
    depthRange: "200m - 1000m",
    sizeRange: "10-15cm",
    description: "ホヤの仲間ですが、プランクトンをこし取って食べる普通のホヤとは違い、大きな口（入水孔）をパックリと開けて小動物を丸飲みする「肉食系」です。",
    fact: "海底の岩にしっかりくっついて、獲物が飛び込んでくるのを口を開けたままじっと待っています。透明なパックンチョのおもちゃのようです。",
    depth_m: 1900,
    left: "15%",
    size: 128,
    type: "creature",
    anim_class: "animate-pulse-slow",
    border_class: "border-white/10",
    bg_class: "bg-black",
    image: "images/deepsea_predatory_tunicate_1780408369639.png",
    macroFact: "体が透明なので、飲み込んだ獲物が消化される様子が外から丸見えになってしまうんだよ！"
  },
  {
    id: "viperfish",
    title: "ホウライエソ",
    englishName: "Viperfish",
    depthRange: "500m - 2500m",
    sizeRange: "30-60cm",
    description: "口に収まりきらないほどの長く鋭いキバを持つ、まさに深海のギャング。お腹には光る器官（発光器）が一列に並んでいます。",
    fact: "背びれの先が長ーく伸びていて、その先をピカピカ光らせて獲物をおびき寄せます。まるで釣り竿のようです。",
    depth_m: 2100,
    nightDepth_m: 400,
    right: "30%",
    size: 144,
    type: "creature",
    anim_class: "",
    border_class: "border-gray-500/50",
    bg_class: "bg-black",
    image: "images/deepsea_viperfish_1780408325638.png",
    macroFact: "頭の後ろにある特別な関節（かんせつ）を使って、口を120度以上も大きく開いて自分と同じくらいの獲物を丸呑みできるんだよ。"
  },
  {
    id: "blobfish",
    title: "ニュウドウカジカ",
    englishName: "Blobfish",
    depthRange: "600m - 1200m",
    sizeRange: "30cm",
    description: "「世界で一番ブサイクな生き物」に選ばれたことがあります。でも本当は、水圧の高い深海では普通の魚の顔をしています。陸に上げると水圧がなくなり、デロッと溶けたような顔になります。",
    fact: "筋肉がほとんどなく、水より少し軽いゼリーのような体で浮力を得ています。泳ぐのが苦手なので、目の前を通る獲物を口を開けてじっと待ち伏せします。",
    depth_m: 2300,
    left: "15%",
    size: 144,
    type: "creature",
    anim_class: "",
    border_class: "border-white/10",
    bg_class: "bg-slate-800",
    image: "images/deepsea_blobfish_1780389309818.png"
  },
  {
    id: "goblin_shark",
    title: "ミツクリザメ",
    englishName: "Goblin Shark",
    depthRange: "1300m",
    sizeRange: "3-4m",
    description: "長く突き出た鼻（吻）と、血の通ったピンク色の不気味な体が特徴。「悪魔のサメ（ゴブリンシャーク）」と呼ばれます。",
    fact: "獲物を見つけると、アゴが信じられないほど前方にグワッと飛び出して噛みつきます！まさにエイリアンのような捕食方法です。",
    depth_m: 2500,
    right: "15%",
    size: 176,
    type: "creature",
    anim_class: "animate-float",
    border_class: "border-red-900/30",
    bg_class: "bg-slate-900",
    image: "images/deepsea_goblin_shark_1780408309113.png"
  },
  {
    id: "giant_isopod",
    title: "ダイオウグソクムシ",
    englishName: "Giant Isopod",
    depthRange: "200m - 2000m",
    sizeRange: "20-50cm",
    description: "ダンゴムシの仲間（等脚類）の中で世界最大。海底に落ちてきた魚の死骸などを食べるため「深海の掃除屋」と呼ばれています。",
    fact: "エサが少ない深海で生き抜くため、極限までエネルギーを節約できます。水族館で「5年以上もエサを食べずに生きた」という信じられない記録があります。",
    depth_m: 2700,
    right: "25%",
    size: 160,
    type: "creature",
    anim_class: "",
    border_class: "border-slate-500/50",
    bg_class: "bg-slate-800",
    image: "images/deepsea_giant_isopod_1780408204091.png"
  },
  {
    id: "pelican_eel",
    title: "フクロウナギ",
    englishName: "Pelican Eel",
    depthRange: "500m - 3000m",
    sizeRange: "70-80cm",
    description: "細長い体に比べて大きな口と、ペリカンのようにふくらむ喉の袋を持っています。袋のような口を広げて獲物を取り込みます。",
    fact: "尻尾の先が赤く光り、それを揺らして獲物をおびき寄せると言われています。大きな口の割に歯はとても小さく、目は退化しています。", /* 注意: この文面にも "of" が入っていた。気づいたのでこれも「尻尾の先」「大きな口の割に」に修正しよう */
    depth_m: 3200,
    right: "20%",
    size: 160,
    type: "creature",
    anim_class: "animate-float",
    border_class: "border-gray-600/30",
    bg_class: "bg-black",
    image: "images/deepsea_pelican_eel_1780408356187.png"
  },
  {
    id: "swimming_sea_cucumber",
    title: "ユメナマコ",
    englishName: "Swimming Sea Cucumber",
    depthRange: "300m - 5000m",
    sizeRange: "10-25cm",
    description: "ナマコの仲間ですが、海底を這うだけでなく、ヒレのような膜を使って深海を優雅に泳ぎます。体が透けていて内臓が見えます。",
    fact: "泳ぐ姿が不気味ながらも美しいため、「夢」ナマコと名付けられました。英語では「首なしチキンモンスター」と呼ばれることもあります。",
    depth_m: 3400,
    left: "25%",
    size: 128,
    type: "creature",
    anim_class: "animate-float-delayed",
    border_class: "border-pink-500/20",
    bg_class: "bg-black",
    image: "images/deepsea_swimming_sea_cucumber_1780408421213.png"
  },
  {
    id: "shipwreck",
    title: "沈没船の残骸",
    englishName: "Shipwreck",
    depthRange: "3000m",
    sizeRange: "約50m",
    description: "深い海にも、事故などで沈没した船の残骸が眠っています。残り方は水温・酸素・海流・微生物などで変わり、深海でも鉄の腐食や微生物による分解は進みます。",
    fact: "沈没船は深海の生き物たちにとって、格好の「隠れ家」や「住処」になります。そこを中心に新しい独自の生態系が作られることもあります。",
    depth_m: 3200,
    left: "15%",
    size: 88,
    type: "landmark",
    anim_class: "",
    border_class: "border-slate-500/30",
    bg_class: "bg-black",
    image: "images/deepsea_shipwreck_1780396059686.png",
    is_artifact: true
  },
  {
    id: "angler",
    title: "チョウチンアンコウ",
    englishName: "Anglerfish",
    depthRange: "1000m - 4000m",
    sizeRange: "60cm",
    description: "頭の上の突起（エスカ）を光らせて、近づいてきた小魚を大きな口でパクッと食べます。光っているのはアンコウ自身ではなく、共生している発光バクテリアです。",
    fact: "実は、大きな体のメスのお腹に、とても小さなオスが噛み付いて一生を過ごす種類もいます。オスは栄養をもらう代わりにメスの一部になります。",
    depth_m: 4200,
    left: "25%",
    size: 224,
    type: "creature",
    anim_class: "animate-pulse-slow",
    border_class: "border-purple-900/40",
    bg_class: "bg-black",
    glow: true,
    image: "images/deepsea_anglerfish_v2_1780408241111.png"
  },
  {
    id: "yeti_crab",
    title: "イエティクラブ (キワ・ヒルスタ)",
    englishName: "Yeti Crab",
    depthRange: "2200m",
    sizeRange: "15cm",
    description: "熱水噴出孔の周りで見つかった、毛むくじゃらの腕を持つ不思議なカニ（正確にはヤドカリの仲間）。雪男（イエティ）のようだと話題になりました。",
    fact: "腕のフサフサした毛にバクテリアがすんでいて、それを自分のエサにしているのではないかと考えられています。",
    depth_m: 4500,
    right: "30%",
    size: 144,
    type: "creature",
    anim_class: "animate-float",
    border_class: "border-white/20",
    bg_class: "bg-slate-800",
    image: "images/deepsea_yeti_crab_1780408436544.png"
  },
  {
    id: "sea_pig",
    title: "センジュナマコ",
    englishName: "Sea Pig",
    depthRange: "1000m - 6000m",
    sizeRange: "10-15cm",
    description: "海底の泥の上を、筒状の脚（管足）を使ってトコトコと歩き回るナマコ。ピンク色でぷっくりした姿が「海の豚（シーピッグ）」と呼ばれています。",
    fact: "泥の中にある有機物（プランクトンの死骸など）をモシャモシャと食べます。大きな群れを作って、みんなで同じ方向を向いて歩く姿がよく目撃されます。",
    depth_m: 4800,
    left: "15%",
    size: 128,
    type: "creature",
    anim_class: "",
    border_class: "border-pink-300/30",
    bg_class: "bg-black",
    image: "images/deepsea_sea_pig_1780408283124.png"
  },
  {
    id: "scaly_foot_snail",
    title: "スケーリーフット (ウロコフネタマガイ)",
    englishName: "Scaly-foot Snail",
    depthRange: "2400m - 2800m",
    sizeRange: "3-4cm",
    description: "インド洋の熱水噴出孔にすむ、足にウロコを持つ巻貝。黒い個体ではウロコに硫化鉄が含まれ、金属のよろいのように見えます。",
    fact: "黒い個体のウロコには硫化鉄が含まれます。一方、鉄を含まない白い個体もいて、すむ熱水域によって姿が違います。",
    depth_m: 5100,
    right: "20%",
    size: 112,
    type: "creature",
    anim_class: "",
    border_class: "border-gray-400/50",
    bg_class: "bg-slate-900",
    image: "images/deepsea_scaly_foot_snail_1780408451466.png"
  },
  {
    id: "dumbo",
    title: "メンダコの仲間（ダンボオクトパス）",
    englishName: "Dumbo Octopus",
    depthRange: "2000m - 5000m",
    sizeRange: "20cm",
    description: "耳のようなヒレをパタパタさせて泳ぐ姿が、空飛ぶゾウの「ダンボ」に似ているかわいいタコ。スミを吐くことはできません。",
    fact: "とても柔らかい体をしていて、平べったくなって海底で休んでいることが多いです。深海のアイドルとして人気があります。",
    depth_m: 5400,
    left: "30%",
    size: 160,
    type: "creature",
    anim_class: "animate-float",
    border_class: "border-pink-500/20",
    bg_class: "bg-black",
    image: "images/deepsea_dumbo_1780390390863.png"
  },
  {
    id: "tripod",
    title: "ナガヅエエソ",
    englishName: "Tripod Fish",
    depthRange: "900m - 4700m",
    sizeRange: "30cm",
    description: "異様に長く伸びた3本のヒレ（腹ビレと尾ビレ）を使って、海底に三脚のように立ちます。これは流れに乗ってくるエサを効率よく待ち構えるためです。",
    fact: "ほとんど目が見えませんが、胸ビレをアンテナのように広げて、水のわずかな振動で獲物を感知します。じっと動かずに何日も待ち続けることができます。",
    depth_m: 5700,
    right: "15%",
    size: 192,
    type: "creature",
    anim_class: "",
    border_class: "border-white/10",
    bg_class: "bg-black",
    image: "images/deepsea_tripod_1780390465721.png"
  },
  {
    id: "plastic_waste",
    title: "深海のプラスチックゴミ",
    englishName: "Deep Sea Plastic Waste",
    depthRange: "6000m",
    sizeRange: "30cm",
    description: "陸から海へ流れ出たプラスチックごみは、深い海溝の底でも見つかっています。深海では光がほとんど届かず低温なため、プラスチックは分解されにくく、長期間残ることがあります。",
    fact: "世界で最も深いマリアナ海溝の底（水深約10,900m）からも、使い捨てレジ袋が発見されています。これは海洋環境問題の深刻さを示す象徴となっています。",
    depth_m: 6200,
    left: "15%",
    size: 112,
    type: "landmark",
    anim_class: "animate-float",
    border_class: "border-red-500/20",
    bg_class: "bg-black",
    image: "images/deepsea_plastic_1780396101817.png",
    is_artifact: true
  },
  {
    id: "shinkai6500",
    title: "有人潜水調査船「しんかい6500」",
    englishName: "Research Submersible Shinkai 6500",
    depthRange: "6500m",
    sizeRange: "9.7m",
    description: "水深6,500mまで潜ることができる日本の有人潜水調査船。凄まじい水圧に耐えるため、コクピットは軽くて頑丈なチタン合金の球体（内径2メートル）で作られています。",
    fact: "これまでに世界中の海で1500回以上の潜航調査を行い、数多くの新種の深海生物や、地球のプレート境界などの貴重な地質構造を発見してきました。",
    depth_m: 6500,
    right: "10%",
    size: 88,
    type: "landmark",
    anim_class: "animate-float-delayed",
    border_class: "border-blue-400/40",
    bg_class: "bg-black",
    image: "images/deepsea_submarine_1780396149628.png",
    is_artifact: true
  },
  {
    id: "snailfish",
    title: "マリアナ・スネイルフィッシュ",
    englishName: "Mariana Snailfish",
    depthRange: "6000m - 8000m",
    sizeRange: "28cm",
    description: "世界で最も深い場所に住む魚の一つ。オタマジャクシのようなピンク色の体をしています。超高圧に耐えるため、骨の一部が軟骨でできています。",
    fact: "ウロコがなく、体はプルプルしています。水深8000mの水圧は、指先の上に象が乗るのと同じくらいの力ですが、彼らは平気で泳ぎます。",
    depth_m: 7500,
    left: "30%",
    size: 128,
    type: "creature",
    anim_class: "",
    border_class: "border-pink-200/20",
    bg_class: "bg-black",
    image: "images/deepsea_snailfish_1780389368914.png"
  },
  {
    id: "battle",
    title: "マッコウクジラ vs ダイオウイカ",
    englishName: "Sperm Whale vs Giant Squid",
    depthRange: "2800m",
    sizeRange: "---",
    description: "深海の王者が激突するバトルシーン。",
    fact: "---",
    depth_m: 2800,
    type: "battle",
    image: "",
    participants: [
      {
        id: "whale",
        title: "マッコウクジラ",
        englishName: "Sperm Whale",
        depthRange: "0m - 3000m",
        sizeRange: "18m",
        description: "深海まで潜ってイカなどを捕らえる大型のハクジラです。四角くて巨大な頭には、クリック音を使ったエコーロケーションに関わる鯨蝋（げいろう）器官があります。",
        fact: "頭部の鯨蝋器官は、クリック音を作って前方へ送り、反射した音から獲物や周囲を探るエコーロケーションで重要な役割を持ちます。",
        image: "images/deepsea_whale_clean_1780390652210.png",
        type: "creature"
      },
      {
        id: "squid",
        title: "ダイオウイカ",
        englishName: "Giant Squid",
        depthRange: "600m - 1500m",
        sizeRange: "最大13m",
        description: "バスケットボールほどの巨大な目を持ち、深海のわずかな光でも獲物を見逃しません。10本の腕のうち2本は特に長く、獲物を捕まえるのに特化しています。",
        fact: "腕の吸盤の縁にはギザギザした硬いリングがあり、獲物をしっかりつかむのに役立ちます。マッコウクジラの体に吸盤の跡が残ることもあります。",
        image: "images/deepsea_squid_1780389387608.png",
        type: "creature"
      }
    ]
  },
  {
    id: "vent",
    title: "熱水噴出孔",
    englishName: "Hydrothermal Vent",
    depthRange: "10,000m (Challenger Deep)",
    sizeRange: "---",
    description: "海底の割れ目から300度以上の熱水が吹き出す「深海の温泉」。黒い煙のように見えるのは、溶け込んだ鉱物が冷えて固まったものです。",
    fact: "太陽の光が届かない場所ですが、熱水の成分を栄養にするバクテリアがいて、それを食べるエビやカニが集まり、独自の生態系を作っています。生命誕生の場所とも言われています。",
    depth_m: 10000,
    type: "vent",
    image: "images/deepsea_vent_1780389410123.png"
  }
];

export const markersData: DepthMarker[] = [
  { depth: 200, label: "▼ トワイライトゾーン (200m) - 光が届かなくなってくる", class: "bg-ocean-twilight text-white marker-glow" },
  { depth: 1000, label: "▼ ミッドナイトゾーン (1000m) - 完全な暗闇", class: "bg-ocean-midnight text-white marker-glow" },
  { depth: 4000, label: "▼ アビス (4000m) - 深海平原", class: "bg-ocean-abyss text-white marker-glow" },
  { depth: 6000, label: "▼ ヘイダルゾーン (6000m) - 超深海海溝", class: "bg-ocean-hadal text-white border border-white/20 marker-glow" }
];
