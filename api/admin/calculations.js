const jwt = require('jsonwebtoken');
const { getCalculations, getCalculationById, deleteCalculation, initDb } = require('../../server/services/db');

function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await initDb();
    const { id, page = '1', limit = '20' } = req.query;

    // Delete a calculation
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id is required' });
      await deleteCalculation(parseInt(id));
      return res.status(200).json({ success: true });
    }

    // Single calculation detail
    if (id) {
      const calc = await getCalculationById(parseInt(id));
      if (!calc) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ success: true, calculation: calc });
    }

    // Paginated list
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const result = await getCalculations(pageNum, limitNum);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Admin calculations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
