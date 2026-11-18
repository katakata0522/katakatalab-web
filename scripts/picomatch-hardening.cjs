'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const REPOSITORY_ROOT = path.resolve(__dirname, '..');
const MARKER = 'katakatalab repeated-extglob backport v1';
const OPEN = /(\b(?:const|var|let)\s+extglobOpen\s*=\s*\(type,\s*value\d*\)\s*=>\s*\{[\s\S]{0,400}?\btoken\.prev\s*=\s*prev;)/g;
const CLOSE = /(\b(?:const|var|let)\s+extglobClose\s*=\s*(?:token|\(token\))\s*=>\s*\{)/g;
const STACK = /(\b(?:const|var|let)\s+extglobs\s*=\s*\[\];)/g;
const GROUP_OPEN = /(if\s*\(value === ['"]\(['"]\)\s*\{)/g;
const GROUP_CLOSE = /(push\(\{\s*type:\s*['"]paren['"],\s*value,\s*output:\s*state\.parens\s*\?)/g;
const PUSH = /(\b(?:const|var|let)\s+push\s*=\s*(?:tok|\(tok\))\s*=>\s*\{)/g;
const EXTGLOB_CLOSE_TOKEN = /(push\(\{\s*type:\s*['"]paren['"],\s*extglob:\s*true,\s*value,\s*output)/g;
const BRACE_OPEN = /(if\s*\(value === ['"]\{['"] && opts\.nobrace !== true\)\s*\{)/g;
const BRACE_CLOSE = /(push\(\{\s*type:\s*['"]brace['"],\s*value,\s*output\s*\}\);)/g;
const proofs = new WeakMap();
const REQUIRED_COPIES = Object.freeze({ '.': 5, pikalab: 16 });
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

// この関数はCJS/ESM・内包版の同じparser境界に埋め込む。外部の状態を参照しない。
function protectRepeatedExtglob(input, state, tokens, token, push, decrement, opts, postfix) {
    if (!postfix && token.type !== 'plus' && token.type !== 'star') return false;
    const inner = tokens.slice(token.__katakataTokensIndex + token.__katakataOffset, token.__katakataEndTokensIndex);
    // 実際のparser tokenを使う。escape・文字class・nobracketを別の正規表現で再解釈しない。
    const body = input.slice(token.__katakataStartIndex + token.__katakataOffset, token.__katakataEndIndex);
    // nobraceは量指定子をtextとして通すため、token型だけに頼らない。
    let risky = /[{}]/.test(body) || (token.type === 'brace' && body.includes('..'))
        || inner.some(item => ['star', 'globstar', 'brace', 'paren', 'plus', 'negate'].includes(item.type));
    if (!risky && (body.includes('|') || (token.type === 'brace' && body.includes(',')))) {
        // 有限のliteral選択肢は一意復号可能なものだけ反復する。
        // js|jsx等の通常パターンを保ち、a|aa・ab|abab・括弧の別表現を取り逃がさない。
        const words = token.type === 'brace' ? body.split(/[,|]/) : body.split('|');
        risky = body.length > 512 || words.length > 16 || words.some(word => !/^[a-zA-Z0-9_ .,/:-]+$/.test(word));
        if (!risky) {
            const folded = opts.nocase || (typeof opts.flags === 'string' && opts.flags.includes('i'));
            const values = folded ? words.map(word => word.toLowerCase()) : words;
            risky = new Set(values).size !== values.length;
            const pending = [];
            const seen = new Set();
            const add = suffix => {
                if (!suffix) { risky = true; return; }
                if (!seen.has(suffix)) { seen.add(suffix); pending.push(suffix); }
            };
            for (const left of values) for (const right of values) {
                if (left !== right && right.startsWith(left)) add(right.slice(left.length));
            }
            while (!risky && pending.length) {
                const suffix = pending.pop();
                for (const word of values) {
                    if (suffix.startsWith(word)) add(suffix.slice(word.length));
                    if (word.startsWith(suffix)) add(word.slice(suffix.length));
                }
            }
        }
    }
    if (!risky) return false;

    if (postfix) {
        // 実際に出力する後置量指定子をリテラルへ戻す。引用符・NUL等の無出力文字で迂回できない。
        postfix.type = 'text';
        postfix.value = postfix.output = '\\' + postfix.value;
        return true;
    }

    // 既存parserと同じliteral fallback。captureや再帰制限のopt-outでも危険な式を生成しない。
    const literal = input.slice(token.__katakataStartIndex, state.index + 1);
    const open = tokens[token.__katakataTokensIndex];
    open.type = 'text';
    open.value = literal;
    open.output = literal.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
    for (let i = token.__katakataTokensIndex + 1; i < tokens.length; i++) {
        tokens[i].value = '';
        tokens[i].output = '';
        delete tokens[i].suffix;
    }
    state.output = token.__katakataOutput + open.output;
    state.backtrack = true;
    push({ type: 'paren', extglob: true, value: ')', output: '' });
    decrement('parens');
    return true;
}

function patchText(source, copies) {
    if (source.includes(MARKER)) throw new Error('既存の補修を元コードとして再適用できません');
    let opened = 0, closed = 0, stacks = 0, groupOpened = 0, groupClosed = 0, pushes = 0, closeTokens = 0, braces = 0, braceClosed = 0;
    let result = source.replace(STACK, match => {
        stacks++;
        return match + `\n/* ${MARKER} */\nconst __katakataParens = [];\nconst __katakataBraces = [];\nconst __katakataProtect = ${protectRepeatedExtglob.toString().replace(/\r\n/g, '\n')};`;
    });
    result = result.replace(OPEN, match => {
        opened++;
        return match + '\ntoken.__katakataStartIndex = state.index;\ntoken.__katakataTokensIndex = tokens.length;\ntoken.__katakataOutput = state.output;\ntoken.__katakataOffset = 2;';
    });
    result = result.replace(CLOSE, match => {
        closed++;
        return match + '\ntoken.__katakataEndIndex = state.index;\ntoken.__katakataEndTokensIndex = tokens.length;\nif (__katakataProtect(input, state, tokens, token, push, decrement, opts)) return;';
    });
    result = result.replace(GROUP_OPEN, match => {
        groupOpened++;
        return match + '\n__katakataParens.push({ type: "paren", __katakataStartIndex: state.index, __katakataTokensIndex: tokens.length, __katakataOutput: state.output, __katakataOffset: 1 });';
    });
    result = result.replace(GROUP_CLOSE, match => {
        groupClosed++;
        return 'const __katakataGroup = __katakataParens.pop();\nif (__katakataGroup) { __katakataGroup.__katakataEndIndex = state.index; __katakataGroup.__katakataEndTokensIndex = tokens.length; }\n'
            + match.replace('push({', 'push({ __katakataClosed: __katakataGroup,');
    });
    result = result.replace(EXTGLOB_CLOSE_TOKEN, match => {
        closeTokens++;
        return match.replace('push({', 'push({ __katakataClosed: token,');
    });
    result = result.replace(PUSH, match => {
        pushes++;
        return match + '\nif (prev && prev.__katakataClosed && ((tok.type === "plus" && tok.value === "+" && (tok.output === undefined || tok.output === "+")) || (tok.type === "star" && tok.output === "*"))) __katakataProtect(input, state, tokens, prev.__katakataClosed, push, decrement, opts, tok);';
    });
    result = result.replace(BRACE_OPEN, match => {
        braces++;
        return 'if (opts.nobrace === true && (value === "{" || value === "}")) { push({ type: "text", value: "\\\\" + value }); continue; }\n' + match
            + '\n__katakataBraces.push({ type: "brace", __katakataStartIndex: state.index, __katakataTokensIndex: tokens.length, __katakataOutput: state.output, __katakataOffset: 1 });';
    });
    result = result.replace(BRACE_CLOSE, match => {
        braceClosed++;
        return 'const __katakataBrace = __katakataBraces.pop();\nif (__katakataBrace) { __katakataBrace.__katakataEndIndex = state.index; __katakataBrace.__katakataEndTokensIndex = tokens.length; }\n'
            + match.replace('push({', 'push({ __katakataClosed: __katakataBrace,');
    });
    if (!copies || [opened, closed, stacks, groupOpened, groupClosed, pushes, braces, braceClosed].some(count => count !== copies)
        || closeTokens !== copies * 2) throw new Error('parserの補修箇所数が承認済み構造と異なります');
    return result;
}

function installedParsers(root, directories) {
    const result = [];
    function walk(directory) {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            if (entry.isSymbolicLink()) continue;
            const file = path.join(directory, entry.name);
            if (entry.isDirectory()) walk(file);
            else if (/\.(?:c|m)?js$/.test(entry.name)) {
                const source = fs.readFileSync(file, 'utf8');
                if (OPEN.test(source)) result.push(path.relative(root, file).split(path.sep).join('/'));
                OPEN.lastIndex = 0;
            }
        }
    }
    for (const directory of directories) walk(path.join(root, directory));
    return result.sort();
}

function harden({ root = REPOSITORY_ROOT, apply = false, requireAll = false } = {}) {
    root = fs.realpathSync(root);
    const manifestFile = path.join(root, 'config/picomatch-hardening.json');
    const manifestBytes = fs.readFileSync(manifestFile);
    const manifest = JSON.parse(manifestBytes);
    if (manifest.schemaVersion !== 1 || manifest.advisory !== 'GHSA-fc5q-39xc-vjpf') throw new Error('補修契約が不正です');
    const canonicalLocks = {};
    const installed = [];
    for (const scope of ['.', 'pikalab']) {
        const lockFile = path.join(root, scope, 'package-lock.json');
        const bytes = fs.readFileSync(lockFile);
        canonicalLocks[scope] = JSON.stringify(JSON.parse(bytes));
        if (digest(canonicalLocks[scope]) !== manifest.locks[scope]) throw new Error(`${scope}: lock更新後は補修対象を再確認してください`);
        const directory = path.posix.join(scope === '.' ? '' : scope, 'node_modules');
        if (fs.existsSync(path.join(root, directory))) installed.push(directory);
        else if (requireAll) throw new Error(`${scope}: npm ci --ignore-scripts後に補修検査を実行してください`);
    }
    if (!installed.length) throw new Error('検証対象の依存がインストールされていません');
    const selected = Object.entries(manifest.files).filter(([name]) => installed.some(directory => name.startsWith(directory + '/')));
    for (const scope of installed.map(directory => directory === 'node_modules' ? '.' : 'pikalab')) {
        const prefix = scope === '.' ? 'node_modules/' : 'pikalab/node_modules/';
        if (selected.filter(([name]) => name.startsWith(prefix)).reduce((n, [, contract]) => n + contract.copies, 0) !== REQUIRED_COPIES[scope]) {
            throw new Error(`${scope}: 必須のparser全コピーの保存契約がありません`);
        }
    }
    const observed = installedParsers(root, installed);
    if (JSON.stringify(observed) !== JSON.stringify(selected.map(([name]) => name).sort())) {
        throw new Error('未知・欠損の内包picomatch実装があります。監査を停止します');
    }
    let copies = 0;
    for (const [relative, contract] of selected) {
        if (relative.includes('\\') || relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('不正な補修パス');
        const target = fs.realpathSync(path.join(root, relative));
        if (!target.startsWith(root + path.sep)) throw new Error('補修パスが検証対象の外を参照しています');
        const original = fs.readFileSync(target);
        const hash = digest(original);
        if (hash === contract.before) {
            if (!apply) throw new Error(`${relative}: 補修が未適用です`);
            const patched = patchText(original.toString('utf8'), contract.copies);
            if (digest(patched) !== contract.after) throw new Error(`${relative}: 補修コードが承認済みハッシュと異なります`);
            fs.writeFileSync(target, patched);
        } else if (hash !== contract.after) {
            throw new Error(`${relative}: 未確認の依存コードです。上書きせず停止します`);
        }
        if (digest(fs.readFileSync(target)) !== contract.after) throw new Error('補修後の再照合に失敗しました');
        copies += contract.copies;
    }
    const proof = Object.freeze({ scopes: Object.freeze(installed.map(directory => directory === 'node_modules' ? '.' : 'pikalab')),
        canonicalLocks: Object.freeze(canonicalLocks), copies });
    proofs.set(proof, { root, installed, selected, manifestFile, manifestHash: digest(manifestBytes) });
    return proof;
}

function verifiedFor(proof, scope, lock) {
    const record = proofs.get(proof);
    if (!record || !proof.scopes.includes(scope) || proof.canonicalLocks[scope] !== JSON.stringify(lock)) return false;
    try {
        if (digest(fs.readFileSync(record.manifestFile)) !== record.manifestHash) return false;
        if (JSON.stringify(installedParsers(record.root, record.installed)) !== JSON.stringify(record.selected.map(([name]) => name).sort())) return false;
        for (const [name, contract] of record.selected) {
            if (digest(fs.readFileSync(path.join(record.root, name))) !== contract.after) return false;
        }
        return proof.canonicalLocks[scope] === JSON.stringify(JSON.parse(fs.readFileSync(path.join(record.root, scope, 'package-lock.json'))));
    } catch { return false; }
}

if (require.main === module) {
    try {
        const proof = harden({ apply: process.argv.includes('--apply'), requireAll: process.argv.includes('--all') });
        console.log(`picomatch限定補修: ${proof.copies} parserをハッシュ照合済み (${proof.scopes.join(', ')})。上流CVEは未撤回です。`);
    } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { harden, verifiedFor, patchText, protectRepeatedExtglob, digest, installedParsers };
