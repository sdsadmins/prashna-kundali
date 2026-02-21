// Vercel serverless function for live lagna status
const { calculateLagnaChangeTiming, calcPlanetPosition, dateToJulianDay } = require('../server/services/ephemeris');
const { getSignFromDegree, getNakshatraFromDegree } = require('../server/services/nakshatra');
const { SIGNS } = require('../server/data/constants');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    res.status(200).json({
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
};
