const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 Checking XP Contracts on Abstract Testnet...\n");
  
  // Contract addresses from deployment
  const XPBADGE_ADDRESS = "0xE960B46dffd9de6187Ff1B48B31B3F186A07303b";
  const XPVERIFIER_ADDRESS = "0x5e33911d9c793e5E9172D9e5C4354e21350403E3";
  
  try {
    // Get signer and provider
    const [signer] = await ethers.getSigners();
    const provider = signer.provider;
    
    console.log(`📍 Checking with address: ${signer.address}`);
    
    // Check if contracts have code
    console.log("\n1️⃣ Checking XPBadge Contract...");
    const xpBadgeCode = await provider.getCode(XPBADGE_ADDRESS);
    
    if (xpBadgeCode !== "0x") {
      console.log(`   ✅ Contract has code at ${XPBADGE_ADDRESS}`);
      console.log(`   📊 Code size: ${xpBadgeCode.length} bytes`);
    } else {
      console.log(`   ❌ No contract found at ${XPBADGE_ADDRESS}`);
    }
    
    console.log("\n2️⃣ Checking XPVerifier Contract...");
    const xpVerifierCode = await provider.getCode(XPVERIFIER_ADDRESS);
    
    if (xpVerifierCode !== "0x") {
      console.log(`   ✅ Contract has code at ${XPVERIFIER_ADDRESS}`);
      console.log(`   📊 Code size: ${xpVerifierCode.length} bytes`);
    } else {
      console.log(`   ❌ No contract found at ${XPVERIFIER_ADDRESS}`);
    }
    
    // Check environment variables
    console.log("\n3️⃣ Checking Environment Variables...");
    const envXPBadge = process.env.XPBADGE_ADDRESS;
    const envXPVerifier = process.env.XPVERIFIER_ADDRESS;
    
    console.log(`   Backend XPBADGE_ADDRESS: ${envXPBadge}`);
    console.log(`   Backend XPVERIFIER_ADDRESS: ${envXPVerifier}`);
    
    if (envXPBadge === XPBADGE_ADDRESS) {
      console.log("   ✅ Backend XPBADGE_ADDRESS matches deployment");
    } else {
      console.log("   ❌ Backend XPBADGE_ADDRESS mismatch");
    }
    
    if (envXPVerifier === XPVERIFIER_ADDRESS) {
      console.log("   ✅ Backend XPVERIFIER_ADDRESS matches deployment");
    } else {
      console.log("   ❌ Backend XPVERIFIER_ADDRESS mismatch");
    }
    
    // Check frontend environment variables
    console.log("\n4️⃣ Checking Frontend Environment Variables...");
    console.log("   Frontend .env file should contain:");
    console.log(`   VITE_XPBADGE_ADDRESS=${XPBADGE_ADDRESS}`);
    console.log(`   VITE_XPVERIFIER_ADDRESS=${XPVERIFIER_ADDRESS}`);
    
    console.log("\n✅ Contract check complete!");
    console.log("\n📝 Summary:");
    console.log(`   XPBadge: ${XPBADGE_ADDRESS}`);
    console.log(`   XPVerifier: ${XPVERIFIER_ADDRESS}`);
    
    if (xpBadgeCode !== "0x" && xpVerifierCode !== "0x") {
      console.log("\n🎯 Contracts are deployed and ready for use!");
    } else {
      console.log("\n⚠️  Some contracts may not be deployed properly");
    }
    
  } catch (error) {
    console.error("❌ Check failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Check failed:", error);
    process.exit(1);
  }); 