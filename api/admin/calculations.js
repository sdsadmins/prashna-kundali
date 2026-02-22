const jwt = require('jsonwebtoken');
const { getCalculationsCollection } = require('../../server/services/db');

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const collection = await getCalculationsCollection();
    const { id, page = '1', limit = '20' } = req.query;

    // Single calculation detail
    if (id) {
      const { ObjectId } = require('mongodb');
      const calc = await collection.findOne({ _id: new ObjectId(id) });
      if (!calc) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ success: true, calculation: calc });
    }

    // Paginated list
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [calculations, total] = await Promise.all([
      collection
        .find({}, {
          projection: {
            timestamp: 1,
            question: 1,
            options: 1,
            'calculation.answerOption': 1,
            'calculation.answerExplanation': 1,
            location: 1,
            'lagnaInfo.sign': 1,
            createdAt: 1,
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      collection.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      calculations,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Admin calculations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
