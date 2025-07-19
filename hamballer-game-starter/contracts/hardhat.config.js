require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Disable automatic compiler downloads for offline development
process.env.HARDHAT_COMPILERS_DOWNLOAD = 'false';

// Load environment variables with validation
const { 
  ABS_WALLET_PRIVATE_KEY, 
  PRIVATE_KEY,
  TESTNET_RPC_URL,
  ABSTRACT_RPC_URL,
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

const rpcUrl = TESTNET_RPC_URL || ABSTRACT_RPC_URL || "https://rpc.abstract.xyz";

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
      accounts: [deployerPrivateKey],
      chainId: 11124, // Abstract testnet chain ID
      gasPrice: parseInt(process.env.GAS_PRICE || "1000000000"),
      gas: parseInt(process.env.GAS_LIMIT || "8000000"),
    },
  },
  etherscan: {
    apiKey: {
      abstract: ETHERSCAN_API_KEY || "",
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