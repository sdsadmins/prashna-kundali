const express = require('express');
const cors = require('cors');
const path = require('path');
const calculateRouter = require('./routes/calculate');
const lagnaStatusRouter = require('./routes/lagnaStatus');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/calculate', calculateRouter);
app.use('/api/lagna-status', lagnaStatusRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Prashna Kundali server running on port ${PORT}`);
});
