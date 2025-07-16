const { ethers } = require('ethers');
const { handleRunCompletion } = require('../controllers/runLogger');

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
    const rpcUrl = process.env.ABSTRACT_RPC_URL;
    const hodlManagerAddress = process.env.HODL_MANAGER_ADDRESS;
    const xpBadgeAddress = process.env.XPBADGE_ADDRESS;
    const privateKey = process.env.XPBADGE_MINTER_PRIVATE_KEY;

    if (!rpcUrl) {
      console.warn('⚠️ ABSTRACT_RPC_URL not configured - RunCompleted listener disabled');
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
  if (xpEarned >= 100) return 4; // Legendary Badge
  if (xpEarned >= 75) return 3;  // Epic Badge
  if (xpEarned >= 50) return 2;  // Rare Badge
  if (xpEarned >= 25) return 1;  // Common Badge
  return 0; // Participation Badge
}

/**
 * Mint XPBadge NFT for player
 */
async function mintXPBadge(playerAddress, xpEarned, season) {
  try {
    console.log(`🎫 Attempting to mint XPBadge for ${playerAddress} (${xpEarned} XP, Season ${season})`);

    const tokenId = await generateBadgeTokenId(xpEarned, season);
    
    // Check gas price and network status
    const gasPrice = await provider.getFeeData();
    console.log(`⛽ Current gas price: ${ethers.formatUnits(gasPrice.gasPrice, 'gwei')} gwei`);

    // Estimate gas for the transaction
    const gasEstimate = await xpBadgeContract.mintBadge.estimateGas(
      playerAddress,
      tokenId,
      xpEarned,
      season
    );

    console.log(`📊 Gas estimate: ${gasEstimate.toString()}`);

    // Execute the minting transaction
    const tx = await xpBadgeContract.mintBadge(
      playerAddress,
      tokenId,
      xpEarned,
      season,
      {
        gasLimit: gasEstimate + BigInt(50000), // Add buffer
        gasPrice: gasPrice.gasPrice
      }
    );

    console.log(`⏳ XPBadge mint transaction sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait(2); // Wait for 2 confirmations
    
    if (receipt.status === 1) {
      console.log(`✅ XPBadge minted successfully for ${playerAddress}`);
      console.log(`🎫 TokenId: ${tokenId}, XP: ${xpEarned}, Season: ${season}`);
      console.log(`🧾 Transaction: ${tx.hash} (Block: ${receipt.blockNumber})`);
      
      return {
        success: true,
        tokenId,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } else {
      throw new Error('Transaction failed');
    }

  } catch (error) {
    console.error(`❌ Failed to mint XPBadge for ${playerAddress}:`, error.message);
    
    // Log detailed error information
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    if (error.reason) {
      console.error(`Error reason: ${error.reason}`);
    }
    if (error.transaction) {
      console.error(`Failed transaction hash: ${error.transaction.hash}`);
    }

    return {
      success: false,
      error: error.message,
      code: error.code,
      reason: error.reason
    };
  }
}

/**
 * Process minting queue to handle multiple mints sequentially
 */
async function processMintingQueue() {
  if (isMinting || mintingQueue.length === 0) return;

  isMinting = true;
  console.log(`🔄 Processing ${mintingQueue.length} XPBadge minting requests...`);

  while (mintingQueue.length > 0) {
    const { playerAddress, xpEarned, season, timestamp } = mintingQueue.shift();
    
    try {
      const result = await mintXPBadge(playerAddress, xpEarned, season);
      
      // Update Supabase with tokenId if minting was successful
      if (result.success) {
        await updateSupabaseWithBadge(playerAddress, result.tokenId, xpEarned, season, result.txHash, timestamp);
      }
      
      // Small delay between mints to avoid overwhelming the network
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error('❌ Error processing mint from queue:', error);
    }
  }

  isMinting = false;
  console.log('✅ Minting queue processed');
}

/**
 * Update Supabase database with badge information
 */
async function updateSupabaseWithBadge(playerAddress, tokenId, xpEarned, season, txHash, timestamp) {
  try {
    const { db } = require('../config/database');
    
    if (!db) {
      console.warn('⚠️ Database not available - skipping badge log update');
      return;
    }

    // Update the most recent run log with badge information
    const { error } = await db
      .from('run_logs')
      .update({
        xp_badge_token_id: tokenId,
        xp_badge_tx_hash: txHash,
        xp_badge_minted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('player_address', playerAddress)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Failed to update Supabase with badge info:', error);
    } else {
      console.log(`📝 Updated Supabase with badge tokenId ${tokenId} for ${playerAddress}`);
    }

  } catch (error) {
    console.error('❌ Error updating Supabase with badge info:', error);
  }
}

/**
 * Handle RunCompleted event
 */
async function handleRunCompletedEvent(user, xpEarned, cpEarned, dbpMinted, duration, bonusThrowUsed, boostsUsed, event) {
  try {
    console.log(`🎮 RunCompleted event for ${user}: ${xpEarned.toString()} XP, ${cpEarned.toString()} CP, ${dbpMinted.toString()} DBP`);
    
    // Process with existing XP pipeline
    const runData = {
      playerAddress: user,
      cpEarned: Number(cpEarned.toString()),
      dbpMinted: parseFloat(ethers.formatEther(dbpMinted)),
      duration: Number(duration.toString()),
      bonusThrowUsed,
      boostsUsed: boostsUsed.map(b => Number(b.toString())),
      status: 'completed',
      blockNumber: event.blockNumber,
      txHash: event.transactionHash,
      timestamp: new Date().toISOString()
    };

    // Handle existing run completion logic
    await handleRunCompletion(runData);

    // Queue XPBadge minting if XPBadge contract is available
    if (xpBadgeContract && isInitialized) {
      try {
        const currentSeason = await xpBadgeContract.getCurrentSeason();
        const xpAmount = Number(xpEarned.toString());
        
        // Only mint badges for runs that earned XP
        if (xpAmount > 0) {
          mintingQueue.push({
            playerAddress: user,
            xpEarned: xpAmount,
            season: Number(currentSeason.toString()),
            timestamp: runData.timestamp
          });
          
          console.log(`📋 Queued XPBadge mint for ${user} (${xpAmount} XP, Season ${currentSeason})`);
          
          // Process queue (async, don't wait)
          processMintingQueue().catch(console.error);
        } else {
          console.log(`ℹ️ No XPBadge mint for ${user} - no XP earned`);
        }
      } catch (error) {
        console.error('❌ Error queuing XPBadge mint:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error handling RunCompleted event:', error);
  }
}

/**
 * Main listener function
 */
async function listenRunCompleted() {
  console.log('🎧 Initializing RunCompleted listener...');
  
  isInitialized = await initializeContracts();
  
  if (!isInitialized) {
    console.warn('⚠️ RunCompleted listener not fully initialized - limited functionality');
    return;
  }

  // Set up event listener
  hodlManagerContract.on('RunCompleted', handleRunCompletedEvent);
  
  // Handle listener errors
  hodlManagerContract.on('error', (error) => {
    console.error('❌ HODLManager contract listener error:', error);
  });

  console.log('✅ RunCompleted listener active');
  console.log('🎫 XPBadge minting enabled');
}

/**
 * Graceful shutdown
 */
function shutdown() {
  if (hodlManagerContract) {
    hodlManagerContract.removeAllListeners();
    console.log('🛑 RunCompleted listener stopped');
  }
}

// Handle process shutdown
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { 
  listenRunCompleted, 
  shutdown,
  mintXPBadge,
  generateBadgeTokenId,
  processMintingQueue,
  isInitialized: () => isInitialized
};
