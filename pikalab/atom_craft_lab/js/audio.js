import { state } from './state.js';

const SUCCESS_FREQS = Object.freeze([523.25, 659.25, 783.99, 1046.5]);

let audioCtx = null;

function createManagedTone(ctx, waveType) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveType;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
    };
    return { osc, gain };
}

export function playSound(type) {
    if (!state.soundEnabled) return;
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioCtx) audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') Promise.resolve(audioCtx.resume()).catch(() => {});
        const now = audioCtx.currentTime;

        if (type === 'pop') {
            const { osc, gain } = createManagedTone(audioCtx, 'sine');
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(680, now + 0.07);
            gain.gain.setValueAtTime(0.11, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'remove') {
            const { osc, gain } = createManagedTone(audioCtx, 'sine');
            osc.frequency.setValueAtTime(460, now);
            osc.frequency.exponentialRampToValueAtTime(260, now + 0.07);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'success') {
            SUCCESS_FREQS.forEach((freq, idx) => {
                const startTime = now + idx * 0.065;
                const { osc, gain } = createManagedTone(audioCtx, 'triangle');
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0.14, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.32);
                osc.start(startTime);
                osc.stop(startTime + 0.32);
            });
        } else if (type === 'hint') {
            const { osc, gain } = createManagedTone(audioCtx, 'sine');
            osc.frequency.setValueAtTime(340, now);
            osc.frequency.setValueAtTime(420, now + 0.07);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        }
    } catch (e) {
        /* Audio restricted */
    }
}
