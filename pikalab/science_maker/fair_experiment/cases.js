/* PikaLab Experiment Detective Lab — authored, reviewed-as-prototype scenarios.
   These depict fictional experiment plans. They DO NOT predict or represent measured outcomes. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ExperimentDetectiveData = api;
})(typeof globalThis === 'object' ? globalThis : undefined, function () {
  'use strict';
  const CASES = Object.freeze([
    {
      id: 'plant', chapter: 'intro', order: '01', emoji: '🌱', title: '植物のひみつ',
      subtitle: '光と水、どちらが原因？',
      description: '光の当て方が、植物の育ち方に関係するか調べる計画だよ。',
      goal: '光を当てる時間の影響を調べる', scene: 'plant',
      observations: [
        { id: 'light', name: '光を当てる時間', a: '6時間', b: '2時間', kind: 'changed' },
        { id: 'water', name: '水の量', a: '100mL', b: '40mL', repairedB: '100mL', kind: 'mistake' },
        { id: 'species', name: '植物の種類', a: '同じ種類', b: '同じ種類', kind: 'same' }
      ],
      steps: [
        {
          id: 'find', eyebrow: '01 / 手がかりを見つけよう',
          title: '光のちがいだけを調べるには、何がおかしい？',
          description: 'AとBの条件をよく見比べよう。',
          options: [
            { id: 'light', label: '光を当てる時間', feedback: '光のちがいを調べたいから、そこはわざと変える条件なんだ。' },
            { id: 'water', label: '水の量', feedback: '水も違っているね。光だけの影響を調べるなら、ここをそろえたい！' },
            { id: 'species', label: '植物の種類', feedback: '植物の種類は同じだよ。ほかに数が違うところはあるかな？' }
          ],
          answer: 'water', hints: ['「何の影響を調べたい？」が大切。光は変えていいんだ。', 'AとBの水の量を見てみて。同じかな？']
        },
        {
          id: 'repair', eyebrow: '02 / 実験を組み直そう',
          title: 'Bの水の量を、何mLに直す？',
          description: '光以外の条件はそろえたいね。Aの水の量に注目しよう。',
          options: [
            { id: '100', label: '100mL', feedback: 'AもBも100mLにそろった！これで水の量による違いを減らせるよ。' },
            { id: '40', label: '40mL', feedback: 'それは今のBと同じ量だね。Aとそろえるには？' },
            { id: '140', label: '140mL', feedback: 'Aの量とまだ違っているね。Aは何mLだろう？' }
          ],
          answer: '100', hints: ['比べるためには、変えない条件を同じにしよう。', 'Aは100mL。Bも同じ数にそろえよう。']
        },
        {
          id: 'measure', eyebrow: '03 / さいごの確認',
          title: '育ち方を比べるために、何を測る？',
          description: '結果として知りたいことを選ぼう。',
          options: [
            { id: 'water', label: 'あげた水の量（mL）', feedback: '水の量は、同じにする条件だね。結果として育ち方を確かめたいんだ。' },
            { id: 'height', label: '一定期間後の植物の高さ（cm）', feedback: 'いいね！同じ期間が過ぎた後の高さを測ると、結果を比べるための記録になるよ。' },
            { id: 'sun', label: '光を当てた時間（時間）', feedback: '光の時間は、わざと変える条件。測りたい結果とは別なんだ。' }
          ],
          answer: 'height', hints: ['光を「変える条件」にするなら、結果にあたるものは何かな？', '決めた期間のあと、ものさしで測れる植物の変化を選ぼう。']
        }
      ],
      ending: '光の影響を確かめられる実験計画に近づいたね！',
      learning: '調べたい「光の時間」だけを変えて、水や植物の種類などはそろえる。育ち方を比べるなら、期間をそろえて高さを測ろう。実際の結果は観察して初めてわかるよ。'
    },
    {
      id: 'sugar', chapter: 'intro', order: '02', emoji: '🧪', title: '砂糖のひみつ',
      subtitle: '本当に水温のせい？',
      description: '水の温度で、砂糖が溶けきるまでの時間が変わるかを調べる計画だよ。',
      goal: '水温の影響を調べる', scene: 'sugar',
      observations: [
        { id: 'temperature', name: '水の温度', a: '20℃', b: '40℃', kind: 'changed' },
        { id: 'stirring', name: 'かき混ぜる回数', a: '10回', b: '30回', repairedB: '10回', kind: 'mistake' },
        { id: 'water', name: '水の量', a: '100mL', b: '100mL', kind: 'same' },
        { id: 'sugar', name: '砂糖の重さ', a: '5g', b: '5g', kind: 'same' }
      ],
      steps: [
        {
          id: 'find', eyebrow: '01 / 手がかりを見つけよう',
          title: '水温のちがいだけを調べるには、何がおかしい？',
          description: '2つのコップに入った水の条件を比べてみてね。',
          options: [
            { id: 'temperature', label: '水の温度', feedback: '水の温度は今回わざと変えたい条件だよ。' },
            { id: 'stirring', label: 'かき混ぜる回数', feedback: 'そう！かき混ぜ方まで違うと、水温だけの影響か判断しづらいね。' },
            { id: 'sugar', label: '砂糖の重さ', feedback: '砂糖の重さはどちらも5g。同じにできているよ。' }
          ],
          answer: 'stirring', hints: ['水温は今回変えたい条件。ほかに違う数字がないかな？', 'かき混ぜる回数はAとBで同じ？']
        },
        {
          id: 'repair', eyebrow: '02 / 実験を組み直そう',
          title: 'Bは何回かき混ぜることにする？',
          description: 'Aと同じ回数にそろえるよ。',
          options: [
            { id: '30', label: '30回', feedback: 'それはBの元の回数だね。Aとまだ違っているよ。' },
            { id: '10', label: '10回', feedback: 'AもBも10回！回数をそろえられたね。' },
            { id: '20', label: '20回', feedback: '20回ではAと同じにならないね。もう一度見てみよう。' }
          ],
          answer: '10', hints: ['実験Aの「かき混ぜる回数」を探そう。', 'Aは10回。Bも10回にそろえよう。']
        },
        {
          id: 'measure', eyebrow: '03 / さいごの確認',
          title: '水温で溶けやすさを比べたい。何を測る？',
          description: '比較できる「結果」を記録しよう。',
          options: [
            { id: 'duration', label: '砂糖が見えなくなるまでの時間（秒）', feedback: 'その時間を測れば、結果のちがいを比べられるね。' },
            { id: 'degrees', label: '水の温度（℃）', feedback: '水温は自分で変える条件だね。結果として知りたいものは？' },
            { id: 'stirs', label: 'かき混ぜた回数', feedback: '混ぜる回数はそろえる条件だよ。時間を記録するなら？' }
          ],
          answer: 'duration', hints: ['水温が原因として考えられるなら、結果として何が変わるかを見たいね。', 'ストップウォッチで測れるものを選んでみよう。']
        }
      ],
      ending: 'よく気づいたね！余計なちがいを減らせたよ。',
      learning: '水温だけを変えて、水量・砂糖の量・かき混ぜ方などをそろえる。溶けきるまでの時間を測れば比較するための記録になる。実際に加熱する実験はこのゲームでは行わないでね。'
    },
    {
      id: 'pendulum', chapter: 'intro', order: '03', emoji: '⏱️', title: 'ふりこのひみつ',
      subtitle: '長さ以外も違ってる？',
      description: '糸の長さを変えると、ふりこが10往復する時間はどうなるかを調べる計画だよ。',
      goal: '糸の長さの影響を調べる', scene: 'pendulum',
      observations: [
        { id: 'length', name: '糸の長さ', a: '20cm', b: '40cm', kind: 'changed' },
        { id: 'weight', name: '重りの重さ', a: '50g', b: '100g', repairedB: '50g', kind: 'mistake' },
        { id: 'start', name: 'ふり始めの角度', a: '同じ角度', b: '同じ角度', kind: 'same' },
        { id: 'count', name: '測る往復数', a: '10往復', b: '10往復', kind: 'same' }
      ],
      steps: [
        {
          id: 'find', eyebrow: '01 / 手がかりを見つけよう',
          title: '糸の長さだけを調べるには、何がおかしい？',
          description: 'AとBで違う条件を見つけてね。',
          options: [
            { id: 'length', label: '糸の長さ', feedback: '糸の長さは今回わざと変えて比べたい条件だよ。' },
            { id: 'weight', label: '重りの重さ', feedback: '発見！重りの重さも違うね。長さだけを調べるなら、重さはそろえよう。' },
            { id: 'count', label: '測る往復数', feedback: '測るのはどちらも10往復。ここはすでに同じだよ。' }
          ],
          answer: 'weight', hints: ['糸の長さは変えていいよ。もう一つ違うところがあるかな？', '重りに書かれたg（グラム）を比べてみよう。']
        },
        {
          id: 'repair', eyebrow: '02 / 実験を組み直そう',
          title: 'Bの重りは何gにそろえる？',
          description: 'Aと同じ重りを使うことにしよう。',
          options: [
            { id: '100', label: '100g', feedback: '100gは今のBと同じ。Aの重りを確認しよう。' },
            { id: '25', label: '25g', feedback: 'それではAと重さが違ってしまうよ。' },
            { id: '50', label: '50g', feedback: 'ぴったり！重りの重さが同じになったね。' }
          ],
          answer: '50', hints: ['実験Aの重りは何gだったかな？', 'Aは50g。Bも50gにそろえるよ。']
        },
        {
          id: 'measure', eyebrow: '03 / さいごの確認',
          title: '糸の長さの影響を調べたい。何を測る？',
          description: '測り方もAとBで同じにしよう。',
          options: [
            { id: 'mass', label: '重りの重さ（g）', feedback: '重りの重さはそろえる条件だよ。' },
            { id: 'length', label: '糸の長さ（cm）', feedback: '糸の長さは今回自分で変えた条件。結果として確かめたいものは？' },
            { id: 'time', label: '10往復にかかった時間（秒）', feedback: 'その時間を測れば、糸の長さとの関係を比べる計画になるね。' }
          ],
          answer: 'time', hints: ['糸の長さを変えたとき、どんな結果に注目するのかな？', 'ストップウォッチで「10往復ぶんの時間」を測ろう。']
        }
      ],
      ending: '糸の長さの影響を調べる計画ができた！',
      learning: '糸の長さだけを変え、重りの重さ・ふり始めの角度・数え方をそろえる。10往復にかかった時間を比べよう。重さを変える実験も、目的が「重さの影響を調べる」なら別の正しい計画になり得るよ。'
    },
    {
      "id": "ramp",
      "order": "04",
      "chapter": "compare",
      "emoji": "🚗",
      "title": "坂道カーのひみつ",
      "subtitle": "坂の角度、それとも重さ？",
      "description": "坂道の角度を変えると、車がゴールまで走る時間は変わるかな？",
      "goal": "坂の角度の影響を調べる",
      "scene": "ramp",
      "objectLabel": "ミニカー",
      "observations": [
        {
          "id": "angle",
          "name": "坂道の角度",
          "a": "10°",
          "b": "20°",
          "kind": "changed"
        },
        {
          "id": "mass",
          "name": "車の重さ",
          "a": "100g",
          "b": "200g",
          "kind": "mistake",
          "repairedB": "100g"
        },
        {
          "id": "track",
          "name": "走る距離",
          "a": "100cm",
          "b": "100cm",
          "kind": "same"
        },
        {
          "id": "push",
          "name": "スタートのしかた",
          "a": "手を離す",
          "b": "手を離す",
          "kind": "same"
        }
      ],
      "steps": [
        {
          "id": "find",
          "eyebrow": "01 / おかしい条件を探そう",
          "title": "坂の角度の影響だけを調べるには、どこを直す？",
          "description": "角度以外にも違いがないか、実験AとBを比べよう。",
          "options": [
            {
              "id": "angle",
              "label": "坂道の角度",
              "feedback": "角度は今回わざと変える条件だよ。"
            },
            {
              "id": "mass",
              "label": "車の重さ",
              "feedback": "車の重さも違っている！ 角度だけを比べるにはそろえよう。"
            },
            {
              "id": "track",
              "label": "走る距離",
              "feedback": "走る距離はどちらも100cmで同じだよ。"
            }
          ],
          "answer": "mass",
          "hints": [
            "角度は変えていい。ほかに数字の違うところは？",
            "Aの車とBの車の重さに注目しよう。"
          ]
        },
        {
          "id": "repair",
          "eyebrow": "02 / 実験を直そう",
          "title": "Bの車の重さを何gにそろえる？",
          "description": "AとBの車を、同じ条件に近づけよう。",
          "options": [
            {
              "id": "100",
              "label": "100g",
              "feedback": "これで車の重さがそろったね！"
            },
            {
              "id": "150",
              "label": "150g",
              "feedback": "150gだとAの車とはまだ違うよ。"
            },
            {
              "id": "200",
              "label": "200g",
              "feedback": "200gはBの元の重さだね。"
            }
          ],
          "answer": "100",
          "hints": [
            "Aの車の重さを確認しよう。",
            "Aは100g。Bも100gにそろえよう。"
          ]
        },
        {
          "id": "measure",
          "eyebrow": "03 / 結果を読み解こう",
          "title": "どの記録で、坂道の角度の影響を比べられる？",
          "description": "同じ距離を走るときの違いを調べるよ。",
          "options": [
            {
              "id": "time",
              "label": "スタートからゴールまでの時間（秒）",
              "feedback": "同じ距離を走る時間を比べれば、角度の違いを調べられるね。"
            },
            {
              "id": "weight",
              "label": "車の重さ（g）",
              "feedback": "重さはそろえる条件で、今回調べたい結果ではないよ。"
            },
            {
              "id": "angle",
              "label": "坂道の角度（°）",
              "feedback": "角度は自分で変える条件。結果として測るものは何かな？"
            }
          ],
          "answer": "time",
          "hints": [
            "同じ距離なら、速く走る車は何が短くなる？",
            "ストップウォッチで測るものを選ぼう。"
          ]
        }
      ],
      "ending": "角度以外の条件をそろえることができたね。",
      "learning": "坂道の角度だけを変え、車の重さ・走る距離・スタートのしかたをそろえる。同じ距離にかかる時間で比べよう。実際の速さは測ってはじめて分かるよ。"
    },
    {
      "id": "shadow",
      "order": "05",
      "chapter": "compare",
      "emoji": "💡",
      "title": "かげのひみつ",
      "subtitle": "ライトの位置、それとも形？",
      "description": "ライトからものまでの距離を変えると、影の大きさはどうなるかな？",
      "goal": "ライトとの距離の影響を調べる",
      "scene": "shadow",
      "objectLabel": "ボール",
      "observations": [
        {
          "id": "distance",
          "name": "ライトとの距離",
          "a": "15cm",
          "b": "30cm",
          "kind": "changed"
        },
        {
          "id": "size",
          "name": "ボールの直径",
          "a": "5cm",
          "b": "10cm",
          "kind": "mistake",
          "repairedB": "5cm"
        },
        {
          "id": "screen",
          "name": "スクリーンの位置",
          "a": "同じ位置",
          "b": "同じ位置",
          "kind": "same"
        },
        {
          "id": "lamp",
          "name": "ライトの種類",
          "a": "同じ",
          "b": "同じ",
          "kind": "same"
        }
      ],
      "steps": [
        {
          "id": "find",
          "eyebrow": "01 / おかしい条件を探そう",
          "title": "ライトとの距離の影響だけを調べたい。何が余計？",
          "description": "二つの影を比べる前に、実験条件を見てみよう。",
          "options": [
            {
              "id": "distance",
              "label": "ライトとの距離",
              "feedback": "そこは今回わざと変える条件だよ。"
            },
            {
              "id": "size",
              "label": "ボールの大きさ",
              "feedback": "発見！ ボールの大きさまで違うと距離だけの影響を比べにくいね。"
            },
            {
              "id": "lamp",
              "label": "ライトの種類",
              "feedback": "ライトの種類はすでにそろっているよ。"
            }
          ],
          "answer": "size",
          "hints": [
            "ライトとの距離は変えていいよ。",
            "ボールの直径をAとBで比べてみよう。"
          ]
        },
        {
          "id": "repair",
          "eyebrow": "02 / 実験を直そう",
          "title": "Bは直径何cmのボールを使う？",
          "description": "Aと同じ大きさのものを用意するよ。",
          "options": [
            {
              "id": "10",
              "label": "10cm",
              "feedback": "今のBのままだと大きさが違うね。"
            },
            {
              "id": "5",
              "label": "5cm",
              "feedback": "ぴったり！ボールの大きさをそろえられた。"
            },
            {
              "id": "15",
              "label": "15cm",
              "feedback": "Aの直径を見直してみよう。"
            }
          ],
          "answer": "5",
          "hints": [
            "Aのボールの直径が手がかりだよ。",
            "Aは5cm。Bも5cmにしよう。"
          ]
        },
        {
          "id": "measure",
          "eyebrow": "03 / 結果を読み解こう",
          "title": "今回知りたい結果は何かな？",
          "description": "光の距離を変えて、スクリーンに映るものを比べるよ。",
          "options": [
            {
              "id": "brightness",
              "label": "ライトの明るさ",
              "feedback": "ライトは同じ種類のものを使って比べるよ。"
            },
            {
              "id": "shadow",
              "label": "スクリーンにできた影の大きさ",
              "feedback": "影の大きさを記録すれば、ライトとの距離を変えたときの違いを比べられるね。"
            },
            {
              "id": "ball",
              "label": "ボールの直径",
              "feedback": "ボールの直径はそろえる条件だよ。"
            }
          ],
          "answer": "shadow",
          "hints": [
            "ライトを動かすと、スクリーン上の何に注目したい？",
            "できた影をものさしで測ろう。"
          ]
        }
      ],
      "ending": "かげの大きさを比べる準備ができたよ。",
      "learning": "ライトからボールまでの距離だけを変え、ボール・スクリーン・ライトをそろえる。影の大きさを測るとよい比較になるよ。"
    },
    {
      "id": "magnet",
      "order": "06",
      "chapter": "compare",
      "emoji": "🧲",
      "title": "じしゃくのひみつ",
      "subtitle": "距離とクリップの数",
      "description": "じしゃくと鉄のクリップの距離を変えると、動くクリップの数はどうなるかな？",
      "goal": "じしゃくとの距離の影響を調べる",
      "scene": "magnet",
      "objectLabel": "クリップ",
      "observations": [
        {
          "id": "distance",
          "name": "じしゃくとの距離",
          "a": "1cm",
          "b": "5cm",
          "kind": "changed"
        },
        {
          "id": "count",
          "name": "鉄クリップの数",
          "a": "5個",
          "b": "10個",
          "kind": "mistake",
          "repairedB": "5個"
        },
        {
          "id": "magnet",
          "name": "じしゃくの種類",
          "a": "同じ",
          "b": "同じ",
          "kind": "same"
        },
        {
          "id": "clips",
          "name": "クリップの種類",
          "a": "同じ鉄製",
          "b": "同じ鉄製",
          "kind": "same"
        }
      ],
      "steps": [
        {
          "id": "find",
          "eyebrow": "01 / おかしい条件を探そう",
          "title": "距離の違いだけを比べたい。何が余計に違う？",
          "description": "クリップを置く条件を見比べよう。",
          "options": [
            {
              "id": "distance",
              "label": "じしゃくとの距離",
              "feedback": "距離は今回わざと変えるんだ。"
            },
            {
              "id": "count",
              "label": "クリップの数",
              "feedback": "そう！数が違うと動いた数を公平に比べにくいね。"
            },
            {
              "id": "magnet",
              "label": "じしゃくの種類",
              "feedback": "じしゃくの種類は同じだよ。"
            }
          ],
          "answer": "count",
          "hints": [
            "距離は変えてよい条件だよ。",
            "AとBのクリップの数を見よう。"
          ]
        },
        {
          "id": "repair",
          "eyebrow": "02 / 実験を直そう",
          "title": "Bのクリップは何個にそろえる？",
          "description": "両方とも同じ数のクリップを置くよ。",
          "options": [
            {
              "id": "10",
              "label": "10個",
              "feedback": "Bの元の数だね。Aとはまだ違っているよ。"
            },
            {
              "id": "3",
              "label": "3個",
              "feedback": "Aの数をもう一度見てみて。"
            },
            {
              "id": "5",
              "label": "5個",
              "feedback": "5個にそろった！これで動いた数を比べられるね。"
            }
          ],
          "answer": "5",
          "hints": [
            "Aに置いたクリップは何個かな？",
            "Aは5個。Bも5個にそろえよう。"
          ]
        },
        {
          "id": "measure",
          "eyebrow": "03 / 結果を読み解こう",
          "title": "もしAでは3個、Bでは0個動いたら？",
          "description": "ここからは仮の結果だよ。この条件で言えることを選ぼう。",
          "options": [
            {
              "id": "limited",
              "label": "この条件では、距離によって動いた数が違った",
              "feedback": "いい判断だね。この条件で見られた違いを、そのまま説明できている。"
            },
            {
              "id": "always",
              "label": "じしゃくはどんな金属でも必ず引き寄せる",
              "feedback": "クリップは鉄製。すべての金属について試していないよ。"
            },
            {
              "id": "proof",
              "label": "5cmでは、どんなじしゃくでも絶対に動かない",
              "feedback": "今回のじしゃくと条件での結果だけからは、すべてのじしゃくを決めつけられないね。"
            }
          ],
          "answer": "limited",
          "hints": [
            "この結果だけで言える範囲を考えよう。",
            "「このじしゃく・この条件では」と限定してみよう。"
          ]
        }
      ],
      "ending": "実験の結果を言いすぎずに説明できたね！",
      "learning": "公平に比べるためにクリップの数と種類をそろえる。結果が出ても、調べた条件以外のことまで決めつけないことが大切だよ。"
    },
    {
      "id": "sprout",
      "order": "07",
      "chapter": "advanced",
      "emoji": "🌰",
      "title": "たねのひみつ",
      "subtitle": "水だけの違いを調べよう",
      "description": "たねに水を与えるかどうかで、芽が出る数は変わるのかな？",
      "goal": "水の有無の影響を調べる",
      "scene": "sprout",
      "objectLabel": "たね",
      "observations": [
        {
          "id": "water",
          "name": "水の有無",
          "a": "水あり",
          "b": "水なし",
          "kind": "changed"
        },
        {
          "id": "seed",
          "name": "たねの種類",
          "a": "アサガオ",
          "b": "ダイコン",
          "kind": "mistake",
          "repairedB": "アサガオ"
        },
        {
          "id": "amount",
          "name": "たねの数",
          "a": "10粒",
          "b": "10粒",
          "kind": "same"
        },
        {
          "id": "temp",
          "name": "置く温度",
          "a": "20℃",
          "b": "20℃",
          "kind": "same"
        }
      ],
      "steps": [
        {
          "id": "find",
          "eyebrow": "01 / おかしい条件を探そう",
          "title": "水が必要か比べたい。どこを直す？",
          "description": "たねの条件を2つのトレイで比べてみよう。",
          "options": [
            {
              "id": "water",
              "label": "水の有無",
              "feedback": "水があるかないかは、今回の調べたい条件だよ。"
            },
            {
              "id": "seed",
              "label": "たねの種類",
              "feedback": "発見！たねの種類も違っていると、水の影響だけを比べにくいね。"
            },
            {
              "id": "amount",
              "label": "たねの数",
              "feedback": "数はどちらも10粒でそろっているよ。"
            }
          ],
          "answer": "seed",
          "hints": [
            "変えていいのは水の有無だよ。",
            "AとBで使っているたねの名前を見よう。"
          ]
        },
        {
          "id": "repair",
          "eyebrow": "02 / 実験を直そう",
          "title": "Bに使うのは、どのたね？",
          "description": "AとBで同じ種類にそろえよう。",
          "options": [
            {
              "id": "radish",
              "label": "ダイコン",
              "feedback": "Bの元の種類だね。Aと同じになっていないよ。"
            },
            {
              "id": "asagao",
              "label": "アサガオ",
              "feedback": "これでたねの種類が同じになった！"
            },
            {
              "id": "corn",
              "label": "トウモロコシ",
              "feedback": "Aのアサガオと種類が違うよ。"
            }
          ],
          "answer": "asagao",
          "hints": [
            "Aのたねの名前を確認しよう。",
            "Aはアサガオのたねだね。"
          ]
        },
        {
          "id": "measure",
          "eyebrow": "03 / 結果を読み解こう",
          "title": "芽が出たかどうか、どうやって比べる？",
          "description": "同じ日数が過ぎたあと、AとBを記録しよう。",
          "options": [
            {
              "id": "count",
              "label": "芽が出たたねの数（個）",
              "feedback": "その数を比べれば、水の有無による違いを記録できるね。"
            },
            {
              "id": "water",
              "label": "水をあげたかどうか",
              "feedback": "水の有無は今回わざと変えた条件だよ。結果を記録しよう。"
            },
            {
              "id": "type",
              "label": "たねの種類",
              "feedback": "たねの種類はそろえた条件だよ。"
            }
          ],
          "answer": "count",
          "hints": [
            "同じ数のたねを使って、何が変化したかを見よう。",
            "決めた日数後に「芽が出たたねの数」を数えよう。"
          ]
        }
      ],
      "ending": "水の有無だけを比べる計画にできたね！",
      "learning": "たねの種類と数、温度、観察する日数をそろえ、水の有無だけを変える。芽が出た数を同じ日数で比べよう。"
    },
    {
      "id": "evaporate",
      "order": "08",
      "chapter": "advanced",
      "emoji": "💧",
      "title": "水のへり方のひみつ",
      "subtitle": "広さと水の量のトリック",
      "description": "水面の広さによって、同じ時間に蒸発する量は変わるかな？",
      "goal": "水面の広さの影響を調べる",
      "scene": "evaporate",
      "objectLabel": "水を入れる容器",
      "observations": [
        {
          "id": "surface",
          "name": "水面の広さ",
          "a": "25cm²",
          "b": "50cm²",
          "kind": "changed"
        },
        {
          "id": "water",
          "name": "最初の水の量",
          "a": "100mL",
          "b": "50mL",
          "kind": "mistake",
          "repairedB": "100mL"
        },
        {
          "id": "place",
          "name": "置く場所",
          "a": "同じ部屋",
          "b": "同じ部屋",
          "kind": "same"
        },
        {
          "id": "time",
          "name": "観察する時間",
          "a": "同じ時間",
          "b": "同じ時間",
          "kind": "same"
        }
      ],
      "steps": [
        {
          "id": "find",
          "eyebrow": "01 / おかしい条件を探そう",
          "title": "水面の広さの違いだけを調べたい。何が余計？",
          "description": "水面の広さ以外の数字に注目しよう。",
          "options": [
            {
              "id": "surface",
              "label": "水面の広さ",
              "feedback": "広さは今回わざと変える条件だね。"
            },
            {
              "id": "water",
              "label": "最初の水の量",
              "feedback": "そう！最初の水の量が違うと、条件をそろえて比べられないね。"
            },
            {
              "id": "place",
              "label": "置く場所",
              "feedback": "置く場所は両方とも同じ部屋だよ。"
            }
          ],
          "answer": "water",
          "hints": [
            "広さを変えるのが今回の目的だよ。",
            "水は初め、どちらにも何mL入っている？"
          ]
        },
        {
          "id": "repair",
          "eyebrow": "02 / 実験を直そう",
          "title": "Bの水の量を何mLにする？",
          "description": "最初の水の量を、Aと同じにしよう。",
          "options": [
            {
              "id": "50",
              "label": "50mL",
              "feedback": "Bの元の水量だね。Aとは違うよ。"
            },
            {
              "id": "100",
              "label": "100mL",
              "feedback": "これで水の量もそろったね！"
            },
            {
              "id": "150",
              "label": "150mL",
              "feedback": "Aと同じ数ではないよ。"
            }
          ],
          "answer": "100",
          "hints": [
            "Aの最初の水量を見よう。",
            "Aは100mL。Bも100mLにしよう。"
          ]
        },
        {
          "id": "measure",
          "eyebrow": "03 / 結果を読み解こう",
          "title": "水面の広さによる違いは、どう記録する？",
          "description": "観察する時間は同じ。最初と最後を比べるよ。",
          "options": [
            {
              "id": "remaining",
              "label": "観察後に残った水の量を、最初の量と比べる",
              "feedback": "そう！減った水の量を比べれば、蒸発量を調べられるね。"
            },
            {
              "id": "surface",
              "label": "水面の広さだけを記録する",
              "feedback": "水面の広さは変える条件だよ。水がどれだけ減ったか知りたいね。"
            },
            {
              "id": "minutes",
              "label": "観察した時間だけを記録する",
              "feedback": "観察時間はそろえる条件だよ。結果の変化も測ろう。"
            }
          ],
          "answer": "remaining",
          "hints": [
            "蒸発すると、水の量はどうなるかな？",
            "「最初と最後の水量の差」を見よう。"
          ]
        }
      ],
      "ending": "水が減った量を比べる方法がわかったね。",
      "learning": "同じ量の水を入れ、部屋や時間、風・温度などをできるだけそろえる。残った水の量を量り、減った量から蒸発の違いを比べよう。"
    },
    {
      "id": "rubber",
      "order": "09",
      "chapter": "advanced",
      "emoji": "🎵",
      "title": "音の高さのひみつ",
      "subtitle": "長さと張り具合の違い",
      "description": "同じ太さの輪ゴムの、振動する部分の長さを変えると音の高さはどうなるかな？",
      "goal": "振動する部分の長さの影響を調べる",
      "scene": "rubber",
      "objectLabel": "輪ゴム",
      "observations": [
        {
          "id": "length",
          "name": "振動する部分の長さ",
          "a": "5cm",
          "b": "10cm",
          "kind": "changed"
        },
        {
          "id": "tension",
          "name": "ゴムの張り具合",
          "a": "同じ強さ",
          "b": "もっと強く張る",
          "kind": "mistake",
          "repairedB": "同じ強さ"
        },
        {
          "id": "type",
          "name": "ゴムの太さ",
          "a": "同じ",
          "b": "同じ",
          "kind": "same"
        },
        {
          "id": "pluck",
          "name": "はじき方",
          "a": "同じ",
          "b": "同じ",
          "kind": "same"
        }
      ],
      "steps": [
        {
          "id": "find",
          "eyebrow": "01 / おかしい条件を探そう",
          "title": "ゴムの長さの違いだけを比べるには？",
          "description": "音が変わる原因が2つになっていないかな？",
          "options": [
            {
              "id": "length",
              "label": "振動する部分の長さ",
              "feedback": "長さは今回わざと変える条件だよ。"
            },
            {
              "id": "tension",
              "label": "ゴムの張り具合",
              "feedback": "そう！張り具合まで違うと、長さだけの影響かわからないね。"
            },
            {
              "id": "pluck",
              "label": "はじき方",
              "feedback": "はじき方はすでにそろっているよ。"
            }
          ],
          "answer": "tension",
          "hints": [
            "長さ以外で、音の高さに影響しそうなことは？",
            "ゴムの「張り具合」を比べよう。"
          ]
        },
        {
          "id": "repair",
          "eyebrow": "02 / 実験を直そう",
          "title": "Bのゴムをどんな張り具合に直す？",
          "description": "音を比べるための条件をそろえるよ。",
          "options": [
            {
              "id": "same",
              "label": "Aと同じ張り具合",
              "feedback": "これで長さ以外の条件をそろえられたね。"
            },
            {
              "id": "strong",
              "label": "もっと強く張る",
              "feedback": "Bだけ強く張ると、Aと張り具合が違ってしまうよ。"
            },
            {
              "id": "weak",
              "label": "もっとゆるくする",
              "feedback": "Bだけゆるくすると、まだAと違う条件だよ。"
            }
          ],
          "answer": "same",
          "hints": [
            "どちらのゴムも同じ条件で比べたいね。",
            "Aと同じ張り具合にそろえよう。"
          ]
        },
        {
          "id": "measure",
          "eyebrow": "03 / 結果を読み解こう",
          "title": "音の高さを数字で比べるなら？",
          "description": "音が高い・低いを数値で記録する方法を選ぼう。",
          "options": [
            {
              "id": "hz",
              "label": "基本的な振動数（Hz）を比べる",
              "feedback": "そう！同じ測定方法で周波数を比べると音の高さとの関係を調べられる。"
            },
            {
              "id": "weight",
              "label": "輪ゴムの重さ（g）",
              "feedback": "ゴムの重さは今回の測定したい結果ではないよ。"
            },
            {
              "id": "length",
              "label": "ゴムの長さ（cm）",
              "feedback": "長さはわざと変える条件。音の結果も確かめよう。"
            }
          ],
          "answer": "hz",
          "hints": [
            "音の「高さ」はどんな数字で表されるかな？",
            "周波数の単位はHz（ヘルツ）だよ。"
          ]
        }
      ],
      "ending": "長さと音の関係を調べる準備ができたね。",
      "learning": "振動する長さだけを変え、張り具合・太さ・はじき方をそろえる。音の高さは同じ方法で測る。画面は模式図で、音は実際に鳴らしていないよ。"
    }
  ]);

  function validateCases(cases) {
    if (!Array.isArray(cases) || cases.length === 0) return ['事件データがありません'];
    const errors = [];
    const ids = new Set();
    for (const item of cases) {
      if (!item || typeof item.id !== 'string' || ids.has(item.id)) { errors.push('事件IDが欠損または重複'); continue; }
      ids.add(item.id);
      if (!['intro', 'compare', 'advanced'].includes(item.chapter)) errors.push(item.id + ': 章が不正');
      if (!item.goal || !item.learning || !item.title || !item.scene) errors.push(item.id + ': 必須説明が不足');
      if (!Array.isArray(item.steps) || item.steps.length !== 3) errors.push(item.id + ': ステップは3つ');
      const obsIds = new Set();
      for (const obs of item.observations || []) {
        if (!obs.id || obsIds.has(obs.id)) errors.push(item.id + ': 観察項目ID重複');
        if (!['changed', 'mistake', 'same'].includes(obs.kind)) errors.push(item.id + ': 不正な条件');
        obsIds.add(obs.id);
      }
      for (const step of item.steps || []) {
        const options = step.options || [];
        const keys = options.map(option => option.id);
        if (keys.length !== 3 || keys.some(x => typeof x !== 'string') || new Set(keys).size !== keys.length || !keys.includes(step.answer)) errors.push(item.id + ': 不正な選択肢 ' + step.id);
        if (!Array.isArray(step.hints) || step.hints.length !== 2) errors.push(item.id + ': ヒント不足 ' + step.id);
        if (options.some(o => !o.feedback || o.feedback.length < 10)) errors.push(item.id + ': 誤答説明不足 ' + step.id);
      }
      const repairObs = (item.observations || []).filter(o => o.kind === 'mistake');
      if (repairObs.length !== 1 || !repairObs[0].repairedB) errors.push(item.id + ': 修正対象は1条件');
      if ((item.observations || []).filter(o=>o.kind==='changed').length !== 1) errors.push(item.id + ': 意図的に変える条件は1つ');
    }
    return errors;
  }

  function getCase(id) { return CASES.find(item => item.id === id) || null; }
  function getStep(item, index) { return item && Number.isInteger(index) ? item.steps[index] || null : null; }
  function judgeAnswer(item, index, optionId) {
    const step = getStep(item, index);
    if (!step || typeof optionId !== 'string') return { valid: false, correct: false, feedback: '選択肢を確認してください。' };
    const option = step.options.find(o => o.id === optionId);
    if (!option) return { valid: false, correct: false, feedback: '選択肢を確認してください。' };
    return { valid: true, correct: option.id === step.answer, feedback: option.feedback };
  }
  return { CASES, validateCases, getCase, getStep, judgeAnswer };
});
