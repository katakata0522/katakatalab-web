'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const [file, expectedRaw, mode = 'security'] = process.argv.slice(2);
const expected = Number(expectedRaw);

async function run() {
    let parsers, instrumented;
    try {
        if (file.endsWith('/lib/parse.js') || file.endsWith('\\lib\\parse.js')) parsers = [require(file)];
        else {
            const source = fs.readFileSync(file, 'utf8');
            const factories = [...new Set([
                ...[...source.matchAll(/\bfunction\s+(requireParse[\w$]*)\s*\(/g)].map(match => match[1]),
                ...[...source.matchAll(/\bvar\s+(require_parse\d*)\s*=/g)].map(match => match[1]),
            ])];
            const expression = `[${factories.map(name => `(typeof ${name} === 'function' ? ${name} : null)`).join(',')}]`
                + `.filter(Boolean).map(factory => factory()).filter(parser => typeof parser === 'function' && parser.toString().includes('extglobOpen'))`;
            const esm = file.replace(/\\/g, '/').includes('/rollup/dist/es/');
            instrumented = path.join(path.dirname(file), `.__katakata_parser_test_${process.pid}.js`);
            fs.writeFileSync(instrumented, source + '\n' + (esm
                ? `export const __katakataParsers = ${expression};\n`
                : `module.exports.__katakataParsers = ${expression};\n`));
            const module = esm ? await import(pathToFileURL(instrumented).href) : require(instrumented);
            parsers = module.__katakataParsers;
        }
        if (parsers.length !== expected) throw new Error(`parser数不一致: ${parsers.length} != ${expected}`);
        const controls = [
            ['**/*.js', 'lab/example.js', true],
            ['**/*.js', 'lab/example.txt', false],
            ['**/*.{js,css,html,ico,svg,json,webmanifest}', 'assets/manifest.webmanifest', true],
            ['**/*.{test,spec}.?(c|m)[jt]s?(x)', 'lab/example.test.tsx', true],
            ['**/*.{test,spec}.?(c|m)[jt]s?(x)', 'lab/example.spec.mjs', true],
            ['**/!(*.spec).js', 'lab/example.js', true],
            ['**/!(*.spec).js', 'lab/example.spec.js', false],
            ['**/+(foo|bar).js', 'lab/foobar.js', true],
            ['**/*(foo|bar).js', 'lab/foobar.js', true],
            ['**/+(js|jsx).js', 'lab/jsjsx.js', true],
            ['**/+(a?b).js', 'lab/axbayb.js', true],
            ['**/+([ab]).js', 'lab/abba.js', true],
            ['**/+(\\*a).js', 'lab/*a*a.js', true],
            ['**/(foo|bar)+.js', 'lab/foobar.js', true],
            ['**/+(foo|bar)?(baz).js', 'lab/foobarbaz.js', true],
            ['**/{foo,bar}+.js', 'lab/foobar.js', true],
        ];
        const dangerous = ['**/+(*a)', '**/*(*a)', '**/+(a*)', '**/+([a]*a)', '**/+({a,aa})',
            '**/+(a|*a)', '**/+(ab|abab)', '**/+((a|aa))', '**/+(a?(a))', '**/+(**a)',
            '**/+(a{1,2})', '**/(*a)+', '**/(a|aa)+', '**/@(*a)+', '**/?(*a)+',
            '**/(*a){1,}', '**/(a|aa){2,}', '**/!(*a)+', '**/+(*a)+',
            '**/(*a)""+', '**/@(*a)""+', '**/(*a)\u0000+', '**/(*a)\u0000{1,}',
            '**/(*a){1,"2"}', '**/(*a){1,\u00002}', '**/{a,aa}+', '**/{*a,b}+'];
        const options = [{}, { dot: true }, { capture: true }, { maxExtglobRecursion: false },
            { nobracket: true }, { nobrace: true }, { nocase: true }, { windows: true },
            { flags: 'i' }, { bash: true }, { noext: true }, { noextglob: true }, { contains: true }, { regex: true }];
        const observations = [];
        let checks = 0;
        for (const parse of parsers) {
            for (const opts of [{}, { dot: true }, { maxExtglobRecursion: false }, { windows: true }]) {
                for (const [pattern, value, expectedValue] of controls) {
                    const expression = parse(pattern, opts).output;
                    const actual = new RegExp(`^(?:${expression})$`).test(value);
                    if (actual !== expectedValue) throw new Error(`通常の一致結果が変化: ${pattern} ${JSON.stringify(opts)} ${value}: ${actual}`);
                    observations.push(actual);
                    checks++;
                }
            }
            // captureと否定extglobの組み合わせには上流の別の構文不具合がある。
            // 通常captureの互換性と、全攻撃変種でのcapture安全性を個別に検査する。
            if (!new RegExp(`^(?:${parse('**/*.js', { capture: true }).output})$`).test('lab/example.js')) {
                throw new Error('通常のcapture一致が変化しました');
            }
            checks++;
            const literalBrace = new RegExp(`^(?:${parse('**/a{1,2}.js', { nobrace: true }).output})$`);
            if (!literalBrace.test('lab/a{1,2}.js') || literalBrace.test('lab/aa.js')) throw new Error('nobraceのリテラル指定が変化しました');
            checks += 2;
            if (mode === 'controls') continue;
            for (const opts of options) for (const pattern of dangerous) {
                let regex;
                try {
                    const expression = parse(pattern, opts).output;
                    regex = new RegExp(`^(?:${expression})$`, opts.flags || (opts.nocase ? 'i' : ''));
                } catch (error) {
                    // 不正な攻撃構文の拒否は許可する。picomatch.makeReもSyntaxErrorを非一致へ変える。
                    // 上の通常パターン検査は例外・非一致のいずれも許可しない。
                    if (!(error instanceof SyntaxError)) throw error;
                    checks += 2;
                    continue;
                }
                for (const value of ['lab/' + 'a'.repeat(512) + 'b', 'lab/' + 'ab'.repeat(256) + 'c']) {
                    if (regex.test(value)) throw new Error(`危険な反復を通常のglobとして許可: ${pattern} ${JSON.stringify(opts)}`);
                    checks++;
                }
            }
            for (const opts of [{ regex: true }, { regex: true, nobrace: true }, { regex: true, capture: true }]) {
                const expression = parse('**/(a*)*', opts).output;
                if (new RegExp(`^(?:${expression})$`).test('lab/' + 'a'.repeat(512) + 'b')) throw new Error('regexモードの後置star反復を許可しました');
                checks++;
            }
        }
        if (file.replace(/\\/g, '/').endsWith('/rollup/dist/shared/rollup.js')) {
            const { createFilter } = require(file);
            if (!createFilter('**/*.js', null, { resolve: false })('/tmp/example.js')) throw new Error('Rollup公開filterの通常動作が変化しました');
            if (mode !== 'controls' && createFilter('**/+(*a)', null, { resolve: false })('/tmp/' + 'a'.repeat(512) + 'b')) {
                throw new Error('Rollup公開filterが危険な反復を許可しました');
            }
            checks++;
        }
        console.log(JSON.stringify({ parsers: parsers.length, checks, ...(mode === 'controls' ? { observations } : {}) }));
    } finally {
        if (instrumented && fs.existsSync(instrumented)) fs.unlinkSync(instrumented);
    }
}
run().catch(error => { console.error(error.stack); process.exitCode = 1; });
