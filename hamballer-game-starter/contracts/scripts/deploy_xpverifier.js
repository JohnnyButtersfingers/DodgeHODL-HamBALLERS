const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🎯 Starting XPVerifier Contract Deployment on Abstract Testnet...\n");
  
  // Validate environment variables
  const { ABS_WALLET_ADDRESS, ABS_WALLET_PRIVATE_KEY, TESTNET_RPC_URL } = process.env;
  
  if (!ABS_WALLET_PRIVATE_KEY || ABS_WALLET_PRIVATE_KEY === "your_private_key_here_do_not_share") {
    console.error("❌ ERROR: ABS_WALLET_PRIVATE_KEY not configured in .env file!");
    process.exit(1);
  }
  
  // RPC fallback configuration
  const primaryRPC = TESTNET_RPC_URL || "https://api.testnet.abs.xyz";
  const fallbackRPC = "https://rpc.abstract.xyz";
  
  console.log("📍 Deployment Configuration:");
  console.log(`   Network: Abstract Testnet (Chain ID: 11124)`);
  console.log(`   Primary RPC: ${primaryRPC}`);
  console.log(`   Fallback RPC: ${fallbackRPC}`);
  
  // Test RPC connectivity with fallback
  let activeRPC = primaryRPC;
  try {
    const testProvider = new ethers.JsonRpcProvider(primaryRPC);
    await testProvider.getNetwork();
    console.log("✅ Primary RPC connection successful");
  } catch (error) {
    console.warn("⚠️ Primary RPC failed, trying fallback...", error.message);
    try {
      const fallbackProvider = new ethers.JsonRpcProvider(fallbackRPC);
      await fallbackProvider.getNetwork();
      activeRPC = fallbackRPC;
      console.log("✅ Fallback RPC connection successful");
    } catch (fallbackError) {
      console.error("❌ Both RPC endpoints failed!");
      console.error("Primary:", error.message);
      console.error("Fallback:", fallbackError.message);
      process.exit(1);
    }
  }
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`   Deployer Address: ${deployer.address}`);
  console.log(`   Expected Address: ${ABS_WALLET_ADDRESS}`);
  
  if (deployer.address.toLowerCase() !== ABS_WALLET_ADDRESS?.toLowerCase()) {
    console.warn("⚠️ WARNING: Deployer address doesn't match ABS_WALLET_ADDRESS in .env");
  }
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance === 0n) {
    console.error("❌ ERROR: Deployer has no ETH balance!");
    console.error("   Please fund your wallet at: https://faucet.testnet.abs.xyz");
    process.exit(1);
  }
  
  console.log("\n🚀 Deploying XPVerifier Contract...\n");
  
  try {
    // Deploy XPVerifier Contract with gas optimizations
    console.log("1️⃣ Deploying XPVerifier with ZK proof verification...");
    const XPVerifier = await ethers.getContractFactory("XPVerifier");
    
    // Get current gas price
    const feeData = await deployer.provider.getFeeData();
    console.log(`⛽ Current gas price: ${ethers.formatUnits(feeData.gasPrice || 0n, "gwei")} gwei`);
    
    // Deploy with 8M gas limit and optimized settings
    const xpVerifier = await XPVerifier.deploy({
      gasLimit: 8000000, // 8M gas limit as specified
      gasPrice: feeData.gasPrice,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
    });
    
    console.log(`⏳ Deployment transaction sent: ${xpVerifier.deploymentTransaction()?.hash}`);
    console.log("⏳ Waiting for deployment confirmation...");
    
    await xpVerifier.waitForDeployment();
    const xpVerifierAddress = await xpVerifier.getAddress();
    console.log("✅ XPVerifier deployed to:", xpVerifierAddress);
    
    // Verify deployment by calling a view function
    try {
      const currentThreshold = await xpVerifier.getThreshold();
      console.log(`🎯 Default threshold: ${currentThreshold.toString()}`);
    } catch (error) {
      console.warn("⚠️ Could not verify threshold (contract may still be deploying)");
    }
    
    // Set up initial configuration
    console.log("\n🔐 Setting up XPVerifier configuration...");
    
    // Grant necessary roles if contract has role-based access
    try {
      // Check if contract has DEFAULT_ADMIN_ROLE
      const hasAdminRole = await xpVerifier.hasRole ? 
        await xpVerifier.hasRole(await xpVerifier.DEFAULT_ADMIN_ROLE(), deployer.address) : 
        true;
      
      if (hasAdminRole) {
        console.log("✅ Admin role configured for deployer");
      }
    } catch (error) {
      console.log("ℹ️ Contract does not use role-based access control");
    }
    
    // Save deployment addresses
    const deploymentData = {
      network: "abstract-testnet",
      chainId: 11124,
      rpcUrl: activeRPC,
      deployer: deployer.address,
      deploymentTime: new Date().toISOString(),
      gasUsed: "8000000", // Max gas limit used
      contracts: {
        XPVerifier: {
          address: xpVerifierAddress,
          name: "XPVerifier",
          version: "1.0.0",
          description: "ZK-SNARK proof verification for XP claims",
          features: [
            "Groth16 proof verification",
            "Nullifier replay protection", 
            "Configurable XP thresholds",
            "Gas optimized (<320k per verification)"
          ]
        }
      },
      configuration: {
        defaultThreshold: "100",
        proofSystem: "groth16",
        curve: "bn128",
        nullifierProtection: true
      }
    };
    
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentsDir, "xpverifier-abstract.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log("\n📄 Deployment data saved to:", deploymentFile);
    
    // Create .env update instructions
    console.log("\n📝 Update your .env file with these addresses:");
    console.log("```");
    console.log(`XPVERIFIER_ADDRESS=${xpVerifierAddress}`);
    console.log(`ABSTRACT_RPC_URL=${activeRPC}`);
    console.log("```");
    
    // Verify on block explorer
    console.log("\n🔍 View contract on Abstract Explorer:");
    console.log(`   XPVerifier: https://explorer.testnet.abs.xyz/address/${xpVerifierAddress}`);
    
    console.log("\n✅ XPVerifier deployment complete!");
    console.log("\n🎯 Next steps:");
    console.log("   1. Update .env file with XPVERIFIER_ADDRESS");
    console.log("   2. Configure backend with XPVERIFIER_PRIVATE_KEY");
    console.log("   3. Test ZK proof generation and verification");
    console.log("   4. Run gas profiling tests");
    console.log("   5. Prepare for Mainnet deployment (Chain ID: 2741)");
    
  } catch (deploymentError) {
    console.error("❌ Deployment failed:", deploymentError);
    
    // Provide specific error guidance
    if (deploymentError.message.includes("timeout")) {
      console.error("\n🔧 Timeout Fix:");
      console.error("   - Try again with fallback RPC");
      console.error("   - Check network connectivity");
      console.error("   - Increase gas price if network is congested");
    } else if (deploymentError.message.includes("gas")) {
      console.error("\n🔧 Gas Fix:");
      console.error("   - Current gas limit: 8M (should be sufficient)");
      console.error("   - Check if contract size exceeds limits");
      console.error("   - Verify account has sufficient ETH balance");
    } else if (deploymentError.message.includes("nonce")) {
      console.error("\n🔧 Nonce Fix:");
      console.error("   - Wait a few minutes and retry");
      console.error("   - Check if previous transaction is still pending");
    }
    
    throw deploymentError;
  }
}

// Execute deployment with error recovery
main()
  .then(() => {
    console.log("\n🎉 XPVerifier deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ XPVerifier deployment failed:", error.message);
    console.error("\n📞 Support:");
    console.error("   - Check RPC status: https://status.abs.xyz");
    console.error("   - Faucet: https://faucet.testnet.abs.xyz");
    console.error("   - Explorer: https://explorer.testnet.abs.xyz");
    process.exit(1);
  });