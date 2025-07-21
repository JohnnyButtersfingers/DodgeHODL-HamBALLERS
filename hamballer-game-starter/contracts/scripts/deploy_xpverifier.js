const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting XPVerifier deployment on Abstract Testnet...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📋 Deploying contracts with account: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);

  // RPC fallback configuration
  const rpcUrls = [
    "https://api.testnet.abs.xyz",
    "https://rpc.abstract.xyz"
  ];
  
  let currentRpcIndex = 0;
  let provider = deployer.provider;
  
  // Function to switch RPC if needed
  const switchRpc = async () => {
    currentRpcIndex = (currentRpcIndex + 1) % rpcUrls.length;
    const newRpcUrl = rpcUrls[currentRpcIndex];
    console.log(`🔄 Switching to RPC: ${newRpcUrl}`);
    
    try {
      provider = new ethers.JsonRpcProvider(newRpcUrl);
      await provider.getNetwork(); // Test connection
      return true;
    } catch (error) {
      console.error(`❌ Failed to connect to ${newRpcUrl}:`, error.message);
      return false;
    }
  };

  try {
    // Deploy XPVerifier contract
    console.log("📦 Deploying XPVerifier contract...");
    
    const XPVerifier = await ethers.getContractFactory("XPVerifier");
    const xpVerifier = await XPVerifier.deploy({
      gasLimit: 8000000, // 8M gas limit as specified
      gasPrice: await provider.getFeeData().then(fee => fee.gasPrice)
    });
    
    console.log(`⏳ XPVerifier deployment transaction: ${xpVerifier.deploymentTransaction().hash}`);
    
    // Wait for deployment with timeout and retry logic
    let deployed = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!deployed && attempts < maxAttempts) {
      try {
        await xpVerifier.waitForDeployment();
        deployed = true;
        console.log("✅ XPVerifier deployed successfully!");
      } catch (error) {
        attempts++;
        console.error(`❌ Deployment attempt ${attempts} failed:`, error.message);
        
        if (attempts < maxAttempts) {
          console.log("🔄 Retrying deployment...");
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          
          // Try switching RPC if deployment fails
          if (await switchRpc()) {
            // Recreate contract factory with new provider
            const XPVerifier = await ethers.getContractFactory("XPVerifier");
            xpVerifier = await XPVerifier.deploy({
              gasLimit: 8000000,
              gasPrice: await provider.getFeeData().then(fee => fee.gasPrice)
            });
          }
        }
      }
    }
    
    if (!deployed) {
      throw new Error("Failed to deploy XPVerifier after multiple attempts");
    }
    
    const xpVerifierAddress = await xpVerifier.getAddress();
    console.log(`📍 XPVerifier deployed to: ${xpVerifierAddress}`);
    
    // Post-deploy role grants
    console.log("🔐 Setting up post-deploy role grants...");
    
    // Grant MINTER_ROLE to backend service (if XPBadge exists)
    try {
      const XPBadge = await ethers.getContractFactory("XPBadge");
      const xpBadgeAddress = process.env.XP_BADGE_ADDRESS;
      
      if (xpBadgeAddress) {
        const xpBadge = XPBadge.attach(xpBadgeAddress);
        const MINTER_ROLE = await xpBadge.MINTER_ROLE();
        
        console.log(`🎖️ Granting MINTER_ROLE to XPVerifier...`);
        const grantTx = await xpBadge.grantRole(MINTER_ROLE, xpVerifierAddress);
        await grantTx.wait();
        console.log("✅ MINTER_ROLE granted successfully!");
      }
    } catch (error) {
      console.warn("⚠️ Could not grant MINTER_ROLE (XPBadge not found or already granted):", error.message);
    }
    
    // Save deployment info
    const deploymentInfo = {
      network: "abstract-testnet",
      chainId: 11124,
      contracts: {
        XPVerifier: {
          address: xpVerifierAddress,
          deployer: deployer.address,
          transactionHash: xpVerifier.deploymentTransaction().hash,
          timestamp: new Date().toISOString(),
          gasLimit: 8000000,
          rpcUrl: rpcUrls[currentRpcIndex]
        }
      },
      deployment: {
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        gasUsed: await xpVerifier.deploymentTransaction().wait().then(receipt => receipt.gasUsed.toString()),
        blockNumber: await xpVerifier.deploymentTransaction().wait().then(receipt => receipt.blockNumber)
      }
    };
    
    // Save to deployments directory
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentsDir, `xpverifier-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`💾 Deployment info saved to: ${deploymentFile}`);
    
    // Update environment variables
    const envFile = path.join(__dirname, "../../.env");
    if (fs.existsSync(envFile)) {
      let envContent = fs.readFileSync(envFile, 'utf8');
      
      // Update or add XP_VERIFIER_ADDRESS
      if (envContent.includes('XP_VERIFIER_ADDRESS=')) {
        envContent = envContent.replace(
          /XP_VERIFIER_ADDRESS=.*/,
          `XP_VERIFIER_ADDRESS=${xpVerifierAddress}`
        );
      } else {
        envContent += `\nXP_VERIFIER_ADDRESS=${xpVerifierAddress}`;
      }
      
      fs.writeFileSync(envFile, envContent);
      console.log("✅ Environment variables updated");
    }
    
    // Verify contract on explorer
    console.log("🔍 Verifying contract on Abstract Explorer...");
    try {
      await hre.run("verify:verify", {
        address: xpVerifierAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.warn("⚠️ Contract verification failed:", error.message);
    }
    
    console.log("\n🎉 XPVerifier deployment completed successfully!");
    console.log(`📍 Contract Address: ${xpVerifierAddress}`);
    console.log(`🔗 Explorer: https://explorer.testnet.abs.xyz/address/${xpVerifierAddress}`);
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    
    // Try to get more detailed error information
    if (error.cause) {
      console.error("🔍 Error cause:", error.cause);
    }
    if (error.stack) {
      console.error("📚 Error stack:", error.stack);
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

module.exports = { main };