const test = require('node:test');
const assert = require('node:assert/strict');
const { read } = require('./helpers/repository.cjs');

test('root script loads projects.json only on pages that render the project grid', () => {
  const script = read('script.js');

  assert.match(script, /const grid = document\.getElementById\('projects-grid'\);[\s\S]*?if \(grid\) \{[\s\S]*?fetch\(getProjectDataUrl\(\)\)/);
  assert.match(script, /function getProjectDataUrl/);
  assert.doesNotMatch(script, /fetch\('projects\.json'\)/);
});

test('quick view modal works for both primary and secondary project grids', () => {
  const script = read('script.js');

  assert.match(script, /const projectGrids = document\.querySelectorAll\('\.projects-grid'\);/);
  assert.match(script, /projectGrids\.forEach\(projectsGrid => projectsGrid\.addEventListener\('click'/);
});

test('subtool footer year scripts do not throw when the shared footer id is absent', () => {
  const password = read('password-generator/index.html');
  const seireki = read('seireki/index.html');

  assert.match(password, /const footerCopyrightYear = document\.getElementById\('footerCopyrightYear'\);[\s\S]*?if \(footerCopyrightYear\) \{[\s\S]*?footerCopyrightYear\.textContent = new Date\(\)\.getFullYear\(\);[\s\S]*?\}/);
  assert.match(seireki, /const footerCopyrightYear = document\.getElementById\('footerCopyrightYear'\);[\s\S]*?if \(footerCopyrightYear\) \{[\s\S]*?footerCopyrightYear\.textContent = new Date\(\)\.getFullYear\(\);[\s\S]*?\}/);
  assert.doesNotMatch(password, /\?\.textContent\s*=/);
  assert.doesNotMatch(seireki, /\?\.textContent\s*=/);
});

test('pikalab pages do not report optional modal elements as fatal initialization blockers', () => {
  const rhythm = read('pikalab/rhythm_lab/script.js');
  const science = read('pikalab/science_maker/script.js');

  assert.doesNotMatch(rhythm, /\['modalContent',\s*domCache\.modalContent,\s*'#help-content'\]/);
  assert.doesNotMatch(science, /\['parentModal',\s*elements\.parentModal,\s*'#parent-modal'\]/);
  assert.doesNotMatch(science, /\['parentGuideBtn',\s*elements\.parentGuideBtn,\s*'#parent-guide-btn'\]/);
  assert.doesNotMatch(science, /\['parentModalCloseBtn',\s*elements\.parentModalCloseBtn,\s*'#parent-modal-close'\]/);
  assert.doesNotMatch(science, /\['parentModalCloseBottomBtn',\s*elements\.parentModalCloseBottomBtn,\s*'#parent-modal-close-bottom'\]/);
});

test('pikalab fraction lab does not require the Tailwind CDN runtime global', () => {
  const html = read('pikalab/fraction_lab/index.html');

  assert.doesNotMatch(html, /tailwind\.config/);
  assert.doesNotMatch(html, /tailwind is not defined/);
});

test('pikalab top page entrypoint does not import Vite virtual modules in static hosting', () => {
  const mainJs = read('pikalab/js/main.js');
  const html = read('pikalab/index.html');

  assert.doesNotMatch(mainJs, /virtual:pwa-register/);
  assert.doesNotMatch(mainJs, /navigator\.serviceWorker\.register/);
  assert.match(html, /id="pikalab-register-sw"/);
  assert.match(html, /navigator\.serviceWorker\.register\(['"]\.\/sw\.js['"]/);
});
