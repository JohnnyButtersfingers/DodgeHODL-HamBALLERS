# 🧪 Phase 8 Testing & Setup Guide

## 📋 Overview

This guide walks you through testing the complete badge claim system and preparing for Phase 9 ZK verification.

## 🚀 Quick Start

### 1. Start Development Servers

```bash
# Terminal 1: Start Backend
cd hamballer-game-starter/backend
npm start

# Terminal 2: Start Frontend  
cd hamballer-game-starter/frontend
npm run dev
```

### 2. Test the Claim System

```bash
# Test API endpoints
node test-claim-api.js

# Run E2E tests
node test-e2e-claim-system.js
```

## 📊 Testing Checklist

### ✅ Frontend Testing
- [ ] Navigate to `http://localhost:3000/claim`
- [ ] Verify ClaimPanel component loads
- [ ] Test badge state synchronization
- [ ] Test claim button functionality
- [ ] Test retry logic UI
- [ ] Test error handling display

### ✅ Backend Testing
- [ ] API health check: `GET /health`
- [ ] Claimable badges: `GET /api/badges/claimable/:wallet`
- [ ] Badge claim: `POST /api/badges/claim`
- [ ] Retry queue stats: `GET /api/badges/retry-queue/stats`
- [ ] Error handling for invalid requests
- [ ] Database integration

### ✅ Contract Testing
- [ ] XPBadge contract functions
- [ ] XPVerifier contract functions
- [ ] MINTER_ROLE permissions
- [ ] Badge minting operations
- [ ] Event emission

### ✅ E2E Testing
- [ ] Complete claim flow
- [ ] Error scenarios
- [ ] Retry mechanisms
- [ ] State synchronization

## 🔧 Backend Minter Setup

### Step 1: Generate Backend Wallet

```bash
cd hamballer-game-starter/contracts
npx hardhat run scripts/setup-backend-minter.js --network abstract
```

### Step 2: Update Environment Variables

Add to your `.env` file:
```bash
XPBADGE_MINTER_PRIVATE_KEY=your_generated_private_key
XPBADGE_MINTER_ADDRESS=your_generated_address
```

### Step 3: Grant MINTER_ROLE

The setup script will automatically grant MINTER_ROLE to the backend wallet.

## 🧪 Manual Testing Scenarios

### Scenario 1: Successful Badge Claim
1. Navigate to `/claim`
2. Connect wallet
3. Click "Claim Badge"
4. Verify transaction success
5. Check badge appears in wallet

### Scenario 2: Retry Logic
1. Simulate failed transaction (low gas)
2. Verify badge enters retry queue
3. Check retry attempts
4. Verify eventual success

### Scenario 3: Error Handling
1. Test with invalid wallet address
2. Test with insufficient funds
3. Test with already claimed badge
4. Verify appropriate error messages

### Scenario 4: State Synchronization
1. Claim badge on one device
2. Check state updates on another device
3. Verify Supabase fallback works
4. Test offline scenarios

## 📈 Performance Testing

### Load Testing
```bash
# Test API endpoints under load
ab -n 100 -c 10 http://localhost:3001/api/badges/claimable/0xTestWallet

# Test concurrent claims
node test-load-claims.js
```

### Gas Optimization
- Monitor gas usage for badge minting
- Optimize contract functions
- Test batch operations

## 🔒 Security Testing

### Access Control
- [ ] Verify MINTER_ROLE restrictions
- [ ] Test unauthorized access attempts
- [ ] Validate input sanitization
- [ ] Check for reentrancy vulnerabilities

### Data Integrity
- [ ] Verify nullifier uniqueness
- [ ] Test replay attack prevention
- [ ] Validate XP calculation accuracy
- [ ] Check event emission consistency

## 🚀 Phase 9 Preparation

### ZK Proof Integration
1. **Circuit Development**
   ```bash
   # Install snarkjs
   npm install -g snarkjs
   
   # Generate circuit
   snarkjs groth16 setup circuit.r1cs pot12_0001.ptau circuit_0000.zkey
   ```

2. **Verification Key Generation**
   ```bash
   # Export verification key
   snarkjs zkey export verificationkey circuit_0000.zkey verification_key.json
   ```

3. **Contract Integration**
   - Update XPVerifierV2 with actual verification key
   - Implement Groth16 verification logic
   - Test proof verification

### Backend ZK Integration
1. **Proof Generation**
   ```javascript
   // Generate proof for XP claim
   const { proof, publicSignals } = snarkjs.groth16.fullProve(
     input, 
     "circuit_0000.wasm", 
     "circuit_0000.zkey"
   );
   ```

2. **Proof Verification**
   ```javascript
   // Verify proof on-chain
   const isValid = await xpVerifier.verifyXPProof(
     player,
     xpEarned,
     nullifier,
     proof,
     publicSignals
   );
   ```

## 📝 Test Results Template

```markdown
## Test Results - [Date]

### Environment
- Frontend: ✅ Running on localhost:3000
- Backend: ✅ Running on localhost:3001
- Network: ✅ Abstract Testnet
- Contracts: ✅ Deployed and verified

### Test Results
- Frontend Tests: X/Y passed
- Backend Tests: X/Y passed
- Contract Tests: X/Y passed
- E2E Tests: X/Y passed

### Issues Found
- [ ] Issue 1: Description
- [ ] Issue 2: Description

### Recommendations
- [ ] Action 1
- [ ] Action 2

### Phase 9 Readiness
- [ ] ZK circuits ready
- [ ] Verification keys generated
- [ ] Backend integration complete
- [ ] Security audit passed
```

## 🎯 Success Criteria

### Phase 8 Complete When:
- [ ] All tests pass (100% success rate)
- [ ] Badge claiming works end-to-end
- [ ] Retry logic handles failures gracefully
- [ ] State synchronization works across devices
- [ ] Security vulnerabilities addressed
- [ ] Performance meets requirements

### Phase 9 Ready When:
- [ ] ZK circuits implemented and tested
- [ ] Verification keys generated and deployed
- [ ] Full ZK proof verification working
- [ ] Performance optimized for ZK operations
- [ ] Security audit completed

## 🆘 Troubleshooting

### Common Issues

**Frontend not loading:**
```bash
# Check if servers are running
lsof -i :3000
lsof -i :3001

# Restart servers
npm run dev
```

**Contract calls failing:**
```bash
# Check network configuration
npx hardhat console --network abstract

# Verify contract addresses
cat .env | grep ADDRESS
```

**API errors:**
```bash
# Check backend logs
tail -f backend/logs/app.log

# Test API directly
curl http://localhost:3001/health
```

### Getting Help

1. Check the logs for error messages
2. Verify environment variables are set correctly
3. Ensure all dependencies are installed
4. Test individual components in isolation
5. Review the deployment documentation

---

**Status:** 🧪 **READY FOR TESTING**  
**Next:** 🚀 **PHASE 9 ZK INTEGRATION** 