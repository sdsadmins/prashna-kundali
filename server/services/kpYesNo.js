/**
 * KP Yes/No Determination
 *
 * The sub-lord of the relevant house cusp is the decisive factor.
 * "The sub-lord of a cusp determines whether the matter signified by
 * that house will materialize or not." — K.S. Krishnamurti
 */
const { getNakshatraFromDegree } = require('./nakshatra');
const { getSubByDegree } = require('../data/kpSubTable');
const { getQuestionHouses } = require('../data/kpQuestionHouses');
const { getHousesSignifiedByPlanet } = require('./kpSignificators');

/**
 * Analyze yes/no for a question using KP sub-lord method.
 *
 * @param {string} questionCategory - e.g. 'marriage', 'job', 'health'
 * @param {number[]} houses - 12 house cusp degrees (sidereal)
 * @param {Object} planets - Planet positions with longitude, isRetrograde
 * @param {Object} significators - From calculateAllSignificators()
 * @returns {Object} { verdict, reasoning, ... }
 */
function analyzeYesNo(questionCategory, houses, planets, significators) {
  const houseMapping = getQuestionHouses(questionCategory);
  const { favorable, unfavorable, primaryCusp } = houseMapping;
  const reasoning = [];

  // Step 1: Get the cusp degree
  const cuspDegree = houses[primaryCusp - 1];
  reasoning.push('Primary cusp: House ' + primaryCusp + ' at ' + cuspDegree.toFixed(2) + '°');

  // Step 2: Find sub-lord of the cusp
  const cuspSub = getSubByDegree(cuspDegree);
  const subLord = cuspSub.subLord;
  reasoning.push('Sub-lord of cusp ' + primaryCusp + ': ' + subLord);

  // Step 3: Find constellation (nakshatra) the sub-lord is in
  if (!planets[subLord]) {
    return {
      verdict: 'UNKNOWN',
      primaryCusp,
      subLord,
      reasoning: ['Sub-lord planet not found in chart'],
      houseMapping,
    };
  }
  const subLordDeg = planets[subLord].longitude;
  const subLordNak = getNakshatraFromDegree(subLordDeg);
  const constellationLord = subLordNak.lord;
  reasoning.push(subLord + ' is in ' + subLordNak.nakshatra.en + ' (lord: ' + constellationLord + ')');

  // Step 4: Find what houses the constellation lord signifies
  const housesSignified = getHousesSignifiedByPlanet(constellationLord, significators);
  const signifiedNumbers = [...new Set(housesSignified.map(h => h.house))];
  reasoning.push(constellationLord + ' signifies houses: ' + signifiedNumbers.join(', '));

  // Step 5: Count favorable vs unfavorable
  const favCount = signifiedNumbers.filter(h => favorable.includes(h)).length;
  const unfavCount = signifiedNumbers.filter(h => unfavorable.includes(h)).length;
  const favHouses = signifiedNumbers.filter(h => favorable.includes(h));
  const unfavHouses = signifiedNumbers.filter(h => unfavorable.includes(h));

  reasoning.push('Favorable houses signified: ' + (favHouses.length > 0 ? favHouses.join(', ') : 'none'));
  reasoning.push('Unfavorable houses signified: ' + (unfavHouses.length > 0 ? unfavHouses.join(', ') : 'none'));

  // Step 6: Additional checks
  let retroWarning = false;
  if (planets[subLord].isRetrograde) {
    reasoning.push('WARNING: Sub-lord ' + subLord + ' is retrograde — weakens positive indication');
    retroWarning = true;
  }
  if (planets[constellationLord] && planets[constellationLord].isRetrograde) {
    reasoning.push('WARNING: Constellation lord ' + constellationLord + ' is retrograde — delays/denies');
    retroWarning = true;
  }

  // Check if sub-lord is in constellation of a retrograde planet
  if (planets[constellationLord] && planets[constellationLord].isRetrograde) {
    reasoning.push('Sub-lord in constellation of retrograde planet — generally indicates NO');
  }

  // Determine verdict
  let verdict;
  if (favCount > 0 && unfavCount === 0) {
    verdict = retroWarning ? 'YES_WITH_DELAY' : 'YES';
    reasoning.push('VERDICT: ' + verdict + ' — constellation lord signifies favorable houses');
  } else if (unfavCount > 0 && favCount === 0) {
    verdict = 'NO';
    reasoning.push('VERDICT: NO — constellation lord signifies unfavorable houses');
  } else if (favCount > 0 && unfavCount > 0) {
    verdict = favCount >= unfavCount ? 'MIXED_POSITIVE' : 'MIXED_NEGATIVE';
    reasoning.push('VERDICT: ' + verdict + ' — mixed significations');
  } else {
    // Signifies neither favorable nor unfavorable houses
    verdict = 'UNCERTAIN';
    reasoning.push('VERDICT: UNCERTAIN — constellation lord does not strongly signify relevant houses');
  }

  return {
    verdict,
    primaryCusp,
    cuspDegree,
    subLord,
    subLordDegree: subLordDeg,
    subLordNakshatra: subLordNak,
    constellationLord,
    housesSignified,
    favHouses,
    unfavHouses,
    reasoning,
    houseMapping,
  };
}

module.exports = {
  analyzeYesNo,
};
