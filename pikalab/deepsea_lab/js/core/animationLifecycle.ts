import { eventBus } from './EventBus';

interface ParticlePlayback { pause(): void; play(): void }
interface AudioPlayback { suspend(): void; resume(): void }

// modal-layer はナビゲーションや霧にも使われるため、表示中のダイアログだけを対象にする。
export const OPEN_DIALOG_SELECTOR = '#sea-modal:not(.hidden), #album-modal:not(.hidden), #completion-modal:not(.hidden), #parents-modal[open]';

export function bindAnimationLifecycle(particles: ParticlePlayback, audio: AudioPlayback): () => void {
    const syncParticles = () => {
        if (document.hidden || document.querySelector(OPEN_DIALOG_SELECTOR)) particles.pause();
        else particles.play();
    };
    const onVisibilityChange = () => {
        if (document.hidden) audio.suspend();
        else audio.resume();
        syncParticles();
    };
    eventBus.on('modal_opened', syncParticles);
    eventBus.on('modal_closed', syncParticles);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // ネイティブの保護者ダイアログは EventBus を使わず開閉される。
    const parentsDialog = document.getElementById('parents-modal');
    const observer = parentsDialog ? new MutationObserver(syncParticles) : null;
    if (parentsDialog) observer?.observe(parentsDialog, { attributes: true, attributeFilter: ['open'] });
    onVisibilityChange();

    return () => {
        eventBus.off('modal_opened', syncParticles);
        eventBus.off('modal_closed', syncParticles);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        observer?.disconnect();
    };
}
