const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const labRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(labRoot, 'js/qrcode.min.js');
const publicPath = path.join(labRoot, 'public/js/qrcode.min.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const publicSource = fs.readFileSync(publicPath, 'utf8');

// 製品ファイルは変更せず、クロージャ末尾にテスト用の参照だけを追加する。
function loadRuntime(script, filename) {
    const ending = /QRCode\.CorrectLevel=d\}\(\);?\s*$/;
    assert.match(script, ending, 'QRCode のクロージャ末尾を特定できる');
    const context = vm.createContext({ document: { documentElement: { tagName: 'html' } } });
    vm.runInContext(script.replace(ending, [
        'QRCode.CorrectLevel=d;',
        'globalThis.__qrTest={Polynomial:i,Engine:b,selectVersion:r,',
        'correctLevel:d,getRSBlocks:j.getRSBlocks};}();'
    ].join('')), context, { filename, timeout: 1000 });
    return context.__qrTest;
}

const runtime = loadRuntime(source, sourcePath);
const levels = ['L', 'M', 'Q', 'H'];
const instruments = ['hihat', 'clap', 'snare', 'tom', 'kick'];
const productionRhythmUrl = 'https://katakatalab.com/pikalab/rhythm_lab/?p=eyJzY2hlbWFWZXJzaW9uIjoyLCJ0ZW1wbyI6MTczLCJwYXR0ZXJuIjp7ImhpaGF0IjpbMSwwLDEsMCwxLDAsMSwwLDEsMCwxLDAsMSwwLDEsMV0sImNsYXAiOlswLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwXSwic25hcmUiOlswLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDAsMCwwXSwidG9tIjpbMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDAsMF0sImtpY2siOlsxLDAsMSwwLDAsMCwxLDAsMCwwLDEsMCwwLDAsMSwwXX19';

function rhythmUrl(tempo, stepValue) {
    const pattern = Object.fromEntries(instruments.map((name, row) => [
        name, Array.from({ length: 16 }, (_, step) => Number(stepValue(row, step)))
    ]));
    const payload = { schemaVersion: 2, tempo, pattern };
    return 'https://katakatalab.com/pikalab/rhythm_lab/?p='
        + Buffer.from(JSON.stringify(payload)).toString('base64url');
}

const rhythmFixtures = [
    ['本番で失敗した173 BPMの共有URL', productionRhythmUrl],
    ['40 BPMの全休符', rhythmUrl(40, () => 0)],
    ['240 BPMの全発音', rhythmUrl(240, () => 1)],
    ['120 BPMの交互パターン', rhythmUrl(120, (row, step) => (row + step) % 2)],
    ['80 BPMの単発パターン', rhythmUrl(80, (row, step) => row === 4 && step === 0)],
    ['239 BPMの不規則パターン', rhythmUrl(239, (row, step) => ((row * 17 + step * 7) % 11) < 4)]
];

// 各アプリの共有処理に合わせ、JSONの内容とは独立してURLの形式を再現する。
const consumerPayload = Buffer.from(JSON.stringify({
    title: '共有QRの回帰テスト',
    description: '日本語を含む共有データをURLへ格納する',
    items: ['準備', '記録', '振り返り']
}));
const otherConsumerFixtures = [
    ['QuestBoard', 'https://katakatalab.com/pikalab/quest_board/?q=' + consumerPayload.toString('base64url')],
    ['ScienceMaker', 'https://katakatalab.com/pikalab/science_maker/?q=' + consumerPayload.toString('base64url')],
    ['BookReport', 'https://katakatalab.com/pikalab/book_report/?'
        + new URLSearchParams({ data: consumerPayload.toString('base64') }).toString()]
];

function encode(text, level, engine = runtime) {
    const correctLevel = engine.correctLevel[level];
    const qr = new engine.Engine(engine.selectVersion(text, correctLevel), correctLevel);
    qr.addData(text);
    qr.make();
    return qr;
}

function assertMatrix(qr) {
    const size = qr.getModuleCount();
    assert.ok(size >= 21 && size <= 177, 'QRの一辺がversion 1〜40の範囲');
    assert.equal((size - 17) % 4, 0);
    assert.equal(qr.modules.length, size);
    let dark = 0;
    for (let row = 0; row < size; row++) {
        assert.equal(qr.modules[row].length, size);
        for (let column = 0; column < size; column++) {
            assert.equal(typeof qr.isDark(row, column), 'boolean', '未設定セルが残らない');
            dark += Number(qr.isDark(row, column));
        }
    }
    const density = dark / (size * size);
    assert.ok(density > 0.3 && density < 0.7, `黒セル密度が不自然でない: ${density}`);
    for (const [top, left] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
        for (let row = 0; row < 7; row++) {
            for (let column = 0; column < 7; column++) {
                const expected = row === 0 || row === 6 || column === 0 || column === 6
                    || (row >= 2 && row <= 4 && column >= 2 && column <= 4);
                assert.equal(qr.isDark(top + row, left + column), expected, '位置検出パターン');
            }
        }
    }
}

// 製品の対数テーブル・多項式演算を使わずにGF(256)の剰余を検算する。
function gfMultiply(left, right) {
    let result = 0;
    while (right) {
        if (right & 1) result ^= left;
        left <<= 1;
        if (left & 0x100) left ^= 0x11d;
        right >>>= 1;
    }
    return result;
}

function assertErrorCorrection(qr) {
    const blocks = Array.from(runtime.getRSBlocks(qr.typeNumber, qr.errorCorrectLevel));
    const rawCodewords = Array.from(qr.dataCache);
    assert.equal(rawCodewords.length, blocks.reduce((sum, block) => sum + block.totalCount, 0));
    assert.ok(rawCodewords.every(value => value === undefined
        || (Number.isInteger(value) && value >= 0 && value <= 255)));
    // 疎配列のゼロ係数は、mapDataのビット演算と同じくゼロとして検算する。
    const codewords = rawCodewords.map(value => value === undefined ? 0 : value);
    const recovered = blocks.map(() => []);
    let offset = 0;
    for (let index = 0; index < Math.max(...blocks.map(block => block.dataCount)); index++) {
        blocks.forEach((block, blockIndex) => {
            if (index < block.dataCount) recovered[blockIndex].push(codewords[offset++]);
        });
    }
    for (let index = 0; index < Math.max(...blocks.map(block => block.totalCount - block.dataCount)); index++) {
        blocks.forEach((block, blockIndex) => {
            if (index < block.totalCount - block.dataCount) recovered[blockIndex].push(codewords[offset++]);
        });
    }
    assert.equal(offset, codewords.length);
    blocks.forEach((block, blockIndex) => {
        const values = recovered[blockIndex];
        assert.equal(values.length, block.totalCount);
        assert.ok(values.slice(block.dataCount).some(value => value !== 0), '誤り訂正符号がすべてゼロでない');
        let root = 1;
        for (let index = 0; index < block.totalCount - block.dataCount; index++) {
            const syndrome = values.reduce((value, coefficient) => gfMultiply(value, root) ^ coefficient, 0);
            assert.equal(syndrome, 0, `RS block ${blockIndex} / root ${index} の剰余`);
            root = gfMultiply(root, 2);
        }
    });
}

function matrixSignature(qr) {
    return Array.from(qr.modules, row => Array.from(row, Number).join('')).join('\n');
}

test('開発用publicコピーと本番用正本のQR実装が一致する', () => {
    assert.equal(source.trimEnd(), publicSource.trimEnd(), '開発時だけ別の実装が使われる状態を防ぐ');
});

test('GF(256)の多項式乗算が係数を計算する', () => {
    const { Polynomial } = runtime;
    const product = new Polynomial([1, 1], 0).multiply(new Polynomial([1, 1], 0));
    assert.deepEqual(Array.from(product.num), [1, 0, 1]);
});

test('割り切れる多項式とゼロ多項式のmodが停止してゼロを返す', () => {
    const { Polynomial } = runtime;
    const divisor = new Polynomial([1, 1], 0);
    assert.equal(new Polynomial([1, 0, 1], 0).mod(divisor).getLength(), 0);
    assert.equal(new Polynomial([0], 0).mod(divisor).getLength(), 0);
});

test('リズム共有fixtureは5楽器×16ステップのv2形式とBPMを保つ', () => {
    for (const [, url] of rhythmFixtures) {
        const payload = JSON.parse(Buffer.from(new URL(url).searchParams.get('p'), 'base64url'));
        assert.equal(payload.schemaVersion, 2);
        assert.ok(payload.tempo >= 40 && payload.tempo <= 240);
        assert.deepEqual(Object.keys(payload.pattern), instruments);
        for (const steps of Object.values(payload.pattern)) {
            assert.equal(steps.length, 16);
            assert.ok(steps.every(step => step === 0 || step === 1));
        }
    }
    const production = JSON.parse(Buffer.from(new URL(productionRhythmUrl).searchParams.get('p'), 'base64url'));
    assert.equal(production.tempo, 173);
});

for (const [name, url] of [...rhythmFixtures, ...otherConsumerFixtures]) {
    test(`${name}: 全誤り訂正レベルで有効な行列とRS符号を生成する`, () => {
        let previousSize = 0;
        const signatures = new Set();
        for (const level of levels) {
            const qr = encode(url, level);
            assertMatrix(qr);
            assertErrorCorrection(qr);
            assert.ok(qr.getModuleCount() >= previousSize, '訂正強度を上げても行列サイズが縮まない');
            previousSize = qr.getModuleCount();
            const signature = matrixSignature(qr);
            assert.equal(matrixSignature(encode(url, level)), signature, `${level}: 同じ入力の再生成結果が一致`);
            signatures.add(signature);
        }
        assert.equal(signatures.size, levels.length, '誤り訂正レベルが生成結果へ反映される');
    });
}

test('public配信されるQRも本番の共有URLを全誤り訂正レベルで処理する', () => {
    const publicRuntime = loadRuntime(publicSource, publicPath);
    for (const level of levels) {
        const qr = encode(productionRhythmUrl, level, publicRuntime);
        assertMatrix(qr);
        assertErrorCorrection(qr);
        assert.equal(matrixSignature(qr), matrixSignature(encode(productionRhythmUrl, level)));
    }
});

test('独立したRS検算はcodewordの1ビット破損を検出する', () => {
    const qr = encode(productionRhythmUrl, 'M');
    qr.dataCache[0] ^= 1;
    assert.throws(() => assertErrorCorrection(qr), /RS block/);
});
