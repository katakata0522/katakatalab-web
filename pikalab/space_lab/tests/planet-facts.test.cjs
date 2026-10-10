const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

async function loadPlanetData() {
  const source = fs.readFileSync(path.join(root, 'data.js'), 'utf8').replace(/\r\n?/g, '\n');
  const marker = '\n\nexport const SECRET_COLUMNS = [';
  const splitAt = source.indexOf(marker);
  assert.ok(splitAt > 0, 'PLANETSとSECRET_COLUMNSの境界が存在する');
  const planetsOnly = `${source.slice(0, splitAt)}\n`;
  const url = `data:text/javascript;base64,${Buffer.from(planetsOnly).toString('base64')}`;
  return import(url);
}

test('Space Labの惑星温度はNASAの比較値と測定文脈を保持する', async () => {
  const { PLANETS } = await loadPlanetData();
  const byId = Object.fromEntries(PLANETS.map((planet) => [planet.id, planet]));

  assert.equal(byId.sun.temperature, '約5,500度（光球）');
  assert.match(byId.mercury.temperature, /-180.*430/);
  assert.equal(byId.venus.temperature, '平均 約464度（地表）');
  assert.equal(byId.earth.temperature, '平均 約15度（地表）');
  assert.equal(byId.mars.temperature, '平均 約-65度（地表）');
  assert.equal(byId.jupiter.temperature, '約-110度（1気圧層）');
  assert.equal(byId.saturn.temperature, '約-140度（1気圧層）');
  assert.equal(byId.uranus.temperature, '約-195度（1気圧層）');
  assert.equal(byId.neptune.temperature, '約-200度（1気圧層）');
});

test('巨大惑星を固体の地表があるように説明しない', async () => {
  const { PLANETS } = await loadPlanetData();
  const byId = Object.fromEntries(PLANETS.map((planet) => [planet.id, planet]));

  for (const id of ['jupiter', 'saturn', 'uranus', 'neptune']) {
    assert.match(byId[id].description, /固体の地表はな(?:い|く)/);
  }
  assert.doesNotMatch(byId.jupiter.description, /表面のしま模様/);
});

test('断定しすぎていた惑星表現を再導入しない', async () => {
  const { PLANETS } = await loadPlanetData();
  const text = JSON.stringify(PLANETS);
  for (const phrase of [
    '太陽系で唯一の「奇跡の星」',
    '激突したせいで、横倒し',
    '濃い青色が特徴',
    'マッハ1＝時速約1,224km'
  ]) {
    assert.ok(!text.includes(phrase), `旧断定を再導入しない: ${phrase}`);
  }
});

test('金星の逆行自転を太陽系で唯一とは説明しない', async () => {
  const { PLANETS } = await loadPlanetData();
  const venus = PLANETS.find((planet) => planet.id === 'venus');
  const rotationQuiz = venus.quizzes.find((quiz) => quiz.question.includes('自転'));

  assert.equal(rotationQuiz.options[0], '多くの惑星と逆方向に回っている');
  assert.equal(rotationQuiz.correctIndex, 0);
  assert.match(rotationQuiz.explanation, /多くの惑星とは逆向き/);
  assert.match(rotationQuiz.explanation, /天王星もその仲間/);
  assert.doesNotMatch(rotationQuiz.explanation, /他の惑星とは逆向き/);
});

test('各惑星データに一次資料URLと監査日を保持する', async () => {
  const { PLANETS } = await loadPlanetData();
  assert.equal(PLANETS.length, 9);
  for (const planet of PLANETS) {
    assert.match(planet.factsSourceUrl, /^https:\/\/science\.nasa\.gov\//, `${planet.id}: NASA source`);
    assert.match(planet.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, `${planet.id}: reviewedAt`);
    assert.ok(Number.isFinite(Date.parse(planet.reviewedAt)), `${planet.id}: valid audit date`);
    assert.equal(planet.quizzes.length, 3, `${planet.id}: quiz count`);
  }
});

test('天王星の自転クイズで逆行自転を不正解扱いしない', async () => {
  // 2026-10-02: NASAは天王星の逆行自転と約98度の傾きをともに説明している。
  const { PLANETS } = await loadPlanetData();
  const uranus = PLANETS.find((planet) => planet.id === 'uranus');
  const quiz = uranus.quizzes.find((entry) => entry.question.includes('自転'));

  assert.equal(quiz.correctIndex, 1);
  assert.match(quiz.options[quiz.correctIndex], /軸.*横/);
  const distractors = quiz.options.filter((_, index) => index !== quiz.correctIndex);
  assert.ok(distractors.every((option) => !/逆回転|逆方向|逆向き/.test(option)));
});


test('天体の観測画像を別天体・切れた旧記事へ案内しない', async () => {
  const { PLANETS } = await loadPlanetData();
  const byId = Object.fromEntries(PLANETS.map(planet => [planet.id, planet]));
  // NASA公式の対象説明を2026-10-04に確認した回帰ケース。
  assert.equal(byId.sun.realPhotoUrl, 'https://www.nasa.gov/image-article/sunny-day/');
  assert.equal(byId.mercury.realPhotoUrl, 'https://science.nasa.gov/photojournal/mercury-globe-0n-0e/');
  assert.equal(byId.jupiter.realPhotoUrl, 'https://science.nasa.gov/asset/hubble/jupiter-and-the-great-red-spot/');
  assert.equal(byId.saturn.realPhotoUrl, 'https://science.nasa.gov/photojournal/saturn-four-years-on/');
  for (const planet of PLANETS) {
    const url = new URL(planet.realPhotoUrl);
    assert.equal(url.protocol, 'https:');
    assert.ok(url.hostname === 'nasa.gov' || url.hostname.endsWith('.nasa.gov'));
    for (const quiz of planet.quizzes) {
      assert.ok(Number.isInteger(quiz.correctIndex) && quiz.correctIndex >= 0 && quiz.correctIndex < quiz.options.length);
      assert.equal(new Set(quiz.options).size, quiz.options.length);
    }
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /NASAの観測画像を見る/);
  assert.doesNotMatch(html, /本物の写真を見る|>表面温度</);
});
