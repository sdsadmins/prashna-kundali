/**
 * KP 5-Component Ruling Planets
 *
 * From KP Reader VI: ruling planets at the moment of judgment reveal
 * which planets are active and fruitful for the querist.
 *
 * 5 components (strongest to weakest):
 * 1. Day Lord
 * 2. Moon Star Lord (nakshatra lord of Moon)
 * 3. Moon Sign Lord (sign lord of Moon)
 * 4. Lagna Star Lord (nakshatra lord of Ascendant) — NEW vs existing LSRD
 * 5. Lagna Sign Lord (sign lord of Ascendant)
 */
const { getNakshatraFromDegree } = require('./nakshatra');
const { SIGNS, DAY_LORDS } = require('../data/constants');
const { getSubByDegree } = require('../data/kpSubTable');

/**
 * Calculate 5-component KP ruling planets.
 *
 * @param {number} ascendant - Sidereal ascendant degree
 * @param {Object} planets - Planet positions (need moon.longitude at minimum)
 * @param {Date} date - Judgment date/time (for day lord)
 * @returns {Object} Ruling planets with details
 */
function calculateKPRulingPlanets(ascendant, planets, date) {
  const moonDeg = planets.moon.longitude;
  const dayOfWeek = date.getDay(); // 0=Sunday

  // 5 components
  const dayLord = DAY_LORDS[dayOfWeek].lord;
  const moonNak = getNakshatraFromDegree(moonDeg);
  const moonStarLord = moonNak.lord;
  const moonSignIndex = Math.floor(((moonDeg % 360) + 360) % 360 / 30);
  const moonSignLord = SIGNS[moonSignIndex].lord;
  const lagNak = getNakshatraFromDegree(ascendant);
  const lagnaStarLord = lagNak.lord;
  const lagnaSignIndex = Math.floor(((ascendant % 360) + 360) % 360 / 30);
  const lagnaSignLord = SIGNS[lagnaSignIndex].lord;

  const components = {
    dayLord: { planet: dayLord, source: 'Day Lord' },
    moonStarLord: { planet: moonStarLord, source: 'Moon Star Lord (' + moonNak.nakshatra.en + ')' },
    moonSignLord: { planet: moonSignLord, source: 'Moon Sign Lord (' + SIGNS[moonSignIndex].en + ')' },
    lagnaStarLord: { planet: lagnaStarLord, source: 'Lagna Star Lord (' + lagNak.nakshatra.en + ')' },
    lagnaSignLord: { planet: lagnaSignLord, source: 'Lagna Sign Lord (' + SIGNS[lagnaSignIndex].en + ')' },
  };

  // Collect unique ruling planets
  const seen = new Set();
  const rulingPlanets = [];
  for (const key of ['dayLord', 'moonStarLord', 'moonSignLord', 'lagnaStarLord', 'lagnaSignLord']) {
    const p = components[key].planet;
    if (!seen.has(p)) {
      seen.add(p);
      rulingPlanets.push(p);
    }
  }

  // Check if Rahu/Ketu represent any ruling planet (by occupying their sign)
  const rahuKetuRepresentatives = [];
  for (const node of ['rahu', 'ketu']) {
    if (planets[node]) {
      const nodeSignIdx = Math.floor(((planets[node].longitude % 360) + 360) % 360 / 30);
      const nodeLord = SIGNS[nodeSignIdx].lord;
      if (rulingPlanets.includes(nodeLord) && !rulingPlanets.includes(node)) {
        rahuKetuRepresentatives.push({ node, represents: nodeLord });
        rulingPlanets.push(node);
      }
    }
  }

  // Filter: reject planets in sub of retrograde planet
  const filtered = [];
  const rejected = [];
  for (const p of rulingPlanets) {
    if (!planets[p]) {
      filtered.push(p);
      continue;
    }
    const sub = getSubByDegree(planets[p].longitude);
    const subLordPlanet = planets[sub.subLord];
    if (subLordPlanet && subLordPlanet.isRetrograde) {
      rejected.push({ planet: p, reason: 'Sub-lord ' + sub.subLord + ' is retrograde' });
    } else {
      filtered.push(p);
    }
  }

  return {
    components,
    all: rulingPlanets,
    filtered,
    rejected,
    rahuKetuRepresentatives,
  };
}

module.exports = {
  calculateKPRulingPlanets,
};
