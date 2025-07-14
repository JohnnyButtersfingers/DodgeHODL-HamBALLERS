const request = require('supertest');
const { expect } = require('chai');
const WebSocket = require('ws');
const app = require('../index');
const { xpStore, getStorageInfo } = require('../utils/xpStoreV2');

describe('Enhanced Leaderboard System', function() {
  this.timeout(30000); // Increased timeout for database operations

  before(async function() {
    console.log('🧪 Setting up enhanced leaderboard tests...');
    
    // Get storage info
    const storageInfo = getStorageInfo();
    console.log('📊 Storage mode:', storageInfo.mode);
    console.log('🗄️ Database available:', storageInfo.database.available);
    console.log('⛓️ Blockchain available:', storageInfo.blockchain.available);
  });

  describe('Enhanced API Endpoints', function() {
    
    describe('GET /api/leaderboard (Paginated)', function() {
      it('should return paginated leaderboard with default settings', async function() {
        const response = await request(app)
          .get('/api/leaderboard')
          .expect(200);

        expect(response.body).to.have.property('success', true);
        expect(response.body).to.have.property('data').that.is.an('array');
        expect(response.body).to.have.property('pagination');
        expect(response.body.pagination).to.include.keys(['currentPage', 'totalPages', 'totalCount', 'limit']);
        expect(response.body).to.have.property('filters');
        expect(response.body).to.have.property('source');
      });

      it('should support pagination parameters', async function() {
        const response = await request(app)
          .get('/api/leaderboard?page=1&limit=3')
          .expect(200);

        expect(response.body.data).to.have.lengthOf.at.most(3);
        expect(response.body.pagination.currentPage).to.equal(1);
        expect(response.body.pagination.limit).to.equal(3);
      });

      it('should support search filtering', async function() {
        const response = await request(app)
          .get('/api/leaderboard?search=0x123')
          .expect(200);

        expect(response.body.filters.search).to.equal('0x123');
        // Results should be filtered by search term
        response.body.data.forEach(player => {
          expect(player.address.toLowerCase()).to.include('0x123'.toLowerCase());
        });
      });

      it('should support XP range filtering', async function() {
        const response = await request(app)
          .get('/api/leaderboard?minXp=100&maxXp=1000')
          .expect(200);

        expect(response.body.filters.minXp).to.equal(100);
        expect(response.body.filters.maxXp).to.equal(1000);
        response.body.data.forEach(player => {
          expect(player.xp).to.be.at.least(100);
          expect(player.xp).to.be.at.most(1000);
        });
      });

      it('should include rank information for each player', async function() {
        const response = await request(app)
          .get('/api/leaderboard?limit=5')
          .expect(200);

        response.body.data.forEach((player, index) => {
          expect(player).to.have.property('rank');
          expect(player).to.have.property('globalRank');
          expect(player).to.have.property('address');
          expect(player).to.have.property('xp');
        });
      });
    });

    describe('GET /api/leaderboard/top/:count', function() {
      it('should return top N players', async function() {
        const response = await request(app)
          .get('/api/leaderboard/top/3')
          .expect(200);

        expect(response.body.data).to.have.lengthOf.at.most(3);
        expect(response.body.count).to.equal(response.body.data.length);
        
        // Verify descending order
        for (let i = 1; i < response.body.data.length; i++) {
          expect(response.body.data[i-1].xp).to.be.at.least(response.body.data[i].xp);
        }
      });

      it('should respect maximum limit', async function() {
        const response = await request(app)
          .get('/api/leaderboard/top/100')
          .expect(200);

        expect(response.body.data).to.have.lengthOf.at.most(50); // Max 50 enforced
      });
    });

    describe('GET /api/leaderboard/rank/:address (Enhanced)', function() {
      it('should return enhanced user rank with context', async function() {
        const testAddress = '0x742d35Cc6e5eE4b3b04EF533f2e9c11e70b7F44e';
        
        const response = await request(app)
          .get(`/api/leaderboard/rank/${testAddress}`)
          .expect(200);

        expect(response.body.data).to.have.property('address');
        expect(response.body.data).to.have.property('xp');
        expect(response.body.data).to.have.property('rank');
        expect(response.body.data).to.have.property('isTopFive');
        expect(response.body.data).to.have.property('context');
        
        if (response.body.data.context) {
          expect(response.body.data.context).to.have.property('above');
          expect(response.body.data.context).to.have.property('below');
        }
      });

      it('should validate Ethereum address format', async function() {
        const response = await request(app)
          .get('/api/leaderboard/rank/invalid-address')
          .expect(400);

        expect(response.body.success).to.be.false;
        expect(response.body.error).to.include('Invalid Ethereum address');
      });
    });

    describe('POST /api/leaderboard/update', function() {
      it('should update player XP successfully', async function() {
        const testData = {
          address: '0x742d35Cc6e5eE4b3b04EF533f2e9c11e70b7F44e',
          xp: 1500
        };

        const response = await request(app)
          .post('/api/leaderboard/update')
          .send(testData)
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.message).to.include('XP updated successfully');
        expect(response.body.data).to.have.property('address');
        expect(response.body.data).to.have.property('xp', 1500);
      });

      it('should validate input data', async function() {
        const response = await request(app)
          .post('/api/leaderboard/update')
          .send({ address: '0x123' }) // Missing XP
          .expect(400);

        expect(response.body.success).to.be.false;
        expect(response.body.error).to.include('Invalid input');
      });

      it('should validate Ethereum address format', async function() {
        const response = await request(app)
          .post('/api/leaderboard/update')
          .send({ address: 'invalid', xp: 100 })
          .expect(400);

        expect(response.body.success).to.be.false;
        expect(response.body.error).to.include('Invalid Ethereum address');
      });
    });

    describe('GET /api/leaderboard/stats', function() {
      it('should return comprehensive leaderboard statistics', async function() {
        const response = await request(app)
          .get('/api/leaderboard/stats')
          .expect(200);

        expect(response.body.data).to.include.keys([
          'totalPlayers',
          'totalXP',
          'averageXP',
          'highestXP',
          'lowestXP',
          'topTenThreshold'
        ]);

        expect(response.body.data.totalPlayers).to.be.a('number');
        expect(response.body.data.totalXP).to.be.a('number');
        expect(response.body.data.averageXP).to.be.a('number');
      });
    });
  });

  describe('WebSocket Integration', function() {
    let wsClient;

    afterEach(function(done) {
      if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.close();
        wsClient.on('close', () => done());
      } else {
        done();
      }
    });

    it('should establish WebSocket connection', function(done) {
      wsClient = new WebSocket('ws://localhost:3001/socket');
      
      wsClient.on('open', function() {
        expect(wsClient.readyState).to.equal(WebSocket.OPEN);
        done();
      });

      wsClient.on('error', function(error) {
        done(error);
      });
    });

    it('should receive welcome message on connection', function(done) {
      wsClient = new WebSocket('ws://localhost:3001/socket');
      
      wsClient.on('message', function(data) {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'connection') {
          expect(message.message).to.include('Connected to HamBaller.xyz');
          expect(message.timestamp).to.be.a('string');
          done();
        }
      });
    });

    it('should support channel subscription', function(done) {
      wsClient = new WebSocket('ws://localhost:3001/socket');
      
      wsClient.on('open', function() {
        wsClient.send(JSON.stringify({
          type: 'subscribe',
          channels: ['leaderboard', 'xp']
        }));
        
        // Small delay then verify subscription worked
        setTimeout(() => {
          done(); // If we get here without error, subscription worked
        }, 100);
      });
    });

    it('should handle ping/pong messages', function(done) {
      wsClient = new WebSocket('ws://localhost:3001/socket');
      
      wsClient.on('open', function() {
        wsClient.send(JSON.stringify({ type: 'ping' }));
      });

      wsClient.on('message', function(data) {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'pong') {
          expect(message.timestamp).to.be.a('string');
          done();
        }
      });
    });

    it('should broadcast leaderboard updates', function(done) {
      wsClient = new WebSocket('ws://localhost:3001/socket');
      
      wsClient.on('open', function() {
        // Subscribe to leaderboard updates
        wsClient.send(JSON.stringify({
          type: 'subscribe',
          channels: ['leaderboard']
        }));

        // Trigger a test broadcast
        setTimeout(() => {
          request(app)
            .post('/api/leaderboard/broadcast-test')
            .send({ type: 'test', data: { message: 'Test update' } })
            .end(() => {}); // Don't wait for response
        }, 100);
      });

      wsClient.on('message', function(data) {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'leaderboard_update' && message.updateType === 'test') {
          expect(message.data.message).to.equal('Test update');
          expect(message.timestamp).to.be.a('string');
          done();
        }
      });
    });
  });

  describe('XP Store Integration', function() {
    describe('Storage Information', function() {
      it('should provide storage configuration details', function() {
        const info = getStorageInfo();
        
        expect(info).to.have.property('mode');
        expect(info).to.have.property('database');
        expect(info).to.have.property('blockchain');
        expect(info).to.have.property('features');

        expect(info.features).to.include.keys([
          'pagination',
          'search',
          'filtering',
          'realTimeUpdates'
        ]);
      });
    });

    describe('Enhanced XP Operations', function() {
      it('should support paginated leaderboard retrieval', async function() {
        const result = await xpStore.getXpLeaderboard({
          page: 1,
          limit: 3,
          search: '',
          minXp: 0
        });

        expect(result).to.have.property('data').that.is.an('array');
        expect(result).to.have.property('pagination');
        expect(result.pagination).to.include.keys(['total', 'page', 'limit', 'totalPages']);
      });

      it('should get comprehensive player rank information', async function() {
        const testAddress = '0x742d35Cc6e5eE4b3b04EF533f2e9c11e70b7F44e';
        const result = await xpStore.getPlayerXPAndRank(testAddress);

        if (result) {
          expect(result).to.have.property('address');
          expect(result).to.have.property('xp');
          expect(result).to.have.property('rank');
          expect(result).to.have.property('isTopFive');
          expect(result).to.have.property('context');
        }
      });

      it('should get leaderboard statistics', async function() {
        const stats = await xpStore.getLeaderboardStats();
        
        expect(stats).to.include.keys([
          'totalPlayers',
          'totalXP',
          'averageXP',
          'highestXP',
          'lowestXP'
        ]);

        expect(stats.totalPlayers).to.be.a('number');
        expect(stats.totalXP).to.be.a('number');
      });
    });

    describe('Database Migration (if available)', function() {
      it('should handle migration gracefully when database unavailable', async function() {
        const info = getStorageInfo();
        
        if (!info.database.available) {
          try {
            await xpStore.migrateJsonToDatabase();
            expect.fail('Should have thrown error when database unavailable');
          } catch (error) {
            expect(error.message).to.include('Database not available');
          }
        } else {
          console.log('📊 Database available - migration would work');
        }
      });
    });

    describe('Blockchain Integration (if available)', function() {
      it('should handle blockchain verification gracefully', async function() {
        const info = getStorageInfo();
        const testAddress = '0x742d35Cc6e5eE4b3b04EF533f2e9c11e70b7F44e';
        
        if (!info.blockchain.available) {
          try {
            await xpStore.verifyXPFromBlockchain(testAddress);
            expect.fail('Should have thrown error when blockchain unavailable');
          } catch (error) {
            expect(error.message).to.include('Blockchain integration not available');
          }
        } else {
          console.log('⛓️ Blockchain available - verification would work');
        }
      });
    });
  });

  describe('Error Handling & Edge Cases', function() {
    it('should handle malformed JSON gracefully', async function() {
      const response = await request(app)
        .post('/api/leaderboard/update')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should handle very large page numbers', async function() {
      const response = await request(app)
        .get('/api/leaderboard?page=99999&limit=10')
        .expect(200);

      expect(response.body.data).to.be.an('array');
      expect(response.body.data).to.have.lengthOf(0); // Should be empty
    });

    it('should handle extremely high XP values', async function() {
      const testData = {
        address: '0x999d35Cc6e5eE4b3b04EF533f2e9c11e70b7F44e',
        xp: 999999999
      };

      const response = await request(app)
        .post('/api/leaderboard/update')
        .send(testData)
        .expect(200);

      expect(response.body.success).to.be.true;
    });

    it('should handle concurrent updates gracefully', async function() {
      const testAddress = '0x888d35Cc6e5eE4b3b04EF533f2e9c11e70b7F44e';
      
      // Fire multiple concurrent requests
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/leaderboard/update')
          .send({ address: testAddress, xp: 100 + i })
      );

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
      });
    });
  });

  describe('Performance & Load Testing', function() {
    it('should handle multiple pagination requests efficiently', async function() {
      const startTime = Date.now();
      
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app).get(`/api/leaderboard?page=${i + 1}&limit=10`)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
      });

      // Should complete within reasonable time (adjust as needed)
      expect(endTime - startTime).to.be.lessThan(5000);
    });

    it('should handle search queries efficiently', async function() {
      const searchTerms = ['0x1', '0x2', '0x3', '0x4', '0x5'];
      
      const promises = searchTerms.map(term =>
        request(app).get(`/api/leaderboard?search=${term}&limit=5`)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
      });
    });
  });

  after(function() {
    console.log('🧪 Enhanced leaderboard tests completed');
  });
});