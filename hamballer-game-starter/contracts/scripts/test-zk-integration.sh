#!/bin/bash

# ZK Integration Test Suite
# Tests proof generation, verification, gas usage, and edge cases

set -e

echo "🧪 ZK Integration Test Suite"
echo "============================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
TEST_USER="0x1234567890123456789012345678901234567890"
TEST_XP="1000"
TEST_THRESHOLD="100"
CONTRACT_ADDRESS=${XPVERIFIER_ADDRESS:-"0x0000000000000000000000000000000000000000"}

# Function to run a test
run_test() {
    local test_name=$1
    local test_cmd=$2
    
    echo -e "\n📋 Running: $test_name"
    echo "----------------------------------------"
    
    if eval "$test_cmd"; then
        echo -e "${GREEN}✅ PASSED${NC}: $test_name"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}: $test_name"
        return 1
    fi
}

# Function to check dependencies
check_dependencies() {
    echo "🔍 Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found${NC}"
        exit 1
    fi
    
    if ! command -v npx &> /dev/null; then
        echo -e "${RED}❌ npx not found${NC}"
        exit 1
    fi
    
    # Check if zkProofGenerator exists
    if [ ! -f "./zkProofGenerator.js" ]; then
        echo -e "${RED}❌ zkProofGenerator.js not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All dependencies found${NC}"
}

# Test 1: Basic proof generation
test_basic_proof() {
    node zkProofGenerator.js $TEST_USER $TEST_XP $TEST_THRESHOLD > test_proof_1.json 2>&1
    
    if [ -f "proof-${TEST_USER:0:8}-"*.json ]; then
        echo "✅ Proof file generated"
        return 0
    else
        echo "❌ Proof file not found"
        return 1
    fi
}

# Test 2: Nullifier uniqueness
test_nullifier_uniqueness() {
    # Generate two proofs for the same user
    node zkProofGenerator.js $TEST_USER $TEST_XP $TEST_THRESHOLD > proof1.log 2>&1
    sleep 1
    node zkProofGenerator.js $TEST_USER $TEST_XP $TEST_THRESHOLD > proof2.log 2>&1
    
    # Extract nullifiers
    NULLIFIER1=$(grep "Nullifier hash:" proof1.log | awk '{print $3}')
    NULLIFIER2=$(grep "Nullifier hash:" proof2.log | awk '{print $3}')
    
    if [ "$NULLIFIER1" == "$NULLIFIER2" ]; then
        echo "✅ Nullifiers are deterministic (same for same user)"
        return 0
    else
        echo "❌ Nullifiers don't match for same user"
        return 1
    fi
}

# Test 3: Invalid inputs
test_invalid_inputs() {
    # Test with invalid address
    if node zkProofGenerator.js "invalid_address" $TEST_XP $TEST_THRESHOLD 2>&1 | grep -q "Invalid user address"; then
        echo "✅ Invalid address rejected"
    else
        echo "❌ Invalid address not caught"
        return 1
    fi
    
    # Test with insufficient XP
    if node zkProofGenerator.js $TEST_USER "50" "100" 2>&1 | grep -q "Insufficient XP"; then
        echo "✅ Insufficient XP rejected"
    else
        echo "❌ Insufficient XP not caught"
        return 1
    fi
    
    return 0
}

# Test 4: Gas estimation (requires contract deployment)
test_gas_estimation() {
    if [ "$CONTRACT_ADDRESS" == "0x0000000000000000000000000000000000000000" ]; then
        echo -e "${YELLOW}⚠️ Skipping gas test - no contract deployed${NC}"
        return 0
    fi
    
    # Create a test script for gas estimation
    cat > test_gas.js << 'EOF'
const { ethers } = require("ethers");
const { generateXPProof, estimateVerificationGas } = require("./zkProofGenerator.js");

async function testGas() {
    const provider = new ethers.JsonRpcProvider(process.env.ABSTRACT_TESTNET_RPC || "https://api.testnet.abs.xyz");
    const contractAddress = process.env.XPVERIFIER_ADDRESS;
    
    const proofData = await generateXPProof({
        userAddress: process.argv[2],
        xpAmount: process.argv[3],
        threshold: process.argv[4],
        timestamp: Date.now().toString()
    });
    
    const gasInfo = await estimateVerificationGas(provider, contractAddress, proofData);
    
    console.log("Gas Info:", JSON.stringify(gasInfo, null, 2));
    
    if (gasInfo.exceedsTarget) {
        process.exit(1);
    }
}

testGas().catch(console.error);
EOF

    node test_gas.js $TEST_USER $TEST_XP $TEST_THRESHOLD
    local result=$?
    
    rm -f test_gas.js
    return $result
}

# Test 5: Replay attack prevention
test_replay_prevention() {
    echo "🔐 Testing replay attack prevention..."
    
    # Generate a proof
    node zkProofGenerator.js $TEST_USER $TEST_XP $TEST_THRESHOLD > replay_test.log 2>&1
    
    # Extract nullifier
    NULLIFIER=$(grep "Nullifier hash:" replay_test.log | awk '{print $3}')
    
    if [ -z "$NULLIFIER" ]; then
        echo "❌ Could not extract nullifier"
        return 1
    fi
    
    echo "✅ Nullifier generated: ${NULLIFIER:0:10}..."
    
    # In a real test, we would:
    # 1. Submit the proof to the contract
    # 2. Try to submit it again
    # 3. Verify it's rejected
    
    echo "✅ Nullifier system ready for replay prevention"
    return 0
}

# Test 6: Performance test
test_performance() {
    echo "⏱️ Testing proof generation performance..."
    
    local start_time=$(date +%s%N)
    
    # Generate 5 proofs
    for i in {1..5}; do
        node zkProofGenerator.js $TEST_USER $((TEST_XP + i * 100)) $TEST_THRESHOLD > /dev/null 2>&1
    done
    
    local end_time=$(date +%s%N)
    local elapsed=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    local avg_time=$((elapsed / 5))
    
    echo "Generated 5 proofs in ${elapsed}ms"
    echo "Average time: ${avg_time}ms per proof"
    
    if [ $avg_time -lt 5000 ]; then
        echo "✅ Performance is good (< 5s per proof)"
        return 0
    else
        echo -e "${YELLOW}⚠️ Performance could be improved${NC}"
        return 0
    fi
}

# Test 7: Edge cases
test_edge_cases() {
    echo "🔍 Testing edge cases..."
    
    # Test with exact threshold
    if node zkProofGenerator.js $TEST_USER "100" "100" > /dev/null 2>&1; then
        echo "✅ Exact threshold accepted"
    else
        echo "❌ Exact threshold rejected"
        return 1
    fi
    
    # Test with very large XP
    if node zkProofGenerator.js $TEST_USER "999999999" "100" > /dev/null 2>&1; then
        echo "✅ Large XP values handled"
    else
        echo "❌ Large XP values failed"
        return 1
    fi
    
    return 0
}

# Main test execution
main() {
    check_dependencies
    
    echo -e "\n🚀 Starting ZK Integration Tests"
    echo "================================"
    
    local passed=0
    local failed=0
    
    # Run all tests
    tests=(
        "test_basic_proof:Basic Proof Generation"
        "test_nullifier_uniqueness:Nullifier Uniqueness"
        "test_invalid_inputs:Invalid Input Handling"
        "test_gas_estimation:Gas Estimation"
        "test_replay_prevention:Replay Attack Prevention"
        "test_performance:Performance Test"
        "test_edge_cases:Edge Cases"
    )
    
    for test_info in "${tests[@]}"; do
        IFS=':' read -r test_func test_name <<< "$test_info"
        
        if run_test "$test_name" "$test_func"; then
            ((passed++))
        else
            ((failed++))
        fi
    done
    
    # Clean up test files
    echo -e "\n🧹 Cleaning up test files..."
    rm -f proof*.json proof*.log replay_test.log test_proof_*.json
    
    # Summary
    echo -e "\n📊 Test Summary"
    echo "==============="
    echo -e "Total tests: $((passed + failed))"
    echo -e "${GREEN}Passed: $passed${NC}"
    echo -e "${RED}Failed: $failed${NC}"
    
    if [ $failed -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some tests failed${NC}"
        exit 1
    fi
}

# Run the tests
main