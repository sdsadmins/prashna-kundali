const { PLANETS, DAY_LORDS, COMBUSTION_DEGREES } = require('../data/constants');
const { getNakshatraFromDegree, getSignFromDegree } = require('./nakshatra');

/**
 * Check if a planet is combust (too close to Sun)
 * @param {string} planetKey - planet name (mars, mercury, etc.)
 * @param {number} planetLongitude - sidereal longitude of planet
 * @param {number} sunLongitude - sidereal longitude of Sun
 * @param {boolean} isRetrograde - whether the planet is retrograde
 * @returns {boolean}
 */
function isCombust(planetKey, planetLongitude, sunLongitude, isRetrograde) {
  const combustion = COMBUSTION_DEGREES[planetKey];
  if (!combustion) return false; // Sun, Rahu, Ketu can't be combust

  const threshold = isRetrograde ? combustion.retrograde : combustion.direct;

  // Angular distance between planet and Sun
  let diff = Math.abs(planetLongitude - sunLongitude);
  if (diff > 180) diff = 360 - diff;

  return diff <= threshold;
}

/**
 * Resolve Rahu/Ketu's effective Ank value
 * They use the sign lord of their current position.
 * If that sign lord is retrograde or combust, skip (return null).
 */
function resolveRahuKetuAnk(nodeKey, planets) {
  const nodePos = planets[nodeKey];
  const signInfo = getSignFromDegree(nodePos.longitude);
  const signLordKey = signInfo.lord;
  const signLord = planets[signLordKey];

  // Check if sign lord is retrograde
  if (signLord.isRetrograde && signLordKey !== 'rahu' && signLordKey !== 'ketu') {
    return {
      skip: true,
      reason: 'retrograde',
      signLord: signLordKey,
      sign: signInfo.sign,
    };
  }

  // Check if sign lord is combust
  const sunPos = planets.sun;
  if (isCombust(signLordKey, signLord.longitude, sunPos.longitude, signLord.isRetrograde)) {
    return {
      skip: true,
      reason: 'combust',
      signLord: signLordKey,
      sign: signInfo.sign,
    };
  }

  // Sign lord is healthy — use its Ank
  return {
    skip: false,
    signLord: signLordKey,
    sign: signInfo.sign,
    ank: PLANETS[signLordKey].ank,
  };
}

/**
 * Calculate the 4 Ruling Planets for a Prashna Kundali
 * @param {object} chartData - from ephemeris.calculateChart()
 * @returns {object} - ruling planets with details
 */
function calculateRulingPlanets(chartData) {
  const { ascendant, planets } = chartData;
  const date = new Date(chartData.date);

  // 1. Lagna Sign Lord
  const lagnaSign = getSignFromDegree(ascendant);
  const lagnaSignLord = lagnaSign.lord;

  // 2. Star (Moon Nakshatra Lord) — "S" in LSRD
  const moonNakshatra = getNakshatraFromDegree(planets.moon.longitude);
  const moonNakshatraLord = moonNakshatra.lord;

  // Also compute lagna nakshatra for display purposes
  const lagnaNakshatra = getNakshatraFromDegree(ascendant);

  // 3. Rashi (Moon Sign Lord) — "R" in LSRD
  const moonSign = getSignFromDegree(planets.moon.longitude);
  const moonSignLord = moonSign.lord;

  // 4. Day Lord
  const dayIndex = date.getDay(); // 0=Sunday
  const dayLord = DAY_LORDS[dayIndex].lord;
  const dayInfo = DAY_LORDS[dayIndex];

  // Build ruling planets array with details
  const rulingPlanets = [
    {
      slot: 'lagnaSign',
      label: 'L',
      slotEn: 'Lagna Sign Lord',
      slotMr: 'लग्न राशी स्वामी',
      planetKey: lagnaSignLord,
      planet: PLANETS[lagnaSignLord],
      sign: lagnaSign.sign,
      degree: ascendant,
    },
    {
      slot: 'moonNakshatra',
      label: 'S',
      slotEn: 'Moon Nakshatra Lord',
      slotMr: 'चंद्र नक्षत्र स्वामी',
      planetKey: moonNakshatraLord,
      planet: PLANETS[moonNakshatraLord],
      nakshatra: moonNakshatra.nakshatra,
      pada: moonNakshatra.pada,
      degree: planets.moon.longitude,
    },
    {
      slot: 'moonSign',
      label: 'R',
      slotEn: 'Moon Sign Lord',
      slotMr: 'चंद्र राशी स्वामी',
      planetKey: moonSignLord,
      planet: PLANETS[moonSignLord],
      sign: moonSign.sign,
      moonDegree: planets.moon.longitude,
    },
    {
      slot: 'dayLord',
      label: 'D',
      slotEn: 'Day Lord',
      slotMr: 'वार स्वामी',
      planetKey: dayLord,
      planet: PLANETS[dayLord],
      day: dayInfo,
    },
  ];

  // Process each ruling planet: check retrograde, combustion, Rahu/Ketu resolution
  const processedPlanets = rulingPlanets.map((rp) => {
    const key = rp.planetKey;
    const planetPos = planets[key];

    // Rahu/Ketu: resolve using sign lord
    if (key === 'rahu' || key === 'ketu') {
      const resolution = resolveRahuKetuAnk(key, planets);
      return {
        ...rp,
        isRahuKetu: true,
        rahuKetuResolution: resolution,
        ank: resolution.skip ? 0 : resolution.ank,
        skipped: resolution.skip,
        skipReason: resolution.skip ? `${PLANETS[resolution.signLord].en} is ${resolution.reason}` : null,
      };
    }

    // Regular planets: check retrograde (only for Mars, Mercury, Jupiter, Venus, Saturn)
    // Day lord slot is not positional — don't check retrograde for it
    const canBeRetrograde = ['mars', 'mercury', 'jupiter', 'venus', 'saturn'].includes(key);
    const isRetro = canBeRetrograde && rp.slot !== 'dayLord' && planetPos && planetPos.isRetrograde;

    return {
      ...rp,
      isRahuKetu: false,
      isRetrograde: isRetro,
      ank: isRetro ? 0 : PLANETS[key].ank,
      skipped: isRetro,
      skipReason: isRetro ? `${PLANETS[key].en} is retrograde` : null,
    };
  });

  return {
    rulingPlanets: processedPlanets,
    details: {
      ascendant,
      lagnaSign: lagnaSign.sign,
      lagnaNakshatra: lagnaNakshatra.nakshatra,
      lagnaPada: lagnaNakshatra.pada,
      moonSign: moonSign.sign,
      moonDegree: planets.moon.longitude,
      day: dayInfo,
    },
  };
}

module.exports = {
  calculateRulingPlanets,
  isCombust,
  resolveRahuKetuAnk,
};
