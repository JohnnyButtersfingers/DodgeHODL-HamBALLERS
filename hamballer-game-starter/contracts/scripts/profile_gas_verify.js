const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Gas Profiling Script for XPVerifier Contract
 * Analyzes gas usage and provides optimization recommendations
 */

async function main() {
  console.log("⛽ XPVerifier Gas Profiling Analysis");
  console.log("====================================");

  // Get the contract factory
  const XPVerifierSimple = await ethers.getContractFactory("XPVerifierSimple");
  
  // Deploy contract for testing
  console.log("\n🚀 Deploying contract for gas analysis...");
  const xpVerifier = await XPVerifierSimple.deploy();
  await xpVerifier.waitForDeployment();
  
  const contractAddress = await xpVerifier.getAddress();
  console.log("📍 Contract deployed at:", contractAddress);

  // Gas profiling results
  const gasProfile = {
    deployment: {},
    functions: {},
    optimizations: [],
    analysis: {}
  };

  // Profile deployment gas
  const deployTx = xpVerifier.deploymentTransaction();
  gasProfile.deployment = {
    gasUsed: deployTx.gasLimit.toString(),
    gasPrice: deployTx.gasPrice?.toString() || "0",
    estimatedCost: deployTx.gasLimit * (deployTx.gasPrice || 0n)
  };

  console.log("\n📊 Deployment Gas Analysis:");
  console.log(`  Gas Used: ${gasProfile.deployment.gasUsed}`);
  console.log(`  Estimated Cost: ${ethers.formatEther(gasProfile.deployment.estimatedCost)} ETH`);

  // Test data for profiling
  const testCases = [
    {
      name: "Standard Proof (50 XP)",
      nullifier: ethers.keccak256(ethers.toUtf8Bytes("test_nullifier_50")),
      commitment: ethers.keccak256(ethers.toUtf8Bytes("test_commitment_50")),
      proof: generateTestProof(),
      claimedXP: 50,
      threshold: 50
    },
    {
      name: "High XP Proof (100 XP)",
      nullifier: ethers.keccak256(ethers.toUtf8Bytes("test_nullifier_100")),
      commitment: ethers.keccak256(ethers.toUtf8Bytes("test_commitment_100")),
      proof: generateTestProof(),
      claimedXP: 100,
      threshold: 50
    },
    {
      name: "Edge Case (Exact Threshold)",
      nullifier: ethers.keccak256(ethers.toUtf8Bytes("test_nullifier_edge")),
      commitment: ethers.keccak256(ethers.toUtf8Bytes("test_commitment_edge")),
      proof: generateTestProof(),
      claimedXP: 50,
      threshold: 50
    }
  ];

  console.log("\n🧪 Profiling verifyXPProof Function:");
  console.log("=====================================");

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    
    try {
      // Estimate gas for the proof verification
      const gasEstimate = await xpVerifier.verifyXPProof.estimateGas(
        testCase.nullifier,
        testCase.commitment,
        testCase.proof,
        testCase.claimedXP,
        testCase.threshold
      );

      // Execute the transaction to get actual gas used
      const tx = await xpVerifier.verifyXPProof(
        testCase.nullifier,
        testCase.commitment,
        testCase.proof,
        testCase.claimedXP,
        testCase.threshold
      );
      
      const receipt = await tx.wait();
      const actualGasUsed = receipt.gasUsed;

      gasProfile.functions[testCase.name] = {
        estimated: gasEstimate.toString(),
        actual: actualGasUsed.toString(),
        difference: (gasEstimate - actualGasUsed).toString()
      };

      console.log(`  📊 Gas Estimate: ${gasEstimate.toLocaleString()}`);
      console.log(`  📊 Actual Usage: ${actualGasUsed.toLocaleString()}`);
      console.log(`  📊 Difference: ${gasEstimate - actualGasUsed}`);
      
      // Analyze if gas usage exceeds target
      if (actualGasUsed > 320000n) {
        console.log(`  ⚠️  Gas usage (${actualGasUsed.toLocaleString()}) exceeds 320k target!`);
        gasProfile.optimizations.push({
          issue: `High gas usage in ${testCase.name}`,
          current: actualGasUsed.toString(),
          target: "320000",
          suggestions: getOptimizationSuggestions(actualGasUsed)
        });
      } else {
        console.log(`  ✅ Gas usage within 320k target`);
      }

    } catch (error) {
      console.log(`  ❌ Error testing ${testCase.name}:`, error.message);
      gasProfile.functions[testCase.name] = { error: error.message };
    }
  }

  // Profile other functions
  console.log("\n🔧 Profiling Other Functions:");
  console.log("==============================");

  const otherFunctions = [
    {
      name: "isNullifierUsed",
      call: () => xpVerifier.isNullifierUsed(ethers.keccak256(ethers.toUtf8Bytes("test")))
    },
    {
      name: "getThreshold",
      call: () => xpVerifier.getThreshold()
    },
    {
      name: "updateThreshold",
      call: () => xpVerifier.updateThreshold(75)
    }
  ];

  for (const func of otherFunctions) {
    try {
      const gasEstimate = await func.call.estimateGas();
      gasProfile.functions[func.name] = {
        estimated: gasEstimate.toString(),
        type: "view/pure"
      };
      
      console.log(`  📊 ${func.name}: ${gasEstimate.toLocaleString()} gas`);
    } catch (error) {
      console.log(`  ❌ ${func.name}: ${error.message}`);
      gasProfile.functions[func.name] = { error: error.message };
    }
  }

  // Generate optimization analysis
  console.log("\n🔍 Gas Optimization Analysis:");
  console.log("==============================");

  gasProfile.analysis = generateOptimizationAnalysis(gasProfile);

  for (const optimization of gasProfile.analysis.recommendations) {
    console.log(`\n💡 ${optimization.category}:`);
    console.log(`  Issue: ${optimization.issue}`);
    console.log(`  Impact: ${optimization.impact}`);
    console.log(`  Solution: ${optimization.solution}`);
    console.log(`  Estimated Savings: ${optimization.estimatedSavings}`);
  }

  // Save profiling results
  const resultsFile = path.join(__dirname, "../gas-profile-results.json");
  fs.writeFileSync(resultsFile, JSON.stringify(gasProfile, null, 2));
  console.log(`\n💾 Gas profiling results saved to: ${resultsFile}`);

  // Generate optimization report
  generateOptimizationReport(gasProfile);

  console.log("\n🎯 Summary:");
  console.log("===========");
  const avgGas = calculateAverageGas(gasProfile.functions);
  console.log(`📊 Average verification gas: ${avgGas.toLocaleString()}`);
  console.log(`🎯 Target gas usage: 320,000`);
  console.log(`📈 Performance: ${avgGas <= 320000 ? '✅ Within target' : '⚠️ Exceeds target'}`);
  console.log(`🔧 Optimization opportunities: ${gasProfile.analysis.recommendations.length}`);

  return gasProfile;
}

function generateTestProof() {
  // Generate deterministic test proof data
  return [
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "0x2345678901bcdef02345678901bcdef02345678901bcdef02345678901bcdef0",
    "0x3456789012cdef013456789012cdef013456789012cdef013456789012cdef01",
    "0x456789023def0124456789023def0124456789023def0124456789023def0124",
    "0x56789034ef012345567890234ef012345678903def012345678903def012345",
    "0x6789045f0123456789045f0123456789045f0123456789045f01234567890456",
    "0x789056012345678901234567890123456789012345678901234567890123456",
    "0x89067123456789012345678901234567890123456789012345678901234567"
  ];
}

function getOptimizationSuggestions(gasUsed) {
  const suggestions = [];
  
  if (gasUsed > 400000n) {
    suggestions.push("Consider reducing proof array size or using packed structs");
    suggestions.push("Implement batch verification for multiple proofs");
    suggestions.push("Optimize storage reads by caching frequently used values");
  } else if (gasUsed > 350000n) {
    suggestions.push("Optimize loops and conditional logic");
    suggestions.push("Use events instead of storage for non-critical data");
    suggestions.push("Consider using assembly for critical calculations");
  } else if (gasUsed > 320000n) {
    suggestions.push("Trim unnecessary signal validations");
    suggestions.push("Optimize struct packing and memory usage");
    suggestions.push("Reduce external calls within verification logic");
  }

  return suggestions;
}

function generateOptimizationAnalysis(gasProfile) {
  const recommendations = [];

  // Analyze deployment gas
  const deploymentGas = BigInt(gasProfile.deployment.gasUsed);
  if (deploymentGas > 3000000n) {
    recommendations.push({
      category: "Deployment Optimization",
      issue: "High deployment gas usage",
      impact: `${deploymentGas.toLocaleString()} gas used`,
      solution: "Reduce contract size by splitting into libraries or using proxy patterns",
      estimatedSavings: "500k-1M gas"
    });
  }

  // Analyze verification function gas
  const verificationGases = Object.entries(gasProfile.functions)
    .filter(([key]) => key.includes("XP"))
    .map(([, value]) => value.actual ? BigInt(value.actual) : 0n)
    .filter(gas => gas > 0n);

  if (verificationGases.length > 0) {
    const maxVerificationGas = Math.max(...verificationGases.map(g => Number(g)));
    
    if (maxVerificationGas > 320000) {
      recommendations.push({
        category: "Verification Optimization",
        issue: "Verification exceeds 320k gas target",
        impact: `${maxVerificationGas.toLocaleString()} gas peak usage`,
        solution: "Implement suggested optimizations: trim signals, optimize loops, use assembly",
        estimatedSavings: "50k-100k gas"
      });
    }
  }

  // Storage optimization analysis
  recommendations.push({
    category: "Storage Optimization",
    issue: "Multiple storage reads for nullifier tracking",
    impact: "~20k gas per additional storage operation",
    solution: "Implement packed storage for related data and use events for historical tracking",
    estimatedSavings: "10k-30k gas per verification"
  });

  // Algorithm optimization
  recommendations.push({
    category: "Algorithm Optimization",
    issue: "Verification logic can be streamlined",
    impact: "Unnecessary computational overhead",
    solution: "Pre-compute validation constants and optimize proof validation order",
    estimatedSavings: "5k-15k gas per verification"
  });

  return {
    recommendations,
    totalEstimatedSavings: "65k-145k gas per verification",
    priorityLevel: verificationGases.some(g => g > 320000n) ? "HIGH" : "MEDIUM"
  };
}

function generateOptimizationReport(gasProfile) {
  const reportPath = path.join(__dirname, "../GAS_OPTIMIZATION_REPORT.md");
  
  const report = `# 🔥 XPVerifier Gas Optimization Report

## 📊 Current Performance

### Deployment
- **Gas Used**: ${gasProfile.deployment.gasUsed.toLocaleString()}
- **Estimated Cost**: ${ethers.formatEther(gasProfile.deployment.estimatedCost)} ETH

### Function Gas Usage
${Object.entries(gasProfile.functions).map(([name, data]) => 
  `- **${name}**: ${data.actual ? `${BigInt(data.actual).toLocaleString()} gas` : data.estimated ? `${BigInt(data.estimated).toLocaleString()} gas (estimated)` : 'Error'}`
).join('\n')}

## 🎯 Optimization Recommendations

${gasProfile.analysis.recommendations.map((rec, i) => `
### ${i + 1}. ${rec.category}
- **Issue**: ${rec.issue}
- **Impact**: ${rec.impact}
- **Solution**: ${rec.solution}
- **Estimated Savings**: ${rec.estimatedSavings}
`).join('\n')}

## 🚀 Implementation Priority

**Priority Level**: ${gasProfile.analysis.priorityLevel}
**Total Potential Savings**: ${gasProfile.analysis.totalEstimatedSavings}

### Quick Wins (Easy Implementation)
1. Trim unnecessary signal validations in verification logic
2. Use events instead of storage for non-critical tracking
3. Implement packed structs for related data

### Medium Impact (Moderate Implementation)
1. Optimize loops and conditional statements
2. Cache frequently accessed storage values
3. Use assembly for critical mathematical operations

### High Impact (Complex Implementation)
1. Implement batch verification capabilities
2. Use proxy patterns for contract upgrades
3. Optimize proof validation algorithms

## 📈 Expected Results

With full optimization implementation:
- **Target**: <320k gas per verification
- **Current Peak**: ${Math.max(...Object.values(gasProfile.functions).map(f => f.actual ? Number(f.actual) : 0)).toLocaleString()} gas
- **Projected**: ~${Math.max(250000, Math.max(...Object.values(gasProfile.functions).map(f => f.actual ? Number(f.actual) : 0)) - 100000).toLocaleString()} gas

Generated on: ${new Date().toISOString()}
`;

  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Optimization report generated: ${reportPath}`);
}

function calculateAverageGas(functions) {
  const gasValues = Object.values(functions)
    .map(f => f.actual ? BigInt(f.actual) : f.estimated ? BigInt(f.estimated) : 0n)
    .filter(gas => gas > 0n);
    
  if (gasValues.length === 0) return 0;
  
  const sum = gasValues.reduce((acc, val) => acc + val, 0n);
  return Number(sum / BigInt(gasValues.length));
}

// Execute the profiling
if (require.main === module) {
  main()
    .then((profile) => {
      console.log("\n✅ Gas profiling completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Gas profiling failed:", error);
      process.exit(1);
    });
}

module.exports = main;