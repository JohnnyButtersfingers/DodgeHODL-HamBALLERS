#!/usr/bin/env node

/**
 * Mock RunCompleted Event Emitter
 * 
 * This script simulates a RunCompleted event from the HODLManager contract
 * for testing XP persistence and WebSocket broadcasting.
 */

const { ethers } = require('ethers');
const { db } = require('../config/database');
const { config, validation } = require('../config/environment');

// Mock event data
const MOCK_EVENTS = [
  {
    user: '0x1234567890123456789012345678901234567890',
    xpEarned: '150',
    dbpEarned: '25',
    runId: '1'
  },
  {
    user: '0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2',
    xpEarned: '200',
    dbpEarned: '30',
    runId: '2'
  },
  {
    user: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    xpEarned: '175',
    dbpEarned: '28',
    runId: '3'
  }
];

async function emitMockRunCompleted(eventData) {
  console.log('\n🏆 ===== Emitting Mock RunCompleted Event =====');
  console.log(`👤 Player: ${eventData.user}`);
  console.log(`⭐ XP Earned: ${eventData.xpEarned}`);
  console.log(`💰 DBP Earned: ${eventData.dbpEarned}`);
  console.log(`🎮 Run ID: ${eventData.runId}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log('==========================================\n');
  
  try {
    // Use the same updateXP function as the real listener
    const result = await db.updateXP(
      eventData.user, 
      eventData.xpEarned, 
      eventData.dbpEarned, 
      eventData.runId
    );
    
    console.log('✅ XP Update Result:', {
      success: result.success,
      playerAddress: result.playerAddress,
      xpEarned: result.xpEarned,
      dbpEarned: result.dbpEarned,
      previousXp: result.previousXp,
      newXp: result.newXp,
      previousLevel: result.previousLevel,
      newLevel: result.newLevel,
      runId: result.runId
    });
    
    // Broadcast to WebSocket clients if available
    if (global.wsClients) {
      const message = JSON.stringify({
        type: 'xp_reward',
        channel: 'xp',
        data: {
          playerAddress: eventData.user,
          xpEarned: eventData.xpEarned,
          dbpEarned: eventData.dbpEarned,
          runId: eventData.runId,
          updateResult: result,
          timestamp: new Date().toISOString()
        }
      });

      let sentCount = 0;
      global.wsClients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
          sentCount++;
        }
      });

      console.log(`📡 XP reward broadcasted to ${sentCount} WebSocket clients`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error processing mock RunCompleted event:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      playerAddress: eventData.user,
      xpEarned: eventData.xpEarned,
      dbpEarned: eventData.dbpEarned,
      runId: eventData.runId
    });
    throw error;
  }
}

async function emitAllMockEvents() {
  console.log('🚀 Starting mock RunCompleted event emission...');
  
  for (let i = 0; i < MOCK_EVENTS.length; i++) {
    const eventData = MOCK_EVENTS[i];
    
    try {
      await emitMockRunCompleted(eventData);
      
      // Wait 2 seconds between events
      if (i < MOCK_EVENTS.length - 1) {
        console.log('⏳ Waiting 2 seconds before next event...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`❌ Failed to emit event ${i + 1}:`, error.message);
    }
  }
  
  console.log('\n✅ All mock RunCompleted events emitted!');
  console.log('📊 Check the XP verification endpoint:');
  console.log('   curl http://localhost:3001/api/xp/0x1234567890123456789012345678901234567890');
}

async function emitSingleEvent(userAddress, xpEarned = '100', dbpEarned = '15', runId = Date.now().toString()) {
  const eventData = {
    user: userAddress,
    xpEarned,
    dbpEarned,
    runId
  };
  
  return await emitMockRunCompleted(eventData);
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Emit all mock events
    await emitAllMockEvents();
  } else if (args[0] === 'single' && args[1]) {
    // Emit single event: node emit-run-completed.js single <address> [xp] [dbp] [runId]
    const userAddress = args[1];
    const xpEarned = args[2] || '100';
    const dbpEarned = args[3] || '15';
    const runId = args[4] || Date.now().toString();
    
    await emitSingleEvent(userAddress, xpEarned, dbpEarned, runId);
  } else {
    console.log('Usage:');
    console.log('  node emit-run-completed.js                    # Emit all mock events');
    console.log('  node emit-run-completed.js single <address>   # Emit single event');
    console.log('  node emit-run-completed.js single <address> <xp> <dbp> <runId>');
    console.log('');
    console.log('Examples:');
    console.log('  node emit-run-completed.js');
    console.log('  node emit-run-completed.js single 0x1234567890123456789012345678901234567890');
    console.log('  node emit-run-completed.js single 0x1234567890123456789012345678901234567890 200 30 12345');
  }
}

// Export for use in other modules
module.exports = {
  emitMockRunCompleted,
  emitAllMockEvents,
  emitSingleEvent
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
} 