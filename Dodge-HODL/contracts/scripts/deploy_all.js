const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting HamBaller.xyz contract deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy DBP Token
  console.log("\n📗 Deploying DBP Token...");
  const DBPToken = await ethers.getContractFactory("DBPToken");
  const dbpToken = await DBPToken.deploy(
    "Dodge Ball Points", // name
    "DBP",               // symbol
    ethers.parseEther("1000000") // initial supply: 1M tokens
  );
  await dbpToken.waitForDeployment();
  console.log("✅ DBP Token deployed to:", await dbpToken.getAddress());

  // Deploy Boost NFT
  console.log("\n🎁 Deploying Boost NFT...");
  const BoostNFT = await ethers.getContractFactory("BoostNFT");
  const boostNFT = await BoostNFT.deploy("https://api.hamballer.xyz/metadata/");
  await boostNFT.waitForDeployment();
  console.log("✅ Boost NFT deployed to:", await boostNFT.getAddress());

  // Deploy HODL Manager
  console.log("\n🎯 Deploying HODL Manager...");
  const HODLManager = await ethers.getContractFactory("HODLManager");
  const hodlManager = await HODLManager.deploy(
    await dbpToken.getAddress(),
    await boostNFT.getAddress()
  );
  await hodlManager.waitForDeployment();
  console.log("✅ HODL Manager deployed to:", await hodlManager.getAddress());

  // Set up permissions
  console.log("\n🔐 Setting up contract permissions...");
  
  // Give HODL Manager minting rights for DBP tokens
  await dbpToken.grantRole(await dbpToken.MINTER_ROLE(), await hodlManager.getAddress());
  console.log("✅ Granted MINTER_ROLE to HODL Manager");
  
  // Give HODL Manager minting rights for Boost NFTs
  await boostNFT.grantRole(await boostNFT.MINTER_ROLE(), await hodlManager.getAddress());
  console.log("✅ Granted MINTER_ROLE to HODL Manager for NFTs");

  // Contract addresses summary
  console.log("\n🎮 === HamBaller.xyz Deployment Summary ===");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);
  console.log("");
  console.log("📗 DBP Token:", await dbpToken.getAddress());
  console.log("🎁 Boost NFT:", await boostNFT.getAddress());
  console.log("🎯 HODL Manager:", await hodlManager.getAddress());
  console.log("");
  console.log("🔗 Add these to your .env file:");
  console.log(`DBP_TOKEN_ADDRESS=${await dbpToken.getAddress()}`);
  console.log(`BOOST_NFT_ADDRESS=${await boostNFT.getAddress()}`);
  console.log(`HODL_MANAGER_ADDRESS=${await hodlManager.getAddress()}`);
  
  // Verify contracts on block explorer (if not localhost)
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337n) {
    console.log("\n⏳ Waiting before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s
    
    try {
      await hre.run("verify:verify", {
        address: await dbpToken.getAddress(),
        constructorArguments: ["Dodge Ball Points", "DBP", ethers.parseEther("1000000")],
      });
      console.log("✅ DBP Token verified");
    } catch (error) {
      console.log("❌ DBP Token verification failed:", error.message);
    }
    
    try {
      await hre.run("verify:verify", {
        address: await boostNFT.getAddress(),
        constructorArguments: ["https://api.hamballer.xyz/metadata/"],
      });
      console.log("✅ Boost NFT verified");
    } catch (error) {
      console.log("❌ Boost NFT verification failed:", error.message);
    }
    
    try {
      await hre.run("verify:verify", {
        address: await hodlManager.getAddress(),
        constructorArguments: [await dbpToken.getAddress(), await boostNFT.getAddress()],
      });
      console.log("✅ HODL Manager verified");
    } catch (error) {
      console.log("❌ HODL Manager verification failed:", error.message);
    }
  }
  
  console.log("\n🎉 Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
