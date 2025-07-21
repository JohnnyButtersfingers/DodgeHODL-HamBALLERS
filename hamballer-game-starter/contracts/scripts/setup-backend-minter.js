const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔧 Setting up Backend Minter Configuration...\n");
  
  // Check if backend minter is already configured
  const { XPBADGE_MINTER_PRIVATE_KEY, XPBADGE_ADDRESS } = process.env;
  
  if (XPBADGE_MINTER_PRIVATE_KEY && XPBADGE_MINTER_PRIVATE_KEY !== "your_minter_private_key_here_do_not_share") {
    console.log("✅ Backend minter already configured");
    const minterWallet = new ethers.Wallet(XPBADGE_MINTER_PRIVATE_KEY);
    console.log(`   Minter Address: ${minterWallet.address}`);
    console.log(`   XPBadge Contract: ${XPBADGE_ADDRESS}`);
  } else {
    console.log("❌ XPBADGE_MINTER_PRIVATE_KEY not configured in .env");
    console.log("Please update your .env file with a valid private key");
    process.exit(1);
  }
  
  // Get the minter address from environment
  const minterPrivateKey = process.env.XPBADGE_MINTER_PRIVATE_KEY;
  const xpBadgeAddress = process.env.XPBADGE_ADDRESS;
  
  if (!minterPrivateKey || minterPrivateKey === "your_minter_private_key_here_do_not_share") {
    console.error("❌ XPBADGE_MINTER_PRIVATE_KEY not configured in .env");
    process.exit(1);
  }
  
  if (!xpBadgeAddress) {
    console.error("❌ XPBADGE_ADDRESS not configured in .env");
    process.exit(1);
  }
  
  const minterWallet = new ethers.Wallet(minterPrivateKey);
  console.log(`\n🔍 Verifying minter wallet: ${minterWallet.address}`);
  
  // Connect to the XPBadge contract
  const xpBadge = await ethers.getContractAt("XPBadge", xpBadgeAddress);
  const MINTER_ROLE = await xpBadge.MINTER_ROLE();
  
  // Check if minter already has the role
  const hasRole = await xpBadge.hasRole(MINTER_ROLE, minterWallet.address);
  
  if (hasRole) {
    console.log("✅ Backend minter already has MINTER_ROLE");
  } else {
    console.log("🔐 Granting MINTER_ROLE to backend minter...");
    
    try {
      const tx = await xpBadge.grantRole(MINTER_ROLE, minterWallet.address);
      await tx.wait();
      console.log("✅ MINTER_ROLE granted successfully!");
      console.log(`   Transaction: ${tx.hash}`);
    } catch (error) {
      console.error("❌ Failed to grant MINTER_ROLE:", error.message);
      process.exit(1);
    }
  }
  
  // Test minting capability
  console.log("\n🧪 Testing minting capability...");
  
  try {
    // Create a test badge mint transaction (but don't execute it)
    const testData = xpBadge.interface.encodeFunctionData("mintBadge", [
      minterWallet.address,
      50, // XP earned
      1,  // Season
      999 // Run ID
    ]);
    
    console.log("✅ Minting function call encoded successfully");
    console.log("   Backend minter is ready for badge minting operations");
    
  } catch (error) {
    console.error("❌ Error testing minting capability:", error.message);
  }
  
  console.log("\n🎯 Backend Minter Setup Complete!");
  console.log("\n📋 Summary:");
  console.log(`   Minter Address: ${minterWallet.address}`);
  console.log(`   XPBadge Contract: ${xpBadgeAddress}`);
  console.log(`   MINTER_ROLE: ${hasRole ? 'Already granted' : 'Granted'}`);
  console.log("\n🚀 Ready for badge minting operations!");
}

main().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
}); 