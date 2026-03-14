/**
 * KP Event Timing Calculator — Krishnamurti Method (KP Reader VI)
 *
 * Algorithm:
 * 1. Use 5-component ruling planets (Day Lord, Moon Star Lord, Moon Sign Lord,
 *    Lagna Star Lord, Lagna Sign Lord)
 * 2. Find zodiac positions where sign lord, star lord AND sub lord are ALL
 *    ruling planets → narrow target degree ranges
 * 3. Sun transit to those ranges → determines the MONTH
 * 4. Moon transit to ruling-planet-governed positions + matching day lord
 *    → determines the exact DAY
 * 5. Day of week matching a ruling planet → confirms the date
 * 6. Dasha analysis: house signification, RP match, fruitful significators
 * 7. Transit-Dasha intersection for highest-confidence predictions
 *
 * Reference: K.S. Krishnamurti, "KP Reader VI", Section IV — Timing
 */
const { calcPlanetPosition, dateToJulianDay, getAyanamsa, calcTropicalAscendant } = require('./ephemeris');
const { KP_SUB_TABLE } = require('../data/kpSubTable');
const { SIGNS, DAY_LORDS, VIMSHOTTARI_ORDER, VIMSHOTTARI_YEARS } = require('../data/constants');
const { getQuestionHouses } = require('../data/kpQuestionHouses');
const { getHousesSignifiedByPlanet } = require('./kpSignificators');
const { calculateSubPeriods } = require('./kpDasha');

// Map planet name to the day-of-week index (0=Sunday ... 6=Saturday)
const PLANET_TO_DAY = {};
DAY_LORDS.forEach(d => { PLANET_TO_DAY[d.lord] = d.day; });

// Map Rahu/Ketu to their sign lord given their sidereal longitude
function resolveNode(planet, planets) {
  if (planet === 'rahu' || planet === 'ketu') {
    if (planets && planets[planet]) {
      const deg = planets[planet].longitude;
      const signIdx = Math.floor(((deg % 360) + 360) % 360 / 30);
      return SIGNS[signIdx].lord;
    }
    return planet;
  }
  return planet;
}

/**
 * Build the set of ruling planet names, resolving Rahu/Ketu to their sign lords
 * for matching purposes, but keeping originals too.
 */
function buildRulingSet(rulingPlanets, planets, rejectedPlanets) {
  const rejected = new Set(rejectedPlanets || []);
  const set = new Set();
  for (const rp of rulingPlanets) {
    set.add(rp);
    const resolved = resolveNode(rp, planets);
    // Don't re-introduce planets that were explicitly rejected from ruling planets
    if (resolved !== rp && !rejected.has(resolved)) set.add(resolved);
  }
  return set;
}

/**
 * Check if a planet is "in" the ruling set.
 */
function isRulingPlanet(planet, rulingSet) {
  return rulingSet.has(planet);
}

/**
 * Find target degree ranges where sign lord, star lord, AND sub lord
 * are ALL ruling planets (strict triple match).
 */
function findTargetPositions(rulingPlanets, planets, rejectedPlanets) {
  const rulingSet = buildRulingSet(rulingPlanets, planets, rejectedPlanets);
  const positions = [];

  for (const entry of KP_SUB_TABLE) {
    const signLordMatch = rulingSet.has(entry.signLord);
    const starLordMatch = rulingSet.has(entry.starLord);
    const subLordMatch = rulingSet.has(entry.subLord);

    if (signLordMatch && starLordMatch && subLordMatch) {
      positions.push({
        number: entry.number,
        startDeg: entry.startDeg,
        endDeg: entry.endDeg,
        sign: entry.sign.en,
        signLord: entry.signLord,
        starLord: entry.starLord,
        subLord: entry.subLord,
      });
    }
  }

  return positions;
}

/**
 * Find "relaxed" target positions where at least sign lord AND star lord
 * are ruling planets (sub lord may differ). Used as fallback.
 */
function findRelaxedPositions(rulingPlanets, planets, rejectedPlanets) {
  const rulingSet = buildRulingSet(rulingPlanets, planets, rejectedPlanets);
  const positions = [];

  for (const entry of KP_SUB_TABLE) {
    const signLordMatch = rulingSet.has(entry.signLord);
    const starLordMatch = rulingSet.has(entry.starLord);

    if (signLordMatch && starLordMatch) {
      positions.push({
        number: entry.number,
        startDeg: entry.startDeg,
        endDeg: entry.endDeg,
        sign: entry.sign.en,
        signLord: entry.signLord,
        starLord: entry.starLord,
        subLord: entry.subLord,
      });
    }
  }

  return positions;
}

/**
 * Find star+sub match positions (any sign) — star lord AND sub lord are RPs.
 * This is the middle ground between strict (all 3) and relaxed (sign+star only).
 */
function findStarSubPositions(rulingPlanets, planets, rejectedPlanets) {
  const rulingSet = buildRulingSet(rulingPlanets, planets, rejectedPlanets);
  const positions = [];

  for (const entry of KP_SUB_TABLE) {
    const starLordMatch = rulingSet.has(entry.starLord);
    const subLordMatch = rulingSet.has(entry.subLord);

    if (starLordMatch && subLordMatch) {
      positions.push({
        number: entry.number,
        startDeg: entry.startDeg,
        endDeg: entry.endDeg,
        sign: entry.sign.en,
        signLord: entry.signLord,
        starLord: entry.starLord,
        subLord: entry.subLord,
      });
    }
  }

  return positions;
}

/**
 * Find star-only match positions — only star lord is RP.
 * Book's "Sun transits constellation of ruling planet" method.
 */
function findStarOnlyPositions(rulingPlanets, planets, rejectedPlanets) {
  const rulingSet = buildRulingSet(rulingPlanets, planets, rejectedPlanets);
  const positions = [];

  for (const entry of KP_SUB_TABLE) {
    if (rulingSet.has(entry.starLord)) {
      positions.push({
        number: entry.number,
        startDeg: entry.startDeg,
        endDeg: entry.endDeg,
        sign: entry.sign.en,
        signLord: entry.signLord,
        starLord: entry.starLord,
        subLord: entry.subLord,
      });
    }
  }

  return positions;
}

/**
 * Find planets that signify favorable houses AND are ruling planets.
 * These are the book's "common planets" — strongest timing indicators.
 */
function findCommonPlanets(significators, questionCategory, rulingPlanets, planets, rejectedPlanets) {
  const qHouses = getQuestionHouses(questionCategory);
  const favorable = new Set(qHouses.favorable);
  const rulingSet = buildRulingSet(rulingPlanets, planets, rejectedPlanets);

  const common = [];
  const allPlanets = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];

  for (const planet of allPlanets) {
    // Check if planet is a ruling planet (or resolves to one)
    let isRP = rulingSet.has(planet);
    if (!isRP && (planet === 'rahu' || planet === 'ketu')) {
      const resolved = resolveNode(planet, planets);
      isRP = rulingSet.has(resolved);
    }
    if (!isRP) continue;

    // Check if planet signifies any favorable house
    const housesSignified = getHousesSignifiedByPlanet(planet, significators);
    const favHouses = housesSignified.filter(h => favorable.has(h.house));
    if (favHouses.length > 0) {
      common.push({
        planet,
        favorableHouses: favHouses.map(h => h.house),
        levels: favHouses.map(h => `${h.house}${h.level}`),
      });
    }
  }

  return common;
}

/**
 * Build significator-based target scores for each KP sub entry.
 * Scores how well a sub entry's lords (sign, star, sub) signify favorable houses.
 * Since significators depend on Placidus cusps (which vary per horary number),
 * these scores differentiate predictions across horary numbers.
 *
 * @returns {Map<number, number>} sub entry number → significator score
 */
function buildSignificatorTargetScores(significators, questionCategory, targetPositions) {
  const qHouses = getQuestionHouses(questionCategory);
  const favorable = new Set(qHouses.favorable);
  const unfavorable = new Set(qHouses.unfavorable);
  const scores = new Map();

  // Build a cache: planet → count of favorable houses it signifies (weighted by level)
  const planetFavScore = {};
  const allPlanets = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
  for (const planet of allPlanets) {
    let score = 0;
    const houses = getHousesSignifiedByPlanet(planet, significators);
    for (const { house, level } of houses) {
      if (favorable.has(house)) {
        // Level A (strongest) → 4, B → 3, C → 2, D → 1
        score += level === 'A' ? 4 : level === 'B' ? 3 : level === 'C' ? 2 : 1;
      }
      if (unfavorable.has(house)) {
        score -= level === 'A' ? 3 : level === 'B' ? 2 : level === 'C' ? 1 : 0.5;
      }
    }
    planetFavScore[planet] = score;
  }

  for (const entry of targetPositions) {
    const signScore = planetFavScore[entry.signLord] || 0;
    const starScore = planetFavScore[entry.starLord] || 0;
    const subScore = planetFavScore[entry.subLord] || 0;
    // Star lord and sub lord carry more weight (per KP methodology)
    const total = signScore * 0.5 + starScore * 1.0 + subScore * 1.5;
    if (total !== 0) {
      scores.set(entry.number, Math.round(total * 3)); // Scale to meaningful bonus range
    }
  }

  return scores;
}

/**
 * Find when a retrograde planet turns direct (direct station).
 * Binary-searches forward from startJd until isRetrograde flips from true to false.
 * Only meaningful for Mars, Mercury, Jupiter, Venus, Saturn.
 *
 * @returns {{ jd: number, date: string }} or null if not found within maxDays
 */
function findDirectStationDate(planetName, startJd, maxDays = 365) {
  const RETRO_PLANETS = new Set(['mars', 'mercury', 'jupiter', 'venus', 'saturn']);
  if (!RETRO_PLANETS.has(planetName)) return null;

  const startPos = calcPlanetPosition(startJd, planetName);
  if (!startPos.isRetrograde) return null; // Already direct

  // Coarse search: step 1 day to find when retrograde → direct
  let prevJd = startJd;
  for (let d = 1; d <= maxDays; d++) {
    const testJd = startJd + d;
    const pos = calcPlanetPosition(testJd, planetName);
    if (!pos.isRetrograde) {
      // Binary search between prevJd and testJd for precision (~0.001 day ≈ 1.4 min)
      let lo = prevJd, hi = testJd;
      while (hi - lo > 0.001) {
        const mid = (lo + hi) / 2;
        const midPos = calcPlanetPosition(mid, planetName);
        if (midPos.isRetrograde) lo = mid;
        else hi = mid;
      }
      const directJd = Math.ceil(hi); // Round up to next day
      return {
        jd: hi,
        date: julianDayToDate(directJd).toISOString().split('T')[0],
      };
    }
    prevJd = testJd;
  }
  return null;
}

/**
 * Find fast planet transits (Mars/Mercury/Venus) through target positions.
 * Returns dates when the planet's sidereal longitude falls in a target range.
 *
 * @returns {Array<{date, jd, degree, targetRange, planet}>}
 */
function findFastPlanetTransits(planetName, startJd, targetPositions, maxDays = 730) {
  if (!targetPositions || targetPositions.length === 0) return [];

  // Step sizes tuned to planet speed: Mercury fastest (~4°/day), Mars slowest (~0.5°/day)
  const stepMap = { mars: 1, mercury: 0.25, venus: 0.5 };
  const step = stepMap[planetName] || 0.5;
  const results = [];
  const seenDates = new Set();

  for (let d = 0; d <= maxDays; d += step) {
    const testJd = startJd + d;
    const pos = calcPlanetPosition(testJd, planetName);
    const match = isInRanges(pos.longitude, targetPositions);
    if (match) {
      const dateStr = julianDayToDate(testJd).toISOString().split('T')[0];
      if (!seenDates.has(dateStr)) {
        seenDates.add(dateStr);
        results.push({
          date: dateStr,
          dateObj: julianDayToDate(testJd),
          jd: testJd,
          degree: pos.longitude,
          targetRange: match,
          planet: planetName,
        });
        if (results.length >= 30) break;
      }
      // Skip past this range
      while (d <= maxDays) {
        d += step;
        const np = calcPlanetPosition(startJd + d, planetName);
        if (!isInRanges(np.longitude, [match])) break;
      }
      d -= step;
    }
  }
  return results;
}

/**
 * Find the time on a given date when a sidereal degree rises on the ascendant.
 * Uses the ascendant formula with iterative search across the day.
 *
 * @param {number} targetDegSidereal - The sidereal degree to watch for
 * @param {string} dateStr - The date (YYYY-MM-DD)
 * @param {number} latitude - Observer latitude
 * @param {number} longitude - Observer longitude
 * @returns {{ time: string, utcHours: number }} or null
 */
function findLagnaRisingTime(targetDegSidereal, dateStr, latitude, longitude) {
  if (!latitude || !longitude) return null;

  const baseDate = new Date(dateStr + 'T00:00:00Z');
  const baseJd = dateToJulianDay(baseDate);
  const ayanamsa = getAyanamsa(baseJd);

  // Step through the day in 10-minute increments to find crossing
  const stepMinutes = 10;
  const stepsPerDay = Math.ceil(1440 / stepMinutes);
  let prevAsc = null;
  let crossingJd = null;

  for (let i = 0; i <= stepsPerDay; i++) {
    const jd = baseJd + (i * stepMinutes) / 1440;
    const trop = calcTropicalAscendant(jd, latitude, longitude);
    const sidAsc = ((trop.ascendant - ayanamsa) % 360 + 360) % 360;

    if (prevAsc !== null) {
      // Check if targetDeg was crossed (handle 360→0 wrap)
      let crossed = false;
      if (prevAsc <= targetDegSidereal && sidAsc >= targetDegSidereal) crossed = true;
      if (prevAsc > 350 && sidAsc < 10 && targetDegSidereal > prevAsc) crossed = true;
      if (prevAsc > 350 && sidAsc < 10 && targetDegSidereal < sidAsc) crossed = true;

      if (crossed) {
        // Binary search for precision within this 10-minute window
        let lo = baseJd + ((i - 1) * stepMinutes) / 1440;
        let hi = jd;
        for (let iter = 0; iter < 15; iter++) { // ~0.4 second precision
          const mid = (lo + hi) / 2;
          const midTrop = calcTropicalAscendant(mid, latitude, longitude);
          const midSid = ((midTrop.ascendant - ayanamsa) % 360 + 360) % 360;
          // Determine which half contains the crossing
          const midDist = ((targetDegSidereal - midSid) % 360 + 360) % 360;
          if (midDist < 180 && midDist > 0) lo = mid;
          else hi = mid;
        }
        crossingJd = (lo + hi) / 2;
        break;
      }
    }
    prevAsc = sidAsc;
  }

  if (!crossingJd) return null;

  // Convert JD to UTC hours
  const utcHours = (crossingJd - baseJd) * 24;
  const hours = Math.floor(utcHours);
  const minutes = Math.round((utcHours - hours) * 60);

  // Convert to IST (UTC+5:30) for display
  const istHours = utcHours + 5.5;
  const istH = Math.floor(((istHours % 24) + 24) % 24);
  const istM = Math.round((istHours - Math.floor(istHours)) * 60);

  return {
    utcTime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} UTC`,
    istTime: `${String(istH).padStart(2, '0')}:${String(istM % 60).padStart(2, '0')} IST`,
    utcHours,
  };
}

/**
 * Convert Julian Day to JS Date
 */
function julianDayToDate(jd) {
  const ms = (jd - 2440587.5) * 86400000;
  return new Date(ms);
}

/**
 * Get day-of-week index (0=Sunday) from Julian Day
 */
function jdToDayOfWeek(jd) {
  return Math.floor(jd + 1.5) % 7;
}

/**
 * Check if a degree falls within any of the given ranges.
 */
function isInRanges(deg, ranges) {
  const d = ((deg % 360) + 360) % 360;
  for (const r of ranges) {
    if (d >= r.startDeg - 1e-10 && d < r.endDeg + 1e-10) {
      return r;
    }
  }
  return null;
}

/**
 * Find when the Sun transits into target degree ranges.
 * Sun moves ~1 deg/day, so stepping 1 day at a time catches most ranges.
 * After the main pass, narrow sub ranges (< 1.2°) that were missed get
 * a targeted half-day re-check to avoid skipping them entirely.
 */
function findSunTransit(startJd, targetPositions, maxDays = 1095) {
  const results = [];
  const foundRanges = new Set(); // Track which target ranges were hit

  for (let day = 1; day <= maxDays; day++) {
    const jd = startJd + day;
    const pos = calcPlanetPosition(jd, 'sun');
    const deg = pos.longitude;

    const match = isInRanges(deg, targetPositions);
    if (match) {
      foundRanges.add(match.number);
      const date = julianDayToDate(jd);
      results.push({
        date: date.toISOString().split('T')[0],
        dateObj: date,
        jd,
        degree: deg,
        targetRange: match,
        dayOfWeek: jdToDayOfWeek(jd),
      });
      // Skip past this range
      while (day <= maxDays) {
        day++;
        const nextPos = calcPlanetPosition(startJd + day, 'sun');
        if (!isInRanges(nextPos.longitude, [match])) break;
      }
      day--;
      if (results.length >= 90) break;
    }
  }

  // Second pass: find narrow sub ranges (< 1.2°) that were missed by 1-day stepping.
  // Sun moves ~1°/day; subs narrower than ~1° can be skipped entirely between two
  // whole-day checks. We re-check at half-day offsets for ALL annual occurrences.
  const narrowTargets = targetPositions.filter(tp =>
    (tp.endDeg - tp.startDeg) < 1.2
  );
  if (narrowTargets.length > 0 && results.length < 90) {
    const foundDates = new Set(results.map(r => r.date)); // avoid date duplicates
    for (let day = 0.5; day <= maxDays; day += 1) {
      const jd = startJd + day;
      const pos = calcPlanetPosition(jd, 'sun');
      const match = isInRanges(pos.longitude, narrowTargets);
      if (match) {
        const wholeJd = Math.round(jd);
        const date = julianDayToDate(wholeJd);
        const dateStr = date.toISOString().split('T')[0];
        if (!foundDates.has(dateStr)) {
          foundDates.add(dateStr);
          results.push({
            date: dateStr,
            dateObj: date,
            jd: wholeJd,
            degree: pos.longitude,
            targetRange: match,
            dayOfWeek: jdToDayOfWeek(wholeJd),
          });
          if (results.length >= 90) break;
        }
      }
    }
    // Re-sort by date
    results.sort((a, b) => a.jd - b.jd);
  }

  return results;
}

/**
 * Find Moon transit dates within a date range where:
 * 1. Moon is in a ruling-planet-governed position
 * 2. Day of week matches a ruling planet
 *
 * Moon moves ~13 deg/day, so step 0.25 days (6 hours).
 */
function findMoonTransitDates(startJd, endJd, targetPositions, relaxedPositions, rulingPlanets) {
  const rulingDays = new Set();
  for (const rp of rulingPlanets) {
    if (PLANET_TO_DAY[rp] !== undefined) {
      rulingDays.add(PLANET_TO_DAY[rp]);
    }
  }

  const results = [];
  const seenDates = new Set();
  const step = 0.25;

  for (let jd = startJd; jd <= endJd; jd += step) {
    const pos = calcPlanetPosition(jd, 'moon');
    const deg = pos.longitude;
    const dayOfWeek = jdToDayOfWeek(jd);
    const dateStr = julianDayToDate(jd).toISOString().split('T')[0];

    if (seenDates.has(dateStr)) continue;

    // Check strict match first (sign+star+sub all ruling)
    let match = isInRanges(deg, targetPositions);
    let matchType = 'strict';

    // If no strict match, try relaxed (sign+star ruling)
    if (!match) {
      match = isInRanges(deg, relaxedPositions);
      matchType = 'relaxed';
    }

    if (match && rulingDays.has(dayOfWeek)) {
      seenDates.add(dateStr);
      const dayName = DAY_LORDS[dayOfWeek].en;
      results.push({
        date: dateStr,
        dateObj: julianDayToDate(jd),
        jd,
        degree: deg,
        targetRange: match,
        dayOfWeek,
        dayName,
        matchType,
        confidence: matchType === 'strict' ? 'high' : 'medium',
      });
    }
  }

  return results;
}

/**
 * Find Dasha-based timing — when will a future Bhukti/Anthra period
 * whose lord signifies favorable houses for the question category begin?
 *
 * KP principle: event fructifies when Dasha lord, Bhukti lord, AND Anthra lord
 * are all significators of favorable houses for the question.
 */
function findDashaTiming(dashaBalance, significators, questionCategory, judgmentDate, rulingPlanets, planets) {
  if (!dashaBalance || !significators || !questionCategory) return null;

  const qHouses = getQuestionHouses(questionCategory);
  const favorable = new Set(qHouses.favorable);
  const primaryCusp = qHouses.primaryCusp;
  const now = judgmentDate.getTime();
  const rpSet = rulingPlanets && planets ? buildRulingSet(rulingPlanets, planets) : null;

  // Check if a planet signifies any favorable house
  function signifiesFavorable(planet) {
    const housesSignified = getHousesSignifiedByPlanet(planet, significators);
    return housesSignified.some(h => favorable.has(h.house));
  }

  // Score: how many favorable houses does a planet signify (weighted by level)
  function favorableScore(planet) {
    const housesSignified = getHousesSignifiedByPlanet(planet, significators);
    let score = 0;
    for (const h of housesSignified) {
      if (favorable.has(h.house)) {
        score += h.level === 'A' ? 4 : h.level === 'B' ? 3 : h.level === 'C' ? 2 : 1;
      }
    }
    return score;
  }

  // Check if planet signifies the primary cusp
  function signifiesPrimaryCusp(planet) {
    const housesSignified = getHousesSignifiedByPlanet(planet, significators);
    return housesSignified.some(h => h.house === primaryCusp);
  }

  // Check if planet is both RP and signifier (fruitful)
  function isFruitfulSignificator(planet) {
    if (!rpSet) return false;
    let isRP = rpSet.has(planet);
    if (!isRP && (planet === 'rahu' || planet === 'ketu')) {
      const resolved = resolveNode(planet, planets);
      isRP = rpSet.has(resolved);
    }
    return isRP && signifiesFavorable(planet);
  }

  const mahaDashaLord = dashaBalance.mahaDasha.lord;
  const mahaIsFavorable = signifiesFavorable(mahaDashaLord);

  // Helper: search a list of bhuktis for favorable periods
  function searchBhuktis(bhuktis, mahaLord, mahaFav) {
    const results = [];
    for (const bhukti of bhuktis) {
      const bEnd = new Date(bhukti.endDate).getTime();
      if (bEnd <= now) continue;

      const bhuktiFavorable = signifiesFavorable(bhukti.lord);
      if (!bhuktiFavorable) continue;

      const bStart = new Date(bhukti.startDate).getTime();
      const periodStart = Math.max(bStart, now);
      const confidence = mahaFav ? 'high' : 'medium';
      let baseScore = (mahaFav ? favorableScore(mahaLord) : 0) + favorableScore(bhukti.lord);

      // Primary cusp bonus for bhukti lord
      if (signifiesPrimaryCusp(bhukti.lord)) baseScore += 15;

      // Fruitful significator bonus for bhukti lord
      if (isFruitfulSignificator(bhukti.lord)) baseScore += 3;

      // Drill into Anthras if available (pre-computed for bhuktis within 3 years)
      if (bhukti.anthras) {
        for (const anthra of bhukti.anthras) {
          const aEnd = new Date(anthra.endDate).getTime();
          if (aEnd <= now) continue;
          if (signifiesFavorable(anthra.lord)) {
            const aStart = new Date(anthra.startDate).getTime();
            let anthraScore = baseScore + favorableScore(anthra.lord);

            // Primary cusp bonus for anthra lord
            if (signifiesPrimaryCusp(anthra.lord)) anthraScore += 5;

            // Fruitful significator bonus for anthra lord
            if (isFruitfulSignificator(anthra.lord)) anthraScore += 3;

            results.push({
              date: new Date(Math.max(aStart, now)).toISOString().split('T')[0],
              endDate: new Date(aEnd).toISOString().split('T')[0],
              mahaDasha: mahaLord,
              bhukti: bhukti.lord,
              anthra: anthra.lord,
              confidence,
              score: anthraScore,
              method: 'dasha-anthra',
              description: `${mahaLord}-${bhukti.lord}-${anthra.lord} Dasha period`,
            });
          }
        }
      }

      // Bhukti-level match as fallback
      if (results.length === 0) {
        results.push({
          date: new Date(periodStart).toISOString().split('T')[0],
          endDate: bhukti.endDate.split('T')[0],
          mahaDasha: mahaLord,
          bhukti: bhukti.lord,
          anthra: null,
          confidence,
          score: baseScore,
          method: 'dasha-bhukti',
          description: `${mahaLord}-${bhukti.lord} Dasha period`,
        });
      }
    }
    return results;
  }

  const bhuktis = dashaBalance.bhuktis || [];
  let results = searchBhuktis(bhuktis, mahaDashaLord, mahaIsFavorable);

  // Also search the NEXT Maha Dasha's Bhuktis for long-range predictions
  // (Ex.5 Vehicle needs ~6yr range — current maha may not cover it)
  const nextMahaLord = VIMSHOTTARI_ORDER[
    (VIMSHOTTARI_ORDER.indexOf(mahaDashaLord) + 1) % 9
  ];
  const nextMahaYears = VIMSHOTTARI_YEARS[nextMahaLord];
  const nextMahaStart = new Date(dashaBalance.mahaDasha.endDate);
  const nextBhuktis = calculateSubPeriods(nextMahaLord, nextMahaStart, nextMahaYears);
  // Pre-compute anthras for all next maha's bhuktis
  for (const bhukti of nextBhuktis) {
    bhukti.anthras = calculateSubPeriods(bhukti.lord, new Date(bhukti.startDate), bhukti.durationYears);
  }
  const nextMahaFavorable = signifiesFavorable(nextMahaLord);
  const nextResults = searchBhuktis(nextBhuktis, nextMahaLord, nextMahaFavorable);
  results = results.concat(nextResults);

  // Sort: deprioritize nearly-expired periods, then by score, then by date
  const minUsefulEndMs = judgmentDate.getTime() + 14 * 86400000;
  results.sort((a, b) => {
    const aExpiring = new Date(a.endDate).getTime() < minUsefulEndMs;
    const bExpiring = new Date(b.endDate).getTime() < minUsefulEndMs;
    if (aExpiring !== bExpiring) return aExpiring ? 1 : -1;
    return b.score - a.score || new Date(a.date) - new Date(b.date);
  });

  return {
    periods: results.slice(0, 10),
    best: results.length > 0 ? results[0] : null,
    mahaDashaFavorable: mahaIsFavorable,
  };
}

/**
 * Find D/B/A periods where lords ARE ruling planets.
 * Uses bidirectional Rahu/Ketu resolution.
 */
function findRulingPlanetDashaPeriods(dashaBalance, rulingPlanets, judgmentDate, planets) {
  if (!dashaBalance || !rulingPlanets) return [];

  const rpSet = buildRulingSet(rulingPlanets, planets);
  const now = judgmentDate.getTime();

  function isLordRP(lord) {
    if (rpSet.has(lord)) return true;
    // Bidirectional Rahu/Ketu resolution
    if (lord === 'rahu' || lord === 'ketu') {
      const resolved = resolveNode(lord, planets);
      return rpSet.has(resolved);
    }
    return false;
  }

  const results = [];

  function searchBhuktis(bhuktis, mahaLord) {
    const mahaIsRP = isLordRP(mahaLord);
    for (const bhukti of bhuktis) {
      const bEnd = new Date(bhukti.endDate).getTime();
      if (bEnd <= now) continue;

      const bhuktiIsRP = isLordRP(bhukti.lord);
      if (!bhuktiIsRP) continue;

      // Compute anthras on-demand if not pre-computed
      const anthras = bhukti.anthras || calculateSubPeriods(bhukti.lord, new Date(bhukti.startDate), bhukti.durationYears);

      for (const anthra of anthras) {
        const aEnd = new Date(anthra.endDate).getTime();
        if (aEnd <= now) continue;
        const aStart = new Date(anthra.startDate).getTime();

        const anthraIsRP = isLordRP(anthra.lord);
        const matchCount = (mahaIsRP ? 1 : 0) + 1 + (anthraIsRP ? 1 : 0); // bhukti always RP here
        if (matchCount < 2) continue;

        const score = matchCount === 3 ? 15 : 10;
        results.push({
          date: new Date(Math.max(aStart, now)).toISOString().split('T')[0],
          endDate: new Date(aEnd).toISOString().split('T')[0],
          mahaDasha: mahaLord,
          bhukti: bhukti.lord,
          anthra: anthra.lord,
          score,
          rpMatchCount: matchCount,
          method: 'dasha-rp',
          description: `${mahaLord}-${bhukti.lord}-${anthra.lord} (${matchCount}/3 RP)`,
        });
      }
    }
  }

  // Search current maha dasha
  const mahaDashaLord = dashaBalance.mahaDasha.lord;
  searchBhuktis(dashaBalance.bhuktis || [], mahaDashaLord);

  // Also search next maha dasha for long-range predictions
  {
    const nextMahaLord = VIMSHOTTARI_ORDER[
      (VIMSHOTTARI_ORDER.indexOf(mahaDashaLord) + 1) % 9
    ];
    const nextMahaYears = VIMSHOTTARI_YEARS[nextMahaLord];
    const nextMahaStart = new Date(dashaBalance.mahaDasha.endDate);
    const nextBhuktis = calculateSubPeriods(nextMahaLord, nextMahaStart, nextMahaYears);
    for (const bhukti of nextBhuktis) {
      bhukti.anthras = calculateSubPeriods(bhukti.lord, new Date(bhukti.startDate), bhukti.durationYears);
    }
    searchBhuktis(nextBhuktis, nextMahaLord);
  }

  results.sort((a, b) => b.score - a.score || new Date(a.date) - new Date(b.date));
  return results;
}

/**
 * Find D/B/A periods where lords are BOTH house significators AND ruling planets (fruitful).
 */
function findFruitfulDashaPeriods(dashaBalance, significators, questionCategory, rulingPlanets, judgmentDate, planets) {
  if (!dashaBalance || !significators || !questionCategory || !rulingPlanets) return [];

  const qHouses = getQuestionHouses(questionCategory);
  const favorable = new Set(qHouses.favorable);
  const rpSet = buildRulingSet(rulingPlanets, planets);
  const now = judgmentDate.getTime();

  // Identify fruitful planets: signify favorable houses AND are RPs
  function isFruitful(planet) {
    let isRP = rpSet.has(planet);
    if (!isRP && (planet === 'rahu' || planet === 'ketu')) {
      const resolved = resolveNode(planet, planets);
      isRP = rpSet.has(resolved);
    }
    if (!isRP) return false;
    const housesSignified = getHousesSignifiedByPlanet(planet, significators);
    return housesSignified.some(h => favorable.has(h.house));
  }

  function favorableScore(planet) {
    const housesSignified = getHousesSignifiedByPlanet(planet, significators);
    let score = 0;
    for (const h of housesSignified) {
      if (favorable.has(h.house)) {
        score += h.level === 'A' ? 4 : h.level === 'B' ? 3 : h.level === 'C' ? 2 : 1;
      }
    }
    return score;
  }

  const results = [];

  function searchBhuktis(bhuktis, mahaLord) {
    const mahaFruitful = isFruitful(mahaLord);
    for (const bhukti of bhuktis) {
      const bEnd = new Date(bhukti.endDate).getTime();
      if (bEnd <= now) continue;
      if (!isFruitful(bhukti.lord)) continue;

      const anthras = bhukti.anthras || calculateSubPeriods(bhukti.lord, new Date(bhukti.startDate), bhukti.durationYears);

      for (const anthra of anthras) {
        const aEnd = new Date(anthra.endDate).getTime();
        if (aEnd <= now) continue;
        const aStart = new Date(anthra.startDate).getTime();

        if (!isFruitful(anthra.lord)) continue;

        const fruitfulCount = (mahaFruitful ? 1 : 0) + 2; // bhukti + anthra always fruitful here
        let score = favorableScore(mahaLord) + favorableScore(bhukti.lord) + favorableScore(anthra.lord);
        if (fruitfulCount === 3) score += 20;

        results.push({
          date: new Date(Math.max(aStart, now)).toISOString().split('T')[0],
          endDate: new Date(aEnd).toISOString().split('T')[0],
          mahaDasha: mahaLord,
          bhukti: bhukti.lord,
          anthra: anthra.lord,
          score,
          fruitfulCount,
          method: 'dasha-fruitful',
          description: `${mahaLord}-${bhukti.lord}-${anthra.lord} (${fruitfulCount}/3 fruitful)`,
        });
      }
    }
  }

  const mahaDashaLord = dashaBalance.mahaDasha.lord;
  searchBhuktis(dashaBalance.bhuktis || [], mahaDashaLord);

  // Also search next maha dasha for long-range predictions
  {
    const nextMahaLord = VIMSHOTTARI_ORDER[
      (VIMSHOTTARI_ORDER.indexOf(mahaDashaLord) + 1) % 9
    ];
    const nextMahaYears = VIMSHOTTARI_YEARS[nextMahaLord];
    const nextMahaStart = new Date(dashaBalance.mahaDasha.endDate);
    const nextBhuktis = calculateSubPeriods(nextMahaLord, nextMahaStart, nextMahaYears);
    for (const bhukti of nextBhuktis) {
      bhukti.anthras = calculateSubPeriods(bhukti.lord, new Date(bhukti.startDate), bhukti.durationYears);
    }
    searchBhuktis(nextBhuktis, nextMahaLord);
  }

  results.sort((a, b) => b.score - a.score || new Date(a.date) - new Date(b.date));
  return results;
}

/**
 * Find dates where Sun transit AND favorable dasha period overlap.
 */
function findTransitDashaIntersection(sunTransits, allDashaPeriods, allMoonResults, rulingPlanets, fruitfulDashaPeriods, fruitfulSignificators, sigTargetScores, fastTransits) {
  if (!sunTransits || sunTransits.length === 0 || !allDashaPeriods || allDashaPeriods.length === 0) return [];

  const rpSet = new Set(rulingPlanets || []);
  // Core RPs = filtered ruling planets minus Rahu/Ketu (real planets only)
  const coreRPSet = new Set((rulingPlanets || []).filter(p => p !== 'rahu' && p !== 'ketu'));
  const fruitfulSet = new Set((fruitfulDashaPeriods || []).map(p => `${p.mahaDasha}-${p.bhukti}-${p.anthra}`));
  const fruitfulPlanetSet = new Set((fruitfulSignificators || []).map(f => f.planet || f));

  const results = [];

  for (const period of allDashaPeriods) {
    const pStart = new Date(period.date).getTime();
    const pEnd = new Date(period.endDate).getTime();

    for (const st of sunTransits) {
      const stMs = st.dateObj.getTime();
      // Check if sun transit falls within dasha period
      if (stMs >= pStart && stMs <= pEnd) {
        let score = period.score || 0;

        // Transit quality bonus: Sun transit in position governed by fruitful significators
        // Book: "Sun transits sign/star/sub of significators common with ruling planets"
        // Strong progressive bonus: 3/3 fruitful = ideal transit (book's best case)
        if (st.targetRange && fruitfulPlanetSet.size > 0) {
          const { signLord, starLord, subLord } = st.targetRange;
          let transitQuality = 0;
          if (fruitfulPlanetSet.has(signLord)) transitQuality++;
          if (fruitfulPlanetSet.has(starLord)) transitQuality++;
          if (fruitfulPlanetSet.has(subLord)) transitQuality++;
          // Progressive: 1=+5, 2=+12, 3=+25 (exponential for ideal transits)
          score += transitQuality === 3 ? 25 : transitQuality === 2 ? 12 : transitQuality * 5;
        }

        // Significator-based target score: varies per horary number (different cusps → different significators)
        if (sigTargetScores && st.targetRange && sigTargetScores.has(st.targetRange.number)) {
          score += sigTargetScores.get(st.targetRange.number);
        }

        // Fast planet transit confirmation: Mars/Mercury/Venus in target range near this date
        if (fastTransits && fastTransits.length > 0) {
          const confirming = new Set();
          for (const ft of fastTransits) {
            const ftMs = ft.dateObj.getTime();
            if (Math.abs(ftMs - stMs) <= 7 * 86400000) { // Within 7 days
              confirming.add(ft.planet);
            }
          }
          score += confirming.size * 3; // +3 per confirming planet
        }

        // Check if there is a Moon+Day match near this Sun transit within the period
        let moonMatch = null;
        if (allMoonResults) {
          for (const mr of allMoonResults) {
            const mrMs = mr.dateObj.getTime();
            // Moon match within ±15 days of Sun transit AND within dasha period
            if (Math.abs(mrMs - stMs) <= 15 * 86400000 && mrMs >= pStart && mrMs <= pEnd) {
              if (!moonMatch || (mr.matchType === 'strict' && moonMatch.matchType !== 'strict')) {
                moonMatch = mr;
              }
            }
          }
        }

        if (moonMatch) {
          score += 10;
          // Sun-Moon tightness bonus: closer alignment = stronger timing signal
          const gapDays = Math.abs(moonMatch.dateObj.getTime() - stMs) / 86400000;
          if (gapDays <= 3) score += 8;       // Within 3 days: very tight
          else if (gapDays <= 7) score += 4;  // Within a week
        }

        // Transit-anthra resonance: Sun transit sub lord matches anthra lord
        // Book methodology: "Sun transits Venus sign Mars star Ketu sub" during Ketu anthra
        // Only meaningful when anthra lord is a ruling planet
        if (period.anthra && st.targetRange && rpSet.has(period.anthra)) {
          const { subLord } = st.targetRange;
          if (subLord === period.anthra) {
            score += 15;  // Strong resonance: transit sub = anthra lord (RP)
          } else if (st.targetRange.starLord === period.anthra) {
            score += 8;   // Medium resonance: transit star = anthra lord (RP)
          }
        }

        // RP anthra bonus
        if (period.anthra && rpSet.has(period.anthra)) score += 5;

        // Fruitful period bonus
        const periodKey = `${period.mahaDasha}-${period.bhukti}-${period.anthra}`;
        if (fruitfulSet.has(periodKey)) score += 15;

        results.push({
          date: moonMatch ? moonMatch.date : st.date,
          sunTransitDate: st.date,
          sunDegree: st.degree,
          period: {
            mahaDasha: period.mahaDasha,
            bhukti: period.bhukti,
            anthra: period.anthra,
            startDate: period.date,
            endDate: period.endDate,
          },
          moonMatch: moonMatch ? {
            date: moonMatch.date,
            dayName: moonMatch.dayName,
            matchType: moonMatch.matchType,
          } : null,
          sunTransitTarget: st.targetRange || null,
          rpOnly: period.method === 'dasha-rp',
          score,
          method: moonMatch ? 'transit-dasha-moon' : 'transit-dasha',
          description: moonMatch
            ? `Sun transit ${st.date} + Moon ${moonMatch.date} (${moonMatch.dayName}) in ${period.description || period.mahaDasha + '-' + period.bhukti + '-' + period.anthra}`
            : `Sun transit ${st.date} in ${period.description || period.mahaDasha + '-' + period.bhukti + '-' + period.anthra}`,
        });
      }
    }
  }

  results.sort((a, b) => b.score - a.score || new Date(a.date) - new Date(b.date));
  return results;
}

/**
 * Find next transit of a slow-moving planet (Jupiter/Saturn) into target ranges.
 */
function findSlowPlanetTransit(planetName, startJd, targetPositions, stepDays, maxSteps) {
  for (let step = 1; step <= maxSteps; step++) {
    const jd = startJd + step * stepDays;
    const pos = calcPlanetPosition(jd, planetName);
    const deg = pos.longitude;

    const match = isInRanges(deg, targetPositions);
    if (match) {
      const date = julianDayToDate(jd);
      return {
        date: date.toISOString().split('T')[0],
        degree: deg,
        targetRange: match,
      };
    }
  }
  return null;
}

/**
 * Find fruitful significators — planets common to both house significators and ruling planets.
 * Kept for backward compatibility.
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

  const fruitful = rulingPlanets.filter(p => sigPlanets.has(p));
  return fruitful.length > 0 ? fruitful : rulingPlanets.slice(0, 3);
}

/**
 * Find degree positions governed by a set of planets.
 * Kept for backward compatibility.
 */
function findGovernedPositions(planets) {
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
 * Calculate event timing predictions using Krishnamurti's method.
 *
 * @param {string[]} rulingPlanets - Filtered ruling planets array
 * @param {Object} significators - House significators
 * @param {Object} planets - Planet positions (sidereal)
 * @param {string} questionCategory - Category of the question
 * @param {Date} judgmentDate - Date/time of judgment
 * @param {number[]} houses - House cusp degrees
 * @param {Object} dashaBalance - From calculateDashaBalance()
 * @returns {Object} Timing predictions
 */
function calculateEventTiming(rulingPlanets, significators, planets, questionCategory, judgmentDate, houses, dashaBalance, rejectedPlanets, latitude, longitude) {
  const jd = dateToJulianDay(judgmentDate);

  // Step 1: Build target positions (sign + star + sub = all ruling planets)
  const targetPositions = findTargetPositions(rulingPlanets, planets, rejectedPlanets);

  // Step 2: Build relaxed positions (sign + star = ruling) for Moon transit
  const relaxedPositions = findRelaxedPositions(rulingPlanets, planets, rejectedPlanets);

  // Step 2b: Star-sub fallback positions
  const starSubPositions = findStarSubPositions(rulingPlanets, planets, rejectedPlanets);

  // Step 3: Determine match level based on what positions we found
  let matchLevel = 'strict';
  let effectiveTargets = targetPositions;
  if (targetPositions.length === 0 && starSubPositions.length > 0) {
    matchLevel = 'star-sub';
    effectiveTargets = starSubPositions;
  } else if (targetPositions.length === 0 && relaxedPositions.length > 0) {
    matchLevel = 'relaxed';
    effectiveTargets = relaxedPositions;
  }

  // Step 4: Sun transit — search up to 7 years (2557 days) to cover next maha dasha
  // Single search replaces separate 3yr + extension searches for better performance
  const sunTransits = findSunTransit(jd, effectiveTargets, 2557);
  const sunTransit = sunTransits.length > 0 ? sunTransits[0] : null;

  // Step 5: Moon transit — search around EACH Sun transit for Moon+DayLord matches (±15 days)
  let allMoonTransitResults = [];
  const moonBySunTransit = [];

  for (const st of sunTransits) {
    const searchStart = st.jd - 15;
    const searchEnd = st.jd + 15;
    const moonResults = findMoonTransitDates(
      searchStart, searchEnd, targetPositions, relaxedPositions, rulingPlanets
    );
    moonBySunTransit.push({ sunTransit: st, moonResults });
    allMoonTransitResults = allMoonTransitResults.concat(moonResults);
  }

  // First Sun transit's moon results for backward compat
  const moonTransitResults = moonBySunTransit.length > 0 ? moonBySunTransit[0].moonResults : [];

  // Also check near-term (next 60 days from judgment)
  const nearTermMoon = findMoonTransitDates(
    jd, jd + 60, targetPositions, relaxedPositions, rulingPlanets
  );

  // Step 5b: Fast planet transits (Mars/Mercury/Venus) — confirmation signals
  const marsTransits = findFastPlanetTransits('mars', jd, effectiveTargets, 730);
  const mercuryTransits = findFastPlanetTransits('mercury', jd, effectiveTargets, 730);
  const venusTransits = findFastPlanetTransits('venus', jd, effectiveTargets, 730);
  const allFastTransits = [...marsTransits, ...mercuryTransits, ...venusTransits];

  // Step 6: Three dasha methods
  // Method A: House signification
  const dashaTiming = dashaBalance
    ? findDashaTiming(dashaBalance, significators, questionCategory, judgmentDate, rulingPlanets, planets)
    : null;

  // Method B: RP match
  const rpDashaPeriods = dashaBalance
    ? findRulingPlanetDashaPeriods(dashaBalance, rulingPlanets, judgmentDate, planets)
    : [];

  // Method C: Fruitful significators
  const fruitfulDashaPeriods = dashaBalance
    ? findFruitfulDashaPeriods(dashaBalance, significators, questionCategory, rulingPlanets, judgmentDate, planets)
    : [];

  // Merge all dasha periods (deduplicated by date range + bhukti lord)
  const allDashaPeriods = [];
  const dashaSeen = new Set();
  const addPeriod = (p) => {
    const key = `${p.date}|${p.endDate}|${p.bhukti}`;
    if (!dashaSeen.has(key)) {
      dashaSeen.add(key);
      allDashaPeriods.push(p);
    }
  };
  if (dashaTiming && dashaTiming.periods) dashaTiming.periods.forEach(addPeriod);
  rpDashaPeriods.forEach(addPeriod);
  fruitfulDashaPeriods.forEach(addPeriod);

  // Find common/fruitful significators (needed for transit quality scoring)
  const commonPlanets = findCommonPlanets(significators, questionCategory, rulingPlanets, planets, rejectedPlanets);

  // Step 6b: Extended Sun transit search for top dasha periods beyond the 90-cap cutoff.
  // The main search caps at 90 results (~4-5 years with many targets). For long-range
  // predictions (e.g. Ex.5 Vehicle at 6yr), search within top dasha periods individually.
  const lastTransitJd = sunTransits.length > 0 ? sunTransits[sunTransits.length - 1].jd : jd;
  if (sunTransits.length >= 90 && allDashaPeriods.length > 0) {
    const topFarPeriods = allDashaPeriods
      .filter(p => dateToJulianDay(new Date(p.endDate)) > lastTransitJd)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10);
    const extendedFoundDates = new Set(sunTransits.map(s => s.date));
    for (const period of topFarPeriods) {
      const pStartJd = Math.max(lastTransitJd + 1, dateToJulianDay(new Date(period.date)));
      const pEndJd = dateToJulianDay(new Date(period.endDate));
      // Use 0.5-day steps to catch narrow sub ranges (< 1°) that 1-day stepping misses
      for (let d = pStartJd; d <= pEndJd; d += 0.5) {
        const pos = calcPlanetPosition(d, 'sun');
        const match = isInRanges(pos.longitude, effectiveTargets);
        if (match) {
          const wholeJd = Math.round(d);
          const date = julianDayToDate(wholeJd);
          const dateStr = date.toISOString().split('T')[0];
          if (!extendedFoundDates.has(dateStr)) {
            extendedFoundDates.add(dateStr);
            const st = { date: dateStr, dateObj: date, jd: wholeJd, degree: pos.longitude, targetRange: match, dayOfWeek: jdToDayOfWeek(wholeJd) };
            sunTransits.push(st);
            // Moon search for this extended transit
            const moonResults = findMoonTransitDates(wholeJd - 15, wholeJd + 15, targetPositions, relaxedPositions, rulingPlanets);
            moonBySunTransit.push({ sunTransit: st, moonResults });
            allMoonTransitResults = allMoonTransitResults.concat(moonResults);
          }
          // Skip past range
          while (d <= pEndJd) {
            d += 0.5;
            const np = calcPlanetPosition(d, 'sun');
            if (!isInRanges(np.longitude, [match])) break;
          }
          d -= 0.5;
        }
      }
    }
  }

  // Step 6c: Build significator-based target scores (varies per horary number)
  const sigTargetScores = buildSignificatorTargetScores(significators, questionCategory, effectiveTargets);

  // Step 7: Transit-Dasha intersection
  const transitDashaIntersections = findTransitDashaIntersection(
    sunTransits, allDashaPeriods, allMoonTransitResults, rulingPlanets, fruitfulDashaPeriods, commonPlanets, sigTargetScores, allFastTransits
  );

  // Step 7b: Star-only transit search within top dasha periods (by score)
  const starOnlyPositions = findStarOnlyPositions(rulingPlanets, planets, rejectedPlanets);
  const starOnlyIntersections = [];
  if (allDashaPeriods.length > 0 && starOnlyPositions.length > 0) {
    // Find Sun transits at star-only level for top dasha periods
    const starOnlyPeriods = [...allDashaPeriods]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);
    for (const period of starOnlyPeriods) {
      const pStartJd = dateToJulianDay(new Date(period.date));
      const pEndJd = dateToJulianDay(new Date(period.endDate));
      if (pEndJd <= jd) continue;

      // Check each day in the period for star-only Sun transit (capped at 3yr from judgment)
      const maxStarOnlyDay = 1095;
      for (let day = Math.max(1, Math.floor(pStartJd - jd)); day <= Math.min(Math.ceil(pEndJd - jd), maxStarOnlyDay); day++) {
        const testJd = jd + day;
        if (testJd < pStartJd || testJd > pEndJd) continue;
        const sunPos = calcPlanetPosition(testJd, 'sun');
        const starMatch = isInRanges(sunPos.longitude, starOnlyPositions);
        if (starMatch) {
          // Find Moon+Day match near this Sun transit
          const moonResults = findMoonTransitDates(testJd - 15, testJd + 15, targetPositions, relaxedPositions, rulingPlanets);
          for (const mr of moonResults) {
            const mrJd = dateToJulianDay(mr.dateObj);
            if (mrJd >= pStartJd && mrJd <= pEndJd) {
              starOnlyIntersections.push({
                date: mr.date,
                sunTransitDate: julianDayToDate(testJd).toISOString().split('T')[0],
                period,
                moonMatch: { date: mr.date, dayName: mr.dayName, matchType: mr.matchType },
                score: (period.score || 5) + (mr.matchType === 'strict' ? 8 : 4),
                method: 'star-only-dasha-moon',
                description: `Star-only Sun transit + Moon ${mr.date} in ${period.description || ''}`,
              });
            }
          }
          // Skip past this star-only range
          const maxDay = Math.ceil(pEndJd - jd);
          while (day <= maxDay) {
            day++;
            const np = calcPlanetPosition(jd + day, 'sun');
            if (!isInRanges(np.longitude, [starMatch])) break;
          }
          day--;
        }
      }
    }
  }

  // Step 8: Compile prominent dates
  const prominentDates = [];

  // Add transit-dasha intersections (highest priority)
  for (const tdi of transitDashaIntersections.slice(0, 5)) {
    prominentDates.push({
      date: tdi.date,
      description: tdi.description,
      confidence: tdi.moonMatch ? 'high' : 'medium',
      source: 'transit-dasha',
      score: tdi.score,
    });
  }

  // Add Sun transit dates
  for (const st of sunTransits.slice(0, 5)) {
    const dayName = DAY_LORDS[st.dayOfWeek].en;
    prominentDates.push({
      date: st.date,
      description: `Sun transits ${st.targetRange.sign} (${st.targetRange.signLord} sign, ${st.targetRange.starLord} star, ${st.targetRange.subLord} sub) at ${st.degree.toFixed(2)}° — ${dayName}`,
      confidence: 'month-indicator',
      source: 'sun-transit',
    });
  }

  // Add Moon+DayLord matched dates from ALL Sun transits (deduplicated)
  const seenMoonDates = new Set();
  for (const mt of allMoonTransitResults) {
    if (seenMoonDates.has(mt.date)) continue;
    seenMoonDates.add(mt.date);
    prominentDates.push({
      date: mt.date,
      description: `Moon in ${mt.targetRange.sign} (${mt.targetRange.signLord}/${mt.targetRange.starLord}/${mt.targetRange.subLord}), ${mt.dayName} — ${mt.matchType} match`,
      confidence: mt.confidence,
      source: 'moon-day-match',
    });
  }

  // Add Dasha-based timing dates
  if (dashaTiming && dashaTiming.periods) {
    for (const dp of dashaTiming.periods.slice(0, 3)) {
      prominentDates.push({
        date: dp.date,
        endDate: dp.endDate,
        description: `Dasha: ${dp.description}`,
        confidence: dp.confidence,
        source: 'dasha',
      });
    }
  }

  // Add star-only dasha intersections
  for (const soi of starOnlyIntersections.slice(0, 3)) {
    prominentDates.push({
      date: soi.date,
      description: soi.description,
      confidence: 'medium',
      source: 'star-only-dasha',
      score: soi.score,
    });
  }

  // Add fast planet transits (Mars/Mercury/Venus) as confirmation signals
  for (const ft of allFastTransits.slice(0, 9)) {
    prominentDates.push({
      date: ft.date,
      description: `${ft.planet.charAt(0).toUpperCase() + ft.planet.slice(1)} transits ${ft.targetRange.sign} (${ft.targetRange.signLord}/${ft.targetRange.starLord}/${ft.targetRange.subLord}) at ${ft.degree.toFixed(2)}°`,
      confidence: 'confirmation',
      source: 'planet-transit',
    });
  }

  // Jupiter transit (longer term) — step 7 days, check ~3 years
  const jupiterTransit = findSlowPlanetTransit('jupiter', jd, effectiveTargets, 7, 220);

  // Saturn transit — step 7 days, check ~3 years
  const saturnTransit = findSlowPlanetTransit('saturn', jd, effectiveTargets, 7, 220);

  // Step 9: Best date selection with priority tiers
  let bestPredictedDate = null;
  const minLeadMs = 7 * 86400000;
  const minLeadDate = new Date(judgmentDate.getTime() + minLeadMs);

  // Collect all candidates with tier info
  const candidates = [];

  // Tier 1: Transit-Dasha intersection with Moon match (highest)
  for (const tdi of transitDashaIntersections) {
    if (tdi.moonMatch && new Date(tdi.date) >= minLeadDate) {
      candidates.push({ tier: 1, date: tdi.date, score: tdi.score, method: 'transit-dasha-moon', description: tdi.description, dayName: tdi.moonMatch.dayName, rpOnly: tdi.rpOnly });
    }
  }

  // Tier 2: Transit-Dasha without Moon
  for (const tdi of transitDashaIntersections) {
    if (!tdi.moonMatch && new Date(tdi.date) >= minLeadDate) {
      candidates.push({ tier: 2, date: tdi.date, score: tdi.score, method: 'transit-dasha', description: tdi.description, rpOnly: tdi.rpOnly });
    }
  }

  // Collect strict/relaxed Moon+Day matches with context
  const allStrictWithContext = [];
  const allRelaxedWithContext = [];
  for (const { sunTransit: st, moonResults } of moonBySunTransit) {
    for (const mr of moonResults) {
      const daysFromSun = Math.abs(mr.jd - st.jd);
      const entry = { ...mr, parentSunDate: st.date, daysFromSun };
      if (mr.matchType === 'strict') {
        allStrictWithContext.push(entry);
      } else {
        allRelaxedWithContext.push(entry);
      }
    }
  }

  // Helper: get significator score for a moon transit target range
  function getMoonSigScore(mr) {
    if (!mr.targetRange || !mr.targetRange.number) return 0;
    return sigTargetScores.get(mr.targetRange.number) || 0;
  }

  // Significator-based dasha periods only (vary per horary number; excludes RP-only)
  const sigDashaPeriods = allDashaPeriods.filter(dp => dp.method !== 'dasha-rp');

  // Check if date is within a significator-based dasha period
  function isSigDashaAligned(dateMs) {
    for (const dp of sigDashaPeriods) {
      const dpStart = new Date(dp.date).getTime();
      const dpEnd = new Date(dp.endDate).getTime();
      if (dateMs >= dpStart && dateMs <= dpEnd) return true;
    }
    return false;
  }

  // Tier 3: Significator-dasha-aligned strict Moon+Day (varies per horary number)
  for (const mr of allStrictWithContext) {
    if (new Date(mr.date) < minLeadDate) continue;
    const mrMs = new Date(mr.date).getTime();
    if (isSigDashaAligned(mrMs)) {
      candidates.push({ tier: 3, date: mr.date, score: 30 + getMoonSigScore(mr), method: 'moon-day-dasha-strict', description: 'Strict Moon+Day in favorable dasha period', dayName: mr.dayName });
    }
  }

  // Tier 4: Any strict Moon+Day
  for (const mr of allStrictWithContext) {
    if (new Date(mr.date) >= minLeadDate) {
      candidates.push({ tier: 4, date: mr.date, score: 25 - mr.daysFromSun + getMoonSigScore(mr), method: 'moon-day-match', description: 'Sun + Moon + Day Lord alignment', dayName: mr.dayName });
    }
  }

  // Tier 5: Significator-dasha-aligned relaxed Moon+Day
  for (const mr of allRelaxedWithContext) {
    if (new Date(mr.date) < minLeadDate) continue;
    const mrMs = new Date(mr.date).getTime();
    if (isSigDashaAligned(mrMs)) {
      candidates.push({ tier: 5, date: mr.date, score: 20 + getMoonSigScore(mr), method: 'moon-day-dasha-relaxed', description: 'Relaxed Moon+Day in favorable dasha period', dayName: mr.dayName });
    }
  }

  // Tier 6: Any relaxed Moon+Day
  for (const mr of allRelaxedWithContext) {
    if (new Date(mr.date) >= minLeadDate) {
      candidates.push({ tier: 6, date: mr.date, score: 15 - mr.daysFromSun + getMoonSigScore(mr), method: 'moon-day-relaxed', description: 'Sun + Moon transit alignment', dayName: mr.dayName });
    }
  }

  // Tier 7: Sun transit alone
  for (const st of sunTransits) {
    if (new Date(st.date) >= minLeadDate) {
      candidates.push({ tier: 7, date: st.date, score: 10, method: 'sun-transit', description: 'Sun transit (month-level estimate)', dayName: DAY_LORDS[st.dayOfWeek].en });
    }
  }

  // Tier 8: Dasha period alone
  if (dashaTiming && dashaTiming.periods) {
    for (const dp of dashaTiming.periods) {
      if (new Date(dp.date) >= minLeadDate) {
        candidates.push({ tier: 8, date: dp.date, score: dp.score || 5, method: 'dasha-period', description: `${dp.description} (Dasha period)` });
      }
    }
  }

  // Tier 9: Jupiter/Saturn transit (fallback)
  if (jupiterTransit) {
    candidates.push({ tier: 9, date: jupiterTransit.date, score: 3, method: 'jupiter-transit', description: 'Jupiter transit (year-level estimate)' });
  }
  if (saturnTransit) {
    candidates.push({ tier: 9, date: saturnTransit.date, score: 2, method: 'saturn-transit', description: 'Saturn transit (year-level estimate)' });
  }

  // Select best: proximity-band sorting (book method: transit determines timing, dasha confirms)
  // Band A (within 90 days): near-term predictions - transit is primary
  // Band B (90-365 days): medium-term - transit+dasha both important
  // Band C (beyond 365 days): long-term - only if no nearer options
  if (candidates.length > 0) {
    const judgMs = judgmentDate.getTime();

    // Compare best transit-dasha intersection scores between current and next maha dasha
    // When the next maha's best score is overwhelmingly better (2x+), the event likely
    // happens in the next maha — demote non-dasha candidates within the current maha
    // Ex.5 Vehicle: Ketu-maha TDI score ~20 vs Venus-maha TDI score ~98 → 5x → demote
    // Ex.11 Delivery: Mars-maha TDI score ~47 vs Rahu-maha TDI score ~45 → ~1x → no demote
    const mahaEndMs = dashaBalance ? new Date(dashaBalance.mahaDasha.endDate).getTime() : null;
    let deferToNextMaha = false;
    if (mahaEndMs && transitDashaIntersections.length > 0) {
      let bestCurrentMahaScore = 0;
      let bestNextMahaScore = 0;
      for (const tdi of transitDashaIntersections) {
        const tdiMs = new Date(tdi.date).getTime();
        if (tdiMs < mahaEndMs) {
          bestCurrentMahaScore = Math.max(bestCurrentMahaScore, tdi.score);
        } else {
          bestNextMahaScore = Math.max(bestNextMahaScore, tdi.score);
        }
      }
      // Next maha is overwhelmingly better: 2x score AND next has meaningful score
      deferToNextMaha = bestNextMahaScore >= 40 && bestNextMahaScore >= bestCurrentMahaScore * 2;
    }

    function getBand(candidate) {
      const dateMs = new Date(candidate.date).getTime();
      const daysOut = (dateMs - judgMs) / 86400000;
      const tier = candidate.tier;

      // When next maha has overwhelmingly better transit-dasha intersections,
      // demote non-dasha-confirmed near-term dates (tier 3+) in current maha
      if (deferToNextMaha && tier >= 3 && mahaEndMs && dateMs < mahaEndMs) {
        return 2;  // Demote to Band C
      }

      // Dasha-only and slow-planet fallbacks (Tier 8-9) cannot claim Band A
      // This prevents low-quality near-term predictions from beating quality transit-dasha matches
      if (tier >= 8 && daysOut <= 90) return 1;  // Demote to Band B

      // RP-only TDIs in Band A: demote to Band B so sig-based candidates can win
      // RP-only TDIs are identical for all horary numbers; demotion creates differentiation
      if (candidate.rpOnly && daysOut <= 90) return 1;  // Demote to Band B

      if (daysOut <= 90) return 0;   // Band A
      if (daysOut <= 365) return 1;  // Band B
      return 2;                       // Band C
    }

    // Effective score: apply proximity decay within Band B to favor earlier dates
    // This prevents far-future high-scoring candidates from always beating nearer valid ones
    function effectiveScore(candidate) {
      const band = getBand(candidate);
      let score = candidate.score;
      if (band === 1) { // Band B: decay 1 point per 10 days beyond 90
        const daysOut = (new Date(candidate.date).getTime() - judgMs) / 86400000;
        score -= Math.max(0, (daysOut - 90) / 10);
      }
      return score;
    }

    candidates.sort((a, b) => {
      const bandA = getBand(a);
      const bandB = getBand(b);
      // Proximity band first: nearer bands always win
      if (bandA !== bandB) return bandA - bandB;
      // Within same band: tier (method quality)
      if (a.tier !== b.tier) return a.tier - b.tier;
      // Within same band+tier: effective score (with proximity decay in Band B)
      const esA = effectiveScore(a);
      const esB = effectiveScore(b);
      if (esA !== esB) return esB - esA;
      return new Date(a.date) - new Date(b.date);
    });

    let best = candidates[0];

    // Transit-anthra resonance override for long-range predictions (Band C).
    // Per KP Reader VI: for long-range events, the anthra is selected by which
    // anthra lord's sub the Sun transits during that anthra period.
    // When best is Band C tier 1-2 (TDI), check if another Band C TDI has
    // transit-anthra resonance (sub=anthra, anthra is RP) — prefer it.
    const bestBand = getBand(best);
    // Transit-anthra resonance override for long-range predictions (Band C).
    // Per KP Reader VI: for events years in the future, the correct anthra is
    // identified by Sun transit sub lord matching the anthra lord (a ruling planet).
    // Prefer anthras with DIVERSE lords (anthra != maha/bhukti) for stronger indication.
    // Extract best's maha+bhukti from description for matching
    const bestTdi = transitDashaIntersections.find(t => t.date === best.date);
    const bestMaha = bestTdi?.period?.mahaDasha;
    const bestBhukti = bestTdi?.period?.bhukti;
    if (bestBand === 2 && best.tier <= 2 && bestMaha && bestBhukti) {
      const rpSet = new Set(rulingPlanets || []);
      let diverseResonance = null; // anthra different from maha+bhukti
      let sameResonance = null;    // anthra same as maha or bhukti (weaker)
      for (const tdi of transitDashaIntersections) {
        if (!tdi.sunTransitTarget || !tdi.period.anthra) continue;
        // Must be same maha+bhukti as the current best
        if (tdi.period.mahaDasha !== bestMaha || tdi.period.bhukti !== bestBhukti) continue;
        if (!rpSet.has(tdi.period.anthra)) continue;
        if (tdi.sunTransitTarget.subLord !== tdi.period.anthra) continue;
        const isDiverse = tdi.period.anthra !== bestMaha && tdi.period.anthra !== bestBhukti;
        if (isDiverse) {
          if (!diverseResonance || tdi.score > diverseResonance.score) diverseResonance = tdi;
        } else {
          if (!sameResonance || tdi.score > sameResonance.score) sameResonance = tdi;
        }
      }
      // Prefer diverse resonance; fall back to same-lord resonance only if no diverse
      const bestResonance = diverseResonance;
      if (bestResonance && new Date(bestResonance.date) >= minLeadDate) {
        best = {
          tier: 1,
          date: bestResonance.date,
          score: bestResonance.score,
          method: bestResonance.method,
          description: bestResonance.description + ' [transit-anthra resonance]',
          dayName: bestResonance.moonMatch?.dayName,
        };
      }
    }

    // Step 10: Shookshma refinement — 4th-level sub-period for day-level precision.
    // Per KP Reader VI: within the selected anthra, find the RP shookshma where
    // a Sun transit occurs AND Moon+DayLord matches — the triple alignment gives the exact date.
    const bestTdiForShookshma = transitDashaIntersections.find(t => t.date === best.date);
    // Only apply shookshma when the base TDI has a loose Sun-Moon alignment (gap > 5 days).
    // When Sun+Moon are already within 5 days, the TDI date is precise enough — shookshma
    // would risk moving the prediction away from an already-accurate date.
    const tdiSunMoonGap = bestTdiForShookshma?.moonMatch && bestTdiForShookshma?.sunTransitDate
      ? Math.abs(new Date(bestTdiForShookshma.moonMatch.date).getTime() - new Date(bestTdiForShookshma.sunTransitDate).getTime()) / 86400000
      : Infinity;
    if (bestTdiForShookshma && best.tier <= 2 && tdiSunMoonGap > 5) {
      const anthraPeriod = bestTdiForShookshma.period;
      const anthraStart = new Date(anthraPeriod.startDate);
      const anthraEnd = new Date(anthraPeriod.endDate);
      const anthraDays = (anthraEnd - anthraStart) / 86400000;
      const anthraYears = anthraDays / 365.25;

      if (anthraYears > 0 && anthraDays >= 7) {
        const shookshmas = calculateSubPeriods(anthraPeriod.anthra, anthraStart, anthraYears);
        const rpSet = new Set(rulingPlanets || []);
        const fruitfulPlanets = new Set(commonPlanets.map(c => c.planet || c));
        const tdiDateMs = new Date(best.date).getTime();

        // Find shookshmas where lord is a ruling planet
        const rpShookshmas = shookshmas.filter(s => {
          if (rpSet.has(s.lord)) return true;
          if (s.lord === 'rahu' || s.lord === 'ketu') {
            const resolved = resolveNode(s.lord, planets);
            return rpSet.has(resolved);
          }
          return false;
        });

        // Find ALL Sun transits within the anthra period (not just the best TDI's one).
        // This lets us discover alignments like Nov 17 Sun + Nov 18 Moon in jupiter shookshma,
        // even if the best TDI picked an earlier Sun transit.
        const anthraStartJd = dateToJulianDay(anthraStart);
        const anthraEndJd = dateToJulianDay(anthraEnd);
        const anthraSunTransits = sunTransits.filter(st =>
          st.jd >= anthraStartJd && st.jd <= anthraEndJd
        );

        let bestShookshmaDate = null;
        let bestShookshmaScore = -1;

        for (const shk of rpShookshmas) {
          const shkStartMs = new Date(shk.startDate).getTime();
          const shkEndMs = new Date(shk.endDate).getTime();
          const shkStartJd = dateToJulianDay(new Date(shk.startDate));
          const shkEndJd = dateToJulianDay(new Date(shk.endDate));

          // Find Sun transits within THIS shookshma
          const shkSunTransits = anthraSunTransits.filter(st =>
            st.jd >= shkStartJd && st.jd <= shkEndJd
          );
          if (shkSunTransits.length === 0) continue;  // No Sun transit in this shookshma

          // Search Moon+DayLord within this shookshma
          const moonResults = findMoonTransitDates(
            shkStartJd, shkEndJd, targetPositions, relaxedPositions, rulingPlanets
          );
          for (const mr of moonResults) {
            if (new Date(mr.date) < minLeadDate) continue;
            const mrMs = new Date(mr.date).getTime();

            // Proximity guard: shookshma date must be within ±45 days of original TDI date.
            // Shookshma refines the prediction, it shouldn't jump months away.
            if (Math.abs(mrMs - tdiDateMs) > 45 * 86400000) continue;

            let score = mr.matchType === 'strict' ? 10 : 5;
            if (rpSet.has(shk.lord)) score += 3;

            // Fruitful significator bonus: shookshma lord signifies favorable houses AND is RP
            // Book: "common planets conjointly indicate time of fructification"
            if (fruitfulPlanets.has(shk.lord)) score += 5;

            // Sun-Moon tightness within shookshma: closer = stronger signal
            let minSunGap = Infinity;
            for (const st of shkSunTransits) {
              const gap = Math.abs(mrMs - st.dateObj.getTime()) / 86400000;
              if (gap < minSunGap) minSunGap = gap;
            }
            if (minSunGap <= 2) score += 8;       // Very tight: Sun+Moon within 2 days
            else if (minSunGap <= 5) score += 4;   // Moderate alignment

            // Prefer Moon on/after Sun transit
            const closestSunMs = shkSunTransits.reduce((best, st) =>
              Math.abs(st.dateObj.getTime() - mrMs) < Math.abs(best - mrMs) ? st.dateObj.getTime() : best
            , shkSunTransits[0].dateObj.getTime());
            if (mrMs >= closestSunMs) score += 2;

            if (score > bestShookshmaScore) {
              bestShookshmaScore = score;
              bestShookshmaDate = {
                date: mr.date,
                dayName: mr.dayName,
                shookshmaLord: shk.lord,
                matchType: mr.matchType,
              };
            }
          }
        }

        if (bestShookshmaDate) {
          best = {
            ...best,
            date: bestShookshmaDate.date,
            dayName: bestShookshmaDate.dayName,
            method: best.method + '-shookshma',
            description: `${best.description} → ${bestShookshmaDate.shookshmaLord} shookshma`,
          };
        }
      }
    }

    // Day lord HARD filter: book confirms event date's day-of-week must match a ruling planet
    // Two-pass: first ±3, then ±7 if no match. Constrain to dasha period if available.
    if (best.tier <= 6) {
      const rpDays = new Set();
      for (const rp of rulingPlanets) {
        if (PLANET_TO_DAY[rp] !== undefined) rpDays.add(PLANET_TO_DAY[rp]);
      }
      const bestDateObj = new Date(best.date);
      const bestDayOfWeek = bestDateObj.getUTCDay();
      if (rpDays.size > 0 && !rpDays.has(bestDayOfWeek)) {
        // Find dasha period boundaries for constraint
        const bestTdiForDay = transitDashaIntersections.find(t => t.date === best.date);
        const periodStart = bestTdiForDay ? new Date(bestTdiForDay.period.startDate) : null;
        const periodEnd = bestTdiForDay ? new Date(bestTdiForDay.period.endDate) : null;

        let bestShift = null;
        // Two-pass: ±3 first, then ±7
        for (const maxShift of [3, 7]) {
          if (bestShift !== null) break;
          for (let shift = -maxShift; shift <= maxShift; shift++) {
            if (shift === 0) continue;
            if (maxShift === 7 && Math.abs(shift) <= 3) continue; // Already checked
            const shiftedDate = new Date(bestDateObj.getTime() + shift * 86400000);
            if (shiftedDate < minLeadDate) continue;
            // Constrain to dasha period if available
            if (periodStart && shiftedDate < periodStart) continue;
            if (periodEnd && shiftedDate > periodEnd) continue;
            const shiftedDay = shiftedDate.getUTCDay();
            if (rpDays.has(shiftedDay)) {
              if (!bestShift || Math.abs(shift) < Math.abs(bestShift)) {
                bestShift = shift;
              }
            }
          }
        }
        if (bestShift !== null) {
          const shiftedDate = new Date(bestDateObj.getTime() + bestShift * 86400000);
          const shiftedDow = shiftedDate.getUTCDay();
          best = {
            ...best,
            date: shiftedDate.toISOString().split('T')[0],
            dayName: DAY_LORDS[shiftedDow].en,
            description: best.description + ` [day-lord adjusted ${bestShift > 0 ? '+' : ''}${bestShift}d]`,
          };
        }
      }
    }

    // Retrograde delay: when bhukti/anthra lord is retrograde at judgment,
    // shift prediction to their direct station date (book: "retro planets give results when direct")
    let retrogradeNote = null;
    const bestTdiForRetro = transitDashaIntersections.find(t => t.date === best.date);
    if (bestTdiForRetro && bestTdiForRetro.period) {
      const retroLords = [];
      let latestDirectDate = null;
      let latestDirectDateStr = null;
      for (const lord of [bestTdiForRetro.period.bhukti, bestTdiForRetro.period.anthra]) {
        if (lord && planets[lord] && planets[lord].isRetrograde) {
          retroLords.push(lord);
          const directStation = findDirectStationDate(lord, jd);
          if (directStation) {
            const directMs = new Date(directStation.date).getTime();
            if (!latestDirectDate || directMs > latestDirectDate) {
              latestDirectDate = directMs;
              latestDirectDateStr = directStation.date;
            }
          }
        }
      }
      if (retroLords.length > 0) {
        const bestMs = new Date(best.date).getTime();
        if (latestDirectDate && latestDirectDate > bestMs) {
          // Shift prediction to direct station date
          const directDateObj = new Date(latestDirectDateStr);
          const directDow = directDateObj.getUTCDay();
          retrogradeNote = `${retroLords.join(', ')} retrograde at judgment — delayed to direct station ${latestDirectDateStr}`;
          best = {
            ...best,
            date: latestDirectDateStr,
            dayName: DAY_LORDS[directDow].en,
            method: best.method + '-retro-delay',
            description: best.description + ` [retro delay: ${retroLords.join('+')} direct ${latestDirectDateStr}]`,
          };
        } else {
          retrogradeNote = `${retroLords.join(', ')} retrograde at judgment — goes direct before predicted date`;
        }
      }
    }

    // Lagna transit: find the time when the predicted degree rises on the ascendant
    let predictedTime = null;
    if (latitude && longitude) {
      const bestTdiForLagna = transitDashaIntersections.find(t => t.date === best.date) ||
        transitDashaIntersections.find(t => t.sunTransitTarget);
      const targetRange = bestTdiForLagna?.sunTransitTarget || sunTransit?.targetRange;
      if (targetRange) {
        const midDeg = (targetRange.startDeg + targetRange.endDeg) / 2;
        predictedTime = findLagnaRisingTime(midDeg, best.date, latitude, longitude);
      }
    }

    const confidenceMap = { 0: 'high', 1: 'high', 2: 'high', 3: 'high', 4: 'high', 5: 'medium', 6: 'medium', 7: 'low', 8: 'low', 9: 'low' };
    bestPredictedDate = {
      date: best.date,
      dayName: best.dayName || undefined,
      confidence: confidenceMap[best.tier] || 'low',
      method: best.method,
      description: best.description,
      retrogradeNote: retrogradeNote || undefined,
      predictedTime: predictedTime || undefined,
    };
  }

  // Fallback: if nothing found and dasha has something
  if (!bestPredictedDate && dashaTiming && dashaTiming.best) {
    const usablePeriods = (dashaTiming.periods || []).filter(p => {
      const endMs = new Date(p.endDate).getTime();
      return endMs > judgmentDate.getTime() + 14 * 86400000;
    });
    const best = usablePeriods.length > 0 ? usablePeriods[0] : dashaTiming.best;
    bestPredictedDate = {
      date: best.date,
      confidence: best.confidence === 'high' ? 'medium' : 'low',
      method: 'dasha-period',
      description: `${best.description} (Dasha period)`,
    };
  }

  return {
    fruitfulSignificators: commonPlanets.length > 0 ? commonPlanets.map(c => c.planet) : rulingPlanets,
    targetPositions,
    targetPositionCount: targetPositions.length,
    relaxedPositionCount: relaxedPositions.length,
    matchLevel,
    bestPredictedDate,
    transitDashaIntersections: transitDashaIntersections.slice(0, 3),
    sunTransit: sunTransit ? {
      date: sunTransit.date,
      degree: sunTransit.degree,
      targetRange: sunTransit.targetRange,
    } : null,
    sunTransitAll: sunTransits.slice(0, 5).map(st => ({
      date: st.date,
      degree: st.degree,
      sign: st.targetRange.sign,
      signLord: st.targetRange.signLord,
      starLord: st.targetRange.starLord,
      subLord: st.targetRange.subLord,
    })),
    moonTransit: moonTransitResults.length > 0 ? moonTransitResults[0] : null,
    moonTransitAll: allMoonTransitResults.slice(0, 10),
    nearTermMoon: nearTermMoon.slice(0, 5),
    prominentDates: prominentDates.slice(0, 25),
    jupiterTransit,
    saturnTransit,
    fastPlanetTransits: allFastTransits.slice(0, 9).map(ft => ({
      planet: ft.planet,
      date: ft.date,
      degree: ft.degree,
      sign: ft.targetRange.sign,
    })),
    dashaTiming,
  };
}

module.exports = {
  calculateEventTiming,
  findFruitfulSignificators,
  findGovernedPositions,
  findTargetPositions,
  findMoonTransitDates,
  findSunTransit,
};
