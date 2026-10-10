export class UIManager {
  constructor() {
    this.nukeBtn = document.getElementById('nuke-btn');
    this.body = document.body;
    this.rearrangeBtn = document.getElementById('rearrange-btn');
    this.taskCount = document.getElementById('task-count');
    this.taskMeterFill = document.getElementById('task-meter-fill');
    this.taskSummary = document.getElementById('task-summary');
    this.taskList = document.getElementById('task-list');
    this.taskEmptyState = document.getElementById('task-empty-state');
    this.destroyCount = document.getElementById('destroy-count');
  }

  updateNukeButtonVisibility(taskCount) {
    this.updateTaskStatus(taskCount);
    this.updateRearrangeButtonState(taskCount);
    if (!this.nukeBtn) return;
    if (taskCount >= 5) {
      this.nukeBtn.classList.remove('hidden');
    } else {
      this.nukeBtn.classList.add('hidden');
    }
  }

  updateRearrangeButtonState(taskCount) {
    if (!this.rearrangeBtn) return;
    const disabled = taskCount === 0;
    this.rearrangeBtn.disabled = disabled;
    this.rearrangeBtn.setAttribute('aria-disabled', String(disabled));
    this.rearrangeBtn.classList.toggle('is-disabled', disabled);
  }

  updateTaskStatus(taskCount, maxTasks = 100) {
    if (this.taskCount) {
      this.taskCount.textContent = String(taskCount);
    }

    if (this.taskMeterFill) {
      const ratio = Math.max(0, Math.min(taskCount / maxTasks, 1));
      this.taskMeterFill.style.width = `${ratio * 100}%`;
    }
  }

  updateDestroyCount(count) {
    if (this.destroyCount) {
      this.destroyCount.textContent = String(count);
      // ちょっとしたアニメーション
      this.destroyCount.style.transform = 'scale(1.3)';
      setTimeout(() => {
        this.destroyCount.style.transform = 'scale(1)';
      }, 150);
    }
  }

  renderTaskList(tasks = [], actions = {}) {
    const taskItems = Array.isArray(tasks) ? tasks.filter(task => task?.taskText) : [];
    const total = taskItems.length;
    const progress = this.calculateOverallProgress(taskItems);

    if (this.taskSummary) {
      this.taskSummary.textContent = total === 0 ? '0件' : `${total}件 / 進捗 ${progress}%`;
    }

    if (!this.taskList || !this.taskEmptyState) return;

    this.taskList.innerHTML = '';
    this.taskList.classList.toggle('hidden', total === 0);
    this.taskEmptyState.classList.toggle('hidden', total > 0);

    const fragment = document.createDocumentFragment();

    taskItems.forEach((task) => {
      const item = document.createElement('article');
      item.className = 'task-list-item';

      const main = document.createElement('div');
      main.className = 'task-list-main';

      const title = document.createElement('strong');
      title.className = 'task-list-title';
      title.textContent = task.taskText;

      const meta = document.createElement('span');
      meta.className = 'task-list-meta';
      meta.textContent = this.formatTaskProgress(task);

      main.append(title, meta);

      const controls = document.createElement('div');
      controls.className = 'task-list-actions';

      const detailBtn = this.createTaskActionButton('詳細', 'detail', `${task.taskText}の詳細を開く`, () => actions.onOpenDetail?.(task));
      const completeBtn = this.createTaskActionButton('完了', 'complete', `${task.taskText}を完了`, () => actions.onComplete?.(task));
      const destroyBtn = this.createTaskActionButton('×', 'destroy', `${task.taskText}を削除`, () => actions.onDestroy?.(task));

      controls.append(detailBtn, completeBtn, destroyBtn);
      item.append(main, controls);
      fragment.appendChild(item);
    });

    this.taskList.appendChild(fragment);
  }

  calculateOverallProgress(tasks) {
    const subtasks = tasks.flatMap(task => Array.isArray(task.subTasks) ? task.subTasks : []);
    if (subtasks.length === 0) return 0;
    const done = subtasks.filter(task => task.done).length;
    return Math.round((done / subtasks.length) * 100);
  }

  formatTaskProgress(task) {
    const subs = Array.isArray(task.subTasks) ? task.subTasks : [];
    if (subs.length === 0) return 'サブタスクなし';
    const done = subs.filter(sub => sub.done).length;
    return `${done}/${subs.length} 完了`;
  }

  createTaskActionButton(label, action, ariaLabel, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `task-action task-action--${action}`;
    button.dataset.action = action;
    button.textContent = label;
    button.setAttribute('aria-label', ariaLabel);
    button.addEventListener('click', onClick);
    return button;
  }

  triggerShake(duration = 400) {
    this.body.classList.remove('shake-active'); // リセット
    void this.body.offsetWidth; // リフロー強制
    this.body.classList.add('shake-active');
    setTimeout(() => {
      this.body.classList.remove('shake-active');
    }, duration);
  }

  showUndo(restoreCallback, message = 'タスクを削除しました') {
    const snackbar = document.getElementById('undo-snackbar');
    const undoBtn = document.getElementById('undo-btn');
    if (!snackbar || !undoBtn) return;

    const label = snackbar.querySelector('[data-undo-message]') || snackbar.querySelector('span');
    if (label) label.textContent = message;

    // 既存のタイマーをクリア
    if (this.undoTimerId) clearTimeout(this.undoTimerId);

    // イベントリスナーの重複登録を防ぐため、古いボタンをクローンして置き換える
    const newBtn = undoBtn.cloneNode(true);
    undoBtn.parentNode.replaceChild(newBtn, undoBtn);

    snackbar.classList.remove('hidden');

    newBtn.addEventListener('click', () => {
      snackbar.classList.add('hidden');
      if (this.undoTimerId) clearTimeout(this.undoTimerId);
      restoreCallback();
    });

    // 4秒後に自動で隠す
    this.undoTimerId = setTimeout(() => {
      snackbar.classList.add('hidden');
    }, 4000);
  }
}
