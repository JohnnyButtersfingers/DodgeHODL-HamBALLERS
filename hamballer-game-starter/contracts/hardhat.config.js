require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Disable automatic compiler downloads for offline development
process.env.HARDHAT_COMPILERS_DOWNLOAD = 'false';

// Load environment variables with validation
const { 
  ABS_WALLET_PRIVATE_KEY, 
  PRIVATE_KEY,
  ABSTRACT_TESTNET_RPC_URL,
  ETHERSCAN_API_KEY 
} = process.env;

// Use ABS_WALLET_PRIVATE_KEY if available, fallback to PRIVATE_KEY
const deployerPrivateKey = ABS_WALLET_PRIVATE_KEY || PRIVATE_KEY;

// Validate required environment variables
if (!deployerPrivateKey) {
  console.error("ERROR: Missing required private key!");
  console.error("Please set ABS_WALLET_PRIVATE_KEY or PRIVATE_KEY in your .env file");
  process.exit(1);
}

const rpcUrl = ABSTRACT_TESTNET_RPC_URL || "https://api.testnet.abs.xyz";

console.log("🔧 Hardhat Configuration Loaded:");
console.log(`   Network: Abstract Testnet`);
console.log(`   RPC URL: ${rpcUrl}`);
console.log(`   Deployer: ${deployerPrivateKey ? "✓ Configured" : "✗ Missing"}`);

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
      url: rpcUrl,
      chainId: 11124,
      accounts: [deployerPrivateKey],
      gasPrice: parseInt(process.env.GAS_PRICE || "1000000000"),
      gas: parseInt(process.env.GAS_LIMIT || "8000000"),
    },
    // TODO: Mainnet deployment configuration for Phase 9
    abstractMainnet: {
      url: process.env.ABSTRACT_MAINNET_RPC_URL || "https://api.mainnet.abs.xyz",
      chainId: 2741,
      accounts: [deployerPrivateKey],
      gasPrice: parseInt(process.env.MAINNET_GAS_PRICE || "1000000000"),
      gas: parseInt(process.env.MAINNET_GAS_LIMIT || "8000000"),
    },
  },
  etherscan: {
    apiKey: {
      abstract: ETHERSCAN_API_KEY || "",
      abstractMainnet: ETHERSCAN_API_KEY || "",
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
    gasPrice: 1,
    showMethodSig: true,
    showTimeSpent: true,
    excludeContracts: [],
    src: "./contracts/",
    outputFile: "gas-report.txt",
  },
  mocha: {
    timeout: 40000,
  },
};