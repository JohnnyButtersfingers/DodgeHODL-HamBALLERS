#!/usr/bin/env node

/**
 * Test Badge Minting Script
 * 
 * This script tests the badge minting functionality by:
 * 1. Emitting RunCompleted events to increase XP
 * 2. Checking badge eligibility
 * 3. Simulating badge minting
 */

const { ethers } = require('ethers');
const { db } = require('../config/database');
const { config, validation } = require('../config/environment');
const { emitMockRunCompleted } = require('./emit-run-completed');

// Test wallet addresses
const TEST_WALLETS = [
  '0x1234567890123456789012345678901234567890',
  '0x742d35Cc6634C0532925a3b8D4C5bc57F4e8F9e2',
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
];

// Badge definitions
const BADGE_DEFINITIONS = {
  1: { name: 'Novice HODLer', xpRequired: 100 },
  2: { name: 'Experienced Trader', xpRequired: 500 },
  3: { name: 'Master Strategist', xpRequired: 1000 },
  4: { name: 'Legendary HODLer', xpRequired: 2500 },
  5: { name: 'Supreme Champion', xpRequired: 5000 }
};

async function getPlayerXP(walletAddress) {
  try {
    const stats = await db.getPlayerStats(walletAddress);
    return stats?.current_xp || 0;
  } catch (error) {
    console.error(`Error getting XP for ${walletAddress}:`, error.message);
    return 0;
  }
}

async function checkBadgeEligibility(walletAddress, xpAmount) {
  const eligibleBadges = [];
  
  for (const [badgeId, badge] of Object.entries(BADGE_DEFINITIONS)) {
    if (xpAmount >= badge.xpRequired) {
      eligibleBadges.push({
        badgeId: parseInt(badgeId),
        name: badge.name,
        xpRequired: badge.xpRequired,
        xpOver: xpAmount - badge.xpRequired
      });
    }
  }
  
  return eligibleBadges;
}

async function simulateRunCompleted(walletAddress, xpEarned, dbpEarned) {
  console.log(`\n🏃 Simulating RunCompleted for ${walletAddress}`);
  console.log(`   XP Earned: ${xpEarned}`);
  console.log(`   DBP Earned: ${dbpEarned}`);
  
  try {
    await emitMockRunCompleted({
      user: walletAddress,
      xpEarned: xpEarned.toString(),
      dbpEarned: dbpEarned.toString(),
      runId: `test-${Date.now()}`
    });
    
    // Wait a moment for the event to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newXP = await getPlayerXP(walletAddress);
    console.log(`   ✅ New XP Total: ${newXP}`);
    
    return newXP;
  } catch (error) {
    console.error(`   ❌ Error simulating run:`, error.message);
    return 0;
  }
}

async function testBadgeMinting() {
  console.log('🏆 Testing Badge Minting Functionality');
  console.log('=====================================');
  
  // Test 1: Initial XP check
  console.log('\n📊 Initial XP Check:');
  for (const wallet of TEST_WALLETS) {
    const xp = await getPlayerXP(wallet);
    console.log(`   ${wallet}: ${xp} XP`);
  }
  
  // Test 2: Simulate XP progression for first wallet
  const testWallet = TEST_WALLETS[0];
  console.log(`\n🎯 Testing XP progression for ${testWallet}`);
  
  const xpProgression = [
    { xp: 50, dbp: 8, description: 'First run' },
    { xp: 100, dbp: 15, description: 'Second run' },
    { xp: 200, dbp: 30, description: 'Third run' },
    { xp: 300, dbp: 45, description: 'Fourth run' },
    { xp: 500, dbp: 75, description: 'Fifth run' }
  ];
  
  let currentXP = await getPlayerXP(testWallet);
  
  for (const run of xpProgression) {
    console.log(`\n🎮 ${run.description}:`);
    currentXP = await simulateRunCompleted(testWallet, run.xp, run.dbp);
    
    // Check badge eligibility after each run
    const eligibleBadges = await checkBadgeEligibility(testWallet, currentXP);
    
    if (eligibleBadges.length > 0) {
      console.log(`   🏆 Eligible Badges:`);
      eligibleBadges.forEach(badge => {
        console.log(`      - ${badge.name} (${badge.xpRequired} XP) - ${badge.xpOver} XP over`);
      });
    } else {
      console.log(`   ⏳ No badges eligible yet`);
    }
    
    // Wait between runs
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Test 3: Check final badge eligibility
  console.log('\n🏆 Final Badge Eligibility Check:');
  const finalXP = await getPlayerXP(testWallet);
  const finalEligibleBadges = await checkBadgeEligibility(testWallet, finalXP);
  
  console.log(`   Total XP: ${finalXP}`);
  console.log(`   Eligible Badges: ${finalEligibleBadges.length}`);
  
  finalEligibleBadges.forEach(badge => {
    console.log(`   ✅ ${badge.name} - Ready to mint!`);
  });
  
  // Test 4: Simulate badge minting (if contract is available)
  if (config.contracts.xpBadge && finalEligibleBadges.length > 0) {
    console.log('\n🎖️ Simulating Badge Minting:');
    
    try {
      const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
      const xpBadgeContract = new ethers.Contract(
        config.contracts.xpBadge,
        [
          'function mintBadge(uint256 badgeId, uint256 xpRequired) external returns (uint256)',
          'function getBadgeInfo(uint256 badgeId) view returns (string memory name, string memory description, uint256 xpRequired, bool isActive)',
          'function hasPlayerBadge(address player, uint256 badgeId) view returns (bool)'
        ],
        provider
      );
      
      for (const badge of finalEligibleBadges) {
        console.log(`   🎖️ Attempting to mint ${badge.name}...`);
        
        // Check if already owned
        const hasBadge = await xpBadgeContract.hasPlayerBadge(testWallet, badge.badgeId);
        
        if (hasBadge) {
          console.log(`      ✅ Already owns ${badge.name}`);
        } else {
          console.log(`      📝 Ready to mint ${badge.name} (${badge.xpRequired} XP required)`);
          console.log(`      💡 Use frontend to mint with wallet signature`);
        }
      }
    } catch (error) {
      console.log(`   ⚠️ Contract interaction failed: ${error.message}`);
      console.log(`   💡 This is expected if contract is not deployed or configured`);
    }
  } else {
    console.log('\n💡 Badge minting simulation skipped (contract not configured)');
  }
  
  // Test 5: Summary
  console.log('\n📋 Test Summary:');
  console.log('================');
  console.log(`✅ XP progression tested`);
  console.log(`✅ Badge eligibility calculated`);
  console.log(`✅ ${finalEligibleBadges.length} badges ready for minting`);
  console.log(`\n🎯 Next Steps:`);
  console.log(`   1. Deploy XPBadge contract`);
  console.log(`   2. Add XP_BADGE_ADDRESS to .env`);
  console.log(`   3. Test actual badge minting via frontend`);
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🏆 Badge Minting Test Script');
    console.log('============================\n');
    console.log('Usage:');
    console.log('  node test-badge-minting.js <command>\n');
    console.log('Commands:');
    console.log('  test          - Run full badge minting test');
    console.log('  xp <wallet>   - Check XP for specific wallet');
    console.log('  badges <wallet> - Check badge eligibility for wallet');
    console.log('  simulate <wallet> <xp> <dbp> - Simulate single run');
    console.log('');
    console.log('Examples:');
    console.log('  node test-badge-minting.js test');
    console.log('  node test-badge-minting.js xp 0x1234...');
    console.log('  node test-badge-minting.js simulate 0x1234... 200 30');
    return;
  }
  
  const command = args[0];
  
  try {
    switch (command) {
      case 'test':
        await testBadgeMinting();
        break;
      case 'xp':
        if (args.length < 2) {
          console.error('❌ XP command requires wallet address');
          return;
        }
        const xp = await getPlayerXP(args[1]);
        console.log(`📊 ${args[1]}: ${xp} XP`);
        break;
      case 'badges':
        if (args.length < 2) {
          console.error('❌ Badges command requires wallet address');
          return;
        }
        const walletXP = await getPlayerXP(args[1]);
        const eligibleBadges = await checkBadgeEligibility(args[1], walletXP);
        console.log(`🏆 Badge eligibility for ${args[1]} (${walletXP} XP):`);
        eligibleBadges.forEach(badge => {
          console.log(`   - ${badge.name} (${badge.xpRequired} XP)`);
        });
        break;
      case 'simulate':
        if (args.length < 4) {
          console.error('❌ Simulate command requires wallet, xp, and dbp');
          return;
        }
        await simulateRunCompleted(args[1], parseInt(args[2]), parseInt(args[3]));
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
  getPlayerXP,
  checkBadgeEligibility,
  simulateRunCompleted,
  testBadgeMinting
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
} 