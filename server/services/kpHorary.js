/**
 * KP Horary Astrology — Orchestrator
 *
 * Ties together all KP services to produce a complete horary chart analysis
 * from a querist-given number (1-249).
 *
 * Based on K.S. Krishnamurti, "KP Reader VI: Horary Astrology"
 */
const { getSubByNumber } = require('../data/kpSubTable');
const { getAllPlanetPositions, getAyanamsa, dateToJulianDay, calcPlacidusCuspsFromAsc, calcTropicalAscendant } = require('./ephemeris');
const { calculateAllSignificators } = require('./kpSignificators');
const { calculateKPRulingPlanets } = require('./kpRulingPlanets');
const { analyzeYesNo, getSubLordQuality } = require('./kpYesNo');
const { calculateDashaBalance } = require('./kpDasha');
const { calculateEventTiming } = require('./kpTiming');
const { getQuestionHouses } = require('../data/kpQuestionHouses');
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
  // Per KP Reader VI p.123+167: ruling planets use the ACTUAL lagna rising at the
  // moment of judgment (not the horary number's ascendant). The horary number
  // determines the chart cusps; the real-time rising sign determines ruling planets.
  const tropAscActual = calcTropicalAscendant(jd, latitude, longitude);
  const actualLagna = ((tropAscActual.ascendant - ayanamsa) % 360 + 360) % 360;
  const rulingPlanets = calculateKPRulingPlanets(actualLagna, planets, date);

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
    dashaBalance,
    (rulingPlanets.rejected || []).map(r => r.planet),
    latitude,
    longitude
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
    actualLagna,
    actualLagnaDMS: formatDMS(actualLagna),
    yesNo: {
      ...yesNo,
      subLordQuality: getSubLordQuality(yesNo.subLord),
    },
    dashaBalance,
    timing,
    questionCategory,
    eventType: getQuestionHouses(questionCategory).eventType || 'event',
    ayanamsa,
    julianDay: jd,
    date: date.toISOString(),
    latitude,
    longitude,
  };
}

/**
 * Calculate a KP chart using the "chart cast for moment" method.
 * Instead of a 1-249 horary number, the ascendant is derived from the
 * actual rising sign at the date/time/location of judgment.
 *
 * Per KP Reader VI p.124-131: "Also one can ask for a number within 249
 * and work out— [or] calculate on a number given or chosen and work to
 * find the time of the return..."
 *
 * @param {Date} date - Judgment date/time
 * @param {number} latitude - Location latitude
 * @param {number} longitude - Location longitude
 * @param {string} questionCategory - e.g. 'marriage', 'job', 'health'
 * @returns {Object} Complete KP chart analysis
 */
function calculateKPMomentChart(date, latitude, longitude, questionCategory) {
  // Step 1: Calculate actual ascendant from time/location
  const jd = dateToJulianDay(date);
  const ayanamsa = getAyanamsa(jd);
  const tropAscResult = calcTropicalAscendant(jd, latitude, longitude);
  const ascendant = ((tropAscResult.ascendant - ayanamsa) % 360 + 360) % 360;

  // Look up sub entry for the actual ascendant degree
  const subEntry = getSubByDegree(ascendant);

  // Step 2: Planet positions at judgment time
  const planets = getAllPlanetPositions(jd);

  // Step 3: Build Placidus house cusps from actual ascendant
  const placidus = calcPlacidusCuspsFromAsc(tropAscResult.ascendant, jd, latitude);
  const houses = placidus.cusps.map(tropCusp => {
    return ((tropCusp - ayanamsa) % 360 + 360) % 360;
  });

  // Step 4: Calculate significators for all 12 houses
  const significators = calculateAllSignificators(houses, planets);

  // Step 5: Ruling planets (same ascendant as chart, since it IS the actual lagna)
  const rulingPlanets = calculateKPRulingPlanets(ascendant, planets, date);

  // Step 6: Yes/No analysis
  const yesNo = analyzeYesNo(questionCategory, houses, planets, significators);

  // Step 7: Dasha balance
  const dashaBalance = calculateDashaBalance(planets.moon.longitude, date);

  // Step 8: Event timing
  const timing = calculateEventTiming(
    rulingPlanets.filtered,
    significators,
    planets,
    questionCategory,
    date,
    houses,
    dashaBalance,
    (rulingPlanets.rejected || []).map(r => r.planet),
    latitude,
    longitude
  );

  // Build planet details
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
    mode: 'kp_moment',
    horaryNumber: null,
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
    actualLagna: ascendant,
    actualLagnaDMS: formatDMS(ascendant),
    yesNo: {
      ...yesNo,
      subLordQuality: getSubLordQuality(yesNo.subLord),
    },
    dashaBalance,
    timing,
    questionCategory,
    eventType: getQuestionHouses(questionCategory).eventType || 'event',
    ayanamsa,
    julianDay: jd,
    date: date.toISOString(),
    latitude,
    longitude,
  };
}

module.exports = {
  calculateKPHorary,
  calculateKPMomentChart,
};
