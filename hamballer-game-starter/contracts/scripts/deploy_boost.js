const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying BoostNFT...");
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const BoostNFT = await ethers.getContractFactory("BoostNFT");
  const boostNFT = await BoostNFT.deploy("https://api.hamballer.xyz/metadata/");
  await boostNFT.waitForDeployment();
  console.log("✅ BoostNFT deployed to:", await boostNFT.getAddress());
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exit(1);
});

