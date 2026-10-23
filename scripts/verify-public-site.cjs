'use strict';

const DEFAULT_BASE_URL = 'https://katakatalab.com';
const DEFAULT_TIMEOUT_MS = 10000;

function normalizeBaseUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError('ベースURLは空でない文字列で指定してください');
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError(`ベースURLが不正です: ${value}`);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new TypeError('ベースURLはhttpまたはhttpsで指定してください');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new TypeError('ベースURLに認証情報・クエリ・ハッシュを含めないでください');
  }

  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.href.replace(/\/$/, '');
}

function createDefaultChecks(baseUrl, canonicalBaseUrl = baseUrl) {
  return [
    {
      path: '/',
      markers: ['href="en/" class="language-link"', 'hreflang="en"'],
    },
    {
      path: '/en/',
      markers: ['/guides/en/password-security.html'],
    },
    {
      path: '/guides/en/password-security.html',
      markers: [
        `rel="canonical" href="${canonicalBaseUrl}/guides/en/password-security.html"`,
        `hreflang="ja" href="${canonicalBaseUrl}/guides/password-guide.html"`,
        'pages.nist.gov/800-63-4/sp800-63b/authenticators/',
      ],
    },
    {
      path: '/privacy/releaseready/',
      markers: [
        `rel="canonical" href="${canonicalBaseUrl}/privacy/releaseready/"`,
        '<h1>ReleaseReady プライバシーポリシー</h1>',
      ],
    },
    {
      path: '/sitemap.xml',
      markers: [
        `<loc>${canonicalBaseUrl}/guides/en/password-security.html</loc>`,
        `<loc>${canonicalBaseUrl}/privacy/releaseready/</loc>`,
      ],
    },
    {
      path: '/.user.ini',
      expectedStatuses: [403, 404],
      markers: [],
    },
  ];
}

function validateTimeout(timeoutMs) {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 100 || timeoutMs > 120000) {
    throw new RangeError('タイムアウトは100〜120000ミリ秒で指定してください');
  }
  return Math.trunc(timeoutMs);
}

function normalizeExpectedStatuses(check) {
  const statuses = check.expectedStatuses ?? [200];
  if (!Array.isArray(statuses) || statuses.length === 0) {
    throw new TypeError(`${check.path}: expectedStatusesは1件以上の配列で指定してください`);
  }

  const normalized = statuses.map((status) => Number(status));
  if (normalized.some((status) => !Number.isInteger(status) || status < 100 || status > 599)) {
    throw new TypeError(`${check.path}: expectedStatusesに不正なHTTPステータスがあります`);
  }
  return [...new Set(normalized)];
}

async function readPage(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response || !Number.isInteger(response.status) || typeof response.text !== 'function') {
      throw new Error('HTTP応答の形式が不正です');
    }
    return {
      status: response.status,
      body: await response.text(),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function verifyPublicSite({
  baseUrl = DEFAULT_BASE_URL,
  canonicalBaseUrl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  checks,
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedCanonicalBaseUrl = normalizeBaseUrl(canonicalBaseUrl ?? normalizedBaseUrl);
  const timeout = validateTimeout(timeoutMs);
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('fetch実装が必要です');
  }

  const targetChecks = checks ?? createDefaultChecks(normalizedBaseUrl, normalizedCanonicalBaseUrl);
  if (!Array.isArray(targetChecks) || targetChecks.length === 0) {
    throw new TypeError('検証対象ページが必要です');
  }

  const results = [];
  const errors = [];
  for (const check of targetChecks) {
    if (!check || typeof check.path !== 'string' || !check.path.startsWith('/')) {
      throw new TypeError('検証対象のpathは/から始まる文字列で指定してください');
    }

    const expectedStatuses = normalizeExpectedStatuses(check);
    const url = new URL(check.path, `${normalizedBaseUrl}/`).href;
    try {
      const response = await readPage(fetchImpl, url, timeout);
      const missingMarkers = (check.markers || []).filter((marker) => !response.body.includes(marker));
      const result = {
        path: check.path,
        status: response.status,
        expectedStatuses,
        missingMarkers,
      };
      results.push(result);

      if (!expectedStatuses.includes(response.status)) {
        errors.push(`${check.path}: HTTP ${response.status} (expected: ${expectedStatuses.join(', ')})`);
      }
      for (const marker of missingMarkers) {
        errors.push(`${check.path}: 必須マーカーがありません: ${marker}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ path: check.path, status: null, expectedStatuses, missingMarkers: [], error: message });
      errors.push(`${check.path}: ${message}`);
    }
  }

  return {
    ok: errors.length === 0,
    baseUrl: normalizedBaseUrl,
    canonicalBaseUrl: normalizedCanonicalBaseUrl,
    checks: results,
    errors,
  };
}

function parseCliArgs(args) {
  const options = { baseUrl: DEFAULT_BASE_URL, timeoutMs: DEFAULT_TIMEOUT_MS };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--base-url') {
      options.baseUrl = args[++index];
    } else if (argument === '--canonical-base-url') {
      options.canonicalBaseUrl = args[++index];
    } else if (argument === '--timeout-ms') {
      options.timeoutMs = Number(args[++index]);
    } else {
      throw new Error(`不明な引数です: ${argument}`);
    }
  }
  return options;
}

function printReport(report) {
  console.log(`Public site smoke test: base=${report.baseUrl}, pages=${report.checks.length}, errors=${report.errors.length}`);
  for (const error of report.errors) console.log(`[ERROR] ${error}`);
}

if (require.main === module) {
  verifyPublicSite(parseCliArgs(process.argv.slice(2)))
    .then((report) => {
      printReport(report);
      if (!report.ok) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(`[ERROR] ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    });
}

module.exports = {
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT_MS,
  createDefaultChecks,
  normalizeBaseUrl,
  normalizeExpectedStatuses,
  parseCliArgs,
  validateTimeout,
  verifyPublicSite,
};
