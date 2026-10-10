const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createRenderer() {
    const pending = new Map();
    let nextId = 0;
    let frames = 0;
    const source = fs.readFileSync(path.join(__dirname, '..', 'canvas-renderer.js'), 'utf8')
        .replace(/^import .*;\r?\n/gm, '')
        .replace('export const CanvasMap', 'const CanvasMap');
    const context = vm.createContext({
        State: { isDragging: false, scrollVelocity: 0, hoveredPlanet: null },
        UI: { DOM: { canvas: { style: {} } } },
        requestAnimationFrame(callback) { pending.set(++nextId, callback); return nextId; },
        cancelAnimationFrame(id) { pending.delete(id); }
    });
    vm.runInContext(`${source}\nglobalThis.renderer = CanvasMap;`, context);
    context.renderer.drawFrame = () => { frames += 1; };
    return {
        renderer: context.renderer,
        pending,
        frames: () => frames,
        flush() {
            const callbacks = [...pending.values()];
            pending.clear();
            callbacks.forEach(callback => callback());
        }
    };
}

test('一時停止と即時再開を繰り返しても描画ループは1本に保つ', () => {
    const runtime = createRenderer();
    runtime.renderer.startLoop();
    for (let i = 0; i < 5; i++) {
        runtime.renderer.pause();
        assert.equal(runtime.pending.size, 0);
        runtime.renderer.play();
        assert.equal(runtime.pending.size, 1);
    }
    const before = runtime.frames();
    runtime.flush();
    assert.equal(runtime.frames(), before + 1);
    assert.equal(runtime.pending.size, 1);
});

test('開始の重複呼び出しと停止後のフレームを安全に扱う', () => {
    const runtime = createRenderer();
    runtime.renderer.play();
    runtime.renderer.play();
    assert.equal(runtime.frames(), 1);
    assert.equal(runtime.pending.size, 1);
    runtime.renderer.pause();
    runtime.renderer.pause();
    runtime.flush();
    assert.equal(runtime.frames(), 1);
    assert.equal(runtime.pending.size, 0);
});

