const request = require('supertest');
const { app } = require('../index');
const { getXpLeaderboard, getPlayerXPAndRank } = require('../utils/xpStore');
const fs = require('fs').promises;
const path = require('path');

// Read actual JSON file for tests (fixture approach)
const XP_FIXTURE_PATH = path.join(__dirname, '..', 'data', 'xp.json');

describe('Leaderboard API', () => {
  let fixtureData;

  beforeAll(async () => {
    // Load the actual XP fixture data once for all tests
    const data = await fs.readFile(XP_FIXTURE_PATH, 'utf8');
    fixtureData = JSON.parse(data);
  });

  describe('GET /api/leaderboard', () => {
    it('should return top 5 players with correct shape from actual JSON file', async () => {
      const response = await request(app)
        .get('/api/leaderboard')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        count: 5,
        source: 'local_xp_store'
      });

      // Verify we get exactly 5 entries
      expect(response.body.data).toHaveLength(5);
      
      // Verify the data structure matches our fixture (sorted by XP desc)
      const expectedTopFive = fixtureData
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 5)
        .map(player => ({ address: player.address, xp: player.xp }));
      
      expect(response.body.data).toEqual(expectedTopFive);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should verify all 5 entries have required shape', async () => {
      const response = await request(app)
        .get('/api/leaderboard')
        .expect(200);

      // Validate each entry has the exact shape: { address, xp }
      response.body.data.forEach(entry => {
        expect(entry).toHaveProperty('address');
        expect(entry).toHaveProperty('xp');
        expect(typeof entry.address).toBe('string');
        expect(typeof entry.xp).toBe('number');
        expect(entry.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
        
        // Ensure no extra fields are returned
        expect(Object.keys(entry)).toEqual(['address', 'xp']);
      });
      
      // Verify XP values are in descending order
      const xpValues = response.body.data.map(player => player.xp);
      const sortedXpValues = [...xpValues].sort((a, b) => b - a);
      expect(xpValues).toEqual(sortedXpValues);
    });
  });

  describe('GET /api/leaderboard/rank/:address', () => {
    const validAddress = '0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2'; // Top player from fixture

    it('should return player rank with correct shape from actual JSON file', async () => {
      const response = await request(app)
        .get(`/api/leaderboard/rank/${validAddress}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        source: 'local_xp_store'
      });

      const { data } = response.body;
      
      // Validate structure
      expect(data).toHaveProperty('address');
      expect(data).toHaveProperty('xp');
      expect(data).toHaveProperty('rank');
      expect(data).toHaveProperty('isTopFive');
      expect(data).toHaveProperty('lastUpdated');
      
      // Validate types
      expect(typeof data.address).toBe('string');
      expect(typeof data.xp).toBe('number');
      expect(typeof data.rank).toBe('number');
      expect(typeof data.isTopFive).toBe('boolean');
      expect(typeof data.lastUpdated).toBe('string');
      
      // This address should be rank 1 (highest XP in fixture)
      expect(data.address).toBe(validAddress);
      expect(data.rank).toBe(1);
      expect(data.isTopFive).toBe(true);
      expect(data.xp).toBe(1250);
      
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return 404 when player not found', async () => {
      const nonExistentAddress = '0x1234567890123456789012345678901234567890';

      const response = await request(app)
        .get(`/api/leaderboard/rank/${nonExistentAddress}`)
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
    });

    it('should handle case-insensitive address lookup', async () => {
      // Test with lowercase version of an address from our fixture
      const lowercaseAddress = validAddress.toLowerCase();
      
      const response = await request(app)
        .get(`/api/leaderboard/rank/${lowercaseAddress}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.address).toBe(validAddress); // Original case preserved
      expect(response.body.data.rank).toBe(1);
    });
  });

  describe('Fixture Data Validation', () => {
    it('should verify fixture has exactly 5 entries with valid structure', async () => {
      expect(fixtureData).toHaveLength(5);
      
      fixtureData.forEach(entry => {
        expect(entry).toHaveProperty('address');
        expect(entry).toHaveProperty('xp');
        expect(entry).toHaveProperty('lastUpdated');
        
        expect(typeof entry.address).toBe('string');
        expect(typeof entry.xp).toBe('number');
        expect(typeof entry.lastUpdated).toBe('string');
        expect(entry.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      });
    });

    it('should verify XP values are realistic and unique', async () => {
      const xpValues = fixtureData.map(player => player.xp);
      const uniqueXpValues = [...new Set(xpValues)];
      
      // All XP values should be unique
      expect(xpValues).toHaveLength(uniqueXpValues.length);
      
      // All XP values should be positive
      xpValues.forEach(xp => {
        expect(xp).toBeGreaterThan(0);
      });
    });
  });
});

// TODO: Add integration tests for XP store utility functions directly
// TODO: Add performance tests for larger datasets
// TODO: When migrating to database/contract, update tests for new data source
// TODO: Add tests for saveXpData() function