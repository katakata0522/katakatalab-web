import { ParticleSystem } from './ParticleSystem.js';
import { StorageManager } from './StorageManager.js';
import { UIManager } from './UIManager.js';
import { TaskRenderer } from './TaskRenderer.js';
import { InteractionManager } from './InteractionManager.js';
import { SoundManager } from './SoundManager.js';
import { SettingsManager } from './SettingsManager.js';
import { TaskDetailPanel } from './TaskDetailPanel.js';
import { BGMManager } from './BGMManager.js';
import { GyroManager } from './GyroManager.js';
import { TimeTheme } from './TimeTheme.js';
import { shouldPersistTaskState } from './persistPolicy.js';

const MAX_RESTORED_TASKS = 100;

export class PhysicsEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Canvas container #${containerId} not found.`);
    }

    this.Engine    = Matter.Engine;
    this.Render    = Matter.Render;
    this.Runner    = Matter.Runner;
    this.Bodies    = Matter.Bodies;
    this.Body      = Matter.Body;
    this.Composite = Matter.Composite;
    this.Events    = Matter.Events;

    this.engine = this.Engine.create();
    this.world  = this.engine.world;
    this.width  = window.innerWidth;
    this.height = window.innerHeight;
    this.isNukingAll    = false;
    this.userMutatedStorage = false;
    this.storageReady = false;
    this.nukeTimeoutIds = [];
    this.dpr = window.devicePixelRatio || 1;

    this.render = this.Render.create({
      element: this.container,
      engine:  this.engine,
      options: {
        width: this.width,
        height: this.height,
        wireframes: false,
        background: 'transparent',
        pixelRatio: this.dpr,
      },
    });

    this.ctx = this.render.context;

    // Sub-modules
    this.particleSystem = new ParticleSystem(this.ctx);
    this.soundManager   = new SoundManager();
    this.uiManager      = new UIManager();
    this.uiManager.reduceMotion = () => this.reducedEffects();
    this.taskRenderer   = new TaskRenderer(this.ctx);
    this.bgmManager     = new BGMManager();
    this.gyroManager    = new GyroManager(this.engine);
    this.timeTheme      = new TimeTheme();
    this.timeTheme.startAutoUpdate();
    this.taskDetailPanel = new TaskDetailPanel();
    this.taskDetailPanel.onExplodeRequest = (body) => this.destroyTask(body);
    this.taskDetailPanel.onChanged = () => {
      this.redoStack = [];
      this.updateBlockDensity(this.taskDetailPanel.currentBody);
      void this.persistTasks();
      this.syncTaskList();
    };
    this.taskDetailPanel.onOpenStateChange = (isOpen) => {
      this.runner.enabled = !isOpen; // モーダル展開中は物理演算をポーズ
    };

    this.initWorld();

    this.interactionManager = new InteractionManager(
      this.engine, this.render, this.world,
      (body) => this.destroyTask(body),
      (body) => this.taskDetailPanel.open(body)
    );
    this.syncTaskList();
    this.uiManager.updateDestroyCount(StorageManager.getDestroyCount());

    // レンダリング開始
    this.Render.run(this.render);
    this.runner = this.Runner.create();
    this.Runner.run(this.runner, this.engine);

    this.Events.on(this.render, 'afterRender', () => {
      const bodies = this.Composite.allBodies(this.world);
      this.taskRenderer.draw(bodies);
      this.particleSystem.updateAndDraw();
    });

    // 画面外に飛んでいったブロックを自動で上空に戻す（Auto-Rescue）
    this.Events.on(this.engine, 'afterUpdate', () => {
      const margin = 500; // 画面外の許容範囲
      const bodies = this.getTaskBodies();
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (b.position.y > this.height + margin || b.position.x < -margin || b.position.x > this.width + margin) {
          // 画面上部中央へテレポート
          this.Body.setPosition(b, { x: this.width / 2, y: -50 });
          this.Body.setVelocity(b, { x: 0, y: 0 });
          this.Body.setAngularVelocity(b, 0);
        }
      }
    });

    // レイアウト確定後にタスク復元（床位置が正確になるのを待つ）
    this.ready = new Promise((resolve) => {
      requestAnimationFrame(() => {
        // app-readyクラス追加後の一次レイアウトを待つ
        setTimeout(async () => {
          this.rebuildFloor();
          await this.restoreTasks();
          resolve();
        }, 100);

        // CSSトランジション(0.5s)完了後に、最終的な正確な位置で床を再構築
        // これにより、入力フォームにブロックがめり込むのを防ぎます
        setTimeout(() => {
          this.rebuildFloor();
        }, 650);
      });
    });

    this.autoSaveIntervalId = window.setInterval(() => {
      void this.persistTasks();
    }, 30 * 60 * 1000); // 30分ごとに自動保存

    this.resizeHandler = this.debounce(() => this.handleResize(), 200);
    window.addEventListener('resize', this.resizeHandler);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void this.persistTasks();
    });
    window.addEventListener('pagehide', () => {
      void this.persistTasks();
    });
  }

  // ---------- 床Y座標をフォーム上端から動的取得 ----------
  getFloorY() {
    const inputEl = document.querySelector('.input-container');
    if (!inputEl) return this.height - 200;
    return inputEl.getBoundingClientRect().top;
  }

  createWorldBounds() {
    const wallOpts = {
      isStatic: true,
      render: { fillStyle: '#000000', opacity: 0 },
      friction: 0.5,
    };
    const thickness = 200;
    const floorY = this.getFloorY();

    return {
      ground:    this.Bodies.rectangle(this.width / 2, floorY + thickness / 2, this.width * 2, thickness, wallOpts),
      leftWall:  this.Bodies.rectangle(-100, this.height / 2, 200, this.height * 3, wallOpts),
      rightWall: this.Bodies.rectangle(this.width + 100, this.height / 2, 200, this.height * 3, wallOpts),
    };
  }

  initWorld() {
    const bounds = this.createWorldBounds();
    this.ground    = bounds.ground;
    this.leftWall  = bounds.leftWall;
    this.rightWall = bounds.rightWall;
    this.Composite.add(this.world, [this.ground, this.leftWall, this.rightWall]);
  }

  // 床を再構築する（リサイズ・初回用）
  rebuildFloor() {
    this.Composite.remove(this.world, this.ground);
    this.Composite.remove(this.world, this.leftWall);
    this.Composite.remove(this.world, this.rightWall);
    const bounds = this.createWorldBounds();
    this.ground    = bounds.ground;
    this.leftWall  = bounds.leftWall;
    this.rightWall = bounds.rightWall;
    this.Composite.add(this.world, [this.ground, this.leftWall, this.rightWall]);
  }

  // --- ブロックプロパティの計算ヘルパー ---
  _calculateBlockDimensions(safeText) {
    let w = Math.max(120, safeText.length * 18 + 40);
    let h = 48;
    const isImportant = safeText.includes('!') || safeText.includes('！');
    if (isImportant) {
      w *= 1.4;
      h *= 1.4;
    }
    return { w, h, isImportant };
  }

  _calculateBlockPhysics(blockColor, isImportant, safeText) {
    const isPinned = safeText.startsWith('@') || safeText.startsWith('＠');
    let restitution = 0.4;
    let density = 0.05;

    if (blockColor === '#b71c1c') {
      restitution = 0.9;
      density = 0.04;
    } else if (blockColor === '#0f3460') {
      restitution = 0.1;
      density = 0.15;
    }
    if (isImportant) density *= 2.0;

    return { restitution, density, isStatic: isPinned };
  }

  addTask(text, x = null, y = null, angle = 0, options = {}) {
    if (this.storageReady === false) return;
    const safeText = text.replace(/[<>"'`]/g, '').substring(0, 20);
    if (!safeText) return;

    const { w, h, isImportant } = this._calculateBlockDimensions(safeText);

    const startX = x !== null ? x : this.width / 2 + (Math.random() * 40 - 20);
    const startY = y !== null ? y : -50;

    const blockColor  = options.blockColor  || SettingsManager.getBlockColor();
    const blockBorder = options.blockBorder || SettingsManager.getBlockBorder();

    const physics = this._calculateBlockPhysics(blockColor, isImportant, safeText);

    const block = this.Bodies.rectangle(startX, startY, w, h, {
      label: 'task',
      angle: angle,
      restitution: physics.restitution,
      friction: 0.8,
      density: physics.density,
      isStatic: physics.isStatic,
      chamfer: { radius: 8 },
      render: {
        fillStyle:   blockColor,
        strokeStyle: blockBorder,
        lineWidth: 2.5,
      },
    });

    block.taskText = safeText;
    block.subTasks = Array.isArray(options.subTasks) ? options.subTasks : [];
    block.isImportant = isImportant;
    block.isDemo = options.isDemo === true;
    this.Composite.add(this.world, block);

    if (options.isDemo !== true) this.userMutatedStorage = true;
    if (options.persist !== false) void this.persistTasks();
    this.uiManager.updateNukeButtonVisibility(this.getTaskCount());
    this.syncTaskList();
    return block;
  }

  // 全ブロックの色を一括変更
  recolorAllBlocks() {
    const color  = SettingsManager.getBlockColor();
    const border = SettingsManager.getBlockBorder();
    this.getTaskBodies().forEach(body => {
      body.render.fillStyle   = color;
      body.render.strokeStyle = border;
    });
  }

  async restoreTasks() {
    if (this.restoringState || this.restoredState) return;
    this.restoringState = true;
    this.storageReady = false;
    const state = await StorageManager.loadState();
    this.restoringState = false;
    if (state.ok === false || state.tasks.length > MAX_RESTORED_TASKS) {
      // Do not truncate and immediately persist a partially restored collection.
      StorageManager.writeBlocked = true;
      this.showSaveStatus({ ok: false });
      document.dispatchEvent(new CustomEvent('gravity:storageStatus'));
      return;
    }
    this.storageReady = true;
    this.restoredState = true;
    this.showSaveStatus({ ok: true });
    document.dispatchEvent(new CustomEvent('gravity:storageStatus'));
    const { hasSavedState, tasks } = state;
    if (!hasSavedState) {
      const cx = this.width / 2;
      const floor = this.getFloorY();

      // 1. ピン留め（青色・空中固定）
      setTimeout(() => this.addTask('@📌 1. 空中にピン留め!', cx - 150, 150, 0.1, {
        blockColor: '#0f3460', blockBorder: '#4a90e2', persist: false, isDemo: true
      }), 400);

      // 2. ドラッグ（緑色・標準・やや高めから落下）
      setTimeout(() => this.addTask('👆 2. ドラッグで掴めるよ', cx + 150, floor - 400, -0.1, {
        blockColor: '#1b5e20', blockBorder: '#4caf50', persist: false, isDemo: true
      }), 1200);

      // 3. 爆破（赤色・巨大・ボヨンボヨン跳ねる）
      // 「!」が含まれるため自動的に1.4倍の巨大サイズになり、赤色指定でバウンドする
      setTimeout(() => this.addTask('🔥 3. 長押しで爆破!! 💥!', cx, floor - 800, 0, {
        blockColor: '#b71c1c', blockBorder: '#ff5252', persist: false, isDemo: true
      }), 2200);

      document.dispatchEvent(new CustomEvent('gravity:firstVisit'));
    } else {
      this.userMutatedStorage = true;
      tasks.slice(0, MAX_RESTORED_TASKS).forEach(t => {
        const safeX = (t.x < 0 || t.x > this.width) ? this.width / 2 : t.x;
        const safeY = t.y > this.getFloorY() ? this.getFloorY() - 100 : t.y;
        this.addTask(t.text, safeX, safeY, t.angle, {
          persist: false,
          subTasks: t.subTasks || [],
          blockColor:  t.blockColor  || null,
          blockBorder: t.blockBorder || null,
        });
      });
      if (tasks.length > 0) void this.persistTasks();
    }
    this.uiManager.updateNukeButtonVisibility(this.getTaskCount());
  }

  persistTasks() {
    if (this.storageReady === false) {
      this.showSaveStatus({ ok: false });
      return Promise.resolve({ ok: false, skipped: true });
    }
    const bodies = this.getTaskBodies();
    const persistableCount = bodies.filter((body) => body.isDemo !== true).length;
    if (!shouldPersistTaskState({
      persistableCount,
      userMutated: this.userMutatedStorage
    })) {
      return Promise.resolve({ ok: true, skipped: true });
    }
    const revision = this.saveRevision = (this.saveRevision || 0) + 1;
    this.showSaveStatus({ pending: true });
    return StorageManager.saveTasks(this.Composite.allBodies(this.world)).then((result) => {
      if (revision === this.saveRevision) this.showSaveStatus(result);
      return result;
    });
  }

  showSaveStatus(result) {
    const status = document.getElementById('save-status');
    const retry = document.getElementById('retry-storage');
    if (retry) retry.hidden = this.storageReady !== false;
    if (!status) return;
    if (this.storageReady === false) {
      status.textContent = '保存済みタスクを読み込めていません。上書きを防ぐため追加・削除と保存を停止しています。再読み込みを試してください。';
      status.hidden = false;
      return;
    }
    if (result && result.pending) {
      status.textContent = 'この端末に保存中です。表示が消えるまで画面を開いておいてください。';
      status.hidden = false;
      return;
    }
    if (result && result.ok === false) {
      status.textContent = 'この端末に保存できませんでした。ブラウザの保存領域を確認してください。';
      status.hidden = false;
      return;
    }
    status.textContent = '';
    status.hidden = true;
  }

  destroyTask(body, skipUndo = false, options = {}) {
    if (this.storageReady === false) return;
    if (!body || body.label !== 'task' || body._destroyed || !this.getTaskBodies().includes(body)) return;
    
    // Undo用のデータをクローン
    const taskData = {
      text: body.taskText,
      x: body.position.x,
      y: body.position.y,
      angle: body.angle,
      subTasks: body.subTasks ? JSON.parse(JSON.stringify(body.subTasks)) : [],
      blockColor: body.render.fillStyle,
      blockBorder: body.render.strokeStyle,
      isDemo: body.isDemo === true
    };

    try {
      this.Composite.remove(this.world, body);
      body._destroyed = true;
      if (body._completionTimer != null) clearTimeout(body._completionTimer);
      if (body._floatForce) this.Events.off(this.engine, 'afterUpdate', body._floatForce);
    } catch (e) {
      console.warn('destroyTask: remove failed', e);
      return;
    }

    const gentle = this.reducedEffects();
    void this.soundManager.playExplosion(gentle ? 0.15 : 0.5);
    if (!gentle) {
      void this.soundManager.playCracker(1.2);
      const c = body.render.strokeStyle || '#ff3366';
      this.particleSystem.explode(body.position.x, body.position.y, c);
      this.spawnDebris(body.position.x, body.position.y, body.render.fillStyle, c);
      this.uiManager.triggerShake();
    }

    this.userMutatedStorage = true;
    const reason = options.reason === 'complete' ? 'complete' : 'delete';
    if (!skipUndo && !this.isNukingAll && reason === 'delete' && body.isDemo !== true) {
      const newScore = StorageManager.incrementDestroyCount();
      this.uiManager.updateDestroyCount(newScore);
    }

    void this.persistTasks();
    this.uiManager.updateNukeButtonVisibility(this.getTaskCount());
    this.syncTaskList();

    if (!skipUndo && !this.isNukingAll) {
      this.undoStack ??= [];
      const entry = { data: taskData, reason, restoredBody: null };
      this.undoStack.push(entry);
      this.redoStack = [];
      const message = reason === 'complete' ? 'タスクを完了しました' : 'タスクを爆破しました';
      this.uiManager.showUndo(() => {
        if (this.undoStack.at(-1) === entry) this.undoLastRemoval();
      }, message);
    }
    this.updateHistoryControls();
    return true;
  }

  reducedEffects() {
    return typeof SettingsManager !== 'undefined' && typeof SettingsManager.isReducedMotion === 'function' && SettingsManager.isReducedMotion();
  }

  historyFingerprint(body) {
    return JSON.stringify([body.taskText, body.subTasks || [], body.render?.fillStyle, body.render?.strokeStyle]);
  }

  canRedoRemoval() {
    const entry = this.redoStack?.at(-1);
    return Boolean(entry && entry.restoredBody && !entry.restoredBody._destroyed && this.getTaskBodies().includes(entry.restoredBody) && this.historyFingerprint(entry.restoredBody) === entry.fingerprint);
  }

  updateHistoryControls() {
    const available = this.storageReady !== false && !this.isNukingAll;
    this.uiManager?.setHistoryState?.(available && this.getTaskBodies().length < MAX_RESTORED_TASKS && Boolean(this.undoStack?.length), available && this.canRedoRemoval(), available ? '' : '保存の読み込み中は操作できません');
  }

  undoLastRemoval() {
    if (this.storageReady === false || this.isNukingAll || this.getTaskBodies().length >= MAX_RESTORED_TASKS || !this.undoStack?.length) return false;
    const entry = this.undoStack.at(-1), data = entry.data;
    const x = Number.isFinite(this.width) ? Math.min(Math.max(24, data.x), Math.max(24, this.width - 24)) : data.x;
    const floor = typeof this.getFloorY === 'function' ? this.getFloorY() : this.height;
    const y = Number.isFinite(floor) ? Math.min(Math.max(24, data.y), Math.max(24, floor - 24)) : data.y;
    const body = this.addTask(data.text, x, y, data.angle, {
      persist: true, subTasks: JSON.parse(JSON.stringify(data.subTasks)),
      blockColor: data.blockColor, blockBorder: data.blockBorder, isDemo: data.isDemo
    });
    if (!body) return false;
    this.Body?.setVelocity?.(body, { x: 0, y: 0 });
    this.Body?.setAngularVelocity?.(body, 0);
    this.undoStack.pop();
    entry.restoredBody = body;
    entry.fingerprint = this.historyFingerprint(body);
    (this.redoStack ??= []).push(entry);
    this.updateHistoryControls();
    return true;
  }

  redoLastRemoval() {
    if (this.storageReady === false || this.isNukingAll || !this.canRedoRemoval()) return false;
    const entry = this.redoStack.at(-1);
    if (!this.destroyTask(entry.restoredBody, true, { reason: entry.reason, replay: true })) return false;
    this.redoStack.pop();
    entry.restoredBody = null;
    (this.undoStack ??= []).push(entry);
    this.updateHistoryControls();
    return true;
  }

  nukeAll() {
    if (this.storageReady === false) return;
    if (this.isNukingAll) return;
    this.nukeTimeoutIds = [];

    const bodies = this.getTaskBodies();
    if (bodies.length === 0) return;
    this.isNukingAll = true;
    this.undoStack = []; this.redoStack = [];
    this.updateHistoryControls();

    bodies.forEach((body, i) => {
      const id = setTimeout(() => {
        if (body._destroyed) return;
        try {
          this.Composite.remove(this.world, body);
          body._destroyed = true;
          if (body._completionTimer != null) clearTimeout(body._completionTimer);
          if (body._floatForce) this.Events.off(this.engine, 'afterUpdate', body._floatForce);
        } catch (e) { console.warn('nukeAll: remove failed', e); return; }
        void this.soundManager.playExplosion(0.7);
        const c = body.render.strokeStyle || '#ff3366';
        if (!this.reducedEffects()) {
          this.particleSystem.explode(body.position.x, body.position.y, c);
          this.spawnDebris(body.position.x, body.position.y, body.render.fillStyle, c);
        }
        this.uiManager.updateNukeButtonVisibility(this.getTaskCount());
        this.syncTaskList();
      }, i * 50);
      this.nukeTimeoutIds.push(id);
    });

    if (!this.reducedEffects()) this.uiManager.triggerShake(bodies.length * 50 + 400);

    const finalId = setTimeout(() => {
      void this.persistTasks(); // 保存は最後に1回だけ
      this.uiManager.updateNukeButtonVisibility(this.getTaskCount());
      this.syncTaskList();
      this.isNukingAll = false;
      this.nukeTimeoutIds = [];
      this.updateHistoryControls();
    }, bodies.length * 50 + 100);
    this.nukeTimeoutIds.push(finalId);
  }

  getTaskBodies() {
    return this.Composite.allBodies(this.world).filter(b => b.label === 'task');
  }

  confirmAndNukeAll() {
    const count = this.getTaskCount();
    if (count === 0) return;
    const ok = window.confirm(`${count}件のタスクをすべて爆破します。元に戻せません。実行しますか？`);
    if (ok) this.nukeAll();
  }

  syncTaskList() {
    this.updateHistoryControls();
    this.uiManager?.renderTaskList?.(this.getTaskBodies(), {
      onOpenDetail: (body) => this.taskDetailPanel.open(body),
      onComplete: (body) => this.floatAndExplode(body),
      onDestroy: (body) => this.destroyTask(body)
    });
  }

  getTaskCount() {
    return this.getTaskBodies().length;
  }

  // タスクを上空から降らせて再配置する（整理ボタン用）
  rearrangeTasks() {
    const bodies = this.getTaskBodies();
    if (bodies.length === 0) return;
    
    // 少しずつ時間をずらして上空へワープさせる
    bodies.forEach((body, i) => {
      setTimeout(() => {
        // 壁の内側に収まるランダムなX座標
        const spawnX = this.width * 0.2 + Math.random() * (this.width * 0.6);
        this.Body.setPosition(body, { x: spawnX, y: -50 - Math.random() * 50 });
        this.Body.setVelocity(body, { x: 0, y: 0 });
        this.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2);
      }, i * 40); // 40ms間隔でパラパラと落とす
    });
  }

  // サブタスクの完了率に応じてブロックの密度を変化させる
  updateBlockDensity(body) {
    if (!body || body.label !== 'task' || body._destroyed || !this.getTaskBodies().includes(body)) return;
    const subs = body.subTasks;
    if (!Array.isArray(subs) || subs.length === 0) return;

    const total = subs.length;
    const done  = subs.filter(s => s.done).length;
    const ratio = done / total; // 0.0 ~ 1.0

    // 全部完了 → 浮上して爆破！
    if (ratio >= 1.0) {
      const ok = window.confirm('サブタスクが全部終わりました。親タスクを完了して爆破しますか？');
      if (ok) this.floatAndExplode(body);
      return;
    }

    // 密度を線形に変化: 0.05（未完了）→ 0.005（ほぼ完了）
    const newDensity = 0.05 - (ratio * 0.045);
    this.Body.setDensity(body, newDensity);

    // ブロックの透明度も変化（完了に近づくと明るく発光）
    const glow = ratio * 0.5;
    const baseColor = body.render.strokeStyle || '#ff3366';
    body.render.lineWidth = 2.5 + ratio * 2; // 枠線が太くなる
  }

  // 映画的な物理破片（Debris）の生成
  spawnDebris(x, y, fillStyle, strokeStyle) {
    const debrisCount = 4 + Math.floor(Math.random() * 3); // 4〜6個（少なめに制限）
    const debrisBodies = [];
    
    for (let i = 0; i < debrisCount; i++) {
      const size = 8 + Math.random() * 12; // 小さめの破片
      const angle = Math.random() * Math.PI * 2;
      const speed = 10 + Math.random() * 15;
      
      const debris = this.Bodies.rectangle(x, y, size, size, {
        label: 'debris',
        restitution: 0.6,
        friction: 0.1,
        frictionAir: 0.02,
        render: {
          fillStyle: fillStyle || '#18181b',
          strokeStyle: strokeStyle || '#ff3366',
          lineWidth: 2
        },
        // 破片同士や他のタスクと衝突しない（壁と床のみ衝突）ようにカリングしCPU負荷を削減
        collisionFilter: {
          category: 0x0002,
          mask: 0x0001 // 壁・床のデフォルトカテゴリ(0x0001)とのみ衝突
        }
      });
      
      // 放射状に弾け飛ぶ力を加える
      this.Body.setVelocity(debris, {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed - 5 // やや上向き
      });
      
      // 回転も加える
      this.Body.setAngularVelocity(debris, (Math.random() - 0.5) * 0.5);
      
      debrisBodies.push(debris);
    }
    
    this.Composite.add(this.world, debrisBodies);
    
    // パフォーマンスのため、1.5秒後に自動消滅させる
    setTimeout(() => {
      try {
        this.Composite.remove(this.world, debrisBodies);
      } catch (e) {
        // ignore
      }
    }, 1500);
  }

  // 全サブタスク完了時: ブロックが上に浮かんで弾ける
  floatAndExplode(body) {
    if (this.storageReady === false || !body || body._floating || body._destroyed) return;
    if (this.reducedEffects()) { this.destroyTask(body, false, { reason: 'complete' }); return; }
    body._floating = true; // 二重起動防止フラグ

    // 初期山なりの上向き速度を付与
    this.Body.setVelocity(body, { x: (Math.random() - 0.5) * 3, y: -12 });

    // 重力を打ち消す力を毎フレーム加える（Matter.jsの天井となる座標より上に行くまで続ける）
    // engine.world.gravity.y = 1 のとき、mass * gravity * scaleForce で打ち消す
    const floatForce = () => {
      if (!body.position || body.position.y < -120) return;
      // 重力そのまま上房向へ：重力を反転 + 追加の上向き力
      const gy = this.engine.gravity.y;
      const antiGravity = body.mass * gy * 0.0001; // 重力を完全に打ち消す
      const liftForce   = 0.0005;                  // 追加の浮力
      this.Body.applyForce(body, body.position, { x: 0, y: -(antiGravity + liftForce) });
    };

    body._floatForce = floatForce;
    this.Events.on(this.engine, 'afterUpdate', floatForce);

    // 1.5秒後に爆破（天井層付近まで浮上する時間）
    body._completionTimer = setTimeout(() => {
      body._completionTimer = null;
      this.Events.off(this.engine, 'afterUpdate', floatForce);
      this.destroyTask(body, false, { reason: 'complete' });
    }, 1500);
  }

  handleResize() {
    this.width  = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr    = window.devicePixelRatio || 1;

    this.render.canvas.width  = this.width * this.dpr;
    this.render.canvas.height = this.height * this.dpr;
    this.render.options.width      = this.width;
    this.render.options.height     = this.height;
    this.render.options.pixelRatio = this.dpr;

    if (this.render.canvas.style) {
      this.render.canvas.style.width  = `${this.width}px`;
      this.render.canvas.style.height = `${this.height}px`;
    }

    if (this.render.context && typeof this.render.context.scale === 'function') {
      this.render.context.scale(this.dpr, this.dpr);
    }

    this.rebuildFloor();
  }

  debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  destroy() {
    window.removeEventListener('resize', this.resizeHandler);
    clearInterval(this.autoSaveIntervalId);
    this.nukeTimeoutIds.forEach(id => clearTimeout(id));
    this.gyroManager.destroy();
    this.timeTheme.stop();
    this.Runner.stop(this.runner);
    this.Render.stop(this.render);
  }
}
