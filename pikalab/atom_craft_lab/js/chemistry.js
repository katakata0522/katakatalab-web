// 副作用のない化学式・組成の計算関数
export function getCompositionCounts(atomList) {
    const counts = {};
    for (let i = 0; i < atomList.length; i++) {
        const sym = atomList[i];
        counts[sym] = (counts[sym] || 0) + 1;
    }
    return counts;
}

export function isCompositionMatch(compA, compB) {
    const keysA = Object.keys(compA);
    const keysB = Object.keys(compB);
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i++) {
        const key = keysA[i];
        if (compA[key] !== compB[key]) return false;
    }
    return true;
}

export function calculateSideAtomTotals(items, coeffs) {
    const totals = {};
    for (let idx = 0; idx < items.length; idx++) {
        const c = coeffs[idx];
        const atoms = items[idx].atoms;
        for (const sym of Object.keys(atoms)) {
            totals[sym] = (totals[sym] || 0) + atoms[sym] * c;
        }
    }
    return totals;
}

export function gcd(a, b) {
    let x = a;
    let y = b;
    while (y !== 0) {
        const next = x % y;
        x = y;
        y = next;
    }
    return x;
}
