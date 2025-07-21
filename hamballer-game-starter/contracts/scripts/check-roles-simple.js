const { ethers } = require("hardhat");

async function main() {
  const xpBadgeAddress = process.env.XPBADGE_ADDRESS;
  const minterAddress = process.env.XPBADGE_MINTER_ADDRESS;
  const deployerAddress = "0xdAc1428c8268Cb2A8692d9c88d96878C6B9F0388";

  if (!xpBadgeAddress) {
    console.error("❌ Missing XPBADGE_ADDRESS");
    process.exit(1);
  }

  console.log("🔍 Checking XPBadge roles...");
  console.log("   XPBadge Address:", xpBadgeAddress);
  console.log("   Minter Address:", minterAddress);
  console.log("   Deployer Address:", deployerAddress);

  // Use hardcoded role values to avoid ABI issues
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash; // 0x0000000000000000000000000000000000000000000000000000000000000000

  console.log("\n📋 Role Values:");
  console.log("   MINTER_ROLE:", MINTER_ROLE);
  console.log("   DEFAULT_ADMIN_ROLE:", DEFAULT_ADMIN_ROLE);

  const xpBadge = await ethers.getContractAt("XPBadge", xpBadgeAddress);

  const deployerHasAdmin = await xpBadge.hasRole(DEFAULT_ADMIN_ROLE, deployerAddress);
  const minterHasRole = minterAddress ? await xpBadge.hasRole(MINTER_ROLE, minterAddress) : false;
  const deployerHasMinter = await xpBadge.hasRole(MINTER_ROLE, deployerAddress);

  console.log("\n👤 Role Assignments:");
  console.log(`   Deployer (${deployerAddress}):`);
  console.log(`     - DEFAULT_ADMIN_ROLE: ${deployerHasAdmin}`);
  console.log(`     - MINTER_ROLE: ${deployerHasMinter}`);
  if (minterAddress) {
    console.log(`   Minter (${minterAddress}):`);
    console.log(`     - MINTER_ROLE: ${minterHasRole}`);
  }

  if (minterHasRole) {
    console.log("\n✅ MINTER_ROLE is already granted to the minter address!");
  } else {
    console.log("\n❌ MINTER_ROLE is not granted to the minter address.");
    console.log("   You need the deployer's private key to grant this role.");
  }

  return {
    deployerHasAdmin,
    minterHasRole,
    deployerHasMinter
  };
}

main().catch((error) => { 
  console.error("❌ Script failed:", error); 
  process.exit(1); 
}); 