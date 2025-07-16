#!/usr/bin/env node
/**
 * Supabase Badge Integration Verification Script
 * Tests database connectivity, schema validation, and badge data operations
 */

require('dotenv').config();
const { db } = require('./config/database');

const TEST_WALLET = '0x742d35Cc6634C0532925a3b8D5c3Ba4F8b0A87F6';
const TEST_RUN_ID = 'test-run-' + Date.now();

async function verifySupabaseConnection() {
  console.log('🔌 Testing Supabase connection...');
  
  if (!db) {
    throw new Error('Supabase client not initialized');
  }

  try {
    // Test basic connection with a simple query
    const { data, error } = await db
      .from('run_logs')
      .select('count')
      .limit(1);

    if (error) {
      throw error;
    }

    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
}

async function verifyBadgeSchema() {
  console.log('\n📋 Verifying badge schema...');

  try {
    // Check if XPBadge columns exist in run_logs table
    const { data, error } = await db
      .from('run_logs')
      .select('xp_badge_token_id, xp_badge_tx_hash, xp_badge_minted_at')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.error('❌ XPBadge columns missing from run_logs table');
        console.log('   Run the migration: backend/migrations/add_xpbadge_columns.sql');
        return false;
      }
      throw error;
    }

    console.log('✅ XPBadge columns exist in run_logs table');

    // Check if xp_badge_summary view exists
    try {
      const { data: viewData, error: viewError } = await db
        .from('xp_badge_summary')
        .select('*')
        .limit(1);

      if (viewError) {
        console.warn('⚠️ xp_badge_summary view not found - creating analytics view recommended');
      } else {
        console.log('✅ xp_badge_summary view exists');
      }
    } catch (error) {
      console.warn('⚠️ Could not verify xp_badge_summary view');
    }

    return true;
  } catch (error) {
    console.error('❌ Schema verification failed:', error.message);
    return false;
  }
}

async function testBadgeRecordWrite() {
  console.log('\n✏️ Testing badge record write operations...');

  try {
    // Create a test run log entry
    const testRunData = {
      id: TEST_RUN_ID,
      player_address: TEST_WALLET.toLowerCase(),
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      cp_earned: 250,
      dbp_minted: 25.0,
      status: 'completed',
      duration: 120,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await db
      .from('run_logs')
      .insert(testRunData)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    console.log('✅ Test run log entry created:', insertData.id);

    // Test badge information update
    const badgeData = {
      xp_badge_token_id: 2, // Rare badge
      xp_badge_tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      xp_badge_minted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: updateData, error: updateError } = await db
      .from('run_logs')
      .update(badgeData)
      .eq('id', TEST_RUN_ID)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Badge data updated successfully:');
    console.log(`   Token ID: ${updateData.xp_badge_token_id}`);
    console.log(`   TX Hash: ${updateData.xp_badge_tx_hash}`);
    console.log(`   Minted At: ${updateData.xp_badge_minted_at}`);

    return updateData;
  } catch (error) {
    console.error('❌ Badge record write test failed:', error.message);
    throw error;
  }
}

async function testBadgeRecordRead() {
  console.log('\n📖 Testing badge record read operations...');

  try {
    // Test reading badge data for specific wallet
    const { data: badgeData, error: readError } = await db
      .from('run_logs')
      .select(`
        id,
        player_address,
        cp_earned,
        dbp_minted,
        duration,
        xp_badge_token_id,
        xp_badge_tx_hash,
        xp_badge_minted_at,
        created_at
      `)
      .eq('player_address', TEST_WALLET.toLowerCase())
      .eq('status', 'completed')
      .not('xp_badge_token_id', 'is', null)
      .order('xp_badge_minted_at', { ascending: false });

    if (readError) {
      throw readError;
    }

    console.log(`✅ Found ${badgeData.length} badge records for test wallet`);

    if (badgeData.length > 0) {
      const latestBadge = badgeData[0];
      console.log('   Latest badge:');
      console.log(`     Token ID: ${latestBadge.xp_badge_token_id}`);
      console.log(`     TX Hash: ${latestBadge.xp_badge_tx_hash}`);
      console.log(`     CP Earned: ${latestBadge.cp_earned}`);
      console.log(`     Duration: ${latestBadge.duration}s`);
    }

    return badgeData;
  } catch (error) {
    console.error('❌ Badge record read test failed:', error.message);
    throw error;
  }
}

async function testBadgeSummaryView() {
  console.log('\n📊 Testing badge summary analytics...');

  try {
    // Test the analytics view
    const { data: summaryData, error: summaryError } = await db
      .from('xp_badge_summary')
      .select('*')
      .eq('player_address', TEST_WALLET.toLowerCase())
      .single();

    if (summaryError && summaryError.code !== 'PGRST116') { // Not found is OK
      throw summaryError;
    }

    if (summaryData) {
      console.log('✅ Badge summary data found:');
      console.log(`   Total Badges: ${summaryData.total_badges_earned}`);
      console.log(`   Participation: ${summaryData.participation_badges}`);
      console.log(`   Common: ${summaryData.common_badges}`);
      console.log(`   Rare: ${summaryData.rare_badges}`);
      console.log(`   Epic: ${summaryData.epic_badges}`);
      console.log(`   Legendary: ${summaryData.legendary_badges}`);
      console.log(`   First Badge: ${summaryData.first_badge_earned}`);
      console.log(`   Latest Badge: ${summaryData.latest_badge_earned}`);
    } else {
      console.log('ℹ️ No badge summary data found (expected for new wallet)');
    }

    return summaryData;
  } catch (error) {
    console.error('❌ Badge summary test failed:', error.message);
    throw error;
  }
}

async function testPerformanceQueries() {
  console.log('\n⚡ Testing performance-critical queries...');

  try {
    const startTime = Date.now();

    // Test query that would be used by API endpoint
    const { data: walletBadges, error } = await db
      .from('run_logs')
      .select(`
        id,
        start_time,
        end_time,
        cp_earned,
        dbp_minted,
        duration,
        xp_badge_token_id,
        xp_badge_tx_hash,
        xp_badge_minted_at
      `)
      .eq('player_address', TEST_WALLET.toLowerCase())
      .eq('status', 'completed')
      .not('xp_badge_token_id', 'is', null)
      .order('xp_badge_minted_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    const queryTime = Date.now() - startTime;
    console.log(`✅ Badge query completed in ${queryTime}ms`);
    console.log(`   Returned ${walletBadges.length} records`);

    if (queryTime > 1000) {
      console.warn('⚠️ Query took longer than 1 second - consider adding indexes');
    }

    return walletBadges;
  } catch (error) {
    console.error('❌ Performance query test failed:', error.message);
    throw error;
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');

  try {
    const { error } = await db
      .from('run_logs')
      .delete()
      .eq('id', TEST_RUN_ID);

    if (error) {
      console.warn('⚠️ Could not delete test record:', error.message);
    } else {
      console.log('✅ Test data cleaned up');
    }
  } catch (error) {
    console.warn('⚠️ Cleanup failed:', error.message);
  }
}

async function generateReport(results) {
  console.log('\n📊 VERIFICATION REPORT');
  console.log('='.repeat(50));
  
  const {
    connection,
    schema,
    writeTest,
    readTest,
    summaryTest,
    performanceTest
  } = results;

  console.log(`Database Connection: ${connection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Schema Validation: ${schema ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Write Operations: ${writeTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Read Operations: ${readTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Analytics View: ${summaryTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Performance: ${performanceTest ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(result => result);
  
  console.log('\n' + '='.repeat(50));
  console.log(`OVERALL STATUS: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 Supabase badge integration is ready for production!');
    console.log('\nNext steps:');
    console.log('1. Deploy XPBadge contract');
    console.log('2. Configure environment variables');
    console.log('3. Test badge minting with test-xpbadge.js');
  } else {
    console.log('\n🔧 Issues found - please address before deployment');
  }

  return allPassed;
}

async function main() {
  console.log('🎫 HamBaller.xyz Supabase Badge Verification\n');

  const results = {
    connection: false,
    schema: false,
    writeTest: false,
    readTest: false,
    summaryTest: false,
    performanceTest: false
  };

  try {
    // Run verification tests
    results.connection = await verifySupabaseConnection();
    
    if (results.connection) {
      results.schema = await verifyBadgeSchema();
      
      if (results.schema) {
        await testBadgeRecordWrite();
        results.writeTest = true;
        
        await testBadgeRecordRead();
        results.readTest = true;
        
        await testBadgeSummaryView();
        results.summaryTest = true;
        
        await testPerformanceQueries();
        results.performanceTest = true;
      }
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
  } finally {
    await cleanupTestData();
  }

  return generateReport(results);
}

// Handle command line execution
if (require.main === module) {
  main()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  verifySupabaseConnection,
  verifyBadgeSchema,
  testBadgeRecordWrite,
  testBadgeRecordRead,
  testBadgeSummaryView,
  testPerformanceQueries
};