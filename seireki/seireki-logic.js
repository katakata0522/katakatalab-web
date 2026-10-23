/**
 * 年齢・和暦・履歴書計算の純関数。
 * ハローワーク応募書類パンフの「生年+7／早生まれは生年-1してから同じ」に合わせる。
 */
const SeirekiLogic = (() => {
  const MIN_YEAR = 1868;
  const MAX_AGE = 120;
  const ETOS = ['申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未'];
  const ERAS = [
    { name: '令和', start: 2019 },
    { name: '平成', start: 1989 },
    { name: '昭和', start: 1926 },
    { name: '大正', start: 1912 },
    { name: '明治', start: 1868 }
  ];

  const RESUME_STEPS = [
    { label: '小学校入学', offset: 7, month: 4 },
    { label: '小学校卒業', offset: 13, month: 3 },
    { label: '中学校入学', offset: 13, month: 4 },
    { label: '中学校卒業', offset: 16, month: 3 },
    { label: '高校入学', offset: 16, month: 4 },
    { label: '高校卒業', offset: 19, month: 3 },
    { label: '大学入学（4年制）', offset: 19, month: 4 },
    { label: '大学卒業（4年制）', offset: 23, month: 3 }
  ];

  function parseWesternYear(raw) {
    const digits = String(raw ?? '')
      .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xFEE0))
      .trim().replace(/年$/, '').trim();
    if (!/^\d{4}$/.test(digits)) return null;
    return Number(digits);
  }

  function warekiToWestern(eraName, eraYear) {
    const era = ERAS.find((item) => item.name === eraName);
    const yearInEra = Number(eraYear);
    if (!era || !Number.isInteger(yearInEra) || yearInEra < 1) return null;
    const western = era.start + yearInEra - 1;
    const newer = ERAS[ERAS.indexOf(era) - 1];
    if (newer && western > newer.start) return null;
    return western;
  }

  function formatEraYear(eraName, eraYear) {
    return eraName + (eraYear === 1 ? '元年' : `${eraYear}年`);
  }

  function warekiPrimary(year) {
    for (const era of ERAS) {
      if (year >= era.start) {
        return formatEraYear(era.name, year - era.start + 1);
      }
    }
    return '';
  }

  function warekiDisplay(year) {
    const primary = warekiPrimary(year);
    const currentIndex = ERAS.findIndex((era) => year >= era.start);
    if (currentIndex < 0) return primary;
    const current = ERAS[currentIndex];
    const previous = ERAS[currentIndex + 1];
    if (!previous || year !== current.start) return primary;
    return `${formatEraYear(previous.name, year - previous.start + 1)} / ${primary}`;
  }

  function toOptionalInt(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isInteger(number) ? number : null;
  }

  function isLeapYear(year) {
    return Number.isInteger(year) && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0);
  }

  function daysInMonth(month, year) {
    if (month === 2) {
      if (!Number.isInteger(year)) return 29;
      return isLeapYear(year) ? 29 : 28;
    }
    if ([4, 6, 9, 11].includes(month)) return 30;
    return 31;
  }

  function isValidCalendarDate(year, month, day) {
    const monthNumber = toOptionalInt(month);
    const dayNumber = toOptionalInt(day);
    if (monthNumber === null || dayNumber === null) return false;
    if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1) return false;
    const yearNumber = toOptionalInt(year);
    return dayNumber <= daysInMonth(monthNumber, yearNumber);
  }

  function isEarlyBirth(month, day, year) {
    if (!isValidCalendarDate(year ?? 2000, month, day)) return null;
    const monthNumber = toOptionalInt(month);
    const dayNumber = toOptionalInt(day);
    return monthNumber < 4 || (monthNumber === 4 && dayNumber === 1);
  }

  function resumeTimeline(birthYear, { earlyBirth = false } = {}) {
    const year = Number(birthYear);
    if (!Number.isInteger(year)) return [];
    const base = earlyBirth ? year - 1 : year;
    return RESUME_STEPS.map((step) => ({
      label: step.label,
      year: base + step.offset,
      month: step.month
    }));
  }

  function describeAge(birthYear, currentYear, options = {}) {
    const turningAge = Number(currentYear) - Number(birthYear);
    if (!Number.isInteger(turningAge)) {
      return { turningAge: null, manAge: null };
    }
    const month = toOptionalInt(options.month);
    const day = toOptionalInt(options.day);
    const todayMonth = toOptionalInt(options.todayMonth);
    const todayDay = toOptionalInt(options.todayDay);
    const hasBirthday = isValidCalendarDate(birthYear, month, day)
      && todayMonth !== null && todayDay !== null
      && todayMonth >= 1 && todayMonth <= 12
      && todayDay >= 1 && todayDay <= 31;

    if (hasBirthday) {
      const birthdayPassed = todayMonth > month || (todayMonth === month && todayDay >= day);
      return {
        turningAge,
        manAge: Math.max(0, birthdayPassed ? turningAge : turningAge - 1)
      };
    }

    return {
      turningAge,
      manAge: turningAge === 0 ? 0 : null
    };
  }

  function etoOf(year) {
    return ETOS[((Number(year) % 12) + 12) % 12];
  }

  function nextYakudoshi(kazueAge, honAges) {
    const upcoming = honAges
      .map((age) => ({ hon: age, mae: age - 1, ato: age + 1 }))
      .find((item) => kazueAge <= item.ato);
    if (!upcoming) return null;
    if (kazueAge === upcoming.mae) return { kind: '前厄', hon: upcoming.hon };
    if (kazueAge === upcoming.hon) return { kind: '本厄', hon: upcoming.hon };
    if (kazueAge === upcoming.ato) return { kind: '後厄', hon: upcoming.hon };
    return { kind: '次', hon: upcoming.hon, yearsLater: upcoming.hon - kazueAge };
  }

  return {
    MIN_YEAR,
    MAX_AGE,
    ETOS,
    ERAS,
    parseWesternYear,
    warekiToWestern,
    warekiPrimary,
    warekiDisplay,
    isEarlyBirth,
    isValidCalendarDate,
    resumeTimeline,
    describeAge,
    etoOf,
    nextYakudoshi
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SeirekiLogic;
}
if (typeof window !== 'undefined') {
  window.SeirekiLogic = SeirekiLogic;
}
