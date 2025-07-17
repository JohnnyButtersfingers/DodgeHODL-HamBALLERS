const request = require('supertest');
const express = require('express');

jest.mock('../services/xpConfigService');
const { setXPThreshold, getXPThresholds } = require('../services/xpConfigService');

const adminRoutes = require('../routes/admin');
const configRoutes = require('../routes/config');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);

beforeAll(() => {
  process.env.ADMIN_TOKEN = 'secret';
});

describe('XP threshold routes', () => {
  test('POST /api/admin/xp-thresholds', async () => {
    setXPThreshold.mockResolvedValue({ tier: 'epic', min_xp: 100 });
    const res = await request(app)
      .post('/api/admin/xp-thresholds')
      .set('Authorization', 'Bearer secret')
      .send({ tier: 'epic', min_xp: 100 });
    expect(res.status).toBe(200);
    expect(setXPThreshold).toHaveBeenCalledWith('epic', 100);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/config/xp-thresholds', async () => {
    getXPThresholds.mockResolvedValue({ epic: 50, legendary: 150 });
    const res = await request(app).get('/api/config/xp-thresholds');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ epic: 50, legendary: 150 });
  });
});

