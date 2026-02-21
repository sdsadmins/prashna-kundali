// Vercel serverless function — proxy to ProKerala Astrology API
// Returns planet positions for verification against our calculations

const PROKERALA_CLIENT_ID = '16f741cc-9c5e-4aee-b694-ab0284d8810d';
const PROKERALA_CLIENT_SECRET = 'VR3Fo5GBPxOE5odOsaAhoMpfBvcgAMYmfLyFP54F';
const TOKEN_URL = 'https://api.prokerala.com/token';
const API_BASE = 'https://api.prokerala.com/v2/astrology';

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${PROKERALA_CLIENT_ID}&client_secret=${PROKERALA_CLIENT_SECRET}`,
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Failed to get ProKerala token');
  }

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // refresh 1 min early
  return cachedToken;
}

module.exports = async (req, res) => {
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
    const { latitude, longitude, datetime } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const token = await getAccessToken();

    // Build datetime — use provided or current time in IST
    const dt = datetime || new Date().toISOString().replace('Z', '+05:30');
    const coords = `${latitude},${longitude}`;

    // Fetch planet positions with KP ayanamsa (ayanamsa=5)
    const url = `${API_BASE}/planet-position?ayanamsa=5&coordinates=${coords}&datetime=${encodeURIComponent(dt)}&la=en`;

    const apiRes = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const apiData = await apiRes.json();

    if (apiData.status === 'error') {
      return res.status(200).json({
        success: false,
        sandbox: true,
        error: apiData.errors?.[0]?.detail || 'ProKerala API error',
        note: 'ProKerala sandbox mode only allows January 1st dates. Upgrade to paid plan for live data.',
      });
    }

    // Format planet positions for easy comparison
    const planets = {};
    let ascendant = null;

    for (const p of apiData.data.planet_position) {
      const entry = {
        name: p.name,
        longitude: p.longitude,
        degree: p.degree,
        rashi: p.rasi?.name,
        rashiLord: p.rasi?.lord?.vedic_name,
        isRetrograde: p.is_retrograde,
      };

      if (p.id === 100) {
        ascendant = entry;
      } else {
        const key = p.name.toLowerCase();
        planets[key] = entry;
      }
    }

    res.status(200).json({
      success: true,
      source: 'ProKerala Astrology API',
      ayanamsa: 'KP (Krishnamurti)',
      datetime: dt,
      ascendant,
      planets,
    });
  } catch (error) {
    console.error('ProKerala API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
