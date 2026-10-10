export const PLANETS = [
    {
        id: 'sun',
        name: '太陽 (Sun)',
        type: '恒星 (こうせい)',
        sizeComparison: '地球の約109倍',
        distanceFromSun: '地球まで 約1億5000万 km',
        temperature: '約5,500度（光球）',
        description: '太陽系の中心にある恒星。主に水素とヘリウムからできた高温のプラズマで、自ら光と熱を放っている太陽系の大黒柱だよ。',
        trivia: '太陽の光が地球に届くまで、約8分20秒。今見ている太陽は、ほんの少し前の姿なんだ！',
        factsSourceUrl: 'https://science.nasa.gov/sun/facts/',
        reviewedAt: '2026-10-04',
        image: 'assets/sun.png',
        realPhotoUrl: 'https://www.nasa.gov/image-article/sunny-day/',
        imageCredit: 'NASA / SDO',
        quizzes: [
            { question: '太陽の「表面」として見えている光球は、だいたい何度くらいでしょう？', options: ['約100度', '約6,000度', '約10万度'], correctIndex: 1, explanation: '光球は約5,500度。選択肢なら約6,000度がいちばん近いよ。中心部は約1,500万度にもなるんだ。' },
            { question: '太陽は主に何というガスでできている？', options: ['水素とヘリウム', '酸素と二酸化炭素', '窒素とメタン'], correctIndex: 0, explanation: '太陽の約73%が水素、約25%がヘリウムでできているんだ。' },
            { question: '太陽の黒いシミのような部分「黒点」の特徴はどれ？', options: ['周りより温度が高い', '周りより温度が低い', '穴が空いている'], correctIndex: 1, explanation: '黒点は周りより温度が低いため、暗く（黒く）見えているんだよ。' }
        ]
    },
    {
        id: 'mercury',
        name: '水星 (Mercury)',
        type: '岩石惑星',
        sizeComparison: '地球の約0.38倍 (とても小さい)',
        distanceFromSun: '太陽から 約5800万 km',
        temperature: '約-180〜430度（地表）',
        description: '太陽にいちばん近い岩石惑星。地球のような厚い大気はなく、とても薄い「外気圏」があるだけなので、昼と夜で地表の温度がものすごく大きく変わる世界だよ。',
        trivia: '厚い大気や風雨がほとんどないので、天体の衝突でできたクレーターが長いあいだ残りやすいんだ。',
        factsSourceUrl: 'https://science.nasa.gov/mercury/facts/',
        reviewedAt: '2026-10-04',
        image: 'assets/mercury.png',
        realPhotoUrl: 'https://science.nasa.gov/photojournal/mercury-globe-0n-0e/',
        imageCredit: 'NASA / Johns Hopkins University Applied Physics Laboratory / Carnegie Institution of Washington',
        quizzes: [
            { question: '水星の昼と夜の温度差がとても大きいのはなぜ？', options: ['太陽に近いだけだから', '熱を運ぶ厚い大気がほとんどないから', '海がないから'], correctIndex: 1, explanation: '水星には地球のような厚い大気がほとんどないため、昼側の熱を夜側へ運んだり、夜に熱を保ったりしにくいんだ。' },
            { question: '水星が太陽の周りを1周するのにかかる時間は地球の何日分？', options: ['約88日', '約1年', '約5年'], correctIndex: 0, explanation: '太陽に一番近い軌道を猛スピードで回っているので、たった88日で1年が終わるんだ！' },
            { question: '水星の地表にたくさん見えるデコボコは何？', options: ['クレーター', '海', '巨大な森'], correctIndex: 0, explanation: '隕石や小天体の衝突でできたクレーターがたくさん残っているよ。' }
        ]
    },
    {
        id: 'venus',
        name: '金星 (Venus)',
        type: '岩石惑星',
        sizeComparison: '地球の約0.95倍 (地球とほぼ同じ)',
        distanceFromSun: '太陽から 約1億800万 km',
        temperature: '平均 約464度（地表）',
        description: '地球と大きさはよく似ているけれど、環境は大違い！分厚い二酸化炭素の大気による強烈な温室効果で、太陽にいちばん近い水星よりも地表が高温になるんだ。上空には硫酸の雲も広がっているよ。',
        trivia: '金星の雲は主に硫酸の小さな粒からできている。雲から落ちる硫酸の粒は、非常に熱い下層大気で蒸発して地表までは届かないと考えられているよ。',
        factsSourceUrl: 'https://science.nasa.gov/venus/venus-facts/',
        reviewedAt: '2026-10-04',
        image: 'assets/venus.png',
        realPhotoUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA00271',
        imageCredit: 'NASA / JPL-Caltech',
        quizzes: [
            { question: '金星を覆っている分厚い「大気（空気）」は、主に何というガスでできている？', options: ['酸素', 'メタン', '二酸化炭素'], correctIndex: 2, explanation: '大気のほとんどが二酸化炭素なんだ！その強烈な温室効果（熱を逃がさない働き）のせいで、太陽に一番近い水星よりも熱くなっているんだよ。' },
            { question: '地球から見た金星の別名は何と呼ばれている？', options: ['赤い彗星', '明けの明星・宵の明星', '夜の太陽'], correctIndex: 1, explanation: '明け方や夕暮れ時にとても明るく輝いて見えることから、そう呼ばれているよ。' },
            { question: '金星の自転（コマのような回転）の変わった特徴は？', options: ['多くの惑星と逆方向に回っている', '全く回転していない', '1日で1万回も回っている'], correctIndex: 0, explanation: '金星は、多くの惑星とは逆向き（東から西へ）にとてもゆっくり自転しているよ。逆向きに自転する惑星は金星だけではなく、天王星もその仲間なんだ。' }
        ]
    },
    {
        id: 'earth',
        name: '地球 (Earth)',
        type: '岩石惑星',
        sizeComparison: '1倍 (基準)',
        distanceFromSun: '太陽から 約1億5000万 km',
        temperature: '平均 約15度（地表）',
        description: '私たちが住んでいる星。地表には豊富な液体の水があり、多種多様な生命が暮らしている。今のところ、生命の存在が確認されている唯一の世界なんだ。',
        trivia: '実は地球は完全な球（まん丸）ではなく、赤道のあたりが少しだけ膨らんだ形をしているんだよ。',
        factsSourceUrl: 'https://science.nasa.gov/earth/facts/',
        reviewedAt: '2026-10-04',
        image: 'assets/earth.png',
        realPhotoUrl: 'https://images.nasa.gov/details-PIA18033',
        imageCredit: 'NASA Goddard Space Flight Center',
        quizzes: [
            { question: '地球の表面の約何％が海で覆われているでしょう？', options: ['約30%', '約50%', '約70%'], correctIndex: 2, explanation: '地球は「水の惑星」と呼ばれる通り、表面の約70%が海に覆われているよ。' },
            { question: '地球の空が青く見える大きな理由は？', options: ['海の色が反射しているから', '短い波長の青い光が大気で強く散乱されるから', '宇宙そのものが青いから'], correctIndex: 1, explanation: '太陽光のうち、青のような短い波長の光は大気中で強く散乱されるため、空が青く見えるんだ。' },
            { question: '地球の周りを回っている「月（衛星）」はいくつある？', options: ['1つ', '2つ', 'たくさんある'], correctIndex: 0, explanation: '地球の衛星は「月」1つだけだよ。' }
        ]
    },
    {
        id: 'mars',
        name: '火星 (Mars)',
        type: '岩石惑星',
        sizeComparison: '地球の約0.53倍 (地球の半分くらい)',
        distanceFromSun: '太陽から 約2億2800万 km',
        temperature: '平均 約-65度（地表）',
        description: '探査機やローバーが詳しく調べ続けている岩石惑星。赤っぽく見えるのは、地表の土や岩に酸化鉄（鉄のサビの仲間）が多く含まれているからなんだ。',
        trivia: '太陽系で一番高い山「オリンポス山」があるよ！標高は約2万メートル以上あり、エベレストの約2.5倍の高さがあるんだ。',
        factsSourceUrl: 'https://science.nasa.gov/mars/facts/',
        reviewedAt: '2026-10-04',
        image: 'assets/mars.png',
        realPhotoUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA02653',
        imageCredit: 'NASA / JPL-Caltech / MSSS',
        quizzes: [
            { question: '火星が赤っぽく見えるのは、表面に何がたくさんあるから？', options: ['赤い砂', '鉄のサビ', 'マグマ'], correctIndex: 1, explanation: '火星の表面には酸化鉄（鉄のサビ）がたくさん含まれているため、赤っぽく見えるんだ。' },
            { question: '火星にある太陽系一高い山の名前は？', options: ['オリンポス山', 'エベレスト', '富士山'], correctIndex: 0, explanation: '標高が約2万メートル以上（エベレストの約2.5倍）もある巨大な火山「オリンポス山」だよ。' },
            { question: '火星の重力は、地球と比べてどう？', options: ['地球と同じ', '地球の約3分の1', '地球の2倍'], correctIndex: 1, explanation: '火星は地球より小さく軽いので、重力は約3分の1（体重が3分の1になる感覚）なんだ。' }
        ]
    },
    {
        id: 'jupiter',
        name: '木星 (Jupiter)',
        type: '巨大ガス惑星',
        sizeComparison: '地球の約11.2倍',
        distanceFromSun: '太陽から 約7億7800万 km',
        temperature: '約-110度（1気圧層）',
        description: '太陽系でいちばん大きい惑星！主に水素とヘリウムからできていて、見えているしま模様は大気中の雲や、東西へ流れる強いジェット気流が作っているんだ。固体の地表はないよ。',
        trivia: '「大赤斑」は巨大な嵐。少なくとも150年以上観測されているけれど大きさは変化していて、昔より小さくなっているんだ。',
        factsSourceUrl: 'https://science.nasa.gov/jupiter/jupiter-facts/',
        reviewedAt: '2026-10-04',
        image: 'assets/jupiter.png',
        realPhotoUrl: 'https://science.nasa.gov/asset/hubble/jupiter-and-the-great-red-spot/',
        imageCredit: 'NASA / ESA / Hubble Heritage Team',
        quizzes: [
            { question: '木星に見える「大赤斑（だいせきはん）」の正体はなに？', options: ['巨大な嵐', '巨大な海', '巨大なクレーター'], correctIndex: 0, explanation: '大赤斑は巨大な嵐。長いあいだ続いているけれど、大きさや形はずっと同じではないんだ。' },
            { question: '木星は主に何でできている？', options: ['硬い岩の地面', '水素とヘリウムを中心とするガスや流体', '氷だけ'], correctIndex: 1, explanation: '木星は主に水素とヘリウムからなる巨大ガス惑星で、宇宙船が着地できるような本当の地表はないよ。' },
            { question: '木星は自転（1日）が太陽系で一番速い。地球時間で約何時間？', options: ['約10時間', '約24時間', '約100時間'], correctIndex: 0, explanation: 'あんなに巨大なのに、たった10時間でコマのように1回転しているんだ！だから遠心力で少し横に潰れた形をしているよ。' }
        ]
    },
    {
        id: 'saturn',
        name: '土星 (Saturn)',
        type: '巨大ガス惑星',
        sizeComparison: '地球の約9.4倍',
        distanceFromSun: '太陽から 約14億2700万 km',
        temperature: '約-140度（1気圧層）',
        description: '巨大な環で有名なガス惑星。主に水素とヘリウムからできていて、木星と同じく固体の地表はないんだ。',
        trivia: '土星の平均密度は水より低い。もちろん土星が入る本物の浴槽は作れないけれど、「もし入れられたら浮く」という有名な思考実験ができるよ！',
        factsSourceUrl: 'https://science.nasa.gov/saturn/facts/',
        reviewedAt: '2026-10-04',
        image: 'assets/saturn.png',
        realPhotoUrl: 'https://science.nasa.gov/photojournal/saturn-four-years-on/',
        imageCredit: 'NASA / JPL-Caltech / Space Science Institute',
        quizzes: [
            { question: '土星の美しい「環（わ）」は、主に何でできている？', options: ['光の帯', '氷や岩のつぶ', 'ガス'], correctIndex: 1, explanation: '環は大きな一つの板ではなく、無数の氷や岩のつぶが土星の周りをものすごいスピードで回ってできているんだ。' },
            { question: '「巨大な水槽に土星を入れられたら浮く」という話は、何を比べた思考実験？', options: ['平均密度', '明るさ', '自転速度'], correctIndex: 0, explanation: '土星の平均密度は水より小さい。その性質をイメージするための思考実験なんだ。' },
            { question: '土星の衛星（月のような星）「タイタン」の特徴は？', options: ['分厚い大気がある', '完全に透明', '太陽のように燃えている'], correctIndex: 0, explanation: 'タイタンは衛星なのに分厚い大気を持ち、表面には液体のメタンの湖がある不思議な星なんだ。' }
        ]
    },
    {
        id: 'uranus',
        name: '天王星 (Uranus)',
        type: '巨大氷惑星',
        sizeComparison: '地球の約4倍',
        distanceFromSun: '太陽から 約28億7000万 km',
        temperature: '約-195度（1気圧層）',
        description: '青緑色に見える巨大氷惑星。自転軸が約98度も傾き、ほとんど横倒しのような姿勢で太陽の周りを回っている。固体の地表はなく、内部には高温・高圧の水・アンモニア・メタンなどを多く含む流体があると考えられているよ。',
        trivia: 'どうしてここまで横倒しになったのかは、まだ決着していない謎。大きな天体との衝突など、いくつかの仮説が考えられているんだ。',
        factsSourceUrl: 'https://science.nasa.gov/uranus/facts/',
        reviewedAt: '2026-10-04',
        image: 'assets/uranus.png',
        realPhotoUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA18182',
        imageCredit: 'NASA / JPL-Caltech',
        quizzes: [
            { question: '天王星の自転（コマのような回転）の変わった特徴はどれ？', options: ['地球と同じ向きに回っている', '軸が横に倒れている', '回転していない'], correctIndex: 1, explanation: '天王星は自転の軸が約98度も傾いていて、横倒しになってゴロゴロ転がるように公転しているんだ。' },
            { question: '天王星が美しく青緑色に見えるのは、大気に何が含まれているから？', options: ['水', 'メタン', 'オゾン'], correctIndex: 1, explanation: '大気に含まれるメタンが赤い光を吸収することが、青緑色の見え方に関係しているよ。' },
            { question: '天王星が「巨大氷惑星」と呼ばれるときの「氷」は、地球の氷とまったく同じ状態？', options: ['はい、全体がカチカチの氷', 'いいえ、内部では高温・高圧の流体として存在すると考えられる', '中身は空っぽ'], correctIndex: 1, explanation: '惑星科学でいう「氷」は水・アンモニア・メタンなどの物質を指す分類。天王星内部では高温・高圧の濃い流体として存在すると考えられているよ。' }
        ]
    },
    {
        id: 'neptune',
        name: '海王星 (Neptune)',
        type: '巨大氷惑星',
        sizeComparison: '地球の約3.9倍',
        distanceFromSun: '太陽から 約45億 km',
        temperature: '約-200度（1気圧層）',
        description: '太陽系でいちばん外側を回る巨大氷惑星。固体の地表はなく、大気中のメタンが青緑色の見え方に関係する。時速2,000kmを超える猛烈な風が観測される、とても動きの激しい世界だよ。',
        trivia: '昔のVoyager 2の画像は雲などを見やすくするため色が強調され、海王星がかなり濃い青に広まった。2024年の再解析では、天王星と海王星の本来の色は以前思われていたよりずっと似ていると示されたんだ。',
        factsSourceUrl: 'https://science.nasa.gov/neptune/neptune-facts/',
        reviewedAt: '2026-10-04',
        image: 'assets/neptune.png',
        realPhotoUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA01142',
        imageCredit: 'NASA / JPL-Caltech',
        quizzes: [
            { question: '海王星が太陽の周りを1周するのに、地球の時間で約何年かかる？', options: ['約10年', '約50年', '約165年'], correctIndex: 2, explanation: '太陽からとても離れているため、ゆっくりと巨大な軌道を描いて回っているよ。' },
            { question: '海王星で観測される風は最大でどれくらい？', options: ['時速100kmほど', '時速500kmほど', '時速2,000kmを超える'], correctIndex: 2, explanation: '海王星では時速2,000kmを超える風が観測されているよ。太陽系の惑星でも最速級だ。' },
            { question: '海王星が青緑色に見えることに関係する大気の成分は？', options: ['メタン', '海水', '酸素だけ'], correctIndex: 0, explanation: 'メタンが赤い光を吸収することが青緑色の見え方に関係しているよ。昔の画像の「濃い青」は色を強調した処理の影響も大きかったんだ。' }
        ]
    }
];


export const SECRET_COLUMNS = [
    {
        id: 'blackhole',
        title: 'ひみつファイル①：ブラックホールってどんなところ？',
        icon: 'dark_mode',
        color: 'purple',
        reviewedAt: '2026-10-04',
        sourceUrls: [
            'https://science.nasa.gov/universe/black-holes/'
        ],
        content: `
            <p class="mb-4">よくぞすべての星をめぐってきたな！ワシは宇宙研究所のはかせじゃ。</p>
            <p class="mb-4">見事「宇宙バッジ」を手に入れたきみに、今日はとっておきの宇宙のひみつを教えよう。</p>
            
            <!-- ブラックホールの幾何学的な概念図SVG -->
            <div class="my-4 flex justify-center bg-slate-950/40 p-4 rounded-2xl border border-indigo-500/10 shadow-inner">
                <svg viewBox="0 0 100 100" class="w-32 h-32 text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]" fill="none" stroke="currentColor" stroke-width="0.8">
                    <circle cx="50" cy="50" r="8" fill="#000" stroke="#818cf8" stroke-width="2.5"/>
                    <circle cx="50" cy="50" r="16" stroke="rgba(99,102,241,0.4)" stroke-dasharray="2 2" />
                    <path d="M50,5 Q50,42 50,42 L50,58 M5,50 Q42,50 42,50 L58,50" opacity="0.2"/>
                    <path d="M12,45 C25,30 45,35 50,42" stroke-width="1.2" />
                    <path d="M88,55 C75,70 55,65 50,58" stroke-width="1.2" />
                    <path d="M22,35 C35,22 55,27 50,42" opacity="0.7" />
                    <path d="M78,65 C65,78 45,73 50,58" opacity="0.7" />
                    <path d="M50,42 L50,5 M50,58 L50,95" stroke="#a78bfa" stroke-width="1" stroke-dasharray="3 3" />
                </svg>
            </div>

            <div class="my-6 p-5 bg-indigo-900/50 rounded-2xl border border-indigo-500/30 shadow-inner">
                <h4 class="text-indigo-300 font-black mb-3 flex items-center gap-2"><span class="material-symbols-rounded">stars</span>境界を越えると光も戻れない</h4>
                <p class="leading-relaxed">ブラックホールは、重力がとても強い天体じゃ。ある境界「事象の地平面」を内側へ越えると、宇宙でいちばん速い光でさえ外へ戻れなくなるんじゃよ。</p>
            </div>
            <p class="mb-4 leading-relaxed">恒星ほどの質量を持つブラックホールの多くは、とても重い星が一生を終え、中心部が自分の重力でつぶれる過程で生まれると考えられておる。一方、銀河の中心にある超大質量ブラックホールがどう成長したのかなど、まだ大きな謎も残っているんじゃ。</p>
            <p class="mb-4 leading-relaxed">ブラックホールは、遠くのものを何でも吸い込む「宇宙の掃除機」ではない。十分遠くから見れば、同じ質量を持つほかの天体と同じように重力を及ぼすんじゃ。いちばん近くで知られているブラックホールも地球から約1,500光年離れているよ。</p>
            <p class="leading-relaxed font-bold text-indigo-200">分かってきたことが増えても、ブラックホールにはまだ多くの研究テーマが残っておる。観測と理論の両方で、今も研究が進んでいるんじゃよ！</p>
        `
    },
    {
        id: 'alien',
        title: 'ひみつファイル②：宇宙人は本当にいるの？',
        icon: 'emoji_people',
        color: 'green',
        reviewedAt: '2026-10-04',
        sourceUrls: [
            'https://science.nasa.gov/exoplanets/search-for-life/'
        ],
        content: `
            <p class="mb-4">やあ！はかせじゃ。</p>
            <p class="mb-4">夜空を見上げながら、「あの星のどこかに、私たちみたいな生き物がいるのかな？」と考えたことはないかな？</p>
            
            <!-- 電波望遠鏡と星間メッセージのイメージSVG -->
            <div class="my-4 flex justify-center bg-slate-950/40 p-4 rounded-2xl border border-teal-500/10 shadow-inner">
                <svg viewBox="0 0 100 100" class="w-32 h-32 text-teal-400 drop-shadow-[0_0_12px_rgba(45,212,191,0.6)]" fill="none" stroke="currentColor" stroke-width="0.8">
                    <circle cx="50" cy="50" r="32" stroke="#2dd4bf" stroke-dasharray="4 4" opacity="0.3"/>
                    <circle cx="50" cy="50" r="18" stroke="#14b8a6" stroke-dasharray="1 3" opacity="0.5"/>
                    <circle cx="50" cy="50" r="4" fill="#2dd4bf" />
                    <path d="M25,75 C25,60 45,60 50,50" stroke-width="1.2" />
                    <path d="M15,85 L35,65 M20,68 L30,78" />
                    <path d="M38,55 A15,15 0 0,1 48,40" stroke="#2dd4bf" stroke-width="1.5" />
                    <path d="M34,51 A20,20 0 0,1 47,31" stroke="#2dd4bf" stroke-width="1" opacity="0.7" />
                    <path d="M30,47 A25,25 0 0,1 46,22" stroke="#2dd4bf" stroke-width="0.8" opacity="0.4" />
                </svg>
            </div>

            <div class="my-6 p-5 bg-teal-900/50 rounded-2xl border border-teal-500/30 shadow-inner">
                <h4 class="text-teal-300 font-black mb-3 flex items-center gap-2"><span class="material-symbols-rounded">public</span>たくさんの惑星、でも答えはまだ未知</h4>
                <p class="leading-relaxed">今のところ、地球以外の生命の証拠はまだ見つかっていない。確実に生命がいると分かっている世界は、今も地球だけなんじゃ。</p>
            </div>
            <p class="mb-4 leading-relaxed">一方で、太陽系の外にはすでに数千個の惑星が確認され、天の川銀河にはさらに膨大な数の惑星があると考えられている。地球くらいの大きさで、液体の水が存在できる距離を回る惑星も見つかっておるよ。</p>
            <p class="mb-4 leading-relaxed">ただし、「住みやすそうな場所がある」ことと「そこに生命がいる」ことは別の話じゃ。生命が宇宙で生まれやすいのか、とても珍しいのか、答えはまだ分からないんじゃよ。</p>
            <p class="leading-relaxed font-bold text-teal-200">分からないからこそ、望遠鏡で大気を調べたり、生命の手がかりを探したりする研究が続いている。いつか新しい証拠が見つかるかもしれないね！</p>
        `
    },
    {
        id: 'outside',
        title: 'ひみつファイル③：太陽系の外はどうなってるの？',
        icon: 'rocket_launch',
        color: 'blue',
        reviewedAt: '2026-10-04',
        sourceUrls: [
            'https://science.nasa.gov/missions/voyager-program/10-things-going-interstellar/',
            'https://science.nasa.gov/solar-system/oort-cloud/facts/',
            'https://science.nasa.gov/exoplanets/search-for-life/'
        ],
        content: `
            <p class="mb-4">よく来たね！はかせじゃ。</p>
            <p class="mb-4">きみは今回、太陽系の星々をたくさん旅してきたね。<br>では、海王星よりもずーっと遠くには何があるか知っておるかな？</p>
            
            <!-- ボイジャー探査機と太陽系脱出の軌道図SVG -->
            <div class="my-4 flex justify-center bg-slate-950/40 p-4 rounded-2xl border border-blue-500/10 shadow-inner">
                <svg viewBox="0 0 100 100" class="w-32 h-32 text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]" fill="none" stroke="currentColor" stroke-width="0.8">
                    <circle cx="50" cy="50" r="14" stroke="#60a5fa" stroke-width="1.5" fill="rgba(30, 41, 59, 0.6)" />
                    <path d="M34,40 C34,25 66,25 66,40" stroke="#93c5fd" stroke-width="1.5" />
                    <path d="M50,30 L50,16 M44,16 L56,16" />
                    <path d="M36,50 L12,50 M36,55 L16,55" />
                    <rect x="8" y="47" width="8" height="10" stroke="#60a5fa" fill="rgba(96, 165, 250, 0.2)" />
                    <path d="M64,50 L88,62" />
                    <path d="M50,50 L50,90" stroke="rgba(96, 165, 250, 0.4)" stroke-dasharray="2 2" />
                </svg>
            </div>

            <div class="my-6 p-5 bg-blue-900/50 rounded-2xl border border-blue-500/30 shadow-inner">
                <h4 class="text-blue-300 font-black mb-3 flex items-center gap-2"><span class="material-symbols-rounded">travel_explore</span>星間空間へ到達した「ボイジャー」</h4>
                <p class="leading-relaxed">1977年に打ち上げられたボイジャー1号と2号は、太陽風が作る泡「太陽圏」の境界を越え、星と星の間の「星間空間」へ入ったんじゃ。ただし、まだ太陽系を完全に出たわけではない。</p>
            </div>
            <p class="mb-4 leading-relaxed">太陽の重力に結びついた小天体が広がると考えられる「オールトの雲」まで含める科学的な定義では、太陽系の境界はもっとずっと遠い。ボイジャー1号がオールトの雲の内側へ届くまででも、およそ300年かかると考えられておる。</p>
            <p class="mb-4 leading-relaxed">さらに遠くには別の恒星があり、その周りを回る太陽系外惑星が数千個も確認されている。スーパーアース、巨大ガス惑星、灼熱の岩石惑星など、その姿はとても多様じゃ。</p>
            <p class="leading-relaxed font-bold text-blue-200">「星間空間」と「太陽系の完全な外側」は同じ意味ではない。宇宙の境界を考えるときは、どの範囲を指しているのかを確かめることが大切なんじゃよ！</p>
        `
    },
    {
        id: 'time',
        title: 'ひみつファイル④：宇宙では時間の進み方が遅くなるって本当？',
        icon: 'schedule',
        color: 'cyan',
        reviewedAt: '2026-10-04',
        sourceUrls: [
            'https://science.nasa.gov/solar-system/10-things-einstein-got-right/'
        ],
        content: `
            <p class="mb-4">やあ！はかせじゃよ。</p>
            <p class="mb-4">きみは、猛スピードで宇宙を飛ぶ宇宙船に乗ったら、自分の「時間」がどう見えるか考えたことはあるかのぅ？</p>
            
            <!-- 時間の遅れ（アインシュタインの時計と光ベクトル）SVG -->
            <div class="my-4 flex justify-center bg-slate-950/40 p-4 rounded-2xl border border-cyan-500/10 shadow-inner">
                <svg viewBox="0 0 100 100" class="w-32 h-32 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]" fill="none" stroke="currentColor" stroke-width="0.8">
                    <circle cx="50" cy="50" r="28" stroke="#22d3ee" stroke-width="1.5" />
                    <path d="M50,22 L50,26 M50,78 L50,74 M22,50 L26,50 M78,50 L74,50" />
                    <path d="M50,50 L50,32" stroke-width="1.2" />
                    <path d="M50,50 Q62,56 68,42" stroke-width="1.2" stroke-dasharray="2 1" />
                    <path d="M10,50 Q50,75 90,50" stroke="rgba(34,211,238,0.3)" />
                    <path d="M10,55 Q50,80 90,55" stroke="rgba(34,211,238,0.15)" />
                </svg>
            </div>

            <div class="my-6 p-5 bg-cyan-900/50 rounded-2xl border border-cyan-500/30 shadow-inner">
                <h4 class="text-cyan-300 font-black mb-3 flex items-center gap-2"><span class="material-symbols-rounded">schedule</span>動き方と重力で時計の進み方は変わる</h4>
                <p class="leading-relaxed">相対性理論では、観測する人に対してとても速く動く時計はゆっくり進み、重力が強い場所の時計も、重力が弱い場所の時計と比べるとゆっくり進むんじゃ。</p>
            </div>
            <p class="mb-4 leading-relaxed">これは空想だけの話ではない。GPS衛星の時計は、衛星の速い動きで少し遅れ、地上より重力が弱いことでそれ以上に速く進む。両方の効果を計算して補正しないと、位置情報はすぐにずれてしまうんじゃよ。</p>
            <p class="mb-4 leading-relaxed">もし光の速さに近い宇宙船で旅をすれば、地球に残った人より少なく年を取って戻ることも理論上は起こる。ただし「宇宙船で3年なら地球で必ず何十年」という決まった数字ではなく、差は速さや旅のしかたで変わるんじゃ。</p>
            <p class="leading-relaxed font-bold text-cyan-200">自分のそばの時計が急に変に動くわけではない。離れた場所や違う動きをする時計を比べたときに差が現れる――そこが相対性理論のおもしろいところじゃよ！</p>
        `
    },
    {
        id: 'universe',
        title: 'ひみつファイル⑤：宇宙はどうやって始まって、最後はどうなるの？',
        icon: 'auto_awesome',
        color: 'amber',
        reviewedAt: '2026-10-04',
        sourceUrls: [
            'https://science.nasa.gov/mission/webb/big-bang-q-and-a/',
            'https://science.nasa.gov/asset/hubble/the-fate-of-the-universe-three-scenarios/',
            'https://www.desi.lbl.gov/2026/07/30/new-desi-dr2-lyman-alpha-results-shed-light-on-dark-energy/'
        ],
        content: `
            <p class="mb-4">はかせじゃ。今回は、宇宙そのものの「始まり」と「終わり」の話をしようかのぅ。</p>
            <p class="mb-4">今から約138億年前、宇宙は今よりはるかに高温・高密度で、そこから空間そのものが膨張してきたと考えられておる。これがビッグバン宇宙論の基本じゃ。</p>
            
            <!-- ビッグバン大爆発とエネルギー放射の幾何学SVG -->
            <div class="my-4 flex justify-center bg-slate-950/40 p-4 rounded-2xl border border-amber-500/10 shadow-inner">
                <svg viewBox="0 0 100 100" class="w-32 h-32 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]" fill="none" stroke="currentColor" stroke-width="0.8">
                    <circle cx="50" cy="50" r="3" fill="#f59e0b" />
                    <path d="M50,50 L50,15 M50,50 L50,85 M50,50 L15,50 M50,50 L85,50" />
                    <path d="M50,50 L25,25 M50,50 L75,75 M50,50 L25,75 M50,50 L75,25" />
                    <circle cx="50" cy="50" r="16" stroke="rgba(245, 158, 11, 0.5)" />
                    <circle cx="50" cy="50" r="28" stroke="rgba(245, 158, 11, 0.3)" stroke-dasharray="3 3" />
                    <circle cx="50" cy="50" r="40" stroke="rgba(245, 158, 11, 0.15)" stroke-dasharray="1 4" />
                </svg>
            </div>

            <div class="my-6 p-5 bg-amber-900/50 rounded-2xl border border-amber-500/30 shadow-inner">
                <h4 class="text-amber-300 font-black mb-3 flex items-center gap-2"><span class="material-symbols-rounded">flare</span>ビッグバンは「宇宙の中心の爆発」ではない</h4>
                <p class="leading-relaxed">名前から花火のような爆発を想像しやすいが、宇宙の中心で起きた爆発ではない。空間そのものが宇宙のあらゆる場所で広がってきた、と考えるのが大切なんじゃ。ごく初期に急激な膨張「インフレーション」が起きたという有力な考えも研究されておる。</p>
            </div>
            <p class="mb-4 leading-relaxed">では宇宙の最後はどうなるのか。ダークエネルギーが一定だとする標準的なモデルでは膨張が続き、非常に遠い未来には冷たく薄い宇宙へ近づくと予想される。一方で、ダークエネルギーの正体そのものがまだ分かっていないため、宇宙の最期もまだ決着していないんじゃ。</p>
            <p class="mb-4 leading-relaxed">DESIの2025年の結果は「ダークエネルギーが時間とともに変化しているかもしれない」という兆候を強めた。しかし2026年7月の新しいLyα解析は標準モデル側へ近づく結果も示し、研究はさらに続いている。</p>
            <p class="leading-relaxed font-bold text-amber-200">科学では、新しい観測が増えると「いちばん良い説明」が変わることがある。宇宙の未来を一つに決めつけず、これからの観測を見守るのが現在の正確な姿勢なんじゃよ！</p>
        `
    },
    {
        id: 'darkmatter',
        title: 'ひみつファイル⑥：普通の物質は約5%！？謎の「暗黒物質」',
        icon: 'blur_on',
        color: 'rose',
        reviewedAt: '2026-10-04',
        sourceUrls: [
            'https://science.nasa.gov/universe/overview/building-blocks/',
            'https://science.nasa.gov/dark-matter/'
        ],
        content: `
            <p class="mb-4">よく来たのぅ！はかせじゃ。</p>
            <p class="mb-4">夜空の星だけでなく、私たちの体や惑星、ガスやちりも「普通の物質」の仲間じゃ。しかし宇宙全体の構成を調べると、それだけでは説明できないものがたくさんあるんじゃよ。</p>
            
            <!-- 目に見えない暗黒物質のグリッドモデルSVG -->
            <div class="my-4 flex justify-center bg-slate-950/40 p-4 rounded-2xl border border-rose-500/10 shadow-inner">
                <svg viewBox="0 0 100 100" class="w-32 h-32 text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]" fill="none" stroke="currentColor" stroke-width="0.8">
                    <path d="M10,50 Q30,20 50,50 T90,50" />
                    <path d="M10,40 Q30,10 50,40 T90,40" opacity="0.5" />
                    <path d="M10,60 Q30,30 50,60 T90,60" opacity="0.5" />
                    <circle cx="50" cy="50" r="3" fill="#f43f5e" />
                    <circle cx="28" cy="35" r="2" fill="#fda4af" />
                    <circle cx="72" cy="65" r="2" fill="#fda4af" />
                    <circle cx="50" cy="50" r="15" stroke="rgba(244, 63, 94, 0.3)" />
                    <circle cx="50" cy="50" r="28" stroke="rgba(244, 63, 94, 0.15)" />
                </svg>
            </div>

            <div class="my-6 p-5 bg-rose-900/50 rounded-2xl border border-rose-500/30 shadow-inner">
                <h4 class="text-rose-300 font-black mb-3 flex items-center gap-2"><span class="material-symbols-rounded">blur_on</span>普通の物質・ダークマター・ダークエネルギー</h4>
                <p class="leading-relaxed">現在よく使われる宇宙モデルでは、宇宙の構成は普通の物質が約5%、ダークマターが約27%、ダークエネルギーが約68%と見積もられておる。「星だけが5%」という意味ではなく、私たちを作る原子など普通の物質全体が約5%なんじゃ。</p>
            </div>
            <p class="mb-4 leading-relaxed">ダークマターは普通の光を出したり反射したりする姿が見えない一方、銀河や銀河団の動き、重力レンズなどに現れる重力の効果から存在が推定されている。ただし粒子として何者なのか、重力以外にどんな相互作用をするのかはまだ分かっていない。</p>
            <p class="mb-4 leading-relaxed">ダークエネルギーは、宇宙の膨張が加速していることを説明するためにつけられた名前じゃ。こちらも正体は未解明で、一定なのか時間とともに変化するのかも研究が続いておる。</p>
            <p class="leading-relaxed font-bold text-rose-200">「約95%が何も分からない」というより、観測で存在や割合の手がかりは得ているけれど、その正体がまだ解けていない――というのが今の宇宙科学に近いんじゃよ！</p>
        `
    },
    {
        id: 'exoplanet',
        title: 'ひみつファイル⑦：マグマの海や、ガラスみたいな粒が舞う惑星！？',
        icon: 'diamond',
        color: 'emerald',
        reviewedAt: '2026-10-04',
        sourceUrls: [
            'https://science.nasa.gov/missions/webb/nasas-webb-hints-at-possible-atmosphere-surrounding-rocky-exoplanet/',
            'https://science.nasa.gov/missions/hubble/nasas-hubble-finds-a-true-blue-planet/'
        ],
        content: `
            <p class="mb-4">やあ！はかせじゃ。</p>
            <p class="mb-4">今回は、太陽系の外にある、観測するたびに新しい姿が見えてくる「太陽系外惑星（たいようけいがいわくせい）」を紹介しようかのぅ。</p>
            
            <!-- ダイヤモンドの結晶格子幾何学SVG -->
            <div class="my-4 flex justify-center bg-slate-950/40 p-4 rounded-2xl border border-emerald-500/10 shadow-inner">
                <svg viewBox="0 0 100 100" class="w-32 h-32 text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]" fill="none" stroke="currentColor" stroke-width="0.8">
                    <polygon points="50,15 80,40 50,85 20,40" stroke="#10b981" stroke-width="1.2" />
                    <polygon points="50,15 50,85" stroke="rgba(16, 185, 129, 0.4)" />
                    <polygon points="20,40 80,40" stroke="rgba(16, 185, 129, 0.4)" />
                    <path d="M50,15 L32,40 L50,85 M50,15 L68,40 L50,85" stroke="rgba(16, 185, 129, 0.7)" />
                    <circle cx="50" cy="15" r="2.5" fill="#34d399" />
                    <circle cx="80" cy="40" r="2.5" fill="#34d399" />
                    <circle cx="50" cy="85" r="2.5" fill="#34d399" />
                    <circle cx="20" cy="40" r="2.5" fill="#34d399" />
                    <circle cx="50" cy="40" r="2.5" fill="#a7f3d0" />
                </svg>
            </div>

            <div class="my-6 p-5 bg-emerald-900/50 rounded-2xl border border-emerald-500/30 shadow-inner">
                <h4 class="text-emerald-300 font-black mb-3 flex items-center gap-2"><span class="material-symbols-rounded">diamond</span>「ダイヤモンド惑星」説も観測で更新される</h4>
                <p class="leading-relaxed">約41光年先の「かに座55番星e（55 Cancri e）」は、かつて炭素が豊富で内部に大量のダイヤモンドを持つかもしれないという説で有名になった。でも、地表がダイヤモンドだと確認されたわけではないんじゃ。</p>
            </div>
            <p class="mb-4 leading-relaxed">2024年に発表されたJWSTの観測結果では、この灼熱の岩石惑星に二酸化炭素や一酸化炭素を含む可能性のある大気があり、下にあるマグマの海からガスが出ているというモデルが有力な候補として示された。観測が増えるほど、惑星像は更新されているんじゃよ。</p>
            <p class="mb-4 leading-relaxed">青く見える巨大ガス惑星「HD 189733b」も、地球の海のような青ではない。高温の大気にケイ酸塩の粒を含む雲があると考えられ、NASAは時速約7,000km級の風の中で「ガラスのような粒が横向きに降る」可能性を紹介しておる。</p>
            <p class="leading-relaxed font-bold text-emerald-200">系外惑星は、想像だけで決めるのではなく、光を詳しく測って少しずつ姿を確かめていく世界じゃ。昔の有名な説が新しい観測で変わることも、科学のおもしろさなんじゃよ！</p>
        `
    }
];

// Tailwind CSS Safelist for Dynamic Column Colors
export const TAILWIND_SAFELIST = [
    'bg-purple-500/10', 'text-purple-400', 'border-purple-500/30',
    'bg-green-500/10', 'text-green-400', 'border-green-500/30',
    'bg-blue-500/10', 'text-blue-400', 'border-blue-500/30',
    'bg-cyan-500/10', 'text-cyan-400', 'border-cyan-500/30',
    'bg-amber-500/10', 'text-amber-400', 'border-amber-500/30',
    'bg-rose-500/10', 'text-rose-400', 'border-rose-500/30',
    'bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/30'
];

