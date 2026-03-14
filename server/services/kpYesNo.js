/**
 * KP Yes/No Determination — Hybrid Significator Method
 *
 * Based on K.S. Krishnamurti's "KP Reader VI: Horary Astrology"
 *
 * Method (derived from 34 worked examples):
 * 1. Find sub-lord of the relevant house cusp
 * 2. Retrograde filter:
 *    - Constellation lord retrograde → denial for shadow sub-lords, delay for real
 *    - Sub-lord retrograde → delay modifier
 * 3. Sub-lord's house OCCUPATION is the primary indicator (book's approach):
 *    - In favorable house → YES (Ex.4: "Venus in 11th = marriage promised")
 *    - In unfavorable house → check constellation lord signification for rescue
 *    - In neutral house → constellation lord decides
 * 4. Constellation lord analysis (when sub-lord doesn't decide):
 *    - Const lord in favorable house → YES
 *    - Const lord in unfavorable house → NO
 *    - Const lord neutral → use 4-level signification scoring (A>B>C>D)
 * 5. Default → YES (book leans YES when both direct and neutral)
 *
 * The signification scoring (A>B>C>D levels) is used for:
 *    - Rescuing unfavorable sub-lord positions via constellation lord
 *    - Deciding when both occupation checks are neutral
 *    - NOT for overriding favorable occupation (book treats occupation as primary)
 */
const { getNakshatraFromDegree } = require('./nakshatra');
const { getSubByDegree } = require('../data/kpSubTable');
const { getQuestionHouses } = require('../data/kpQuestionHouses');
const { getHousesSignifiedByPlanet, getHouseOfPlanet, getSignLord } = require('./kpSignificators');

const SHADOW_PLANETS = ['rahu', 'ketu'];
const LEVEL_WEIGHTS = { A: 4, B: 3, C: 2, D: 1 };

function isPenalizableRetrograde(planet, planets) {
  if (SHADOW_PLANETS.includes(planet)) return false;
  if (planet === 'moon') return false;
  return planets[planet] && planets[planet].isRetrograde;
}

/**
 * Score a planet's house significations across all 4 levels.
 */
function scoreSignifications(planet, significators, favorable, unfavorable) {
  const significations = getHousesSignifiedByPlanet(planet, significators);
  let favScore = 0, unfavScore = 0;
  const favHouses = [], unfavHouses = [], details = [];

  for (const { house, level } of significations) {
    const weight = LEVEL_WEIGHTS[level];
    if (favorable.includes(house)) {
      favScore += weight;
      if (!favHouses.includes(house)) favHouses.push(house);
      details.push('H' + house + '(' + level + ':+' + weight + ')');
    } else if (unfavorable.includes(house)) {
      unfavScore += weight;
      if (!unfavHouses.includes(house)) unfavHouses.push(house);
      details.push('H' + house + '(' + level + ':-' + weight + ')');
    }
  }

  return { favScore, unfavScore, favHouses, unfavHouses, details, significations };
}

/**
 * Multi-cusp health/cure check — per book Ex.28.
 * If 11th cusp sub-lord is in an unfavorable house or retrograde → cure denied.
 */
function healthCureDenied(houses, planets, unfavorable, reasoning) {
  const cusp11Deg = houses[10];
  const cusp11Sub = getSubByDegree(cusp11Deg);
  const cureSubLord = cusp11Sub.subLord;
  reasoning.push('[Health] 11th cusp sub-lord: ' + cureSubLord);

  if (!planets[cureSubLord]) return false;

  const cureDeg = planets[cureSubLord].longitude;
  let cureHouse = getHouseOfPlanet(cureDeg, houses);

  // Shadow planets: use sign lord's house
  if (SHADOW_PLANETS.includes(cureSubLord)) {
    const sl = getSignLord(cureDeg);
    if (planets[sl]) cureHouse = getHouseOfPlanet(planets[sl].longitude, houses);
  }

  if (unfavorable.includes(cureHouse)) {
    reasoning.push('[Health] 11th sub-lord ' + cureSubLord + ' in unfav H' + cureHouse + ' — cure denied');
    return true;
  }
  if (isPenalizableRetrograde(cureSubLord, planets)) {
    reasoning.push('[Health] 11th sub-lord ' + cureSubLord + ' retrograde — cure denied');
    return true;
  }
  return false;
}

/**
 * Analyze yes/no using KP hybrid significator method.
 */
function analyzeYesNo(questionCategory, houses, planets, significators) {
  const houseMapping = getQuestionHouses(questionCategory);
  const { favorable, unfavorable, primaryCusp } = houseMapping;
  const reasoning = [];

  // ── Step 1: Get cusp sub-lord ──
  const cuspDegree = houses[primaryCusp - 1];
  const cuspSub = getSubByDegree(cuspDegree);
  const subLord = cuspSub.subLord;
  reasoning.push('Cusp ' + primaryCusp + ' at ' + cuspDegree.toFixed(2) + '° → sub-lord: ' + subLord);

  if (!planets[subLord]) {
    return { verdict: 'NO', primaryCusp, subLord, reasoning: ['Sub-lord not found'], houseMapping };
  }

  // ── Step 2: Constellation lord ──
  const subLordDeg = planets[subLord].longitude;
  const subLordNak = getNakshatraFromDegree(subLordDeg);
  const constellationLord = subLordNak.lord;

  // House positions
  const subHouse = getHouseOfPlanet(subLordDeg, houses);
  const subInFav = favorable.includes(subHouse);
  const subInUnfav = unfavorable.includes(subHouse);

  let constHouse = null, constInFav = false, constInUnfav = false;
  if (planets[constellationLord]) {
    constHouse = getHouseOfPlanet(planets[constellationLord].longitude, houses);
    constInFav = favorable.includes(constHouse);
    constInUnfav = unfavorable.includes(constHouse);
  }

  reasoning.push(subLord + ' in ' + subLordNak.nakshatra.en + ' (lord: ' + constellationLord +
    '), house ' + subHouse + (subInFav ? ' [FAV]' : subInUnfav ? ' [UNFAV]' : ' [neutral]'));
  if (constHouse !== null) {
    reasoning.push('Const-lord ' + constellationLord + ' in house ' + constHouse +
      (constInFav ? ' [FAV]' : constInUnfav ? ' [UNFAV]' : ' [neutral]'));
  }

  // Signification scores (computed for all paths, logged for transparency)
  const subScore = scoreSignifications(subLord, significators, favorable, unfavorable);
  const constScore = scoreSignifications(constellationLord, significators, favorable, unfavorable);
  reasoning.push('[Sub ' + subLord + '] fav=' + subScore.favScore + ' unfav=' + subScore.unfavScore +
    ' | ' + subScore.details.join(', '));
  reasoning.push('[Const ' + constellationLord + '] fav=' + constScore.favScore +
    ' unfav=' + constScore.unfavScore + ' | ' + constScore.details.join(', '));

  // ── Step 3: Retrograde checks ──
  const constRetro = isPenalizableRetrograde(constellationLord, planets);
  const subRetro = isPenalizableRetrograde(subLord, planets);

  if (constRetro) reasoning.push('⚠ Constellation lord ' + constellationLord + ' RETROGRADE');
  if (subRetro) reasoning.push('⚠ Sub-lord ' + subLord + ' retrograde — delays');

  // ── VERDICT ──

  // Layer 1: Constellation lord retrograde → strong denial/delay
  if (constRetro) {
    // Sub-lord in favorable house overrides retrograde (Ex.25 pattern)
    if (subInFav) {
      const v = 'YES_WITH_DELAY';
      reasoning.push('VERDICT: ' + v + ' — sub-lord in favorable H' + subHouse + ' overrides retro const lord');
      return mkResult(v, primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
        constellationLord, subScore, constScore, reasoning, houseMapping);
    }
    // Shadow planet fully depends on constellation lord
    if (SHADOW_PLANETS.includes(subLord)) {
      reasoning.push('VERDICT: NO — shadow ' + subLord + ' depends on retro ' + constellationLord);
      return mkResult('NO', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
        constellationLord, subScore, constScore, reasoning, houseMapping);
    }
    // Real direct sub-lord → delay
    if (!subRetro) {
      reasoning.push('VERDICT: YES_WITH_DELAY — direct ' + subLord + ' delivers despite retro const lord');
      return mkResult('YES_WITH_DELAY', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
        constellationLord, subScore, constScore, reasoning, houseMapping);
    }
    reasoning.push('VERDICT: NO — both sub-lord and const lord weakened');
    return mkResult('NO', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
      constellationLord, subScore, constScore, reasoning, houseMapping);
  }

  const delay = subRetro ? 'YES_WITH_DELAY' : 'YES';

  // Layer 2: Sub-lord in favorable house → YES (book's primary indicator)
  // "Venus in 6th = success" (Ex.27), "Ketu in 3rd = leaving residence → YES" (Ex.21)
  if (subInFav) {
    // Health/cure exception: book Ex.28 checks 11th cusp (cure) as secondary denial
    if ((questionCategory === 'health' || questionCategory === 'recovery') &&
        healthCureDenied(houses, planets, unfavorable, reasoning)) {
      reasoning.push('VERDICT: NO — primary cusp favorable but cure (11th cusp) denied');
      return mkResult('NO', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
        constellationLord, subScore, constScore, reasoning, houseMapping);
    }
    reasoning.push('VERDICT: ' + delay + ' — sub-lord in favorable house ' + subHouse);
    return mkResult(delay, primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
      constellationLord, subScore, constScore, reasoning, houseMapping);
  }

  // Layer 3: Sub-lord in unfavorable house → constellation lord must rescue
  if (subInUnfav) {
    // 3a: Const lord in favorable house → rescues (YES_WITH_DELAY)
    if (constInFav) {
      reasoning.push('Sub-lord in unfav H' + subHouse + ' but const lord in fav H' + constHouse);
      reasoning.push('VERDICT: YES_WITH_DELAY — const lord occupation rescues');
      return mkResult('YES_WITH_DELAY', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
        constellationLord, subScore, constScore, reasoning, houseMapping);
    }

    // 3b: Shadow planet → check sign lord's house
    if (SHADOW_PLANETS.includes(subLord)) {
      const signLord = getSignLord(subLordDeg);
      if (planets[signLord]) {
        const slHouse = getHouseOfPlanet(planets[signLord].longitude, houses);
        const slInFav = favorable.includes(slHouse);
        reasoning.push(subLord + ' sign lord ' + signLord + ' in house ' + slHouse);
        if (slInFav) {
          reasoning.push('VERDICT: ' + delay + ' — shadow planet sign lord in favorable house');
          return mkResult(delay, primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
            constellationLord, subScore, constScore, reasoning, houseMapping);
        }
      }
    }

    // 3c: Const lord signification scoring → rescue if favorable >= unfavorable
    if (constScore.favScore >= constScore.unfavScore && constScore.favScore > 0) {
      reasoning.push('Sub-lord in unfav H' + subHouse + ' but const lord signifies fav houses');
      reasoning.push('VERDICT: YES_WITH_DELAY — const lord signification rescues');
      return mkResult('YES_WITH_DELAY', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
        constellationLord, subScore, constScore, reasoning, houseMapping);
    }

    // 3d: Const lord OWNS favorable houses (D-level) — weaker rescue
    // Per book Ex.26: Moon in H8 (unfav), but Sun owns H11 (fav for promotion) → YES
    const constOwns = [];
    for (let h = 1; h <= 12; h++) {
      if (significators[h].D.includes(constellationLord)) constOwns.push(h);
    }
    const ownsFav = constOwns.filter(h => favorable.includes(h));
    const ownsUnfav = constOwns.filter(h => unfavorable.includes(h));
    if (ownsFav.length > 0 && ownsFav.length >= ownsUnfav.length) {
      reasoning.push('Const lord ' + constellationLord + ' owns fav house(s) ' + ownsFav.join(','));
      reasoning.push('VERDICT: YES_WITH_DELAY — const lord ownership rescues');
      return mkResult('YES_WITH_DELAY', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
        constellationLord, subScore, constScore, reasoning, houseMapping);
    }

    // 3e: No rescue → NO
    reasoning.push('VERDICT: NO — sub-lord in unfav H' + subHouse + ', no rescue');
    return mkResult('NO', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
      constellationLord, subScore, constScore, reasoning, houseMapping);
  }

  // Layer 4: Sub-lord in neutral house → constellation lord decides

  // 4a: Const lord in favorable house → YES
  if (constInFav) {
    reasoning.push('VERDICT: ' + delay + ' — const lord in favorable house ' + constHouse);
    return mkResult(delay, primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
      constellationLord, subScore, constScore, reasoning, houseMapping);
  }

  // 4b: Const lord in unfavorable house → NO
  if (constInUnfav) {
    reasoning.push('VERDICT: NO — const lord in unfavorable house ' + constHouse);
    return mkResult('NO', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
      constellationLord, subScore, constScore, reasoning, houseMapping);
  }

  // 4c: Both neutral → default YES per book convention
  // Book: "sub-lord in direct motion, in constellation of direct planet → event promised"
  // Only deny when unfavorable STRONGLY dominates (2× or more)
  const totalFav = subScore.favScore + constScore.favScore;
  const totalUnfav = subScore.unfavScore + constScore.unfavScore;

  // Minimum threshold: unfav must be >= 4 (meaningful) AND >= 2× fav to deny
  if (totalUnfav >= 4 && totalUnfav >= totalFav * 2) {
    reasoning.push('VERDICT: NO — signification strongly unfavorable (fav=' + totalFav + ' unfav=' + totalUnfav + ')');
    return mkResult('NO', primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
      constellationLord, subScore, constScore, reasoning, houseMapping);
  }

  // Layer 5: Default → YES
  reasoning.push('VERDICT: ' + delay + ' — event promised (direct motion, no clear denial)');
  return mkResult(delay, primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
    constellationLord, subScore, constScore, reasoning, houseMapping);
}

function mkResult(verdict, primaryCusp, cuspDegree, subLord, subLordDeg, subLordNak,
  constellationLord, subScore, constScore, reasoning, houseMapping) {
  return {
    verdict,
    primaryCusp,
    cuspDegree,
    subLord,
    subLordDegree: subLordDeg,
    subLordNakshatra: subLordNak,
    constellationLord,
    housesSignified: subScore.significations || [],
    favHouses: subScore.favHouses || [],
    unfavHouses: subScore.unfavHouses || [],
    favScore: (subScore.favScore || 0) + (constScore.favScore || 0),
    unfavScore: (subScore.unfavScore || 0) + (constScore.unfavScore || 0),
    reasoning,
    houseMapping,
  };
}

/**
 * Qualitative interpretation based on sub-lord identity.
 * From KP Reader VI pp.220-221, 254.
 */
const SUB_LORD_QUALITIES = {
  sun:     { en: 'Through government, authority, or father\'s help. Quick and dignified resolution.',
             mr: 'सरकार, अधिकारी किंवा वडिलांच्या मदतीने. जलद आणि प्रतिष्ठित निराकरण.' },
  moon:    { en: 'Quick and friendly outcome. The other party will readily agree.',
             mr: 'जलद आणि मैत्रीपूर्ण निकाल. समोरची व्यक्ती सहज सहमत होईल.' },
  mars:    { en: 'Some tension or conflict in the process. Atmosphere may be charged.',
             mr: 'प्रक्रियेत काही तणाव किंवा संघर्ष. वातावरण तापलेले असू शकते.' },
  mercury: { en: 'Through correspondence, agents, or in instalments. Communication is key.',
             mr: 'पत्रव्यवहार, एजंट किंवा हप्त्यांद्वारे. संवाद महत्त्वाचा.' },
  jupiter: { en: 'Through lawful and legitimate means. Full and honorable outcome.',
             mr: 'कायदेशीर आणि योग्य मार्गाने. पूर्ण आणि सन्मानजनक निकाल.' },
  venus:   { en: 'Through compromise and sweet words. Friendly and pleasant resolution.',
             mr: 'तडजोड आणि गोड शब्दांनी. मैत्रीपूर्ण आणि आनंददायी निराकरण.' },
  saturn:  { en: 'Delay and some obstacles expected. May get a little less than desired.',
             mr: 'विलंब आणि काही अडथळे अपेक्षित. अपेक्षेपेक्षा थोडे कमी मिळू शकते.' },
  rahu:    { en: 'Unexpected or unconventional means. Foreign connections may be involved.',
             mr: 'अनपेक्षित किंवा अपारंपरिक मार्गाने. परदेशी संपर्क असू शकतात.' },
  ketu:    { en: 'Sudden or spiritual dimension to the outcome. May involve hidden factors.',
             mr: 'निकालात अचानक किंवा आध्यात्मिक आयाम. छुपे घटक असू शकतात.' },
};

function getSubLordQuality(subLord) {
  return SUB_LORD_QUALITIES[subLord] || null;
}

module.exports = {
  analyzeYesNo,
  getSubLordQuality,
};
