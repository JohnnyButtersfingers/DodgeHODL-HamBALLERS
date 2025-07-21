const { ethers } = require("hardhat");

async function main() {
  const xpBadgeAddress = process.env.XPBADGE_ADDRESS;
  const minterAddress = process.env.XPBADGE_MINTER_ADDRESS;

  if (!xpBadgeAddress || !minterAddress) {
    console.error("❌ Missing environment variables:");
    console.error("   XPBADGE_ADDRESS:", xpBadgeAddress ? "✅ Set" : "❌ Missing");
    console.error("   XPBADGE_MINTER_ADDRESS:", minterAddress ? "✅ Set" : "❌ Missing");
    process.exit(1);
  }

  console.log("🔧 Granting MINTER_ROLE...");
  console.log("   XPBadge Address:", xpBadgeAddress);
  console.log("   Minter Address:", minterAddress);

  const xpBadge = await ethers.getContractAt("XPBadge", xpBadgeAddress);
  
  // Use hardcoded role values to avoid ABI issues
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

  const hasRole = await xpBadge.hasRole(MINTER_ROLE, minterAddress);
  console.log(`📋 Before: Has MINTER_ROLE? ${hasRole}`);

  if (!hasRole) {
    console.log("🚀 Granting MINTER_ROLE...");
    const tx = await xpBadge.grantRole(MINTER_ROLE, minterAddress);
    console.log("   Transaction hash:", tx.hash);
    console.log("   Waiting for confirmation...");
    await tx.wait();
    console.log("✅ Transaction confirmed!");
  } else {
    console.log("✅ Already granted.");
  }

  // Re-verify
  const finalRole = await xpBadge.hasRole(MINTER_ROLE, minterAddress);
  console.log(`📋 After: Has MINTER_ROLE? ${finalRole}`);
  
  if (finalRole) {
    console.log("🎉 MINTER_ROLE successfully granted!");
  } else {
    console.log("❌ MINTER_ROLE grant failed!");
    process.exit(1);
  }
}

main().catch((error) => { 
  console.error("❌ Script failed:", error); 
  process.exit(1); 
}); 