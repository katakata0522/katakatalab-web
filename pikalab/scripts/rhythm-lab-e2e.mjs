import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { runRhythmRegressions } from '../rhythm_lab/tests/browser-regressions.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const pikalabRoot = path.resolve(here, '..');
const server = await createServer({
    root: pikalabRoot,
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: false }
});

const cellSelector = 'button[data-type][data-index]';
const kickFirstSelector = 'button[data-type="kick"][data-index="0"]';

async function waitForRhythmLab(page) {
    await page.waitForFunction((selector) => document.querySelectorAll(selector).length === 80, cellSelector);
}

async function verifyBuiltQrConsumers(browser, artifactDir) {
    // Viteのpublic優先配信で、ビルドが使う正本の誤りを隠さない。
    const source = await readFile(path.join(pikalabRoot, 'js/qrcode.min.js'), 'utf8');
    const publicCopy = await readFile(path.join(pikalabRoot, 'public/js/qrcode.min.js'), 'utf8');
    const deployed = await readFile(path.join(pikalabRoot, 'dist/js/qrcode.min.js'), 'utf8');
    assert.equal(source.trim(), publicCopy.trim(), 'QRの開発用コピーと配信正本は同じ実装である');
    assert.equal(deployed, source, 'QRの実ビルド成果物は検証済み正本とバイト一致する');
    const productionRhythmUrl = 'https://katakatalab.com/pikalab/rhythm_lab/?p=eyJzY2hlbWFWZXJzaW9uIjoyLCJ0ZW1wbyI6MTczLCJwYXR0ZXJuIjp7ImhpaGF0IjpbMSwwLDEsMCwxLDAsMSwwLDEsMCwxLDAsMSwwLDEsMV0sImNsYXAiOlswLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwXSwic25hcmUiOlswLDAsMCwwLDEsMCwwLDAsMCwwLDAsMCwxLDAsMCwwXSwidG9tIjpbMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwxLDAsMF0sImtpY2siOlsxLDAsMSwwLDAsMCwxLDAsMCwwLDEsMCwwLDAsMSwwXX19';
    const payload = Buffer.from(JSON.stringify({ title: '共有QRの検証', items: ['あいうえお', '1234567890'] })).toString('base64url');
    const fixtures = [
        { name: 'rhythm', text: productionRhythmUrl, size: 180, dark: '#ec4899', light: '#fafaf9' },
        { name: 'quest', text: `https://katakatalab.com/pikalab/quest_board/?q=${payload}`, size: 180, dark: '#292524', light: '#fafaf9' },
        { name: 'science', text: `https://katakatalab.com/pikalab/science_maker/?q=${payload}`, size: 180, dark: '#1f2937', light: '#f9fafb' },
        { name: 'book', text: `https://katakatalab.com/pikalab/book_report/?data=${payload}`, size: 176, dark: '#0288D1', light: '#ffffff' }
    ];
    const context = await browser.newContext({ viewport: { width: 300, height: 300 } });
    try {
        const page = await context.newPage();
        await page.setContent('<!doctype html><body style="padding:24px"><div id="qr"></div></body>');
        await page.addScriptTag({ content: deployed });
        const results = [];
        for (const fixture of fixtures) {
            const result = await page.evaluate(fixture => {
                const container = document.getElementById('qr');
                container.replaceChildren();
                new QRCode(container, { text: fixture.text, width: fixture.size, height: fixture.size,
                    colorDark: fixture.dark, colorLight: fixture.light, correctLevel: QRCode.CorrectLevel.M });
                const canvas = container.querySelector('canvas');
                const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
                return { name: fixture.name, title: container.title, width: canvas.width, height: canvas.height,
                    redValues: new Set(Array.from(pixels).filter((_, index) => index % 4 === 0)).size };
            }, fixture);
            assert.equal(result.title, fixture.text);
            assert.equal(result.width, fixture.size);
            assert.equal(result.height, fixture.size);
            assert.ok(result.redValues > 1, `${fixture.name}: 空白ではなくQRの濃淡を描画する`);
            results.push(result);
            await page.screenshot({ path: path.join(artifactDir, `built-qr-${fixture.name}.png`) });
        }
        await writeFile(path.join(artifactDir, 'built-qr-consumers.json'), JSON.stringify(results, null, 2));
        console.log('[OK] 実ビルドのQRを本番URLと4つの利用先の設定で生成しました。');
    } finally { await context.close(); }
}

let browser;
let baselineServer;
try {
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === 'string') throw new Error('Viteのテスト用ポートを取得できません');
    const baseUrl = `http://127.0.0.1:${address.port}/rhythm_lab/`;

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();

    await page.route('**/assets/tone-14.8.49.js', (route) => route.abort());
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await waitForRhythmLab(page);

    assert.equal(await page.locator(cellSelector).count(), 80, '5楽器×16ステップの80 native buttonセルが生成される');
    assert.equal(await page.locator(`${cellSelector}[role]`).count(), 0, 'native buttonへ冗長なbutton roleを付けない');

    for (const id of ['help-modal', 'share-modal', 'parents-modal']) {
        assert.equal(await page.locator('#' + id).evaluate(node => node.parentElement === document.body), true, id + 'は独立した画面としてbody直下に配置する');
    }
    const parentsTrigger = page.locator('[data-action="parents-modal-open"]').first();
    await parentsTrigger.click();
    await page.waitForFunction(() => document.getElementById('parents-modal')?.open === true);
    assert.equal(await parentsTrigger.getAttribute('aria-expanded'), 'true', '保護者モーダルを開ける');
    assert.equal(await page.locator('#parents-modal').isVisible(), true, 'open属性だけでなく画面に表示される');
    await page.locator('[data-action="parents-modal-close"]').first().click();
    await page.waitForFunction(() => document.getElementById('parents-modal')?.open === false);
    assert.equal(await parentsTrigger.getAttribute('aria-expanded'), 'false', '保護者モーダルを閉じると状態を戻す');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-action')), 'parents-modal-open', '閉じた後に起動ボタンへフォーカスを戻す');

    const kickFirst = page.locator(kickFirstSelector);
    await kickFirst.click();
    await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('aria-pressed') === 'true', kickFirstSelector);
    assert.equal(await kickFirst.getAttribute('aria-pressed'), 'true', 'Tone.js失敗時でもセル編集が即時反映される');

    // native buttonの標準キーボード動作を使い、グローバルSpace再生と競合しないことを確認する。
    await kickFirst.focus();
    await kickFirst.press('Space');
    assert.equal(await kickFirst.getAttribute('aria-pressed'), 'false', 'Spaceでnative buttonを1回だけ切り替える');
    await kickFirst.press('Enter');
    assert.equal(await kickFirst.getAttribute('aria-pressed'), 'true', 'Enterでnative buttonを1回だけ切り替える');

    const tempoInput = page.locator('#tempo-input');
    await tempoInput.fill('173');
    await tempoInput.blur();
    assert.equal(await tempoInput.inputValue(), '173', '173 BPMを入力できる');

    await page.locator('#preset-name').fill('E2Eビート');
    await page.locator('#save-preset-btn').click();
    await page.waitForFunction(() => {
        const raw = localStorage.getItem('rhythmlab_user_projects_v2');
        if (!raw) return false;
        const projects = JSON.parse(raw);
        return projects[0]?.schemaVersion === 2 && projects[0]?.tempo === 173 && projects[0]?.pattern?.kick?.[0] === 1;
    });

    const savedProject = await page.evaluate(() => JSON.parse(localStorage.getItem('rhythmlab_user_projects_v2'))[0]);
    assert.equal(savedProject.name, 'E2Eビート', '保存名を保持する');
    assert.equal(savedProject.tempo, 173, '作品保存でBPMを保持する');
    assert.equal(savedProject.pattern.kick[0], 1, '保存したパターンを保持する');

    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForRhythmLab(page);
    assert.equal(await page.locator(kickFirstSelector).getAttribute('aria-pressed'), 'true', '自動保存からパターンを復元する');
    assert.equal(await page.locator('#tempo-input').inputValue(), '173', '自動保存からBPMを復元する');

    await page.locator('#share-btn').click();
    await page.waitForFunction(() => !document.getElementById('share-modal')?.classList.contains('hidden'));
    const shareUrl = await page.locator('#share-link-input').inputValue();
    assert.match(shareUrl, /\?p=/, '共有URLにペイロードがある');

    const shareContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const sharePage = await shareContext.newPage();
    sharePage.on('dialog', (dialog) => dialog.accept());
    await sharePage.goto(shareUrl, { waitUntil: 'domcontentloaded' });
    await waitForRhythmLab(sharePage);
    assert.equal(await sharePage.locator(kickFirstSelector).getAttribute('aria-pressed'), 'true', '共有先でパターンを復元する');
    assert.equal(await sharePage.locator('#tempo-input').inputValue(), '173', '共有先でBPMを復元する');
    await shareContext.close();

    // 旧保存形式は、アプリ起動より前に投入して実ユーザーの既存localStorageを再現する。
    const legacyContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await legacyContext.addInitScript(() => {
        if (sessionStorage.getItem('rhythm-e2e-legacy-seeded') === 'true') return;
        sessionStorage.setItem('rhythm-e2e-legacy-seeded', 'true');
        const empty = { hihat: Array(16).fill(0), clap: Array(16).fill(0), snare: Array(16).fill(0), tom: Array(16).fill(0), kick: Array(16).fill(0) };
        empty.kick[0] = 1;
        localStorage.removeItem('rhythmlab_user_projects_v2');
        localStorage.setItem('rhythmlab_user_presets', JSON.stringify([{ name: '旧ビート', data: empty }]));
        localStorage.removeItem('rhythmlab_autosave_project_v2');
        localStorage.setItem('rhythmlab_autosave_grid', JSON.stringify(empty));
    });
    const legacyPage = await legacyContext.newPage();
    await legacyPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await waitForRhythmLab(legacyPage);
    const migrated = await legacyPage.evaluate(() => JSON.parse(localStorage.getItem('rhythmlab_user_projects_v2'))[0]);
    assert.equal(migrated.tempo, 120, '旧保存作品は120 BPMとして移行する');
    assert.equal(await legacyPage.locator('#tempo-input').inputValue(), '120', '旧自動保存は120 BPMとして復元する');
    assert.equal(await legacyPage.locator(kickFirstSelector).getAttribute('aria-pressed'), 'true', '旧自動保存のパターンを復元する');
    await legacyContext.close();

    await context.close();
    let baselineUrl;
    if (process.env.RHYTHM_BASELINE_ROOT) {
        baselineServer = await createServer({
            root: path.resolve(process.env.RHYTHM_BASELINE_ROOT), configFile: false, logLevel: 'error',
            server: { host: '127.0.0.1', port: 0, strictPort: false }
        });
        await baselineServer.listen();
        baselineUrl = `http://127.0.0.1:${baselineServer.httpServer.address().port}/rhythm_lab/`;
    }
    const artifactDir = path.join(pikalabRoot, 'visual-guard-artifacts', 'rhythm');
    const browserFailures = [];
    try {
        await runRhythmRegressions(browser, baseUrl, { baselineUrl, artifactDir });
    } catch (error) { browserFailures.push(error); }

    try { await verifyBuiltQrConsumers(browser, artifactDir); }
    catch (error) { browserFailures.push(error); }

    // 実際の同梱Tone.jsでも5楽器・高BPM・中断後の再開を通す。
    const audioContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    try {
        const audioPage = await audioContext.newPage();
        const audioErrors = [];
        audioPage.on('pageerror', error => audioErrors.push(error.message));
        audioPage.on('console', message => {
            if (message.type() === 'error' && /音声|再生|オーディオ/.test(message.text())) audioErrors.push(message.text());
        });
        await audioPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
        await waitForRhythmLab(audioPage);
        await audioPage.locator('#preset-funk').click();
        await audioPage.waitForFunction(() => RhythmLab.getState().isAudioInit);
        for (const instrument of ['hihat', 'clap', 'snare', 'tom', 'kick']) {
            await audioPage.locator('#instrument-' + instrument).click();
        }
        await audioPage.locator('button[data-type="clap"][data-index="0"]').click();
        await audioPage.evaluate(() => {
            window.__rhythmWaveform = new Tone.Waveform(1024);
            Tone.Destination.connect(window.__rhythmWaveform);
        });
        await audioPage.locator('#tempo-input').fill('240');
        await audioPage.locator('#tempo-input').blur();
        await audioPage.locator('#play-btn').click();
        await audioPage.waitForFunction(() => RhythmLab.getState().isPlaying);
        // 240 BPMで2小節以上再生し、実際の出力波形が無音でないことも確認する。
        const peak = await audioPage.evaluate(async () => {
            let peak = 0;
            const until = performance.now() + 2200;
            while (performance.now() < until) {
                for (const value of window.__rhythmWaveform.getValue()) peak = Math.max(peak, Math.abs(value));
                await new Promise(resolve => setTimeout(resolve, 16));
            }
            return peak;
        });
        assert.ok(Number.isFinite(peak) && peak > 0.0001, `実Tone.jsの出力波形を検出する: peak=${peak}`);
        await audioPage.locator('#play-btn').click();
        assert.equal(await audioPage.evaluate(() => RhythmLab.getState().isPlaying), false);
        await audioPage.evaluate(() => Tone.context.rawContext.suspend());
        await audioPage.locator('#play-btn').click();
        await audioPage.waitForFunction(() => Tone.context.state === 'running' && RhythmLab.getState().isPlaying);
        await audioPage.evaluate(() => window.dispatchEvent(new Event('pagehide')));
        assert.equal(await audioPage.evaluate(() => Tone.Transport.state), 'stopped');
        assert.deepEqual(audioErrors, [], '実Tone.jsで再生中・再開時の例外がない');
        await mkdir(artifactDir, { recursive: true });
        await audioPage.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 3000))]));
        const fonts = await audioPage.evaluate(() => [...document.fonts].map(font => ({ family: font.family, status: font.status })));
        await writeFile(path.join(artifactDir, 'real-audio.json'), JSON.stringify({ audioErrors, fonts, peak, playback: 'passed', suspensionResume: 'passed' }, null, 2));
        for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
            await audioPage.setViewportSize(viewport);
            await audioPage.screenshot({ path: path.join(artifactDir, `real-runtime-${viewport.width}x${viewport.height}.png`), fullPage: true, animations: 'disabled' });
        }
    } catch (error) { browserFailures.push(error); }
    finally { await audioContext.close(); }
    if (browserFailures.length) throw new AggregateError(browserFailures, 'Rhythm Labの独立したブラウザ検証で失敗しました');
    console.log('[OK] Rhythm Lab E2E: 保存互換・レイアウト・キーボード・中断・実音声の導線を確認しました。');
} finally {
    if (browser) await browser.close();
    if (baselineServer) await baselineServer.close();
    await server.close();
}
