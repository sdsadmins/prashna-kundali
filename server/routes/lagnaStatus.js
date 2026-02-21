const express = require('express');
const router = express.Router();
const { calculateLagnaChangeTiming, calcPlanetPosition, dateToJulianDay } = require('../services/ephemeris');
const { getSignFromDegree, getNakshatraFromDegree } = require('../services/nakshatra');
const { SIGNS } = require('../data/constants');

/**
 * GET /api/lagna-status?latitude=18.52&longitude=73.85
 * Returns current lagna info with start/end times for live display
 */
router.get('/', (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const now = new Date();
    const timing = calculateLagnaChangeTiming(now, parseFloat(latitude), parseFloat(longitude));

    const signInfo = getSignFromDegree(timing.currentDegree);
    const nakInfo = getNakshatraFromDegree(timing.currentDegree);
    const nextSign = timing.nextSignIndex !== null ? SIGNS[timing.nextSignIndex] : null;

    // Get Moon position for Moon nakshatra (panchang nakshatra)
    const jd = dateToJulianDay(now);
    const moonPos = calcPlanetPosition(jd, 'moon');
    const moonSignInfo = getSignFromDegree(moonPos.longitude);
    const moonNakInfo = getNakshatraFromDegree(moonPos.longitude);

    res.json({
      success: true,
      timestamp: now.toISOString(),
      lagna: {
        sign: signInfo.sign,
        nakshatra: nakInfo.nakshatra,
        nakshatraLord: nakInfo.lord,
        pada: nakInfo.pada,
        degree: timing.currentDegree,
        degreeInSign: timing.degreeInSign,
        startTime: timing.lagnaStartTime,
        endTime: timing.lagnaEndTime,
        nextSign: nextSign,
        nextSignChangeMinutes: timing.nextSignChangeMinutes,
        nextNakshatraChange: timing.nextNakshatraChange,
        nextNakshatraChangeMinutes: timing.nextNakshatraChangeMinutes,
        nextChangeType: timing.nextChangeType,
        nextChangeMinutes: timing.nextChangeMinutes,
        // Moon info
        moonSign: moonSignInfo.sign,
        moonNakshatra: moonNakInfo.nakshatra,
        moonNakshatraLord: moonNakInfo.lord,
        moonPada: moonNakInfo.pada,
        moonDegree: moonPos.longitude,
      },
    });
  } catch (error) {
    console.error('Lagna status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
