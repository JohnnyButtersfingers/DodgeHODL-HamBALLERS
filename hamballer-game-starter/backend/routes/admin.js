const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { setXPThreshold } = require('../services/xpConfigService');

function isAdmin(req) {
  const token = req.headers.authorization;
  return token && token === `Bearer ${process.env.ADMIN_TOKEN}`;
}

const schema = Joi.object({
  tier: Joi.string().valid('epic', 'legendary').required(),
  min_xp: Joi.number().integer().min(1).required()
});

router.post('/xp-thresholds', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: 'Invalid data', details: error.details[0].message });
  }
  try {
    const data = await setXPThreshold(value.tier, value.min_xp);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Threshold update failed:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update threshold' });
  }
});

module.exports = router;

