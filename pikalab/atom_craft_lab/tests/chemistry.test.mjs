import test from 'node:test';
import assert from 'node:assert/strict';
import { ATOMS, MOLECULE_RECIPES, BALANCE_STAGES } from '../js/data.js';
import { getCompositionCounts, isCompositionMatch, calculateSideAtomTotals, gcd } from '../js/chemistry.js';

test('全8種類の物質と8つの反応式ステージが登録されている', () => {
    assert.equal(MOLECULE_RECIPES.length, 8);
    assert.equal(BALANCE_STAGES.length, 8);
    assert.equal(new Set(MOLECULE_RECIPES.map(m => m.id)).size, 8);
    assert.equal(new Set(BALANCE_STAGES.map(s => s.id)).size, 8);
});

test('物質レシピの粒数・元素名が正しい', () => {
    for (const recipe of MOLECULE_RECIPES) {
        assert.deepEqual(getCompositionCounts(recipe.defaultAtoms), recipe.composition, recipe.id);
        assert.ok(Object.keys(recipe.composition).every(symbol => ATOMS[symbol]), recipe.id);
    }
});

test('元素ごとの個数が等しいときに限り一致する', () => {
    assert.ok(isCompositionMatch({ H: 2, O: 1 }, { O: 1, H: 2 }));
    assert.equal(isCompositionMatch({ H: 2, O: 1 }, { H: 2, O: 2 }), false);
    assert.equal(isCompositionMatch({ H: 2 }, { H: 2, O: 0 }), false);
});

test('ステージの全正答係数で各元素数が保存される', () => {
    for (const stage of BALANCE_STAGES) {
        const left = calculateSideAtomTotals(stage.reactants, stage.reactants.map(r => r.targetCoeff));
        const right = calculateSideAtomTotals(stage.products, stage.products.map(r => r.targetCoeff));
        assert.deepEqual(left, right, 'ステージ '+stage.id);
        const all = [...stage.reactants, ...stage.products].map(r => r.targetCoeff);
        assert.equal(all.reduce((a, b) => gcd(a, b)), 1, 'ステージ '+stage.id+' の係数を既約にする');
        assert.ok(all.every(c => Number.isInteger(c) && c >= 1 && c <= 6), 'ステージ '+stage.id);
    }
});

test('入力件数ゼロと公約数の計算', () => {
    assert.deepEqual(getCompositionCounts([]), {});
    assert.deepEqual(calculateSideAtomTotals([], []), {});
    assert.equal(gcd(6, 4), 2);
    assert.equal(gcd(3, 2), 1);
});
