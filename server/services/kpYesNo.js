/**
 * KP Yes/No Determination — Book-Faithful Method
 *
 * Based on K.S. Krishnamurti's "KP Reader VI: Horary Astrology"
 *
 * The book's method (extracted from 32 worked examples):
 * 1. Find sub-lord of the relevant house cusp
 * 2. Find which constellation (nakshatra) the sub-lord is deposited in
 * 3. The lord of that constellation controls the sub-lord's results
 * 4. KEY CHECKS (in order of priority):
 *    a. Constellation lord retrograde (non-shadow) → DENIAL
 *    b. Sub-lord retrograde (non-shadow) → weakens/delays
 *    c. Sub-lord's house occupation → if in favorable house → YES
 *    d. Constellation lord's house occupation → if favorable → YES
 *    e. Constellation lord's ownership → check favorable/unfavorable
 *    f. Default → YES (book leans YES when both direct and neutral)
 *
 * NOTE: Rahu/Ketu are always retrograde (shadow planets) — not penalized.
 * Moon is never retrograde — always safe.
 */
const { getNakshatraFromDegree } = require('./nakshatra');
const { getSubByDegree } = require('../data/kpSubTable');
const { getQuestionHouses } = require('../data/kpQuestionHouses');
const { getHousesSignifiedByPlanet, getHouseOfPlanet, getSignLord } = require('./kpSignificators');

// Shadow planets are always retrograde — don't penalize them
const SHADOW_PLANETS = ['rahu', 'ketu'];

function isPenalizableRetrograde(planet, planets) {
  if (SHADOW_PLANETS.includes(planet)) return false;
  if (planet === 'moon') return false; // Moon never retrograde
  return planets[planet] && planets[planet].isRetrograde;
}

function buildResult(verdict, primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
  constellationLord, housesSignified, score, reasoning, houseMapping) {
  return {
    verdict,
    primaryCusp,
    cuspDegree,
    subLord,
    subLordDegree: subLordDeg,
    subLordNakshatra: subLordNak,
    constellationLord,
    housesSignified,
    favHouses: score.favHouses || [],
    unfavHouses: score.unfavHouses || [],
    reasoning,
    houseMapping,
  };
}

function makeResult(verdict, primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
  constellationLord, reasoning, houseMapping) {
  return buildResult(verdict, primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
    constellationLord, [], { favHouses: [], unfavHouses: [] }, reasoning, houseMapping);
}

/**
 * Multi-cusp check for health/recovery questions.
 * Per book Ex.28: Also check 11th cusp (cure). If 11th cusp sub-lord is in an
 * unfavorable house for health OR is retrograde → cure denied → override to NO.
 */
function healthCureCheck(houses, planets, favorable, unfavorable, reasoning) {
  const cusp11Deg = houses[10]; // 11th cusp (0-indexed)
  const cusp11Sub = getSubByDegree(cusp11Deg);
  const cureSubLord = cusp11Sub.subLord;
  reasoning.push('[Multi-cusp] 11th cusp (cure) sub-lord: ' + cureSubLord);

  if (!planets[cureSubLord]) return null;

  const cureDeg = planets[cureSubLord].longitude;
  let cureHouse = getHouseOfPlanet(cureDeg, houses);

  // For shadow planets, use sign lord
  if (SHADOW_PLANETS.includes(cureSubLord)) {
    const sl = getSignLord(cureDeg);
    if (planets[sl]) cureHouse = getHouseOfPlanet(planets[sl].longitude, houses);
  }

  // Check if cure sub-lord is in unfavorable house for health
  if (unfavorable.includes(cureHouse)) {
    reasoning.push('[Multi-cusp] 11th cusp sub-lord ' + cureSubLord + ' in unfavorable house ' + cureHouse + ' — cure denied');
    return 'NO';
  }

  // Check if cure sub-lord is retrograde
  if (isPenalizableRetrograde(cureSubLord, planets)) {
    reasoning.push('[Multi-cusp] 11th cusp sub-lord ' + cureSubLord + ' is retrograde — cure denied');
    return 'NO';
  }

  return null; // No override
}

/**
 * Analyze yes/no for a question using KP sub-lord method.
 * Follows the book's approach faithfully.
 */
function analyzeYesNo(questionCategory, houses, planets, significators) {
  const houseMapping = getQuestionHouses(questionCategory);
  const { favorable, unfavorable, primaryCusp } = houseMapping;
  const reasoning = [];

  // Step 1: Get the cusp degree
  const cuspDegree = houses[primaryCusp - 1];
  reasoning.push('Primary cusp: House ' + primaryCusp + ' at ' + cuspDegree.toFixed(2) + '°');

  // Step 2: Find sub-lord of the cusp
  const cuspSub = getSubByDegree(cuspDegree);
  const subLord = cuspSub.subLord;
  reasoning.push('Sub-lord of cusp ' + primaryCusp + ': ' + subLord);

  // Step 3: Find constellation the sub-lord is in
  if (!planets[subLord]) {
    return {
      verdict: 'NO',
      primaryCusp,
      subLord,
      reasoning: ['Sub-lord planet not found in chart — defaulting NO'],
      houseMapping,
    };
  }
  const subLordDeg = planets[subLord].longitude;
  const subLordNak = getNakshatraFromDegree(subLordDeg);
  const constellationLord = subLordNak.lord;
  reasoning.push(subLord + ' is in ' + subLordNak.nakshatra.en + ' (lord: ' + constellationLord + ')');

  // House placements (book's primary indicators)
  const subLordHouse = getHouseOfPlanet(subLordDeg, houses);
  const subInFav = favorable.includes(subLordHouse);
  const subInUnfav = unfavorable.includes(subLordHouse);
  reasoning.push('Sub-lord ' + subLord + ' occupies house ' + subLordHouse +
    (subInFav ? ' (favorable)' : subInUnfav ? ' (unfavorable)' : ' (neutral)'));

  // For shadow planets, also compute sign lord's house (used as fallback in Check 3)
  let shadowSignLordHouse = null;
  let shadowSignLord = null;
  if (SHADOW_PLANETS.includes(subLord)) {
    shadowSignLord = getSignLord(subLordDeg);
    if (planets[shadowSignLord]) {
      shadowSignLordHouse = getHouseOfPlanet(planets[shadowSignLord].longitude, houses);
      reasoning.push(subLord + ' sign lord: ' + shadowSignLord + ' in house ' + shadowSignLordHouse);
    }
  }

  let constLordHouse = null;
  let constInFav = false;
  let constInUnfav = false;
  if (planets[constellationLord]) {
    const constLordDeg = planets[constellationLord].longitude;
    constLordHouse = getHouseOfPlanet(constLordDeg, houses);
    constInFav = favorable.includes(constLordHouse);
    constInUnfav = unfavorable.includes(constLordHouse);
    reasoning.push('Constellation lord ' + constellationLord + ' occupies house ' + constLordHouse +
      (constInFav ? ' (favorable)' : constInUnfav ? ' (unfavorable)' : ' (neutral)'));
  }

  // ─── CHECK 1: Constellation lord retrograde ───
  // Per book: retrograde constellation lord means the sub-lord's results are blocked/delayed.
  // Ex.31: Rahu (shadow) + Saturn retro → NO (shadow planet fully depends on const lord)
  // Ex.25: Moon (direct real) + Jupiter retro → YES (real direct sub-lord can still deliver)
  // Rule: shadow sub-lord + retro const lord → NO; real direct sub-lord + retro const lord → YES_WITH_DELAY
  if (isPenalizableRetrograde(constellationLord, planets)) {
    reasoning.push('CRITICAL: Constellation lord ' + constellationLord + ' is RETROGRADE');
    if (subInFav) {
      reasoning.push('BUT sub-lord ' + subLord + ' in favorable house ' + subLordHouse + ' — rescues verdict');
      reasoning.push('VERDICT: YES_WITH_DELAY — sub-lord position overrides retrograde constellation lord');
      return makeResult('YES_WITH_DELAY', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
        constellationLord, reasoning, houseMapping);
    }
    // Shadow planet sub-lord has no independent motion — fully depends on constellation lord
    if (SHADOW_PLANETS.includes(subLord)) {
      reasoning.push('Sub-lord ' + subLord + ' is a shadow planet with no independent motion');
      reasoning.push('VERDICT: NO — shadow sub-lord depends on retrograde constellation lord');
      return makeResult('NO', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
        constellationLord, reasoning, houseMapping);
    }
    // Real planet sub-lord in direct motion can still deliver, but with delay
    if (!isPenalizableRetrograde(subLord, planets)) {
      reasoning.push('Sub-lord ' + subLord + ' is direct — can still deliver results with delay');
      reasoning.push('VERDICT: YES_WITH_DELAY — event delayed by retrograde constellation lord');
      return makeResult('YES_WITH_DELAY', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
        constellationLord, reasoning, houseMapping);
    }
    reasoning.push('VERDICT: NO — both sub-lord and constellation lord weakened');
    return makeResult('NO', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
      constellationLord, reasoning, houseMapping);
  }

  // ─── CHECK 2: Sub-lord retrograde → delays ───
  let retroWarning = false;
  if (isPenalizableRetrograde(subLord, planets)) {
    reasoning.push('WARNING: Sub-lord ' + subLord + ' is retrograde — delays indicated');
    retroWarning = true;
  }

  // ─── CHECK 3: Sub-lord's house occupation (book's primary indicator) ───
  // Per book: "Venus in 6th house = success" (Ex.27), "Ketu in 3rd house = leaving residence → YES" (Ex.21)
  if (subInFav) {
    // For health/recovery: also check 11th cusp (cure) — book Ex.28 checks multiple cusps
    if (questionCategory === 'health' || questionCategory === 'recovery') {
      const cureOverride = healthCureCheck(houses, planets, favorable, unfavorable, reasoning);
      if (cureOverride === 'NO') {
        reasoning.push('VERDICT: NO — primary cusp favorable but cure (11th) denied');
        return makeResult('NO', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
          constellationLord, reasoning, houseMapping);
      }
    }
    const v = retroWarning ? 'YES_WITH_DELAY' : 'YES';
    reasoning.push('VERDICT: ' + v + ' — sub-lord in favorable house ' + subLordHouse);
    return makeResult(v, primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
      constellationLord, reasoning, houseMapping);
  }
  if (subInUnfav) {
    // Sub-lord in unfavorable house — but check if constellation lord rescues
    if (constInFav) {
      reasoning.push('Sub-lord in unfavorable house ' + subLordHouse + ' but constellation lord in favorable house ' + constLordHouse);
      reasoning.push('VERDICT: YES_WITH_DELAY — mixed signals, constellation lord favorable');
      return makeResult('YES_WITH_DELAY', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
        constellationLord, reasoning, houseMapping);
    }
    // For shadow planet sub-lords: use sign lord's house as alternative indicator
    // Shadow planets represent their sign lord, so sign lord's house is more meaningful
    if (SHADOW_PLANETS.includes(subLord) && shadowSignLordHouse !== null) {
      const slInFav = favorable.includes(shadowSignLordHouse);
      const slInUnfav = unfavorable.includes(shadowSignLordHouse);
      if (slInFav) {
        reasoning.push(subLord + ' sign lord ' + shadowSignLord + ' in favorable house ' + shadowSignLordHouse + ' — overrides');
        const v = retroWarning ? 'YES_WITH_DELAY' : 'YES';
        reasoning.push('VERDICT: ' + v + ' — shadow planet sign lord in favorable house');
        return makeResult(v, primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
          constellationLord, reasoning, houseMapping);
      }
      if (!slInUnfav) {
        // Sign lord in neutral house — check if constellation lord in house 11 rescues.
        // In KP, house 11 = "fulfillment of desires" — universally positive.
        // Per book Ex.32: Rahu sub in unfav house, but constellation lord Jupiter in house 11 → YES.
        if (constLordHouse === 11) {
          reasoning.push('Constellation lord ' + constellationLord + ' in house 11 (fulfillment of desires) — event promised');
          const v = retroWarning ? 'YES_WITH_DELAY' : 'YES';
          reasoning.push('VERDICT: ' + v + ' — house 11 constellation lord overrides shadow planet position');
          return makeResult(v, primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
            constellationLord, reasoning, houseMapping);
        }
        // Shadow planet's original position was unfavorable,
        // neutral sign lord is not strong enough to rescue. Stay with NO.
        reasoning.push('VERDICT: NO — ' + subLord + ' in unfavorable house ' + subLordHouse +
          ', sign lord ' + shadowSignLord + ' neutral (not enough to rescue)');
        return makeResult('NO', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
          constellationLord, reasoning, houseMapping);
      } else {
        // Both shadow planet and its sign lord in unfavorable → NO
        reasoning.push('VERDICT: NO — ' + subLord + ' and sign lord both in unfavorable houses');
        return makeResult('NO', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
          constellationLord, reasoning, houseMapping);
      }
    } else if (!SHADOW_PLANETS.includes(subLord)) {
      // For real planet sub-lords, check if constellation lord OWNS favorable houses
      // Per Ex.26: Moon in house 8 (unfav), but Sun owns house 11 (favorable for promotion) → YES
      const tempOwns = [];
      for (let h = 1; h <= 12; h++) {
        if (significators[h].D.includes(constellationLord)) tempOwns.push(h);
      }
      const tempOwnsFav = tempOwns.filter(h => favorable.includes(h));
      const tempOwnsUnfav = tempOwns.filter(h => unfavorable.includes(h));
      if (tempOwnsFav.length > 0 && tempOwnsFav.length > tempOwnsUnfav.length) {
        reasoning.push('Sub-lord in unfavorable house ' + subLordHouse + ' but constellation lord ' +
          constellationLord + ' owns favorable house(s) ' + tempOwnsFav.join(','));
        reasoning.push('VERDICT: YES_WITH_DELAY — constellation lord ownership rescues verdict');
        return makeResult('YES_WITH_DELAY', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
          constellationLord, reasoning, houseMapping);
      }
      reasoning.push('VERDICT: NO — sub-lord in unfavorable house ' + subLordHouse);
      return makeResult('NO', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
        constellationLord, reasoning, houseMapping);
    } else {
      reasoning.push('VERDICT: NO — sub-lord in unfavorable house ' + subLordHouse);
      return makeResult('NO', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
        constellationLord, reasoning, houseMapping);
    }
  }

  // ─── CHECK 4: Constellation lord's house occupation ───
  if (constInFav) {
    const v = retroWarning ? 'YES_WITH_DELAY' : 'YES';
    reasoning.push('VERDICT: ' + v + ' — constellation lord in favorable house ' + constLordHouse);
    return makeResult(v, primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
      constellationLord, reasoning, houseMapping);
  }
  if (constInUnfav) {
    reasoning.push('VERDICT: NO — constellation lord in unfavorable house ' + constLordHouse);
    return makeResult('NO', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
      constellationLord, reasoning, houseMapping);
  }

  // ─── CHECK 5: Constellation lord's house ownership (D-level) ───
  // Check which houses the constellation lord owns (sign lordship)
  const constLordOwns = [];
  for (let h = 1; h <= 12; h++) {
    if (significators[h].D.includes(constellationLord)) {
      constLordOwns.push(h);
    }
  }
  const ownsFav = constLordOwns.filter(h => favorable.includes(h));
  const ownsUnfav = constLordOwns.filter(h => unfavorable.includes(h));
  reasoning.push(constellationLord + ' owns houses: ' + constLordOwns.join(', ') +
    ' (fav: ' + (ownsFav.join(',') || 'none') + ', unfav: ' + (ownsUnfav.join(',') || 'none') + ')');

  if (ownsFav.length > ownsUnfav.length) {
    const v = retroWarning ? 'YES_WITH_DELAY' : 'YES';
    reasoning.push('VERDICT: ' + v + ' — constellation lord owns more favorable houses');
    return makeResult(v, primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
      constellationLord, reasoning, houseMapping);
  }
  if (ownsUnfav.length > ownsFav.length) {
    reasoning.push('VERDICT: NO — constellation lord owns more unfavorable houses');
    return makeResult('NO', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
      constellationLord, reasoning, houseMapping);
  }

  // ─── CHECK 6: Default → YES ───
  // Per book: when sub-lord and constellation lord are both direct and positions are neutral,
  // the event is promised. "Venus in direct motion, in constellation of Moon (never retrograde) → YES" (Ex.16)
  const v = retroWarning ? 'YES_WITH_DELAY' : 'YES';
  reasoning.push('VERDICT: ' + v + ' — both sub-lord and constellation lord in direct motion, event promised');
  return makeResult(v, primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
    constellationLord, reasoning, houseMapping);
}

module.exports = {
  analyzeYesNo,
};
