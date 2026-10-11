const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
// SCIENCE_SOURCE_DIRを指定すると、同じ回帰検査を旧ソースにも適用できる。
const root = process.env.SCIENCE_SOURCE_DIR || require('path').resolve(__dirname, '..');
const read = f => fs.readFileSync(require('path').resolve(root, f), 'utf8');
class El {
    constructor() {
        this.value = '';
        this.textContent = '';
        this.style = {};
        this.listeners = {};
        this.children = [];
        this.classList = {
            add() {
            }, remove() {
            }
        };
    }
    addEventListener(t, f) {
        (this.listeners[t] ??= []).push(f);
    }
    fire(t, e = {}) {
        for (const f of this.listeners[t] || [])
            f(e);
    }
    setAttribute() {
    }
    appendChild(e) {
        this.children.push(e);
    }
    set innerHTML(v) {
        this.children = [];
    }
    get innerHTML() {
        return '';
    }
    querySelector(s) {
        return (this.parts ??= {})[s] ??= new El();
    }
}
class Template extends El {
    constructor() {
        super();
        this.content = {
            cloneNode: () => new El()
        };
    }
}
function harness() {
    const nodes = new Map(), storage = new Map(), timers = [];
    for (const id of ['student-name', 'plan-title', 'plan-motivation', 'plan-hypothesis', 'plan-materials', 'plan-method', 'plan-result', 'plan-discussion', 'plan-next-question', 'current-date', 'results-container', 'result-time-label', 'step-quiz', 'step-results', 'step-plan']) {
        nodes.set(id, new El());
        nodes.set('print-' + id, new El());
    }
    nodes.set('result-card-template', new Template());
    const docEvents = new El();
    const windowEvents = new El();
    const doc = {
        readyState: 'loading', addEventListener: (t, f) => docEvents.addEventListener(t, f), dispatchEvent: e => docEvents.fire(e.type, e), getElementById: id => nodes.get(id) || null, querySelectorAll: () => [], querySelector: () => null
    };
    const ctx = vm.createContext({
        document: doc, console: {
            warn() {
            }, error() {
            }
        }, URLSearchParams, URL, btoa, atob, Event, HTMLTemplateElement: Template, HTMLElement: El, localStorage: {
            getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v)
        }, window: {
            addEventListener: (t, f) => windowEvents.addEventListener(t, f),
            dispatchEvent: e => windowEvents.fire(e.type, e),
            scrollTo() {
            }, setTimeout: f => timers.push(f)
        }, setTimeout: f => timers.push(f), clearTimeout() {
        }
    });
    vm.runInContext(read('topics.js') + '\nthis.allTopics=topics;', ctx);
    vm.runInContext(read('script-core.js') + '\nthis.appState=state; this.appElements=elements;', ctx);
    ctx.appElements.resultsContainer = nodes.get('results-container');
    ctx.appElements.resultTimeLabel = nodes.get('result-time-label');
    let support = read('summer-support.js').replace('    if (document.readyState === \'loading\') {', `    globalThis.support={loadReflectionIntoPanel,saveReflectionFromPanel,setupTopicChangeSync,topicMatchesPreference,getCurrentTopicId};\n    if (document.readyState === 'loading') {`);
    vm.runInContext(support, ctx);
    return {
        ctx, nodes, storage, timers, flush() {
            while (timers.length)
                timers.shift()();
        }
    };
}
const check = require('node:test');
check('12 condition combinations rank same-category first and return three same-time topics', () => {
    const { ctx, nodes } = harness();
    for (const time of ['1day', '3days', '1week'])
        for (const type of ['experiment', 'craft', 'observe', 'investigate']) {
            ctx.appState.userAnswers = {
                time, type
            };
            ctx.showResults();
            const cards = nodes.get('results-container').children;
            assert.equal(cards.length, 3);
            const ranked = ctx.allTopics.filter(t => t.time === time).map((t, i) => ({
                ...t, score: t.category === type ? 10 : 0, i
            })).sort((a, b) => b.score - a.score || a.i - b.i).slice(0, 3);
            assert.deepEqual(cards.map(c => c.querySelector('.result-card').querySelector('.card-title').textContent), Array.from(ranked, t => t.title));
        }
});
check('48 condition/preference combinations return eligible topics without adding unsafe procedures', () => {
    const { ctx } = harness();
    for (const time of ['1day', '3days', '1week'])
        for (const type of ['experiment', 'craft', 'observe', 'investigate'])
            for (const pref of ['none', 'noHeat', 'noOutdoor', 'noAdultRequired']) {
                const ts = ctx.allTopics.filter(t => t.time === time && ctx.support.topicMatchesPreference(t, pref));
                assert.ok(ts.length);
            }
});
check('direct back/forward preserves plan inputs', () => {
    const { ctx, nodes } = harness();
    ctx.selectTopic(ctx.allTopics[0].id);
    nodes.get('plan-hypothesis').value = '合成の予想';
    ctx.switchStep('step-results');
    ctx.switchStep('step-plan');
    assert.equal(nodes.get('plan-hypothesis').value, '合成の予想');
});
check('同一テーマの再選択で入力と保存済みの予想を保持する', () => {
    const { ctx, nodes, storage } = harness();
    const id = ctx.allTopics[0].id;
    ctx.selectTopic(id);
    nodes.get('plan-hypothesis').value = '合成の予想';
    ctx.savePlanState();
    ctx.switchStep('step-results');
    ctx.selectTopic(id);
    assert.equal(nodes.get('plan-hypothesis').value, '合成の予想');
    assert.equal(JSON.parse(storage.get('scienceMakerData_v1')).hypothesis, '合成の予想');
});
check('unicode and max-length share plan round-trip excludes reflection', () => {
    const { ctx, nodes } = harness();
    ctx.selectTopic(ctx.allTopics[0].id);
    for (const [id, n] of Object.entries({
        'student-name': 60, 'plan-title': 80, 'plan-motivation': 500, 'plan-hypothesis': 500, 'plan-materials': 300, 'plan-method': 1000
    }))
        nodes.get(id).value = '\u{1f9ea}'.repeat(n / 2);
    nodes.get('plan-result').value = 'PRIVATE_SYNTHETIC';
    const data = ctx.getPlanState();
    const encoded = ctx.serializePlanData(data);
    assert.ok(encoded.length < 24000);
    assert.equal(ctx.parsePlanShareData(encoded).method, data.method);
    assert.ok(!JSON.stringify(data).includes('PRIVATE_SYNTHETIC'));
    assert.equal(ctx.parsePlanShareData('x'.repeat(24001)), null);
});
check('キーボードで異なるテーマを選ぶと結果欄を切り替え旧結果を混入させない', () => {
    const h = harness(), { ctx, nodes, storage } = h;
    const [a, b] = ctx.allTopics;
    ctx.appState.userAnswers = {
        time: '1day', type: 'experiment'
    };
    ctx.showResults();
    ctx.support.setupTopicChangeSync();
    ctx.selectTopic(a.id);
    nodes.get('plan-result').value = 'Aの合成結果';
    ctx.support.saveReflectionFromPanel();
    const card = nodes.get('results-container').children[1].querySelector('.result-card');
    card.fire('keydown', {
        key: 'Enter', preventDefault() {
        }
    });
    h.flush();
    assert.notEqual(ctx.appState.selectedTopicId, a.id);
    assert.equal(nodes.get('plan-result').value, '');
    ctx.support.saveReflectionFromPanel();
    assert.equal(JSON.parse(storage.get('scienceMakerReflection_v2'))[ctx.appState.selectedTopicId].result, '');
    assert.equal(JSON.parse(storage.get('scienceMakerReflection_v2'))[a.id].result, 'Aの合成結果');
});
check('mouse selection synchronization restores reflection for correct theme', () => {
    const h = harness(), { ctx, nodes } = h;
    ctx.support.setupTopicChangeSync();
    ctx.selectTopic(ctx.allTopics[0].id);
    nodes.get('plan-result').value = 'Aの合成結果';
    ctx.support.saveReflectionFromPanel();
    ctx.selectTopic(ctx.allTopics[1].id);
    nodes.get('results-container').fire('click');
    h.flush();
    assert.equal(nodes.get('plan-result').value, '');
});
check('計画保存が失敗しても表示中テーマへ結果を保存する', () => {
    const { ctx, nodes, storage } = harness();
    const [a, b] = ctx.allTopics;
    ctx.selectTopic(a.id);
    const original = ctx.localStorage.setItem;
    ctx.localStorage.setItem = (k, v) => {
        if (k === 'scienceMakerData_v1')
            throw Error('SyntheticQuotaExceeded');
        original(k, v);
    };
    ctx.selectTopic(b.id);
    assert.equal(ctx.appState.selectedTopicId, b.id);
    assert.equal(ctx.support.getCurrentTopicId(), b.id);
    nodes.get('plan-result').value = 'Bの合成結果';
    ctx.support.saveReflectionFromPanel();
    assert.equal(JSON.parse(storage.get('scienceMakerReflection_v2'))[b.id].result, 'Bの合成結果');
});
check('保存拒否は入力を維持して失敗を知らせる', () => {
    const { ctx, nodes } = harness();
    const warnings = [];
    ctx.showToast = (message, type) => warnings.push({
        message, type
    });
    ctx.selectTopic(ctx.allTopics[0].id);
    nodes.get('plan-hypothesis').value = '保存前の合成入力';
    ctx.localStorage.setItem = () => {
        throw Error('SyntheticDenied');
    };
    assert.equal(ctx.savePlanState(), false);
    assert.equal(nodes.get('plan-hypothesis').value, '保存前の合成入力');
    nodes.get('plan-result').value = '保存前の合成結果';
    ctx.support.saveReflectionFromPanel();
    assert.equal(nodes.get('plan-result').value, '保存前の合成結果');
    assert.equal(warnings.filter(w => w.type === 'error').length, 2);
});
check('共有計画の読み込みも現在のテーマへ結果欄を同期し、結果は共有データへ含めない', () => {
    const { ctx, nodes } = harness();
    ctx.support.setupTopicChangeSync();
    ctx.selectTopic(ctx.allTopics[0].id);
    nodes.get('plan-result').value = 'Aの非共有結果';
    ctx.support.saveReflectionFromPanel();
    const data = {
        ...ctx.getPlanState(), topicId: ctx.allTopics[1].id, title: '共有された合成計画'
    };
    ctx.loadPlanState(data);
    assert.equal(nodes.get('plan-result').value, '');
    assert.equal(ctx.getPlanState().title, '共有された合成計画');
    assert.ok(!Object.hasOwn(ctx.getPlanState(), 'result'));
});
check('Spaceキーとポインターでテーマを往復して各結果を復元する', () => {
    const h = harness(), { ctx, nodes } = h;
    ctx.support.setupTopicChangeSync();
    ctx.appState.userAnswers = {
        time: '1day', type: 'experiment'
    };
    ctx.showResults();
    const cards = nodes.get('results-container').children.map(c => c.querySelector('.result-card'));
    cards[0].fire('click');
    nodes.get('plan-result').value = 'Aの結果';
    ctx.support.saveReflectionFromPanel();
    cards[1].fire('keydown', {
        key: ' ', preventDefault() {
        }
    });
    assert.equal(nodes.get('plan-result').value, '');
    nodes.get('plan-result').value = 'Bの結果';
    ctx.support.saveReflectionFromPanel();
    cards[0].fire('click');
    assert.equal(nodes.get('plan-result').value, 'Aの結果');
    cards[1].fire('click');
    assert.equal(nodes.get('plan-result').value, 'Bの結果');
});

check('別タブの同一テーマ更新は未保存の結果欄を巻き戻さない', () => {
    const { ctx, nodes } = harness();
    ctx.support.setupTopicChangeSync();
    ctx.setupStorageEventListener();
    ctx.selectTopic(ctx.allTopics[0].id);
    nodes.get('plan-result').value = '保存済みの結果';
    ctx.support.saveReflectionFromPanel();
    const original = ctx.localStorage.setItem;
    ctx.localStorage.setItem = (key, value) => {
        if (key === 'scienceMakerReflection_v2') throw Error('SyntheticQuota');
        original(key, value);
    };
    nodes.get('plan-result').value = '保存できなかった最新の結果';
    ctx.support.saveReflectionFromPanel();
    ctx.window.dispatchEvent({type: 'storage', key: 'scienceMakerData_v1', newValue: JSON.stringify(ctx.getPlanState())});
    assert.equal(nodes.get('plan-result').value, '保存できなかった最新の結果');
});
