# 🚀 Phase 9 ZK Integration - Deployment Guide

## Prerequisites

### 1. Fund Your Wallet
- Get test ETH from Abstract Testnet Faucet: https://faucet.testnet.abs.xyz
- Minimum required: 0.01 ETH for contract deployment

### 2. Environment Setup
- Ensure you have a private key for deployment
- Copy the private key from your MetaMask wallet

## Step 1: Deploy XPVerifier Contract

### 1.1 Configure Environment
```bash
cd contracts
cp .env.example .env
```

Edit `.env` file:
```env
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
PRIVATE_KEY=your_actual_private_key_here
ETHERSCAN_API_KEY=optional_for_verification
```

### 1.2 Deploy Contract
```bash
npx hardhat run scripts/deploy_xpverifier_simple.js --network abstract
```

Expected output:
```
🚀 Deploying XPVerifierSimple Contract...
📍 Deploying with account: 0x...
💰 Account balance: X ETH
✅ XPVerifierSimple deployed to: 0x...
📍 Contract Address: 0x...
🔗 Explorer: https://explorer.testnet.abs.xyz/address/0x...
```

### 1.3 Save Contract Address
Copy the contract address from the deployment output. You'll need it for backend configuration.

## Step 2: Backend Configuration

### 2.1 Update Backend Environment
Create/update `backend/.env`:
```env
# XPVerifier Contract Configuration
XPVERIFIER_ADDRESS=0x... # Address from deployment
XPVERIFIER_PRIVATE_KEY=your_private_key_here
XPVERIFIER_THRESHOLD=50

# Network Configuration
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
NETWORK_NAME=abstract-testnet
CHAIN_ID=11124
```

### 2.2 Update Main Environment
Create/update `hamballer-game-starter/.env`:
```env
# Include all backend variables plus:
XPVERIFIER_ADDRESS=0x... # Same as backend
```

## Step 3: Validate ZK-Proof Flow

### 3.1 Run Integration Tests
```bash
./test-zk-integration.sh
```

### 3.2 Test Backend API
Start the backend server:
```bash
cd backend
npm run dev
```

Test ZK proof generation:
```bash
curl -X POST http://localhost:3001/api/xp/test-proof \
  -H "Content-Type: application/json" \
  -d '{
    "playerAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "xpClaimed": 75,
    "runId": "test-run"
  }'
```

### 3.3 Test Proof Status
```bash
curl http://localhost:3001/api/xp/proof-status
```

## Step 4: Frontend Testing

### 4.1 Start Frontend
```bash
cd frontend
npm run dev
```

### 4.2 Manual Testing Checklist

#### Connect Wallet
- [ ] Navigate to http://localhost:5173/badges
- [ ] Connect MetaMask wallet
- [ ] Ensure connected to Abstract Testnet

#### Test Badge Claiming
- [ ] Create a game run with XP ≥ 50
- [ ] Attempt to claim badge
- [ ] Verify ZK proof generation in browser console
- [ ] Check transaction on Abstract Explorer

#### Test Edge Cases
- [ ] Try claiming same badge twice (should fail - nullifier used)
- [ ] Try claiming badge with XP < 50 (should skip ZK verification)
- [ ] Test invalid proofs (should fail verification)

## Step 5: End-to-End Testing

### 5.1 Complete Game Flow
1. **Play Game**: Complete a game run earning ≥50 XP
2. **Generate Proof**: Frontend generates ZK proof
3. **Submit Claim**: Backend verifies and submits to contract
4. **Contract Verification**: XPVerifier validates proof on-chain
5. **Badge Minting**: Successful verification triggers badge mint

### 5.2 Verification Steps
```bash
# Check contract verification
npx hardhat console --network abstract

# In console:
const XPVerifier = await ethers.getContractFactory("XPVerifierSimple");
const contract = XPVerifier.attach("YOUR_CONTRACT_ADDRESS");

// Check threshold
await contract.getThreshold();

// Check nullifier usage
await contract.isNullifierUsed("0x...");

// Check verification results
await contract.getVerificationResult("PLAYER_ADDRESS", "NULLIFIER");
```

## Step 6: Production Preparation

### 6.1 Mainnet Deployment
For mainnet deployment:
1. Update network configuration
2. Use mainnet RPC URL
3. Ensure sufficient ETH for deployment
4. Perform trusted setup for production keys

### 6.2 Security Checklist
- [ ] Contract verification on block explorer
- [ ] Threshold configuration validated
- [ ] Owner permissions verified
- [ ] Nullifier system tested
- [ ] Gas optimization confirmed

## Troubleshooting

### Common Issues

#### 1. "Insufficient funds for gas"
**Solution**: Add more ETH from the faucet
```bash
# Get test ETH
https://faucet.testnet.abs.xyz
```

#### 2. "Nullifier already used"
**Solution**: This is expected behavior (replay protection)
- Each XP claim can only be verified once
- Generate new proof for different runs

#### 3. "XP below threshold"
**Solution**: Ensure XP ≥ 50 for ZK verification
- Lower XP amounts skip ZK verification
- This is normal behavior

#### 4. Contract deployment fails
**Solutions**:
- Check network connectivity
- Verify private key format
- Ensure sufficient gas limit
- Try increasing gas price

### Debug Commands

#### Check contract status:
```bash
npx hardhat run scripts/check_contract_status.js --network abstract
```

#### View transaction details:
```bash
# Replace TX_HASH with actual transaction hash
https://explorer.testnet.abs.xyz/tx/TX_HASH
```

#### Backend logs:
```bash
# Enable debug mode
DEBUG=zk:* npm run dev
```

## Performance Monitoring

### Gas Usage Tracking
Monitor gas usage on Abstract Explorer:
- Deployment: ~2-3M gas
- Proof verification: ~320k gas
- Threshold updates: ~50k gas

### Expected Response Times
- Proof generation: <100ms (test mode)
- Contract verification: 2-15 seconds
- Badge minting: 15-30 seconds

## Success Criteria

✅ **Contract Deployed**: XPVerifier contract on Abstract Testnet  
✅ **Backend Integration**: API endpoints responding correctly  
✅ **Frontend Integration**: Badge claiming with ZK verification  
✅ **End-to-End Flow**: Complete proof generation → verification → minting  
✅ **Security Validation**: Nullifier system preventing replay attacks  
✅ **Threshold Enforcement**: 50 XP minimum correctly enforced

## Next Steps

After successful deployment and testing:

1. **Commit Changes**:
```bash
git add .
git commit -m "Phase 9 ZK complete: XPVerifier deploy, proof flow, Abstract testnet validation"
git push
```

2. **Monitor Performance**: Track gas usage and response times

3. **Plan Production**: Prepare for mainnet deployment with proper trusted setup

4. **Advanced Features**: Implement batch verification and enhanced privacy features

---

**🎉 Deployment Complete!** Your ZK integration is now live on Abstract Testnet!