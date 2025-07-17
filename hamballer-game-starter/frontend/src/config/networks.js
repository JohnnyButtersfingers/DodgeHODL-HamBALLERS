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

// Import contract configuration from the new contracts module
export { CONTRACT_ADDRESSES, CONTRACT_ABIS, getContractConfigStatus, logContractConfig } from './contracts.js';

export default {
  abstractTestnet,
  CONTRACT_ADDRESSES,
  CONTRACT_ABIS,
};