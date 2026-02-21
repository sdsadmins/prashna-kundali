const { NAKSHATRAS, SIGNS } = require('../data/constants');

const NAKSHATRA_SPAN = 13 + 20 / 60; // 13°20' = 13.3333°

/**
 * Get nakshatra from sidereal longitude (0-360°)
 * Returns { nakshatra, lord, pada }
 */
function getNakshatraFromDegree(siderealDegree) {
  // Normalize to 0-360
  const deg = ((siderealDegree % 360) + 360) % 360;

  const nakshatraIndex = Math.floor(deg / NAKSHATRA_SPAN);
  const nakshatra = NAKSHATRAS[nakshatraIndex];

  // Each nakshatra has 4 padas, each spanning 3°20'
  const posInNakshatra = deg - (nakshatraIndex * NAKSHATRA_SPAN);
  const pada = Math.floor(posInNakshatra / (NAKSHATRA_SPAN / 4)) + 1;

  return {
    nakshatra,
    lord: nakshatra.lord,
    pada: Math.min(pada, 4),
    degree: deg,
  };
}

/**
 * Get zodiac sign from sidereal longitude (0-360°)
 * Returns { sign, lord, degreeInSign }
 */
function getSignFromDegree(siderealDegree) {
  const deg = ((siderealDegree % 360) + 360) % 360;
  const signIndex = Math.floor(deg / 30);
  const sign = SIGNS[signIndex];

  return {
    sign,
    lord: sign.lord,
    degreeInSign: deg - (signIndex * 30),
  };
}

module.exports = {
  getNakshatraFromDegree,
  getSignFromDegree,
  NAKSHATRA_SPAN,
};
