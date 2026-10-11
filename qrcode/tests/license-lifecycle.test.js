'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const KEY = 'PRO-ABCD-EFGH';
const PLAN_STORAGE_KEY = 'qr_forge_lab_plan';
const LICENSE_STORAGE_KEY = 'qr_forge_lab_license';

function section(start, end) {
  const from = script.indexOf(start);
  const to = script.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `ライセンス処理が見つかりません: ${start}`);
  return script.slice(from, to);
}

// 製品コードの判定・保存処理をそのまま実行する。DOMと通信のみ代替し、実決済は行わない。
function createHarness({ config = {}, storedPlan = 'pro', storedKey = KEY } = {}) {
  const storage = new Map([[PLAN_STORAGE_KEY, storedPlan], [LICENSE_STORAGE_KEY, storedKey]]);
  const state = { licenseKey: storedKey, logoImage: null, logoDataUrl: '' };
  const requests = [];
  let status = '';
  const scope = {
    state, URL, AbortController, setTimeout, clearTimeout,
    PLAN_STORAGE_KEY, LICENSE_STORAGE_KEY, DEFAULT_PLAN: 'free',
    VALID_LICENSE_PATTERN: /^PRO-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
    window: {
      location: { origin: 'https://example.test' },
      __QR_PRO_CONFIG__: { licenseApiUrl: 'https://example.test/verify-license', ...config }
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    els: { licenseKeyInput: { value: storedKey }, applyLicenseBtn: { disabled: false } },
    isProPlan: () => state.currentPlan === 'pro',
    hasLogo: () => false,
    canUseLocalLicenseFallback: () => state.runtimeConfig.allowLocalLicenseFallback,
    sanitizeTemplateValue: (value) => value.trim(),
    t: (key) => key,
    setPlanStatus: (value) => { status = value; },
    syncPlanInputs: () => { scope.els.licenseKeyInput.value = state.licenseKey; },
    syncProFeatureLock() {}, guardFormatByPlan() {}, updateDownloadLabel() {},
    updateFileNamePreview() {}, updateQR() {},
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => ({ valid: true }) };
    }
  };
  vm.runInNewContext(
    section('  const getRuntimeConfig =', '  const detectLicenseKey =')
    + section('  const savePlanState =', '  const savePresets =')
    + section('  const setPlan =', '  const guardFormatByPlan =')
    + '\nglobalThis.api = { getRuntimeConfig, detectInitialPlan, applyLicense, reconcileStoredLicense };',
    scope
  );
  state.runtimeConfig = scope.api.getRuntimeConfig();
  state.currentPlan = scope.api.detectInitialPlan(state.runtimeConfig, storedKey);
  return { scope, state, storage, requests, api: scope.api, status: () => status };
}

for (const strictVerification of [true, false]) {
  test(`保存済みProの起動時復元はstrictVerification=${strictVerification}に従う`, async () => {
    const h = createHarness({ config: { strictVerification } });
    assert.equal(h.state.currentPlan, strictVerification ? 'free' : 'pro');
    await h.api.reconcileStoredLicense();
    assert.equal(h.state.currentPlan, 'pro');
    assert.equal(h.storage.get(LICENSE_STORAGE_KEY), KEY);
    assert.equal(h.requests.length, 1);
    const request = h.requests[0];
    assert.equal(request.options.credentials, 'omit');
    assert.deepEqual(JSON.parse(request.options.body), {
      licenseKey: KEY, product: 'qrcode', origin: 'https://example.test'
    });
  });

  for (const method of ['applyLicense', 'reconcileStoredLicense']) {
    for (const reason of ['not_found', 'expired', 'inactive']) {
      test(`${method}: ${reason}では猶予設定に関係なくProと保存キーを解除する (${strictVerification})`, async () => {
        const h = createHarness({ config: { strictVerification } });
        h.scope.fetch = async () => ({ ok: true, json: async () => ({ valid: false, reason }) });
        await h.api[method]();
        assert.equal(h.state.currentPlan, 'free');
        assert.equal(h.state.licenseKey, '');
        assert.equal(h.storage.has(LICENSE_STORAGE_KEY), false);
        assert.equal(h.status(), 'pro.statusRevoked');
      });
    }

    for (const failure of ['network', 'http', 'json']) {
      test(`${method}: ${failure}失敗はキーを保持し復旧後に再試行できる (${strictVerification})`, async () => {
        const h = createHarness({ config: { strictVerification } });
        h.scope.fetch = async () => {
          if (failure === 'network') throw new Error('offline');
          return { ok: failure !== 'http', json: async () => { throw new Error('invalid JSON'); } };
        };
        await h.api[method]();
        assert.equal(h.state.currentPlan, strictVerification ? 'free' : 'pro');
        assert.equal(h.storage.get(LICENSE_STORAGE_KEY), KEY);
        assert.equal(h.status(), 'pro.statusVerifyFailed');
        assert.equal(h.scope.els.applyLicenseBtn.disabled, false);
        h.scope.fetch = async () => ({ ok: true, json: async () => ({ valid: true }) });
        await h.api.applyLicense();
        assert.equal(h.state.currentPlan, 'pro');
        assert.equal(h.storage.get(PLAN_STORAGE_KEY), 'pro');
      });
    }

    for (const licenseApiUrl of ['', 'http://[invalid']) {
      test(`${method}: API未設定・不正URLではProを閉じ、キーを保持する (${strictVerification}, ${licenseApiUrl})`, async () => {
        const h = createHarness({ config: { strictVerification, licenseApiUrl } });
        await h.api[method]();
        assert.equal(h.state.currentPlan, 'free');
        assert.equal(h.storage.get(PLAN_STORAGE_KEY), 'free');
        assert.equal(h.storage.get(LICENSE_STORAGE_KEY), KEY);
        assert.equal(h.scope.els.licenseKeyInput.value, KEY);
        assert.equal(h.status(), 'pro.statusUnavailable');
        assert.equal(h.requests.length, 0);
        h.state.runtimeConfig.licenseApiUrl = 'https://example.test/verify-license';
        await h.api.applyLicense();
        assert.equal(h.state.currentPlan, 'pro');
      });
    }
  }
}

test('API未設定時の新規入力キーも保存し、再読み込み後に復旧できる', async () => {
  const h = createHarness({ config: { licenseApiUrl: '' }, storedPlan: 'free', storedKey: '' });
  h.scope.els.licenseKeyInput.value = KEY.toLowerCase();
  await h.api.applyLicense();
  assert.equal(h.state.currentPlan, 'free');
  assert.equal(h.storage.get(LICENSE_STORAGE_KEY), KEY);
  const reloaded = createHarness({
    storedPlan: h.storage.get(PLAN_STORAGE_KEY), storedKey: h.storage.get(LICENSE_STORAGE_KEY)
  });
  await reloaded.api.reconcileStoredLicense();
  assert.equal(reloaded.state.currentPlan, 'pro');
});

test('API応答のboolean true以外は新規・保存済みProを有効化しない', async () => {
  for (const strictVerification of [true, false]) {
    for (const method of ['applyLicense', 'reconcileStoredLicense']) {
      for (const payload of [null, {}, { valid: false }, { valid: 'true' }, { valid: 'false' }, { valid: 1 }]) {
        const h = createHarness({ config: { strictVerification } });
        h.scope.fetch = async () => ({ ok: true, json: async () => payload });
        await h.api[method]();
        assert.equal(h.state.currentPlan, 'free');
        assert.equal(h.storage.has(LICENSE_STORAGE_KEY), false);
      }
    }
  }
});

test('明示的なローカルfallbackは維持し、APIがある場合は失効判定を優先する', async () => {
  const h = createHarness({ config: { licenseApiUrl: '', allowLocalLicenseFallback: true } });
  assert.equal(h.state.currentPlan, 'pro');
  await h.api.applyLicense();
  assert.equal(h.state.currentPlan, 'pro');
  assert.equal(h.requests.length, 0);
  h.state.runtimeConfig.licenseApiUrl = 'https://example.test/verify-license';
  h.scope.fetch = async () => ({ ok: true, json: async () => ({ valid: false, reason: 'inactive' }) });
  await h.api.reconcileStoredLicense();
  assert.equal(h.state.currentPlan, 'free');
});

test('通信失敗では無料ユーザーをProへ昇格させず、不正形式は送信しない', async () => {
  const h = createHarness({ config: { strictVerification: false }, storedPlan: 'free', storedKey: '' });
  h.scope.els.licenseKeyInput.value = 'invalid';
  await h.api.applyLicense();
  assert.equal(h.requests.length, 0);
  assert.equal(h.status(), 'pro.statusInvalid');
  h.scope.els.licenseKeyInput.value = KEY;
  h.scope.fetch = async () => { throw new Error('offline'); };
  await h.api.applyLicense();
  assert.equal(h.state.currentPlan, 'free');
  assert.equal(h.storage.get(LICENSE_STORAGE_KEY), KEY);
});

test('strict起動時は再検証が未完了の間Proを有効化しない', async () => {
  const h = createHarness();
  let finish;
  h.scope.fetch = () => new Promise((resolve) => { finish = resolve; });
  const pending = h.api.reconcileStoredLicense();
  assert.equal(h.state.currentPlan, 'free');
  assert.equal(h.storage.get(LICENSE_STORAGE_KEY), KEY);
  finish({ ok: true, json: async () => ({ valid: true }) });
  await pending;
  assert.equal(h.state.currentPlan, 'pro');
});

test('明示的な手動プラン切替設定の初期復元は維持する', () => {
  const h = createHarness({ config: { allowManualPlanSwitch: true }, storedKey: '' });
  assert.equal(h.state.currentPlan, 'pro');
});
