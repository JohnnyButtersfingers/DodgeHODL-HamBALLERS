const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Abstract Testnet Configuration
const ABSTRACT_TESTNET = {
  chainId: 11124,
  rpcUrls: [
    'https://api.testnet.abs.xyz',
    'https://rpc.abstract.xyz' // Fallback RPC
  ],
  blockExplorer: 'https://explorer.testnet.abs.xyz'
};

// Deployment configuration
const DEPLOYMENT_CONFIG = {
  gasLimit: 8000000, // 8M gas limit
  maxRetries: 3,
  retryDelay: 5000 // 5 seconds
};

async function deployWithRetry(contractFactory, args = [], retries = DEPLOYMENT_CONFIG.maxRetries) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Deployment attempt ${i + 1}/${retries}...`);
      const contract = await contractFactory.deploy(...args, {
        gasLimit: DEPLOYMENT_CONFIG.gasLimit
      });
      await contract.waitForDeployment();
      return contract;
    } catch (error) {
      console.error(`Deployment attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) throw error;
      
      // Try switching RPC if available
      if (i < ABSTRACT_TESTNET.rpcUrls.length - 1) {
        console.log(`Switching to fallback RPC: ${ABSTRACT_TESTNET.rpcUrls[i + 1]}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, DEPLOYMENT_CONFIG.retryDelay));
    }
  }
}

async function main() {
  console.log("🚀 Starting XPVerifier Deployment on Abstract Testnet");
  console.log("================================================");
  
  try {
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer address:", deployer.address);
    
    // Check balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Deployer balance:", ethers.formatEther(balance), "ETH");
    
    if (balance === 0n) {
      console.error("❌ Deployer has no balance! Please fund the account.");
      console.log("🚰 Abstract Testnet Faucet: https://faucet.testnet.abs.xyz");
      process.exit(1);
    }
    
    // Get network info
    const network = await deployer.provider.getNetwork();
    console.log("🌐 Network:", network.name, `(Chain ID: ${network.chainId})`);
    
    if (network.chainId !== BigInt(ABSTRACT_TESTNET.chainId)) {
      console.error(`❌ Wrong network! Expected Chain ID ${ABSTRACT_TESTNET.chainId}, got ${network.chainId}`);
      process.exit(1);
    }
    
    // Deploy XPVerifier Contract
    console.log("\n📝 Deploying XPVerifier Contract...");
    const XPVerifier = await ethers.getContractFactory("XPVerifier");
    
    const xpVerifier = await deployWithRetry(XPVerifier);
    const xpVerifierAddress = await xpVerifier.getAddress();
    
    console.log("✅ XPVerifier deployed to:", xpVerifierAddress);
    console.log(`🔍 View on Explorer: ${ABSTRACT_TESTNET.blockExplorer}/address/${xpVerifierAddress}`);
    
    // Wait for confirmations
    console.log("\n⏳ Waiting for block confirmations...");
    await xpVerifier.deploymentTransaction().wait(3);
    console.log("✅ Deployment confirmed!");
    
    // Grant roles if needed
    console.log("\n🔐 Setting up roles...");
    try {
      // Grant verifier role to backend service (if address is available)
      const backendAddress = process.env.BACKEND_WALLET_ADDRESS;
      if (backendAddress) {
        const VERIFIER_ROLE = await xpVerifier.VERIFIER_ROLE();
        const tx = await xpVerifier.grantRole(VERIFIER_ROLE, backendAddress);
        await tx.wait();
        console.log(`✅ Granted VERIFIER_ROLE to backend: ${backendAddress}`);
      }
      
      // Set initial threshold
      const threshold = ethers.parseUnits("100", 18); // 100 XP minimum
      const setThresholdTx = await xpVerifier.setThreshold(threshold);
      await setThresholdTx.wait();
      console.log("✅ Set initial XP threshold to 100");
      
    } catch (error) {
      console.warn("⚠️ Role setup failed:", error.message);
      console.log("You may need to set up roles manually");
    }
    
    // Save deployment info
    const deploymentInfo = {
      network: "abstract-testnet",
      chainId: ABSTRACT_TESTNET.chainId,
      contracts: {
        XPVerifier: {
          address: xpVerifierAddress,
          deployedAt: new Date().toISOString(),
          deployer: deployer.address,
          gasUsed: (await xpVerifier.deploymentTransaction().wait()).gasUsed.toString(),
          deploymentTx: xpVerifier.deploymentTransaction().hash
        }
      },
      rpcUrls: ABSTRACT_TESTNET.rpcUrls,
      blockExplorer: ABSTRACT_TESTNET.blockExplorer
    };
    
    // Save to deployments directory
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentsDir, `xpverifier-${network.chainId}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n📄 Deployment info saved to: ${deploymentFile}`);
    
    // Output environment variables
    console.log("\n🔧 Environment Variables:");
    console.log("Add these to your .env file:");
    console.log("================================");
    console.log(`VITE_XPVERIFIER_ADDRESS=${xpVerifierAddress}`);
    console.log(`XPVERIFIER_ADDRESS=${xpVerifierAddress}`);
    console.log(`ABSTRACT_TESTNET_RPC=${ABSTRACT_TESTNET.rpcUrls[0]}`);
    console.log("================================");
    
    console.log("\n✅ XPVerifier deployment completed successfully!");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

// Run deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });