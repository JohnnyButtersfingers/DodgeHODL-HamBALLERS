const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

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

  // Deploy XP Badge
  console.log("\n🏆 Deploying XP Badge...");
  const XPBadge = await ethers.getContractFactory("XPBadge");
  const xpBadge = await XPBadge.deploy();
  await xpBadge.waitForDeployment();
  console.log("✅ XP Badge deployed to:", await xpBadge.getAddress());

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

  // Display XP Badge information
  console.log("\n🏆 XP Badge Information:");
  const totalBadges = await xpBadge.getTotalBadges();
  console.log("📊 Total badges created:", totalBadges.toString());
  for (let i = 1; i <= totalBadges; i++) {
    const badgeInfo = await xpBadge.getBadgeInfo(i);
    console.log(`🎖️ Badge ${i}: ${badgeInfo.name} (${badgeInfo.xpRequired} XP)`);
  }

  // Contract addresses summary
  console.log("\n🎮 === HamBaller.xyz Deployment Summary ===");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);
  console.log("");
  console.log("📗 DBP Token:", await dbpToken.getAddress());
  console.log("🎁 Boost NFT:", await boostNFT.getAddress());
  console.log("🏆 XP Badge:", await xpBadge.getAddress());
  console.log("🎯 HODL Manager:", await hodlManager.getAddress());
  console.log("");
  console.log("🔗 Add these to your .env file:");
  console.log(`DBP_TOKEN_ADDRESS=${await dbpToken.getAddress()}`);
  console.log(`BOOST_NFT_ADDRESS=${await boostNFT.getAddress()}`);
  console.log(`XP_BADGE_ADDRESS=${await xpBadge.getAddress()}`);
  console.log(`HODL_MANAGER_ADDRESS=${await hodlManager.getAddress()}`);

  // Export contract data to frontend
  console.log("\n📄 Exporting contract data to frontend...");
  await exportContractsToFrontend({
    dbpToken: {
      address: await dbpToken.getAddress(),
      contract: DBPToken
    },
    boostNFT: {
      address: await boostNFT.getAddress(),
      contract: BoostNFT
    },
    hodlManager: {
      address: await hodlManager.getAddress(),
      contract: HODLManager
    }
  });
  
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
      console.log("✅ XP Badge verified");
    } catch (error) {
      console.log("❌ XP Badge verification failed:", error.message);
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

/**
 * Export contract addresses and ABIs to frontend config
 */
async function exportContractsToFrontend(contracts) {
  try {
    const network = await ethers.provider.getNetwork();
    
    const contractsData = {
      network: {
        name: network.name,
        chainId: Number(network.chainId)
      },
      timestamp: new Date().toISOString(),
      contracts: {
        DBPToken: {
          address: contracts.dbpToken.address,
          abi: contracts.dbpToken.contract.interface.fragments.map(f => f.format('json')).map(JSON.parse)
        },
        BoostNFT: {
          address: contracts.boostNFT.address,
          abi: contracts.boostNFT.contract.interface.fragments.map(f => f.format('json')).map(JSON.parse)
        },
        HODLManager: {
          address: contracts.hodlManager.address,
          abi: contracts.hodlManager.contract.interface.fragments.map(f => f.format('json')).map(JSON.parse)
        }
      }
    };

    // Write to frontend config directory
    const frontendConfigPath = path.join(__dirname, "../../frontend/src/config");
    const contractsJsonPath = path.join(frontendConfigPath, "contracts.json");
    
    // Ensure the directory exists
    if (!fs.existsSync(frontendConfigPath)) {
      fs.mkdirSync(frontendConfigPath, { recursive: true });
    }
    
    fs.writeFileSync(contractsJsonPath, JSON.stringify(contractsData, null, 2));
    console.log("✅ contracts.json exported to:", contractsJsonPath);
    
    // Also write a TypeScript declarations file for better development experience
    const contractsTypesPath = path.join(frontendConfigPath, "contracts.d.ts");
    const typesContent = `// Auto-generated contract types
export interface ContractData {
  network: {
    name: string;
    chainId: number;
  };
  timestamp: string;
  contracts: {
    DBPToken: {
      address: string;
      abi: any[];
    };
    BoostNFT: {
      address: string;
      abi: any[];
    };
    HODLManager: {
      address: string;
      abi: any[];
    };
  };
}

declare const contracts: ContractData;
export default contracts;
`;
    
    fs.writeFileSync(contractsTypesPath, typesContent);
    console.log("✅ contracts.d.ts exported to:", contractsTypesPath);
    
  } catch (error) {
    console.error("❌ Failed to export contracts data:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
