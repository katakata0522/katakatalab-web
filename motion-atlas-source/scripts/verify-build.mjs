import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const hasApacheConfig = fs.existsSync(path.join(rootDir, 'public/.htaccess'));
const hasLocalFavicon = fs.existsSync(path.join(rootDir, 'public/assets/favicon.svg'));

const requiredFiles = [
  'dist/index.html',
  'dist/404.html',
  'dist/manifest.webmanifest',
  'standalone.html',
  ...(hasApacheConfig ? ['dist/.htaccess'] : []),
  ...(hasLocalFavicon ? ['dist/assets/favicon.svg'] : [])
];

let ok = true;
const fail = (msg) => {
  console.error(`[FAIL] ${msg}`);
  ok = false;
};

for (const rel of requiredFiles) {
  const full = path.join(rootDir, rel);
  if (!fs.existsSync(full)) {
    fail(`必須ファイルが不足: ${rel}`);
  } else {
    console.log(`[PASS] ${rel}`);
  }
}

function getCspScriptSrc(html) {
  const match = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
  if (!match) return { full: '', scriptSrc: '' };
  const full = match[1];
  const scriptMatch = full.match(/script-src\s+([^;]+)/i);
  return { full, scriptSrc: scriptMatch ? scriptMatch[1].trim() : '' };
}

function collectFiles(dir, exts) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

// 1. dist/index.html 相対パス & CSP 検証
const distIndex = fs.readFileSync(path.join(rootDir, 'dist/index.html'), 'utf-8');
if (distIndex.includes('src="/assets/') || distIndex.includes('href="/assets/')) {
  fail('dist/index.html に絶対パス (/assets/) が含まれておりサブディレクトリ配置で壊れます');
} else {
  console.log('[PASS] dist/index.html は相対パス (./assets/) を使用しています');
}
if (distIndex.includes('./assets/favicon.svg') !== hasLocalFavicon ||
    distIndex.includes('./manifest.webmanifest') !== hasLocalFavicon) {
  fail('dist/index.html のアイコンとマニフェストの参照がローカルのアイコンの有無と一致しません');
}

const distCsp = getCspScriptSrc(distIndex);
if (
  !distCsp.full ||
  distCsp.scriptSrc !== "'self'" ||
  distCsp.full.includes("'unsafe-eval'") ||
  !/<meta\s+name="referrer"\s+content="/i.test(distIndex)
) {
  fail(`dist/index.html の CSP / Referrer 設定が要件を満たしていません: ${distCsp.full}`);
} else {
  console.log("[PASS] dist/index.html の厳格 CSP (script-src 'self') & Referrer-Policy を確認");
}

// 2. 手元のApache設定を同梱するときは、従来のヘッダー要件を検証する。
if (hasApacheConfig) {
  const distHtaccess = fs.readFileSync(path.join(rootDir, 'dist/.htaccess'), 'utf-8');
  const requiredHeaders = [
    'Content-Security-Policy',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Referrer-Policy',
    'Permissions-Policy',
    "frame-ancestors 'self'"
  ];
  for (const header of requiredHeaders) {
    if (!distHtaccess.includes(header)) {
      fail(`dist/.htaccess にセキュリティヘッダー指定が不足しています: ${header}`);
    }
  }
  console.log('[PASS] dist/.htaccess セキュリティヘッダー群を確認');
}

const dist404 = fs.readFileSync(path.join(rootDir, 'dist/404.html'), 'utf-8');
if (!getCspScriptSrc(dist404).full || /<script\b/i.test(dist404)) {
  fail('dist/404.html の CSP またはスクリプト禁止設定が不正です');
} else {
  console.log('[PASS] dist/404.html はゼロスクリプト CSP で保護されています');
}

// 3. standalone.html（file:// 直開き用）＆ SHA-256 ダイジェスト一致検証
const standalone = fs.readFileSync(path.join(rootDir, 'standalone.html'), 'utf-8');
if (!standalone.includes('<style>') || !standalone.includes('動きの仕組み図鑑')) {
  fail('standalone.html にスタイルまたはタイトルが含まれていません');
} else if (/<script\s+type="module"/i.test(standalone) || standalone.includes('./assets/')) {
  fail('standalone.html に type="module" または外部 ./assets/ 参照が残っています');
} else {
  const scriptMatches = [...standalone.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (scriptMatches.length !== 1) {
    fail(`standalone.html のインライン <script> 数が不正です (${scriptMatches.length})`);
  } else {
    const scriptBody = scriptMatches[0][1];
    try {
      new vm.Script(scriptBody.replace(/<\\\/script/gi, '</script'));
      const actualHash = crypto.createHash('sha256').update(scriptBody, 'utf8').digest('base64');
      const standaloneCsp = getCspScriptSrc(standalone);
      if (
        !standaloneCsp.full ||
        standaloneCsp.scriptSrc.includes("'unsafe-inline'") ||
        standaloneCsp.full.includes("'unsafe-eval'") ||
        standaloneCsp.scriptSrc !== `'sha256-${actualHash}'`
      ) {
        fail(
          `standalone.html の CSP SHA-256 ハッシュが一致しません (expected 'sha256-${actualHash}', got ${standaloneCsp.scriptSrc})`
        );
      } else {
        console.log(
          `[PASS] standalone.html (クラシック <script> 構文・CSP 'sha256-...' ダイジェスト完全一致)`
        );
      }
    } catch (err) {
      fail(`standalone.html のインライン JS に構文エラーがあります: ${String(err)}`);
    }
  }
}

// 4. ソースコードの XSS / 危険な動的実行シンクのスキャン (src/**/*.{ts,tsx})
const srcDir = path.join(rootDir, 'src');
const dangerousPatterns = [
  { name: 'dangerouslySetInnerHTML', re: /\bdangerouslySetInnerHTML\b/ },
  { name: '.innerHTML =', re: /\.innerHTML\s*[+=]/ },
  { name: '.outerHTML =', re: /\.outerHTML\s*[+=]/ },
  { name: 'insertAdjacentHTML', re: /\binsertAdjacentHTML\s*\(/ },
  { name: 'document.write', re: /\bdocument\.write(?:ln)?\s*\(/ },
  { name: 'eval()', re: /\beval\s*\(/ },
  { name: 'new Function()', re: /\bnew\s+Function\s*\(/ },
  { name: 'javascript: URL', re: /['"`]javascript:/i }
];
const sourceFiles = collectFiles(srcDir, ['.ts', '.tsx']);
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  for (const sig of dangerousPatterns) {
    if (sig.re.test(content)) {
      fail(`危険な DOM/スクリプト記述 (${sig.name}) を検出: ${path.relative(rootDir, file)}`);
    }
  }
}
console.log(`[PASS] 全 ${sourceFiles.length} ファイルで XSS 危険シンク (innerHTML / eval 等) ゼロ`);

// 5. セキュリティユーティリティ (src/utils/security.ts) 単体テスト
try {
  const secSrc = fs.readFileSync(path.join(srcDir, 'utils', 'security.ts'), 'utf-8');
  const transpiled = ts.transpileModule(secSrc, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;

  const mod = { exports: {} };
  const requireFn = createRequire(import.meta.url);
  const fn = new vm.Script(`(function(exports, require, module){${transpiled}\n})`).runInThisContext();
  fn(mod.exports, requireFn, mod);

  const { sanitizePlainText, sanitizeEasing, clampAndRound, sanitizeControls } = mod.exports;

  // 制御文字・BiDi制御文字・長文切り詰めテスト
  let unitOk = true;
  const dirty = '見出し\u0000テスト\u202E悪意\u0007' + 'あ'.repeat(300);
  const cleaned = sanitizePlainText(dirty, 40);
  if (cleaned.length !== 40 || /[\u0000-\u001f\u202E]/.test(cleaned)) {
    fail(`sanitizePlainText が制御文字・BiDi・長さ上限を正しく処理できません: ${cleaned}`);
    unitOk = false;
  }

  // Prototype pollution / 許可リスト外イージング拒否テスト
  if (
    sanitizeEasing('__proto__', 'smooth') !== 'smooth' ||
    sanitizeEasing('constructor', 'snappy') !== 'snappy' ||
    sanitizeEasing('toString', 'spring') !== 'spring' ||
    sanitizeEasing('linear-evil', '__proto__') !== 'smooth' ||
    sanitizeEasing('spring', 'smooth') !== 'spring'
  ) {
    fail('sanitizeEasing の Prototype Pollution 防御または許可リスト検証に失敗');
    unitOk = false;
  }

  // 数値範囲外 / NaN / Infinity の安全な丸めテスト
  if (clampAndRound(NaN, 0.2, 2.0, 0.05, 0.6) !== 0.6 || clampAndRound(999, 0.2, 2.0, 0.05, 0.6) !== 2) {
    fail('clampAndRound の境界・NaN防御に失敗');
    unitOk = false;
  }

  const fakePattern = {
    defaultDuration: 0.6,
    durationRange: { min: 0.2, max: 2.0, step: 0.05 },
    secondarySlider: { label: '距離', unit: 'px', min: 8, max: 64, step: 4, defaultValue: 24 },
    defaultEasing: 'smooth'
  };
  const guarded = sanitizeControls(fakePattern, {
    duration: Infinity,
    distance: -999,
    easing: '__proto__'
  });
  if (guarded.duration !== 0.6 || guarded.distance !== 8 || guarded.easing !== 'smooth') {
    fail(`sanitizeControls が不正値を正規化できていません: ${JSON.stringify(guarded)}`);
    unitOk = false;
  }

  if (unitOk) {
    console.log('[PASS] security.ts 単体テスト（XSS制御文字除去 / Prototype Pollution防御 / 境界クランプ）');
  }
} catch (err) {
  fail(`security.ts 単体テストの実行エラー: ${String(err)}`);
}

// 6. パターンIDの重複・総数チェック（src/data/*.ts）
const dataDir = path.join(srcDir, 'data');
const patternIds = [];
for (const file of fs.readdirSync(dataDir)) {
  if (!file.startsWith('patterns') || !file.endsWith('.ts')) continue;
  const src = fs.readFileSync(path.join(dataDir, file), 'utf-8');
  for (const m of src.matchAll(/^\s{4}id:\s*'([^']+)'/gm)) {
    patternIds.push(m[1]);
  }
}
const EXPECTED_PATTERN_COUNT = 100;
const uniqueIds = new Set(patternIds);
if (patternIds.length !== EXPECTED_PATTERN_COUNT || uniqueIds.size !== EXPECTED_PATTERN_COUNT) {
  fail(
    `パターン定義数が不正または重複あり (総数=${patternIds.length}, ユニーク=${uniqueIds.size}, 期待=${EXPECTED_PATTERN_COUNT})`
  );
} else {
  console.log(`[PASS] パターン定義 ${EXPECTED_PATTERN_COUNT}件・ID重複なし`);
}

// ---------------------------------------------------------------------------
// 5. 不変シリアル番号レジストリ (src/data/serialRegistry.ts) との 1:1 整合検査
// ---------------------------------------------------------------------------
const registryPath = path.join(rootDir, 'src', 'data', 'serialRegistry.ts');
const registrySrc = fs.readFileSync(registryPath, 'utf8');
const registryIds = [...registrySrc.matchAll(/^\s+'([a-z0-9-]+)',?\s*$/gm)].map((m) => m[1]);
const registrySet = new Set(registryIds);
const missingInRegistry = patternIds.filter((id) => !registrySet.has(id));
const missingInData = registryIds.filter((id) => !uniqueIds.has(id));

if (
  registryIds.length !== EXPECTED_PATTERN_COUNT ||
  registrySet.size !== EXPECTED_PATTERN_COUNT ||
  missingInRegistry.length > 0 ||
  missingInData.length > 0
) {
  fail(
    `シリアル番号レジストリとパターン定義が不一致 (reg=${registryIds.length}, 未登録=${missingInRegistry.join(',') || 'なし'}, 未実装=${missingInData.join(',') || 'なし'})`
  );
} else {
  console.log(`[PASS] シリアル番号レジストリ 1..${EXPECTED_PATTERN_COUNT} 完全一致`);
}

// ---------------------------------------------------------------------------
// 6. 全 100 パターンに対応するステージ描画ケース (case '<id>':) の網羅検査
// ---------------------------------------------------------------------------
const stagesDir = path.join(rootDir, 'src', 'components', 'stages');
const stageFiles = fs
  .readdirSync(stagesDir)
  .filter((name) => name.startsWith('Stage') && name.endsWith('.tsx') && name !== 'StageDispatcher.tsx');

const handledStageIds = new Set();
for (const fileName of stageFiles) {
  const stageSrc = fs.readFileSync(path.join(stagesDir, fileName), 'utf8');
  for (const m of stageSrc.matchAll(/case\s+'([a-z0-9-]+)':/g)) {
    handledStageIds.add(m[1]);
  }
}

const missingStageCases = registryIds.filter((id) => !handledStageIds.has(id));
if (missingStageCases.length > 0) {
  fail(`ステージ描画ケースが未定義のパターンあり: ${missingStageCases.join(', ')}`);
} else {
  console.log(`[PASS] ステージ描画ハンドラ 全${EXPECTED_PATTERN_COUNT}種 100% 網羅`);
}

// ---------------------------------------------------------------------------
// 7. Tailwind CSS レジストリ 全100種 網羅検査
// ---------------------------------------------------------------------------
const tailwindIds = new Set();
for (const partName of ['tailwindPart1.ts', 'tailwindPart2.ts', 'tailwindPart3.ts']) {
  const partSrc = fs.readFileSync(path.join(dataDir, partName), 'utf8');
  for (const m of partSrc.matchAll(/^\s+'([a-z0-9-]+)':/gm)) {
    tailwindIds.add(m[1]);
  }
}
const missingTailwind = registryIds.filter((id) => !tailwindIds.has(id));
if (missingTailwind.length > 0) {
  fail(`Tailwind CSS レジストリ未定義あり: ${missingTailwind.join(', ')}`);
} else {
  console.log(`[PASS] Tailwind CSS コード全${EXPECTED_PATTERN_COUNT}種 100% 網羅`);
}

// ---------------------------------------------------------------------------
// 8. 全 100 パターン AIプロンプト / HTML+CSS / Tailwind パラメータ整合検査
// ---------------------------------------------------------------------------
try {
  const tsCache = new Map();
  const baseReq = createRequire(import.meta.url);
  const loadTsGraph = (entryPath) => {
    let full = path.resolve(entryPath);
    if (!full.endsWith('.ts') && fs.existsSync(full + '.ts')) full += '.ts';
    if (tsCache.has(full)) return tsCache.get(full);
    const src = fs.readFileSync(full, 'utf-8');
    const out = ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText;
    const mod = { exports: {} };
    tsCache.set(full, mod.exports);
    const localReq = (id) =>
      id.startsWith('.') ? loadTsGraph(path.resolve(path.dirname(full), id)) : baseReq(id);
    const fn = new vm.Script(`(function(exports, require, module){${out}\n})`).runInThisContext();
    fn(mod.exports, localReq, mod);
    tsCache.set(full, mod.exports);
    return mod.exports;
  };

  const { ALL_PATTERNS } = loadTsGraph(path.join(dataDir, 'index.ts'));
  const { TAILWIND_REGISTRY, renderTailwindCode } = loadTsGraph(
    path.join(dataDir, 'tailwindRegistry.ts')
  );

  const defParams = { duration: 0.45, distance: 20, easing: 'smooth' };
  const modParams = { duration: 1.99, distance: 77, easing: 'spring' };

  const parityFailures = [];
  for (const pat of ALL_PATTERNS) {
    if (!Array.isArray(pat.steps) || pat.steps.length !== 3) {
      parityFailures.push(`${pat.id}: steps !== 3`);
    }
    const promptDef = pat.buildPrompt(defParams, 'TARGET_CHECK');
    const promptMod = pat.buildPrompt(modParams, 'TARGET_CHECK');
    if (!promptDef.includes('TARGET_CHECK') || promptDef.length < 280) {
      parityFailures.push(`${pat.id}: buildPrompt の必須情報不足`);
    }
    if (pat.hasPlayback !== false && promptDef === promptMod) {
      parityFailures.push(`${pat.id}: buildPrompt がパラメータ変更に未反応`);
    }

    const htmlDef = pat.buildCode(defParams);
    const htmlMod = pat.buildCode(modParams);
    const twDef = renderTailwindCode(pat, defParams);
    const twMod = renderTailwindCode(pat, modParams);

    if (!TAILWIND_REGISTRY[pat.id]) {
      parityFailures.push(`${pat.id}: Tailwind レジストリフォールバック発生`);
    }
    if (twDef.includes('starting:')) {
      parityFailures.push(`${pat.id}: Tailwind に非互換な starting: 残存`);
    }
    if (pat.hasPlayback !== false && htmlDef === htmlMod) {
      parityFailures.push(`${pat.id}: HTML+CSS コードがパラメータ変更に未反応`);
    }
    if (pat.hasPlayback !== false && twDef === twMod) {
      parityFailures.push(`${pat.id}: Tailwind コードがパラメータ変更に未反応`);
    }
    if (htmlDef.includes('<script') && !twDef.includes('<script')) {
      parityFailures.push(`${pat.id}: インタラクティブ <script> が Tailwind 側で欠落`);
    }
  }

  if (parityFailures.length > 0) {
    fail(`パターン内部品質/パラメータ整合性に問題あり:\n  - ${parityFailures.join('\n  - ')}`);
  } else {
    console.log(
      `[PASS] 全${ALL_PATTERNS.length}種の AI指示・HTML+CSS・Tailwind CSS 一貫性＆パラメータ連動 100% 合格`
    );
  }
} catch (err) {
  fail(`パターン一貫性検査の実行エラー: ${String(err)}`);
}

if (!ok) {
  process.exit(1);
}
console.log('\nすべてのビルド・配置・セキュリティ検証に合格しました！');
