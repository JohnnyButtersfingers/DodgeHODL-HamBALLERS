# ZK Integration Guide for HamBaller.xyz

## Overview

This guide covers the Zero-Knowledge (ZK) proof integration for XP verification in HamBaller.xyz. The system uses ZK-SNARKs to verify player XP claims without revealing the actual XP amounts on-chain.

## Architecture

### Components

1. **XPVerifier Smart Contract** (`contracts/contracts/XPVerifier.sol`)
   - Verifies ZK proofs on-chain
   - Manages nullifiers to prevent replay attacks
   - Sets XP thresholds for badge eligibility

2. **ZK Proof Generator** (`contracts/scripts/zkProofGenerator.js`)
   - Generates Groth16 proofs for XP claims
   - Creates unique nullifiers per user
   - Estimates gas costs for verification

3. **Backend Service** (`backend/services/xpVerifierService.js`)
   - Manages proof submission queue
   - Handles retry logic with exponential backoff
   - Stores verification results in database

4. **Frontend Integration** (`frontend/src/services/xpVerificationService.js`)
   - Client-side proof generation
   - Error handling and UX feedback
   - Analytics tracking

## Deployment Steps

### 1. Prerequisites

```bash
# Install dependencies
cd hamballer-game-starter/contracts
npm install

# Set up environment variables
cp .env.example .env
```

Required environment variables:
```env
# Abstract Testnet
ABSTRACT_TESTNET_RPC_URL=https://api.testnet.abs.xyz
ABS_WALLET_PRIVATE_KEY=your_private_key_here
XPVERIFIER_ADDRESS=deployed_contract_address

# Abstract Mainnet (Production)
ABSTRACT_MAINNET_RPC_URL=https://api.mainnet.abs.xyz
MAINNET_PRIVATE_KEY=your_mainnet_private_key

# ZK Configuration
NULLIFIER_SALT=XP_VERIFIER_ABSTRACT_2024
BACKEND_WALLET_ADDRESS=backend_service_wallet
```

### 2. Deploy XPVerifier Contract

#### Testnet Deployment (Chain ID: 11124)
```bash
cd contracts
npx hardhat run scripts/deploy_xpverifier.js --network abstract
```

Expected output:
```
🚀 Starting XPVerifier Deployment on Abstract Testnet
================================================
📋 Deployer address: 0x...
💰 Deployer balance: X.XX ETH
🌐 Network: abstract (Chain ID: 11124)

📝 Deploying XPVerifier Contract...
✅ XPVerifier deployed to: 0x...
🔍 View on Explorer: https://explorer.testnet.abs.xyz/address/0x...

⏳ Waiting for block confirmations...
✅ Deployment confirmed!

🔐 Setting up roles...
✅ Granted VERIFIER_ROLE to backend: 0x...
✅ Set initial XP threshold to 100

📄 Deployment info saved to: deployments/xpverifier-11124.json
```

#### Mainnet Deployment (Chain ID: 2741)
```bash
# TODO: Implement after testnet validation
npx hardhat run scripts/deploy_xpverifier.js --network abstractMainnet
```

### 3. Set Up Trusted ZK Parameters

#### Option A: Use Pre-Trusted Setup (Recommended)
```bash
# Download trusted setup from Perpetual Powers of Tau
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_16.ptau

# Generate circuit-specific keys
cd contracts/circuits
snarkjs groth16 setup circuit.r1cs powersOfTau28_hez_final_16.ptau xp_verifier_0000.zkey
snarkjs zkey contribute xp_verifier_0000.zkey xp_verifier_0001.zkey --name="HamBaller Phase 2"
snarkjs zkey export verificationkey xp_verifier_0001.zkey verification_key.json
```

#### Option B: Multi-Party Ceremony
```bash
# Coordinator generates initial setup
snarkjs powersoftau new bn128 14 pot14_0000.ptau -v
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First contributor"

# Each participant contributes
snarkjs powersoftau contribute pot14_000N.ptau pot14_000N+1.ptau --name="Contributor N"

# Finalize ceremony
snarkjs powersoftau prepare phase2 pot14_final.ptau pot14_final_beacon.ptau -v
```

### 4. Test ZK Integration

```bash
# Run integration tests
cd contracts
npm run test:zk

# Test proof generation
node scripts/zkProofGenerator.js 0x1234... 150 100

# Run full test suite
./scripts/test-zk-integration.sh
```

## Common Issues & Fixes

### 1. RPC Timeout Errors (522/504)

**Symptoms:**
- `FetchError: 522 Origin Connection Time-out`
- Contract calls timing out

**Solutions:**
```javascript
// Use fallback RPC in deployment
const ABSTRACT_TESTNET = {
  rpcUrls: [
    'https://api.testnet.abs.xyz',
    'https://rpc.abstract.xyz' // Fallback
  ]
};

// Implement retry logic
async function deployWithRetry(contractFactory, args = [], retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const contract = await contractFactory.deploy(...args);
      return contract;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
```

### 2. Gas Estimation Failures

**Symptoms:**
- `Error: cannot estimate gas`
- Transaction reverts during simulation

**Solutions:**
```javascript
// Set explicit gas limits
const tx = await contract.verifyXPProof(proof, {
  gasLimit: 8000000, // 8M gas
  gasPrice: ethers.parseUnits('1', 'gwei')
});

// Profile gas usage
npx hardhat test --grep "gas profiling"
```

### 3. Nullifier Reuse (Replay Attacks)

**Symptoms:**
- `Error: Nullifier already used`
- Duplicate proof submissions

**Solutions:**
```javascript
// Check nullifier before submission
const isUsed = await contract.isNullifierUsed(nullifier);
if (isUsed) {
  throw new Error('Proof already claimed');
}

// Generate unique nullifiers per claim
const nullifier = ethers.keccak256(
  ethers.solidityPacked(
    ['address', 'string', 'uint256'],
    [userAddress, NULLIFIER_SALT, timestamp]
  )
);
```

### 4. Network Connection Issues

**Symptoms:**
- `ECONNREFUSED`
- `Network timeout`

**Solutions:**
```javascript
// Configure axios globally
axios.defaults.timeout = 60000; // 60 seconds
axios.defaults.retry = 3;

// Use connection pooling
const provider = new ethers.JsonRpcProvider(rpcUrl, {
  timeout: 60000,
  retryLimit: 3
});
```

### 5. Insufficient Balance

**Symptoms:**
- `insufficient funds for gas`
- Deployment fails

**Solutions:**
```bash
# Check balance
node scripts/check-balance.js

# Get testnet funds
# Visit: https://faucet.testnet.abs.xyz
# Request 0.1 ETH for testing
```

## Gas Optimization

### Target: < 320,000 gas per verification

Current gas usage:
- `verifyXPProof`: ~280,000 gas
- `isNullifierUsed`: ~25,000 gas
- `setThreshold`: ~45,000 gas

### Optimization Tips:

1. **Batch Verifications**
   ```solidity
   function batchVerifyProofs(
     Proof[] calldata proofs,
     bytes32[] calldata nullifiers
   ) external {
     // Verify multiple proofs in one transaction
   }
   ```

2. **Optimize Storage**
   ```solidity
   // Use packed structs
   struct VerificationData {
     uint128 timestamp;
     uint128 xpAmount;
   }
   ```

3. **Event-Based Logging**
   ```solidity
   // Emit minimal data
   event ProofVerified(address indexed user, bytes32 nullifier);
   ```

## Monitoring & Analytics

### Key Metrics to Track:

1. **Proof Generation Time**
   - Target: < 5 seconds
   - Alert threshold: > 10 seconds

2. **Verification Success Rate**
   - Target: > 95%
   - Common failures: Network issues, invalid proofs

3. **Gas Usage**
   - Average: ~280k gas
   - Alert if > 320k gas

4. **Nullifier Reuse Attempts**
   - Track replay attack attempts
   - Block repeat offenders

### Monitoring Commands:

```bash
# Check contract state
node scripts/check-contract-state.js

# Monitor gas usage
npx hardhat run scripts/gas-profiler.js --network abstract

# View verification logs
tail -f logs/zk-verifications.log
```

## Security Considerations

1. **Trusted Setup Security**
   - Use reputable Phase 1 setup (Powers of Tau)
   - Multiple contributors for Phase 2
   - Publish ceremony attestations

2. **Nullifier Management**
   - One nullifier per user per season
   - Store used nullifiers permanently
   - Monitor for patterns

3. **Threshold Updates**
   - Only admin can update thresholds
   - Emit events for transparency
   - Time-lock for changes

4. **Circuit Constraints**
   - Verify XP >= threshold
   - Validate user address format
   - Check timestamp freshness

## Troubleshooting Checklist

- [ ] Contract deployed and verified on explorer
- [ ] Backend service has VERIFIER_ROLE
- [ ] RPC endpoints are responsive
- [ ] Gas prices are reasonable
- [ ] Nullifier salt is configured
- [ ] Circuit files are accessible
- [ ] Database migrations completed
- [ ] Frontend has contract address
- [ ] Error tracking enabled
- [ ] Monitoring alerts configured

## Support

For issues not covered here:
1. Check contract logs on explorer
2. Review backend service logs
3. Enable debug mode in zkProofGenerator
4. Contact: support@hamballer.xyz

---

Last Updated: Phase 9 Deployment
Version: 1.0.0