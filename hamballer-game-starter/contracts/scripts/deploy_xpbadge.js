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
  console.log("🚀 Deploying XPBadge...");
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const XPBadge = await ethers.getContractFactory("XPBadge");
  const xpBadge = await XPBadge.deploy();
  await xpBadge.waitForDeployment();
  const address = await xpBadge.getAddress();
  console.log("✅ XPBadge deployed to:", address);

  saveFrontend("XPBadge", address);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exit(1);
});


