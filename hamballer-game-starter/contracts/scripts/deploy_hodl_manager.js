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
  console.log("🚀 Deploying HODLManager...");
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const HODLManager = await ethers.getContractFactory("HODLManager");
  const hodlManager = await HODLManager.deploy(
    process.env.DBP_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000",
    process.env.BOOST_NFT_ADDRESS || "0x0000000000000000000000000000000000000000"
  );
  await hodlManager.waitForDeployment();
  const address = await hodlManager.getAddress();
  console.log("✅ HODLManager deployed to:", address);

  saveFrontend("HODLManager", address);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exit(1);
});
