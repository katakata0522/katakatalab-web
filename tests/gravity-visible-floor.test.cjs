const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function fixture() {
  let consoleTop = 500;
  const tasks = [];
  const context = vm.createContext({
    document: { querySelector: selector => selector === '.task-console'
      ? { getBoundingClientRect: () => ({ top: consoleTop }) } : null }
  });
  const source = fs.readFileSync(path.join(__dirname, '../lab-tools/gravity-todo/src/PhysicsEngine.js'), 'utf8')
    .replace(/^import .*$/mg, '').replace('export class', 'class');
  vm.runInContext(source + ';this.PhysicsEngine = PhysicsEngine;', context);
  const engine = Object.create(context.PhysicsEngine.prototype);
  Object.assign(engine, {
    height: 800, width: 1000, world: {},
    getTaskBodies: () => tasks,
    Bodies: { rectangle: (x, y, width, height) => ({ x, y, width, height }) },
    Composite: { add() {}, remove() {} },
    Body: {
      setPosition(body, position) {
        body.bounds.max.y += position.y - body.position.y;
        body.position = { ...position };
      },
      setVelocity(body, velocity) { body.velocity = { ...velocity }; }
    }
  });
  function task(bottom, velocity = 4, pinned = false) {
    const body = { taskText: 'Keep this task', isStatic: pinned, subTasks: [{ text: 'Keep this part', done: true }],
      position: { x: 400, y: bottom - 24 }, bounds: { max: { y: bottom } }, velocity: { x: 2, y: velocity } };
    tasks.push(body);
    return body;
  }
  return { engine, task, setTop: value => { consoleTop = value; } };
}

test('opening the task list moves the floor and resting blocks above the complete panel', () => {
  const f = fixture(), body = f.task(480), untouched = f.task(180);
  f.engine.initWorld();
  f.setTop(300);
  f.engine.rebuildFloor();
  assert.equal(f.engine.ground.y - f.engine.ground.height / 2, 288);
  assert.equal(body.bounds.max.y, 286);
  assert.equal(body.velocity.y, 0);
  assert.equal(body.position.x, 400);
  assert.equal(untouched.bounds.max.y, 180);
  assert.equal(body.taskText, 'Keep this task');
  assert.deepEqual(body.subTasks, [{ text: 'Keep this part', done: true }]);
});

test('closing the list lowers the floor without teleporting already visible tasks', () => {
  const f = fixture(), body = f.task(280, -3);
  f.setTop(300);
  f.engine.initWorld();
  f.setTop(600);
  f.engine.rebuildFloor();
  assert.equal(f.engine.ground.y - f.engine.ground.height / 2, 588);
  assert.equal(body.bounds.max.y, 280);
  assert.equal(body.velocity.y, -3);
});

test('an obscured pinned task stays pinned while returning to visible space', () => {
  const f = fixture(), body = f.task(700, 0, true);
  f.engine.initWorld();
  f.engine.rebuildFloor();
  assert.equal(body.isStatic, true);
  assert.equal(body.bounds.max.y, 486);
});
