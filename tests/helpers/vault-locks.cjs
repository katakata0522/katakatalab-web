// Per-storage simulated origin-wide Web Locks, shared by independent VM tabs.
const managers = new WeakMap();
module.exports = function vaultLocks(storage) {
  if (!managers.has(storage)) {
    let tail = Promise.resolve();
    managers.set(storage, { request(name, callback) {
      const next = tail.then(callback);
      tail = next.catch(() => {});
      return next;
    } });
  }
  return { locks: managers.get(storage) };
};
