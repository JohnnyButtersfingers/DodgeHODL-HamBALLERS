# ZK Integration Guide - Phase 9

## Overview

This guide covers the Zero-Knowledge (ZK) proof integration for XP verification in HamBaller.xyz. The system uses ZK proofs to verify XP earned without revealing the underlying game data, ensuring privacy and preventing fraud.

## Architecture

### Components

1. **XPVerifier Contract** - Smart contract for on-chain proof verification
2. **ZKProofGenerator** - Service for generating ZK proofs
3. **XPVerifierService** - Backend service for proof management
4. **ClaimBadge Component** - Frontend UI for badge claiming with ZK verification

### Flow

1. User completes a game run and earns XP
2. Frontend requests ZK proof generation
3. ZKProofGenerator creates proof with nullifier for replay prevention
4. Proof is submitted to XPVerifier contract
5. Contract verifies proof and mints badge if valid

## Deployment

### Prerequisites

- Node.js 18+ and npm/pnpm
- Hardhat development environment
- Abstract Testnet access (Chain ID: 11124)
- Private key with sufficient testnet tokens

### Environment Setup

Create `.env` file in the project root:

```bash
# Abstract Testnet Configuration
ABSTRACT_TESTNET_RPC_URL=https://api.testnet.abs.xyz
ABSTRACT_RPC_FALLBACK=https://rpc.abstract.xyz
ABSTRACT_WALLET_PRIVATE_KEY=your_private_key_here

# Contract Addresses
XP_VERIFIER_ADDRESS=deployed_contract_address
XP_BADGE_ADDRESS=deployed_badge_contract_address

# Backend Configuration
XPVERIFIER_PRIVATE_KEY=backend_private_key
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz

# Gas Configuration
GAS_LIMIT=8000000
GAS_PRICE=1000000000
REPORT_GAS=true
```

### Deployment Steps

1. **Install Dependencies**
   ```bash
   cd hamballer-game-starter/contracts
   npm install
   ```

2. **Deploy XPVerifier Contract**
   ```bash
   npx hardhat run scripts/deploy_xpverifier.js --network abstract
   ```

3. **Verify Contract**
   ```bash
   npx hardhat verify --network abstract DEPLOYED_CONTRACT_ADDRESS
   ```

4. **Grant Roles**
   ```bash
   npx hardhat run scripts/grant-role-thirdweb.js --network abstract
   ```

5. **Update Environment Variables**
   - Copy the deployed contract address to `.env`
   - Update backend configuration

6. **Test ZK Integration**
   ```bash
   cd contracts
   ./scripts/test-zk-integration.sh
   ```

### Mainnet Deployment (TODO)

For mainnet deployment (Chain ID: 2741):

```bash
# Update .env with mainnet configuration
ABSTRACT_MAINNET_RPC_URL=https://api.mainnet.abs.xyz
MAINNET_GAS_PRICE=1000000000
MAINNET_GAS_LIMIT=8000000

# Deploy to mainnet
npx hardhat run scripts/deploy_xpverifier.js --network abstractMainnet
```

## Trusted Setup

### Multi-Party Setup

For production deployment, use a multi-party trusted setup ceremony:

```bash
# Phase 1: Generate initial parameters
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v

# Phase 2: Contribute to the ceremony
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v

# Phase 3: Apply random beacon
snarkjs powersoftau beacon pot12_0001.ptau pot12_beacon.ptau 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"

# Phase 4: Prepare phase 2
snarkjs powersoftau prepare phase2 pot12_beacon.ptau pot12_final.ptau -v
```

### Recommended Setup

For immediate deployment, use pre-trusted Phase 1 parameters from reputable sources:

- **Perpetual Powers of Tau**: https://github.com/privacy-scaling-explorations/perpetualpowersoftau
- **Hermez Network**: https://github.com/iden3/snarkjs#7-prepare-phase-2

## Testing

### ZK Integration Tests

Run the comprehensive test suite:

```bash
cd hamballer-game-starter/contracts
./scripts/test-zk-integration.sh
```

### Manual Testing

1. **Proof Generation Test**
   ```bash
   cd contracts
   node scripts/zkProofGenerator.js
   ```

2. **Gas Profiling Test**
   ```bash
   npx hardhat test test/gas-profiling.test.js
   ```

3. **Frontend Integration Test**
   ```bash
   cd frontend
   npm run test validationSuite.test.jsx
   ```

### Test Coverage

- ✅ Nullifier uniqueness and collision prevention
- ✅ Gas usage profiling (< 320k gas limit)
- ✅ Replay attack prevention
- ✅ Network timeout handling
- ✅ Error state management
- ✅ Batch proof processing
- ✅ Performance benchmarks

## Common Issues and Fixes

### 1. RPC Timeout Errors (522, 504)

**Symptoms**: Network requests timeout, deployment fails

**Solutions**:
```bash
# Add RPC fallback in hardhat.config.js
const rpcUrls = [
  "https://api.testnet.abs.xyz",
  "https://rpc.abstract.xyz",
  "https://backup-rpc.abstract.xyz"
];

# Increase timeout in backend
axios.defaults.timeout = 60000; // 60s
```

**Prevention**:
- Use multiple RPC endpoints
- Implement exponential backoff
- Monitor RPC health

### 2. Gas Estimation Failures

**Symptoms**: "Gas estimation failed" errors

**Solutions**:
```bash
# Set explicit gas limit
const tx = await contract.method({
  gasLimit: 8000000,
  gasPrice: await provider.getFeeData().then(fee => fee.gasPrice)
});

# Check gas usage
npx hardhat run scripts/test-gas-profiling.js
```

**Prevention**:
- Profile gas usage during development
- Set appropriate gas limits
- Monitor gas price trends

### 3. Nullifier Collisions

**Symptoms**: "Nullifier already used" errors

**Solutions**:
```javascript
// Regenerate nullifier with new salt
const nullifier = generateNullifier(userAddress, xpAmount, crypto.randomBytes(32));

// Check collision before use
if (usedNullifiers.has(nullifier)) {
  // Regenerate with different salt
  return generateNullifier(userAddress, xpAmount, crypto.randomBytes(32));
}
```

**Prevention**:
- Use cryptographically secure random salts
- Implement collision detection
- Monitor nullifier usage patterns

### 4. Proof Generation Timeouts

**Symptoms**: Frontend shows "Generating Proof..." indefinitely

**Solutions**:
```javascript
// Add timeout to proof generation
const proofPromise = generateZKProof(user, xp);
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Proof generation timeout')), 30000)
);

const proof = await Promise.race([proofPromise, timeoutPromise]);
```

**Prevention**:
- Implement progress indicators
- Add retry logic with exponential backoff
- Monitor proof generation performance

### 5. Network Connection Issues

**Symptoms**: "Network connection failed" errors

**Solutions**:
```javascript
// Implement RPC fallback
const providers = [
  new ethers.JsonRpcProvider("https://api.testnet.abs.xyz"),
  new ethers.JsonRpcProvider("https://rpc.abstract.xyz")
];

for (const provider of providers) {
  try {
    await provider.getNetwork();
    return provider;
  } catch (error) {
    continue;
  }
}
```

**Prevention**:
- Use multiple RPC endpoints
- Implement health checks
- Monitor network status

### 6. Faucet Issues

**Symptoms**: "Insufficient balance" errors

**Solutions**:
```bash
# Get testnet tokens
curl -X POST https://faucet.testnet.abs.xyz/request \
  -H "Content-Type: application/json" \
  -d '{"address":"YOUR_ADDRESS"}'

# Check balance
npx hardhat run scripts/check-balance.js --network abstract
```

**Prevention**:
- Monitor wallet balances
- Set up automated faucet requests
- Use multiple testnet wallets

## Performance Optimization

### Gas Optimization

1. **Batch Processing**: Process multiple proofs in single transaction
2. **Optimized Circuits**: Use efficient ZK circuit implementations
3. **Gas Profiling**: Monitor and optimize gas usage

### Proof Generation Optimization

1. **Caching**: Cache generated proofs for reuse
2. **Parallel Processing**: Generate multiple proofs concurrently
3. **Circuit Optimization**: Use optimized ZK circuits

### Network Optimization

1. **Connection Pooling**: Reuse RPC connections
2. **Request Batching**: Batch multiple requests
3. **CDN Usage**: Use CDN for static assets

## Monitoring and Analytics

### Key Metrics

- Proof generation success rate
- Gas usage per verification
- Network latency and timeouts
- Error rates by type
- User experience metrics

### Logging

```javascript
// Structured logging for ZK operations
await zkLogger.logProofAttempt({
  playerAddress: address,
  claimedXP: xpAmount,
  runId: runId,
  timestamp: new Date().toISOString()
});
```

### Alerts

Set up alerts for:
- High error rates (> 5%)
- Gas usage spikes
- Network timeouts
- Proof generation failures

## Security Considerations

### Nullifier Security

- Use cryptographically secure random generation
- Implement collision detection
- Monitor for replay attacks

### Proof Security

- Validate proof structure
- Verify public inputs
- Check proof integrity

### Network Security

- Use HTTPS for all RPC calls
- Implement request signing
- Monitor for suspicious activity

## Troubleshooting Checklist

### Deployment Issues

- [ ] Environment variables configured correctly
- [ ] Private key has sufficient balance
- [ ] RPC endpoint is accessible
- [ ] Gas limits are appropriate
- [ ] Contract verification successful

### Runtime Issues

- [ ] Backend services are running
- [ ] Database connections are stable
- [ ] RPC endpoints are responding
- [ ] Gas prices are reasonable
- [ ] Network connectivity is stable

### Frontend Issues

- [ ] Wallet connection is active
- [ ] Contract addresses are correct
- [ ] Network is configured properly
- [ ] Error handling is implemented
- [ ] Loading states are working

## Support

For additional support:

1. Check the logs in `contracts/test-results/`
2. Review the deployment guide
3. Run the test suite
4. Check network status
5. Contact the development team

## Changelog

### Phase 9 (Current)
- Added ZK proof generation and verification
- Implemented nullifier-based replay prevention
- Added gas profiling and optimization
- Enhanced error handling and retry logic
- Added comprehensive test suite
- Implemented RPC fallback mechanisms

### Future Enhancements
- Multi-party trusted setup ceremony
- Advanced circuit optimizations
- Cross-chain proof verification
- Enhanced privacy features