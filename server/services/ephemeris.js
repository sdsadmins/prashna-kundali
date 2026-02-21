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
 * Calculate house cusps and ascendant (SIDEREAL using KP Ayanamsa)
 * swe_houses() returns TROPICAL values only — we must subtract the ayanamsa
 * to convert to sidereal coordinates.
 * Returns { ascendant, mc, houses[] }
 */
function calcHouses(julianDay, latitude, longitude) {
  // swe_houses always returns tropical — no sidereal flag support
  const result = swisseph.swe_houses(julianDay, latitude, longitude, 'P');

  if (result.error) {
    throw new Error(`Swiss Ephemeris houses error: ${result.error}`);
  }

  // Get KP ayanamsa and subtract from all tropical values to get sidereal
  const ayanamsa = swisseph.swe_get_ayanamsa_ut(julianDay);

  const toSidereal = (tropicalDeg) => {
    return ((tropicalDeg - ayanamsa) % 360 + 360) % 360;
  };

  return {
    ascendant: toSidereal(result.ascendant),
    mc: toSidereal(result.mc),
    houses: result.house.map(toSidereal),
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

/**
 * Calculate full lagna timing: when current lagna started, when it ends,
 * and what the next lagna will be.
 * Steps backward to find start, forward to find end.
 */
function calculateLagnaChangeTiming(date, latitude, longitude) {
  const NAKSHATRA_SPAN = 13 + 20 / 60; // 13°20'
  const STEP_SECONDS = 60; // 1-minute steps
  const MAX_STEPS = 300; // 5 hours max

  const jd = dateToJulianDay(date);
  const houses = calcHouses(jd, latitude, longitude);
  const currentAsc = ((houses.ascendant % 360) + 360) % 360;

  const currentSignIndex = Math.floor(currentAsc / 30);
  const currentNakIndex = Math.floor(currentAsc / NAKSHATRA_SPAN);

  // --- Step BACKWARD to find when current lagna sign started ---
  let lagnaStartTime = null;
  for (let step = 1; step <= MAX_STEPS; step++) {
    const pastDate = new Date(date.getTime() - step * STEP_SECONDS * 1000);
    const pastJd = dateToJulianDay(pastDate);
    const pastHouses = calcHouses(pastJd, latitude, longitude);
    const pastAsc = ((pastHouses.ascendant % 360) + 360) % 360;
    const pastSignIndex = Math.floor(pastAsc / 30);

    if (pastSignIndex !== currentSignIndex) {
      // The sign changed between pastDate and pastDate + 1 min
      lagnaStartTime = new Date(pastDate.getTime() + STEP_SECONDS * 1000);
      break;
    }
  }

  // --- Step FORWARD to find when current lagna sign ends ---
  let lagnaEndTime = null;
  let nextSignIndex = null;
  for (let step = 1; step <= MAX_STEPS; step++) {
    const futureDate = new Date(date.getTime() + step * STEP_SECONDS * 1000);
    const futureJd = dateToJulianDay(futureDate);
    const futureHouses = calcHouses(futureJd, latitude, longitude);
    const futureAsc = ((futureHouses.ascendant % 360) + 360) % 360;
    const futureSignIndex = Math.floor(futureAsc / 30);

    if (futureSignIndex !== currentSignIndex) {
      lagnaEndTime = futureDate;
      nextSignIndex = futureSignIndex;
      break;
    }
  }

  // --- Step FORWARD to find next nakshatra change ---
  let nextNakChangeTime = null;
  let nextNakIndex = null;
  for (let step = 1; step <= MAX_STEPS; step++) {
    const futureDate = new Date(date.getTime() + step * STEP_SECONDS * 1000);
    const futureJd = dateToJulianDay(futureDate);
    const futureHouses = calcHouses(futureJd, latitude, longitude);
    const futureAsc = ((futureHouses.ascendant % 360) + 360) % 360;
    const futureNakIndex = Math.floor(futureAsc / NAKSHATRA_SPAN);

    if (futureNakIndex !== currentNakIndex) {
      nextNakChangeTime = futureDate;
      nextNakIndex = futureNakIndex;
      break;
    }
  }

  // The earliest ruling-planet change is whichever comes first: sign or nakshatra
  let nextChange = null;
  let nextChangeType = null;
  if (lagnaEndTime && nextNakChangeTime) {
    if (lagnaEndTime <= nextNakChangeTime) {
      nextChange = lagnaEndTime;
      nextChangeType = 'sign';
    } else {
      nextChange = nextNakChangeTime;
      nextChangeType = 'nakshatra';
    }
  } else if (lagnaEndTime) {
    nextChange = lagnaEndTime;
    nextChangeType = 'sign';
  } else if (nextNakChangeTime) {
    nextChange = nextNakChangeTime;
    nextChangeType = 'nakshatra';
  }

  return {
    currentDegree: currentAsc,
    currentSignIndex,
    degreeInSign: currentAsc - currentSignIndex * 30,
    lagnaStartTime: lagnaStartTime ? lagnaStartTime.toISOString() : null,
    lagnaEndTime: lagnaEndTime ? lagnaEndTime.toISOString() : null,
    nextSignIndex,
    nextSignChangeMinutes: lagnaEndTime
      ? Math.round((lagnaEndTime.getTime() - date.getTime()) / 60000)
      : null,
    nextNakshatraChange: nextNakChangeTime ? nextNakChangeTime.toISOString() : null,
    nextNakshatraChangeIndex: nextNakIndex,
    nextNakshatraChangeMinutes: nextNakChangeTime
      ? Math.round((nextNakChangeTime.getTime() - date.getTime()) / 60000)
      : null,
    nextChange: nextChange ? nextChange.toISOString() : null,
    nextChangeType,
    nextChangeMinutes: nextChange
      ? Math.round((nextChange.getTime() - date.getTime()) / 60000)
      : null,
  };
}

module.exports = {
  dateToJulianDay,
  calcPlanetPosition,
  calcHouses,
  getAllPlanetPositions,
  getAyanamsa,
  calculateChart,
  calculateLagnaChangeTiming,
};
