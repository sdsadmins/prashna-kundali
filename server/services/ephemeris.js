/**
 * Pure JavaScript ephemeris engine using astronomy-engine.
 * No native C bindings — works on Vercel serverless, any platform.
 * Uses KP (Krishnamurti) Ayanamsa for sidereal calculations.
 */
const Astronomy = require('astronomy-engine');

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

// ── Julian Day ──────────────────────────────────────────────
function dateToJulianDay(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const h = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  let Y = y, M = m;
  if (M <= 2) { Y--; M += 12; }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + h / 24 + B - 1524.5;
}

// ── KP (Krishnamurti) Ayanamsa ─────────────────────────────
// Based on Swiss Ephemeris SE_SIDM_KRISHNAMURTI:
//   epoch t0 = J1900 (JD 2415020.0), ayan_t0 = 22.362833°
//   Uses IAU precession in longitude.
function getAyanamsa(julianDay) {
  const T = (julianDay - 2415020.0) / 36525; // Julian centuries from J1900
  // IAU precession in longitude (arcseconds)
  const psi = 5029.0966 * T + 1.11113 * T * T - 0.000006 * T * T * T;
  return 22.362833 + psi / 3600;
}

// ── Obliquity of ecliptic ───────────────────────────────────
function obliquity(jd) {
  const T = (jd - 2451545.0) / 36525; // centuries from J2000
  // IAU formula (arcseconds)
  const eps = 84381.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T;
  return eps / 3600; // degrees
}

// ── Greenwich Mean Sidereal Time (degrees) ──────────────────
function gmst(jd) {
  const T = (jd - 2451545.0) / 36525;
  // IAU formula (seconds of time)
  let theta = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000;
  return ((theta % 360) + 360) % 360;
}

// ── Tropical Ascendant ──────────────────────────────────────
function calcTropicalAscendant(jd, latitude, longitude) {
  const eps = obliquity(jd) * DEG;
  const lst = ((gmst(jd) + longitude) % 360 + 360) % 360; // local sidereal time in degrees
  const ramc = lst * DEG; // RAMC in radians
  const phi = latitude * DEG;

  // Ascendant formula:
  // tan(ASC) = cos(RAMC) / -(sin(eps)*tan(phi) + cos(eps)*sin(RAMC))
  const y = Math.cos(ramc);
  const x = -(Math.sin(eps) * Math.tan(phi) + Math.cos(eps) * Math.sin(ramc));
  let asc = Math.atan2(y, x) * RAD;
  asc = ((asc % 360) + 360) % 360;

  // MC
  let mc = Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) * RAD;
  mc = ((mc % 360) + 360) % 360;

  return { ascendant: asc, mc, lst };
}

// ── House cusps (equal house from ascendant) ────────────────
function calcHouses(julianDay, latitude, longitude) {
  const trop = calcTropicalAscendant(julianDay, latitude, longitude);
  const ayanamsa = getAyanamsa(julianDay);

  const toSidereal = (tropDeg) => ((tropDeg - ayanamsa) % 360 + 360) % 360;

  // Equal houses: each cusp is 30° apart from ascendant
  const tropAsc = trop.ascendant;
  const houses = [];
  for (let i = 0; i < 12; i++) {
    houses.push(toSidereal((tropAsc + i * 30) % 360));
  }

  return {
    ascendant: toSidereal(tropAsc),
    mc: toSidereal(trop.mc),
    houses,
  };
}

// ── Planet positions (sidereal) ─────────────────────────────
const BODY_MAP = {
  sun: 'Sun',
  moon: 'Moon',
  mars: 'Mars',
  mercury: 'Mercury',
  jupiter: 'Jupiter',
  venus: 'Venus',
  saturn: 'Saturn',
};

// Convert Julian Day to astronomy-engine AstroTime
// MakeTime(number) expects UT days since J2000, NOT raw Julian Day
function jdToAstroTime(julianDay) {
  return Astronomy.MakeTime(julianDay - 2451545.0);
}

// Get geocentric tropical ecliptic longitude for any body
function getGeocentricLongitude(bodyName, time) {
  if (bodyName === 'Sun') {
    return Astronomy.SunPosition(time).elon;
  }
  if (bodyName === 'Moon') {
    const geo = Astronomy.GeoMoon(time);
    return Astronomy.Ecliptic(geo).elon;
  }
  // Planets: use GeoVector for geocentric position (not heliocentric EclipticLongitude)
  const geo = Astronomy.GeoVector(bodyName, time, true);
  return Astronomy.Ecliptic(geo).elon;
}

function calcPlanetPosition(julianDay, planetName) {
  const ayanamsa = getAyanamsa(julianDay);

  if (planetName === 'rahu') {
    // Mean longitude of the ascending node (Rahu)
    const T = (julianDay - 2451545.0) / 36525;
    let omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000;
    omega = ((omega % 360) + 360) % 360;
    const sidereal = ((omega - ayanamsa) % 360 + 360) % 360;
    return {
      longitude: sidereal,
      latitude: 0,
      distance: 0,
      speedLong: -0.053,
      isRetrograde: true,
    };
  }

  if (planetName === 'ketu') {
    const rahuPos = calcPlanetPosition(julianDay, 'rahu');
    return {
      longitude: (rahuPos.longitude + 180) % 360,
      latitude: 0,
      distance: 0,
      speedLong: rahuPos.speedLong,
      isRetrograde: true,
    };
  }

  const bodyName = BODY_MAP[planetName];
  if (!bodyName) throw new Error(`Unknown planet: ${planetName}`);

  const time = jdToAstroTime(julianDay);
  const timePlus = jdToAstroTime(julianDay + 1 / 24);

  // Geocentric tropical ecliptic longitude
  const tropLong = getGeocentricLongitude(bodyName, time);
  const tropLongPlus = getGeocentricLongitude(bodyName, timePlus);

  // Get latitude and distance
  let lat = 0, dist = 1.0;
  if (planetName === 'sun') {
    const sunPos = Astronomy.SunPosition(time);
    lat = sunPos.elat;
  } else if (planetName === 'moon') {
    const geo = Astronomy.GeoMoon(time);
    const ecl = Astronomy.Ecliptic(geo);
    lat = ecl.elat;
    dist = geo.Length();
  } else {
    const geo = Astronomy.GeoVector(bodyName, time, true);
    const ecl = Astronomy.Ecliptic(geo);
    lat = ecl.elat;
    dist = geo.Length();
  }

  const sidereal = ((tropLong - ayanamsa) % 360 + 360) % 360;

  // Compute speed for retrograde detection
  let speed = (tropLongPlus - tropLong) * 24; // degrees per day
  if (speed > 180) speed -= 360;
  if (speed < -180) speed += 360;

  return {
    longitude: sidereal,
    latitude: lat,
    distance: dist,
    speedLong: speed,
    isRetrograde: speed < 0,
  };
}

// ── All planet positions ────────────────────────────────────
function getAllPlanetPositions(julianDay) {
  const planets = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
  const positions = {};
  for (const name of planets) {
    positions[name] = calcPlanetPosition(julianDay, name);
  }
  return positions;
}

// ── Master chart calculation ────────────────────────────────
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

// ── Lagna change timing ─────────────────────────────────────
function calculateLagnaChangeTiming(date, latitude, longitude) {
  const NAKSHATRA_SPAN = 13 + 20 / 60;
  const STEP_SECONDS = 60;
  const MAX_STEPS = 300;

  const jd = dateToJulianDay(date);
  const houses = calcHouses(jd, latitude, longitude);
  const currentAsc = ((houses.ascendant % 360) + 360) % 360;

  const currentSignIndex = Math.floor(currentAsc / 30);
  const currentNakIndex = Math.floor(currentAsc / NAKSHATRA_SPAN);

  // Step BACKWARD to find when current lagna sign started
  let lagnaStartTime = null;
  for (let step = 1; step <= MAX_STEPS; step++) {
    const pastDate = new Date(date.getTime() - step * STEP_SECONDS * 1000);
    const pastJd = dateToJulianDay(pastDate);
    const pastHouses = calcHouses(pastJd, latitude, longitude);
    const pastAsc = ((pastHouses.ascendant % 360) + 360) % 360;
    if (Math.floor(pastAsc / 30) !== currentSignIndex) {
      lagnaStartTime = new Date(pastDate.getTime() + STEP_SECONDS * 1000);
      break;
    }
  }

  // Step FORWARD to find when current lagna sign ends
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

  // Step FORWARD to find next nakshatra change
  let nextNakChangeTime = null;
  let nextNakIndex = null;
  for (let step = 1; step <= MAX_STEPS; step++) {
    const futureDate = new Date(date.getTime() + step * STEP_SECONDS * 1000);
    const futureJd = dateToJulianDay(futureDate);
    const futureHouses = calcHouses(futureJd, latitude, longitude);
    const futureAsc = ((futureHouses.ascendant % 360) + 360) % 360;
    if (Math.floor(futureAsc / NAKSHATRA_SPAN) !== currentNakIndex) {
      nextNakChangeTime = futureDate;
      nextNakIndex = Math.floor(futureAsc / NAKSHATRA_SPAN);
      break;
    }
  }

  let nextChange = null;
  let nextChangeType = null;
  if (lagnaEndTime && nextNakChangeTime) {
    if (lagnaEndTime <= nextNakChangeTime) {
      nextChange = lagnaEndTime; nextChangeType = 'sign';
    } else {
      nextChange = nextNakChangeTime; nextChangeType = 'nakshatra';
    }
  } else if (lagnaEndTime) {
    nextChange = lagnaEndTime; nextChangeType = 'sign';
  } else if (nextNakChangeTime) {
    nextChange = nextNakChangeTime; nextChangeType = 'nakshatra';
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

// ── True Placidus cusps from a given tropical ascendant + JD + latitude ───
// Used by KP Horary: horary number → ascendant → derive RAMC → Placidus cusps
//
// Placidus system: each cusp is the ecliptic point that has completed a
// certain fraction of its semi-diurnal (above horizon) or semi-nocturnal
// (below horizon) arc since the MC.
//
// Cusp 11 = 1/3 of DSA, Cusp 12 = 2/3 of DSA
// Cusp 2 = 1/3 of NSA, Cusp 3 = 2/3 of NSA
// Cusps 5,6,8,9 = 180° opposite of 11,12,2,3
function calcPlacidusCuspsFromAsc(tropicalAsc, jd, latitude) {
  const eps = obliquity(jd) * DEG;
  const phi = latitude * DEG;

  // Step 1: Derive RAMC from tropical ascendant (high precision)
  // ASC formula: tan(ASC) = cos(RAMC) / -(sin(eps)*tan(phi) + cos(eps)*sin(RAMC))
  const targetAsc = tropicalAsc;

  function ascFromRamc(ramcDeg) {
    const r = ramcDeg * DEG;
    const y = Math.cos(r);
    const x = -(Math.sin(eps) * Math.tan(phi) + Math.cos(eps) * Math.sin(r));
    let a = Math.atan2(y, x) * RAD;
    return ((a % 360) + 360) % 360;
  }

  // Coarse search: 0.5° steps
  let bestRamc = 0;
  let bestDiff = 999;
  for (let r = 0; r < 360; r += 0.5) {
    const a = ascFromRamc(r);
    let diff = Math.abs(a - targetAsc);
    if (diff > 180) diff = 360 - diff;
    if (diff < bestDiff) { bestDiff = diff; bestRamc = r; }
  }
  // Fine search: 0.0001° steps (0.36 arcseconds precision)
  for (let r = bestRamc - 1; r < bestRamc + 1; r += 0.0001) {
    const rr = ((r % 360) + 360) % 360;
    const a = ascFromRamc(rr);
    let diff = Math.abs(a - targetAsc);
    if (diff > 180) diff = 360 - diff;
    if (diff < bestDiff) { bestDiff = diff; bestRamc = rr; }
  }

  const ramcRad = bestRamc * DEG;

  // Step 2: MC from RAMC
  let mc = Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(eps)) * RAD;
  mc = ((mc % 360) + 360) % 360;

  // Step 3: True Placidus cusps via iterative semi-arc method
  //
  // For a point on the ecliptic at longitude λ:
  //   declination: sin(δ) = sin(ε) × sin(λ)
  //   diurnal semi-arc: DSA = arccos(-tan(φ) × tan(δ))
  //   nocturnal semi-arc: NSA = π - DSA
  //
  // For cusp 11 (f=1/3 of DSA above horizon):
  //   Find λ such that: RA(λ) = RAMC + f × DSA(λ)
  //   where RA(λ) = atan2(sin(λ), cos(λ) × cos(ε))  [RA of ecliptic point]
  //
  // This is iterative because DSA depends on λ.

  function eclipticToRA(lambdaRad) {
    return Math.atan2(Math.sin(lambdaRad) * Math.cos(eps), Math.cos(lambdaRad));
  }

  function eclipticToDec(lambdaRad) {
    return Math.asin(Math.sin(eps) * Math.sin(lambdaRad));
  }

  function diurnalSemiArc(decRad) {
    const cosH = -Math.tan(phi) * Math.tan(decRad);
    if (cosH < -1) return Math.PI; // circumpolar — always above horizon
    if (cosH > 1) return 0;        // never rises
    return Math.acos(cosH);
  }

  // Convert RA back to ecliptic longitude (on the ecliptic)
  // λ = atan2(sin(RA), cos(RA) × cos(ε))
  function raToEcliptic(raRad) {
    return Math.atan2(Math.sin(raRad), Math.cos(raRad) * Math.cos(eps));
  }

  function iteratePlacidus(f, aboveHorizon) {
    // Initial guess: linear interpolation (Alcabitius)
    let lambda;
    if (aboveHorizon) {
      let span = tropicalAsc - mc;
      if (span < 0) span += 360;
      lambda = ((mc + f * span) % 360) * DEG;
    } else {
      const ic = (mc + 180) % 360;
      let span = ic - tropicalAsc;
      if (span < 0) span += 360;
      lambda = ((tropicalAsc + f * span) % 360) * DEG;
    }

    // Iterate: find λ where RA(λ) = RAMC + f × semi-arc(λ)
    for (let iter = 0; iter < 50; iter++) {
      const dec = eclipticToDec(lambda);
      const dsa = diurnalSemiArc(dec);
      const sa = aboveHorizon ? dsa : (Math.PI - dsa); // NSA for below horizon

      let targetRA;
      if (aboveHorizon) {
        targetRA = ramcRad + f * dsa;
      } else {
        // Below horizon: from ASC towards IC
        // ASC RA = RAMC + DSA_asc, IC RA = RAMC + π
        // Cusp RA = RAMC + DSA_asc + f × NSA
        // But more correctly: from IC perspective
        // RA = RAMC + π - (1-f) × NSA ... no.
        // Standard: cusp 2 at f=1/3 of NSA from ASC
        // RA_cusp = RA_asc + f × NSA
        // But RA_asc corresponds to the ascendant's RA
        // Actually: RAMC + π + f × NSA doesn't work either.
        // The correct formula for below-horizon Placidus:
        // MD from IC = f × NSA, so RA = RAMC + π - f × (π - dsa)
        // Equivalently: RA = RAMC + π - f × NSA
        // But wait, for cusp 2 (f=1/3): it should be between ASC and IC
        // Let me use the standard formula:
        // For below horizon: RA = RAMC + π + (1-f) × (π - dsa)
        // No... let me think clearly.
        //
        // MC (H=0) → 11(1/3 DSA) → 12(2/3 DSA) → ASC(DSA) → 2(DSA+1/3 NSA) → 3(DSA+2/3 NSA) → IC(π)
        // So for cusp 2: RA = RAMC + DSA + f × NSA
        // But DSA here is of the cusp point itself, not the ASC... this is the iterative part.
        //
        // Actually the standard Placidus for below-horizon cusps:
        // The meridian distance from IC = (1-f) × NSA
        // So RA = (RAMC + π) - (1-f) × (π - dsa)
        // = RAMC + π - (1-f)×π + (1-f)×dsa
        // = RAMC + f×π + (1-f)×dsa
        //
        // For cusp 2 (f=1/3): RA = RAMC + π/3 + (2/3)×dsa
        // For cusp 3 (f=2/3): RA = RAMC + 2π/3 + (1/3)×dsa
        //
        // Hmm, let me use the simpler standard:
        // For nocturnal cusps, the formula uses the nocturnal semi-arc:
        // H = f × NSA measured from the lower meridian (IC)
        // RA = (RAMC + π) + f × (π - dsa)  -- going from IC toward DSC
        // No that goes the wrong way.
        //
        // Let me use: for cusp 2, it's between ASC and IC.
        // At ASC: H = DSA (of ASC point)
        // At IC: H = π
        // Cusp 2: H = DSA + 1/3 × NSA = DSA + 1/3 × (π - DSA) = (2/3)DSA + π/3
        // But H is for the cusp point itself, not constant.
        // The Placidus condition: H(cusp) / NSA(cusp) = f
        // where H is measured from the horizon (ASC), and NSA = π - DSA
        //
        // For below-horizon: H from ASC = RA_cusp - RA_asc
        // But we want: (RA_cusp - RAMC - DSA_cusp) / NSA_cusp = f
        // Hmm, this is getting complicated. Let me use the standard
        // formulation from Jean Meeus / Placidus literature.

        // Standard Placidus formula for nocturnal cusps:
        // RA_cusp = RAMC + π + f × (π - dsa_cusp)
        // Wait no... Let me just use the meridian distance approach.
        //
        // For ANY Placidus cusp, the condition is:
        //   MD / SA = f
        // where MD = meridian distance (from nearest meridian),
        // SA = relevant semi-arc (diurnal if above horizon, nocturnal if below)
        //
        // For cusp 2 (below horizon, between ASC and IC):
        //   MD from lower meridian (IC) = |RA - RAMC - π|
        //   NSA = π - DSA
        //   Condition: MD / NSA = (1-f) ... measured from IC going toward ASC
        //   So: RA = RAMC + π + (1-f) × NSA
        //   But wait, (1-f) because cusp 2 is closer to ASC (2/3 of NSA from IC)
        //
        // Actually for cusp 2 at f=1/3:
        //   It has completed 1/3 of the journey from ASC to IC
        //   MD from ASC = 1/3 × NSA... but MD from IC = 2/3 × NSA
        //   RA_ASC = RAMC + DSA_ASC (for the actual ascendant)
        //   But for Placidus, each cusp has its OWN semi-arc.
        //
        // The clean formulation:
        //   For cusp 2: the ecliptic point whose MD from IC = (1-f) × NSA of that point
        //   RA = RAMC + π + (1-f) × (π - dsa)  [going from IC toward ASC]
        //   Wait, that would put it on the wrong side.
        //
        //   IC is at RA = RAMC + π
        //   ASC is at RA = RAMC + DSA_ASC
        //   Going from IC toward ASC (decreasing RA if DSA < π):
        //   RA = (RAMC + π) - (1-f) × NSA
        //
        //   For f=1/3: RA = RAMC + π - (2/3) × (π - dsa)
        //            = RAMC + π - 2π/3 + 2dsa/3
        //            = RAMC + π/3 + 2dsa/3

        // Let me use: RA = RAMC + π - (1-f) × (π - dsa)
        targetRA = ramcRad + Math.PI - (1 - f) * (Math.PI - dsa);
      }

      // Convert target RA to ecliptic longitude
      const newLambda = raToEcliptic(targetRA);
      // Normalize to [0, 2π)
      const newLambdaNorm = ((newLambda % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const oldNorm = ((lambda % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

      let diff = Math.abs(newLambdaNorm - oldNorm);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      lambda = newLambdaNorm;

      if (diff < 0.0000001) break; // converged (< 0.02 arcseconds)
    }

    let result = lambda * RAD;
    return ((result % 360) + 360) % 360;
  }

  // Compute the 4 intermediate cusps, derive the rest
  const cusp11 = iteratePlacidus(1/3, true);
  const cusp12 = iteratePlacidus(2/3, true);
  const cusp2 = iteratePlacidus(1/3, false);
  const cusp3 = iteratePlacidus(2/3, false);

  const cusps = [
    tropicalAsc,                     // 1 = ASC
    cusp2,                           // 2
    cusp3,                           // 3
    (mc + 180) % 360,               // 4 = IC
    (cusp11 + 180) % 360,           // 5 = opposite of 11
    (cusp12 + 180) % 360,           // 6 = opposite of 12
    (tropicalAsc + 180) % 360,      // 7 = DSC
    (cusp2 + 180) % 360,            // 8 = opposite of 2
    (cusp3 + 180) % 360,            // 9 = opposite of 3
    mc,                              // 10 = MC
    cusp11,                          // 11
    cusp12,                          // 12
  ];

  return { cusps, mc, ramc: bestRamc };
}

module.exports = {
  dateToJulianDay,
  calcPlanetPosition,
  calcHouses,
  calcPlacidusCuspsFromAsc,
  getAllPlanetPositions,
  getAyanamsa,
  obliquity,
  gmst,
  calculateChart,
  calculateLagnaChangeTiming,
};
