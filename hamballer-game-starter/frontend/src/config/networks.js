// Abstract Testnet Configuration
export const abstractTestnet = {
  id: 11124,
  name: 'Abstract Testnet',
  network: 'abstract-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://api.testnet.abs.xyz'],
      webSocket: ['wss://api.testnet.abs.xyz'],
    },
    public: {
      http: ['https://api.testnet.abs.xyz'],
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
  DBP_TOKEN: process.env.VITE_DBP_TOKEN_ADDRESS || '',
  BOOST_NFT: process.env.VITE_BOOST_NFT_ADDRESS || '',
  HODL_MANAGER: process.env.VITE_HODL_MANAGER_ADDRESS || '',
  XP_BADGE: process.env.VITE_XP_BADGE_ADDRESS || '',
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
    'function mintBadge(address to, uint256 xpValue, uint256 seasonId) returns (uint256)',
    'function getChildren(uint256 parentId) view returns (tuple(address contractAddress,uint256 tokenId)[])',
  ],
};

export default {
  abstractTestnet,
  CONTRACT_ADDRESSES,
  CONTRACT_ABIS,
};
