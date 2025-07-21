const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🎯 Starting XP Contracts Deployment on Abstract Testnet...\n");
  
  // Validate environment variables
  const { ABS_WALLET_ADDRESS, ABS_WALLET_PRIVATE_KEY, TESTNET_RPC_URL } = process.env;
  
  if (!ABS_WALLET_PRIVATE_KEY || ABS_WALLET_PRIVATE_KEY === "your_private_key_here_do_not_share") {
    console.error("❌ ERROR: ABS_WALLET_PRIVATE_KEY not configured in .env file!");
    process.exit(1);
  }
  
  if (!TESTNET_RPC_URL) {
    console.error("❌ ERROR: TESTNET_RPC_URL not configured in .env file!");
    process.exit(1);
  }
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deployment Configuration:");
  console.log(`   Network: Abstract Testnet (Chain ID: 11124)`);
  console.log(`   RPC URL: ${TESTNET_RPC_URL}`);
  console.log(`   Deployer Address: ${deployer.address}`);
  console.log(`   Expected Address: ${ABS_WALLET_ADDRESS}`);
  
  if (deployer.address.toLowerCase() !== ABS_WALLET_ADDRESS?.toLowerCase()) {
    console.warn("⚠️  WARNING: Deployer address doesn't match ABS_WALLET_ADDRESS in .env");
  }
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance === 0n) {
    console.error("❌ ERROR: Deployer has no ETH balance!");
    console.error("   Please fund your wallet at: https://faucet.testnet.abs.xyz");
    process.exit(1);
  }
  
  console.log("\n🚀 Deploying XP Contracts...\n");
  
  // Deploy XPBadge Contract
  console.log("1️⃣ Deploying XPBadge NFT Contract...");
  const XPBadge = await ethers.getContractFactory("XPBadge");
  const xpBadge = await XPBadge.deploy(
    "HamBaller XP Badge",
    "HXPB",
    "https://api.hamballer.xyz/metadata/xpbadge/"
  );
  await xpBadge.waitForDeployment();
  const xpBadgeAddress = await xpBadge.getAddress();
  console.log("✅ XPBadge deployed to:", xpBadgeAddress);
  
  // Deploy XPVerifier Contract (stub for now)
  console.log("\n2️⃣ Deploying XPVerifier Contract...");
  const XPVerifier = await ethers.getContractFactory("XPVerifier");
  const xpVerifier = await XPVerifier.deploy({ gasLimit: 8000000 }); // 8M gas limit as requested
  await xpVerifier.waitForDeployment();
  const xpVerifierAddress = await xpVerifier.getAddress();
  console.log("✅ XPVerifier deployed to:", xpVerifierAddress);
  
  // Set up minter role for backend
  console.log("\n🔐 Setting up permissions...");
  const MINTER_ROLE = await xpBadge.MINTER_ROLE();
  
  // Grant minter role to deployer (will be updated to backend minter later)
  await xpBadge.grantRole(MINTER_ROLE, deployer.address);
  console.log("✅ Granted MINTER_ROLE to deployer");
  
  // Save deployment addresses
  const deploymentData = {
    network: "abstract-testnet",
    chainId: 11124,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    contracts: {
      XPBadge: {
        address: xpBadgeAddress,
        name: "HamBaller XP Badge",
        symbol: "HXPB"
      },
      XPVerifier: {
        address: xpVerifierAddress,
        name: "XPVerifier"
      }
    }
  };
  
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, "xp-contracts-abstract.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
  console.log("\n📄 Deployment data saved to:", deploymentFile);
  
  // Create .env update instructions
  console.log("\n📝 Update your .env file with these addresses:");
  console.log("```");
  console.log(`XPBADGE_ADDRESS=${xpBadgeAddress}`);
  console.log(`XPVERIFIER_ADDRESS=${xpVerifierAddress}`);
  console.log("```");
  
  // Verify on block explorer
  console.log("\n🔍 View contracts on Abstract Explorer:");
  console.log(`   XPBadge: https://explorer.testnet.abs.xyz/address/${xpBadgeAddress}`);
  console.log(`   XPVerifier: https://explorer.testnet.abs.xyz/address/${xpVerifierAddress}`);
  
  console.log("\n✅ XP Contracts deployment complete!");
  console.log("\n🎯 Next steps:");
  console.log("   1. Update .env file with contract addresses");
  console.log("   2. Configure backend with XPBADGE_MINTER_PRIVATE_KEY");
  console.log("   3. Grant MINTER_ROLE to backend minter address");
  console.log("   4. Test badge minting with test script");
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });