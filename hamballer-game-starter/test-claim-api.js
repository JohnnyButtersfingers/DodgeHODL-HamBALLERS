#!/usr/bin/env node

/**
 * Test script for Claim API endpoints
 * Tests the badge claiming system with various scenarios
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001';
const TEST_WALLET = '0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388';

async function testClaimAPI() {
  console.log('🧪 Testing Claim API Endpoints...\n');

  const tests = [
    {
      name: 'Test claimable badges endpoint',
      test: async () => {
        const response = await axios.get(`${API_BASE}/api/badges/claimable/${TEST_WALLET}`);
        console.log('✅ Claimable badges endpoint:', response.data.success ? 'Working' : 'Failed');
        console.log(`   - Total claimable: ${response.data.totalClaimable || 0}`);
        console.log(`   - Total pending: ${response.data.totalPending || 0}`);
        console.log(`   - Total failed: ${response.data.totalFailed || 0}`);
        return response.data;
      }
    },
    {
      name: 'Test badge claim endpoint',
      test: async () => {
        const claimData = {
          playerAddress: TEST_WALLET,
          badgeId: 'test-badge-1',
          tokenId: 2,
          xpEarned: 65,
          season: 1,
          runId: 'test-run-1'
        };
        
        try {
          const response = await axios.post(`${API_BASE}/api/badges/claim`, claimData);
          console.log('✅ Badge claim endpoint:', response.data.success ? 'Working' : 'Failed');
          if (response.data.txHash) {
            console.log(`   - TX Hash: ${response.data.txHash}`);
          }
          if (response.data.status === 'queued') {
            console.log('   - Badge queued for retry');
          }
          return response.data;
        } catch (error) {
          if (error.response?.status === 400 && error.response?.data?.code === 'BADGE_ALREADY_CLAIMED') {
            console.log('✅ Badge claim endpoint: Working (already claimed)');
          } else {
            console.log('⚠️  Badge claim endpoint:', error.response?.data?.error || error.message);
          }
        }
      }
    },
    {
      name: 'Test retry queue stats',
      test: async () => {
        try {
          const response = await axios.get(`${API_BASE}/api/badges/retry-queue/stats`);
          console.log('✅ Retry queue stats:', response.data.success ? 'Working' : 'Failed');
          console.log(`   - Queue size: ${response.data.retryQueue?.queueSize || 0}`);
          console.log(`   - Processing: ${response.data.retryQueue?.processing || false}`);
          return response.data;
        } catch (error) {
          console.log('⚠️  Retry queue stats:', error.response?.data?.error || error.message);
        }
      }
    }
  ];

  // Run all tests
  for (const { name, test } of tests) {
    console.log(`\n📋 ${name}:`);
    try {
      await test();
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n✅ Claim API testing complete!');
}

// Run the test
testClaimAPI().catch(console.error); 