const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const { clampInteger, decomposeEgyptianFraction } = require(path.join(projectRoot, 'script.js'));

function gcdBigInt(a, b) {
    let x = a < 0n ? -a : a;
    let y = b < 0n ? -b : b;
    while (y !== 0n) {
        const temp = x % y;
        x = y;
        y = temp;
    }
    return x || 1n;
}

function simplifyFraction(n, d) {
    const g = gcdBigInt(n, d);
    return { n: n / g, d: d / g };
}

function sumEgyptianTerms(terms) {
    let totalN = 0n;
    let totalD = 1n;

    for (const term of terms) {
        const [, denominator] = String(term).split('/');
        const unitD = BigInt(denominator);
        totalN = totalN * unitD + totalD;
        totalD = totalD * unitD;
        const reduced = simplifyFraction(totalN, totalD);
        totalN = reduced.n;
        totalD = reduced.d;
    }

    return simplifyFraction(totalN, totalD);
}

test('clampInteger: 範囲外と非数値を安全に丸める', () => {
    assert.equal(clampInteger('abc', 1, 12, 4), 4);
    assert.equal(clampInteger('-5', 1, 12, 4), 1);
    assert.equal(clampInteger('99', 1, 12, 4), 12);
    assert.equal(clampInteger('7', 1, 12, 4), 7);
});

test('decomposeEgyptianFraction: 3/4 を正しく分解する', () => {
    const result = decomposeEgyptianFraction(3, 4);
    assert.equal(result.ok, true);
    assert.deepEqual(result.terms, ['1/2', '1/4']);
});

test('decomposeEgyptianFraction: 大きい値でも正確に元の分数へ一致する', () => {
    const result = decomposeEgyptianFraction(53, 71);
    assert.equal(result.ok, true);
    assert.ok(result.terms.length > 0);

    const sum = sumEgyptianTerms(result.terms);
    const original = simplifyFraction(53n, 71n);
    assert.equal(sum.n, original.n);
    assert.equal(sum.d, original.d);
});

test('decomposeEgyptianFraction: 不正な真分数以外入力を拒否する', () => {
    const invalid1 = decomposeEgyptianFraction(4, 4);
    const invalid2 = decomposeEgyptianFraction(0, 5);
    const invalid3 = decomposeEgyptianFraction(2, 0);

    assert.equal(invalid1.ok, false);
    assert.equal(invalid1.reason, 'improper_fraction');
    assert.equal(invalid2.ok, false);
    assert.equal(invalid3.ok, false);
});

test('decomposeEgyptianFraction: 入力範囲(1<=n<d<=100)を全探索して元の分数へ一致する', () => {
    for (let denominator = 2; denominator <= 100; denominator++) {
        for (let numerator = 1; numerator < denominator; numerator++) {
            const result = decomposeEgyptianFraction(numerator, denominator, 20);
            assert.equal(result.ok, true, `failed: ${numerator}/${denominator}`);
            assert.ok(result.terms.length > 0, `no terms: ${numerator}/${denominator}`);
            assert.ok(result.terms.length <= 20, `too many terms: ${numerator}/${denominator}`);

            let previousUnitDenominator = 0n;
            for (const term of result.terms) {
                const [, denominatorText] = String(term).split('/');
                const unitDenominator = BigInt(denominatorText);
                assert.ok(unitDenominator > previousUnitDenominator, `non-increasing unit fraction: ${numerator}/${denominator}`);
                previousUnitDenominator = unitDenominator;
            }

            const sum = sumEgyptianTerms(result.terms);
            const original = simplifyFraction(BigInt(numerator), BigInt(denominator));
            assert.equal(sum.n, original.n, `sum numerator mismatch: ${numerator}/${denominator}`);
            assert.equal(sum.d, original.d, `sum denominator mismatch: ${numerator}/${denominator}`);
        }
    }
});

test('index.html: viewportでズーム禁止をしていない', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    assert.ok(!html.includes('user-scalable=no'));
    assert.ok(!html.includes('maximum-scale=1.0'));
});

test('index.html: CSPがunsafe-inline scriptとTailwind CDN依存を含まない', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    assert.ok(!html.includes("script-src 'self' https://cdn.tailwindcss.com 'unsafe-inline'"));
    assert.ok(!html.includes('https://cdn.tailwindcss.com'));
    assert.ok(html.includes("script-src 'self'"));
    assert.ok(html.includes("object-src 'none'"));
    assert.ok(html.includes("base-uri 'self'"));
    assert.ok(!html.includes('frame-ancestors'), 'frame-ancestors is ignored in meta CSP and should be set as a response header');
    assert.ok(html.includes('tailwind.generated.css'));
});

test('index.html: エジプト分数入力のmin値がロジック境界と整合している', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    assert.ok(html.includes('id="egypt-n" max="99" min="1"'));
    assert.ok(html.includes('id="egypt-d" max="100" min="2"'));
});

test('index.html: 分数ラボ本体のスクリプトを読み込む', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    assert.match(html, /<script\s+src="script\.js"\s+defer><\/script>/);
});

test('390px表示でタブの横スクロールをページ全体へ漏らさない', () => {
    const css = fs.readFileSync(path.join(projectRoot, 'style.css'), 'utf8');
    assert.match(css, /nav\s*\{[^}]*max-width:\s*100vw[^}]*overflow:\s*hidden/s);
    assert.match(css, /nav\s+\[role="tablist"\]\s*\{[^}]*width:\s*100%[^}]*overflow-x:\s*auto/s);
    assert.match(css, /#main-content\s*\{[^}]*min-width:\s*0[^}]*max-width:\s*100%/s);
});
