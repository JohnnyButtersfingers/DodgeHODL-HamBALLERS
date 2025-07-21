const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 XPVerifier Contract Status Check");
  console.log("===================================");

  try {
    // Get the contract address from environment or deployment file
    let contractAddress = process.env.XPVERIFIER_ADDRESS;
    
    if (!contractAddress) {
      // Try to read from deployment file
      const deploymentFile = path.join(__dirname, "../deployments/xpverifier_simple_deployment.json");
      if (fs.existsSync(deploymentFile)) {
        const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        contractAddress = deployment.contractAddress;
        console.log("📁 Contract address loaded from deployment file");
      }
    }

    if (!contractAddress) {
      throw new Error("Contract address not found. Please set XPVERIFIER_ADDRESS or deploy the contract first.");
    }

    console.log("📍 Contract Address:", contractAddress);
    console.log("🔗 Explorer:", `https://explorer.testnet.abs.xyz/address/${contractAddress}`);

    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("🌐 Network:", network.name, `(Chain ID: ${network.chainId})`);

    // Connect to the contract
    const XPVerifier = await ethers.getContractFactory("XPVerifierSimple");
    const contract = XPVerifier.attach(contractAddress);

    console.log("\n📊 Contract Status:");
    console.log("==================");

    // Check basic contract info
    try {
      const owner = await contract.owner();
      console.log("👤 Owner:", owner);
    } catch (error) {
      console.log("❌ Could not read owner:", error.message);
    }

    try {
      const threshold = await contract.getThreshold();
      console.log("🎯 Threshold:", threshold.toString(), "XP");
    } catch (error) {
      console.log("❌ Could not read threshold:", error.message);
    }

    // Test nullifier functionality
    console.log("\n🧪 Functionality Tests:");
    console.log("=======================");

    const testNullifier = ethers.keccak256(ethers.toUtf8Bytes("test_status_check_" + Date.now()));
    
    try {
      const isUsed = await contract.isNullifierUsed(testNullifier);
      console.log("✅ Nullifier check:", isUsed ? "Used (unexpected)" : "Available");
    } catch (error) {
      console.log("❌ Nullifier check failed:", error.message);
    }

    // Check recent events
    console.log("\n📋 Recent Events:");
    console.log("=================");

    try {
      // Get recent XPProofVerified events
      const currentBlock = await ethers.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000); // Last 1000 blocks

      const proofEvents = await contract.queryFilter(
        contract.filters.XPProofVerified(),
        fromBlock,
        currentBlock
      );

      console.log(`🔍 Proof verification events (last 1000 blocks): ${proofEvents.length}`);
      
      if (proofEvents.length > 0) {
        proofEvents.slice(-5).forEach((event, index) => {
          console.log(`  ${index + 1}. Player: ${event.args.player}`);
          console.log(`     XP: ${event.args.claimedXP.toString()}`);
          console.log(`     Verified: ${event.args.verified}`);
          console.log(`     Block: ${event.blockNumber}`);
        });
      }

      // Get threshold update events
      const thresholdEvents = await contract.queryFilter(
        contract.filters.ThresholdUpdated(),
        fromBlock,
        currentBlock
      );

      console.log(`🎯 Threshold update events: ${thresholdEvents.length}`);
      
      if (thresholdEvents.length > 0) {
        thresholdEvents.slice(-3).forEach((event, index) => {
          console.log(`  ${index + 1}. Old: ${event.args.oldThreshold.toString()}`);
          console.log(`     New: ${event.args.newThreshold.toString()}`);
          console.log(`     Block: ${event.blockNumber}`);
        });
      }

    } catch (error) {
      console.log("❌ Could not fetch events:", error.message);
    }

    // Gas estimation
    console.log("\n⛽ Gas Estimates:");
    console.log("=================");

    try {
      // Estimate gas for proof verification
      const testProof = [
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "0x2345678901bcdef02345678901bcdef02345678901bcdef02345678901bcdef0",
        "0x3456789012cdef013456789012cdef013456789012cdef013456789012cdef01",
        "0x456789023def0124456789023def0124456789023def0124456789023def0124",
        "0x56789034ef012345567890234ef012345678903def012345678903def012345",
        "0x6789045f0123456789045f0123456789045f0123456789045f01234567890456",
        "0x789056012345678901234567890123456789012345678901234567890123456",
        "0x89067123456789012345678901234567890123456789012345678901234567"
      ];

      const testCommitment = ethers.keccak256(ethers.toUtf8Bytes("test_commitment"));
      const testNullifierNew = ethers.keccak256(ethers.toUtf8Bytes("gas_test_" + Date.now()));
      
      const gasEstimate = await contract.verifyXPProof.estimateGas(
        testNullifierNew,
        testCommitment,
        testProof,
        75,
        50
      );

      console.log("💰 Proof verification gas:", gasEstimate.toString());

      // Get current gas price
      const feeData = await ethers.provider.getFeeData();
      const gasCost = gasEstimate * feeData.gasPrice;
      console.log("💸 Estimated cost:", ethers.formatEther(gasCost), "ETH");

    } catch (error) {
      console.log("❌ Gas estimation failed:", error.message);
    }

    // Contract code verification
    console.log("\n🔧 Contract Verification:");
    console.log("=========================");

    try {
      const code = await ethers.provider.getCode(contractAddress);
      const codeSize = (code.length - 2) / 2; // Remove 0x and convert hex to bytes
      console.log("📄 Contract code size:", codeSize, "bytes");
      console.log("✅ Contract deployed:", code !== "0x" ? "Yes" : "No");
    } catch (error) {
      console.log("❌ Code verification failed:", error.message);
    }

    console.log("\n🎉 Status Check Complete!");
    console.log("=========================");

    return {
      contractAddress,
      status: "deployed",
      network: network.name,
      chainId: network.chainId.toString()
    };

  } catch (error) {
    console.error("❌ Status check failed:", error.message);
    
    if (error.message.includes("could not detect network")) {
      console.error("🌐 Network connection issue. Please check your RPC URL.");
    } else if (error.message.includes("Contract address not found")) {
      console.error("📍 Contract not deployed or address not configured.");
      console.log("💡 Run deployment script: npx hardhat run scripts/deploy_xpverifier_simple.js --network abstract");
    } else if (error.code === 'CALL_EXCEPTION') {
      console.error("📞 Contract call failed. The contract may not be deployed or the ABI may be incorrect.");
    }
    
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Script execution failed:", error);
      process.exit(1);
    });
}

module.exports = main;