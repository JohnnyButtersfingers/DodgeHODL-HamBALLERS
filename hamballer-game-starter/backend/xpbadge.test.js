#!/usr/bin/env node
/**
 * XPBadge NFT Minting Test Script
 * Tests the XPBadge functionality independently of the RunCompleted listener
 */

require('dotenv').config();
const { ethers } = require('ethers');

// Import our minting functions
const { mintXPBadge, generateBadgeTokenId } = require('./listeners/runCompletedListener');

const XPBADGE_ABI = [
  'function mintBadge(address player, uint256 tokenId, uint256 xp, uint256 season) external',
  'function getCurrentSeason() view returns (uint256)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function MINTER_ROLE() view returns (bytes32)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'event BadgeMinted(address indexed player, uint256 indexed tokenId, uint256 xp, uint256 season)'
];

async function testXPBadgeSetup() {
  console.log('🧪 Testing XPBadge NFT setup...\n');

  // Check environment variables
  const requiredEnvVars = [
    'ABSTRACT_RPC_URL',
    'XPBADGE_ADDRESS', 
    'XPBADGE_MINTER_PRIVATE_KEY'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  try {
    // Initialize provider and signer
    const provider = new ethers.JsonRpcProvider(process.env.ABSTRACT_RPC_URL);
    const signer = new ethers.Wallet(process.env.XPBADGE_MINTER_PRIVATE_KEY, provider);
    const xpBadgeContract = new ethers.Contract(process.env.XPBADGE_ADDRESS, XPBADGE_ABI, signer);

    console.log('📍 Configuration:');
    console.log(`   RPC URL: ${process.env.ABSTRACT_RPC_URL}`);
    console.log(`   XPBadge Address: ${process.env.XPBADGE_ADDRESS}`);
    console.log(`   Minter Address: ${signer.address}`);
    console.log('');

    // Check network connectivity
    console.log('🌐 Checking network connectivity...');
    const network = await provider.getNetwork();
    console.log(`✅ Connected to chain ID: ${network.chainId}`);
    
    // Check signer balance
    const balance = await provider.getBalance(signer.address);
    console.log(`💰 Signer balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance === 0n) {
      console.warn('⚠️ Signer has no ETH balance - minting will fail');
    }

    // Check minter role
    console.log('🔑 Checking minter permissions...');
    const minterRole = await xpBadgeContract.MINTER_ROLE();
    const hasMinterRole = await xpBadgeContract.hasRole(minterRole, signer.address);
    
    if (hasMinterRole) {
      console.log('✅ Signer has MINTER_ROLE');
    } else {
      console.error('❌ Signer does NOT have MINTER_ROLE');
      console.log(`   Grant role with: grantRole("${minterRole}", "${signer.address}")`);
      return false;
    }

    // Get current season
    const currentSeason = await xpBadgeContract.getCurrentSeason();
    console.log(`📅 Current season: ${currentSeason}`);

    console.log('\n✅ XPBadge setup verification complete!');
    return true;

  } catch (error) {
    console.error('❌ Setup verification failed:', error.message);
    return false;
  }
}

async function testBadgeTiers() {
  console.log('\n🎯 Testing badge tier calculation...');
  
  const testCases = [
    { xp: 5, expectedTokenId: 0, tier: 'Participation' },
    { xp: 30, expectedTokenId: 1, tier: 'Common' },
    { xp: 60, expectedTokenId: 2, tier: 'Rare' },
    { xp: 85, expectedTokenId: 3, tier: 'Epic' },
    { xp: 150, expectedTokenId: 4, tier: 'Legendary' }
  ];

  for (const testCase of testCases) {
    const tokenId = await generateBadgeTokenId(testCase.xp);
    const isCorrect = tokenId === testCase.expectedTokenId;
    const status = isCorrect ? '✅' : '❌';
    
    console.log(`${status} ${testCase.xp} XP → Token ID ${tokenId} (${testCase.tier})`);
    
    if (!isCorrect) {
      console.error(`   Expected token ID ${testCase.expectedTokenId}, got ${tokenId}`);
    }
  }
}

async function testMintBadge(testAddress = null) {
  console.log('\n🎫 Testing badge minting...');
  
  // Use test address or signer address
  const provider = new ethers.JsonRpcProvider(process.env.ABSTRACT_RPC_URL);
  const signer = new ethers.Wallet(process.env.XPBADGE_MINTER_PRIVATE_KEY, provider);
  const playerAddress = testAddress || signer.address;
  
  console.log(`🎮 Test player: ${playerAddress}`);
  
  // Test minting a common badge (30 XP)
  const testXP = 30;
  const testSeason = 1;
  
  console.log(`🎯 Attempting to mint badge for ${testXP} XP...`);
  
  try {
    const result = await mintXPBadge(playerAddress, testXP, testSeason);
    
    if (result.success) {
      console.log('✅ Test mint successful!');
      console.log(`   Token ID: ${result.tokenId}`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Block: ${result.blockNumber}`);
      console.log(`   Gas Used: ${result.gasUsed}`);
      
      // Check the balance
      const xpBadgeContract = new ethers.Contract(
        process.env.XPBADGE_ADDRESS, 
        XPBADGE_ABI, 
        provider
      );
      
      const balance = await xpBadgeContract.balanceOf(playerAddress, result.tokenId);
      console.log(`   Badge balance: ${balance.toString()}`);
      
    } else {
      console.error('❌ Test mint failed:');
      console.error(`   Error: ${result.error}`);
      if (result.reason) console.error(`   Reason: ${result.reason}`);
      if (result.code) console.error(`   Code: ${result.code}`);
    }
    
  } catch (error) {
    console.error('❌ Test mint error:', error.message);
  }
}

async function main() {
  console.log('🎮 HamBaller.xyz XPBadge Test Suite\n');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const testAddress = args.find(arg => arg.startsWith('--address='))?.split('=')[1];
  const skipMint = args.includes('--skip-mint');
  
  if (testAddress) {
    console.log(`🎯 Using test address: ${testAddress}\n`);
  }
  
  // Run tests
  const setupOk = await testXPBadgeSetup();
  
  if (!setupOk) {
    console.log('\n❌ Setup tests failed - aborting');
    process.exit(1);
  }
  
  await testBadgeTiers();
  
  if (!skipMint) {
    await testMintBadge(testAddress);
  } else {
    console.log('\n⏭️ Skipping mint test (--skip-mint flag)');
  }
  
  console.log('\n🎉 Test suite complete!');
  console.log('\nUsage examples:');
  console.log('  node test-xpbadge.js');
  console.log('  node test-xpbadge.js --address=0x742d35Cc6634C0532925a3b8D5c3Ba4F8b0A87F6');
  console.log('  node test-xpbadge.js --skip-mint');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Run the test suite
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testXPBadgeSetup,
  testBadgeTiers,
  testMintBadge
};