/**
 * Vimshottari Dasha Balance Calculator
 *
 * From KP Reader VI: the Moon's position at judgment determines
 * the running Dasha periods. Events fructify when the Dasha lord,
 * Bhukti lord, and Anthra lord are all significators of relevant houses.
 */
const { getNakshatraFromDegree } = require('./nakshatra');
const { VIMSHOTTARI_ORDER, VIMSHOTTARI_YEARS, VIMSHOTTARI_TOTAL } = require('../data/constants');

const MS_PER_DAY = 86400000;
const NAKSHATRA_SPAN = 13 + 20 / 60; // 13°20'

/**
 * Calculate Vimshottari Dasha balance from Moon's position.
 *
 * @param {number} moonLongitude - Sidereal Moon longitude in degrees
 * @param {Date} judgmentDate - Date/time of judgment
 * @returns {Object} Dasha balance with periods and dates
 */
function calculateDashaBalance(moonLongitude, judgmentDate) {
  const nakResult = getNakshatraFromDegree(moonLongitude);
  const nakIndex = nakResult.nakshatra.index;
  const nakStartDeg = nakIndex * NAKSHATRA_SPAN;
  const degreeInNak = moonLongitude - nakStartDeg;
  const proportionElapsed = degreeInNak / NAKSHATRA_SPAN;
  const proportionRemaining = 1 - proportionElapsed;

  const dashaLord = nakResult.lord;
  const dashaYears = VIMSHOTTARI_YEARS[dashaLord];
  const remainingYears = dashaYears * proportionRemaining;
  const remainingDays = remainingYears * 365.25;

  const elapsedDays = proportionElapsed * dashaYears * 365.25;
  const dashaStartDate = new Date(judgmentDate.getTime() - elapsedDays * MS_PER_DAY);
  const dashaEndDate = new Date(judgmentDate.getTime() + remainingDays * MS_PER_DAY);

  // Build current Maha Dasha info
  const mahaDasha = {
    lord: dashaLord,
    totalYears: dashaYears,
    remainingYears,
    remainingDays,
    startDate: dashaStartDate.toISOString(),
    endDate: dashaEndDate.toISOString(),
  };

  // Calculate Bhukti (sub-period) sequence within current Maha Dasha
  const bhuktis = calculateSubPeriods(dashaLord, dashaStartDate, dashaYears);

  // Find current Bhukti
  const now = judgmentDate.getTime();
  let currentBhukti = null;
  let currentAnthra = null;
  for (const bhukti of bhuktis) {
    const bStart = new Date(bhukti.startDate).getTime();
    const bEnd = new Date(bhukti.endDate).getTime();
    if (now >= bStart && now < bEnd) {
      currentBhukti = bhukti;
      // Calculate Anthra within current Bhukti
      const anthras = calculateSubPeriods(bhukti.lord, new Date(bhukti.startDate), bhukti.durationYears);
      for (const anthra of anthras) {
        const aStart = new Date(anthra.startDate).getTime();
        const aEnd = new Date(anthra.endDate).getTime();
        if (now >= aStart && now < aEnd) {
          currentAnthra = anthra;
          break;
        }
      }
      currentBhukti.anthras = anthras;
      break;
    }
  }

  return {
    moonNakshatra: nakResult.nakshatra,
    degreeInNakshatra: degreeInNak,
    proportionRemaining,
    mahaDasha,
    currentBhukti,
    currentAnthra,
    bhuktis,
  };
}

/**
 * Calculate sub-periods within a major period.
 * Sub-periods follow Vimshottari order starting from the major lord.
 * Duration proportional to years: subDuration = (majorYears × subYears) / 120
 */
function calculateSubPeriods(majorLord, startDate, majorYears) {
  const startIdx = VIMSHOTTARI_ORDER.indexOf(majorLord);
  const periods = [];
  let currentDate = new Date(startDate);

  for (let i = 0; i < 9; i++) {
    const subLord = VIMSHOTTARI_ORDER[(startIdx + i) % 9];
    const subYears = VIMSHOTTARI_YEARS[subLord];
    const durationYears = (majorYears * subYears) / VIMSHOTTARI_TOTAL;
    const durationDays = durationYears * 365.25;
    const endDate = new Date(currentDate.getTime() + durationDays * MS_PER_DAY);

    periods.push({
      lord: subLord,
      durationYears,
      durationDays,
      startDate: currentDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    currentDate = endDate;
  }

  return periods;
}

module.exports = {
  calculateDashaBalance,
  calculateSubPeriods,
};
