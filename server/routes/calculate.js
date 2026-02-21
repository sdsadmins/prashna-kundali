const express = require('express');
const router = express.Router();
const { calculateChart, calculateLagnaChangeTiming } = require('../services/ephemeris');
const { calculateRulingPlanets } = require('../services/rulingPlanets');
const { calculateAnswer } = require('../services/ankShastra');
const { SIGNS, PLANETS, NAKSHATRAS } = require('../data/constants');
const { getSignFromDegree } = require('../services/nakshatra');

/**
 * POST /api/calculate
 * Body: { latitude, longitude, optionsCount, question, options }
 * Returns: full calculation with ruling planets, Ank breakdown, and answer
 */
router.post('/', (req, res) => {
  try {
    const { latitude, longitude, optionsCount, question, options } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    if (!optionsCount || optionsCount < 2) {
      return res.status(400).json({ error: 'At least 2 options are required' });
    }

    // Capture current moment
    const now = new Date();

    // Calculate chart
    const chartData = calculateChart(now, parseFloat(latitude), parseFloat(longitude));

    // Get ruling planets
    const { rulingPlanets, details } = calculateRulingPlanets(chartData);

    // Calculate answer using Ank Shastra
    const calculation = calculateAnswer(rulingPlanets, parseInt(optionsCount));

    // Calculate when lagna will change (sign or nakshatra)
    const lagnaChangeTiming = calculateLagnaChangeTiming(now, parseFloat(latitude), parseFloat(longitude));

    // Build planet positions for chart display (which house each planet is in)
    const planetHouses = {};
    for (const [key, pos] of Object.entries(chartData.planets)) {
      const signInfo = getSignFromDegree(pos.longitude);
      planetHouses[key] = {
        sign: signInfo.sign,
        signIndex: signInfo.sign.index,
        degree: pos.longitude,
        degreeInSign: signInfo.degreeInSign,
        isRetrograde: pos.isRetrograde,
        planet: PLANETS[key],
      };
    }

    // Determine house positions relative to ascendant
    const ascSignIndex = Math.floor(((chartData.ascendant % 360) + 360) % 360 / 30);
    const housePositions = {};
    for (const [key, info] of Object.entries(planetHouses)) {
      // House number = (planet sign index - ascendant sign index + 12) % 12 + 1
      const houseNum = ((info.signIndex - ascSignIndex + 12) % 12) + 1;
      housePositions[key] = { ...info, house: houseNum };
    }

    res.json({
      success: true,
      timestamp: now.toISOString(),
      location: { latitude, longitude },
      question,
      options,
      chart: {
        ascendant: chartData.ascendant,
        ascendantSign: details.lagnaSign,
        ascendantSignIndex: ascSignIndex,
        houses: chartData.houses,
        planetPositions: housePositions,
        ayanamsa: chartData.ayanamsa,
      },
      rulingPlanets: rulingPlanets.map((rp) => ({
        slot: rp.slot,
        slotEn: rp.slotEn,
        slotMr: rp.slotMr,
        planetKey: rp.planetKey,
        planetEn: rp.planet.en,
        planetMr: rp.planet.mr,
        ank: rp.ank,
        skipped: rp.skipped,
        skipReason: rp.skipReason,
        isRetrograde: rp.isRetrograde,
        isRahuKetu: rp.isRahuKetu,
        sign: rp.sign,
        nakshatra: rp.nakshatra,
        day: rp.day,
        rahuKetuResolution: rp.rahuKetuResolution,
      })),
      details,
      calculation,
      lagnaInfo: {
        degree: lagnaChangeTiming.currentDegree,
        degreeInSign: lagnaChangeTiming.degreeInSign,
        sign: details.lagnaSign,
        nakshatra: details.lagnaNakshatra,
        pada: details.lagnaPada,
        startTime: lagnaChangeTiming.lagnaStartTime,
        endTime: lagnaChangeTiming.lagnaEndTime,
        nextSign: lagnaChangeTiming.nextSignIndex !== null ? SIGNS[lagnaChangeTiming.nextSignIndex] : null,
        nextSignChangeMinutes: lagnaChangeTiming.nextSignChangeMinutes,
        nextNakshatraChange: lagnaChangeTiming.nextNakshatraChange,
        nextNakshatraChangeMinutes: lagnaChangeTiming.nextNakshatraChangeMinutes,
        nextChange: lagnaChangeTiming.nextChange,
        nextChangeType: lagnaChangeTiming.nextChangeType,
        nextChangeMinutes: lagnaChangeTiming.nextChangeMinutes,
      },
    });
  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
