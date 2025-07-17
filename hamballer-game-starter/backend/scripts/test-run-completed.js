#!/usr/bin/env node

/**
 * Test RunCompleted Event Emitter
 * 
 * This script provides comprehensive testing of RunCompleted events
 * for development and staging environments.
 */

const { emitMockRunCompleted, emitAllMockEvents, emitSingleEvent } = require('./emit-run-completed');
const { db } = require('../config/database');
const { config, validation } = require('../config/environment');

// Test scenarios
const TEST_SCENARIOS = {
  // Basic XP progression
  basic: [
    { user: '0x1234567890123456789012345678901234567890', xpEarned: '100', dbpEarned: '15', runId: 'test-1' },
    { user: '0x1234567890123456789012345678901234567890', xpEarned: '150', dbpEarned: '25', runId: 'test-2' },
    { user: '0x1234567890123456789012345678901234567890', xpEarned: '200', dbpEarned: '30', runId: 'test-3' }
  ],
  
  // Multiple players
  multiplayer: [
    { user: '0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2', xpEarned: '300', dbpEarned: '45', runId: 'multi-1' },
    { user: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', xpEarned: '250', dbpEarned: '35', runId: 'multi-2' },
    { user: '0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2', xpEarned: '400', dbpEarned: '60', runId: 'multi-3' }
  ],
  
  // High XP runs (level progression)
  highXp: [
    { user: '0x1234567890123456789012345678901234567890', xpEarned: '500', dbpEarned: '75', runId: 'high-1' },
    { user: '0x1234567890123456789012345678901234567890', xpEarned: '750', dbpEarned: '100', runId: 'high-2' },
    { user: '0x1234567890123456789012345678901234567890', xpEarned: '1000', dbpEarned: '150', runId: 'high-3' }
  ],
  
  // Rapid succession (stress test)
  rapid: [
    { user: '0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2', xpEarned: '50', dbpEarned: '8', runId: 'rapid-1' },
    { user: '0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2', xpEarned: '75', dbpEarned: '12', runId: 'rapid-2' },
    { user: '0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2', xpEarned: '100', dbpEarned: '15', runId: 'rapid-3' },
    { user: '0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2', xpEarned: '125', dbpEarned: '18', runId: 'rapid-4' },
    { user: '0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2', xpEarned: '150', dbpEarned: '22', runId: 'rapid-5' }
  ]
};

async function runTestScenario(scenarioName, delayMs = 2000) {
  console.log(`\n🧪 Running ${scenarioName} test scenario...`);
  console.log('=' .repeat(50));
  
  const events = TEST_SCENARIOS[scenarioName];
  if (!events) {
    console.error(`❌ Unknown scenario: ${scenarioName}`);
    return;
  }
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`\n📊 Event ${i + 1}/${events.length}`);
    
    try {
      await emitMockRunCompleted(event);
      
      // Verify XP update
      const stats = await db.getPlayerStats(event.user);
      console.log(`✅ XP verification: ${event.user} now has ${stats?.current_xp || 0} XP`);
      
      if (i < events.length - 1) {
        console.log(`⏳ Waiting ${delayMs}ms before next event...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
    } catch (error) {
      console.error(`❌ Failed to emit event ${i + 1}:`, error.message);
    }
  }
  
  console.log(`\n✅ ${scenarioName} test scenario completed!`);
}

async function runAllScenarios() {
  console.log('🚀 Running all test scenarios...');
  
  const scenarios = Object.keys(TEST_SCENARIOS);
  for (const scenario of scenarios) {
    await runTestScenario(scenario, 1000);
  }
  
  console.log('\n🎉 All test scenarios completed!');
}

async function verifyXpPersistence() {
  console.log('\n🔍 Verifying XP persistence...');
  
  const testWallets = [
    '0x1234567890123456789012345678901234567890',
    '0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2',
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  ];
  
  for (const wallet of testWallets) {
    try {
      const stats = await db.getPlayerStats(wallet);
      console.log(`📊 ${wallet}: ${stats?.current_xp || 0} XP, Level ${stats?.level || 1}`);
    } catch (error) {
      console.error(`❌ Failed to get stats for ${wallet}:`, error.message);
    }
  }
}

async function stressTest(iterations = 10, delayMs = 500) {
  console.log(`\n💪 Running stress test (${iterations} iterations, ${delayMs}ms delay)...`);
  
  const testWallet = '0x1234567890123456789012345678901234567890';
  
  for (let i = 0; i < iterations; i++) {
    const event = {
      user: testWallet,
      xpEarned: (Math.floor(Math.random() * 100) + 50).toString(),
      dbpEarned: (Math.floor(Math.random() * 20) + 5).toString(),
      runId: `stress-${Date.now()}-${i}`
    };
    
    try {
      await emitMockRunCompleted(event);
      console.log(`✅ Stress test ${i + 1}/${iterations} completed`);
      
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`❌ Stress test ${i + 1} failed:`, error.message);
    }
  }
  
  console.log('\n✅ Stress test completed!');
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🧪 HamBaller.xyz RunCompleted Test Script');
    console.log('=========================================\n');
    console.log('Usage:');
    console.log('  node test-run-completed.js <command> [options]\n');
    console.log('Commands:');
    console.log('  basic          - Run basic XP progression test');
    console.log('  multiplayer    - Run multiplayer test');
    console.log('  highXp         - Run high XP level progression test');
    console.log('  rapid          - Run rapid succession test');
    console.log('  all            - Run all test scenarios');
    console.log('  verify         - Verify XP persistence for test wallets');
    console.log('  stress [iter]  - Run stress test (default: 10 iterations)');
    console.log('  custom <addr> <xp> <dbp> <runId> - Emit custom event');
    console.log('');
    console.log('Examples:');
    console.log('  node test-run-completed.js basic');
    console.log('  node test-run-completed.js stress 20');
    console.log('  node test-run-completed.js custom 0x1234... 200 30 test-123');
    return;
  }
  
  const command = args[0];
  
  try {
    switch (command) {
      case 'basic':
        await runTestScenario('basic');
        break;
      case 'multiplayer':
        await runTestScenario('multiplayer');
        break;
      case 'highXp':
        await runTestScenario('highXp');
        break;
      case 'rapid':
        await runTestScenario('rapid', 500);
        break;
      case 'all':
        await runAllScenarios();
        break;
      case 'verify':
        await verifyXpPersistence();
        break;
      case 'stress':
        const iterations = parseInt(args[1]) || 10;
        await stressTest(iterations);
        break;
      case 'custom':
        if (args.length < 5) {
          console.error('❌ Custom event requires: address, xp, dbp, runId');
          return;
        }
        await emitSingleEvent(args[1], args[2], args[3], args[4]);
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run without arguments to see usage');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Export for use in other modules
module.exports = {
  runTestScenario,
  runAllScenarios,
  verifyXpPersistence,
  stressTest,
  TEST_SCENARIOS
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
} 