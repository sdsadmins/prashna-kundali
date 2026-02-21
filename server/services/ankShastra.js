/**
 * Ank Shastra calculation engine
 * Takes ruling planets and number of options, returns the answer
 */

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

  rulingPlanets.forEach((rp, index) => {
    const step = {
      index: index + 1,
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

  // Division and remainder
  const remainder = totalAnk % optionsCount;
  const answerOption = remainder === 0 ? optionsCount : remainder;

  return {
    steps,
    totalAnk,
    optionsCount,
    division: {
      dividend: totalAnk,
      divisor: optionsCount,
      quotient: Math.floor(totalAnk / optionsCount),
      remainder,
    },
    answerOption,
    answerExplanation: {
      en: remainder === 0
        ? `${totalAnk} ÷ ${optionsCount} = ${Math.floor(totalAnk / optionsCount)}, Remainder = 0 → Last option (Option ${optionsCount})`
        : `${totalAnk} ÷ ${optionsCount} = ${Math.floor(totalAnk / optionsCount)}, Remainder = ${remainder} → Option ${remainder}`,
      mr: remainder === 0
        ? `${totalAnk} ÷ ${optionsCount} = ${Math.floor(totalAnk / optionsCount)}, बाकी = ० → शेवटचा पर्याय (पर्याय ${optionsCount})`
        : `${totalAnk} ÷ ${optionsCount} = ${Math.floor(totalAnk / optionsCount)}, बाकी = ${remainder} → पर्याय ${remainder}`,
    },
  };
}

module.exports = {
  calculateAnswer,
};
