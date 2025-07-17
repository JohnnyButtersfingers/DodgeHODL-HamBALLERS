const { ethers } = require("hardhat");

async function main() {
  console.log("🏆 Deploying XPBadge contract...");

  // Get the contract factory
  const XPBadge = await ethers.getContractFactory("XPBadge");
  
  // Deploy the contract
  const xpBadge = await XPBadge.deploy();
  
  // Wait for deployment to complete
  await xpBadge.waitForDeployment();
  
  const address = await xpBadge.getAddress();
  console.log("✅ XPBadge deployed to:", address);

  // Verify deployment by checking total badges
  const totalBadges = await xpBadge.getTotalBadges();
  console.log("📊 Total badges created:", totalBadges.toString());

  // Display badge information
  for (let i = 1; i <= totalBadges; i++) {
    const badgeInfo = await xpBadge.getBadgeInfo(i);
    console.log(`🎖️ Badge ${i}: ${badgeInfo.name} (${badgeInfo.xpRequired} XP)`);
  }

  // Save deployment info
  const deploymentInfo = {
    xpBadge: address,
    network: "abstract-testnet",
    deployer: (await ethers.getSigners())[0].address,
    timestamp: new Date().toISOString(),
    totalBadges: totalBadges.toString()
  };

  console.log("\n📋 Deployment Summary:");
  console.log("========================");
  console.log("Contract: XPBadge");
  console.log("Address:", address);
  console.log("Network: Abstract Testnet");
  console.log("Deployer:", deploymentInfo.deployer);
  console.log("Total Badges:", totalBadges.toString());
  console.log("Timestamp:", deploymentInfo.timestamp);

  // Instructions for next steps
  console.log("\n📝 Next Steps:");
  console.log("===============");
  console.log("1. Add XP_BADGE_ADDRESS to backend/.env:");
  console.log(`   XP_BADGE_ADDRESS=${address}`);
  console.log("\n2. Add VITE_XP_BADGE_ADDRESS to frontend/.env:");
  console.log(`   VITE_XP_BADGE_ADDRESS=${address}`);
  console.log("\n3. Update deployment-info.json with the new address");
  console.log("\n4. Test badge minting with RunCompleted events");

  return deploymentInfo;
}

main()
  .then((deploymentInfo) => {
    console.log("\n🎉 XPBadge deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ XPBadge deployment failed:", error);
    process.exit(1);
  }); 