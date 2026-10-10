(function exposeProjectFilterState(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.KatakataProjectFilterState = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const DEFAULT_FILTER = 'all';
  const VALID_FILTERS = new Set(['all', 'learning', 'tool', 'story']);
  const MAX_QUERY_LENGTH = 80;
  const SHARE_QUERY_PARAM = 'tool_q';

  function sanitizeQuery(value) {
    return String(value ?? '')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim()
      .slice(0, MAX_QUERY_LENGTH);
  }

  function normalizeFilter(value) {
    return VALID_FILTERS.has(value) ? value : DEFAULT_FILTER;
  }

  function normalizeProjectSearchText(value) {
    return String(value ?? '')
      .normalize('NFKC')
      .toLocaleLowerCase('ja-JP')
      .replace(/[\u30a1-\u30f6]/g, (character) => (
        String.fromCharCode(character.charCodeAt(0) - 0x60)
      ))
      .replace(/[\s\p{P}\p{S}]+/gu, '');
  }

  function createProjectSearchCorpus(project = {}) {
    const aliases = Array.isArray(project.aliases) ? project.aliases : [];
    return normalizeProjectSearchText([
      project.title,
      project.text,
      project.detail,
      project.tagText,
      ...aliases,
    ].filter(Boolean).join(' '));
  }

  function levenshteinDistance(left, right) {
    const a = String(left);
    const b = String(right);
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;

    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let row = 1; row <= a.length; row += 1) {
      const current = [row];
      for (let column = 1; column <= b.length; column += 1) {
        const substitutionCost = a[row - 1] === b[column - 1] ? 0 : 1;
        current[column] = Math.min(
          current[column - 1] + 1,
          previous[column] + 1,
          previous[column - 1] + substitutionCost,
        );
      }
      previous = current;
    }
    return previous[b.length];
  }

  function getClosestSearchTermDistance(query, term) {
    if (!term) return Number.POSITIVE_INFINITY;
    if (term.includes(query) || query.includes(term)) return 0;

    let closest = levenshteinDistance(query, term);
    if (term.length > query.length) {
      for (let start = 0; start <= term.length - query.length; start += 1) {
        closest = Math.min(
          closest,
          levenshteinDistance(query, term.slice(start, start + query.length)),
        );
      }
    }
    return closest;
  }

  function getProjectSearchSuggestions(projects, query, limit = 3) {
    const normalizedQuery = normalizeProjectSearchText(sanitizeQuery(query));
    if (normalizedQuery.length < 2 || !Array.isArray(projects)) return [];

    const distanceLimit = normalizedQuery.length <= 4
      ? 1
      : Math.max(1, Math.floor(normalizedQuery.length * 0.25));
    const candidates = projects.map((project, index) => {
      const terms = [project.title, project.tagText]
        .concat(Array.isArray(project.aliases) ? project.aliases : [])
        .filter(Boolean)
        .map(normalizeProjectSearchText)
        .filter(Boolean);
      const distance = Math.min(
        ...terms.map((term) => getClosestSearchTermDistance(normalizedQuery, term)),
      );
      return {
        project,
        distance,
        score: distance * -100
          + (project.featured ? 2 : 0)
          + (project.group === 'primary' ? 1 : 0),
        index,
      };
    });

    return candidates
      .filter((candidate) => candidate.distance <= distanceLimit)
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .slice(0, Math.max(0, Number(limit) || 0))
      .map((candidate) => candidate.project);
  }

  function readProjectFilterState(search = '') {
    const params = new URLSearchParams(String(search).replace(/^\?/, ''));
    return {
      filter: normalizeFilter(params.get('shelf')),
      query: sanitizeQuery(params.get(SHARE_QUERY_PARAM) ?? params.get('q')),
    };
  }

  function buildProjectFilterUrl(sourceUrl, state = {}) {
    const url = new URL(sourceUrl, 'https://katakatalab.com/');
    const filter = normalizeFilter(state.filter);
    const query = sanitizeQuery(state.query);
    url.search = '';
    if (filter !== DEFAULT_FILTER) url.searchParams.set('shelf', filter);
    if (query) url.searchParams.set(SHARE_QUERY_PARAM, query);
    return url.toString();
  }

  return {
    DEFAULT_FILTER,
    MAX_QUERY_LENGTH,
    SHARE_QUERY_PARAM,
    normalizeFilter,
    normalizeProjectSearchText,
    createProjectSearchCorpus,
    getProjectSearchSuggestions,
    readProjectFilterState,
    buildProjectFilterUrl,
  };
}));
