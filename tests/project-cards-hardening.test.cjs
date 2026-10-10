const test = require('node:test');
const assert = require('node:assert/strict');
const { read } = require('./helpers/repository.cjs');
const { validateProjects } = require('../scripts/build-project-cards.cjs');

function loadProjects() {
  return JSON.parse(read('projects.json'));
}

test('作品データは生成前にIDと棚の重複・不正値を検査する', () => {
  const projects = loadProjects();

  assert.doesNotThrow(() => validateProjects(projects));

  const duplicateId = projects.map((project) => ({ ...project }));
  duplicateId[1].id = duplicateId[0].id;
  assert.throws(() => validateProjects(duplicateId), /id.*重複/);

  const invalidShelf = projects.map((project) => ({ ...project }));
  invalidShelf[0].shelf = 'unknown';
  assert.throws(() => validateProjects(invalidShelf), /shelf.*learning.*tool.*story/);
});

test('作品データのリンクは公開ページで扱える安全なURLだけを許可する', () => {
  const projects = loadProjects();

  const unsafe = projects.map((project) => ({ ...project }));
  unsafe[0].url = 'javascript:alert(1)';
  assert.throws(() => validateProjects(unsafe), /URL/);

  const unsafeGuide = projects.map((project) => ({
    ...project,
    guideLinks: project.guideLinks?.map((link) => ({ ...link }))
  }));
  const guideProjectIndex = unsafeGuide.findIndex((project) => Array.isArray(project.guideLinks) && project.guideLinks.length > 0);
  assert.notEqual(guideProjectIndex, -1);
  unsafeGuide[guideProjectIndex].guideLinks[0].url = '//example.com/unsafe';
  assert.throws(() => validateProjects(unsafeGuide), /URL/);
});



test('作品データの newTab は boolean だけを許可する', () => {
  const projects = loadProjects();
  const invalidNewTab = projects.map((project) => ({ ...project }));
  invalidNewTab[0].newTab = 'true';
  assert.throws(() => validateProjects(invalidNewTab), /newTab.*boolean/);
});
