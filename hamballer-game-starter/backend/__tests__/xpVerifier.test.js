const { verifyClaim } = require('../services/xpVerifierService');

jest.mock('../services/xpVerifierService');

const mockVerifier = {
  verifyAndStoreClaim: jest.fn()
};

describe('XPVerifier integration', () => {
  test('valid proof mints badge', async () => {
    mockVerifier.verifyAndStoreClaim.mockResolvedValue(true);
    const result = await verifyClaim(mockVerifier, 1, '0x00');
    expect(result).toBe(true);
  });

  test('invalid proof emits failure', async () => {
    mockVerifier.verifyAndStoreClaim.mockResolvedValue(false);
    const result = await verifyClaim(mockVerifier, 1, '0x00');
    expect(result).toBe(false);
  });

  test('replay is rejected', async () => {
    mockVerifier.verifyAndStoreClaim
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('already used'));
    await verifyClaim(mockVerifier, 1, '0x00');
    await expect(verifyClaim(mockVerifier, 1, '0x00')).rejects.toThrow('already used');
  });
});

