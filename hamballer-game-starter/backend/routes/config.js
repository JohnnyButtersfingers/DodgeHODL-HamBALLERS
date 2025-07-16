const express = require('express');
const router = express.Router();
const { getXPThresholds } = require('../services/xpConfigService');

router.get('/xp-thresholds', async (req, res) => {
  try {
    const data = await getXPThresholds();
    res.json({ success: true, data });
  } catch (err) {
    console.error('Fetch thresholds failed:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch thresholds' });
  }
});

module.exports = router;

