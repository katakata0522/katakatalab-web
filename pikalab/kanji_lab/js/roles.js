// --- KANJI LAB EXPOSURE ROLES ---
(function () {
    'use strict';

    const Data = window.KanjiLabData;
    if (!Data) return;

    // deep: 正しい漢字としてカタログには残すが、通常クイズ/デイリーでは
    // 同率出題しない。全問コース、ラボ、図鑑、おまかせ発見では残す。
    const DEEP_KANJI = new Set([
        '佚', '拆', '銖', '潘', '泪',
        '謨', '摸', '搶', '愴', '沽',
        '鈷', '佻', '銚', '晤', '梧',
        '誥', '呵', '怡', '佼', '佯',
        '坤', '沾', '鉦', '笨', '苯'
    ]);

    // discovery: 通常出題にも残せるが、日常使用頻度ではなく
    // 構造比較や「こんな字があるんだ」という発見価値を主目的とする字。
    const DISCOVERY_KANJI = new Set([
        '柚', '椋', '桔', '栖', '杜', '橡', '梏', '椴',
        '晦', '諳', '沐', '洽', '沫', '滄', '沮', '坡',
        '伶', '咆', '啼', '銷', '拮', '抉', '拌', '拈',
        '緞', '恰', '恫', '恪', '怜', '悄', '彷', '徘', '很',
        '宋', '笙', '筍', '笞', '霖', '雹', '苓', '苞', '芫',
        '荀', '苔', '杲'
    ]);

    const TIER = Object.freeze({
        STANDARD: 'standard',
        DISCOVERY: 'discovery',
        DEEP: 'deep'
    });

    function getTier(kanji) {
        if (DEEP_KANJI.has(kanji)) return TIER.DEEP;
        if (DISCOVERY_KANJI.has(kanji)) return TIER.DISCOVERY;
        return TIER.STANDARD;
    }

    function isDeepEntry(entry) {
        return !!entry && getTier(entry.k) === TIER.DEEP;
    }

    function isDefaultQuizEntry(entry) {
        return !!entry && !isDeepEntry(entry);
    }

    function getDefaultQuizPool(entries) {
        return (entries || []).filter(isDefaultQuizEntry);
    }

    function entriesForPart(entries, side, part) {
        const key = side === 'left' ? 'l' : 'r';
        return (entries || []).filter(entry => entry[key] === part);
    }

    // 「deepの字にしか使われないパーツ」だけを通常一覧から畳むための判定。
    // discovery と standard を1字でも含むパーツは通常一覧に残す。
    function isDeepOnlyPart(entries, side, part) {
        const matches = entriesForPart(entries, side, part);
        return matches.length > 0 && matches.every(isDeepEntry);
    }

    function getDeepOnlyParts(entries, side) {
        const key = side === 'left' ? 'l' : 'r';
        const parts = [...new Set((entries || []).map(entry => entry[key]))];
        return parts.filter(part => isDeepOnlyPart(entries, side, part));
    }

    function getTierCounts(entries) {
        return (entries || []).reduce((counts, entry) => {
            const tier = getTier(entry.k);
            counts[tier]++;
            return counts;
        }, { standard: 0, discovery: 0, deep: 0 });
    }

    // 分類ミスを静かに抱えない。カタログに存在しない字が役割表へ入ったら警告する。
    const catalogKanji = new Set(Data.KANJI_ALL.map(entry => entry.k));
    [...DEEP_KANJI, ...DISCOVERY_KANJI].forEach(kanji => {
        if (!catalogKanji.has(kanji)) {
            console.warn(`KanjiLabRoles: tiered kanji is missing from catalog: ${kanji}`);
        }
    });

    window.KanjiLabRoles = Object.freeze({
        TIER,
        DEEP_KANJI,
        DISCOVERY_KANJI,
        getTier,
        isDeepEntry,
        isDefaultQuizEntry,
        getDefaultQuizPool,
        entriesForPart,
        isDeepOnlyPart,
        getDeepOnlyParts,
        getTierCounts
    });
})();
