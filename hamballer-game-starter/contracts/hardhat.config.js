require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Disable automatic compiler downloads for offline development
process.env.HARDHAT_COMPILERS_DOWNLOAD = 'false';

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    abstract: {
      url: process.env.ABSTRACT_RPC_URL || "https://api.testnet.abs.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11124, // Abstract testnet chain ID
    },
    abstractMainnet: {
      url: process.env.ABSTRACT_MAINNET_RPC_URL || "https://api.mainnet.abs.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 2741, // Abstract mainnet chain ID
    },
  },
  etherscan: {
    apiKey: {
      abstract: process.env.ETHERSCAN_API_KEY || "",
      abstractMainnet: process.env.ETHERSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "abstract",
        chainId: 11124,
        urls: {
          apiURL: "https://api-testnet.abs.xyz/api",
          browserURL: "https://explorer.testnet.abs.xyz",
        },
      },
      {
        network: "abstractMainnet",
        chainId: 2741,
        urls: {
          apiURL: "https://api.mainnet.abs.xyz/api",
          browserURL: "https://explorer.mainnet.abs.xyz",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  mocha: {
    timeout: 40000,
  },
};