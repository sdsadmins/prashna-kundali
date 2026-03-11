/**
 * KP Horary Astrology — Orchestrator
 *
 * Ties together all KP services to produce a complete horary chart analysis
 * from a querist-given number (1-249).
 *
 * Based on K.S. Krishnamurti, "KP Reader VI: Horary Astrology"
 */
const { getSubByNumber } = require('../data/kpSubTable');
const { getAllPlanetPositions, getAyanamsa, dateToJulianDay, calcPlacidusCuspsFromAsc } = require('./ephemeris');
const { calculateAllSignificators } = require('./kpSignificators');
const { calculateKPRulingPlanets } = require('./kpRulingPlanets');
const { analyzeYesNo } = require('./kpYesNo');
const { calculateDashaBalance } = require('./kpDasha');
const { calculateEventTiming } = require('./kpTiming');
const { getSubByDegree, formatDMS } = require('../data/kpSubTable');
const { getNakshatraFromDegree } = require('./nakshatra');
const { SIGNS } = require('../data/constants');

/**
 * Calculate a complete KP Horary chart.
 *
 * @param {number} horaryNumber - 1 to 249
 * @param {Date} date - Judgment date/time
 * @param {number} latitude - Location latitude
 * @param {number} longitude - Location longitude
 * @param {string} questionCategory - e.g. 'marriage', 'job', 'health'
 * @returns {Object} Complete KP Horary analysis
 */
function calculateKPHorary(horaryNumber, date, latitude, longitude, questionCategory) {
  // Step 1: Look up horary number → ascendant degree
  const subEntry = getSubByNumber(horaryNumber);
  const ascendant = subEntry.startDeg;

  // Step 2: Planet positions at judgment time
  const jd = dateToJulianDay(date);
  const ayanamsa = getAyanamsa(jd);
  const planets = getAllPlanetPositions(jd);

  // Step 3: Build Placidus house cusps from horary ascendant
  // KP system uses Placidus cusps. Convert sidereal ascendant → tropical → Placidus → sidereal
  const tropicalAsc = ascendant + ayanamsa; // tropical = sidereal + ayanamsa
  const placidus = calcPlacidusCuspsFromAsc(tropicalAsc, jd, latitude);
  const houses = placidus.cusps.map(tropCusp => {
    return ((tropCusp - ayanamsa) % 360 + 360) % 360;
  });

  // Step 4: Calculate significators for all 12 houses
  const significators = calculateAllSignificators(houses, planets);

  // Step 5: Calculate 5-component KP ruling planets
  const rulingPlanets = calculateKPRulingPlanets(ascendant, planets, date);

  // Step 6: Yes/No analysis
  const yesNo = analyzeYesNo(questionCategory, houses, planets, significators);

  // Step 7: Dasha balance from Moon's position
  const dashaBalance = calculateDashaBalance(planets.moon.longitude, date);

  // Step 8: Event timing predictions (including Dasha-based long-term timing)
  const timing = calculateEventTiming(
    rulingPlanets.filtered,
    significators,
    planets,
    questionCategory,
    date,
    houses,
    dashaBalance
  );

  // Build planet details with house placement, nakshatra, sub-lord
  const planetDetails = {};
  for (const [name, pos] of Object.entries(planets)) {
    const nak = getNakshatraFromDegree(pos.longitude);
    const sub = getSubByDegree(pos.longitude);
    const signIndex = Math.floor(((pos.longitude % 360) + 360) % 360 / 30);
    planetDetails[name] = {
      longitude: pos.longitude,
      longitudeDMS: formatDMS(pos.longitude),
      sign: SIGNS[signIndex].en,
      signLord: SIGNS[signIndex].lord,
      nakshatra: nak.nakshatra.en,
      nakshatraLord: nak.lord,
      subLord: sub.subLord,
      isRetrograde: pos.isRetrograde,
      degreeInSign: formatDMS(pos.longitude - signIndex * 30),
    };
  }

  return {
    mode: 'kp',
    horaryNumber,
    subEntry: {
      number: subEntry.number,
      sign: subEntry.sign.en,
      signLord: subEntry.signLord,
      nakshatra: subEntry.nakshatra.en,
      starLord: subEntry.starLord,
      subLord: subEntry.subLord,
      startDeg: subEntry.startDeg,
      endDeg: subEntry.endDeg,
      startDMS: formatDMS(subEntry.startDeg),
      endDMS: formatDMS(subEntry.endDeg),
    },
    ascendant,
    ascendantDMS: formatDMS(ascendant),
    houses: houses.map((deg, i) => ({
      house: i + 1,
      degree: deg,
      degreeDMS: formatDMS(deg),
    })),
    planets: planetDetails,
    significators,
    rulingPlanets,
    yesNo,
    dashaBalance,
    timing,
    questionCategory,
    ayanamsa,
    julianDay: jd,
    date: date.toISOString(),
    latitude,
    longitude,
  };
}

module.exports = {
  calculateKPHorary,
};
