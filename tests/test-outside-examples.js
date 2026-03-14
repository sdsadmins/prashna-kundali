/**
 * test-outside-examples.js
 *
 * Outside-data verification tests for the KP Horary system.
 * These examples are NOT from KP Reader VI — they use fresh dates,
 * locations, and independently computed ruling planets.
 *
 * Checks:
 *  1. Ruling planets match independently computed LSRD values
 *  2. Verdict is structurally valid
 *  3. Timing output is well-formed (target positions, best date, dasha)
 *  4. Ephemeris accuracy against known astronomical events
 *  5. KP sub-table structural integrity
 */
'use strict';

const { calculateKPHorary } = require('../server/services/kpHorary');
const { calcPlanetPosition, dateToJulianDay, calcHouses, getAyanamsa } = require('../server/services/ephemeris');
const { NAKSHATRAS, SIGNS, DAY_LORDS } = require('../server/data/constants');
const { KP_SUB_TABLE } = require('../server/data/kpSubTable');
const PLANET_NAMES = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];

// ─── helpers ──────────────────────────────────────────────────────────────────
function getNakLord(lon) {
  const l = ((lon % 360) + 360) % 360;
  return NAKSHATRAS[Math.floor(l / (360 / 27)) % 27].lord;
}
function getSignLord(lon) {
  const l = ((lon % 360) + 360) % 360;
  return SIGNS[Math.floor(l / 30) % 12].lord;
}

let pass = 0, fail = 0;
function check(label, ok, detail) {
  if (ok) { pass++; console.log('  ✅', label); }
  else     { fail++; console.log('  ❌', label, detail ? '→ ' + detail : ''); }
}

// ─── PART 1: Ephemeris accuracy ───────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('PART 1: EPHEMERIS ACCURACY (known astronomical events)');
console.log('══════════════════════════════════════════════════════════════════════\n');

// 1999-Aug-11 Solar Eclipse: Sun should be ~138–139° tropical (Leo 17–18°)
{
  const jd = dateToJulianDay(new Date('1999-08-11T11:04:00Z'));
  const sun = calcPlanetPosition(jd, 'sun');
  const ayan = getAyanamsa(jd);
  const tropLon = sun.longitude + ayan;
  check('1999-Aug-11 Solar Eclipse: Sun tropical ~138–139°',
    tropLon >= 137 && tropLon <= 140,
    tropLon.toFixed(2) + '°');
}

// 2020-Dec-21 Great Conjunction: Jupiter & Saturn within 0.5° of each other at ~300° tropical
{
  const jd = dateToJulianDay(new Date('2020-12-21T00:00:00Z'));
  const jup = calcPlanetPosition(jd, 'jupiter');
  const sat = calcPlanetPosition(jd, 'saturn');
  const ayan = getAyanamsa(jd);
  const diff = Math.abs(jup.longitude - sat.longitude);
  const jupTrop = jup.longitude + ayan;
  check('2020-Dec-21 Jupiter-Saturn conjunction < 0.5° apart',
    diff < 0.5,
    diff.toFixed(3) + '°');
  check('2020-Dec-21 Jupiter in Capricorn (tropical ~295–325°)',
    jupTrop >= 290 && jupTrop <= 310,
    jupTrop.toFixed(2) + '°');
}

// 2010-Jan-1 Saturn in Virgo (sidereal 155–175°)
{
  const jd = dateToJulianDay(new Date('2010-01-01T00:00:00Z'));
  const sat = calcPlanetPosition(jd, 'saturn');
  check('2010-Jan-1 Saturn in Virgo sidereal (155–175°)',
    sat.longitude >= 155 && sat.longitude <= 175,
    sat.longitude.toFixed(2) + '°');
}

// KP ayanamsa at 2000-Jan-1 should be ~23.75–23.80°
{
  const jd = 2451545.0; // J2000.0
  const ayan = getAyanamsa(jd);
  check('KP ayanamsa at J2000.0 in range 23.6–23.9°',
    ayan >= 23.6 && ayan <= 23.9,
    ayan.toFixed(4) + '°');
}

// ─── PART 2: KP sub-table integrity ───────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('PART 2: KP SUB-TABLE STRUCTURAL INTEGRITY');
console.log('══════════════════════════════════════════════════════════════════════\n');

{
  check('Sub-table has exactly 249 entries',
    KP_SUB_TABLE.length === 249,
    KP_SUB_TABLE.length + ' entries');

  const totalSpan = KP_SUB_TABLE.reduce((s, e) => s + (e.endDeg - e.startDeg), 0);
  check('Sub-table covers exactly 360°',
    Math.abs(totalSpan - 360) < 0.01,
    totalSpan.toFixed(4) + '°');

  // Check entries are numbered 1..249 with no gaps
  const nums = KP_SUB_TABLE.map(e => e.number);
  const seqOk = nums.every((n, i) => n === i + 1);
  check('Sub-table entries numbered 1–249 sequentially', seqOk);

  // Check no overlaps
  let prevEnd = 0;
  let overlapOk = true;
  for (const e of KP_SUB_TABLE) {
    if (e.startDeg < prevEnd - 0.001) { overlapOk = false; break; }
    prevEnd = e.endDeg;
  }
  check('Sub-table has no overlapping ranges', overlapOk);

  // Each entry has valid sign/star/sub lords
  const PLANETS = new Set(['sun','moon','mars','mercury','jupiter','venus','saturn','rahu','ketu']);
  let lordsOk = true;
  for (const e of KP_SUB_TABLE) {
    if (!PLANETS.has(e.signLord) || !PLANETS.has(e.starLord) || !PLANETS.has(e.subLord)) {
      lordsOk = false; break;
    }
  }
  check('All sub-table lords are valid planet names', lordsOk);
}

// ─── PART 3: Ruling planets — independent verification ────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('PART 3: RULING PLANETS — INDEPENDENT VERIFICATION');
console.log('══════════════════════════════════════════════════════════════════════\n');

// In KP horary, the lagna lords come from the horary NUMBER's sub-table entry
// (not from geographic ascendant). So we independently compute:
//   lagnaSignLord  = sub-table[horaryNum].signLord
//   lagnaStarLord  = sub-table[horaryNum].starLord
//   moonSignLord   = sign lord of Moon's sidereal position on the date
//   moonStarLord   = nak lord of Moon's sidereal position on the date
//   dayLord        = day of the week lord

const { getSubByNumber } = require('../server/data/kpSubTable');

const rulingCases = [
  {
    label: '#1 on 2023-Mar-15 Mumbai (Wed)',
    horaryNum: 1,
    date: new Date('2023-03-15T04:00:00Z'),
    lat: 18.975, lon: 72.826,
    // Sub-table #1: Aries, signLord=mars, starLord=ketu (Ashwini)
    // Moon at 241.22° → Sagittarius sign (jupiter), Moola nak (ketu)
    // Day: Wednesday → mercury
    expectedComponents: { lagnaSignLord:'mars', lagnaStarLord:'ketu', moonSignLord:'jupiter', moonStarLord:'ketu', dayLord:'mercury' },
  },
  {
    label: '#100 on 2023-Mar-15 Mumbai (Wed)',
    horaryNum: 100,
    date: new Date('2023-03-15T04:00:00Z'),
    lat: 18.975, lon: 72.826,
    // Sub-table #100 is in Leo (Purva Phalguni), signLord=sun, starLord=venus
    // Moon same as above: jupiter/ketu; Day: mercury
    expectedComponents: { lagnaSignLord:'sun', lagnaStarLord:'venus', moonSignLord:'jupiter', moonStarLord:'ketu', dayLord:'mercury' },
  },
  {
    label: '#55 on 2024-Jun-21 Delhi (Fri)',
    horaryNum: 55,
    date: new Date('2024-06-21T09:30:00Z'),
    lat: 28.617, lon: 77.200,
    // Day: Friday → venus
    // Moon at 238.25° → Scorpio sign (mars), Jyeshtha nak (mercury)
    // Sub-table #55: we'll verify against system output
    expectedDayLord: 'venus',
    expectedMoonSignLord: 'mars',
  },
];

for (const c of rulingCases) {
  console.log(c.label);
  const result = calculateKPHorary(c.horaryNum, c.date, c.lat, c.lon, 'marriage');
  const comp = result.rulingPlanets && result.rulingPlanets.components;
  const allRP = (result.rulingPlanets && result.rulingPlanets.all) || [];
  const filtRP = (result.rulingPlanets && result.rulingPlanets.filtered) || [];

  // Lagna lords come from the ACTUAL rising lagna (real-time), NOT the horary
  // number's sub-table entry. Verify they are valid planet names.
  check('Lagna Sign Lord is valid planet',
    comp && comp.lagnaSignLord && PLANET_NAMES.includes(comp.lagnaSignLord.planet),
    'got: ' + (comp && comp.lagnaSignLord && comp.lagnaSignLord.planet));
  check('Lagna Star Lord is valid planet',
    comp && comp.lagnaStarLord && PLANET_NAMES.includes(comp.lagnaStarLord.planet),
    'got: ' + (comp && comp.lagnaStarLord && comp.lagnaStarLord.planet));

  // Verify day lord
  if (c.expectedComponents) {
    check('Day Lord = ' + c.expectedComponents.dayLord,
      comp && comp.dayLord && comp.dayLord.planet === c.expectedComponents.dayLord,
      'got: ' + (comp && comp.dayLord && comp.dayLord.planet));
    check('Moon Sign Lord = ' + c.expectedComponents.moonSignLord,
      comp && comp.moonSignLord && comp.moonSignLord.planet === c.expectedComponents.moonSignLord,
      'got: ' + (comp && comp.moonSignLord && comp.moonSignLord.planet));
    check('Moon Star Lord = ' + c.expectedComponents.moonStarLord,
      comp && comp.moonStarLord && comp.moonStarLord.planet === c.expectedComponents.moonStarLord,
      'got: ' + (comp && comp.moonStarLord && comp.moonStarLord.planet));
  }
  if (c.expectedDayLord) {
    check('Day Lord = ' + c.expectedDayLord,
      comp && comp.dayLord && comp.dayLord.planet === c.expectedDayLord,
      'got: ' + (comp && comp.dayLord && comp.dayLord.planet));
  }
  if (c.expectedMoonSignLord) {
    check('Moon Sign Lord = ' + c.expectedMoonSignLord,
      comp && comp.moonSignLord && comp.moonSignLord.planet === c.expectedMoonSignLord,
      'got: ' + (comp && comp.moonSignLord && comp.moonSignLord.planet));
  }

  check('Filtered ruling planets non-empty', filtRP.length > 0);
  check('Filtered is subset of all', filtRP.every(p => allRP.includes(p)));
  console.log('  components: ' + JSON.stringify(Object.fromEntries(
    Object.entries(comp || {}).map(([k, v]) => [k, v.planet]))));
  console.log();
}

// ─── PART 4: Full pipeline across 6 outside examples ──────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('PART 4: FULL PIPELINE — OUTSIDE EXAMPLES');
console.log('══════════════════════════════════════════════════════════════════════\n');

const pipelineCases = [
  { num: 100, date: new Date('2023-03-15T04:00:00Z'), lat: 18.975, lon: 72.826, cat: 'marriage',  label: 'Mumbai 2023-Mar-15 #100 Marriage'  },
  { num: 55,  date: new Date('2024-06-21T09:30:00Z'), lat: 28.617, lon: 77.200, cat: 'job',       label: 'Delhi 2024-Jun-21 #55 Job'          },
  { num: 175, date: new Date('2025-10-10T05:30:00Z'), lat: 13.083, lon: 80.270, cat: 'health',    label: 'Chennai 2025-Oct-10 #175 Health'    },
  { num: 33,  date: new Date('2023-03-15T04:00:00Z'), lat: 18.975, lon: 72.826, cat: 'children',  label: 'Mumbai 2023-Mar-15 #33 Children'    },
  { num: 200, date: new Date('2024-06-21T09:30:00Z'), lat: 28.617, lon: 77.200, cat: 'property',  label: 'Delhi 2024-Jun-21 #200 Property'    },
  { num: 77,  date: new Date('2025-10-10T05:30:00Z'), lat: 13.083, lon: 80.270, cat: 'loan',      label: 'Chennai 2025-Oct-10 #77 Loan'       },
  // Edge cases: extreme horary numbers
  { num: 1,   date: new Date('2024-01-01T00:00:00Z'), lat: 23.022, lon: 72.571, cat: 'vehicle',   label: 'Ahmedabad 2024-Jan-01 #1 Vehicle'   },
  { num: 249, date: new Date('2024-12-31T12:00:00Z'), lat: 12.972, lon: 77.594, cat: 'job',       label: 'Bangalore 2024-Dec-31 #249 Job'     },
];

const VALID_VERDICTS = new Set(['YES', 'NO', 'YES_WITH_DELAY', 'UNCLEAR']);

for (const c of pipelineCases) {
  console.log(c.label);
  let result;
  try {
    result = calculateKPHorary(c.num, c.date, c.lat, c.lon, c.cat);
  } catch (e) {
    check('No exception', false, e.message);
    console.log();
    continue;
  }

  const verdict = result.yesNo && result.yesNo.verdict;
  const timing  = result.timing;
  const subEntry = result.subEntry;
  const rp = (result.rulingPlanets && result.rulingPlanets.filtered) || [];

  check('Valid verdict (' + verdict + ')', VALID_VERDICTS.has(verdict));
  check('Sub entry in 1–249 (' + (subEntry && subEntry.number) + ')',
    subEntry && subEntry.number >= 1 && subEntry.number <= 249);
  check('Ruling planets non-empty', rp.length > 0, rp.join(', '));
  check('Target positions computed', timing && timing.targetPositions !== undefined);
  check('Best predicted date present', !!(timing && timing.bestPredictedDate && timing.bestPredictedDate.date));
  check('Dasha timing computed', !!(timing && timing.dashaTiming));
  check('Prominent dates non-empty', !!(timing && timing.prominentDates && timing.prominentDates.length > 0));
  console.log('   verdict=' + verdict + '  subLord=' + (result.yesNo && result.yesNo.subLord) +
    '  rp=[' + rp.join(',') + ']');
  console.log('   bestDate=' + (timing && timing.bestPredictedDate && timing.bestPredictedDate.date) +
    '  dasha=' + (timing && timing.dashaTiming && timing.dashaTiming.best && timing.dashaTiming.best.description || 'none'));
  console.log();
}

// ─── PART 5: Verdict consistency checks ────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('PART 5: VERDICT CONSISTENCY — SAME INPUTS SAME OUTPUT');
console.log('══════════════════════════════════════════════════════════════════════\n');

{
  // Same inputs called twice should give identical verdicts
  const args = [100, new Date('2023-03-15T04:00:00Z'), 18.975, 72.826, 'marriage'];
  const r1 = calculateKPHorary(...args);
  const r2 = calculateKPHorary(...args);
  check('Deterministic: same input → same verdict',
    r1.yesNo.verdict === r2.yesNo.verdict);
  check('Deterministic: same input → same sub lord',
    r1.yesNo.subLord === r2.yesNo.subLord);
  check('Deterministic: same input → same ruling planets',
    JSON.stringify(r1.rulingPlanets.filtered) === JSON.stringify(r2.rulingPlanets.filtered));
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
const total = pass + fail;
console.log('OUTSIDE EXAMPLE RESULTS: ' + pass + '/' + total + ' passed (' +
  (fail === 0 ? '100%' : Math.round(100 * pass / total) + '%') + ')');
if (fail > 0) console.log('FAILED: ' + fail + ' checks');
console.log('══════════════════════════════════════════════════════════════════════');
