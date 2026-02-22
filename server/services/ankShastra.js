/**
 * Ank Shastra calculation engine
 * Takes ruling planets and number of options, returns the answer
 */

function getOrdinalEn(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getOrdinalMr(n) {
  const map = { 1: '१ली', 2: '२री', 3: '३री', 4: '४थी', 5: '५वी', 6: '६वी', 7: '७वी', 8: '८वी', 9: '९वी', 10: '१०वी', 11: '११वी', 12: '१२वी' };
  return map[n] || `${n}वी`;
}

/**
 * Sum the digits of a number
 * @param {number} n - positive integer
 * @returns {number} - sum of digits
 */
function sumOfDigits(n) {
  let sum = 0;
  let num = Math.abs(n);
  while (num > 0) {
    sum += num % 10;
    num = Math.floor(num / 10);
  }
  return sum;
}

/**
 * Smart digit sum reduction with stop-early logic
 * Reduces by digit sum, but stops if the next step would go below preferences count.
 * For 10+ preferences, no reduction is applied (returns total as-is).
 *
 * @param {number} total - total Ank value
 * @param {number} preferences - number of preferences (2+)
 * @returns {{ reducedAnk: number, steps: Array, applied: boolean, stoppedEarly: boolean }}
 */
function smartReduce(total, preferences) {
  const steps = [];

  // For 10+ preferences, never reduce
  if (preferences >= 10) {
    return { reducedAnk: total, steps, applied: false, stoppedEarly: false };
  }

  let current = total;

  while (current >= 10) {
    const next = sumOfDigits(current);
    const digits = String(current).split('').join('+');

    if (next < preferences && preferences > 2) {
      // Stop early: further reduction would go below preferences
      // (skip for prefs=2: any single digit is valid for yes/no questions)
      steps.push({ from: current, digits, to: next, stopped: true });
      break;
    }

    steps.push({ from: current, digits, to: next, stopped: false });
    current = next;
  }

  return {
    reducedAnk: current,
    steps,
    applied: steps.length > 0 && !steps[steps.length - 1]?.stopped,
    stoppedEarly: steps.length > 0 && steps[steps.length - 1]?.stopped,
  };
}

/**
 * Calculate the Prashna answer using Ank Shastra method
 * @param {Array} rulingPlanets - processed ruling planets from rulingPlanets.js
 * @param {number} optionsCount - number of options (minimum 2)
 * @returns {object} - calculation breakdown and answer
 */
function calculateAnswer(rulingPlanets, optionsCount) {
  if (optionsCount < 2) {
    throw new Error('Minimum 2 options required');
  }

  // Build calculation steps
  const steps = [];
  let totalAnk = 0;

  rulingPlanets.forEach((rp) => {
    const step = {
      label: rp.label,
      slotEn: rp.slotEn,
      slotMr: rp.slotMr,
      planetEn: rp.planet.en,
      planetMr: rp.planet.mr,
      ank: rp.ank,
      skipped: rp.skipped,
      skipReason: rp.skipReason,
    };

    if (rp.isRahuKetu && !rp.skipped) {
      step.note = `${rp.planet.en} in ${rp.rahuKetuResolution.sign.en} → lord ${rp.rahuKetuResolution.signLord}`;
      step.noteMr = `${rp.planet.mr} ${rp.rahuKetuResolution.sign.mr} मध्ये → स्वामी ${rp.rahuKetuResolution.signLord}`;
    }

    steps.push(step);
    totalAnk += rp.ank;
  });

  // Digit sum reduction (smart: stop early if result < preferences)
  const digitReduction = smartReduce(totalAnk, optionsCount);
  const dividend = digitReduction.reducedAnk;

  // Division and remainder
  const remainder = dividend % optionsCount;
  const answerOption = remainder === 0 ? optionsCount : remainder;
  const quotient = Math.floor(dividend / optionsCount);

  // Build explanation strings
  const reductionNote = digitReduction.steps.length > 0
    ? digitReduction.steps.map(s => `${s.digits}=${s.to}`).join(', ')
    : '';

  return {
    steps,
    totalAnk,
    optionsCount,
    digitReduction,
    division: {
      dividend,
      divisor: optionsCount,
      quotient,
      remainder,
    },
    answerOption,
    answerExplanation: {
      en: remainder === 0
        ? `${dividend} ÷ ${optionsCount} = ${quotient}, Remainder = 0 → Last Preference (${optionsCount})`
        : `${dividend} ÷ ${optionsCount} = ${quotient}, Remainder = ${remainder} → ${getOrdinalEn(remainder)} Preference`,
      mr: remainder === 0
        ? `${dividend} ÷ ${optionsCount} = ${quotient}, बाकी = ० → शेवटची पसंती (${optionsCount})`
        : `${dividend} ÷ ${optionsCount} = ${quotient}, बाकी = ${remainder} → ${getOrdinalMr(remainder)} पसंती`,
    },
  };
}

module.exports = {
  calculateAnswer,
};
