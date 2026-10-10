export function playSound(type: string): void;
export function initAudio(): AudioContext;
export function startAudio(): Promise<void>;
export function isAudioReady(): boolean;
export function getIsMuted(): boolean;
export function restoreAudioSettings(): void;
export function toggleMute(): void;
export function playTone(frequency: number, duration: number, type?: string, volume?: number): void;
