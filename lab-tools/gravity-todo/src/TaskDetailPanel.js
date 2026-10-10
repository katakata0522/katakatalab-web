// タスク詳細パネル（サブタスクチェックリスト＋ブロック個別カラー）
export class TaskDetailPanel {
  constructor() {
    this.overlay  = document.getElementById('detail-overlay');
    this.panel    = document.getElementById('task-detail-panel');
    this.titleEl  = document.getElementById('detail-title');
    this.listEl   = document.getElementById('detail-list');
    this.inputEl  = document.getElementById('detail-input');
    this.addForm  = document.getElementById('detail-add-form');
    this.closeBtn = document.getElementById('detail-close-btn');
    this.explodeBtn = document.getElementById('detail-explode-btn');
    this.progressEl = document.getElementById('detail-progress');
    this.subtitleEl = document.getElementById('detail-subtitle');
    this.progressFillEl = document.getElementById('detail-progress-fill');
    this.blockColorInput = document.getElementById('detail-block-color');
    this.borderColorInput = document.getElementById('detail-block-border');

    this.currentBody      = null;
    this.onExplodeRequest = null;
    this.onChanged        = null;
    this.onOpenStateChange = null;

    this._setup();
  }

  _setup() {
    this.closeBtn?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });

    this.addForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this._addSubTask();
    });

    this.explodeBtn?.addEventListener('click', () => {
      const body = this.currentBody;
      this.close();
      if (body && this.onExplodeRequest) this.onExplodeRequest(body);
    });

    // ブロック個別カラー変更
    this.blockColorInput?.addEventListener('input', () => {
      if (!this.currentBody) return;
      this.currentBody.render.fillStyle = this.blockColorInput.value;
      this.onChanged?.();
    });
    this.borderColorInput?.addEventListener('input', () => {
      if (!this.currentBody) return;
      this.currentBody.render.strokeStyle = this.borderColorInput.value;
      this.onChanged?.();
    });
  }

  open(body) {
    if (!body) return;
    this.currentBody = body;
    if (!Array.isArray(body.subTasks)) body.subTasks = [];
    if (this.subtitleEl) this.subtitleEl.textContent = 'MISSION DETAIL';
    if (this.titleEl) this.titleEl.textContent = body.taskText;

    // 現在のブロック色をピッカーに反映
    if (this.blockColorInput) {
      this.blockColorInput.value = this._toHex(body.render.fillStyle) || '#1a1a2e';
    }
    if (this.borderColorInput) {
      this.borderColorInput.value = this._toHex(body.render.strokeStyle) || '#ff3366';
    }

    this._render();
    this.panel?.classList.remove('hidden');
    this.overlay?.classList.remove('hidden');
    document.body.classList.add('detail-open');
    
    // 背景を操作不可にしてフォーカストラップ
    document.getElementById('ui-layer')?.setAttribute('inert', '');
    document.getElementById('canvas-container')?.setAttribute('inert', '');

    this.inputEl?.focus();
    this.onOpenStateChange?.(true);
  }

  close() {
    this.panel?.classList.add('hidden');
    this.overlay?.classList.add('hidden');
    document.body.classList.remove('detail-open');
    
    // 背景の操作不可を解除
    document.getElementById('ui-layer')?.removeAttribute('inert');
    document.getElementById('canvas-container')?.removeAttribute('inert');

    this.currentBody = null;
    this.onOpenStateChange?.(false);
  }

  isOpen() {
    return !this.panel?.classList.contains('hidden');
  }

  // CSS色文字列を#rrggbb形式に変換（input[type=color]用）
  _toHex(color) {
    if (!color || color === 'transparent') return null;
    if (/^#[0-9a-f]{6}$/i.test(color)) return color;
    // rgb()形式を変換
    const m = String(color).match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (m) {
      return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    }
    return null;
  }

  _addSubTask() {
    const raw = this.inputEl?.value ?? '';
    // XSSサニタイズ
    const text = raw.replace(/[<>&"'`]/g, '').trim();
    if (!text || !this.currentBody) return;
    if (!Array.isArray(this.currentBody.subTasks)) this.currentBody.subTasks = [];
    this.currentBody.subTasks.push({ id: Date.now(), text, done: false });
    if (this.inputEl) this.inputEl.value = '';
    this._render();
    this.onChanged?.();
  }

  _render() {
    if (!this.listEl || !this.currentBody) return;
    const subs = this.currentBody.subTasks ?? [];

    // 進捗表示
    const total = subs.length;
    const done = subs.filter(s => s.done).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    if (this.progressEl) {
      this.progressEl.textContent = `${percent}%`;
      this.progressEl.setAttribute('aria-label', total === 0 ? '進捗 0%' : `${done}/${total} 完了`);
    }
    if (this.progressFillEl) {
      this.progressFillEl.style.width = `${percent}%`;
    }

    // リスト再描画
    this.listEl.innerHTML = '';
    if (subs.length === 0) {
      const p = document.createElement('p');
      p.className = 'subtask-empty';
      p.textContent = '細かく分けると、完了した瞬間のブロックが軽くなります。まず1つ追加してみよう。';
      this.listEl.appendChild(p);
      return;
    }

    subs.forEach((task) => {
      const li = document.createElement('li');
      li.className = 'subtask-item' + (task.done ? ' is-done' : '');

      // チェックボタン
      const chk = document.createElement('button');
      chk.className = 'subtask-check';
      chk.setAttribute('aria-pressed', String(task.done));
      chk.setAttribute('aria-label', task.done ? 'チェックを外す' : 'チェックする');
      chk.textContent = task.done ? '✓' : '';
      chk.addEventListener('click', () => {
        task.done = !task.done;
        this._render();
        this.onChanged?.();
      });

      // テキスト
      const span = document.createElement('span');
      span.className = 'subtask-text';
      span.textContent = task.text;

      // 削除ボタン
      const del = document.createElement('button');
      del.className = 'subtask-delete';
      del.setAttribute('aria-label', '削除');
      del.textContent = '×';
      del.addEventListener('click', () => {
        this.currentBody.subTasks = this.currentBody.subTasks.filter(t => t.id !== task.id);
        this._render();
        this.onChanged?.();
      });

      li.appendChild(chk);
      li.appendChild(span);
      li.appendChild(del);
      this.listEl.appendChild(li);
    });
  }
}
