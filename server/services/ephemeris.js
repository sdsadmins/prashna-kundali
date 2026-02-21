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

module.exports = {
  dateToJulianDay,
  calcPlanetPosition,
  calcHouses,
  getAllPlanetPositions,
  getAyanamsa,
  calculateChart,
  calculateLagnaChangeTiming,
};
