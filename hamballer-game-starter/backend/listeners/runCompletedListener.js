const { ethers } = require('ethers');
const { handleRunCompletion } = require('../controllers/runLogger');
const { retryQueue } = require('../retryQueue');
const { achievementsService } = require('../services/achievementsService');
const { db } = require('../config/database');
const { config, validation } = require('../config/environment');

// Contract ABIs
const HODL_MANAGER_ABI = [
  'event RunCompleted(address indexed user, uint256 xpEarned, uint256 cpEarned, uint256 dbpMinted, uint256 duration, bool bonusThrowUsed, uint256[] boostsUsed)'
];

const XPBADGE_ABI = [
  'function mintBadge(address player, uint256 tokenId, uint256 xp, uint256 season) external',
  'function getCurrentSeason() view returns (uint256)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function MINTER_ROLE() view returns (bytes32)',
  'event BadgeMinted(address indexed player, uint256 indexed tokenId, uint256 xp, uint256 season)'
];

// Global state for managing XPBadge minting
let provider, hodlManagerContract, xpBadgeContract, signer;
let isInitialized = false;
let mintingQueue = [];
let isMinting = false;

/**
 * Initialize contracts and provider
 */
async function initializeContracts() {
  try {
    const rpcUrl = process.env.ABSTRACT_RPC_URL || config.blockchain.rpcUrl;
    const hodlManagerAddress = process.env.HODL_MANAGER_ADDRESS || config.contracts.hodlManager;
    const xpBadgeAddress = process.env.XPBADGE_ADDRESS || config.contracts.xpBadge;
    const privateKey = process.env.XPBADGE_MINTER_PRIVATE_KEY;

    if (!rpcUrl) {
      console.warn('⚠️ RPC URL not configured - RunCompleted listener disabled');
      return false;
    }

    if (!hodlManagerAddress) {
      console.warn('⚠️ HODL_MANAGER_ADDRESS not configured - RunCompleted listener disabled');
      return false;
    }

    if (!xpBadgeAddress) {
      console.warn('⚠️ XPBADGE_ADDRESS not configured - XPBadge minting disabled');
      return false;
    }

    if (!privateKey) {
      console.warn('⚠️ XPBADGE_MINTER_PRIVATE_KEY not configured - XPBadge minting disabled');
      return false;
    }

    // Initialize provider and signer
    provider = new ethers.JsonRpcProvider(rpcUrl);
    signer = new ethers.Wallet(privateKey, provider);

    // Initialize contracts
    hodlManagerContract = new ethers.Contract(hodlManagerAddress, HODL_MANAGER_ABI, provider);
    xpBadgeContract = new ethers.Contract(xpBadgeAddress, XPBADGE_ABI, signer);

    // Verify signer has minting permissions
    const minterRole = await xpBadgeContract.MINTER_ROLE();
    const hasMinterRole = await xpBadgeContract.hasRole(minterRole, signer.address);
    
    if (!hasMinterRole) {
      console.error('❌ Configured signer does not have MINTER_ROLE for XPBadge contract');
      return false;
    }

    console.log('✅ RunCompleted listener initialized');
    console.log(`📍 HODL Manager: ${hodlManagerAddress}`);
    console.log(`🎫 XPBadge Contract: ${xpBadgeAddress}`);
    console.log(`🔑 Minter Address: ${signer.address}`);

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize RunCompleted listener:', error.message);
    return false;
  }
}

/**
 * Generate tokenId for XPBadge based on XP earned and season
 */
async function generateBadgeTokenId(xpEarned, season) {
  // Badge tiers based on XP earned in a single run
  const badgeTiers = [
    { minXp: 0, maxXp: 99, tokenId: 1, name: 'Novice HODLer' },
    { minXp: 100, maxXp: 499, tokenId: 2, name: 'Experienced Trader' },
    { minXp: 500, maxXp: 999, tokenId: 3, name: 'Master Strategist' },
    { minXp: 1000, maxXp: 2499, tokenId: 4, name: 'Legendary HODLer' },
    { minXp: 2500, maxXp: 999999, tokenId: 5, name: 'Supreme Champion' }
  ];

  const tier = badgeTiers.find(t => xpEarned >= t.minXp && xpEarned <= t.maxXp);
  if (!tier) {
    throw new Error(`No badge tier found for XP: ${xpEarned}`);
  }

  // Generate unique tokenId: (season * 1000) + tier.tokenId
  const tokenId = (season * 1000) + tier.tokenId;
  
  console.log(`🎖️ Generated badge tokenId: ${tokenId} (${tier.name}) for ${xpEarned} XP in season ${season}`);
  
  return {
    tokenId,
    tier: tier.name,
    xpRequired: tier.minXp
  };
}

/**
 * Mint XPBadge for a player
 */
async function mintXPBadge(playerAddress, xpEarned, season) {
  try {
    console.log(`🏆 Attempting to mint XPBadge for ${playerAddress} with ${xpEarned} XP in season ${season}`);
    
    // Generate badge tokenId
    const { tokenId, tier, xpRequired } = await generateBadgeTokenId(xpEarned, season);
    
    // Check if player already has this badge
    const existingBadge = await db.getPlayerBadge(playerAddress, tokenId);
    if (existingBadge) {
      console.log(`⚠️ Player ${playerAddress} already has badge ${tokenId} (${tier})`);
      return { success: false, reason: 'Badge already owned' };
    }
    
    // Add to minting queue
    mintingQueue.push({
      playerAddress,
      tokenId,
      xpEarned,
      season,
      tier,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📋 Added badge minting to queue for ${playerAddress}: ${tier} (${tokenId})`);
    
    // Process queue if not already processing
    if (!isMinting) {
      await processMintingQueue();
    }
    
    return { success: true, tokenId, tier, xpRequired };
    
  } catch (error) {
    console.error('❌ Error in mintXPBadge:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Process the minting queue
 */
async function processMintingQueue() {
  if (isMinting || mintingQueue.length === 0) {
    return;
  }
  
  isMinting = true;
  console.log(`🔄 Processing ${mintingQueue.length} badge minting requests...`);
  
  while (mintingQueue.length > 0) {
    const mintRequest = mintingQueue.shift();
    
    try {
      console.log(`🏆 Minting badge ${mintRequest.tokenId} for ${mintRequest.playerAddress}...`);
      
      // Mint badge on blockchain
      const tx = await xpBadgeContract.mintBadge(
        mintRequest.playerAddress,
        mintRequest.tokenId,
        mintRequest.xpEarned,
        mintRequest.season
      );
      
      console.log(`⏳ Badge minting transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`✅ Badge minted successfully! Transaction: ${receipt.transactionHash}`);
      
      // Update Supabase
      await updateSupabaseWithBadge(
        mintRequest.playerAddress,
        mintRequest.tokenId,
        mintRequest.xpEarned,
        mintRequest.season,
        receipt.transactionHash,
        mintRequest.timestamp
      );
      
    } catch (error) {
      console.error(`❌ Failed to mint badge for ${mintRequest.playerAddress}:`, error.message);
      
      // Add to retry queue for later processing
      retryQueue.add({
        type: 'badge_mint',
        data: mintRequest,
        error: error.message,
        attempts: 0
      });
    }
  }
  
  isMinting = false;
  console.log('✅ Badge minting queue processed');
}

/**
 * Update Supabase with badge minting information
 */
async function updateSupabaseWithBadge(playerAddress, tokenId, xpEarned, season, txHash, timestamp) {
  try {
    const { data, error } = await db
      .from('player_badges')
      .insert({
        player_address: playerAddress,
        badge_token_id: tokenId,
        xp_earned: xpEarned,
        season: season,
        transaction_hash: txHash,
        minted_at: timestamp,
        status: 'minted'
      });
    
    if (error) {
      console.error('❌ Error updating Supabase with badge:', error);
      throw error;
    }
    
    console.log(`✅ Badge ${tokenId} recorded in Supabase for ${playerAddress}`);
    
  } catch (error) {
    console.error('❌ Failed to update Supabase with badge:', error.message);
    throw error;
  }
}

/**
 * Handle RunCompleted event
 */
async function handleRunCompletedEvent(user, xpEarned, cpEarned, dbpMinted, duration, bonusThrowUsed, boostsUsed, event) {
  console.log('\n🏆 ===== RunCompleted Event Triggered =====');
  console.log(`👤 Player: ${user}`);
  console.log(`⭐ XP Earned: ${xpEarned.toString()}`);
  console.log(`💰 DBP Earned: ${dbpMinted.toString()}`);
  console.log(`🎮 Duration: ${duration.toString()}`);
  console.log(`🎯 Bonus Throw Used: ${bonusThrowUsed}`);
  console.log(`🚀 Boosts Used: ${boostsUsed.map(b => b.toString()).join(', ')}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log('==========================================\n');
  
  try {
    // Update XP in database
    const result = await db.updateXP(user, xpEarned.toString(), dbpMinted.toString(), event.transactionHash);
    
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
    
    // Check for badge eligibility
    if (xpBadgeContract && isInitialized) {
      try {
        const currentSeason = await xpBadgeContract.getCurrentSeason();
        const badgeResult = await mintXPBadge(user, xpEarned.toString(), currentSeason.toString());
        
        if (badgeResult.success) {
          console.log(`🏆 Badge minting initiated: ${badgeResult.tier} (${badgeResult.tokenId})`);
        } else if (badgeResult.reason === 'Badge already owned') {
          console.log('ℹ️ Player already owns this badge tier');
        } else {
          console.log('⚠️ Badge minting failed:', badgeResult.error);
        }
      } catch (badgeError) {
        console.error('❌ Error checking badge eligibility:', badgeError.message);
      }
    }
    
    // Broadcast update to connected WebSocket clients
    broadcastXPReward(user, xpEarned.toString(), dbpMinted.toString(), event.transactionHash, result);
    
  } catch (error) {
    console.error('❌ Error processing RunCompleted event:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      playerAddress: user,
      xpEarned: xpEarned.toString(),
      dbpEarned: dbpMinted.toString(),
      runId: event.transactionHash
    });
  }
}

/**
 * Start listening for RunCompleted events
 */
async function listenRunCompleted() {
  // Check if blockchain and contracts are configured
  if (!validation.isBlockchainReady() || !validation.isContractsReady()) {
    console.log('🎧 RunCompleted listener not configured - missing blockchain or contract configuration');
    return;
  }

  try {
    // Initialize contracts if not already done
    if (!isInitialized) {
      isInitialized = await initializeContracts();
      if (!isInitialized) {
        console.log('🎧 RunCompleted listener not initialized - contract configuration issues');
        return;
      }
    }
    
    console.log('🎧 Starting RunCompleted event listener...');
    console.log(`📡 Listening for events on contract: ${hodlManagerContract.address}`);
    console.log(`🌐 RPC URL: ${provider.connection.url}`);
    
    hodlManagerContract.on('RunCompleted', handleRunCompletedEvent);

    console.log('✅ RunCompleted listener active and listening for events');
    
    // Log listener status periodically
    setInterval(() => {
      console.log('🎧 RunCompleted listener status: Active and listening');
    }, 60000); // Log every minute
    
  } catch (error) {
    console.error('❌ Failed to start RunCompleted listener:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      rpcUrl: config.blockchain.rpcUrl,
      contractAddress: config.contracts.hodlManager
    });
  }
}

/**
 * Broadcast XP reward to WebSocket clients
 */
function broadcastXPReward(playerAddress, xpEarned, dbpEarned, runId, updateResult) {
  if (!global.wsClients) {
    console.log('📡 No WebSocket clients available for broadcasting');
    return;
  }

  const message = JSON.stringify({
    type: 'xp_reward',
    channel: 'xp',
    data: {
      playerAddress,
      xpEarned,
      dbpEarned,
      runId,
      updateResult,
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

/**
 * Shutdown listener
 */
function shutdown() {
  if (hodlManagerContract) {
    hodlManagerContract.removeAllListeners();
    console.log('🛑 RunCompleted listener shutdown');
  }
}

module.exports = {
  listenRunCompleted,
  shutdown,
  mintXPBadge,
  processMintingQueue
};
