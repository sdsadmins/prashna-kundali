const swisseph = require('swisseph');
const { SWE_PLANETS } = require('../data/constants');

// Set KP (Krishnamurti) Ayanamsa
swisseph.swe_set_sid_mode(swisseph.SE_SIDM_KRISHNAMURTI, 0, 0);

/**
 * Convert a JS Date to Julian Day Number
 */
function dateToJulianDay(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  const result = swisseph.swe_julday(year, month, day, hour, swisseph.SE_GREG_CAL);
  return result;
}

/**
 * Calculate sidereal planet position
 * Returns { longitude, latitude, distance, speedLong, speedLat, speedDist }
 */
function calcPlanetPosition(julianDay, planetId) {
  const flags = swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SIDEREAL | swisseph.SEFLG_SPEED;
  const result = swisseph.swe_calc_ut(julianDay, planetId, flags);

  if (result.error) {
    throw new Error(`Swiss Ephemeris error for planet ${planetId}: ${result.error}`);
  }

  return {
    longitude: result.longitude,
    latitude: result.latitude,
    distance: result.distance,
    speedLong: result.longitudeSpeed,
    isRetrograde: result.longitudeSpeed < 0,
  };
}

/**
 * Calculate house cusps and ascendant
 * Returns { ascendant, mc, houses[] }
 */
function calcHouses(julianDay, latitude, longitude) {
  const flags = swisseph.SEFLG_SIDEREAL;
  // Use Placidus house system ('P')
  const result = swisseph.swe_houses(julianDay, latitude, longitude, 'P');

  if (result.error) {
    throw new Error(`Swiss Ephemeris houses error: ${result.error}`);
  }

  return {
    ascendant: result.ascendant,
    mc: result.mc,
    houses: result.house,
  };
}

/**
 * Get all planet positions at a given moment
 */
function getAllPlanetPositions(julianDay) {
  const positions = {};

  for (const [name, id] of Object.entries(SWE_PLANETS)) {
    if (name === 'ketu') {
      // Ketu is always 180° from Rahu
      const rahuPos = positions.rahu;
      positions.ketu = {
        longitude: (rahuPos.longitude + 180) % 360,
        latitude: -rahuPos.latitude,
        distance: rahuPos.distance,
        speedLong: rahuPos.speedLong,
        isRetrograde: true, // Ketu is always retrograde
      };
    } else {
      positions[name] = calcPlanetPosition(julianDay, id);
    }
  }

  // Rahu is also always retrograde
  if (positions.rahu) {
    positions.rahu.isRetrograde = true;
  }

  return positions;
}

/**
 * Get the KP ayanamsa value for a given Julian Day
 */
function getAyanamsa(julianDay) {
  return swisseph.swe_get_ayanamsa_ut(julianDay);
}

/**
 * Master function: calculate everything needed for Prashna Kundali
 */
function calculateChart(date, latitude, longitude) {
  const jd = dateToJulianDay(date);
  const houses = calcHouses(jd, latitude, longitude);
  const planets = getAllPlanetPositions(jd);
  const ayanamsa = getAyanamsa(jd);

  return {
    julianDay: jd,
    ayanamsa,
    ascendant: houses.ascendant,
    mc: houses.mc,
    houses: houses.houses,
    planets,
    date: date.toISOString(),
    latitude,
    longitude,
  };
}

module.exports = {
  dateToJulianDay,
  calcPlanetPosition,
  calcHouses,
  getAllPlanetPositions,
  getAyanamsa,
  calculateChart,
};
