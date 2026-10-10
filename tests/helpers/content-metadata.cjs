const assert = require('node:assert/strict');

function parseIsoDate(value, label = 'date') {
  assert.match(value || '', /^\d{4}-\d{2}-\d{2}$/, `${label} は YYYY-MM-DD 形式が必要です`);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  assert.equal(date.getUTCFullYear(), year, `${label} の年が不正です`);
  assert.equal(date.getUTCMonth() + 1, month, `${label} の月が不正です`);
  assert.equal(date.getUTCDate(), day, `${label} の日が不正です`);
  return date;
}

function formatJapaneseDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${year}年${month}月${day}日`;
}

function extractDateModified(html, label = 'HTML') {
  const match = html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
  assert.ok(match, `${label} に dateModified がありません`);
  parseIsoDate(match[1], `${label} dateModified`);
  return match[1];
}

function extractDatePublished(html, label = 'HTML') {
  const match = html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
  assert.ok(match, `${label} に datePublished がありません`);
  parseIsoDate(match[1], `${label} datePublished`);
  return match[1];
}

function assertPublishedBeforeModified(html, label = 'HTML') {
  const published = extractDatePublished(html, label);
  const modified = extractDateModified(html, label);
  assert.ok(
    parseIsoDate(modified, `${label} dateModified`) >= parseIsoDate(published, `${label} datePublished`),
    `${label} の dateModified は datePublished 以降である必要があります`,
  );
  return { published, modified };
}

function assertVisibleUpdateMatchesModified(html, label = 'HTML') {
  const modified = extractDateModified(html, label);
  const expected = formatJapaneseDate(modified);
  const visibleDates = [...html.matchAll(/更新日[:：]\s*(\d{4}年\d{1,2}月\d{1,2}日)/g)].map((match) => match[1]);
  assert.ok(visibleDates.includes(expected), `${label} の表示更新日に ${expected} がありません`);
  return modified;
}

function japaneseDateToIso(value, label = '表示更新日') {
  const match = String(value || '').match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  assert.ok(match, `${label} は「YYYY年M月D日」形式が必要です`);
  const iso = `${match[1]}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[3])).padStart(2, '0')}`;
  parseIsoDate(iso, label);
  return iso;
}

function extractEffectiveModifiedDate(html, label = 'HTML') {
  const structured = html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/)?.[1] ?? null;
  const visible = [...html.matchAll(/更新日[:：]\s*(\d{4}年\d{1,2}月\d{1,2}日)/g)]
    .map((match) => japaneseDateToIso(match[1], `${label} 表示更新日`));

  if (structured) {
    parseIsoDate(structured, `${label} dateModified`);
    assert.ok(
      visible.includes(structured),
      `${label} のJSON-LD dateModified ${structured} と表示更新日が一致していません`,
    );
    return structured;
  }

  assert.ok(visible.length > 0, `${label} に更新日がありません`);
  return visible.toSorted().at(-1);
}

function sitemapLastmodForUrl(xml, url) {
  const escaped = url.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&');
  const match = xml.match(new RegExp(`<loc>${escaped}</loc>\\s*<lastmod>(\\d{4}-\\d{2}-\\d{2})T00:00:00\\+00:00</lastmod>`));
  assert.ok(match, `${url} の lastmod が sitemap にありません`);
  parseIsoDate(match[1], `${url} sitemap lastmod`);
  return match[1];
}

module.exports = {
  assertPublishedBeforeModified,
  assertVisibleUpdateMatchesModified,
  extractDateModified,
  extractDatePublished,
  extractEffectiveModifiedDate,
  formatJapaneseDate,
  japaneseDateToIso,
  parseIsoDate,
  sitemapLastmodForUrl,
};
