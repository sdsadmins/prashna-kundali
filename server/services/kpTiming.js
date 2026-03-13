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
 *
 * Reference: K.S. Krishnamurti, "KP Reader VI", Section IV — Timing
 */
const { calcPlanetPosition, dateToJulianDay, getAyanamsa } = require('./ephemeris');
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
    // Fallback: return the planet itself (will be matched as-is)
    return planet;
  }
  return planet;
}

/**
 * Build the set of ruling planet names, resolving Rahu/Ketu to their sign lords
 * for matching purposes, but keeping originals too.
 */
function buildRulingSet(rulingPlanets, planets) {
  const set = new Set();
  for (const rp of rulingPlanets) {
    set.add(rp);
    // Also add what Rahu/Ketu represent
    const resolved = resolveNode(rp, planets);
    if (resolved !== rp) set.add(resolved);
  }
  return set;
}

/**
 * Check if a planet is "in" the ruling set.
 * Rahu/Ketu in the sub table match if their sign lord is a ruling planet.
 */
function isRulingPlanet(planet, rulingSet) {
  if (rulingSet.has(planet)) return true;
  // Rahu/Ketu in KP_SUB_TABLE: check if they represent a ruling planet
  // For sub-table entries, Rahu/Ketu as lords should match if their sign lord
  // is in the ruling set. But we don't have their current position here.
  // Per KP methodology, Rahu acts as Saturn (its usual representative) and
  // Ketu acts as Mars, unless overridden by sign placement.
  // For the sub-table, the lords are fixed per nakshatra, so we check directly.
  return false;
}

/**
 * Find target degree ranges where sign lord, star lord, AND sub lord
 * are ALL ruling planets.
 *
 * This is the core of Krishnamurti's timing method: narrowing from 360°
 * down to a few specific degree ranges.
 */
function findTargetPositions(rulingPlanets, planets) {
  const rulingSet = buildRulingSet(rulingPlanets, planets);
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
 * Find "star+sub" target positions where star lord AND sub lord
 * are ruling planets (sign lord may differ). Ultra-relaxed fallback
 * when strict and relaxed both yield 0 results (very few ruling planets).
 */
function findStarSubPositions(rulingPlanets, planets) {
  const rulingSet = buildRulingSet(rulingPlanets, planets);
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
 * Find "star-only" positions where the star lord (nakshatra lord) is a ruling planet.
 * This is the book's primary transit method: "Sun transits the constellation of
 * Rohini, Hasta, or Sravana" (Moon's nakshatras). Only star lord match required.
 * Used as ultimate fallback within known favorable dasha periods.
 */
function findStarOnlyPositions(rulingPlanets, planets) {
  const rulingSet = buildRulingSet(rulingPlanets, planets);
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
 * Find "relaxed" target positions where at least sign lord AND star lord
 * are ruling planets (sub lord may differ). Used as fallback for Moon transit
 * day-finding.
 */
function findRelaxedPositions(rulingPlanets, planets) {
  const rulingSet = buildRulingSet(rulingPlanets, planets);
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
  // JD 0 was a Monday, so (JD + 1) % 7 gives: 0=Mon, 1=Tue, etc.
  // We want 0=Sun: shift by 1
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
 * Find when the Sun transits into a target degree range.
 * Sun moves ~1°/day, so stepping 1 day at a time is appropriate.
 * Returns the first entry into a target range after startJd.
 */
function findSunTransit(startJd, targetPositions, maxDays = 365) {
  const results = [];

  for (let day = 1; day <= maxDays; day++) {
    const jd = startJd + day;
    const pos = calcPlanetPosition(jd, 'sun');
    const deg = pos.longitude; // already sidereal

    const match = isInRanges(deg, targetPositions);
    if (match) {
      const date = julianDayToDate(jd);
      results.push({
        date: date.toISOString().split('T')[0],
        dateObj: date,
        jd,
        degree: deg,
        targetRange: match,
        dayOfWeek: jdToDayOfWeek(jd),
      });
      // Skip past this range to find the next distinct entry
      // Sun moves ~1°/day, range is typically 1-3°, so skip a few days
      while (day <= maxDays) {
        day++;
        const nextPos = calcPlanetPosition(startJd + day, 'sun');
        if (!isInRanges(nextPos.longitude, [match])) break;
      }
      day--; // will be incremented by for loop
      if (results.length >= 90) break; // enough for 3-year coverage
    }
  }

  return results;
}

/**
 * Find Moon transit dates within a date range where:
 * 1. Moon is in a ruling-planet-governed position (sign+star match)
 * 2. Day of week matches a ruling planet
 *
 * Moon moves ~13°/day, so step 0.25 days (6 hours).
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
  const step = 0.25; // 6-hour steps

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
 *
 * @param {Object} dashaBalance - from calculateDashaBalance()
 * @param {Object} significators - house significators from calculateAllSignificators()
 * @param {string} questionCategory - e.g. 'marriage', 'job'
 * @param {Date} judgmentDate - judgment date
 * @returns {Object|null} Dasha-based timing prediction
 */
function findDashaTiming(dashaBalance, significators, questionCategory, judgmentDate) {
  if (!dashaBalance || !significators || !questionCategory) return null;

  const qHouses = getQuestionHouses(questionCategory);
  const favorable = new Set(qHouses.favorable);
  const now = judgmentDate.getTime();

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
      const baseScore = (mahaFav ? favorableScore(mahaLord) : 0) + favorableScore(bhukti.lord);

      // Drill into Anthras if available (now pre-computed for all near-future Bhuktis)
      if (bhukti.anthras) {
        for (const anthra of bhukti.anthras) {
          const aEnd = new Date(anthra.endDate).getTime();
          if (aEnd <= now) continue;
          if (signifiesFavorable(anthra.lord)) {
            const aStart = new Date(anthra.startDate).getTime();
            results.push({
              date: new Date(Math.max(aStart, now)).toISOString().split('T')[0],
              endDate: new Date(aEnd).toISOString().split('T')[0],
              mahaDasha: mahaLord,
              bhukti: bhukti.lord,
              anthra: anthra.lord,
              confidence,
              score: baseScore + favorableScore(anthra.lord),
              method: 'dasha-anthra',
              description: `${mahaLord}-${bhukti.lord}-${anthra.lord} Dasha period`,
            });
          }
        }
      }

      // Bhukti-level match as fallback (only if no Anthra matches found for this bhukti)
      const bhuktiAnthraResults = results.filter(r => r.bhukti === bhukti.lord && r.method === 'dasha-anthra');
      if (bhuktiAnthraResults.length === 0) {
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
  // Search current Maha Dasha for favorable Bhukti/Anthra
  // Anthras are now pre-computed for all Bhuktis within 2 years of judgment
  let results = searchBhuktis(bhuktis, mahaDashaLord, mahaIsFavorable);

  // If current Maha Dasha has < 6 months remaining OR found nothing useful,
  // also search the NEXT Maha Dasha's Bhuktis for favorable periods.
  const remainingMonths = dashaBalance.mahaDasha.remainingDays / 30.44;
  if (remainingMonths < 6 || results.length === 0) {
    const nextMahaLord = VIMSHOTTARI_ORDER[
      (VIMSHOTTARI_ORDER.indexOf(mahaDashaLord) + 1) % 9
    ];
    const nextMahaYears = VIMSHOTTARI_YEARS[nextMahaLord];
    const nextMahaStart = new Date(dashaBalance.mahaDasha.endDate);
    const nextBhuktis = calculateSubPeriods(nextMahaLord, nextMahaStart, nextMahaYears);
    const nextMahaFavorable = signifiesFavorable(nextMahaLord);
    const nextResults = searchBhuktis(nextBhuktis, nextMahaLord, nextMahaFavorable);
    results = results.concat(nextResults);
  }

  // Sort: deprioritize nearly-expired periods (end within 14 days), then by score, then by date
  const minUsefulEndMs = judgmentDate.getTime() + 14 * 86400000;
  results.sort((a, b) => {
    const aExpiring = new Date(a.endDate).getTime() < minUsefulEndMs;
    const bExpiring = new Date(b.endDate).getTime() < minUsefulEndMs;
    if (aExpiring !== bExpiring) return aExpiring ? 1 : -1; // push expiring to end
    return b.score - a.score || new Date(a.date) - new Date(b.date);
  });

  return {
    periods: results.slice(0, 10),
    best: results.length > 0 ? results[0] : null,
    mahaDashaFavorable: mahaIsFavorable,
  };
}

/**
 * Find Dasha periods where lords ARE ruling planets (book's timing method).
 *
 * KP Reader VI timing: events fructify when Dasha/Bhukti/Anthra lords
 * ARE ruling planets — not necessarily house significators.
 * This complements findDashaTiming() which checks house signification.
 */
function findRulingPlanetDashaPeriods(dashaBalance, rulingPlanets, judgmentDate) {
  if (!dashaBalance || !rulingPlanets || rulingPlanets.length === 0) return [];

  const rpSet = new Set(rulingPlanets);
  const now = judgmentDate.getTime();
  const results = [];

  const mahaDashaLord = dashaBalance.mahaDasha.lord;
  const mahaIsRP = rpSet.has(mahaDashaLord);

  for (const bhukti of (dashaBalance.bhuktis || [])) {
    const bEnd = new Date(bhukti.endDate).getTime();
    if (bEnd <= now) continue;

    const bhuktiIsRP = rpSet.has(bhukti.lord);
    // Require at least bhukti lord to be a ruling planet
    // (maha lord match is a bonus but not required — it's a long period)
    if (!bhuktiIsRP && !mahaIsRP) continue;

    const bStart = new Date(bhukti.startDate).getTime();
    const periodStart = Math.max(bStart, now);
    const rpCount = (mahaIsRP ? 1 : 0) + (bhuktiIsRP ? 1 : 0);

    // Drill into Anthras for precise windows
    if (bhukti.anthras) {
      for (const anthra of bhukti.anthras) {
        const aEnd = new Date(anthra.endDate).getTime();
        if (aEnd <= now) continue;
        const anthraIsRP = rpSet.has(anthra.lord);
        const totalRP = rpCount + (anthraIsRP ? 1 : 0);
        // Require at least 2 of 3 lords to be ruling planets
        if (totalRP >= 2) {
          const aStart = new Date(anthra.startDate).getTime();
          results.push({
            date: new Date(Math.max(aStart, now)).toISOString().split('T')[0],
            endDate: new Date(aEnd).toISOString().split('T')[0],
            mahaDasha: mahaDashaLord,
            bhukti: bhukti.lord,
            anthra: anthra.lord,
            confidence: totalRP === 3 ? 'high' : 'medium',
            score: totalRP * 5, // simple scoring based on RP match count
            method: 'dasha-rp-anthra',
            description: `${mahaDashaLord}-${bhukti.lord}-${anthra.lord} (RP-match)`,
          });
        }
      }
    }

    // Bhukti-level fallback if no anthra matches
    const bhuktiAnthras = results.filter(r => r.bhukti === bhukti.lord && r.method === 'dasha-rp-anthra');
    if (bhuktiAnthras.length === 0 && rpCount >= 2) {
      results.push({
        date: new Date(periodStart).toISOString().split('T')[0],
        endDate: bhukti.endDate.split('T')[0],
        mahaDasha: mahaDashaLord,
        bhukti: bhukti.lord,
        anthra: null,
        confidence: 'medium',
        score: rpCount * 5,
        method: 'dasha-rp-bhukti',
        description: `${mahaDashaLord}-${bhukti.lord} (RP-match)`,
      });
    }
  }

  // Sort by score desc, then date asc
  const minUsefulEndMs = now + 14 * 86400000;
  results.sort((a, b) => {
    const aExpiring = new Date(a.endDate).getTime() < minUsefulEndMs;
    const bExpiring = new Date(b.endDate).getTime() < minUsefulEndMs;
    if (aExpiring !== bExpiring) return aExpiring ? 1 : -1;
    return b.score - a.score || new Date(a.date) - new Date(b.date);
  });

  return results;
}

/**
 * Check if a date falls within any favorable dasha period.
 * Accepts either a dashaTiming object or a flat array of periods.
 */
function isWithinDashaPeriod(dateStr, dashaTimingOrPeriods) {
  let periods;
  if (Array.isArray(dashaTimingOrPeriods)) {
    periods = dashaTimingOrPeriods;
  } else if (dashaTimingOrPeriods && dashaTimingOrPeriods.periods) {
    periods = dashaTimingOrPeriods.periods;
  } else {
    return false;
  }
  const dt = new Date(dateStr).getTime();
  return periods.some(p => {
    const start = new Date(p.date).getTime();
    const end = new Date(p.endDate).getTime();
    return dt >= start && dt <= end;
  });
}

/**
 * Find dates where Sun transit AND favorable dasha period overlap.
 * This is the strongest timing indicator — transit + dasha agreement.
 * Accepts combined periods from both house-based and RP-based dasha search.
 */
function findTransitDashaIntersection(sunTransits, allDashaPeriods, allMoonResults, rulingPlanets) {
  if (!allDashaPeriods || allDashaPeriods.length === 0 || sunTransits.length === 0) return [];

  const rpSet = new Set(rulingPlanets || []);
  const intersections = [];
  for (const period of allDashaPeriods) {
    const pStart = new Date(period.date).getTime();
    const pEnd = new Date(period.endDate).getTime();

    // KP timing: bonus when anthra lord IS a ruling planet (book's primary method)
    const anthraIsRP = period.anthra && rpSet.has(period.anthra);
    const rpBonus = anthraIsRP ? 5 : 0;

    for (const st of sunTransits) {
      const stTime = new Date(st.date).getTime();
      if (stTime >= pStart && stTime <= pEnd) {
        // Find Moon+Day matches near this Sun transit within dasha period
        const moonMatches = (allMoonResults || []).filter(m => {
          const mTime = new Date(m.date).getTime();
          return mTime >= pStart && mTime <= pEnd && Math.abs(m.jd - st.jd) <= 15;
        });

        intersections.push({
          sunTransit: st,
          dashaPeriod: period,
          moonMatches,
          score: period.score + (moonMatches.length > 0 ? 10 : 0) + rpBonus,
          bestDate: moonMatches.length > 0 ? moonMatches[0].date : st.date,
          bestDayName: moonMatches.length > 0 ? moonMatches[0].dayName : DAY_LORDS[st.dayOfWeek].en,
          confidence: moonMatches.length > 0 ? 'high' : 'medium',
          method: moonMatches.length > 0 ? 'transit-dasha-moon' : 'transit-dasha',
        });
      }
    }
  }

  // Sort by score (highest first), then chronologically as tiebreaker
  return intersections.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return new Date(a.bestDate).getTime() - new Date(b.bestDate).getTime();
  });
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
 * @returns {Object} Timing predictions
 */
function calculateEventTiming(rulingPlanets, significators, planets, questionCategory, judgmentDate, houses, dashaBalance) {
  const jd = dateToJulianDay(judgmentDate);

  // Step 1: Build target positions (sign + star + sub = all ruling planets)
  const targetPositions = findTargetPositions(rulingPlanets, planets);

  // Step 2: Build relaxed positions (sign + star = ruling) for Moon transit
  const relaxedPositions = findRelaxedPositions(rulingPlanets, planets);

  // Step 3: Determine effective targets for Sun transit
  // When strict targets = 0 (too few ruling planets), fall back to relaxed/star-sub
  let effectiveTargets = targetPositions;
  let matchLevel = 'strict'; // sign+star+sub

  if (targetPositions.length === 0) {
    effectiveTargets = relaxedPositions;
    matchLevel = 'relaxed'; // sign+star only
  }

  if (effectiveTargets.length === 0) {
    // Ultra-relaxed: star+sub match (any sign)
    effectiveTargets = findStarSubPositions(rulingPlanets, planets);
    matchLevel = 'star-sub';
  }

  // Step 4: Sun transit — find when Sun enters effective target positions
  // Search up to 3 years (1095 days) to cover long-range dasha periods.
  // Sun targets repeat annually, but we need to find which year aligns with dasha.
  const sunTransits = findSunTransit(jd, effectiveTargets, 1095);
  const sunTransit = sunTransits.length > 0 ? sunTransits[0] : null;

  // Step 5: Moon transit — search around EACH Sun transit for Moon+DayLord matches
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

  const moonTransitResults = moonBySunTransit.length > 0 ? moonBySunTransit[0].moonResults : [];

  // Also check near-term (next 60 days from judgment)
  const nearTermMoon = findMoonTransitDates(
    jd, jd + 60, targetPositions, relaxedPositions, rulingPlanets
  );

  // Step 6: Dasha-based timing (long-term)
  // Method A: House signification — bhukti lord signifies favorable houses
  const dashaTiming = dashaBalance
    ? findDashaTiming(dashaBalance, significators, questionCategory, judgmentDate)
    : null;

  // Method B: Ruling planet match — bhukti/anthra lords ARE ruling planets (book's timing method)
  const rpDashaPeriods = dashaBalance
    ? findRulingPlanetDashaPeriods(dashaBalance, rulingPlanets, judgmentDate)
    : [];

  // Merge both methods' periods (deduplicated by date range)
  const allDashaPeriods = [];
  const seenPeriodKeys = new Set();
  const addPeriod = (p) => {
    const key = `${p.date}-${p.endDate}-${p.bhukti}`;
    if (!seenPeriodKeys.has(key)) {
      seenPeriodKeys.add(key);
      allDashaPeriods.push(p);
    }
  };
  if (dashaTiming && dashaTiming.periods) dashaTiming.periods.forEach(addPeriod);
  rpDashaPeriods.forEach(addPeriod);

  // Step 7: Transit × Dasha intersection (using merged periods)
  let transitDashaIntersections = findTransitDashaIntersection(
    sunTransits, allDashaPeriods, allMoonTransitResults, rulingPlanets
  );

  // Step 7b: For ALL dasha periods, search for star-only Sun transits (book's method:
  // "Sun transits the constellation of a ruling planet"). This is more relaxed than
  // strict/relaxed matching and captures cases like Sun in Hasta (Moon star in Virgo)
  // where sign lord (Mercury) isn't an RP but star lord (Moon) is.
  // Within each dasha period, find the best Moon+Day match near each star-only transit.
  {
    const rpSet = new Set(rulingPlanets);
    const starOnlyPositions = findStarOnlyPositions(rulingPlanets, planets);

    for (const period of allDashaPeriods) {
      const pStartJd = dateToJulianDay(new Date(period.date));
      const pEndJd = dateToJulianDay(new Date(period.endDate));
      const periodDuration = Math.floor(pEndJd - pStartJd) + 1;
      if (periodDuration <= 0) continue;

      // Find star-only Sun transits within this period
      const starTransits = findSunTransit(pStartJd, starOnlyPositions, periodDuration);
      if (starTransits.length === 0) continue;

      // RP-anthra bonus (same as Step 7)
      const anthraIsRP = period.anthra && rpSet.has(period.anthra);
      const rpBonus = anthraIsRP ? 5 : 0;

      // For each transit, find Moon+Day matches nearby within the period
      const pStartMs = new Date(period.date).getTime();
      const pEndMs = new Date(period.endDate).getTime();

      for (const st of starTransits) {
        const moonResults = findMoonTransitDates(
          st.jd - 15, st.jd + 15, targetPositions, relaxedPositions, rulingPlanets
        );
        const moonInPeriod = moonResults.filter(m => {
          const mTime = new Date(m.date).getTime();
          return mTime >= pStartMs && mTime <= pEndMs;
        });

        if (moonInPeriod.length > 0) {
          transitDashaIntersections.push({
            sunTransit: st,
            dashaPeriod: period,
            moonMatches: moonInPeriod,
            score: period.score + 10 + rpBonus,
            bestDate: moonInPeriod[0].date,
            bestDayName: moonInPeriod[0].dayName,
            confidence: 'high',
            method: 'transit-dasha-star-moon',
          });
        }
      }
    }

    // Re-sort by score (highest first), then chronologically
    transitDashaIntersections.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return new Date(a.bestDate).getTime() - new Date(b.bestDate).getTime();
    });
  }

  // Step 8: Compile prominent dates
  const prominentDates = [];

  // Add intersection dates — best per dasha period, PLUS additional star-only dates
  // that might differ from strict transit dates within the same period.
  {
    const seenDates = new Set();
    const periodBest = new Map();
    const starOnlyDates = []; // star-only intersections not yet covered

    for (const ix of transitDashaIntersections) {
      const periodKey = `${ix.dashaPeriod.date}-${ix.dashaPeriod.endDate}`;
      if (!periodBest.has(periodKey)) {
        periodBest.set(periodKey, ix);
      } else if (ix.method === 'transit-dasha-star-moon' && !seenDates.has(ix.bestDate)) {
        // Additional star-only dates within already-seen periods
        starOnlyDates.push(ix);
      }
    }

    // Add best per period
    for (const ix of periodBest.values()) {
      seenDates.add(ix.bestDate);
      prominentDates.push({
        date: ix.bestDate,
        description: `Transit+Dasha: Sun in ${ix.sunTransit.targetRange.sign} during ${ix.dashaPeriod.description}${ix.moonMatches.length > 0 ? ' + Moon+Day match' : ''}`,
        confidence: ix.confidence,
        source: 'transit-dasha-intersection',
      });
    }
    // Add unique star-only dates not already covered
    for (const ix of starOnlyDates) {
      if (seenDates.has(ix.bestDate)) continue;
      seenDates.add(ix.bestDate);
      prominentDates.push({
        date: ix.bestDate,
        description: `Transit+Dasha: Sun in ${ix.sunTransit.targetRange.sign} (star-only) during ${ix.dashaPeriod.description} + Moon+Day match`,
        confidence: ix.confidence,
        source: 'transit-dasha-star',
      });
    }
  }

  // Add Sun transit dates
  for (const st of sunTransits.slice(0, 5)) {
    const dayName = DAY_LORDS[st.dayOfWeek].en;
    prominentDates.push({
      date: st.date,
      description: `Sun transits ${st.targetRange.sign} (${st.targetRange.signLord} sign, ${st.targetRange.starLord} star, ${st.targetRange.subLord} sub) at ${st.degree.toFixed(2)}° — ${dayName}`,
      confidence: matchLevel === 'strict' ? 'month-indicator' : 'low',
      source: 'sun-transit',
    });
  }

  // Add Moon+DayLord matched dates (deduplicated)
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

  // Add Dasha-based timing dates (merged house-based + RP-based)
  const seenDashaDates = new Set();
  for (const dp of allDashaPeriods.slice(0, 5)) {
    const key = `${dp.date}-${dp.endDate}`;
    if (seenDashaDates.has(key)) continue;
    seenDashaDates.add(key);
    prominentDates.push({
      date: dp.date,
      endDate: dp.endDate,
      description: `Dasha: ${dp.description}`,
      confidence: dp.confidence,
      source: 'dasha',
    });
  }

  // Jupiter transit — step 7 days, check ~3 years
  const jupiterTransit = findSlowPlanetTransit('jupiter', jd, effectiveTargets, 7, 220);

  // Saturn transit — step 7 days, check ~3 years
  const saturnTransit = findSlowPlanetTransit('saturn', jd, effectiveTargets, 7, 220);

  // Step 9: Determine best predicted date
  // NEW PRIORITY ORDER (items 2, 4, 6):
  //   1. Transit-Dasha intersection with Moon+Day match (all 3 agree)
  //   2. Transit-Dasha intersection without Moon match (Sun transit within favorable dasha)
  //   3. Dasha-aligned strict Moon+Day match
  //   4. Any strict Moon+Day match (original behavior)
  //   5. Dasha-aligned relaxed Moon+Day match
  //   6. Any relaxed Moon+Day match
  //   7. Sun transit alone (month-level)
  //   8. Dasha period alone (when 0 transit targets)
  //   9. Jupiter/Saturn transit (year-level fallback)
  let bestPredictedDate = null;

  // Filter out intersections too close to judgment (event hasn't happened yet).
  // Per KP methodology, the querent asks because the event is pending. Skip dates
  // within the first 30 days — if event were imminent, they likely wouldn't ask.
  const minLeadMs = 30 * 86400000;
  const judgmentMs = judgmentDate.getTime();
  const futureIntersections = transitDashaIntersections.filter(ix => {
    const ixMs = new Date(ix.bestDate).getTime();
    return ixMs >= judgmentMs + minLeadMs;
  });
  // Fallback to all intersections if nothing passes the 30-day filter
  const usableIntersections = futureIntersections.length > 0 ? futureIntersections : transitDashaIntersections;

  // Priority 1-2: Transit-Dasha intersection
  if (usableIntersections.length > 0) {
    const best = usableIntersections[0];
    bestPredictedDate = {
      date: best.bestDate,
      dayName: best.bestDayName,
      confidence: best.confidence,
      method: best.method,
      description: best.moonMatches.length > 0
        ? 'Transit + Dasha + Moon+Day alignment'
        : 'Sun transit within favorable Dasha period',
    };
  }

  // Priority 3-6: Moon matches, preferring dasha-aligned ones
  if (!bestPredictedDate) {
    const allStrictWithContext = [];
    const allRelaxedWithContext = [];
    for (const { sunTransit: st, moonResults } of moonBySunTransit) {
      for (const mr of moonResults) {
        const daysFromSun = Math.abs(mr.jd - st.jd);
        const dashaAligned = isWithinDashaPeriod(mr.date, allDashaPeriods);
        const entry = { ...mr, parentSunDate: st.date, daysFromSun, dashaAligned };
        if (mr.matchType === 'strict') {
          allStrictWithContext.push(entry);
        } else {
          allRelaxedWithContext.push(entry);
        }
      }
    }

    // Sort: dasha-aligned first, then by distance from Sun transit
    const sortByDashaAlignment = (a, b) => {
      if (a.dashaAligned !== b.dashaAligned) return a.dashaAligned ? -1 : 1;
      return a.daysFromSun - b.daysFromSun;
    };

    if (allStrictWithContext.length > 0) {
      allStrictWithContext.sort(sortByDashaAlignment);
      const best = allStrictWithContext[0];
      bestPredictedDate = {
        date: best.date,
        dayName: best.dayName,
        confidence: best.dashaAligned ? 'high' : 'high',
        method: best.dashaAligned ? 'moon-day-dasha-aligned' : 'moon-day-match',
        description: best.dashaAligned
          ? 'Sun + Moon + Day Lord + Dasha alignment'
          : 'Sun + Moon + Day Lord alignment',
      };
    } else if (allRelaxedWithContext.length > 0) {
      allRelaxedWithContext.sort(sortByDashaAlignment);
      const best = allRelaxedWithContext[0];
      bestPredictedDate = {
        date: best.date,
        dayName: best.dayName,
        confidence: best.dashaAligned ? 'medium' : 'medium',
        method: best.dashaAligned ? 'moon-day-relaxed-dasha' : 'moon-day-relaxed',
        description: best.dashaAligned
          ? 'Sun + Moon transit + Dasha alignment'
          : 'Sun + Moon transit alignment',
      };
    }
  }

  // Priority 7: Sun transit alone
  if (!bestPredictedDate && sunTransit) {
    bestPredictedDate = {
      date: sunTransit.date,
      dayName: DAY_LORDS[sunTransit.dayOfWeek].en,
      confidence: 'low',
      method: 'sun-transit',
      description: `Sun transit (month-level estimate${matchLevel !== 'strict' ? ', ' + matchLevel + ' match' : ''})`,
    };
  }

  // Priority 8: Dasha period alone (from either house-based or RP-based)
  if (!bestPredictedDate && allDashaPeriods.length > 0) {
    const usablePeriods = allDashaPeriods.filter(p => {
      const endMs = new Date(p.endDate).getTime();
      return endMs > judgmentDate.getTime() + 14 * 86400000;
    });
    const best = usablePeriods.length > 0 ? usablePeriods[0] : allDashaPeriods[0];
    bestPredictedDate = {
      date: best.date,
      confidence: best.confidence === 'high' ? 'medium' : 'low',
      method: 'dasha-period',
      description: `${best.description} (Dasha period)`,
    };
  }

  // Priority 9: Jupiter/Saturn transit
  if (!bestPredictedDate && jupiterTransit) {
    bestPredictedDate = {
      date: jupiterTransit.date,
      confidence: 'low',
      method: 'jupiter-transit',
      description: 'Jupiter transit (year-level estimate)',
    };
  }

  return {
    fruitfulSignificators: rulingPlanets,
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
    dashaTiming,
  };
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

module.exports = {
  calculateEventTiming,
  findFruitfulSignificators,
  findGovernedPositions,
  findTargetPositions,
  findMoonTransitDates,
  findSunTransit,
};
