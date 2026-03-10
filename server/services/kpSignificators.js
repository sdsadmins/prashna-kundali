/**
 * KP Significator Calculator
 *
 * Implements the 4-level significator hierarchy from KP Reader VI.
 * For each house, determines which planets signify that house's matters.
 */
const { getNakshatraFromDegree } = require('./nakshatra');
const { SIGNS } = require('../data/constants');

const PLANET_KEYS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];

/**
 * Determine which house (1-12) a planet occupies based on cusp degrees.
 * Equal house: planet is in house N if longitude is between cusp[N-1] and cusp[N] (mod 360).
 */
function getHouseOfPlanet(planetLongitude, houses) {
  const deg = ((planetLongitude % 360) + 360) % 360;
  for (let i = 0; i < 12; i++) {
    const start = houses[i];
    const end = houses[(i + 1) % 12];
    if (end > start) {
      if (deg >= start && deg < end) return i + 1;
    } else {
      // Wraps around 360°
      if (deg >= start || deg < end) return i + 1;
    }
  }
  return 1; // fallback
}

/**
 * Get the sign lord for a given degree (sidereal)
 */
function getSignLord(degree) {
  const normalized = ((degree % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  return SIGNS[signIndex].lord;
}

/**
 * Calculate all significators for all 12 houses.
 *
 * @param {number[]} houses - 12 house cusp degrees (sidereal)
 * @param {Object} planets - Planet positions { sun: {longitude}, moon: {longitude}, ... }
 * @returns {Object} { 1: { A:[], B:[], C:[], D:[] }, 2: {...}, ... 12: {...} }
 */
function calculateAllSignificators(houses, planets) {
  // Step 1: Find which house each planet occupies
  const planetHouses = {};
  for (const p of PLANET_KEYS) {
    if (planets[p]) {
      planetHouses[p] = getHouseOfPlanet(planets[p].longitude, houses);
    }
  }

  // Step 2: Find nakshatra lord for each planet
  const planetNakLords = {};
  for (const p of PLANET_KEYS) {
    if (planets[p]) {
      const nak = getNakshatraFromDegree(planets[p].longitude);
      planetNakLords[p] = nak.lord;
    }
  }

  // Step 3: Find house lord (sign lord of cusp degree) for each house
  const houseLords = {};
  for (let h = 1; h <= 12; h++) {
    houseLords[h] = getSignLord(houses[h - 1]);
  }

  // Step 4: Build significators for each house
  const significators = {};
  for (let h = 1; h <= 12; h++) {
    // B: Occupants — planets whose house = h
    const occupants = PLANET_KEYS.filter(p => planetHouses[p] === h);

    // A: Planets in constellation of occupants
    const levelA = [];
    for (const occupant of occupants) {
      for (const p of PLANET_KEYS) {
        if (planetNakLords[p] === occupant && !levelA.includes(p)) {
          levelA.push(p);
        }
      }
    }

    // D: The lord of the house
    const lord = houseLords[h];

    // C: Planets in constellation of the lord
    const levelC = [];
    for (const p of PLANET_KEYS) {
      if (planetNakLords[p] === lord && !levelC.includes(p)) {
        levelC.push(p);
      }
    }

    significators[h] = {
      A: levelA,
      B: occupants,
      C: levelC,
      D: [lord],
      lord,
    };
  }

  return significators;
}

/**
 * Get all houses signified by a planet (across all levels).
 * Returns array of { house, level } objects.
 */
function getHousesSignifiedByPlanet(planet, significators) {
  const result = [];
  for (let h = 1; h <= 12; h++) {
    const levels = significators[h];
    for (const level of ['A', 'B', 'C', 'D']) {
      if (levels[level].includes(planet)) {
        result.push({ house: h, level });
      }
    }
  }
  return result;
}

module.exports = {
  calculateAllSignificators,
  getHouseOfPlanet,
  getHousesSignifiedByPlanet,
  getSignLord,
};
