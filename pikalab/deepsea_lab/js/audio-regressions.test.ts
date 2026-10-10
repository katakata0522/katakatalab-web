import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 音声・プロフィール本体は実装を使い、トップページだけの副作用を除く。
vi.mock('../../js/summer-homework.js', () => ({}));

type Listener = (event: { isTrusted: boolean; target: FakeElement }) => void;
class FakeElement {
    listeners = new Map<string, Set<Listener>>();
    attributes = new Map<string, string>();
    textContent = '';
    classes = new Set(['material-symbols-rounded', 'text-green-500', 'text-sm']);
    classList = { add: (value: string) => this.classes.add(value), remove: (value: string) => this.classes.delete(value) };
    parent: FakeElement | null = null;
    addEventListener(name: string, listener: Listener) {
        if (!this.listeners.has(name)) this.listeners.set(name, new Set());
        this.listeners.get(name)!.add(listener);
    }
    removeEventListener(name: string, listener: Listener) { this.listeners.get(name)?.delete(listener); }
    setAttribute(name: string, value: string) { this.attributes.set(name, value); }
    contains(target: FakeElement | null): boolean { return target === this || !!target?.parent && this.contains(target.parent); }
}
class FakeParam {
    value = 1;
    setValueAtTime = vi.fn((value: number) => { this.value = value; });
    linearRampToValueAtTime = vi.fn();
    exponentialRampToValueAtTime = vi.fn();
    setTargetAtTime = vi.fn((value: number) => { this.value = value; });
}
class FakeNode {
    gain = new FakeParam();
    frequency = new FakeParam();
    connect = vi.fn();
    disconnect = vi.fn();
    start = vi.fn();
    stop = vi.fn();
    onended: (() => void) | null = null;
    type = '';
    loop = false;
    buffer: unknown = null;
}
let contexts: FakeContext[];
let resumeResult: (() => Promise<void>) | null;
class FakeContext {
    state = 'suspended';
    currentTime = 12;
    sampleRate = 12;
    destination = new FakeNode();
    gains: FakeNode[] = [];
    sources: FakeNode[] = [];
    filters: FakeNode[] = [];
    oscillators: FakeNode[] = [];
    constructor() { contexts.push(this); }
    createGain() { const node = new FakeNode(); this.gains.push(node); return node; }
    createBuffer(_channels: number, size: number) { return { getChannelData: () => new Float32Array(size) }; }
    createBufferSource() { const node = new FakeNode(); this.sources.push(node); return node; }
    createBiquadFilter() { const node = new FakeNode(); this.filters.push(node); return node; }
    createOscillator() { const node = new FakeNode(); this.oscillators.push(node); return node; }
    resume = vi.fn(async () => { if (resumeResult) await resumeResult(); this.state = 'running'; });
    suspend = vi.fn(async () => { this.state = 'suspended'; });
    close = vi.fn(async () => { this.state = 'closed'; });
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

describe('DeepSeaの音声連携', () => {
    let doc: FakeElement & { hidden: boolean; getElementById: (id: string) => FakeElement | null; querySelectorAll: () => FakeElement[] };
    let button: FakeElement;
    let icon: FakeElement;
    let surface: FakeElement;
    let storage: Map<string, string>;
    let AudioController: typeof import('./components/AudioController').AudioController;
    let audio: typeof import('./audio');
    let eventBus: typeof import('./core/EventBus').eventBus;
    let controller: InstanceType<typeof AudioController> | undefined;

    beforeEach(async () => {
        vi.resetModules(); vi.useFakeTimers();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        contexts = []; resumeResult = null;
        button = new FakeElement(); icon = new FakeElement(); icon.parent = button; surface = new FakeElement();
        doc = Object.assign(new FakeElement(), {
            hidden: false,
            getElementById: (id: string) => id === 'btn-audio' ? button : id === 'sound-icon' ? icon : null,
            querySelectorAll: () => [icon]
        });
        storage = new Map();
        vi.stubGlobal('document', doc);
        vi.stubGlobal('window', { AudioContext: FakeContext });
        vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
        ({ AudioController } = await import('./components/AudioController'));
        audio = await import('./audio');
        ({ eventBus } = await import('./core/EventBus'));
    });
    afterEach(() => {
        controller?.dispose(); controller = undefined;
        vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
    });
    function click(target = surface, trusted = true) {
        const event = { target, isTrusted: trusted };
        doc.listeners.get('click')?.forEach(listener => listener(event));
        // 実際のブラウザと同じく、アイコンからボタンへバブリングする。
        let node: FakeElement | null = target;
        while (node) { node.listeners.get('click')?.forEach(listener => listener(event)); node = node.parent; }
    }
    function start() { controller = new AudioController(); return controller; }

    it('ページ表示や合成クリックではContextを作らず、保存済みのミュートと見た目を復元する', () => {
        storage.set('pikalab_profile_v1', JSON.stringify({ name: '海の探検家', isMuted: true, volumeDb: -12, loginCount: 8, badges: ['deepsea_lab'] }));
        start(); click(surface, false);
        expect(contexts).toHaveLength(0);
        expect(icon.textContent).toBe('volume_off');
        expect(icon.classes.has('text-slate-300')).toBe(true);
        expect(icon.classes.has('material-symbols-rounded')).toBe(true);
        expect(button.attributes.get('aria-pressed')).toBe('true');
        expect(button.attributes.get('aria-label')).toBe('音声をオンにする');
    });

    it('最初のクリックの共通効果音をresumeまで待ち、環境音と同じContextで鳴らす', async () => {
        let resolve!: () => void;
        resumeResult = () => new Promise<void>(done => { resolve = done; });
        start(); click(); audio.playSound('click');
        expect(contexts).toHaveLength(1);
        expect(contexts[0].sources).toHaveLength(1);
        expect(contexts[0].oscillators).toHaveLength(0);
        resolve(); await flush();
        expect(contexts[0].oscillators).toHaveLength(2);
        expect(contexts[0].sources[0].loop).toBe(true);
        expect(contexts[0].gains[2].gain.value).toBe(0.05);
    });

    it('初回にAUDIOを押して消音しても、一瞬の環境音や効果音を漏らさない', async () => {
        start(); click(icon); await flush();
        const context = contexts[0];
        expect(icon.textContent).toBe('volume_off');
        expect(context.gains[0].gain.value).toBe(0);
        expect(context.gains[1].gain.value).toBe(0);
        expect(context.oscillators).toHaveLength(0);
        controller!.playSonar(); audio.playSound('click');
        expect(context.oscillators).toHaveLength(0);
    });

    it('AUDIOで環境音・再生中のソナー・共通効果音をまとめて消音し、プロフィールを壊さず保存する', async () => {
        storage.set('pikalab_profile_v1', JSON.stringify({ name: '海の探検家', isMuted: false, volumeDb: -12, loginCount: 8, badges: ['deepsea_lab'] }));
        start(); click(); await flush(); controller!.playSonar();
        const context = contexts[0];
        const localOutput = context.gains[1];
        expect(context.gains[3].connect).toHaveBeenCalledWith(localOutput);
        click(icon); await flush();
        expect(localOutput.gain.value).toBe(0);
        expect(context.gains[0].gain.value).toBe(0);
        expect(icon.textContent).toBe('volume_off');
        expect(button.attributes.get('aria-pressed')).toBe('true');
        const count = context.oscillators.length;
        controller!.playSonar(); audio.playSound('click');
        expect(context.oscillators).toHaveLength(count);
        expect(JSON.parse(storage.get('pikalab_profile_v1')!)).toMatchObject({ name: '海の探検家', isMuted: true, loginCount: 8, volumeDb: -12, badges: ['deepsea_lab'] });
        click(button); await flush();
        expect(localOutput.gain.value).toBe(1);
        expect(context.gains[0].gain.value).toBeCloseTo(Math.pow(10, -12 / 40));
        expect(icon.textContent).toBe('volume_up');
        expect(contexts).toHaveLength(1);
        expect(context.sources).toHaveLength(1);
        expect(JSON.parse(storage.get('pikalab_profile_v1')!).isMuted).toBe(false);
    });

    it('起動前の深度を初期フィルターへ反映し、範囲外・不正な水深を防ぐ', async () => {
        start(); eventBus.emit('depth:changed', { depth: 5000 }); click(); await flush();
        const frequency = contexts[0].filters[0].frequency;
        expect(frequency.value).toBe(550);
        eventBus.emit('depth:changed', { depth: 10000 });
        expect(frequency.setTargetAtTime).toHaveBeenLastCalledWith(100, 12, 0.5);
        eventBus.emit('depth:changed', { depth: -500 }); expect(frequency.value).toBe(1000);
        eventBus.emit('depth:changed', { depth: 12000 }); expect(frequency.value).toBe(100);
        eventBus.emit('depth:changed', { depth: NaN }); expect(frequency.value).toBe(100);
    });

    it('起動失敗を処理し、次のユーザー操作で同じContextを再試行できる', async () => {
        resumeResult = () => Promise.reject(new Error('blocked'));
        start(); click(); audio.playSound('click'); await flush();
        expect(icon.textContent).toBe('volume_off');
        expect(contexts[0].gains[1].gain.value).toBe(0);
        resumeResult = null;
        click(button); audio.playSound('click'); await flush();
        expect(contexts).toHaveLength(1);
        expect(contexts[0].sources).toHaveLength(1);
        expect(contexts[0].state).toBe('running');
        expect(contexts[0].oscillators).toHaveLength(2);
        expect(contexts[0].gains[1].gain.value).toBe(1);
    });

    it('非表示中の復帰・ソナーを抑え、表示復帰時もミュートを維持する', async () => {
        start(); click(); await flush(); click(button); await flush();
        const context = contexts[0];
        doc.hidden = true; controller!.suspend(); await flush();
        context.resume.mockClear(); controller!.resume(); controller!.playSonar(); audio.playSound('click'); click();
        expect(context.resume).not.toHaveBeenCalled();
        expect(context.state).toBe('suspended');
        doc.hidden = false; controller!.resume(); await flush();
        expect(context.state).toBe('running');
        expect(context.gains[1].gain.value).toBe(0);
        expect(context.gains[0].gain.value).toBe(0);
    });

    it('破棄時に全リスナーとローカル音源だけを外し、共通Contextを閉じない', async () => {
        start(); click(); await flush();
        const context = contexts[0];
        controller!.dispose(); controller!.dispose();
        expect(context.sources[0].stop).toHaveBeenCalledTimes(1);
        expect(context.gains[1].disconnect).toHaveBeenCalledTimes(1);
        expect(context.close).not.toHaveBeenCalled();
        expect(doc.listeners.get('click')?.size).toBe(0);
        expect(doc.listeners.get('touchstart')?.size).toBe(0);
        expect(button.listeners.get('click')?.size).toBe(0);
        const calls = context.filters[0].frequency.setTargetAtTime.mock.calls.length;
        eventBus.emit('depth:changed', { depth: 10000 }); click(); controller!.playSonar();
        expect(context.filters[0].frequency.setTargetAtTime).toHaveBeenCalledTimes(calls);
        expect(context.oscillators).toHaveLength(0);
    });
    it('予約済みの複数音も非表示中にContextを再開しない', async () => {
        start(); click(); await flush(); audio.playSound('badge');
        const context = contexts[0];
        expect(context.oscillators).toHaveLength(2);
        doc.hidden = true; controller!.suspend(); await flush(); context.resume.mockClear();
        vi.advanceTimersByTime(250); await flush();
        expect(context.resume).not.toHaveBeenCalled();
        expect(context.state).toBe('suspended');
        expect(context.oscillators).toHaveLength(2);
    });

    it('複数音の既存の周波数・遅延・80ms以内の多重再生防止を維持する', async () => {
        start(); click(); await flush();
        const context = contexts[0];
        audio.playSound('badge'); audio.playSound('badge');
        expect(context.oscillators).toHaveLength(2);
        expect(context.oscillators[0].frequency.value).toBe(784);
        vi.advanceTimersByTime(99); expect(context.oscillators).toHaveLength(2);
        vi.advanceTimersByTime(1); expect(context.oscillators).toHaveLength(4);
        expect(context.oscillators[2].frequency.value).toBe(988);
        vi.advanceTimersByTime(100); expect(context.oscillators).toHaveLength(6);
        expect(context.oscillators[4].frequency.value).toBe(1175);
    });

});
