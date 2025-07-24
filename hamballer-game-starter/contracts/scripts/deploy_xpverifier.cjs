const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying XPVerifier contract...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy XPVerifier
  const XPVerifier = await ethers.getContractFactory("XPVerifier");
  const xpVerifier = await XPVerifier.deploy();
  
  console.log("⏳ Waiting for XPVerifier deployment...");
  await xpVerifier.waitForDeployment();
  
  const address = await xpVerifier.getAddress();
  console.log("✅ XPVerifier deployed to:", address);
  
  // Verify deployment
  const version = await xpVerifier.getVersion();
  console.log("📋 Contract version:", version);
  
  // Get deployment transaction
  const deploymentTx = xpVerifier.deploymentTransaction();
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    xpVerifier: address,
    timestamp: new Date().toISOString(),
    blockNumber: deploymentTx ? deploymentTx.blockNumber : null
  };
  
  console.log("📊 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // Create deployments directory if it doesn't exist
  if (!fs.existsSync('./deployments')) {
    fs.mkdirSync('./deployments');
  }
  
  // Save to file
  const deploymentPath = `./deployments/xpverifier-${hre.network.name}.json`;
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to:", deploymentPath);
  
  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });