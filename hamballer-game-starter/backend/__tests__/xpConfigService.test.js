jest.mock('../config/database', () => ({ supabase: null }));
const { getXPThresholds, setXPThreshold } = require('../services/xpConfigService');

describe('xpConfigService with mock db', () => {
  test('getXPThresholds returns defaults without db', async () => {
    const thresholds = await getXPThresholds();
    expect(thresholds).toEqual({ epic: 1000, legendary: 2000 });
  });

  test('setXPThreshold returns data without db', async () => {
    const result = await setXPThreshold('epic', 1500);
    expect(result).toEqual({ tier: 'epic', min_xp: 1500 });
  });
});

