import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const argDir = process.argv[2] || 'dist';
const distDir = path.resolve(rootDir, argDir);
const relCheck = path.relative(rootDir, distDir);
if (!relCheck || relCheck.startsWith('..') || path.isAbsolute(relCheck)) {
  console.error('不正な出力ディレクトリ指定です:', argDir);
  process.exit(1);
}

const distHtmlPath = path.join(distDir, 'index.html');
if (!fs.existsSync(distHtmlPath)) {
  console.error(`${argDir}/index.html が見つかりません。先に vite build を実行してください。`);
  process.exit(1);
}

let html = fs.readFileSync(distHtmlPath, 'utf-8');

// 相対CSSリンクをインライン <style> に展開
html = html.replace(
  /<link\s+rel="stylesheet"[^>]*href="(\.\/assets\/[^"]+\.css)"[^>]*>/g,
  (_match, relPath) => {
    const cssFull = path.join(distDir, relPath.replace(/^\.\//, ''));
    const css = fs.readFileSync(cssFull, 'utf-8');
    return `<style>\n${css}\n</style>`;
  }
);

// 相対JSスクリプトを抜き出して </body> 直前にクラシック <script> (IIFE) としてインライン展開
// file:// で Chrome から直接開いても type="module" の CORS 制限にかからないようにする
let inlineScriptTag = '';
let scriptHash = '';
html = html.replace(
  /<script\s+type="module"[^>]*src="(\.\/assets\/[^"]+\.js)"[^>]*><\/script>\s*/g,
  (_match, relPath) => {
    const jsFull = path.join(distDir, relPath.replace(/^\.\//, ''));
    const js = fs.readFileSync(jsFull, 'utf-8').replace(/<\/script/gi, '<\\/script');
    const scriptBody = `\n(function(){\n${js}\n})();\n`;
    scriptHash = crypto.createHash('sha256').update(scriptBody, 'utf8').digest('base64');
    inlineScriptTag = `<script>${scriptBody}</script>`;
    return '';
  }
);
if (!inlineScriptTag || !scriptHash) {
  console.error('dist/index.html からインライン化対象のモジュールスクリプトが見つかりませんでした。');
  process.exit(1);
}
html = html.replace('</body>', () => `${inlineScriptTag}\n  </body>`);

// standalone.html 用 CSP を実際のインラインスクリプトの SHA-256 ダイジェストに切り替え（'unsafe-inline' 禁止）
const standaloneCsp = `default-src 'none'; script-src 'sha256-${scriptHash}'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';`;
const cspMetaRegex = /<meta\s+http-equiv="Content-Security-Policy"[^>]*>/i;
if (!cspMetaRegex.test(html)) {
  console.error('dist/index.html に Content-Security-Policy メタタグが見つかりませんでした。');
  process.exit(1);
}
html = html.replace(
  cspMetaRegex,
  () => `<meta http-equiv="Content-Security-Policy" content="${standaloneCsp}" />`
);

// standalone.html 用に favicon / manifest の外部参照も安全に除去またはデータURI化
const faviconPath = path.join(distDir, 'assets', 'favicon.svg');
if (fs.existsSync(faviconPath)) {
  const svgB64 = Buffer.from(fs.readFileSync(faviconPath, 'utf-8')).toString('base64');
  html = html.replace(
    /href="\.\/assets\/favicon\.svg"/g,
    `href="data:image/svg+xml;base64,${svgB64}"`
  );
}
html = html.replace(/<link\s+rel="manifest"[^>]*>\s*/g, '');

const standaloneOut = path.join(rootDir, 'standalone.html');
fs.writeFileSync(standaloneOut, html, 'utf-8');
if (distDir !== path.join(rootDir, 'dist')) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
console.log(`[OK] standalone.html を生成しました (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
