const express = require('express');
const router = express.Router();
const { contracts } = require('../config/database');

router.get('/:wallet', async (req, res) => {
  const { wallet } = req.params;
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ success: false, error: 'Invalid wallet address' });
  }

  if (!contracts.hasMintedBadge) {
    return res.status(503).json({ success: false, error: 'XPBadge contract unavailable' });
  }

  try {
    const minted = await contracts.hasMintedBadge(wallet, 1);
    res.json({ success: true, data: { wallet, minted } });
  } catch (err) {
    console.error('Badge status error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch badge status' });
  }
});

module.exports = router;

