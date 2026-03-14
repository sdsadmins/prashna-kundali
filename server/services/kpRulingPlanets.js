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

  // Check if Rahu/Ketu should be included as ruling planets.
  // Per KP Reader VI p.123: "If Rahu or Kethu were to occupy a sign then
  // Rahu and Kethu will act as an agent of the lord of the sign."
  // Per KP Reader VI p.167: "As Rahu is conjoined with Venus and Kethu
  // with Jupiter, take Rahu and Kethu also."
  // Two criteria (either satisfies):
  //   1. Node's sign lord is a ruling planet (sign representation)
  //   2. Node is conjoined (same sign) with a ruling planet (conjunction)
  const rahuKetuRepresentatives = [];
  // Two passes: first pass checks criteria 1 & 2, second pass catches
  // criterion 3 (7th aspect) which depends on the other node being added first.
  // Without two passes, if Rahu is checked before Ketu, Ketu's addition
  // can't retroactively trigger Rahu's 7th-aspect criterion.
  for (let pass = 0; pass < 2; pass++) {
    for (const node of ['rahu', 'ketu']) {
      if (planets[node] && !rulingPlanets.includes(node)) {
        const nodeSignIdx = Math.floor(((planets[node].longitude % 360) + 360) % 360 / 30);
        const nodeLord = SIGNS[nodeSignIdx].lord;

        // Criterion 1: sign lord is a ruling planet
        let shouldAdd = rulingPlanets.includes(nodeLord);
        let represents = nodeLord;

        // Criterion 2: conjoined with (same sign as) any ruling planet
        if (!shouldAdd) {
          for (const rp of rulingPlanets) {
            if (planets[rp]) {
              const rpSignIdx = Math.floor(((planets[rp].longitude % 360) + 360) % 360 / 30);
              if (rpSignIdx === nodeSignIdx) {
                shouldAdd = true;
                represents = rp;
                break;
              }
            }
          }
        }

        // Criterion 3: The opposite node is already added (7th aspect rule).
        // Per KP Reader VI p.187: "Kethu is aspected by Venus by its 7th aspect"
        // Since Rahu/Ketu are always 180° apart, an RP conjoined with one node
        // automatically aspects the other node by 7th aspect.
        if (!shouldAdd) {
          const otherNode = node === 'rahu' ? 'ketu' : 'rahu';
          if (rulingPlanets.includes(otherNode)) {
            shouldAdd = true;
            represents = otherNode + ' (7th aspect)';
          }
        }

        if (shouldAdd) {
          rahuKetuRepresentatives.push({ node, represents });
          rulingPlanets.push(node);
        }
      }
    }
  }

  // Filter: reject planets in constellation OR sub of retrograde planet
  // Per KP Reader VI p.274: "Those ruling planets which are deposited in the
  // constellation or sub of a retrograde planet will not read the result."
  const filtered = [];
  const rejected = [];
  for (const p of rulingPlanets) {
    if (!planets[p]) {
      filtered.push(p);
      continue;
    }
    const pDeg = planets[p].longitude;

    // Check constellation (nakshatra lord) of this ruling planet
    const nak = getNakshatraFromDegree(pDeg);
    const nakLord = nak.lord;
    const nakLordPlanet = planets[nakLord];
    // Rahu/Ketu are never retrograde per KP — don't penalize constellation of nodes
    const nakLordRetro = nakLordPlanet && nakLordPlanet.isRetrograde
      && nakLord !== 'rahu' && nakLord !== 'ketu';

    // Check sub-lord of this ruling planet
    const sub = getSubByDegree(pDeg);
    const subLordPlanet = planets[sub.subLord];
    const subLordRetro = subLordPlanet && subLordPlanet.isRetrograde
      && sub.subLord !== 'rahu' && sub.subLord !== 'ketu';

    if (nakLordRetro) {
      rejected.push({ planet: p, reason: 'In constellation of retrograde ' + nakLord });
    } else if (subLordRetro) {
      rejected.push({ planet: p, reason: 'In sub of retrograde ' + sub.subLord });
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
