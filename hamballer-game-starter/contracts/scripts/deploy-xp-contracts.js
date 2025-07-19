const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting XP Contracts deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy XPVerifier
  console.log("\n🔍 Deploying XPVerifier...");
  const XPVerifier = await ethers.getContractFactory("XPVerifier");
  const xpVerifier = await XPVerifier.deploy(100); // 100 XP threshold
  await xpVerifier.waitForDeployment();
  console.log("✅ XPVerifier deployed to:", await xpVerifier.getAddress());

  // Deploy XPBadge
  console.log("\n🏆 Deploying XPBadge...");
  const XPBadge = await ethers.getContractFactory("XPBadge");
  const xpBadge = await XPBadge.deploy("https://api.hamballer.xyz/metadata/badges/");
  await xpBadge.waitForDeployment();
  console.log("✅ XPBadge deployed to:", await xpBadge.getAddress());

  // Set up permissions - Grant XPVerifier the ability to mint badges
  console.log("\n🔐 Setting up contract permissions...");
  await xpBadge.grantMinterRole(await xpVerifier.getAddress());
  console.log("✅ Granted MINTER_ROLE to XPVerifier for badges");

  // Contract addresses summary
  console.log("\n🎮 === XP Contracts Deployment Summary ===");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);
  console.log("");
  console.log("🔍 XPVerifier:", await xpVerifier.getAddress());
  console.log("🏆 XPBadge:", await xpBadge.getAddress());
  console.log("");
  console.log("🔗 Add these to your .env.local file:");
  console.log(`VITE_XPVERIFIER_ADDRESS=${await xpVerifier.getAddress()}`);
  console.log(`VITE_XPBADGE_ADDRESS=${await xpBadge.getAddress()}`);

  // Export contract data to frontend
  console.log("\n📄 Exporting XP contract data to frontend...");
  await exportXPContractsToFrontend({
    xpVerifier: {
      address: await xpVerifier.getAddress(),
      contract: XPVerifier
    },
    xpBadge: {
      address: await xpBadge.getAddress(),
      contract: XPBadge
    }
  });
  
  // Verify contracts on block explorer (if not localhost)
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337n) {
    console.log("\n⏳ Waiting before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s
    
    try {
      await hre.run("verify:verify", {
        address: await xpVerifier.getAddress(),
        constructorArguments: [100],
      });
      console.log("✅ XPVerifier verified");
    } catch (error) {
      console.log("❌ XPVerifier verification failed:", error.message);
    }
    
    try {
      await hre.run("verify:verify", {
        address: await xpBadge.getAddress(),
        constructorArguments: ["https://api.hamballer.xyz/metadata/badges/"],
      });
      console.log("✅ XPBadge verified");
    } catch (error) {
      console.log("❌ XPBadge verification failed:", error.message);
    }
  }
  
  console.log("\n🎉 XP Contracts deployment complete!");
  
  // Return deployed addresses for immediate use
  return {
    xpVerifier: await xpVerifier.getAddress(),
    xpBadge: await xpBadge.getAddress()
  };
}

/**
 * Export XP contract addresses and ABIs to frontend config
 */
async function exportXPContractsToFrontend(contracts) {
  try {
    const network = await ethers.provider.getNetwork();
    
    const xpContractsData = {
      network: {
        name: network.name,
        chainId: Number(network.chainId)
      },
      timestamp: new Date().toISOString(),
      contracts: {
        XPVerifier: {
          address: contracts.xpVerifier.address,
          abi: contracts.xpVerifier.contract.interface.fragments.map(f => f.format('json')).map(JSON.parse)
        },
        XPBadge: {
          address: contracts.xpBadge.address,
          abi: contracts.xpBadge.contract.interface.fragments.map(f => f.format('json')).map(JSON.parse)
        }
      }
    };

    // Write to frontend config directory
    const frontendConfigPath = path.join(__dirname, "../../frontend/src/config");
    const xpContractsJsonPath = path.join(frontendConfigPath, "xp-contracts.json");
    
    // Ensure the directory exists
    if (!fs.existsSync(frontendConfigPath)) {
      fs.mkdirSync(frontendConfigPath, { recursive: true });
    }
    
    fs.writeFileSync(xpContractsJsonPath, JSON.stringify(xpContractsData, null, 2));
    console.log("✅ xp-contracts.json exported to:", xpContractsJsonPath);
    
    // Also update or create a combined contracts.json with XP contracts
    const contractsJsonPath = path.join(frontendConfigPath, "contracts.json");
    let existingContracts = {};
    
    if (fs.existsSync(contractsJsonPath)) {
      try {
        existingContracts = JSON.parse(fs.readFileSync(contractsJsonPath, 'utf8'));
      } catch (error) {
        console.log("⚠️ Could not read existing contracts.json, creating new one");
      }
    }
    
    // Merge XP contracts with existing contracts
    const mergedContracts = {
      ...existingContracts,
      network: xpContractsData.network,
      timestamp: xpContractsData.timestamp,
      contracts: {
        ...existingContracts.contracts,
        ...xpContractsData.contracts
      }
    };
    
    fs.writeFileSync(contractsJsonPath, JSON.stringify(mergedContracts, null, 2));
    console.log("✅ Updated contracts.json with XP contracts");
    
  } catch (error) {
    console.error("❌ Failed to export XP contracts data:", error);
  }
}

// Only run if this script is called directly
if (require.main === module) {
  main()
    .then((addresses) => {
      console.log("\n📋 DEPLOYED CONTRACT ADDRESSES:");
      console.log("=====================================");
      console.log(`XPVerifier: ${addresses.xpVerifier}`);
      console.log(`XPBadge: ${addresses.xpBadge}`);
      console.log("=====================================");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ XP Contracts deployment failed:", error);
      process.exit(1);
    });
}

module.exports = main;