import {
    initAudio, startAudio, isAudioReady, getIsMuted,
    restoreAudioSettings, toggleMute, playTone, playSound as playSharedSound
} from '../../js/audio.js';
import { loadProfile } from '../../js/profile.js';
import { SOUND_EFFECTS } from '../../js/constants.js';

let starting: Promise<void> | null = null;
const lastPlayedSequences: Record<string, number> = {};

// DeepSeaも既存プロフィールの音声設定を使う。画面表示だけでは音声を起動しない。
export function restoreSoundSettings(): void {
    loadProfile();
    restoreAudioSettings();
}

export function activateAudio(): { context: AudioContext; ready: Promise<void> } {
    const context = initAudio();
    if (!starting) {
        // 一度起動した後も、OSやタブ切り替えによる停止から同じContextを再開する。
        const pending = isAudioReady() ? context.resume() : startAudio();
        starting = pending.finally(() => { starting = null; });
    }
    return { context, ready: starting };
}

function playEffect(type: string): void {
    if (document.hidden || getIsMuted() || !isAudioReady()) return;
    const effect = SOUND_EFFECTS[type];
    if (!Array.isArray(effect)) {
        playSharedSound(type);
        return;
    }
    // 共通定義の旋律・音量・80msの多重再生防止は維持し、遅延音にも可視性を適用する。
    const now = Date.now();
    if (now - (lastPlayedSequences[type] || 0) < 80) return;
    lastPlayedSequences[type] = now;
    effect.forEach(note => {
        const playNote = () => {
            if (!document.hidden) playTone(note.freq, note.dur, note.type, note.vol);
        };
        if (note.delay === 0) playNote();
        else setTimeout(playNote, note.delay);
    });
}

export function playSound(type: string): void {
    if (document.hidden || getIsMuted()) return;
    if (starting) {
        // 最初のクリックはresume完了前にUIへ届くため、その効果音だけ待ち合わせる。
        void starting.then(() => {
            playEffect(type);
        }, () => { /* 起動失敗はAudioControllerで処理し、次の操作で再試行する。 */ });
    } else {
        playEffect(type);
    }
}

export { getIsMuted, toggleMute };
