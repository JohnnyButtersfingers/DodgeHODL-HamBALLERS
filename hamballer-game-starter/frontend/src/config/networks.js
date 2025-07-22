// Abstract Testnet Configuration
export const abstractTestnet = {
  id: import.meta.env.VITE_CHAIN_ID ? parseInt(import.meta.env.VITE_CHAIN_ID) : 11124,
  name: import.meta.env.VITE_CHAIN_NAME || 'Abstract Testnet',
  network: 'abstract-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_RPC_URL || 'https://api.testnet.abs.xyz'],
      webSocket: ['wss://api.testnet.abs.xyz'],
    },
    public: {
      http: [import.meta.env.VITE_RPC_URL || 'https://api.testnet.abs.xyz'],
      webSocket: ['wss://api.testnet.abs.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Abstract Explorer',
      url: 'https://explorer.testnet.abs.xyz',
    },
  },
  testnet: true,
};

// Contract addresses (these will be set after deployment)
export const CONTRACT_ADDRESSES = {
  DBP_TOKEN: import.meta.env.VITE_DBP_TOKEN_ADDRESS || '',
  BOOST_NFT: import.meta.env.VITE_BOOST_NFT_ADDRESS || '',
  HODL_MANAGER: import.meta.env.VITE_HODL_MANAGER_ADDRESS || '',
  XP_BADGE: import.meta.env.VITE_XPBADGE_ADDRESS || '',
  XP_VERIFIER: import.meta.env.VITE_XPVERIFIER_ADDRESS || '',
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
    'function balanceOf(address account, uint256 id) view returns (uint256)',
    'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])',
    'function mintBadge(address to, uint256 tokenId, uint256 xp, uint256 season) returns (bool)',
    'function getBadgeInfo(address player, uint256 tokenId) view returns (tuple)',
    'function getBadgesByPlayer(address player) view returns (tuple[])',
    'function uri(uint256 tokenId) view returns (string)',
  ],
  XP_VERIFIER: [
    'function verifyXPProof(bytes32 nullifier, bytes32 commitment, uint256[8] calldata proof, uint256 claimedXP, uint256 threshold) external returns (bool)',
    'function isNullifierUsed(bytes32 nullifier) external view returns (bool)',
    'function getVerificationResult(address player, bytes32 nullifier) external view returns (tuple)',
    'function getThreshold() external view returns (uint256)',
    'event XPProofVerified(address indexed player, bytes32 indexed nullifier, uint256 claimedXP, uint256 threshold, bool verified)',
  ],
};

export default {
  abstractTestnet,
  CONTRACT_ADDRESSES,
  CONTRACT_ABIS,
};