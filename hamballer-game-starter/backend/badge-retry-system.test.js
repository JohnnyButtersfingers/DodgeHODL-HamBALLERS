#!/usr/bin/env node

/**
 * Test script for the Badge Retry System
 * This script verifies the core functionality of the retry queue and event recovery systems
 */

require('dotenv').config();
const { retryQueue } = require('./retryQueue');
const { eventRecovery } = require('./eventRecovery');
const { db } = require('./config/database');

// Test configuration
const TEST_CONFIG = {
  testWallet: '0x1234567890123456789012345678901234567890',
  testXP: 50,
  testSeason: 1,
  testRunId: '00000000-0000-0000-0000-000000000000'
};

/**
 * Color-coded logging for better visibility
 */
const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  test: (msg) => console.log(`🧪 ${msg}`)
};

/**
 * Test the retry queue system
 */
async function testRetryQueue() {
  log.test('Testing RetryQueue System...');
  
  try {
    // Test initialization
    log.info('Initializing RetryQueue...');
    const initialized = await retryQueue.initialize();
    
    if (!initialized) {
      log.warning('RetryQueue not fully initialized - limited testing');
      return false;
    }
    
    log.success('RetryQueue initialized successfully');
    
    // Test queue statistics
    log.info('Getting queue statistics...');
    const stats = retryQueue.getStats();
    log.info(`Queue size: ${stats.queueSize}, Processing: ${stats.processing}, Initialized: ${stats.initialized}`);
    
    // Test token ID calculation
    log.info('Testing token ID calculation...');
    const tokenIds = {
      0: retryQueue.calculateTokenId(10),   // Participation
      1: retryQueue.calculateTokenId(30),   // Common
      2: retryQueue.calculateTokenId(60),   // Rare
      3: retryQueue.calculateTokenId(80),   // Epic
      4: retryQueue.calculateTokenId(120)   // Legendary
    };
    
    log.info(`Token ID mapping: ${JSON.stringify(tokenIds)}`);
    
    if (tokenIds[0] === 0 && tokenIds[1] === 1 && tokenIds[2] === 2 && tokenIds[3] === 3 && tokenIds[4] === 4) {
      log.success('Token ID calculation working correctly');
    } else {
      log.error('Token ID calculation failed');
      return false;
    }
    
    // Test retry delay calculation (should start with 15s base delay)
    log.info('Testing retry delay calculation...');
    const delays = [0, 1, 2, 3, 4].map(count => retryQueue.calculateRetryDelay(count));
    log.info(`Retry delays: ${delays.map(d => Math.round(d/1000))}s`);
    
    if (delays.every(d => d >= 1000) && delays[0] >= 14000 && delays[0] <= 16000) {
      log.success('Retry delay calculation working correctly (15s base delay)');
    } else {
      log.error('Retry delay calculation failed - expected ~15s base delay');
      return false;
    }
    
    return true;
    
  } catch (error) {
    log.error(`RetryQueue test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test the event recovery system
 */
async function testEventRecovery() {
  log.test('Testing EventRecovery System...');
  
  try {
    // Test initialization
    log.info('Initializing EventRecovery...');
    const initialized = await eventRecovery.initialize();
    
    if (!initialized) {
      log.warning('EventRecovery not fully initialized - limited testing');
      return false;
    }
    
    log.success('EventRecovery initialized successfully');
    
    // Test statistics
    log.info('Getting recovery statistics...');
    const stats = await eventRecovery.getStats();
    log.info(`Recovery stats: ${JSON.stringify(stats)}`);
    
    log.success('EventRecovery basic functionality working');
    return true;
    
  } catch (error) {
    log.error(`EventRecovery test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test database connectivity and schema
 */
async function testDatabase() {
  log.test('Testing Database Schema...');
  
  if (!db) {
    log.warning('Database not available - skipping database tests');
    return false;
  }
  
  try {
    // Test badge_claim_attempts table
    log.info('Testing badge_claim_attempts table...');
    const { error: attemptsError } = await db
      .from('badge_claim_attempts')
      .select('count')
      .limit(1);
    
    if (attemptsError) {
      log.error(`badge_claim_attempts table error: ${attemptsError.message}`);
      return false;
    }
    
    log.success('badge_claim_attempts table accessible');
    
    // Test badge_claim_status table
    log.info('Testing badge_claim_status table...');
    const { error: statusError } = await db
      .from('badge_claim_status')
      .select('count')
      .limit(1);
    
    if (statusError) {
      log.error(`badge_claim_status table error: ${statusError.message}`);
      return false;
    }
    
    log.success('badge_claim_status table accessible');
    
    // Test missed_run_events table
    log.info('Testing missed_run_events table...');
    const { error: eventsError } = await db
      .from('missed_run_events')
      .select('count')
      .limit(1);
    
    if (eventsError) {
      log.error(`missed_run_events table error: ${eventsError.message}`);
      return false;
    }
    
    log.success('missed_run_events table accessible');
    
    return true;
    
  } catch (error) {
    log.error(`Database test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test API endpoints (requires server to be running)
 */
async function testAPIEndpoints() {
  log.test('Testing API Endpoints...');
  
  try {
    const fetch = (await import('node-fetch')).default;
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    
    // Test health endpoint with badge retry stats
    log.info('Testing health endpoint with badge retry stats...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    
    if (!healthResponse.ok) {
      log.error(`Health endpoint failed: ${healthResponse.status}`);
      return false;
    }
    
    const healthData = await healthResponse.json();
    if (healthData.status === 'healthy' && healthData.badgeRetrySystem) {
      log.success('Health endpoint includes badge retry system stats');
    } else {
      log.error('Health endpoint missing badge retry system stats');
      return false;
    }

    // Test badge claim status endpoint
    log.info('Testing badge claim status endpoint...');
    const claimStatusResponse = await fetch(`${baseUrl}/api/badges/${TEST_CONFIG.testWallet}/claim-status`);
    
    if (!claimStatusResponse.ok) {
      log.error(`Claim status endpoint failed: ${claimStatusResponse.status}`);
      return false;
    }
    
    const claimStatusData = await claimStatusResponse.json();
    if (claimStatusData.success) {
      log.success('Badge claim status endpoint working');
    } else {
      log.error('Badge claim status endpoint returned error');
      return false;
    }

    // Test pending badges endpoint
    log.info('Testing pending badges endpoint...');
    const pendingResponse = await fetch(`${baseUrl}/api/badges/pending`);
    
    if (!pendingResponse.ok) {
      log.error(`Pending badges endpoint failed: ${pendingResponse.status}`);
      return false;
    }
    
    const pendingData = await pendingResponse.json();
    if (pendingData.success && Array.isArray(pendingData.pendingAttempts)) {
      log.success('Pending badges endpoint working');
    } else {
      log.error('Pending badges endpoint returned invalid format');
      return false;
    }
    
    // Test retry queue stats endpoint
    log.info('Testing retry queue stats endpoint...');
    const statsResponse = await fetch(`${baseUrl}/api/badges/retry-queue/stats`);
    
    if (!statsResponse.ok) {
      log.error(`Retry queue stats endpoint failed: ${statsResponse.status}`);
      return false;
    }
    
    const statsData = await statsResponse.json();
    if (statsData.success) {
      log.success('Retry queue stats endpoint working');
    } else {
      log.error('Retry queue stats endpoint returned error');
      return false;
    }
    
    return true;
    
  } catch (error) {
    log.warning(`API endpoint test failed (server may not be running): ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Badge Retry System Test Suite\n');
  
  const results = {
    retryQueue: false,
    eventRecovery: false,
    database: false,
    apiEndpoints: false
  };
  
  // Run individual tests
  results.retryQueue = await testRetryQueue();
  console.log('');
  
  results.eventRecovery = await testEventRecovery();
  console.log('');
  
  results.database = await testDatabase();
  console.log('');
  
  results.apiEndpoints = await testAPIEndpoints();
  console.log('');
  
  // Summary
  log.test('Test Summary:');
  console.log('─'.repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${test.padEnd(20)} ${status}`);
  });
  
  console.log('─'.repeat(50));
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  if (passedCount === totalCount) {
    log.success(`All tests passed! (${passedCount}/${totalCount})`);
    process.exit(0);
  } else {
    log.warning(`Some tests failed. (${passedCount}/${totalCount} passed)`);
    process.exit(1);
  }
}

/**
 * Environment check
 */
function checkEnvironment() {
  log.info('Checking environment configuration...');
  
  const requiredVars = [
    'ABSTRACT_RPC_URL',
    'HODL_MANAGER_ADDRESS',
    'XPBADGE_ADDRESS',
    'XPBADGE_MINTER_PRIVATE_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    log.warning(`Missing environment variables: ${missing.join(', ')}`);
    log.warning('Some tests may fail or be skipped');
  } else {
    log.success('All required environment variables present');
  }
  
  console.log('');
}

// Run tests if this script is executed directly
if (require.main === module) {
  checkEnvironment();
  runTests().catch(error => {
    log.error(`Test suite failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testRetryQueue,
  testEventRecovery,
  testDatabase,
  testAPIEndpoints
};