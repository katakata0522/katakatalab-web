const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const projectsPath = path.join(rootDir, 'projects.json');
const indexPath = path.join(rootDir, 'index.html');
const VALID_GROUPS = new Set(['primary', 'secondary']);
const VALID_SHELVES = new Set(['learning', 'tool', 'story']);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function validateProject(project, index) {
  const required = ['id', 'group', 'category', 'shelf', 'url', 'tagText', 'tagClass', 'title', 'text', 'actions'];
  for (const key of required) {
    if (!project[key]) throw new Error(`projects.json の ${index + 1} 件目に ${key} がありません`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.id)) {
    throw new Error(`${project.id} の id は小文字英数字とハイフンだけにしてください`);
  }
  if (!VALID_GROUPS.has(project.group)) {
    throw new Error(`${project.id} の group は primary または secondary にしてください`);
  }
  if (!VALID_SHELVES.has(project.shelf)) {
    throw new Error(`${project.id} の shelf は learning / tool / story のいずれかにしてください`);
  }
  if (!project.actions.mainText) throw new Error(`${project.id} の actions.mainText がありません`);
  if (project.aliases !== undefined) {
    if (!Array.isArray(project.aliases) || project.aliases.length > 16) {
      throw new Error(`${project.id} のaliasesは16件以内の配列にしてください`);
    }
    project.aliases.forEach((alias, aliasIndex) => {
      if (typeof alias !== 'string' || !alias.trim() || alias.length > 80 || /[\u0000-\u001f\u007f]/.test(alias)) {
        throw new Error(`${project.id} のaliases ${aliasIndex + 1} 件目が不正です`);
      }
    });
  }
  if (project.newTab !== undefined && typeof project.newTab !== 'boolean') {
    throw new Error(`${project.id} の newTab は boolean にしてください`);
  }
  validatePublicUrl(project.url, `${project.id} のURL`);
  if (project.guide) validatePublicUrl(project.guide, `${project.id} のガイドURL`);
  if (project.story) validatePublicUrl(project.story, `${project.id} のストーリーURL`);
  if (project.guideLinks !== undefined) {
    if (!Array.isArray(project.guideLinks)) throw new Error(`${project.id} のguideLinksは配列にしてください`);
    project.guideLinks.forEach((link, linkIndex) => {
      if (!link || !link.text || !link.url) throw new Error(`${project.id} のguideLinks ${linkIndex + 1} 件目が不完全です`);
      validatePublicUrl(link.url, `${project.id} のガイドリンクURL`);
    });
  }
}

function validatePublicUrl(value, label) {
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error(`${label}が安全なURLではありません`);
  }
  if (value.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(value.replace(/^https?:\/\//i, ''))) {
    throw new Error(`${label}が安全なURLではありません`);
  }
  if (/^https?:\/\//i.test(value) && !/^https:\/\//i.test(value)) {
    throw new Error(`${label}はHTTPSを使用してください`);
  }
}

function validateProjects(projects) {
  if (!Array.isArray(projects) || projects.length === 0) throw new Error('projects.json が空です');
  const ids = new Set();
  projects.forEach((project, index) => {
    validateProject(project, index);
    if (ids.has(project.id)) throw new Error(`${project.id} のidが重複しています`);
    ids.add(project.id);
  });
  return projects;
}

const PROJECT_ICONS = {
    'moyamoya-sorter': '🌿',
    'chiritsumo-calc': '☕',
  'qrcode': '📱',
  'aspect-ratio': '📐',
  'password-generator': '🔑',
  'seireki': '📅',
  'discount-calc': '🏷️',
  'ogp-simulator': '🖼️',
  'px-rem': '⚖️',
  'svg-viewer': '🎨',
  'text-diff': '📝',
  'font-lab': '🔤',
  'base64': '📦',
  'html-formatter': '💻',
  'json-formatter': '🧩',
  'timestamp': '⏱️',
  'case-converter': '🔠',
  'character-counter': '🔢',
  'url-encoder': '🔗',
  'dummy-image': '🖼️',
  'pikalab': '✨',
  'playpoint': '🎮',
  'asobi-pocket': '🎲',
  'gravity-todo': '🚀',
  'kids-smile-land': '🎈',
  'kirarin-play-park': '🎡',
  'site-hub': '🌐',
  'usagi-app': '🐰',
  'doujin-calc': '📚',
  'emphasis-lines': '💥',
  'screenshot-crop': '✂️',
};

function renderCard(project) {
  // 5の案A: カード一覧ではクイックガイドを非表示にし、ツール本体やガイドページで案内する
  const guideLinks = '';
  const storyAttr = project.story ? ` data-story="${escapeHtml(project.story)}"` : '';
  const guideAttr = project.guide ? ` data-guide="${escapeHtml(project.guide)}"` : '';
  const aliasesAttr = ` data-aliases="${escapeHtml(JSON.stringify(project.aliases || []))}"`;
  const icon = PROJECT_ICONS[project.id] || '🧪';

  return `<article class="card${project.featured ? ' card--featured' : ''}"
             data-project-card="static"
             data-id="${escapeHtml(project.id)}"
             data-group="${escapeHtml(project.group)}"
             data-category="${escapeHtml(project.category)}"
             data-shelf="${escapeHtml(project.shelf)}"
             data-url="${escapeHtml(project.url)}"${storyAttr}${guideAttr}${aliasesAttr}
             data-detail="${escapeHtml(project.detail || '')}">
        ${project.featured ? '<div class="card-visual" aria-hidden="true">🧪</div>' : ''}
        <div class="card-body">
          <div class="card-header">
            <div class="card-tag ${escapeHtml(project.tagClass)}">${escapeHtml(project.tagText)}</div>
            ${project.targetBadge ? `<span class="badge-target font-badge">${escapeHtml(project.targetBadge)}</span>` : ''}
            ${project.statusBadge ? `<span class="badge-new">${escapeHtml(project.statusBadge)}</span>` : ''}
          </div>
          <h3 class="card-title"><span class="card-title-icon" aria-hidden="true">${icon}</span> ${escapeHtml(project.title)}</h3>
          <p class="card-text">${escapeHtml(project.text)}</p>
          ${guideLinks}
          <div class="card-actions">
            <a href="${escapeHtml(project.url)}" class="card-link"${project.newTab || (/^https?:\/\//i.test(project.url) && !project.url.includes('katakatalab.com')) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(project.actions.mainText)}</a>
            ${project.actions.detail ? '<button type="button" class="card-detail-btn">詳しく見る</button>' : ''}
          </div>
        </div>
      </article>`.replace(/[ \t]+$/gm, '');
}

function replaceGeneratedBlock(html, name, content) {
  const start = `<!-- PROJECT_CARDS_${name}_START -->`;
  const end = `<!-- PROJECT_CARDS_${name}_END -->`;
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
  if (!pattern.test(html)) throw new Error(`${name} 用の生成マーカーが index.html にありません`);
  return html.replace(pattern, `${start}\n                    ${content}\n                    ${end}`);
}

function normalizeNewlines(value) {
  return String(value).replace(/\r\n/g, '\n');
}

function buildProjectCards() {
  const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
  validateProjects(projects);

  const primary = projects.filter((project) => project.group === 'primary').map(renderCard).join('\n                    ');
  const secondary = projects.filter((project) => project.group === 'secondary').map(renderCard).join('\n                    ');
  if (!primary || !secondary) throw new Error('primary と secondary の両方に作品が必要です');

  const rawSource = fs.readFileSync(indexPath, 'utf8');
  const source = normalizeNewlines(rawSource);
  const html = replaceGeneratedBlock(replaceGeneratedBlock(source, 'PRIMARY', primary), 'SECONDARY', secondary);
  if (normalizeNewlines(html) === normalizeNewlines(source)) {
    console.log(`トップページのカードは既に ${projects.length} 件と一致しています`);
    return;
  }
  const newline = rawSource.includes('\r\n') ? '\r\n' : '\n';
  const output = newline === '\n' ? html : html.replace(/\n/g, '\r\n');
  fs.writeFileSync(indexPath, output);
  console.log(`トップページへ ${projects.length} 件の静的カードを反映しました`);
}

if (require.main === module) buildProjectCards();

module.exports = { buildProjectCards, renderCard, validateProject, validateProjects, validatePublicUrl };
