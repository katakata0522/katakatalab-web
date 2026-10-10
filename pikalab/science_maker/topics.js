/**
 * Topics Database
 * 自由研究テーマのデータ定義
 */
const topics = [
    // --- 1 DAY THEMES ---
    { id: '1d_exp_1', title: '10円玉ピカピカ大作戦', category: 'experiment', time: '1day', difficulty: 1, desc: 'ケチャップ、お酢、ソースなど家にある調味料で、汚れた10円玉がどれが一番きれいになるか対決！', materials: '汚れた10円玉、綿棒、お皿、調味料（ケチャップ、お酢、ソースなど）' },
    { id: '1d_exp_2', title: '氷が溶けるスピード対決', category: 'experiment', time: '1day', difficulty: 1, desc: '水、お茶、塩水、ジュース…凍らせたときに一番早く溶けるのはどれだ？タイムを計ろう。', materials: 'カップ、水、塩水、ジュース、ストップウォッチ' },
    { id: '1d_exp_3', title: '牛乳からチーズを作ろう', category: 'experiment', time: '1day', difficulty: 2, desc: '牛乳にお酢を入れて温めると…あら不思議！カッテージチーズができるよ。', materials: '牛乳500ml、お酢（大さじ2）、鍋、ザル、キッチンペーパー', safety: ['加熱中のやけどに注意し、コンロの操作は保護者の方と一緒に行ってください。', '作ったものは実験用として扱い、長時間の常温放置は避けてください。'] },
    { id: '1d_exp_4', title: '卵が浮く水を作ろう', category: 'experiment', time: '1day', difficulty: 2, desc: '普通の水だと沈む生卵。塩をどれくらい入れたら浮くかな？限界に挑戦！', materials: '生卵、コップ、水、塩、スプーン', safety: ['生卵を触った後は石けんで手を洗い、器具をよく洗浄してください。', '実験に使った卵は食べずに廃棄してください。'] },
    { id: '1d_exp_5', title: '一円玉を水に浮かべる実験', category: 'experiment', time: '1day', difficulty: 1, desc: '表面張力の力で一円玉を水に浮かべよう。洗剤を垂らすとどうなる？', materials: '一円玉、ボウル、水、洗剤、フォーク' },

    { id: '1d_craft_1', adultRequired: true, title: 'オリジナルスライム作り', category: 'craft', time: '1day', difficulty: 1, desc: 'ホウ砂と洗濯のりで作る科学実験の定番。色を変えたり硬さを変えたりしよう。', materials: '洗濯のり（PVA）、ホウ砂、水、絵の具、コップ', safety: ['ホウ砂の計量や混ぜる作業は、必ず保護者の方と一緒に行ってください。', 'ホウ砂の粉や液が目・口に入らないようにし、肌が弱い場合は手袋を使ってください。', '完成したスライムは口に入れず、遊んだ後は手を洗ってください。'] },
    { id: '1d_craft_2', adultRequired: true, title: 'ペットボトル空気砲', category: 'craft', time: '1day', difficulty: 1, desc: '空気の力で的を倒せ！ペットボトルと風船で強力な空気砲を作る。', materials: 'ペットボトル（500ml）、風船、ビニールテープ、ハサミ、的（紙コップなど）', safety: ['ペットボトルをハサミで切る作業は、必ず保護者の方と一緒に行ってください。'] },
    { id: '1d_craft_3', title: 'キラキラ万華鏡', category: 'craft', time: '1day', difficulty: 2, desc: '鏡の反射を利用して、世界に一つだけの美しい模様が見える万華鏡を作ろう。', materials: '黒い画用紙、プラ板、ビーズ、筒（トイレットペーパーの芯など）、アルミホイル' },
    { id: '1d_craft_4', adultRequired: true, title: 'ストロー笛で音階作り', category: 'craft', time: '1day', difficulty: 1, desc: 'ストローの長さを変えると音が変わる？ドレミファソラシドを作って演奏しよう。', materials: 'ストロー、ハサミ、定規、セロハンテープ', safety: ['ストローをハサミで切る作業は、必ず保護者の方と一緒に行ってください。'] },

    { id: '1d_obs_1', title: '浮く野菜・沈む野菜の秘密', category: 'observe', time: '1day', difficulty: 1, desc: 'トマト、きゅうり、じゃがいも…水に入れたら浮く？沈む？予想して実験だ。', materials: 'いろいろな野菜、大きなボウル、水' },
    { id: '1d_obs_2', title: '雲を作る実験', category: 'observe', time: '1day', difficulty: 2, desc: 'ペットボトルの中に雲が発生！？気圧の変化を利用して空の不思議を再現。', materials: '炭酸用ペットボトル、水、線香、ライター（大人の人と）', safety: ['火を使う工程は必ず保護者の方が担当し、周囲に燃えやすい物を置かないでください。', '煙を吸い込みすぎないよう換気をして、少量で実施してください。'] },
    { id: '1d_obs_3', title: 'マーブルチョコで色実験', category: 'observe', time: '1day', difficulty: 1, desc: 'お皿に並べたマーブルチョコに水を注ぐと…色が溶け出してきれいな模様ができるよ。', materials: 'マーブルチョコ、白いお皿、水' },

    { id: '1d_inv_1', title: '名探偵！指紋採取', category: 'investigate', time: '1day', difficulty: 2, desc: 'コップについた指紋を粉で浮かび上がらせる。家族の指紋の違いを調べよう。', materials: 'コップ、アイシャドウ（粉）や小麦粉、筆、セロハンテープ、黒い画用紙' },
    { id: '1d_inv_2', title: '家の中のマーク探し', category: 'investigate', time: '1day', difficulty: 1, desc: 'プラスチックのリサイクルマークや、洗剤の注意書きマーク。家にはどんなマークがある？', materials: '家にある製品、ノート、カメラ' },
    { id: '1d_inv_3', title: 'バーコードの秘密調査', category: 'investigate', time: '1day', difficulty: 2, desc: 'お菓子や本についているバーコード。数字にはどんな意味があるのか解読しよう。', materials: 'いろいろな商品のバーコード、ノート、インターネット（調べる用）' },

    // --- 3 DAYS THEMES ---
    { id: '3d_exp_1', adultRequired: true, title: '塩の結晶作り', category: 'experiment', time: '3days', difficulty: 3, desc: '濃い塩水を作って置いておくと、四角い宝石のような結晶ができるよ。少しずつ大きくなるぞ。', materials: '塩、お湯、コップ、割り箸、タコ糸', safety: ['お湯の準備や容器への注ぎ入れは、やけどを防ぐため必ず保護者の方と一緒に行ってください。'] },
    { id: '3d_exp_2', title: 'スーパーボールエッグ', category: 'experiment', time: '3days', difficulty: 2, desc: '生卵をお酢につけて数日待つと…殻が溶けてゴムボールみたいに跳ねる卵に変身！', materials: '生卵、お酢、コップ', safety: ['生卵や酢の液に触れた手・器具は、作業後すぐに洗浄してください。', '完成した卵は食べずに廃棄し、こぼれた液はすぐ拭き取ってください。'] },

    { id: '3d_craft_1', adultRequired: true, title: '牛乳パック潜望鏡', category: 'craft', time: '3days', difficulty: 2, desc: '鏡の反射を使って、壁の向こう側が見える装置を作ろう。スパイ気分で観察だ。', materials: '牛乳パック2個、手鏡2枚、ハサミ、テープ', safety: ['牛乳パックをハサミで切る作業は、必ず保護者の方と一緒に行ってください。'] },
    { id: '3d_craft_2', title: 'ソーラークッカー実験', category: 'craft', time: '3days', difficulty: 3, desc: '太陽の光を集めてお湯を沸かしたり、チョコを溶かしたりできるか挑戦！天気が大事。', materials: '段ボール、アルミホイル、黒い画用紙、ラップ', safety: ['反射光を直接目で見ないようにし、角度調整は保護者の方と行ってください。', '加熱した容器は熱くなるため、耐熱手袋や布を使って扱ってください。'] },

    { id: '3d_obs_1', title: 'お花の色水吸い上げ実験', category: 'observe', time: '3days', difficulty: 2, desc: '白いカーネーションを色のついた水に挿すと、花びらの色はどう変わる？毎日観察しよう。', materials: '白い花（カーネーションなど）、コップ、食紅（色水）' },
    { id: '3d_obs_2', title: '天気予報当たり外れ調査', category: 'observe', time: '3days', difficulty: 1, desc: 'テレビの天気予報と、実際の天気を3日間比べてみよう。予報はどれくらい当たる？', materials: 'ノート、テレビやネットの天気予報' },

    { id: '3d_inv_1', title: '道路標識コレクション', category: 'investigate', time: '3days', difficulty: 2, desc: '近所の標識を探して地図にまとめよう。「なぜここにこの標識があるの？」を考える。', materials: 'カメラ、ノート、近所の地図' },
    { id: '3d_inv_2', title: '月の形の変化調べ', category: 'investigate', time: '3days', difficulty: 1, desc: '3日間、同じ時間に月を見て形を描こう。月はどの方角に出て、どう動くかな？', materials: 'ノート、筆記用具' },

    // --- 1 WEEK THEMES ---
    { id: '1w_exp_1', title: 'サビの研究', category: 'experiment', time: '1week', difficulty: 3, desc: '鉄の釘を「水」「塩水」「油」「空気中」に入れて1週間放置。どれが一番サビる？', materials: '鉄の釘（4本）、コップ4つ、水、塩、油、ラップ' },
    { id: '1w_exp_2', title: 'バナナの変色実験', category: 'experiment', time: '1week', difficulty: 2, desc: 'バナナの皮に文字を書くとどうなる？冷蔵庫と常温で持ちはどう違う？時間の変化を記録。', materials: 'バナナ、つまようじ、保冷剤など' },

    { id: '1w_craft_1', adultRequired: true, title: '再生紙（はがき）作り', category: 'craft', time: '1week', difficulty: 3, desc: '牛乳パックをドロドロに溶かして、新しい紙を作ろう。乾かすのに時間がかかる本格工作。', materials: '牛乳パック、ミキサー（または細かくちぎる）、木枠と網（100均にある）、アイロン', safety: ['ミキサーやアイロンの操作は、必ず保護者の方と一緒に行ってください。'] },
    { id: '1w_craft_2', title: 'オリジナル地図作り', category: 'craft', time: '1week', difficulty: 2, desc: '自分の住んでいる街を歩いて、おすすめスポットや危険な場所をまとめた大地図を作ろう。', materials: '模造紙、色鉛筆、カメラ、歩きやすい靴' },

    { id: '1w_obs_1', title: 'パンのカビ防衛実験', category: 'observe', time: '1week', difficulty: 2, desc: '「手で触ったパン」「触ってないパン」など条件を変えてカビの生え方を観察。条件による違いを調べよう！', materials: '食パン、透明な袋、油性ペン', safety: ['観察は袋を開けずに行い、カビが見えたらにおいをかがないでください。', '実験後は袋を密封したまま廃棄し、手と机をしっかり洗浄してください。'] },
    { id: '1w_obs_2', title: '豆苗の再生栽培', category: 'observe', time: '1week', difficulty: 1, desc: '食べた後の豆苗の根っこを水につけておくと、どこまで伸びる？毎日の成長を定規で測ろう。', materials: '豆苗、容器、水、定規' },
    { id: '1w_obs_3', title: '水の蒸発調べ', category: 'observe', time: '1week', difficulty: 2, desc: '同じ量の水を入れたコップを「日向」「日陰」「風の当たる場所」に置く。どこが早く減る？', materials: '同じコップ数個、水、油性ペン' },

    { id: '1w_inv_1', title: '我が家のゴミ分別調査', category: 'investigate', time: '1week', difficulty: 2, desc: '1週間で家から出るゴミの量を記録。プラごみはどれくらい？減らすアイデアも考えよう。', materials: 'ゴミ袋、はかり、ノート' },
    { id: '1w_inv_2', title: '温度と電気代の関係', category: 'investigate', time: '1week', difficulty: 3, desc: '外の気温と、家のエアコンの設定温度や電気メーターの数字を記録して関係を調べる。', materials: '温度計、電気メーター（親に見てもらう）、ノート', safety: ['電気メーターの確認は保護者の方と行い、設備には触れないでください。'] },
    { id: '1w_inv_3', title: '虫の集まる場所調査', category: 'investigate', time: '1week', difficulty: 2, desc: '近所の公園のどこに虫がいるか、1週間通って地図にする。木の種類や時間帯も記録だ。', materials: '虫眼鏡、ノート、図鑑', safety: ['草むらでは長袖・長ズボンを着用し、虫よけ対策をして観察してください。', 'むやみに捕まえたり触れたりせず、刺されたりかぶれた場合はすぐ大人に知らせてください。'] }
];
