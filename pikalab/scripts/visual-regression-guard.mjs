import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import publishedHtmlRoutes from './published-html-routes.cjs';

const { collectPublishedHtmlRoutes } = publishedHtmlRoutes;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const artifactDir = path.join(rootDir, 'visual-guard-artifacts');
const alwaysScreenshot = process.env.VISUAL_GUARD_SCREENSHOTS === '1';
const catalogPath = path.join(rootDir, 'js', 'app-data.json');

const configuredRoutes = [
  { id: 'top', urlPath: '/', darkShouldBeDark: true, assert: assertTopLifecycle },
  { id: 'articles', urlPath: '/articles/', darkShouldBeDark: true },
  { id: 'article-smart-child', urlPath: '/articles/smart-child.html', darkShouldBeDark: true },
  { id: 'book-report', urlPath: '/book_report/' },
  { id: 'color-lab', urlPath: '/color_lab/' },
  { id: 'deepsea-lab', urlPath: '/deepsea_lab/' },
  { id: 'eduplay', urlPath: '/eduplay/' },
  { id: 'speed-reader', urlPath: '/speed_reader/', darkShouldBeDark: true, assert: assertSpeedReader },
  { id: 'quest-board', urlPath: '/quest_board/', assert: assertQuestBoard },
  { id: 'focus-studio', urlPath: '/focus_studio/', darkShouldBeDark: true },
  { id: 'fraction-lab', urlPath: '/fraction_lab/', darkShouldBeDark: true, assert: assertFractionResult },
  { id: 'kanji-lab', urlPath: '/kanji_lab/', allowNoLocalStyles: true },
  { id: 'kotowaza-quiz', urlPath: '/kotowaza_quiz/' },
  { id: 'manabi-land', urlPath: '/manabi_land/' },
  { id: 'paper-gen', urlPath: '/paper_gen/' },
  { id: 'rhythm-lab', urlPath: '/rhythm_lab/', darkShouldBeDark: true },
  { id: 'science-maker', urlPath: '/science_maker/', darkShouldBeDark: true },
  { id: 'space-lab', urlPath: '/space_lab/', darkShouldBeDark: true },
  { id: 'typing-dojo', urlPath: '/typing_dojo/', assert: assertTypingDojo },
  { id: 'privacy', urlPath: '/privacy.html', darkShouldBeDark: true },
  { id: 'terms', urlPath: '/terms.html', darkShouldBeDark: true },
];

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const catalogPaths = new Set((catalog.apps || [])
  .filter((app) => !app.isAmazonCard && typeof app.url === 'string' && app.url.trim())
  .map((app) => `/${app.url.replace(/^\/+/, '')}`));
const configuredPaths = new Set(configuredRoutes.map((route) => route.urlPath));
const catalogRoutes = (catalog.apps || [])
  .filter((app) => !app.isAmazonCard && typeof app.url === 'string' && app.url.trim())
  .map((app) => ({
    id: app.id || app.url,
    urlPath: `/${app.url.replace(/^\/+/, '')}`,
  }))
  .filter((route) => !configuredPaths.has(route.urlPath));
const coveredPaths = new Set([...configuredPaths, ...catalogRoutes.map((route) => route.urlPath)]);
const additionalRoutes = fs.existsSync(distDir)
  ? collectPublishedHtmlRoutes(distDir)
    .filter((route) => !coveredPaths.has(route.urlPath))
    .map((route) => ({ ...route, darkShouldBeDark: route.urlPath.startsWith('/articles/') }))
  : [];
const routes = [...configuredRoutes, ...catalogRoutes, ...additionalRoutes];

const viewports = [
  { id: 'desktop', width: 1366, height: 900 },
  { id: 'mobile', width: 390, height: 844 },
  { id: 'mobile-small', width: 360, height: 800 },
];

const blockedHosts = [
  'googlesyndication.com',
  'doubleclick.net',
  'googleads.g.doubleclick.net',
  'adtrafficquality.google',
  'googletagmanager.com',
];

if (!fs.existsSync(distDir)) {
  console.error(`[visual-guard] dist not found: ${distDir}`);
  console.error('[visual-guard] Run `npm run build:all` before this guard.');
  process.exit(1);
}

fs.rmSync(artifactDir, { recursive: true, force: true });
fs.mkdirSync(artifactDir, { recursive: true });

const server = await startStaticServer(distDir);
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  const requestedConcurrency = Number.parseInt(process.env.VISUAL_GUARD_CONCURRENCY || '3', 10);
  const maxConcurrency = Number.isFinite(requestedConcurrency)
    ? Math.min(6, Math.max(1, requestedConcurrency))
    : 3;
  const tasks = [];
  for (const route of routes) {
    const routeThemes = route.darkShouldBeDark ? ['light', 'dark'] : ['light'];
    const routeViewports = catalogPaths.has(route.urlPath)
      ? viewports
      : viewports.filter((viewport) => viewport.id !== 'mobile-small');
    for (const viewport of routeViewports) {
      for (const theme of routeThemes) {
        tasks.push({ route, viewport, theme });
      }
    }
  }

  const totalTasks = tasks.length;

  const workers = Array.from({ length: maxConcurrency }, async () => {
    while (tasks.length > 0) {
      const task = tasks.shift();
      if (!task) break;
      const result = await inspectRoute({
        route: task.route,
        viewport: task.viewport,
        theme: task.theme,
        baseUrl,
        browser
      });
      results.push(result);

      // リアルタイムに進捗を出力
      const label = `${result.route.id}/${result.viewport.id}/${result.theme}`;
      const index = results.length;
      if (result.errors.length) {
        console.error(`[FAIL] [${index}/${totalTasks}] ${label}: ${result.errors.join('; ')}`);
      } else if (result.warnings.length) {
        console.warn(`[WARN] [${index}/${totalTasks}] ${label}: ${result.warnings.join('; ')}`);
      } else {
        console.log(`[OK] [${index}/${totalTasks}] ${label}`);
      }
    }
  });

  await Promise.all(workers);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const failures = results.filter((result) => result.errors.length > 0);
const warnings = results.filter((result) => result.warnings.length > 0);
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  results,
  summary: {
    checked: results.length,
    failures: failures.length,
    warnings: warnings.length,
  },
};

fs.writeFileSync(path.join(artifactDir, 'visual-guard-report.json'), JSON.stringify(report, null, 2));

if (failures.length) {
  console.error(`[visual-guard] ${failures.length} failure(s). See ${path.join(artifactDir, 'visual-guard-report.json')}`);
  process.exit(1);
}

console.log(`[visual-guard] passed ${results.length} checks`);

async function inspectRoute({ route, viewport, theme, baseUrl, browser }) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: theme,
  });
  await context.addInitScript(({ wantDark, accelerateCountdown }) => {
    try {
      localStorage.setItem('wonder_school_profile_v2', JSON.stringify({ darkMode: wantDark }));
      localStorage.setItem('pikalab-dark-mode', wantDark ? 'true' : 'false');
      localStorage.setItem('focusStudioDarkMode', wantDark ? 'true' : 'false');
    } catch {}

    if (accelerateCountdown) {
      const originalSetInterval = window.setInterval;
      window.setInterval = function (fn, delay, ...args) {
        if (delay === 1000) {
          return originalSetInterval(fn, 10, ...args);
        }
        return originalSetInterval(fn, delay, ...args);
      };
    }
  }, {
    wantDark: theme === 'dark',
    accelerateCountdown: route.id === 'typing-dojo',
  });

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const localHttpErrors = [];
  const localOrigin = new URL(baseUrl).origin;
  await page.route('**/*', (routeHandle) => {
    const host = new URL(routeHandle.request().url()).hostname;
    if (blockedHosts.some((blockedHost) => host === blockedHost || host.endsWith(`.${blockedHost}`))) {
      return routeHandle.abort();
    }
    return routeHandle.continue();
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error.message || error)));
  page.on('response', (response) => {
    const responseUrl = new URL(response.url());
    if (responseUrl.origin === localOrigin && response.status() >= 400) {
      localHttpErrors.push(`${response.status()} ${responseUrl.pathname}`);
    }
  });

  const result = {
    route,
    viewport,
    theme,
    url: `${baseUrl}${route.urlPath}`,
    status: null,
    metrics: null,
    screenshot: null,
    errors: [],
    warnings: [],
    consoleErrors,
    pageErrors,
    localHttpErrors,
  };

  try {
    const response = await page.goto(result.url, { waitUntil: 'load', timeout: 30000 });
    result.status = response?.status() ?? null;
    await page.waitForTimeout(900);
    await prepareRoute(page, route, viewport);
    result.metrics = await collectMetrics(page);
    applyGenericAssertions(result);
    if (viewport.id.startsWith('mobile')) {
      await assertMobileUsability(page, result);
    }
    if (typeof route.assert === 'function') {
      await route.assert(page, result);
    }
  } catch (error) {
    result.errors.push(`navigation/evaluation failed: ${String(error.message || error).slice(0, 300)}`);
  }

  const shouldScreenshot = alwaysScreenshot || result.errors.length > 0 || result.warnings.length > 0;
  if (shouldScreenshot) {
    const fileName = `${route.id}-${viewport.id}-${theme}.png`;
    const screenshot = path.join(artifactDir, fileName);
    await page.screenshot({ path: screenshot, fullPage: false }).catch(() => {});
    result.screenshot = screenshot;
  }

  await context.close();
  return result;
}

async function prepareRoute(page, route, viewport) {
  if (route.id === 'space-lab') {
    await page.locator('#loading-overlay').waitFor({ state: 'hidden', timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(100);
  }

  if (route.id === 'quest-board' && viewport.id.startsWith('mobile')) {
    await page.locator('#quest-count').evaluate((input) => {
      input.value = '35';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }).catch(() => {});
    await page.waitForTimeout(250);
  }
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const localStylesheets = [...document.querySelectorAll('link[rel~="stylesheet"]')]
      .filter((link) => {
        const href = link.href || '';
        if (!href) return false;
        const url = new URL(href, location.href);
        return url.origin === location.origin && url.pathname.endsWith('.css');
      })
      .map((link) => ({
        href: link.href,
        loaded: Boolean(link.sheet),
      }));
    const visibleFlex = [...document.querySelectorAll('.flex')]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.top <= innerHeight && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map((el) => getComputedStyle(el).display);
    const buttons = [...document.querySelectorAll('button,a,input,select,textarea,[role="button"],summary')]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.top <= innerHeight && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          className: String(el.className || '').slice(0, 80),
          text: (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 80),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });
    return {
      title: document.title,
      h1: (document.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim(),
      bodyTextLength: (body?.innerText || '').trim().length,
      bodyDisplay: getComputedStyle(body).display,
      bodyBackground: getComputedStyle(body).backgroundColor,
      bodyColor: getComputedStyle(body).color,
      overflowX: Math.max(body?.scrollWidth || 0, doc.scrollWidth || 0) - doc.clientWidth,
      localStylesheets,
      visibleFlexCount: visibleFlex.length,
      brokenFlexCount: visibleFlex.filter((display) => display !== 'flex' && display !== 'inline-flex').length,
      smallInteractive: buttons
        .filter((item) => item.width < 44 || item.height < 44)
        .filter((item) => !item.className.includes('sr-only'))
        .slice(0, 12),
    };
  });
}

function applyGenericAssertions(result) {
  const { route, theme, metrics, status, consoleErrors, pageErrors, localHttpErrors } = result;
  if (status !== 200) result.errors.push(`HTTP status ${status}`);
  if (!metrics) return;
  if (!metrics.title.trim()) result.errors.push('document title is empty');
  if (metrics.bodyTextLength === 0) result.errors.push('visible body text is empty');
  const unloadedStyles = metrics.localStylesheets.filter((stylesheet) => !stylesheet.loaded);
  if (!route.allowNoLocalStyles && metrics.localStylesheets.length === 0) result.errors.push('no local stylesheet links loaded');
  if (unloadedStyles.length) result.errors.push(`unloaded local stylesheet(s): ${unloadedStyles.map((item) => item.href).join(', ')}`);
  if (metrics.overflowX > 4) result.errors.push(`horizontal overflow ${metrics.overflowX}px`);
  if (metrics.visibleFlexCount >= 5 && metrics.brokenFlexCount / metrics.visibleFlexCount > 0.6) {
    result.errors.push(`Tailwind flex utilities appear inactive (${metrics.brokenFlexCount}/${metrics.visibleFlexCount})`);
  }
  if (route.darkShouldBeDark && theme === 'dark' && isLightColor(metrics.bodyBackground)) {
    result.errors.push(`dark mode body background is too light (${metrics.bodyBackground})`);
  }
  const nativePageErrors = pageErrors.filter((message) => !message.includes('ResizeObserver loop'));
  if (nativePageErrors.length) result.errors.push(`page error: ${nativePageErrors[0]}`);
  const nativeConsoleErrors = consoleErrors.filter((message) => (
    !message.includes('net::ERR_ABORTED')
    && !message.includes('Failed to load resource')
    && !message.includes('Content Security Policy')
  ));
  if (localHttpErrors.length) result.errors.push(`local HTTP error: ${localHttpErrors[0]}`);
  if (nativeConsoleErrors.length) result.errors.push(`console error: ${nativeConsoleErrors[0].slice(0, 160)}`);
  if (metrics.smallInteractive.length) {
    result.warnings.push(`small interactive controls: ${metrics.smallInteractive.map((item) => `${item.tag}${item.id ? `#${item.id}` : ''} ${item.width}x${item.height}`).join(', ')}`);
  }
}


async function assertMobileUsability(page, result) {
  const isCatalogLab = catalogPaths.has(result.route.urlPath);

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight
        && style.display !== 'none' && style.visibility !== 'hidden';
    };

    const tinyControls = [...document.querySelectorAll('button,a[href],input,select,textarea,[role="button"],summary')]
      .filter(visible)
      .filter((el) => !(el instanceof HTMLInputElement && ['hidden', 'range', 'color', 'checkbox', 'radio'].includes(el.type)))
      .filter((el) => !(el instanceof HTMLAnchorElement && (el.getAttribute('href') || '').startsWith('#')))
      .filter((el) => !el.classList.contains('skip-link') && !el.classList.contains('sr-only'))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          text: (el.textContent || el.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim().slice(0, 60),
        };
      })
      .filter((item) => item.width < 28 || item.height < 28)
      .slice(0, 8);

    const hasPikaLabReturnLink = [...document.querySelectorAll('a[href]')].some((anchor) => {
      try {
        const pathname = new URL(anchor.getAttribute('href'), location.href).pathname;
        return pathname === '/'
          || pathname === '/index.html'
          || pathname === '/pikalab/'
          || pathname === '/pikalab/index.html'
          || pathname.endsWith('/pikalab/');
      } catch {
        return false;
      }
    });

    const overflowOffenders = [...document.querySelectorAll('body *')]
      .filter(visible)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          className: String(el.className || '').replace(/\\s+/g, ' ').trim().slice(0, 90),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((item) => item.left < -4 || item.right > innerWidth + 4)
      .sort((a, b) => Math.max(Math.abs(b.left), b.right - innerWidth) - Math.max(Math.abs(a.left), a.right - innerWidth))
      .slice(0, 8);

    return {
      overflowX: Math.max(document.body?.scrollWidth || 0, doc.scrollWidth || 0) - doc.clientWidth,
      tinyControls,
      hasPikaLabReturnLink,
      overflowOffenders,
    };
  });

  result.metrics.mobileUsability = metrics;
  if (metrics.overflowX > 4) {
    const offenders = metrics.overflowOffenders
      .map((item) => `${item.tag}${item.id ? `#${item.id}` : ''} [${item.left},${item.right}] w${item.width}`)
      .join(', ');
    result.errors.push(`mobile page overflow ${metrics.overflowX}px${offenders ? `: ${offenders}` : ''}`);
  }
  if (isCatalogLab && metrics.tinyControls.length) {
    result.errors.push(`critically small mobile control: ${metrics.tinyControls.map((item) => `${item.tag}${item.id ? `#${item.id}` : ''} ${item.width}x${item.height}`).join(', ')}`);
  }
  if (isCatalogLab && !metrics.hasPikaLabReturnLink) {
    result.warnings.push('mobile return link to PikaLab is missing');
  }

  const parentOpener = page.locator('[data-action="parents-modal-open"]:visible').first();
  if (await parentOpener.count()) {
    const targetId = await parentOpener.getAttribute('aria-controls')
      || await parentOpener.getAttribute('data-target')
      || (await page.locator('#parents-modal').count() ? 'parents-modal' : null)
      || (await page.locator('#help-modal').count() ? 'help-modal' : null);

    let clickError = null;
    try {
      await parentOpener.click({ timeout: 1800 });
    } catch (error) {
      clickError = String(error?.message || error).split('\n')[0].slice(0, 180);
    }
    await page.waitForTimeout(100);

    if (clickError) {
      result.errors.push(`parents modal trigger is not clickable on mobile: ${clickError}`);
    } else if (!targetId) {
      result.errors.push('parents modal trigger has no resolvable target');
    } else {
      const modal = page.locator(`#${targetId}`);
      const modalState = await modal.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const isDialog = node instanceof HTMLDialogElement;
        return {
          visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
            && (!isDialog || node.open),
          scrollHeight: node.scrollHeight,
          clientHeight: node.clientHeight,
        };
      }).catch(() => ({ visible: false, scrollHeight: 0, clientHeight: 0 }));

      if (!modalState.visible) {
        result.errors.push(`parents modal did not open on mobile (#${targetId})`);
      } else {
        const closeButton = modal.locator('[data-action="parents-modal-close"]:visible').first();
        if (await closeButton.count()) {
          let closeError = null;
          let closePhase = 'settle';
          try {
            // showModal直後のフォント読込・有限のフェード/拡大が終わってから、実際の閉じる操作を検証する。
            // ボタン単体の安定判定では、親ダイアログや遅れて読み込むアイコンの変化を待ち切れない。
            await page.waitForFunction((id) => {
              const node = document.getElementById(id);
              return node && document.fonts.status === 'loaded'
                && node.getAnimations({ subtree: true }).every((animation) => {
                  const timing = animation.effect?.getComputedTiming();
                  return timing?.endTime === Infinity || (!animation.pending
                    && (animation.playState === 'finished' || animation.playState === 'idle'));
                });
            }, targetId, { timeout: 1800 });
            await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            closePhase = 'click';
            await closeButton.click({ timeout: 1800 });
          } catch (error) {
            closeError = String(error?.message || error).split('\n')[0].slice(0, 180);
            // 先頭行だけでは、不安定・遮蔽・viewport外を区別できないため、失敗時の根拠を残す。
            result.metrics.parentsModalCloseFailure = {
              phase: closePhase,
              callLog: String(error?.message || error),
              state: await closeButton.evaluate((node) => {
                const rect = node.getBoundingClientRect();
                const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
                const describe = (element) => element ? `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}` : null;
                const ancestors = [];
                for (let current = node; current; current = current.parentElement) {
                  const box = current.getBoundingClientRect(), style = getComputedStyle(current);
                  ancestors.push({ element: describe(current), x: box.x, y: box.y, width: box.width, height: box.height,
                    overflow: style.overflow, pointerEvents: style.pointerEvents, scrollTop: current.scrollTop,
                    animations: current.getAnimations().map((animation) => ({ property: animation.transitionProperty || animation.animationName,
                      pending: animation.pending, playState: animation.playState, currentTime: animation.currentTime })) });
                  if (current instanceof HTMLDialogElement) break;
                }
                return { fonts: document.fonts.status, activeElement: describe(document.activeElement),
                  centerHit: describe(hit), receivesEvents: Boolean(hit && (hit === node || node.contains(hit))), ancestors };
              }).catch((diagnosticError) => ({ error: String(diagnosticError?.message || diagnosticError) })),
            };
          }
          await page.waitForTimeout(80);
          const stillVisible = await modal.evaluate((node) => {
            const rect = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
              && (!(node instanceof HTMLDialogElement) || node.open);
          }).catch(() => false);
          if (closeError) result.errors.push(`parents modal ${closePhase === 'settle' ? 'did not settle before close' : 'close is not clickable'} on mobile: ${closeError}`);
          else if (stillVisible) result.errors.push(`parents modal did not close on mobile (#${targetId})`);
        } else {
          result.errors.push(`parents modal has no visible close control on mobile (#${targetId})`);
        }
      }
    }
  }

  const editable = page.locator('input:not([type="hidden"]):not([type="range"]):not([type="color"]):not([type="checkbox"]):not([type="radio"]):not([readonly]):visible, textarea:not([readonly]):visible, select:visible').first();
  if (await editable.count().catch(() => 0)) {
    await editable.scrollIntoViewIfNeeded().catch(() => {});
    await editable.focus().catch(() => {});
    const originalViewport = result.viewport;
    await page.setViewportSize({ width: originalViewport.width, height: 520 });
    await page.waitForTimeout(80);
    const compact = await page.evaluate(() => {
      const doc = document.documentElement;
      const active = document.activeElement;
      const rect = active?.getBoundingClientRect?.();
      return {
        overflowX: Math.max(document.body?.scrollWidth || 0, doc.scrollWidth || 0) - doc.clientWidth,
        activeVisible: !rect || (rect.right >= 0 && rect.left <= innerWidth && rect.bottom >= 0 && rect.top <= innerHeight),
      };
    });
    result.metrics.mobileKeyboard = compact;
    if (compact.overflowX > 4) result.errors.push(`keyboard-height horizontal overflow ${compact.overflowX}px`);
    if (!compact.activeVisible) result.errors.push('focused field leaves the mobile viewport when height shrinks');
    await page.setViewportSize({ width: originalViewport.width, height: originalViewport.height });
    // resizeをdebounceするLabが元レイアウトへ戻るまで待つ。
    await page.waitForTimeout(250);
  }
}

async function assertSpeedReader(page, result) {
  const metrics = await page.evaluate(() => {
    const main = document.querySelector('main')?.getBoundingClientRect();
    const header = document.querySelector('header')?.getBoundingClientRect();
    const play = document.querySelector('#main-play-btn')?.getBoundingClientRect();
    const reader = document.querySelector('#reader-display');
    return {
      mainWidth: main ? Math.round(main.width) : 0,
      headerWidth: header ? Math.round(header.width) : 0,
      playHeight: play ? Math.round(play.height) : 0,
      readerFontSize: reader ? Number.parseFloat(getComputedStyle(reader).fontSize) : 0,
    };
  });
  result.metrics.speedReader = metrics;
  if (metrics.mainWidth < 300 || metrics.headerWidth < 300) {
    result.errors.push(`Speed Reader layout width collapsed (${metrics.mainWidth}/${metrics.headerWidth})`);
  }
  if (metrics.playHeight < 44) {
    result.errors.push(`Speed Reader play button too short (${metrics.playHeight}px)`);
  }
  if (metrics.readerFontSize < 32) {
    result.errors.push(`Speed Reader reader font too small (${metrics.readerFontSize}px)`);
  }
}

async function assertQuestBoard(page, result) {
  if (result.viewport.id !== 'mobile') return;
  const stampMetrics = await page.evaluate(() => {
    const spots = [...document.querySelectorAll('.stamp-spot')].map((spot) => {
      const rect = spot.getBoundingClientRect();
      return Math.min(rect.width, rect.height);
    });
    return {
      count: spots.length,
      minSize: spots.length ? Math.round(Math.min(...spots)) : 0,
    };
  });
  result.metrics.questBoard = stampMetrics;
  if (stampMetrics.count < 35) {
    result.errors.push(`Quest Board did not render 35 stamps (${stampMetrics.count})`);
  }
  if (stampMetrics.minSize < 44) {
    result.errors.push(`Quest Board mobile stamp target too small (${stampMetrics.minSize}px)`);
  }
}

function isLightColor(value) {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return false;
  const [, r, g, b] = match.map(Number);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.82;
}

function startStaticServer(directory) {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
  };
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    const decodedPath = decodeURIComponent(requestUrl.pathname);
    const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
    let filePath = path.join(directory, normalizedPath);
    if (!filePath.startsWith(directory)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    if (!fs.existsSync(filePath)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, { 'Content-Type': mimeTypes[extension] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(response);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function assertTypingDojo(page, result) {
  // モバイルで非表示の任意操作をPlaywright既定の30秒ずつ待たない。
  page.setDefaultTimeout(1000);

  // 1. かなモード（デフォルト）で「かんたん」をクリックしてゲーム画面に入る
  await page.click('button[data-level="easy"]').catch(() => {});
  await page.waitForTimeout(100); // アニメーション待ち (500ms -> 100ms)
  // カウントダウン (setInterval乗っ取りにより3秒が30msで進むため、200ms待てば十分)
  await page.waitForTimeout(200); // 3500ms -> 200ms
  const fileNameKana = `typing-dojo-kana-${result.viewport.id}-${result.theme}.png`;
  await page.screenshot({ path: path.join(artifactDir, fileNameKana), fullPage: false }).catch(() => {});

  // 2. 一旦ゲームをやめる
  await page.click('#quit-btn').catch(() => {});
  await page.waitForTimeout(100); // 500ms -> 100ms

  // 3. 設定を開いて「ローマ字（英字）」に変更する
  await page.click('#open-settings-btn').catch(() => {});
  await page.waitForTimeout(100); // 300ms -> 100ms
  await page.selectOption('#keyboard-type-select', 'romaji').catch(() => {});
  await page.click('#close-settings-btn').catch(() => {});
  await page.waitForTimeout(100); // 300ms -> 100ms

  // 4. 再び「かんたん」をクリックしてゲーム画面に入り、英字QWERTYキーボード表示を撮影する
  await page.click('button[data-level="easy"]').catch(() => {});
  await page.waitForTimeout(100); // 500ms -> 100ms
  await page.waitForTimeout(200); // 3500ms -> 200ms (setInterval乗っ取り対応)
  const fileNameRomaji = `typing-dojo-romaji-${result.viewport.id}-${result.theme}.png`;
  await page.screenshot({ path: path.join(artifactDir, fileNameRomaji), fullPage: false }).catch(() => {});
}



async function assertTopLifecycle(page, result) {
  const guest = page.locator('#guest-enter-btn');
  if (await guest.isVisible()) await guest.click();
  await page.locator('#menu-toggle-btn').click();
  await page.waitForTimeout(30);
  await page.evaluate(() => {
    const trigger = document.getElementById('menu-toggle-btn');
    trigger.click();
    trigger.click();
  });
  await page.waitForTimeout(250);
  const reopened = await page.locator('#dropdown-menu').evaluate(menu => !menu.classList.contains('hidden') && menu.classList.contains('opacity-100'));
  if (!reopened) result.errors.push('再び開いたメニューが古いcloseタイマーで隠れる');
  await page.evaluate(() => {
    document.querySelector('#dropdown-menu [data-action="open-settings"]').click();
    document.querySelector('[data-close-modal="settings-modal"]').click();
  });
  await page.waitForTimeout(250);
  const closedCleanly = await page.locator('#settings-modal').evaluate(modal => modal.classList.contains('hidden') && !modal.contains(document.activeElement));
  if (!closedCleanly) result.errors.push('閉じた設定画面へ遅延フォーカスが残る');
}


async function assertFractionResult(page, result) {
  await page.locator('#tab-secret').click();
  await page.locator('#egypt-n').fill('44');
  await page.locator('#egypt-d').fill('53');
  await page.locator('#btn-calc-egypt').click();
  const measured = await page.evaluate(() => {
    return ['egypt-formula', 'egypt-steps'].map(id => {
      const element = document.getElementById(id);
      return { id, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth };
    });
  });
  for (const item of measured) {
    if (item.scrollWidth > item.clientWidth + 1) result.errors.push(`${item.id}: 長い分母が結果枠から${item.scrollWidth - item.clientWidth}pxはみ出す`);
  }
  const steps = await page.locator('#egypt-steps').textContent();
  if (!steps.includes('3/2091748197560349655964')) result.errors.push('44/53の正確な途中式が表示されていない');
  await page.locator('#egypt-content').scrollIntoViewIfNeeded();
}
