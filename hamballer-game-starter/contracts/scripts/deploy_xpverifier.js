const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying XPVerifier Contract...");
  console.log("===================================");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log("📍 Deploying with account:", deployerAddress);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Check if we have enough balance
  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Low balance detected. Deployment may fail.");
  }

  try {
    // Deploy XPVerifier contract
    console.log("\n🔐 Deploying XPVerifier contract...");
    
    const XPVerifier = await ethers.getContractFactory("XPVerifier");
    
    // Estimate deployment gas
    const deploymentData = XPVerifier.getDeployTransaction();
    const estimatedGas = await ethers.provider.estimateGas(deploymentData);
    const gasPrice = await ethers.provider.getFeeData();
    
    console.log("⛽ Estimated gas:", estimatedGas.toString());
    console.log("💸 Gas price:", ethers.formatUnits(gasPrice.gasPrice, "gwei"), "gwei");
    
    // Deploy the contract
    const xpVerifier = await XPVerifier.deploy({
      gasLimit: estimatedGas + BigInt(50000), // Add buffer
      gasPrice: gasPrice.gasPrice
    });

    console.log("⏳ Deployment transaction sent:", xpVerifier.deploymentTransaction().hash);
    console.log("⏳ Waiting for confirmation...");

    // Wait for deployment to be mined
    await xpVerifier.waitForDeployment();
    const xpVerifierAddress = await xpVerifier.getAddress();

    console.log("✅ XPVerifier deployed to:", xpVerifierAddress);

    // Verify the deployment
    console.log("\n🔍 Verifying deployment...");
    
    // Test contract functionality
    const threshold = await xpVerifier.getThreshold();
    const owner = await xpVerifier.owner();
    
    console.log("📊 Contract verification:");
    console.log("  - Owner:", owner);
    console.log("  - Threshold:", threshold.toString());
    console.log("  - Deployer is owner:", owner.toLowerCase() === deployerAddress.toLowerCase());

    // Save deployment info
    const deploymentInfo = {
      network: (await ethers.provider.getNetwork()).name,
      chainId: (await ethers.provider.getNetwork()).chainId.toString(),
      contractAddress: xpVerifierAddress,
      deployerAddress: deployerAddress,
      blockNumber: xpVerifier.deploymentTransaction().blockNumber,
      transactionHash: xpVerifier.deploymentTransaction().hash,
      deployedAt: new Date().toISOString(),
      contractInfo: {
        threshold: threshold.toString(),
        owner: owner
      }
    };

    // Save to file
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, "xpverifier_deployment.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

    console.log("💾 Deployment info saved to:", deploymentFile);

    // Generate environment variable string
    console.log("\n📝 Environment Variables:");
    console.log("========================");
    console.log(`XPVERIFIER_ADDRESS=${xpVerifierAddress}`);
    console.log(`XPVERIFIER_OWNER=${owner}`);
    console.log(`XPVERIFIER_THRESHOLD=${threshold.toString()}`);

    // Save .env template
    const envTemplate = `
# XPVerifier Contract Configuration
XPVERIFIER_ADDRESS=${xpVerifierAddress}
XPVERIFIER_OWNER=${owner}
XPVERIFIER_THRESHOLD=${threshold.toString()}
XPVERIFIER_PRIVATE_KEY=your_private_key_here

# Network Configuration
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
NETWORK_NAME=abstract-testnet
`;

    const envFile = path.join(__dirname, "../../backend/.env.xpverifier");
    fs.writeFileSync(envFile, envTemplate.trim());
    console.log("📄 Environment template saved to:", envFile);

    // Test a basic nullifier check
    console.log("\n🧪 Testing contract functionality...");
    
    const testNullifier = ethers.keccak256(ethers.toUtf8Bytes("test_nullifier"));
    const isUsed = await xpVerifier.isNullifierUsed(testNullifier);
    
    console.log("✅ Nullifier check test:", !isUsed ? "PASSED" : "FAILED");

    console.log("\n🎉 XPVerifier Deployment Complete!");
    console.log("==================================");
    console.log(`📍 Contract Address: ${xpVerifierAddress}`);
    console.log(`🔗 Explorer: https://explorer.testnet.abs.xyz/address/${xpVerifierAddress}`);
    console.log("🚀 Ready for ZK proof verification!");

    return {
      address: xpVerifierAddress,
      contract: xpVerifier,
      deploymentInfo
    };

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error("💸 Insufficient funds for deployment. Please add more ETH to your account.");
    } else if (error.code === 'NONCE_EXPIRED') {
      console.error("🔄 Nonce expired. Please try again.");
    } else if (error.message.includes('gas')) {
      console.error("⛽ Gas estimation failed. The contract may be too complex or there may be a network issue.");
    }
    
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Script execution failed:", error);
      process.exit(1);
    });
}

module.exports = main;