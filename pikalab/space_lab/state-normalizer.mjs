const PLANET_IDS = new Set([
    'sun', 'mercury', 'venus', 'earth', 'mars',
    'jupiter', 'saturn', 'uranus', 'neptune'
]);
const SECRET_IDS = new Set([
    'blackhole', 'alien', 'outside', 'time', 'universe', 'darkmatter', 'exoplanet'
]);

function uniqueKnownStrings(value, allowedValues) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((item) => typeof item === 'string' && allowedValues.has(item)))];
}

export function normalizeSpaceLabState(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const solvedQuizzes = {};

    if (source.solvedQuizzes && typeof source.solvedQuizzes === 'object' && !Array.isArray(source.solvedQuizzes)) {
        for (const planetId of PLANET_IDS) {
            const solved = source.solvedQuizzes[planetId];
            if (!Array.isArray(solved)) continue;

            const indexes = [...new Set(solved.filter(
                (index) => Number.isInteger(index) && index >= 0 && index <= 2
            ))].sort((a, b) => a - b);
            if (indexes.length > 0) solvedQuizzes[planetId] = indexes;
        }
    }

    return {
        visited: uniqueKnownStrings(source.visited, PLANET_IDS),
        solvedQuizzes,
        readSecrets: uniqueKnownStrings(source.readSecrets, SECRET_IDS)
    };
}
