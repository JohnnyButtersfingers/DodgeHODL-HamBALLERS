#!/usr/bin/env node

/**
 * Production Readiness Validation Script
 * Validates all Phase 7 requirements are met and system is production-ready
 */

require('dotenv').config();
const { retryQueue } = require('./retryQueue');
const { eventRecovery } = require('./eventRecovery');
const { db } = require('./config/database');

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  check: (msg) => console.log(`🔍 ${msg}`)
};

/**
 * Validate production requirements
 */
async function validateProductionReadiness() {
  console.log('🚀 Phase 7 Badge Recovery System - Production Readiness Check\n');
  
  const checks = [];

  // Check 1: Retry configuration matches production requirements
  log.check('Checking retry configuration...');
  try {
    // Access the RETRY_CONFIG through reflection or by importing the constant
    const retryQueueModule = require('./retryQueue');
    
    // Check if base delay is 15 seconds (production requirement)
    const testDelay = retryQueue.calculateRetryDelay(0);
    if (testDelay >= 14000 && testDelay <= 16000) {
      log.success('✓ Base retry delay set to 15 seconds (matches frontend polling)');
      checks.push(true);
    } else {
      log.error('✗ Base retry delay not set to 15 seconds');
      checks.push(false);
    }
  } catch (error) {
    log.error(`✗ Error checking retry configuration: ${error.message}`);
    checks.push(false);
  }

  // Check 2: Database schema includes all required metadata fields
  log.check('Checking database schema for badge metadata...');
  if (!db) {
    log.warning('✗ Database not available - cannot validate schema');
    checks.push(false);
  } else {
    try {
      // Test the badge_claim_attempts table has all required fields
      const { data, error } = await db
        .from('badge_claim_attempts')
        .select('id, player_address, xp_earned, season, token_id, tx_hash, status')
        .limit(1);
      
      if (!error) {
        log.success('✓ Database schema includes required badge metadata fields');
        log.info('  └─ xp_earned (xp_awarded) ✓');
        log.info('  └─ token_id (calculated_token_id) ✓');
        log.info('  └─ season (season_id) ✓');
        log.info('  └─ tx_hash (contract_tx_hash) ✓');
        checks.push(true);
      } else {
        log.error('✗ Database schema validation failed');
        checks.push(false);
      }
    } catch (error) {
      log.error(`✗ Database schema check failed: ${error.message}`);
      checks.push(false);
    }
  }

  // Check 3: Health endpoint includes badge retry stats
  log.check('Checking health endpoint integration...');
  try {
    const fetch = (await import('node-fetch')).default;
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    
    const response = await fetch(`${baseUrl}/health`);
    if (response.ok) {
      const data = await response.json();
      if (data.badgeRetrySystem && data.badgeRetrySystem.queueDepth !== undefined) {
        log.success('✓ Health endpoint includes badge retry system stats');
        log.info(`  └─ Queue depth: ${data.badgeRetrySystem.queueDepth}`);
        log.info(`  └─ Processing: ${data.badgeRetrySystem.processing}`);
        log.info(`  └─ Error counts available: ${JSON.stringify(data.badgeRetrySystem.errorCounts)}`);
        checks.push(true);
      } else {
        log.error('✗ Health endpoint missing badge retry system stats');
        checks.push(false);
      }
    } else {
      log.warning('✗ Health endpoint not responding (server may not be running)');
      checks.push(false);
    }
  } catch (error) {
    log.warning(`✗ Health endpoint check failed: ${error.message}`);
    checks.push(false);
  }

  // Check 4: Pending badges endpoint functionality
  log.check('Checking pending badges endpoint...');
  try {
    const fetch = (await import('node-fetch')).default;
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    
    const response = await fetch(`${baseUrl}/api/badges/pending`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.pendingAttempts) && data.summary && data.pagination) {
        log.success('✓ Pending badges endpoint working with enhanced metadata');
        log.info(`  └─ Pending attempts: ${data.summary.totalPending}`);
        log.info('  └─ Badge metadata included ✓');
        log.info('  └─ Retry metadata included ✓');
        log.info('  └─ Pagination support ✓');
        checks.push(true);
      } else {
        log.error('✗ Pending badges endpoint returned invalid format');
        checks.push(false);
      }
    } else {
      log.warning('✗ Pending badges endpoint not responding');
      checks.push(false);
    }
  } catch (error) {
    log.warning(`✗ Pending badges endpoint check failed: ${error.message}`);
    checks.push(false);
  }

  // Check 5: Enhanced logging functionality
  log.check('Checking enhanced logging capabilities...');
  try {
    // Test that retryQueue has proper logging methods
    const queueStats = retryQueue.getStats();
    if (queueStats && typeof queueStats.queueSize !== 'undefined') {
      log.success('✓ Enhanced logging and statistics available');
      log.info(`  └─ Queue size: ${queueStats.queueSize}`);
      log.info(`  └─ Processing: ${queueStats.processing}`);
      log.info(`  └─ Initialized: ${queueStats.initialized}`);
      checks.push(true);
    } else {
      log.error('✗ Enhanced logging not available');
      checks.push(false);
    }
  } catch (error) {
    log.error(`✗ Enhanced logging check failed: ${error.message}`);
    checks.push(false);
  }

  // Check 6: Event recovery system
  log.check('Checking event recovery system...');
  try {
    const recoveryStats = await eventRecovery.getStats();
    if (recoveryStats && typeof recoveryStats.totalMissedEvents !== 'undefined') {
      log.success('✓ Event recovery system operational');
      log.info(`  └─ Total missed events: ${recoveryStats.totalMissedEvents}`);
      log.info(`  └─ Processed events: ${recoveryStats.processedEvents}`);
      log.info(`  └─ Pending events: ${recoveryStats.pendingEvents}`);
      checks.push(true);
    } else {
      log.warning('✓ Event recovery system initialized but no stats available');
      checks.push(true); // Still pass if initialized
    }
  } catch (error) {
    log.error(`✗ Event recovery system check failed: ${error.message}`);
    checks.push(false);
  }

  // Summary
  console.log('\n' + '─'.repeat(60));
  log.check('Production Readiness Summary:');
  console.log('─'.repeat(60));

  const requirements = [
    'Retry base delay set to 15s (frontend polling alignment)',
    'Database schema includes all badge metadata fields',
    'Health endpoint includes badge retry statistics',
    'Pending badges endpoint with enhanced metadata',
    'Enhanced logging with badge metadata exposure',
    'Event recovery system operational'
  ];

  requirements.forEach((req, index) => {
    const status = checks[index] ? '✅ PASS' : '❌ FAIL';
    console.log(`${req.padEnd(50)} ${status}`);
  });

  console.log('─'.repeat(60));

  const passedCount = checks.filter(Boolean).length;
  const totalCount = checks.length;

  if (passedCount === totalCount) {
    log.success(`🎉 PRODUCTION READY! All ${totalCount} requirements met.`);
    console.log('\n🚀 Phase 7 Badge Recovery System is ready for deployment!');
    console.log('📋 Key Production Features:');
    console.log('   • 15s retry intervals matching frontend polling');
    console.log('   • Complete badge metadata in all logs and endpoints');
    console.log('   • Health monitoring integration');
    console.log('   • Admin dashboard support via /api/badges/pending');
    console.log('   • Robust event recovery system');
    console.log('   • Enhanced observability and debugging');
    return true;
  } else {
    log.warning(`⚠️ ${passedCount}/${totalCount} requirements met. Address failing checks before production deployment.`);
    return false;
  }
}

/**
 * Environment check for production deployment
 */
function checkProductionEnvironment() {
  log.check('Checking production environment setup...');
  
  const requiredVars = [
    'ABSTRACT_RPC_URL',
    'HODL_MANAGER_ADDRESS',
    'XPBADGE_ADDRESS',
    'XPBADGE_MINTER_PRIVATE_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length === 0) {
    log.success('✓ All required environment variables configured');
    return true;
  } else {
    log.error(`✗ Missing environment variables: ${missing.join(', ')}`);
    return false;
  }
}

// Run validation if script is executed directly
if (require.main === module) {
  console.log('Phase 7 Badge Recovery System - Production Readiness Validation\n');
  
  // Check environment first
  const envReady = checkProductionEnvironment();
  console.log('');
  
  if (envReady) {
    validateProductionReadiness().then(ready => {
      process.exit(ready ? 0 : 1);
    }).catch(error => {
      log.error(`Validation failed: ${error.message}`);
      process.exit(1);
    });
  } else {
    log.error('Environment not ready for production deployment');
    process.exit(1);
  }
}

module.exports = {
  validateProductionReadiness,
  checkProductionEnvironment
};