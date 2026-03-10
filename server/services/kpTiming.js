/**
 * KP Event Timing Calculator
 *
 * From KP Reader VI: events materialize when transiting planets
 * reach positions governed by fruitful significators (common between
 * house significators and ruling planets).
 *
 * Timing hierarchy:
 * - Lagna transit: within hours (same day)
 * - Moon transit: within days (same month)
 * - Sun transit: within months (same year)
 * - Jupiter transit: within years
 */
const { calcPlanetPosition, calcHouses } = require('./ephemeris');
const { dateToJulianDay } = require('./ephemeris');
const { getSubByDegree } = require('../data/kpSubTable');
const { getNakshatraFromDegree } = require('./nakshatra');
const { NAKSHATRAS } = require('../data/constants');

/**
 * Find fruitful significators — planets common to both house significators and ruling planets.
 */
function findFruitfulSignificators(significators, rulingPlanets, favorable) {
  const sigPlanets = new Set();
  for (const house of favorable) {
    const levels = significators[house];
    if (!levels) continue;
    for (const level of ['A', 'B', 'C', 'D']) {
      for (const p of levels[level]) {
        sigPlanets.add(p);
      }
    }
  }

  // Common with ruling planets
  const fruitful = rulingPlanets.filter(p => sigPlanets.has(p));
  return fruitful.length > 0 ? fruitful : rulingPlanets.slice(0, 3); // fallback to top ruling planets
}

/**
 * Find degree positions governed by a set of planets (as star lords or sub lords).
 * Returns array of { startDeg, endDeg } ranges.
 */
function findGovernedPositions(planets) {
  const { KP_SUB_TABLE } = require('../data/kpSubTable');
  const positions = [];
  for (const entry of KP_SUB_TABLE) {
    if (planets.includes(entry.starLord) || planets.includes(entry.subLord)) {
      positions.push({
        startDeg: entry.startDeg,
        endDeg: entry.endDeg,
        starLord: entry.starLord,
        subLord: entry.subLord,
        sign: entry.sign.en,
      });
    }
  }
  return positions;
}

/**
 * Calculate when a transiting planet will reach a governed position.
 * Uses forward stepping.
 *
 * @param {string} planetName - Planet to track transit
 * @param {number} startJd - Starting Julian Day
 * @param {number[][]} governedRanges - Array of [startDeg, endDeg]
 * @param {number} stepDays - Step size in days
 * @param {number} maxSteps - Maximum steps to check
 * @returns {Object|null} { date, degree, range }
 */
function findNextTransit(planetName, startJd, governedRanges, stepDays, maxSteps) {
  for (let step = 1; step <= maxSteps; step++) {
    const jd = startJd + step * stepDays;
    const pos = calcPlanetPosition(jd, planetName);
    const deg = pos.longitude;

    for (const range of governedRanges) {
      if (deg >= range.startDeg && deg < range.endDeg) {
        const date = julianDayToDate(jd);
        return {
          date: date.toISOString(),
          degree: deg,
          range,
          stepsAhead: step,
        };
      }
    }
  }
  return null;
}

/**
 * Convert Julian Day to JS Date
 */
function julianDayToDate(jd) {
  // JD 2440587.5 = Unix epoch (1970-01-01 00:00 UTC)
  const ms = (jd - 2440587.5) * 86400000;
  return new Date(ms);
}

/**
 * Calculate event timing predictions.
 */
function calculateEventTiming(rulingPlanets, significators, planets, questionCategory, judgmentDate, houses) {
  const { getQuestionHouses } = require('../data/kpQuestionHouses');
  const houseMapping = getQuestionHouses(questionCategory);
  const favorable = houseMapping.favorable;

  // Find fruitful significators
  const fruitful = findFruitfulSignificators(significators, rulingPlanets, favorable);

  // Find governed positions
  const governedPositions = findGovernedPositions(fruitful);
  const governedRanges = governedPositions.map(p => ({
    startDeg: p.startDeg,
    endDeg: p.endDeg,
  }));

  const jd = dateToJulianDay(judgmentDate);

  // Moon transit (days) — step 0.5 day, check 60 days
  const moonTransit = findNextTransit('moon', jd, governedRanges, 0.5, 120);

  // Sun transit (months) — step 1 day, check 365 days
  const sunTransit = findNextTransit('sun', jd, governedRanges, 1, 365);

  // Jupiter transit (years) — step 7 days, check ~3 years
  const jupiterTransit = findNextTransit('jupiter', jd, governedRanges, 7, 156);

  // Saturn transit — step 7 days, check ~3 years
  const saturnTransit = findNextTransit('saturn', jd, governedRanges, 7, 156);

  return {
    fruitfulSignificators: fruitful,
    governedPositionCount: governedPositions.length,
    moonTransit,
    sunTransit,
    jupiterTransit,
    saturnTransit,
  };
}

module.exports = {
  calculateEventTiming,
  findFruitfulSignificators,
  findGovernedPositions,
};
