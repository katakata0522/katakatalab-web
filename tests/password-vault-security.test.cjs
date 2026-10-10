const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto, randomUUID } = require('node:crypto');

const VAULT_PATH = path.join(__dirname, '..', 'password-generator', 'vault.js');
const VAULT_STORAGE_KEY = 'password-gen-vault';
const VAULT_SALT_KEY = 'password-gen-vault-salt';
const MASTER_PASSWORD = 'Correct-Horse-Battery-Staple-2026!';

function createMemoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial).map(([key, value]) => [String(key), String(value)]));

  return {
    getItem(key) {
      return data.has(String(key)) ? data.get(String(key)) : null;
    },
    setItem(key, value) {
      data.set(String(key), String(value));
    },
    removeItem(key) {
      data.delete(String(key));
    },
    snapshot() {
      return Object.fromEntries(data.entries());
    },
  };
}

function loadPasswordVault(storage) {
  const source = fs.readFileSync(VAULT_PATH, 'utf8');
  // vault.js is an ES module in production. The class is also intentionally
  // exposed on globalThis for browser consumers, so remove only its terminal
  // ESM export when executing it in a classic VM test context.
  const executableSource = source.replace(/^\s*export\s*\{\s*PasswordVault\s*\};?\s*$/m, '');
  assert.notEqual(executableSource, source, 'PasswordVaultのES Module export形式が変わったためテストローダーの更新が必要です');

  const browserCrypto = {
    subtle: webcrypto.subtle,
    getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
    randomUUID,
  };
  const context = vm.createContext({
    console,
    crypto: browserCrypto,
    localStorage: storage,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Date,
    JSON,
  });

  vm.runInContext(executableSource, context, { filename: VAULT_PATH });
  assert.equal(typeof context.PasswordVault, 'function', 'PasswordVaultがglobalThisへ公開されていません');

  return {
    PasswordVault: context.PasswordVault,
    source,
  };
}

let encryptedFixture;
let exportedFixture;

test.before(async () => {
  const storage = createMemoryStorage();
  const { PasswordVault } = loadPasswordVault(storage);
  const vault = new PasswordVault();

  await vault.setup(MASTER_PASSWORD);
  await vault.addEntry({
    siteName: 'example.com',
    password: 'S3cure-password!',
    category: 'work',
    fields: [
      { label: 'user', value: 'katakata' },
      { label: 'memo', value: 'regression fixture' },
    ],
  });

  encryptedFixture = storage.snapshot();
  exportedFixture = vault.exportEncrypted();
});

test('暗号化パラメータを意図せず弱体化しない', () => {
  const source = fs.readFileSync(VAULT_PATH, 'utf8');

  assert.match(source, /KDF_ITERATIONS\s*=\s*600000/);
  assert.match(source, /hash:\s*['"]SHA-256['"]/);
  assert.match(source, /name:\s*['"]AES-GCM['"],\s*length:\s*256/);
  assert.match(source, /getRandomValues\(new Uint8Array\(16\)\)/);
  assert.match(source, /getRandomValues\(new Uint8Array\(12\)\)/);
});

test('暗号化→ロック→正しいマスターパスワードで復号できる', async () => {
  const storage = createMemoryStorage(encryptedFixture);
  const { PasswordVault } = loadPasswordVault(storage);
  const vault = new PasswordVault();

  assert.equal(vault.exists(), true);
  assert.equal(await vault.unlock(MASTER_PASSWORD), true);
  assert.equal(vault.isUnlocked, true);

  const entries = JSON.parse(JSON.stringify(vault.entries));
  assert.equal(entries.length, 1);
  assert.equal(entries[0].siteName, 'example.com');
  assert.equal(entries[0].password, 'S3cure-password!');
  assert.deepEqual(entries[0].fields, [
    { label: 'user', value: 'katakata' },
    { label: 'memo', value: 'regression fixture' },
  ]);
});

test('誤ったマスターパスワードでは復号せずロック状態を維持する', async () => {
  const storage = createMemoryStorage(encryptedFixture);
  const { PasswordVault } = loadPasswordVault(storage);
  const vault = new PasswordVault();

  assert.equal(await vault.unlock('Definitely-Wrong-Password-2026!'), false);
  assert.equal(vault.isUnlocked, false);
  assert.deepEqual(Array.from(vault.entries), []);
});

test('暗号文が1文字でも改ざんされた場合は復号を拒否する', async () => {
  const tampered = { ...encryptedFixture };
  const encrypted = JSON.parse(tampered[VAULT_STORAGE_KEY]);
  const replacement = encrypted.ct[0] === '0' ? '1' : '0';
  encrypted.ct = replacement + encrypted.ct.slice(1);
  tampered[VAULT_STORAGE_KEY] = JSON.stringify(encrypted);

  const storage = createMemoryStorage(tampered);
  const { PasswordVault } = loadPasswordVault(storage);
  const vault = new PasswordVault();

  assert.equal(await vault.unlock(MASTER_PASSWORD), false);
  assert.equal(vault.isUnlocked, false);
});

test('壊れたIVやsaltは暗号処理に渡す前に拒否する', async () => {
  const badIv = { ...encryptedFixture };
  const encrypted = JSON.parse(badIv[VAULT_STORAGE_KEY]);
  encrypted.iv = '00';
  badIv[VAULT_STORAGE_KEY] = JSON.stringify(encrypted);

  {
    const storage = createMemoryStorage(badIv);
    const { PasswordVault } = loadPasswordVault(storage);
    const vault = new PasswordVault();
    await assert.rejects(() => vault.unlock(MASTER_PASSWORD), /暗号化データ形式が不正/);
  }

  {
    const badSalt = { ...encryptedFixture, [VAULT_SALT_KEY]: 'not-hex' };
    const storage = createMemoryStorage(badSalt);
    const { PasswordVault } = loadPasswordVault(storage);
    const vault = new PasswordVault();
    await assert.rejects(() => vault.unlock(MASTER_PASSWORD), /ソルトが不正/);
  }
});

test('暗号化export/importは平文に戻さず移送でき、import後は必ずロックされる', () => {
  const destination = createMemoryStorage();
  const { PasswordVault } = loadPasswordVault(destination);
  const vault = new PasswordVault();

  vault.importEncrypted(exportedFixture);

  assert.equal(vault.isUnlocked, false);
  assert.equal(vault.exists(), true);
  assert.deepEqual(JSON.parse(vault.exportEncrypted()), JSON.parse(exportedFixture));
  assert.doesNotMatch(vault.exportEncrypted(), /S3cure-password!/);
  assert.doesNotMatch(vault.exportEncrypted(), /katakata/);
});

test('短すぎるマスターパスワードと不正なimport形式を拒否する', async () => {
  const storage = createMemoryStorage();
  const { PasswordVault } = loadPasswordVault(storage);
  const vault = new PasswordVault();

  await assert.rejects(() => vault.setup('too-short'), /12文字以上/);
  assert.throws(() => vault.importEncrypted('not-json'), /JSON形式が不正/);
  assert.throws(
    () => vault.importEncrypted(JSON.stringify({ salt: 'zz', data: { iv: '00', ct: '00' } })),
    /ソルト形式が不正/,
  );
});
