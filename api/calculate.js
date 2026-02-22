// Vercel serverless function wrapping the calculation logic
const { calculateChart, calculateLagnaChangeTiming } = require('../server/services/ephemeris');
const { calculateRulingPlanets } = require('../server/services/rulingPlanets');
const { calculateAnswer } = require('../server/services/ankShastra');
const { PLANETS } = require('../server/data/constants');
const { getSignFromDegree, getNakshatraFromDegree } = require('../server/services/nakshatra');
const { getCalculationsCollection } = require('../server/services/db');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { latitude, longitude, optionsCount, question, options } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    if (!optionsCount || optionsCount < 2) {
      return res.status(400).json({ error: 'At least 2 options are required' });
    }

    const now = new Date();
    const chartData = calculateChart(now, parseFloat(latitude), parseFloat(longitude));
    const { rulingPlanets, details } = calculateRulingPlanets(chartData);
    const calculation = calculateAnswer(rulingPlanets, parseInt(optionsCount));

    // Calculate when lagna will change
    const lagnaChangeTiming = calculateLagnaChangeTiming(now, parseFloat(latitude), parseFloat(longitude));

    // Build planet positions for chart display
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

    const ascSignIndex = Math.floor(((chartData.ascendant % 360) + 360) % 360 / 30);
    const housePositions = {};
    for (const [key, info] of Object.entries(planetHouses)) {
      const houseNum = ((info.signIndex - ascSignIndex + 12) % 12) + 1;
      housePositions[key] = { ...info, house: houseNum };
    }

    const responseData = {
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
        label: rp.label,
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
        nextSign: lagnaChangeTiming.nextSignIndex !== null
          ? require('../server/data/constants').SIGNS[lagnaChangeTiming.nextSignIndex]
          : null,
        nextSignChangeMinutes: lagnaChangeTiming.nextSignChangeMinutes,
        nextNakshatraChange: lagnaChangeTiming.nextNakshatraChange,
        nextNakshatraChangeMinutes: lagnaChangeTiming.nextNakshatraChangeMinutes,
        nextChange: lagnaChangeTiming.nextChange,
        nextChangeType: lagnaChangeTiming.nextChangeType,
        nextChangeMinutes: lagnaChangeTiming.nextChangeMinutes,
        // Moon position info (panchang nakshatra)
        moonSign: details.moonSign,
        moonNakshatra: getNakshatraFromDegree(chartData.planets.moon.longitude).nakshatra,
        moonPada: getNakshatraFromDegree(chartData.planets.moon.longitude).pada,
        moonDegree: chartData.planets.moon.longitude,
      },
    };

    // Save to database (non-blocking, don't fail the response if DB is down)
    try {
      const collection = await getCalculationsCollection();
      const { success, ...dataToStore } = responseData;
      await collection.insertOne({ ...dataToStore, createdAt: new Date() });
    } catch (dbError) {
      console.error('DB save error (non-fatal):', dbError.message);
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({ error: error.message });
  }
};
