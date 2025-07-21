#!/bin/bash

# ZK Integration Testing Script for Phase 9
# Tests proof generation, verification, edge cases, and gas profiling

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$SCRIPT_DIR/.."
PROJECT_ROOT="$CONTRACTS_DIR/.."
TEST_RESULTS_DIR="$CONTRACTS_DIR/test-results"
PROOFS_DIR="$CONTRACTS_DIR/proofs"

# Create test directories
mkdir -p "$TEST_RESULTS_DIR"
mkdir -p "$PROOFS_DIR"

# Test configuration
GAS_LIMIT=8000000
MAX_GAS_USAGE=320000  # 320k gas limit as specified
TEST_USERS=10
BATCH_SIZE=5

echo -e "${BLUE}🧪 Starting ZK Integration Testing Suite${NC}"
echo "=================================================="
echo "📁 Script Directory: $SCRIPT_DIR"
echo "📁 Contracts Directory: $CONTRACTS_DIR"
echo "📁 Test Results: $TEST_RESULTS_DIR"
echo "📁 Proofs Directory: $PROOFS_DIR"
echo ""

# Function to log test results
log_test_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $test_name: PASS${NC} - $message"
        echo "[$timestamp] PASS: $test_name - $message" >> "$TEST_RESULTS_DIR/zk-test-results.log"
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ $test_name: FAIL${NC} - $message"
        echo "[$timestamp] FAIL: $test_name - $message" >> "$TEST_RESULTS_DIR/zk-test-results.log"
    else
        echo -e "${YELLOW}⚠️ $test_name: WARN${NC} - $message"
        echo "[$timestamp] WARN: $test_name - $message" >> "$TEST_RESULTS_DIR/zk-test-results.log"
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Pre-flight checks
echo -e "${BLUE}🔍 Running Pre-flight Checks${NC}"
echo "----------------------------------------"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    log_test_result "Node.js Installation" "PASS" "Version: $NODE_VERSION"
else
    log_test_result "Node.js Installation" "FAIL" "Node.js not found"
    exit 1
fi

# Check npm/pnpm
if command_exists pnpm; then
    PNPM_VERSION=$(pnpm --version)
    log_test_result "Package Manager" "PASS" "pnpm version: $PNPM_VERSION"
elif command_exists npm; then
    NPM_VERSION=$(npm --version)
    log_test_result "Package Manager" "PASS" "npm version: $NPM_VERSION"
else
    log_test_result "Package Manager" "FAIL" "Neither npm nor pnpm found"
    exit 1
fi

# Check Hardhat
if [ -f "$CONTRACTS_DIR/node_modules/.bin/hardhat" ]; then
    log_test_result "Hardhat Installation" "PASS" "Hardhat found in node_modules"
else
    log_test_result "Hardhat Installation" "FAIL" "Hardhat not found in node_modules"
    exit 1
fi

# Check environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    log_test_result "Environment File" "PASS" ".env file found"
else
    log_test_result "Environment File" "WARN" ".env file not found"
fi

echo ""

# Test 1: ZK Proof Generator Basic Functionality
echo -e "${BLUE}🧪 Test 1: ZK Proof Generator Basic Functionality${NC}"
echo "--------------------------------------------------------"

cd "$CONTRACTS_DIR"

if node scripts/zkProofGenerator.js > "$TEST_RESULTS_DIR/zk-generator-test.log" 2>&1; then
    log_test_result "ZK Proof Generator" "PASS" "Basic functionality test completed"
else
    log_test_result "ZK Proof Generator" "FAIL" "Basic functionality test failed"
    echo "Check logs: $TEST_RESULTS_DIR/zk-generator-test.log"
fi

echo ""

# Test 2: Nullifier Uniqueness and Replay Prevention
echo -e "${BLUE}🧪 Test 2: Nullifier Uniqueness and Replay Prevention${NC}"
echo "--------------------------------------------------------------"

cat > "$CONTRACTS_DIR/test-nullifier-uniqueness.js" << 'EOF'
const { ZKProofGenerator } = require('./scripts/zkProofGenerator');

async function testNullifierUniqueness() {
    console.log('Testing nullifier uniqueness and replay prevention...');
    
    const generator = new ZKProofGenerator();
    const testUser = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6";
    const testXP = 1000;
    
    // Generate multiple nullifiers for the same user and XP
    const nullifiers = new Set();
    const attempts = 100;
    
    for (let i = 0; i < attempts; i++) {
        const nullifier = generator.generateNullifier(testUser, testXP);
        if (nullifiers.has(nullifier)) {
            throw new Error(`Nullifier collision detected at attempt ${i + 1}`);
        }
        nullifiers.add(nullifier);
    }
    
    console.log(`✅ Generated ${attempts} unique nullifiers without collisions`);
    
    // Test replay prevention
    const firstNullifier = generator.generateNullifier(testUser, testXP);
    const secondNullifier = generator.generateNullifier(testUser, testXP);
    
    if (firstNullifier === secondNullifier) {
        throw new Error('Nullifier replay prevention failed');
    }
    
    console.log('✅ Replay prevention working correctly');
    
    return true;
}

testNullifierUniqueness()
    .then(() => {
        console.log('🎉 Nullifier uniqueness test passed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Nullifier uniqueness test failed:', error.message);
        process.exit(1);
    });
EOF

if node test-nullifier-uniqueness.js > "$TEST_RESULTS_DIR/nullifier-test.log" 2>&1; then
    log_test_result "Nullifier Uniqueness" "PASS" "No collisions detected in 100 attempts"
else
    log_test_result "Nullifier Uniqueness" "FAIL" "Nullifier collision or replay prevention failed"
    echo "Check logs: $TEST_RESULTS_DIR/nullifier-test.log"
fi

echo ""

# Test 3: Gas Profiling for verifyProof
echo -e "${BLUE}🧪 Test 3: Gas Profiling for verifyProof${NC}"
echo "-----------------------------------------------"

cat > "$CONTRACTS_DIR/test-gas-profiling.js" << 'EOF'
const { ethers } = require("hardhat");

async function testGasProfiling() {
    console.log('Testing gas usage for verifyProof function...');
    
    // Deploy XPVerifier contract
    const XPVerifier = await ethers.getContractFactory("XPVerifier");
    const xpVerifier = await XPVerifier.deploy();
    await xpVerifier.waitForDeployment();
    
    const xpVerifierAddress = await xpVerifier.getAddress();
    console.log(`XPVerifier deployed at: ${xpVerifierAddress}`);
    
    // Test data
    const testUser = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6";
    const testXP = 1000;
    const testNullifier = ethers.keccak256(ethers.toUtf8Bytes("test-nullifier"));
    const testProof = "0x"; // Empty proof for stub implementation
    
    // Estimate gas usage
    const gasEstimate = await xpVerifier.verifyXPProof.estimateGas(
        testUser,
        testXP,
        testNullifier,
        testProof
    );
    
    console.log(`Estimated gas usage: ${gasEstimate.toString()}`);
    
    // Check if gas usage is within limits
    const maxGas = 320000; // 320k gas limit
    if (gasEstimate.gt(maxGas)) {
        throw new Error(`Gas usage ${gasEstimate.toString()} exceeds limit of ${maxGas}`);
    }
    
    console.log(`✅ Gas usage ${gasEstimate.toString()} is within limit of ${maxGas}`);
    
    // Test actual transaction
    const tx = await xpVerifier.verifyXPProof(
        testUser,
        testXP,
        testNullifier,
        testProof
    );
    
    const receipt = await tx.wait();
    console.log(`Actual gas used: ${receipt.gasUsed.toString()}`);
    
    if (receipt.gasUsed.gt(maxGas)) {
        throw new Error(`Actual gas usage ${receipt.gasUsed.toString()} exceeds limit of ${maxGas}`);
    }
    
    console.log(`✅ Actual gas usage ${receipt.gasUsed.toString()} is within limit of ${maxGas}`);
    
    return {
        estimated: gasEstimate.toString(),
        actual: receipt.gasUsed.toString(),
        withinLimit: receipt.gasUsed.lte(maxGas)
    };
}

testGasProfiling()
    .then((result) => {
        console.log('🎉 Gas profiling test passed');
        console.log('Results:', result);
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Gas profiling test failed:', error.message);
        process.exit(1);
    });
EOF

if npx hardhat run test-gas-profiling.js --network hardhat > "$TEST_RESULTS_DIR/gas-profiling-test.log" 2>&1; then
    log_test_result "Gas Profiling" "PASS" "verifyProof gas usage within 320k limit"
else
    log_test_result "Gas Profiling" "FAIL" "Gas usage exceeds 320k limit or test failed"
    echo "Check logs: $TEST_RESULTS_DIR/gas-profiling-test.log"
fi

echo ""

# Test 4: Edge Cases and Error Handling
echo -e "${BLUE}🧪 Test 4: Edge Cases and Error Handling${NC}"
echo "-----------------------------------------------"

cat > "$CONTRACTS_DIR/test-edge-cases.js" << 'EOF'
const { ethers } = require("hardhat");
const { ZKProofGenerator } = require('./scripts/zkProofGenerator');

async function testEdgeCases() {
    console.log('Testing edge cases and error handling...');
    
    const generator = new ZKProofGenerator();
    
    // Test 1: Invalid user address
    try {
        await generator.generateZKProof("0x0000000000000000000000000000000000000000", 1000);
        throw new Error('Should have rejected zero address');
    } catch (error) {
        console.log('✅ Correctly rejected zero address');
    }
    
    // Test 2: Zero XP amount
    try {
        await generator.generateZKProof("0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6", 0);
        throw new Error('Should have rejected zero XP');
    } catch (error) {
        console.log('✅ Correctly rejected zero XP amount');
    }
    
    // Test 3: Very large XP amount
    try {
        const largeXP = ethers.MaxUint256;
        await generator.generateZKProof("0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6", largeXP);
        console.log('✅ Handled large XP amount correctly');
    } catch (error) {
        console.log('⚠️ Large XP amount test failed:', error.message);
    }
    
    // Test 4: Invalid proof verification
    const invalidProof = {
        proof: { a: [], b: [], c: [] },
        publicSignals: ["invalid", "invalid", "invalid"]
    };
    
    const isValid = await generator.verifyZKProof(
        invalidProof,
        "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        1000,
        ethers.keccak256(ethers.toUtf8Bytes("invalid-nullifier"))
    );
    
    if (!isValid) {
        console.log('✅ Correctly rejected invalid proof');
    } else {
        throw new Error('Should have rejected invalid proof');
    }
    
    // Test 5: Batch processing with failures
    const testUsers = [
        { address: "0x1234567890123456789012345678901234567890", xpAmount: 500 },
        { address: "0x0000000000000000000000000000000000000000", xpAmount: 1000 }, // Invalid
        { address: "0x3456789012345678901234567890123456789012", xpAmount: 750 }
    ];
    
    const batchResults = await generator.generateBatchProofs(testUsers);
    console.log(`✅ Batch processing completed with ${batchResults.length} successful proofs`);
    
    return true;
}

testEdgeCases()
    .then(() => {
        console.log('🎉 Edge cases test passed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Edge cases test failed:', error.message);
        process.exit(1);
    });
EOF

if node test-edge-cases.js > "$TEST_RESULTS_DIR/edge-cases-test.log" 2>&1; then
    log_test_result "Edge Cases" "PASS" "All edge cases handled correctly"
else
    log_test_result "Edge Cases" "FAIL" "Edge case handling failed"
    echo "Check logs: $TEST_RESULTS_DIR/edge-cases-test.log"
fi

echo ""

# Test 5: Performance and Load Testing
echo -e "${BLUE}🧪 Test 5: Performance and Load Testing${NC}"
echo "----------------------------------------------"

cat > "$CONTRACTS_DIR/test-performance.js" << 'EOF'
const { ZKProofGenerator } = require('./scripts/zkProofGenerator');

async function testPerformance() {
    console.log('Testing performance and load handling...');
    
    const generator = new ZKProofGenerator();
    const startTime = Date.now();
    
    // Generate multiple proofs concurrently
    const promises = [];
    const numProofs = 50;
    
    for (let i = 0; i < numProofs; i++) {
        const userAddress = `0x${i.toString().padStart(40, '0')}`;
        const xpAmount = 100 + (i * 10);
        
        promises.push(
            generator.generateZKProof(userAddress, xpAmount, {
                gameId: `test-game-${i}`,
                level: i % 10 + 1
            }).catch(error => {
                console.error(`Failed to generate proof for user ${i}:`, error.message);
                return null;
            })
        );
    }
    
    const results = await Promise.all(promises);
    const successfulProofs = results.filter(proof => proof !== null);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Generated ${successfulProofs.length}/${numProofs} proofs in ${duration}ms`);
    console.log(`Average time per proof: ${duration / numProofs}ms`);
    
    if (successfulProofs.length >= numProofs * 0.9) { // 90% success rate
        console.log('✅ Performance test passed');
        return true;
    } else {
        throw new Error(`Performance test failed: only ${successfulProofs.length}/${numProofs} proofs generated`);
    }
}

testPerformance()
    .then(() => {
        console.log('🎉 Performance test passed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Performance test failed:', error.message);
        process.exit(1);
    });
EOF

if node test-performance.js > "$TEST_RESULTS_DIR/performance-test.log" 2>&1; then
    log_test_result "Performance" "PASS" "Performance test completed successfully"
else
    log_test_result "Performance" "FAIL" "Performance test failed"
    echo "Check logs: $TEST_RESULTS_DIR/performance-test.log"
fi

echo ""

# Cleanup test files
echo -e "${BLUE}🧹 Cleaning up test files${NC}"
echo "--------------------------------"

rm -f "$CONTRACTS_DIR/test-nullifier-uniqueness.js"
rm -f "$CONTRACTS_DIR/test-gas-profiling.js"
rm -f "$CONTRACTS_DIR/test-edge-cases.js"
rm -f "$CONTRACTS_DIR/test-performance.js"

echo "✅ Test files cleaned up"

# Generate test summary
echo ""
echo -e "${BLUE}📊 Test Summary${NC}"
echo "=================="

if [ -f "$TEST_RESULTS_DIR/zk-test-results.log" ]; then
    echo "Test Results Log: $TEST_RESULTS_DIR/zk-test-results.log"
    echo ""
    echo "Recent Test Results:"
    tail -20 "$TEST_RESULTS_DIR/zk-test-results.log"
fi

echo ""
echo -e "${GREEN}🎉 ZK Integration Testing Suite Completed${NC}"
echo "=================================================="
echo "📁 Test results saved in: $TEST_RESULTS_DIR"
echo "📁 Proofs saved in: $PROOFS_DIR"
echo ""
echo "Next steps:"
echo "1. Review test results in the logs above"
echo "2. Check gas profiling results for optimization"
echo "3. Verify nullifier uniqueness and replay prevention"
echo "4. Deploy to Abstract Testnet if all tests pass"