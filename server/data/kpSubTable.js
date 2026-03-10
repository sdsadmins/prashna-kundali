/**
 * KP 249-Sub Table Generator
 *
 * Mathematically generates the 249 sub-lord entries from Vimshottari Dasha proportions.
 * Each of 27 nakshatras (13°20') is divided into 9 subs proportional to dasha years.
 * When a sub crosses a 30° sign boundary, it splits into 2 numbered entries → 249 total.
 *
 * Uses integer arithmetic (units of 1/3 arc-minute = 20 arc-seconds) to avoid
 * floating-point precision issues at sign boundaries.
 *
 * Reference: K.S. Krishnamurti, "KP Reader VI: Horary Astrology", Section IV
 */

const { SIGNS, NAKSHATRAS, VIMSHOTTARI_ORDER, VIMSHOTTARI_YEARS, VIMSHOTTARI_TOTAL } = require('./constants');

// Work in units of 1/3 arc-minute (20 arc-seconds) for exact integer math
// Each sub span in these units = years × 20 (all integers)
// Nakshatra span = 800' = 2400 units
// Sign span = 30° = 1800' = 5400 units
// Full circle = 360° = 21600' = 64800 units
const UNIT_PER_NAKSHATRA = 2400;
const UNIT_PER_SIGN = 5400;
const UNIT_PER_CIRCLE = 64800;

// Sub span in units = years × 20
function subSpanUnits(planetKey) {
  return VIMSHOTTARI_YEARS[planetKey] * 20;
}

// Convert units to degrees
function unitsToDeg(units) {
  return units / (3 * 60); // 1 unit = 1/3 arcmin = 1/(3*60) degrees
}

/**
 * Generate all 249 KP sub entries using exact integer arithmetic.
 */
function generateKPSubTable() {
  const table = [];
  let currentUnit = 0; // running position in units (0 to 64800)
  let number = 1;

  for (let nakIdx = 0; nakIdx < 27; nakIdx++) {
    const nakshatra = NAKSHATRAS[nakIdx];
    const starLord = nakshatra.lord;
    const startLordIdx = VIMSHOTTARI_ORDER.indexOf(starLord);

    for (let subIdx = 0; subIdx < 9; subIdx++) {
      const subLord = VIMSHOTTARI_ORDER[(startLordIdx + subIdx) % 9];
      const span = subSpanUnits(subLord);
      const subEndUnit = currentUnit + span;

      // Check if this sub crosses a sign boundary
      const currentSignIdx = Math.floor(currentUnit / UNIT_PER_SIGN);
      const endSignIdx = Math.floor((subEndUnit - 1) / UNIT_PER_SIGN);
      // Use (subEndUnit - 1) so that exact boundary = no split

      if (currentSignIdx !== endSignIdx) {
        // Sub crosses a sign boundary — split into 2 entries
        const boundaryUnit = (currentSignIdx + 1) * UNIT_PER_SIGN;

        // Part 1: current sign
        table.push({
          number: number++,
          startDeg: unitsToDeg(currentUnit),
          endDeg: unitsToDeg(boundaryUnit),
          signIndex: currentSignIdx,
          sign: SIGNS[currentSignIdx],
          signLord: SIGNS[currentSignIdx].lord,
          nakshatra,
          starLord,
          subLord,
        });

        // Part 2: next sign
        const nextSignIdx = currentSignIdx + 1;
        table.push({
          number: number++,
          startDeg: unitsToDeg(boundaryUnit),
          endDeg: unitsToDeg(subEndUnit),
          signIndex: nextSignIdx,
          sign: SIGNS[nextSignIdx],
          signLord: SIGNS[nextSignIdx].lord,
          nakshatra,
          starLord,
          subLord,
        });
      } else {
        // Sub fits within one sign
        table.push({
          number: number++,
          startDeg: unitsToDeg(currentUnit),
          endDeg: unitsToDeg(subEndUnit),
          signIndex: currentSignIdx,
          sign: SIGNS[currentSignIdx],
          signLord: SIGNS[currentSignIdx].lord,
          nakshatra,
          starLord,
          subLord,
        });
      }

      currentUnit = subEndUnit;
    }
  }

  return table;
}

// Generate once at module load
const KP_SUB_TABLE = generateKPSubTable();

/**
 * Get sub entry by horary number (1-249)
 */
function getSubByNumber(n) {
  if (n < 1 || n > KP_SUB_TABLE.length) {
    throw new Error('Horary number must be between 1 and ' + KP_SUB_TABLE.length + ', got ' + n);
  }
  return KP_SUB_TABLE[n - 1];
}

/**
 * Get sub entry by degree (0-360)
 * Uses binary search for efficiency.
 */
function getSubByDegree(deg) {
  const normalizedDeg = ((deg % 360) + 360) % 360;

  // Binary search
  let lo = 0, hi = KP_SUB_TABLE.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const entry = KP_SUB_TABLE[mid];
    if (normalizedDeg < entry.startDeg - 1e-10) {
      hi = mid - 1;
    } else if (normalizedDeg >= entry.endDeg - 1e-10) {
      lo = mid + 1;
    } else {
      return entry;
    }
  }

  // Fallback: last entry for 360° edge case
  return KP_SUB_TABLE[KP_SUB_TABLE.length - 1];
}

/**
 * Format degrees as D°M'S" string
 */
function formatDMS(deg) {
  const totalSeconds = Math.round(deg * 3600);
  const d = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return d + '\u00B0' + String(m).padStart(2, '0') + "'" + String(s).padStart(2, '0') + '"';
}

module.exports = {
  KP_SUB_TABLE,
  getSubByNumber,
  getSubByDegree,
  formatDMS,
};
