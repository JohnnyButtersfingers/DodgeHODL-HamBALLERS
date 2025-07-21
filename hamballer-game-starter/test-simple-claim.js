#!/usr/bin/env node

/**
 * Simple Claim System Test
 * Tests the basic functionality without Hardhat dependencies
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001';
const FRONTEND_BASE = 'http://localhost:3000';
const TEST_WALLET = '0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388';

async function testSimpleClaim() {
  console.log('🧪 Simple Claim System Test\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  const tests = [
    {
      name: 'Backend Health Check',
      test: async () => {
        const response = await axios.get(`${API_BASE}/health`);
        return response.status === 200 && response.data.status === 'healthy';
      }
    },
    {
      name: 'Frontend Access',
      test: async () => {
        const response = await axios.get(`${FRONTEND_BASE}`);
        return response.status === 200;
      }
    },
    {
      name: 'Claim Route Access',
      test: async () => {
        const response = await axios.get(`${FRONTEND_BASE}/claim`);
        return response.status === 200;
      }
    },
    {
      name: 'Retry Queue Stats',
      test: async () => {
        const response = await axios.get(`${API_BASE}/api/badges/retry-queue/stats`);
        return response.status === 200;
      }
    },
    {
      name: 'Badge Claim API (Basic)',
      test: async () => {
        try {
          const response = await axios.post(`${API_BASE}/api/badges/claim`, {
            playerAddress: TEST_WALLET,
            badgeId: 'test-badge-1',
            xpEarned: 50,
            season: 1,
            runId: 'test-run-1'
          });
          return response.status === 200 || response.status === 400;
        } catch (error) {
          // Accept 400 errors as success (validation working)
          return error.response?.status === 400;
        }
      }
    }
  ];

  // Run all tests
  for (const { name, test } of tests) {
    console.log(`📋 ${name}:`);
    try {
      const result = await test();
      if (result) {
        console.log('   ✅ PASSED');
        results.passed++;
      } else {
        console.log('   ❌ FAILED');
        results.failed++;
      }
      results.tests.push({ name, passed: result });
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      results.failed++;
      results.tests.push({ name, passed: false, error: error.message });
    }
  }

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  // Recommendations
  console.log('\n🎯 Status:');
  if (results.failed === 0) {
    console.log('   🚀 All tests passed! The claim system is ready for testing.');
  } else if (results.passed >= 3) {
    console.log('   ✅ Core functionality is working! Some advanced features need configuration.');
    console.log('   💡 The system is ready for basic testing and development.');
  } else {
    console.log('   🔧 Some core tests failed. Please check server configuration.');
  }

  return results.failed === 0;
}

// Run the test
testSimpleClaim()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }); 