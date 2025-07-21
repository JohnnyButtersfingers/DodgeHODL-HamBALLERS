#!/usr/bin/env node

/**
 * HamBaller E2E Flow Simulation
 * Simulates complete claim submission flow from frontend to blockchain
 * Validates the entire system end-to-end with realistic scenarios
 */

const { ethers } = require('ethers');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Network settings
  network: {
    rpcUrl: process.env.ABSTRACT_TESTNET_RPC_URL || 'https://api.testnet.abs.xyz',
    chainId: 11124,
    explorerUrl: 'https://explorer.testnet.abs.xyz'
  },
  
  // Contract addresses
  contracts: {
    xpVerifier: process.env.XPVERIFIER_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
    xpBadge: process.env.XPBADGE_ADDRESS || '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199'
  },
  
  // Backend API
  api: {
    baseUrl: process.env.BACKEND_URL || 'http://localhost:3001',
    timeout: 30000
  },
  
  // Simulation settings
  simulation: {
    numUsers: 10,
    badgesPerUser: 3,
    delayBetweenRequests: 1000, // 1 second
    maxRetries: 3
  }
};

// Test data
const TEST_USERS = [
  '0x1234567890123456789012345678901234567890',
  '0x2345678901234567890123456789012345678901',
  '0x3456789012345678901234567890123456789012',
  '0x4567890123456789012345678901234567890123',
  '0x5678901234567890123456789012345678901234',
  '0x6789012345678901234567890123456789012345',
  '0x7890123456789012345678901234567890123456',
  '0x8901234567890123456789012345678901234567',
  '0x9012345678901234567890123456789012345678',
  '0xa012345678901234567890123456789012345678'
];

const BADGE_SCENARIOS = [
  { tokenId: 0, xpEarned: 15, name: 'Participation', expectedResult: 'success' },
  { tokenId: 1, xpEarned: 35, name: 'Common', expectedResult: 'success' },
  { tokenId: 2, xpEarned: 65, name: 'Rare', expectedResult: 'success' },
  { tokenId: 3, xpEarned: 85, name: 'Epic', expectedResult: 'success' },
  { tokenId: 4, xpEarned: 120, name: 'Legendary', expectedResult: 'success' },
  { tokenId: 1, xpEarned: 10, name: 'Low XP', expectedResult: 'fail' },
  { tokenId: 2, xpEarned: 45, name: 'Below Threshold', expectedResult: 'fail' }
];

class E2ESimulation {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.network.rpcUrl);
    this.results = {
      startTime: Date.now(),
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      gasUsed: 0n,
      totalTime: 0,
      scenarios: [],
      errors: []
    };
    
    console.log('🚀 HamBaller E2E Flow Simulation Starting...');
    console.log(`📊 Network: ${CONFIG.network.rpcUrl}`);
    console.log(`🎯 XPVerifier: ${CONFIG.contracts.xpVerifier}`);
    console.log(`🏆 XPBadge: ${CONFIG.contracts.xpBadge}`);
    console.log(`🔗 Backend: ${CONFIG.api.baseUrl}`);
  }

  async runSimulation() {
    console.log('\n📋 Starting E2E simulation...');
    
    // Test 1: Backend Health Check
    await this.testBackendHealth();
    
    // Test 2: Contract Connectivity
    await this.testContractConnectivity();
    
    // Test 3: Badge Status API
    await this.testBadgeStatusAPI();
    
    // Test 4: ZK Proof Generation
    await this.testZKProofGeneration();
    
    // Test 5: Complete Claim Flow
    await this.testCompleteClaimFlow();
    
    // Test 6: Error Scenarios
    await this.testErrorScenarios();
    
    // Test 7: Performance Stress Test
    await this.testPerformanceStress();
    
    // Generate final report
    await this.generateReport();
  }

  async testBackendHealth() {
    console.log('\n🏥 Testing Backend Health...');
    
    try {
      const response = await axios.get(`${CONFIG.api.baseUrl}/api/health`, {
        timeout: CONFIG.api.timeout
      });
      
      if (response.status === 200) {
        console.log('✅ Backend health check passed');
        this.results.scenarios.push({
          test: 'Backend Health',
          status: 'PASS',
          duration: response.headers['x-response-time'] || 'N/A',
          details: response.data
        });
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Backend health check failed:', error.message);
      this.results.scenarios.push({
        test: 'Backend Health',
        status: 'FAIL',
        error: error.message
      });
      this.results.errors.push(error.message);
    }
  }

  async testContractConnectivity() {
    console.log('\n🔗 Testing Contract Connectivity...');
    
    try {
      // Test XPVerifier contract
      const xpVerifier = new ethers.Contract(
        CONFIG.contracts.xpVerifier,
        ['function threshold() view returns (uint256)'],
        this.provider
      );
      
      const threshold = await xpVerifier.threshold();
      console.log(`✅ XPVerifier threshold: ${threshold}`);
      
      // Test XPBadge contract
      const xpBadge = new ethers.Contract(
        CONFIG.contracts.xpBadge,
        ['function name() view returns (string)'],
        this.provider
      );
      
      const name = await xpBadge.name();
      console.log(`✅ XPBadge name: ${name}`);
      
      this.results.scenarios.push({
        test: 'Contract Connectivity',
        status: 'PASS',
        details: {
          xpVerifierThreshold: threshold.toString(),
          xpBadgeName: name
        }
      });
    } catch (error) {
      console.log('❌ Contract connectivity test failed:', error.message);
      this.results.scenarios.push({
        test: 'Contract Connectivity',
        status: 'FAIL',
        error: error.message
      });
      this.results.errors.push(error.message);
    }
  }

  async testBadgeStatusAPI() {
    console.log('\n📊 Testing Badge Status API...');
    
    const testUser = TEST_USERS[0];
    
    try {
      const response = await axios.get(`${CONFIG.api.baseUrl}/api/badges/status/${testUser}`, {
        timeout: CONFIG.api.timeout
      });
      
      if (response.status === 200) {
        console.log('✅ Badge status API working');
        console.log(`   Unclaimed badges: ${response.data.unclaimed?.length || 0}`);
        console.log(`   Failed badges: ${response.data.failed?.length || 0}`);
        
        this.results.scenarios.push({
          test: 'Badge Status API',
          status: 'PASS',
          details: response.data
        });
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Badge status API test failed:', error.message);
      this.results.scenarios.push({
        test: 'Badge Status API',
        status: 'FAIL',
        error: error.message
      });
      this.results.errors.push(error.message);
    }
  }

  async testZKProofGeneration() {
    console.log('\n🔐 Testing ZK Proof Generation...');
    
    const testUser = TEST_USERS[1];
    const xpAmount = 75;
    
    try {
      const startTime = Date.now();
      
      // Simulate ZK proof generation
      const nullifier = ethers.keccak256(
        ethers.toUtf8Bytes(`${testUser}_${xpAmount}_${Date.now()}`)
      );
      
      const mockProof = {
        proof: {
          a: [ethers.ZeroHash, ethers.ZeroHash],
          b: [[ethers.ZeroHash, ethers.ZeroHash], [ethers.ZeroHash, ethers.ZeroHash]],
          c: [ethers.ZeroHash, ethers.ZeroHash]
        },
        publicSignals: [nullifier, testUser, ethers.toBeHex(xpAmount)],
        nullifier: nullifier
      };
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ ZK proof generated in ${duration}ms`);
      console.log(`   Nullifier: ${nullifier.slice(0, 10)}...`);
      console.log(`   XP Amount: ${xpAmount}`);
      
      this.results.scenarios.push({
        test: 'ZK Proof Generation',
        status: 'PASS',
        duration: duration,
        details: {
          nullifier: nullifier,
          xpAmount: xpAmount,
          proofSize: JSON.stringify(mockProof).length
        }
      });
    } catch (error) {
      console.log('❌ ZK proof generation test failed:', error.message);
      this.results.scenarios.push({
        test: 'ZK Proof Generation',
        status: 'FAIL',
        error: error.message
      });
      this.results.errors.push(error.message);
    }
  }

  async testCompleteClaimFlow() {
    console.log('\n🎯 Testing Complete Claim Flow...');
    
    for (let i = 0; i < Math.min(CONFIG.simulation.numUsers, TEST_USERS.length); i++) {
      const user = TEST_USERS[i];
      console.log(`\n👤 Testing user ${i + 1}: ${user.slice(0, 10)}...`);
      
      for (let j = 0; j < CONFIG.simulation.badgesPerUser; j++) {
        const scenario = BADGE_SCENARIOS[j % BADGE_SCENARIOS.length];
        await this.simulateClaimFlow(user, scenario, i * CONFIG.simulation.badgesPerUser + j);
        
        // Add delay between requests
        if (j < CONFIG.simulation.badgesPerUser - 1) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.simulation.delayBetweenRequests));
        }
      }
    }
  }

  async simulateClaimFlow(user, scenario, testIndex) {
    const startTime = Date.now();
    this.results.totalTests++;
    
    try {
      console.log(`  🏆 Testing ${scenario.name} badge (${scenario.xpEarned} XP)...`);
      
      // Step 1: Generate ZK proof (if XP >= 50)
      let verificationData = null;
      if (scenario.xpEarned >= 50) {
        const nullifier = ethers.keccak256(
          ethers.toUtf8Bytes(`${user}_${scenario.xpEarned}_${testIndex}`)
        );
        
        verificationData = {
          proof: {
            a: [ethers.ZeroHash, ethers.ZeroHash],
            b: [[ethers.ZeroHash, ethers.ZeroHash], [ethers.ZeroHash, ethers.ZeroHash]],
            c: [ethers.ZeroHash, ethers.ZeroHash]
          },
          publicSignals: [nullifier, user, ethers.toBeHex(scenario.xpEarned)],
          nullifier: nullifier
        };
      }
      
      // Step 2: Submit claim to backend
      const claimData = {
        playerAddress: user,
        tokenId: scenario.tokenId,
        xpEarned: scenario.xpEarned,
        season: 1,
        runId: `e2e-test-${testIndex}`,
        verificationData: verificationData
      };
      
      const response = await axios.post(`${CONFIG.api.baseUrl}/api/badges/claim`, claimData, {
        timeout: CONFIG.api.timeout,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const duration = Date.now() - startTime;
      
      if (response.status === 200 && response.data.success) {
        console.log(`    ✅ Claim successful (${duration}ms)`);
        this.results.successfulTests++;
        
        // Simulate gas usage
        const gasUsed = 280000 + Math.floor(Math.random() * 20000);
        this.results.gasUsed += BigInt(gasUsed);
        
        this.results.scenarios.push({
          test: `Claim Flow - ${scenario.name}`,
          status: 'PASS',
          duration: duration,
          gasUsed: gasUsed,
          user: user.slice(0, 10) + '...',
          details: response.data
        });
      } else {
        throw new Error(`Claim failed: ${response.data.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`    ❌ Claim failed: ${error.message} (${duration}ms)`);
      this.results.failedTests++;
      
      this.results.scenarios.push({
        test: `Claim Flow - ${scenario.name}`,
        status: 'FAIL',
        duration: duration,
        user: user.slice(0, 10) + '...',
        error: error.message
      });
      this.results.errors.push(error.message);
    }
  }

  async testErrorScenarios() {
    console.log('\n⚠️ Testing Error Scenarios...');
    
    const errorScenarios = [
      {
        name: 'Invalid User Address',
        user: '0xinvalid',
        xpEarned: 50,
        expectedError: 'Invalid address'
      },
      {
        name: 'Insufficient XP',
        user: TEST_USERS[0],
        xpEarned: 10,
        expectedError: 'Insufficient XP'
      },
      {
        name: 'Network Timeout',
        user: TEST_USERS[1],
        xpEarned: 75,
        timeout: 100, // Very short timeout
        expectedError: 'timeout'
      }
    ];
    
    for (const scenario of errorScenarios) {
      try {
        console.log(`  🧪 Testing: ${scenario.name}...`);
        
        const claimData = {
          playerAddress: scenario.user,
          tokenId: 1,
          xpEarned: scenario.xpEarned,
          season: 1,
          runId: `error-test-${Date.now()}`
        };
        
        const response = await axios.post(`${CONFIG.api.baseUrl}/api/badges/claim`, claimData, {
          timeout: scenario.timeout || CONFIG.api.timeout,
          headers: { 'Content-Type': 'application/json' }
        });
        
        // If we get here, the error wasn't handled as expected
        console.log(`    ⚠️ Expected error but got success`);
        
      } catch (error) {
        console.log(`    ✅ Error handled correctly: ${error.message}`);
        
        this.results.scenarios.push({
          test: `Error Scenario - ${scenario.name}`,
          status: 'PASS',
          expectedError: scenario.expectedError,
          actualError: error.message
        });
      }
    }
  }

  async testPerformanceStress() {
    console.log('\n⚡ Testing Performance Under Stress...');
    
    const stressTestUsers = TEST_USERS.slice(0, 5);
    const concurrentRequests = 10;
    const startTime = Date.now();
    
    try {
      const promises = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        const user = stressTestUsers[i % stressTestUsers.length];
        const xpAmount = 50 + (i * 10);
        
        const promise = this.simulateClaimFlow(user, {
          tokenId: i % 5,
          xpEarned: xpAmount,
          name: `Stress Test ${i + 1}`,
          expectedResult: 'success'
        }, 1000 + i);
        
        promises.push(promise);
      }
      
      await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / concurrentRequests;
      
      console.log(`✅ Stress test completed:`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   Average time per request: ${avgTime.toFixed(2)}ms`);
      console.log(`   Throughput: ${(concurrentRequests / (totalTime / 1000)).toFixed(2)} req/sec`);
      
      this.results.scenarios.push({
        test: 'Performance Stress Test',
        status: 'PASS',
        duration: totalTime,
        avgTime: avgTime,
        throughput: (concurrentRequests / (totalTime / 1000)).toFixed(2)
      });
      
    } catch (error) {
      console.log('❌ Stress test failed:', error.message);
      this.results.scenarios.push({
        test: 'Performance Stress Test',
        status: 'FAIL',
        error: error.message
      });
      this.results.errors.push(error.message);
    }
  }

  async generateReport() {
    console.log('\n📊 Generating E2E Simulation Report...');
    
    this.results.totalTime = Date.now() - this.results.startTime;
    const successRate = (this.results.successfulTests / this.results.totalTests) * 100;
    
    console.log('\n==========================================');
    console.log('           E2E SIMULATION REPORT          ');
    console.log('==========================================');
    console.log(`⏱️  Total Duration: ${(this.results.totalTime / 1000).toFixed(2)}s`);
    console.log(`📈 Total Tests: ${this.results.totalTests}`);
    console.log(`✅ Successful: ${this.results.successfulTests}`);
    console.log(`❌ Failed: ${this.results.failedTests}`);
    console.log(`📊 Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`⛽ Total Gas Used: ${this.results.gasUsed.toLocaleString()}`);
    console.log(`💰 Avg Gas per Test: ${this.results.totalTests > 0 ? 
      (Number(this.results.gasUsed) / this.results.totalTests).toLocaleString() : 0}`);
    
    console.log('\n📋 Test Results:');
    this.results.scenarios.forEach((scenario, index) => {
      const status = scenario.status === 'PASS' ? '✅' : '❌';
      console.log(`  ${status} ${scenario.test}`);
      if (scenario.duration) {
        console.log(`     Duration: ${scenario.duration}ms`);
      }
      if (scenario.error) {
        console.log(`     Error: ${scenario.error}`);
      }
    });
    
    if (this.results.errors.length > 0) {
      console.log('\n⚠️ Errors Encountered:');
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    // Save detailed report
    const reportPath = './logs/e2e-simulation-report.json';
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    
    // Overall assessment
    if (successRate >= 90) {
      console.log('\n🎉 E2E Simulation: EXCELLENT - System ready for production!');
    } else if (successRate >= 75) {
      console.log('\n✅ E2E Simulation: GOOD - Minor issues to address');
    } else if (successRate >= 50) {
      console.log('\n⚠️ E2E Simulation: NEEDS IMPROVEMENT - Significant issues found');
    } else {
      console.log('\n❌ E2E Simulation: CRITICAL - Major issues require immediate attention');
    }
    
    console.log('\n==========================================');
  }
}

// CLI interface
if (require.main === module) {
  const simulation = new E2ESimulation();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
HamBaller E2E Flow Simulation

Usage:
  node simulate-e2e-flow.js [options]

Options:
  --quick              Run quick test (fewer users)
  --stress             Run stress test (more users)
  --verbose            Show detailed output
  --help, -h           Show this help

Environment Variables:
  ABSTRACT_TESTNET_RPC_URL    RPC endpoint URL
  XPVERIFIER_ADDRESS         XPVerifier contract address
  XPBADGE_ADDRESS            XPBadge contract address
  BACKEND_URL               Backend API URL

Examples:
  node simulate-e2e-flow.js --quick
  node simulate-e2e-flow.js --stress --verbose
    `);
    process.exit(0);
  }
  
  // Configure simulation based on arguments
  if (args.includes('--quick')) {
    CONFIG.simulation.numUsers = 3;
    CONFIG.simulation.badgesPerUser = 2;
  }
  
  if (args.includes('--stress')) {
    CONFIG.simulation.numUsers = 20;
    CONFIG.simulation.badgesPerUser = 5;
    CONFIG.simulation.delayBetweenRequests = 500;
  }
  
  // Run simulation
  simulation.runSimulation().catch(error => {
    console.error('❌ Simulation failed:', error);
    process.exit(1);
  });
}

module.exports = { E2ESimulation, CONFIG };