(function exposeProjectHistory(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.KatakataProjectHistory = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, (root) => {
  const STORAGE_KEY = 'katakatalab.recent-projects.v1';
  const MAX_RECENT_PROJECTS = 3;
  const PROJECT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function getDefaultStorage() {
    try {
      return root.localStorage;
    } catch (error) {
      return null;
    }
  }

  function normalizeProjectIds(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value
      .filter((id) => typeof id === 'string' && PROJECT_ID_PATTERN.test(id)))]
      .slice(0, MAX_RECENT_PROJECTS);
  }

  function readRecentProjectIds(storage = getDefaultStorage()) {
    if (!storage) return [];
    try {
      return normalizeProjectIds(JSON.parse(storage.getItem(STORAGE_KEY) || '[]'));
    } catch (error) {
      return [];
    }
  }

  function writeRecentProjectIds(storage, ids) {
    if (!storage) return ids;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
      return readRecentProjectIds(storage);
    }
    return ids;
  }

  function recordRecentProject(storageOrProjectId = getDefaultStorage(), projectId) {
    const storage = projectId === undefined && typeof storageOrProjectId === 'string'
      ? getDefaultStorage()
      : storageOrProjectId;
    const normalizedProjectId = projectId === undefined && typeof storageOrProjectId === 'string'
      ? storageOrProjectId
      : projectId;
    if (!storage || typeof normalizedProjectId !== 'string' || !PROJECT_ID_PATTERN.test(normalizedProjectId)) {
      return readRecentProjectIds(storage);
    }
    const ids = [normalizedProjectId, ...readRecentProjectIds(storage).filter((id) => id !== normalizedProjectId)]
      .slice(0, MAX_RECENT_PROJECTS);
    return writeRecentProjectIds(storage, ids);
  }

  function clearRecentProjects(storage = getDefaultStorage()) {
    if (!storage) return [];
    try {
      storage.removeItem(STORAGE_KEY);
    } catch (error) {
      return readRecentProjectIds(storage);
    }
    return [];
  }

  return {
    STORAGE_KEY,
    MAX_RECENT_PROJECTS,
    readRecentProjectIds,
    recordRecentProject,
    clearRecentProjects,
  };
}));

/* Homepage-only additive presentation layer is disabled to unify navigation directly to tools. */

