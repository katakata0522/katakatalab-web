// 副作用のない化学式・組成の計算関数
export function getCompositionCounts(atomList) {
    const counts = {};
    atomList.forEach(sym => {
        counts[sym] = (counts[sym] || 0) + 1;
    });
    return counts;
}

export function isCompositionMatch(compA, compB) {
    const keysA = Object.keys(compA);
    const keysB = Object.keys(compB);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(k => compA[k] === compB[k]);
}

export function calculateSideAtomTotals(items, coeffs) {
    const totals = {};
    items.forEach((item, idx) => {
        const c = coeffs[idx];
        Object.entries(item.atoms).forEach(([sym, count]) => {
            totals[sym] = (totals[sym] || 0) + count * c;
        });
    });
    return totals;
}

export function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}
