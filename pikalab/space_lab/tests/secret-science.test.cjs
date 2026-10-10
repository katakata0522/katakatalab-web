const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dataPath = path.resolve(__dirname, '..', 'data.js');
const source = fs.readFileSync(dataPath, 'utf8');
const secretStart = source.indexOf('export const SECRET_COLUMNS = [');
const secretEnd = source.indexOf('// Tailwind CSS Safelist for Dynamic Column Colors', secretStart);
const secrets = source.slice(secretStart, secretEnd);

function secretBlock(id) {
    const marker = `id: '${id}'`;
    const start = secrets.indexOf(marker);
    assert.ok(start >= 0, `${id} のひみつファイルが存在する`);
    const next = secrets.indexOf("\n    {\n        id: '", start + marker.length);
    return secrets.slice(start, next >= 0 ? next : secrets.length);
}

test('Space Labのひみつファイル7本は監査日と一次資料を持つ', () => {
    const ids = ['blackhole', 'alien', 'outside', 'time', 'universe', 'darkmatter', 'exoplanet'];
    for (const id of ids) {
        const block = secretBlock(id);
        assert.match(block, /reviewedAt:\s*'\d{4}-\d{2}-\d{2}'/, `${id}: reviewedAt`);
        assert.match(block, /sourceUrls:\s*\[/, `${id}: sourceUrls`);
    }

    const urls = [...secrets.matchAll(/https:\/\/[^'"\s]+/g)].map((match) => match[0]);
    assert.ok(urls.length >= 9, '監査用の一次資料URLを保持する');
    for (const rawUrl of urls) {
        const host = new URL(rawUrl).hostname;
        assert.ok(
            host === 'science.nasa.gov' || host === 'www.desi.lbl.gov',
            `一次資料はNASAまたはDESIに限定する: ${rawUrl}`
        );
    }
});

test('Voyagerを星間空間と太陽系脱出で混同しない', () => {
    const block = secretBlock('outside');
    assert.match(block, /星間空間/);
    assert.match(block, /まだ太陽系を完全に出たわけではない/);
    assert.match(block, /オールトの雲/);
    assert.doesNotMatch(block, /太陽系を飛び出して/);
});

test('ビッグバンと宇宙の最期を確定しすぎない', () => {
    const block = secretBlock('universe');
    assert.match(block, /宇宙の中心で起きた爆発ではない/);
    assert.match(block, /まだ決着していない/);
    assert.match(block, /ダークエネルギー/);
    assert.doesNotMatch(block, /大爆発のような超大膨張/);
    assert.doesNotMatch(block, /最も有力な説では/);
});

test('ダークマター・ダークエネルギーの割合と未知性を区別する', () => {
    const block = secretBlock('darkmatter');
    assert.match(block, /普通の物質が約5%/);
    assert.match(block, /ダークマターが約27%/);
    assert.match(block, /ダークエネルギーが約68%/);
    assert.doesNotMatch(block, /正体不明 of/);
    assert.doesNotMatch(block, /強力な重力だけを持つ/);
});

test('55 Cancri eをダイヤモンド惑星と断定しない', () => {
    const block = secretBlock('exoplanet');
    assert.match(block, /かつて.*ダイヤモンド/);
    assert.match(block, /JWST/);
    assert.match(block, /マグマの海/);
    assert.doesNotMatch(block, /地表の大部分がカチカチの「ダイヤモンド」/);
});

test('地球外生命と相対論の説明を観測事実と未解決事項に分ける', () => {
    const alien = secretBlock('alien');
    assert.match(alien, /地球以外の生命の証拠はまだ見つかっていない/);
    assert.match(alien, /答えはまだ分からない/);
    assert.doesNotMatch(alien, /科学者たちの多くは/);

    const time = secretBlock('time');
    assert.match(time, /GPS/);
    assert.match(time, /速さや旅のしかたで変わる/);
});


test('発表年と観測年を区別し、オールトの雲を直接確認済みとしない', () => {
    assert.match(secretBlock('exoplanet'), /2024年に発表されたJWSTの観測結果/);
    assert.doesNotMatch(secretBlock('exoplanet'), /JWSTの2024年の観測/);
    assert.match(secretBlock('outside'), /小天体が広がると考えられる/);
});
