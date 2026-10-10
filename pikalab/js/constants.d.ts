interface SoundEffect {
    freq: number;
    dur: number;
    type?: string;
    vol?: number;
}
export const SOUND_EFFECTS: Record<string, SoundEffect | Array<SoundEffect & { delay: number }>>;
