const { KP_SUB_TABLE, formatDMS } = require('../server/data/kpSubTable');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const compact = KP_SUB_TABLE.map(s => ({
    n: s.number,
    d: [formatDMS(s.startDeg), formatDMS(s.endDeg)],
    si: s.sign.en,
    sim: s.sign.mr,
    sl: s.signLord,
    nk: s.nakshatra.en,
    nkm: s.nakshatra.mr,
    stl: s.starLord,
    sub: s.subLord,
  }));

  res.status(200).json({ success: true, subs: compact });
};
