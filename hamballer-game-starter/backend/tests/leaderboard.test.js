const request = require('supertest');
const { app } = require('../index');
const { getTopPlayersByXP, getPlayerXPAndRank } = require('../utils/xpStore');

// Mock the XP store to avoid file system dependencies in tests
jest.mock('../utils/xpStore');

describe('Leaderboard API', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/leaderboard', () => {
    it('should return top 5 players with correct shape', async () => {
      // Mock the XP store response
      const mockLeaderboard = [
        { address: "0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2", xp: 1250 },
        { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", xp: 980 },
        { address: "0x8ba1f109551bD432803012645Hac136c5C2eE5e3", xp: 875 },
        { address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", xp: 420 },
        { address: "0xaB5801a7D398351b8bE11C439e05C5B3259aeC9B", xp: 350 }
      ];

      getTopPlayersByXP.mockResolvedValue(mockLeaderboard);

      const response = await request(app)
        .get('/api/leaderboard')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: mockLeaderboard,
        count: 5,
        source: 'local_xp_store'
      });

      expect(response.body.timestamp).toBeDefined();
      expect(getTopPlayersByXP).toHaveBeenCalledWith(5);
    });

    it('should handle XP store errors gracefully', async () => {
      getTopPlayersByXP.mockRejectedValue(new Error('XP store unavailable'));

      const response = await request(app)
        .get('/api/leaderboard')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to fetch leaderboard data',
        message: 'XP store unavailable'
      });
    });

    it('should return empty array when no players exist', async () => {
      getTopPlayersByXP.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/leaderboard')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: [],
        count: 0,
        source: 'local_xp_store'
      });
    });
  });

  describe('GET /api/leaderboard/rank/:address', () => {
    const validAddress = '0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2';

    it('should return player rank with correct shape', async () => {
      const mockPlayerRank = {
        address: validAddress,
        xp: 1250,
        rank: 1,
        isTopFive: true,
        lastUpdated: '2024-01-15T10:30:00Z'
      };

      getPlayerXPAndRank.mockResolvedValue(mockPlayerRank);

      const response = await request(app)
        .get(`/api/leaderboard/rank/${validAddress}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: mockPlayerRank,
        source: 'local_xp_store'
      });

      expect(response.body.timestamp).toBeDefined();
      expect(getPlayerXPAndRank).toHaveBeenCalledWith(validAddress);
    });

    it('should return 404 when player not found', async () => {
      getPlayerXPAndRank.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/leaderboard/rank/${validAddress}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'User not found in leaderboard'
      });
    });

    it('should validate Ethereum address format', async () => {
      const invalidAddress = 'invalid-address';

      const response = await request(app)
        .get(`/api/leaderboard/rank/${invalidAddress}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid Ethereum address format'
      });

      // Should not call XP store with invalid address
      expect(getPlayerXPAndRank).not.toHaveBeenCalled();
    });

    it('should handle XP store errors gracefully', async () => {
      getPlayerXPAndRank.mockRejectedValue(new Error('XP store unavailable'));

      const response = await request(app)
        .get(`/api/leaderboard/rank/${validAddress}`)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to fetch user rank',
        message: 'XP store unavailable'
      });
    });

    it('should handle case-insensitive address lookup', async () => {
      const mockPlayerRank = {
        address: validAddress,
        xp: 1250,
        rank: 1,
        isTopFive: true,
        lastUpdated: '2024-01-15T10:30:00Z'
      };

      getPlayerXPAndRank.mockResolvedValue(mockPlayerRank);

      // Test with lowercase address
      const lowercaseAddress = validAddress.toLowerCase();
      const response = await request(app)
        .get(`/api/leaderboard/rank/${lowercaseAddress}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(getPlayerXPAndRank).toHaveBeenCalledWith(lowercaseAddress);
    });
  });

  describe('Data Structure Validation', () => {
    it('should validate leaderboard entry structure', async () => {
      const mockLeaderboard = [
        { address: "0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2", xp: 1250 }
      ];

      getTopPlayersByXP.mockResolvedValue(mockLeaderboard);

      const response = await request(app)
        .get('/api/leaderboard')
        .expect(200);

      // Validate each entry has required fields
      response.body.data.forEach(entry => {
        expect(entry).toHaveProperty('address');
        expect(entry).toHaveProperty('xp');
        expect(typeof entry.address).toBe('string');
        expect(typeof entry.xp).toBe('number');
        expect(entry.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      });
    });

    it('should validate player rank structure', async () => {
      const mockPlayerRank = {
        address: '0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2',
        xp: 1250,
        rank: 1,
        isTopFive: true,
        lastUpdated: '2024-01-15T10:30:00Z'
      };

      getPlayerXPAndRank.mockResolvedValue(mockPlayerRank);

      const response = await request(app)
        .get('/api/leaderboard/rank/0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2')
        .expect(200);

      const { data } = response.body;
      
      // Validate all required fields are present with correct types
      expect(data).toHaveProperty('address');
      expect(data).toHaveProperty('xp');
      expect(data).toHaveProperty('rank');
      expect(data).toHaveProperty('isTopFive');
      expect(data).toHaveProperty('lastUpdated');
      
      expect(typeof data.address).toBe('string');
      expect(typeof data.xp).toBe('number');
      expect(typeof data.rank).toBe('number');
      expect(typeof data.isTopFive).toBe('boolean');
      expect(typeof data.lastUpdated).toBe('string');
    });
  });
});

// TODO: Add integration tests that test against actual JSON file
// TODO: Add performance tests for large datasets
// TODO: Add tests for XP store utility functions directly
// TODO: When migrating to database/contract, update mocks and test integration