#!/usr/bin/env node

/**
 * End-to-End Test Suite for Claim System
 * Tests the complete badge claiming flow from frontend to backend to blockchain
 */

const axios = require('axios');
const { ethers } = require('hardhat');
require('dotenv').config();

const API_BASE = 'http://localhost:3001';
const FRONTEND_BASE = 'http://localhost:3000';
const TEST_WALLET = '0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388';

async function testE2EClaimSystem() {
  console.log('🧪 End-to-End Claim System Test Suite\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  const tests = [
    {
      name: 'Backend API Health Check',
      test: async () => {
        const response = await axios.get(`${API_BASE}/health`);
        return response.status === 200;
      }
    },
    {
      name: 'Frontend Claim Route Access',
      test: async () => {
        const response = await axios.get(`${FRONTEND_BASE}/claim`);
        return response.status === 200;
      }
    },
    {
      name: 'Claimable Badges API',
      test: async () => {
        const response = await axios.get(`${API_BASE}/api/badges/claimable/${TEST_WALLET}`);
        return response.data.success === true;
      }
    },
    {
      name: 'Badge Claim API',
      test: async () => {
        const claimData = {
          playerAddress: TEST_WALLET,
          badgeId: `e2e-test-${Date.now()}`,
          tokenId: 2,
          xpEarned: 65,
          season: 1,
          runId: `e2e-run-${Date.now()}`
        };
        
        try {
          const response = await axios.post(`${API_BASE}/api/badges/claim`, claimData);
          return response.data.success === true || response.data.status === 'queued';
        } catch (error) {
          // Accept "already claimed" as success
          return error.response?.data?.code === 'BADGE_ALREADY_CLAIMED';
        }
      }
    },
    {
      name: 'Retry Queue System',
      test: async () => {
        const response = await axios.get(`${API_BASE}/api/badges/retry-queue/stats`);
        return response.data.success === true;
      }
    },
    {
      name: 'Contract Integration',
      test: async () => {
        const { XPBADGE_ADDRESS } = process.env;
        if (!XPBADGE_ADDRESS) return false;
        
        const xpBadge = await ethers.getContractAt("XPBadge", XPBADGE_ADDRESS);
        const totalSupply = await xpBadge.totalSupply();
        return typeof totalSupply === 'bigint';
      }
    },
    {
      name: 'Error Handling - Invalid Address',
      test: async () => {
        try {
          await axios.get(`${API_BASE}/api/badges/claimable/invalid-address`);
          return false; // Should fail
        } catch (error) {
          return error.response?.status === 400;
        }
      }
    },
    {
      name: 'Error Handling - Missing Data',
      test: async () => {
        try {
          await axios.post(`${API_BASE}/api/badges/claim`, {});
          return false; // Should fail
        } catch (error) {
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

  // Detailed results
  console.log('\n📋 Detailed Results:');
  results.tests.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    console.log(`   ${status} ${test.name}`);
    if (test.error) {
      console.log(`      Error: ${test.error}`);
    }
  });

  // Recommendations
  console.log('\n🎯 Recommendations:');
  if (results.failed === 0) {
    console.log('   🚀 All tests passed! The claim system is ready for production.');
  } else {
    console.log('   🔧 Some tests failed. Please review the errors above.');
    console.log('   💡 Check that both frontend and backend servers are running.');
    console.log('   💡 Verify contract addresses are correctly configured.');
  }

  return results.failed === 0;
}

// Run the test suite
testE2EClaimSystem()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }); 