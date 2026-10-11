const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto, randomUUID } = require('node:crypto');

const VAULT_PATH = path.join(__dirname, '..', 'password-generator', 'vault.js');
const VAULT_STORAGE_KEY = 'password-gen-vault';
const VAULT_SALT_KEY = 'password-gen-vault-salt';
const MASTER_PASSWORD = 'Storage-Failure-Test-Password-2026!';

function createFailingStorage(initial = {}) {
  const data = new Map(Object.entries(initial).map(([key, value]) => [String(key), String(value)]));
  const failingSetKeys = new Set();
  const failingRemoveKeys = new Set();

  return {
    getItem(key) {
      return data.has(String(key)) ? data.get(String(key)) : null;
    },
    setItem(key, value) {
      const normalizedKey = String(key);
      if (failingSetKeys.has(normalizedKey)) throw new Error('simulated setItem failure');
      data.set(normalizedKey, String(value));
    },
    removeItem(key) {
      const normalizedKey = String(key);
      if (failingRemoveKeys.has(normalizedKey)) throw new Error('simulated removeItem failure');
      data.delete(normalizedKey);
    },
    failSet(key) { failingSetKeys.add(String(key)); },
    allowSet(key) { failingSetKeys.delete(String(key)); },
    failRemove(key) { failingRemoveKeys.add(String(key)); },
    allowRemove(key) { failingRemoveKeys.delete(String(key)); },
    snapshot() { return Object.fromEntries(data.entries()); },
  };
}

function loadPasswordVault(storage) {
  const rawSource = fs.readFileSync(VAULT_PATH, 'utf8');
  const source = rawSource.replace(/\nexport\s*\{\s*PasswordVault\s*\};?\s*$/m, '\n');
  const browserCrypto = {
    subtle: webcrypto.subtle,
    getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
    randomUUID,
  };
  const context = vm.createContext({
    console,
    crypto: browserCrypto,
    localStorage: storage,
    navigator: require('./helpers/vault-locks.cjs')(storage),
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Date,
    JSON,
  });
  vm.runInContext(source, context, { filename: VAULT_PATH });
  return context.PasswordVault;
}

async function setupVault(storage, withEntry = false) {
  const PasswordVault = loadPasswordVault(storage);
  const vault = new PasswordVault();
  await vault.setup(MASTER_PASSWORD);
  if (withEntry) {
    await vault.addEntry({
      siteName: 'before.example',
      password: 'before-password',
      category: 'work',
      fields: [{ label: 'user', value: 'before-user' }],
    });
  }
  return vault;
}

test('初回作成でstorage保存に失敗したら半端なボールトを残さずロック状態へ戻す', async () => {
  const storage = createFailingStorage();
  storage.failSet(VAULT_STORAGE_KEY);
  const PasswordVault = loadPasswordVault(storage);
  const vault = new PasswordVault();

  await assert.rejects(() => vault.setup(MASTER_PASSWORD), /保存に失敗|作成に失敗/);
  assert.equal(vault.isUnlocked, false);
  assert.deepEqual(storage.snapshot(), {});
});

test('追加保存に失敗したらメモリ上の追加もロールバックする', async () => {
  const storage = createFailingStorage();
  const vault = await setupVault(storage);
  const beforeStorage = storage.snapshot();

  storage.failSet(VAULT_STORAGE_KEY);
  await assert.rejects(
    () => vault.addEntry({ siteName: 'new.example', password: 'new-password' }),
    /保存に失敗/,
  );

  assert.equal(vault.entries.length, 0);
  assert.deepEqual(storage.snapshot(), beforeStorage);
  assert.equal(vault.isUnlocked, true);
});

test('更新保存に失敗したら元の値をメモリとstorageの両方で維持する', async () => {
  const storage = createFailingStorage();
  const vault = await setupVault(storage, true);
  const entryId = vault.entries[0].id;
  const beforeStorage = storage.snapshot();

  storage.failSet(VAULT_STORAGE_KEY);
  await assert.rejects(
    () => vault.updateEntry(entryId, { siteName: 'after.example', password: 'after-password' }),
    /保存に失敗/,
  );

  assert.equal(vault.entries[0].siteName, 'before.example');
  assert.equal(vault.entries[0].password, 'before-password');
  assert.deepEqual(storage.snapshot(), beforeStorage);
});

test('削除保存に失敗したらエントリを消したことにしない', async () => {
  const storage = createFailingStorage();
  const vault = await setupVault(storage, true);
  const entryId = vault.entries[0].id;
  const beforeStorage = storage.snapshot();

  storage.failSet(VAULT_STORAGE_KEY);
  await assert.rejects(() => vault.deleteEntry(entryId), /保存に失敗/);

  assert.equal(vault.entries.length, 1);
  assert.equal(vault.entries[0].siteName, 'before.example');
  assert.deepEqual(storage.snapshot(), beforeStorage);
});

test('import途中で保存に失敗したら既存ボールトを壊さず解除状態も維持する', async () => {
  const sourceStorage = createFailingStorage();
  const sourceVault = await setupVault(sourceStorage, true);
  const importedPayload = sourceVault.exportEncrypted();

  const destinationStorage = createFailingStorage();
  const destinationVault = await setupVault(destinationStorage, true);
  const beforeStorage = destinationStorage.snapshot();
  const beforeEntry = destinationVault.entries[0];

  destinationStorage.failSet(VAULT_STORAGE_KEY);
  await assert.rejects(() => destinationVault.importEncrypted(importedPayload, MASTER_PASSWORD), /インポートに失敗/);

  assert.deepEqual(destinationStorage.snapshot(), beforeStorage);
  assert.equal(destinationVault.isUnlocked, true);
  assert.equal(destinationVault.entries.length, 1);
  assert.equal(destinationVault.entries[0].id, beforeEntry.id);
});

test('destroyの途中失敗では既存データと解除状態を維持する', async () => {
  const storage = createFailingStorage();
  const vault = await setupVault(storage, true);
  const beforeStorage = storage.snapshot();

  storage.failRemove(VAULT_SALT_KEY);
  await assert.rejects(() => vault.destroy(), /削除に失敗/);

  assert.deepEqual(storage.snapshot(), beforeStorage);
  assert.equal(vault.isUnlocked, true);
  assert.equal(vault.entries.length, 1);
});
