const fs = require('fs');
const path = require('path');
const vm = require('vm');

const filePath = path.join(__dirname, 'data.js');
const appPath = path.join(__dirname, 'app.js');
const content = fs.readFileSync(filePath, 'utf8');
const appContent = fs.readFileSync(appPath, 'utf8');

const context = { window: {} };
vm.runInNewContext(content, context, {
    filename: filePath,
    timeout: 1_000
});

const data = context.window.KanjiLabData;
if (!data || typeof data !== 'object') {
    throw new Error('KanjiLabData の読み込みに失敗しました。');
}
let hasError = false;

function reportError(message) {
    console.error(`[ERROR] ${message}`);
    hasError = true;
}

function findKanji(list, kanji) {
    return list.find(entry => entry.k === kanji) || null;
}

function checkMode(modeName, KANJI_LIST, PARTS_L, PARTS_R) {
    console.log(`\n=== Checking ${modeName} Mode ===`);

    const leftCounts = {};
    const rightCounts = {};
    const pairKeys = new Set();

    KANJI_LIST.forEach((entry, index) => {
        const requiredStringFields = ['l', 'r', 'k', 'y', 'm', 'on'];
        requiredStringFields.forEach(field => {
            if (typeof entry[field] !== 'string') {
                reportError(`${modeName}[${index}] '${field}' must be a string.`);
            }
        });
        if (entry.kun !== undefined && typeof entry.kun !== 'string') {
            reportError(`${modeName}[${index}] 'kun' must be a string when present.`);
        }

        if (!entry.l || !entry.r || !entry.k || !entry.y || !entry.m) {
            reportError(`${modeName}[${index}] has an empty required field: ${JSON.stringify(entry)}`);
        }
        if (!entry.on && !entry.kun) {
            reportError(`${modeName} '${entry.k}' must have at least one on/kun reading.`);
        }
        if (Array.from(entry.k).length !== 1) {
            reportError(`${modeName} '${entry.k}' must be exactly one Unicode character.`);
        }

        const pairKey = `${entry.l}\u0000${entry.r}`;
        if (pairKeys.has(pairKey)) {
            reportError(`${modeName} has multiple answers for the same pair '${entry.l} + ${entry.r}'.`);
        }
        pairKeys.add(pairKey);

        leftCounts[entry.l] = (leftCounts[entry.l] || 0) + 1;
        rightCounts[entry.r] = (rightCounts[entry.r] || 0) + 1;
    });

    PARTS_L.forEach(part => {
        const count = leftCounts[part] || 0;
        if (count < 2) {
            reportError(`Left/Top part '${part}' is used only ${count} times in ${modeName}.`);
        }
    });

    PARTS_R.forEach(part => {
        const count = rightCounts[part] || 0;
        if (count < 2) {
            reportError(`Right/Bottom part '${part}' is used only ${count} times in ${modeName}.`);
        }
    });

    KANJI_LIST.forEach(entry => {
        if (!PARTS_L.includes(entry.l)) {
            reportError(`Left/Top part '${entry.l}' is used in '${entry.k}' but missing from ${modeName} PARTS_L.`);
        }
        if (!PARTS_R.includes(entry.r)) {
            reportError(`Right/Bottom part '${entry.r}' is used in '${entry.k}' but missing from ${modeName} PARTS_R.`);
        }
    });

    console.log(`[INFO] ${modeName}: ${KANJI_LIST.length} kanji / ${PARTS_L.length} left-or-top parts / ${PARTS_R.length} right-or-bottom parts`);
}

function checkGlobalIntegrity() {
    console.log('\n=== Checking global catalog integrity ===');

    if (!Array.isArray(data.KANJI_LR) || !Array.isArray(data.KANJI_UD) || !Array.isArray(data.KANJI_ALL)) {
        reportError('KANJI_LR / KANJI_UD / KANJI_ALL must all be arrays.');
        return;
    }

    if (data.KANJI_ALL.length !== data.KANJI_LR.length + data.KANJI_UD.length) {
        reportError('KANJI_ALL length must equal LR + UD.');
    }

    const seenKanji = new Set();
    data.KANJI_ALL.forEach(entry => {
        if (seenKanji.has(entry.k)) {
            reportError(`Duplicate kanji '${entry.k}' exists across the catalog.`);
        }
        seenKanji.add(entry.k);
    });

    // 2026-08-31 の全組み合わせ監査で337字まで検証済み。将来の追加は歓迎するが、無言の縮退は防ぐ。
    if (data.KANJI_ALL.length < 337) {
        reportError(`Catalog unexpectedly shrank below the audited baseline: ${data.KANJI_ALL.length} < 337.`);
    }
}

function checkAuditedStructure() {
    console.log('\n=== Checking source-audited structures ===');

    const expected = [
        ['LR', '詞', '言', '司'],
        ['LR', '娯', '女', '呉'],
        ['LR', '誤', '言', '呉'],
        ['LR', '伶', '亻', '令'],
        ['LR', '怜', '忄', '令'],
        ['LR', '潘', '氵', '番'],
        ['LR', '恪', '忄', '各'],
        ['LR', '抉', '扌', '夬'],
        ['LR', '飯', '飠', '反'],
        ['LR', '飽', '飠', '包'],
        ['LR', '飼', '飠', '司'],
        ['LR', '餃', '飠', '交'],
        ['UD', '森', '木', '林'],
        ['UD', '霖', '雨', '林'],
        ['UD', '笨', '竹', '本'],
        ['UD', '苯', '艹', '本'],
        ['UD', '笞', '竹', '台'],
        ['UD', '雹', '雨', '包'],
        ['UD', '芫', '艹', '元']
    ];

    expected.forEach(([mode, kanji, left, right]) => {
        const list = mode === 'LR' ? data.KANJI_LR : data.KANJI_UD;
        const entry = findKanji(list, kanji);
        if (!entry || entry.l !== left || entry.r !== right) {
            reportError(`${kanji} must stay in ${mode} as '${left} + ${right}'.`);
        }
    });

    if (findKanji(data.KANJI_LR, '森')) {
        reportError("'森' must not be taught as a left/right composition.");
    }
    if (findKanji(data.KANJI_LR, '淋')) {
        reportError("'淋' should stay out of the LR pool after the 林-part rebalance.");
    }

    const longRain = findKanji(data.KANJI_UD, '霖');
    if (!longRain || longRain.on !== 'リン' || longRain.kun !== 'ながあめ') {
        reportError("'霖' source-checked reading contract is broken.");
    }
}

function checkFoodRadical() {
    console.log('\n=== Checking food-radical glyph consistency ===');

    const foodEntries = data.KANJI_LR.filter(entry => ['飯', '飽', '飼', '餃'].includes(entry.k));
    if (foodEntries.length !== 4 || foodEntries.some(entry => entry.l !== '飠')) {
        reportError("Food-radical entries must use the visible left-side glyph '飠'.");
    }
    if (data.KANJI_LR.some(entry => entry.l === '食')) {
        reportError("'食' must not be used as the left-side food radical; use '飠'.");
    }
    if (!data.PARTS_L_LR.includes('飠') || data.PARTS_L_LR.includes('食')) {
        reportError("PARTS_L_LR must expose '飠' and must not expose '食' as shokuhen.");
    }
    if (!appContent.includes('彳・飠）') || !appContent.includes("'彳', '飠'")) {
        reportError("The advanced course must use '飠' consistently in its label and part filter.");
    }
    if (appContent.includes('彳・食）') || appContent.includes("['魚', '食']")) {
        reportError("The obsolete '食' shokuhen display was reintroduced in app.js.");
    }
}

function checkAuditedMeanings() {
    console.log('\n=== Checking audited meanings ===');

    const expectedMeanings = new Map([
        ['城', '敵を防ぐためのしろ・とりで'],
        ['埋', '土などの中に物を入れて見えなくする'],
        ['鯨', 'クジラの仲間を表す、海などにすむ哺乳類'],
        ['鮫', 'サメの仲間の魚の総称'],
        ['鉄', '金属元素の一つ。鉄鋼の材料として広く使われる'],
        ['鮑', 'アワビ。巻貝の仲間で、平たい一枚の殻をもつ'],
        ['鰯', 'イワシ。海で群れをつくって泳ぐ小型の魚'],
        ['笛', '息を吹き込んで音を出す楽器'],
        ['泪', '「涙（なみだ）」の異体字。目から出る涙'],
        ['続', '途切れずにつながる、あとに続く'],
        ['律', '法律や規律の「律」。音楽では音律・旋律などに使う'],
        ['苗', '種から生えたばかりの若い植物。稲の苗など'],
        ['霜', '寒い朝などに地面や物の表面につく氷の結晶'],
        ['杲', '日の光が明るい、または高いことを表す字（マニアック自慢枠）']
    ]);

    expectedMeanings.forEach((meaning, kanji) => {
        const entry = findKanji(data.KANJI_ALL, kanji);
        if (!entry || entry.m !== meaning) {
            reportError(`Audited meaning for '${kanji}' is missing or changed.`);
        }
    });

    const misleadingPhrases = [
        'お殿様の家',
        '土の中に里を埋めて隠す',
        '世界最大の哺乳類',
        '最も実用的な頑丈な金属',
        '高級な貝',
        '陸に上げるとすぐに弱って死んでしまう魚',
        '竹で作られた楽器、ホイッスル',
        '悲しいときや痛いときに目から出る水',
        '終わりがなくずっと続く',
        '田植えのために育てる稲の若い芽',
        '冬の寒い朝に地面が白くなる氷の結晶',
        '日が東の空に高く昇って明るい'
    ];

    misleadingPhrases.forEach(phrase => {
        if (content.includes(phrase)) {
            reportError(`Misleading audited phrase was reintroduced: ${phrase}`);
        }
    });
}

function checkDiscoveryPolicy() {
    console.log('\n=== Checking discovery / non-Joyo policy ===');

    const rareDiscoveryKanji = ['伶', '佻', '怜', '悄', '很', '拆', '潘', '梏', '椴', '緞', '滄', '愴', '搶', '拈', '沾', '沮', '芫', '荀', '笨', '苯', '笞', '霖'];
    rareDiscoveryKanji.forEach(kanji => {
        if (!findKanji(data.KANJI_ALL, kanji)) {
            reportError(`Discovery kanji '${kanji}' was removed. Non-Joyo status is not a removal reason.`);
        }
    });

    const policyPath = path.join(__dirname, '..', 'DATA_POLICY.md');
    if (!fs.existsSync(policyPath)) {
        reportError('DATA_POLICY.md is missing.');
        return;
    }
    const policy = fs.readFileSync(policyPath, 'utf8');
    if (!policy.includes('常用漢字かどうかは収録可否の条件にしない')) {
        reportError('DATA_POLICY.md must explicitly keep Joyo status out of the inclusion criteria.');
    }
    if (!policy.includes('珍しい漢字を「不要」として落とさない')) {
        reportError('DATA_POLICY.md must preserve rare-kanji discovery value.');
    }
    if (!policy.includes('discovery') || !policy.includes('通常クイズ・デイリーにも残す')) {
        reportError('Discovery-tier kanji must remain in the normal quiz/daily experience.');
    }
    if (!policy.includes('deep') || !policy.includes('発見価値を残しながら、出会う導線と頻度を調整する')) {
        reportError('Deep-tier exposure may be adjusted only while preserving discovery value and catalog reachability.');
    }
}

// 単字の読みと送り仮名、意味の対象を辞書と照合した回帰検査。
for (const [kanji, key, expected] of [['洞', 'y', 'ほら'], ['志', 'kun', 'こころざし'], ['芯', 'm', '植物の茎などの中心部分']]) {
    if (findKanji(data.KANJI_ALL, kanji)?.[key] !== expected) reportError(`${kanji}: ${key} must be ${expected}`);
}

checkGlobalIntegrity();
checkMode('LR', data.KANJI_LR, data.PARTS_L_LR, data.PARTS_R_LR);
checkMode('UD', data.KANJI_UD, data.PARTS_L_UD, data.PARTS_R_UD);
checkAuditedStructure();
checkFoodRadical();
checkAuditedMeanings();
checkDiscoveryPolicy();

if (hasError) {
    console.error('\n❌ VALIDATION FAILED!');
    process.exit(1);
}

console.log(`\n✅ ALL VALIDATIONS PASSED! ${data.KANJI_ALL.length} kanji are structurally consistent, including discovery/non-Joyo entries.`);
