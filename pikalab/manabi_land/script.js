function normalizeClockHour(hour) {
    const value = Number.parseInt(String(hour), 10);
    if (!Number.isFinite(value)) return 12;
    return (((value - 1) % 12 + 12) % 12) + 1;
}

function normalizeClockMinute(minute) {
    const value = Number.parseInt(String(minute), 10);
    if (!Number.isFinite(value)) return 0;
    return ((value % 60) + 60) % 60;
}

function shiftClockByFiveMinutes(hour, minute, direction) {
    const normalizedHour = normalizeClockHour(hour);
    const normalizedMinute = normalizeClockMinute(minute);
    const delta = direction === 'backward' ? -5 : 5;
    const zeroBasedMinutes = ((normalizedHour % 12) * 60) + normalizedMinute;
    const shifted = (zeroBasedMinutes + delta + 12 * 60) % (12 * 60);
    const shiftedHour = Math.floor(shifted / 60);
    return {
        hour: shiftedHour === 0 ? 12 : shiftedHour,
        minute: shifted % 60
    };
}
const MANABI_PROFILE_KEY = 'wonder_school_profile_v2';
const MANABI_TABS = ['money', 'clock', 'moji'];

function readManabiProfile() {
    try {
        const value = JSON.parse(localStorage.getItem(MANABI_PROFILE_KEY) || '{}');
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (_) {
        return {};
    }
}

function shuffleChoices(values) {
    for (let index = values.length - 1; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1));
        [values[index], values[other]] = [values[other], values[index]];
    }
    return values;
}

// --- AudioManager (音声・効果音制御クラス) ---
class AudioManager {
    constructor() {
        this.isAudioInit = false;
        this.audioInitFailed = false;
        this.initPromise = null;
        this.generation = 0;
        this.isMuted = false;
        this.volumeDb = -20;
        this.sfxSynth = null;
        this.sfxPoly = null;
        this.sfxTick = null;
        this.sfxNgSynth = null; // 耳障りでない警告音用のシンセ

        this.loadSettings();
    }

    loadSettings() {
        const data = readManabiProfile();
        this.isMuted = typeof data.isMuted === 'boolean' ? data.isMuted : false;
        this.volumeDb = Number.isFinite(data.volumeDb) ? Math.max(-40, Math.min(0, data.volumeDb)) : -20;
        if (this.isAudioInit) {
            Tone.Destination.mute = this.isMuted;
            Tone.Destination.volume.value = this.volumeDb;
        }
    }

    async init() {
        if (this.isAudioInit) return true;
        if (this.initPromise) return this.initPromise;
        // 初回の連打・タブ初期化を一つの初期化へまとめ、失敗した次の操作では再試行する。
        this.initPromise = (async () => {
            const created = [];
            // 同期例外でもin-flight参照の設定後に解放できるようにする。
            await Promise.resolve();
            try {
                await window.PikaLabToneLoader.load('../assets/tone-14.8.49.js');
                if (typeof Tone === 'undefined') throw new Error('Tone.js is not available');
                await Tone.start();
                const make = (Synth, options) => {
                    const synth = new Synth(options);
                    created.push(synth);
                    return synth.toDestination();
                };
                this.sfxSynth = make(Tone.Synth);
                this.sfxPoly = make(Tone.PolySynth);
                this.sfxTick = make(Tone.Synth);
                this.sfxNgSynth = make(Tone.Synth, {
                    oscillator: { type: 'triangle' },
                    envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 }
                });
                Tone.Destination.mute = this.isMuted;
                Tone.Destination.volume.value = this.volumeDb;
                this.isAudioInit = true;
                this.audioInitFailed = false;
                if (document.hidden) this.suspend();
                return true;
            } catch (error) {
                created.forEach(synth => { try { synth.dispose(); } catch (_) {} });
                this.sfxSynth = this.sfxPoly = this.sfxTick = this.sfxNgSynth = null;
                this.audioInitFailed = true;
                console.warn('オーディオ初期化に失敗:', error);
                return false;
            } finally {
                this.initPromise = null;
            }
        })();
        return this.initPromise;
    }

    cancelPending() {
        this.generation++;
    }

    async playSfx(type) {
        if (this.isMuted || document.hidden) return;
        const generation = this.generation;
        if (!this.isAudioInit) await this.init();
        if (!this.isAudioInit || this.isMuted || document.hidden || generation !== this.generation) return;
        // 同じイベントループで連打されてもToneの開始時刻を重複させない。
        try {
            const now = Math.max(Tone.now(), (this.lastSoundTime ?? -Infinity) + 0.001);
            this.lastSoundTime = now;
            if (type === 'ok') {
                this.sfxPoly.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], '16n', now);
            } else if (type === 'ng') {
                this.sfxNgSynth.triggerAttackRelease('A2', '8n', now);
            } else if (type === 'coin') {
                this.sfxSynth.triggerAttackRelease('B5', '32n', now);
            } else if (type === 'click') {
                this.sfxSynth.triggerAttackRelease('G4', '32n', now);
            } else if (type === 'tick') {
                this.sfxTick.triggerAttackRelease('E6', '64n', now, 0.1);
            } else if (type === 'pop') {
                this.sfxSynth.triggerAttackRelease('C4', '64n', now);
            } else if (type === 'perfect') {
                this.sfxPoly.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], '4n', now);
                this.sfxPoly.triggerAttackRelease(['G5', 'B5', 'D6', 'G6'], '4n', now + 0.25);
                this.sfxPoly.triggerAttackRelease(['C6', 'E6', 'G6', 'C7'], '2n', now + 0.5);
                this.lastSoundTime = now + 0.5;
            }
        } catch (error) {
            // 音声非対応・中断中でも正解判定と画面更新を止めない。
            console.warn('効果音を再生できませんでした:', error);
        }
    }

    suspend() {
        this.cancelPending();
        if (this.isAudioInit && typeof Tone !== 'undefined' && Tone.context) {
            // Tone.jsのラッパーとブラウザのAudioContextの両方に対応する。
            const toneContext = Tone.context.rawContext || Tone.context;
            if (typeof toneContext.suspend === 'function') {
                try {
                    const result = toneContext.suspend();
                    result?.catch?.(() => {});
                } catch (_) {
                    // 非対応環境では停止処理だけを安全に省略する。
                }
            }
        }
    }

    resume() {
        if (this.isAudioInit && typeof Tone !== 'undefined' && Tone.context) {
            const toneContext = Tone.context.rawContext || Tone.context;
            if (typeof toneContext.resume === 'function') {
                try {
                    const result = toneContext.resume();
                    result?.catch?.(() => {});
                } catch (_) {
                    // 非対応環境では再開処理だけを安全に省略する。
                }
            }
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.cancelPending();
        // 最新のプロフィールに音声設定だけをマージし、他の項目を巻き戻さない。
        try {
            const data = readManabiProfile();
            data.isMuted = this.isMuted;
            localStorage.setItem(MANABI_PROFILE_KEY, JSON.stringify(data));
        } catch (_) {
            // 保存できない環境でも、この画面での切替は有効にする。
        }
        if (typeof Tone !== 'undefined' && Tone.Destination) {
            Tone.Destination.mute = this.isMuted;
        }
        this.updateSoundButton();
        if (!this.isMuted) this.playSfx('click');
    }

    updateSoundButton() {
        const b = document.getElementById('sound-btn');
        if (!b) return;
        const i = b.querySelector('span');
        if (!i) return;
        b.setAttribute('aria-pressed', this.isMuted ? 'true' : 'false');
        b.setAttribute('aria-label', this.isMuted ? '効果音をオンにする' : '効果音をオフにする');
        if (this.isMuted) {
            i.textContent = 'volume_off';
            b.className = "w-10 h-10 rounded-full flex items-center justify-center btn-push border-2 border-slate-200 bg-slate-100 text-slate-400";
        } else {
            i.textContent = 'volume_up';
            b.className = "w-10 h-10 rounded-full flex items-center justify-center btn-push border-2 border-green-200 bg-green-50 text-green-600 shadow-sm";
        }
    }
}

// --- 1. MoneyGame (お買い物ゲームクラス) ---
class MoneyGame {
    constructor(app) {
        this.app = app;
        this.mode = 'pay';
        this.targetPrice = 0;
        this.coinHistory = [];
        this.streak = 0;
        this.items = [
            {n:'りんご', i:'🍎', p:[80,100,120,50]}, {n:'バナナ', i:'🍌', p:[50,70,60]},
            {n:'ノート', i:'📓', p:[110,120]}, {n:'アイス', i:'🍦', p:[130,150,140]},
            {n:'ケーキ', i:'🍰', p:[250,300,320]}, {n:'ロボ', i:'🤖', p:[400,500]}
        ];
    }

    setupEvents() {
        document.getElementById('mode-pay').addEventListener('click', () => this.setMode('pay'));
        document.getElementById('mode-change').addEventListener('click', () => this.setMode('change'));
        
        // コインボタン
        document.querySelectorAll('.coin-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.app.isLocked) return; // 連打防止ロック
                const val = parseInt(btn.getAttribute('data-value'), 10);
                this.addMoney(val);
            });
        });

        // アクションボタン
        document.getElementById('btn-money-undo').addEventListener('click', () => {
            if (this.app.isLocked) return;
            this.undoMoney();
        });
        document.getElementById('btn-money-reset').addEventListener('click', () => {
            if (this.app.isLocked) return;
            this.resetMoney();
        });
        document.getElementById('btn-money-check').addEventListener('click', () => {
            if (this.app.isLocked) return;
            this.checkMoney();
        });
    }

    onActivate() {
        if (this.targetPrice === 0) this.initGame();
        this.app.setMaron(this.mode === 'pay' ? 'これください<br>いくらかな' : 'おつりは<br>いくら？');
    }

    setMode(mode) {
        if (this.app.isLocked) return;
        this.app.audio.playSfx('click');
        this.mode = mode;
        document.getElementById('mode-pay').setAttribute('aria-pressed', String(mode === 'pay'));
        document.getElementById('mode-change').setAttribute('aria-pressed', String(mode === 'change'));
        const bP = document.getElementById('mode-pay');
        const bC = document.getElementById('mode-change');
        if (mode === 'pay') {
            bP.className = "px-3 py-1 rounded-md bg-blue-100 text-blue-700 transition";
            bC.className = "px-3 py-1 rounded-md text-slate-400 transition";
            document.getElementById('display-pay').style.display = 'block';
            document.getElementById('display-change').style.display = 'none';
            document.getElementById('money-label').textContent = "いれたおかね";
        } else {
            bC.className = "px-3 py-1 rounded-md bg-blue-100 text-blue-700 transition";
            bP.className = "px-3 py-1 rounded-md text-slate-400 transition";
            document.getElementById('display-pay').style.display = 'none';
            document.getElementById('display-change').style.display = 'block';
            document.getElementById('money-label').textContent = "えらんだおかね";
            this.streak = 0;
        }
        this.initGame();
    }

    initGame() {
        this.resetMoneySilent();
        const it = this.items[Math.floor(Math.random() * this.items.length)];
        
        if (this.mode === 'pay') {
            const p = it.p[Math.floor(Math.random() * it.p.length)];
            document.getElementById('item-icon').textContent = it.i;
            document.getElementById('item-name').textContent = it.n;
            document.getElementById('target-price').innerHTML = `${p}<span class="text-lg text-slate-400 ml-1">えん</span>`;
            this.targetPrice = p;
            this.app.setMaron('これください<br>いくらかな');
        } else {
            let p, paid;
            if (this.streak < 3) {
                p = Math.floor(Math.random() * 9 + 1) * 10;
                paid = 100;
            } else {
                p = Math.floor(Math.random() * 80 + 10); 
                paid = 100; 
                if (p < 50 && Math.random() > 0.5) paid = 50;
            }
            const change = paid - p;
            
            let lvl = (this.streak >= 3) ? 2 : 1;
            document.getElementById('change-level-disp').textContent = lvl;
            document.getElementById('change-item-icon').textContent = it.i;
            document.getElementById('change-item-price').textContent = p;
            document.getElementById('change-paid').textContent = paid;
            this.targetPrice = change;
            this.app.setMaron('おつりは<br>いくら？');
        }
    }

    addMoney(val) {
        if (![1, 5, 10, 50, 100].includes(val)) return;
        this.app.audio.playSfx('coin');
        this.coinHistory.push(val);
        this.updateTray();
    }

    undoMoney() {
        if (this.coinHistory.length > 0) {
            this.app.audio.playSfx('pop');
            this.coinHistory.pop();
            this.updateTray();
        }
    }

    resetMoney() {
        this.app.audio.playSfx('click');
        this.resetMoneySilent();
    }

    resetMoneySilent() {
        this.coinHistory = [];
        this.updateTray();
    }

    updateTray() {
        const sum = this.coinHistory.reduce((a, b) => a + b, 0);
        document.getElementById('current-money').textContent = sum;
        
        const tray = document.getElementById('coin-tray');
        tray.innerHTML = '';
        this.coinHistory.forEach(val => {
            const el = document.createElement('div');
            el.className = 'tray-coin';
            el.textContent = val;
            
            if (val >= 50) {
                el.style.background = '#E2E8F0'; el.style.borderColor = '#94A3B8'; el.style.color = '#475569';
            } else if (val === 10) {
                el.style.background = '#FFEDD5'; el.style.borderColor = '#EA580C'; el.style.color = '#9A3412';
            } else if (val === 5) {
                el.style.background = '#FEF08A'; el.style.borderColor = '#CA8A04'; el.style.color = '#854D0E';
            } else {
                el.style.background = '#F8FAFC'; el.style.borderColor = '#CBD5E1'; el.style.color = '#64748B';
            }
            tray.appendChild(el);
        });
    }

    checkMoney() {
        const sum = this.coinHistory.reduce((a, b) => a + b, 0);
        if (sum === this.targetPrice) {
            if (this.mode === 'change') this.streak++;
            this.app.showHanamaru(() => this.initGame());
        } else if (sum > this.targetPrice) {
            this.app.audio.playSfx('ng');
            this.app.setMaron('あれ？<br>おおいよ');
        } else {
            this.app.audio.playSfx('ng');
            this.app.setMaron('あれ？<br>たりない');
        }
    }
}

// --- 2. ClockGame (時計ゲームクラス) ---
class ClockGame {
    constructor(app) {
        this.app = app;
        this.clockInit = false;
        this.mode = 'read';
        this.targetHour = 0;
        this.targetMinute = 0;
        this.currentHour = 0;
        this.currentMinute = 0;
        this.clockTouch = null;
        this.clockTouchRect = null;
        this.activePointerId = null;

        // ドラッグイベント用のバインド
        this.boundMove = this.handlePointerMove.bind(this);
        this.boundUp = this.handlePointerUp.bind(this);
    }

    setupEvents() {
        document.getElementById('mode-clock-read').addEventListener('click', () => this.setMode('read'));
        document.getElementById('mode-clock-set').addEventListener('click', () => this.setMode('set'));
        
        // できた！ボタン
        const checkBtn = document.getElementById('clock-check-btn').querySelector('button');
        checkBtn.addEventListener('click', () => {
            if (this.app.isLocked) return;
            this.checkClockSet();
        });

        // 微調整ボタン
        document.querySelectorAll('.btn-clock-adj').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.app.isLocked) return;
                const act = btn.getAttribute('data-action');
                this.adjustClock(act);
            });
        });

        // タッチ操作レイヤー
        this.clockTouch = document.getElementById('clock-touch');
        this.clockTouch.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        this.clockTouch.addEventListener('lostpointercapture', this.boundUp);
    }

    adjustClock(action) {
        if (this.mode !== 'set' || this.app.isLocked) return;
        if (action === 'dec-h') {
            this.currentHour = (this.currentHour <= 1) ? 12 : this.currentHour - 1;
        } else if (action === 'inc-h') {
            this.currentHour = (this.currentHour >= 12) ? 1 : this.currentHour + 1;
        } else if (action === 'dec-m' || action === 'inc-m') {
            const next = shiftClockByFiveMinutes(
                this.currentHour,
                this.currentMinute,
                action === 'dec-m' ? 'backward' : 'forward'
            );
            this.currentHour = next.hour;
            this.currentMinute = next.minute;
        }
        this.setHands(this.currentHour, this.currentMinute);
        this.app.audio.playSfx('tick');
    }

    onActivate() {
        if (!this.clockInit) this.initClockUI();
        this.layoutClockNumbers();
        this.app.setMaron(this.mode === 'read' ? 'とけいを<br>よんでね' : 'とけいを<br>あわせてね');
    }

    initClockUI() {
        const f = document.getElementById('clock-face');
        
        for (let i = 0; i < 60; i++) {
            const t = document.createElement('div');
            t.className = `clock-tick ${i % 5 === 0 ? 'major' : ''}`;
            t.style.transform = `rotate(${i * 6}deg)`;
            f.appendChild(t);
        }
        for (let i = 1; i <= 12; i++) {
            const n = document.createElement('div');
            n.className = 'clock-num';
            n.textContent = i;
            f.appendChild(n);
        }
        this.clockInit = true;
        this.layoutClockNumbers();
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.cancelPointer();
                this.layoutClockNumbers();
            });
            this.resizeObserver.observe(f);
        } else if (typeof window !== 'undefined') {
            window.addEventListener('resize', () => {
                this.cancelPointer();
                this.layoutClockNumbers();
            });
        }
        this.setMode('read');
    }

    layoutClockNumbers() {
        const face = document.getElementById('clock-face');
        const size = Math.min(face.clientWidth, face.clientHeight);
        if (!size) return;
        const radius = size / 2 - 14 - 12;
        face.querySelectorAll('.clock-num').forEach((number, index) => {
            const angle = (index + 1) * 30;
            number.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg)`;
        });
    }

    setHands(h, m) {
        const md = m * 6;
        const hd = (h % 12) * 30 + m * 0.5;
        document.getElementById('hand-minute').style.transform = `translateX(-50%) rotate(${md}deg)`;
        document.getElementById('hand-hour').style.transform = `translateX(-50%) rotate(${hd}deg)`;
    }

    setMode(mode) {
        if (this.app.isLocked) return;
        this.app.audio.playSfx('click');
        this.cancelPointer();
        this.mode = mode;
        document.getElementById('mode-clock-read').setAttribute('aria-pressed', String(mode === 'read'));
        document.getElementById('mode-clock-set').setAttribute('aria-pressed', String(mode === 'set'));
        const bR = document.getElementById('mode-clock-read');
        const bS = document.getElementById('mode-clock-set');
        const op = document.getElementById('clock-opts');
        const ch = document.getElementById('clock-check-btn');
        const touch = document.getElementById('clock-touch');
        const adj = document.getElementById('clock-adjust-btns');

        if (mode === 'read') {
            bR.className = "px-3 py-1 rounded-md bg-green-100 text-green-700 transition";
            bS.className = "px-3 py-1 rounded-md text-slate-400 transition";
            op.style.display = 'grid';
            ch.style.display = 'none';
            touch.style.display = 'none';
            if (adj) adj.style.display = 'none';
            this.initRead();
        } else {
            bS.className = "px-3 py-1 rounded-md bg-green-100 text-green-700 transition";
            bR.className = "px-3 py-1 rounded-md text-slate-400 transition";
            op.style.display = 'none';
            ch.style.display = 'block';
            touch.style.display = 'block';
            if (adj) adj.style.display = 'block';
            this.initSet();
        }
    }

    initRead() {
        this.targetHour = Math.floor(Math.random() * 12) + 1;
        this.targetMinute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
        document.getElementById('clock-question').textContent = "いま なんじ？";
        this.setHands(this.targetHour, this.targetMinute);
        
        const cor = `${this.targetHour}じ ${this.targetMinute === 0 ? '' : this.targetMinute + 'ふん'}`;
        // 候補全体から重複なしで選ぶ。乱数の偏りでもwhileが終わらなくならない。
        const candidates = [];
        for (let hour = 1; hour <= 12; hour++) {
            for (const minute of [0, 15, 30, 45]) {
                const text = `${hour}じ ${minute === 0 ? '' : minute + 'ふん'}`;
                if (text !== cor) candidates.push(text);
            }
        }
        const list = shuffleChoices([cor, ...shuffleChoices(candidates).slice(0, 3)]);

        const container = document.getElementById('clock-opts');
        container.innerHTML = '';
        list.forEach(x => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = "bg-white border-2 border-green-200 text-green-700 font-bold py-3 rounded-xl shadow-sm hover:bg-green-50 active:scale-95 transition btn-push text-lg";
            b.textContent = x;
            b.onclick = () => {
                if (this.app.isLocked) return;
                if (x === cor) {
                    this.app.showHanamaru(() => this.initRead());
                } else {
                    this.app.audio.playSfx('ng');
                    this.app.setMaron('ちがうよ<br>よくみて');
                }
            };
            container.appendChild(b);
        });
    }

    initSet() {
        this.targetHour = Math.floor(Math.random() * 12) + 1;
        this.targetMinute = [0, 30][Math.floor(Math.random() * 2)];
        document.getElementById('clock-question').textContent = `${this.targetHour}じ ${this.targetMinute === 0 ? '' : this.targetMinute + 'ふん'} にして`;
        this.currentHour = Math.floor(Math.random() * 12) + 1;
        this.currentMinute = 0;
        this.setHands(this.currentHour, this.currentMinute);
    }

    canDrag() {
        return this.mode === 'set' && this.app.tabId === 'tab-clock'
            && !this.app.isLocked && !this.app.isModalOpen && !document.hidden;
    }

    handlePointerDown(e) {
        if (!this.canDrag() || this.activePointerId !== null || (e.button !== undefined && e.button !== 0)) return;
        e.preventDefault();
        this.activePointerId = e.pointerId;
        try { this.clockTouch.setPointerCapture(e.pointerId); } catch (_) {}
        this.clockTouchRect = this.clockTouch.getBoundingClientRect();
        window.addEventListener('pointermove', this.boundMove);
        window.addEventListener('pointerup', this.boundUp);
        window.addEventListener('pointercancel', this.boundUp);
        this.updateClockByPointer(e);
    }

    handlePointerMove(e) {
        if (e.pointerId !== this.activePointerId) return;
        if (!this.canDrag()) { this.cancelPointer(); return; }
        this.updateClockByPointer(e);
    }

    handlePointerUp(e) {
        if (e.pointerId === this.activePointerId) this.cancelPointer();
    }

    cancelPointer() {
        const pointerId = this.activePointerId;
        this.activePointerId = null;
        this.clockTouchRect = null;
        if (typeof window !== 'undefined') {
            window.removeEventListener('pointermove', this.boundMove);
            window.removeEventListener('pointerup', this.boundUp);
            window.removeEventListener('pointercancel', this.boundUp);
        }
        if (pointerId !== null && this.clockTouch) {
            try { this.clockTouch.releasePointerCapture(pointerId); } catch (_) {}
        }
    }

    updateClockByPointer(e) {
        if (!this.clockTouchRect) return;
        const rect = this.clockTouchRect;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const x = e.clientX - rect.left - cx;
        const y = e.clientY - rect.top - cy;

        let d = Math.atan2(y, x) * (180 / Math.PI) + 90;
        if (d < 0) d += 360;
        const snap = Math.round(d / 30) * 30;
        this.currentMinute = (snap / 6) % 60;

        if (Math.sqrt(x * x + y * y) < 60) {
            let h = Math.round(snap / 30);
            if (h === 0) h = 12;
            this.currentHour = h;
        }
        this.setHands(this.currentHour, this.currentMinute);
        this.app.audio.playSfx('tick');
    }

    checkClockSet() {
        let h = this.currentHour === 0 ? 12 : this.currentHour;
        if (h === this.targetHour && this.currentMinute === this.targetMinute) {
            this.app.showHanamaru(() => this.initSet());
        } else {
            this.app.audio.playSfx('ng');
            this.app.setMaron('あれ？<br>ズレてる');
        }
    }
}

// --- 3. MojiGame (文字探しゲームクラス) ---
class MojiGame {
    constructor(app) {
        this.app = app;
        this.mojiTgt = '';
        this.mSt = 0;
        this.mIv = null;
        this.level = 'easy';
        this.correctIndex = -1;
        this.elapsedMs = 0;
        this.wrongTimers = new Map();
        
        // ゲシュタルト類似度・文字構造に基づいた難易度別文字ペア（計40組）
        this.mojiList = {
            easy: [
                ['あ', 'し'], ['い', 'く'], ['ま', 'の'], ['れ', 'お'], ['り', 'つ'],
                ['へ', 'こ'], ['ち', 'そ'], ['ん', 'て'], ['ひ', 'う'], ['わ', 'も']
            ],
            normal: [
                ['さ', 'ち'], ['は', 'ほ'], ['る', 'ろ'], ['ね', 'れ'], ['ク', 'ワ'],
                ['タ', 'ケ'], ['ア', 'マ'], ['ソ', 'ン'], ['シ', 'ツ'], ['コ', 'ユ'],
                ['き', 'さ'], ['け', 'は'], ['ぬ', 'ね'], ['ろ', 'ら'], ['め', 'の']
            ],
            hard: [
                ['ぬ', 'め'], ['わ', 'れ'], ['ね', 'わ'], ['シ', 'ツ'], ['ソ', 'リ'],
                ['大', '太'], ['石', '右'], ['日', '曰'], ['人', '入'], ['八', '人'],
                ['口', 'ロ'], ['二', '乙'], ['王', '玉'], ['土', '士'], ['千', '干']
            ]
        };
    }

    setupEvents() {
        document.getElementById('lvl-easy').addEventListener('click', () => this.setLevel('easy'));
        document.getElementById('lvl-normal').addEventListener('click', () => this.setLevel('normal'));
        document.getElementById('lvl-hard').addEventListener('click', () => this.setLevel('hard'));
        
        document.getElementById('btn-moji-hint').addEventListener('click', () => {
            if (this.app.isLocked) return;
            this.hint();
        });
        document.getElementById('btn-moji-next').addEventListener('click', () => {
            if (this.app.isLocked) return;
            this.initGame();
        });

        // イベントデリゲーション
        const container = document.getElementById('moji-container');
        container.addEventListener('click', (e) => {
            if (this.app.isLocked) return; // 連打防止
            const cell = e.target.closest('.moji-cell');
            if (!cell) return;
            const index = parseInt(cell.getAttribute('data-index'), 10);
            this.handleCellClick(cell, index);
        });

        // 【高精度化】タブ非表示を検知してタイマーを一時停止/再開
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }

    onActivate() {
        if (this.mojiTgt === '') {
            this.setLevel('easy', false);
            this.initGame();
        } else {
            this.resumeTimer();
        }
        this.app.setMaron('ちがうもじ<br>どれ？');
    }

    handleVisibilityChange() {
        if (this.app.tabId !== 'tab-moji') return;
        if (document.hidden) {
            this.pauseTimer();
        } else {
            this.resumeTimer();
        }
    }

    setLevel(level, shouldInit = true) {
        if (this.app.isLocked) return;
        this.app.audio.playSfx('click');
        if (!Object.hasOwn(this.mojiList, level)) return;
        this.level = level;
        ['easy', 'normal', 'hard'].forEach(x => {
            const btn = document.getElementById(`lvl-${x}`);
            btn.setAttribute('aria-pressed', String(x === level));
            btn.className = `px-2 py-1 rounded-md transition ${x === level ? 'bg-pink-100 text-pink-700' : 'text-slate-400'}`;
        });
        if (shouldInit) this.initGame();
    }

    startTimer() {
        this.stopTimer();
        if (this.app.isLocked || this.app.isModalOpen || this.app.tabId !== 'tab-moji' || document.hidden) return;
        this.mSt = Date.now();
        this.mIv = setInterval(() => {
            const elapsed = this.elapsedMs + (Date.now() - this.mSt);
            document.getElementById('timer').textContent = (elapsed / 1000).toFixed(1);
        }, 100);
    }

    stopTimer() {
        if (this.mIv) {
            clearInterval(this.mIv);
            this.mIv = null;
        }
    }

    pauseTimer() {
        if (!this.mIv) return;
        this.elapsedMs += Date.now() - this.mSt;
        this.stopTimer();
    }

    resumeTimer() {
        if (this.mIv) return;
        this.mSt = Date.now();
        this.startTimer();
    }

    initGame() {
        this.wrongTimers.forEach(timer => clearTimeout(timer));
        this.wrongTimers.clear();
        // 現在のレベルに対応するペアリストを取得
        const list = this.mojiList[this.level] || this.mojiList.easy;
        const p = list[Math.floor(Math.random() * list.length)];
        
        // どちらをベース（多数）にし、どちらをターゲット（正解）にするかもランダム化
        const swap = Math.random() > 0.5;
        const base = swap ? p[1] : p[0];
        const tgt = swap ? p[0] : p[1];
        this.mojiTgt = tgt;
        
        document.getElementById('target-char').textContent = tgt;
        const g = document.getElementById('moji-container');
        g.innerHTML = '';
        
        let cols = 3;
        if (this.level === 'normal') cols = 4;
        if (this.level === 'hard') cols = 5;
        g.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        
        const n = cols * cols;
        const ti = Math.floor(Math.random() * n);
        this.correctIndex = ti;
        
        for (let i = 0; i < n; i++) {
            const d = document.createElement('button');
            d.type = 'button';
            d.className = "moji-cell";
            d.id = `moji-cell-${i}`;
            d.setAttribute('data-index', i);
            d.textContent = (i === ti) ? tgt : base;
            d.setAttribute('aria-label', `${d.textContent}の文字マス`);
            g.appendChild(d);
        }
        this.elapsedMs = 0;
        document.getElementById('timer').textContent = "0.0";
        this.startTimer();
    }

    handleCellClick(cell, index) {
        if (index === this.correctIndex) {
            this.pauseTimer();
            cell.setAttribute('aria-label', `${cell.textContent}、正解`);
            document.querySelectorAll('.moji-cell').forEach((button) => {
                button.disabled = true;
            });
            this.app.showHanamaru(() => this.initGame());
        } else {
            this.app.audio.playSfx('ng');
            cell.style.background = "#FECACA";
            clearTimeout(this.wrongTimers.get(cell));
            this.wrongTimers.set(cell, setTimeout(() => {
                cell.style.background = '';
                this.wrongTimers.delete(cell);
            }, 200));
        }
    }

    hint() {
        this.app.audio.playSfx('pop');
        const cell = document.getElementById(`moji-cell-${this.correctIndex}`);
        if (cell) {
            cell.classList.add('moji-hint');
            
            // ヒントは次問まで表示する。無限アニメーションに終了リスナーを積まない。
        }
    }
}

// --- App (全体管理) ---
class ManabiLandApp {
    constructor() {
        this.audio = new AudioManager();
        this.tabId = 'tab-moji';
        this.moneyGame = new MoneyGame(this);
        this.clockGame = new ClockGame(this);
        this.mojiGame = new MojiGame(this);
        this.isModalOpen = false;
        this.isLocked = false; // 連打バグ防止用のグローバルロック
        this.stars = 0; // 星スタンプ数 (3個でコンプリート)
    }

    init() {
        this.audio.updateSoundButton();
        this.moneyGame.setupEvents();
        this.clockGame.setupEvents();
        this.mojiGame.setupEvents();
        this.setupTabEvents();
        this.setupParentsDialog();
        document.getElementById('sound-btn').addEventListener('click', () => this.audio.toggleMute());
        this.updateStarsUI();

        // タブ切り替え時に音声をサスペンド/レジュームする
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.clockGame.cancelPointer();
                this.audio.suspend();
            } else {
                this.audio.resume();
            }
        });

        window.addEventListener('pagehide', () => {
            this.clockGame.cancelPointer();
            this.mojiGame.pauseTimer();
            this.audio.suspend();
        });
        window.addEventListener('pageshow', () => {
            if (this.tabId === 'tab-moji') this.mojiGame.resumeTimer();
            if (!document.hidden) this.audio.resume();
        });
        window.addEventListener('storage', event => {
            if (event.key !== null && event.key !== MANABI_PROFILE_KEY) return;
            this.audio.cancelPending();
            this.audio.loadSettings();
            this.audio.updateSoundButton();
        });

        // 初期表示タブ
        this.switchTab('tab-money', false);
    }

    setupParentsDialog() {
        const dialog = document.getElementById('parents-modal');
        const openButton = document.querySelector('[data-action="parents-modal-open"]');
        if (!dialog || !openButton) return;
        const closed = () => {
            if (!this.isModalOpen) return;
            this.isModalOpen = false;
            openButton.setAttribute('aria-expanded', 'false');
            openButton.focus();
            if (this.tabId === 'tab-moji') this.mojiGame.resumeTimer();
        };
        const close = () => {
            if (typeof dialog.close === 'function') dialog.close();
            else dialog.removeAttribute('open');
            closed();
        };
        openButton.addEventListener('click', () => {
            if (this.isModalOpen) return;
            this.clockGame.cancelPointer();
            this.mojiGame.pauseTimer();
            this.audio.cancelPending();
            this.isModalOpen = true;
            if (typeof dialog.showModal === 'function') dialog.showModal();
            else dialog.setAttribute('open', '');
            openButton.setAttribute('aria-expanded', 'true');
            dialog.querySelector('[data-action="parents-modal-close"]').focus();
        });
        dialog.querySelectorAll('[data-action="parents-modal-close"]').forEach(button => {
            button.addEventListener('click', close);
        });
        dialog.addEventListener('close', () => { if (!dialog.open) closed(); });
        dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
        dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    }

    setMaron(msg, face = 'normal') {
        document.getElementById('maron-msg').innerHTML = msg;
        const b = document.getElementById('maron-header');
        b.className = 'maron-body';
        if (face === 'happy') b.classList.add('maron-happy');
    }

    updateStarsUI() {
        for (let i = 1; i <= 3; i++) {
            const el = document.getElementById(`star-${i}`);
            if (el) {
                if (i <= this.stars) {
                    el.classList.add('text-yellow-400');
                    el.classList.remove('text-slate-300');
                } else {
                    el.classList.add('text-slate-300');
                    el.classList.remove('text-yellow-400');
                }
            }
        }
    }

    showHanamaru(nextQuestion) {
        if (this.isLocked) return;
        this.clockGame.cancelPointer();
        this.isLocked = true; // 正解演出中は操作を完全ロック
        this.audio.playSfx('ok');
        
        // 星を増やす
        this.stars++;
        this.updateStarsUI();

        const ov = document.getElementById('hanamaru-overlay');
        const svg = ov.querySelector('svg');
        ov.classList.remove('show');
        void ov.offsetWidth; 
        const newSvg = svg.cloneNode(true);
        ov.replaceChild(newSvg, svg);
        ov.classList.add('show');
        this.setMaron('すごい！<br>せいかい！', 'happy');

        setTimeout(() => {
            ov.classList.remove('show');
            // 問題更新と演出を同じタイマーで進め、各ゲームからロックを解除しない。
            if (typeof nextQuestion === 'function') nextQuestion();
            if (this.stars >= 3) {
                this.completeStars();
            } else {
                this.finishFeedback();
            }
        }, 1500);
    }

    completeStars() {
        this.isLocked = true;
        this.stars = 0; // リセット
        
        // ファンファーレ
        setTimeout(() => {
            this.audio.playSfx('perfect');
            this.setMaron('★3つコンプリート！<br>おめでとう！！', 'happy');
            this.createStarConfetti();
            
            // 星スタンプを点滅させる
            for (let i = 1; i <= 3; i++) {
                const el = document.getElementById(`star-${i}`);
                if (el) el.classList.add('star-blink');
            }

            setTimeout(() => {
                this.updateStarsUI();
                for (let i = 1; i <= 3; i++) {
                    const el = document.getElementById(`star-${i}`);
                    if (el) el.classList.remove('star-blink');
                }
                this.finishFeedback();
            }, 3000);
        }, 300);
    }

    finishFeedback() {
        this.isLocked = false;
        if (this.tabId === 'tab-moji') this.mojiGame.resumeTimer();
    }

    createStarConfetti() {
        const colors = ['#FFD700', '#FFDF00', '#FFEC00', '#FFF200', '#FFF900'];
        for (let i = 0; i < 40; i++) {
            const star = document.createElement('div');
            star.className = 'star-confetti';
            star.style.left = `${Math.random() * 100}vw`;
            star.style.animationDelay = `${Math.random() * 0.5}s`;
            star.textContent = '★';
            star.style.color = colors[Math.floor(Math.random() * colors.length)];
            star.style.fontSize = `${Math.random() * 20 + 20}px`;
            document.body.appendChild(star);
            setTimeout(() => star.remove(), 3000);
        }
    }

    setupTabEvents() {
        MANABI_TABS.forEach((id, index) => {
            const navBtn = document.getElementById(`nav-${id}`);
            navBtn.addEventListener('click', () => {
                if (this.isLocked) return;
                this.switchTab(`tab-${id}`);
            });
            navBtn.addEventListener('keydown', event => {
                const destination = event.key === 'ArrowRight' ? (index + 1) % 3
                    : event.key === 'ArrowLeft' ? (index + 2) % 3
                    : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : null;
                if (destination === null) return;
                event.preventDefault();
                if (this.isLocked) return;
                this.switchTab(`tab-${MANABI_TABS[destination]}`);
                document.getElementById(`nav-${MANABI_TABS[destination]}`).focus();
            });
        });
    }

    switchTab(id, shouldPlaySound = true) {
        if (this.isLocked) return;
        if (!MANABI_TABS.some(tab => id === `tab-${tab}`)) return;
        this.clockGame.cancelPointer();
        this.audio.cancelPending?.();
        if (shouldPlaySound) this.audio.playSfx('click');
        if (this.tabId === 'tab-moji') {
            this.mojiGame.pauseTimer();
        }

        // タブコンテンツ切り替え
        document.querySelectorAll('.tab-content').forEach(e => {
            e.classList.remove('active', 'fade-enter');
        });
        const target = document.getElementById(id);
        target.classList.add('active', 'fade-enter');

        // ナビゲーション切り替え
        document.querySelectorAll('.nav-item').forEach(e => {
            e.classList.remove('active');
            e.setAttribute('aria-selected', 'false');
            e.tabIndex = -1;
        });
        const navBtn = document.getElementById(`nav-${id.split('-')[1]}`);
        if (navBtn) {
            navBtn.classList.add('active');
            navBtn.setAttribute('aria-selected', 'true');
            navBtn.tabIndex = 0;
        }

        this.tabId = id;
        if (id === 'tab-money') {
            this.moneyGame.onActivate();
        } else if (id === 'tab-clock') {
            this.clockGame.onActivate();
        } else if (id === 'tab-moji') {
            this.mojiGame.onActivate();
        }
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        const app = new ManabiLandApp();
        app.init();
    }, { once: true });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normalizeClockHour,
        normalizeClockMinute,
        shiftClockByFiveMinutes
    };
}

