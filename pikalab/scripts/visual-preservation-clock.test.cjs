'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { blockServiceWorkerRegistration, createClockBootstrap } = require('./visual-preservation-core.cjs');

const fixedTime = Date.parse('2026-01-15T03:00:00.000Z');
const wallTime = Date.parse('2026-10-02T17:45:00.000Z');

// ブラウザを起動せず、導入→native timer→最初のアプリ参照までの全経路を再現する。
// ClockControllerだけのテストでは、inject内のresumeによる漏出を検出できない。
function documentRuntime() {
  let nativeTicks = 0;
  let nextId = 0;
  const pending = new Map();
  const sandbox = vm.createContext({
    console,
    Event: class Event {},
    performance: { now: () => nativeTicks },
    setTimeout(callback, delay) {
      const id = ++nextId;
      if (!delay) {
        const timer = setImmediate(() => { pending.delete(id); callback(); });
        pending.set(id, { cancel: () => clearImmediate(timer) });
      } else {
        pending.set(id, { callback, due: nativeTicks + delay, cancel() {} });
      }
      return id;
    },
    clearTimeout(id) { pending.get(id)?.cancel(); pending.delete(id); },
    setInterval() { throw new Error('native intervalは使わない'); },
    clearInterval() {}, requestAnimationFrame() {}, cancelAnimationFrame() {},
    requestIdleCallback() {}, cancelIdleCallback() {},
  });
  return {
    sandbox,
    read: code => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, sandbox)),
    pending,
    async elapse(ms) {
      nativeTicks += ms;
      for (const [id, timer] of [...pending]) {
        if (timer.due <= nativeTicks) { pending.delete(id); timer.callback(); }
      }
      await new Promise(resolve => setImmediate(resolve));
    },
  };
}

function installedClockSource() {
  const bundle = fs.readFileSync(require.resolve('playwright-core/lib/coreBundle'), 'utf8');
  const line = bundle.split('\n').find(value => value.trimStart().startsWith('source = ')
    && value.includes('packages/injected/src/clock.ts'));
  assert.ok(line, 'Playwrightのclock実装配置が変わりました');
  return vm.runInNewContext(line.trim().slice('source = '.length).replace(/;$/, ''));
}

test('旧pauseAt単独でもinjectのresumeが最初の時計参照より先にnative時間を進める', async () => {
  for (const wait of [100, 634, 1581]) {
    const runtime = documentRuntime();
    vm.runInContext(`const module = { exports: {} }; ${installedClockSource()}
      globalThis.legacy = module.exports.inject()(globalThis, 'chromium');
      legacy.controller.log('pauseAt', ${wallTime}, ${fixedTime});`, runtime.sandbox);
    await runtime.elapse(wait);
    assert.deepEqual(runtime.read('[Date.now(), performance.now(), performance.timeOrigin]'), [fixedTime, wait, fixedTime]);
  }
});

test('停止bootstrapは初回参照を遅延してもDate/performance/originを正規化しnative timerを作らない', async () => {
  for (const wait of [0, 3, 100, 634, 1581, 9000]) {
    const runtime = documentRuntime();
    vm.runInContext(createClockBootstrap({ fixedTime, seed: 42 }), runtime.sandbox);
    assert.equal(runtime.pending.size, 0);
    await runtime.elapse(wait);
    assert.deepEqual(runtime.read('[Date.now(), performance.now(), performance.timeOrigin]'), [fixedTime, 0, fixedTime]);
    assert.equal(runtime.pending.size, 0);
  }
});

test('実bootstrapのtimer・RAF・Event時刻が待ち時間によらず同じ絶対位相で進む', async () => {
  for (const wait of [0, 100, 1581]) {
    const runtime = documentRuntime();
    vm.runInContext(createClockBootstrap({ fixedTime, seed: 42 }), runtime.sandbox);
    await runtime.elapse(wait);
    vm.runInContext(`globalThis.frames = []; globalThis.timers = [];
      const frame = timestamp => { frames.push(timestamp); requestAnimationFrame(frame); };
      requestAnimationFrame(frame);
      setTimeout(() => timers.push([Date.now(), performance.now(), new Event().timeStamp]), 50);
      const cancelled = setTimeout(() => { throw new Error('取消timerが発火'); }, 30);
      clearTimeout(cancelled);`, runtime.sandbox);
    await vm.runInContext('__pikalabVisualClock.advanceTo(100)', runtime.sandbox);
    assert.deepEqual(runtime.read('frames'), [16, 32, 48, 64, 80, 96]);
    assert.deepEqual(runtime.read('timers'), [[fixedTime + 50, 50, 50]]);
    await runtime.elapse(2000);
    assert.deepEqual(runtime.read('[Date.now(), performance.now(), performance.timeOrigin]'), [fixedTime + 100, 100, fixedTime]);
    await vm.runInContext('__pikalabVisualClock.advanceTo(1000)', runtime.sandbox);
    assert.equal(runtime.read('frames.at(-1)'), 992);
    assert.equal(runtime.read('frames.length'), 62);
    assert.equal(runtime.read('performance.now()'), 1000);
    await assert.rejects(vm.runInContext('__pikalabVisualClock.advanceTo(999)', runtime.sandbox), /過去/);
  }
});

test('新しいframeも同じseed・初期時計から同じ撮影位相まで進められる', async () => {
  const samples = [];
  for (const wait of [0, 100, 4000]) {
    const runtime = documentRuntime();
    await runtime.elapse(wait);
    vm.runInContext(createClockBootstrap({ fixedTime, seed: 42 }), runtime.sandbox);
    await vm.runInContext('__pikalabVisualClock.advanceTo(1000)', runtime.sandbox);
    samples.push(runtime.read('[Date.now(), performance.now(), Math.random(), Math.random()]'));
  }
  assert.deepEqual(samples[0], samples[1]);
  assert.deepEqual(samples[1], samples[2]);
});

test('service worker登録停止はsandboxのnavigator getterに触れず、API不在でも安全', async () => {
  for (const supported of [true, false]) {
    let reads = 0;
    const navigator = Object.defineProperty({}, 'serviceWorker', { get() { reads += 1; throw new Error('SecurityError'); } });
    const sandbox = { navigator };
    if (supported) sandbox.ServiceWorkerContainer = class { register() { throw new Error('登録してはいけない'); } };
    vm.runInNewContext(`(${blockServiceWorkerRegistration.toString()})();`, sandbox);
    if (supported) assert.equal(await new sandbox.ServiceWorkerContainer().register('sw.js'), undefined);
    assert.equal(reads, 0);
  }
});

test('runnerは単一の停止bootstrapをgoto前に導入し、公開Clockの暗黙resumeを使わない', () => {
  const runner = fs.readFileSync(path.join(__dirname, 'visual-preservation.mjs'), 'utf8');
  assert.doesNotMatch(runner, /await page\.clock\./);
  assert.ok(runner.indexOf('await context.addInitScript({ content: createClockBootstrap(') < runner.indexOf('await page.goto('));
  assert.match(runner, /result\.initialClock\.performance !== 0/);
  assert.match(runner, /clock\.performance !== captureTicks/);
});
