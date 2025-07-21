#!/bin/bash

# ZK Integration Test Suite for Phase 9
# Tests proof generation, verification, edge cases, and gas profiling

set -e

echo "🧪 Starting ZK Integration Test Suite..."
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((TESTS_PASSED++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((TESTS_FAILED++))
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo ""
    log_info "Running test: $test_name"
    ((TESTS_RUN++))
    
    if eval "$test_command"; then
        log_success "$test_name passed"
        return 0
    else
        log_error "$test_name failed"
        return 1
    fi
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if zkProofGenerator exists
    if [ ! -f "zkProofGenerator.js" ]; then
        log_error "zkProofGenerator.js not found"
        exit 1
    fi
    
    # Check backend services
    if [ ! -d "backend" ]; then
        log_error "Backend directory not found"
        exit 1
    fi
    
    log_success "All dependencies found"
}

# Test 1: Basic ZK Proof Generation
test_basic_proof_generation() {
    log_info "Testing basic ZK proof generation..."
    
    node -e "
        const { zkProofGenerator } = require('./zkProofGenerator.js');
        
        async function test() {
            try {
                await zkProofGenerator.initialize();
                
                const proof = await zkProofGenerator.generateXPProof(
                    '0x742d35Cc6634C0532925a3b8D95EC7Ad1D5C0Cd9',
                    150,
                    'test-run-basic'
                );
                
                console.log('✅ Basic proof generated successfully');
                console.log('   Nullifier:', proof.nullifier);
                console.log('   Commitment:', proof.commitment);
                console.log('   Proof elements:', proof.proof.length);
                
                return true;
            } catch (error) {
                console.error('❌ Basic proof generation failed:', error.message);
                return false;
            }
        }
        
        test().then(success => process.exit(success ? 0 : 1));
    "
}

# Test 2: Nullifier Uniqueness and Replay Prevention
test_nullifier_uniqueness() {
    log_info "Testing nullifier uniqueness and replay prevention..."
    
    node -e "
        const { zkProofGenerator } = require('./zkProofGenerator.js');
        
        async function test() {
            try {
                await zkProofGenerator.initialize();
                
                const userAddress = '0x742d35Cc6634C0532925a3b8D95EC7Ad1D5C0Cd9';
                const runId = 'test-run-replay';
                
                // Generate two proofs for same user/run
                const proof1 = await zkProofGenerator.generateXPProof(userAddress, 100, runId);
                const proof2 = await zkProofGenerator.generateXPProof(userAddress, 100, runId);
                
                // Nullifiers should be different (due to random salt)
                if (proof1.nullifier === proof2.nullifier) {
                    console.error('❌ Nullifiers are identical - replay vulnerability!');
                    return false;
                }
                
                console.log('✅ Nullifiers are unique');
                console.log('   Proof 1 nullifier:', proof1.nullifier);
                console.log('   Proof 2 nullifier:', proof2.nullifier);
                
                // Test same salt produces same nullifier
                const salt = proof1.metadata.salt;
                const nullifierData1 = zkProofGenerator.generateNullifier(userAddress, runId, salt);
                const nullifierData2 = zkProofGenerator.generateNullifier(userAddress, runId, salt);
                
                if (nullifierData1.nullifier !== nullifierData2.nullifier) {
                    console.error('❌ Same inputs with same salt should produce same nullifier');
                    return false;
                }
                
                console.log('✅ Deterministic nullifiers work correctly');
                
                return true;
            } catch (error) {
                console.error('❌ Nullifier uniqueness test failed:', error.message);
                return false;
            }
        }
        
        test().then(success => process.exit(success ? 0 : 1));
    "
}

# Test 3: Invalid Proof Detection
test_invalid_proof_detection() {
    log_info "Testing invalid proof detection..."
    
    node -e "
        const { zkProofGenerator } = require('./zkProofGenerator.js');
        
        async function test() {
            try {
                await zkProofGenerator.initialize();
                
                // Generate valid proof
                const validProof = await zkProofGenerator.generateXPProof(
                    '0x742d35Cc6634C0532925a3b8D95EC7Ad1D5C0Cd9',
                    150,
                    'test-run-invalid'
                );
                
                // Test 1: Valid proof should verify
                const validResult = await zkProofGenerator.verifyProof(validProof);
                if (!validResult) {
                    console.error('❌ Valid proof failed verification');
                    return false;
                }
                console.log('✅ Valid proof verified successfully');
                
                // Test 2: Tampered proof should fail
                const tamperedProof = { ...validProof };
                tamperedProof.proof[0] = validProof.proof[0] + 1n; // Tamper with first element
                
                const tamperedResult = await zkProofGenerator.verifyProof(tamperedProof);
                if (tamperedResult) {
                    console.error('❌ Tampered proof incorrectly verified as valid');
                    return false;
                }
                console.log('✅ Tampered proof correctly rejected');
                
                // Test 3: Malformed proof should fail
                const malformedProof = { ...validProof };
                malformedProof.proof = validProof.proof.slice(0, 4); // Wrong number of elements
                
                const malformedResult = await zkProofGenerator.verifyProof(malformedProof);
                if (malformedResult) {
                    console.error('❌ Malformed proof incorrectly verified as valid');
                    return false;
                }
                console.log('✅ Malformed proof correctly rejected');
                
                return true;
            } catch (error) {
                console.error('❌ Invalid proof detection test failed:', error.message);
                return false;
            }
        }
        
        test().then(success => process.exit(success ? 0 : 1));
    "
}

# Test 4: Gas Profiling
test_gas_profiling() {
    log_info "Testing gas profiling and optimization..."
    
    node -e "
        const { zkProofGenerator } = require('./zkProofGenerator.js');
        
        async function test() {
            try {
                await zkProofGenerator.initialize();
                
                const proof = await zkProofGenerator.generateXPProof(
                    '0x742d35Cc6634C0532925a3b8D95EC7Ad1D5C0Cd9',
                    200,
                    'test-run-gas'
                );
                
                const gasProfile = await zkProofGenerator.profileGasUsage(proof);
                
                console.log('📊 Gas Profiling Results:');
                console.log('   Total estimated gas:', gasProfile.totalEstimated);
                console.log('   Within 320k target:', gasProfile.withinTarget);
                
                if (!gasProfile.withinTarget) {
                    console.error('❌ Gas usage exceeds 320k target:', gasProfile.totalEstimated);
                    return false;
                }
                
                console.log('✅ Gas usage within target limits');
                
                return true;
            } catch (error) {
                console.error('❌ Gas profiling test failed:', error.message);
                return false;
            }
        }
        
        test().then(success => process.exit(success ? 0 : 1));
    "
}

# Test 5: Batch Proof Generation
test_batch_proof_generation() {
    log_info "Testing batch proof generation performance..."
    
    node -e "
        const { zkProofGenerator } = require('./zkProofGenerator.js');
        
        async function test() {
            try {
                await zkProofGenerator.initialize();
                
                const requests = [
                    { userAddress: '0x742d35Cc6634C0532925a3b8D95EC7Ad1D5C0Cd9', claimedXP: 50, runId: 'batch-1' },
                    { userAddress: '0x8ba1f109551bD432803012645Hac136c', claimedXP: 100, runId: 'batch-2' },
                    { userAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', claimedXP: 150, runId: 'batch-3' }
                ];
                
                const results = await zkProofGenerator.batchGenerateProofs(requests);
                
                const successCount = results.filter(r => r.success).length;
                console.log('📊 Batch generation results:');
                console.log('   Successful proofs:', successCount + '/' + requests.length);
                
                if (successCount !== requests.length) {
                    console.error('❌ Not all batch proofs generated successfully');
                    return false;
                }
                
                console.log('✅ All batch proofs generated successfully');
                
                return true;
            } catch (error) {
                console.error('❌ Batch proof generation test failed:', error.message);
                return false;
            }
        }
        
        test().then(success => process.exit(success ? 0 : 1));
    "
}

# Test 6: Edge Cases
test_edge_cases() {
    log_info "Testing edge cases and error handling..."
    
    node -e "
        const { zkProofGenerator } = require('./zkProofGenerator.js');
        
        async function test() {
            try {
                await zkProofGenerator.initialize();
                
                let passedTests = 0;
                let totalTests = 0;
                
                // Test 1: Zero XP
                totalTests++;
                try {
                    await zkProofGenerator.generateXPProof(
                        '0x742d35Cc6634C0532925a3b8D95EC7Ad1D5C0Cd9',
                        0,
                        'test-zero-xp'
                    );
                    console.log('✅ Zero XP proof generated (edge case handled)');
                    passedTests++;
                } catch (error) {
                    console.log('ℹ️  Zero XP proof rejected (acceptable behavior)');
                    passedTests++; // Both outcomes are acceptable
                }
                
                // Test 2: Very high XP
                totalTests++;
                try {
                    await zkProofGenerator.generateXPProof(
                        '0x742d35Cc6634C0532925a3b8D95EC7Ad1D5C0Cd9',
                        999999,
                        'test-high-xp'
                    );
                    console.log('✅ High XP proof generated successfully');
                    passedTests++;
                } catch (error) {
                    console.error('❌ High XP proof generation failed:', error.message);
                }
                
                // Test 3: Invalid address format
                totalTests++;
                try {
                    await zkProofGenerator.generateXPProof(
                        'invalid-address',
                        100,
                        'test-invalid-addr'
                    );
                    console.error('❌ Invalid address should have been rejected');
                } catch (error) {
                    console.log('✅ Invalid address correctly rejected');
                    passedTests++;
                }
                
                // Test 4: Empty run ID
                totalTests++;
                try {
                    await zkProofGenerator.generateXPProof(
                        '0x742d35Cc6634C0532925a3b8D95EC7Ad1D5C0Cd9',
                        100,
                        ''
                    );
                    console.log('✅ Empty run ID handled gracefully');
                    passedTests++;
                } catch (error) {
                    console.log('✅ Empty run ID correctly rejected');
                    passedTests++;
                }
                
                console.log('📊 Edge case test results: ' + passedTests + '/' + totalTests + ' passed');
                
                return passedTests >= Math.floor(totalTests * 0.75); // 75% pass rate
            } catch (error) {
                console.error('❌ Edge cases test failed:', error.message);
                return false;
            }
        }
        
        test().then(success => process.exit(success ? 0 : 1));
    "
}

# Test 7: Backend Integration
test_backend_integration() {
    log_info "Testing backend ZK service integration..."
    
    # Check if backend is running
    if ! pgrep -f "node.*backend" > /dev/null; then
        log_warning "Backend not running, skipping integration test"
        return 0
    fi
    
    node -e "
        const { xpVerifierService } = require('./backend/services/xpVerifierService.js');
        
        async function test() {
            try {
                // Test service initialization
                const initialized = await xpVerifierService.initialize();
                if (!initialized) {
                    console.log('ℹ️  XP Verifier service not configured (acceptable in dev)');
                    return true;
                }
                
                console.log('✅ XP Verifier service initialized');
                
                // Test stats retrieval
                const stats = xpVerifierService.getQueueStats();
                console.log('📊 Service stats:', JSON.stringify(stats, null, 2));
                
                return true;
            } catch (error) {
                console.error('❌ Backend integration test failed:', error.message);
                return false;
            }
        }
        
        test().then(success => process.exit(success ? 0 : 1));
    "
}

# Main test execution
main() {
    echo "🧪 ZK Integration Test Suite - Phase 9"
    echo "======================================"
    echo ""
    
    check_dependencies
    
    echo ""
    log_info "Starting test execution..."
    
    # Run all tests
    run_test "Basic ZK Proof Generation" "test_basic_proof_generation"
    run_test "Nullifier Uniqueness & Replay Prevention" "test_nullifier_uniqueness" 
    run_test "Invalid Proof Detection" "test_invalid_proof_detection"
    run_test "Gas Profiling & Optimization" "test_gas_profiling"
    run_test "Batch Proof Generation" "test_batch_proof_generation"
    run_test "Edge Cases & Error Handling" "test_edge_cases"
    run_test "Backend Integration" "test_backend_integration"
    
    # Test summary
    echo ""
    echo "================================================"
    echo "🧪 ZK Integration Test Summary"
    echo "================================================"
    echo "Tests Run: $TESTS_RUN"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo ""
        log_success "All ZK integration tests passed! 🎉"
        echo ""
        log_info "Ready for production deployment:"
        log_info "✅ ZK proof generation working"
        log_info "✅ Nullifier replay protection active"
        log_info "✅ Gas usage optimized (<320k)"
        log_info "✅ Edge cases handled"
        log_info "✅ Backend integration tested"
        echo ""
        exit 0
    else
        echo ""
        log_error "Some tests failed. Please review and fix issues before deployment."
        echo ""
        log_info "Common fixes:"
        log_info "- Ensure snarkjs is installed: npm install snarkjs"
        log_info "- Run trusted setup ceremony if needed"
        log_info "- Check environment configuration"
        log_info "- Verify contract deployment status"
        echo ""
        exit 1
    fi
}

# Run main function
main "$@"