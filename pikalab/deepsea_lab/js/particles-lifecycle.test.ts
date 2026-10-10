import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface WorkerMessage { type: string; payload?: Record<string, unknown> }

describe('マリンスノーの描画ループ', () => {
    let worker: { onmessage?: (event: { data: WorkerMessage }) => void };
    let frames: Map<number, FrameRequestCallback>;
    let nextFrame: number;
    let canvas: { width: number; height: number; getContext: () => unknown };

    beforeEach(async () => {
        vi.resetModules();
        worker = {};
        frames = new Map();
        nextFrame = 0;
        canvas = {
            width: 0, height: 0,
            getContext: () => ({ clearRect() {}, beginPath() {}, arc() {}, fill() {}, fillStyle: '' })
        };
        vi.stubGlobal('self', worker);
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
            const id = ++nextFrame;
            frames.set(id, callback);
            return id;
        });
        vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
        await import('./particles.worker');
    });

    afterEach(() => vi.unstubAllGlobals());
    const send = (data: WorkerMessage) => worker.onmessage?.({ data });

    it('次のフレームより前に一時停止・再開してもループが増えない', () => {
        send({ type: 'INIT', payload: { canvas, width: 390, height: 844 } });
        expect(frames.size).toBe(1);
        for (let index = 0; index < 10; index++) {
            send({ type: 'PAUSE' });
            expect(frames.size).toBe(0);
            send({ type: 'PLAY' });
            send({ type: 'PLAY' });
            expect(frames.size).toBe(1);
        }
        const [id, callback] = [...frames.entries()][0];
        frames.delete(id);
        callback(16);
        expect(frames.size).toBe(1);
    });

    it('初期化を再受信しても描画予約はひとつだけにする', () => {
        send({ type: 'INIT', payload: { canvas, width: 390, height: 844 } });
        send({ type: 'INIT', payload: { canvas, width: 390, height: 844 } });
        expect(frames.size).toBe(1);
        send({ type: 'PAUSE' });
        send({ type: 'PAUSE' });
        expect(frames.size).toBe(0);
    });
});
