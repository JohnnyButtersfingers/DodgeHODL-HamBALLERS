/**
 * Contract Configuration for HamBaller.xyz Frontend
 * 
 * This module handles contract address configuration with multiple sources:
 * 1. Environment variables (VITE_*)
 * 2. contracts.json file (from deployment)
 * 3. Fallback to empty addresses
 */

// Try to load contracts.json from deployment
let deploymentContracts = null;

try {
  // Dynamic import of contracts.json if it exists
  deploymentContracts = await import('../../../contracts/deployment-info.json')
    .then(module => module.default)
    .catch(() => null);
} catch (error) {
  console.log('📄 No deployment-info.json found, using environment variables');
}

// Contract addresses with priority: env vars > deployment json > empty
export const CONTRACT_ADDRESSES = {
  DBP_TOKEN: process.env.VITE_DBP_TOKEN_ADDRESS || 
             deploymentContracts?.dbpToken || 
             '',
  BOOST_NFT: process.env.VITE_BOOST_NFT_ADDRESS || 
             deploymentContracts?.boostNft || 
             '',
  HODL_MANAGER: process.env.VITE_HODL_MANAGER_ADDRESS || 
                deploymentContracts?.hodlManager || 
                '',
  XP_BADGE: process.env.VITE_XP_BADGE_ADDRESS || 
            deploymentContracts?.xpBadge || 
            '',
};

// Contract ABIs (simplified versions for frontend use)
export const CONTRACT_ABIS = {
  DBP_TOKEN: [
    'function balanceOf(address account) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  ],
  BOOST_NFT: [
    'function balanceOf(address account, uint256 id) view returns (uint256)',
    'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])',
    'function isApprovedForAll(address account, address operator) view returns (bool)',
    'function setApprovalForAll(address operator, bool approved)',
    'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)',
  ],
  HODL_MANAGER: [
    'function startRun(uint8[] moves, uint256[] boostIds) returns (bytes32)',
    'function endRun(bytes32 runId, bool hodlDecision) returns (bool)',
    'function getRunData(bytes32 runId) view returns (tuple)',
    'function getPlayerStats(address player) view returns (tuple)',
    'function getCurrentPrice() view returns (uint256)',
    'function isRunActive(bytes32 runId) view returns (bool)',
  ],
  XP_BADGE: [
    'function mintBadge(uint256 badgeId, uint256 xpRequired) external returns (uint256)',
    'function balanceOf(address owner, uint256 id) view returns (uint256)',
    'function getBadgeInfo(uint256 badgeId) view returns (string memory name, string memory description, uint256 xpRequired, bool isActive)',
    'function getPlayerBadges(address player) view returns (uint256[])',
    'event BadgeMinted(address indexed player, uint256 indexed badgeId, uint256 tokenId, uint256 xpRequired)',
  ],
};

// Configuration status
export const getContractConfigStatus = () => {
  const status = {
    dbpToken: !!CONTRACT_ADDRESSES.DBP_TOKEN,
    boostNft: !!CONTRACT_ADDRESSES.BOOST_NFT,
    hodlManager: !!CONTRACT_ADDRESSES.HODL_MANAGER,
    xpBadge: !!CONTRACT_ADDRESSES.XP_BADGE,
    source: deploymentContracts ? 'deployment-json' : 'environment-vars'
  };

  status.allConfigured = status.dbpToken && status.boostNft && status.hodlManager && status.xpBadge;
  
  return status;
};

// Log configuration status
export const logContractConfig = () => {
  const status = getContractConfigStatus();
  
  console.log('📜 Contract Configuration Status:');
  console.log(`   Source: ${status.source}`);
  console.log(`   DBP Token: ${status.dbpToken ? '✅' : '❌'} ${CONTRACT_ADDRESSES.DBP_TOKEN || 'Not set'}`);
  console.log(`   Boost NFT: ${status.boostNft ? '✅' : '❌'} ${CONTRACT_ADDRESSES.BOOST_NFT || 'Not set'}`);
  console.log(`   HODL Manager: ${status.hodlManager ? '✅' : '❌'} ${CONTRACT_ADDRESSES.HODL_MANAGER || 'Not set'}`);
  console.log(`   XP Badge: ${status.xpBadge ? '✅' : '❌'} ${CONTRACT_ADDRESSES.XP_BADGE || 'Not set'}`);
  console.log(`   All Configured: ${status.allConfigured ? '✅' : '❌'}`);
  
  if (!status.allConfigured) {
    console.log('\n📋 To configure contracts:');
    console.log('   1. Deploy contracts: cd ../contracts && npm run deploy:production');
    console.log('   2. Copy deployment-info.json to frontend/ or set environment variables');
    console.log('   3. Restart the frontend development server');
  }
};

// Auto-log on module load
if (typeof window !== 'undefined') {
  // Only log in browser environment
  logContractConfig();
}

export default {
  CONTRACT_ADDRESSES,
  CONTRACT_ABIS,
  getContractConfigStatus,
  logContractConfig
}; 