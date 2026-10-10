/**
 * 初回デモだけが表示されているときに空の保存状態を書かない。
 */
export function shouldPersistTaskState({ persistableCount = 0, userMutated = false } = {}) {
  const count = Number(persistableCount);
  if (Number.isFinite(count) && count > 0) return true;
  return userMutated === true;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { shouldPersistTaskState };
}
