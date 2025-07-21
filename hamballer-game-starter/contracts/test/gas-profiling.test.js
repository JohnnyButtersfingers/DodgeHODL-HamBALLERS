import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("Gas Profiling for XPVerifier", function () {
  let xpVerifier;
  let owner;
  let verifier;
  let user;

  beforeEach(async function () {
    [owner, verifier, user] = await ethers.getSigners();
    
    // Deploy XPVerifier contract
    const XPVerifier = await ethers.getContractFactory("XPVerifier");
    xpVerifier = await XPVerifier.deploy();
    await xpVerifier.waitForDeployment();
    
    // Note: Current XPVerifier is a stub implementation without roles/threshold
    // The gas profiling will test the basic verifyXPProof function
  });

  describe("Gas Usage Validation", function () {
    it("verifyXPProof should use less than 320k gas", async function () {
      // Mock proof data (in production, this would be real ZK proof)
      const player = user.address;
      const xpEarned = ethers.parseUnits("150", 18);
      const mockNullifier = ethers.keccak256(ethers.toUtf8Bytes("test-nullifier"));
      const mockProof = "0x1234567890abcdef"; // Mock proof bytes

      // Estimate gas for verification
      const gasEstimate = await xpVerifier.verifyXPProof.estimateGas(
        player,
        xpEarned,
        mockNullifier,
        mockProof
      );

      console.log(`🔍 Gas estimate for verifyXPProof: ${gasEstimate.toString()}`);
      console.log(`🎯 Target: < 320,000 gas`);
      console.log(`✅ Status: ${gasEstimate < 320000n ? 'PASS' : 'FAIL'}`);

      expect(gasEstimate).to.be.below(320000n);
    });

    it("isNullifierUsed should be gas efficient", async function () {
      const mockNullifier = ethers.keccak256(ethers.toUtf8Bytes("test-nullifier"));
      
      const gasEstimate = await xpVerifier.isNullifierUsed.estimateGas(mockNullifier);
      
      console.log(`🔍 Gas estimate for isNullifierUsed: ${gasEstimate.toString()}`);
      console.log(`🎯 Target: < 30,000 gas`);
      console.log(`✅ Status: ${gasEstimate < 30000n ? 'PASS' : 'FAIL'}`);

      expect(gasEstimate).to.be.below(30000n);
    });

    it("emergencyMarkNullifierUsed should be gas efficient", async function () {
      const mockNullifier = ethers.keccak256(ethers.toUtf8Bytes("emergency-nullifier"));
      
      const gasEstimate = await xpVerifier.emergencyMarkNullifierUsed.estimateGas(mockNullifier);
      
      console.log(`🔍 Gas estimate for emergencyMarkNullifierUsed: ${gasEstimate.toString()}`);
      console.log(`🎯 Target: < 50,000 gas`);
      console.log(`✅ Status: ${gasEstimate < 50000n ? 'PASS' : 'FAIL'}`);

      expect(gasEstimate).to.be.below(50000n);
    });

    it("batch operations should scale efficiently", async function () {
      const batchSizes = [1, 5, 10];
      const results = [];

      for (const batchSize of batchSizes) {
        const nullifiers = [];
        for (let i = 0; i < batchSize; i++) {
          nullifiers.push(ethers.keccak256(ethers.toUtf8Bytes(`nullifier-${i}`)));
        }

        // Simulate batch checking (if available)
        let totalGas = 0n;
        for (const nullifier of nullifiers) {
          const gas = await xpVerifier.isNullifierUsed.estimateGas(nullifier);
          totalGas += gas;
        }

        const avgGasPerCheck = totalGas / BigInt(batchSize);
        results.push({
          batchSize,
          totalGas: totalGas.toString(),
          avgGasPerCheck: avgGasPerCheck.toString()
        });

        console.log(`📊 Batch size ${batchSize}: ${avgGasPerCheck} gas per check`);
      }

      // Gas usage should not increase dramatically with batch size
      const firstAvg = BigInt(results[0].avgGasPerCheck);
      const lastAvg = BigInt(results[results.length - 1].avgGasPerCheck);
      const increase = ((lastAvg - firstAvg) * 100n) / firstAvg;

      console.log(`📈 Gas increase from batch 1 to ${batchSizes[batchSizes.length - 1]}: ${increase}%`);
      expect(increase).to.be.below(20n); // Less than 20% increase
    });
  });

  describe("Gas Optimization Analysis", function () {
    it("should compare gas usage with different proof sizes", async function () {
      const proofSizes = [
        { name: "Small", data: "0x1234" },
        { name: "Medium", data: "0x" + "1234".repeat(32) },
        { name: "Large", data: "0x" + "1234".repeat(128) }
      ];

      const results = [];

      for (const proofSize of proofSizes) {
                 const player = user.address;
         const xpEarned = ethers.parseUnits("150", 18);
         const mockNullifier = ethers.keccak256(ethers.toUtf8Bytes(`nullifier-${proofSize.name}`));

         try {
           const gasEstimate = await xpVerifier.verifyXPProof.estimateGas(
             player,
             xpEarned,
             mockNullifier,
             proofSize.data
           );

          results.push({
            size: proofSize.name,
            gas: gasEstimate.toString(),
            dataLength: proofSize.data.length
          });

          console.log(`📏 ${proofSize.name} proof (${proofSize.data.length} chars): ${gasEstimate} gas`);
        } catch (error) {
          console.log(`⚠️  ${proofSize.name} proof failed: ${error.message}`);
        }
      }

      // Analyze gas scaling with proof size
      if (results.length > 1) {
        const gasPerChar = results.map(r => BigInt(r.gas) / BigInt(r.dataLength));
        console.log(`📊 Gas per character ratios:`, gasPerChar.map(g => g.toString()));
      }
    });

    it("should measure contract deployment gas", async function () {
      const XPVerifier = await ethers.getContractFactory("XPVerifier");
      
      // Get deployment transaction
      const deployTx = XPVerifier.getDeployTransaction();
      const gasEstimate = await ethers.provider.estimateGas(deployTx);

      console.log(`🚀 Contract deployment gas estimate: ${gasEstimate.toString()}`);
      console.log(`🎯 Target: < 2,000,000 gas`);
      console.log(`✅ Status: ${gasEstimate < 2000000n ? 'PASS' : 'FAIL'}`);

      expect(gasEstimate).to.be.below(2000000n);
    });

    it("should analyze gas usage patterns", async function () {
      const operations = [
        {
          name: "First verification",
                     action: () => {
             const nullifier = ethers.keccak256(ethers.toUtf8Bytes("first-nullifier"));
             return xpVerifier.verifyXPProof.estimateGas(
               user.address,
               ethers.parseUnits("150", 18),
               nullifier,
               "0x1234"
             );
           }
        },
        {
          name: "Subsequent verification", 
                     action: () => {
             const nullifier = ethers.keccak256(ethers.toUtf8Bytes("second-nullifier"));
             return xpVerifier.verifyXPProof.estimateGas(
               user.address,
               ethers.parseUnits("200", 18),
               nullifier,
               "0x1234"
             );
           }
        },
        {
          name: "Nullifier check",
          action: () => {
            const nullifier = ethers.keccak256(ethers.toUtf8Bytes("check-nullifier"));
            return xpVerifier.isNullifierUsed.estimateGas(nullifier);
          }
        }
      ];

      const gasUsage = {};

      for (const operation of operations) {
        try {
          const gas = await operation.action();
          gasUsage[operation.name] = gas.toString();
          console.log(`⚡ ${operation.name}: ${gas} gas`);
        } catch (error) {
          console.log(`❌ ${operation.name} failed: ${error.message}`);
        }
      }

      // Generate gas report summary
      console.log("\n📋 Gas Usage Summary:");
      console.log("================================");
      Object.entries(gasUsage).forEach(([name, gas]) => {
        const efficiency = BigInt(gas) < 100000n ? "🟢 Efficient" : 
                          BigInt(gas) < 300000n ? "🟡 Moderate" : "🔴 High";
        console.log(`${efficiency} ${name}: ${gas} gas`);
      });
      console.log("================================");
    });
  });

  describe("Performance Benchmarks", function () {
    it("should meet gas targets for production deployment", async function () {
             const targets = {
         verifyXPProof: 320000n,
         isNullifierUsed: 30000n,
         emergencyMarkNullifierUsed: 50000n,
         deployment: 2000000n
       };

       const results = {
         verifyXPProof: await xpVerifier.verifyXPProof.estimateGas(
           user.address,
           ethers.parseUnits("150", 18),
           ethers.keccak256(ethers.toUtf8Bytes("test")),
           "0x1234"
         ),
         isNullifierUsed: await xpVerifier.isNullifierUsed.estimateGas(
           ethers.keccak256(ethers.toUtf8Bytes("test"))
         ),
         emergencyMarkNullifierUsed: await xpVerifier.emergencyMarkNullifierUsed.estimateGas(
           ethers.keccak256(ethers.toUtf8Bytes("test"))
         )
       };

      console.log("\n🎯 Production Gas Targets vs Actual:");
      console.log("=====================================");
      
      let allTargetsMet = true;
      for (const [operation, target] of Object.entries(targets)) {
        if (operation === 'deployment') continue; // Skip deployment for this test
        
        const actual = results[operation];
        const met = actual <= target;
        const percentage = (actual * 100n) / target;
        
        console.log(`${met ? '✅' : '❌'} ${operation}:`);
        console.log(`   Target: ${target.toLocaleString()} gas`);
        console.log(`   Actual: ${actual.toLocaleString()} gas (${percentage}% of target)`);
        
        if (!met) allTargetsMet = false;
      }
      
      console.log("=====================================");
      console.log(`🏆 Overall: ${allTargetsMet ? 'ALL TARGETS MET' : 'SOME TARGETS EXCEEDED'}`);
      
      // Assert all targets are met
      for (const [operation, target] of Object.entries(targets)) {
        if (operation === 'deployment') continue;
        expect(results[operation]).to.be.at.most(target, 
          `${operation} gas usage (${results[operation]}) exceeds target (${target})`);
      }
    });
  });
});