const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('browser load: logic.js と script.js を同じグローバルで読んでも初期化が止まらない', () => {
    const file = (name) => fs.readFileSync(path.join(__dirname, name), 'utf8');
    const warnings = [];

    const context = {
        console: {
            log() { },
            error() { },
            warn(...args) {
                warnings.push(args.map(String).join(' '));
            }
        },
        setTimeout,
        clearTimeout,
        navigator: {},
        localStorage: {
            getItem() { return null; },
            setItem() { },
            removeItem() { }
        },
        document: {
            addEventListener() { },
            getElementById() { return null; },
            querySelectorAll() { return []; },
            createElement() {
                return {
                    textContent: '',
                    innerHTML: '',
                    classList: {
                        add() { },
                        remove() { },
                        contains() { return false; }
                    },
                    setAttribute() { },
                    appendChild() { },
                    remove() { },
                    style: {}
                };
            },
            body: {
                appendChild() { },
                removeChild() { }
            },
            activeElement: { id: '' }
        }
    };
    context.window = context;

    vm.createContext(context);

    vm.runInContext(file('logic.js'), context, { filename: 'logic.js' });

    assert.doesNotThrow(() => {
        vm.runInContext(file('script.js'), context, { filename: 'script.js' });
    });
    assert.ok(warnings.every((message) => message.includes('要素が見つかりません')));
});
