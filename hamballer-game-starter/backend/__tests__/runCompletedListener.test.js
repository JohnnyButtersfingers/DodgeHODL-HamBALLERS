const { mintBadgeWithRetry } = require('../listeners/runCompletedListener');

describe('mintBadgeWithRetry', () => {
  test('succeeds on first try', async () => {
    const badge = { mintBadge: jest.fn(() => Promise.resolve({ wait: jest.fn() })) };
    const success = await mintBadgeWithRetry(badge, '0xabc', 10, 1, 0);
    expect(success).toBe(true);
    expect(badge.mintBadge).toHaveBeenCalledTimes(1);
  });

  test('retries on failure and succeeds', async () => {
    const badge = { mintBadge: jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue({ wait: jest.fn() }) };
    const success = await mintBadgeWithRetry(badge, '0xabc', 10, 1, 0);
    expect(success).toBe(true);
    expect(badge.mintBadge).toHaveBeenCalledTimes(2);
  });

  test('returns false after retries exhausted', async () => {
    const badge = { mintBadge: jest.fn(() => Promise.reject(new Error('fail'))) };
    const success = await mintBadgeWithRetry(badge, '0xabc', 10, 1, 0);
    expect(success).toBe(false);
    expect(badge.mintBadge).toHaveBeenCalledTimes(2);
  });
});

