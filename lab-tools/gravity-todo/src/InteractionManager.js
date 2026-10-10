export class InteractionManager {
  constructor(engine, render, world, onDestroyTask, onOpenDetail) {
    this.engine = engine;
    this.render = render;
    this.world = world;
    this.onDestroyTask = onDestroyTask;
    this.onOpenDetail = onOpenDetail || null;
    this.touchStart = null;
    this.lastTapTime = 0;
    this.lastTapBody = null;

    // 長押し用（爆破）
    this.longPressTimer = null;
    this.longPressTriggered = false;
    this.longPressBody = null;
    this.LONG_PRESS_MS = 700;

    // ダブルクリック用（詳細パネル）
    this.lastClickTime = 0;
    this.lastClickBody = null;
    this.DOUBLE_CLICK_MS = 350;

    // Matter.js aliases
    this.Mouse = Matter.Mouse;
    this.MouseConstraint = Matter.MouseConstraint;
    this.Composite = Matter.Composite;
    this.Query = Matter.Query;

    this.setupInteractions();
  }

  setupInteractions() {
    const mouse = this.Mouse.create(this.render.canvas);
    // Retina display: Matter.js内部座標に合わせる
    const dpr = window.devicePixelRatio || 1;
    mouse.pixelRatio = dpr;

    const mouseConstraint = this.MouseConstraint.create(this.engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false }
      }
    });
    this.Composite.add(this.world, mouseConstraint);
    this.render.mouse = mouse;

    // ---------- PC: mousedown ----------
    // 長押し(700ms) → 爆破
    // ダブルクリック(350ms以内に2回) → 詳細パネル
    this.render.canvas.addEventListener('mousedown', (e) => {
      const { x, y } = this._canvasCoords(e.clientX, e.clientY);
      const taskBody = this.findTaskAtPoint(x, y);
      this.longPressTriggered = false;
      this.mouseDownPos = { x: e.clientX, y: e.clientY };

      const now = Date.now();

      // ダブルクリック判定: 350ms以内に同じボディを再クリック
      if (taskBody && now - this.lastClickTime < this.DOUBLE_CLICK_MS && taskBody === this.lastClickBody) {
        this._cancelLongPress();
        if (this.onOpenDetail) this.onOpenDetail(taskBody);
        this.lastClickTime = 0;
        this.lastClickBody = null;
        return;
      }
      this.lastClickTime = now;
      this.lastClickBody = taskBody;

      // 長押し検知 → 爆破
      if (taskBody) {
        taskBody.isPressing = true;
        taskBody.pressStartTime = Date.now();
        this.longPressBody = taskBody;
        this.longPressTimer = setTimeout(() => {
          this.longPressTriggered = true;
          this.onDestroyTask(taskBody);
        }, this.LONG_PRESS_MS);
      }
    });

    this.render.canvas.addEventListener('mousemove', (e) => {
      // マウスが8px以上動いたら長押しキャンセル（ドラッグ操作と区別）
      if (this.mouseDownPos && this.longPressTimer) {
        const dist = Math.hypot(
          e.clientX - this.mouseDownPos.x,
          e.clientY - this.mouseDownPos.y
        );
        if (dist > 8) this._cancelLongPress();
      }
    });

    this.render.canvas.addEventListener('mouseup', () => {
      this._cancelLongPress();
      this.mouseDownPos = null;
    });

    // dblclickはブラウザデフォルトのテキスト選択を防ぐため残す
    this.render.canvas.addEventListener('dblclick', (e) => {
      e.preventDefault();
    });

    // ---------- Mobile: touch ----------
    this.render.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const { x, y } = this._canvasCoords(
          e.touches[0].clientX, e.touches[0].clientY
        );

        const body = this.findTaskAtPoint(x, y);
        if (body) e.preventDefault();
        this.touchStart = { x, y, time: Date.now(), body };
        this.longPressTriggered = false;

        const now = Date.now();

        // ダブルタップ判定: 350ms以内に同じボディを再タップ → 詳細パネル
        if (body && now - this.lastTapTime < this.DOUBLE_CLICK_MS && body === this.lastTapBody) {
          this._cancelLongPress();
          if (this.onOpenDetail) this.onOpenDetail(body);
          this.lastTapTime = 0;
          this.lastTapBody = null;
          return;
        }
        this.lastTapTime = now;
        this.lastTapBody = body;

        // 長押し検知 → 爆破
        if (body) {
          body.isPressing = true;
          body.pressStartTime = Date.now();
          this.longPressBody = body;
          this.longPressTimer = setTimeout(() => {
            this.longPressTriggered = true;
            this.onDestroyTask(body);
          }, this.LONG_PRESS_MS);
        }
      }
    }, { passive: false });

    this.render.canvas.addEventListener('touchmove', (e) => {
      if (!this.touchStart) return;
      const { x, y } = this._canvasCoords(
        e.touches[0].clientX, e.touches[0].clientY
      );
      const dist = Math.hypot(x - this.touchStart.x, y - this.touchStart.y);
      if (this.touchStart.body) e.preventDefault();
      // 15px以上動いたら長押しキャンセル（スワイプやドラッグ）
      if (dist > 15) {
        this._cancelLongPress();
      }
    }, { passive: false });

    this.render.canvas.addEventListener('touchend', () => {
      this._cancelLongPress();
      this.touchStart = null;
    }, { passive: false });
  }

  _canvasCoords(clientX, clientY) {
    // Matter.jsの物理ワールドはCSS座標空間で動作するため、
    // DPRスケーリングは行わない（canvas.widthはdpr倍だが物理座標は等倍）
    const rect = this.render.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  _cancelLongPress() {
    if (this.longPressBody) {
      this.longPressBody.isPressing = false;
      this.longPressBody.pressStartTime = null;
      this.longPressBody = null;
    }
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  findTaskAtPoint(x, y) {
    const bodies = this.Composite.allBodies(this.world);
    const clickedBodies = this.Query.point(bodies, { x, y });

    for (const body of clickedBodies) {
      if (body.label === 'task') {
        return body;
      }
    }

    return null;
  }
}
