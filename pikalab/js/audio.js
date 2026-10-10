/**
 * PikaLab - Audio Module
 * Web Audio API によるサウンド管理
 */

import { SOUND_EFFECTS, LOGO_COLORS } from './constants.js';
import { userProfile, saveProfile } from './profile.js';

// --- 内部状態 ---
let audioContext = null;
let masterGainNode = null; // マスター音量ノード
let isAudioStarted = false;
let isMuted = false;
let currentVolume = 0.1; // 0.0〜1.0 (初期値 -20dB = 0.1)
let preMuteVolumeDb = -20; // ミュート解除時に復帰する音量デシベル値

/**
 * 保存済み設定を復元する。画面表示だけではAudioContextを作成しない。
 */
export function restoreAudioSettings() {
    isMuted = userProfile.isMuted;
    preMuteVolumeDb = userProfile.volumeDb;
    currentVolume = Math.pow(10, preMuteVolumeDb / 40);
    if (masterGainNode) masterGainNode.gain.value = isMuted ? 0 : currentVolume;
    updateSoundIcon();
    updateVolumeSliderUI();
}

/**
 * AudioContext を初期化
 */
export function initAudio() {
    if (!audioContext) {
        restoreAudioSettings();

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // マスターゲインノードを作成
        masterGainNode = audioContext.createGain();
        masterGainNode.connect(audioContext.destination);
        masterGainNode.gain.value = isMuted ? 0 : currentVolume;
    }
    return audioContext;
}

/**
 * オーディオを開始（ユーザーインタラクション後に呼び出す）
 */
export async function startAudio() {
    if (!isAudioStarted) {
        try {
            const ctx = initAudio();
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            isAudioStarted = true;
            updateSoundIcon();
        } catch (e) {
            console.warn('Audio blocked or failed:', e);
            isMuted = true;
            updateSoundIcon();
            throw e;
        }
    }
}

/**
 * オーディオコンテキストの状態を取得
 */
export function isAudioReady() {
    return isAudioStarted;
}

/**
 * ミュート状態を取得
 */
export function getIsMuted() {
    return isMuted;
}

/**
 * 単一のトーンを再生
 */
export function playTone(frequency, duration, type = 'sine', volume = 0.08) {
    if (!isAudioStarted || isMuted || !audioContext) return;

    try {
        const ctx = audioContext;
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;

        // レトロゲーム効果を出すため、周波数の異なる2つのオシレーター（コーラス/デチューン）を作成
        // 主音オシレーター (三角波や矩形波の組み合わせ)
        const osc1 = ctx.createOscillator();
        // 副音オシレーター (わずかにピッチをずらして厚みを出す)
        const osc2 = ctx.createOscillator();

        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();

        osc1.connect(gain1);
        osc2.connect(gain2);

        gain1.connect(masterGainNode);
        gain2.connect(masterGainNode);

        // 子供向けゲームらしい丸みと温かみのある「三角波」をベースにする
        // ただし引数で明示的に指定された場合はそれに従う
        osc1.type = type === 'sine' ? 'triangle' : type; 
        osc2.type = 'sine'; // 副音は滑らかな正弦波

        osc1.frequency.value = frequency;
        // 副音は基本周波数から3Hzだけずらす（デチューンによる温かいコーラス効果）
        osc2.frequency.value = frequency + 3;

        // 音量のエンベロープ（アタック・サステイン・リリース）を制御してポップノイズを防ぎつつメリハリを出す
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(volume * 0.7, now + 0.005);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(volume * 0.3, now + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc1.start(now);
        osc2.start(now);

        osc1.stop(now + duration + 0.01);
        osc2.stop(now + duration + 0.01);

        // メモリリーク防止（ノードの破棄処理）
        osc1.onended = () => {
            osc1.disconnect();
            osc2.disconnect();
            gain1.disconnect();
            gain2.disconnect();
        };
    } catch (e) {
        console.warn('Audio playback failed:', e);
    }
}

/**
 * ミュート切り替え
 */
export function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
        if (masterGainNode) {
            masterGainNode.gain.value = 0;
        }
    } else {
        currentVolume = Math.pow(10, preMuteVolumeDb / 40);
        if (masterGainNode) {
            masterGainNode.gain.value = currentVolume;
        }
    }

    // プロフィールへ保存
    userProfile.isMuted = isMuted;
    saveProfile();

    updateSoundIcon();
    updateVolumeSliderUI();

    if (!isMuted && isAudioStarted) {
        playSound('click');
    }
}

/**
 * 音量設定（-40〜0 dB → 0.0〜1.0 に変換）
 */
export function setVolume(val) {
    const db = parseFloat(val);
    if (db <= -40) {
        currentVolume = 0;
        isMuted = true;
    } else {
        // dBを線形に変換（簡易版：-40dB=0, 0dB=1）
        currentVolume = Math.pow(10, db / 40);
        isMuted = false;
        preMuteVolumeDb = db; // 有効な音量を記憶
    }

    if (masterGainNode) {
        masterGainNode.gain.value = isMuted ? 0 : currentVolume;
    }

    // プロフィールへ保存
    userProfile.isMuted = isMuted;
    userProfile.volumeDb = preMuteVolumeDb;
    saveProfile();

    updateSoundIcon();
    updateVolumeSliderUI();
}

/**
 * 音量スライダーUIの位置を同期
 */
function updateVolumeSliderUI() {
    const slider = document.getElementById('volume-slider');
    if (slider) {
        slider.value = isMuted ? -40 : preMuteVolumeDb;
    }
}


/**
 * サウンドアイコンの表示を更新
 */
export function updateSoundIcon() {
    const icons = document.querySelectorAll('#sound-icon, #settings-mute-icon');

    icons.forEach(icon => {
        icon.textContent = isMuted ? 'volume_off' : 'volume_up';
        if (isMuted) {
            icon.classList.remove('text-green-500');
            icon.classList.add('text-slate-300');
        } else {
            icon.classList.remove('text-slate-300');
            icon.classList.add('text-green-500');
        }
    });
}

// 同一効果音の多重再生（チャタリング）防止用キャッシュ
const lastPlayedTimes = {};

/**
 * 効果音を再生
 */
export function playSound(type) {
    if (!isAudioStarted || isMuted) return;

    // 80ms以内の同一効果音の多重トリガーはスキップして音割れを防ぐ
    const now = Date.now();
    const lastPlayed = lastPlayedTimes[type] || 0;
    if (now - lastPlayed < 80) {
        return;
    }
    lastPlayedTimes[type] = now;

    const sfx = SOUND_EFFECTS[type];
    if (!sfx) return;

    // 単音の場合
    if (!Array.isArray(sfx)) {
        playTone(sfx.freq, sfx.dur, sfx.type, sfx.vol);
        return;
    }

    // 複数音の場合
    sfx.forEach(note => {
        if (note.delay === 0) {
            playTone(note.freq, note.dur, note.type, note.vol);
        } else {
            setTimeout(() => playTone(note.freq, note.dur, note.type, note.vol), note.delay);
        }
    });
}

/**
 * ロゴクリック時のサウンドと色変更
 */
export function changeLogoColor() {
    if (isAudioStarted && !isMuted) {
        playSound('logo');
    }

    const logo = document.getElementById('header-logo');
    if (!logo) return;

    const randomColor = LOGO_COLORS[Math.floor(Math.random() * LOGO_COLORS.length)];
    logo.style.color = randomColor;

    // アニメーションをリセットして再生
    logo.classList.remove('animate-jelly');
    void logo.offsetWidth; // Reflowを強制
    logo.classList.add('animate-jelly');
}

/**
 * オーディオ関連のイベントリスナーを初期化
 * main.jsから明示的に呼び出すことで、モジュールインポート時の副作用を防ぐ
 */
export function initAudioEventListeners() {
    const resumeAudio = () => {
        if (audioContext) {
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    if (audioContext.state === 'running') {
                        removeListeners();
                    }
                }).catch((e) => console.warn('Audio resume failed:', e));
            } else if (audioContext.state === 'running') {
                removeListeners();
            }
        }
    };

    const removeListeners = () => {
        ['mousedown', 'touchstart', 'keydown'].forEach(evt => {
            document.documentElement.removeEventListener(evt, resumeAudio);
        });
    };

    // ユーザー操作時にAudioContextを再開 (アクセシビリティ対応)
    ['mousedown', 'touchstart', 'keydown'].forEach(evt => {
        document.documentElement.addEventListener(evt, resumeAudio, { passive: true });
    });
}
