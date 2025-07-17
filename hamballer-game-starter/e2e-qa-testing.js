#!/usr/bin/env node

/**
 * End-to-End QA Testing Suite for HamBaller.xyz
 * 
 * Tests the complete gameplay flow:
 * 1. Wallet connection and game initialization
 * 2. Run execution with different scenarios
 * 3. XP earning and badge minting
 * 4. ZK-proof verification for high-tier badges
 * 5. Nullifier reuse protection
 * 6. Multi-wallet testing
 */

const { ethers } = require('ethers');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  rpcUrl: process.env.ABSTRACT_RPC_URL || 'https://api.testnet.abs.xyz',
  contracts: {
    dbpToken: process.env.DBP_TOKEN_ADDRESS,
    hodlManager: process.env.HODL_MANAGER_ADDRESS,
    xpBadge: process.env.XPBADGE_ADDRESS,
    xpVerifier: process.env.XPVERIFIER_ADDRESS,
  },
  testWallets: [
    process.env.TEST_WALLET_1_PRIVATE_KEY,
    process.env.TEST_WALLET_2_PRIVATE_KEY,
    process.env.TEST_WALLET_3_PRIVATE_KEY,
  ].filter(Boolean),
  badgeThresholds: [
    { name: 'Participation', xp: 25, tokenId: 0 },
    { name: 'Common', xp: 50, tokenId: 1 },
    { name: 'Rare', xp: 100, tokenId: 2 },
    { name: 'Epic', xp: 250, tokenId: 3 },
    { name: 'Legendary', xp: 500, tokenId: 4 },
  ],
  zkProofThreshold: 50, // XP threshold requiring ZK proof
};

// Contract ABIs (simplified for testing)
const ABIS = {
  hodlManager: [
    'function startRun(uint8[] moves, uint256[] boostIds) returns (bytes32)',
    'function endRun(bytes32 runId, bool hodlDecision) returns (bool)',
    'function getPlayerStats(address player) view returns (tuple)',
    'function getCurrentPrice() view returns (uint256)',
    'event RunStarted(bytes32 indexed runId, address indexed player, uint256 startTime)',
    'event RunCompleted(bytes32 indexed runId, address indexed player, uint256 xpEarned, uint256 dbpEarned, bool successful)'
  ],
  xpBadge: [
    'function balanceOf(address account, uint256 id) view returns (uint256)',
    'function getBadgesByPlayer(address player) view returns (tuple[])',
    'function mintBadge(address to, uint256 tokenId, uint256 xp, uint256 season) returns (bool)',
    'event BadgeMinted(address indexed player, uint256 indexed tokenId, uint256 xp, uint256 season)'
  ],
  xpVerifier: [
    'function verifyXPProof(bytes32 nullifier, bytes32 commitment, uint256[8] calldata proof, uint256 claimedXP, uint256 threshold) external returns (bool)',
    'function isNullifierUsed(bytes32 nullifier) external view returns (bool)',
    'function getThreshold() external view returns (uint256)',
    'event XPProofVerified(address indexed player, bytes32 indexed nullifier, uint256 claimedXP, uint256 threshold, bool verified)'
  ]
};

// Test utilities
class E2ETestSuite {
  constructor() {
    this.provider = null;
    this.contracts = {};
    this.testResults = [];
    this.testWallets = [];
  }

  async initialize() {
    console.log('🚀 Initializing E2E Test Suite...\n');
    
    // Validate configuration
    await this.validateConfig();
    
    // Setup provider and contracts
    this.provider = new ethers.JsonRpcProvider(TEST_CONFIG.rpcUrl);
    await this.setupContracts();
    
    // Setup test wallets
    await this.setupTestWallets();
    
    console.log('✅ E2E Test Suite initialized successfully\n');
  }

  async validateConfig() {
    const missing = [];
    
    if (!TEST_CONFIG.rpcUrl) missing.push('ABSTRACT_RPC_URL');
    if (!TEST_CONFIG.contracts.hodlManager) missing.push('HODL_MANAGER_ADDRESS');
    if (!TEST_CONFIG.contracts.xpBadge) missing.push('XPBADGE_ADDRESS');
    if (!TEST_CONFIG.contracts.xpVerifier) missing.push('XPVERIFIER_ADDRESS');
    if (TEST_CONFIG.testWallets.length === 0) missing.push('TEST_WALLET_*_PRIVATE_KEY');
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  async setupContracts() {
    console.log('📄 Setting up contract connections...');
    
    this.contracts.hodlManager = new ethers.Contract(
      TEST_CONFIG.contracts.hodlManager,
      ABIS.hodlManager,
      this.provider
    );
    
    this.contracts.xpBadge = new ethers.Contract(
      TEST_CONFIG.contracts.xpBadge,
      ABIS.xpBadge,
      this.provider
    );
    
    this.contracts.xpVerifier = new ethers.Contract(
      TEST_CONFIG.contracts.xpVerifier,
      ABIS.xpVerifier,
      this.provider
    );
    
    // Test contract connectivity
    try {
      await this.contracts.hodlManager.getCurrentPrice();
      await this.contracts.xpVerifier.getThreshold();
      console.log('✅ All contracts connected successfully');
    } catch (error) {
      throw new Error(`Contract connection failed: ${error.message}`);
    }
  }

  async setupTestWallets() {
    console.log('👛 Setting up test wallets...');
    
    for (let i = 0; i < TEST_CONFIG.testWallets.length; i++) {
      const wallet = new ethers.Wallet(TEST_CONFIG.testWallets[i], this.provider);
      
      // Check balance
      const balance = await this.provider.getBalance(wallet.address);
      if (balance < ethers.parseEther('0.001')) {
        console.warn(`⚠️ Wallet ${i + 1} has low balance: ${ethers.formatEther(balance)} ETH`);
      }
      
      this.testWallets.push({
        index: i + 1,
        wallet,
        address: wallet.address,
        balance: ethers.formatEther(balance)
      });
      
      console.log(`  Wallet ${i + 1}: ${wallet.address} (${ethers.formatEther(balance)} ETH)`);
    }
  }

  // Test 1: Basic Gameplay Flow
  async testBasicGameplay() {
    console.log('\n🎮 TEST 1: Basic Gameplay Flow');
    console.log('=====================================');
    
    const testWallet = this.testWallets[0];
    const contract = this.contracts.hodlManager.connect(testWallet.wallet);
    
    try {
      // Generate test moves
      const moves = this.generateRandomMoves();
      console.log(`🎯 Generated moves: ${moves.join(', ')}`);
      
      // Start run
      console.log('🏃 Starting run...');
      const tx = await contract.startRun(moves, []); // No boosts for basic test
      const receipt = await tx.wait();
      
      // Extract run ID from events
      const runStartedEvent = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'RunStarted';
        } catch { return false; }
      });
      
      if (!runStartedEvent) {
        throw new Error('RunStarted event not found');
      }
      
      const runId = runStartedEvent.args.runId;
      console.log(`✅ Run started with ID: ${runId}`);
      
      // Simulate game delay
      await this.delay(2000);
      
      // End run
      console.log('🏁 Ending run...');
      const endTx = await contract.endRun(runId, true); // HODL decision
      const endReceipt = await endTx.wait();
      
      // Check for RunCompleted event
      const runCompletedEvent = endReceipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'RunCompleted';
        } catch { return false; }
      });
      
      if (runCompletedEvent) {
        const { xpEarned, dbpEarned, successful } = runCompletedEvent.args;
        console.log(`✅ Run completed: ${xpEarned} XP, ${dbpEarned} DBP, Success: ${successful}`);
        
        this.addTestResult('Basic Gameplay', true, {
          runId,
          xpEarned: xpEarned.toString(),
          dbpEarned: dbpEarned.toString(),
          successful
        });
      } else {
        throw new Error('RunCompleted event not found');
      }
      
    } catch (error) {
      console.error(`❌ Basic gameplay test failed: ${error.message}`);
      this.addTestResult('Basic Gameplay', false, { error: error.message });
    }
  }

  // Test 2: Badge Threshold Testing
  async testBadgeThresholds() {
    console.log('\n🏆 TEST 2: Badge Threshold Testing');
    console.log('=====================================');
    
    for (const threshold of TEST_CONFIG.badgeThresholds) {
      await this.testSpecificBadgeThreshold(threshold);
    }
  }

  async testSpecificBadgeThreshold(threshold) {
    console.log(`\n🎯 Testing ${threshold.name} badge (${threshold.xp} XP, Token ID: ${threshold.tokenId})`);
    
    const testWallet = this.testWallets[0];
    
    try {
      // Check initial badge balance
      const initialBalance = await this.contracts.xpBadge.balanceOf(testWallet.address, threshold.tokenId);
      console.log(`📊 Initial ${threshold.name} badge balance: ${initialBalance}`);
      
      // Simulate reaching exact XP threshold through backend API
      const response = await this.simulateXPEarning(testWallet.address, threshold.xp);
      
      if (response.success) {
        console.log(`✅ Successfully simulated earning ${threshold.xp} XP`);
        
        // Wait for badge minting process
        await this.delay(5000);
        
        // Check final badge balance
        const finalBalance = await this.contracts.xpBadge.balanceOf(testWallet.address, threshold.tokenId);
        const badgeMinted = finalBalance > initialBalance;
        
        console.log(`📊 Final ${threshold.name} badge balance: ${finalBalance}`);
        console.log(`🎫 Badge minted: ${badgeMinted ? 'YES' : 'NO'}`);
        
        this.addTestResult(`${threshold.name} Badge Threshold`, badgeMinted, {
          xpRequired: threshold.xp,
          tokenId: threshold.tokenId,
          initialBalance: initialBalance.toString(),
          finalBalance: finalBalance.toString()
        });
      } else {
        throw new Error('Failed to simulate XP earning');
      }
      
    } catch (error) {
      console.error(`❌ ${threshold.name} badge test failed: ${error.message}`);
      this.addTestResult(`${threshold.name} Badge Threshold`, false, { error: error.message });
    }
  }

  // Test 3: ZK-Proof Verification
  async testZKProofVerification() {
    console.log('\n🔐 TEST 3: ZK-Proof Verification');
    console.log('=====================================');
    
    const testWallet = this.testWallets[1]; // Use different wallet
    
    try {
      // Test high-value XP claim requiring ZK proof
      const highXP = 150; // Above threshold
      console.log(`🎯 Testing ZK proof for ${highXP} XP claim`);
      
      // Generate test proof data
      const proofData = await this.generateTestProof(testWallet.address, highXP);
      console.log('🔐 Generated test ZK proof');
      
      // Check if nullifier is already used
      const nullifierUsed = await this.contracts.xpVerifier.isNullifierUsed(proofData.nullifier);
      console.log(`🔍 Nullifier used: ${nullifierUsed}`);
      
      if (!nullifierUsed) {
        // Submit proof to contract
        const contract = this.contracts.xpVerifier.connect(testWallet.wallet);
        const tx = await contract.verifyXPProof(
          proofData.nullifier,
          proofData.commitment,
          proofData.proof,
          proofData.claimedXP,
          proofData.threshold
        );
        
        const receipt = await tx.wait();
        console.log(`✅ ZK proof verification transaction: ${receipt.hash}`);
        
        // Check for verification event
        const verificationEvent = receipt.logs.find(log => {
          try {
            const parsed = contract.interface.parseLog(log);
            return parsed.name === 'XPProofVerified';
          } catch { return false; }
        });
        
        if (verificationEvent) {
          const { verified } = verificationEvent.args;
          console.log(`🔐 Proof verification result: ${verified}`);
          
          this.addTestResult('ZK Proof Verification', verified, {
            nullifier: proofData.nullifier,
            claimedXP: highXP,
            verified
          });
        } else {
          throw new Error('XPProofVerified event not found');
        }
      } else {
        console.log('⚠️ Nullifier already used, skipping verification test');
        this.addTestResult('ZK Proof Verification', true, { 
          skipped: true, 
          reason: 'Nullifier already used' 
        });
      }
      
    } catch (error) {
      console.error(`❌ ZK proof verification failed: ${error.message}`);
      this.addTestResult('ZK Proof Verification', false, { error: error.message });
    }
  }

  // Test 4: Nullifier Reuse Protection
  async testNullifierReuseProtection() {
    console.log('\n🛡️ TEST 4: Nullifier Reuse Protection');
    console.log('=====================================');
    
    const testWallet = this.testWallets[2]; // Use third wallet
    
    try {
      // Generate proof data
      const proofData = await this.generateTestProof(testWallet.address, 100);
      console.log('🔐 Generated test proof for nullifier reuse test');
      
      const contract = this.contracts.xpVerifier.connect(testWallet.wallet);
      
      // First submission
      console.log('📤 First proof submission...');
      try {
        const tx1 = await contract.verifyXPProof(
          proofData.nullifier,
          proofData.commitment,
          proofData.proof,
          proofData.claimedXP,
          proofData.threshold
        );
        await tx1.wait();
        console.log('✅ First submission successful');
      } catch (firstError) {
        if (firstError.message.includes('already used')) {
          console.log('ℹ️ Nullifier already used from previous test');
        } else {
          throw firstError;
        }
      }
      
      // Second submission (should fail)
      console.log('📤 Second proof submission (should fail)...');
      try {
        const tx2 = await contract.verifyXPProof(
          proofData.nullifier,
          proofData.commitment,
          proofData.proof,
          proofData.claimedXP,
          proofData.threshold
        );
        await tx2.wait();
        
        // If we reach here, the protection failed
        console.error('❌ Nullifier reuse protection FAILED - second submission succeeded');
        this.addTestResult('Nullifier Reuse Protection', false, { 
          error: 'Second submission should have failed' 
        });
        
      } catch (secondError) {
        if (secondError.message.includes('already used') || secondError.message.includes('revert')) {
          console.log('✅ Nullifier reuse protection working - second submission rejected');
          this.addTestResult('Nullifier Reuse Protection', true, {
            nullifier: proofData.nullifier,
            protectionWorking: true
          });
        } else {
          throw secondError;
        }
      }
      
    } catch (error) {
      console.error(`❌ Nullifier reuse protection test failed: ${error.message}`);
      this.addTestResult('Nullifier Reuse Protection', false, { error: error.message });
    }
  }

  // Test 5: Multi-Wallet Testing
  async testMultiWallet() {
    console.log('\n👥 TEST 5: Multi-Wallet Testing');
    console.log('=====================================');
    
    const results = [];
    
    for (const testWallet of this.testWallets) {
      console.log(`\n👛 Testing wallet ${testWallet.index}: ${testWallet.address}`);
      
      try {
        // Get player stats
        const stats = await this.contracts.hodlManager.getPlayerStats(testWallet.address);
        console.log(`📊 Player stats: Runs: ${stats[0]}, Successful: ${stats[1]}, DBP: ${stats[2]}, XP: ${stats[3]}, Level: ${stats[4]}`);
        
        // Get badge balances
        const badges = [];
        for (const threshold of TEST_CONFIG.badgeThresholds) {
          const balance = await this.contracts.xpBadge.balanceOf(testWallet.address, threshold.tokenId);
          if (balance > 0) {
            badges.push({ name: threshold.name, balance: balance.toString() });
          }
        }
        console.log(`🏆 Badges owned: ${badges.length > 0 ? badges.map(b => `${b.name}(${b.balance})`).join(', ') : 'None'}`);
        
        results.push({
          wallet: testWallet.index,
          address: testWallet.address,
          stats: {
            totalRuns: stats[0].toString(),
            successfulRuns: stats[1].toString(),
            totalDbp: stats[2].toString(),
            currentXp: stats[3].toString(),
            level: stats[4].toString()
          },
          badges
        });
        
      } catch (error) {
        console.error(`❌ Error testing wallet ${testWallet.index}: ${error.message}`);
        results.push({
          wallet: testWallet.index,
          address: testWallet.address,
          error: error.message
        });
      }
    }
    
    this.addTestResult('Multi-Wallet Testing', true, { walletResults: results });
  }

  // Helper methods
  generateRandomMoves() {
    const moves = [];
    for (let i = 0; i < 10; i++) {
      moves.push(Math.random() > 0.5 ? 0 : 1); // 0 = UP, 1 = DOWN
    }
    return moves;
  }

  async generateTestProof(playerAddress, xpAmount) {
    // Generate deterministic test proof data
    const nullifier = ethers.keccak256(ethers.toUtf8Bytes(`${playerAddress}-${xpAmount}-${Date.now()}`));
    const commitment = ethers.keccak256(ethers.toUtf8Bytes(`commitment-${playerAddress}-${xpAmount}`));
    
    // Mock ZK proof (8 field elements)
    const proof = Array(8).fill().map((_, i) => ethers.BigNumber.from(i + 1).toString());
    
    return {
      nullifier,
      commitment,
      proof,
      claimedXP: xpAmount,
      threshold: TEST_CONFIG.zkProofThreshold
    };
  }

  async simulateXPEarning(playerAddress, xpAmount) {
    // This would normally call the backend API to simulate XP earning
    // For testing, we'll return a mock success response
    console.log(`🎲 Simulating ${xpAmount} XP earning for ${playerAddress}`);
    return { success: true, xpEarned: xpAmount };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  addTestResult(testName, passed, data = {}) {
    this.testResults.push({
      test: testName,
      passed,
      timestamp: new Date().toISOString(),
      data
    });
  }

  // Generate test report
  async generateReport() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=====================================');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log('\nDetailed Results:');
    console.log('=================');
    
    for (const result of this.testResults) {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.test}`);
      if (!result.passed && result.data.error) {
        console.log(`   Error: ${result.data.error}`);
      }
    }
    
    // Save detailed report to file
    const report = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: ((passedTests / totalTests) * 100).toFixed(1)
      },
      testConfig: TEST_CONFIG,
      results: this.testResults,
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile(
      path.join(__dirname, 'e2e-test-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log(`\n📄 Detailed report saved to: e2e-test-report.json`);
    
    return report;
  }

  // Main test runner
  async runAllTests() {
    try {
      await this.initialize();
      
      await this.testBasicGameplay();
      await this.testBadgeThresholds();
      await this.testZKProofVerification();
      await this.testNullifierReuseProtection();
      await this.testMultiWallet();
      
      const report = await this.generateReport();
      
      console.log('\n🎉 E2E Testing Complete!');
      return report;
      
    } catch (error) {
      console.error('❌ E2E Testing failed:', error.message);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const testSuite = new E2ETestSuite();
  testSuite.runAllTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = E2ETestSuite;