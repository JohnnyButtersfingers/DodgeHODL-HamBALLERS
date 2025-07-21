#!/bin/bash

# Trusted Setup Script for XPVerifier ZK Circuit
# This script performs the trusted setup ceremony for the ZK-SNARK circuit

set -e

echo "🔐 XPVerifier Trusted Setup Ceremony"
echo "===================================="
echo ""

# Configuration
CIRCUIT_NAME="xp_verifier"
CIRCUIT_DIR="../circuits"
PTAU_DIR="../circuits/ptau"
BUILD_DIR="../circuits/build"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check dependencies
check_dependencies() {
    echo "🔍 Checking dependencies..."
    
    if ! command -v snarkjs &> /dev/null; then
        echo -e "${RED}❌ snarkjs not found${NC}"
        echo "Install with: npm install -g snarkjs"
        exit 1
    fi
    
    if ! command -v circom &> /dev/null; then
        echo -e "${RED}❌ circom not found${NC}"
        echo "Install from: https://docs.circom.io/getting-started/installation/"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All dependencies found${NC}"
}

# Download Powers of Tau file
download_ptau() {
    echo -e "\n📥 Downloading Powers of Tau file..."
    
    mkdir -p $PTAU_DIR
    
    # Using Hermez Network Phase 1 trusted setup (up to 2^16 constraints)
    if [ ! -f "$PTAU_DIR/powersOfTau28_hez_final_16.ptau" ]; then
        echo "Downloading powersOfTau28_hez_final_16.ptau..."
        curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_16.ptau \
             -o $PTAU_DIR/powersOfTau28_hez_final_16.ptau
        echo -e "${GREEN}✅ Downloaded Powers of Tau file${NC}"
    else
        echo -e "${YELLOW}⚠️ Powers of Tau file already exists${NC}"
    fi
}

# Compile the circuit
compile_circuit() {
    echo -e "\n🔧 Compiling circuit..."
    
    if [ ! -f "$CIRCUIT_DIR/$CIRCUIT_NAME.circom" ]; then
        echo -e "${YELLOW}⚠️ Circuit file not found. Creating a sample circuit...${NC}"
        create_sample_circuit
    fi
    
    mkdir -p $BUILD_DIR
    
    circom $CIRCUIT_DIR/$CIRCUIT_NAME.circom \
        --r1cs \
        --wasm \
        --sym \
        -o $BUILD_DIR
    
    echo -e "${GREEN}✅ Circuit compiled successfully${NC}"
}

# Create sample circuit if missing
create_sample_circuit() {
    cat > $CIRCUIT_DIR/$CIRCUIT_NAME.circom << 'EOF'
pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

template XPVerifier() {
    // Public inputs
    signal input userAddress;
    signal input threshold;
    signal input nullifier;
    
    // Private inputs
    signal input xpAmount;
    signal input timestamp;
    signal input nonce;
    
    // Verify XP meets threshold
    component xpCheck = GreaterEqThan(64);
    xpCheck.in[0] <== xpAmount;
    xpCheck.in[1] <== threshold;
    xpCheck.out === 1;
    
    // Generate commitment using Poseidon hash
    component hasher = Poseidon(4);
    hasher.inputs[0] <== userAddress;
    hasher.inputs[1] <== xpAmount;
    hasher.inputs[2] <== timestamp;
    hasher.inputs[3] <== nonce;
    
    // Verify nullifier
    signal computedNullifier;
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== userAddress;
    nullifierHasher.inputs[1] <== nonce;
    computedNullifier <== nullifierHasher.out;
    
    nullifier === computedNullifier;
}

component main = XPVerifier();
EOF
    echo -e "${GREEN}✅ Created sample circuit${NC}"
}

# Phase 2 ceremony
phase2_setup() {
    echo -e "\n🎯 Starting Phase 2 ceremony..."
    
    # Start Phase 2
    echo "Generating initial zkey..."
    snarkjs groth16 setup \
        $BUILD_DIR/$CIRCUIT_NAME.r1cs \
        $PTAU_DIR/powersOfTau28_hez_final_16.ptau \
        $BUILD_DIR/${CIRCUIT_NAME}_0000.zkey
    
    # Contribute to the ceremony
    echo -e "\n🎲 Contributing randomness to the ceremony..."
    echo "Enter some random text (the more random, the better):"
    read -r RANDOM_TEXT
    
    snarkjs zkey contribute \
        $BUILD_DIR/${CIRCUIT_NAME}_0000.zkey \
        $BUILD_DIR/${CIRCUIT_NAME}_0001.zkey \
        --name="Phase 9 Contributor" \
        -e="$RANDOM_TEXT"
    
    # Verify the final zkey
    echo -e "\n🔍 Verifying the final zkey..."
    snarkjs zkey verify \
        $BUILD_DIR/$CIRCUIT_NAME.r1cs \
        $PTAU_DIR/powersOfTau28_hez_final_16.ptau \
        $BUILD_DIR/${CIRCUIT_NAME}_0001.zkey
    
    # Export verification key
    echo -e "\n📤 Exporting verification key..."
    snarkjs zkey export verificationkey \
        $BUILD_DIR/${CIRCUIT_NAME}_0001.zkey \
        $BUILD_DIR/verification_key.json
    
    echo -e "${GREEN}✅ Phase 2 ceremony completed${NC}"
}

# Generate Solidity verifier
generate_verifier() {
    echo -e "\n📝 Generating Solidity verifier contract..."
    
    snarkjs zkey export solidityverifier \
        $BUILD_DIR/${CIRCUIT_NAME}_0001.zkey \
        $CIRCUIT_DIR/Verifier.sol
    
    # Update the contract name
    sed -i 's/contract Groth16Verifier/contract XPVerifier/g' $CIRCUIT_DIR/Verifier.sol
    
    echo -e "${GREEN}✅ Solidity verifier generated${NC}"
}

# Copy files to production locations
copy_production_files() {
    echo -e "\n📦 Copying files to production locations..."
    
    # Copy WASM and zkey for proof generation
    cp $BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm $CIRCUIT_DIR/
    cp $BUILD_DIR/${CIRCUIT_NAME}_0001.zkey $CIRCUIT_DIR/
    cp $BUILD_DIR/verification_key.json $CIRCUIT_DIR/
    
    echo -e "${GREEN}✅ Files copied to production locations${NC}"
}

# Main execution
main() {
    check_dependencies
    
    echo -e "\n${YELLOW}⚠️ WARNING: This is a trusted setup ceremony${NC}"
    echo "For production use, consider:"
    echo "1. Using a pre-existing Powers of Tau file from a reputable ceremony"
    echo "2. Having multiple contributors for Phase 2"
    echo "3. Publishing all contributions publicly"
    echo ""
    echo "Press Enter to continue or Ctrl+C to cancel..."
    read -r
    
    download_ptau
    compile_circuit
    phase2_setup
    generate_verifier
    copy_production_files
    
    echo -e "\n🎉 ${GREEN}Trusted setup completed successfully!${NC}"
    echo ""
    echo "Generated files:"
    echo "  - Circuit WASM: $CIRCUIT_DIR/${CIRCUIT_NAME}.wasm"
    echo "  - Proving key: $CIRCUIT_DIR/${CIRCUIT_NAME}_0001.zkey"
    echo "  - Verification key: $CIRCUIT_DIR/verification_key.json"
    echo "  - Solidity verifier: $CIRCUIT_DIR/Verifier.sol"
    echo ""
    echo "Next steps:"
    echo "1. Deploy the Verifier.sol contract"
    echo "2. Update XPVerifier contract to use the deployed verifier"
    echo "3. Test proof generation and verification"
    
    # Security recommendations
    echo -e "\n🔒 ${YELLOW}Security Recommendations:${NC}"
    echo "1. For mainnet, use multi-party computation for Phase 2"
    echo "2. Publish contribution hashes publicly"
    echo "3. Have the ceremony audited by security experts"
    echo "4. Consider using a ceremony coordinator service"
}

# Run the script
main