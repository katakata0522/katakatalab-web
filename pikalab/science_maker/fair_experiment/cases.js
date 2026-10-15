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
      id: 'plant', order: '01', emoji: '🌱', title: '植物のひみつ',
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
      id: 'sugar', order: '02', emoji: '🧪', title: '砂糖のひみつ',
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
      id: 'pendulum', order: '03', emoji: '⏱️', title: 'ふりこのひみつ',
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
    }
  ]);

  function validateCases(cases) {
    if (!Array.isArray(cases) || cases.length === 0) return ['事件データがありません'];
    const errors = [];
    const ids = new Set();
    for (const item of cases) {
      if (!item || typeof item.id !== 'string' || ids.has(item.id)) { errors.push('事件IDが欠損または重複'); continue; }
      ids.add(item.id);
      if (!Array.isArray(item.steps) || item.steps.length !== 3) errors.push(item.id + ': ステップは3つ');
      const obsIds = new Set();
      for (const obs of item.observations || []) {
        if (!obs.id || obsIds.has(obs.id)) errors.push(item.id + ': 観察項目ID重複');
        obsIds.add(obs.id);
      }
      for (const step of item.steps || []) {
        const options = step.options || [];
        const keys = options.map(option => option.id);
        if (keys.length !== 3 || keys.some(x => typeof x !== 'string') || new Set(keys).size !== keys.length || !keys.includes(step.answer)) errors.push(item.id + ': 不正な選択肢 ' + step.id);
        if (!Array.isArray(step.hints) || step.hints.length !== 2) errors.push(item.id + ': ヒント不足 ' + step.id);
      }
      const repairObs = (item.observations || []).filter(o => o.kind === 'mistake');
      if (repairObs.length !== 1 || !repairObs[0].repairedB) errors.push(item.id + ': 修正対象は1条件');
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
