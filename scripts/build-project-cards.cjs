const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const projectsPath = path.join(rootDir, 'projects.json');
const indexPath = path.join(rootDir, 'index.html');
const VALID_GROUPS = new Set(['primary', 'secondary', 'other']);
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
    throw new Error(`${project.id} の group は primary / secondary / other のいずれかにしてください`);
  }
  if (!VALID_SHELVES.has(project.shelf)) {
    throw new Error(`${project.id} の shelf は learning / tool / story のいずれかにしてください`);
  }
  if (!project.actions.mainText) throw new Error(`${project.id} の actions.mainText がありません`);
  if (project.recommendationOrder !== undefined && (
    project.group === 'other' || !Number.isInteger(project.recommendationOrder) || project.recommendationOrder < 1
  )) throw new Error(`${project.id} の recommendationOrder はトップ掲載作品の正の整数にしてください`);
  if (project.mobileOrder !== undefined && (!Number.isInteger(project.mobileOrder) || project.mobileOrder < 1)) {
    throw new Error(`${project.id} の mobileOrder は正の整数にしてください`);
  }
  if (project.mobileNote !== undefined && (!Array.isArray(project.mobileNote)
    || project.mobileNote.some(phrase => typeof phrase !== 'string' || !phrase.trim()))) {
    throw new Error(`${project.id} の mobileNote は説明文の配列にしてください`);
  }
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
  const recommendationOrders = new Set();
  projects.forEach((project, index) => {
    validateProject(project, index);
    if (ids.has(project.id)) throw new Error(`${project.id} のidが重複しています`);
    ids.add(project.id);
    if (project.recommendationOrder) {
      if (recommendationOrders.has(project.recommendationOrder)) throw new Error('おすすめの掲載順が重複しています');
      recommendationOrders.add(project.recommendationOrder);
    }
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
  'motion-atlas': '🎞️',
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
  const id = escapeHtml(project.id);
  const note = project.mobileNote || [];
  const external = new URL(project.url, 'https://katakatalab.com/').origin !== 'https://katakatalab.com';
  const mobileOrder = Number.isInteger(project.mobileOrder) ? ` style="--mobile-order:${project.mobileOrder}"` : '';
  const recommendation = project.recommendationOrder ? ` data-recommendation-order="${project.recommendationOrder}"` : '';
  const desktopNewTab = project.newTab || external;
  const tabLabel = desktopNewTab ? ' <span class="card-action-target">（別タブ）</span>' : '';
  const desktopAction = project.recommendationOrder
    ? `${escapeHtml(project.mobileAction || '作品ページへ')}${tabLabel} →`
    : escapeHtml(project.actions.mainText);

  return `<article class="card${project.featured ? ' card--featured' : ''}"
             data-project-card="static"${mobileOrder}${recommendation}
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
            <a href="${escapeHtml(project.url)}" class="card-link"${desktopNewTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>
              <span class="card-action-label">${desktopAction}</span>
            </a>
            ${project.actions.detail ? '<button type="button" class="card-detail-btn">詳しく見る</button>' : ''}
          </div>
        </div>
        <a class="card-link project-row" href="${escapeHtml(project.url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}
           aria-labelledby="row-name-${id} row-action-${id}" aria-describedby="row-purpose-${id}${note.length ? ' row-note-' + id : ''}">
          <h3 class="project-row-name" id="row-name-${id}">${escapeHtml(project.title)}</h3>
          <p class="project-row-purpose" id="row-purpose-${id}">${escapeHtml(project.shortText || project.text)}</p>
          ${note.length ? `<p class="project-row-note" id="row-note-${id}">${note.map(phrase => `<span>${escapeHtml(phrase)}</span>`).join('')}</p>` : ''}
          <span class="project-row-cta" id="row-action-${id}"><span class="project-row-action">${escapeHtml(project.mobileAction || '作品ページへ')}</span>${external ? '（別タブ）' : ''}<span aria-hidden="true">→</span></span>
        </a>
      </article>`.replace(/[ \t]+$/gm, '');
}

function replaceGeneratedBlock(html, name, content) {
  const start = `<!-- PROJECT_CARDS_${name}_START -->`;
  const end = `<!-- PROJECT_CARDS_${name}_END -->`;
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
  if (!pattern.test(html)) throw new Error(`${name} 用の生成マーカーがありません`);
  return html.replace(pattern, `${start}\n                    ${content}\n                    ${end}`);
}

function normalizeNewlines(value) {
  return String(value).replace(/\r\n/g, '\n');
}

function renderOtherProject(project) {
  return `<li>
                      <a href="${escapeHtml(project.url)}" class="other-project-link" data-project-id="${escapeHtml(project.id)}">
                        <span class="other-project-icon" aria-hidden="true">${PROJECT_ICONS[project.id] || '🧪'}</span>
                        <strong class="other-project-title">${escapeHtml(project.title)}</strong>
                        <span class="other-project-description">${escapeHtml(project.shortText || project.text)}</span>
                        <span class="other-project-open" aria-hidden="true">開く <span>→</span></span>
                      </a>
                    </li>`;
}

function writeGeneratedBlocks(filePath, blocks) {
  const rawSource = fs.readFileSync(filePath, 'utf8');
  const source = normalizeNewlines(rawSource);
  let html = source;
  for (const [name, content] of blocks) html = replaceGeneratedBlock(html, name, content);
  if (html === source) return;
  fs.writeFileSync(filePath, rawSource.includes('\r\n') ? html.replace(/\n/g, '\r\n') : html);
}

function buildProjectCards() {
  const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
  validateProjects(projects);

  const recommended = projects.filter(project => project.recommendationOrder)
    .sort((a, b) => a.recommendationOrder - b.recommendationOrder).map(renderCard).join('\n                    ');
  const primary = projects.filter(project => project.group === 'primary' && !project.recommendationOrder).map(renderCard).join('\n                    ');
  const secondary = projects.filter(project => project.group === 'secondary' && !project.recommendationOrder).map(renderCard).join('\n                    ');
  if (!primary || !secondary) throw new Error('primary と secondary の両方に作品が必要です');

  const other = projects.filter((project) => project.group === 'other').map(renderOtherProject).join('\n                    ');
  writeGeneratedBlocks(indexPath, [['RECOMMENDED', recommended], ['PRIMARY', primary], ['SECONDARY', secondary]]);
  writeGeneratedBlocks(path.join(rootDir, 'other-projects.html'), [['OTHER', other]]);
}

if (require.main === module) buildProjectCards();

module.exports = { buildProjectCards, renderCard, renderOtherProject, validateProject, validateProjects, validatePublicUrl };
