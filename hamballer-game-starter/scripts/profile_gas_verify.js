const { ethers } = require("hardhat");
const chalk = require("chalk");

// Gas profiling and optimization for XP verification system
async function profileGasUsage() {
  console.log(chalk.bold.cyan("\n🔍 Gas Profiling for XP Verification System\n"));
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  // Deploy contracts for testing
  console.log(chalk.yellow("\n📦 Deploying contracts for gas profiling..."));
  
  const XPVerifier = await ethers.getContractFactory("XPVerifier");
  const xpVerifier = await XPVerifier.deploy();
  await xpVerifier.waitForDeployment();
  console.log("XPVerifier deployed to:", await xpVerifier.getAddress());
  
  const XPBadge = await ethers.getContractFactory("XPBadge");
  const xpBadge = await XPBadge.deploy(
    "HamBaller XP Badge",
    "HXPB",
    "https://api.hamballer.xyz/metadata/"
  );
  await xpBadge.waitForDeployment();
  console.log("XPBadge deployed to:", await xpBadge.getAddress());
  
  // Grant minter role
  const MINTER_ROLE = await xpBadge.MINTER_ROLE();
  await xpBadge.grantRole(MINTER_ROLE, deployer.address);
  
  // Profile different scenarios
  console.log(chalk.bold.green("\n⛽ Gas Usage Analysis:\n"));
  
  const scenarios = [
    {
      name: "Simple XP Badge Mint (Low XP)",
      xp: 10,
      tokenId: 1,
      signals: generateMockSignals(5)
    },
    {
      name: "Medium XP Badge Mint",
      xp: 50,
      tokenId: 2,
      signals: generateMockSignals(10)
    },
    {
      name: "High XP Badge Mint (With ZK Proof)",
      xp: 100,
      tokenId: 3,
      signals: generateMockSignals(20),
      requiresProof: true
    },
    {
      name: "Batch Verification (3 badges)",
      batch: true,
      badges: [
        { xp: 30, tokenId: 1 },
        { xp: 60, tokenId: 2 },
        { xp: 90, tokenId: 3 }
      ]
    }
  ];
  
  const gasUsageResults = [];
  
  for (const scenario of scenarios) {
    console.log(chalk.cyan(`\n📊 ${scenario.name}:`));
    
    try {
      let gasUsed;
      
      if (scenario.batch) {
        // Simulate batch processing
        gasUsed = 0;
        for (const badge of scenario.badges) {
          const tx = await xpBadge.mint(
            deployer.address,
            badge.tokenId,
            badge.xp,
            1 // season
          );
          const receipt = await tx.wait();
          gasUsed += receipt.gasUsed;
        }
      } else {
        // Single mint
        const tx = await xpBadge.mint(
          deployer.address,
          scenario.tokenId,
          scenario.xp,
          1 // season
        );
        const receipt = await tx.wait();
        gasUsed = receipt.gasUsed;
        
        // If requires proof, simulate verification
        if (scenario.requiresProof) {
          const mockProof = generateMockProof();
          const verifyTx = await xpVerifier.verifyXPProof(
            mockProof.proof,
            mockProof.publicSignals
          );
          const verifyReceipt = await verifyTx.wait();
          gasUsed += verifyReceipt.gasUsed;
        }
      }
      
      const gasPrice = await ethers.provider.getFeeData();
      const costInEth = ethers.formatEther(gasUsed * gasPrice.gasPrice);
      
      console.log(`  Gas Used: ${chalk.yellow(gasUsed.toString())} units`);
      console.log(`  Estimated Cost: ${chalk.green(costInEth)} ETH`);
      
      gasUsageResults.push({
        scenario: scenario.name,
        gasUsed: Number(gasUsed),
        costInEth: parseFloat(costInEth)
      });
      
      // Check if gas usage is high
      if (gasUsed > 320000n) {
        console.log(chalk.red(`  ⚠️  WARNING: Gas usage exceeds 320k threshold!`));
      }
      
    } catch (error) {
      console.log(chalk.red(`  Error: ${error.message}`));
    }
  }
  
  // Optimization Suggestions
  console.log(chalk.bold.magenta("\n💡 Optimization Suggestions:\n"));
  
  const suggestions = [
    {
      issue: "High gas usage in ZK proof verification",
      current: "> 320,000 gas",
      suggestion: "Implement proof batching and optimize signal trimming",
      implementation: `
// Trim signals to reduce calldata
function trimSignals(signals) {
  return signals.slice(0, 10); // Keep only essential signals
}

// Batch verify proofs
function batchVerify(proofs) {
  // Process multiple proofs in single transaction
  return verifier.batchVerifyProofs(proofs);
}`
    },
    {
      issue: "Redundant storage operations",
      suggestion: "Use packed structs and optimize storage layout",
      implementation: `
// Pack badge data into single storage slot
struct BadgeData {
  uint32 tokenId;
  uint32 xpAmount;
  uint32 season;
  uint160 mintedAt;
}`
    },
    {
      issue: "String concatenation in URI generation",
      suggestion: "Pre-compute base URIs and use efficient concatenation",
      implementation: `
// Use assembly for efficient string ops
function _buildTokenURI(uint256 tokenId) internal pure returns (string memory) {
  bytes memory baseURI = bytes(_baseURI);
  bytes memory tokenIdStr = bytes(Strings.toString(tokenId));
  
  bytes memory result = new bytes(baseURI.length + tokenIdStr.length);
  // Assembly concatenation...
}`
    }
  ];
  
  suggestions.forEach((suggestion, index) => {
    console.log(chalk.cyan(`${index + 1}. ${suggestion.issue}`));
    if (suggestion.current) {
      console.log(`   Current: ${chalk.red(suggestion.current)}`);
    }
    console.log(`   Suggestion: ${chalk.green(suggestion.suggestion)}`);
    if (suggestion.implementation) {
      console.log(chalk.gray(`   Implementation:`));
      console.log(chalk.gray(suggestion.implementation));
    }
    console.log();
  });
  
  // Summary Report
  console.log(chalk.bold.yellow("\n📈 Summary Report:\n"));
  console.log("Average Gas Usage by Operation:");
  
  const avgGas = gasUsageResults.reduce((sum, r) => sum + r.gasUsed, 0) / gasUsageResults.length;
  console.log(`  Average: ${chalk.yellow(Math.round(avgGas).toLocaleString())} gas`);
  
  const highGasScenarios = gasUsageResults.filter(r => r.gasUsed > 320000);
  if (highGasScenarios.length > 0) {
    console.log(chalk.red(`\n  ⚠️  ${highGasScenarios.length} scenarios exceed 320k gas threshold`));
    highGasScenarios.forEach(s => {
      console.log(`     - ${s.scenario}: ${s.gasUsed.toLocaleString()} gas`);
    });
  }
  
  console.log(chalk.bold.green("\n✅ Gas profiling complete!\n"));
}

// Helper functions
function generateMockSignals(count) {
  return Array(count).fill(0).map((_, i) => 
    ethers.keccak256(ethers.toUtf8Bytes(`signal_${i}`))
  );
}

function generateMockProof() {
  return {
    proof: {
      a: [ethers.ZeroHash, ethers.ZeroHash],
      b: [[ethers.ZeroHash, ethers.ZeroHash], [ethers.ZeroHash, ethers.ZeroHash]],
      c: [ethers.ZeroHash, ethers.ZeroHash]
    },
    publicSignals: generateMockSignals(5)
  };
}

// Run profiling
if (require.main === module) {
  profileGasUsage()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { profileGasUsage };