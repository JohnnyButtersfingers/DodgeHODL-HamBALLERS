const { ethers, artifacts } = require("hardhat");
const fs = require("fs");
const path = require("path");

function saveFrontend(contractName, address) {
  const contractsPath = path.join(__dirname, "../../frontend/src/config/contracts.json");
  const abi = artifacts.readArtifactSync(contractName).abi;
  let data = {};
  if (fs.existsSync(contractsPath)) {
    data = JSON.parse(fs.readFileSync(contractsPath));
  }
  data[contractName] = { address, abi };
  fs.writeFileSync(contractsPath, JSON.stringify(data, null, 2));
  console.log(`📑 Saved ${contractName} data to ${contractsPath}`);
}

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
  const dbpAddr = await dbpToken.getAddress();
  console.log("✅ DBP Token deployed to:", dbpAddr);
  saveFrontend("DBPToken", dbpAddr);

  // Deploy Boost NFT
  console.log("\n🎁 Deploying Boost NFT...");
  const BoostNFT = await ethers.getContractFactory("BoostNFT");
  const boostNFT = await BoostNFT.deploy("https://api.hamballer.xyz/metadata/");
  await boostNFT.waitForDeployment();
  const boostAddr = await boostNFT.getAddress();
  console.log("✅ Boost NFT deployed to:", boostAddr);
  saveFrontend("BoostNFT", boostAddr);

  // Deploy XP Badge NFT
  console.log("\n🏅 Deploying XPBadge...");
  const XPBadge = await ethers.getContractFactory("XPBadge");
  const xpBadge = await XPBadge.deploy();
  await xpBadge.waitForDeployment();
  const badgeAddr = await xpBadge.getAddress();
  console.log("✅ XPBadge deployed to:", badgeAddr);
  saveFrontend("XPBadge", badgeAddr);

  // Deploy HODL Manager
  console.log("\n🎯 Deploying HODL Manager...");
  const HODLManager = await ethers.getContractFactory("HODLManager");
  const hodlManager = await HODLManager.deploy(
    await dbpToken.getAddress(),
    await boostNFT.getAddress()
  );
  await hodlManager.waitForDeployment();
  const hodlAddr = await hodlManager.getAddress();
  console.log("✅ HODL Manager deployed to:", hodlAddr);
  saveFrontend("HODLManager", hodlAddr);

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
  console.log("🏅 XPBadge:", await xpBadge.getAddress());
  console.log("🎯 HODL Manager:", await hodlManager.getAddress());
  console.log("");
  console.log("🔗 Add these to your .env file:");
  console.log(`DBP_TOKEN_ADDRESS=${await dbpToken.getAddress()}`);
  console.log(`BOOST_NFT_ADDRESS=${await boostNFT.getAddress()}`);
  console.log(`XP_BADGE_ADDRESS=${await xpBadge.getAddress()}`);
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
        address: await xpBadge.getAddress(),
        constructorArguments: [],
      });
      console.log("✅ XPBadge verified");
    } catch (error) {
      console.log("❌ XPBadge verification failed:", error.message);
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
