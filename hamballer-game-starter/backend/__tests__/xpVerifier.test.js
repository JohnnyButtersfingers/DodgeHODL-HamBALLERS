const { verifyClaim } = require('../services/xpVerifierService');

describe('xpVerifierService.verifyClaim', () => {
  test('returns true for valid proof', async () => {
    const contract = { verifyAndStoreClaim: jest.fn().mockResolvedValue(true) };
    const result = await verifyClaim(contract, 1, '0x00');
    expect(result).toBe(true);
    expect(contract.verifyAndStoreClaim).toHaveBeenCalledWith(1, '0x00');
  });

  test('returns false for invalid proof', async () => {
    const contract = { verifyAndStoreClaim: jest.fn().mockResolvedValue(false) };
    const result = await verifyClaim(contract, 1, '0x00');
    expect(result).toBe(false);
  });

  test('throws on contract error', async () => {
    const contract = { verifyAndStoreClaim: jest.fn().mockRejectedValue(new Error('already used')) };
    await expect(verifyClaim(contract, 1, '0x00')).rejects.toThrow('already used');
  });
});

