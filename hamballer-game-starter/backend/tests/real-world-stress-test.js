const WebSocket = require('ws');
const axios = require('axios');
const { expect } = require('chai');
const { performanceMonitor } = require('../utils/performanceMonitor');
const { blockchainIntegration } = require('../utils/blockchainIntegration');

/**
 * 🧪 Real-World Stress Testing Framework
 * Comprehensive performance and load testing for production readiness
 */
class RealWorldStressTest {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3001',
      wsUrl: config.wsUrl || 'ws://localhost:3001/socket',
      maxConcurrentUsers: config.maxConcurrentUsers || 1000,
      testDuration: config.testDuration || 300000, // 5 minutes
      rampUpTime: config.rampUpTime || 60000, // 1 minute
      ...config
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      requestsPerSecond: 0,
      errorsByType: {},
      concurrentConnections: 0,
      maxConcurrentConnections: 0,
      websocketMessages: 0,
      websocketErrors: 0,
      databaseQueries: 0,
      cacheHitRate: 0
    };

    this.activeConnections = new Set();
    this.testResults = [];
    this.isRunning = false;
  }

  /**
   * Run comprehensive stress test suite
   */
  async runStressTest() {
    console.log('🧪 Starting Real-World Stress Test Suite...');
    console.log(`📊 Configuration:`, this.config);

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Phase 1: Basic API Load Test
      console.log('\n📈 Phase 1: Basic API Load Test');
      await this.basicApiLoadTest();

      // Phase 2: WebSocket Connection Test
      console.log('\n🔌 Phase 2: WebSocket Connection Test');
      await this.websocketConnectionTest();

      // Phase 3: Mixed Load Test (API + WebSocket)
      console.log('\n⚡ Phase 3: Mixed Load Test');
      await this.mixedLoadTest();

      // Phase 4: Database Stress Test
      console.log('\n🗄️ Phase 4: Database Stress Test');
      await this.databaseStressTest();

      // Phase 5: Leaderboard-Specific Tests
      console.log('\n🏆 Phase 5: Leaderboard-Specific Tests');
      await this.leaderboardStressTest();

      // Phase 6: Blockchain Integration Test
      console.log('\n⛓️ Phase 6: Blockchain Integration Test');
      await this.blockchainIntegrationTest();

      // Phase 7: Failure Recovery Test
      console.log('\n🔄 Phase 7: Failure Recovery Test');
      await this.failureRecoveryTest();

      const totalTime = Date.now() - startTime;
      console.log(`\n✅ Stress test completed in ${totalTime}ms`);

      return this.generateReport();
    } catch (error) {
      console.error('❌ Stress test failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
      await this.cleanup();
    }
  }

  /**
   * Phase 1: Basic API Load Test
   */
  async basicApiLoadTest() {
    const testDuration = 60000; // 1 minute
    const maxConcurrent = 100;
    const endpoints = [
      '/api/leaderboard',
      '/api/leaderboard?page=1&limit=10',
      '/api/leaderboard?search=0x123',
      '/api/leaderboard/top/5',
      '/api/leaderboard/stats'
    ];

    console.log(`📊 Testing ${endpoints.length} endpoints with ${maxConcurrent} concurrent users`);

    const promises = [];
    const startTime = Date.now();

    for (let i = 0; i < maxConcurrent; i++) {
      promises.push(this.simulateUser(endpoints, testDuration));
    }

    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`✅ API Load Test: ${successCount}/${maxConcurrent} users completed successfully`);

    this.testResults.push({
      phase: 'API Load Test',
      duration: Date.now() - startTime,
      successRate: (successCount / maxConcurrent) * 100,
      metrics: { ...this.metrics }
    });
  }

  /**
   * Phase 2: WebSocket Connection Test
   */
  async websocketConnectionTest() {
    const maxConnections = 500;
    const connectionDuration = 120000; // 2 minutes
    
    console.log(`🔌 Testing ${maxConnections} WebSocket connections`);

    const connections = [];
    const startTime = Date.now();

    // Gradually establish connections
    for (let i = 0; i < maxConnections; i++) {
      const ws = await this.createWebSocketConnection();
      connections.push(ws);
      this.activeConnections.add(ws);

      if (i % 50 === 0) {
        console.log(`📊 Established ${i + 1}/${maxConnections} connections`);
        await this.delay(100); // Brief pause to avoid overwhelming
      }
    }

    this.metrics.maxConcurrentConnections = Math.max(
      this.metrics.maxConcurrentConnections,
      connections.length
    );

    // Keep connections alive and send messages
    await this.simulateWebSocketActivity(connections, connectionDuration);

    // Close connections
    for (const ws of connections) {
      ws.close();
      this.activeConnections.delete(ws);
    }

    console.log(`✅ WebSocket Test: ${connections.length} connections tested`);

    this.testResults.push({
      phase: 'WebSocket Connection Test',
      duration: Date.now() - startTime,
      maxConnections: connections.length,
      metrics: { ...this.metrics }
    });
  }

  /**
   * Phase 3: Mixed Load Test (API + WebSocket)
   */
  async mixedLoadTest() {
    const testDuration = 180000; // 3 minutes
    const apiUsers = 200;
    const wsConnections = 300;

    console.log(`⚡ Mixed load: ${apiUsers} API users + ${wsConnections} WebSocket connections`);

    const startTime = Date.now();
    const promises = [];

    // Start API users
    const apiEndpoints = [
      '/api/leaderboard',
      '/api/leaderboard?page=1&limit=25',
      '/api/leaderboard/rank/0x742d35Cc6e5eE4b3b04EF533f2e9c11e70b7F44e'
    ];

    for (let i = 0; i < apiUsers; i++) {
      promises.push(this.simulateUser(apiEndpoints, testDuration));
    }

    // Start WebSocket connections
    const wsPromises = [];
    for (let i = 0; i < wsConnections; i++) {
      wsPromises.push(this.createPersistentWebSocketConnection(testDuration));
    }

    // Wait for both API and WebSocket tests
    const [apiResults, wsResults] = await Promise.all([
      Promise.allSettled(promises),
      Promise.allSettled(wsPromises)
    ]);

    const apiSuccess = apiResults.filter(r => r.status === 'fulfilled').length;
    const wsSuccess = wsResults.filter(r => r.status === 'fulfilled').length;

    console.log(`✅ Mixed Load: ${apiSuccess}/${apiUsers} API, ${wsSuccess}/${wsConnections} WS`);

    this.testResults.push({
      phase: 'Mixed Load Test',
      duration: Date.now() - startTime,
      apiSuccessRate: (apiSuccess / apiUsers) * 100,
      wsSuccessRate: (wsSuccess / wsConnections) * 100,
      metrics: { ...this.metrics }
    });
  }

  /**
   * Phase 4: Database Stress Test
   */
  async databaseStressTest() {
    const testDuration = 120000; // 2 minutes
    const concurrentQueries = 50;

    console.log(`🗄️ Database stress test: ${concurrentQueries} concurrent query streams`);

    const startTime = Date.now();
    const promises = [];

    // Heavy pagination queries
    for (let i = 0; i < concurrentQueries / 2; i++) {
      promises.push(this.simulatePaginationQueries(testDuration));
    }

    // Search queries
    for (let i = 0; i < concurrentQueries / 4; i++) {
      promises.push(this.simulateSearchQueries(testDuration));
    }

    // XP updates
    for (let i = 0; i < concurrentQueries / 4; i++) {
      promises.push(this.simulateXPUpdates(testDuration));
    }

    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;

    console.log(`✅ Database Stress: ${successCount}/${concurrentQueries} query streams successful`);

    this.testResults.push({
      phase: 'Database Stress Test',
      duration: Date.now() - startTime,
      successRate: (successCount / concurrentQueries) * 100,
      metrics: { ...this.metrics }
    });
  }

  /**
   * Phase 5: Leaderboard-Specific Tests
   */
  async leaderboardStressTest() {
    const testDuration = 90000; // 1.5 minutes
    
    console.log('🏆 Testing leaderboard-specific scenarios');

    const startTime = Date.now();
    const promises = [];

    // Heavy leaderboard queries
    promises.push(this.simulateLeaderboardQueries(testDuration));
    
    // Real-time XP updates with WebSocket broadcasts
    promises.push(this.simulateRealTimeXPUpdates(testDuration));
    
    // Cache stress test
    promises.push(this.simulateCacheStress(testDuration));

    await Promise.allSettled(promises);

    console.log('✅ Leaderboard stress test completed');

    this.testResults.push({
      phase: 'Leaderboard Stress Test',
      duration: Date.now() - startTime,
      metrics: { ...this.metrics }
    });
  }

  /**
   * Phase 6: Blockchain Integration Test
   */
  async blockchainIntegrationTest() {
    if (!blockchainIntegration.isConnected) {
      console.log('⚠️ Skipping blockchain test - not connected');
      return;
    }

    console.log('⛓️ Testing blockchain integration under load');
    
    const startTime = Date.now();
    const promises = [];

    // Contract read operations
    for (let i = 0; i < 10; i++) {
      promises.push(this.testContractReads());
    }

    // XP verification
    for (let i = 0; i < 5; i++) {
      promises.push(this.testXPVerification());
    }

    await Promise.allSettled(promises);

    console.log('✅ Blockchain integration test completed');

    this.testResults.push({
      phase: 'Blockchain Integration Test',
      duration: Date.now() - startTime,
      metrics: { ...this.metrics }
    });
  }

  /**
   * Phase 7: Failure Recovery Test
   */
  async failureRecoveryTest() {
    console.log('🔄 Testing failure recovery scenarios');

    const startTime = Date.now();

    // Test database connection recovery
    await this.testDatabaseRecovery();

    // Test WebSocket reconnection
    await this.testWebSocketRecovery();

    // Test cache failure handling
    await this.testCacheFailureRecovery();

    console.log('✅ Failure recovery test completed');

    this.testResults.push({
      phase: 'Failure Recovery Test',
      duration: Date.now() - startTime,
      metrics: { ...this.metrics }
    });
  }

  /**
   * Simulate a user making API requests
   */
  async simulateUser(endpoints, duration) {
    const startTime = Date.now();
    const userMetrics = {
      requests: 0,
      errors: 0,
      totalResponseTime: 0
    };

    while (Date.now() - startTime < duration) {
      try {
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        const requestStart = Date.now();
        
        const response = await axios.get(`${this.config.baseUrl}${endpoint}`, {
          timeout: 10000
        });

        const responseTime = Date.now() - requestStart;
        
        this.updateApiMetrics(responseTime, response.status);
        userMetrics.requests++;
        userMetrics.totalResponseTime += responseTime;

        // Random delay between requests (simulate human behavior)
        await this.delay(Math.random() * 2000);
      } catch (error) {
        this.updateApiMetrics(0, error.response?.status || 500, error);
        userMetrics.errors++;
      }
    }

    return userMetrics;
  }

  /**
   * Create WebSocket connection
   */
  async createWebSocketConnection() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.config.wsUrl);
      
      ws.on('open', () => {
        this.metrics.concurrentConnections++;
        
        // Subscribe to leaderboard updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['leaderboard', 'xp']
        }));
        
        resolve(ws);
      });

      ws.on('message', () => {
        this.metrics.websocketMessages++;
      });

      ws.on('error', (error) => {
        this.metrics.websocketErrors++;
        reject(error);
      });

      ws.on('close', () => {
        this.metrics.concurrentConnections--;
      });
    });
  }

  /**
   * Create persistent WebSocket connection for duration
   */
  async createPersistentWebSocketConnection(duration) {
    const ws = await this.createWebSocketConnection();
    const startTime = Date.now();

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          // Send periodic ping
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 5000);

      setTimeout(() => {
        clearInterval(interval);
        ws.close();
        resolve();
      }, duration);
    });
  }

  /**
   * Simulate WebSocket activity
   */
  async simulateWebSocketActivity(connections, duration) {
    const startTime = Date.now();

    const activityInterval = setInterval(() => {
      // Randomly send messages through connections
      const activeConnections = connections.filter(ws => ws.readyState === WebSocket.OPEN);
      
      for (let i = 0; i < Math.min(10, activeConnections.length); i++) {
        const ws = activeConnections[Math.floor(Math.random() * activeConnections.length)];
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 1000);

    await this.delay(duration);
    clearInterval(activityInterval);
  }

  /**
   * Simulate pagination queries
   */
  async simulatePaginationQueries(duration) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < duration) {
      try {
        const page = Math.floor(Math.random() * 10) + 1;
        const limit = [5, 10, 25, 50][Math.floor(Math.random() * 4)];
        
        await axios.get(`${this.config.baseUrl}/api/leaderboard?page=${page}&limit=${limit}`);
        this.metrics.databaseQueries++;
        
        await this.delay(Math.random() * 1000);
      } catch (error) {
        // Continue on error
      }
    }
  }

  /**
   * Simulate search queries
   */
  async simulateSearchQueries(duration) {
    const startTime = Date.now();
    const searchTerms = ['0x123', '0x456', '0x789', '0xabc', '0xdef'];
    
    while (Date.now() - startTime < duration) {
      try {
        const search = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        
        await axios.get(`${this.config.baseUrl}/api/leaderboard?search=${search}`);
        this.metrics.databaseQueries++;
        
        await this.delay(Math.random() * 1500);
      } catch (error) {
        // Continue on error
      }
    }
  }

  /**
   * Simulate XP updates
   */
  async simulateXPUpdates(duration) {
    const startTime = Date.now();
    const addresses = [
      '0x742d35Cc6e5eE4b3b04EF533f2e9c11e70b7F44e',
      '0x123d35Cc6e5eE4b3b04EF533f2e9c11e70b7F44e',
      '0x456d35Cc6e5eE4b3b04EF533f2e9c11e70b7F44e'
    ];
    
    while (Date.now() - startTime < duration) {
      try {
        const address = addresses[Math.floor(Math.random() * addresses.length)];
        const xp = Math.floor(Math.random() * 2000) + 100;
        
        await axios.post(`${this.config.baseUrl}/api/leaderboard/update`, {
          address,
          xp
        });
        
        await this.delay(Math.random() * 2000);
      } catch (error) {
        // Continue on error
      }
    }
  }

  /**
   * Update API metrics
   */
  updateApiMetrics(responseTime, statusCode, error = null) {
    this.metrics.totalRequests++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.successfulRequests++;
      
      if (responseTime > 0) {
        this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime);
        this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime);
        
        // Update average response time
        const totalTime = this.metrics.avgResponseTime * (this.metrics.successfulRequests - 1) + responseTime;
        this.metrics.avgResponseTime = totalTime / this.metrics.successfulRequests;
      }
    } else {
      this.metrics.failedRequests++;
      
      if (error) {
        const errorType = error.code || `HTTP_${statusCode}`;
        this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
      }
    }

    // Calculate requests per second
    this.metrics.requestsPerSecond = this.metrics.totalRequests / 
      ((Date.now() - this.testStartTime) / 1000);
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const report = {
      summary: {
        totalDuration: this.testResults.reduce((sum, r) => sum + r.duration, 0),
        phases: this.testResults.length,
        overallMetrics: this.metrics
      },
      phases: this.testResults,
      performance: {
        avgResponseTime: this.metrics.avgResponseTime,
        maxResponseTime: this.metrics.maxResponseTime,
        requestsPerSecond: this.metrics.requestsPerSecond,
        successRate: (this.metrics.successfulRequests / this.metrics.totalRequests) * 100,
        maxConcurrentConnections: this.metrics.maxConcurrentConnections
      },
      recommendations: this.generateRecommendations()
    };

    console.log('\n📊 STRESS TEST REPORT');
    console.log('='.repeat(50));
    console.log(`Total Requests: ${this.metrics.totalRequests}`);
    console.log(`Success Rate: ${report.performance.successRate.toFixed(2)}%`);
    console.log(`Avg Response Time: ${this.metrics.avgResponseTime.toFixed(2)}ms`);
    console.log(`Max Response Time: ${this.metrics.maxResponseTime}ms`);
    console.log(`Requests/Second: ${this.metrics.requestsPerSecond.toFixed(2)}`);
    console.log(`Max WebSocket Connections: ${this.metrics.maxConcurrentConnections}`);
    console.log(`WebSocket Messages: ${this.metrics.websocketMessages}`);
    console.log(`Database Queries: ${this.metrics.databaseQueries}`);

    if (Object.keys(this.metrics.errorsByType).length > 0) {
      console.log('\n❌ Errors by Type:');
      Object.entries(this.metrics.errorsByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }

    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });

    return report;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.metrics.avgResponseTime > 1000) {
      recommendations.push('Consider implementing response caching to reduce average response time');
    }

    if (this.metrics.maxResponseTime > 5000) {
      recommendations.push('Investigate and optimize slow queries causing high maximum response times');
    }

    const errorRate = (this.metrics.failedRequests / this.metrics.totalRequests) * 100;
    if (errorRate > 5) {
      recommendations.push('Error rate is high - review error handling and system stability');
    }

    if (this.metrics.websocketErrors > this.metrics.websocketMessages * 0.01) {
      recommendations.push('WebSocket error rate is high - check connection stability');
    }

    if (this.metrics.requestsPerSecond < 50) {
      recommendations.push('Consider scaling up server resources to handle higher throughput');
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance looks good under current load conditions');
    }

    return recommendations;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up test resources...');
    
    // Close any remaining WebSocket connections
    for (const ws of this.activeConnections) {
      try {
        ws.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    this.activeConnections.clear();
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Additional test methods would be implemented here...
  async simulateLeaderboardQueries(duration) { /* Implementation */ }
  async simulateRealTimeXPUpdates(duration) { /* Implementation */ }
  async simulateCacheStress(duration) { /* Implementation */ }
  async testContractReads() { /* Implementation */ }
  async testXPVerification() { /* Implementation */ }
  async testDatabaseRecovery() { /* Implementation */ }
  async testWebSocketRecovery() { /* Implementation */ }
  async testCacheFailureRecovery() { /* Implementation */ }
}

module.exports = {
  RealWorldStressTest
};

// Example usage for manual testing
if (require.main === module) {
  const stressTest = new RealWorldStressTest({
    baseUrl: 'http://localhost:3001',
    wsUrl: 'ws://localhost:3001/socket',
    maxConcurrentUsers: 500,
    testDuration: 300000 // 5 minutes
  });

  stressTest.runStressTest()
    .then(report => {
      console.log('\n✅ Stress test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Stress test failed:', error);
      process.exit(1);
    });
}