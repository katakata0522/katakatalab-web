const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const dataSource = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
const rolesSource = fs.readFileSync(path.join(root, 'roles.js'), 'utf8');
const exposureSource = fs.readFileSync(path.join(root, 'exposure.js'), 'utf8');
const audioSource = fs.readFileSync(path.join(root, 'audio.js'), 'utf8');

let failed = false;
function assert(condition, message) {
    if (!condition) {
        console.error(`[ERROR] ${message}`);
        failed = true;
    }
}

function compile(source, label) {
    try {
        new Function(source);
    } catch (error) {
        assert(false, `${label} syntax error: ${error.message}`);
    }
}

compile(rolesSource, 'roles.js');
compile(exposureSource, 'exposure.js');

const warnings = [];
const context = {
    window: {},
    console: {
        log: console.log,
        error: console.error,
        warn: message => warnings.push(String(message))
    }
};
vm.createContext(context);
vm.runInContext(dataSource, context, { filename: 'data.js' });
vm.runInContext(rolesSource, context, { filename: 'roles.js' });

const Data = context.window.KanjiLabData;
const Roles = context.window.KanjiLabRoles;
assert(!!Data, 'data.js must expose window.KanjiLabData');
assert(!!Roles, 'roles.js must expose window.KanjiLabRoles');

if (Data && Roles) {
    assert(Data.KANJI_ALL.length === 337, `full catalog must remain 337, got ${Data.KANJI_ALL.length}`);
    const tierCounts = Roles.getTierCounts(Data.KANJI_ALL);
    assert(tierCounts.standard === 267, `standard tier baseline must be 267, got ${tierCounts.standard}`);
    assert(tierCounts.discovery === 45, `discovery tier baseline must be 45, got ${tierCounts.discovery}`);
    assert(tierCounts.deep === 25, `deep tier baseline must be 25, got ${tierCounts.deep}`);
    assert(Roles.DEEP_KANJI.size === 25, `deep tier set must contain 25 entries, got ${Roles.DEEP_KANJI.size}`);
    assert(Roles.getDefaultQuizPool(Data.KANJI_ALL).length === 312,
        `default quiz pool must be 312, got ${Roles.getDefaultQuizPool(Data.KANJI_ALL).length}`);

    ['笨', '苯', '佚', '銖', '潘', '泪'].forEach(kanji => {
        assert(Roles.getTier(kanji) === 'deep', `${kanji} must remain in deep tier`);
    });
    ['霖', '諳', '梏', '笞', '怜', '伶'].forEach(kanji => {
        assert(Roles.getTier(kanji) === 'discovery', `${kanji} must remain a discovery-tier example`);
    });
    ['格', '誤', '鉄', '株', '泳', '森'].forEach(kanji => {
        assert(Roles.getTier(kanji) === 'standard', `${kanji} must remain standard tier`);
    });

    // UI密度を下げる対象は「deepの字にしか使われないパーツ」だけ。
    // 本→笨/苯 は畳めるが、失→鉄/佚 のように通常字と共有するパーツは残す。
    assert(Roles.isDeepOnlyPart(Data.KANJI_UD, 'right', '本') === true,
        'UD right-part 本 must be deep-only because it currently leads only to 笨/苯');
    assert(Roles.getDeepOnlyParts(Data.KANJI_UD, 'right').includes('本'),
        'deep-only UD part list must include 本');
    assert(Roles.isDeepOnlyPart(Data.KANJI_LR, 'right', '失') === false,
        'LR right-part 失 must stay visible because 鉄 is standard even though 佚 is deep');
    assert(Roles.isDeepOnlyPart(Data.KANJI_LR, 'right', '各') === false,
        'common comparison part 各 must never be treated as deep-only');

    const overlap = [...Roles.DEEP_KANJI].filter(kanji => Roles.DISCOVERY_KANJI.has(kanji));
    assert(overlap.length === 0, `deep/discovery tiers must not overlap: ${overlap.join(', ')}`);
    assert(warnings.length === 0, `role table references missing catalog entries: ${warnings.join(' | ')}`);
}

// Runtime boundary test: normal courses/daily and their choice rendering use the
// default pool. The all course and its choice rendering use the complete catalog.
// Every temporary swap must restore the 337-entry catalog afterward.
if (Data && Roles) {
    const runtimeContext = {
        window: {
            KanjiLabData: Data,
            KanjiLabRoles: Roles
        },
        document: {
            readyState: 'complete',
            getElementById: () => null
        },
        console,
        setTimeout
    };

    const observations = [];
    function observe(type, extra = {}) {
        observations.push({
            type,
            ...extra,
            count: Data.KANJI_ALL.length,
            deepPresent: Data.KANJI_ALL.some(entry => Roles.getTier(entry.k) === 'deep')
        });
    }

    runtimeContext.window.App = {
        quiz: {
            startCourse(courseId) {
                observe('course', { courseId });
                runtimeContext.window.App.ui.renderQuizContent();
                return courseId;
            }
        },
        daily: {
            getDailyQuizzes() {
                observe('daily-pool');
                return Data.KANJI_ALL.slice(0, 5);
            },
            startDailyChallenge() {
                observe('daily-start');
                runtimeContext.window.App.daily.getDailyQuizzes();
                runtimeContext.window.App.ui.renderQuizContent();
            }
        },
        ui: {
            renderQuizContent() {
                observe('choices');
            },
            renderCourses() {}
        }
    };

    vm.createContext(runtimeContext);
    vm.runInContext(exposureSource, runtimeContext, { filename: 'exposure.js' });

    runtimeContext.window.App.quiz.startCourse('basic');
    assert(runtimeContext.window.KanjiLabExposure.getQuizExposure() === 'default',
        'basic course must set default exposure state');

    runtimeContext.window.App.quiz.startCourse('all');
    assert(runtimeContext.window.KanjiLabExposure.getQuizExposure() === 'full',
        'all course must set full exposure state');

    runtimeContext.window.App.daily.startDailyChallenge();
    assert(runtimeContext.window.KanjiLabExposure.getQuizExposure() === 'default',
        'daily challenge must return to default exposure state');

    const basic = observations.find(item => item.type === 'course' && item.courseId === 'basic');
    const all = observations.find(item => item.type === 'course' && item.courseId === 'all');
    const dailyPool = observations.find(item => item.type === 'daily-pool');
    const dailyStart = observations.find(item => item.type === 'daily-start');
    const choiceObservations = observations.filter(item => item.type === 'choices');

    assert(basic?.count === 312 && basic.deepPresent === false,
        `basic course must use 312 non-deep entries; got ${JSON.stringify(basic)}`);
    assert(all?.count === 337 && all.deepPresent === true,
        `all course must keep all 337 entries; got ${JSON.stringify(all)}`);
    assert(dailyStart?.count === 312 && dailyStart.deepPresent === false,
        `daily start must run under default exposure; got ${JSON.stringify(dailyStart)}`);
    assert(dailyPool?.count === 312 && dailyPool.deepPresent === false,
        `daily pool must use 312 non-deep entries; got ${JSON.stringify(dailyPool)}`);

    assert(choiceObservations.length === 3,
        `expected choice rendering for basic/all/daily, got ${choiceObservations.length}`);
    assert(choiceObservations[0]?.count === 312 && choiceObservations[0]?.deepPresent === false,
        `basic choices must exclude deep entries; got ${JSON.stringify(choiceObservations[0])}`);
    assert(choiceObservations[1]?.count === 337 && choiceObservations[1]?.deepPresent === true,
        `all-course choices must include full catalog; got ${JSON.stringify(choiceObservations[1])}`);
    assert(choiceObservations[2]?.count === 312 && choiceObservations[2]?.deepPresent === false,
        `daily choices must exclude deep entries; got ${JSON.stringify(choiceObservations[2])}`);

    assert(Data.KANJI_ALL.length === 337,
        `temporary filtering must restore full catalog after calls; got ${Data.KANJI_ALL.length}`);
}

const loaderVersions = Object.fromEntries(
    ['roles', 'ux', 'exposure'].map((name) => {
        const match = audioSource.match(new RegExp(`\\./js/${name}\\.js\\?v=([^'"]+)`));
        assert(match?.[1], `audio loader must cache-bust ${name}.js`);
        return [name, match[1]];
    })
);
assert(new Set(Object.values(loaderVersions)).size === 1,
    'Kanji Lab helper scripts must share one cache-bust token');
assert(audioSource.indexOf('./js/roles.js?v=') < audioSource.indexOf('./js/ux.js?v='),
    'roles.js must be loaded before ux.js');
assert(audioSource.indexOf('./js/ux.js?v=') < audioSource.indexOf('./js/exposure.js?v='),
    'exposure.js must be loaded after ux.js so its help copy is final');

if (failed) {
    console.error('\n❌ KANJI EXPOSURE VALIDATION FAILED');
    process.exit(1);
}

console.log('\n✅ KANJI EXPOSURE CONTRACTS PASSED');
