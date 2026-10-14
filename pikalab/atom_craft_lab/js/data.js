// 教材データ：画面・操作ロジックから独立
export const ATOMS = {
    H:  { symbol: 'H',  name: '水素',       color: '#0ea5e9', text: '#ffffff' },
    O:  { symbol: 'O',  name: '酸素',       color: '#f43f5e', text: '#ffffff' },
    C:  { symbol: 'C',  name: '炭素',       color: '#334155', text: '#ffffff' },
    N:  { symbol: 'N',  name: '窒素',       color: '#6366f1', text: '#ffffff' },
    S:  { symbol: 'S',  name: '硫黄',       color: '#eab308', text: '#1e293b' },
    Cl: { symbol: 'Cl', name: '塩素',       color: '#10b981', text: '#ffffff' },
    Na: { symbol: 'Na', name: 'ナトリウム', color: '#ec4899', text: '#ffffff' },
    Cu: { symbol: 'Cu', name: '銅',         color: '#d97706', text: '#ffffff' },
    Fe: { symbol: 'Fe', name: '鉄',         color: '#0d9488', text: '#ffffff' },
    Ag: { symbol: 'Ag', name: '銀',         color: '#06b6d4', text: '#ffffff' }
};

export const PALETTE_ATOM_KEYS = ['H', 'O', 'C', 'N', 'Cu', 'Fe', 'S', 'Cl'];

export const MOLECULE_RECIPES = [
    {
        id: 'H2O',
        formula: 'H₂O',
        name: '水',
        category: '分子をつくる物質',
        composition: { H: 2, O: 1 },
        defaultAtoms: ['H', 'H', 'O'],
        hint: '水素(H)を2個、酸素(O)を1個あつめよう',
        explain: '酸素1個に水素2個が「くの字」に結合した分子だよ！',
        svgType: 'bent_H2O'
    },
    {
        id: 'CO2',
        formula: 'CO₂',
        name: '二酸化炭素',
        category: '分子をつくる物質',
        composition: { C: 1, O: 2 },
        defaultAtoms: ['O', 'C', 'O'],
        hint: '炭素(C)を1個、酸素(O)を2個あつめよう',
        explain: '炭素の両側に酸素が1個ずつ、まっすぐ一列に並んだ分子だよ！',
        svgType: 'linear_CO2'
    },
    {
        id: 'O2',
        formula: 'O₂',
        name: '酸素（気体）',
        category: '単体の分子',
        composition: { O: 2 },
        defaultAtoms: ['O', 'O'],
        hint: '空気中の酸素は1粒ではなく、酸素(O)2個のペアだよ',
        explain: '1種類の原子だけでできた物質を「単体」と呼ぶよ！',
        svgType: 'diatomic_O2'
    },
    {
        id: 'H2',
        formula: 'H₂',
        name: '水素（気体）',
        category: '単体の分子',
        composition: { H: 2 },
        defaultAtoms: ['H', 'H'],
        hint: '宇宙で一番軽い気体！水素(H)を2個ペアにしよう',
        explain: '水素原子が2個しっかり手をつないだ単体の分子だよ！',
        svgType: 'diatomic_H2'
    },
    {
        id: 'NH3',
        formula: 'NH₃',
        name: 'アンモニア',
        category: '分子をつくる物質',
        composition: { N: 1, H: 3 },
        defaultAtoms: ['N', 'H', 'H', 'H'],
        hint: '窒素(N)1個と、水素(H)3個をあつめよう',
        explain: '水にとてもよく溶けてアルカリ性を示す、三角ピラミッド型の分子だよ！',
        svgType: 'pyramid_NH3'
    },
    {
        id: 'CH4',
        formula: 'CH₄',
        name: 'メタン',
        category: '分子をつくる物質',
        composition: { C: 1, H: 4 },
        defaultAtoms: ['C', 'H', 'H', 'H', 'H'],
        hint: '炭素(C)1個のまわりに、水素(H)を4個あつめよう',
        explain: '都市ガスの主成分！燃えると二酸化炭素と水になる有機物だよ。',
        svgType: 'tetra_CH4'
    },
    {
        id: 'CuO',
        formula: 'CuO',
        name: '酸化銅',
        category: '分子をつくらない化合物',
        composition: { Cu: 1, O: 1 },
        defaultAtoms: ['Cu', 'O'],
        hint: '銅(Cu)1個と、酸素(O)1個を1対1で組み合わせよう',
        explain: '銅を空気中で加熱するとできる黒い粉末。1対1の比で並んでいるよ！',
        svgType: 'lattice_CuO'
    },
    {
        id: 'FeS',
        formula: 'FeS',
        name: '硫化鉄',
        category: '分子をつくらない化合物',
        composition: { Fe: 1, S: 1 },
        defaultAtoms: ['Fe', 'S'],
        hint: '鉄(Fe)1個と、硫黄(S)1個を1対1で組み合わせよう',
        explain: '鉄と硫黄の混合物を加熱するとできる黒い物質。磁石につかなくなるよ！',
        svgType: 'lattice_FeS'
    }
];

export const BALANCE_STAGES = [
    {
        id: 1,
        shortName: '1. 水の合成',
        title: 'ステージ1：水の合成（水素 ＋ 酸素 → 水）',
        desc: '右の「水（H₂O）」には酸素（O）が1個しかありません。パックの数を増やして左右の数をそろえよう！',
        hint: '右の「H₂Oパック」を2個にするとOが2個でそろうよ！するとHが4個になるから、左の「H₂パック」も2個にしよう。',
        reactants: [
            { formula: 'H₂', name: '水素', atoms: { H: 2 }, targetCoeff: 2 },
            { formula: 'O₂', name: '酸素', atoms: { O: 2 }, targetCoeff: 1 }
        ],
        products: [
            { formula: 'H₂O', name: '水', atoms: { H: 2, O: 1 }, targetCoeff: 2 }
        ],
        trivia: '「2H₂ + O₂ → 2H₂O」完成！O₂は2個ペアで動くから、水分子も2個できるんだね。'
    },
    {
        id: 2,
        shortName: '2. 銅の酸化',
        title: 'ステージ2：銅の酸化（銅 ＋ 酸素 → 酸化銅）',
        desc: '10円玉の銅（Cu）を加熱して黒い酸化銅（CuO）にする反応だよ。',
        hint: '右の「CuOパック」を2個にしてOを2個にそろえ、左の「Cu」も2個にしよう！',
        reactants: [
            { formula: 'Cu', name: '銅', atoms: { Cu: 1 }, targetCoeff: 2 },
            { formula: 'O₂', name: '酸素', atoms: { O: 2 }, targetCoeff: 1 }
        ],
        products: [
            { formula: 'CuO', name: '酸化銅', atoms: { Cu: 1, O: 1 }, targetCoeff: 2 }
        ],
        trivia: '「2Cu + O₂ → 2CuO」完成！マグネシウムの燃焼（2Mg + O₂ → 2MgO）もまったく同じ形になるよ。'
    },
    {
        id: 3,
        shortName: '3. 酸化銀の分解',
        title: 'ステージ3：酸化銀の熱分解（酸化銀 → 銀 ＋ 酸素）',
        desc: '酸化銀（Ag₂O）を加熱すると、ピカピカの銀（Ag）と酸素（O₂）に分かれるよ。',
        hint: '左の「Ag₂Oパック」を2個にするとOが2個でそろうね。すると銀（Ag）は合計何個になるかな？',
        reactants: [
            { formula: 'Ag₂O', name: '酸化銀', atoms: { Ag: 2, O: 1 }, targetCoeff: 2 }
        ],
        products: [
            { formula: 'Ag', name: '銀', atoms: { Ag: 1 }, targetCoeff: 4 },
            { formula: 'O₂', name: '酸素', atoms: { O: 2 }, targetCoeff: 1 }
        ],
        trivia: '「2Ag₂O → 4Ag + O₂」完成！銀の係数が「4」になるテスト頻出の反応式だよ。'
    },
    {
        id: 4,
        shortName: '4. 塩化銅の分解',
        title: 'ステージ4：塩化銅の電気分解（塩化銅 → 銅 ＋ 塩素）',
        desc: '最初から左右の原子の数をよく見比べてみよう。すでにそろっているかも…？',
        hint: '左もCuが1個・Clが2個、右もCuが1個・Clが2個だね。そのままボタンを押してみよう！',
        reactants: [
            { formula: 'CuCl₂', name: '塩化銅', atoms: { Cu: 1, Cl: 2 }, targetCoeff: 1 }
        ],
        products: [
            { formula: 'Cu', name: '銅', atoms: { Cu: 1 }, targetCoeff: 1 },
            { formula: 'Cl₂', name: '塩素', atoms: { Cl: 2 }, targetCoeff: 1 }
        ],
        trivia: '「CuCl₂ → Cu + Cl₂」完成！数字を変えなくても最初からつり合っている反応式もあるんだね。'
    },
    {
        id: 5,
        shortName: '5. アンモニア合成',
        title: 'ステージ5：アンモニアの合成（窒素 ＋ 水素 → アンモニア）',
        desc: '左の水素は2個入り（H₂）、右のアンモニアの水素は3個入り（NH₃）だよ。',
        hint: '2と3の最小公倍数「6個」にそろえよう！H₂を3パック、NH₃を2パックにしてみて！',
        reactants: [
            { formula: 'N₂', name: '窒素', atoms: { N: 2 }, targetCoeff: 1 },
            { formula: 'H₂', name: '水素', atoms: { H: 2 }, targetCoeff: 3 }
        ],
        products: [
            { formula: 'NH₃', name: 'アンモニア', atoms: { N: 1, H: 3 }, targetCoeff: 2 }
        ],
        trivia: '「N₂ + 3H₂ → 2NH₃」完成！2個入りと3個入りを「6個」でそろえる名パズルだね。'
    },
    {
        id: 6,
        shortName: '6. メタンの燃焼',
        title: 'ステージ6：メタンの燃焼（メタン ＋ 酸素 → 二酸化炭素 ＋ 水）',
        desc: '都市ガスのメタン（CH₄）が燃える反応。C・H・Oの3種類をすべてそろえよう！',
        hint: 'まずHを4個にそろえるために右の「H₂O」を2個にしよう。すると右のOが合計4個になるから、左の「O₂」を2個にすれば完成！',
        reactants: [
            { formula: 'CH₄', name: 'メタン', atoms: { C: 1, H: 4 }, targetCoeff: 1 },
            { formula: 'O₂', name: '酸素', atoms: { O: 2 }, targetCoeff: 2 }
        ],
        products: [
            { formula: 'CO₂', name: '二酸化炭素', atoms: { C: 1, O: 2 }, targetCoeff: 1 },
            { formula: 'H₂O', name: '水', atoms: { H: 2, O: 1 }, targetCoeff: 2 }
        ],
        trivia: '「CH₄ + 2O₂ → CO₂ + 2H₂O」完成！単体の酸素（O₂）を一番最後に調整するのがコツだよ。'
    },
    {
        id: 7,
        shortName: '7. 酸化銅の還元',
        title: 'ステージ7：酸化銅の炭素による還元（酸化銅 ＋ 炭素 → 銅 ＋ 二酸化炭素）',
        desc: '酸化銅（CuO）から酸素をうばって、銅（Cu）を取り出す「還元」の実験だよ。',
        hint: '右のCO₂にはOが2個あるから、左の「CuO」を2個にしよう。あとは右の「Cu」を2個にするだけ！',
        reactants: [
            { formula: 'CuO', name: '酸化銅', atoms: { Cu: 1, O: 1 }, targetCoeff: 2 },
            { formula: 'C', name: '炭素', atoms: { C: 1 }, targetCoeff: 1 }
        ],
        products: [
            { formula: 'Cu', name: '銅', atoms: { Cu: 1 }, targetCoeff: 2 },
            { formula: 'CO₂', name: '二酸化炭素', atoms: { C: 1, O: 2 }, targetCoeff: 1 }
        ],
        trivia: '「2CuO + C → 2Cu + CO₂」完成！酸化と還元はかならず同時に起こるよ。'
    },
    {
        id: 8,
        shortName: '8. 重曹の熱分解',
        title: 'ステージ8：炭酸水素ナトリウムの熱分解',
        desc: 'ホットケーキをふくらませる重曹（NaHCO₃）を加熱すると3つの物質に分かれるボスステージ！',
        hint: '右のNa₂CO₃にはNaが2個入っているね。左の「NaHCO₃」を2個にするだけで…！？',
        reactants: [
            { formula: 'NaHCO₃', name: '炭酸水素ナトリウム', atoms: { Na: 1, H: 1, C: 1, O: 3 }, targetCoeff: 2 }
        ],
        products: [
            { formula: 'Na₂CO₃', name: '炭酸ナトリウム', atoms: { Na: 2, C: 1, O: 3 }, targetCoeff: 1 },
            { formula: 'H₂O', name: '水', atoms: { H: 2, O: 1 }, targetCoeff: 1 },
            { formula: 'CO₂', name: '二酸化炭素', atoms: { C: 1, O: 2 }, targetCoeff: 1 }
        ],
        trivia: '「2NaHCO₃ → Na₂CO₃ + H₂O + CO₂」全ステージ制覇おめでとう！左を2にするだけで全部そろう美しい反応式だね。'
    }
];
