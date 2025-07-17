const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 Extracting wallet address from private key...");
  
  try {
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
      console.error("❌ No private key found in .env file");
      return;
    }
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey);
    const address = wallet.address;
    
    console.log("📋 Wallet Information:");
    console.log("======================");
    console.log(`Address: ${address}`);
    console.log(`Private Key: ${privateKey.substring(0, 10)}...${privateKey.substring(privateKey.length - 4)}`);
    
    console.log("\n🔗 To get test ETH:");
    console.log("1. Go to: https://faucet.testnet.abs.xyz");
    console.log(`2. Enter this address: ${address}`);
    console.log("3. Request test ETH");
    console.log("4. Wait for confirmation (1-2 minutes)");
    
    console.log("\n💰 Required amount: ~0.000013 ETH");
    console.log("   (Most faucets give 0.1-1 ETH, which is more than enough)");
    
  } catch (error) {
    console.error("❌ Error extracting address:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Failed to get address:", error);
    process.exit(1);
  }); 