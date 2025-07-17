const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Estimating gas cost for XPBadge deployment...");

  try {
    // Get the contract factory
    const XPBadge = await ethers.getContractFactory("XPBadge");
    
    // Get the deployment data
    const deploymentData = XPBadge.interface.encodeDeploy();
    
    // Get current gas price
    const gasPrice = await ethers.provider.getFeeData();
    const currentGasPrice = gasPrice.gasPrice;
    
    // Estimate gas limit
    const gasLimit = await ethers.provider.estimateGas({
      data: deploymentData,
      from: (await ethers.getSigners())[0].address
    });
    
    // Calculate total cost
    const totalCost = gasLimit * currentGasPrice;
    const totalCostInEth = ethers.formatEther(totalCost);
    
    console.log("📊 Gas Estimation Results:");
    console.log("==========================");
    console.log(`Gas Limit: ${gasLimit.toString()}`);
    console.log(`Gas Price: ${ethers.formatUnits(currentGasPrice, "gwei")} gwei`);
    console.log(`Total Cost: ${totalCostInEth} ETH`);
    console.log(`Total Cost (Wei): ${totalCost.toString()}`);
    
    // Recommend amount
    const recommendedAmount = totalCostInEth * 1.2; // 20% buffer
    console.log(`\n💡 Recommended wallet balance: ${recommendedAmount.toFixed(6)} ETH`);
    console.log(`   (This includes a 20% buffer for gas price fluctuations)`);
    
  } catch (error) {
    console.error("❌ Error estimating gas:", error.message);
    
    // Fallback estimation based on typical ERC-1155 deployment
    console.log("\n📋 Fallback Estimation (based on typical ERC-1155):");
    console.log("Gas Limit: ~800,000");
    console.log("Gas Price: ~1 gwei");
    console.log("Estimated Cost: ~0.0008 ETH");
    console.log("Recommended: ~0.001 ETH (with buffer)");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Gas estimation failed:", error);
    process.exit(1);
  }); 