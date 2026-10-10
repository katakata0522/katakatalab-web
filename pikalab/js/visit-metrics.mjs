export function countVisitedLabs(badgeIds, appIds) {
    const validIds = appIds instanceof Set ? appIds : new Set(Array.isArray(appIds) ? appIds : []);
    const visited = new Set();

    if (!Array.isArray(badgeIds)) return 0;
    for (const id of badgeIds) {
        if (typeof id === 'string' && validIds.has(id)) {
            visited.add(id);
        }
    }
    return visited.size;
}
